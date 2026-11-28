// vg-l0-n-successor (P5-NS 1.0.0): Priority 5 — the comprehensive N/original successor optimization authorized by the
// user (research/vg-l0-n-successor/brief/BRIEF.md). research/vg-l0-n-successor/PROTOCOL.md is the authority; this file
// holds its constants.
//
// The portfolio is exactly D1·VGT + D1·GDX + Growth·VGT in ONE exclusive $100,000 slot (Priority 3's pool, L0, D1 first,
// GDX before VGT); Growth·GDX OFF; S1 staged trailing stops do not exist on this branch's engine (the S1-free GPU Phase 7
// revision); shadow-entry eligibility OFF; calendar-day holds. The genome is Assignment 3's 92-gene full joint space
// (src/vg-l0-full-joint/space.ts, imported unchanged). The search lane is the GPU-era port of Assignment 3's lane
// (src/vg-l0-risk-envelope-pilot/search.ts, imported unchanged) under policy P0 = Stage B's CTRL arm (nl0-control@1.0.0
// = Assignment 3's plausibility, violation, hypervolume reference and neighbourhood instrument exactly).
//
// Two tracks: Track F (independent, every cutoff C19, C21, C23, C24) and Track N (N/original-informed, C24 only).
import path from 'node:path';
import { RESEARCH_CAPITAL } from '../risk-envelope/policy.ts';
import { arms as stageBArms, asPilotArm } from '../vg-l0-risk-envelope-stage-b/context.ts';
import type { Arm as PilotArm } from '../vg-l0-risk-envelope-pilot/context.ts';

export const STUDY = 'vg-l0-n-successor';
export const STUDY_ID = `research/${STUDY}`;
export const PROTOCOL_ID = 'P5-NS';
export const PROTOCOL_VERSION = '1.0.0';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheDir = path.join(researchDir, 'cache'); // git-ignored: job state (archives, checkpoints, datasets)
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const engineeringFile = path.join(resultsDir, 'engineering', 'gates.json');
export const codeDir = import.meta.dirname;

export const C0 = RESEARCH_CAPITAL.initialAllocation; // the fixed $100,000 trading allocation
export const ceiling = 35_000; // P0: 35 % of C0 (never of peak equity)

// P0 — the only selection policy: Stage B's CTRL arm object (nl0-control@1.0.0; Assignment 3's instrument exactly; its
// equality with Assignment 3's sealed lanes is Stage B's gate E2 and this study's gate E3)
export const P0: PilotArm = asPilotArm(stageBArms.CTRL);

// ----- cutoffs, doors and slices (retrospective, previously examined history) -----

export type CutoffKey = 'C19' | 'C21' | 'C23' | 'C24';
export interface CutoffSpec {
  key: CutoffKey;
  door: 'D19' | 'D21' | 'D23' | 'D24';
  end: string; // the cutoff close: the boundary of the continuous slice run
  sliceDoor: 'D21' | 'D23' | 'D24' | 'FULL';
  slice: [string, string];
  previous: CutoffKey | null; // the fold that must be complete (its slice record sealed and committed) first
}
export const cutoffs: Record<CutoffKey, CutoffSpec> = {
  C19: { key: 'C19', door: 'D19', end: '2019-12-31', sliceDoor: 'D21', slice: ['2020-01-02', '2021-12-31'], previous: null },
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', sliceDoor: 'D23', slice: ['2022-01-03', '2023-12-29'], previous: 'C19' },
  C23: { key: 'C23', door: 'D23', end: '2023-12-29', sliceDoor: 'D24', slice: ['2024-01-02', '2024-12-31'], previous: 'C21' },
  C24: { key: 'C24', door: 'D24', end: '2024-12-31', sliceDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'], previous: 'C23' }
};
export const cutoffKeys: readonly CutoffKey[] = ['C19', 'C21', 'C23', 'C24'];
export const foldKeys: readonly CutoffKey[] = ['C19', 'C21', 'C23'];
export const commonCompleteEndpoint = '2026-10-30';

// ----- the GPU execution contract (the accepted evaluator's measured Mode S; timings never select anything) -----

export const execution = {
  batchSize: 8192,
  lingerMs: 30,
  hostWorkers: 8,
  slice: 'vgl0ns.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0'
};

let quiet = false;
export const setQuiet = (v: boolean) => {
  quiet = v;
};
export const log = (message: string) => {
  if (!quiet) console.log(`[${STUDY} ${new Date().toISOString().slice(11, 19)}Z] ${message}`);
};
export const r2 = (x: number) => Math.round(x * 100) / 100;
