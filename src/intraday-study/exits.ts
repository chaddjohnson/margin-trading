// The experimental STOP_MINUTE_CAUSAL exit (PROTOCOL.md §6). It follows the incumbent's
// evaluateSessionExit order (gap at the open, then a due maximum hold, then intraday triggers), but after
// each completed minute it raises the post-entry high and the stop for the next minute and re-evaluates the
// profit-conditional activation. A minute's own high never moves its own stop. STOP_DAILY uses the
// incumbent's evaluateSessionExit unchanged.
import type { BacktestPosition, MarketSession } from '#types';
import { type SessionExit, type StopFill, firstTradeFrom } from '../app/allIn.ts';
import { incumbent, secondsPerDay, secondsPerMinute } from './constants.ts';

export interface MinuteExitOptions {
  position: BacktestPosition;
  session: MarketSession;
  stopPrice: number; // in force at the session's start (or the entry fill's stop on the entry session)
  highSinceEntry: number; // through the previous session, or the fill on the entry session
  interest: number; // accrued through the session's date; 0 on the entry session
  stopFill: StopFill;
  // The entry session: the bar of the fill, whose minutes from the next one on can trigger. The opening
  // gap and the maximum hold don't apply.
  entryBarIndex?: number;
}

export interface MinuteExitResult {
  exit: SessionExit | undefined;
  stopAtExit: number;
  // The stop and the high after the session when there's no exit (the closing print included).
  stopPrice: number;
  highSinceEntry: number;
  // The trigger needed a stop level raised, or an activation reached, during this session.
  isIntrasessionStop: boolean;
  isMaximumHoldNoFill: boolean;
}

export const evaluateMinuteSessionExit = ({
  position,
  session,
  stopPrice: startStop,
  highSinceEntry,
  interest,
  stopFill,
  entryBarIndex
}: MinuteExitOptions): MinuteExitResult => {
  const profitAt = (price: number) => position.shares * price - position.investment - interest;
  const isEntrySession = entryBarIndex !== undefined;
  const isStartActive = profitAt(startStop) > 0;
  let stop = startStop;
  let high = highSinceEntry;
  let isActive = isStartActive;
  const done = (exit: SessionExit | undefined, isMaximumHoldNoFill = false): MinuteExitResult => {
    // Without an exit, the session's range counts afterwards, as in the incumbent's after-session update:
    // the whole session (its minutes and the closing print) for a held session, and on the entry session
    // only the minutes from the fill onwards (already in `high`) and the closing print.
    const after = Math.max(high, isEntrySession ? session.close : session.high);

    return {
      exit,
      stopAtExit: stop,
      stopPrice: exit ? stop : Math.max(stop, after * (1 - incumbent.trailingStopPercentage)),
      highSinceEntry: exit ? high : after,
      isIntrasessionStop: Boolean(exit?.isStopTriggered) && (isEntrySession || stop > startStop || !isStartActive),
      isMaximumHoldNoFill
    };
  };
  let isMaximumHoldDue = false;

  if (!isEntrySession) {
    const daysHeld = (session.time - position.entryTimestamp) / secondsPerDay;

    isMaximumHoldDue = daysHeld >= incumbent.maximumHoldDays && profitAt(session.open) < 0;

    if (isActive && session.open <= stop) {
      return done({
        reason: 'trailing stop gap',
        price: session.open,
        time: session.bars[0]!.time,
        barIndex: 0,
        execution: 'opening trade',
        isStopTriggered: true,
        isMaximumHoldDue
      });
    }

    if (isMaximumHoldDue) {
      const fill = firstTradeFrom(session, session.bars[0]!.time + secondsPerMinute);

      // As in the incumbent, a due maximum hold without a later trade holds the position another session
      // and checks no stop.
      return fill
        ? done({ ...fill, reason: 'maximum hold', isStopTriggered: false, isMaximumHoldDue })
        : done(undefined, true);
    }
  }

  const firstIndex = isEntrySession ? entryBarIndex : 0;

  for (let barIndex = firstIndex; barIndex < session.bars.length; barIndex++) {
    const bar = session.bars[barIndex]!;

    // The fill's own minute never triggers: its stop is still the fill's level, below breakeven with no
    // interest, and its high only counts once the minute has completed.
    if (isActive && !(isEntrySession && barIndex === entryBarIndex)) {
      const trigger = {
        reason: 'trailing stop' as const,
        time: bar.time,
        barIndex,
        isStopTriggered: true,
        isMaximumHoldDue
      };

      if (bar.open <= stop) {
        return done({ ...trigger, price: bar.open, execution: 'minute open through stop' });
      }

      if (bar.low <= stop) {
        if (stopFill === 'stop') {
          return done({ ...trigger, price: stop, execution: 'stop level' });
        }

        const fill = firstTradeFrom(session, bar.time + secondsPerMinute);

        return done(
          fill ? { ...trigger, ...fill } : { ...trigger, price: bar.close, execution: 'trigger minute close' }
        );
      }
    }

    // The minute has completed: its high raises the stop for the next minute.
    high = Math.max(high, bar.high);
    stop = Math.max(stop, high * (1 - incumbent.trailingStopPercentage));
    isActive = profitAt(stop) > 0;
  }

  return done(undefined);
};
