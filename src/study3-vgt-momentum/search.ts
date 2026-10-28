// M1 gates, the M3 search and the selection rule of PROTOCOL.md §7–§8, for one history's development data. Every
// evaluation goes through `evaluate`, which counts it against the code-enforced caps; every evaluated point is
// returned for the archive. Nothing here reads data beyond the Engine it is given.
import type { Dataset } from '../four-family/data.ts';
import { search as budget, seedOf, study, testRoot } from './context.ts';
import { Engine, type RunOptions, type StrategySpec } from './engine.ts';
import { type Summary, median, summarise } from './metrics.ts';
import { sobolPoints } from './sobol.ts';
import { type FamilyId, type ParamSpec, defaultParams, families, quantize } from './signals.ts';
import { type Candidate, type ExitKey, candidateId, defaultCandidate, panelSpec, templateSpec } from './specs.ts';

export interface Dim extends ParamSpec {
  role: 'family' | 'h' | 't';
}

export const templateDims: Dim[] = [
  { name: 'h', lo: 0.03, hi: 0.15, q: 0.001, default: 0.08, role: 'h' },
  { name: 't', lo: 0.04, hi: 0.3, q: 0.001, default: 0.1, role: 't' }
];

export const dimsOf = (family: FamilyId): Dim[] => [
  ...families[family].params.map((spec) => ({ ...spec, role: 'family' as const })),
  ...templateDims
];

// The search sizes: the frozen budget; only the synthetic dry run in the tests (under its scratch root) may lower them.
export const limits = {
  global: budget.global as number,
  localSeeds: budget.localSeeds as number,
  localPerSeed: budget.localPerSeed as number,
  shortlist: budget.shortlist as number
};

export const setTestLimits = (value: Partial<typeof limits>) => {
  if (!testRoot) {
    throw new Error('search limits can only be lowered under the test root');
  }

  Object.assign(limits, value);
};

export const plannedPerFamily = (family: FamilyId) =>
  limits.global + limits.localSeeds * limits.localPerSeed + 32 * dimsOf(family).length + limits.shortlist;

const roundHalfAway = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

export const fromUnit = (dim: Dim, u: number) =>
  dim.q === 1
    ? Math.min(dim.hi, Math.floor(dim.lo + u * (dim.hi - dim.lo + 1)))
    : quantize(dim.lo + u * (dim.hi - dim.lo), dim);

export const candidateOf = (family: FamilyId, values: number[]): Candidate => {
  const dims = dimsOf(family);
  const params: Record<string, number> = {};
  let h = 0.08;
  let t = 0.1;

  dims.forEach((dim, i) => {
    if (dim.role === 'family') {
      params[dim.name] = values[i]!;
    } else if (dim.role === 'h') {
      h = values[i]!;
    } else {
      t = values[i]!;
    }
  });

  return { family, params, h, t };
};

export const valuesOf = (c: Candidate) =>
  dimsOf(c.family).map((dim) => (dim.role === 'family' ? c.params[dim.name]! : dim.role === 'h' ? c.h : c.t));

export interface Feasibility {
  dd: boolean;
  trades: boolean;
  campaigns: boolean;
  years: boolean;
  net: boolean;
  all: boolean;
}

export const feasibilityOf = (s: Summary): Feasibility => {
  const f = {
    dd: s.minuteDrawdown <= study.ddReference,
    trades: s.closed >= study.minClosedTrades,
    campaigns: s.campaigns >= 3,
    years: s.yearsHeld >= study.minEntryYears,
    net: s.net > 0
  };

  return { ...f, all: f.dd && f.trades && f.campaigns && f.years && f.net };
};

export interface ArchiveRow {
  family: FamilyId;
  history: string;
  stage: 'global' | 'local' | 'neighbourhood' | 'tenBps';
  index: number; // Sobol index, 1024 + 32k + j for local points, -1 for neighbourhood/tenBps points
  centre?: number; // the shortlisted centre's index (neighbourhood and tenBps rows)
  id: string;
  values: number[];
  summary: Summary;
  feasible: Feasibility;
}

export class Evaluator {
  count = 0;
  readonly cache = new Map<string, { summary: Summary; feasible: Feasibility }>();

  constructor(
    readonly engine: Engine,
    readonly ds: Dataset,
    readonly options: RunOptions,
    readonly cap: number
  ) {}

  run(spec: StrategySpec, options = this.options) {
    return summarise(this.ds, this.engine.run(spec, options), options.firstDecisionIndex, options.endIndex);
  }

  evaluate(c: Candidate, options = this.options) {
    const key = `${candidateId(c)}|${options.costBps}`;
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    if (this.count >= this.cap) {
      throw new Error(`evaluation cap ${this.cap} reached for ${c.family}`);
    }

    this.count++;

    const summary = this.run(templateSpec(c), options);
    const value = { summary, feasible: feasibilityOf(summary) };

    this.cache.set(key, value);
    return value;
  }
}

// ----- M1 -----

export interface GateRecord {
  family: FamilyId;
  tpl: Summary;
  nets: Record<'OX' | 'CX1' | 'CX2' | 'TPL', number>;
  g1: boolean;
  g2: boolean;
  g3: boolean;
  g4: boolean;
  pass: boolean;
}

export const gateOf = (family: FamilyId, panel: Record<string, Summary>): GateRecord => {
  // panel ids are panelSpec ids: <family>/<exit>/R3F/Z0
  const at = (exit: string) => {
    const summary = panel[`${family}/${exit}/R3F/Z0`];

    if (!summary) {
      throw new Error(`the M1 panel has no ${family}/${exit}`);
    }

    return summary;
  };
  const tpl = at('TPL');
  const nets = { OX: at('OX').net, CX1: at('CX1').net, CX2: at('CX2').net, TPL: tpl.net };
  const g1 = tpl.closed >= study.minClosedTrades && tpl.campaigns >= 3;
  const g2 = tpl.yearsHeld >= study.minEntryYears;
  const g3 = tpl.minuteDrawdown <= study.gateDdLimit;
  const g4 = Object.values(nets).some((net) => net > 0);

  return { family, tpl, nets, g1, g2, g3, g4, pass: g1 && g2 && g3 && g4 };
};

export const panelExits: ExitKey[] = ['OX', 'CX1', 'CX2', 'TPL'];

// ----- M3 -----

export interface ShortlistEntry {
  index: number;
  id: string;
  values: number[];
  summary: Summary;
  neighbours: { values: number[]; net: number; feasible: boolean; dd: number }[];
  neighbourhoodMedian: number;
  neighbourhoodFeasibility: number;
  tenBpsNet: number;
  onBoundary: string[];
  qualifies: boolean;
}

export interface FamilySearch {
  family: FamilyId;
  history: string;
  dims: Dim[];
  seed: number;
  planned: number;
  evaluations: number;
  feasibleCount: number;
  shortlist: ShortlistEntry[];
  champion?: ShortlistEntry;
  archive: ArchiveRow[];
}

const stepOf = (dim: Dim, fraction: number) =>
  dim.q === 1 ? Math.max(1, roundHalfAway(fraction * (dim.hi - dim.lo))) : fraction * (dim.hi - dim.lo);

const clampQ = (dim: Dim, value: number) =>
  dim.q === 1 ? Math.min(dim.hi, Math.max(dim.lo, Math.round(value))) : quantize(value, dim);

// The one-at-a-time neighbours of a centre: ±step per dimension; a point clamped onto the centre moves one more step
// inward (the + side to centre − 2 steps, the − side to centre + 2 steps) and is dropped if that also coincides or
// leaves the box.
export const neighboursOf = (dims: Dim[], centre: number[], fraction: number) => {
  const points: number[][] = [];

  dims.forEach((dim, i) => {
    const step = stepOf(dim, fraction);

    for (const sign of [1, -1]) {
      let value = clampQ(dim, centre[i]! + sign * step);

      if (value === centre[i]) {
        const inward = centre[i]! - sign * 2 * step;

        if (inward < dim.lo - 1e-12 || inward > dim.hi + 1e-12) {
          continue;
        }

        value = clampQ(dim, inward);

        if (value === centre[i]) {
          continue;
        }
      }

      const point = [...centre];

      point[i] = value;
      points.push(point);
    }
  });

  return points;
};

export const searchFamily = (evaluator: Evaluator, family: FamilyId, history: string): FamilySearch => {
  const dims = dimsOf(family);
  const seed = seedOf(`study3|${family}|${history}|global`);
  const archive: ArchiveRow[] = [];
  const start = evaluator.count;
  const record = (stage: ArchiveRow['stage'], index: number, values: number[], tenBps = false, centre?: number) => {
    const c = candidateOf(family, values);
    const value = tenBps
      ? evaluator.evaluate(c, { ...evaluator.options, costBps: budget.tenBps })
      : evaluator.evaluate(c);

    archive.push({ family, history, stage, index, centre, id: candidateId(c), values, ...value });
    return value;
  };

  // Global stage (identical quantised vectors evaluate once; the first index keeps them).
  const points = sobolPoints(dims.length, limits.global, seed);
  const seen = new Set<string>();
  const pool: { index: number; values: number[]; summary: Summary; feasible: boolean }[] = [];

  points.forEach((u, index) => {
    const values = dims.map((dim, i) => fromUnit(dim, u[i]!));
    const key = values.join(',');

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    const { summary, feasible } = record('global', index, values);

    pool.push({ index, values, summary, feasible: feasible.all });
  });

  const rank = (rows: typeof pool) =>
    rows.filter((row) => row.feasible).sort((a, b) => b.summary.net - a.summary.net || a.index - b.index);
  const distinct = (rows: typeof pool, count: number) => {
    const paths = new Set<string>();
    const out: typeof pool = [];

    for (const row of rows) {
      if (!paths.has(row.summary.pathHash)) {
        paths.add(row.summary.pathHash);
        out.push(row);

        if (out.length === count) {
          break;
        }
      }
    }

    return out;
  };

  // Local refinement around the 4 best feasible, trade-path-distinct points.
  distinct(rank(pool), limits.localSeeds).forEach((anchor, k) => {
    const local = sobolPoints(dims.length, limits.localPerSeed, seedOf(`study3|${family}|${history}|local|${k}`));

    local.forEach((u, j) => {
      const values = dims.map((dim, i) => {
        const radius = budget.localRadius * (dim.hi - dim.lo);

        return clampQ(dim, anchor.values[i]! + (2 * u[i]! - 1) * radius);
      });
      const key = values.join(',');

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      const index = limits.global + 32 * k + j;
      const { summary, feasible } = record('local', index, values);

      pool.push({ index, values, summary, feasible: feasible.all });
    });
  });

  // Shortlist, neighbourhoods and the 10 bps re-simulation.
  const shortlisted = distinct(rank(pool), limits.shortlist);
  const shortlist: ShortlistEntry[] = shortlisted.map((row) => {
    const neighbours = neighboursOf(dims, row.values, budget.neighbourhoodStep).map((values) => {
      const { summary, feasible } = record('neighbourhood', -1, values, false, row.index);

      return {
        values,
        net: summary.net,
        feasible: summary.minuteDrawdown <= study.ddReference && summary.net > 0,
        dd: summary.minuteDrawdown,
        all: feasible.all
      };
    });
    const nets = [row.summary.net, ...neighbours.map((n) => n.net)];
    const feasibleShare = (1 + neighbours.filter((n) => n.feasible).length) / (1 + neighbours.length); // the centre is feasible
    const tenBps = record('tenBps', -1, row.values, true, row.index).summary.net;
    const onBoundary = dims
      .filter((dim, i) => row.values[i] === dim.lo || row.values[i] === dim.hi)
      .map((dim) => dim.name);
    const neighbourhoodMedian = median(nets);

    return {
      index: row.index,
      id: candidateId(candidateOf(family, row.values)),
      values: row.values,
      summary: row.summary,
      neighbours: neighbours.map(({ values, net, feasible, dd }) => ({ values, net, feasible, dd })),
      neighbourhoodMedian,
      neighbourhoodFeasibility: feasibleShare,
      tenBpsNet: tenBps,
      onBoundary,
      qualifies: feasibleShare >= budget.neighbourhoodFeasibility && tenBps > 0
    };
  });
  const champion = shortlist
    .filter((entry) => entry.qualifies)
    .sort((a, b) => b.neighbourhoodMedian - a.neighbourhoodMedian || a.index - b.index)[0];

  return {
    family,
    history,
    dims,
    seed,
    planned: plannedPerFamily(family),
    evaluations: evaluator.count - start,
    feasibleCount: pool.filter((row) => row.feasible).length,
    shortlist,
    champion,
    archive
  };
};

// P*: the family champion with the highest neighbourhood median (ties by family ID).
export const procedurePick = (searches: FamilySearch[]) =>
  searches
    .filter((s) => s.champion)
    .sort(
      (a, b) => b.champion!.neighbourhoodMedian - a.champion!.neighbourhoodMedian || (a.family < b.family ? -1 : 1)
    )[0];

// P0: the M1-passing family whose TPL default has the highest development net.
export const noSearchPick = (gates: GateRecord[]) =>
  gates.filter((g) => g.pass).sort((a, b) => b.tpl.net - a.tpl.net || (a.family < b.family ? -1 : 1))[0];

export { defaultCandidate, defaultParams, panelSpec };
