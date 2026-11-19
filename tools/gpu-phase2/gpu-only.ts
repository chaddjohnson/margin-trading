// gpu-phase2 development probe: GPU-only evaluation of a subject set (statuses and timing; no CPU, no values).
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type DoorKey, cacheDir, openDoor } from '../../src/gpu-phase2/context.ts';
import { branchHeavySubjects, growthStrata, neighbourSubjects, randomSubjects, referenceSubjects } from '../../src/gpu-phase2/subjects.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const door = await openDoor(opt('door', 'D24') as DoorKey, 'gpu-only probe');
const ds = exportDataset(door, cacheDir);
const set = opt('set', 'strata');
const refs = referenceSubjects();
const subjects =
  set === 'strata' ? growthStrata(Number(opt('per', '8')), opt('label', 'A0-G')) :
  set === 'branch' ? branchHeavySubjects(refs[0]!.quad) :
  set === 'neighbours' ? neighbourSubjects(refs, Number(opt('n', '32'))) :
  set === 'random' ? randomSubjects(Number(opt('n', '2000')), opt('label', 'A0')) :
  set === 'core' ? [...refs, ...randomSubjects(2000, 'A0'), ...growthStrata(8, 'A0-G'), ...branchHeavySubjects(refs[0]!.quad), ...neighbourSubjects(refs, 32)] : refs;
const from = Number(opt('from', '0'));
const count = Number(opt('count', String(subjects.length)));
const list = subjects.slice(from, from + count);
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
if (args.includes('--info')) await server.info();
if (args.includes('--smoke')) console.log('smoke', (await server.smoke()).ok);
await server.load(ds.file);
const t0 = performance.now();
const r = await server.evaluate(door, list.map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options: vOptions, detail: false })), { tradeCapD1: 1024, tradeCapG: 1024, lotCap: 1024, fundCap: 4096, returnTrades: args.includes('--trades'), returnSeries: args.includes('--series') });
const bad = r.results.filter((x) => x.status !== 0).map((x) => `${x.key}:${x.statusText}:${x.errInfo}`);
console.log(JSON.stringify({ set, from, n: list.length, ms: Math.round(performance.now() - t0), gMs: Math.round(r.receipt.server.gMs), d1Ms: Math.round(r.receipt.server.d1Ms), poolMs: Math.round(r.receipt.server.poolMs), bad }));
await server.close();
