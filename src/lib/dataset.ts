// Minute OHLCV datasets, one directory per symbol and partition: data/<SYMBOL>/<partition>/data.csv, each a
// headerless, comma-delimited file of one-minute bars (src/lib/csv.ts reads them). `npm run partition-data`
// (src/data-partition/) writes them from a downloaded data/<SYMBOL>.csv and holds the partitions' trading-date
// boundaries; nothing else knows the dates, so code selects a dataset by its name only:
// - training: the default everywhere, and the only partition an optimizer or parameter search may read
// - holdout and final: later periods, for explicit manual evaluation
// - all: the three partitions as one continuous file, so a run over it is a single backtest
export const datasetPartitions = ['training', 'holdout', 'final', 'all'] as const;

export type DatasetPartition = (typeof datasetPartitions)[number];

export const defaultDatasetPartition: DatasetPartition = 'training';

export interface DatasetSelection {
  symbol: string;
  // Undefined when the run reads an explicit file instead of a partition.
  partition?: DatasetPartition;
  file: string;
}

const symbolPattern = /^[A-Z0-9][A-Z0-9.-]*$/;

const unset = (value?: string) => value === undefined || value === '' || value === '-';

export const isDatasetPartition = (value: unknown): value is DatasetPartition =>
  datasetPartitions.includes(value as DatasetPartition);

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

// The one place the layout is spelled out. `root` is for the partitioning script's tests.
export const datasetFile = (symbol: string, partition: DatasetPartition = defaultDatasetPartition, root = 'data') => {
  if (!symbolPattern.test(symbol)) {
    throw new Error(`'${symbol}' is not a symbol (upper-case letters, digits, '.' and '-')`);
  }

  if (!isDatasetPartition(partition)) {
    throw new Error(`Unknown dataset partition '${partition}'; use one of ${datasetPartitions.join(', ')}`);
  }

  return `${root}/${symbol}/${partition}/data.csv`;
};

// The dataset of a strategy run, from its data-file argument: a partition name, an explicit path, or unset
// for the default partition.
export const resolveDataset = (symbol: string, dataFile?: string): DatasetSelection => {
  if (unset(dataFile) || isDatasetPartition(dataFile)) {
    const partition = parseDatasetPartition(dataFile);

    return { symbol, partition, file: datasetFile(symbol, partition) };
  }

  // An explicit path to a partition file still counts as that partition.
  const partition = symbolPattern.test(symbol)
    ? datasetPartitions.find((name) => datasetFile(symbol, name) === dataFile!.replace(/^\.\//, ''))
    : undefined;

  return { symbol, partition, file: dataFile! };
};

export const describeDataset = ({ symbol, partition, file }: DatasetSelection) =>
  `Dataset: ${symbol} ${partition ?? 'explicit file'} (${file})`;

// Resolves the dataset and logs it, so every run records what it read. Returns the file to load.
export const selectDataset = (symbol: string, dataFile?: string) => {
  const selection = resolveDataset(symbol, dataFile);

  console.info(describeDataset(selection));
  return selection.file;
};

// Optimizers and parameter searches tune on training only; holdout, final and all stay out of reach of
// automated selection. Explicit manual backtests use resolveDataset instead.
export const optimizationDatasetFile = (symbol: string, partition: string = defaultDatasetPartition) => {
  if (partition !== 'training') {
    throw new Error(
      `Optimization reads the training partition only, not '${partition}': holdout, final and all are kept for explicit manual evaluation`
    );
  }

  return datasetFile(symbol, 'training');
};

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
