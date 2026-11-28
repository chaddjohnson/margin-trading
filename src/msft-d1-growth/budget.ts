// P9-MSFT's budgets (PROTOCOL.md §7): NL0 1.0.0's per-lane schedules exactly as Assignment 3, Priority 5, P6-TSLA and
// P8-GDX executed them (src/vg-l0-full-joint/budgets.ts: broad lane = 5B's V-cell schedule; refinement lane = 5B's
// informed schedule seeded by the same cutoff's qualified broad members), unchanged in every rule except Priority 5's
// island caps (16, the two-tier rule, lanes.ts), scaled by REPLICATES per arm and cell (standard §4.8), with Priority 5's
// convergence-driven replicate rounds. The executed precedents: P6-TSLA D 4 / G 8 / J 4 / refine 4 (44.16 M requested);
// P8-GDX × 1.5 (76.97 M). P9-MSFT scales P8-GDX's allocation by 4/3 in every stage and its GROWTH base replicates by 2 —
// P8-GDX measured a cross-seed range of a cell's best feasible centre net of 49–63 % in arm G against 10–30 % in D, J and S
// (research/gdx-d1-growth/SEARCH_AND_CONVERGENCE_REPORT.md §D), and the brief (Phase 3 items 2–4, Phase 5) asks for more
// independent seeds and not to starve Growth or the joint arm; a data-independent rule fixed before any MSFT result:
//   D  8 cells × 8 base replicates (64 lanes)            — the D1 genome: ≤ 14 free numeric genes + 2 categorical
//   G  6 cells × 24 base replicates (144 lanes)          — the Growth genome: 50 numeric + 6 free structural genes
//   J  48 cells × 8 base replicates (384 lanes)          — both books
//   S  F frozen D1 finalists (≤ 3) × 6 cells × R_S(F)    — R_S(F) = max(8, ⌈(384 − 64) ÷ (6·F)⌉): the sequential
//      architecture, its D1 step (arm D's 64 base lanes) included, gets at least the joint search's 384 base lanes
//      (F = 3 → 18, F = 2 → 27, F = 1 → 54); a data-independent lane-count rule, fixed before any official result
// Refinement (stage 2): the frozen plan's cells (select.ts refineCells: quotas D 8, G 6, J 16, S 12) × 8 replicates.
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
  base: { D: 8, G: 24, J: 8 } as Record<'D' | 'G' | 'J', number>, // arm S: sequentialReplicates(F) below
  refine: 8, // per refined cell
  refineSeeds: 24, // ≤ 24 seeds per refined cell: its qualified broad members in NL0's original order (Priority 5's maximum)
  maxRounds: 4,
  roundThreshold: 0.02
};
// arm S's base replicates for F frozen D1 finalists (lane-count matching against arm J; PROTOCOL.md §7.2)
export const sequentialReplicates = (F: number) => (F <= 0 ? 0 : Math.max(8, Math.ceil((384 - 64) / (6 * F))));

export const refineQuota: Record<Exclude<ArmKey, 'C'>, number> = { D: 8, G: 6, J: 16, S: 12 };
export const maxFrozenD1 = 3; // the D arm's finalists frozen for arm S (primary, robust-profit, balanced; distinct ledgers)
export const maxPairSide = 3; // arm C: the D and G finalists paired (≤ 3 × 3)

// per-lane deterministic bounds (requested evaluations; rounded up to 1,000): broad no designs; refine ≤ 24 seeds × 25
// designs + 2 focus seeds × 128
const up = (x: number) => Math.ceil(x / 1000) * 1000;

export const laneCaps: Record<Kind, number> = {
  broad: up(laneWorstCase(schedules.broad, 0, 0)),
  refine: up(laneWorstCase(schedules.refine, replicates.refineSeeds * 25 + 2 * 128, 2))
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
export const ceilingRequested = 250_000_000;
export const archiveBytesPerFresh = 4_800;
export const diskReserveBytes = 60 * 1024 ** 3;
