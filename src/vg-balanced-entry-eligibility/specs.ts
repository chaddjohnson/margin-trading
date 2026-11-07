// What one evaluation runs (PROTOCOL.md §6, §9): an eligibility setting per ETF (A in sessions, E in tenths of a
// percentage point), optional report-only options (invalidation sensitivity, D1 grid overrides for the stress,
// friction, diagnostic blackouts), a canonical id, the bounded grid, the local boxes and their seeded draws, and the
// D1-stress Latin hypercube (Study 6's pointFromUnits on the Study 6 box with Study 8's N1 radius).
import { Rng } from '../optimizer/rng.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { type DesignSpec, booksKey, pointFromUnits } from '../study6-b5-kre-robustness/designs.ts';
import { type Etf, type EtfSet, ages, etfSets, extensions, seedOf, symbols } from './context.ts';
import { expectedBooks } from './control.ts';
import type { EtfEligibility, VRunConfig } from './engine.ts';

export interface Cell {
  A: number; // maximum age, completed sessions
  e: number; // maximum extension, tenths of a percentage point (E = e / 1000)
}

export interface Spec {
  eligibility: Partial<Record<Etf, Cell>>; // {} = OFF
  invalidation?: 'minute close' | 'none'; // absent = the protocol's 'minute low'
  d1?: Record<Etf, Grid>; // absent = the control's books
  friction?: {
    costBps?: number;
    rate?: number;
    stopFill?: 'stop' | 'next-open';
    stopSlippageBps?: number;
    lateEntryFill?: 'fill-minute high';
  };
  blackouts?: { first: string; last: string }[];
}

export const gridE = extensions.map((E) => Math.round(E * 1000)); // [0, 10, 30, 50]

export const OFF: Spec = { eligibility: {} };

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])])
    );
  return value;
};

export const specId = (spec: Spec) => JSON.stringify(canonical(spec));

export const setOf = (spec: Spec): EtfSet | 'OFF' | 'VGT+GDX (ETF-specific)' => {
  const v = spec.eligibility.VGT;
  const g = spec.eligibility.GDX;

  if (!v && !g) return 'OFF';
  if (v && !g) return 'VGT';
  if (g && !v) return 'GDX';
  return v!.A === g!.A && v!.e === g!.e ? 'VGT+GDX' : 'VGT+GDX (ETF-specific)';
};

export const cellSpec = (set: EtfSet, cell: Cell): Spec => ({
  eligibility: set === 'VGT+GDX' ? { VGT: { ...cell }, GDX: { ...cell } } : { [set]: { ...cell } }
});

export const label = (spec: Spec) => {
  const set = setOf(spec);

  if (set === 'OFF') return 'OFF';

  const parts = symbols
    .filter((s) => spec.eligibility[s])
    .map((s) => `${s} A${spec.eligibility[s]!.A} E${(spec.eligibility[s]!.e / 10).toFixed(1)}%`);
  const shared =
    set === 'VGT+GDX'
      ? `VGT+GDX A${spec.eligibility.VGT!.A} E${(spec.eligibility.VGT!.e / 10).toFixed(1)}%`
      : parts.join(' · ');

  return [
    shared,
    spec.invalidation ? `invalidation ${spec.invalidation}` : '',
    spec.d1 ? 'D1 perturbed' : '',
    spec.friction ? `friction ${JSON.stringify(spec.friction)}` : '',
    spec.blackouts ? `blackout ${spec.blackouts.map((b) => `${b.first}…${b.last}`).join(',')}` : ''
  ]
    .filter(Boolean)
    .join(' · ');
};

// The 60 grid configurations in canonical order (S: VGT, GDX, VGT+GDX; then A; then E).
export const gridSpecs = () =>
  etfSets.flatMap((set) =>
    ages.flatMap((A) => gridE.map((e) => ({ set, cell: { A, e }, spec: cellSpec(set, { A, e }) })))
  );

const neighbours = <T>(list: readonly T[], value: T) => {
  const i = list.indexOf(value);

  if (i < 0) throw new Error(`${String(value)} is not a grid value`);

  return list.slice(Math.max(0, i - 1), Math.min(list.length, i + 2));
};

// The local box of a grid cell: from the previous to the next grid value (clipped at the grid's edges).
export const boxOf = (cell: Cell) => {
  const a = neighbours(ages, cell.A as (typeof ages)[number]);
  const e = neighbours(gridE, cell.e);

  return { A: [a[0]!, a.at(-1)!] as const, e: [e[0]!, e.at(-1)!] as const, blockA: a, blockE: e };
};

// The 3 × 3 grid block around a cell (the centre included).
export const blockOf = (cell: Cell): Cell[] => {
  const { blockA, blockE } = boxOf(cell);

  return blockA.flatMap((A) => blockE.map((e) => ({ A, e })));
};

export const drawsOf = (cell: Cell, n: number, labels: (string | number)[]): Cell[] => {
  const { A, e } = boxOf(cell);
  const rng = new Rng(seedOf(...labels));

  return Array.from({ length: n }, () => ({ A: A[0] + rng.int(A[1] - A[0] + 1), e: e[0] + rng.int(e[1] - e[0] + 1) }));
};

export const neighbourhoodLabels = (family: 'explore' | 'confirm', fold: string, set: string, cell: Cell) => [
  family,
  fold,
  set,
  cell.A,
  cell.e
];

// ETF-specific combinations (PROTOCOL.md §6): draws from the product of the two ETFs' boxes.
export const productDraws = (vgt: Cell, gdx: Cell, n: number, labels: (string | number)[]): Spec[] => {
  const bv = boxOf(vgt);
  const bg = boxOf(gdx);
  const rng = new Rng(seedOf(...labels));

  return Array.from({ length: n }, () => ({
    eligibility: {
      VGT: { A: bv.A[0] + rng.int(bv.A[1] - bv.A[0] + 1), e: bv.e[0] + rng.int(bv.e[1] - bv.e[0] + 1) },
      GDX: { A: bg.A[0] + rng.int(bg.A[1] - bg.A[0] + 1), e: bg.e[0] + rng.int(bg.e[1] - bg.e[0] + 1) }
    }
  }));
};

// ----- the D1 stress (PROTOCOL.md §9) -----

export const centreBooks = (): Record<Etf, Grid> => ({
  VGT: { ...expectedBooks.VGT.grid },
  GDX: { ...expectedBooks.GDX.grid }
});

export const d1Points = (family: 'explore' | 'confirm') => {
  const n = family === 'explore' ? 64 : 128;
  const centre = centreBooks();
  const spec: DesignSpec = { centre, perturb: [...symbols], n, labels: ['d1', family], mode: 'clip', scale: 1 };
  const units = latinOffsets(n, 2 * 8, new Rng(seedOf('d1', family)));
  const seen = new Set<string>([booksKey(centre)]);
  const points: {
    index: number;
    books: Record<Etf, Grid>;
    clipped: { symbol: string; key: string; bound: string }[];
    duplicate: boolean;
  }[] = [];

  units.forEach((unit, index) => {
    const point = pointFromUnits(spec, unit, index);
    const key = booksKey(point.books);
    const duplicate = seen.has(key);

    seen.add(key);
    points.push({ index, books: point.books as Record<Etf, Grid>, clipped: point.clipped, duplicate });
  });

  return points;
};

// ----- a Spec as the adapter's configuration -----

export const eligibilityOf = (spec: Spec): Partial<Record<string, EtfEligibility>> =>
  Object.fromEntries(
    Object.entries(spec.eligibility).map(([symbol, cell]) => [
      symbol,
      { maxAgeSessions: cell!.A, maxExtension: cell!.e / 1000 }
    ])
  );

export const applySpec = (base: VRunConfig, spec: Spec): VRunConfig => ({
  ...base,
  eligibility: eligibilityOf(spec),
  ...(spec.invalidation ? { invalidation: spec.invalidation } : {}),
  ...(spec.friction?.lateEntryFill ? { lateEntryFill: spec.friction.lateEntryFill } : {}),
  ...(spec.blackouts ? { blackouts: spec.blackouts } : {})
});

export { etfSets };
