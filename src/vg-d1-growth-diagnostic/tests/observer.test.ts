// The diagnostic's attribution and summary calculations on synthetic two-symbol pools (Priority 3's fixtures; no
// market data): refusal intervals partition a refused trade's hold into blocked / re-occupied / idle sessions with no
// double counting, reservations are named as occupants, the persistent unfunded virtual trade is measured (never
// funded), pool time is conserved, the drawdown decomposes by lot to the tracker exactly (partial exits included),
// ledger divergences are classified, funnels reconcile with the canonical record, and the report-only tail statistics
// (worst-10% mean, Wilson and order-statistic intervals, Spearman) are correct on known inputs.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import type { Dataset } from '../../four-family/data.ts';
import type { BookId, VBook, VTrade } from '../../vg-d1-growth-joint/books.ts';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import { recordOf } from '../../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../../vg-d1-growth-joint/fitness.ts';
import { runPool } from '../../vg-d1-growth-joint/pool.ts';
import { type Quad, d1Placeholder } from '../../vg-d1-growth-joint/space.ts';
import { gPlaceholder } from '../../vg-d1-growth-joint/controls.ts';
import {
  type Observed,
  ddEpisodeOf,
  divergenceOf,
  episodeCount,
  firstDifference,
  funnelOf,
  occupancyOf,
  poolTimeOf,
  refusalsOf
} from '../observer.ts';
import { quantileInterval, spearman, tailOf, wilson } from '../risk.ts';

const spm = 60;

const session = (date: string, closes: number[], slots: number[]): MarketSession => {
  const time = Date.parse(date) / 1000;
  const openTime = time + (14 * 60 + 30) * spm;
  const closeTime = time + 21 * 60 * spm;
  const bars: Tick[] = closes.map((close, i) => {
    const open = i === 0 ? close : closes[i - 1]!;

    return {
      time: openTime + slots[i]! * spm,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: 1000,
      trades: NaN
    };
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

const day = (i: number) => new Date(Date.parse('2019-01-01') + i * 86400 * 1000).toISOString().slice(0, 10);

// GDX rises then falls (a drawdown); VGT prints at minutes 1, 3, 5 only.
const n = 16;
const gdxPath = (s: number) => (s < 6 ? 20 + s : 26 - 1.5 * (s - 5));
const door = fixtureDoorOf('diag', {
  GDX: Array.from({ length: n }, (_v, s) => {
    const p = gdxPath(s);

    return session(day(s), [p, p + 0.2, p - 0.3, p + 0.1, p - 0.2, p + 0.05], [0, 1, 2, 3, 4, 5]);
  }),
  VGT: Array.from({ length: n }, (_v, s) => session(day(s), [200 + 2 * s, 201 + 2 * s, 199 + 2 * s], [1, 3, 5]))
});
const G = door.sym.GDX.ds;
const V = door.sym.VGT.ds;
const dss = { GDX: G, VGT: V };
const end = n - 1;

const bt = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!;
const px = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bOpen[ds.sBarStart[s]! + k]! : ds.sClosingPrint[s]!;

const vt = (
  ds: Dataset,
  book: BookId,
  id: number,
  dS: number,
  dT: number,
  e: [number, number] | null,
  fills: { s: number; k: number; partial?: boolean; f?: number }[]
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
    raw: px(ds, x.s, x.k),
    price: px(ds, x.s, x.k) * 0.9995,
    partial: x.partial ?? false,
    f: x.f ?? 1,
    reason: x.partial ? 'retention' : 'trailing stop'
  })),
  open: e !== null && (fills.length === 0 || fills.every((f) => f.partial)),
  vNet: 1000 * id,
  vInterest: 0
});

const bk = (book: BookId, trades: VTrade[]): VBook => ({
  book,
  key: book,
  trades,
  signals: trades.length,
  firstDecision: null,
  endIndex: end,
  standalone: { net: 0, realized: 0, minuteDd: 0, dailyDd: 0 }
});

// identity only (the synthetic books are given directly; no engine runs from this quad)
const quad: Quad = {
  d1: { GDX: d1Placeholder, VGT: d1Placeholder },
  g: { GDX: gPlaceholder, VGT: gPlaceholder },
  first: 'D1'
};

const observed = (books: VBook[], first: 'D1' | 'G' = 'D1'): Observed => {
  const result = runPool(dss, books, first, { detail: true, endIndex: end });

  return {
    door,
    quad,
    options: {},
    result,
    books,
    rec: recordOf(door, quad, { books, result }),
    growth: {},
    occupancy: result.lots.map((lot) => ({ lot, iv: occupancyOf(lot) }))
  };
};

const counters = () => ({ books: 0, gateChecks: 0 });

describe('refusal intervals', () => {
  test('a refused virtual trade that outlives its occupant: blocked, then idle, never funded later', () => {
    // D1·GDX funded s1 → s2; Growth·VGT decides at the close of s1 (refused) and holds virtually s2 → s6; its next
    // decision (s7) is funded.
    const ob = observed([
      bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 2, k: 1 }])]),
      bk('G:VGT', [
        vt(V, 'G:VGT', 1, 1, V.sCloseTime[1]!, [2, 0], [{ s: 6, k: 1 }]),
        vt(V, 'G:VGT', 2, 7, V.sCloseTime[7]!, [8, 0], [{ s: 9, k: 1 }])
      ])
    ]);
    const [r, ...rest] = refusalsOf(ob, counters());

    assert.equal(rest.length, 0);
    assert.equal(r!.book, 'G:VGT');
    assert.equal(r!.occupant, 'D1:GDX');
    assert.equal(r!.occupantKind, 'lot');
    assert.equal(r!.occupantRelease, day(2));
    // the hold covers the closes of s1 … s5 (it exits at s6 minute 1): s1 blocked, s2 … s5 idle
    assert.equal(r!.virtualSessions, 5);
    assert.equal(r!.blockedSessions, 1);
    assert.equal(r!.idleOverlapSessions, 4);
    assert.equal(r!.reoccupiedSessions, 0);
    assert.equal(r!.nextDecision, day(7));
    assert.equal(r!.sessionsToNextDecision, 1);
    // the refused trade is never funded: only trade 2 of Growth·VGT has a lot
    assert.deepEqual(
      ob.result.lots.map((l) => `${l.book}#${l.trade.id}`),
      ['D1:GDX#1', 'G:VGT#2']
    );
  });

  test('re-occupation by another component is counted apart from idle time, and the parts sum to the hold', () => {
    // D1·GDX s1 → s2 (occupant); Growth·VGT refused at the close of s1 (virtual s2 → s9); D1·VGT funded s4 → s6
    const ob = observed([
      bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 2, k: 1 }])]),
      bk('D1:VGT', [vt(V, 'D1:VGT', 1, 4, bt(V, 4, 0) + 30, [4, 1], [{ s: 6, k: 2 }])]),
      bk('G:VGT', [vt(V, 'G:VGT', 1, 1, V.sCloseTime[1]!, [2, 0], [{ s: 9, k: 1 }])])
    ]);
    const r = refusalsOf(ob, counters()).find((x) => x.book === 'G:VGT')!;

    assert.equal(r.virtualSessions, 8); // closes of s1 … s8
    assert.equal(r.blockedSessions, 1); // s1
    assert.equal(r.reoccupiedSessions, 2); // the closes of s4 and s5 (D1·VGT exits at minute 5 of s6: idle at that close)
    assert.equal(r.blockedSessions + r.reoccupiedSessions + r.idleOverlapSessions, r.virtualSessions);
    assert.deepEqual(
      r.reoccupiedBy.map((x) => x.book),
      ['D1:VGT']
    );
  });

  test('a reservation (granted at the close, filled the next morning) is named as the occupant', () => {
    // D1·GDX decides at the close of s3 (granted; fills at the open of s4); Growth·GDX decides at the same close, after
    // it in the D1-first tie order: refused by the reservation
    const ob = observed([
      bk('D1:GDX', [vt(G, 'D1:GDX', 1, 3, G.sCloseTime[3]!, [4, 0], [{ s: 5, k: 2 }])]),
      bk('G:GDX', [vt(G, 'G:GDX', 1, 3, G.sCloseTime[3]!, [4, 0], [{ s: 8, k: 2 }])])
    ]);
    const r = refusalsOf(ob, counters())[0]!;

    assert.equal(r.occupant, 'D1:GDX');
    assert.equal(r.occupantKind, 'reservation');
  });
});

describe('pool time, funnels and the canonical record', () => {
  test('held, reserved-only and idle sessions partition the window; funnels agree with recordOf', () => {
    const ob = observed([
      bk('D1:GDX', [vt(G, 'D1:GDX', 1, 3, G.sCloseTime[3]!, [4, 0], [{ s: 5, k: 2 }])]),
      bk('G:VGT', [
        vt(
          V,
          'G:VGT',
          1,
          3,
          V.sCloseTime[3]! + 0,
          [4, 1],
          [
            { s: 4, k: 2, partial: true, f: 0.5 },
            { s: 10, k: 1 }
          ]
        ),
        vt(V, 'G:VGT', 2, 12, V.sCloseTime[12]!, [13, 0], [])
      ])
    ]);
    const t = poolTimeOf(ob);

    assert.equal(t.held + t.reservedOnly + t.idle, t.sessions);
    assert.ok(t.reservedOnly >= 1, 'the close at which the morning fill is reserved');

    for (const b of ['D1:GDX', 'G:VGT'] as const) {
      const f = funnelOf(ob, b);

      assert.equal(f.lots, ob.rec.books[b].lots);
      assert.equal(f.principalDays, ob.rec.books[b].principalDays);
      assert.equal(f.booked, ob.rec.books[b].booked);
      assert.equal(f.partials, ob.rec.books[b].partials);
      assert.equal(f.granted + f.refused, f.decisions);
      assert.equal(f.virtualInvestedSessions + f.virtualPendingSessions + f.virtualFlatSessions, f.sessions);
    }

    // split windows add up
    const a = funnelOf(ob, 'G:VGT', { from: 0, to: 7 });
    const z = funnelOf(ob, 'G:VGT', { from: 8, to: end });
    const w = funnelOf(ob, 'G:VGT');

    assert.equal(a.decisions + z.decisions, w.decisions);
    assert.equal(a.virtualInvestedSessions + z.virtualInvestedSessions, w.virtualInvestedSessions);
  });
});

describe('the drawdown decomposition', () => {
  test('the lots’ contributions between the peak and the trough sum to the tracker’s drawdown (partial exits too)', () => {
    const ob = observed([
      bk('G:GDX', [
        vt(
          G,
          'G:GDX',
          1,
          2,
          G.sCloseTime[2]!,
          [3, 0],
          [
            { s: 7, k: 1, partial: true, f: 0.4 },
            { s: 11, k: 4 }
          ]
        )
      ]),
      bk('D1:VGT', [vt(V, 'D1:VGT', 1, 12, bt(V, 12, 0) + 30, [12, 1], [{ s: 14, k: 2 }])])
    ]);
    const e = ddEpisodeOf(ob);

    assert.ok(e.dd > 0);
    assert.ok(Math.abs(e.reconciled) < 1e-6, `reconciled ${e.reconciled}`);
    assert.equal(e.dominant, 'G:GDX');
  });
});

describe('ledger divergence', () => {
  const base = () => [
    bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 3, k: 1 }])]),
    bk('G:VGT', [vt(V, 'G:VGT', 1, 2, V.sCloseTime[2]!, [3, 0], [{ s: 6, k: 1 }])])
  ];

  test('same ledger, a longer hold, a displaced trade and an admitted one', () => {
    const ref = observed(base());

    assert.equal(divergenceOf(observed(base()), ref).kind, 'same ledger');

    const longer = observed([
      bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, bt(G, 1, 0) + 60, [1, 1], [{ s: 4, k: 1 }])]),
      base()[1]!
    ]);

    assert.equal(divergenceOf(longer, ref).kind, 'changed exit (longer hold)');
    // the longer D1·GDX hold makes Growth·VGT's decision at s2 a refusal: from the reference's side it is admitted
    assert.equal(divergenceOf(ref, longer).kind, 'changed exit (shorter hold)');

    // a reservation displaces a decision taken a few seconds later: D1·VGT decides at minute 1 + 10 s (fills at VGT's
    // minute 3), D1·GDX decides at minute 1 + 30 s (its own fill would be GDX's minute 2) and is refused here; the
    // reference has no D1·VGT decision, so D1·GDX is funded there
    const t0 = bt(G, 1, 1);
    const ref2 = observed([bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, t0 + 30, [1, 2], [{ s: 3, k: 1 }])]), bk('D1:VGT', [])]);
    const here = observed([
      bk('D1:GDX', [vt(G, 'D1:GDX', 1, 1, t0 + 30, [1, 2], [{ s: 3, k: 1 }])]),
      bk('D1:VGT', [vt(V, 'D1:VGT', 1, 1, t0 + 10, [1, 1], [{ s: 4, k: 2 }])])
    ]);

    assert.equal(divergenceOf(here, ref2).kind, 'displaced (refused here)');
    assert.equal(divergenceOf(ref2, here).kind, 'admitted (refused in the reference)');

    const newSignal = observed([
      ...base(),
      bk('D1:VGT', [vt(V, 'D1:VGT', 1, 8, bt(V, 8, 0) + 30, [8, 1], [{ s: 9, k: 2 }])])
    ]);

    assert.equal(divergenceOf(newSignal, ref).kind, 'changed signal (new decision)');
    assert.equal(divergenceOf(ref, newSignal).kind, 'changed signal (reference decision absent)');
  });
});

describe('report-only tail statistics', () => {
  test('the worst-10% mean, quantiles and intervals on known inputs', () => {
    const dds = Array.from({ length: 384 }, (_v, i) => 10000 + 100 * i); // 10,000 … 48,300
    const rec = (dd: number, net = 1) => ({ dd, net, signature: String(dd) }) as never;
    const t = tailOf(
      rec(20000, 5),
      dds.map((dd) => ({ rec: rec(dd), clipped: 0 }))
    );

    assert.equal(t.worst10K, 39);
    // the 39 largest: 44,500 … 48,300, mean 46,400
    assert.equal(t.worst10Mean, 46400);
    assert.equal(t.p90Dd, Math.round(quantile(dds, 0.9) * 100) / 100);
    assert.equal(t.breaches, dds.filter((d) => d > 35000).length);
    assert.equal(
      t.meanExcess,
      Math.round((dds.filter((d) => d > 35000).reduce((a, d) => a + d - 35000, 0) / t.breaches) * 100) / 100
    );
    assert.ok(t.p90Interval[0]! <= t.p90Dd && t.p90Dd <= t.p90Interval[1]!);
  });

  test('Wilson interval, order-statistic interval, Spearman and the episode rule', () => {
    const [lo, hi] = wilson(51, 384);

    assert.ok(Math.abs(lo! - 0.1025) < 5e-4 && Math.abs(hi! - 0.1704) < 5e-4, `${lo} ${hi}`);
    assert.deepEqual(
      wilson(0, 10).map((x) => Math.round(x * 1e4) / 1e4),
      [0, 0.2775]
    );

    const sorted = Array.from({ length: 384 }, (_v, i) => i + 1);
    const [a, b] = quantileInterval(sorted);

    assert.equal(a, 334);
    assert.equal(b, 359); // ⌈345.6 + 11.52⌉ + 1
    assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
    assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
    // a new episode only when an item starts more than 10 sessions after the latest end
    assert.equal(
      episodeCount([
        { s: 0, e: 5 },
        { s: 15, e: 16 },
        { s: 27, e: 30 }
      ]),
      2
    );
    assert.equal(
      episodeCount([
        { s: 0, e: Infinity },
        { s: 400, e: 401 }
      ]),
      1
    );
  });

  test('firstDifference names the first differing field', () => {
    assert.equal(firstDifference({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }), null);
    assert.match(firstDifference({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })!, /\.b\.c/);
  });
});
