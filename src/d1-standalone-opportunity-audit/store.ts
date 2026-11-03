// The study's result store: one append-only JSON-lines file per run family (results/runs/<family>.jsonl), written as
// each run completes so an interrupted batch resumes mid-stage. A stored run is reused only while its specification
// hash still matches. Bulk records keep a trimmed metric set and one tuple per lot; base and incumbent records keep
// every metric, every lot and the daily marks.
import path from 'node:path';
import fs from 'fs-extra';
import { jsonReplacer, resultDir } from './context.ts';
import type { CompactLot, Family, RunRecord } from './run.ts';

export const runsFile = (family: Family) => resultDir('runs', `${family}.jsonl`);

// Non-finite numbers are stored as null (NaN) or "Infinity" strings by jsonReplacer; read them back as numbers.
export const revive = (_key: string, value: unknown) =>
  value === 'Infinity' ? Infinity : value === '-Infinity' ? -Infinity : value === null ? NaN : value;

const reasonCodes = [
  'trailing stop',
  'trailing stop gap',
  'maximum hold',
  'buffered intraday loss',
  'open',
  'displaced',
  'forced liquidation'
];

// One lot as a tuple (bulk families): the fields the capture, cost and tail analyses read.
export const lotTupleFields = [
  'id',
  'setup', // 0 deep, 1 continuation
  'activationIndex',
  'entryIndex',
  'exitIndex',
  'entryRawPrice',
  'exitRawPrice',
  'net',
  'interest',
  'friction',
  'exitReason', // index into reasonCodes
  'maePercent',
  'occupiedDays',
  'shares'
] as const;

export const toTuple = (lot: CompactLot) => [
  lot.id,
  lot.setup === 'continuation' ? 1 : 0,
  lot.activationIndex,
  lot.entryIndex,
  lot.exitIndex,
  lot.entryRawPrice,
  lot.exitRawPrice,
  lot.net,
  lot.interest,
  lot.friction,
  reasonCodes.indexOf(lot.exitReason),
  lot.maePercent,
  lot.occupiedDays,
  lot.shares
];

export const fromTuple = (tuple: readonly number[]): CompactLot =>
  ({
    id: tuple[0]!,
    setup: tuple[1] === 1 ? 'continuation' : 'deep',
    activationIndex: tuple[2]!,
    entryIndex: tuple[3]!,
    exitIndex: tuple[4]!,
    entryRawPrice: tuple[5]!,
    exitRawPrice: tuple[6]!,
    net: tuple[7]!,
    interest: tuple[8]!,
    friction: tuple[9]!,
    exitReason: reasonCodes[tuple[10]!] ?? 'unknown',
    maePercent: tuple[11]!,
    occupiedDays: tuple[12]!,
    shares: tuple[13]!
  }) as CompactLot;

const bulkMetricKeys = [
  'net',
  'gross',
  'interest',
  'friction',
  'lots',
  'wins',
  'losses',
  'worstLot',
  'bestLot',
  'profitFactor',
  'lotDays',
  'borrowingDollarDays',
  'sessionsHeld',
  'sessionsEligible',
  'minuteDD',
  'dailyDD',
  'endEquity',
  'totalReturn',
  'cagr',
  'dailyPercent',
  'dailyPercentDollars',
  'minutePercent',
  'minutePercentDollars',
  'maxPrincipal',
  'refused',
  'signals',
  'openAtEnd'
] as const;

export interface StoredRun {
  key: string;
  specHash: string;
  family: Family;
  subject: string;
  window: string;
  mode: string;
  scenario: string;
  meta: Record<string, string | number | boolean>;
  grid?: Record<string, number>; // one-book runs only (never null: revive turns null into NaN)
  endDate: string;
  metrics: Record<string, unknown>;
  view: RunRecord['view'];
  windowed?: RunRecord['windowed'];
  lots?: CompactLot[]; // full records (detail families)
  lotTuples?: number[][]; // bulk families
  daily?: RunRecord['daily'];
}

export const detailFamilies: readonly Family[] = ['base', 'incumbent', 'fold'];

export const toStored = (record: RunRecord, specHash: string): StoredRun => {
  const detail = detailFamilies.includes(record.family);
  const metrics = detail
    ? (record.metrics as unknown as Record<string, unknown>)
    : Object.fromEntries(
        bulkMetricKeys.map((key) => [key, (record.metrics as unknown as Record<string, unknown>)[key]])
      );

  return {
    key: record.key,
    specHash,
    family: record.family,
    subject: record.subject,
    window: record.window,
    mode: record.mode,
    scenario: record.scenario,
    meta: record.meta,
    ...(record.books.length === 1 ? { grid: record.books[0]!.grid } : {}),
    endDate: record.endDate,
    metrics,
    view: record.view,
    windowed: record.windowed,
    ...(detail ? { lots: record.lots } : { lotTuples: record.lots.map(toTuple) }),
    ...(record.daily ? { daily: record.daily } : {})
  };
};

export const readJsonl = async (file: string): Promise<Map<string, StoredRun>> => {
  const found = new Map<string, StoredRun>();

  if (!(await fs.pathExists(file))) {
    return found;
  }

  const lines = (await fs.readFile(file, 'utf8')).split('\n');

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return;
    }

    try {
      const run = JSON.parse(line, revive) as StoredRun;

      found.set(run.key, run);
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

export const lotsOf = (run: StoredRun): CompactLot[] => run.lots ?? (run.lotTuples ?? []).map(fromTuple);

export const appendRun = async (run: StoredRun) => {
  await fs.ensureDir(path.dirname(runsFile(run.family)));
  await fs.appendFile(runsFile(run.family), `${JSON.stringify(run, jsonReplacer)}\n`);
};
