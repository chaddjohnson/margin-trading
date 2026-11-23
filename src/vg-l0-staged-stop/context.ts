// vg-l0-staged-stop (Priority 4, S1 staged trailing stops): the paired GPU optimization authorized by the user
// (research/vg-l0-staged-stop/brief/BRIEF.md). research/vg-l0-staged-stop/PROTOCOL.md is the authority once frozen; this
// file holds its constants.
//
// TWO ARMS of the same NL0 / Assignment 3 broad search (this study's lane, src/vg-l0-staged-stop/search.ts, derived
// mechanically from Stage B's — the pilot's — lane) under the SAME risk policy P0 (nl0-control@1.0.0: marked DD ≤ 35 % of
// C0), cells, seeds, schedules, doors, costs and execution rules:
//   CTRL   Assignment 3's space (src/vg-l0-full-joint/space.ts): the staged stop forced OFF;
//   EXP    the same space plus three independent staged switches and their genes (space.ts expSpace).
// The arm never enters a seed of a shared gene: lane key = seed key `<cutoff>/broad/<cell>/R<r>` in Assignment 3's seed
// namespace (CTRL lanes R3–R18 are Stage B's sealed CTRL lanes); EXP's staged genes have their own streams in this
// study's namespace.
import path from 'node:path';
import { NL0_CONTROL, RESEARCH_CAPITAL, limitOf } from '../risk-envelope/policy.ts';
import type { Arm as PilotArm } from '../vg-l0-risk-envelope-pilot/context.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import type { SpaceDef } from './space.ts';

export const STUDY = 'vg-l0-staged-stop';
export const STUDY_ID = `research/${STUDY}`;
export const PROTOCOL_ID = 'P4-S1';
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

// this study's own seed namespace (the staged genes' streams only; shared genes use Assignment 3's)
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const C0 = RESEARCH_CAPITAL.initialAllocation;

export type ArmKey = 'CTRL' | 'EXP';
export const armKeys: readonly ArmKey[] = ['CTRL', 'EXP'];

// the pilot's Arm (policy, the hypervolume reference, the neighbourhood instrument) plus the arm's search space
export interface Arm extends Omit<PilotArm, 'key'> {
  key: ArmKey;
  sp: SpaceDef;
}

export const armOf = (key: ArmKey, sp: SpaceDef): Arm => ({
  key,
  policy: NL0_CONTROL,
  markedDdLimit: limitOf(NL0_CONTROL.markedDd.pct, C0),
  ra1S4: { original: limitOf(NL0_CONTROL.markedDd.pct, C0), adapted: null },
  nbInstrument: 'nl0',
  sp
});

// the two predeclared structural cells (the audit's: Stage B's legacy and hash-selected cells)
export const legacyCell = 'GA0.VA0';
export const hashedCell = 'GB0.VD1';
export const cells = [legacyCell, hashedCell] as const;
// 32 replicates per cell: R3–R18 are Stage B's seeds (its CTRL lanes are sealed: CTRL here must reproduce them), R19–R34
// are new
export const stageBReplicates = Array.from({ length: 16 }, (_v, i) => i + 3) as readonly number[];
export const replicates = Array.from({ length: 32 }, (_v, i) => i + 3) as readonly number[];

export type CutoffKey = 'C19' | 'C21' | 'C24';
export interface CutoffSpec {
  key: CutoffKey;
  role: 'primary' | 'secondary';
  door: 'D19' | 'D21' | 'D24';
  end: string;
  sliceDoor: 'D21' | 'D23' | 'FULL';
  slice: [string, string];
  sliceStage: 'interval' | 'validation';
  previous: CutoffKey | null;
}
export const cutoffs: Record<CutoffKey, CutoffSpec> = {
  C19: {
    key: 'C19',
    role: 'secondary',
    door: 'D19',
    end: '2019-12-31',
    sliceDoor: 'D21',
    slice: ['2020-01-02', '2021-12-31'],
    sliceStage: 'interval',
    previous: null
  },
  C21: {
    key: 'C21',
    role: 'primary',
    door: 'D21',
    end: '2021-12-31',
    sliceDoor: 'D23',
    slice: ['2022-01-03', '2023-12-29'],
    sliceStage: 'interval',
    previous: 'C19'
  },
  C24: {
    key: 'C24',
    role: 'primary',
    door: 'D24',
    end: '2024-12-31',
    sliceDoor: 'FULL',
    slice: ['2025-01-02', '2026-10-30'],
    sliceStage: 'validation',
    previous: 'C21'
  }
};
export const cutoffKeys: readonly CutoffKey[] = ['C19', 'C21', 'C24'];
export const primaryCutoffs: readonly CutoffKey[] = ['C21', 'C24'];

// the GPU execution contract (the accepted evaluator's measured Mode S; timings never select anything)
export const execution = {
  batchSize: 8192,
  lingerMs: 30,
  hostWorkers: 8,
  slice: 'vgl0ss.slice',
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
