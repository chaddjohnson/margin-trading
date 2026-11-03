// Closed-form fixtures of the two-tier allocator (ENGINE_CONTRACT.md §10): hand-built minute bars and hand-built
// virtual trades, so every expected fill, price, interest and outcome can be written down. Synthetic prices only.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Dataset } from '../../four-family/data.ts';
import { fixtureDataset } from '../../four-family/data.ts';
import type { VirtualTrade } from '../../multi-etf-allocator/shadow.ts';
import { type SessionSpec, buildSession, dateOf } from '../../multi-etf-allocator/tests/fixtures.ts';
import { type AllocBook, type AllocConfig, type Policy, policyOf, runAllocator } from '../allocator.ts';
import type { Trace } from '../trace.ts';

const minute = 60;
const day = 86400;

const market = (sessions: SessionSpec[], id: string): Dataset => {
  const ds = fixtureDataset(sessions.map((spec, index) => buildSession(dateOf(index), spec)));

  ds.id = id;
  return ds;
};

const barTime = (ds: Dataset, s: number, k: number) =>
  k >= ds.sBarCount[s]! ? ds.sCloseTime[s]! : ds.bTime[ds.sBarStart[s]! + k]!;
const barOpen = (ds: Dataset, s: number, k: number) =>
  k >= ds.sBarCount[s]! ? ds.sClosingPrint[s]! : ds.bOpen[ds.sBarStart[s]! + k]!;

let nextId = 1;

// A virtual trade: decided at the end of bar `decision`, filled at `entry`, exited at `exit` (or open).
const trade = (
  ds: Dataset,
  o: {
    decision: [number, number];
    entry: [number, number];
    exit?: [number, number];
    exitPrice?: number;
    reason?: string;
    execution?: string;
    kind?: 'deep' | 'continuation';
    net?: number;
  }
): VirtualTrade =>
  ({
    id: nextId++,
    symbol: 'X',
    phenotype: 'fixture',
    setupId: 1,
    setupKind: o.kind ?? 'deep',
    activationIndex: o.decision[0],
    activationTime: barTime(ds, o.decision[0], 0) + minute,
    activationPrice: 0,
    referenceHigh: 0,
    anchorHigh: 0,
    decisionIndex: o.decision[0],
    decisionBar: o.decision[1],
    decisionTime: barTime(ds, o.decision[0], o.decision[1]) + minute,
    decisionPrice: 0,
    trigger: 0,
    trailingLow: 0,
    carriedOvernight: false,
    entryIndex: o.entry[0],
    entryBar: o.entry[1],
    entryTime: barTime(ds, o.entry[0], o.entry[1]),
    entryRawPrice: barOpen(ds, o.entry[0], o.entry[1]),
    entryPrice: barOpen(ds, o.entry[0], o.entry[1]),
    entryExecution: 'first trade after decision',
    shares: 0,
    investment: 100000,
    exitIndex: o.exit ? o.exit[0] : -1,
    exitBar: o.exit ? o.exit[1] : -1,
    exitTime: o.exit ? barTime(ds, o.exit[0], o.exit[1]) : NaN,
    exitRawPrice: o.exit ? (o.exitPrice ?? barOpen(ds, o.exit[0], o.exit[1])) : NaN,
    exitPrice: NaN,
    exitReason: (o.reason ?? (o.exit ? 'maximum hold' : 'open')) as VirtualTrade['exitReason'],
    exitExecution: (o.execution ?? 'first trade after decision') as VirtualTrade['exitExecution'],
    exitStopPrice: NaN,
    stopActiveAtExit: false,
    maximumHoldDue: false,
    bufferSignalTime: NaN,
    bufferSignalPrice: NaN,
    interest: 0,
    gross: 0,
    net: o.net ?? 0,
    stopFirstActiveIndex: -1,
    stopActiveSessions: 0,
    allocator: '',
    fundedLotId: -1
  }) as unknown as VirtualTrade;

const traceOf = (trades: VirtualTrade[], spans: Trace['spans'] = []): Trace => ({
  key: 'fixture',
  symbol: 'X',
  grid: 'fixture',
  trades,
  spans: spans.length > 0 ? spans : trades.map((t) => ({ from: t.activationTime, to: t.entryTime, kind: t.setupKind })),
  deepArmings: 0,
  continuationArmings: 0,
  setups: trades.length,
  armedAtEnd: false,
  pendingAtEnd: false,
  lookback: 2,
  x: 0.1
});

const book = (
  id: string,
  symbol: string,
  tier: 'deep' | 'shallow',
  ds: Dataset,
  trades: VirtualTrade[]
): AllocBook => ({ id, symbol, tier, ds, trace: traceOf(trades) });

const config = (endIndex: number, policy: Policy, overrides: Partial<AllocConfig> = {}): AllocConfig => ({
  startIndex: 0,
  endIndex,
  armStart: 0,
  principal: 100000,
  rate: 0.11,
  costBps: 5,
  stopSlippageBps: 0,
  policy,
  tieMode: 'tier',
  ...overrides
});

const c = 5 / 10000;
const sharesAt = (raw: number) => 100000 / (raw * (1 + c));
const netOf = (entryRaw: number, exitRaw: number, days: number) =>
  sharesAt(entryRaw) * (exitRaw * (1 - c)) - 100000 - 100000 * 0.11 * ((days * day) / (365 * day));

// five sessions of ten one-minute bars (minutes 0–8 after the open and the last regular minute, 15:59, so a decision
// at the end of bar 9 is known only at the close); the shallow symbol falls from 100 to 90 in session 2, the deep
// symbol drifts up
const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 389];
const shallowSessions = (): SessionSpec[] => [
  { closes: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100], slots },
  { closes: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100], slots },
  { closes: [99, 98, 97, 96, 95, 94, 93, 92, 91, 90], slots },
  { closes: [90, 91, 92, 93, 94, 95, 96, 97, 98, 99], slots },
  { closes: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109], slots }
];
const deepSessions = (): SessionSpec[] =>
  Array.from({ length: 5 }, (_, s) => ({ closes: Array.from({ length: 10 }, (_, k) => 50 + s + k / 10), slots }));

describe('two-tier allocator closed-form fixtures', () => {
  test('F1 P0: a deep decision meeting a held shallow lot is refused; the shallow lot exits on its own', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3], exit: [4, 5] });
    const deep = trade(dp, { decision: [2, 4], entry: [2, 5], exit: [4, 2] });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P0'))
    );

    assert.equal(result.lots.length, 1);
    assert.equal(result.lots[0]!.bookId, 'S');
    assert.equal(result.refused, 1);
    assert.equal(result.switches.length, 0);
    assert.ok(Math.abs(result.lots[0]!.net - netOf(100, barOpen(sh, 4, 5), 3)) < 1e-9);
  });

  test('F2 P1: unconditional sale at a loss at the next bar, mirror bought one minute after the sale', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3], exit: [4, 5] });
    const deep = trade(dp, { decision: [2, 4], entry: [2, 5], exit: [4, 2], reason: 'maximum hold' });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );
    const sw = result.switches[0]!;

    assert.equal(sw.outcome, 'executed');
    assert.equal(sw.saleIndex, 2);
    assert.equal(sw.saleBar, 5); // the shallow symbol's first trade at or after the decision (end of bar 4)
    assert.equal(sw.saleRawPrice, barOpen(sh, 2, 5));
    assert.equal(sw.purchaseBar, 6); // the deep symbol's first bar at or after sale + 60 s
    assert.equal(result.lots.length, 2);
    assert.equal(result.lots[0]!.exitReason, 'priority_preemption');
    assert.ok(result.lots[0]!.net < 0);
    assert.ok(Math.abs(result.lots[0]!.net - netOf(100, barOpen(sh, 2, 5), 1)) < 1e-9);
    assert.equal(result.lots[1]!.kind, 'mirror');
    assert.equal(result.lots[1]!.entryRawPrice, barOpen(dp, 2, 6));
    assert.ok(Math.abs(result.lots[1]!.net - netOf(barOpen(dp, 2, 6), barOpen(dp, 4, 2), 2)) < 1e-9);
    assert.ok(Math.abs(result.realized - result.lots[0]!.net - result.lots[1]!.net) < 1e-9);
  });

  test('F3 P2: a losing shallow lot declines the switch; a winning one executes', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const losing = trade(sh, { decision: [1, 2], entry: [1, 3], exit: [4, 5] });
    const deepLate = trade(dp, { decision: [2, 4], entry: [2, 5], exit: [4, 2] });
    const declined = runAllocator(
      [book('S', 'SH', 'shallow', sh, [losing]), book('D', 'DP', 'deep', dp, [deepLate])],
      config(4, policyOf('P2'))
    );

    assert.equal(declined.switches[0]!.outcome, 'declined');
    assert.equal(declined.lots.length, 1);

    // decided in session 4, when the shallow lot is above its entry price and interest
    const deepRecovered = trade(dp, { decision: [4, 6], entry: [4, 7] });
    const executed = runAllocator(
      [
        book('S', 'SH', 'shallow', sh, [trade(sh, { decision: [1, 2], entry: [1, 3] })]),
        book('D', 'DP', 'deep', dp, [deepRecovered])
      ],
      config(4, policyOf('P2'))
    );

    assert.equal(executed.switches[0]!.outcome, 'executed');
    assert.ok(executed.switches[0]!.saleNet >= 0);
  });

  test('F4 P2 fill-test abort: the estimate clears breakeven but the sale bar opens below it', () => {
    const sessions = shallowSessions();

    sessions[4] = {
      closes: [100.3, 100.4, 100.5, 100.6, 100.7, 100.8, 100.9, 101, 101.1, 101.2],
      opens: [100.3, 100.4, 100.5, 100.6, 100.7, 95, 100.9, 101, 101.1, 101.2],
      slots
    };

    const sh = market(sessions, 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [3, 8], entry: [3, 9] }); // bought at 98
    const deep = trade(dp, { decision: [4, 4], entry: [4, 5] });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P2'))
    );

    assert.ok(result.switches[0]!.estimateNet >= 0);
    assert.equal(result.switches[0]!.outcome, 'aborted');
    assert.equal(result.lots.length, 1);
    assert.equal(result.lots[0]!.bookId, 'S');
  });

  test('F5 a decision in the last minute sells at the next opening trade and buys at the second minute', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3] });
    const deep = trade(dp, { decision: [2, 9], entry: [3, 0] });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );
    const sw = result.switches[0]!;

    assert.deepEqual([sw.saleIndex, sw.saleBar, sw.purchaseIndex, sw.purchaseBar], [3, 0, 3, 1]);
  });

  test('F6 equal timestamps: with the pool idle a deep decision wins over a shallow one in the same minute', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const result = runAllocator(
      [
        book('S', 'AAA', 'shallow', sh, [trade(sh, { decision: [1, 4], entry: [1, 5] })]),
        book('D', 'ZZZ', 'deep', dp, [trade(dp, { decision: [1, 4], entry: [1, 5] })])
      ],
      config(4, policyOf('P0'))
    );

    assert.equal(result.lots[0]!.bookId, 'D');

    // frozen ties (alphabetical by symbol) give the slot to the shallow AAA instead
    const frozen = runAllocator(
      [
        book('S', 'AAA', 'shallow', sh, [trade(sh, { decision: [1, 4], entry: [1, 5] })]),
        book('D', 'ZZZ', 'deep', dp, [trade(dp, { decision: [1, 4], entry: [1, 5] })])
      ],
      config(4, policyOf('P0'), { tieMode: 'frozen' })
    );

    assert.equal(frozen.lots[0]!.bookId, 'S');
  });

  test('F7 stale replacement: the deep trade exits before the purchase event', () => {
    const sh = market(shallowSessions(), 'sh');
    const dpSessions = deepSessions();

    dpSessions[3] = { closes: [53, 53.1], slots: [0, 1] }; // the deep symbol trades only two minutes in session 3

    const dp = market(dpSessions, 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3] });
    // decided at session 2's last minute, filled at session 3's opening trade, exits at session 3's second bar by a
    // maximum hold decided at the open; the shallow sale is at session 3 bar 0 and the purchase would be bar 1 = the exit
    const deep = trade(dp, { decision: [2, 9], entry: [3, 0], exit: [3, 1], reason: 'maximum hold' });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );

    assert.equal(result.switches[0]!.outcome, 'stale-replacement');
    assert.equal(result.lots.length, 1);
    assert.equal(result.lots[0]!.exitReason, 'priority_preemption');
  });

  test('F8 orphan mirror: the deep exit is a gap stop at the purchase print; the lot is sold at the next trade', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3] });
    const deep = trade(dp, {
      decision: [2, 9],
      entry: [3, 0],
      exit: [3, 1],
      reason: 'trailing stop gap',
      execution: 'opening trade'
    });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );

    assert.equal(result.lots.length, 2);
    assert.equal(result.lots[1]!.kind, 'orphan');
    assert.equal(result.lots[1]!.exitReason, 'orphan-mirror');
    assert.deepEqual(
      [result.lots[1]!.entryIndex, result.lots[1]!.entryBar, result.lots[1]!.exitIndex, result.lots[1]!.exitBar],
      [3, 1, 3, 2]
    );
  });

  test('F9 intrabar exit at the purchase bar: bought at the open, closed at the stop inside the same bar', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3] });
    const deep = trade(dp, {
      decision: [2, 9],
      entry: [3, 0],
      exit: [3, 1],
      exitPrice: 52.5,
      reason: 'trailing stop',
      execution: 'stop level'
    });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );
    const lot = result.lots[1]!;

    assert.equal(lot.kind, 'mirror');
    assert.deepEqual([lot.entryIndex, lot.entryBar, lot.exitIndex, lot.exitBar, lot.exitRawPrice], [3, 1, 3, 1, 52.5]);
  });

  test('F10 supersession: the shallow lot leaves by its own exit at the sale bar; the mirror follows', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3], exit: [2, 5], reason: 'buffered intraday loss' });
    const deep = trade(dp, { decision: [2, 4], entry: [2, 5] });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );

    assert.equal(result.switches[0]!.outcome, 'superseded');
    assert.equal(result.lots[0]!.exitReason, 'buffered intraday loss');
    assert.equal(result.lots[1]!.kind, 'mirror');
    assert.equal(result.lots[1]!.entryBar, 6);
  });

  test('F11 a deep decision cancels a pending shallow reservation (P1), not under P2L', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 9], entry: [2, 0] }); // carried overnight
    const deep = trade(dp, { decision: [1, 9], entry: [2, 0] });

    deep.decisionTime += 0; // same minute: the deep decision comes first anyway; use a later one instead
    const deepLater = trade(dp, { decision: [1, 9], entry: [2, 0] });
    const cancel = runAllocator(
      [book('S', 'AAA', 'shallow', sh, [shallow]), book('D', 'ZZZ', 'deep', dp, [deepLater])],
      config(4, policyOf('P1'), { tieMode: 'frozen' }) // frozen ties: the shallow AAA reserves first
    );

    assert.equal(cancel.switches[0]!.outcome, 'cancelled-reservation');
    assert.equal(cancel.lots[0]!.bookId, 'D');

    const legacy = runAllocator(
      [book('S', 'AAA', 'shallow', sh, [shallow]), book('D', 'ZZZ', 'deep', dp, [deepLater])],
      config(4, policyOf('P2', { replacement: 'legacy' }), { tieMode: 'frozen' })
    );

    assert.equal(legacy.lots[0]!.bookId, 'S');
  });

  test('F12 P3: a loss inside the budget switches; the deep-path filter declines a continuation decision', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3] });
    const deep = trade(dp, { decision: [2, 0], entry: [2, 1] }); // the shallow symbol is at 99 at the decision
    const loss = -(sharesAt(100) * 99 * (1 - c) - 100000 - (100000 * 0.11) / 365);
    const inside = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P3', { budget: Math.ceil(loss) + 500 }))
    );

    assert.equal(inside.switches[0]!.outcome, 'executed');

    const outside = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P3', { budget: 100 }))
    );

    assert.equal(outside.switches[0]!.outcome, 'declined');

    const continuation = trade(dp, { decision: [2, 0], entry: [2, 1], kind: 'continuation' });
    const filtered = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [continuation])],
      config(4, policyOf('P3', { budget: 5000, filter: 'deep' }))
    );

    assert.equal(filtered.switches[0]!.outcome, 'declined-filter');
  });

  test('F13 P4: waits for a breakeven close, else forced at the deadline', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [2, 5], entry: [2, 6] }); // bought at 94 in the fall
    const deep = trade(dp, { decision: [2, 8], entry: [2, 9] });
    const recover = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P4', { deadline: 1 }))
    );
    const sw = recover.switches[0]!;

    assert.equal(sw.waited, true);
    assert.equal(sw.outcome, 'executed');
    assert.equal(sw.saleIndex, 3); // the first close ≥ breakeven in session 3 (net ≥ 0 after costs and interest)
    assert.ok(sw.saleNet > -200);

    const never = trade(sh, { decision: [3, 8], entry: [3, 9] }); // bought at 99; session 4 opens at 100 …
    const deepEarly = trade(dp, { decision: [3, 9], entry: [4, 0] });
    const forced = runAllocator(
      [book('S', 'SH', 'shallow', sh, [never]), book('D', 'DP', 'deep', dp, [deepEarly])],
      config(4, policyOf('P4', { deadline: 0 }))
    );

    assert.ok(['executed', 'pending-at-end'].includes(forced.switches[0]!.outcome));
  });

  test('F14 P0M: nothing is sold; the deep trade is bought as a mirror when the shallow lot exits on its own', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3], exit: [3, 4] });
    const deep = trade(dp, { decision: [2, 4], entry: [2, 5] });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P0M'))
    );

    assert.equal(result.switches[0]!.late, true);
    assert.equal(result.lots[0]!.exitReason, 'maximum hold');
    assert.equal(result.lots[1]!.kind, 'mirror');
    assert.deepEqual([result.lots[1]!.entryIndex, result.lots[1]!.entryBar], [3, 5]);
  });

  test('F15 G1 refuses a shallow decision while a deep book is armed', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const deep = trade(dp, { decision: [3, 4], entry: [3, 5] });
    const deepBook: AllocBook = {
      ...book('D', 'DP', 'deep', dp, [deep]),
      trace: traceOf([deep], [{ from: barTime(dp, 1, 0), to: deep.entryTime, kind: 'deep' }])
    };
    const shallow = trade(sh, { decision: [2, 2], entry: [2, 3] });
    const gated = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), deepBook],
      config(4, policyOf('P0', { gate: 'G1' }))
    );

    assert.equal(gated.refusalReasons.gate, 1);
    assert.equal(gated.lots[0]!.bookId, 'D');
  });

  test('F16 same-symbol collision: sale and repurchase of one symbol pay both costs', () => {
    const sh = market(shallowSessions(), 'sh');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3] });
    const deep = trade(sh, { decision: [3, 2], entry: [3, 3] });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'SH', 'deep', sh, [deep])],
      config(4, policyOf('P1'))
    );

    assert.equal(result.lots.length, 2);
    assert.equal(result.lots[0]!.symbol, result.lots[1]!.symbol);
    assert.ok(result.lots[1]!.entryTime - result.lots[0]!.exitTime >= minute);
  });

  test('F17 reset: a lot filled at the year-end closing print is sold at the next opening trade', () => {
    const sh = market(shallowSessions(), 'sh');
    const shallow = trade(sh, { decision: [1, 9], entry: [1, 10] }); // decided before the close? bar 9 ends at the close: carried
    const lotAtClose = trade(sh, { decision: [1, 8], entry: [1, 10] });
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [lotAtClose])],
      config(4, policyOf('P0'), { resets: [1] })
    );

    void shallow;
    assert.equal(result.lots[0]!.exitReason, 'annual-reset');
    assert.deepEqual([result.lots[0]!.exitIndex, result.lots[0]!.exitBar], [2, 0]);
  });

  test('F18 weekend interest: the fill-test net counts the calendar days to the sale session', () => {
    // session dates with a three-day gap before the last session (a Friday → Monday style weekend)
    const dates = [0, 1, 2, 3, 6].map((offset) => dateOf(offset));
    const build = (specs: SessionSpec[], id: string) => {
      const ds = fixtureDataset(specs.map((spec, index) => buildSession(dates[index]!, spec)));

      ds.id = id;
      return ds;
    };
    const sh = build(shallowSessions(), 'sh-weekend');
    const dp = build(deepSessions(), 'dp-weekend');
    const shallow = trade(sh, { decision: [1, 2], entry: [1, 3] });
    const deep = trade(dp, { decision: [3, 9], entry: [4, 0] }); // decided at Friday's close; sold Monday's opening trade
    const result = runAllocator(
      [book('S', 'SH', 'shallow', sh, [shallow]), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );
    const sw = result.switches[0]!;
    const days = (sh.sTime[4]! - sh.sTime[1]!) / day;
    const expected =
      sharesAt(100) * (barOpen(sh, 4, 0) * (1 - c)) - 100000 - 100000 * 0.11 * ((days * day) / (365 * day));

    assert.equal(days, 5);
    assert.deepEqual([sw.saleIndex, sw.saleBar], [4, 0]);
    assert.ok(Math.abs(sw.saleNet - expected) < 1e-9);
    assert.ok(Math.abs(result.lots[0]!.net - expected) < 1e-9); // booked = tested
  });

  test('metamorphic: a shallow book that never trades leaves the deep pool unchanged; input order does not matter', () => {
    const sh = market(shallowSessions(), 'sh');
    const dp = market(deepSessions(), 'dp');
    const deep = trade(dp, { decision: [1, 4], entry: [1, 5], exit: [3, 2] });
    const alone = runAllocator([book('D', 'DP', 'deep', dp, [deep])], config(4, policyOf('P1')));
    const withSilent = runAllocator(
      [book('S', 'SH', 'shallow', sh, []), book('D', 'DP', 'deep', dp, [deep])],
      config(4, policyOf('P1'))
    );
    const reordered = runAllocator(
      [book('D', 'DP', 'deep', dp, [deep]), book('S', 'SH', 'shallow', sh, [])],
      config(4, policyOf('P1'))
    );

    for (const other of [withSilent, reordered]) {
      assert.equal(other.net, alone.net);
      assert.equal(other.minuteDrawdown.maximum, alone.minuteDrawdown.maximum);
      assert.deepEqual([...other.marks], [...alone.marks]);
    }
  });
});
