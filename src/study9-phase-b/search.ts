// Study 9 Phase B: Study 8's optimizer (src/study8-expanded-regime-d1/search.ts), ported line for line; the diff against
// Study 8's file is limited to: the imports (this study's context, door, evaluator, designs, space and fitness ports;
// Study 8's rankOrder imported, not copied), the namespace hook (rngOf/seedValue: 'study9-phase-b'), the track
// definitions (this study's seven memberships, or a parity replay's Study 8 track), the door (this study's training door;
// VGT added for the B1 control when the pool lacks it), and the controls of the selection evidence (B1; plus Study 8's
// own frozen subset in the parity replay). Parity gate A3 runs this port with Study 8's namespace on Study 8's VG-F19
// job and requires its sealed search record, field for field.
//
// The Phase B optimizer of PROTOCOL.md §7 for one track × outer fold, on that fold's search door only: screen →
// rung 1 (16-point CRN neighbourhoods) → independent NSGA-II islands driven by rung-1 constrained-Pareto fitness →
// rung 2 (64) → rung 3 (128) → local refinement against a 64-point neighbourhood → shortlist → selection evidence.
// Triggers T1–T3 are mechanical and read training data only. Every point record goes through the job's persistent
// cache, so a restarted job replays the same deterministic trajectory from cache hits and seals identical outputs.
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { hypervolume2d, polynomialMutation, sbx, selectSurvivors, tournament } from '../optimizer/nsga2.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { rankOrder } from '../study8-expanded-regime-d1/search.ts';
import {
  type FoldKey,
  cacheDir,
  eligibility,
  folds,
  dimensionScale,
  frozenGrids,
  resultFile,
  schedule
} from './context.ts';
import { type P9Door, openDoor } from './door.ts';
import { configDistance, specOf } from './designs.ts';
import { type Books, Lab, P9Evaluator, PointCache, booksKey, cacheFileOf } from './engine.ts';
import { type FamilySpec, type Fit, type Floors, fitOf, floorsOf, pooledFamiliesFit, stripRecords } from './fitness.ts';
import { log, nowIso, writeSealed } from './records.ts';
import {
  assertStudyNamespace,
  box,
  booksOfGenome,
  configId,
  currentSeedOf,
  describeBooks,
  lhsBooks,
  operatorSpaceFor,
  rngOf,
  sobolGrids
} from './space.ts';

export { rankOrder };

// A search track: this study's (context.ts tracks) or, in parity gate A3, Study 8's own track replayed.
export interface TrackSpec {
  key: string;
  books: readonly string[];
}

export const searchFile = (track: string, fold: FoldKey, mode = 'base') =>
  resultFile('search', track, fold, mode === 'base' ? 'search.json' : `search-${mode}.json`);

export interface TrackBudget {
  screen: number; // Track G/V Sobol centres; pooled: per-book screen size
  combos: number;
  lhs: number;
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

export const budgetOf = (track: TrackSpec, mode: 'base' | 'diagnostic' | 'smoke' = 'base'): TrackBudget => {
  if (mode === 'smoke') {
    return {
      screen: 64,
      combos: 64,
      lhs: 16,
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
    };
  }

  const single = track.books.length === 1;
  // PROTOCOL.md §7.1: the joint-proposal budgets scale with s(d) = max(1, d / 16)
  const scale = dimensionScale(track.books.length);
  const scaled = (value: number) => Math.round(value * scale);
  const base: TrackBudget = {
    screen: single ? schedule.gScreen : schedule.bookScreen,
    combos: scaled(schedule.poolCombos),
    lhs: scaled(schedule.poolSobol),
    r1Cap: scaled(schedule.r1Cap),
    islands: schedule.islands,
    islandsMax: schedule.islandsMax,
    newPerIsland: scaled(schedule.newPerIsland),
    population: scaled(schedule.population),
    r2Keep: schedule.r2Keep,
    r3Keep: schedule.r3Keep,
    refineStarts: schedule.refineStarts,
    shortlist: schedule.shortlist[track.key] ?? 6,
    t1: true
  };

  return { ...base, ...(schedule.overrides[track.key] ?? {}) } as TrackBudget;
};

export const jobName = (track: string, fold: FoldKey, mode: string) =>
  `search-${track}-${fold}${mode === 'base' ? '' : `-${mode}`}`;

const yearOf = (date: string) => Number(date.slice(0, 4));

// The configuration-level distinctness used by every promotion (normalized L∞ over the track's books).
const farEnough = (books: Books, taken: readonly Books[], symbols: readonly string[], minimum: number) =>
  taken.every((other) => configDistance(books, other, symbols) >= minimum);

// rankOrder: Study 8's constrained-domination ranking, imported unchanged (search.ts of Study 8).

const greedyDistinct = <T extends { books: Books }>(
  ordered: T[],
  keep: number,
  symbols: readonly string[],
  minimum: number
) => {
  const out: T[] = [];

  for (const item of ordered) {
    if (out.length >= keep) break;
    if (
      farEnough(
        item.books,
        out.map((o) => o.books),
        symbols,
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

const compactFit = (fit: Fit) => ({
  id: fit.id,
  books: booksKey(fit.books),
  family: fit.family,
  violation: Math.round(fit.violation * 1e6) / 1e6,
  parts: Object.fromEntries(
    Object.entries(fit.parts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => [k, Math.round(v * 1e4) / 1e4])
  ),
  centre: fit.centre,
  nb: fit.nb
});

export interface SearchOptions {
  mode?: 'base' | 'diagnostic' | 'smoke';
  out?: string; // override the sealed output path (restart tests)
  cacheFile?: string;
  stopAfterPoints?: number; // restart test: exit after this many fresh points
  doorKey?: string; // smoke/parity doors only (smoke test, the parity restart test, parity gate A3)
  doorEnd?: string; // the end of a smoke/parity door
  door?: P9Door; // an already-open door (parity gate A3)
  parityReplay?: boolean; // parity gate A3: the full base budget on a given parity door
  labelPrefix?: string; // smoke and parity runs only: a label prefix so no production seed label is evaluated (m5)
  controls?: Record<string, Books>; // the selection-evidence controls (default: B1)
}

export const runSearch = async (spec: TrackSpec, fold: FoldKey, options: SearchOptions = {}) => {
  const mode = options.mode ?? 'base';
  const track = spec.key;
  const symbols = [...spec.books] as string[];
  const budget = budgetOf(spec, mode);
  const started = Date.now();
  const job = jobName(track, fold, mode);
  const out = options.out ?? searchFile(track, fold, mode);

  if (await fs.pathExists(out)) {
    throw new Error(`${out} exists (sealed); the search refuses to re-run`);
  }

  if ((options.doorKey || options.door) && mode !== 'smoke' && !options.parityReplay)
    throw new Error('a door override is for the smoke, restart and parity-replay runs only');

  // review V6: the namespace is checked before any door opens
  if (!options.parityReplay) assertStudyNamespace('search');

  const controlBooks: Record<string, Books> = options.controls ?? { B1: { VGT: { ...frozenGrids.VGT } } };
  const doorMembers = [...new Set([...symbols, ...Object.values(controlBooks).flatMap((b) => Object.keys(b))])];
  const door =
    options.door ??
    (await openDoor(options.doorKey ?? `search-${fold}`, doorMembers, `Phase B ${job}`, {
      ...(options.doorEnd ? { end: options.doorEnd } : {})
    }));
  const ev = new P9Evaluator(door);
  const cache = await PointCache.open(door, job, options.cacheFile ?? cacheFileOf(cacheDir, job));
  const lab = new Lab(ev, cache);
  const y = ev.yearsOfRun();
  const floors: Floors = floorsOf(y, 2017, yearOf(folds[fold].trainEnd));
  const space = operatorSpaceFor(symbols.length);
  if (options.labelPrefix && mode !== 'smoke') throw new Error('a label prefix is for smoke and parity runs only');

  const prefix = options.labelPrefix ? [options.labelPrefix] : [];
  const label = (...parts: (string | number)[]) => [...prefix, ...parts, track, fold];
  const fam = (name: string, n: number, labels = label(name)): FamilySpec => ({ name, n, labels });
  const R1 = fam('r1', schedule.r1);
  const R2 = fam('r2', schedule.r2);
  const R3 = fam('r3', schedule.r3);
  const R3B = fam('r3b', schedule.r3);
  const RF = fam('refine', schedule.refineN);

  let lastFlush = Date.now();
  const flush = () => {
    cache.flushSync();
    lastFlush = Date.now();
  };
  const guard = () => {
    if (Date.now() - lastFlush > 30000) flush();

    if (options.stopAfterPoints && lab.computed >= options.stopAfterPoints) {
      flush();
      log(`${job}: stopping after ${lab.computed} fresh points (restart test)`);
      process.exit(0);
    }
  };
  const fit = (books: Books, family: FamilySpec) => {
    const result = fitOf(lab, books, symbols, family, floors);

    guard();
    return stripRecords(result) as Fit;
  };
  const fitWithRecords = (books: Books, family: FamilySpec) => {
    const result = fitOf(lab, books, symbols, family, floors);

    guard();
    return result;
  };

  process.once('SIGTERM', () => {
    flush();
    process.exit(143);
  });
  process.once('SIGINT', () => {
    flush();
    process.exit(130);
  });

  log(
    `${job}: door ${door.key} → ${door.dates[door.lastIndex]}, y = ${y.toFixed(3)}, floors ${JSON.stringify(floors)}, cache ${cache.loaded} loaded`
  );

  // ----- 1–2. screen and promotion -----
  const screen: { books: Books; record: ReturnType<Lab['point']> }[] = [];
  const perBookPlausible: Record<string, number> = {};

  if (symbols.length === 1) {
    for (const grid of sobolGrids(budget.screen, label('screen')).grids) {
      const books = { [symbols[0]!]: grid };

      screen.push({ books, record: lab.point(books) });
      guard();
    }
  } else {
    const plausible: Record<string, Grid[]> = {};

    for (const symbol of symbols) {
      plausible[symbol] = sobolGrids(budget.screen, label('screen', symbol)).grids.filter((grid) => {
        const record = lab.point({ [symbol]: grid });

        guard();
        return record.dd < eligibility.ceiling && record.net > 0 && record.lots >= 2;
      });
      perBookPlausible[symbol] = plausible[symbol]!.length;
    }

    const pick = rngOf(label('combos'));
    const seen = new Set<string>();

    // no combination exists when a book has no plausible standalone vector (nothing else seeds the pool)
    for (let i = 0; i < budget.combos && symbols.every((s) => plausible[s]!.length > 0); i++) {
      const books: Books = Object.fromEntries(
        symbols.map((symbol) => [symbol, plausible[symbol]![pick.int(plausible[symbol]!.length)]!])
      );
      const key = booksKey(books);

      if (seen.has(key)) continue;

      seen.add(key);
      screen.push({ books, record: lab.point(books) });
      guard();
    }

    for (const books of lhsBooks(budget.lhs, symbols, label('lhs')).books) {
      const key = booksKey(books);

      if (seen.has(key)) continue;

      seen.add(key);
      screen.push({ books, record: lab.point(books) });
      guard();
    }
  }

  const screenPlausible = screen.filter(
    ({ record }) =>
      record.dd < eligibility.ceiling &&
      record.net > 0 &&
      record.lots >= Math.ceil(floors.lots / 2) &&
      symbols.every((s) => (record.books[s]?.lots ?? 0) >= 1)
  );
  let promoted: Books[];

  if (screenPlausible.length <= budget.r1Cap) {
    promoted = screenPlausible.map((item) => item.books);
  } else {
    const items = screenPlausible.map((item) => ({
      id: configId(item.books),
      genome: [],
      books: item.books,
      objectives: [-item.record.net, item.record.dd, -item.record.lots],
      violation: 0
    }));
    const half = Math.floor(budget.r1Cap / 2);
    const byRank = rankOrder(items).slice(0, half);
    const taken = new Set(byRank.map((item) => item.id));
    const chosen = byRank.map((item) => item.books);
    const rest = items.filter((item) => !taken.has(item.id));
    const minDist = rest.map((item) => Math.min(...chosen.map((other) => configDistance(item.books, other, symbols))));

    while (chosen.length < budget.r1Cap && rest.length) {
      let best = 0;

      for (let i = 1; i < rest.length; i++) {
        if (minDist[i]! > minDist[best]! || (minDist[i] === minDist[best] && rest[i]!.id < rest[best]!.id)) best = i;
      }

      const [item] = rest.splice(best, 1);
      minDist.splice(best, 1);

      chosen.push(item!.books);

      for (let i = 0; i < rest.length; i++) {
        minDist[i] = Math.min(minDist[i]!, configDistance(rest[i]!.books, item!.books, symbols));
      }
    }

    promoted = chosen;
  }

  log(
    `${job}: screen ${screen.length} centres, ${screenPlausible.length} plausible, ${promoted.length} promoted to rung 1 (${lab.computed} points)`
  );

  // ----- 3. rung 1 -----
  const archive = new Map<string, Fit>();
  const r1 = (books: Books) => {
    const id = configId(books);
    const cached = archive.get(id);

    if (cached) return cached;

    const result = fit(books, R1);

    archive.set(id, result);
    return result;
  };
  const screenFits = promoted.map((books) => r1(books));

  log(
    `${job}: rung 1 on the screen: ${screenFits.filter((f) => f.violation === 0).length}/${screenFits.length} feasible`
  );

  // ----- 4. islands -----
  const islandRecords: {
    island: number;
    generations: number;
    newConfigs: number;
    duplicates: number;
    stop: string;
    hvTrajectory: number[];
    feasible: number;
    unionHv: number;
    unionMinViolation: number;
  }[] = [];
  const screenOrder = rankOrder(screenFits);
  const runIsland = (island: number, islandCount: number) => {
    const rng = rngOf(label('ga', island));
    const members = screenOrder.filter((_f, index) => index % islandCount === island % islandCount);
    const population: Fit[] = members.slice(0, budget.population);
    const seen = new Set(population.map((f) => f.id));
    const fillers =
      population.length < budget.population
        ? lhsBooks(budget.population * 4, symbols, label('fill', island)).books
        : [];

    for (const books of fillers) {
      if (population.length >= budget.population) break;

      const f = r1(books);

      if (!seen.has(f.id)) {
        seen.add(f.id);
        population.push(f);
      }
    }

    let ranked = selectSurvivors(population, budget.population);
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
      const offspring: Fit[] = [];
      let attempts = 0;

      while (
        offspring.length < budget.population &&
        newConfigs < budget.newPerIsland &&
        attempts < budget.population * 50
      ) {
        attempts++;

        const a = tournament(ranked, rng).member;
        const b = tournament(ranked, rng).member;
        const { children } = sbx(space, a.genome, b.genome, rng, schedule.ga);

        for (const child of children) {
          if (offspring.length >= budget.population || newConfigs >= budget.newPerIsland) break;

          const mutated = polynomialMutation(space, child, rng, schedule.ga).genome;
          const books = booksOfGenome(mutated, symbols);
          const id = configId(books);

          if (seen.has(id)) {
            duplicates++;
            continue;
          }

          seen.add(id);

          const f = r1(books);

          offspring.push(f);
          islandFits.push(f);
          newConfigs++;
        }
      }

      generations = generation;
      ranked = selectSurvivors([...ranked.map((r) => r.member), ...offspring], budget.population);

      const hv = hvOf(islandFits);
      const mv = minViolation(islandFits);

      hvTrajectory.push(hv);

      const improved =
        bestHv > 0
          ? hv > bestHv * (1 + schedule.tolerance)
          : hv > 0 || mv < bestMinViolation * (1 - schedule.tolerance);

      if (improved) {
        stale = 0;
      } else {
        stale++;
      }

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
      `${job}: island ${island}: ${generations} generations, ${newConfigs} new, stop ${stop}, hv ${bestHv.toExponential(3)}, ${islandFits.filter((f) => f.violation === 0).length} feasible`
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
  const triggers: Record<string, unknown> = {};
  let islandsRun = 0;
  const addIsland = (index: number) => {
    const before = { hv: hvOf(unionFits), mv: minViolation(unionFits) };
    const result = runIsland(index, islandCount);

    unionFits.push(...result.fits);
    islandsRun++;

    const after = { hv: hvOf(unionFits), mv: minViolation(unionFits) };
    const { fits, ...rest } = result;

    void fits;
    islandRecords.push({ ...rest, unionHv: after.hv, unionMinViolation: after.mv });

    return { before, after };
  };

  let last = { before: { hv: 0, mv: Infinity }, after: { hv: 0, mv: Infinity } };

  for (let island = 0; island < islandCount; island++) last = addIsland(island);

  const t1Fires = (step: typeof last) =>
    step.before.hv > 0
      ? step.after.hv >= step.before.hv * 1.1
      : step.after.hv > 0 || step.after.mv <= step.before.mv * 0.75;
  const t1Log: { islands: number; fired: boolean; before: unknown; after: unknown }[] = [];

  while (budget.t1 && islandsRun < budget.islandsMax) {
    const fired = t1Fires(last);

    t1Log.push({ islands: islandsRun, fired, before: last.before, after: last.after });

    if (!fired) break;

    for (let k = 0; k < 2 && islandsRun < budget.islandsMax; k++) last = addIsland(islandsRun);
  }

  triggers.T1 = { enabled: budget.t1, log: t1Log, islandsRun };

  const archiveFits = [...archive.values()];

  log(
    `${job}: archive ${archiveFits.length} configurations, ${archiveFits.filter((f) => f.violation === 0).length} rung-1 feasible, ${lab.computed} points`
  );

  // ----- 6. rung 2 (+ T3) -----
  const r2Pick = greedyDistinct(rankOrder(archiveFits), budget.r2Keep, symbols, schedule.r2Distinct);
  const r2Fits = new Map<string, Fit>();

  for (const item of r2Pick) r2Fits.set(item.id, fit(item.books, R2));

  const clusters = (items: Fit[], minimum: number) => {
    const reps: Fit[] = [];

    for (const item of items)
      if (
        farEnough(
          item.books,
          reps.map((r) => r.books),
          symbols,
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

    for (const rep of r1FeasibleReps) {
      if (t3Added.length >= 16) break;
      if (r2Fits.has(rep.id)) continue;
      if (
        !farEnough(
          rep.books,
          r2Feasible.map((f) => f.books),
          symbols,
          0.1
        )
      )
        continue;

      r2Fits.set(rep.id, fit(rep.books, R2));
      t3Added.push(rep.id);
    }
  }

  triggers.T3 = {
    fired: t3Fires,
    r1FeasibleRegions: r1FeasibleReps.length,
    r2FeasibleRegions: r2FeasibleReps.length,
    added: t3Added
  };
  log(
    `${job}: rung 2: ${[...r2Fits.values()].filter((f) => f.violation === 0).length}/${r2Fits.size} feasible; T3 ${t3Fires ? `fired (+${t3Added.length})` : 'not fired'}`
  );

  // ----- 7. rung 3 -----
  const r3Pick = greedyDistinct(rankOrder([...r2Fits.values()]), budget.r3Keep, symbols, schedule.r3Distinct);
  const r3Fits = new Map<string, Fit & { records?: unknown }>();
  const r3Records = new Map<string, number[]>();

  for (const item of r3Pick) {
    const result = fitWithRecords(item.books, R3);

    r3Records.set(
      result.id,
      result.records.map((r) => r.net)
    );
    r3Fits.set(result.id, stripRecords(result) as Fit);
  }

  log(`${job}: rung 3: ${[...r3Fits.values()].filter((f) => f.violation === 0).length}/${r3Fits.size} feasible`);

  // ----- 8. local refinement -----
  const starts = greedyDistinct(
    rankOrder([...r3Fits.values()] as Fit[]),
    budget.refineStarts,
    symbols,
    schedule.refineDistinct
  );
  const refinements: unknown[] = [];

  for (const start of starts) {
    let current = fit(start.books, RF);
    const path: unknown[] = [
      { pass: 0, id: current.id, robust: current.nb.robustPerYear, violation: current.violation }
    ];

    for (let pass = 1; pass <= schedule.refinePasses; pass++) {
      let best: Fit | undefined;
      let bestGain = 0;
      let moves = 0;

      for (const symbol of symbols) {
        for (const spec of box) {
          const key = spec.key as keyof Grid;

          for (const offset of spec.probes) {
            const value = current.books[symbol]![key] + offset;
            const s = specOf(key);

            if (value < s.min || value > s.max) continue;

            const books: Books = { ...current.books, [symbol]: { ...current.books[symbol]!, [key]: value } };
            const candidate = fit(books, RF);

            moves++;

            if (current.violation > 0) {
              const gain = current.violation - candidate.violation;

              if (gain >= 0.01 && (gain > bestGain || (gain === bestGain && best && candidate.id < best.id))) {
                best = candidate;
                bestGain = gain;
              }
            } else if (
              candidate.violation === 0 &&
              candidate.nb.medianNet >= current.nb.medianNet &&
              candidate.nb.p10Net >= current.nb.p10Net &&
              candidate.nb.p90Dd <= current.nb.p90Dd
            ) {
              const gain = candidate.nb.robustPerYear - current.nb.robustPerYear;

              if (
                gain >= schedule.refineMinGain &&
                (gain > bestGain || (gain === bestGain && best && candidate.nb.p90Dd < best.nb.p90Dd))
              ) {
                best = candidate;
                bestGain = gain;
              }
            }
          }
        }
      }

      if (!best) {
        path.push({ pass, moves, accepted: null });
        break;
      }

      path.push({
        pass,
        moves,
        accepted: best.id,
        gain: bestGain,
        robust: best.nb.robustPerYear,
        violation: best.violation
      });
      current = best;
    }

    const endpoint =
      r3Fits.get(current.id) ??
      (() => {
        const result = fitWithRecords(current.books, R3);

        r3Records.set(
          result.id,
          result.records.map((r) => r.net)
        );
        return stripRecords(result) as Fit;
      })();

    r3Fits.set(endpoint.id, endpoint);
    refinements.push({ start: start.id, endpoint: endpoint.id, path });
  }

  log(`${job}: refinement from ${starts.length} starts done (${lab.computed} points)`);

  // ----- T2: ranking within Monte Carlo uncertainty -----
  const r3All = [...r3Fits.values()] as Fit[];
  const feasible3 = r3All
    .filter((f) => f.violation === 0)
    .sort((a, b) => b.nb.robustPerYear - a.nb.robustPerYear || (a.id < b.id ? -1 : 1));
  const bootRng = rngOf(label('bootstrap'));
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
      for (const item of feasible3.slice(0, 8)) {
        const pooled = pooledFamiliesFit(lab, item.books, symbols, [R3, R3B], floors, 'r3+r3b');

        guard();
        shortlistFits.set(item.id, stripRecords(pooled) as Fit);
        t2.rescored.push(item.id);
      }
    }
  }

  triggers.T2 = t2;

  // ----- 9. shortlist -----
  const signatures = new Map<string, Fit>();

  for (const f of rankOrder([...shortlistFits.values()])) {
    if (!signatures.has(f.centre.signature)) signatures.set(f.centre.signature, f);
  }

  const pool = [...signatures.values()];
  const F = pool.filter((f) => f.violation === 0);
  const taken: (Fit & { pick: string })[] = [];
  const takeBest = (pick: string, ordered: Fit[]) => {
    for (const f of ordered) {
      if (taken.length >= budget.shortlist) return;
      if (taken.some((t) => t.id === f.id)) continue;
      if (
        !farEnough(
          f.books,
          taken.map((t) => t.books),
          symbols,
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
    const profit = [...F].sort(
      (a, b) => b.nb.robustPerYear - a.nb.robustPerYear || a.nb.p90Dd - b.nb.p90Dd || byId(a, b)
    );

    takeBest('profit', profit);

    const pick1 = taken[0];
    const robust = F.filter((f) => !pick1 || f.nb.medianNet >= 0.5 * pick1.nb.medianNet).sort(
      (a, b) => b.nb.share - a.nb.share || a.nb.p90Dd - b.nb.p90Dd || byId(a, b)
    );

    takeBest('robust', robust);
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

  log(`${job}: shortlist ${taken.map((t) => `${t.id} [${t.pick}]`).join(', ') || '(empty)'}`);

  // ----- 10. selection evidence (training window) -----
  // Study 8: B1 for pooled tracks (plus a frozen subset of the same books, none of which exists for this study's
  // memberships; the parity replay passes Study 8's own); report-only, never used by qualification or selection
  const controls: Record<string, Books> = controlBooks;

  const selectFamilies = [1, 2].map((rep) => fam(`select${rep}`, schedule.select.n, label('select', rep)));
  const selectionOf = (books: Books, bookSymbols: readonly string[]) => {
    const fits = selectFamilies.map((family) => stripRecords(fitOf(lab, books, bookSymbols, family, floors)) as Fit);
    const pooled = stripRecords(pooledFamiliesFit(lab, books, bookSymbols, selectFamilies, floors, 'select1+2')) as Fit;

    guard();
    return { select1: compactFit(fits[0]!), select2: compactFit(fits[1]!), pooled: compactFit(pooled) };
  };
  const shortlist = taken.map((t) => ({
    rank: taken.indexOf(t) + 1,
    pick: t.pick,
    id: t.id,
    books: t.books,
    describe: describeBooks(t.books),
    r3: compactFit(r3Fits.get(t.id) ?? t),
    shortlistFit: compactFit(t),
    selection: selectionOf(t.books, symbols)
  }));
  const controlEvidence = Object.fromEntries(
    Object.entries(controls).map(([key, books]) => [
      key,
      {
        books,
        rung3: compactFit(stripRecords(fitOf(lab, books, Object.keys(books), R3, floors)) as Fit),
        selection: selectionOf(books, Object.keys(books))
      }
    ])
  );

  flush();

  // ----- archive table (every rung-1-evaluated configuration) -----
  const archiveRows = archiveFits.map((f) =>
    [
      f.id,
      booksKey(f.books),
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
      `id,books,violation,net,dd,lots,episodes,r1Share,r1P90Dd,r1MedianNet,r1P10Net,r2,r3\n${archiveRows.join('\n')}\n`,
      { level: 9 }
    )
  );

  const record = await writeSealed(out, {
    stage: 'PHASE_B_SEARCH',
    namespace: currentSeedOf()('x')[0],
    job,
    track,
    fold,
    mode,
    at: nowIso(),
    door: { key: door.key, id: door.id, last: door.dates[door.lastIndex], sessions: door.dates.length },
    symbols,
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
      perBookPlausible,
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
    rung3: [...r3Fits.values()].map((f) => compactFit(f as Fit)),
    refinements,
    shortlist,
    controls: controlEvidence,
    noEligibleRegion: archiveFits.every((f) => f.violation > 0),
    archive: { file: archiveFile, rows: archiveRows.length },
    stats: lab.stats(),
    seconds: (Date.now() - started) / 1000
  });

  log(
    `${job}: sealed ${record.file} ${record.bodyHash.slice(0, 12)} in ${((Date.now() - started) / 60000).toFixed(1)} min (${lab.computed} fresh points, cache hits ${cache.hits})`
  );

  return record;
};
