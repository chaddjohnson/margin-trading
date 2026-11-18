// S1 CPU baseline, part 2: production-shaped multi-process throughput (PROTOCOL.md §12 G1, AD6).
//
// Workload: rung-1-shaped work as Assignment 3's lanes dispatch it — `centres` seeded random A3 genomes plus the two
// reference identities, each with 16 'joint' neighbours (A3's own generator) — through a mirror of A3's pool
// (child processes, 2 tasks in flight per worker, GC every 64 evaluations, A3's book caches ON, as in production).
// Per worker count: start-up (door parsing) timed apart; a warm-up batch (4 tasks per worker) excluded; then the timed
// batch. CPU utilization from /proc/stat, the unit's cgroup memory, and each worker's RSS / GC / CPU time are sampled.
// Output hashes must agree across worker counts (the CPU reference is deterministic). No money figure is read (AD7).
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase1/bench-cpu-pool.ts --door D24 --workers 1,8,12,14,16 \
//     --centres 128 --out <json>
import fs from 'node:fs';
import os from 'node:os';
import { CpuPool, type Task } from '../../src/gpu-phase1/cpuPool.ts';
import { type DoorKey, median, writeJson } from '../../src/gpu-phase1/context.ts';
import { type Subject, neighbourSubjects, randomSubjects, referenceSubjects } from '../../src/gpu-phase1/subjects.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);

  return i >= 0 ? args[i + 1]! : d;
};
const door = opt('door', 'D24') as DoorKey;
const workerCounts = opt('workers', '1,8,12,14,16').split(',').map(Number);
const nCentres = Number(opt('centres', '128'));
const singleCap = Number(opt('single-cap', '256')); // the 1-worker run times only this many tasks
const out = opt('out', '');

if (!out) throw new Error('--out <json> is required');

const tg0 = performance.now();
const centres: Subject[] = [...referenceSubjects(), ...randomSubjects(nCentres, 'BENCH')];
const work: Subject[] = [];

for (const c of centres) work.push(c, ...neighbourSubjects([c], 16));

const warm: Subject[] = randomSubjects(64, 'WARM');
const genMs = performance.now() - tg0;
const toTask = (s: Subject, i: number): Task => ({ k: `${i}:${s.key}`, quad: s.quad, controls: s.controls, options: vOptions });

const cpuTimes = () =>
  fs
    .readFileSync('/proc/stat', 'utf8')
    .split('\n')[0]!
    .trim()
    .split(/\s+/)
    .slice(1)
    .map(Number);
const cgroupFile = (name: string) => {
  try {
    const cg = fs.readFileSync('/proc/self/cgroup', 'utf8').trim().split(':').at(-1)!;

    return fs.readFileSync(`/sys/fs/cgroup${cg}/${name}`, 'utf8').trim();
  } catch {
    return null;
  }
};

const runs: Record<string, unknown>[] = [];
const hashes = new Map<string, string>();
let mismatches = 0;

for (const w of workerCounts) {
  const pool = new CpuPool({ door, purpose: `S1 bench ${w} workers`, workers: w });
  const ts = performance.now();

  await pool.start();

  const startMs = performance.now() - ts;

  await pool.run(warm.slice(0, Math.min(warm.length, 4 * w)).map((s, i) => toTask(s, -1 - i)), () => {});

  const batch = (w === 1 ? work.slice(0, singleCap) : work).map(toTask);
  const ms: number[] = [];
  const c0 = cpuTimes();
  const t0 = performance.now();
  const computeBefore = pool.computeMs;

  await pool.run(batch, (t, h, m) => {
    ms.push(m);

    const prev = hashes.get(t.k);

    if (prev === undefined) hashes.set(t.k, h);
    else if (prev !== h) mismatches++;
  });

  const wall = (performance.now() - t0) / 1000;
  const c1 = cpuTimes();
  const d = c1.map((x, i) => x - c0[i]!);
  const total = d.reduce((a, b) => a + b, 0);
  const idle = d[3]! + d[4]!;
  const stats = await pool.stats();

  await pool.close();

  const r = {
    workers: w,
    tasks: batch.length,
    startSeconds: startMs / 1000,
    wallSeconds: wall,
    evalsPerSecond: batch.length / wall,
    inWorkerMs: { mean: ms.reduce((a, b) => a + b, 0) / ms.length, median: median(ms) },
    workerBusyShare: (pool.computeMs - computeBefore) / 1000 / (wall * w),
    hostCpuUtilization: 1 - idle / total,
    cgroup: { memoryPeak: cgroupFile('memory.peak'), memoryCurrent: cgroupFile('memory.current') },
    workerStats: stats
  };

  runs.push(r);
  console.log(`${w} workers: ${r.evalsPerSecond.toFixed(1)} ev/s, in-worker ${r.inWorkerMs.mean.toFixed(1)} ms, busy ${(r.workerBusyShare * 100).toFixed(0)}%, host CPU ${(r.hostCpuUtilization * 100).toFixed(0)}%, start ${r.startSeconds.toFixed(1)} s`);
}

writeJson(out, {
  kind: 'gpu-phase1 S1 CPU pool benchmark',
  door,
  host: { cpus: os.cpus()[0]?.model, threads: os.cpus().length, node: process.version, loadavg: os.loadavg() },
  method: {
    workload: `${centres.length} centres (2 reference + ${nCentres} seeded A3 genomes 'BENCH') x (1 + 16 joint neighbours) = ${work.length} evaluations; 1-worker run times the first ${singleCap}`,
    warmup: '4 tasks per worker from a separate seeded set, excluded',
    caches: 'A3 production defaults (Growth 48 / D1 64 entries per worker)',
    gc: 'every 64 evaluations or > 256 MiB ArrayBuffers (A3 cadence)',
    inflightPerWorker: 2
  },
  candidateGenerationMs: genMs,
  deterministicAcrossWorkerCounts: mismatches === 0,
  runs
});
console.log(`deterministic: ${mismatches === 0}; wrote ${out}`);
