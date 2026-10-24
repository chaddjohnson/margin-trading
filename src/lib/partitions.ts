// The dataset partitions' date boundaries, read from the one shared metadata file, data/partitions.json:
//
//   {
//     "schemaVersion": 1,
//     "timezone": "America/New_York",
//     "partitions": {
//       "training": { "start": "2016-01-01", "end": "2023-12-31" },
//       "holdout": { "start": "2024-01-01", "end": "2025-10-16" },
//       "final": { "start": "2025-10-17", "end": null },
//       "all": { "start": null, "end": null }
//     }
//   }
//
// Dates are inclusive New York trading dates: a bar belongs to the date of its timestamp in New York, so an evening
// bar at 00:30 UTC is on the previous New York date. `null` leaves a side unbounded. training, holdout and final are
// consecutive and don't overlap, and every row of a canonical file (data/<SYMBOL>/data.csv) must fall in one of them;
// `all` is always unbounded, every row of the file. The file is validated strictly: unknown keys, invalid dates, gaps,
// overlaps and other time zones are refused rather than interpreted.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';

export const datasetPartitions = ['training', 'holdout', 'final', 'all'] as const;

export type DatasetPartition = (typeof datasetPartitions)[number];

// The three consecutive partitions every row falls in exactly one of; `all` is their union.
export const segmentPartitions = ['training', 'holdout', 'final'] as const;

export type SegmentPartition = (typeof segmentPartitions)[number];

export const partitionsTimezone = 'America/New_York';

export interface PartitionInterval {
  start: string | null; // inclusive New York date, or null for no lower bound
  end: string | null; // inclusive New York date, or null for no upper bound
}

export interface PartitionConfig {
  schemaVersion: 1;
  timezone: typeof partitionsTimezone;
  partitions: Record<DatasetPartition, PartitionInterval>;
  file: string;
  sha256: string; // of the file's bytes, recorded by every run that selects a partition
}

export const partitionsFile = (root = 'data') => path.join(root, 'partitions.json');

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const isNewYorkDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  datePattern.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

// The calendar day after a YYYY-MM-DD date.
export const nextDate = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

export const intervalContains = ({ start, end }: PartitionInterval, date: string) =>
  (start === null || date >= start) && (end === null || date <= end);

export const describeInterval = ({ start, end }: PartitionInterval) =>
  `${start ?? 'the first row'} → ${end ?? 'the last row'}`;

const keysOf = (value: object) => Object.keys(value).sort().join(', ');

const requireKeys = (where: string, value: unknown, required: string[], optional: string[] = []) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where} must be an object`);
  }

  const missing = required.filter((key) => !(key in value));
  const unknown = Object.keys(value).filter((key) => !required.includes(key) && !optional.includes(key));

  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `${where} must have exactly the keys ${[...required, ...optional.map((key) => `${key} (optional)`)].join(', ')}; it has ${keysOf(value) || 'none'}`
    );
  }

  return value as Record<string, unknown>;
};

// Parses and validates the metadata. `source` names the file in error messages.
export const parsePartitionConfig = (text: string, source = 'partitions.json'): PartitionConfig => {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source} is not valid JSON: ${(error as Error).message}`);
  }

  const root = requireKeys(source, json, ['schemaVersion', 'timezone', 'partitions'], ['description']);

  if (root.schemaVersion !== 1) {
    throw new Error(`${source}: schemaVersion must be 1, not ${JSON.stringify(root.schemaVersion)}`);
  }

  if (root.timezone !== partitionsTimezone) {
    throw new Error(
      `${source}: timezone must be ${partitionsTimezone} (dates are New York trading dates), not ${JSON.stringify(root.timezone)}`
    );
  }

  if (root.description !== undefined && typeof root.description !== 'string') {
    throw new Error(`${source}: description must be a string`);
  }

  const entries = requireKeys(`${source}: partitions`, root.partitions, [...datasetPartitions]);
  const partitions = {} as Record<DatasetPartition, PartitionInterval>;

  for (const partition of datasetPartitions) {
    const where = `${source}: partitions.${partition}`;
    const entry = requireKeys(where, entries[partition], ['start', 'end']);

    for (const side of ['start', 'end'] as const) {
      if (entry[side] !== null && !isNewYorkDate(entry[side])) {
        throw new Error(`${where}.${side} must be a YYYY-MM-DD date or null, not ${JSON.stringify(entry[side])}`);
      }
    }

    const interval = { start: entry.start as string | null, end: entry.end as string | null };

    if (interval.start !== null && interval.end !== null && interval.start > interval.end) {
      throw new Error(`${where}: start ${interval.start} is after end ${interval.end}`);
    }

    partitions[partition] = interval;
  }

  if (partitions.all.start !== null || partitions.all.end !== null) {
    throw new Error(`${source}: partitions.all must be { "start": null, "end": null }: it is every row of the file`);
  }

  // Only the first start and the last end may be open.
  for (const [index, partition] of segmentPartitions.entries()) {
    const { start, end } = partitions[partition];

    if (index > 0 && start === null) {
      throw new Error(`${source}: partitions.${partition}.start must be a date; only training may start unbounded`);
    }

    if (index < segmentPartitions.length - 1 && end === null) {
      throw new Error(`${source}: partitions.${partition}.end must be a date; only final may end unbounded`);
    }
  }

  // Consecutive, without gaps or overlaps.
  for (const [index, partition] of segmentPartitions.entries()) {
    const { end } = partitions[partition];
    const next = segmentPartitions[index + 1];

    if (next === undefined || end === null) {
      continue;
    }

    const nextStart = partitions[next].start;

    if (nextStart !== nextDate(end)) {
      throw new Error(
        `${source}: partitions.${next}.start must be ${nextDate(end)}, the day after ${partition} ends (${end}), not ${JSON.stringify(nextStart)}: the partitions must be consecutive without gaps or overlaps`
      );
    }
  }

  return {
    schemaVersion: 1,
    timezone: partitionsTimezone,
    partitions,
    file: source,
    sha256: createHash('sha256').update(text).digest('hex')
  };
};

const cache = new Map<string, { mtimeMs: number; size: number; config: PartitionConfig }>();

// The validated metadata under a data root (data/ by default). Re-read whenever the file changes.
export const readPartitionConfig = (root = 'data'): PartitionConfig => {
  const file = partitionsFile(root);

  if (!fs.pathExistsSync(file)) {
    throw new Error(
      `${file} is missing: it holds the partitions' date boundaries (see README.md, "Market data"); \`npm run datasets -- migrate\` creates it`
    );
  }

  const { mtimeMs, size } = fs.statSync(file);
  const cached = cache.get(file);

  if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
    return cached.config;
  }

  const config = parsePartitionConfig(fs.readFileSync(file, 'utf8'), file);

  cache.set(file, { mtimeMs, size, config });
  return config;
};

// The segment (training, holdout or final) a New York date belongs to, if any.
export const segmentOf = (config: PartitionConfig, date: string): SegmentPartition | undefined =>
  segmentPartitions.find((partition) => intervalContains(config.partitions[partition], date));

// The metadata file this repository ships, for `npm run datasets -- migrate` to write when there is none.
export const defaultPartitionConfigText = `${JSON.stringify(
  {
    schemaVersion: 1,
    timezone: partitionsTimezone,
    description:
      'Inclusive New York trading dates of the logical dataset partitions of every data/<SYMBOL>/data.csv. training, holdout and final are consecutive; all is every row. See README.md, "Market data".',
    partitions: {
      training: { start: '2016-01-01', end: '2023-12-31' },
      holdout: { start: '2024-01-01', end: '2025-10-16' },
      final: { start: '2025-10-17', end: null },
      all: { start: null, end: null }
    }
  },
  null,
  2
)}\n`;
