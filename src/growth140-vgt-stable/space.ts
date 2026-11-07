// The searched space (PROTOCOL.md §4–§6): the completed study's 8 structural and 50 conditional numeric genes, their
// boxes, decoding and browser identity (src/growth140-vgt-s8m/space.ts, reused unchanged), plus what this study adds:
// - a FINE resolution at the schema's own step (0.1 percentage point, 1 session or bar) for the informed branch and
//   refinement;
// - the neighbourhood instrument with a radius in value units (10% of each box) rounded to the schema step, so every
//   centre (on or off the coarse grid, #4 included) is perturbed by the same absolute amounts;
// - family-restricted screens and structure classes.
import { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { findStrategy } from '../../apps/strategy-lab/shared/strategies.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import {
  type Config,
  type Genome,
  type NumGene,
  type Structure,
  activeGenes,
  configDistance,
  configId,
  configOfGenome,
  control4,
  describe,
  effectiveOf,
  genomeOf,
  levelCounts,
  levelsOf,
  numericGenes,
  repair,
  structuralGenes,
  structureKey,
  structureOf,
  withCost
} from '../growth140-vgt-s8m/space.ts';
import { seedOf, strategyKey, strategyVersion } from './context.ts';

export type { Config, Genome, NumGene, Structure };
export {
  activeGenes,
  configDistance,
  configId,
  configOfGenome,
  control4,
  describe,
  effectiveOf,
  genomeOf,
  levelCounts,
  numericGenes,
  repair,
  structuralGenes,
  structureKey,
  structureOf,
  withCost
};

const spec = findStrategy(strategyKey, strategyVersion)!;
const clean = (x: number) => Number(x.toFixed(6));

// The fine step of each searched input: the schema's own step (the finest resolution the browser supports), or — where
// the coarse box step is not a multiple of it (five percent inputs on 0.25 steps) — their largest common divisor
// (0.05), so that the coarse grid lies on the fine grid.
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const fineStepOf = (gene: NumGene) => {
  const p = spec.params.find((x) => x.key === gene.key) as { step?: number } | undefined;

  if (!p?.step) throw new Error(`no schema step for ${gene.key}`);

  const unit = 1000;

  return gcd(Math.round(p.step * unit), Math.round(gene.step * unit)) / unit;
};

export const radiusValue = (gene: NumGene) => 0.1 * (gene.max - gene.min);
export const roundStep = (x: number, step: number) => clean(Math.round(x / step + 1e-9) * step);

export const families = ['rise', 'breakout'] as const;
export type EntryFamily = (typeof families)[number];
export const familyOf = (c: Config): EntryFamily => (c.entryMethod === 'trend_breakout' ? 'breakout' : 'rise');
export const familyIndex = (f: EntryFamily) => (f === 'rise' ? 0 : 1);

// The switch class of a configuration (audit breakdowns and the shortlist's structural slots).
export const switchesOf = (c: Config) => {
  const s = structureOf(c);

  return {
    family: familyOf(c),
    hold: s.exits === 'hold_off' ? 'off' : 'on',
    buffer: s.exits === 'hold_on_buffer_on' ? 'on' : 'off',
    gate: s.gate,
    istop: s.istop,
    retain: s.retain,
    trend: s.trend,
    elig: s.elig,
    cont: s.cont
  };
};

// ----- the coarse screen (the completed study's Latin supercube of scrambled Sobol blocks, this study's seeds) -----

export const screenBlocks = [16, 16, 16, 10];

export const screenGenomes = (n: number, family: EntryFamily | null, ...labels: (string | number)[]): Genome[] => {
  const blocks: number[][][] = screenBlocks.map((dims, b) => {
    const sobol = new Sobol({ dimensions: dims, scramble: { seed: seedOf(...labels, 'block', b) } });
    const points = Array.from({ length: n }, () => sobol.next());

    if (b > 0) {
      const rng = Rng.from(...seedOf(...labels, 'permute', b));

      for (let i = n - 1; i > 0; i--) {
        const j = rng.int(i + 1);

        [points[i], points[j]] = [points[j]!, points[i]!];
      }
    }

    return points;
  });

  return Array.from({ length: n }, (_v, i) => {
    const u = blocks.flatMap((block) => block[i]!);
    const g = u.map((x, gene) => Math.min(levelCounts[gene]! - 1, Math.floor(x * levelCounts[gene]!)));

    if (family) g[0] = familyIndex(family);
    return g;
  });
};

// ----- the fine genome (schema steps; the informed branch) -----

export const fineLevels = [
  ...structuralGenes.map((s) => s.options.length),
  ...numericGenes.map((g) => Math.round((g.max - g.min) / fineStepOf(g)) + 1)
];

export const configOfFine = (genome: Genome): Config => {
  const s = Object.fromEntries(structuralGenes.map((sg, i) => [sg.key, sg.options[genome[i]!]!])) as Structure;
  // the switches and selectors of the structure (numeric inputs at their box minima), then the fine values
  const c = { ...configOfGenome([...genome.slice(0, structuralGenes.length), ...numericGenes.map(() => 0)]) } as Config;

  numericGenes.forEach((gene, i) => {
    if (gene.active(s)) c[gene.key] = clean(gene.min + genome[structuralGenes.length + i]! * fineStepOf(gene));
  });

  return effectiveOf(repair(c));
};

export const fineGenomeOf = (c: Config): Genome => {
  const s = structureOf(c);

  return [
    ...structuralGenes.map((sg) => sg.options.indexOf(s[sg.key] as never)),
    ...numericGenes.map((gene, i) => {
      const levels = fineLevels[structuralGenes.length + i]!;

      if (!gene.active(s)) return Math.floor((levels - 1) / 2);
      return Math.min(levels - 1, Math.max(0, Math.round(((c[gene.key] as number) - gene.min) / fineStepOf(gene))));
    })
  ];
};

// ----- neighbourhoods (the stability instrument, PROTOCOL.md §5.2) -----

export type Mode = 'clip' | 'inbox';

export interface Family {
  name: string;
  n: number;
  labels: (string | number)[];
  mode?: Mode;
  scale?: number;
  genes?: string[]; // perturb only these inputs (the sensitivity subsets); default: every active numeric input
}

const unitCache = new Map<string, number[][]>();

// Latin-hypercube units over all 50 numeric inputs for one seed family: every centre evaluated under the same labels
// uses the same offsets (common random numbers); a centre uses the columns of its active inputs.
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
  clipped: number;
}

// centre + u × scale × R (R = 10% of the box, value units), rounded to the schema step and clipped to the box widened
// to include the centre; 'inbox' maps u onto the in-box part of [−R, R].
export const perturb = (gene: NumGene, centre: number, u: number, mode: Mode = 'clip', scale = 1) => {
  const R = radiusValue(gene) * scale;
  const step = fineStepOf(gene);
  const lo = Math.min(gene.min, centre);
  const hi = Math.max(gene.max, centre);

  if (mode === 'inbox') {
    const v = u < 0 ? centre + u * Math.min(R, centre - lo) : centre + u * Math.min(R, hi - centre);

    return { value: Math.min(hi, Math.max(lo, roundStep(v, step))), clipped: false };
  }

  const v = roundStep(centre + u * R, step);

  if (v < lo) return { value: clean(lo), clipped: true };
  if (v > hi) return { value: clean(hi), clipped: true };
  return { value: v, clipped: false };
};

export const neighbourhood = (centre: Config, family: Family): NeighbourPoint[] => {
  const s = structureOf(centre);
  const active = numericGenes
    .map((gene, i) => [gene, i] as const)
    .filter(([gene]) => gene.active(s) && (!family.genes || family.genes.includes(gene.key)));
  const units = unitsOf(family.n, family.labels);
  const seen = new Set<string>([configId(centre)]);
  const out: NeighbourPoint[] = [];

  for (const unit of units) {
    const c: Config = { ...centre };
    let clipped = 0;

    for (const [gene, column] of active) {
      const p = perturb(gene, centre[gene.key] as number, unit[column]!, family.mode ?? 'clip', family.scale ?? 1);

      c[gene.key] = p.value;
      if (p.clipped) clipped++;
    }

    let config: Config;

    try {
      config = effectiveOf(repair(c));
    } catch {
      continue; // an invalid perturbation is not a neighbour (none expected: the boxes keep every constraint)
    }

    const id = configId(config);

    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ config, id, clipped });
  }

  return out;
};

export const nearBound = (c: Config) =>
  activeGenes(structureOf(c)).some((gene) => {
    const v = c[gene.key] as number;
    const R = radiusValue(gene);

    return v - gene.min < R - 1e-9 || gene.max - v < R - 1e-9;
  });

// ----- local moves (refinement): every active input by ±R/2 and ±R (schema-step rounded, inside the box), and every
// enabled optional rule switched OFF -----

export const movesOf = (c: Config, fractions: readonly number[] = [0.5, 1]): Config[] => {
  const out: Config[] = [];
  const s = structureOf(c);
  const add = (m: Config) => {
    try {
      out.push(effectiveOf(repair(m)));
    } catch {
      // an invalid move is not a move
    }
  };

  for (const gene of activeGenes(s)) {
    const step = fineStepOf(gene);

    for (const f of fractions)
      for (const sign of [-1, 1]) {
        const v = roundStep(
          (c[gene.key] as number) + sign * Math.max(step, roundStep(f * radiusValue(gene), step)),
          step
        );

        if (v < gene.min - 1e-9 || v > gene.max + 1e-9) continue;
        add({ ...c, [gene.key]: v });
      }
  }

  const off: [boolean, string][] = [
    [s.trend !== 'off', 'trendFilterEnabled'],
    [s.elig !== 'off', 'eligibilityEnabled'],
    [s.gate === 'on', 'drawdownRecoveryGateEnabled'],
    [s.istop === 'on', 'initialStopEnabled'],
    [s.retain === 'on', 'retentionEnabled'],
    [s.cont !== 'off', 'continuationEnabled'],
    [s.exits === 'hold_on_buffer_on', 'intradayLossBufferEnabled']
  ];

  for (const [on, key] of off) if (on) add({ ...c, [key]: false });

  const self = configId(c);

  return [...new Map(out.map((m) => [configId(m), m])).values()].filter((m) => configId(m) !== self);
};

export { levelsOf };
