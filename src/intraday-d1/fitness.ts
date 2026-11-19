// Study 8's stability-first fitness (S8/fitness.ts) on the intraday grid: the centre record and the unique neighbours of
// one seed family, scored by Study 8's OWN functions imported unchanged — centreView, nbView, violationOf (C1–C7, the
// normalized violation), objectivesOf (−centre net/yr, −nb median/yr, −nb p10/yr, nb p90 DD), floorsOf, summarize —
// so only the grid and the evaluation are new. Evaluations are batched (all centres and neighbours of a call at once)
// so a ParallelLab can fan them out; the values are those of Study 8's one-at-a-time fitOf.
import {
  type Fit as S8Fit,
  type Floors,
  centreView,
  floorsOf,
  nbView,
  objectivesOf,
  violationOf
} from '../study8-expanded-regime-d1/fitness.ts';
import { summarize } from '../study8-expanded-regime-d1/stats.ts';
import { type Grid, symbol } from './context.ts';
import type { ExecutionSettings } from './engine.ts';
import { type Lab, baseSettings } from './lab.ts';
import type { IntradayRecord } from './records.ts';
import { type Family, configId, design, genomeOf, uniquePoints } from './space.ts';

export { floorsOf };
export type { Floors };

export const symbols = [symbol] as const;

export type Fit = Omit<S8Fit, 'books'> & { grid: Grid };
export type FitWithRecords = Fit & { records: IntradayRecord[]; centreRecord: IntradayRecord };

const assemble = (
  grid: Grid,
  name: string,
  centre: IntradayRecord,
  records: IntradayRecord[],
  floors: Floors
): FitWithRecords => {
  const c = centreView(centre, symbols, floors.y);
  const nb = nbView(summarize(records), floors.y);
  const { violation, parts } = violationOf(c, nb, floors, symbols);

  return {
    id: configId(grid),
    family: name,
    grid,
    genome: genomeOf(grid),
    centre: c,
    nb,
    objectives: objectivesOf(c, nb),
    violation,
    parts,
    records,
    centreRecord: centre
  };
};

// Many centres under one or several pooled families: the union of their design points, unique across them and
// against the centre (S8 fitOf / pooledFamiliesFit).
export const fitsOf = async (
  lab: Lab,
  grids: readonly Grid[],
  families: readonly Family[],
  floors: Floors,
  name = families.map((family) => family.name).join('+'),
  settings: ExecutionSettings = baseSettings
): Promise<FitWithRecords[]> => {
  const designs = grids.map((grid) =>
    uniquePoints(
      families.flatMap((family) => design(grid, family)),
      grid
    ).map((point) => point.grid)
  );
  const jobs = grids.flatMap((grid, i) => [grid, ...designs[i]!].map((g) => ({ grid: g, settings })));
  const records = await lab.points(jobs);
  const out: FitWithRecords[] = [];
  let offset = 0;

  grids.forEach((grid, i) => {
    const count = 1 + designs[i]!.length;
    const slice = records.slice(offset, offset + count);

    offset += count;
    out.push(assemble(grid, name, slice[0]!, slice.slice(1), floors));
  });

  return out;
};

export const strip = (fit: FitWithRecords): Fit => {
  const { records, centreRecord, ...rest } = fit;

  void records;
  void centreRecord;
  return rest;
};

export const compactFit = (fit: Fit) => ({
  id: fit.id,
  grid: fit.grid,
  family: fit.family,
  violation: Math.round(fit.violation * 1e6) / 1e6,
  parts: Object.fromEntries(
    Object.entries(fit.parts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => [k, Math.round(v * 1e4) / 1e4])
  ),
  centre: fit.centre,
  nb: fit.nb
});
