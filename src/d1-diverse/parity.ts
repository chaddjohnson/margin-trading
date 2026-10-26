// `npm run diverse-d1 -- parity` (PROTOCOL.md §18, before the freeze): the parity matrix on the eligible universe;
// any unexplained difference stops the study.
//
//   P0      the frozen engine = the N-book engine on B1 and B4, fixed and portfolio, four costs;
//   P1      replay = N-book engine (fixed, four costs, field for field) on every eligible symbol alone (D1 constants and
//           a Sobol vector), random pools of 2/4/8/12/16/24/32 books (VOOG as a book with every split symbol; the
//           sparsest-coverage and thinnest-volume symbols without VGT; XOP), B1/B4/B5 frozen books, and a pool holding
//           a lot open at the window end;
//   P1-cut  the same at both fold search ends (5 bps);
//   P2      portfolio consistency under both dividend conventions;
//   P3      lookahead on 12 random six-book pools: altering the middle funded lot's exit price or time changes no
//           earlier funding decision;
//   P4      the worker pool equals the in-process runner (centres and neighbours with block marks);
//   P5      the replay's strategy marks at the block boundaries equal the full engine's daily strategy marks.
// Only difference counts, case labels and timings are recorded.
import { createHash } from 'node:crypto';
import { readSplits } from '#lib';
import { type ParityRecord, portfolioChecks, runP0 } from '../joint-16-etf-d1/parity.ts';
import { frozenBenchmarkPhenotypes, searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { canonicalBooks, keyOf, runEngine } from '../d1-robust/evaluate.ts';
import { RobustEvaluator } from '../d1-robust/evaluator.ts';
import { GenomeSpace, Library, pickDistinct } from '../d1-robust/genome.ts';
import { vectorOf } from '../d1-robust/library.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import { d1Params } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { type Grid, gridOf } from '../portfolio-aware-d1/phenotypes.ts';
import { replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { jsonReplacer, log, nowIso, readJson, stageDir, study, universeFile, writeJson } from './context.ts';
import { eligibleSymbols, trainingUniverse } from './data.ts';
import { codeState, requireCommitted } from './freeze.ts';
import { sobolLibrary } from './library.ts';
import { blockSpecOf } from './scores.ts';

interface Case {
  label: string;
  books: Book[];
  frozen?: boolean;
}

export const parityFile = stageDir('parity', 'parity.json');

const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value, jsonReplacer)).digest('hex');

export const blocksOfLoaded = (loaded: LoadedUniverse) =>
  blockSpecOf(loaded.universe.eligibilityIndex, loaded.universe.sessionCount - 1);

const casesOf = async (universe: string[], loaded: LoadedUniverse) => {
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

  const audit = await readJson<{
    symbols: Record<string, { coverageMedian: number; trainingMedianDollarVolume: number }>;
  }>(universeFile);
  const sparsest = [...universe]
    .sort((a, b) => audit.symbols[a]!.coverageMedian - audit.symbols[b]!.coverageMedian)
    .slice(0, 3);
  const thinnest = [...universe]
    .sort((a, b) => audit.symbols[a]!.trainingMedianDollarVolume - audit.symbols[b]!.trainingMedianDollarVolume)
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
        [...sparsest, ...thinnest].forEach(force);

        if (pool.includes('VGT')) {
          pool.splice(pool.indexOf('VGT'), 1); // no VGT
        }
      }

      if (n === 2) {
        force('XOP');
      }

      while (members.length < Math.min(size, pool.length + members.length)) {
        members.push(pool.splice(rng.int(pool.length), 1)[0]!);
      }

      cases.push({
        label: `random ${size}-book pool ${n + 1}${n === 0 ? ' (VOOG, split symbols)' : n === 1 ? ' (sparsest, thinnest, no VGT)' : ' (XOP)'}`,
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

  return { cases, sparsest, thinnest, splitSymbols, d1, frozen };
};

const replayParity = (loaded: LoadedUniverse, item: Case, phenotypes: Record<string, unknown>, costBps: number) => {
  const symbols = item.frozen
    ? ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].filter((symbol) => item.books.some((book) => book.symbol === symbol))
    : canonicalBooks(item.books).map((book) => book.symbol);

  return replayAgainstFull(loaded, symbols, phenotypes as never, costBps);
};

export const runParity = async () => {
  await requireCommitted();

  const started = Date.now();
  const universe = await eligibleSymbols();
  const loaded = await trainingUniverse('final', { symbols: universe });
  const label = study.neighbourWindowLabel('final');
  const evaluator = await RobustEvaluator.create(loaded, label, 0);
  const blocks = blocksOfLoaded(loaded);
  const records: ParityRecord[] = [];
  const failures: string[] = [];

  // P0
  await runP0(loaded, records);

  // P1
  const { cases, sparsest, thinnest, splitSymbols, d1, frozen } = await casesOf(universe, loaded);
  const space = new GenomeSpace(universe, new Library(sobolLibrary().vectors));
  const openRng = Rng.from(study.seedLabel, 'parity', 'open-at-end');

  for (let attempt = 0; attempt < 200; attempt++) {
    const books = space.booksOf(space.uniform(openRng, 6, 6));

    if (evaluator.replayDetail(books, study.principalCostBps).lots.some((lot) => lot.open)) {
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

  // P1-cut
  for (const window of ['fold-a', 'fold-b'] as const) {
    const cut = await trainingUniverse(window, { symbols: universe });

    for (const item of cases.filter((_, index) => index % 5 === 0)) {
      const outcome = replayParity(
        cut,
        item,
        item.frozen ? frozen : evaluator.phenotypes(item.books),
        study.principalCostBps
      );

      records.push({
        gate: 'P1',
        case: `${item.label} (${window} cut)`,
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

  // P2
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
    { label: 'B5 (vector-named books)', books: searchBooks.B5 }
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
        checks: `${portfolio.lots.length} lots; ${checks.coreDistributionsChecked} distributions checked`
      });
    }
  }

  // P3: 12 random six-book pools, the middle closed lot altered.
  const p3: { pool: number; earlier: number; equal: boolean }[] = [];

  for (let pool = 0; pool < study.parity.lookaheadPools; pool++) {
    const books = canonicalBooks(
      space.booksOf(space.uniform(Rng.from(study.seedLabel, 'parity', 'lookahead', pool), 6, 6))
    );
    const base = evaluator.replayDetail(books, study.principalCostBps);
    const closed = base.lots.filter((lot) => lot.exitIndex >= 0);
    const lot = closed[Math.floor(closed.length / 2)];

    if (!lot) {
      p3.push({ pool, earlier: 0, equal: true });
      continue;
    }

    const owner = base.books.find((item) => item.symbol === lot.symbol)!;
    const trade = owner.trace.trades[lot.tradeId - 1]!;
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
      copy.exitIndex = Math.min(copy.exitIndex + 3, evaluator.window.endIndex);
    });
    const reference = hashOf(before(base));
    const equal = hashOf(before(cheaper)) === reference && hashOf(before(later)) === reference;

    p3.push({ pool, earlier: before(base).length, equal });

    if (!equal) {
      failures.push(`P3 pool ${pool}: a later exit changed an earlier decision`);
    }
  }

  if (p3.filter((row) => row.earlier > 0).length < study.parity.lookaheadPools / 2) {
    failures.push('P3: too few pools with earlier decisions to test');
  }

  // P4: the pool equals the in-process runner (with block marks).
  const p4Configs = Array.from({ length: 40 }, (_, index) =>
    space.booksOf(space.uniform(Rng.from(study.seedLabel, 'parity', 'p4', index), 1, 12))
  );
  const workerPool = await RobustEvaluator.create(loaded, label, 4);
  const spec = {
    stage: 'parity',
    cls: 'N1' as const,
    n: 4,
    costBps: study.principalCostBps,
    markIndices: blocks.markIndices
  };
  const p4Equal =
    hashOf([
      await workerPool.centres(p4Configs, 5, { markIndices: blocks.markIndices, withFunded: true }),
      await workerPool.neighbourRecords(p4Configs, spec)
    ]) ===
    hashOf([
      await evaluator.centres(p4Configs, 5, { markIndices: blocks.markIndices, withFunded: true }),
      await evaluator.neighbourRecords(p4Configs, spec)
    ]);

  await workerPool.close();

  if (!p4Equal) {
    failures.push('P4: the worker pool differs from the in-process runner');
  }

  // P5: block marks of the replay = the full engine's daily strategy marks.
  const p5: { case: string; equal: boolean }[] = [];

  for (const item of cases.filter((candidate, index) => !candidate.frozen && index % 4 === 0)) {
    const canonical = canonicalBooks(item.books);
    const [centre] = await evaluator.centres([canonical], study.principalCostBps, { markIndices: blocks.markIndices });
    const engine = runEngine(loaded.universe, {
      ...portfolioSpec(evaluator, canonical, item.label),
      mode: 'fixed',
      lotDividends: false
    });
    const engineMarks = blocks.markIndices.map(
      (index) =>
        engine.daily.find((row) => row.index === index)?.strategyMark ?? (index < engine.daily[0]!.index ? 0 : NaN)
    );
    const equal = engineMarks.every((mark, j) => Math.abs(mark - centre!.markAt![j]!) < 1e-6);

    p5.push({ case: item.label, equal });

    if (!equal) {
      failures.push(`P5 ${item.label}: block marks differ from the full engine`);
    }
  }

  await evaluator.close();

  failures.push(
    ...records
      .filter((record) => record.differences > 0)
      .map((record) => `${record.gate} ${record.case} ${record.costBps}: ${record.firstDifferences[0]}`)
  );

  const record = {
    generatedAt: nowIso(),
    codeState: await codeState(),
    seconds: (Date.now() - started) / 1000,
    passed: failures.length === 0,
    counts: {
      P0: records.filter((row) => row.gate === 'P0').length,
      P1: records.filter((row) => row.gate === 'P1').length,
      P2: records.filter((row) => row.gate === 'P2').length,
      P3: `${p3.filter((row) => row.equal).length}/${p3.length} pools equal (${p3.map((row) => row.earlier).join(', ')} earlier decisions)`,
      P4: p4Equal ? 'equal (40 configurations, centres with marks and 4 neighbours each)' : 'DIFFERENT',
      P5: `${p5.filter((row) => row.equal).length}/${p5.length} cases equal`
    },
    blocks,
    sparsest,
    thinnest,
    splitSymbols,
    failures,
    records,
    p3,
    p5,
    keys: cases.map((item) => ({ label: item.label, key: item.frozen ? item.label : keyOf(item.books) }))
  };

  await writeJson(parityFile, record);
  log(`parity: ${records.length} comparisons + P3 + P4 + P5, ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`Parity failed (study stopped): ${failures.slice(0, 3).join('; ')}`);
  }

  return record;
};

export const requireParity = async () => {
  const record = await readJson<{ passed: boolean }>(parityFile).catch(() => undefined);

  if (!record?.passed) {
    throw new Error('The parity matrix has not passed: the replay may not select anything');
  }
};
