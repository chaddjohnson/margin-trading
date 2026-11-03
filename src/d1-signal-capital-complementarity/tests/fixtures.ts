// Synthetic universes for the study's tests (the frozen fixture builder of src/multi-etf-allocator/tests, any symbols).
import { fixtureDataset } from '../../four-family/data.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import {
  type SessionSpec,
  buildSession,
  dateOf,
  dipSession,
  flat,
  testGrid,
  testPhenotype
} from '../../multi-etf-allocator/tests/fixtures.ts';
import type { BookPhenotype, NUniverse } from '../../portfolio-aware-d1/nbook/engine.ts';

export { type SessionSpec, dipSession, flat, testGrid };

export const flats = (count: number, price = 100, bars = 6): SessionSpec[] =>
  Array.from({ length: count }, () => flat(price, bars));

export const anyUniverse = (specs: Record<string, SessionSpec[]>): NUniverse => {
  const instruments: Record<
    string,
    { symbol: string; file: string; hash: string; ds: ReturnType<typeof fixtureDataset> }
  > = {};
  let end = '';

  for (const [symbol, sessions] of Object.entries(specs)) {
    const built = sessions.map((spec, day) => buildSession(dateOf(day), spec));
    const ds = fixtureDataset(built);

    ds.id = `fixture-${symbol}`;
    instruments[symbol] = { symbol, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  }

  const assembled = assembleUniverse(instruments as never, [], end, {}, dateOf(0));

  return { ...assembled, instruments } as unknown as NUniverse;
};

export const testBook = (symbol: string, grid: Partial<typeof testGrid> = {}): BookPhenotype => {
  const phenotype = testPhenotype('VGT', grid);

  return { symbol, name: 'test', params: { ...phenotype.params, label: `${symbol} test` }, short: phenotype.short };
};
