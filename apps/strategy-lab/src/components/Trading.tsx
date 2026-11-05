// Results of a trading backtest (rise-from-recent-low-trading): the per-symbol metrics block and the trade ledger.
// Each symbol is a standalone backtest on its own $100,000 notional: nothing here is summed across symbols. A figure the
// run could not compute is shown as "n/a" with its reason, never as 0.

import { type ReactNode, useEffect, useRef, useState } from 'react';

import type { EntryGateCounts } from '../../shared/artifact-types.ts';
import type { LabEvent, LabValue } from '../../shared/contract.ts';
import type { Role } from '../chart/markers.ts';
import { formatEt, formatPrice } from '../format.ts';
import { formatMoney, isClosedLoss, originOf, pnlText, toneOf, type Trade, tradeList } from '../trades.ts';

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
    // Growth 1.2.0 with an entry gate ON
    vetoed?: number;
    vetoedByReason?: Record<string, number>;
    deferred?: number;
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
  entryGates?: EntryGateCounts;
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
        {m.entryGates && <EntryGateRows g={m.entryGates} signals={m.signals} row={row} />}
        {row(
          'Raw signals: taken · ignored (invested / order pending) · unfilled',
          `${m.signals.raw}: ${m.signals.filled} · ${m.signals.rejectedByReason.position_open} / ${m.signals.rejectedByReason.order_pending} · ${m.signals.unfilledAtEnd}`,
          'metric-signals'
        )}
      </tbody>
    </table>
  );
}

// Growth 1.2.0: the entry trend filter and persistent eligibility counts (descriptive; only when a gate was ON).
function EntryGateRows({
  g,
  signals,
  row
}: {
  g: EntryGateCounts;
  signals: TradingSymbolMetrics['signals'];
  row: (label: string, value: ReactNode, testId?: string) => ReactNode;
}) {
  const e = g.eligibility;
  const list = (o: Record<string, number> | undefined) =>
    Object.entries(o ?? {})
      .filter(([, n]) => n)
      .map(([k, n]) => `${k} ${n}`)
      .join(' · ') || 'none';
  return (
    <>
      <tr className="section">
        <th colSpan={2}>Entry gates (descriptive; the effect needs a paired OFF run)</th>
      </tr>
      {row(
        'Raw crossings vetoed · deferred (armed)',
        `${signals.vetoed ?? 0} (${list(signals.vetoedByReason)}) · ${signals.deferred ?? 0}`,
        'metric-gate-signals'
      )}
      {g.trendFilter.enabled &&
        row(
          `Trend filter (${g.trendFilter.method}): evaluations · blocked`,
          `${g.trendFilter.evaluations} · ${Object.entries(g.trendFilter.blockedByDecisionKind ?? {})
            .map(([k, v]) => `${k}: ${list(v)}`)
            .join('; ') || 'none'}`,
          'metric-trend'
        )}
      {e.enabled && (
        <>
          {row(
            `Opportunities (${e.policy}) · ended by`,
            `${e.opportunities} · ${list(e.endedBy)}`,
            'metric-opportunities'
          )}
          {row('Invalidated by', list(e.invalidatedByReason))}
          {row(
            'Taken at arming · later · age at decision (mean / max)',
            `${e.takenAtArming} · ${e.takenLater} · ${e.ageSessionsAtDecision?.mean?.toFixed(2) ?? 'n/a'} / ${e.ageSessionsAtDecision?.max ?? 'n/a'} sessions`,
            'metric-opportunity-age'
          )}
          {e.policy === 'reset_renew' &&
            row('Renewal watches · resets · ended by', `${e.renewals?.watches ?? 0} · ${e.renewals?.resets ?? 0} · ${list(e.renewals?.endedBy)}`, 'metric-renewals')}
        </>
      )}
      {row(
        'Trades by entry source (closed W/L · open · realized net)',
        <>
          {Object.entries(g.bySource).map(([k, v]) => (
            <span key={k} className="block" data-testid={`metric-source-${k}`}>
              {k}: {v.entries} ({v.wins}/{v.losses} · {v.open} open) · {signed(v.realizedNetUsd)}
            </span>
          ))}
        </>,
        'metric-by-source'
      )}
    </>
  );
}

const valueOf = (e: LabEvent | null, key: string): LabValue['value'] =>
  e?.values.find((v) => v.key === key)?.value ?? null;

/** A trade's net P&L, coloured, labelled unrealized for an open position, or the reason it is unavailable. */
export function PnlBadge({ trade, testId, compact }: { trade: Trade; testId?: string; compact?: boolean }) {
  const tone = toneOf(trade);
  if (!trade.pnl)
    return (
      <span className="na" data-testid={testId} data-tone="unknown">
        P&amp;L unavailable — {trade.pnlUnavailable}
      </span>
    );
  return (
    <span className={`pnl tone-${tone}`} data-testid={testId} data-tone={tone} data-net={trade.pnl.netUsd}>
      {pnlText(trade)}
      {trade.pnl.unrealized ? (
        <span className="pnl-kind">
          {' '}
          unrealized{!compact && trade.pnl.markDate ? ` (marked ${trade.pnl.markDate})` : ''}
        </span>
      ) : (
        !compact && <span className="pnl-kind"> realized</span>
      )}
    </span>
  );
}

/** The executed trades of ONE symbol of one run (already built from its events), the selected one highlighted. */
const ORIGIN_SHORT: Record<string, string> = {
  classic_d1: 'Classic D1',
  breakout: 'breakout',
  shallow_pullback: 'shallow pullback',
  ma_cross: 'MA cross'
};

const SOURCE_SHORT: Record<string, string> = {
  'latched:rise_from_recent_low': 'latched',
  eligibility_renewal: 'renewal',
  'latched:eligibility_renewal': 'latched renewal'
};

export const originLabel = (t: Trade) => {
  const o = originOf(t);
  if (!o) return null;
  if (o.origin === 'continuation') return `continuation · ${ORIGIN_SHORT[o.method ?? ''] ?? o.method}`;
  // Growth 1.2.0: a later decision of an armed opportunity, or a renewal signal
  const source = t.entry?.meta?.entrySource;
  const opportunity = t.entry?.meta?.opportunity;
  return typeof source === 'string' && SOURCE_SHORT[source]
    ? `base Growth · ${SOURCE_SHORT[source]}${typeof opportunity === 'string' ? ` ${opportunity}` : ''}`
    : 'base Growth';
};

export function TradeTable({
  trades,
  role,
  selectedTradeKey,
  onSelect,
  lossesOnly: lossesOnlyProp,
  onLossesOnly
}: {
  trades: ReadonlyMap<string, Trade>;
  role: Role;
  selectedTradeKey: string | null;
  onSelect: (trade: Trade) => void;
  /** "Closed losses only", owned by the page when given (it survives a result swap). */
  lossesOnly?: boolean;
  onLossesOnly?: (on: boolean) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [ownLossesOnly, setOwnLossesOnly] = useState(false);
  const lossesOnly = lossesOnlyProp ?? ownLossesOnly;
  const setLossesOnly = onLossesOnly ?? setOwnLossesOnly;
  const all = tradeList(trades);
  const rows = lossesOnly ? all.filter(isClosedLoss) : all;
  const withOrigin = all.some((t) => originOf(t) !== null);
  const hiddenSelection = lossesOnly && selectedTradeKey ? all.find((t) => t.key === selectedTradeKey && !isClosedLoss(t)) : undefined;
  // Bring the selected trade's row into view inside the table's own scroll box (never the page).
  useEffect(() => {
    const el = box.current;
    if (!el || !selectedTradeKey) return;
    const row = el.querySelector<HTMLElement>(`tr[data-trade-key="${CSS.escape(selectedTradeKey)}"]`);
    if (!row) return;
    const head = el.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const r = row.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (r.top < b.top + head) el.scrollTop -= b.top + head - r.top;
    else if (r.bottom > b.bottom) el.scrollTop += r.bottom - b.bottom;
  }, [selectedTradeKey, trades, lossesOnly]);
  return (
    <>
      <div className="trade-filter" data-testid={`trade-filter-${role}`}>
        <label className="switch-row small">
          <input
            type="checkbox"
            checked={lossesOnly}
            onChange={(e) => setLossesOnly(e.target.checked)}
            data-testid={`losses-only-${role}`}
            aria-describedby={`losses-only-help-${role}`}
          />
          <span>Closed losses only</span>
        </label>
        <span className="muted small" data-testid={`trade-count-${role}`} aria-live="polite">
          {lossesOnly ? `${rows.length} of ${all.length} trades: closed with a net loss` : `${all.length} trades`}
        </span>
        <span id={`losses-only-help-${role}`} className="visually-hidden">
          Shows only closed trades whose recorded net P&amp;L after costs and interest is below zero; open positions and
          breakevens are excluded. Chart markers are not affected.
        </span>
      </div>
      {hiddenSelection && (
        <p className="warn small" role="status" data-testid={`hidden-selection-${role}`}>
          The selected trade {hiddenSelection.tradeId} is hidden by “Closed losses only” (
          {hiddenSelection.status === 'open'
            ? 'it is still open'
            : hiddenSelection.pnl
              ? hiddenSelection.pnl.netUsd > 0
                ? 'it closed with a net profit'
                : 'it closed at exactly breakeven'
              : 'its net P&L is not recorded'}
          ); its details stay below.{' '}
          <button type="button" className="btn-chip" onClick={() => setLossesOnly(false)} data-testid={`show-all-${role}`}>
            Show all trades
          </button>
        </p>
      )}
      <div className="table-scroll" ref={box}>
        <table className="event-table trades-table" data-testid={`trade-table-${role}`}>
          <thead>
            <tr>
              <th scope="col">Trade</th>
              {withOrigin && <th scope="col">Origin</th>}
              <th scope="col">Entry (ET)</th>
              <th scope="col">Entry fill</th>
              <th scope="col">Exit (ET)</th>
              <th scope="col">Exit fill</th>
              <th scope="col">Exit reason</th>
              <th scope="col">Held</th>
              <th scope="col">Net P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={withOrigin ? 9 : 8} className="muted small" data-testid={`trade-empty-${role}`}>
                  {lossesOnly
                    ? 'No closed trade of this symbol lost money after costs and interest.'
                    : 'No executed trades for this symbol.'}
                </td>
              </tr>
            )}
            {rows.map((t) => {
              const on = t.key === selectedTradeKey;
              return (
                <tr
                  key={t.key}
                  data-trade={t.tradeId}
                  data-trade-key={t.key}
                  data-symbol={t.symbol}
                  tabIndex={0}
                  aria-selected={on}
                  className={on ? 'is-selected' : undefined}
                  onClick={() => onSelect(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(t);
                    }
                  }}
                >
                  <td className="mono small">{t.tradeId}</td>
                  {withOrigin && (
                    <td className="small" data-testid="trade-origin">
                      {originLabel(t) ?? '—'}
                    </td>
                  )}
                  <td className="mono nowrap">{t.entry ? formatEt(t.entry.t, t.entry.timePrecision) : 'not recorded'}</td>
                  <td className="mono num">{t.entry ? formatPrice(t.entry.price) : '—'}</td>
                  <td className="mono nowrap">
                    {t.exit ? formatEt(t.exit.t, t.exit.timePrecision) : t.status === 'open' ? 'open at the end' : '—'}
                  </td>
                  <td className="mono num">{t.exit ? formatPrice(t.exit.price) : '—'}</td>
                  <td className="small">
                    {t.exit
                      ? (t.exitReason ?? 'not recorded')
                      : t.status === 'open'
                        ? 'still open (marked, not sold)'
                        : t.problem}
                  </td>
                  <td className="mono num">{t.heldDays === null ? '—' : `${t.heldDays.toFixed(1)} d`}</td>
                  <td className="mono num">
                    <PnlBadge trade={t} compact />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** The selected trade's details, beneath the list. */
export function TradeDetail({ trade }: { trade: Trade | null }) {
  if (!trade)
    return (
      <p className="muted small trade-detail-empty" data-testid="trade-detail">
        Select a trade (a row, or its entry or exit marker on the chart) to see its details here.
      </p>
    );
  // Recorded amounts of the exit: the gross P&L signed; costs and interest as the (positive) amounts charged.
  const money = (key: string, label: string, signed: boolean) => {
    const v = valueOf(trade.exit, key);
    return typeof v === 'number' ? (
      <>
        <dt>{label}</dt>
        <dd className="mono">
          {signed
            ? formatMoney(v)
            : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </dd>
      </>
    ) : null;
  };
  return (
    <section
      className="trade-detail"
      aria-label={`Trade ${trade.tradeId}`}
      data-testid="trade-detail"
      data-trade-key={trade.key}
    >
      <h4>
        <span className={`role-badge role-${trade.role}`}>{trade.role}</span> {trade.runId} · {trade.symbol} ·{' '}
        <span className="mono">{trade.tradeId}</span> ·{' '}
        {trade.status === 'closed' ? 'closed' : trade.status === 'open' ? 'open at the end of the run' : 'not linked'}
      </h4>
      <dl className="detail-grid">
        <dt>Entry</dt>
        <dd>
          {trade.entry
            ? `${formatEt(trade.entry.t, trade.entry.timePrecision)} at ${formatPrice(trade.entry.price)}`
            : 'not recorded'}
          {trade.entry?.reason && <span className="muted small block">{trade.entry.reason}</span>}
        </dd>
        <dt>Exit</dt>
        <dd>
          {trade.exit
            ? `${formatEt(trade.exit.t, trade.exit.timePrecision)} at ${formatPrice(trade.exit.price)}`
            : trade.status === 'open'
              ? 'none yet — the position is still open (marked, not sold)'
              : (trade.problem ?? 'not recorded')}
          {trade.exit?.reason && <span className="muted small block">{trade.exit.reason}</span>}
        </dd>
        {trade.exitReason && (
          <>
            <dt>Exit reason</dt>
            <dd>{trade.exitReason}</dd>
          </>
        )}
        <dt>Held</dt>
        <dd>{trade.heldDays === null ? '—' : `${trade.heldDays.toFixed(1)} calendar days`}</dd>
        <dt>Net P&amp;L</dt>
        <dd>
          <PnlBadge trade={trade} testId="trade-detail-pnl" />
          {trade.pnl && <span className="muted small block">{trade.pnl.basis}</span>}
        </dd>
        {money('gross', 'Gross P&L', true)}
        {money('costs', 'Costs charged', false)}
        {money('friction', 'Friction (costs) charged', false)}
        {money('interest', 'Margin interest charged', false)}
      </dl>
    </section>
  );
}
