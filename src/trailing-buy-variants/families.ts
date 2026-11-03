// The strategy families of the variants program and their quantized parameter spaces (PROTOCOL.md section 4).
// Percentages are integer tenths of a percentage point (105 = 10.5%); initialFraction is in whole percent on a
// 5-point grid; durations are whole calendar days, sessions or minutes. A genome is one integer grid index per
// free parameter, in spec order; a family has no gene for a parameter its flags don't read.
import { createHash } from 'node:crypto';
import { type FamilyFlags, type StrategyParams, baseFlags } from './engine.ts';

export type ParamKey =
  | 'targetPercentChange'
  | 'trailingBuyPercentage'
  | 'trailingStopPercentage'
  | 'maximumHoldDays'
  | 'tickWindowSize'
  | 'materialLossThreshold'
  | 'lowerPriceReentry'
  | 'retraceFraction'
  | 'intradayLossBuffer'
  | 'invalidationBuffer'
  | 'episodeLossBudget'
  | 'episodeResetRetrace'
  | 'reboundDepthSlope'
  | 'initialFraction'
  | 'addTrigger'
  | 'progressThreshold'
  | 'holdExtensionDays'
  | 'confirmMinutes';

export type Unit = 'tenths of a percentage point' | 'percent' | 'calendar days' | 'sessions' | 'minutes';

export interface ParamSpec {
  key: ParamKey;
  short: string;
  label: string;
  unit: Unit;
  min: number;
  max: number;
  step: number;
  probes: number[]; // one-parameter neighbour offsets in grid steps
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

const whole = (
  key: ParamKey,
  short: string,
  label: string,
  unit: Unit,
  min: number,
  max: number,
  probes: number[]
): ParamSpec => ({
  key,
  short,
  label,
  unit,
  min,
  max,
  step: 1,
  probes
});

export const specs: Record<ParamKey, ParamSpec> = {
  targetPercentChange: percent('targetPercentChange', 'X', 'Decline from the reference high that arms', 50, 300),
  trailingBuyPercentage: percent('trailingBuyPercentage', 'Y', 'Rebound from the trailing low that buys', 1, 80),
  trailingStopPercentage: percent('trailingStopPercentage', 'stop', 'Trailing stop below the post-entry high', 30, 150),
  maximumHoldDays: whole(
    'maximumHoldDays',
    'hold',
    'Calendar days before the loss exit applies',
    'calendar days',
    3,
    40,
    [-3, -2, -1, 1, 2, 3]
  ),
  tickWindowSize: whole('tickWindowSize', 'L', 'Reference-high lookback', 'sessions', 45, 180, [-10, -5, -2, 2, 5, 10]),
  materialLossThreshold: percent('materialLossThreshold', 'mat', 'Price loss that restricts re-entry', 5, 30),
  lowerPriceReentry: percent('lowerPriceReentry', 'lower', 'Decline below the loss exit needed to arm', 0, 60),
  retraceFraction: percent('retraceFraction', 'reset', 'Recovery of the decline that resets the restriction', 200, 700),
  intradayLossBuffer: percent('intradayLossBuffer', 'buffer', 'Net loss that triggers the buffered exit', 0, 30),
  invalidationBuffer: percent('invalidationBuffer', 'inv', 'Buffer below the pre-entry trough that invalidates', 0, 60),
  episodeLossBudget: percent('episodeLossBudget', 'budget', 'Episode loss (of $100,000) that blocks arming', 10, 200),
  episodeResetRetrace: percent(
    'episodeResetRetrace',
    'epReset',
    'Recovery of the episode decline that resets',
    200,
    800
  ),
  reboundDepthSlope: percent('reboundDepthSlope', 'slope', 'Extra rebound per unit of depth beyond X', 0, 500),
  initialFraction: {
    key: 'initialFraction',
    short: 'first',
    label: 'First leg as a percent of $100,000',
    unit: 'percent',
    min: 10,
    max: 90,
    step: 5,
    probes: [-2, -1, 1, 2]
  },
  addTrigger: percent('addTrigger', 'add', 'Progress above the first leg that adds the rest', 5, 100),
  progressThreshold: percent('progressThreshold', 'progress', 'Progress above entry that extends the hold', 5, 100),
  holdExtensionDays: whole(
    'holdExtensionDays',
    'extend',
    'Extra calendar days of hold after progress',
    'calendar days',
    1,
    45,
    [-3, -2, -1, 1, 2, 3]
  ),
  confirmMinutes: whole(
    'confirmMinutes',
    'confirm',
    'Consecutive closes at or above the trigger',
    'minutes',
    2,
    30,
    [-3, -2, -1, 1, 2, 3]
  )
};

export type MechanismKey =
  'invalidation' | 'episodeBudget' | 'depthRebound' | 'staged' | 'progressHold' | 'persistence';

export const mechanismKeys: MechanismKey[] = [
  'invalidation',
  'episodeBudget',
  'depthRebound',
  'staged',
  'progressHold',
  'persistence'
];

export const mechanismParams: Record<MechanismKey, ParamKey[]> = {
  invalidation: ['invalidationBuffer'],
  episodeBudget: ['episodeLossBudget', 'episodeResetRetrace'],
  depthRebound: ['reboundDepthSlope'],
  staged: ['initialFraction', 'addTrigger'],
  progressHold: ['progressThreshold', 'holdExtensionDays'],
  persistence: ['confirmMinutes']
};

export const mechanismNames: Record<MechanismKey, string> = {
  invalidation: 'failed-recovery invalidation exit',
  episodeBudget: 'correction-episode loss budget',
  depthRebound: 'depth-adjusted rebound',
  staged: 'progressive deployment',
  progressHold: 'progress-based hold extension',
  persistence: 'rebound persistence confirmation'
};

// Mechanism defaults for the anchors and the source files, in integer units.
export const mechanismDefaults: Record<ParamKey, number> = {
  targetPercentChange: 100,
  trailingBuyPercentage: 30,
  trailingStopPercentage: 80,
  maximumHoldDays: 15,
  tickWindowSize: 90,
  materialLossThreshold: 10,
  lowerPriceReentry: 20,
  retraceFraction: 380,
  intradayLossBuffer: 5,
  invalidationBuffer: 20,
  episodeLossBudget: 80,
  episodeResetRetrace: 500,
  reboundDepthSlope: 100,
  initialFraction: 50,
  addTrigger: 20,
  progressThreshold: 30,
  holdExtensionDays: 10,
  confirmMinutes: 3
};

// The Trades2 phenotype (file 4's checked-in constants), in integer units.
export const trades2Values: Partial<Record<ParamKey, number>> = {
  targetPercentChange: 200,
  trailingBuyPercentage: 5,
  trailingStopPercentage: 78,
  maximumHoldDays: 11,
  tickWindowSize: 104,
  intradayLossBuffer: 2
};

export interface Family {
  key: string;
  number: number;
  name: string;
  base: 'trailingBuy' | 'bufferedLoss' | 'noReentry' | 'bufferedLossNoReentry';
  baseNumber: number;
  mechanisms: MechanismKey[];
  flags: FamilyFlags;
  paramKeys: ParamKey[];
  fileY: number; // the base file's executable default Y, in tenths
}

const core: ParamKey[] = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize'
];
const restriction: ParamKey[] = ['materialLossThreshold', 'lowerPriceReentry', 'retraceFraction'];

const baseDefinitions = {
  trailingBuy: { number: 1, name: 'Trailing buy (restricted re-entry)', restricted: true, buffered: false, fileY: 40 },
  bufferedLoss: {
    number: 2,
    name: 'Trailing buy + buffered loss exit (restricted re-entry)',
    restricted: true,
    buffered: true,
    fileY: 30
  },
  noReentry: {
    number: 3,
    name: 'Trailing buy, no re-entry restriction',
    restricted: false,
    buffered: false,
    fileY: 30
  },
  bufferedLossNoReentry: {
    number: 4,
    name: 'Trailing buy + buffered loss exit, no re-entry restriction',
    restricted: false,
    buffered: true,
    fileY: 30
  }
} as const;

export type BaseKey = keyof typeof baseDefinitions;

export const makeFamily = (key: string, number: number, base: BaseKey, mechanisms: MechanismKey[]): Family => {
  const definition = baseDefinitions[base];
  const flags = baseFlags(definition.restricted, definition.buffered);

  for (const mechanism of mechanisms) {
    flags[mechanism] = true;
  }

  const suffix =
    mechanisms.length > 0 ? ` + ${mechanisms.map((mechanism) => mechanismNames[mechanism]).join(' + ')}` : '';

  return {
    key,
    number,
    name: `${definition.name}${suffix}`,
    base,
    baseNumber: definition.number,
    mechanisms,
    flags,
    paramKeys: [
      ...core,
      ...(definition.restricted ? restriction : []),
      ...(definition.buffered ? (['intradayLossBuffer'] as ParamKey[]) : []),
      ...mechanisms.flatMap((mechanism) => mechanismParams[mechanism])
    ],
    fileY: definition.fileY
  };
};

const list: Family[] = [
  makeFamily('trailingBuy', 1, 'trailingBuy', []),
  makeFamily('bufferedLoss', 2, 'bufferedLoss', []),
  makeFamily('noReentry', 3, 'noReentry', []),
  makeFamily('bufferedLossNoReentry', 4, 'bufferedLossNoReentry', [])
];

mechanismKeys.forEach((mechanism, index) => {
  list.push(makeFamily(mechanism, 5 + index * 2, 'bufferedLossNoReentry', [mechanism]));
  list.push(makeFamily(`${mechanism}Unbuffered`, 6 + index * 2, 'noReentry', [mechanism]));
});

// Combinations (PROTOCOL.md Amendment 1, if any) are appended by registerFamily before use.
export const families: Record<string, Family> = Object.fromEntries(list.map((family) => [family.key, family]));
export const familyKeys = () => Object.keys(families);
export const baseFamilyKeys = ['trailingBuy', 'bufferedLoss', 'noReentry', 'bufferedLossNoReentry'];

export const registerFamily = (family: Family) => {
  families[family.key] = family;
};

export type IntParams = Partial<Record<ParamKey, number>>;

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

// The base file defaults at a given Y (in tenths), with the mechanism defaults.
export const defaultParams = (family: Family, y = family.fileY): IntParams =>
  Object.fromEntries(
    family.paramKeys.map((key) => [key, key === 'trailingBuyPercentage' ? y : mechanismDefaults[key]])
  ) as IntParams;

// The Trades2 phenotype on this family: its five core values and buffer, restriction and mechanism defaults.
export const trades2Params = (family: Family): IntParams =>
  Object.fromEntries(family.paramKeys.map((key) => [key, trades2Values[key] ?? mechanismDefaults[key]])) as IntParams;

// The engine's fractions: tenths / 1000 (percent / 100 for initialFraction) is the same double as the source
// literal. Parameters the family doesn't read get NaN.
export const toStrategyParams = (family: Family, params: IntParams): StrategyParams => {
  const has = (key: ParamKey) => family.paramKeys.includes(key);
  const value = (key: ParamKey) => {
    const raw = params[key];

    if (raw === undefined) {
      throw new Error(`${family.key} is missing ${key}`);
    }

    return raw;
  };
  const fraction = (key: ParamKey) => (has(key) ? value(key) / 1000 : NaN);
  const whole = (key: ParamKey) => (has(key) ? value(key) : NaN);

  return {
    targetPercentChange: fraction('targetPercentChange'),
    trailingBuyPercentage: fraction('trailingBuyPercentage'),
    trailingStopPercentage: fraction('trailingStopPercentage'),
    maximumHoldDays: whole('maximumHoldDays'),
    tickWindowSize: whole('tickWindowSize'),
    materialLossThreshold: fraction('materialLossThreshold'),
    lowerPriceReentry: fraction('lowerPriceReentry'),
    retraceFraction: fraction('retraceFraction'),
    intradayLossBuffer: fraction('intradayLossBuffer'),
    invalidationBuffer: fraction('invalidationBuffer'),
    episodeLossBudget: fraction('episodeLossBudget'),
    episodeResetRetrace: fraction('episodeResetRetrace'),
    reboundDepthSlope: fraction('reboundDepthSlope'),
    initialFraction: has('initialFraction') ? value('initialFraction') / 100 : NaN,
    addTrigger: fraction('addTrigger'),
    progressThreshold: fraction('progressThreshold'),
    holdExtensionDays: whole('holdExtensionDays'),
    confirmMinutes: whole('confirmMinutes')
  };
};

export const canonicalKey = (family: Family, params: IntParams) =>
  family.paramKeys.map((key) => `${key}=${params[key]}`).join(',');

export const candidateId = (family: Family, params: IntParams) =>
  `${family.number}-${createHash('sha256')
    .update(`trailing-buy-variants-v1|${family.key}|${canonicalKey(family, params)}`)
    .digest('hex')
    .slice(0, 10)}`;

export const formatValue = (key: ParamKey, value: number | undefined) => {
  if (value === undefined) {
    return 'N/A';
  }

  const unit = specs[key].unit;

  return unit === 'tenths of a percentage point'
    ? `${(value / 10).toFixed(1)}%`
    : unit === 'percent'
      ? `${value}%`
      : `${value}`;
};

export const describeParams = (family: Family, params: IntParams) =>
  family.paramKeys.map((key) => `${specs[key].short}=${formatValue(key, params[key])}`).join(' ');

// Every parameter in a fixed order, for CSV columns.
export const allParamKeys = Object.keys(specs) as ParamKey[];
