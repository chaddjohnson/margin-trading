// The frozen comparators as search-view books (PROTOCOL.md §12): B4 and B5 read through the pools loader
// (src/pools/load.ts, which refuses a pool whose phenotype or pin changed), B1 = B4's VGT book alone. Their vectors
// were chosen with data after every fold's search end, so in folds they are inspected references and controls only,
// never seeds; in the final window they also seed the exploratory incumbent arm B.
import { loadPool } from '../pools/load.ts';
import type { Book } from './evaluate.ts';
import { vectorOf } from './space.ts';

export type IncumbentKey = 'B1' | 'B4' | 'B5';

export const incumbentBooks = async (): Promise<Record<IncumbentKey, Book[]>> => {
  const books: Partial<Record<IncumbentKey, Book[]>> = {};

  for (const id of ['B4', 'B5'] as const) {
    const pool = await loadPool(id);

    books[id] = pool.config.books.map((book) => ({
      symbol: book.symbol,
      vector: vectorOf(book.grid, `incumbent:${id}:${book.symbol} ${book.phenotype}`)
    }));
  }

  books.B1 = books.B4!.filter((book) => book.symbol === 'VGT');

  return books as Record<IncumbentKey, Book[]>;
};
