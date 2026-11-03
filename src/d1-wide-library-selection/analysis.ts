// The analysis (PROTOCOL.md §9): every method-level metric, every paired comparison with the baseline, the
// predeclared verdicts and the study-level outcome, computed only from sealed records (selections, nested selections,
// evaluations). Deterministic; written once to results/analysis/ANALYSIS.json. Bound by the code freeze before any
// evaluation, so no rule is chosen after a result. Figures of a vector are only ever taken from the phase of its own
// fold and provenance (no cross-provenance attribution; no T1 result for ARCH or ALL).
import fs from 'fs-extra';
import { Rng } from '../optimizer/rng.ts';
import {
  type FoldKey,
  type PoolKey,
  broadArms,
  clusterOf,
  decision,
  folds,
  libraryKs,
  log,
  nowIso,
  primaryK,
  resultFile,
  rules,
  study,
  triples,
  verdictPools
} from './context.ts';
import { requireChronology } from './chronology.ts';
import { nestedSelectionFile } from './doors.ts';
import { type PhaseKey, evaluationFile, phaseOf, readEngineRows, readFastRows } from './evaluation.ts';
import { readStageRecord, requireCodeFrozen } from './freeze.ts';
import { readSealed, writeRecord } from './records.ts';
import { readMembers, readSelection } from './selection.ts';
import { mean, median, quantile, spearman, sum } from './stats.ts';

export const analysisFile = resultFile('analysis', 'ANALYSIS.json');

export type Arm = 'A0' | 'A0r' | 'A1' | 'A1n' | 'A2' | 'A3' | 'A4';

export interface Cell {
  key: string; // A, B, S18, S19, S20, S21, S22, T1-later, T2-later
  phase: PhaseKey;
  window: number; // index into the phase's windows
  fold: FoldKey;
  start: string;
  end: string;
  pools: readonly PoolKey[];
  nested?: 'T1' | 'T2';
}

export const cells: Cell[] = [
  { key: 'A', phase: 'A', window: 0, fold: 'A', start: '2020-06-30', end: '2021-12-31', pools: folds.A.pools },
  { key: 'B', phase: 'B', window: 0, fold: 'B', start: '2021-12-31', end: '2023-12-29', pools: folds.B.pools },
  { key: 'S18', phase: 'S18', window: 0, fold: 'S18', start: '2018-12-31', end: '2019-12-31', pools: ['NEW'] },
  { key: 'S19', phase: 'S19', window: 0, fold: 'S19', start: '2019-12-31', end: '2020-12-31', pools: ['NEW'] },
  { key: 'S20', phase: 'S20', window: 0, fold: 'S20', start: '2020-12-31', end: '2021-12-31', pools: ['NEW'] },
  { key: 'S21', phase: 'B-sel', window: 0, fold: 'B', start: '2021-12-31', end: '2022-12-30', pools: ['NEW'] },
  { key: 'S22', phase: 'S22', window: 0, fold: 'S22', start: '2022-12-30', end: '2023-12-29', pools: ['NEW'] },
  {
    key: 'T1-later',
    phase: 'T1-later',
    window: 1,
    fold: 'A',
    start: '2021-12-31',
    end: '2023-12-29',
    pools: triples.T1.pools,
    nested: 'T1'
  },
  {
    key: 'T2-later',
    phase: 'B',
    window: 1,
    fold: 'B',
    start: '2022-12-30',
    end: '2023-12-29',
    pools: triples.T2.pools,
    nested: 'T2'
  }
];

type FastRows = Awaited<ReturnType<typeof readFastRows>>;
type Selection = Awaited<ReturnType<typeof readSelection>>;
type Nested = {
  picks: Record<
    string,
    Record<string, Record<string, { key: string; vSel: number; lotsSel: number; thinEvidence: boolean } | null>>
  >;
};

export interface Nomination {
  symbol: string;
  key: string | null;
  score: number;
}

// The nominee of every ETF for (pool, arm, K) (null key: no nominee).
const nominationsOf = (
  selection: Selection,
  nested: Nested | undefined,
  pool: PoolKey,
  arm: Arm,
  k: number
): Nomination[] =>
  Object.entries(selection.selections[pool]!)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([symbol, s]) => {
      if (arm === 'A0') {
        return { symbol, key: s.a0?.nominee ?? null, score: s.a0?.nominee ? s.a0.score : NaN };
      }

      if (arm === 'A0r') {
        return { symbol, key: s.a0r.nominee?.key ?? null, score: s.a0r.nominee?.score ?? NaN };
      }

      if (arm === 'A4') {
        const pick = nested?.picks[pool]?.[symbol]?.[String(k)] ?? null;

        return { symbol, key: pick?.key ?? null, score: pick?.vSel ?? NaN };
      }

      const nominee = s.arms[arm].nominees[String(k)] ?? null;

      return { symbol, key: nominee?.key ?? null, score: nominee?.score ?? NaN };
    });

// The baseline of a pool (PROTOCOL.md §7, §9.2): the sealed A0 on ARCH (identical to A0r wherever reproduced), A0r on
// every other pool.
const baselineArm = (pool: PoolKey): Arm => (pool === 'ARCH' ? 'A0' : 'A0r');

const windowOf = (fast: FastRows, symbol: string, key: string | null, cost: number, w: number) => {
  if (!key) {
    return { v: 0, minuteDd: 0, dailyDd: 0, lots: 0 };
  }

  const row = fast.get(`${symbol}|${key}`)?.[String(cost)];

  if (!row) {
    throw new Error(`${symbol} ${key}: no fast figure at ${cost} bps`);
  }

  return row.windows[w]!;
};

export interface Comparison {
  evaluable: boolean;
  insufficientReasons: string[];
  activeArm: number;
  activeBase: number;
  meanD5: number;
  meanD10: number;
  sumD5: number;
  sumD10: number;
  wins: number;
  losses: number;
  identical: number;
  clusterWins: number;
  clusterLosses: number;
  breachesArm: number;
  breachesBase: number;
  favourable: boolean;
  unfavourable: boolean;
  riskIncompatible: boolean;
  byCluster: Record<string, number>;
  split: Record<
    'identical' | 'bothDiffer' | 'onlyArm' | 'onlyBase',
    { n: number; wins: number; losses: number; sumD5: number }
  >;
  meanD5WithoutLargestCluster: number;
  nominationRate: { arm: number; base: number };
}

// The paired comparison (PROTOCOL.md §9.2). windowFamilies = eligible catalog families with a trough in the window.
export const compare = (
  arm: readonly Nomination[],
  base: readonly Nomination[],
  value: (n: Nomination, cost: number) => { v: number; minuteDd: number },
  windowFamilies = Infinity
): Comparison => {
  const d5: number[] = [];
  const d10: number[] = [];
  const byCluster: Record<string, number> = {};
  const split: Comparison['split'] = {
    identical: { n: 0, wins: 0, losses: 0, sumD5: 0 },
    bothDiffer: { n: 0, wins: 0, losses: 0, sumD5: 0 },
    onlyArm: { n: 0, wins: 0, losses: 0, sumD5: 0 },
    onlyBase: { n: 0, wins: 0, losses: 0, sumD5: 0 }
  };
  let identical = 0;
  let activeArm = 0;
  let activeBase = 0;
  let breachesArm = 0;
  let breachesBase = 0;

  arm.forEach((a, index) => {
    const b = base[index]!;

    if (a.symbol !== b.symbol) {
      throw new Error('misaligned comparison');
    }

    const a5 = value(a, 5);
    const b5 = value(b, 5);
    const delta5 = a5.v - b5.v;
    const delta10 = value(a, 10).v - value(b, 10).v;
    const part = a.key === b.key ? 'identical' : a.key && b.key ? 'bothDiffer' : a.key ? 'onlyArm' : 'onlyBase';

    d5.push(delta5);
    d10.push(delta10);
    byCluster[clusterOf(a.symbol)] = (byCluster[clusterOf(a.symbol)] ?? 0) + delta5;
    identical += a.key === b.key ? 1 : 0; // both-none included
    activeArm += a5.v !== 0 ? 1 : 0;
    activeBase += b5.v !== 0 ? 1 : 0;
    breachesArm += a5.minuteDd > study.ddCeiling ? 1 : 0;
    breachesBase += b5.minuteDd > study.ddCeiling ? 1 : 0;
    split[part].n++;
    split[part].wins += delta5 > 0 ? 1 : 0;
    split[part].losses += delta5 < 0 ? 1 : 0;
    split[part].sumD5 += delta5;
  });

  const wins = d5.filter((d) => d > 0).length;
  const losses = d5.filter((d) => d < 0).length;
  const clusterWins = Object.values(byCluster).filter((d) => d > 0).length;
  const clusterLosses = Object.values(byCluster).filter((d) => d < 0).length;
  const insufficientReasons = [
    ...(wins + losses < decision.minDiffering ? [`W + L = ${wins + losses} < ${decision.minDiffering}`] : []),
    ...(clusterWins + clusterLosses < decision.minClusterDiffering
      ? [`CW + CL = ${clusterWins + clusterLosses} < ${decision.minClusterDiffering}`]
      : []),
    ...(activeArm < decision.minActive ? [`arm active ETFs ${activeArm} < ${decision.minActive}`] : []),
    ...(activeBase < decision.minActive ? [`baseline active ETFs ${activeBase} < ${decision.minActive}`] : []),
    ...(windowFamilies < decision.minWindowFamilies
      ? [`window catalog families ${windowFamilies} < ${decision.minWindowFamilies}`]
      : [])
  ];
  const evaluable = insufficientReasons.length === 0;
  const meanD5 = mean(d5);
  const meanD10 = mean(d10);
  const largestCluster = Object.entries(byCluster).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0]?.[0];

  return {
    evaluable,
    insufficientReasons,
    activeArm,
    activeBase,
    meanD5,
    meanD10,
    sumD5: sum(d5),
    sumD10: sum(d10),
    wins,
    losses,
    identical,
    clusterWins,
    clusterLosses,
    breachesArm,
    breachesBase,
    favourable:
      evaluable &&
      meanD5 > 0 &&
      meanD10 > 0 &&
      wins > losses &&
      clusterWins > clusterLosses &&
      breachesArm <= breachesBase + decision.breachTolerance,
    unfavourable: evaluable && meanD5 < 0 && wins < losses,
    riskIncompatible: breachesArm >= breachesBase + decision.riskIncompatible,
    byCluster,
    split,
    meanD5WithoutLargestCluster: mean(d5.filter((_, i) => clusterOf(arm[i]!.symbol) !== largestCluster)),
    nominationRate: {
      arm: arm.filter((n) => n.key).length / arm.length,
      base: base.filter((n) => n.key).length / base.length
    }
  };
};

export type Verdict =
  | 'improves generalization'
  | 'demonstrably worse or risk-incompatible'
  | 'no evidence of improvement'
  | 'insufficient evidence'
  | 'mixed / inconclusive';

// PROTOCOL.md §9.3 over two windows and the four K values: improves = favourable in both windows at K = 8 and K = 16
// and at K = 32 or 64, never risk-incompatible; worse = (unfavourable likewise) or risk-incompatible at K = 16;
// insufficient = an insufficient K = 16 cell in either window; no evidence = favourable in neither window at K = 16.
export const verdictOf = (
  byWindowK: Record<string, Record<string, Comparison>>,
  windows: readonly string[]
): Verdict => {
  const at = (w: string, k: number) => byWindowK[w]![String(k)]!;
  const all = (k: number, field: 'favourable' | 'unfavourable') => windows.every((w) => at(w, k)[field]);
  const pattern = (field: 'favourable' | 'unfavourable') =>
    decision.requiredKs.every((k) => all(k, field)) && decision.oneOfKs.some((k) => all(k, field));
  const riskAnyK = windows.some((w) => libraryKs.some((k) => at(w, k).riskIncompatible));
  const riskPrimary = windows.some((w) => at(w, primaryK).riskIncompatible);

  if (pattern('favourable') && !riskAnyK) {
    return 'improves generalization';
  }

  if (pattern('unfavourable') || riskPrimary) {
    return 'demonstrably worse or risk-incompatible';
  }

  if (windows.some((w) => !at(w, primaryK).evaluable)) {
    return 'insufficient evidence';
  }

  if (windows.every((w) => !at(w, primaryK).favourable)) {
    return 'no evidence of improvement';
  }

  return 'mixed / inconclusive';
};

// The study-level outcome (PROTOCOL.md §9.4): exactly one of four.
export const studyOutcome = (
  verdicts: Record<string, Record<string, Verdict>>,
  rolling: Record<string, Record<string, string>>,
  favourableBothFolds: (pool: string, arm: 'A1' | 'A2' | 'A3') => boolean
) => {
  const worse: Verdict = 'demonstrably worse or risk-incompatible';
  const rollingFavourable = (arm: string) =>
    Object.values(rolling).filter((byArm) => byArm[arm] === 'favourable').length;
  const improvedOnArch = broadArms.filter(
    (arm) =>
      verdicts.ARCH?.[arm] === 'improves generalization' &&
      verdicts.NEW?.[arm] !== worse &&
      verdicts.ALL?.[arm] !== worse &&
      rollingFavourable(arm) >= decision.rollingMajority
  );
  const allWorseOnArch = broadArms.every((arm) => verdicts.ARCH?.[arm] === worse);
  const anyFavourableBothFolds = Object.keys(verdicts).some((pool) =>
    broadArms.some((arm) => favourableBothFolds(pool, arm))
  );
  const improvesElsewhere = Object.entries(verdicts).some(
    ([pool, byArm]) => pool !== 'ARCH' && Object.values(byArm).includes('improves generalization')
  );
  const insufficientOnArch = broadArms.some((arm) => verdicts.ARCH?.[arm] === 'insufficient evidence');
  const outcome =
    improvedOnArch.length > 0
      ? 'evidence for an improved selection procedure'
      : allWorseOnArch
        ? 'new procedure is materially worse'
        : anyFavourableBothFolds || improvesElsewhere || insufficientOnArch
          ? 'mixed / inconclusive'
          : 'no demonstrated improvement';

  return { outcome, improvedOnArch: [...improvedOnArch] };
};

// A nested cell (§9.3; rules in this order, the first that holds applies): favourable iff A4 is favourable against both
// A2(K) and the baseline at K = 8 and K = 16 and (at K = 32 or at K = 64); worse iff unfavourable against both
// likewise; insufficient evidence iff either K = 16 comparison is insufficient; no evidence of an advantage iff
// neither K = 16 comparison is favourable; otherwise mixed / inconclusive.
export const nestedCellVerdict = (vsA2: Record<string, Comparison>, vsBase: Record<string, Comparison>) => {
  const both = (k: number, field: 'favourable' | 'unfavourable') =>
    vsA2[String(k)]![field] && vsBase[String(k)]![field];
  const pattern = (field: 'favourable' | 'unfavourable') =>
    decision.requiredKs.every((k) => both(k, field)) && decision.oneOfKs.some((k) => both(k, field));

  return pattern('favourable')
    ? 'favourable'
    : pattern('unfavourable')
      ? 'worse'
      : !vsA2[String(primaryK)]!.evaluable || !vsBase[String(primaryK)]!.evaluable
        ? 'insufficient evidence'
        : !vsA2[String(primaryK)]!.favourable && !vsBase[String(primaryK)]!.favourable
          ? 'no evidence of an advantage'
          : 'mixed / inconclusive';
};

// The nested verdict (beside the §9.4 outcome): the primary cell T1/NEW decides; T1/NEW-S must not be worse.
export const nestedStudyVerdict = (t1New: string, t1NewS: string) =>
  t1New === 'favourable'
    ? t1NewS !== 'worse'
      ? 'validation selection retains an advantage'
      : 'mixed / inconclusive'
    : t1New === 'worse'
      ? 'validation selection is worse'
      : t1New;

const describe = (values: readonly number[]) => ({
  n: values.length,
  sum: sum(values),
  mean: mean(values),
  median: median(values),
  p10: quantile(values, 0.1),
  p25: quantile(values, 0.25),
  p75: quantile(values, 0.75),
  p90: quantile(values, 0.9)
});

const daysBetween = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000;

type EngineRow = {
  symbol: string;
  key: string;
  lots: {
    id: number;
    setup: string;
    entryDate: string;
    exitDate: string;
    exitIndex: number;
    net: number;
    maePercent: number;
    mfePercent: number;
    heldDays: number;
    occupiedDays: number;
    interest: number;
    friction: number;
    exitReason: string;
  }[];
  capture?: {
    captures: {
      episode: string;
      family: string;
      outcome: string;
      dipCaptured: boolean;
      continuationEntries: number;
      declineEntries: number;
      dipEntries: number;
      entries: number;
      net: number;
      firstEntryOffset: number | null;
      firstEntryDepth: number | null;
      lots: number[];
    }[];
    majorFamilies: string[];
  };
  captureDraws?:
    | {
        v: number;
        dipCapturedFamilies: string[];
        episodeNets: Record<string, number>;
        firstEntryDepth: Record<string, number>;
      }[]
    | null;
  portfolio?: { windows: { equityStart: number; equityEnd: number; maxDailyPercentDrawdown: number }[] };
};

type Catalogs = Record<
  string,
  {
    episodes: { family: string; major: boolean; troughIndex: number }[];
    families: { id: string; major: boolean; eligible: boolean }[];
  }
>;

export const runAnalysis = async () => {
  const guard = await requireCodeFrozen();

  await requireChronology();

  if (await fs.pathExists(analysisFile)) {
    throw new Error(`${analysisFile} exists: the analysis is written once`);
  }

  const startedAt = nowIso();
  const selections = new Map<FoldKey, Selection>();
  const nesteds = new Map<string, Nested>();
  const fasts = new Map<PhaseKey, FastRows>();
  const engines = new Map<PhaseKey, Map<string, EngineRow>>();
  const evaluations = new Map<PhaseKey, { bodyHash: string; catalogs: Record<string, Catalogs> }>();

  for (const cell of cells) {
    if (!selections.has(cell.fold)) {
      selections.set(cell.fold, await readSelection(cell.fold));
    }

    if (!fasts.has(cell.phase)) {
      fasts.set(cell.phase, await readFastRows(cell.phase));
      engines.set(
        cell.phase,
        new Map(
          (await readEngineRows(cell.phase)).map((row) => [`${row.symbol}|${row.key}`, row as unknown as EngineRow])
        )
      );
      evaluations.set(cell.phase, (await readStageRecord(evaluationFile(cell.phase))) as never);
    }

    if (cell.nested && !nesteds.has(cell.nested)) {
      nesteds.set(cell.nested, (await readStageRecord(nestedSelectionFile(cell.nested))) as never);
    }
  }

  const armsOf = (cell: Cell, pool: PoolKey): Arm[] => [
    ...(pool === 'ARCH' ? (['A0'] as Arm[]) : []),
    'A0r',
    'A1',
    'A1n',
    'A2',
    'A3',
    ...(cell.nested ? (['A4'] as Arm[]) : [])
  ];
  const metrics: Record<string, unknown>[] = [];
  const comparisons: Record<string, Record<string, Record<string, Record<string, Comparison>>>> = {}; // cell → pool → arm → K
  const ablations: Record<string, Record<string, Record<string, Record<string, Comparison>>>> = {}; // descriptive only
  const across: Record<
    string,
    Record<
      string,
      Record<string, Record<string, { arm5: number; arm10: number; base5: number; base10: number; members: string[] }>>
    >
  > = {};
  const subsets: Record<string, unknown> = {};
  const discardedGroups: Record<string, unknown> = {};

  for (const cell of cells) {
    const selection = selections.get(cell.fold)!;
    const fast = fasts.get(cell.phase)!;
    const engine = engines.get(cell.phase)!;
    const catalogs = evaluations.get(cell.phase)!.catalogs[cell.start]!;
    const nested = cell.nested ? nesteds.get(cell.nested) : undefined;
    const value = (n: Nomination, cost: number) => windowOf(fast, n.symbol, n.key, cost, cell.window);
    // the phase's window catalog describes this cell's window (the event-count floor); event attribution also needs
    // the phase's full-engine nominee rows (B-sel has none: S21's events are not computed)
    // every window has its own price-only catalog (the event-count floor); event attribution needs the phase's
    // capture window and its full-engine nominee rows (B-sel has none: S21's events are not computed)
    const captureMatches = phaseOf(cell.phase).captureStart === cell.start && phaseOf(cell.phase).engine;
    const windowFamilies = sum(Object.values(catalogs).map((c) => c.families.filter((f) => f.eligible).length));

    comparisons[cell.key] = {};
    ablations[cell.key] = {};
    across[cell.key] = {};

    for (const pool of cell.pools) {
      const members = await readMembers(cell.fold, pool);
      const baseArm = baselineArm(pool);
      const base = nominationsOf(selection, undefined, pool, baseArm, primaryK);
      const top5 = (noms: readonly Nomination[]) =>
        [...noms.filter((n) => n.key)]
          .sort((a, b) => b.score - a.score || (a.symbol < b.symbol ? -1 : 1))
          .slice(0, rules.acrossN);
      const across5 = (arm: readonly Nomination[], baseline: readonly Nomination[]) => {
        const top = top5(arm);
        const baseTop = top5(baseline);

        return {
          arm5: sum(top.map((n) => value(n, 5).v)),
          arm10: sum(top.map((n) => value(n, 10).v)),
          base5: sum(baseTop.map((n) => value(n, 5).v)),
          base10: sum(baseTop.map((n) => value(n, 10).v)),
          members: top.map((n) => n.symbol)
        };
      };

      comparisons[cell.key]![pool] = {};
      ablations[cell.key]![pool] = {};
      across[cell.key]![pool] = {};

      for (const arm of armsOf(cell, pool)) {
        const ks = arm === 'A0' || arm === 'A0r' ? ['-'] : libraryKs.map(String);

        for (const kText of ks) {
          const k = kText === '-' ? primaryK : Number(kText);
          const noms = nominationsOf(selection, nested, pool, arm, k);
          const values5 = noms.map((n) => value(n, 5));
          const rowsOf = noms
            .flatMap((n) => (n.key ? [engine.get(`${n.symbol}|${n.key}`)] : []))
            .filter(Boolean) as EngineRow[];
          const lots = rowsOf.flatMap((row) =>
            row.lots.filter((lot) => lot.entryDate > cell.start && lot.entryDate <= cell.end)
          );
          const windowLotDays = rowsOf.reduce(
            (total, row) =>
              total +
              row.lots.reduce((t, lot) => {
                const from = lot.entryDate > cell.start ? lot.entryDate : cell.start;
                const to = lot.exitDate < cell.end ? lot.exitDate : cell.end;

                return t + (to >= from && lot.exitDate > cell.start ? Math.max(1, daysBetween(from, to)) : 0);
              }, 0),
            0
          );
          const sortedLots = lots.map((lot) => lot.net).sort((a, b) => a - b);
          const positive = lots
            .map((lot) => lot.net)
            .filter((x) => x > 0)
            .sort((a, b) => b - a);
          const totalPositive = sum(positive);
          const captureRows = noms.map((n) => (n.key ? engine.get(`${n.symbol}|${n.key}`) : undefined));
          const events = captureMatches
            ? (() => {
                const perEtf = noms.map((n, i) => {
                  const families = (catalogs[n.symbol]?.families ?? []).filter((f) => f.eligible);
                  const captures = captureRows[i]?.capture?.captures ?? [];
                  const captured = new Set(captures.filter((c) => c.dipCaptured).map((c) => c.family));
                  const entered = new Set(captures.filter((c) => c.entries > 0).map((c) => c.family));

                  return {
                    families: families.length,
                    majorFamilies: families.filter((f) => f.major).length,
                    captured: families.filter((f) => captured.has(f.id)).length,
                    majorCaptured: families.filter((f) => f.major && captured.has(f.id)).length,
                    majorMissed: n.key ? families.filter((f) => f.major && !entered.has(f.id)).length : 0,
                    fallingKnives: captures.filter((c) => c.declineEntries > 0 && c.net <= 0).length,
                    continuationHigh: captures.filter((c) => c.continuationEntries > 0 && c.dipEntries === 0).length,
                    firstEntryOffsets: captures.flatMap((c) =>
                      c.firstEntryOffset === null ? [] : [c.firstEntryOffset]
                    )
                  };
                });
                const nominated = perEtf.filter((_, i) => noms[i]!.key);
                const allFamilies = sum(perEtf.map((e) => e.families));
                const nomineeFamilies = sum(nominated.map((e) => e.families));

                return {
                  families: allFamilies,
                  majorFamilies: sum(perEtf.map((e) => e.majorFamilies)),
                  captured: sum(perEtf.map((e) => e.captured)),
                  majorCaptured: sum(perEtf.map((e) => e.majorCaptured)),
                  majorMissedByNominees: sum(perEtf.map((e) => e.majorMissed)),
                  captureShareAll61: allFamilies > 0 ? sum(perEtf.map((e) => e.captured)) / allFamilies : null,
                  captureShareNominees:
                    nomineeFamilies > 0 ? sum(nominated.map((e) => e.captured)) / nomineeFamilies : null,
                  fallingKnives: sum(perEtf.map((e) => e.fallingKnives)),
                  continuationHighInRebound: sum(perEtf.map((e) => e.continuationHigh)),
                  firstEntryOffsetFromTrough: describe(perEtf.flatMap((e) => e.firstEntryOffsets))
                };
              })()
            : null;
          // the nominees' largest window winners: parameter dependence over the 16 capture draws (diagnostic)
          const winners = captureMatches
            ? rowsOf.flatMap((row) => {
                const draws = row.captureDraws;
                const best = [...(row.capture?.captures ?? [])]
                  .filter((c) => c.net > 0)
                  .sort((a, b) => b.net - a.net)[0];

                if (!draws || !best) {
                  return [];
                }

                const depths = draws
                  .map((d) => d.firstEntryDepth[best.episode])
                  .filter((x): x is number => typeof x === 'number');

                return [
                  {
                    symbol: row.symbol,
                    episode: best.episode,
                    net: best.net,
                    sameFamilyCaptured:
                      draws.filter((d) => d.dipCapturedFamilies.includes(best.family)).length / draws.length,
                    retainedHalf:
                      draws.filter((d) => (d.episodeNets[best.episode] ?? 0) >= 0.5 * best.net).length / draws.length,
                    entryDepthSpread: depths.length > 1 ? quantile(depths, 0.9) - quantile(depths, 0.1) : null
                  }
                ];
              })
            : [];
          const portfolio = noms.flatMap((_, i) => {
            const w = captureRows[i]?.portfolio?.windows[cell.window];
            const cw = engine.get('C0|core')?.portfolio?.windows[cell.window];

            return w && cw
              ? [
                  {
                    increment: w.equityEnd - w.equityStart - (cw.equityEnd - cw.equityStart),
                    maxDaily: w.maxDailyPercentDrawdown
                  }
                ]
              : [];
          });
          const libraryKeys = (symbol: string, size: number) => {
            const s = selection.selections[pool]![symbol]!;

            return arm === 'A0'
              ? (s.a0?.library ?? [])
              : arm === 'A0r'
                ? s.a0r.library
                : arm === 'A4'
                  ? s.arms.A2.library.slice(0, size)
                  : s.arms[arm].library.slice(0, size);
          };
          const libraryV = noms.map((n) =>
            libraryKeys(n.symbol, k).map((key) => windowOf(fast, n.symbol, key, 5, cell.window).v)
          );
          const trainingVsWindow = noms.flatMap((n) =>
            libraryKeys(n.symbol, k).map((key) => ({
              training: members[n.symbol]![key]![arm === 'A2' || arm === 'A4' ? 't' : 'js'] as number,
              window: windowOf(fast, n.symbol, key, 5, cell.window).v
            }))
          );

          metrics.push({
            cell: cell.key,
            pool,
            arm,
            k: kText,
            nominees: noms.filter((n) => n.key).length,
            etfsWithWindowLots: values5.filter((w) => w.lots > 0).length,
            windowLots: sum(values5.map((w) => w.lots)),
            v: Object.fromEntries(
              study.costGrid.map((cost) => [String(cost), describe(noms.map((n) => value(n, cost).v))])
            ),
            breaches: values5.filter((w) => w.minuteDd > study.ddCeiling).length,
            minuteDd: describe(noms.filter((n) => n.key).map((n) => value(n, 5).minuteDd)),
            dailyDd: describe(noms.filter((n) => n.key).map((n) => value(n, 5).dailyDd)),
            lotsDistribution: lots.length
              ? {
                  n: lots.length,
                  wins: lots.filter((lot) => lot.net > 0).length,
                  losses: lots.filter((lot) => lot.net <= 0).length,
                  net: describe(lots.map((lot) => lot.net)),
                  mae: describe(lots.map((lot) => lot.maePercent)),
                  mfe: describe(lots.map((lot) => lot.mfePercent)),
                  heldDays: describe(lots.map((lot) => lot.heldDays)),
                  exitReasons: lots.reduce<Record<string, number>>(
                    (acc, lot) => ({ ...acc, [lot.exitReason]: (acc[lot.exitReason] ?? 0) + 1 }),
                    {}
                  )
                }
              : null,
            worstLot: sortedLots[0] ?? null,
            worstMae: lots.length ? Math.min(...lots.map((lot) => lot.maePercent)) : null,
            expectedShortfallProxy: sortedLots.length
              ? mean(sortedLots.slice(0, Math.max(1, Math.ceil(sortedLots.length * 0.1))))
              : null,
            interest: sum(lots.map((lot) => lot.interest)),
            friction: sum(lots.map((lot) => lot.friction)),
            windowLotDays,
            netPerMillionBorrowingDollarDays:
              windowLotDays > 0 ? (sum(values5.map((w) => w.v)) / (windowLotDays * study.principal)) * 1e6 : null,
            concentration: {
              top1: totalPositive > 0 ? sum(positive.slice(0, 1)) / totalPositive : null,
              top3: totalPositive > 0 ? sum(positive.slice(0, 3)) / totalPositive : null,
              top5: totalPositive > 0 ? sum(positive.slice(0, 5)) / totalPositive : null
            },
            events,
            winners: winners.length
              ? {
                  n: winners.length,
                  medianSameFamilyCaptured: median(winners.map((w) => w.sameFamilyCaptured)),
                  medianRetainedHalf: median(winners.map((w) => w.retainedHalf)),
                  narrowCoincidences: winners.filter((w) => w.retainedHalf < 0.25).length,
                  medianEntryDepthSpread: median(
                    winners.flatMap((w) => (w.entryDepthSpread === null ? [] : [w.entryDepthSpread]))
                  ),
                  list: winners
                }
              : null,
            portfolio: portfolio.length
              ? {
                  n: portfolio.length,
                  meanIncrementOverC0: mean(portfolio.map((p) => p.increment)),
                  medianMaxDaily: median(portfolio.map((p) => p.maxDaily)),
                  over30: portfolio.filter((p) => p.maxDaily > 0.3).length,
                  over35: portfolio.filter((p) => p.maxDaily > 0.35).length
                }
              : null,
            library: {
              realizedEtfs: noms.filter((n) => libraryKeys(n.symbol, k).length >= (kText === '-' ? 1 : k)).length,
              saturatedEtfs:
                kText === '-' || k === 8 ? null : noms.filter((n) => libraryKeys(n.symbol, k).length <= k / 2).length,
              meanSize: mean(noms.map((n) => libraryKeys(n.symbol, k).length)),
              randomPickMeanV: mean(libraryV.filter((list) => list.length > 0).map((list) => mean(list))),
              oracleBestMeanV_hindsight: mean(
                libraryV.filter((list) => list.length > 0).map((list) => Math.max(...list))
              ),
              spearmanTrainingVsWindow: spearman(
                trainingVsWindow.map((x) => x.training),
                trainingVsWindow.map((x) => x.window)
              )
            },
            ...(arm === 'A4'
              ? {
                  nested: (() => {
                    const picks = noms.filter((n) => n.key);
                    const records = picks.map((n) => nested!.picks[pool]![n.symbol]![String(k)]!);
                    const earlier = fasts.get(cell.nested === 'T1' ? 'A' : 'B-sel')!;
                    const correlations = Object.keys(selection.selections[pool]!).flatMap((symbol) => {
                      const keys = selection.selections[pool]![symbol]!.arms.A2.library.slice(0, k);
                      const pairs = keys.map((key) => ({
                        sel: earlier.get(`${symbol}|${key}`)?.['5']?.windows[0]?.v ?? NaN,
                        later: windowOf(fast, symbol, key, 5, cell.window).v
                      }));
                      const rho = spearman(
                        pairs.map((p) => p.sel),
                        pairs.map((p) => p.later)
                      );

                      return Number.isFinite(rho) ? [rho] : [];
                    });

                    return {
                      picks: picks.length,
                      meanSelectionV: mean(records.map((p) => p.vSel)),
                      meanLaterV: mean(picks.map((n) => value(n, 5).v)),
                      laterPositive: picks.filter((n) => value(n, 5).v > 0).length,
                      thinEvidence: records.filter((p) => p.thinEvidence).length,
                      medianSpearmanSelectionVsLater: median(correlations),
                      etfsWithCorrelation: correlations.length
                    };
                  })()
                }
              : {})
          });

          if (arm !== baseArm) {
            comparisons[cell.key]![pool]![arm] ??= {};
            comparisons[cell.key]![pool]![arm]![kText === '-' ? String(primaryK) : kText] = compare(
              noms,
              base,
              value,
              windowFamilies
            );
          }

          across[cell.key]![pool]![arm] ??= {};
          across[cell.key]![pool]![arm]![kText] = across5(noms, base);
        }
      }

      // descriptive ablations (never in a verdict): diversity at equal trials (A1 vs A1n) and the nested comparator
      // (A4 vs A2 on the same library, which the nested verdict uses)
      for (const k of libraryKs) {
        const a1 = nominationsOf(selection, undefined, pool, 'A1', k);
        const a1n = nominationsOf(selection, undefined, pool, 'A1n', k);

        (ablations[cell.key]![pool]!['A1-vs-A1n'] ??= {})[String(k)] = compare(a1, a1n, value, windowFamilies);

        if (cell.nested) {
          const a4 = nominationsOf(selection, nested, pool, 'A4', k);
          const a2 = nominationsOf(selection, undefined, pool, 'A2', k);

          (comparisons[cell.key]![pool]!['A4-vs-A2'] ??= {})[String(k)] = compare(a4, a2, value, windowFamilies);
          (across[cell.key]![pool]!['A4-vs-A2'] ??= {})[String(k)] = across5(a4, a2);
        }
      }

      // the budget-matched pools (descriptive): each arm on ARCH-S against the same arm on NEW-S
      if (pool === 'ARCH-S' && cell.pools.includes('NEW-S')) {
        for (const arm of ['A0r', 'A1', 'A2', 'A3'] as const) {
          for (const k of arm === 'A0r' ? [primaryK] : libraryKs) {
            (ablations[cell.key]![pool]![`${arm}-ARCH-S-vs-NEW-S`] ??= {})[String(k)] = compare(
              nominationsOf(selection, undefined, 'ARCH-S', arm, k),
              nominationsOf(selection, undefined, 'NEW-S', arm, k),
              value,
              windowFamilies
            );
          }
        }
      }

      // cross-pool complete procedures against the sealed A0 on ARCH (descriptive; budgets differ)
      if (pool !== 'ARCH' && cell.pools.includes('ARCH')) {
        const a0 = nominationsOf(selection, undefined, 'ARCH', 'A0', primaryK);

        for (const arm of ['A0r', 'A1', 'A2', 'A3'] as const) {
          for (const k of arm === 'A0r' ? [primaryK] : libraryKs) {
            (ablations[cell.key]![pool]![`${arm}-vs-ARCH-A0`] ??= {})[String(k)] = compare(
              nominationsOf(selection, undefined, pool, arm, k),
              a0,
              value,
              windowFamilies
            );
          }
        }
      }

      // sensitivity to the number of ETFs searched (descriptive): the across-ETF top 5 drawn from 50 seeded subsets
      // of 15 and of 30 ETFs (the same subsets for every arm and pool)
      if (!cell.nested) {
        const symbols = Object.keys(selection.selections[pool]!).sort();

        for (const size of [15, 30]) {
          const draws = Array.from({ length: 50 }, (_, d) => {
            const rng = Rng.from(study.seedLabel, 'etf-subsets', size, d);
            const shuffled = [...symbols];

            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = rng.int(i + 1);

              [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
            }

            return new Set(shuffled.slice(0, size));
          });

          for (const arm of broadArms) {
            const noms = nominationsOf(selection, undefined, pool, arm, primaryK);
            const deltas = draws.map((subset) => {
              const pick = (list: Nomination[]) =>
                sum(top5(list.filter((n) => subset.has(n.symbol))).map((n) => value(n, 5).v));

              return pick(noms) - pick(base);
            });

            subsets[`${cell.key}|${pool}|${arm}|${size}`] = {
              median: median(deltas),
              sharePositive: deltas.filter((d) => d > 0).length / deltas.length,
              p10: quantile(deltas, 0.1),
              p90: quantile(deltas, 0.9)
            };
          }
        }
      }

      // the discarded-group audit (ARCH, primary folds; descriptive): the sealed library vs the penalty-displaced
      // families vs the wide A1 library's other families
      if (pool === 'ARCH' && (cell.key === 'A' || cell.key === 'B')) {
        const groups: Record<string, number[]> = { sealedLibrary: [], penaltyDisplaced: [], wideOtherFamilies: [] };

        for (const [symbol, s] of Object.entries(selection.selections.ARCH!)) {
          const memberOf = (key: string) => members[symbol]![key]!;
          const sealed = s.a0?.library ?? [];
          const sealedFamilies = new Set(sealed.map((key) => memberOf(key).family));

          groups.sealedLibrary!.push(...sealed.map((key) => windowOf(fast, symbol, key, 5, cell.window).v));
          groups.penaltyDisplaced!.push(
            ...s.penaltyDisplaced.map((entry) => windowOf(fast, symbol, entry.key, 5, cell.window).v)
          );
          groups.wideOtherFamilies!.push(
            ...s.arms.A1.library
              .filter((key) => !sealedFamilies.has(memberOf(key).family))
              .map((key) => windowOf(fast, symbol, key, 5, cell.window).v)
          );
        }

        discardedGroups[cell.key] = Object.fromEntries(
          Object.entries(groups).map(([name, values]) => [
            name,
            { ...describe(values), positive: values.filter((v) => v > 0).length }
          ])
        );
      }
    }
  }

  // ----- verdicts -----
  const primaryWindows = ['A', 'B'];
  const verdicts: Record<string, Record<string, Verdict>> = {};
  const acrossVerdicts: Record<string, Record<string, string>> = {};
  const acrossVerdictOf = (at: (k: number) => { arm5: number; arm10: number; base5: number; base10: number }[]) => {
    const positive = (k: number) => at(k).every((x) => x.arm5 - x.base5 > 0 && x.arm10 - x.base10 > 0);
    const negative = (k: number) => at(k).every((x) => x.arm5 - x.base5 < 0);
    const pattern = (fn: (k: number) => boolean) => decision.requiredKs.every(fn) && decision.oneOfKs.some(fn);

    return pattern(positive) ? 'improves' : pattern(negative) ? 'worse' : 'mixed';
  };

  for (const pool of verdictPools) {
    verdicts[pool] = {};
    acrossVerdicts[pool] = {};

    for (const arm of broadArms) {
      verdicts[pool]![arm] = verdictOf(
        Object.fromEntries(primaryWindows.map((w) => [w, comparisons[w]![pool]![arm]!])),
        primaryWindows
      );
      acrossVerdicts[pool]![arm] = acrossVerdictOf((k) =>
        primaryWindows.map((w) => across[w]![pool]![arm]![String(k)]!)
      );
    }
  }

  // nested (PROTOCOL.md §9.3): T1/NEW is the primary cell; T1/NEW-S must not be worse; T2 is secondary
  const nestedCell = (cellKey: string, pool: string) =>
    nestedCellVerdict(comparisons[cellKey]![pool]!['A4-vs-A2']!, comparisons[cellKey]![pool]!.A4!);
  const nestedCells: Record<string, Record<string, string>> = {};

  for (const cell of cells.filter((c) => c.nested)) {
    nestedCells[cell.key] = Object.fromEntries(cell.pools.map((pool) => [pool, nestedCell(cell.key, pool)]));
  }

  const nestedVerdict = nestedStudyVerdict(nestedCells['T1-later']!.NEW!, nestedCells['T1-later']!['NEW-S']!);
  // nested across-ETF (§9.3): improves iff improves against both A2(K)'s and the baseline's top 5; worse iff worse
  // against both; else mixed
  const nestedAcross: Record<string, Record<string, string>> = {};

  for (const cell of cells.filter((c) => c.nested)) {
    nestedAcross[cell.key] = Object.fromEntries(
      cell.pools.map((pool) => {
        const vsA2 = acrossVerdictOf((k) => [across[cell.key]![pool]!['A4-vs-A2']![String(k)]!]);
        const vsBase = acrossVerdictOf((k) => [across[cell.key]![pool]!.A4![String(k)]!]);

        return [pool, vsA2 === vsBase && vsA2 !== 'mixed' ? vsA2 : 'mixed'];
      })
    );
  }

  const rolling: Record<string, Record<string, string>> = {};

  for (const year of ['S18', 'S19', 'S20', 'S21', 'S22']) {
    rolling[year] = {};

    for (const arm of broadArms) {
      const cmp = comparisons[year]!.NEW![arm]![String(primaryK)]!;

      rolling[year]![arm] = !cmp.evaluable
        ? 'insufficient evidence'
        : cmp.favourable
          ? 'favourable'
          : cmp.unfavourable
            ? 'unfavourable'
            : 'neither';
    }
  }

  const { outcome, improvedOnArch } = studyOutcome(verdicts, rolling, (pool, arm) =>
    primaryWindows.every((w) => comparisons[w]![pool]![arm]![String(primaryK)]!.favourable)
  );

  log(`analysis: outcome = ${outcome}; nested = ${nestedVerdict}`);

  return writeRecord(analysisFile, {
    stage: 'analysis',
    startedAt,
    finishedAt: nowIso(),
    guard,
    inputs: Object.fromEntries([...evaluations.entries()].map(([phase, record]) => [phase, record.bodyHash])),
    cells,
    metrics,
    comparisons,
    ablations,
    across,
    subsets,
    discardedGroups,
    verdicts,
    acrossVerdicts,
    nestedCells,
    nestedVerdict,
    nestedAcross,
    rolling,
    outcome,
    improvedOnArch,
    degreesOfFreedom: {
      primaryComparisons: verdictPools.length * broadArms.length * libraryKs.length * primaryWindows.length,
      nestedComparisons: cells.filter((c) => c.nested).reduce((t, c) => t + c.pools.length * libraryKs.length * 2, 0),
      rollingComparisons: 5 * broadArms.length,
      acrossEtf: verdictPools.length * broadArms.length * libraryKs.length * primaryWindows.length,
      verdictCells: verdictPools.length * broadArms.length
    }
  });
};
