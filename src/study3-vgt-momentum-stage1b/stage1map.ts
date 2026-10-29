// Stage 1 configurations as Stage 1b policies (PROTOCOL.md §4.2 "Stage 1 equivalences"): the parity anchors. Stage 1's
// StrategySpec (exit components, R-rules, Z0) maps one to one onto a Stage 1b Policy at fixed shares.
import type {
  ExitSpec as Stage1Exit,
  ReentryRule as Stage1Reentry,
  StrategySpec
} from '../study3-vgt-momentum/engine.ts';
import type { ExitSpec, Policy, ReentryRule } from './types.ts';

export const reentryOf = (rule: Stage1Reentry): ReentryRule => {
  switch (rule) {
    case 'R0':
      return 'R0';
    case 'R1':
      return 'RF';
    case 'R2':
      return 'RC10';
    case 'R3':
    case 'R3F':
      return 'R3F'; // identical in Stage 1's engine
    case 'R4':
      return 'RP50';
    case 'R5':
      return 'RN';
  }
};

export const exitOfStage1 = (x: Stage1Exit): ExitSpec => {
  if (x.profitStages || x.probation) {
    throw new Error('X5a/X5b have no Stage 1b equivalent');
  }

  const exit: ExitSpec = { own: x.ownOut };

  if (x.hard !== undefined) {
    exit.hard = x.hard;
  }

  if (x.trail !== undefined) {
    exit.trail = { t: x.trail, ref: 0 };
  }

  if (x.catastrophic !== undefined) {
    exit.catastrophic = x.catastrophic;
  }

  if (x.volTrail) {
    exit.vol = { k: x.volTrail.k, n: x.volTrail.atrN, dmin: x.volTrail.min, dmax: x.volTrail.max };
  }

  if (x.floor) {
    exit.floor = { theta: x.floor.theta, b: x.floor.b, arm: false }; // Stage 1's X3 is unarmed
  }

  if (x.trendLow !== undefined) {
    exit.trendLow = x.trendLow;
  }

  if (x.andPrice !== undefined) {
    exit.damage = { p: x.andPrice, N: 20, mode: 1 };
  }

  if (x.maxHold !== undefined) {
    exit.maxHold = x.maxHold;
  }

  if (x.stall) {
    exit.stall = { T: x.stall.T, m: x.stall.margin, d: 0, hurdle: 'sessions' }; // Stage 1's X6b hurdle
  }

  return exit;
};

export const policyOfStage1 = (spec: StrategySpec): Policy => {
  if (spec.exhaustion !== undefined || spec.weekly || spec.invertState || spec.randomEntry) {
    throw new Error(`${spec.id}: Stage 1 modifiers have no Stage 1b equivalent`);
  }

  if (spec.sizing !== 'Z0') {
    throw new Error(`${spec.id}: only Stage 1's Z0 maps to Stage 1b`);
  }

  return {
    id: `s1:${spec.id}`,
    entry: spec.signal,
    entryParams: spec.params,
    exit: exitOfStage1(spec.exit),
    reentry: reentryOf(spec.reentry),
    sizing: spec.signal === 'C-ALR' ? { kind: 'ZR' } : { kind: 'Z0' }
  };
};
