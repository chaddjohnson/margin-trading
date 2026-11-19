// Rise from recent low — a SIGNAL-ONLY growth-entry rule (Strategy Lab strategy `rise-from-recent-low`, version 1.0.0).
// It emits entry signals only: no orders, fills, positions, exits or P&L. See src/entry-signals/README.md.
//
// Bars b_0 … b_{n-1} are completed bars of one resolution in ascending time (src/entry-signals/bars.ts), as present in
// the data: missing bars and session gaps are not imputed, so the lookback counts BARS, not clock time.
// With N = recentLowLookbackBars (an integer ≥ 2) and x = advanceFromRecentLowPercent / 100 (> 0):
//
//   L_i = min(low_{i-N+1}, …, low_i)          the recent low over the last N completed bars, bar i INCLUDED (i ≥ N-1)
//   T_i = L_i × (1 + x)                        the threshold price
//   C_i ⇔ close_i ≥ T_i × (1 − 1e-12)          at or above the threshold (the factor absorbs binary rounding only)
//   signal on bar i ⇔ i ≥ N, C_i and not C_{i-1}
//
// Edge-triggered: a signal needs the previous bar BELOW its own threshold, so a market that stays X% above its rolling
// low signals once; it rearms only after a bar with C false (the advance fell below X%, e.g. because the rolling low
// rose as old lows left the window). The first evaluable bar (i = N-1) only sets that state: no crossing is observed.
// Only bar i and earlier bars are read to decide bar i, all of them complete at b_i.end — the signal's timestamp.
// `firstEligible` limits signals to the evaluation window while warm-up bars still provide L and C.

import type { SignalBar } from './bars.ts';

export interface RiseFromRecentLowParams {
  advanceFromRecentLowPercent: number;
  recentLowLookbackBars: number;
}

export interface RiseSignal {
  index: number; // bar index
  time: number; // b_i.end: the instant the signal is first knowable (Unix seconds)
  close: number; // close_i: the signal price
  recentLow: number; // L_i
  recentLowIndex: number; // the bar of L_i (the earliest on ties)
  thresholdPrice: number; // T_i
  advancePercent: number; // (close_i / L_i − 1) × 100
  previousAdvancePercent: number; // the same for bar i-1, below X by construction
}

export interface RiseScan {
  signals: RiseSignal[];
  evaluableBars: number; // bars with C defined inside the window
  barsAtOrAboveThreshold: number; // of those, bars with C true
}

export const RELATIVE_TOLERANCE = 1e-12;

export const assertRiseParams = ({
  advanceFromRecentLowPercent: x,
  recentLowLookbackBars: n
}: RiseFromRecentLowParams) => {
  if (!Number.isFinite(x) || x <= 0 || x > 100) {
    throw new Error(`advanceFromRecentLowPercent must be in (0, 100], not ${x}`);
  }

  if (!Number.isInteger(n) || n < 2) {
    throw new Error(`recentLowLookbackBars must be an integer ≥ 2, not ${n}`);
  }
};

// The index of the lowest low in [i - n + 1, i] (the earliest on ties), with a monotonic deque: O(bars) overall.
export const scanRiseFromRecentLow = (
  bars: readonly SignalBar[],
  params: RiseFromRecentLowParams,
  firstEligible = 0
): RiseScan => {
  assertRiseParams(params);

  const n = params.recentLowLookbackBars;
  const factor = 1 + params.advanceFromRecentLowPercent / 100;
  const deque: number[] = []; // indexes with increasing lows; the live part starts at `head`
  let head = 0;
  const signals: RiseSignal[] = [];
  let previous: boolean | undefined; // C_{i-1}; undefined before the first evaluable bar
  let previousAdvance = NaN;
  let evaluableBars = 0;
  let barsAtOrAboveThreshold = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;

    if (i > 0 && bar.end <= bars[i - 1]!.end) {
      throw new Error(`bars must be in strictly ascending time order (bar ${i})`);
    }

    while (deque.length > head && bars[deque.at(-1)!]!.low > bar.low) {
      deque.pop(); // a later equal low never replaces an earlier one: ties keep the earliest
    }

    deque.push(i);

    while (deque[head]! <= i - n) {
      head++;
    }

    if (i < n - 1) {
      continue;
    }

    const lowIndex = deque[head]!;
    const low = bars[lowIndex]!.low;
    const threshold = low * factor;
    const current = bar.close >= threshold * (1 - RELATIVE_TOLERANCE);
    const advance = (bar.close / low - 1) * 100;

    if (i >= firstEligible) {
      evaluableBars++;

      if (current) {
        barsAtOrAboveThreshold++;
      }

      if (current && previous === false) {
        signals.push({
          index: i,
          time: bar.end,
          close: bar.close,
          recentLow: low,
          recentLowIndex: lowIndex,
          thresholdPrice: threshold,
          advancePercent: advance,
          previousAdvancePercent: previousAdvance
        });
      }
    }

    previous = current;
    previousAdvance = advance;
  }

  return { signals, evaluableBars, barsAtOrAboveThreshold };
};
