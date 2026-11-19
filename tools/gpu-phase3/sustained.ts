// gpu-phase3 gate H6 (PROTOCOL.md §7.6; brief §5.6): ONE bounded 30–60 min sustained reliability run of the FINAL code
// (NON-OFFICIAL, purpose 'parity-test') — Phase 2's stress test (tools/gpu-phase2/stress.ts) shortened by the user's
// directive (no new 8 h / 24 h endurance test) and run through the parallel host path. Production path: the GpuPool
// (batch 8,192, pipelined, one host pipeline per door shared by the rounds) evaluates rounds of 32,768 fresh seeded
// Assignment 3 genomes (the queue holds the whole round: backpressure), rotating doors (D19, D21, D23, D24, FULL) and
// evaluation mixes (joint, detail + risk, all options, D1-only, Growth-only). Throughout: CPU parity samples of every
// round (canonical record hashes, 4 CPU reference workers), repeatability of a fixed batch per door, telemetry every
// 30 s (GPU, host RSS, counters), an atomically rewritten summary. Refuses a duration outside 30–60 minutes.
//   node --expose-gc --experimental-transform-types tools/gpu-phase3/sustained.ts --minutes 45 --out-dir <dir> [--host-workers 8]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { type DoorKey, cacheDir, openDoor, writeJson } from '../../src/gpu-phase3/context.ts';
import { randomSubjects } from '../../src/gpu-phase3/subjects.ts';
import { CpuRefPool } from '../../src/gpu-phase3/cpuRefPool.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type Task } from '../../src/gpu-backend/client.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const minutes = Number(opt('minutes', '45'));

if (!(minutes >= 30 && minutes <= 60))
  throw new Error(`a bounded run lasts 30–60 minutes (got ${minutes}); longer endurance needs the user's approval`);

const hours = minutes / 60;
const hostWorkers = Number(opt('host-workers', '8'));
const dir = opt('out-dir', 'research/gpu-phase3/results/sustained');
const parityN = Number(opt('parity-n', '48'));
const repeatEvery = Number(opt('repeat-every', '6'));
const roundTasks = Number(opt('round', '32768'));
const doors: DoorKey[] = ['D19', 'D21', 'D23', 'D24', 'FULL'];
const mixes: Record<string, { options: EvalOptions; detail: boolean; risk?: boolean }> = {
  joint: { options: vOptions, detail: false },
  'detail+risk': { options: vOptions, detail: true, risk: true },
  'all-options': {
    options: {
      enabled: {},
      friction: { costBps: 20, rate: 0.14, stopSlippageBps: 25, stopFill: 'next-open' },
      d1Arm: 'native',
      wholeShares: true
    },
    detail: false
  },
  'd1-only': { options: { enabled: { 'G:GDX': false, 'G:VGT': false } }, detail: false },
  'growth-only': { options: { enabled: { 'D1:GDX': false, 'D1:VGT': false, 'G:GDX': false } }, detail: false }
};
const mixNames = Object.keys(mixes);
// GpuPool.close() closes its server; a server shared by several pools (one per round) is wrapped so that only its owner
// closes it (every other member — evaluate, prepare/submit/complete, kill, getters — goes to the real server)
const keepOpen = (s: GpuServer): GpuServer =>
  new Proxy(s, {
    get: (t, k) => {
      if (k === 'close') return async () => {};
      const v = Reflect.get(t, k, t);

      return typeof v === 'function' ? v.bind(t) : v;
    }
  });
const binarySha = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
const t0 = Date.now();
const deadline = t0 + hours * 3600_000;
const log = (s: string) => console.log(`[sustained ${new Date().toISOString().slice(11, 19)}Z] ${s}`);
const smi = (q: string) =>
  execFileSync('nvidia-smi', [`--query-gpu=${q}`, '--format=csv,noheader,nounits'])
    .toString()
    .trim()
    .split(', ');

fs.mkdirSync(dir, { recursive: true });
const telemetryFile = path.join(dir, 'telemetry.jsonl');
const roundsFile = path.join(dir, 'rounds.jsonl');
const summaryFile = path.join(dir, 'summary.json');
const S = {
  kind: 'gpu-phase3 H6 bounded sustained run (non-official)',
  started: new Date(t0).toISOString(),
  plannedMinutes: minutes,
  hostWorkers,
  binary: { path: serverBinary, sha256: binarySha },
  rounds: 0,
  evaluations: 0,
  gpuSeconds: 0,
  parity: { samples: 0, mismatches: 0, cpuErrors: 0, examples: [] as unknown[] },
  repeat: { checks: 0, tasks: 0, mismatches: 0, examples: [] as unknown[] },
  failures: [] as { t: string; round: number; error: string }[],
  restarts: 0,
  cpuScored: 0,
  peaks: { tempC: 0, powerW: 0, vramMiB: 0, hostRssMiB: 0 },
  throttleSeen: [] as string[],
  byDoor: {} as Record<string, { rounds: number; evaluations: number; seconds: number }>,
  pass: true,
  finished: null as string | null
};
const save = () => {
  const tmp = `${summaryFile}.tmp`;

  writeJson(tmp, { ...S, elapsedHours: Math.round(((Date.now() - t0) / 3600_000) * 1000) / 1000 });
  fs.renameSync(tmp, summaryFile);
};

// ----- telemetry every 30 s -----
let counters = () => ({});
const telemetry = setInterval(() => {
  try {
    const [u, m, p, t, c, thr] = smi(
      'utilization.gpu,memory.used,power.draw,temperature.gpu,clocks.sm,clocks_event_reasons.active'
    );
    const rss = Math.round(process.memoryUsage().rss / 2 ** 20);
    const row = {
      t: new Date().toISOString(),
      util: Number(u),
      vramMiB: Number(m),
      powerW: Number(p),
      tempC: Number(t),
      smClockMHz: Number(c),
      throttle: thr,
      hostRssMiB: rss,
      ...counters()
    };

    fs.appendFileSync(telemetryFile, `${JSON.stringify(row)}\n`);
    S.peaks.tempC = Math.max(S.peaks.tempC, row.tempC);
    S.peaks.powerW = Math.max(S.peaks.powerW, row.powerW);
    S.peaks.vramMiB = Math.max(S.peaks.vramMiB, row.vramMiB);
    S.peaks.hostRssMiB = Math.max(S.peaks.hostRssMiB, rss);
    if (thr && thr !== '0x0000000000000000' && !S.throttleSeen.includes(thr)) S.throttleSeen.push(thr);
  } catch {
    /* nvidia-smi unavailable for one sample: the gap shows in the file */
  }
}, 30_000);

const tasksOf = (round: number, mix: string, n: number): Task[] =>
  randomSubjects(n, `STRESS-${round}`).map((s) => ({
    k: s.key,
    quad: s.quad,
    controls: s.controls,
    options: mixes[mix]!.options,
    detail: mixes[mix]!.detail,
    risk: mixes[mix]!.risk
  }));
const fixedTasks = (d: string) =>
  randomSubjects(2048, `STRESS-FIXED-${d}`).map(
    (s) => ({ k: s.key, quad: s.quad, controls: s.controls, options: vOptions, detail: false }) as Task
  );
const firstOutputs = new Map<string, Map<string, string>>(); // door → task → record hash

let round = 0;
const parityJobs: Promise<void>[] = [];

while (Date.now() < deadline) {
  const d = doors[Math.floor(round / mixNames.length) % doors.length]!;
  const door = await openDoor(d, 'H6 sustained run');
  const ds = exportDataset(door, cacheDir);
  let server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  let info = await server.info();

  await server.load(ds.file);
  const ref = new CpuRefPool(4, { kind: 'market', name: d });

  await ref.start();
  const pipe = await HostPipeline.start({ door, workers: hostWorkers });
  // one door, one pass over the mixes
  for (let m = 0; m < mixNames.length && Date.now() < deadline; m++, round++) {
    const mix = mixNames[round % mixNames.length]!;
    const tasks = tasksOf(round, mix, roundTasks);
    const ledger = path.join(dir, 'ledger', `round-${String(round).padStart(5, '0')}.jsonl`);
    const hashes = new Map<string, string>();
    const r0 = Date.now();
    let ok = false;

    for (let attempt = 0; !ok; attempt++) {
      const pool = new GpuPool({
        door,
        session: null,
        server: keepOpen(server),
        uuid: info.uuid,
        ledgerFile: ledger,
        batchSize: 8192,
        lingerMs: 25,
        pipeline: pipe
      });

      counters = () => ({ round, door: d, mix, ...pool.counters });
      try {
        await pool.run(tasks, (t, v) => hashes.set(t.k, canonHash(v)));
        S.cpuScored += pool.counters.cpuScored;
        S.gpuSeconds += pool.counters.kernelMs / 1000;
        await pool.close();
        ok = true;
      } catch (e) {
        S.failures.push({
          t: new Date().toISOString(),
          round,
          error: `${(e as Error).message.slice(0, 400)} | server: ${server.stderrTail.slice(-400)}`
        });
        log(`round ${round} failed: ${(e as Error).message.slice(0, 200)}`);
        try {
          await pool.close();
        } catch {
          /* already failed */
        }
        server.kill();
        S.pass = false; // a bounded run passes only without any GPU or host-path failure
        if (++S.restarts > 5 || attempt >= 2) {
          S.pass = false;
          S.finished = new Date().toISOString();
          save();
          throw new Error('stress: too many GPU failures');
        }
        server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
        info = await server.info();
        await server.load(ds.file);
        hashes.clear();
      }
    }
    const secs = (Date.now() - r0) / 1000;

    S.rounds++;
    S.evaluations += tasks.length;
    const b = (S.byDoor[d] ??= { rounds: 0, evaluations: 0, seconds: 0 });

    b.rounds++;
    b.evaluations += tasks.length;
    b.seconds = Math.round((b.seconds + secs) * 10) / 10;
    fs.appendFileSync(
      roundsFile,
      `${JSON.stringify({ t: new Date().toISOString(), round, door: d, mix, tasks: tasks.length, seconds: Math.round(secs * 10) / 10, evPerS: Math.round(tasks.length / secs), ledger: path.basename(ledger) })}\n`
    );
    // the ledger of a passed round is summarized (the file itself is large over 24 h): keep every 10th
    if (round % 10 !== 0) fs.rmSync(ledger, { force: true });

    // CPU parity sample (concurrent with the next rounds)
    const step = Math.max(1, Math.floor(tasks.length / parityN));
    const sample = tasks.filter((_t, i) => i % step === 0).slice(0, parityN);

    parityJobs.push(
      ref
        .run(
          sample.map((t) => ({
            k: t.k,
            quad: t.quad,
            controls: t.controls,
            options: t.options,
            detail: t.detail,
            risk: t.risk
          })),
          2
        )
        .then((res) => {
          for (const c of res) {
            S.parity.samples++;
            if (!c.ok) S.parity.cpuErrors++;
            else if (c.record !== hashes.get(c.k)) {
              S.parity.mismatches++;
              S.pass = false;
              if (S.parity.examples.length < 20) S.parity.examples.push({ round, door: d, mix, k: c.k });
            }
          }
        })
    );
    // repeatability
    if (round % repeatEvery === 0) {
      const fixed = fixedTasks(d);
      const pool = new GpuPool({
        door,
        session: null,
        server: keepOpen(server),
        uuid: info.uuid,
        ledgerFile: path.join(cacheDir, 'sustained-repeat-ledger.jsonl'),
        batchSize: 8192,
        lingerMs: 25,
        pipeline: pipe
      });
      const now = new Map<string, string>();

      await pool.run(fixed, (t, v) => now.set(t.k, canonHash(v)));
      await pool.close();
      const first = firstOutputs.get(d);

      if (!first) firstOutputs.set(d, now);
      else {
        S.repeat.checks++;
        S.repeat.tasks += fixed.length;
        for (const [k, h] of first)
          if (now.get(k) !== h) {
            S.repeat.mismatches++;
            S.pass = false;
            if (S.repeat.examples.length < 20) S.repeat.examples.push({ round, door: d, k });
          }
      }
    }
    save();
    log(
      `round ${round} ${d} ${mix}: ${tasks.length} in ${secs.toFixed(1)} s (${Math.round(tasks.length / secs)}/s); parity ${S.parity.samples} sampled, ${S.parity.mismatches} mismatches; repeat ${S.repeat.mismatches}`
    );
  }
  await Promise.all(parityJobs.splice(0));
  await ref.close();
  await pipe.close();
  await server.close();
}

clearInterval(telemetry);
await Promise.all(parityJobs);
S.finished = new Date().toISOString();
if (S.cpuScored !== 0 || S.failures.length) S.pass = false;
save();
log(
  `finished: ${S.rounds} rounds, ${S.evaluations} evaluations, parity ${S.parity.samples}/${S.parity.mismatches}, repeat ${S.repeat.tasks}/${S.repeat.mismatches}, failures ${S.failures.length}, pass ${S.pass}`
);
process.exitCode = S.pass ? 0 : 2;
