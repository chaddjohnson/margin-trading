// gpu-backend: the capability set an optimization DOMAIN can reach (standard 3.0.0 §9.4: a preflight checks the
// whole reachable search space, not the starting seeds or the first batch). The features are derived by ENCODING
// every structural combination of the genome (with the encoder the GPU path uses) under every option set the
// optimizer's stages use — never declared by hand — so a feature the search could generate but the GPU lacks is found
// before any expensive work. The domain of the deferred risk-envelope pilot is Assignment 3's plus the risk inputs.
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { configOfGenome, levelCounts, structuralGenes } from '../growth140-vgt-s8m/space.ts';
import { type Family, families } from '../vg-l0-full-joint/space.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import { stresses } from '../vg-l0-full-joint/qualify.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';
import { encodeD1, encodeGrowth, stagedFeaturesOf } from './encode.ts';
import type { StagedConfig } from '../staged-stop/config.ts';
import { FEATURE, featureNames } from './layout.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';

export interface DomainFeatures {
  name: string;
  features: bigint;
  growthStructures: number;
  d1Structures: number;
  optionSets: string[];
}

const window = { from: '2016-01-04', to: '2024-12-31' } as unknown as Door;

// every Growth 1.4.0 structure of the 8 structural genes (numeric genes at their middle level)
export const growthStructureFeatures = () => {
  let f = 0n;
  let n = 0;
  const nS = structuralGenes.length;
  const rec = (i: number, g: number[]) => {
    if (i === nS) {
      const genome = [...g, ...levelCounts.slice(nS).map((l) => Math.floor((l - 1) / 2))];
      let c;

      try {
        c = configOfGenome(genome);
      } catch {
        return; // an invalid structure is not reachable (the search's own decoder refuses it)
      }
      const quad = { g: { VGT: c, GDX: c } } as unknown as Quad;

      for (const o of [
        vOptions,
        { ...vOptions, friction: { stopFill: 'next-open' as const } },
        { ...vOptions, friction: { stopSlippageBps: 25 } }
      ])
        f |= encodeGrowth(window, quad, 'G:VGT', o).features;
      n++;
      return;
    }
    for (let v = 0; v < structuralGenes[i]!.options.length; v++) rec(i + 1, [...g, v]);
  };

  rec(0, []);
  return { features: f, structures: n };
};

// every D1 book structure of Assignment 3: families A–D × decline gate × activation, both symbols
const controlsOf = (fam: Family, gate: boolean, entryDay: boolean): RiskConfig2['books']['D1:VGT'] =>
  ({
    protectiveStop:
      fam === 'A'
        ? { mode: 'off' }
        : { mode: 'on', stopDistanceTenths: 80, activation: entryDay ? 'entry-day' : 'next-session' },
    hold:
      fam === 'C'
        ? { mode: 'disabled' }
        : fam === 'D'
          ? { mode: 'adaptive', extendedHoldDays: 30, progressTenths: 40 }
          : { mode: 'legacy' },
    declineGate: gate ? { mode: 'on', losses: 2, recoveryTenths: 500, maxBlockSessions: 60 } : { mode: 'off' }
  }) as never;

export const d1StructureFeatures = (grid: Quad['d1']['VGT']) => {
  let f = 0n;
  let n = 0;

  for (const fam of families)
    for (const gate of [false, true])
      for (const entryDay of fam === 'A' ? [false] : [false, true]) {
        const controls = {
          books: { 'D1:GDX': controlsOf(fam, gate, entryDay), 'D1:VGT': controlsOf(fam, gate, entryDay) }
        } as unknown as RiskConfig2;
        const quad = { d1: { GDX: grid, VGT: grid } } as unknown as Quad;

        for (const o of [
          vOptions,
          { ...vOptions, d1Arm: 'native' as const },
          { ...vOptions, friction: { stopFill: 'next-open' as const, stopSlippageBps: 25 } }
        ])
          for (const b of ['D1:GDX', 'D1:VGT'] as const)
            f |= encodeD1({ ...window, dates: [] } as unknown as Door, quad, controls, b, o).features;
        n++;
      }
  return { features: f, structures: n };
};

// the pool options the optimizer's stages use: the V structure, removal reruns, stresses, fold/validation boundaries,
// detailed records; plus the stress and report options of standard §2.6 / §5.1 (blackouts, whole shares, funding start,
// explicit tie order)
const POOL_OPTIONS =
  FEATURE.POOL |
  FEATURE.POOL_ENABLED |
  FEATURE.POOL_PERIODS |
  FEATURE.POOL_DETAIL |
  FEATURE.POOL_BLACKOUTS |
  FEATURE.POOL_WHOLE_SHARES |
  FEATURE.POOL_FUND_FROM |
  FEATURE.POOL_TIE_ORDER;

export const assignment3Domain = (grid: Quad['d1']['VGT']): DomainFeatures => {
  const g = growthStructureFeatures();
  const d = d1StructureFeatures(grid);

  return {
    name: 'assignment-3 (src/vg-l0-full-joint): D1·GDX + D1·VGT with RC 2 families A–D × gate × activation, Growth·VGT 1.4.0 (8 + 50 genes), L0 pool',
    features: g.features | d.features | POOL_OPTIONS,
    growthStructures: g.structures,
    d1Structures: d.structures,
    optionSets: [
      'V structure (Growth·GDX disabled)',
      ...Object.keys(stresses).map((s) => `stress: ${s}`),
      'removal reruns',
      'fold/validation boundaries',
      'detailed record',
      'blackouts',
      'whole shares',
      'funding start',
      'tie order'
    ]
  };
};

// the deferred risk-envelope pilot (NL0-R 0.1.0): Assignment 3's domain plus the risk-envelope inputs
export const riskEnvelopePilotDomain = (grid: Quad['d1']['VGT']): DomainFeatures => {
  const a = assignment3Domain(grid);

  return {
    ...a,
    name: `risk-envelope pilot (NL0-R 0.1.0): ${a.name} + risk-envelope inputs`,
    features: a.features | FEATURE.RISK_METRICS,
    optionSets: [...a.optionSets, 'risk-envelope inputs']
  };
};

// Priority 4 (research/vg-l0-staged-stop/): the risk-envelope domain plus the S1 staged trailing stop on D1·GDX, D1·VGT
// and Growth·VGT, each independently ON or OFF (GPU Phase 8, protocol v3). The bits come from the encoder's own
// stagedFeaturesOf over every ON/OFF combination of the three books.
export const stagedStopDomain = (grid: Quad['d1']['VGT']): DomainFeatures => {
  const a = riskEnvelopePilotDomain(grid);
  let f = 0n;

  for (let m = 0; m < 8; m++) {
    const books: StagedConfig['books'] = {};

    if (m & 1) books['D1:GDX'] = { activationTenths: 100, stage2Tenths: 30 };
    if (m & 2) books['D1:VGT'] = { activationTenths: 100, stage2Tenths: 30 };
    if (m & 4) books['G:VGT'] = { activationTenths: 100, stage2Tenths: 30 };
    f |= stagedFeaturesOf({ version: 1, books });
  }

  return {
    ...a,
    name: `staged trailing stop (Priority 4, staged-stop@1): ${a.name} + S1 on D1·GDX, D1·VGT, Growth·VGT`,
    features: a.features | f,
    optionSets: [...a.optionSets, 'staged-stop@1 ON/OFF per book (8 combinations)']
  };
};

export const describeFeatures = (f: bigint) => featureNames(f);
export type { EvalOptions };
