// The audit's result store: one append-only JSON-lines file per run family (results/runs/<family>.jsonl), written as
// each run completes so an interrupted batch resumes where it stopped, and the full lot and daily ledgers of the detail
// runs (results/detail/<key>/). A stored run is reused only when its specification hash still matches.
import path from 'node:path';
import fs from 'fs-extra';
import { jsonReplacer, resultDir } from './context.ts';
import type { DailyRecord, LotRecord, RunMetrics, RunOutput } from './run.ts';
import { type Family, type RunSpec, specHash } from './specs.ts';

export const runsFile = (family: Family) => resultDir('runs', `${family}.jsonl`);

export const detailDir = (key: string) => resultDir('detail', key.replaceAll(':', '_'));

// Non-finite numbers are stored as null (NaN) or "Infinity" strings by jsonReplacer; read them back as numbers.
const revive = (_key: string, value: unknown) =>
  value === 'Infinity' ? Infinity : value === '-Infinity' ? -Infinity : value === null ? NaN : value;

export const readFamily = async (family: Family): Promise<Map<string, RunMetrics>> => {
  const file = runsFile(family);
  const found = new Map<string, RunMetrics>();

  if (!(await fs.pathExists(file))) {
    return found;
  }

  const lines = (await fs.readFile(file, 'utf8')).split('\n');

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return;
    }

    try {
      const metrics = JSON.parse(line, revive) as RunMetrics;

      found.set(metrics.key, metrics);
    } catch (error) {
      // Only a torn final line (an interrupted append) is tolerated.
      if (index < lines.length - 2) {
        throw new Error(`${file}:${index + 1}: ${(error as Error).message}`);
      }
    }
  });

  return found;
};

export const readAll = async (families: readonly Family[]) => {
  const all = new Map<string, RunMetrics>();

  for (const family of families) {
    for (const [key, metrics] of await readFamily(family)) {
      all.set(key, metrics);
    }
  }

  return all;
};

export const isCurrent = (stored: RunMetrics | undefined, spec: RunSpec) =>
  stored !== undefined && stored.specHash === specHash(spec);

const dailyColumns = [
  'date',
  'strategyMark',
  'realized',
  'unrealized',
  'cumulativeInterest',
  'openLots',
  'owners',
  'equity',
  'principal',
  'debtToEquity',
  'equityToLmv',
  'cumulativeDividends'
] as const;

const cell = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(Math.round(value * 1e6) / 1e6) : '';
  }

  const text = String(value ?? '');

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const dailyCsv = (rows: DailyRecord[]) =>
  [dailyColumns.join(','), ...rows.map((row) => dailyColumns.map((column) => cell(row[column])).join(','))].join('\n') +
  '\n';

export const appendRun = async (spec: RunSpec, output: RunOutput) => {
  await fs.ensureDir(path.dirname(runsFile(spec.family)));
  await fs.appendFile(runsFile(spec.family), `${JSON.stringify(output.metrics, jsonReplacer)}\n`);

  if (spec.detail && output.lots && output.daily) {
    const dir = detailDir(spec.key);

    await fs.outputFile(path.join(dir, 'lots.json'), `${JSON.stringify(output.lots, jsonReplacer)}\n`);
    await fs.outputFile(path.join(dir, 'daily.csv'), dailyCsv(output.daily));
    await fs.outputFile(path.join(dir, 'refusals.json'), `${JSON.stringify(output.refusals ?? [], null, 1)}\n`);
  }
};

// RFC 4180 CSV as written by toCsv/dailyCsv: quoted fields may hold commas and doubled quotes. Every row must have
// the header's field count.
export const parseCsv = (text: string): Record<string, string>[] => {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [header, ...rows] = records;

  return rows.map((row, index) => {
    if (row.length !== header!.length) {
      throw new Error(`CSV row ${index + 2} has ${row.length} fields, the header ${header!.length}`);
    }

    return Object.fromEntries(header!.map((name, column) => [name, row[column]!]));
  });
};

export const readDetail = async (key: string) => {
  const dir = detailDir(key);
  const lots = JSON.parse(await fs.readFile(path.join(dir, 'lots.json'), 'utf8'), revive) as LotRecord[];
  // Daily rows are the sessions after the first (index 1 onwards); the session index is their position + 1, which
  // the analysis checks against the calendar.
  const daily = parseCsv(await fs.readFile(path.join(dir, 'daily.csv'), 'utf8')).map((cells, position) => {
    const row: Record<string, unknown> = { index: position + 1 };

    for (const [column, raw] of Object.entries(cells)) {
      row[column] = column === 'date' || column === 'owners' ? raw : raw === '' ? NaN : Number(raw);
    }

    return row as unknown as DailyRecord;
  });
  const refusals = JSON.parse(await fs.readFile(path.join(dir, 'refusals.json'), 'utf8')) as {
    symbol: string;
    holder: string;
    count: number;
  }[];

  return { lots, daily, refusals };
};

// CSV of plain records (the machine-readable result tables).
export const toCsv = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) {
    return '\n';
  }

  const columns = Object.keys(rows[0]!);

  return `${[columns.join(','), ...rows.map((row) => columns.map((column) => cell(row[column])).join(','))].join('\n')}\n`;
};
