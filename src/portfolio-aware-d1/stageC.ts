// Stage C (PROTOCOL.md §6): the predeclared configurations (S0, up to four additions, up to two substitutions, at
// most one two-ETF combination; at most eight), designed on training from the Stage B champions; every one run on the
// full N-book engine on training in both accounting modes at four costs, S0's matched-borrowing ladder, and the
// advancement gates T1–T5 (nominated or comparator). Training only.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type Track,
  baselineBooks,
  formatDollars,
  log,
  readJson,
  removableBooks,
  stageDir,
  study,
  writeJson
} from './context.ts';
import { trainingUniverse } from './data.ts';
import { type PeriodIndex, StudyEvaluator, periodIndices, yearPeriods } from './evaluate.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { type BookPhenotype, type NRunConfig, type NRunResult, baseNRunConfig, runNAllocator } from './nbook/engine.ts';
import type { LoadedUniverse } from './nbook/universe.ts';
import { replayAgainstFull } from './parity.ts';
import { type Grid, candidateBook, s0Books } from './phenotypes.ts';
import { readChampions } from './stageB.ts';
import { withoutBestRegime } from './tracks.ts';

const principal = study.principalCostBps;

export interface ConfigBook {
  symbol: string;
  phenotype: string; // 'primary'/'lowDd' for a frozen book, the candidate vector's ID otherwise
  grid?: Grid; // candidate books only
  track?: Track;
}

export interface Configuration {
  key: string;
  kind: 'baseline' | 'addition' | 'substitution' | 'combination';
  description: string;
  books: ConfigBook[];
  newSymbols: string[];
  removed?: string;
}

export const configurationPhenotypes = async (configuration: Configuration) => {
  const frozen = await s0Books();
  const phenotypes: Record<string, BookPhenotype> = {};

  for (const book of configuration.books) {
    phenotypes[book.symbol] = book.grid ? candidateBook(book.symbol, book.phenotype, book.grid) : frozen[book.symbol]!;
  }

  return phenotypes;
};

const s0Configuration = (): Configuration => ({
  key: 'S0',
  kind: 'baseline',
  description: 'All-lowDd shadow, unchanged (VGT primary, XBI/XRT/KRE lowDd)',
  books: [
    { symbol: 'VGT', phenotype: 'primary' },
    { symbol: 'XBI', phenotype: 'lowDd' },
    { symbol: 'XRT', phenotype: 'lowDd' },
    { symbol: 'KRE', phenotype: 'lowDd' }
  ],
  newSymbols: []
});

const frozenBooksExcept = (removed?: string): ConfigBook[] =>
  s0Configuration().books.filter((book) => book.symbol !== removed);

// ----- full-engine runs and their figures -----

export const runConfiguration = async (
  loaded: LoadedUniverse,
  configuration: Configuration,
  mode: 'fixed' | 'portfolio',
  costBps: number,
  fraction: number = study.stageC.fraction
): Promise<NRunResult> => {
  const phenotypes = await configurationPhenotypes(configuration);
  const symbols = configuration.books.map((book) => book.symbol);
  const config: NRunConfig = baseNRunConfig({
    key: `${configuration.key}-${mode}-${costBps}bps${fraction !== study.stageC.fraction ? `-f${fraction}` : ''}`,
    label: `${configuration.description}, ${mode}, ${costBps} bps`,
    mode,
    symbols,
    phenotypes,
    costBps,
    fraction,
    eligibilityIndex: loaded.universe.eligibilityIndex,
    accountingStartIndex: loaded.warmup
  });
  const members = mode === 'portfolio' ? ['VOOG', ...new Set(['VGT', ...symbols])] : symbols;
  const universe = {
    ...loaded.universe,
    instruments: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
  };

  return runNAllocator(universe, config);
};

const lotDays = (result: NRunResult, lot: NRunResult['lots'][number]) => {
  const { sTime } = Object.values(result.universe.instruments)[0]!.ds;

  return (sTime[lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex]! - lot.entryTimestamp) / 86400;
};

// The strategy mark (realized + unrealized) attributed to periods: the mark at a period's last close minus the mark
// at the close before it (0 before the first accounted session).
const attributeDaily = (result: NRunResult, periods: PeriodIndex[]) => {
  const byIndex = new Map(result.daily.map((row) => [row.index, row.strategyMark]));
  const mark = (index: number) => byIndex.get(index) ?? 0;

  return periods.map(({ first, last }) => mark(last) - mark(first - 1));
};

export const figuresOfRun = (
  result: NRunResult,
  newSymbols: readonly string[],
  periods: { folds: PeriodIndex[]; regimes: PeriodIndex[]; years: PeriodIndex[] }
) => {
  const isPortfolio = result.config.mode === 'portfolio';
  const last = result.daily.at(-1)!;
  const lots = result.lots;
  const newLots = lots.filter((lot) => newSymbols.includes(lot.symbol));
  const dates = Object.values(result.universe.instruments)[0]!.ds.dates;
  const bySymbol: Record<string, { lots: number; net: number }> = {};

  for (const lot of lots) {
    bySymbol[lot.symbol] ??= { lots: 0, net: 0 };
    bySymbol[lot.symbol]!.lots++;
    bySymbol[lot.symbol]!.net += lot.net;
  }

  return {
    mode: result.config.mode,
    costBps: result.config.costBps,
    fraction: result.config.fraction,
    lots: lots.length,
    virtualTrades: result.trades.length,
    refused: result.signals.filter((signal) => signal.outcome === 'refused').length,
    net: lots.reduce((total, lot) => total + lot.net, 0),
    interest: lots.reduce((total, lot) => total + lot.interest, 0),
    costs: lots.reduce(
      (total, lot) =>
        total +
        lot.shares * (lot.entryPrice - lot.entryRawPrice) +
        (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0),
      0
    ),
    worstLot: Math.min(0, ...lots.map((lot) => lot.net)),
    openAtEnd: lots.filter((lot) => lot.exitIndex < 0).length,
    newLots: newLots.length,
    newLotsNet: newLots.reduce((total, lot) => total + lot.net, 0),
    newLotYears: new Set(newLots.map((lot) => dates[lot.entryIndex]!.slice(0, 4))).size,
    bySymbol,
    borrowingDollarDays: lots.reduce((total, lot) => total + lot.originalPrincipal * lotDays(result, lot), 0),
    minuteDrawdown: result.minuteDrawdown.maximum,
    minuteDrawdownPeak: result.minuteDrawdown.peakTime,
    minuteDrawdownTrough: result.minuteDrawdown.troughTime,
    dailyDrawdown: result.dailyDrawdown.maximum,
    endEquity: isPortfolio ? last.equity : NaN,
    strategyMark: last.strategyMark,
    dailyPercent: result.dailyPercentDrawdown?.maximumPercent ?? NaN,
    dailyPercentPeak: result.dailyPercentDrawdown?.peakTime ?? NaN,
    dailyPercentTrough: result.dailyPercentDrawdown?.troughTime ?? NaN,
    minutePercent: result.minutePercentDrawdown?.maximumPercent ?? NaN,
    folds: attributeDaily(result, periods.folds),
    regimes: attributeDaily(result, periods.regimes),
    yearly: attributeDaily(result, periods.years),
    minimumRatio: isPortfolio
      ? Object.fromEntries(Object.entries(result.minimum).map(([key, value]) => [key, value?.ratio ?? NaN]))
      : {}
  };
};

export type RunFigures = ReturnType<typeof figuresOfRun>;

export const interpolate = (points: { x: number; y: number }[], x: number) => {
  const sorted = [...points].sort((p, q) => p.x - q.x);

  for (let i = 1; i < sorted.length; i++) {
    if (x <= sorted[i]!.x) {
      const left = sorted[i - 1]!;
      const right = sorted[i]!;

      return {
        value: left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x),
        extrapolated: x < sorted[0]!.x
      };
    }
  }

  const [left, right] = sorted.slice(-2) as [{ x: number; y: number }, { x: number; y: number }];

  return { value: left.y + ((right.y - left.y) * (x - left.x)) / (right.x - left.x), extrapolated: true };
};

// ----- the design -----

const holdingOverlap = (a: { entry: number; exit: number }[], b: { entry: number; exit: number }[]) => {
  let overlap = 0;

  for (const x of a) {
    for (const y of b) {
      overlap += Math.max(0, Math.min(x.exit, y.exit) - Math.max(x.entry, y.entry));
    }
  }

  return overlap / 86400;
};

export const designConfigurations = async (evaluator: StudyEvaluator) => {
  const { finalists, champions } = await readChampions();
  const vectors: { symbol: string; track: Track; id: string; grid: Grid; delta5: number }[] = [];

  for (const symbol of finalists) {
    for (const track of ['P', 'S'] as const) {
      const selected = champions[symbol]?.[track]?.selected;

      if (selected) {
        const result = evaluator.evaluateVector(symbol, selected.grid, principal);

        vectors.push({ symbol, track, id: selected.id, grid: selected.grid, delta5: result.pool.delta });
      }
    }
  }

  const pOf = (symbol: string) => vectors.find((vector) => vector.symbol === symbol && vector.track === 'P');
  const sOf = (symbol: string) => vectors.find((vector) => vector.symbol === symbol && vector.track === 'S');
  const ordered = [...finalists]
    .filter((symbol) => pOf(symbol) || sOf(symbol))
    .sort((a, b) => {
      const pa = pOf(a);
      const pb = pOf(b);

      if (pa && pb) {
        return pb.delta5 - pa.delta5;
      }

      if (pa || pb) {
        return pa ? -1 : 1;
      }

      return sOf(b)!.delta5 - sOf(a)!.delta5;
    });
  const configurations: Configuration[] = [s0Configuration()];
  const notes: string[] = [];

  // Additions.
  for (const symbol of ordered) {
    for (const track of ['P', 'S'] as const) {
      const vector = track === 'P' ? pOf(symbol) : sOf(symbol);

      if (
        configurations.filter((configuration) => configuration.kind === 'addition').length >= study.stageC.maxAdditions
      ) {
        break;
      }

      if (!vector) {
        notes.push(`${track}-add(${symbol}): no ${track}-vector`);
        continue;
      }

      if (track === 'S' && pOf(symbol)?.id === vector.id) {
        notes.push(`S-add(${symbol}): the S-vector equals the P-vector`);
        continue;
      }

      configurations.push({
        key: `${track}-add-${symbol}`,
        kind: 'addition',
        description: `All-lowDd + ${symbol} (${track}-vector ${vector.id})`,
        books: [...frozenBooksExcept(), { symbol, phenotype: vector.id, grid: vector.grid, track }],
        newSymbols: [symbol]
      });
    }
  }

  // Substitutions.
  const substitutionCandidates: {
    symbol: string;
    track: Track;
    removed: string;
    conflicts: { refusedBy: number; displaced: number };
    triggered: boolean;
    delta5?: number;
    additionDelta5: number;
    qualifies?: boolean;
  }[] = [];

  for (const symbol of ordered) {
    const vector = pOf(symbol) ?? sOf(symbol)!;
    const addition = evaluator.evaluateVector(symbol, vector.grid, principal);

    for (const removed of removableBooks) {
      const conflicts = addition.pool.conflicts[removed]!;
      const triggered = conflicts.refusedBy + conflicts.displaced >= study.stageC.substitutionMinConflicts;
      const row: (typeof substitutionCandidates)[number] = {
        symbol,
        track: vector.track,
        removed,
        conflicts,
        triggered,
        additionDelta5: addition.pool.delta
      };

      if (triggered) {
        const books = await configurationPhenotypes({
          key: 'x',
          kind: 'substitution',
          description: '',
          books: [...frozenBooksExcept(removed), { symbol, phenotype: vector.id, grid: vector.grid }],
          newSymbols: [symbol]
        });
        const { pool } = evaluator.evaluateConfiguration(
          [...frozenBooksExcept(removed).map((book) => book.symbol), symbol].map((bookSymbol) => ({
            symbol: bookSymbol,
            phenotype: books[bookSymbol]!
          })),
          principal
        );

        row.delta5 = pool.delta;
        row.qualifies = pool.delta >= addition.pool.delta + study.stageC.substitutionMargin;
      }

      substitutionCandidates.push(row);
    }
  }

  const substitutions = substitutionCandidates
    .filter((row) => row.qualifies)
    .sort((a, b) => b.delta5! - a.delta5!)
    .slice(0, study.stageC.maxSubstitutions);

  for (const row of substitutions) {
    const vector = row.track === 'P' ? pOf(row.symbol)! : sOf(row.symbol)!;

    configurations.push({
      key: `${row.track}-sub-${row.symbol}-for-${row.removed}`,
      kind: 'substitution',
      description: `VGT + the frozen books without ${row.removed} + ${row.symbol} (${row.track}-vector ${vector.id})`,
      books: [
        ...frozenBooksExcept(row.removed),
        { symbol: row.symbol, phenotype: vector.id, grid: vector.grid, track: row.track }
      ],
      newSymbols: [row.symbol],
      removed: row.removed
    });
  }

  // Combination.
  let combination: Record<string, unknown> = { considered: false, reason: 'fewer than two finalists with a P-vector' };
  const withP = ordered.filter((symbol) => pOf(symbol));

  if (withP.length >= 2) {
    const [a, b] = [pOf(withP[0]!)!, pOf(withP[1]!)!];
    const intervals = async (vector: typeof a) => {
      const books = await s0Books();
      const phenotype = candidateBook(vector.symbol, vector.id, vector.grid);
      const { result } = evaluator.evaluateConfiguration(
        [
          ...baselineBooks.map((symbol) => ({ symbol, phenotype: books[symbol]! })),
          { symbol: vector.symbol, phenotype }
        ],
        principal
      );
      const { sTime } = evaluator.ds('VGT');

      return result.lots
        .filter((lot) => lot.symbol === vector.symbol)
        .map((lot) => ({
          entry: sTime[lot.entryIndex]!,
          exit: lot.open ? sTime[evaluator.window.endIndex]! : sTime[lot.exitIndex]!
        }));
    };
    const ia = await intervals(a);
    const ib = await intervals(b);
    const held = (rows: { entry: number; exit: number }[]) =>
      rows.reduce((total, row) => total + (row.exit - row.entry) / 86400, 0);
    const overlapShare = holdingOverlap(ia, ib) / Math.max(1e-9, Math.min(held(ia), held(ib)));
    const books = await s0Books();
    const { pool } = evaluator.evaluateConfiguration(
      [
        ...baselineBooks.map((symbol) => ({ symbol, phenotype: books[symbol]! })),
        { symbol: a.symbol, phenotype: candidateBook(a.symbol, a.id, a.grid) },
        { symbol: b.symbol, phenotype: candidateBook(b.symbol, b.id, b.grid) }
      ],
      principal
    );
    const qualifies =
      a.delta5 > 0 &&
      b.delta5 > 0 &&
      overlapShare <= study.stageC.combinationMaxOverlap &&
      pool.delta >= Math.max(a.delta5, b.delta5) + study.stageC.combinationMargin;

    combination = {
      considered: true,
      pair: [a.symbol, b.symbol],
      singleDelta5: [a.delta5, b.delta5],
      overlapShare,
      delta5: pool.delta,
      qualifies,
      coRefinementTriggered: qualifies && pool.delta >= a.delta5 + b.delta5
    };

    if (qualifies) {
      configurations.push({
        key: `P-comb-${a.symbol}-${b.symbol}`,
        kind: 'combination',
        description: `All-lowDd + ${a.symbol} (P ${a.id}) + ${b.symbol} (P ${b.id})`,
        books: [
          ...frozenBooksExcept(),
          { symbol: a.symbol, phenotype: a.id, grid: a.grid, track: 'P' },
          { symbol: b.symbol, phenotype: b.id, grid: b.grid, track: 'P' }
        ],
        newSymbols: [a.symbol, b.symbol]
      });
    }

    if (combination.coRefinementTriggered) {
      throw new Error('§6.5 co-refinement is triggered: implement it as declared before continuing');
    }
  }

  if (configurations.length > study.stageC.maxConfigurations) {
    throw new Error(`${configurations.length} configurations exceed the cap of ${study.stageC.maxConfigurations}`);
  }

  return { ordered, vectors, configurations, substitutionCandidates, combination, notes };
};

const writeTrades = async (key: string, run: string, result: NRunResult) => {
  const dates = Object.values(result.universe.instruments)[0]!.ds.dates;
  const rows = result.lots.map((lot) => ({
    lot: lot.id,
    symbol: lot.symbol,
    trade: lot.trade.id,
    decision: new Date(lot.decisionTime * 1000).toISOString(),
    entry_date: dates[lot.entryIndex],
    entry_time: new Date(lot.entryTime * 1000).toISOString(),
    entry_price: lot.entryPrice,
    exit_date: lot.exitIndex >= 0 ? dates[lot.exitIndex] : '',
    exit_time: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : '',
    exit_price: lot.exitIndex >= 0 ? lot.exitPrice : lot.exitRawPrice,
    reason: lot.exitReason,
    interest: lot.interest,
    net: lot.net
  }));
  const header = Object.keys(rows[0] ?? { lot: '' });
  const csv = [
    header.join(','),
    ...rows.map((row) => header.map((column) => String((row as Record<string, unknown>)[column] ?? '')).join(','))
  ].join('\n');

  await fs.outputFile(path.join(stageDir('stageC', 'runs', key), `${run}-lots.csv`), `${csv}\n`);
};

// ----- the stage -----

export const stageCFile = () => stageDir('stageC', 'stageC.json');

export const runStageC = async () => {
  await requireProtocolFrozen();

  const loaded = await trainingUniverse();
  const evaluator = await StudyEvaluator.create(loaded);
  const design = await designConfigurations(evaluator);
  const dates = loaded.universe.dates;
  const periods = {
    folds: periodIndices(dates, study.folds),
    regimes: periodIndices(dates, study.regimes),
    years: periodIndices(dates, yearPeriods())
  };
  const runs: Record<string, Record<string, RunFigures>> = {};
  const parity: { key: string; costBps: number; differences: number }[] = [];

  for (const configuration of design.configurations) {
    runs[configuration.key] = {};

    for (const mode of ['fixed', 'portfolio'] as const) {
      for (const costBps of study.costsBps) {
        const result = await runConfiguration(loaded, configuration, mode, costBps);

        runs[configuration.key]![`${mode}-${costBps}`] = figuresOfRun(result, configuration.newSymbols, periods);

        if (mode === 'fixed') {
          await writeTrades(configuration.key, `${mode}-${costBps}`, result);

          // E4: the replay equals the full engine on this configuration.
          const outcome = replayAgainstFull(
            loaded,
            configuration.books.map((book) => book.symbol),
            await configurationPhenotypes(configuration),
            costBps
          );

          parity.push({ key: configuration.key, costBps, differences: outcome.differences.length });
        }
      }
    }

    log(`${configuration.key}: fixed@5 net ${formatDollars(runs[configuration.key]!['fixed-5']!.net)}`);
  }

  // S0's matched-borrowing ladder at the principal cost.
  const ladder: { fraction: number; borrowingDollarDays: number; endEquity: number }[] = [];

  for (const fraction of study.stageC.ladderFractions) {
    const result = await runConfiguration(loaded, design.configurations[0]!, 'portfolio', principal, fraction);
    const figures = figuresOfRun(result, [], periods);

    ladder.push({ fraction, borrowingDollarDays: figures.borrowingDollarDays, endEquity: figures.endEquity });
  }

  const s0 = runs.S0!;
  const gates: Record<string, Record<string, unknown>> = {};

  for (const configuration of design.configurations.slice(1)) {
    const run = runs[configuration.key]!;
    const delta = (costBps: number) => run[`fixed-${costBps}`]!.net - s0[`fixed-${costBps}`]!.net;
    const fixed5 = run[`fixed-${principal}`]!;
    const s0Fixed5 = s0[`fixed-${principal}`]!;
    const portfolio5 = run[`portfolio-${principal}`]!;
    const s0Portfolio5 = s0[`portfolio-${principal}`]!;
    const foldDeltas = fixed5.folds.map((value, index) => value - s0Fixed5.folds[index]!);
    const regimeDeltas = fixed5.regimes.map((value, index) => value - s0Fixed5.regimes[index]!);
    const matched = interpolate(
      ladder.map((point) => ({ x: point.borrowingDollarDays, y: point.endEquity })),
      portfolio5.borrowingDollarDays
    );
    const T = {
      T1: delta(principal) >= study.gates.fixedMateriality && delta(0) > 0 && delta(2) > 0 && delta(10) > 0,
      T2:
        fixed5.minuteDrawdown <= study.drawdownCeiling &&
        fixed5.net / fixed5.minuteDrawdown >=
          study.gates.netPerDrawdownShare * (s0Fixed5.net / s0Fixed5.minuteDrawdown),
      T3:
        fixed5.newLots >= study.gates.minLots &&
        fixed5.newLotYears >= study.gates.minYears &&
        foldDeltas.filter((value) => value > 0).length >= study.gates.minFoldsPositive &&
        withoutBestRegime(delta(principal), regimeDeltas) > 0,
      T4:
        portfolio5.endEquity - s0Portfolio5.endEquity >= study.gates.portfolioMateriality * s0Portfolio5.endEquity &&
        portfolio5.dailyPercent <= study.gates.percentDrawdownCeiling &&
        portfolio5.dailyPercent <= s0Portfolio5.dailyPercent + study.gates.dailyPercentTolerance &&
        portfolio5.minutePercent <= s0Portfolio5.minutePercent + study.gates.minutePercentTolerance,
      T5: portfolio5.endEquity >= matched.value
    };

    gates[configuration.key] = {
      deltas: Object.fromEntries(study.costsBps.map((costBps) => [costBps, delta(costBps)])),
      foldDeltas,
      regimeDeltas,
      withoutBestRegime: withoutBestRegime(delta(principal), regimeDeltas),
      netPerDrawdown: fixed5.net / fixed5.minuteDrawdown,
      s0NetPerDrawdown: s0Fixed5.net / s0Fixed5.minuteDrawdown,
      portfolioDelta: portfolio5.endEquity - s0Portfolio5.endEquity,
      portfolioDeltaShare: (portfolio5.endEquity - s0Portfolio5.endEquity) / s0Portfolio5.endEquity,
      matchedS0EndEquity: matched.value,
      matchedExtrapolated: matched.extrapolated,
      matchedDelta: portfolio5.endEquity - matched.value,
      T,
      nominated: Object.values(T).every(Boolean)
    };
  }

  const record = {
    generatedAt: new Date().toISOString(),
    design,
    ladder,
    runs,
    gates,
    parity,
    parityPassed: parity.every((row) => row.differences === 0)
  };

  await writeJson(stageCFile(), record);

  if (!record.parityPassed) {
    throw new Error('E4 failed: a Stage C configuration differs between the replay and the full engine');
  }

  for (const [key, gate] of Object.entries(gates)) {
    log(`${key}: ${gate.nominated ? 'NOMINATED' : 'comparator'} ${JSON.stringify(gate.T)}`);
  }

  return record;
};

export const readStageC = () => readJson<Awaited<ReturnType<typeof runStageC>>>(stageCFile());
