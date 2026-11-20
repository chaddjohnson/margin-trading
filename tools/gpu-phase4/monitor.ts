// gpu-phase4 (PROTOCOL.md §6): the system monitor of one benchmark group (NON-OFFICIAL; observation only, never a
// decision input inside a run). Until <stop file> exists (or SIGTERM), it records every second:
//   - nvidia-smi dmon (-s pucm, 1 s): "sm" = the share of the sample period during which ANY kernel ran (not SM
//     occupancy), "mem" = the share during which device memory was read or written, power, temperatures, clocks, frame
//     buffer; and the GPM columns (SM activity, SM occupancy, DRAM bandwidth) only if the driver reports them (their
//     stream state is left untouched: "-" means not available);
//   - nvidia-smi --query-gpu: memory used/free, clocks, P-state, clock-event reasons (throttling);
//   - /proc/stat (CPU busy share of all 16 logical CPUs, per-CPU maximum), /proc/loadavg, /proc/meminfo (MemAvailable,
//     swap used), and the slice's cgroup memory (memory.current, memory.peak, memory.events);
// and every 5 s nvidia-smi --query-compute-apps (VRAM per process).
//   node --experimental-transform-types tools/gpu-phase4/monitor.ts --out <jsonl> --stop-file <path> [--slice gpup4.slice]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const out = opt('out', '');
const stopFile = opt('stop-file', '');
const slice = opt('slice', 'gpup4.slice');
const cg = `/sys/fs/cgroup/user.slice/user-${process.getuid!()}.slice/user@${process.getuid!()}.service/${slice}`;

if (!out || !stopFile) throw new Error('usage: monitor.ts --out <jsonl> --stop-file <path>');
fs.mkdirSync(path.dirname(out), { recursive: true });

const write = (o: Record<string, unknown>) => fs.appendFileSync(out, `${JSON.stringify(o)}\n`);

// dmon: one line per second; columns from its header
const dmon = spawn('nvidia-smi', ['dmon', '-s', 'pucm', '-d', '1', '--gpm-metrics', '1,2,3,10'], {
  stdio: ['ignore', 'pipe', 'pipe']
});
let header: string[] = [];
let buf = '';

dmon.stdout.on('data', (d: Buffer) => {
  buf += d.toString();
  for (;;) {
    const i = buf.indexOf('\n');

    if (i < 0) break;

    const line = buf.slice(0, i).trim();

    buf = buf.slice(i + 1);
    if (line.startsWith('# gpu')) header = line.slice(1).trim().split(/\s+/);
    else if (line.startsWith('#') || !line) continue;
    else if (header.length) {
      const v = line.split(/\s+/);

      write({
        t: new Date().toISOString(),
        src: 'dmon',
        ...Object.fromEntries(header.map((h, j) => [h, v[j] === '-' ? null : Number(v[j])]))
      });
    }
  }
});

const cpuTimes = () => {
  const lines = fs
    .readFileSync('/proc/stat', 'utf8')
    .split('\n')
    .filter((l) => /^cpu\d* /.test(l));

  return lines.map((l) => {
    const f = l.trim().split(/\s+/).slice(1).map(Number);
    const idle = f[3]! + f[4]!; // idle + iowait

    return { total: f.reduce((a, b) => a + b, 0), idle, iowait: f[4]! };
  });
};
const meminfo = () => {
  const s = fs.readFileSync('/proc/meminfo', 'utf8');
  const kb = (k: string) => Number(new RegExp(`^${k}:\\s+(\\d+) kB`, 'm').exec(s)?.[1] ?? NaN);

  return {
    memAvailableMiB: Math.round(kb('MemAvailable') / 1024),
    swapUsedMiB: Math.round((kb('SwapTotal') - kb('SwapFree')) / 1024)
  };
};
const cgroup = () => {
  try {
    const rd = (f: string) => fs.readFileSync(path.join(cg, f), 'utf8').trim();
    const ev = Object.fromEntries(rd('memory.events').split('\n').map((l) => l.split(' '))) as Record<string, string>;

    return {
      currentMiB: Math.round(Number(rd('memory.current')) / 2 ** 20),
      peakMiB: Math.round(Number(rd('memory.peak')) / 2 ** 20),
      events: { high: Number(ev.high), max: Number(ev.max), oom: Number(ev.oom), oomKill: Number(ev.oom_kill) }
    };
  } catch {
    return null;
  }
};
const smi = (q: string, extra: string[] = []) =>
  execFileSync('nvidia-smi', [`--query-${q}`, '--format=csv,noheader,nounits', ...extra], { timeout: 10000 })
    .toString()
    .trim();

let prev = cpuTimes();
let tick = 0;
let stopping = false;
const finish = () => {
  if (stopping) return;
  stopping = true;
  dmon.kill('SIGTERM');
  write({ t: new Date().toISOString(), src: 'end' });
  setTimeout(() => process.exit(0), 500);
};

process.on('SIGTERM', finish);
process.on('SIGINT', finish);
write({ t: new Date().toISOString(), src: 'start', slice, cgroup: cg });

const timer = setInterval(() => {
  if (stopping) return;
  if (fs.existsSync(stopFile)) {
    clearInterval(timer);
    finish();
    return;
  }
  try {
    const now = cpuTimes();
    const busy = now.map((c, i) => {
      const dt = c.total - prev[i]!.total;

      return dt > 0 ? 1 - (c.idle - prev[i]!.idle) / dt : 0;
    });

    prev = now;

    const [load1] = fs.readFileSync('/proc/loadavg', 'utf8').split(' ');
    const g = smi(
      'gpu=memory.used,memory.free,clocks.sm,clocks.mem,pstate,clocks_event_reasons.active,utilization.gpu,utilization.memory,power.draw,temperature.gpu'
    ).split(', ');
    const rec: Record<string, unknown> = {
      t: new Date().toISOString(),
      src: 'sys',
      cpuBusy: Math.round(busy[0]! * 1000) / 1000, // aggregate "cpu" line: all 16 logical CPUs
      cpuBusyMaxCore: Math.round(Math.max(...busy.slice(1)) * 1000) / 1000,
      load1: Number(load1),
      ...meminfo(),
      cgroup: cgroup(),
      gpu: {
        memUsedMiB: Number(g[0]),
        memFreeMiB: Number(g[1]),
        smClockMHz: Number(g[2]),
        memClockMHz: Number(g[3]),
        pstate: g[4],
        clockEventReasons: g[5],
        utilGpuPct: Number(g[6]),
        utilMemPct: Number(g[7]),
        powerW: Number(g[8]),
        tempC: Number(g[9])
      }
    };

    if (tick % 5 === 0)
      rec.computeApps = smi('compute-apps=pid,process_name,used_memory')
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const [pid, name, mem] = l.split(', ');

          return { pid: Number(pid), name, usedMiB: Number(mem) };
        });
    write(rec);
  } catch (e) {
    write({ t: new Date().toISOString(), src: 'error', error: (e as Error).message.split('\n')[0] });
  }
  tick++;
}, 1000);
