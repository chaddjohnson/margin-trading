// The selection rule (PROTOCOL.md §8), identical for 4B, 4C and every 4D experiment and control, and the joint ±10%
// perturbation of PROTOCOL.md §10.3 used by its robust step and by 4E.
import type { Rng } from '../optimizer/rng.ts';
import { type BookSpec, type Bounds, clampToBounds, gridKey } from './books.ts';
import { type Grid, paramKeys } from './context.ts';
import {
  type Context,
  type Evaluation,
  type ExperimentClass,
  deepBroadBoundsOf,
  neighbourhoodOf,
  shallowBoundsOf,
  thresholds
} from './evaluate.ts';
import type { Runner } from './pool.ts';
import { deepBook, shallowBook, type Scored } from './search4d.ts';
import { type Genome, genomeKey, rngOf } from './space.ts';

export const boundsOf = (ctx: Context, book: BookSpec): Bounds | undefined =>
  book.tier === 'shallow'
    ? shallowBoundsOf(ctx, book.symbol)
    : book.deepMode === 'neighbourhood'
      ? neighbourhoodOf(ctx, book.symbol)
      : book.deepMode === 'broad'
        ? deepBroadBoundsOf(ctx, book.symbol)
        : undefined;

// Each grid coordinate v moves by round(v × u), u ~ U[−r, r]; when r × v < 1 unit the move is round(u / r) ∈ {−1, 0, 1}.
export const perturbGrid = (grid: Grid, rng: Rng, bounds: Bounds, relative = 0.1): Grid => {
  const next = { ...grid };

  for (const key of paramKeys) {
    const u = (2 * rng.next() - 1) * relative;
    const v = grid[key];

    next[key] = v + (Math.abs(v) * relative >= 1 ? Math.round(v * u) : Math.round(u / relative));
  }

  return clampToBounds(next, bounds);
};

export const perturbGenome = (ctx: Context, genome: Genome, rng: Rng, relative = 0.1): Genome => {
  const move = (book: BookSpec): BookSpec => {
    if (book.tier === 'deep' && book.origin === 'B5') {
      return book;
    }

    const bounds = boundsOf(ctx, book)!;
    const grid = perturbGrid(book.grid, rng, bounds, relative);

    return book.tier === 'shallow'
      ? shallowBook(book.symbol, grid, `${book.origin}:p`)
      : deepBook(book.symbol, grid, `${book.origin}:p`, book.deepMode!);
  };
  const policy =
    genome.policy.kind === 'P3'
      ? {
          ...genome.policy,
          budget: Math.max(0, Math.round(genome.policy.budget * (1 + (2 * rng.next() - 1) * relative)))
        }
      : genome.policy;
  const seen = new Set<string>();

  return {
    deep: genome.deep.map(move),
    shallow: genome.shallow.map(move).filter((book) => !seen.has(book.id) && (seen.add(book.id), true)),
    policy
  };
};

export const structureKey = (g: Genome) =>
  [
    g.deep
      .map((book) => `${book.symbol}:${book.origin === 'B5' ? 'B5' : book.deepMode}`)
      .sort()
      .join(','),
    g.shallow
      .map((book) => book.symbol)
      .sort()
      .join(','),
    g.policy.kind
  ].join('|');

export interface Candidate {
  key: string;
  structure: string;
  genome: Genome;
  evaluation: Evaluation;
  perturbations: { median: number; p10: number; positiveShare: number; n: number; deltas: number[] };
}

export interface Selection {
  label: string;
  cls: ExperimentClass;
  evaluated: number;
  feasible: number;
  candidates: Candidate[];
  pick: Candidate | null; // null = no-fill (B5 unchanged)
  noFill: boolean;
  sRaw: Scored | null;
  sRisk: Scored | null;
  perturbationEvaluations: number;
}

const quantile = (sorted: number[], q: number) => {
  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const lo = Math.floor(position);
  const hi = Math.ceil(position);

  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (position - lo);
};

export const robustOrder = (a: Candidate, b: Candidate) =>
  b.perturbations.median - a.perturbations.median ||
  b.evaluation.delta - a.evaluation.delta ||
  a.evaluation.minuteDD - b.evaluation.minuteDD ||
  (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

export const selectFrom = async (
  ctx: Context,
  runner: Runner,
  items: Scored[],
  cls: ExperimentClass,
  label: string,
  options: { top?: number; perturbations?: number } = {}
): Promise<Selection> => {
  const top = options.top ?? 50;
  const count = options.perturbations ?? 24;
  const feasible = items.filter((item) => item.evaluation.feasible);
  const ordered = [...feasible].sort(
    (a, b) =>
      b.evaluation.delta - a.evaluation.delta ||
      a.evaluation.minuteDD - b.evaluation.minuteDD ||
      (a.evaluation.key < b.evaluation.key ? -1 : 1)
  );
  const structures = new Set<string>();
  const chosen: Scored[] = [];

  for (const item of ordered) {
    const structure = structureKey(item.genome);

    if (!structures.has(structure)) {
      structures.add(structure);
      chosen.push(item);
    }

    if (chosen.length >= top) {
      break;
    }
  }

  const rng = rngOf('select', label);
  const perturbed: Genome[] = [];

  for (const item of chosen) {
    for (let i = 0; i < count; i++) {
      perturbed.push(perturbGenome(ctx, item.genome, rng));
    }
  }

  const results = perturbed.length > 0 ? await runner.genomes(perturbed, cls) : [];
  const b5DD = ctx.spec.b5Run.minuteDD;
  const ddCap = Math.min(thresholds.minuteDD, b5DD + thresholds.minuteOverB5);
  const candidates: Candidate[] = chosen.map((item, index) => {
    const own = results.slice(index * count, (index + 1) * count);
    const deltas = own.map((e) => e.delta).sort((a, b) => a - b);
    const positive = own.filter(
      (e) => e.delta > 0 && e.minuteDD <= ddCap && e.dailyDD <= thresholds.dailyDD && !e.roleFailure
    ).length;

    return {
      key: item.evaluation.key,
      structure: structureKey(item.genome),
      genome: item.genome,
      evaluation: item.evaluation,
      perturbations: {
        median: quantile(deltas, 0.5),
        p10: quantile(deltas, 0.1),
        positiveShare: own.length ? positive / own.length : 0,
        n: own.length,
        deltas
      }
    };
  });
  const qualifying = candidates
    .filter((c) => c.perturbations.median >= 5000 && c.perturbations.positiveShare >= 0.6)
    .sort(robustOrder);
  const pick = qualifying[0] ?? null;
  const sRaw = ordered[0] ?? null;
  const risk = (e: Evaluation) => e.delta - 2 * Math.max(0, e.minuteDD - b5DD);
  const sRisk =
    [...feasible].sort(
      (a, b) => risk(b.evaluation) - risk(a.evaluation) || (a.evaluation.key < b.evaluation.key ? -1 : 1)
    )[0] ?? null;

  return {
    label,
    cls,
    evaluated: items.length,
    feasible: feasible.length,
    candidates,
    pick,
    noFill: pick === null,
    sRaw,
    sRisk,
    perturbationEvaluations: results.length
  };
};

export const describeGenome = (g: Genome) => ({
  deep: g.deep.map((book) => ({
    id: book.id,
    symbol: book.symbol,
    origin: book.origin,
    deepMode: book.deepMode ?? null,
    grid: book.grid,
    gridKey: gridKey(book.grid)
  })),
  shallow: g.shallow.map((book, rank) => ({
    id: book.id,
    symbol: book.symbol,
    rank,
    origin: book.origin,
    grid: book.grid,
    gridKey: gridKey(book.grid)
  })),
  policy: g.policy,
  key: genomeKey(g)
});
