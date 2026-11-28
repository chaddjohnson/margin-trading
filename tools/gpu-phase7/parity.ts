// gpu-phase7 (PROTOCOL.md §6 gate E5): tools/gpu-phase5/parity.ts unchanged except that doors, CPU references and the dataset
// cache are this study's (src/gpu-phase7/{context,doorSpec,cpuRefPool,cpuRefWorker}.ts); the subjects and their seeds are
// Phase 5's (src/gpu-phase5/subjects.ts, precommitted). Phase 5's header follows.
// gpu-phase5 (copy of tools/gpu-phase3/parity.ts, this study's namespace; amendment A4 adds the attribution of a
// mismatch to its side) parity (PROTOCOL.md §6.3, §7.1): Phase 2's parity run (tools/gpu-phase2/parity.ts — the canonical CPU
// engine fresh per subject in child processes vs the GPU: every book trade by trade, the pooled replay, the compact or
// detailed record, the risk-envelope inputs; zero tolerance) with the GPU side going through the FINAL HOST PATH: the
// parallel host pipeline (worker threads encode and decode; --host-workers N, default 8) or, with --host-workers 0, the
// serial path. Determinism adds the host-worker counts (--worker-counts, e.g. 1,3,12) and a reversed input order to
// Phase 2's batch sizes, shuffled order, repeat and server restart. This study's own seeds (src/gpu-phase5/subjects.ts).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { evaluate, evaluateDetail } from '../../src/vg-l0-risk-families/evaluate.ts';
import { structureKey, structureOf } from '../../src/growth140-vgt-s8m/space.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { cacheDir, writeJson } from '../../src/gpu-phase7/context.ts';
import { type DoorSpec, doorLabel, resolveDoor } from '../../src/gpu-phase7/doorSpec.ts';
import * as ownSubjects from '../../src/gpu-phase7/subjects.ts';
import * as phase4Subjects from '../../src/gpu-phase4/subjects.ts';
import type { Subject } from '../../src/gpu-phase7/subjects.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-phase5/canon.ts';
import { CpuRefPool } from '../../src/gpu-phase7/cpuRefPool.ts';
import { type RefTask, envelopeOf } from '../../src/gpu-phase7/cpuRefWorker.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type TaskResult } from '../../src/gpu-backend/client.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { engineRuntime } from '../../src/gpu-backend/runtime.ts';
import { type Leaf, leavesOf } from '../../src/gpu-phase5/bits.ts';
import { featureNames } from '../../src/gpu-backend/layout.ts';
import { Rng } from '../../src/optimizer/rng.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const flag = (k: string) => args.includes(`--${k}`);
const out = opt('out', '');

if (!out) throw new Error('--out <json> is required');

const spec: DoorSpec = args.includes('--fixture')
  ? { kind: 'fixture', seed: Number(opt('fixture', '0')), sessions: Number(opt('sessions', '420')) }
  : { kind: 'market', name: opt('door', 'D24') as never };
const t0 = Date.now();
const door = await resolveDoor(spec, 'G1-G6 parity');
const label = doorLabel(spec);
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const optionSet = opt('options', 'base');
// the option sets (O): every EvalOptions field the optimization domain uses, alone and all together
const optionSets: Record<string, EvalOptions> = {
  base: vOptions,
  cost0: { ...vOptions, friction: { costBps: 0 } }, // Assignment 3's qualification stress 'cost 0 bps'
  cost10: { ...vOptions, friction: { costBps: 10 } },
  cost20: { ...vOptions, friction: { costBps: 20 } },
  rate14: { ...vOptions, friction: { rate: 0.14 } },
  slip25: { ...vOptions, friction: { stopSlippageBps: 25 } },
  nextopen: { ...vOptions, friction: { stopFill: 'next-open' } },
  native: { ...vOptions, d1Arm: 'native' },
  fund: { ...vOptions, fundFrom: at(0.3) },
  whole: { ...vOptions, wholeShares: true },
  blackout: {
    ...vOptions,
    blackouts: [
      { first: at(0.2), last: at(0.27) },
      { first: at(0.6), last: at(0.64) }
    ]
  },
  periods: { ...vOptions, boundaries: [at(0.75), at(0.25), at(0.5)] },
  tie: { ...vOptions, tieOrder: ['G:VGT', 'D1:VGT', 'G:GDX', 'D1:GDX'] },
  ggdx: { enabled: {} }, // all four books, Growth·GDX given its own Growth vector (below)
  d1only: { enabled: { 'G:GDX': false, 'G:VGT': false } },
  gonly: { enabled: { 'D1:GDX': false, 'D1:VGT': false, 'G:GDX': false } },
  vgtonly: { enabled: { 'D1:GDX': false, 'G:GDX': false } },
  all: {
    enabled: {},
    friction: { costBps: 20, rate: 0.14, stopSlippageBps: 25, stopFill: 'next-open' },
    d1Arm: 'native',
    fundFrom: at(0.15),
    wholeShares: true,
    blackouts: [{ first: at(0.4), last: at(0.45) }],
    boundaries: [at(0.5), at(0.8)],
    tieOrder: ['G:GDX', 'D1:VGT', 'G:VGT', 'D1:GDX']
  }
};
const options = optionSets[optionSet];

if (!options) throw new Error(`unknown --options ${optionSet}`);

const detail = flag('detail');
const risk = flag('risk');
const growthFirst = flag('growth-first') || optionSet === 'all';

// ----- subjects -----
// --seeds p4: Phase 4's own seeds (src/gpu-phase4/subjects.ts, read only) — the ORIGINAL tasks of a Phase 4 run, for the
// targeted coverage of its one failing run (PROTOCOL.md §7 gate A3); default: this study's seeds
const seeds = opt('seeds', 'own');
const { branchHeavySubjects, growthStrata, neighbourSubjects, randomSubjects, referenceSubjects } =
  seeds === 'p4' ? phase4Subjects : ownSubjects;
const refs = flag('refs') ? referenceSubjects() : [];
let subjects: Subject[] = [
  ...refs,
  ...randomSubjects(Number(opt('random', '0')), opt('label', 'A'), 'coarse', Number(opt('from', '0'))),
  ...randomSubjects(Number(opt('fine', '0')), opt('label', 'A'), 'fine', Number(opt('from', '0'))),
  ...growthStrata(Number(opt('strata', '0')), `${opt('label', 'A')}-G`),
  ...(flag('branch') ? branchHeavySubjects(referenceSubjects()[0]!.quad) : []),
  ...(Number(opt('neighbours', '0')) ? neighbourSubjects(referenceSubjects(), Number(opt('neighbours', '0'))) : [])
];

// four-book sets: Growth·GDX takes the Growth·VGT vector of another subject (a real, varied GDX Growth book)
if (optionSet === 'ggdx' || optionSet === 'all') {
  const donors = randomSubjects(subjects.length, `${opt('label', 'A')}-GDX`);

  subjects = subjects.map((s, i) => ({ ...s, quad: { ...s.quad, g: { ...s.quad.g, GDX: donors[i]!.quad.g.VGT } } }));
}
if (growthFirst) subjects = subjects.map((s) => ({ ...s, quad: { ...s.quad, first: 'G' as const } }));

const tasks: RefTask[] = subjects.map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options, detail, risk }));

// ----- the CPU reference (independent, non-official) -----
const workers = Number(opt('workers', '12'));
const pool = new CpuRefPool(workers, spec);

// gpu-phase5 (PROTOCOL.md §4.4): every CPU reference worker keeps the ORIGINAL objects of its tasks until this process has
// compared the run, so that one mismatch can be attributed to its first differing field from original evidence
pool.keep = detail || tasks.length <= 4000 ? 'full' : 'record'; // large record-only runs keep the records only

if (!flag('skip-cpu')) await pool.start();

let lastLog = Date.now();
const cpuLimit = Number(opt('cpu-limit', '0'));
const cpu = flag('skip-cpu')
  ? tasks.map((t) => ({ k: t.k, ok: true, ms: 0 }) as Awaited<ReturnType<typeof pool.run>>[number])
  : await pool.run(cpuLimit ? tasks.slice(0, cpuLimit) : tasks, 4, (d) => {
      if (Date.now() - lastLog > 30000) {
        lastLog = Date.now();
        console.error(`${label}/${optionSet}: CPU ${d}/${tasks.length}`);
      }
    });

const cpuSeconds = (Date.now() - t0) / 1000; // the pool stays open (its workers hold the originals) until the comparison below is done

// ----- the GPU -----
const ds = exportDataset(door, cacheDir);
const binarySha = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
let server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();
const smoke = await server.smoke();

if (!smoke.ok) throw new Error('GPU smoke self-test failed');
await server.load(ds.file);

const hostWorkers = Number(opt('host-workers', '8'));
let pipe = hostWorkers > 0 ? await HostPipeline.start({ door, workers: hostWorkers }) : null;
const evaluateGpu = async (list: RefTask[], p: HostPipeline | null = pipe) => {
  if (!p) return server.evaluate(door, list, batchOpts, info.uuid);

  const prepared = await p.prepare(door, list, batchOpts);

  return p.complete(prepared, await server.submit(prepared), info.uuid, 'full');
};
const gpuHashes = (r: TaskResult) =>
  r.status !== 0
    ? { status: r.status }
    : {
        status: 0,
        books: canonHash(r.books.map(bookView)),
        pool: canonHash(poolView(r.pool!)),
        record: canonHash(r.record),
        envelope: r.envelope
          ? [
              r.envelope.bankedDdMarked,
              r.envelope.bankedDdLiquidation,
              r.envelope.principalLossMarked,
              r.envelope.principalLossLiquidation
            ]
          : null
      };
const batchOpts = {
  returnTrades: true,
  returnSeries: true,
  tradeCapD1: 1024,
  tradeCapG: 1024,
  lotCap: 1024,
  fundCap: 4096
};
const coverage = {
  status: {} as Record<string, number>,
  features: {} as Record<string, number>,
  growthStructures: {} as Record<string, number>,
  reasons: {} as Record<string, number>,
  kinds: {} as Record<string, number>,
  partialFills: 0,
  openAtEnd: 0,
  unfilledAtEnd: 0,
  trades: 0,
  lots: 0,
  fundingRecords: 0,
  candidatesWithLots: 0
};
const bump = (m: Record<string, number>, k: string, by = 1) => (m[k] = (m[k] ?? 0) + by);
const runGpu = async (list: RefTask[], size: number, collect = false, p: HostPipeline | null = pipe) => {
  const res = new Map<string, ReturnType<typeof gpuHashes>>();
  const keep = new Map<string, TaskResult>();
  // the ORIGINAL records (with their RC counters) of a collected run, as this thread received them
  const originals = new Map<string, { record: TaskResult['record']; rc: TaskResult['rc'] }>();
  const step = size > 0 ? size : 4096;
  let kernelMs = 0;

  for (let i = 0; i < list.length; i += step) {
    const b = await evaluateGpu(list.slice(i, i + step), p);

    kernelMs += b.receipt.server.totalMs;
    for (const r of b.results) {
      res.set(r.key, gpuHashes(r));
      if (collect) {
        originals.set(r.key, { record: r.record, rc: r.rc });
        bump(coverage.status, r.statusText);
        for (const f of featureNames(r.features)) bump(coverage.features, f);
        if (r.status === 0) {
          for (const bk of r.books)
            for (const t of bk.trades) {
              coverage.trades++;
              bump(coverage.kinds, `${bk.book.slice(0, 2)}:${t.kind}`);
              if (t.open) coverage.openAtEnd++;
              if (t.eS < 0) coverage.unfilledAtEnd++;
              for (const f of t.fills) {
                bump(coverage.reasons, `${bk.book.slice(0, 2)}:${f.reason}`);
                if (f.partial) coverage.partialFills++;
              }
            }
          coverage.lots += r.pool!.lots.length;
          coverage.fundingRecords += r.pool!.funding.length;
          if (r.pool!.lots.length) coverage.candidatesWithLots++;
        }
        if (keep.size < 64) keep.set(r.key, r);
      }
    }
  }
  return { res, keep, kernelMs, originals };
};

for (const s of subjects) bump(coverage.growthStructures, structureKey(structureOf(s.quad.g.VGT)));

process.on('uncaughtException', (e) => {
  console.error(`GPU phase failed: ${e.message}\n--- server stderr (tail) ---\n${server.stderrTail}`);
  process.exit(4);
});
const primary = await runGpu(tasks, Number(opt('primary-batch', '4096')), true);
const gpuSeconds = (Date.now() - t0) / 1000 - cpuSeconds;

// TEST ONLY (--test-inject <key>): alter that task's CPU record hash as received, to exercise the original-evidence
// capture below. Such a run records the mismatch and can never pass (it is not evidence).
const testInject = opt('test-inject', '');

if (testInject) {
  const i = tasks.findIndex((t) => t.k === testInject);

  if (i >= 0 && cpu[i]?.ok) cpu[i] = { ...cpu[i]!, record: `${cpu[i]!.record}-injected` };
}

// ----- compare -----
const isRef = (k: string) => k.startsWith('R:');
const mismatches: unknown[] = [];
let identical = 0;
let envelopes = 0;

tasks.forEach((t, i) => {
  const c = cpu[i]!;
  const g = primary.res.get(t.k)!;

  if (!c.ok || g.status !== 0) {
    // a CPU throw must be a GPU per-candidate error (and vice versa): both sides refuse the configuration
    if (!c.ok && g.status !== 0) identical++;
    else mismatches.push({ k: t.k, cpu: c.ok ? 'ok' : c.error, gpu: g.status });
    return;
  }
  const same =
    c.books === g.books &&
    c.pool === g.pool &&
    c.record === g.record &&
    JSON.stringify(c.envelope ?? null) === JSON.stringify(g.envelope ?? null);

  if (c.envelope) {
    envelopes++;
    if (!c.envelope.every((x, j) => Object.is(x, g.envelope![j])))
      mismatches.push({ k: t.k, envelope: isRef(t.k) ? { cpu: c.envelope, gpu: g.envelope } : 'differs' });
  }
  if (same) identical++;
  else
    mismatches.push({
      k: t.k,
      books: c.books === g.books,
      pool: c.pool === g.pool,
      record: c.record === g.record,
      // amendment A4: both sides' original hashes, for the attribution below
      original: {
        cpu: { books: c.books, pool: c.pool, record: c.record, envelope: c.envelope ?? null },
        gpu: { books: g.books, pool: g.pool, record: g.record, envelope: g.envelope ?? null }
      }
    });
});

// detailed diffs of the first mismatching subjects (in process; values only for reference identities)
const details: unknown[] = [];

for (const m of mismatches.slice(0, 6) as { k: string; books?: boolean; pool?: boolean }[]) {
  const i = tasks.findIndex((t) => t.k === m.k);
  const t = tasks[i]!;
  // gpu-phase5 (PROTOCOL.md §4.4) — ORIGINAL evidence first, before any re-evaluation: the CPU worker's own original
  // record leaf by leaf (bit patterns; plus its books and pool when their hashes differed), its re-hash of the same
  // kept objects and its own labelled re-evaluation; this thread's original GPU record; the first differing leaves
  const which = m.books === false || m.pool === false ? ['record', 'books', 'pool'] : ['record'];
  const cpuOriginal = flag('skip-cpu') ? null : await pool.explain(t.k, which).catch((e: Error) => ({ error: e.message }));
  const go = primary.originals.get(t.k);
  const gpuLeaves = go?.record ? leavesOf(go.record) : null;
  const cpuLeaves = (cpuOriginal as { original?: { record: Leaf[] } | null } | null)?.original?.record ?? null;
  const firstDifferingRecordLeaves: unknown[] = [];

  if (cpuLeaves && gpuLeaves)
    for (let j = 0; j < Math.max(cpuLeaves.length, gpuLeaves.length) && firstDifferingRecordLeaves.length < 16; j++) {
      const a = cpuLeaves[j];
      const b = gpuLeaves[j];

      if (!a || !b || a.path !== b.path || a.kind !== b.kind || a.value !== b.value)
        firstDifferingRecordLeaves.push({ path: (a ?? b)!.path, cpu: a ?? null, gpu: b ?? null });
    }

  const originalEvidence = {
    cpu: cpuOriginal,
    gpu: go ? { record: gpuLeaves, rc: go.rc, rehashOfTheSameReceivedRecord: go.record ? canonHash(go.record) : null } : null,
    firstDifferingRecordLeaves
  };
  const x = runWithControls2(door, t.quad, t.controls, t.options, t.detail, false, { cache: false });
  const rec = t.detail
    ? evaluateDetail(door, t.quad, t.controls, t.options)
    : evaluate(door, t.quad, t.controls, t.options);
  const g = (await evaluateGpu([t])).results[0]!;
  const d =
    g.status !== 0
      ? [{ path: '$', cpu: 'ok', gpu: g.statusText }]
      : [
          ...deepDiff(x.books.map(bookView), g.books.map(bookView), '$.books', [], 8),
          ...deepDiff(poolView(x.result), poolView(g.pool!), '$.pool', [], 8),
          ...deepDiff(rec, g.record, '$.record', [], 8),
          ...(t.risk
            ? deepDiff(
                envelopeOf(door, x, t.options),
                g.envelope
                  ? [
                      g.envelope.bankedDdMarked,
                      g.envelope.bankedDdLiquidation,
                      g.envelope.principalLossMarked,
                      g.envelope.principalLossLiquidation
                    ]
                  : null,
                '$.envelope',
                [],
                4
              )
            : [])
        ];

  // amendment A4 — attribution: recompute both sides now (the CPU in this process, the GPU alone and in the whole
  // batch again) and compare with the original hashes: a reproducible difference is a defect; otherwise the side whose
  // original hash differs from its own recomputation had a transient error
  const orig = (m as { original?: { cpu: Record<string, unknown>; gpu: Record<string, unknown> } }).original;
  const cpuNow =
    g.status === 0
      ? {
          books: canonHash(x.books.map(bookView)),
          pool: canonHash(poolView(x.result)),
          record: canonHash(rec),
          envelope: t.risk ? envelopeOf(door, x, t.options) : null
        }
      : null;
  const gpuSingleNow = gpuHashes(g);
  const again = (await evaluateGpu(tasks)).results[i]!;
  const gpuBatchNow = gpuHashes(again);
  const j = (o: unknown) => JSON.stringify(o ?? null);
  const pick = (o: Record<string, unknown> | null | undefined) =>
    o ? { books: o.books, pool: o.pool, record: o.record, envelope: o.envelope ?? null } : null;
  const attribution =
    orig && cpuNow
      ? {
          cpuNowEqualsGpuSingleNow: j(pick(cpuNow)) === j(pick(gpuSingleNow)),
          cpuNowEqualsGpuBatchNow: j(pick(cpuNow)) === j(pick(gpuBatchNow)),
          originalCpuEqualsCpuNow: j(pick(orig.cpu)) === j(pick(cpuNow)),
          originalGpuEqualsGpuBatchNow: j(pick(orig.gpu)) === j(pick(gpuBatchNow)),
          verdict:
            j(pick(cpuNow)) !== j(pick(gpuBatchNow)) || j(pick(cpuNow)) !== j(pick(gpuSingleNow))
              ? 'REPRODUCIBLE difference (a defect)'
              : j(pick(orig.cpu)) !== j(pick(cpuNow)) && j(pick(orig.gpu)) === j(pick(gpuBatchNow))
                ? 'not reproducible: the original CPU reference hash was the odd one (CPU-side transient)'
                : j(pick(orig.gpu)) !== j(pick(gpuBatchNow)) && j(pick(orig.cpu)) === j(pick(cpuNow))
                  ? 'not reproducible: the original GPU hash was the odd one (GPU-side transient)'
                  : 'not reproducible: both original hashes differ from their recomputations',
          now: { cpu: cpuNow, gpuSingle: gpuSingleNow, gpuBatch: gpuBatchNow }
        }
      : null;

  details.push({
    k: t.k,
    diffs: isRef(t.k) ? d : d.map((x) => ({ path: x.path, ulps: x.ulps ?? null })),
    originalEvidence,
    attribution
  });
}

if (!flag('skip-cpu')) await pool.close(); // the originals are no longer needed

// ----- G5 determinism -----
const batches = opt('batches', '').split(',').filter(Boolean).map(Number);
const subset = tasks.slice(0, Math.min(tasks.length, Number(opt('determinism-subset', '256'))));
const runs: { run: string; mismatches: number }[] = [];
const sameAsPrimary = (res: Map<string, ReturnType<typeof gpuHashes>>) =>
  subset.filter((t) => JSON.stringify(res.get(t.k)) !== JSON.stringify(primary.res.get(t.k))).length;

for (const b of batches) runs.push({ run: `batch ${b}`, mismatches: sameAsPrimary((await runGpu(subset, b)).res) });
if (batches.length) {
  const rng = new Rng([20261119, 2, 0, 1]);
  const shuffled = [...subset];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  runs.push({ run: 'shuffled order', mismatches: sameAsPrimary((await runGpu(shuffled, 0)).res) });
  runs.push({ run: 'reversed order', mismatches: sameAsPrimary((await runGpu([...subset].reverse(), 0)).res) });
  runs.push({ run: 'repeat (same process)', mismatches: sameAsPrimary((await runGpu(subset, 0)).res) });
  for (const w of opt('worker-counts', '').split(',').filter(Boolean).map(Number)) {
    const p = w > 0 ? await HostPipeline.start({ door, workers: w }) : null;

    try {
      runs.push({ run: `host workers ${w}`, mismatches: sameAsPrimary((await runGpu(subset, 0, false, p)).res) });
    } finally {
      await p?.close();
    }
  }
  await server.close();
  await pipe?.close();
  server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  await server.load(ds.file);
  pipe = hostWorkers > 0 ? await HostPipeline.start({ door, workers: hostWorkers }) : null;
  runs.push({ run: 'server and host-path restart', mismatches: sameAsPrimary((await runGpu(subset, 0)).res) });
}
await server.close();
await pipe?.close();

const rec = {
  kind: 'gpu-phase7 parity (host pipeline)',
  t: new Date().toISOString(),
  runtime: engineRuntime(), // the JavaScript engine configuration of this process, its host workers and its CPU reference workers
  ...(testInject ? { testInject } : {}),
  seeds: seeds === 'p4' ? "Phase 4's (src/gpu-phase4/subjects.ts)" : "this study's (src/gpu-phase7/subjects.ts)",
  door: label,
  doorSpec: spec,
  sessions: door.sessions,
  first: door.dates[0],
  last: door.dates.at(-1),
  dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
  options: optionSet,
  optionsValue: options,
  detail,
  risk,
  growthFirst,
  subjects: {
    total: tasks.length,
    R: refs.length,
    bySet: Object.fromEntries(['R', 'A', 'G', 'B', 'N'].map((s) => [s, subjects.filter((x) => x.set === s).length]))
  },
  result: {
    identical,
    mismatches: mismatches.length,
    envelopesCompared: envelopes,
    pass: mismatches.length === 0 && runs.every((r) => r.mismatches === 0)
  },
  mismatchList: mismatches.slice(0, 50).map((m) => (isRef((m as { k: string }).k) ? m : { ...(m as object) })),
  details,
  determinism: { subset: subset.length, runs },
  coverage,
  build: {
    binary: serverBinary,
    binarySha256: binarySha,
    device: info.device,
    uuid: info.uuid,
    driver: info.driver,
    runtime: info.runtime,
    buildFlags: info.buildFlags,
    compatDigest: info.compatDigest,
    dataset: ds.sha256
  },
  seconds: { cpu: Math.round(cpuSeconds), gpu: Math.round(gpuSeconds), total: Math.round((Date.now() - t0) / 1000) },
  cpuWorkers: workers,
  hostPath: { workers: hostWorkers, mode: hostWorkers > 0 ? 'parallel' : 'serial' },
  host: execFileSync('hostname').toString().trim()
};

writeJson(out, rec);
console.log(
  JSON.stringify({
    door: label,
    options: optionSet,
    n: tasks.length,
    identical,
    mismatches: mismatches.length,
    determinism: runs.map((r) => r.mismatches),
    seconds: rec.seconds
  })
);
if (!rec.result.pass) process.exitCode = 2;
