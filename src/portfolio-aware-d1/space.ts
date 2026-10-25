// The search space and the common pool (PROTOCOL.md §4.1–§4.2): D1's eight parameters inside the eight-ETF box of
// src/multi-etf-d1 (its box, genome conversion, candidate IDs and probe offsets used unchanged), one scrambled Sobol
// design shared by all seven candidates and both tracks, and the declared controls.
import fs from 'fs-extra';
import type { IntParams } from '../d1-refinement/families.ts';
import { type Manifest, verifyManifestHash } from '../multi-etf-d1/freeze.ts';
import {
  type Genome,
  box,
  d1Params,
  genomeToParams,
  gridSizeOf,
  idOf,
  inBox,
  paramsToGenome,
  probeParams,
  spaceSize
} from '../multi-etf-d1/space.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { study } from './context.ts';
import { frozenBook, gridOf, type Grid } from './phenotypes.ts';

export { box, genomeToParams, gridSizeOf, idOf, inBox, paramsToGenome, probeParams, spaceSize };
export type { Genome };

export interface PoolVector {
  id: string;
  grid: Grid;
  origin: string; // 'sobol:<n>' or 'control:<name>'
}

export const poolSeed = () => deriveSeed(...study.pool.seedLabels);

// The common design: unique quantized vectors from one scrambled Sobol stream over the box, in stream order.
export const commonSobolPool = (samples: number = study.pool.sobolSamples) => {
  const seed = poolSeed();
  const sobol = new Sobol({ dimensions: box.length, scramble: { seed } });
  const seen = new Set<string>();
  const vectors: PoolVector[] = [];
  let drawn = 0;
  const target = Math.min(samples, spaceSize());

  while (vectors.length < target && drawn < Math.max(target * 64, 1 << 16)) {
    const point = sobol.next();
    const genome = box.map((spec, dimension) =>
      Math.min(gridSizeOf(spec) - 1, Math.floor(point[dimension]! * gridSizeOf(spec)))
    );
    const params = genomeToParams(genome);
    const id = idOf(params);

    drawn++;

    if (!seen.has(id)) {
      seen.add(id);
      vectors.push({ id, grid: gridOf(params as Record<string, number>), origin: `sobol:${vectors.length + 1}` });
    }
  }

  return { vectors, seed, drawn, duplicates: drawn - vectors.length };
};

const eightEtfManifestFile = 'research/multi-etf-d1/FROZEN_CANDIDATES.json';

// The declared controls of an ETF: D1's shipped constants, the six frozen XBI/XRT/KRE vectors, and for XLE the
// eight-ETF program's frozen XLE vectors.
export const controlsFor = async (symbol: string): Promise<PoolVector[]> => {
  const controls: PoolVector[] = [];
  const add = (grid: Grid, origin: string) => {
    if (!inBox(grid as IntParams)) {
      throw new Error(`${origin}: ${JSON.stringify(grid)} is outside the box`);
    }

    controls.push({ id: idOf(grid as IntParams), grid, origin });
  };

  add(gridOf(d1Params() as Record<string, number>), 'control:D1 shipped constants');

  for (const book of ['XBI', 'XRT', 'KRE'] as const) {
    for (const name of ['primary', 'lowDd'] as const) {
      const { resolved } = await frozenBook(book, name);

      add(resolved.grid, `control:${book} ${name}`);
    }
  }

  if (symbol === 'XLE') {
    const manifest = (await fs.readJson(eightEtfManifestFile)) as Manifest;

    if (!verifyManifestHash(manifest)) {
      throw new Error(`${eightEtfManifestFile}: the body hash does not verify`);
    }

    const nominations = (
      manifest.tickers.XLE as unknown as { nominations: { role: string; params: Record<string, number> }[] }
    ).nominations;

    for (const nomination of nominations) {
      add(gridOf(nomination.params), `control:XLE eight-ETF ${nomination.role}`);
    }
  }

  return controls;
};

// The pool of one ETF: controls first, then the common Sobol vectors, each ID once.
export const poolFor = async (symbol: string, sobol: PoolVector[]) => {
  const seen = new Set<string>();
  const vectors: PoolVector[] = [];

  for (const vector of [...(await controlsFor(symbol)), ...sobol]) {
    if (!seen.has(vector.id)) {
      seen.add(vector.id);
      vectors.push(vector);
    }
  }

  return vectors;
};

// E3's parity vectors from the common pool: the extremes (shortest and widest stop, longest hold, longest
// continuation window, shortest and longest lookback; first in pool order on ties), then the first pool vectors not
// already chosen, until 12.
export const parityVectors = (sobol: PoolVector[]) => {
  const pick = (key: keyof Grid, better: (a: number, b: number) => boolean) =>
    sobol.reduce((best, vector) => (better(vector.grid[key], best.grid[key]) ? vector : best), sobol[0]!);
  const chosen: PoolVector[] = [];
  const add = (vector: PoolVector) => {
    if (!chosen.some((other) => other.id === vector.id)) {
      chosen.push(vector);
    }
  };

  add(pick('trailingStopPercentage', (a, b) => a < b));
  add(pick('trailingStopPercentage', (a, b) => a > b));
  add(pick('maximumHoldDays', (a, b) => a > b));
  add(pick('continuationWindow', (a, b) => a > b));
  add(pick('tickWindowSize', (a, b) => a < b));
  add(pick('tickWindowSize', (a, b) => a > b));

  for (const vector of sobol) {
    if (chosen.length >= study.parity.extremes + study.parity.firstPool) {
      break;
    }

    add(vector);
  }

  return chosen;
};

// The one-parameter probes of §5.3 (the eight-ETF offsets, inside the box).
export const probesOf = (grid: Grid) =>
  probeParams(grid as IntParams).map((probe) => ({
    key: probe.key,
    offset: probe.offset,
    grid: gridOf(probe.params as Record<string, number>)
  }));

export const genomeOf = (grid: Grid): Genome => paramsToGenome(grid as IntParams);

export const gridOfGenome = (genome: Genome): Grid => gridOf(genomeToParams(genome) as Record<string, number>);

// The protocol's probe offsets are the eight-ETF box's (§5.3); a divergence would be a silent protocol change.
for (const spec of box) {
  const declared = study.probeOffsets[spec.key];

  if (!declared || declared.join(',') !== spec.probes.join(',')) {
    throw new Error(`${spec.key}: the box's probes ${spec.probes.join(',')} differ from PROTOCOL.md's`);
  }
}
