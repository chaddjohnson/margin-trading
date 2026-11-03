// The ordered pair metrics of PROTOCOL.md §6.3 for one view-window. Every value carries its numerator and
// denominator; an undefined value (zero denominator, a constant return series) is null, never 0. Pairs are ordered:
// a share is of the first symbol's own total, so (i, j) and (j, i) differ by denominator.
import { type Interval, intersectionLength, lengthOf, overlaps } from './intervals.ts';
import { levelD } from './context.ts';

export interface Decision {
  time: number; // decision time (epoch seconds)
  session: number; // decision session index
}

export interface SymbolTimeline {
  symbol: string;
  member: boolean; // false: the view has no vector for the symbol (NA row)
  decisions: Decision[];
  armed: Interval[]; // normalized, clipped to the window
  armEpisodes: Interval[]; // one per setup, clipped (not merged)
  holding: Interval[]; // capital-holding intervals, normalized, clipped
  returns: Float64Array; // daily log returns over the window's sessions
}

export interface Match {
  a: Decision;
  b: Decision;
  distance: number;
}

// One-to-one greedy matching: every (a, b) within the tolerance, sorted by (|session distance|, a's time, b's time),
// accepted while neither is used.
export const matchDecisions = (
  a: readonly Decision[],
  b: readonly Decision[],
  tolerance: { sessions: number; exactMinute: boolean }
): Match[] => {
  const candidates: { i: number; j: number; distance: number }[] = [];

  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      const distance = Math.abs(a[i]!.session - b[j]!.session);

      if (tolerance.exactMinute ? a[i]!.time === b[j]!.time : distance <= tolerance.sessions) {
        candidates.push({ i, j, distance: tolerance.exactMinute ? 0 : distance });
      }
    }
  }

  candidates.sort((x, y) => x.distance - y.distance || a[x.i]!.time - a[y.i]!.time || b[x.j]!.time - b[y.j]!.time);

  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const matches: Match[] = [];

  for (const candidate of candidates) {
    if (!usedA.has(candidate.i) && !usedB.has(candidate.j)) {
      usedA.add(candidate.i);
      usedB.add(candidate.j);
      matches.push({ a: a[candidate.i]!, b: b[candidate.j]!, distance: candidate.distance });
    }
  }

  return matches.sort((x, y) => x.a.time - y.a.time);
};

export const ratio = (numerator: number, denominator: number) => (denominator > 0 ? numerator / denominator : null);

export const median = (values: readonly number[]) => {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((x, y) => x - y);
  const middle = sorted.length >> 1;

  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

export const pearson = (x: ArrayLike<number>, y: ArrayLike<number>) => {
  const n = Math.min(x.length, y.length);

  if (n < 2) {
    return null;
  }

  let mx = 0;
  let my = 0;

  for (let k = 0; k < n; k++) {
    mx += x[k]!;
    my += y[k]!;
  }

  mx /= n;
  my /= n;

  let sxy = 0;
  let sxx = 0;
  let syy = 0;

  for (let k = 0; k < n; k++) {
    const dx = x[k]! - mx;
    const dy = y[k]! - my;

    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
};

export interface PairRow {
  a: string;
  b: string;
  aMember: boolean;
  bMember: boolean;
  // armed state
  armedMinutesA: number;
  armedJoint: number;
  armedShare: number | null;
  armEpisodesA: number;
  armEpisodesOverlapping: number;
  armEpisodeShare: number | null;
  // decisions
  decisionsA: number;
  decisionsB: number;
  matched: Record<string, number>;
  matchShare: Record<string, number | null>;
  lagMedian: number | null; // ±20 sessions: median (b − a) sessions over matched pairs
  aFirstShare: number | null; // ±20 sessions: share of matched pairs where a's decision is strictly earlier
  // capital-holding occupancy
  holdMinutesA: number;
  holdMinutesB: number;
  holdJoint: number;
  holdShare: number | null;
  holdJaccard: number | null;
  // prices
  returnCorrelation: number | null;
}

// A share is defined only when both sides have the events it counts (a zero-signal partner, or a symbol without a
// vector, gives NA: "no coincidence" with nothing is not evidence of independence).
const both = (numerator: number, denominator: number, other: number) =>
  other > 0 ? ratio(numerator, denominator) : null;

export const pairRow = (a: SymbolTimeline, b: SymbolTimeline): PairRow => {
  const armedMinutesA = lengthOf(a.armed);
  const armedMinutesB = lengthOf(b.armed);
  const armedJoint = intersectionLength(a.armed, b.armed);
  const overlapping = a.armEpisodes.filter((episode) => overlaps(episode, b.armed)).length;
  const matched: Record<string, number> = {};
  const matchShare: Record<string, number | null> = {};
  let lagMedian: number | null = null;
  let aFirstShare: number | null = null;

  for (const tolerance of levelD.tolerances) {
    // One matching per unordered pair (PROTOCOL.md §6.3): the alphabetically first symbol plays `a`, so (i, j) and
    // (j, i) share one matched count; the result is re-oriented to this row's direction.
    const flip = b.symbol < a.symbol;
    const raw = flip
      ? matchDecisions(b.decisions, a.decisions, tolerance)
      : matchDecisions(a.decisions, b.decisions, tolerance);
    const matches = flip ? raw.map((match) => ({ a: match.b, b: match.a, distance: match.distance })) : raw;

    matched[tolerance.key] = matches.length;
    matchShare[tolerance.key] = both(matches.length, a.decisions.length, b.decisions.length);

    if (tolerance.key === levelD.lagTolerance) {
      const lags = matches.map((match) => match.b.session - match.a.session);

      lagMedian = median(lags);
      aFirstShare = ratio(matches.filter((match) => match.a.time < match.b.time).length, matches.length);
    }
  }

  const holdMinutesA = lengthOf(a.holding);
  const holdMinutesB = lengthOf(b.holding);
  const holdJoint = intersectionLength(a.holding, b.holding);

  return {
    a: a.symbol,
    b: b.symbol,
    aMember: a.member,
    bMember: b.member,
    armedMinutesA,
    armedJoint,
    armedShare: both(armedJoint, armedMinutesA, armedMinutesB),
    armEpisodesA: a.armEpisodes.length,
    armEpisodesOverlapping: overlapping,
    armEpisodeShare: both(overlapping, a.armEpisodes.length, b.armEpisodes.length),
    decisionsA: a.decisions.length,
    decisionsB: b.decisions.length,
    matched,
    matchShare,
    lagMedian,
    aFirstShare,
    holdMinutesA,
    holdMinutesB,
    holdJoint,
    holdShare: both(holdJoint, holdMinutesA, holdMinutesB),
    holdJaccard:
      holdMinutesA > 0 && holdMinutesB > 0 ? ratio(holdJoint, holdMinutesA + holdMinutesB - holdJoint) : null,
    returnCorrelation: pearson(a.returns, b.returns)
  };
};

// Every ordered pair (diagonal included). NA rows (no vector) keep their price correlation; their signal metrics are
// null by construction (zero denominators) — never zeros presented as independence.
export const pairMatrix = (timelines: readonly SymbolTimeline[]) => {
  const rows: PairRow[] = [];

  for (const a of timelines) {
    for (const b of timelines) {
      rows.push(pairRow(a, b));
    }
  }

  return rows;
};
