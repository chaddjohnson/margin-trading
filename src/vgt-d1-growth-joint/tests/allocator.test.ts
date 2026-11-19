// The pooled engine on synthetic books (PROTOCOL.md §9.2): funding caps, partial-sale accounting and the released
// principal admitting the other family, independent exits, actual-entry initialization, same-instant decisions and
// their priority, decisions before trades at one instant, reservations, the minimum allocation, terminal marking,
// continuous year boundaries, and the selection's fallback. No market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildData } from '../../shared-margin-portfolio/tests/fixtures.ts';
import type { Dataset } from '../../four-family/data.ts';
import { type Allocation, runPool } from '../allocator.ts';
import type { VBook, VTrade } from '../books.ts';
import { bandedOrder } from '../fitness.ts';
import { participationOf, selectRoles } from '../qualify.ts';
import { allocKey, canonicalAlloc, jointId, normalize } from '../space.ts';
import { briefD1, briefG085 } from '../controls.ts';

const sessions = (n: number, start = '2018-01-01') =>
  buildData(
    Array.from({ length: n }, (_v, s) => ({ closes: [100 + s, 101 + s, 102 + s, 103 + s, 104 + s] })),
    [],
    start
  ).ds;

const bt = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!;
const px = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bOpen[ds.sBarStart[s]! + k]! : ds.sClosingPrint[s]!;

// A virtual trade: decided at (dS, dk) (its time = that bar's end), filled at (eS, eK), exit fills as given.
const trade = (
  ds: Dataset,
  family: 'D1' | 'G',
  id: number,
  d: [number, number] | 'close',
  dS: number,
  e: [number, number],
  fills: { s: number; k: number; partial?: boolean; f?: number }[]
): VTrade => ({
  family,
  id,
  kind: family === 'D1' ? 'deep' : 'rise',
  dS,
  dT: d === 'close' ? ds.sCloseTime[dS]! : bt(ds, dS, d[1]) + 60,
  dPrice: 100,
  eS: e[0],
  eK: e[1],
  eT: bt(ds, e[0], e[1]),
  eRaw: px(ds, e[0], e[1]),
  ePrice: px(ds, e[0], e[1]),
  fills: fills.map((x) => ({
    s: x.s,
    k: x.k,
    t: bt(ds, x.s, x.k),
    raw: px(ds, x.s, x.k),
    price: px(ds, x.s, x.k),
    partial: x.partial ?? false,
    f: x.f ?? 1,
    reason: x.partial ? 'trailing stop' : 'trailing stop'
  })),
  open: fills.length === 0 || fills.every((f) => f.partial),
  vNet: 0,
  vInterest: 0
});

const book = (family: 'D1' | 'G', trades: VTrade[], end: number): VBook => ({
  family,
  key: family,
  trades,
  signals: trades.length,
  firstDecision: null,
  endIndex: end,
  standalone: { net: 0, realized: 0, minuteDd: 0, dailyDd: 0 }
});

const A: Allocation = { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' };
const B = (d1Target: number, gTarget: number, first: 'D1' | 'G' = 'D1'): Allocation => ({
  arch: 'B',
  d1Target,
  gTarget,
  first
});

describe('partial release and admission', () => {
  const ds = sessions(8);
  // Growth: decided at the close of session 0, filled at session 1's open, sells 50% at session 2 bar 2, the rest at
  // session 6 bar 3. D1: one trade decided while Growth holds everything (refused), one after the partial sale.
  const g = book(
    'G',
    [
      trade(
        ds,
        'G',
        1,
        'close',
        0,
        [1, 0],
        [
          { s: 2, k: 2, partial: true, f: 0.5 },
          { s: 6, k: 3 }
        ]
      )
    ],
    7
  );
  const d1 = book(
    'D1',
    [trade(ds, 'D1', 1, [1, 1], 1, [1, 2], [{ s: 2, k: 0 }]), trade(ds, 'D1', 2, [3, 1], 3, [3, 2], [{ s: 5, k: 1 }])],
    7
  );

  test('B 100%/100%: the partial sale releases half the principal; the next D1 signal is admitted with it', () => {
    const r = runPool(ds, d1, g, B(1, 1), { detail: true });
    const [gl, dl] = [r.lots.find((l) => l.family === 'G')!, r.lots.find((l) => l.family === 'D1')!];

    assert.equal(r.lots.length, 2);
    assert.equal(r.funding[1]!.outcome, 'refused'); // D1 #1 while Growth holds $100,000
    assert.equal(r.funding[1]!.reason, 'no capacity');
    assert.equal(gl.fills[0]!.partial, true);
    assert.ok(Math.abs(gl.fills[0]!.principal - 50000) < 1e-9);
    assert.equal(r.funding[2]!.outcome, 'downsized');
    assert.ok(Math.abs(r.funding[2]!.capacity - 50000) < 1e-9);
    assert.ok(Math.abs(dl.principal0 - 50000) < 1e-9);
    // D1's exit leaves Growth's remainder untouched
    assert.equal(dl.fills.length, 1);
    assert.equal(gl.fills.length, 2);
    assert.ok(Math.abs(gl.fills[1]!.principal - 50000) < 1e-9);
    assert.ok(r.peakPrincipal <= 100000 + 1e-9);
    // the cash identity
    assert.ok(Math.abs(r.lots.reduce((a, l) => a + l.net, 0) - r.net) < 1e-9);
  });

  test('A: the retained remainder keeps the slot; the repaid principal stays idle', () => {
    const r = runPool(ds, d1, g, A, { detail: true });

    assert.equal(r.lots.length, 1);
    assert.deepEqual(
      r.funding.map((f) => [f.family, f.outcome, f.reason]),
      [
        ['G', 'granted', ''],
        ['D1', 'refused', 'slot occupied'],
        ['D1', 'refused', 'slot occupied']
      ]
    );
  });

  test('the minimum allocation refuses a sliver of released capacity', () => {
    const g2 = book(
      'G',
      [
        trade(
          ds,
          'G',
          1,
          'close',
          0,
          [1, 0],
          [
            { s: 2, k: 2, partial: true, f: 0.05 },
            { s: 6, k: 3 }
          ]
        )
      ],
      7
    );
    const r = runPool(ds, d1, g2, B(1, 1), { detail: true });

    assert.equal(r.funding[2]!.reason, 'below the minimum allocation');
    assert.equal(r.minimumBinds, 1);
    assert.equal(runPool(ds, d1, g2, B(1, 1), { detail: true, minimumAllocation: 0 }).funding[2]!.outcome, 'downsized');
  });

  test('a funded lot starts at its virtual fill: its own shares, principal and interest from that session', () => {
    const r = runPool(ds, d1, g, B(1, 1), { detail: true });
    const dl = r.lots.find((l) => l.family === 'D1')!;
    const v = d1.trades[1]!;

    assert.equal(dl.entryT, v.eT);
    assert.equal(dl.entryPrice, v.ePrice);
    assert.ok(Math.abs(dl.shares0 - 50000 / v.ePrice) < 1e-9);

    const days = (ds.sTime[5]! - ds.sTime[3]!) / 86400;

    assert.ok(Math.abs(dl.interest - (50000 * 0.11 * days) / 365) < 1e-9);
  });
});

describe('same-instant decisions, ordering and reservations', () => {
  const ds = sessions(6);

  test('two decisions at one instant: the declared priority decides who gets the slot', () => {
    const d1 = book('D1', [trade(ds, 'D1', 1, 'close', 1, [2, 0], [{ s: 4, k: 0 }])], 5);
    const g = book('G', [trade(ds, 'G', 1, 'close', 1, [2, 0], [{ s: 4, k: 1 }])], 5);

    assert.deepEqual(
      runPool(ds, d1, g, { ...A, first: 'D1' }).lots.map((l) => l.family),
      ['D1']
    );
    assert.deepEqual(
      runPool(ds, d1, g, { ...A, first: 'G' }).lots.map((l) => l.family),
      ['G']
    );
    // under B at 50%/50% both are funded at the same instant
    assert.deepEqual(
      runPool(ds, d1, g, B(0.5, 0.5)).lots.map((l) => [l.family, l.principal0]),
      [
        ['D1', 50000],
        ['G', 50000]
      ]
    );
  });

  test('a decision stamped at an exit instant is judged before that exit (released capital is not yet available)', () => {
    // D1 exits at session 2 bar 3; Growth decides at the end of bar 2 (= bar 3's start)
    const d1 = book('D1', [trade(ds, 'D1', 1, [0, 1], 0, [0, 2], [{ s: 2, k: 3 }])], 5);
    const g = book('G', [trade(ds, 'G', 1, [2, 2], 2, [2, 3], [{ s: 4, k: 0 }])], 5);
    const r = runPool(ds, d1, g, A, { detail: true });

    assert.equal(r.funding[1]!.outcome, 'refused');
    // one minute later it would be admitted
    const g2 = book('G', [trade(ds, 'G', 1, [2, 3], 2, [2, 4], [{ s: 4, k: 0 }])], 5);

    assert.equal(runPool(ds, d1, g2, A, { detail: true }).funding[1]!.outcome, 'granted');
  });

  test('a granted order reserves its principal until its fill', () => {
    const d1 = book('D1', [trade(ds, 'D1', 1, 'close', 1, [2, 0], [{ s: 4, k: 0 }])], 5);
    const g = book('G', [trade(ds, 'G', 1, [2, 0], 2, [2, 1], [{ s: 4, k: 1 }])], 5); // decides at bar 0's end, after D1's fill
    const g0 = book('G', [trade(ds, 'G', 1, 'close', 1, [2, 0], [{ s: 4, k: 1 }])], 5); // decides at the same close, D1 first

    assert.equal(runPool(ds, d1, g0, B(0.75, 0.75), { detail: true }).funding[1]!.capacity, 25000); // reservation counted
    assert.equal(runPool(ds, d1, g, B(0.75, 0.75), { detail: true }).funding[1]!.capacity, 25000); // the open lot counted
  });
});

describe('marking', () => {
  test('an open lot is marked at the last close with its accrued interest and no exit cost', () => {
    const ds = sessions(5);
    const d1 = book('D1', [trade(ds, 'D1', 1, [0, 1], 0, [0, 2], [])], 4);
    const r = runPool(ds, d1, null, A, { detail: true });
    const l = r.lots[0]!;
    const shares = 100000 / l.entryPrice;
    const interest = (100000 * 0.11 * ((ds.sTime[4]! - ds.sTime[0]!) / 86400)) / 365;

    assert.equal(l.open, true);
    assert.ok(Math.abs(r.net - (shares * ds.sClose[4]! - 100000 - interest)) < 1e-9);
    assert.equal(r.realized, 0);
  });

  test('a run across a year boundary is continuous: the calendar-year P&L sums to the net, nothing resets', () => {
    const ds = sessions(10, '2018-12-26');
    const d1 = book('D1', [trade(ds, 'D1', 1, [1, 1], 1, [1, 2], [{ s: 8, k: 2 }])], 9);
    const r = runPool(ds, d1, null, A, { detail: true, periods: [ds.dates.indexOf('2018-12-31')] });
    const b = ds.dates.indexOf('2018-12-31');

    assert.ok(b > 0);
    assert.ok(Math.abs(r.daily[9]! - r.net) < 1e-9);
    assert.ok(Math.abs(r.periods[0]!.equity - r.daily[b]!) < 1e-12);
    assert.equal(r.lots.length, 1); // the lot crosses the boundary unchanged
  });
});

describe('identity and selection', () => {
  test('A ignores its targets; the canonical allocation identifies the configuration', () => {
    const j = normalize({ d1: briefD1.vg2, g: briefG085, a: { arch: 'A', d1Target: 0.25, gTarget: 0.5, first: 'G' } });

    assert.equal(allocKey(canonicalAlloc(j.a)), 'A|G');
    assert.equal(jointId(j), jointId(normalize({ ...j, a: { arch: 'A', d1Target: 1, gTarget: 1, first: 'G' } })));
    assert.notEqual(jointId(j), jointId(normalize({ ...j, a: { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' } })));
  });

  test('no qualified mixed candidate → the declared fallback (no primary)', () => {
    const s = selectRoles('X', []);

    assert.equal(s.primary, null);
    assert.match(s.reason, /fallback/);
  });

  test('the banded order prefers the lower p90 drawdown inside the 5% robust band', () => {
    const o = bandedOrder([
      { id: 'a', robust: 100, p90: 30 },
      { id: 'b', robust: 96, p90: 10 },
      { id: 'c', robust: 80, p90: 5 }
    ]);

    assert.deepEqual(
      o.map((x) => x.id),
      ['b', 'a', 'c']
    );
  });

  test('participation labels', () => {
    const fam = (lots: number, days: number) => ({ lots, principalDays: days }) as never;

    assert.equal(participationOf({ fam: { D1: fam(0, 0), G: fam(3, 100) } } as never), 'single-family');
    assert.equal(participationOf({ fam: { D1: fam(1, 4), G: fam(3, 100) } } as never), 'token');
    assert.equal(participationOf({ fam: { D1: fam(2, 40), G: fam(3, 100) } } as never), 'mixed');
  });
});
