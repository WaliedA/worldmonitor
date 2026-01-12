import type { BlackSwanSnapshot } from '@/services/black-swan';

// Small set of synthetic historical snapshots representing labeled events to tune and validate the model.
// Fields are intentionally simple and numeric to keep the harness lightweight.
export const SAMPLES: Array<{
  id: string;
  label: string; // human label
  expectedSeverity: 'low' | 'medium' | 'high' | 'critical';
  snap: BlackSwanSnapshot;
}> = [
  {
    id: 'benign-1',
    label: 'Quiet period',
    expectedSeverity: 'low',
    snap: { marketReturn: -0.001, marketVolatility: 0.008, newsCount: 5, newsBaseline: 10 },
  },
  {
    id: '2008-like',
    label: '2008-style crash (simulated)',
    expectedSeverity: 'critical',
    snap: {
      marketReturn: -0.12,
      marketVolatility: 0.12,
      newsCount: 500,
      newsBaseline: 25,
      outagesCount: 5,
    },
  },
  {
    id: 'covid-2020',
    label: 'COVID market shock (simulated)',
    expectedSeverity: 'critical',
    snap: { marketReturn: -0.10, marketVolatility: 0.10, newsCount: 400, newsBaseline: 30, outagesCount: 12 },
  },
  {
    id: 'earthquake-tsunami-2011',
    label: 'Large quake and societal impact (simulated)',
    expectedSeverity: 'high',
    snap: { earthquakeMaxMag: 8.9, earthquakeCount: 2, newsCount: 60, newsBaseline: 8 },
  },
  {
    id: 'localized-quake',
    label: 'Localized quake, limited secondary effects',
    expectedSeverity: 'medium',
    snap: { earthquakeMaxMag: 6.6, earthquakeCount: 1, newsCount: 20, newsBaseline: 8 },
  },
  {
    id: 'outage-storm',
    label: 'Large outage wave',
    expectedSeverity: 'high',
    snap: { outagesCount: 25, outagesBaseline: 3, newsCount: 120, newsBaseline: 20 },
  },
  {
    id: 'news-only-surge',
    label: 'High news volume but markets stable (false-positive risk)',
    expectedSeverity: 'low',
    snap: { marketReturn: -0.002, marketVolatility: 0.01, newsCount: 220, newsBaseline: 40 },
  },
  {
    id: 'minor-market-dip',
    label: 'Small market dip with some volatility',
    expectedSeverity: 'medium',
    snap: { marketReturn: -0.035, marketVolatility: 0.035, newsCount: 40, newsBaseline: 20 },
  },
];

export default SAMPLES;
