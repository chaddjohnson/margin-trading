// gpu-phase4 (PROTOCOL.md §7, §13): the machine-readable benchmark summaries across every group — results/bench/
// SUMMARY.json, groups.csv (one row per group) and jobs.csv (one row per job) — from the groups' own summary, verify and
// gate records (nothing recomputed from memory). Speed-ups are relative to the k = 1 group of the same workload, design,
// batch and host workers named in `ref`, and to the default (k = 1, 8 workers, 8,192).
//   node --experimental-transform-types tools/gpu-phase4/tables.ts
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';

const B = path.join(resultsDir, 'bench');
const read = (g: string, f: string) => {
  const p = path.join(B, g, f);

  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, any>) : null; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const groups = fs
  .readdirSync(B)
  .filter((g) => !g.startsWith('smoke-') && fs.existsSync(path.join(B, g, 'summary.json')))
  .sort();
const r1 = (x: number | null | undefined) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10) / 10);
const rows = groups.map((g) => {
  const s = read(g, 'summary.json')!;
  const v = read(g, 'verify.json');
  const gt = read(g, 'gate.json');
  const c = s.config;
  const jobs = s.jobs as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  const perJob = s.window?.perJobEvPerS as number[] | undefined;
  const elu = jobs.map((j) => j.window?.mainThreadEluMean ?? j.mainThread?.eventLoopUtilization).filter((x) => x != null);

  return {
    group: g,
    tool: c.tool,
    design: c.tool === 'poolbench' ? 'pool' : c.mode,
    workload: c.job,
    k: c.jobs,
    hostWorkersPerJob: c.hostWorkersPerJob,
    totalHostWorkers: c.jobs * c.hostWorkersPerJob,
    batch: c.batch,
    stopAfter: c.stopAfter,
    vramBudgetMbPerJob: c.vramBudgetMbPerJob,
    exitStatus: (s.exitStatus as number[]).join(' '),
    identical: v?.identical ?? false,
    gatePass: gt?.pass ?? false,
    makespanSeconds: s.makespanSeconds,
    freshTotal: s.freshTotal,
    aggregateEvPerSMakespan: s.aggregateEvPerSMakespan,
    windowSeconds: s.window?.seconds ?? null,
    windowAggregateEvPerS: s.window?.aggregateEvPerS ?? null,
    perJobEvPerSMean: perJob ? r1(perJob.reduce((a, b) => a + b, 0) / perJob.length) : null,
    perJobEvPerSMin: perJob ? Math.min(...perJob) : null,
    perJobEvPerSMax: perJob ? Math.max(...perJob) : null,
    perJobCv: s.window?.perJobCv ?? null,
    serverOverlap: s.window?.serverOverlap ?? null,
    jobWallSecondsMax: Math.max(...jobs.map((j) => j.wallSeconds)),
    kernelActivePctMean: s.monitor.kernelActiveSharePct?.mean ?? null,
    memoryBusyPctMean: s.monitor.memoryBusySharePct?.mean ?? null,
    gpmSmActivityPctMean: s.monitor.gpm?.smActivityPct?.mean ?? null,
    gpmSmOccupancyPctMean: s.monitor.gpm?.smOccupancyPct?.mean ?? null,
    gpmDramPctMean: s.monitor.gpm?.dramBandwidthPct?.mean ?? null,
    powerWMean: s.monitor.powerW?.mean ?? null,
    powerWMax: s.monitor.powerW?.max ?? null,
    gpuTempCMax: s.monitor.gpuTempC?.max ?? null,
    smClockMHzMean: s.monitor.smClockMHz?.mean ?? null,
    smClockMHzMin: s.monitor.smClockMHz?.min ?? null,
    throttleReasons: (s.monitor.clockEventReasons as string[]).join(' '),
    vramUsedPeakMiB: s.monitor.vramUsedPeakWholeRunMiB,
    vramFreeMinMiB: s.monitor.vramFreeMinMiB,
    vramPerServerPeakMiB: Math.max(
      0,
      ...(s.monitor.computeAppsPeak as { name: string; maxUsedMiB: number }[])
        .filter((a) => /gb[34]$/.test(a.name))
        .map((a) => a.maxUsedMiB)
    ),
    cpuBusyPctMean: s.monitor.cpuBusyShare?.mean ?? null,
    cpuBusyPctP95: s.monitor.cpuBusyShare?.p95 ?? null,
    busiestCorePctMean: s.monitor.cpuBusyMaxCorePct?.mean ?? null,
    load1Max: s.monitor.load1Max,
    memAvailableMinMiB: s.monitor.memAvailableMinMiB,
    slicePeakMiB: s.monitor.slice?.peakMiB ?? null,
    sliceEvents: s.monitor.slice ? JSON.stringify(s.monitor.slice.events) : null,
    jobMainThreadEluMean: elu.length ? Math.round((elu.reduce((a: number, b: number) => a + b, 0) / elu.length) * 1000) / 1000 : null,
    jobPeakHostMiBMax: Math.max(
      0,
      ...jobs.map((j) => (j.process?.status?.vmHwmMiB ?? j.peakRssMiB ?? 0) + (j.serverProcess?.vmHwmMiB ?? 0))
    ),
    startSpreadSeconds: s.startSpreadSeconds
  };
});
const jobs = groups.flatMap((g) => {
  const s = read(g, 'summary.json')!;

  return (s.jobs as Record<string, any>[]).map((j) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    group: g,
    run: j.run,
    status: j.status,
    wallSeconds: j.wallSeconds,
    fresh: j.fresh,
    evPerS: j.evPerS,
    windowEvPerS: j.window?.evPerS ?? null,
    windowBatches: j.window?.batches ?? null,
    windowMedianBatch: j.window?.medianBatch ?? null,
    serverMsPerBatchMean: j.window?.serverMsPerBatchMean ?? j.whole?.serverMsPerBatchMean ?? null,
    serverMsPerKCandidates: j.window?.serverMsPerKCandidates ?? null,
    batchWallMsMean: j.window?.batchWallMsMean ?? null,
    deviceIdleShare: j.window?.deviceIdleShare ?? null,
    noBatchInFlightShare: j.window?.noBatchInFlightShare ?? null,
    queuedMean: j.window?.queuedMean ?? null,
    mainThreadElu: j.window?.mainThreadEluMean ?? j.mainThread?.eventLoopUtilization ?? null,
    processCpuCoresMean: j.window?.processCpuCoresMean ?? null,
    processCpuSeconds: j.processCpuSeconds ? r1(j.processCpuSeconds.user + j.processCpuSeconds.system) : null,
    jobVmHwmMiB: j.process?.status?.vmHwmMiB ?? j.peakRssMiB ?? null,
    serverVmHwmMiB: j.serverProcess?.vmHwmMiB ?? null,
    serverCpuSeconds: j.serverProcess?.cpuSeconds ? r1(j.serverProcess.cpuSeconds.user + j.serverProcess.cpuSeconds.system) : null,
    archiveWriteSeconds: j.archive?.writeSeconds ?? null,
    ioWriteMiB:
      j.process?.io?.end && j.process?.io?.start
        ? Math.round((j.process.io.end.writeBytes - j.process.io.start.writeBytes) / 2 ** 20)
        : null,
    wholeBatches: j.whole?.batches ?? null,
    wholeServerSeconds: j.whole?.serverSeconds ?? null,
    wholeEncodeSeconds: j.whole?.encodeSeconds ?? null,
    wholeDecodeSeconds: j.whole?.decodeSeconds ?? null
  }));
});
const csv = (xs: Record<string, unknown>[]) => {
  const keys = Object.keys(xs[0] ?? {});
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);

    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  return `${keys.join(',')}\n${xs.map((x) => keys.map((k) => cell(x[k])).join(',')).join('\n')}\n`;
};

fs.writeFileSync(path.join(B, 'groups.csv'), csv(rows));
fs.writeFileSync(path.join(B, 'jobs.csv'), csv(jobs));
writeJson(path.join(B, 'SUMMARY.json'), {
  kind: 'gpu-phase4 benchmark summary (every group)',
  t: new Date().toISOString(),
  groups: rows,
  decisions: Object.fromEntries(
    fs
      .readdirSync(path.join(resultsDir, 'decisions'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f, JSON.parse(fs.readFileSync(path.join(resultsDir, 'decisions', f), 'utf8'))])
  )
});
console.log(`${rows.length} groups, ${jobs.length} jobs; all identical ${rows.every((r) => r.identical)}`);
