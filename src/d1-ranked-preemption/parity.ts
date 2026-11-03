// The real-data parity gate (PROTOCOL.md §5.1), after the protocol freeze and before any optimization:
//   (i)   P0 derived engine = frozen engine, every output field, B4 and B5 on `all` at 0/2/5/10 bps in fixed and
//         portfolio mode (frozen dividends), and the pools' regression anchors to the cent at 5 bps;
//   (ii)  P0 derived replay = frozen replay, on random pools of the final window;
//   (iii) derived engine (fixed) = derived replay, every lot, signal, daily row, drawdown and preemption record, under
//         P0R, P1 and P1-B250, random pools of 1–12 books with random priority orders, final window, with at least 20
//         runs that execute a preemption; and the P0 diagnostic replay funds exactly the plain P0 replay.
// Only equalities and coverage counts are recorded; no configuration of the study is involved.
import fs from 'fs-extra';
import { summaryOf } from '../joint-16-etf-d1/figures.ts';
import { compareValues, outputsOf } from '../portfolio-aware-d1/compare.ts';
import { baseNRunConfig, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import { replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { loadPool } from '../pools/load.ts';
import { Rng } from '../optimizer/rng.ts';
import { type PolicyKey, allocationOf, p0Allocation } from './allocation.ts';
import { log, nowIso, study } from './context.ts';
import { benchmarkUniverse, trainingUniverse } from './data.ts';
import { type PRunResult, runPAllocator } from './engine.ts';
import { Evaluator, traceWindowOf } from './evaluator.ts';
import { writeSealed } from './freeze.ts';
import { parityFile } from './freezes.ts';
import { verifyProtocolFreeze } from './guard.ts';
import { defaultWorkerCount } from './pool.ts';
import { replayPreemptive } from './replay.ts';
import { randomVector, vectorOf } from './space.ts';

const ignore = new Set(['config', 'universe']);

const cents = (value: number) => Math.round(value * 100) / 100;

export const runParity = async () => {
  await verifyProtocolFreeze();

  if (await fs.pathExists(parityFile)) {
    throw new Error(`${parityFile} exists: the parity gate is recorded once`);
  }

  const startedAt = nowIso();
  const failures: string[] = [];
  const checks: Record<string, unknown>[] = [];

  // (i) B4 and B5 on `all`, both modes, four costs
  const all = await benchmarkUniverse(['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX']);

  for (const id of ['B4', 'B5'] as const) {
    const pool = await loadPool(id);
    const symbols = pool.config.books.map((book) => book.symbol);
    const anchors = pool.config.regressionAnchors as {
      costBpsPerSide: number;
      fixed: { net: number; minuteDrawdown: number; lots: number };
      portfolioFrozen: { endEquity: number; dailyPercent: number };
    };

    for (const mode of ['fixed', 'portfolio'] as const) {
      for (const costBps of study.costsBps) {
        const members = mode === 'portfolio' ? [...new Set(['VOOG', 'VGT', ...symbols])] : symbols;
        const universe = {
          ...all.universe,
          instruments: Object.fromEntries(members.map((s) => [s, all.universe.instruments[s]!]))
        };
        const config = baseNRunConfig({
          key: `${id}-${mode}-${costBps}`,
          label: id,
          mode,
          symbols,
          phenotypes: pool.phenotypes,
          costBps,
          fraction: pool.config.portfolio.borrowedFraction,
          fixedPrincipal: pool.config.funding.notionalPerTrade,
          rate: pool.config.interest.annualRate,
          lotDividends: true,
          initial: { voog: pool.config.portfolio.initialCore.VOOG, vgt: pool.config.portfolio.initialCore.VGT },
          eligibilityIndex: all.universe.eligibilityIndex,
          accountingStartIndex: all.warmup
        });
        const frozen = runNAllocator(universe, config);
        const derived = runPAllocator(universe, { ...config, allocation: p0Allocation });
        const { preemptions, declines, allocationKey, priorityOrder, ...rest } = derived;
        const differences = compareValues(frozen, rest, { ignore });

        void allocationKey;
        void priorityOrder;

        if (differences.length > 0 || preemptions.length + declines.length > 0) {
          failures.push(`(i) ${id} ${mode} ${costBps} bps: ${differences.slice(0, 3).join('; ')}`);
        }

        const summary = summaryOf(derived);
        const anchor: Record<string, unknown> = {};

        if (costBps === anchors.costBpsPerSide && mode === 'fixed') {
          anchor.net = [anchors.fixed.net, cents(summary.net)];
          anchor.minuteDrawdown = [anchors.fixed.minuteDrawdown, cents(summary.minuteDrawdown)];
          anchor.lots = [anchors.fixed.lots, summary.lots];

          if (
            anchors.fixed.net !== cents(summary.net) ||
            anchors.fixed.minuteDrawdown !== cents(summary.minuteDrawdown) ||
            anchors.fixed.lots !== summary.lots
          ) {
            failures.push(`(i) ${id} fixed anchors ${JSON.stringify(anchor)}`);
          }
        }

        if (costBps === anchors.costBpsPerSide && mode === 'portfolio') {
          anchor.endEquity = [anchors.portfolioFrozen.endEquity, cents(summary.endEquity)];
          anchor.dailyPercent = [
            anchors.portfolioFrozen.dailyPercent,
            Math.round(summary.dailyPercent * 10000) / 10000
          ];

          if (
            anchors.portfolioFrozen.endEquity !== cents(summary.endEquity) ||
            anchors.portfolioFrozen.dailyPercent !== Math.round(summary.dailyPercent * 10000) / 10000
          ) {
            failures.push(`(i) ${id} portfolio anchors ${JSON.stringify(anchor)}`);
          }
        }

        checks.push({
          check: 'i',
          id,
          mode,
          costBps,
          differences: differences.length,
          lots: derived.lots.length,
          anchor
        });
        log(`parity (i) ${id} ${mode} ${costBps} bps: ${differences.length === 0 ? 'identical' : 'DIFFERENT'}`);
      }
    }
  }

  // (ii)–(vi) on fold-a's training data (the windows' chronology: no later window is opened here)
  const loaded = await trainingUniverse('fold-a'); // random pools on fold-a's training data (the chronology)
  const window = traceWindowOf(loaded);
  const symbols = Object.keys(loaded.universe.instruments).sort();
  const rng = Rng.from(study.seedLabel, 'parity');
  const { minRuns, maxRuns, preemptionCoverage, portfolioRuns, windowRuns } = study.parity;
  let withPreemption = 0;
  let portfolioCompared = 0;
  let windowsCompared = 0;
  let runs = 0;

  // Pools of 1–12 books (one in eight a single book) whose arming declines are drawn from the shallow third of the box
  // (8.0–15.0%), so that the books trade often and preemptions occur (coverage); every other coordinate uniform.
  const randomPool = (index: number) => {
    const size = index % 8 === 0 ? 1 : 2 + rng.int(11);
    const members = [...symbols]
      .sort(() => rng.next() - 0.5)
      .slice(0, size)
      .sort();
    const books = members.map((symbol) => {
      const vector = randomVector(rng, `parity:${index}`);

      return { symbol, vector: vectorOf({ ...vector.grid, targetPercentChange: 80 + rng.int(71) }, vector.origin) };
    });
    const order = [...members].sort(() => rng.next() - 0.5);
    const costBps = study.costsBps[rng.int(study.costsBps.length)]!;

    return { books, order, costBps };
  };

  const traced = (books: ReturnType<typeof randomPool>['books'], costBps: number) =>
    books.map((book) => ({
      symbol: book.symbol,
      ds: loaded.universe.instruments[book.symbol]!.ds,
      trace: traceBook(
        loaded.universe.instruments[book.symbol]!.ds,
        candidateBook(book.symbol, book.vector.id, book.vector.grid),
        traceSettings(costBps),
        window
      )
    }));

  // deterministic coverage: draw pools until at least minRuns ran and preemptionCoverage of them executed a
  // preemption under P1 (at most maxRuns; a shortfall then is a recorded failure)
  for (
    let index = 0;
    index < maxRuns && (index < minRuns || withPreemption < preemptionCoverage || portfolioCompared < portfolioRuns);
    index++
  ) {
    runs = index + 1;

    const { books, order, costBps } = randomPool(index);
    const replayBooks = traced(books, costBps);
    const base = {
      symbols: books.map((book) => book.symbol),
      startIndex: window.startIndex,
      endIndex: window.endIndex,
      principal: study.principal,
      rate: study.rate,
      costBps,
      stopSlippageBps: 0,
      detail: true
    };
    // (ii)
    const frozen = replayFixedPool(replayBooks, base);
    const derived = replayPreemptive(replayBooks, base);
    const differences = [
      ...compareValues(frozen.full, derived.full),
      ...(frozen.net === derived.net ? [] : ['net']),
      ...compareValues(frozen.marks, derived.marks),
      ...compareValues(frozen.minuteDrawdown, derived.minuteDrawdown)
    ];

    if (differences.length > 0) {
      failures.push(`(ii) run ${index}: ${differences.slice(0, 3).join('; ')}`);
    }

    // the P0 diagnostic replay funds exactly the plain one
    const diagnosed = replayPreemptive(replayBooks, { ...base, diagnose: [{ rankingId: 'x', order }] });

    if (diagnosed.net !== derived.net || compareValues(diagnosed.full, derived.full).length > 0) {
      failures.push(`(iii-d) run ${index}: the diagnostic changed the P0 replay`);
    }

    checks.push({ check: 'ii', run: index, books: books.length, costBps, differences: differences.length });

    // (iii) under every policy
    for (const policy of ['P0', 'P0R', 'P1', 'P1-B250', 'P1-B500'] as PolicyKey[]) {
      const allocation = allocationOf(policy, policy === 'P0' ? undefined : { rankingId: `parity:${index}`, order });
      const engine = runPAllocator(
        {
          ...loaded.universe,
          instruments: Object.fromEntries(books.map((book) => [book.symbol, loaded.universe.instruments[book.symbol]!]))
        },
        {
          ...baseNRunConfig({
            key: `parity-${index}-${policy}`,
            label: 'parity',
            mode: 'fixed',
            symbols: books.map((book) => book.symbol),
            phenotypes: Object.fromEntries(
              books.map((book) => [book.symbol, candidateBook(book.symbol, book.vector.id, book.vector.grid)])
            ),
            costBps,
            rate: study.rate,
            eligibilityIndex: loaded.universe.eligibilityIndex,
            accountingStartIndex: loaded.warmup
          }),
          allocation
        }
      );
      const boundary = Math.floor((loaded.universe.eligibilityIndex + window.endIndex) / 2);
      const fast = replayPreemptive(replayBooks, { ...base, allocation, windowStarts: [boundary] });
      const { preemptions, declines, allocationKey, priorityOrder, ...rest } = outputsOf(engine) as PRunResult;

      void allocationKey;
      void priorityOrder;

      const diffs = [
        ...compareValues(rest, fast.full),
        ...compareValues(
          preemptions.map((record) => ({ ...record, targetVirtualState: '' })),
          fast.preemptions
        ),
        ...compareValues(declines, fast.declines),
        ...(fast.net === engine.lots.reduce((total, lot) => total + lot.net, 0) ? [] : ['net'])
      ];
      const executed = preemptions.filter((record) => record.outcome === 'executed').length;

      if (policy === 'P1' && executed > 0) {
        withPreemption++;
      }

      if (diffs.length > 0) {
        failures.push(`(iii) run ${index} ${policy}: ${diffs.slice(0, 3).join('; ')}`);
      }

      // (v) the replay's windowed daily drawdown and increment equal the engine's daily marks after the boundary
      if (policy === 'P1' && windowsCompared < windowRuns) {
        const rows = engine.daily.filter((row) => row.index >= boundary);
        let peak = rows[0]!.strategyMark;
        let worst = 0;

        for (const row of rows.slice(1)) {
          peak = Math.max(peak, row.strategyMark);
          worst = Math.max(worst, peak - row.strategyMark);
        }

        const increment = rows.at(-1)!.strategyMark - rows[0]!.strategyMark;

        if (
          Math.abs(fast.windowed[0]!.dailyDrawdown.maximum - worst) > 1e-6 ||
          Math.abs(fast.marks[window.endIndex]! - fast.marks[boundary]! - increment) > 1e-6 ||
          fast.windowed[0]!.minuteDrawdown.maximum < worst - 1e-6
        ) {
          failures.push(`(v) run ${index}: the windowed figures differ from the engine's daily marks`);
        }

        windowsCompared++;
      }

      // (vi) portfolio P1 funds the fixed pool's sequence when no margin test refuses anything
      if (policy === 'P1' && portfolioCompared < portfolioRuns && books.length > 1) {
        const members = [...new Set(['VOOG', 'VGT', ...books.map((book) => book.symbol)])];
        const portfolio = runPAllocator(
          {
            ...loaded.universe,
            instruments: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
          },
          {
            ...baseNRunConfig({
              key: `parity-${index}-portfolio`,
              label: 'parity',
              mode: 'portfolio',
              symbols: books.map((book) => book.symbol),
              phenotypes: Object.fromEntries(
                books.map((book) => [book.symbol, candidateBook(book.symbol, book.vector.id, book.vector.grid)])
              ),
              costBps,
              rate: study.rate,
              eligibilityIndex: loaded.universe.eligibilityIndex,
              accountingStartIndex: loaded.warmup
            }),
            allocation
          }
        );
        const marginBound = portfolio.signals.some((signal) =>
          /Reg T|house requirement|equity below|aggregate cap/.test(signal.reason)
        );

        if (!marginBound) {
          const key = (result: PRunResult) =>
            result.lots.map((lot) => `${lot.symbol}:${lot.entryTime}:${lot.exitTime}:${lot.exitReason}`).join('|');

          if (key(portfolio) !== key(engine)) {
            failures.push(`(vi) run ${index}: portfolio P1 funded a different sequence than fixed P1`);
          }

          portfolioCompared++;
        }
      }

      checks.push({
        check: 'iii',
        run: index,
        policy,
        books: books.length,
        costBps,
        differences: diffs.length,
        preemptions: preemptions.length,
        executed,
        aborted: preemptions.filter((record) => record.outcome === 'aborted').length,
        superseded: preemptions.filter((record) => record.outcome === 'superseded').length,
        declines: declines.length
      });
    }

    log(
      `parity run ${index}: ${books.length} books, ${costBps} bps — ${failures.length === 0 ? 'identical so far' : `${failures.length} failure(s)`}`
    );
  }

  // (iv) the worker pool returns exactly what the in-process runner returns (standalone metrics and P1 pool metrics)
  {
    const local = await Evaluator.create(loaded, 0);
    const pool = await Evaluator.create(loaded, defaultWorkerCount());
    const standaloneItems = Array.from({ length: 96 }, (_, index) => ({
      book: { symbol: symbols[index % symbols.length]!, vector: randomVector(rng, `parity-iv:${index}`) },
      costBps: study.principalCostBps,
      minTrades: 4
    }));
    const poolItems = Array.from({ length: 48 }, (_, index) => {
      const { books, order } = randomPool(1000 + index);

      return {
        books,
        costBps: study.principalCostBps,
        allocation: allocationOf('P1', { rankingId: `parity-iv:${index}`, order }),
        minLots: 0
      };
    });
    const [a, b] = [await local.standalone(standaloneItems), await pool.standalone(standaloneItems)];
    const [c, d] = [await local.pools(poolItems), await pool.pools(poolItems)];

    await local.close();
    await pool.close();

    const diffs = [...compareValues(a, b), ...compareValues(c, d)];

    if (diffs.length > 0) {
      failures.push(`(iv) workers vs in-process: ${diffs.slice(0, 3).join('; ')}`);
    }

    checks.push({
      check: 'iv',
      standalone: standaloneItems.length,
      pools: poolItems.length,
      differences: diffs.length
    });
    log(`parity (iv) workers vs in-process: ${diffs.length === 0 ? 'identical' : 'DIFFERENT'}`);
  }

  if (withPreemption < preemptionCoverage) {
    failures.push(
      `(iii) coverage: only ${withPreemption} P1 runs executed a preemption (≥ ${preemptionCoverage} required)`
    );
  }

  if (portfolioCompared < portfolioRuns || windowsCompared < windowRuns) {
    failures.push(`(v)/(vi) coverage: ${windowsCompared} windowed and ${portfolioCompared} portfolio comparisons`);
  }

  const sealed = await writeSealed(parityFile, {
    stage: 'parity',
    startedAt,
    finishedAt: nowIso(),
    runs,
    withPreemption,
    windowsCompared,
    portfolioCompared,
    checks,
    failures,
    pass: failures.length === 0
  });

  log(
    `parity: ${failures.length === 0 ? 'PASS' : `FAIL (${failures.length})`}; sealed ${parityFile} (${sealed.bodyHash.slice(0, 12)})`
  );

  return sealed;
};
