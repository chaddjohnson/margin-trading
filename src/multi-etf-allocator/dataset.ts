// Explicit dataset evaluations of the allocator: `fixed` or `portfolio` with `--dataset training|holdout|final|all`.
//
// This is a separate path from the frozen protocol. Without --dataset every command runs exactly as PROTOCOL.md froze
// it: the archived legacy minute files (src/lib/archive.ts) with their pinned hashes, truncated at protocol.commonEnd,
// arming from protocol.eligibilityDate, results under research/multi-etf-allocator/results/. With --dataset:
// - every member (VOOG and the books' symbols) is read from its canonical data/<SYMBOL>/data.csv through the shared
//   loader (src/lib/evaluation.ts), over the same New York interval: the partition's window, and before it the same
//   warm-up sessions, as many as the books' longest lookback needs. The calendars must agree session by session
//   (dates and schedules, assembleUniverse); nothing is filled or repaired;
// - `all` is one continuous run over the whole files: there is no commonEnd truncation;
// - the books may arm from the window's first session or the protocol's eligibility date, whichever is later;
//   accounting (the portfolio's funding, P&L, interest, drawdown) starts at the close of the window's first session,
//   as the protocol starts at the close of 2016-01-04. Warm-up sessions are read only for the books' levels;
// - the distribution ledger was derived from the legacy files, so it covers ex-dates through protocol.commonEnd. A
//   window past it runs only with --allow-uncovered-distributions, and the record says that later distributions are
//   not modelled;
// - results go to evaluations/multi-etf-allocator/<dataset>/<run key>/ (or --out), never into research/, with
//   evaluation.json: the windows, hashes (data, partitions.json, distributions, config, phenotypes, D1 source),
//   the code revision and the access mode.
// Optimizers never come here: this is manual evaluation, and the protocol's frozen studies (run, stress, all, ...)
// refuse --dataset.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import {
  type DatasetPartition,
  type WindowReport,
  checkStrategyDefinition,
  datasetPartitions,
  describeWindow,
  isDatasetPartition,
  loadDatasetSessions,
  resolveDataset
} from '#lib';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../four-family/data.ts';
import { loadDistributions } from '../shared-margin-portfolio/data.ts';
import {
  type Security,
  configFile,
  d1Source,
  expectedHashes,
  files,
  pinnedRevisions,
  protocol,
  securities,
  sha256File
} from './context.ts';
import { type Instrument, type Universe, assembleUniverse } from './data.ts';
import type { RunConfig } from './engine.ts';

export const evaluationsRoot = 'evaluations/multi-etf-allocator';

// The last ex-date the distribution ledger can hold: it was derived from data through this date.
export const distributionCoverageEnd = protocol.commonEnd;

export const parseDatasetOption = (value: string | undefined): DatasetPartition | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!isDatasetPartition(value)) {
    throw new Error(`--dataset must be one of ${datasetPartitions.join(', ')}, not '${value}'`);
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

export interface DatasetUniverse {
  partition: DatasetPartition;
  universe: Universe;
  warmup: number; // the index of the window's first session
  windows: Partial<Record<Security, WindowReport>>;
  sparseSessions: Partial<Record<Security, number>>; // window sessions with fewer than half their regular minutes
  distributions: { file: string; sha256: string; lastExDate: string; coverageEnd: string; covered: boolean };
}

const scheduledMinutes = (session: MarketSession) => (session.closeTime - session.openTime) / 60;

// The members' sessions of one partition, aligned, with the warm-up before the window.
export const loadDatasetUniverse = async ({
  members,
  partition,
  warmupSessions,
  root = 'data',
  distributionsFile = files.distributions
}: {
  members: readonly Security[];
  partition: DatasetPartition;
  warmupSessions: number;
  root?: string;
  distributionsFile?: string;
}): Promise<DatasetUniverse> => {
  const instruments: Partial<Record<Security, Instrument>> = {};
  const windows: DatasetUniverse['windows'] = {};
  const sparseSessions: DatasetUniverse['sparseSessions'] = {};
  const hashes: Universe['hashes'] = {};
  let warmup: number | undefined;

  for (const symbol of securities.filter((candidate) => members.includes(candidate))) {
    const dataset = resolveDataset(symbol, partition, root);
    const run = await loadDatasetSessions({ dataset, warmupSessions });
    const report = run.report!;

    if (warmup !== undefined && run.warmup !== warmup) {
      throw new Error(
        `${symbol} has ${run.warmup} warm-up sessions, the other members ${warmup}: the calendars differ`
      );
    }

    warmup = run.warmup;
    windows[symbol] = report;
    hashes[symbol] = report.dataSha256!;
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

  const firstDate = first.evaluation.firstDate;
  const distributions = await loadDistributions(distributionsFile as typeof files.distributions);
  const distributionsHash = await sha256File(distributionsFile);

  hashes.distributions = distributionsHash;

  const universe = assembleUniverse(
    instruments,
    distributions,
    first.evaluation.lastDate,
    hashes,
    firstDate > protocol.eligibilityDate ? firstDate : protocol.eligibilityDate
  );

  return {
    partition,
    universe,
    warmup,
    windows,
    sparseSessions,
    distributions: {
      file: distributionsFile,
      sha256: distributionsHash,
      lastExDate: distributions.at(-1)?.exDate ?? '',
      coverageEnd: distributionCoverageEnd,
      covered: first.evaluation.lastDate <= distributionCoverageEnd
    }
  };
};

// The run's configuration on a dataset universe: arming from the universe's eligibility, accounting from the window.
export const datasetRunConfig = (config: RunConfig, loaded: DatasetUniverse): RunConfig => ({
  ...config,
  key: `${config.key}@${loaded.partition}`,
  label: `${config.label}, ${loaded.partition} dataset`,
  eligibilityIndex: loaded.universe.eligibilityIndex,
  accountingStartIndex: loaded.warmup
});

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

export const evaluationRecord = async (loaded: DatasetUniverse, config: RunConfig, outDir: string) => {
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

  return {
    accessMode: 'manual evaluation (--dataset); never an optimization input',
    dataset: loaded.partition,
    run: { key: config.key, mode: config.mode, policy: config.policy, label: config.label },
    outDir,
    window: {
      firstDate: loaded.universe.dates[loaded.warmup],
      lastDate: loaded.universe.end,
      sessions: loaded.universe.sessionCount - loaded.warmup,
      warmupSessions: loaded.warmup,
      warmupFirstDate: loaded.warmup > 0 ? loaded.universe.dates[0] : null,
      firstEligibleDate: loaded.universe.dates[loaded.universe.eligibilityIndex],
      accountingStart: `the close of ${loaded.universe.dates[loaded.warmup]}`
    },
    members: loaded.windows,
    sparseSessions: loaded.sparseSessions,
    distributions: loaded.distributions,
    hashes: {
      config: await sha256File(configFile),
      d1Source: d1,
      phenotypes
    },
    code: { gitHead: git('rev-parse', 'HEAD'), gitDirty: git('status', '--porcelain').length > 0 },
    protocolNote: `Not the frozen protocol run: canonical files, ${loaded.partition} window, no commonEnd truncation`
  };
};

export const describeDatasetUniverse = (loaded: DatasetUniverse) => [
  ...Object.values(loaded.windows).map((window) => describeWindow(window!)),
  `Arming from ${loaded.universe.dates[loaded.universe.eligibilityIndex]}; accounting from the close of ${loaded.universe.dates[loaded.warmup]}`,
  `Sparse window sessions (under half their minutes): ${Object.entries(loaded.sparseSessions)
    .map(([symbol, count]) => `${symbol} ${count}`)
    .join(', ')}`,
  `Distributions: ${loaded.distributions.file} (last ex-date ${loaded.distributions.lastExDate}, covers through ${loaded.distributions.coverageEnd})${loaded.distributions.covered ? '' : ' — NOT covering the window'}`
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
