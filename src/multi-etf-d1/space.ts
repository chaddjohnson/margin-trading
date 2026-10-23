// The search space: D1's eight numerical parameters on the d1-refinement integer grid (tenths of a percentage point,
// calendar days, sessions), bounded by the protocol's common box. Genomes are grid offsets from the box minimum, so
// every candidate any stage can produce is exactly quantized; the NSGA-II operators of src/optimizer/nsga2.ts work on
// the same integer vectors. Candidate IDs are the d1-refinement family IDs, so a vector has one ID everywhere.
import {
  type IntParams,
  type ParamKey,
  candidateId,
  d1Values,
  describeParams,
  familyOf,
  specs
} from '../d1-refinement/families.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type BoxSpec, d1Keys, protocol } from './context.ts';

export const d1Family = familyOf('d1');
export type Genome = number[];

export const box: BoxSpec[] = protocol.box;

for (const spec of box) {
  const grid = specs[spec.key];

  if (spec.min < grid.min || spec.max > grid.max || !Number.isInteger(spec.min) || !Number.isInteger(spec.max)) {
    throw new Error(`${spec.key}: box ${spec.min}..${spec.max} is outside the engine grid ${grid.min}..${grid.max}`);
  }
}

export const gridSizeOf = (spec: BoxSpec) => spec.max - spec.min + 1;

export const spaceSize = () => box.reduce((total, spec) => total * gridSizeOf(spec), 1);

// The operators of src/optimizer/nsga2.ts read only min, max and step of each spec (through gridSize/repairGenome),
// so the box is presented as a ParameterSpace; the key type of that interface is the daily optimizer's and is not
// used by the operators.
export const operatorSpace = {
  name: 'multi-etf-d1-v1',
  specs: box.map((spec) => ({
    key: spec.key,
    label: spec.short,
    unit: specs[spec.key].unit,
    min: spec.min,
    max: spec.max,
    step: 1,
    neighborhoodRadius: 1,
    rationale: spec.rationale
  }))
} as unknown as ParameterSpace;

export const genomeToParams = (genome: Genome): IntParams => {
  const params: IntParams = {};

  box.forEach((spec, dimension) => {
    const index = genome[dimension];

    if (index === undefined || !Number.isInteger(index) || index < 0 || index >= gridSizeOf(spec)) {
      throw new Error(`Genome index ${index} for ${spec.key} is off the box`);
    }

    params[spec.key] = spec.min + index;
  });

  return params;
};

export const paramsToGenome = (params: IntParams): Genome =>
  box.map((spec) => {
    const value = params[spec.key];

    if (value === undefined || !Number.isInteger(value) || value < spec.min || value > spec.max) {
      throw new Error(`${spec.key}=${value} is not inside the box ${spec.min}..${spec.max}`);
    }

    return value - spec.min;
  });

export const inBox = (params: IntParams) =>
  box.every((spec) => {
    const value = params[spec.key];

    return value !== undefined && Number.isInteger(value) && value >= spec.min && value <= spec.max;
  });

export const idOf = (params: IntParams) => candidateId(d1Family, params);

export const describe = (params: IntParams) => describeParams(d1Family, params);

export const d1Params = (): IntParams => Object.fromEntries(d1Keys.map((key) => [key, d1Values[key]!])) as IntParams;

export const d1Id = () => idOf(d1Params());

// The fractions the engine reads, for the reports and the manifest.
export const fractionsOf = (params: IntParams) =>
  Object.fromEntries(
    d1Keys.map((key) => [key, specs[key].unit === 'tenths of a percentage point' ? params[key]! / 1000 : params[key]!])
  ) as Record<ParamKey, number>;

export interface SobolSummary {
  requested: number;
  unique: number;
  drawn: number;
  duplicates: number;
  spaceSize: number;
  scrambleSeed: number[];
}

// The exploration design of one ticker: unique quantized candidates from a scrambled Sobol stream over the box,
// seeded from the ticker's name. The frozen D1 vector is not part of the design (it is the control).
export const sobolDesign = (ticker: string, samples: number = protocol.search.sobolSamples) => {
  const scrambleSeed = deriveSeed('multi-etf-d1', ticker, 'sobol-scramble');
  const sobol = new Sobol({ dimensions: box.length, scramble: { seed: scrambleSeed } });
  const seen = new Set<string>();
  const genomes: Genome[] = [];
  let drawn = 0;
  const target = Math.min(samples, spaceSize());

  while (genomes.length < target && drawn < Math.max(target * 64, 1 << 16)) {
    const point = sobol.next();
    const genome = box.map((spec, dimension) =>
      Math.min(gridSizeOf(spec) - 1, Math.floor(point[dimension]! * gridSizeOf(spec)))
    );
    const key = genome.join(',');

    drawn++;

    if (!seen.has(key)) {
      seen.add(key);
      genomes.push(genome);
    }
  }

  const summary: SobolSummary = {
    requested: samples,
    unique: genomes.length,
    drawn,
    duplicates: drawn - genomes.length,
    spaceSize: spaceSize(),
    scrambleSeed
  };

  return { genomes, summary };
};

// The one-parameter perturbations of the plateau check, inside the box only.
export const probeParams = (params: IntParams): { key: ParamKey; offset: number; params: IntParams }[] => {
  const probes: { key: ParamKey; offset: number; params: IntParams }[] = [];

  for (const spec of box) {
    for (const offset of spec.probes) {
      const value = params[spec.key]! + offset;

      if (value >= spec.min && value <= spec.max) {
        probes.push({ key: spec.key, offset, params: { ...params, [spec.key]: value } });
      }
    }
  }

  return probes;
};

export const probeCount = () => box.reduce((total, spec) => total + spec.probes.length, 0);
