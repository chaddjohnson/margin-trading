// P6-TSLA's budgets (PROTOCOL.md §7): NL0 1.0.0's per-lane schedules exactly as Assignment 3 and Priority 5 executed them
// (src/vg-l0-full-joint/budgets.ts: broad lane = 5B's V-cell schedule; refinement lane = 5B's informed schedule seeded by
// the same cutoff's qualified broad members), unchanged in every rule except Priority 5's island caps (16, the two-tier
// rule, lanes.ts), scaled by REPLICATES per arm and cell (standard §4.8), with Priority 5's convergence-driven replicate
// rounds. Comparable effort across arms (brief §4.6, standard §3.4) is set in requested evaluations from the pilot's
// per-lane means (frozen in the freeze's `expected`):
//   D  8 cells × 4 base replicates (32 lanes)            — the D1 genome: ≤ 14 free numeric genes + 2 categorical
//   G  6 cells × 8 base replicates (48 lanes)            — the Growth genome: 50 numeric + 6 free structural genes
//   J  48 cells × 4 base replicates (192 lanes)          — both books
//   S  F frozen D1 finalists (≤ 3) × 6 cells × R_S       — R_S = the smallest integer ≥ 4 with
//      F·6·R_S·E[S lane] + 32·E[D lane] ≥ 192·E[J lane] (the sequential architecture, its D1 step included, gets at
//      least the joint search's base effort; computed by the pilot, frozen in `replicates.sequentialBase`)
// Refinement (stage 2): the frozen plan's cells (select.ts refineCells: quotas D 8, G 6, J 16, S 12) × 4 replicates.
// Replicate rounds: after the base replicates of an arm at a cutoff, one more replicate of EVERY cell of the arm iff the
// last replicate raised the arm's union of feasible rung-3 and shortlist fits — hypervolume of (−robust net, p90 DD)
// against (0, $35,000), best robust net or best centre net — by > 2 %, or gave a cell its first feasible fit; ≤ 4 rounds.
import { budgets, laneWorstCase } from '../vg-l0-full-joint/budgets.ts';
import type { Budget } from './search.ts';
import { fidelity } from '../vg-l0-risk-families/qualify.ts';
import type { ArmKey } from './context.ts';

export type Kind = 'broad' | 'refine';

// NL0's island caps (the full trigger applies up to them) and the study's caps (performance components only beyond)
export const nl0Caps: Record<Kind, number> = { broad: budgets.study.broad.islandsMax, refine: budgets.study.refine.islandsMax };
export const islandCaps: Record<Kind, number> = { broad: 16, refine: 16 };
export const schedules: Record<Kind, Budget> = {
  broad: { ...budgets.study.broad, islandsMax: islandCaps.broad },
  refine: { ...budgets.study.refine, islandsMax: islandCaps.refine }
};

export const firstReplicate = 101; // seed keys R101, R102, … (this study's namespace)
export const replicates = {
  base: { D: 4, G: 8, J: 4, S: 4 } as Record<Exclude<ArmKey, 'C'>, number>, // S: overwritten by the frozen matching rule below
  sequentialBase: 8, // R_S (the pilot's matching rule; PROTOCOL.md §7.6) — recorded in the freeze
  refine: 4, // per refined cell
  maxRounds: 4,
  roundThreshold: 0.02
};
replicates.base.S = replicates.sequentialBase;

export const refineQuota: Record<Exclude<ArmKey, 'C'>, number> = { D: 8, G: 6, J: 16, S: 12 };
export const maxFrozenD1 = 3; // the D arm's finalists frozen for arm S (primary, robust-profit, balanced; distinct ledgers)
export const maxPairSide = 3; // arm C: the D and G finalists paired (≤ 3 × 3)

// per-lane deterministic bounds (requested evaluations; rounded up to 1,000): broad no designs; refine ≤ 3 shortlisted
// members of every broad replicate of the cell (base + rounds) + 2 focus seeds
const up = (x: number) => Math.ceil(x / 1000) * 1000;
const maxBroadReplicates = Math.max(...Object.values(replicates.base)) + replicates.maxRounds;

export const laneCaps: Record<Kind, number> = {
  broad: up(laneWorstCase(schedules.broad, 0, 0)),
  refine: up(laneWorstCase(schedules.refine, maxBroadReplicates * 3 * 25 + 2 * 128, 2))
};

// qualification per member: detailed centre + centre + stresses + removals + selection 2 × 128 + confirmation 3 × 128
export const stressCount = 8;
export const perMemberMax = 2 + stressCount + 2 + (fidelity.selectReps + fidelity.confirmReps) * fidelity.n;
// a slice / validation subject: the detailed centre + the centre with the boundary + the stresses + the selection family
// 2 × 128 replayed + the session-close series (≤ 40 evaluations of 16 boundaries for a two-year slice)
export const perSubject = 2 + stressCount + fidelity.selectReps * fidelity.n + 40;

// the hard ceiling of requested official evaluations over the whole study (a resource safeguard, never convergence); a
// stage launches only if the remaining ceiling covers 1.5 × its expected cost and the disk keeps its reserve after its
// archive; completed cutoffs' job archives are compressed (verified, restorable) before the next cutoff's searches
export const ceilingRequested = 120_000_000;
export const archiveBytesPerFresh = 4_800;
export const diskReserveBytes = 60 * 1024 ** 3;
