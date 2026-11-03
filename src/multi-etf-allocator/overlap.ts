// Signal overlap and denials (SIGNAL_OVERLAP_AND_DENIALS.md): from the virtual (standalone) trades of the books,
// which trades collide in time and which have genuinely distinct timing; how many symbols want capital at once;
// how many independent episodes the trades fall into; who refused whom under the shared pool, with the refused trades'
// hypothetical outcomes; and the daily return correlations that make the collisions unsurprising.
import fs from 'fs-extra';
import { type Sym, formatDate, stageDir, writeJson } from './context.ts';
import type { RunResult } from './engine.ts';
import { toCsv } from './metrics.ts';
import type { VirtualTrade } from './shadow.ts';

interface Interval {
  trade: VirtualTrade;
  start: number; // entry fill time
  end: number; // exit fill time, or the last close
}

const intervalsOf = (result: RunResult): Interval[] => {
  const lastClose = Object.values(result.universe.instruments)[0]!.ds.sCloseTime[result.endIndex]!;

  return result.trades
    .filter((trade) => trade.entryIndex >= 0)
    .map((trade) => ({ trade, start: trade.entryTime, end: trade.exitIndex >= 0 ? trade.exitTime : lastClose }));
};

// Named market episodes for the descriptive labels only (calendar windows, not fitted).
const marketEpisodes = [
  { label: '2018 Q4 sell-off', from: '2018-10-01', to: '2019-04-30' },
  { label: '2020 COVID crash and rebound', from: '2020-02-20', to: '2020-09-30' },
  { label: '2022 bear market', from: '2022-01-01', to: '2022-12-31' },
  { label: '2023 regional-bank stress', from: '2023-03-01', to: '2023-06-30' },
  { label: '2025 tariff shock', from: '2025-03-01', to: '2025-06-30' }
];

const episodeOf = (date: string) =>
  marketEpisodes.find((episode) => date >= episode.from && date <= episode.to)?.label ?? 'other';

export const analyzeOverlap = async (label: string, result: RunResult) => {
  const intervals = intervalsOf(result);
  const symbols = result.config.symbols;
  const pairs: Record<string, unknown>[] = [];

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const a = intervals.filter((interval) => interval.trade.symbol === symbols[i]);
      const b = intervals.filter((interval) => interval.trade.symbol === symbols[j]);
      let overlaps = 0;
      let overlapSeconds = 0;
      const aConcurrent = new Set<VirtualTrade>();
      const bConcurrent = new Set<VirtualTrade>();

      for (const x of a) {
        for (const y of b) {
          const start = Math.max(x.start, y.start);
          const end = Math.min(x.end, y.end);

          if (end > start) {
            overlaps++;
            overlapSeconds += end - start;
            aConcurrent.add(x.trade);
            bConcurrent.add(y.trade);
          }
        }
      }

      const held = (list: Interval[]) => list.reduce((total, interval) => total + interval.end - interval.start, 0);

      pairs.push({
        configuration: label,
        a: symbols[i],
        b: symbols[j],
        a_trades: a.length,
        b_trades: b.length,
        overlapping_pairs: overlaps,
        a_trades_overlapping: aConcurrent.size,
        b_trades_overlapping: bConcurrent.size,
        overlap_days: overlapSeconds / 86400,
        a_held_days: held(a) / 86400,
        b_held_days: held(b) / 86400,
        a_share_concurrent: held(a) > 0 ? overlapSeconds / held(a) : 0,
        b_share_concurrent: held(b) > 0 ? overlapSeconds / held(b) : 0
      });
    }
  }

  // Concurrency at each close: how many books hold a virtual position.
  const concurrency = new Map<number, number>();
  const ds = Object.values(result.universe.instruments)[0]!.ds;

  for (let s = result.config.eligibilityIndex ?? result.universe.eligibilityIndex; s <= result.endIndex; s++) {
    const close = ds.sCloseTime[s]!;
    const count = new Set(
      intervals
        .filter((interval) => interval.start <= close && interval.end > close)
        .map((interval) => interval.trade.symbol)
    ).size;

    concurrency.set(count, (concurrency.get(count) ?? 0) + 1);
  }

  // Episodes: connected components of overlapping virtual holdings across every book.
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const episodes: { start: number; end: number; trades: Interval[] }[] = [];

  for (const interval of sorted) {
    const last = episodes.at(-1);

    if (last && interval.start < last.end) {
      last.trades.push(interval);
      last.end = Math.max(last.end, interval.end);
    } else {
      episodes.push({ start: interval.start, end: interval.end, trades: [interval] });
    }
  }

  const episodeRows = episodes.map((episode, index) => {
    const bySymbol = new Map<Sym, number>();

    for (const interval of episode.trades) {
      bySymbol.set(interval.trade.symbol, (bySymbol.get(interval.trade.symbol) ?? 0) + 1);
    }

    return {
      configuration: label,
      episode: index + 1,
      start: formatDate(episode.start),
      end: formatDate(episode.end),
      market_episode: episodeOf(formatDate(episode.start)),
      virtual_trades: episode.trades.length,
      symbols: [...bySymbol].map(([symbol, count]) => `${symbol}×${count}`).join(' '),
      distinct_symbols: bySymbol.size,
      virtual_net_per_100k: episode.trades.reduce((total, interval) => total + interval.trade.net, 0),
      funded_trades: episode.trades.filter((interval) => interval.trade.fundedLotId > 0).length,
      funded_net_per_100k: episode.trades
        .filter((interval) => interval.trade.fundedLotId > 0)
        .reduce((total, interval) => total + interval.trade.net, 0)
    };
  });

  // Who refused whom (the occupying lot's symbol), with the refused trades' hypothetical outcomes.
  const matrix = new Map<string, { count: number; net: number; positive: number }>();

  for (const signal of result.signals.filter((candidate) => candidate.outcome === 'refused')) {
    const occupant = signal.occupiedBy.split('+')[0]?.split(' ')[0] ?? '';
    const key = `${signal.symbol}|${occupant}`;
    const entry = matrix.get(key) ?? { count: 0, net: 0, positive: 0 };

    entry.count++;
    entry.net += signal.trade?.net ?? 0;
    entry.positive += (signal.trade?.net ?? 0) > 0 ? 1 : 0;
    matrix.set(key, entry);
  }

  const matrixRows = [...matrix].map(([key, entry]) => {
    const [refused, occupant] = key.split('|');

    return {
      configuration: label,
      refused_symbol: refused,
      occupied_by: occupant,
      refusals: entry.count,
      hypothetical_net_per_100k: entry.net,
      hypothetical_winners: entry.positive
    };
  });

  // Trades with distinct timing: no other book holds a position at any moment of the trade.
  const distinct = intervals.filter(
    (interval) =>
      !intervals.some(
        (other) =>
          other.trade.symbol !== interval.trade.symbol &&
          Math.min(other.end, interval.end) > Math.max(other.start, interval.start)
      )
  );

  return {
    pairs,
    concurrency: [...concurrency]
      .sort((a, b) => a[0] - b[0])
      .map(([books, sessions]) => ({ configuration: label, books, sessions })),
    episodes: episodeRows,
    matrix: matrixRows,
    summary: {
      configuration: label,
      virtual_trades: intervals.length,
      funded_trades: intervals.filter((interval) => interval.trade.fundedLotId > 0).length,
      virtual_net_per_100k_sum: intervals.reduce((total, interval) => total + interval.trade.net, 0),
      funded_net_per_100k: intervals
        .filter((interval) => interval.trade.fundedLotId > 0)
        .reduce((total, interval) => total + interval.trade.net, 0),
      episodes: episodes.length,
      episodes_with_two_or_more_symbols: episodeRows.filter((row) => row.distinct_symbols >= 2).length,
      distinct_timing_trades: distinct.length,
      distinct_timing_net_per_100k: distinct.reduce((total, interval) => total + interval.trade.net, 0),
      by_market_episode: marketEpisodes.map((episode) => ({
        episode: episode.label,
        virtual_trades: intervals.filter((interval) => episodeOf(formatDate(interval.start)) === episode.label).length,
        virtual_net_per_100k: intervals
          .filter((interval) => episodeOf(formatDate(interval.start)) === episode.label)
          .reduce((total, interval) => total + interval.trade.net, 0)
      }))
    }
  };
};

// Daily close-to-close return correlations from the eligibility session (context for the collisions).
export const returnCorrelations = (result: RunResult) => {
  const names = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] as const;
  const start = result.universe.eligibilityIndex;
  const returns = names.map((name) => {
    const ds = result.universe.instruments[name]!.ds;
    const values: number[] = [];

    for (let s = start + 1; s <= result.endIndex; s++) {
      values.push(ds.sClose[s]! / ds.sClose[s - 1]! - 1);
    }

    return values;
  });
  const correlation = (x: number[], y: number[]) => {
    const mx = x.reduce((a, b) => a + b, 0) / x.length;
    const my = y.reduce((a, b) => a + b, 0) / y.length;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;

    for (let i = 0; i < x.length; i++) {
      sxy += (x[i]! - mx) * (y[i]! - my);
      sxx += (x[i]! - mx) ** 2;
      syy += (y[i]! - my) ** 2;
    }

    return sxy / Math.sqrt(sxx * syy);
  };

  return names.map((a, i) => ({
    security: a,
    ...Object.fromEntries(names.map((b, j) => [b, correlation(returns[i]!, returns[j]!)]))
  }));
};

export const writeOverlap = async (runs: { label: string; result: RunResult }[]) => {
  const all = [];

  for (const run of runs) {
    all.push(await analyzeOverlap(run.label, run.result));
  }

  await fs.outputFile(stageDir('overlap', 'pairs.csv'), toCsv(all.flatMap((row) => row.pairs)));
  await fs.outputFile(stageDir('overlap', 'concurrency.csv'), toCsv(all.flatMap((row) => row.concurrency)));
  await fs.outputFile(stageDir('overlap', 'episodes.csv'), toCsv(all.flatMap((row) => row.episodes)));
  await fs.outputFile(stageDir('overlap', 'refusal_matrix.csv'), toCsv(all.flatMap((row) => row.matrix)));
  await fs.outputFile(stageDir('overlap', 'correlations.csv'), toCsv(returnCorrelations(runs[0]!.result)));
  await writeJson(
    stageDir('overlap', 'overlap_summary.json'),
    all.map((row) => row.summary)
  );

  return all;
};
