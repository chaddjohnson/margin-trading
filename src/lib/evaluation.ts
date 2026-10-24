// The sessions of a run: its evaluation window, and the warm-up sessions before it.
//
// A run that selects a partition (src/lib/dataset.ts) is evaluated on the partition's New York trading dates,
// narrowed by an optional start and end date that must lie inside the partition. Before the window it may read up to
// `warmupSessions` strictly earlier sessions of the same canonical file: the history its rolling windows (the
// reference high, the swing low) need on the window's first session. Warm-up is observational only: a strategy reads
// those sessions' prices through `history`, never trades, marks, accrues interest or records drawdown in them, and
// inherits no position, setup, stop, restriction, episode or continuation window from them. Each strategy's arming
// guard still counts its lookback in sessions of `history`, so with fewer warm-up sessions than it needs (at the start
// of the file) it waits inside the window, as a cold start always did.
//
// - training starts at the file's first row, so a training run without a start date has no warm-up and is the same
//   run as before the warm-up existed;
// - all is one continuous run over the whole file: positions, state, interest and drawdowns carry across the former
//   partition boundaries, so a holdout or final run is NOT the matching segment of an all run (it starts flat);
// - an explicit data file is read as before: its sessions filtered by the dates, no partition, no warm-up.
//
// Warm-up never widens the evaluation window: every result, metric and decision comes from the window's sessions,
// and nothing after the window's last date is loaded or read.
import type { MarketSession, Tick } from '#types';
import { type SplitAdjustment, type SplitEvent, adjustSessionsForSplits, readSplits } from './corporateActions.ts';
import { loadCsvMinuteBacktestData } from './csv.ts';
import { type DatasetSelection, assertOptimizationPartition, sha256FileSync } from './dataset.ts';
import {
  type DatasetPartition,
  type PartitionInterval,
  describeInterval,
  intervalContains,
  isNewYorkDate
} from './partitions.ts';
import { groupMarketSessions } from './session.ts';

export interface WindowRequest {
  dataset: DatasetSelection;
  startDate?: string; // YYYY-MM-DD; unset, '' or '-' for the partition's own start
  endDate?: string;
  warmupSessions?: number; // the sessions of history the strategy's lookbacks need before the window
  // 'optimization' (an optimizer, a parameter search or a selection) accepts the training partition only, here at
  // the loader as well as in each command line; 'manual evaluation' (the default) any partition or file.
  access?: AccessMode;
  // The recorded splits (config/market-events/splits.json by default) a partition run is forward-adjusted for.
  splits?: readonly SplitEvent[];
}

export type AccessMode = 'manual evaluation' | 'optimization';

export interface WarmupReport {
  requiredSessions: number;
  sessions: number;
  firstDate: string | null;
  lastDate: string | null;
  sufficient: boolean;
  note: string;
}

export interface WindowReport {
  symbol: string;
  partition: DatasetPartition;
  dataFile: string;
  dataSha256?: string;
  partitionsFile: string;
  partitionsSha256: string;
  partitionInterval: PartitionInterval;
  requestedStart: string | null;
  requestedEnd: string | null;
  evaluation: { firstDate: string; lastDate: string; sessions: number };
  warmup: WarmupReport;
  mode: 'continuous all' | 'isolated partition';
  access: AccessMode;
  // Splits inside the run, forward-adjusted: prices from each effective date on × ratio, volumes ÷ ratio, so the run
  // is in the share units of its first session (src/lib/corporateActions.ts).
  splitAdjustments: SplitAdjustment[];
}

export interface RunWindow {
  sessions: MarketSession[]; // the evaluation window
  history: MarketSession[]; // the warm-up sessions followed by `sessions` (the same objects)
  warmup: number; // history[warmup + i] === sessions[i]
  report?: WindowReport; // undefined for an explicit data file
}

const unset = (value?: string) => (value === undefined || value === '' || value === '-' ? undefined : value);

const timestampOf = (date: string | undefined, fallback: number) =>
  date === undefined ? fallback : Date.parse(date) / 1000;

// The window of a partition and the requested dates, refusing dates outside the partition.
export const windowInterval = (
  partition: DatasetPartition,
  interval: PartitionInterval,
  startDate?: string,
  endDate?: string
): PartitionInterval => {
  for (const [name, value] of [
    ['start', startDate],
    ['end', endDate]
  ] as const) {
    if (value !== undefined && !isNewYorkDate(value)) {
      throw new Error(`The ${name} date must be a YYYY-MM-DD New York trading date, not '${value}'`);
    }

    if (value !== undefined && !intervalContains(interval, value)) {
      throw new Error(
        `The ${name} date ${value} is outside the ${partition} partition (${describeInterval(interval)}); select the partition that holds it, or all`
      );
    }
  }

  if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
    throw new Error(`The start date ${startDate} is after the end date ${endDate}`);
  }

  return { start: startDate ?? interval.start, end: endDate ?? interval.end };
};

// The access mode of a request; an optimization input must be the training partition.
export const assertAccess = ({ dataset, access = 'manual evaluation' }: WindowRequest): AccessMode => {
  if (access === 'optimization') {
    if (!dataset.partition) {
      throw new Error(`Optimization reads the training partition only, not the explicit file ${dataset.file}`);
    }

    assertOptimizationPartition(dataset.partition);
  }

  return access;
};

const warmupNote = (required: number, available: number, firstEvaluationDate: string) =>
  required === 0
    ? 'no lookback to warm up'
    : available >= required
      ? `the ${required} sessions before ${firstEvaluationDate}, read for indicators only: no orders, positions, interest, P&L or drawdown`
      : available === 0
        ? `no session before ${firstEvaluationDate} in the file: entries wait for ${required} sessions inside the window`
        : `only ${available} of ${required} sessions before ${firstEvaluationDate} in the file: entries wait for the remaining ${required - available} inside the window`;

// The run's sessions from every session of its data file.
export const selectRunSessions = (allSessions: MarketSession[], request: WindowRequest): RunWindow => {
  const { dataset } = request;
  const startDate = unset(request.startDate);
  const endDate = unset(request.endDate);
  const access = assertAccess(request);

  if (!dataset.partition) {
    // An explicit file: the strategies' original date filter, unchanged.
    const start = timestampOf(startDate, -Infinity);
    const end = timestampOf(endDate, Infinity);
    const sessions = allSessions.filter((session) => session.time >= start && session.time <= end);

    return { sessions, history: sessions, warmup: 0 };
  }

  const window = windowInterval(dataset.partition, dataset.interval!, startDate, endDate);
  const first = allSessions.findIndex((session) => intervalContains(window, session.date));

  if (first < 0) {
    throw new Error(
      `${dataset.file} has no ${dataset.symbol} session in ${dataset.partition} from ${describeInterval(window)}`
    );
  }

  let last = first;

  while (last + 1 < allSessions.length && intervalContains(window, allSessions[last + 1]!.date)) {
    last++;
  }

  const required = Math.max(0, Math.floor(request.warmupSessions ?? 0));
  const warmupStart = Math.max(0, first - required);
  const adjusted = adjustSessionsForSplits(
    allSessions.slice(warmupStart, last + 1),
    dataset.symbol,
    request.splits ?? readSplits()
  );
  const history = adjusted.sessions;
  const warmup = first - warmupStart;
  const sessions = history.slice(warmup);
  const firstDate = sessions[0]!.date;

  return {
    sessions,
    history,
    warmup,
    report: {
      symbol: dataset.symbol,
      partition: dataset.partition,
      dataFile: dataset.file,
      partitionsFile: dataset.partitionsFile!,
      partitionsSha256: dataset.partitionsSha256!,
      partitionInterval: dataset.interval!,
      requestedStart: startDate ?? null,
      requestedEnd: endDate ?? null,
      evaluation: { firstDate, lastDate: sessions.at(-1)!.date, sessions: sessions.length },
      warmup: {
        requiredSessions: required,
        sessions: warmup,
        firstDate: warmup > 0 ? history[0]!.date : null,
        lastDate: warmup > 0 ? history[warmup - 1]!.date : null,
        sufficient: warmup >= required,
        note: warmupNote(required, warmup, firstDate)
      },
      mode: dataset.partition === 'all' && startDate === undefined ? 'continuous all' : 'isolated partition',
      access,
      splitAdjustments: adjusted.applied
    }
  };
};

export const describeWindow = ({
  symbol,
  partition,
  evaluation,
  warmup,
  mode,
  access,
  splitAdjustments
}: WindowReport) =>
  `Evaluation: ${symbol} ${partition} (${mode}${access === 'optimization' ? ', optimization input' : ''}), ${evaluation.firstDate} → ${evaluation.lastDate}, ${evaluation.sessions} sessions; warm-up ${warmup.sessions} of ${warmup.requiredSessions} sessions${warmup.firstDate ? ` (${warmup.firstDate} → ${warmup.lastDate})` : ''}: ${warmup.note}${splitAdjustments.map((split) => `; split ${split.ratio}:1 on ${split.effectiveDate} forward-adjusted (later prices × ${split.ratio}, volumes ÷ ${split.ratio})`).join('')}`;

// selectRunSessions for a strategy file: logs the window of a partition run and returns it.
export const strategyRunSessions = (allSessions: MarketSession[], request: WindowRequest): RunWindow => {
  const run = selectRunSessions(allSessions, request);

  if (run.report) {
    console.info(describeWindow(run.report));
  }

  return run;
};

const secondsPerDay = 86400;

// Loads only the rows a window can use: a New York date is the UTC date or the one before, so rows from the lower
// bound's UTC midnight to two UTC days after the upper bound cover every session of the window and of a warm-up
// that starts at the lower bound. Every row is still parsed and checked for order; rows outside are not kept.
const loadBounded = async (symbol: string, file: string, lower: string | null, upper: string | null) => {
  const stats = { before: 0, after: 0 };
  const ticks: Tick[] = await loadCsvMinuteBacktestData(symbol, file, {
    fromTime: lower === null ? -Infinity : Date.parse(`${lower}T00:00:00Z`) / 1000,
    toTime: upper === null ? Infinity : Date.parse(`${upper}T00:00:00Z`) / 1000 + 2 * secondsPerDay,
    stats
  });

  return { sessions: groupMarketSessions(ticks), skippedBefore: stats.before };
};

// The run's sessions straight from its canonical file, for runners that load data themselves (the allocator, the
// phenotype runner): the same sessions as loading the whole file and calling selectRunSessions, without keeping
// bars from long before the window or any after it. An explicit file is loaded whole.
export const loadDatasetSessions = async (request: WindowRequest): Promise<RunWindow> => {
  const { dataset } = request;

  assertAccess(request); // before a byte is read

  if (!dataset.partition) {
    return selectRunSessions(
      groupMarketSessions(await loadCsvMinuteBacktestData(dataset.symbol, dataset.file)),
      request
    );
  }

  const window = windowInterval(dataset.partition, dataset.interval!, unset(request.startDate), unset(request.endDate));
  const required = Math.max(0, Math.floor(request.warmupSessions ?? 0));
  // Calendar days that hold `required` sessions with room for holidays and missing sessions; if they don't, the
  // file is read again from its start.
  const lower =
    window.start === null
      ? null
      : new Date(Date.parse(`${window.start}T00:00:00Z`) - (Math.ceil(required * 1.6) + 14) * secondsPerDay * 1000)
          .toISOString()
          .slice(0, 10);
  let loaded = await loadBounded(dataset.symbol, dataset.file, lower, window.end);
  let run = selectRunSessions(loaded.sessions, request);

  if (run.warmup < required && loaded.skippedBefore > 0) {
    loaded = await loadBounded(dataset.symbol, dataset.file, null, window.end);
    run = selectRunSessions(loaded.sessions, request);
  }

  run.report!.dataSha256 = sha256FileSync(dataset.file);
  return run;
};
