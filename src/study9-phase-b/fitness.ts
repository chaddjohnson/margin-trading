// The stability-first fitness (PROTOCOL.md §6): Study 8's, imported unchanged — the centre and neighbourhood views, the
// C1–C7 normalized violation, the four constrained-Pareto objectives (minimized: −centre net/yr, −neighbourhood
// median/yr, −neighbourhood p10/yr, neighbourhood p90 minute DD), the floors and the robust profit. Only fitOf and
// pooledFamiliesFit are ported line for line, because they call the namespace-dependent designs (designs.ts) and the
// engine-order configuration id (engine.ts).
import {
  type CentreView,
  type FamilySpec,
  type Fit,
  type Floors,
  type NbView,
  centreView,
  floorsOf,
  nbView,
  objectivesOf,
  pooledFit,
  stripRecords,
  violationOf
} from '../study8-expanded-regime-d1/fitness.ts';
import {
  type Summary,
  median,
  num,
  quantile,
  robustProfit,
  spearman,
  summarize
} from '../study8-expanded-regime-d1/stats.ts';
import { familyDesign, uniquePoints } from './designs.ts';
import { type Books, type Lab, type PointRecord, type RunSettings, baseSettings, configId } from './engine.ts';
import { jointGenomeOf } from './space.ts';

export {
  centreView,
  floorsOf,
  median,
  nbView,
  num,
  objectivesOf,
  pooledFit,
  quantile,
  robustProfit,
  spearman,
  stripRecords,
  summarize,
  violationOf
};
export type { CentreView, FamilySpec, Fit, Floors, NbView, Summary };

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

// One centre under several families pooled: the union of their design points, unique across them and against the
// centre, as one neighbourhood.
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
