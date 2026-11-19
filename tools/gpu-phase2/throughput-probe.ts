// gpu-phase2 development probe: GPU throughput of the full joint evaluation (D1 + Growth + pool + canonical record)
// at several batch sizes on one door. Timings only (AD7). Not a benchmark record (see tools/gpu-phase2/bench.ts).
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type DoorKey, cacheDir, openDoor } from '../../src/gpu-phase2/context.ts';
import { randomSubjects } from '../../src/gpu-phase2/subjects.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const door = await openDoor(opt('door', 'D24') as DoorKey, 'throughput probe');
const ds = exportDataset(door, cacheDir);
const sizes = opt('sizes', '1024,4096,8192').split(',').map(Number);
const pool = randomSubjects(Math.max(...sizes), 'TPUT');
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib, tpb: Number(opt('tpb', '64')) });
await server.load(ds.file);
const mem = () => execFileSync('nvidia-smi', ['--query-gpu=memory.used', '--format=csv,noheader,nounits']).toString().trim();
for (const n of sizes) {
  const tasks = pool.slice(0, n).map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options: vOptions, detail: false }));
  const t0 = performance.now();
  const r = await server.evaluate(door, tasks, { record: true });
  const t1 = performance.now();
  const bad = r.results.filter((x) => x.status !== 0).length;
  console.log(JSON.stringify({ n, wallMs: Math.round(t1 - t0), evPerS: Math.round((n / (t1 - t0)) * 1000), d1Ms: Math.round(r.receipt.server.d1Ms), gMs: Math.round(r.receipt.server.gMs), poolMs: Math.round(r.receipt.server.poolMs), serverMs: Math.round(r.receipt.server.totalMs), encodeMs: Math.round(r.timing.encodeMs), decodeMs: Math.round(r.timing.decodeMs), deviceMiB: Math.round(r.receipt.server.deviceBytes / 2 ** 20), usedMiB: mem(), statusNotOk: bad }));
}
await server.close();
