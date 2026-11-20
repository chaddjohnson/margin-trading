// gpu-phase4 (PROTOCOL.md §7): the measured figures of one benchmark group, from its own records only (NON-OFFICIAL;
// timings never select or tune anything inside a run). Writes research/gpu-phase4/results/bench/<G>/summary.json.
//
// Definitions (PROTOCOL.md §7):
//   go_j, end_j        job j's start after the barrier, and its end (profile times)
//   makespan           max end_j − min go_j;  aggregate (makespan) = Σ fresh_j / makespan
//   window             [max go_j + 30 s warm-up, min end_j − 2 s] — every job running; null if shorter than 60 s
//   window rate        Σ (candidates of the batches a job completed inside the window) / window length, per job and
//                      summed; the coefficient of variation is across the jobs' window rates
//   server overlap     Σ_j (server ms of job j's batches completed in the window) / window length: > 1 means batches of
//                      different processes were inside their servers at the same time (time-sliced on the device)
//   device-idle share  per job, 1 − (its server time in the window) / window: how long the job had no batch on the GPU
//   monitor figures    over the window: dmon "sm" (share of time any kernel ran — NOT SM occupancy) and "mem" (memory
//                      busy share), power, temperatures, clocks, VRAM; CPU busy share of the 16 logical CPUs; MemAvailable;
//                      the slice's cgroup peak; GPM SM activity / occupancy / DRAM only if reported
//   node --experimental-transform-types tools/gpu-phase4/summarize.ts --group <G> [--warmup 30]
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const G = opt('group', '');
const warm = Number(opt('warmup', '30')) * 1000;
const dir = path.join(resultsDir, 'bench', G);
const group = JSON.parse(fs.readFileSync(path.join(dir, 'group.json'), 'utf8')) as Record<string, unknown> & {
  tool?: string;
  runs: string[];
  exitStatus: (number | null)[];
};
const tool = group.tool ?? 'replay';
const jsonl = (f: string) =>
  fs.existsSync(f)
    ? fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Record<string, unknown>)
    : [];
const ms = (t: unknown) => Date.parse(String(t));
const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const q = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);

  return s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (i - lo);
};
const cv = (xs: number[]) => {
  const m = mean(xs);

  return xs.length > 1 ? Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m : 0;
};

interface Batch {
  t: number;
  n: number;
  serverMs: number;
  wallMs: number;
  encodeMs: number;
  decodeMs: number;
}

const jobs = group.runs.map((run, i) => {
  if (tool === 'poolbench') {
    const p = JSON.parse(fs.readFileSync(path.join(resultsDir, 'pool', run, 'profile.json'), 'utf8')) as Record<
      string,
      unknown
    > & { times: Record<string, string>; roundRows: Record<string, number>[] };
    const batches: Batch[] = [];

    for (let r = 1; r <= Number(p.rounds); r++)
      for (const b of jsonl(path.join(resultsDir, 'pool', run, `receipts-r${r}.jsonl`)))
        if ('nonce' in b)
          batches.push({
            t: ms(b.t),
            n: Number(b.n),
            serverMs: Number(b.serverMs),
            wallMs: Number(b.wallMs),
            encodeMs: Number(b.encodeMs),
            decodeMs: Number(b.decodeMs)
          });
    return {
      run,
      status: group.exitStatus[i],
      go: ms(p.times.go),
      end: ms(p.times.end),
      fresh: Number(p.tasks) * Number(p.rounds),
      batches,
      p,
      samples: [] as Record<string, number>[]
    };
  }
  const out = path.join(resultsDir, 'optimizer', run, 'gpu');
  const p = JSON.parse(fs.readFileSync(path.join(out, 'profile.json'), 'utf8')) as Record<string, unknown> & {
    times: Record<string, string>;
    samples: Record<string, number>[];
  };
  const batches = jsonl(path.join(out, 'receipts.jsonl'))
    .filter((b) => 'nonce' in b)
    .map((b) => ({
      t: ms(b.t),
      n: Number(b.n),
      serverMs: Number(b.serverMs),
      wallMs: Number(b.wallMs),
      encodeMs: Number(b.encodeMs),
      decodeMs: Number(b.decodeMs)
    }));

  return {
    run,
    status: group.exitStatus[i],
    go: ms(p.times.go),
    end: ms(p.times.end),
    fresh: Number(p.fresh),
    batches,
    p,
    samples: p.samples
  };
});

const go0 = Math.min(...jobs.map((j) => j.go));
const goMax = Math.max(...jobs.map((j) => j.go));
const endMax = Math.max(...jobs.map((j) => j.end));
const endMin = Math.min(...jobs.map((j) => j.end));
const makespan = (endMax - go0) / 1000;
const W0 = goMax + warm;
const W1 = endMin - 2000;
const wLen = (W1 - W0) / 1000;
const hasWindow = wLen >= 60;
const inW = (t: number) => t > W0 && t <= W1;
const perJob = jobs.map((j) => {
  const wb = j.batches.filter((b) => inW(b.t));
  const wn = wb.reduce((a, b) => a + b.n, 0);
  const wServer = wb.reduce((a, b) => a + b.serverMs, 0) / 1000;
  const ws = j.samples.filter((s) => inW(ms(s.t)));
  const prof = j.p as Record<string, unknown>;
  const batchesAll = j.batches;

  return {
    run: j.run,
    status: j.status,
    wallSeconds: r1((j.end - j.go) / 1000),
    fresh: j.fresh,
    evPerS: r1(j.fresh / ((j.end - j.go) / 1000)),
    startOffsetSeconds: r3((j.go - go0) / 1000),
    window: hasWindow
      ? {
          candidates: wn,
          evPerS: r1(wn / wLen),
          batches: wb.length,
          medianBatch: q(
            wb.map((b) => b.n),
            0.5
          ),
          serverSeconds: r1(wServer),
          serverMsPerBatchMean: r1(mean(wb.map((b) => b.serverMs))),
          serverMsPerKCandidates: r1((wServer * 1000) / Math.max(1, wn / 1000)),
          batchWallMsMean: r1(mean(wb.map((b) => b.wallMs))),
          deviceIdleShare: r3(1 - wServer / wLen),
          queuedMean: r1(mean(ws.map((s) => s.queued!))),
          inFlightMean: r1(mean(ws.map((s) => s.inFlight!))),
          noBatchInFlightShare: ws.length ? r3(ws.filter((s) => s.inFlight === 0).length / ws.length) : null,
          mainThreadEluMean: r3(mean(ws.map((s) => s.elu!))),
          processCpuCoresMean: r1(mean(ws.map((s) => s.cpuCores!)))
        }
      : null,
    whole: {
      batches: batchesAll.length,
      medianBatch: q(
        batchesAll.map((b) => b.n),
        0.5
      ),
      serverSeconds: r1(batchesAll.reduce((a, b) => a + b.serverMs, 0) / 1000),
      encodeSeconds: r1(batchesAll.reduce((a, b) => a + b.encodeMs, 0) / 1000),
      decodeSeconds: r1(batchesAll.reduce((a, b) => a + b.decodeMs, 0) / 1000),
      serverMsPerBatchMean: r1(mean(batchesAll.map((b) => b.serverMs)))
    },
    mainThread: prof.mainThread ?? null,
    processCpuSeconds: prof.processCpuSeconds ?? null,
    peakRssMiB: prof.peakRssMiB ?? null,
    process: prof.process ?? null,
    serverProcess: prof.serverProcess ?? null,
    archive: prof.archive ?? null,
    gc: prof.gc ?? null,
    barrierWaitSeconds: (prof.times as Record<string, number>).barrierWaitSeconds ?? null,
    rounds: tool === 'poolbench' ? (prof.roundRows as Record<string, number>[]).map((r) => [r.round, r.seconds, r.evPerS]) : null
  };
});

// ----- the system monitor over the window (or the whole run when there is no window) -----
const mon = jsonl(path.join(dir, 'monitor.jsonl'));
const lo = hasWindow ? W0 : go0;
const hi = hasWindow ? W1 : endMax;
const mw = mon.filter((m) => ms(m.t) > lo && ms(m.t) <= hi);
const dmon = mw.filter((m) => m.src === 'dmon') as Record<string, number | null>[];
const sys = mw.filter((m) => m.src === 'sys') as (Record<string, unknown> & {
  gpu: Record<string, number | string>;
  cgroup: { peakMiB: number; currentMiB: number; events: Record<string, number> } | null;
  computeApps?: { pid: number; name: string; usedMiB: number }[];
})[];
const col = (k: string) => dmon.map((d) => d[k]).filter((x): x is number => typeof x === 'number');
const stat = (xs: number[]) => (xs.length ? { mean: r1(mean(xs)), p95: r1(q(xs, 0.95)), max: r1(Math.max(...xs)), min: r1(Math.min(...xs)) } : null);
const appsPeak: Record<string, { name: string; maxUsedMiB: number }> = {};

for (const s of mon.filter((m) => m.src === 'sys') as { computeApps?: { pid: number; name: string; usedMiB: number }[] }[])
  for (const a of s.computeApps ?? []) {
    const e = (appsPeak[a.pid] ??= { name: a.name, maxUsedMiB: 0 });

    e.maxUsedMiB = Math.max(e.maxUsedMiB, a.usedMiB);
  }

const serverPids = new Map<number, string>();

if (tool !== 'poolbench')
  for (const j of jobs) {
    const res = JSON.parse(fs.readFileSync(path.join(resultsDir, 'optimizer', j.run, 'gpu', 'result.json'), 'utf8')) as {
      server?: { pid?: number };
    };

    if (res.server?.pid) serverPids.set(res.server.pid, j.run);
  }

const allSys = mon.filter((m) => m.src === 'sys') as typeof sys;
const lastCg = allSys.at(-1)?.cgroup ?? null;
const summary = {
  kind: 'gpu-phase4 benchmark group summary',
  t: new Date().toISOString(),
  group: G,
  config: {
    tool,
    jobs: group.jobs,
    mode: group.mode,
    job: group.job,
    hostWorkersPerJob: group.hostWorkersPerJob,
    batch: group.batch,
    stopAfter: group.stopAfter,
    vramBudgetMbPerJob: group.vramBudgetMbPerJob,
    extra: group.extra
  },
  exitStatus: group.exitStatus,
  startSpreadSeconds: r3((goMax - go0) / 1000),
  makespanSeconds: r1(makespan),
  freshTotal: jobs.reduce((a, j) => a + j.fresh, 0),
  aggregateEvPerSMakespan: r1(jobs.reduce((a, j) => a + j.fresh, 0) / makespan),
  window: hasWindow
    ? {
        from: new Date(W0).toISOString(),
        to: new Date(W1).toISOString(),
        seconds: r1(wLen),
        aggregateEvPerS: r1(perJob.reduce((a, j) => a + j.window!.evPerS, 0)),
        perJobEvPerS: perJob.map((j) => j.window!.evPerS),
        perJobCv: r3(cv(perJob.map((j) => j.window!.evPerS))),
        serverOverlap: r3(perJob.reduce((a, j) => a + j.window!.serverSeconds, 0) / wLen)
      }
    : null,
  jobs: perJob,
  monitor: {
    span: hasWindow ? 'window' : 'whole run',
    dmonSamples: dmon.length,
    kernelActiveSharePct: stat(col('sm')), // dmon "sm": share of time any kernel ran (not SM occupancy)
    memoryBusySharePct: stat(col('mem')),
    powerW: stat(col('pwr')),
    gpuTempC: stat(col('gtemp')),
    smClockMHz: stat(col('pclk')),
    memClockMHz: stat(col('mclk')),
    gpm: {
      smActivityPct: stat(col('smutil')),
      smOccupancyPct: stat(col('smocc')),
      dramBandwidthPct: stat(col('dram')),
      available: col('smutil').length > 0
    },
    vramUsedMiB: stat(sys.map((s) => Number(s.gpu.memUsedMiB))),
    vramFreeMinMiB: sys.length ? Math.min(...allSys.map((s) => Number(s.gpu.memFreeMiB))) : null,
    vramUsedPeakWholeRunMiB: allSys.length ? Math.max(...allSys.map((s) => Number(s.gpu.memUsedMiB))) : null,
    clockEventReasons: [...new Set(sys.map((s) => String(s.gpu.clockEventReasons)))],
    cpuBusyShare: stat(sys.map((s) => Number(s.cpuBusy) * 100)),
    cpuBusyMaxCorePct: stat(sys.map((s) => Number(s.cpuBusyMaxCore) * 100)),
    load1Max: sys.length ? Math.max(...sys.map((s) => Number(s.load1))) : null,
    memAvailableMinMiB: allSys.length ? Math.min(...allSys.map((s) => Number(s.memAvailableMiB))) : null,
    swapUsedMaxMiB: allSys.length ? Math.max(...allSys.map((s) => Number(s.swapUsedMiB))) : null,
    // memory.peak and memory.events are cumulative over the slice's life; per group: the maximum of memory.current
    // sampled during this group's run, and the events counted during it (last − first)
    slice: lastCg
      ? {
          peakMiB: lastCg.peakMiB,
          groupMaxCurrentMiB: Math.max(...allSys.filter((x) => x.cgroup).map((x) => x.cgroup!.currentMiB)),
          events: lastCg.events,
          groupEvents: Object.fromEntries(
            Object.entries(lastCg.events).map(([k, v]) => [k, v - (allSys.find((x) => x.cgroup)?.cgroup!.events[k] ?? 0)])
          )
        }
      : null,
    computeAppsPeak: Object.entries(appsPeak).map(([pid, e]) => ({
      pid: Number(pid),
      name: e.name,
      job: serverPids.get(Number(pid)) ?? null,
      maxUsedMiB: e.maxUsedMiB
    }))
  }
};

writeJson(path.join(dir, 'summary.json'), summary);
console.log(
  JSON.stringify({
    group: G,
    status: group.exitStatus,
    makespan: summary.makespanSeconds,
    aggMakespan: summary.aggregateEvPerSMakespan,
    window: summary.window && {
      s: summary.window.seconds,
      agg: summary.window.aggregateEvPerS,
      perJob: summary.window.perJobEvPerS,
      overlap: summary.window.serverOverlap
    },
    sm: summary.monitor.kernelActiveSharePct?.mean,
    vramPeak: summary.monitor.vramUsedPeakWholeRunMiB,
    cpu: summary.monitor.cpuBusyShare?.mean
  })
);
