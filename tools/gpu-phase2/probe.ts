// gpu-phase2 development probe (not a gate record): CPU vs GPU on a few subjects of one door, printing the first
// differences of every book, the pool and the record. Values printed only for reference identities (AD7).
//   node --experimental-transform-types tools/gpu-phase2/probe.ts --door W-CRASH --random 8 [--strata 1] [--binary …]
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { evaluate } from '../../src/vg-l0-risk-families/evaluate.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { type DoorKey, cacheDir, openDoor } from '../../src/gpu-phase2/context.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase2/subjects.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const doorName = opt('door', 'W-CRASH') as DoorKey;
const door = await openDoor(doorName, 'probe');
const ds = exportDataset(door, cacheDir);
const subjects = [...referenceSubjects(), ...randomSubjects(Number(opt('random', '8')), 'PROBE'), ...growthStrata(Number(opt('strata', '0')), 'PROBE-G')];
const server = GpuServer.start({ binary: opt('binary', serverBinary), libDir: toolkitLib });
const info = await server.info();
const smoke = await server.smoke();

console.log(JSON.stringify({ device: info.device, uuid: info.uuid, smoke: smoke.ok, sessions: door.sessions }));
await server.load(ds.file);

const tasks = subjects.map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options: vOptions, detail: false }));
const t0 = performance.now();
const gpu = await server.evaluate(door, tasks, { returnTrades: true, returnSeries: true });
const t1 = performance.now();
let bad = 0;

console.log(`GPU batch of ${tasks.length}: ${(t1 - t0).toFixed(0)} ms (D1 ${gpu.receipt.server.d1Ms.toFixed(0)}, G ${gpu.receipt.server.gMs.toFixed(0)}, pool ${gpu.receipt.server.poolMs.toFixed(0)} ms)`);
for (const [i, s] of subjects.entries()) {
  const g = gpu.results[i]!;
  const x = runWithControls2(door, s.quad, s.controls, vOptions, false, false, { cache: false });
  const rec = evaluate(door, s.quad, s.controls, vOptions);
  const diffs: unknown[] = [];

  if (g.status !== 0) {
    console.log(`${s.key}: GPU status ${g.statusText} (${g.errInfo})`);
    bad++;
    continue;
  }
  for (const cb of x.books) {
    const gb = g.books.find((b) => b.book === cb.book)!;
    const d = deepDiff({ trades: cb.trades, signals: cb.signals, firstDecision: cb.firstDecision, standalone: cb.standalone }, { trades: gb.trades, signals: gb.signals, firstDecision: gb.firstDecision, standalone: gb.standalone }, `$.${cb.book}`, [], 6);

    diffs.push(...d);
  }
  const pd = deepDiff({ ...x.result, refusals: Object.fromEntries(Object.entries(x.result.refusals).sort()) }, { ...g.pool!, refusals: Object.fromEntries(Object.entries(g.pool!.refusals).sort()), lots: g.pool!.lots.map((l, j) => ({ ...l, trade: x.result.lots[j]?.trade })) }, '$.pool', [], 6);
  diffs.push(...pd);
  diffs.push(...deepDiff(rec, g.record, '$.record', [], 6));
  if (diffs.length) {
    bad++;
    console.log(`${s.key}: ${diffs.length} difference(s)`, JSON.stringify(s.key.startsWith('R:') ? diffs : diffs.map((d) => ({ ...(d as object), cpu: '·', gpu: '·' }))).slice(0, 1500));
  }
}
console.log(`${subjects.length - bad}/${subjects.length} identical`);
await server.close();
