// Synthetic minute data for the lifecycle tests (no market data is read): daily sessions of a few minute bars each,
// on both symbols (one shared calendar, as the pool requires).
import type { MarketSession, Tick } from '#types';
import type { RiseTradingParams } from '../../growth-trading/riseTrading.ts';
import { type Door, fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';

const spm = 60;

// One session: minute closes at slots 0..n−1 after 09:30 New York (14:30 UTC); the scheduled close at 21:00 UTC. The
// first bar opens at `open` (default: its own close), later bars at the previous close.
export const session = (date: string, closes: number[], open?: number): MarketSession => {
  const time = Date.parse(date) / 1000;
  const openTime = time + (14 * 60 + 30) * spm;
  const closeTime = time + 21 * 60 * spm;
  const bars: Tick[] = closes.map((close, i) => {
    const o = i === 0 ? (open ?? close) : closes[i - 1]!;

    return {
      time: openTime + i * spm,
      open: o,
      high: Math.max(o, close),
      low: Math.min(o, close),
      close,
      volume: 1000,
      trades: NaN
    };
  });

  return {
    date,
    time,
    openTime,
    closeTime,
    isEarlyClose: false,
    bars,
    open: bars[0]!.open,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    close: closes.at(-1)!,
    volume: 1000 * bars.length,
    trades: NaN,
    closingPrint: closes.at(-1)!
  };
};

// Weekdays from a start date (skipping weekends, 1 January and 25 December: a year boundary as the market crosses it).
export const weekdays = (n: number, start: string) => {
  const out: string[] = [];

  for (let t = Date.parse(start); out.length < n; t += 86400 * 1000) {
    const d = new Date(t);

    const iso = d.toISOString().slice(0, 10);

    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !['01-01', '12-25'].includes(iso.slice(5))) out.push(iso);
  }
  return out;
};

// Sessions whose minute closes are flat at each session's close; `opens` (optional) sets a gap at a session's open.
export const pathOf = (closes: number[], start = '2019-01-02', opens: Record<number, number> = {}) => {
  const dates = weekdays(closes.length, start);

  return closes.map((c, s) => session(dates[s]!, [c, c, c], opens[s] ?? (s > 0 ? closes[s - 1]! : c)));
};

export const doorOf = (gdx: number[], vgt: number[] = gdx, start?: string, opens?: Record<number, number>): Door =>
  fixtureDoorOf('lifecycle', { GDX: pathOf(gdx, start, opens), VGT: pathOf(vgt, start, opens) });

// A plain Rise book: X%, N bars, a 5% trailing stop, no hold, no gates (each test adds what it needs).
export const riseParams = (x: number, n: number, extra: Partial<RiseTradingParams> = {}): RiseTradingParams => ({
  advanceFromRecentLowPercent: x,
  recentLowLookbackBars: n,
  resolution: '1d',
  trailingStopPercent: 5,
  maximumHoldEnabled: false,
  maximumHoldDays: 8, // not read with the hold OFF
  intradayLossBufferEnabled: false,
  intradayLossBufferPercent: 0,
  costBpsPerSide: 5,
  ...extra
});
