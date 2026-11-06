// Per-year and per-window tables (brief §5) from a traced run and its ledger. Trades are attributed to the year of
// their ENTRY session; the "attributed net" column is the mark difference across the calendar year (Study 8's period
// attribution), which differs only by trades open across a year end. Drawdowns are of the strategy's marked P&L on
// the fixed $100,000 notional: minute-sampled (every minute close and official close) and daily (closes), each
// measured within the year from the mark at the previous year's last close.
import { quantile } from '../study8-expanded-regime-d1/stats.ts';
import type { RunResult } from './engine.ts';
import type { DoorView } from './lab.ts';
import type { LedgerRow } from './ledger.ts';

const r2 = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : v);

const drawdownOf = (values: ArrayLike<number>, from: number, to: number, start: number) => {
  let peak = start;
  let max = 0;

  for (let i = from; i < to; i++) {
    const v = values[i]!;

    if (v > peak) peak = v;
    if (peak - v > max) max = peak - v;
  }

  return max;
};

const streak = (nets: number[]) => {
  let worst = 0;
  let run = 0;

  for (const net of nets) {
    run = net <= 0 ? run + 1 : 0;
    worst = Math.max(worst, run);
  }

  return worst;
};

export const tradeStats = (rows: readonly LedgerRow[]) => {
  const closed = rows.filter((r) => r.exit_session !== '');
  const nets = rows.map((r) => r.net as number);
  const wins = closed.filter((r) => (r.net as number) > 0).map((r) => r.net as number);
  const losses = closed.filter((r) => (r.net as number) <= 0).map((r) => r.net as number);
  const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);

  return {
    trades: rows.length,
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? r2((wins.length / closed.length) * 100) : NaN,
    avgWin: wins.length ? r2(sum(wins) / wins.length) : NaN,
    avgLoss: losses.length ? r2(sum(losses) / losses.length) : NaN,
    medianNet: nets.length ? r2(quantile(nets, 0.5)) : NaN,
    expectancy: nets.length ? r2(sum(nets) / nets.length) : NaN,
    grossBeforeCosts: r2(sum(rows.map((r) => r.gross_before_costs as number))),
    costs: r2(sum(rows.map((r) => r.costs as number))),
    financing: r2(sum(rows.map((r) => r.financing as number))),
    net: r2(sum(nets)),
    profitFactor: losses.length && sum(losses) !== 0 ? r2(sum(wins) / Math.abs(sum(losses))) : NaN,
    worstTrade: nets.length ? r2(Math.min(...nets)) : NaN,
    p05Trade: nets.length ? r2(quantile(nets, 0.05)) : NaN,
    bestTrade: nets.length ? r2(Math.max(...nets)) : NaN,
    maxConsecutiveLosses: streak(closed.map((r) => r.net as number)),
    heldMinutes: r2(sum(rows.map((r) => r.holding_minutes as number))),
    medianHoldMinutes: rows.length
      ? r2(
          quantile(
            rows.map((r) => r.holding_minutes as number),
            0.5
          )
        )
      : NaN,
    overnightTrades: rows.filter((r) => (r.overnight_nights as number) > 0).length,
    stopLevelFills: rows.filter((r) => r.exit_execution === 'stop level').length
  };
};

export const yearTable = (view: DoorView, result: RunResult, rows: readonly LedgerRow[]) => {
  const { sessions } = view.market;
  const marks = result.marks!;
  const out = [];
  const years = [...new Set(sessions.date.slice(0, view.window.endSession + 1).map((d) => d.slice(0, 4)))];
  let markIndex = 0;
  let previousClose = 0;

  for (const year of years) {
    const first = sessions.date.findIndex((d) => d.startsWith(year));
    let last = first;

    while (last + 1 <= view.window.endSession && sessions.date[last + 1]!.startsWith(year)) last++;

    const yearEnd = sessions.closeTime[last]!;
    const markFrom = markIndex;

    while (markIndex < marks.count && marks.time[markIndex]! <= yearEnd) markIndex++;

    const daily = Array.from({ length: last - first + 1 }, (_v, i) => result.dailyMarks[first + i]!);
    const closeMark = result.dailyMarks[last]!;
    const regularMinutes = (() => {
      let total = 0;

      for (let s = first; s <= last; s++) total += (sessions.closeTime[s]! - view.sessions[s]!.openTime) / 60;

      return total;
    })();
    const yearRows = rows.filter((r) => String(r.entry_session).startsWith(year));
    const stats = tradeStats(yearRows);
    const partial = last === view.window.endSession && sessions.date[last]! < `${year}-12-24`;

    out.push({
      year: partial ? `${year} (partial, to ${sessions.date[last]})` : year,
      window: Number(year) <= 2024 ? 'development' : 'validation',
      sessions: last - first + 1,
      ...stats,
      attributedNet: r2(closeMark - previousClose),
      minuteDrawdownInYear: r2(drawdownOf(marks.value, markFrom, markIndex, previousClose)),
      dailyDrawdownInYear: r2(drawdownOf(daily, 0, daily.length, previousClose)),
      exposurePct: r2((stats.heldMinutes / regularMinutes) * 100)
    });
    previousClose = closeMark;
  }

  return out;
};

export const windowSummary = (label: string, rows: readonly LedgerRow[], extra: Record<string, unknown> = {}) => ({
  window: label,
  ...tradeStats(rows),
  ...extra
});

// Trading frequency (per session with an entry, per ISO week, per month) and time-of-day of entries and exits.
export const frequency = (rows: readonly LedgerRow[], sessionsInWindow: number) => {
  const perDay = new Map<string, number>();
  const perMonth = new Map<string, number>();
  const perWeek = new Map<string, number>();
  const entryHour = new Map<string, number>();
  const exitHour = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const r of rows) {
    const day = String(r.entry_session);
    const date = new Date(`${day}T12:00:00Z`);
    const thursday = new Date(date);

    thursday.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7));

    const week = `${thursday.getUTCFullYear()}-W${String(Math.ceil(((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)).padStart(2, '0')}`;

    bump(perDay, day);
    bump(perMonth, day.slice(0, 7));
    bump(perWeek, week);
    bump(entryHour, String(r.entry_time_et).slice(11, 13));
    if (r.exit_time_et) bump(exitHour, String(r.exit_time_et).slice(11, 13));
  }

  const dist = (m: Map<string, number>) => {
    const values = [...m.values()];

    return values.length
      ? { units: values.length, median: quantile(values, 0.5), p90: quantile(values, 0.9), max: Math.max(...values) }
      : { units: 0, median: 0, p90: 0, max: 0 };
  };

  return {
    sessionsWithEntry: perDay.size,
    sessionsInWindow,
    shareOfSessionsWithEntry: sessionsInWindow ? r2((perDay.size / sessionsInWindow) * 100) : NaN,
    entriesPerActiveSession: dist(perDay),
    entriesPerActiveWeek: dist(perWeek),
    entriesPerActiveMonth: dist(perMonth),
    entryHourET: Object.fromEntries([...entryHour.entries()].sort()),
    exitHourET: Object.fromEntries([...exitHour.entries()].sort())
  };
};

// P&L concentration: the share of net from the top k trades and top k entry days.
export const concentration = (rows: readonly LedgerRow[]) => {
  const net = rows.reduce((a, r) => a + (r.net as number), 0);
  const sorted = rows.map((r) => r.net as number).sort((a, b) => b - a);
  const byDay = new Map<string, number>();

  for (const r of rows)
    byDay.set(String(r.entry_session), (byDay.get(String(r.entry_session)) ?? 0) + (r.net as number));

  const days = [...byDay.values()].sort((a, b) => b - a);
  const top = (values: number[], k: number) => values.slice(0, k).reduce((a, b) => a + b, 0);

  return {
    net: r2(net),
    top1TradeShare: net > 0 ? r2(sorted[0]! / net) : NaN,
    top5TradesShare: net > 0 ? r2(top(sorted, 5) / net) : NaN,
    top10TradesShare: net > 0 ? r2(top(sorted, 10) / net) : NaN,
    top5DaysShare: net > 0 ? r2(top(days, 5) / net) : NaN,
    worst5Trades: sorted.slice(-5).map(r2),
    worst5Days: days.slice(-5).map(r2)
  };
};
