// optimization-process-audit: a bounded archive-reselection experiment on the selection step of Priorities 3B
// (research/vg-d1-growth-expanded) and 4A (research/gdx-growth-standalone). No phenotype search: the subjects' archived
// independent candidate sets are re-ranked by the unchanged original policy and at most three frozen experimental
// policies. research/optimization-process-audit/PROTOCOL.md is the authority; this file holds its constants.
import path from 'node:path';

export const STUDY = 'optimization-process-audit';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const briefFile = path.join(researchDir, 'brief', 'BRIEF.md');
export const protocolFile = path.join(researchDir, 'PROTOCOL.md');
export const amendmentsFile = path.join(researchDir, 'AMENDMENTS.md');
export const adoptionFile = path.join(researchDir, 'STANDARD_ADOPTION.json');

export const stageFile = {
  inventory: path.join(resultsDir, 'stage1', 'inventory.json'),
  reproduction: path.join(resultsDir, 'stage1', 'reproduction.json'),
  mechanism: path.join(resultsDir, 'stage1', 'mechanism.json'),
  policyFreeze: path.join(resultsDir, 'stage2', 'POLICY_FREEZE.json'),
  choices: path.join(resultsDir, 'stage3', 'CHOICES.json'),
  outcomes: path.join(resultsDir, 'stage3', 'outcomes.json'),
  analysis: path.join(resultsDir, 'stage3', 'analysis.json'),
  c24Freeze: path.join(resultsDir, 'stage4', 'C24_FREEZE.json'),
  validation: path.join(resultsDir, 'stage4', 'validation.json')
};

// The fixed economics and windows (PROTOCOL.md §3; identical in both subjects).
export const economics = { budget: 100_000, ceiling: 35_000, costBps: 5, rate: 0.11 };
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  endpoint: '2026-10-30'
};

export type Cut = 'C19' | 'C21' | 'C23' | 'C24';
export type HistCut = 'C19' | 'C21' | 'C23';
export type DoorName = 'D19' | 'D21' | 'D23' | 'D24' | 'FULL';
export const histCuts: HistCut[] = ['C19', 'C21', 'C23'];
export const allCuts: Cut[] = ['C19', 'C21', 'C23', 'C24'];

export interface CutSpec {
  key: Cut;
  door: Exclude<DoorName, 'FULL'>; // the training door
  end: string; // the cutoff close (the slice boundary)
  evalDoor: DoorName; // the next-slice door
  slice: [string, string];
}

export const cuts: Record<Cut, CutSpec> = {
  C19: { key: 'C19', door: 'D19', end: '2019-12-31', evalDoor: 'D21', slice: ['2020-01-02', '2021-12-31'] },
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', evalDoor: 'D23', slice: ['2022-01-03', '2023-12-29'] },
  C23: { key: 'C23', door: 'D23', end: '2023-12-29', evalDoor: 'D24', slice: ['2024-01-02', '2024-12-31'] },
  C24: { key: 'C24', door: 'D24', end: '2024-12-31', evalDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'] }
};

// The budgets (PROTOCOL.md §9): fresh backend simulations of every kind, of which next-slice / full-history.
export const budgets = { freshTotal: 100_000, freshNextPeriod: 800, distinctNextPeriod: 600, cohortPerCut: 96 };

// The resource contract (PROTOCOL.md §10).
export const resources = {
  slice: 'opa.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  gcEvery: 32,
  lruCapacity: 20_000,
  storeCommitRows: 64,
  storeCommitMs: 5_000
};

export const r2 = (x: number) => Math.round(x * 100) / 100;

let quiet = false;

export const setQuiet = (value: boolean) => {
  quiet = value;
};

export const log = (message: string) => {
  if (!quiet) process.stderr.write(`[${new Date().toISOString()}] ${message}\n`);
};
