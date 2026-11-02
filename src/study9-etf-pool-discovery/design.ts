// Designs and fitness (PROTOCOL.md §6–§7).
//
// The S1 screening design: 64 generic D1 vectors common to every ETF, two independently scrambled 32-point Sobol nets
// over Study 8's registered eight-parameter box and grid (half A and half B; a vector already drawn is skipped). No
// earlier phenotype, optimized vector or result seeds it.
//
// Neighbourhoods: Study 8's N1 "clip" geometry exactly (Study 6's coordinate(): centre + round(u × r), clipped to the
// box; Study 8 radius; de-duplication against the centre and earlier points), with one change in how the offsets are
// drawn: each book's 8 coordinates take their own Latin-hypercube block, seeded by (family labels, symbol). Because
// latinOffsets permutes every dimension independently, the union of the blocks is a Latin hypercube over all k × 8
// coordinates, exactly as Study 8's joint draw; it differs only in the seed derivation, which here gives a book the
// same perturbations in every pool it belongs to (common random numbers across pools, and shared traces).
//
// Fitness: Study 8's centre and neighbourhood views, its C1–C7 violation, its four objectives and its robust profit
// (½ median + ½ p10), imported unchanged from src/study8-expanded-regime-d1/fitness.ts and stats.ts.
import { box, gridSizeOf } from '../multi-etf-d1/space.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { type Clip, coordinate, normalizedDistance } from '../study6-b5-kre-robustness/designs.ts';
import {
  type CentreView,
  type Floors,
  type NbView,
  centreView,
  floorsOf,
  nbView,
  objectivesOf,
  violationOf
} from '../study8-expanded-regime-d1/fitness.ts';
import { type Summary, robustProfit, summarize } from '../study8-expanded-regime-d1/stats.ts';
import { radius, seedOf } from './context.ts';
import {
  type Books,
  type Lab,
  type PointRecord,
  type RunSettings,
  baseSettings,
  booksKey,
  configId,
  orderedOf
} from './engine.ts';

export { centreView, floorsOf, nbView, objectivesOf, robustProfit, summarize, violationOf };
export type { CentreView, Floors, NbView, Summary };

export const seedValue = (labels: (string | number)[]) => deriveSeed(...seedOf(...labels));
export type Key = (typeof d1Keys)[number];

const gridOfGenome = (genome: number[]): Grid =>
  Object.fromEntries(d1Keys.map((key, d) => [key, box[d]!.min + genome[d]!])) as Grid;

// One scrambled Sobol stream of unique grid vectors (Study 8's sobolGrids, this study's seed namespace).
export const sobolGrids = (samples: number, labels: (string | number)[], exclude: ReadonlySet<string> = new Set()) => {
  const sobol = new Sobol({ dimensions: box.length, scramble: { seed: seedValue(labels) } });
  const seen = new Set<string>(exclude);
  const grids: Grid[] = [];
  let drawn = 0;

  while (grids.length < samples && drawn < samples * 64) {
    const point = sobol.next();
    const grid = gridOfGenome(
      box.map((spec, d) => Math.min(gridSizeOf(spec) - 1, Math.floor(point[d]! * gridSizeOf(spec))))
    );
    const key = d1Keys.map((k) => grid[k]).join('/');

    drawn++;

    if (!seen.has(key)) {
      seen.add(key);
      grids.push(grid);
    }
  }

  return { grids, drawn };
};

export interface ScreenVector {
  index: number; // 0–63
  half: 'A' | 'B';
  grid: Grid;
}

// §6.1 the 64 common screening vectors.
export const screenDesign = (): ScreenVector[] => {
  const a = sobolGrids(32, ['s1-design', 'A']);
  const b = sobolGrids(32, ['s1-design', 'B'], new Set(a.grids.map((g) => d1Keys.map((k) => g[k]).join('/'))));

  return [
    ...a.grids.map((grid, index) => ({ index, half: 'A' as const, grid })),
    ...b.grids.map((grid, index) => ({ index: 32 + index, half: 'B' as const, grid }))
  ];
};

export interface DesignPoint {
  index: number;
  books: Books;
  clipped: Clip[];
}

export interface Family {
  name: string;
  n: number;
  labels: (string | number)[];
  scale?: number;
}

// The N1 clip neighbourhood of a configuration (perturb: the books that vary; default all), per-book CRN blocks.
export const neighbourhood = (centre: Books, family: Family, perturb?: readonly string[]): DesignPoint[] => {
  const symbols = orderedOf(perturb ?? Object.keys(centre));
  const scale = family.scale ?? 1;
  const blocks = Object.fromEntries(
    symbols.map((symbol) => [
      symbol,
      latinOffsets(family.n, d1Keys.length, new Rng(seedValue([...family.labels, 'book', symbol])))
    ])
  );

  return Array.from({ length: family.n }, (_v, index) => {
    const books: Books = Object.fromEntries(Object.entries(centre).map(([s, grid]) => [s, { ...grid }]));
    const clipped: Clip[] = [];

    for (const symbol of symbols) {
      d1Keys.forEach((key, d) => {
        const result = coordinate(centre[symbol]![key], blocks[symbol]![index]![d]!, key, 'clip', scale, radius[key]);

        books[symbol]![key] = result.value;
        if (result.clipped) clipped.push({ symbol, key, bound: result.clipped });
      });
    }

    return { index, books, clipped };
  });
};

// The decisive design (review M4): exactly Study 8's instrument for one configuration — ONE Latin hypercube over all
// k × 8 coordinates of the pool's books (engine book order), seeded by the family labels and the pool key, so no two
// pools share offsets. `inbox` maps offsets onto the in-box part of each interval (Study 8's Q2b variant).
export const jointNeighbourhood = (
  centre: Books,
  family: Family,
  poolKey: string,
  mode: 'clip' | 'inbox' = 'clip'
): DesignPoint[] => {
  const symbols = orderedOf(Object.keys(centre));
  const scale = family.scale ?? 1;
  const units = latinOffsets(
    family.n,
    symbols.length * d1Keys.length,
    new Rng(seedValue([...family.labels, 'pool', poolKey]))
  );

  return units.map((unit, index) => {
    const books: Books = Object.fromEntries(Object.entries(centre).map(([s, grid]) => [s, { ...grid }]));
    const clipped: Clip[] = [];

    symbols.forEach((symbol, b) => {
      d1Keys.forEach((key, d) => {
        const result = coordinate(centre[symbol]![key], unit[b * d1Keys.length + d]!, key, mode, scale, radius[key]);

        books[symbol]![key] = result.value;
        if (result.clipped) clipped.push({ symbol, key, bound: result.clipped });
      });
    });

    return { index, books, clipped };
  });
};

// A point restricted to a subset of its books (the subset comparisons of complementarity test I1 use the pool's own
// decisive points, restricted, so the pool and each subset are measured on the same perturbations).
export const restrict = (point: DesignPoint, symbols: readonly string[]): DesignPoint => ({
  index: point.index,
  books: Object.fromEntries(symbols.map((s) => [s, point.books[s]!])),
  clipped: point.clipped.filter((c) => symbols.includes(c.symbol))
});

export const uniquePoints = (points: readonly DesignPoint[], centre: Books) => {
  const seen = new Set<string>([booksKey(centre)]);

  return points.filter((point) => {
    const key = booksKey(point.books);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export const distance = (a: Books, b: Books, symbols: readonly string[]) => normalizedDistance(a, b, symbols);

export interface Fit {
  id: string;
  family: string;
  books: Books;
  centre: CentreView;
  nb: NbView;
  objectives: number[];
  violation: number;
  parts: Record<string, number>;
  clippedPoints: number;
}

export const floorsFor = (lab: Lab, settings: RunSettings = baseSettings) =>
  floorsOf(lab.ev.yearsOfRun(settings), 2017, Number(lab.door.dates[lab.door.lastIndex]!.slice(0, 4)));

// One configuration under one or several pooled families (union of points, unique), with its records.
export const fitOf = (
  lab: Lab,
  books: Books,
  families: readonly Family[],
  settings: RunSettings = baseSettings,
  perturb?: readonly string[],
  joint?: { key: string; mode?: 'clip' | 'inbox'; points?: DesignPoint[] }
): Fit & { centreRecord: PointRecord; records: PointRecord[]; points: DesignPoint[] } => {
  const symbols = orderedOf(Object.keys(books));
  const floors = floorsFor(lab, settings);
  const centreRecord = lab.point(books, settings);
  const points = uniquePoints(
    joint?.points ??
      families.flatMap((family) =>
        joint ? jointNeighbourhood(books, family, joint.key, joint.mode) : neighbourhood(books, family, perturb)
      ),
    books
  );
  const records = points.map((point) => lab.point(point.books, settings));
  const c = centreView(centreRecord, symbols, floors.y);
  const nb = nbView(summarize(records), floors.y);
  const { violation, parts } = violationOf(c, nb, floors, symbols);

  return {
    id: configId(books),
    family: families.map((f) => f.name).join('+'),
    books,
    centre: c,
    nb,
    objectives: objectivesOf(c, nb),
    violation,
    parts,
    clippedPoints: points.filter((p) => p.clipped.length > 0).length,
    centreRecord,
    records,
    points
  };
};

// The neighbourhood median/p10 of a period attribution (e.g. EARLY, LATE) over a fit's records, per year of the period.
export const periodStats = (records: readonly PointRecord[], key: string) => {
  const values = records.map((r) => r.periods[key]).filter((v): v is number => typeof v === 'number');
  const s = summarize(records.map((r) => ({ ...r, net: r.periods[key] ?? NaN })).filter((r) => Number.isFinite(r.net)));

  return { n: values.length, median: s.medianNet, p10: s.p10Net, robust: robustProfit(s) };
};

// Per-period neighbourhood robust attributions (review M6): the expanding fold ends TO-F19…TO-F23, the calendar
// years, and the ex-2020 economy (training attribution minus calendar 2020), each ½ median + ½ p10 over the points.
export const foldPairs: [string, string][] = [
  ['TO-F19', '2020'],
  ['TO-F20', '2021'],
  ['TO-F21', '2022'],
  ['TO-F22', '2023'],
  ['TO-F23', '2024']
];
export const tdKeys = [...foldPairs.map(([f]) => f), '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];

export const periodRobust = (records: readonly PointRecord[], keys: readonly string[] = tdKeys) =>
  Object.fromEntries(keys.map((key) => [key, periodStats(records, key).robust]));

export const ex2020Stats = (records: readonly PointRecord[]) => {
  const s = summarize(
    records
      .map((r) => ({ ...r, net: (r.periods.TRAIN ?? NaN) - (r.periods['2020'] ?? 0) }))
      .filter((r) => Number.isFinite(r.net))
  );

  return { median: s.medianNet, p10: s.p10Net, robust: robustProfit(s) };
};

// Years of a period inside the run (its sessions ÷ 252), to annualize period attributions (review m8).
export const periodYears = (lab: Lab, key: string) => {
  const range = lab.ev.ranges().find((r) => r.key === key);

  return range ? (range.last - range.first + 1) / 252 : NaN;
};

// The one-sided 95% Wilson lower bound of a share, as Study 8 reports it (imported unchanged).
export { wilsonLower } from '../study8-expanded-regime-d1/evidence.ts';
