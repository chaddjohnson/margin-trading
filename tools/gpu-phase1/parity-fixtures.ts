// S4 parity, adversarial set S (PROTOCOL.md §4, §12 G2/G3): seeded synthetic two-symbol doors built to hit the engine's
// edge paths, evaluated by the canonical CPU engine and the GPU slice, compared bit for bit. No market data is read.
//
// Each fixture door: weekdays with random holidays skipped (longer calendar gaps for hold age and interest); per symbol
// 1–24 minute bars on a coarse 0.25 price grid (exact ties at stop levels, rebound triggers, arming and continuation
// thresholds), random opening gaps of up to ±12% (gaps through stops), missing minutes (absent slots), early closes
// (same dates on both symbols: one calendar), sessions without a closing print, single-bar sessions, and both symbols
// printing at the same instants (same-minute decisions of both D1 books: the pool's tie order). Subjects: random D1
// grids at the fixture's scale × every RC 2 family, gate and activation, under base, next-open and slippage frictions.
// Edge-path coverage is counted on the CPU side (exit reasons, carried orders, closing-print fills, open at the end).
//
//   node --experimental-transform-types tools/gpu-phase1/parity-fixtures.ts --doors 6 --subjects 160 --out <json>
import type { MarketSession } from '#types';
import { Rng } from '../../src/optimizer/rng.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { type D1RiskControls2, type RiskConfig2, canonicalConfig2, validateRiskConfig2 } from '../../src/d1-risk-controls-rc2/config.ts';
import type { D1Grid } from '../../src/vg-d1-growth-joint/books.ts';
import { type Door, fixtureDoorOf } from '../../src/vg-d1-growth-joint/data.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { evaluate } from '../../src/vg-l0-risk-families/evaluate.ts';
import { referenceSubjects } from '../../src/gpu-phase1/subjects.ts';
import { seedOf, writeJson } from '../../src/gpu-phase1/context.ts';
import { exportDataset } from '../../src/gpu-phase1/dataset.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { type EvalItem, GpuEvaluator } from '../../src/gpu-phase1/gpu.ts';
import { sessionOf, weekdays } from '../../src/d1-risk-controls/tests/fixtures.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);

  return i >= 0 ? args[i + 1]! : d;
};
const nDoors = Number(opt('doors', '6'));
const nSubjects = Number(opt('subjects', '160'));
const out = opt('out', '');

if (!out) throw new Error('--out <json> is required');

const tick = (x: number) => Math.max(0.25, Math.round(x * 4) / 4);

const fixtureDoor = (d: number): Door => {
  const rng = new Rng(seedOf('fixture-door', d));
  const all = weekdays(Math.round(60 * 1.25), '2021-03-01');
  const dates = all.filter(() => rng.next() > 0.15).slice(0, 60); // holidays: random weekdays absent
  const early = dates.map(() => rng.next() < 0.06);
  const make = (p0: number) => {
    let p = p0;

    return dates.map((date, s): MarketSession => {
      const gap = rng.next() < 0.2 ? (rng.next() - 0.6) * 0.24 : (rng.next() - 0.5) * 0.02;

      p = tick(p * (1 + gap));

      const nBars = rng.next() < 0.1 ? 1 : 2 + rng.int(23);
      const bars = [];
      let slot = 0;
      let last = p;

      for (let k = 0; k < nBars; k++) {
        if (rng.next() < 0.15) slot += 1 + rng.int(4); // missing minutes
        const o = k === 0 ? p : rng.next() < 0.1 ? tick(last * (1 + (rng.next() - 0.6) * 0.06)) : last;
        const c = tick(o * (1 + (rng.next() - 0.52) * 0.04));
        const l = tick(Math.min(o, c) * (1 - rng.next() * 0.03));
        const h = tick(Math.max(o, c) * (1 + rng.next() * 0.02));

        bars.push({ o, c, h: Math.max(h, o, c), l: Math.min(l, o, c), slot });
        slot++;
        last = c;
      }
      p = last;

      const noClosingPrint = s > 0 && rng.next() < 0.06;

      return sessionOf(date, bars, { early: early[s], ...(noClosingPrint ? { closingPrint: null } : {}) });
    });
  };

  return fixtureDoorOf(`gpup1-adversarial-${d}`, { GDX: make(40), VGT: make(100) });
};

const families = ['A', 'B', 'C', 'D'] as const;
const subjectsFor = (d: number) => {
  const nl0 = referenceSubjects()[0]!;
  const out: { key: string; quad: EvalItem['quad']; controls: RiskConfig2 | null; options: EvalOptions }[] = [];

  for (let i = 0; i < nSubjects; i++) {
    const rng = new Rng(seedOf('fixture-subject', d, i));
    const grid = (): D1Grid => ({
      targetPercentChange: 30 + rng.int(171),
      trailingBuyPercentage: 1 + rng.int(30),
      trailingStopPercentage: 10 + rng.int(91),
      maximumHoldDays: 1 + rng.int(8),
      tickWindowSize: 2 + rng.int(5),
      intradayLossBuffer: rng.int(41),
      pullback: 10 + rng.int(91),
      continuationWindow: 1 + rng.int(8)
    });
    const g = { GDX: grid(), VGT: grid() };
    const books: RiskConfig2['books'] = {};

    for (const s of ['GDX', 'VGT'] as const) {
      const fam = families[rng.int(4)]!;
      const c: D1RiskControls2 = {};

      if (fam === 'C') {
        g[s].maximumHoldDays = 3;
        g[s].intradayLossBuffer = 0;
      }
      if (fam !== 'A') c.protectiveStop = { mode: 'on', stopDistanceTenths: 10 + rng.int(111), ...(rng.next() < 0.5 ? { activation: 'entry-day' as const } : {}) };
      if (fam === 'C') c.hold = { mode: 'disabled' };
      if (fam === 'D') c.hold = { mode: 'adaptive', extendedHoldDays: g[s].maximumHoldDays + 1 + rng.int(6), progressTenths: 5 + rng.int(46) };
      if (rng.next() < 0.5) c.declineGate = { mode: 'on', losses: 1 + rng.int(3), recoveryTenths: 100 + rng.int(901), maxBlockSessions: 1 + rng.int(6) };
      if (Object.keys(c).length) books[`D1:${s}`] = c;
    }

    const friction = [{}, { stopFill: 'next-open' as const }, { stopSlippageBps: 25 }, { costBps: 20 }][i % 4]!;
    const withGrowth = i % 5 === 0;

    out.push({
      key: `S:${d}:${i}`,
      quad: { d1: g, g: nl0.quad.g, first: i % 7 === 0 ? 'G' : 'D1' },
      controls: canonicalConfig2(validateRiskConfig2({ version: 2, books })),
      options: { enabled: { 'G:GDX': false, ...(withGrowth ? {} : { 'G:VGT': false }) }, friction }
    });
  }
  return out;
};

const t0 = Date.now();
const rows: Record<string, unknown>[] = [];
const coverage: Record<string, number> = {};
const bump = (k: string, n = 1) => (coverage[k] = (coverage[k] ?? 0) + n);
const gpu = GpuEvaluator.start({ vramBudgetMb: 1024 });

for (let d = 0; d < nDoors; d++) {
  const door = fixtureDoor(d);
  const ds = exportDataset(door, `fixture-${d}`);

  await gpu.load(ds.file);

  const subs = subjectsFor(d);
  const cpuOk: typeof subs = [];
  const cpu = [];

  for (const s of subs) {
    try {
      const x = runWithControls2(door, s.quad, s.controls, s.options, false, false, { cache: false });
      const rec = evaluate(door, s.quad, s.controls, s.options);

      cpu.push({ books: x.books, pool: x.result, rec });
      cpuOk.push(s);
    } catch (e) {
      bump(`cpu threw: ${String((e as Error).message).slice(0, 60)}`);
    }
  }

  // one batch per friction (the pool rate is uniform in every batch)
  const res = new Map<string, Awaited<ReturnType<GpuEvaluator['evaluate']>>['results'][number]>();

  for (const g of [0, 1, 2, 3]) {
    const part = cpuOk.filter((_s, i) => i % 4 === g);

    if (!part.length) continue;

    const b = await gpu.evaluate(door, part, { returnTrades: true, returnLots: true, returnSeries: true, record: true, tradeCap: 256, lotCap: 256 });

    for (const r of b.results) res.set(r.key, r);
  }

  cpuOk.forEach((s, i) => {
    const c = cpu[i]!;
    const g = res.get(s.key)!;
    const diffs = [
      ...(['D1:GDX', 'D1:VGT'] as const).flatMap((b) => {
        const cb = c.books.find((x) => x.book === b)!;
        const gb = g.d1[b]!;

        return gb
          ? deepDiff({ trades: cb.trades, signals: cb.signals, firstDecision: cb.firstDecision, standalone: cb.standalone }, { trades: gb.trades, signals: gb.signals, firstDecision: gb.firstDecision, standalone: gb.standalone }, `$.${b}`)
          : [{ path: b, cpu: 'book', gpu: g.statusText }];
      }),
      ...deepDiff(c.rec.rc, g.rc, '$.rc'),
      ...(g.pool ? deepDiff(c.pool, g.pool, '$.pool') : [{ path: '$.pool', cpu: 'pool', gpu: g.statusText }]),
      ...(g.record ? deepDiff(c.rec, g.record, '$.record') : [{ path: '$.record', cpu: 'record', gpu: g.statusText }])
    ];

    // edge-path coverage (CPU side)
    for (const b of c.books) {
      if (!b.book.startsWith('D1')) continue;
      for (const t of b.trades) {
        bump('virtual trades');
        if (t.eS < 0) bump('order never filled (at end)');
        else if (t.eS !== t.dS) bump('order carried overnight');
        if (t.eS >= 0 && t.eK === door.sym[b.book === 'D1:GDX' ? 'GDX' : 'VGT'].ds.sBarCount[t.eS]) bump('closing-print entry');
        if (t.open) bump('position open at end');
        if (t.kind === 'continuation') bump('continuation entry');
        for (const f of t.fills) {
          bump(`exit: ${f.reason}`);
          if (f.s === t.eS) bump('exit on the entry session');
        }
      }
    }
    const rc = c.rec.rc;

    for (const v of Object.values(rc)) {
      if (!v) continue;
      bump('decline-gate blocks', v.blocks);
      bump('blocked sessions', v.blockedSessions);
      bump('adaptive extensions', v.adaptive);
      bump('entry-day exits', v.entryDay);
    }
    bump('pool refusals (slot occupied)', c.pool.refusals['slot occupied'] ?? 0);
    bump('pool lots', c.pool.lots.length);
    if (c.pool.lots.some((l) => l.open)) bump('pool lot open at end');

    rows.push({ key: s.key, friction: s.options.friction, growth: s.options.enabled?.['G:VGT'] !== false, first: s.quad.first, status: g.statusText, pass: g.status === 0 && diffs.length === 0, diffs: diffs.slice(0, 6) });
  });
  console.log(`fixture ${d}: ${door.sessions} sessions, ${cpuOk.length} subjects`);
}
await gpu.close();

const failed = rows.filter((r) => !r.pass);

writeJson(out, {
  kind: 'gpu-phase1 S4 adversarial fixture parity',
  doors: nDoors,
  subjectsPerDoor: nSubjects,
  tolerance: 'zero (bit-exact)',
  pass: failed.length === 0,
  compared: rows.length,
  failed: failed.length,
  coverage,
  wallSeconds: (Date.now() - t0) / 1000,
  failures: failed.slice(0, 40)
});
console.log(`fixtures: ${rows.length - failed.length}/${rows.length} bit-exact → ${failed.length ? 'FAIL' : 'PASS'}`);
console.log(JSON.stringify(coverage));
