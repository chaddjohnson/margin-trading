// gpu-phase7: the CPU risk-envelope REFERENCE of one canonical pooled replay — Phase 2–6's `envelopeOf`
// (src/gpu-phase6/cpuRefWorker.ts), unchanged statement for statement, moved into a module without side effects so that
// both the reference worker and the CPU evaluation worker (the non-official CPU arm) use the same function. The values are
// src/vg-l0-risk-metrics's definitions: [banked DD marked, banked DD liquidation, max trade principal loss marked, max
// trade principal loss liquidation], dollars.
import type { runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { toLedger } from '../vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, portfolioPath, tradeRisk } from '../vg-l0-risk-metrics/metrics.ts';

export const envelopeOf = (door: Door, x: ReturnType<typeof runWithControls2>, options: EvalOptions) => {
  const L = toLedger({ door, subject: null as never, options, books: x.books, result: x.result, rec: null as never });
  const pts = portfolioPath(L);
  const trades = L.lots.map((l) => tradeRisk(l, L.endT));
  const max = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b).at(-1)! : 0);

  return [
    bankedDrawdown(pts, 'marked').max,
    bankedDrawdown(pts, 'liquidation').max,
    max(trades.map((t) => t.principalLossMarked)),
    max(trades.map((t) => t.principalLossLiq))
  ];
};
