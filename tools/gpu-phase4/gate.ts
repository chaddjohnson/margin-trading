// gpu-phase4 (PROTOCOL.md §3, §9): the stop rule between benchmark groups. Exit 0 only if the group ran as planned
// (every job's status 0, or 75 for a stop-after prefix), its verification is identical, and its safety margins held: no
// OOM or cgroup `max` event in the slice, minimum free VRAM ≥ 3,072 MiB, minimum MemAvailable ≥ 8 GiB. Also prints the
// per-job resource needs measured at this group (VRAM per server process, host memory per job incl. its server) for the
// admission of later groups (×1.15, PROTOCOL.md §3).
//   node --experimental-transform-types tools/gpu-phase4/gate.ts --group <G>
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';

const G = process.argv[process.argv.indexOf('--group') + 1]!;
const dir = path.join(resultsDir, 'bench', G);
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const group = read('group.json') as { exitStatus: (number | null)[]; stopAfter: number | null; tool?: string };
const verify = fs.existsSync(path.join(dir, 'verify.json')) ? read('verify.json') : null;
const s = read('summary.json') as {
  monitor: {
    vramFreeMinMiB: number | null;
    memAvailableMinMiB: number | null;
    slice: { peakMiB: number; events: Record<string, number> } | null;
    computeAppsPeak: { job: string | null; maxUsedMiB: number }[];
    clockEventReasons: string[];
  };
  jobs: {
    run: string;
    process: { status: { vmHwmMiB: number } | null } | null;
    serverProcess: { vmHwmMiB: number } | null;
  }[];
};
const reasons: string[] = [];
const okStatus = (x: number | null) => x === 0 || (group.stopAfter !== null && x === 75);

if (!group.exitStatus.every(okStatus)) reasons.push(`job exit statuses ${JSON.stringify(group.exitStatus)}`);
if (!verify) reasons.push('no verification record');
else if (!verify.identical) reasons.push('verification NOT identical');

const ev = s.monitor.slice?.events ?? {};

if ((ev.oom ?? 0) > 0 || (ev.oomKill ?? 0) > 0 || (ev.max ?? 0) > 0)
  reasons.push(`slice memory events ${JSON.stringify(ev)}`);
if (s.monitor.vramFreeMinMiB !== null && s.monitor.vramFreeMinMiB < 3072)
  reasons.push(`minimum free VRAM ${s.monitor.vramFreeMinMiB} MiB < 3,072`);
if (s.monitor.memAvailableMinMiB !== null && s.monitor.memAvailableMinMiB < 8192)
  reasons.push(`minimum MemAvailable ${s.monitor.memAvailableMinMiB} MiB < 8,192`);

const vramPerJob = Math.max(0, ...s.monitor.computeAppsPeak.filter((a) => a.job).map((a) => a.maxUsedMiB));
const rssPerJob = Math.max(
  0,
  ...s.jobs.map((j) => (j.process?.status?.vmHwmMiB ?? 0) + (j.serverProcess?.vmHwmMiB ?? 0))
);
const rec = {
  kind: 'gpu-phase4 group gate',
  t: new Date().toISOString(),
  group: G,
  pass: reasons.length === 0,
  reasons,
  measuredPerJob: { vramMiB: vramPerJob, hostMiB: rssPerJob },
  admissionNext: {
    vramMiB: Math.ceil((vramPerJob * 1.15) / 256) * 256,
    rssMiB: Math.ceil((rssPerJob * 1.15) / 256) * 256
  },
  throttle: s.monitor.clockEventReasons
};

writeJson(path.join(dir, 'gate.json'), rec);
console.log(JSON.stringify(rec));
process.exitCode = rec.pass ? 0 : 2;
