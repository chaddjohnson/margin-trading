// The parity matrix (PROTOCOL.md §11), before the replay may select anything:
//
//   P0  the frozen engine (src/multi-etf-allocator/engine.ts) = the N-book engine on B1 and B4, fixed and portfolio,
//       0/2/5/10 bps, training (both read the same datasets, checked identical to this study's loader);
//   P1  the replay = the N-book engine (fixed, training, 0/2/5/10 bps), field for field, on every ETF alone (D1's
//       constants and a library vector), random subsets of 2/4/8/12/16 books, B1/B4/B5, six 16-book pools of the
//       library's extreme vectors and one 16-book pool of D1's constants;
//   P2  portfolio consistency of the full engine for a 16-book pool, VOOG alone, VOOG + VGT and B5 (training, 5 bps).
//
// Only difference counts, case descriptions and timings are printed.
import path from 'node:path';
import { combinationOf } from '../multi-etf-allocator/context.ts';
import { type RunConfig, runAllocator } from '../multi-etf-allocator/engine.ts';
import { datasetRunConfig, loadDatasetUniverse } from '../multi-etf-allocator/dataset.ts';
import { scenarioBConfig } from '../multi-etf-allocator/parity.ts';
import { allocatorConfig, fixedVgtConfig } from '../multi-etf-allocator/scenarios.ts';
import { Rng } from '../optimizer/rng.ts';
import { compareValues } from '../portfolio-aware-d1/compare.ts';
import {
  type BookPhenotype,
  type NRunResult,
  type NUniverse,
  baseNRunConfig,
  runNAllocator
} from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { benchmarkSymbols, frozenBenchmarkPhenotypes } from './benchmarks.ts';
import { log, stageDir, study, universe, writeJson } from './context.ts';
import { type Book, JointEvaluator, canonicalBooks } from './evaluator.ts';
import { engineRun } from './robust.ts';
import type { Vector } from './space.ts';

const frozenOnly = new Set(['config', 'universe', 'maintenanceEvents', 'forcedLiquidations']);

export interface ParityRecord {
  gate: 'P0' | 'P1' | 'P2';
  case: string;
  mode: 'fixed' | 'portfolio';
  costBps: number;
  books: number;
  differences: number;
  firstDifferences: string[];
  fullMs: number;
  fastMs?: number;
  checks: string;
}

// ----- P0 -----

export const runP0 = async (loaded: LoadedUniverse, records: ParityRecord[]) => {
  const members = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] as const;
  const frozenLoaded = await loadDatasetUniverse({
    members,
    partition: 'training',
    warmupSessions: 0,
    mode: 'portfolio'
  });

  for (const symbol of members) {
    const differences = compareValues(
      { ...frozenLoaded.universe.instruments[symbol]!.ds, id: '' },
      { ...loaded.universe.instruments[symbol]!.ds, id: '' },
      { maxDifferences: 3 }
    );

    if (differences.length > 0) {
      throw new Error(`P0: the ${symbol} training datasets differ: ${differences.join('; ')}`);
    }
  }

  const phenotypes = await frozenBenchmarkPhenotypes();
  const universeOf = frozenLoaded.universe as unknown as NUniverse;

  for (const mode of ['fixed', 'portfolio'] as const) {
    for (const control of ['B4', 'B1'] as const) {
      for (const costBps of study.costsBps) {
        const frozenBase: RunConfig =
          control === 'B4'
            ? await allocatorConfig(mode, combinationOf('all-lowDd'), 'shadow', { costBps })
            : mode === 'fixed'
              ? await fixedVgtConfig({ costBps })
              : await scenarioBConfig({ costBps });
        const frozenConfig = datasetRunConfig(frozenBase, frozenLoaded);
        const started = Date.now();
        const frozen = runAllocator(frozenLoaded.universe, frozenConfig);
        const fullMs = Date.now() - started;
        const n = runNAllocator(
          universeOf,
          baseNRunConfig({
            key: `${control}-${mode}-${costBps}`,
            label: `${control} ${mode} ${costBps} bps`,
            mode,
            symbols: benchmarkSymbols[control],
            phenotypes,
            costBps,
            eligibilityIndex: frozenConfig.eligibilityIndex,
            accountingStartIndex: frozenConfig.accountingStartIndex
          })
        );
        const differences = compareValues(frozen, n, { ignore: frozenOnly, maxDifferences: 10 });

        if (frozen.maintenanceEvents.length > 0 || frozen.forcedLiquidations.length > 0) {
          differences.push('the frozen run has maintenance events or forced sales');
        }

        records.push({
          gate: 'P0',
          case: control,
          mode,
          costBps,
          books: benchmarkSymbols[control].length,
          differences: differences.length,
          firstDifferences: differences.slice(0, 5),
          fullMs,
          checks: `${frozen.trades.length} virtual trades, ${frozen.lots.length} lots, ${frozen.signals.length} signals, ${frozen.daily.length} daily rows, ${frozen.events.length} ledger events`
        });
        log(`P0 ${control} ${mode} ${costBps} bps: ${differences.length} differences`);
      }
    }
  }
};

// ----- P1 -----

export interface ParityCase {
  label: string;
  books: Book[];
  phenotypes?: Record<string, BookPhenotype>; // the frozen benchmark books; otherwise the books' vector phenotypes
}

export const parityCases = async (library: readonly Vector[], sobol: readonly Vector[], d1: Vector) => {
  const cases: ParityCase[] = [];

  for (const [index, symbol] of universe.entries()) {
    cases.push({ label: `${symbol} alone, D1 constants`, books: [{ symbol, vector: d1 }] });
    cases.push({ label: `${symbol} alone, ${sobol[index]!.origin}`, books: [{ symbol, vector: sobol[index]! }] });
  }

  for (const size of study.parity.subsetSizes) {
    for (let n = 0; n < study.parity.subsetsPerSize; n++) {
      const rng = Rng.from(study.seedLabel, 'parity', size, n);
      const pool: string[] = [...universe];
      const members: string[] = [];

      if (n === 0 && size === 2) {
        members.push(pool.splice(pool.indexOf('VOOG'), 1)[0]!);
      }

      if (n === 0 && size === 4) {
        members.push(pool.splice(pool.indexOf('XOP'), 1)[0]!);
        pool.splice(pool.indexOf('VGT'), 1);
      }

      while (members.length < size) {
        members.push(pool.splice(rng.int(pool.length), 1)[0]!);
      }

      cases.push({
        label: `random ${size}-book subset ${n + 1}`,
        books: members.map((symbol) => ({ symbol, vector: library[rng.int(library.length)]! }))
      });
    }
  }

  const frozen = await frozenBenchmarkPhenotypes();

  for (const key of ['B1', 'B4', 'B5'] as const) {
    cases.push({
      label: `${key} (frozen books)`,
      books: benchmarkSymbols[key].map((symbol) => ({
        symbol,
        vector: { id: frozen[symbol]!.name, grid: {} as Vector['grid'], origin: 'frozen' }
      })),
      phenotypes: frozen
    });
  }

  const extreme = (label: string, keyName: keyof Vector['grid'], better: (a: number, b: number) => boolean) => {
    const vector = sobol.reduce(
      (best, item) => (better(item.grid[keyName], best.grid[keyName]) ? item : best),
      sobol[0]!
    );

    cases.push({
      label: `16 books, ${label} (${vector.origin})`,
      books: universe.map((symbol) => ({ symbol, vector }))
    });
  };

  extreme('shortest stop', 'trailingStopPercentage', (a, b) => a < b);
  extreme('widest stop', 'trailingStopPercentage', (a, b) => a > b);
  extreme('longest hold', 'maximumHoldDays', (a, b) => a > b);
  extreme('longest continuation window', 'continuationWindow', (a, b) => a > b);
  extreme('shortest lookback', 'tickWindowSize', (a, b) => a < b);
  extreme('longest lookback', 'tickWindowSize', (a, b) => a > b);
  cases.push({
    label: '16 books, D1 constants on every ETF',
    books: universe.map((symbol) => ({ symbol, vector: d1 }))
  });

  return cases;
};

export const runP1 = (evaluator: JointEvaluator, cases: readonly ParityCase[], records: ParityRecord[]) => {
  for (const item of cases) {
    const canonical = canonicalBooks(item.books);
    const symbols = canonical.map((book) => book.symbol);
    const phenotypes =
      item.phenotypes ?? Object.fromEntries(canonical.map((book) => [book.symbol, evaluator.phenotype(book)]));

    for (const costBps of study.costsBps) {
      const outcome = replayAgainstFull(evaluator.loaded, symbols, phenotypes, costBps);

      records.push({
        gate: 'P1',
        case: item.label,
        mode: 'fixed',
        costBps,
        books: symbols.length,
        differences: outcome.differences.length,
        firstDifferences: outcome.differences.slice(0, 5),
        fullMs: outcome.fullMs,
        fastMs: outcome.fastMs,
        checks: outcome.checks
      });
    }

    const failures = records.filter((record) => record.case === item.label && record.differences > 0).length;

    log(`P1 ${item.label}: ${failures} of 4 costs with differences`);
  }
};

// ----- P2 -----

export const portfolioChecks = (fixed: NRunResult, portfolio: NRunResult) => {
  const problems: string[] = [];
  const marginReasons = (reason: string) => !reason.startsWith('pool occupied') && !reason.startsWith('pool reserved');

  // (a) funded decisions equal the fixed run's, up to the first margin-rule refusal
  const firstMargin = portfolio.signals.findIndex(
    (signal) => signal.outcome === 'refused' && marginReasons(signal.reason)
  );
  const limit = firstMargin < 0 ? Math.max(fixed.signals.length, portfolio.signals.length) : firstMargin;

  for (let index = 0; index < limit; index++) {
    const a = fixed.signals[index];
    const b = portfolio.signals[index];

    if (!a || !b || a.symbol !== b.symbol || a.decisionTime !== b.decisionTime || a.outcome !== b.outcome) {
      problems.push(`signal ${index}: fixed ${a?.symbol} ${a?.outcome} vs portfolio ${b?.symbol} ${b?.outcome}`);
      break;
    }
  }

  // (b) the balance-sheet identity at every daily row
  for (const row of portfolio.daily) {
    const identity =
      row.lmv + row.receivables + row.cash - row.principal - row.interestLiability - row.fundingPayable - row.equity;

    if (Math.abs(identity) > 1e-6 * Math.max(1, Math.abs(row.equity))) {
      problems.push(`${row.date}: equity identity off by ${identity}`);
      break;
    }

    const voogValue = (row.voogShares + (row.lotShares.VOOG ?? 0)) * row.closes.VOOG!;
    const vgtValue = (row.vgtCoreShares + (row.lotShares.VGT ?? 0)) * row.closes.VGT!;

    if (Math.abs(voogValue - row.mv.VOOG!) > 1e-6 * Math.max(1, voogValue)) {
      problems.push(`${row.date}: VOOG market value ≠ (core + lot shares) × close`);
      break;
    }

    if (Math.abs(vgtValue - row.mv.VGT!) > 1e-6 * Math.max(1, vgtValue)) {
      problems.push(`${row.date}: VGT market value ≠ (core + lot shares) × close`);
      break;
    }
  }

  // (c) distributions: core shares × amount; VGT lots receive VGT's; VOOG lots receive none
  const byIndex = new Map(portfolio.daily.map((row) => [row.index, row]));
  const dates = portfolio.universe.dates;
  let coreChecked = 0;
  let lotChecked = 0;

  for (const distribution of portfolio.universe.distributions) {
    const s = dates.indexOf(distribution.exDate);

    if (s <= 0 || !byIndex.has(s - 1)) {
      continue;
    }

    const before = byIndex.get(s - 1)!;
    const paid = portfolio.dividends.filter(
      (row) => row.etf === distribution.etf && row.exDate === distribution.exDate
    );
    const core = paid.filter((row) => row.source === 'core').reduce((total, row) => total + row.value, 0);
    const lots = paid.filter((row) => row.source === 'lot').reduce((total, row) => total + row.value, 0);
    const coreShares = distribution.etf === 'VOOG' ? before.voogShares : before.vgtCoreShares;
    const lotShares = distribution.etf === 'VGT' ? (before.lotShares.VGT ?? 0) : 0;
    const payDay = dates.indexOf(distribution.payDate);

    if (payDay < 0 || payDay > portfolio.endIndex) {
      continue; // paid after the window
    }

    coreChecked++;

    if (Math.abs(core - coreShares * distribution.amount) > 1e-6 * Math.max(1, core)) {
      problems.push(
        `${distribution.etf} ${distribution.exDate}: core dividend ${core} ≠ ${coreShares} × ${distribution.amount}`
      );
    }

    if (distribution.etf === 'VOOG' && paid.some((row) => row.source === 'lot')) {
      problems.push(`VOOG ${distribution.exDate}: a VOOG lot received a distribution`);
    }

    if (lotShares > 0) {
      lotChecked++;
    }

    if (Math.abs(lots - lotShares * distribution.amount) > 1e-6 * Math.max(1, lots)) {
      problems.push(
        `${distribution.etf} ${distribution.exDate}: lot dividend ${lots} ≠ ${lotShares} × ${distribution.amount}`
      );
    }
  }

  return {
    problems,
    firstMarginRefusal: firstMargin,
    coreDistributionsChecked: coreChecked,
    lotDistributionsChecked: lotChecked,
    voogLotDays: portfolio.daily.filter((row) => (row.lotShares.VOOG ?? 0) > 0).length,
    vgtLotDays: portfolio.daily.filter((row) => (row.lotShares.VGT ?? 0) > 0).length
  };
};

export const runP2 = (evaluator: JointEvaluator, d1: Vector, b5: Book[], records: ParityRecord[]) => {
  const cases: { label: string; books: Book[] }[] = [
    { label: '16 books, D1 constants', books: universe.map((symbol) => ({ symbol, vector: d1 })) },
    { label: 'VOOG alone, D1 constants', books: [{ symbol: 'VOOG', vector: d1 }] },
    { label: 'VOOG + VGT, D1 constants', books: ['VGT', 'VOOG'].map((symbol) => ({ symbol, vector: d1 })) },
    { label: 'B5 (search books)', books: b5 }
  ];
  const details: Record<string, ReturnType<typeof portfolioChecks>> = {};

  for (const item of cases) {
    const started = Date.now();
    const fixed = engineRun(evaluator, evaluator.loaded, item.books, 'fixed', study.principalCostBps);
    const portfolio = engineRun(evaluator, evaluator.loaded, item.books, 'portfolio', study.principalCostBps);
    const checks = portfolioChecks(fixed, portfolio);

    details[item.label] = checks;
    records.push({
      gate: 'P2',
      case: item.label,
      mode: 'portfolio',
      costBps: study.principalCostBps,
      books: item.books.length,
      differences: checks.problems.length,
      firstDifferences: checks.problems.slice(0, 5),
      fullMs: Date.now() - started,
      checks: `${portfolio.lots.length} lots, ${portfolio.daily.length} daily rows, ${portfolio.dividends.length} dividends; ${checks.coreDistributionsChecked} distributions checked, ${checks.lotDistributionsChecked} with VGT lot shares; VOOG lot on ${checks.voogLotDays} closes`
    });
    log(`P2 ${item.label}: ${checks.problems.length} problems`);
  }

  return details;
};

export const writeParity = async (records: ParityRecord[], extra: Record<string, unknown>) => {
  const failures = records.filter((record) => record.differences > 0);
  const timing = (gate: string) => {
    const rows = records.filter((record) => record.gate === gate);
    const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
    const mid = (values: number[]) => sorted(values)[values.length >> 1] ?? NaN;

    return {
      cases: rows.length,
      fullMsMedian: mid(rows.map((row) => row.fullMs)),
      fastMsMedian: mid(rows.filter((row) => row.fastMs !== undefined).map((row) => row.fastMs!))
    };
  };

  await writeJson(path.join(stageDir('parity'), 'parity.json'), {
    generatedAt: new Date().toISOString(),
    passed: failures.length === 0,
    counts: { P0: timing('P0'), P1: timing('P1'), P2: timing('P2') },
    failures,
    records,
    ...extra
  });

  return failures;
};
