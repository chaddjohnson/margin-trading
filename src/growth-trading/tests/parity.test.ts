// Real data (skipped without the git-ignored data/ files). 1. Exit parity: the Study 8 pools engine (runNAllocator,
// fixed mode, 5 bps, 11%) runs the frozen B1 book (VGT D1 primary) and the s8-vg-balanced pool (S8-VG-F24-3: VGT and
// GDX books); feeding each book's own D1 entry decisions into this strategy's driver must reproduce every one of its
// standalone shadow trades exactly (fills, exits, reasons, stop levels, interest, net) and B1's minute and daily
// drawdowns. The entries differ in the real strategy (Rise from Recent Low, not D1's dip): this proves the execution and
// exit side only. 2. A smoke run of the strategy itself on VGT 2016–2023 with the defaults.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import { scanRiseFromRecentLow } from '../../entry-signals/riseFromRecentLow.ts';
import { resolveDataset } from '../../lib/dataset.ts';
import { loadDatasetSessions } from '../../lib/evaluation.ts';
import type { VirtualTrade } from '../../multi-etf-allocator/shadow.ts';
import { loadPool } from '../../pools/load.ts';
import { loadPoolUniverse, runPoolOn } from '../../pools/run.ts';
import { loadResearchPool } from '../../study8-expanded-regime-d1/poolrun.ts';
import {
  type EntryDecision,
  defaultTradingParams,
  runRiseTrading,
  simulateTrading,
  summarizeSimulation,
  warmupSessionsFor
} from '../riseTrading.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const hasData = ['VGT', 'GDX'].every((symbol) => existsSync(`${root}data/${symbol}/data.csv`));

const fields: (keyof VirtualTrade)[] = [
  'decisionIndex',
  'decisionTime',
  'decisionPrice',
  'carriedOvernight',
  'entryIndex',
  'entryBar',
  'entryTime',
  'entryRawPrice',
  'entryPrice',
  'entryExecution',
  'shares',
  'investment',
  'exitIndex',
  'exitBar',
  'exitTime',
  'exitRawPrice',
  'exitPrice',
  'exitReason',
  'exitExecution',
  'exitStopPrice',
  'stopActiveAtExit',
  'maximumHoldDue',
  'bufferSignalTime',
  'bufferSignalPrice',
  'interest',
  'gross',
  'net',
  'stopFirstActiveIndex',
  'stopActiveSessions'
];

const replayPool = async (load: () => ReturnType<typeof loadPool>) => {
  const pool = await load();
  const options = {
    mode: 'fixed' as const,
    dataset: 'all' as const,
    costBps: 5,
    dividends: 'frozen' as const,
    end: '2026-10-29'
  };
  const loaded = await loadPoolUniverse(pool, options);
  const result = runPoolOn(pool, loaded, options);
  const books = pool.config.books.map(({ symbol }) => {
    const reference = result.trades.filter((trade) => trade.symbol === symbol);
    const decisions: EntryDecision[] = reference.map((trade) => ({
      id: `${trade.decisionTime}`,
      sessionIndex: trade.decisionIndex,
      time: trade.decisionTime,
      price: trade.decisionPrice,
      trigger: trade.trigger,
      reference: trade.trailingLow
    }));
    const sim = simulateTrading(loaded.universe.instruments[symbol]!.ds, decisions, {
      symbol,
      firstSession: loaded.warmup + 1, // the N-book engine's first processed session
      endSession: result.endIndex,
      exit: pool.phenotypes[symbol]!.params,
      book: { notional: 100_000, rate: 0.11, stopFill: 'stop', costBps: 5, stopSlippageBps: 0 },
      originSession: loaded.warmup
    });
    const mismatches: string[] = [];

    sim.trades.forEach((trade, i) => {
      for (const field of fields) {
        const a = trade[field];
        const b = reference[i]![field];

        if (!(Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b))))
          mismatches.push(`${symbol} #${i + 1} ${String(field)}: ${String(a)} vs ${String(b)}`);
      }
    });

    return { symbol, reference, sim, mismatches };
  });

  return { result, books };
};

describe('exit parity with the Study 8 pools engine (real data)', { skip: !hasData && 'no data/' }, () => {
  test('B1 (VGT D1 primary alone): every trade and both drawdowns identical', async () => {
    const { result, books } = await replayPool(() =>
      loadPool('S7R-B1', `${root}config/research-pools/study7-local-runners`)
    );
    const [vgt] = books;
    assert.ok(vgt!.reference.length >= 20);
    assert.equal(vgt!.sim.trades.length, vgt!.reference.length);
    assert.deepEqual(vgt!.mismatches, []);
    assert.ok(vgt!.sim.outcomes.every((o) => o.status === 'filled'));
    assert.deepEqual(vgt!.sim.minuteDrawdown, result.minuteDrawdown);
    assert.deepEqual(vgt!.sim.dailyDrawdown, result.dailyDrawdown);
  });

  test('s8-vg-balanced books (S8-VG-F24-3, VGT and GDX parameters): every standalone shadow trade identical', async () => {
    const { books } = await replayPool(() => loadResearchPool('S8-VG-F24-3'));
    for (const book of books) {
      assert.ok(book.reference.length > 0, book.symbol);
      assert.equal(book.sim.trades.length, book.reference.length, book.symbol);
      assert.deepEqual(book.mismatches, [], book.symbol);
    }
    assert.deepEqual(
      books.map((b) => [
        b.symbol,
        b.sim.exit.trailingStopPercentage,
        b.sim.exit.maximumHoldDays,
        b.sim.exit.intradayLossBuffer
      ]),
      [
        ['VGT', 0.074, 15, 0.044],
        ['GDX', 0.057, 12, 0.029]
      ]
    );
  });
});

describe(
  'real-data smoke: VGT 2016-01-04 → 2023-12-29, X 5%, N 20, 1d, default exits',
  { skip: !hasData && 'no data/' },
  () => {
    test('raw decisions are the unchanged scanner’s signals; trades never overlap; the accounting closes', async () => {
      const p = defaultTradingParams;
      const loaded = await loadDatasetSessions({
        dataset: resolveDataset('VGT', 'all', `${root}data`),
        startDate: '2016-01-04',
        endDate: '2023-12-29',
        warmupSessions: warmupSessionsFor(p.resolution, p.recentLowLookbackBars),
        access: 'manual evaluation'
      });
      const r = runRiseTrading('VGT', loaded.history, loaded.warmup, p, loaded.report!.dataSha256!);
      const bars = barsFromSessions(loaded.history, '1d');
      const first = bars.findIndex((bar) => bar.sessionIndex >= loaded.warmup);
      const reference = scanRiseFromRecentLow(bars, p, first).signals;
      assert.deepEqual(
        r.decisions.map((d) => [d.time, d.price]),
        reference.map((s) => [s.time, s.close])
      );
      const { metrics } = summarizeSimulation(r.simulation, r.ds);
      assert.equal(metrics.signals.raw, reference.length);
      assert.equal(metrics.signals.filled + metrics.signals.rejected + metrics.signals.unfilledAtEnd, reference.length);
      const trades = r.simulation.trades;
      assert.ok(trades.length > 0);
      trades.forEach((t, i) => {
        assert.ok(t.entryTime > t.decisionTime - 1e-9 && t.entryTime >= t.decisionTime);
        if (i > 0) assert.ok(t.entryTime > trades[i - 1]!.exitTime && trades[i - 1]!.exitIndex >= 0);
        if (t.exitIndex >= 0) assert.ok(t.exitIndex > t.entryIndex); // never on the entry session
      });
      assert.equal(metrics.checks.fixedLedgerMaxDifferenceUsd, 0);
      assert.ok(metrics.checks.identityMaxResidualUsd < 1e-6);
      assert.ok(metrics.checks.markedEqualsLedger < 1e-6);
      assert.ok(metrics.drawdown.minute.maximumUsd >= metrics.drawdown.daily.maximumUsd - 1e-9);
    });
  }
);
