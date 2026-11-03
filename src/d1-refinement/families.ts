// The architectures (families) of the D1-refinement program and their quantized parameter spaces. Percentages are
// integer tenths of a percentage point (216 = 21.6%); durations are whole calendar days or sessions. A family is an
// engine architecture plus the parameters it reads; a parameter it doesn't read has no gene.
import { createHash } from 'node:crypto';
import type { Architecture, EntryMode, Params, StopPolicy } from './engine.ts';
import { hasAlwaysPath, hasDeepPath, hasSwingPath } from './engine.ts';

export type ParamKey = keyof Params;

export type Unit = 'tenths of a percentage point' | 'calendar days' | 'sessions';

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

// The engine's admissible grid. The local ranges of each track are narrower and live in the study code.
export const specs: Record<ParamKey, ParamSpec> = {
  targetPercentChange: percent('targetPercentChange', 'X', 'Decline from the reference high that arms', 30, 300),
  trailingBuyPercentage: percent('trailingBuyPercentage', 'Y', 'Rebound from the trailing low that buys', 1, 150),
  trailingStopPercentage: percent('trailingStopPercentage', 'stop', 'Trailing stop below the post-entry high', 20, 150),
  maximumHoldDays: whole(
    'maximumHoldDays',
    'hold',
    'Calendar days before the loss exit applies',
    'calendar days',
    2,
    60,
    [-3, -2, -1, 1, 2, 3]
  ),
  tickWindowSize: whole('tickWindowSize', 'L', 'Reference-high lookback', 'sessions', 20, 365, [-10, -5, -2, 2, 5, 10]),
  intradayLossBuffer: percent('intradayLossBuffer', 'buffer', 'Net loss that triggers the buffered exit', 0, 60),
  pullback: percent('pullback', 'P', 'Decline from the post-exit high that arms', 10, 200),
  continuationWindow: whole(
    'continuationWindow',
    'W',
    'Sessions after a profitable exit during which the pullback can arm',
    'sessions',
    5,
    250,
    [-20, -10, -5, 5, 10, 20]
  ),
  activationGain: percent(
    'activationGain',
    'G',
    'Appreciation of the post-entry high over the entry that activates the stop',
    0,
    300
  ),
  earlyStop: percent('earlyStop', 'E', 'Protective stop below the entry in the EARLY stage', 10, 300),
  alwaysRebound: percent(
    'alwaysRebound',
    'Ya',
    'Rebound from the trailing low that buys an always-armed setup',
    1,
    200
  ),
  swingLookback: whole(
    'swingLookback',
    'K',
    'Sessions in the rolling low of the swing path',
    'sessions',
    2,
    250,
    [-10, -5, -2, 2, 5, 10]
  ),
  swingRebound: percent('swingRebound', 'Ys', 'Rebound from the trailing low that buys a swing setup', 1, 200),
  swingProximity: percent(
    'swingProximity',
    'Z',
    'Closes within this fraction above the rolling low arm (0: at or below)',
    0,
    100
  )
};

export interface Family {
  key: string;
  name: string;
  architecture: Architecture;
  paramKeys: ParamKey[];
}

const exitKeys: ParamKey[] = ['trailingStopPercentage', 'maximumHoldDays', 'intradayLossBuffer'];
const deepKeys: ParamKey[] = ['targetPercentChange', 'trailingBuyPercentage', 'tickWindowSize'];

const policyKeys: Record<StopPolicy, ParamKey[]> = {
  net: [],
  netLatched: [],
  gross: ['activationGain'],
  breakeven: [],
  twoStage: ['earlyStop'],
  always: []
};

export const policyNames: Record<StopPolicy, string> = {
  net: 'stop active only while a fill at the stop nets a profit after interest (D1 as shipped)',
  netLatched: 'the D1 rule, latched once active (diagnostic)',
  gross: 'B-A: latched once the post-entry high reaches entry x (1 + G)',
  breakeven: 'B-B: latched once the stop level reaches the entry price',
  twoStage: 'B-C: protective stop at entry x (1 - E) until the stop level reaches the entry, then the trailing stop',
  always: 'B-D: trailing stop active from the session after the entry'
};

export const entryModeNames: Record<EntryMode, string> = {
  deep: 'deep correction (X below the rolling L-session high)',
  always: 'C1: always-armed trailing buy (no dip test)',
  swing: 'C2: swing trailing buy (a new K-session low, no decline-from-high test)',
  deepAlways: 'C3: D1 plus an always-armed path',
  deepSwing: 'C3: D1 plus a swing path'
};

// A family's key encodes its architecture: <entry>[+postExit][.<policy>].
export const familyKeyOf = (architecture: Architecture) => {
  const { entryMode, postExit, stopPolicy } = architecture;
  const entry = entryMode === 'deep' ? (postExit ? 'd1' : 'base') : postExit ? `${entryMode}PostExit` : entryMode;

  return stopPolicy === 'net' ? entry : `${entry}.${stopPolicy}`;
};

export const makeFamily = (architecture: Architecture): Family => {
  const { entryMode, postExit, stopPolicy } = architecture;
  const keys: ParamKey[] = [];

  if (hasDeepPath(entryMode)) {
    keys.push(...deepKeys);
  }

  keys.push(...exitKeys);

  if (postExit) {
    keys.push('pullback', 'continuationWindow');
  }

  if (hasAlwaysPath(entryMode)) {
    keys.push('alwaysRebound');
  }

  if (hasSwingPath(entryMode)) {
    keys.push('swingLookback', 'swingRebound', 'swingProximity');
  }

  keys.push(...policyKeys[stopPolicy]);

  const parts = [entryModeNames[entryMode]];

  if (postExit) {
    parts.push('post-exit continuation');
  }

  return {
    key: familyKeyOf(architecture),
    name: `${parts.join(' + ')}; ${policyNames[stopPolicy]}`,
    architecture,
    paramKeys: keys
  };
};

const architectures: Architecture[] = [];

for (const entryMode of ['deep'] as EntryMode[]) {
  for (const postExit of [false, true]) {
    for (const stopPolicy of ['net', 'netLatched', 'gross', 'breakeven', 'twoStage', 'always'] as StopPolicy[]) {
      architectures.push({ entryMode, postExit, stopPolicy });
    }
  }
}

for (const entryMode of ['always', 'swing'] as EntryMode[]) {
  for (const stopPolicy of ['net', 'netLatched', 'gross', 'breakeven', 'twoStage', 'always'] as StopPolicy[]) {
    architectures.push({ entryMode, postExit: false, stopPolicy });
  }
}

for (const entryMode of ['deepAlways', 'deepSwing'] as EntryMode[]) {
  architectures.push({ entryMode, postExit: true, stopPolicy: 'net' });
  architectures.push({ entryMode, postExit: false, stopPolicy: 'net' });
}

export const families: Record<string, Family> = Object.fromEntries(
  architectures.map((architecture) => {
    const family = makeFamily(architecture);

    return [family.key, family];
  })
);

export const familyOf = (key: string): Family => {
  const family = families[key];

  if (!family) {
    throw new Error(`Unknown family ${key}; families: ${Object.keys(families).join(', ')}`);
  }

  return family;
};

export type IntParams = Partial<Record<ParamKey, number>>;

// The shipped D1 phenotype (the constants of src/app/allIn-trailingBuy-postExitContinuation.ts), in integer units.
export const d1Values: Record<string, number> = {
  targetPercentChange: 216,
  trailingBuyPercentage: 3,
  trailingStopPercentage: 73,
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: 29,
  pullback: 90,
  continuationWindow: 60
};

// Set 2 is D1 without the continuation window (the same six values). Trades2 is the previous program's comparator.
export const trades2Values: Record<string, number> = {
  targetPercentChange: 200,
  trailingBuyPercentage: 5,
  trailingStopPercentage: 78,
  maximumHoldDays: 11,
  tickWindowSize: 104,
  intradayLossBuffer: 2
};

// Predeclared defaults for the new parameters when a family needs one and the caller gives none. They are the
// controls of the tracks' first counterfactuals, not optima.
export const newParamDefaults: Record<string, number> = {
  activationGain: 80, // 8%, the brief's illustration
  earlyStop: 100, // 10%
  alwaysRebound: 3, // D1's Y, the brief's control
  swingLookback: 20,
  swingRebound: 3,
  swingProximity: 0
};

export const d1Params = (family: Family, overrides: IntParams = {}): IntParams =>
  Object.fromEntries(
    family.paramKeys.map((key) => {
      const value = overrides[key] ?? d1Values[key] ?? newParamDefaults[key];

      if (value === undefined) {
        throw new Error(`${family.key}: no value for ${key}`);
      }

      return [key, value];
    })
  ) as IntParams;

export const trades2Params = (family: Family, overrides: IntParams = {}): IntParams =>
  Object.fromEntries(
    family.paramKeys.map((key) => [key, overrides[key] ?? trades2Values[key] ?? d1Values[key] ?? newParamDefaults[key]])
  ) as IntParams;

export const familySpecs = (family: Family) => family.paramKeys.map((key) => specs[key]);

export const gridSize = (spec: ParamSpec) => Math.floor((spec.max - spec.min) / spec.step) + 1;

// The engine's fractions: tenths / 1000 is the same double as the source literal (0.216 === 216 / 1000).
// `validate` false skips the grid bounds (synthetic parity scenarios use lookbacks below the families' grid).
export const toParams = (family: Family, params: IntParams, validate = true): Params => {
  const has = (key: ParamKey) => family.paramKeys.includes(key);
  const value = (key: ParamKey) => {
    const raw = params[key];

    if (raw === undefined || !Number.isFinite(raw)) {
      throw new Error(`${family.key} is missing ${key}`);
    }

    const spec = specs[key];

    if (!Number.isInteger(raw) || (validate && (raw < spec.min || raw > spec.max))) {
      throw new Error(`${family.key}: ${key}=${raw} is off the grid ${spec.min}..${spec.max}`);
    }

    return raw;
  };
  const fraction = (key: ParamKey) => (has(key) ? value(key) / 1000 : NaN);
  const integer = (key: ParamKey) => (has(key) ? value(key) : NaN);

  return {
    targetPercentChange: fraction('targetPercentChange'),
    trailingBuyPercentage: fraction('trailingBuyPercentage'),
    trailingStopPercentage: fraction('trailingStopPercentage'),
    maximumHoldDays: integer('maximumHoldDays'),
    tickWindowSize: integer('tickWindowSize'),
    intradayLossBuffer: fraction('intradayLossBuffer'),
    pullback: fraction('pullback'),
    continuationWindow: integer('continuationWindow'),
    activationGain: fraction('activationGain'),
    earlyStop: fraction('earlyStop'),
    alwaysRebound: fraction('alwaysRebound'),
    swingLookback: integer('swingLookback'),
    swingRebound: fraction('swingRebound'),
    swingProximity: fraction('swingProximity')
  };
};

export const canonicalKey = (family: Family, params: IntParams) =>
  family.paramKeys.map((key) => `${key}=${params[key]}`).join(',');

export const candidateId = (family: Family, params: IntParams) =>
  `${family.key}-${createHash('sha256')
    .update(`d1-refinement-v1|${family.key}|${canonicalKey(family, params)}`)
    .digest('hex')
    .slice(0, 10)}`;

export const formatValue = (key: ParamKey, value: number | undefined) => {
  if (value === undefined) {
    return 'N/A';
  }

  return specs[key].unit === 'tenths of a percentage point' ? `${(value / 10).toFixed(1)}%` : `${value}`;
};

export const describeParams = (family: Family, params: IntParams, keys: ParamKey[] = family.paramKeys) =>
  keys.map((key) => `${specs[key].short} ${formatValue(key, params[key])}`).join(' ');

// The parameters of a family that D1 doesn't have (the mechanism's own), for compact tables.
export const extraKeys = (family: Family) =>
  family.paramKeys.filter((key) => !(key in d1Values) || !families.d1!.paramKeys.includes(key));

export const parseParams = (text: string | undefined): IntParams => {
  const params: IntParams = {};

  for (const pair of (text ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');

    if (!(key! in specs)) {
      throw new Error(`Unknown parameter ${key}`);
    }

    params[key as ParamKey] = Number(value);
  }

  return params;
};
