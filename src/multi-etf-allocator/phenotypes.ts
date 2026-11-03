// A read-only bridge from the phenotype registry to the shadow books (PROTOCOL.md §2): each phenotype is read through
// the existing validated loader (src/phenotype/phenotypes.ts), converted to the machine parameters of
// src/shared-margin-portfolio/strategy.ts, and checked against its frozen source: the manifest nomination of the same
// role for XBI/XRT/KRE (research/multi-etf-d1/FROZEN_CANDIDATES.json, whose body hash is verified) and D1's shipped
// constants for VGT. Nothing here writes a phenotype, a manifest or a strategy file, and the injection mechanism is
// not used: the books never run the strategy file, only its verified port.
import fs from 'fs-extra';
import { checkStrategyDefinition } from '#lib';
import { type Manifest, verifyManifestHash } from '../multi-etf-d1/freeze.ts';
import { selectPhenotype } from '../phenotype/phenotypes.ts';
import { type StrategyParams, strategies } from '../shared-margin-portfolio/strategy.ts';
import {
  type Combination,
  type PhenotypeName,
  type Sym,
  d1Source,
  expectedHashes,
  manifestBodyHash,
  manifestFile,
  pinnedRevisions,
  sha256File,
  symbols
} from './context.ts';

export const d1Keys = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer',
  'pullback',
  'continuationWindow'
] as const;
export type D1Key = (typeof d1Keys)[number];

export interface ResolvedPhenotype {
  symbol: Sym;
  name: PhenotypeName;
  file: string;
  fileHash: string;
  description: string;
  candidateId: string;
  manifestRole: string; // the nomination role it was checked against, or 'D1 shipped constants'
  grid: Record<D1Key, number>; // tenths of a percentage point, days or sessions
  params: StrategyParams;
  short: string; // "X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60"
}

const percentKeys = new Set<D1Key>([
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'intradayLossBuffer',
  'pullback'
]);

export const shortLabel = (grid: Record<D1Key, number>) =>
  `X ${(grid.targetPercentChange / 10).toFixed(1)}% Y ${(grid.trailingBuyPercentage / 10).toFixed(1)}% L ${grid.tickWindowSize} stop ${(grid.trailingStopPercentage / 10).toFixed(1)}% hold ${grid.maximumHoldDays} buffer ${(grid.intradayLossBuffer / 10).toFixed(1)}% P ${(grid.pullback / 10).toFixed(1)}% W ${grid.continuationWindow}`;

// The machine parameters of a D1 vector on the phenotype grid, converted exactly as the registry converts them.
export const paramsOf = (symbol: string, name: string, grid: Record<D1Key, number>): StrategyParams => {
  const value = (key: D1Key) => (percentKeys.has(key) ? grid[key] / 1000 : grid[key]);

  return {
    ...strategies.d1,
    label: `${symbol} ${name}`,
    targetPercentChange: value('targetPercentChange'),
    trailingBuyPercentage: value('trailingBuyPercentage'),
    trailingStopPercentage: value('trailingStopPercentage'),
    maximumHoldDays: value('maximumHoldDays'),
    tickWindowSize: value('tickWindowSize'),
    intradayLossBuffer: value('intradayLossBuffer'),
    pullback: value('pullback'),
    continuationWindow: value('continuationWindow')
  };
};

let manifestCache: Manifest | undefined;

export const loadManifest = async (): Promise<Manifest> => {
  if (!manifestCache) {
    const manifest = (await fs.readJson(manifestFile)) as Manifest;

    if (!verifyManifestHash(manifest) || manifest.manifestHash !== manifestBodyHash) {
      throw new Error(`${manifestFile}: the manifest body hash does not verify against ${manifestBodyHash}`);
    }

    manifestCache = manifest;
  }

  return manifestCache;
};

const cache = new Map<string, ResolvedPhenotype>();

export const resolvePhenotype = async (symbol: Sym, name: PhenotypeName): Promise<ResolvedPhenotype> => {
  const key = `${symbol}:${name}`;
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const { file, phenotype } = await selectPhenotype({ architecture: 'D1', symbol, name });
  const grid = Object.fromEntries(phenotype.parameters.map((parameter) => [parameter.name, parameter.grid])) as Record<
    D1Key,
    number
  >;
  const params = paramsOf(symbol, name, grid);
  let candidateId = String(phenotype.provenance?.candidateId ?? '');
  let manifestRole: string;

  // Every fraction must equal the decimal literal of its source exactly.
  for (const parameter of phenotype.parameters) {
    if (params[parameter.name as D1Key] !== parameter.value) {
      throw new Error(`${file.path} ${name}: ${parameter.name} converts to ${params[parameter.name as D1Key]}`);
    }
  }

  if (symbol === 'VGT') {
    // The pinned bytes, or exactly those bytes with the dataset plumbing of the canonical data layout
    // (src/lib/frozenSource.ts); any other change to the file is a changed D1 definition and refused.
    await checkStrategyDefinition(d1Source, expectedHashes.d1Source, pinnedRevisions.d1Source);

    for (const parameterKey of d1Keys) {
      if (params[parameterKey] !== strategies.d1[parameterKey]) {
        throw new Error(
          `VGT ${name}: ${parameterKey} ${params[parameterKey]} differs from D1's shipped ${strategies.d1[parameterKey]}`
        );
      }
    }

    manifestRole = 'D1 shipped constants';
  } else {
    const manifest = await loadManifest();
    const role = name === 'primary' ? 'primary' : 'alternate-lowDd';
    const nomination = (
      manifest.tickers[symbol] as unknown as {
        nominations: { role: string; id: string; params: Record<string, number> }[];
      }
    ).nominations.find((candidate) => candidate.role === role);

    if (!nomination) {
      throw new Error(`${manifestFile}: no ${role} nomination for ${symbol}`);
    }

    for (const parameterKey of d1Keys) {
      if (nomination.params[parameterKey] !== grid[parameterKey]) {
        throw new Error(
          `${file.path} ${name}: ${parameterKey} ${grid[parameterKey]} differs from the frozen ${role} ${nomination.params[parameterKey]}`
        );
      }
    }

    if (candidateId && candidateId !== nomination.id) {
      throw new Error(`${file.path} ${name}: candidate ${candidateId} differs from the frozen ${nomination.id}`);
    }

    candidateId = nomination.id;
    manifestRole = role;
  }

  const resolved: ResolvedPhenotype = {
    symbol,
    name,
    file: file.path,
    fileHash: await sha256File(file.path),
    description: phenotype.description ?? '',
    candidateId,
    manifestRole,
    grid,
    params,
    short: shortLabel(grid)
  };

  cache.set(key, resolved);

  return resolved;
};

export const resolveCombination = async (combination: Combination) => {
  const resolved = {} as Record<Sym, ResolvedPhenotype>;

  for (const symbol of symbols) {
    resolved[symbol] = await resolvePhenotype(symbol, combination[symbol]);
  }

  return resolved;
};

// Provenance rows for the reports: one per phenotype used.
export const provenanceOf = (phenotype: ResolvedPhenotype) => ({
  symbol: phenotype.symbol,
  phenotype: phenotype.name,
  candidateId: phenotype.candidateId,
  checkedAgainst: phenotype.manifestRole,
  vector: phenotype.short,
  file: phenotype.file,
  fileSha256: phenotype.fileHash
});
