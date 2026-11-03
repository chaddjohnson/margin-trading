// The gates before the cache may select anything (PROTOCOL.md §3):
//
//   E1  the frozen engine (src/multi-etf-allocator/engine.ts) = the N-book engine on S0 and VGT alone, fixed and
//       portfolio, 0/2/5/10 bps, on training, on `all` through 2025-10-13 and on the whole `all` history; both engines
//       run on the same loaded datasets, and the N-book loader's datasets are checked identical to the frozen
//       loader's;
//   E2  the cached replay = the N-book engine (fixed) on S0 and VGT alone, same costs and windows;
//   E3  the cached replay = the N-book engine on candidate pools: for each candidate, the controls and 12 pool vectors
//       as five-book additions and as standalone books at 0/2/5/10 bps, plus one substitution and one six-book
//       combination per cost.
//
// Every comparison is exact: every field of every trade, lot, signal, daily row, ledger event and drawdown.
import path from 'node:path';
import { combinationOf } from '../multi-etf-allocator/context.ts';
import { type RunConfig, runAllocator } from '../multi-etf-allocator/engine.ts';
import { datasetRunConfig, loadDatasetUniverse } from '../multi-etf-allocator/dataset.ts';
import { scenarioBConfig } from '../multi-etf-allocator/parity.ts';
import { allocatorConfig, fixedVgtConfig } from '../multi-etf-allocator/scenarios.ts';
import { compareValues, outputsOf } from './compare.ts';
import { baselineBooks, candidates, log, stageDir, study, writeJson } from './context.ts';
import { baselineUniverse, trainingUniverse, traceWindowOf } from './data.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { type BookPhenotype, type NRunConfig, type NUniverse, baseNRunConfig, runNAllocator } from './nbook/engine.ts';
import type { LoadedUniverse } from './nbook/universe.ts';
import { candidateBook, s0Books } from './phenotypes.ts';
import { type ReplayBook, replayFixedPool } from './replay.ts';
import { commonSobolPool, controlsFor, parityVectors } from './space.ts';
import { median } from './tracks.ts';
import { traceBook, traceSettings } from './trace.ts';

const frozenOnly = new Set(['config', 'universe', 'maintenanceEvents', 'forcedLiquidations']);

export interface ParityRecord {
  gate: 'E1' | 'E2' | 'E3';
  window: string;
  case: string;
  mode: 'fixed' | 'portfolio';
  costBps: number;
  differences: number;
  firstDifferences: string[];
  fullMs: number;
  fastMs?: number;
  checks: string;
}

type Window = { key: string; partition: 'training' | 'all'; endDate?: string };

const windows: Window[] = [
  { key: 'training', partition: 'training' },
  { key: 'all-to-2025-10-13', partition: 'all', endDate: '2025-10-13' },
  { key: 'all', partition: 'all' }
];

// ----- E1 -----

const sameDataset = (a: NUniverse['instruments'][string]['ds'], b: NUniverse['instruments'][string]['ds']) =>
  compareValues({ ...a, id: '' }, { ...b, id: '' }, { maxDifferences: 3 });

export const runE1 = async (records: ParityRecord[]) => {
  const books = await s0Books();

  for (const window of windows) {
    const members = ['VOOG', ...baselineBooks] as const;
    const frozenLoaded = await loadDatasetUniverse({
      members,
      partition: window.partition,
      warmupSessions: 0,
      mode: 'portfolio',
      endDate: window.endDate
    });
    const ours = window.partition === 'training' ? await trainingUniverse() : await baselineUniverse(window.endDate);

    // The N-book loader's datasets equal the frozen loader's, member by member.
    for (const symbol of members) {
      const differences = sameDataset(
        frozenLoaded.universe.instruments[symbol]!.ds,
        ours.universe.instruments[symbol]!.ds
      );

      if (differences.length > 0) {
        throw new Error(`E1 ${window.key}: the ${symbol} datasets differ: ${differences.join('; ')}`);
      }
    }

    const universe = frozenLoaded.universe as unknown as NUniverse;

    for (const mode of ['fixed', 'portfolio'] as const) {
      for (const control of ['S0', 'VGT'] as const) {
        for (const costBps of study.costsBps) {
          const frozenBase: RunConfig =
            control === 'S0'
              ? await allocatorConfig(mode, combinationOf('all-lowDd'), 'shadow', { costBps })
              : mode === 'fixed'
                ? await fixedVgtConfig({ costBps })
                : await scenarioBConfig({ costBps });
          const frozenConfig = datasetRunConfig(frozenBase, frozenLoaded);
          const symbols = control === 'S0' ? [...baselineBooks] : ['VGT'];
          const nConfig = baseNRunConfig({
            key: `${control}-${mode}-${costBps}`,
            label: `${control} ${mode} ${costBps} bps`,
            mode,
            symbols,
            phenotypes: books,
            costBps,
            eligibilityIndex: frozenConfig.eligibilityIndex,
            accountingStartIndex: frozenConfig.accountingStartIndex
          });
          const started = Date.now();
          const frozen = runAllocator(frozenLoaded.universe, frozenConfig);
          const fullMs = Date.now() - started;
          const n = runNAllocator(universe, nConfig);
          const extraEmpty = frozen.maintenanceEvents.length === 0 && frozen.forcedLiquidations.length === 0;
          const differences = compareValues(frozen, n, { ignore: frozenOnly, maxDifferences: 10 });

          if (!extraEmpty) {
            differences.push('the frozen run has maintenance events or forced sales');
          }

          records.push({
            gate: 'E1',
            window: window.key,
            case: control,
            mode,
            costBps,
            differences: differences.length,
            firstDifferences: differences.slice(0, 5),
            fullMs,
            checks: `${frozen.trades.length} virtual trades, ${frozen.lots.length} lots, ${frozen.signals.length} signals, ${frozen.daily.length} daily rows, ${frozen.events.length} ledger events`
          });
          log(
            `E1 ${window.key} ${control} ${mode} ${costBps} bps: ${differences.length} differences (${frozen.lots.length} lots)`
          );
        }
      }
    }
  }
};

// ----- E2 / E3: the replay against the N-book engine -----

export const replayAgainstFull = (
  loaded: LoadedUniverse,
  symbols: string[],
  phenotypes: Record<string, BookPhenotype>,
  costBps: number
) => {
  const window = traceWindowOf(loaded);
  const config: NRunConfig = baseNRunConfig({
    key: 'parity',
    label: 'parity',
    mode: 'fixed',
    symbols,
    phenotypes,
    costBps,
    eligibilityIndex: window.armStart,
    accountingStartIndex: window.startIndex
  });
  const universe: NUniverse = {
    ...loaded.universe,
    instruments: Object.fromEntries(symbols.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
  };
  let started = Date.now();
  const full = runNAllocator(universe, config);
  const fullMs = Date.now() - started;

  started = Date.now();

  const books: ReplayBook[] = symbols.map((symbol) => ({
    symbol,
    ds: loaded.universe.instruments[symbol]!.ds,
    trace: traceBook(loaded.universe.instruments[symbol]!.ds, phenotypes[symbol]!, traceSettings(costBps), window)
  }));
  const replay = replayFixedPool(books, {
    symbols,
    startIndex: window.startIndex,
    endIndex: window.endIndex,
    principal: study.principal,
    rate: study.rate,
    costBps,
    stopSlippageBps: 0,
    detail: true
  });
  const fastMs = Date.now() - started;
  const differences = compareValues(outputsOf(full), replay.full, { maxDifferences: 10 });

  // The summary path (detail off) must give the same numbers as the detailed path.
  const quick = replayFixedPool(books, {
    symbols,
    startIndex: window.startIndex,
    endIndex: window.endIndex,
    principal: study.principal,
    rate: study.rate,
    costBps,
    stopSlippageBps: 0,
    detail: false
  });

  differences.push(
    ...compareValues(
      { net: replay.net, minute: replay.minuteDrawdown, daily: replay.dailyDrawdown, marks: [...replay.marks] },
      { net: quick.net, minute: quick.minuteDrawdown, daily: quick.dailyDrawdown, marks: [...quick.marks] },
      { maxDifferences: 3 }
    ).map((difference) => `detail vs summary: ${difference}`)
  );

  const fullNet = full.lots.reduce((total, lot) => total + lot.net, 0);

  if (fullNet !== replay.net) {
    differences.push(`net ${fullNet} vs ${replay.net}`);
  }

  return {
    differences,
    fullMs,
    fastMs,
    checks: `${full.trades.length} virtual trades, ${full.lots.length} lots, ${full.signals.length} signals, ${full.daily.length} daily rows`
  };
};

export const runE2 = async (records: ParityRecord[]) => {
  const books = await s0Books();

  for (const window of windows) {
    const loaded = window.partition === 'training' ? await trainingUniverse() : await baselineUniverse(window.endDate);

    for (const control of ['S0', 'VGT'] as const) {
      const symbols = control === 'S0' ? [...baselineBooks] : ['VGT'];

      for (const costBps of study.costsBps) {
        const outcome = replayAgainstFull(loaded, symbols, books, costBps);

        records.push({
          gate: 'E2',
          window: window.key,
          case: control,
          mode: 'fixed',
          costBps,
          differences: outcome.differences.length,
          firstDifferences: outcome.differences.slice(0, 5),
          fullMs: outcome.fullMs,
          fastMs: outcome.fastMs,
          checks: outcome.checks
        });
        log(`E2 ${window.key} ${control} ${costBps} bps: ${outcome.differences.length} differences`);
      }
    }
  }
};

export const runE3 = async (records: ParityRecord[]) => {
  const loaded = await trainingUniverse();
  const books = await s0Books();
  const sobol = commonSobolPool().vectors;
  const sample = parityVectors(sobol);

  for (const [index, symbol] of candidates.entries()) {
    const vectors = [...(await controlsFor(symbol)), ...sample];
    const partner = candidates[(index + 1) % candidates.length]!;

    for (const costBps of study.costsBps) {
      for (const vector of vectors) {
        const phenotype = candidateBook(symbol, vector.id, vector.grid);
        const phenotypes = { ...books, [symbol]: phenotype };

        for (const [kind, symbols] of [
          ['addition', [...baselineBooks, symbol]],
          ['standalone', [symbol]]
        ] as const) {
          const outcome = replayAgainstFull(loaded, [...symbols], phenotypes, costBps);

          records.push({
            gate: 'E3',
            window: 'training',
            case: `${symbol} ${kind} ${vector.origin} ${vector.id}`,
            mode: 'fixed',
            costBps,
            differences: outcome.differences.length,
            firstDifferences: outcome.differences.slice(0, 5),
            fullMs: outcome.fullMs,
            fastMs: outcome.fastMs,
            checks: outcome.checks
          });
        }
      }

      // One substitution (the candidate's D1 control for KRE) and one six-book combination (with the next candidate).
      const d1 = (await controlsFor(symbol))[0]!;
      const partnerD1 = (await controlsFor(partner))[0]!;
      const phenotypes = {
        ...books,
        [symbol]: candidateBook(symbol, d1.id, d1.grid),
        [partner]: candidateBook(partner, partnerD1.id, partnerD1.grid)
      };

      for (const [kind, symbols] of [
        ['substitution for KRE', ['VGT', 'XBI', 'XRT', symbol]],
        [`combination with ${partner}`, [...baselineBooks, symbol, partner]]
      ] as const) {
        const outcome = replayAgainstFull(loaded, [...symbols], phenotypes, costBps);

        records.push({
          gate: 'E3',
          window: 'training',
          case: `${symbol} ${kind} D1`,
          mode: 'fixed',
          costBps,
          differences: outcome.differences.length,
          firstDifferences: outcome.differences.slice(0, 5),
          fullMs: outcome.fullMs,
          fastMs: outcome.fastMs,
          checks: outcome.checks
        });
      }

      const failures = records.filter(
        (record) =>
          record.gate === 'E3' && record.case.startsWith(symbol) && record.costBps === costBps && record.differences > 0
      );

      log(`E3 ${symbol} ${costBps} bps: ${vectors.length} vectors × 2 + 2 cases, ${failures.length} with differences`);
    }
  }
};

export const runParity = async () => {
  await requireProtocolFrozen();

  const records: ParityRecord[] = [];
  const started = Date.now();

  await runE1(records);
  await runE2(records);
  await runE3(records);

  const failures = records.filter((record) => record.differences > 0);
  const timing = (gate: string) => {
    const rows = records.filter((record) => record.gate === gate);

    return {
      cases: rows.length,
      fullMsMedian: median(rows.map((row) => row.fullMs)),
      fastMsMedian: median(rows.filter((row) => row.fastMs !== undefined).map((row) => row.fastMs!))
    };
  };

  await writeJson(path.join(stageDir('parity'), 'parity.json'), {
    generatedAt: new Date().toISOString(),
    seconds: (Date.now() - started) / 1000,
    passed: failures.length === 0,
    counts: { E1: timing('E1'), E2: timing('E2'), E3: timing('E3') },
    failures,
    records
  });
  log(`parity: ${records.length} comparisons, ${failures.length} with differences`);

  if (failures.length > 0) {
    throw new Error(`Parity failed in ${failures.length} comparisons; the cache may not select anything`);
  }
};
