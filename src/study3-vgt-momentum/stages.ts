// The study's write-once stages (PROTOCOL.md §6). Each verifies its predecessors and both freezes, loads data only
// through data.ts's door, and writes one record with hashed payloads (records.ts).
import fs from 'fs-extra';
import { gunzipSync } from 'node:zlib';
import type { Dataset } from '../four-family/data.ts';
import { vgtPrimaryGrid } from '../d1-signal-capital-complementarity/context.ts';
import { loadUniverse } from '../d1-signal-capital-complementarity/doors.ts';
import { standaloneRun } from '../d1-signal-capital-complementarity/runs.ts';
import { bookOf } from '../d1-signal-capital-complementarity/sources.ts';
import {
  type FoldKey,
  type HistoryKey,
  files,
  folds,
  histories,
  log,
  robustness as stress,
  search as budget,
  seedOf,
  study,
  testRoot
} from './context.ts';
import { assertEndAllowed, indexOfDate, loadVgt } from './data.ts';
import { Engine, type RunOptions, type StrategySpec } from './engine.ts';
import { chainWindows, d1Overlap, episodeStats, legStats, upLegs, yearly } from './ledgers.ts';
import { type Summary, summarise, tradeRow } from './metrics.ts';
import { compareWithReference } from './parity.ts';
import {
  assertFreezes,
  assertPredecessors,
  assertScope,
  codeManifest,
  manifestHash,
  protocolHashes,
  readJsonFile,
  readPayload,
  readRecord,
  recordExists,
  sha256,
  sha256File,
  toJson,
  verifyRecord,
  writeStage
} from './records.ts';
import { type CandidateRobustness, type FoldFigures, evaluateRubric, familyLabel } from './rubric.ts';
import {
  type FamilySearch,
  type GateRecord,
  Evaluator,
  candidateOf,
  dimsOf,
  fromUnit,
  gateOf,
  noSearchPick,
  panelExits,
  plannedPerFamily,
  procedurePick,
  searchFamily,
  valuesOf
} from './search.ts';
import { sobolPoints } from './sobol.ts';
import { type FamilyId, familyIds } from './signals.ts';
import {
  type Candidate,
  type ExitKey,
  candidateId,
  controlSpec,
  defaultCandidate,
  exitOf,
  panelSpec,
  templateSpec
} from './specs.ts';
import { datasetOf, options as fixtureOptions, path, randomWalk } from './tests/fixtures.ts';

const sealedD1 = 'research/d1-all61-signal-capital-complementarity/results/signals/signals-2023-12-29.json.gz';

const baseline = (e: number, endIndex: number, extra: Partial<RunOptions> = {}): RunOptions => ({
  costBps: study.costBps,
  rate: study.rate,
  principal: study.principal,
  stopSlippageBps: 0,
  entrySlippageBps: 0,
  delayMinutes: 0,
  firstDecisionIndex: e,
  endIndex,
  ...extra
});

const compact = (s: Summary) => ({
  net: s.net,
  priceGain: s.priceGain,
  interest: s.interest,
  friction: s.friction,
  closed: s.closed,
  open: s.open,
  campaigns: s.campaigns,
  reentries: s.reentries,
  yearsHeld: s.yearsHeld,
  minuteDD: s.minuteDrawdown,
  dailyDD: s.dailyDrawdown,
  exposure: s.exposureSessions,
  dollarDays: s.borrowedDollarDays,
  worstLot: s.worstLot,
  bestLot: s.bestLot,
  worstMae: s.worstMaePct,
  bestMfe: s.bestMfePct,
  holdMedian: s.holdMedian,
  holdMax: s.holdMax,
  profitFactor: s.profitFactor,
  topLotShare: s.topLotShare,
  exits: Object.entries(s.exitMix)
    .map(([k, v]) => `${k}:${v}`)
    .join(' '),
  entries: Object.entries(s.entryMix)
    .map(([k, v]) => `${k}:${v}`)
    .join(' '),
  path: s.pathHash
});

export const controlSpecs = (): StrategySpec[] => [
  ...(['C-SMA', 'C-DON', 'C-TSM', 'C-AL', 'C-ALR', 'C-IDLE'] as const).map((id) => controlSpec(id)),
  ...(['C-SMA', 'C-DON', 'C-TSM'] as const).map((id) => ({
    ...controlSpec(id),
    id: `${id}/TPL`,
    exit: exitOf('TPL'),
    reentry: 'R3F' as const
  }))
];

const panelSpecs = (): StrategySpec[] => [
  ...familyIds.flatMap((family) => panelExits.map((exit) => panelSpec(family, exit))),
  ...panelExits.map((exit) => panelSpec('X-CS', exit))
];

// ----- S0 audit -----

export const stageAudit = async () => {
  const state = assertScope();
  const { ds, door } = await loadVgt(study.researchCap);
  const counts: number[] = [];
  const short: { date: string; bars: number }[] = [];
  let noPrint = 0;
  let earlyCloses = 0;
  const gaps: { date: string; gap: number }[] = [];
  const moves: { date: string; move: number }[] = [];
  const perYear: Record<string, number> = {};

  for (let s = 0; s < ds.sessionCount; s++) {
    const count = ds.sBarCount[s]!;
    const early = ds.sCloseTime[s]! - ds.bTime[ds.sBarStart[s]!]! < 6 * 3600;

    counts.push(count);
    earlyCloses += early ? 1 : 0;

    if (!early && count < 390) {
      short.push({ date: ds.dates[s]!, bars: count });
    }

    if (Number.isNaN(ds.sClosingPrint[s]!)) {
      noPrint++;
    }

    perYear[ds.dates[s]!.slice(0, 4)] = (perYear[ds.dates[s]!.slice(0, 4)] ?? 0) + 1;

    if (s > 0) {
      gaps.push({ date: ds.dates[s]!, gap: ds.sOpen[s]! / ds.sClose[s - 1]! - 1 });
      moves.push({ date: ds.dates[s]!, move: ds.sClose[s]! / ds.sClose[s - 1]! - 1 });
    }
  }

  const sorted = [...counts].sort((a, b) => a - b);
  const largest = <T extends { gap?: number; move?: number }>(rows: T[], key: 'gap' | 'move') =>
    [...rows].sort((a, b) => Math.abs(b[key]!) - Math.abs(a[key]!)).slice(0, 10);
  const baselineTests = fs.readFileSync(
    'research/study3-vgt-momentum/audit/tests/baseline-full-suite-before.txt',
    'utf8'
  );
  const testCounts = Object.fromEntries(
    [...baselineTests.matchAll(/^ℹ (tests|pass|fail|cancelled|skipped) (\d+)/gm)].map((m) => [m[1]!, Number(m[2])])
  );
  const summary = {
    door,
    sessions: ds.sessionCount,
    bars: ds.barCount,
    perYear,
    barsPerSession: { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted.at(-1) },
    earlyCloses,
    shortSessions: short.length,
    shortSessionList: short.slice(0, 40),
    sessionsWithoutClosingPrint: noPrint,
    largestOvernightGaps: largest(gaps, 'gap'),
    largestDailyMoves: largest(moves, 'move'),
    splitSizedMoves: moves.filter((m) => Math.abs(m.move) > 0.4).length,
    firstDecisionClose: ds.dates[indexOfDate(ds, study.firstDecisionClose)],
    scope: state,
    baselineTests: testCounts,
    protectedInputs: {
      partitions: sha256File('data/partitions.json'),
      splits: sha256File('config/market-events/splits.json'),
      distributions: sha256File('config/market-events/distributions.csv'),
      vgtPhenotype: sha256File('config/phenotypes/D1/VGT.json'),
      prospectiveFreeze: sha256File('research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json')
    }
  };

  return writeStage('audit', { door, summary, payloads: { audit: summary } });
};

// ----- S1 protocol freeze -----

export const stageFreezeProtocol = () => {
  assertPredecessors('freeze-protocol');

  if (fs.existsSync(files.protocolFreeze)) {
    throw new Error('refused: the protocol is already frozen');
  }

  const hashes = protocolHashes();
  const body = { study: study.id, frozenAt: new Date().toISOString(), version: '1.1', hashes, git: assertScope() };
  const bodyHash = sha256(toJson(body));

  fs.outputFileSync(files.protocolFreeze, toJson({ ...body, bodyHash }));
  return { ...body, bodyHash };
};

// ----- S2 parity -----

const d1Comparison = async () => {
  const { loaded, door } = await loadUniverse(['VGT'], study.researchCap, ['U']);
  const run = standaloneRun(loaded.universe, bookOf('VGT', 'primary', { ...vgtPrimaryGrid }));
  const sealed = JSON.parse(gunzipSync(fs.readFileSync(sealedD1)).toString('utf8')) as {
    views: { U: { symbol: string; trades: Record<string, unknown>[]; summary: Record<string, number> }[] };
  };
  const reference = sealed.views.U.find((row) => row.symbol === 'VGT')!;
  const differences: string[] = [];
  const fields = [
    'entryIndex',
    'entryTime',
    'entryRawPrice',
    'exitTime',
    'exitRawPrice',
    'exitReason',
    'interest',
    'net'
  ];

  if (run.trades.length !== reference.trades.length) {
    differences.push(`trades ${run.trades.length} vs ${reference.trades.length}`);
  }

  run.trades.forEach((trade, i) => {
    for (const field of fields) {
      const a = (trade as unknown as Record<string, unknown>)[field];
      const b = reference.trades[i]?.[field];

      if (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) > 1e-6 : a !== b) {
        differences.push(`trade ${i + 1} ${field}: ${String(a)} vs ${String(b)}`);
      }
    }
  });

  for (const field of ['net', 'minuteDrawdown', 'dailyDrawdown'] as const) {
    if (Math.abs(run.summary[field] - reference.summary[field]!) > 1e-6) {
      differences.push(`summary ${field}: ${run.summary[field]} vs ${reference.summary[field]}`);
    }
  }

  return {
    door,
    sealedFile: sealedD1,
    sealedSha256: sha256File(sealedD1),
    trades: run.trades.length,
    net: run.summary.net,
    minuteDrawdown: run.summary.minuteDrawdown,
    dailyDrawdown: run.summary.dailyDrawdown,
    differences,
    pass: differences.length === 0
  };
};

const adversarialFixtures = () => ({
  spikeReversal: [
    ...randomWalk(1, 280, { vol: 0.01 }),
    path(110, 125),
    path(125, 126),
    path(118, 104),
    ...randomWalk(2, 40)
  ],
  gapBelowStop: [...randomWalk(3, 280), path(100, 101), { bars: path(85, 84).bars }, ...randomWalk(4, 40)],
  prolongedRange: [...randomWalk(5, 260, { drift: 0, vol: 0.004 }), ...randomWalk(6, 120, { drift: 0, vol: 0.004 })],
  bullAfterStop: [
    ...randomWalk(7, 270),
    path(100, 96),
    path(96, 90),
    ...Array.from({ length: 60 }, (_, i) => path(90 + i, 91 + i))
  ],
  fallingKnife: [
    ...randomWalk(8, 270),
    ...Array.from({ length: 30 }, (_, i) => path(100 - i * 1.5, 98.5 - i * 1.5)),
    path(55, 58),
    path(58, 60),
    ...Array.from({ length: 20 }, (_, i) => path(60 - i, 59 - i))
  ],
  earlyCloseAndMissing: [
    ...randomWalk(9, 270),
    { bars: path(100, 103, 4).bars, earlyClose: true },
    { bars: path(103, 101).bars, missing: [2, 3] },
    { bars: path(101, 104).bars, closingPrint: null },
    ...randomWalk(10, 60)
  ]
});

export const parityExits: ExitKey[] = [
  'OX',
  'CX1',
  'CX2',
  'TPL',
  'X2',
  'X3',
  'X4',
  'X5a',
  'X5b',
  'X6a',
  'X6b',
  'X8OR',
  'X8AND',
  'HS'
];

export const stageParity = async () => {
  assertPredecessors('parity');
  assertFreezes(false);
  assertScope();

  const d1 = await d1Comparison();
  // (b) fast = reference on fold A's development data only; difference counts, never P&L.
  const { ds, door } = await loadVgt(histories.A.developmentEnd);
  const engine = new Engine(ds);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const o = baseline(e, ds.sessionCount - 1);
  const specs: StrategySpec[] = [
    ...panelSpecs(),
    ...controlSpecs().filter((spec) => spec.signal !== 'C-IDLE'),
    ...familyIds.map((family) => panelSpec(family, 'CX1', 'R3F', 'Z1'))
  ];

  for (const family of familyIds) {
    const dims = dimsOf(family);

    sobolPoints(dims.length, 64, seedOf(`study3|${family}|parity`)).forEach((u) => {
      specs.push(
        templateSpec(
          candidateOf(
            family,
            dims.map((dim, i) => fromUnit(dim, u[i]!))
          )
        )
      );
    });
  }

  const realData = specs.map((spec) => {
    const outcome = compareWithReference(engine, ds, spec, o, 1e-9, true); // redacted: no level is recorded

    return {
      id: spec.id,
      lots: outcome.trades,
      differences: outcome.differences.length,
      largest: outcome.largestMoneyDifference,
      first: outcome.differences.slice(0, 3)
    };
  });
  // (c) synthetic adversarial paths × every panel entry, control and exit; default trigger rates on random walks.
  const synthetic: { fixture: string; id: string; differences: number; first: string[] }[] = [];

  for (const [name, fixture] of Object.entries(adversarialFixtures())) {
    const fds = datasetOf(fixture);
    const fengine = new Engine(fds);

    for (const id of [...familyIds, 'X-CS', 'C-SMA', 'C-DON', 'C-TSM', 'C-AL'] as const) {
      for (const exit of parityExits) {
        const spec = id.startsWith('C-')
          ? { ...controlSpec(id as 'C-AL'), exit: exitOf(exit), id: `${id}/${exit}` }
          : panelSpec(id as FamilyId, exit);
        const outcome = compareWithReference(fengine, fds, spec, fixtureOptions(fds, { firstDecisionIndex: 252 }));

        synthetic.push({
          fixture: name,
          id: spec.id,
          differences: outcome.differences.length,
          first: outcome.differences.slice(0, 3)
        });
      }
    }
  }

  const triggerRates = familyIds.map((family) => {
    let entries = 0;
    let years = 0;

    for (const seed of [21, 22, 23, 24]) {
      const fds = datasetOf(randomWalk(seed, 900, { vol: 0.015 }));
      const run = new Engine(fds).run(panelSpec(family, 'TPL'), fixtureOptions(fds, { firstDecisionIndex: 252 }));

      entries += run.trades.filter((t) => t.tranche === 0).length;
      years += (900 - 252) / 252;
    }

    return { family, entriesPerYear: entries / years };
  });
  // (d) doors.
  const doors: Record<string, string> = {};

  try {
    assertEndAllowed('2024-01-02');
    doors.postCap = 'NOT refused';
  } catch (error) {
    doors.postCap = `refused: ${(error as Error).message}`;
  }

  try {
    assertSealed('A');
    doors.evaluateBeforeSeal = 'NOT refused';
  } catch (error) {
    doors.evaluateBeforeSeal = `refused: ${(error as Error).message}`;
  }

  const pass =
    d1.pass &&
    realData.every((row) => row.differences === 0) &&
    synthetic.every((row) => row.differences === 0) &&
    doors.postCap.startsWith('refused') &&
    doors.evaluateBeforeSeal.startsWith('refused');
  const summary = {
    pass,
    d1: {
      pass: d1.pass,
      trades: d1.trades,
      net: d1.net,
      minuteDrawdown: d1.minuteDrawdown,
      dailyDrawdown: d1.dailyDrawdown,
      differences: d1.differences
    },
    realData: {
      runs: realData.length,
      failing: realData.filter((row) => row.differences > 0).length,
      largest: Math.max(...realData.map((r) => r.largest))
    },
    synthetic: { runs: synthetic.length, failing: synthetic.filter((row) => row.differences > 0).length },
    triggerRates,
    doors
  };

  if (!pass) {
    log(`parity FAILED: ${summary.realData.failing} real-data and ${summary.synthetic.failing} synthetic runs differ`);
  }

  // A failing attempt stays sealed; after a code fix the stage reruns as parity-rerun-<n> (PROTOCOL.md §6).
  let name = 'parity';

  for (let n = 1; recordExists(name); n++) {
    name = `parity-rerun-${n}`;
  }

  return writeStage(name, {
    door: { d1: d1.door, momentum: door },
    summary,
    payloads: { d1, realData, synthetic }
  });
};

// ----- S3 code freeze -----

export const stageFreezeCode = () => {
  assertPredecessors('freeze-code');
  assertFreezes(false);

  if (fs.existsSync(files.codeFreeze)) {
    throw new Error('refused: the code is already frozen');
  }

  // The latest parity attempt must pass.
  let latest = 'parity';

  for (let n = 1; recordExists(`parity-rerun-${n}`); n++) {
    latest = `parity-rerun-${n}`;
  }

  const parity = readRecord(latest).summary as { pass: boolean };

  if (!parity.pass) {
    throw new Error('refused: parity did not pass');
  }

  const manifest = codeManifest();
  const body = {
    study: study.id,
    frozenAt: new Date().toISOString(),
    git: assertScope(),
    files: Object.keys(manifest).length,
    manifest,
    manifestHash: manifestHash(manifest)
  };

  fs.outputFileSync(files.codeFreeze, toJson(body));
  return body;
};

// ----- S4 develop -----

const priorPlanned = (history: HistoryKey) =>
  (['A', 'B', 'C', 'D', 'H'] as HistoryKey[])
    .filter((key) => key !== history && recordExists(`develop-${key}`))
    .reduce((sum, key) => sum + (readRecord(`develop-${key}`).summary as { planned: number }).planned, 0);

export const stageDevelop = async (history: HistoryKey) => {
  const stage = `develop-${history}`;

  assertPredecessors(stage);
  assertFreezes(true);
  assertScope();

  const { ds, door } = await loadVgt(histories[history].developmentEnd);

  return writeStage(stage, { door, ...developCore(ds, history, priorPlanned(history)) });
};

// The development stage's computation on any dataset (the stage itself, or the synthetic dry run in the tests).
export const developCore = (ds: Dataset, history: HistoryKey, prior = 0) => {
  const stage = `develop-${history}`;
  const spec = histories[history];
  const engine = new Engine(ds);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const o = baseline(e, end);
  const panel: Record<string, Summary> = {};
  const started = Date.now();

  for (const panelRun of [...panelSpecs(), ...controlSpecs()]) {
    panel[panelRun.id] = summarise(ds, engine.run(panelRun, o), e, end);
  }

  const gates: GateRecord[] = familyIds.map((family) => gateOf(family, panel));
  const passing = gates.filter((g) => g.pass).map((g) => g.family);
  const planned = passing.reduce((sum, family) => sum + plannedPerFamily(family), 0);

  if (planned > budget.capPerHistory || prior + planned > budget.capTotal) {
    throw new Error(`refused: planned ${planned} evaluations exceed the caps`);
  }

  const searches: FamilySearch[] = [];

  for (const family of passing) {
    const evaluator = new Evaluator(engine, ds, o, plannedPerFamily(family));

    searches.push(searchFamily(evaluator, family, history));
    log(`${stage} ${family}: ${searches.at(-1)!.evaluations} evaluations`);
  }

  const pick = procedurePick(searches);
  const p0 = noSearchPick(gates);
  const champions = searches
    .filter((s) => s.champion)
    .map((s) => {
      const c = candidateOf(s.family, s.champion!.values);
      const run = engine.run(templateSpec(c), o);

      return {
        family: s.family,
        id: candidateId(c),
        candidate: c,
        index: s.champion!.index,
        neighbourhoodMedian: s.champion!.neighbourhoodMedian,
        neighbourhoodFeasibility: s.champion!.neighbourhoodFeasibility,
        tenBpsNet: s.champion!.tenBpsNet,
        onBoundary: s.champion!.onBoundary,
        development: run.endLiquidation,
        summary: compact(summarise(ds, run, e, end)),
        trades: run.trades.map((t) => tradeRow(ds, t))
      };
    });
  const selection = {
    history,
    developmentEnd: spec.developmentEnd,
    passing,
    planned,
    used: searches.reduce((sum, s) => sum + s.evaluations, 0),
    pStar: pick ? champions.find((c) => c.family === pick.family)!.id : null,
    pStarFamily: pick?.family ?? null,
    p0: p0
      ? {
          family: p0.family,
          candidate: defaultCandidate(p0.family),
          id: candidateId(defaultCandidate(p0.family)),
          development: p0.tpl.net
        }
      : null,
    champions: champions.map(({ trades: _t, ...rest }) => rest)
  };
  const archive = searches.flatMap((s) => s.archive.map((row) => ({ ...row, summary: compact(row.summary) })));
  const summary = {
    ...selection,
    gates: gates.map((g) => ({ family: g.family, pass: g.pass, g1: g.g1, g2: g.g2, g3: g.g3, g4: g.g4, nets: g.nets })),
    families: searches.map((s) => ({
      family: s.family,
      seed: s.seed,
      planned: s.planned,
      evaluations: s.evaluations,
      feasible: s.feasibleCount,
      champion: s.champion?.id ?? null
    })),
    seconds: (Date.now() - started) / 1000
  };

  return {
    summary,
    payloads: {
      selection,
      panel: Object.fromEntries(Object.entries(panel).map(([id, s]) => [id, compact(s)])),
      gates,
      shortlists: searches.map((s) => ({ family: s.family, dims: s.dims, shortlist: s.shortlist })),
      championTrades: champions.map((c) => ({ family: c.family, id: c.id, trades: c.trades }))
    },
    jsonl: { archive }
  };
};

// ----- S5 evaluate -----

export const assertSealed = (fold: HistoryKey) => {
  if (!recordExists(`develop-${fold}`)) {
    throw new Error(`refused: develop-${fold} is not sealed`);
  }

  const { problems } = verifyRecord(`develop-${fold}`);

  if (problems.length > 0) {
    throw new Error(`refused: develop-${fold} does not verify`);
  }
};

export interface Selection {
  pStar: string | null;
  pStarFamily: FamilyId | null;
  p0: { family: FamilyId; candidate: Candidate; id: string; development: number } | null;
  champions: { family: FamilyId; id: string; candidate: Candidate; development: number; neighbourhoodMedian: number }[];
  passing: FamilyId[];
}

const windowFigures = (ds: Dataset, engine: Engine, spec: StrategySpec, o: RunOptions, b: number) => {
  const run = engine.run(spec, { ...o, boundaryIndex: b, recordDaily: true });
  const daily = run.daily!;
  const e = o.firstDecisionIndex;
  let dollarDays = 0;

  for (let s = b; s < o.endIndex; s++) {
    dollarDays += daily[s - e]!.invested * ((ds.sTime[s + 1]! - ds.sTime[s]!) / 86400);
  }

  const inWindow = run.trades.filter((t) => t.entryIndex > b || t.exitIndex < 0 || t.exitIndex > b);
  const w = run.window!;

  return {
    id: spec.id,
    V: w.increment,
    boundaryLiquidation: w.boundaryLiquidation,
    windowMinuteDD: w.minuteDrawdown.maximum,
    windowDailyDD: w.dailyDrawdown,
    path: {
      boundaryMark: w.boundaryMark,
      endMark: w.endMark,
      minuteMin: w.minuteMin,
      minuteMax: w.minuteMax,
      internalDrawdown: w.minuteDrawdown.maximum
    },
    lotsEntered: run.trades.filter((t) => t.entryIndex > b).length,
    lotsCarried: run.trades.filter((t) => t.entryIndex <= b && (t.exitIndex < 0 || t.exitIndex > b)).length,
    dollarDays,
    calendarDays: (ds.sTime[o.endIndex]! - ds.sTime[b]!) / 86400,
    firstEntries: inWindow.filter((t) => t.kind === 'first' && t.entryIndex > b && t.tranche === 0).length,
    reentries: inWindow.filter((t) => t.kind === 'reentry' && t.entryIndex > b && t.tranche === 0).length,
    whole: compact(summarise(ds, run, e, o.endIndex)),
    trades: inWindow.map((t) => tradeRow(ds, t))
  };
};

export const stageEvaluate = async (fold: FoldKey) => {
  const stage = `evaluate-${fold}`;

  assertPredecessors(stage);
  assertFreezes(true);
  assertScope();
  assertSealed(fold);

  const selection = readPayload<Selection>(`develop-${fold}`, 'selection');
  const spec = histories[fold];
  const { ds, door } = await loadVgt(spec.window!.end);
  // D1 primary over the same window from the frozen engine (context only).
  const { loaded } = await loadUniverse(['VGT'], spec.window!.end, ['U']);
  const d1Run = standaloneRun(loaded.universe, bookOf('VGT', 'primary', { ...vgtPrimaryGrid }), spec.window!.boundary);
  const d1 = {
    V: d1Run.summary.window!.increment,
    windowMinuteDD: d1Run.summary.window!.minuteDrawdown,
    trades: d1Run.trades.length
  };

  return writeStage(stage, { door, ...evaluateCore(ds, fold, selection, d1) });
};

export const evaluateCore = (
  ds: Dataset,
  fold: FoldKey,
  selection: Selection,
  d1: { V: number; windowMinuteDD: number; trades: number } | null
) => {
  const spec = histories[fold];
  const engine = new Engine(ds);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const b = indexOfDate(ds, spec.window!.boundary);
  const o = baseline(e, ds.sessionCount - 1);
  const runs: Record<string, ReturnType<typeof windowFigures>> = {};
  const checks: { id: string; sealed: number; replay: number; equal: boolean }[] = [];

  for (const champion of selection.champions) {
    const figures = windowFigures(ds, engine, templateSpec(champion.candidate), o, b);

    runs[`champion:${champion.family}`] = figures;
    checks.push({
      id: champion.id,
      sealed: champion.development,
      replay: figures.boundaryLiquidation,
      equal: Math.abs(champion.development - figures.boundaryLiquidation) < 1e-6
    });
  }

  for (const family of familyIds) {
    runs[`default:${family}`] = windowFigures(ds, engine, templateSpec(defaultCandidate(family)), o, b);
  }

  if (selection.p0) {
    const p0 = runs[`default:${selection.p0.family}`]!;

    checks.push({
      id: `P0 ${selection.p0.id}`,
      sealed: selection.p0.development,
      replay: p0.boundaryLiquidation,
      equal: Math.abs(selection.p0.development - p0.boundaryLiquidation) < 1e-6
    });
  }

  for (const control of controlSpecs()) {
    runs[`control:${control.id}`] = windowFigures(ds, engine, control, o, b);
  }

  const pStar = selection.champions.find((c) => c.id === selection.pStar);
  const variants: Record<string, ReturnType<typeof windowFigures>> = {};

  if (pStar) {
    const base = templateSpec(pStar.candidate);

    for (const reentry of ['R1', 'R2', 'R0'] as const) {
      variants[`reentry:${reentry}`] = windowFigures(ds, engine, { ...base, reentry }, o, b);
    }

    variants['stress:tenBps'] = windowFigures(ds, engine, base, { ...o, costBps: 10 }, b);
    variants['stress:rate14'] = windowFigures(ds, engine, base, { ...o, rate: 0.14 }, b);
    variants['stress:slip25'] = windowFigures(ds, engine, base, { ...o, stopSlippageBps: 25 }, b);
    variants['stress:delay1'] = windowFigures(ds, engine, base, { ...o, delayMinutes: 1 }, b);
  }

  if (!checks.every((c) => c.equal)) {
    throw new Error(`b-mark check failed: ${JSON.stringify(checks.filter((c) => !c.equal))}`);
  }

  const strip = (figures: ReturnType<typeof windowFigures>) => {
    const { trades: _trades, ...rest } = figures;

    return rest;
  };
  const summary = {
    fold,
    window: spec.window,
    pStar: selection.pStar,
    pStarFamily: selection.pStarFamily,
    p0: selection.p0?.family ?? null,
    checks,
    runs: Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, strip(v)])),
    variants: Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, strip(v)])),
    d1
  };

  return { summary, payloads: { runs, variants } };
};

// ----- S6 diagnostics (M2 on H) -----

export const stageDiagnostics = async () => {
  assertPredecessors('diagnostics');
  assertFreezes(true);
  assertScope();

  const { ds, door } = await loadVgt(histories.H.developmentEnd);

  return writeStage('diagnostics', { door, ...diagnosticsCore(ds) });
};

export const diagnosticsCore = (ds: Dataset) => {
  const engine = new Engine(ds);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const o = baseline(e, end, { recordDaily: true });
  const configs: { group: string; spec: StrategySpec }[] = [];

  for (const family of [...familyIds, 'X-CS'] as const) {
    for (const exit of ['CX1', 'CX2'] as const) {
      configs.push({ group: 'M2E', spec: panelSpec(family, exit) });
    }
  }

  const m2x: ExitKey[] = ['CX1', 'X2', 'X3', 'X4', 'X5a', 'X5b', 'X6a', 'X6b', 'CX2', 'X8OR', 'X8AND', 'OX', 'HS'];

  for (const family of ['E02', 'E07'] as const) {
    for (const exit of m2x) {
      configs.push({ group: 'M2X', spec: panelSpec(family, exit) });
    }
  }

  for (const family of ['E01', 'E02', 'E07', 'E11'] as const) {
    for (const reentry of ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'] as const) {
      configs.push({ group: 'M2R', spec: panelSpec(family, 'CX1', reentry) });
    }
  }

  for (const sizing of ['Z0', 'Z1', 'Z2'] as const) {
    configs.push({ group: 'M2Z', spec: panelSpec('E02', 'CX1', 'R3F', sizing) });
  }

  configs.push({ group: 'M2A', spec: panelSpec('E02', 'TPL') });
  configs.push({ group: 'M2A', spec: { ...panelSpec('E02', 'TPL'), id: 'E02/TPL/A1', exhaustion: 0.1 } });
  configs.push({ group: 'M2A', spec: { ...panelSpec('E02', 'TPL'), id: 'E02/TPL/A2', weekly: true } });
  configs.push({
    group: 'M2A',
    spec: { ...panelSpec('E02', 'TPL'), id: 'E02/TPL/A3', params: { N: 126, a_in: 0.2, a_gap: 0 } }
  });
  configs.push({ group: 'M2A', spec: panelSpec('E01', 'TPL') });
  configs.push({
    group: 'M2A',
    spec: { ...panelSpec('E01', 'TPL'), id: 'E01/TPL/A3', params: { d_in: 0.02, d_gap: 0.001 } }
  });

  const rows = configs.map(({ group, spec }) => {
    const run = engine.run(spec, o);

    return {
      group,
      id: spec.id,
      summary: compact(summarise(ds, run, e, end)),
      yearly: yearly(ds, run.daily!, e),
      trades: run.trades.map((t) => tradeRow(ds, t))
    };
  });
  // Brief §6.2: the volatility-scaled stop (X2) through crisis volatility — per held session of each X2 lot that
  // overlaps late 2018 or early 2020: Hc, ATR, the clamped distance, the level before and after the ratchet.
  const atr = engine.F.atr(20);
  const crisis = [
    { from: '2018-10-01', to: '2018-12-31' },
    { from: '2020-02-19', to: '2020-04-30' }
  ];
  const x2Traces = rows
    .filter((row) => row.id.includes('/X2/'))
    .flatMap((row) =>
      row.trades
        .filter((t) => crisis.some((c) => t.entryDate <= c.to && (t.exitDate ?? '9999') >= c.from))
        .map((t) => {
          const last = t.exitIndex < 0 ? end : t.exitIndex;
          let hc = t.entryRaw;
          let ratchet = -Infinity;
          const sessions: {
            date: string;
            close: number;
            hc: number;
            atr: number;
            distance: number;
            raw: number;
            level: number;
          }[] = [];

          for (let s = t.entryIndex; s <= last; s++) {
            const ref = s === t.entryIndex ? s - 1 : s; // the entry session's level uses the previous close's ATR
            const at = s === t.entryIndex ? hc : (hc = Math.max(hc, engine.F.C[s]!));
            const distance = Math.min(0.15, Math.max(0.04, (3 * atr[ref]!) / at));
            const raw = at * (1 - distance);

            ratchet = Math.max(ratchet, raw);
            sessions.push({
              date: ds.dates[s]!,
              close: engine.F.C[s]!,
              hc: at,
              atr: atr[ref]!,
              distance,
              raw,
              level: Math.max(ratchet, t.entryRaw * (1 - 0.08))
            });
          }

          return {
            config: row.id,
            entryDate: t.entryDate,
            exitDate: t.exitDate,
            exitReason: t.exitReason,
            net: t.net,
            sessions
          };
        })
    );
  const summary = {
    configs: rows.length,
    rows: rows.map(({ trades: _t, ...rest }) => rest),
    x2Traces: x2Traces.map(({ sessions: _s, ...rest }) => rest)
  };

  return { summary, payloads: { rows, x2Traces } };
};

// ----- S7 robustness (finalists on H) -----

// The dataset with a seeded share of non-first minutes removed (session OHLC rebuilt from what remains).
export const withoutBars = (ds: Dataset, fraction: number, seed: number): Dataset => {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const keep: number[] = [];
  const sBarStart = new Int32Array(ds.sessionCount);
  const sBarCount = new Int32Array(ds.sessionCount);
  const sHigh = new Float64Array(ds.sessionCount);
  const sLow = new Float64Array(ds.sessionCount);
  const sClose = new Float64Array(ds.sessionCount);

  for (let s = 0; s < ds.sessionCount; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    sBarStart[s] = keep.length;

    for (let k = 0; k < count; k++) {
      if (k === 0 || random() >= fraction) {
        keep.push(start + k);
      }
    }

    sBarCount[s] = keep.length - sBarStart[s]!;

    let high = -Infinity;
    let low = Infinity;

    for (let i = sBarStart[s]!; i < keep.length; i++) {
      high = Math.max(high, ds.bHigh[keep[i]!]!);
      low = Math.min(low, ds.bLow[keep[i]!]!);
    }

    const close = Number.isNaN(ds.sClosingPrint[s]!) ? ds.bClose[keep.at(-1)!]! : ds.sClosingPrint[s]!;

    sClose[s] = close;
    sHigh[s] = Math.max(high, close);
    sLow[s] = Math.min(low, close);
  }

  const pick = (array: Float64Array) => Float64Array.from(keep, (i) => array[i]!);

  return {
    ...ds,
    id: `${ds.id}:without-${fraction}`,
    barCount: keep.length,
    sBarStart,
    sBarCount,
    sHigh,
    sLow,
    sClose,
    sMinClose: ds.sMinClose,
    bTime: pick(ds.bTime),
    bOpen: pick(ds.bOpen),
    bHigh: pick(ds.bHigh),
    bLow: pick(ds.bLow),
    bClose: pick(ds.bClose)
  };
};

export const stageRobustness = async () => {
  assertPredecessors('robustness');
  assertFreezes(true);
  assertScope();

  const { ds, door } = await loadVgt(histories.H.developmentEnd);
  const h = readPayload<Selection>('develop-H', 'selection');
  const d = readPayload<Selection>('develop-D', 'selection');

  return writeStage('robustness', { door, ...robustnessCore(ds, h, d) });
};

// Draw counts of M5 (the frozen values; only the synthetic dry run in the tests lowers them).
export const draws = { joint: stress.jointDraws as number, placebo: stress.placeboDraws as number };

export const setTestDraws = (value: Partial<typeof draws>) => {
  if (!testRoot) {
    throw new Error('draw counts can only be lowered under the test root');
  }

  Object.assign(draws, value);
};

export const robustnessCore = (ds: Dataset, h: Selection, d: Selection) => {
  const engine = new Engine(ds);
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const o = baseline(e, end);
  const finalists: { role: string; id: string; candidate: Candidate }[] = [];
  const add = (role: string, c?: { id: string; candidate: Candidate }) => {
    if (c && !finalists.some((f) => f.id === c.id) && finalists.length < stress.maxFinalists) {
      finalists.push({ role, id: c.id, candidate: c.candidate });
    }
  };

  add(
    'H P*',
    h.champions.find((c) => c.id === h.pStar)
  );
  add(
    'D P*',
    d.champions.find((c) => c.id === d.pStar)
  );

  for (const c of [...h.champions].sort(
    (a, b) => b.neighbourhoodMedian - a.neighbourhoodMedian || (a.family < b.family ? -1 : 1)
  )) {
    add(`H champion ${c.family}`, c);
  }

  const run = (spec: StrategySpec, options: RunOptions = o, dataset: Dataset = ds, eng: Engine = engine) =>
    summarise(dataset, eng.run(spec, options), options.firstDecisionIndex, options.endIndex);
  const results = finalists.map((finalist) => {
    const c = finalist.candidate;
    const base = templateSpec(c);
    const baseRun = engine.run(base, { ...o, recordDaily: true });
    const baseSummary = summarise(ds, baseRun, e, end);
    const dims = dimsOf(c.family);
    const values = valuesOf(c);
    const settings: Record<string, ReturnType<typeof compact>> = {};

    for (const cost of stress.costs) {
      settings[`cost:${cost}`] = compact(run(base, { ...o, costBps: cost }));
    }

    for (const rate of stress.rates) {
      settings[`rate:${rate}`] = compact(run(base, { ...o, rate }));
    }

    for (const slip of stress.stopSlippageBps) {
      settings[`stopSlip:${slip}`] = compact(run(base, { ...o, stopSlippageBps: slip }));
    }

    for (const slip of stress.entrySlippageBps) {
      settings[`entrySlip:${slip}`] = compact(run(base, { ...o, entrySlippageBps: slip }));
    }

    for (const delay of stress.delayMinutes) {
      settings[`delay:${delay}`] = compact(run(base, { ...o, delayMinutes: delay }));
    }

    for (const fraction of stress.missingBars) {
      const thinned = withoutBars(ds, fraction, seedOf(`study3|${finalist.id}|missing|${fraction}`));

      settings[`missing:${fraction}`] = compact(run(base, o, thinned, new Engine(thinned)));
    }

    for (const reentry of ['R1', 'R2', 'R0'] as const) {
      settings[`reentry:${reentry}`] = compact(run({ ...base, reentry }));
    }

    // One-at-a-time ±1 and ±2 steps of 5% of each range; 64 joint draws within ±10%.
    const oat: { dim: string; steps: number; values: number[]; summary: ReturnType<typeof compact> }[] = [];

    dims.forEach((dim, i) => {
      for (const steps of [-2, -1, 1, 2]) {
        const step =
          dim.q === 1
            ? Math.max(1, Math.round(stress.oatStep * (dim.hi - dim.lo)))
            : stress.oatStep * (dim.hi - dim.lo);
        const moved = [...values];
        const raw = values[i]! + steps * step;

        moved[i] =
          dim.q === 1
            ? Math.min(dim.hi, Math.max(dim.lo, Math.round(raw)))
            : Math.min(dim.hi, Math.max(dim.lo, Number((Math.round(raw / dim.q) * dim.q).toFixed(6))));
        oat.push({
          dim: dim.name,
          steps,
          values: moved,
          summary: compact(run(templateSpec(candidateOf(c.family, moved))))
        });
      }
    });

    const joint = sobolPoints(dims.length, draws.joint, seedOf(`study3|${finalist.id}|joint`)).map((u) => {
      const moved = dims.map((dim, i) => {
        const raw = values[i]! + (2 * u[i]! - 1) * stress.jointRadius * (dim.hi - dim.lo);

        return dim.q === 1
          ? Math.min(dim.hi, Math.max(dim.lo, Math.round(raw)))
          : Math.min(dim.hi, Math.max(dim.lo, Number((Math.round(raw / dim.q) * dim.q).toFixed(6))));
      });

      return { values: moved, summary: compact(run(templateSpec(candidateOf(c.family, moved)))) };
    });
    // Placebos.
    const flatCloses = (() => {
      let flat = 0;

      for (let s = e; s < end; s++) {
        flat += (baseRun.daily![s - e]!.invested ?? 0) === 0 ? 1 : 0;
      }

      return flat;
    })();
    const entries = baseRun.trades.filter((t) => t.tranche === 0).length;
    // sessions to the exit decision (the exit fills at the next open): sessions held − 1, at least 1
    const holds = baseRun.trades
      .filter((t) => t.tranche === 0 && t.exitIndex >= 0)
      .map((t) => Math.max(1, t.sessionsHeld - 1));
    const placebo = Array.from(
      { length: draws.placebo },
      (_, k) =>
        run({
          ...base,
          id: `${base.id}/placebo/${k}`,
          exit: { ...base.exit, ownOut: false },
          randomEntry: {
            probability: flatCloses > 0 ? entries / flatCloses : 0,
            seed: seedOf(`study3|${finalist.id}|placebo|${k}`),
            holds: holds.length ? holds : [1]
          }
        }).net
    );
    const inverted = ['E01', 'E02', 'E03', 'E04', 'E06'].includes(c.family)
      ? compact(run({ ...base, id: `${base.id}/inverted`, invertState: true }))
      : null;
    const parity = compareWithReference(engine, ds, base, o);
    // Closing prints at or below the untriggered stop, and what the next opening trade did (review 2 #19).
    const printBelowStop = (baseRun.printBelowStop ?? []).map((row) => ({
      date: ds.dates[row.index]!,
      stop: row.stop,
      close: row.close,
      nextOpen: row.index < end ? ds.sOpen[row.index + 1]! : null,
      nextOpenBelowStop: row.index < end ? ds.sOpen[row.index + 1]! <= row.stop : null
    }));

    return {
      ...finalist,
      baseline: compact(baseSummary),
      yearly: yearly(ds, baseRun.daily!, e),
      daily: baseRun.daily!.map((row) => [
        Number(row.mark.toFixed(2)),
        Number(row.liquidation.toFixed(2)),
        row.invested
      ]),
      trades: baseRun.trades.map((t) => tradeRow(ds, t)),
      settings,
      oat,
      joint,
      jointShare:
        joint.filter((j) => j.summary.net > 0 && j.summary.minuteDD <= study.ddReference).length / joint.length,
      placebo,
      placeboPercentile: placebo.filter((x) => x < baseSummary.net).length / placebo.length,
      inverted,
      printBelowStop,
      parity: { differences: parity.differences.length, first: parity.differences.slice(0, 3) }
    };
  });
  const controlParity = controlSpecs()
    .filter((spec) => spec.signal !== 'C-IDLE')
    .map((spec) => {
      const outcome = compareWithReference(engine, ds, spec, o);

      return { id: spec.id, differences: outcome.differences.length };
    });
  const controls = controlSpecs().map((spec) => {
    const r = engine.run(spec, { ...o, recordDaily: true });

    return {
      id: spec.id,
      summary: compact(summarise(ds, r, e, end)),
      yearly: yearly(ds, r.daily!, e),
      daily: r.daily!.map((row) => [Number(row.mark.toFixed(2)), Number(row.liquidation.toFixed(2)), row.invested]),
      trades: r.trades.map((t) => tradeRow(ds, t))
    };
  });
  const summary = {
    finalists: results.map((r) => ({
      role: r.role,
      id: r.id,
      family: r.candidate.family,
      baseline: r.baseline,
      settings: r.settings,
      jointShare: r.jointShare,
      placeboPercentile: r.placeboPercentile,
      inverted: r.inverted?.net ?? null,
      printBelowStop: r.printBelowStop.length,
      parityDifferences: r.parity.differences
    })),
    controlParity
  };

  return { summary, payloads: { finalists: results, controls } };
};

// ----- S8 analysis -----

export type EvaluateSummary = {
  fold: FoldKey;
  pStar: string | null;
  pStarFamily: FamilyId | null;
  p0: FamilyId | null;
  runs: Record<string, Omit<ReturnType<typeof windowFigures>, 'trades'>>;
  variants: Record<string, Omit<ReturnType<typeof windowFigures>, 'trades'>>;
  d1: { V: number; windowMinuteDD: number } | null;
};

export type RobustnessFinalist = {
  role: string;
  id: string;
  baseline: ReturnType<typeof compact>;
  settings: Record<string, ReturnType<typeof compact>>;
  jointShare: number;
  trades: ReturnType<typeof tradeRow>[];
  daily: [number, number, number][];
};

export interface AnalysisInputs {
  evals: EvaluateSummary[];
  finalists: RobustnessFinalist[];
  controls: { id: string; trades: ReturnType<typeof tradeRow>[]; daily: [number, number, number][] }[];
  hSel: Selection;
  dSel: Selection;
  d1Trades: { entryDate: string; exitDate: string | null }[];
  evaluations: { history: HistoryKey; used: number; planned: number }[];
}

export const stageAnalysis = async () => {
  assertPredecessors('analysis');
  assertFreezes(true);
  assertScope();

  const { ds, door } = await loadVgt(histories.H.developmentEnd);
  const inputs: AnalysisInputs = {
    evals: folds.map((fold) => readRecord(`evaluate-${fold}`).summary as EvaluateSummary),
    finalists: readPayload<RobustnessFinalist[]>('robustness', 'finalists'),
    controls: readPayload<AnalysisInputs['controls']>('robustness', 'controls'),
    hSel: readPayload<Selection>('develop-H', 'selection'),
    dSel: readPayload<Selection>('develop-D', 'selection'),
    d1Trades: (
      JSON.parse(gunzipSync(fs.readFileSync(sealedD1)).toString('utf8')) as {
        views: { U: { symbol: string; trades: { entryDate: string; exitDate: string | null }[] }[] };
      }
    ).views.U.find((row) => row.symbol === 'VGT')!.trades,
    evaluations: (['A', 'B', 'C', 'D', 'H'] as HistoryKey[]).map((key) => {
      const summary = readRecord(`develop-${key}`).summary as { used: number; planned: number };

      return { history: key, used: summary.used, planned: summary.planned };
    })
  };

  return writeStage('analysis', { door, ...analysisCore(ds, inputs) });
};

export const analysisCore = (ds: Dataset, inputs: AnalysisInputs) => {
  const e = indexOfDate(ds, study.firstDecisionClose);
  const end = ds.sessionCount - 1;
  const evals = inputs.evals;
  const foldFigures: FoldFigures[] = evals.map((ev) => {
    const pick = ev.pStarFamily ? ev.runs[`champion:${ev.pStarFamily}`] : undefined;

    return {
      fold: ev.fold,
      defined: Boolean(pick),
      V: pick?.V ?? 0,
      windowMinuteDrawdown: pick?.windowMinuteDD ?? 0,
      lotsEnteredOrCarried: pick ? pick.lotsEntered + pick.lotsCarried : 0,
      dollarDays: pick?.dollarDays ?? 0,
      calendarDays: pick?.calendarDays ?? 0,
      path: pick?.path ?? { boundaryMark: 0, endMark: 0, minuteMin: 0, minuteMax: 0, internalDrawdown: 0 },
      stresses: {
        tenBps: ev.variants['stress:tenBps']?.V ?? 0,
        rate14: ev.variants['stress:rate14']?.V ?? 0,
        slip25: ev.variants['stress:slip25']?.V ?? 0,
        delay1: ev.variants['stress:delay1']?.V ?? 0
      },
      stressDrawdowns: {
        tenBps: ev.variants['stress:tenBps']?.windowMinuteDD ?? 0,
        rate14: ev.variants['stress:rate14']?.windowMinuteDD ?? 0,
        slip25: ev.variants['stress:slip25']?.windowMinuteDD ?? 0,
        delay1: ev.variants['stress:delay1']?.windowMinuteDD ?? 0
      }
    };
  });
  const byFold = (key: string) => Object.fromEntries(evals.map((ev) => [ev.fold, ev.runs[key]?.V ?? 0]));
  const ddByFold = (key: string) => Object.fromEntries(evals.map((ev) => [ev.fold, ev.runs[key]?.windowMinuteDD ?? 0]));
  const robustnessPayload = inputs.finalists;
  const robust = (role: string): CandidateRobustness | undefined => {
    const f = robustnessPayload.find((r) => r.role === role);

    return f
      ? {
          id: f.id,
          r1: f.settings['cost:10']!.net,
          r2: f.settings['rate:0.14']!.net,
          r3: f.jointShare,
          r4: f.settings['stopSlip:25']!.net,
          r5: f.settings['delay:1']!.net,
          r6: f.baseline.minuteDD
        }
      : undefined;
  };
  const { hSel, dSel } = inputs;
  const hPick = robust('H P*');
  const dPick = hSel.pStar === dSel.pStar ? hPick : robust('D P*');
  const rubric = evaluateRubric({
    folds: foldFigures,
    alr: byFold('control:C-ALR'),
    controls: ['C-SMA', 'C-DON', 'C-TSM'].map((id) => ({
      id,
      V: byFold(`control:${id}`),
      windowMinuteDrawdown: ddByFold(`control:${id}`)
    })),
    hPick,
    dPick,
    ddReference: study.ddReference
  });
  // Family labels and reference rates.
  const championV = (family: FamilyId) => evals.map((ev) => ev.runs[`champion:${family}`]?.V);
  const families = Object.fromEntries(
    familyIds.map((family) => [family, { champion: championV(family), label: familyLabel(championV(family)) }])
  );
  const defaults = Object.fromEntries(
    familyIds.map((family) => {
      const values = evals.map((ev) => ev.runs[`default:${family}`]?.V);

      return [family, { V: values, label: familyLabel(values) }];
    })
  );
  const controls = Object.fromEntries(
    controlSpecs().map((spec) => {
      const values = evals.map((ev) => ev.runs[`control:${spec.id}`]?.V);

      return [
        spec.id,
        {
          V: values,
          label: familyLabel(values),
          windowDD: evals.map((ev) => ev.runs[`control:${spec.id}`]?.windowMinuteDD)
        }
      ];
    })
  );
  const p0 = evals.map((ev) =>
    ev.p0 ? { fold: ev.fold, family: ev.p0, V: ev.runs[`default:${ev.p0}`]!.V } : { fold: ev.fold, family: null, V: 0 }
  );
  // Ledgers for finalists and controls on H.
  const legs = upLegs(ds, e, end);
  const d1Sealed = inputs.d1Trades;
  const controlPayload = inputs.controls;
  const ledgerOf = (trades: ReturnType<typeof tradeRow>[], dailyRows: [number, number, number][]) => {
    const daily = dailyRows.map(([mark, liquidation, invested]) => ({ mark, liquidation, invested }));

    return {
      legs: legs.map((leg) => legStats(ds, leg, trades, daily, e)),
      episodes: episodeStats(ds, daily, trades, e),
      d1Overlap: d1Overlap(ds, daily, e, d1Sealed),
      concentration: (() => {
        const net = daily.at(-1)?.liquidation ?? 0;
        const byCampaign = new Map<number, number>();

        for (const t of trades) {
          byCampaign.set(t.campaign, (byCampaign.get(t.campaign) ?? 0) + t.net);
        }

        return net > 0
          ? { topLot: Math.max(...trades.map((t) => t.net)) / net, topCampaign: Math.max(...byCampaign.values()) / net }
          : { topLot: null, topCampaign: null };
      })()
    };
  };
  const ledgers = {
    legs,
    finalists: robustnessPayload.map((f) => ({ role: f.role, id: f.id, ...ledgerOf(f.trades, f.daily) })),
    controls: controlPayload.map((c) => ({ id: c.id, ...ledgerOf(c.trades, c.daily) }))
  };
  const evaluations = inputs.evaluations;
  const summary = {
    label: rubric.label,
    rubric,
    pi: chainWindows(foldFigures.filter((f) => f.defined).map((f) => f.path)),
    families,
    defaults,
    controls,
    p0,
    d1: evals.map((ev) => ({ fold: ev.fold, ...ev.d1 })),
    evaluations,
    totalEvaluations: evaluations.reduce((a, b) => a + b.used, 0)
  };

  return { summary, payloads: { analysis: summary, ledgers } };
};

export const verifyAll = () => {
  const problems: string[] = [];

  if (fs.existsSync(files.protocolFreeze)) {
    try {
      assertFreezes(fs.existsSync(files.codeFreeze));
    } catch (error) {
      problems.push((error as Error).message);
    }

    const frozen = readJsonFile<{ bodyHash: string }>(files.protocolFreeze);
    const { bodyHash, ...body } = frozen as { bodyHash: string } & Record<string, unknown>;

    if (sha256(toJson(body)) !== bodyHash) {
      problems.push('PROTOCOL_FREEZE.json body hash');
    }
  }

  const stages = fs.existsSync('research/study3-vgt-momentum/results/records')
    ? fs.readdirSync('research/study3-vgt-momentum/results/records').map((name) => name.replace(/\.json$/, ''))
    : [];

  for (const stage of stages) {
    problems.push(...verifyRecord(stage).problems);
  }

  return { stages, problems };
};
