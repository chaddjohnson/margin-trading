// vg-l0-risk-envelope-stage-b (RES-B 1.0.0): the replicated, paired GPU comparison of P0 (NL0 control) and P3 (40/25/30)
// authorized by the user (research/vg-l0-risk-envelope-stage-b/brief/BRIEF.md). research/vg-l0-risk-envelope-stage-b/
// PROTOCOL.md is the authority; this file holds its constants.
//
// TWO ARMS of the same NL0 / Assignment 3 broad search (the pilot's generated lane, src/vg-l0-risk-envelope-pilot/search.ts,
// imported unchanged) on the same cells, seeds, schedules, doors, costs and execution rules:
//   CTRL    src/risk-envelope/policy.ts `nl0-control@1.0.0` (P0) — marked DD ≤ 35 % of C0;
//   EXP30   `sens-p3-40-25-30@1.0.0` (P3) — marked DD ≤ 40 % of C0, every funded trade's principal loss ≤ 25 % of its
//           funded entry principal, banked-capital DD ≤ 30 % of C0 (both on the liquidation basis). The object is
//           deep-equal to Stage A's P3 (tools/vg-l0-risk-envelope-sensitivity/policies.ts; tests/static.test.ts).
// The arm never enters a seed: lane key = seed key `<cutoff>/broad/<cell>/R<r>` in Assignment 3's seed namespace.
import path from 'node:path';
import { NL0_CONTROL, RESEARCH_CAPITAL, type RiskEnvelopePolicy, limitOf } from '../risk-envelope/policy.ts';
import type { Arm as PilotArm } from '../vg-l0-risk-envelope-pilot/context.ts';

export const STUDY = 'vg-l0-risk-envelope-stage-b';
export const STUDY_ID = `research/${STUDY}`;
export const PROTOCOL_ID = 'RES-B';
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

export const C0 = RESEARCH_CAPITAL.initialAllocation;
export const capital = RESEARCH_CAPITAL;

// P3 — the policy Stage A predeclared (POLICY_MATRIX.md P3), rebuilt here with the identical fields
export const P3: RiskEnvelopePolicy = {
  id: 'sens-p3-40-25-30',
  version: '1.0.0',
  description: 'marked DD ≤ 40% of C0; trade PL ≤ 25% of funded principal; banked DD ≤ 30% of C0 (liquidation)',
  markedDd: { pct: 40 },
  principalLoss: { pct: 25, basis: 'liquidation' },
  bankedDd: { pct: 30, basis: 'liquidation' }
};

export type ArmKey = 'CTRL' | 'EXP30';
export const armKeys: readonly ArmKey[] = ['CTRL', 'EXP30'];

// the pilot's Arm shape (fitness.ts / search.ts / qualify.ts verdictOf read policy, markedDdLimit, nbInstrument; the key
// only labels tags, checkpoints and errors)
export interface Arm extends Omit<PilotArm, 'key'> {
  key: ArmKey;
}

const armOf = (key: ArmKey, policy: RiskEnvelopePolicy): Arm => ({
  key,
  policy,
  markedDdLimit: limitOf(policy.markedDd.pct, C0),
  // original RA1 keeps S4 = 35 % of C0 in both arms; the descriptive envelope-adapted RA1 (EXP30 only) uses S4 = 40 % of C0
  ra1S4: { original: limitOf(NL0_CONTROL.markedDd.pct, C0), adapted: key === 'EXP30' ? limitOf(policy.markedDd.pct, C0) : null },
  nbInstrument: key === 'CTRL' ? 'nl0' : 'unrounded'
});

export const arms: Record<ArmKey, Arm> = { CTRL: armOf('CTRL', NL0_CONTROL), EXP30: armOf('EXP30', P3) };
// the pilot's modules are typed for its own arm keys; the shape is identical (the key is a label)
export const asPilotArm = (a: Arm) => a as unknown as PilotArm;

// the two predeclared structural cells (the pilot's D-1: the legacy cell and the outcome-independent hash-selected cell)
export const legacyCell = 'GA0.VA0';
export const hashedCell = 'GB0.VD1';
export const cells = [legacyCell, hashedCell] as const;
// 16 genuinely new paired replicates; R1/R2 (Assignment 3, the pilot) are reproduction lanes of gate E2 only
export const replicates = Array.from({ length: 16 }, (_v, i) => i + 3) as readonly number[];
export const reproReplicates = [1, 2] as const;

// The cutoffs, their training doors and their next intervals (retrospective, previously inspected history)
export type CutoffKey = 'C19' | 'C21' | 'C24';
export interface CutoffSpec {
  key: CutoffKey;
  role: 'primary' | 'secondary';
  door: 'D19' | 'D21' | 'D24';
  end: string; // the cutoff close (the boundary of the continuous interval run)
  sliceDoor: 'D21' | 'D23' | 'FULL';
  slice: [string, string];
  sliceStage: 'interval' | 'validation';
  previous: CutoffKey | null; // the fold that must be complete (interval sealed and committed) before this fold's search
}
export const cutoffs: Record<CutoffKey, CutoffSpec> = {
  C19: { key: 'C19', role: 'secondary', door: 'D19', end: '2019-12-31', sliceDoor: 'D21', slice: ['2020-01-02', '2021-12-31'], sliceStage: 'interval', previous: null },
  C21: { key: 'C21', role: 'primary', door: 'D21', end: '2021-12-31', sliceDoor: 'D23', slice: ['2022-01-03', '2023-12-29'], sliceStage: 'interval', previous: 'C19' },
  C24: { key: 'C24', role: 'primary', door: 'D24', end: '2024-12-31', sliceDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'], sliceStage: 'validation', previous: 'C21' }
};
export const cutoffKeys: readonly CutoffKey[] = ['C19', 'C21', 'C24'];
export const primaryCutoffs: readonly CutoffKey[] = ['C21', 'C24'];

// the precommitted decision margins (PROTOCOL.md §1, §9)
export const margins = {
  nonInferiority: -5_000, // L90 of mean D must exceed this at C21 and C24
  superiority: 2_500, // mean D must exceed this (and L90 > 0) at C21 and C24
  pooled: 2_500, // the pilot's materiality margin for the pooled-shortlist statistic
  intervalDd: 5_000, // T1 / T2 interval DD non-inferiority margin
  bootstrap: 100_000, // resamples
  lowerQuantile: 0.1 // the one-sided 90 % bound
};

// the execution window (PROTOCOL.md §13)
export const windowStart = '2026-11-22T21:14:00Z';
export const windowEnd = '2026-11-23T06:14:00Z';
export const latestSearchLaunch = '2026-11-23T04:30:00Z';

// the GPU execution contract (the accepted evaluator's measured Mode S; timings never select anything)
export const execution = {
  batchSize: 8192,
  lingerMs: 30,
  hostWorkers: 8,
  slice: 'vgl0reb.slice',
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
