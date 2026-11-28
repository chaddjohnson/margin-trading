// P5-NS's budgets (PROTOCOL.md §7.5–§7.7): NL0 1.0.0's per-lane schedules as Assignment 3 executed them
// (src/vg-l0-full-joint/budgets.ts), UNCHANGED in every rule except the island caps, scaled by replicates (standard §4.8),
// with convergence-driven extensions at two levels:
//   1. ISLANDS (per lane): after its base islands a lane runs one more island iff its last island fired NL0's trigger —
//      it raised the lane's hypervolume, best feasible robust net or best feasible centre net by > 5 % (the PERFORMANCE
//      components) or produced a new feasible behaviour class (the CLASS component) — up to NL0's own cap (6 broad / 8
//      refine and informed), exactly as NL0 1.0.0 and Assignment 3 ran it; beyond NL0's cap, up to `islandsMax` (16),
//      only the performance components extend (adaptation AD3: Phase A found 142 of Assignment 3's 185 budget-bound
//      lanes extended by the class component alone, with median last-island gains of 0.04–0.16 % in hypervolume and 0 %
//      in centre net). Stops: "triggers not met" (NL0's per-island stagnation rule), "class trigger only beyond NL0's
//      cap" (performance converged by NL0's 5 % rule; class coverage still growing: COVERAGE-LIMITED, reported apart) and
//      "extension cap reached" (a performance component still fired at 16 islands: BUDGET-BOUND, not converged).
//   2. REPLICATES (per track and cutoff): after the base replicates, one more replicate of every structure (Track F: each
//      of the 64 cells; Track N: each of the 16 family pairs) runs iff the LAST replicate raised the track's union of
//      feasible rung-3 and shortlist fits — its hypervolume of (−robust net, p90 DD) against (0, $35,000), its best robust
//      net or its best centre net — by > 2 %, or gave a structure its first feasible fit; up to `maxRounds` rounds.
// The hard ceiling (resource guard, never convergence) is a running ledger over the sealed official stage records.
import { budgets, laneWorstCase } from '../vg-l0-full-joint/budgets.ts';
import type { Budget } from '../vg-l0-risk-envelope-pilot/search.ts';
import { perMember } from './qualify.ts';
import { stresses } from './qualify.ts';
import { fidelity } from '../vg-l0-risk-families/qualify.ts';

export type Kind = 'broad' | 'refine' | 'informed';

// NL0's island caps (the full trigger applies up to them) and this study's caps (performance components only beyond)
export const nl0Caps: Record<Kind, number> = { broad: budgets.study.broad.islandsMax, refine: budgets.study.refine.islandsMax, informed: budgets.study.informed.islandsMax };
export const islandCaps: Record<Kind, number> = { broad: 16, refine: 16, informed: 16 };
export const schedules: Record<Kind, Budget> = {
  broad: { ...budgets.study.broad, islandsMax: islandCaps.broad },
  refine: { ...budgets.study.refine, islandsMax: islandCaps.refine },
  informed: { ...budgets.study.informed, islandsMax: islandCaps.informed }
};

// replicates (seed keys R<firstReplicate + i − 1>; never Assignment 3's R1/R2, Stage B's or Priority 4's R3–R34)
export const firstReplicate = 101;
export const replicates = {
  broadBase: 4, // per cell and cutoff (Assignment 3: 2)
  refine: 4, // per refined cell (Assignment 3: 2)
  informedBase: 8, // per family pair at C24 (Assignment 3: 4; PROTOCOL.md §7.6 matching rule: the pilot gives 8)
  maxRounds: 4, // replicate rounds per track and cutoff (one replicate of every structure each)
  roundThreshold: 0.02
};
export const maxBroadReplicates = replicates.broadBase + replicates.maxRounds;
export const maxInformedReplicates = replicates.informedBase + replicates.maxRounds;

// per-lane deterministic bounds (requested evaluations; rounded up to 1,000): broad no designs; refine ≤ 3 shortlisted
// members of every broad replicate of the cell + 2 focus seeds; informed 16 projected seeds + 2 focus seeds
const up = (x: number) => Math.ceil(x / 1000) * 1000;
export const laneCaps: Record<Kind, number> = {
  broad: up(laneWorstCase(schedules.broad, 0, 0)),
  refine: up(laneWorstCase(schedules.refine, maxBroadReplicates * 3 * 25 + 2 * 128, 2)),
  informed: up(laneWorstCase(schedules.informed, 16 * 25 + 2 * 128, 2))
};

export const perMemberCap = () => perMember();
// a slice/validation subject: the detailed centre + the centre + the stresses with the boundary, the selection family
// 2 × 128 replayed, and the session-close series (≤ 32 evaluations of 16 boundaries for a two-year slice)
export const perSubject = () => 2 + Object.keys(stresses).length + fidelity.selectReps * fidelity.n + 40;

// the hard ceiling of requested official evaluations over the whole study (PROTOCOL.md §7.7: the disk and the resource
// contract); a stage launches only if the remaining ceiling covers its expected cost × 1.5, and its Lab gets maxFresh =
// min(its deterministic bound, the remaining ceiling)
export const ceilingRequested = 80_000_000;
export const archiveBytesPerFresh = 4_800; // measured by Priority 4 / Stage B (4,580–4,713) and the pilot
export const diskReserveBytes = 60 * 1024 ** 3;
