// The four optimization families and their quantized parameter spaces. Percentages are integer tenths of a
// percentage point (105 = 10.5%), so every candidate is exactly on the 0.1-point lattice; durations are whole
// calendar days or whole sessions. A genome is one integer grid index per free parameter, in spec order; a
// family has no gene for a parameter its strategy file doesn't have.
import { createHash } from 'node:crypto';
import type { FamilyFlags, StrategyParams } from './engine.ts';
import type { SourceKey } from './copies.ts';

export type FamilyKey = 'trailingBuy' | 'bufferedLoss' | 'noReentry' | 'bufferedLossNoReentry';

export const familyKeys: FamilyKey[] = ['trailingBuy', 'bufferedLoss', 'noReentry', 'bufferedLossNoReentry'];

export type ParamKey =
  | 'targetPercentChange'
  | 'trailingBuyPercentage'
  | 'trailingStopPercentage'
  | 'maximumHoldDays'
  | 'tickWindowSize'
  | 'materialLossThreshold'
  | 'lowerPriceReentry'
  | 'retraceFraction'
  | 'intradayLossBuffer';

export type Unit = 'tenths of a percentage point' | 'calendar days' | 'sessions';

export interface ParamSpec {
  key: ParamKey;
  short: string;
  label: string;
  unit: Unit;
  min: number; // inclusive, in the integer unit
  max: number;
  step: number; // always 1 here
  probes: number[]; // one-parameter neighbour offsets in grid steps, for the selection's stability check
}

const percent = (key: ParamKey, short: string, label: string, min: number, max: number): ParamSpec => ({
  key,
  short,
  label,
  unit: 'tenths of a percentage point',
  min,
  max,
  step: 1,
  probes: [-5, -3, -1, 1, 3, 5]
});

export const specs: Record<ParamKey, ParamSpec> = {
  targetPercentChange: percent('targetPercentChange', 'X', 'Decline from the reference high that arms', 70, 200),
  trailingBuyPercentage: percent('trailingBuyPercentage', 'Y', 'Rebound from the trailing low that buys', 5, 80),
  trailingStopPercentage: percent('trailingStopPercentage', 'stop', 'Trailing stop below the post-entry high', 40, 120),
  maximumHoldDays: {
    key: 'maximumHoldDays',
    short: 'hold',
    label: 'Calendar days before the loss exit applies',
    unit: 'calendar days',
    min: 5,
    max: 30,
    step: 1,
    probes: [-3, -2, -1, 1, 2, 3]
  },
  tickWindowSize: {
    key: 'tickWindowSize',
    short: 'L',
    label: 'Reference-high lookback',
    unit: 'sessions',
    min: 45,
    max: 180,
    step: 1,
    probes: [-10, -5, -2, 2, 5, 10]
  },
  materialLossThreshold: percent('materialLossThreshold', 'mat', 'Price loss that restricts re-entry', 5, 30),
  lowerPriceReentry: percent('lowerPriceReentry', 'lower', 'Decline below the loss exit needed to arm', 0, 60),
  retraceFraction: percent('retraceFraction', 'reset', 'Recovery of the decline that resets', 200, 700),
  intradayLossBuffer: percent('intradayLossBuffer', 'buffer', 'Net loss that triggers the buffered exit', 0, 30)
};

export interface Family {
  key: FamilyKey;
  number: number;
  name: string;
  source: SourceKey;
  flags: FamilyFlags;
  paramKeys: ParamKey[];
  fileY: number; // the file's executable default Y, in tenths
}

const core: ParamKey[] = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize'
];
const restriction: ParamKey[] = ['materialLossThreshold', 'lowerPriceReentry', 'retraceFraction'];

export const families: Record<FamilyKey, Family> = {
  trailingBuy: {
    key: 'trailingBuy',
    number: 1,
    name: 'Trailing buy (restricted re-entry)',
    source: 'trailingBuy',
    flags: { restricted: true, buffered: false },
    paramKeys: [...core, ...restriction],
    fileY: 40
  },
  bufferedLoss: {
    key: 'bufferedLoss',
    number: 2,
    name: 'Trailing buy + buffered loss exit (restricted re-entry)',
    source: 'bufferedLoss',
    flags: { restricted: true, buffered: true },
    paramKeys: [...core, ...restriction, 'intradayLossBuffer'],
    fileY: 30
  },
  noReentry: {
    key: 'noReentry',
    number: 3,
    name: 'Trailing buy, no re-entry restriction',
    source: 'noReentry',
    flags: { restricted: false, buffered: false },
    paramKeys: [...core],
    fileY: 30
  },
  bufferedLossNoReentry: {
    key: 'bufferedLossNoReentry',
    number: 4,
    name: 'Trailing buy + buffered loss exit, no re-entry restriction',
    source: 'bufferedLossNoReentry',
    flags: { restricted: false, buffered: true },
    paramKeys: [...core, 'intradayLossBuffer'],
    fileY: 30
  }
};

// Parameter values in integer units, keyed by parameter; absent keys don't apply to the family.
export type IntParams = Partial<Record<ParamKey, number>>;

// The strategy files' hard-coded defaults, in integer units (Y is per file).
export const defaultValues: Record<ParamKey, number> = {
  targetPercentChange: 100,
  trailingBuyPercentage: 30,
  trailingStopPercentage: 80,
  maximumHoldDays: 15,
  tickWindowSize: 90,
  materialLossThreshold: 10,
  lowerPriceReentry: 20,
  retraceFraction: 380,
  intradayLossBuffer: 5
};

export const familySpecs = (family: Family) => family.paramKeys.map((key) => specs[key]);

export const gridSize = (spec: ParamSpec) => Math.floor((spec.max - spec.min) / spec.step) + 1;

export const genomeToParams = (family: Family, genome: readonly number[]): IntParams => {
  const params: IntParams = {};

  familySpecs(family).forEach((spec, dimension) => {
    const index = genome[dimension]!;

    if (!Number.isInteger(index) || index < 0 || index >= gridSize(spec)) {
      throw new Error(`Genome index ${index} for ${spec.key} is off the grid`);
    }

    params[spec.key] = spec.min + index * spec.step;
  });

  return params;
};

export const paramsToGenome = (family: Family, params: IntParams): number[] =>
  familySpecs(family).map((spec) => {
    const value = params[spec.key];
    const index = value === undefined ? NaN : (value - spec.min) / spec.step;

    if (!Number.isInteger(index) || index < 0 || index >= gridSize(spec)) {
      throw new Error(`${family.key}: ${spec.key}=${value} is not on the grid ${spec.min}..${spec.max}`);
    }

    return index;
  });

// The file defaults at a given Y (in tenths); the family's own default uses fileY.
export const defaultParams = (family: Family, y = family.fileY): IntParams =>
  Object.fromEntries(
    family.paramKeys.map((key) => [key, key === 'trailingBuyPercentage' ? y : defaultValues[key]])
  ) as IntParams;

// The engine's fractions: tenths / 1000 is the double nearest the decimal value, the same double as the
// source's literal (0.1, 0.38, ...). Absent parameters get inert values the family never reads.
export const toStrategyParams = (family: Family, params: IntParams): StrategyParams => {
  const fraction = (key: ParamKey) => {
    const value = params[key];

    if (value === undefined) {
      throw new Error(`${family.key} is missing ${key}`);
    }

    return value / 1000;
  };
  const whole = (key: ParamKey) => params[key]!;

  return {
    targetPercentChange: fraction('targetPercentChange'),
    trailingBuyPercentage: fraction('trailingBuyPercentage'),
    trailingStopPercentage: fraction('trailingStopPercentage'),
    maximumHoldDays: whole('maximumHoldDays'),
    tickWindowSize: whole('tickWindowSize'),
    materialLossThreshold: family.flags.restricted ? fraction('materialLossThreshold') : NaN,
    lowerPriceReentry: family.flags.restricted ? fraction('lowerPriceReentry') : NaN,
    retraceFraction: family.flags.restricted ? fraction('retraceFraction') : NaN,
    intradayLossBuffer: family.flags.buffered ? fraction('intradayLossBuffer') : NaN
  };
};

export const canonicalKey = (family: Family, params: IntParams) =>
  family.paramKeys.map((key) => `${key}=${params[key]}`).join(',');

export const candidateId = (family: Family, params: IntParams) =>
  `${family.number}-${createHash('sha256')
    .update(`four-family-v1|${family.key}|${canonicalKey(family, params)}`)
    .digest('hex')
    .slice(0, 10)}`;

export const formatValue = (key: ParamKey, value: number | undefined) => {
  if (value === undefined) {
    return 'N/A';
  }

  return specs[key].unit === 'tenths of a percentage point' ? `${(value / 10).toFixed(1)}%` : `${value}`;
};

export const describeParams = (family: Family, params: IntParams) =>
  family.paramKeys.map((key) => `${specs[key].short}=${formatValue(key, params[key])}`).join(' ');

// All nine parameters in a fixed order, N/A where the family has no such parameter.
export const allParamKeys: ParamKey[] = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'materialLossThreshold',
  'lowerPriceReentry',
  'retraceFraction',
  'intradayLossBuffer'
];
