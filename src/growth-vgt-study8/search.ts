// Study 8's search (S8/search.ts:244-1019), single-book V-track path, on the conditional Growth genome. Stage for stage:
// screen (Sobol + joint LHS) → plausibility → promotion (≤ r1Cap: half constrained-domination rank on (−net, DD, −lots),
// half greedy max–min L∞) → rung 1 (16-point neighbourhood fitness) → NSGA-II islands (4, ≤ 8 under T1; population,
// new configurations and the rung-1 cap scaled by s(d)) → rung 2 (top 192 at L∞ 0.02, n 64) + T3 → rung 3 (top 48 at
// 0.03, n 128) → local refinement (6 starts at 0.05, ≤ 2 passes, 64 points) → T2 (bootstrap 2,000; pooled r3+r3b) →
// shortlist (ledger de-duplication; ≤ 6 picks at 0.10: profit, robust, balanced, centre, front, infeasible) →
// selection evidence (select1, select2, pooled). Only the evaluation is batched (a generation's children are drawn
// first, with the same random stream, then evaluated together); every decision is Study 8's.
//
// The control #4 is never a starting point: its effective configuration is removed wherever it could appear (screen,
// fillers, children, refinement moves) and counted; it is evaluated only as the fixed control.
import fs from 'fs-extra';
import zlib from 'node:zlib';
import {
  type Ranked,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import { Rng } from '../optimizer/rng.ts';
import { rankOrder } from '../study8-expanded-regime-d1/search.ts';
import { axisOf, eligibility, schedule, seedOf, structAxes } from './context.ts';
import { type CompactFit, type Fit, type FitWithRecords, compactFit, fitsOf, floorsOf, strip } from './fitness.ts';
import type { DoorView, Lab } from './lab.ts';
import { log, nowIso, writeSealed } from './seal.ts';
import {
  type Family,
  type Genome,
  S,
  activeOf,
  configId,
  control4Genome,
  describe,
  distance,
  effectiveOf,
  levelsOfGene,
  lhsGenomes,
  numIndex,
  numericSpace,
  screenGenomes,
  structureKey,
  structureOf
} from './space.ts';

export interface Budget {
  screen: number;
  r1Cap: number;
  islands: number;
  islandsMax: number;
  newPerIsland: number;
  population: number;
  r2Keep: number;
  r3Keep: number;
  refineStarts: number;
  shortlist: number;
  t1: boolean;
}

export const budgetOf = (mode: 'base' | 'smoke'): Budget =>
  mode === 'smoke'
    ? {
        screen: 96,
        r1Cap: 24,
        islands: 2,
        islandsMax: 2,
        newPerIsland: 24,
        population: 16,
        r2Keep: 8,
        r3Keep: 4,
        refineStarts: 1,
        shortlist: 3,
        t1: false
      }
    : {
        screen: schedule.screen,
        r1Cap: schedule.r1Cap,
        islands: schedule.islands,
        islandsMax: schedule.islandsMax,
        newPerIsland: schedule.newPerIsland,
        population: schedule.population,
        r2Keep: schedule.r2Keep,
        r3Keep: schedule.r3Keep,
        refineStarts: schedule.refineStarts,
        shortlist: schedule.shortlist,
        t1: true
      };

const farEnough = (g: Genome, taken: readonly Genome[], minimum: number) =>
  taken.every((other) => distance(g, other) >= minimum);

export const greedyDistinct = <T extends { genome: Genome }>(ordered: T[], keep: number, minimum: number) => {
  const out: T[] = [];

  for (const item of ordered) {
    if (out.length >= keep) break;
    if (
      farEnough(
        item.genome,
        out.map((o) => o.genome),
        minimum
      )
    )
      out.push(item);
  }

  return out;
};

const hvOf = (fits: readonly Fit[]) =>
  hypervolume2d(
    fits.map((fit) => ({
      id: fit.id,
      genome: fit.genome,
      objectives: [-fit.nb.robustPerYear, fit.nb.p90Dd],
      violation: fit.violation
    })),
    [0, eligibility.ceiling]
  );

const minViolation = (fits: readonly Fit[]) => fits.reduce((min, fit) => Math.min(min, fit.violation), Infinity);

export const searchLabel = (...parts: (string | number)[]) => [...parts, 'V', 'DEV'];
export const family = (name: string, n: number, labels = searchLabel(name)): Family => ({ name, n, labels });

// ----- the variation operator on the mixed genome (PROTOCOL.md §7.2) -----

// Structural genes: uniform crossover (inside the crossover event) and a uniform reset to another level with
// probability 1/8 each. Numeric genes: the repository's SBX (η 15) and polynomial mutation (η 20) on grid indices, the
// mutation rate 1 / (active numeric genes of the child) so on average one ACTIVE gene moves; latent genes ride along.
export const mutate = (g: Genome, rng: Rng): Genome => {
  const out = [...g];

  for (let d = 0; d < S; d++) {
    if (rng.next() < schedule.structuralMutation) {
      const levels = structAxes[d]!.levels.length;
      const k = rng.int(levels - 1);

      out[d] = k >= out[d]! ? k + 1 : k;
    }
  }

  const active = Math.max(1, activeOf(out).length);
  const { genome } = polynomialMutation(numericSpace, out.slice(S), rng, {
    ...schedule.ga,
    mutationProbability: 1 / active
  });

  return [...out.slice(0, S), ...genome];
};

export const vary = (a: Genome, b: Genome, rng: Rng): Genome[] => {
  let ca = [...a];
  let cb = [...b];

  if (rng.next() <= schedule.ga.crossoverProbability) {
    for (let d = 0; d < S; d++) {
      if (rng.next() < 0.5) {
        const t = ca[d]!;

        ca[d] = cb[d]!;
        cb[d] = t;
      }
    }

    const { children } = sbx(numericSpace, a.slice(S), b.slice(S), rng, { ...schedule.ga, crossoverProbability: 1 });

    ca = [...ca.slice(0, S), ...children[0]!];
    cb = [...cb.slice(0, S), ...children[1]!];
  }

  return [mutate(ca, rng), mutate(cb, rng)];
};

const probesFor = (r: number) => [...new Set([-r, -Math.ceil(r / 2), Math.ceil(r / 2), r])];

// Every single-coordinate probe move of the active numeric genes (structure fixed).
export const refinementMoves = (g: Genome) => {
  const moves: Genome[] = [];

  for (const key of activeOf(g)) {
    const i = numIndex[key];
    const max = levelsOfGene(i) - 1;

    for (const offset of probesFor(axisOf[key].radius)) {
      const value = g[i]! + offset;

      if (value < 0 || value > max) continue;
      moves.push(g.map((x, d) => (d === i ? value : x)));
    }
  }

  return moves;
};

export interface SearchOptions {
  mode: 'base' | 'smoke';
  out: string;
}

export const runSearch = async (lab: Lab, view: DoorView, options: SearchOptions) => {
  const { mode, out } = options;
  const budget = budgetOf(mode);
  const started = Date.now();

  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed); the search refuses to re-run`);

  const y = view.y;
  const floors = floorsOf(y, 2016, 2024);
  const R1 = family('r1', schedule.r1);
  const R2 = family('r2', schedule.r2);
  const R3 = family('r3', schedule.r3);
  const R3B = family('r3b', schedule.r3);
  const RF = family('refine', schedule.refineN);
  const controlId = configId(control4Genome());
  const exclusions = { screen: 0, fill: 0, children: 0, refinement: 0 };
  const fit = async (genomes: readonly Genome[], fam: Family) => (await fitsOf(lab, genomes, [fam], floors)).map(strip);

  log(`search ${mode}: y = ${y.toFixed(3)}, floors ${JSON.stringify(floors)}, control #4 = ${controlId} (excluded)`);

  // ----- 1–2. screen and promotion -----
  const drawn = screenGenomes(budget.screen, searchLabel('screen'));
  const screenGenomeList: Genome[] = [];
  const screenIds = new Set<string>();

  for (const g of drawn) {
    const id = configId(g);

    if (id === controlId) {
      exclusions.screen++;
      continue;
    }
    if (screenIds.has(id)) continue;
    screenIds.add(id);
    screenGenomeList.push(g);
  }

  const screenRecords = await lab.points(screenGenomeList.map(effectiveOf));
  const screen = screenGenomeList.map((genome, i) => ({ genome, id: configId(genome), record: screenRecords[i]! }));
  const screenPlausible = screen.filter(
    ({ record }) =>
      record.dd < eligibility.ceiling && record.net > 0 && record.lots >= Math.ceil(floors.lots / 2) && record.lots >= 1
  );
  let promoted: Genome[];

  if (screenPlausible.length <= budget.r1Cap) {
    promoted = screenPlausible.map((item) => item.genome);
  } else {
    const items = screenPlausible.map((item) => ({
      id: item.id,
      genome: item.genome,
      objectives: [-item.record.net, item.record.dd, -item.record.lots],
      violation: 0
    }));
    const half = Math.floor(budget.r1Cap / 2);
    const byRank = rankOrder(items).slice(0, half);
    const taken = new Set(byRank.map((item) => item.id));
    const chosen = byRank.map((item) => item.genome);
    const rest = items.filter((item) => !taken.has(item.id));
    const minDist = rest.map((item) => Math.min(...chosen.map((other) => distance(item.genome, other))));

    while (chosen.length < budget.r1Cap && rest.length) {
      let best = 0;

      for (let i = 1; i < rest.length; i++)
        if (minDist[i]! > minDist[best]! || (minDist[i] === minDist[best] && rest[i]!.id < rest[best]!.id)) best = i;

      const [item] = rest.splice(best, 1);

      minDist.splice(best, 1);
      chosen.push(item!.genome);

      for (let i = 0; i < rest.length; i++) minDist[i] = Math.min(minDist[i]!, distance(rest[i]!.genome, item!.genome));
    }

    promoted = chosen;
  }

  log(
    `screen ${screen.length} centres, ${screenPlausible.length} plausible, ${promoted.length} promoted (${lab.evaluations} points)`
  );

  // ----- 3. rung 1 -----
  const archive = new Map<string, Fit>();
  const r1 = async (genomes: readonly Genome[]) => {
    const missing: Genome[] = [];
    const ids = new Set<string>();

    for (const g of genomes) {
      const id = configId(g);

      if (!archive.has(id) && !ids.has(id)) {
        ids.add(id);
        missing.push(g);
      }
    }

    for (const f of await fit(missing, R1)) archive.set(f.id, f);

    return genomes.map((g) => archive.get(configId(g))!);
  };
  const screenFits = await r1(promoted);

  log(`rung 1 on the screen: ${screenFits.filter((f) => f.violation === 0).length}/${screenFits.length} feasible`);

  // ----- 4. islands -----
  const islandRecords: Record<string, unknown>[] = [];
  const screenOrder = rankOrder(screenFits);
  const runIsland = async (island: number, islandCount: number) => {
    const rng = Rng.from(...seedOf(...searchLabel('ga', island)));
    const members = screenOrder.filter((_f, index) => index % islandCount === island % islandCount);
    const population: Fit[] = members.slice(0, budget.population);
    const seen = new Set(population.map((f) => f.id));

    seen.add(controlId);

    if (population.length < budget.population) {
      const fillers: Genome[] = [];

      for (const g of lhsGenomes(budget.population * 4, searchLabel('fill', island))) {
        if (population.length + fillers.length >= budget.population) break;

        const id = configId(g);

        if (id === controlId) exclusions.fill++;
        if (!seen.has(id)) {
          seen.add(id);
          fillers.push(g);
        }
      }

      population.push(...(await r1(fillers)));
    }

    let ranked: Ranked<Fit>[] = selectSurvivors(population, budget.population);
    let newConfigs = 0;
    let duplicates = 0;
    let generations = 0;
    let stale = 0;
    const islandFits: Fit[] = [...population];
    const hvTrajectory: number[] = [];
    let bestHv = hvOf(islandFits);
    let bestMinViolation = minViolation(islandFits);
    let stop = 'generations';

    for (let generation = 1; generation <= schedule.generations; generation++) {
      const children: Genome[] = [];
      let attempts = 0;

      while (
        children.length < budget.population &&
        newConfigs < budget.newPerIsland &&
        attempts < budget.population * 50
      ) {
        attempts++;

        const a = tournament(ranked, rng).member;
        const b = tournament(ranked, rng).member;

        for (const child of vary(a.genome, b.genome, rng)) {
          if (children.length >= budget.population || newConfigs >= budget.newPerIsland) break;

          const id = configId(child);

          if (id === controlId) exclusions.children++;
          if (seen.has(id)) {
            duplicates++;
            continue;
          }

          seen.add(id);
          children.push(child);
          newConfigs++;
        }
      }

      const offspring = await r1(children);

      islandFits.push(...offspring);
      generations = generation;
      ranked = selectSurvivors([...ranked.map((r) => r.member), ...offspring], budget.population);

      const hv = hvOf(islandFits);
      const mv = minViolation(islandFits);

      hvTrajectory.push(hv);

      const improved =
        bestHv > 0
          ? hv > bestHv * (1 + schedule.tolerance)
          : hv > 0 || mv < bestMinViolation * (1 - schedule.tolerance);

      stale = improved ? 0 : stale + 1;
      bestHv = Math.max(bestHv, hv);
      bestMinViolation = Math.min(bestMinViolation, mv);

      if (newConfigs >= budget.newPerIsland) {
        stop = 'budget';
        break;
      }
      if (stale >= schedule.patience) {
        stop = 'stagnation';
        break;
      }
    }

    log(
      `island ${island}: ${generations} generations, ${newConfigs} new, ${duplicates} duplicates, stop ${stop}, hv ${bestHv.toExponential(3)}, ${islandFits.filter((f) => f.violation === 0).length} feasible (${lab.evaluations} points)`
    );

    return {
      island,
      generations,
      newConfigs,
      duplicates,
      stop,
      hvTrajectory,
      feasible: islandFits.filter((f) => f.violation === 0).length,
      fits: islandFits
    };
  };

  const unionFits: Fit[] = [...screenFits];
  const islandCount = budget.islands;
  let islandsRun = 0;
  const addIsland = async (index: number) => {
    const before = { hv: hvOf(unionFits), mv: minViolation(unionFits) };
    const result = await runIsland(index, islandCount);

    unionFits.push(...result.fits);
    islandsRun++;

    const after = { hv: hvOf(unionFits), mv: minViolation(unionFits) };
    const { fits, ...rest } = result;

    void fits;
    islandRecords.push({ ...rest, unionHv: after.hv, unionMinViolation: after.mv });
    return { before, after };
  };
  let last = { before: { hv: 0, mv: Infinity }, after: { hv: 0, mv: Infinity } };

  for (let island = 0; island < islandCount; island++) last = await addIsland(island);

  const t1Fires = (step: typeof last) =>
    step.before.hv > 0
      ? step.after.hv >= step.before.hv * 1.1
      : step.after.hv > 0 || step.after.mv <= step.before.mv * 0.75;
  const t1Log: Record<string, unknown>[] = [];

  while (budget.t1 && islandsRun < budget.islandsMax) {
    const fired = t1Fires(last);

    t1Log.push({ islands: islandsRun, fired, before: last.before, after: last.after });

    if (!fired) break;

    for (let k = 0; k < 2 && islandsRun < budget.islandsMax; k++) last = await addIsland(islandsRun);
  }

  const triggers: Record<string, unknown> = { T1: { enabled: budget.t1, log: t1Log, islandsRun } };
  const archiveFits = [...archive.values()];

  log(
    `archive ${archiveFits.length} configurations, ${archiveFits.filter((f) => f.violation === 0).length} rung-1 feasible, ${lab.evaluations} points`
  );

  // ----- 6. rung 2 (+ T3) -----
  const r2Pick = greedyDistinct(rankOrder(archiveFits), budget.r2Keep, schedule.r2Distinct);
  const r2Fits = new Map<string, Fit>(
    (
      await fit(
        r2Pick.map((f) => f.genome),
        R2
      )
    ).map((f) => [f.id, f])
  );
  const clusters = (items: Fit[], minimum: number) => {
    const reps: Fit[] = [];

    for (const item of items)
      if (
        farEnough(
          item.genome,
          reps.map((r) => r.genome),
          minimum
        )
      )
        reps.push(item);

    return reps;
  };
  const r1FeasibleReps = clusters(rankOrder(archiveFits.filter((f) => f.violation === 0)), 0.1);
  const r2FeasibleReps = clusters(rankOrder([...r2Fits.values()].filter((f) => f.violation === 0)), 0.1);
  const t3Fires = r2FeasibleReps.length < 2 && r1FeasibleReps.length >= 3;
  const t3Added: string[] = [];

  if (t3Fires) {
    const r2Feasible = [...r2Fits.values()].filter((f) => f.violation === 0);
    const adds: Genome[] = [];

    for (const rep of r1FeasibleReps) {
      if (adds.length >= 16) break;
      if (r2Fits.has(rep.id)) continue;
      if (
        !farEnough(
          rep.genome,
          r2Feasible.map((f) => f.genome),
          0.1
        )
      )
        continue;

      adds.push(rep.genome);
      t3Added.push(rep.id);
    }

    for (const f of await fit(adds, R2)) r2Fits.set(f.id, f);
  }

  triggers.T3 = {
    fired: t3Fires,
    r1FeasibleRegions: r1FeasibleReps.length,
    r2FeasibleRegions: r2FeasibleReps.length,
    added: t3Added
  };
  log(
    `rung 2: ${[...r2Fits.values()].filter((f) => f.violation === 0).length}/${r2Fits.size} feasible; T3 ${t3Fires ? `fired (+${t3Added.length})` : 'not fired'}`
  );

  // ----- 7. rung 3 -----
  const r3Pick = greedyDistinct(rankOrder([...r2Fits.values()]), budget.r3Keep, schedule.r3Distinct);
  const r3Fits = new Map<string, Fit>();
  const r3Records = new Map<string, number[]>();

  for (const result of await fitsOf(
    lab,
    r3Pick.map((f) => f.genome),
    [R3],
    floors
  )) {
    r3Records.set(
      result.id,
      result.records.map((r) => r.net)
    );
    r3Fits.set(result.id, strip(result));
  }

  log(`rung 3: ${[...r3Fits.values()].filter((f) => f.violation === 0).length}/${r3Fits.size} feasible`);

  // ----- 8. local refinement -----
  const starts = greedyDistinct(rankOrder([...r3Fits.values()]), budget.refineStarts, schedule.refineDistinct);
  const refinements: unknown[] = [];

  for (const start of starts) {
    let [current] = await fit([start.genome], RF);
    const path: unknown[] = [
      { pass: 0, id: current!.id, robust: current!.nb.robustPerYear, violation: current!.violation }
    ];

    for (let pass = 1; pass <= schedule.refinePasses; pass++) {
      const moves = refinementMoves(current!.genome).filter((g) => {
        if (configId(g) !== controlId) return true;
        exclusions.refinement++;
        return false;
      });
      const candidates = await fit(moves, RF);
      let best: Fit | undefined;
      let bestGain = 0;

      for (const candidate of candidates) {
        if (current!.violation > 0) {
          const gain = current!.violation - candidate.violation;

          if (gain >= 0.01 && (gain > bestGain || (gain === bestGain && best && candidate.id < best.id))) {
            best = candidate;
            bestGain = gain;
          }
        } else if (
          candidate.violation === 0 &&
          candidate.nb.medianNet >= current!.nb.medianNet &&
          candidate.nb.p10Net >= current!.nb.p10Net &&
          candidate.nb.p90Dd <= current!.nb.p90Dd
        ) {
          const gain = candidate.nb.robustPerYear - current!.nb.robustPerYear;

          if (
            gain >= schedule.refineMinGain &&
            (gain > bestGain || (gain === bestGain && best && candidate.nb.p90Dd < best.nb.p90Dd))
          ) {
            best = candidate;
            bestGain = gain;
          }
        }
      }

      if (!best) {
        path.push({ pass, moves: moves.length, accepted: null });
        break;
      }

      path.push({
        pass,
        moves: moves.length,
        accepted: best.id,
        gain: bestGain,
        robust: best.nb.robustPerYear,
        violation: best.violation
      });
      current = best;
    }

    let endpoint = r3Fits.get(current!.id);

    if (!endpoint) {
      const [result] = await fitsOf(lab, [current!.genome], [R3], floors);

      r3Records.set(
        result!.id,
        result!.records.map((r) => r.net)
      );
      endpoint = strip(result!);
    }

    r3Fits.set(endpoint.id, endpoint);
    refinements.push({ start: start.id, endpoint: endpoint.id, path });
  }

  log(`refinement from ${starts.length} starts done (${lab.evaluations} points)`);

  // ----- T2 -----
  const r3All = [...r3Fits.values()];
  const feasible3 = r3All
    .filter((f) => f.violation === 0)
    .sort((a, b) => b.nb.robustPerYear - a.nb.robustPerYear || (a.id < b.id ? -1 : 1));
  const bootRng = Rng.from(...seedOf(...searchLabel('bootstrap')));
  const robustSe = (nets: number[]) => {
    const values: number[] = [];

    for (let b = 0; b < 2000; b++) {
      const sample = Array.from({ length: nets.length }, () => nets[bootRng.int(nets.length)]!).sort((x, z) => x - z);
      const q = (p: number) => {
        const pos = (sample.length - 1) * p;
        const lo = Math.floor(pos);

        return sample[lo]! + (sample[Math.ceil(pos)]! - sample[lo]!) * (pos - lo);
      };

      values.push((0.5 * q(0.5) + 0.5 * q(0.1)) / y);
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
  };
  let t2 = { fired: false, gap: NaN, se: NaN, rescored: [] as string[] };
  const shortlistFits = new Map<string, Fit>(r3All.map((f) => [f.id, f]));

  if (feasible3.length >= 2) {
    const [a, b] = feasible3;
    const se = Math.max(robustSe(r3Records.get(a!.id)!), robustSe(r3Records.get(b!.id)!));
    const gap = a!.nb.robustPerYear - b!.nb.robustPerYear;

    t2 = { fired: gap < se, gap, se, rescored: [] };

    if (t2.fired) {
      for (const pooled of await fitsOf(
        lab,
        feasible3.slice(0, 8).map((f) => f.genome),
        [R3, R3B],
        floors,
        'r3+r3b'
      )) {
        shortlistFits.set(pooled.id, strip(pooled));
        t2.rescored.push(pooled.id);
      }
    }
  }

  triggers.T2 = t2;

  // ----- 9. shortlist -----
  const signatures = new Map<string, Fit>();

  for (const f of rankOrder([...shortlistFits.values()]))
    if (!signatures.has(f.centre.signature)) signatures.set(f.centre.signature, f);

  const pool = [...signatures.values()].filter((f) => f.id !== controlId);
  const F = pool.filter((f) => f.violation === 0);
  const taken: (Fit & { pick: string })[] = [];
  const takeBest = (pick: string, ordered: Fit[]) => {
    for (const f of ordered) {
      if (taken.length >= budget.shortlist) return;
      if (taken.some((t) => t.id === f.id)) continue;
      if (
        !farEnough(
          f.genome,
          taken.map((t) => t.genome),
          schedule.distinct
        )
      )
        continue;

      taken.push({ ...f, pick });
      return;
    }
  };
  const byId = (a: Fit, b: Fit) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

  if (F.length) {
    takeBest(
      'profit',
      [...F].sort((a, b) => b.nb.robustPerYear - a.nb.robustPerYear || a.nb.p90Dd - b.nb.p90Dd || byId(a, b))
    );

    const pick1 = taken[0];

    takeBest(
      'robust',
      F.filter((f) => !pick1 || f.nb.medianNet >= 0.5 * pick1.nb.medianNet).sort(
        (a, b) => b.nb.share - a.nb.share || a.nb.p90Dd - b.nb.p90Dd || byId(a, b)
      )
    );
    takeBest(
      'balanced',
      [...F].sort(
        (a, b) =>
          b.nb.robustPerYear / b.nb.p90Dd - a.nb.robustPerYear / a.nb.p90Dd || a.nb.p90Dd - b.nb.p90Dd || byId(a, b)
      )
    );
    takeBest(
      'centre',
      [...F].sort((a, b) => b.centre.perYear - a.centre.perYear || a.nb.p90Dd - b.nb.p90Dd || byId(a, b))
    );

    for (const f of rankOrder(F)) takeBest('front', [f]);
  }

  for (const f of rankOrder(pool.filter((p) => p.violation > 0))) takeBest('infeasible on training', [f]);

  log(
    `shortlist ${taken.map((t) => `${t.id} [${t.pick}] ${describe(effectiveOf(t.genome))}`).join('; ') || '(empty)'}`
  );

  // ----- 10. selection evidence (development window) -----
  const selectFamilies = [1, 2].map((rep) => family(`select${rep}`, schedule.select.n, searchLabel('select', rep)));
  const selectionOf = async (genome: Genome) => {
    const [s1] = await fitsOf(lab, [genome], [selectFamilies[0]!], floors);
    const [s2] = await fitsOf(lab, [genome], [selectFamilies[1]!], floors);
    const [pooled] = await fitsOf(lab, [genome], selectFamilies, floors, 'select1+2');

    return { select1: compactFit(strip(s1!)), select2: compactFit(strip(s2!)), pooled: compactFit(strip(pooled!)) };
  };
  const shortlist = [];

  for (const [index, t] of taken.entries()) {
    const effective = effectiveOf(t.genome);

    shortlist.push({
      rank: index + 1,
      pick: t.pick,
      id: t.id,
      genome: t.genome,
      structure: structureOf(t.genome),
      effective,
      describe: describe(effective),
      r3: compactFit(r3Fits.get(t.id) ?? t),
      shortlistFit: compactFit(t),
      selection: await selectionOf(t.genome)
    });
  }

  const control = control4Genome();
  const [controlR3] = await fitsOf(lab, [control], [R3], floors);
  const controls = {
    '#4': {
      id: controlId,
      genome: control,
      effective: effectiveOf(control),
      describe: describe(effectiveOf(control)),
      rung3: compactFit(strip(controlR3!)),
      selection: await selectionOf(control)
    }
  };

  // ----- archives (every screened and every rung-1-evaluated configuration) -----
  const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const archiveRows = archiveFits.map((f) =>
    [
      f.id,
      csvEscape(structureKey(structureOf(f.genome))),
      csvEscape(JSON.stringify(effectiveOf(f.genome))),
      f.violation.toFixed(6),
      f.centre.net,
      Math.round(f.centre.dd * 100) / 100,
      f.centre.lots,
      f.centre.episodes,
      f.nb.n,
      f.distinctLedgers,
      f.nb.share.toFixed(4),
      Math.round(f.nb.p90Dd),
      Math.round(f.nb.medianNet),
      Math.round(f.nb.p10Net),
      r2Fits.has(f.id) ? 1 : 0,
      r3Fits.has(f.id) ? 1 : 0
    ].join(',')
  );
  const archiveFile = out.replace(/\.json$/, '-archive.csv.gz');
  const screenFile = out.replace(/\.json$/, '-screen.csv.gz');

  await fs.outputFile(
    archiveFile,
    zlib.gzipSync(
      `id,structure,effective,violation,net,dd,lots,episodes,r1Unique,r1Ledgers,r1Share,r1P90Dd,r1MedianNet,r1P10Net,r2,r3\n${archiveRows.join('\n')}\n`,
      { level: 9 }
    )
  );
  await fs.outputFile(
    screenFile,
    zlib.gzipSync(
      `id,structure,effective,net,dd,lots,wins,losses,exposure,plausible\n${screen
        .map(({ genome, id, record }) =>
          [
            id,
            csvEscape(structureKey(structureOf(genome))),
            csvEscape(JSON.stringify(effectiveOf(genome))),
            record.net,
            Math.round(record.dd * 100) / 100,
            record.lots,
            record.wins,
            record.losses,
            Math.round(record.exposure * 100) / 100,
            screenPlausible.some((p) => p.id === id) ? 1 : 0
          ].join(',')
        )
        .join('\n')}\n`,
      { level: 9 }
    )
  );

  const ledgersAt = (fits: Fit[]) => new Set(fits.map((f) => f.centre.signature)).size;
  const record = await writeSealed(out, {
    stage: 'SEARCH',
    mode,
    at: nowIso(),
    door: {
      door: view.door,
      first: view.sessions[0]!.date,
      last: view.sessions.at(-1)!.date,
      sessions: view.sessions.length,
      dataSha256: view.dataSha256
    },
    y,
    floors,
    budget,
    schedule,
    seeds: {
      scheme: "deriveSeed('growth-vgt-study8', …labels, 'V', 'DEV')",
      families: ['screen', 'fill', 'ga', 'r1', 'r2', 'r3', 'r3b', 'refine', 'bootstrap', 'select']
    },
    controlExclusions: { controlId, ...exclusions },
    counts: {
      screenDrawn: drawn.length,
      screen: screen.length,
      screenStructures: new Set(screen.map((s) => structureKey(structureOf(s.genome)))).size,
      screenLedgers: new Set(screen.map((s) => s.record.signature)).size,
      screenPlausible: screenPlausible.length,
      promoted: promoted.length,
      archive: archiveFits.length,
      archiveStructures: new Set(archiveFits.map((f) => structureKey(structureOf(f.genome)))).size,
      archiveLedgers: ledgersAt(archiveFits),
      r1Feasible: archiveFits.filter((f) => f.violation === 0).length,
      r2: r2Fits.size,
      r2Ledgers: ledgersAt([...r2Fits.values()]),
      r2Feasible: [...r2Fits.values()].filter((f) => f.violation === 0).length,
      r3: r3Fits.size,
      r3Ledgers: ledgersAt([...r3Fits.values()]),
      r3Feasible: [...r3Fits.values()].filter((f) => f.violation === 0).length,
      islandsRun
    },
    islands: islandRecords,
    triggers,
    rung2: [...r2Fits.values()].map(compactFit),
    rung3: [...r3Fits.values()].map(compactFit),
    refinements,
    shortlist,
    controls,
    noEligibleRegion: archiveFits.every((f) => f.violation > 0),
    archive: { file: archiveFile, rows: archiveRows.length, screenFile, screenRows: screen.length },
    points: lab.evaluations,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `search sealed ${record.file} ${record.bodyHash.slice(0, 12)} in ${((Date.now() - started) / 60000).toFixed(1)} min (${lab.evaluations} points)`
  );

  return { record, r2Fits, r3Fits, archiveFits } as const;
};

export type { CompactFit, FitWithRecords };
