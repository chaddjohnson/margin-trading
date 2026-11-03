// Stage A (PROTOCOL.md §9.2): the quota schedule — a deterministic list of configurations built from the universe,
// the library and seeds only, before any evaluation, identical in every window and arm. Each pass of a band shuffles
// the universe and cuts it into groups whose sizes are drawn from the band; a remainder below the band's minimum is
// completed with symbols from a fresh shuffle of the others (recorded fills). Each appearance of a symbol takes the
// next vector of that symbol's own seeded permutation of the library, so its appearances use distinct vectors and every
// configuration is unique by construction.
import { createHash } from 'node:crypto';
import { pickDistinct } from '../d1-robust/genome.ts';
import { type Book, type Vector, gridKeyOf } from '../d1-robust/neighbourhood.ts';
import { keyOf } from '../d1-robust/evaluate.ts';
import { Rng } from '../optimizer/rng.ts';
import { study } from './context.ts';

export interface BandSpec {
  key: string;
  minBooks: number;
  maxBooks: number;
  passes: number;
}

export interface ScheduledConfig {
  index: number;
  band: string;
  pass: number;
  books: Book[];
  fills: string[]; // symbols added to complete a short remainder (extra appearances)
}

export interface Schedule {
  configs: ScheduledConfig[];
  appearances: Record<string, number>;
  fills: number;
  sha256: string;
}

const shuffled = <T>(items: readonly T[], rng: Rng) => pickDistinct(items, items.length, rng);

export const buildSchedule = (
  universe: readonly string[],
  library: readonly Vector[],
  bands: readonly BandSpec[] = study.schedule.bands,
  seedLabel: string = study.seedLabel
): Schedule => {
  if ([...universe].sort().join(',') !== universe.join(',')) {
    throw new Error('The schedule needs an alphabetical universe');
  }

  if (library.length === 0) {
    throw new Error('The schedule needs a nonempty library');
  }

  const n = universe.length;
  const permutations = new Map(
    universe.map((symbol) => [
      symbol,
      shuffled(
        library.map((_, i) => i),
        Rng.from(seedLabel, 'schedule', 'vectors', symbol)
      )
    ])
  );
  const counters = new Map(universe.map((symbol) => [symbol, 0]));
  const vectorFor = (symbol: string) => {
    const at = counters.get(symbol)!;

    counters.set(symbol, at + 1);

    return library[permutations.get(symbol)![at % library.length]!]!;
  };
  const configs: ScheduledConfig[] = [];
  const keys = new Set<string>();
  let fills = 0;

  for (const band of bands) {
    const minBooks = Math.min(band.minBooks, n);
    const maxBooks = Math.min(band.maxBooks, n);

    for (let pass = 1; pass <= band.passes; pass++) {
      const rng = Rng.from(seedLabel, 'schedule', band.key, pass);
      const order = shuffled(universe, rng);
      let cursor = 0;

      while (cursor < n) {
        const size = minBooks + rng.int(maxBooks - minBooks + 1);
        const remaining = n - cursor;
        let members: string[];
        let added: string[] = [];

        if (remaining >= size) {
          members = order.slice(cursor, cursor + size);
          cursor += size;
        } else {
          members = order.slice(cursor);
          cursor = n;

          if (members.length < minBooks) {
            const others = universe.filter((symbol) => !members.includes(symbol));

            added = shuffled(others, Rng.from(seedLabel, 'schedule', band.key, pass, 'fill')).slice(
              0,
              minBooks - members.length
            );
            members = [...members, ...added];
            fills += added.length;
          }
        }

        const books = [...members].sort().map((symbol) => ({ symbol, vector: vectorFor(symbol) }));
        const key = keyOf(books);

        if (keys.has(key)) {
          throw new Error(`The schedule repeated a configuration (${key}); the library is too small`);
        }

        keys.add(key);
        configs.push({ index: configs.length, band: band.key, pass, books, fills: added });
      }
    }
  }

  const sha256 = createHash('sha256')
    .update(
      configs
        .map(
          (config) => `${config.band}:${config.books.map((book) => `${book.symbol}=${gridKeyOf(book.vector.grid)}`)}`
        )
        .join('\n')
    )
    .digest('hex');

  return { configs, appearances: Object.fromEntries(counters), fills, sha256 };
};
