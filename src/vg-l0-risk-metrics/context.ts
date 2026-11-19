// vg-l0-risk-metrics: the pre-optimization risk-metric and selection-methodology study (research/vg-l0-risk-metrics/
// brief/BRIEF.md). RESEARCH ONLY: pure metric functions on the existing funded-lot ledger and minute marks, a
// parameterized account-margin scenario model, retrospective selector comparisons on Assignment 3's archived
// populations and read-only replays of FIXED sealed configurations. No search, no new phenotype, no engine change, no
// adoption. research/vg-l0-risk-metrics/PROTOCOL.md is the authority; this file holds its constants.
import path from 'node:path';

export const STUDY = 'vg-l0-risk-metrics';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');

// The audited study (Assignment 3) whose sealed records and archived populations are read, never written.
export const fullJoint = {
  dir: path.join(repoRoot, 'research', 'vg-l0-full-joint'),
  frozenSelection: path.join(repoRoot, 'research', 'vg-l0-full-joint', 'FROZEN_SELECTION.json'),
  frozenSelectionSha256: '4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7' // verified before every read
};

// Historical economics of the reference ledger (unchanged; Priority 3 / NL0 1.0.0 §1.1).
export const economics = { budget: 100_000, ceiling: 35_000, costBps: 5, rate: 0.11 } as const;

export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30'
} as const;

export const cutoffEnd = { C19: '2019-12-31', C21: '2021-12-31', C23: '2023-12-29', C24: '2024-12-31' } as const;
export type CutoffKey = keyof typeof cutoffEnd;
export const cutoffKeys: CutoffKey[] = ['C19', 'C21', 'C23', 'C24'];
export const cutoffDoor = { C19: 'D19', C21: 'D21', C23: 'D23', C24: 'D24' } as const;
export const nextDoor = { C19: 'D21', C21: 'D23', C23: 'D24' } as const;

export const r2 = (x: number) => Math.round(x * 100) / 100;

export const log = (message: string) => console.log(`[${STUDY} ${new Date().toISOString().slice(11, 19)}Z] ${message}`);
