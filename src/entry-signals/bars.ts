// Completed bars of one resolution, built from the regular-session minute bars of the shared session pipeline
// (src/lib/session.ts groupMarketSessions, src/lib/evaluation.ts loadDatasetSessions). Signal-only research strategies
// evaluate these bars; nothing here trades.
//
// Time semantics (Unix seconds):
// - A minute bar is stamped with the START of its minute and is complete at start + 60 s.
// - `end` is the instant a bar is complete, i.e. when its close is first knowable. A signal on a bar is stamped `end`.
// - '1d': one bar per regular session. open = first regular trade, high/low span the session and the closing print,
//   close = the closing print (or the last regular trade without one), end = the scheduled close (16:00 or 13:00 ET).
// - 'Nm' (N = 1, 5, 15, 30, 60): N-minute buckets from the 9:30 ET open, within one session. A bucket holds the minute
//   bars that START in it; its end is the earlier of bucket start + N minutes and the session close, so the last bucket
//   of a session can be shorter. A bucket without any minute bar is missing, never imputed. Intraday bars exclude the
//   closing-auction print (it belongs to the '1d' bar).
import type { MarketSession } from '#types';

export const signalResolutions = ['1m', '5m', '15m', '30m', '60m', '1d'] as const;

export type SignalResolution = (typeof signalResolutions)[number];

export interface SignalBar {
  start: number;
  end: number;
  open: number;
  high: number;
  low: number;
  close: number;
  sessionIndex: number;
  date: string; // the bar's New York session date
}

const minutesOf = (resolution: Exclude<SignalResolution, '1d'>) => Number(resolution.slice(0, -1));

export const isSignalResolution = (value: unknown): value is SignalResolution =>
  signalResolutions.includes(value as SignalResolution);

export const barsFromSessions = (sessions: readonly MarketSession[], resolution: SignalResolution): SignalBar[] => {
  const bars: SignalBar[] = [];

  if (resolution === '1d') {
    sessions.forEach((session, sessionIndex) => {
      bars.push({
        start: session.openTime,
        end: session.closeTime,
        open: session.open,
        high: session.high,
        low: session.low,
        close: session.close,
        sessionIndex,
        date: session.date
      });
    });

    return bars;
  }

  const width = minutesOf(resolution) * 60;

  sessions.forEach((session, sessionIndex) => {
    let current: SignalBar | undefined;
    let currentBucket = -1;

    for (const minute of session.bars) {
      const bucket = Math.floor((minute.time - session.openTime) / width);

      if (bucket < 0) {
        continue; // cannot happen for regular-session bars; kept as a guard
      }

      if (bucket !== currentBucket) {
        const start = session.openTime + bucket * width;

        current = {
          start,
          end: Math.min(start + width, session.closeTime),
          open: minute.open,
          high: minute.high,
          low: minute.low,
          close: minute.close,
          sessionIndex,
          date: session.date
        };
        currentBucket = bucket;
        bars.push(current);
      } else {
        current!.high = Math.max(current!.high, minute.high);
        current!.low = Math.min(current!.low, minute.low);
        current!.close = minute.close;
      }
    }
  });

  return bars;
};
