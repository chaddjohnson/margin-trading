// Synthetic sessions for the study's tests: consecutive weekdays from 2016-01-04, minute bars from 14:30 UTC, the
// closing print one minute after the last bar unless given. Nothing here touches market data.
import type { Tick } from '#types';
import type { MarketSession } from '#types';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import { type RunOptions, mulberry32 } from '../engine.ts';

export type Bar = [open: number, high: number, low: number, close: number];

export interface SessionSpec {
  bars: Bar[];
  closingPrint?: number | null; // null: no closing print
  earlyClose?: boolean;
  missing?: number[]; // minute offsets with no bar (the remaining bars keep their clock positions)
}

export const weekdays = (count: number, from = '2016-01-04') => {
  const dates: string[] = [];
  let t = Date.parse(`${from}T00:00:00Z`);

  while (dates.length < count) {
    const day = new Date(t).getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(t).toISOString().slice(0, 10));
    }

    t += 86400000;
  }

  return dates;
};

const buildSession = (date: string, spec: SessionSpec): MarketSession => {
  const time = Date.parse(`${date}T00:00:00Z`) / 1000;
  const openTime = time + 14.5 * 3600;
  const minutes = spec.bars.length + (spec.missing?.length ?? 0);
  const closeTime = openTime + minutes * 60;
  const bars: Tick[] = [];
  let slot = 0;

  for (const [open, high, low, close] of spec.bars) {
    while (spec.missing?.includes(slot)) {
      slot++;
    }

    bars.push({ time: openTime + slot * 60, open, high, low, close, volume: 100, trades: 1 });
    slot++;
  }

  const closingPrint = spec.closingPrint === null ? undefined : (spec.closingPrint ?? bars.at(-1)!.close);
  const close = closingPrint ?? bars.at(-1)!.close;

  return {
    date,
    time,
    openTime,
    closeTime,
    isEarlyClose: Boolean(spec.earlyClose),
    bars,
    open: bars[0]!.open,
    high: Math.max(...bars.map((bar) => bar.high), close),
    low: Math.min(...bars.map((bar) => bar.low), close),
    close,
    volume: bars.length * 100,
    trades: NaN,
    closingPrint
  };
};

export const datasetOf = (specs: SessionSpec[]): Dataset => {
  const dates = weekdays(specs.length);

  return fixtureDataset(specs.map((spec, i) => buildSession(dates[i]!, spec)));
};

// A session drifting linearly from `from` to `to` over `count` bars (each bar's range ±0.05% around its path).
export const path = (from: number, to: number, count = 8): SessionSpec => {
  const bars: Bar[] = [];

  for (let k = 0; k < count; k++) {
    const open = from + ((to - from) * k) / count;
    const close = from + ((to - from) * (k + 1)) / count;

    bars.push([open, Math.max(open, close) * 1.0005, Math.min(open, close) * 0.9995, close]);
  }

  return { bars };
};

export const flatSession = (price: number, count = 8): SessionSpec => path(price, price, count);

// A seeded random walk of `days` sessions: daily drift and volatility, occasional overnight gaps and shocks.
export const randomWalk = (seed: number, days: number, opts: { drift?: number; vol?: number; bars?: number } = {}) => {
  const rand = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(1e-12, rand());
    const v = rand();

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const drift = opts.drift ?? 0.0006;
  const base = opts.vol ?? 0.015;
  const count = opts.bars ?? 8;
  const specs: SessionSpec[] = [];
  let price = 100;
  let regime = 1;
  let scale = 1;

  for (let d = 0; d < days; d++) {
    if (rand() < 0.01) {
      regime = -regime; // regime switches make trends and declines
    }

    if (rand() < 0.02) {
      scale = [0.35, 0.6, 1, 1.6][Math.floor(rand() * 4)]!; // volatility regimes: calm, compressed, normal, stressed
    }

    const vol = base * scale;
    const gap = rand() < 0.05 ? gauss() * vol * 2 : gauss() * vol * 0.2;
    let p = price * Math.exp(gap);
    const bars: Bar[] = [];

    for (let k = 0; k < count; k++) {
      const step = (regime * drift) / count + (gauss() * vol) / Math.sqrt(count);
      const next = p * Math.exp(step);
      const high = Math.max(p, next) * (1 + Math.abs(gauss()) * vol * 0.1);
      const low = Math.min(p, next) * (1 - Math.abs(gauss()) * vol * 0.1);

      bars.push([p, high, low, next]);
      p = next;
    }

    const spec: SessionSpec = { bars };

    if (rand() < 0.03) {
      spec.missing = [1 + Math.floor(rand() * (count - 2))];
    }

    if (rand() < 0.02) {
      spec.closingPrint = null;
    }

    specs.push(spec);
    price = p;
  }

  return specs;
};

export const options = (ds: Dataset, overrides: Partial<RunOptions> = {}): RunOptions => ({
  costBps: 5,
  rate: 0.11,
  principal: 100000,
  stopSlippageBps: 0,
  entrySlippageBps: 0,
  delayMinutes: 0,
  firstDecisionIndex: 0,
  endIndex: ds.sessionCount - 1,
  ...overrides
});
