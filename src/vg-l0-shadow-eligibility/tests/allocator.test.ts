// The shadow-capable allocator on synthetic books over two synthetic symbols (PROTOCOL.md §5, §12.1). The delayed real
// positions come from a STUB path here (fills chosen by the test), so the allocator's rules are tested apart from the
// position harness (tests/position.test.ts): parity with Priority 3's runPool when every toggle is OFF; an episode's
// start, its end at the hypothetical exit, at a delayed entry or at the door's end; the release instant; fresh signals
// first; several live shadows in the frozen tie order (two books of one symbol among them); a hypothetical exit at or
// before the release instant; a closing-print release; the delayed lot's independence from its hypothetical trade; a
// refusal by the book's own delayed lot; displaced decisions; blackouts; a blocked path; a never-filled hypothetical
// trade; the one-slot rule; determinism. No market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import type { Dataset } from '../../four-family/data.ts';
import type { BookId, VBook, VFill, VTrade } from '../../vg-d1-growth-joint/books.ts';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import { runPool } from '../../vg-d1-growth-joint/pool.ts';
import { type ShadowOptions, releaseInstant, runShadowPool } from '../allocator.ts';
import type { RealPath } from '../position.ts';

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

const day = (i: number) => new Date(Date.parse('2019-01-02') + i * 86400 * 1000).toISOString().slice(0, 10);

// GDX prints every minute 0..5; VGT at minutes 1, 3, 5.
const n = 14;
const door = fixtureDoorOf('two-symbols', {
  GDX: Array.from({ length: n }, (_v, s) =>
    session(day(s), [20 + s, 20.5 + s, 21 + s, 21.5 + s, 22 + s, 22.5 + s], [0, 1, 2, 3, 4, 5])
  ),
  VGT: Array.from({ length: n }, (_v, s) => session(day(s), [200 + 2 * s, 201 + 2 * s, 202 + 2 * s], [1, 3, 5]))
});
const G = door.sym.GDX.ds;
const V = door.sym.VGT.ds;
const dss = { GDX: G, VGT: V };
const end = n - 1;
const dsOf = (b: BookId) => (b.endsWith('GDX') ? G : V);

const bt = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!;
const px = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bOpen[ds.sBarStart[s]! + k]! : ds.sClosingPrint[s]!;

const fillOf = (ds: Dataset, x: { s: number; k: number; partial?: boolean; f?: number }): VFill => ({
  s: x.s,
  k: x.k,
  t: bt(ds, x.s, x.k),
  raw: px(ds, x.s, x.k),
  price: px(ds, x.s, x.k) * 0.9995,
  partial: x.partial ?? false,
  f: x.f ?? 1,
  reason: x.partial ? 'retention' : 'trailing stop'
});

// decided at (dS, minute slot dK of the book's symbol: its bar end), filled at (eS, eK), exits as given
const vt = (
  book: BookId,
  id: number,
  d: [number, number],
  e: [number, number] | null,
  fills: { s: number; k: number; partial?: boolean; f?: number }[],
  vNet = 0
): VTrade => {
  const ds = dsOf(book);

  return {
    book,
    id,
    kind: 'test',
    dS: d[0],
    dT: bt(ds, d[0], d[1]) + 60,
    dPrice: 100,
    eS: e ? e[0] : -1,
    eK: e ? e[1] : -1,
    eT: e ? bt(ds, e[0], e[1]) : NaN,
    eRaw: e ? px(ds, e[0], e[1]) : NaN,
    ePrice: e ? px(ds, e[0], e[1]) * 1.0005 : NaN,
    fills: fills.map((x) => fillOf(ds, x)),
    open: e !== null && (fills.length === 0 || fills.every((f) => f.partial)),
    vNet,
    vInterest: 0
  };
};

const bk = (book: BookId, trades: VTrade[]): VBook => ({
  book,
  key: book,
  trades,
  signals: trades.length,
  firstDecision: null,
  endIndex: end,
  standalone: { net: 0, realized: 0, minuteDd: 0, dailyDd: 0 }
});

// The stub real path: fill at the first trade at or after D (the book's own fill rule), exit `hold` sessions later at
// that session's bar `exitK` (independent of the hypothetical trade by construction).
const stubPath =
  (hold: number, exitK = 0, blocked: BookId[] = []) =>
  (b: BookId, s: number, D: number): RealPath => {
    const ds = dsOf(b);
    let eS = -1;
    let eK = -1;

    for (let x = s; x <= end && eS < 0; x++) {
      const start = ds.sBarStart[x]!;
      const count = ds.sBarCount[x]!;

      for (let k = 0; k < count; k++)
        if (ds.bTime[start + k]! >= D) {
          eS = x;
          eK = k;
          break;
        }
      if (eS < 0 && D < ds.sCloseTime[x]!) {
        eS = x;
        eK = count;
      }
    }

    const base: RealPath = {
      family: b.startsWith('D1') ? 'D1' : 'G',
      decisionS: s,
      decisionT: D,
      decisionPrice: 1,
      blocked: blocked.includes(b) ? 'stub: blocked' : null,
      eS: -1,
      eK: -1,
      eT: NaN,
      eRaw: NaN,
      ePrice: NaN,
      fills: [],
      open: false,
      net: 0,
      interest: 0
    };

    if (base.blocked || eS < 0) return base;

    const xs = Math.min(end, eS + hold);
    const exit = xs > eS ? [fillOf(ds, { s: xs, k: exitK })] : [];

    return {
      ...base,
      eS,
      eK,
      eT: bt(ds, eS, eK),
      eRaw: px(ds, eS, eK),
      ePrice: px(ds, eS, eK) * 1.0005,
      fills: exit,
      open: exit.length === 0
    };
  };

const sh = (toggles: Partial<Record<BookId, boolean>>, realPath = stubPath(2)): ShadowOptions => ({
  toggles,
  realPath
});

describe('shadow-eligibility allocator', () => {
  // GDX D1 holds sessions 1 → 4 (exit at bar 2 of session 4); VGT D1 refused in session 2; its hypothetical trade
  // runs to session 6 (open at the release)
  const base = () => [
    bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 4, k: 2 }])]),
    bk('D1:VGT', [vt('D1:VGT', 1, [2, 0], [2, 1], [{ s: 6, k: 1 }], 1234)])
  ];

  test('every toggle OFF (absent or all false) equals Priority 3’s runPool exactly', () => {
    const books = [
      ...base(),
      bk('G:VGT', [
        vt(
          'G:VGT',
          1,
          [5, 1],
          [5, 2],
          [
            { s: 6, k: 0, partial: true, f: 0.5 },
            { s: 8, k: 2 }
          ]
        ),
        vt('G:VGT', 2, [9, 2], null, [])
      ])
    ];
    const ref = runPool(dss, books, 'D1', { detail: true });

    assert.deepEqual(runShadowPool(dss, books, 'D1', { detail: true }), ref);
    assert.deepEqual(
      runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:GDX': false, 'D1:VGT': false, 'G:VGT': false })),
      ref
    );
    assert.equal('shadow' in runShadowPool(dss, books, 'D1', {}, sh({})), false);
  });

  test('OFF: the refused VGT trade is never funded after capital frees (Priority 3’s rule kept)', () => {
    const r = runShadowPool(dss, base(), 'D1', { detail: true }, sh({ 'D1:GDX': true }));

    assert.deepEqual(
      r.lots.map((l) => l.book),
      ['D1:GDX']
    );
    assert.equal(r.shadow!.episodes.length, 0, 'D1:VGT is OFF: its refusal opens no episode');
  });

  test('a live episode is funded at the release: decision at the end of the release minute, fill at its own rule', () => {
    const r = runShadowPool(dss, base(), 'D1', { detail: true }, sh({ 'D1:VGT': true }));
    const ep = r.shadow!.episodes[0]!;
    const D = releaseInstant(G, 4, 2);

    assert.equal(ep.book, 'D1:VGT');
    assert.equal(ep.occupantBook, 'D1:GDX');
    assert.equal(ep.end.reason, 'consumed');
    assert.equal(ep.delayed!.D, D);
    assert.equal(D, bt(G, 4, 2) + 60);
    assert.equal(ep.delayed!.waitSessions, 2);
    assert.equal(r.lots.length, 2);

    const late = r.lots[1]!;

    assert.equal(late.book, 'D1:VGT');
    assert.ok(late.entryT >= D, 'no fill before the release is known');
    assert.equal(late.entryT, bt(V, 4, 1), 'the first VGT trade at or after D (VGT prints at minutes 1, 3, 5)');
    // independence: the funded lot follows the real path (exit two sessions after its fill), not the hypothetical exit
    assert.equal(late.fills.at(-1)!.s, 6);
    assert.equal(late.fills.at(-1)!.k, 0);
    assert.notEqual(late.fills.at(-1)!.t, r.shadow!.episodes[0]!.hyp.xT);
    assert.equal(ep.hyp.vNet, 1234, 'the hypothetical net is kept for diagnostics only');
    assert.equal(r.shadow!.delayedLots.get(late.id)!.episode, 0);
  });

  test('the hypothetical trade exits before the release: eligibility ends there and nothing is funded later', () => {
    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 6, k: 2 }])]),
      bk('D1:VGT', [vt('D1:VGT', 1, [2, 0], [2, 1], [{ s: 4, k: 1 }])])
    ];
    const r = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true }));
    const ep = r.shadow!.episodes[0]!;

    assert.equal(r.lots.length, 1);
    assert.equal(ep.end.reason, 'hypothetical exit');
    assert.equal(ep.end.t, bt(V, 4, 1));
    assert.equal(ep.persistedToRelease, false);
    assert.equal(ep.delayed, null);
  });

  test('a hypothetical exit at or before the release instant is not open: no delayed entry', () => {
    // GDX releases at session 4 bar 0 (D = bar 0 + 60 s = VGT's bar 0 at minute 1); VGT's hypothetical exit is exactly
    // at that VGT bar
    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 4, k: 0 }])]),
      bk('D1:VGT', [vt('D1:VGT', 1, [2, 0], [2, 1], [{ s: 4, k: 0 }])])
    ];

    assert.equal(releaseInstant(G, 4, 0), bt(V, 4, 0));

    const r = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true }));

    assert.equal(r.lots.length, 1);
    assert.equal(r.shadow!.episodes[0]!.end.reason, 'hypothetical exit');
    assert.equal(r.shadow!.releaseChecks, 1);
  });

  test('fresh signals first: a decision stamped at the release instant takes the slot; the shadow stays live', () => {
    // GDX releases at session 4 bar 2 (D = minute 3); G:GDX decides exactly at minute 3 (its bar 2 end)
    const books = [...base(), bk('G:GDX', [vt('G:GDX', 1, [4, 2], [4, 3], [{ s: 5, k: 0 }])])];
    const r = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true }));
    const ep = r.shadow!.episodes[0]!;

    assert.deepEqual(
      r.lots.map((l) => `${l.book}@${l.entryS}`),
      ['D1:GDX@1', 'G:GDX@4', 'D1:VGT@5']
    );
    assert.equal(ep.losses[0]!.reason, 'competing fresh entry');
    assert.equal(ep.losses[0]!.winner, 'G:GDX');
    assert.equal(ep.releases, 2, 'it competed again at the next release and won');
    assert.equal(ep.end.reason, 'consumed');
  });

  test('several live shadows: the frozen tie order decides (D1:GDX, D1:VGT, G:GDX, G:VGT); the loser stays live', () => {
    // two books on VGT (D1 and Growth) refused while GDX's D1 lot holds the slot
    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 4, k: 2 }])]),
      bk('D1:VGT', [vt('D1:VGT', 1, [3, 0], [3, 1], [{ s: 9, k: 1 }])]),
      bk('G:VGT', [vt('G:VGT', 1, [2, 1], [2, 2], [{ s: 10, k: 1 }])])
    ];
    const r = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true, 'G:VGT': true }, stubPath(1)));
    const [g, d] = [
      r.shadow!.episodes.find((e) => e.book === 'G:VGT')!,
      r.shadow!.episodes.find((e) => e.book === 'D1:VGT')!
    ];

    assert.equal(d.end.reason, 'consumed', 'D1:VGT first despite its later refusal (tie order, not age)');
    assert.equal(g.losses[0]!.reason, 'higher-priority shadow');
    assert.equal(g.losses[0]!.winner, 'D1:VGT');
    assert.equal(g.end.reason, 'consumed', 'the Growth shadow is funded at the delayed D1 lot’s own release');
    assert.deepEqual(
      r.lots.map((l) => l.book),
      ['D1:GDX', 'D1:VGT', 'G:VGT']
    );
    assert.equal(r.lots[2]!.entryS, 5);
  });

  test('a closing-print release: the check runs at the close; the delayed order fills at the next session’s open', () => {
    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 4, k: 6 }])]), // the closing print (6 bars)
      bk('D1:VGT', [vt('D1:VGT', 1, [2, 0], [2, 1], [{ s: 8, k: 1 }])])
    ];
    const r = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true }));
    const ep = r.shadow!.episodes[0]!;

    assert.equal(ep.delayed!.D, G.sCloseTime[4]);
    assert.equal(ep.delayed!.decisionS, 4);
    assert.equal(r.lots[1]!.entryS, 5);
    assert.equal(r.lots[1]!.entryT, bt(V, 5, 0));
  });

  test('a refusal by the book’s own delayed lot opens a new episode (no duplicate position) and is displaced by it', () => {
    // VGT's first hypothetical trade exits in session 5; its delayed lot (stub: 4 sessions) holds the slot to session 8;
    // VGT decides again in session 6 (refused: its own delayed lot) and that hypothetical trade runs past session 8
    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 3, k: 2 }])]),
      bk('D1:VGT', [
        vt('D1:VGT', 1, [2, 0], [2, 1], [{ s: 5, k: 1 }], 10),
        vt('D1:VGT', 2, [6, 0], [6, 1], [{ s: 12, k: 1 }], 20)
      ])
    ];
    const r = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true }, stubPath(4)));
    const eps = r.shadow!.episodes;

    assert.equal(eps.length, 2);
    assert.equal(eps[1]!.ownOccupant, true);
    assert.equal(eps[1]!.occupantDelayed, true);
    assert.equal(eps[1]!.end.reason, 'consumed');
    assert.deepEqual(
      r.lots.map((l) => `${l.book}@${l.entryS}`),
      ['D1:GDX@1', 'D1:VGT@3', 'D1:VGT@7']
    );
    assert.deepEqual(
      r.shadow!.delayedLots.get(r.lots[1]!.id)!.displaced.map((x) => `${x.book}#${x.trade}`),
      ['D1:VGT#2']
    );
    for (let i = 1; i < r.lots.length; i++)
      assert.ok(r.lots[i]!.entryT >= r.lots[i - 1]!.fills.at(-1)!.t, 'one slot: never two funded lots at once');
  });

  test('a blackout session refuses delayed entries; a blocked path passes to the next candidate', () => {
    const r1 = runShadowPool(
      dss,
      base(),
      'D1',
      { detail: true, blackouts: [{ first: 4, last: 4 }] },
      sh({ 'D1:VGT': true })
    );

    assert.equal(r1.shadow!.episodes[0]!.losses[0]!.reason, 'blackout');
    assert.equal(r1.lots.length, 1);

    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 4, k: 2 }])]),
      bk('D1:VGT', [vt('D1:VGT', 1, [3, 0], [3, 1], [{ s: 9, k: 1 }])]),
      bk('G:VGT', [vt('G:VGT', 1, [2, 1], [2, 2], [{ s: 10, k: 1 }])])
    ];
    const r2 = runShadowPool(
      dss,
      books,
      'D1',
      { detail: true },
      sh({ 'D1:VGT': true, 'G:VGT': true }, stubPath(1, 0, ['D1:VGT']))
    );

    assert.equal(r2.shadow!.episodes.find((e) => e.book === 'D1:VGT')!.losses[0]!.reason, 'not executable');
    assert.equal(r2.lots[1]!.book, 'G:VGT');
  });

  test('a never-filled hypothetical order stays eligible; an open hypothetical trade ends at the door', () => {
    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 13, k: 2 }])]),
      bk('D1:VGT', [vt('D1:VGT', 1, [2, 0], null, [])])
    ];
    const r = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true }, stubPath(5)));
    const ep = r.shadow!.episodes[0]!;

    assert.equal(ep.hyp.xReason, 'never filled');
    assert.equal(ep.end.reason, 'consumed');
    assert.equal(r.lots[1]!.open, true, 'the delayed lot is open at the end and marked');
    assert.ok(Number.isFinite(r.net));
  });

  test('a second refused decision of one book while its hypothetical trade is open is impossible (asserted)', () => {
    const books = [
      bk('D1:GDX', [vt('D1:GDX', 1, [1, 0], [1, 1], [{ s: 8, k: 2 }])]),
      bk('D1:VGT', [
        vt('D1:VGT', 1, [2, 0], [2, 1], [{ s: 6, k: 1 }]),
        vt('D1:VGT', 2, [4, 0], [4, 1], [{ s: 7, k: 1 }])
      ])
    ];

    assert.throws(() => runShadowPool(dss, books, 'D1', {}, sh({ 'D1:VGT': true })), /second refused decision/);
  });

  test('deterministic: the same inputs give the same result', () => {
    const books = [...base(), bk('G:VGT', [vt('G:VGT', 1, [2, 1], [2, 2], [{ s: 10, k: 1 }])])];
    const a = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true, 'G:VGT': true }));
    const b = runShadowPool(dss, books, 'D1', { detail: true }, sh({ 'D1:VGT': true, 'G:VGT': true }));

    assert.deepEqual(a, b);
  });
});
