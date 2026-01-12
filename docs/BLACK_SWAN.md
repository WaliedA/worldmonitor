# Black Swan Detector (prototype)

🔍 **Purpose:** Provide an interpretable, lightweight model that combines signals across domains (markets, news, outages, earthquakes, flights, AIS) to produce a 0..1 score indicating likelihood / severity of a potential "black swan" style event.

## Design overview

- Rule-based / statistical approach for now (no heavy ML dependencies).
- Inputs: aggregated snapshot with fields such as `marketReturn`, `marketVolatility`, `newsCount`, `newsBaseline`, `outagesCount`, `earthquakeMaxMag`, `flightAnomalies`, `aisAnomalies`, etc.
- Outputs: `{ score: number, severity: low|medium|high|critical, reasons: string[], details: {...} }`.
- Co-occurrence across domains amplifies scores (e.g., market crash + major outage + news surge).

## Where the code lives

- `src/services/black-swan.ts` — implementation and a `demo()` helper.
- Exported from `src/services/index.ts` so you can `import { analyze, demo } from '@/services/black-swan'`.

## How to try it (dev server)

1. Run the dev server: `npm run dev`.
2. In your browser, open DevTools Console and enter:

```js
import('/src/services/black-swan').then(m => m.demo());
```

You should see several sample analyses printed in the console.

## Integration ideas

- Have a periodic job (worker or main thread) collect snapshots of signals from other services and call `analyze(snapshot)`.
- If `score` exceeds a threshold (e.g., `>= 0.6`), push an internal alert, surface a UI banner/panel, or write to logs for triage.
- Tune weights and thresholds with historical backtesting using known crisis intervals.

## Next steps / improvements

- Add sample historical backtest harness and small dataset to calibrate weights.
- Implement an offline statistical baseline manager (EMA or rolling stats) and store baselines in `src/services/storage.ts`.
- Hook into `analysis.worker` or a scheduled task to compute and surface alerts.

If you'd like, I can wire this into the worker and add a small UI panel that lists active black-swan alerts. 👇

---
**Want me to:**
- wire it into the analysis worker now? ✅
- add a UI panel to show active alerts? ✅
- create a small backtest harness with sample datasets? ✅

---

## Backtest harness

A simple backtest harness is available at `src/services/black-swan-backtest.ts` and uses a small synthetic dataset in `data/black-swan-samples.ts`.

Usage (dev server / browser console):

```js
import('/src/services/black-swan-backtest').then(m => {
  m.runBacktest();        // prints per-sample scores
  m.sweepThresholds();    // prints TP/FP/FN/TN by threshold
  m.tuneWeights({ iterations: 500, scale: 0.3 }); // quick random-search for improved weights
});
```

The tuner performs a lightweight random-search that perturbs the default weights multiplicatively to minimize MSE to expected severities in the sample dataset.
