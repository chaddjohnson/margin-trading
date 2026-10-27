// The BTC run report (the `fixed` command): every funded trade from the reference engine, the account reconciliation
// and the drawdowns, in USDT and BTC. A separate formatter from the ETF pools' (whose files are bound by the
// prospective B4/B5 freeze): there is no interest, no margin and no dollar here; "USDT" is the unit of account.
import fs from 'node:fs';
import path from 'node:path';
import { dateOf, isoOf } from './calendar.ts';
import { account, study } from './context.ts';
import { type ExecutionSettings, stopFills } from './costs.ts';
import type { RunResult, Trade, WindowResult } from './engine.ts';
import { reconcileLedger } from './parity.ts';
import { type D1Grid, describeGrid } from './params.ts';

const usdt = (value: number) =>
  `${value < 0 ? '-' : ''}${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
const pct = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;
const price = (value: number) => value.toFixed(2);

export const tradeColumns = [
  'number',
  'status',
  'window_role',
  'setup_kind',
  'activation_utc',
  'activation_close',
  'anchor_high',
  'trailing_low',
  'rebound_trigger',
  'decision_utc',
  'decision_close',
  'available_quote_usdt',
  'external_top_up_usdt',
  'entry_utc',
  'entry_execution',
  'entry_price_usdt_per_btc',
  'entry_fill_price_usdt_per_btc',
  'quantity_btc',
  'gross_notional_usdt',
  'entry_fee_usdt',
  'entry_impact_usdt',
  'entry_participation',
  'exit_utc',
  'exit_reason',
  'exit_execution',
  'stop_at_exit',
  'exit_price_usdt_per_btc',
  'exit_fill_price_usdt_per_btc',
  'exit_proceeds_usdt',
  'exit_fee_usdt',
  'exit_impact_usdt',
  'exit_participation',
  'interest_funding_usdt',
  'gross_price_pnl_usdt',
  'net_pnl_usdt',
  'cumulative_realized_net_usdt',
  'elapsed_calendar_days',
  'duration_minutes',
  'max_favorable_excursion',
  'max_adverse_excursion'
] as const;

// trades.csv and trades.json hold the whole continuous account's ledger (so cash and equity reconcile); this column
// says which trades the reported window's figures cover: entered in it, carried into it, or before it.
const windowRole = (trade: Trade, startDay: number) =>
  trade.entryDay >= startDay
    ? 'entered in window'
    : trade.status === 'open' || trade.exitDay >= startDay
      ? 'carried into window'
      : 'before window';

const rowOf = (trade: Trade, startDay: number) => [
  trade.number,
  trade.status === 'open' ? 'open (marked at last close)' : 'closed',
  windowRole(trade, startDay),
  trade.setupKind,
  isoOf(trade.activationTime),
  trade.activationPrice,
  trade.anchorHigh,
  trade.trailingLow,
  trade.reboundTrigger,
  isoOf(trade.decisionTime),
  trade.decisionPrice,
  trade.availableQuote,
  trade.topUp,
  isoOf(trade.entryTime),
  trade.entryExecution,
  trade.entryPrice,
  trade.entryFillPrice,
  trade.quantity,
  trade.notional,
  trade.entryFee,
  trade.entryImpact,
  trade.entryParticipation,
  isoOf(trade.exitTime),
  trade.exitReason,
  trade.exitExecution,
  trade.stopAtExit,
  trade.exitPrice,
  trade.exitFillPrice,
  trade.exitProceeds,
  trade.exitFee,
  trade.exitImpact,
  trade.exitParticipation,
  0,
  trade.grossPnl,
  trade.netPnl,
  trade.cumulativeRealized,
  trade.elapsedDays,
  trade.durationMinutes,
  trade.maxFavorable,
  trade.maxAdverse
];

const csvCell = (value: unknown) => {
  const text = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : String(value ?? '');

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export interface RunDescription {
  phenotypeId: string;
  grid: D1Grid;
  settings: ExecutionSettings;
  mode: 'cash' | 'fixed';
  armingFrom: number; // the continuous account's first arming day
  startDay: number; // the reported window's first day (= armingFrom unless a later window of the run is reported)
  endDay: number; // exclusive
  dataNote: string;
  doorNote: string;
}

const drawdownsOf = (window: WindowResult) => ({
  minute: {
    usdt: window.minute.drawdown,
    usdtPeakUtc: isoOf(window.minute.drawdownPeakTime),
    usdtTroughUtc: isoOf(window.minute.drawdownTroughTime),
    percent: window.minute.percent,
    percentPeakUtc: isoOf(window.minute.percentPeakTime),
    percentTroughUtc: isoOf(window.minute.percentTroughTime)
  },
  daily: {
    usdt: window.daily.drawdown,
    percent: window.daily.percent
  }
});

// The trades held in the reported window (entered in it, or carried into it), with the window's own net and
// drawdowns; the account totals and the reconciliation are the whole continuous run's.
export const windowTrades = (run: RunResult, description: RunDescription) =>
  run.trades.filter((trade) => trade.status === 'open' || trade.exitDay >= description.startDay);

export const summaryOf = (fullRun: RunResult, description: RunDescription) => {
  const run = { ...fullRun, trades: windowTrades(fullRun, description) };
  const window = run.windows[0]!;
  const closed = run.trades.filter((trade) => trade.status === 'closed');
  const open = run.trades.find((trade) => trade.status === 'open');
  const wins = closed.filter((trade) => trade.netPnl > 0).length;
  const fees = run.trades.reduce((total, trade) => total + trade.entryFee + trade.exitFee, 0);
  const impact = run.trades.reduce((total, trade) => total + trade.entryImpact + trade.exitImpact, 0);
  const gross = run.trades.reduce((total, trade) => total + trade.grossPnl, 0);
  const exposedMinutes = run.trades.reduce((total, trade) => total + trade.durationMinutes, 0);
  const windowMinutes = (description.endDay - description.startDay) * 1440;

  return {
    phenotype: description.phenotypeId,
    parameters: describeGrid(description.grid),
    mode:
      description.mode === 'cash'
        ? 'cash-funded (live-executable accounting)'
        : 'analytical fixed 100,000 USDT notional',
    window: {
      armingFrom: dateOf(description.armingFrom),
      firstDay: dateOf(description.startDay),
      lastDay: dateOf(description.endDay - 1),
      startEquity: window.startEquity,
      endEquity: window.endEquity
    },
    costs: description.settings.costs,
    stopFill: description.settings.stopFill,
    initialEquity: account.initialEquity,
    finalEquity: run.equity,
    netProfit: window.net,
    returnOnCap: window.net / account.notionalCap,
    realizedNet: run.realized,
    unrealizedNet: run.unrealized,
    grossPricePnl: gross,
    fees,
    impact,
    interestAndFunding: 0,
    externalTopUps: run.contributions,
    cash: run.cash,
    btc: run.quantity,
    trades: run.trades.length,
    closedTrades: closed.length,
    wins,
    losses: closed.length - wins,
    openPosition: open
      ? {
          entryUtc: isoOf(open.entryTime),
          quantityBtc: open.quantity,
          allocatedNotional: open.notional,
          markPrice: open.exitPrice,
          liquidationValue: open.exitProceeds - open.exitFee,
          unrealizedNet: open.netPnl,
          leftoverUsdt: run.cash
        }
      : null,
    drawdown: drawdownsOf(window),
    exposure: { minutesHeld: exposedMinutes, shareOfWindow: exposedMinutes / windowMinutes },
    participation: {
      max: Math.max(
        0,
        ...run.trades.flatMap((t) => [t.entryParticipation, t.exitParticipation].filter(Number.isFinite))
      ),
      fillsAbove10pct: run.trades
        .flatMap((t) => [t.entryParticipation, t.exitParticipation])
        .filter((value) => value > 0.1).length
    },
    setups: run.setups,
    reconciliation: reconcileLedger(fullRun, account.initialEquity),
    dataNote: description.dataNote,
    doorNote: description.doorNote
  };
};

export const formatReport = (run: RunResult, description: RunDescription) => {
  const summary = summaryOf(run, description);
  const lines: string[] = [];

  lines.push(`BTCUSDT spot D1 — ${description.phenotypeId} (research only; no live-trading status)`);
  lines.push(`Parameters: ${summary.parameters}`);
  lines.push(
    `Window: ${summary.window.firstDay} → ${summary.window.lastDay} (UTC days) of one continuous account arming from ${summary.window.armingFrom}; equity ${usdt(summary.window.startEquity)} at the window's start; ${description.dataNote}`
  );
  lines.push(`Data door: ${description.doorNote}`);
  lines.push(
    `Account: ${summary.mode}; start 100,000.00 USDT; at most 100,000 USDT gross notional per entry; spot, long only, no borrowing`
  );
  lines.push(
    `Costs: fee ${description.settings.costs.feeBps} bps + impact ${description.settings.costs.impactBps} bps per side (assumptions, not an account tier); stops fill at ${stopFills[description.settings.stopFill]}`
  );
  lines.push('');
  lines.push('Funded trades:');

  for (const trade of windowTrades(run, description)) {
    lines.push(
      `#${trade.number} ${trade.setupKind} ${trade.status === 'open' ? 'OPEN' : ''} entry ${isoOf(trade.entryTime)} @ ${price(trade.entryPrice)} (fill ${price(trade.entryFillPrice)}) ` +
        `${trade.quantity.toFixed(6)} BTC, notional ${usdt(trade.notional)} of ${usdt(trade.availableQuote)} available` +
        `${trade.topUp > 0 ? `, top-up ${usdt(trade.topUp)}` : ''}`
    );
    lines.push(
      `    exit ${isoOf(trade.exitTime)} @ ${price(trade.exitPrice)} (fill ${price(trade.exitFillPrice)}) — ${trade.exitReason}, ${trade.exitExecution}; ` +
        `${trade.elapsedDays} UTC days; gross ${usdt(trade.grossPnl)}, fees ${usdt(trade.entryFee + trade.exitFee)}, impact ${usdt(trade.entryImpact + trade.exitImpact)}, interest/funding 0 (N/A); ` +
        `net ${usdt(trade.netPnl)}; cumulative realized ${usdt(trade.cumulativeRealized)}; MFE ${pct(trade.maxFavorable)} MAE ${pct(trade.maxAdverse)}`
    );
  }

  if (windowTrades(run, description).length === 0) {
    lines.push('  (no funded trade)');
  }

  lines.push('');
  lines.push(
    `Net profit in the window ${usdt(summary.netProfit)} (${pct(summary.returnOnCap)} of 100,000 USDT; the change of marked equity). Account since ${summary.window.armingFrom}: realized ${usdt(summary.realizedNet)}, unrealized ${usdt(summary.unrealizedNet)}`
  );
  lines.push(
    `Gross price P&L ${usdt(summary.grossPricePnl)}; fees ${usdt(summary.fees)}; impact ${usdt(summary.impact)}; interest/funding 0.00 USDT (not applicable: spot, no borrowing)`
  );

  if (description.armingFrom !== description.startDay) {
    lines.push(
      `Window of a longer run: the trades above are those held in the window, over their whole lives; a trade carried in contributes only its change after ${dateOf(description.startDay)} to the window net, so the gross, fee and impact totals need not add up to it. trades.csv/trades.json hold the whole account's ledger since ${dateOf(description.armingFrom)}, labelled by window_role.`
    );
  }
  lines.push(
    `Trades ${summary.trades} (${summary.closedTrades} closed: ${summary.wins} won, ${summary.losses} lost${summary.openPosition ? '; 1 open' : ''})`
  );

  if (summary.openPosition) {
    const open = summary.openPosition;

    lines.push(
      `Open position: ${open.quantityBtc.toFixed(8)} BTC from ${open.entryUtc}, allocated ${usdt(open.allocatedNotional)}, marked at ${price(open.markPrice)}: liquidation value ${usdt(open.liquidationValue)} (after exit fee and impact), unrealized ${usdt(open.unrealizedNet)}; leftover cash ${usdt(open.leftoverUsdt)}`
    );
  }

  lines.push(
    `Cash ${usdt(summary.cash)} + BTC ${summary.btc.toFixed(8)} → equity ${usdt(summary.finalEquity)}${summary.externalTopUps > 0 ? `; external top-ups ${usdt(summary.externalTopUps)} (analytical mode only)` : ''}`
  );
  lines.push(
    `Maximum drawdown (minute marks): ${usdt(summary.drawdown.minute.usdt)} (${summary.drawdown.minute.usdtPeakUtc} → ${summary.drawdown.minute.usdtTroughUtc}); peak-to-trough ${pct(summary.drawdown.minute.percent)} of account equity (${summary.drawdown.minute.percentPeakUtc} → ${summary.drawdown.minute.percentTroughUtc})`
  );
  lines.push(
    `Maximum drawdown (daily closes): ${usdt(summary.drawdown.daily.usdt)}; peak-to-trough ${pct(summary.drawdown.daily.percent)}`
  );
  lines.push(
    `Exposure: ${pct(summary.exposure.shareOfWindow)} of the window in BTC, ${pct(1 - summary.exposure.shareOfWindow)} in USDT cash (earning nothing)`
  );
  lines.push(
    `Capacity: largest fill ${pct(summary.participation.max)} of its minute's quote volume; ${summary.participation.fillsAbove10pct} fill(s) above 10% (warnings; order-book depth is not modelled)`
  );
  lines.push(
    `Reconciliation: ${summary.reconciliation.length === 0 ? 'ledger, cash and equity reconcile' : summary.reconciliation.join('; ')}`
  );
  lines.push(
    'Not modelled: USDT counterparty or depeg risk, venue risk, order-book depth, lot-size and minimum-notional filters (no local metadata), taxes.'
  );

  return { text: lines.join('\n'), summary };
};

export const writeRunOutputs = (
  outDir: string,
  run: RunResult,
  description: RunDescription,
  report: ReturnType<typeof formatReport>
) => {
  const resolved = path.resolve(outDir);

  if (!resolved.startsWith(`${path.resolve(study.evaluationsDir)}${path.sep}`)) {
    throw new Error(
      `Run outputs go under ${study.evaluationsDir}/ only (sealed records and phenotypes live elsewhere)`
    );
  }

  fs.mkdirSync(resolved, { recursive: true });
  fs.writeFileSync(path.join(resolved, 'report.txt'), `${report.text}\n`);
  fs.writeFileSync(
    path.join(resolved, 'trades.csv'),
    `${[tradeColumns.join(','), ...run.trades.map((trade) => rowOf(trade, description.startDay).map(csvCell).join(','))].join('\n')}\n`
  );
  fs.writeFileSync(
    path.join(resolved, 'trades.json'),
    `${JSON.stringify(
      run.trades.map((trade) => {
        const row = rowOf(trade, description.startDay);

        return Object.fromEntries(tradeColumns.map((column, index) => [column, row[index]]));
      }),
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(resolved, 'summary.json'),
    `${JSON.stringify({ description, ...report.summary }, null, 2)}\n`
  );

  return resolved;
};
