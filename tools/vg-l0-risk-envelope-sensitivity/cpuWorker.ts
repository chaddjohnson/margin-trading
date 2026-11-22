// RES-A 1.0.0 CPU evaluation worker (purpose diagnostic; never official evidence): the pilot's non-official CPU worker
// (tools/vg-l0-risk-envelope-pilot/cpuWorker.ts) copied with ONE change — the door is opened through
// src/gpu-backend/doors.ts openStudyDoor with THIS audit's study id, so every opening is logged in
// research/vg-l0-risk-envelope-sensitivity/results/doors.jsonl and nothing is written into the pilot. Only the training
// doors D21 / D24 are accepted (PROTOCOL.md §2: D23 and FULL are never opened by this audit).
import { evaluate, evaluateDetail } from '../../src/vg-l0-risk-families/evaluate.ts';
import { d1Cache2, runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../../src/vg-d1-growth-joint/space.ts';
import type { RiskConfig2 } from '../../src/d1-risk-controls-rc2/config.ts';
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import { envelopeOf } from '../../src/gpu-phase7/envelope.ts';
import { openStudyDoor } from '../../src/gpu-backend/doors.ts';
import { STUDY_ID } from './common.ts';

assertNonOfficialCpuRun('vg-l0-risk-envelope-sensitivity CPU worker');
d1Cache2.capacity = 64;

const gc = (globalThis as { gc?: () => void }).gc;
let door: Awaited<ReturnType<typeof openStudyDoor>> | null = null;
let count = 0;

process.on(
  'message',
  async (m: { t: string; door?: StudyDoor; purpose?: string; k?: string; quad?: Quad; controls?: RiskConfig2 | null; options?: EvalOptions; detail?: boolean; risk?: boolean }) => {
    if (m.t === 'door') {
      if (m.door !== 'D21' && m.door !== 'D24') throw new Error(`door ${m.door}: this audit opens only D21 / D24`);
      door = await openStudyDoor(STUDY_ID, m.door!, `${m.purpose} (CPU worker ${process.pid})`);
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
