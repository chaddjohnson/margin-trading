// Metrics and tables from a scenario result: the headline summary, year-by-year rows, trade records and the
// per-lot adverse excursions. CSV helpers live here too.
import type { Dataset } from '../four-family/data.ts';
import type { Lot } from './account.ts';
import type { ProgramData } from './data.ts';
import { type DailyRow, type ScenarioResult, formatTime } from './engine.ts';
import { interestOn, secondsPerDay } from './strategy.ts';

export const csvValue = (value: unknown) => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows: Record<string, unknown>[], columns = rows.length ? Object.keys(rows[0]!) : []) =>
  `${[columns.join(','), ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(','))].join('\n')}\n`;

export const formatDate = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString().slice(0, 10) : '';

// The most negative mark of a lot against its cost while held: every minute low (and the close) from the fill's
// minute to the exit's minute, net of interest through the session date. A conservative excursion (lows, not
// closes), distinct from the strategy drawdown.
export const adverseExcursion = (ds: Dataset, lot: Lot, rate: number, endIndex: number) => {
  const last = lot.exitIndex >= 0 ? lot.exitIndex : endIndex;
  let worst = 0;
  let worstTime = NaN;

  for (let s = lot.entryIndex; s <= last; s++) {
    const interest = interestOn(lot, rate, ds.sTime[s]!);
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const from = s === lot.entryIndex ? lot.entryBar : 0;
    const to = s === lot.exitIndex ? Math.min(lot.exitBar, count) : count;

    for (let k = from; k < to; k++) {
      const mark = lot.shares * ds.bLow[start + k]! - lot.principal - interest;

      if (mark < worst) {
        worst = mark;
        worstTime = ds.bTime[start + k]!;
      }
    }

    if (s === lot.exitIndex && lot.exitIndex >= 0) {
      const mark = lot.shares * lot.exitPrice - lot.principal - interest;

      if (mark < worst) {
        worst = mark;
        worstTime = lot.exitTime;
      }
    }
  }

  return { worst, worstTime };
};

export interface TradeRecord extends Record<string, unknown> {
  scenario: string;
  lot: number;
  owner: string;
  original_owner: string;
  setup_kind: string;
  setup_id: number;
  entry_date: string;
  entry_time: string;
  entry_price: number;
  entry_execution: string;
  decision_time: string;
  decision_price: number;
  shares: number;
  principal: number;
  fraction_of_equity: number;
  equity_at_decision: number;
  exit_date: string;
  exit_time: string;
  exit_price: number;
  exit_reason: string;
  exit_execution: string;
  exit_stop_price: number;
  hold_days: number;
  interest: number;
  proceeds: number;
  net_profit: number;
  return_on_principal: number;
  lot_dividends: number;
  adverse_excursion: number;
  adverse_excursion_time: string;
  stop_first_active: string;
  takeover_date: string;
  takeover_time: string;
  takeover_transfer: string;
  takeover_from: string;
  takeover_net_at_decision: number;
  takeover_high_before: number;
  takeover_stop_before: number;
  takeover_stop_after: number;
}

export const tradeRecords = (data: ProgramData, result: ScenarioResult): TradeRecord[] => {
  const { ds } = data;

  return result.lots.map((lot) => {
    const excursion = adverseExcursion(ds, lot, result.config.rate, result.endIndex);
    const last = lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex;

    return {
      scenario: result.config.key,
      lot: lot.id,
      owner: lot.owner,
      original_owner: lot.originalOwner,
      setup_kind: lot.setupKind,
      setup_id: lot.setupId,
      entry_date: ds.dates[lot.entryIndex]!,
      entry_time: formatTime(lot.entryTime),
      entry_price: lot.entryPrice,
      entry_execution: lot.entryExecution,
      decision_time: formatTime(lot.decisionTime),
      decision_price: lot.decisionPrice,
      shares: lot.shares,
      principal: lot.principal,
      fraction_of_equity: lot.fraction,
      equity_at_decision: lot.equityAtDecision,
      exit_date: lot.exitIndex >= 0 ? ds.dates[lot.exitIndex]! : '',
      exit_time: formatTime(lot.exitTime),
      exit_price: lot.exitIndex >= 0 ? lot.exitPrice : ds.sClose[result.endIndex]!,
      exit_reason: lot.exitReason,
      exit_execution: lot.exitExecution,
      exit_stop_price: lot.exitStopPrice,
      hold_days: (ds.sTime[last]! - lot.entryTimestamp) / secondsPerDay,
      interest: lot.interest,
      proceeds: lot.proceeds,
      net_profit: lot.netProfit,
      return_on_principal: lot.netProfit / lot.principal,
      lot_dividends: lot.dividends,
      adverse_excursion: excursion.worst,
      adverse_excursion_time: formatTime(excursion.worstTime),
      stop_first_active: lot.exit.stopFirstActiveIndex >= 0 ? ds.dates[lot.exit.stopFirstActiveIndex]! : '',
      takeover_date: lot.takeover ? ds.dates[lot.takeover.index]! : '',
      takeover_time: lot.takeover ? formatTime(lot.takeover.time) : '',
      takeover_transfer: lot.takeover?.transfer ?? '',
      takeover_from: lot.takeover?.fromOwner ?? '',
      takeover_net_at_decision: lot.takeover?.profitAtTakeover ?? NaN,
      takeover_high_before: lot.takeover?.highBefore ?? NaN,
      takeover_stop_before: lot.takeover?.stopBefore ?? NaN,
      takeover_stop_after: lot.takeover?.stopAfter ?? NaN
    };
  });
};

export interface AnnualRow extends Record<string, unknown> {
  scenario: string;
  year: number;
  end_date: string;
  equity: number;
  annual_return: number;
  cumulative_return: number;
  core_voog_value: number;
  core_vgt_value: number;
  lot_value: number;
  outstanding_principal: number;
  accrued_interest: number;
  cash: number;
  receivables: number;
  cumulative_interest: number;
  strategy_realized_in_year: number;
  strategy_realized_cumulative: number;
  strategy_unrealized: number;
  cumulative_dividends: number;
  dividends_in_year: number;
  core_turnover_in_year: number;
  entries_in_year: number;
  exits_in_year: number;
  max_drawdown_in_year: number;
  min_equity_to_lmv: number;
}

export const annualRows = (data: ProgramData, result: ScenarioResult): AnnualRow[] => {
  const { ds } = data;
  const rows: AnnualRow[] = [];
  const start = result.daily[0]!;
  let previous: DailyRow = start;
  let previousDividends = 0;
  let previousTurnover = 0;
  let previousRealized = 0;
  let yearStart = 1;

  for (let index = 1; index < result.daily.length; index++) {
    const row = result.daily[index]!;
    const next = result.daily[index + 1];
    const year = Number(row.date.slice(0, 4));

    if (next && Number(next.date.slice(0, 4)) === year) {
      continue;
    }

    const yearRows = result.daily.slice(yearStart, index + 1);
    let peak = previous.equity;
    let maxDrawdown = 0;

    for (const dayRow of yearRows) {
      peak = Math.max(peak, dayRow.equity);
      maxDrawdown = Math.max(maxDrawdown, peak - dayRow.equity);
    }

    rows.push({
      scenario: result.config.key,
      year,
      end_date: row.date,
      equity: row.equity,
      annual_return: row.equity / previous.equity - 1,
      cumulative_return: row.equity / start.equity - 1,
      core_voog_value: row.voogValue,
      core_vgt_value: row.vgtCoreValue,
      lot_value: row.lotValue,
      outstanding_principal: row.principal,
      accrued_interest: row.accruedInterest,
      cash: row.cash,
      receivables: row.receivables,
      cumulative_interest: row.cumulativeInterest,
      strategy_realized_in_year: row.realizedStrategyProfit - previousRealized,
      strategy_realized_cumulative: row.realizedStrategyProfit,
      strategy_unrealized: row.unrealizedStrategyProfit,
      cumulative_dividends: row.cumulativeDividends,
      dividends_in_year: row.cumulativeDividends - previousDividends,
      core_turnover_in_year: row.coreTurnover - previousTurnover,
      entries_in_year: result.lots.filter((lot) => ds.dates[lot.entryIndex]!.startsWith(String(year))).length,
      exits_in_year: result.lots.filter(
        (lot) => lot.exitIndex >= 0 && ds.dates[lot.exitIndex]!.startsWith(String(year))
      ).length,
      max_drawdown_in_year: maxDrawdown,
      min_equity_to_lmv: Math.min(...yearRows.map((dayRow) => dayRow.equityToLmv))
    });

    previous = row;
    previousDividends = row.cumulativeDividends;
    previousTurnover = row.coreTurnover;
    previousRealized = row.realizedStrategyProfit;
    yearStart = index + 1;
  }

  return rows;
};

export interface ScenarioSummary extends Record<string, unknown> {
  scenario: string;
  label: string;
  strategies: string;
  policy: string;
  semantics: string;
  allocation: number;
  core_policy: string;
  rate: number;
  start_date: string;
  end_date: string;
  start_equity: number;
  end_equity: number;
  total_return: number;
  cagr: number;
  span_years: number;
  increment_vs_baseline: number;
  increment_vs_baseline_percent: number;
  daily_max_drawdown: number;
  daily_max_drawdown_percent: number;
  daily_drawdown_peak: string;
  daily_drawdown_trough: string;
  daily_drawdown_recovery: string;
  minute_max_drawdown: number;
  minute_max_drawdown_percent: number;
  minute_drawdown_peak: string;
  minute_drawdown_trough: string;
  strategy_trades: number;
  strategy_closed: number;
  strategy_open_at_end: number;
  strategy_wins: number;
  strategy_losses: number;
  strategy_realized: number;
  strategy_unrealized: number;
  strategy_net: number;
  strategy_interest: number;
  strategy_best_trade: number;
  strategy_worst_trade: number;
  strategy_worst_adverse_excursion: number;
  strategy_daily_drawdown: number;
  strategy_minute_drawdown: number;
  strategy_exposure: number;
  borrowing_dollar_days: number;
  average_principal: number;
  max_principal: number;
  trades_d1: number;
  trades_swing: number;
  net_d1: number;
  net_swing: number;
  max_gross_exposure: number;
  max_gross_exposure_date: string;
  max_debt_to_equity: number;
  min_equity_to_lmv_daily: number;
  min_equity_to_lmv_daily_date: string;
  min_equity_to_lmv_minute: number;
  min_equity_to_lmv_minute_time: string;
  forced_sales: number;
  reg_t_breaches: number;
  signals_granted: number;
  signals_declined: number; // refused minutes (hold semantics re-tests every minute)
  signals_declined_setups: number; // distinct setups refused at least once
  signals_takeover: number;
  signals_displace: number;
  takeovers: number;
  total_dividends: number;
  core_turnover: number;
  end_cash: number;
  end_receivables: number;
  end_principal: number;
  end_accrued_interest: number;
  end_lot_value: number;
}

export const scenarioSummary = (
  data: ProgramData,
  result: ScenarioResult,
  baseline?: ScenarioResult
): ScenarioSummary => {
  const { ds } = data;
  const first = result.daily[0]!;
  const last = result.daily.at(-1)!;
  const spanYears = (ds.sTime[result.endIndex]! - ds.sTime[0]!) / (365.25 * secondsPerDay);
  const closed = result.lots.filter((lot) => lot.exitIndex >= 0);
  const open = result.lots.filter((lot) => lot.exitIndex < 0);
  const excursions = result.lots.map((lot) => adverseExcursion(ds, lot, result.config.rate, result.endIndex).worst);
  const heldSessions = result.daily.filter((row) => row.openLots > 0).length;
  const eligibleSessions = result.daily.filter((row) => row.index >= result.config.eligibilityIndex).length;
  const borrowingDollarDays = result.lots.reduce((total, lot) => {
    const lastIndex = lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex;

    return total + (lot.principal * (ds.sTime[lastIndex]! - lot.entryTimestamp)) / secondsPerDay;
  }, 0);
  const byOwner = (owner: 'd1' | 'swing') =>
    result.lots.filter((lot) => (owner === 'swing' ? lot.owner === 'swing' : lot.owner !== 'swing'));
  const baselineEnd = baseline?.daily.at(-1)?.equity;

  return {
    scenario: result.config.key,
    label: result.config.label,
    strategies: result.config.strategies.join('+'),
    policy:
      result.config.policy +
      (result.config.transfer ? `-${result.config.transfer}${result.config.holdClock === 'takeover' ? 'b' : ''}` : ''),
    semantics: result.config.semantics,
    allocation: result.config.fixedPrincipal ?? result.config.allocation,
    core_policy: result.config.corePolicy,
    rate: result.config.rate,
    start_date: first.date,
    end_date: last.date,
    start_equity: first.equity,
    end_equity: last.equity,
    total_return: last.equity / first.equity - 1,
    cagr: (last.equity / first.equity) ** (1 / spanYears) - 1,
    span_years: spanYears,
    increment_vs_baseline: baselineEnd === undefined ? NaN : last.equity - baselineEnd,
    increment_vs_baseline_percent: baselineEnd === undefined ? NaN : last.equity / baselineEnd - 1,
    daily_max_drawdown: result.dailyDrawdown.maximum,
    daily_max_drawdown_percent: result.dailyDrawdown.maximumPercent,
    daily_drawdown_peak: formatDate(result.dailyDrawdown.peakTime),
    daily_drawdown_trough: formatDate(result.dailyDrawdown.troughTime),
    daily_drawdown_recovery: formatDate(result.dailyDrawdown.recoveryTime),
    minute_max_drawdown: result.minuteDrawdown.maximum,
    minute_max_drawdown_percent: result.minuteDrawdown.maximumPercent,
    minute_drawdown_peak: formatTime(result.minuteDrawdown.peakTime),
    minute_drawdown_trough: formatTime(result.minuteDrawdown.troughTime),
    strategy_trades: result.lots.length,
    strategy_closed: closed.length,
    strategy_open_at_end: open.length,
    strategy_wins: closed.filter((lot) => lot.netProfit > 0).length,
    strategy_losses: closed.filter((lot) => lot.netProfit <= 0).length,
    strategy_realized: closed.reduce((total, lot) => total + lot.netProfit, 0),
    strategy_unrealized: open.reduce((total, lot) => total + lot.netProfit, 0),
    strategy_net: result.lots.reduce((total, lot) => total + lot.netProfit, 0),
    strategy_interest: result.lots.reduce((total, lot) => total + lot.interest, 0),
    strategy_best_trade: Math.max(0, ...closed.map((lot) => lot.netProfit)),
    strategy_worst_trade: Math.min(0, ...closed.map((lot) => lot.netProfit)),
    strategy_worst_adverse_excursion: Math.min(0, ...excursions),
    strategy_daily_drawdown: result.strategyDailyDrawdown.maximum,
    strategy_minute_drawdown: result.strategyMinuteDrawdown.maximum,
    strategy_exposure: eligibleSessions ? heldSessions / eligibleSessions : 0,
    borrowing_dollar_days: borrowingDollarDays,
    average_principal: result.lots.length
      ? result.lots.reduce((total, lot) => total + lot.principal, 0) / result.lots.length
      : 0,
    max_principal: Math.max(0, ...result.lots.map((lot) => lot.principal)),
    trades_d1: byOwner('d1').length,
    trades_swing: byOwner('swing').length,
    net_d1: byOwner('d1').reduce((total, lot) => total + lot.netProfit, 0),
    net_swing: byOwner('swing').reduce((total, lot) => total + lot.netProfit, 0),
    max_gross_exposure: result.maxGross.ratio,
    max_gross_exposure_date: result.maxGross.date,
    max_debt_to_equity: result.maxDebtToEquity.ratio,
    min_equity_to_lmv_daily: result.minMarginRatio.daily,
    min_equity_to_lmv_daily_date: result.minMarginRatio.dailyDate,
    min_equity_to_lmv_minute: result.minMarginRatio.ratio,
    min_equity_to_lmv_minute_time: formatTime(result.minMarginRatio.time),
    forced_sales: result.forcedSales.length,
    reg_t_breaches: result.regTBreaches,
    signals_granted: result.signals.filter((signal) => signal.outcome === 'granted').length,
    signals_declined: result.signals.filter((signal) => signal.outcome === 'declined' || signal.outcome === 'reg-t').length,
    signals_declined_setups: new Set(
      result.signals
        .filter((signal) => signal.outcome === 'declined' || signal.outcome === 'reg-t')
        .map((signal) => `${signal.strategy}:${signal.setupId}`)
    ).size,
    signals_takeover: result.signals.filter((signal) => signal.outcome === 'takeover').length,
    signals_displace: result.signals.filter((signal) => signal.outcome === 'displace').length,
    takeovers: result.takeovers.length,
    total_dividends: last.cumulativeDividends,
    core_turnover: last.coreTurnover,
    end_cash: last.cash,
    end_receivables: last.receivables,
    end_principal: last.principal,
    end_accrued_interest: last.accruedInterest,
    end_lot_value: last.lotValue
  };
};

export const dailyRecords = (result: ScenarioResult) =>
  result.daily.map((row) => ({ scenario: result.config.key, ...row }) as Record<string, unknown>);

export const eventRecords = (result: ScenarioResult) =>
  result.events.map(
    (event) => ({ scenario: result.config.key, ...event, time: formatTime(event.time) }) as Record<string, unknown>
  );

export const signalRecords = (result: ScenarioResult) =>
  result.signals.map(
    (signal) =>
      ({ scenario: result.config.key, ...signal, decisionTime: formatTime(signal.decisionTime) }) as Record<
        string,
        unknown
      >
  );
