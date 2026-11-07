// The conditional Growth 1.4.0 genome (PROTOCOL.md §4) and Study 8's grid machinery on it.
//
// A genome is 58 integers: 8 structural genes (entry method, trend filter, eligibility, drawdown gate, hold mode,
// initial stop, retention, continuation) and 50 numeric genes (an index on each parameter's grid). A numeric gene is
// ACTIVE only when its structure uses it; inactive genes are latent (they ride along in the GA and are ignored by the
// engine). A configuration IS its effective Growth 1.4.0 parameters (the registry's identity rule, shared/params.ts):
// two genomes with the same effective parameters are the same configuration, evaluated once.
//
// Distances (Study 8's normalized L∞): 1 between different structures; within a structure, the largest
// |Δ index| ÷ (levels − 1) over the active numeric genes. Neighbourhoods (Study 8's Latin-hypercube "clip" and "inbox"
// designs) perturb only the active numeric genes; the structure is the phenotype and stays fixed.
import { createHash } from 'node:crypto';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { RISE_FROM_RECENT_LOW_TRADING } from '../../apps/strategy-lab/shared/strategies.ts';
import { canonicalParams, effectiveParams, validateParams } from '../../apps/strategy-lab/shared/params.ts';
import type { ParamValue } from '../../apps/strategy-lab/shared/contract.ts';
import {
  type NumKey,
  type StructKey,
  axisOf,
  control4,
  levelsOf,
  numAxes,
  numKeys,
  resolution,
  seedOf,
  sobolNumeric,
  structAxes,
  structKeys
} from './context.ts';

export type Genome = number[]; // [8 structural level indexes, 50 numeric grid indexes]
export type Effective = Record<string, ParamValue>;

export const spec = RISE_FROM_RECENT_LOW_TRADING;
export const S = structKeys.length; // 8
export const D = numKeys.length; // 50
export const structIndex = Object.fromEntries(structKeys.map((k, i) => [k, i])) as Record<StructKey, number>;
export const numIndex = Object.fromEntries(numKeys.map((k, i) => [k, S + i])) as Record<NumKey, number>;
export const numLevels = numAxes.map(levelsOf);
export const levelsOfGene = (i: number) => (i < S ? structAxes[i]!.levels.length : numLevels[i - S]!);

export const level = (g: Genome, key: StructKey) => structAxes[structIndex[key]]!.levels[g[structIndex[key]]!]!;

// The structure a genome executes (eligibility is not applicable with the breakout entry).
export interface Structure {
  entry: string;
  trend: string;
  eligibility: string;
  gate: string;
  hold: string;
  initialStop: string;
  retention: string;
  continuation: string;
}

export const structureOf = (g: Genome): Structure => {
  const entry = level(g, 'entry');

  return {
    entry,
    trend: level(g, 'trend'),
    eligibility: entry === 'rise_from_recent_low' ? level(g, 'eligibility') : 'n/a',
    gate: level(g, 'gate'),
    hold: level(g, 'hold'),
    initialStop: level(g, 'initialStop'),
    retention: level(g, 'retention'),
    continuation: level(g, 'continuation')
  };
};

export const structureKey = (s: Structure) =>
  [s.entry, s.trend, s.eligibility, s.gate, s.hold, s.initialStop, s.retention, s.continuation].join('/');

const TREND_KEYS: Record<string, NumKey[]> = {
  off: [],
  price_change: ['trendChangeLookbackSessions', 'trendChangeMinimumReturnPercent'],
  regression_slope: ['trendSlopeLookbackSessions', 'trendSlopeMinimumPercent'],
  rising_sma: ['trendSmaSessions', 'trendSmaComparisonSessions'],
  higher_highs_lows: ['trendStructureLookbackSessions', 'trendStructureMinimumIncreasePercent'],
  momentum: [
    'trendMomentumShortSessions',
    'trendMomentumLongSessions',
    'trendMomentumMinimumShortReturnPercent',
    'trendMomentumMinimumLongReturnPercent'
  ]
};
const ELIGIBILITY_KEYS: Record<string, NumKey[]> = {
  off: [],
  'n/a': [],
  time_limited: ['eligibilityMaxAgeSessions'],
  minimum_strength: ['eligibilityMaxAgeSessions', 'eligibilityMinimumAdvancePercent'],
  maximum_extension: ['eligibilityMaxAgeSessions', 'eligibilityMaximumExtensionPercent'],
  deterioration: ['eligibilityMaxAgeSessions', 'eligibilityDeteriorationDropPercent'],
  reset_renew: ['eligibilityMaxAgeSessions', 'eligibilityResetDropPercent', 'eligibilityRenewalReboundPercent']
};
const CONTINUATION_KEYS: Record<string, NumKey[]> = {
  off: [],
  classic_d1: ['continuationWindowSessions', 'classicPullbackPercent', 'classicReboundPercent'],
  breakout: ['continuationWindowSessions', 'breakoutBufferPercent', 'breakoutFormationBars'],
  shallow_pullback: [
    'continuationWindowSessions',
    'uptrendSmaBars',
    'uptrendSlopeBars',
    'uptrendMinimumRisePercent',
    'pullbackMinimumPercent',
    'pullbackBandPercent',
    'recoveryPercent'
  ],
  ma_cross: [
    'continuationWindowSessions',
    'crossSmaBars',
    'crossRisingBars',
    'crossMinimumSlopePercent',
    'crossMarginPercent'
  ]
};

// The active numeric genes of a structure, in gene order.
export const activeKeys = (s: Structure): NumKey[] => {
  const keys = new Set<NumKey>([
    ...(s.entry === 'rise_from_recent_low'
      ? (['advanceFromRecentLowPercent', 'recentLowLookbackBars'] as NumKey[])
      : (['breakoutSmaSessions', 'breakoutSlopeComparisonSessions', 'breakoutPriorHighSessions'] as NumKey[])),
    ...TREND_KEYS[s.trend]!,
    ...ELIGIBILITY_KEYS[s.eligibility]!,
    ...(s.gate === 'on'
      ? ([
          'dipLookbackSessions',
          'dipThresholdPercent',
          'recoveryRetracementPercent',
          'recoveryConfirmationSessions'
        ] as NumKey[])
      : []),
    'trailingStopPercent',
    ...(s.hold !== 'off' ? (['maximumHoldDays'] as NumKey[]) : []),
    ...(s.hold === 'hold+buffer' ? (['intradayLossBufferPercent'] as NumKey[]) : []),
    ...(s.initialStop === 'on' ? (['initialStopAtrSessions', 'initialStopAtrMultiple'] as NumKey[]) : []),
    ...(s.retention === 'on'
      ? (['retentionSellPercent', 'retentionSmaSessions', 'retentionClosesBelow'] as NumKey[])
      : []),
    ...CONTINUATION_KEYS[s.continuation]!
  ]);

  return numKeys.filter((k) => keys.has(k));
};

export const activeOf = (g: Genome) => activeKeys(structureOf(g));

// A numeric gene's value: grid min + index × step (the control's off-grid values use a fractional index).
export const valueAt = (key: NumKey, index: number) => {
  const a = axisOf[key];

  return Number((a.min + index * a.step).toFixed(6));
};
export const gene = (g: Genome, key: NumKey) => valueAt(key, g[numIndex[key]]!);

// The Growth 1.4.0 registry values a genome stands for (switches and active inputs only), at 5 bps on 1d bars.
export const registryValuesOf = (g: Genome): Effective => {
  const s = structureOf(g);
  const v: Effective = { entryMethod: s.entry };
  const put = (key: NumKey) => {
    v[key] = gene(g, key);
  };

  for (const key of activeKeys(s)) if (key !== 'pullbackBandPercent') put(key);

  v.trendFilterEnabled = s.trend !== 'off';
  if (s.trend !== 'off') v.trendMethod = s.trend;
  if (s.entry === 'rise_from_recent_low') {
    v.eligibilityEnabled = s.eligibility !== 'off';
    if (s.eligibility !== 'off') v.eligibilityPolicy = s.eligibility;
  }
  v.drawdownRecoveryGateEnabled = s.gate === 'on';
  v.maximumHoldEnabled = s.hold !== 'off';
  if (s.hold !== 'off') v.intradayLossBufferEnabled = s.hold === 'hold+buffer';
  v.initialStopEnabled = s.initialStop === 'on';
  v.retentionEnabled = s.retention === 'on';
  v.continuationEnabled = s.continuation !== 'off';
  if (s.continuation !== 'off') v.continuationMethod = s.continuation;
  if (s.continuation === 'shallow_pullback')
    v.pullbackMaximumPercent = Number((gene(g, 'pullbackMinimumPercent') + gene(g, 'pullbackBandPercent')).toFixed(6));
  v.costBpsPerSide = 5;

  return v;
};

// The effective configuration (the registry's rule) — what the engine executes and what identifies a configuration.
export const effectiveOf = (g: Genome): Effective => {
  const values = registryValuesOf(g);
  const effective = effectiveParams(spec, values);
  const errors = validateParams(spec, effective);

  if (errors.length)
    throw new Error(`genome ${g.join(',')} is not a valid Growth 1.4.0 configuration: ${errors.join('; ')}`);

  return effective;
};

export const effectiveKey = (effective: Effective) => `${canonicalParams(effective)}|${resolution}`;
export const idOfEffective = (effective: Effective) =>
  `g${createHash('sha256').update(effectiveKey(effective)).digest('hex').slice(0, 12)}`;
export const configId = (g: Genome) => idOfEffective(effectiveOf(g));

// ----- the control #4 as a genome (fractional index where its value is off the grid) -----

export const genomeOfRegistry = (values: Record<string, unknown>): Genome => {
  const g: Genome = new Array(S + D).fill(0);
  const setLevel = (key: StructKey, value: string) => {
    const index = structAxes[structIndex[key]]!.levels.indexOf(value);

    if (index < 0) throw new Error(`${key}: level ${value} is not in the box`);
    g[structIndex[key]] = index;
  };
  const on = (k: string) => values[k] === true;

  setLevel('entry', String(values.entryMethod));
  setLevel('trend', on('trendFilterEnabled') ? String(values.trendMethod) : 'off');
  setLevel('eligibility', on('eligibilityEnabled') ? String(values.eligibilityPolicy) : 'off');
  setLevel('gate', on('drawdownRecoveryGateEnabled') ? 'on' : 'off');
  setLevel('hold', on('maximumHoldEnabled') ? (on('intradayLossBufferEnabled') ? 'hold+buffer' : 'hold') : 'off');
  setLevel('initialStop', on('initialStopEnabled') ? 'on' : 'off');
  setLevel('retention', on('retentionEnabled') ? 'on' : 'off');
  setLevel('continuation', on('continuationEnabled') ? String(values.continuationMethod) : 'off');

  const s = structureOf(g);

  for (const key of activeKeys(s)) {
    const a = axisOf[key];
    const value =
      key === 'pullbackBandPercent'
        ? Number(values.pullbackMaximumPercent) - Number(values.pullbackMinimumPercent)
        : Number(values[key]);
    const index = Number(((value - a.min) / a.step).toFixed(6));

    if (!Number.isFinite(index) || index < 0 || index > levelsOf(a) - 1)
      throw new Error(`${key} = ${value} is outside the box`);
    g[numIndex[key]] = index;
  }

  return g;
};

export const control4Genome = () => genomeOfRegistry(control4);
export const control4Effective = () => effectiveParams(spec, { ...control4 });

// ----- distance -----

export const distance = (a: Genome, b: Genome) => {
  const sa = structureOf(a);

  if (structureKey(sa) !== structureKey(structureOf(b))) return 1;

  let max = 0;

  for (const key of activeKeys(sa)) {
    const i = numIndex[key];

    max = Math.max(max, Math.abs(a[i]! - b[i]!) / (numLevels[i - S]! - 1));
  }

  return max;
};

// ----- human-readable description -----

const n = (x: unknown) => String(x);

export const describe = (e: Effective) => {
  const parts: string[] = [];

  parts.push(
    e.entryMethod === 'trend_breakout'
      ? `Breakout sma${n(e.breakoutSmaSessions)}/k${n(e.breakoutSlopeComparisonSessions)}/hi${n(e.breakoutPriorHighSessions)}`
      : `Rise X${n(e.advanceFromRecentLowPercent)} N${n(e.recentLowLookbackBars)}`
  );
  if (e.trendFilterEnabled) {
    const m = String(e.trendMethod);
    const t = (TREND_KEYS[m] ?? []).map((k) => n(e[k])).join('/');

    parts.push(`trend ${m} ${t}`);
  }
  if (e.eligibilityEnabled)
    parts.push(
      `elig ${n(e.eligibilityPolicy)} ${(ELIGIBILITY_KEYS[String(e.eligibilityPolicy)] ?? []).map((k) => n(e[k])).join('/')}`
    );
  if (e.drawdownRecoveryGateEnabled)
    parts.push(
      `gate ${n(e.dipLookbackSessions)}/${n(e.dipThresholdPercent)}%/${n(e.recoveryRetracementPercent)}%/${n(e.recoveryConfirmationSessions)}`
    );
  parts.push(`stop ${n(e.trailingStopPercent)}%`);
  if (e.maximumHoldEnabled)
    parts.push(
      `hold ${n(e.maximumHoldDays)}d${e.intradayLossBufferEnabled ? ` buf ${n(e.intradayLossBufferPercent)}%` : ''}`
    );
  else parts.push('hold off');
  if (e.initialStopEnabled) parts.push(`istop ${n(e.initialStopAtrSessions)}×${n(e.initialStopAtrMultiple)}`);
  if (e.retentionEnabled)
    parts.push(`retain ${n(e.retentionSellPercent)}%/sma${n(e.retentionSmaSessions)}/${n(e.retentionClosesBelow)}`);
  if (e.continuationEnabled) {
    const m = String(e.continuationMethod);
    const keys: string[] = [
      ...(CONTINUATION_KEYS[m] ?? []).filter((k) => k !== 'continuationWindowSessions' && k !== 'pullbackBandPercent'),
      ...(m === 'shallow_pullback' ? ['pullbackMaximumPercent'] : [])
    ];

    parts.push(`cont ${m} W${n(e.continuationWindowSessions)} ${keys.map((k) => n(e[k])).join('/')}`);
  }

  return parts.join(' | ');
};

// ----- the screen (Sobol + joint LHS) and the GA's filler -----

const unitIndex = (u: number, levels: number) => Math.min(levels - 1, Math.floor(u * levels));

export const screenGenomes = (samples: number, labels: (string | number)[]) => {
  const sobol = new Sobol({ dimensions: 16, scramble: { seed: deriveSeed(...seedOf(...labels, 'sobol')) } });
  const others = numKeys.filter((k) => !sobolNumeric.includes(k));
  const lhs = latinOffsets(samples, others.length, new Rng(deriveSeed(...seedOf(...labels, 'lhs'))));
  const genomes: Genome[] = [];

  for (let i = 0; i < samples; i++) {
    const p = sobol.next();
    const g: Genome = new Array(S + D).fill(0);

    structAxes.forEach((a, d) => {
      g[d] = unitIndex(p[d]!, a.levels.length);
    });
    sobolNumeric.forEach((key, d) => {
      g[numIndex[key]] = unitIndex(p[S + d]!, numLevels[numIndex[key] - S]!);
    });
    others.forEach((key, d) => {
      g[numIndex[key]] = unitIndex((lhs[i]![d]! + 1) / 2, numLevels[numIndex[key] - S]!);
    });
    genomes.push(g);
  }

  return genomes;
};

// A joint Latin hypercube over every gene (the GA's short-population filler).
export const lhsGenomes = (samples: number, labels: (string | number)[]) =>
  latinOffsets(samples, S + D, new Rng(deriveSeed(...seedOf(...labels)))).map((unit) =>
    unit.map((u, d) => unitIndex((u + 1) / 2, d < S ? structAxes[d]!.levels.length : numLevels[d - S]!))
  );

// The repository's NSGA-II operators work on the numeric grid indices through a ParameterSpace (min 0, step 1).
export const numericSpace: ParameterSpace = {
  name: 'growth-vgt-study8-numeric-50',
  specs: numAxes.map((a, i) => ({
    key: a.key as never,
    label: a.key,
    unit: 'sessions' as const,
    min: 0,
    max: numLevels[i]! - 1,
    step: 1,
    neighborhoodRadius: a.radius,
    rationale: a.rationale
  }))
};

// ----- neighbourhood designs (Study 6/8 clip and inbox) -----

export type Mode = 'clip' | 'inbox';

export interface Family {
  name: string; // e.g. 'r1', 'select1', 'confirm2'
  n: number;
  labels: (string | number)[];
  mode?: Mode;
  scale?: number;
}

export interface DesignPoint {
  index: number;
  genome: Genome;
  clipped: { key: NumKey; bound: 'min' | 'max' }[];
}

const coordinate = (centre: number, u: number, key: NumKey, mode: Mode, scale: number) => {
  const a = axisOf[key];
  const max = levelsOf(a) - 1;
  const reach = Math.round(scale * a.radius);

  if (mode === 'clip') {
    const raw = centre + Math.round(u * scale * a.radius);

    return {
      value: Math.min(max, Math.max(0, raw)),
      clipped: raw > max ? ('max' as const) : raw < 0 ? ('min' as const) : undefined
    };
  }

  const lo = Math.max(0, centre - reach);
  const hi = Math.min(max, centre + reach);

  return { value: lo + Math.round(((u + 1) / 2) * (hi - lo)), clipped: undefined };
};

// The family's design: offsets depend only on the labels (common random numbers across centres); one column per
// numeric gene, applied to the centre's active genes only.
export const design = (centre: Genome, family: Family): DesignPoint[] => {
  const active = activeOf(centre);

  return latinOffsets(family.n, D, new Rng(deriveSeed(...seedOf(...family.labels)))).map((unit, index) => {
    const genome = [...centre];
    const clipped: DesignPoint['clipped'] = [];

    for (const key of active) {
      const i = numIndex[key];
      const c = coordinate(centre[i]!, unit[i - S]!, key, family.mode ?? 'clip', family.scale ?? 1);

      genome[i] = c.value;
      if (c.clipped) clipped.push({ key, bound: c.clipped });
    }

    return { index, genome, clipped };
  });
};

// Points whose effective configuration equals the centre's or an earlier point's are dropped (S8/designs.ts:88-105).
export const uniquePoints = (points: readonly DesignPoint[], centre: Genome) => {
  const seen = new Set<string>([configId(centre)]);

  return points.filter((point) => {
    const id = configId(point.genome);

    if (seen.has(id)) return false;

    seen.add(id);
    return true;
  });
};

// Active coordinates within r of a bound (they trigger the in-box pair Q2b / T2b).
export const nearBound = (g: Genome) =>
  activeOf(g).filter((key) => {
    const i = numIndex[key];

    return g[i]! < axisOf[key].radius || numLevels[i - S]! - 1 - g[i]! < axisOf[key].radius;
  });

export const isIntegral = (g: Genome) => g.every((x) => Number.isInteger(x));
