// Phase 4E (PROTOCOL.md §10, §12): the evaluation of every sealed fold pick on its held-back year and the chained
// 2020–2023 accounts, after every fold selection is sealed and the evaluation code is frozen. One evaluation door
// (all 61 symbols through 2023-12-29). Development-window figures are recomputed here only as an integrity check
// (traces built to the development end on the same causal engine reproduce the sealed development scores).
import fs from 'fs-extra';
import type { Dataset } from '../four-family/data.ts';
import { withMissingBars } from '../study3-vgt-momentum-stage1b/data.ts';
import {
  type AllocBook,
  type AllocConfig,
  type AllocResult,
  type Policy,
  policyOf,
  runAllocator
} from './allocator.ts';
import { type BookSpec, clampToBounds, deepBroadBand, gridKey, loadB5, shallowBand, volatilityOf } from './books.ts';
import { type FoldKey, files, foldKeys, paramKeys, resultFile, study } from './context.ts';
import { genomeOfDescription } from './develop.ts';
import { openDoor, selectionFile } from './doors.ts';
import type { Context } from './evaluate.ts';
import { attributionOf, pairedContributions, preservationOf } from './metrics.ts';
import {
  assertNode,
  assertRealRoot,
  assertScope,
  codeFreezeBody,
  evaluationEntries,
  latestCodeFreezeFile,
  nowIso,
  protocolFreezeBody,
  readSealed,
  verifyCodeFreeze,
  writeSealed
} from './records.ts';
import { boundsOf, perturbGenome } from './selection.ts';
import { deepBook, shallowBook } from './search4d.ts';
import { type Genome, genomeKey, rngOf } from './space.ts';
import { type ExecSettings, baseSettings, buildTrace } from './trace.ts';
import { floorsMet } from './verify.ts';

export const codeFreezeEvaluationFile = () => resultFile('CODE_FREEZE_EVALUATION.json');

export const stagesEvaluated = ['4B', '4C', '4D-A', '4D-A0P', '4D-B', '4D-B0', '4D-C', '4D-C0'] as const;
export type StageKey = (typeof stagesEvaluated)[number];

type Description = ReturnType<typeof import('./selection.ts').describeGenome>;

interface FoldSelection {
  window: FoldKey;
  picks: Record<
    string,
    {
      pick: (Description & { evaluation: { delta: number } }) | null;
      noFill: boolean;
      sRaw: (Description & { evaluation: { delta: number } }) | null;
      sRisk: (Description & { evaluation: { delta: number } }) | null;
    }
  >;
  sa: Description;
  b5Books: BookSpec[];
}

// ----- the evaluation world: datasets through 2023-12-29, session indexes of the fold boundaries -----

export interface World {
  datasets: Record<string, Dataset>;
  dates: string[];
  armStart: number;
  endIndex: number;
  yearEnd: Record<string, number>; // '2019' … '2023' → last session index of that year
  b5: BookSpec[];
}

const traceCache = new Map<string, ReturnType<typeof buildTrace>>();

const traceOf = (world: World, book: BookSpec, settings: ExecSettings, endIndex: number, ds?: Dataset) => {
  const data = ds ?? world.datasets[book.symbol]!;
  const key = `${data.id}|${book.symbol}|${gridKey(book.grid)}|${settings.costBps}|${settings.rate}|${settings.stopFill}|${settings.stopSlippageBps}|${endIndex}`;
  let trace = traceCache.get(key);

  if (!trace) {
    trace = buildTrace(data, book, settings, world.armStart, 0, endIndex);
    traceCache.set(key, trace);

    if (traceCache.size > 40000) {
      traceCache.delete(traceCache.keys().next().value!);
    }
  }

  return trace;
};

export interface RunSpec {
  books: (BookSpec & { activeFrom?: number; activeTo?: number; shallowRank?: number })[];
  policy: Policy;
  schedule?: { from: number; policy: Policy }[];
  resets?: number[];
}

export const runSpec = (
  world: World,
  spec: RunSpec,
  endIndex: number,
  settings = baseSettings(),
  options: {
    latency?: number;
    replacement?: Policy['replacement'];
    datasets?: Record<string, Dataset>;
    segments?: number[];
  } = {}
): AllocResult => {
  const adjust = (policy: Policy): Policy => ({
    ...policy,
    ...(options.latency ? { latency: options.latency } : {}),
    ...(options.replacement ? { replacement: options.replacement } : {})
  });
  const books: AllocBook[] = spec.books.map((book) => ({
    id: book.id,
    symbol: book.symbol,
    tier: book.tier,
    ds: (options.datasets ?? world.datasets)[book.symbol]!,
    trace: traceOf(world, book, settings, endIndex, options.datasets?.[book.symbol]),
    shallowRank: book.shallowRank,
    activeFrom: book.activeFrom,
    activeTo: book.activeTo
  }));
  const config: AllocConfig = {
    startIndex: 0,
    endIndex,
    armStart: world.armStart,
    principal: settings.notional,
    rate: settings.rate,
    costBps: settings.costBps,
    stopSlippageBps: settings.stopSlippageBps,
    policy: adjust(spec.policy),
    policySchedule: spec.schedule?.map((item) => ({ from: item.from, policy: adjust(item.policy) })),
    tieMode: 'tier',
    resets: spec.resets,
    segments: options.segments
  };

  return runAllocator(books, config);
};

const specOfGenome = (genome: Genome): RunSpec => ({
  books: [...genome.deep, ...genome.shallow.map((book, rank) => ({ ...book, shallowRank: rank }))],
  policy: genome.policy
});

export const b5Spec = (world: World): RunSpec => ({
  books: world.b5.map((book) => ({ ...book })),
  policy: policyOf('P0')
});

const foldYear = (fold: FoldKey) => String(2000 + Number(fold.slice(1)));
const previousYear = (fold: FoldKey) => String(1999 + Number(fold.slice(1)));

// The chained account: fold y's configuration decides during year y (F20's also before 2020); books identified by id
// (tier, symbol, vector). A book absent from a year's pick is a runoff book; a book that returns after a gap gets a second
// activation entry (`<id>#2`, …) sharing the same warm virtual trace; its lots and switches are mapped back to the base
// id (baseIdsOf) so preservation matching sees one book.
export const chainedSpec = (world: World, genomes: Record<FoldKey, Genome>, mode: 'carry' | 'reset'): RunSpec => {
  const entries = new Map<string, RunSpec['books'][number]>();
  const latest = new Map<string, string>(); // base id → its latest entry key
  const schedule: { from: number; policy: Policy }[] = [];

  const place = (book: BookSpec, from: number, to: number, rank?: number) => {
    const key = latest.get(book.id);
    const existing = key ? entries.get(key) : undefined;

    if (existing && existing.activeTo === from - 1) {
      existing.activeTo = to;
      existing.shallowRank = rank ?? existing.shallowRank;
      return;
    }

    const n = existing ? Number(key!.split('#')[1] ?? '1') + 1 : 1;
    const id = n === 1 ? book.id : `${book.id}#${n}`;

    entries.set(id, {
      ...book,
      id,
      activeFrom: from,
      activeTo: to,
      ...(rank !== undefined ? { shallowRank: rank } : {})
    });
    latest.set(book.id, id);
  };

  foldKeys.forEach((fold, index) => {
    const genome = genomes[fold];
    const from = index === 0 ? 0 : world.yearEnd[previousYear(fold)]! + 1;
    const to = world.yearEnd[foldYear(fold)]!;

    schedule.push({ from, policy: genome.policy });
    genome.shallow.forEach((book, rank) => place(book, from, to, rank));

    for (const book of genome.deep) {
      place(book, from, to);
    }
  });

  return {
    books: [...entries.values()],
    policy: schedule[0]!.policy,
    schedule: schedule.slice(1),
    resets: mode === 'reset' ? ['2019', '2020', '2021', '2022'].map((year) => world.yearEnd[year]!) : undefined
  };
};

const baseId = (id: string) => id.replace(/#\d+$/, '');

// Lots and switches of a chained run with every activation entry mapped back to its book's base id.
export const baseIdsOf = (result: AllocResult): AllocResult => ({
  ...result,
  lots: result.lots.map((lot) => ({ ...lot, bookId: baseId(lot.bookId) })),
  switches: result.switches.map((sw) => ({
    ...sw,
    deepBookId: baseId(sw.deepBookId),
    shallowBookId: baseId(sw.shallowBookId)
  }))
});

export const yearlyIncrements = (world: World, result: AllocResult) =>
  Object.fromEntries(
    ['2020', '2021', '2022', '2023'].map((year) => [
      year,
      result.liquidation[world.yearEnd[year]!]! - result.liquidation[world.yearEnd[String(Number(year) - 1)]!]!
    ])
  );

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const spearman = (a: number[], b: number[]) => {
  const rank = (values: number[]) => {
    const order = values.map((value, index) => ({ value, index })).sort((x, y) => x.value - y.value);
    const ranks = new Array<number>(values.length);

    order.forEach((entry, position) => {
      ranks[entry.index] = position;
    });

    return ranks;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const mean = (n - 1) / 2;
  let num = 0;
  let da = 0;
  let db = 0;

  for (let i = 0; i < n; i++) {
    num += (ra[i]! - mean) * (rb[i]! - mean);
    da += (ra[i]! - mean) ** 2;
    db += (rb[i]! - mean) ** 2;
  }

  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : NaN;
};

export interface StageRecord {
  skill: { best: (Description & { delta: number })[]; random: (Description & { delta: number })[] };
  nullPicks: (Description | null)[];
}

// The evaluation proper, on a world (datasets through the evaluation end) and the sealed fold selections; pure apart
// from the reference engine runs and logging (the smoke test runs it on synthetic markets).
export const evaluateWorld = async (
  world: World,
  selections: Record<FoldKey, FoldSelection>,
  readStage: (fold: FoldKey, stage: string) => StageRecord,
  log: (line: string) => void
) => {
  const b5 = { books: world.b5 };
  const yearEnd = world.yearEnd;
  // B5, B4, B1 continuous runs and B5 under resets
  const end = world.endIndex;
  const b5Run = runSpec(world, b5Spec(world), end, baseSettings(), { segments: [yearEnd['2019']!] });
  const b5Reset = runSpec(
    world,
    { ...b5Spec(world), resets: ['2019', '2020', '2021', '2022'].map((y) => yearEnd[y]!) },
    end,
    baseSettings(),
    { segments: [yearEnd['2019']!] }
  );
  const b4Run = runSpec(world, { books: b5.books.filter((b) => b.symbol !== 'GDX'), policy: policyOf('P0') }, end);
  const b1Run = runSpec(world, { books: b5.books.filter((b) => b.symbol === 'VGT'), policy: policyOf('P0') }, end);
  const b5Years = yearlyIncrements(world, b5Run);

  log(
    `B5 2020–2023 increments ${JSON.stringify(Object.fromEntries(Object.entries(b5Years).map(([y, v]) => [y, Math.round(v)])))}`
  );

  const out: Record<string, unknown> = {};
  const pickGenome = (fold: FoldKey, stage: string, which: 'pick' | 'sRaw' | 'sRisk' = 'pick'): Genome => {
    const entry = selections[fold].picks[stage]!;
    const d = entry[which];

    return d ? genomeOfDescription(d) : { deep: b5.books.map((b) => ({ ...b })), shallow: [], policy: policyOf('P0') };
  };

  const firstEvalTime = world.datasets.VGT!.sTime[yearEnd['2019']! + 1]!;
  const b5Reset2 = b5Reset;
  const yearsOf = (run: AllocResult) => yearlyIncrements(world, run);
  const deltaYears = (run: AllocResult, base: AllocResult) => {
    const a = yearsOf(run);
    const b = yearsOf(base);

    return Object.fromEntries(Object.keys(a).map((y) => [y, a[y]! - b[y]!]));
  };
  const withoutShallow = (g: Genome): Genome => ({ deep: g.deep, shallow: [], policy: policyOf('P0') });
  const withKind = (g: Genome, kind: Policy['kind']): Genome => ({ ...g, policy: { ...g.policy, kind } });
  const withB5Deep = (g: Genome): Genome => ({ ...g, deep: b5.books.map((book) => ({ ...book })) });
  const chainOf = (make: (fold: FoldKey) => Genome) =>
    Object.fromEntries(foldKeys.map((fold) => [fold, make(fold)])) as Record<FoldKey, Genome>;
  const chainedDelta = (
    genomes: Record<FoldKey, Genome>,
    settings = baseSettings(),
    options: Parameters<typeof runSpec>[4] = {},
    base?: AllocResult
  ) => {
    const run = baseIdsOf(
      runSpec(world, chainedSpec(world, genomes, 'carry'), end, settings, { ...options, segments: [yearEnd['2019']!] })
    );
    const ref =
      base ??
      (settings.costBps === 5 &&
      settings.rate === 0.11 &&
      settings.stopFill === 'stop' &&
      settings.stopSlippageBps === 0 &&
      !options.latency &&
      !options.datasets &&
      !options.replacement
        ? b5Run
        : runSpec(world, b5Spec(world), end, settings, { ...options, segments: [yearEnd['2019']!] }));
    const delta = deltaYears(run, ref);

    return { run, delta, sumDelta: sum(Object.values(delta)) };
  };
  const reference = await import('./reference.ts');
  const { paramsOfGrid } = await import('./books.ts');
  const referenceRun = (spec: RunSpec) =>
    reference.runReference(
      spec.books.map((book) => ({
        id: book.id,
        symbol: book.symbol,
        tier: book.tier,
        ds: world.datasets[book.symbol]!,
        params: paramsOfGrid(book.symbol, book.grid),
        shallowRank: book.shallowRank,
        activeFrom: book.activeFrom,
        activeTo: book.activeTo
      })),
      {
        startIndex: 0,
        endIndex: end,
        armStart: world.armStart,
        principal: 100000,
        rate: 0.11,
        costBps: 5,
        stopSlippageBps: 0,
        stopFill: 'stop',
        policy: spec.policy,
        policySchedule: spec.schedule,
        tieMode: 'tier',
        resets: spec.resets
      }
    );
  const { compareWithReference } = await import('./referenceParity.ts');
  const referenceChecks: { stage: string; mode: string; pass: boolean; detail: string }[] = [];

  for (const stage of stagesEvaluated) {
    const genomes = chainOf((fold) => pickGenome(fold, stage));
    const chained = chainedDelta(genomes);
    const resetSpec = chainedSpec(world, genomes, 'reset');
    const reset = runSpec(world, resetSpec, end, baseSettings(), { segments: [yearEnd['2019']!] });
    const resetDelta = deltaYears(reset, b5Reset2);
    const preservation = preservationOf(chained.run, b5Run, { from: firstEvalTime, top: 10 });
    // per-trade status of B5's 2020–2023 lots, read from the frozen rule itself: the status of lot k is the counter
    // that preservationOf increments between B5's first k and first k + 1 window lots (it processes them in order)
    const b5WindowLots = b5Run.lots.filter((lot) => lot.entryTime >= firstEvalTime);
    const candidateByTrade = new Map(chained.run.lots.map((lot) => [`${lot.bookId}#${lot.tradeId}`, lot]));
    const b5Trades = b5WindowLots.map((lot, k) => {
      const before = preservationOf(chained.run, { ...b5Run, lots: b5WindowLots.slice(0, k) }, { from: firstEvalTime });
      const after = preservationOf(
        chained.run,
        { ...b5Run, lots: b5WindowLots.slice(0, k + 1) },
        { from: firstEvalTime }
      );
      const status = (['exact', 'delayed', 'altered', 'missed'] as const).find((s) => after[s] > before[s])!;
      const match =
        status === 'exact' || status === 'delayed' ? candidateByTrade.get(`${lot.bookId}#${lot.tradeId}`) : undefined;

      return { bookId: lot.bookId, tradeId: lot.tradeId, status, candidateNet: match?.net ?? null };
    });
    const attribution = attributionOf(chained.run, b5Run, firstEvalTime);
    const paired = pairedContributions(chained.run, b5Run).filter((row) => row.session > yearEnd['2019']!);
    const sortedPaired = [...paired].sort((a, b) => b.contribution - a.contribution);
    const clusterMax = (() => {
      let best = 0;

      for (let start = yearEnd['2019']! + 1; start <= end; start++) {
        const total = paired
          .filter((row) => row.session >= start && row.session < start + 20)
          .reduce((t, row) => t + row.contribution, 0);

        best = Math.max(best, total);
      }

      return best;
    })();
    const positiveBySymbol: Record<string, number> = {};

    for (const row of paired) {
      if (row.contribution > 0) {
        positiveBySymbol[row.symbol] = (positiveBySymbol[row.symbol] ?? 0) + row.contribution;
      }
    }

    const positiveTotal = sum(Object.values(positiveBySymbol));
    const shallowLots = chained.run.lots.filter((lot) => lot.tier === 'shallow' && lot.entryIndex > yearEnd['2019']!);
    const shallowByYear = Object.fromEntries(
      ['2020', '2021', '2022', '2023'].map((y) => [
        y,
        sum(shallowLots.filter((lot) => world.dates[lot.entryIndex]!.startsWith(y)).map((lot) => lot.net))
      ])
    );
    const ablations = {
      shallowOff: chainedDelta(chainOf((fold) => withoutShallow(pickGenome(fold, stage)))),
      preemptionOff: chainedDelta(chainOf((fold) => withKind(pickGenome(fold, stage), 'P0'))),
      lateFunding: chainedDelta(chainOf((fold) => withKind(pickGenome(fold, stage), 'P0M'))),
      b5DeepWithPickShallow: chainedDelta(chainOf((fold) => withB5Deep(pickGenome(fold, stage)))),
      sRaw: chainedDelta(chainOf((fold) => pickGenome(fold, stage, 'sRaw'))),
      sRisk: chainedDelta(chainOf((fold) => pickGenome(fold, stage, 'sRisk')))
    };
    const costs: Record<string, number> = {};

    for (const rate of [0.08, 0.11, 0.14]) {
      for (const costBps of [0, 5, 10]) {
        costs[`${rate}/${costBps}`] = chainedDelta(genomes, baseSettings({ rate, costBps })).sumDelta;
      }
    }

    const stresses: Record<string, number> = {
      latency300: chainedDelta(genomes, baseSettings(), { latency: 300 }).sumDelta,
      stopSlippage25: chainedDelta(genomes, baseSettings({ stopSlippageBps: 25 })).sumDelta,
      stopNextOpen: chainedDelta(genomes, baseSettings({ stopFill: 'next-open' })).sumDelta,
      // legacy replacement (P2L mechanics) applies to P2 picks only (PROTOCOL.md §10.4); NaN when no fold pick is P2
      legacyReplacement: foldKeys.some((fold) => genomes[fold].policy.kind === 'P2')
        ? chainedDelta(
            chainOf((fold) =>
              genomes[fold].policy.kind === 'P2'
                ? { ...genomes[fold], policy: { ...genomes[fold].policy, replacement: 'legacy' as const } }
                : genomes[fold]
            )
          ).sumDelta
        : NaN
    };

    for (const seed of [1, 2, 3]) {
      stresses[`missingBars${seed}`] = chainedDelta(genomes, baseSettings(), {
        datasets: thinnedWorld(world, seed)
      }).sumDelta;
    }

    // perturbations of every fold pick (and of its shallow-off ablation): development and evaluation-year Δ
    const perturbations: { fold: FoldKey; ablation: boolean; devDelta: number; evalDelta: number; minuteDD: number }[] =
      [];

    for (const fold of foldKeys) {
      const y = foldYear(fold);
      const devEnd = yearEnd[previousYear(fold)]!;
      const b5Fold = runSpec(world, b5Spec(world), yearEnd[y]!);
      const vB5 = b5Fold.liquidation[yearEnd[y]!]! - b5Fold.liquidation[devEnd]!;

      for (const ablation of [false, true]) {
        const base = ablation ? withoutShallow(pickGenome(fold, stage)) : pickGenome(fold, stage);

        if (selections[fold].picks[stage]!.noFill && !ablation) {
          continue;
        }

        const rng = rngOf('4E', 'perturb', stage, fold, ablation ? 'ablation' : 'pick');
        const ctxLike = perturbContext(world, fold);

        for (let n = 0; n < 64; n++) {
          const genome = perturbGenome(ctxLike, base, rng);
          const run = runSpec(world, specOfGenome(genome), yearEnd[y]!, baseSettings(), { segments: [devEnd] });

          perturbations.push({
            fold,
            ablation,
            devDelta: run.marks[devEnd]! - b5Fold.marks[devEnd]!,
            evalDelta: run.liquidation[yearEnd[y]!]! - run.liquidation[devEnd]! - vB5,
            minuteDD: run.segments[0]!.minute.maximum
          });
        }
      }
    }

    // one-at-a-time profiles of the 4D picks (PROTOCOL.md §10.3): every searched coordinate × (1 + δ), δ = ±5%, ±10%
    const oneAtATime: {
      fold: FoldKey;
      book: string;
      key: string;
      delta: number;
      value: number;
      devDelta: number;
      evalDelta: number;
    }[] = [];

    if (stage.startsWith('4D')) {
      for (const fold of foldKeys) {
        if (selections[fold].picks[stage]!.noFill) {
          continue;
        }

        const y = foldYear(fold);
        const devEnd = yearEnd[previousYear(fold)]!;
        const b5Fold = runSpec(world, b5Spec(world), yearEnd[y]!);
        const vB5 = b5Fold.liquidation[yearEnd[y]!]! - b5Fold.liquidation[devEnd]!;
        const base = pickGenome(fold, stage);
        const ctxLike = perturbContext(world, fold);

        for (const book of [...base.deep.filter((b) => b.origin !== 'B5'), ...base.shallow]) {
          const bounds = boundsOf(ctxLike, book);

          if (!bounds) {
            continue;
          }

          for (const key of paramKeys) {
            for (const d of [-0.1, -0.05, 0.05, 0.1]) {
              const v = book.grid[key];
              const moved =
                v + (Math.abs(v) * Math.abs(d) >= 1 ? Math.round(v * d) : Math.sign(d) * (Math.abs(d) >= 0.1 ? 1 : 0));
              const grid = clampToBounds({ ...book.grid, [key]: moved }, bounds);

              if (gridKey(grid) === gridKey(book.grid)) {
                continue;
              }

              const replacement =
                book.tier === 'shallow'
                  ? shallowBook(book.symbol, grid, `${book.origin}:oat`)
                  : deepBook(book.symbol, grid, `${book.origin}:oat`, book.deepMode!);
              const genome: Genome = {
                deep: base.deep.map((b) => (b === book ? replacement : b)),
                shallow: base.shallow.map((b) => (b === book ? replacement : b)),
                policy: base.policy
              };
              const run = runSpec(world, specOfGenome(genome), yearEnd[y]!);

              oneAtATime.push({
                fold,
                book: book.id,
                key,
                delta: d,
                value: grid[key],
                devDelta: run.marks[devEnd]! - b5Fold.marks[devEnd]!,
                evalDelta: run.liquidation[yearEnd[y]!]! - run.liquidation[devEnd]! - vB5
              });
            }
          }
        }
      }
    }

    // selection skill and the random-champion null
    const skill: { fold: FoldKey; set: 'best' | 'random'; devDelta: number; evalDelta: number }[] = [];
    const nullSums: number[] = [];
    const stageRecords = Object.fromEntries(foldKeys.map((fold) => [fold, readStage(fold, stage)]));

    for (const fold of foldKeys) {
      const y = foldYear(fold);
      const devEnd = yearEnd[previousYear(fold)]!;
      const b5Fold = runSpec(world, b5Spec(world), yearEnd[y]!);
      const vB5 = b5Fold.liquidation[yearEnd[y]!]! - b5Fold.liquidation[devEnd]!;

      for (const set of ['best', 'random'] as const) {
        for (const d of stageRecords[fold]!.skill[set]) {
          const run = runSpec(world, specOfGenome(genomeOfDescription(d)), yearEnd[y]!);

          skill.push({
            fold,
            set,
            devDelta: d.delta,
            evalDelta: run.liquidation[yearEnd[y]!]! - run.liquidation[devEnd]! - vB5
          });
        }
      }
    }

    for (let r = 0; r < 100; r++) {
      const genomes0 = chainOf((fold) => {
        const d = stageRecords[fold]!.nullPicks[r];

        return d
          ? genomeOfDescription(d)
          : { deep: b5.books.map((b) => ({ ...b })), shallow: [], policy: policyOf('P0') };
      });

      nullSums.push(chainedDelta(genomes0).sumDelta);
    }

    const best = skill.filter((row) => row.set === 'best');
    const rho = spearman(
      best.map((row) => row.devDelta),
      best.map((row) => row.evalDelta)
    );

    // fast = reference on the verdict accounts (carry and reset)
    for (const [mode, spec] of [
      ['carry', chainedSpec(world, genomes, 'carry')],
      ['reset', resetSpec]
    ] as const) {
      const fast = runSpec(world, spec, end);
      const ref = referenceRun(spec);
      const check = compareWithReference(`${stage} ${mode}`, fast, ref)[0]!;

      referenceChecks.push({ stage, mode, pass: check.pass, detail: String(check.actual ?? '') });
    }

    out[stage] = {
      folds: Object.fromEntries(
        foldKeys.map((fold) => {
          const genome = genomes[fold];
          const y = foldYear(fold);
          const devEnd = yearEnd[previousYear(fold)]!;
          const run = runSpec(world, specOfGenome(genome), yearEnd[y]!, baseSettings(), { segments: [devEnd] });
          const b5Fold = runSpec(world, b5Spec(world), yearEnd[y]!, baseSettings(), { segments: [devEnd] });
          const v = run.liquidation[yearEnd[y]!]! - run.liquidation[devEnd]!;
          const vb5 = b5Fold.liquidation[yearEnd[y]!]! - b5Fold.liquidation[devEnd]!;
          const sealedDev = selections[fold].picks[stage]!.pick?.evaluation.delta ?? 0;

          return [
            fold,
            {
              noFill: selections[fold].picks[stage]!.noFill,
              pick: selections[fold].picks[stage]!.pick ? genomeKey(genome) : 'B5 (no-fill)',
              devDeltaSealed: sealedDev,
              devDeltaRecomputed: run.marks[devEnd]! - b5Fold.marks[devEnd]!,
              v,
              vB5: vb5,
              delta: v - vb5,
              windowedMinuteDD: run.segments[0]!.minute.maximum,
              windowedDailyDD: run.segments[0]!.daily.maximum,
              preservation: preservationOf(run, b5Fold, { from: world.datasets.VGT!.sTime[devEnd + 1]!, top: 5 }),
              attribution: attributionOf(run, b5Fold, world.datasets.VGT!.sTime[devEnd + 1]!)
            }
          ];
        })
      ),
      chained: {
        years: yearsOf(chained.run),
        delta: chained.delta,
        sumDelta: chained.sumDelta,
        minuteDD: chained.run.segments[0]!.minute,
        dailyDD: chained.run.segments[0]!.daily,
        b5MinuteDD: b5Run.segments[0]!.minute,
        b5DailyDD: b5Run.segments[0]!.daily,
        preservation,
        b5Trades,
        attribution,
        shallowLots: shallowLots.length,
        shallowYears: new Set(shallowLots.map((lot) => world.dates[lot.entryIndex]!.slice(0, 4))).size,
        shallowByYear,
        lots: chained.run.lots
          .filter((lot) => lot.entryIndex > yearEnd['2019']!)
          .map((lot) => ({
            ...lot,
            entryDate: world.dates[lot.entryIndex],
            exitDate: lot.exitIndex >= 0 ? world.dates[lot.exitIndex] : 'open'
          })),
        switches: chained.run.switches
          .filter((sw) => sw.decisionIndex > yearEnd['2019']!)
          .map((sw) => ({ ...sw, decisionDate: world.dates[sw.decisionIndex] })),
        largestPaired: sortedPaired[0]?.contribution ?? 0,
        largestCluster: clusterMax,
        maxYearShare: chained.sumDelta > 0 ? Math.max(...Object.values(chained.delta)) / chained.sumDelta : null,
        maxSymbolShare: positiveTotal > 0 ? Math.max(...Object.values(positiveBySymbol)) / positiveTotal : null,
        positiveBySymbol
      },
      reset: { delta: resetDelta, sumDelta: sum(Object.values(resetDelta)) },
      ablations: Object.fromEntries(
        Object.entries(ablations).map(([key, value]) => [key, { delta: value.delta, sumDelta: value.sumDelta }])
      ),
      costs,
      stresses,
      perturbations: {
        pick: summarizePerturbations(perturbations.filter((row) => !row.ablation)),
        shallowOff: summarizePerturbations(perturbations.filter((row) => row.ablation)),
        rows: perturbations
      },
      oneAtATime,
      skill: { spearmanBest: rho, rows: skill },
      null: { sums: nullSums, p75: quantile(nullSums, 0.75) }
    };
    log(
      `${stage}: chained ΣΔ ${chained.sumDelta.toFixed(0)} (${Object.values(chained.delta)
        .map((d) => d.toFixed(0))
        .join(' / ')}); reset ΣΔ ${sum(Object.values(resetDelta)).toFixed(0)}`
    );
  }

  const rubric = rubricOf(out, referenceChecks);

  for (const [stage, verdict] of Object.entries(rubric)) {
    log(`${stage}: ${verdict.label}`);
  }

  return { out, referenceChecks, rubric, b5Run, b4Run, b1Run, b5Years };
};

// ----- the portfolio overlay check (PROTOCOL.md §10.8) -----
// The frozen N-book engine in portfolio mode ($300,000 VOOG/VGT 60/40 core, 20% of marked equity per funded decision,
// frozen dividend convention) for B5 on the evaluation door's data, compared with the sealed training anchor. Study 4's
// candidates (tier ties, mirror lots, same-symbol books, chained configurations) cannot be expressed in that engine, so
// E4 is not evaluated for them (declared in the protocol).
export const b5OverlayCheck = async (world: World) => {
  const { readDistributionLedger } = await import('../multi-etf-allocator/dataset.ts');
  const { assembleUniverse } = await import('../multi-etf-allocator/data.ts');
  const { baseNRunConfig, runNAllocator } = await import('../portfolio-aware-d1/nbook/engine.ts');
  const { phenotypeOf, paramsOfGrid } = await import('./books.ts');
  const members = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'];
  const instruments = Object.fromEntries(
    members.map((symbol) => [
      symbol,
      { symbol, file: 'study4-door', hash: world.datasets[symbol]!.dataHash, ds: world.datasets[symbol]! }
    ])
  );
  const ledger = await readDistributionLedger();
  const last = world.dates[world.endIndex]!;
  const assembled = assembleUniverse(
    instruments as never,
    ledger.distributions.filter((d) => d.exDate <= last),
    last,
    {},
    study.armingStart
  );
  const universe = {
    end: assembled.end,
    dates: assembled.dates,
    sessionCount: assembled.sessionCount,
    instruments: instruments as never,
    distributions: assembled.distributions,
    eligibilityIndex: assembled.eligibilityIndex
  };
  const result = runNAllocator(
    universe,
    baseNRunConfig({
      key: 'study4-b5-overlay',
      label: 'B5 portfolio overlay 5 bps',
      mode: 'portfolio',
      symbols: world.b5.map((book) => book.symbol),
      phenotypes: Object.fromEntries(
        world.b5.map((book) => [book.symbol, { ...phenotypeOf(book), params: paramsOfGrid(book.symbol, book.grid) }])
      ),
      costBps: 5,
      fixedPrincipal: 100000,
      rate: 0.11,
      stopFill: 'stop',
      stopSlippageBps: 0,
      lotDividends: true,
      initial: { voog: 180000, vgt: 120000 },
      eligibilityIndex: universe.eligibilityIndex,
      accountingStartIndex: 0
    })
  );
  const endEquity = result.daily.at(-1)!.equity;
  const anchor = 2270264.325530123;

  return {
    endEquity,
    anchorEndEquity: anchor,
    parity: Math.abs(endEquity - anchor) <= 0.005,
    dailyDrawdown: result.dailyDrawdown,
    dailyPercentDrawdown: result.dailyPercentDrawdown ?? null,
    anchorDailyPercent: 0.2966781505859238,
    note: 'B5 only; Study 4 candidates are not expressible in the frozen portfolio engine, so E4 is not evaluated'
  };
};

// ----- the evaluation stage -----

export const runEvaluation = async (log: (line: string) => void = (line) => console.log(`${nowIso()} ${line}`)) => {
  assertNode();
  assertRealRoot();

  const scope = assertScope();
  const protocolBody = protocolFreezeBody();
  const codeBody = codeFreezeBody();
  const evaluationCodeBody = verifyCodeFreeze(codeFreezeEvaluationFile(), evaluationEntries());
  const guard = { protocolBody, codeBody, evaluationCodeBody, head: scope.head, node: process.version };
  const recordFile = resultFile('evaluation', 'RECORD.json');

  if (fs.existsSync(recordFile)) {
    throw new Error(`refused: ${recordFile} is sealed`);
  }

  const selections = Object.fromEntries(
    foldKeys.map((fold) => [fold, readSealed<FoldSelection>(selectionFile(fold))])
  ) as unknown as Record<FoldKey, FoldSelection & { bodyHash: string; sealedAt: string }>;
  const door = await openDoor({ purpose: 'evaluation', symbols: study.universe });
  const b5 = await loadB5();
  const index = (date: string) => door.dates.indexOf(date);
  const yearEnd = Object.fromEntries(
    ['2019', '2020', '2021', '2022', '2023'].map((year) => [
      year,
      Math.max(...door.dates.map((date, i) => (date.startsWith(year) ? i : -1)))
    ])
  );
  const world: World = {
    datasets: door.datasets,
    dates: door.dates,
    armStart: door.armStart,
    endIndex: door.sessionCount - 1,
    yearEnd,
    b5: b5.books
  };

  void index;
  log(
    `evaluation door: ${door.symbols.length} symbols through ${door.end}; selections ${foldKeys.map((f) => selections[f].bodyHash.slice(0, 8)).join(' ')}`
  );

  const overlay = await b5OverlayCheck(world);

  log(
    `B5 overlay: end equity ${overlay.endEquity.toFixed(2)} (anchor ${overlay.anchorEndEquity}); parity ${overlay.parity}`
  );

  const { out, referenceChecks, rubric, b5Run, b4Run, b1Run, b5Years } = await evaluateWorld(
    world,
    selections,
    (fold, stage) => readSealed(resultFile(fold, stage, 'RECORD.json')) as unknown as StageRecord,
    log
  );

  writeSealed(recordFile, {
    stage: 'EVALUATION',
    guard,
    door: { end: door.end, records: door.records },
    selections: Object.fromEntries(foldKeys.map((fold) => [fold, selections[fold].bodyHash])),
    b5: {
      years: b5Years,
      net: b5Run.net,
      minuteDD: b5Run.segments[0]!.minute,
      dailyDD: b5Run.segments[0]!.daily,
      // B5's 2020–2023 funded lots (the preservation reference), for the per-trade preservation listing
      lots: b5Run.lots
        .filter((lot) => lot.entryIndex > world.yearEnd['2019']!)
        .map((lot) => ({
          ...lot,
          entryDate: world.dates[lot.entryIndex],
          exitDate: lot.exitIndex >= 0 ? world.dates[lot.exitIndex] : 'open'
        }))
    },
    b4: { net: b4Run.net, years: yearlyIncrements(world, b4Run) },
    b1: { net: b1Run.net, years: yearlyIncrements(world, b1Run) },
    results: out,
    referenceChecks,
    rubric,
    overlay,
    files: { protocolFreeze: files.protocolFreeze }
  });

  return out;
};

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const lo = Math.floor(position);
  const hi = Math.ceil(position);

  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (position - lo);
};

const summarizePerturbations = (rows: { evalDelta: number; devDelta: number; minuteDD: number }[]) => ({
  n: rows.length,
  evalPositiveShare: rows.length ? rows.filter((row) => row.evalDelta > 0).length / rows.length : null,
  evalMedian: quantile(
    rows.map((row) => row.evalDelta),
    0.5
  ),
  evalP10: quantile(
    rows.map((row) => row.evalDelta),
    0.1
  ),
  devMedian: quantile(
    rows.map((row) => row.devDelta),
    0.5
  ),
  withinDD: rows.length ? rows.filter((row) => row.minuteDD <= 35000).length / rows.length : null
});

// The role bounds of a fold's development window, recomputed from the evaluation door's data up to the development end
// (σ over the same sessions; used only to keep perturbations inside their bands, PROTOCOL.md §10.3).
const infoCache = new Map<string, Map<string, unknown>>();
const rhoCache = new Map<string, number>();

const perturbInfo = (world: World, fold: FoldKey) => {
  if (!infoCache.has(fold)) {
    const devEnd = world.yearEnd[previousYear(fold)]!;
    const sigma = (symbol: string) => volatilityOf(world.datasets[symbol]!, devEnd);
    const rho = Math.min(...world.b5.map((book) => book.grid.targetPercentChange / 1000 / sigma(book.symbol)));
    const info = new Map<string, unknown>();

    for (const symbol of Object.keys(world.datasets)) {
      const s = sigma(symbol);
      const b5Book = world.b5.find((book) => book.symbol === symbol);

      info.set(symbol, {
        symbol,
        sigma: s,
        shallow: shallowBand(s, b5Book?.grid.targetPercentChange),
        deepBroad: deepBroadBand(s, rho)
      });
    }

    infoCache.set(fold, info);
    rhoCache.set(fold, rho);
  }

  return infoCache.get(fold)!;
};

const rhoOf = (world: World, fold: FoldKey) => {
  perturbInfo(world, fold);
  return rhoCache.get(fold)!;
};

// The part of a development Context that the band functions read (boundsOf → shallowBoundsOf, neighbourhoodOf,
// deepBroadBoundsOf): the per-symbol bands, ρ and B5's books (a neighbourhood-reoptimized deep book's bounds are centred
// on its B5 incumbent; amendment A5).
const perturbContext = (world: World, fold: FoldKey) =>
  ({ info: perturbInfo(world, fold), spec: { rho: rhoOf(world, fold), b5: world.b5 } }) as unknown as Context;

// The missing-bar stress (PROTOCOL.md §10.4): every regular-session bar except the first dropped with probability 0.5%,
// seeded per symbol; built lazily per symbol and seed and reused across stages.
const thinnedCache = new Map<number, Record<string, Dataset>>();

const thinnedWorld = (world: World, seed: number) => {
  let cached = thinnedCache.get(seed);

  if (!cached) {
    const lazy: Record<string, Dataset> = {};

    cached = new Proxy(lazy, {
      get: (target, symbol: string) => {
        if (!(symbol in target) && world.datasets[symbol]) {
          const ds = withMissingBars(
            world.datasets[symbol]!,
            0.005,
            7000 + seed * 100 + study.universe.indexOf(symbol)
          );

          ds.id = `${world.datasets[symbol]!.id}:missing${seed}`;
          target[symbol] = ds;
        }

        return target[symbol];
      }
    });
    thinnedCache.set(seed, cached);
  }

  return cached;
};

// The rubric (PROTOCOL.md §12), computed from the evaluation results.
const rubricOf = (out: Record<string, unknown>, referenceChecks: { stage: string; pass: boolean }[]) => {
  const verdicts: Record<string, { label: string; criteria: Record<string, boolean | null> }> = {};
  const frozenClass = new Set(['4B', '4C', '4D-A', '4D-A0P']);
  // V1: the parity records named by the development code freeze exist and passed; V2 (folds): every fold's 4A and 4D
  // floors spent and every fold selection sealed (before this evaluation); `final` re-checks V2 with H
  const parityPass = (() => {
    try {
      const freeze = readSealed<{ parity: Record<string, string>; codeDigest: string }>(latestCodeFreezeFile());

      return Object.entries(freeze.parity).every(([name, body]) => {
        const file = resultFile('parity', `${name}-${freeze.codeDigest.slice(0, 16)}.json`);
        const record = fs.existsSync(file) ? readSealed<{ pass: boolean }>(file) : undefined;

        return record !== undefined && record.pass && record.bodyHash === body;
      });
    } catch {
      return false;
    }
  })();
  const foldsComplete = floorsMet(foldKeys).ok;

  for (const [stage, value] of Object.entries(out)) {
    const r = value as {
      chained: {
        delta: Record<string, number>;
        sumDelta: number;
        minuteDD: { maximum: number };
        dailyDD: { maximum: number };
        b5MinuteDD: { maximum: number };
        preservation: { pnlWeighted: number; countWeighted: number; retention: number; topMissed: number };
        attribution: { idleClean: { net: number } };
        shallowLots: number;
        shallowYears: number;
        shallowByYear: Record<string, number>;
        largestPaired: number;
        largestCluster: number;
        maxYearShare: number | null;
        maxSymbolShare: number | null;
      };
      ablations: Record<string, { delta: Record<string, number>; sumDelta: number }>;
      costs: Record<string, number>;
      stresses: Record<string, number>;
      perturbations: { pick: { evalPositiveShare: number | null; evalMedian: number } };
      skill: { spearmanBest: number };
      null: { p75: number };
    };
    const c = r.chained;
    const twoTier = c.shallowLots > 0;
    const years = Object.values(c.delta);
    const control =
      stage === '4D-B'
        ? (out['4D-B0'] as typeof r | undefined)
        : stage === '4D-C'
          ? (out['4D-C0'] as typeof r | undefined)
          : undefined;
    const criteria: Record<string, boolean | null> = {
      V1: parityPass && referenceChecks.filter((check) => check.stage === stage).every((check) => check.pass),
      V2: foldsComplete,
      E1: c.sumDelta >= 20000 && years.every((d) => d >= -10000) && years.filter((d) => d > 0).length >= 3,
      E2:
        (frozenClass.has(stage)
          ? c.preservation.pnlWeighted >= 0.9 && c.preservation.countWeighted >= 0.85
          : c.preservation.retention >= 0.75) && c.preservation.topMissed === 0,
      E3:
        c.minuteDD.maximum <= 35000 && c.minuteDD.maximum <= c.b5MinuteDD.maximum + 5000 && c.dailyDD.maximum <= 30000,
      E4: null, // overlay not evaluated
      E5: (r.perturbations.pick.evalPositiveShare ?? 0) >= 0.6 && r.perturbations.pick.evalMedian > 0,
      E6:
        (!twoTier || Object.values(c.shallowByYear).filter((v) => v > 0).length >= 3) &&
        (!control ||
          (c.sumDelta - control.chained.sumDelta >= 10000 &&
            Object.keys(c.delta).filter((y) => c.delta[y]! - control.chained.delta[y]! > 0).length >= 3)) &&
        (stage === '4D-B' || stage === '4D-C' ? c.sumDelta - r.ablations.shallowOff!.sumDelta >= 10000 : true),
      E7: (r.costs['0.14/10'] ?? -Infinity) > 0,
      E7b: ['latency300', 'stopSlippage25', 'stopNextOpen'].every((key) => (r.stresses[key] ?? -Infinity) > 0),
      E8:
        c.sumDelta - c.largestPaired > 0 &&
        c.sumDelta - c.largestCluster > 0 &&
        (c.maxYearShare ?? Infinity) <= 0.7 &&
        (c.maxSymbolShare ?? Infinity) <= 0.7,
      E9: !twoTier ? false : c.shallowLots >= 8 && c.shallowYears >= 3,
      E10: c.attribution.idleClean.net > 0 && c.attribution.idleClean.net >= 0.5 * c.sumDelta,
      E11: c.sumDelta >= r.null.p75 && r.skill.spearmanBest > 0
    };
    const label =
      !criteria.V1 || !criteria.V2
        ? 'invalid/incomplete'
        : !criteria.E3
          ? 'risk-incompatible'
          : !criteria.E1
            ? 'no demonstrated incremental benefit'
            : ['E2', 'E5', 'E6', 'E7', 'E7b', 'E8', 'E9', 'E10', 'E11'].some((key) => !criteria[key]) ||
                criteria.E4 !== true
              ? 'descriptive improvement but insufficient evidence'
              : 'historically promising but unvalidated';

    verdicts[stage] = { label, criteria };
  }

  return verdicts;
};

export type { Context };
