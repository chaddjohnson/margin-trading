// The inspected, non-advancing references of PROTOCOL.md §2.10: R1 and R4 (the 16-ETF study's training leaders, read
// through the October 25 study's verified loader) and the October 25 study's training finalist GDX KRE XBI XLE. Their
// post-2023 history is known, so they are never seeds, candidates or nominees; a finalist that is one of them or a near
// copy (shares at least half its membership and every shared grid within two step units) is labelled and barred from
// nomination (§15.3). They are evaluated only after the selection freeze, in confirm-b, as inspect-only references.
import { nearBenchmark } from '../d1-robust/assess.ts';
import { keyOf } from '../d1-robust/evaluate.ts';
import { inspectOnlyBooks } from '../d1-robust/final.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { inspectedReferences, readJson } from './context.ts';

export interface InspectedReference {
  label: string;
  books: Book[];
}

export const inspectedReferenceBooks = async (): Promise<InspectedReference[]> => {
  const r = await inspectOnlyBooks();
  const october = (
    await readJson<{ finalists: { books: { symbol: string; id: string; grid: Book['vector']['grid'] }[] }[] }>(
      inspectedReferences.october25Finalist
    )
  ).finalists[0]!;

  return [
    { label: 'R1', books: r.R1 },
    { label: 'R4', books: r.R4 },
    {
      label: 'October 25 training finalist',
      books: october.books.map((book) => ({
        symbol: book.symbol,
        vector: { id: book.id, grid: book.grid, origin: 'inspect-only October 25 finalist' }
      }))
    }
  ];
};

// The references a configuration equals or nearly copies.
export const nearReferences = (books: readonly Book[], references: readonly InspectedReference[]) =>
  references
    .filter((reference) => keyOf(books) === keyOf(reference.books) || nearBenchmark(books, reference.books))
    .map((reference) => reference.label);
