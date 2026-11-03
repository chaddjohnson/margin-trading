// The All-lowDd shadow final validation (2026-10-23, post hoc on inspected history; outside PROTOCOL.md's predeclared
// program and no parameter, phenotype, policy or fraction is chosen from it):
//
//   1. baseline reproduction    F-VGT, F-all-lowDd-shadow, B, C-all-lowDd-shadow against the catalogue's summaries
//   2. execution costs          0 / 2 / 5 / 10 bps per side through the engine (costs enter the books' own net-profit
//                               tests, so trade lists may change); total costs, trade-list differences, per-symbol
//                               attribution, and B's 10/15/20/25% ladder at each cost for the matched-borrowing test
//   3. targeted gaps            10% and 15% overnight gaps of the funded ETF at a few selected historical lots, alone
//                               and with every other security falling half as much; whole path recomputed
//   4. March 2020               lots, refusals, stops and drawdown inside 2020-02-19 → 2020-06-30
//   5. losing streaks           worst consecutive losing lots at every cost level
//
// Outputs go to results/final-validation/; the report is ALL_LOWDD_FINAL_VALIDATION.md.
import path from 'node:path';
import fs from 'fs-extra';
import { combinationOf, formatDate, log, readJson, stageDir, symbols, writeJson } from './context.ts';
import type { Universe } from './data.ts';
import { type RunConfig, type RunResult, runAllocator, sessionIndexOf } from './engine.ts';
import type { RealLot } from './ledger.ts';
import { attribution, summarize, toCsv, tradeRecords, virtualTradeRecords } from './metrics.ts';
import { scenarioBConfig } from './parity.ts';
import { allocatorConfig, fixedVgtConfig } from './scenarios.ts';

const outDir = (...parts: string[]) => stageDir('final-validation', ...parts);

const costLevels = [0, 2, 5, 10];
const gapSizes = [0.1, 0.15];
const correlatedShare = 0.5; // the correlated case: every other security falls half the gap
const episode = { start: '2020-02-19', end: '2020-06-30' };

type Strategy = 'VGT' | 'lowDd';
type Mode = 'fixed' | 'portfolio';

interface Base {
  key: string;
  strategy: Strategy;
  mode: Mode;
  build: (overrides?: Partial<RunConfig>) => Promise<RunConfig>;
}

const bases: Base[] = [
  { key: 'F-VGT', strategy: 'VGT', mode: 'fixed', build: (overrides = {}) => fixedVgtConfig(overrides) },
  {
    key: 'F-all-lowDd-shadow',
    strategy: 'lowDd',
    mode: 'fixed',
    build: (overrides = {}) => allocatorConfig('fixed', combinationOf('all-lowDd'), 'shadow', overrides)
  },
  { key: 'B', strategy: 'VGT', mode: 'portfolio', build: (overrides = {}) => scenarioBConfig(overrides) },
  {
    key: 'C-all-lowDd-shadow',
    strategy: 'lowDd',
    mode: 'portfolio',
    build: (overrides = {}) => allocatorConfig('portfolio', combinationOf('all-lowDd'), 'shadow', overrides)
  }
];

const keyOf = (base: string, bps: number, fraction = 0.2) =>
  `${base}${bps > 0 ? `-cost${bps}` : ''}${fraction !== 0.2 ? `-f${Math.round(fraction * 100)}` : ''}`;

const lotSignature = (result: RunResult, lot: RealLot) =>
  `${lot.symbol} ${formatDate(lot.entryTime)}→${lot.exitIndex >= 0 ? result.universe.dates[lot.exitIndex] : 'open'} ${lot.exitIndex >= 0 ? lot.exitReason : 'open'}`;

const tradeSignature = (result: RunResult, trade: RunResult['trades'][number]) =>
  `${trade.symbol} ${formatDate(trade.entryTime)}→${trade.exitIndex >= 0 ? result.universe.dates[trade.exitIndex] : 'open'} ${trade.exitIndex >= 0 ? trade.exitReason : 'open'}`;

// ----- transaction costs, exactly as the ledger charged them -----

// Lots: shares × (cost-adjusted − raw) on each side. Core (portfolio): every non-DRIP purchase and sale of VOOG / VGT
// core recorded in the ledger, whose event price already includes the per-side cost.
const transactionCosts = (result: RunResult) => {
  const bps = result.config.costBps / 10000;
  const bySymbol: Record<string, number> = Object.fromEntries(symbols.map((symbol) => [symbol, 0]));
  let lots = 0;

  for (const lot of result.lots) {
    const entry = lot.shares * (lot.entryPrice - lot.entryRawPrice);
    const exit = lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0;

    bySymbol[lot.symbol]! += entry + exit;
    lots += entry + exit;
  }

  let core = 0;

  for (const event of result.events) {
    // Core orders only (forced sales do not occur in the cost runs: no call at U35).
    if (!['reinvest', 'fund loss', 'rebalance'].includes(event.kind)) {
      continue;
    }

    const notional = Math.abs(event.shares) * event.price;

    core += event.shares > 0 ? (notional * bps) / (1 + bps) : (notional * bps) / (1 - bps);
  }

  return { lots, core, total: lots + core, bySymbol };
};

// ----- losing streaks over funded lots in exit order -----

const losingStreaks = (result: RunResult) => {
  const closed = result.lots.filter((lot) => lot.exitIndex >= 0).sort((a, b) => a.exitTime - b.exitTime);
  let longest = { count: 0, loss: 0, from: '', to: '', lots: '' };
  let worst = { count: 0, loss: 0, from: '', to: '', lots: '' };
  let run: RealLot[] = [];
  const close = () => {
    if (run.length === 0) {
      return;
    }

    const streak = {
      count: run.length,
      loss: run.reduce((total, lot) => total + lot.net, 0),
      from: formatDate(run[0]!.entryTime),
      to: result.universe.dates[run.at(-1)!.exitIndex]!,
      lots: run.map((lot) => `${lot.symbol}#${lot.id} ${Math.round(lot.net)}`).join('; ')
    };

    if (streak.count > longest.count || (streak.count === longest.count && streak.loss < longest.loss)) {
      longest = streak;
    }

    if (streak.loss < worst.loss) {
      worst = streak;
    }

    run = [];
  };

  for (const lot of closed) {
    if (lot.net < 0) {
      run.push(lot);
    } else {
      close();
    }
  }

  close();

  return { longest, worst };
};

// ----- drawdown inside a window of sessions (daily equity) -----

const windowDrawdown = (result: RunResult, from: number, to: number, peakFrom = from) => {
  let peak = -Infinity;
  let peakDate = '';
  let worst = { amount: 0, percent: 0, peak: '', trough: '', peakValue: NaN, troughValue: NaN };

  for (const row of result.daily) {
    if (row.index < peakFrom || row.index > to) {
      continue;
    }

    if (row.equity > peak) {
      peak = row.equity;
      peakDate = row.date;
    }

    if (row.index < from) {
      continue;
    }

    const amount = peak - row.equity;

    if (amount > worst.amount) {
      worst = {
        amount,
        percent: result.config.mode === 'portfolio' ? amount / peak : NaN,
        peak: peakDate,
        trough: row.date,
        peakValue: peak,
        troughValue: row.equity
      };
    }
  }

  return worst;
};

const dailyEquity = (result: RunResult, index: number) =>
  result.daily.find((row) => row.index === index)?.equity ?? NaN;

// The deepest percentage fall of daily closing equity from its running peak. The engine's Tracker records the largest
// DOLLAR drawdown and that episode's percentage, which in a compounding account is not the largest percentage.
const maxPercentDrawdown = (result: RunResult) => {
  let peak = -Infinity;
  let peakDate = '';
  let worst = { percent: 0, peak: '', trough: '' };

  for (const row of result.daily) {
    if (row.equity >= peak) {
      peak = row.equity;
      peakDate = row.date;
    }

    if (peak > 0 && (peak - row.equity) / peak > worst.percent) {
      worst = { percent: (peak - row.equity) / peak, peak: peakDate, trough: row.date };
    }
  }

  return worst;
};

// ----- 1–2. baseline and costs -----

const summaryFields = (result: RunResult) => {
  const summary = summarize(result);
  const costs = transactionCosts(result);
  const streaks = losingStreaks(result);
  const isPortfolio = result.config.mode === 'portfolio';
  const percentDd = maxPercentDrawdown(result);

  return {
    summary,
    row: {
      key: result.config.key,
      mode: result.config.mode,
      cost_bps: result.config.costBps,
      fraction: isPortfolio ? result.config.fraction : '',
      net: summary.net,
      end_equity: isPortfolio ? summary.endEquity : '',
      minute_dd: summary.minuteDrawdown,
      minute_dd_percent: isPortfolio ? summary.minuteDrawdownPercent : '',
      daily_dd: summary.dailyDrawdown,
      daily_dd_percent: isPortfolio ? summary.dailyDrawdownPercent : '',
      daily_dd_peak: summary.dailyDrawdownPeak,
      daily_dd_trough: summary.dailyDrawdownTrough,
      max_percent_daily_dd: isPortfolio ? percentDd.percent : '',
      max_percent_daily_dd_span: isPortfolio ? `${percentDd.peak}→${percentDd.trough}` : '',
      strategy_minute_dd: isPortfolio ? summary.strategyMinuteDrawdown : '',
      net_per_minute_dd: isPortfolio ? '' : summary.net / summary.minuteDrawdown,
      transaction_costs: costs.total,
      lot_costs: costs.lots,
      core_costs: costs.core,
      costs_by_symbol: symbols.map((symbol) => `${symbol} ${Math.round(costs.bySymbol[symbol]!)}`).join('; '),
      interest: summary.interest,
      virtual_trades: summary.virtualTrades,
      funded_lots: summary.fundedLots,
      closed: summary.closed,
      wins: summary.wins,
      losses: summary.losses,
      worst_trade: summary.worstTrade,
      borrowing_dollar_days: summary.borrowingDollarDays,
      min_equity_to_lmv_daily: isPortfolio ? summary.minEquityToLmvDaily : '',
      calls: summary.calls,
      net_by_symbol: summary.netBySymbol,
      funded_by_symbol: summary.fundedBySymbol,
      longest_losing_streak: streaks.longest.count,
      longest_streak_loss: streaks.longest.loss,
      longest_streak_span: `${streaks.longest.from}→${streaks.longest.to}`,
      worst_streak_count: streaks.worst.count,
      worst_streak_loss: streaks.worst.loss,
      worst_streak_span: `${streaks.worst.from}→${streaks.worst.to}`,
      worst_streak_lots: streaks.worst.lots,
      virtual_signature: summary.virtualSignature
    }
  };
};

interface CatalogueSummary {
  key: string;
  net: number;
  endEquity: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  dailyDrawdownPercent: number;
  virtualTrades: number;
  fundedLots: number;
  wins: number;
  losses: number;
  virtualSignature: string;
}

// Lot-level decomposition of a cost run's change in net against the zero-cost run of the same base.
const costAttribution = (base: RunResult, variant: RunResult) => {
  const before = new Map(base.lots.map((lot) => [lotSignature(base, lot), lot]));
  const after = new Map(variant.lots.map((lot) => [lotSignature(variant, lot), lot]));
  const costs = transactionCosts(variant);
  const baseAttribution = new Map(attribution(base).map((row) => [row.symbol, row]));

  return attribution(variant).map((row) => {
    const sameDelta = [...after]
      .filter(([signature, lot]) => lot.symbol === row.symbol && before.has(signature))
      .reduce((total, [signature, lot]) => total + lot.net - before.get(signature)!.net, 0);
    const added = [...after].filter(([signature, lot]) => lot.symbol === row.symbol && !before.has(signature));
    const removed = [...before].filter(([signature, lot]) => lot.symbol === row.symbol && !after.has(signature));
    const baseRow = baseAttribution.get(row.symbol)!;
    const baseTrades = new Set(
      base.trades.filter((trade) => trade.symbol === row.symbol).map((t) => tradeSignature(base, t))
    );
    const variantTrades = new Set(
      variant.trades.filter((trade) => trade.symbol === row.symbol).map((t) => tradeSignature(variant, t))
    );

    return {
      key: variant.config.key,
      symbol: row.symbol,
      base_net: baseRow.net,
      net: row.net,
      change: row.net - baseRow.net,
      transaction_costs: costs.bySymbol[row.symbol],
      change_on_unchanged_lots: sameDelta,
      lots_removed: removed.length,
      net_of_removed_lots: removed.reduce((total, [, lot]) => total + lot.net, 0),
      lots_added: added.length,
      net_of_added_lots: added.reduce((total, [, lot]) => total + lot.net, 0),
      base_funded: baseRow.funded,
      funded: row.funded,
      base_virtual_trades: baseRow.virtualTrades,
      virtual_trades: row.virtualTrades,
      base_virtual_net_per_100k: baseRow.virtualNetPer100k,
      virtual_net_per_100k: row.virtualNetPer100k,
      virtual_only_in_variant: [...variantTrades].filter((t) => !baseTrades.has(t)).join('; '),
      virtual_only_in_base: [...baseTrades].filter((t) => !variantTrades.has(t)).join('; '),
      funded_only_in_variant: added.map(([signature, lot]) => `${signature} ${Math.round(lot.net)}`).join('; '),
      funded_only_in_base: removed.map(([signature, lot]) => `${signature} ${Math.round(lot.net)}`).join('; ')
    };
  });
};

// ----- 3. gaps -----

interface GapTarget {
  strategy: Strategy;
  symbol: string;
  entryTime: number;
  entryDate: string;
  why: string;
  gapIndex: number;
}

const selectGapTargets = (fixed: RunResult, portfolio: RunResult, strategy: Strategy): GapTarget[] => {
  const targets = new Map<string, GapTarget>();
  const add = (lot: RealLot, why: string, gapIndex: number) => {
    const id = `${lot.symbol}:${lot.entryTime}`;
    const existing = targets.get(id);

    if (existing) {
      existing.why += ` + ${why}`;
      return;
    }

    targets.set(id, {
      strategy,
      symbol: lot.symbol,
      entryTime: lot.entryTime,
      entryDate: formatDate(lot.entryTime),
      why,
      gapIndex
    });
  };
  const closed = (result: RunResult) => result.lots.filter((lot) => lot.exitIndex > lot.entryIndex);

  // The two largest portfolio lots: gap at the first open after the fill.
  for (const lot of [...closed(portfolio)].sort((a, b) => b.originalPrincipal - a.originalPrincipal).slice(0, 2)) {
    add(
      lot,
      `largest portfolio lot ($${Math.round(lot.originalPrincipal).toLocaleString('en-US')})`,
      lot.entryIndex + 1
    );
  }

  // The two worst adverse excursions per $100k (fixed pool): gap at the open of the worst session (after the entry
  // session), stacking the gap on the deepest observed point.
  for (const lot of [...closed(fixed)].sort((a, b) => a.worstMark - b.worstMark).slice(0, 2)) {
    const worstIndex = sessionIndexOf(fixed.universe, formatDate(lot.worstMarkTime));

    add(
      lot,
      `worst fixed-pool adverse excursion (${Math.round(lot.worstMark).toLocaleString('en-US')} on ${formatDate(lot.worstMarkTime)})`,
      Math.max(lot.entryIndex + 1, worstIndex)
    );
  }

  return [...targets.values()];
};

const gapRun = (
  universe: Universe,
  config: RunConfig,
  baseResult: RunResult,
  target: GapTarget,
  gap: number,
  rho: number
) => {
  const factors = Object.fromEntries(
    ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'].map((security) => [
      security,
      security === target.symbol ? 1 - gap : 1 - rho * gap
    ])
  );
  const result = runAllocator(universe, {
    ...config,
    key: `${config.key}-gap-${target.symbol}-${universe.dates[target.gapIndex]}-g${gap}-r${rho}`,
    shocks: [{ index: target.gapIndex, factors }]
  });
  const lot = result.lots.find(
    (candidate) => candidate.symbol === target.symbol && candidate.entryTime === target.entryTime
  );
  const baseLot = baseResult.lots.find(
    (candidate) => candidate.symbol === target.symbol && candidate.entryTime === target.entryTime
  );
  const index = target.gapIndex;
  const summary = summarize(result);
  const baseSummary = summarize(baseResult);
  const isPortfolio = config.mode === 'portfolio';
  const lotEnd = lot && lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex;
  const episodeDd = windowDrawdown(result, index, Math.min(lotEnd + 20, result.endIndex), 0);
  const baseEpisodeDd = windowDrawdown(baseResult, index, Math.min(lotEnd + 20, baseResult.endIndex), 0);
  const virtual = lot?.trade;

  return {
    base: config.key,
    strategy: target.strategy,
    mode: config.mode,
    symbol: target.symbol,
    lot_entry: target.entryDate,
    selected_as: target.why,
    gap_date: universe.dates[index],
    gap,
    others_fall: rho * gap,
    lot_principal: lot?.originalPrincipal ?? NaN,
    lot_open_at_gap: lot ? lot.entryIndex < index && (lot.exitIndex < 0 || lot.exitIndex >= index) : false,
    stop_active_at_gap: virtual ? virtual.stopFirstActiveIndex >= 0 && virtual.stopFirstActiveIndex < index : '',
    base_lot_net: baseLot?.net ?? NaN,
    base_lot_exit:
      baseLot && baseLot.exitIndex >= 0
        ? `${baseResult.universe.dates[baseLot.exitIndex]} ${baseLot.exitReason}`
        : 'open',
    lot_net: lot?.net ?? NaN,
    lot_net_change: (lot?.net ?? NaN) - (baseLot?.net ?? NaN),
    lot_exit:
      lot && lot.exitIndex >= 0
        ? `${result.universe.dates[lot.exitIndex]} ${lot.exitReason} (${lot.exitExecution})`
        : 'open',
    stopped_at_gap_open: lot ? lot.exitIndex === index && /stop/.test(lot.exitReason) : false,
    lot_worst_mark: lot?.worstMark ?? NaN,
    equity_before_gap: dailyEquity(result, index - 1),
    equity_gap_close: dailyEquity(result, index),
    gap_day_change: dailyEquity(result, index) - dailyEquity(result, index - 1),
    base_gap_day_change: dailyEquity(baseResult, index) - dailyEquity(baseResult, index - 1),
    episode_dd: episodeDd.amount,
    episode_dd_percent: episodeDd.percent,
    episode_dd_peak: episodeDd.peak,
    episode_dd_trough: episodeDd.trough,
    base_episode_dd: baseEpisodeDd.amount,
    base_episode_dd_percent: baseEpisodeDd.percent,
    max_minute_dd: summary.minuteDrawdown,
    base_max_minute_dd: baseSummary.minuteDrawdown,
    max_daily_dd: summary.dailyDrawdown,
    max_daily_dd_percent: isPortfolio ? summary.dailyDrawdownPercent : '',
    base_max_daily_dd_percent: isPortfolio ? baseSummary.dailyDrawdownPercent : '',
    max_percent_daily_dd: isPortfolio ? maxPercentDrawdown(result).percent : '',
    base_max_percent_daily_dd: isPortfolio ? maxPercentDrawdown(baseResult).percent : '',
    min_equity_to_lmv_daily: isPortfolio ? summary.minEquityToLmvDaily : '',
    calls: summary.calls,
    funded_lots: summary.fundedLots,
    base_funded_lots: baseSummary.fundedLots,
    net: summary.net,
    base_net: baseSummary.net,
    end_equity: isPortfolio ? summary.endEquity : '',
    base_end_equity: isPortfolio ? baseSummary.endEquity : ''
  };
};

// ----- 4. March 2020 -----

const closeOf = (universe: Universe, symbol: string, index: number) =>
  (universe.instruments as Record<string, { ds: { sClose: Float64Array } }>)[symbol]!.ds.sClose[index]!;

const marchEpisode = (result: RunResult) => {
  const universe = result.universe;
  const from = sessionIndexOf(universe, episode.start);
  const to = sessionIndexOf(universe, episode.end);
  const lots = result.lots.filter((lot) => lot.entryIndex <= to && (lot.exitIndex < 0 || lot.exitIndex >= from));
  const lotRows = lots.map((lot) => {
    const exit = lot.exitIndex;
    const after = (sessions: number) =>
      exit >= 0 && exit + sessions <= result.endIndex
        ? closeOf(universe, lot.symbol, exit + sessions) / lot.exitRawPrice - 1
        : NaN;

    return {
      key: result.config.key,
      lot_id: lot.id,
      symbol: lot.symbol,
      setup_kind: lot.trade.setupKind,
      entry: formatDate(lot.entryTime),
      entry_price: lot.entryRawPrice,
      principal: lot.originalPrincipal,
      exit: exit >= 0 ? universe.dates[exit] : 'open',
      exit_price: lot.exitRawPrice,
      exit_reason: exit >= 0 ? lot.exitReason : 'open',
      exit_execution: lot.exitExecution,
      stop_active_at_exit: lot.trade.stopActiveAtExit,
      net: lot.net,
      worst_mark: lot.worstMark,
      worst_mark_date: formatDate(lot.worstMarkTime),
      price_change_5_sessions_after_exit: after(5),
      price_change_20_sessions_after_exit: after(20),
      price_change_to_episode_end:
        exit >= 0 && exit < to ? closeOf(universe, lot.symbol, to) / lot.exitRawPrice - 1 : NaN,
      hold_to_episode_end_minus_actual:
        exit >= 0 && exit < to ? lot.shares * (closeOf(universe, lot.symbol, to) - lot.exitRawPrice) : NaN
    };
  });
  const refusals = result.signals
    .filter((signal) => signal.outcome === 'refused' && signal.index >= from && signal.index <= to)
    .map((signal) => ({
      key: result.config.key,
      symbol: signal.symbol,
      date: signal.date,
      decision_price: signal.decisionPrice,
      reason: signal.reason,
      occupied_by: signal.occupiedBy,
      hypothetical_entry: signal.trade && signal.trade.entryIndex >= 0 ? universe.dates[signal.trade.entryIndex] : '',
      hypothetical_exit: signal.trade && signal.trade.exitIndex >= 0 ? universe.dates[signal.trade.exitIndex] : '',
      hypothetical_exit_reason: signal.trade ? (signal.trade.exitIndex >= 0 ? signal.trade.exitReason : 'open') : '',
      hypothetical_net_per_100k: signal.trade?.net ?? NaN,
      counterfactual: 'HYPOTHETICAL'
    }));
  const dd = windowDrawdown(result, from, to, 0);
  const preEpisodePeak = Math.max(
    ...result.daily.filter((row) => row.index < from).map((row) => row.equity),
    -Infinity
  );
  const recovery = result.daily.find((row) => row.index > from && row.equity >= dd.peakValue && row.date > dd.trough);
  const startEquity = dailyEquity(result, from - 1);
  const endEquity = dailyEquity(result, to);

  return {
    lotRows,
    refusals,
    summary: {
      key: result.config.key,
      window: `${episode.start}→${episode.end}`,
      equity_before: startEquity,
      equity_at_end: endEquity,
      change_over_window: endEquity - startEquity,
      pre_episode_peak: preEpisodePeak,
      drawdown: dd.amount,
      drawdown_percent: dd.percent,
      drawdown_peak: dd.peak,
      drawdown_trough: dd.trough,
      recovered_on: recovery?.date ?? 'not by end',
      lots: lotRows.length,
      lots_net: lotRows.reduce((total, row) => total + row.net, 0),
      stop_exits: lotRows.filter((row) => /stop/.test(row.exit_reason)).length,
      refused_signals: refusals.length,
      refused_vgt_signals: refusals.filter((row) => row.symbol === 'VGT').length
    }
  };
};

// ----- the runner -----

export const runFinalValidation = async (universe: Universe) => {
  await fs.ensureDir(outDir());

  const results = new Map<string, RunResult>();
  const rows: Record<string, unknown>[] = [];
  const run = async (base: Base, bps: number, fraction = 0.2) => {
    const key = keyOf(base.key, bps, fraction);
    const started = Date.now();
    const config = await base.build({ costBps: bps, ...(fraction !== 0.2 ? { fraction } : {}) });
    const result = runAllocator(universe, { ...config, key });
    const { row } = summaryFields(result);

    results.set(key, result);
    rows.push({ base: base.key, strategy: base.strategy, ...row });
    log(
      `final-validation ${key}: net ${Math.round(result.lots.reduce((t, l) => t + l.net, 0))} (${((Date.now() - started) / 1000).toFixed(1)} s)`
    );

    return result;
  };

  // 1. Baseline reproduction against the committed catalogue.
  const catalogue = await readJson<CatalogueSummary[]>(stageDir('scenario_summary.json'));
  const reproduction: Record<string, unknown>[] = [];

  for (const base of bases) {
    const result = await run(base, 0);
    const summary = summarize(result);
    const reference = catalogue.find((row) => row.key === base.key)!;
    const fields = [
      'net',
      'endEquity',
      'minuteDrawdown',
      'dailyDrawdown',
      'dailyDrawdownPercent',
      'virtualTrades',
      'fundedLots',
      'wins',
      'losses',
      'virtualSignature'
    ] as const;

    reproduction.push({
      key: base.key,
      ...Object.fromEntries(fields.map((field) => [field, summary[field]])),
      differences: fields
        .filter((field) => summary[field] !== reference[field])
        .map((field) => `${field}: ${String(summary[field])} vs ${String(reference[field])}`)
    });
  }

  await writeJson(outDir('baseline_reproduction.json'), reproduction);

  if (reproduction.some((row) => (row.differences as string[]).length > 0)) {
    throw new Error('Baseline reproduction failed; see final-validation/baseline_reproduction.json');
  }

  // 2. Costs, both modes; B and C at the ladder fractions for the matched-borrowing comparison.
  for (const bps of costLevels.filter((value) => value > 0)) {
    for (const base of bases) {
      await run(base, bps);
    }
  }

  for (const bps of costLevels) {
    for (const base of bases.filter((candidate) => candidate.mode === 'portfolio')) {
      for (const fraction of base.strategy === 'VGT' ? [0.1, 0.15, 0.25] : [0.1, 0.15]) {
        await run(base, bps, fraction);
      }
    }
  }

  await fs.outputFile(outDir('cost_runs.csv'), toCsv(rows));

  const attributionRows = bases.flatMap((base) =>
    costLevels
      .filter((bps) => bps > 0)
      .flatMap((bps) => costAttribution(results.get(keyOf(base.key, 0))!, results.get(keyOf(base.key, bps))!))
  );

  await fs.outputFile(outDir('cost_attribution.csv'), toCsv(attributionRows));

  for (const base of bases) {
    for (const bps of costLevels) {
      const result = results.get(keyOf(base.key, bps))!;
      const dir = outDir('trades', keyOf(base.key, bps));

      await fs.outputFile(path.join(dir, 'trades.csv'), toCsv(tradeRecords(result)));
      await fs.outputFile(path.join(dir, 'virtual_trades.csv'), toCsv(virtualTradeRecords(result)));
    }
  }

  // Matched borrowing: C (10/15/20%) against B's ladder at the same cost, interpolated on borrowing-dollar-days.
  const interpolate = (points: { x: number; y: number }[], x: number) => {
    const sorted = [...points].sort((p, q) => p.x - q.x);

    for (let i = 1; i < sorted.length; i++) {
      if (x <= sorted[i]!.x) {
        const left = sorted[i - 1]!;
        const right = sorted[i]!;

        return { value: left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x), extrapolated: false };
      }
    }

    const [left, right] = sorted.slice(-2) as [{ x: number; y: number }, { x: number; y: number }];

    return { value: left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x), extrapolated: true };
  };
  const matched: Record<string, unknown>[] = [];

  for (const bps of costLevels) {
    const ladder = [0.1, 0.15, 0.2, 0.25].map((fraction) => summarize(results.get(keyOf('B', bps, fraction))!));

    for (const fraction of [0.1, 0.15, 0.2]) {
      const summary = summarize(results.get(keyOf('C-all-lowDd-shadow', bps, fraction))!);
      const atDays = interpolate(
        ladder.map((row) => ({ x: row.borrowingDollarDays, y: row.endEquity })),
        summary.borrowingDollarDays
      );

      matched.push({
        cost_bps: bps,
        fraction,
        end_equity: summary.endEquity,
        daily_dd_percent: summary.dailyDrawdownPercent,
        borrowing_dollar_days: summary.borrowingDollarDays,
        b_at_same_dollar_days: atDays.value,
        extrapolated: atDays.extrapolated,
        difference: summary.endEquity - atDays.value,
        b_ladder: ladder
          .map(
            (row, i) =>
              `${[10, 15, 20, 25][i]}%: ${Math.round(row.endEquity)} @ ${(row.borrowingDollarDays / 1e6).toFixed(1)}M`
          )
          .join('; ')
      });
    }
  }

  await fs.outputFile(outDir('matched_utilization.csv'), toCsv(matched));

  // 5. Losing streaks at every cost (the cost rows carry them; this is the table for the report).
  await fs.outputFile(
    outDir('losing_streaks.csv'),
    toCsv(
      rows
        .filter((row) => row.fraction === '' || row.fraction === 0.2)
        .map((row) => ({
          key: row.key,
          cost_bps: row.cost_bps,
          longest_losing_streak: row.longest_losing_streak,
          longest_streak_loss: row.longest_streak_loss,
          longest_streak_span: row.longest_streak_span,
          worst_streak_count: row.worst_streak_count,
          worst_streak_loss: row.worst_streak_loss,
          worst_streak_span: row.worst_streak_span,
          worst_streak_lots: row.worst_streak_lots,
          minute_dd: row.minute_dd,
          daily_dd: row.daily_dd
        }))
    )
  );

  // 4. March 2020 on the zero-cost runs.
  const marchLots: Record<string, unknown>[] = [];
  const marchRefusals: Record<string, unknown>[] = [];
  const marchSummaries: Record<string, unknown>[] = [];

  for (const base of bases) {
    const episodeResult = marchEpisode(results.get(keyOf(base.key, 0))!);

    marchLots.push(...episodeResult.lotRows);
    marchRefusals.push(...episodeResult.refusals);
    marchSummaries.push(episodeResult.summary);
  }

  await fs.outputFile(outDir('march2020_lots.csv'), toCsv(marchLots));
  await fs.outputFile(outDir('march2020_refusals.csv'), toCsv(marchRefusals));
  await fs.outputFile(outDir('march2020_summary.csv'), toCsv(marchSummaries));

  // 3. Gaps on the zero-cost runs.
  const gapRows: Record<string, unknown>[] = [];
  const targets: GapTarget[] = [];

  for (const strategy of ['VGT', 'lowDd'] as const) {
    const [fixedBase, portfolioBase] = [
      bases.find((base) => base.strategy === strategy && base.mode === 'fixed')!,
      bases.find((base) => base.strategy === strategy && base.mode === 'portfolio')!
    ];

    targets.push(
      ...selectGapTargets(results.get(keyOf(fixedBase.key, 0))!, results.get(keyOf(portfolioBase.key, 0))!, strategy)
    );
  }

  await fs.outputFile(
    outDir('gap_targets.csv'),
    toCsv(targets.map((target) => ({ ...target, gap_date: universe.dates[target.gapIndex] })))
  );

  for (const target of targets) {
    for (const base of bases.filter((candidate) => candidate.strategy === target.strategy)) {
      const config = await base.build();
      const baseResult = results.get(keyOf(base.key, 0))!;

      for (const gap of gapSizes) {
        for (const rho of [0, correlatedShare]) {
          const row = gapRun(universe, config, baseResult, target, gap, rho);

          gapRows.push(row);
          log(
            `gap ${base.key} ${target.symbol} ${row.gap_date} g${gap} r${rho}: lot ${Math.round(row.lot_net)} (base ${Math.round(row.base_lot_net)}), ${row.lot_exit}`
          );
        }
      }
    }
  }

  await fs.outputFile(outDir('gap_runs.csv'), toCsv(gapRows));
  await writeJson(outDir('settings.json'), {
    generatedAt: new Date().toISOString(),
    note: 'POST HOC on previously inspected history (2016-01-04 → 2025-10-13); not an out-of-sample test',
    costLevelsBps: costLevels,
    gapSizes,
    correlatedShare,
    episode,
    costs: 'per side on every lot and core fill except dividend reinvestment; hypothetical, no bid-ask data measured',
    rate: '11% simple, 365-day (books and ledger)'
  });

  log(`final validation written to ${path.relative('.', outDir())}`);
};
