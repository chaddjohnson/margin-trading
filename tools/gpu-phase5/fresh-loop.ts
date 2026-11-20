// gpu-phase5 root cause (PROTOCOL.md §4.4–§4.5): the FRESH-CONTEXT LOOP on Phase 4's failing parity run D24-fund.
// Every cycle starts fresh CPU reference workers (child processes, the campaign's pool) and gives worker i the tasks
// 4i … 4i+3 — the original first chunks; the original failing task 33 (O-fund:coarse:28) is worker 8's second task —
// and then a fresh GPU server and a fresh host pipeline that evaluate the original 1,561-task batch. Every hash is
// compared CPU against GPU (the campaign's comparison) and against the first cycle's values; the raw device response
// (everything after the receipt) is compared byte for byte across cycles by its sha256.
//
// A mismatch is captured BEFORE any re-evaluation: both sides' original hashes, both sides' ORIGINAL records leaf by
// leaf with bit patterns (the CPU worker keeps its original objects and reports them itself), a re-hash of the same
// kept objects, the candidate's raw device bytes, the worker and shard identities. Then, separately labelled: a
// re-evaluation in the same CPU worker, in a fresh CPU process and in this process; a serial re-decode of the same
// response bytes; a GPU re-evaluation alone and in the whole batch. No comparison is changed; nothing is retried
// silently.
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase5/fresh-loop.ts --out <dir> [--cycles 200]
//     [--max-minutes 120] [--cpu-tasks 48] [--cpu-workers 12] [--host-workers 8] [--no-cpu] [--no-gpu]
//     [--seeds p4|p5] [--options fund] [--label O-fund] [--random 1500] [--strata 2] [--door D24]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import * as p4 from '../../src/gpu-phase4/subjects.ts';
import * as p5 from '../../src/gpu-phase5/subjects.ts';
import { cacheDir, writeJson } from '../../src/gpu-phase5/context.ts';
import { type DoorSpec, resolveDoor } from '../../src/gpu-phase5/doorSpec.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-backend/canon.ts';
import { CpuRefPool } from '../../src/gpu-phase5/cpuRefPool.ts';
import { type RefResult, type RefTask, referenceFull } from '../../src/gpu-phase5/cpuRefWorker.ts';
import { firstDiffs, leavesOf } from '../../src/gpu-phase5/bits.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type TaskResult } from '../../src/gpu-backend/client.ts';
import { decodeBatch } from '../../src/gpu-backend/batch.ts';
import { CandOut, Receipt, ResultHeader } from '../../src/gpu-backend/layout.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const flag = (k: string) => args.includes(`--${k}`);
const outDir = opt('out', '');

if (!outDir) throw new Error('--out <dir> is required');
fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(path.join(outDir, 'summary.json'))) throw new Error(`${outDir} already holds a finished loop (write-once)`);

const spec: DoorSpec = { kind: 'market', name: opt('door', 'D24') as never };
const door = await resolveDoor(spec, 'gpu-phase5 fresh-context loop');
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const optionSet = opt('options', 'fund');
const optionSets: Record<string, EvalOptions> = { base: vOptions, fund: { ...vOptions, fundFrom: at(0.3) } };
const options = optionSets[optionSet];

if (!options) throw new Error(`unknown --options ${optionSet}`);

const S = opt('seeds', 'p4') === 'p4' ? p4 : p5; // p4 = Phase 4's own seeds: the ORIGINAL tasks
const label = opt('label', 'O-fund');
const subjects = [
  ...S.referenceSubjects(),
  ...S.randomSubjects(Number(opt('random', '1500')), label, 'coarse', 0),
  ...S.growthStrata(Number(opt('strata', '2')), `${label}-G`)
];
const tasks: RefTask[] = subjects.map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options, detail: true, risk: true }));
const cpuWorkers = Number(opt('cpu-workers', '12'));
const cpuTasks = Math.min(tasks.length, Number(opt('cpu-tasks', String(cpuWorkers * 4))));
const hostWorkers = Number(opt('host-workers', '8'));
const maxCycles = Number(opt('cycles', '200'));
const deadline = Date.now() + Number(opt('max-minutes', '120')) * 60000;
const batchOpts = { returnTrades: true, returnSeries: true, tradeCapD1: 1024, tradeCapG: 1024, lotCap: 1024, fundCap: 4096 };
const ds = flag('no-gpu') ? null : exportDataset(door, cacheDir);
const binarySha = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
const candAt = ResultHeader.size + Receipt.size;

type H = { status?: number; books?: string; pool?: string; record?: string; envelope?: number[] | null };
const gpuHashes = (r: TaskResult): H =>
  r.status !== 0
    ? { status: r.status }
    : {
        status: 0,
        books: canonHash(r.books.map(bookView)),
        pool: canonHash(poolView(r.pool!)),
        record: canonHash(r.record),
        envelope: r.envelope
          ? [r.envelope.bankedDdMarked, r.envelope.bankedDdLiquidation, r.envelope.principalLossMarked, r.envelope.principalLossLiquidation]
          : null
      };
const cpuH = (c: RefResult): H => (c.ok ? { status: 0, books: c.books, pool: c.pool, record: c.record, envelope: c.envelope ?? null } : { status: -1 });
const sameEnv = (a: H['envelope'], b: H['envelope']) =>
  (a ?? null) === null || (b ?? null) === null ? (a ?? null) === (b ?? null) : a!.length === b!.length && a!.every((x, j) => Object.is(x, b![j]));
const parts = (a: H, b: H) => ({
  status: a.status === b.status,
  books: a.books === b.books,
  pool: a.pool === b.pool,
  record: a.record === b.record,
  envelope: sameEnv(a.envelope, b.envelope)
});
const equal = (a: H, b: H) => Object.values(parts(a, b)).every(Boolean);
const leavesFor = (r: TaskResult, which: string[]) => ({
  record: leavesOf(r.record),
  ...(which.some((w) => w !== 'record') ? { books: leavesOf(r.books.map(bookView)), pool: leavesOf(poolView(r.pool!)) } : {})
});

let cpuRef: H[] | null = null;
let gpuRef: H[] | null = null;
let payloadRef: string | null = null;
let stop = false;
const totals = {
  cycles: 0,
  freshCpuWorkers: 0,
  cpuEvaluations: 0,
  freshGpuContexts: 0,
  gpuEvaluations: 0,
  parityComparisons: 0,
  parityMismatches: 0,
  cpuVsFirstCycleMismatches: 0,
  gpuVsFirstCycleMismatches: 0,
  payloadDigestChanges: 0,
  evidenceFiles: [] as string[]
};

process.on('SIGTERM', () => (stop = true));
process.on('SIGINT', () => (stop = true));
writeJson(path.join(outDir, 'config.json'), {
  kind: 'gpu-phase5 fresh-context loop (configuration)',
  t: new Date().toISOString(),
  door: spec,
  sessions: door.sessions,
  dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
  options: optionSet,
  optionsValue: options,
  seeds: opt('seeds', 'p4') === 'p4' ? "Phase 4's (src/gpu-phase4/subjects.ts): the original tasks" : "this study's",
  label,
  tasks: tasks.length,
  cpuTasksPerCycle: cpuTasks,
  cpuWorkers,
  hostWorkers,
  testInject: opt('test-inject', '') || null,
  binary: serverBinary,
  binarySha256: binarySha,
  dataset: ds?.sha256 ?? null,
  node: process.version,
  v8: process.versions.v8,
  execArgv: process.execArgv,
  nodeOptions: process.env.NODE_OPTIONS ?? null
});

for (let cycle = 0; cycle < maxCycles && !stop && Date.now() < deadline; cycle++) {
  const t0 = Date.now();
  const line: Record<string, unknown> = { cycle, t: new Date().toISOString() };
  const evidence: Record<string, unknown>[] = [];

  // ----- the CPU reference: fresh workers, the original first chunks -----
  let pool: CpuRefPool | null = null;
  let cpu: RefResult[] = [];

  if (!flag('no-cpu')) {
    pool = new CpuRefPool(cpuWorkers, spec);
    pool.keep = true;
    await pool.start();
    cpu = await pool.run(tasks.slice(0, cpuTasks), 4);
    totals.freshCpuWorkers += cpuWorkers;
    totals.cpuEvaluations += cpu.length;
    line.cpuSeconds = (Date.now() - t0) / 1000;
    line.cpuPids = pool.pids;
  }

  // ----- the GPU: a fresh server, a fresh host pipeline, the original batch -----
  let server: GpuServer | null = null;
  let pipe: HostPipeline | null = null;
  let gpu: TaskResult[] = [];
  let prepared: Awaited<ReturnType<HostPipeline['prepare']>> | null = null;
  let raw: { payload: Buffer; roundTripMs: number } | null = null;
  let uuid = '';
  const t1 = Date.now();

  if (!flag('no-gpu')) {
    server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });

    const info = await server.info();
    const smoke = await server.smoke();

    if (!smoke.ok) throw new Error('GPU smoke self-test failed');
    uuid = info.uuid;
    await server.load(ds!.file);
    if (hostWorkers > 0) {
      pipe = await HostPipeline.start({ door, workers: hostWorkers });
      prepared = await pipe.prepare(door, tasks, batchOpts);
      raw = await server.submit(prepared);

      const done = await pipe.complete(prepared, raw, uuid, 'full');

      gpu = done.results;
      line.gpu = { nonce: done.receipt.nonce, serverMs: done.receipt.server.totalMs, shards: prepared.enc.shards.length };
    } else {
      const p = server.prepare(door, tasks, batchOpts);

      raw = await server.submit(p);
      gpu = server.complete(p, raw, uuid).results;
    }
    totals.freshGpuContexts++;
    totals.gpuEvaluations += gpu.length;
    line.gpuSeconds = (Date.now() - t1) / 1000;
    line.payloadSha256 = createHash('sha256').update(raw.payload.subarray(candAt)).digest('hex');
    line.payloadBytes = raw.payload.length;
    if (payloadRef === null) payloadRef = line.payloadSha256 as string;
    else if (payloadRef !== line.payloadSha256) {
      totals.payloadDigestChanges++;
      line.payloadDiffersFromFirstCycle = true;
      // keep the differing device response (git-ignored raw-large is the caller's --out; small enough to keep once)
      if (totals.payloadDigestChanges <= 3) fs.writeFileSync(path.join(outDir, `payload-c${cycle}.bin`), raw.payload);
    }
  }

  const g = gpu.map(gpuHashes);
  const c = cpu.map(cpuH);

  // TEST ONLY (--test-inject <cycle>:<index>): alter the CPU record hash as received, to exercise the evidence capture
  if (opt('test-inject', '') === `${cycle}:33` && c[33]) c[33] = { ...c[33], record: `${c[33].record}-injected` };

  // ----- compare (the campaign's CPU = GPU comparison; and each side against the first cycle) -----
  const bad = new Map<number, Record<string, unknown>>();
  const note = (i: number, kind: string, a: H, b: H) => {
    const e = bad.get(i) ?? { i, k: tasks[i]!.k, kinds: [] as string[] };

    (e.kinds as string[]).push(kind);
    e[kind] = { equal: parts(a, b), a, b };
    bad.set(i, e);
  };

  if (c.length && g.length)
    for (let i = 0; i < c.length; i++) {
      totals.parityComparisons++;
      if (!equal(c[i]!, g[i]!)) {
        totals.parityMismatches++;
        note(i, 'cpuVsGpu', c[i]!, g[i]!);
      }
    }
  if (c.length) {
    if (!cpuRef) cpuRef = c;
    else
      for (let i = 0; i < c.length; i++)
        if (!equal(c[i]!, cpuRef[i]!)) {
          totals.cpuVsFirstCycleMismatches++;
          note(i, 'cpuVsFirstCycle', c[i]!, cpuRef[i]!);
        }
  }
  if (g.length) {
    if (!gpuRef) gpuRef = g;
    else
      for (let i = 0; i < g.length; i++)
        if (!equal(g[i]!, gpuRef[i]!)) {
          totals.gpuVsFirstCycleMismatches++;
          note(i, 'gpuVsFirstCycle', g[i]!, gpuRef[i]!);
        }
  }

  // ----- capture: ORIGINAL evidence first, re-evaluations afterwards and labelled -----
  for (const e of [...bad.values()].slice(0, 8)) {
    const i = e.i as number;
    const t = tasks[i]!;
    const which = (e.kinds as string[]).some((k) => {
      const q = (e[k] as { equal: Record<string, boolean> }).equal;

      return !q.books || !q.pool;
    })
      ? ['record', 'books', 'pool']
      : ['record'];
    const ev: Record<string, unknown> = { ...e, cycle, t: new Date().toISOString(), which };

    // (1) originals
    if (pool && i < cpu.length) ev.cpuOriginal = await pool.explain(t.k, which); // also holds the same worker's re-evaluation
    if (gpu[i] && gpu[i]!.status === 0) {
      const r = gpu[i]!;
      const shard = prepared ? prepared.enc.shards.findIndex((s) => i >= s.c0 && i < s.c1) : 0;

      ev.gpuOriginal = {
        hashes: g[i],
        rehashOfKeptObjects: gpuHashes(r),
        leaves: leavesFor(r, which),
        rc: r.rc,
        candOutHex: raw!.payload.subarray(candAt + i * CandOut.size, candAt + (i + 1) * CandOut.size).toString('hex'),
        batch: { nonce: (line.gpu as { nonce?: string } | undefined)?.nonce ?? null, index: i, shard, hostWorker: prepared?.shardWorker[shard] ?? null, positionInShard: prepared ? i - prepared.enc.shards[shard]!.c0 : i }
      };
    }
    const co = (ev.cpuOriginal as { original?: { record: unknown[] } } | undefined)?.original;
    const go = (ev.gpuOriginal as { leaves?: { record: unknown[] } } | undefined)?.leaves;

    if (co && go) {
      const a = co.record as { path: string; kind: string; value: string }[];
      const b = go.record as { path: string; kind: string; value: string }[];
      const out: unknown[] = [];

      for (let j = 0; j < Math.max(a.length, b.length) && out.length < 12; j++) {
        const x = a[j];
        const y = b[j];

        if (!x || !y || x.path !== y.path || x.kind !== y.kind || x.value !== y.value) out.push({ path: (x ?? y)!.path, cpu: x ?? null, gpu: y ?? null });
      }
      ev.firstDifferingRecordLeavesOriginalCpuVsOriginalGpu = out;
    }

    // (2) labelled re-evaluations
    const here = referenceFull(door, t);

    ev.reEvaluationCpuInThisProcess = { hashes: cpuH(here.result), firstDiffsAgainstCpuOriginalRecord: null as unknown };
    {
      const fresh = new CpuRefPool(1, spec);

      fresh.keep = true;
      await fresh.start();

      const fr = await fresh.run([t], 4);
      const fx = await fresh.explain(t.k, which);

      ev.reEvaluationCpuFreshProcess = { hashes: cpuH(fr[0]!), record: fx.original?.record ?? null };
      await fresh.close();
    }
    if (raw && gpu[i]) {
      // the SAME response bytes decoded serially on this thread
      const enc = prepared ? prepared.enc : null;

      if (enc) {
        const serial = decodeBatch(door, tasks, enc, raw.payload, batchOpts).results[i]!;

        ev.reDecodeSameBytesSerial = { hashes: gpuHashes(serial), leaves: serial.status === 0 ? leavesFor(serial, which) : null, firstDiffsAgainstGpuOriginalRecord: serial.status === 0 ? firstDiffs(gpu[i]!.record, serial.record) : null };
      }
      if (pipe && server) {
        const one = await pipe.prepare(door, [t], batchOpts);
        const oneRaw = await server.submit(one);
        const single = (await pipe.complete(one, oneRaw, uuid, 'full')).results[0]!;

        ev.reEvaluationGpuAlone = { hashes: gpuHashes(single), candOutEqualsOriginalBytes: null as boolean | null };

        const all = await pipe.prepare(door, tasks, batchOpts);
        const allRaw = await server.submit(all);
        const again = (await pipe.complete(all, allRaw, uuid, 'full')).results[i]!;

        ev.reEvaluationGpuBatch = {
          hashes: gpuHashes(again),
          payloadSha256: createHash('sha256').update(allRaw.payload.subarray(candAt)).digest('hex'),
          candOutEqualsOriginalBytes:
            allRaw.payload.subarray(candAt + i * CandOut.size, candAt + (i + 1) * CandOut.size).compare(
              raw.payload.subarray(candAt + i * CandOut.size, candAt + (i + 1) * CandOut.size)
            ) === 0
        };
      }
    }

    const file = path.join(outDir, `mismatch-c${cycle}-i${i}.json`);

    writeJson(file, ev);
    totals.evidenceFiles.push(path.basename(file));
    evidence.push({ i, k: t.k, kinds: e.kinds });
  }

  await pool?.close();
  await pipe?.close();
  await server?.close();
  totals.cycles++;
  line.mismatches = evidence;
  line.badCount = bad.size;
  line.seconds = (Date.now() - t0) / 1000;
  fs.appendFileSync(path.join(outDir, 'cycles.jsonl'), `${JSON.stringify(line)}\n`);
  if (cycle % 10 === 0 || bad.size) console.error(`cycle ${cycle}: ${JSON.stringify({ s: line.seconds, bad: bad.size, parityMismatches: totals.parityMismatches })}`);
  if (global.gc) global.gc();
}

const known = { index: 33, k: 'O-fund:coarse:28', phase4Record: 'f17d66f45b4fa8806c67d4f4', phase4Books: 'd35779dd11801eed1c933e9f', phase4Pool: 'da74e7dfc43950fa6d7c910d' };
const summary = {
  kind: 'gpu-phase5 fresh-context loop',
  t: new Date().toISOString(),
  ...totals,
  payloadSha256FirstCycle: payloadRef,
  knownCandidate:
    opt('seeds', 'p4') === 'p4' && optionSet === 'fund'
      ? {
          ...known,
          cpuFirstCycle: cpuRef?.[33] ?? null,
          gpuFirstCycle: gpuRef?.[33] ?? null,
          equalsPhase4Diagnostics:
            (cpuRef ? cpuRef[33]?.record === known.phase4Record && cpuRef[33]?.books === known.phase4Books && cpuRef[33]?.pool === known.phase4Pool : true) &&
            (gpuRef ? gpuRef[33]?.record === known.phase4Record && gpuRef[33]?.books === known.phase4Books && gpuRef[33]?.pool === known.phase4Pool : true)
        }
      : null,
  pass: totals.parityMismatches === 0 && totals.cpuVsFirstCycleMismatches === 0 && totals.gpuVsFirstCycleMismatches === 0 && totals.payloadDigestChanges === 0
};

writeJson(path.join(outDir, 'summary.json'), summary);
console.log(JSON.stringify(summary));
if (!summary.pass) process.exitCode = 2;
