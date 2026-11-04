// Results of a trading backtest (rise-from-recent-low-trading): the per-symbol metrics block and the trade ledger.
// Each symbol is a standalone backtest on its own $100,000 notional: nothing here is summed across symbols. A figure the
// run could not compute is shown as "n/a" with its reason, never as 0.

import type { ReactNode } from 'react';

import type { LabEvent, LabValue } from '../../shared/contract.ts';
import type { Role } from '../chart/markers.ts';
import { formatEt, formatPrice } from '../format.ts';

type Drawdown = {
  maximumUsd: number;
  percentOfNotional: number;
  peakTime: string | null;
  troughTime: string | null;
  recoveryTime: string | null;
};

export interface TradingSymbolMetrics {
  sessions: number;
  window: { firstDate: string; lastDate: string; calendarDays: number };
  signals: {
    raw: number;
    filled: number;
    rejected: number;
    rejectedByReason: { position_open: number; order_pending: number };
    unfilledAtEnd: number;
  };
  trades: {
    filled: number;
    closed: number;
    open: number;
    wins: number;
    losses: number;
    breakeven: number;
    winRatePercent: number | null;
    profitFactor: number | null;
    averageNetUsd: number | null;
    bestNetUsd: number | null;
    worstNetUsd: number | null;
    exitReasons: Record<string, number>;
  };
  pnl: {
    realizedGrossBeforeCostsUsd: number;
    realizedCostsUsd: number;
    realizedInterestUsd: number;
    realizedNetUsd: number;
    unrealized: {
      grossBeforeCostsUsd: number;
      entryCostUsd: number;
      accruedInterestUsd: number;
      netUsd: number;
      markPrice: number;
      markDate: string;
    } | null;
    totalMarkedNetUsd: number;
    totalInterestUsd: number;
    totalCostsUsd: number;
  };
  drawdown: { minute: Drawdown; daily: Drawdown };
  occupancy: {
    sessionsInvested: number;
    sessionsHeldAtClose: number;
    sessionsInvestedPercent: number | null;
    calendarDaysInvested: number;
    calendarTimeInvestedPercent: number | null;
  };
  holding: {
    meanCalendarDays: number | null;
    medianCalendarDays: number | null;
    longestCalendarDays: number | null;
    medianSessions: number | null;
  };
  unavailable: Record<string, string>;
}

const money = (x: number) =>
  `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (x: number) => <span className={x > 0 ? 'pos' : x < 0 ? 'neg' : ''}>{money(x)}</span>;
const na = (reason: string) => <span className="na">n/a — {reason}</span>;
const pct = (x: number | null, reason: string, digits = 1) => (x === null ? na(reason) : `${x.toFixed(digits)}%`);
const days = (x: number | null, reason: string) => (x === null ? na(reason) : `${x.toFixed(1)} days`);

export function TradingMetrics({ m, symbol }: { m: TradingSymbolMetrics; symbol: string }) {
  const t = m.trades;
  const u = m.pnl.unrealized;
  const noClosed = m.unavailable.winRate ?? 'no closed trades';
  const row = (label: string, value: ReactNode, testId?: string) => (
    <tr key={label}>
      <th scope="row">{label}</th>
      <td className="num" data-testid={testId}>
        {value}
      </td>
    </tr>
  );
  const dd = (d: Drawdown, minute: boolean) =>
    d.maximumUsd > 0 ? (
      <>
        {money(d.maximumUsd)} ({d.percentOfNotional.toFixed(2)}% of $100,000)
        <span className="muted small block">
          {minute ? formatEt(d.peakTime!) : d.peakTime} → {minute ? formatEt(d.troughTime!) : d.troughTime}
          {d.recoveryTime ? '' : ' · not recovered by the end'}
        </span>
      </>
    ) : (
      na('no fall below an earlier peak')
    );
  return (
    <table className="metrics-table trading-metrics" data-testid={`trading-metrics-${symbol}`}>
      <tbody>
        <tr className="section">
          <th colSpan={2}>Trades · {symbol} (standalone)</th>
        </tr>
        {row('Closed trades', t.closed, 'metric-closed')}
        {row('Wins / losses / breakeven (net)', `${t.wins} / ${t.losses} / ${t.breakeven}`, 'metric-wins')}
        {row('Win rate (closed, net > 0)', pct(t.winRatePercent, noClosed), 'metric-winrate')}
        {row('Average net per closed trade', t.averageNetUsd === null ? na(noClosed) : signed(t.averageNetUsd))}
        {row(
          'Best / worst closed trade',
          t.bestNetUsd === null ? (
            na(noClosed)
          ) : (
            <>
              {signed(t.bestNetUsd)} / {signed(t.worstNetUsd!)}
            </>
          )
        )}
        {row(
          'Profit factor (net wins ÷ net losses)',
          t.profitFactor === null ? na(m.unavailable.profitFactor ?? 'no losing trades') : t.profitFactor.toFixed(2)
        )}
        {row(
          'Open position at the end',
          u ? `1 (marked at ${formatPrice(u.markPrice)} on ${u.markDate})` : na('none'),
          'metric-open'
        )}
        <tr className="section">
          <th colSpan={2}>P&amp;L on the $100,000 notional</th>
        </tr>
        {row('Realized gross before costs', signed(m.pnl.realizedGrossBeforeCostsUsd))}
        {row('Realized costs (both sides)', money(m.pnl.realizedCostsUsd))}
        {row('Realized margin interest', money(m.pnl.realizedInterestUsd))}
        {row('Realized net', signed(m.pnl.realizedNetUsd), 'metric-realized')}
        {row(
          'Unrealized net of the open position',
          u ? (
            <>
              {signed(u.netUsd)}
              <span className="muted small block">
                gross {money(u.grossBeforeCostsUsd)} − entry cost {money(u.entryCostUsd)} − accrued interest{' '}
                {money(u.accruedInterestUsd)}; exit cost not charged
              </span>
            </>
          ) : (
            na('no open position')
          ),
          'metric-unrealized'
        )}
        {row('Total marked net (realized + unrealized)', signed(m.pnl.totalMarkedNetUsd), 'metric-total')}
        {row(
          'Interest (all trades) · costs (all fills)',
          `${money(m.pnl.totalInterestUsd)} · ${money(m.pnl.totalCostsUsd)}`
        )}
        <tr className="section">
          <th colSpan={2}>Drawdowns of the marked net (% of the $100,000 notional)</th>
        </tr>
        {row('Minute marks', dd(m.drawdown.minute, true), 'metric-dd-minute')}
        {row('Daily marks (session closes)', dd(m.drawdown.daily, false), 'metric-dd-daily')}
        <tr className="section">
          <th colSpan={2}>Exposure and holding</th>
        </tr>
        {row(
          'Sessions invested',
          `${m.occupancy.sessionsInvested} of ${m.sessions} (${pct(m.occupancy.sessionsInvestedPercent, 'no sessions')})`
        )}
        {row('Calendar time invested', pct(m.occupancy.calendarTimeInvestedPercent, 'empty window'))}
        {row(
          'Holding, closed trades: mean / median',
          <>
            {days(m.holding.meanCalendarDays, noClosed)} / {days(m.holding.medianCalendarDays, noClosed)}
          </>
        )}
        {row('Longest holding (incl. open)', days(m.holding.longestCalendarDays, 'no trades'))}
        <tr className="section">
          <th colSpan={2}>Exits and signals</th>
        </tr>
        {row(
          'Exit reasons',
          Object.keys(t.exitReasons).length
            ? Object.entries(t.exitReasons)
                .map(([k, v]) => `${k} ${v}`)
                .join(' · ')
            : na(noClosed),
          'metric-exit-reasons'
        )}
        {row(
          'Raw signals: taken · ignored (invested / order pending) · unfilled',
          `${m.signals.raw}: ${m.signals.filled} · ${m.signals.rejectedByReason.position_open} / ${m.signals.rejectedByReason.order_pending} · ${m.signals.unfilledAtEnd}`,
          'metric-signals'
        )}
      </tbody>
    </table>
  );
}

const valueOf = (e: LabEvent | undefined, key: string): LabValue['value'] =>
  e?.values.find((v) => v.key === key)?.value ?? null;

/** The executed trades of ONE symbol of one run, from its (hash-verified) events: entry, exit, reason, P&L. */
export function TradeTable({
  events,
  role,
  symbol,
  unrealizedNet,
  selectedKey,
  onSelect
}: {
  events: readonly LabEvent[];
  role: Role;
  symbol: string;
  unrealizedNet: number | null;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const mine = events.filter((e) => e.symbol === symbol);
  const byId = new Map(mine.map((e) => [e.id, e]));
  const entries = mine.filter((e) => e.kind === 'executed_entry');
  if (entries.length === 0) return <p className="muted small">No executed trades for {symbol}.</p>;
  return (
    <div className="table-scroll">
      <table className="event-table trades-table" data-testid={`trade-table-${role}`}>
        <thead>
          <tr>
            <th scope="col">Trade</th>
            <th scope="col">Entry (ET)</th>
            <th scope="col">Entry fill</th>
            <th scope="col">Exit (ET)</th>
            <th scope="col">Exit fill</th>
            <th scope="col">Exit reason</th>
            <th scope="col">Held</th>
            <th scope="col">Net</th>
            <th scope="col">Net %</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((en) => {
            const ex = en.linkedEventId ? byId.get(en.linkedEventId) : undefined;
            const key = `${role}:${en.id}`;
            const net = ex ? (valueOf(ex, 'net') as number) : unrealizedNet;
            return (
              <tr
                key={en.id}
                data-trade={en.tradeId ?? ''}
                data-symbol={en.symbol}
                tabIndex={0}
                aria-selected={key === selectedKey}
                className={key === selectedKey ? 'is-selected' : undefined}
                onClick={() => onSelect(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(key);
                  }
                }}
              >
                <td className="mono small">{en.tradeId}</td>
                <td className="mono nowrap">{formatEt(en.t, en.timePrecision)}</td>
                <td className="mono num">{formatPrice(en.price)}</td>
                <td className="mono nowrap">{ex ? formatEt(ex.t, ex.timePrecision) : 'open at the end'}</td>
                <td className="mono num">{ex ? formatPrice(ex.price) : '—'}</td>
                <td className="small">{ex ? String(valueOf(ex, 'exitReason')) : 'still open (marked, not sold)'}</td>
                <td className="mono num">{ex ? `${Number(valueOf(ex, 'calendarDays')).toFixed(1)} d` : '—'}</td>
                <td className="mono num">
                  {net === null ? <span className="na">n/a</span> : signed(net)}
                  {!ex && net !== null && <span className="muted small"> (unrealized)</span>}
                </td>
                <td className="mono num">{ex ? `${Number(valueOf(ex, 'netReturn')).toFixed(2)}%` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
