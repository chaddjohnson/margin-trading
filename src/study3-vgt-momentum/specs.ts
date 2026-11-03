// The named exit configurations, re-entry rules, sizing and controls of MECHANISM_CATALOG.json v1.0 as engine
// specifications, and the candidate identifiers (a family, its parameters and its exit).
import { createHash } from 'node:crypto';
import type { ExitSpec, ReentryRule, SizingRule, StrategySpec } from './engine.ts';
import { type ControlId, type FamilyId, type Params, defaultParams } from './signals.ts';

export type ExitKey =
  | 'OX'
  | 'CX1'
  | 'CX2'
  | 'TPL'
  | 'X2'
  | 'X3'
  | 'X4'
  | 'X5a'
  | 'X5b'
  | 'X6a'
  | 'X6b'
  | 'X6c'
  | 'X8P'
  | 'X8T'
  | 'X8OR'
  | 'X8AND'
  | 'HS'
  | 'NONE';

// TPL takes h and t from the candidate's vector; the others are fixed.
export const exitOf = (key: ExitKey, h = 0.08, t = 0.1): ExitSpec => {
  switch (key) {
    case 'OX':
      return { ownOut: true, catastrophic: 0.15 };
    case 'CX1':
    case 'X6c':
      return { ownOut: false, hard: 0.08, trail: 0.1 };
    case 'CX2':
    case 'X8T':
      return { ownOut: false, trendLow: 20, catastrophic: 0.15 };
    case 'TPL':
      return { ownOut: true, hard: h, trail: t };
    case 'X2':
      return { ownOut: false, hard: 0.08, volTrail: { k: 3, min: 0.04, max: 0.15, atrN: 20 } };
    case 'X3':
      return { ownOut: false, floor: { theta: 0.05, b: 0.005 }, hard: 0.1 };
    case 'X4':
      return { ownOut: false, catastrophic: 0.15, trendLow: 50 };
    case 'X5a':
      return { ownOut: false, profitStages: true };
    case 'X5b':
      return { ownOut: false, probation: { q: 0.03, P: 10, g: 0.05, trail: 0.12 } };
    case 'X6a':
      return { ownOut: false, hard: 0.08, trail: 0.1, maxHold: 60 };
    case 'X6b':
      return { ownOut: false, hard: 0.08, trail: 0.1, stall: { T: 20, margin: 0.01 } };
    case 'X8P':
      return { ownOut: false, hard: 0.08, trail: 0.1 };
    case 'X8OR':
      return { ownOut: false, hard: 0.08, trail: 0.1, trendLow: 20 };
    case 'X8AND':
      return { ownOut: false, andPrice: 0.1, catastrophic: 0.15 };
    case 'HS':
      return { ownOut: false, hard: 0.08 };
    case 'NONE':
      return { ownOut: true };
  }
};

// A family's search vector: its catalog parameters plus the template's h and t.
export interface Candidate {
  family: FamilyId;
  params: Params; // family parameters
  h: number;
  t: number;
}

export const candidateKey = (c: Candidate) =>
  `${c.family}|${Object.entries(c.params)
    .map(([k, v]) => `${k}=${v}`)
    .join(',')}|h=${c.h}|t=${c.t}`;

export const candidateId = (c: Candidate) =>
  `${c.family}-${createHash('sha256').update(candidateKey(c)).digest('hex').slice(0, 10)}`;

export const templateSpec = (c: Candidate, overrides: Partial<StrategySpec> = {}): StrategySpec => ({
  id: candidateId(c),
  signal: c.family,
  params: c.params,
  exit: exitOf('TPL', c.h, c.t),
  reentry: 'R3F',
  sizing: 'Z0',
  ...overrides
});

export const panelSpec = (
  family: FamilyId | 'X-CS',
  exit: ExitKey,
  reentry: ReentryRule = 'R3F',
  sizing: SizingRule = 'Z0',
  params?: Params
): StrategySpec => {
  const p = params ?? (family === 'X-CS' ? { N: 20, c_in: 0.6, c_out: 0.45 } : defaultParams(family));

  return {
    id: `${family}/${exit}/${reentry}/${sizing}`,
    signal: family,
    params: p,
    exit: exitOf(exit),
    reentry,
    sizing
  };
};

export const defaultCandidate = (family: FamilyId): Candidate => ({
  family,
  params: defaultParams(family),
  h: 0.08,
  t: 0.1
});

export const controlSpec = (id: ControlId): StrategySpec => ({
  id,
  signal: id,
  params: {},
  exit: { ownOut: true },
  reentry: 'R1',
  sizing: 'Z0'
});

export const controlIds: ControlId[] = ['C-SMA', 'C-DON', 'C-TSM', 'C-AL', 'C-ALR', 'C-IDLE'];
