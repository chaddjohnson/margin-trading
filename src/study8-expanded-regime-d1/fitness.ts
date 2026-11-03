// The stability-first fitness of PROTOCOL.md §6: a configuration's centre record and its neighbourhood under one seed
// family, the eligibility constraints C1–C7 as a normalized violation, and the four constrained-Pareto objectives
// (minimized internally: −centre net/yr, −neighbourhood median/yr, −neighbourhood p10/yr, neighbourhood p90 DD).
import { eligibility } from './context.ts';
import { type Mode, familyDesign, uniquePoints } from './designs.ts';
import type { Books, Lab, PointRecord, RunSettings } from './evaluate.ts';
import { baseSettings } from './evaluate.ts';
import { configId, jointGenomeOf } from './space.ts';
import { type Summary, num, robustProfit, summarize } from './stats.ts';

export interface Floors {
  y: number;
  lots: number;
  episodes: number;
  lotYears: number;
  bookLots: number;
}

// §7.1 C3/C4 floors for a window of y years spanning calendar years firstYear..lastYear.
export const floorsOf = (y: number, firstYear: number, lastYear: number, scale = 1): Floors => ({
  y,
  lots: Math.ceil(eligibility.lotsPerYear * y * scale),
  episodes: Math.ceil(eligibility.episodesPerYear * y * scale),
  lotYears: Math.min(eligibility.minLotYears, lastYear - firstYear),
  bookLots: Math.ceil(0.4 * y * scale)
});

export interface CentreView {
  net: number;
  perYear: number;
  realized: number;
  unrealized: number;
  dd: number;
  ddDaily: number;
  lots: number;
  episodes: number;
  lotYears: number;
  bookLots: Record<string, number>;
  bookNet: Record<string, number>;
  heldDays: number;
  perCapitalYear: number;
  top1Share: number;
  bestYear: number;
  bestYearKey: string;
  bestYearShare: number;
  exBestPerYear: number;
  refused: number;
  signature: string;
}

export interface NbView {
  n: number; // unique neighbours
  share: number;
  shareSe: number;
  breaches: number;
  p90Dd: number;
  medianDd: number;
  worstDd: number;
  medianNet: number;
  p10Net: number;
  p90Net: number;
  medianPerYear: number;
  p10PerYear: number;
  robustPerYear: number;
  profitable: number;
  medianLots: number;
}

export interface Fit {
  id: string;
  family: string;
  books: Books;
  genome: number[];
  centre: CentreView;
  nb: NbView;
  objectives: number[]; // minimized
  violation: number;
  parts: Record<string, number>;
}

export const centreView = (record: PointRecord, symbols: readonly string[], y: number): CentreView => {
  const net = record.net;
  const bestYearShare = net > 0 ? record.bestYear / net : NaN;

  return {
    net,
    perYear: net / y,
    realized: record.realized,
    unrealized: record.unrealized,
    dd: record.dd,
    ddDaily: record.ddDaily,
    lots: record.lots,
    episodes: record.episodes,
    lotYears: record.lotYears,
    bookLots: Object.fromEntries(symbols.map((s) => [s, record.books[s]?.lots ?? 0])),
    bookNet: Object.fromEntries(symbols.map((s) => [s, record.books[s]?.net ?? 0])),
    heldDays: record.heldDays,
    perCapitalYear: record.perCapitalYear,
    top1Share: num(record.top1Share),
    bestYear: record.bestYear,
    bestYearKey: record.bestYearKey,
    bestYearShare,
    exBestPerYear: (net - record.bestYear) / Math.max(1, y - 1),
    refused: record.refused,
    signature: record.signature
  };
};

export const nbView = (summary: Summary, y: number): NbView => ({
  n: summary.n,
  share: summary.share,
  shareSe: summary.shareSe,
  breaches: summary.breaches,
  p90Dd: summary.p90Dd,
  medianDd: summary.medianDd,
  worstDd: summary.worstDd,
  medianNet: summary.medianNet,
  p10Net: summary.p10Net,
  p90Net: summary.p90Net,
  medianPerYear: summary.medianNet / y,
  p10PerYear: summary.p10Net / y,
  robustPerYear: robustProfit(summary) / y,
  profitable: summary.profitable,
  medianLots: summary.medianLots
});

const short = (value: number, floor: number) => (floor > 0 ? Math.max(0, floor - value) / floor : 0);

// §7.1 the normalized violation (0 iff feasible) and its parts.
export const violationOf = (c: CentreView, nb: NbView, floors: Floors, symbols: readonly string[]) => {
  const { ceiling } = eligibility;
  const parts: Record<string, number> = {
    C1: c.dd >= ceiling ? (c.dd - ceiling) / ceiling + 1e-9 : 0, // strict: DD must be < $35,000 (unrounded)
    C2share: Math.max(0, eligibility.share - nb.share) / eligibility.share,
    C2p90: nb.p90Dd >= ceiling ? (nb.p90Dd - ceiling) / ceiling + 1e-9 : 0,
    C3lots: short(c.lots, floors.lots),
    C3episodes: short(c.episodes, floors.episodes),
    C3years: short(c.lotYears, floors.lotYears),
    C4: symbols.length > 1 ? symbols.reduce((total, s) => total + short(c.bookLots[s] ?? 0, floors.bookLots), 0) : 0,
    C5median: Math.max(0, eligibility.medianPerYear - nb.medianPerYear) / eligibility.medianPerYear,
    C5p10: nb.p10Net > eligibility.p10Floor ? 0 : (Math.max(0, -nb.p10Net) + 1) / (10000 * floors.y),
    C6: Math.max(0, eligibility.perCapitalYear - c.perCapitalYear) / eligibility.perCapitalYear,
    C7lot:
      c.net > 0 && Number.isFinite(c.top1Share)
        ? Math.max(0, c.top1Share - eligibility.topLotShare) / eligibility.topLotShare
        : 1,
    C7year:
      c.net > 0 && Number.isFinite(c.bestYearShare)
        ? Math.max(0, c.bestYearShare - eligibility.topYearShare) / eligibility.topYearShare
        : 1,
    C7exBest: Math.max(0, eligibility.exBestPerYear - c.exBestPerYear) / eligibility.exBestPerYear
  };
  const violation = Object.values(parts).reduce((a, b) => a + b, 0);

  // a non-finite violation is infeasible, never feasible (review m13)
  return { violation: !Number.isFinite(violation) ? Infinity : violation < 1e-12 ? 0 : violation, parts };
};

export const objectivesOf = (c: CentreView, nb: NbView) => [-c.perYear, -nb.medianPerYear, -nb.p10PerYear, nb.p90Dd];

export interface FamilySpec {
  name: string; // e.g. 'r1', 'select1'
  n: number;
  labels: (string | number)[];
  mode?: Mode;
  scale?: number;
  matchCount?: number;
}

// One configuration under one family: the centre and its unique neighbours (common random numbers across centres).
export const fitOf = (
  lab: Lab,
  books: Books,
  symbols: readonly string[],
  family: FamilySpec,
  floors: Floors,
  settings: RunSettings = baseSettings
): Fit & { records: PointRecord[] } => {
  const centre = lab.point(books, settings);
  const points = uniquePoints(familyDesign(books, symbols, family), books);
  const records = points.map((point) => lab.point(point.books, settings));
  const c = centreView(centre, symbols, floors.y);
  const nb = nbView(summarize(records), floors.y);
  const { violation, parts } = violationOf(c, nb, floors, symbols);

  return {
    id: configId(books),
    family: family.name,
    books,
    genome: jointGenomeOf(books, symbols),
    centre: c,
    nb,
    objectives: objectivesOf(c, nb),
    violation,
    parts,
    records
  };
};

// The pooled figures of several families' neighbours (unique across them) for one centre.
export const pooledFit = (
  base: Fit,
  recordsList: PointRecord[][],
  floors: Floors,
  symbols: readonly string[],
  name: string
): Fit => {
  const records = recordsList.flat();
  const nb = nbView(summarize(records), floors.y);
  const { violation, parts } = violationOf(base.centre, nb, floors, symbols);

  return { ...base, family: name, nb, objectives: objectivesOf(base.centre, nb), violation, parts };
};

// One centre under several families pooled: the union of their design points, unique across them and against the
// centre (an exact duplicate counts once), as one neighbourhood.
export const pooledFamiliesFit = (
  lab: Lab,
  books: Books,
  symbols: readonly string[],
  families: readonly FamilySpec[],
  floors: Floors,
  name: string,
  settings: RunSettings = baseSettings
): Fit & { records: PointRecord[] } => {
  const centre = lab.point(books, settings);
  const points = uniquePoints(
    families.flatMap((family) => familyDesign(books, symbols, family)),
    books
  );
  const records = points.map((point) => lab.point(point.books, settings));
  const c = centreView(centre, symbols, floors.y);
  const nb = nbView(summarize(records), floors.y);
  const { violation, parts } = violationOf(c, nb, floors, symbols);

  return {
    id: configId(books),
    family: name,
    books,
    genome: jointGenomeOf(books, symbols),
    centre: c,
    nb,
    objectives: objectivesOf(c, nb),
    violation,
    parts,
    records
  };
};

export const stripRecords = <T extends { records?: unknown }>(fit: T) => {
  const { records, ...rest } = fit;

  void records;
  return rest;
};
