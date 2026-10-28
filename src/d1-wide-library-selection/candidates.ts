// A candidate: one exact eight-parameter D1 vector of one ETF with its training metrics (5 bps, 11%, the fixed
// $100,000 slot, a lot open at the cutoff at its liquidation value — the source's Stage A definitions) and, for
// credible candidates, its trade path. Round-trip JSON (gzip JSONL) with a schema version.
import { gunzipSync, gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { idOf } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { type Grid, type StandaloneMetrics, gridKeyOf, jsOf, tOf } from './fast.ts';

export const candidateSchema = 'd1-wide-library-candidate';
export const candidateSchemaVersion = 1;

export type Provenance = 'archive' | 'new';
export type CandidateStage = 'sobol' | 'local' | 'new-sobol' | 'refine';

export interface Candidate {
  symbol: string;
  key: string; // grid key
  grid: Grid;
  id: string; // the project's D1 candidate id (a hash prefix label)
  provenance: Provenance;
  stage: CandidateStage;
  origin: string;
  trades: number;
  closed: number;
  open: number;
  net: number;
  best: number; // NaN without a trade
  worst: number;
  dd: number; // minute drawdown of the one-book slot
  ddDaily: number;
  interest: number;
  friction: number;
  occupiedDays: number;
  netPerDay: number;
  js: number; // the source's J_s
  t: number; // this study's tail-compatible T
  credible: boolean;
  signature: string; // the trace's trade-content hash
  intervals?: number[]; // credible only: entry, exit-or-end session index per lot
  entryYears?: number; // credible only: distinct calendar years of the entries
}

export const candidateOf = (
  m: StandaloneMetrics,
  meta: { symbol: string; provenance: Provenance; stage: CandidateStage; origin: string },
  dates: readonly string[]
): Candidate => {
  const entries = m.intervals.filter((_, index) => index % 2 === 0);

  return {
    symbol: meta.symbol,
    key: gridKeyOf(m.grid),
    grid: m.grid,
    id: idOf(m.grid as unknown as IntParams),
    provenance: meta.provenance,
    stage: meta.stage,
    origin: meta.origin,
    trades: m.trades,
    closed: m.closed,
    open: m.open,
    net: m.net,
    best: m.bestTrade,
    worst: m.worstTrade,
    dd: m.minuteDrawdown,
    ddDaily: m.dailyDrawdown,
    interest: m.interest,
    friction: m.friction,
    occupiedDays: m.occupiedDays,
    netPerDay: m.netPerDay,
    js: jsOf(m),
    t: tOf(m),
    credible: m.credible,
    signature: m.signature,
    ...(m.credible
      ? { intervals: [...m.intervals], entryYears: new Set(entries.map((s) => dates[s]!.slice(0, 4))).size }
      : {})
  };
};

const numberReplacer = (_key: string, value: unknown) =>
  typeof value === 'number' && !Number.isFinite(value) ? (Number.isNaN(value) ? 'NaN' : String(value)) : value;

const numberReviver = (_key: string, value: unknown) =>
  value === 'NaN' ? NaN : value === 'Infinity' ? Infinity : value === '-Infinity' ? -Infinity : value;

export const encodeCandidates = (candidates: readonly Candidate[]) =>
  gzipSync(
    `${candidates.map((c) => JSON.stringify({ schema: candidateSchema, v: candidateSchemaVersion, ...c }, numberReplacer)).join('\n')}\n`,
    { level: 9 }
  );

export const decodeCandidates = (buffer: Buffer): Candidate[] =>
  gunzipSync(buffer)
    .toString('utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const { schema, v, ...rest } = JSON.parse(line, numberReviver) as Candidate & { schema: string; v: number };

      if (schema !== candidateSchema || v !== candidateSchemaVersion) {
        throw new Error(`not a ${candidateSchema} v${candidateSchemaVersion} row`);
      }

      return rest as Candidate;
    });

export const writeCandidates = async (file: string, candidates: readonly Candidate[]) => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: candidate files are written once`);
  }

  await fs.outputFile(file, encodeCandidates(candidates));
};

export const readCandidates = async (file: string) => decodeCandidates(await fs.readFile(file));

// Ordering helpers (deterministic ties by grid key).
export const byKey = (a: Pick<Candidate, 'key'>, b: Pick<Candidate, 'key'>) =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
export const byJs = (a: Candidate, b: Candidate) => b.js - a.js || byKey(a, b);
export const byT = (a: Candidate, b: Candidate) => b.t - a.t || byKey(a, b);
export const byNet = (a: Candidate, b: Candidate) => b.net - a.net || byKey(a, b);
