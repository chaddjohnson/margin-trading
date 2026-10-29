// The Stage 1b mechanism catalog (PROTOCOL.md §4, EXPERIMENT_MATRIX.json): exit families with their boxes, quanta and
// defaults; the fixed exits and benchmarks; re-entry rules; sizing variants; the predeclared pairings; controls; and
// the canonical policy identifiers. Entry families, their boxes and defaults are Stage 1's (imported).
import { createHash } from 'node:crypto';
import {
  type FamilyId,
  type ParamSpec,
  type Params,
  defaultParams,
  families,
  quantize
} from '../study3-vgt-momentum/signals.ts';
import type { ExitSpec, Policy, ReentryRule, SizingSpec } from './types.ts';

export type Dim = ParamSpec; // q = 1 on an integer range (including binaries and categoricals)

export type ExitFamily = 'XF' | 'XF-T' | 'XV' | 'XS' | 'XT' | 'XRP' | 'XRD' | 'XD' | 'XP' | 'XO' | 'XE' | 'XU';
export type EntryId = FamilyId | 'C-SMA';

const d = (name: string, lo: number, hi: number, q: number, def: number): Dim => ({ name, lo, hi, q, default: def });

export const exitBoxes: Record<ExitFamily, Dim[]> = {
  XF: [d('h', 0.02, 0.2, 0.001, 0.08), d('t', 0.03, 0.35, 0.001, 0.1), d('ref', 0, 1, 1, 0), d('own', 0, 1, 1, 1)],
  'XF-T': [d('h', 0.02, 0.2, 0.001, 0.08), d('t', 0.03, 0.12, 0.001, 0.08), d('ref', 0, 1, 1, 0), d('own', 0, 1, 1, 1)],
  XV: [
    d('k', 1, 8, 0.1, 3),
    d('n', 5, 60, 1, 20),
    d('dmin', 0.02, 0.1, 0.001, 0.04),
    d('dgap', 0.02, 0.3, 0.001, 0.11),
    d('h', 0.03, 0.2, 0.001, 0.08),
    d('own', 0, 1, 1, 0)
  ],
  XS: [
    d('theta', 0.02, 0.15, 0.001, 0.05),
    d('b', 0, 0.03, 0.001, 0.005),
    d('h', 0.03, 0.2, 0.001, 0.1),
    d('own', 0, 1, 1, 0)
  ],
  XT: [
    d('h', 0.05, 0.25, 0.001, 0.15),
    d('N', 5, 120, 1, 50),
    d('g', 0.03, 0.6, 0.001, 0.2),
    d('t2', 0.03, 0.25, 0.001, 0.1),
    d('rat', 0, 1, 1, 1),
    d('own', 0, 1, 1, 0)
  ],
  XRP: [
    d('h', 0.03, 0.2, 0.001, 0.08),
    d('a', 0.03, 0.6, 0.001, 0.15),
    d('rho', 0.2, 0.9, 0.01, 0.5),
    d('own', 0, 1, 1, 0)
  ],
  XRD: [
    d('h', 0.03, 0.2, 0.001, 0.08),
    d('A', 2000, 80000, 500, 20000),
    d('G', 5000, 60000, 500, 15000),
    d('own', 0, 1, 1, 0)
  ],
  XD: [
    d('p', 0.03, 0.25, 0.001, 0.1),
    d('N', 5, 120, 1, 20),
    d('mode', 0, 2, 1, 1),
    d('cat', 0.08, 0.3, 0.001, 0.15),
    d('own', 0, 1, 1, 0)
  ],
  XP: [
    d('T', 5, 120, 1, 20),
    d('m', -0.05, 0.05, 0.001, 0.01),
    d('d', 0, 0.1, 0.001, 0),
    d('h', 0.03, 0.2, 0.001, 0.08),
    d('own', 0, 1, 1, 0)
  ],
  XO: [d('cat', 0.08, 0.35, 0.001, 0.15), d('c', 1, 5, 1, 1)],
  XE: [
    d('t0', 0.06, 0.35, 0.001, 0.2),
    d('gamma', 0, 2, 0.01, 1),
    d('tmin', 0.02, 0.1, 0.001, 0.05),
    d('h', 0.03, 0.2, 0.001, 0.08),
    d('own', 0, 1, 1, 0)
  ],
  XU: [d('U', 5, 120, 1, 30), d('d', 0, 0.15, 0.001, 0.05), d('h', 0.03, 0.2, 0.001, 0.08), d('own', 0, 1, 1, 0)]
};

export const optimisedExits: ExitFamily[] = ['XF', 'XV', 'XS', 'XT', 'XRP', 'XRD', 'XD', 'XP', 'XO', 'XE', 'XU'];

// A dollar quantum of 500 is a "continuous" quantum (q !== 1): the box maps through quantize like percentages.
export const isInteger = (dim: Dim) => dim.q === 1;
export const isDiscrete = (dim: Dim) => dim.q === 1 && dim.hi - dim.lo <= 2; // binary or categorical

export const quantizeDim = (dim: Dim, value: number) =>
  isInteger(dim) ? Math.min(dim.hi, Math.max(dim.lo, Math.round(value))) : quantize(value, dim);

export const fromUnit = (dim: Dim, u: number) =>
  isInteger(dim)
    ? Math.min(dim.hi, Math.floor(dim.lo + u * (dim.hi - dim.lo + 1)))
    : quantize(dim.lo + u * (dim.hi - dim.lo), dim);

export const defaultsOf = (dims: Dim[]): Params => Object.fromEntries(dims.map((dim) => [dim.name, dim.default]));

export const exitSpecOf = (family: ExitFamily, v: Params): ExitSpec => {
  switch (family) {
    case 'XF':
    case 'XF-T':
      return { own: v.own === 1, hard: v.h!, trail: { t: v.t!, ref: v.ref === 1 ? 1 : 0 } };
    case 'XV':
      return { own: v.own === 1, hard: v.h!, vol: { k: v.k!, n: v.n!, dmin: v.dmin!, dmax: v.dmin! + v.dgap! } };
    case 'XS':
      return { own: v.own === 1, hard: v.h!, floor: { theta: v.theta!, b: v.b!, arm: true } };
    case 'XT':
      return {
        own: v.own === 1,
        hard: v.h!,
        trendLow: v.N!,
        ...(v.rat === 1 ? { ratchet: { g: v.g!, t2: v.t2! } } : {})
      };
    case 'XRP':
      return { own: v.own === 1, hard: v.h!, retain: { a: v.a!, rho: v.rho! } };
    case 'XRD':
      return { own: v.own === 1, hard: v.h!, giveback: { A: v.A!, G: v.G! } };
    case 'XD':
      return { own: v.own === 1, catastrophic: v.cat!, damage: { p: v.p!, N: v.N!, mode: v.mode as 0 | 1 | 2 } };
    case 'XP':
      return { own: v.own === 1, hard: v.h!, stall: { T: v.T!, m: v.m!, d: v.d!, hurdle: 'financing' } };
    case 'XO':
      return { own: true, ownConsecutive: v.c!, catastrophic: v.cat! };
    case 'XE':
      return { own: v.own === 1, hard: v.h!, expTrail: { t0: v.t0!, gamma: v.gamma!, tmin: v.tmin! } };
    case 'XU':
      return { own: v.own === 1, hard: v.h!, stale: { U: v.U!, d: v.d! } };
  }
};

// Fixed exits: the negative control XM and the two D1-magnitude benchmarks (never optimised or selected).
export const fixedExits: Record<string, ExitSpec> = {
  XM20: { own: false, hard: 0.08, maxHold: 20 },
  XM60: { own: false, hard: 0.08, maxHold: 60 },
  XM120: { own: false, hard: 0.08, maxHold: 120 },
  XM250: { own: false, hard: 0.08, maxHold: 250 },
  'XD-P': { own: false, catastrophic: 0.15, damage: { p: 0.1, N: 0, mode: 0 } },
  'XD-T': { own: false, catastrophic: 0.15, damage: { p: 1, N: 20, mode: 0 } },
  'B-D1T': { own: false, hard: 0.073, trail: { t: 0.073, ref: 1 } },
  'B-D1N': { own: true, d1net: { t: 0.073 } }
};

export const reentryRules: ReentryRule[] = ['R3F', 'RN', 'RF', 'R0', 'RC10', 'RP50', 'RS', 'RFL', 'REF', 'RPM'];

export const sizingVariants: { key: string; spec: SizingSpec }[] = [
  { key: 'Z1', spec: { kind: 'Z1', band: 0.05 } },
  { key: 'Z2(0.25,0)', spec: { kind: 'Z2', u: 0.25, v: 0 } },
  { key: 'Z2(0.5,0)', spec: { kind: 'Z2', u: 0.5, v: 0 } },
  { key: 'Z2(0.5,0.25)', spec: { kind: 'Z2', u: 0.5, v: 0.25 } },
  { key: 'Z2(1,0)', spec: { kind: 'Z2', u: 1, v: 0 } },
  { key: 'Z2(1,0.5)', spec: { kind: 'Z2', u: 1, v: 0.5 } },
  { key: 'Z3(15000)', spec: { kind: 'Z3', G: 15000 } },
  { key: 'Z3(25000)', spec: { kind: 'Z3', G: 25000 } },
  { key: 'Z3(40000)', spec: { kind: 'Z3', G: 40000 } }
];

export const sizingKey = (s: SizingSpec) => {
  switch (s.kind) {
    case 'Z0':
    case 'ZR':
      return s.kind;
    case 'Z1':
      return 'Z1';
    case 'Z2':
      return `Z2(${s.u},${s.v})`;
    case 'Z3':
      return `Z3(${s.G})`;
  }
};

export interface PairingSpec {
  id: string;
  entry: EntryId;
  exit: ExitFamily;
}

export const pairings: PairingSpec[] = [
  { id: 'P01', entry: 'E06', exit: 'XS' },
  { id: 'P02', entry: 'E06', exit: 'XV' },
  { id: 'P03', entry: 'E06', exit: 'XF-T' },
  { id: 'P04', entry: 'E04', exit: 'XF' },
  { id: 'P05', entry: 'E05', exit: 'XF' },
  { id: 'P06', entry: 'E03', exit: 'XT' },
  { id: 'P07', entry: 'E11', exit: 'XF-T' },
  { id: 'P08', entry: 'E09', exit: 'XF' },
  { id: 'P09', entry: 'C-SMA', exit: 'XF' },
  { id: 'P10', entry: 'E02', exit: 'XE' },
  { id: 'P11', entry: 'E07', exit: 'XD' }
];

export const entryDims = (entry: EntryId): Dim[] => (entry === 'C-SMA' ? [] : families[entry].params);
export const entryDefaults = (entry: EntryId): Params => (entry === 'C-SMA' ? {} : defaultParams(entry));

// A policy: entry (+ parameters), exit (family + parameters, or a fixed exit), re-entry, sizing; its id is a hash
// of the canonical key.
export interface PolicyKey {
  entry: EntryId | 'C-DON' | 'C-TSM' | 'C-AL' | 'C-ALR' | 'C-IDLE';
  entryParams: Params;
  exit: { family: ExitFamily; params: Params } | { fixed: string } | { control: true };
  reentry: ReentryRule;
  sizing: SizingSpec;
}

const paramsKey = (p: Params) =>
  Object.keys(p)
    .sort()
    .map((k) => `${k}=${p[k]}`)
    .join(',');

export const policyKeyString = (k: PolicyKey) =>
  `${k.entry}{${paramsKey(k.entryParams)}}|${
    'family' in k.exit ? `${k.exit.family}{${paramsKey(k.exit.params)}}` : 'fixed' in k.exit ? k.exit.fixed : 'own'
  }|${k.reentry}|${sizingKey(k.sizing)}`;

export const policyId = (k: PolicyKey) => {
  const exitName = 'family' in k.exit ? k.exit.family : 'fixed' in k.exit ? k.exit.fixed : 'OWN';

  return `${k.entry}/${exitName}/${k.reentry}/${sizingKey(k.sizing)}-${createHash('sha256').update(policyKeyString(k)).digest('hex').slice(0, 10)}`;
};

export const policyOf = (k: PolicyKey): Policy => ({
  id: policyId(k),
  entry: k.entry,
  entryParams: k.entryParams,
  exit:
    'family' in k.exit
      ? exitSpecOf(k.exit.family, k.exit.params)
      : 'fixed' in k.exit
        ? fixedExits[k.exit.fixed]!
        : { own: true },
  reentry: k.reentry,
  sizing: k.sizing
});

// Controls (PROTOCOL.md §4.5).
export const controlKeys: Record<string, PolicyKey> = {
  'C-AL': { entry: 'C-AL', entryParams: {}, exit: { control: true }, reentry: 'RF', sizing: { kind: 'Z0' } },
  'C-ALR': { entry: 'C-ALR', entryParams: {}, exit: { control: true }, reentry: 'RF', sizing: { kind: 'ZR' } },
  'C-ALZ1': {
    entry: 'C-AL',
    entryParams: {},
    exit: { control: true },
    reentry: 'RF',
    sizing: { kind: 'Z1', band: 0.05 }
  },
  'C-SMA': { entry: 'C-SMA', entryParams: {}, exit: { control: true }, reentry: 'RF', sizing: { kind: 'Z0' } },
  'C-DON': { entry: 'C-DON', entryParams: {}, exit: { control: true }, reentry: 'RF', sizing: { kind: 'Z0' } },
  'C-TSM': { entry: 'C-TSM', entryParams: {}, exit: { control: true }, reentry: 'RF', sizing: { kind: 'Z0' } },
  'C-STOP': {
    entry: 'C-AL',
    entryParams: {},
    exit: { family: 'XF', params: { h: 0.08, t: 0.1, ref: 0, own: 0 } },
    reentry: 'R3F',
    sizing: { kind: 'Z0' }
  },
  'C-IDLE': { entry: 'C-IDLE', entryParams: {}, exit: { control: true }, reentry: 'RF', sizing: { kind: 'Z0' } }
};

export const controlPolicy = (name: string): Policy => ({ ...policyOf(controlKeys[name]!), id: name });
