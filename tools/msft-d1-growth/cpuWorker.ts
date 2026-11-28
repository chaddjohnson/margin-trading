// A CPU evaluation worker of P9-MSFT NON-OFFICIAL tools (engineering parity references: purpose parity-test; the
// report-only diagnostics: purpose diagnostic) — src/gpu-phase7/cpuEvalWorker.ts in substance (the canonical evaluate /
// evaluateDetail; a task with `risk` returns { ...record, envelope } from the canonical CPU envelope reference
// src/gpu-phase7/envelope.ts envelopeOf), with this study's own guarded MSFT door access (src/msft-d1-growth/doors.ts:
// every opening logged in research/msft-d1-growth/results/doors.jsonl).
import { evaluate, evaluateDetail } from '../../src/vg-l0-risk-families/evaluate.ts';
import { d1Cache2, runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../../src/vg-d1-growth-joint/space.ts';
import type { RiskConfig2 } from '../../src/d1-risk-controls-rc2/config.ts';
import type { DoorName } from '../../src/msft-d1-growth/context.ts';
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import { envelopeOf } from '../../src/gpu-phase7/envelope.ts';
import { type DoorUse, openMsftDoor } from '../../src/msft-d1-growth/doors.ts';

assertNonOfficialCpuRun('msft-d1-growth CPU worker');
d1Cache2.capacity = 64;

const gc = (globalThis as { gc?: () => void }).gc;
let door: Awaited<ReturnType<typeof openMsftDoor>> | null = null;
let count = 0;

process.on(
  'message',
  async (m: { t: string; door?: DoorName; use?: DoorUse; purpose?: string; k?: string; quad?: Quad; controls?: RiskConfig2 | null; options?: EvalOptions; detail?: boolean; risk?: boolean }) => {
    if (m.t === 'door') {
      door = await openMsftDoor(m.door!, m.use ?? 'engineering', `${m.purpose} (CPU worker ${process.pid})`);
      door.sym.VGT.history = new Array(door.sym.VGT.history.length); // one SymDoor object in both slots
      process.send!({ t: 'ready' });
      return;
    }
    if (m.t === 'exit') process.exit(0);

    const t0 = performance.now();

    try {
      const record = (m.detail ? evaluateDetail : evaluate)(door!, m.quad!, m.controls ?? null, m.options ?? {});
      let value: unknown = record;

      if (m.risk) {
        const x = runWithControls2(door!, m.quad!, m.controls ?? null, m.options ?? {}, Boolean(m.detail), false, { cache: false });
        const [bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation] = envelopeOf(door!, x, m.options ?? {});

        value = { ...record, envelope: { bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation } };
      }
      process.send!({ t: 'res', k: m.k, r: value, ms: performance.now() - t0 });
    } catch (error) {
      process.send!({ t: 'err', k: m.k, e: String((error as Error).stack ?? error) });
    }
    if (++count % 64 === 0) gc?.();
  }
);
process.on('disconnect', () => process.exit(0));
