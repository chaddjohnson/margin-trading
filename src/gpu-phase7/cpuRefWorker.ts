// gpu-phase7: a copy of src/gpu-phase5/cpuRefWorker.ts whose doors are opened through this study's door log (src/gpu-phase7/doorSpec.ts).
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
import { envelopeOf } from './envelope.ts';
import { bookView, canonHash, poolView } from '../gpu-phase5/canon.ts';
import { type DoorSpec, resolveDoor } from './doorSpec.ts';
import { type Leaf, leavesOf } from '../gpu-phase5/bits.ts';

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

export { envelopeOf }; // src/gpu-phase7/envelope.ts (a side-effect-free module: the evaluation worker imports it too)

// the ORIGINAL objects of one evaluation (gpu-phase5 PROTOCOL.md §4.4): kept by the worker until the parent has
// compared the run, so that a single mismatch can be attributed to its first differing field from the original
// evidence (never from a re-evaluation)
export interface Original {
  rec: unknown;
  books: ReturnType<typeof runWithControls2>['books'];
  pool: ReturnType<typeof runWithControls2>['result'];
}

// what a worker keeps of each task: 'full' = the record, the books and the pooled replay; 'record' = the record only
// (large runs: the books and the replay of tens of thousands of tasks would not fit; a books or pool mismatch is then
// attributed by the labelled re-evaluations)
export type Keep = false | 'record' | 'full';

// Phase 4's `reference`, unchanged statement for statement, also returning the objects it hashed
export const referenceFull = (door: Door, t: RefTask): { result: RefResult; original: Original | null } => {
  const t0 = performance.now();

  try {
    const x = runWithControls2(door, t.quad, t.controls, t.options, t.detail, false, { cache: false });
    const rec = t.detail
      ? evaluateDetail(door, t.quad, t.controls, t.options)
      : evaluate(door, t.quad, t.controls, t.options);

    return {
      result: {
        k: t.k,
        ok: true,
        books: canonHash(x.books.map(bookView)),
        pool: canonHash(poolView(x.result)),
        record: canonHash(rec),
        envelope: t.risk ? envelopeOf(door, x, t.options) : null,
        counts: { trades: x.books.map((b) => b.trades.length), lots: x.result.lots.length },
        ms: performance.now() - t0
      },
      original: { rec, books: x.books, pool: x.result }
    };
  } catch (e) {
    return {
      result: { k: t.k, ok: false, error: (e as Error).message.split('\n')[0], ms: performance.now() - t0 },
      original: null
    };
  }
};

export const reference = (door: Door, t: RefTask): RefResult => referenceFull(door, t).result;

// what a worker reports about one of its tasks on request: the ORIGINAL record (and, on request, books and pool) leaf
// by leaf with bit patterns (computed here: a structured clone would canonicalize NaN bits), a re-hash of the same
// kept objects, and a separately labelled re-evaluation in this same process
export interface Explanation {
  k: string;
  pid: number;
  ordinal: number; // the task's position in this worker's own sequence (0 = its first task)
  sequence: string[]; // every key this worker evaluated, in order
  originalHashes: { books?: string; pool?: string; record?: string };
  rehashOfKeptObjects: { books: string; pool: string; record: string } | null;
  original: { record: Leaf[]; books?: Leaf[]; pool?: Leaf[] } | null;
  reEvaluationSameWorker: { hashes: RefResult; record: Leaf[]; books?: Leaf[]; pool?: Leaf[] } | null;
}

if (process.send) {
  let door: Door | null = null;
  let gcCount = 0;
  const kept = new Map<
    string,
    { task: RefTask; result: RefResult; original: (Pick<Original, 'rec'> & Partial<Original>) | null; ordinal: number }
  >();
  const sequence: string[] = [];

  process.on(
    'message',
    async (m: {
      t: string;
      door?: DoorSpec;
      tasks?: RefTask[];
      keep?: Keep | boolean;
      k?: string;
      which?: string[];
    }) => {
      if (m.t === 'door') {
        door = await resolveDoor(m.door!, 'CPU reference worker');
        process.send!({ t: 'ready', pid: process.pid });
      } else if (m.t === 'tasks') {
        const out = m.tasks!.map((t) => {
          const r = referenceFull(door!, t);

          sequence.push(t.k);
          if (m.keep)
            kept.set(t.k, {
              task: t,
              result: r.result,
              original: !r.original ? null : m.keep === 'record' ? { rec: r.original.rec } : r.original,
              ordinal: sequence.length - 1
            });
          return r.result;
        });

        process.send!({ t: 'res', out });
        if (++gcCount % 16 === 0 && global.gc) global.gc();
      } else if (m.t === 'explain') {
        const e = kept.get(m.k!);
        const wantAll = (m.which ?? []).some((w) => w !== 'record');
        const o = e?.original ?? null;
        const again = e ? referenceFull(door!, e.task) : null; // AFTER the leaves of the original are taken below
        const x: Explanation = {
          k: m.k!,
          pid: process.pid,
          ordinal: e?.ordinal ?? -1,
          sequence: [...sequence],
          originalHashes: e ? { books: e.result.books, pool: e.result.pool, record: e.result.record } : {},
          rehashOfKeptObjects: o
            ? {
                books: o.books ? canonHash(o.books.map(bookView)) : 'not kept',
                pool: o.pool ? canonHash(poolView(o.pool)) : 'not kept',
                record: canonHash(o.rec)
              }
            : null,
          original: o
            ? {
                record: leavesOf(o.rec),
                ...(wantAll && o.books && o.pool
                  ? { books: leavesOf(o.books.map(bookView)), pool: leavesOf(poolView(o.pool)) }
                  : {})
              }
            : null,
          reEvaluationSameWorker: again?.original
            ? {
                hashes: again.result,
                record: leavesOf(again.original.rec),
                ...(wantAll
                  ? {
                      books: leavesOf(again.original.books.map(bookView)),
                      pool: leavesOf(poolView(again.original.pool))
                    }
                  : {})
              }
            : null
        };

        process.send!({ t: 'explained', x });
      } else if (m.t === 'release') {
        kept.clear();
        process.send!({ t: 'released' });
      } else if (m.t === 'exit') process.exit(0);
    }
  );
}
