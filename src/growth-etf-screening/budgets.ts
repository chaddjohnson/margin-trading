// The frozen budgets (PROTOCOL.md §7.3; brief "Screening search — equal opportunity, bounded cost"). Identical for every
// eligible ETF and every cutoff (C19, C21, C23, C24): 1,024 NEW DISTINCT CENTRE PROPOSALS per ETF per cutoff, shared
// across two paired search seeds (A, B) × two protected entry cells (rise, breakout) = four lanes of 256 (a screen of
// 160 + one NSGA-II island of 96). No extension (the brief's optional extension to 2,048 is not used: the 2,000,000
// ceiling must hold the whole eligible universe at four cutoffs, the transfer lane and the reserve; stopping is "base
// budget exhausted", never convergence).
//
// Evaluation worst cases are exact functions of the plan (centre-first fidelity makes the actual counts lower) and are
// enforced as each job's cap; the plan check refuses to start the study unless the ledger plus every remaining job's
// worst case plus the reserve fit the ceiling.
import type { Budget } from './search.ts';
import { type Fidelity, fidelities } from './qualify.ts';

export type Schedule = 'study' | 'pilot';

export interface Plan {
  lane: Budget;
  lanesPerEtf: number; // 2 seeds × 2 cells
  shortlist: number; // the ETF shortlist from the lanes' picks (selection family)
  confirmPicks: number;
  fidelity: Fidelity;
  transfer: { selectPerEtf: number; confirmPerEtf: number };
}

export const plans: Record<Schedule, Plan> = {
  study: {
    lane: {
      screen: 160,
      population: 16,
      island: 96,
      generations: 100,
      r1: 8,
      r2Keep: 4,
      r2: 32,
      r2Distinct: 0.02,
      picks: 2,
      distinct: 0.1
    },
    lanesPerEtf: 4,
    shortlist: 4,
    confirmPicks: 3,
    fidelity: fidelities.study,
    transfer: { selectPerEtf: 3, confirmPerEtf: 2 }
  },
  pilot: {
    lane: {
      screen: 32,
      population: 8,
      island: 16,
      generations: 20,
      r1: 4,
      r2Keep: 2,
      r2: 8,
      r2Distinct: 0.02,
      picks: 2,
      distinct: 0.1
    },
    lanesPerEtf: 4,
    shortlist: 4,
    confirmPicks: 3,
    fidelity: fidelities.pilot,
    transfer: { selectPerEtf: 3, confirmPerEtf: 2 }
  }
};

export const proposalsPerEtf = (s: Schedule) => plans[s].lanesPerEtf * (plans[s].lane.screen + plans[s].lane.island);

const stressCount = 5;
const toggleMax = 7;

// The exact worst case of one ETF × cutoff screen job (search + qualification): every proposal plausible.
export const screenJobCap = (s: Schedule) => {
  const p = plans[s];
  const l = p.lane;
  const lane = l.screen + l.population * l.r1 + l.island * (1 + l.r1) + l.r2Keep * l.r2;
  const f = p.fidelity;

  return (
    1 +
    p.lanesPerEtf * lane +
    p.shortlist * f.select +
    p.confirmPicks * (f.confirmReps * f.confirm + stressCount + toggleMax)
  );
};

// The transfer lane at C24 for one ETF: every vector's centre, the selection family for ≤ selectPerEtf plausible
// transfers, confirmation, stresses and toggles for ≤ confirmPerEtf.
export const transferJobCap = (s: Schedule, vectors: number) => {
  const p = plans[s];
  const f = p.fidelity;

  return (
    1 +
    vectors +
    p.transfer.selectPerEtf * f.select +
    p.transfer.confirmPerEtf * (f.confirmReps * f.confirm + stressCount + toggleMax)
  );
};

// The reserve for everything after the searches (fold and sequential runs, C24 diagnostics including the small and
// wide families and the episode-overlap reruns, validation and its report-only neighbourhoods).
export const downstreamReserve = 60_000;

export const studyPlan = (etfs: number, vectors: number) => {
  const screen = screenJobCap('study');
  const transfer = transferJobCap('study', vectors);

  return {
    proposalsPerEtfPerCutoff: proposalsPerEtf('study'),
    screenJobCap: screen,
    screensWorstCase: 4 * etfs * screen,
    transferJobCap: transfer,
    transferWorstCase: etfs * transfer,
    downstreamReserve,
    worstCase: 4 * etfs * screen + etfs * transfer + downstreamReserve
  };
};
