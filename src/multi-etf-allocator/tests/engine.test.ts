// The allocator engine on synthetic universes: one signal layer for both modes, the shared pool at every reservation
// and fill, the capital-release and tie rules, asynchronous files, the refused-signal semantics, the split capacity,
// eligibility, no compounding in the fixed pool, dividend entitlement and Vanguard's interest method.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Distribution } from '../../shared-margin-portfolio/data.ts';
import { type RunResult, runAllocator } from '../engine.ts';
import { PortfolioLedger, type RealLot } from '../ledger.ts';
import type { VirtualTrade } from '../shadow.ts';
import { type SessionSpec, dateOf, dipSession, flat, testConfig, universeOf } from './fixtures.ts';

const flats = (count: number, price = 100, bars = 6): SessionSpec[] =>
  Array.from({ length: count }, () => flat(price, bars));

const tradesBy = (result: RunResult, symbol: string) => result.trades.filter((trade) => trade.symbol === symbol);
const lotsBy = (result: RunResult, symbol: string) => result.lots.filter((lot) => lot.symbol === symbol);
const key = (trade: VirtualTrade) =>
  `${trade.symbol}:${trade.entryIndex}:${trade.entryBar}:${trade.exitIndex}:${trade.exitBar}`;

// XBI dips on session 3 and stays at 90; XRT dips on session 4 while XBI is held; both rise later.
const twoSymbolUniverse = () =>
  universeOf({
    VOOG: flats(8),
    VGT: flats(8),
    XBI: [...flats(3), dipSession(), ...flats(4, 90)],
    XRT: [...flats(4), dipSession(), ...flats(3, 90)]
  });

describe('one signal layer for both modes', () => {
  test('the virtual trades are identical in the fixed pool and the portfolio, and a refused signal stays virtual', () => {
    const universe = twoSymbolUniverse();
    const fixed = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI', 'XRT'] }));
    const portfolio = runAllocator(universe, testConfig({ mode: 'portfolio', symbols: ['XBI', 'XRT'] }));

    assert.deepEqual(fixed.trades.map(key), portfolio.trades.map(key));
    assert.equal(tradesBy(fixed, 'XBI').length, 1);
    assert.equal(tradesBy(fixed, 'XRT').length, 1);
    // XBI took the pool; XRT's signal was refused, and its virtual trade still filled.
    assert.equal(lotsBy(fixed, 'XBI').length, 1);
    assert.equal(lotsBy(fixed, 'XRT').length, 0);
    assert.equal(tradesBy(fixed, 'XRT')[0]!.allocator, 'refused');
    assert.equal(tradesBy(fixed, 'XRT')[0]!.entryIndex, 4);
    assert.equal(tradesBy(fixed, 'XRT')[0]!.fundedLotId, -1);

    const refusal = fixed.signals.find((signal) => signal.symbol === 'XRT')!;

    assert.equal(refusal.outcome, 'refused');
    assert.match(refusal.reason, /pool occupied \(XBI lot 1\)/);
    assert.equal(portfolio.signals.find((signal) => signal.symbol === 'XRT')!.outcome, 'refused');
  });

  test('a funded lot enters and exits exactly at its virtual trade', () => {
    const universe = twoSymbolUniverse();
    const result = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI'] }));
    const [lot] = result.lots;
    const trade = tradesBy(result, 'XBI')[0]!;

    assert.equal(lot!.entryIndex, trade.entryIndex);
    assert.equal(lot!.entryBar, trade.entryBar);
    assert.equal(lot!.entryRawPrice, 90);
    assert.equal(lot!.principal, 100000);
    assert.equal(lot!.shares, 100000 / 90);
  });
});

describe('the shared pool', () => {
  test('a pending order reserves the pool: a later decision before the fill is refused', () => {
    // XBI triggers on the last bar of session 3 and the session has no closing print, so its order waits for
    // session 4's open; XRT triggers later on session 3 and is refused because of the reservation.
    const xbiDip: SessionSpec = { closes: [100, 89, 88, 90], slots: [0, 1, 2, 3], closingPrint: false };
    const xrtDip: SessionSpec = { closes: [100, 100, 100, 100, 89, 88, 90, 90], slots: [0, 1, 2, 3, 4, 5, 6, 7] };
    const universe = universeOf({
      VOOG: flats(6, 100, 8),
      VGT: flats(6, 100, 8),
      XBI: [...flats(3, 100, 4), xbiDip, ...flats(2, 90, 4)],
      XRT: [...flats(3, 100, 8), xrtDip, ...flats(2, 90, 8)]
    });
    const result = runAllocator(universe, testConfig({ mode: 'portfolio', symbols: ['XBI', 'XRT'] }));
    const xbi = tradesBy(result, 'XBI')[0]!;
    const xrt = result.signals.find((signal) => signal.symbol === 'XRT')!;

    assert.equal(xbi.carriedOvernight, true);
    assert.equal(xbi.entryIndex, 4);
    assert.equal(xbi.entryExecution, 'opening trade');
    assert.equal(xrt.outcome, 'refused');
    assert.match(xrt.reason, /pending order/);
    assert.equal(result.lots.length, 1);
  });

  const releaseUniverse = (xbiSession5: number[]) =>
    universeOf({
      VOOG: flats(7),
      VGT: flats(7),
      // Fill at 90 on session 3; session 4 reaches 100, so the stop is 95 and active from session 5.
      XBI: [...flats(3), dipSession(), { closes: [92, 96, 100, 99] }, { closes: xbiSession5 }, flat(94)],
      // XRT arms on session 5's first close and triggers at the end of its third bar (stamped at bar 3's start).
      XRT: [...flats(5), { closes: [89, 88, 90, 90, 90, 90] }, flat(90)]
    });

  test('an exit frees the pool for a decision stamped after it', () => {
    // The stop fills inside bar 2 (its low reaches 95), before XRT's decision at the end of bar 2.
    const result = runAllocator(
      releaseUniverse([99, 97, 94, 94, 94]),
      testConfig({ mode: 'fixed', symbols: ['XBI', 'XRT'] })
    );
    const exit = lotsBy(result, 'XBI')[0]!;

    assert.equal(exit.exitIndex, 5);
    assert.equal(exit.exitBar, 2);
    assert.equal(exit.exitReason, 'trailing stop');
    assert.equal(result.signals.find((signal) => signal.symbol === 'XRT')!.outcome, 'granted');
    assert.equal(lotsBy(result, 'XRT').length, 1);
  });

  test('a decision stamped at the exit itself does not see the freed capital', () => {
    // The stop now fills in bar 3, at the same instant as XRT's decision (the end of bar 2): refused.
    const result = runAllocator(
      releaseUniverse([99, 98, 97, 94, 94]),
      testConfig({ mode: 'fixed', symbols: ['XBI', 'XRT'] })
    );
    const exit = lotsBy(result, 'XBI')[0]!;
    const xrt = result.signals.find((signal) => signal.symbol === 'XRT')!;

    assert.equal(exit.exitBar, 3);
    assert.equal(xrt.decisionTime, exit.exitTime);
    assert.equal(xrt.outcome, 'refused');
  });

  test('same-minute decisions follow the policy tie order: alphabetical (primary) or VGT > XBI > XRT > KRE', () => {
    const universe = universeOf({
      VOOG: flats(6),
      VGT: flats(6),
      XBI: [...flats(3), dipSession(), ...flats(2, 90)],
      KRE: [...flats(3), dipSession(), ...flats(2, 90)]
    });
    const shadow = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI', 'KRE'], policy: 'shadow' }));
    const priority = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI', 'KRE'], policy: 'priority' }));

    assert.equal(shadow.lots[0]!.symbol, 'KRE');
    assert.equal(priority.lots[0]!.symbol, 'XBI');
    assert.equal(
      shadow.signals.every((signal) => signal.sameMinuteCandidates === 2),
      true
    );
  });

  test('the split funds two lots of half the budget, refuses a third, and never exceeds the cap at an entry', () => {
    const universe = universeOf({
      VOOG: flats(8),
      VGT: flats(8),
      XBI: [...flats(3), dipSession(), ...flats(4, 90)],
      XRT: [...flats(4), dipSession(), ...flats(3, 90)],
      KRE: [...flats(5), dipSession(), ...flats(2, 90)]
    });
    const fixed = runAllocator(
      universe,
      testConfig({ mode: 'fixed', symbols: ['XBI', 'XRT', 'KRE'], policy: 'split' })
    );
    const portfolio = runAllocator(
      universe,
      testConfig({ mode: 'portfolio', symbols: ['XBI', 'XRT', 'KRE'], policy: 'split' })
    );

    assert.deepEqual(
      fixed.lots.map((lot) => [lot.symbol, lot.principal]),
      [
        ['XBI', 50000],
        ['XRT', 50000]
      ]
    );
    assert.match(fixed.signals.find((signal) => signal.symbol === 'KRE')!.reason, /both slots occupied/);

    const [first, second] = portfolio.lots as [RealLot, RealLot];

    assert.ok(Math.abs(first.originalPrincipal - 0.1 * first.equityAtDecision) < 1e-6);
    assert.ok(first.originalPrincipal + second.originalPrincipal <= 0.2 * second.equityAtDecision + 1e-6);
    assert.equal(portfolio.lots.length, 2);
  });
});

describe('refused-signal semantics', () => {
  test('cancel drops the refused setup (no virtual trade) and the book re-arms on its own conditions', () => {
    const universe = twoSymbolUniverse();
    const shadow = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI', 'XRT'], policy: 'shadow' }));
    const cancel = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI', 'XRT'], policy: 'cancel' }));

    assert.equal(tradesBy(shadow, 'XRT').length, 1);
    assert.equal(tradesBy(cancel, 'XRT').length, 0);
    assert.ok(cancel.signals.filter((signal) => signal.symbol === 'XRT' && signal.outcome === 'refused').length >= 1);
  });

  test('hold keeps the refused setup armed and counts its re-tests on one record', () => {
    const universe = twoSymbolUniverse();
    const hold = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI', 'XRT'], policy: 'hold' }));
    const records = hold.signals.filter((signal) => signal.symbol === 'XRT');

    assert.equal(records.length, 1);
    assert.ok(records[0]!.repeatedRefusals > 0);
  });
});

describe('asynchronous files, eligibility, compounding', () => {
  test("a symbol fills at its own next trade, not at another file's minute", () => {
    const xrtDip: SessionSpec = { closes: [100, 89, 88, 90, 90], slots: [0, 1, 2, 3, 10] };
    const universe = universeOf({
      VOOG: flats(5, 100, 11),
      VGT: flats(5, 100, 11),
      XRT: [
        ...flats(3, 100, 5).map((spec) => ({ ...spec, slots: [0, 1, 2, 3, 10] })),
        xrtDip,
        { closes: [90, 90, 90, 90, 90], slots: [0, 1, 2, 3, 10] }
      ]
    });
    const result = runAllocator(universe, testConfig({ mode: 'portfolio', symbols: ['XRT'] }));
    const lot = result.lots[0]!;
    const ds = universe.instruments.XRT!.ds;

    assert.equal(lot.entryBar, 4);
    assert.equal(lot.entryTime, ds.sTime[3]! + (14 * 60 + 30 + 10) * 60);
  });

  test('nothing arms before the first eligible session', () => {
    const universe = twoSymbolUniverse();
    const early = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI'], eligibilityIndex: 4 }));

    assert.equal(early.trades.length, 0);
  });

  test('the fixed pool never compounds: every lot borrows exactly $100,000', () => {
    // Two profitable round trips of XBI.
    const universe = universeOf({
      VOOG: flats(12),
      VGT: flats(12),
      XBI: [
        ...flats(3),
        dipSession(),
        { closes: [95, 100, 105, 110] },
        { closes: [110, 104, 104] },
        ...flats(2, 104),
        { closes: [104, 92, 91, 93, 93] },
        { closes: [95, 100, 105, 110] },
        { closes: [110, 104, 104] },
        flat(104)
      ]
    });
    const result = runAllocator(universe, testConfig({ mode: 'fixed', symbols: ['XBI'] }));

    assert.ok(result.lots.length >= 2);
    assert.ok(result.lots.every((lot) => lot.principal === 100000));
    assert.ok(result.lots[0]!.net > 0);
  });
});

describe('dividends and interest', () => {
  test('a VGT lot is entitled to a VGT distribution; a sector lot to nothing; no double payment', () => {
    const distributions: Distribution[] = [
      {
        etf: 'VGT',
        exDate: dateOf(5),
        payDate: dateOf(6),
        amount: 1,
        amountMethod: 'test',
        exDateMethod: 'test',
        payDateMethod: 'test',
        closeBefore: 90
      }
    ];
    const universe = universeOf(
      {
        VOOG: flats(8),
        VGT: [...flats(3), dipSession(), ...flats(4, 90)],
        XBI: [...flats(3), dipSession(), ...flats(4, 90)]
      },
      distributions
    );
    const vgt = runAllocator(universe, testConfig({ mode: 'portfolio', symbols: ['VGT'] }));
    const xbi = runAllocator(universe, testConfig({ mode: 'portfolio', symbols: ['XBI'] }));
    const vgtLot = vgt.lots[0]!;

    assert.ok(Math.abs(vgtLot.dividends - vgtLot.shares) < 1e-9);
    assert.equal(xbi.lots[0]!.dividends, 0);
    assert.equal(vgt.dividends.filter((row) => row.source === 'lot').length, 1);
    assert.equal(vgt.dividends.filter((row) => row.source === 'core').length, 1);
    assert.equal(xbi.dividends.length, 1);
  });

  test('Vanguard interest accrues actual/360 on the whole debit at its tier rate and capitalizes on the 1st', () => {
    const ledger = new PortfolioLedger({
      costBps: 0,
      interest: {
        kind: 'vanguard',
        tiers: [
          { upTo: 99999.99, rate: 0.12 },
          { upTo: Infinity, rate: 0.1 }
        ]
      }
    });
    const day = (date: string) => Date.parse(date) / 1000;

    ledger.accrueTo(day('2024-01-29'), 0);
    ledger.openLot({
      id: 1,
      symbol: 'XBI',
      trade: {} as VirtualTrade,
      slot: 0,
      shares: 1000,
      entryIndex: 0,
      entryBar: 0,
      entryTime: day('2024-01-29'),
      entryRawPrice: 150,
      entryPrice: 150,
      entryExecution: '',
      entryTimestamp: day('2024-01-29'),
      decisionIndex: 0,
      decisionTime: day('2024-01-29'),
      decisionPrice: 150,
      equityAtDecision: 750000,
      fraction: 0.2,
      originalPrincipal: 150000,
      principal: 150000,
      accruedBefore: 0,
      accrualStart: day('2024-01-29'),
      posted: 0,
      accrued: 0,
      repaidByCore: 0,
      dividends: 0
    });
    // Jan 30, Jan 31 accrue; on Feb 1 the two days post, then Feb 1 and Feb 2 accrue on the larger debit.
    ledger.accrueTo(day('2024-02-02'), 750000);

    const lot = ledger.open[0]!;
    const daily = (150000 * 0.1) / 360;

    assert.ok(Math.abs(lot.posted - 2 * daily) < 1e-9);
    assert.ok(Math.abs(lot.accrued - (2 * ((150000 + 2 * daily) * 0.1)) / 360) < 1e-9);
    assert.ok(Math.abs(ledger.lotInterest(lot, day('2024-02-02')) - (lot.posted + lot.accrued)) < 1e-12);
  });
});
