// Study 8's search (S8/search.ts:244-1019), single-book V-track path, on the intraday grid. Stage for stage and
// constant for constant: scrambled-Sobol screen (8,192) → plausibility → promotion (≤ 1,024: half constrained-
// domination rank on (−net, DD, −lots), half greedy max–min L∞) → rung 1 (16-point neighbourhood fitness) → NSGA-II
// islands (4, ≤ 8 under T1; population 64; 2,048 new configurations; ≤ 40 generations; stagnation 10 / 1e-3 on the 2-D
// (robust/yr, p90 DD) hypervolume) → rung 2 (top 192 at L∞ 0.02, n 64) + T3 → rung 3 (top 48 at 0.03, n 128) → local
// refinement (6 starts at 0.05, ≤ 2 passes, 64 points) → T2 (bootstrap 2,000; pooled r3+r3b) → shortlist (ledger
// de-duplication; ≤ 6 picks at 0.10: profit, robust, balanced, centre, front, infeasible) → selection evidence
// (select1, select2, pooled). Only the evaluation is batched (a generation's children are drawn first, with the same
// random stream, then evaluated together); every decision is Study 8's.
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
import { type Grid, axes, eligibility, keys, schedule, seedOf, shortlistSize } from './context.ts';
import { dailyFit } from './control.ts';
import { type Fit, type FitWithRecords, compactFit, fitsOf, floorsOf, strip } from './fitness.ts';
import type { DoorView, Lab } from './lab.ts';
import { baseSettings } from './lab.ts';
import { log, nowIso, writeSealed } from './seal.ts';
import {
  type Family,
  configId,
  describe,
  distance,
  gridKey,
  gridOf,
  lhsGrids,
  operatorSpace,
  sobolGrids
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

// The V track's budget (S8 budgetOf, single book: s(d) = 1 at 9-D), and Study 8's smoke budget.
export const budgetOf = (mode: 'base' | 'smoke'): Budget =>
  mode === 'smoke'
    ? {
        screen: 64,
        r1Cap: 24,
        islands: 2,
        islandsMax: 2,
        newPerIsland: 24,
        population: schedule.population,
        r2Keep: 8,
        r3Keep: 4,
        refineStarts: 1,
        shortlist: 2,
        t1: false
      }
    : {
        screen: schedule.gScreen,
        r1Cap: schedule.r1Cap,
        islands: schedule.islands,
        islandsMax: schedule.islandsMax,
        newPerIsland: schedule.newPerIsland,
        population: schedule.population,
        r2Keep: schedule.r2Keep,
        r3Keep: schedule.r3Keep,
        refineStarts: schedule.refineStarts,
        shortlist: shortlistSize,
        t1: true
      };

const farEnough = (grid: Grid, taken: readonly Grid[], minimum: number) =>
  taken.every((other) => distance(grid, other) >= minimum);

const greedyDistinct = <T extends { grid: Grid }>(ordered: T[], keep: number, minimum: number) => {
  const out: T[] = [];

  for (const item of ordered) {
    if (out.length >= keep) break;
    if (
      farEnough(
        item.grid,
        out.map((o) => o.grid),
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
  const fit = async (grids: readonly Grid[], fam: Family) => (await fitsOf(lab, grids, [fam], floors)).map(strip);

  log(`search ${mode}: y = ${y.toFixed(3)}, floors ${JSON.stringify(floors)}`);

  // ----- 1–2. screen and promotion -----
  const screenGrids = sobolGrids(budget.screen, searchLabel('screen')).grids;
  const screenRecords = await lab.points(screenGrids.map((grid) => ({ grid, settings: baseSettings })));
  const screen = screenGrids.map((grid, i) => ({ grid, record: screenRecords[i]! }));
  const screenPlausible = screen.filter(
    ({ record }) =>
      record.dd < eligibility.ceiling && record.net > 0 && record.lots >= Math.ceil(floors.lots / 2) && record.lots >= 1
  );
  let promoted: Grid[];

  if (screenPlausible.length <= budget.r1Cap) {
    promoted = screenPlausible.map((item) => item.grid);
  } else {
    const items = screenPlausible.map((item) => ({
      id: configId(item.grid),
      genome: [] as number[],
      grid: item.grid,
      objectives: [-item.record.net, item.record.dd, -item.record.lots],
      violation: 0
    }));
    const half = Math.floor(budget.r1Cap / 2);
    const byRank = rankOrder(items).slice(0, half);
    const taken = new Set(byRank.map((item) => item.id));
    const chosen = byRank.map((item) => item.grid);
    const rest = items.filter((item) => !taken.has(item.id));
    const minDist = rest.map((item) => Math.min(...chosen.map((other) => distance(item.grid, other))));

    while (chosen.length < budget.r1Cap && rest.length) {
      let best = 0;

      for (let i = 1; i < rest.length; i++) {
        if (minDist[i]! > minDist[best]! || (minDist[i] === minDist[best] && rest[i]!.id < rest[best]!.id)) best = i;
      }

      const [item] = rest.splice(best, 1);

      minDist.splice(best, 1);
      chosen.push(item!.grid);

      for (let i = 0; i < rest.length; i++) minDist[i] = Math.min(minDist[i]!, distance(rest[i]!.grid, item!.grid));
    }

    promoted = chosen;
  }

  log(
    `screen ${screen.length} centres, ${screenPlausible.length} plausible, ${promoted.length} promoted (${lab.evaluations} points)`
  );

  // ----- 3. rung 1 -----
  const archive = new Map<string, Fit>();
  const r1 = async (grids: readonly Grid[]) => {
    const missing: Grid[] = [];
    const ids = new Set<string>();

    for (const grid of grids) {
      const id = configId(grid);

      if (!archive.has(id) && !ids.has(id)) {
        ids.add(id);
        missing.push(grid);
      }
    }

    for (const f of await fit(missing, R1)) archive.set(f.id, f);

    return grids.map((grid) => archive.get(configId(grid))!);
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

    if (population.length < budget.population) {
      const fillers: Grid[] = [];

      for (const grid of lhsGrids(budget.population * 4, searchLabel('fill', island))) {
        if (population.length + fillers.length >= budget.population) break;

        const id = configId(grid);

        if (!seen.has(id)) {
          seen.add(id);
          fillers.push(grid);
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
      const children: Grid[] = [];
      let attempts = 0;

      while (
        children.length < budget.population &&
        newConfigs < budget.newPerIsland &&
        attempts < budget.population * 50
      ) {
        attempts++;

        const a = tournament(ranked, rng).member;
        const b = tournament(ranked, rng).member;
        const pair = sbx(operatorSpace, a.genome, b.genome, rng, schedule.ga).children;

        for (const child of pair) {
          if (children.length >= budget.population || newConfigs >= budget.newPerIsland) break;

          const grid = gridOf(polynomialMutation(operatorSpace, child, rng, schedule.ga).genome);
          const id = configId(grid);

          if (seen.has(id)) {
            duplicates++;
            continue;
          }

          seen.add(id);
          children.push(grid);
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
      `island ${island}: ${generations} generations, ${newConfigs} new, stop ${stop}, hv ${bestHv.toExponential(3)}, ${islandFits.filter((f) => f.violation === 0).length} feasible (${lab.evaluations} points)`
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
        r2Pick.map((f) => f.grid),
        R2
      )
    ).map((f) => [f.id, f])
  );
  const clusters = (items: Fit[], minimum: number) => {
    const reps: Fit[] = [];

    for (const item of items)
      if (
        farEnough(
          item.grid,
          reps.map((r) => r.grid),
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
    const adds: Grid[] = [];

    for (const rep of r1FeasibleReps) {
      if (adds.length >= 16) break;
      if (r2Fits.has(rep.id)) continue;
      if (
        !farEnough(
          rep.grid,
          r2Feasible.map((f) => f.grid),
          0.1
        )
      )
        continue;

      adds.push(rep.grid);
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
    r3Pick.map((f) => f.grid),
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
    let [current] = await fit([start.grid], RF);
    const path: unknown[] = [
      { pass: 0, id: current!.id, robust: current!.nb.robustPerYear, violation: current!.violation }
    ];

    for (let pass = 1; pass <= schedule.refinePasses; pass++) {
      const moves: Grid[] = [];

      for (const key of keys) {
        for (const offset of axes[key].probes) {
          const value = current!.grid[key] + offset;

          if (value < 0 || value > axes[key].size - 1) continue;

          moves.push({ ...current!.grid, [key]: value });
        }
      }

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
      const [result] = await fitsOf(lab, [current!.grid], [R3], floors);

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
      const top = feasible3.slice(0, 8);

      for (const pooled of await fitsOf(
        lab,
        top.map((f) => f.grid),
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

  const pool = [...signatures.values()];
  const F = pool.filter((f) => f.violation === 0);
  const taken: (Fit & { pick: string })[] = [];
  const takeBest = (pick: string, ordered: Fit[]) => {
    for (const f of ordered) {
      if (taken.length >= budget.shortlist) return;
      if (taken.some((t) => t.id === f.id)) continue;
      if (
        !farEnough(
          f.grid,
          taken.map((t) => t.grid),
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

  log(`shortlist ${taken.map((t) => `${t.id} [${t.pick}] ${describe(t.grid)}`).join('; ') || '(empty)'}`);

  // ----- 10. selection evidence (development window) -----
  const selectFamilies = [1, 2].map((rep) => family(`select${rep}`, schedule.select.n, searchLabel('select', rep)));
  const selectionOf = async (grid: Grid) => {
    const [s1] = await fitsOf(lab, [grid], [selectFamilies[0]!], floors);
    const [s2] = await fitsOf(lab, [grid], [selectFamilies[1]!], floors);
    const [pooled] = await fitsOf(lab, [grid], selectFamilies, floors, 'select1+2');

    return { select1: compactFit(strip(s1!)), select2: compactFit(strip(s2!)), pooled: compactFit(strip(pooled!)) };
  };
  const shortlist = [];

  for (const [index, t] of taken.entries()) {
    shortlist.push({
      rank: index + 1,
      pick: t.pick,
      id: t.id,
      grid: t.grid,
      describe: describe(t.grid),
      r3: compactFit(r3Fits.get(t.id) ?? t),
      shortlistFit: compactFit(t),
      selection: await selectionOf(t.grid)
    });
  }

  const b1Selection = {
    select1: dailyFit(view, [selectFamilies[0]!], floors, 'select1'),
    select2: dailyFit(view, [selectFamilies[1]!], floors, 'select2'),
    pooled: dailyFit(view, selectFamilies, floors, 'select1+2')
  };
  const b1Compact = (f: (typeof b1Selection)['pooled']) => ({
    id: 'B1',
    grid: f.grid,
    family: f.family,
    violation: f.violation,
    parts: f.parts,
    centre: f.centre,
    nb: f.nb
  });
  const controls = {
    B1: {
      grid: b1Selection.pooled.grid,
      rung3: b1Compact(dailyFit(view, [R3], floors, 'r3')),
      selection: {
        select1: b1Compact(b1Selection.select1),
        select2: b1Compact(b1Selection.select2),
        pooled: b1Compact(b1Selection.pooled)
      }
    }
  };

  // ----- archive table (every rung-1-evaluated configuration) -----
  const archiveRows = archiveFits.map((f) =>
    [
      f.id,
      gridKey(f.grid),
      f.violation.toFixed(6),
      f.centre.net,
      f.centre.dd,
      f.centre.lots,
      f.centre.episodes,
      f.nb.share.toFixed(4),
      Math.round(f.nb.p90Dd),
      Math.round(f.nb.medianNet),
      Math.round(f.nb.p10Net),
      r2Fits.has(f.id) ? 1 : 0,
      r3Fits.has(f.id) ? 1 : 0
    ].join(',')
  );
  const archiveFile = out.replace(/\.json$/, '-archive.csv.gz');

  await fs.outputFile(
    archiveFile,
    zlib.gzipSync(
      `id,grid,violation,net,dd,lots,episodes,r1Share,r1P90Dd,r1MedianNet,r1P10Net,r2,r3\n${archiveRows.join('\n')}\n`,
      { level: 9 }
    )
  );

  const record = await writeSealed(out, {
    stage: 'SEARCH',
    mode,
    at: nowIso(),
    door: {
      door: view.door,
      first: view.sessions[0]!.date,
      last: view.sessions.at(-1)!.date,
      sessions: view.sessions.length
    },
    y,
    floors,
    budget,
    schedule: {
      r1: schedule.r1,
      r2: schedule.r2,
      r3: schedule.r3,
      refineN: schedule.refineN,
      population: budget.population,
      generations: schedule.generations
    },
    counts: {
      screen: screen.length,
      screenPlausible: screenPlausible.length,
      promoted: promoted.length,
      archive: archiveFits.length,
      r1Feasible: archiveFits.filter((f) => f.violation === 0).length,
      r2: r2Fits.size,
      r2Feasible: [...r2Fits.values()].filter((f) => f.violation === 0).length,
      r3: r3Fits.size,
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
    archive: { file: archiveFile, rows: archiveRows.length },
    points: lab.evaluations,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `search sealed ${record.file} ${record.bodyHash.slice(0, 12)} in ${((Date.now() - started) / 60000).toFixed(1)} min (${lab.evaluations} points)`
  );

  return { record, r2Fits, r3Fits, archiveFits } as const;
};

export type { FitWithRecords };
