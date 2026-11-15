// Synthetic adverse scenarios for the D1 protective stop (brief §1: "Test synthetic −10%, −20% and −30% gap scenarios and
// relevant halt/illiquidity limitations"), on RC 2's unchanged book runner. The dip-buy of RC 1's crash path fills at 90
// on Friday 2021-03-05; the next session opens 10%, 20% or 30% lower. Every family with the stop (B, C, D) and both
// activations: a gap through the level fills at the gapped OPEN (reason "protective stop gap"), so the realized loss is
// the gap plus costs and interest — far beyond the 8% distance: a protective stop is NOT a loss cap. A gap inside the
// distance does not stop. A halt (the session's first two hours absent) fills at the first trade after it; on the entry
// day a later minute opening through the level fills at that open. Under the next-open stress a minute low through the
// level fills at the following minute's open. Family A (no stop) only leaves at its maximum hold. No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession } from '#types';
import type { Dataset } from '../../four-family/data.ts';
import { type D1Grid, type Friction, baseFriction } from '../../vg-d1-growth-joint/books.ts';
import { type Bar, datasetOf, sessionOf, weekdays } from '../../d1-risk-controls/tests/fixtures.ts';
import { grid } from '../../d1-risk-controls/tests/scenarios.ts';
import { runD1BookRc2 } from '../../d1-risk-controls-rc2/book.ts';
import type { D1RiskControls2 } from '../../d1-risk-controls-rc2/config.ts';

const opts = (ds: Dataset, friction?: Friction) => ({ armStart: 0, accountingStart: 0, endIndex: ds.sessionCount - 1, friction });
const flat3 = (p: number): Bar[] => [{ o: p, c: p }, { o: p, c: p }, { o: p, c: p }];
const sessions = (spec: Bar[][]): MarketSession[] => {
  const dates = weekdays(spec.length);

  return spec.map((x, i) => sessionOf(dates[i]!, x));
};
const run = (ss: MarketSession[], c: D1RiskControls2 | null, g: D1Grid = grid(), friction?: Friction) => {
  const ds = datasetOf(ss);

  return { ds, b: runD1BookRc2(ds, 'VGT', g, c, opts(ds, friction)) };
};
const netAt = (raw: number, entryRaw: number, days: number, costBps = 5) =>
  (100_000 / (entryRaw * (1 + costBps / 1e4))) * raw * (1 - costBps / 1e4) - 100_000 - (100_000 * 0.11 * days) / 365;
// the dip-buy (filled at 90 in minute 4 of Friday 2021-03-05), the rest of that session, then `next`
const dip = (after: Bar[], next: Bar[][]) =>
  sessions([
    flat3(100),
    flat3(100),
    flat3(100),
    flat3(100),
    [{ o: 95, c: 95 }, { o: 95, c: 89.5 }, { o: 89.5, c: 89 }, { o: 89, c: 90 }, { o: 90, c: 90.5 }, ...after],
    ...next
  ]);
const stopOf = (d: number, activation: 'next-session' | 'entry-day', hold?: D1RiskControls2['hold']): D1RiskControls2 => ({
  protectiveStop: { mode: 'on', stopDistanceTenths: d, ...(activation === 'entry-day' ? { activation } : {}) },
  ...(hold ? { hold } : {})
});
const families: [string, D1RiskControls2['hold'] | undefined][] = [
  ['B (legacy hold)', undefined],
  ['C (hold disabled)', { mode: 'disabled' }],
  ['D (adaptive hold)', { mode: 'adaptive', extendedHoldDays: 20, progressTenths: 50 }]
];

describe('gap scenarios: a protective stop is not a loss cap', () => {
  for (const gap of [0.1, 0.2, 0.3])
    for (const [fam, hold] of families)
      for (const activation of ['next-session', 'entry-day'] as const)
        it(`−${gap * 100}% gap through an 8% stop, family ${fam}, ${activation}: fills at the gapped open`, () => {
          const open = 90 * (1 - gap);
          const { ds, b } = run(dip([{ o: 90.5, c: 90.4 }], [[{ o: open, c: open }], flat3(open), flat3(open)]), stopOf(80, activation, hold));
          const t = b.trades[0]!;
          const f = t.fills[0]!;

          assert.deepEqual([ds.dates[t.eS], t.eRaw], ['2021-03-05', 90]);
          assert.deepEqual([ds.dates[f.s], f.k, f.raw, f.reason], ['2021-03-08', 0, open, 'protective stop gap']);
          assert.ok(Math.abs(t.vNet - netAt(open, 90, 3)) < 1e-6, `${t.vNet}`);
          assert.ok(t.vNet < -gap * 100_000, `the loss ${t.vNet.toFixed(2)} exceeds the gap, never the 8% distance`);
        });

  it('a −10% gap inside a 20% stop does not stop: B leaves at its maximum hold, C stays open to the end', () => {
    const next = [[{ o: 81, c: 81 }], ...Array.from({ length: 12 }, () => flat3(81))];
    const b = run(dip([{ o: 90.5, c: 90.4 }], next), stopOf(200, 'next-session')).b.trades[0]!;
    const c = run(dip([{ o: 90.5, c: 90.4 }], next), stopOf(200, 'next-session', { mode: 'disabled' })).b.trades[0]!;

    assert.ok(b.fills.every((f) => !f.reason.startsWith('protective')), 'no protective exit inside the distance');
    assert.equal(b.fills.at(-1)!.reason.includes('hold'), true, `B exits by ${b.fills.at(-1)!.reason}`);
    assert.equal(c.fills.length, 0, 'C has no loss exit inside the distance and no hold: still open');
  });

  it('a −30% gap through a 25% stop still loses the full 30%', () => {
    const t = run(dip([{ o: 90.5, c: 90.4 }], [[{ o: 63, c: 63 }], flat3(63)]), stopOf(250, 'next-session')).b.trades[0]!;

    assert.deepEqual([t.fills[0]!.raw, t.fills[0]!.reason], [63, 'protective stop gap']);
    assert.ok(t.vNet < -30_000);
  });

  it('family A (no stop) rides the same −30% gap to its maximum hold', () => {
    const next = [[{ o: 63, c: 63 }], ...Array.from({ length: 8 }, () => flat3(63))];
    const t = run(dip([{ o: 90.5, c: 90.4 }], next), null).b.trades[0]!;

    assert.ok(t.fills.every((f) => !f.reason.startsWith('protective')));
    assert.ok(t.vNet < -30_000, `${t.vNet}`);
  });
});

describe('halts and illiquidity', () => {
  it('a halt (the next session’s first 120 minutes absent) fills at the first trade after it, below the level', () => {
    const halted: Bar[] = [{ o: 70, c: 71, slot: 120 }, { o: 71, c: 71, slot: 121 }];
    const t = run(dip([{ o: 90.5, c: 90.4 }], [halted, flat3(71)]), stopOf(80, 'next-session')).b.trades[0]!;

    assert.deepEqual([t.fills[0]!.k, t.fills[0]!.raw, t.fills[0]!.reason], [0, 70, 'protective stop gap']);
    assert.ok(t.vNet < -20_000);
  });

  it('entry day: minutes missing after the fill, the next present minute opens through the level and fills at that open', () => {
    const t = run(dip([{ o: 78, c: 79, slot: 300 }], [flat3(79), flat3(79)]), stopOf(80, 'entry-day')).b.trades[0]!;

    assert.deepEqual([t.fills[0]!.k, t.fills[0]!.raw, t.fills[0]!.reason], [5, 78, 'protective stop']);
    assert.ok(Math.abs(t.vNet - netAt(78, 90, 0)) < 1e-6 && t.vNet < -8_000);
  });

  it('next-open stress: a minute low through the level fills at the next minute’s open, below the level', () => {
    const after: Bar[] = [{ o: 90.5, h: 90.5, l: 82, c: 83 }, { o: 81, c: 81 }];
    const s = run(dip(after, [flat3(81), flat3(81)]), stopOf(80, 'entry-day')).b.trades[0]!;
    const n = run(dip(after, [flat3(81), flat3(81)]), stopOf(80, 'entry-day'), grid(), { ...baseFriction, stopFill: 'next-open' }).b.trades[0]!;

    assert.equal(s.fills[0]!.raw, 90 * 0.92, 'stop fill convention: at the level');
    assert.equal(n.fills[0]!.raw, 81, 'next-open: the following minute’s open');
    assert.ok(n.vNet < s.vNet);
  });
});
