// gpu-phase4 (PROTOCOL.md §3): the safety admission check before every benchmark group (NON-OFFICIAL). A group of k
// jobs starts only if ALL hold, measured now (never assumed):
//   - no GPU compute process other than the desktop's (the allowed names below) and no gpup4 job unit still running;
//   - free VRAM ≥ k × (the per-job VRAM need) + the reserve (default 3,072 MiB for the compositor, driver and others);
//   - MemAvailable ≥ k × (the per-job host-memory need) + 8 GiB, and no swap in use by the slice;
//   - GPU temperature ≤ 50 °C (waits up to 180 s) and the 1-minute load average ≤ 2.0 (waits up to 120 s).
// It prints one JSON line and exits 0 (admitted) or 3 (refused: the group is not started; report the limitation).
//   node --experimental-transform-types tools/gpu-phase4/admit.ts --jobs k --vram-mib V --rss-mib R --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const k = Number(opt('jobs', '1'));
const vram = Number(opt('vram-mib', '7000'));
const rss = Number(opt('rss-mib', '7168'));
const reserve = Number(opt('reserve-mib', '3072'));
const out = opt('out', '');
const allowed = new Set(['/usr/libexec/gnome-remote-desktop-daemon']);
const smi = (q: string) =>
  execFileSync('nvidia-smi', [`--query-${q}`, '--format=csv,noheader,nounits'], { timeout: 10000 })
    .toString()
    .trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const memAvailable = () =>
  Math.round(Number(/^MemAvailable:\s+(\d+) kB/m.exec(fs.readFileSync('/proc/meminfo', 'utf8'))![1]) / 1024);

const waits: string[] = [];
let temp = Number(smi('gpu=temperature.gpu'));

for (let i = 0; temp > 50 && i < 18; i++) {
  waits.push(`GPU ${temp} °C > 50 °C: waiting 10 s`);
  await sleep(10000);
  temp = Number(smi('gpu=temperature.gpu'));
}

let load1 = Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]);

for (let i = 0; load1 > 2 && i < 12; i++) {
  waits.push(`load ${load1} > 2.0: waiting 10 s`);
  await sleep(10000);
  load1 = Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]);
}

const apps = smi('compute-apps=pid,process_name,used_memory')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [pid, name, mem] = l.split(', ');

    return { pid: Number(pid), name: name!, usedMiB: Number(mem) };
  });
const foreign = apps.filter((a) => !allowed.has(a.name));
let units: string[] = [];

try {
  units = execFileSync('systemctl', ['--user', 'list-units', '--plain', '--no-legend', '--state=active', 'gpup4-*'])
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split(/\s+/)[0]!)
    .filter((u) => !u.startsWith('gpup4-mon-') && u !== process.env.GPUP4_SELF_UNIT);
} catch {
  units = [];
}

const [memUsed, memFree] = smi('gpu=memory.used,memory.free').split(', ').map(Number) as [number, number];
const avail = memAvailable();
const needVram = k * vram + reserve;
const needRss = k * rss + 8192;
const reasons: string[] = [];

if (foreign.length)
  reasons.push(`foreign GPU compute process(es): ${foreign.map((a) => `${a.pid} ${a.name}`).join(', ')}`);
if (units.length) reasons.push(`gpup4 unit(s) still running: ${units.join(', ')}`);
if (memFree < needVram) reasons.push(`free VRAM ${memFree} MiB < ${k} × ${vram} + ${reserve} = ${needVram} MiB`);
if (avail < needRss) reasons.push(`MemAvailable ${avail} MiB < ${k} × ${rss} + 8192 = ${needRss} MiB`);
if (temp > 50) reasons.push(`GPU temperature ${temp} °C > 50 °C after waiting`);
if (load1 > 2) reasons.push(`load average ${load1} > 2.0 after waiting`);

const rec = {
  kind: 'gpu-phase4 admission',
  t: new Date().toISOString(),
  jobs: k,
  perJob: { vramMiB: vram, rssMiB: rss },
  reserveMiB: reserve,
  gpu: { memUsedMiB: memUsed, memFreeMiB: memFree, temperatureC: temp, computeApps: apps },
  host: { memAvailableMiB: avail, load1 },
  need: { vramMiB: needVram, memAvailableMiB: needRss },
  waits,
  admitted: reasons.length === 0,
  reasons
};

if (out) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(rec, null, 1)}\n`);
}
console.log(JSON.stringify({ admitted: rec.admitted, reasons, memFree, avail, temp, load1 }));
process.exit(rec.admitted ? 0 : 3);
