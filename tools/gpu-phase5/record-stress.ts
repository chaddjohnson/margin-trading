// gpu-phase5 root cause (PROTOCOL.md §4.5): the RECORD path of the CPU reference under the conditions that produce the
// captured transient. Fresh processes (cold V8 isolates), several at once, each run a chunk of Phase 4's D24-fund task
// list exactly as a CPU reference worker does (src/gpu-phase5/cpuRefWorker.ts referenceFull: the cache-free run,
// evaluateDetail, the three hashes, the envelope), keeping the original objects; then the same chunk again (warm), and
// once more. A cold or second-pass result that differs from the last pass is a transient; its ORIGINAL record (and
// books and pool when their hashes differ) is compared leaf by leaf with the last pass's, and each differing number is
// checked for the alias signature (it equals the same field of a sibling object created by the same literal site).
// GROUND TRUTH: before the stress the parent runs ONE child with --no-maglev (--emit-truth), which evaluates the chunk
// twice and must agree with itself; every stress child compares each of its three passes with that truth (hashes,
// envelope, and the record leaf by leaf), so a process whose later passes are also wrong is still measured correctly.
// For the original candidate the truth is also checked against Phase 4's own diagnostics (record f17d66f4…).
//   node --experimental-transform-types tools/gpu-phase5/record-stress.ts --procs 20 --seconds 1200 [--from 32 --to 40] [--v8 "<flags>"] --out <json>
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { resolveDoor } from '../../src/gpu-phase5/doorSpec.ts';
import { writeJson } from '../../src/gpu-phase5/context.ts';
import { bookView } from '../../src/gpu-backend/canon.ts';
import { type RefTask, referenceFull } from '../../src/gpu-phase5/cpuRefWorker.ts';
import { type Leaf, leavesOf } from '../../src/gpu-phase5/bits.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);

if (args.includes('--child')) {
  const door = await resolveDoor({ kind: 'market', name: 'D24' }, 'gpu-phase5 record stress (CPU reference, cold isolate)');
  const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
  const options = { ...vOptions, fundFrom: at(0.3) };
  const subjects = [...referenceSubjects(), ...randomSubjects(1500, 'O-fund', 'coarse', 0), ...growthStrata(2, 'O-fund-G')];
  const tasks: RefTask[] = subjects.slice(Number(opt('from', '32')), Number(opt('to', '40'))).map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options, detail: true, risk: true }));
  if (args.includes('--emit-truth')) {
    const a = tasks.map((t) => referenceFull(door, t));
    const b = tasks.map((t) => referenceFull(door, t));
    const consistent = a.every((x, i) => x.result.record === b[i]!.result.record && x.result.books === b[i]!.result.books && x.result.pool === b[i]!.result.pool && JSON.stringify(x.result.envelope) === JSON.stringify(b[i]!.result.envelope));

    if (!consistent) throw new Error('the --no-maglev truth run does not agree with itself');
    fs.writeFileSync(
      opt('emit-truth', ''),
      JSON.stringify(Object.fromEntries(b.map((x) => [x.result.k, { books: x.result.books, pool: x.result.pool, record: x.result.record, envelope: x.result.envelope, recordLeaves: leavesOf(x.original!.rec), booksLeaves: leavesOf(x.original!.books.map(bookView)) }])))
    );
    process.exit(0);
  }

  type Truth = Record<string, { books: string; pool: string; record: string; envelope: number[]; recordLeaves: Leaf[]; booksLeaves: Leaf[] }>;
  const truth = JSON.parse(fs.readFileSync(opt('truth', ''), 'utf8')) as Truth;
  const passes = [0, 1, 2].map(() => tasks.map((t) => referenceFull(door, t)));
  const events: unknown[] = [];
  const diffLeaves = (a: Leaf[], b: Leaf[]) => {
    const out: { path: string; got: Leaf | null; expected: Leaf | null; aliasOf?: string | null }[] = [];
    const byPath = new Map(a.map((l) => [l.path, l]));

    for (let j = 0; j < Math.max(a.length, b.length) && out.length < 24; j++) {
      const x = a[j] ?? null;
      const y = b[j] ?? null;

      if (!x || !y || x.path !== y.path || x.kind !== y.kind || x.value !== y.value) {
        // the alias signature: the wrong number equals the same field of the NEXT (or previous) sibling of its array/object
        let aliasOf: string | null = null;
        const m = x && /^(.*)\[(\d+)\](\.[^[\]]+)$/.exec(x.path);

        if (m && x)
          for (const d of [1, -1, 2, -2]) {
            const sib = byPath.get(`${m[1]}[${Number(m[2]) + d}]${m[3]}`);

            if (sib && sib.value === x.value) {
              aliasOf = sib.path;
              break;
            }
          }
        // an object keyed by name (e.g. $.virtual.D1:GDX.net): the same field of another key of the same parent
        const o = x && /^(.*)\.([^.[\]]+)\.([^.[\]]+)$/.exec(x.path);

        if (!aliasOf && o && x && x.kind === 'n')
          for (const l of a)
            if (l !== x && l.kind === 'n' && l.value === x.value && l.path.startsWith(`${o[1]}.`) && l.path.endsWith(`.${o[3]}`) && l.path.split('.').length === x.path.split('.').length) {
              aliasOf = l.path;
              break;
            }
        out.push({ path: (x ?? y)!.path, got: x && { ...x, value: x.value.slice(0, 80) }, expected: y && { ...y, value: y.value.slice(0, 80) }, aliasOf });
      }
    }
    return out;
  };

  for (const pass of [0, 1, 2])
    passes[pass]!.forEach((c, i) => {
      const w = truth[c.result.k]!;
      const env = (c.result.envelope ?? []).every((v, j) => Object.is(v, w.envelope[j]));
      const same = c.result.books === w.books && c.result.pool === w.pool && c.result.record === w.record && env;

      if (same) return;
      events.push({
        pass,
        ordinalInPass: i,
        k: c.result.k,
        differsFromTruth: { books: c.result.books !== w.books, pool: c.result.pool !== w.pool, record: c.result.record !== w.record, envelope: !env },
        hashes: { observed: { books: c.result.books, pool: c.result.pool, record: c.result.record }, truth: { books: w.books, pool: w.pool, record: w.record } },
        envelope: { observed: c.result.envelope, truth: w.envelope },
        // observed (got) against the truth (expected), leaf by leaf, from the ORIGINAL objects of this evaluation
        recordLeaves: c.original && c.result.record !== w.record ? diffLeaves(leavesOf(c.original.rec), w.recordLeaves) : [],
        booksLeaves: c.original && c.result.books !== w.books ? diffLeaves(leavesOf(c.original.books.map(bookView)), w.booksLeaves) : []
      });
    });
  process.stdout.write(`\n${JSON.stringify({ events, evaluations: tasks.length * 3 })}\n`);
  process.exit(0);
}

const procs = Number(opt('procs', '20'));
const until = Date.now() + Number(opt('seconds', '1200')) * 1000;
const v8 = opt('v8', '').split(' ').filter(Boolean);
const out = opt('out', '');
let finished = 0;
let bad = 0;
let crashed = 0;
let evaluations = 0;
const kinds = { record: 0, books: 0, pool: 0, envelope: 0, recordOnly: 0 };
const byPass = [0, 0, 0];
const byTask: Record<string, number> = {};
const samples: unknown[] = [];
// the ground truth: one --no-maglev child, self-consistent
const truthFile = `${out || '/dev/null'}.truth.json`;
const tr = spawnSync(
  process.execPath,
  ['--no-maglev', '--expose-gc', '--max-old-space-size=3072', '--experimental-transform-types', '--disable-warning=ExperimentalWarning', import.meta.filename, '--child', '--from', opt('from', '32'), '--to', opt('to', '40'), '--emit-truth', truthFile],
  { stdio: ['ignore', 'inherit', 'inherit'] }
);

if (tr.status !== 0) throw new Error('the truth run failed');

const truthAll = JSON.parse(fs.readFileSync(truthFile, 'utf8')) as Record<string, { record: string; books: string; pool: string }>;
const known = truthAll['O-fund:coarse:28'];
const truthMatchesPhase4 = known ? known.record === 'f17d66f45b4fa8806c67d4f4' && known.books === 'd35779dd11801eed1c933e9f' && known.pool === 'da74e7dfc43950fa6d7c910d' : null;
const one = () =>
  new Promise<void>((resolve) => {
    const c = spawn(
      process.execPath,
      [...v8, '--expose-gc', '--max-old-space-size=3072', '--experimental-transform-types', '--disable-warning=ExperimentalWarning', import.meta.filename, '--child', '--from', opt('from', '32'), '--to', opt('to', '40'), '--truth', truthFile],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    let buf = '';

    c.stdout.on('data', (d: Buffer) => (buf = (buf + d.toString()).slice(-4_000_000)));
    c.on('exit', (code) => {
      finished++;
      try {
        const line = buf.split('\n').findLast((l) => l.startsWith('{"events":')) ?? '';
        const r = JSON.parse(line) as { events: { pass: number; k: string; differsFromTruth: Record<string, boolean> }[]; evaluations: number };

        if (code !== 0) crashed++;
        evaluations += r.evaluations;
        if (r.events.length) {
          bad++;
          for (const e of r.events) {
            for (const k of ['record', 'books', 'pool', 'envelope'] as const) if (e.differsFromTruth[k]) kinds[k]++;
            if (e.differsFromTruth.record && !e.differsFromTruth.books && !e.differsFromTruth.pool && !e.differsFromTruth.envelope) kinds.recordOnly++;
            byPass[e.pass]!++;
            byTask[e.k] = (byTask[e.k] ?? 0) + 1;
          }
          if (samples.length < 40) samples.push(r.events);
        }
      } catch {
        crashed++;
      }
      resolve();
    });
  });
const lane = async () => {
  while (Date.now() < until) await one();
};

await Promise.all(Array.from({ length: procs }, lane));

const rec = {
  kind: 'gpu-phase5 record stress: CPU reference chunks of Phase 4 D24-fund in cold isolates (three passes each)',
  t: new Date().toISOString(),
  node: process.version,
  v8: process.versions.v8,
  v8Flags: v8,
  concurrentProcesses: procs,
  seconds: Number(opt('seconds', '1200')),
  tasks: [Number(opt('from', '32')), Number(opt('to', '40'))],
  processes: finished,
  evaluations,
  processesWithAWrongEvaluation: bad,
  wrongEvaluations: byPass.reduce((a, b) => a + b, 0),
  wrongEvaluationsByDifferingPart: kinds,
  wrongEvaluationsByPass: { cold: byPass[0], second: byPass[1], third: byPass[2] },
  wrongEvaluationsByTask: byTask,
  truth: { source: 'one child with --no-maglev, two passes, self-consistent', file: truthFile, originalCandidateEqualsPhase4Diagnostics: truthMatchesPhase4 },
  crashed,
  samples
};

if (out) writeJson(out, rec);
console.log(JSON.stringify({ ...rec, samples: undefined, firstSample: samples[0] ?? null }).slice(0, 4000));
