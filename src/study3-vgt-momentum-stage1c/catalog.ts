// The Stage 1c catalog (PROTOCOL.md §4–§5, EXPERIMENT_MATRIX.json): the matrix cells with their searched dimensions,
// the mapping of a cell and a parameter vector to a policy (Stage 1b exit specs, plus XN, the own-OUT contract and the
// protection rules), and the canonical policy keys and IDs (ENGINE_CONTRACT.md §13). Stage 1b's catalog is imported for
// its exit specs and controls.
import { createHash } from 'node:crypto';
import {
  type ExitFamily as BaseExitFamily,
  type PolicyKey as BasePolicyKey,
  exitSpecOf as baseExitSpecOf,
  fromUnit,
  isDiscrete,
  isInteger,
  policyKeyString as basePolicyKeyString,
  quantizeDim
} from '../study3-vgt-momentum-stage1b/catalog.ts';
import type { ParamSpec, Params } from '../study3-vgt-momentum/signals.ts';
import { type Contract, type Mask, type MatrixCell, cells, matrix } from './context.ts';
import type { ExitSpec, Policy, ProtectSpec } from './types.ts';

export { fromUnit, isDiscrete, isInteger, quantizeDim };
export { controlPolicy, policyOf as basePolicyOf } from '../study3-vgt-momentum-stage1b/catalog.ts';

export type Dim = ParamSpec & { span: number };
export type ExitFamily = BaseExitFamily | 'XN';

// A cell's searched dimensions in matrix order: e.<entry param>, x.<exit param>, a.N, b.C, c.X, c.Y.
export const dimsOf = (cell: MatrixCell): Dim[] => {
  const entry = matrix.entries[cell.entry]!.dims.map((d) => ({ ...d, name: `e.${d.name}` }));
  const exit = matrix.exits[cell.exit]!.dims.map((d) => ({ ...d, name: `x.${d.name}` }));
  const rules = (['A', 'B', 'C'] as const).flatMap((rule, i) =>
    cell.mask[i] === '1' ? matrix.rules[rule].dims.map((d) => ({ ...d, name: `${rule.toLowerCase()}.${d.name}` })) : []
  );
  const dims = [...entry, ...exit, ...rules].map((d) => ({ ...d, span: d.hi - d.lo }));

  if (dims.map((d) => d.name).join(',') !== cell.dims.join(',')) {
    throw new Error(`cell ${cell.key}: dimensions differ from the matrix`);
  }

  return dims;
};

export const defaultsOf = (dims: Dim[]): Params => Object.fromEntries(dims.map((d) => [d.name, d.default]));

export const exitSpecOf = (family: ExitFamily, v: Params): ExitSpec =>
  family === 'XN' ? { own: v.own === 1, hard: v.h!, d1net: { t: v.t! } } : baseExitSpecOf(family as BaseExitFamily, v);

export const protectOf = (mask: Mask, v: Params): ProtectSpec | undefined => {
  const protect: ProtectSpec = {};

  if (mask[0] === '1') {
    protect.A = { N: v['a.N']! };
  }

  if (mask[1] === '1') {
    protect.B = { C: v['b.C']! };
  }

  if (mask[2] === '1') {
    protect.C = { X: v['c.X']!, Y: v['c.Y']!, ...(v['c.cross'] === 1 ? { cross: true } : {}) };
  }

  return Object.keys(protect).length ? protect : undefined;
};

export interface Key {
  entry: string;
  entryParams: Params;
  exit: ExitFamily;
  contract: Contract;
  exitParams: Params; // without own
  mask: Mask;
  protect?: ProtectSpec;
  sizing?: BasePolicyKey['sizing'];
}

const ownOf = (contract: Contract) => (contract === 'or' ? 1 : 0);

const protectKey = (p: ProtectSpec | undefined) => {
  if (!p) {
    return '-';
  }

  return [
    p.A ? `A{N=${p.A.N}}` : '',
    p.B ? `B{C=${p.B.C}}` : '',
    p.C ? `C{X=${p.C.X},Y=${p.C.Y},cross=${p.C.cross ? 1 : 0}}` : ''
  ].join('');
};

// The Stage 1b key string of the base policy (the exit's params include `own` except for XO), then the rules.
export const keyString = (k: Key) => {
  const exitParams = k.exit === 'XO' ? k.exitParams : { ...k.exitParams, own: ownOf(k.contract) };
  const base = basePolicyKeyString({
    entry: k.entry as BasePolicyKey['entry'],
    entryParams: k.entryParams,
    exit: { family: k.exit as BaseExitFamily, params: exitParams },
    reentry: 'R3F',
    sizing: k.sizing ?? { kind: 'Z0' }
  });

  return `${base}|${protectKey(k.protect)}`;
};

export const policyIdOf = (k: Key) =>
  `${k.entry}/${k.exit}.${k.contract}/${k.mask}-${createHash('sha256').update(keyString(k)).digest('hex').slice(0, 10)}`;

export const policyFromKey = (k: Key): Policy => {
  const exitParams = k.exit === 'XO' ? k.exitParams : { ...k.exitParams, own: ownOf(k.contract) };
  const policy: Policy = {
    id: policyIdOf(k),
    entry: k.entry as Policy['entry'],
    entryParams: k.entryParams,
    exit: exitSpecOf(k.exit, exitParams),
    reentry: 'R3F',
    sizing: k.sizing ?? { kind: 'Z0' }
  };

  if (k.protect) {
    policy.protect = k.protect;
  }

  return policy;
};

// A cell and a vector (dimension name → value) → the policy key.
export const keyOf = (cell: MatrixCell, values: Params, overrides?: Partial<Key>): Key => {
  const entryParams: Params = {};
  const exitParams: Params = {};

  for (const [name, value] of Object.entries(values)) {
    if (name.startsWith('e.')) {
      entryParams[name.slice(2)] = value;
    } else if (name.startsWith('x.')) {
      exitParams[name.slice(2)] = value;
    }
  }

  return {
    entry: cell.entry,
    entryParams,
    exit: cell.exit as ExitFamily,
    contract: cell.contract,
    exitParams,
    mask: cell.mask,
    protect: protectOf(cell.mask, values),
    ...overrides
  };
};

export const cellByKey = new Map(cells.map((c) => [c.key, c]));

export const cellOf = (entry: string, exit: string, contract: Contract, mask: Mask) => {
  const cell = cellByKey.get(`${entry}|${exit}|${contract}|${mask}`);

  if (!cell) {
    throw new Error(`no cell ${entry}|${exit}|${contract}|${mask}`);
  }

  return cell;
};

export const pairKey = (cell: MatrixCell) => `${cell.entry}|${cell.exit}|${cell.contract}`;
