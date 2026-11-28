// Stage B's budget (PROTOCOL.md §6): the deterministic upper bound of the REQUESTED official evaluations — search, the E2
// reproduction lanes, qualification and the next intervals — computed from the frozen schedules and instruments
// themselves (never typed in) and required to equal the preregistered 8,800,278 (tests/budget.test.ts). Requested = every
// evaluation a stage asks for, archive hits included (fresh and cached are counted separately in every record). E3's
// non-official mini-pilot and edge subjects and the report-only CPU diagnostics are recorded separately.
import { budgets, laneWorstCase, perLaneCap } from '../vg-l0-full-joint/budgets.ts';
import { stresses } from '../vg-l0-full-joint/qualify.ts';
import { enabledOf, fidelity, removalsOf } from '../vg-l0-risk-families/qualify.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import { armKeys, cells, cutoffKeys, replicates, reproReplicates } from './context.ts';

export const broadSchedule = budgets.study.broad; // Assignment 3's (= NL0's V-cell schedule), unchanged
export const laneCap = perLaneCap.broad; // 41,000
export const laneWorst = laneWorstCase(broadSchedule, 0, 0); // 40,642
export const finishReserve = 8_000; // NL0's finishing reserve (the guard cannot bind: PROTOCOL.md BA4)

export const lanesPerArmCutoff = cells.length * replicates.length; // 32
export const lanesPerCutoff = armKeys.length * lanesPerArmCutoff; // 64
export const searchLanes = cutoffKeys.length * lanesPerCutoff; // 192
export const reproLanesPerCutoff = cells.length * reproReplicates.length; // 4 (CTRL only)
export const reproLanes = cutoffKeys.length * reproLanesPerCutoff; // 12

// qualification: per member 1 detailed centre + 1 centre + the stresses + the removals + 2 × 128 + 3 × 128
export const perMember = () =>
  2 + Object.keys(stresses).length + Object.keys(removalsOf(enabledOf(vOptions))).length + (fidelity.selectReps + fidelity.confirmReps) * fidelity.n;
// ≤ 3 shortlisted per lane × the 64 lanes of a cutoff (a member shortlisted twice is evaluated once) + New L0 + N/original
export const membersPerCutoff = lanesPerCutoff * broadSchedule.shortlist + 2;

// the next interval: per subject 1 detailed centre + 1 centre + the stresses + the selection family 2 × 128 replayed;
// subjects ≤ the 64 lane representatives + the pooled primaries (CTRL: P0, RA1-original; EXP30: P0, RA1-original,
// RA1-adapted) + the 2 benchmarks
export const perSubject = () => 2 + Object.keys(stresses).length + fidelity.selectReps * fidelity.n;
export const subjectsPerCutoff = lanesPerCutoff + 5 + 2;

export const preregisteredBound = 8_800_278;

export const bound = () => {
  const search = searchLanes * laneCap;
  const reproduction = reproLanes * laneCap;
  const qualification = cutoffKeys.length * membersPerCutoff * perMember();
  const intervals = cutoffKeys.length * subjectsPerCutoff * perSubject();
  const total = search + reproduction + qualification + intervals;

  return {
    preregisteredBound,
    perLane: { worstCase: laneWorst, cap: laneCap },
    searchLanes,
    search,
    reproLanes,
    reproduction,
    perMember: perMember(),
    membersPerCutoff,
    qualification,
    perSubject: perSubject(),
    subjectsPerCutoff,
    intervals,
    total,
    fits: total === preregisteredBound,
    exactSearchWorstCase: searchLanes * laneWorst,
    expected: {
      searchPerLaneMean: { C19: 16_674, C21: 17_193, C24: 14_624 },
      search: lanesPerCutoff * (16_674 + 17_193 + 14_624),
      reproduction: { C19: 66_697, C21: 71_314, C24: 62_488 },
      source: 'Assignment 3 sealed lanes (research/vg-l0-full-joint/results/search/*/broad1.json) and the pilot EXP lanes of these two cells'
    }
  };
};

export const assertBound = () => {
  const b = bound();

  if (!b.fits) throw new Error(`the deterministic bound ${b.total} differs from the preregistered ${preregisteredBound}: stop before any official stage`);
  return b;
};
