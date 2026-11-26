// gdx-d1-growth (P8-GDX 1.0.0): Priority 8 — GDX-only D1 + Growth research and the matched total-portfolio comparison,
// authorized by the user (research/gdx-d1-growth/brief/BRIEF.md). research/gdx-d1-growth/PROTOCOL.md is the authority;
// this file holds its constants.
//
// THE STUDY TRADES ONLY GDX. The accepted engine (Priority 3's pool through RC 2, src/vg-l0-risk-families/evaluate.ts,
// and its CUDA port) is symbol-agnostic in its arrays: a door is two engine SLOTS (named "GDX" and "VGT" by the engine's
// types) of one common calendar. As in P6-TSLA, BOTH slots carry the same GDX sessions (one SymDoor object), and only the
// books of the engine slot NAMED "VGT" trade: the engine's D1·VGT book is this study's D1·GDX and the engine's Growth·VGT
// book is this study's Growth·GDX. The books of the engine slot NAMED "GDX" are disabled in EVERY evaluation
// (EvalOptions.enabled: never run or funded); its D1 book carries a fixed inert vector so identities stay canonical. No
// evaluation-code file changes (the GPU acceptance record stays valid). Reports name the trading books D1·GDX and
// Growth·GDX; the disabled slot is "the engine's second slot".
//
// Why the engine's VGT-named slot carries GDX (and not its GDX-named slot): Assignment 3's configuration type (whose
// genome, identities, archive keys and GPU domain the accepted evaluator covers) searches ONE Growth book, the engine's
// Growth·VGT; the engine's Growth·GDX is a fixed placeholder there. The GDX incumbents (N/original's, New L0's and VG #2's
// GDX D1 books; 4A's GDX Growth books) are projected unchanged onto the trading slot, and gate E3 proves the projection:
// N/original's native GDX D1 book with both VGT books disabled (the ablation, on N/original's own door) and 4A's native
// GDX Growth books reproduce trade for trade and to the cent in the trading slot on this study's GDX door.
//
// ARMS (brief Phase 3): D = GDX D1 standalone; G = GDX Growth standalone; C = fixed D1 + Growth pairs of the standalone
// selections (no search); J = fully joint D1 + Growth; S = D1-first sequential (D's finalists frozen, Growth searched
// against the shared-slot portfolio containing the frozen D1). The INFORMED populations D+, G+ and C+ exist at C24 only
// (brief Phase 3 item 3, standard §3.2–§3.3, §4.4): D+ = arm D's members ∪ arm D's C24 informed lanes (seeded by the GDX D1
// incumbents) ∪ the qualified GDX D1 incumbents themselves; G+ likewise for Growth; C+ = the fixed pairs of D+'s and G+'s
// finalists. Informed selections have no independent chronological test (standard §1.8).
import path from 'node:path';
import { RESEARCH_CAPITAL } from '../risk-envelope/policy.ts';
import { arms as stageBArms, asPilotArm } from '../vg-l0-risk-envelope-stage-b/context.ts';
import type { Arm as PilotArm } from '../vg-l0-risk-envelope-pilot/context.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'gdx-d1-growth';
export const STUDY_ID = `research/${STUDY}`;
export const PROTOCOL_ID = 'P8-GDX';
export const PROTOCOL_VERSION = '1.0.0';
export const SYMBOL = 'GDX';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheDir = path.join(researchDir, 'cache'); // git-ignored: job state, doors, datasets
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const engineeringFile = path.join(resultsDir, 'engineering', 'gates.json');
export const codeDir = import.meta.dirname;

// Every seed of the study: deriveSeed('gdx-d1-growth', ...labels) — never another study's namespace.
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const C0 = RESEARCH_CAPITAL.initialAllocation; // the fixed $100,000 trading allocation
export const ceiling = 35_000; // P0: 35 % of C0 (never of peak equity)

// ----- arms -----

export type ArmKey = 'D' | 'G' | 'C' | 'J' | 'S';
export const armKeys: readonly ArmKey[] = ['D', 'G', 'C', 'J', 'S'];
export const searchArms: readonly ArmKey[] = ['D', 'G', 'J', 'S'];
export type Family = 'D1' | 'G';
export const armName: Record<ArmKey, string> = {
  D: 'GDX D1 standalone',
  G: 'GDX Growth standalone',
  C: 'Fixed GDX D1 + Growth pair (standalone selections, no re-optimization)',
  J: 'Fully joint GDX D1 + Growth',
  S: 'D1-first sequential (frozen GDX D1 finalists + Growth searched in the shared slot)'
};
// the families an arm's portfolio contains (feasibility / Q6: each must receive capital at the centre)
export const armFamilies: Record<ArmKey, readonly Family[]> = { D: ['D1'], G: ['G'], C: ['D1', 'G'], J: ['D1', 'G'], S: ['D1', 'G'] };

// the informed arms (C24 only): the population, the arm whose records hold it, and its label
export type InformedKey = 'D+' | 'G+' | 'C+';
export const informedKeys: readonly InformedKey[] = ['D+', 'G+', 'C+'];
export const informedArm: Record<InformedKey, 'D' | 'G' | 'C'> = { 'D+': 'D', 'G+': 'G', 'C+': 'C' };
export const informedCutoff = 'C24' as const;

// The evaluation options of each arm: the engine's second (GDX-named) slot never trades (both its books disabled); D
// disables Growth·GDX and G disables D1·GDX; C, J and S trade both GDX books in the one shared slot (D1 first at a same
// instant).
const off = { 'D1:GDX': false, 'G:GDX': false } as const;
export const armOptions: Record<ArmKey, EvalOptions> = {
  D: { enabled: { ...off, 'G:VGT': false } },
  G: { enabled: { ...off, 'D1:VGT': false } },
  C: { enabled: { ...off } },
  J: { enabled: { ...off } },
  S: { enabled: { ...off } }
};

// P0 — the only search and qualification policy: Stage B's CTRL arm (nl0-control@1.0.0: the marked DD ≤ $35,000, NL0's
// neighbourhood instrument), as Priority 5 and P6-TSLA used it. The GDX arm adds the required families and the options.
export const P0: PilotArm = asPilotArm(stageBArms.CTRL);
export type GdxArm = PilotArm & { study: ArmKey; families: readonly Family[]; options: EvalOptions };
export const armPolicy = (a: ArmKey): GdxArm => ({ ...P0, study: a, families: armFamilies[a], options: armOptions[a] });

// ----- data, cutoffs, doors and slices (retrospective, previously examined history) -----

export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  endpoint: '2026-10-30' // the study's common complete endpoint (GDX's; verified from the file before the freeze)
} as const;

export type CutoffKey = 'C19' | 'C21' | 'C23' | 'C24';
export type DoorName = 'D19' | 'D21' | 'D23' | 'D24' | 'FULL';
export interface CutoffSpec {
  key: CutoffKey;
  door: Exclude<DoorName, 'FULL'>;
  end: string; // the cutoff close: the boundary of the continuous slice run
  sliceDoor: Exclude<DoorName, 'D19'>;
  slice: [string, string];
  previous: CutoffKey | null;
}
export const cutoffs: Record<CutoffKey, CutoffSpec> = {
  C19: { key: 'C19', door: 'D19', end: '2019-12-31', sliceDoor: 'D21', slice: ['2020-01-02', '2021-12-31'], previous: null },
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', sliceDoor: 'D23', slice: ['2022-01-03', '2023-12-29'], previous: 'C19' },
  C23: { key: 'C23', door: 'D23', end: '2023-12-29', sliceDoor: 'D24', slice: ['2024-01-02', '2024-12-31'], previous: 'C21' },
  C24: { key: 'C24', door: 'D24', end: '2024-12-31', sliceDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'], previous: 'C23' }
};
export const cutoffKeys: readonly CutoffKey[] = ['C19', 'C21', 'C23', 'C24'];
export const foldKeys: readonly CutoffKey[] = ['C19', 'C21', 'C23'];

// ----- the GPU execution contract (the accepted evaluator's Mode S; timings never select anything) -----

export const execution = {
  batchSize: 8192,
  lingerMs: 30,
  hostWorkers: 8,
  slice: 'gdx8.slice',
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
