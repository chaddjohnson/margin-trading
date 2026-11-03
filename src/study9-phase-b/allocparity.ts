// Allocator parity on the PRODUCTION path (review m1): the authoritative N-book engine runNAllocator against this
// study's own evaluator replay (P9Evaluator.replay → Study 8's trace() with its candidateBook id and windowOf →
// replayFixedPool), compared with the repository's compareValues on every output (lots, signals, virtual trades, daily
// rows, both drawdowns, net). Used by parity gate P1 (training doors) and by the test-door gate TP1 (every test fold).
import { compareValues, outputsOf } from '../portfolio-aware-d1/compare.ts';
import { type NUniverse, baseNRunConfig, bookOrderOf, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import type { P9Door } from './door.ts';
import { type Books, type P9Evaluator, type RunSettings, gridKey } from './engine.ts';

export const engineParity = (door: P9Door, ev: P9Evaluator, books: Books, settings: RunSettings) => {
  const symbols = bookOrderOf(Object.keys(books));
  const phenotypes = Object.fromEntries(
    symbols.map((s) => [s, candidateBook(s, `s7-${gridKey(books[s]!)}`, books[s]!)])
  );
  const window = ev.windowOf(settings);
  const config = baseNRunConfig({
    key: 'parity',
    label: 'parity',
    mode: 'fixed',
    symbols,
    phenotypes,
    costBps: settings.costBps,
    rate: settings.rate,
    stopFill: settings.stopFill,
    stopSlippageBps: settings.stopSlippageBps,
    eligibilityIndex: window.armStart,
    accountingStartIndex: window.startIndex
  });
  const universe: NUniverse = {
    ...door.loaded.universe,
    instruments: Object.fromEntries(symbols.map((s) => [s, door.loaded.universe.instruments[s]!]))
  };
  const full = runNAllocator(universe, config);
  const replay = ev.replay(books, settings, true);
  const differences = compareValues(outputsOf(full), replay.full, { maxDifferences: 10 });
  const fullNet = full.lots.reduce((t, l) => t + l.net, 0);

  if (fullNet !== replay.net) differences.push(`net ${fullNet} vs ${replay.net}`);

  return {
    differences,
    net: replay.net,
    sameMinute: replay.sameMinuteDecisions,
    refusals: replay.refusals.length,
    lots: replay.lots.length,
    trades: full.trades.length,
    signals: full.signals.length,
    daily: full.daily.length
  };
};
