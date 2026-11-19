// gpu-phase2 G8 closure (AMENDMENTS.md A1): derives the final statistics of the stress run from the files the run
// wrote (summary.json, rounds.jsonl, telemetry.jsonl — read only, never rewritten) plus the stop record of
// chains/stress-stop.sh, and writes results/stress/closure.json: elapsed time to the last saved round, counts, GPU
// errors, VRAM, host-memory stability (hourly figures and a least-squares slope), throughput stability per (door, mix)
// (coefficient of variation and first-third versus last-third drift), thermals, telemetry coverage, limitations.
//   node --experimental-transform-types tools/gpu-phase2/stress-close.ts [--dir research/gpu-phase2/results/stress]
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../src/gpu-phase2/context.ts';

const args = process.argv.slice(2);
const dir = args.includes('--dir') ? args[args.indexOf('--dir') + 1]! : 'research/gpu-phase2/results/stress';
const jsonl = <T>(f: string) => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as T);
const S = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
const stop = fs.existsSync(path.join(dir, 'stop.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'stop.json'), 'utf8')) : null;
type Round = { t: string; round: number; door: string; mix: string; tasks: number; seconds: number; evPerS: number };
type Tel = { t: string; util: number; vramMiB: number; powerW: number; tempC: number; smClockMHz: number; throttle: string; hostRssMiB: number; failed?: number; cpuScored?: number; capacityRetries?: number };
const rounds = jsonl<Round>('rounds.jsonl');
const tel = jsonl<Tel>('telemetry.jsonl');
const t0 = Date.parse(S.started);
const h = (iso: string) => (Date.parse(iso) - t0) / 3_600_000;
const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN);
const sd = (x: number[]) => {
  const m = mean(x);

  return Math.sqrt(mean(x.map((v) => (v - m) ** 2)));
};
const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const slope = (pts: [number, number][]) => {
  const mx = mean(pts.map((p) => p[0]));
  const my = mean(pts.map((p) => p[1]));
  const num = pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
  const den = pts.reduce((a, [x]) => a + (x - mx) ** 2, 0);

  return den ? num / den : 0;
};
const lastRound = rounds.at(-1)!;
const elapsedHours = h(lastRound.t);
const hours = Math.ceil(elapsedHours);

// host memory and VRAM by hour, and their trend
const byHour = Array.from({ length: hours }, (_v, i) => {
  const rows = tel.filter((r) => h(r.t) >= i && h(r.t) < i + 1);

  return {
    hour: i + 1,
    samples: rows.length,
    hostRssMeanMiB: Math.round(mean(rows.map((r) => r.hostRssMiB))),
    hostRssMaxMiB: Math.max(...rows.map((r) => r.hostRssMiB)),
    vramMaxMiB: Math.max(...rows.map((r) => r.vramMiB)),
    tempMaxC: Math.max(...rows.map((r) => r.tempC)),
    powerMeanW: r1(mean(rows.map((r) => r.powerW))),
    evaluations: rounds.filter((r) => h(r.t) >= i && h(r.t) < i + 1).reduce((a, r) => a + r.tasks, 0)
  };
});
// the trend after the first hour (warm-up: doors and caches load in the first rotation)
const warm = tel.filter((r) => h(r.t) >= 1);
const rssSlope = slope(warm.map((r) => [h(r.t), r.hostRssMiB]));
const vramSlope = slope(warm.map((r) => [h(r.t), r.vramMiB]));

// throughput stability per (door, mix)
const groups = new Map<string, Round[]>();

for (const r of rounds) groups.set(`${r.door} ${r.mix}`, [...(groups.get(`${r.door} ${r.mix}`) ?? []), r]);
const throughput = [...groups.entries()]
  .sort()
  .map(([k, rs]) => {
    const v = rs.map((r) => r.evPerS);
    const third = Math.max(1, Math.floor(v.length / 3));
    const first = mean(v.slice(0, third));
    const last = mean(v.slice(-third));

    return { group: k, rounds: rs.length, meanEvPerS: Math.round(mean(v)), minEvPerS: Math.min(...v), maxEvPerS: Math.max(...v), cv: r3(sd(v) / mean(v)), firstThirdMean: Math.round(first), lastThirdMean: Math.round(last), driftPct: r1(((last - first) / first) * 100) };
  });
const gaps = tel.slice(1).map((r, i) => (Date.parse(r.t) - Date.parse(tel[i]!.t)) / 1000);
const evalFromRounds = rounds.reduce((a, r) => a + r.tasks, 0);
const rec = {
  kind: 'gpu-phase2 G8 stress closure (AMENDMENTS.md A1: 8 h from the original start)',
  t: new Date().toISOString(),
  directive: 'the user: reduce the running 24-hour test to 8 hours total elapsed time from its original start; no restart; keep completed results',
  started: S.started,
  originalPlannedHours: S.plannedHours,
  amendedHours: 8,
  deadline: new Date(t0 + 8 * 3_600_000).toISOString(),
  stop,
  lastSavedRound: { round: lastRound.round, at: lastRound.t, door: lastRound.door, mix: lastRound.mix },
  elapsedHoursToLastSavedRound: r3(elapsedHours),
  binary: S.binary,
  counts: {
    rounds: S.rounds,
    evaluations: S.evaluations,
    evaluationsFromRoundLog: evalFromRounds,
    consistent: evalFromRounds === S.evaluations && rounds.length === S.rounds,
    parity: S.parity,
    repeat: S.repeat,
    cpuScored: S.cpuScored,
    byDoor: S.byDoor
  },
  gpuErrors: { failures: S.failures.length, restarts: S.restarts, failuresList: S.failures, telemetryFailedMax: Math.max(...tel.map((r) => r.failed ?? 0)), capacityRetriesSeen: Math.max(...tel.map((r) => r.capacityRetries ?? 0)) },
  vram: { peakMiB: Math.max(...tel.map((r) => r.vramMiB), S.peaks.vramMiB), summaryPeakMiB: S.peaks.vramMiB, slopeMiBPerHourAfterHour1: r1(vramSlope) },
  hostMemory: { peakMiB: Math.max(...tel.map((r) => r.hostRssMiB), S.peaks.hostRssMiB), slopeMiBPerHourAfterHour1: r1(rssSlope), firstHourMeanMiB: byHour[0]?.hostRssMeanMiB, lastHourMeanMiB: byHour.at(-1)?.hostRssMeanMiB },
  thermals: { tempMaxC: Math.max(...tel.map((r) => r.tempC)), powerMaxW: Math.max(...tel.map((r) => r.powerW)), powerMeanW: r1(mean(tel.map((r) => r.powerW))), smClockMinMHz: Math.min(...tel.map((r) => r.smClockMHz)), smClockMeanMHz: Math.round(mean(tel.map((r) => r.smClockMHz))), throttleReasonsSeen: [...new Set(tel.map((r) => r.throttle))] },
  telemetry: { samples: tel.length, intervalS: 30, maxGapS: Math.max(...gaps), meanGapS: r1(mean(gaps)) },
  overallEvPerS: Math.round(evalFromRounds / (elapsedHours * 3600)),
  byHour,
  throughput,
  limitations: [
    '8 h instead of the protocol\'s 24 h (user directive, AMENDMENTS A1): one third of the planned rounds, thermal cycles and repeatability checks; slow drifts below the measured slopes over 8 h, and faults rarer than about once per 8 h, are not excluded',
    'the run ended by SIGTERM at a round boundary: the tool\'s own closing (final telemetry sample, finished stamp) did not run; the 48 CPU parity samples of the final round and the round started after the boundary are not recorded',
    'host memory is the Node process RSS (the CPU reference workers and the GPU server process are not sampled); VRAM is the whole device'
  ]
};
const pass = S.pass && S.failures.length === 0 && S.restarts === 0 && S.cpuScored === 0 && S.parity.samples > 0 && S.parity.mismatches === 0 && S.repeat.checks > 0 && S.repeat.mismatches === 0 && elapsedHours >= 8 && rec.counts.consistent;

writeJson(path.join(dir, 'closure.json'), { ...rec, pass });
console.log(JSON.stringify({ pass, elapsedHours: rec.elapsedHoursToLastSavedRound, rounds: S.rounds, evaluations: S.evaluations, parity: S.parity, repeat: { checks: S.repeat.checks, mismatches: S.repeat.mismatches }, gpuErrors: rec.gpuErrors.failures, vramPeakMiB: rec.vram.peakMiB, rssSlope: rec.hostMemory.slopeMiBPerHourAfterHour1 }));
process.exitCode = pass ? 0 : 2;
