// More P1 scenarios and randomized equivalence (the independent engine review's coverage findings, reviews/
// engine-review.md §6): a seeded fuzz of the derived engine against the derived replay under every policy, with
// accounting, arming and end offsets; the P0 diagnostic's actionable flag against P1's first preemption; a sale due
// after the last event with the replacement still reserved at the end; supersession by the maximum hold with a later
// fill; a replacement preempted in the bar after it was bought; portfolio margin refusal with the incumbent open; a
// closing-print sale; an own exit in the decision minute (a plain grant); a friction-driven fill-time abort; the
// $250 buffer boundary; windowed figures against the engine's daily marks; a refused signal never reconsidered; P0
// equal to the frozen engine with a fifth candidate book; a mutation of every later array.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compareValues, outputsOf } from '../../portfolio-aware-d1/compare.ts';
import { type NUniverse, baseNRunConfig, runNAllocator } from '../../portfolio-aware-d1/nbook/engine.ts';
import { traceBook, traceSettings } from '../../portfolio-aware-d1/trace.ts';
import { type PolicyKey, fixedLiquidation } from '../allocation.ts';
import { type PRunResult, runPAllocator } from '../engine.ts';
import { replayPreemptive } from '../replay.ts';
import {
  type FixtureRun,
  type SessionSpec,
  allocationFor,
  bookOf,
  configOf,
  dipTo,
  flat,
  flats,
  weekdayUniverse
} from './fixtures.ts';

interface Window {
  startIndex: number;
  armStart: number;
  endIndex: number;
}

const fullWindow = (universe: NUniverse): Window => ({
  startIndex: 0,
  armStart: universe.eligibilityIndex,
  endIndex: universe.sessionCount - 1
});

const books = (spec: FixtureRun) =>
  spec.books ?? Object.fromEntries(spec.symbols.map((symbol) => [symbol, bookOf(symbol)]));

// The engine (fixed) and the replay on the same window; returns both and their differences.
const pair = (universe: NUniverse, spec: FixtureRun, window = fullWindow(universe), windowStarts?: number[]) => {
  const phenotypes = books(spec);
  const config = {
    ...configOf({ ...spec, books: phenotypes }),
    accountingStartIndex: window.startIndex,
    eligibilityIndex: window.armStart,
    endIndex: window.endIndex
  };
  const full = runPAllocator(universe, config);
  const traceWindow = { ...window, splitsSha256: 'test' };
  const fast = replayPreemptive(
    spec.symbols.map((symbol) => ({
      symbol,
      ds: universe.instruments[symbol]!.ds,
      trace: traceBook(
        universe.instruments[symbol]!.ds,
        phenotypes[symbol]!,
        traceSettings(spec.costBps ?? 0, { rate: spec.rate ?? 0.11 }),
        traceWindow
      )
    })),
    {
      symbols: spec.symbols,
      startIndex: window.startIndex,
      endIndex: window.endIndex,
      principal: 100000,
      rate: spec.rate ?? 0.11,
      costBps: spec.costBps ?? 0,
      stopSlippageBps: 0,
      detail: true,
      allocation: allocationFor(spec),
      ...(windowStarts ? { windowStarts } : {})
    }
  );
  const { preemptions, declines, allocationKey, priorityOrder, ...rest } = outputsOf(full) as PRunResult;

  void allocationKey;
  void priorityOrder;

  const differences = [
    ...compareValues(rest, fast.full),
    ...compareValues(
      preemptions.map((record) => ({ ...record, targetVirtualState: '' })),
      fast.preemptions
    ),
    ...compareValues(declines, fast.declines),
    ...(full.lots.reduce((total, lot) => total + lot.net, 0) === fast.net ? [] : ['net'])
  ];

  return { full, fast, differences };
};

const assertPair = (universe: NUniverse, spec: FixtureRun, label: string, window?: Window) => {
  const result = pair(universe, spec, window);

  assert.deepEqual(result.differences, [], label);

  for (let i = 1; i < result.full.lots.length; i++) {
    assert.ok(result.full.lots[i - 1]!.exitTime <= result.full.lots[i]!.entryTime, `${label}: one lot at a time`);
  }

  return result;
};

const p1 = (extra: Partial<FixtureRun> = {}): FixtureRun => ({
  symbols: ['VGT', 'XRT'],
  policy: 'P1',
  order: ['VGT', 'XRT'],
  rate: 0,
  costBps: 0,
  ...extra
});

// ----- randomized universes (a linear congruential stream: reproducible, independent of the study's seeds) -----

const lcg = (seed: number) => {
  let state = seed;

  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
};

const randomUniverse = (rnd: () => number) => {
  const symbols = ['GDX', 'KRE', 'VGT', 'XBI', 'XRT']
    .sort(() => rnd() - 0.5)
    .slice(0, 2 + Math.floor(rnd() * 4))
    .sort();
  const sessions = 25 + Math.floor(rnd() * 20);
  const specs: Record<string, SessionSpec[]> = {};

  for (const symbol of symbols) {
    const list: SessionSpec[] = [];
    let price = 100;

    while (list.length < sessions) {
      const n = 2 + Math.floor(rnd() * 8);
      const sparse = rnd() < 0.5;
      const slots: number[] = [];
      let slot = Math.floor(rnd() * 3);

      for (let i = 0; i < n && slot <= 389; i++) {
        slots.push(slot);
        slot += sparse ? 1 + Math.floor(rnd() * 40) : 1;
      }

      const closes: number[] = [];
      const opens: (number | undefined)[] = [];

      for (let i = 0; i < slots.length; i++) {
        const shock = rnd() < 0.15 ? (rnd() - 0.6) * 0.16 : (rnd() - 0.48) * 0.03;

        if (i === 0 && rnd() < 0.3) {
          price *= 1 + (rnd() - 0.5) * 0.12;
          opens.push(price);
        } else if (i > 0 && rnd() < 0.3) {
          opens.push(Math.round(price * (1 + (rnd() - 0.5) * 0.01) * 100) / 100);
        } else {
          opens.push(undefined);
        }

        price = Math.max(5, price * (1 + shock));
        closes.push(Math.round(price * 100) / 100);
      }

      list.push({ closes, slots, opens, closingPrint: rnd() < 0.85 });
    }

    specs[symbol] = list;
  }

  const pickOf = <T>(items: readonly T[]) => items[Math.floor(rnd() * items.length)]!;
  const phenotypes = Object.fromEntries(
    symbols.map((symbol) => [
      symbol,
      bookOf(symbol, {
        targetPercentChange: pickOf([30, 50, 80, 100]),
        trailingBuyPercentage: pickOf([5, 10, 20]),
        trailingStopPercentage: pickOf([10, 20, 30, 50]),
        maximumHoldDays: pickOf([1, 2, 3, 5, 30]),
        tickWindowSize: pickOf([2, 3, 4]),
        intradayLossBuffer: pickOf([0, 10, 30, 500]),
        pullback: pickOf([20, 30, 50]),
        continuationWindow: pickOf([1, 3, 5])
      })
    ])
  );

  return {
    universe: weekdayUniverse(specs),
    symbols,
    order: [...symbols].sort(() => rnd() - 0.5),
    costBps: pickOf([0, 2, 5, 10]),
    rate: pickOf([0, 0.11]),
    phenotypes
  };
};

describe('randomized equivalence', () => {
  test('engine = replay under every policy, with accounting, arming and end offsets', () => {
    const rnd = lcg(20261026);
    const policies: PolicyKey[] = ['P0', 'P0R', 'P1', 'P1-B250', 'P1-B500'];
    let executed = 0;

    for (let r = 0; r < 60; r++) {
      const { universe, symbols, order, costBps, rate, phenotypes } = randomUniverse(rnd);
      const startIndex = Math.floor(rnd() * 3);
      const window: Window = {
        startIndex,
        armStart: Math.max(universe.eligibilityIndex, startIndex) + Math.floor(rnd() * 3),
        endIndex: universe.sessionCount - 1 - Math.floor(rnd() * 4)
      };

      for (const policy of policies) {
        const spec: FixtureRun = {
          symbols,
          policy,
          order: policy === 'P0' ? undefined : order,
          costBps,
          rate,
          books: phenotypes
        };
        const { full } = assertPair(universe, spec, `run ${r} ${policy}`, window);

        executed += full.preemptions.filter((record) => record.outcome === 'executed').length;
      }
    }

    assert.ok(executed >= 20, `coverage: ${executed} executed preemptions`);
  });

  test('the P0 diagnostic is actionable exactly when P1 executes its first preemption', () => {
    const rnd = lcg(77);
    let compared = 0;

    for (let r = 0; r < 120; r++) {
      const { universe, symbols, order, costBps, rate, phenotypes } = randomUniverse(rnd);
      const spec: FixtureRun = { symbols, policy: 'P1', order, costBps, rate, books: phenotypes };
      const p1run = runPAllocator(universe, configOf(spec));
      const first = p1run.preemptions[0];
      const diagnosed = replayPreemptive(
        symbols.map((symbol) => ({
          symbol,
          ds: universe.instruments[symbol]!.ds,
          trace: traceBook(universe.instruments[symbol]!.ds, phenotypes[symbol]!, traceSettings(costBps, { rate }), {
            ...fullWindow(universe),
            splitsSha256: 'test'
          })
        })),
        {
          symbols,
          startIndex: 0,
          endIndex: universe.sessionCount - 1,
          principal: 100000,
          rate,
          costBps,
          stopSlippageBps: 0,
          detail: false,
          allocation: allocationFor({ ...spec, policy: 'P0R' }),
          diagnose: [{ rankingId: 'R', order }]
        }
      );
      const qualified = diagnosed.overlaps.find((record) => record.higher.R && record.estimateNet >= 0);

      assert.equal(Boolean(qualified), Boolean(first), `run ${r}: a qualified overlap ⇔ a P1 preemption`);

      if (qualified && first) {
        compared++;
        assert.equal(qualified.decisionTime, first.decisionTime, `run ${r}: the same decision`);
        assert.equal(
          qualified.actionable.R,
          first.outcome === 'executed',
          `run ${r}: actionable ⇔ executed (${first.reason})`
        );
      }
    }

    assert.ok(compared >= 20, `coverage: ${compared}`);
  });
});

describe('P1 scenarios', () => {
  test('a sale due after the last event executes; the replacement is still reserved at the end', () => {
    const universe = weekdayUniverse({
      XRT: [...flats(3, 112), dipTo(112, 100), flat(100.5), { closes: Array(8).fill(100.5) }],
      VGT: [...flats(5, 100), { closes: [100, 89, 88, 89.5], closingPrint: false }]
    });
    const { full, fast } = assertPair(universe, p1(), 'sale after the last event');

    assert.equal(full.preemptions[0]!.outcome, 'executed');
    assert.deepEqual(
      full.reservationsAtEnd.map((entry) => entry.symbol),
      ['VGT']
    );
    assert.equal(full.preemptions[0]!.replacementLotId, -1);
    assert.equal(fast.preemptions[0]!.replacementLotId, -1);
  });

  test('a maximum-hold exit supersedes the switch; the replacement fills minutes later', () => {
    const universe = weekdayUniverse({
      XRT: [...flats(3, 112), dipTo(112, 100), { closes: [100.2, 100.2, 100.2], opens: [99.9] }, ...flats(2, 100.2)],
      VGT: [
        ...flats(3, 100),
        { closes: [100, 89, 88] },
        { closes: [89.5, 89.5, 89.5], slots: [0, 5, 6] },
        ...flats(2, 89.5)
      ]
    });
    const { full } = assertPair(
      universe,
      p1({ books: { XRT: bookOf('XRT', { maximumHoldDays: 1 }), VGT: bookOf('VGT') } }),
      'maximum hold'
    );

    assert.equal(full.preemptions[0]!.outcome, 'superseded');
    assert.equal(full.lots[0]!.exitReason, 'maximum hold');
    assert.ok(full.lots[1]!.entryTime > full.lots[0]!.exitTime);
  });

  test('a replacement can be preempted from the bar after its purchase (a two-minute chain)', () => {
    const universe = weekdayUniverse({
      XRT: [...flats(3, 112), dipTo(112, 100), ...flats(5, 100.5)],
      VGT: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)],
      GDX: [...flats(5, 100), { closes: [100, 89, 88, 89.5, 89.5, 89.5], slots: [0, 2, 3, 4, 5, 6] }, ...flats(3, 89.5)]
    });
    const { full } = assertPair(
      universe,
      p1({ symbols: ['GDX', 'VGT', 'XRT'], order: ['GDX', 'VGT', 'XRT'] }),
      'chain'
    );

    assert.deepEqual(
      full.lots.map((lot) => `${lot.symbol}:${lot.exitReason}`),
      ['XRT:priority_preemption', 'VGT:priority_preemption', 'GDX:open']
    );
    assert.equal(full.lots[1]!.net, 0, 'the replacement sold at exactly $0 a minute later');
  });

  test('portfolio mode: margin that binds only with the incumbent open means no preemption', () => {
    const universe = weekdayUniverse({
      VOOG: flats(10, 100),
      VGT: [...flats(5, 100), dipTo(100, 89), ...flats(4, 89)],
      XRT: [...flats(3, 112), dipTo(112, 100), ...flats(6, 100.5)]
    });
    const spec = p1({ mode: 'portfolio', rate: 0.11, costBps: 5 });
    const portfolio = runPAllocator(universe, { ...configOf(spec), fraction: 0.9 });

    assert.equal(portfolio.preemptions.length, 0);
    assert.match(
      portfolio.signals.find((signal) => signal.symbol === 'VGT')!.reason,
      /no preemption: Reg T initial margin with the incumbent open/
    );
    assert.equal(runPAllocator(universe, configOf({ ...spec, mode: 'fixed' })).preemptions[0]!.outcome, 'executed');
  });

  test('a closing-print sale executes when the replacement fills at the next session’s open', () => {
    // VGT decides at 14:34; XRT has no later minute but a closing print; VGT has neither, so it fills the next morning.
    const universe = weekdayUniverse({
      XRT: [
        ...flats(3, 112),
        dipTo(112, 100),
        flat(100.5),
        { closes: [100.5, 100.5, 100.5], slots: [0, 1, 2] },
        flat(100.5)
      ],
      VGT: [...flats(5, 100), { closes: [100, 89, 88, 89.5], slots: [0, 1, 2, 4], closingPrint: false }, flat(89.5)]
    });
    const { full } = assertPair(universe, p1(), 'closing print');
    const record = full.preemptions[0]!;

    assert.equal(record.outcome, 'executed');
    assert.equal(record.executionBar, universe.instruments.XRT!.ds.sBarCount[record.executionIndex]);
    assert.equal(full.lots[0]!.exitExecution, 'closing print');
    assert.equal(full.lots[1]!.entryIndex, record.executionIndex + 1);
  });

  test('an own exit in the decision minute frees the pool: a plain grant, not a preemption', () => {
    // XRT's maximum hold sells at 14:31 of session 4; VGT decides at the end of 14:31 with the pool already free.
    const universe = weekdayUniverse({
      XRT: [...flats(3, 112), dipTo(112, 100), { closes: [99.9, 99.9, 99.9], opens: [99.9] }, ...flats(2, 99.9)],
      VGT: [...flats(4, 100), { closes: [89, 88, 89.5, 89.5], slots: [0, 0, 1, 2].map((_, i) => i) }, ...flats(2, 89.5)]
    });
    const { full } = assertPair(
      universe,
      p1({ books: { XRT: bookOf('XRT', { maximumHoldDays: 1 }), VGT: bookOf('VGT') } }),
      'plain grant'
    );

    assert.equal(full.preemptions.length, 0);
    assert.equal(full.lots[0]!.exitReason, 'maximum hold');
    assert.equal(full.signals.find((signal) => signal.symbol === 'VGT')!.outcome, 'granted');
  });

  test('a friction-driven abort at the same-session next trade', () => {
    // XRT at 100.08 at 5 bps: the estimate at the last close is ≥ $0, the next minute opens at 100.05 and fails.
    const universe = weekdayUniverse({
      XRT: [
        ...flats(3, 112),
        dipTo(112, 100),
        flat(100.2),
        { closes: [100.2, 100.2, 100.2, 100.2, 100.05], opens: [undefined, undefined, undefined, 100.05] },
        flat(100)
      ],
      VGT: [...flats(5, 100), { closes: [89, 88, 89.5, 89.5, 89.5], slots: [0, 1, 2, 5, 6] }, flat(89.5)]
    });
    const { full } = assertPair(universe, p1({ costBps: 5 }), 'friction abort');
    const record = full.preemptions[0]!;

    assert.equal(record.outcome, 'aborted');
    assert.ok(record.estimateNet >= 0 && record.executionNet < 0, `${record.estimateNet} then ${record.executionNet}`);
  });

  test('the $250 buffer: exactly $250 switches, $249.99 does not', () => {
    for (const [price, expected] of [
      [100.25, 'executed'],
      [100.24999, 'declined']
    ] as const) {
      const universe = weekdayUniverse({
        XRT: [...flats(3, 112), dipTo(112, 100), ...flats(5, price)],
        VGT: [...flats(5, 100), dipTo(100, 89), ...flats(3, 89)]
      });
      const { full } = assertPair(universe, p1({ policy: 'P1-B250' }), `buffer ${price}`);
      const net = fixedLiquidation({ shares: 1000, principal: 100000, entryTimestamp: 0 }, price, 0, 0, 0).net;

      assert.equal(
        expected === 'executed' ? full.preemptions[0]?.outcome : full.declines.length > 0 ? 'declined' : 'none',
        expected,
        `net ${net}`
      );
    }
  });

  test('windowed figures equal the engine’s daily marks after the boundary', () => {
    const rnd = lcg(5);

    for (let r = 0; r < 12; r++) {
      const { universe, symbols, order, costBps, rate, phenotypes } = randomUniverse(rnd);
      const boundary = Math.floor(universe.sessionCount / 2);
      const spec: FixtureRun = { symbols, policy: 'P1', order, costBps, rate, books: phenotypes };
      const { full, fast, differences } = pair(universe, spec, fullWindow(universe), [boundary]);

      assert.deepEqual(differences, []);

      const rows = full.daily.filter((row) => row.index >= boundary);
      let peak = rows[0]!.strategyMark;
      let worst = 0;

      for (const row of rows.slice(1)) {
        peak = Math.max(peak, row.strategyMark);
        worst = Math.max(worst, peak - row.strategyMark);
      }

      assert.equal(fast.windowed[0]!.startIndex, boundary);
      assert.ok(Math.abs(fast.windowed[0]!.dailyDrawdown.maximum - worst) < 1e-9, `run ${r}: windowed daily drawdown`);
      assert.ok(fast.windowed[0]!.minuteDrawdown.maximum >= worst - 1e-9, `run ${r}: minute ≥ daily`);
      assert.ok(
        Math.abs(
          fast.marks[universe.sessionCount - 1]! -
            fast.marks[boundary]! -
            (rows.at(-1)!.strategyMark - rows[0]!.strategyMark)
        ) < 1e-6
      );
    }

    assert.throws(
      () => pair(weekdayUniverse({ VGT: flats(6, 100) }), { symbols: ['VGT'] }, undefined, [0]),
      /cannot start at session 0/
    );
  });

  test('a refused signal is never reconsidered: the book is funded only on a later fresh signal', () => {
    // XRT is bought Thursday (session 3) at 100. VGT signals Friday (4) with XRT at 99: declined (net < $0). XRT's
    // 4-day hold sells it on Monday (5). VGT's declined trade stops out on session 7 and is never funded; its next
    // fresh signal (session 8) is.
    const universe = weekdayUniverse({
      XRT: [...flats(3, 112), dipTo(112, 100), flat(99), { closes: [93, 93, 93], opens: [93] }, ...flats(5, 93)],
      VGT: [...flats(4, 100), dipTo(100, 89), flat(95), flat(95), flat(89), dipTo(95, 85), ...flats(2, 85)]
    });
    const { full } = assertPair(
      universe,
      p1({ books: { XRT: bookOf('XRT', { maximumHoldDays: 4 }), VGT: bookOf('VGT') } }),
      'stale'
    );
    const vgtTrades = full.trades.filter((trade) => trade.symbol === 'VGT');

    assert.equal(full.declines.length, 1);
    assert.equal(full.lots[0]!.exitReason, 'maximum hold');
    assert.equal(vgtTrades[0]!.fundedLotId, -1, 'the declined trade is never funded');
    assert.ok(vgtTrades[0]!.exitIndex > full.lots[0]!.exitIndex, 'it was still open when the pool freed');
    assert.ok(
      full.lots.some((lot) => lot.symbol === 'VGT' && lot.trade.id === 2),
      'the later fresh signal is funded'
    );
  });

  test('P0 equals the frozen engine with a fifth, candidate book', () => {
    const universe = weekdayUniverse({
      VGT: [...flats(5, 100), dipTo(100, 90), ...flats(4, 95)],
      XBI: [...flats(3, 100), dipTo(100, 90), ...flats(6, 90)],
      XRT: [...flats(4, 100), dipTo(100, 90), ...flats(5, 90)],
      KRE: [...flats(3, 100), dipTo(100, 90, 1, 2), ...flats(6, 92)],
      GDX: [...flats(5, 100), dipTo(100, 90), ...flats(4, 99)]
    });

    for (const costBps of [0, 5]) {
      const config = baseNRunConfig({
        key: 'five',
        label: 'five',
        mode: 'fixed',
        symbols: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'],
        phenotypes: books({ symbols: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] }),
        costBps
      });
      const frozen = runNAllocator(universe, config);
      const { preemptions, declines, allocationKey, priorityOrder, ...rest } = runPAllocator(universe, config);

      void allocationKey;
      void priorityOrder;
      assert.ok(frozen.lots.length > 0);
      assert.equal(preemptions.length + declines.length, 0);
      assert.deepEqual(compareValues(frozen, rest, { ignore: new Set(['config', 'universe']) }), []);
    }
  });

  test('auction prints at the close and at a later session’s opening trade (confirmatory review cases)', () => {
    // XRT's 1-day hold sells it at session 4's closing print (its only bar opens below the entry); VGT triggers at its
    // last session-4 bar, so its order fills at that closing print (abort) or, without one, the next morning
    // (superseded, VGT bought at 9:30).
    for (const [vgtClose, outcome] of [
      [true, 'aborted'],
      [false, 'superseded']
    ] as const) {
      const universe = weekdayUniverse({
        XRT: [...flats(3, 112), dipTo(112, 100), { closes: [100.5], opens: [99.9], slots: [0] }, ...flats(3, 100.5)],
        VGT: [
          ...flats(4, 100),
          { closes: [100, 89, 88, 89], slots: [0, 100, 101, 102], closingPrint: vgtClose },
          ...flats(3, 89)
        ]
      });
      const { full } = assertPair(
        universe,
        p1({ books: { XRT: bookOf('XRT', { maximumHoldDays: 1 }), VGT: bookOf('VGT') } }),
        `own exit at the close, VGT closing print ${vgtClose}`
      );

      assert.equal(full.preemptions[0]!.outcome, outcome);
      assert.equal(full.lots[0]!.exitExecution, 'closing print');
      assert.equal(full.lots.length, outcome === 'aborted' ? 1 : 2);
    }

    // An intrabar stop at the opening trade of a session after the decision's (VGT decides at Friday's close): VGT's
    // first Monday bar at the same print → abort before the sale, the own stop closes XRT; VGT at 9:35 → the sale at
    // the 106 open executes; both first bars at 9:32 (both opening trades) → abort.
    const build = (xrtSlots: number[], vgtSlots: number[]) =>
      weekdayUniverse({
        XRT: [
          ...flats(3, 112),
          dipTo(112, 100),
          flat(110),
          flat(110),
          { closes: [104, 104, 104], opens: [106], slots: xrtSlots },
          flat(104)
        ],
        VGT: [
          ...flats(5, 100),
          { closes: [100, 89, 88, 89], slots: [0, 386, 387, 389] },
          { closes: [89, 89, 89], slots: vgtSlots },
          flat(89)
        ]
      });
    const same = assertPair(build([0, 1, 2], [0, 1, 2]), p1(), 'intrabar stop, same opening print').full;

    assert.equal(same.preemptions[0]!.outcome, 'aborted');
    assert.equal(same.lots[0]!.exitReason, 'trailing stop');
    assert.ok(Math.abs(same.lots[0]!.exitRawPrice - 104.5) < 1e-9);

    const later = assertPair(build([0, 1, 2], [5, 6, 7]), p1(), 'intrabar stop, later fill').full;

    assert.equal(later.preemptions[0]!.outcome, 'executed');
    assert.equal(later.lots[0]!.exitRawPrice, 106);

    const both932 = assertPair(build([2, 3, 4], [2, 3, 4]), p1(), 'both opening trades at 9:32').full;

    assert.equal(both932.preemptions[0]!.outcome, 'aborted');
    assert.match(both932.preemptions[0]!.reason, /same auction print/);
  });

  test('a mutation of every array after the switch leaves the switch unchanged', () => {
    const build = () =>
      weekdayUniverse({
        XRT: [...flats(3, 112), dipTo(112, 100), ...flats(8, 100.5)],
        VGT: [...flats(5, 100), dipTo(100, 89), ...flats(6, 89)]
      });
    const base = build();
    const mutated = build();
    const from = 7;

    for (const symbol of ['VGT', 'XRT']) {
      const ds = mutated.instruments[symbol]!.ds;

      for (let s = from; s < ds.sessionCount; s++) {
        for (let k = ds.sBarStart[s]!; k < ds.sBarStart[s]! + ds.sBarCount[s]!; k++) {
          ds.bOpen[k] = ds.bOpen[k]! * 1.3;
          ds.bHigh[k] = ds.bHigh[k]! * 1.4;
          ds.bLow[k] = ds.bLow[k]! * 0.6;
          ds.bClose[k] = ds.bClose[k]! * 0.7;
        }

        ds.sOpen[s] = ds.sOpen[s]! * 1.3;
        ds.sHigh[s] = ds.sHigh[s]! * 1.4;
        ds.sLow[s] = ds.sLow[s]! * 0.6;
        ds.sClose[s] = ds.sClose[s]! * 0.7;
        ds.sClosingPrint[s] = ds.sClosingPrint[s]! * 0.7;
        ds.sMinClose[s] = ds.sMinClose[s]! * 0.6;
      }
    }

    const early = (result: PRunResult) => ({
      preemptions: result.preemptions.filter((record) => record.decisionIndex < from),
      signals: result.signals
        .filter((signal) => signal.index < from)
        .map((signal) => [signal.symbol, signal.outcome, signal.reason]),
      lots: result.lots
        .filter((lot) => lot.entryIndex < from)
        .map((lot) => [lot.symbol, lot.entryTime, lot.entryRawPrice])
    });
    const a = runPAllocator(base, configOf(p1()));
    const b = runPAllocator(mutated, configOf(p1()));

    assert.equal(a.preemptions.length, 1);
    assert.deepEqual(compareValues(early(a), early(b)), []);
  });
});
