// Study A — standalone GDX D1 (PROTOCOL.md §5). Two stages per fold ('main': search ≤ 2021-12-31, validation
// 2022–2023; 'wf20': search ≤ 2019-12-31, test 2020–2021):
//   search   — screen + three NSGA-II replicates + the distinct-region shortlist (search door only), sealed;
//   validate — robustness and validation evidence for the shortlist and the controls, the gates, scores and roles.
import { pboOf } from '../d1-robust/pbo.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { operatorSpace } from '../multi-etf-d1/space.ts';
import {
  execution,
  neighbourhood,
  periods,
  resultFile,
  seedOf,
  stresses,
  studyA,
  studyAControls,
  frozenGrids,
  halfYears
} from './context.ts';
import { openDoor } from './data.ts';
import { type RunMetrics, Evaluator, baseSettings, round, settingsWith } from './engine.ts';
import {
  type Grid,
  distance,
  genomeOfGrid,
  gridOfGenome,
  neighbourhoodOf,
  probesOf,
  quantile,
  median,
  sobolGrids,
  vectorId,
  describe
} from './grid.ts';
import { log, nowIso, readSealed, writeJsonl, writeSealed } from './records.ts';
import { type Candidate, type SearchSummary, runNsga2 } from './search.ts';

export type Fold = 'main' | 'wf20';

export const foldSpec = (fold: Fold) =>
  fold === 'main'
    ? {
        searchDoor: 'search' as const,
        testDoor: 'validation' as const,
        devKey: periods.dev.key,
        valKey: periods.val.key,
        valStart: '2022-01-01',
        feasibility: studyA.feasibility.main,
        minTrades: studyA.gates.minTrades,
        minYears: studyA.gates.minYears
      }
    : {
        searchDoor: 'search-wf20' as const,
        testDoor: 'search' as const,
        devKey: periods.wfSearch.key,
        valKey: periods.wfTest.key,
        valStart: '2020-01-01',
        feasibility: studyA.feasibility.wf20,
        minTrades: studyA.gates.wfMinTrades,
        minYears: studyA.gates.wfMinYears
      };

export interface ARecord {
  id: string;
  grid: Grid;
  origin: string;
  net: number;
  dd: number;
  ddDaily: number;
  closed: number;
  lots: number;
  years: number;
  wins: number;
  worst: number;
  best: number;
}

const recordOf = (ev: Evaluator, grid: Grid, origin: string): ARecord => {
  const m = ev.metrics({ GDX: grid });

  return {
    id: vectorId(grid),
    grid,
    origin,
    net: m.net,
    dd: m.minuteDrawdown,
    ddDaily: m.dailyDrawdown,
    closed: m.closed,
    lots: m.lots,
    years: m.closedYears,
    wins: m.wins,
    worst: m.worstLot,
    best: m.bestLot
  };
};

const violationOf = (record: ARecord, feasibility: { minTrades: number; minYears: number }) =>
  Math.max(0, record.dd - execution.drawdownCeiling) / execution.drawdownCeiling +
  Math.max(0, feasibility.minTrades - record.closed) / feasibility.minTrades +
  Math.max(0, feasibility.minYears - record.years) / feasibility.minYears;

export const feasibleA = (record: ARecord, feasibility: { minTrades: number; minYears: number }) =>
  record.dd < execution.drawdownCeiling &&
  record.closed >= feasibility.minTrades &&
  record.years >= feasibility.minYears;

const candidateOf = (record: ARecord, feasibility: { minTrades: number; minYears: number }): Candidate<ARecord> => ({
  id: record.id,
  genome: genomeOfGrid(record.grid),
  objectives: [-record.net, record.dd],
  violation: Number.isFinite(record.net) ? violationOf(record, feasibility) : 1e9,
  origin: record.origin,
  payload: record
});

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// §5.4 the distinct-region shortlist
export const shortlistOf = (feasible: ARecord[]) => {
  const { shortlist } = studyA;
  const taken: (ARecord & { list: string })[] = [];
  const add = (list: string, ordered: ARecord[], limit: number) => {
    let added = 0;

    for (const record of ordered) {
      if (added >= limit) {
        break;
      }

      if (taken.every((other) => distance(other.grid, record.grid) >= shortlist.distance)) {
        taken.push({ ...record, list });
        added++;
      }
    }
  };
  const byNet = [...feasible].sort((a, b) => b.net - a.net || byId(a, b));
  const bestNet = byNet[0]?.net ?? 0;

  add('net', byNet, shortlist.net);
  add(
    'ratio',
    [...feasible].sort(
      (a, b) =>
        b.net / Math.max(b.dd, shortlist.ratioFloor) - a.net / Math.max(a.dd, shortlist.ratioFloor) || byId(a, b)
    ),
    shortlist.ratio
  );
  add(
    'lowDd',
    byNet.filter((record) => record.dd <= shortlist.lowDdCeiling && record.net >= shortlist.lowDdNetShare * bestNet),
    shortlist.lowDd
  );

  return taken;
};

const dir = (fold: Fold, ...parts: string[]) => resultFile('studyA', fold, ...parts);

export const runSearchA = async (fold: Fold) => {
  const spec = foldSpec(fold);
  const door = await openDoor(spec.searchDoor, ['GDX'], `Study A ${fold} search`);
  const ev = new Evaluator(door);
  const started = Date.now();
  const screen: ARecord[] = [];
  const { grids, seed, drawn } = sobolGrids(studyA.sobolSamples, 'A', fold, 'sobol');

  screen.push(recordOf(ev, frozenGrids.VGT, 'control:D1 shipped constants'));

  for (const [index, grid] of grids.entries()) {
    screen.push(recordOf(ev, grid, `sobol:${index + 1}`));
  }

  log(`A ${fold}: screen ${screen.length} vectors in ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const summaries: SearchSummary[] = [];
  const archives: ARecord[][] = [];

  for (let replicate = 1; replicate <= studyA.replicates; replicate++) {
    const archive = new Map<string, Candidate<ARecord>>();
    const initial = screen.map((record) => candidateOf(record, spec.feasibility));

    for (const candidate of initial) {
      archive.set(candidate.id, candidate);
    }

    const summary = runNsga2(
      {
        ...studyA.ga,
        variation: {
          crossoverProbability: studyA.ga.crossoverProbability,
          crossoverEta: studyA.ga.crossoverEta,
          mutationEta: studyA.ga.mutationEta
        },
        reference: [0, execution.drawdownCeiling],
        seed: deriveSeed(...seedOf('A', fold, 'nsga2', replicate)),
        space: operatorSpace,
        label: `ga:A:r${replicate}`
      },
      initial,
      archive,
      (genome) => vectorId(gridOfGenome(genome)),
      (genome, _id, origin) => candidateOf(recordOf(ev, gridOfGenome(genome), origin), spec.feasibility)
    );

    summaries.push(summary);
    archives.push(
      [...archive.values()]
        .filter((candidate) => candidate.origin.startsWith('ga:'))
        .map((candidate) => candidate.payload)
    );
    log(
      `A ${fold}: replicate ${replicate} ${summary.newVectors} new, ${summary.generations} generations, ${summary.stopReason}`
    );
  }

  const union = new Map<string, ARecord>();

  for (const record of [...screen, ...archives.flat()]) {
    if (!union.has(record.id)) {
      union.set(record.id, record);
    }
  }

  const feasible = [...union.values()].filter((record) => feasibleA(record, spec.feasibility));
  const shortlist = shortlistOf(feasible);
  const replicateBest = archives.map((archive, index) => {
    const pool = [...screen, ...archive].filter((record) => feasibleA(record, spec.feasibility));
    const best = pool.sort((a, b) => b.net - a.net || byId(a, b))[0]!;

    return { replicate: index + 1, id: best.id, origin: best.origin, net: best.net, dd: best.dd, grid: best.grid };
  });
  const pathDependence = replicateBest.flatMap((a, i) =>
    replicateBest.slice(i + 1).map((b) => ({ a: a.replicate, b: b.replicate, distance: distance(a.grid, b.grid) }))
  );
  const screenFile = await writeJsonl(dir(fold, 'screen.jsonl'), screen);
  const gaFiles = [];

  for (const [index, archive] of archives.entries()) {
    gaFiles.push(await writeJsonl(dir(fold, `ga-r${index + 1}.jsonl`), archive));
  }

  const record = await writeSealed(dir(fold, 'search.json'), {
    stage: `studyA-${fold}-search`,
    at: nowIso(),
    door: door.key,
    window: { first: door.dates[0], last: door.dates[door.lastIndex], eligibility: door.dates[door.eligibilityIndex] },
    sobol: { samples: studyA.sobolSamples, drawn, seed },
    feasibility: spec.feasibility,
    budgets: studyA.ga,
    summaries,
    evaluations: { screen: screen.length, ga: archives.map((archive) => archive.length), unique: union.size },
    feasibleCount: feasible.length,
    replicateBest,
    pathDependence,
    files: { screen: screenFile, ga: gaFiles },
    shortlist: shortlist.map((item) => ({ ...item, short: describe(item.grid) })),
    traces: ev.traces,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `A ${fold}: ${union.size} unique vectors, ${feasible.length} feasible, shortlist ${shortlist.length}; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );

  return record;
};

// ----- validation evidence -----

export interface Summary {
  devMedian: number;
  devP10: number;
  devP90: number;
  valMedian: number;
  valP10: number;
  valP90: number;
  ddMedian: number;
  ddP90: number;
  ddMax: number;
  share35: number;
  positiveDev: number;
  positiveVal: number;
  count: number;
  centrePercentileDev: number;
  centrePercentileVal: number;
}

export const summarize = (
  points: { dev: number; val: number; dd: number }[],
  centre: { dev: number; val: number }
): Summary => {
  const dev = points.map((point) => point.dev);
  const val = points.map((point) => point.val);
  const dd = points.map((point) => point.dd);

  return {
    devMedian: median(dev),
    devP10: quantile(dev, 0.1),
    devP90: quantile(dev, 0.9),
    valMedian: median(val),
    valP10: quantile(val, 0.1),
    valP90: quantile(val, 0.9),
    ddMedian: median(dd),
    ddP90: quantile(dd, 0.9),
    ddMax: Math.max(...dd),
    share35: dd.filter((value) => value < execution.drawdownCeiling).length / Math.max(1, dd.length),
    positiveDev: dev.filter((value) => value > 0).length,
    positiveVal: val.filter((value) => value > 0).length,
    count: points.length,
    centrePercentileDev: dev.filter((value) => value < centre.dev).length / Math.max(1, dev.length),
    centrePercentileVal: val.filter((value) => value < centre.val).length / Math.max(1, val.length)
  };
};

const point = (metrics: RunMetrics, devKey: string, valKey: string) => ({
  dev: metrics.periods[devKey] ?? NaN,
  val: metrics.periods[valKey] ?? NaN,
  dd: metrics.minuteDrawdown,
  net: metrics.net,
  lots: metrics.lots
});

export const metricsDigest = (m: RunMetrics) => ({
  net: m.net,
  realized: m.realized,
  unrealized: m.unrealized,
  gross: m.gross,
  interest: m.interest,
  costs: m.costs,
  minuteDrawdown: m.minuteDrawdown,
  minuteDrawdownPeak: m.minuteDrawdownPeak,
  minuteDrawdownTrough: m.minuteDrawdownTrough,
  minuteDrawdownRecovery: m.minuteDrawdownRecovery,
  dailyDrawdown: m.dailyDrawdown,
  dailyDrawdownPeak: m.dailyDrawdownPeak,
  dailyDrawdownTrough: m.dailyDrawdownTrough,
  lots: m.lots,
  closed: m.closed,
  open: m.open,
  wins: m.wins,
  losses: m.losses,
  bestLot: m.bestLot,
  worstLot: m.worstLot,
  medianLot: m.medianLot,
  meanLot: m.meanLot,
  top1Share: m.top1Share,
  top3Share: m.top3Share,
  closedYears: m.closedYears,
  bySymbol: m.bySymbol,
  heldSessions: m.heldSessions,
  heldDays: m.heldDays,
  exposure: m.exposure,
  decisions: m.decisions,
  granted: m.granted,
  refused: m.refused,
  refusalsBy: m.refusalsBy,
  maxLosingStreak: m.maxLosingStreak,
  periods: m.periods,
  periodDailyDrawdown: m.periodDailyDrawdown
});

export const runValidateA = async (fold: Fold) => {
  const spec = foldSpec(fold);
  const search = await readSealed<{ shortlist: (ARecord & { list: string })[] }>(dir(fold, 'search.json'));
  const searchDoor = await openDoor(spec.searchDoor, ['GDX'], `Study A ${fold} probe feasibility (search window)`);
  const searchEv = new Evaluator(searchDoor);
  const door = await openDoor(spec.testDoor, ['GDX'], `Study A ${fold} validation evidence`);
  const ev = new Evaluator(door);
  const yearsOf = ev.yearsOf;
  const yDev = yearsOf[spec.devKey]!;
  const yVal = yearsOf[spec.valKey]!;
  const started = Date.now();
  const centres = [
    ...search.shortlist.map((item) => ({
      id: item.id,
      grid: item.grid,
      origin: item.origin,
      list: item.list,
      control: false
    })),
    ...studyAControls.map((control) => ({
      id: control.id,
      grid: control.grid,
      origin: control.status,
      list: 'control',
      control: true
    }))
  ];
  let runs = 0;
  const evidence = centres.map((centre) => {
    const base = ev.metrics({ GDX: centre.grid });
    const centrePoint = point(base, spec.devKey, spec.valKey);
    const costs = Object.fromEntries(
      [0, 2, 10].map((costBps) => {
        const m = ev.metrics({ GDX: centre.grid }, settingsWith({ costBps }));

        return [
          costBps,
          { net: m.net, dd: m.minuteDrawdown, dev: m.periods[spec.devKey], val: m.periods[spec.valKey] }
        ];
      })
    );
    const stress = Object.fromEntries(
      stresses.map((stressSpec) => {
        const { key, ...overrides } = stressSpec;
        const m = ev.metrics({ GDX: centre.grid }, settingsWith(overrides));

        return [key, { net: m.net, dd: m.minuteDrawdown, dev: m.periods[spec.devKey], val: m.periods[spec.valKey] }];
      })
    );
    const isolated = ev.metrics({ GDX: centre.grid }, settingsWith({ startDate: spec.valStart }));
    const probes = probesOf(centre.grid).map((probe) => {
      const m = ev.metrics({ GDX: probe.grid });
      const s = searchEv.metrics({ GDX: probe.grid });
      const feasibleDev =
        s.minuteDrawdown < execution.drawdownCeiling &&
        s.closed >= spec.feasibility.minTrades &&
        s.closedYears >= spec.feasibility.minYears;

      return {
        key: probe.key,
        offset: probe.offset,
        id: vectorId(probe.grid),
        ...point(m, spec.devKey, spec.valKey),
        devDd: s.minuteDrawdown,
        feasibleDev
      };
    });
    const n1 = neighbourhoodOf(centre.grid, neighbourhood.n1, 1, 'A', fold, centre.id).map((grid) =>
      point(ev.metrics({ GDX: grid }), spec.devKey, spec.valKey)
    );
    const n2 = neighbourhoodOf(centre.grid, neighbourhood.n2, 2, 'A2', fold, centre.id).map((grid) =>
      point(ev.metrics({ GDX: grid }), spec.devKey, spec.valKey)
    );

    runs += 1 + 3 + stresses.length + 1 + probes.length * 2 + n1.length + n2.length;

    const n1Summary = summarize(n1, centrePoint);
    const n2Summary = summarize(n2, centrePoint);
    const probeSummary = {
      count: probes.length,
      feasibleShare: probes.filter((probe) => probe.feasibleDev).length / Math.max(1, probes.length),
      devMedian: median(probes.map((probe) => probe.dev)),
      valMedian: median(probes.map((probe) => probe.val)),
      worstDev: Math.min(...probes.map((probe) => probe.dev)),
      ddMax: Math.max(...probes.map((probe) => probe.dd)),
      positiveDev: probes.filter((probe) => probe.dev > 0).length
    };
    const yearly = Object.entries(base.periods)
      .filter(([key]) => /^\d{4}$/.test(key))
      .map(([, value]) => value);
    const runNet = base.net;
    const { gates: g } = studyA;
    const gates = {
      G1: base.minuteDrawdown < execution.drawdownCeiling,
      G2: n1Summary.ddP90 < g.neighbourP90Ceiling && n1Summary.share35 >= g.neighbourFeasibleShare,
      G3: n1Summary.devMedian > 0 && n1Summary.valMedian > 0 && centrePoint.val > 0,
      G4:
        n1Summary.devMedian >= g.plateauMedianShare * centrePoint.dev &&
        probeSummary.feasibleShare >= g.probeFeasibleShare &&
        probeSummary.devMedian >= g.probeMedianShare * centrePoint.dev,
      G5: Object.values(stress).every((value) => value.net > 0),
      G6: runNet - Math.max(0, base.bestLot) > 0 && runNet - Math.max(0, ...yearly) > 0,
      G7: base.closed >= spec.minTrades && base.closedYears >= spec.minYears
    };
    const passes = Object.values(gates).every(Boolean);
    const score = 0.5 * (n1Summary.devMedian / yDev) + 0.5 * (n1Summary.valMedian / yVal);

    const item = {
      id: centre.id,
      grid: centre.grid,
      short: describe(centre.grid),
      origin: centre.origin,
      list: centre.list,
      control: centre.control,
      centre: { dev: centrePoint.dev, val: centrePoint.val, metrics: metricsDigest(base) },
      costs,
      stress,
      isolatedVal: {
        net: isolated.net,
        dd: isolated.minuteDrawdown,
        ddDaily: isolated.dailyDrawdown,
        lots: isolated.lots,
        wins: isolated.wins
      },
      probes,
      n1Summary,
      n2Summary,
      probeSummary,
      n1Points: n1,
      gates,
      passes,
      score,
      scorePerDd: score / n1Summary.ddP90
    };

    log(
      `A ${fold} ${centre.id} ${centre.list}: dev ${round(centrePoint.dev, 0)} val ${round(centrePoint.val, 0)} dd ${round(base.minuteDrawdown, 0)} | N1 med ${round(n1Summary.devMedian, 0)}/${round(n1Summary.valMedian, 0)} p90dd ${round(n1Summary.ddP90, 0)} share ${n1Summary.share35.toFixed(2)} | ${
        Object.entries(gates)
          .filter(([, ok]) => !ok)
          .map(([k]) => k)
          .join(',') || 'PASS'
      }`
    );

    return item;
  });

  // §5.7 roles among gate-passing non-controls
  const eligible = evidence.filter((item) => item.passes && !item.control);
  const ordered = (key: (item: (typeof evidence)[number]) => number, descending = true) =>
    [...eligible].sort((a, b) => (descending ? key(b) - key(a) : key(a) - key(b)) || byId(a, b));
  const robust = ordered((item) => item.score)[0];
  const picks: { role: string; id: string }[] = [];

  if (robust) {
    picks.push({ role: 'A-ROBUST', id: robust.id });

    const far = (item: (typeof evidence)[number]) =>
      picks.every(
        (pick) => distance(evidence.find((other) => other.id === pick.id)!.grid, item.grid) >= studyA.roles.distance
      );
    const balanced = ordered((item) => item.scorePerDd).find(far);

    if (balanced) {
      picks.push({ role: 'A-BALANCED', id: balanced.id });
    }

    const defensive = ordered((item) => item.n1Summary.ddP90, false).find(
      (item) => item.score >= studyA.roles.defensiveScoreShare * robust.score && far(item)
    );

    if (defensive) {
      picks.push({ role: 'A-DEFENSIVE', id: defensive.id });
    }
  }

  // §8 multiple testing: DEV → VAL decay and CSCV PBO over half-year attributions of the shortlist
  const shortlisted = evidence.filter((item) => !item.control);
  const halves = halfYears()
    .map((half) => half.key)
    .filter((key) => shortlisted.every((item) => Number.isFinite(item.centre.metrics.periods[key] ?? NaN)));
  const matrix = shortlisted.map((item) => halves.map((key) => item.centre.metrics.periods[key]!));
  const pbo =
    matrix.length >= 2 && halves.length >= 4
      ? pboOf(matrix, Math.min(8, halves.length - (halves.length % 2)))
      : undefined;
  const decay = {
    devMedianOfShortlist: median(shortlisted.map((item) => item.centre.dev / yDev)),
    valMedianOfShortlist: median(shortlisted.map((item) => item.centre.val / yVal)),
    bestDevItemValPerYear: (() => {
      const best = [...shortlisted].sort((a, b) => b.centre.dev - a.centre.dev)[0];

      return best ? { id: best.id, devPerYear: best.centre.dev / yDev, valPerYear: best.centre.val / yVal } : undefined;
    })()
  };
  const record = await writeSealed(dir(fold, 'validation.json'), {
    stage: `studyA-${fold}-validation`,
    at: nowIso(),
    doors: [searchDoor.key, door.key],
    window: { first: door.dates[0], last: door.dates[door.lastIndex] },
    devKey: spec.devKey,
    valKey: spec.valKey,
    years: { dev: yDev, val: yVal },
    rules: { gates: studyA.gates, roles: studyA.roles, neighbourhood, stresses, baseSettings },
    evidence,
    picks,
    multipleTesting: { runs, halves, pbo, decay, shortlistSize: shortlisted.length },
    traces: ev.traces + searchEv.traces,
    seconds: (Date.now() - started) / 1000
  });

  log(`A ${fold}: picks ${JSON.stringify(picks)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);

  return record;
};
