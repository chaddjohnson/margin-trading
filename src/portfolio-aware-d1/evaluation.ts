// Stage D (PROTOCOL.md §7.2–§7.6): after FROZEN_SELECTION.json verifies, one continuous `all` run per frozen
// configuration on the full N-book engine (fixed and 20% portfolio, 0/2/5/10 bps; S0's ladder at 5 bps), every state
// carried across 2024-01-01 and 2025-10-17, attributed to training, holdout, final and all from the marked equity at
// the boundary closes; the replay checked against the full engine on the same runs (E4); the per-segment
// classification, the acceptance rules and the recommendation exactly as frozen. `--confirm` re-runs everything and
// checks the record is identical (the deterministic confirmation).
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { readPartitionConfig } from '#lib';
import { segmentRows } from '../multi-etf-allocator/segments.ts';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { log, readJson, stageDir, study, writeJson } from './context.ts';
import { evaluationUniverse } from './data.ts';
import { readVerifiedSelection, requireProtocolFrozen } from './freeze.ts';
import type { NRunResult } from './nbook/engine.ts';
import { replayAgainstFull } from './parity.ts';
import { type Configuration, configurationPhenotypes, interpolate, runConfiguration } from './stageC.ts';

type Frozen = Configuration & { status: 'control' | 'nominated' | 'comparator'; trainingDelta5: number };

const evaluationDir = (...parts: string[]) => stageDir('evaluation', ...parts);

const segmentsOf = (result: NRunResult) =>
  segmentRows(
    result as never,
    readPartitionConfig(),
    result.config.mode === 'portfolio' ? result.config.initial.voog + result.config.initial.vgt : 0
  );

const lotDays = (result: NRunResult, lot: NRunResult['lots'][number]) => {
  const { sTime } = Object.values(result.universe.instruments)[0]!.ds;

  return (sTime[lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex]! - lot.entryTimestamp) / 86400;
};

const summaryOf = (result: NRunResult, newSymbols: readonly string[]) => {
  const lots = result.lots;
  const last = result.daily.at(-1)!;

  return {
    lots: lots.length,
    virtualTrades: result.trades.length,
    net: lots.reduce((total, lot) => total + lot.net, 0),
    interest: lots.reduce((total, lot) => total + lot.interest, 0),
    openAtEnd: lots.filter((lot) => lot.exitIndex < 0).length,
    newLots: lots.filter((lot) => newSymbols.includes(lot.symbol)).length,
    newLotDays: lots
      .filter((lot) => newSymbols.includes(lot.symbol))
      .reduce((total, lot) => total + lotDays(result, lot), 0),
    worstLot: Math.min(0, ...lots.map((lot) => lot.net)),
    borrowingDollarDays: lots.reduce((total, lot) => total + lot.originalPrincipal * lotDays(result, lot), 0),
    minuteDrawdown: result.minuteDrawdown.maximum,
    minuteDrawdownPeak: result.minuteDrawdown.peakTime,
    minuteDrawdownTrough: result.minuteDrawdown.troughTime,
    dailyDrawdown: result.dailyDrawdown.maximum,
    endEquity: result.config.mode === 'portfolio' ? last.equity : NaN,
    dailyPercent: result.dailyPercentDrawdown?.maximumPercent ?? NaN,
    dailyPercentPeak: result.dailyPercentDrawdown?.peakTime ?? NaN,
    dailyPercentTrough: result.dailyPercentDrawdown?.troughTime ?? NaN,
    minutePercent: result.minutePercentDrawdown?.maximumPercent ?? NaN,
    segments: segmentsOf(result)
  };
};

// The trade-attribution bridge of a configuration against S0 (same mode and cost): the funded lots of each, matched
// by (symbol, virtual trade); S0 lots displaced, baseline lots gained, the new books' lots, by segment.
const bridgeOf = (result: NRunResult, s0: NRunResult, newSymbols: readonly string[]) => {
  const dates = Object.values(result.universe.instruments)[0]!.ds.dates;
  const partitions = readPartitionConfig();
  const segmentOf = (index: number) =>
    (['training', 'holdout', 'final'] as const).find((name) => {
      const interval = partitions.partitions[name];

      return (!interval.start || dates[index]! >= interval.start) && (!interval.end || dates[index]! <= interval.end);
    }) ?? 'all';
  const key = (lot: NRunResult['lots'][number]) => `${lot.symbol}#${lot.trade.id}`;
  const ours = new Map(result.lots.map((lot) => [key(lot), lot]));
  const theirs = new Map(s0.lots.map((lot) => [key(lot), lot]));
  const rows = [
    ...result.lots.filter((lot) => newSymbols.includes(lot.symbol)).map((lot) => ({ kind: 'new book', lot })),
    ...result.lots
      .filter((lot) => !newSymbols.includes(lot.symbol) && !theirs.has(key(lot)))
      .map((lot) => ({ kind: 'baseline gained', lot })),
    ...s0.lots.filter((lot) => !ours.has(key(lot))).map((lot) => ({ kind: 'S0 displaced', lot }))
  ].map(({ kind, lot }) => ({
    kind,
    symbol: lot.symbol,
    trade: lot.trade.id,
    segment: segmentOf(lot.entryIndex),
    decision: new Date(lot.decisionTime * 1000).toISOString(),
    entry: new Date(lot.entryTime * 1000).toISOString(),
    exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
    reason: lot.exitReason,
    net: lot.net,
    signedContribution: kind === 'S0 displaced' ? -lot.net : lot.net
  }));
  const total = (filter: (row: (typeof rows)[number]) => boolean) =>
    rows.filter(filter).reduce((sum, row) => sum + row.signedContribution, 0);

  return {
    rows,
    bySegment: Object.fromEntries(
      ['training', 'holdout', 'final'].map((segment) => [
        segment,
        {
          newBook: total((row) => row.segment === segment && row.kind === 'new book'),
          gained: total((row) => row.segment === segment && row.kind === 'baseline gained'),
          displaced: total((row) => row.segment === segment && row.kind === 'S0 displaced')
        }
      ])
    ),
    residual:
      result.lots.reduce((sum, lot) => sum + lot.net, 0) -
      s0.lots.reduce((sum, lot) => sum + lot.net, 0) -
      rows.reduce((sum, row) => sum + row.signedContribution, 0)
  };
};

const classify = (delta: number) =>
  delta >= study.acceptance.persistThreshold
    ? 'persists'
    : delta <= study.acceptance.reverseThreshold
      ? 'reverses'
      : 'disappears';

const segmentValue = (summary: ReturnType<typeof summaryOf>, segment: string, field: 'strategyPnl' | 'equityChange') =>
  summary.segments.find((row) => row.segment === segment)?.[field] ?? NaN;

export const runEvaluation = async (args: string[]) => {
  await requireProtocolFrozen();

  const manifest = await readVerifiedSelection();
  const configurations = manifest.configurations as Frozen[];
  const ranking = manifest.ranking as string[];
  const confirm = args.includes('--confirm');
  const recordFile = evaluationDir('evaluation.json');

  if (!confirm && (await fs.pathExists(recordFile))) {
    throw new Error(`${recordFile} exists: the evaluation runs once; use --confirm for the deterministic re-run`);
  }

  if (configurations.length <= 1) {
    await writeJson(recordFile, {
      generatedAt: new Date().toISOString(),
      manifestHash: manifest.manifestHash,
      note: 'The frozen selection holds S0 only: no candidate configuration exists, nothing is evaluated after training.'
    });
    log('no candidate configuration: nothing evaluated');
    return;
  }

  const members = [
    ...new Set([
      'VOOG',
      'VGT',
      'XBI',
      'XRT',
      'KRE',
      ...configurations.flatMap((item) => item.books.map((book) => book.symbol))
    ])
  ];
  const loaded = await evaluationUniverse(members);

  if (loaded.universe.end !== manifest.lastCommonSession) {
    throw new Error(`The all window ends ${loaded.universe.end}, not the frozen ${manifest.lastCommonSession}`);
  }

  const results = new Map<string, NRunResult>();
  const summaries: Record<string, Record<string, ReturnType<typeof summaryOf>>> = {};
  const parity: { key: string; costBps: number; differences: number; first: string[] }[] = [];

  for (const configuration of configurations) {
    summaries[configuration.key] = {};

    for (const mode of ['fixed', 'portfolio'] as const) {
      for (const costBps of study.costsBps) {
        const result = await runConfiguration(loaded, configuration, mode, costBps);
        const runKey = `${mode}-${costBps}`;

        results.set(`${configuration.key}:${runKey}`, result);
        summaries[configuration.key]![runKey] = summaryOf(result, configuration.newSymbols);

        if (mode === 'fixed') {
          const outcome = replayAgainstFull(
            loaded,
            configuration.books.map((book) => book.symbol),
            await configurationPhenotypes(configuration),
            costBps
          );

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

  const ladder = [];

  for (const fraction of study.stageC.ladderFractions) {
    const result = await runConfiguration(loaded, configurations[0]!, 'portfolio', study.principalCostBps, fraction);
    const summary = summaryOf(result, []);

    ladder.push({
      fraction,
      borrowingDollarDays: summary.borrowingDollarDays,
      endEquity: summary.endEquity,
      dailyPercent: summary.dailyPercent
    });
  }

  // Deltas, classification, acceptance.
  const s0 = summaries.S0!;
  const comparisons: Record<string, unknown> = {};
  const accepted: string[] = [];

  for (const configuration of configurations.slice(1)) {
    const own = summaries[configuration.key]!;
    const fixedDelta = (costBps: number, segment: string) =>
      segmentValue(own[`fixed-${costBps}`]!, segment, 'strategyPnl') -
      segmentValue(s0[`fixed-${costBps}`]!, segment, 'strategyPnl');
    const portfolioDelta = (costBps: number, segment: string) =>
      segmentValue(own[`portfolio-${costBps}`]!, segment, 'equityChange') -
      segmentValue(s0[`portfolio-${costBps}`]!, segment, 'equityChange');
    const bySegment = Object.fromEntries(
      study.costsBps.map((costBps) => [
        costBps,
        Object.fromEntries(
          ['development', 'holdout', 'final', 'full'].map((segment) => [
            segment,
            { fixed: fixedDelta(costBps, segment), portfolio: portfolioDelta(costBps, segment) }
          ])
        )
      ])
    );
    const post = (costBps: number) => fixedDelta(costBps, 'holdout') + fixedDelta(costBps, 'final');
    const portfolioPost =
      portfolioDelta(study.principalCostBps, 'holdout') + portfolioDelta(study.principalCostBps, 'final');
    const holdoutClass = classify(fixedDelta(study.principalCostBps, 'holdout'));
    const finalClass = classify(fixedDelta(study.principalCostBps, 'final'));
    const portfolio5 = own[`portfolio-${study.principalCostBps}`]!;
    const s0Portfolio5 = s0[`portfolio-${study.principalCostBps}`]!;
    const fixed5 = own[`fixed-${study.principalCostBps}`]!;
    const rules = {
      postTrainingDelta5: post(study.principalCostBps) > 0,
      postTrainingDelta10: post(10) > 0,
      holdoutPersists: holdoutClass === 'persists',
      finalNotReversed: finalClass !== 'reverses',
      portfolioPostTraining: portfolioPost > 0,
      dailyPercentCeiling:
        portfolio5.dailyPercent <= study.gates.percentDrawdownCeiling &&
        portfolio5.dailyPercent <= s0Portfolio5.dailyPercent + study.gates.dailyPercentTolerance,
      fixedDrawdownCeiling: fixed5.minuteDrawdown <= study.drawdownCeiling
    };
    const isAccepted = configuration.status === 'nominated' && Object.values(rules).every(Boolean);
    const matched = interpolate(
      ladder.map((point) => ({ x: point.borrowingDollarDays, y: point.endEquity })),
      portfolio5.borrowingDollarDays
    );
    const bridge = bridgeOf(
      results.get(`${configuration.key}:fixed-${study.principalCostBps}`)!,
      results.get(`S0:fixed-${study.principalCostBps}`)!,
      configuration.newSymbols
    );
    // The omitted distributions of the new books' lots (price-only convention): the annual yield on the lots'
    // principal-days that would add as much as the post-training fixed Δ@5 lacks to be positive, by segment.
    const newLotDays = (segment: string) =>
      bridge.rows
        .filter((row) => row.kind === 'new book' && row.segment === segment)
        .reduce((sum, row) => {
          const lot = results
            .get(`${configuration.key}:fixed-${study.principalCostBps}`)!
            .lots.find((candidate) => candidate.symbol === row.symbol && candidate.trade.id === row.trade)!;

          return sum + lotDays(results.get(`${configuration.key}:fixed-${study.principalCostBps}`)!, lot);
        }, 0);
    const distributionBound = Object.fromEntries(
      ['training', 'holdout', 'final'].map((segment) => {
        const days = newLotDays(segment);
        const delta = fixedDelta(study.principalCostBps, segment === 'training' ? 'development' : segment);

        return [
          segment,
          {
            newLotDays: days,
            perPercentYield: (study.principal * 0.01 * days) / 365,
            breakEvenYield: delta < 0 && days > 0 ? -delta / ((study.principal * days) / 365) : null
          }
        ];
      })
    );

    if (isAccepted) {
      accepted.push(configuration.key);
    }

    comparisons[configuration.key] = {
      status: configuration.status,
      trainingDelta5: configuration.trainingDelta5,
      bySegment,
      postTraining: Object.fromEntries(study.costsBps.map((costBps) => [costBps, post(costBps)])),
      portfolioPostTraining5: portfolioPost,
      holdout: holdoutClass,
      final: finalClass,
      rules,
      accepted: isAccepted,
      matchedBorrowing: {
        borrowingDollarDays: portfolio5.borrowingDollarDays,
        s0Interpolated: matched.value,
        extrapolated: matched.extrapolated,
        delta: portfolio5.endEquity - matched.value
      },
      bridge: { bySegment: bridge.bySegment, residual: bridge.residual, lots: bridge.rows.length },
      distributionBound
    };
    await fs.outputFile(evaluationDir('bridges', `${configuration.key}.csv`), toCsv(bridge.rows));
  }

  const recommendation = ranking.find((key) => accepted.includes(key)) ?? 'S0';

  for (const [key, result] of results) {
    const [configuration, run] = key.split(':') as [string, string];

    await fs.outputFile(
      evaluationDir('runs', configuration, `${run}-lots.csv`),
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
          interest: lot.interest,
          net: lot.net
        }))
      )
    );
    await fs.outputFile(
      evaluationDir('runs', configuration, `${run}-daily.csv`),
      toCsv(
        result.daily.map((row) => ({
          date: row.date,
          equity: row.equity,
          strategy_mark: row.strategyMark,
          realized: row.realized,
          unrealized: row.unrealized,
          principal: row.principal,
          open_lots: row.openLots,
          owners: row.owners
        }))
      )
    );
  }

  const record = {
    manifestHash: manifest.manifestHash,
    window: { first: loaded.universe.dates[0], last: loaded.universe.end, sessions: loaded.universe.sessionCount },
    configurations: configurations.map((item) => ({ key: item.key, status: item.status, books: item.books })),
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

// Post hoc and non-decisional (after the frozen evaluation): every post-training virtual trade of each frozen
// configuration's new books at 5 bps (fixed), with the allocator's answer and the holder of a refused signal. It
// explains the post-training deltas; it selects, ranks and changes nothing.
export const runPostHoc = async () => {
  await requireProtocolFrozen();

  const manifest = await readVerifiedSelection();
  const configurations = (manifest.configurations as Frozen[]).filter((item) => item.newSymbols.length > 0);
  const members = [
    ...new Set(['VGT', 'XBI', 'XRT', 'KRE', ...configurations.flatMap((item) => item.books.map((book) => book.symbol))])
  ];
  const loaded = await evaluationUniverse(members);
  const trainingEnd = study.trainingEnd;
  const rows: Record<string, unknown>[] = [];

  for (const configuration of configurations) {
    const result = await runConfiguration(loaded, configuration, 'fixed', study.principalCostBps);
    const dates = loaded.universe.dates;

    for (const signal of result.signals) {
      if (configuration.newSymbols.includes(signal.symbol) && signal.date > trainingEnd) {
        rows.push({
          configuration: configuration.key,
          symbol: signal.symbol,
          decision: new Date(signal.decisionTime * 1000).toISOString(),
          outcome: signal.outcome,
          heldBy: signal.occupiedBy,
          entry: signal.trade && signal.trade.entryIndex >= 0 ? dates[signal.trade.entryIndex] : '',
          exit: signal.trade && signal.trade.exitIndex >= 0 ? dates[signal.trade.exitIndex] : 'open',
          reason: signal.trade?.exitReason ?? '',
          virtualNet: signal.trade?.net ?? NaN
        });
      }
    }
  }

  await fs.outputFile(evaluationDir('post-hoc-new-book-signals.csv'), toCsv(rows));
  log(`post hoc: ${rows.length} post-training signals of the new books`);
};

// After the study: one frozen configuration on one partition in one mode, for manual use and future forward tests
// (`npm run portfolio-aware-d1 -- run --config P-add-GDX --mode portfolio --dataset all --cost 5`). Only the frozen
// configurations exist; results go to evaluations/portfolio-aware-d1/<dataset>/<config>-<mode>-<cost>bps/, never into
// research/. An isolated holdout or final window starts flat after a warm-up of the books' longest lookback.
export const runFrozenConfiguration = async (args: string[]) => {
  const value = (name: string) => {
    const index = args.indexOf(`--${name}`);

    return index >= 0 ? args[index + 1] : undefined;
  };
  const manifest = await readVerifiedSelection();
  const key = value('config') ?? '';
  const configuration = (manifest.configurations as Frozen[]).find((item) => item.key === key);

  if (!configuration) {
    throw new Error(
      `--config must be one of ${(manifest.configurations as Frozen[]).map((item) => item.key).join(', ')}`
    );
  }

  const mode = (value('mode') ?? 'fixed') as 'fixed' | 'portfolio';
  const dataset = (value('dataset') ?? 'all') as 'training' | 'holdout' | 'final' | 'all';
  const costBps = Number(value('cost') ?? study.principalCostBps);

  if (!['fixed', 'portfolio'].includes(mode) || !['training', 'holdout', 'final', 'all'].includes(dataset)) {
    throw new Error('--mode fixed|portfolio and --dataset training|holdout|final|all');
  }

  if (!(costBps >= 0)) {
    throw new Error('--cost must be a non-negative number of basis points per side');
  }

  const phenotypes = await configurationPhenotypes(configuration);
  const symbols = configuration.books.map((book) => book.symbol);
  const warmup = Math.max(...symbols.map((symbol) => phenotypes[symbol]!.params.tickWindowSize));
  const { loadNUniverse } = await import('./nbook/universe.ts');
  const loaded = await loadNUniverse({
    members: mode === 'portfolio' ? ['VOOG', ...new Set(['VGT', ...symbols])] : symbols,
    partition: dataset,
    access: 'manual evaluation',
    warmupSessions: dataset === 'holdout' || dataset === 'final' ? warmup : 0
  });
  const result = await runConfiguration(loaded, configuration, mode, costBps);
  const summary = summaryOf(result, configuration.newSymbols);
  const out = path.join('evaluations/portfolio-aware-d1', dataset, `${configuration.key}-${mode}-${costBps}bps`);

  await writeJson(path.join(out, 'summary.json'), {
    configuration: configuration.key,
    books: configuration.books,
    mode,
    dataset,
    costBps,
    window: { first: loaded.universe.dates[loaded.warmup], last: loaded.universe.end, warmup: loaded.warmup },
    ...summary
  });
  await fs.outputFile(
    path.join(out, 'lots.csv'),
    toCsv(
      result.lots.map((lot) => ({
        symbol: lot.symbol,
        decision: new Date(lot.decisionTime * 1000).toISOString(),
        entry: new Date(lot.entryTime * 1000).toISOString(),
        exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
        reason: lot.exitReason,
        principal: lot.originalPrincipal,
        interest: lot.interest,
        net: lot.net
      }))
    )
  );
  log(
    `${configuration.key} ${mode} ${dataset} ${costBps} bps: ${summary.lots} lots, net ${Math.round(summary.net)}${mode === 'portfolio' ? `, ending equity ${Math.round(summary.endEquity)}, max % DD ${(summary.dailyPercent * 100).toFixed(2)}% daily / ${(summary.minutePercent * 100).toFixed(2)}% minute` : `, minute DD ${Math.round(summary.minuteDrawdown)}`} → ${out}`
  );
};
