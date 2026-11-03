// The stages after development (PROTOCOL.md §8–§10): `evaluate` (the executable S1 path of the sealed fold picks and
// its knock-outs and sensitivities, the alternative selectors and mask picks, the fixed-parent paths, the
// selection-skill nulls, the controls, the frozen Stage 1 and Stage 1b paths re-simulated with rules off, the 2022
// counterfactuals on Stage 1b's path, and the guards) and `robustness` (neighbourhoods, perturbed paths, stresses,
// trend legs, P*_H knock-outs). Both load data through 2023-12-29 only and refuse to run unless every develop record
// is sealed and verifies.
import type { Dataset } from '../four-family/data.ts';
import { Engine as Stage1Engine, mulberry32 } from '../study3-vgt-momentum/engine.ts';
import type { Params } from '../study3-vgt-momentum/signals.ts';
import { templateSpec } from '../study3-vgt-momentum/specs.ts';
import {
  controlPolicy,
  policyOf as basePolicyOf,
  type PolicyKey as BaseKey
} from '../study3-vgt-momentum-stage1b/catalog.ts';
import {
  campaignGivebacks,
  contributions,
  controlResetSchedule,
  legCapture,
  legsOf
} from '../study3-vgt-momentum-stage1b/paths.ts';
import { readPayload as readStage1bPayload, readJsonFile } from '../study3-vgt-momentum-stage1b/records.ts';
import { policyOfStage1 } from '../study3-vgt-momentum-stage1b/stage1map.ts';
import { type Dim, type Key, cellByKey, dimsOf, isDiscrete, keyOf, policyFromKey, quantizeDim } from './catalog.ts';
import {
  type FoldKey,
  type Mask,
  folds,
  histories,
  log,
  matrix,
  neighbourhoods,
  nulls,
  seedOf,
  stage1bDir,
  stresses,
  study
} from './context.ts';
import { assertDoor, indexOfDate, loadVgt, poisonAfter, withMissingBars } from './data.ts';
import { Engine, defaultOptions } from './engine.ts';
import { poisonedFuture, prefixInvariance, truncatedRunPrefix } from './guards.ts';
import { summarise } from './metrics.ts';
import { ParityTally, compareRuns } from './parity.ts';
import {
  assertFreezes,
  assertPredecessors,
  assertRealRoot,
  assertScope,
  readPayload,
  recordExists,
  writeStage
} from './records.ts';
import { referenceRun } from './reference.ts';
import { runtimeInfo } from './stages.ts';
import type { Policy, RunOptions, RunResult, ScheduleItem } from './types.ts';

const historyList = ['A', 'B', 'C', 'D', 'H'] as const;

interface StoredPick {
  cell: string;
  key: Key;
  policy: string;
  score: number;
  champion: { index: number; values: Params; summary: { net: number; minuteDd: number; pathHash: string } };
}

interface Selection {
  picks: Record<string, StoredPick | null>;
  fixedParent: Record<string, { gated: StoredPick | null; forced: StoredPick | null }>;
  options: RunOptions;
}

interface CellRow {
  cell: string;
  deep: boolean;
  box: Record<string, { lo: number; hi: number }>;
  scored: { index: number; values: Params }[];
  rodChampion: { index: number } | null;
  firstPassChampion: { rodChampion: { index: number; values: Params } | null };
}

export const selectionOf = (history: string) => readPayload<Selection>(`develop-${history}`, 'selection');
const cellsOf = (history: string) => readPayload<CellRow[]>(`develop-${history}`, 'cells');

const policyOfKey = (key: Key | undefined | null) => (key ? policyFromKey(key) : undefined);

// A key with only the rules in `sub` kept (a knock-out); the mask in the id follows.
export const restrictKey = (key: Key, sub: Mask): Key => {
  const mask = [0, 1, 2].map((i) => (key.mask[i] === '1' && sub[i] === '1' ? '1' : '0')).join('') as Mask;
  const p = key.protect ?? {};
  const protect = {
    ...(mask[0] === '1' && p.A ? { A: p.A } : {}),
    ...(mask[1] === '1' && p.B ? { B: p.B } : {}),
    ...(mask[2] === '1' && p.C ? { C: p.C } : {})
  };

  return { ...key, mask, protect: Object.keys(protect).length ? protect : undefined };
};

const masks: Mask[] = matrix.masks;

// ----- path mechanics -----

export const boundariesOf = (ds: Dataset) => folds.map((f) => indexOfDate(ds, histories[f].window![0]));

export const pathOptions = (ds: Dataset, extra: Partial<RunOptions> = {}): RunOptions => {
  const b = boundariesOf(ds);

  return {
    ...defaultOptions(b[0]!, indexOfDate(ds, study.dataCap)),
    windows: b,
    recordDaily: true,
    transition: 'S1',
    ...extra
  };
};

export const scheduleOf = (ds: Dataset, policies: (Policy | undefined)[]): ScheduleItem[] =>
  boundariesOf(ds).map((index, i) => ({ index, policy: policies[i] ?? controlPolicy('C-IDLE') }));

// A run's sealed form: everything needed to recompute the verdict, ledgers and tables.
export const sealRun = (ds: Dataset, run: RunResult, firstIndex: number) => ({
  summary: summarise(run),
  end: run.endLiquidation,
  carriedInterest: run.carriedInterest,
  flatInterest: run.flatInterest,
  minuteDd: run.minuteDd,
  dailyDd: run.dailyDd,
  windows: run.windows.map((w) => ({ ...w, boundaryDate: ds.dates[w.boundary], endDate: ds.dates[w.end] })),
  trades: run.trades.map((t) => ({
    ...t,
    entryDate: ds.dates[t.entryIndex],
    exitDate: t.exitIndex >= 0 ? ds.dates[t.exitIndex] : null
  })),
  transitions: run.transitions.map((t) => ({ ...t, date: ds.dates[t.index] })),
  blocks: (run.blocks ?? []).map((b) => ({ ...b, date: ds.dates[b.index] })),
  aEvents: (run.aEvents ?? []).map((a) => ({ ...a, date: ds.dates[a.index] })),
  counters: {
    aChecks: run.aChecks,
    aDue: run.aDue,
    aCancelled: run.aCancelled,
    bBlocks: run.bBlocks,
    cBlocks: run.cBlocks,
    bcBoth: run.bcBoth,
    cFillsBelow: run.cFillsBelow
  },
  daily: (run.daily ?? []).map((d, i) => ({
    date: ds.dates[firstIndex + i],
    close: ds.sClose[firstIndex + i],
    mark: d.mark,
    liquidation: d.liquidation,
    shares: d.shares,
    gross: d.gross,
    loan: d.loan,
    cash: d.cash,
    realized: d.realized,
    openTrade: d.openTrade
  })),
  contributions: run.daily ? contributions(run as never, firstIndex) : [],
  givebacks: run.daily ? campaignGivebacks(run as never, firstIndex) : []
});

// A compact path record (nulls, perturbed and stressed paths).
export const compactRun = (run: RunResult) => ({
  windows: run.windows.map((w) => ({ increment: w.increment, minuteDd: w.minuteDd.maximum, interest: w.interest })),
  end: run.endLiquidation,
  minuteDd: run.minuteDd.maximum,
  dailyDd: run.dailyDd,
  trades: run.trades.length,
  ownExits: summarise(run).ownExits,
  sessionsLong: run.sessionsLong,
  sessions: run.sessions
});

// The Stage 1 picks (Stage 1b `repair`'s rule, re-derived read-only from Stage 1's sealed records).
const stage1Policies = () =>
  folds.map((f) => {
    const record = readJsonFile<{
      summary: {
        pStar: string;
        champions: { id: string; family: string; neighbourhoodMedian: number; candidate: unknown }[];
      };
    }>(`research/study3-vgt-momentum/results/records/develop-${f}.json`);
    const best = [...record.summary.champions].sort(
      (a, b) => b.neighbourhoodMedian - a.neighbourhoodMedian || a.family.localeCompare(b.family)
    )[0]!;

    if (best.id !== record.summary.pStar) {
      throw new Error(`Stage 1 pick ${f} does not re-derive`);
    }

    return policyOfStage1(templateSpec(best.candidate as Parameters<typeof templateSpec>[0]));
  });

// Stage 1b's Π1 picks (its sealed RoD picks).
const stage1bPolicies = () =>
  folds.map((f) => {
    const selection = readStage1bPayload<{ picks: { rod?: { key: BaseKey } } }>(`develop-${f}`, 'selection');

    return selection.picks.rod ? basePolicyOf(selection.picks.rod.key) : undefined;
  });

// ----- evaluate -----

export interface CoreInput {
  selections: Record<string, Selection>;
  cellRows: (history: string) => CellRow[];
  stage1b: (Policy | undefined)[];
  stage1: (Policy | undefined)[];
  withReference: boolean;
}

export const sealedInput = (): CoreInput => ({
  selections: Object.fromEntries(historyList.map((h) => [h, selectionOf(h)])) as Record<string, Selection>,
  cellRows: cellsOf,
  stage1b: stage1bPolicies(),
  stage1: stage1Policies(),
  withReference: true
});

// The evaluate computation on a dataset and the sealed (or, in tests, synthetic) development results.
export const evaluateCore = (ds: Dataset, input: CoreInput) => {
  const fast = new Engine(ds);
  const b = boundariesOf(ds);
  const first = b[0]!;
  const selections = input.selections;
  const pickKeys = (name: string) => folds.map((f) => selections[f]!.picks[name]?.key ?? null);
  const rodKeys = pickKeys('rod');
  const paths: Record<string, ReturnType<typeof sealRun>> = {};
  const runs: Record<string, { schedule: ScheduleItem[]; options: RunOptions }> = {};
  let evaluations = 0;
  const record = (name: string, policies: (Policy | undefined)[], extra: Partial<RunOptions> = {}) => {
    const schedule = scheduleOf(ds, policies);
    const options = pathOptions(ds, extra);
    const run = fast.run(schedule, options);

    evaluations++;
    runs[name] = { schedule, options };
    paths[name] = sealRun(ds, run, first);
    return run;
  };

  // Π1, its knock-outs and sensitivities
  record('Pi1', rodKeys.map(policyOfKey));

  for (const sub of masks) {
    record(
      `Pi1-sub-${sub}`,
      rodKeys.map((k) => policyOfKey(k ? restrictKey(k, sub) : null))
    );
  }

  record('Pi1-S2', rodKeys.map(policyOfKey), { transition: 'S2' });
  record('Pi1-S3', rodKeys.map(policyOfKey), { transition: 'S3' });
  record('Pi1-reset', rodKeys.map(policyOfKey), { restrictionCarry: 'reset' });
  record('Pi1-open', rodKeys.map(policyOfKey), { losingHoldFill: 'open' });
  record(
    'Pi1-Z1',
    rodKeys.map((k) => policyOfKey(k ? { ...k, sizing: { kind: 'Z1', band: 0.05 } } : null))
  );
  record(
    'Pi1-cross',
    rodKeys.map((k) =>
      policyOfKey(k && k.protect?.C ? { ...k, protect: { ...k.protect, C: { ...k.protect.C, cross: true } } } : k)
    )
  );

  // the other selectors, the mask picks, the fixed-parent paths, the static path
  record('Pi-NET', pickKeys('net').map(policyOfKey));
  record(
    'Pi-NET-off',
    pickKeys('net').map((k) => policyOfKey(k ? restrictKey(k, '000') : null))
  );

  for (const mask of masks) {
    const keys = pickKeys(`mask-${mask}`);

    record(`Pi-${mask}`, keys.map(policyOfKey));

    // the brief's C-cross and same-print A comparisons on the mask picks that carry C or A (PROTOCOL.md §9.1)
    if (mask[2] === '1') {
      record(
        `Pi-${mask}-cross`,
        keys.map((k) =>
          policyOfKey(k && k.protect?.C ? { ...k, protect: { ...k.protect, C: { ...k.protect.C, cross: true } } } : k)
        )
      );
    }

    if (mask[0] === '1') {
      record(`Pi-${mask}-open`, keys.map(policyOfKey), { losingHoldFill: 'open' });
    }
  }

  for (const mask of masks.filter((m) => m !== '000')) {
    const parents = pickKeys('mask-000');

    for (const variant of ['gated', 'forced'] as const) {
      record(
        `Pi-FP-${variant}-${mask}`,
        folds.map((f, i) => policyOfKey(selections[f]!.fixedParent[mask]?.[variant]?.key ?? parents[i]))
      );
    }
  }

  record('static-A', [policyOfKey(rodKeys[0]), ...folds.slice(1).map(() => policyOfKey(rodKeys[0]))]);

  // selection-skill nulls (deep-cell champions; all cell champions)
  // deep null: the deep cells' (J33) RoD champions; first-pass null: every cell's first-pass (J17) RoD champion
  const candidates = (h: FoldKey, deepOnly: boolean) =>
    input
      .cellRows(h)
      .filter((c) => (deepOnly ? c.deep && c.rodChampion : c.firstPassChampion.rodChampion))
      .map((c) => {
        const values = deepOnly
          ? c.scored.find((s) => s.index === c.rodChampion!.index)!.values
          : c.firstPassChampion.rodChampion!.values;

        return policyFromKey(keyOf(cellByKey.get(c.cell)!, values));
      });
  const nullPaths: Record<string, ReturnType<typeof compactRun>[]> = {};

  for (const kind of nulls.kinds) {
    const pools = folds.map((f) => candidates(f, kind === 'deep'));

    nullPaths[kind] = Array.from({ length: nulls.paths }, (_, j) => {
      const random = mulberry32(seedOf(`study3c|null|${kind}|${j}`));
      const run = fast.run(
        scheduleOf(
          ds,
          pools.map((pool) => (pool.length ? pool[Math.floor(random() * pool.length)] : undefined))
        ),
        pathOptions(ds, { recordDaily: false })
      );

      evaluations++;
      return compactRun(run);
    });
  }

  // controls: flat start and annual reset
  for (const name of ['C-AL', 'C-ALR', 'C-ALZ1', 'C-SMA', 'C-DON', 'C-TSM', 'C-STOP', 'C-IDLE']) {
    const flatRun = fast.run(controlPolicy(name), { ...pathOptions(ds), transition: undefined });

    paths[`${name}|flat`] = sealRun(ds, flatRun, first);
    paths[`${name}|reset`] = sealRun(
      ds,
      fast.run(
        controlResetSchedule(ds, name, [{ kind: 'Z0' }, { kind: 'Z0' }, { kind: 'Z0' }, { kind: 'Z0' }]) as never,
        pathOptions(ds)
      ),
      first
    );
    evaluations += 2;
  }

  // frozen prior paths, rules off: Stage 1b's Π1 and Stage 1's repaired S1 path (net-debit)
  paths['Stage1b-Pi1'] = sealRun(ds, fast.run(scheduleOf(ds, input.stage1b), pathOptions(ds)), first);
  paths['Stage1-S1'] = sealRun(ds, fast.run(scheduleOf(ds, input.stage1), pathOptions(ds)), first);
  evaluations += 2;

  // 2022 counterfactuals on Stage 1b's Π1 (hindsight diagnostic, target-year-informed)
  const variants: { name: string; protect: Policy['protect'] }[] = [
    { name: 'A8', protect: { A: { N: 8 } } },
    { name: 'A15', protect: { A: { N: 15 } } },
    { name: 'B10', protect: { B: { C: 10 } } },
    { name: 'C5-5', protect: { C: { X: 0.05, Y: 0.05 } } },
    { name: 'A8+B10', protect: { A: { N: 8 }, B: { C: 10 } } },
    { name: 'A15+B10', protect: { A: { N: 15 }, B: { C: 10 } } },
    { name: 'A8+C', protect: { A: { N: 8 }, C: { X: 0.05, Y: 0.05 } } },
    { name: 'A15+C', protect: { A: { N: 15 }, C: { X: 0.05, Y: 0.05 } } },
    { name: 'B10+C', protect: { B: { C: 10 }, C: { X: 0.05, Y: 0.05 } } },
    { name: 'A8+B10+C', protect: { A: { N: 8 }, B: { C: 10 }, C: { X: 0.05, Y: 0.05 } } },
    { name: 'A15+B10+C', protect: { A: { N: 15 }, B: { C: 10 }, C: { X: 0.05, Y: 0.05 } } }
  ];
  const counterfactuals = Object.fromEntries(
    variants.map((v) => {
      evaluations++;

      return [
        v.name,
        sealRun(
          ds,
          fast.run(
            scheduleOf(
              ds,
              input.stage1b.map((p) => (p ? { ...p, id: `${p.id}+${v.name}`, protect: v.protect } : undefined))
            ),
            pathOptions(ds)
          ),
          first
        )
      ];
    })
  );

  // guards: prefix invariance and poisoned future at each boundary, truncated-path prefix, b-marks, fast = reference
  const pi1Policies = rodKeys.map(policyOfKey).filter((p): p is Policy => !!p);
  const guards = b.map((boundary) => ({
    boundary: ds.dates[boundary],
    prefix: prefixInvariance(ds, boundary, pi1Policies),
    poisoned: poisonedFuture(ds, boundary, [runs.Pi1!], seedOf(`study3c|poison|evaluate|${ds.dates[boundary]}`)),
    truncated: truncatedRunPrefix(ds, boundary, [runs.Pi1!])
  }));
  const bmarks = historyList.map((h) => {
    const pick = selections[h]!.picks.rod;

    if (!pick) {
      return { history: h, pick: null, equal: true };
    }

    const devEnd = indexOfDate(ds, histories[h].developmentEnd);
    const options = { ...selections[h]!.options, endIndex: devEnd };
    const run = fast.run(policyFromKey(pick.key), options);

    evaluations++;

    return {
      history: h,
      pick: pick.policy,
      equal:
        run.pathHash === pick.champion.summary.pathHash &&
        Math.abs(run.endLiquidation - pick.champion.summary.net) <= 1e-6 &&
        Math.abs(run.minuteDd.maximum - pick.champion.summary.minuteDd) <= 1e-6
    };
  });
  const referenceTally = new ParityTally();

  if (input.withReference) {
    for (const [name, r] of Object.entries(runs)) {
      referenceTally.add(name, compareRuns(fast.run(r.schedule, r.options), referenceRun(ds, r.schedule, r.options)));
    }
  }

  const guardFailures =
    guards.reduce((a, g) => a + g.prefix.differences + g.poisoned.differences + g.truncated.differences, 0) +
    bmarks.filter((x) => !x.equal).length +
    referenceTally.differences;

  return {
    evaluations,
    guardFailures,
    bmarks,
    reference: referenceTally.summary(),
    guards,
    paths,
    nullPaths,
    counterfactuals,
    picks: { rod: rodKeys, net: pickKeys('net') }
  };
};

export const stageEvaluate = async () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('evaluate');
  assertFreezes(true);

  if (recordExists('evaluate')) {
    throw new Error('refused: evaluate is sealed');
  }

  const started = Date.now();
  const { ds, door } = await loadVgt(study.dataCap);

  assertDoor(ds, study.dataCap);

  const core = evaluateCore(ds, sealedInput());
  const stage1bPi1 = core.paths['Stage1b-Pi1']!;
  const stage1Repaired = core.paths['Stage1-S1']!;
  const sealed1b = readJsonFile<{
    summary: { paths: Record<string, { windows: number[]; end: number; minuteDd: number }> };
  }>(`${stage1bDir}/results/records/evaluate.json`).summary.paths['Pi1-S1']!;
  const sealedRepair = readStage1bPayload<Record<string, { summary: { net: number; minuteDd: number } }>>(
    'repair',
    'paths'
  )['net|S1']!;
  const anchors = {
    stage1bPi1: {
      sealed: sealed1b,
      reproduced: {
        windows: stage1bPi1.windows.map((w) => w.increment),
        end: stage1bPi1.end,
        minuteDd: stage1bPi1.minuteDd.maximum
      },
      equal:
        Math.abs(stage1bPi1.end - sealed1b.end) <= 1e-6 &&
        Math.abs(stage1bPi1.minuteDd.maximum - sealed1b.minuteDd) <= 1e-6 &&
        stage1bPi1.windows.every((w, i) => Math.abs(w.increment - sealed1b.windows[i]!) <= 1e-6)
    },
    stage1Repaired: {
      sealed: { net: sealedRepair.summary.net, minuteDd: sealedRepair.summary.minuteDd },
      reproduced: { net: stage1Repaired.end, minuteDd: stage1Repaired.minuteDd.maximum },
      equal:
        Math.abs(stage1Repaired.end - sealedRepair.summary.net) <= 1e-6 &&
        Math.abs(stage1Repaired.minuteDd.maximum - sealedRepair.summary.minuteDd) <= 1e-6
    }
  };
  const guardFailures =
    core.guardFailures + (anchors.stage1bPi1.equal ? 0 : 1) + (anchors.stage1Repaired.equal ? 0 : 1);

  log(`evaluate: ${core.evaluations} evaluations, guard failures ${guardFailures}`);

  return writeStage('evaluate', {
    door,
    summary: {
      evaluations: core.evaluations,
      guardFailures,
      anchors,
      bmarks: core.bmarks,
      reference: core.reference,
      guards: core.guards,
      headline: Object.fromEntries(
        Object.entries(core.paths).map(([k, p]) => [
          k,
          { windows: p.windows.map((w) => w.increment), end: p.end, minuteDd: p.minuteDd.maximum }
        ])
      ),
      runtime: runtimeInfo(started, 0)
    },
    payloads: { paths: core.paths, nulls: core.nullPaths, counterfactuals: core.counterfactuals, picks: core.picks }
  });
};

// ----- robustness -----

// The pick's cell, its searched dimensions and (deep) box.
let cellRowsOf: (history: string) => CellRow[] = (h) => cellsOf(h);

const pickCell = (history: string, pick: StoredPick) => {
  const cellKey = pick.cell.split('|FP|')[0]!;
  const cell = cellByKey.get(cellKey)!;
  const row = cellRowsOf(history).find((c) => c.cell === cellKey);

  return { cell, dims: dimsOf(cell), box: row?.box ?? {} };
};

const clampTo = (dim: Dim, box: Record<string, { lo: number; hi: number }>, value: number) => {
  const b = box[dim.name] ?? dim;

  return quantizeDim({ ...dim, ...b }, Math.min(b.hi, Math.max(b.lo, value)));
};

export const j128 = (history: string, pick: StoredPick) => {
  const { cell, dims, box } = pickCell(history, pick);
  const random = mulberry32(seedOf(`study3c|${pick.policy}|J128`));

  return Array.from({ length: neighbourhoods.jointDraws }, () => {
    const values: Params = {};

    for (const dim of dims) {
      const u = random();

      values[dim.name] = isDiscrete(dim)
        ? pick.champion.values[dim.name]!
        : clampTo(dim, box, pick.champion.values[dim.name]! + (2 * u - 1) * neighbourhoods.jointRadius * dim.span);
    }

    return keyOf(cell, values);
  });
};

export const oatKeys = (history: string, pick: StoredPick) => {
  const { cell, dims, box } = pickCell(history, pick);
  const out: { dim: string; step: number | string; key: Key }[] = [];
  const center = pick.champion.values;

  for (const dim of dims) {
    if (isDiscrete(dim)) {
      for (let v = dim.lo; v <= dim.hi; v++) {
        if (v !== center[dim.name]) {
          out.push({ dim: dim.name, step: `=${v}`, key: keyOf(cell, { ...center, [dim.name]: v }) });
        }
      }

      continue;
    }

    // steps of 5% of the declared range (integers ≥ 1); plus ±1, ±2 units for integers and ±0.1, 0.5, 1, 2
    // percentage points for percentage parameters (quantum 0.001)
    const deltas = new Map<string, number>();

    for (const step of neighbourhoods.oatSteps) {
      deltas.set(
        `${step}x5%`,
        dim.q === 1
          ? Math.sign(step) *
              Math.max(Math.abs(step), Math.round(Math.abs(step) * neighbourhoods.oatStepFraction * dim.span))
          : step * neighbourhoods.oatStepFraction * dim.span
      );
    }

    const units =
      dim.q === 1 ? [-2, -1, 1, 2] : dim.q === 0.001 ? [-0.02, -0.01, -0.005, -0.001, 0.001, 0.005, 0.01, 0.02] : [];

    for (const unit of units) {
      deltas.set(
        dim.q === 1 ? `${unit > 0 ? '+' : ''}${unit}` : `${unit > 0 ? '+' : ''}${(unit * 100).toFixed(1)}pp`,
        unit
      );
    }

    const seen = new Set<number>([center[dim.name]!]);

    for (const [step, delta] of deltas) {
      const value = clampTo(dim, box, center[dim.name]! + delta);

      if (!seen.has(value)) {
        seen.add(value);
        out.push({ dim: dim.name, step, key: keyOf(cell, { ...center, [dim.name]: value }) });
      }
    }
  }

  return out;
};

// The exit's principal stop-distance parameter (for the rule × stop-distance grids).
const stopDimOf: Record<string, string> = {
  XF: 'x.t',
  'XF-T': 'x.t',
  XV: 'x.dmin',
  XS: 'x.h',
  XT: 'x.h',
  XRP: 'x.h',
  XRD: 'x.h',
  XD: 'x.cat',
  XP: 'x.h',
  XO: 'x.cat',
  XE: 'x.t0',
  XU: 'x.h',
  XN: 'x.t'
};

// Rule dimension × stop distance: center ± 1, 2 steps of 5% of each declared range (a 5 × 5 grid per rule dimension).
export const gridKeys = (history: string, pick: StoredPick) => {
  const { cell, dims, box } = pickCell(history, pick);
  const center = pick.champion.values;
  const stop = dims.find((d) => d.name === stopDimOf[cell.exit]);
  const out: { rule: string; ruleValue: number; stop: string; stopValue: number; key: Key }[] = [];

  if (!stop) {
    return out;
  }

  const valuesOf = (dim: Dim) => [
    ...new Set(
      [-2, -1, 0, 1, 2].map((k) =>
        clampTo(
          dim,
          box,
          center[dim.name]! +
            (dim.q === 1
              ? k * Math.max(1, Math.round(neighbourhoods.oatStepFraction * dim.span))
              : k * neighbourhoods.oatStepFraction * dim.span)
        )
      )
    )
  ];

  for (const rule of dims.filter((d) => /^[abc]\./.test(d.name))) {
    for (const ruleValue of valuesOf(rule)) {
      for (const stopValue of valuesOf(stop)) {
        out.push({
          rule: rule.name,
          ruleValue,
          stop: stop.name,
          stopValue,
          key: keyOf(cell, { ...center, [rule.name]: ruleValue, [stop.name]: stopValue })
        });
      }
    }
  }

  return out;
};

const stressOptions = (): { name: string; options: Partial<RunOptions>; missing?: number }[] => [
  ...stresses.costs.map((c) => ({ name: `cost${c}`, options: { costBps: c } })),
  ...stresses.rates.map((r) => ({ name: `rate${Math.round(r * 100)}`, options: { rate: r } })),
  ...stresses.stopSlippageBps.map((x) => ({ name: `stop${x}`, options: { stopSlippageBps: x } })),
  ...stresses.entrySlippageBps.map((x) => ({ name: `entry${x}`, options: { entrySlippageBps: x } })),
  ...stresses.openSlippageBps.map((x) => ({ name: `open${x}`, options: { openSlippageBps: x } })),
  ...stresses.delayMinutes.map((d) => ({ name: `delay${d}`, options: { delayMinutes: d } })),
  ...stresses.missingBars.map((m) => ({ name: `missing${m}`, options: {}, missing: m })),
  { name: 'holdOpen', options: { losingHoldFill: 'open' as const } }
];

export const robustnessCore = (ds: Dataset, input: CoreInput) => {
  cellRowsOf = input.cellRows;

  const fast = new Engine(ds);
  const b = boundariesOf(ds);
  const selections = input.selections;
  const e2017 = indexOfDate(ds, study.firstDecisionClose);
  const end = indexOfDate(ds, study.dataCap);
  let evaluations = 0;
  const one = (policy: Policy, options: RunOptions) => {
    evaluations++;
    return fast.run(policy, options);
  };

  // development neighbourhoods (training-fitted centers; the full dataset with each history's development end — the
  // b-marks in `evaluate` prove the equivalence) and next-window neighbourhoods (post-selection)
  const neighbourhoodOf = (h: string, pick: StoredPick, next: boolean) => {
    const devEnd = indexOfDate(ds, histories[h as FoldKey | 'H'].developmentEnd);
    const window = histories[h as FoldKey | 'H'].window;
    const options: RunOptions = next
      ? { ...defaultOptions(e2017, indexOfDate(ds, window![1])), windows: [devEnd] }
      : { ...selections[h]!.options, endIndex: devEnd };
    const keys = next ? j128(h, pick) : [...j128(h, pick)];
    const rows = keys.map((k) => {
      const run = one(policyFromKey(k), options);

      return next
        ? { net: run.windows[0]!.increment, minuteDd: run.windows[0]!.minuteDd.maximum, path: run.pathHash }
        : { net: run.endLiquidation, minuteDd: run.minuteDd.maximum, path: run.pathHash };
    });
    const oat = next
      ? []
      : oatKeys(h, pick).map((o) => {
          const run = one(policyFromKey(o.key), options);

          return {
            dim: o.dim,
            step: o.step,
            net: run.endLiquidation,
            minuteDd: run.minuteDd.maximum,
            path: run.pathHash
          };
        });

    const grid = next
      ? []
      : gridKeys(h, pick).map((g) => {
          const run = one(policyFromKey(g.key), options);

          return {
            rule: g.rule,
            ruleValue: g.ruleValue,
            stop: g.stop,
            stopValue: g.stopValue,
            net: run.endLiquidation,
            minuteDd: run.minuteDd.maximum
          };
        });

    return { pick: pick.policy, center: pick.champion.summary, rows, oat, grid };
  };
  const development: Record<string, unknown> = {};
  const nextWindow: Record<string, unknown> = {};

  for (const h of historyList) {
    const s = selections[h]!;

    for (const name of h === 'H' ? ['rod', 'net', 'mask-000'] : ['rod']) {
      const pick = s.picks[name];

      if (pick) {
        development[`${h}|${name}`] = neighbourhoodOf(h, pick, false);

        if (h !== 'H') {
          nextWindow[`${h}|${name}`] = neighbourhoodOf(h, pick, true);
        }
      }
    }
  }

  // perturbed executable paths: draw j of every fold pick (Π1, Π1 with the rules removed, Π-NET, Π-000)
  const perturbed: Record<string, ReturnType<typeof compactRun>[]> = {};
  const draws = (name: string) =>
    folds.map((f) => (selections[f]!.picks[name] ? j128(f, selections[f]!.picks[name]!) : null));

  for (const [label, name, off] of [
    ['Pi1', 'rod', false],
    ['Pi1-off', 'rod', true],
    ['Pi-NET', 'net', false],
    ['Pi-000', 'mask-000', false]
  ] as const) {
    const sets = draws(name);

    perturbed[label] = Array.from({ length: neighbourhoods.jointDraws }, (_, j) => {
      const policies = sets.map((set) =>
        set ? policyFromKey(off ? restrictKey(set[j]!, '000') : set[j]!) : undefined
      );

      evaluations++;
      return compactRun(fast.run(scheduleOf(ds, policies), pathOptions(ds, { recordDaily: false })));
    });
  }

  // stresses of Π1, Π-NET, Π-000 (paths) and P*_H (continuous, in-sample)
  const stressRuns: Record<string, Record<string, ReturnType<typeof compactRun>>> = {};
  const pathPolicies = (name: string) => folds.map((f) => policyOfKey(selections[f]!.picks[name]?.key));
  const hPick = selections.H!.picks.rod;

  for (const stress of stressOptions()) {
    const data = stress.missing ? withMissingBars(ds, stress.missing, seedOf(`study3c|missing|${stress.missing}`)) : ds;
    const engine = stress.missing ? new Engine(data) : fast;
    const row: Record<string, ReturnType<typeof compactRun>> = {};

    for (const [label, name] of [
      ['Pi1', 'rod'],
      ['Pi-NET', 'net'],
      ['Pi-000', 'mask-000']
    ] as const) {
      row[label] = compactRun(
        engine.run(scheduleOf(data, pathPolicies(name)), pathOptions(data, { ...stress.options, recordDaily: false }))
      );
      evaluations++;
    }

    if (hPick) {
      row['H'] = compactRun(engine.run(policyFromKey(hPick.key), { ...defaultOptions(e2017, end), ...stress.options }));
      evaluations++;
    }

    stressRuns[stress.name] = row;
  }

  // trend legs (2017-01-03 → 2023-12-29) and capture by Π1, Π1-off, Π-000 and P*_H
  const legs = legsOf(ds as never, e2017, end);
  const legRuns: Record<string, { run: RunResult; first: number }> = {
    Pi1: { run: fast.run(scheduleOf(ds, pathPolicies('rod')), pathOptions(ds)), first: b[0]! },
    'Pi1-off': {
      run: fast.run(
        scheduleOf(
          ds,
          folds.map((f) =>
            policyOfKey(selections[f]!.picks.rod ? restrictKey(selections[f]!.picks.rod!.key, '000') : null)
          )
        ),
        pathOptions(ds)
      ),
      first: b[0]!
    },
    'Pi-000': { run: fast.run(scheduleOf(ds, pathPolicies('mask-000')), pathOptions(ds)), first: b[0]! }
  };

  evaluations += 3;

  if (hPick) {
    legRuns.H = {
      run: fast.run(policyFromKey(hPick.key), { ...defaultOptions(e2017, end), recordDaily: true }),
      first: e2017
    };
    evaluations++;
  }

  const legCaptures = Object.fromEntries(
    Object.entries(legRuns).map(([name, { run, first }]) => [
      name,
      legs
        .filter((leg) => leg.t1 > first)
        .map((leg) => legCapture(ds as never, { ...leg, t0: Math.max(leg.t0, first) }, run as never, first, end))
    ])
  );

  // P*_H knock-outs (continuous, in-sample)
  const hVariants: Record<string, ReturnType<typeof compactRun>> = {};

  if (hPick?.key.protect?.C) {
    hVariants.cross = compactRun(
      one(
        policyFromKey({ ...hPick.key, protect: { ...hPick.key.protect, C: { ...hPick.key.protect.C, cross: true } } }),
        defaultOptions(e2017, end)
      )
    );
  }

  if (hPick?.key.protect?.A) {
    hVariants.open = compactRun(
      one(policyFromKey(hPick.key), { ...defaultOptions(e2017, end), losingHoldFill: 'open' })
    );
  }

  const hKnockouts = hPick
    ? Object.fromEntries(
        masks.map((sub) => {
          evaluations++;
          return [
            sub,
            compactRun(fast.run(policyFromKey(restrictKey(hPick.key, sub)), { ...defaultOptions(e2017, end) }))
          ];
        })
      )
    : {};

  return {
    evaluations,
    payloads: { development, nextWindow, perturbed, stresses: stressRuns, legs, legCaptures, hKnockouts, hVariants }
  };
};

export const stageRobustness = async () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('robustness');
  assertFreezes(true);

  if (recordExists('robustness')) {
    throw new Error('refused: robustness is sealed');
  }

  const started = Date.now();
  const { ds, door } = await loadVgt(study.dataCap);

  assertDoor(ds, study.dataCap);

  const core = robustnessCore(ds, sealedInput());

  log(`robustness: ${core.evaluations} evaluations`);

  return writeStage('robustness', {
    door,
    summary: { evaluations: core.evaluations, legs: core.payloads.legs.length, runtime: runtimeInfo(started, 0) },
    payloads: core.payloads
  });
};

void poisonAfter;
void Stage1Engine;
