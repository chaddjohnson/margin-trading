// Explicit dataset evaluations of the allocator: `fixed` or `portfolio` with `--dataset training|holdout|final|all`.
//
// This is a separate path from the frozen protocol. Without --dataset every command runs exactly as PROTOCOL.md froze
// it: the archived legacy minute files (src/lib/archive.ts) with their pinned hashes, truncated at protocol.commonEnd,
// arming from protocol.eligibilityDate, the frozen distribution ledger, results under research/multi-etf-allocator/
// results/. With --dataset:
// - every member (VOOG and the books' symbols) is read from its canonical data/<SYMBOL>/data.csv through the shared
//   loader (src/lib/evaluation.ts), over the same New York interval: the partition's window (narrowed by `--end`, a
//   diagnostic for comparing with an earlier endpoint), and before it the same warm-up sessions, as many as the
//   books' longest lookback needs. The calendars must agree session by session (dates and schedules,
//   assembleUniverse); nothing is filled or repaired;
// - `all` is one continuous run over the whole files: there is no commonEnd truncation and nothing resets at the
//   partition boundaries;
// - recorded share splits (config/market-events/splits.json) are forward-adjusted: prices from a split on × ratio,
//   volumes ÷ ratio, and per-share distributions with ex-dates from it on × ratio, so values, cost bases and P&L
//   are those of the multiplied shares and the split itself moves nothing (src/lib/corporateActions.ts);
// - the books may arm from the window's first session or the protocol's eligibility date, whichever is later;
//   accounting (the portfolio's funding, P&L, interest, drawdown) starts at the close of the window's first session,
//   as the protocol starts at the close of 2016-01-04. Warm-up sessions are read only for the books' levels;
// - distributions come from the verified ledger config/market-events/distributions.csv (the frozen ledger's rows
//   verbatim, then the issuer's; src/market-events/ledger.ts). Only the portfolio mode books distributions, and it
//   refuses a window past the ledger's coverage unless --allow-uncovered-distributions is given, which the record
//   states;
// - results go to evaluations/multi-etf-allocator/<dataset>/<run key>/ (or --out), never into research/, with
//   evaluation.json: the windows, hashes (data, partitions.json, ledger, config, phenotypes, D1 source), splits,
//   coverage, segments, the command line, the code revision and the access mode.
// Optimizers never come here: this is manual evaluation, and the protocol's frozen studies (run, stress, all, ...)
// refuse --dataset.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import {
  type DatasetPartition,
  type SplitAdjustment,
  type SplitEvent,
  type WindowReport,
  checkStrategyDefinition,
  datasetPartitions,
  describeWindow,
  isDatasetPartition,
  isNewYorkDate,
  loadDatasetSessions,
  readSplits,
  resolveDataset,
  splitFactor
} from '#lib';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../four-family/data.ts';
import { type LedgerRow, ledgerFile, readVerifiedLedger } from '../market-events/ledger.ts';
import type { Distribution } from '../shared-margin-portfolio/data.ts';
import {
  type Security,
  configFile,
  d1Source,
  expectedHashes,
  pinnedRevisions,
  protocol,
  securities,
  sha256File
} from './context.ts';
import { type Instrument, type Universe, assembleUniverse } from './data.ts';
import type { Mode, RunConfig } from './engine.ts';

export const evaluationsRoot = 'evaluations/multi-etf-allocator';

export const parseDatasetOption = (value: string | undefined): DatasetPartition | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!isDatasetPartition(value)) {
    throw new Error(`--dataset must be one of ${datasetPartitions.join(', ')}, not '${value}'`);
  }

  return value;
};

export const parseEndOption = (value: string | undefined) => {
  if (value !== undefined && !isNewYorkDate(value)) {
    throw new Error(`--end must be a YYYY-MM-DD New York trading date, not '${value}'`);
  }

  return value;
};

// The warm-up the books need: their longest lookback in sessions (the deep path's reference high, the swing path's
// rolling low). Continuation windows and stops come from trades and are never warmed up.
export const warmupSessionsOf = (config: Pick<RunConfig, 'phenotypes' | 'symbols'>) =>
  Math.max(
    0,
    ...config.symbols.flatMap((symbol) => {
      const { params } = config.phenotypes[symbol];

      return [params.tickWindowSize, Number.isFinite(params.swingLookback) ? params.swingLookback : 0];
    })
  );

// A distribution ledger: its rows as distributions (amounts as published), and the date it is complete through.
export interface DistributionLedger {
  file: string;
  sha256: string;
  distributions: Distribution[];
  coverage: Record<'VGT' | 'VOOG', string>;
}

const distributionOf = (row: LedgerRow): Distribution => ({
  etf: row.etf,
  exDate: row.exDate,
  payDate: row.payDate,
  amount: Number(row.amount),
  amountMethod: row.amountMethod,
  exDateMethod: row.exDateMethod,
  payDateMethod: row.payDateMethod,
  closeBefore: Number(row.closeBefore)
});

export const readDistributionLedger = async (): Promise<DistributionLedger> => {
  const { rows, manifest, sha256 } = await readVerifiedLedger();

  return {
    file: ledgerFile,
    sha256,
    distributions: rows.map(distributionOf),
    coverage: { VGT: manifest.coverage.VGT.through, VOOG: manifest.coverage.VOOG.through }
  };
};

export interface DatasetUniverse {
  partition: DatasetPartition;
  endDate?: string;
  mode: Mode;
  universe: Universe;
  warmup: number; // the index of the window's first session
  windows: Partial<Record<Security, WindowReport>>;
  sparseSessions: Partial<Record<Security, number>>; // window sessions with fewer than half their regular minutes
  splits: SplitAdjustment[];
  distributions: {
    used: boolean; // only the portfolio mode books distributions
    file: string;
    sha256: string;
    lastExDate: string;
    coverage: Record<'VGT' | 'VOOG', string>;
    covered: boolean;
    adjusted: { etf: string; exDate: string; published: number; adjusted: number; factor: number }[];
  };
}

const scheduledMinutes = (session: MarketSession) => (session.closeTime - session.openTime) / 60;

// The members' sessions of one partition, aligned, with the warm-up before the window.
export const loadDatasetUniverse = async ({
  members,
  partition,
  warmupSessions,
  mode,
  endDate,
  root = 'data',
  ledger,
  splits = readSplits()
}: {
  members: readonly Security[];
  partition: DatasetPartition;
  warmupSessions: number;
  mode: Mode;
  endDate?: string;
  root?: string;
  ledger?: DistributionLedger;
  splits?: readonly SplitEvent[];
}): Promise<DatasetUniverse> => {
  const instruments: Partial<Record<Security, Instrument>> = {};
  const windows: DatasetUniverse['windows'] = {};
  const sparseSessions: DatasetUniverse['sparseSessions'] = {};
  const hashes: Universe['hashes'] = {};
  const applied: SplitAdjustment[] = [];
  let warmup: number | undefined;

  for (const symbol of securities.filter((candidate) => members.includes(candidate))) {
    const dataset = resolveDataset(symbol, partition, root);
    const run = await loadDatasetSessions({ dataset, endDate, warmupSessions, splits });
    const report = run.report!;

    if (warmup !== undefined && run.warmup !== warmup) {
      throw new Error(
        `${symbol} has ${run.warmup} warm-up sessions, the other members ${warmup}: the calendars differ`
      );
    }

    warmup = run.warmup;
    windows[symbol] = report;
    hashes[symbol] = report.dataSha256!;
    applied.push(...report.splitAdjustments);
    sparseSessions[symbol] = run.sessions.filter(
      (session) => session.bars.length < 0.5 * scheduledMinutes(session)
    ).length;

    const ds = fixtureDataset(run.history);

    ds.id = `${symbol}:${report.dataSha256!.slice(0, 16)}:${partition}:${ds.lastDate}`;
    ds.dataHash = report.dataSha256!;
    instruments[symbol] = { symbol, file: dataset.file, hash: report.dataSha256!, ds };
  }

  const first = Object.values(windows)[0];

  if (!first || warmup === undefined) {
    throw new Error('A dataset evaluation needs at least one member');
  }

  const source = ledger ?? (await readDistributionLedger());
  const baseDate = Object.values(instruments)[0]!.ds.dates[0]!;
  const lastDate = first.evaluation.lastDate;
  // Per-share amounts in the run's share units: × every split between the run's first session and the ex-date.
  const adjusted: DatasetUniverse['distributions']['adjusted'] = [];
  const distributions = source.distributions.map((distribution) => {
    const factor = splitFactor(splits, distribution.etf, baseDate, distribution.exDate);

    if (factor === 1) {
      return distribution;
    }

    adjusted.push({
      etf: distribution.etf,
      exDate: distribution.exDate,
      published: distribution.amount,
      adjusted: distribution.amount * factor,
      factor
    });
    return { ...distribution, amount: distribution.amount * factor };
  });

  hashes.distributions = source.sha256;

  const firstDate = first.evaluation.firstDate;
  const universe = assembleUniverse(
    instruments,
    distributions,
    lastDate,
    hashes,
    firstDate > protocol.eligibilityDate ? firstDate : protocol.eligibilityDate
  );

  return {
    partition,
    endDate,
    mode,
    universe,
    warmup,
    windows,
    sparseSessions,
    splits: applied,
    distributions: {
      used: mode === 'portfolio',
      file: source.file,
      sha256: source.sha256,
      lastExDate: source.distributions.at(-1)?.exDate ?? '',
      coverage: source.coverage,
      covered: lastDate <= source.coverage.VGT && lastDate <= source.coverage.VOOG,
      adjusted: adjusted.filter((row) => row.exDate <= lastDate)
    }
  };
};

// The run's configuration on a dataset universe: arming from the universe's eligibility, accounting from the window.
export const datasetRunConfig = (config: RunConfig, loaded: DatasetUniverse): RunConfig => ({
  ...config,
  key: `${config.key}@${loaded.partition}${loaded.endDate ? `-to-${loaded.endDate}` : ''}`,
  label: `${config.label}, ${loaded.partition} dataset${loaded.endDate ? ` through ${loaded.endDate}` : ''}`,
  eligibilityIndex: loaded.universe.eligibilityIndex,
  accountingStartIndex: loaded.warmup
});

// The refusal of a window the ledger can't show complete, when the run books distributions.
export const coverageRefusal = (loaded: DatasetUniverse, allowUncovered: boolean) =>
  !loaded.distributions.used || loaded.distributions.covered || allowUncovered
    ? undefined
    : `The ${loaded.partition} window ends ${loaded.universe.end}, after the distribution ledger's coverage (VGT ${loaded.distributions.coverage.VGT}, VOOG ${loaded.distributions.coverage.VOOG}): later VGT/VOOG distributions are not verified. Run \`npm run market-events -- update\` to extend the ledger from the issuer; --allow-uncovered-distributions runs anyway, and the record says so`;

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

export const evaluationRecord = async (loaded: DatasetUniverse, config: RunConfig, outDir: string, argv: string[]) => {
  const d1 = await checkStrategyDefinition(d1Source, expectedHashes.d1Source, pinnedRevisions.d1Source);
  const phenotypes = Object.fromEntries(
    config.symbols.map((symbol) => [
      symbol,
      {
        name: config.phenotypes[symbol].name,
        file: config.phenotypes[symbol].file,
        sha256: config.phenotypes[symbol].fileHash
      }
    ])
  );
  const firstWindow = Object.values(loaded.windows)[0]!;

  return {
    accessMode: 'manual evaluation (--dataset); never an optimization input',
    commandLine: `npm run multi-etf-allocator -- ${argv.join(' ')}`,
    dataset: loaded.partition,
    endOption: loaded.endDate ?? null,
    run: { key: config.key, mode: config.mode, policy: config.policy, label: config.label },
    outDir,
    window: {
      firstDate: loaded.universe.dates[loaded.warmup],
      lastDate: loaded.universe.end,
      lastValuationDate: loaded.universe.end,
      sessions: loaded.universe.sessionCount - loaded.warmup,
      warmupSessions: loaded.warmup,
      warmupFirstDate: loaded.warmup > 0 ? loaded.universe.dates[0] : null,
      firstEligibleDate: loaded.universe.dates[loaded.universe.eligibilityIndex],
      accountingStart: `the close of ${loaded.universe.dates[loaded.warmup]}`,
      continuity:
        firstWindow.mode === 'continuous all'
          ? 'one continuous run: positions, debt, stops, setups and drawdown carry across 2024-01-01 and 2025-10-17'
          : 'an isolated window: starts flat after its observational warm-up'
    },
    partitions: { file: firstWindow.partitionsFile, sha256: firstWindow.partitionsSha256 },
    members: loaded.windows,
    sparseSessions: loaded.sparseSessions,
    splits: loaded.splits,
    distributions: loaded.distributions,
    hashes: {
      config: await sha256File(configFile),
      d1Source: d1,
      phenotypes
    },
    code: { gitHead: git('rev-parse', 'HEAD'), gitDirty: git('status', '--porcelain').length > 0 },
    protocolNote: `Not the frozen protocol run: canonical files, ${loaded.partition} window${loaded.endDate ? ` through ${loaded.endDate}` : ''}, no commonEnd truncation`
  };
};

export const describeDatasetUniverse = (loaded: DatasetUniverse) => [
  ...Object.values(loaded.windows).map((window) => describeWindow(window!)),
  `Arming from ${loaded.universe.dates[loaded.universe.eligibilityIndex]}; accounting from the close of ${loaded.universe.dates[loaded.warmup]}; last valuation ${loaded.universe.end}`,
  `Sparse window sessions (under half their minutes): ${Object.entries(loaded.sparseSessions)
    .map(([symbol, count]) => `${symbol} ${count}`)
    .join(', ')}`,
  loaded.distributions.used
    ? `Distributions: ${loaded.distributions.file} (sha256 ${loaded.distributions.sha256.slice(0, 16)}, last ex-date ${loaded.distributions.lastExDate}, covers VGT through ${loaded.distributions.coverage.VGT} and VOOG through ${loaded.distributions.coverage.VOOG})${loaded.distributions.covered ? '' : ' — NOT covering the window'}; ${loaded.distributions.adjusted.length} split-adjusted`
    : 'Distributions: not booked in fixed mode'
];

export const datasetOutDir = (partition: DatasetPartition, key: string, out?: string) =>
  out ?? path.join(evaluationsRoot, partition, key);

export const assertOutsideResearch = (dir: string) => {
  if (path.resolve(dir).startsWith(`${path.resolve('research')}${path.sep}`)) {
    throw new Error(
      `Refusing to write a --dataset evaluation into ${dir}: research/ holds the frozen protocol's results`
    );
  }
};

export const writeEvaluationRecord = async (dir: string, record: unknown) =>
  fs.outputFile(path.join(dir, 'evaluation.json'), `${JSON.stringify(record, null, 1)}\n`);
