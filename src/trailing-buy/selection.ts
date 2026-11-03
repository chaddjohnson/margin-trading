// The pre-registered selection rule (PROTOCOL.md section 7), the same for every phase, family and fold.
// Candidates are judged by their neighbourhood, not their own point: robust net = the 25th percentile of
// net P&L over the candidate and its neighbours, robust drawdown = the 75th percentile of their maximum
// drawdowns. On the robust Pareto front (robust net up, robust drawdown down) three picks are made:
//   profit    the highest robust net;
//   balanced  the highest robust net whose robust drawdown is no worse than the baseline's drawdown
//             (fallback: the lowest robust drawdown);
//   lowDD     the lowest robust drawdown whose robust net is at least 75% of the baseline's net
//             (fallback: the highest robust net).
// Only feasible candidates (minimum activity, net > 0) compete. Ties break by own net, own drawdown, ID.
import { paretoRanks2d } from '../optimizer/nsga2.ts';
import type { StrategyParams } from './engine.ts';
import { type Space, neighbourGenomes } from './params.ts';
import type { Candidate, CandidateCache } from './search.ts';

export const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

export interface RobustRow {
  id: string;
  params: StrategyParams;
  net: number;
  dd: number;
  entries: number;
  netP25: number;
  ddP75: number;
  netMin: number;
  ddMax: number;
  neighbours: number;
  signature: string;
}

export interface Baseline {
  net: number;
  dd: number;
}

export type PickName = 'profit' | 'balanced' | 'lowDD';

export interface Picks {
  profit: RobustRow;
  balanced: RobustRow & { fallback: boolean };
  lowDD: RobustRow & { fallback: boolean };
}

export const robustStats = (
  self: { id: string; params: StrategyParams; net: number; dd: number; entries: number; signature: string },
  group: { net: number; dd: number }[]
): RobustRow => {
  const nets = group.map((member) => member.net);
  const dds = group.map((member) => member.dd);

  return {
    ...self,
    netP25: quantile(nets, 0.25),
    ddP75: quantile(dds, 0.75),
    netMin: Math.min(...nets),
    ddMax: Math.max(...dds),
    neighbours: group.length - 1
  };
};

const order = (a: RobustRow, b: RobustRow) =>
  b.netP25 - a.netP25 || b.net - a.net || a.dd - b.dd || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const robustFront = (rows: RobustRow[]) => {
  const ranks = paretoRanks2d(
    rows.map((row) => ({ id: row.id, genome: [], objectives: [-row.netP25, row.ddP75], violation: 0 }))
  );

  return rows.filter((row) => ranks.get(row.id) === 0).sort(order);
};

export const makePicks = (front: RobustRow[], baseline: Baseline): Picks => {
  if (front.length === 0) {
    throw new Error('Empty robust front: no feasible candidate');
  }

  const sorted = [...front].sort(order);
  const byDrawdown = [...front].sort((a, b) => a.ddP75 - b.ddP75 || order(a, b));
  const withinDrawdown = sorted.filter((row) => row.ddP75 <= baseline.dd);
  const withinNet = byDrawdown.filter((row) => row.netP25 >= 0.75 * baseline.net);

  return {
    profit: sorted[0]!,
    balanced: withinDrawdown[0] ? { ...withinDrawdown[0], fallback: false } : { ...byDrawdown[0]!, fallback: true },
    lowDD: withinNet[0] ? { ...withinNet[0], fallback: false } : { ...sorted[0]!, fallback: true }
  };
};

// Up to n distinct front members for reporting: the picks first, then evenly spaced along the front by
// robust net; a member trading identically to one already listed is skipped (behavioural duplicate).
export const shortlistOf = (front: RobustRow[], picks: Picks, n = 10) => {
  const sorted = [...front].sort(order);
  const chosen: RobustRow[] = [];
  const signatures = new Set<string>();
  const add = (row: RobustRow) => {
    if (chosen.length < n && !chosen.some((other) => other.id === row.id) && !signatures.has(row.signature)) {
      chosen.push(row);
      signatures.add(row.signature);
    }
  };

  [picks.profit, picks.balanced, picks.lowDD].forEach(add);

  const steps = Math.max(1, Math.floor(sorted.length / n));

  for (let index = 0; index < sorted.length && chosen.length < n; index += steps) {
    add(sorted[index]!);
  }

  for (const row of sorted) {
    add(row);
  }

  return chosen.sort(order);
};

export interface ArchiveSelection {
  feasible: number;
  pool: RobustRow[];
  front: RobustRow[];
  picks: Picks;
  shortlist: RobustRow[];
  neighbourEvaluations: number;
}

const toRow = (candidate: Candidate) => ({
  id: candidate.id,
  params: candidate.params,
  net: candidate.metrics.netProfit,
  dd: candidate.metrics.maximumDrawdown,
  entries: candidate.metrics.entries,
  signature: candidate.signature
});

// Phase 4: the pool is the first non-dominated fronts of the feasible archive (at least poolMin distinct
// strategies, at most poolCap, taken front by front and by net P&L, one member per identical trade list),
// and each pool member's one-step neighbours are simulated on the same training window.
export const selectFromArchive = async (
  space: Space,
  cache: CandidateCache,
  archive: Candidate[],
  baseline: Baseline,
  poolMin = 64,
  poolCap = 256
): Promise<ArchiveSelection> => {
  const feasible = archive.filter((candidate) => candidate.violation === 0 && candidate.metrics.netProfit > 0);
  const ranks = paretoRanks2d(feasible);
  const byRank = [...feasible].sort(
    (a, b) =>
      ranks.get(a.id)! - ranks.get(b.id)! ||
      b.metrics.netProfit - a.metrics.netProfit ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  const pool: Candidate[] = [];

  // Behavioural clones (an identical training trade list) enter the pool once, as their first member in
  // this order, so a cluster of identical strategies cannot fill it (PROTOCOL.md Amendment 2).
  const signatures = new Set<string>();

  for (const candidate of byRank) {
    const rank = ranks.get(candidate.id)!;
    const lastRank = pool.length ? ranks.get(pool.at(-1)!.id)! : 0;

    if (pool.length >= poolCap || (pool.length >= poolMin && rank > lastRank)) {
      break;
    }

    if (!signatures.has(candidate.signature)) {
      signatures.add(candidate.signature);
      pool.push(candidate);
    }
  }

  const before = cache.simulations;
  const rows: RobustRow[] = [];

  for (const candidate of pool) {
    const genomes = neighbourGenomes(space, candidate.genome);
    const neighbours = await cache.evaluate(
      genomes,
      genomes.map(() => ({ stage: 'neighbourhood', of: candidate.id }))
    );

    rows.push(robustStats(toRow(candidate), [toRow(candidate), ...neighbours.map(toRow)]));
  }

  const front = robustFront(rows);
  const picks = makePicks(front, baseline);

  return {
    feasible: feasible.length,
    pool: rows,
    front,
    picks,
    shortlist: shortlistOf(front, picks),
    neighbourEvaluations: cache.simulations - before
  };
};
