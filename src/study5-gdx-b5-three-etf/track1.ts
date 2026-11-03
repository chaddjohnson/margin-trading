// Study B Track 1 — the frozen B5 optimization method (research/portfolio-aware-d1-optimization, Stages A–C) re-run on
// the restricted universe (PROTOCOL.md §6.2, METHOD_RECONSTRUCTION.md §3): GDX searched for its incremental executable
// effect on the base C2 = VGT primary + KRE lowDd (Track P) and standalone (Track S), with the original common pool,
// controls, NSGA-II settings and seeds, feasibility, violations, robust selection R1–R5 and Stage C gates T1–T3. The
// original constants are imported from src/portfolio-aware-d1/context.ts; only the base, the window, the folds and the
// regimes are this study's (stated departures).
import { operatorSpace } from '../multi-etf-d1/space.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { study as original } from '../portfolio-aware-d1/context.ts';
import type { ReplayResult } from '../portfolio-aware-d1/replay.ts';
import { commonSobolPool, poolFor } from '../portfolio-aware-d1/space.ts';
import { devRegimeKeys, execution, folds, frozenGrids, regimes, resultFile, wfFolds, wfRegimeKeys } from './context.ts';
import { openDoor } from './data.ts';
import { type Books, Evaluator, type LotRecord, settingsWith } from './engine.ts';
import { type Grid, describe, genomeOfGrid, gridOfGenome, median, probesOf, vectorId } from './grid.ts';
import { log, nowIso, writeJsonl, writeSealed } from './records.ts';
import { type Candidate, type SearchSummary, runNsga2 } from './search.ts';
import type { Fold } from './studyA.ts';

export type Track = 'S' | 'P';
const costs = [0, 2, 5, 10] as const;
const principal = 5;

export interface StandaloneT1 {
  net: number;
  dd: number;
  ddDaily: number;
  trades: number; // closed
  years: number; // distinct years with a closed trade (exit year)
  folds: number[];
  regimes: number[];
}

export interface PoolT1 {
  net: number;
  dd: number;
  ddDaily: number;
  delta: number;
  lots: number; // funded GDX lots (open included)
  lotYears: number; // distinct entry years of the GDX lots
  ownNet: number; // the GDX lots' funded net
  gained: number; // net of base lots funded only with the book
  displaced: number; // net of base lots no longer funded
  folds: number[]; // Δ attributed
  regimes: number[]; // Δ attributed
  netPerDrawdown: number;
}

export interface VectorT1 {
  id: string;
  grid: Grid;
  origin: string;
  results: Record<number, { standalone: StandaloneT1; pool: PoolT1 }>;
}

const lotKey = (lot: LotRecord) => `${lot.symbol}|${lot.entryTime}`;

export class Track1Evaluator {
  readonly ev: Evaluator;
  readonly base: Books;
  readonly symbol: string;
  readonly foldList: readonly { key: string; start: string; end: string }[];
  readonly regimeList: readonly { key: string; start: string; end: string }[];
  private readonly baseRuns = new Map<number, ReplayResult>();

  constructor(
    ev: Evaluator,
    base: Books,
    symbol: string,
    foldList: readonly { key: string; start: string; end: string }[],
    regimeList: readonly { key: string; start: string; end: string }[]
  ) {
    this.ev = ev;
    this.base = base;
    this.symbol = symbol;
    this.foldList = foldList;
    this.regimeList = regimeList;
  }

  baseRun(costBps: number) {
    let run = this.baseRuns.get(costBps);

    if (!run) {
      run = this.ev.replay(this.base, settingsWith({ costBps }));
      this.baseRuns.set(costBps, run);
    }

    return run;
  }

  evaluate(grid: Grid, costBps: number) {
    const { ev, symbol } = this;
    const settings = settingsWith({ costBps });
    const alone = ev.replay({ [symbol]: grid }, settings);
    const aloneLots = ev.lotsOf(alone);
    const closed = aloneLots.filter((lot) => !lot.open);
    const attribute = (result: ReplayResult, list: readonly { key: string; start: string; end: string }[]) =>
      ev
        .rangesOf(list)
        .map((range) => result.marks[range.last]! - (range.first > 0 ? result.marks[range.first - 1]! : 0));
    const standalone: StandaloneT1 = {
      net: alone.net,
      dd: alone.minuteDrawdown.maximum,
      ddDaily: alone.dailyDrawdown.maximum,
      trades: closed.length,
      years: new Set(closed.map((lot) => lot.exitDate.slice(0, 4))).size,
      folds: attribute(alone, this.foldList),
      regimes: attribute(alone, this.regimeList)
    };
    const baseRun = this.baseRun(costBps);
    const pool = ev.replay({ ...this.base, [symbol]: grid }, settings);
    const poolLots = ev.lotsOf(pool);
    const baseLots = ev.lotsOf(baseRun);
    const own = poolLots.filter((lot) => lot.symbol === symbol);
    const others = poolLots.filter((lot) => lot.symbol !== symbol);
    const baseKeys = new Set(baseLots.map(lotKey));
    const otherKeys = new Set(others.map(lotKey));
    const deltaOf = (list: readonly { key: string; start: string; end: string }[]) =>
      Object.values(ev.deltaPeriods(pool, baseRun, list));

    return {
      standalone,
      pool: {
        net: pool.net,
        dd: pool.minuteDrawdown.maximum,
        ddDaily: pool.dailyDrawdown.maximum,
        delta: pool.net - baseRun.net,
        lots: own.length,
        lotYears: new Set(own.map((lot) => lot.entryDate.slice(0, 4))).size,
        ownNet: own.reduce((total, lot) => total + lot.net, 0),
        gained: others.filter((lot) => !baseKeys.has(lotKey(lot))).reduce((total, lot) => total + lot.net, 0),
        displaced: baseLots.filter((lot) => !otherKeys.has(lotKey(lot))).reduce((total, lot) => total + lot.net, 0),
        folds: deltaOf(this.foldList),
        regimes: deltaOf(this.regimeList),
        netPerDrawdown: pool.net / pool.minuteDrawdown.maximum
      }
    };
  }
}

// The original tracks' feasibility, violation and objective (src/portfolio-aware-d1/tracks.ts semantics).
export const feasibleOf = (track: Track, result: VectorT1['results'][number]) =>
  track === 'S'
    ? result.standalone.dd <= original.drawdownCeiling &&
      result.standalone.trades >= original.feasibility.S.minTrades &&
      result.standalone.years >= original.feasibility.S.minYears
    : result.pool.dd <= original.drawdownCeiling &&
      result.pool.lots >= original.feasibility.P.minLots &&
      result.pool.lotYears >= original.feasibility.P.minYears;

const violationOf = (track: Track, result: VectorT1['results'][number]) => {
  const ceiling = original.drawdownCeiling;

  return track === 'S'
    ? Math.max(0, result.standalone.dd - ceiling) / ceiling +
        Math.max(0, original.feasibility.S.minTrades - result.standalone.trades) / original.feasibility.S.minTrades +
        Math.max(0, original.feasibility.S.minYears - result.standalone.years) / original.feasibility.S.minYears
    : Math.max(0, result.pool.dd - ceiling) / ceiling +
        Math.max(0, original.feasibility.P.minLots - result.pool.lots) / original.feasibility.P.minLots +
        Math.max(0, original.feasibility.P.minYears - result.pool.lotYears) / original.feasibility.P.minYears;
};

export const objectiveOf = (track: Track, result: VectorT1['results'][number]) =>
  track === 'S' ? result.standalone.net : result.pool.delta;

const drawdownOf = (track: Track, result: VectorT1['results'][number]) =>
  track === 'S' ? result.standalone.dd : result.pool.dd;

const scoreOf = (track: Track, item: VectorT1): Candidate<VectorT1> => {
  const result = item.results[principal]!;

  return {
    id: item.id,
    genome: genomeOfGrid(item.grid),
    objectives: [-objectiveOf(track, result), drawdownOf(track, result)],
    violation: Number.isFinite(objectiveOf(track, result)) ? violationOf(track, result) : 1e9,
    origin: item.origin,
    payload: item
  };
};

const byObjective = (track: Track) => (a: VectorT1, b: VectorT1) =>
  objectiveOf(track, b.results[principal]!) - objectiveOf(track, a.results[principal]!) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const ensureCosts = (t1: Track1Evaluator, item: VectorT1) => {
  for (const costBps of costs) {
    item.results[costBps] ??= t1.evaluate(item.grid, costBps);
  }
};

// §5.3 robust selection R1–R5 (unchanged rules; folds and regimes of this study's window).
export const robustSelection = (t1: Track1Evaluator, track: Track, evaluated: Map<string, VectorT1>) => {
  const baseRun = t1.baseRun(principal);
  const baseNetPerDrawdown = baseRun.net / baseRun.minuteDrawdown.maximum;
  const feasible = [...evaluated.values()]
    .filter((item) => feasibleOf(track, item.results[principal]!))
    .sort(byObjective(track));
  const check = (item: VectorT1) => {
    ensureCosts(t1, item);

    const result = item.results[principal]!;
    const objective = Object.fromEntries(costs.map((costBps) => [costBps, objectiveOf(track, item.results[costBps]!)]));
    const foldValues = track === 'S' ? result.standalone.folds : result.pool.folds;
    const regimeValues = track === 'S' ? result.standalone.regimes : result.pool.regimes;
    const probes = probesOf(item.grid).map((probe) => {
      const probeResult = evaluated.get(vectorId(probe.grid))?.results[principal] ?? t1.evaluate(probe.grid, principal);

      return {
        key: probe.key,
        offset: probe.offset,
        id: vectorId(probe.grid),
        feasible: feasibleOf(track, probeResult),
        objective: objectiveOf(track, probeResult)
      };
    });
    const probeFeasibleShare = probes.length ? probes.filter((probe) => probe.feasible).length / probes.length : 0;
    const probeMedian = median(probes.map((probe) => probe.objective));
    const foldsPositive = foldValues.filter((value) => value > 0).length;
    const withoutBestRegime = objective[principal]! - Math.max(0, ...regimeValues);
    const r = {
      R1: objective[0]! > 0 && objective[2]! > 0 && objective[10]! > 0,
      R2: foldsPositive >= original.selection.minFoldsPositive,
      R3: withoutBestRegime > 0,
      R4:
        probeFeasibleShare >= original.selection.plateauFeasibleShare &&
        probeMedian > 0 &&
        probeMedian >= original.selection.plateauMedianShare * objective[principal]!,
      R5: track === 'S' || result.pool.netPerDrawdown >= original.selection.riskEfficiencyShare * baseNetPerDrawdown
    };

    return {
      id: item.id,
      origin: item.origin,
      grid: item.grid,
      short: describe(item.grid),
      objective,
      drawdown: drawdownOf(track, result),
      folds: foldValues,
      foldsPositive,
      withoutBestRegime,
      probes,
      probeFeasibleShare,
      probeMedian,
      netPerDrawdown: track === 'P' ? result.pool.netPerDrawdown : undefined,
      r,
      robust: r.R1 && r.R2 && r.R3 && r.R4 && r.R5
    };
  };
  const checks = feasible.slice(0, original.selection.shortlist).map(check);
  let selected = checks.find((row) => row.robust);
  let shortlist: number = original.selection.shortlist;

  if (!selected) {
    shortlist = original.selection.extendedShortlist;
    checks.push(...feasible.slice(original.selection.shortlist, original.selection.extendedShortlist).map(check));
    selected = checks.find((row) => row.robust);
  }

  return { feasibleCount: feasible.length, shortlist, checks, selected, baseNetPerDrawdown };
};

// §6.1 Stage C gates T1–T3 (T4/T5 are the 20% portfolio's and do not apply; PROTOCOL.md §6.2).
export const stageCGates = (t1: Track1Evaluator, grid: Grid) => {
  const results = Object.fromEntries(costs.map((costBps) => [costBps, t1.evaluate(grid, costBps)]));
  const at5 = results[principal]!.pool;
  const baseRun = t1.baseRun(principal);
  const baseNetPerDrawdown = baseRun.net / baseRun.minuteDrawdown.maximum;
  const { gates } = original;
  const gate = {
    T1: at5.delta >= gates.fixedMateriality && [0, 2, 10].every((costBps) => results[costBps]!.pool.delta > 0),
    T2: at5.dd <= original.drawdownCeiling && at5.netPerDrawdown >= gates.netPerDrawdownShare * baseNetPerDrawdown,
    T3:
      at5.lots >= gates.minLots &&
      at5.lotYears >= gates.minYears &&
      at5.folds.filter((value) => value > 0).length >= gates.minFoldsPositive &&
      at5.delta - Math.max(0, ...at5.regimes) > 0
  };

  return { results, gate, nominated: gate.T1 && gate.T2 && gate.T3, baseNet: baseRun.net, baseNetPerDrawdown };
};

// Stages A and B of the original method for one base and window: the common pool at four costs, then each track's
// NSGA-II and robust selection.
export const track1Core = async (t1: Track1Evaluator, label: string, started = Date.now()) => {
  // Stage A: the original 512 common-pool vectors and 7 controls, at 0/2/5/10 bps.
  const common = commonSobolPool();
  const pool = await poolFor('GDX', common.vectors);
  const stageA: VectorT1[] = pool.map((vector) => ({
    id: vector.id,
    grid: vector.grid,
    origin: vector.origin,
    results: Object.fromEntries(costs.map((costBps) => [costBps, t1.evaluate(vector.grid, costBps)]))
  }));

  log(`${label}: Stage A ${stageA.length} vectors × 4 costs in ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const tracks: Record<
    Track,
    { summary: SearchSummary; selection: ReturnType<typeof robustSelection>; evaluated: Map<string, VectorT1> }
  > = {} as never;

  for (const track of ['S', 'P'] as const) {
    const evaluated = new Map<string, VectorT1>();

    for (const item of stageA) {
      evaluated.set(item.id, { ...item, results: { ...item.results } });
    }

    const archive = new Map<string, Candidate<VectorT1>>();
    const initial = [...evaluated.values()].map((item) => scoreOf(track, item));

    for (const candidate of initial) {
      archive.set(candidate.id, candidate);
    }

    const { search } = original;
    const summary = runNsga2(
      {
        populationSize: search.populationSize,
        maxNewVectors: search.maxNewVectors,
        maxGenerations: search.maxGenerations,
        patience: search.earlyStopPatience,
        tolerance: search.earlyStopTolerance,
        seedDiversity: search.seedDiversity,
        variation: {
          crossoverProbability: search.crossoverProbability,
          crossoverEta: search.crossoverEta,
          mutationEta: search.mutationEta
        },
        reference: [0, original.drawdownCeiling],
        seed: deriveSeed('portfolio-aware-d1', 'GDX', track, 'nsga2'),
        space: operatorSpace,
        label: `ga:${track}`
      },
      initial,
      archive,
      (genome) => vectorId(gridOfGenome(genome)),
      (genome, id, origin) => {
        const grid = gridOfGenome(genome);
        const item: VectorT1 = { id, grid, origin, results: { [principal]: t1.evaluate(grid, principal) } };

        evaluated.set(id, item);

        return scoreOf(track, item);
      }
    );
    const selection = robustSelection(t1, track, evaluated);

    tracks[track] = { summary, selection, evaluated };
    log(
      `${label} ${track}: ${summary.newVectors} new, ${summary.generations} gens (${summary.stopReason}); feasible ${selection.feasibleCount}; selected ${selection.selected?.id ?? 'none'} ${selection.selected?.short ?? ''}`
    );
  }

  return { common, pool, stageA, tracks };
};

export const runTrack1 = async (fold: Fold) => {
  const started = Date.now();
  const door = await openDoor(fold === 'main' ? 'search' : 'search-wf20', ['VGT', 'KRE', 'GDX'], `Track 1 ${fold}`);
  const ev = new Evaluator(door);
  const foldList = fold === 'main' ? folds : (await import('./context.ts')).wfFolds;
  const regimeKeys = fold === 'main' ? devRegimeKeys : wfRegimeKeys;
  const regimeList = regimes.filter((regime) => regimeKeys.includes(regime.key));
  const base = { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE };
  const t1 = new Track1Evaluator(ev, base, 'GDX', foldList, regimeList);

  const { common, pool, stageA, tracks } = await track1Core(t1, `Track 1 ${fold}`, started);

  // Stage C: additions to C2; substitution diagnostic (VGT + the P-vector, two ETFs; main only).
  const configurations = (['P', 'S'] as const).flatMap((track) => {
    const selected = tracks[track].selection.selected;

    if (!selected) {
      return [];
    }

    const gates = stageCGates(t1, selected.grid);

    return [
      {
        key: `T1-${track}`,
        track,
        books: { ...base, GDX: selected.grid },
        vector: { id: selected.id, origin: selected.origin, grid: selected.grid, short: selected.short },
        ...gates,
        status: gates.nominated ? 'Track 1 nominated' : 'comparator'
      }
    ];
  });
  let substitution: unknown;
  const pVector = tracks.P.selection.selected;

  if (fold === 'main' && pVector) {
    const vgtOnly = new Track1Evaluator(ev, { VGT: frozenGrids.VGT }, 'GDX', foldList, regimeList);
    const replaced = vgtOnly.evaluate(pVector.grid, principal).pool;
    const addition = t1.evaluate(pVector.grid, principal).pool;

    substitution = {
      label: 'diagnostic only (two ETFs; never a candidate): VGT + GDX P-vector, i.e. GDX replacing KRE',
      net: replaced.net,
      dd: replaced.dd,
      deltaVsC2: replaced.net - t1.baseRun(principal).net,
      additionDelta: addition.delta,
      beatsAdditionBy5000:
        replaced.net - t1.baseRun(principal).net >= addition.delta + original.stageC.substitutionMargin
    };
  }

  const files = {
    stageA: await writeJsonl(resultFile('track1', fold, 'stageA.jsonl'), stageA),
    S: await writeJsonl(resultFile('track1', fold, 'track-S.jsonl'), [...tracks.S.evaluated.values()]),
    P: await writeJsonl(resultFile('track1', fold, 'track-P.jsonl'), [...tracks.P.evaluated.values()])
  };
  const baseAt = Object.fromEntries(
    costs.map((costBps) => {
      const run = t1.baseRun(costBps);

      return [costBps, { net: run.net, dd: run.minuteDrawdown.maximum, lots: run.lots.length }];
    })
  );
  const topOf = (track: Track) =>
    [...tracks[track].evaluated.values()]
      .filter((item) => feasibleOf(track, item.results[principal]!))
      .sort(byObjective(track))
      .slice(0, 5)
      .map((item) => ({ id: item.id, origin: item.origin, short: describe(item.grid), ...item.results[principal] }));
  const record = await writeSealed(resultFile('track1', fold, 'track1.json'), {
    stage: `track1-${fold}`,
    at: nowIso(),
    door: door.key,
    window: { first: door.dates[0], last: door.dates[door.lastIndex], eligibility: door.dates[door.eligibilityIndex] },
    base: { books: base, at: baseAt },
    commonPool: { seed: common.seed, drawn: common.drawn, duplicates: common.duplicates, vectors: pool.length },
    folds: foldList,
    regimes: regimeList,
    settings: {
      search: original.search,
      selection: original.selection,
      gates: original.gates,
      feasibility: original.feasibility
    },
    tracks: Object.fromEntries(
      (['S', 'P'] as const).map((track) => [
        track,
        {
          summary: tracks[track].summary,
          feasibleCount: tracks[track].selection.feasibleCount,
          shortlist: tracks[track].selection.shortlist,
          checks: tracks[track].selection.checks,
          selected: tracks[track].selection.selected ?? null,
          top5: topOf(track)
        }
      ])
    ),
    configurations,
    substitution,
    files,
    drawdownCeiling: execution.drawdownCeiling,
    traces: ev.traces,
    replays: ev.replays,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `Track 1 ${fold}: ${configurations.map((c) => `${c.key} ${c.status}`).join('; ')}; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );

  return record;
};

// WF20 evidence about the method (PROTOCOL.md §3.2; reporting only): the Track 1 configurations chosen on
// 2017-06-15 → 2019-12-31, evaluated on 2020-01-02 → 2021-12-31 of the continuous run (search door), with C3 and C2.
export const runTrack1Wf20Test = async () => {
  const record = (await import('./records.ts')).readSealed<{
    configurations: { key: string; books: Books; status: string }[];
  }>;
  const wf = await record(resultFile('track1', 'wf20', 'track1.json'));
  const door = await openDoor('search', ['VGT', 'KRE', 'GDX'], 'Track 1 WF20 test window (reporting)');
  const ev = new Evaluator(door);
  const rows = [
    ...wf.configurations.map((configuration) => ({
      key: `WF20-${configuration.key}`,
      books: configuration.books,
      status: configuration.status
    })),
    {
      key: 'C3',
      books: { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE, GDX: frozenGrids.GDX },
      status: 'control (in-sample)'
    },
    { key: 'C2', books: { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE }, status: 'control' }
  ].map((row) => {
    const m = ev.metrics(row.books);

    return {
      ...row,
      search: m.periods['WF20-SEARCH'],
      test: m.periods['WF20-TEST'],
      dd: m.minuteDrawdown,
      lots: m.lots,
      bySymbol: m.bySymbol
    };
  });
  const out = await writeSealed(resultFile('track1', 'wf20', 'test.json'), {
    stage: 'track1-wf20-test',
    at: nowIso(),
    door: door.key,
    note: 'reporting only; the test window 2020-01-02 → 2021-12-31 lies inside the main development window',
    rows
  });

  log(
    `Track 1 WF20 test: ${rows.map((row) => `${row.key} search ${Math.round(row.search ?? NaN)} test ${Math.round(row.test ?? NaN)} dd ${Math.round(row.dd)}`).join('; ')}; ${out.file}`
  );
};
