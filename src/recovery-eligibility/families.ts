// The families of the recovery-eligibility program and their quantized parameter spaces
// (research/vgt-recovery-eligibility/OPTIMIZATION.md section 1). Percentages are integer tenths of a percentage
// point (216 = 21.6%); durations are whole calendar days or sessions. A genome is one grid index per free
// parameter, in spec order; a family has no gene for a parameter its mechanisms don't read.
import { createHash } from 'node:crypto';
import { type Mechanisms, type Params, noMechanisms } from './engine.ts';

export type ParamKey = keyof Params;

export type Unit = 'tenths of a percentage point' | 'calendar days' | 'sessions' | 'policy';

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
  tickWindowSize: whole('tickWindowSize', 'L', 'Reference-high lookback', 'sessions', 45, 365, [-10, -5, -2, 2, 5, 10]),
  intradayLossBuffer: percent('intradayLossBuffer', 'buffer', 'Net loss that triggers the buffered exit', 0, 50),
  episodeReset: percent('episodeReset', 'reset', 'Recovery of the episode decline that ends the episode', 200, 1000),
  episodeExpiry: whole(
    'episodeExpiry',
    'expiry',
    'Sessions after the last deep arming that end the episode',
    'sessions',
    20,
    500,
    [-20, -10, -5, 5, 10, 20]
  ),
  anchorPolicy: whole(
    'anchorPolicy',
    'anchor',
    'Episode high: 0 highest deep-arming reference, 1 latest',
    'policy',
    0,
    1,
    []
  ),
  resetPolicy: whole(
    'resetPolicy',
    'resetAt',
    'Episode reset tested: 0 at every close, 1 only at flat closes',
    'policy',
    0,
    1,
    [-1, 1]
  ),
  latchDepth: percent('latchDepth', 'U', 'Decline below the episode high that re-arms', 0, 300),
  troughRecovery: percent('troughRecovery', 'T', 'Rise above the episode trough that arms', 10, 300),
  troughRetrace: percent(
    'troughRetrace',
    'F',
    'Fraction of the decline recovered that must also hold (0 unused)',
    0,
    800
  ),
  shallowDepth: percent('shallowDepth', 'X2', 'Shallow decline from the reference high that arms', 30, 250),
  shallowRebound: percent('shallowRebound', 'Y2', 'Rebound that buys a shallow setup', 1, 100),
  pullback: percent('pullback', 'P', 'Decline from the post-exit high that arms', 10, 200),
  continuationWindow: whole(
    'continuationWindow',
    'W',
    'Sessions after a profitable exit during which the pullback can arm',
    'sessions',
    5,
    250,
    [-20, -10, -5, 5, 10, 20]
  )
};

export type MechanismKey = keyof Mechanisms;

export const mechanismKeys: MechanismKey[] = ['latch', 'trough', 'dual', 'postExit'];

export const mechanismParams: Record<MechanismKey, ParamKey[]> = {
  latch: ['latchDepth', 'episodeReset', 'resetPolicy', 'episodeExpiry'],
  trough: ['troughRecovery', 'troughRetrace', 'episodeReset', 'resetPolicy', 'episodeExpiry'],
  dual: ['shallowDepth', 'shallowRebound'],
  postExit: ['pullback', 'continuationWindow']
};

export const mechanismNames: Record<MechanismKey, string> = {
  latch: 'correction-episode latch (A: latch depth = X; E: shallower)',
  trough: 'recovery-from-trough eligibility (B)',
  dual: 'dual-mode entry (C)',
  postExit: 'post-exit continuation (D)'
};

// The Set 2 phenotype (file 4's checked-in constants), in integer units.
export const set2Values: Record<string, number> = {
  targetPercentChange: 216,
  trailingBuyPercentage: 3,
  trailingStopPercentage: 73,
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: 29
};

// The Trades2 phenotype of the previous program, for the behavioural comparator.
export const trades2Values: Record<string, number> = {
  targetPercentChange: 200,
  trailingBuyPercentage: 5,
  trailingStopPercentage: 78,
  maximumHoldDays: 11,
  tickWindowSize: 104,
  intradayLossBuffer: 2
};

// Predeclared conservative mechanism defaults (COUNTERFACTUALS.md section 1), in integer units.
export const mechanismDefaults: Record<string, number> = {
  episodeReset: 500,
  episodeExpiry: 250,
  anchorPolicy: 0,
  resetPolicy: 0,
  latchDepth: 216,
  troughRecovery: 50,
  troughRetrace: 0,
  shallowDepth: 100,
  shallowRebound: 30,
  pullback: 50,
  continuationWindow: 60
};

export interface Family {
  key: string;
  number: number;
  name: string;
  mechanisms: MechanismKey[];
  flags: Mechanisms;
  paramKeys: ParamKey[];
}

const core: ParamKey[] = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer'
];

export const makeFamily = (key: string, number: number, mechanisms: MechanismKey[]): Family => {
  const flags = { ...noMechanisms };
  const paramKeys = [...core];

  for (const mechanism of mechanisms) {
    flags[mechanism] = true;

    for (const paramKey of mechanismParams[mechanism]) {
      if (!paramKeys.includes(paramKey)) {
        paramKeys.push(paramKey);
      }
    }
  }

  // The anchor policy is a fixed choice, never searched: it is only a parameter of the engine.
  const suffix =
    mechanisms.length > 0 ? `: ${mechanisms.map((mechanism) => mechanismNames[mechanism]).join(' + ')}` : '';

  return {
    key,
    number,
    name: `file 4 (trailing buy + buffered loss, no re-entry restriction)${suffix}`,
    mechanisms,
    flags,
    paramKeys
  };
};

const list: Family[] = [
  makeFamily('base', 0, []),
  makeFamily('latch', 1, ['latch']),
  makeFamily('trough', 2, ['trough']),
  makeFamily('dual', 3, ['dual']),
  makeFamily('postExit', 4, ['postExit']),
  makeFamily('latchPostExit', 5, ['latch', 'postExit']),
  makeFamily('troughPostExit', 6, ['trough', 'postExit'])
];

export const families: Record<string, Family> = Object.fromEntries(list.map((family) => [family.key, family]));
export const familyKeys = () => Object.keys(families);
export const singleMechanismKeys = ['latch', 'trough', 'dual', 'postExit'];

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

// Set 2 on this family with the mechanism defaults, optionally overridden.
export const set2Params = (family: Family, overrides: IntParams = {}): IntParams =>
  Object.fromEntries(
    family.paramKeys.map((key) => [key, overrides[key] ?? set2Values[key] ?? mechanismDefaults[key]])
  ) as IntParams;

export const trades2Params = (family: Family, overrides: IntParams = {}): IntParams =>
  Object.fromEntries(
    family.paramKeys.map((key) => [key, overrides[key] ?? trades2Values[key] ?? mechanismDefaults[key]])
  ) as IntParams;

// The engine's fractions: tenths / 1000 is the same double as the source literal. Parameters the family
// doesn't read get NaN; the anchor policy defaults to 0 (highest) unless given.
export const toParams = (family: Family, params: IntParams): Params => {
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
    intradayLossBuffer: fraction('intradayLossBuffer'),
    episodeReset: fraction('episodeReset'),
    episodeExpiry: whole('episodeExpiry'),
    anchorPolicy: params.anchorPolicy ?? 0,
    resetPolicy: has('resetPolicy') ? value('resetPolicy') : 0,
    latchDepth: fraction('latchDepth'),
    troughRecovery: fraction('troughRecovery'),
    troughRetrace: fraction('troughRetrace'),
    shallowDepth: fraction('shallowDepth'),
    shallowRebound: fraction('shallowRebound'),
    pullback: fraction('pullback'),
    continuationWindow: whole('continuationWindow')
  };
};

export const canonicalKey = (family: Family, params: IntParams) =>
  [...family.paramKeys.map((key) => `${key}=${params[key]}`), `anchorPolicy=${params.anchorPolicy ?? 0}`].join(',');

export const candidateId = (family: Family, params: IntParams) =>
  `${family.key}-${createHash('sha256')
    .update(`recovery-eligibility-v1|${family.key}|${canonicalKey(family, params)}`)
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

export const allParamKeys = Object.keys(specs) as ParamKey[];
