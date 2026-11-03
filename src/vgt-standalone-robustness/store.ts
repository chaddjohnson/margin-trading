// The study's result store, in the prior audit's format: one append-only JSON-lines file per run family
// (results/runs/<family>.jsonl), written as each run completes so an interrupted batch resumes, and the full lot and
// daily ledgers of the detail runs (results/detail/<key>/). A stored run is reused only while its specification hash
// still matches. The prior audit's records are read through its own store (src/b4-b5-robustness/store.ts), never written.
import path from 'node:path';
import fs from 'fs-extra';
import type { DailyRecord, LotRecord, RunMetrics, RunOutput } from '../b4-b5-robustness/run.ts';
import { specHash } from '../b4-b5-robustness/specs.ts';
import { dailyCsv, parseCsv } from '../b4-b5-robustness/store.ts';
import { jsonReplacer, resultDir } from './context.ts';
import { type Family, type RunSpec, asPriorSpec } from './specs.ts';

export { parseCsv, toCsv } from '../b4-b5-robustness/store.ts';

export const runsFile = (family: Family) => resultDir('runs', `${family}.jsonl`);

export const detailDir = (key: string) => resultDir('detail', key.replaceAll(':', '_'));

// Non-finite numbers are stored as null (NaN) or "Infinity" strings by jsonReplacer; read them back as numbers.
export const revive = (_key: string, value: unknown) =>
  value === 'Infinity' ? Infinity : value === '-Infinity' ? -Infinity : value === null ? NaN : value;

export const readJsonl = async (file: string): Promise<Map<string, RunMetrics>> => {
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

export const readFamily = (family: Family) => readJsonl(runsFile(family));

export const readAll = async (selected: readonly Family[]) => {
  const all = new Map<string, RunMetrics>();

  for (const family of selected) {
    for (const [key, metrics] of await readFamily(family)) {
      all.set(key, metrics);
    }
  }

  return all;
};

export const isCurrent = (stored: RunMetrics | undefined, spec: RunSpec) =>
  stored !== undefined && stored.specHash === specHash(asPriorSpec(spec));

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

// A detail run's ledgers (the prior store's layout: daily rows are sessions 1 onwards, indexed by position + 1).
export const readDetailFrom = async (dir: string) => {
  const lots = JSON.parse(await fs.readFile(path.join(dir, 'lots.json'), 'utf8'), revive) as LotRecord[];
  const daily = parseCsv(await fs.readFile(path.join(dir, 'daily.csv'), 'utf8')).map((cells, position) => {
    const row: Record<string, unknown> = { index: position + 1 };

    for (const [column, raw] of Object.entries(cells)) {
      row[column] = column === 'date' || column === 'owners' ? raw : raw === '' ? NaN : Number(raw);
    }

    return row as unknown as DailyRecord;
  });

  return { lots, daily };
};

export const readDetail = (key: string) => readDetailFrom(detailDir(key));

// What the engine determines in a record: everything but the labels (key, family, pool, meta) and the lot list, so the
// same configuration run under two studies' labels compares equal.
const labelFields = new Set(['key', 'family', 'pool', 'meta', 'lotsBrief']);

export const recordFields = (metrics: object) =>
  Object.fromEntries(Object.entries(metrics).filter(([key]) => !labelFields.has(key)));
