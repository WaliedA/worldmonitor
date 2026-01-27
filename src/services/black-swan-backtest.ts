import { analyze } from './black-swan';
import { SAMPLES } from '../../data/black-swan-samples';

export type BacktestResult = {
  id: string;
  label: string;
  expectedSeverity: string;
  score: number;
  severity: string;
  reasons: string[];
};

const SEVERITY_VALUE: Record<string, number> = {
  low: 0.0,
  medium: 0.35,
  high: 0.6,
  critical: 0.85,
};

export function runBacktest(samples = SAMPLES): BacktestResult[] {
  const results: BacktestResult[] = samples.map(s => {
    const out = analyze(s.snap);
    return {
      id: s.id,
      label: s.label,
      expectedSeverity: s.expectedSeverity,
      score: out.score,
      severity: out.severity,
      reasons: out.reasons,
    };
  });

  console.group('Black Swan Backtest Results');
  console.table(results.map(r => ({ id: r.id, label: r.label, expected: r.expectedSeverity, score: r.score.toFixed(3), severity: r.severity })));
  console.groupEnd();

  return results;
}

export function sweepThresholds(samples = SAMPLES, thresholds: number[] = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
  const results = runBacktest(samples);

  function expectedAlert(expectedSeverity: string, t: number) {
    return SEVERITY_VALUE[expectedSeverity] >= t;
  }

  const rows: Array<any> = [];

  thresholds.forEach(t => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    results.forEach(r => {
      const pred = r.score >= t;
      const exp = expectedAlert(r.expectedSeverity, t);
      if (pred && exp) tp++;
      else if (pred && !exp) fp++;
      else if (!pred && exp) fn++;
      else tn++;
    });

    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    rows.push({ threshold: t.toFixed(2), tp, fp, fn, tn, precision: precision.toFixed(2), recall: recall.toFixed(2) });
  });

  console.group('Threshold sweep');
  console.table(rows);
  console.groupEnd();

  return rows;
}

// Simple random-search weight tuning that tries multiplicative perturbations of the default weights
export function tuneWeights(
  samples = SAMPLES,
  opts: { iterations?: number; scale?: number } = { iterations: 200, scale: 0.4 }
) {
  const baseWeights = {
    marketReturn: 2.0,
    marketVolatility: 1.0,
    newsSurge: 1.5,
    outages: 1.2,
    earthquake: 1.3,
    flightAnomalies: 0.8,
    aisAnomalies: 0.8,
  };

  const iterations = opts.iterations ?? 200;
  const scale = opts.scale ?? 0.4;

  let best = { loss: Infinity, weights: baseWeights };

  function lossForWeights(weights: Record<string, number>) {
    // Desired numeric value for expected severity
    const targets = samples.map(s => SEVERITY_VALUE[s.expectedSeverity]);
    const outs = samples.map(s => analyze(s.snap, weights).score);
    // mean squared error
    const mse = outs.reduce((acc, v, i) => acc + Math.pow(v - targets[i], 2), 0) / outs.length;
    return mse;
  }

  for (let i = 0; i < iterations; i++) {
    // sample multiplicative factors in [1-scale, 1+scale]
    const candidate: Record<string, number> = {};
    for (const k of Object.keys(baseWeights)) {
      const f = 1 + (Math.random() * 2 - 1) * scale;
      candidate[k] = Math.max(0.01, baseWeights[k] * f);
    }

    const l = lossForWeights(candidate);
    if (l < best.loss) {
      best = { loss: l, weights: candidate };
    }
  }

  console.group('Weight tuning (random search)');
  console.log('best loss:', best.loss.toFixed(6));
  console.table(best.weights);
  console.groupEnd();

  return best;
}

export default { runBacktest, sweepThresholds, tuneWeights };
