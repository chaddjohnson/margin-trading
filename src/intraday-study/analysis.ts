// Metrics, paired comparisons and diagnostics for the intraday study (PROTOCOL.md §§8–10). Everything here
// reads finished runs; nothing feeds back into a strategy.
import type { MarketSession } from '#types';
import {
  type Band,
  bands,
  materialDrawdown,
  materialProfit,
  minuteDrawdownGate,
  regimes,
  secondsPerMinute
} from './constants.ts';
import type { SessionFacts } from './data.ts';
import type { DailyRow, RunResult, TradeRecord } from './engine.ts';

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const mean = (values: number[]) => (values.length ? sum(values) / values.length : NaN);
// The mean of the finite values only (a session without any trade after its decision has no benchmark).
export const finiteMean = (values: number[]) => mean(values.filter(Number.isFinite));

export const quantile = (values: number[], q: number) => {
  if (!values.length) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

export const median = (values: number[]) => quantile(values, 0.5);

export const formatTime = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : '';

// Per-session regime labels from information through the previous close (analysis only).
export interface SessionLabels {
  dd15: boolean;
  hiVol: boolean;
}

export const computeLabels = (sessions: readonly MarketSession[]): SessionLabels[] =>
  sessions.map((_, index) => {
    if (index === 0) {
      return { dd15: false, hiVol: false };
    }

    const previousClose = sessions[index - 1]!.close;
    let maxClose = -Infinity;

    for (let k = Math.max(0, index - 252); k < index; k++) {
      maxClose = Math.max(maxClose, sessions[k]!.close);
    }

    const returns: number[] = [];

    for (let k = Math.max(1, index - 20); k < index; k++) {
      returns.push(Math.log(sessions[k]!.close / sessions[k - 1]!.close));
    }

    const average = mean(returns);
    const variance =
      returns.length > 1 ? sum(returns.map((value) => (value - average) ** 2)) / (returns.length - 1) : 0;

    return { dd15: previousClose <= 0.85 * maxClose, hiVol: returns.length === 20 && Math.sqrt(variance * 252) >= 0.3 };
  });

export interface RunMeta {
  window: string;
  policy: string;
  stopMode: string;
  stopFill: string;
}

export interface RunMetrics extends RunMeta {
  costBps: number;
  firstDate: string;
  lastDate: string;
  sessions: number;
  trades: number;
  closedTrades: number;
  openAtEnd: boolean;
  net: number;
  grossPriceProfit: number;
  interest: number;
  fees: number;
  turnover: number;
  winRate: number;
  meanTradeNet: number;
  medianTradeNet: number;
  p10TradeNet: number;
  p90TradeNet: number;
  maxTradeLoss: number;
  bestTrade: number;
  netExBestTrade: number;
  minuteDrawdown: number;
  minuteDrawdownPeak: string;
  minuteDrawdownTrough: string;
  dailyDrawdown: number;
  dailyDrawdownPeak: string;
  dailyDrawdownTrough: string;
  exposureSessions: number;
  exposureShare: number;
  minutesHeld: number;
  meanCalendarDays: number;
  medianCalendarDays: number;
  meanSessionsHeld: number;
  sameSessionExits: number;
  intrasessionStopExits: number;
  exitTrailingStop: number;
  exitTrailingStopGap: number;
  exitMaximumHold: number;
  noFill: number;
  blockedCandidates: number;
  sessionsWithBlockedCandidate: number;
  setupSessionsWithoutEntry: number;
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  reversalCaptures: number;
  reversalCaptureNet: number;
  sameOpportunity: number;
  sameOpportunityNet: number;
  meanPriceImprovement: number;
  prematureContinuedSelling: number;
  prematureContinuedSellingNet: number;
  risingPathTrades: number;
  risingPathNet: number;
  fallingPathTrades: number;
  fallingPathNet: number;
  devNet: number;
  devMinuteDrawdown: number;
  forwardContinuousNet: number;
  years: Record<string, number>;
  regimes: Record<string, number>;
}

const yearOf = (date: string) => date.slice(0, 4);

// Changes in marked equity between year ends (and the window's first and last sessions).
export const yearChanges = (daily: DailyRow[], k: number) => {
  const result: Record<string, number> = {};
  let previous = 0;

  daily.forEach((row, index) => {
    const next = daily[index + 1];

    if (!next || yearOf(next.date) !== yearOf(row.date)) {
      result[yearOf(row.date)] = row.equity[k]! - previous;
      previous = row.equity[k]!;
    }
  });

  return result;
};

const equityBefore = (daily: DailyRow[], index: number, k: number) => (index > 0 ? daily[index - 1]!.equity[k]! : 0);

// Sum of daily equity changes over the sessions selected.
export const regimeChanges = (daily: DailyRow[], k: number, labels: SessionLabels[]) => {
  const result: Record<string, number> = {};

  for (const regime of regimes) {
    result[regime.id] = sum(
      daily.map((row, index) =>
        row.date >= regime.start && row.date <= regime.end ? row.equity[k]! - equityBefore(daily, index, k) : 0
      )
    );
  }

  result.DD15 = sum(
    daily.map((row, index) => (labels[row.index]!.dd15 ? row.equity[k]! - equityBefore(daily, index, k) : 0))
  );
  result.HIVOL = sum(
    daily.map((row, index) => (labels[row.index]!.hiVol ? row.equity[k]! - equityBefore(daily, index, k) : 0))
  );

  return result;
};

export const isReversalCapture = (trade: TradeRecord) => !trade.finalDecisionDip;
export const priceImprovement = (trade: TradeRecord) =>
  (trade.benchmarkPrice - trade.entryPrice) / trade.benchmarkPrice;

export const runMetrics = (
  meta: RunMeta,
  result: RunResult,
  k: number,
  labels: SessionLabels[],
  slices: { devEnd: string; forwardStart: string }
): RunMetrics => {
  const { trades, daily } = result;
  const closed = trades.filter((trade) => trade.exitReason !== 'open');
  const nets = trades.map((trade) => trade.net[k]!);
  const closedNets = closed.map((trade) => trade.net[k]!);
  const last = daily.at(-1)!;
  const net = last.equity[k]!;
  const best = nets.length ? Math.max(...nets) : 0;
  const reversal = trades.filter(isReversalCapture);
  const same = trades.filter((trade) => !isReversalCapture(trade));
  const premature = same.filter((trade) => trade.benchmarkPrice < trade.entryPrice && trade.net[k]! < 0);
  const rising = trades.filter((trade) => trade.entrySessionClose > trade.entryPrice);
  const falling = trades.filter((trade) => !(trade.entrySessionClose > trade.entryPrice));
  const devRows = daily.filter((row) => row.date <= slices.devEnd);
  const forwardStart = daily.findIndex((row) => row.date >= slices.forwardStart);

  return {
    ...meta,
    costBps: result.costsBps[k]!,
    firstDate: daily[0]!.date,
    lastDate: last.date,
    sessions: daily.length,
    trades: trades.length,
    closedTrades: closed.length,
    openAtEnd: trades.length > closed.length,
    net,
    grossPriceProfit: sum(trades.map((trade) => trade.grossProfit)),
    interest: sum(trades.map((trade) => trade.interest)),
    fees: sum(trades.map((trade) => trade.fees[k]!)),
    turnover: sum(trades.map((trade) => trade.investment + trade.shares * trade.exitPrice)),
    winRate: closed.length ? closedNets.filter((value) => value > 0).length / closed.length : NaN,
    meanTradeNet: mean(nets),
    medianTradeNet: median(nets),
    p10TradeNet: quantile(nets, 0.1),
    p90TradeNet: quantile(nets, 0.9),
    maxTradeLoss: nets.length ? Math.min(...nets) : 0,
    bestTrade: best,
    netExBestTrade: net - best,
    minuteDrawdown: result.minuteDrawdown[k]!.maximumDrawdown,
    minuteDrawdownPeak: formatTime(result.minuteDrawdown[k]!.peakTimestamp),
    minuteDrawdownTrough: formatTime(result.minuteDrawdown[k]!.troughTimestamp),
    dailyDrawdown: result.dailyDrawdown[k]!.maximumDrawdown,
    dailyDrawdownPeak: formatTime(result.dailyDrawdown[k]!.peakTimestamp).slice(0, 10),
    dailyDrawdownTrough: formatTime(result.dailyDrawdown[k]!.troughTimestamp).slice(0, 10),
    exposureSessions: daily.filter((row) => row.held).length,
    exposureShare: daily.filter((row) => row.held).length / daily.length,
    minutesHeld: sum(trades.map((trade) => trade.minutesHeld)),
    meanCalendarDays: mean(trades.map((trade) => trade.calendarDays)),
    medianCalendarDays: median(trades.map((trade) => trade.calendarDays)),
    meanSessionsHeld: mean(trades.map((trade) => trade.sessionsHeld)),
    sameSessionExits: trades.filter((trade) => trade.isSameSession).length,
    intrasessionStopExits: trades.filter((trade) => trade.isIntrasessionStop).length,
    exitTrailingStop: trades.filter((trade) => trade.exitReason === 'trailing stop').length,
    exitTrailingStopGap: trades.filter((trade) => trade.exitReason === 'trailing stop gap').length,
    exitMaximumHold: trades.filter((trade) => trade.exitReason === 'maximum hold').length,
    noFill: result.entriesWithoutTrade,
    blockedCandidates: sum(result.diagnostics.map((row) => row.blocked)),
    sessionsWithBlockedCandidate: result.diagnostics.filter((row) => row.blocked > 0).length,
    setupSessionsWithoutEntry: result.diagnostics.filter((row) => row.setupBarIndex >= 0 && !row.entered).length,
    restrictions: result.episodes.length,
    lowerPriceReentries: result.episodes.filter((row) => row.resolution === 'lower_price_reentry').length,
    recoveryResets: result.episodes.filter((row) => row.resolution === 'recovery_reset').length,
    reversalCaptures: reversal.length,
    reversalCaptureNet: sum(reversal.map((trade) => trade.net[k]!)),
    sameOpportunity: same.length,
    sameOpportunityNet: sum(same.map((trade) => trade.net[k]!)),
    meanPriceImprovement: finiteMean(same.map(priceImprovement)),
    prematureContinuedSelling: premature.length,
    prematureContinuedSellingNet: sum(premature.map((trade) => trade.net[k]!)),
    risingPathTrades: rising.length,
    risingPathNet: sum(rising.map((trade) => trade.net[k]!)),
    fallingPathTrades: falling.length,
    fallingPathNet: sum(falling.map((trade) => trade.net[k]!)),
    devNet: devRows.at(-1)?.equity[k] ?? NaN,
    devMinuteDrawdown: devRows.at(-1)?.minuteDrawdownToDate[k] ?? NaN,
    forwardContinuousNet: forwardStart >= 0 ? net - equityBefore(daily, forwardStart, k) : NaN,
    years: yearChanges(daily, k),
    regimes: regimeChanges(daily, k, labels)
  };
};

// ---- Paired comparisons ----------------------------------------------------------------------------

export type EpisodeType =
  | 'VARIANT_ENTRY_REVERSAL' // the variant enters on a session whose final decision doesn't qualify
  | 'VARIANT_ENTRY_OTHER' // the variant enters; the reference could have qualified at the close but didn't enter
  | 'REFERENCE_ENTRY_ONLY' // the reference enters and the variant doesn't (avoided or missed exposure)
  | 'BOTH_ENTER_EARLIER_LOWER' // both enter; the variant's fill is lower
  | 'BOTH_ENTER_EARLIER_HIGHER' // both enter; the variant's fill is higher (bought before further selling)
  | 'EXIT_DIFFERENCE' // the same position exits differently (stop models)
  | 'OTHER';

export interface DivergenceEpisode {
  startIndex: number;
  endIndex: number;
  startDate: string;
  endDate: string;
  sessions: number;
  contribution: number;
  type: EpisodeType;
  band: Band | '';
  variantTrades: number[];
  referenceTrades: number[];
}

export interface Paired {
  window: string;
  variant: string;
  reference: string;
  stopFill: string;
  costBps: number;
  deltaNet: number;
  deltaMinuteDrawdown: number;
  deltaDailyDrawdown: number;
  variantMinuteDrawdown: number;
  deltaTrades: number;
  deltaInterest: number;
  deltaFees: number;
  deltaExposureSessions: number;
  yearDeltas: Record<string, number>;
  yearsPositive: number;
  yearsNegative: number;
  yearsTotal: number;
  bestYear: string;
  deltaExBestYear: number;
  episodes: DivergenceEpisode[];
  firstDivergence: DivergenceEpisode | undefined;
  largestPositive: DivergenceEpisode | undefined;
  largestNegative: DivergenceEpisode | undefined;
  deltaExLargestPositiveEpisode: number;
  // Δ net minus the sum of all episode contributions: rounding from non-divergent sessions only.
  decompositionResidual: number;
  byType: Record<string, { count: number; sum: number }>;
  byBand: Record<string, { count: number; sum: number }>;
  avoidedReferenceTrades: number;
  avoidedReferenceNet: number;
  devDelta: number;
  forwardContinuousDelta: number;
  regimeDeltas: Record<string, number>;
}

const tradesBySession = (trades: TradeRecord[], key: 'entryIndex' | 'exitIndex') => {
  const map = new Map<number, TradeRecord>();

  for (const trade of trades) {
    map.set(trade[key], trade);
  }

  return map;
};

export const pairedComparison = (
  meta: { window: string; variant: string; reference: string; stopFill: string },
  variant: RunResult,
  reference: RunResult,
  variantMetrics: RunMetrics,
  referenceMetrics: RunMetrics,
  k: number,
  facts: Map<number, SessionFacts>
): Paired => {
  const vDaily = variant.daily;
  const rDaily = reference.daily;

  if (vDaily.length !== rDaily.length || vDaily[0]!.index !== rDaily[0]!.index) {
    throw new Error('Paired runs must cover the same sessions');
  }

  const vEntries = tradesBySession(variant.trades, 'entryIndex');
  const rEntries = tradesBySession(reference.trades, 'entryIndex');
  const vExits = tradesBySession(variant.trades, 'exitIndex');
  const rExits = tradesBySession(reference.trades, 'exitIndex');
  const episodes: DivergenceEpisode[] = [];
  let current: DivergenceEpisode | undefined;

  const classify = (index: number): { type: EpisodeType; band: Band | '' } => {
    const v = vEntries.get(index);
    const r = rEntries.get(index);

    if (v && r) {
      if (v.entryPrice === r.entryPrice) {
        return { type: 'EXIT_DIFFERENCE', band: v.band };
      }

      return {
        type: v.entryPrice < r.entryPrice ? 'BOTH_ENTER_EARLIER_LOWER' : 'BOTH_ENTER_EARLIER_HIGHER',
        band: v.band
      };
    }

    if (v) {
      return { type: facts.get(index)?.finalDip ? 'VARIANT_ENTRY_OTHER' : 'VARIANT_ENTRY_REVERSAL', band: v.band };
    }

    if (r) {
      return { type: 'REFERENCE_ENTRY_ONLY', band: r.band };
    }

    if (vExits.get(index) || rExits.get(index)) {
      const trade = vExits.get(index) ?? rExits.get(index)!;

      return { type: 'EXIT_DIFFERENCE', band: trade.band };
    }

    return { type: 'OTHER', band: '' };
  };

  vDaily.forEach((vRow, position) => {
    const rRow = rDaily[position]!;
    const vChange = vRow.equity[k]! - equityBefore(vDaily, position, k);
    const rChange = rRow.equity[k]! - equityBefore(rDaily, position, k);
    // Equal states with equity changes that differ only by floating-point rounding (the realized totals
    // differ, so the same mark is added to different sums) are not a divergence.
    const divergent = vRow.signature !== rRow.signature || Math.abs(vChange - rChange) > 1e-6;

    if (divergent) {
      if (!current) {
        current = {
          startIndex: vRow.index,
          endIndex: vRow.index,
          startDate: vRow.date,
          endDate: vRow.date,
          sessions: 0,
          contribution: 0,
          ...classify(vRow.index),
          variantTrades: [],
          referenceTrades: []
        };
        episodes.push(current);
      }

      current.endIndex = vRow.index;
      current.endDate = vRow.date;
      current.sessions++;
      current.contribution += vChange - rChange;
    } else {
      current = undefined;
    }
  });

  for (const episode of episodes) {
    const overlaps = (trade: TradeRecord) =>
      trade.entryIndex <= episode.endIndex && (trade.exitIndex < 0 || trade.exitIndex >= episode.startIndex);

    episode.variantTrades = variant.trades.filter(overlaps).map((trade) => trade.id);
    episode.referenceTrades = reference.trades.filter(overlaps).map((trade) => trade.id);
  }

  const deltaNet = variantMetrics.net - referenceMetrics.net;
  const yearDeltas: Record<string, number> = {};

  for (const year of Object.keys(referenceMetrics.years)) {
    yearDeltas[year] = (variantMetrics.years[year] ?? 0) - referenceMetrics.years[year]!;
  }

  const years = Object.entries(yearDeltas);
  const bestYear = years.reduce((best, entry) => (entry[1] > best[1] ? entry : best), ['', -Infinity] as [
    string,
    number
  ]);
  const sorted = [...episodes].sort((a, b) => b.contribution - a.contribution);
  const largestPositive = sorted[0] && sorted[0].contribution > 0 ? sorted[0] : undefined;
  const largestNegative = sorted.at(-1) && sorted.at(-1)!.contribution < 0 ? sorted.at(-1) : undefined;
  const byType: Paired['byType'] = {};
  const byBand: Paired['byBand'] = {};

  for (const episode of episodes) {
    byType[episode.type] ??= { count: 0, sum: 0 };
    byType[episode.type]!.count++;
    byType[episode.type]!.sum += episode.contribution;
    byBand[episode.band || 'NONE'] ??= { count: 0, sum: 0 };
    byBand[episode.band || 'NONE']!.count++;
    byBand[episode.band || 'NONE']!.sum += episode.contribution;
  }

  const variantEntryDates = new Set(variant.trades.map((trade) => trade.entryIndex));
  const avoided = reference.trades.filter((trade) => !variantEntryDates.has(trade.entryIndex));
  const regimeDeltas: Record<string, number> = {};

  for (const key of Object.keys(referenceMetrics.regimes)) {
    regimeDeltas[key] = variantMetrics.regimes[key]! - referenceMetrics.regimes[key]!;
  }

  return {
    ...meta,
    costBps: variant.costsBps[k]!,
    deltaNet,
    deltaMinuteDrawdown: variantMetrics.minuteDrawdown - referenceMetrics.minuteDrawdown,
    deltaDailyDrawdown: variantMetrics.dailyDrawdown - referenceMetrics.dailyDrawdown,
    variantMinuteDrawdown: variantMetrics.minuteDrawdown,
    deltaTrades: variantMetrics.trades - referenceMetrics.trades,
    deltaInterest: variantMetrics.interest - referenceMetrics.interest,
    deltaFees: variantMetrics.fees - referenceMetrics.fees,
    deltaExposureSessions: variantMetrics.exposureSessions - referenceMetrics.exposureSessions,
    yearDeltas,
    yearsPositive: years.filter(([, value]) => value > 0).length,
    yearsNegative: years.filter(([, value]) => value < 0).length,
    yearsTotal: years.length,
    bestYear: bestYear[0],
    deltaExBestYear: deltaNet - Math.max(0, bestYear[1]),
    episodes,
    firstDivergence: episodes[0],
    largestPositive,
    largestNegative,
    deltaExLargestPositiveEpisode: deltaNet - (largestPositive?.contribution ?? 0),
    decompositionResidual: deltaNet - episodes.reduce((total, episode) => total + episode.contribution, 0),
    byType,
    byBand,
    avoidedReferenceTrades: avoided.length,
    avoidedReferenceNet: sum(avoided.map((trade) => trade.net[k]!)),
    devDelta: variantMetrics.devNet - referenceMetrics.devNet,
    forwardContinuousDelta: variantMetrics.forwardContinuousNet - referenceMetrics.forwardContinuousNet,
    regimeDeltas
  };
};

// ---- Band diagnostics (Phase 3A) -------------------------------------------------------------------

export interface BandRow {
  window: string;
  policy: string;
  stopMode: string;
  stopFill: string;
  costBps: number;
  band: Band;
  setups: number;
  entries: number;
  sample: 'no sample' | 'insufficient sample' | 'ok';
  unfilled: number;
  blockedCandidates: number;
  setupWithoutEntry: number;
  missedDipAndRecovery: number;
  meanDecisionMinutesAfterOpen: number;
  meanPriceImprovement: number;
  reversalCaptures: number;
  wins: number;
  losses: number;
  winRate: number;
  net: number;
  meanNet: number;
  medianNet: number;
  worstNet: number;
  meanCalendarDays: number;
  meanWorstMark: number;
  worstMark: number;
  sameSessionExits: number;
  restrictionsCreated: number;
  followedByLowerPriceReentry: number;
  followedByRecoveryReset: number;
  tradesInMaxMinuteDrawdown: number;
  netInMaxMinuteDrawdown: number;
}

export const bandRows = (
  meta: RunMeta,
  result: RunResult,
  k: number,
  facts: Map<number, SessionFacts>,
  sessions: readonly MarketSession[]
): BandRow[] => {
  const episodeByExit = new Map(result.episodes.map((episode) => [episode.exitIndex, episode]));
  const drawdown = result.minuteDrawdown[k]!;

  return bands.map((band) => {
    const trades = result.trades.filter((trade) => trade.band === band);
    const nets = trades.map((trade) => trade.net[k]!);
    const setups = result.diagnostics.filter((row) => row.setupBand === band);
    const closed = trades.filter((trade) => trade.exitReason !== 'open');
    const inDrawdown = trades.filter(
      (trade) =>
        trade.entryTime <= drawdown.troughTimestamp &&
        (trade.exitReason === 'open' || trade.exitTime >= drawdown.peakTimestamp)
    );
    const restricted = trades.filter((trade) => trade.createdRestriction);

    return {
      ...meta,
      costBps: result.costsBps[k]!,
      band,
      setups: setups.length,
      entries: trades.length,
      sample: trades.length === 0 ? 'no sample' : trades.length < 10 ? 'insufficient sample' : 'ok',
      unfilled: setups.filter((row) => row.unfilled).length,
      blockedCandidates: sum(setups.map((row) => row.blocked)),
      setupWithoutEntry: setups.filter((row) => !row.entered).length,
      missedDipAndRecovery: setups.filter((row) => !row.entered && !facts.get(row.index)?.finalDip).length,
      meanDecisionMinutesAfterOpen: mean(
        trades.map((trade) => (trade.decisionTime - sessions[trade.entryIndex]!.openTime) / secondsPerMinute)
      ),
      meanPriceImprovement: finiteMean(trades.map(priceImprovement)),
      reversalCaptures: trades.filter(isReversalCapture).length,
      wins: closed.filter((trade) => trade.net[k]! > 0).length,
      losses: closed.filter((trade) => trade.net[k]! <= 0).length,
      winRate: closed.length ? closed.filter((trade) => trade.net[k]! > 0).length / closed.length : NaN,
      net: sum(nets),
      meanNet: mean(nets),
      medianNet: median(nets),
      worstNet: nets.length ? Math.min(...nets) : NaN,
      meanCalendarDays: mean(trades.map((trade) => trade.calendarDays)),
      meanWorstMark: mean(trades.map((trade) => trade.worstMark)),
      worstMark: trades.length ? Math.min(...trades.map((trade) => trade.worstMark)) : NaN,
      sameSessionExits: trades.filter((trade) => trade.isSameSession).length,
      restrictionsCreated: restricted.length,
      followedByLowerPriceReentry: restricted.filter(
        (trade) => episodeByExit.get(trade.exitIndex)?.resolution === 'lower_price_reentry'
      ).length,
      followedByRecoveryReset: restricted.filter(
        (trade) => episodeByExit.get(trade.exitIndex)?.resolution === 'recovery_reset'
      ).length,
      tradesInMaxMinuteDrawdown: inDrawdown.length,
      netInMaxMinuteDrawdown: sum(inDrawdown.map((trade) => trade.net[k]!))
    };
  });
};

export interface BandSliceRow {
  window: string;
  policy: string;
  stopMode: string;
  stopFill: string;
  slice: string; // a year or a regime
  band: Band;
  entries: number;
  net: number;
}

export const bandSlices = (meta: RunMeta, result: RunResult, k: number, labels: SessionLabels[]): BandSliceRow[] => {
  const rows: BandSliceRow[] = [];
  const years = [...new Set(result.daily.map((row) => yearOf(row.date)))];
  const slices: { slice: string; test: (trade: TradeRecord) => boolean }[] = [
    ...years.map((year) => ({ slice: year, test: (trade: TradeRecord) => yearOf(trade.entryDate) === year })),
    ...regimes.map((regime) => ({
      slice: regime.id,
      test: (trade: TradeRecord) => trade.entryDate >= regime.start && trade.entryDate <= regime.end
    })),
    { slice: 'DD15', test: (trade: TradeRecord) => labels[trade.entryIndex]!.dd15 },
    { slice: 'HIVOL', test: (trade: TradeRecord) => labels[trade.entryIndex]!.hiVol }
  ];

  for (const { slice, test } of slices) {
    for (const band of bands) {
      const trades = result.trades.filter((trade) => trade.band === band && test(trade));

      rows.push({ ...meta, slice, band, entries: trades.length, net: sum(trades.map((trade) => trade.net[k]!)) });
    }
  }

  return rows;
};

// ---- Missed opportunities of the incumbent ---------------------------------------------------------

export const missedOpportunities = (reference: RunResult, facts: Map<number, SessionFacts>) => {
  const rows = reference.daily.map((row, position) => {
    const previous = reference.daily[position - 1];
    const flatAtStart = !previous || previous.signature.startsWith('flat');
    const unrestrictedAtStart = !previous || previous.signature.endsWith('|-');
    const fact = facts.get(row.index)!;

    return { row, flatAtStart, unrestrictedAtStart, fact };
  });
  const missed = rows.filter(
    ({ flatAtStart, fact }) => flatAtStart && !Number.isNaN(fact.firstDip0935Time) && !fact.finalDip
  );
  const count = (filter: (item: (typeof rows)[number]) => boolean) => missed.filter(filter).length;

  return {
    sessionsFlatAtStart: rows.filter((item) => item.flatAtStart).length,
    intradayDipSessionsFlat: rows.filter((item) => item.flatAtStart && !Number.isNaN(item.fact.firstDip0935Time))
      .length,
    closeDipSessionsFlat: rows.filter((item) => item.flatAtStart && item.fact.finalDip).length,
    missedDipAndRecovery: missed.length,
    missedDipAndRecoveryUnrestricted: count((item) => item.unrestrictedAtStart),
    missedFrom1000: count((item) => !Number.isNaN(item.fact.firstDip1000Time)),
    byFirstBand: Object.fromEntries(bands.map((band) => [band, count((item) => item.fact.firstDip0935Band === band)])),
    byMaxDepthBand: Object.fromEntries(bands.map((band) => [band, count((item) => item.fact.maxDepthBand === band)])),
    byYear: Object.fromEntries(
      [...new Set(missed.map((item) => yearOf(item.row.date)))].map((year) => [
        year,
        count((item) => yearOf(item.row.date) === year)
      ])
    )
  };
};

// ---- Predeclared classification (PROTOCOL.md §10) --------------------------------------------------

export interface Classification {
  subject: string;
  reference: string;
  window: string;
  O: boolean;
  E: boolean;
  Rp: boolean;
  category: 'supports further optimization' | 'inconclusive' | 'argues against';
  deltaNetStop: number;
  deltaNetNextOpen: number;
  deltaMinuteDrawdownStop: number;
  deltaMinuteDrawdownNextOpen: number;
  minuteDrawdownStop: number;
  minuteDrawdownNextOpen: number;
  disclosures: string[];
  reasons: string[];
}

export const classify = (
  subject: string,
  reference: string,
  window: string,
  pairs: { stop: Paired; nextOpen: Paired },
  // Whether O holds, decided by the caller (entries and stop models define it differently), and its evidence.
  opportunity: { holds: boolean; evidence: string },
  ensemble: { median: number; positiveShare: number } | undefined
): Classification => {
  const { stop, nextOpen } = pairs;
  const O = opportunity.holds;
  const E =
    stop.deltaNet >= materialProfit &&
    nextOpen.deltaNet >= materialProfit &&
    stop.deltaMinuteDrawdown <= materialDrawdown &&
    nextOpen.deltaMinuteDrawdown <= materialDrawdown &&
    stop.variantMinuteDrawdown < minuteDrawdownGate &&
    nextOpen.variantMinuteDrawdown < minuteDrawdownGate;
  const Rp =
    stop.yearsPositive >= 6 &&
    stop.deltaExLargestPositiveEpisode > 0 &&
    stop.deltaExBestYear > 0 &&
    ensemble !== undefined &&
    ensemble.median > 0 &&
    ensemble.positiveShare >= 0.6;
  const against =
    (stop.deltaNet <= 0 && nextOpen.deltaNet <= 0) ||
    stop.variantMinuteDrawdown >= minuteDrawdownGate ||
    nextOpen.variantMinuteDrawdown >= minuteDrawdownGate ||
    (stop.deltaMinuteDrawdown > materialDrawdown && nextOpen.deltaMinuteDrawdown > materialDrawdown);
  const disclosures: string[] = [];

  for (const [label, pair] of [
    ['stop', stop],
    ['next-open', nextOpen]
  ] as const) {
    if (pair.deltaNet < materialProfit) {
      disclosures.push(`Δnet < $5,000 (${label})`);
    }

    if (pair.deltaMinuteDrawdown > materialDrawdown) {
      disclosures.push(`minute DD worse by > $5,000 (${label})`);
    }

    if (pair.variantMinuteDrawdown >= minuteDrawdownGate) {
      disclosures.push(`minute DD ≥ $30,000 (${label})`);
    }
  }

  const reasons = [
    `O ${O ? 'yes' : 'no'} (${opportunity.evidence})`,
    `E ${E ? 'yes' : 'no'}`,
    `Rp ${Rp ? 'yes' : 'no'} (${stop.yearsPositive}/${stop.yearsTotal} years, ex-episode $${Math.round(stop.deltaExLargestPositiveEpisode)}, ex-year $${Math.round(stop.deltaExBestYear)}, ensemble ${ensemble ? `median $${Math.round(ensemble.median)}, ${Math.round(ensemble.positiveShare * 100)}% positive` : 'n/a'})`
  ];

  return {
    subject,
    reference,
    window,
    O,
    E,
    Rp,
    category: O && E && Rp ? 'supports further optimization' : against ? 'argues against' : 'inconclusive',
    deltaNetStop: stop.deltaNet,
    deltaNetNextOpen: nextOpen.deltaNet,
    deltaMinuteDrawdownStop: stop.deltaMinuteDrawdown,
    deltaMinuteDrawdownNextOpen: nextOpen.deltaMinuteDrawdown,
    minuteDrawdownStop: stop.variantMinuteDrawdown,
    minuteDrawdownNextOpen: nextOpen.variantMinuteDrawdown,
    disclosures,
    reasons
  };
};
