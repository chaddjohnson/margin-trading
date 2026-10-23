// Metrics of a run: the headline summary of either mode, per-symbol attribution, refusals with their hypothetical
// counterfactuals, year and month series, trade records, and the closest approaches to a call.
import { type Sym, combinationKey, formatDate, formatTime, protocol, symbols } from './context.ts';
import type { Approach, DailyRow, RunResult } from './engine.ts';
import type { RealLot } from './ledger.ts';
import { type BalanceSheet, type ScheduleKey, distanceOf, fundedBreakEven, homogeneousBreakEven } from './margin.ts';

export const csvValue = (value: unknown) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : value > 0 ? 'Infinity' : value < 0 ? '-Infinity' : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows: Record<string, unknown>[], columns = rows.length ? Object.keys(rows[0]!) : []) =>
  `${[columns.join(','), ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(','))].join('\n')}\n`;

const days = (from: number, to: number) => (to - from) / 86400;

const anySessionTime = (result: RunResult, index: number) =>
  Object.values(result.universe.instruments)[0]!.ds.sTime[index]!;

export const lotDays = (result: RunResult, lot: RealLot) =>
  days(lot.entryTimestamp, anySessionTime(result, lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex));

export interface Attribution {
  symbol: Sym;
  phenotype: string;
  virtualTrades: number;
  virtualNetPer100k: number; // the standalone book's own net (hypothetical when unfunded)
  funded: number;
  fundedOpen: number;
  wins: number;
  losses: number;
  net: number;
  realized: number;
  unrealized: number;
  interest: number;
  averagePrincipal: number;
  borrowingDollarDays: number;
  refusedSignals: number;
  refusedVirtualTrades: number;
  refusedNetPer100k: number; // hypothetical
  refusedNetAtWouldBePrincipal: number; // hypothetical
}

export const attribution = (result: RunResult): Attribution[] =>
  result.config.symbols.map((symbol) => {
    const trades = result.trades.filter((trade) => trade.symbol === symbol);
    const lots = result.lots.filter((lot) => lot.symbol === symbol);
    const refusedSignals = result.signals.filter((signal) => signal.symbol === symbol && signal.outcome === 'refused');
    const refusedTrades = refusedSignals.filter((signal) => signal.trade);
    const scale = (signal: (typeof refusedSignals)[number]) =>
      Number.isFinite(signal.principal) ? signal.principal / protocol.notional : NaN;

    return {
      symbol,
      phenotype: result.config.phenotypes[symbol].name,
      virtualTrades: trades.length,
      virtualNetPer100k: trades.reduce((total, trade) => total + trade.net, 0),
      funded: lots.length,
      fundedOpen: lots.filter((lot) => lot.exitIndex < 0).length,
      wins: lots.filter((lot) => lot.exitIndex >= 0 && lot.net > 0).length,
      losses: lots.filter((lot) => lot.exitIndex >= 0 && lot.net <= 0).length,
      net: lots.reduce((total, lot) => total + lot.net, 0),
      realized: lots.filter((lot) => lot.exitIndex >= 0).reduce((total, lot) => total + lot.net, 0),
      unrealized: lots.filter((lot) => lot.exitIndex < 0).reduce((total, lot) => total + lot.net, 0),
      interest: lots.reduce((total, lot) => total + lot.interest, 0),
      averagePrincipal: lots.length ? lots.reduce((total, lot) => total + lot.originalPrincipal, 0) / lots.length : 0,
      borrowingDollarDays: lots.reduce((total, lot) => total + lot.originalPrincipal * lotDays(result, lot), 0),
      refusedSignals: refusedSignals.reduce((total, signal) => total + 1 + signal.repeatedRefusals, 0),
      refusedVirtualTrades: refusedTrades.length,
      refusedNetPer100k: refusedTrades.reduce((total, signal) => total + signal.trade!.net, 0),
      refusedNetAtWouldBePrincipal: refusedTrades.reduce(
        (total, signal) => total + signal.trade!.net * scale(signal),
        0
      )
    };
  });

export const sessionsHeld = (result: RunResult) => result.daily.filter((row) => row.openLots > 0).length;

export const eligibleSessions = (result: RunResult) =>
  result.endIndex - (result.config.eligibilityIndex ?? result.universe.eligibilityIndex) + 1;

export interface Summary {
  key: string;
  label: string;
  mode: string;
  policy: string;
  configuration: string;
  books: string;
  phenotypes: string;
  start: string;
  end: string;
  sessions: number;
  virtualTrades: number;
  fundedLots: number;
  closed: number;
  openAtEnd: number;
  wins: number;
  losses: number;
  realized: number;
  unrealized: number;
  net: number;
  gross: number;
  interest: number;
  bestTrade: number;
  worstTrade: number;
  worstAdverseExcursion: number;
  signalsGranted: number;
  signalsRefused: number;
  refusedVirtualTrades: number;
  refusedNetPer100k: number;
  refusedNetAtWouldBePrincipal: number;
  sameMinuteDecisions: number;
  sessionsHeld: number;
  exposure: number; // share of eligible sessions with a funded lot at the close
  minutesHeld: number;
  borrowingDollarDays: number;
  averagePrincipal: number;
  maximumPrincipal: number;
  utilization: number; // fixed: Σ principal × days ÷ (pool × eligible days); portfolio: borrowing ÷ (f × equity)-days
  fundedBySymbol: string;
  netBySymbol: string;
  dailyDrawdown: number;
  dailyDrawdownPercent: number;
  dailyDrawdownPeak: string;
  dailyDrawdownTrough: string;
  dailyDrawdownRecovery: string;
  minuteDrawdown: number;
  minuteDrawdownPercent: number;
  minuteDrawdownPeak: string;
  minuteDrawdownTrough: string;
  // portfolio only
  startEquity: number;
  endEquity: number;
  totalReturn: number;
  cagr: number;
  spanYears: number;
  strategyDailyDrawdown: number;
  strategyMinuteDrawdown: number;
  maxGrossExposure: number;
  maxGrossExposureDate: string;
  maxDebtToEquity: number;
  minEquityToLmvDaily: number;
  minEquityToLmvDailyDate: string;
  minEquityToLmvMinute: number;
  minEquityToLmvMinuteTime: string;
  dividends: number;
  lotDividends: number;
  coreTurnover: number;
  forcedSales: number;
  calls: number;
  finalVoogShare: number;
  finalVgtShare: number; // core + lots, share of LMV
  maxSectorShare: number; // VGT + sector lots, share of LMV
  maxSingleSecurityShare: number;
  maxSingleSecurityShareDate: string;
  reservationsAtEnd: number;
  minRatio: Partial<Record<ScheduleKey, number>>;
  minRatioTime: Partial<Record<ScheduleKey, string>>;
  minDailyRatio: Partial<Record<ScheduleKey, number>>;
  minExcess: Partial<Record<ScheduleKey, number>>;
  minExcessTime: Partial<Record<ScheduleKey, string>>;
  minutesBelowWarning: Partial<Record<ScheduleKey, number>>;
  minutesBelowCritical: Partial<Record<ScheduleKey, number>>;
  marginMarks: number;
  virtualSignature: string;
}

// A short, order-sensitive signature of the books' virtual trades (identical decision state across modes).
export const virtualSignature = (result: RunResult) => {
  let hash = 0;
  const text = result.trades
    .map(
      (trade) =>
        `${trade.symbol}:${trade.entryIndex}:${trade.entryBar}:${trade.exitIndex}:${trade.exitBar}:${trade.exitReason}`
    )
    .join('|');

  for (let i = 0; i < text.length; i++) {
    hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const summarize = (result: RunResult): Summary => {
  const { config, daily, lots } = result;
  const isPortfolio = config.mode === 'portfolio';
  const closed = lots.filter((lot) => lot.exitIndex >= 0);
  const open = lots.filter((lot) => lot.exitIndex < 0);
  const first = daily[0]!;
  const last = daily.at(-1)!;
  const startEquity = isPortfolio ? config.initial.voog + config.initial.vgt : 0;
  const spanYears = days(anySessionTime(result, 0), anySessionTime(result, result.endIndex)) / 365.25;
  const byDate = (pick: (row: DailyRow) => number, better: (a: number, b: number) => boolean) => {
    let best = daily[0]!;

    for (const row of daily) {
      if (better(pick(row), pick(best))) {
        best = row;
      }
    }

    return best;
  };
  const maxGross = isPortfolio
    ? byDate(
        (row) => row.grossExposure,
        (a, b) => a > b
      )
    : first;
  const minEqLmv = isPortfolio
    ? byDate(
        (row) => row.equityToLmv,
        (a, b) => a < b
      )
    : first;
  const share = (row: DailyRow) => {
    const values = [row.mv.VOOG, row.mv.VGT, row.mv.XBI, row.mv.XRT, row.mv.KRE];

    return row.lmv > 0 ? Math.max(...values) / row.lmv : 0;
  };
  const maxShare = isPortfolio ? byDate(share, (a, b) => a > b) : first;
  const eligibleDays = days(
    anySessionTime(result, config.eligibilityIndex ?? result.universe.eligibilityIndex),
    anySessionTime(result, result.endIndex)
  );
  const dollarDays = lots.reduce((total, lot) => total + lot.originalPrincipal * lotDays(result, lot), 0);
  const capacityDays = isPortfolio
    ? daily
        .filter((row) => row.index >= (config.eligibilityIndex ?? result.universe.eligibilityIndex))
        .reduce((total, row, index, rows) => {
          const next = rows[index + 1];

          return next
            ? total +
                config.fraction *
                  row.equity *
                  days(anySessionTime(result, row.index), anySessionTime(result, next.index))
            : total;
        }, 0)
    : config.fixedPrincipal * eligibleDays;
  const schedules = Object.keys(result.minimum) as ScheduleKey[];
  const record = <T>(pick: (schedule: ScheduleKey) => T) =>
    Object.fromEntries(schedules.map((schedule) => [schedule, pick(schedule)])) as Partial<Record<ScheduleKey, T>>;
  const attributionRows = attribution(result);
  const refusedTrades = result.signals.filter((signal) => signal.outcome === 'refused' && signal.trade);

  return {
    key: config.key,
    label: config.label,
    mode: config.mode,
    policy: config.policy,
    configuration:
      config.symbols.length === 4 ? combinationKey(config.combination) : config.symbols.join('+') || 'none',
    books: config.symbols.join('+'),
    phenotypes: config.symbols.map((symbol) => `${symbol} ${config.phenotypes[symbol].name}`).join('; '),
    start: result.universe.dates[0]!,
    end: result.universe.dates[result.endIndex]!,
    sessions: result.endIndex + 1,
    virtualTrades: result.trades.length,
    fundedLots: lots.length,
    closed: closed.length,
    openAtEnd: open.length,
    wins: closed.filter((lot) => lot.net > 0).length,
    losses: closed.filter((lot) => lot.net <= 0).length,
    realized: closed.reduce((total, lot) => total + lot.net, 0),
    unrealized: open.reduce((total, lot) => total + lot.net, 0),
    net: lots.reduce((total, lot) => total + lot.net, 0),
    gross: lots.reduce((total, lot) => total + lot.gross, 0),
    interest: lots.reduce((total, lot) => total + lot.interest, 0),
    bestTrade: Math.max(0, ...lots.map((lot) => lot.net)),
    worstTrade: Math.min(0, ...lots.map((lot) => lot.net)),
    worstAdverseExcursion: Math.min(0, ...lots.map((lot) => lot.worstMark)),
    signalsGranted: result.signals.filter((signal) => signal.outcome === 'granted').length,
    signalsRefused: result.signals.reduce(
      (total, signal) => total + (signal.outcome === 'refused' ? 1 + signal.repeatedRefusals : 0),
      0
    ),
    refusedVirtualTrades: refusedTrades.length,
    refusedNetPer100k: refusedTrades.reduce((total, signal) => total + signal.trade!.net, 0),
    refusedNetAtWouldBePrincipal: refusedTrades.reduce(
      (total, signal) => total + (signal.trade!.net * signal.principal) / protocol.notional,
      0
    ),
    sameMinuteDecisions: result.signals.filter((signal) => signal.sameMinuteCandidates > 1).length,
    sessionsHeld: sessionsHeld(result),
    exposure: sessionsHeld(result) / eligibleSessions(result),
    minutesHeld: lots.reduce((total, lot) => total + lot.heldMarks, 0),
    borrowingDollarDays: dollarDays,
    averagePrincipal: lots.length ? lots.reduce((total, lot) => total + lot.originalPrincipal, 0) / lots.length : 0,
    maximumPrincipal: Math.max(0, ...lots.map((lot) => lot.originalPrincipal)),
    utilization: capacityDays > 0 ? dollarDays / capacityDays : 0,
    fundedBySymbol: attributionRows.map((row) => `${row.symbol} ${row.funded}`).join('; '),
    netBySymbol: attributionRows.map((row) => `${row.symbol} ${Math.round(row.net)}`).join('; '),
    dailyDrawdown: result.dailyDrawdown.maximum,
    dailyDrawdownPercent: isPortfolio
      ? result.dailyDrawdown.maximumPercent
      : result.dailyDrawdown.maximum / config.fixedPrincipal,
    dailyDrawdownPeak: formatDate(result.dailyDrawdown.peakTime),
    dailyDrawdownTrough: formatDate(result.dailyDrawdown.troughTime),
    dailyDrawdownRecovery: formatDate(result.dailyDrawdown.recoveryTime),
    minuteDrawdown: result.minuteDrawdown.maximum,
    minuteDrawdownPercent: isPortfolio
      ? result.minuteDrawdown.maximumPercent
      : result.minuteDrawdown.maximum / config.fixedPrincipal,
    minuteDrawdownPeak: formatTime(result.minuteDrawdown.peakTime),
    minuteDrawdownTrough: formatTime(result.minuteDrawdown.troughTime),
    startEquity,
    endEquity: last.equity,
    totalReturn: isPortfolio ? last.equity / startEquity - 1 : NaN,
    cagr: isPortfolio ? (last.equity / startEquity) ** (1 / spanYears) - 1 : NaN,
    spanYears,
    strategyDailyDrawdown: result.strategyDailyDrawdown.maximum,
    strategyMinuteDrawdown: result.strategyMinuteDrawdown.maximum,
    maxGrossExposure: isPortfolio ? maxGross.grossExposure : NaN,
    maxGrossExposureDate: isPortfolio ? maxGross.date : '',
    maxDebtToEquity: isPortfolio ? Math.max(...daily.map((row) => row.debtToEquity)) : NaN,
    minEquityToLmvDaily: isPortfolio ? minEqLmv.equityToLmv : NaN,
    minEquityToLmvDailyDate: isPortfolio ? minEqLmv.date : '',
    minEquityToLmvMinute: isPortfolio ? result.minimum.U35!.ratio * 0.35 : NaN,
    minEquityToLmvMinuteTime: isPortfolio ? formatTime(result.minimum.U35!.time) : '',
    dividends: isPortfolio ? last.cumulativeDividends : 0,
    lotDividends: result.lots.reduce((total, lot) => total + lot.dividends, 0),
    coreTurnover: isPortfolio ? last.coreTurnover : 0,
    forcedSales: result.forcedLiquidations.length,
    calls: result.maintenanceEvents.filter((event) => event.kind === 'call').length,
    finalVoogShare: isPortfolio && last.lmv > 0 ? last.mv.VOOG / last.lmv : NaN,
    finalVgtShare: isPortfolio && last.lmv > 0 ? last.mv.VGT / last.lmv : NaN,
    maxSectorShare: isPortfolio
      ? Math.max(
          ...daily.map((row) => (row.lmv > 0 ? (row.mv.VGT + row.mv.XBI + row.mv.XRT + row.mv.KRE) / row.lmv : 0))
        )
      : NaN,
    maxSingleSecurityShare: isPortfolio ? share(maxShare) : NaN,
    maxSingleSecurityShareDate: isPortfolio ? maxShare.date : '',
    reservationsAtEnd: result.reservationsAtEnd.length,
    minRatio: record((schedule) => result.minimum[schedule]!.ratio),
    minRatioTime: record((schedule) => formatTime(result.minimum[schedule]!.time)),
    minDailyRatio: record((schedule) => result.minimum[schedule]!.dailyRatio),
    minExcess: record((schedule) => result.minimum[schedule]!.excess),
    minExcessTime: record((schedule) => formatTime(result.minimum[schedule]!.excessTime)),
    minutesBelowWarning: record((schedule) => result.minutesBelow[schedule]!.warning),
    minutesBelowCritical: record((schedule) => result.minutesBelow[schedule]!.critical),
    marginMarks: result.marginMarks,
    virtualSignature: virtualSignature(result)
  };
};

// The flat row of scenario_summary.csv.
export const summaryRow = (summary: Summary) => {
  const {
    minRatio,
    minRatioTime,
    minDailyRatio,
    minExcess,
    minExcessTime,
    minutesBelowWarning,
    minutesBelowCritical,
    ...rest
  } = summary;
  const row: Record<string, unknown> = { ...rest };

  for (const schedule of Object.keys(minRatio) as ScheduleKey[]) {
    row[`min_ratio_${schedule}`] = minRatio[schedule];
    row[`min_ratio_time_${schedule}`] = minRatioTime[schedule];
    row[`min_daily_ratio_${schedule}`] = minDailyRatio[schedule];
    row[`min_excess_${schedule}`] = minExcess[schedule];
    row[`min_excess_time_${schedule}`] = minExcessTime[schedule];
    row[`minutes_below_warning_${schedule}`] = minutesBelowWarning[schedule];
    row[`minutes_below_critical_${schedule}`] = minutesBelowCritical[schedule];
  }

  return row;
};

// ----- series -----

export interface PeriodRow {
  period: string;
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  change: number;
  return: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  realizedInPeriod: number;
  interestInPeriod: number;
  dividendsInPeriod: number;
  lotsOpened: number;
  sessionsHeld: number;
  principalAtEnd: number;
  minEquityToLmv: number;
}

export const periodRows = (result: RunResult, granularity: 'year' | 'month'): PeriodRow[] => {
  const keyOf = (date: string) => (granularity === 'year' ? date.slice(0, 4) : date.slice(0, 7));
  const isPortfolio = result.config.mode === 'portfolio';
  const groups = new Map<string, DailyRow[]>();

  for (const row of result.daily) {
    const key = keyOf(row.date);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(row);
  }

  const rows: PeriodRow[] = [];
  let previous: DailyRow | undefined;
  const startValue = isPortfolio ? result.config.initial.voog + result.config.initial.vgt : 0;

  for (const [period, group] of groups) {
    const start = previous?.equity ?? startValue;
    const end = group.at(-1)!;
    let peak = start;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const row of group) {
      peak = Math.max(peak, row.equity);

      if (peak - row.equity > maxDrawdown) {
        maxDrawdown = peak - row.equity;
        maxDrawdownPercent = peak > 0 ? maxDrawdown / peak : 0;
      }
    }

    rows.push({
      period,
      startDate: group[0]!.date,
      endDate: end.date,
      startValue: start,
      endValue: end.equity,
      change: end.equity - start,
      return: isPortfolio && start > 0 ? end.equity / start - 1 : NaN,
      maxDrawdown,
      maxDrawdownPercent: isPortfolio ? maxDrawdownPercent : maxDrawdown / result.config.fixedPrincipal,
      realizedInPeriod: end.realized - (previous?.realized ?? 0),
      interestInPeriod: end.cumulativeInterest - (previous?.cumulativeInterest ?? 0),
      dividendsInPeriod: end.cumulativeDividends - (previous?.cumulativeDividends ?? 0),
      lotsOpened: result.lots.filter((lot) => keyOf(result.universe.dates[lot.entryIndex]!) === period).length,
      sessionsHeld: group.filter((row) => row.openLots > 0).length,
      principalAtEnd: end.principal,
      minEquityToLmv: isPortfolio ? Math.min(...group.map((row) => row.equityToLmv)) : NaN
    });
    previous = end;
  }

  return rows;
};

// ----- records -----

export const tradeRecords = (result: RunResult) =>
  result.lots.map((lot) => ({
    lot_id: lot.id,
    symbol: lot.symbol,
    phenotype: lot.trade.phenotype,
    slot: lot.slot,
    setup_kind: lot.trade.setupKind,
    setup_id: lot.trade.setupId,
    virtual_trade_id: lot.trade.id,
    decision_date: result.universe.dates[lot.decisionIndex],
    decision_time: formatTime(lot.decisionTime),
    decision_price: lot.decisionPrice,
    equity_at_decision: lot.equityAtDecision,
    fraction: lot.fraction,
    entry_date: result.universe.dates[lot.entryIndex],
    entry_time: formatTime(lot.entryTime),
    entry_execution: lot.entryExecution,
    entry_raw_price: lot.entryRawPrice,
    entry_price: lot.entryPrice,
    shares: lot.shares,
    principal: lot.originalPrincipal,
    exit_date: lot.exitIndex >= 0 ? result.universe.dates[lot.exitIndex] : '',
    exit_time: lot.exitIndex >= 0 ? formatTime(lot.exitTime) : '',
    exit_execution: lot.exitExecution,
    exit_raw_price: lot.exitRawPrice,
    exit_price: lot.exitPrice,
    exit_reason: lot.exitIndex >= 0 ? lot.exitReason : 'open',
    forced: lot.forced,
    hold_days: lotDays(result, lot),
    interest: lot.interest,
    gross: lot.gross,
    net: lot.net,
    is_open: lot.exitIndex < 0,
    worst_mark: lot.worstMark,
    worst_mark_time: formatTime(lot.worstMarkTime),
    dividends_entitled: lot.dividends,
    repaid_by_core: lot.repaidByCore,
    virtual_net_per_100k: lot.trade.net
  }));

export const virtualTradeRecords = (result: RunResult) =>
  result.trades.map((trade) => ({
    symbol: trade.symbol,
    phenotype: trade.phenotype,
    id: trade.id,
    setup_kind: trade.setupKind,
    setup_id: trade.setupId,
    activation_date: result.universe.dates[trade.activationIndex] ?? '',
    activation_price: trade.activationPrice,
    reference_high: trade.referenceHigh,
    decision_date: result.universe.dates[trade.decisionIndex],
    decision_time: formatTime(trade.decisionTime),
    decision_price: trade.decisionPrice,
    carried_overnight: trade.carriedOvernight,
    entry_date: trade.entryIndex >= 0 ? result.universe.dates[trade.entryIndex] : '',
    entry_time: formatTime(trade.entryTime),
    entry_price: trade.entryRawPrice,
    exit_date: trade.exitIndex >= 0 ? result.universe.dates[trade.exitIndex] : '',
    exit_time: formatTime(trade.exitTime),
    exit_price: trade.exitRawPrice,
    exit_reason: trade.exitIndex >= 0 ? trade.exitReason : trade.entryIndex >= 0 ? 'open' : 'pending',
    stop_active_at_exit: trade.stopActiveAtExit,
    interest_per_100k: trade.interest,
    net_per_100k: trade.net,
    allocator: trade.allocator,
    funded_lot_id: trade.fundedLotId > 0 ? trade.fundedLotId : '',
    hypothetical: trade.fundedLotId > 0 ? '' : 'HYPOTHETICAL (unfunded virtual trade)'
  }));

export const signalRecords = (result: RunResult) =>
  result.signals.map((signal) => ({
    symbol: signal.symbol,
    phenotype: signal.phenotype,
    date: signal.date,
    decision_time: formatTime(signal.decisionTime),
    decision_price: signal.decisionPrice,
    setup_id: signal.setupId,
    setup_kind: signal.setupKind,
    outcome: signal.outcome,
    reason: signal.reason,
    repeated_refusals: signal.repeatedRefusals,
    same_minute_candidates: signal.sameMinuteCandidates,
    occupied_by: signal.occupiedBy,
    equity_at_decision: signal.equityAtDecision,
    principal: signal.principal,
    reg_t_maximum: signal.regTMaximum,
    house_maximum: signal.houseMaximum,
    maximum_U50: signal.maximumU50,
    maximum_U60: signal.maximumU60,
    maximum_L60: signal.maximumL60,
    maximum_G60: signal.maximumG60,
    stale_seconds: Object.entries(signal.staleSeconds)
      .map(([security, age]) => `${security}:${age}`)
      .join(' '),
    virtual_trade_id: signal.trade?.id ?? '',
    funded_lot_id: signal.trade && signal.trade.fundedLotId > 0 ? signal.trade.fundedLotId : ''
  }));

// Refusals with their hypothetical counterfactual (the virtual trade the refused signal became).
export const refusalRecords = (result: RunResult) =>
  result.signals
    .filter((signal) => signal.outcome === 'refused')
    .map((signal) => {
      const trade = signal.trade;

      return {
        symbol: signal.symbol,
        phenotype: signal.phenotype,
        date: signal.date,
        decision_time: formatTime(signal.decisionTime),
        decision_price: signal.decisionPrice,
        reason: signal.reason,
        occupied_by: signal.occupiedBy,
        repeated_refusals: signal.repeatedRefusals,
        would_be_principal: signal.principal,
        counterfactual: trade ? 'HYPOTHETICAL' : 'none (the setup was cancelled or held)',
        hypothetical_entry_date: trade && trade.entryIndex >= 0 ? result.universe.dates[trade.entryIndex] : '',
        hypothetical_entry_price: trade?.entryRawPrice ?? '',
        hypothetical_exit_date:
          trade && trade.exitIndex >= 0 ? result.universe.dates[trade.exitIndex] : trade ? 'open at end' : '',
        hypothetical_exit_price: trade?.exitRawPrice ?? '',
        hypothetical_exit_reason: trade ? (trade.exitIndex >= 0 ? trade.exitReason : 'open') : '',
        hypothetical_net_per_100k: trade?.net ?? '',
        hypothetical_net_at_would_be_principal: trade ? (trade.net * signal.principal) / protocol.notional : ''
      };
    });

export const dailyRecords = (result: RunResult) =>
  result.daily.map((row) => {
    const record: Record<string, unknown> = {
      date: row.date,
      equity: row.equity,
      realized: row.realized,
      unrealized: row.unrealized,
      strategy_mark: row.strategyMark,
      principal: row.principal,
      interest_liability: row.interestLiability,
      cumulative_interest: row.cumulativeInterest,
      open_lots: row.openLots,
      owners: row.owners
    };

    if (result.config.mode === 'portfolio') {
      Object.assign(record, {
        voog_close: row.closes.VOOG,
        vgt_close: row.closes.VGT,
        voog_shares: row.voogShares,
        vgt_core_shares: row.vgtCoreShares,
        mv_voog: row.mv.VOOG,
        mv_vgt: row.mv.VGT,
        mv_xbi: row.mv.XBI,
        mv_xrt: row.mv.XRT,
        mv_kre: row.mv.KRE,
        cash: row.cash,
        receivables: row.receivables,
        funding_payable: row.fundingPayable,
        lmv: row.lmv,
        equity_to_lmv: row.equityToLmv,
        debt_to_equity: row.debtToEquity,
        gross_exposure: row.grossExposure,
        cumulative_dividends: row.cumulativeDividends,
        core_turnover: row.coreTurnover
      });
    }

    for (const symbol of symbols) {
      if (result.config.symbols.includes(symbol)) {
        record[`lot_shares_${symbol}`] = row.lotShares[symbol];
        record[`close_${symbol}`] = row.closes[symbol];
      }
    }

    return record;
  });

export const marginRecords = (result: RunResult) =>
  result.daily.map((row) => {
    const record: Record<string, unknown> = {
      date: row.date,
      equity: row.equity,
      lmv: row.lmv,
      debt: row.principal + row.interestLiability + row.fundingPayable,
      borrowed_principal: row.principal,
      // Reg T: the largest new margin purchase the account could make (debt after it ≤ 50% of LMV after it).
      reg_t_buying_power: Math.max(0, row.lmv - 2 * (row.principal + row.interestLiability + row.fundingPayable)),
      equity_to_lmv: row.equityToLmv,
      homogeneous_break_even: row.lmv > 0 ? row.equity / row.lmv : '',
      owners: row.owners,
      voog_share: row.lmv > 0 ? row.mv.VOOG / row.lmv : '',
      vgt_share: row.lmv > 0 ? row.mv.VGT / row.lmv : '',
      sector_group_share: row.lmv > 0 ? (row.mv.VGT + row.mv.XBI + row.mv.XRT + row.mv.KRE) / row.lmv : ''
    };

    for (const schedule of Object.keys(row.required) as ScheduleKey[]) {
      const required = row.required[schedule]!;

      record[`required_${schedule}`] = required;
      record[`excess_${schedule}`] = row.equity - required;
      record[`ratio_${schedule}`] = required > 0 ? row.equity / required : '';
      record[`minute_min_ratio_${schedule}`] = row.minuteMinRatio[schedule] ?? '';
      record[`minutes_below_warning_${schedule}`] = row.minutesBelowWarning[schedule] ?? 0;
      record[`minutes_below_critical_${schedule}`] = row.minutesBelowCritical[schedule] ?? 0;
    }

    return record;
  });

export const ledgerRecords = (result: RunResult) =>
  result.events.map((event) => ({
    seq: event.seq,
    date: event.date,
    time: formatTime(event.time),
    kind: event.kind,
    security: event.security,
    lot_id: event.lotId || '',
    shares: event.shares,
    price: event.price,
    cash_delta: event.cashDelta,
    principal_delta: event.principalDelta,
    voog_shares: event.voog,
    vgt_core_shares: event.vgtCore,
    lot_vgt: event.lotShares.VGT,
    lot_xbi: event.lotShares.XBI,
    lot_xrt: event.lotShares.XRT,
    lot_kre: event.lotShares.KRE,
    cash: event.cash,
    receivables: event.receivables,
    principal: event.principal,
    interest_liability: event.interestLiability,
    funding_payable: event.fundingPayable,
    lmv: event.lmv,
    mv_voog: event.mv.VOOG,
    mv_vgt: event.mv.VGT,
    mv_xbi: event.mv.XBI,
    mv_xrt: event.mv.XRT,
    mv_kre: event.mv.KRE,
    equity: event.equity,
    realized: event.realized,
    note: event.note
  }));

// ----- closest approaches -----

export const sheetOfApproach = (approach: Approach): BalanceSheet => ({
  equity: approach.equity,
  mv: approach.mv,
  funded: new Set(approach.funded),
  debt: approach.debt
});

export const approachRecord = (approach: Approach, rank: number) => {
  const sheet = sheetOfApproach(approach);
  const distance = distanceOf(sheet, approach.schedule);
  const u60 = distanceOf(sheet, 'U60');

  return {
    rank,
    schedule: approach.schedule,
    date: approach.date,
    time: formatTime(approach.time),
    ratio: approach.ratio,
    excess: approach.excess,
    required: approach.required,
    equity: approach.equity,
    lmv: approach.lmv,
    debt: approach.debt,
    equity_to_lmv: approach.lmv > 0 ? approach.equity / approach.lmv : '',
    lots: approach.lots,
    funded: approach.funded.join('+'),
    mv_voog: approach.mv.VOOG,
    mv_vgt: approach.mv.VGT,
    mv_xbi: approach.mv.XBI,
    mv_xrt: approach.mv.XRT,
    mv_kre: approach.mv.KRE,
    homogeneous_break_even: homogeneousBreakEven(sheet),
    funded_break_even: fundedBreakEven(sheet),
    uniform_shock_to_call: distance.uniformShock,
    two_factor_rho0: distance.twoFactor[0]!.shock,
    two_factor_rho05: distance.twoFactor[1]!.shock,
    two_factor_rho1: distance.twoFactor[2]!.shock,
    account_fall_to_call: distance.accountFallToCall,
    u60_uniform_shock_to_call: u60.uniformShock,
    stale_seconds: approach.staleSeconds
  };
};

export const topApproaches = (result: RunResult, schedule: ScheduleKey, count = 20) =>
  result.approaches
    .filter((approach) => approach.schedule === schedule)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, count)
    .map((approach, index) => approachRecord(approach, index + 1));
