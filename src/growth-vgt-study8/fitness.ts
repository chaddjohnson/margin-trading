// Study 8's stability-first fitness (S8/fitness.ts) on the Growth genome: the centre record and the unique neighbours of
// one seed family (or several pooled), scored by Study 8's OWN functions imported unchanged — centreView, nbView,
// violationOf (C1–C7, the normalized violation), objectivesOf (−centre net/yr, −nb median/yr, −nb p10/yr, nb p90 DD),
// floorsOf, summarize — so only the genome and the evaluation are new. Evaluations are batched so a ParallelLab can
// fan them out. Each fit also counts the distinct effective configurations and distinct trade ledgers its points hold.
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
import { symbol } from './context.ts';
import type { GrowthRecord } from './adapter.ts';
import type { Lab } from './lab.ts';
import { withCost } from './lab.ts';
import { type Family, type Genome, configId, design, effectiveOf, uniquePoints } from './space.ts';

export { floorsOf };
export type { Floors };

export const symbols = [symbol] as const;

export type Fit = Omit<S8Fit, 'books'> & {
  genome: Genome;
  distinctConfigs: number; // unique effective neighbour configurations (n)
  distinctLedgers: number; // distinct trade ledgers among the centre and its neighbours
  clippedPoints: number;
};
export type FitWithRecords = Fit & { records: GrowthRecord[]; centreRecord: GrowthRecord };

const assemble = (
  genome: Genome,
  name: string,
  centre: GrowthRecord,
  records: GrowthRecord[],
  floors: Floors,
  clippedPoints: number
): FitWithRecords => {
  const c = centreView(centre, symbols, floors.y);
  const nb = nbView(summarize(records), floors.y);
  const { violation, parts } = violationOf(c, nb, floors, symbols);

  return {
    id: configId(genome),
    family: name,
    genome,
    centre: c,
    nb,
    objectives: objectivesOf(c, nb),
    violation,
    parts,
    distinctConfigs: records.length,
    distinctLedgers: new Set([centre.signature, ...records.map((r) => r.signature)]).size,
    clippedPoints,
    records,
    centreRecord: centre
  };
};

// Many centres under one or several pooled families: the union of their design points, unique across them and
// against the centre (S8 fitOf / pooledFamiliesFit). `costBps` re-runs every point at another cost (stresses).
export const fitsOf = async (
  lab: Lab,
  genomes: readonly Genome[],
  families: readonly Family[],
  floors: Floors,
  name = families.map((family) => family.name).join('+'),
  costBps = 5
): Promise<FitWithRecords[]> => {
  const designs = genomes.map((genome) =>
    uniquePoints(
      families.flatMap((family) => design(genome, family)),
      genome
    )
  );
  const jobs = genomes.flatMap((genome, i) =>
    [genome, ...designs[i]!.map((p) => p.genome)].map((g) => withCost(effectiveOf(g), costBps))
  );
  const records = await lab.points(jobs);
  const out: FitWithRecords[] = [];
  let offset = 0;

  genomes.forEach((genome, i) => {
    const count = 1 + designs[i]!.length;
    const slice = records.slice(offset, offset + count);

    offset += count;
    out.push(
      assemble(genome, name, slice[0]!, slice.slice(1), floors, designs[i]!.filter((p) => p.clipped.length > 0).length)
    );
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
  genome: fit.genome,
  family: fit.family,
  violation: Math.round(fit.violation * 1e6) / 1e6,
  parts: Object.fromEntries(
    Object.entries(fit.parts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => [k, Math.round(v * 1e4) / 1e4])
  ),
  centre: fit.centre,
  nb: fit.nb,
  distinctConfigs: fit.distinctConfigs,
  distinctLedgers: fit.distinctLedgers,
  clippedPoints: fit.clippedPoints
});

export type CompactFit = ReturnType<typeof compactFit>;
