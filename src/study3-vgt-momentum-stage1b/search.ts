// The layered search mechanics (PROTOCOL.md §7.1): a cell (entry × exit family with the dimensions searched, a fixed
// re-entry rule and sizing) is searched by a digitally shifted Sobol design, local refinement around the best
// feasible trade-path-distinct points, a shortlist, and a joint neighbourhood J32 around each shortlisted center;
// champions by RoD (primary) and NET (secondary). Every evaluated point is archived. Evaluations are memoised by
// (policy key, options key), so a repeated vector is evaluated once and counted once.
import { mulberry32 } from '../study3-vgt-momentum/engine.ts';
import type { Params } from '../study3-vgt-momentum/signals.ts';
import {
  type Dim,
  type EntryId,
  type ExitFamily,
  type PolicyKey,
  exitBoxes,
  fromUnit,
  isDiscrete,
  policyKeyString,
  policyOf,
  quantizeDim
} from './catalog.ts';
import { search, seedOf } from './context.ts';
import { type Summary, bothOk, feasibleCenter, median, rodOf } from './metrics.ts';
import type { Pool } from './pool.ts';
import { sobolPoints } from './sobol.ts';
import type { Policy, ReentryRule, RunOptions, SizingSpec } from './types.ts';

export interface ArchiveRow {
  history: string;
  cell: string;
  index: number;
  stage: string;
  policy: string;
  values: Params;
  costBps: number;
  summary: Summary;
}

// One evaluator per history: memoised evaluations, the archive and the count.
export class Evaluator {
  private memo = new Map<string, Summary>();
  archive: ArchiveRow[] = [];
  evaluations = 0;
  duplicates = 0;

  constructor(
    readonly pool: Pool,
    readonly history: string,
    readonly options: RunOptions
  ) {}

  async evaluate(
    cell: string,
    stage: string,
    items: { key: PolicyKey; values: Params; index: number }[],
    costBps = this.options.costBps
  ): Promise<{ policy: Policy; summary: Summary; index: number; values: Params }[]> {
    const todo: { memoKey: string; policy: Policy; index: number; values: Params }[] = [];
    const seen = new Set<string>();
    const prepared = items.map((item) => {
      const policy = policyOf(item.key);
      const memoKey = `${policyKeyString(item.key)}|${costBps}`;

      if (!this.memo.has(memoKey) && !seen.has(memoKey)) {
        seen.add(memoKey);
        todo.push({ memoKey, policy, index: item.index, values: item.values });
      } else {
        this.duplicates++;
      }

      return { ...item, policy, memoKey };
    });
    const summaries = await this.pool.run(
      todo.map((t) => ({ schedule: t.policy, options: { ...this.options, costBps } }))
    );

    todo.forEach((t, i) => {
      const summary = summaries[i]!;

      this.memo.set(t.memoKey, summary);
      this.evaluations++;
      this.archive.push({
        history: this.history,
        cell,
        index: t.index,
        stage,
        policy: t.policy.id,
        values: t.values,
        costBps,
        summary
      });
    });

    return prepared.map((item) => ({
      policy: item.policy,
      summary: this.memo.get(item.memoKey)!,
      index: item.index,
      values: item.values
    }));
  }
}

export interface CellSpec {
  key: string; // e.g. "LB|E06|XS" or "P01"
  entry: EntryId;
  entryDims: Dim[]; // searched entry dimensions (empty: entry fixed at `entryFixed`)
  entryFixed: Params;
  exit: ExitFamily;
  reentry: ReentryRule;
  sizing: SizingSpec;
  boxOverride?: Record<string, { lo: number; hi: number }>; // a widened exit box (§7.3)
}

// A dimension's `span` is the declared range used for the local and joint radii (a widened box keeps the original).
export const dimsOfCell = (cell: CellSpec): (Dim & { span: number })[] => [
  ...cell.entryDims.map((d) => ({ ...d, span: d.hi - d.lo, name: `e.${d.name}` })),
  ...exitBoxes[cell.exit].map((d) => ({
    ...d,
    ...(cell.boxOverride?.[d.name] ?? {}),
    span: d.hi - d.lo,
    name: `x.${d.name}`
  }))
];

// Natural limits of the exit parameters for the widening rule (fractions stay in [0.001, 0.95], ρ ≤ 1, …).
const naturalLimits = (name: string): [number, number] => {
  switch (name) {
    case 'rho':
      return [0.01, 1];
    case 'gamma':
      return [0, 5];
    case 'k':
      return [0.1, 20];
    case 'A':
    case 'G':
      return [500, 500000];
    case 'm':
      return [-0.5, 0.5];
    default:
      return [0.001, 0.95];
  }
};

// The predeclared widening (PROTOCOL.md §7.3): a continuous exit parameter of the RoD champion within 5% of the range
// from a non-zero edge moves that edge outward by 50% of the range (within the natural limits), once.
export const wideningOf = (cell: CellSpec, champion: { values: Params } | undefined) => {
  if (!champion || cell.boxOverride) {
    return undefined;
  }

  const override: Record<string, { lo: number; hi: number }> = {};

  for (const dim of exitBoxes[cell.exit]) {
    if (dim.q === 1) {
      continue;
    }

    const value = champion.values[`x.${dim.name}`]!;
    const range = dim.hi - dim.lo;
    const [minimum, maximum] = naturalLimits(dim.name);
    let lo = dim.lo;
    let hi = dim.hi;

    if (dim.lo !== 0 && value <= dim.lo + 0.05 * range) {
      lo = Math.max(minimum, quantizeDim({ ...dim, lo: minimum }, dim.lo - 0.5 * range));
    }

    // XF-T's upper trail edge is its purpose (a tight trail) and is never widened
    if (dim.hi !== 0 && value >= dim.hi - 0.05 * range && !(cell.exit === 'XF-T' && dim.name === 't')) {
      hi = Math.min(maximum, dim.hi + 0.5 * range);
    }

    if (lo < dim.lo - 1e-12 || hi > dim.hi + 1e-12) {
      override[dim.name] = { lo, hi };
    }
  }

  return Object.keys(override).length ? override : undefined;
};

export const keyOf = (cell: CellSpec, values: Params, reentry = cell.reentry, sizing = cell.sizing): PolicyKey => {
  const entryParams: Params = { ...cell.entryFixed };
  const exitParams: Params = {};

  for (const [name, value] of Object.entries(values)) {
    if (name.startsWith('e.')) {
      entryParams[name.slice(2)] = value;
    } else {
      exitParams[name.slice(2)] = value;
    }
  }

  return { entry: cell.entry, entryParams, exit: { family: cell.exit, params: exitParams }, reentry, sizing };
};

const vectorOf = (dims: Dim[], u: number[]): Params =>
  Object.fromEntries(dims.map((dim, i) => [dim.name, fromUnit(dim, u[i]!)]));

const vectorKey = (v: Params) => JSON.stringify(v);

// A point uniform in ±radius of each range around a center (discrete dimensions kept), clamped and quantised.
export const around = (dims: (Dim & { span?: number })[], center: Params, radius: number, u: number[]): Params =>
  Object.fromEntries(
    dims.map((dim, i) => {
      if (isDiscrete(dim)) {
        return [dim.name, center[dim.name]!];
      }

      const value = center[dim.name]! + (2 * u[i]! - 1) * radius * (dim.span ?? dim.hi - dim.lo);

      return [dim.name, quantizeDim(dim, Math.min(dim.hi, Math.max(dim.lo, value)))];
    })
  );

export const jointDraws = (
  dims: (Dim & { span?: number })[],
  center: Params,
  count: number,
  radius: number,
  seedLabel: string
) => {
  const random = mulberry32(seedOf(seedLabel));

  return Array.from({ length: count }, () =>
    around(
      dims,
      center,
      radius,
      dims.map(() => random())
    )
  );
};

export interface Scored {
  index: number;
  values: Params;
  policy: string;
  summary: Summary;
  tenBpsNet: number;
  neighbourhood: { net: number; minuteDd: number }[]; // the center and its draws
  phi: number;
  rod: number;
  netScore: number;
}

export interface CellResult {
  cell: string;
  dims: string[];
  planned: number;
  evaluated: number;
  globalPoints: number;
  globalDistinct: number;
  feasibleGlobal: number;
  bestTraining?: { index: number; values: Params; policy: string; net: number; minuteDd: number };
  shortlist: Scored[];
  rodChampion?: Scored;
  netChampion?: Scored;
}

// Feasible, trade-path-distinct points: `byNet` best by development net and `byRod` best by center RoD, taken
// alternately (net first) and de-duplicated by path until byNet + byRod points (PROTOCOL.md §7.1).
const distinctBest = <T extends { index: number; summary: Summary }>(rows: T[], byNet: number, byRod: number): T[] => {
  const feasible = rows.filter((row) => feasibleCenter(row.summary));
  const net = [...feasible].sort((a, b) => b.summary.net - a.summary.net || a.index - b.index);
  const rod = [...feasible].sort((a, b) => rodOf(b.summary) - rodOf(a.summary) || a.index - b.index);
  const picked: T[] = [];
  const paths = new Set<string>();
  let takenNet = 0;
  let takenRod = 0;
  let i = 0;
  let j = 0;

  while (takenNet + takenRod < byNet + byRod && (i < net.length || j < rod.length)) {
    const wantNet = takenNet < byNet && (takenNet <= takenRod || takenRod >= byRod || j >= rod.length);
    const list = wantNet ? net : rod;
    let row: T | undefined;

    while (wantNet ? i < net.length : j < rod.length) {
      const candidate = wantNet ? net[i++]! : rod[j++]!;

      if (!paths.has(candidate.summary.pathHash)) {
        row = candidate;
        break;
      }
    }

    if (row) {
      paths.add(row.summary.pathHash);
      picked.push(row);

      if (wantNet) {
        takenNet++;
      } else {
        takenRod++;
      }
    } else if (list === net) {
      takenNet = byNet; // exhausted
    } else {
      takenRod = byRod;
    }
  }

  return picked;
};

export const championOf = (shortlist: Scored[], score: 'rod' | 'netScore') =>
  shortlist
    .filter((s) => s.phi >= search.championFeasibility && s.tenBpsNet > 0)
    .sort((a, b) => b[score] - a[score] || a.index - b.index)[0];

// Scores a center: its J32 (the same draws for every variant of a center), φ, RoD and NET medians, 10 bps net.
export const scoreCenter = async (
  evaluator: Evaluator,
  cell: CellSpec,
  stage: string,
  center: { index: number; values: Params },
  draws: Params[],
  reentry = cell.reentry,
  sizing = cell.sizing
): Promise<Scored> => {
  const items = [center.values, ...draws].map((values, j) => ({
    key: keyOf(cell, values, reentry, sizing),
    values,
    index: center.index * 1000 + j
  }));
  const results = await evaluator.evaluate(cell.key, stage, items);
  const ten = await evaluator.evaluate(cell.key, `${stage}-10bps`, [items[0]!], search.tenBps);
  const neighbourhood = results.map((r) => ({ net: r.summary.net, minuteDd: r.summary.minuteDd }));

  return {
    index: center.index,
    values: center.values,
    policy: results[0]!.policy.id,
    summary: results[0]!.summary,
    tenBpsNet: ten[0]!.summary.net,
    neighbourhood,
    phi: neighbourhood.filter(bothOk).length / neighbourhood.length,
    rod: median(neighbourhood.map(rodOf)),
    netScore: median(neighbourhood.map((n) => n.net))
  };
};

// Global + local + 16 shortlisted centers × (32 joint draws + the 10 bps center); centers are already counted.
export const plannedPerCell = (global: number) =>
  global +
  search.exitCell.localSeeds * search.exitCell.localPerSeed +
  search.exitCell.shortlist * (search.exitCell.joint + 1);

// Global → local → shortlist → J32 → champions.
export const searchCell = async (
  evaluator: Evaluator,
  cell: CellSpec,
  budget: {
    global: number;
    localSeeds: number;
    localPerSeed: number;
    localRadius: number;
    shortlist: number;
    joint: number;
    jointRadius: number;
  }
): Promise<CellResult> => {
  const dims = dimsOfCell(cell);
  const history = evaluator.history;
  const before = evaluator.evaluations;
  const unit = sobolOf(dims.length, budget.global, seedOf(`study3b|${history}|${cell.key}|global`));
  const seen = new Map<string, number>();
  const globalItems: { key: PolicyKey; values: Params; index: number }[] = [];

  unit.forEach((u, index) => {
    const values = vectorOf(dims, u);
    const key = vectorKey(values);

    if (!seen.has(key)) {
      seen.set(key, index);
      globalItems.push({ key: keyOf(cell, values), values, index });
    }
  });

  const global = await evaluator.evaluate(cell.key, 'global', globalItems);
  const seeds = distinctBest(global, budget.localSeeds / 2, budget.localSeeds / 2);
  const localItems: { key: PolicyKey; values: Params; index: number }[] = [];

  seeds.forEach((seed, k) => {
    const points = sobolOf(dims.length, budget.localPerSeed, seedOf(`study3b|${history}|${cell.key}|local|${k}`));

    points.forEach((u, j) => {
      const values = around(dims, seed.values, budget.localRadius, u);

      if (!seen.has(vectorKey(values))) {
        seen.set(vectorKey(values), budget.global + budget.localPerSeed * k + j);
        localItems.push({ key: keyOf(cell, values), values, index: budget.global + budget.localPerSeed * k + j });
      }
    });
  });

  const local = await evaluator.evaluate(cell.key, 'local', localItems);
  const all = [...global, ...local];
  const shortlistRows = distinctBest(all, budget.shortlist / 2, budget.shortlist / 2);
  const shortlist: Scored[] = [];

  for (const row of shortlistRows) {
    const draws = jointDraws(
      dims,
      row.values,
      budget.joint,
      budget.jointRadius,
      `study3b|${history}|${cell.key}|joint|${row.index}`
    );

    shortlist.push(await scoreCenter(evaluator, cell, 'joint', row, draws));
  }

  const best = [...all].sort((a, b) => b.summary.net - a.summary.net || a.index - b.index)[0];

  return {
    cell: cell.key,
    dims: dims.map((d) => d.name),
    planned: plannedPerCell(budget.global),
    evaluated: evaluator.evaluations - before,
    globalPoints: unit.length,
    globalDistinct: globalItems.length,
    feasibleGlobal: global.filter((g) => feasibleCenter(g.summary)).length,
    bestTraining: best
      ? {
          index: best.index,
          values: best.values,
          policy: best.policy.id,
          net: best.summary.net,
          minuteDd: best.summary.minuteDd
        }
      : undefined,
    shortlist,
    rodChampion: championOf(shortlist, 'rod'),
    netChampion: championOf(shortlist, 'netScore')
  };
};

const sobolOf = (dimensions: number, count: number, seed: number) => sobolPoints(dimensions, count, seed);
