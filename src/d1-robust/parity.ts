// `npm run robust-d1 -- parity` (PROTOCOL.md §18): the parity matrix on the expanded universe, before the replay may
// select anything; any difference blocks the study.
//
//   P0      the frozen engine = the N-book engine on B1 and B4, fixed and portfolio, four costs (the 16-ETF runner);
//   P1      replay = N-book engine (fixed, four costs, field for field) on every eligible symbol alone (D1 constants and
//           a Sobol vector), random subsets of 2/4/8/12/16/24 books (VOOG-as-book, no VGT, XOP, every symbol with a
//           registered split inside the window, the sparsest-coverage symbols), B1/B4/B5 frozen books, and a pool with
//           a lot open at the window end;
//   P1-cut  the same comparison at the fold search ends (5 bps);
//   P2      portfolio consistency (balance-sheet identity, VOOG/VGT core-versus-lot market values, core and lot
//           distributions) under both dividend conventions;
//   P3      lookahead: a later exit's price or time changes no earlier funding decision (real traces, 6 books);
//   P4      the worker pool equals the in-process runner on 40 configurations with neighbourhoods.
// Only difference counts, case descriptions and timings are recorded.
import { createHash } from 'node:crypto';
import { readSplits } from '#lib';
import { type ParityRecord, portfolioChecks, runP0 } from '../joint-16-etf-d1/parity.ts';
import { frozenBenchmarkPhenotypes, searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { d1Params } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { type Grid, gridOf } from '../portfolio-aware-d1/phenotypes.ts';
import { replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { jsonReplacer, log, nowIso, readJson, stageDir, study, universeFile, writeJson } from './context.ts';
import { canonicalBooks, keyOf, runEngine } from './evaluate.ts';
import { eligibleSymbols, trainingUniverse } from './data.ts';
import { RobustEvaluator } from './evaluator.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { GenomeSpace, Library, pickDistinct } from './genome.ts';
import { sobolLibrary, vectorOf } from './library.ts';
import type { Book } from './neighbourhood.ts';
import { portfolioSpec } from './promote.ts';

interface Case {
  label: string;
  books: Book[];
  frozen?: boolean;
}

const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value, jsonReplacer)).digest('hex');

export const parityCases = async (universe: string[], loaded: LoadedUniverse) => {
  const sobol = sobolLibrary().vectors;
  const d1 = vectorOf(gridOf(d1Params() as Record<string, number>), 'control:D1 shipped constants');
  const cases: Case[] = [];

  universe.forEach((symbol, index) => {
    cases.push({ label: `${symbol} alone, D1 constants`, books: [{ symbol, vector: d1 }] });
    cases.push({
      label: `${symbol} alone, ${sobol[index % sobol.length]!.origin}`,
      books: [{ symbol, vector: sobol[index % sobol.length]! }]
    });
  });

  const audit = await readJson<{ symbols: Record<string, { coverageMedian: number }> }>(universeFile);
  const sparsest = [...universe]
    .sort((a, b) => audit.symbols[a]!.coverageMedian - audit.symbols[b]!.coverageMedian)
    .slice(0, 3);
  const end = loaded.universe.end;
  const splitSymbols = [
    ...new Set(
      readSplits()
        .filter((split) => split.effectiveDate <= end && universe.includes(split.symbol))
        .map((split) => split.symbol)
    )
  ];
  const rng = Rng.from(study.seedLabel, 'parity', 'cases');

  for (const size of study.parity.subsetSizes) {
    for (let n = 0; n < study.parity.subsetsPerSize; n++) {
      const pool = [...universe];
      const members: string[] = [];
      const force = (symbol: string) => {
        if (pool.includes(symbol) && members.length < size) {
          members.push(pool.splice(pool.indexOf(symbol), 1)[0]!);
        }
      };

      if (n === 0) {
        force('VOOG');
        splitSymbols.forEach(force);
      }

      if (n === 1) {
        sparsest.forEach(force);
        pool.splice(pool.indexOf('VGT'), 1); // no VGT
      }

      if (n === 2) {
        force('XOP');
      }

      while (members.length < Math.min(size, universe.length - (n === 1 ? 1 : 0))) {
        members.push(pool.splice(rng.int(pool.length), 1)[0]!);
      }

      cases.push({
        label: `random ${size}-book subset ${n + 1}${n === 0 ? ' (VOOG, split symbols)' : n === 1 ? ' (sparsest, no VGT)' : ' (XOP)'}`,
        books: members.map((symbol) => ({ symbol, vector: sobol[rng.int(sobol.length)]! }))
      });
    }
  }

  const frozen = await frozenBenchmarkPhenotypes();

  for (const key of ['B1', 'B4', 'B5'] as const) {
    const symbols =
      key === 'B1' ? ['VGT'] : key === 'B4' ? ['VGT', 'XBI', 'XRT', 'KRE'] : ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'];

    cases.push({
      label: `${key} (frozen books)`,
      books: symbols.map((symbol) => ({
        symbol,
        vector: { id: frozen[symbol]!.name, grid: {} as Grid, origin: 'frozen' }
      })),
      frozen: true
    });
  }

  return { cases, sparsest, splitSymbols, d1 };
};

const replayParity = (loaded: LoadedUniverse, item: Case, phenotypes: Record<string, unknown>, costBps: number) => {
  const canonical = item.frozen ? item.books : canonicalBooks(item.books);
  const symbols = item.frozen
    ? ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].filter((symbol) => item.books.some((book) => book.symbol === symbol))
    : canonical.map((book) => book.symbol);

  return replayAgainstFull(loaded, symbols, phenotypes as never, costBps);
};

export const runParity = async () => {
  await requireProtocolFrozen();

  const started = Date.now();
  const universe = await eligibleSymbols();
  const loaded = await trainingUniverse('final', { symbols: universe });
  const evaluator = await RobustEvaluator.create(loaded, 'final', 0);
  const records: ParityRecord[] = [];
  const failures: string[] = [];

  // P0.
  await runP0(loaded, records);

  // P1.
  const { cases, sparsest, splitSymbols, d1 } = await parityCases(universe, loaded);
  const frozen = await frozenBenchmarkPhenotypes();

  // A pool with a lot open at the window end: the first random 6-book configuration whose replay ends holding one.
  const space = new GenomeSpace(universe, new Library(sobolLibrary().vectors));
  const openRng = Rng.from(study.seedLabel, 'parity', 'open-at-end');

  for (let attempt = 0; attempt < 200; attempt++) {
    const books = space.booksOf(space.uniform(openRng, 6, 6));
    const replay = evaluator.replayDetail(books, study.principalCostBps);

    if (replay.lots.some((lot) => lot.open)) {
      cases.push({ label: 'a 6-book pool with a lot open at the window end', books });
      break;
    }
  }

  for (const item of cases) {
    const phenotypes = item.frozen ? frozen : evaluator.phenotypes(item.books);

    for (const costBps of study.costsBps) {
      const outcome = replayParity(loaded, item, phenotypes, costBps);

      records.push({
        gate: 'P1',
        case: item.label,
        mode: 'fixed',
        costBps,
        books: item.books.length,
        differences: outcome.differences.length,
        firstDifferences: outcome.differences.slice(0, 5),
        fullMs: outcome.fullMs,
        fastMs: outcome.fastMs,
        checks: outcome.checks
      });
    }
  }

  log(`P1: ${cases.length} cases × 4 costs`);

  // P1-cut: at the fold search ends (5 bps), a subset of the cases.
  for (const round of ['fold-a', 'fold-b'] as const) {
    const cut = await trainingUniverse(round, { symbols: universe });

    for (const item of cases.filter((_, index) => index % 5 === 0)) {
      const phenotypes = item.frozen ? frozen : evaluator.phenotypes(item.books);
      const outcome = replayParity(cut, item, phenotypes, study.principalCostBps);

      records.push({
        gate: 'P1',
        case: `${item.label} (${round} cut)`,
        mode: 'fixed',
        costBps: study.principalCostBps,
        books: item.books.length,
        differences: outcome.differences.length,
        firstDifferences: outcome.differences.slice(0, 5),
        fullMs: outcome.fullMs,
        fastMs: outcome.fastMs,
        checks: outcome.checks
      });
    }
  }

  // P2 under both dividend conventions.
  const searchBooks = await searchBenchmarkBooks();
  const p2Cases: { label: string; books: Book[] }[] = [
    {
      label: '16 books, D1 constants',
      books: pickDistinct(universe, 16, Rng.from(study.seedLabel, 'parity', 'p2')).map((symbol) => ({
        symbol,
        vector: d1
      }))
    },
    { label: 'VOOG alone, D1 constants', books: [{ symbol: 'VOOG', vector: d1 }] },
    { label: 'VOOG + VGT, D1 constants', books: ['VGT', 'VOOG'].map((symbol) => ({ symbol, vector: d1 })) },
    { label: 'B5 (search books)', books: searchBooks.B5 }
  ];

  for (const item of p2Cases) {
    for (const lotDividends of [true, false]) {
      const t0 = Date.now();
      const fixed = runEngine(loaded.universe, {
        ...portfolioSpec(evaluator, item.books, item.label),
        mode: 'fixed',
        lotDividends
      });
      const portfolio = runEngine(loaded.universe, {
        ...portfolioSpec(evaluator, item.books, item.label),
        lotDividends
      });
      const checks = portfolioChecks(fixed, portfolio);
      const problems = lotDividends
        ? checks.problems
        : [
            ...checks.problems.filter((problem) => !problem.includes('lot dividend')),
            ...(portfolio.dividends.some((row) => row.source === 'lot')
              ? ['a lot received a distribution under the symmetric convention']
              : [])
          ];

      records.push({
        gate: 'P2',
        case: `${item.label} (${lotDividends ? 'frozen' : 'symmetric'} dividends)`,
        mode: 'portfolio',
        costBps: study.principalCostBps,
        books: item.books.length,
        differences: problems.length,
        firstDifferences: problems.slice(0, 5),
        fullMs: Date.now() - t0,
        checks: `${portfolio.lots.length} lots; ${checks.coreDistributionsChecked} distributions checked; VGT lot on ${checks.vgtLotDays} closes, VOOG lot on ${checks.voogLotDays}`
      });
    }
  }

  // P3 lookahead on real traces.
  const lookBooks = canonicalBooks(
    space.booksOf(space.uniform(Rng.from(study.seedLabel, 'parity', 'lookahead'), 6, 6))
  );
  const base = evaluator.replayDetail(lookBooks, study.principalCostBps);
  const firstLot = base.lots.find((lot) => lot.exitIndex >= 0);
  let p3 = 'no closed lot to alter';

  if (firstLot) {
    const owner = base.books.find((item) => item.symbol === firstLot.symbol)!;
    const trade = owner.trace.trades[firstLot.tradeId - 1]!;
    const altered = (change: (copy: typeof trade) => void) =>
      replayFixedPool(
        base.books.map((item) =>
          item === owner
            ? {
                ...item,
                trace: {
                  ...item.trace,
                  trades: item.trace.trades.map((other) => {
                    if (other !== trade) {
                      return other;
                    }

                    const copy = { ...other };

                    change(copy);
                    return copy;
                  })
                }
              }
            : item
        ),
        {
          symbols: base.books.map((item) => item.symbol),
          startIndex: evaluator.window.startIndex,
          endIndex: evaluator.window.endIndex,
          principal: study.principal,
          rate: study.rate,
          costBps: study.principalCostBps,
          stopSlippageBps: 0,
          detail: true
        }
      );
    const before = (result: ReturnType<typeof replayFixedPool>) =>
      result
        .full!.signals.filter((signal) => signal.decisionTime < trade.exitTime)
        .map((signal) => `${signal.symbol}@${signal.decisionTime}:${signal.outcome}`);
    const cheaper = altered((copy) => {
      copy.exitRawPrice *= 0.5;
      copy.net -= 50000;
    });
    const later = altered((copy) => {
      copy.exitIndex = Math.min(copy.exitIndex + 2, evaluator.window.endIndex);
    });
    const equal =
      hashOf(before(cheaper)) === hashOf(before(base)) &&
      hashOf(before(later)) === hashOf(before(base)) &&
      before(base).length > 0;

    p3 = equal ? `equal (${before(base).length} earlier decisions)` : 'DIFFERENT';

    if (!equal) {
      failures.push('P3: a later exit changed an earlier decision');
    }
  }

  // P4: the pool equals the in-process runner.
  const p4Configs = Array.from({ length: 40 }, (_, index) =>
    space.booksOf(space.uniform(Rng.from(study.seedLabel, 'parity', 'p4', index), 1, 12))
  );
  const pool = await RobustEvaluator.create(loaded, 'final', 4);
  const spec = { stage: 'parity', cls: 'N1' as const, n: 4, costBps: study.principalCostBps };
  const p4Equal =
    hashOf([await pool.centres(p4Configs, 5), await pool.neighbourRecords(p4Configs, spec)]) ===
    hashOf([await evaluator.centres(p4Configs, 5), await evaluator.neighbourRecords(p4Configs, spec)]);

  await pool.close();
  await evaluator.close();

  if (!p4Equal) {
    failures.push('P4: the worker pool differs from the in-process runner');
  }

  failures.push(
    ...records
      .filter((record) => record.differences > 0)
      .map((record) => `${record.gate} ${record.case} ${record.costBps}: ${record.firstDifferences[0]}`)
  );

  const record = {
    generatedAt: nowIso(),
    seconds: (Date.now() - started) / 1000,
    passed: failures.length === 0,
    counts: {
      P0: records.filter((row) => row.gate === 'P0').length,
      P1: records.filter((row) => row.gate === 'P1').length,
      P2: records.filter((row) => row.gate === 'P2').length,
      P3: p3,
      P4: p4Equal ? 'equal (40 configurations, centres and 4 neighbours each)' : 'DIFFERENT'
    },
    sparsest,
    splitSymbols,
    failures,
    records,
    keys: cases.map((item) => ({ label: item.label, key: item.frozen ? item.label : keyOf(item.books) }))
  };

  await writeJson(stageDir('parity', 'parity.json'), record);
  log(`parity: ${records.length} comparisons + P3 + P4, ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`Parity failed: ${failures.slice(0, 3).join('; ')}`);
  }

  return record;
};

export const requireParity = async () => {
  const record = await readJson<{ passed: boolean }>(stageDir('parity', 'parity.json')).catch(() => undefined);

  if (!record?.passed) {
    throw new Error('The parity matrix has not passed: the replay may not select anything');
  }
};
