// Execution profiles: the settings of a run that are not part of a phenotype (the dataset, the first session that
// may arm, the investment per entry, the margin interest rate, the stop fill and the reporting periods), as JSON
// files under config/execution/<name>.json. A phenotype file names the profile its phenotypes were researched
// under; the command line can pick another. Investment and interest are injected into the strategy file's own
// constants, so the report shows what the strategy actually used.
import path from 'node:path';
import fs from 'fs-extra';
import { PhenotypeError, closestName } from './architectures.ts';

export const executionRoot = 'config/execution';
export const executionSchemaVersion = 1;

export interface Period {
  label: string;
  start: string;
  end?: string; // absent: the last session of the data
}

export interface ExecutionProfile {
  name: string;
  path: string;
  description?: string;
  source?: string;
  // Sessions before this date never arm (the research's common eligibility); absent: the strategy's own
  // warm-up only.
  firstEligibleDate?: string;
  investmentPerEntry?: number;
  marginInterestRate?: { value: number; display: string };
  stopFill?: 'stop' | 'next-open';
  periods: Period[];
  // The sha256 of each symbol's data file in the research the profile describes, when known. Runs read the dataset
  // partitions of src/lib/dataset.ts, so a run on a different file says that it will not reproduce the research.
  dataHashes: Record<string, string>;
}

const profileKeys = [
  'schemaVersion',
  'name',
  'description',
  'source',
  'firstEligibleDate',
  'investmentPerEntry',
  'marginInterestRate',
  'stopFill',
  'periods',
  'dataHashes'
];

export const isDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

// "11%" or "8.25%": any number of decimals, converted exactly as the decimal literal would be.
export const parseRate = (raw: unknown, where: string) => {
  const match = typeof raw === 'string' ? raw.match(/^(\d{1,3})(?:\.(\d{1,6}))?%$/) : null;

  if (!match) {
    throw new PhenotypeError(`${where} must be a percentage string such as "11%", not ${JSON.stringify(raw)}`);
  }

  const decimals = match[2] ?? '';

  return { value: Number(`${match[1]}${decimals}`) / 10 ** (decimals.length + 2), display: raw as string };
};

export const parseExecutionProfile = (json: unknown, file: string, expectedName?: string): ExecutionProfile => {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new PhenotypeError(`${file}: an execution profile must be a JSON object`);
  }

  const object = json as Record<string, unknown>;

  if ('dataFile' in object) {
    throw new PhenotypeError(
      `${file}: dataFile is no longer a profile setting; runs read data/<SYMBOL>/<partition>/data.csv (src/lib/dataset.ts)`
    );
  }

  for (const key of Object.keys(object)) {
    if (!profileKeys.includes(key)) {
      const hint = closestName(key, profileKeys);

      throw new PhenotypeError(`${file}: unknown key '${key}'${hint ? ` (did you mean '${hint}'?)` : ''}`);
    }
  }

  if (object.schemaVersion !== executionSchemaVersion) {
    throw new PhenotypeError(`${file}: schemaVersion must be ${executionSchemaVersion}`);
  }

  if (typeof object.name !== 'string' || (expectedName !== undefined && object.name !== expectedName)) {
    throw new PhenotypeError(`${file}: name must be "${expectedName ?? path.basename(file, '.json')}"`);
  }

  for (const key of ['description', 'source'] as const) {
    if (object[key] !== undefined && typeof object[key] !== 'string') {
      throw new PhenotypeError(`${file}: ${key} must be a string`);
    }
  }

  if (object.firstEligibleDate !== undefined && !isDate(object.firstEligibleDate)) {
    throw new PhenotypeError(`${file}: firstEligibleDate must be a YYYY-MM-DD date`);
  }

  if (
    object.investmentPerEntry !== undefined &&
    !(
      typeof object.investmentPerEntry === 'number' &&
      object.investmentPerEntry > 0 &&
      Number.isFinite(object.investmentPerEntry)
    )
  ) {
    throw new PhenotypeError(`${file}: investmentPerEntry must be a positive number of dollars`);
  }

  const marginInterestRate =
    object.marginInterestRate === undefined
      ? undefined
      : parseRate(object.marginInterestRate, `${file}: marginInterestRate`);

  if (object.stopFill !== undefined && object.stopFill !== 'stop' && object.stopFill !== 'next-open') {
    throw new PhenotypeError(`${file}: stopFill must be "stop" or "next-open"`);
  }

  if (!Array.isArray(object.periods)) {
    throw new PhenotypeError(`${file}: periods must be an array (it may be empty)`);
  }

  const labels = new Set<string>(['full']);
  const periods = object.periods.map((raw, index): Period => {
    const where = `${file}: periods[${index}]`;

    if (typeof raw !== 'object' || raw === null) {
      throw new PhenotypeError(`${where} must be an object with label, start and an optional end`);
    }

    const period = raw as Record<string, unknown>;

    for (const key of Object.keys(period)) {
      if (!['label', 'start', 'end'].includes(key)) {
        throw new PhenotypeError(`${where}: unknown key '${key}'`);
      }
    }

    if (typeof period.label !== 'string' || !/^[A-Za-z][\w-]*$/.test(period.label)) {
      throw new PhenotypeError(`${where}: label must be a word such as "development"`);
    }

    if (labels.has(period.label)) {
      throw new PhenotypeError(
        `${where}: the label '${period.label}' is ${period.label === 'full' ? 'reserved for the whole run' : 'used twice'}`
      );
    }

    labels.add(period.label);

    if (!isDate(period.start) || (period.end !== undefined && !isDate(period.end))) {
      throw new PhenotypeError(`${where}: start and end must be YYYY-MM-DD dates`);
    }

    if (period.end !== undefined && (period.end as string) < period.start) {
      throw new PhenotypeError(`${where}: end ${period.end} is before start ${period.start}`);
    }

    return { label: period.label, start: period.start, end: period.end as string | undefined };
  });

  const dataHashes = object.dataHashes ?? {};

  if (
    typeof dataHashes !== 'object' ||
    dataHashes === null ||
    Object.values(dataHashes).some((hash) => typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash))
  ) {
    throw new PhenotypeError(`${file}: dataHashes must map symbols to sha256 hex digests`);
  }

  return {
    name: object.name,
    path: file,
    description: object.description as string | undefined,
    source: object.source as string | undefined,
    firstEligibleDate: object.firstEligibleDate as string | undefined,
    investmentPerEntry: object.investmentPerEntry as number | undefined,
    marginInterestRate,
    stopFill: object.stopFill as ExecutionProfile['stopFill'],
    periods,
    dataHashes: dataHashes as Record<string, string>
  };
};

export const readExecutionProfile = async (name: string, root = executionRoot): Promise<ExecutionProfile> => {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
    throw new PhenotypeError(`'${name}' is not a valid execution profile name`);
  }

  const file = path.join(root, `${name}.json`);
  const available = (await fs.pathExists(root))
    ? (await fs.readdir(root)).filter((entry) => entry.endsWith('.json')).map((entry) => entry.replace(/\.json$/, ''))
    : [];

  if (!available.includes(name)) {
    throw new PhenotypeError(`No execution profile ${file} (available: ${available.join(', ') || 'none'})`);
  }

  let json: unknown;

  try {
    json = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    throw new PhenotypeError(`${file} is not valid JSON: ${(error as Error).message}`);
  }

  return parseExecutionProfile(json, file, name);
};
