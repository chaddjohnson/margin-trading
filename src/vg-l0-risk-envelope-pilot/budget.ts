// The pilot's budget (PROTOCOL.md §7; brief §1 "Budget interpretation"): the deterministic upper bound of the REQUESTED
// pilot research evaluations — search, qualification and the subsequent intervals — computed from the frozen schedules
// and instruments themselves (never typed in), and verified ≤ 700,000 before the first search. Requested = every
// evaluation a stage asks for, archive hits included (fresh and cached are counted separately in every record).
// Engineering verification (E2's comparison reads records only; E3's mini-pilot on D19) and the nonbinding CPU
// diagnostics are recorded separately and are not pilot research evaluations.
import { budgets, laneWorstCase, perLaneCap } from '../vg-l0-full-joint/budgets.ts';
import { stresses } from '../vg-l0-full-joint/qualify.ts';
import { enabledOf, fidelity, removalsOf } from '../vg-l0-risk-families/qualify.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import { armKeys, budgetCeiling, cells, cutoffKeys, replicates } from './context.ts';

export const broadSchedule = budgets.study.broad; // Assignment 3's (= NL0's V-cell schedule), unchanged
export const laneCap = perLaneCap.broad; // 41,000: Assignment 3's per-lane cap = its worst case rounded up to 1,000
export const laneWorst = laneWorstCase(broadSchedule, 0, 0); // 40,642
export const finishReserve = 8_000; // NL0's finishing reserve (the guard cannot bind: AD7)

export const lanesPerArm = cells.length * replicates.length; // 4
export const searchLanes = cutoffKeys.length * armKeys.length * lanesPerArm; // 16

// qualification: per member 1 detailed centre + 1 centre + the stresses + the removals + 2 × 128 + 3 × 128
export const perMember = () =>
  2 + Object.keys(stresses).length + Object.keys(removalsOf(enabledOf(vOptions))).length + (fidelity.selectReps + fidelity.confirmReps) * fidelity.n;
// ≤ 3 shortlisted per lane × the 8 lanes of a cutoff (both arms; a member shortlisted twice is evaluated once) + the
// two descriptive benchmarks (New L0, N/original)
export const membersPerCutoff = 2 * lanesPerArm * broadSchedule.shortlist + 2;

// the next interval: per subject 1 detailed centre + 1 centre + the stresses + the selection family 2 × 128 replayed;
// subjects ≤ the distinct primaries (CTRL: P0, RA1-original; EXP: P0, RA1-original, RA1-adapted) + the 2 benchmarks
export const perSubject = () => 2 + Object.keys(stresses).length + fidelity.selectReps * fidelity.n;
export const subjectsPerCutoff = 2 + 3 + 2;

export const bound = () => {
  const search = searchLanes * laneCap;
  const qualification = cutoffKeys.length * membersPerCutoff * perMember();
  const intervals = cutoffKeys.length * subjectsPerCutoff * perSubject();
  const total = search + qualification + intervals;

  return {
    budgetCeiling,
    perLane: { worstCase: laneWorst, cap: laneCap },
    searchLanes,
    search,
    perMember: perMember(),
    membersPerCutoff,
    qualification,
    perSubject: perSubject(),
    subjectsPerCutoff,
    intervals,
    total,
    fits: total <= budgetCeiling,
    exactSearchWorstCase: searchLanes * laneWorst,
    expected: {
      ctrlSearch: { C21: 71_314, C24: 62_488, source: 'Assignment 3 sealed lanes (research/vg-l0-full-joint/results/search/*/broad1.json)' }
    }
  };
};

export const assertBound = () => {
  const b = bound();

  if (!b.fits)
    throw new Error(`the deterministic upper bound ${b.total} of requested pilot evaluations exceeds the authorized ${b.budgetCeiling}: stop before any search`);
  return b;
};
