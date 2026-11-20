// gpu-phase5 root cause (PROTOCOL.md §4.3 H3): a FAST detector of the captured V8 transient (two object literals of one
// site sharing their number boxes), for bisecting V8 configurations. Fresh processes; each builds a seeded synthetic
// door (Phase 4's adversarial fixture: no market data, built in milliseconds), runs the CPU engine's cache-free pooled
// evaluation of seeded Assignment 3 genomes and, for each, the UNCHANGED portfolioPath (through toLedger) — then
// rebuilds every path from its kept ledger at the end and compares point by point. A differing point is the transient.
//   node --experimental-transform-types tools/gpu-phase5/alias-hunt.ts --procs 20 --seconds 120 [--v8 "<flags>"] [--tasks 40] [--passes 1] --out <json>
import { spawn } from 'node:child_process';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, portfolioPath } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { randomSubjects } from '../../src/gpu-phase4/subjects.ts';
import { fixtureDoor } from '../../src/gpu-phase4/fixtures.ts';
import { writeJson } from '../../src/gpu-phase5/context.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);

if (args.includes('--child')) {
  const door = fixtureDoor(Number(opt('fixture', '0')), Number(opt('sessions', '420')));
  const subjects = randomSubjects(Number(opt('tasks', '40')), 'ALIAS', 'coarse', 0);
  const kept: { k: string; pass: number; L: ReturnType<typeof toLedger>; pts: ReturnType<typeof portfolioPath>; env: number[] }[] = [];
  let errors = 0;

  for (let pass = 0; pass < Number(opt('passes', '1')); pass++)
    for (const s of subjects) {
      try {
        const x = runWithControls2(door, s.quad, s.controls, vOptions, true, false, { cache: false });
        const L = toLedger({ door, subject: null as never, options: vOptions, books: x.books, result: x.result, rec: null as never });
        const pts = portfolioPath(L);

        kept.push({ k: s.key, pass, L, pts, env: [bankedDrawdown(pts, 'marked').max, bankedDrawdown(pts, 'liquidation').max] });
      } catch {
        errors++; // a configuration the engine refuses (both passes alike)
      }
    }

  const events: unknown[] = [];
  let points = 0;
  let exits = 0;

  kept.forEach((c, ordinal) => {
    const check = portfolioPath(c.L);
    const diffs: unknown[] = [];

    points += c.pts.length;
    for (let j = 0; j < Math.max(check.length, c.pts.length); j++) {
      const a = c.pts[j];
      const b = check[j];

      if (a && a.lot === null && j > 0) exits++;
      if (!a || !b || !Object.is(a.m, b.m) || !Object.is(a.liq, b.liq) || !Object.is(a.r, b.r) || a.t !== b.t || a.lot !== b.lot)
        if (diffs.length < 6) diffs.push({ j, isExitPoint: a?.lot === null, got: a ?? null, expected: b ?? null });
    }
    if (diffs.length) {
      const env2 = [bankedDrawdown(check, 'marked').max, bankedDrawdown(check, 'liquidation').max];

      events.push({ ordinal, pass: c.pass, k: c.k, lots: c.L.lots.length, points: c.pts.length, diffs, envelopeChanged: !c.env.every((v, i) => Object.is(v, env2[i])) });
    }
  });
  process.stdout.write(`${JSON.stringify({ events, paths: kept.length, points, exits, errors })}\n`);
  process.exit(0);
}

const procs = Number(opt('procs', '20'));
const until = Date.now() + Number(opt('seconds', '120')) * 1000;
const v8 = opt('v8', '').split(' ').filter(Boolean);
const out = opt('out', '');
let finished = 0;
let bad = 0;
let crashed = 0;
let paths = 0;
let exits = 0;
let events = 0;
const samples: unknown[] = [];
const one = () =>
  new Promise<void>((resolve) => {
    const c = spawn(
      process.execPath,
      [...v8, '--experimental-transform-types', '--disable-warning=ExperimentalWarning', import.meta.filename, '--child', '--tasks', opt('tasks', '40'), '--passes', opt('passes', '1'), '--fixture', opt('fixture', '0'), '--sessions', opt('sessions', '420')],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    let buf = '';

    c.stdout.on('data', (d: Buffer) => (buf += d.toString()));
    c.on('exit', (code) => {
      finished++;
      try {
        const r = JSON.parse(buf.trim().split('\n').at(-1) ?? '') as { events: unknown[]; paths: number; exits: number };

        if (code !== 0) crashed++;
        paths += r.paths;
        exits += r.exits;
        events += r.events.length;
        if (r.events.length) {
          bad++;
          if (samples.length < 16) samples.push(r.events);
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
  kind: 'gpu-phase5 alias hunt: portfolioPath in cold isolates on a synthetic door',
  t: new Date().toISOString(),
  node: process.version,
  v8: process.versions.v8,
  v8Flags: v8,
  concurrentProcesses: procs,
  seconds: Number(opt('seconds', '120')),
  tasksPerProcess: Number(opt('tasks', '40')),
  passes: Number(opt('passes', '1')),
  fixture: { seed: Number(opt('fixture', '0')), sessions: Number(opt('sessions', '420')) },
  processes: finished,
  processesWithAWrongPath: bad,
  wrongPaths: events,
  pathsChecked: paths,
  exitPointsChecked: exits,
  crashed,
  rate: finished ? bad / finished : null,
  samples
};

if (out) writeJson(out, rec);
console.log(JSON.stringify({ ...rec, samples: undefined, firstSample: samples[0] ?? null }));
