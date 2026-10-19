// The deterministic top-10 selection (PROTOCOL.md section 7), applied identically to every family and fit:
// 1. Feasible candidates with positive training net profit are grouped by phenotype (the hash of their
//    training trade list). Each group is represented by the member nearest the group's coordinate-wise median
//    genome (the centre of the clone plateau), ties by candidate ID.
// 2. The pool (PROTOCOL.md Amendment 1): representatives in Pareto order (net up, minute drawdown down; within
//    a front by crowding distance, then ID) are scanned and each becomes a behaviour-cluster leader unless it
//    is a behavioural clone (held-session Jaccard >= 0.8) of an earlier leader. The first 100 leaders form the
//    pool (scanning at most 6,000 representatives).
// 3. Each pool member is probed one parameter at a time (+-0.1/0.3/0.5 points, +-1/2/3 days, +-2/5/10
//    sessions; off-lattice probes skipped) on the same training data. Robust net = 25th percentile of net
//    profit over the centre and its probes; robust drawdown = 75th percentile of minute drawdown.
// 4. Classification: fragile if robust net <= 0, robust net < 50% of the centre's, or any one-step probe
//    nets < 50% of the centre; stable if robust net >= 80% of the centre's and robust drawdown <= 125% of
//    the centre's + $1,000; moderate otherwise.
// 5. Picks (eligible: robust net > 0; fragile members only if too few others): 3 'profit' (highest robust
//    net), 3 'balanced' (nearest the utopia point in normalized robust net / robust drawdown, among meaningful
//    ones: robust net >= 25% of the pool's best), 2 'low-DD' (lowest robust drawdown among meaningful), 2
//    'Pareto-diverse' (robust Pareto rank, then crowding distance). Phenotypes never repeat, and no pick may be
//    a behavioural clone of an earlier one: sharing 80% or more of its held sessions (Jaccard overlap of the
//    sessions with a position at the close; PROTOCOL.md Amendment 1). If the non-fragile members can't give
//    ten mutually distinct picks, fragile ones fill the remaining 'Pareto-diverse' slots.
import { crowdingDistances, paretoRanks2d } from '../optimizer/nsga2.ts';
import type { Metrics } from './evaluate.ts';
import { type Family, type IntParams, candidateId, familySpecs, genomeToParams, gridSize } from './families.ts';
import type { CandidateRecord, StageArchive } from './search.ts';

export type Category = 'profit' | 'balanced' | 'low-DD' | 'Pareto-diverse';

export const selectionConfig = {
  poolLeaders: 100,
  poolScanLimit: 6000,
  picks: [
    { category: 'profit' as Category, count: 3 },
    { category: 'balanced' as Category, count: 3 },
    { category: 'low-DD' as Category, count: 2 },
    { category: 'Pareto-diverse' as Category, count: 2 }
  ],
  meaningfulShare: 0.25,
  cloneJaccard: 0.8,
  fragileCentreShare: 0.5,
  fragileStepShare: 0.5,
  stableNetShare: 0.8,
  stableDrawdownFactor: 1.25,
  stableDrawdownSlack: 1000
};

export interface PhenotypeGroup {
  signature: string;
  representative: CandidateRecord;
  size: number;
  memberIds: string[];
}

export interface Probe {
  param: string;
  steps: number;
  id: string;
  params: IntParams;
  net: number;
  minuteDrawdown: number;
  entries: number;
  feasible: boolean;
  sameSignature: boolean;
}

export interface Robustness {
  centreNet: number;
  centreDrawdown: number;
  probes: number;
  feasibleShare: number;
  cloneShare: number; // probes with the centre's exact trades
  medianNet: number;
  robustNet: number; // 25th percentile
  minimumNet: number;
  medianDrawdown: number;
  robustDrawdown: number; // 75th percentile
  maximumDrawdown: number;
  worstOneStepNet: number;
  classification: 'stable' | 'moderate' | 'fragile';
  notes: string[];
}

export interface PoolMember {
  group: PhenotypeGroup;
  paretoRank: number;
  followers?: number; // phenotypes absorbed into this behaviour cluster during the scan
  robustness: Robustness;
  probeList: Probe[];
}

export interface Pick {
  rank: number;
  category: Category;
  id: string;
  params: IntParams;
  signature: string;
  cloneGroupSize: number;
  paretoRank: number;
  metrics: Metrics;
  robustness: Robustness;
  maximumOverlapWithEarlierPicks: number; // held-session Jaccard
}

export const quantile = (values: number[], q: number) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);

  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
};

export const groupPhenotypes = (family: Family, records: CandidateRecord[]): PhenotypeGroup[] => {
  const specs = familySpecs(family);
  const bySignature = new Map<string, CandidateRecord[]>();

  for (const record of records) {
    const list = bySignature.get(record.metrics.signature) ?? [];

    list.push(record);
    bySignature.set(record.metrics.signature, list);
  }

  return [...bySignature.entries()].map(([signature, members]) => {
    const median = specs.map((_spec, dimension) =>
      quantile(
        members.map((member) => member.genome[dimension]!),
        0.5
      )
    );
    const distance = (member: CandidateRecord) =>
      specs.reduce(
        (total, spec, dimension) =>
          total + Math.abs(member.genome[dimension]! - median[dimension]!) / Math.max(1, gridSize(spec) - 1),
        0
      );
    const representative = [...members].sort((a, b) => distance(a) - distance(b) || (a.id < b.id ? -1 : 1))[0]!;

    return {
      signature,
      representative,
      size: members.length,
      memberIds: members.map((member) => member.id).sort()
    };
  });
};

// The behaviour-cluster leaders: eligible representatives in Pareto order, each kept unless it is a behavioural
// clone of an earlier leader.
export const buildPool = (groups: PhenotypeGroup[], heldOf: (record: CandidateRecord) => ReadonlySet<number>) => {
  const eligible = groups.filter(
    (group) => group.representative.violation === 0 && group.representative.metrics.net > 0
  );
  const ranks = paretoRanks2d(eligible.map((group) => group.representative));
  const byRank = new Map<number, PhenotypeGroup[]>();

  for (const group of eligible) {
    const rank = ranks.get(group.representative.id)!;

    byRank.set(rank, [...(byRank.get(rank) ?? []), group]);
  }

  const leaders: { group: PhenotypeGroup; paretoRank: number; held: ReadonlySet<number>; followers: number }[] = [];
  let scanned = 0;

  scan: for (const rank of [...byRank.keys()].sort((a, b) => a - b)) {
    const front = byRank.get(rank)!;
    const crowding = crowdingDistances(front.map((group) => group.representative));
    const ordered = [...front].sort(
      (a, b) =>
        crowding.get(b.representative.id)! - crowding.get(a.representative.id)! ||
        (a.representative.id < b.representative.id ? -1 : 1)
    );

    for (const group of ordered) {
      if (leaders.length >= selectionConfig.poolLeaders || scanned >= selectionConfig.poolScanLimit) {
        break scan;
      }

      scanned++;

      const held = heldOf(group.representative);
      const cluster = leaders.find((leader) => jaccard(held, leader.held) >= selectionConfig.cloneJaccard);

      if (cluster) {
        cluster.followers++;
      } else {
        leaders.push({ group, paretoRank: rank, held, followers: 0 });
      }
    }
  }

  return { pool: leaders, eligibleGroups: eligible.length, scanned };
};

export const jaccard = (a: ReadonlySet<number>, b: ReadonlySet<number>) => {
  let shared = 0;

  for (const value of a) {
    if (b.has(value)) {
      shared++;
    }
  }

  const union = a.size + b.size - shared;

  return union === 0 ? 1 : shared / union;
};

export const probeGenomes = (family: Family, genome: readonly number[]) => {
  const probes: { param: string; steps: number; genome: number[] }[] = [];

  familySpecs(family).forEach((spec, dimension) => {
    for (const steps of spec.probes) {
      const index = genome[dimension]! + steps;

      if (index >= 0 && index < gridSize(spec)) {
        const probe = [...genome];

        probe[dimension] = index;
        probes.push({ param: spec.key, steps, genome: probe });
      }
    }
  });

  return probes;
};

export const assessRobustness = (centre: CandidateRecord, probes: Probe[]): Robustness => {
  const nets = [centre.metrics.net, ...probes.map((probe) => probe.net)];
  const drawdowns = [centre.metrics.minuteDrawdown, ...probes.map((probe) => probe.minuteDrawdown)];
  const centreNet = centre.metrics.net;
  const centreDrawdown = centre.metrics.minuteDrawdown;
  const oneStep = probes.filter((probe) => Math.abs(probe.steps) === 1);
  const worstOneStepNet = oneStep.length > 0 ? Math.min(...oneStep.map((probe) => probe.net)) : centreNet;
  const robustNet = quantile(nets, 0.25);
  const robustDrawdown = quantile(drawdowns, 0.75);
  const notes: string[] = [];
  const config = selectionConfig;

  if (robustNet <= 0) {
    notes.push('robust net <= 0');
  }

  if (robustNet < config.fragileCentreShare * centreNet) {
    notes.push(`robust net below ${config.fragileCentreShare * 100}% of the centre`);
  }

  const cliffs = oneStep.filter((probe) => probe.net < config.fragileStepShare * centreNet);

  if (cliffs.length > 0) {
    notes.push(
      `one-step cliff: ${cliffs.map((probe) => `${probe.param} ${probe.steps > 0 ? '+' : ''}${probe.steps}`).join(', ')}`
    );
  }

  const classification =
    notes.length > 0
      ? 'fragile'
      : robustNet >= config.stableNetShare * centreNet &&
          robustDrawdown <= config.stableDrawdownFactor * centreDrawdown + config.stableDrawdownSlack
        ? 'stable'
        : 'moderate';

  return {
    centreNet,
    centreDrawdown,
    probes: probes.length,
    feasibleShare: probes.length > 0 ? probes.filter((probe) => probe.feasible).length / probes.length : 1,
    cloneShare: probes.length > 0 ? probes.filter((probe) => probe.sameSignature).length / probes.length : 0,
    medianNet: quantile(nets, 0.5),
    robustNet,
    minimumNet: Math.min(...nets),
    medianDrawdown: quantile(drawdowns, 0.5),
    robustDrawdown,
    maximumDrawdown: Math.max(...drawdowns),
    worstOneStepNet,
    classification,
    notes
  };
};

// Probes every pool member through `archive` (which caches) after looking each probe up in `known`.
export const probePool = async (
  family: Family,
  pool: { group: PhenotypeGroup; paretoRank: number; followers?: number }[],
  known: Map<string, CandidateRecord>,
  archive: StageArchive
): Promise<PoolMember[]> => {
  const requests = pool.flatMap(({ group }) =>
    probeGenomes(family, group.representative.genome).map((probe) => ({
      centre: group.representative.id,
      ...probe,
      params: genomeToParams(family, probe.genome)
    }))
  );
  const unknown = requests.filter((request) => !known.has(candidateId(family, request.params)));
  const evaluated = await archive.evaluate(
    unknown.map((request) => request.params),
    unknown.map((request) => `probe-of-${request.centre}`)
  );
  const lookup = new Map(known);

  for (const record of evaluated) {
    lookup.set(record.id, record);
  }

  return pool.map(({ group, paretoRank, followers }) => {
    const centre = group.representative;
    const probeList = requests
      .filter((request) => request.centre === centre.id)
      .map((request): Probe => {
        const id = candidateId(family, request.params);
        const record = lookup.get(id)!;

        return {
          param: request.param,
          steps: request.steps,
          id,
          params: request.params,
          net: record.metrics.net,
          minuteDrawdown: record.metrics.minuteDrawdown,
          entries: record.metrics.entries,
          feasible: record.violation === 0,
          sameSignature: record.metrics.signature === centre.metrics.signature
        };
      });

    return { group, paretoRank, followers, robustness: assessRobustness(centre, probeList), probeList };
  });
};

// The ten picks from the probed pool. `held` gives each member's held sessions (position open at the close).
export const pickTopTen = (members: PoolMember[], held: (id: string) => ReadonlySet<number>): Pick[] => {
  const config = selectionConfig;
  const total = config.picks.reduce((sum, { count }) => sum + count, 0);
  const eligible = members.filter((member) => member.robustness.robustNet > 0);
  const sturdy = eligible.filter((member) => member.robustness.classification !== 'fragile');
  const chosen: { member: PoolMember; category: Category; overlap: number }[] = [];
  const id = (member: PoolMember) => member.group.representative.id;
  const byId = (a: PoolMember, b: PoolMember) => (id(a) < id(b) ? -1 : id(a) > id(b) ? 1 : 0);
  const overlapWithChosen = (member: PoolMember) =>
    Math.max(0, ...chosen.map((entry) => jaccard(held(id(member)), held(id(entry.member)))));
  const available = (from: PoolMember[]) =>
    from.filter(
      (member) => !chosen.some((entry) => entry.member === member) && overlapWithChosen(member) < config.cloneJaccard
    );
  const range = (values: number[]) => ({ low: Math.min(...values), high: Math.max(...values) });
  const netRange = range(sturdy.map((member) => member.robustness.robustNet));
  const drawdownRange = range(sturdy.map((member) => member.robustness.robustDrawdown));
  const bestRobustNet = Math.max(0, ...sturdy.map((member) => member.robustness.robustNet));
  const meaningful = (member: PoolMember) => member.robustness.robustNet >= config.meaningfulShare * bestRobustNet;
  const utopiaDistance = (member: PoolMember) => {
    const x = (netRange.high - member.robustness.robustNet) / Math.max(1e-9, netRange.high - netRange.low);
    const y =
      (member.robustness.robustDrawdown - drawdownRange.low) / Math.max(1e-9, drawdownRange.high - drawdownRange.low);

    return Math.hypot(x, y);
  };
  const paretoDiverse = (remaining: PoolMember[]) => {
    const scored = remaining.map((member) => ({
      id: id(member),
      genome: member.group.representative.genome,
      objectives: [-member.robustness.robustNet, member.robustness.robustDrawdown],
      violation: 0,
      member
    }));
    const ranks = paretoRanks2d(scored);
    const bestRank = Math.min(...scored.map((entry) => ranks.get(entry.id)!));
    const front = scored.filter((entry) => ranks.get(entry.id) === bestRank);
    const crowding = crowdingDistances(front);

    return front.sort((a, b) => crowding.get(b.id)! - crowding.get(a.id)! || (a.id < b.id ? -1 : 1))[0]?.member;
  };
  const add = (member: PoolMember | undefined, category: Category) => {
    if (member) {
      chosen.push({ member, category, overlap: overlapWithChosen(member) });
    }
  };

  for (const { category, count } of config.picks) {
    for (let index = 0; index < count; index++) {
      const remaining = available(sturdy);

      if (category === 'profit') {
        add(
          [...remaining].sort(
            (a, b) =>
              b.robustness.robustNet - a.robustness.robustNet ||
              b.group.representative.metrics.net - a.group.representative.metrics.net ||
              byId(a, b)
          )[0],
          category
        );
      } else if (category === 'balanced') {
        add(
          remaining.filter(meaningful).sort((a, b) => utopiaDistance(a) - utopiaDistance(b) || byId(a, b))[0],
          category
        );
      } else if (category === 'low-DD') {
        add(
          remaining
            .filter(meaningful)
            .sort(
              (a, b) =>
                a.robustness.robustDrawdown - b.robustness.robustDrawdown ||
                b.robustness.robustNet - a.robustness.robustNet ||
                byId(a, b)
            )[0],
          category
        );
      } else {
        add(paretoDiverse(remaining), category);
      }
    }
  }

  // Too few distinct non-fragile members: fragile (but positive robust net) ones fill the remaining slots.
  while (chosen.length < total) {
    const next = paretoDiverse(available(eligible));

    if (!next) {
      break;
    }

    add(next, 'Pareto-diverse');
  }

  return chosen.map(({ member, category, overlap }, index) => ({
    rank: index + 1,
    category,
    id: member.group.representative.id,
    params: member.group.representative.params,
    signature: member.group.signature,
    cloneGroupSize: member.group.size,
    paretoRank: member.paretoRank,
    metrics: member.group.representative.metrics,
    robustness: member.robustness,
    maximumOverlapWithEarlierPicks: overlap
  }));
};
