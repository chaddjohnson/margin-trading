// The descriptive ledgers of PROTOCOL.md §13 (hindsight labels; never decision inputs) and the procedure path Π of §3.
import type { Dataset } from '../four-family/data.ts';
import type { DailyRow } from './engine.ts';
import type { TradeRow } from './metrics.ts';

export interface Leg {
  t0: number;
  t1: number;
  from: string;
  to: string;
  gain: number;
  confirmed: boolean;
}

// Up-legs of a 10% zigzag on daily closes (from the first session), trough → next peak, gaining ≥ 15%, inside
// [firstIndex, endIndex]; a final unconfirmed leg counts if it gains ≥ 15% to the end.
export const upLegs = (ds: Dataset, firstIndex: number, endIndex: number, reversal = 0.1, minimum = 0.15): Leg[] => {
  const C = ds.sClose;
  const pivots: { index: number; kind: 'low' | 'high' }[] = [];
  let mode: 'none' | 'up' | 'down' = 'none';
  let hi = 0;
  let lo = 0;
  let hiAt = 0;
  let loAt = 0;

  for (let s = 0; s <= endIndex; s++) {
    const c = C[s]!;

    if (s === 0) {
      hi = lo = c;
      continue;
    }

    if (mode === 'none') {
      if (c > hi) {
        hi = c;
        hiAt = s;
      }

      if (c < lo) {
        lo = c;
        loAt = s;
      }

      if (c >= lo * (1 + reversal)) {
        pivots.push({ index: loAt, kind: 'low' });
        mode = 'up';
        hi = c;
        hiAt = s;
      } else if (c <= hi * (1 - reversal)) {
        pivots.push({ index: hiAt, kind: 'high' });
        mode = 'down';
        lo = c;
        loAt = s;
      }
    } else if (mode === 'up') {
      if (c > hi) {
        hi = c;
        hiAt = s;
      }

      if (c <= hi * (1 - reversal)) {
        pivots.push({ index: hiAt, kind: 'high' });
        mode = 'down';
        lo = c;
        loAt = s;
      }
    } else {
      if (c < lo) {
        lo = c;
        loAt = s;
      }

      if (c >= lo * (1 + reversal)) {
        pivots.push({ index: loAt, kind: 'low' });
        mode = 'up';
        hi = c;
        hiAt = s;
      }
    }
  }

  const legs: Leg[] = [];

  for (let i = 0; i < pivots.length; i++) {
    const p = pivots[i]!;

    if (p.kind !== 'low') {
      continue;
    }

    const next = pivots[i + 1];
    const t1 = next ? next.index : mode === 'up' ? hiAt : -1;

    if (t1 < 0) {
      continue;
    }

    const t0 = Math.max(p.index, firstIndex);

    if (t1 <= t0 || t1 > endIndex) {
      continue;
    }

    const gain = C[t1]! / C[t0]! - 1;

    if (gain >= minimum) {
      legs.push({ t0, t1, from: ds.dates[t0]!, to: ds.dates[t1]!, gain, confirmed: Boolean(next) });
    }
  }

  return legs;
};

export const legStats = (ds: Dataset, leg: Leg, trades: TradeRow[], daily: DailyRow[], firstIndex: number) => {
  const C = ds.sClose;
  const { t0, t1 } = leg;
  let gain = 0;
  let firstEntry = -1;
  let lost = 0;

  const lots = [...trades].sort((a, b) => a.entryIndex - b.entryIndex || a.entryBar - b.entryBar);

  for (const lot of lots) {
    const exitIndex = lot.exitIndex < 0 ? Infinity : lot.exitIndex;

    if (exitIndex <= t0 || lot.entryIndex > t1) {
      continue;
    }

    const start = lot.entryIndex > t0 ? lot.entryRaw : C[t0]!;
    const end = exitIndex <= t1 ? lot.exitRaw : C[t1]!;

    gain += lot.shares * (end - start);

    if (lot.entryIndex > t0 && lot.tranche === 0 && firstEntry < 0) {
      firstEntry = lot.entryIndex;
    }
  }

  // exits inside the leg and the next entry
  const positions = lots.filter((lot) => lot.tranche === 0);

  for (let i = 0; i < positions.length; i++) {
    const lot = positions[i]!;

    if (lot.exitIndex < 0 || lot.exitIndex <= t0 || lot.exitIndex >= t1) {
      continue;
    }

    const next = positions.find(
      (other) =>
        other.entryIndex > lot.exitIndex || (other.entryIndex === lot.exitIndex && other.entryBar > lot.exitBar)
    );
    const after = next && next.entryIndex < t1 ? next.entryRaw : C[t1]!;

    lost += Math.max(0, after - lot.exitRaw) / lot.exitRaw;
  }

  let idle = 0;

  for (let s = t0 + 1; s <= t1; s++) {
    if ((daily[s - firstIndex]?.invested ?? 0) === 0) {
      idle++;
    }
  }

  const mark = (s: number) => daily[s - firstIndex]?.liquidation ?? 0;

  return {
    from: leg.from,
    to: leg.to,
    legGain: leg.gain,
    capture: gain / (100000 * leg.gain),
    entryDelay: firstEntry < 0 ? null : firstEntry - t0,
    idleShare: idle / (t1 - t0),
    lostPostStopGain: lost,
    net: mark(t1) - mark(t0)
  };
};

export const episodes = [
  { key: 'E2018', from: '2018-10-01', to: '2019-04-30' },
  { key: 'ECOVID', from: '2020-02-19', to: '2020-08-31' },
  { key: 'E2021', from: '2021-01-04', to: '2021-12-31' },
  { key: 'E2022', from: '2022-01-03', to: '2022-12-30' },
  { key: 'E2023', from: '2023-01-03', to: '2023-12-29' }
] as const;

// Net (liquidation-mark change from the session before `from` to `to`), daily drawdown and lots per episode.
export const episodeStats = (ds: Dataset, daily: DailyRow[], trades: TradeRow[], firstIndex: number) =>
  episodes.map((episode) => {
    const a = Math.max(firstIndex, ds.dates.findIndex((date) => date >= episode.from) - 1);
    let b = -1;

    for (let s = ds.sessionCount - 1; s >= 0; s--) {
      if (ds.dates[s]! <= episode.to) {
        b = s;
        break;
      }
    }

    const rows = daily.slice(a - firstIndex, b - firstIndex + 1);
    let peak = rows[0]?.mark ?? 0;
    let dd = 0;
    let invested = 0;

    for (const row of rows) {
      peak = Math.max(peak, row.mark);
      dd = Math.max(dd, peak - row.mark);
      invested += row.invested > 0 ? 1 : 0;
    }

    return {
      ...episode,
      net: (daily[b - firstIndex]?.liquidation ?? 0) - (daily[a - firstIndex]?.liquidation ?? 0),
      dailyDrawdown: dd,
      lots: trades.filter((t) => t.entryIndex > a && t.entryIndex <= b).length,
      exposure: rows.length ? invested / rows.length : 0
    };
  });

// Calendar-year increments of the liquidation mark.
export const yearly = (ds: Dataset, daily: DailyRow[], firstIndex: number) => {
  const out: Record<string, number> = {};
  let previous = daily[0]?.liquidation ?? 0;

  for (let i = 1; i < daily.length; i++) {
    const s = i + firstIndex;
    const year = ds.dates[s]!.slice(0, 4);
    const isLast = i === daily.length - 1 || ds.dates[s + 1]!.slice(0, 4) !== year;

    if (isLast) {
      out[year] = daily[i]!.liquidation - previous;
      previous = daily[i]!.liquidation;
    }
  }

  return out;
};

// The procedure path Π (PROTOCOL.md §3): windows chained, each starting at the previous end, the peak carried.
export interface WindowPath {
  boundaryMark: number;
  endMark: number;
  minuteMin: number;
  minuteMax: number;
  internalDrawdown: number;
}

export const chainWindows = (windows: WindowPath[]) => {
  let value = 0;
  let peak = 0;
  let drawdown = 0;

  for (const w of windows) {
    const offset = value - w.boundaryMark;

    drawdown = Math.max(drawdown, w.internalDrawdown, peak - (w.minuteMin + offset));
    peak = Math.max(peak, w.minuteMax + offset);
    value = w.endMark + offset;
  }

  return { minuteDrawdown: drawdown, end: value };
};

// The candidate's daily-mark changes split by whether the sealed D1 ledger held a lot at the close (descriptive).
export const d1Overlap = (
  ds: Dataset,
  daily: DailyRow[],
  firstIndex: number,
  d1: { entryDate: string; exitDate: string | null }[]
) => {
  const held = new Set<string>();

  for (const lot of d1) {
    const start = ds.dates.indexOf(lot.entryDate);
    const end = lot.exitDate ? ds.dates.indexOf(lot.exitDate) - 1 : ds.sessionCount - 1;

    for (let s = start; s <= end; s++) {
      held.add(ds.dates[s]!);
    }
  }

  let idleChange = 0;
  let busyChange = 0;
  let idleSessions = 0;
  let idleInvested = 0;

  for (let i = 1; i < daily.length; i++) {
    const s = i + firstIndex;
    const change = daily[i]!.liquidation - daily[i - 1]!.liquidation;
    const d1HeldBefore = held.has(ds.dates[s - 1]!);

    if (d1HeldBefore) {
      busyChange += change;
    } else {
      idleChange += change;
      idleSessions++;
      idleInvested += daily[i - 1]!.invested > 0 ? 1 : 0;
    }
  }

  return {
    d1HeldSessions: held.size,
    changeWhileD1Idle: idleChange,
    changeWhileD1Holding: busyChange,
    d1IdleSessions: idleSessions,
    candidateInvestedShareOfD1Idle: idleSessions ? idleInvested / idleSessions : 0
  };
};
