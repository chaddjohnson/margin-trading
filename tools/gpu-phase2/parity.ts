// gpu-phase2 parity gates G1–G6 (PROTOCOL.md §9) for one door (or seeded fixture) and one option set: the canonical CPU
// engine (12 child-process workers, the independent reference) against the CUDA evaluator, bit for bit, on
//   G1 every Growth book, G2 every D1 book (all virtual trades and fills, signals, first decision, standalone figures),
//   G3 the whole PoolResult (lots, fills, worst/best marks and the funding log in detail mode, periods, daily closes,
//      principal/value/held at each close), the canonical record (SRec, or DRec in detail mode) and, in risk mode, the
//      risk-envelope inputs against src/vg-l0-risk-metrics's reference,
//   G5 determinism: the GPU outputs across batch sizes, a shuffled order, a repeat and a server restart.
// Hashes are canonical (bit patterns); any mismatch is re-diffed in process. AD7: only reference identities show values.
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase2/parity.ts --door D24 --options base --random 2000 \
//     [--fine 0] [--strata 2] [--refs] [--branch] [--neighbours 16] [--fixture <seed>] [--detail] [--risk] \
//     [--batches 1,7,13,16,32,50,64,128] [--workers 12] --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { evaluate, evaluateDetail } from '../../src/vg-l0-risk-families/evaluate.ts';
import { structureKey, structureOf } from '../../src/growth140-vgt-s8m/space.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { cacheDir, writeJson } from '../../src/gpu-phase2/context.ts';
import { type DoorSpec, doorLabel, resolveDoor } from '../../src/gpu-phase2/doorSpec.ts';
import { type Subject, branchHeavySubjects, growthStrata, neighbourSubjects, randomSubjects, referenceSubjects } from '../../src/gpu-phase2/subjects.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-phase2/canon.ts';
import { CpuRefPool } from '../../src/gpu-phase2/cpuRefPool.ts';
import { type RefTask, envelopeOf } from '../../src/gpu-phase2/cpuRefWorker.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type TaskResult } from '../../src/gpu-backend/client.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { featureNames } from '../../src/gpu-backend/layout.ts';
import { Rng } from '../../src/optimizer/rng.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const flag = (k: string) => args.includes(`--${k}`);
const out = opt('out', '');

if (!out) throw new Error('--out <json> is required');

const spec: DoorSpec = args.includes('--fixture') ? { kind: 'fixture', seed: Number(opt('fixture', '0')), sessions: Number(opt('sessions', '420')) } : { kind: 'market', name: opt('door', 'D24') as never };
const t0 = Date.now();
const door = await resolveDoor(spec, 'G1-G6 parity');
const label = doorLabel(spec);
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const optionSet = opt('options', 'base');
// the option sets (O): every EvalOptions field the optimization domain uses, alone and all together
const optionSets: Record<string, EvalOptions> = {
  base: vOptions,
  cost10: { ...vOptions, friction: { costBps: 10 } },
  cost20: { ...vOptions, friction: { costBps: 20 } },
  rate14: { ...vOptions, friction: { rate: 0.14 } },
  slip25: { ...vOptions, friction: { stopSlippageBps: 25 } },
  nextopen: { ...vOptions, friction: { stopFill: 'next-open' } },
  native: { ...vOptions, d1Arm: 'native' },
  fund: { ...vOptions, fundFrom: at(0.3) },
  whole: { ...vOptions, wholeShares: true },
  blackout: { ...vOptions, blackouts: [{ first: at(0.2), last: at(0.27) }, { first: at(0.6), last: at(0.64) }] },
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

if (!flag('skip-cpu')) await pool.start();

let lastLog = Date.now();
const cpuLimit = Number(opt('cpu-limit', '0'));
const cpu = flag('skip-cpu') ? tasks.map((t) => ({ k: t.k, ok: true, ms: 0 }) as Awaited<ReturnType<typeof pool.run>>[number]) : await pool.run(cpuLimit ? tasks.slice(0, cpuLimit) : tasks, 4, (d) => {
  if (Date.now() - lastLog > 30000) {
    lastLog = Date.now();
    console.error(`${label}/${optionSet}: CPU ${d}/${tasks.length}`);
  }
});

if (!flag('skip-cpu')) await pool.close();
const cpuSeconds = (Date.now() - t0) / 1000;

// ----- the GPU -----
const ds = exportDataset(door, cacheDir);
const binarySha = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
let server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();
const smoke = await server.smoke();

if (!smoke.ok) throw new Error('GPU smoke self-test failed');
await server.load(ds.file);

const gpuHashes = (r: TaskResult) =>
  r.status !== 0
    ? { status: r.status }
    : { status: 0, books: canonHash(r.books.map(bookView)), pool: canonHash(poolView(r.pool!)), record: canonHash(r.record), envelope: r.envelope ? [r.envelope.bankedDdMarked, r.envelope.bankedDdLiquidation, r.envelope.principalLossMarked, r.envelope.principalLossLiquidation] : null };
const batchOpts = { returnTrades: true, returnSeries: true, tradeCapD1: 1024, tradeCapG: 1024, lotCap: 1024, fundCap: 4096 };
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
const runGpu = async (list: RefTask[], size: number, collect = false) => {
  const res = new Map<string, ReturnType<typeof gpuHashes>>();
  const keep = new Map<string, TaskResult>();
  const step = size > 0 ? size : 4096;
  let kernelMs = 0;

  for (let i = 0; i < list.length; i += step) {
    const b = await server.evaluate(door, list.slice(i, i + step), batchOpts, info.uuid);

    kernelMs += b.receipt.server.totalMs;
    for (const r of b.results) {
      res.set(r.key, gpuHashes(r));
      if (collect) {
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
  return { res, keep, kernelMs };
};

for (const s of subjects) bump(coverage.growthStructures, structureKey(structureOf(s.quad.g.VGT)));

process.on('uncaughtException', (e) => {
  console.error(`GPU phase failed: ${e.message}\n--- server stderr (tail) ---\n${server.stderrTail}`);
  process.exit(4);
});
const primary = await runGpu(tasks, Number(opt('primary-batch', '4096')), true);
const gpuSeconds = (Date.now() - t0) / 1000 - cpuSeconds;

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
  const same = c.books === g.books && c.pool === g.pool && c.record === g.record && JSON.stringify(c.envelope ?? null) === JSON.stringify(g.envelope ?? null);

  if (c.envelope) {
    envelopes++;
    if (!c.envelope.every((x, j) => Object.is(x, g.envelope![j]))) mismatches.push({ k: t.k, envelope: isRef(t.k) ? { cpu: c.envelope, gpu: g.envelope } : 'differs' });
  }
  if (same) identical++;
  else mismatches.push({ k: t.k, books: c.books === g.books, pool: c.pool === g.pool, record: c.record === g.record });
});

// detailed diffs of the first mismatching subjects (in process; values only for reference identities)
const details: unknown[] = [];

for (const m of mismatches.slice(0, 6) as { k: string }[]) {
  const i = tasks.findIndex((t) => t.k === m.k);
  const t = tasks[i]!;
  const x = runWithControls2(door, t.quad, t.controls, t.options, t.detail, false, { cache: false });
  const rec = t.detail ? evaluateDetail(door, t.quad, t.controls, t.options) : evaluate(door, t.quad, t.controls, t.options);
  const g = (await server.evaluate(door, [t], batchOpts, info.uuid)).results[0]!;
  const d = g.status !== 0 ? [{ path: '$', cpu: 'ok', gpu: g.statusText }] : [
    ...deepDiff(x.books.map(bookView), g.books.map(bookView), '$.books', [], 8),
    ...deepDiff(poolView(x.result), poolView(g.pool!), '$.pool', [], 8),
    ...deepDiff(rec, g.record, '$.record', [], 8),
    ...(t.risk ? deepDiff(envelopeOf(door, x, t.options), g.envelope ? [g.envelope.bankedDdMarked, g.envelope.bankedDdLiquidation, g.envelope.principalLossMarked, g.envelope.principalLossLiquidation] : null, '$.envelope', [], 4) : [])
  ];

  details.push({ k: t.k, diffs: isRef(t.k) ? d : d.map((x) => ({ path: x.path, ulps: x.ulps ?? null })) });
}

// ----- G5 determinism -----
const batches = opt('batches', '').split(',').filter(Boolean).map(Number);
const subset = tasks.slice(0, Math.min(tasks.length, Number(opt('determinism-subset', '256'))));
const runs: { run: string; mismatches: number }[] = [];
const sameAsPrimary = (res: Map<string, ReturnType<typeof gpuHashes>>) => subset.filter((t) => JSON.stringify(res.get(t.k)) !== JSON.stringify(primary.res.get(t.k))).length;

for (const b of batches) runs.push({ run: `batch ${b}`, mismatches: sameAsPrimary((await runGpu(subset, b)).res) });
if (batches.length) {
  const rng = new Rng([20261119, 2, 0, 1]);
  const shuffled = [...subset];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);

    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  runs.push({ run: 'shuffled order', mismatches: sameAsPrimary((await runGpu(shuffled, 0)).res) });
  runs.push({ run: 'repeat (same process)', mismatches: sameAsPrimary((await runGpu(subset, 0)).res) });
  await server.close();
  server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  await server.load(ds.file);
  runs.push({ run: 'server restart', mismatches: sameAsPrimary((await runGpu(subset, 0)).res) });
}
await server.close();

const rec = {
  kind: 'gpu-phase2 parity G1-G6',
  t: new Date().toISOString(),
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
  subjects: { total: tasks.length, R: refs.length, bySet: Object.fromEntries(['R', 'A', 'G', 'B', 'N'].map((s) => [s, subjects.filter((x) => x.set === s).length])) },
  result: { identical, mismatches: mismatches.length, envelopesCompared: envelopes, pass: mismatches.length === 0 && runs.every((r) => r.mismatches === 0) },
  mismatchList: mismatches.slice(0, 50).map((m) => (isRef((m as { k: string }).k) ? m : { ...(m as object) })),
  details,
  determinism: { subset: subset.length, runs },
  coverage,
  build: { binary: serverBinary, binarySha256: binarySha, device: info.device, uuid: info.uuid, driver: info.driver, runtime: info.runtime, buildFlags: info.buildFlags, compatDigest: info.compatDigest, dataset: ds.sha256 },
  seconds: { cpu: Math.round(cpuSeconds), gpu: Math.round(gpuSeconds), total: Math.round((Date.now() - t0) / 1000) },
  cpuWorkers: workers,
  host: execFileSync('hostname').toString().trim()
};

writeJson(out, rec);
console.log(JSON.stringify({ door: label, options: optionSet, n: tasks.length, identical, mismatches: mismatches.length, determinism: runs.map((r) => r.mismatches), seconds: rec.seconds }));
if (!rec.result.pass) process.exitCode = 2;
