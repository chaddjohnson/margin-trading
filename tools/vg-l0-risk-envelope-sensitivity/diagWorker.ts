// RES-A 1.0.0 G2 worker (PROTOCOL.md §5; purpose diagnostic; never official evidence): for each fixed, already-evaluated
// centre it runs the canonical CPU engine twice on the training door —
//   1. evaluate() (src/vg-l0-risk-families/evaluate.ts, the canonical record) and the CPU envelope reference
//      (src/gpu-phase7/envelope.ts envelopeOf) — for the G3 parity check against the archived official GPU record;
//   2. the pooled replay → the funded-lot ledger and the portfolio path (src/vg-l0-risk-metrics/), from which the D3
//      account partition of the conventional drawdown (src/risk-envelope/diagnostics.ts componentDrawdown: U unbanked
//      giveback, E banked-profit erosion, F starting-capital loss, plus the lot-level giveback / principal-loss split) and
//      the path's own banked DD (a cross-check of the envelope) are computed, marked and liquidation bases.
// The door is opened through openStudyDoor with this audit's id (D21 / D24 only).
import { openStudyDoor, type StudyDoor } from '../../src/gpu-backend/doors.ts';
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import { evaluate } from '../../src/vg-l0-risk-families/evaluate.ts';
import { d1Cache2, runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { type Cfg, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { portfolioPath } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { envelopeOf } from '../../src/gpu-phase7/envelope.ts';
import { componentDrawdown } from '../../src/risk-envelope/diagnostics.ts';
import { STUDY_ID } from './common.ts';

assertNonOfficialCpuRun('vg-l0-risk-envelope-sensitivity G2 worker');
setA3Quiet(true);
d1Cache2.capacity = 64;

const gc = (globalThis as { gc?: () => void }).gc;

process.on('message', async (m: { door: StudyDoor; purpose: string; items: { key: string; cfg: Cfg }[] }) => {
  try {
    if (m.door !== 'D21' && m.door !== 'D24') throw new Error(`door ${m.door}: this audit opens only D21 / D24`);

    const door = await openStudyDoor(STUDY_ID, m.door, `${m.purpose} (G2 worker ${process.pid})`);

    const rows = [];
    let count = 0;

    for (const x of m.items) {
      const q = quadOf(x.cfg);
      const rec = evaluate(door, q, x.cfg.controls ?? null, vOptions);
      const run = runWithControls2(door, q, x.cfg.controls ?? null, vOptions, false, false, { cache: false });
      const [bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation] = envelopeOf(door, run, vOptions);
      const L = toLedger({ door, subject: null as never, options: vOptions, books: run.books, result: run.result, rec: null as never });
      const pts = portfolioPath(L);
      const d3 = Object.fromEntries((['marked', 'liquidation'] as const).map((b) => [b, componentDrawdown(pts, L, b)]));

      rows.push({ key: x.key, rec: { ...rec, envelope: { bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation } }, d3 });
      if (++count % 32 === 0) gc?.();
    }
    process.send!({ t: 'done', rows }, () => process.exit(0));
  } catch (e) {
    process.send!({ t: 'err', e: String((e as Error).stack ?? e) }, () => process.exit(1));
  }
});
