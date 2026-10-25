// Books for the N-book engine: the four frozen All-lowDd books through the allocator's validated phenotype bridge
// (src/multi-etf-allocator/phenotypes.ts: the registry JSON, checked against D1's shipped constants and the
// eight-ETF manifest), and candidate books from an eight-parameter D1 vector on the phenotype grid (tenths of a
// percentage point, days, sessions), converted exactly as the registry converts them (paramsOf). Nothing here writes
// a phenotype file.
import { type PhenotypeName, type Sym } from '../multi-etf-allocator/context.ts';
import { d1Keys, paramsOf, resolvePhenotype, shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import type { BookPhenotype } from './nbook/engine.ts';

export type Grid = Record<(typeof d1Keys)[number], number>;

export const frozenBooks = ['VGT', 'XBI', 'XRT', 'KRE'] as const;
export const frozenPhenotypeNames: Record<(typeof frozenBooks)[number], PhenotypeName> = {
  VGT: 'primary',
  XBI: 'lowDd',
  XRT: 'lowDd',
  KRE: 'lowDd'
};

export const frozenBook = async (symbol: (typeof frozenBooks)[number], name?: PhenotypeName) => {
  const resolved = await resolvePhenotype(symbol as Sym, name ?? frozenPhenotypeNames[symbol]);
  const book: BookPhenotype = { symbol, name: resolved.name, params: resolved.params, short: resolved.short };

  return { book, resolved };
};

// The All-lowDd books (S0), keyed by symbol.
export const s0Books = async (): Promise<Record<string, BookPhenotype>> => {
  const books: Record<string, BookPhenotype> = {};

  for (const symbol of frozenBooks) {
    books[symbol] = (await frozenBook(symbol)).book;
  }

  return books;
};

export const gridOf = (params: Record<string, number>): Grid =>
  Object.fromEntries(
    d1Keys.map((key) => {
      const value = params[key];

      if (value === undefined || !Number.isInteger(value)) {
        throw new Error(`${key}=${value}: a D1 grid value must be an integer`);
      }

      return [key, value];
    })
  ) as Grid;

export const candidateBook = (symbol: string, name: string, grid: Grid): BookPhenotype => ({
  symbol,
  name,
  params: paramsOf(symbol, name, grid),
  short: shortLabel(grid)
});

export { d1Keys, shortLabel };
