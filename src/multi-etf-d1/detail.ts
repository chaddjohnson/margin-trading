// Per-run artifacts: trades.csv, daily.csv, summary.json and the optional minute curve, written from a detail
// evaluation. Times are ISO UTC with a New York column; prices are the observed trade prices and, when a cost
// sensitivity applies, the effective fill as well.
import path from 'node:path';
import fs from 'fs-extra';
import { formatNewYorkTime } from '#lib';
import type { Dataset } from '../four-family/data.ts';
import type { Trade } from '../d1-refinement/engine.ts';
import { type Detail, type EvalSpec, type Metrics, engineVersion } from '../d1-refinement/evaluate.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { csvLine } from '../d1-refinement/report.ts';
import { protocol, writeJson } from './context.ts';
import { describe, fractionsOf, idOf } from './space.ts';

const iso = (time: number) => (Number.isFinite(time) ? new Date(time * 1000).toISOString() : '');
const ny = (time: number) => (Number.isFinite(time) ? formatNewYorkTime(time) : '');

export const fillAssumptions = {
  bars: 'Alpaca SIP one-minute bars, raw prices, regular session plus the closing print',
  entry:
    'rebound confirmed at a completed minute close; buy at the first observed trade at or after the decision (next minute open, the closing print only for a decision before the close, else the next session open)',
  stop: "trailing stop level from the post-entry high (updated once a day, never lowered), active only while a fill at the level nets a profit after interest; a session opening at or below it fills at the opening trade; intraday, 'stop' fills at the level when the minute opened above it, at the minute's open when it opened through it; 'next-open' fills at the next observed trade",
  maximumHold:
    'from the hold day, a position whose sale at the opening trade would lose money sells at the next observed trade',
  bufferedLoss:
    'from the hold day, the first completed minute closing at or below the buffer sells at the next observed trade',
  interest: 'simple interest at the annual rate per calendar day from the entry session date, none on the entry date',
  costs:
    'none unless the run labels a per-side cost; a per-side cost worsens every fill and is counted in every net-profit test',
  drawdown:
    'minute-sampled: the largest fall of the cumulative strategy P&L marked at every regular-session minute close and the official close; daily: marked at the official close only'
};

export const windowOfTrade = (trade: Trade, developmentEnd: number) => {
  if (trade.entryIndex > developmentEnd) {
    return 'holdout';
  }

  if (trade.exitIndex < 0 || trade.exitIndex > developmentEnd) {
    return 'spanning';
  }

  return 'development';
};

export const tradesCsv = (ds: Dataset, detail: Detail, developmentEnd: number) => {
  const lines = [
    csvLine([
      'index',
      'kind',
      'window',
      'entry_date',
      'entry_time_utc',
      'entry_time_ny',
      'entry_execution',
      'entry_price_observed',
      'entry_price_effective',
      'shares',
      'investment',
      'decision_time_utc',
      'decision_price',
      'activation_date',
      'activation_time_utc',
      'activation_price',
      'reference_high',
      'anchor_high',
      'trailing_low',
      'rebound_trigger',
      'exit_date',
      'exit_time_utc',
      'exit_time_ny',
      'exit_execution',
      'exit_price_observed',
      'exit_price_effective',
      'reason',
      'exit_stop_price',
      'maximum_hold_due',
      'buffer_signal_time_utc',
      'buffer_signal_price',
      'hold_days',
      'interest',
      'gross_profit',
      'net_profit',
      'is_open',
      'stop_first_active_date',
      'stop_active_sessions',
      'stop_switch_off_sessions'
    ])
  ];

  detail.trades.forEach((trade, index) => {
    const outcome = detail.accounting.outcomes[index]!;
    const isOpen = trade.exitIndex < 0;

    lines.push(
      csvLine([
        index + 1,
        trade.kind,
        windowOfTrade(trade, developmentEnd),
        ds.dates[trade.entryIndex],
        iso(trade.entryTime),
        ny(trade.entryTime),
        trade.entryExecution,
        trade.entryPriceObserved,
        trade.entryPrice,
        trade.shares,
        trade.investment,
        iso(trade.decisionTime),
        trade.decisionPrice,
        trade.activationIndex >= 0 ? ds.dates[trade.activationIndex] : '',
        iso(trade.activationTime),
        trade.activationPrice,
        trade.referenceHigh,
        trade.anchorHigh,
        trade.trailingLow,
        trade.reboundTrigger,
        isOpen ? '' : ds.dates[trade.exitIndex],
        iso(trade.exitTime),
        ny(trade.exitTime),
        trade.exitExecution,
        isOpen ? ds.sClose[ds.sessionCount - 1] : trade.exitPriceObserved,
        isOpen ? ds.sClose[ds.sessionCount - 1] : trade.exitPrice,
        isOpen ? 'open' : trade.reason,
        trade.exitStopPrice,
        trade.maximumHoldDue,
        iso(trade.bufferSignalTime),
        trade.bufferSignalPrice,
        outcome.holdDays,
        outcome.interest,
        outcome.profit + outcome.interest,
        outcome.profit,
        outcome.isOpen,
        trade.stopFirstActiveIndex >= 0 ? ds.dates[trade.stopFirstActiveIndex] : 'never',
        trade.stopActiveSessions,
        trade.stopSwitchOffSessions
      ])
    );
  });

  return `${lines.join('\n')}\n`;
};

export const dailyCsv = (ds: Dataset, detail: Detail, spec: EvalSpec) => {
  const marks = detail.accounting.dailyMarks;
  const lines = [
    csvLine([
      'index',
      'date',
      'close',
      'mtm_pnl',
      'position_open',
      'entry_state',
      'setup_kind',
      'recent_high',
      'x_level',
      'trailing_low',
      'rebound_trigger',
      'continuation_active',
      'continuation_high',
      'eligible'
    ])
  ];
  const traceByIndex = new Map(detail.trace.map((row) => [row.index, row]));

  for (let s = 0; s <= spec.endIndex; s++) {
    const row = traceByIndex.get(s);

    lines.push(
      csvLine([
        s,
        ds.dates[s],
        ds.sClose[s],
        marks ? marks[s] : '',
        row?.entryState === 'LONG',
        row?.entryState ?? '',
        row?.setupKind ?? '',
        row?.recentHigh,
        row?.xLevel,
        row?.trailingLow,
        row?.reboundTrigger,
        row?.continuationActive ?? '',
        row?.continuationHigh,
        s >= spec.armStart
      ])
    );
  }

  return `${lines.join('\n')}\n`;
};

// Minute-sampled marks on sessions with a position: realized profit plus the open position at every minute close.
export const minuteCurveCsv = (ds: Dataset, detail: Detail, spec: EvalSpec) => {
  const lines = [csvLine(['time_utc', 'date', 'price', 'mtm_pnl', 'trade_index'])];
  let realized = 0;

  detail.trades.forEach((trade, index) => {
    const outcome = detail.accounting.outcomes[index]!;
    const last = trade.exitIndex < 0 ? spec.endIndex : trade.exitIndex;

    for (let s = trade.entryIndex; s <= last; s++) {
      const interest =
        trade.investment * spec.marginInterestRate * ((ds.sTime[s]! - trade.entryTimestamp) / (365 * 86400));
      const start = ds.sBarStart[s]!;
      const count = ds.sBarCount[s]!;
      const from = s === trade.entryIndex ? trade.entryBar : 0;
      const to = s === trade.exitIndex ? trade.exitBar : count + 1;

      for (let k = from; k < to; k++) {
        const price = k < count ? ds.bClose[start + k]! : ds.sClose[s]!;
        const time = k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!;

        lines.push(
          csvLine([
            iso(time),
            ds.dates[s],
            price,
            realized + trade.shares * price - trade.investment - interest,
            index + 1
          ])
        );
      }
    }

    if (!outcome.isOpen) {
      realized += outcome.profit;
    }
  });

  return `${lines.join('\n')}\n`;
};

export interface DetailMeta {
  ticker: string;
  label: string;
  role: string; // control, primary, alternate, ...
  params: IntParams;
  dataHash: string;
  dataFile: string;
}

export const writeDetail = async (
  dir: string,
  ds: Dataset,
  meta: DetailMeta,
  spec: EvalSpec,
  metrics: Metrics,
  detail: Detail,
  developmentEnd: number,
  minuteCurve = false
) => {
  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, 'trades.csv'), tradesCsv(ds, detail, developmentEnd));
  await fs.writeFile(path.join(dir, 'daily.csv'), dailyCsv(ds, detail, spec));

  if (minuteCurve) {
    await fs.writeFile(path.join(dir, 'minute_marks.csv'), minuteCurveCsv(ds, detail, spec));
  }

  const summary = {
    ticker: meta.ticker,
    label: meta.label,
    role: meta.role,
    candidateId: idOf(meta.params),
    params: meta.params,
    fractions: fractionsOf(meta.params),
    description: describe(meta.params),
    engineVersion,
    protocolVersion: protocol.version,
    dataFile: meta.dataFile,
    dataHash: meta.dataHash,
    datasetId: ds.id,
    run: {
      label: spec.label,
      stopFill: spec.stopFill,
      marginInterestRate: spec.marginInterestRate,
      costPerSide: spec.costPerSide ?? 0,
      investmentPerEntry: protocol.investment,
      armStart: spec.armStart,
      armStartDate: ds.dates[spec.armStart],
      firstSession: ds.dates[0],
      lastSession: ds.dates[spec.endIndex]
    },
    fillAssumptions,
    metrics: {
      net: metrics.net,
      gross: metrics.gross,
      interest: metrics.interest,
      realized: detail.accounting.realizedProfit,
      unrealized: detail.accounting.unrealizedProfit,
      closedInterest: detail.accounting.closedInterest,
      accruedInterest: detail.accounting.accruedInterest,
      minuteDrawdown: metrics.minuteDrawdown,
      minuteDrawdownPeak: iso(metrics.minuteDrawdownPeak),
      minuteDrawdownTrough: iso(metrics.minuteDrawdownTrough),
      dailyDrawdown: metrics.dailyDrawdown,
      entries: metrics.entries,
      closedTrades: metrics.closedTrades,
      wins: metrics.wins,
      losses: metrics.losses,
      openAtEnd: metrics.openAtEnd,
      exposure: metrics.exposure,
      averageHoldDays: metrics.averageHoldDays,
      bestTrade: metrics.bestTrade,
      worstTrade: metrics.worstTrade,
      worstAdverseExcursion: metrics.worstAdverseExcursion,
      maximumLosingStreak: metrics.maximumLosingStreak,
      worstEpisodeLoss: metrics.worstEpisodeLoss,
      netWithoutBestTrade: metrics.netWithoutBestTrade,
      exitReasons: metrics.exitReasons,
      entriesByKind: metrics.entriesByKind,
      signature: metrics.signature
    },
    segments: metrics.segments
  };

  await writeJson(path.join(dir, 'summary.json'), summary);

  return summary;
};
