// gpu-phase7 (a copy of src/gpu-phase6/cpuEvalWorker.ts with this study's namespace, plus the risk-envelope delivery:
// a task with `risk` returns { ...record, envelope } with the envelope of the canonical CPU reference —
// src/vg-l0-risk-metrics toLedger → portfolioPath / bankedDrawdown / tradeRisk, src/gpu-phase7/envelope.ts envelopeOf —
// exactly the value shape the GPU pool delivers): a CPU evaluation worker for the NON-OFFICIAL CPU arm of the fixed-seed mini-optimization (purpose
// 'parity-test'). It is Assignment 3's worker (src/vg-l0-full-joint/worker.ts) in substance — one door, one record per
// task through the canonical evaluate / evaluateDetail (vg-l0-risk-families = Assignment 3's evaluate.ts) — with this
// study's own door access (Assignment 3's worker logs door openings into that completed study's directory).
import { evaluate, evaluateDetail } from '../vg-l0-risk-families/evaluate.ts';
import { d1Cache2 } from '../d1-risk-controls-rc2/run.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';
import { type DoorSpec, resolveDoor } from './doorSpec.ts';
import { assertNonOfficialCpuRun } from '../gpu-backend/purpose.ts';
import { runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import { envelopeOf } from './envelope.ts';

assertNonOfficialCpuRun('gpu-phase7 CPU evaluation worker');
d1Cache2.capacity = 64;

const gc = (globalThis as { gc?: () => void }).gc;
let door: Awaited<ReturnType<typeof resolveDoor>> | null = null;
let count = 0;

process.on(
  'message',
  async (m: {
    t: string;
    door?: DoorSpec;
    k?: string;
    quad?: Quad;
    controls?: RiskConfig2 | null;
    options?: EvalOptions;
    detail?: boolean;
    risk?: boolean;
  }) => {
    if (m.t === 'door') {
      door = await resolveDoor(m.door!, 'mini-optimization CPU worker');
      for (const s of ['GDX', 'VGT'] as const) door.sym[s].history = new Array(door.sym[s].history.length);
      process.send!({ t: 'ready' });
      return;
    }
    if (m.t === 'exit') process.exit(0);
    const t0 = performance.now();

    try {
      const record = (m.detail ? evaluateDetail : evaluate)(door!, m.quad!, m.controls ?? null, m.options ?? {});
      let value: unknown = record;

      if (m.risk) {
        const x = runWithControls2(door!, m.quad!, m.controls ?? null, m.options ?? {}, Boolean(m.detail), false, {
          cache: false
        });
        const [bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation] = envelopeOf(
          door!,
          x,
          m.options ?? {}
        );

        value = {
          ...record,
          envelope: { bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation }
        };
      }
      process.send!({ t: 'res', k: m.k, r: value, ms: performance.now() - t0 });
    } catch (error) {
      process.send!({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
    }
    if (++count % 64 === 0) gc?.();
  }
);
process.on('disconnect', () => process.exit(0));
