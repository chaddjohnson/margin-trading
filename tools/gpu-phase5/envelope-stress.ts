// gpu-phase5 root cause (PROTOCOL.md §4.3 H3): the captured CPU-reference transient, reproduced and DISSECTED. Fresh
// processes (cold V8 isolates), several at once (CPU contention changes when optimized code is installed), each run the
// first chunk of CPU reference worker 0 of Phase 4's D24-fund run — the four reference identities, exactly the
// statements of the worker's `reference` (cache-free run, evaluateDetail, the three hashes, the envelope) — with the
// envelope computed by the same statements as `envelopeOf` but KEEPING the ledger and the portfolio path. Then the same
// four tasks again (warm). A cold envelope that differs from the warm one is a transient; the kept path is inspected:
// every lot-exit point must hold the realized net as it was at that exit.
//   node --experimental-transform-types tools/gpu-phase5/envelope-stress.ts --procs 20 --seconds 180 [--v8 "<flags>"] [--from 0 --to 4] --out <json>
//   (child mode: --child)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { evaluateDetail } from '../../src/vg-l0-risk-families/evaluate.ts';
import { toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, portfolioPath, tradeRisk } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { resolveDoor } from '../../src/gpu-phase5/doorSpec.ts';
import { writeJson } from '../../src/gpu-phase5/context.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-backend/canon.ts';
import { bitsOf } from '../../src/gpu-phase5/bits.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);

if (args.includes('--child')) {
  const door = await resolveDoor({ kind: 'market', name: 'D24' }, 'gpu-phase5 envelope stress (CPU reference, cold isolate)');
  const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
  const options = { ...vOptions, fundFrom: at(0.3) };
  const subjects = [...referenceSubjects(), ...randomSubjects(1500, 'O-fund', 'coarse', 0), ...growthStrata(2, 'O-fund-G')];
  const from = Number(opt('from', '0'));
  const to = Number(opt('to', '4'));
  // the statements of src/gpu-phase5/cpuRefWorker.ts envelopeOf, keeping L and pts
  const probe = (x: ReturnType<typeof runWithControls2>) => {
    const L = toLedger({ door, subject: null as never, options, books: x.books, result: x.result, rec: null as never });
    const pts = portfolioPath(L);
    const trades = L.lots.map((l) => tradeRisk(l, L.endT));
    const max = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b).at(-1)! : 0);

    return {
      env: [bankedDrawdown(pts, 'marked').max, bankedDrawdown(pts, 'liquidation').max, max(trades.map((t) => t.principalLossMarked)), max(trades.map((t) => t.principalLossLiq))],
      L,
      pts
    };
  };
  const pass = () =>
    subjects.slice(from, to).map((s) => {
      const x = runWithControls2(door, s.quad, s.controls, options, true, false, { cache: false });
      const rec = evaluateDetail(door, s.quad, s.controls, options);
      const h = { books: canonHash(x.books.map(bookView)), pool: canonHash(poolView(x.result)), record: canonHash(rec) };

      return { k: s.key, h, ...probe(x) };
    });
  const cold = pass();
  const warm = pass();
  const events: unknown[] = [];

  cold.forEach((c, i) => {
    const w = warm[i]!;
    const same = c.env.every((v, j) => Object.is(v, w.env[j])) && c.h.books === w.h.books && c.h.pool === w.h.pool && c.h.record === w.h.record;
    // the direct check of EVERY cold path (a wrong point need not move the envelope): against the path rebuilt now
    // from the same kept ledger
    const check = portfolioPath(c.L);
    let direct = check.length === c.pts.length ? 0 : 1;

    for (let j = 0; j < Math.min(check.length, c.pts.length) && !direct; j++) {
      const a = c.pts[j]!;
      const b = check[j]!;

      if (!Object.is(a.m, b.m) || !Object.is(a.liq, b.liq) || !Object.is(a.r, b.r) || a.t !== b.t || a.lot !== b.lot) direct++;
    }
    if (same && !direct) return;
    // dissect the COLD path: lot-exit points against the realized net accumulated independently
    const exits: unknown[] = [];
    let acc = 0;
    let lot = 0;
    const after: number[] = [];

    for (const l of c.L.lots) if (!l.open) after.push((acc += l.net));
    let unsorted = 0;

    for (let j = 1; j < c.pts.length; j++) {
      const p = c.pts[j]!;

      if (p.t < c.pts[j - 1]!.t) unsorted++;
      if (p.lot !== null) continue;
      const e = after[lot]!;

      if (!Object.is(p.m, e) || !Object.is(p.liq, e) || !Object.is(p.r, e))
        exits.push({ pointIndex: j, date: p.date, exitOfLot: lot, expected: e, m: p.m, liq: p.liq, r: p.r, mEqualsRealizedNetAfterLot: after.indexOf(p.m), liqEqualsRealizedNetAfterLot: after.indexOf(p.liq), rEqualsRealizedNetAfterLot: after.indexOf(p.r) });
      lot++;
    }
    // the same kept path through the same functions again, and a path rebuilt from the same kept ledger
    const againSamePath = [bankedDrawdown(c.pts, 'marked').max, bankedDrawdown(c.pts, 'liquidation').max];
    const rebuilt = portfolioPath(c.L);
    const againRebuiltPath = [bankedDrawdown(rebuilt, 'marked').max, bankedDrawdown(rebuilt, 'liquidation').max];
    let pointDiffs = 0;
    let firstPointDiff: unknown = null;

    for (let j = 0; j < Math.max(rebuilt.length, c.pts.length); j++) {
      const a = c.pts[j];
      const b = rebuilt[j];

      if (!a || !b || !Object.is(a.m, b.m) || !Object.is(a.liq, b.liq) || !Object.is(a.r, b.r) || a.t !== b.t || a.lot !== b.lot) {
        pointDiffs++;
        firstPointDiff ??= { j, cold: a ?? null, rebuilt: b ?? null };
      }
    }
    events.push({
      taskOrdinal: i,
      k: c.k,
      hashesEqual: c.h.books === w.h.books && c.h.pool === w.h.pool && c.h.record === w.h.record,
      envelopeEqual: c.env.every((v, j) => Object.is(v, w.env[j])),
      coldEnvelope: c.env,
      warmEnvelope: w.env,
      coldEnvelopeBits: c.env.map(bitsOf),
      points: c.pts.length,
      lots: c.L.lots.length,
      pathNotSortedInTime: unsorted,
      wrongExitPoints: exits.length,
      exitPoints: exits.slice(0, 40),
      sameKeptPathEvaluatedAgain: againSamePath,
      pathRebuiltFromTheSameKeptLedger: { envelope: againRebuiltPath, pointsDifferingFromTheColdPath: pointDiffs, firstDifference: firstPointDiff }
    });
  });
  process.stdout.write(`\n${JSON.stringify({ events, warm: warm.map((w) => w.env) })}\n`);
  process.exit(0);
}

const procs = Number(opt('procs', '20'));
const until = Date.now() + Number(opt('seconds', '180')) * 1000;
const v8 = opt('v8', '').split(' ').filter(Boolean);
const out = opt('out', '');
let finished = 0;
let bad = 0;
let crashed = 0;
const samples: unknown[] = [];
const warmSeen = new Set<string>();
// --trace <dir>: every child runs with V8's tiering trace (--trace-opt --trace-deopt --trace-osr) written to its own
// file; the file is kept only for a child with a transient (the lines about the risk-metrics functions are extracted)
const traceDir = opt('trace', '');
let serial = 0;
const one = () =>
  new Promise<void>((resolve) => {
    const id = serial++;
    const traceFile = traceDir ? path.join(traceDir, `trace-${process.pid}-${id}.log`) : '';
    const traceFd = traceFile ? fs.openSync(traceFile, 'w') : null;
    const c = spawn(
      process.execPath,
      [...v8, ...(traceDir ? ['--trace-opt', '--trace-deopt', '--trace-osr'] : []), '--expose-gc', '--max-old-space-size=3072', '--experimental-transform-types', '--disable-warning=ExperimentalWarning', import.meta.filename, '--child', '--from', opt('from', '0'), '--to', opt('to', '4')],
      { stdio: ['ignore', 'pipe', 'inherit'] }
    );
    let buf = '';
    let keep = false;

    // V8 writes its trace to stdout: the child's own report is its last line (a JSON object)
    c.stdout.on('data', (d: Buffer) => {
      if (traceFd !== null) fs.writeSync(traceFd, d);
      buf = (buf + d.toString()).slice(-4_000_000);
    });
    c.on('exit', (code) => {
      finished++;
      try {
        // the child's report: the last line that is its JSON object (V8 may trace after it)
        const line = buf.split('\n').findLast((l) => l.startsWith('{"events":')) ?? '';
        const r = JSON.parse(line) as { events: unknown[]; warm: number[][] };

        if (code !== 0) crashed++;
        warmSeen.add(JSON.stringify(r.warm));
        if (r.events.length) {
          bad++;
          keep = true;
          if (samples.length < 20) samples.push(traceFile ? { events: r.events, traceFile } : r.events);
        }
      } catch {
        crashed++;
      }
      if (traceFd !== null) {
        fs.closeSync(traceFd);
        if (!keep && !(traceDir && id < 2)) fs.rmSync(traceFile, { force: true }); // two clean traces are kept for comparison
      }
      resolve();
    });
  });
const lane = async () => {
  while (Date.now() < until) await one();
};

await Promise.all(Array.from({ length: procs }, lane));

const rec = {
  kind: 'gpu-phase5 envelope stress: the CPU reference of the four reference identities (D24, fund) in cold isolates',
  t: new Date().toISOString(),
  node: process.version,
  v8: process.versions.v8,
  v8Flags: v8,
  concurrentProcesses: procs,
  seconds: Number(opt('seconds', '180')),
  tasks: [Number(opt('from', '0')), Number(opt('to', '4'))],
  processes: finished,
  processesWithATransient: bad,
  crashed,
  rate: finished ? bad / finished : null,
  distinctWarmEnvelopeSets: warmSeen.size,
  samples
};

if (out) writeJson(out, rec);
console.log(JSON.stringify({ ...rec, samples: undefined, firstSample: samples[0] ?? null }));
