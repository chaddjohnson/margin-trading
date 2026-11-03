// The three scores of PROTOCOL.md §6 and their shared machinery: the temporal blocks of a window, the block-trimmed
// net net_T = net − (best block − median block), the neighbourhood statistics of either net (the October 25 study's
// `summarize`, unchanged), the J and T scores (its `scoreOf`, applied to net and to net_T), the centre score Q, the
// exact-to-the-cent ranking of §6.3, and the paired bootstrap of a score difference on identical CRN draw indices.
// Pure functions; every bootstrap is seeded by its caller.
import { Rng } from '../optimizer/rng.ts';
import {
  type NeighbourRecord,
  type NeighbourhoodStats,
  type RiskReferences,
  type ScoreParts,
  quantileSorted,
  scoreOf,
  summarize
} from '../d1-robust/stats.ts';
import { type Score, study } from './context.ts';

export type { NeighbourRecord, NeighbourhoodStats, RiskReferences, ScoreParts };

// ----- §6.2 the temporal blocks -----

export interface BlockSpec {
  armStart: number; // the arming session index (first eligible session)
  endIndex: number; // the window's last session index
  count: number; // K
  markIndices: number[]; // [armStart − 1, end of block 1, …, end of block K = endIndex]
}

// K = max(3, floor(eligible sessions ÷ 252)) contiguous blocks of equal session count (the remainder spread by
// rounding) covering [armStart, endIndex].
export const blockSpecOf = (armStart: number, endIndex: number): BlockSpec => {
  if (!(armStart >= 1 && endIndex >= armStart)) {
    throw new Error(`Block boundaries need 1 ≤ armStart ≤ endIndex (got ${armStart}, ${endIndex})`);
  }

  const sessions = endIndex - armStart + 1;
  const count = Math.max(study.blocks.minimum, Math.floor(sessions / study.blocks.sessionsPerBlock));
  const markIndices = [armStart - 1];

  for (let j = 1; j <= count; j++) {
    markIndices.push(armStart - 1 + Math.round((j * sessions) / count));
  }

  if (markIndices.at(-1) !== endIndex || new Set(markIndices).size !== markIndices.length) {
    throw new Error(`Degenerate blocks over ${sessions} sessions`);
  }

  return { armStart, endIndex, count, markIndices };
};

// The block P&Ls from the strategy marks at the block boundaries (marks[0] is the close before arming).
export const blockPnl = (marks: readonly number[]) => marks.slice(1).map((mark, j) => mark - marks[j]!);

const medianOfSmall = (values: readonly number[]) => quantileSorted(Float64Array.from(values).sort(), 0.5);

// net_T = net − (b_max − b_med): the single best block replaced by a typical one.
export const temporalNet = (net: number, marks: readonly number[] | undefined) => {
  if (!marks || marks.length < study.blocks.minimum + 1) {
    throw new Error('net_T needs the strategy marks at every block boundary');
  }

  const blocks = blockPnl(marks);

  return net - (Math.max(...blocks) - medianOfSmall(blocks));
};

// A neighbour record restated in net_T (its drawdown, lots and moved coordinates unchanged).
export const temporalRecord = (record: NeighbourRecord): NeighbourRecord => ({
  ...record,
  net: temporalNet(record.net, record.markAt),
  top2Share: NaN
});

// ----- the scores -----

export interface ScoreSet {
  nbJ: NeighbourhoodStats;
  nbT: NeighbourhoodStats;
  j: ScoreParts;
  t: ScoreParts;
}

// Both neighbourhood summaries and both scores from one draw set (§5: every record carries the block marks).
export const scoreSetOf = (
  centreNet: number,
  centreMarks: readonly number[] | undefined,
  records: readonly NeighbourRecord[],
  books: number,
  references: RiskReferences
): ScoreSet => {
  const nbJ = summarize(centreNet, records);
  const nbT = summarize(temporalNet(centreNet, centreMarks), records.map(temporalRecord));

  return { nbJ, nbT, j: scoreOf(nbJ, books, references), t: scoreOf(nbT, books, references) };
};

export const qOf = (centreNet: number, books: number) => centreNet - study.complexityPenalty * books;

// The value an arm ranks by: S_J, S_T or Q.
export const scoreValue = (score: Score, set: ScoreSet | undefined, centreNet: number, books: number) => {
  if (score === 'Q') {
    return qOf(centreNet, books);
  }

  if (!set) {
    throw new Error(`Score ${score} needs a neighbourhood`);
  }

  return score === 'J' ? set.j.s : set.t.s;
};

// The Q25 of the arm's own net (the first tie-breaker of §6.3).
export const q25Value = (score: Score, set: ScoreSet | undefined) =>
  score === 'Q' || !set ? NaN : score === 'J' ? set.nbJ.q25 : set.nbT.q25;

// ----- §6.3 ranking: exact ties only (equal to the cent) -----

export const cents = (value: number) => (Number.isFinite(value) ? Math.round(value * 100) : value);

export interface Rankable {
  key: string;
  feasible: boolean;
  violation: number;
  value: number; // the arm's score (−Infinity when infeasible)
  tie: number; // Q25 of the arm's net (J/T) or −(centre drawdown) (Q); larger is better
  books: number;
}

export const compareRankable = (a: Rankable, b: Rankable) => {
  if (a.feasible !== b.feasible) {
    return a.feasible ? -1 : 1;
  }

  if (!a.feasible) {
    return a.violation - b.violation || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  }

  const va = cents(a.value);
  const vb = cents(b.value);

  if (va !== vb) {
    return vb > va ? 1 : -1;
  }

  const ta = cents(a.tie);
  const tb = cents(b.tie);

  if (ta !== tb && Number.isFinite(ta) && Number.isFinite(tb)) {
    return tb > ta ? 1 : -1;
  }

  if (a.books !== b.books) {
    return a.books - b.books;
  }

  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
};

// ----- paired bootstrap of a score difference (identical CRN draw indices) -----

export interface ScoreDraws {
  net: Float64Array; // per draw, the arm's net (net or net_T)
  drawdown: Float64Array;
}

export const scoreDrawsOf = (score: Exclude<Score, 'Q'>, records: readonly NeighbourRecord[]): ScoreDraws => ({
  net: Float64Array.from(records, (record) => (score === 'J' ? record.net : temporalNet(record.net, record.markAt))),
  drawdown: Float64Array.from(records, (record) => record.drawdown)
});

// The score of a set of draws (P50 − λk − the drawdown penalties), the empty pool scoring 0.
export const scoreOfDraws = (
  draws: ScoreDraws | undefined,
  books: number,
  references: RiskReferences,
  index?: Int32Array
): number => {
  if (!draws || books === 0) {
    return 0;
  }

  const n = index ? index.length : draws.net.length;
  const nets = new Float64Array(n);
  const dds = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const at = index ? index[i]! : i;

    nets[i] = draws.net[at]!;
    dds[i] = draws.drawdown[at]!;
  }

  nets.sort();
  dds.sort();

  return scoreOf(
    { p50: quantileSorted(nets, 0.5), ddMedian: quantileSorted(dds, 0.5), dd90: quantileSorted(dds, 0.9) },
    books,
    references
  ).s;
};

export interface DifferenceInterval {
  estimate: number;
  lower: number; // the (1 − level)/2 quantile of the paired resamples
  upper: number;
  se: number;
  n: number;
  resamples: number;
}

// score(A) − score(B) on identical draw indices, with its percentile interval. B undefined = the empty pool.
export const pairedScoreDifference = (
  a: { draws: ScoreDraws; books: number },
  b: { draws?: ScoreDraws; books: number },
  references: RiskReferences,
  rng: Rng,
  resamples: number = study.bootstrapResamples,
  level: number = study.intervalLevel
): DifferenceInterval => {
  const n = a.draws.net.length;

  if (b.draws && b.draws.net.length !== n) {
    throw new Error(`A paired difference needs equal draw sets (${n} vs ${b.draws.net.length})`);
  }

  const estimate = scoreOfDraws(a.draws, a.books, references) - scoreOfDraws(b.draws, b.books, references);
  const values = new Float64Array(resamples);
  const index = new Int32Array(n);

  for (let r = 0; r < resamples; r++) {
    for (let i = 0; i < n; i++) {
      index[i] = rng.int(n);
    }

    values[r] = scoreOfDraws(a.draws, a.books, references, index) - scoreOfDraws(b.draws, b.books, references, index);
  }

  values.sort();

  const mean = values.reduce((total, value) => total + value, 0) / resamples;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / Math.max(1, resamples - 1);

  return {
    estimate,
    lower: quantileSorted(values, (1 - level) / 2),
    upper: quantileSorted(values, 1 - (1 - level) / 2),
    se: Math.sqrt(variance),
    n,
    resamples
  };
};

export const seeded = (...labels: (string | number)[]) => Rng.from(study.seedLabel, ...labels);
