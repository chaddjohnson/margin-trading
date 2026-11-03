// The study's instruments on synthetic data (PROTOCOL.md §10.1): same-minute ties, refusals that never fill, the ∞
// conventions of open and pending baseline trades, the observer and the gate replay against the frozen engine, the
// minute-drawdown re-derivation, the window-share identity with a lot open at the boundary, friction changing stop
// activation (a full rerun, not a subtraction), gap fills at the opening trade and fills across missing minutes.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { runNAllocator, baseNRunConfig } from '../../portfolio-aware-d1/nbook/engine.ts';
import { classify, firstOrderOf, replayGate } from '../gate.ts';
import { MinuteGrid } from '../grid.ts';
import { fundedGateTrades, gateTradeOf, tradeRecordsOf } from '../ledger.ts';
import { fixedMinuteDrawdowns, lotSharesOf, windowIncrementOf } from '../marks.ts';
import { observeBook, tradeDifferences } from '../observer.ts';
import { attributionOf, gateCheck } from '../replay.ts';
import { anyUniverse, dipSession, flats, testBook } from './fixtures.ts';

const fixed = (symbols: string[], books: Record<string, ReturnType<typeof testBook>>, costBps = 0) =>
  baseNRunConfig({
    key: 'test',
    label: 'test',
    mode: 'fixed',
    symbols,
    phenotypes: books,
    costBps,
    initial: { voog: 60000, vgt: 40000 }
  });

const run = (
  universe: ReturnType<typeof anyUniverse>,
  symbols: string[],
  grids: Record<string, Partial<Parameters<typeof testBook>[1]>> = {},
  costBps = 0
) =>
  runNAllocator(
    universe,
    fixed(
      symbols,
      Object.fromEntries(symbols.map((symbol) => [symbol, testBook(symbol, grids[symbol] ?? {})])),
      costBps
    )
  );

describe('the shared slot and the gate replay', () => {
  test('same-minute decisions are answered alphabetically, never double funded, and the replay agrees', () => {
    const universe = anyUniverse({
      VGT: flats(9),
      XBI: [...flats(3), dipSession(), ...flats(5, 90)],
      GDX: [...flats(3), dipSession(), ...flats(5, 90)]
    });
    const result = run(universe, ['VGT', 'XBI', 'GDX']);

    assert.deepEqual(
      result.lots.map((lot) => lot.symbol),
      ['GDX']
    );
    assert.equal(result.signals.filter((signal) => signal.sameMinuteCandidates === 2).length, 2);
    assert.equal(result.signals.find((signal) => signal.symbol === 'XBI')!.outcome, 'refused');
    assert.match(result.signals.find((signal) => signal.symbol === 'XBI')!.reason, /pending order/);
    assert.equal(gateCheck(universe, result, 0).funded, 1);

    // classify follows the tie order: XBI's decision is busy against a GDX baseline; GDX's is not busy against XBI.
    const records = tradeRecordsOf(universe, result, 0);
    const gdx = records.filter((record) => record.symbol === 'GDX').map(gateTradeOf);
    const xbi = records.filter((record) => record.symbol === 'XBI').map(gateTradeOf);

    assert.equal(classify(xbi, gdx)[0]!.class, 'busy');
    assert.notEqual(classify(gdx, xbi)[0]!.class, 'busy');
  });

  test('a refused decision never fills, stays logged, and its book still trades virtually', () => {
    const universe = anyUniverse({
      XBI: [...flats(3), dipSession(), ...flats(8, 90)],
      XRT: [...flats(5), dipSession(), ...flats(6, 95)]
    });
    const result = run(universe, ['XBI', 'XRT']);
    const xrt = result.trades.find((trade) => trade.symbol === 'XRT')!;

    assert.deepEqual(
      result.lots.map((lot) => lot.symbol),
      ['XBI']
    );
    assert.equal(result.signals.find((signal) => signal.symbol === 'XRT')!.outcome, 'refused');
    assert.equal(xrt.fundedLotId, -1);
    assert.ok(xrt.entryIndex >= 0, 'the refused book still opens its virtual position (shadow semantics)');
    assert.equal(gateCheck(universe, result, 0).funded, 1);
  });

  test('a baseline lot open at the end, or a reservation pending at the end, holds the slot (+∞ conventions)', () => {
    // XBI fills on session 3 and is still open at the end; GDX decides later and is busy against it.
    const open = anyUniverse({
      XBI: [...flats(3), dipSession(), ...flats(6, 90)],
      GDX: [...flats(6), dipSession(), ...flats(3, 90)]
    });
    const baseline = tradeRecordsOf(open, run(open, ['XBI']), 0);
    const candidate = tradeRecordsOf(open, run(open, ['GDX']), 0).map(gateTradeOf);

    assert.equal(baseline[0]!.open, true);
    assert.equal(gateTradeOf(baseline[0]!).exitTime, Infinity);
    assert.equal(classify(candidate, fundedGateTrades(baseline))[0]!.class, 'busy');

    // A decision on the last bar of the last session without a closing print never fills: pending, reserved.
    const pending = anyUniverse({ XBI: [...flats(3), { closes: [100, 89, 88, 90], closingPrint: false }] });
    const pendingRecords = tradeRecordsOf(pending, run(pending, ['XBI']), 0);
    const trade = gateTradeOf(pendingRecords[0]!);

    assert.ok(Number.isNaN(trade.fillTime));
    assert.equal(trade.exitTime, Infinity);
    assert.equal(
      classify([{ ...trade, key: 'X@1', symbol: 'ZZZ', decisionTime: trade.decisionTime + 60 }], [trade])[0]!
        .holderState,
      'reserved'
    );
  });

  test('replayGate equals the engine on a multi-book fixture, and the attribution identity holds', () => {
    const universe = anyUniverse({
      XBI: [...flats(3), dipSession(1, 2, 90), ...flats(2, 100), ...flats(8, 94)],
      XRT: [...flats(4), dipSession(), ...flats(9, 90)],
      KRE: [...flats(9), dipSession(), ...flats(4, 99)],
      GDX: [...flats(3), dipSession(0, 2, 90), ...flats(10, 91)]
    });
    const base = run(universe, ['XBI', 'XRT', 'KRE']);
    const scenario = run(universe, ['XBI', 'XRT', 'KRE', 'GDX']);

    gateCheck(universe, base, 0);
    gateCheck(universe, scenario, 0);

    const attribution = attributionOf(base, scenario, 'GDX', 0);
    const sum = Object.values(attribution.parts).reduce((total, value) => total + value, 0);

    assert.ok(Math.abs(sum - attribution.delta) < 1e-6);
    assert.ok(
      Math.abs(attribution.delta - (lotSharesOf(scenario, 0).increment - lotSharesOf(base, 0).increment)) < 1e-6
    );
    assert.equal(typeof firstOrderOf(classify([], [])).delta, 'number');
  });
});

describe('the observer, marks and drawdowns', () => {
  test('the observer equals the engine field for field and records setups', () => {
    const universe = anyUniverse({
      XBI: [...flats(3), dipSession(1, 2, 90), ...flats(2, 100), ...flats(4, 94), dipSession(), ...flats(3, 92)]
    });
    const book = testBook('XBI');
    const engine = runNAllocator(universe, fixed(['XBI'], { XBI: book }));
    const observed = observeBook(universe, book, { costBps: 0 });

    assert.deepEqual(tradeDifferences(observed.trades, engine), []);
    assert.ok(observed.setups.length >= observed.trades.length);
    assert.ok(
      observed.setups.every(
        (setup) => setup.activationTime < (Number.isNaN(setup.signalTime) ? Infinity : setup.signalTime)
      )
    );
  });

  test('the minute-drawdown re-derivation equals the engine, and window shares sum to V with a lot open at the boundary', () => {
    const universe = anyUniverse({
      XBI: [...flats(3), dipSession(1, 2, 90), ...flats(3, 95), ...flats(7, 86)],
      GDX: [...flats(10), dipSession(), ...flats(3, 93)]
    });
    const result = run(universe, ['XBI', 'GDX'], {}, 5);
    const minute = fixedMinuteDrawdowns(result, universe.dates[6]);

    assert.ok(Math.abs(minute.whole.maximum - result.minuteDrawdown.maximum) < 1e-6);

    const boundary = universe.dates[6]!;
    const shares = lotSharesOf(result, 5, boundary);
    const window = windowIncrementOf(result, 5, boundary);

    assert.ok(Math.abs(shares.increment - window.increment) < 1e-6);
    assert.ok(
      shares.shares.some((share) => share.atBoundary !== 0 && share.atBoundary !== share.atEnd),
      'a lot open at the boundary'
    );
  });

  test('friction changes stop activation: a full rerun differs from subtracting costs', () => {
    // Fill at 90; the next session rises to 94.85 (stop 90.1075). At 0 bps the stop is in profit (active) and the
    // gap to 89 sells at the opening trade; at 10 bps the same stop would lose money, so it is inactive and the lot
    // is held.
    const universe = anyUniverse({ VGT: [...flats(3), dipSession(1, 2, 90), { closes: [94.85] }, ...flats(4, 89, 3)] });
    const zero = run(universe, ['VGT'], {}, 0);
    const ten = run(universe, ['VGT'], {}, 10);

    assert.equal(zero.trades[0]!.exitReason, 'trailing stop gap');
    assert.equal(zero.trades[0]!.exitExecution, 'opening trade');
    assert.equal(ten.trades[0]!.exitIndex, -1, 'held at 10 bps: the stop is not in profit');

    for (const [result, costBps] of [
      [zero, 0],
      [ten, 10]
    ] as const) {
      assert.deepEqual(tradeDifferences(observeBook(universe, testBook('VGT'), { costBps }).trades, result), []);
    }
  });

  test('a fill waits for the next existing minute (no imputed fill), and the grid measures regular minutes', () => {
    const universe = anyUniverse({
      VGT: [...flats(3), { closes: [100, 89, 88, 90, 90], slots: [0, 1, 2, 3, 9] }, ...flats(2, 90)]
    });
    const result = run(universe, ['VGT']);
    const trade = result.trades[0]!;
    const ds = universe.instruments.VGT!.ds;

    assert.equal(trade.decisionTime, ds.bTime[ds.sBarStart[3]! + 3]! + 60);
    assert.equal(trade.entryTime, ds.bTime[ds.sBarStart[3]! + 4]!, 'the next bar (9 minutes after the open)');

    const grid = new MinuteGrid(ds);

    assert.equal(grid.coordinate(grid.closes[0]!), 390);
    assert.equal(grid.coordinate(grid.opens[1]! + 90), 390 + 1.5);
    assert.equal(grid.coordinate(Infinity), grid.total);
  });
});

describe('replayGate', () => {
  test('grants iff the decision is later than the last granted exit', () => {
    const t = (symbol: string, decisionTime: number, exitTime: number) => ({
      key: `${symbol}@${decisionTime}`,
      symbol,
      decisionTime,
      fillTime: decisionTime,
      exitTime,
      net: 1
    });
    const outcomes = replayGate([t('B', 100, 200), t('A', 100, 300), t('C', 300, 400), t('D', 360, 500)]);

    assert.deepEqual(
      outcomes.map((outcome) => `${outcome.trade.symbol}:${outcome.granted}`),
      ['A:true', 'B:false', 'C:false', 'D:true'],
      'a decision stamped at the exit time is refused; one stamped later is granted'
    );
  });
});
