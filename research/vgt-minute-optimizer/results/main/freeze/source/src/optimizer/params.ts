// The optimizer's parameter space: the seven numerical decision constants of the daily allIn strategy,
// each on an explicit integer grid. Percentages are integer tenths of a percentage point (105 = 10.5%), so
// every candidate the optimizer can represent is exactly quantized; durations are whole days or sessions.
// Genomes are integer grid indices; values are `min + index * step`.
import { createHash } from 'node:crypto';
import { type AllInParams, originalParams } from '../app/allIn-optimizable.ts';

export type ParamKey = keyof AllInParams;

export interface ParamSpec {
  key: ParamKey;
  label: string;
  unit: 'tenths of a percentage point' | 'calendar days' | 'sessions';
  min: number; // inclusive, in the parameter's integer unit
  max: number; // inclusive
  step: number; // grid step in the integer unit (1 = 0.1 percentage point for percentages)
  neighborhoodRadius: number; // grid steps to each side for the local-stability check
  rationale: string;
}

export interface ParameterSpace {
  name: string;
  specs: ParamSpec[];
}

// Bounds are deliberately broad, so assets can land far from the VGT defaults.
export const defaultParameterSpace: ParameterSpace = {
  name: 'allin-daily-v1',
  specs: [
    {
      key: 'dipTenths',
      label: 'Entry dip below the reference high',
      unit: 'tenths of a percentage point',
      min: 20,
      max: 400,
      step: 1,
      neighborhoodRadius: 5,
      rationale:
        '2.0%-40.0%: from shallow pullbacks in low-volatility index funds to deep drawdowns in single stocks; 0% would buy at every close at the high.'
    },
    {
      key: 'trailingStopTenths',
      label: 'Trailing stop below the post-entry high',
      unit: 'tenths of a percentage point',
      min: 20,
      max: 400,
      step: 1,
      neighborhoodRadius: 5,
      rationale:
        '2.0%-40.0%: tighter than one day of index-fund noise up to wider than a typical single-stock correction.'
    },
    {
      key: 'maximumHoldDays',
      label: 'Maximum hold before a losing position is sold at the open',
      unit: 'calendar days',
      min: 1,
      max: 120,
      step: 1,
      neighborhoodRadius: 2,
      rationale:
        '1-120 calendar days. 0 would behave like 1, since the entry session is never checked for exits; 120 days is roughly two quarters.'
    },
    {
      key: 'lookbackSessions',
      label: 'Reference-high window',
      unit: 'sessions',
      min: 10,
      max: 250,
      step: 1,
      neighborhoodRadius: 10,
      rationale: '10-250 sessions: two weeks to about one year of trading sessions.'
    },
    {
      key: 'materialLossTenths',
      label: 'Material price loss that restricts re-entry',
      unit: 'tenths of a percentage point',
      min: 0,
      max: 100,
      step: 1,
      neighborhoodRadius: 3,
      rationale:
        '0.0%-10.0%: 0% restricts after any non-positive price return; at the top end few exits restrict, which approaches the unrestricted strategy.'
    },
    {
      key: 'lowerReentryTenths',
      label: 'Extra decline below the loss exit required to re-enter',
      unit: 'tenths of a percentage point',
      min: 0,
      max: 150,
      step: 1,
      neighborhoodRadius: 5,
      rationale: '0.0%-15.0%: 0% allows re-entry at or below the loss-exit price.'
    },
    {
      key: 'retraceTenths',
      label: 'Recovery of the decline that resets the restriction',
      unit: 'tenths of a percentage point',
      min: 0,
      max: 1000,
      step: 1,
      neighborhoodRadius: 50,
      rationale:
        '0.0%-100.0% of the decline from the frozen reference high to the episode low. 0% resets on the exit session itself (no restriction in effect); 100% waits for a full recovery.'
    }
  ]
};

export const gridSize = (spec: ParamSpec) => Math.floor((spec.max - spec.min) / spec.step) + 1;

export const valueAt = (spec: ParamSpec, index: number) => spec.min + index * spec.step;

export const indexOf = (spec: ParamSpec, value: number) => {
  const index = (value - spec.min) / spec.step;

  if (!Number.isInteger(index) || index < 0 || index >= gridSize(spec)) {
    throw new Error(`${spec.key}=${value} is not on the grid ${spec.min}..${spec.max} step ${spec.step}`);
  }

  return index;
};

export type Genome = number[]; // one grid index per spec, in spec order

export const genomeToParams = (space: ParameterSpace, genome: Genome): AllInParams => {
  const params = {} as AllInParams;

  space.specs.forEach((spec, dimension) => {
    const index = genome[dimension]!;

    if (!Number.isInteger(index) || index < 0 || index >= gridSize(spec)) {
      throw new Error(`Genome index ${index} for ${spec.key} is off the grid`);
    }

    params[spec.key] = valueAt(spec, index);
  });

  return params;
};

export const paramsToGenome = (space: ParameterSpace, params: AllInParams): Genome =>
  space.specs.map((spec) => indexOf(spec, params[spec.key]));

// Checks that a parameter object is exactly on the grid. Throws otherwise; nothing is silently rounded.
export const assertOnGrid = (space: ParameterSpace, params: AllInParams) => {
  paramsToGenome(space, params);

  return params;
};

// The canonical text of a candidate: every parameter in spec order as an integer.
export const canonicalKey = (space: ParameterSpace, params: AllInParams) =>
  space.specs.map((spec) => `${spec.key}=${params[spec.key]}`).join(',');

export const candidateId = (space: ParameterSpace, params: AllInParams) =>
  `c${createHash('sha256')
    .update(`${space.name}|${canonicalKey(space, params)}`)
    .digest('hex')
    .slice(0, 12)}`;

export const formatParamValue = (spec: ParamSpec, value: number) =>
  spec.unit === 'tenths of a percentage point' ? `${(value / 10).toFixed(1)}%` : `${value}`;

export const describeParams = (space: ParameterSpace, params: AllInParams) =>
  space.specs.map((spec) => `${spec.key}=${formatParamValue(spec, params[spec.key])}`).join(' ');

// Clamps each gene to the grid; returns how many genes had to be repaired.
export const repairGenome = (space: ParameterSpace, genome: number[]): { genome: Genome; repairs: number } => {
  let repairs = 0;
  const repaired = space.specs.map((spec, dimension) => {
    const raw = genome[dimension]!;
    const rounded = Math.round(raw);
    const clamped = Math.min(gridSize(spec) - 1, Math.max(0, rounded));

    if (clamped !== rounded) {
      repairs++;
    }

    return clamped;
  });

  return { genome: repaired, repairs };
};

// The one-step neighbours used by the local-stability check: each parameter moved by its radius to each
// side, the others held. Off-grid neighbours are omitted.
export const neighbourGenomes = (space: ParameterSpace, genome: Genome): Genome[] => {
  const neighbours: Genome[] = [];

  space.specs.forEach((spec, dimension) => {
    for (const direction of [-1, 1]) {
      const index = genome[dimension]! + direction * spec.neighborhoodRadius;

      if (index >= 0 && index < gridSize(spec)) {
        const neighbour = [...genome];

        neighbour[dimension] = index;
        neighbours.push(neighbour);
      }
    }
  });

  return neighbours;
};

// Grid-normalized distance (each dimension scaled by its grid span), the largest over dimensions.
export const normalizedDistance = (space: ParameterSpace, a: Genome, b: Genome) =>
  Math.max(...space.specs.map((spec, dimension) => Math.abs(a[dimension]! - b[dimension]!) / (gridSize(spec) - 1)));

export const spaceSize = (space: ParameterSpace) => space.specs.reduce((total, spec) => total * gridSize(spec), 1);

export const originalGenome = (space: ParameterSpace) => paramsToGenome(space, originalParams);
