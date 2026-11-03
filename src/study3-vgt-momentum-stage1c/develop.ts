// One history's development (PROTOCOL.md §7): the first pass over every matrix cell (pairs together, so that each
// masked cell has its rule-off twin), the training-only deep allocation (the top pairs of every mask's list and of the
// NET list) with all eight masks of a deep pair refined alike on one widened box, the picks (P*, P*-NET, P*-<mask>)
// and the fixed-parent rule-only ablation (gated and forced). Only the history's development data is loaded; no rule
// here reads a window increment (the yearly increments in the archive are diagnostics).
import type { Dataset } from '../four-family/data.ts';
import type { Params } from '../study3-vgt-momentum/signals.ts';
import { type Dim, cellOf, pairKey, policyFromKey, quantizeDim } from './catalog.ts';
import {
  type HistoryKey,
  type Mask,
  type MatrixCell,
  cells,
  histories,
  log,
  masks,
  matrix,
  search
} from './context.ts';
import { defaultOptions } from './engine.ts';
import { feasibleCenter, quantile, rodOf } from './metrics.ts';
import type { Pool } from './pool.ts';
import {
  Archive,
  CellState,
  Evaluator,
  type Point,
  type Scored,
  championOf,
  deepPass,
  firstPass,
  fixedParentPass,
  ruleSlots
} from './search.ts';
import type { RunOptions } from './types.ts';

export const developmentOptions = (ds: Dataset, history: HistoryKey): RunOptions => {
  const first = ds.dates.indexOf(matrix.data.firstDecisionClose);
  const end = ds.dates.indexOf(histories[history].developmentEnd);

  if (first < 0 || end < 0) {
    throw new Error('development dates are not sessions of the data');
  }

  // the last session of each development year before the end: yearly increments for diagnostics only
  const windows: number[] = [first];

  for (let s = first; s < end; s++) {
    if (ds.dates[s]!.slice(0, 4) !== ds.dates[s + 1]!.slice(0, 4)) {
      windows.push(s);
    }
  }

  return { ...defaultOptions(first, end), windows };
};

export interface PickRecord {
  cell: string;
  key: ReturnType<CellState['policyKey']>;
  policy: string;
  score: number;
  champion: Scored;
}

const slimScored = (s: Scored) => ({
  index: s.index,
  values: s.values,
  policy: s.policy,
  draws: s.draws,
  rod: s.rod,
  netScore: s.netScore,
  phi: s.phi,
  tenBpsNet: s.tenBpsNet,
  center: s.summary,
  neighbourhood: s.neighbourhood
});

// Exit families for the deep-list caps: XF-T counts as XF; both contracts of a family count together.
const capFamily = (exit: string) => (exit === 'XF-T' ? 'XF' : exit);

const noChampionReason = (state: CellState) => {
  if (championOf(state.scored.values(), 'rod')) {
    return null;
  }

  if (!state.points.some((p) => feasibleCenter(p.summary))) {
    return 'no feasible point';
  }

  const scored = [...state.scored.values()];

  if (scored.every((s) => s.phi < search.championFeasibility)) {
    return 'phi';
  }

  if (scored.every((s) => s.tenBpsNet <= 0)) {
    return '10 bps';
  }

  return 'phi or 10 bps';
};

// Paired comparison of a masked cell's design points with its rule-off twins (same index in the pair's 000 cell).
const twinStats = (state: CellState, zero: CellState | undefined) => {
  if (!zero || state.cell.mask === '000') {
    return null;
  }

  // the twin of a masked vector is the 000 cell's point with the same entry/exit values (its projection)
  const projection = (values: Point['values']) =>
    JSON.stringify(Object.fromEntries(Object.entries(values).filter(([name]) => /^[ex]\./.test(name))));
  const pairs = state.points
    .filter((p) => p.stage === 'global' || p.stage === 'reference')
    .map((p) => [p, zero.byVector.get(projection(p.values))] as const)
    .filter((pair): pair is readonly [Point, Point] => pair[1] !== undefined);
  const dNet = pairs.map(([p, t]) => p.summary.net - t.summary.net);
  const dDd = pairs.map(([p, t]) => p.summary.minuteDd - t.summary.minuteDd);
  const dRod = pairs.map(([p, t]) => rodOf(p.summary) - rodOf(t.summary));
  // inert: the same trade path and the same net (a rule that never acted)
  const inert = pairs.filter(
    ([p, t]) => p.summary.pathHash === t.summary.pathHash && Math.abs(p.summary.net - t.summary.net) <= 1e-6
  ).length;

  return {
    pairs: pairs.length,
    inertShare: pairs.length ? inert / pairs.length : NaN,
    deltaNet: { p10: quantile(dNet, 0.1), median: quantile(dNet, 0.5), p90: quantile(dNet, 0.9) },
    deltaMinuteDd: { p10: quantile(dDd, 0.1), median: quantile(dDd, 0.5), p90: quantile(dDd, 0.9) },
    deltaRod: { p10: quantile(dRod, 0.1), median: quantile(dRod, 0.5), p90: quantile(dRod, 0.9) },
    netBetterShare: pairs.length ? dNet.filter((x) => x > 0).length / pairs.length : NaN,
    ddLowerShare: pairs.length ? dDd.filter((x) => x < 0).length / pairs.length : NaN
  };
};

// Per-cell summary (committed): coverage, best points, quantiles, rule activity, twins, scored centers, champions.
const cellSummary = (state: CellState, deep: boolean, zero?: CellState) => {
  const global = state.points.filter((p) => p.stage === 'global' || p.stage === 'reference');
  const nets = global.map((p) => p.summary.net);
  const dds = global.map((p) => p.summary.minuteDd);
  const active = (rule: 'A' | 'B' | 'C') => state.cell.mask['ABC'.indexOf(rule)] === '1';
  const share = (test: (p: Point) => boolean) => (global.length ? global.filter(test).length / global.length : NaN);
  const best = [...state.points].sort((a, b) => b.summary.net - a.summary.net || a.index - b.index)[0];
  const rod = championOf(state.scored.values(), 'rod');
  const net = championOf(state.scored.values(), 'netScore');

  return {
    cell: state.key,
    index: state.cell.index,
    deep,
    box: state.box,
    evaluations: state.evaluations,
    duplicates: state.duplicates,
    stages: state.stages,
    points: state.points.length,
    feasibleCenters: state.points.filter((p) => feasibleCenter(p.summary)).length,
    distinctPerDim: Object.fromEntries(
      state.dims.map((d) => [d.name, new Set(global.map((p) => p.values[d.name])).size])
    ),
    firstPass: {
      net: { p10: quantile(nets, 0.1), median: quantile(nets, 0.5), p90: quantile(nets, 0.9), max: Math.max(...nets) },
      minuteDd: { p10: quantile(dds, 0.1), median: quantile(dds, 0.5), p90: quantile(dds, 0.9) },
      positiveShare: share((p) => p.summary.net > 0),
      withinDdShare: share((p) => p.summary.minuteDd <= search.feasibility.maxMinuteDd),
      // the share of design vectors on which each active rule acted (an inert rule reproduces the 000 twin's path)
      ruleActed: {
        A: active('A') ? share((p) => p.summary.aDue > 0) : null,
        B: active('B') ? share((p) => p.summary.bBlocks + p.summary.bcBoth > 0) : null,
        C: active('C') ? share((p) => p.summary.cBlocks + p.summary.bcBoth > 0) : null
      }
    },
    twins: twinStats(state, zero),
    best: best ? { index: best.index, stage: best.stage, values: best.values, summary: best.summary } : null,
    scored: [...state.scored.values()].map(slimScored),
    rodChampion: rod ? { index: rod.index, score: rod.rod, phi: rod.phi, draws: rod.draws } : null,
    netChampion: net ? { index: net.index, score: net.netScore, phi: net.phi, draws: net.draws } : null,
    noChampion: noChampionReason(state)
  };
};

interface PairRow {
  pair: string;
  entry: string;
  family: string;
  byMask: Record<string, { rod: number; path: string } | null>;
  net: number;
  bestFeasibleNet: number;
}

// The training-only deep allocation (PROTOCOL.md §7.3): for each mask the top pairs by that mask's first-pass RoD
// champion score, then the top pairs by NET champion score (any mask); caps per list; behavioural distinctness.
export const deepPairsOf = (states: Map<string, CellState>) => {
  const rows = new Map<string, PairRow>();

  for (const state of states.values()) {
    const pair = pairKey(state.cell);
    const row: PairRow = rows.get(pair) ?? {
      pair,
      entry: state.cell.entry,
      family: capFamily(state.cell.exit),
      byMask: {},
      net: -Infinity,
      bestFeasibleNet: -Infinity
    };
    const rod = championOf(state.scored.values(), 'rod');
    const net = championOf(state.scored.values(), 'netScore');

    row.byMask[state.cell.mask] = rod ? { rod: rod.rod, path: rod.summary.pathHash } : null;

    if (net) {
      row.net = Math.max(row.net, net.netScore);
    }

    for (const p of state.points) {
      if (feasibleCenter(p.summary)) {
        row.bestFeasibleNet = Math.max(row.bestFeasibleNet, p.summary.net);
      }
    }

    rows.set(pair, row);
  }

  const order = [...rows.values()];
  const firstIndex = new Map(order.map((r) => [r.pair, cells.findIndex((c) => pairKey(c) === r.pair)]));
  const chosen: { pair: string; list: string; score: number }[] = [];
  const has = (pair: string) => chosen.some((c) => c.pair === pair);
  const { pairs } = search.deep;
  const take = (list: string, count: number, score: (r: PairRow) => number, path: (r: PairRow) => string | null) => {
    const perEntry = new Map<string, number>();
    const perFamily = new Map<string, number>();
    const paths = new Set<string>();
    let taken = 0;
    const ranked = order
      .filter((r) => Number.isFinite(score(r)))
      .sort((a, b) => score(b) - score(a) || firstIndex.get(a.pair)! - firstIndex.get(b.pair)!);

    for (const r of ranked) {
      if (taken >= count) {
        break;
      }

      const p = path(r);

      if (
        (perEntry.get(r.entry) ?? 0) >= pairs.capPerEntry ||
        (perFamily.get(r.family) ?? 0) >= pairs.capPerExit ||
        (p !== null && paths.has(p))
      ) {
        continue;
      }

      if (!has(r.pair)) {
        chosen.push({ pair: r.pair, list, score: score(r) });
      }

      perEntry.set(r.entry, (perEntry.get(r.entry) ?? 0) + 1);
      perFamily.set(r.family, (perFamily.get(r.family) ?? 0) + 1);

      if (p !== null) {
        paths.add(p);
      }

      taken++;
    }
  };

  for (const mask of masks) {
    take(
      `rod-${mask}`,
      pairs.perMask,
      (r) => r.byMask[mask]?.rod ?? -Infinity,
      (r) => r.byMask[mask]?.path ?? null
    );
  }

  take(
    'net',
    pairs.net,
    (r) => r.net,
    () => null
  );

  // near misses: no champion in any mask, but a feasible center above the weakest deep pair's best feasible net
  const weakest = Math.min(...chosen.map((c) => rows.get(c.pair)!.bestFeasibleNet));
  const nearMiss = order
    .filter((r) => !has(r.pair) && masks.every((m) => !r.byMask[m]) && r.bestFeasibleNet > weakest)
    .map((r) => ({ pair: r.pair, bestFeasibleNet: r.bestFeasibleNet }));

  return { chosen, ranking: order, nearMiss };
};

// Natural limits of the widening rule (Stage 1b's for exit parameters; Stage 1c's for the rule dimensions).
const naturalLimits = (name: string): [number, number] => {
  switch (name.slice(2)) {
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
      break;
  }

  return search.widening.ruleLimits[name] ?? [0.001, 0.95];
};

// The pair's widened box (PROTOCOL.md §7.3), from the first-pass RoD champions of all its masks.
export const widenedBox = (pairStates: CellState[]) => {
  const champions = pairStates.map((s) => championOf(s.scored.values(), 'rod')).filter((c): c is Scored => !!c);
  const dims = pairStates[0]!.pairDims;
  const box: Record<string, { lo: number; hi: number }> = {};
  const hits: string[] = [];
  const exit = pairStates[0]!.cell.exit;

  for (const dim of dims) {
    const isRule = /^[abc]\./.test(dim.name);

    if (dim.name.startsWith('e.') || (!isRule && dim.q === 1)) {
      continue; // entry boxes and integer/discrete exit parameters are never widened
    }

    const range = dim.hi - dim.lo;
    const [minimum, maximum] = naturalLimits(dim.name);
    let lo = dim.lo;
    let hi = dim.hi;

    for (const champion of champions) {
      const value = champion.values[dim.name];

      if (value === undefined) {
        continue;
      }

      if (dim.lo !== 0 && value <= dim.lo + search.widening.edge * range) {
        lo = Math.max(
          minimum,
          quantizeDim({ ...dim, lo: minimum, hi: dim.hi }, dim.lo - search.widening.extend * range)
        );
      }

      if (dim.hi !== 0 && value >= dim.hi - search.widening.edge * range && !(exit === 'XF-T' && dim.name === 'x.t')) {
        hi = quantizeDim({ ...dim, lo: dim.lo, hi: maximum }, dim.hi + search.widening.extend * range);
      }
    }

    if (lo < dim.lo - 1e-12 || hi > dim.hi + 1e-12) {
      box[dim.name] = { lo, hi };
      hits.push(dim.name);
    }
  }

  return { box, hits };
};

const pickOf = (states: CellState[], score: 'rod' | 'netScore'): PickRecord | undefined => {
  let best: { state: CellState; champion: Scored } | undefined;

  for (const state of states) {
    const champion = championOf(state.scored.values(), score);

    if (
      champion &&
      (!best ||
        champion[score] > best.champion[score] ||
        (champion[score] === best.champion[score] && state.cell.index < best.state.cell.index))
    ) {
      best = { state, champion };
    }
  }

  if (!best) {
    return undefined;
  }

  const key = best.state.policyKey(best.champion.values);

  return {
    cell: best.state.key,
    key,
    policy: policyFromKey(key).id,
    score: best.champion[score],
    champion: best.champion
  };
};

export const developHistory = async (
  pool: Pool,
  ds: Dataset,
  history: HistoryKey,
  archiveFile: string,
  cellList: MatrixCell[] = cells, // the stage always passes the whole matrix; tests pass whole pairs
  options: RunOptions = developmentOptions(ds, history)
) => {
  const archive = new Archive(archiveFile);
  const evaluator = new Evaluator(pool, history, options, archive);
  const states = new Map(cellList.map((cell) => [cell.key, new CellState(cell)]));
  const list = [...states.values()]; // pair-major, masks innermost: a group of 24 cells is 3 whole pairs
  const group = 24;
  const started = Date.now();

  for (let i = 0; i < list.length; i += group) {
    await firstPass(evaluator, list.slice(i, i + group));

    if ((i / group) % 10 === 0) {
      log(
        `develop-${history} first pass ${Math.min(i + group, list.length)}/${list.length} cells, ${evaluator.evaluations} evaluations, ${((Date.now() - started) / 1000).toFixed(0)} s`
      );
    }
  }

  const firstPassEvaluations = evaluator.evaluations;
  // the first-pass (J17) champions, reasons and φ values, kept before deep cells are rescored with J33
  const firstPassSnapshot = new Map(
    list.map((state) => {
      const rod = championOf(state.scored.values(), 'rod');
      const net = championOf(state.scored.values(), 'netScore');

      if (state.evaluations > state.cell.firstPassPlanned) {
        throw new Error(
          `${state.key}: ${state.evaluations} first-pass evaluations, above its plan ${state.cell.firstPassPlanned}`
        );
      }

      return [
        state.key,
        {
          rodChampion: rod ? { index: rod.index, values: rod.values, score: rod.rod, phi: rod.phi } : null,
          netChampion: net ? { index: net.index, values: net.values, score: net.netScore, phi: net.phi } : null,
          noChampion: noChampionReason(state),
          phis: [...state.scored.values()].map((x) => x.phi)
        }
      ];
    })
  );
  const deep = deepPairsOf(states);
  const widening: Record<string, string[]> = {};
  const deepStates: CellState[] = [];

  for (const c of deep.chosen) {
    const [entry, exit, contract] = c.pair.split('|') as [string, string, MatrixCell['contract']];
    const pairStates = masks.map((mask) => states.get(cellOf(entry, exit, contract, mask).key)!);
    const { box, hits } = widenedBox(pairStates);

    widening[c.pair] = hits;

    for (const state of pairStates) {
      state.box = box;
      deepStates.push(state);
    }
  }

  if (deepStates.length > search.caps.deepCellsMax) {
    throw new Error('deep allocation exceeds its cap');
  }

  log(
    `develop-${history} deep pairs ${deep.chosen.length} (${deepStates.length} cells), ${((Date.now() - started) / 1000).toFixed(0)} s`
  );

  for (let i = 0; i < deepStates.length; i += 8) {
    await deepPass(evaluator, deepStates.slice(i, i + 8));
  }

  for (const state of deepStates) {
    if (state.evaluations > state.cell.firstPassPlanned + search.caps.deepPerCell) {
      throw new Error(`${state.key}: ${state.evaluations} evaluations, above its plan`);
    }
  }

  const deepEvaluations = evaluator.evaluations - firstPassEvaluations;
  const picks: Record<string, PickRecord | null> = {
    rod: pickOf(deepStates, 'rod') ?? null,
    net: pickOf(deepStates, 'netScore') ?? null
  };

  for (const mask of masks) {
    picks[`mask-${mask}`] =
      pickOf(
        deepStates.filter((s) => s.cell.mask === mask),
        'rod'
      ) ?? null;
  }

  // Fixed-parent ablation on P*-000 (PROTOCOL.md §7.4): gated (primary) and forced variants.
  const fixedParent: Record<
    string,
    {
      outcome: 'adopted' | 'parent' | 'none'; // gated: champion adopted, parent kept (no RoD gain), no champion
      gated: PickRecord | null;
      forced: PickRecord | null;
      deltaCenterRod: number | null;
      summary: ReturnType<typeof cellSummary>;
    }
  > = {};
  const parent = picks['mask-000'];

  if (parent) {
    const parentState = states.get(parent.cell)!;
    const fixed: Params = Object.fromEntries(
      Object.entries(parent.champion.values).filter(([name]) => name.startsWith('e.') || name.startsWith('x.'))
    );
    const parentRod = rodOf(parent.champion.summary);

    for (const mask of masks.filter((m) => m !== '000') as Mask[]) {
      const cell = cellOf(parentState.cell.entry, parentState.cell.exit, parentState.cell.contract, mask);
      const ruleDims = states.get(cell.key)!.dims.filter((d) => /^[abc]\./.test(d.name)) as Dim[];
      const state = new CellState(cell, `${parent.cell}|FP|${mask}`, `${pairKey(cell)}|FP`, fixed, ruleDims, ruleSlots);
      const champion = await fixedParentPass(evaluator, state);
      let forced: PickRecord | null = null;
      let gated: PickRecord | null = null;
      let delta: number | null = null;

      if (champion) {
        const key = state.policyKey(champion.values);

        forced = { cell: state.key, key, policy: policyFromKey(key).id, score: champion.rod, champion };
        delta = rodOf(champion.summary) - parentRod;
        gated = delta > 0 ? forced : null;
      }

      if (state.evaluations > search.caps.fixedParentPerMask) {
        throw new Error(`${state.key}: ${state.evaluations} evaluations, above its plan`);
      }

      fixedParent[mask] = {
        outcome: champion ? (gated ? 'adopted' : 'parent') : 'none',
        gated,
        forced,
        deltaCenterRod: delta,
        summary: cellSummary(state, false)
      };
    }
  }

  await archive.close();

  const used = evaluator.evaluations;

  if (used > search.caps.perHistory) {
    throw new Error(`develop-${history} used ${used} evaluations, above its cap ${search.caps.perHistory}`);
  }

  const deepSet = new Set(deepStates.map((s) => s.key));
  const zeroOf = (state: CellState) =>
    states.get(cellOf(state.cell.entry, state.cell.exit, state.cell.contract, '000').key);

  return {
    options,
    used,
    duplicates: evaluator.duplicates,
    firstPassEvaluations,
    deepEvaluations,
    fixedParentEvaluations: used - firstPassEvaluations - deepEvaluations,
    archiveRows: archive.rows,
    deep: { ...deep, widening },
    picks,
    fixedParent,
    cells: list.map((state) => ({
      ...cellSummary(state, deepSet.has(state.key), zeroOf(state)),
      firstPassChampion: firstPassSnapshot.get(state.key)!
    }))
  };
};
