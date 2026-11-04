// Forward outcomes of entry signals, measured WITHOUT pretending the signal is a trade: no exits, positions, costs or
// P&L. Everything is relative to the signal price P (the close of the signal bar), over the regular sessions AFTER the
// signal's session, inside the run's evaluation window only (nothing after the window is read).
//
// - forward return at horizon k: close of the k-th later session / P − 1; right-censored (null) when the window ends
//   before that session.
// - excursions over H sessions (default 63): MFE = max session high / P − 1, MAE = min session low / P − 1. The rest
//   of the signal's own session is not included (documented simplification for intraday signals).
// - target t: reached when a later session's high is ≥ P × (1 + t) within H sessions; `sessions` = how many later
//   sessions it took. Not reached in a complete window → false; not reached in a censored window → null (unknown).
import type { MarketSession } from '#types';

export interface OutcomeConfig {
  horizons: number[]; // sessions
  excursionSessions: number;
  targetsPercent: number[];
}

export const defaultOutcomeConfig: OutcomeConfig = {
  horizons: [5, 21, 63],
  excursionSessions: 63,
  targetsPercent: [5, 10, 15]
};

export interface ForwardOutcome {
  returns: { sessions: number; returnPercent: number | null }[];
  excursion: {
    sessions: number;
    available: number; // later sessions inside the window, capped at `sessions`
    complete: boolean;
    mfePercent: number | null;
    maePercent: number | null;
  };
  targets: { percent: number; reached: boolean | null; sessions: number | null }[];
}

export const forwardOutcome = (
  sessions: readonly MarketSession[],
  signalSessionIndex: number,
  price: number,
  config: OutcomeConfig = defaultOutcomeConfig
): ForwardOutcome => {
  const last = sessions.length - 1;
  const returns = config.horizons.map((k) => {
    const session = signalSessionIndex + k <= last ? sessions[signalSessionIndex + k] : undefined;
    return { sessions: k, returnPercent: session ? (session.close / price - 1) * 100 : null };
  });

  const h = config.excursionSessions;
  const available = Math.max(0, Math.min(h, last - signalSessionIndex));
  const complete = available === h;
  let high = -Infinity;
  let low = Infinity;
  const reachedAt: (number | null)[] = config.targetsPercent.map(() => null);

  for (let k = 1; k <= available; k++) {
    const session = sessions[signalSessionIndex + k]!;
    high = Math.max(high, session.high);
    low = Math.min(low, session.low);
    config.targetsPercent.forEach((t, j) => {
      if (reachedAt[j] === null && session.high >= price * (1 + t / 100) * (1 - 1e-12)) {
        reachedAt[j] = k;
      }
    });
  }

  return {
    returns,
    excursion: {
      sessions: h,
      available,
      complete,
      mfePercent: complete ? (high / price - 1) * 100 : null,
      maePercent: complete ? (low / price - 1) * 100 : null
    },
    targets: config.targetsPercent.map((percent, j) => ({
      percent,
      reached: reachedAt[j] !== null ? true : complete ? false : null,
      sessions: reachedAt[j] ?? null
    }))
  };
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export interface OutcomeSummary {
  count: number;
  nonOverlapping: number; // counted greedily, at least `excursionSessions` sessions apart
  returns: { sessions: number; complete: number; medianPercent: number | null; positiveShare: number | null }[];
  excursion: { complete: number; medianMfePercent: number | null; medianMaePercent: number | null };
  // `known`: signals with a complete excursion window; `share` = reached / known.
  targets: { percent: number; known: number; reached: number; share: number | null; medianSessions: number | null }[];
}

// Summary of outcomes at the given session indexes (signals, or every session for the baseline).
export const summarizeOutcomes = (
  items: readonly { sessionIndex: number; outcome: ForwardOutcome }[],
  config: OutcomeConfig = defaultOutcomeConfig
): OutcomeSummary => {
  let lastCounted = -Infinity;
  let nonOverlapping = 0;

  for (const { sessionIndex } of [...items].sort((a, b) => a.sessionIndex - b.sessionIndex)) {
    if (sessionIndex - lastCounted >= config.excursionSessions) {
      nonOverlapping++;
      lastCounted = sessionIndex;
    }
  }

  return {
    count: items.length,
    nonOverlapping,
    returns: config.horizons.map((k, j) => {
      const values = items.flatMap(({ outcome }) => {
        const r = outcome.returns[j]?.returnPercent;
        return r === null || r === undefined ? [] : [r];
      });
      return {
        sessions: k,
        complete: values.length,
        medianPercent: median(values),
        positiveShare: values.length ? values.filter((v) => v > 0).length / values.length : null
      };
    }),
    excursion: {
      complete: items.filter(({ outcome }) => outcome.excursion.complete).length,
      medianMfePercent: median(
        items.flatMap(({ outcome }) => (outcome.excursion.mfePercent === null ? [] : [outcome.excursion.mfePercent]))
      ),
      medianMaePercent: median(
        items.flatMap(({ outcome }) => (outcome.excursion.maePercent === null ? [] : [outcome.excursion.maePercent]))
      )
    },
    targets: config.targetsPercent.map((percent, j) => {
      // Complete windows only: counting censored signals that happened to reach the target early (while dropping the
      // censored ones that had not yet) would bias the rate upward.
      const known = items.filter(({ outcome }) => outcome.excursion.complete);
      const reached = known.filter(({ outcome }) => outcome.targets[j]?.reached === true);
      return {
        percent,
        known: known.length,
        reached: reached.length,
        share: known.length ? reached.length / known.length : null,
        medianSessions: median(reached.map(({ outcome }) => outcome.targets[j]!.sessions!))
      };
    })
  };
};
