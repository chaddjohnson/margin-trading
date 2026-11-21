// gpu-phase5 (PROTOCOL.md §3): the environment record — hardware, GPU state and clients, display use, services, other
// sessions, profilers available, toolkit, CPU and memory, Git state, the acceptance and binary hashes, the door pins.
// Observation only (nothing is changed: no clock, power, GPM, persistence or MPS setting is touched).
//   node --experimental-transform-types tools/gpu-phase5/env-record.ts --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { serverBinary } from '../../src/gpu-backend/toolchain.ts';

const out = process.argv[process.argv.indexOf('--out') + 1]!;
const sh = (c: string, a: string[]) => {
  try {
    return execFileSync(c, a, { timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
  } catch (e) {
    return `unavailable: ${(e as Error).message.split('\n')[0]}`;
  }
};
const bash = (s: string) => sh('bash', ['-c', s]);
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const q =
  'name,uuid,driver_version,vbios_version,pci.bus_id,memory.total,memory.used,memory.free,temperature.gpu,power.draw,power.limit,power.default_limit,clocks.sm,clocks.mem,clocks.max.sm,clocks.max.mem,pstate,persistence_mode,compute_mode,display_active,display_mode,clocks_event_reasons.active,fan.speed';
const gv = sh('nvidia-smi', [`--query-gpu=${q}`, '--format=csv,noheader']).split(', ');
const acc = JSON.parse(fs.readFileSync('config/gpu-backend/acceptance.json', 'utf8')) as { status: string };
const rec = {
  kind: 'gpu-phase5 environment record',
  t: new Date().toISOString(),
  gpu: Object.fromEntries(q.split(',').map((k, i) => [k, gv[i]])),
  gpuComputeApps: sh('nvidia-smi', ['--query-compute-apps=pid,process_name,used_memory', '--format=csv,noheader']),
  gpuProcesses: sh('nvidia-smi', [])
    .split('\n')
    .filter((l) => /MiB\s*\|$/.test(l) && /\s(C|G|C\+G)\s/.test(l))
    .map((l) => l.replace(/\s+/g, ' ').trim()),
  gpmStreamState: sh('nvidia-smi', ['gpm', '-g']),
  profilers: {
    nsys: bash('command -v nsys || echo absent'),
    ncu: bash('command -v ncu || echo absent'),
    dcgmi: bash('command -v dcgmi || echo absent'),
    mps: `${bash('command -v nvidia-cuda-mps-control || echo absent')} (never started by this study)`,
    gpmViaDmon: 'nvidia-smi dmon --gpm-metrics 1,2,3,10 (reported under load; the stream state is not changed)'
  },
  toolkit: sh('/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit/bin/nvcc', ['--version'])
    .split('\n')
    .slice(-2)
    .join(' '),
  cpu: {
    model: bash("lscpu | sed -n 's/^Model name:[[:space:]]*//p'"),
    logical: Number(sh('nproc', [])),
    coresPerSocket: bash("lscpu | sed -n 's/^Core(s) per socket:[[:space:]]*//p'"),
    threadsPerCore: bash("lscpu | sed -n 's/^Thread(s) per core:[[:space:]]*//p'"),
    maxMHz: bash("lscpu | sed -n 's/^CPU max MHz:[[:space:]]*//p'"),
    governor: bash('cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor')
  },
  memory: sh('free', ['-m']).split('\n'),
  loadavg: bash('cat /proc/loadavg'),
  uptime: sh('uptime', []),
  os: { kernel: sh('uname', ['-r']), release: bash('grep PRETTY_NAME /etc/os-release') },
  node: process.version,
  services: {
    llm: bash("ps -eo args | grep -iE '[v]llm|[o]llama|[l]lama-server|[t]ritonserver|[l]mstudio' || echo none"),
    containers: `${bash('docker ps -q 2>/dev/null | wc -l')} running`,
    listeners: bash("ss -ltn | awk 'NR>1{print $4}' | sort -u").split('\n'),
    display:
      'GNOME on the RTX 5090 (gnome-shell, Xwayland) with gnome-remote-desktop (RDP 3389/3390), a CUDA client of the GPU'
  },
  otherSessions: {
    claudeProcesses: bash('pgrep -c -x claude || true'),
    gpuJobUnits: bash(
      "systemctl --user list-units --type=service --state=active --plain --no-legend | awk '{print $1}' | grep -E '^gpup' || echo none"
    ),
    nodeProcesses: bash("ps -eo pid,etimes,args | grep '[n]ode ' | grep -v claude | head -5 || true")
  },
  git: {
    branch: sh('git', ['branch', '--show-current']),
    head: sh('git', ['rev-parse', 'HEAD']),
    status: sh('git', ['status', '--short']).split('\n').filter(Boolean),
    worktrees: sh('git', ['worktree', 'list'])
  },
  acceptance: {
    file: 'config/gpu-backend/acceptance.json',
    sha256: sha('config/gpu-backend/acceptance.json'),
    status: acc.status,
    outOfBand: 'b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214'
  },
  binary: { path: path.relative(process.cwd(), serverBinary), sha256: sha(serverBinary) },
  compatDigest: compatManifest().digest,
  doors: {
    ...Object.fromEntries(
      (['D19', 'D21', 'D23', 'D24'] as const).map((d) => [
        d,
        { GDX: doorSpecs[d].pins.GDX, VGT: doorSpecs[d].pins.VGT }
      ])
    ),
    FULL: 'the full canonical files (each opening verified by its own guard; the data sha256 are in the door log and the dataset sidecars)'
  },
  hostPath: { defaultHostWorkers: 8, defaultBatch: 8192, lingerMs: 30 },
  thermal: {
    gpuTempC: sh('nvidia-smi', ['--query-gpu=temperature.gpu', '--format=csv,noheader']),
    cpuSensors: bash(
      'command -v sensors >/dev/null && sensors 2>/dev/null | grep -E "Tctl|Tccd" || echo "lm-sensors not installed"'
    )
  },
  disk: sh('df', ['-h', '/home']).split('\n')[1]
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(rec, null, 1)}\n`);
console.log(
  JSON.stringify({
    gpu: [rec.gpu.name, rec.gpu['memory.used'], rec.gpu['memory.free'], rec.gpu.pstate, rec.gpu['power.limit']],
    acc: rec.acceptance.sha256.slice(0, 16),
    bin: rec.binary.sha256.slice(0, 16),
    compat: rec.compatDigest.slice(0, 16),
    llm: rec.services.llm,
    units: rec.otherSessions.gpuJobUnits,
    claude: rec.otherSessions.claudeProcesses
  })
);
