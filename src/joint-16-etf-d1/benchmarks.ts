// The frozen benchmarks (PROTOCOL.md §1): B1 VGT D1 alone, B4 All-lowDd shadow, B5 All-lowDd + GDX `portfolioAware`
// (the previous study's accepted P-add-GDX), and C0 the empty trading pool (portfolio mode only). Comparison runs, never
// mandatory members. Two views of the same books:
//
//   frozen   the books exactly as the previous study ran them (VGT `primary`, XBI/XRT/KRE `lowDd` through the
//            registry's validated bridge, GDX as the previous manifest's candidate book `d1-51ea8d4bd6`), for the
//            reproduction of its records to the cent;
//   search   the same parameter vectors as library vectors (books named by vector ID, as every searched book is), for
//            the robustness battery and the benchmark-seeded island. Names only label trades; parity.ts and
//            controls.ts check that both views give the same numbers.
import { selectPhenotype } from '../phenotype/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import { readVerifiedSelection } from '../portfolio-aware-d1/freeze.ts';
import { candidateBook, d1Keys, frozenBook, gridOf } from '../portfolio-aware-d1/phenotypes.ts';
import { previousManifestFile } from './context.ts';
import type { Book } from './evaluator.ts';
import { type Grid, vectorOf } from './space.ts';

export type BenchmarkKey = 'B1' | 'B4' | 'B5';

export const benchmarkKeys: BenchmarkKey[] = ['B1', 'B4', 'B5'];

export const benchmarkLabels: Record<BenchmarkKey | 'C0', string> = {
  B1: 'VGT D1 alone (primary)',
  B4: 'All-lowDd shadow (VGT primary, XBI/XRT/KRE lowDd)',
  B5: 'All-lowDd + GDX portfolioAware (previous P-add-GDX)',
  C0: 'empty trading pool (60/40 VOOG/VGT core only)'
};

export const benchmarkSymbols: Record<BenchmarkKey, string[]> = {
  B1: ['VGT'],
  B4: ['VGT', 'XBI', 'XRT', 'KRE'],
  B5: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']
};

export const gdxPhenotypeName = 'd1-51ea8d4bd6';

// The previous manifest's GDX book, checked equal to config/phenotypes/D1/GDX.json `portfolioAware`.
export const gdxGrid = async (): Promise<Grid> => {
  const manifest = await readVerifiedSelection(previousManifestFile);
  const configuration = (
    manifest.configurations as { key: string; books: { symbol: string; phenotype: string; grid?: Grid }[] }[]
  ).find((item) => item.key === 'P-add-GDX');
  const book = configuration?.books.find((item) => item.symbol === 'GDX');

  if (!book?.grid || book.phenotype !== gdxPhenotypeName) {
    throw new Error(`${previousManifestFile}: no P-add-GDX GDX book ${gdxPhenotypeName}`);
  }

  const { phenotype } = await selectPhenotype({ architecture: 'D1', symbol: 'GDX', name: 'portfolioAware' });
  const registered = Object.fromEntries(phenotype.parameters.map((parameter) => [parameter.name, parameter.grid]));

  for (const key of d1Keys) {
    if (registered[key] !== book.grid[key]) {
      throw new Error(`GDX portfolioAware ${key} ${registered[key]} differs from the frozen ${book.grid[key]}`);
    }
  }

  return gridOf(book.grid);
};

export const frozenBenchmarkPhenotypes = async (): Promise<Record<string, BookPhenotype>> => {
  const phenotypes: Record<string, BookPhenotype> = {};

  for (const symbol of ['VGT', 'XBI', 'XRT', 'KRE'] as const) {
    phenotypes[symbol] = (await frozenBook(symbol)).book;
  }

  phenotypes.GDX = candidateBook('GDX', gdxPhenotypeName, await gdxGrid());

  return phenotypes;
};

export const searchBenchmarkBooks = async (): Promise<Record<BenchmarkKey, Book[]>> => {
  const vectors: Record<string, Book> = {};

  for (const symbol of ['VGT', 'XBI', 'XRT', 'KRE'] as const) {
    const { resolved } = await frozenBook(symbol);

    vectors[symbol] = { symbol, vector: vectorOf(resolved.grid, `benchmark:${symbol} ${resolved.name}`) };
  }

  vectors.GDX = { symbol: 'GDX', vector: vectorOf(await gdxGrid(), 'benchmark:GDX portfolioAware') };

  return {
    B1: benchmarkSymbols.B1.map((symbol) => vectors[symbol]!),
    B4: benchmarkSymbols.B4.map((symbol) => vectors[symbol]!),
    B5: benchmarkSymbols.B5.map((symbol) => vectors[symbol]!)
  };
};
