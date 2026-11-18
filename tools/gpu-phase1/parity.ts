// S4 parity gates G2–G5 (PROTOCOL.md §12): the GPU slice against the canonical CPU engine, bit for bit.
//
// Per door/window: export the door's exact Datasets, start the GPU server, then for every subject compare
//   G2  each D1 book: every virtual trade (all fields), signals, first decision, the standalone figures, the RC counters
//   G3  the pooled replay: the whole PoolResult (lots and fills, decisions, refusals, marks, drawdowns with their
//       instants, daily closes, principal/value/held at each close, peaks) and the canonical record (recordOf + RC lite)
//   G5  the GPU outputs' hashes across batch sizes, repeated runs, a server restart and a shuffled order
// and G4 for the reference identities (sealed targets of research/vg-l0-risk-metrics/results/baseline/parity.json).
// AD7: for non-reference subjects only booleans, counts, ULP distances and hashes are written (values redacted).
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase1/parity.ts --door D24 --random 64 --neighbours 16 \
//     --batches 1,7,64,0 --out <json>          (batch size 0 = all subjects in one batch)
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { d1Cache2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { caches } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { evaluate } from '../../src/vg-l0-risk-families/evaluate.ts';
import { Rng } from '../../src/optimizer/rng.ts';
import { type DoorKey, openDoor, seedOf, writeJson } from '../../src/gpu-phase1/context.ts';
import { exportDataset } from '../../src/gpu-phase1/dataset.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { type EvalItem, type GpuItemResult, GpuEvaluator } from '../../src/gpu-phase1/gpu.ts';
import { type Subject, branchHeavySubjects, neighbourSubjects, randomSubjects, referenceSubjects } from '../../src/gpu-phase1/subjects.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);

  return i >= 0 ? args[i + 1]! : d;
};
const doorName = opt('door', 'D24') as DoorKey;
const nRandom = Number(opt('random', '64'));
const nNeighbours = Number(opt('neighbours', '16'));
const batches = opt('batches', '0').split(',').map(Number);
const out = opt('out', '');
const optionSet = opt('options', 'base');
// the realistic-execution stresses the qualification runs (standard §5.1), and native arming
const optionSets: Record<string, EvalOptions> = {
  base: vOptions,
  cost10: { ...vOptions, friction: { costBps: 10 } },
  cost20: { ...vOptions, friction: { costBps: 20 } },
  rate14: { ...vOptions, friction: { rate: 0.14 } },
  slip25: { ...vOptions, friction: { stopSlippageBps: 25 } },
  nextopen: { ...vOptions, friction: { stopFill: 'next-open' } },
  native: { ...vOptions, d1Arm: 'native' }
};
const options = optionSets[optionSet];

if (!options) throw new Error(`unknown --options ${optionSet}`);

const sealedFile = 'research/vg-l0-risk-metrics/results/baseline/parity.json';
const sealedSha = '83e610b9e1b9168a3070d3f96bfa6738fcb9730d639c2a77abddc49158bf69f8';

if (!out) throw new Error('--out <json> is required');

const t0 = Date.now();
const door = await openDoor(doorName, 'S4 parity');
const ds = exportDataset(door);
const refs = referenceSubjects();
const subjects: Subject[] = [...refs, ...randomSubjects(nRandom, 'PARITY'), ...branchHeavySubjects(refs[0]!.quad), ...neighbourSubjects(refs, nNeighbours)];
const items: EvalItem[] = subjects.map((s) => ({ key: s.key, quad: s.quad, controls: s.controls, options }));

// ----- the canonical CPU reference -----
const cpu = subjects.map((s) => {
  caches['G:VGT'].clear();
  d1Cache2.clear();

  const x = runWithControls2(door, s.quad, s.controls, options, false, false, { cache: false });

  caches['G:VGT'].clear();
  d1Cache2.clear();

  const rec = evaluate(door, s.quad, s.controls, options);

  return { books: x.books, pool: x.result, rec };
});
const cpuSeconds = (Date.now() - t0) / 1000;

// ----- canonical hashing of GPU outputs (doubles by bit pattern) -----
const canon = (x: unknown): unknown => {
  if (typeof x === 'number') return Object.is(x, -0) ? '-0' : Number.isNaN(x) ? 'NaN' : Number.isFinite(x) ? Buffer.from(new Float64Array([x]).buffer).toString('hex') : String(x);
  if (ArrayBuffer.isView(x)) return Array.from(x as unknown as ArrayLike<number>, canon);
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, canon(v)]));
  return x;
};
const hashOf = (r: GpuItemResult) =>
  createHash('sha256')
    .update(JSON.stringify(canon({ status: r.status, d1: r.d1, rc: r.rc, pool: r.pool, record: r.record })))
    .digest('hex')
    .slice(0, 16);

// ----- GPU runs -----
const runGpu = async (gpu: GpuEvaluator, list: EvalItem[], size: number) => {
  const res = new Map<string, GpuItemResult>();
  const step = size > 0 ? size : list.length;
  let kernelMs = 0;

  for (let i = 0; i < list.length; i += step) {
    const b = await gpu.evaluate(door, list.slice(i, i + step), { returnTrades: true, returnLots: true, returnSeries: true, record: true, tradeCap: 1024, lotCap: 1024 });

    kernelMs += b.timing.server.d1KernelMs + b.timing.server.poolKernelMs;
    for (const r of b.results) res.set(r.key, r);
  }
  return { res, kernelMs };
};

let gpu = GpuEvaluator.start({ vramBudgetMb: 2400 });
const info = await gpu.info();
const load = await gpu.load(ds.file);
const primary = await runGpu(gpu, items, batches[0]!);

// ----- compare (G2, G3) -----
const isRef = (k: string) => k.startsWith('R:');
const redact = (k: string, d: ReturnType<typeof deepDiff>) => (isRef(k) ? d : d.map((x) => ({ path: x.path, ulps: x.ulps ?? null, cpu: '(redacted, AD7)', gpu: '(redacted, AD7)' })));
const rows = subjects.map((s, i) => {
  const g = primary.res.get(s.key)!;
  const c = cpu[i]!;
  const d1Diffs = (['D1:GDX', 'D1:VGT'] as const).flatMap((b) => {
    const cb = c.books.find((x) => x.book === b)!;
    const gb = g.d1[b];

    if (!gb) return [{ path: `${b}`, cpu: 'book', gpu: 'missing' }];

    return deepDiff(
      { trades: cb.trades, signals: cb.signals, firstDecision: cb.firstDecision, endIndex: cb.endIndex, standalone: cb.standalone },
      { trades: gb.trades, signals: gb.signals, firstDecision: gb.firstDecision, endIndex: gb.endIndex, standalone: gb.standalone },
      `$.${b}`
    );
  });
  const rcDiffs = deepDiff(c.rec.rc, g.rc, '$.rc');
  const poolDiffs = g.pool ? deepDiff(c.pool, g.pool, '$.pool') : [{ path: '$.pool', cpu: 'result', gpu: 'missing' }];
  const recDiffs = g.record ? deepDiff(c.rec, g.record, '$.record') : [{ path: '$.record', cpu: 'record', gpu: 'missing' }];
  const counts = {
    d1GDX: c.books.find((x) => x.book === 'D1:GDX')!.trades.length,
    d1VGT: c.books.find((x) => x.book === 'D1:VGT')!.trades.length,
    lots: c.pool.lots.length,
    decisions: Object.values(c.pool.decisions).reduce((a, d) => a + d.total, 0),
    marks: c.pool.marks
  };

  return {
    key: s.key,
    set: s.set,
    status: g.statusText,
    g2: g.status === 0 && d1Diffs.length === 0 && rcDiffs.length === 0,
    g3: g.status === 0 && poolDiffs.length === 0 && recDiffs.length === 0,
    counts,
    gpuHash: hashOf(g),
    diffs: redact(s.key, [...d1Diffs, ...rcDiffs, ...poolDiffs, ...recDiffs].slice(0, 12)),
    ...(isRef(s.key)
      ? { reference: { net: c.rec.net, dd: c.rec.dd, ddUnrounded: g.pool?.dd.max, lots: c.rec.lots, signature: c.rec.signature, gpuSignature: g.record?.signature, realized: c.rec.realized, unrealized: c.rec.unrealized, years: c.rec.years } }
      : {})
  };
});

// ----- G4: the reference identities against their sealed values -----
let g4: Record<string, unknown> = { applicable: false };
const sealedText = fs.readFileSync(sealedFile, 'utf8');

if ((doorName === 'FULL' || doorName === 'D24') && optionSet === 'base') {
  if (createHash('sha256').update(sealedText).digest('hex') !== sealedSha) throw new Error(`${sealedFile} is not the pinned sealed record`);

  const sealed = JSON.parse(sealedText) as { rows: { key: string; full: Record<string, unknown>; development: Record<string, unknown> }[] };

  g4 = Object.fromEntries(
    refs.map((r) => {
      const k = r.key.slice(2);
      const t = sealed.rows.find((x) => x.key === k)![doorName === 'FULL' ? 'full' : 'development'] as { net: number; dd: number; lots: number; signature: string; reconciliation: { ddMax: number }; years?: Record<string, number>; realized?: number; unrealized?: number };
      const g = primary.res.get(r.key)!;
      const checks: Record<string, boolean> = {
        net: g.record!.net === t.net,
        dd: g.record!.dd === t.dd,
        ddUnroundedBits: g.pool!.dd.max === t.reconciliation.ddMax,
        lots: g.record!.lots === t.lots,
        signature: g.record!.signature === t.signature,
        ...(t.years ? { years: JSON.stringify(g.record!.years) === JSON.stringify(t.years) } : {}),
        ...(t.realized !== undefined ? { realized: g.record!.realized === t.realized, unrealized: g.record!.unrealized === t.unrealized } : {})
      };

      return [k, { pass: Object.values(checks).every(Boolean), checks, gpu: { net: g.record!.net, dd: g.record!.dd, ddUnrounded: g.pool!.dd.max, lots: g.record!.lots, signature: g.record!.signature } }];
    })
  );
  g4.applicable = true;
}

// ----- G5: determinism (batch sizes, repeats, restart, shuffled order) -----
const ref = new Map(rows.map((r) => [r.key, r.gpuHash]));
const det: { run: string; mismatches: number; kernelMs: number }[] = [];
const check = (label: string, r: { res: Map<string, GpuItemResult>; kernelMs: number }) => {
  let m = 0;

  for (const [k, v] of r.res) if (hashOf(v) !== ref.get(k)) m++;
  det.push({ run: label, mismatches: m, kernelMs: r.kernelMs });
};

for (const b of batches.slice(1)) check(`batch ${b || 'all'}`, await runGpu(gpu, items, b));
check('repeat (same process)', await runGpu(gpu, items, batches[0]!));
await gpu.close();
gpu = GpuEvaluator.start({ vramBudgetMb: 2400 });
await gpu.load(ds.file);
check('server restart', await runGpu(gpu, items, batches[0]!));

const rng = new Rng(seedOf('shuffle', doorName));
const shuffled = [...items];

for (let i = shuffled.length - 1; i > 0; i--) {
  const j = rng.int(i + 1);

  [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
}
check('shuffled order', await runGpu(gpu, shuffled, batches[0]!));
await gpu.close();

const bySet = (set: string) => {
  const rs = rows.filter((r) => set === 'all' || r.set === set);

  return { n: rs.length, g2: rs.filter((r) => r.g2).length, g3: rs.filter((r) => r.g3).length, failed: rs.filter((r) => !(r.g2 && r.g3)).map((r) => r.key) };
};
const summary = Object.fromEntries(['all', 'R', 'A', 'B', 'N'].map((s) => [s, bySet(s)]));
const pass = summary.all!.g2 === rows.length && summary.all!.g3 === rows.length && det.every((d) => d.mismatches === 0) && (!g4.applicable || Object.values(g4).every((v) => typeof v !== 'object' || (v as { pass: boolean }).pass));

const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const build = Object.fromEntries(
  ['research/gpu-phase1-feasibility/build/gp1', 'src/gpu-phase1/cuda/gp1.h', 'src/gpu-phase1/cuda/gp1_device.cuh', 'src/gpu-phase1/cuda/gp1_kernels.cuh', 'src/gpu-phase1/cuda/gp1.cu', 'src/gpu-phase1/gpu.ts', 'src/gpu-phase1/compare.ts'].map((f) => [f, sha(f)])
);

writeJson(out, {
  kind: 'gpu-phase1 S4 parity',
  build,
  door: doorName,
  options: { set: optionSet, value: options },
  dataset: { file: ds.file.replace(/.*research\//, 'research/'), sha256: ds.sha256, sessions: ds.sessions, bars: ds.bars },
  server: { info, load },
  tolerance: 'zero: bit-exact doubles (Object.is), identical integers, strings and key order',
  subjects: { R: refs.length, A: nRandom, B: subjects.filter((s) => s.set === 'B').length, N: subjects.filter((s) => s.set === 'N').length },
  pass,
  summary,
  g4,
  determinism: det,
  maxCounts: { d1GDX: Math.max(...rows.map((r) => r.counts.d1GDX)), d1VGT: Math.max(...rows.map((r) => r.counts.d1VGT)), lots: Math.max(...rows.map((r) => r.counts.lots)) },
  cpuSeconds,
  wallSeconds: (Date.now() - t0) / 1000,
  rows
});
console.log(`${doorName} [${optionSet}]: G2 ${summary.all!.g2}/${rows.length}, G3 ${summary.all!.g3}/${rows.length}, G4 ${JSON.stringify(Object.fromEntries(Object.entries(g4).map(([k, v]) => [k, typeof v === 'object' ? (v as { pass: boolean }).pass : v])))}, G5 ${det.map((d) => `${d.run}:${d.mismatches}`).join(' ')} → ${pass ? 'PASS' : 'FAIL'}`);
