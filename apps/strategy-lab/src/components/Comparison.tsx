// Descriptive comparison of run A with the compared run B (GET /api/compare): comparability first, then the metrics
// side by side with B − A, the trades introduced / suppressed / shifted with their origin, and the continuation window
// outcomes. It never starts a run: a missing control is explained, not launched.

import { api, type ComparedTrade, type Comparison } from '../api.ts';
import { formatEt } from '../format.ts';
import { formatMoney } from '../trades.ts';
import { useFetched } from '../hooks.ts';

const ROWS: [string, string, 'usd' | 'pct' | 'n' | 'days'][] = [
  ['totalMarkedNetUsd', 'Total marked net', 'usd'],
  ['realizedNetUsd', 'Realized net', 'usd'],
  ['unrealizedNetUsd', 'Unrealized (open)', 'usd'],
  ['realizedGrossBeforeCostsUsd', 'Realized gross before costs', 'usd'],
  ['totalCostsUsd', 'Costs (per side)', 'usd'],
  ['totalInterestUsd', 'Margin interest', 'usd'],
  ['trades', 'Trades', 'n'],
  ['wins', 'Winning closed trades', 'n'],
  ['losses', 'Losing closed trades', 'n'],
  ['winRatePercent', 'Win rate', 'pct'],
  ['worstNetUsd', 'Worst closed trade', 'usd'],
  ['meanCalendarDaysHeld', 'Mean holding (closed)', 'days'],
  ['sessionsInvestedPercent', 'Sessions invested', 'pct'],
  ['minuteDrawdownUsd', 'Max drawdown, minute marks', 'usd'],
  ['dailyDrawdownUsd', 'Max drawdown, daily marks', 'usd'],
  ['netPerSessionInvestedUsd', 'Net per session invested', 'usd']
];

const fmt = (v: number | null | undefined, unit: 'usd' | 'pct' | 'n' | 'days') =>
  v === null || v === undefined
    ? '—'
    : unit === 'usd'
      ? formatMoney(v)
      : unit === 'pct'
        ? `${v.toFixed(1)}%`
        : unit === 'days'
          ? `${v.toFixed(1)} d`
          : String(Math.round(v * 100) / 100);

const tradeLine = (t: ComparedTrade) =>
  `${t.trade} · ${t.origin === 'continuation' ? `continuation (${t.method})` : 'base'} · decided ${formatEt(t.decision)} · ${t.status === 'open' ? 'open' : `${t.exitReason}, net ${formatMoney(t.net)}`}`;

export function ComparisonPanel({ a, b, symbol }: { a: string; b: string; symbol: string }) {
  const { data, error } = useFetched(`${a}|${b}`, (signal) => api.compare(a, b, signal));
  if (error) return <section className="card muted small">Comparison unavailable: {error}</section>;
  if (!data) return <section className="card muted small">Comparing {a} with {b}…</section>;
  const c: Comparison = data;
  const s = c.perSymbol[symbol];
  return (
    <section className="card comparison" aria-label="Comparison of A and B" data-testid="comparison">
      <div className="card-head">
        <h3>
          Compare · <span className="role-badge role-A">A</span> {c.a.id} ({c.a.continuation}) ·{' '}
          <span className="role-badge role-B">B</span> {c.b.id} ({c.b.continuation}) · {symbol}
        </h3>
      </div>
      <p className={c.comparable ? 'small' : 'warn small'} role="note" data-testid="comparison-verdict">
        {c.verdict}.
      </p>
      {c.mismatches.length > 0 && (
        <ul className="small" data-testid="comparison-mismatches">
          {c.mismatches.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {!c.comparable && <p className="muted small">{c.control}</p>}
      <p className="muted small" data-testid="comparison-nonadditivity">
        {c.nonAdditivity}
      </p>
      {!s ? (
        <p className="muted small">{symbol} is not a symbol of both runs.</p>
      ) : (
        <>
          {s.metrics.a && s.metrics.b && (
            <table className="kv-table comparison-table" data-testid="comparison-metrics">
              <thead>
                <tr>
                  <th scope="col">{symbol}</th>
                  <th scope="col">A</th>
                  <th scope="col">B</th>
                  <th scope="col">B − A</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([k, label, unit]) => (
                  <tr key={k}>
                    <th scope="row">{label}</th>
                    <td className="mono num">{fmt(s.metrics.a![k], unit)}</td>
                    <td className="mono num">{fmt(s.metrics.b![k], unit)}</td>
                    <td className="mono num">{fmt(s.metrics.bMinusA?.[k], unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small" data-testid="comparison-trades">
            Trades matched by decision instant: {s.trades.identical} identical, {s.trades.shifted.length} shifted (same
            decision, other fill or exit), {s.trades.introduced.length} only in B, {s.trades.suppressed.length} only in A.
            B by origin: {Object.entries(s.trades.byOriginB).map(([k, n]) => `${k} ${n}`).join(', ') || '—'}.
          </p>
          {(s.trades.introduced.length > 0 || s.trades.suppressed.length > 0 || s.trades.shifted.length > 0) && (
            <details className="small">
              <summary>Trade chronology differences</summary>
              <ul>
                {s.trades.introduced.map((t) => (
                  <li key={`i${t.trade}`}>Only in B: {tradeLine(t)}</li>
                ))}
                {s.trades.suppressed.map((t) => (
                  <li key={`s${t.trade}`}>Only in A: {tradeLine(t)}</li>
                ))}
                {s.trades.shifted.map((x) => (
                  <li key={`x${x.b.trade}`}>
                    Shifted: A {tradeLine(x.a)} → B {tradeLine(x.b)}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {(['a', 'b'] as const).map((role) => {
            const k = s.continuation[role] as Record<string, number | string> | null;
            return k ? (
              <p key={role} className="small" data-testid={`comparison-continuation-${role}`}>
                Continuation windows of {role.toUpperCase()}: {k.episodes} opened; {k.filled} captured (their trades’ net{' '}
                {formatMoney(Number(k.capturedNetUsd))}, descriptive); {k.expired} expired ({k.missedWithHigherHigh} with a
                later higher high: possibly missed); {k.closedByBaseEntry} closed by a base entry; {k.tooDeep} too deep;{' '}
                {k.openAtEnd} open at the end.
              </p>
            ) : null;
          })}
        </>
      )}
    </section>
  );
}
