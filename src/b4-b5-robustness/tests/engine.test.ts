// The audit runner on synthetic data (the existing fixture builders): one dip-and-rebound trade that exits at an
// active net-profit trailing stop. Fee, interest and stop-overshoot signs and scaling; stop overshoot touching stop
// exits only; a book that never arms changing nothing (ablation); the ledger identities and the yearly attribution;
// MAE/MFE from the legally observable bars only (the exit bar's range beyond the fill is excluded).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { testGrid } from '../../multi-etf-allocator/tests/fixtures.ts';
import { type SessionSpec, flat, flats, weekdayUniverse } from '../../d1-ranked-preemption/tests/fixtures.ts';
import { excursionOf } from '../analysis.ts';
import { type LotRecord, executeSpec, lotRecordsOf, metricsOf, runSpec } from '../run.ts';
import type { RunSpec } from '../specs.ts';

// Flats at 100 (the 3-session reference high), a dip that arms on 89, sets an 88 trailing low and triggers on the 90
// close (fill at the next bar's open, 90), a 89.5 low after the fill, then 95, 100 and 104 (the stop trails to 98.8),
// and a session whose third bar's low (98) crosses the stop: the exit fills at the stop level, 98.8.
const sessions = (): SessionSpec[] => [
  ...flats(4, 100),
  { closes: [100, 89, 88, 90, 89.5, 90] },
  flat(95),
  flat(100),
  flat(104),
  { closes: [104, 99, 98, 97, 97] },
  ...flats(3, 97)
];

const universe = weekdayUniverse({ AAA: sessions(), BBB: flats(sessions().length, 50) });

const spec = (overrides: Partial<RunSpec> = {}): RunSpec => ({
  key: 'test',
  family: 'cost',
  pool: 'B4',
  mode: 'fixed',
  books: [{ symbol: 'AAA', phenotype: 'test', grid: { ...testGrid } }],
  rate: 0.11,
  costBps: 0,
  stopSlippageBps: 0,
  stopFill: 'stop',
  dividends: 'frozen',
  diagnostic: true,
  detail: true,
  meta: {},
  ...overrides
});

describe('the audit runner on a synthetic stop exit', () => {
  const baseRun = runSpec(universe, spec());
  const [lot] = lotRecordsOf(baseRun);

  test('one lot, filled at 90, exited at the 98.8 stop', () => {
    assert.equal(baseRun.lots.length, 1);
    assert.equal(lot!.entryRawPrice, 90);
    assert.equal(lot!.exitReason, 'trailing stop');
    assert.ok(Math.abs(lot!.exitRawPrice - 104 * 0.95) < 1e-9);
  });

  test('per-side friction lowers the net by the friction dollars on the same trade', () => {
    const costly = lotRecordsOf(runSpec(universe, spec({ costBps: 10 })))[0]!;

    assert.equal(costly.exitReason, lot!.exitReason);
    assert.ok(costly.net < lot!.net);
    assert.ok(costly.friction > 0 && lot!.friction === 0);
    assert.ok(Math.abs(costly.gross - costly.friction - costly.interest - costly.net) < 1e-9);
  });

  test('interest scales linearly with the rate', () => {
    const doubled = lotRecordsOf(runSpec(universe, spec({ rate: 0.22 })))[0]!;

    assert.equal(doubled.exitTime, lot!.exitTime);
    assert.ok(Math.abs(doubled.interest - 2 * lot!.interest) < 1e-9);
    assert.ok(Math.abs(lot!.net - doubled.net - lot!.interest) < 1e-9);
  });

  test('stop overshoot lowers a stop exit by exactly the overshoot', () => {
    const slipped = lotRecordsOf(runSpec(universe, spec({ stopSlippageBps: 50 })))[0]!;

    assert.ok(Math.abs(slipped.exitPrice - lot!.exitRawPrice * (1 - 0.005)) < 1e-9);
    assert.ok(Math.abs(lot!.net - slipped.net - lot!.shares * lot!.exitRawPrice * 0.005) < 1e-6);
  });

  test('stop overshoot does not touch a non-stop exit', () => {
    // A 1-day hold with a 0% buffer: the loss exit after the hold fires before any stop is active.
    const grid = { ...testGrid, maximumHoldDays: 1, intradayLossBuffer: 0 };
    const losing: SessionSpec[] = [...flats(4, 100), { closes: [100, 89, 88, 90, 90, 90] }, flat(89), ...flats(3, 89)];
    const u = weekdayUniverse({ AAA: losing });
    const books = [{ symbol: 'AAA', phenotype: 'test', grid }];
    const plain = lotRecordsOf(runSpec(u, spec({ books })))[0]!;
    const slipped = lotRecordsOf(runSpec(u, spec({ books, stopSlippageBps: 100 })))[0]!;

    assert.notEqual(plain.exitReason, 'trailing stop');
    assert.equal(slipped.net, plain.net);
  });

  test('a book that never arms changes nothing (leave-one-book-out identity)', () => {
    const alone = metricsOf(runSpec(universe, spec()), spec());
    const withInert = metricsOf(
      runSpec(
        universe,
        spec({ books: [...spec().books, { symbol: 'BBB', phenotype: 'test', grid: { ...testGrid } }] })
      ),
      spec()
    );

    assert.equal(withInert.net, alone.net);
    assert.equal(withInert.lotSetHash, alone.lotSetHash);
    assert.equal(withInert.minuteDD, alone.minuteDD);
  });

  test('ledger identities and the yearly attribution', () => {
    const output = executeSpec(universe, spec({ costBps: 5 }));
    const m = output.metrics;

    assert.ok(Math.abs(m.gross - m.friction - m.interest - m.net) < 1e-9);
    assert.ok(Math.abs(m.net - m.finalStrategyMark) < 1e-9);
    assert.ok(
      Math.abs(Object.values(m.yearly).reduce((total, year) => total + year.change, 0) - m.finalStrategyMark) < 1e-9
    );
    assert.ok(m.minuteDD >= m.dailyDD);
    assert.equal(output.daily!.length, universe.sessionCount - 1);
  });

  test('MAE/MFE use the bars from the fill to the bar before the exit, then the exit price', () => {
    const x = excursionOf(universe, lot!);

    assert.ok(Math.abs(x.maePercent - (89.5 / 90 - 1)) < 1e-12);
    assert.ok(Math.abs(x.mfePercent - (104 / 90 - 1)) < 1e-12);
    // The exit bar's low (98) is never counted; with the entry dip removed, MAE would be the entry itself.
    const synthetic: LotRecord = { ...lot!, entryIndex: lot!.exitIndex, entryBar: 0, entryRawPrice: 104 };
    const late = excursionOf(universe, synthetic);

    assert.ok(Math.abs(late.maePercent - (lot!.exitRawPrice / 104 - 1)) < 1e-12); // 98.8, not 98
    assert.equal(late.bars, lot!.exitBar);
  });
});
