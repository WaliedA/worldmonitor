/*
  Black Swan Detector (prototype)

  - Pure TypeScript, lightweight rule-based / statistical detector to flag "black swan" indicators
  - Designed to be run periodically with a snapshot of signals from other services (markets, news, outages, earthquakes, flights, AIS)
  - Exports `analyze(snapshot)` -> { score: 0..1, reasons: [], details }
  - Exports `demo()` for quick browser-console demonstration while running dev server

  Notes:
  - This is intentionally conservative and interpretable; thresholds and weights are configurable.
  - Integration points: consumer should pass pre-aggregated features (counts, z-scores, magnitudes) or raw lists the analyzer can summarize.
*/

export type BlackSwanScore = {
  score: number; // 0..1
  severity: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  details: Record<string, any>;
};

export type BlackSwanSnapshot = {
  // market: recent log returns or single-period return (fractional, e.g. -0.05 = -5%)
  marketReturn?: number; // e.g., S&P or global index recent return
  marketVolatility?: number; // recent realized vol (std dev) or implied vol proxy

  // news: count of high-priority keyword matches in recent window, and baseline
  newsCount?: number;
  newsBaseline?: number; // expected count over same window historically

  outagesCount?: number; // number of significant outages reported during window
  outagesBaseline?: number;

  earthquakeMaxMag?: number; // largest quake magnitude in window
  earthquakeCount?: number;

  flightAnomalies?: number; // number of anomalous flights detected in window
  aisAnomalies?: number; // number of anomalous vessel behaviours

  // optional historical baselines for z-score style normalization
  baselines?: Record<string, { mean: number; std: number }>;

  // free-form extras
  [k: string]: any;
};

const DEFAULT_WEIGHTS: Record<string, number> = {
  marketReturn: 2.0, // sudden large negative return
  marketVolatility: 1.0,
  newsSurge: 1.5,
  outages: 1.2,
  earthquake: 1.3,
  flightAnomalies: 0.8,
  aisAnomalies: 0.8,
};

const SCORE_THRESHOLDS = {
  low: 0.15,
  medium: 0.35,
  high: 0.6,
  critical: 0.85,
};

function zToScore(z: number) {
  // Map z-score or normalized metric to 0..1, focusing on positive tail
  if (!isFinite(z) || z <= 0) return 0;
  // use a smooth growth that saturates (logistic-ish)
  return Math.tanh(z / 3); // z ~3 -> ~0.995
}

function ratioToScore(ratio: number) {
  // For ratios like newsCount / baseline. If baseline absent, assume ratio is already >1 meaning surge
  if (!isFinite(ratio) || ratio <= 1) return 0;
  // map 1..10 to 0..1
  return Math.min(1, (ratio - 1) / 9);
}

export function analyze(snap: BlackSwanSnapshot, weights: Partial<Record<string, number>> = {}): BlackSwanScore {
  const reasons: string[] = [];
  const details: Record<string, any> = {};

  const w = { ...DEFAULT_WEIGHTS, ...weights };

  // Market return: negative return is worrisome. Convert to z-like by using baseline if available
  let marketReturnScore = 0;
  if (typeof snap.marketReturn === 'number') {
    const v = -snap.marketReturn; // positive when negative return
    const base = snap.baselines?.marketReturn;
    if (base && base.std) {
      const z = (v - base.mean) / base.std;
      marketReturnScore = zToScore(z);
      details.marketReturnZ = z;
    } else {
      // heuristic: map percent moves. e.g., -3% => v=0.03 -> z equivalent 0.03/0.01 -> 3
      const z = v / 0.01;
      marketReturnScore = zToScore(z);
      details.marketReturnHeuristicZ = z;
    }
    if (marketReturnScore > 0.1) reasons.push(`market drop (${(snap.marketReturn * 100).toFixed(2)}%)`);
  }

  // Market volatility spike
  let volScore = 0;
  if (typeof snap.marketVolatility === 'number') {
    const base = snap.baselines?.marketVolatility;
    if (base && base.std) {
      const z = (snap.marketVolatility - base.mean) / base.std;
      volScore = zToScore(z);
      details.marketVolZ = z;
    } else {
      const z = snap.marketVolatility / 0.01;
      volScore = zToScore(z);
      details.marketVolHeurZ = z;
    }
    if (volScore > 0.1) reasons.push('volatility spike');
  }

  // News surge
  let newsScore = 0;
  if (typeof snap.newsCount === 'number') {
    const baseline = snap.newsBaseline ?? (snap.baselines?.news?.mean ?? undefined);
    if (baseline && baseline > 0) {
      const ratio = snap.newsCount / baseline;
      newsScore = ratioToScore(ratio);
      details.newsRatio = ratio;
    } else {
      // fallback: higher counts directly map
      newsScore = Math.min(1, snap.newsCount / 100);
      details.newsCount = snap.newsCount;
    }
    if (newsScore > 0.1) reasons.push('news surge');
  }

  // Outages
  let outageScore = 0;
  if (typeof snap.outagesCount === 'number') {
    const baseline = snap.outagesBaseline ?? (snap.baselines?.outages?.mean ?? undefined);
    if (baseline && baseline > 0) {
      const ratio = snap.outagesCount / baseline;
      outageScore = ratioToScore(ratio);
      details.outageRatio = ratio;
    } else {
      outageScore = Math.min(1, snap.outagesCount / 20);
      details.outagesCount = snap.outagesCount;
    }
    if (outageScore > 0.1) reasons.push('outage spike');
  }

  // Earthquake risk - big magnitude or multiple
  let eqScore = 0;
  if (typeof snap.earthquakeMaxMag === 'number') {
    // anything >6.5 is very concerning; map mag 5..9
    const m = snap.earthquakeMaxMag;
    const z = (m - 5) / 2; // m=7 => z=1
    eqScore = zToScore(z);
    details.earthquakeMaxMag = m;
    if (eqScore > 0.1) reasons.push(`earthquake mag ${m}`);
  }
  if (typeof snap.earthquakeCount === 'number' && snap.earthquakeCount > 1) {
    // multiple quakes in window
    const extra = Math.min(1, (snap.earthquakeCount - 1) / 9);
    eqScore = Math.max(eqScore, extra);
    details.earthquakeCount = snap.earthquakeCount;
  }

  // Flight / AIS anomalies
  const flightScore = (snap.flightAnomalies && Math.min(1, snap.flightAnomalies / 20)) || 0;
  const aisScore = (snap.aisAnomalies && Math.min(1, snap.aisAnomalies / 20)) || 0;
  if (flightScore > 0.1) reasons.push('flight anomalies');
  if (aisScore > 0.1) reasons.push('AIS anomalies');

  // Weighted aggregation
  const weighted = (
    (marketReturnScore * w.marketReturn) +
    (volScore * w.marketVolatility) +
    (newsScore * w.newsSurge) +
    (outageScore * w.outages) +
    (eqScore * w.earthquake) +
    (flightScore * w.flightAnomalies) +
    (aisScore * w.aisAnomalies)
  );

  // Normalize by sum of weights to get approx 0..1
  const weightSum = Object.values(DEFAULT_WEIGHTS).reduce((s, v) => s + v, 0);
  let score = Math.min(1, weighted / (weightSum * 1.0));

  // Amplify if multiple distinct domains have significant scores
  const significantSignals = [
    marketReturnScore > 0.3,
    volScore > 0.3,
    newsScore > 0.3,
    outageScore > 0.3,
    eqScore > 0.3,
    flightScore > 0.3,
    aisScore > 0.3,
  ].filter(Boolean).length;

  if (significantSignals >= 2) {
    // multiplicative boost for co-occurrence
    score = Math.min(1, score * (1 + 0.2 * (significantSignals - 1)));
    details.cooccurrenceBoost = significantSignals;
    reasons.push('multi-domain co-occurrence');
  }

  // Final thresholds
  let severity: BlackSwanScore['severity'] = 'low';
  if (score >= SCORE_THRESHOLDS.critical) severity = 'critical';
  else if (score >= SCORE_THRESHOLDS.high) severity = 'high';
  else if (score >= SCORE_THRESHOLDS.medium) severity = 'medium';

  if (reasons.length === 0) reasons.push('no strong indicators');

  details.raw = {
    marketReturnScore,
    volScore,
    newsScore,
    outageScore,
    eqScore,
    flightScore,
    aisScore,
    weighted,
    weightSum,
  };

  return {
    score,
    severity,
    reasons,
    details,
  };
}

// Demo helper to run in the browser console while dev server is running
export function demo() {
  const samples: BlackSwanSnapshot[] = [
    // benign
    { marketReturn: -0.002, marketVolatility: 0.01, newsCount: 10, newsBaseline: 12 },
    // market crash
    { marketReturn: -0.08, marketVolatility: 0.06, newsCount: 120, newsBaseline: 20, outagesCount: 8 },
    // localized quake event
    { earthquakeMaxMag: 7.2, earthquakeCount: 2, newsCount: 40, newsBaseline: 8 },
    // multi-domain shock
    { marketReturn: -0.06, marketVolatility: 0.08, newsCount: 300, newsBaseline: 30, outagesCount: 15, earthquakeMaxMag: 6.8 },
  ];

  console.group('black-swan demo');
  samples.forEach((s, i) => {
    const out = analyze(s);
    console.log(`sample ${i + 1}:`, out.severity, out.score.toFixed(3));
    console.table(out.details);
    console.log('reasons:', out.reasons.join(', '));
  });
  console.groupEnd();
  return true;
}

/**
 * Start a simple watcher: periodically calls a provided collector function that returns a snapshot,
 * analyzes it, and logs alerts when the score exceeds `alertThreshold`.
 *
 * Usage example (in browser console while dev server running):
 *
 * import('/src/services/black-swan').then(m => {
 *   const collector = async () => ({ marketReturn: -0.03, marketVolatility: 0.04, newsCount: 150, newsBaseline: 20 });
 *   return m.watchAndLog(collector, { intervalMs: 60_000, alertThreshold: 0.35 });
 * });
 */
export function watchAndLog(
  collector: () => Promise<BlackSwanSnapshot> | BlackSwanSnapshot,
  opts: { intervalMs?: number; alertThreshold?: number } = {}
) {
  const intervalMs = opts.intervalMs ?? 60_000;
  const alertThreshold = opts.alertThreshold ?? 0.35;

  let handle: number | null = null;

  async function tick() {
    try {
      const snap = await (collector as any)();
      const out = analyze(snap);
      if (out.score >= alertThreshold) {
        console.warn('[BlackSwan] ALERT', out.severity, out.score.toFixed(3), out.reasons.join(', '));
        console.table(out.details);
      } else {
        console.debug('[BlackSwan] score', out.score.toFixed(3), out.reasons.join(', '));
      }
    } catch (e) {
      console.error('[BlackSwan] watcher error', e);
    }
  }

  // Start immediately
  tick();
  handle = (setInterval(tick, intervalMs) as unknown) as number;

  return {
    stop() {
      if (handle) clearInterval(handle);
      handle = null;
    },
  };
}

export default { analyze, demo, watchAndLog };
