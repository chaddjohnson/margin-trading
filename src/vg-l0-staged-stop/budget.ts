// Priority 4's budget (PROTOCOL.md §6). Requested = every evaluation a stage asks for (archive hits included; fresh and
// cached are counted separately in every record).
//   - per lane: Assignment 3's deterministic worst case (src/vg-l0-full-joint/budgets.ts laneWorstCase), computed here
//     with the ARM's refinement move bound (CTRL 230 = Assignment 3's; EXP 257 = + 3 books × (2 genes × 4 moves) + 3 OFF
//     moves) and, for the extension block, the island cap × 1.5; a lane's request beyond its cap fails closed;
//   - per qualification member and interval subject: Assignment 3's instrument + the report-only 10 bps slippage stress;
//   - the HARD CEILING 25,000,000 requested official evaluations (the brief's audited cap) is a running ledger over the
//     sealed stage records: every official stage gets maxFresh = the remaining ceiling (fail closed) and is launched only
//     if the remaining ceiling exceeds its forecast × 1.25 (otherwise the study stops at a paired checkpoint).
import fs from 'node:fs';
import {
  budgets,
  finishReserve as a3FinishReserve,
  laneWorstCase as a3LaneWorstCase
} from '../vg-l0-full-joint/budgets.ts';
import type { Budget } from './search.ts';
import { stresses as a3Stresses } from '../vg-l0-full-joint/qualify.ts';
import { enabledOf, fidelity, removalsOf } from '../vg-l0-risk-families/qualify.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { ctrlSpace, expSpace } from './space.ts';
import { type ArmKey, cells, cutoffKeys, replicates, resultsDir } from './context.ts';
import { readJson } from './records.ts';

export const HARD_CEILING = 25_000_000;

// the qualification stresses: Assignment 3's six + the report-only stop slippage +10 bps (PROTOCOL.md PA3)
export const stresses: Record<string, EvalOptions['friction']> = {
  ...a3Stresses,
  'stop slippage +10 bps': { stopSlippageBps: 10 }
};

export const broadSchedule: Budget = budgets.study.broad; // Assignment 3's (NL0's V-cell schedule), unchanged
export const informedSchedule: Budget = budgets.study.informed; // NL0's informed schedule, unchanged
export const extensionFactor = 1.5;
export const extendedSchedule: Budget = {
  ...broadSchedule,
  islandsMax: Math.round(broadSchedule.islandsMax * extensionFactor)
}; // 9
export const finishReserve = a3FinishReserve.broad; // 8,000 (the guard cannot bind with the caps below)

// Assignment 3's worst case with an explicit move bound (equal to laneWorstCase at 230: tests/budget.test.ts)
export const laneWorst = (b: Budget, designs: number, focusSeeds: number, moves: number) => {
  const fit = (n: number) => 1 + n;
  const screen = b.screen + b.promote * fit(b.r1);
  const seeded = designs * fit(b.r1);
  const islands = b.islandsMax * (b.newPerIsland + b.population) * fit(b.r1);
  const rungs = b.r2Keep * fit(b.r2) + b.r3Keep * fit(b.r3);
  const startsOnePass = designs > 0 ? 3 : 2;
  const refine =
    startsOnePass * (fit(b.refineN) + b.refinePasses * moves * fit(b.refineN)) +
    2 * focusSeeds * (fit(b.refineN) + b.focusPasses * moves * fit(b.refineN));
  const endpoints = (startsOnePass + 2 * focusSeeds) * fit(b.r3);

  return screen + seeded + islands + rungs + refine + endpoints;
};
const up = (x: number) => Math.ceil(x / 1000) * 1000;
const movesOf = (arm: ArmKey) => (arm === 'CTRL' ? ctrlSpace.maxMoves : expSpace.maxMoves);
// an informed lane: one focus seed (its designs: the seed + 12 + 12 + 64 + 64)
export const informedDesigns =
  1 + informedSchedule.near + informedSchedule.broad + informedSchedule.focusSmall + informedSchedule.focusMid;

export const laneCaps = {
  broad: {
    CTRL: up(laneWorst(broadSchedule, 0, 0, movesOf('CTRL'))),
    EXP: up(laneWorst(broadSchedule, 0, 0, movesOf('EXP')))
  },
  extended: {
    CTRL: up(laneWorst(extendedSchedule, 0, 0, movesOf('CTRL'))),
    EXP: up(laneWorst(extendedSchedule, 0, 0, movesOf('EXP')))
  },
  informed: {
    CTRL: up(laneWorst(informedSchedule, informedDesigns, 1, movesOf('CTRL'))),
    EXP: up(laneWorst(informedSchedule, informedDesigns, 1, movesOf('EXP')))
  }
} as const;
// Stage B's CTRL lane cap (41,000) must be this study's CTRL broad cap (gate R reproduces those lanes)
export const stageBLaneCap = 41_000;

export const lanesPerArmCutoff = cells.length * replicates.length; // 64
export const lanesPerCutoff = 2 * lanesPerArmCutoff; // 128

// qualification: per member 1 detailed centre + 1 centre + the seven stresses + the removals + 2 × 128 + 3 × 128
export const perMember = () =>
  2 +
  Object.keys(stresses).length +
  Object.keys(removalsOf(enabledOf(vOptions))).length +
  (fidelity.selectReps + fidelity.confirmReps) * fidelity.n;
// an interval subject: 1 detailed centre + 1 centre + the seven stresses + the training selection family 2 × 128
export const perSubject = () => 2 + Object.keys(stresses).length + fidelity.selectReps * fidelity.n;

// the bound of one cutoff's qualification union (≤ 3 per lane; ≤ 4 OFF projections per EXP member; the 2 benchmarks)
export const membersBound = (informed: boolean) =>
  lanesPerArmCutoff * broadSchedule.shortlist +
  lanesPerArmCutoff * broadSchedule.shortlist * 5 +
  2 +
  (informed ? 6 * 8 * informedSchedule.shortlist * 5 + 10 : 0);

// ----- the running ledger of requested official evaluations (the sealed stage records) -----

export const ledgerFiles = () => {
  const out: string[] = [];
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${d}/${e.name}`);
      else if (e.name.endsWith('.json')) out.push(`${d}/${e.name}`);
    }
  };

  for (const sub of ['ablation', 'search', 'extend', 'informed', 'qualification', 'intervals'])
    walk(`${resultsDir}/${sub}`);
  return out.sort();
};

export const ledger = () => {
  const rows = ledgerFiles().map((f) => {
    const r = readJson<{ requested?: number; stage?: string }>(f);

    return { file: f.slice(resultsDir.length + 1), stage: r.stage ?? '?', requested: r.requested ?? 0 };
  });
  const used = rows.reduce((a, r) => a + r.requested, 0);

  return { ceiling: HARD_CEILING, used, remaining: HARD_CEILING - used, rows };
};

// the launch rule of an official stage: the remaining ceiling must exceed its forecast × 1.25; its Lab's maxFresh is the
// remaining ceiling (fail closed)
export const stageAllowance = (stage: string, forecast: number) => {
  const l = ledger();

  if (l.remaining < forecast * 1.25)
    throw new Error(
      `${stage}: the hard ceiling leaves ${l.remaining} requested evaluations, below the forecast ${forecast} × 1.25: stop at the paired checkpoint (PROTOCOL.md §6)`
    );
  return { maxFresh: l.remaining, used: l.used, remaining: l.remaining };
};

export const cutoffsAll = cutoffKeys;

// the CTRL worst case equals Assignment 3's own (tests/budget.test.ts); Stage B's cap must be this study's CTRL cap
export const consistency = () => ({
  ctrlWorstIsA3: laneWorst(broadSchedule, 0, 0, ctrlSpace.maxMoves) === a3LaneWorstCase(broadSchedule, 0, 0),
  ctrlCapIsStageB: laneCaps.broad.CTRL === stageBLaneCap
});
