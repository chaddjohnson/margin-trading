// The search space and the neutral vector library (PROTOCOL.md §5): D1's eight parameters inside the eight-ETF box
// (src/multi-etf-d1: box, genome conversion, candidate IDs and probe offsets, unchanged), one scrambled Sobol design
// of 1,024 unique quantized vectors shared by all 16 ETFs, and one control set applied to every ETF alike.
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
  operatorSpace,
  paramsToGenome,
  probeParams,
  spaceSize
} from '../multi-etf-d1/space.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import type { Rng } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { readVerifiedSelection } from '../portfolio-aware-d1/freeze.ts';
import { type Grid, gridOf, shortLabel } from '../portfolio-aware-d1/phenotypes.ts';
import { eightEtfManifestFile, previousManifestFile, study } from './context.ts';

export { box, gridSizeOf, idOf, inBox, operatorSpace, shortLabel, spaceSize };
export type { Genome, Grid };

export interface Vector {
  id: string;
  grid: Grid;
  origin: string; // 'sobol:<n>', 'control:<name>', or the operator that produced it
}

export const vectorOf = (grid: Grid, origin: string): Vector => {
  if (!inBox(grid as IntParams)) {
    throw new Error(`${origin}: ${JSON.stringify(grid)} is outside the box`);
  }

  return { id: idOf(grid as IntParams), grid, origin };
};

export const genomeOf = (grid: Grid): Genome => paramsToGenome(grid as IntParams);

export const gridOfGenome = (genome: Genome): Grid => gridOf(genomeToParams(genome) as Record<string, number>);

export const librarySeed = () => deriveSeed(study.seedLabel, 'library', 'sobol-scramble');

// The library's Sobol design: unique quantized vectors from one scrambled stream over the box, in stream order.
export const sobolLibrary = (samples: number = study.library.sobolSamples) => {
  const seed = librarySeed();
  const sobol = new Sobol({ dimensions: box.length, scramble: { seed } });
  const seen = new Set<string>();
  const vectors: Vector[] = [];
  let drawn = 0;
  const target = Math.min(samples, spaceSize());

  while (vectors.length < target && drawn < Math.max(target * 64, 1 << 16)) {
    const point = sobol.next();
    const genome = box.map((spec, dimension) =>
      Math.min(gridSizeOf(spec) - 1, Math.floor(point[dimension]! * gridSizeOf(spec)))
    );
    const grid = gridOfGenome(genome);
    const id = idOf(grid as IntParams);

    drawn++;

    if (!seen.has(id)) {
      seen.add(id);
      vectors.push({ id, grid, origin: `sobol:${vectors.length + 1}` });
    }
  }

  return { vectors, seed, drawn, duplicates: drawn - vectors.length };
};

export interface ControlProvenance {
  source: string;
  sourceSymbol: string;
  inspectedPostTraining: boolean;
  note: string;
}

export type ControlVector = Vector & { provenance: ControlProvenance };

// The control set (the same for every ETF): D1's shipped constants, every eight-ETF nomination, and the previous
// study's frozen candidate vectors. Each one's post-2023 results were inspected on its source symbol.
export const controlVectors = async (): Promise<ControlVector[]> => {
  const controls: ControlVector[] = [];
  const add = (grid: Grid, origin: string, provenance: ControlProvenance) => {
    const vector = vectorOf(grid, origin);

    if (!controls.some((other) => other.id === vector.id)) {
      controls.push({ ...vector, provenance });
    }
  };

  add(gridOf(d1Params() as Record<string, number>), 'control:D1 shipped constants (VGT primary)', {
    source: 'src/app/allIn-trailingBuy-postExitContinuation.ts',
    sourceSymbol: 'VGT',
    inspectedPostTraining: true,
    note: 'VGT 2024–2026 inspected by earlier VGT programmes'
  });

  const manifest = (await fs.readJson(eightEtfManifestFile)) as Manifest;

  if (!verifyManifestHash(manifest)) {
    throw new Error(`${eightEtfManifestFile}: the body hash does not verify`);
  }

  for (const [ticker, entry] of Object.entries(manifest.tickers)) {
    const nominations = (entry as unknown as { nominations?: { role: string; params: Record<string, number> }[] })
      .nominations;

    for (const nomination of nominations ?? []) {
      add(gridOf(nomination.params), `control:${ticker} eight-ETF ${nomination.role}`, {
        source: eightEtfManifestFile,
        sourceSymbol: ticker,
        inspectedPostTraining: true,
        note: 'the eight-ETF sealed holdout was run once and inspected'
      });
    }
  }

  const previous = await readVerifiedSelection(previousManifestFile);
  const configurations = previous.configurations as {
    key: string;
    books: { symbol: string; phenotype: string; grid?: Record<string, number>; track?: string }[];
  }[];

  for (const configuration of configurations) {
    for (const book of configuration.books) {
      if (book.grid) {
        add(gridOf(book.grid), `control:${book.symbol} previous-study Track ${book.track} (${configuration.key})`, {
          source: previousManifestFile,
          sourceSymbol: book.symbol,
          inspectedPostTraining: true,
          note: 'evaluated on holdout and final by the previous study'
        });
      }
    }
  }

  return controls;
};

// The library of every ETF: the controls first, then the Sobol vectors, each ID once.
export const libraryVectors = async () => {
  const controls = await controlVectors();
  const sobol = sobolLibrary();
  const seen = new Set<string>();
  const vectors: Vector[] = [];

  for (const vector of [...controls, ...sobol.vectors]) {
    if (!seen.has(vector.id)) {
      seen.add(vector.id);
      vectors.push({ id: vector.id, grid: vector.grid, origin: vector.origin });
    }
  }

  return { vectors, controls, sobol };
};

// The in-box one-parameter probes of §7–§8 (the eight-ETF offsets).
export const probesOf = (grid: Grid) =>
  probeParams(grid as IntParams).map((probe) => ({
    key: probe.key as string,
    offset: probe.offset,
    grid: gridOf(probe.params as Record<string, number>)
  }));

// A joint perturbation of §8: every parameter moved independently by −m, 0 or +m grid steps, clamped to the box.
export const jointPerturbation = (grid: Grid, rng: Rng): Grid => {
  const next = { ...grid };

  for (const spec of box) {
    const magnitude = study.robustness.jointMagnitudes[spec.key]!;
    const step = (rng.int(3) - 1) * magnitude;

    next[spec.key as keyof Grid] = Math.min(spec.max, Math.max(spec.min, grid[spec.key as keyof Grid] + step));
  }

  return next;
};

// A random box probe of one parameter (the refinement's joint moves).
export const randomProbe = (grid: Grid, rng: Rng): Grid => {
  const spec = box[rng.int(box.length)]!;
  const offset = spec.probes[rng.int(spec.probes.length)]!;
  const next = { ...grid };

  next[spec.key as keyof Grid] = Math.min(spec.max, Math.max(spec.min, grid[spec.key as keyof Grid] + offset));

  return next;
};
