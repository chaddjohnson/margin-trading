// Stage E (PROTOCOL.md §10.2–§10.5): after FROZEN_SELECTION.json verifies, one continuous `all` run per frozen
// configuration (nominees, B1, B4, B5, C0) on the full N-book engine, fixed and 20% portfolio at 0/2/5/10 bps, B5's
// ladder at 5 bps; every state carried across 2024-01-01 and 2025-10-17; P&L and returns attributed to development
// (training), holdout and final from the marked state at the boundary closes; the replay re-checked on every fixed run;
// the acceptance rules A1–A6 applied mechanically. `--confirm` re-runs everything and compares the record digest.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { interpolate } from '../portfolio-aware-d1/stageC.ts';
import { type BenchmarkKey, benchmarkSymbols, frozenBenchmarkPhenotypes } from './benchmarks.ts';
import { hasFlag, log, option, postStudyDir, readJson, stageDir, study, writeJson } from './context.ts';
import { runFrozen } from './controls.ts';
import { evaluationUniverse } from './data.ts';
import { type Book, JointEvaluator, canonicalBooks } from './evaluator.ts';
import { bridgeOf, extrasOf, lotDays, type RunSummary, summaryOf } from './figures.ts';
import { readVerifiedSelection, requireProtocolFrozen } from './freeze.ts';
import { engineRun } from './robust.ts';
import type { Grid } from './space.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';

const evaluationDir = (...parts: string[]) => stageDir('evaluation', ...parts);

interface FrozenNominee {
  key: string;
  role: string;
  configurationKey: string;
  score: number;
  books: { symbol: string; id: string; grid: Grid; short: string }[];
}

interface Configuration {
  key: string;
  kind: 'nominee' | 'benchmark' | 'core';
  benchmark?: BenchmarkKey | 'C0';
  books: Book[];
  symbols: string[];
}

const nomineeConfiguration = (nominee: FrozenNominee): Configuration => {
  const books = nominee.books.map((book) => ({
    symbol: book.symbol,
    vector: { id: book.id, grid: book.grid, origin: 'frozen nominee' }
  }));

  return { key: nominee.key, kind: 'nominee', books, symbols: canonicalBooks(books).map((book) => book.symbol) };
};

const benchmarkConfigurations = (): Configuration[] => [
  ...(['B1', 'B4', 'B5'] as const).map((key) => ({
    key,
    kind: 'benchmark' as const,
    benchmark: key,
    books: [],
    symbols: benchmarkSymbols[key]
  })),
  { key: 'C0', kind: 'core', benchmark: 'C0', books: [], symbols: [] }
];

const runOf = async (
  evaluator: JointEvaluator,
  loaded: LoadedUniverse,
  configuration: Configuration,
  mode: 'fixed' | 'portfolio',
  costBps: number,
  fraction: number = study.fraction
): Promise<NRunResult> =>
  configuration.benchmark
    ? runFrozen(loaded, configuration.benchmark, mode, costBps, fraction)
    : engineRun(evaluator, loaded, configuration.books, mode, costBps, fraction, configuration.key);

const segment = (summary: RunSummary, name: string) => summary.segments.find((row) => row.segment === name);

// Borrowing-dollar-days after the training's last close (the overlap of each lot with the post-training window).
const postTrainingBorrowing = (result: NRunResult, trainingEndIndex: number) => {
  const { sTime } = Object.values(result.universe.instruments)[0]!.ds;
  const start = sTime[trainingEndIndex]!;

  return result.lots.reduce((total, lot) => {
    const end = sTime[lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex]!;
    const from = Math.max(start, lot.entryTimestamp);

    return total + (end > from ? (lot.originalPrincipal * (end - from)) / 86400 : 0);
  }, 0);
};

// Lot-days per symbol and segment (overlap of each funded lot with the segment), and the exactly omitted VGT/VOOG
// distributions of fixed-mode lots (shares × amount for each ex-date while held).
const distributionExposure = (result: NRunResult, segments: Record<string, [number, number]>) => {
  const { sTime, dates } = Object.values(result.universe.instruments)[0]!.ds;
  const rows: Record<string, Record<string, number>> = {};
  const omittedLedger: Record<string, number> = {};

  for (const lot of result.lots) {
    const exit = lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex;

    for (const [name, [first, last]] of Object.entries(segments)) {
      const from = Math.max(lot.entryIndex, first - 1);
      const to = Math.min(exit, last);

      if (to > from) {
        rows[lot.symbol] ??= {};
        rows[lot.symbol]![name] = (rows[lot.symbol]![name] ?? 0) + (sTime[to]! - sTime[from]!) / 86400;
      }
    }

    if (lot.symbol === 'VGT' || lot.symbol === 'VOOG') {
      for (const distribution of result.universe.distributions) {
        const s = dates.indexOf(distribution.exDate);

        if (distribution.etf === lot.symbol && s > lot.entryIndex && s <= exit) {
          omittedLedger[lot.symbol] = (omittedLedger[lot.symbol] ?? 0) + lot.shares * distribution.amount;
        }
      }
    }
  }

  return {
    lotDays: rows,
    omittedAtYield: Object.fromEntries(
      [0.01, 0.03, 0.06].map((yieldRate) => [
        yieldRate,
        Object.fromEntries(
          Object.entries(rows).map(([symbol, bySegment]) => [
            symbol,
            Object.fromEntries(
              Object.entries(bySegment).map(([name, days]) => [name, (study.principal * yieldRate * days) / 365])
            )
          ])
        )
      ])
    ),
    omittedVgtVoogExact: omittedLedger
  };
};

export const runEvaluation = async (args: string[]) => {
  await requireProtocolFrozen();

  const manifest = await readVerifiedSelection();
  const confirm = hasFlag(args, 'confirm');
  const recordFile = evaluationDir('evaluation.json');

  if (!confirm && (await fs.pathExists(recordFile))) {
    throw new Error(`${recordFile} exists: the evaluation runs once; use --confirm for the deterministic re-run`);
  }

  const nominees = manifest.nominees as FrozenNominee[];

  if (nominees.length === 0) {
    await writeJson(recordFile, {
      generatedAt: new Date().toISOString(),
      manifestHash: manifest.manifestHash,
      outcome: 'no advancement',
      note: 'The frozen selection holds no nominee: no candidate is evaluated after training; the benchmarks are retained.'
    });
    log('no nominee: nothing evaluated after training');
    return;
  }

  const configurations = [...benchmarkConfigurations(), ...nominees.map(nomineeConfiguration)];
  const members = [
    ...new Set(['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX', ...configurations.flatMap((item) => item.symbols)])
  ];
  const loaded = await evaluationUniverse(members);

  if (loaded.universe.end !== manifest.lastCommonSession) {
    throw new Error(`The all window ends ${loaded.universe.end}, not the frozen ${manifest.lastCommonSession}`);
  }

  const evaluator = new JointEvaluator(loaded);
  const frozenPhenotypes = await frozenBenchmarkPhenotypes();
  const dates = loaded.universe.dates;
  const trainingEndIndex = dates.filter((date) => date <= study.trainingEnd).length - 1;
  const holdoutEndIndex = dates.filter((date) => date <= '2025-10-16').length - 1;
  const segments: Record<string, [number, number]> = {
    training: [1, trainingEndIndex],
    holdout: [trainingEndIndex + 1, holdoutEndIndex],
    final: [holdoutEndIndex + 1, dates.length - 1]
  };
  const summaries: Record<
    string,
    Record<string, RunSummary & { extras: ReturnType<typeof extrasOf>; postBorrowing: number }>
  > = {};
  const kept = new Map<string, NRunResult>();
  const parity: { key: string; costBps: number; differences: number; first: string[] }[] = [];

  for (const configuration of configurations) {
    summaries[configuration.key] = {};

    for (const mode of ['fixed', 'portfolio'] as const) {
      if (configuration.kind === 'core' && mode === 'fixed') {
        continue;
      }

      for (const costBps of study.costsBps) {
        const result = await runOf(evaluator, loaded, configuration, mode, costBps);

        summaries[configuration.key]![`${mode}-${costBps}`] = {
          ...summaryOf(result),
          extras: extrasOf(result),
          postBorrowing: postTrainingBorrowing(result, trainingEndIndex)
        };

        if (costBps === study.principalCostBps) {
          kept.set(`${configuration.key}:${mode}`, result);
        }

        if (mode === 'fixed') {
          const phenotypes =
            configuration.kind === 'benchmark'
              ? frozenPhenotypes
              : Object.fromEntries(configuration.books.map((book) => [book.symbol, evaluator.phenotype(book)]));
          const outcome = replayAgainstFull(loaded, configuration.symbols, phenotypes, costBps);

          parity.push({
            key: configuration.key,
            costBps,
            differences: outcome.differences.length,
            first: outcome.differences.slice(0, 3)
          });
        }
      }
    }

    log(`${configuration.key}: evaluated`);
  }

  const b5 = configurations.find((item) => item.key === 'B5')!;
  const ladder = [];

  for (const fraction of study.robustness.ladderFractions) {
    const result = await runOf(evaluator, loaded, b5, 'portfolio', study.principalCostBps, fraction);
    const summary = summaryOf(result);
    const trainingEnd = segment(summary, 'development')!.endEquity;
    const finalEnd = segment(summary, 'final')!.endEquity;

    ladder.push({
      fraction,
      borrowingDollarDays: summary.borrowingDollarDays,
      postTrainingBorrowingDollarDays: postTrainingBorrowing(result, trainingEndIndex),
      endEquity: summary.endEquity,
      postTrainingReturn: finalEnd / trainingEnd - 1,
      dailyPercent: summary.dailyPercent
    });
  }

  const strategy = (key: string, costBps: number, name: string) =>
    segment(summaries[key]![`fixed-${costBps}`]!, name)!.strategyPnl;
  const comparisons: Record<string, unknown> = {};
  const accepted: string[] = [];

  for (const configuration of configurations.filter((item) => item.kind === 'nominee')) {
    const own = summaries[configuration.key]!;
    const versus = (benchmark: 'B1' | 'B4' | 'B5') => {
      const fixedDelta = (costBps: number, name: string) =>
        strategy(configuration.key, costBps, name) - strategy(benchmark, costBps, name);
      const classify = (delta: number) =>
        delta >= study.acceptance.persistThreshold
          ? 'persists'
          : delta <= study.acceptance.reverseThreshold
            ? 'reverses'
            : 'disappears';
      const ownPortfolio = own[`portfolio-${study.principalCostBps}`]!;
      const theirPortfolio = summaries[benchmark]![`portfolio-${study.principalCostBps}`]!;
      const postReturn = (summary: RunSummary) =>
        segment(summary, 'final')!.endEquity / segment(summary, 'development')!.endEquity - 1;

      return {
        fixed: Object.fromEntries(
          study.costsBps.map((costBps) => [
            costBps,
            {
              development: fixedDelta(costBps, 'development'),
              holdout: fixedDelta(costBps, 'holdout'),
              final: fixedDelta(costBps, 'final'),
              postTraining: fixedDelta(costBps, 'holdout') + fixedDelta(costBps, 'final'),
              full: fixedDelta(costBps, 'full')
            }
          ])
        ),
        holdout: classify(fixedDelta(study.principalCostBps, 'holdout')),
        final: classify(fixedDelta(study.principalCostBps, 'final')),
        portfolio: {
          holdoutReturn: [
            segment(ownPortfolio, 'holdout')!.equityReturn,
            segment(theirPortfolio, 'holdout')!.equityReturn
          ],
          finalReturn: [segment(ownPortfolio, 'final')!.equityReturn, segment(theirPortfolio, 'final')!.equityReturn],
          postTrainingReturn: [postReturn(ownPortfolio), postReturn(theirPortfolio)],
          endEquity: [ownPortfolio.endEquity, theirPortfolio.endEquity],
          dailyPercent: [ownPortfolio.dailyPercent, theirPortfolio.dailyPercent],
          minutePercent: [ownPortfolio.minutePercent, theirPortfolio.minutePercent]
        }
      };
    };
    const vsB5 = versus('B5');
    const fixed5 = own[`fixed-${study.principalCostBps}`]!;
    const portfolio5 = own[`portfolio-${study.principalCostBps}`]!;
    const conditional = portfolio5.dailyPercent > study.gates.percentDrawdownIdeal;
    const margin = conditional ? study.acceptance.conditionalPostTrainingMargin : study.acceptance.postTrainingMargin;
    const rules = {
      A1: vsB5.fixed[study.principalCostBps]!.postTraining >= margin,
      A2: [0, 2, 10].every((costBps) => vsB5.fixed[costBps]!.postTraining > 0),
      A3:
        vsB5.fixed[study.principalCostBps]!.holdout > study.acceptance.reverseThreshold &&
        vsB5.fixed[study.principalCostBps]!.final > study.acceptance.reverseThreshold,
      A4: fixed5.minuteDrawdown <= study.drawdownCeiling,
      A5: portfolio5.dailyPercent <= study.gates.percentDrawdownCeiling,
      A6: vsB5.portfolio.postTrainingReturn[0]! >= vsB5.portfolio.postTrainingReturn[1]!
    };
    const isAccepted = Object.values(rules).every(Boolean);
    const bridgeB5 = bridgeOf(kept.get(`${configuration.key}:fixed`)!, kept.get('B5:fixed')!);
    const bridgeB4 = bridgeOf(kept.get(`${configuration.key}:fixed`)!, kept.get('B4:fixed')!);
    const postRows = bridgeB5.rows.filter((row) => row.segment === 'holdout' || row.segment === 'final');
    const postDelta = vsB5.fixed[study.principalCostBps]!.postTraining;
    const topTwo = postRows
      .map((row) => row.contribution)
      .filter((value) => value > 0)
      .sort((a, b) => b - a)
      .slice(0, 2)
      .reduce((total, value) => total + value, 0);
    const matched = interpolate(
      ladder.map((point) => ({ x: point.postTrainingBorrowingDollarDays, y: point.postTrainingReturn })),
      portfolio5.postBorrowing
    );

    if (isAccepted) {
      accepted.push(configuration.key);
    }

    comparisons[configuration.key] = {
      versusB5: vsB5,
      versusB4: versus('B4'),
      versusB1: versus('B1'),
      conditional,
      margin,
      rules,
      accepted: isAccepted,
      evidence: {
        postTrainingDelta5: postDelta,
        postTrainingDeltaWithoutTopTwo: postDelta - topTwo,
        thin: postDelta - topTwo <= 0,
        postTrainingLots: kept
          .get(`${configuration.key}:fixed`)!
          .lots.filter((lot) => lot.entryIndex > trainingEndIndex).length
      },
      matchedBorrowing: {
        postTrainingBorrowingDollarDays: portfolio5.postBorrowing,
        b5LadderPostTrainingReturn: matched.value,
        extrapolated: matched.extrapolated,
        ownPostTrainingReturn: vsB5.portfolio.postTrainingReturn[0]
      },
      bridges: {
        B5: { bySegment: bridgeB5.bySegment, residual: bridgeB5.residual, rows: bridgeB5.rows.length },
        B4: { bySegment: bridgeB4.bySegment, residual: bridgeB4.residual, rows: bridgeB4.rows.length }
      },
      distributions: distributionExposure(kept.get(`${configuration.key}:fixed`)!, segments)
    };
    await fs.outputFile(evaluationDir('bridges', `${configuration.key}-vs-B5.csv`), toCsv(bridgeB5.rows));
    await fs.outputFile(evaluationDir('bridges', `${configuration.key}-vs-B4.csv`), toCsv(bridgeB4.rows));
  }

  const ranked = [...nominees].sort((a, b) => b.score - a.score);
  const recommendation = ranked.find((nominee) => accepted.includes(nominee.key))?.key ?? 'benchmarks retained';

  for (const [key, result] of kept) {
    const [configuration, mode] = key.split(':') as [string, string];

    await fs.outputFile(
      evaluationDir('runs', configuration, `${mode}-5-lots.csv`),
      toCsv(
        result.lots.map((lot) => ({
          lot: lot.id,
          symbol: lot.symbol,
          trade: lot.trade.id,
          decision: new Date(lot.decisionTime * 1000).toISOString(),
          entry: new Date(lot.entryTime * 1000).toISOString(),
          entry_price: lot.entryPrice,
          exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
          exit_price: lot.exitIndex >= 0 ? lot.exitPrice : lot.exitRawPrice,
          reason: lot.exitReason,
          principal: lot.originalPrincipal,
          shares: lot.shares,
          lot_days: lotDays(result, lot),
          interest: lot.interest,
          net: lot.net,
          worst_mark: lot.worstMark
        }))
      )
    );
    await fs.outputFile(
      evaluationDir('runs', configuration, `${mode}-5-daily.csv`),
      toCsv(
        result.daily.map((row) => ({
          date: row.date,
          equity: row.equity,
          strategy_mark: row.strategyMark,
          realized: row.realized,
          unrealized: row.unrealized,
          principal: row.principal,
          interest_liability: row.interestLiability,
          cash: row.cash,
          voog_core_shares: row.voogShares,
          vgt_core_shares: row.vgtCoreShares,
          open_lots: row.openLots,
          owners: row.owners
        }))
      )
    );
    await fs.outputFile(
      evaluationDir('runs', configuration, `${mode}-5-signals.csv`),
      toCsv(
        result.signals.map((signal) => ({
          symbol: signal.symbol,
          date: signal.date,
          decision: new Date(signal.decisionTime * 1000).toISOString(),
          price: signal.decisionPrice,
          outcome: signal.outcome,
          reason: signal.reason,
          same_minute: signal.sameMinuteCandidates,
          principal: signal.principal,
          funded_lot: signal.trade?.fundedLotId ?? -1,
          virtual_net: signal.trade?.net ?? NaN
        }))
      )
    );
  }

  const record = {
    manifestHash: manifest.manifestHash,
    window: {
      first: dates[0],
      last: loaded.universe.end,
      sessions: loaded.universe.sessionCount,
      trainingEndIndex,
      holdoutEndIndex
    },
    configurations: configurations.map((item) => ({
      key: item.key,
      kind: item.kind,
      symbols: item.symbols,
      books: item.books.map((book) => ({ symbol: book.symbol, id: book.vector.id, grid: book.vector.grid }))
    })),
    summaries,
    ladder,
    comparisons,
    accepted,
    recommendation,
    parity,
    parityPassed: parity.every((row) => row.differences === 0)
  };
  const digest = createHash('sha256').update(JSON.stringify(record)).digest('hex');

  if (confirm) {
    const original = await readJson<{ digest: string }>(recordFile);

    await writeJson(evaluationDir('confirmation.json'), {
      generatedAt: new Date().toISOString(),
      digest,
      originalDigest: original.digest,
      identical: digest === original.digest
    });
    log(`confirmation: ${digest === original.digest ? 'identical' : 'DIFFERENT'} (${digest.slice(0, 12)})`);
    return;
  }

  await writeJson(recordFile, { generatedAt: new Date().toISOString(), digest, ...record });
  log(
    `evaluation: accepted ${accepted.join(', ') || 'none'}; recommendation ${recommendation}; parity ${record.parityPassed ? 'exact' : 'FAILED'}`
  );
};

// After the study: any frozen configuration on any partition, results to evaluations/joint-16-etf-d1/ (never into
// research/). `--config` is a nominee key of the manifest (N-primary, N-alt1, N-alt2) or B1/B4/B5/C0.
export const runFrozenConfiguration = async (args: string[]) => {
  const manifest = await readVerifiedSelection();
  const key = option(args, 'config') ?? 'N-primary';
  const mode = (option(args, 'mode') ?? 'fixed') as 'fixed' | 'portfolio';
  const partition = (option(args, 'dataset') ?? 'all') as 'training' | 'holdout' | 'final' | 'all';
  const costBps = Number(option(args, 'cost') ?? study.principalCostBps);
  const nominee = (manifest.nominees as FrozenNominee[]).find((item) => item.key === key);
  const configuration =
    nominee !== undefined ? nomineeConfiguration(nominee) : benchmarkConfigurations().find((item) => item.key === key);

  if (!configuration) {
    throw new Error(`${key} is not a frozen configuration of the manifest`);
  }

  if (!['fixed', 'portfolio'].includes(mode) || !['training', 'holdout', 'final', 'all'].includes(partition)) {
    throw new Error('--mode fixed|portfolio and --dataset training|holdout|final|all');
  }

  if (configuration.kind === 'core' && mode === 'fixed') {
    throw new Error('C0 (the empty trading pool) exists in portfolio mode only');
  }

  // An isolated holdout or final window starts flat after a warm-up of the books' longest lookback.
  const frozen = await frozenBenchmarkPhenotypes();
  const lookbacks = configuration.benchmark
    ? configuration.symbols.map((symbol) => frozen[symbol]!.params.tickWindowSize)
    : configuration.books.map((book) => book.vector.grid.tickWindowSize);
  const { loadNUniverse } = await import('../portfolio-aware-d1/nbook/universe.ts');
  const loaded = await loadNUniverse({
    members: [...new Set(mode === 'portfolio' ? ['VOOG', 'VGT', ...configuration.symbols] : configuration.symbols)],
    partition,
    access: 'manual evaluation',
    warmupSessions: partition === 'holdout' || partition === 'final' ? Math.max(0, ...lookbacks) : 0
  });
  const evaluator = new JointEvaluator(loaded);
  const result = await runOf(evaluator, loaded, configuration, mode, costBps);
  const summary = summaryOf(result);
  const out = `${postStudyDir}/${key}-${mode}-${partition}-${costBps}bps.json`;

  await writeJson(out, {
    generatedAt: new Date().toISOString(),
    key,
    mode,
    partition,
    costBps,
    summary,
    extras: extrasOf(result)
  });
  log(
    `${key} ${mode} ${partition} ${costBps} bps: net ${summary.net.toFixed(2)}, minute DD ${summary.minuteDrawdown.toFixed(2)}${
      mode === 'portfolio'
        ? `, end equity ${summary.endEquity.toFixed(2)}, daily % DD ${(100 * summary.dailyPercent).toFixed(2)}%`
        : ''
    } → ${out}`
  );
};
