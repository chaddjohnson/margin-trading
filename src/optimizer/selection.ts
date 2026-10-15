// The pre-declared selection policy. The same deterministic procedure produces the rank-1 primary
// candidate and the ordered top-N shortlist, for every symbol, fold and the final development run.
//
// 1. Gates (all required): drawdown <= limit; entries >= minimum trades; net P&L > 0; share of calendar
//    years in the window with non-negative P&L >= minPositiveYearShare.
// 2. Pool: the gated candidates with the highest training net P&L (poolByNet), plus gated members of the
//    first `poolFronts` Pareto fronts on (net P&L, drawdown), capped at poolFrontCap by net P&L. When the
//    shortlist below comes out shorter than N, the pool grows by another poolByNet candidates by net P&L
//    and steps 3-5 are repeated, up to maxPool, so many behavioural clones of the leader can't crowd out
//    distinct alternatives.
// 3. Neighbourhood: each pool member's one-step neighbours (each parameter moved by its neighbourhood
//    radius to each side) are evaluated on the same window. Gate 5: the median drawdown over the candidate
//    and its neighbours must be within the limit.
// 4. Merit = the lower quartile (25th percentile) of net P&L over the candidate and its neighbours, so an
//    isolated spike scores low. Merit order: merit desc, then own net P&L desc, own drawdown asc, ID asc.
//    Rank 1 is the first in merit order.
// 5. Shortlist: walk the merit order and accept a candidate unless its trade list is identical to an
//    accepted one (behavioural duplicate) or it lies within `diversitySteps` of an accepted one (L1 distance
//    in units of each parameter's neighbourhood radius). If that leaves fewer than N, a second pass accepts
//    the skipped near neighbours (still never behavioural duplicates), labelled "diversity relaxed".
//    Candidates failing a gate are never shortlisted, so fewer than N may be returned.
import { type FitnessConfig, minimumTrades } from './fitness.ts';
import { paretoRanks2d } from './nsga2.ts';
import type { ParameterSpace } from './params.ts';
import type { Candidate, CandidateCache } from './search.ts';

export interface SelectionConfig {
  topN: number;
  minPositiveYearShare: number;
  poolByNet: number; // initial pool and growth step
  maxPool: number;
  poolFronts: number;
  poolFrontCap: number;
  diversitySteps: number;
}

export const defaultSelection: SelectionConfig = {
  topN: 10,
  minPositiveYearShare: 0.5,
  poolByNet: 64,
  maxPool: 1024,
  poolFronts: 2,
  poolFrontCap: 64,
  diversitySteps: 4
};

export interface Gates {
  drawdown: boolean;
  trades: boolean;
  profitable: boolean;
  yearConsistency: boolean;
  neighbourhoodDrawdown?: boolean;
}

export interface Neighbourhood {
  size: number; // neighbours evaluated (up to 14)
  netP25: number;
  netMedian: number;
  netMin: number;
  drawdownMedian: number;
  drawdownMax: number;
  feasibleShare: number;
}

export interface RankedCandidate {
  id: string;
  meritRank: number; // 1-based position in merit order among pool members passing every gate
  merit: number;
  paretoRank: number; // 0-based front among gated candidates
  gates: Gates;
  neighbourhood: Neighbourhood;
  positiveYearShare: number;
}

export interface ShortlistEntry extends RankedCandidate {
  rank: number; // 1-based shortlist rank
  inclusion: 'merit' | 'diversity relaxed';
  behaviouralDuplicates: number; // pool members with the identical trade list, not shortlisted
  reason: string;
}

export interface SelectionResult {
  config: SelectionConfig;
  evaluated: number; // candidates in the archive
  gated: number; // passing gates 1-4
  pool: number;
  passedAll: number; // pool members passing gate 5
  rejectionCounts: Record<string, number>;
  ranked: RankedCandidate[]; // merit order
  shortlist: ShortlistEntry[];
  notes: string[];
}

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

export const positiveYearShare = (candidate: Candidate) => {
  const years = candidate.metrics.years;

  return years.length ? years.filter((year) => year.netProfit >= 0).length / years.length : 0;
};

export const baseGates = (
  candidate: Candidate,
  fitness: FitnessConfig,
  years: number,
  config: SelectionConfig
): Gates => ({
  drawdown: candidate.metrics.maximumDrawdown <= fitness.drawdownLimit * fitness.allocation,
  trades: candidate.metrics.entries >= minimumTrades(fitness, years),
  profitable: candidate.metrics.netProfit > 0,
  yearConsistency: positiveYearShare(candidate) >= config.minPositiveYearShare
});

const passes = (gates: Gates) => gates.drawdown && gates.trades && gates.profitable && gates.yearConsistency;

const steps = (space: ParameterSpace, a: Candidate, b: Candidate) =>
  space.specs.reduce(
    (total, spec, dimension) => total + Math.abs(a.genome[dimension]! - b.genome[dimension]!) / spec.neighborhoodRadius,
    0
  );

type Assessed = RankedCandidate & { candidate: Candidate };

const withoutCandidate = <T extends { candidate: Candidate }>(entry: T): Omit<T, 'candidate'> => {
  const copy: Partial<T> = { ...entry };

  delete copy.candidate;

  return copy as Omit<T, 'candidate'>;
};

const buildShortlist = (ranked: Assessed[], space: ParameterSpace, config: SelectionConfig) => {
  const shortlist: (ShortlistEntry & { candidate: Candidate })[] = [];
  const duplicateCounts = new Map<string, number>();
  const skipped: Assessed[] = [];
  const signatureOwner = (entry: Assessed) =>
    shortlist.find((accepted) => accepted.candidate.metrics.signature === entry.candidate.metrics.signature);

  for (const entry of ranked) {
    const owner = signatureOwner(entry);

    if (owner) {
      duplicateCounts.set(owner.id, (duplicateCounts.get(owner.id) ?? 0) + 1);
      continue;
    }

    if (shortlist.length >= config.topN) {
      continue;
    }

    if (shortlist.some((accepted) => steps(space, accepted.candidate, entry.candidate) < config.diversitySteps)) {
      skipped.push(entry);
      continue;
    }

    shortlist.push({ ...entry, rank: 0, inclusion: 'merit', behaviouralDuplicates: 0, reason: '' });
  }

  for (const entry of skipped) {
    if (shortlist.length >= config.topN) {
      break;
    }

    if (!signatureOwner(entry)) {
      shortlist.push({ ...entry, rank: 0, inclusion: 'diversity relaxed', behaviouralDuplicates: 0, reason: '' });
    }
  }

  shortlist.sort((a, b) => a.meritRank - b.meritRank);
  shortlist.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { shortlist, duplicateCounts };
};

export const selectShortlist = async (
  cache: CandidateCache,
  space: ParameterSpace,
  fitness: FitnessConfig,
  years: number,
  config: SelectionConfig
): Promise<SelectionResult> => {
  const archive = [...cache.entries.values()].filter((candidate) => candidate.origin.stage !== 'neighborhood');
  const gates = new Map(archive.map((candidate) => [candidate.id, baseGates(candidate, fitness, years, config)]));
  const rejectionCounts: Record<string, number> = { drawdown: 0, trades: 0, profitable: 0, yearConsistency: 0 };

  for (const gate of gates.values()) {
    for (const key of Object.keys(rejectionCounts) as (keyof Gates)[]) {
      if (!gate[key]) {
        rejectionCounts[key]!++;
      }
    }
  }

  const gated = archive.filter((candidate) => passes(gates.get(candidate.id)!));
  const paretoRanks = paretoRanks2d(gated);
  const byNet = (a: Candidate, b: Candidate) =>
    b.metrics.netProfit - a.metrics.netProfit || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const sortedByNet = [...gated].sort(byNet);
  const frontMembers = gated
    .filter((member) => paretoRanks.get(member.id)! < config.poolFronts)
    .sort(byNet)
    .slice(0, config.poolFrontCap);
  const assessed = new Map<string, (RankedCandidate & { candidate: Candidate }) | undefined>();
  let neighbourhoodRejections = 0;
  let poolSize = config.poolByNet;
  let pool = new Map<string, Candidate>();
  let ranked: (RankedCandidate & { candidate: Candidate })[] = [];
  let shortlist: (ShortlistEntry & { candidate: Candidate })[] = [];
  let duplicateCounts = new Map<string, number>();

  for (;;) {
    pool = new Map<string, Candidate>();

    for (const candidate of [...sortedByNet.slice(0, poolSize), ...frontMembers]) {
      pool.set(candidate.id, candidate);
    }

    // Sequential and in a fixed order, so the cache and the result are deterministic.
    for (const candidate of [...pool.values()].sort(byNet)) {
      if (assessed.has(candidate.id)) {
        continue;
      }

      const neighbours = await cache.neighbours(candidate);
      const group = [candidate, ...neighbours];
      const nets = group.map((member) => member.metrics.netProfit);
      const drawdowns = group.map((member) => member.metrics.maximumDrawdown);
      const neighbourhood: Neighbourhood = {
        size: neighbours.length,
        netP25: quantile(nets, 0.25),
        netMedian: quantile(nets, 0.5),
        netMin: Math.min(...nets),
        drawdownMedian: quantile(drawdowns, 0.5),
        drawdownMax: Math.max(...drawdowns),
        feasibleShare: group.filter((member) => member.violation === 0).length / group.length
      };
      const candidateGates: Gates = {
        ...gates.get(candidate.id)!,
        neighbourhoodDrawdown: neighbourhood.drawdownMedian <= fitness.drawdownLimit * fitness.allocation
      };

      if (!candidateGates.neighbourhoodDrawdown) {
        neighbourhoodRejections++;
        assessed.set(candidate.id, undefined);
        continue;
      }

      assessed.set(candidate.id, {
        id: candidate.id,
        candidate,
        meritRank: 0,
        merit: neighbourhood.netP25,
        paretoRank: paretoRanks.get(candidate.id)!,
        gates: candidateGates,
        neighbourhood,
        positiveYearShare: positiveYearShare(candidate)
      });
    }

    ranked = [...assessed.values()].filter((entry) => entry !== undefined);
    ranked.sort(
      (a, b) =>
        b.merit - a.merit ||
        b.candidate.metrics.netProfit - a.candidate.metrics.netProfit ||
        a.candidate.metrics.maximumDrawdown - b.candidate.metrics.maximumDrawdown ||
        (a.id < b.id ? -1 : 1)
    );
    ranked.forEach((entry, index) => {
      entry.meritRank = index + 1;
    });
    ({ shortlist, duplicateCounts } = buildShortlist(ranked, space, config));

    if (shortlist.length >= config.topN || poolSize >= sortedByNet.length || poolSize >= config.maxPool) {
      break;
    }

    poolSize = Math.min(poolSize + config.poolByNet, config.maxPool);
  }

  shortlist.forEach((entry) => {
    entry.behaviouralDuplicates = duplicateCounts.get(entry.id) ?? 0;
    entry.reason =
      entry.rank === 1
        ? `Highest merit (neighbourhood lower-quartile net P&L $${Math.round(entry.merit).toLocaleString('en-US')}); recommended primary.`
        : entry.inclusion === 'merit'
          ? `Merit rank ${entry.meritRank}; trades and parameters distinct from higher-ranked entries.`
          : `Merit rank ${entry.meritRank}; added in the relaxed pass (within ${config.diversitySteps} neighbourhood steps of a higher-ranked entry, but trades differently).`;
  });

  const notes: string[] = [];

  if (shortlist.length < config.topN) {
    notes.push(
      `Only ${shortlist.length} distinct candidates passed every gate (requested ${config.topN}); the list is not padded.`
    );
  }

  return {
    config,
    evaluated: archive.length,
    gated: gated.length,
    pool: pool.size,
    passedAll: ranked.length,
    rejectionCounts: { ...rejectionCounts, neighbourhoodDrawdown: neighbourhoodRejections },
    ranked: ranked.map(withoutCandidate),
    shortlist: shortlist.map(withoutCandidate),
    notes
  };
};
