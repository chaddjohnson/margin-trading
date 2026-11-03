// The named Part A designs of PROTOCOL.md §5.4, built deterministically around a centre (frozen B5 unless stated).
// Every stage that needs a set rebuilds it from these definitions, so the points are identical across stages.
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { bookOrder, frozenGrids, pairPartners, radius, sets } from './context.ts';
import { type Books, type DesignPoint, type Key, type Mode, design, resetCoordinate } from './designs.ts';

export interface NamedSet {
  id: string;
  family: string; // joint-clip | joint-inbox | joint-n2 | book-clip | book-inbox | book-n2 | kre-half | kre-x5 | …
  rep: number;
  perturb: string[];
  mode: Mode;
  scale: number;
  centre: Books;
  points: DesignPoint[];
  note?: string;
}

export const frozenB5 = (): Books =>
  Object.fromEntries(bookOrder.map((symbol) => [symbol, { ...frozenGrids[symbol] }]));

const reps = (count: number) => Array.from({ length: count }, (_value, index) => index + 1);

const make = (
  id: string,
  family: string,
  rep: number,
  centre: Books,
  perturb: string[],
  n: number,
  labels: (string | number)[],
  mode: Mode,
  scale: number,
  radiusOf?: (symbol: string, key: Key) => number,
  note?: string
): NamedSet => ({
  id,
  family,
  rep,
  perturb,
  mode,
  scale,
  centre,
  points: design({ centre, perturb, n, labels, mode, scale, ...(radiusOf ? { radiusOf } : {}) }),
  ...(note ? { note } : {})
});

export const jointSets = (centre: Books = frozenB5(), families = ['joint-clip', 'joint-inbox', 'joint-n2']) => {
  const five = [...bookOrder];
  const out: NamedSet[] = [];

  if (families.includes('joint-clip')) {
    for (const rep of reps(sets.jointN1.reps)) {
      out.push(
        make(`joint-clip-r${rep}`, 'joint-clip', rep, centre, five, sets.jointN1.n, ['A', 'joint', rep], 'clip', 1)
      );
    }
  }

  if (families.includes('joint-inbox')) {
    for (const rep of reps(sets.jointN1.reps)) {
      out.push(
        make(
          `joint-inbox-r${rep}`,
          'joint-inbox',
          rep,
          centre,
          five,
          sets.jointN1.n,
          ['A', 'joint-inbox', rep],
          'inbox',
          1
        )
      );
    }
  }

  if (families.includes('joint-n2')) {
    for (const rep of reps(sets.jointN2.reps)) {
      out.push(
        make(`joint-n2-r${rep}`, 'joint-n2', rep, centre, five, sets.jointN2.n, ['A', 'joint-n2', rep], 'clip', 2)
      );
    }
  }

  return out;
};

export const bookSets = (
  centre: Books = frozenB5(),
  families = ['book-clip', 'book-inbox', 'book-n2'],
  symbols: readonly string[] = bookOrder
) => {
  const out: NamedSet[] = [];

  for (const symbol of symbols) {
    if (families.includes('book-clip')) {
      for (const rep of reps(sets.bookN1.reps)) {
        out.push(
          make(
            `book-clip-${symbol}-r${rep}`,
            'book-clip',
            rep,
            centre,
            [symbol],
            sets.bookN1.n,
            ['A', 'book', symbol, rep],
            'clip',
            1
          )
        );
      }
    }

    if (families.includes('book-inbox')) {
      for (const rep of reps(sets.bookN1.reps)) {
        out.push(
          make(
            `book-inbox-${symbol}-r${rep}`,
            'book-inbox',
            rep,
            centre,
            [symbol],
            sets.bookN1.n,
            ['A', 'book-inbox', symbol, rep],
            'inbox',
            1
          )
        );
      }
    }

    if (families.includes('book-n2')) {
      for (const rep of reps(sets.bookN2.reps)) {
        out.push(
          make(
            `book-n2-${symbol}-r${rep}`,
            'book-n2',
            rep,
            centre,
            [symbol],
            sets.bookN2.n,
            ['A', 'book-n2', symbol, rep],
            'clip',
            2
          )
        );
      }
    }
  }

  return out;
};

// KRE variants: half radius (clip), inbox with X radius 5 and 20, and the paired "parameter k frozen" designs.
export const kreSets = (centre: Books = frozenB5()) => {
  const out: NamedSet[] = [];
  const xRadius = (value: number) => (_symbol: string, key: Key) =>
    key === 'targetPercentChange' ? value : radius[key];

  for (const rep of reps(sets.kreVariant.reps)) {
    out.push(
      make(`kre-half-r${rep}`, 'kre-half', rep, centre, ['KRE'], sets.kreVariant.n, ['A', 'kre-half', rep], 'clip', 0.5)
    );
    out.push(
      make(
        `kre-x5-r${rep}`,
        'kre-x5',
        rep,
        centre,
        ['KRE'],
        sets.kreVariant.n,
        ['A', 'kre-x5', rep],
        'inbox',
        1,
        xRadius(5)
      )
    );
    out.push(
      make(
        `kre-x20-r${rep}`,
        'kre-x20',
        rep,
        centre,
        ['KRE'],
        sets.kreVariant.n,
        ['A', 'kre-x20', rep],
        'inbox',
        1,
        xRadius(20)
      )
    );

    const base = make(
      `book-clip-KRE-r${rep}`,
      'book-clip',
      rep,
      centre,
      ['KRE'],
      sets.bookN1.n,
      ['A', 'book', 'KRE', rep],
      'clip',
      1
    );

    for (const key of d1Keys) {
      out.push({
        ...base,
        id: `kre-freeze-${key}-r${rep}`,
        family: `kre-freeze-${key}`,
        points: base.points.map((point) => resetCoordinate(point, centre, 'KRE', key)),
        note: `book-clip-KRE-r${rep} with KRE.${key} reset to the centre (paired)`
      });
    }
  }

  return out;
};

export const pairSets = (centre: Books = frozenB5()) =>
  pairPartners.flatMap((partner) =>
    reps(sets.pair.reps).map((rep) =>
      make(
        `pair-${partner}-r${rep}`,
        'pair',
        rep,
        centre,
        ['KRE', partner],
        sets.pair.n,
        ['A', 'pair', partner, rep],
        'clip',
        1
      )
    )
  );

export const b1Centre = (): Books => ({ VGT: { ...frozenGrids.VGT } });

export const b1Sets = () =>
  reps(sets.b1.reps).map((rep) =>
    make(`b1-clip-r${rep}`, 'b1-clip', rep, b1Centre(), ['VGT'], sets.b1.n, ['A', 'B1', rep], 'clip', 1)
  );

export const paramsText = (books: Books, symbols: readonly string[]) =>
  symbols.map((symbol) => `${symbol}:${d1Keys.map((key) => books[symbol]![key]).join('/')}`).join('|');

export type { Grid };
