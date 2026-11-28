// vg-l0-risk-envelope-pilot (NL0-REP 1.0.0): the bounded risk-envelope pilot authorized by the user
// (research/vg-l0-risk-envelope-pilot/brief/BRIEF.md). research/vg-l0-risk-envelope-pilot/PROTOCOL.md is the authority;
// this file holds its constants.
//
// The pilot compares TWO ARMS of the same NL0 / Assignment 3 broad search on the same cells, seeds, schedules, doors,
// costs and execution rules:
//   CTRL  src/risk-envelope/policy.ts `nl0-control@1.0.0`  — marked DD ≤ 35 % of C0 (the original NL0 rule; the
//         principal-loss and banked-capital metrics are delivered and reported, never read by a decision);
//   EXP   src/risk-envelope/policy.ts `re-40-25-25@1.0.0`  — marked DD ≤ 40 % of C0, every funded trade's principal
//         loss ≤ 25 % of its funded entry principal, banked-capital DD ≤ 25 % of C0 (both on the liquidation basis).
// The arm never enters a seed: both arms use Assignment 3's own lane keys in Assignment 3's seed namespace
// (src/vg-l0-full-joint/context.ts seedOf, space.ts screenGenomes / neighbourhood), so every difference between the
// arms is caused by the envelope.
import path from 'node:path';
import { NL0_CONTROL, RESEARCH_CAPITAL, RE_EXPERIMENTAL, type RiskEnvelopePolicy, limitOf } from '../risk-envelope/policy.ts';

export const STUDY = 'vg-l0-risk-envelope-pilot';
export const STUDY_ID = `research/${STUDY}`;
export const PROTOCOL_ID = 'NL0-REP';
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

// C0: the fixed $100,000 trading allocation of the shared-funded slot (the pool's budget). Every limit below is a whole
// percent of a NAMED denominator, computed by policy.ts limitOf as (C0 × pct) / 100 — never a literal.
export const C0 = RESEARCH_CAPITAL.initialAllocation;
export const capital = RESEARCH_CAPITAL;

export type ArmKey = 'CTRL' | 'EXP';
export const armKeys: readonly ArmKey[] = ['CTRL', 'EXP'];

export interface Arm {
  key: ArmKey;
  policy: RiskEnvelopePolicy;
  markedDdLimit: number; // the arm's marked-DD limit in dollars (the hypervolume / extension reference point (0, limit))
  ra1S4: { original: number; adapted: number | null }; // RA1's S4 worst-10 % mean DD ceiling(s) (decision D-8)
  // the neighbourhood statistic the arm's feasibility gates compare: 'nl0' = Priority 3's nbStats p90 DD (rounded to
  // cents: the frozen NL0 / Assignment 3 instrument, required for CTRL = Assignment 3); 'unrounded' = the unrounded p90
  // of every gated metric (brief §2)
  nbInstrument: 'nl0' | 'unrounded';
}

const armOf = (key: ArmKey, policy: RiskEnvelopePolicy): Arm => ({
  key,
  policy,
  markedDdLimit: limitOf(policy.markedDd.pct, C0),
  // D-8 refined: original RA1 keeps S4 = 35 % of C0 in both arms; the envelope-adapted RA1 (EXP only) uses S4 = the EXP
  // marked-DD limit (40 % of C0). Only S4's drawdown ceiling differs between the two RA1 versions.
  ra1S4: {
    original: limitOf(NL0_CONTROL.markedDd.pct, C0),
    adapted: key === 'EXP' ? limitOf(policy.markedDd.pct, C0) : null
  },
  nbInstrument: key === 'CTRL' ? 'nl0' : 'unrounded'
});

export const arms: Record<ArmKey, Arm> = {
  CTRL: armOf('CTRL', NL0_CONTROL),
  EXP: armOf('EXP', RE_EXPERIMENTAL)
};

// D-1: two predeclared structural cells — the legacy cell and the outcome-independent hash-selected cell
// (min over the other 63 cells of sha256("vg-l0-risk-envelope-pilot/cell/" + id); verified in tests/cells.test.ts).
export const legacyCell = 'GA0.VA0';
export const hashedCell = 'GB0.VD1';
export const cells = [legacyCell, hashedCell] as const;
export const replicates = [1, 2] as const;
export const cellSelectionPrefix = 'vg-l0-risk-envelope-pilot/cell/';

// The cutoffs (Assignment 3's C21 and C24), their training doors and their next intervals (retrospective, previously
// inspected history: never a pristine holdout).
export type CutoffKey = 'C21' | 'C24';
export interface CutoffSpec {
  key: CutoffKey;
  door: 'D21' | 'D24';
  end: string; // the cutoff close (the boundary of the continuous run)
  sliceDoor: 'D23' | 'FULL';
  slice: [string, string];
  sliceStage: 'slice' | 'validation';
}
export const cutoffs: Record<CutoffKey, CutoffSpec> = {
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', sliceDoor: 'D23', slice: ['2022-01-03', '2023-12-29'], sliceStage: 'slice' },
  C24: { key: 'C24', door: 'D24', end: '2024-12-31', sliceDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'], sliceStage: 'validation' }
};
export const cutoffKeys: readonly CutoffKey[] = ['C21', 'C24'];

// The budget ceiling of the authorization (§1: total REQUESTED pilot research evaluations — search, qualification and
// the subsequent intervals; engineering verification and nonbinding CPU diagnostics are recorded separately).
export const budgetCeiling = 700_000;

// The GPU execution contract (Phase 7's measured shape; timings never select anything).
export const execution = {
  batchSize: 8192,
  lingerMs: 30,
  hostWorkers: 8,
  slice: 'vgl0rep.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0'
};

export const nodeBinary = process.execPath;

let quiet = false;
export const setQuiet = (v: boolean) => {
  quiet = v;
};
export const log = (message: string) => {
  if (!quiet) console.log(`[${STUDY} ${new Date().toISOString().slice(11, 19)}Z] ${message}`);
};
export const r2 = (x: number) => Math.round(x * 100) / 100;
