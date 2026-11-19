// S1 CPU baseline, part 1: the cost of each evaluation component on ONE thread (PROTOCOL.md §12 G1).
//
// For every subject on every door: the two controlled D1 books (runD1BookRc2), the Growth·VGT book (runGrowthBook),
// the pooled replay (runPool) and the compact record (recordOf), each built FRESH (no book cache), timed with
// performance.now(); then the study's real evaluation path (vg-l0-risk-families `evaluate`, caches cleared) end to end,
// whose record must deep-equal the composed one. One warm-up pass per door; `reps` timed repetitions; medians kept.
// Only counts, hashes and timings are recorded for non-reference subjects (AD7).
//
//   node --expose-gc --experimental-transform-types tools/gpu-phase1/profile-components.ts \
//     --doors D24,FULL,W-QUIET,W-CRASH,W-BEAR,W-TREND --random 48 --reps 3 --out <json>
import os from 'node:os';
import { createHash } from 'node:crypto';
import { runD1BookRc2 } from '../../src/d1-risk-controls-rc2/book.ts';
import { d1Cache2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { type VBook, baseFriction, runGrowthBook } from '../../src/vg-d1-growth-joint/books.ts';
import { caches, datasetsOf, poolOptionsOf, recordOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { runPool } from '../../src/vg-d1-growth-joint/pool.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { evaluate } from '../../src/vg-l0-risk-families/evaluate.ts';
import { type DoorKey, median, openDoor, quantileOf, writeJson } from '../../src/gpu-phase1/context.ts';
import { type Subject, branchHeavySubjects, randomSubjects, referenceSubjects } from '../../src/gpu-phase1/subjects.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);

  return i >= 0 ? args[i + 1]! : d;
};
const doors = opt('doors', 'D24').split(',') as DoorKey[];
const nRandom = Number(opt('random', '48'));
const reps = Number(opt('reps', '3'));
const out = opt('out', '');
const gc = (globalThis as { gc?: () => void }).gc;

if (!gc) throw new Error('run with --expose-gc');
if (!out) throw new Error('--out <json> is required');

const refs = referenceSubjects();
const subjects: Subject[] = [...refs, ...randomSubjects(nRandom), ...branchHeavySubjects(refs[0]!.quad)];
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const now = () => performance.now();

interface Row {
  door: string;
  key: string;
  set: string;
  ms: { d1GDX: number; d1VGT: number; growthVGT: number; pool: number; record: number; composed: number; evaluate: number };
  counts: { d1GDX: number; d1VGT: number; growthVGT: number; lots: number; decisions: number; marks: number };
  recordHash: string;
  equal: boolean;
}

const rows: Row[] = [];
const loads: Record<string, { ms: number; sessions: number; bars: Record<string, number> }> = {};
const t0 = Date.now();

for (const name of doors) {
  const tl = now();
  const door = await openDoor(name, 'S1 component profile');

  loads[name] = {
    ms: Math.round(now() - tl),
    sessions: door.sessions,
    bars: { GDX: door.sym.GDX.ds.barCount, VGT: door.sym.VGT.ds.barCount }
  };

  const end = door.sessions - 1;
  const fr = baseFriction;
  const one = (s: Subject) => {
    const c = s.controls;
    const ta = now();
    const gdx = runD1BookRc2(door.sym.GDX.ds, 'GDX', s.quad.d1.GDX, c?.books['D1:GDX'] ?? null, { armStart: 0, accountingStart: 0, endIndex: end, friction: fr });
    const tb = now();
    const vgt = runD1BookRc2(door.sym.VGT.ds, 'VGT', s.quad.d1.VGT, c?.books['D1:VGT'] ?? null, { armStart: 0, accountingStart: 0, endIndex: end, friction: fr });
    const tc = now();
    const g = runGrowthBook(door.sym.VGT, door, s.quad.g.VGT, { friction: fr, costBps: fr.costBps });
    const td = now();
    const books = [gdx, vgt, g] as unknown as VBook[];
    const result = runPool(datasetsOf(door), books, s.quad.first, { ...poolOptionsOf(door, vOptions, false), recordMarks: false, endIndex: end });
    const te = now();
    const rec = recordOf(door, s.quad, { books, result }, vOptions);
    const tf = now();

    caches['G:VGT'].clear();
    d1Cache2.clear();

    const tg = now();
    const full = evaluate(door, s.quad, s.controls, vOptions);
    const th = now();
    const fullRec: Omit<typeof full, 'rc'> & { rc?: unknown } = { ...full };

    delete fullRec.rc;
    const composedRec = s.controls ? { ...rec, id: fullRec.id } : rec;

    caches['G:VGT'].clear();
    d1Cache2.clear();

    return {
      ms: { d1GDX: tb - ta, d1VGT: tc - tb, growthVGT: td - tc, pool: te - td, record: tf - te, composed: tf - ta, evaluate: th - tg },
      counts: {
        d1GDX: gdx.trades.length,
        d1VGT: vgt.trades.length,
        growthVGT: g.trades.length,
        lots: result.lots.length,
        decisions: Object.values(result.decisions).reduce((a, d) => a + d.total, 0),
        marks: result.marks
      },
      recordHash: hash(fullRec),
      equal: JSON.stringify(composedRec) === JSON.stringify(fullRec)
    };
  };

  // warm-up: JIT and inline caches (not recorded)
  for (const s of subjects.slice(0, 6)) one(s);
  gc();

  let sinceGc = 0;

  for (const s of subjects) {
    const samples: ReturnType<typeof one>[] = [];

    for (let r = 0; r < reps; r++) samples.push(one(s));
    // the production cadence (A3 worker: a full GC every 64 evaluations); a forced GC right before a sample makes
    // the next computation ≈ 20 ms slower, so GCs fall between subjects and medians of ≥ 3 repetitions are kept
    sinceGc += reps * 2;
    if (sinceGc >= 64) {
      gc();
      sinceGc = 0;
    }

    const pick = (k: keyof Row['ms']) => median(samples.map((x) => x.ms[k]));

    if (new Set(samples.map((x) => x.recordHash)).size !== 1) throw new Error(`${s.key} on ${name}: nondeterministic record`);
    rows.push({
      door: name,
      key: s.key,
      set: s.set,
      ms: { d1GDX: pick('d1GDX'), d1VGT: pick('d1VGT'), growthVGT: pick('growthVGT'), pool: pick('pool'), record: pick('record'), composed: pick('composed'), evaluate: pick('evaluate') },
      counts: samples[0]!.counts,
      recordHash: samples[0]!.recordHash,
      equal: samples.every((x) => x.equal)
    });
  }

  console.log(`${name}: ${subjects.length} subjects × ${reps} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

// summaries per door and set
const comps = ['d1GDX', 'd1VGT', 'growthVGT', 'pool', 'record', 'composed', 'evaluate'] as const;
const summary: Record<string, unknown> = {};

for (const name of doors)
  for (const set of ['all', 'R', 'A', 'B']) {
    const rs = rows.filter((r) => r.door === name && (set === 'all' || r.set === set));

    if (!rs.length) continue;

    const s: Record<string, unknown> = { n: rs.length };

    for (const c of comps) {
      const xs = rs.map((r) => r.ms[c]);

      s[c] = { mean: xs.reduce((a, b) => a + b, 0) / xs.length, median: median(xs), p90: quantileOf(xs, 0.9), max: Math.max(...xs) };
    }

    const mean = (c: (typeof comps)[number]) => (s[c] as { mean: number }).mean;
    const total = mean('d1GDX') + mean('d1VGT') + mean('growthVGT') + mean('pool') + mean('record');

    s.shareOfComposed = {
      d1Books: (mean('d1GDX') + mean('d1VGT')) / total,
      growth: mean('growthVGT') / total,
      pool: mean('pool') / total,
      record: mean('record') / total
    };
    s.maxCounts = {
      d1GDX: Math.max(...rs.map((r) => r.counts.d1GDX)),
      d1VGT: Math.max(...rs.map((r) => r.counts.d1VGT)),
      growthVGT: Math.max(...rs.map((r) => r.counts.growthVGT)),
      lots: Math.max(...rs.map((r) => r.counts.lots))
    };
    summary[`${name}/${set}`] = s;
  }

writeJson(out, {
  kind: 'gpu-phase1 S1 component profile',
  host: { cpus: os.cpus()[0]?.model, threads: os.cpus().length, node: process.version },
  method: { reps, warmup: 'first 6 subjects once per door', timer: 'performance.now()', caches: 'off (fresh books; caches cleared before evaluate)', gc: 'forced every >= 64 evaluations between subjects (A3 worker cadence), never inside a timing; medians of reps' },
  subjects: { R: refs.length, A: nRandom, B: subjects.filter((s) => s.set === 'B').length },
  loads,
  allRecordsEqual: rows.every((r) => r.equal),
  summary,
  rows,
  wallSeconds: (Date.now() - t0) / 1000
});
console.log(`records equal: ${rows.every((r) => r.equal)}; wrote ${out}`);
