// Synthetic minute data for the D1 risk-control tests: sessions on given New York dates (weekends and holidays are
// simply absent dates), minute bars with explicit open/high/low/close at chosen minute slots (missing minutes are
// absent slots), an optional closing print and early closes. No market data is read.
import type { MarketSession, Tick } from '#types';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import type { LotState, StrategyParams } from '../../shared-margin-portfolio/strategy.ts';
import { strategies } from '../../shared-margin-portfolio/strategy.ts';

const spm = 60;

export interface Bar {
  o: number;
  c: number;
  h?: number;
  l?: number;
  slot?: number; // minutes after 09:30 New York (default: the bar's position)
}

export interface SessionOptions {
  closingPrint?: number | null; // default: the last close; null = no closing print
  early?: boolean; // a 13:00 close
}

export const sessionOf = (date: string, bars: Bar[], o: SessionOptions = {}): MarketSession => {
  const time = Date.parse(date) / 1000;
  const openTime = time + (14 * 60 + 30) * spm;
  const closeTime = time + (o.early ? 18 : 21) * 60 * spm;
  const ticks: Tick[] = bars.map((b, i) => ({
    time: openTime + (b.slot ?? i) * spm,
    open: b.o,
    high: b.h ?? Math.max(b.o, b.c),
    low: b.l ?? Math.min(b.o, b.c),
    close: b.c,
    volume: 1000,
    trades: NaN
  }));
  const last = bars.at(-1)!.c;

  return {
    date,
    time,
    openTime,
    closeTime,
    isEarlyClose: Boolean(o.early),
    bars: ticks,
    open: ticks[0]!.open,
    high: Math.max(...ticks.map((t) => t.high)),
    low: Math.min(...ticks.map((t) => t.low)),
    close: last,
    volume: 1000 * ticks.length,
    trades: NaN,
    closingPrint: o.closingPrint === null ? undefined : (o.closingPrint ?? last)
  };
};

// A flat session at price p: `n` minutes with open = close = p (and optional low/high wicks on one minute).
export const flat = (date: string, p: number, n = 4, o: SessionOptions = {}) =>
  sessionOf(date, Array.from({ length: n }, () => ({ o: p, c: p })), o);

// Consecutive weekdays from a start date (Saturdays and Sundays skipped), as YYYY-MM-DD.
export const weekdays = (count: number, start = '2021-03-01') => {
  const out: string[] = [];

  for (let t = Date.parse(start); out.length < count; t += 86400_000) {
    const d = new Date(t).getUTCDay();

    if (d !== 0 && d !== 6) out.push(new Date(t).toISOString().slice(0, 10));
  }

  return out;
};

export const datasetOf = (sessions: MarketSession[]): Dataset => fixtureDataset(sessions);

// D1 params for exit-side tests: the shipped D1 with an explicit stop, hold and buffer.
export const exitParams = (o: Partial<StrategyParams> = {}): StrategyParams => ({
  ...strategies.d1,
  trailingStopPercentage: 0.05,
  maximumHoldDays: 5,
  intradayLossBuffer: 0.02,
  ...o
});

// A $100,000 lot filled at `price` (after cost) in session s of ds.
export const lotAt = (ds: Dataset, s: number, price: number): LotState => ({
  entryPrice: price,
  shares: 100_000 / price,
  investment: 100_000,
  entryTimestamp: ds.sTime[s]!,
  holdTimestamp: ds.sTime[s]!
});
