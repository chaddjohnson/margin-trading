// A forked worker of the pilot's nonbinding CPU diagnostics: opens its door through the pilot's guards and returns
// diag-core.ts `diagnose` rows for the items it is sent (purpose diagnostic; never official evidence).
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import { openPilotDoor } from '../../src/vg-l0-risk-envelope-pilot/doors.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import type { Cfg } from '../../src/vg-l0-full-joint/space.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { diagnose } from './diag-core.ts';

assertNonOfficialCpuRun('vg-l0-risk-envelope-pilot diagnostics worker');
setA3Quiet(true);

process.on('message', async (m: { door: StudyDoor; purpose: string; items: { key: string; cfg: Cfg; options?: EvalOptions; boundary?: string }[] }) => {
  try {
    const door = await openPilotDoor(m.door, `${m.purpose} (diagnostics worker ${process.pid})`);
    const rows = m.items.map((x) => ({ key: x.key, ...diagnose(door, x.cfg, { options: x.options, boundary: x.boundary }) }));

    process.send!({ t: 'done', rows }, () => process.exit(0));
  } catch (e) {
    process.send!({ t: 'err', e: String((e as Error).stack ?? e) }, () => process.exit(1));
  }
});
