// gpu-phase4 (PROTOCOL.md §4: W-R and W-K): production-pool throughput on a FIXED seeded task set — NON-OFFICIAL
// (purpose benchmark). The accepted GpuPool (host pipeline, batching, pipelining, receipts) evaluates the same tasks in
// every round with the whole round queued at once (backpressure: the device is never waiting for an optimizer), so a
// round measures what the GPU path can deliver for that door, mix and batch size. Used for
//   W-R  the large-door detailed-risk stress case: FULL, the detail + risk mix (detailed record and risk-envelope inputs);
//   W-K  the kernel batch-size curve and the shared-queue question: D19, the joint mix, batch 2,048 … 32,768, and two
//        processes at 8,192 (time-sliced) against one process at 16,384 (one merged launch).
// Correctness: every round's canonical record hashes equal round 1's (repeatability); every job's hash map is written for
// the cross-job comparison (tools/gpu-phase4/verify-pool.ts: identical across concurrency levels and batch sizes); and a
// sample of the tasks is evaluated afterwards by the CANONICAL CPU engine in this process (the reference function of the
// accepted Phase 3 harness, src/gpu-phase3/cpuRefWorker.ts reference(), on this study's own door) — zero tolerance.
// The seeded genomes come from the accepted harness's generator (src/gpu-phase3/subjects.ts randomSubjects) under this
// study's own labels; they are benchmark inputs, never selected or ranked.
//   node --expose-gc --experimental-transform-types tools/gpu-phase4/poolbench.ts --run <name> --door FULL|D19|…
//     --mix detail+risk|joint --tasks 16384 --rounds 4 --batch 8192 --host-workers 8 [--parity-n 24]
//     [--barrier <dir> --group <k>] [--vram-budget-mb N] [--tag <label>]
//   isolation tests only (PROTOCOL.md §9.3, B9; never in a benchmark): --inject exit|throw|hang --inject-round r (a
//   host-worker fault through the pipeline's test hook), --kill-server-round r [--kill-after-ms 1500] (this job's own GPU
//   server SIGKILLed during round r). The job must then fail closed: profile.json records the failure, exit 3.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { type DoorKey, cacheDir, openDoor, resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';
import { randomSubjects } from '../../src/gpu-phase3/subjects.ts';
import { reference } from '../../src/gpu-phase3/cpuRefWorker.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type Task } from '../../src/gpu-backend/client.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const purpose = process.env.GPU_POLICY_PURPOSE ?? '';

if (!['benchmark', 'parity-test', 'diagnostic'].includes(purpose))
  throw new Error(`gpu-phase4 poolbench: declare a non-official purpose (GPU_POLICY_PURPOSE=benchmark), got "${purpose}"`);

const run = opt('run', '');

if (!/^[A-Za-z0-9_.-]+$/.test(run)) throw new Error('--run <name> is required');

const doorKey = opt('door', 'FULL') as DoorKey;
const mixName = opt('mix', 'detail+risk');
const nTasks = Number(opt('tasks', '16384'));
const rounds = Number(opt('rounds', '4'));
const batchSize = Number(opt('batch', '8192'));
const hostWorkers = Number(opt('host-workers', '8'));
const parityN = Number(opt('parity-n', '24'));
const tag = opt('tag', '');
const vramBudgetMb = args.includes('--vram-budget-mb') ? Number(opt('vram-budget-mb', '0')) : undefined;
const inject = args.includes('--inject') ? (opt('inject', 'exit') as 'exit' | 'throw' | 'hang') : null;
const injectRound = Number(opt('inject-round', '2'));
const killRound = args.includes('--kill-server-round') ? Number(opt('kill-server-round', '2')) : null;
const killAfterMs = Number(opt('kill-after-ms', '1500'));
const mixes: Record<string, { options: EvalOptions; detail: boolean; risk?: boolean }> = {
  joint: { options: vOptions, detail: false },
  'detail+risk': { options: vOptions, detail: true, risk: true }
};
const mix = mixes[mixName];

if (!mix) throw new Error(`--mix ${mixName}: joint | detail+risk`);

const outDir = path.join(resultsDir, 'pool', run);
const nsDir = path.join(cacheDir, 'pool', run);
const rawDir = path.join(resultsDir, 'raw-large', 'pool', run);
const log = (s: string) => console.log(`[poolbench ${run} ${new Date().toISOString().slice(11, 19)}Z] ${s}`);

// isolation: one live process per namespace; a namespace is never reused
if (fs.existsSync(path.join(outDir, 'profile.json'))) throw new Error(`namespace ${run} already holds a run`);
fs.mkdirSync(nsDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
const lockFile = path.join(nsDir, '.lock');

fs.writeFileSync(lockFile, `${process.pid}\n`, { flag: 'wx' });
process.on('exit', () => fs.rmSync(lockFile, { force: true }));

const label = `P4-${mixName}-${doorKey}`;
const subjects = randomSubjects(nTasks, label);
const tasksOf = (r: number): Task[] =>
  subjects.map((s) => ({
    k: `${r}|${s.key}`,
    quad: s.quad,
    controls: s.controls,
    options: mix.options,
    detail: mix.detail,
    risk: mix.risk
  }));
const keepOpen = (s: GpuServer): GpuServer =>
  new Proxy(s, {
    get: (t, k) => {
      if (k === 'close') return async () => {};
      const v = Reflect.get(t, k, t);

      return typeof v === 'function' ? v.bind(t) : v;
    }
  });
const status = (pid: number | 'self') => {
  try {
    const s = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const kb = (k: string) => Number(new RegExp(`^${k}:\\s+(\\d+) kB`, 'm').exec(s)?.[1] ?? NaN);

    return { vmRssMiB: Math.round(kb('VmRSS') / 1024), vmHwmMiB: Math.round(kb('VmHWM') / 1024) };
  } catch {
    return null;
  }
};

const tStart = new Date().toISOString();
const door = await openDoor(doorKey, `gpu-phase4 poolbench ${run} (non-official ${purpose})`);
const ds = exportDataset(door, path.join(nsDir, 'dataset'));
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib, ...(vramBudgetMb ? { vramBudgetMb } : {}) });
const info = await server.info();

if (!(await server.smoke()).ok) throw new Error('smoke failed');
await server.load(ds.file);

const pipe =
  hostWorkers > 0
    ? await HostPipeline.start({ door, workers: hostWorkers, ...(inject ? { allowFaultInjection: true } : {}) })
    : null;
const tReady = new Date().toISOString();
let barrierWaitMs = 0;

if (args.includes('--barrier')) {
  const dir = opt('barrier', '');
  const group = Number(opt('group', '1'));
  const tb = Date.now();

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${run}.ready`), `${process.pid} ${tReady}\n`);
  for (;;) {
    const n = fs.readdirSync(dir).filter((f) => f.endsWith('.ready')).length;

    if (n >= group) break;
    if (Date.now() - tb > 600000) throw new Error(`barrier ${dir}: ${n} of ${group} jobs ready after 600 s`);
    await new Promise((r) => setTimeout(r, 20));
  }
  barrierWaitMs = Date.now() - tb;
}

const tGo = new Date().toISOString();
const roundRows: Record<string, unknown>[] = [];
let first: Map<string, string> | null = null;
let repeatMismatches = 0;
let cpuScored = 0;
let peakRss = 0;
const rssTimer = setInterval(() => (peakRss = Math.max(peakRss, process.memoryUsage().rss)), 1000);

rssTimer.unref();
let failure: { round: number; error: string; released: number; cpuScored: number; counters: unknown } | null = null;

for (let r = 1; r <= rounds && !failure; r++) {
  const tasks = tasksOf(r);
  const ledger = path.join(outDir, `receipts-r${r}.jsonl`);
  const hashes = new Map<string, string>();
  const pool = new GpuPool({
    door,
    session: null,
    server: keepOpen(server),
    uuid: info.uuid,
    ledgerFile: ledger,
    batchSize,
    lingerMs: 25,
    ...(pipe ? { pipeline: pipe } : {})
  });
  const t0 = performance.now();

  if (inject && r === injectRound) pipe!.injectNextDecodeFault(inject);
  const killer =
    killRound === r ? setTimeout(() => server.pid && process.kill(server.pid, 'SIGKILL'), killAfterMs) : null;

  try {
    await pool.run(tasks, (t, v) => hashes.set(t.k.slice(t.k.indexOf('|') + 1), canonHash(v)));
  } catch (e) {
    if (killer) clearTimeout(killer);
    failure = {
      round: r,
      error: (e as Error).message.split('\n')[0]!.slice(0, 400),
      released: hashes.size,
      cpuScored: pool.counters.cpuScored,
      counters: { ...pool.counters }
    };
    await pool.close().catch(() => undefined);
    log(`round ${r} FAILED CLOSED: ${failure.error}`);
    break;
  }
  if (killer) clearTimeout(killer);
  const secs = (performance.now() - t0) / 1000;

  cpuScored += pool.counters.cpuScored;
  await pool.close();

  const led = fs
    .readFileSync(ledger, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as Record<string, number>)
    .filter((x) => 'nonce' in x);

  if (!first) first = hashes;
  else for (const [k, h] of first) if (hashes.get(k) !== h) repeatMismatches++;
  roundRows.push({
    round: r,
    t: new Date().toISOString(),
    tasks: tasks.length,
    seconds: Math.round(secs * 1000) / 1000,
    evPerS: Math.round(tasks.length / secs),
    batches: led.length,
    batchSizes: led.map((x) => x.n),
    serverSeconds: Math.round(led.reduce((a, x) => a + x.serverMs!, 0)) / 1000,
    serverMsPerBatch: led.map((x) => x.serverMs),
    encodeSeconds: Math.round(led.reduce((a, x) => a + x.encodeMs!, 0)) / 1000,
    decodeSeconds: Math.round(led.reduce((a, x) => a + x.decodeMs!, 0)) / 1000
  });
  log(`round ${r}: ${tasks.length} in ${secs.toFixed(2)} s (${Math.round(tasks.length / secs)}/s), ${led.length} batches`);
}
const tEnd = new Date().toISOString();

if (failure) {
  if (pipe) await pipe.close().catch(() => undefined);
  server.kill();
  writeJson(path.join(outDir, 'profile.json'), {
    kind: 'gpu-phase4 poolbench profile (failed closed)',
    run,
    tag,
    purpose,
    door: doorKey,
    mix: mixName,
    tasks: nTasks,
    batchSize,
    hostWorkers,
    vramBudgetMb: vramBudgetMb ?? null,
    test: { inject, injectRound: inject ? injectRound : null, killRound, killAfterMs },
    times: { start: tStart, ready: tReady, go: tGo, end: tEnd },
    roundRows,
    failure,
    pass: false
  });
  process.exit(3);
}

const serverStatus = server.pid ? status(server.pid) : null;

clearInterval(rssTimer);
if (pipe) await pipe.close();
await server.close();

// the canonical CPU engine on a sample, after the timed rounds (never concurrent with them)
const step = Math.max(1, Math.floor(nTasks / parityN));
const sample = subjects.filter((_s, i) => i % step === 0).slice(0, parityN);
let parityMismatches = 0;
let cpuErrors = 0;
const parityExamples: string[] = [];
const c0 = performance.now();

for (const s of sample) {
  const c = reference(door, {
    k: s.key,
    quad: s.quad,
    controls: s.controls,
    options: mix.options,
    detail: mix.detail,
    risk: mix.risk
  });

  if (!c.ok) cpuErrors++;
  else if (c.record !== first!.get(s.key)) {
    parityMismatches++;
    if (parityExamples.length < 10) parityExamples.push(s.key);
  }
}

const cpuSeconds = (performance.now() - c0) / 1000;
// the job's hash map (task key → canonical record hash), for the cross-job comparison
const keys = [...first!.keys()].sort();
const dg = createHash('sha256');

fs.mkdirSync(rawDir, { recursive: true });
fs.writeFileSync(path.join(rawDir, 'hashes.jsonl'), keys.map((k) => JSON.stringify([k, first!.get(k)])).join('\n') + '\n');
keys.forEach((k, i) => dg.update(`${i ? '\n' : ''}${k}=${first!.get(k)}`));

const profile = {
  kind: 'gpu-phase4 poolbench profile',
  run,
  tag,
  purpose,
  door: doorKey,
  mix: mixName,
  label,
  tasks: nTasks,
  rounds,
  batchSize,
  hostWorkers,
  vramBudgetMb: vramBudgetMb ?? null,
  server: {
    uuid: info.uuid,
    compatDigest: info.compatDigest,
    binarySha256: createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex'),
    datasetSha256: ds.sha256
  },
  times: { start: tStart, ready: tReady, go: tGo, end: tEnd, barrierWaitSeconds: Math.round(barrierWaitMs / 100) / 10 },
  roundRows,
  repeat: { rounds: rounds - 1, mismatches: repeatMismatches },
  parity: { samples: sample.length, mismatches: parityMismatches, cpuErrors, examples: parityExamples, cpuSeconds },
  cpuScored,
  hashDigest: dg.digest('hex'),
  peakRssMiB: Math.round(peakRss / 2 ** 20),
  process: status('self'),
  serverProcess: serverStatus,
  pass: repeatMismatches === 0 && parityMismatches === 0 && cpuErrors === 0 && cpuScored === 0
};

writeJson(path.join(outDir, 'profile.json'), profile);
log(
  `done: ${rounds} rounds, repeat mismatches ${repeatMismatches}, CPU parity ${sample.length - parityMismatches - cpuErrors}/${sample.length}, digest ${profile.hashDigest.slice(0, 16)}, pass ${profile.pass}`
);
process.exitCode = profile.pass ? 0 : 2;
