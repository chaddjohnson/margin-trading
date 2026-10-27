// The selection procedure (PROTOCOL.md §7), run identically on each selection window with the bars before its cutoff
// only:
//  1. Sobol: the study's first `budgets.sobol` distinct grid vectors, at the principal costs.
//  2. Feasibility: G1 (minute peak-to-trough <= 35% and <= 35,000 USDT, entries >= ceil(3/yr), net > 0), G2 (net
//     minus the two largest positive trade nets > 0) and G6 (net > 0 in >= 2 of 3 consecutive subperiods).
//  3. Refinement seeds: the feasible vectors in rank order (net, then key), each taken only if its exposure-day
//     Jaccard distance from every earlier seed is >= 0.5, up to `refinementSeeds`. Each seed gets the same budget: a
//     (1 + offspring) evolution for `generations` generations; the parent is replaced by the best feasible offspring
//     with a higher net. No seed can take another's budget (no seeded-arm monopoly).
//  4. Pool: every distinct vector evaluated and feasible, one per trade schedule (the best-ranked vector of each
//     signature), ranked by net. Shortlist: down that ranking, a vector is admitted only if its exposure-day
//     distance from every admitted vector is >= 0.1 and its refinement lineage has < 6 admitted vectors, up to
//     `shortlist` vectors (no lineage can fill it).
//  5. Robustness of each shortlisted vector: `neighbours` joint radius-1 draws (G3: >= 50% pass G1, median net > 0),
//     `wideNeighbours` radius-2 draws (reported), the conservative costs (G4: net > 0), worst-case stop fills (G5:
//     net > 0).
//  6. Score = the median radius-1 neighbour net. Families: the eligible (G1-G6) vectors by score, each promoted only
//     if its exposure-day distance from every earlier pick is >= 0.5, up to three slots (no chaining: distance is
//     to every pick, not to the nearest).
import type { Window } from './calendar.ts';
import type { EvalRequest, Metrics } from './evaluate.ts';
import { scheduleDistance } from './evaluate.ts';
import type { D1Grid } from './params.ts';
import { gridKey } from './params.ts';
import type { Pool } from './pool.ts';
import { minTradesFor, procedure } from './protocol.ts';
import { mutate, neighbour, rngFor, sobolGrids } from './space.ts';

export interface Candidate {
  metrics: Metrics;
  origin: string;
  g1: boolean;
  g2: boolean;
  g6: boolean;
  neighbours?: { feasibleShare: number; medianNet: number; nets: number[]; percents: number[] };
  wide?: { feasibleShare: number; medianNet: number; nets: number[]; percents: number[] };
  conservative?: Metrics;
  worstFill?: Metrics;
  g3?: boolean;
  g4?: boolean;
  g5?: boolean;
  score?: number;
}

export interface SelectionResult {
  label: string;
  window: Window;
  minTrades: number;
  evaluated: number;
  sobol: { evaluated: number; g1: number; g2: number; feasible: number };
  seeds: { key: string; net: number }[];
  refinement: { seed: string; final: string; finalNet: number; improvements: number }[];
  poolSize: number;
  distinctSchedules: number;
  shortlistSkips: { nearDuplicates: number; lineageQuota: number };
  shortlist: Candidate[];
  eligible: string[];
  picks: Candidate[];
  exploratoryLowDrawdown?: Candidate;
  archive: Metrics[]; // every evaluation (Sobol and refinement), for the record
}

const rankOrder = (a: Metrics, b: Metrics) => b.net - a.net || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length === 0 ? NaN : sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

export const runSelection = async (
  pool: Pool,
  label: string,
  window: Window,
  armStartDay: number,
  log: (text: string) => void = () => {}
): Promise<SelectionResult> => {
  const { budgets, settings } = procedure;
  const minTrades = minTradesFor(window.endDay - window.startDay);
  const passesG1 = (m: Metrics) =>
    m.minutePercent <= procedure.gates.maxMinutePercent &&
    m.minuteDrawdown <= procedure.gates.maxMinuteDrawdownUsdt &&
    m.entries >= minTrades &&
    m.net > 0;
  const passesG2 = (m: Metrics) => m.netExTopTwo > 0;
  const passesG6 = (m: Metrics) => m.subNets.filter((net) => net > 0).length >= procedure.gates.minPositiveSubperiods;
  const feasible = (m: Metrics) => passesG1(m) && passesG2(m) && passesG6(m);
  const request = (grid: D1Grid, executionSettings = settings.principal): EvalRequest => ({
    grid,
    settings: executionSettings,
    armStartDay,
    window
  });
  const evaluated = new Map<string, { metrics: Metrics; origin: string }>();
  const evaluate = async (grids: { grid: D1Grid; origin: string }[], phase: string) => {
    const batch = new Set<string>();
    const fresh = grids.filter(({ grid }) => {
      const key = gridKey(grid);

      if (evaluated.has(key) || batch.has(key)) {
        return false;
      }

      batch.add(key);
      return true;
    });
    const results = await pool.evaluate(
      fresh.map(({ grid }) => request(grid)),
      16,
      (done, total) => {
        if (done === total || done % 2048 < 16) {
          log(`${label} ${phase}: ${done}/${total}`);
        }
      }
    );

    results.forEach((metrics, index) => evaluated.set(metrics.key, { metrics, origin: fresh[index]!.origin }));

    return grids.map(({ grid }) => evaluated.get(gridKey(grid))!.metrics);
  };

  // 1-2. Sobol and the feasible set.
  const sobol = await evaluate(
    sobolGrids(budgets.sobol).map((grid, index) => ({ grid, origin: `sobol-${index}` })),
    'sobol'
  );
  const sobolFeasible = sobol.filter(feasible).sort(rankOrder);

  // 3. Diverse refinement seeds, equal budgets.
  const seeds: Metrics[] = [];

  for (const candidate of sobolFeasible) {
    if (seeds.length >= budgets.refinementSeeds) {
      break;
    }

    if (seeds.every((seed) => scheduleDistance(seed.schedule, candidate.schedule) >= procedure.seedMinDistance)) {
      seeds.push(candidate);
    }
  }

  const parents = seeds.map((seed) => seed);
  const improvements = seeds.map(() => 0);

  for (let generation = 1; generation <= budgets.generations; generation++) {
    const offspring = parents.flatMap((parent, seedIndex) => {
      const rng = rngFor(label, 'refine', seedIndex, generation);

      return Array.from({ length: budgets.offspring }, (_value, child) => ({
        grid: mutate(parent.grid, rng),
        origin: `refine-s${seedIndex}-g${generation}-c${child}`
      }));
    });
    const results = await evaluate(offspring, `refine g${generation}`);

    parents.forEach((parent, seedIndex) => {
      const children = results.slice(seedIndex * budgets.offspring, (seedIndex + 1) * budgets.offspring);
      const best = children.filter(feasible).sort(rankOrder)[0];

      if (best && best.net > parent.net) {
        parents[seedIndex] = best;
        improvements[seedIndex]!++;
      }
    });
  }

  // 4. The pool: feasible, one vector per schedule, ranked.
  const all = [...evaluated.values()];
  const feasiblePool = all.filter(({ metrics }) => feasible(metrics)).sort((a, b) => rankOrder(a.metrics, b.metrics));
  const schedules = new Set<string>();
  const distinct = feasiblePool.filter(({ metrics }) => {
    if (schedules.has(metrics.signature)) {
      return false;
    }

    schedules.add(metrics.signature);
    return true;
  });
  // The shortlist: near-duplicates (exposure-day distance < 0.1 from an admitted vector) and a seventh vector of one
  // refinement lineage are skipped, so hill-climbed variants of one seed cannot fill it.
  const lineageOf = (origin: string) => (origin.startsWith('refine-') ? origin.split('-')[1]! : 'sobol');
  const lineageCounts = new Map<string, number>();
  const admitted: { metrics: Metrics; origin: string }[] = [];
  let skippedNearDuplicates = 0;
  let skippedLineage = 0;

  for (const entry of distinct) {
    if (admitted.length >= budgets.shortlist) {
      break;
    }

    const lineage = lineageOf(entry.origin);

    if (lineage !== 'sobol' && (lineageCounts.get(lineage) ?? 0) >= procedure.shortlistRule.lineageQuota) {
      skippedLineage++;
      continue;
    }

    if (
      admitted.some(
        (other) =>
          scheduleDistance(other.metrics.schedule, entry.metrics.schedule) < procedure.shortlistRule.minDistance
      )
    ) {
      skippedNearDuplicates++;
      continue;
    }

    admitted.push(entry);
    lineageCounts.set(lineage, (lineageCounts.get(lineage) ?? 0) + 1);
  }

  const shortlist: Candidate[] = admitted.map(({ metrics, origin }) => ({
    metrics,
    origin,
    g1: true,
    g2: true,
    g6: true
  }));

  // 5. Robustness of the shortlist.
  const neighbourRequests = shortlist.flatMap((candidate) => {
    const narrow = rngFor(label, 'neighbours', candidate.metrics.key);
    const wide = rngFor(label, 'wide', candidate.metrics.key);

    return [
      ...Array.from({ length: budgets.neighbours }, () => request(neighbour(candidate.metrics.grid, narrow, 1))),
      ...Array.from({ length: budgets.wideNeighbours }, () => request(neighbour(candidate.metrics.grid, wide, 2))),
      request(candidate.metrics.grid, settings.conservative),
      request(candidate.metrics.grid, settings.worstFill)
    ];
  });
  const robustness = await pool.evaluate(neighbourRequests, 16, (done, total) => {
    if (done === total || done % 512 < 16) {
      log(`${label} robustness: ${done}/${total}`);
    }
  });
  const per = budgets.neighbours + budgets.wideNeighbours + 2;

  shortlist.forEach((candidate, index) => {
    const block = robustness.slice(index * per, (index + 1) * per);
    const narrow = block.slice(0, budgets.neighbours);
    const wide = block.slice(budgets.neighbours, budgets.neighbours + budgets.wideNeighbours);
    const summary = (list: Metrics[]) => ({
      feasibleShare: list.filter(passesG1).length / list.length,
      medianNet: median(list.map((m) => m.net)),
      nets: list.map((m) => m.net),
      percents: list.map((m) => m.minutePercent)
    });

    candidate.neighbours = summary(narrow);
    candidate.wide = summary(wide);
    candidate.conservative = block[per - 2];
    candidate.worstFill = block[per - 1];
    candidate.g3 =
      candidate.neighbours.feasibleShare >= procedure.gates.neighbourFeasibleShare &&
      candidate.neighbours.medianNet > 0;
    candidate.g4 = candidate.conservative!.net > 0;
    candidate.g5 = candidate.worstFill!.net > 0;
    candidate.score = candidate.neighbours.medianNet;
  });

  // 6. Families.
  const eligible = shortlist
    .filter((candidate) => candidate.g3 && candidate.g4 && candidate.g5)
    .sort((a, b) => b.score! - a.score! || rankOrder(a.metrics, b.metrics));
  const picks: Candidate[] = [];

  for (const candidate of eligible) {
    if (picks.length >= procedure.families.slots) {
      break;
    }

    if (
      picks.every(
        (pick) => scheduleDistance(pick.metrics.schedule, candidate.metrics.schedule) >= procedure.families.minDistance
      )
    ) {
      picks.push(candidate);
    }
  }

  const exploratoryLowDrawdown = eligible.find(
    (candidate) => candidate.metrics.minutePercent <= procedure.exploratoryLowDrawdown
  );

  return {
    label,
    window,
    minTrades,
    evaluated: evaluated.size + robustness.length,
    sobol: {
      evaluated: sobol.length,
      g1: sobol.filter(passesG1).length,
      g2: sobol.filter((m) => passesG1(m) && passesG2(m)).length,
      feasible: sobolFeasible.length
    },
    seeds: seeds.map((seed) => ({ key: seed.key, net: seed.net })),
    refinement: seeds.map((seed, index) => ({
      seed: seed.key,
      final: parents[index]!.key,
      finalNet: parents[index]!.net,
      improvements: improvements[index]!
    })),
    poolSize: feasiblePool.length,
    distinctSchedules: distinct.length,
    shortlistSkips: { nearDuplicates: skippedNearDuplicates, lineageQuota: skippedLineage },
    shortlist,
    eligible: eligible.map((candidate) => candidate.metrics.key),
    picks,
    exploratoryLowDrawdown,
    archive: all.map(({ metrics }) => metrics)
  };
};
