// gpu-phase5 (a copy of src/gpu-phase4/cpuRefWorker.ts with this study's namespace): the CPU reference worker (a child process). For each task it runs the CANONICAL CPU engine — the books
// and pooled replay (RC 2's runWithControls2) and the canonical records the optimizer's workers produce
// (vg-l0-risk-families evaluate / evaluateDetail) — and, for a risk task, the risk-envelope reference of
// src/vg-l0-risk-metrics (toLedger → portfolioPath / bankedDrawdown / tradeRisk). It returns canonical bit-pattern hashes
// (and the record and envelope values); the GPU side hashes its own outputs the same way.
import { runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import { evaluate, evaluateDetail } from '../vg-l0-risk-families/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';
import { toLedger } from '../vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, portfolioPath, tradeRisk } from '../vg-l0-risk-metrics/metrics.ts';
import { bookView, canonHash, poolView } from './canon.ts';
import { type DoorSpec, resolveDoor } from './doorSpec.ts';

export interface RefTask {
  k: string;
  quad: Quad;
  controls: RiskConfig2 | null;
  options: EvalOptions;
  detail: boolean;
  risk?: boolean;
}

export interface RefResult {
  k: string;
  ok: boolean;
  error?: string;
  books?: string;
  pool?: string;
  record?: string;
  envelope?: number[] | null;
  counts?: { trades: number[]; lots: number };
  ms: number;
}

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

export const reference = (door: Door, t: RefTask): RefResult => {
  const t0 = performance.now();

  try {
    const x = runWithControls2(door, t.quad, t.controls, t.options, t.detail, false, { cache: false });
    const rec = t.detail
      ? evaluateDetail(door, t.quad, t.controls, t.options)
      : evaluate(door, t.quad, t.controls, t.options);

    return {
      k: t.k,
      ok: true,
      books: canonHash(x.books.map(bookView)),
      pool: canonHash(poolView(x.result)),
      record: canonHash(rec),
      envelope: t.risk ? envelopeOf(door, x, t.options) : null,
      counts: { trades: x.books.map((b) => b.trades.length), lots: x.result.lots.length },
      ms: performance.now() - t0
    };
  } catch (e) {
    return { k: t.k, ok: false, error: (e as Error).message.split('\n')[0], ms: performance.now() - t0 };
  }
};

if (process.send) {
  let door: Door | null = null;
  let gcCount = 0;

  process.on('message', async (m: { t: string; door?: DoorSpec; tasks?: RefTask[] }) => {
    if (m.t === 'door') {
      door = await resolveDoor(m.door!, 'CPU reference worker');
      process.send!({ t: 'ready' });
    } else if (m.t === 'tasks') {
      const out = m.tasks!.map((t) => reference(door!, t));

      process.send!({ t: 'res', out });
      if (++gcCount % 16 === 0 && global.gc) global.gc();
    } else if (m.t === 'exit') process.exit(0);
  });
}
