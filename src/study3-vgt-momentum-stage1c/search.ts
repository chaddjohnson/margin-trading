// The Stage 1c search mechanics (PROTOCOL.md §7): per cell a digitally shifted Sobol design plus reference points,
// trade-path-distinct centers scored by their joint neighbourhood (J17 in the first pass, completed to J33 in deep
// cells) and a 10 bps check, deep refinement (Sobol continuation on the pair's possibly widened box, local refinement,
// shortlist), and the fixed-parent rule-only search. Common random numbers: every cell of a pair (entry, exit,
// contract) draws from pair-level streams over the pair's full dimension list (entry, exit, then the four rule slots
// a.N, b.C, c.X, c.Y) and uses its active dimensions only, so a masked vector's entry/exit values equal those of the
// 000 cell's vector with the same index. Cells are processed in groups that keep the worker pool busy; grouping never
// changes a result. Every evaluation is streamed to the history's archive.
import fs from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import { mulberry32 } from '../study3-vgt-momentum/engine.ts';
import type { Params } from '../study3-vgt-momentum/signals.ts';
import { sobolPoints } from '../study3-vgt-momentum-stage1b/sobol.ts';
import {
  type Dim,
  type Key,
  defaultsOf,
  dimsOf,
  fromUnit,
  isDiscrete,
  keyOf,
  keyString,
  policyFromKey,
  quantizeDim
} from './catalog.ts';
import { type MatrixCell, matrix, search, seedOf } from './context.ts';
import { type Summary, bothOk, feasibleCenter, median, rodOf } from './metrics.ts';
import type { Pool } from './pool.ts';
import type { Policy, RunOptions } from './types.ts';

export interface Point {
  index: number;
  stage: string;
  values: Params;
  summary: Summary;
}

export interface Scored {
  index: number;
  values: Params;
  policy: string;
  summary: Summary;
  tenBpsNet: number;
  draws: number; // joint draws in the neighbourhood (16 in the first pass, 32 in deep cells)
  neighbourhood: { net: number; minuteDd: number }[]; // the center and its draws
  phi: number;
  rod: number;
  netScore: number;
}

// The four rule slots, always last in a pair's dimension list.
export const ruleSlots: Dim[] = (['A', 'B', 'C'] as const).flatMap((rule) =>
  matrix.rules[rule].dims.map((d) => ({ ...d, name: `${rule.toLowerCase()}.${d.name}`, span: d.hi - d.lo }))
);

// One cell's search state inside a history.
export class CellState {
  readonly dims: Dim[]; // the searched dimensions (matrix order)
  readonly pairDims: Dim[]; // the pair's full list (entry, exit, four rule slots); random streams run over it
  readonly active: number[]; // positions of `dims` in `pairDims`
  readonly memo = new Map<string, Summary>();
  readonly byVector = new Map<string, Point>();
  readonly points: Point[] = [];
  readonly scored = new Map<number, Scored>();
  box: Record<string, { lo: number; hi: number }> = {}; // the deep stage's widened edges (shared by the pair's masks)
  evaluations = 0;
  duplicates = 0;
  stages: Record<string, { planned: number; evaluated: number; duplicates: number }> = {};

  constructor(
    readonly cell: MatrixCell,
    readonly key: string = cell.key, // the archive key
    readonly streamKey: string = `${cell.entry}|${cell.exit}|${cell.contract}`, // the pair-level random-stream label
    readonly fixed: Params = {}, // fixed-parent: entry and exit values held at the parent's
    dims?: Dim[],
    pairDims?: Dim[]
  ) {
    this.dims = dims ?? dimsOf(cell);
    this.pairDims = pairDims ?? [
      ...this.dims.filter((d) => d.name.startsWith('e.') || d.name.startsWith('x.')),
      ...ruleSlots
    ];
    this.active = this.dims.map((d) => {
      const i = this.pairDims.findIndex((p) => p.name === d.name);

      if (i < 0) {
        throw new Error(`${this.key}: ${d.name} is not a pair dimension`);
      }

      return i;
    });
  }

  policyKey(values: Params): Key {
    return keyOf(this.cell, { ...this.fixed, ...values });
  }

  // A unit vector over the pair's dimensions → this cell's vector (active dimensions, the widened box if asked).
  vectorOf(u: number[], widened = false): Params {
    return Object.fromEntries(
      this.active.map((i) => {
        const dim = this.pairDims[i]!;
        const box = widened ? this.box[dim.name] : undefined;

        return [dim.name, fromUnit(box ? { ...dim, ...box } : dim, u[i]!)];
      })
    );
  }

  // A point uniform in ±radius of each declared range around a center (discrete dimensions kept), clamped to the
  // (possibly widened) box and quantised; u runs over the pair's dimensions.
  around(center: Params, radius: number, u: number[]): Params {
    return Object.fromEntries(
      this.active.map((i) => {
        const dim = this.pairDims[i]!;

        if (isDiscrete(dim)) {
          return [dim.name, center[dim.name]!];
        }

        const box = this.box[dim.name] ?? dim;
        const value = center[dim.name]! + (2 * u[i]! - 1) * radius * dim.span;

        return [dim.name, quantizeDim({ ...dim, ...box }, Math.min(box.hi, Math.max(box.lo, value)))];
      })
    );
  }

  // The joint draws of a center: one mulberry32 stream per (pair, center index) over the pair's dimensions.
  jointDraws(history: string, center: Point, count: number, radius: number) {
    const random = mulberry32(seedOf(`study3c|${history}|${this.streamKey}|joint|${center.index}`));

    return Array.from({ length: count }, () =>
      this.around(
        center.values,
        radius,
        this.pairDims.map(() => random())
      )
    );
  }
}

const vectorKey = (v: Params) => JSON.stringify(v);

// Feasible, trade-path-distinct points, alternately best by development net and by center RoD (net first), until
// byNet + byRod points (PROTOCOL.md §7.1; Stage 1b's rule).
export const distinctBest = <T extends { index: number; summary: Summary }>(
  rows: T[],
  byNet: number,
  byRod: number
): T[] => {
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

export const championOf = (scored: Iterable<Scored>, score: 'rod' | 'netScore') =>
  [...scored]
    .filter((s) => s.phi >= search.championFeasibility && s.tenBpsNet > 0)
    .sort((a, b) => b[score] - a[score] || a.index - b.index)[0];

// The archive: one gzip JSON line per evaluation (money rounded to cents; selection uses full precision in memory).
export const archiveColumns = [
  'cell',
  'stage',
  'index',
  'costBps',
  'values',
  'net',
  'minuteDd',
  'dailyDd',
  'trades',
  'closedTrades',
  'ownExits',
  'losingTrades',
  'campaigns',
  'reentries',
  'yearsHeld',
  'sessionsLong',
  'avgGross',
  'peakGross',
  'interest',
  'priceGain',
  'friction',
  'worstTrade',
  'bestTrade',
  'aChecks',
  'aDue',
  'aExits',
  'aCancelled',
  'bBlocks',
  'cBlocks',
  'bcBoth',
  'cFillsBelow',
  'pathHash',
  'yearly',
  'exits'
] as const;

const cents = (x: number) => Math.round(x * 100) / 100;

export class Archive {
  private gzip = createGzip({ level: 6 });
  private out: fs.WriteStream;
  rows = 0;

  constructor(readonly file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.out = fs.createWriteStream(file);
    this.gzip.pipe(this.out);
  }

  write(cell: string, stage: string, index: number, costBps: number, values: Params, s: Summary) {
    const row = [
      cell,
      stage,
      index,
      costBps,
      Object.values(values),
      cents(s.net),
      cents(s.minuteDd),
      cents(s.dailyDd),
      s.trades,
      s.closedTrades,
      s.ownExits,
      s.losingTrades,
      s.campaigns,
      s.reentries,
      s.yearsHeld,
      s.sessionsLong,
      Math.round(s.avgGross),
      Math.round(s.peakGross),
      cents(s.interest),
      cents(s.priceGain),
      cents(s.friction),
      cents(s.worstTrade),
      cents(s.bestTrade),
      s.aChecks,
      s.aDue,
      s.aExits,
      s.aCancelled,
      s.bBlocks,
      s.cBlocks,
      s.bcBoth,
      s.cFillsBelow,
      s.pathHash,
      s.yearly.map(cents),
      s.exits
    ];

    this.rows++;
    return this.gzip.write(`${JSON.stringify(row)}\n`);
  }

  async drain() {
    await new Promise<void>((resolve) => this.gzip.once('drain', resolve));
  }

  async close() {
    await new Promise<void>((resolve, reject) => {
      this.out.once('finish', resolve);
      this.out.once('error', reject);
      this.gzip.end();
    });
  }
}

interface Item {
  state: CellState;
  stage: string;
  index: number;
  values: Params;
  costBps: number;
}

// One evaluator per history: memoised evaluations per cell, the archive, the counts.
export class Evaluator {
  evaluations = 0;
  duplicates = 0;

  constructor(
    readonly pool: Pool,
    readonly history: string,
    readonly options: RunOptions,
    readonly archive?: Archive
  ) {}

  // Evaluates the items (memo hits are duplicates), archives the new ones, returns a summary per item.
  async evaluate(items: Item[]): Promise<Summary[]> {
    const todo: { item: Item; memoKey: string; policy: Policy }[] = [];
    const pendingKeys = new Map<string, number>();
    const keys = items.map((item) => {
      const key = item.state.policyKey(item.values);
      const memoKey = `${keyString(key)}|${item.costBps}`;
      const stage = (item.state.stages[item.stage] ??= { planned: 0, evaluated: 0, duplicates: 0 });

      stage.planned++;

      if (!item.state.memo.has(memoKey) && !pendingKeys.has(`${item.state.key}#${memoKey}`)) {
        pendingKeys.set(`${item.state.key}#${memoKey}`, todo.length);
        todo.push({ item, memoKey, policy: policyFromKey(key) });
      } else {
        item.state.duplicates++;
        stage.duplicates++;
        this.duplicates++;
      }

      return memoKey;
    });
    const summaries = await this.pool.run(
      todo.map((t) => ({ schedule: t.policy, options: { ...this.options, costBps: t.item.costBps } }))
    );

    for (let i = 0; i < todo.length; i++) {
      const { item, memoKey } = todo[i]!;
      const summary = summaries[i]!;

      item.state.memo.set(memoKey, summary);
      item.state.evaluations++;
      item.state.stages[item.stage]!.evaluated++;
      this.evaluations++;

      if (
        this.archive &&
        !this.archive.write(item.state.key, item.stage, item.index, item.costBps, item.values, summary)
      ) {
        await this.archive.drain();
      }
    }

    return items.map((item, i) => item.state.memo.get(keys[i]!)!);
  }

  // Adds evaluated points to their cells (one point per distinct vector; the first index is kept).
  async addPoints(items: Item[]) {
    const fresh = items.filter((item) => {
      const key = vectorKey(item.values);

      return !item.state.byVector.has(key);
    });
    const seen = new Set<string>();
    const unique = fresh.filter((item) => {
      const key = `${item.state.key}#${vectorKey(item.values)}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
    const duplicateCount = items.length - unique.length;
    const summaries = await this.evaluate(unique);

    unique.forEach((item, i) => {
      const point = { index: item.index, stage: item.stage, values: item.values, summary: summaries[i]! };

      item.state.byVector.set(vectorKey(item.values), point);
      item.state.points.push(point);
    });

    // vectors already present count as duplicates of their stage
    for (const item of items) {
      if (!unique.includes(item)) {
        const stage = (item.state.stages[item.stage] ??= { planned: 0, evaluated: 0, duplicates: 0 });

        stage.planned++;
        stage.duplicates++;
        item.state.duplicates++;
        this.duplicates++;
      }
    }

    return duplicateCount;
  }

  // Scores centers by their joint neighbourhood (the first `joint` draws of the center's stream) and the 10 bps
  // center in one batch; a center already scored with at least as many draws is reused, otherwise (re)scored — the
  // draws it shares with an earlier score are memo hits.
  async scoreCenters(requests: { state: CellState; center: Point; radius: number; joint: number }[]) {
    const work = requests.filter((r) => (r.state.scored.get(r.center.index)?.draws ?? -1) < r.joint);
    const items: Item[] = [];
    const plan: { request: (typeof work)[number]; count: number; from: number }[] = [];

    for (const request of work) {
      const draws = request.state.jointDraws(this.history, request.center, request.joint, request.radius);

      plan.push({ request, count: draws.length, from: items.length });
      draws.forEach((values, j) =>
        items.push({
          state: request.state,
          stage: 'joint',
          index: 1e6 + 1000 * request.center.index + j,
          values,
          costBps: this.options.costBps
        })
      );
      items.push({
        state: request.state,
        stage: 'joint-10bps',
        index: request.center.index,
        values: request.center.values,
        costBps: search.tenBps
      });
    }

    const summaries = await this.evaluate(items);

    for (const { request, count, from } of plan) {
      const neighbourhood = [request.center.summary, ...summaries.slice(from, from + count)].map((s) => ({
        net: s.net,
        minuteDd: s.minuteDd
      }));
      const scored: Scored = {
        index: request.center.index,
        values: request.center.values,
        policy: policyFromKey(request.state.policyKey(request.center.values)).id,
        summary: request.center.summary,
        tenBpsNet: summaries[from + count]!.net,
        draws: count,
        neighbourhood,
        phi: neighbourhood.filter(bothOk).length / neighbourhood.length,
        rod: median(neighbourhood.map(rodOf)),
        netScore: median(neighbourhood.map((n) => n.net))
      };

      request.state.scored.set(request.center.index, scored);
    }
  }
}

const referencePoints = (state: CellState): { index: number; values: Params }[] => {
  const defaults = defaultsOf(state.dims);
  const refs = [{ index: search.indices.reference, values: defaults }];

  if (state.dims.some((d) => d.name === 'a.N')) {
    refs.push({ index: search.indices.referenceN8, values: { ...defaults, 'a.N': 8 } });
  }

  return refs;
};

const sobolOf = (history: string, state: CellState, label: string, count: number) =>
  sobolPoints(state.pairDims.length, count, seedOf(`study3c|${history}|${state.streamKey}|${label}`));

// First pass (PROTOCOL.md §7.2) for a group of cells: 256 Sobol points + references, 4 centers × J17.
export const firstPass = async (evaluator: Evaluator, states: CellState[]) => {
  const f = search.firstPass;
  const items: Item[] = [];

  for (const state of states) {
    sobolOf(evaluator.history, state, 'global', f.global).forEach((u, index) =>
      items.push({ state, stage: 'global', index, values: state.vectorOf(u), costBps: evaluator.options.costBps })
    );

    for (const ref of referencePoints(state)) {
      items.push({
        state,
        stage: 'reference',
        index: ref.index,
        values: ref.values,
        costBps: evaluator.options.costBps
      });
    }
  }

  await evaluator.addPoints(items);
  await evaluator.scoreCenters(
    states.flatMap((state) =>
      distinctBest(state.points, f.centers.byNet, f.centers.byRod).map((center) => ({
        state,
        center,
        radius: f.jointRadius,
        joint: f.joint
      }))
    )
  );
};

// Deep refinement (PROTOCOL.md §7.3) for a group of cells already through their first pass (their `box` set).
export const deepPass = async (evaluator: Evaluator, states: CellState[]) => {
  const d = search.deep;
  const globalItems: Item[] = [];

  for (const state of states) {
    sobolOf(evaluator.history, state, 'global', d.globalFrom + d.global)
      .slice(d.globalFrom)
      .forEach((u, j) =>
        globalItems.push({
          state,
          stage: 'deep-global',
          index: d.globalFrom + j,
          values: state.vectorOf(u, true),
          costBps: evaluator.options.costBps
        })
      );
  }

  await evaluator.addPoints(globalItems);

  const localItems: Item[] = [];

  for (const state of states) {
    const seeds = distinctBest(state.points, d.localSeeds.byNet, d.localSeeds.byRod);

    seeds.forEach((seed, k) => {
      sobolOf(evaluator.history, state, `local|${k}`, d.localPerSeed).forEach((u, j) =>
        localItems.push({
          state,
          stage: 'local',
          index: search.indices.local + d.localPerSeed * k + j,
          values: state.around(seed.values, d.localRadius, u),
          costBps: evaluator.options.costBps
        })
      );
    });
  }

  await evaluator.addPoints(localItems);

  // the shortlist and every first-pass center, all with J33
  await evaluator.scoreCenters(
    states.flatMap((state) => {
      const centers = new Map<number, Point>();

      for (const point of distinctBest(state.points, d.shortlist.byNet, d.shortlist.byRod)) {
        centers.set(point.index, point);
      }

      for (const scored of state.scored.values()) {
        centers.set(
          scored.index,
          state.points.find((p) => p.index === scored.index)!
        );
      }

      return [...centers.values()].map((center) => ({ state, center, radius: d.jointRadius, joint: d.joint }));
    })
  );
};

// Fixed-parent rule-only search (PROTOCOL.md §7.4): the parent's entry and exit values fixed, only the rule
// dimensions searched (CRN across masks over the four rule slots); returns the RoD champion or undefined.
export const fixedParentPass = async (evaluator: Evaluator, state: CellState) => {
  const f = search.fixedParent;
  const items: Item[] = sobolOf(evaluator.history, state, 'global', f.global).map((u, j) => ({
    state,
    stage: 'fp-global',
    index: search.indices.fixedParent + j,
    values: state.vectorOf(u),
    costBps: evaluator.options.costBps
  }));

  for (const ref of referencePoints(state)) {
    items.push({
      state,
      stage: 'fp-reference',
      index: ref.index,
      values: ref.values,
      costBps: evaluator.options.costBps
    });
  }

  await evaluator.addPoints(items);
  await evaluator.scoreCenters(
    distinctBest(state.points, f.centers.byNet, f.centers.byRod).map((center) => ({
      state,
      center,
      radius: f.jointRadius,
      joint: f.joint
    }))
  );

  return championOf(state.scored.values(), 'rod');
};
