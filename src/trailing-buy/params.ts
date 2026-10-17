// Parameter spaces of the three entry families, each parameter on an explicit integer grid: percentages in
// tenths of a percentage point (0.1 pp), the ATR multiplier in tenths, durations in whole sessions or
// calendar days. Genomes are grid indices; every value the optimizer can produce is exactly quantized, and
// the same integers flow through generation, crossover, mutation, evaluation, caching and output.
import { createHash } from 'node:crypto';
import type { ParameterSpace as OptimizerSpace } from '../optimizer/params.ts';
import type { EntryMode, StrategyParams } from './engine.ts';
import { baselineParams } from './engine.ts';

export type Family = 'legacy' | 'fixed' | 'atr';

export type NumericKey = Exclude<keyof StrategyParams, 'entryMode'>;

export interface Spec {
  key: NumericKey;
  label: string;
  unit: 'tenths of a percentage point' | 'tenths' | 'sessions' | 'calendar days';
  min: number;
  max: number;
  step: number;
  radius: number; // grid steps to each side in the robustness neighbourhood
}

export interface Space {
  name: string;
  family: Family;
  entryMode: EntryMode;
  specs: Spec[];
  // Values of parameters outside the search (e.g. the rebound of the legacy family is always 0).
  fixed: Partial<StrategyParams>;
}

const pct = (key: NumericKey, label: string, minPct: number, maxPct: number): Spec => ({
  key,
  label,
  unit: 'tenths of a percentage point',
  min: Math.round(minPct * 10),
  max: Math.round(maxPct * 10),
  step: 1,
  radius: 3
});

// Shared exit / re-entry coefficients and the entry lookback, with the brief's exploratory bounds.
const commonSpecs: Spec[] = [
  { key: 'lookback', label: 'Prior-high lookback L', unit: 'sessions', min: 45, max: 180, step: 1, radius: 5 },
  pct('armTenths', 'Arm / entry drawdown X', 7, 20),
  pct('stopTenths', 'Exit trailing distance', 4, 12),
  { key: 'holdDays', label: 'Loss exit age', unit: 'calendar days', min: 5, max: 30, step: 1, radius: 2 },
  pct('materialLossTenths', 'Material price-loss threshold', 0.5, 3),
  pct('lowerReentryTenths', 'Lower re-entry eligibility', 0.5, 6),
  pct('retraceTenths', 'Recovery retracement fraction', 20, 70)
];

export const spaces: Record<Family, Space> = {
  legacy: {
    name: 'tbe-legacy-v1',
    family: 'legacy',
    entryMode: 'legacy',
    specs: commonSpecs,
    fixed: { reboundTenths: 0, atrMultTenths: 0, atrPeriod: 0 }
  },
  fixed: {
    name: 'tbe-fixed-v1',
    family: 'fixed',
    entryMode: 'fixed',
    specs: [...commonSpecs.slice(0, 2), pct('reboundTenths', 'Fixed rebound Y', 0.5, 8), ...commonSpecs.slice(2)],
    fixed: { atrMultTenths: 0, atrPeriod: 0 }
  },
  atr: {
    name: 'tbe-atr-v1',
    family: 'atr',
    entryMode: 'atrSnapshot',
    specs: [
      ...commonSpecs.slice(0, 2),
      { key: 'atrMultTenths', label: 'ATR multiplier K', unit: 'tenths', min: 5, max: 40, step: 1, radius: 3 },
      { key: 'atrPeriod', label: 'ATR period N', unit: 'sessions', min: 5, max: 30, step: 1, radius: 2 },
      ...commonSpecs.slice(2)
    ],
    fixed: { reboundTenths: 0 }
  }
};

export type Genome = number[];

export const gridSize = (spec: Spec) => Math.floor((spec.max - spec.min) / spec.step) + 1;

export const spaceSize = (space: Space) => space.specs.reduce((total, spec) => total * gridSize(spec), 1);

export const genomeToParams = (space: Space, genome: Genome): StrategyParams => {
  const params: StrategyParams = { ...baselineParams, entryMode: space.entryMode, ...space.fixed };

  space.specs.forEach((spec, dimension) => {
    const index = genome[dimension]!;

    if (!Number.isInteger(index) || index < 0 || index >= gridSize(spec)) {
      throw new Error(`Genome index ${index} for ${spec.key} is off the grid`);
    }

    params[spec.key] = spec.min + index * spec.step;
  });

  return params;
};

export const paramsToGenome = (space: Space, params: StrategyParams): Genome =>
  space.specs.map((spec) => {
    const index = (params[spec.key] - spec.min) / spec.step;

    if (!Number.isInteger(index) || index < 0 || index >= gridSize(spec)) {
      throw new Error(`${spec.key}=${params[spec.key]} is not on the grid ${spec.min}..${spec.max}`);
    }

    return index;
  });

const keyOrder: (keyof StrategyParams)[] = [
  'entryMode',
  'lookback',
  'armTenths',
  'reboundTenths',
  'atrMultTenths',
  'atrPeriod',
  'stopTenths',
  'holdDays',
  'materialLossTenths',
  'lowerReentryTenths',
  'retraceTenths'
];

// The canonical text of a full parameter vector (every field, fixed order, integers).
export const canonicalParams = (params: StrategyParams) => keyOrder.map((key) => `${key}=${params[key]}`).join(',');

export const paramsId = (params: StrategyParams) =>
  `p${createHash('sha256').update(canonicalParams(params)).digest('hex').slice(0, 12)}`;

export const formatValue = (key: NumericKey, value: number) => {
  if (key === 'lookback' || key === 'atrPeriod') {
    return `${value}`;
  }

  if (key === 'holdDays') {
    return `${value}d`;
  }

  if (key === 'atrMultTenths') {
    return (value / 10).toFixed(1);
  }

  return `${(value / 10).toFixed(1)}%`;
};

// Every parameter in plain units, for tables.
export const describeParams = (params: StrategyParams) => {
  const parts = [`L=${params.lookback}`, `X=${formatValue('armTenths', params.armTenths)}`];

  if (params.entryMode === 'fixed') {
    parts.push(`Y=${formatValue('reboundTenths', params.reboundTenths)}`);
  }

  if (params.entryMode === 'atrSnapshot' || params.entryMode === 'atrRolling') {
    parts.push(`K=${formatValue('atrMultTenths', params.atrMultTenths)}`, `N=${params.atrPeriod}`);
  }

  parts.push(
    `stop=${formatValue('stopTenths', params.stopTenths)}`,
    `hold=${params.holdDays}d`,
    `loss=${formatValue('materialLossTenths', params.materialLossTenths)}`,
    `lower=${formatValue('lowerReentryTenths', params.lowerReentryTenths)}`,
    `retrace=${formatValue('retraceTenths', params.retraceTenths)}`
  );

  return `${params.entryMode} ${parts.join(' ')}`;
};

// One-step neighbours: each parameter moved by its radius to each side, the others held; off-grid ones
// are clamped to the bound (and dropped when that equals the candidate).
export const neighbourGenomes = (space: Space, genome: Genome): Genome[] => {
  const neighbours: Genome[] = [];

  space.specs.forEach((spec, dimension) => {
    for (const direction of [-1, 1]) {
      const index = Math.min(gridSize(spec) - 1, Math.max(0, genome[dimension]! + direction * spec.radius));

      if (index !== genome[dimension]) {
        const neighbour = [...genome];

        neighbour[dimension] = index;
        neighbours.push(neighbour);
      }
    }
  });

  return neighbours;
};

// The repository's NSGA-II operators (src/optimizer/nsga2.ts) only read min, max and step of each spec;
// this adapter lets them run on this study's spaces without changing that module.
export const asOptimizerSpace = (space: Space): OptimizerSpace =>
  ({
    name: space.name,
    specs: space.specs.map((spec) => ({ ...spec, neighborhoodRadius: spec.radius, rationale: '' }))
  }) as unknown as OptimizerSpace;
