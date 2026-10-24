// Minute OHLCV datasets: one canonical file per symbol, data/<SYMBOL>/data.csv, a headerless, comma-delimited file
// of one-minute bars (src/lib/csv.ts reads them), and one shared metadata file, data/partitions.json
// (src/lib/partitions.ts), with the New York trading dates of the logical partitions:
// - training: the default everywhere, and the only partition an optimizer or parameter search may read
// - holdout and final: later periods, for explicit manual evaluation
// - all: every row of the file as one continuous run
// A partition is a date interval of the canonical file, never a separate file. A run selects a symbol and a partition
// here; src/lib/evaluation.ts then picks the partition's sessions, and the warm-up sessions before them, from the
// loaded file. `npm run datasets` (src/data-partition/) migrates and verifies the files.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import {
  type DatasetPartition,
  type PartitionInterval,
  datasetPartitions,
  describeInterval,
  readPartitionConfig
} from './partitions.ts';

export const defaultDatasetPartition: DatasetPartition = 'training';

export interface DatasetSelection {
  symbol: string;
  // Undefined when the run reads an explicit file instead of a partition.
  partition?: DatasetPartition;
  file: string;
  // The partition's dates and the metadata they come from; undefined for an explicit file.
  interval?: PartitionInterval;
  partitionsFile?: string;
  partitionsSha256?: string;
}

const symbolPattern = /^[A-Z0-9][A-Z0-9.-]*$/;

const unset = (value?: string) => value === undefined || value === '' || value === '-';

export const isDatasetPartition = (value: unknown): value is DatasetPartition =>
  datasetPartitions.includes(value as DatasetPartition);

export const assertSymbol = (symbol: string) => {
  if (!symbolPattern.test(symbol)) {
    throw new Error(`'${symbol}' is not a symbol (upper-case letters, digits, '.' and '-')`);
  }
};

// An unset value ('-' or empty) selects the default partition; anything else must be a partition's name.
export const parseDatasetPartition = (value?: string): DatasetPartition => {
  if (unset(value)) {
    return defaultDatasetPartition;
  }

  if (!isDatasetPartition(value)) {
    throw new Error(`Unknown dataset partition '${value}'; use one of ${datasetPartitions.join(', ')}`);
  }

  return value;
};

// The one place the layout is spelled out. `root` is for tests and the migration script.
export const canonicalDataFile = (symbol: string, root = 'data') => {
  assertSymbol(symbol);
  return `${root}/${symbol}/data.csv`;
};

// The physical partition files that data/partitions.json replaced, recognised only to explain the change.
const formerPartitionFile = /^(?:\.\/)?data\/([A-Z0-9][A-Z0-9.-]*)\/(training|holdout|final|all)\/data\.csv$/;

// The dataset of a strategy run, from its data-file argument: a partition name, an explicit path, or unset for the
// default partition. The canonical file given as a path is the `all` partition.
export const resolveDataset = (symbol: string, dataFile?: string, root = 'data'): DatasetSelection => {
  const explicit = unset(dataFile) || isDatasetPartition(dataFile) ? undefined : dataFile!;
  const former = explicit?.match(formerPartitionFile);

  if (former) {
    throw new Error(
      `${explicit} no longer exists: each symbol has one file, ${canonicalDataFile(former[1]!, root)}, and data/partitions.json holds the partitions' dates; pass the partition name '${former[2]}' instead`
    );
  }

  const partition =
    explicit === undefined
      ? parseDatasetPartition(dataFile)
      : symbolPattern.test(symbol) && path.normalize(explicit) === path.normalize(canonicalDataFile(symbol, root))
        ? 'all'
        : undefined;

  if (partition === undefined) {
    return { symbol, file: explicit! };
  }

  const config = readPartitionConfig(root);

  return {
    symbol,
    partition,
    file: canonicalDataFile(symbol, root),
    interval: config.partitions[partition],
    partitionsFile: config.file,
    partitionsSha256: config.sha256
  };
};

export const sha256FileSync = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export const describeDataset = ({
  symbol,
  partition,
  file,
  interval,
  partitionsFile,
  partitionsSha256
}: DatasetSelection) =>
  partition
    ? `Dataset: ${symbol} ${partition} (${file}; ${partitionsFile} ${partition} = ${describeInterval(interval!)}, sha256 ${partitionsSha256!.slice(0, 16)})`
    : `Dataset: ${symbol} explicit file (${file})`;

// Resolves the dataset and logs it, with the data file's sha256, so every run records what it read. Returns the
// argument for the strategy's own resolveDataset: the partition name, or the explicit file.
export const selectDataset = (symbol: string, dataFile?: string) => {
  const selection = resolveDataset(symbol, dataFile);
  const hash = fs.pathExistsSync(selection.file) ? sha256FileSync(selection.file) : 'missing';

  console.info(`${describeDataset(selection)}; data sha256 ${hash.slice(0, 16)}`);
  return selection.partition ?? selection.file;
};

// Optimizers and parameter searches tune on training only; holdout, final and all stay out of reach of automated
// selection, although they share the canonical file. Every automated entry point calls this (or
// optimizationDataset) before reading data; explicit manual backtests use resolveDataset instead.
export const assertOptimizationPartition = (partition: string = defaultDatasetPartition): 'training' => {
  if (partition !== 'training') {
    throw new Error(
      `Optimization reads the training partition only, not '${partition}': holdout, final and all are kept for explicit manual evaluation`
    );
  }

  return partition;
};

// The training selection of a symbol for an optimizer. Its sessions come from loadDatasetSessions
// (src/lib/evaluation.ts), which keeps only the training dates and never reads later rows into a result.
export const optimizationDataset = (symbol: string, partition: string = defaultDatasetPartition, root = 'data') =>
  resolveDataset(symbol, assertOptimizationPartition(partition), root);

// The strategy entry points take `[symbol] [start date] [end date] [data file] ...`. This adds the shorthand
// `[symbol] <partition> [start date] [end date] [data file] ...`: a second argument naming a partition is
// moved into the data-file slot, and the remaining arguments keep their usual positions. A second argument
// is otherwise a start date (YYYY-MM-DD) or '-', so the forms can't be confused; anything else there is
// refused, which catches a misspelt partition. The partition can also be given in the data-file slot itself.
export const expandDatasetArguments = (args: readonly string[]): string[] => {
  const [symbol, second, ...rest] = args;

  if (second === undefined || unset(second) || /^\d{4}-\d{2}-\d{2}$/.test(second)) {
    return [...args];
  }

  if (!isDatasetPartition(second)) {
    throw new Error(
      `'${second}' is neither a dataset partition (${datasetPartitions.join(', ')}) nor a YYYY-MM-DD start date`
    );
  }

  const expanded = [symbol!, ...rest];
  const dataFileIndex = 3;

  while (expanded.length < dataFileIndex) {
    expanded.push('-');
  }

  if (!unset(expanded[dataFileIndex])) {
    throw new Error(`Pass either the partition '${second}' or the data file '${expanded[dataFileIndex]}', not both`);
  }

  expanded[dataFileIndex] = second;
  return expanded;
};
