// gpu-phase3 gate H8 (PROTOCOL.md §4, §7.5): aggregates EVERY recorded optimizer-job run of this study (each
// results/optimizer/<run>/<backend>/profile.json — none is left out) into results/bench/before-after.json, with the
// sealed CPU timings of the replayed jobs (Assignment 3 C19 broad1: 12 workers; Assignment 2 C19 base: 14 workers, as
// recorded in their sealed records) and any CPU replay measured by this study. Per run: job, path (Phase 2 serial or the
// final host path with its worker count), batch size, wall seconds, evaluations per second, main-thread utilization,
// the pool's phase sums, GC, peak RSS; per job: the medians and ranges by configuration and the speed-ups against the
// Phase 2 path and the CPU. Timings only (AD7).
//   node --experimental-transform-types tools/gpu-phase3/bench-summary.ts
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase3/context.ts';

interface Profile {
  run: string;
  job: string;
  backend: string;
  backendId: string;
  hostWorkers: number | null;
  batchSize: number;
  wallSeconds: number;
  fresh: number;
  evaluationsPerSecond: number;
  mainThread: { eventLoopUtilization: number; activeSeconds: number; idleSeconds: number };
  processCpuSeconds: { user: number; system: number };
  archive: { writes: number; writeSeconds: number };
  gc: Record<string, { n: number; seconds: number }>;
  batches: {
    n: number;
    median: number;
    under1024: number;
    serverSeconds: number;
    encodeSeconds: number;
    decodeSeconds: number;
  } | null;
  peakRssMiB: number;
}

const dir = path.join(resultsDir, 'optimizer');
const runs: (Profile & { path: string; config: string })[] = [];

for (const run of fs.readdirSync(dir)) {
  for (const backend of ['gpu', 'cpu']) {
    const f = path.join(dir, run, backend, 'profile.json');

    if (!fs.existsSync(f)) continue;
    const p = JSON.parse(fs.readFileSync(f, 'utf8')) as Profile;

    if (run.startsWith('smoke-')) continue; // tool smoke tests (partial jobs), listed separately below
    const mode =
      backend === 'cpu'
        ? 'cpu'
        : run.startsWith('p2-')
          ? 'phase2-serial'
          : p.hostWorkers
            ? `parallel-${p.hostWorkers}w`
            : 'serial';

    runs.push({ ...p, path: path.relative(repoRoot, f), config: `${mode}|b${p.batchSize}` });
  }
}
runs.sort((a, b) => a.job.localeCompare(b.job) || a.config.localeCompare(b.config) || a.run.localeCompare(b.run));

const median = (x: number[]) => {
  const s = [...x].sort((a, b) => a - b);

  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};
const sealedCpu: Record<string, { wallSeconds: number; workers: number; file: string }> = {
  'a3:C19:broad1': {
    wallSeconds: JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'research/vg-l0-full-joint/results/search/C19/broad1.json'), 'utf8')
    ).compute.wallSeconds,
    workers: 12,
    file: 'research/vg-l0-full-joint/results/search/C19/broad1.json'
  },
  'a2:C19:base': {
    wallSeconds: JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'research/vg-l0-risk-families/results/search/C19/base.json'), 'utf8')
    ).compute.wallSeconds,
    workers: 14,
    file: 'research/vg-l0-risk-families/results/search/C19/base.json'
  }
};
const jobs = [...new Set(runs.map((r) => r.job))];
const byJob = jobs.map((job) => {
  const rs = runs.filter((r) => r.job === job);
  const configs = [...new Set(rs.map((r) => r.config))].map((config) => {
    const x = rs.filter((r) => r.config === config);
    const w = x.map((r) => r.wallSeconds);

    return {
      config,
      runs: x.map((r) => r.run),
      wallSeconds: { median: median(w), min: Math.min(...w), max: Math.max(...w) },
      evaluationsPerSecond: median(x.map((r) => r.evaluationsPerSecond)),
      mainThreadUtilization: median(x.map((r) => r.mainThread.eventLoopUtilization)),
      peakRssMiB: Math.max(...x.map((r) => r.peakRssMiB))
    };
  });
  const p2 = configs.find((c) => c.config.startsWith('phase2-serial'));
  const cpu = configs.find((c) => c.config.startsWith('cpu'));
  const sealed = sealedCpu[job];

  return {
    job,
    sealedCpu: sealed ?? null,
    configs: configs.map((c) => ({
      ...c,
      speedupVsPhase2: p2 ? Math.round((p2.wallSeconds.median / c.wallSeconds.median) * 100) / 100 : null,
      speedupVsMeasuredCpu: cpu ? Math.round((cpu.wallSeconds.median / c.wallSeconds.median) * 100) / 100 : null,
      speedupVsSealedCpu: sealed ? Math.round((sealed.wallSeconds / c.wallSeconds.median) * 100) / 100 : null
    }))
  };
});

writeJson(path.join(resultsDir, 'bench', 'before-after.json'), {
  kind: 'gpu-phase3 end-to-end benchmarks (every recorded run)',
  t: new Date().toISOString(),
  runs: runs.map((r) => ({
    run: r.run,
    job: r.job,
    config: r.config,
    backendId: r.backendId,
    wallSeconds: r.wallSeconds,
    fresh: r.fresh,
    evaluationsPerSecond: r.evaluationsPerSecond,
    mainThread: r.mainThread,
    processCpuSeconds: r.processCpuSeconds,
    archive: r.archive,
    gc: r.gc,
    batches: r.batches,
    peakRssMiB: r.peakRssMiB,
    profile: r.path
  })),
  byJob
});
for (const j of byJob)
  for (const c of j.configs)
    console.log(
      `${j.job.padEnd(16)} ${c.config.padEnd(24)} n=${c.runs.length} wall ${c.wallSeconds.median}s (${c.wallSeconds.min}–${c.wallSeconds.max}) ${c.evaluationsPerSecond} ev/s  vsP2 ${c.speedupVsPhase2}  vsCPU ${c.speedupVsMeasuredCpu ?? '-'} vsSealedCPU ${c.speedupVsSealedCpu ?? '-'}`
    );
