// The searched space (PROTOCOL.md §4): 8 structural genes (switches and method selectors) and 50 numeric genes on
// declared grids, decoded into Strategy Lab's flat Growth 1.4.0 parameter set. A configuration is identified by the
// browser's own variation identity: the canonical JSON of its EFFECTIVE values (apps/strategy-lab/shared/params.ts),
// so two genomes that differ only in inactive genes are the same configuration and are evaluated once.
import { createHash } from 'node:crypto';
import { canonicalParams, effectiveParams, validateParams } from '../../apps/strategy-lab/shared/params.ts';
import { findStrategy } from '../../apps/strategy-lab/shared/strategies.ts';
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { costBps, radiusFraction, resolution, seedOf, strategyKey, strategyVersion } from './context.ts';

export type Value = number | boolean | string;
export type Config = Record<string, Value>; // flat Strategy Lab parameters (effective values only)

const spec = findStrategy(strategyKey, strategyVersion)!;

export const structuralGenes = [
  { key: 'entry', options: ['rise_from_recent_low', 'trend_breakout'] },
  { key: 'trend', options: ['off', 'price_change', 'regression_slope', 'rising_sma', 'higher_highs_lows', 'momentum'] },
  {
    key: 'elig',
    options: ['off', 'time_limited', 'minimum_strength', 'maximum_extension', 'deterioration', 'reset_renew']
  },
  { key: 'gate', options: ['off', 'on'] },
  { key: 'exits', options: ['hold_off', 'hold_on_buffer_off', 'hold_on_buffer_on'] },
  { key: 'istop', options: ['off', 'on'] },
  { key: 'retain', options: ['off', 'on'] },
  { key: 'cont', options: ['off', 'classic_d1', 'breakout', 'shallow_pullback', 'ma_cross'] }
] as const;

export type StructureKey = (typeof structuralGenes)[number]['key'];
export type Structure = Record<StructureKey, string>;

export interface NumGene {
  key: string; // the Strategy Lab parameter
  min: number;
  max: number;
  step: number;
  group: string;
  active: (s: Structure) => boolean;
}

const g = (key: string, min: number, max: number, step: number, group: string, active: NumGene['active']): NumGene => ({
  key,
  min,
  max,
  step,
  group,
  active
});
const rise = (s: Structure) => s.entry === 'rise_from_recent_low';
const trendIs = (m: string) => (s: Structure) => s.trend === m;
const eligIs = (m: string) => (s: Structure) => rise(s) && s.elig === m;
const contIs = (m: string) => (s: Structure) => s.cont === m;

// PROTOCOL.md §4.2: ranges and steps. `search` hints of the schema where it has them; otherwise the declared rules.
export const numericGenes: NumGene[] = [
  g('advanceFromRecentLowPercent', 1, 20, 0.5, 'rise', rise),
  g('recentLowLookbackBars', 10, 250, 10, 'rise', rise),
  g('trailingStopPercent', 3, 15, 0.5, 'exits', () => true),
  g('maximumHoldDays', 3, 30, 1, 'exits', (s) => s.exits !== 'hold_off'),
  g('intradayLossBufferPercent', 0, 6, 0.5, 'exits', (s) => s.exits === 'hold_on_buffer_on'),
  g('dipLookbackSessions', 10, 120, 10, 'gate', (s) => s.gate === 'on'),
  g('dipThresholdPercent', 2, 15, 0.5, 'gate', (s) => s.gate === 'on'),
  g('recoveryRetracementPercent', 30, 100, 10, 'gate', (s) => s.gate === 'on'),
  g('recoveryConfirmationSessions', 0, 10, 1, 'gate', (s) => s.gate === 'on'),
  g('breakoutSmaSessions', 10, 200, 10, 'breakout', (s) => !rise(s)),
  g('breakoutSlopeComparisonSessions', 5, 120, 5, 'breakout', (s) => !rise(s)),
  g('breakoutPriorHighSessions', 5, 120, 5, 'breakout', (s) => !rise(s)),
  g('initialStopAtrSessions', 5, 60, 5, 'istop', (s) => s.istop === 'on'),
  g('initialStopAtrMultiple', 1, 5, 0.5, 'istop', (s) => s.istop === 'on'),
  g('retentionSellPercent', 10, 90, 10, 'retain', (s) => s.retain === 'on'),
  g('retentionSmaSessions', 10, 200, 10, 'retain', (s) => s.retain === 'on'),
  g('retentionClosesBelow', 1, 5, 1, 'retain', (s) => s.retain === 'on'),
  g('eligibilityMaxAgeSessions', 1, 30, 1, 'elig', (s) => rise(s) && s.elig !== 'off'),
  g('eligibilityMinimumAdvancePercent', 0, 10, 0.5, 'elig', eligIs('minimum_strength')),
  g('eligibilityMaximumExtensionPercent', 0.5, 10, 0.5, 'elig', eligIs('maximum_extension')),
  g('eligibilityDeteriorationDropPercent', 0.5, 10, 0.5, 'elig', eligIs('deterioration')),
  g('eligibilityResetDropPercent', 1, 10, 0.5, 'elig', eligIs('reset_renew')),
  g('eligibilityRenewalReboundPercent', 0.5, 10, 0.5, 'elig', eligIs('reset_renew')),
  g('continuationWindowSessions', 10, 200, 10, 'cont', (s) => s.cont !== 'off'),
  g('trendChangeLookbackSessions', 5, 120, 5, 'trend', trendIs('price_change')),
  g('trendChangeMinimumReturnPercent', -5, 10, 0.5, 'trend', trendIs('price_change')),
  g('trendSlopeLookbackSessions', 5, 120, 5, 'trend', trendIs('regression_slope')),
  g('trendSlopeMinimumPercent', -5, 10, 0.5, 'trend', trendIs('regression_slope')),
  g('trendSmaSessions', 10, 200, 10, 'trend', trendIs('rising_sma')),
  g('trendSmaComparisonSessions', 1, 30, 1, 'trend', trendIs('rising_sma')),
  g('trendStructureLookbackSessions', 4, 120, 2, 'trend', trendIs('higher_highs_lows')),
  g('trendStructureMinimumIncreasePercent', 0, 5, 0.25, 'trend', trendIs('higher_highs_lows')),
  g('trendMomentumShortSessions', 2, 30, 1, 'trend', trendIs('momentum')),
  g('trendMomentumLongSessions', 20, 250, 10, 'trend', trendIs('momentum')),
  g('trendMomentumMinimumShortReturnPercent', -2, 10, 0.5, 'trend', trendIs('momentum')),
  g('trendMomentumMinimumLongReturnPercent', -15, 10, 0.5, 'trend', trendIs('momentum')),
  g('classicPullbackPercent', 3, 20, 0.5, 'cont', contIs('classic_d1')),
  g('classicReboundPercent', 0.2, 5, 0.2, 'cont', contIs('classic_d1')),
  g('breakoutBufferPercent', 0, 5, 0.25, 'cont', contIs('breakout')),
  g('breakoutFormationBars', 1, 20, 1, 'cont', contIs('breakout')),
  g('uptrendSmaBars', 10, 200, 10, 'cont', contIs('shallow_pullback')),
  g('uptrendSlopeBars', 1, 30, 1, 'cont', contIs('shallow_pullback')),
  g('uptrendMinimumRisePercent', 0, 5, 0.25, 'cont', contIs('shallow_pullback')),
  g('pullbackMinimumPercent', 0.5, 4, 0.5, 'cont', contIs('shallow_pullback')),
  g('pullbackMaximumPercent', 5, 15, 1, 'cont', contIs('shallow_pullback')),
  g('recoveryPercent', 0.25, 5, 0.25, 'cont', contIs('shallow_pullback')),
  g('crossSmaBars', 10, 200, 10, 'cont', contIs('ma_cross')),
  g('crossRisingBars', 1, 30, 1, 'cont', contIs('ma_cross')),
  g('crossMinimumSlopePercent', 0, 2, 0.1, 'cont', contIs('ma_cross')),
  g('crossMarginPercent', 0, 3, 0.25, 'cont', contIs('ma_cross'))
];

export const levelsOf = (gene: Pick<NumGene, 'min' | 'max' | 'step'>) =>
  Math.round((gene.max - gene.min) / gene.step) + 1;
export const radiusOf = (gene: NumGene) => Math.max(1, Math.round(radiusFraction * (levelsOf(gene) - 1)));
export const geneCount = structuralGenes.length + numericGenes.length; // 58
export const levelCounts = [...structuralGenes.map((s) => s.options.length), ...numericGenes.map(levelsOf)];

const clean = (x: number) => Number(x.toFixed(6));
export const valueAt = (gene: NumGene, index: number) => clean(gene.min + index * gene.step);

// ----- decoding -----

export type Genome = number[]; // one grid index per gene: structural first, then numeric (levelCounts)

export const structureOfGenome = (genome: Genome): Structure =>
  Object.fromEntries(structuralGenes.map((s, i) => [s.key, s.options[genome[i]!]!])) as Structure;

export const structureOf = (c: Config): Structure => {
  const rise = c.entryMethod !== 'trend_breakout';

  return {
    entry: rise ? 'rise_from_recent_low' : 'trend_breakout',
    trend: c.trendFilterEnabled === true ? String(c.trendMethod) : 'off',
    elig: rise && c.eligibilityEnabled === true ? String(c.eligibilityPolicy) : 'off',
    gate: c.drawdownRecoveryGateEnabled === true ? 'on' : 'off',
    exits:
      c.maximumHoldEnabled !== true
        ? 'hold_off'
        : c.intradayLossBufferEnabled === true
          ? 'hold_on_buffer_on'
          : 'hold_on_buffer_off',
    istop: c.initialStopEnabled === true ? 'on' : 'off',
    retain: c.retentionEnabled === true ? 'on' : 'off',
    cont: c.continuationEnabled === true ? String(c.continuationMethod) : 'off'
  };
};

// The switch and selector values of a structure, as Strategy Lab parameters.
const switchesOf = (s: Structure): Config => {
  const out: Config = {
    entryMethod: s.entry,
    trendFilterEnabled: s.trend !== 'off',
    drawdownRecoveryGateEnabled: s.gate === 'on',
    maximumHoldEnabled: s.exits !== 'hold_off',
    initialStopEnabled: s.istop === 'on',
    retentionEnabled: s.retain === 'on',
    continuationEnabled: s.cont !== 'off',
    costBpsPerSide: costBps
  };

  if (s.trend !== 'off') out.trendMethod = s.trend;
  if (s.entry === 'rise_from_recent_low') {
    out.eligibilityEnabled = s.elig !== 'off';
    if (s.elig !== 'off') out.eligibilityPolicy = s.elig;
  }
  if (s.exits !== 'hold_off') out.intradayLossBufferEnabled = s.exits === 'hold_on_buffer_on';
  if (s.cont !== 'off') out.continuationMethod = s.cont;

  return out;
};

// PROTOCOL.md §4.3 the two cross-parameter rules: momentum S < L (a long lookback at or below the short one is raised
// to S + 1, or S lowered to L − 1 at the top of the box); the pullback band holds by construction (disjoint boxes).
export const repair = (c: Config): Config => {
  if (c.trendFilterEnabled === true && c.trendMethod === 'momentum') {
    const s = c.trendMomentumShortSessions as number;
    const l = c.trendMomentumLongSessions as number;

    if (!(s < l)) {
      if (s + 1 <= 250) c.trendMomentumLongSessions = s + 1;
      else c.trendMomentumShortSessions = l - 1;
    }
  }

  return c;
};

// The effective configuration (only active keys, schema order), validated by the browser's own validator.
export const effectiveOf = (c: Config): Config => {
  const eff = effectiveParams(spec, c) as Config;
  const errors = validateParams(spec, eff);

  if (errors.length) throw new Error(`invalid Growth 1.4.0 configuration: ${errors.join('; ')} — ${JSON.stringify(c)}`);

  return eff;
};

export const configOfGenome = (genome: Genome): Config => {
  const s = structureOfGenome(genome);
  const c = switchesOf(s);

  numericGenes.forEach((gene, i) => {
    if (gene.active(s)) c[gene.key] = valueAt(gene, genome[structuralGenes.length + i]!);
  });

  return effectiveOf(repair(c));
};

// The identity: sha256 of the canonical effective parameters and the resolution (16 hex characters).
export const canonicalOf = (c: Config) => `${canonicalParams(effectiveOf(c) as Record<string, never>)}|${resolution}`;
export const configId = (c: Config) => createHash('sha256').update(canonicalOf(c)).digest('hex').slice(0, 16);

// The genome of a configuration (inactive genes at their middle level). Used for refinement endpoints only.
export const genomeOf = (c: Config): Genome => {
  const s = structureOf(c);

  return [
    ...structuralGenes.map((sg) => sg.options.indexOf(s[sg.key] as never)),
    ...numericGenes.map((gene) => {
      if (!gene.active(s)) return Math.floor((levelsOf(gene) - 1) / 2);
      const v = c[gene.key] as number;

      return Math.min(levelsOf(gene) - 1, Math.max(0, Math.round((v - gene.min) / gene.step)));
    })
  ];
};

export const activeGenes = (s: Structure) => numericGenes.filter((gene) => gene.active(s));
export const structureKey = (s: Structure) => structuralGenes.map((sg) => s[sg.key]).join('/');

// Normalized L∞ distance: 1 between different structures; otherwise the largest |Δ| ÷ (max − min) over active genes.
export const configDistance = (a: Config, b: Config) => {
  const sa = structureOf(a);
  const sb = structureOf(b);

  if (structureKey(sa) !== structureKey(sb)) return 1;

  let d = 0;

  for (const gene of activeGenes(sa))
    d = Math.max(d, Math.abs((a[gene.key] as number) - (b[gene.key] as number)) / (gene.max - gene.min));

  return d;
};

// ----- the screen: Latin supercube sampling of scrambled Sobol blocks (PROTOCOL.md §6.2) -----

// The project's Sobol generator has 16 dimensions; the 58 genes are split into four blocks of ≤ 16 consecutive genes,
// each its own scrambled Sobol sequence, and the points of blocks 2–4 are randomly permuted (Owen's Latin supercube).
export const screenBlocks = [16, 16, 16, 10];

export const screenGenomes = (n: number, ...labels: (string | number)[]): Genome[] => {
  const blocks: number[][][] = [];
  let offset = 0;

  screenBlocks.forEach((dims, b) => {
    const sobol = new Sobol({ dimensions: dims, scramble: { seed: seedOf(...labels, 'block', b) } });
    const points = Array.from({ length: n }, () => sobol.next());

    if (b > 0) {
      const rng = Rng.from(...seedOf(...labels, 'permute', b));

      for (let i = n - 1; i > 0; i--) {
        const j = rng.int(i + 1);

        [points[i], points[j]] = [points[j]!, points[i]!];
      }
    }

    blocks.push(points);
    offset += dims;
  });

  if (offset !== geneCount) throw new Error('screen blocks do not cover the genome');

  return Array.from({ length: n }, (_v, i) => {
    const u = blocks.flatMap((block) => block[i]!);

    return u.map((x, gene) => Math.min(levelCounts[gene]! - 1, Math.floor(x * levelCounts[gene]!)));
  });
};

// ----- neighbourhoods (PROTOCOL.md §4.4) -----

export type Mode = 'clip' | 'inbox';

export interface Family {
  name: string;
  n: number;
  labels: (string | number)[];
  mode?: Mode;
  scale?: number;
}

const unitCache = new Map<string, number[][]>();

// Latin-hypercube units over all 50 numeric genes for one seed family: every centre evaluated under the same labels
// shares these offsets (common random numbers); a centre uses the columns of its active genes.
export const unitsOf = (n: number, labels: (string | number)[]) => {
  const key = `${n}|${labels.join('|')}`;
  let units = unitCache.get(key);

  if (!units) {
    units = latinOffsets(n, numericGenes.length, new Rng(seedOf('nbhd', ...labels)));
    unitCache.set(key, units);
    if (unitCache.size > 256) unitCache.delete(unitCache.keys().next().value!);
  }

  return units;
};

export interface NeighbourPoint {
  config: Config;
  id: string;
  clipped: number; // coordinates that hit a bound
}

// The perturbed value of one gene: centre + k steps, k = round(u × scale × r) ('clip', clipped to the box), or u mapped
// onto the in-box part of [−r, r] ('inbox'). The box is widened to include the centre (a control may sit off-grid).
const perturbed = (gene: NumGene, centre: number, u: number, mode: Mode, scale: number) => {
  const r = radiusOf(gene) * scale;
  const lo = Math.min(gene.min, centre);
  const hi = Math.max(gene.max, centre);

  if (mode === 'inbox') {
    const down = Math.min(r, Math.floor((centre - lo) / gene.step + 1e-9));
    const up = Math.min(r, Math.floor((hi - centre) / gene.step + 1e-9));
    const k = u < 0 ? Math.round(u * down) : Math.round(u * up);

    return { value: clean(centre + k * gene.step), clipped: false };
  }

  const value = clean(centre + Math.round(u * r) * gene.step);

  if (value < lo) return { value: clean(lo), clipped: true };
  if (value > hi) return { value: clean(hi), clipped: true };
  return { value, clipped: false };
};

// The unique neighbours of a centre under one family: duplicates of the centre or of an earlier point are dropped.
export const neighbourhood = (centre: Config, family: Family): NeighbourPoint[] => {
  const s = structureOf(centre);
  const active = numericGenes.map((gene, i) => [gene, i] as const).filter(([gene]) => gene.active(s));
  const units = unitsOf(family.n, family.labels);
  const seen = new Set<string>([configId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const unit of units) {
    const c: Config = { ...centre };
    let clipped = 0;

    for (const [gene, column] of active) {
      const p = perturbed(gene, centre[gene.key] as number, unit[column]!, family.mode ?? 'clip', family.scale ?? 1);

      c[gene.key] = p.value;
      if (p.clipped) clipped++;
    }

    const config = effectiveOf(repair(c));
    const id = configId(config);

    if (seen.has(id)) continue;

    seen.add(id);
    out.push({ config, id, clipped });
  }

  return out;
};

// Whether any active coordinate lies within its radius of a bound (Q2b, the in-box pair, applies then).
export const nearBound = (c: Config) =>
  activeGenes(structureOf(c)).some((gene) => {
    const v = c[gene.key] as number;
    const r = radiusOf(gene) * gene.step;

    return v - gene.min < r - 1e-9 || gene.max - v < r - 1e-9;
  });

// ----- the fixed control #4 (PROTOCOL.md §8: a comparator only; never a seed, range or refinement start) -----

export const control4: Config = effectiveOf({
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 90,
  trendFilterEnabled: true,
  trendMethod: 'price_change',
  trendChangeLookbackSessions: 30,
  trendChangeMinimumReturnPercent: -2,
  eligibilityEnabled: true,
  eligibilityPolicy: 'time_limited',
  eligibilityMaxAgeSessions: 20,
  drawdownRecoveryGateEnabled: true,
  dipLookbackSessions: 60,
  dipThresholdPercent: 10,
  recoveryRetracementPercent: 45,
  recoveryConfirmationSessions: 2,
  trailingStopPercent: 6,
  maximumHoldEnabled: true,
  maximumHoldDays: 21,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2.9,
  initialStopEnabled: true,
  initialStopAtrSessions: 20,
  initialStopAtrMultiple: 1.5,
  retentionEnabled: false,
  continuationEnabled: true,
  continuationMethod: 'shallow_pullback',
  continuationWindowSessions: 60,
  uptrendSmaBars: 50,
  uptrendSlopeBars: 10,
  uptrendMinimumRisePercent: 0,
  pullbackMinimumPercent: 1.5,
  pullbackMaximumPercent: 8,
  recoveryPercent: 1,
  costBpsPerSide: 5
});

// The engine defaults (rise-from-recent-low-trading 1.4.0, every option OFF): the pilot's stand-in control.
export const growthDefaults: Config = effectiveOf({
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 20,
  trendFilterEnabled: false,
  eligibilityEnabled: false,
  drawdownRecoveryGateEnabled: false,
  trailingStopPercent: 7.3,
  maximumHoldEnabled: true,
  maximumHoldDays: 8,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2.9,
  initialStopEnabled: false,
  retentionEnabled: false,
  continuationEnabled: false,
  costBpsPerSide: 5
});

export const withCost = (c: Config, bps: number): Config => ({ ...c, costBpsPerSide: bps });

export const describe = (c: Config) =>
  Object.entries(effectiveOf(c))
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
