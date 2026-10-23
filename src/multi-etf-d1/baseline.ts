// Section 1 of the brief: reproduce the unchanged D1 file exactly, then benchmark it on the eight tickers over the
// development window only.
//   parity     the D1 file itself on the full VGT file against the prior verified figures and against the engine
//              (arming from session 74 as the file does, and from the common eligibility session);
//   benchmark  per ticker, through the last 2023 session: the file itself (its own arming from session 74) against
//              the engine with the same arming, trade for trade; then the engine from the eligibility session (the
//              primary benchmark), with the differences between the two conventions listed;
//   profile    exact-minute throughput, in-process and on the worker pool, and the planned budget.
import path from 'node:path';
import fs from 'fs-extra';
import { runAllIn as runD1File } from '../app/allIn-trailingBuy-postExitContinuation.ts';
import type { BacktestPosition } from '#types';
import { type Dataset, computeReferenceHighs, firstIndexOnOrAfter } from '../four-family/data.ts';
import type { Trade } from '../d1-refinement/engine.ts';
import type { EvalSpec, Metrics } from '../d1-refinement/evaluate.ts';
import { diffTrades } from '../d1-refinement/report.ts';
import { type IntParams, d1Values } from '../d1-refinement/families.ts';
import { WorkerPool, defaultWorkerCount } from '../d1-refinement/pool.ts';
import { Rng } from '../optimizer/rng.ts';
import {
  type Ticker,
  formatDollars,
  log,
  option,
  pct,
  protocol,
  stageDir,
  tickersOf,
  writeJson,
  writeText
} from './context.ts';
import { type TickerData, loadDevelopment, loadReference } from './data.ts';
import { writeDetail } from './detail.ts';
import { cachesFor, developmentSpec, evaluateOne, fileNativeSpec, segmentOf, yearSegments } from './evaluation.ts';
import { box, d1Params, describe, genomeToParams, gridSizeOf, sobolDesign } from './space.ts';

const tolerance = 1e-6;
const nearly = (a: number, b: number) => Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

interface FileRun {
  positions: BacktestPosition[];
  entryFills: Map<
    BacktestPosition,
    { time: number; price: number; execution: string; decisionTime: number; setupKind?: string }
  >;
  exitFills: Map<BacktestPosition, { time: number; price: number; reason: string; execution: string }>;
  summary: Record<string, number | string | boolean | null>;
}

// The D1 file as shipped, silenced, writing its own outputs to `outDir`.
export const runFile = async (symbol: string, dataFile: string, outDir: string, endDate?: string): Promise<FileRun> => {
  const info = console.info;

  console.info = () => {};

  try {
    const result = await runD1File({ symbol, dataFile, outDir, endDate, stopFill: protocol.stopFill });
    const summary = JSON.parse(await fs.readFile(path.join(outDir, 'summary.json'), 'utf8')) as FileRun['summary'];

    return { positions: result.positions, entryFills: result.entryFills, exitFills: result.exitFills, summary };
  } finally {
    console.info = info;
  }
};

export interface ParityOutcome {
  trades: number;
  engineTrades: number;
  differences: string[];
  fileNet: number;
  engineNet: number;
  fileMinuteDrawdown: number;
  engineMinuteDrawdown: number;
}

// Every trade's sessions, minutes, prices, executions, reasons, profits and interest, the totals and both drawdowns.
export const compareFileToEngine = (
  ds: Dataset,
  file: FileRun,
  trades: Trade[],
  accounting: {
    outcomes: { profit: number; interest: number; isOpen: boolean }[];
    netProfit: number;
    realizedProfit: number;
    unrealizedProfit: number;
    closedInterest: number;
    accruedInterest: number;
    dailyDrawdown: { maximum: number };
    minuteDrawdown: { maximum: number };
  }
): ParityOutcome => {
  const differences: string[] = [];
  const check = (label: string, a: number | string | boolean, b: number | string | boolean) => {
    const same = typeof a === 'number' && typeof b === 'number' ? nearly(a, b) : a === b;

    if (!same) {
      differences.push(`${label}: file ${String(a)} vs engine ${String(b)}`);
    }
  };

  check('trade count', file.positions.length, trades.length);

  file.positions.forEach((position, index) => {
    const trade = trades[index];
    const outcome = accounting.outcomes[index];

    if (!trade || !outcome) {
      return;
    }

    const entryFill = file.entryFills.get(position)!;
    const exitFill = file.exitFills.get(position);

    check(`trade ${index + 1} entry session`, position.entryTimestamp, trade.entryTimestamp);
    check(`trade ${index + 1} entry time`, entryFill.time, trade.entryTime);
    check(`trade ${index + 1} entry price`, position.entryPrice, trade.entryPrice);
    check(`trade ${index + 1} entry execution`, entryFill.execution, trade.entryExecution);
    check(`trade ${index + 1} decision time`, entryFill.decisionTime, trade.decisionTime);
    check(`trade ${index + 1} kind`, entryFill.setupKind ?? trade.kind, trade.kind);
    check(`trade ${index + 1} open`, position.isOpen, trade.exitIndex < 0);

    if (!position.isOpen) {
      check(`trade ${index + 1} exit session`, position.exitTimestamp ?? NaN, ds.sTime[trade.exitIndex]!);
      check(`trade ${index + 1} exit time`, exitFill?.time ?? NaN, trade.exitTime);
      check(`trade ${index + 1} exit price`, position.exitPrice ?? NaN, trade.exitPrice);
      check(`trade ${index + 1} exit execution`, exitFill?.execution ?? '', trade.exitExecution);
      check(`trade ${index + 1} reason`, exitFill?.reason ?? '', trade.reason);
      check(`trade ${index + 1} profit`, position.profit ?? NaN, outcome.profit);
      check(`trade ${index + 1} interest`, position.interest ?? NaN, outcome.interest);
    }
  });

  const summary = file.summary as Record<string, number>;

  check('net profit', summary.netProfit!, accounting.netProfit);
  check('realized profit', summary.realizedProfit!, accounting.realizedProfit);
  check('unrealized profit', summary.unrealizedProfit!, accounting.unrealizedProfit);
  check('margin interest', summary.marginInterest!, accounting.closedInterest + accounting.accruedInterest);
  check('daily drawdown', summary.maximumDrawdown!, accounting.dailyDrawdown.maximum);
  check('minute drawdown', summary.minuteMaximumDrawdown!, accounting.minuteDrawdown.maximum);

  return {
    trades: file.positions.length,
    engineTrades: trades.length,
    differences,
    fileNet: summary.netProfit!,
    engineNet: accounting.netProfit,
    fileMinuteDrawdown: summary.minuteMaximumDrawdown!,
    engineMinuteDrawdown: accounting.minuteDrawdown.maximum
  };
};

const tradeLine = (ds: Dataset, trade: Trade, profit: number) =>
  `${ds.dates[trade.entryIndex]} ${trade.entryPriceObserved.toFixed(2)} → ${trade.exitIndex < 0 ? 'open' : `${ds.dates[trade.exitIndex]} ${trade.exitPriceObserved.toFixed(2)} (${trade.reason})`} ${formatDollars(profit)}`;

// VGT: the file on the full file against the prior figures, and the engine under both arming conventions.
export const runParity = async () => {
  const data = await loadReference();
  const { ds } = data;
  const caches = cachesFor(ds);
  const dir = stageDir('baseline', 'VGT');
  const file = await runFile(protocol.reference.symbol, protocol.reference.dataFile, path.join(dir, 'file-output'));
  const endIndex = ds.sessionCount - 1;
  const reusedStart = firstIndexOnOrAfter(ds, protocol.holdout.start);
  const specOf = (armStart: number, label: string): EvalSpec => ({
    label,
    stopFill: protocol.stopFill,
    marginInterestRate: protocol.marginInterestRate,
    armStart,
    endIndex,
    segments: [
      { label: 'full', start: armStart, end: endIndex },
      { label: 'development', start: Math.max(armStart, data.eligibility), end: data.developmentEnd },
      { label: 'reused-2024-2025', start: reusedStart, end: endIndex },
      ...yearSegments(ds, armStart, endIndex)
    ]
  });
  const params = d1Params();
  const fileNative = evaluateOne(ds, caches, params, specOf(d1Values.tickWindowSize!, 'vgt-file-native'), true);
  const eligible = evaluateOne(ds, caches, params, specOf(data.eligibility, 'vgt-eligibility'), true);
  const parityFileNative = compareFileToEngine(ds, file, fileNative.detail!.trades, fileNative.detail!.accounting);
  const parityEligible = compareFileToEngine(ds, file, eligible.detail!.trades, eligible.detail!.accounting);
  const reference = protocol.reference;
  const summary = file.summary as Record<string, number>;
  const referenceChecks = {
    net: {
      file: summary.netProfit,
      reference: reference.net,
      match: Math.abs(summary.netProfit! - reference.net) < 0.01
    },
    minuteDrawdown: {
      file: summary.minuteMaximumDrawdown,
      reference: reference.minuteDrawdown,
      match: Math.abs(summary.minuteMaximumDrawdown! - reference.minuteDrawdown) < 0.01
    },
    entries: {
      file: file.positions.length,
      reference: reference.entries,
      match: file.positions.length === reference.entries
    },
    openAtEnd: summary.openAtEnd
  };

  await writeDetail(
    path.join(dir, 'engine-eligibility'),
    ds,
    {
      ticker: 'VGT',
      label: 'D1 (engine, eligibility 2017-06-15)',
      role: 'control',
      params,
      dataHash: data.dataHash,
      dataFile: data.dataFile
    },
    specOf(data.eligibility, 'vgt-eligibility'),
    eligible.metrics,
    eligible.detail!,
    data.developmentEnd
  );

  const output = {
    ranAt: new Date().toISOString(),
    dataFile: data.dataFile,
    dataHash: data.dataHash,
    sessions: ds.sessionCount,
    firstSession: ds.firstDate,
    lastSession: ds.lastDate,
    d1Source: protocol.d1Source,
    params,
    description: describe(params),
    referenceChecks,
    file: {
      net: summary.netProfit,
      realized: summary.realizedProfit,
      unrealized: summary.unrealizedProfit,
      interest: summary.marginInterest,
      dailyDrawdown: summary.maximumDrawdown,
      minuteDrawdown: summary.minuteMaximumDrawdown,
      entries: file.positions.length,
      closed: summary.closedTrades,
      setupActivations: summary.setupActivations
    },
    engineFileNative: { armStart: d1Values.tickWindowSize, parity: parityFileNative, metrics: fileNative.metrics },
    engineEligibility: {
      armStart: data.eligibility,
      armStartDate: ds.dates[data.eligibility],
      parity: parityEligible,
      metrics: eligible.metrics
    },
    trades: eligible.detail!.trades.map((trade, index) =>
      tradeLine(ds, trade, eligible.detail!.accounting.outcomes[index]!.profit)
    )
  };

  await writeJson(path.join(dir, 'parity.json'), output);

  const lines = [
    `# VGT regression control (generated ${output.ranAt})`,
    '',
    `File: \`${protocol.d1Source}\` on \`${data.dataFile}\` (sha256 \`${data.dataHash}\`), ${ds.sessionCount} sessions ${ds.firstDate} → ${ds.lastDate}, stop fills, 11%, $100,000 per entry.`,
    '',
    '| Figure | File (this run) | Prior reference | Match |',
    '|---|---:|---:|---|',
    `| Net profit | $${summary.netProfit!.toFixed(2)} | $${reference.net.toFixed(2)} | ${referenceChecks.net.match ? 'yes' : 'NO'} |`,
    `| Minute-sampled maximum drawdown | $${summary.minuteMaximumDrawdown!.toFixed(2)} | $${reference.minuteDrawdown.toFixed(2)} | ${referenceChecks.minuteDrawdown.match ? 'yes' : 'NO'} |`,
    `| Entries (including the open one) | ${file.positions.length} | ${reference.entries} | ${referenceChecks.entries.match ? 'yes' : 'NO'} |`,
    '',
    `Engine, arming from session ${d1Values.tickWindowSize} as the file: ${parityFileNative.differences.length === 0 ? `identical on every trade field, the totals and both drawdowns (${parityFileNative.trades} trades)` : `${parityFileNative.differences.length} differences: ${parityFileNative.differences.slice(0, 8).join('; ')}`}.`,
    '',
    `Engine, arming from the common eligibility session ${ds.dates[data.eligibility]} (index ${data.eligibility}): ${parityEligible.differences.length === 0 ? `identical to the file (${parityEligible.trades} trades)` : `${parityEligible.differences.length} differences: ${parityEligible.differences.slice(0, 8).join('; ')}`}.`,
    '',
    `Development window (${ds.dates[data.eligibility]} → ${ds.dates[data.developmentEnd]}): net ${formatDollars(segmentOf(eligible.metrics, 'development')!.net)}, minute DD ${formatDollars(segmentOf(eligible.metrics, 'development')!.minuteDrawdown)}, ${segmentOf(eligible.metrics, 'development')!.entries} entries. 2024-01-02 → ${ds.lastDate} (previously inspected by earlier programs, not a holdout of this one): net ${formatDollars(segmentOf(eligible.metrics, 'reused-2024-2025')!.net)}.`,
    '',
    '## Trades (engine, eligibility run)',
    '',
    ...output.trades.map((line, index) => `${index + 1}. ${line}`)
  ];

  await writeText(path.join(dir, 'parity.md'), lines.join('\n'));
  log(
    `VGT: file $${summary.netProfit!.toFixed(2)} / $${summary.minuteMaximumDrawdown!.toFixed(2)} / ${file.positions.length} entries; reference match ${referenceChecks.net.match && referenceChecks.minuteDrawdown.match && referenceChecks.entries.match}; engine parity (74) ${parityFileNative.differences.length} differences, (365) ${parityEligible.differences.length} differences`
  );

  return output;
};

// XLF's 2016-09-19 distribution: sessions after the eligibility session whose rolling-L high is set by a session
// before the ex-date, and the largest relative distortion of that high, for the lookbacks the search can reach.
export const distributionExposure = (ds: Dataset, exDate: string, eligibility: number, developmentEnd: number) => {
  const exIndex = firstIndexOnOrAfter(ds, exDate);
  const rows: { lookback: number; affectedSessions: number; lastAffectedDate: string; maxDistortion: number }[] = [];

  for (let lookback = 150; lookback <= 250; lookback += 10) {
    let affected = 0;
    let lastDate = '';
    let maxDistortion = 0;

    for (let s = eligibility; s <= developmentEnd; s++) {
      const from = Math.max(0, s - lookback);

      if (from >= exIndex) {
        break;
      }

      let pre = -Infinity;
      let post = -Infinity;

      for (let k = from; k < s; k++) {
        if (k < exIndex) {
          pre = Math.max(pre, ds.sHigh[k]!);
        } else {
          post = Math.max(post, ds.sHigh[k]!);
        }
      }

      if (pre > post) {
        affected++;
        lastDate = ds.dates[s]!;
        maxDistortion = Math.max(maxDistortion, pre / post - 1);
      }
    }

    rows.push({ lookback, affectedSessions: affected, lastAffectedDate: lastDate, maxDistortion });
  }

  return { exDate, exIndex, rows };
};

export interface BenchmarkRow {
  ticker: string;
  dataHash: string;
  sessions: number;
  eligibilityIndex: number;
  developmentEndDate: string;
  fileParity: ParityOutcome;
  fileNative: Metrics;
  eligibility: Metrics;
  conventions: {
    preserved: number;
    altered: number;
    gained: number;
    lost: number;
    lostDates: string[];
    gainedDates: string[];
  };
  trades: string[];
}

export const runBenchmark = async (args: string[]) => {
  const rows: BenchmarkRow[] = [];
  const params = d1Params();
  let exposure: ReturnType<typeof distributionExposure> | undefined;

  for (const ticker of tickersOf(args)) {
    const data = await loadDevelopment(ticker);
    const { ds } = data;
    const caches = cachesFor(ds);
    const dir = stageDir('baseline', ticker);
    const spec = developmentSpec(data);
    const eligible = evaluateOne(ds, caches, params, spec, true);
    const nativeSpec = fileNativeSpec(data, d1Values.tickWindowSize!);
    const native = evaluateOne(ds, caches, params, nativeSpec, true);
    const file = await runFile(ticker, data.dataFile, path.join(dir, 'file-output'), protocol.developmentEnd);
    const parity = compareFileToEngine(ds, file, native.detail!.trades, native.detail!.accounting);
    const diff = diffTrades(ds, native.detail!.trades, eligible.detail!.trades);

    await writeDetail(
      path.join(dir, 'd1-development'),
      ds,
      {
        ticker,
        label: 'D1 unchanged (eligibility 2017-06-15)',
        role: 'control',
        params,
        dataHash: data.dataHash,
        dataFile: data.dataFile
      },
      spec,
      eligible.metrics,
      eligible.detail!,
      data.developmentEnd
    );
    await writeDetail(
      path.join(dir, 'd1-file-native'),
      ds,
      {
        ticker,
        label: 'D1 unchanged (file convention, arming from session 74)',
        role: 'control-file-native',
        params,
        dataHash: data.dataHash,
        dataFile: data.dataFile
      },
      nativeSpec,
      native.metrics,
      native.detail!,
      data.developmentEnd
    );

    if (ticker === 'XLF') {
      exposure = distributionExposure(ds, '2016-09-19', data.eligibility, data.developmentEnd);
    }

    rows.push({
      ticker,
      dataHash: data.dataHash,
      sessions: ds.sessionCount,
      eligibilityIndex: data.eligibility,
      developmentEndDate: ds.lastDate,
      fileParity: parity,
      fileNative: native.metrics,
      eligibility: eligible.metrics,
      conventions: {
        preserved: diff.preserved.length,
        altered: diff.altered.length,
        gained: diff.gained.length,
        lost: diff.lost.length,
        lostDates: diff.lost.map(diff.dates),
        gainedDates: diff.gained.map(diff.dates)
      },
      trades: eligible.detail!.trades.map((trade, index) =>
        tradeLine(ds, trade, eligible.detail!.accounting.outcomes[index]!.profit)
      )
    });
    log(
      `${ticker}: D1 development net ${formatDollars(eligible.metrics.net)}, minute DD ${formatDollars(eligible.metrics.minuteDrawdown)}, ${eligible.metrics.entries} entries; file parity (arming 74) ${parity.differences.length === 0 ? 'identical' : `${parity.differences.length} differences`}; conventions differ by ${diff.lost.length} lost / ${diff.gained.length} gained / ${diff.altered.length} altered trades`
    );
  }

  const output = {
    ranAt: new Date().toISOString(),
    params,
    description: describe(params),
    rows,
    xlfDistributionExposure: exposure
  };

  await writeJson(stageDir('baseline', 'benchmark.json'), output);
  await writeText(stageDir('baseline', 'benchmark.md'), benchmarkTables(output));
  log(`Wrote ${stageDir('baseline', 'benchmark.json')}`);

  return output;
};

const years = ['2017', '2018', '2019', '2020', '2021', '2022', '2023'];

export const benchmarkTables = (output: {
  ranAt: string;
  description: string;
  rows: BenchmarkRow[];
  xlfDistributionExposure?: ReturnType<typeof distributionExposure>;
}) => {
  const lines = [
    `# Unchanged D1 on the eight tickers, development window only (generated ${output.ranAt})`,
    '',
    `D1 = ${output.description}; $100,000 per entry, 11%, stop fills; one continuous run from the eligibility session 2017-06-15 through the last 2023 session; nothing after 2023-12-31 was read.`,
    '',
    '## File parity (the file as shipped, arming from session 74, through the last 2023 session)',
    '',
    '| Ticker | File trades | Engine trades | File net | Engine net | File minute DD | Engine minute DD | Differences |',
    '|---|---:|---:|---:|---:|---:|---:|---|',
    ...output.rows.map(
      (row) =>
        `| ${row.ticker} | ${row.fileParity.trades} | ${row.fileParity.engineTrades} | ${formatDollars(row.fileParity.fileNet)} | ${formatDollars(row.fileParity.engineNet)} | ${formatDollars(row.fileParity.fileMinuteDrawdown)} | ${formatDollars(row.fileParity.engineMinuteDrawdown)} | ${row.fileParity.differences.length === 0 ? 'none' : row.fileParity.differences.slice(0, 3).join('; ')} |`
    ),
    '',
    '## Development benchmark (eligibility 2017-06-15, the primary control)',
    '',
    '| Ticker | Net | Realized / unrealized | Interest | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net without best | Exposure | Avg hold | Exit reasons |',
    '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...output.rows.map((row) => {
      const m = row.eligibility;
      const reasons = Object.entries(m.exitReasons)
        .map(([reason, count]) => `${reason} ${count}`)
        .join(', ');

      return `| ${row.ticker} | ${formatDollars(m.net)} | ${m.openAtEnd ? 'open at the end' : 'all closed'} | ${formatDollars(m.interest)} | ${formatDollars(m.minuteDrawdown)} | ${formatDollars(m.dailyDrawdown)} | ${m.entries}${m.openAtEnd ? ' (1 open)' : ''} | ${m.wins}/${m.losses} | ${formatDollars(m.worstTrade)} | ${formatDollars(m.worstAdverseExcursion)} | ${formatDollars(m.bestTrade)} | ${formatDollars(m.netWithoutBestTrade)} | ${pct(m.exposure, 0)} | ${m.averageHoldDays.toFixed(0)} d | ${reasons} |`;
    }),
    '',
    '## Net by calendar year (eligibility run)',
    '',
    `| Ticker | ${years.join(' | ')} |`,
    `|---|${years.map(() => '---:').join('|')}|`,
    ...output.rows.map(
      (row) =>
        `| ${row.ticker} | ${years
          .map((year) => {
            const segment = segmentOf(row.eligibility, year);

            return segment ? `${formatDollars(segment.net)} (${segment.entries}e)` : '';
          })
          .join(' | ')} |`
    ),
    '',
    '## Arming conventions: the file (session 74) against the eligibility session (365)',
    '',
    '| Ticker | File-convention net (whole run from session 74) | Eligibility net | Preserved | Altered | Gained | Lost | Lost trades | Gained trades |',
    '|---|---:|---:|---:|---:|---:|---:|---|---|',
    ...output.rows.map(
      (row) =>
        `| ${row.ticker} | ${formatDollars(row.fileParity.fileNet)} | ${formatDollars(row.eligibility.net)} | ${row.conventions.preserved} | ${row.conventions.altered} | ${row.conventions.gained} | ${row.conventions.lost} | ${row.conventions.lostDates.join('; ')} | ${row.conventions.gainedDates.join('; ')} |`
    ),
    ''
  ];

  if (output.xlfDistributionExposure) {
    lines.push(
      '## XLF: exposure of the rolling reference high to the 2016-09-19 distribution (sessions after eligibility)'
    );
    lines.push('');
    lines.push(
      '| Lookback L | Sessions whose rolling high is a pre-distribution high | Last such session | Largest distortion of the high |'
    );
    lines.push('|---:|---:|---|---:|');

    for (const row of output.xlfDistributionExposure.rows) {
      lines.push(
        `| ${row.lookback} | ${row.affectedSessions} | ${row.lastAffectedDate || '—'} | ${pct(row.maxDistortion)} |`
      );
    }

    lines.push('');
  }

  lines.push('## Trades (eligibility run)');
  lines.push('');

  for (const row of output.rows) {
    lines.push(`### ${row.ticker}`);
    lines.push('');
    lines.push(...(row.trades.length > 0 ? row.trades.map((line, index) => `${index + 1}. ${line}`) : ['no trades']));
    lines.push('');
  }

  return lines.join('\n');
};

// Throughput of exact-minute evaluations, and the budget the protocol fixes from it.
export const runProfile = async (args: string[]) => {
  const results: Record<string, unknown>[] = [];
  const workers = option(args, 'workers') ? Number(option(args, 'workers')) : defaultWorkerCount();
  const pool = new WorkerPool({ size: workers });
  const sampleSize = 256;

  try {
    for (const ticker of tickersOf(args)) {
      const data = await loadDevelopment(ticker);
      const { ds } = data;
      const caches = cachesFor(ds);
      const spec = developmentSpec(data);
      const rng = Rng.from('multi-etf-d1', 'profile', ticker);
      const random: IntParams[] = [];

      for (let index = 0; index < 20; index++) {
        random.push(genomeToParams(box.map((spec) => rng.int(gridSizeOf(spec)))));
      }

      evaluateOne(ds, caches, d1Params(), spec);

      const started = performance.now();

      for (const params of random) {
        evaluateOne(ds, caches, params, spec);
      }

      const inProcessMs = (performance.now() - started) / random.length;

      pool.register(ds);

      const design = sobolDesign(ticker, sampleSize).genomes.map(genomeToParams);
      const poolStarted = performance.now();

      await pool.evaluate(ds.id, 'd1', spec, design);

      const poolMs = performance.now() - poolStarted;

      results.push({
        ticker,
        bars: ds.barCount,
        sessions: ds.sessionCount,
        inProcessMsPerEvaluation: inProcessMs,
        poolEvaluations: sampleSize,
        poolWallMs: poolMs,
        poolEvaluationsPerSecond: (sampleSize * 1000) / poolMs
      });
      log(
        `${ticker}: ${inProcessMs.toFixed(1)} ms per evaluation in-process; pool ${((sampleSize * 1000) / poolMs).toFixed(0)} evaluations/s on ${workers} workers`
      );
    }
  } finally {
    await pool.close();
  }

  const { search, selection } = protocol;
  const probeBudget =
    box.reduce((total, spec) => total + spec.probes.length, 0) * selection.maxShortlist * 2 * protocol.folds.length;
  const plannedPerTicker = search.sobolSamples + protocol.folds.length * search.maxEvaluationsPerFold + probeBudget;
  const meanRate =
    results.reduce((total, row) => total + (row.poolEvaluationsPerSecond as number), 0) / Math.max(1, results.length);
  const output = {
    ranAt: new Date().toISOString(),
    workers,
    results,
    budget: {
      sobolSamples: search.sobolSamples,
      folds: protocol.folds.length,
      maxEvaluationsPerFold: search.maxEvaluationsPerFold,
      probeBudgetUpperBound: probeBudget,
      plannedEvaluationsPerTickerUpperBound: plannedPerTicker,
      plannedEvaluationsAllTickersUpperBound: plannedPerTicker * 8,
      estimatedWallSecondsAllTickers: (plannedPerTicker * 8) / Math.max(1, meanRate)
    }
  };

  await writeJson(stageDir('profile', 'profile.json'), output);
  log(
    `Budget upper bound: ${plannedPerTicker.toLocaleString('en-US')} evaluations per ticker, about ${(output.budget.estimatedWallSecondsAllTickers / 60).toFixed(0)} minutes for all eight at ${meanRate.toFixed(0)} evaluations/s`
  );

  return output;
};

export const showCandidate = async (args: string[]) => {
  const ticker = (option(args, 'symbol') ?? 'XBI').toUpperCase() as Ticker;
  const data = await loadDevelopment(ticker);
  const { ds } = data;
  const caches = cachesFor(ds);
  const params = { ...d1Params() };

  for (const pair of (option(args, 'params') ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');

    params[key as keyof IntParams] = Number(value);
  }

  const { metrics, detail } = evaluateOne(ds, caches, params, developmentSpec(data), true);

  console.info(`${ticker}: ${describe(params)}`);
  console.info(
    `development net ${formatDollars(metrics.net)}, minute DD ${formatDollars(metrics.minuteDrawdown)}, daily DD ${formatDollars(metrics.dailyDrawdown)}, ${metrics.entries} entries, ${metrics.wins}/${metrics.losses}, interest ${formatDollars(metrics.interest)}, exposure ${pct(metrics.exposure, 0)}`
  );

  detail!.trades.forEach((trade, index) => {
    console.info(
      `  ${String(index + 1).padStart(2)} ${trade.kind.padEnd(12)} ${tradeLine(ds, trade, detail!.accounting.outcomes[index]!.profit)}`
    );
  });

  for (const segment of metrics.segments) {
    console.info(
      `  ${segment.label.padEnd(14)} ${segment.startDate} → ${segment.endDate}: net ${formatDollars(segment.net)}, DD ${formatDollars(segment.minuteDrawdown)}, ${segment.entries}e ${segment.wins}w ${segment.losses}l`
    );
  }
};
