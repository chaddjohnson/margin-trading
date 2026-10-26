// The derived engine and replay on synthetic data (research/d1-ranked-preemption/PROTOCOL.md §5, §19): P0 equals the
// frozen engine and the frozen replay; P1's switch rules at exact boundaries (net $0, ±$0.01, gross positive but
// net negative, weekend interest, the next eligible trade); no switch for lower or equal priority, a reservation, a
// pending preemption, or a missing executable trade; same-minute competitors; an own exit superseding a switch;
// shadow divergence and later re-entries; causality under future mutations; accounting identities; and the replay
// equal to the engine field for field under every policy.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { runAllocator } from '../../multi-etf-allocator/engine.ts';
import { testConfig, testPhenotype, universeOf } from '../../multi-etf-allocator/tests/fixtures.ts';
import { compareValues, outputsOf } from '../../portfolio-aware-d1/compare.ts';
import { type NUniverse, baseNRunConfig, runNAllocator } from '../../portfolio-aware-d1/nbook/engine.ts';
import { replayFixedPool } from '../../portfolio-aware-d1/replay.ts';
import { fixedLiquidation } from '../allocation.ts';
import { type PRunResult, runPAllocator } from '../engine.ts';
import { replayPreemptive } from '../replay.ts';
import {
  type FixtureRun,
  type SessionSpec,
  allocationFor,
  configOf,
  dipTo,
  flat,
  flats,
  replayBooksOf,
  weekdayUniverse,
  weekdays
} from './fixtures.ts';

const ignore = new Set(['config', 'universe', 'maintenanceEvents', 'forcedLiquidations']);

const run = (universe: NUniverse, spec: FixtureRun) => runPAllocator(universe, configOf(spec));

const replay = (universe: NUniverse, spec: FixtureRun, books = replayBooksOf(universe, spec)) =>
  replayPreemptive(books, {
    symbols: spec.symbols,
    startIndex: 0,
    endIndex: universe.sessionCount - 1,
    principal: 100000,
    rate: spec.rate ?? 0.11,
    costBps: spec.costBps ?? 0,
    stopSlippageBps: 0,
    detail: true,
    allocation: allocationFor(spec)
  });

// The engine's fixed-mode result against the replay's full detail, and the preemption records (the replay does not
// see the books' machine states, so that field is engine-only).
const assertParity = (universe: NUniverse, spec: FixtureRun, label: string) => {
  const full = run(universe, spec);
  const fast = replay(universe, spec);
  const { preemptions, declines, allocationKey, priorityOrder, ...rest } = outputsOf(full) as PRunResult;

  void allocationKey;
  void priorityOrder;
  assert.deepEqual(compareValues(rest, fast.full), [], `${label}: engine vs replay`);
  assert.deepEqual(
    compareValues(
      preemptions.map((record) => ({ ...record, targetVirtualState: '' })),
      fast.preemptions
    ),
    [],
    `${label}: preemption records`
  );
  assert.deepEqual(compareValues(declines, fast.declines), [], `${label}: declines`);
  assert.equal(
    fast.net,
    full.lots.reduce((total, lot) => total + lot.net, 0),
    `${label}: net`
  );

  return { full, fast };
};

// XRT (low priority) is bought at 100 on session 3 and held flat at `price` from session 4; VGT (high priority)
// signals on session `vgtSession`, both books' bars flat at their prices.
const switchUniverse = (price: number, vgtSession = 5, sessions = 9) =>
  weekdayUniverse({
    XRT: [...flats(3, 112), dipTo(112, 100), ...flats(sessions - 4, price)],
    VGT: [...flats(vgtSession, 100), dipTo(100, 89), ...flats(sessions - vgtSession - 1, 89)]
  });

const p1 = (extra: Partial<FixtureRun> = {}): FixtureRun => ({
  symbols: ['VGT', 'XRT'],
  policy: 'P1',
  order: ['VGT', 'XRT'],
  rate: 0,
  costBps: 0,
  ...extra
});

describe('P0 is the frozen policy', () => {
  test('the derived engine equals the frozen engine (fixed and portfolio, several costs)', () => {
    const universe = universeOf({
      VOOG: flats(10),
      VGT: [...flats(5), dipTo(100, 90), ...flats(4, 95)],
      XBI: [...flats(3), dipTo(100, 90), ...flats(6, 90)],
      XRT: [...flats(4), dipTo(100, 90), ...flats(5, 90)],
      KRE: [...flats(3), dipTo(100, 90, 1, 2), ...flats(6, 92)]
    }) as unknown as NUniverse;

    for (const mode of ['fixed', 'portfolio'] as const) {
      for (const costBps of [0, 2, 5, 10]) {
        const symbols = ['VGT', 'XBI', 'XRT', 'KRE'];
        const books = Object.fromEntries(
          symbols.map((symbol) => {
            const phenotype = testPhenotype(symbol as 'VGT');

            return [symbol, { symbol, name: phenotype.name, params: phenotype.params, short: phenotype.short }];
          })
        );
        const config = baseNRunConfig({
          key: 'test',
          label: 'test',
          mode,
          symbols,
          phenotypes: books,
          costBps,
          initial: { voog: 60000, vgt: 40000 }
        });
        const frozen = runNAllocator(universe, config);
        const derived = runPAllocator(universe, config);
        const { preemptions, declines, allocationKey, priorityOrder, ...rest } = derived;

        assert.ok(frozen.lots.length > 0, 'the fixture funds lots');
        assert.deepEqual(compareValues(frozen, rest, { ignore }), [], `${mode} ${costBps} bps`);
        assert.equal(preemptions.length + declines.length, 0);
        assert.equal(allocationKey, 'P0');
        assert.deepEqual(priorityOrder, []);
        // and the four-book frozen engine of the earlier program, for the record
        assert.ok(runAllocator(universe as never, testConfig({ mode, costBps, policy: 'shadow' })).lots.length > 0);
      }
    }
  });

  test('the derived replay equals the frozen replay under P0', () => {
    const universe = weekdayUniverse({
      VGT: [...flats(5), dipTo(100, 90), ...flats(4, 95)],
      XBI: [...flats(3), dipTo(100, 90), ...flats(6, 90)],
      XRT: [...flats(4), dipTo(100, 90), ...flats(5, 90)],
      GDX: [...flats(5), dipTo(100, 90), ...flats(4, 99)]
    });

    for (const costBps of [0, 5, 10]) {
      const spec: FixtureRun = { symbols: ['VGT', 'XBI', 'XRT', 'GDX'], costBps };
      const books = replayBooksOf(universe, spec);
      const config = {
        symbols: spec.symbols,
        startIndex: 0,
        endIndex: universe.sessionCount - 1,
        principal: 100000,
        rate: 0.11,
        costBps,
        stopSlippageBps: 0,
        detail: true
      };
      const frozen = replayFixedPool(books, config);
      const derived = replayPreemptive(books, config);

      assert.deepEqual(compareValues(frozen.full, derived.full), [], `${costBps} bps full`);
      assert.equal(derived.net, frozen.net);
      assert.deepEqual(compareValues(frozen.minuteDrawdown, derived.minuteDrawdown), []);
      assert.deepEqual(compareValues(frozen.marks, derived.marks), []);
      assertParity(universe, spec, `P0 ${costBps} bps`);
    }
  });
});

describe('P1 net-breakeven boundary', () => {
  test('switches at exactly $0 and at +$0.01, not at −$0.01', () => {
    for (const [price, expected] of [
      [100, true],
      [100.00001, true],
      [99.99999, false]
    ] as const) {
      const universe = switchUniverse(price);
      const { full } = assertParity(universe, p1(), `price ${price}`);
      const xrt = full.lots.find((lot) => lot.symbol === 'XRT')!;
      const net = fixedLiquidation(xrt, price, xrt.entryTimestamp, 0, 0).net;

      assert.equal(xrt.entryRawPrice, 100);
      assert.equal(full.preemptions.length, expected ? 1 : 0, `price ${price}`);

      if (expected) {
        const record = full.preemptions[0]!;

        assert.equal(record.outcome, 'executed');
        assert.equal(xrt.exitReason, 'priority_preemption');
        assert.equal(xrt.net, net);
        assert.ok(xrt.net >= 0);
        assert.equal(record.executionNet, xrt.net);
        assert.equal(full.lots.at(-1)!.symbol, 'VGT', 'the replacement is funded');
        assert.equal(full.lots.at(-1)!.entryTime, xrt.exitTime, 'bought in the minute the incumbent is sold');
      } else {
        assert.ok(net < 0 && net > -0.011);
        assert.equal(xrt.exitReason, 'open');
        assert.equal(full.declines.length, 1);
        assert.match(full.signals.find((signal) => signal.symbol === 'VGT')!.reason, /preemption declined/);
      }
    }
  });

  test('a gross gain that interest and friction turn into a net loss does not switch', () => {
    const universe = switchUniverse(100.1);
    const spec = p1({ rate: 0.11, costBps: 5 });
    const { full } = assertParity(universe, spec, 'gross positive');
    const xrt = full.lots.find((lot) => lot.symbol === 'XRT')!;
    const decision = full.signals.find((signal) => signal.symbol === 'VGT')!;
    const estimate = fixedLiquidation(xrt, 100.1, universe.instruments.XRT!.ds.sTime[decision.index]!, 0.11, 5);

    assert.ok(100.1 > xrt.entryRawPrice, 'the raw price is above the raw entry');
    assert.ok(xrt.shares * (100.1 - xrt.entryRawPrice) > 0, 'gross before costs positive');
    assert.ok(estimate.net < 0, 'net after both frictions and interest negative');
    assert.equal(full.preemptions.length, 0);
    assert.equal(full.declines[0]!.estimateNet, estimate.net);
  });

  test('weekend interest: a Friday-close decision is tested again at Monday’s open', () => {
    // VGT triggers on Friday's last minute (decision at the close), so both its order and XRT's sale wait for Monday.
    // XRT trades at Monday's open; VGT's first Monday minute is 9:35, so the sale strictly precedes the purchase.
    const friday = (fill: number): SessionSpec => ({
      closes: [100, 89, 88, fill],
      slots: [0, 386, 387, 389]
    });
    const build = (xrtFriday: number, xrtMonday: number, vgtMondaySlots = [5, 6, 7]) =>
      weekdayUniverse({
        // sessions Mon..Fri (0..4), Mon (5), Tue (6); XRT bought Thursday (3) at 100
        XRT: [...flats(3, 112), dipTo(112, 100), flat(xrtFriday), flat(xrtMonday), flat(xrtMonday)],
        VGT: [...flats(4, 100), friday(89), { closes: [89, 89, 89], slots: vgtMondaySlots }, flat(89)]
      });
    const perDay = (100000 * 0.11) / 365;
    // Friday net +$40 → Monday's three extra days of interest (≈ $90.41) make it negative at the same price.
    const fridayPrice = 100 + (40 + perDay) / 1000;
    const aborted = assertParity(build(fridayPrice, fridayPrice), p1({ rate: 0.11 }), 'weekend abort').full;

    assert.equal(aborted.preemptions.length, 1);
    assert.equal(aborted.preemptions[0]!.outcome, 'aborted');
    assert.ok(aborted.preemptions[0]!.estimateNet >= 0);
    assert.ok(aborted.preemptions[0]!.executionNet < 0);
    assert.equal(aborted.preemptions[0]!.executionDate, aborted.universe.dates[5]);
    assert.ok(
      Math.abs(aborted.preemptions[0]!.executionInterest - aborted.preemptions[0]!.estimateInterest - 3 * perDay) < 1e-6
    );
    assert.equal(aborted.lots.length, 1, 'XRT kept, VGT unfunded');
    assert.equal(aborted.trades.find((trade) => trade.symbol === 'VGT')!.allocator, 'refused');

    // Monday opens higher: the sale at the next eligible trade passes; VGT is bought at its first Monday minute.
    const executed = assertParity(build(fridayPrice, 101), p1({ rate: 0.11 }), 'weekend execute').full;

    assert.equal(executed.preemptions[0]!.outcome, 'executed');
    assert.equal(executed.preemptions[0]!.executionRawPrice, 101);
    assert.equal(executed.lots[1]!.entryTime, executed.lots[0]!.exitTime + 300);

    // The same Monday, but VGT's order would fill at the same opening print as the sale: the switch aborts unsold.
    const auction = assertParity(build(fridayPrice, 101, [0, 1, 2]), p1({ rate: 0.11 }), 'weekend auction').full;

    assert.equal(auction.preemptions[0]!.outcome, 'aborted');
    assert.match(auction.preemptions[0]!.reason, /same auction print/);
    assert.ok(Number.isNaN(auction.preemptions[0]!.executionNet), 'no sale was tested');
    assert.equal(auction.lots.length, 1);
    assert.equal(auction.lots[0]!.exitReason, 'open');
  });
});

describe('P1 refusals', () => {
  test('lower or equal priority never preempts', () => {
    const universe = switchUniverse(105);
    const lower = assertParity(universe, p1({ order: ['XRT', 'VGT'] }), 'lower').full;

    assert.equal(lower.preemptions.length, 0);
    assert.match(lower.signals.find((signal) => signal.symbol === 'VGT')!.reason, /not above XRT/);
    // P0 and P0R refuse it too
    assert.equal(assertParity(universe, { ...p1(), policy: 'P0R' }, 'P0R').full.preemptions.length, 0);
    assert.equal(assertParity(universe, { ...p1(), policy: 'P0', order: undefined }, 'P0').full.lots.length, 1);
  });

  test('a pending reservation is never preempted', () => {
    // XRT decides at bar 3 but its next bar is 30 minutes later; VGT's decision in between finds a reservation.
    const universe = weekdayUniverse({
      XRT: [...flats(3, 112), { closes: [112, 99.68, 98.56, 100, 100], slots: [0, 1, 2, 3, 33] }, ...flats(3, 101)],
      VGT: [
        ...flats(3, 100),
        { closes: [100, 100, 100, 100, 89, 88, 89.5, 89.5], slots: [0, 1, 2, 3, 10, 11, 12, 13] },
        ...flats(3, 90)
      ]
    });
    const { full } = assertParity(universe, p1(), 'reservation');
    const vgt = full.signals.find((signal) => signal.symbol === 'VGT')!;

    assert.equal(full.preemptions.length, 0);
    assert.match(vgt.reason, /pending order/);
    assert.equal(full.lots[0]!.symbol, 'XRT');
  });

  test('no executable trade of the incumbent before the replacement fills: abort, nothing sold', () => {
    // XRT's last bar of the session precedes VGT's decision and XRT has no closing print; VGT fills a minute later.
    const universe = weekdayUniverse({
      XRT: [
        ...flats(3, 112),
        dipTo(112, 100),
        flat(100),
        { closes: [100, 100], slots: [0, 1], closingPrint: false },
        ...flats(3, 100)
      ],
      VGT: [...flats(5, 100), { closes: [100, 100, 89, 88, 89.5, 89.5], slots: [0, 1, 5, 6, 7, 8] }, ...flats(3, 90)]
    });
    const { full } = assertParity(universe, p1(), 'no executable trade');

    assert.equal(full.preemptions.length, 1);
    assert.equal(full.preemptions[0]!.outcome, 'aborted');
    assert.match(full.preemptions[0]!.reason, /filled before XRT could be sold/);
    assert.equal(full.lots.length, 1);
    assert.equal(full.lots[0]!.exitReason, 'open');
  });

  test('every book must hold a frozen rank', () => {
    assert.throws(() => run(switchUniverse(100), p1({ order: ['VGT'] })), /no frozen rank/);
  });
});

describe('P1 competition, ordering and divergence', () => {
  test('three fresh higher-priority signals in one minute: the highest preempts, the others wait; deterministic', () => {
    const universe = weekdayUniverse({
      XRT: [...flats(3, 112), dipTo(112, 100), ...flats(5, 100.5)],
      VGT: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)],
      XBI: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)],
      GDX: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)]
    });
    const spec = p1({ symbols: ['VGT', 'XBI', 'XRT', 'GDX'], order: ['XBI', 'GDX', 'VGT', 'XRT'] });
    const { full } = assertParity(universe, spec, 'three competitors');
    const again = run(universe, spec);

    assert.equal(full.preemptions.length, 1, 'one switch, no chain');
    assert.equal(full.preemptions[0]!.targetSymbol, 'XBI');
    assert.deepEqual(
      full.signals.filter((signal) => signal.index === 5).map((signal) => `${signal.symbol}:${signal.outcome}`),
      ['XBI:granted', 'GDX:refused', 'VGT:refused'],
      'answered in the priority order'
    );
    assert.match(full.signals.find((signal) => signal.symbol === 'GDX')!.reason, /preemption pending/);
    assert.deepEqual(compareValues(outputsOf(full), outputsOf(again)), []);

    // P0R answers the same minute in the priority order without preempting; P0 alphabetically.
    const p0r = assertParity(universe, { ...spec, policy: 'P0R' }, 'P0R competitors').full;

    assert.equal(p0r.preemptions.length, 0);
    assert.deepEqual(
      p0r.signals.filter((signal) => signal.index === 5).map((signal) => signal.symbol),
      ['XBI', 'GDX', 'VGT']
    );

    const p0 = assertParity(universe, { ...spec, policy: 'P0', order: undefined }, 'P0 competitors').full;

    assert.deepEqual(
      p0.signals.filter((signal) => signal.index === 5).map((signal) => signal.symbol),
      ['GDX', 'VGT', 'XBI']
    );
  });

  test('an own exit at the sale bar supersedes the switch; the replacement is bought at its later fill', () => {
    // XRT rallies to 110 (its 5% net stop becomes active at 104.5), VGT decides at Friday's close, XRT gaps to 103 on
    // Monday: the gap exit at the opening trade precedes the sale; VGT's first Monday minute is 9:35.
    const friday: SessionSpec = { closes: [100, 89, 88, 89], slots: [0, 386, 387, 389] };
    const build = (vgtMondaySlots: number[]) =>
      weekdayUniverse({
        XRT: [...flats(3, 112), dipTo(112, 100), flat(110), flat(103), flat(103)],
        VGT: [...flats(4, 100), friday, { closes: [89, 89, 89], slots: vgtMondaySlots }, flat(89)]
      });
    const { full } = assertParity(build([5, 6, 7]), p1(), 'own exit first');
    const xrt = full.lots[0]!;

    assert.equal(full.preemptions[0]!.outcome, 'superseded');
    assert.equal(full.preemptions[0]!.releasedPrincipal, 100000);
    assert.equal(xrt.exitReason, 'trailing stop gap');
    assert.equal(full.lots[1]!.symbol, 'VGT');
    assert.equal(full.lots[1]!.entryTime, xrt.exitTime + 300);

    // VGT would fill at the same opening print as XRT's gap exit: no contingent purchase there, the switch aborts.
    const auction = assertParity(build([0, 1, 2]), p1(), 'own exit same auction').full;

    assert.equal(auction.preemptions[0]!.outcome, 'aborted');
    assert.match(auction.preemptions[0]!.reason, /own exit and VGT's fill would be the same auction print/);
    assert.equal(auction.lots.length, 1);
    assert.equal(auction.lots[0]!.exitReason, 'trailing stop gap');
  });

  test('an own stop inside the sale bar does not pre-empt the sale at the bar open', () => {
    // XRT is bought at 100 and rallies to `high` (its net 5% stop becomes active at 0.95 × high). On session 6 VGT
    // decides at the end of 14:32; XRT's 14:33 bar opens at `open` and its low touches the stop. The sale at the open
    // is attempted first: it executes under P1 (VGT bought at 14:33, same continuous minute); with the $500 buffer and
    // a sale net of ~$400 it aborts and the own stop closes the lot inside the bar.
    const build = (high: number, open: number, after: number) =>
      weekdayUniverse({
        XRT: [
          ...flats(3, 112),
          dipTo(112, 100),
          flat(high),
          flat(high),
          { closes: [high, high, high, after, after], opens: [undefined, undefined, undefined, open, undefined] },
          flat(after)
        ],
        VGT: [...flats(6, 100), { closes: [89, 88, 89.5, 89.5, 89.5] }, flat(89.5)]
      });
    const sold = assertParity(build(110, 106, 104), p1(), 'intrabar stop, sale first').full;

    assert.equal(sold.preemptions[0]!.outcome, 'executed');
    assert.equal(sold.lots[0]!.exitReason, 'priority_preemption');
    assert.equal(sold.lots[0]!.exitRawPrice, 106, 'sold at the bar open, above the stop the low touched');
    assert.equal(sold.lots[1]!.symbol, 'VGT');
    assert.equal(sold.lots[1]!.entryTime, sold.lots[0]!.exitTime);
    assert.equal(
      sold.trades.find((trade) => trade.symbol === 'XRT')!.exitReason,
      'trailing stop',
      'the virtual stop fires'
    );

    const kept = assertParity(build(105.6, 100.4, 100), p1({ policy: 'P1-B500' }), 'intrabar stop, sale fails').full;

    assert.equal(kept.preemptions[0]!.outcome, 'aborted');
    assert.ok(kept.preemptions[0]!.executionNet > 0 && kept.preemptions[0]!.executionNet < 500);
    assert.equal(kept.lots.length, 1);
    assert.equal(kept.lots[0]!.exitReason, 'trailing stop');
    assert.ok(Math.abs(kept.lots[0]!.exitRawPrice - 105.6 * 0.95) < 1e-9, 'the own stop at its level');
  });

  test('shadow divergence: the incumbent book keeps its virtual position and re-enters only after its virtual exit', () => {
    // XRT preempted at 100.5 on session 5 keeps its virtual position, which rises to 110 and gaps out at 104 on
    // session 9; VGT stops out on session 9; XRT dips again on session 12 (a fresh signal) and is funded.
    const universe = weekdayUniverse({
      XRT: [
        ...flats(3, 112),
        dipTo(112, 100),
        flat(100.5),
        flat(100.5),
        flat(110),
        flat(110),
        flat(110),
        flat(104),
        flat(104),
        flat(104),
        dipTo(104, 92.5),
        ...flats(3, 92.5)
      ],
      VGT: [...flats(5, 100), dipTo(100, 89), flat(89), flat(89), flat(98), flat(92), ...flats(6, 92)]
    });
    const { full } = assertParity(universe, p1(), 'divergence');
    const [first, replacement, later] = full.lots;
    const xrtTrades = full.trades.filter((trade) => trade.symbol === 'XRT');

    assert.equal(first!.exitReason, 'priority_preemption');
    assert.equal(replacement!.symbol, 'VGT');
    assert.ok(xrtTrades[0]!.exitTime > first!.exitTime, 'the virtual position outlives the funded lot');
    assert.equal(xrtTrades[0]!.fundedLotId, first!.id);
    assert.ok(
      !full.signals.some(
        (signal) =>
          signal.symbol === 'XRT' &&
          signal.decisionTime > first!.exitTime &&
          signal.decisionTime < xrtTrades[0]!.exitTime
      ),
      'no XRT signal while its virtual position is open'
    );
    assert.ok(later && later.symbol === 'XRT' && later.trade.id === 2, 'a later fresh XRT signal is funded');
  });

  test('a mutation of later bars never changes an earlier switch', () => {
    const base = switchUniverse(100.5, 5, 12);
    const mutated = switchUniverse(100.5, 5, 12);
    const vgt = mutated.instruments.VGT!.ds;
    const xrt = mutated.instruments.XRT!.ds;
    const from = 7; // sessions after the switch (decided and executed on session 5)

    for (const ds of [vgt, xrt]) {
      for (let s = from; s < ds.sessionCount; s++) {
        for (let k = ds.sBarStart[s]!; k < ds.sBarStart[s]! + ds.sBarCount[s]!; k++) {
          ds.bOpen[k] = ds.bOpen[k]! * 1.3;
          ds.bHigh[k] = ds.bHigh[k]! * 1.3;
          ds.bLow[k] = ds.bLow[k]! * 0.6;
          ds.bClose[k] = ds.bClose[k]! * 0.7;
        }

        ds.sClose[s] = ds.sClose[s]! * 0.7;
      }
    }

    const a = run(base, p1());
    const b = run(mutated, p1());
    const early = (result: PRunResult) => ({
      preemptions: result.preemptions.filter((record) => record.decisionIndex < from),
      signals: result.signals
        .filter((signal) => signal.index < from)
        .map((signal) => [signal.symbol, signal.outcome, signal.reason]),
      lots: result.lots
        .filter((lot) => lot.entryIndex < from)
        .map((lot) => [lot.symbol, lot.entryTime, lot.entryRawPrice])
    });

    assert.equal(a.preemptions.length, 1);
    assert.deepEqual(compareValues(early(a), early(b)), []);
  });
});

describe('P1 accounting', () => {
  test('one lot at a time, nets reconcile, interest interval and both frictions', () => {
    const universe = switchUniverse(101, 5, 10);
    const { full, fast } = assertParity(universe, p1({ rate: 0.11, costBps: 5 }), 'accounting');
    const [xrt, vgt] = full.lots;
    const record = full.preemptions[0]!;
    const sTime = universe.instruments.XRT!.ds.sTime;

    assert.equal(record.outcome, 'executed');
    assert.ok(xrt!.exitTime <= vgt!.entryTime, 'sold before the replacement is bought');
    assert.equal(xrt!.interest, (100000 * 0.11 * (sTime[xrt!.exitIndex]! - sTime[xrt!.entryIndex]!)) / (365 * 86400));
    assert.ok(Math.abs(record.entryFriction - xrt!.shares * (xrt!.entryPrice - xrt!.entryRawPrice)) < 1e-9);
    assert.ok(Math.abs(record.exitFriction - xrt!.shares * (xrt!.exitRawPrice - xrt!.exitPrice)) < 1e-9);
    assert.ok(
      Math.abs(
        xrt!.shares * (xrt!.exitRawPrice - xrt!.entryRawPrice) -
          record.entryFriction -
          record.exitFriction -
          xrt!.interest -
          xrt!.net
      ) < 1e-6
    );
    assert.equal(fast.lots[0]!.preemptionId, 1);
    assert.equal(fast.lots[0]!.exitReason, 'priority_preemption');
    assert.ok(full.minuteDrawdown.maximum >= full.dailyDrawdown.maximum - 1e-9, 'minute DD ≥ daily DD');

    for (const row of full.daily) {
      assert.ok(row.openLots <= 1, `one lot at ${row.date}`);
    }
  });

  test('a preemption pending at the end of the data aborts; the incumbent is marked open', () => {
    const universe = weekdayUniverse({
      XRT: [
        ...flats(3, 112),
        dipTo(112, 100),
        flat(100.5),
        { closes: [100.5, 100.5], slots: [0, 1], closingPrint: false }
      ],
      VGT: [...flats(5, 100), { closes: [100, 100, 89, 88, 89.5], slots: [0, 1, 5, 6, 7], closingPrint: false }]
    });
    const { full } = assertParity(universe, p1(), 'end of data');

    assert.equal(full.preemptions[0]!.outcome, 'aborted');
    assert.match(full.preemptions[0]!.reason, /data end/);
    assert.equal(full.lots[0]!.exitReason, 'open');
  });

  test('portfolio mode funds the same lots as the fixed pool when margin does not bind; no dividend after the sale', () => {
    // VGT (low priority) is bought at 100 on session 3 and preempted by XRT on session 5; a VGT distribution goes
    // ex on session 7: the core's VGT shares receive it, the sold VGT lot does not.
    const dates = weekdays(10);
    const distribution = {
      etf: 'VGT' as const,
      exDate: dates[7]!,
      payDate: dates[8]!,
      amount: 0.5,
      amountMethod: 'test',
      exDateMethod: 'test',
      payDateMethod: 'test',
      closeBefore: 100.5
    };
    const universe = weekdayUniverse(
      {
        VOOG: flats(10, 100),
        VGT: [...flats(3, 112), dipTo(112, 100), ...flats(6, 100.5)],
        XRT: [...flats(5, 100), dipTo(100, 89), ...flats(4, 89)]
      },
      [distribution]
    );
    const spec = p1({ symbols: ['VGT', 'XRT'], order: ['XRT', 'VGT'], rate: 0.11, costBps: 5, mode: 'portfolio' });
    const portfolio = run(universe, spec);
    const fixed = run(universe, { ...spec, mode: 'fixed' });
    const key = (result: PRunResult) =>
      result.lots.map((lot) => `${lot.symbol}:${lot.entryTime}:${lot.exitTime}:${lot.exitReason}`);

    assert.equal(fixed.preemptions[0]!.outcome, 'executed');
    assert.deepEqual(key(portfolio), key(fixed));
    assert.equal(portfolio.preemptions[0]!.outcome, 'executed');
    assert.equal(portfolio.lots[0]!.symbol, 'VGT');
    assert.equal(portfolio.lots[0]!.dividends, 0, 'the sold VGT lot is not entitled');
    assert.ok(
      portfolio.dividends.some((row) => row.source === 'core' && row.etf === 'VGT'),
      'the core is'
    );
    assert.ok(!portfolio.dividends.some((row) => row.source === 'lot'));
    assert.ok(Math.abs(portfolio.preemptions[0]!.executionNet - portfolio.lots[0]!.net) === 0);
  });

  test('prices in other units (a split-adjusted history) give the same switches and dollars', () => {
    const scaled = (factor: number) =>
      weekdayUniverse({
        XRT: [...flats(3, 112 * factor), dipTo(112 * factor, 100 * factor), ...flats(5, 100.5 * factor)],
        VGT: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)]
      });
    const a = run(scaled(1), p1({ rate: 0.11, costBps: 5 }));
    const b = run(scaled(0.125), p1({ rate: 0.11, costBps: 5 }));

    assert.equal(a.preemptions.length, 1);
    assert.equal(a.preemptions[0]!.outcome, b.preemptions[0]!.outcome);
    assert.ok(Math.abs(a.preemptions[0]!.executionNet - b.preemptions[0]!.executionNet) < 1e-6);
    assert.ok(Math.abs(a.lots[0]!.net - b.lots[0]!.net) < 1e-6);
    assert.ok(Math.abs(a.lots[0]!.shares - 8 * b.lots[0]!.shares) > 0, 'the share units differ');
  });
});
