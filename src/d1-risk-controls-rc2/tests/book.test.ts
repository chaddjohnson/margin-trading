// The RC 2 book on synthetic paths: next-session activation equals RC 1 exactly (scenarios and random paths, grids,
// controls, stop fills and stresses) and legacy controls equal Priority 3's runD1Book; entry-day activation exits a
// same-session adverse move after the fill (in a later minute or in the fill minute itself), is not a loss cap (a minute
// opening through L on the entry day, or a gap on the next morning, loses more than the 8% distance), does nothing
// after a closing-print fill, protects an order carried overnight from the opening trade on, counts for the decline
// gate, gets the stop-slippage stress, and is deterministic. No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession } from '#types';
import type { Dataset } from '../../four-family/data.ts';
import { type D1Grid, type Friction, baseFriction, runD1Book } from '../../vg-d1-growth-joint/books.ts';
import { runD1BookWithControls } from '../../d1-risk-controls/book.ts';
import type { D1RiskControls } from '../../d1-risk-controls/config.ts';
import { type Bar, datasetOf, sessionOf, weekdays } from '../../d1-risk-controls/tests/fixtures.ts';
import { type Day, crash, grid, pathOf, recovery, whipsaw } from '../../d1-risk-controls/tests/scenarios.ts';
import { type RiskVBook2, runD1BookRc2 } from '../book.ts';
import type { D1RiskControls2 } from '../config.ts';

const opts = (ds: Dataset, friction?: Friction) => ({ armStart: 0, accountingStart: 0, endIndex: ds.sessionCount - 1, friction });
const flat3 = (p: number): Bar[] => [{ o: p, c: p }, { o: p, c: p }, { o: p, c: p }];
const sessions = (spec: (Bar[] | { bars: Bar[]; closingPrint?: number | null })[]): MarketSession[] => {
  const dates = weekdays(spec.length);

  return spec.map((x, i) =>
    Array.isArray(x) ? sessionOf(dates[i]!, x) : sessionOf(dates[i]!, x.bars, x.closingPrint === undefined ? {} : { closingPrint: x.closingPrint })
  );
};
const runOn = (ss: MarketSession[], c: D1RiskControls2 | null, g: D1Grid = grid(), friction?: Friction) => {
  const ds = datasetOf(ss);

  return { ds, b: runD1BookRc2(ds, 'VGT', g, c, opts(ds, friction)) };
};
const stop = (d: number, activation?: 'entry-day' | 'next-session'): D1RiskControls2 => ({
  protectiveStop: { mode: 'on', stopDistanceTenths: d, ...(activation ? { activation } : {}) }
});
const ED8 = stop(80, 'entry-day');
const NS8 = stop(80);
const behaviour = (b: RiskVBook2) => {
  const { rc: _rc, key: _key, ...rest } = b;

  return rest;
};
const date = (ds: Dataset, s: number) => ds.dates[s]!;
const netAt = (raw: number, entryRaw: number, days: number, costBps = 5) =>
  (100_000 / (entryRaw * (1 + costBps / 1e4))) * raw * (1 - costBps / 1e4) - 100_000 - (100_000 * 0.11 * days) / 365;

// The dip-buy of RC 1's crash path (armed at 89.5, rebound at 90, filled at the next minute's open, 90) on Friday
// 2021-03-05, with minutes after the fill in that session (`after`), then the following sessions (`next`).
const dip = (after: Bar[], next: Bar[][] = [[{ o: 80, c: 79 }, { o: 79, c: 78 }], flat3(78), flat3(78)]) =>
  sessions([
    flat3(100),
    flat3(100),
    flat3(100),
    flat3(100),
    [{ o: 95, c: 95 }, { o: 95, c: 89.5 }, { o: 89.5, c: 89 }, { o: 89, c: 90 }, { o: 90, c: 90.5 }, ...after],
    ...next
  ]);
const L8 = 90 * (1 - 80 / 1000);

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('compatibility: next-session activation is RC 1, legacy controls are Priority 3', () => {
  for (const [name, days] of Object.entries({ crash, recovery, whipsaw }))
    it(`${name}: RC 2 = RC 1 for next-session controls (absent and explicit), and = Priority 3 for legacy`, () => {
      const ds = datasetOf(pathOf(days));
      const p3 = runD1Book(ds, 'VGT', grid(), opts(ds));
      const { rc: _rc, ...legacy } = runD1BookRc2(ds, 'VGT', grid(), null, opts(ds));

      assert.deepEqual(legacy, p3);

      const rc1Stop: D1RiskControls = { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } };

      for (const [c, rc1] of [
        [NS8, rc1Stop],
        [stop(80, 'next-session'), rc1Stop],
        [{ ...stop(80, 'next-session'), hold: { mode: 'disabled' } }, { ...rc1Stop, hold: { mode: 'disabled' } }]
      ] as [D1RiskControls2, D1RiskControls][])
        assert.deepEqual(runD1BookRc2(ds, 'VGT', grid(), c, opts(ds)), runD1BookWithControls(ds, 'VGT', grid(), rc1, opts(ds)));
    });

  it('identical to RC 1 on 150 random paths × grids × random next-session controls (every family, the gate), both stop fills, stresses', () => {
    const r = rng(19);
    let trades = 0;
    let protective = 0;

    for (let i = 0; i < 150; i++) {
      const days: Day[] = [];
      let p = 100;

      for (let d = 0; d < 40; d++) {
        const open = p * (1 + (r() < 0.2 ? (r() - 0.6) * 0.1 : 0));
        const closes: number[] = [];

        p = open;
        for (let k = 0; k < 2 + Math.floor(r() * 5); k++) closes.push((p *= 1 + (r() - 0.5) * 0.05));
        days.push({ open, closes, closingPrint: r() < 0.1 ? null : undefined });
      }

      const ds = datasetOf(pathOf(days));
      const g = grid({
        targetPercentChange: 30 + Math.floor(r() * 120),
        trailingBuyPercentage: 1 + Math.floor(r() * 30),
        trailingStopPercentage: 20 + Math.floor(r() * 100),
        maximumHoldDays: 1 + Math.floor(r() * 12),
        tickWindowSize: 1 + Math.floor(r() * 6),
        intradayLossBuffer: Math.floor(r() * 60),
        pullback: 10 + Math.floor(r() * 100),
        continuationWindow: 1 + Math.floor(r() * 10)
      });
      const fam = Math.floor(r() * 4);
      const c: D1RiskControls = {};

      if (fam > 0) c.protectiveStop = { mode: 'on', stopDistanceTenths: 10 + Math.floor(r() * 150) };
      if (fam === 2) c.hold = { mode: 'disabled' };
      if (fam === 3) c.hold = { mode: 'adaptive', extendedHoldDays: g.maximumHoldDays + 1 + Math.floor(r() * 20), progressTenths: 5 + Math.floor(r() * 100) };
      if (r() < 0.5) c.declineGate = { mode: 'on', losses: 1 + Math.floor(r() * 3), recoveryTenths: 100 + Math.floor(r() * 900), maxBlockSessions: 1 + Math.floor(r() * 10) };

      const fr: Friction = {
        ...baseFriction,
        stopFill: r() < 0.5 ? 'stop' : 'next-open',
        costBps: r() < 0.5 ? 5 : 20,
        rate: r() < 0.5 ? 0.11 : 0.14,
        stopSlippageBps: r() < 0.5 ? 0 : 25
      };
      const rc1 = runD1BookWithControls(ds, 'VGT', g, c, opts(ds, fr));
      const explicit: D1RiskControls2 = c.protectiveStop?.mode === 'on' ? { ...c, protectiveStop: { ...c.protectiveStop, activation: 'next-session' } } : c;

      trades += rc1.trades.length;
      protective += rc1.rc.summary.protectiveExits;
      assert.deepEqual(runD1BookRc2(ds, 'VGT', g, c, opts(ds, fr)), rc1, `path ${i}`);
      assert.deepEqual(runD1BookRc2(ds, 'VGT', g, explicit, opts(ds, fr)), rc1, `path ${i} (explicit next-session)`);
    }
    assert.ok(trades > 300 && protective > 20, `the random paths trade (${trades}) and stop out (${protective})`);
  });
});

describe('entry-day activation in a book', () => {
  it('a same-session adverse move after the fill exits at L that session (next-session waits for the next open)', () => {
    const ss = dip([{ o: 90.5, c: 85 }, { o: 85, c: 82 }, { o: 82, c: 81 }]);
    const e = runOn(ss, ED8);
    const n = runOn(ss, NS8);
    const te = e.b.trades[0]!;
    const tn = n.b.trades[0]!;

    assert.deepEqual([date(e.ds, te.eS), te.eK, te.eRaw], ['2021-03-05', 4, 90]);
    assert.deepEqual([date(e.ds, te.fills[0]!.s), te.fills[0]!.k, te.fills[0]!.raw, te.fills[0]!.reason], ['2021-03-05', 6, L8, 'protective stop']);
    assert.ok(Math.abs(te.vNet - netAt(L8, 90, 0)) < 1e-6, 'no interest on the entry session');
    assert.ok(te.fills[0]!.t > te.eT, 'the exit is after the fill');
    assert.equal(e.b.rc.trades[0]!.entryDayExit, true);
    assert.equal(e.b.rc.trades[0]!.activation, 'entry-day');
    assert.equal(e.b.rc.summary.entryDayExits, 1);
    // next-session: the gap the following Monday (80 ≤ L), three calendar days of interest
    assert.deepEqual([date(n.ds, tn.fills[0]!.s), tn.fills[0]!.k, tn.fills[0]!.raw, tn.fills[0]!.reason], ['2021-03-08', 0, 80, 'protective stop gap']);
    assert.ok(Math.abs(tn.vNet - netAt(80, 90, 3)) < 1e-6);
    assert.equal(n.b.rc.trades[0]!.entryDayExit, undefined, 'a next-session book carries no RC 2 field');
  });

  it('a fill-minute low through L exits in the fill minute itself (stop fill) or at the next minute’s open (next-open)', () => {
    const ss = sessions([
      flat3(100),
      flat3(100),
      flat3(100),
      flat3(100),
      [{ o: 95, c: 95 }, { o: 95, c: 89.5 }, { o: 89.5, c: 89 }, { o: 89, c: 90 }, { o: 90, h: 90.5, l: 82, c: 84 }, { o: 84, c: 85 }],
      flat3(85),
      flat3(85)
    ]);
    const s = runOn(ss, ED8).b.trades[0]!;
    const n = runOn(ss, ED8, grid(), { ...baseFriction, stopFill: 'next-open' }).b.trades[0]!;

    assert.deepEqual([s.eK, s.fills[0]!.k, s.fills[0]!.raw, s.fills[0]!.t === s.eT], [4, 4, L8, true]);
    assert.deepEqual([n.eK, n.fills[0]!.k, n.fills[0]!.raw], [4, 5, 84]);
  });

  it('is not a loss cap: a minute opening through L on the entry day loses more than the 8% distance', () => {
    const t = runOn(dip([{ o: 90.5, c: 85 }, { o: 78, c: 79 }]), ED8).b.trades[0]!;

    assert.deepEqual([t.fills[0]!.k, t.fills[0]!.raw], [6, 78]);
    assert.ok(t.vNet < -8_000 && Math.abs(t.vNet - netAt(78, 90, 0)) < 1e-6, `${t.vNet.toFixed(2)}`);
  });

  it('is not a loss cap: a position the entry day did not stop gaps far through L the next morning', () => {
    const t = runOn(dip([{ o: 90.5, c: 88 }, { o: 88, c: 87 }], [[{ o: 70, c: 71 }], flat3(71), flat3(71)]), ED8).b.trades[0]!;

    assert.deepEqual([t.fills[0]!.k, t.fills[0]!.raw, t.fills[0]!.reason], [0, 70, 'protective stop gap']);
    assert.ok(t.vNet < -20_000, `an 8% stop realized ${t.vNet.toFixed(2)}`);
  });

  it('a closing-print fill has nothing to observe: identical to next-session', () => {
    const ss = sessions([
      flat3(100),
      flat3(100),
      flat3(100),
      flat3(100),
      [{ o: 95, c: 95 }, { o: 95, c: 89.5 }, { o: 89.5, c: 89 }, { o: 89, l: 50, c: 90 }],
      [{ o: 80, c: 79 }],
      flat3(79)
    ]);
    const e = runOn(ss, ED8).b;
    const n = runOn(ss, NS8).b;

    assert.equal(e.trades[0]!.eK, 4, 'the closing print (k = the bar count)');
    assert.deepEqual(behaviour(e), behaviour(n));
    assert.equal(e.rc.summary.entryDayExits, 0);
  });

  it('an order carried overnight fills at the opening trade and is protected from that trade on', () => {
    const ss = sessions([
      flat3(100),
      flat3(100),
      flat3(100),
      flat3(100),
      [{ o: 95, c: 95, slot: 0 }, { o: 95, c: 89.5, slot: 1 }, { o: 89.5, c: 89, slot: 2 }, { o: 89, c: 90, slot: 389 }],
      [{ o: 91, l: 84, c: 88 }, { o: 88, l: 83, c: 83 }, { o: 83, c: 85 }],
      flat3(85)
    ]);
    const { ds, b } = runOn(ss, ED8);
    const t = b.trades[0]!;

    assert.deepEqual([date(ds, t.dS), date(ds, t.eS), t.eK, t.eRaw], ['2021-03-05', '2021-03-08', 0, 91]);
    assert.deepEqual([date(ds, t.fills[0]!.s), t.fills[0]!.k, t.fills[0]!.raw], ['2021-03-08', 1, 91 * 0.92]);
  });

  it('counts as a failed attempt for the decline gate (K = 1 blocks the next arming)', () => {
    const c: D1RiskControls2 = { ...ED8, declineGate: { mode: 'on', losses: 1, recoveryTenths: 1000, maxBlockSessions: 3 } };
    const { b } = runOn(dip([{ o: 90.5, c: 85 }, { o: 85, c: 82 }, { o: 82, c: 81 }]), c);

    assert.equal(b.rc.trades[0]!.entryDayExit, true);
    assert.deepEqual(b.rc.events.slice(0, 2).map((x) => x.type), ['episode start', 'block engaged']);
    assert.ok(b.rc.events.some((x) => x.type === 'arming refused'));
  });

  it('applies the stop-slippage stress to an entry-day fill', () => {
    const t = runOn(dip([{ o: 90.5, c: 85 }, { o: 85, c: 82 }]), ED8, grid(), { ...baseFriction, stopSlippageBps: 25 }).b.trades[0]!;

    assert.ok(Math.abs(t.fills[0]!.price - L8 * 0.9995 * 0.9975) < 1e-12);
  });

  it('repeated runs are byte-identical; the book key carries the rc2 controls', () => {
    const ss = dip([{ o: 90.5, c: 85 }, { o: 85, c: 82 }, { o: 82, c: 81 }]);
    const a = runOn(ss, ED8).b;

    assert.equal(JSON.stringify(a), JSON.stringify(runOn(ss, ED8).b));
    assert.match(a.key, /\|rc2:\{"protectiveStop":\{"mode":"on","stopDistanceTenths":80,"activation":"entry-day"\}\}$/);
    assert.match(runOn(ss, NS8).b.key, /\|rc1:/);
  });
});
