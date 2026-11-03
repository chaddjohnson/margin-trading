// The pre-declared selection policy of the minute optimizer (MINUTE_OPTIMIZER_DESIGN.md). One deterministic
// procedure produces the rank-1 primary candidate and the ordered top-N, for every fold and the final
// development run. It follows the daily optimizer's policy (src/optimizer/selection.ts), with gates for
// cost robustness, exposure and single-trade dependence, minute-sampled drawdowns throughout, and joint
// multi-parameter perturbations in the stability merit.
//
// All money figures are at the selection cost (5 bp per side) unless a gate says otherwise.
// 1. Gates (all required), on the training window:
//    G1 minute-sampled drawdown <= limit ($30,000);
//    G2 entries >= ceil(2 x years in the window);
//    G3 net P&L > 0;
//    G4 at least half the calendar years in the window have non-negative P&L;
//    G5 still profitable at the stress cost (20 bp per side);
//    G6 exposure >= 5% of sessions;
//    G7 net P&L without the single best trade > 0 (not one lucky trade).
// 2. Pool: the gated candidates with the highest net P&L (poolByNet), plus gated members of the first
//    `poolFronts` Pareto fronts on (net P&L, minute drawdown), capped at poolFrontCap by net P&L. If the
//    shortlist comes out shorter than N, the pool grows by poolByNet and steps 3-5 repeat, up to maxPool.
// 3. Neighbourhood: each pool member's 14 one-step neighbours (each parameter moved by its radius to each
//    side) and 16 joint perturbations (all parameters moved at once, uniformly within their radii) are
//    evaluated on the same window. G8: the median minute drawdown over the candidate and its one-step
//    neighbours must be within the limit.
// 4. Merit = the lower quartile of net P&L over the candidate, its neighbours and its perturbations, so an
//    isolated spike scores low and a plateau scores high. Merit order: merit desc, own net P&L desc, own
//    minute drawdown asc, candidate ID asc. Rank 1 is the first in merit order.
// 5. Shortlist: walk the merit order, accepting a candidate unless its trade list is identical to an
//    accepted one (a behavioural duplicate: same phenotype) or it lies within `diversitySteps` of one
//    (L1 distance in neighbourhood radii). If that leaves fewer than N, a second pass accepts the skipped
//    near neighbours that trade differently, labelled "diversity relaxed". Never padded with gate failures.
import { paretoRanks2d } from '../optimizer/nsga2.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { type MinuteMetrics, levelIndexOf, levelOf } from './evaluate.ts';
import { type MinuteFitnessConfig, minimumTrades } from './fitness.ts';
import type { MinuteCandidate, MinuteCandidateCache } from './search.ts';

export interface MinuteSelectionConfig {
  topN: number;
  minPositiveYearShare: number;
  poolByNet: number;
  maxPool: number;
  poolFronts: number;
  poolFrontCap: number;
  diversitySteps: number;
  perturbations: number;
}

export const defaultMinuteSelection: MinuteSelectionConfig = {
  topN: 10,
  minPositiveYearShare: 0.5,
  poolByNet: 64,
  maxPool: 1024,
  poolFronts: 2,
  poolFrontCap: 64,
  diversitySteps: 4,
  perturbations: 16
};

export interface Gates {
  drawdown: boolean;
  trades: boolean;
  profitable: boolean;
  yearConsistency: boolean;
  costRobust: boolean;
  exposure: boolean;
  notSingleTrade: boolean;
  neighbourhoodDrawdown?: boolean;
}

const baseGateKeys = [
  'drawdown',
  'trades',
  'profitable',
  'yearConsistency',
  'costRobust',
  'exposure',
  'notSingleTrade'
] as const;

export interface Neighbourhood {
  neighbours: number; // one-step neighbours evaluated (up to 14)
  perturbations: number;
  netP25: number; // over the candidate, neighbours and perturbations
  netMedian: number;
  netMin: number;
  neighbourNetMin: number;
  drawdownMedian: number; // over the candidate and its one-step neighbours
  drawdownMax: number;
  feasibleShare: number;
  sameTradesShare: number; // share of neighbours and perturbations trading identically to the candidate
}

export interface RankedCandidate {
  id: string;
  meritRank: number;
  merit: number;
  paretoRank: number;
  gates: Gates;
  neighbourhood: Neighbourhood;
  positiveYearShare: number;
}

export interface ShortlistEntry extends RankedCandidate {
  rank: number;
  inclusion: 'merit' | 'diversity relaxed';
  behaviouralDuplicates: number;
  reason: string;
}

export interface SelectionResult {
  config: MinuteSelectionConfig;
  evaluated: number;
  gated: number;
  pool: number;
  passedAll: number;
  rejectionCounts: Record<string, number>;
  ranked: RankedCandidate[];
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

export const selectionNet = (metrics: MinuteMetrics, fitness: MinuteFitnessConfig) =>
  levelOf(metrics, fitness.selectionCostBps).netProfit;

export const selectionDrawdown = (metrics: MinuteMetrics, fitness: MinuteFitnessConfig) =>
  levelOf(metrics, fitness.selectionCostBps).minuteDrawdown;

export const positiveYearShare = (metrics: MinuteMetrics, fitness: MinuteFitnessConfig) => {
  const level = levelIndexOf(metrics, fitness.selectionCostBps);
  const years = metrics.years;

  return years.length ? years.filter((year) => year.net[level]! >= 0).length / years.length : 0;
};

export const baseGates = (
  metrics: MinuteMetrics,
  fitness: MinuteFitnessConfig,
  years: number,
  config: MinuteSelectionConfig
): Gates => {
  const level = levelOf(metrics, fitness.selectionCostBps);

  return {
    drawdown: level.minuteDrawdown <= fitness.drawdownLimit * fitness.allocation,
    trades: metrics.entries >= minimumTrades(fitness, years),
    profitable: level.netProfit > 0,
    yearConsistency: positiveYearShare(metrics, fitness) >= config.minPositiveYearShare,
    costRobust: levelOf(metrics, fitness.stressCostBps).netProfit > 0,
    exposure: metrics.exposure >= fitness.minExposure,
    notSingleTrade: level.netProfit - Math.max(0, level.bestTrade) > 0
  };
};

export const passesBaseGates = (gates: Gates) => baseGateKeys.every((key) => gates[key]);

const steps = (space: ParameterSpace, a: MinuteCandidate, b: MinuteCandidate) =>
  space.specs.reduce(
    (total, spec, dimension) => total + Math.abs(a.genome[dimension]! - b.genome[dimension]!) / spec.neighborhoodRadius,
    0
  );

type Assessed = RankedCandidate & { candidate: MinuteCandidate };

const withoutCandidate = <T extends { candidate: MinuteCandidate }>(entry: T): Omit<T, 'candidate'> => {
  const copy: Partial<T> = { ...entry };

  delete copy.candidate;

  return copy as Omit<T, 'candidate'>;
};

const buildShortlist = (ranked: Assessed[], space: ParameterSpace, config: MinuteSelectionConfig) => {
  const shortlist: (ShortlistEntry & { candidate: MinuteCandidate })[] = [];
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
  cache: MinuteCandidateCache,
  space: ParameterSpace,
  fitness: MinuteFitnessConfig,
  years: number,
  config: MinuteSelectionConfig
): Promise<SelectionResult> => {
  // The archive is what the search produced; robustness probes and controls are not candidates.
  const archive = [...cache.entries.values()].filter(
    (candidate) =>
      candidate.origin.stage !== 'neighborhood' &&
      candidate.origin.stage !== 'perturbation' &&
      candidate.origin.stage !== 'control'
  );
  const gates = new Map(
    archive.map((candidate) => [candidate.id, baseGates(candidate.metrics, fitness, years, config)])
  );
  const rejectionCounts: Record<string, number> = Object.fromEntries(baseGateKeys.map((key) => [key, 0]));

  for (const gate of gates.values()) {
    for (const key of baseGateKeys) {
      if (!gate[key]) {
        rejectionCounts[key]!++;
      }
    }
  }

  const gated = archive.filter((candidate) => passesBaseGates(gates.get(candidate.id)!));
  const paretoRanks = paretoRanks2d(gated);
  const net = (candidate: MinuteCandidate) => selectionNet(candidate.metrics, fitness);
  const byNet = (a: MinuteCandidate, b: MinuteCandidate) => net(b) - net(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const sortedByNet = [...gated].sort(byNet);
  const frontMembers = gated
    .filter((member) => paretoRanks.get(member.id)! < config.poolFronts)
    .sort(byNet)
    .slice(0, config.poolFrontCap);
  const assessed = new Map<string, Assessed | undefined>();
  let neighbourhoodRejections = 0;
  let poolSize = config.poolByNet;
  let pool = new Map<string, MinuteCandidate>();
  let ranked: Assessed[] = [];
  let shortlist: (ShortlistEntry & { candidate: MinuteCandidate })[] = [];
  let duplicateCounts = new Map<string, number>();

  for (;;) {
    pool = new Map<string, MinuteCandidate>();

    for (const candidate of [...sortedByNet.slice(0, poolSize), ...frontMembers]) {
      pool.set(candidate.id, candidate);
    }

    // Sequential and in a fixed order, so the cache and the result are deterministic.
    for (const candidate of [...pool.values()].sort(byNet)) {
      if (assessed.has(candidate.id)) {
        continue;
      }

      const neighbours = await cache.neighbours(candidate);
      const perturbed = await cache.perturbations(candidate, config.perturbations);
      const local = [candidate, ...neighbours];
      const all = [...local, ...perturbed];
      const nets = all.map(net);
      const drawdowns = local.map((member) => selectionDrawdown(member.metrics, fitness));
      const neighbourhood: Neighbourhood = {
        neighbours: neighbours.length,
        perturbations: perturbed.length,
        netP25: quantile(nets, 0.25),
        netMedian: quantile(nets, 0.5),
        netMin: Math.min(...nets),
        neighbourNetMin: Math.min(...neighbours.map(net)),
        drawdownMedian: quantile(drawdowns, 0.5),
        drawdownMax: Math.max(...drawdowns),
        feasibleShare: all.filter((member) => member.violation === 0).length / all.length,
        sameTradesShare:
          all.slice(1).filter((member) => member.metrics.signature === candidate.metrics.signature).length /
          Math.max(1, all.length - 1)
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
        positiveYearShare: positiveYearShare(candidate.metrics, fitness)
      });
    }

    ranked = [...assessed.values()].filter((entry) => entry !== undefined);
    ranked.sort(
      (a, b) =>
        b.merit - a.merit ||
        net(b.candidate) - net(a.candidate) ||
        selectionDrawdown(a.candidate.metrics, fitness) - selectionDrawdown(b.candidate.metrics, fitness) ||
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
        ? `Highest merit (lower-quartile net P&L over its neighbourhood and perturbations, $${Math.round(entry.merit).toLocaleString('en-US')} at ${fitness.selectionCostBps} bp/side); primary candidate.`
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
