// The synthetic ten-symbol universe and smoke tier shared by the pipeline and final-round smoke tests: repeated
// drawdowns and recoveries at symbol-specific times. Synthetic prices: mechanics and determinism only.
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import { type SessionSpec, buildSession, dateOf } from '../../multi-etf-allocator/tests/fixtures.ts';
import type { NUniverse } from '../../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../../portfolio-aware-d1/nbook/universe.ts';
import { type Tier, tiers } from '../context.ts';
import { Library } from '../genome.ts';
import { sobolLibrary } from '../library.ts';
import type { Book } from '../neighbourhood.ts';

export const symbols = ['EWZ', 'GDX', 'GLD', 'KRE', 'TLT', 'VGT', 'VOOG', 'XBI', 'XLV', 'XRT'];

const path_ = (sessions: number, phase: number, depth: number, period: number): SessionSpec[] =>
  Array.from({ length: sessions }, (_, day) => {
    const cycle = ((day + phase) % period) / period;
    const level =
      100 * (1 + 0.0004 * day) * (cycle < 0.3 ? 1 - (depth * cycle) / 0.3 : 1 - depth + (depth * (cycle - 0.3)) / 0.7);
    const next = level * (1 + 0.001 * Math.sin(day + phase));

    return { closes: Array.from({ length: 8 }, (_, k) => level + ((next - level) * (k + 1)) / 8) };
  });

export const synthetic = (): LoadedUniverse => {
  const sessions = 640;
  const instruments: Record<
    string,
    { symbol: string; file: string; hash: string; ds: ReturnType<typeof fixtureDataset> }
  > = {};
  let end = '';

  symbols.forEach((symbol, index) => {
    const specs = path_(sessions, 13 * index, 0.12 + 0.02 * (index % 5), 60 + 7 * (index % 4));
    const built: MarketSession[] = specs.map((spec, day) => buildSession(dateOf(day), spec));
    const ds = fixtureDataset(built);

    ds.id = `fixture-${symbol}`;
    instruments[symbol] = { symbol, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  });

  const assembled = assembleUniverse(instruments as never, [], end, {}, dateOf(40));

  return {
    partition: 'training',
    access: 'optimization',
    universe: { ...assembled, instruments } as unknown as NUniverse,
    warmup: 0,
    windows: {},
    splits: [],
    distributions: { file: '', sha256: '', coverage: { VGT: '', VOOG: '' }, covered: true, adjusted: [] }
  };
};

export const smokeTier: Tier = {
  ...tiers.F,
  key: 'R',
  label: 'smoke',
  nDiscoveryCandidates: [4, 6],
  promotionDraws: 6,
  refineDraws: 4,
  confirmDraws: 8,
  pilotPerStratum: 1
};

export const vectorsOf = () =>
  sobolLibrary(48).vectors.map((vector) => ({
    ...vector,
    grid: { ...vector.grid, tickWindowSize: 20 + (vector.grid.tickWindowSize % 15) }
  }));

export const libraryOf = () => {
  const vectors = vectorsOf();

  return new Library(vectors.map((vector) => ({ ...vector, id: `${vector.id}`, origin: vector.origin })));
};

export const benchmarks = (library: Library): Record<'B1' | 'B4' | 'B5', Book[]> => ({
  B1: [{ symbol: 'VGT', vector: library.vectors[0]! }],
  B4: ['KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library.vectors[i + 1]! })),
  B5: ['GDX', 'KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library.vectors[i + 1]! }))
});

export const noCapacity = async () => ({ partLot: NaN, partPortfolio: NaN, delayedShare: NaN, fills: 0 });
