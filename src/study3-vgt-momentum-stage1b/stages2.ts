// The stages that read the evaluation windows (PROTOCOL.md §5.5, §8–§10): repair (Stage 1's picks as executable
// paths), evaluate (the Stage 1b paths, controls, benchmarks and guards) and robustness (stresses, neighbourhoods,
// perturbed paths, trend legs, XV traces, distributions). They run only after develop-A..D and H are sealed.
import fs from 'fs-extra';
import type { Dataset } from '../four-family/data.ts';
import { Engine as Stage1Engine } from '../study3-vgt-momentum/engine.ts';
import { chainWindows } from '../study3-vgt-momentum/ledgers.ts';
import type { Params } from '../study3-vgt-momentum/signals.ts';
import { templateSpec } from '../study3-vgt-momentum/specs.ts';
import {
  type Dim,
  type PolicyKey,
  controlPolicy,
  isDiscrete,
  policyOf,
  quantizeDim,
  sizingVariants
} from './catalog.ts';
import {
  type FoldKey,
  folds,
  histories,
  log,
  neighbourhoods,
  seedOf,
  stage1Picks,
  stresses,
  study
} from './context.ts';
import { indexOfDate, loadVgt, truncate, withMissingBars } from './data.ts';
import type { DevelopResult, Pick } from './develop.ts';
import { Engine, defaultOptions } from './engine.ts';
import { poisonedFuture, prefixInvariance, truncatedRunPrefix } from './guards.ts';
import { distribution, summarise } from './metrics.ts';
import { ParityTally, compareRuns } from './parity.ts';
import {
  boundaries,
  campaignGivebacks,
  chainStreams,
  contributions,
  controlResetSchedule,
  legCapture,
  legsOf,
  pathOptions,
  pathSchedule,
  runPath
} from './paths.ts';
import {
  assertFreezes,
  assertPredecessors,
  assertRealRoot,
  assertScope,
  readJsonFile,
  readPayload,
  recordExists,
  writeStage
} from './records.ts';
import { referenceRun } from './reference.ts';
import { jointDraws } from './search.ts';
import { policyOfStage1 } from './stage1map.ts';
import { runtimeInfo } from './stages.ts';
import type { Policy, RunOptions, RunResult, ScheduleItem, Transition } from './types.ts';

const stage1Records = 'research/study3-vgt-momentum/results/records';

// A run's sealed form: everything needed to recompute the verdict and the ledgers.
const sealRun = (ds: Dataset, run: RunResult, firstIndex: number) => ({
  summary: summarise(run),
  windows: run.windows.map((w) => ({ ...w, boundaryDate: ds.dates[w.boundary], endDate: ds.dates[w.end] })),
  trades: run.trades.map((t) => ({
    ...t,
    entryDate: ds.dates[t.entryIndex],
    exitDate: t.exitIndex >= 0 ? ds.dates[t.exitIndex] : null
  })),
  transitions: run.transitions.map((t) => ({ ...t, date: ds.dates[t.index] })),
  events: (run.events ?? []).map((ev) => ({ ...ev, date: ds.dates[ev.index] })),
  daily: (run.daily ?? []).map((d, i) => ({ date: ds.dates[firstIndex + i], ...d })),
  contributions: run.daily ? contributions(run, firstIndex) : [],
  campaigns: run.daily ? campaignGivebacks(run, firstIndex) : [],
  flatInterest: run.flatInterest,
  carriedInterest: run.carriedInterest,
  debitDollarDays: run.debitDollarDays,
  minuteDd: run.minuteDd,
  dailyDd: run.dailyDd,
  endLiquidation: run.endLiquidation,
  endMark: run.endMark
});

const streamOptions = (o: RunOptions, from: number) => {
  const stream = { times: [] as number[], values: [] as number[] };

  return {
    stream,
    options: {
      ...o,
      markSink: (value: number, time: number) => {
        if (time > from) {
          stream.times.push(time);
          stream.values.push(value);
        }
      }
    }
  };
};

// ----- repair (Stage 1's picks) -----

interface Stage1Champion {
  family: string;
  id: string;
  candidate: { family: string; params: Params; h: number; t: number };
  neighbourhoodMedian: number;
}

export const stage1Pick = (history: string) => {
  const record = readJsonFile<{ summary: { pStar: string; champions: Stage1Champion[] } }>(
    `${stage1Records}/develop-${history}.json`
  );
  const champions = record.summary.champions;
  // Stage 1's rule: the champion with the highest neighbourhood median (ties by family ID)
  const best = [...champions].sort(
    (a, b) => b.neighbourhoodMedian - a.neighbourhoodMedian || a.family.localeCompare(b.family)
  )[0]!;

  return {
    sealed: record.summary.pStar,
    derived: best.id,
    equal: best.id === record.summary.pStar,
    candidate: best.candidate
  };
};

export const stageRepair = async () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('repair');
  assertFreezes(true);

  if (recordExists('repair')) {
    throw new Error('refused: repair is sealed');
  }

  const started = Date.now();
  const { ds, door } = await loadVgt(study.dataCap);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const b = boundaries(ds);
  const fast = new Engine(ds);
  const stage1 = new Stage1Engine(ds);
  const picks = Object.fromEntries((['A', 'B', 'C', 'D', 'H'] as const).map((h) => [h, stage1Pick(h)]));
  const specs = Object.fromEntries(
    Object.entries(picks).map(([h, p]) => [h, templateSpec(p.candidate as Parameters<typeof templateSpec>[0])])
  );
  const analysis = readJsonFile<{ summary: { rubric: { V: number[]; pi: { minuteDrawdown: number; end: number } } } }>(
    `${stage1Records}/analysis.json`
  );
  const slot: RunOptions = { ...defaultOptions(e, end), financing: 'slot', recordDaily: true };
  let evaluations = 0;

  // (a) continuous runs of each fold pick: Stage 1 engine vs Stage 1b fixed-slot; V, window DD; exact chained Π
  const continuous = folds.map((f, i) => {
    const spec = specs[f]!;
    const s1 = stage1.run(spec, {
      costBps: 5,
      rate: 0.11,
      principal: 100000,
      stopSlippageBps: 0,
      entrySlippageBps: 0,
      delayMinutes: 0,
      firstDecisionIndex: e,
      endIndex: i < 3 ? b[i + 1]! : end,
      boundaryIndex: b[i]!,
      recordDaily: true
    });
    const windowEnd = i < 3 ? b[i + 1]! : end;
    const { stream, options } = streamOptions(
      { ...slot, endIndex: windowEnd, windows: [b[i]!] },
      ds.sCloseTime[b[i]!]!
    );
    const run = fast.run(policyOfStage1(spec), options);

    evaluations += 2;

    return { fold: f, id: spec.id, s1, run, stream, sealedV: analysis.summary.rubric.V[i]! };
  });
  const chained = chainStreams(
    continuous.map((c) => ({
      boundaryMark: c.run.windows[0]!.startMark,
      endMark: c.run.windows[0]!.endMark,
      stream: c.stream
    }))
  );
  const stage1Chain = chainWindows(
    continuous.map((c) => ({
      boundaryMark: c.s1.window!.boundaryMark,
      endMark: c.s1.window!.endMark,
      minuteMin: c.s1.window!.minuteMin,
      minuteMax: c.s1.window!.minuteMax,
      internalDrawdown: c.s1.window!.minuteDrawdown.maximum
    }))
  );

  // the fold-C pick's March 2020 → January 2022 lot (full continuous run through 2023-12-29)
  const cRun = fast.run(policyOfStage1(specs.C!), { ...slot, windows: b });

  evaluations++;
  const lot = cRun.trades.find((t) => ds.dates[t.entryIndex] === '2020-03-16');
  const rowAt = (date: string) => cRun.daily![indexOfDate(ds, date) - e]!;
  const lotTrace = lot
    ? {
        decisionDate: ds.dates[lot.entryIndex - 1],
        fillDate: ds.dates[lot.entryIndex],
        fillRaw: lot.entryRaw,
        shares: lot.shares,
        exitDecisionDate: ds.dates[lot.exitIndex - 1],
        exitDate: ds.dates[lot.exitIndex],
        exitRaw: lot.exitRaw,
        exitReason: lot.exitReason,
        lifetimeNet: lot.net,
        interest: lot.interest,
        friction: lot.friction,
        priceGain: lot.priceGain,
        peakGross: lot.peakGross,
        peakProfit: lot.peakProfit,
        giveback: lot.peakProfit - lot.net,
        at20211231: (() => {
          const row = rowAt('2021-12-31');

          return {
            gross: row.gross,
            loan: row.loan,
            ltv: row.loan / row.gross,
            openValue: row.liquidation - row.realized
          };
        })(),
        increment2022: lot.net - (rowAt('2021-12-31').liquidation - rowAt('2021-12-31').realized)
      }
    : null;

  // counterfactual sizing overlays on the fold-C pick (both financing modes)
  const counterfactuals = (['slot', 'net'] as const).flatMap((financing) =>
    sizingVariants.map((variant) => {
      const policy = { ...policyOfStage1(specs.C!), id: `s1:${specs.C!.id}/${variant.key}`, sizing: variant.spec };
      const run = fast.run(policy, { ...slot, financing, windows: b });
      const traded = run.trades.find((t) => ds.dates[t.entryIndex] === '2020-03-16');

      evaluations++;

      return {
        financing,
        sizing: variant.key,
        windows: run.windows.map((w) => ({ increment: w.increment, minuteDd: w.minuteDd.maximum })),
        net: run.endLiquidation,
        lot: traded
          ? {
              net: traded.net,
              trims: traded.trims.length,
              exitDate: ds.dates[traded.exitIndex],
              peakGross: traded.peakGross
            }
          : null
      };
    })
  );

  // (b) executable paths of Stage 1's picks
  const stage1Policies = folds.map((f) => policyOfStage1(specs[f]!));
  const paths: Record<string, ReturnType<typeof sealRun>> = {};

  for (const financing of ['slot', 'net'] as const) {
    for (const transition of ['S1', 'S2', 'S3'] as Transition[]) {
      const run = runPath(fast, stage1Policies, { ...defaultOptions(e, end), financing }, transition);

      paths[`${financing}|${transition}`] = sealRun(ds, run, b[0]!);
      evaluations++;
    }
  }

  // the H pick (in-sample reference) continuously; C-ALR continuously in fixed-slot mode (Stage 1's E item)
  const hRun = fast.run(policyOfStage1(specs.H!), slot);
  const calr = fast.run(controlPolicy('C-ALR'), { ...slot, windows: b });

  evaluations += 2;

  const planned = 4 * 2 + 1 + 2 * sizingVariants.length + 6 + 2;

  if (evaluations > planned) {
    throw new Error(`refused: repair used ${evaluations} evaluations, above its plan ${planned}`);
  }

  return writeStage('repair', {
    door,
    summary: {
      planned,
      picks: Object.fromEntries(
        Object.entries(picks).map(([h, p]) => [
          h,
          { sealed: p.sealed, derived: p.derived, equal: p.equal, expected: stage1Picks[h as keyof typeof stage1Picks] }
        ])
      ),
      continuous: continuous.map((c) => ({
        fold: c.fold,
        id: c.id,
        sealedV: c.sealedV,
        stage1V: c.s1.window!.increment,
        stage1bV: c.run.windows[0]!.increment,
        stage1WindowDd: c.s1.window!.minuteDrawdown.maximum,
        stage1bWindowDd: c.run.windows[0]!.minuteDd.maximum
      })),
      splice: {
        sumV: continuous.reduce((a, c) => a + c.run.windows[0]!.increment, 0),
        sealedSum: analysis.summary.rubric.V.reduce((a, v) => a + v, 0),
        exactChainDd: chained.minuteDrawdown,
        stage1ChainDd: stage1Chain.minuteDrawdown,
        sealedPiDd: analysis.summary.rubric.pi.minuteDrawdown
      },
      lotTrace,
      hPick: { id: specs.H!.id, net: hRun.endLiquidation, minuteDd: hRun.minuteDd.maximum },
      evaluations,
      runtime: runtimeInfo(started, 0)
    },
    payloads: {
      paths,
      counterfactuals,
      continuousRuns: Object.fromEntries(continuous.map((c) => [c.fold, sealRun(ds, c.run, e)])),
      foldCFull: sealRun(ds, cRun, e),
      calrSlot: {
        windows: calr.windows.map((w) => ({
          increment: w.increment,
          interest: w.interest,
          minuteDd: w.minuteDd.maximum
        }))
      }
    }
  });
};

// ----- picks from the sealed develop records -----

export interface FoldPicks {
  rod: (Pick | undefined)[];
  net: (Pick | undefined)[];
  p0: (Pick | undefined)[];
  noE06: (Pick | undefined)[];
  h: { rod?: Pick; net?: Pick; p0?: Pick };
  hPairings: Pick[];
}

export const sealedPicks = (): FoldPicks => {
  const selection = (h: string) => readPayload<DevelopResult>(`develop-${h}`, 'selection');
  const byFold = folds.map((f) => selection(f));
  const h = selection('H');
  const hPairings: Pick[] = h.pairings
    .filter((p) => p.selectors.rod)
    .map((p) => {
      const entry = p.selectors.rod!;

      return {
        key: entry.final.key,
        policy: entry.final.policy,
        pairing: p.id,
        score: entry.final.score,
        summary: entry.final.summary,
        dims: entry.champion.dims,
        values: entry.champion.values
      };
    });

  return {
    rod: byFold.map((r) => r.picks.rod),
    net: byFold.map((r) => r.picks.net),
    p0: byFold.map((r) => r.picks.p0),
    noE06: byFold.map((r) => r.picks.noE06),
    h: { rod: h.picks.rod, net: h.picks.net, p0: h.picks.p0 },
    hPairings
  };
};

const policyOfPick = (pick: Pick | undefined) => (pick ? policyOf(pick.key) : undefined);

// ----- evaluate -----

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
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const b = boundaries(ds);
  const fast = new Engine(ds);
  const base = defaultOptions(e, end);
  const picks = sealedPicks();
  const pol = {
    rod: picks.rod.map(policyOfPick),
    net: picks.net.map(policyOfPick),
    p0: picks.p0.map(policyOfPick),
    noE06: picks.noE06.map(policyOfPick)
  };
  const runs: Record<
    string,
    { schedule: ScheduleItem[] | Policy; options: RunOptions; result: RunResult; firstIndex: number }
  > = {};
  const record = (name: string, schedule: ScheduleItem[] | Policy, options: RunOptions, firstIndex: number) => {
    runs[name] = { schedule, options, result: fast.run(schedule, options), firstIndex };
  };

  for (const transition of ['S1', 'S2', 'S3'] as Transition[]) {
    record(`Pi1-${transition}`, pathSchedule(ds, pol.rod), pathOptions(ds, base, transition), b[0]!);
  }

  record('Pi-NET', pathSchedule(ds, pol.net), pathOptions(ds, base, 'S1'), b[0]!);
  record('Pi-P0', pathSchedule(ds, pol.p0), pathOptions(ds, base, 'S1'), b[0]!);
  record('Pi-noE06', pathSchedule(ds, pol.noE06), pathOptions(ds, base, 'S1'), b[0]!);
  record(
    'static-A',
    pathSchedule(ds, [pol.rod[0], pol.rod[0], pol.rod[0], pol.rod[0]]),
    pathOptions(ds, base, 'S1'),
    b[0]!
  );

  // controls: flat-start continuous and annual reset with Π1's (and, for Π-NET's qualifier, Π-NET's) window sizing
  const sizings = pol.rod.map((p) => p?.sizing ?? { kind: 'Z0' as const });
  const netSizings = pol.net.map((p) => p?.sizing ?? { kind: 'Z0' as const });

  for (const name of ['C-AL', 'C-ALR', 'C-ALZ1', 'C-SMA', 'C-DON', 'C-TSM', 'C-STOP', 'C-IDLE']) {
    record(`${name}|flat`, controlPolicy(name), pathOptions(ds, base, 'S1'), b[0]!);

    if (name !== 'C-ALR') {
      record(`${name}|reset`, controlResetSchedule(ds, name, sizings), pathOptions(ds, base, 'S1'), b[0]!);
    }

    if (['C-SMA', 'C-DON', 'C-TSM'].includes(name)) {
      record(`${name}|reset-net`, controlResetSchedule(ds, name, netSizings), pathOptions(ds, base, 'S1'), b[0]!);
    }
  }

  // continuous runs of every pick from 2017-01-03 (within-strategy window increments) and the splice of the RoD picks
  const continuous: Record<string, unknown> = {};
  const spliceParts: { boundaryMark: number; endMark: number; stream: { times: number[]; values: number[] } }[] = [];

  for (const kind of ['rod', 'net', 'p0'] as const) {
    pol[kind].forEach((policy, i) => {
      if (!policy) {
        return;
      }

      const { stream, options } = streamOptions({ ...base, windows: b, recordDaily: true }, ds.sCloseTime[b[i]!]!);
      const run = fast.run(policy, options);
      const w = run.windows[i]!;

      continuous[`${kind}|${folds[i]}`] = {
        policy: policy.id,
        windows: run.windows.map((x) => ({ increment: x.increment, minuteDd: x.minuteDd.maximum })),
        summary: summarise(run)
      };

      if (kind === 'rod') {
        const windowEnd = w.end;
        const inWindow = { times: [] as number[], values: [] as number[] };

        stream.times.forEach((t, j) => {
          if (t <= ds.sCloseTime[windowEnd]!) {
            inWindow.times.push(t);
            inWindow.values.push(stream.values[j]!);
          }
        });
        spliceParts.push({ boundaryMark: w.startMark, endMark: w.endMark, stream: inWindow });
      }
    });
  }

  const splice = {
    increments: spliceParts.map(
      (p, i) => (continuous[`rod|${folds[i]}`] as { windows: { increment: number }[] }).windows[i]!.increment
    ),
    chained: chainStreams(spliceParts)
  };

  // each fold pick's development-year increments from a flat start each year (descriptive)
  const yearly: Record<string, { year: number; increment: number; minuteDd: number }[]> = {};

  pol.rod.forEach((policy, i) => {
    if (!policy) {
      return;
    }

    const devEnd = indexOfDate(ds, histories[folds[i]!].developmentEnd);
    const rows: { year: number; increment: number; minuteDd: number }[] = [];

    for (let year = 2017; year <= Number(ds.dates[devEnd]!.slice(0, 4)); year++) {
      const first = year === 2017 ? e : ds.dates.findLastIndex((d) => d < `${year}-01-01`);
      const last = ds.dates.findLastIndex((d) => d <= `${year}-12-31`);
      const run = fast.run(policy, { ...base, firstDecisionIndex: first, endIndex: Math.min(last, devEnd) });

      rows.push({ year, increment: run.endLiquidation, minuteDd: run.minuteDd.maximum });
    }

    yearly[folds[i]!] = rows;
  });

  // guards: b-marks, prefix invariance, poisoned future, truncated-run prefix, reference parity
  const bmarks: { fold: string; kind: string; sealed: number; replay: number; equal: boolean }[] = [];

  for (const kind of ['rod', 'net', 'p0'] as const) {
    [...picks[kind], picks.h[kind]].forEach((pick, i) => {
      if (!pick) {
        return;
      }

      const devEnd = indexOfDate(ds, histories[i < 4 ? folds[i]! : 'H'].developmentEnd);
      const run = fast.run(policyOf(pick.key), { ...base, endIndex: devEnd });

      bmarks.push({
        fold: i < 4 ? folds[i]! : 'H',
        kind,
        sealed: pick.summary.net,
        replay: run.endLiquidation,
        equal: Math.abs(run.endLiquidation - pick.summary.net) <= 1e-6 && run.pathHash === pick.summary.pathHash
      });
    });
  }

  const guardPolicies = [...pol.rod, ...pol.net, ...pol.p0, ...pol.noE06].filter((p): p is Policy => Boolean(p));
  const pathRuns = ['Pi1-S1', 'Pi1-S2', 'Pi1-S3', 'Pi-NET'].map((n) => ({
    schedule: runs[n]!.schedule,
    options: runs[n]!.options
  }));
  const guards = b
    .slice(0, 4)
    .flatMap((boundary, i) => [
      { kind: 'prefix', ...prefixInvariance(ds, boundary, guardPolicies) },
      { kind: 'poisoned', ...poisonedFuture(ds, boundary, pathRuns, seedOf(`study3b|poison|evaluate|${i}`)) },
      ...(i > 0 ? [{ kind: 'truncated', ...truncatedRunPrefix(ds, boundary, pathRuns) }] : [])
    ]);
  const parity = new ParityTally();

  for (const [name, r] of Object.entries(runs)) {
    parity.add(name, compareRuns(r.result, referenceRun(ds, r.schedule, r.options), 1e-6));
  }

  // legs and distributions for the verdict path and references
  const legs = legsOf(ds, e, end);
  const legStats = Object.fromEntries(
    ['Pi1-S1', 'Pi1-S2', 'Pi-NET', 'C-AL|flat'].map((name) => [
      name,
      legs
        .filter((l) => l.t1 > b[0]!)
        .map((leg) => legCapture(ds, leg, runs[name]!.result, runs[name]!.firstIndex, end))
    ])
  );
  const distributionLedger = distributionsOf(ds, runs, ['Pi1-S1', 'Pi1-S2', 'C-AL|flat', 'C-ALR|flat', 'C-ALZ1|flat']);

  const defined = (list: (Pick | undefined)[]) => list.filter(Boolean).length;
  const planned =
    2 * (7 + 8 + 7 + 3) +
    defined([...picks.rod, ...picks.net, ...picks.p0]) +
    picks.rod.reduce((a, p, i) => a + (p ? Number(histories[folds[i]!].developmentEnd.slice(0, 4)) - 2016 : 0), 0) +
    defined([...picks.rod, picks.h.rod, ...picks.net, picks.h.net, ...picks.p0, picks.h.p0]);
  const used =
    Object.keys(runs).length * 2 + Object.keys(continuous).length + Object.values(yearly).flat().length + bmarks.length;

  if (used > planned) {
    throw new Error(`refused: evaluate used ${used} evaluations, above its plan ${planned}`);
  }

  return writeStage('evaluate', {
    door,
    summary: {
      paths: Object.fromEntries(
        Object.entries(runs).map(([name, r]) => [
          name,
          {
            windows: r.result.windows.map((w) => w.increment),
            end: r.result.endLiquidation,
            minuteDd: r.result.minuteDd.maximum
          }
        ])
      ),
      bmarks,
      guards,
      parity: parity.summary(),
      planned,
      evaluations: used,
      runtime: runtimeInfo(started, 0)
    },
    payloads: {
      runs: Object.fromEntries(
        Object.entries(runs).map(([name, r]) => [
          name,
          {
            policies: Array.isArray(r.schedule)
              ? r.schedule.map((s) => ({ index: s.index, date: ds.dates[s.index], policy: s.policy.id, key: s.policy }))
              : [r.schedule.id],
            ...sealRun(ds, r.result, r.firstIndex)
          }
        ])
      ),
      continuous,
      splice,
      yearly,
      legs: { legs, stats: legStats },
      distributions: distributionLedger
    }
  });
};

const distributionsOf = (
  ds: Dataset,
  runs: Record<string, { result: RunResult; firstIndex: number }>,
  names: string[]
) => {
  const rows = fs
    .readFileSync('config/market-events/distributions.csv', 'utf8')
    .split('\n')
    .slice(1)
    .map((line) => line.split(','))
    .filter((cols) => cols[0] === 'VGT' && cols[1]! <= study.dataCap);

  return Object.fromEntries(
    names.map((name) => {
      const r = runs[name]!;
      let total = 0;

      for (const cols of rows) {
        const exIndex = ds.dates.findIndex((d) => d >= cols[1]!);
        const before = exIndex - 1 - r.firstIndex;
        const shares = before >= 0 ? (r.result.daily![before]?.shares ?? 0) : 0;

        total += shares * Number(cols[3]);
      }

      return [name, { exDates: rows.length, amount: total }];
    })
  );
};

// ----- robustness -----

const keyWith = (pick: Pick, values: Params): PolicyKey => {
  const entryParams: Params = { ...pick.key.entryParams };
  const exitParams: Params = 'family' in pick.key.exit ? { ...pick.key.exit.params } : {};

  for (const [name, value] of Object.entries(values)) {
    if (name.startsWith('e.')) {
      entryParams[name.slice(2)] = value;
    } else if (name.startsWith('x.')) {
      exitParams[name.slice(2)] = value;
    }
  }

  return {
    ...pick.key,
    entryParams,
    exit: 'family' in pick.key.exit ? { family: pick.key.exit.family, params: exitParams } : pick.key.exit
  };
};

export const oatPoints = (dims: Dim[], center: Params) => {
  const points: { dim: string; step: number; values: Params }[] = [];

  for (const dim of dims) {
    if (isDiscrete(dim)) {
      for (let v = dim.lo; v <= dim.hi; v++) {
        if (v !== center[dim.name]) {
          points.push({ dim: dim.name, step: v - center[dim.name]!, values: { ...center, [dim.name]: v } });
        }
      }

      continue;
    }

    const step =
      dim.q === 1
        ? Math.max(
            1,
            Math.round(neighbourhoods.oatStepFraction * ((dim as Dim & { span?: number }).span ?? dim.hi - dim.lo))
          )
        : neighbourhoods.oatStepFraction * ((dim as Dim & { span?: number }).span ?? dim.hi - dim.lo);

    for (const k of neighbourhoods.oatSteps) {
      const value = quantizeDim(dim, Math.min(dim.hi, Math.max(dim.lo, center[dim.name]! + k * step)));

      if (value !== center[dim.name]) {
        points.push({ dim: dim.name, step: k, values: { ...center, [dim.name]: value } });
      }
    }
  }

  return points;
};

const neighbourhoodOf = (engine: Engine, pick: Pick, options: RunOptions, windowIndex?: number) => {
  const center = pick.values;
  const oat = oatPoints(pick.dims, center);
  const joint = jointDraws(
    pick.dims,
    center,
    neighbourhoods.jointDraws,
    neighbourhoods.jointRadius,
    `study3b|${pick.policy}|J128`
  );
  const run = (values: Params) => {
    const result = engine.run(policyOf(keyWith(pick, values)), options);
    const s = summarise(result);
    const w = windowIndex !== undefined ? result.windows[windowIndex] : undefined;

    return {
      net: w ? w.increment : s.net,
      minuteDd: w ? w.minuteDd.maximum : s.minuteDd,
      dailyDd: w ? w.dailyDd : s.dailyDd,
      peakGross: s.peakGross,
      sessionsLong: s.sessionsLong,
      stops: (s.exits.stop ?? 0) + (s.exits['stop gap'] ?? 0),
      reentries: s.reentries,
      path: s.pathHash,
      bestTrade: s.bestTrade
    };
  };
  const c = run(center);
  const oatRows = oat.map((p) => ({ dim: p.dim, step: p.step, ...run(p.values) }));
  const jointRows = joint.map((values) => run(values));
  const both = (r: { net: number; minuteDd: number }) => r.net > 0 && r.minuteDd <= study.ddReference;
  const describe = (rows: ReturnType<typeof run>[]) => {
    const distinct = rows.filter((r) => r.path !== c.path);

    return {
      n: rows.length,
      net: distribution(rows.map((r) => r.net)),
      minuteDd: distribution(rows.map((r) => r.minuteDd)),
      dailyDd: distribution(rows.map((r) => r.dailyDd)),
      peakGross: distribution(rows.map((r) => r.peakGross)),
      sessionsLong: distribution(rows.map((r) => r.sessionsLong)),
      stops: distribution(rows.map((r) => r.stops)),
      reentries: distribution(rows.map((r) => r.reentries)),
      shareNetPositive: rows.filter((r) => r.net > 0).length / rows.length,
      shareDdOk: rows.filter((r) => r.minuteDd <= study.ddReference).length / rows.length,
      shareBoth: rows.filter(both).length / rows.length,
      retention: c.net !== 0 ? distribution(rows.map((r) => r.net)).median / c.net : NaN,
      pathIdenticalShare: rows.filter((r) => r.path === c.path).length / rows.length,
      shareBothPathDistinct: distinct.length ? distinct.filter(both).length / distinct.length : NaN,
      uniqueVectors: new Set(rows.map((r) => r.path)).size,
      netExcludingBest: distribution(rows.map((r) => r.net - Math.max(0, r.bestTrade)))
    };
  };
  const oatNets = oatRows.map((r) => r.net);
  const envelope = oatNets.length ? [Math.min(...oatNets, c.net), Math.max(...oatNets, c.net)] : [c.net, c.net];

  return {
    policy: pick.policy,
    center: c,
    oat: { rows: oatRows, ...describe(oatRows) },
    joint: {
      ...describe(jointRows),
      outsideOatEnvelope:
        jointRows.filter((r) => r.net < envelope[0]! || r.net > envelope[1]!).length / jointRows.length
    },
    jointRows
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
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const b = boundaries(ds);
  const fast = new Engine(ds);
  const base = defaultOptions(e, end);
  const picks = sealedPicks();
  const rodPolicies = picks.rod.map(policyOfPick);
  let evaluations = 0;

  const neighbourhoodCost = (pick: Pick | undefined) =>
    pick ? 1 + oatPoints(pick.dims, pick.values).length + neighbourhoods.jointDraws : 0;
  const planned =
    2 * 15 +
    4 +
    2 * neighbourhoods.jointDraws +
    1 +
    picks.rod.reduce((a, p) => a + 2 * neighbourhoodCost(p), 0) +
    [picks.h.rod, picks.h.net, ...picks.hPairings].reduce((a, p) => a + neighbourhoodCost(p), 0) +
    picks.net.reduce((a, p) => a + neighbourhoodCost(p), 0);

  // stresses (no reselection)
  const variants: { name: string; options: Partial<RunOptions>; dataset?: Dataset }[] = [
    ...stresses.costs.map((c) => ({ name: `costBps=${c}`, options: { costBps: c } })),
    ...stresses.rates.map((r) => ({ name: `rate=${r}`, options: { rate: r } })),
    ...stresses.stopSlippageBps.map((x) => ({ name: `stopSlippageBps=${x}`, options: { stopSlippageBps: x } })),
    ...stresses.entrySlippageBps.map((x) => ({ name: `entrySlippageBps=${x}`, options: { entrySlippageBps: x } })),
    ...stresses.openSlippageBps.map((x) => ({ name: `openSlippageBps=${x}`, options: { openSlippageBps: x } })),
    ...stresses.delayMinutes.map((x) => ({ name: `delayMinutes=${x}`, options: { delayMinutes: x } })),
    ...stresses.missingBars.map((x) => ({
      name: `missingBars=${x}`,
      options: {},
      dataset: withMissingBars(ds, x, seedOf(`study3b|missing|${x}`))
    }))
  ];
  const stressRows = variants.map((v) => {
    const engine = v.dataset ? new Engine(v.dataset) : fast;
    const path = runPath(engine, rodPolicies, { ...base, ...v.options }, 'S1');
    const h = picks.h.rod ? engine.run(policyOf(picks.h.rod.key), { ...base, ...v.options }) : undefined;

    evaluations += h ? 2 : 1;

    return {
      name: v.name,
      pi1: {
        windows: path.windows.map((w) => ({ increment: w.increment, minuteDd: w.minuteDd.maximum })),
        end: path.endLiquidation,
        minuteDd: path.minuteDd.maximum
      },
      hPick: h ? { net: h.endLiquidation, minuteDd: h.minuteDd.maximum } : null
    };
  });

  log(`robustness stresses ${stressRows.length}`);

  // neighbourhoods: fold picks on development data and post-selection over their next window; H picks on 2017–2023
  const fold = folds.map((f, i) => {
    const pick = picks.rod[i];

    if (!pick) {
      return { fold: f, development: null, postSelection: null };
    }

    const devEnd = indexOfDate(ds, histories[f].developmentEnd);
    const devEngine = new Engine(truncate(ds, devEnd));
    const development = neighbourhoodOf(devEngine, pick, { ...base, endIndex: devEnd });
    const windowEnd = i < 3 ? b[i + 1]! : end;
    const postSelection = neighbourhoodOf(fast, pick, { ...base, endIndex: windowEnd, windows: [b[i]!] }, 0);

    evaluations += 2 * (1 + development.oat.n + development.joint.n);
    log(`robustness neighbourhood ${f}`);

    return {
      fold: f,
      development: { ...development, jointRows: undefined },
      postSelection: { ...postSelection, jointRows: undefined },
      jointDev: development.jointRows
    };
  });
  const hNeighbourhoods = [picks.h.rod, picks.h.net, ...picks.hPairings]
    .filter((p): p is Pick => Boolean(p))
    .map((pick) => {
      const n = neighbourhoodOf(fast, pick, base);

      evaluations += 1 + n.oat.n + n.joint.n;

      return { ...n, jointRows: undefined };
    });
  const netFold = folds.map((f, i) => {
    const pick = picks.net[i];

    if (!pick) {
      return null;
    }

    const devEnd = indexOfDate(ds, histories[f].developmentEnd);
    const n = neighbourhoodOf(new Engine(truncate(ds, devEnd)), pick, { ...base, endIndex: devEnd });

    evaluations += 1 + n.oat.n + n.joint.n;

    return { fold: f, ...n, jointRows: undefined };
  });

  log('robustness neighbourhoods done');

  // perturbed executable paths: path j replaces every fold pick by its j-th J128 draw (Π1 and, for the qualifier, Π-NET)
  const perturbedOf = (list: (Pick | undefined)[]) => {
    const draws = list.map((pick) =>
      pick
        ? jointDraws(
            pick.dims,
            pick.values,
            neighbourhoods.jointDraws,
            neighbourhoods.jointRadius,
            `study3b|${pick.policy}|J128`
          )
        : undefined
    );

    return Array.from({ length: neighbourhoods.jointDraws }, (_, j) => {
      const policies = list.map((pick, i) => (pick ? policyOf(keyWith(pick, draws[i]![j]!)) : undefined));
      const run = runPath(fast, policies, base, 'S1');

      evaluations++;

      return {
        j,
        windows: run.windows.map((w) => w.increment),
        sum: run.endLiquidation,
        minuteDd: run.minuteDd.maximum
      };
    });
  };
  const perturbed = perturbedOf(picks.rod);
  const perturbedNet = perturbedOf(picks.net);
  const netPolicies = picks.net.map(policyOfPick);
  const netStresses = variants
    .filter((v) => ['costBps=10', 'rate=0.14', 'stopSlippageBps=25', 'delayMinutes=1'].includes(v.name))
    .map((v) => {
      const path = runPath(fast, netPolicies, { ...base, ...v.options }, 'S1');

      evaluations++;

      return { name: v.name, end: path.endLiquidation, minuteDd: path.minuteDd.maximum };
    });

  // XV crisis traces (ratcheted vs un-ratcheted) for XV finalists, else XV defaults on E06
  const xvPick = [...picks.rod, picks.h.rod].find((p) => p && 'family' in p.key.exit && p.key.exit.family === 'XV');
  const xvPolicy = xvPick
    ? policyOf(xvPick.key)
    : policyOf({
        entry: 'E06',
        entryParams: { v_in: 0.2, v_gap: 0.15, N: 50 },
        exit: { family: 'XV', params: { k: 3, n: 20, dmin: 0.04, dgap: 0.11, h: 0.08, own: 0 } },
        reentry: 'R3F',
        sizing: { kind: 'Z0' }
      });
  const xvRun = fast.run(xvPolicy, base);
  const atr = fast.F.atr(xvPolicy.exit.vol!.n);
  const traces = [
    ['2018-10-01', '2019-04-30'],
    ['2020-02-19', '2020-08-31'],
    ['2022-01-03', '2022-12-30']
  ].map(([from, to]) => {
    const rows: {
      date: string;
      close: number;
      hc: number;
      atr: number;
      unratcheted: number;
      ratcheted: number;
      trade: number;
    }[] = [];

    for (const t of xvRun.trades) {
      let hc = t.entryRaw;
      let ratcheted = -Infinity;
      const last = t.exitIndex < 0 ? end : t.exitIndex;

      for (let s = t.entryIndex; s <= last; s++) {
        hc = Math.max(hc, ds.sClose[s]!);

        const v = xvPolicy.exit.vol!;
        const distance = Number.isFinite(atr[s]!) ? Math.min(v.dmax, Math.max(v.dmin, (v.k * atr[s]!) / hc)) : v.dmax;
        const level = hc * (1 - distance);

        ratcheted = Math.max(ratcheted, level);

        if (ds.dates[s]! >= from! && ds.dates[s]! <= to!) {
          rows.push({
            date: ds.dates[s]!,
            close: ds.sClose[s]!,
            hc,
            atr: atr[s]!,
            unratcheted: level,
            ratcheted,
            trade: t.id
          });
        }
      }
    }

    return { from, to, rows };
  });

  evaluations++;

  if (evaluations > planned) {
    throw new Error(`refused: robustness used ${evaluations} evaluations, above its plan ${planned}`);
  }

  return writeStage('robustness', {
    door,
    summary: {
      stresses: stressRows,
      perturbed: {
        n: perturbed.length,
        shareOk: perturbed.filter((p) => p.sum > 0 && p.minuteDd <= study.ddReference).length / perturbed.length,
        median: distribution(perturbed.map((p) => p.sum)).median,
        sum: distribution(perturbed.map((p) => p.sum)),
        minuteDd: distribution(perturbed.map((p) => p.minuteDd))
      },
      perturbedNet: {
        n: perturbedNet.length,
        shareOk: perturbedNet.filter((p) => p.sum > 0 && p.minuteDd <= study.ddReference).length / perturbedNet.length,
        median: distribution(perturbedNet.map((p) => p.sum)).median
      },
      netStresses,
      planned,
      evaluations,
      runtime: runtimeInfo(started, 0)
    },
    payloads: {
      stresses: stressRows,
      foldNeighbourhoods: fold.map((f) => ({
        fold: f.fold,
        development: f.development,
        postSelection: f.postSelection
      })),
      foldJointRows: fold.map((f) => ('jointDev' in f ? f.jointDev : null)),
      netFoldNeighbourhoods: netFold,
      hNeighbourhoods,
      perturbed,
      perturbedNet,
      xv: { policy: xvPolicy.id, fromPick: Boolean(xvPick), traces }
    }
  });
};

export type { FoldKey };
