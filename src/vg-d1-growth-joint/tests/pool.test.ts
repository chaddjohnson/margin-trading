// The four-component pooled engine on synthetic books over two synthetic symbols with DIFFERENT minute coverage
// (PROTOCOL.md §15.2): cross-symbol calendar alignment, merged minute ordering, decisions before the trades of their
// instant, next-session entry reservations, deterministic same-instant decisions (family priority, then GDX before
// VGT), independent virtual and funded positions — including an unfunded virtual trade that persists after capital
// becomes free and is never funded later — the one funded slot, interest, partial exits holding the slot, exits on
// gaps at the virtual fill price, continuous year boundaries, open remainders at the end, period and whole-run
// drawdowns, and the independent reference on every case. No market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { fixtureDataset, type Dataset } from '../../four-family/data.ts';
import type { BookId, VBook, VTrade } from '../books.ts';
import { fixtureDoorOf } from '../data.ts';
import { runPool, tieOrderOf } from '../pool.ts';
import { referencePool } from '../reference.ts';

const spm = 60;

// A session of minute closes at the given minute slots (minutes after 09:30 New York = 14:30 UTC); close at 21:00 UTC.
const session = (date: string, closes: number[], slots: number[]): MarketSession => {
  const time = Date.parse(date) / 1000;
  const openTime = time + (14 * 60 + 30) * spm;
  const closeTime = time + 21 * 60 * spm;
  const bars: Tick[] = closes.map((close, i) => {
    const open = i === 0 ? close : closes[i - 1]!;

    return { time: openTime + slots[i]! * spm, open, high: Math.max(open, close), low: Math.min(open, close), close, volume: 1000, trades: NaN };
  });

  return {
    date,
    time,
    openTime,
    closeTime,
    isEarlyClose: false,
    bars,
    open: bars[0]!.open,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    close: closes.at(-1)!,
    volume: 1000 * bars.length,
    trades: NaN,
    closingPrint: closes.at(-1)!
  };
};

const day = (i: number, start = '2018-12-27') =>
  new Date(Date.parse(start) + i * 86400 * 1000).toISOString().slice(0, 10);

// GDX prints every minute 0..5; VGT only at minutes 1, 3, 5 (so some instants have one symbol only).
const histories = (n: number, start?: string) => ({
  GDX: Array.from({ length: n }, (_v, s) => session(day(s, start), [20 + s, 20.5 + s, 21 + s, 21.5 + s, 22 + s, 22.5 + s], [0, 1, 2, 3, 4, 5])),
  VGT: Array.from({ length: n }, (_v, s) => session(day(s, start), [200 + 2 * s, 201 + 2 * s, 202 + 2 * s], [1, 3, 5]))
});

const bt = (ds: Dataset, s: number, k: number) => (k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!);
const px = (ds: Dataset, s: number, k: number) => (k < ds.sBarCount[s]! ? ds.bOpen[ds.sBarStart[s]! + k]! : ds.sClosingPrint[s]!);

// A virtual trade: decided at time dT (in session dS), filled at (eS, eK) of its symbol, exit fills as given.
const vt = (
  ds: Dataset,
  book: BookId,
  id: number,
  dS: number,
  dT: number,
  e: [number, number] | null,
  fills: { s: number; k: number; partial?: boolean; f?: number; price?: number }[]
): VTrade => ({
  book,
  id,
  kind: 'test',
  dS,
  dT,
  dPrice: 100,
  eS: e ? e[0] : -1,
  eK: e ? e[1] : -1,
  eT: e ? bt(ds, e[0], e[1]) : NaN,
  eRaw: e ? px(ds, e[0], e[1]) : NaN,
  ePrice: e ? px(ds, e[0], e[1]) * 1.0005 : NaN,
  fills: fills.map((x) => ({
    s: x.s,
    k: x.k,
    t: bt(ds, x.s, x.k),
    raw: x.price ?? px(ds, x.s, x.k),
    price: (x.price ?? px(ds, x.s, x.k)) * 0.9995,
    partial: x.partial ?? false,
    f: x.f ?? 1,
    reason: x.partial ? 'retention' : 'trailing stop'
  })),
  open: e !== null && (fills.length === 0 || fills.every((f) => f.partial)),
  vNet: 0,
  vInterest: 0
});

const bk = (book: BookId, trades: VTrade[], end: number): VBook => ({
  book,
  key: book,
  trades,
  signals: trades.length,
  firstDecision: null,
  endIndex: end,
  standalone: { net: 0, realized: 0, minuteDd: 0, dailyDd: 0 }
});

const n = 10;
const door = fixtureDoorOf('two-symbols', histories(n));
const G = door.sym.GDX.ds;
const V = door.sym.VGT.ds;
const dss = { GDX: G, VGT: V };
const end = n - 1;

const agree = (books: VBook[], first: 'D1' | 'G', enabled: Partial<Record<BookId, boolean>> = {}) => {
  const r = runPool(dss, books, first, { detail: true, enabled });
  const ref = referencePool(dss, books, first, { enabled, endIndex: end });

  assert.deepEqual(
    r.funding.filter((f) => f.outcome === 'granted').map((f) => `${f.book}#${f.trade}`),
    ref.funded,
    'the funded set equals the reference'
  );
  assert.ok(Math.abs(r.net - ref.net) < 1e-6, `net ${r.net} vs reference ${ref.net}`);
  assert.ok(Math.abs(r.dd.max - ref.dd) < 1e-6, `minute dd ${r.dd.max} vs reference ${ref.dd}`);
  assert.ok(Math.abs(r.ddDaily.max - ref.ddDaily) < 1e-6, 'daily dd equals the reference');
  return r;
};

describe('the calendar', () => {
  test('the two symbols must share one session calendar', () => {
    const h = histories(4);

    h.VGT[2] = session(day(5), [1, 2, 3], [1, 3, 5]);
    assert.throws(() => fixtureDoorOf('misaligned', h), /calendars differ/);
  });

  test('the merged timeline marks a GDX lot only at GDX bars and the session closes', () => {
    const d1g = bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 3, k: 2 }])], end);
    const r = runPool(dss, [d1g], 'D1', { detail: true, recordMarks: true });
    const gdxTimes = new Set<number>();

    for (let s = 0; s < n; s++) {
      for (let k = 0; k < G.sBarCount[s]!; k++) gdxTimes.add(G.bTime[G.sBarStart[s]! + k]!);
      gdxTimes.add(G.sCloseTime[s]!);
    }
    for (const t of r.markChanges!.t) assert.ok(gdxTimes.has(t), `mark at ${t} is a GDX bar or a close`);
    assert.equal(r.lots.length, 1);
  });
});

describe('funding at one instant', () => {
  test('decisions precede the exits of their instant: a decision at a lot’s exit instant is refused', () => {
    // D1·GDX holds from session 1 to session 2 bar 3 (instant T); D1·VGT decides exactly at T, then one minute later
    const T = bt(G, 2, 3);
    const d1g = bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 2, k: 3 }])], end);
    const d1v = bk(
      'D1:VGT',
      [vt(V, 'D1:VGT', 1, 2, T, [2, 2], [{ s: 4, k: 0 }]), vt(V, 'D1:VGT', 2, 5, bt(V, 5, 0) + 60, [5, 1], [{ s: 6, k: 1 }])],
      end
    );
    const r = agree([d1g, d1v], 'D1');

    assert.equal(r.funding[1]!.outcome, 'refused');
    assert.equal(r.funding[1]!.reason, 'slot occupied');
    assert.equal(r.funding[1]!.occupantBook, 'D1:GDX');
    assert.equal(r.funding[2]!.outcome, 'granted');
  });

  test('same-instant decisions: the family priority, then GDX before VGT', () => {
    const T = bt(G, 1, 2) + 60;
    const mk = (b: BookId, ds: Dataset) => bk(b, [vt(ds, b, 1, 1, T, [2, 0], [{ s: 3, k: 0 }])], end);
    const all = [mk('D1:GDX', G), mk('D1:VGT', V), mk('G:GDX', G), mk('G:VGT', V)];

    assert.deepEqual(tieOrderOf('D1'), ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT']);
    assert.deepEqual(tieOrderOf('G'), ['G:GDX', 'G:VGT', 'D1:GDX', 'D1:VGT']);
    assert.equal(agree(all, 'D1').lots[0]!.book, 'D1:GDX');
    assert.equal(agree(all, 'G').lots[0]!.book, 'G:GDX');
    assert.equal(agree([all[1]!, all[3]!], 'D1').lots[0]!.book, 'D1:VGT');
    assert.equal(agree([all[1]!, all[2]!], 'G').lots[0]!.book, 'G:GDX');
    assert.equal(agree([all[2]!, all[3]!], 'D1').lots[0]!.book, 'G:GDX');

    const r = runPool(dss, all, 'D1', { detail: true });

    assert.deepEqual(
      r.funding.map((f) => `${f.book}:${f.outcome}`),
      ['D1:GDX:granted', 'D1:VGT:refused', 'G:GDX:refused', 'G:VGT:refused']
    );
    assert.equal(r.funding[1]!.occupant.includes('order'), true); // the slot is reserved, not yet filled
  });

  test('a Growth decision at the close reserves the slot until its next-session fill', () => {
    const gv = bk('G:VGT', [vt(V, 'G:VGT', 1, 1, V.sCloseTime[1]!, [2, 0], [{ s: 4, k: 1 }])], end);
    // D1·GDX decides at session 2 bar 0 + 1 minute: after the reservation, before the VGT fill? VGT's first bar is
    // minute 1, so at GDX minute 0 the order is still pending: refused with the order as the occupant
    const d1g = bk('D1:GDX', [vt(G, 'D1:GDX', 1, 2, bt(G, 2, 0), [2, 1], [{ s: 3, k: 0 }])], end);
    const r = agree([gv, d1g], 'D1');

    assert.equal(r.lots.length, 1);
    assert.equal(r.lots[0]!.book, 'G:VGT');
    assert.equal(r.lots[0]!.entryT, bt(V, 2, 0));
    assert.equal(r.funding.find((f) => f.book === 'D1:GDX')!.occupant, 'G:VGT order ($100000.00)');
  });
});

describe('virtual and funded positions are independent', () => {
  test('an unfunded virtual trade persists after capital becomes free and is never funded later', () => {
    // D1·GDX funded s1 → s2. Growth·VGT decides at s1 (refused: slot occupied) and holds VIRTUALLY s2 → s6. The slot is
    // free from s2's exit; nothing replays the refused trade: the pool stays flat (idle) until Growth·VGT's NEXT
    // decision at s7, which is funded.
    const d1g = bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 2, k: 1 }])], end);
    const gv = bk(
      'G:VGT',
      [vt(V, 'G:VGT', 1, 1, V.sCloseTime[1]!, [2, 0], [{ s: 6, k: 1 }]), vt(V, 'G:VGT', 2, 7, V.sCloseTime[7]!, [8, 0], [])],
      end
    );
    const r = agree([d1g, gv], 'D1');

    assert.deepEqual(
      r.funding.map((f) => `${f.book}#${f.trade}:${f.outcome}`),
      ['D1:GDX#1:granted', 'G:VGT#1:refused', 'G:VGT#2:granted']
    );
    assert.equal(r.lots.length, 2);
    assert.equal(r.lots[1]!.trade.id, 2);
    for (let s = 3; s <= 7; s++) assert.equal(r.heldAtClose[s], -1, `flat (idle) at session ${s}'s close`);
    assert.equal(r.lots[1]!.open, true); // the open remainder at the end
    assert.ok(r.unrealized !== 0);
  });

  test('a funded lot copies its virtual fills: an exit on a gap fills at the gapped price', () => {
    const gap = 15; // far below every GDX price: the gapped open of session 3
    const d1g = bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 3, k: 0, price: gap }])], end);
    const r = agree([d1g], 'D1');
    const lot = r.lots[0]!;
    const shares = 100000 / lot.entryPrice;
    const interest = 100000 * 0.11 * ((G.sTime[3]! - G.sTime[1]!) / (365 * 86400));

    assert.equal(lot.fills[0]!.raw, gap);
    assert.ok(Math.abs(lot.net - (shares * gap * 0.9995 - 100000 - interest)) < 1e-6);
    assert.ok(lot.net < -25000 && r.dd.max >= -lot.net - 1e-6, 'the gap loss is the drawdown');
  });

  test('a partial exit keeps the slot under A until the final exit; partial exits are counted apart', () => {
    const gg = bk('G:GDX', [vt(G, 'G:GDX', 1, 0, G.sCloseTime[0]!, [1, 0], [{ s: 2, k: 2, partial: true, f: 0.3 }, { s: 5, k: 4 }])], end);
    const d1v = bk(
      'D1:VGT',
      [vt(V, 'D1:VGT', 1, 3, bt(V, 3, 0) + 60, [3, 1], [{ s: 4, k: 1 }]), vt(V, 'D1:VGT', 2, 6, bt(V, 6, 0) + 60, [6, 1], [{ s: 7, k: 2 }])],
      end
    );
    const r = agree([gg, d1v], 'G');
    const g = r.lots.find((l) => l.book === 'G:GDX')!;

    assert.equal(r.funding.find((f) => f.book === 'D1:VGT' && f.trade === 1)!.reason, 'slot occupied');
    assert.equal(r.funding.find((f) => f.book === 'D1:VGT' && f.trade === 1)!.occupantBook, 'G:GDX');
    assert.equal(g.fills.length, 2);
    assert.equal(g.fills[0]!.partial, true);
    assert.ok(Math.abs(g.fills[0]!.principal - 30000) < 1e-9);
    assert.equal(r.lots.length, 2);
    assert.equal(r.lots.reduce((a, l) => a + l.fills.filter((f) => f.partial).length, 0), 1);
  });

  test('a disabled component is never funded and the next one takes the slot', () => {
    const T = bt(G, 1, 2) + 60;
    const d1g = bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, T, [1, 3], [{ s: 3, k: 0 }])], end);
    const gv = bk('G:VGT', [vt(V, 'G:VGT', 1, 1, T, [1, 2], [{ s: 4, k: 0 }])], end);
    const r = agree([d1g, gv], 'D1', { 'D1:GDX': false });

    assert.equal(r.lots.length, 1);
    assert.equal(r.lots[0]!.book, 'G:VGT');
    assert.equal(r.funding[0]!.reason, 'component disabled');
  });
});

describe('accounting across time', () => {
  test('continuous year boundaries, reset period drawdowns and the open remainder marked at the last close', () => {
    // sessions 2018-12-27 … 2019-01-05: a GDX lot opened 2018-12-28 is held across the year end, open at the end
    const d1g = bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [])], end);
    const boundary = door.dates.indexOf('2018-12-31');
    const r = runPool(dss, [d1g], 'D1', { detail: true, periods: [boundary] });
    const lot = r.lots[0]!;
    const accrued = 100000 * 0.11 * ((G.sTime[end]! - G.sTime[1]!) / (365 * 86400));

    assert.equal(lot.open, true);
    assert.ok(Math.abs(lot.unrealized - (lot.shares * G.sClose[end]! - 100000 - accrued)) < 1e-6);
    assert.ok(Math.abs(r.net - lot.unrealized) < 1e-9);
    assert.equal(r.daily[end], r.net);
    assert.ok(Number.isFinite(r.periods[0]!.equity));
    assert.equal(r.periods[0]!.equity, r.daily[boundary]);
    assert.ok(r.periods[0]!.dd.max <= r.dd.max + 1e-9);
  });

  test('the cash identity and the one slot over a crowded four-book schedule', () => {
    const books: VBook[] = [];
    const sym = { 'D1:GDX': G, 'D1:VGT': V, 'G:GDX': G, 'G:VGT': V } as const;

    for (const [i, b] of (['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const).entries()) {
      const ds = sym[b];
      const trades: VTrade[] = [];

      for (let s = i % 2; s + 2 < n; s += 3)
        trades.push(vt(ds, b, trades.length + 1, s, ds.sCloseTime[s]! - 60 * (i + 1), [s + 1, 0], [{ s: s + 2, k: 1 }]));
      books.push(bk(b, trades, end));
    }

    for (const first of ['D1', 'G'] as const) {
      const r = agree(books, first);

      assert.ok(Math.abs(r.lots.reduce((a, l) => a + l.net, 0) - r.net) < 1e-9);
      for (let i = 1; i < r.lots.length; i++) assert.ok(r.lots[i]!.entryT >= r.lots[i - 1]!.fills.at(-1)!.t);
      assert.ok(r.peakPrincipal <= 100000 + 1e-9);
    }
  });
});
