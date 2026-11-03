// Synthetic program data for the tests: sessions of explicit minute closes for VGT (and a sparser VOOG), consecutive
// calendar dates so that calendar-day arithmetic is easy to read, a closing print unless a session says otherwise,
// and an optional distribution ledger. Small strategy parameters make the machines fire on short paths.
import type { MarketSession, Tick } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { type Distribution, type ProgramData, alignVoog } from '../data.ts';
import { type StrategyParams, strategies } from '../strategy.ts';

const secondsPerMinute = 60;
const secondsPerDay = 86400;

export interface SessionSpec {
  closes: number[]; // minute closes; the open of each bar is the previous bar's close (or its own close first)
  closingPrint?: boolean; // default true
  voogCloses?: number[]; // VOOG minute closes at the same minute slots (fewer bars allowed: the first n minutes)
}

export const dateOf = (day: number, start = '2018-01-01') =>
  new Date(Date.parse(start) + day * secondsPerDay * 1000).toISOString().slice(0, 10);

const buildSession = (date: string, closes: number[], closingPrint: boolean, slotMinutes: number[]): MarketSession => {
  const time = Date.parse(date) / 1000;
  const openTime = time + (14 * 60 + 30) * secondsPerMinute;
  const closeTime = time + 16 * 60 * secondsPerMinute + 5 * 60 * secondsPerMinute; // 21:00 UTC
  const bars: Tick[] = closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1]!;

    return {
      time: openTime + slotMinutes[index]! * secondsPerMinute,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: 1000,
      trades: NaN
    };
  });
  const last = closes.at(-1)!;
  const session: MarketSession = {
    date,
    time,
    openTime,
    closeTime,
    isEarlyClose: false,
    bars,
    open: bars[0]!.open,
    high: Math.max(...bars.map((bar) => bar.high), last),
    low: Math.min(...bars.map((bar) => bar.low), last),
    close: last,
    volume: 1000 * bars.length,
    trades: NaN,
    closingPrint: closingPrint ? last : undefined
  };

  return session;
};

// Minute slots: bars every `gap` minutes so that "no trade in this minute" cases exist for VOOG.
export const buildData = (
  specs: SessionSpec[],
  distributions: Distribution[] = [],
  start = '2018-01-01'
): ProgramData => {
  const vgtSessions = specs.map((spec, day) =>
    buildSession(
      dateOf(day, start),
      spec.closes,
      spec.closingPrint ?? true,
      spec.closes.map((_, index) => index)
    )
  );
  const voogSessions = specs.map((spec, day) => {
    const closes = spec.voogCloses ?? spec.closes.map((close) => close * 0.8);
    const slots = closes.map((_, index) => index * 2); // VOOG trades every other minute

    return buildSession(dateOf(day, start), closes, spec.closingPrint ?? true, slots);
  });
  const ds = fixtureDataset(vgtSessions);

  return {
    ds,
    vgtSessions,
    voog: alignVoog(vgtSessions, voogSessions),
    distributions,
    hashes: { vgtMinute: 'fixture', voogMinute: 'fixture', distributions: 'fixture' },
    sessionIndex: new Map(vgtSessions.map((session, index) => [session.date, index]))
  };
};

// Small parameters: D1-like (L 10, X 10%, Y 0.5%, stop 5%, hold 3 days, buffer 2%, P 5%, W 10) and swing-like
// (K 5, rebound 0.3%, stop 3%, hold 10 days, buffer 1%).
export const testParams: Record<'d1' | 'd1.breakeven' | 'swing', StrategyParams> = {
  d1: {
    ...strategies.d1,
    tickWindowSize: 10,
    targetPercentChange: 0.1,
    trailingBuyPercentage: 0.005,
    trailingStopPercentage: 0.05,
    maximumHoldDays: 3,
    intradayLossBuffer: 0.02,
    pullback: 0.05,
    continuationWindow: 10
  },
  'd1.breakeven': {
    ...strategies['d1.breakeven'],
    tickWindowSize: 10,
    targetPercentChange: 0.1,
    trailingBuyPercentage: 0.005,
    trailingStopPercentage: 0.05,
    maximumHoldDays: 3,
    intradayLossBuffer: 0.02,
    pullback: 0.05,
    continuationWindow: 10
  },
  swing: {
    ...strategies.swing,
    swingLookback: 5,
    trailingBuyPercentage: 0.003,
    trailingStopPercentage: 0.03,
    maximumHoldDays: 10,
    intradayLossBuffer: 0.01
  }
};

export const flat = (price: number, bars = 6): SessionSpec => ({ closes: Array.from({ length: bars }, () => price) });

// A path on which swing-low enters first (session 20) and D1 signals on session 21 while swing holds, then the
// market stays below both entries so that the maximum-hold exits decide the outcome.
export const takeoverPath = (): SessionSpec[] => [
  ...Array.from({ length: 20 }, () => flat(100)),
  { closes: [99, 98.5, 98.2, 98.0, 98.5, 99.0] }, // 20: swing arms (bar 0), low 98.0 (bar 3), rebound at bar 4, fill bar 5 @ 98.5
  { closes: [95, 92, 90, 89.5, 89.0, 89.5, 90.5] }, // 21: D1 arms (bar 2, 90 ≤ 90), low 89.0 (bar 4), rebound at bar 5 (89.5 ≥ 89.445), fill bar 6 @ 89.5
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92),
  flat(92)
];
