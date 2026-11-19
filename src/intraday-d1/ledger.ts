// The machine-readable per-trade ledger (brief §5): one row per lot with Eastern timestamps, prices (raw and after
// cost), exit reason, gross/net P&L in dollars and percent of the $100,000 notional, holding time, financing, costs,
// MAE/MFE, the rule levels that produced the trade, and how each fill was priced (observed trade vs assumed level).
import type { ExecutionSettings, Lot, RunResult } from './engine.ts';
import type { DoorView } from './lab.ts';

const nyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short'
});

export const eastern = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '';

  const p = Object.fromEntries(nyFormat.formatToParts(new Date(seconds * 1000)).map((x) => [x.type, x.value]));

  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
};

const round = (value: number, digits = 2) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : value);

// Which fills are observed trades and which are assumed prices (D1's own labels).
export const fillKind = (execution: string) =>
  execution === 'stop level'
    ? 'assumed: stop level inside a minute that traded through it (optimistic intrabar)'
    : execution === 'trigger minute low'
      ? 'assumed: worst trade of the trigger minute (bound)'
      : execution
        ? 'observed trade (minute open, opening trade or closing print)'
        : '';

export interface LedgerContext {
  candidate: string;
  view: DoorView;
  settings: ExecutionSettings;
}

export const ledgerRows = (ctx: LedgerContext, result: RunResult) => {
  const { view, candidate, settings } = ctx;
  const { sessions } = view.market;
  const devEnd = view.developmentEndSession;

  return result.lots.map((lot: Lot) => {
    const exitSession = lot.open ? view.window.endSession : lot.exitSession;
    const exitTime = lot.open ? sessions.closeTime[exitSession]! : lot.exitTime;
    const period = (s: number) => (s <= devEnd ? 'development' : 'validation');

    return {
      instrument: 'VGT',
      candidate,
      lot: lot.id,
      direction: 'long',
      window: lot.open
        ? `${period(lot.entrySession)} (open at end)`
        : period(lot.entrySession) === period(lot.exitSession)
          ? period(lot.entrySession)
          : 'straddles 2024/2025',
      entry_session: sessions.date[lot.entrySession],
      entry_time_et: eastern(lot.entryTime),
      entry_raw: round(lot.entryRaw, 4),
      entry_price_after_cost: round(lot.entryPrice, 4),
      entry_execution: lot.entryExecution,
      entry_fill_kind: fillKind(lot.entryExecution),
      exit_session: lot.open ? '' : sessions.date[lot.exitSession],
      exit_time_et: lot.open ? '' : eastern(lot.exitTime),
      exit_raw: round(lot.exitRaw, 4),
      exit_price_after_cost: lot.open ? '' : round(lot.exitPrice, 4),
      exit_reason: lot.open ? 'open at end (marked at the last close)' : lot.exitReason,
      exit_execution: lot.exitExecution,
      exit_fill_kind: fillKind(lot.exitExecution),
      notional: lot.investment,
      shares: round(lot.shares, 6),
      gross_after_costs: round(lot.gross),
      gross_before_costs: round(lot.gross + lot.costs),
      costs: round(lot.costs),
      stop_slippage: round(lot.slippage),
      financing: round(lot.interest),
      net: round(lot.net),
      net_pct_of_notional: round((lot.net / lot.investment) * 100, 4),
      holding_minutes: round((exitTime - lot.entryTime) / 60, 1),
      overnight_nights: Math.round((sessions.time[exitSession]! - sessions.time[lot.entrySession]!) / 86400),
      held_periods: lot.heldPeriods,
      mae_pct: round(lot.mae * 100, 4),
      mfe_pct: round(lot.mfe * 100, 4),
      setup_kind: lot.setupKind,
      arming_time_et: eastern(lot.activationTime),
      arming_close: round(lot.activationPrice, 4),
      reference_high: round(lot.referenceHigh, 4),
      anchor_high: round(lot.anchorHigh, 4),
      trailing_low: round(lot.trailingLow, 4),
      trailing_low_time_et: eastern(lot.trailingLowTime),
      rebound_trigger: round(lot.trigger, 4),
      decision_time_et: eastern(lot.decisionTime),
      decision_close: round(lot.decisionPrice, 4),
      carried_to_next_period: lot.carried,
      stop_at_exit: round(lot.stopAtExit, 4),
      stop_active_at_exit: lot.stopActiveAtExit,
      stop_first_active_after_periods:
        lot.stopFirstActivePeriod >= 0 ? lot.stopFirstActivePeriod - lot.entryPeriod : '',
      stop_active_periods: lot.stopActivePeriods,
      maximum_hold_due_at_exit: lot.maximumHoldDue,
      buffer_signal_time_et: eastern(lot.bufferSignalTime),
      cost_bps_per_side: settings.costBps,
      stop_fill_mode: settings.stopFill,
      entry_ms: lot.entryTime,
      exit_ms: lot.open ? '' : lot.exitTime
    };
  });
};

export type LedgerRow = ReturnType<typeof ledgerRows>[number];
