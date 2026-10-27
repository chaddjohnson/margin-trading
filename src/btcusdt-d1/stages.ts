// The study's stages (PROTOCOL.md §11). Each outcome stage checks the freeze first, refuses to rerun when its record
// exists, needs its predecessors' sealed records, and never reads a bar at or after its window's cutoff. The holdout
// stage runs only after a passing procedure gate and only for the sealed final picks.
import { type Chronology, type Window, barsBefore, chronologyOf, dateOf, dayStart } from './calendar.ts';
import { costGrid, settingsLabel } from './costs.ts';
import { buildDays, runReference } from './engine.ts';
import { Evaluator, type Metrics, metricsOf } from './evaluate.ts';
import { runFast } from './fast.ts';
import { dayIndexOf } from './calendar.ts';
import { dayBoundaryBar, fastRunner, lookaheadViolations, referenceRunner } from './mutation.ts';
import { compareRuns, reconcileLedger } from './parity.ts';
import { type D1Grid, gridKey, inBox, maxLookbackDays, paramSpecs, paramsOfGrid } from './params.ts';
import { Pool } from './pool.ts';
import { minTradesFor, procedure, settingsFor } from './protocol.ts';
import {
  assertFrozen,
  files,
  nowIso,
  readSealed,
  stageFile,
  type Freeze,
  writeArchive,
  writeSealed,
  boundDocuments,
  codeManifest,
  engineClosure,
  environment,
  outcomeCode,
  outcomeStamp,
  reportOnlyFiles,
  hashBody,
  jsonSafe,
  sha256File
} from './records.ts';
import { type Candidate, type SelectionResult, runSelection } from './select.ts';
import { neighbour, rngFor, sobolGrids } from './space.ts';
import { loadSnapshot, sliceSeries } from './snapshot.ts';
import fs from 'node:fs';

// The unchanged D1 vector of config/phenotypes/D1/VGT.json "primary", as a non-optimised diagnostic.
export const diagnosticGrid: D1Grid = {
  targetPercentChange: 216,
  trailingBuyPercentage: 3,
  trailingStopPercentage: 73,
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: 29,
  pullback: 90,
  continuationWindow: 60
};

// The staged series, checked against the sealed audit's snapshot definition (series hash and length) when it exists.
export const loadStudy = (checkRaw = false) => {
  const pinned = fs.existsSync(files.audit)
    ? readSealed<{ snapshot: { seriesSha256: string; rows: number } }>(files.audit).snapshot
    : undefined;
  const { definition, series } = loadSnapshot(pinned, checkRaw);
  const chronology = chronologyOf(definition.historyStart, definition.snapshotEnd, maxLookbackDays);

  return { definition, series, chronology };
};

const log = (text: string) => console.info(`[${nowIso()}] ${text}`);

// ---------------------------------------------------------------------------------------------------------------
// Parity and lookahead mutation on the real development data (pre-freeze; records differences, not outcomes).
export const runParityStage = () => {
  const { series, chronology, definition } = loadStudy(true);
  const devEnd = chronology.development.endDay;
  const dev = sliceSeries(series, barsBefore(series, devEnd));
  const days = buildDays(dev);
  const index = dayIndexOf(dev);
  const rng = rngFor('parity');
  const grids: D1Grid[] = [diagnosticGrid];

  while (grids.length < 41) {
    const grid = Object.fromEntries(
      paramSpecs.map((spec) => [spec.key, spec.min + rng.int(spec.max - spec.min + 1)])
    ) as D1Grid;

    grids.push(grid);
  }

  const windows: Window[] = [
    chronology.development,
    chronology.folds[0]!.selection,
    chronology.folds[0]!.validation,
    chronology.folds[1]!.validation
  ];
  const settingsList = [
    settingsFor({ label: 'fee0-impact0', feeBps: 0, impactBps: 0 }),
    procedure.settings.principal,
    procedure.settings.stress,
    procedure.settings.stopLevel,
    procedure.settings.worstFill
  ];
  const runs: {
    key: string;
    settings: string;
    trades: number;
    differences: number;
    maxMoney: number;
    ledger: number;
  }[] = [];
  const coverage = {
    trades: 0,
    carriedEntries: 0, // buys decided on a day's last minute, filled at the next day's first trade
    gapFills: 0, // fills after at least one missing minute (entry time > decision time)
    heldAcrossGap: 0, // positions held across a data gap of at least 60 minutes
    carriedSales: 0, // buffered or stop sales carried to the next day's first trade
    stopGaps: 0
  };
  const longGapAfter = new Uint8Array(dev.rows);

  for (let i = 0; i + 1 < dev.rows; i++) {
    longGapAfter[i] = dev.time[i + 1]! - dev.time[i]! >= 3660 ? 1 : 0;
  }
  let firstDifferences: string[] = [];

  for (const grid of grids) {
    for (const settings of settingsList) {
      const params = paramsOfGrid(grid);
      const reference = runReference({ days, params, settings, armStartDay: chronology.armStartDay, windows });
      const fast = runFast({ series: dev, index, params, settings, armStartDay: chronology.armStartDay, windows });
      const parity = compareRuns(reference, fast);
      const ledger = reconcileLedger(reference, 100000);

      if (parity.differences.length && firstDifferences.length === 0) {
        firstDifferences = parity.differences.slice(0, 10);
      }

      runs.push({
        key: gridKey(grid),
        settings: settingsLabel(settings),
        trades: reference.trades.length,
        differences: parity.differences.length,
        maxMoney: parity.maxMoneyDifference,
        ledger: ledger.length
      });

      if (settings === procedure.settings.principal) {
        for (const trade of reference.trades) {
          coverage.trades++;
          coverage.carriedEntries += trade.entryExecution === 'carried to next day opening trade' ? 1 : 0;
          coverage.gapFills += trade.entryTime > trade.decisionTime ? 1 : 0;
          coverage.carriedSales += trade.exitExecution === 'carried to next day opening trade' ? 1 : 0;
          coverage.stopGaps += trade.exitReason === 'trailing stop gap' ? 1 : 0;

          for (let i = trade.entryBar; i < trade.exitBar; i++) {
            if (longGapAfter[i]) {
              coverage.heldAcrossGap++;
              break;
            }
          }
        }
      }
    }

    log(`parity ${runs.length}/${grids.length * settingsList.length}`);
  }

  // Mutation: 24 cutoffs (12 UTC day boundaries, 12 random minutes) for the diagnostic and three random vectors.
  const cutoffs: number[] = [];
  const mutationRng = rngFor('mutation-cutoffs');

  for (let i = 0; i < 12; i++) {
    const day = chronology.armStartDay + 30 + mutationRng.int(devEnd - chronology.armStartDay - 60);

    cutoffs.push(dayBoundaryBar(dev, day));
    cutoffs.push(
      dayBoundaryBar(dev, chronology.armStartDay) +
        mutationRng.int(dev.rows - dayBoundaryBar(dev, chronology.armStartDay) - 1)
    );
  }

  const windowEnds = [chronology.folds[0]!.selection.endDay, chronology.folds[1]!.selection.endDay];
  const mutation: { key: string; runner: string; cutoffs: number; violations: number }[] = [];

  for (const grid of grids.slice(0, 4)) {
    for (const [name, runner] of [
      ['fast', fastRunner(paramsOfGrid(grid), procedure.settings.principal, chronology.armStartDay, windowEnds)],
      [
        'reference',
        referenceRunner(paramsOfGrid(grid), procedure.settings.principal, chronology.armStartDay, windowEnds)
      ]
    ] as const) {
      const original = runner(dev);
      const violations = cutoffs.reduce(
        (total, cutoff) => total + lookaheadViolations(runner, dev, cutoff, 'a', original).length,
        0
      );

      mutation.push({ key: gridKey(grid), runner: name, cutoffs: cutoffs.length, violations });
    }

    log(`mutation ${gridKey(grid)}`);
  }

  // Truncation: every bar from the cutoff deleted, for the same runners and cutoffs.
  for (const grid of grids.slice(0, 4)) {
    const runner = fastRunner(paramsOfGrid(grid), procedure.settings.principal, chronology.armStartDay, windowEnds);
    const original = runner(dev);
    const violations = cutoffs.reduce(
      (total, cutoff) => total + lookaheadViolations(runner, dev, cutoff, 'a', original, 'truncate').length,
      0
    );

    mutation.push({ key: gridKey(grid), runner: 'fast (truncation)', cutoffs: cutoffs.length, violations });
  }

  const cheats = (['next-minute-low', 'same-day-high'] as const).map((kind) => {
    const cheat = fastRunner(
      paramsOfGrid(diagnosticGrid),
      procedure.settings.principal,
      chronology.armStartDay,
      windowEnds,
      kind
    );
    const cheatOriginal = cheat(dev);

    return {
      kind,
      cutoffs: cutoffs.length,
      caught: cutoffs.filter((cutoff) => lookaheadViolations(cheat, dev, cutoff, 'a', cheatOriginal).length > 0).length
    };
  });

  // The first run writes PARITY.json; a later run (after an engine change before the freeze) is a labelled rerun.
  let record = files.parity;
  let rerun = 0;

  while (fs.existsSync(record)) {
    rerun++;
    record = files.parity.replace('PARITY.json', `PARITY-r${rerun + 1}.json`);
  }

  return writeSealed(record, {
    rerun: rerun === 0 ? 'first run' : `labelled rerun ${rerun + 1} (same seeds and vectors) after an engine change`,
    stage: 'parity',
    writtenAt: nowIso(),
    seriesSha256: definition.seriesSha256,
    dataWindow: `history start → ${dateOf(devEnd - 1)} (development only; the holdout is not read)`,
    code: codeManifest(),
    candidates: grids.length,
    settings: settingsList.map(settingsLabel),
    runs: runs.length,
    runsWithDifferences: runs.filter((run) => run.differences > 0).length,
    runsWithLedgerProblems: runs.filter((run) => run.ledger > 0).length,
    maxMoneyDifference: Math.max(...runs.map((run) => run.maxMoney)),
    totalTrades: runs.reduce((total, run) => total + run.trades, 0),
    firstDifferences,
    coverage,
    mutation,
    cheats,
    detail: runs
  });
};

// ---------------------------------------------------------------------------------------------------------------
// Outcome-blind benchmark: timings only; the metrics are discarded unread.
export const runBenchmarkStage = async (workers?: number) => {
  const { series, chronology } = loadStudy();
  const pool = await Pool.start(series, workers);
  const grids = (() => {
    const rng = rngFor('benchmark');

    return Array.from(
      { length: 1024 },
      () =>
        Object.fromEntries(paramSpecs.map((spec) => [spec.key, spec.min + rng.int(spec.max - spec.min + 1)])) as D1Grid
    );
  })();
  const timings: { window: string; evaluations: number; seconds: number; perEvaluationMs: number }[] = [];

  try {
    for (const window of [chronology.folds[0]!.selection, chronology.final.selection]) {
      const started = performance.now();

      await pool.evaluate(
        grids.map((grid) => ({
          grid,
          settings: procedure.settings.principal,
          armStartDay: chronology.armStartDay,
          window
        }))
      );

      const seconds = (performance.now() - started) / 1000;

      timings.push({
        window: window.label,
        evaluations: grids.length,
        seconds,
        perEvaluationMs: (seconds * 1000) / grids.length
      });
    }
  } finally {
    await pool.close();
  }

  const { budgets } = procedure;
  const perSelection =
    budgets.sobol +
    budgets.refinementSeeds * budgets.generations * budgets.offspring +
    budgets.shortlist * (budgets.neighbours + budgets.wideNeighbours + 2);
  const slowest = Math.max(...timings.map((t) => t.perEvaluationMs));

  return writeSealed(files.benchmark, {
    stage: 'benchmark',
    writtenAt: nowIso(),
    note: 'timings only; candidate metrics were computed by the workers and discarded without being read or written',
    workers: pool.size,
    timings,
    budgets,
    evaluationsPerSelection: perSelection,
    projectedSecondsPerSelection: (perSelection * slowest) / 1000
  });
};

export const describeChronology = (chronology: Chronology) => {
  const w = (window: Window) => ({
    label: window.label,
    start: dateOf(window.startDay),
    endExclusive: dateOf(window.endDay)
  });

  return {
    historyStart: dateOf(chronology.historyStartDay),
    lastDay: dateOf(chronology.lastDay),
    historyDays: chronology.historyDays,
    armingFrom: dateOf(chronology.armStartDay),
    development: w(chronology.development),
    holdout: w(chronology.holdout),
    folds: chronology.folds.map((fold) => ({
      label: fold.label,
      selection: w(fold.selection),
      validation: w(fold.validation)
    })),
    finalSelection: w(chronology.final.selection)
  };
};

// ---------------------------------------------------------------------------------------------------------------
// The freeze.
// The latest parity record (PARITY.json or its labelled reruns PARITY-rN.json).
export const latestParity = () => {
  let latest = files.parity;

  for (let rerun = 2; fs.existsSync(files.parity.replace('PARITY.json', `PARITY-r${rerun}.json`)); rerun++) {
    latest = files.parity.replace('PARITY.json', `PARITY-r${rerun}.json`);
  }

  return { file: latest, record: readSealed<{ code: { hashes: Record<string, string> } }>(latest) };
};

export const runFreezeStage = () => {
  const { definition, chronology } = loadStudy(true);
  const parity = latestParity();
  const manifest = codeManifest();
  const stale = engineClosure.filter((file) => parity.record.code.hashes[file] !== manifest.hashes[file]);

  const clean = parity.record as unknown as {
    runsWithDifferences: number;
    runsWithLedgerProblems: number;
    mutation: { violations: number }[];
    cheats: { caught: number }[];
  };

  // The parity evidence must be clean ...
  if (
    clean.runsWithDifferences !== 0 ||
    clean.runsWithLedgerProblems !== 0 ||
    clean.mutation.some((row) => row.violations !== 0) ||
    !clean.cheats?.length ||
    clean.cheats.some((row) => row.caught === 0)
  ) {
    throw new Error(
      `${parity.file} is not clean (differences, ledger problems, mutation violations or an uncaught cheat)`
    );
  }

  // ... and for exactly the engine code being frozen.
  if (stale.length > 0) {
    throw new Error(
      `${parity.file} tested different engine code (${stale.join(', ')}): run \`npm run btc-d1 -- parity\` first`
    );
  }

  readSealed(files.benchmark);

  if (!fs.existsSync(files.protocol)) {
    throw new Error(`${files.protocol} is missing`);
  }

  if (!environment().script) {
    throw new Error('package.json has no btc-d1 script');
  }

  return writeSealed(files.freeze, {
    version: 'btcusdt-d1-protocol-v1',
    frozenAt: nowIso(),
    protocol: { file: files.protocol, sha256: sha256File(files.protocol) },
    documents: Object.fromEntries(boundDocuments.map((file) => [file, sha256File(file)])),
    procedureHash: hashBody(jsonSafe(procedure)),
    procedure: jsonSafe(procedure),
    snapshot: {
      rawFile: definition.rawFile,
      rawSha256AtSnapshot: definition.rawSha256AtSnapshot,
      snapshotEnd: definition.snapshotEnd,
      snapshotPrefixBytes: definition.snapshotPrefixBytes,
      snapshotPrefixSha256: definition.snapshotPrefixSha256,
      historyStart: definition.historyStart,
      rows: definition.rows,
      seriesSha256: definition.seriesSha256
    },
    chronology: describeChronology(chronology),
    space: paramSpecs,
    sobolFirstKeys: sobolGrids(8).map(gridKey),
    code: manifest,
    outcomeCode: outcomeCode(manifest.hashes),
    reportOnlyFiles,
    engineClosure,
    environment: environment(),
    records: {
      audit: readSealed(files.audit).bodyHash,
      parity: { file: parity.file, bodyHash: parity.record.bodyHash },
      benchmark: readSealed(files.benchmark).bodyHash
    }
  });
};

// ---------------------------------------------------------------------------------------------------------------
// Selection + sealed picks, then validation.
const compactMetrics = (m: Metrics) => {
  const { schedule, tradeNets, ...rest } = m;

  return { ...rest, schedulePairs: schedule.length / 2, tradeCount: tradeNets.length };
};

const compactCandidate = (candidate: Candidate) => ({
  key: candidate.metrics.key,
  origin: candidate.origin,
  metrics: { ...candidate.metrics, schedule: candidate.metrics.schedule },
  neighbours: candidate.neighbours,
  wide: candidate.wide,
  conservative: candidate.conservative && compactMetrics(candidate.conservative),
  worstFill: candidate.worstFill && compactMetrics(candidate.worstFill),
  gates: {
    g1: candidate.g1,
    g2: candidate.g2,
    g6: candidate.g6,
    g3: candidate.g3,
    g4: candidate.g4,
    g5: candidate.g5
  },
  score: candidate.score
});

const describeNoPick = (selection: SelectionResult) => {
  if (selection.poolSize === 0) {
    return 'no evaluated vector passed G1, G2 and G6';
  }

  if (selection.eligible.length === 0) {
    return 'no shortlisted vector passed G3, G4 and G5';
  }

  return 'no pick';
};

const writeSelection = (stage: string, selection: SelectionResult, freeze: Freeze) => {
  const archive = writeArchive(stageFile(stage, 'archive.jsonl.gz'), selection.archive.map(compactMetrics));
  const record = writeSealed(stageFile(stage, 'SELECTION.json'), {
    stage: `${stage} selection`,
    writtenAt: nowIso(),
    ...outcomeStamp(freeze),
    label: selection.label,
    window: { start: dateOf(selection.window.startDay), endExclusive: dateOf(selection.window.endDay) },
    dataCutoff: `bars before ${dateOf(selection.window.endDay)}T00:00:00Z only`,
    minTrades: selection.minTrades,
    evaluated: selection.evaluated,
    sobol: selection.sobol,
    seeds: selection.seeds,
    refinement: selection.refinement,
    poolSize: selection.poolSize,
    distinctSchedules: selection.distinctSchedules,
    shortlistSkips: selection.shortlistSkips,
    shortlist: selection.shortlist.map(compactCandidate),
    eligible: selection.eligible,
    exploratoryLowDrawdown: selection.exploratoryLowDrawdown && compactCandidate(selection.exploratoryLowDrawdown),
    archive
  });
  const picks = writeSealed(stageFile(stage, 'PICKS.json'), {
    stage: `${stage} picks`,
    writtenAt: nowIso(),
    ...outcomeStamp(freeze),
    selectionBodyHash: record.bodyHash,
    window: { start: dateOf(selection.window.startDay), endExclusive: dateOf(selection.window.endDay) },
    picks: selection.picks.map((candidate, rank) => ({
      rank: rank + 1,
      key: candidate.metrics.key,
      grid: candidate.metrics.grid,
      score: candidate.score,
      selectionNet: candidate.metrics.net,
      selectionMinutePercent: candidate.metrics.minutePercent
    })),
    centre: selection.shortlist[0] && {
      key: selection.shortlist[0].metrics.key,
      grid: selection.shortlist[0].metrics.grid
    },
    noPickReason: selection.picks.length === 0 ? describeNoPick(selection) : undefined
  });

  return { record, picks };
};

interface PicksRecord {
  picks: { rank: number; key: string; grid: D1Grid; score: number }[];
  centre?: { key: string; grid: D1Grid };
  noPickReason?: string;
}

const yearWindows = (window: Window): Window[] => {
  const windows: Window[] = [];
  let start = window.startDay;

  while (start < window.endDay) {
    const year = new Date(dayStart(start) * 1000).getUTCFullYear();
    const next = Math.min(window.endDay, Date.UTC(year + 1, 0, 1) / 86400000);

    windows.push({ label: `${year}`, startDay: start, endDay: next });
    start = next;
  }

  return windows;
};

// One pick's evidence on an out-of-sample window: the continuous run (state carried from the arming day) at the
// principal costs, the cost grid and the two other stop conventions, a flat-start diagnostic, calendar-year
// attribution, and its selection neighbours on the same window.
const outOfSampleEvidence = async (
  pool: Pool,
  evaluator: Evaluator,
  chronology: Chronology,
  grid: D1Grid,
  selection: Window,
  window: Window,
  label: string
) => {
  const continuous = (settings = procedure.settings.principal) => ({
    grid,
    settings,
    armStartDay: chronology.armStartDay,
    window,
    dataEndDay: window.endDay
  });
  const requests = [
    continuous(),
    ...costGrid.map((costs) => continuous(settingsFor(costs))),
    continuous(procedure.settings.stopLevel),
    continuous(procedure.settings.worstFill),
    { grid, settings: procedure.settings.principal, armStartDay: window.startDay, window }
  ];
  const narrow = rngFor(label, 'oos-neighbours', gridKey(grid));
  const neighbours = Array.from({ length: procedure.budgets.neighbours }, () => continuous()).map((request) => ({
    ...request,
    grid: neighbour(grid, narrow, 1)
  }));
  const results = await pool.evaluate([...requests, ...neighbours]);
  const [principalResult, ...rest] = results;
  const costs = rest.slice(0, costGrid.length);
  const [stopLevel, worstFill, flatStart] = rest.slice(costGrid.length, costGrid.length + 3);
  const neighbourResults = rest.slice(costGrid.length + 3);
  const years = yearWindows(window);
  const run = evaluator.run(continuous(), years);
  const attribution = years.map((year, i) => {
    const m = metricsOf({ ...continuous(), window: year }, run, i + 1);

    return { year: year.label, net: m.net, minutePercent: m.minutePercent, entries: m.entries, exits: m.exits };
  });
  const sortedNets = neighbourResults.map((m) => m.net).sort((a, b) => a - b);

  return {
    key: gridKey(grid),
    grid,
    selectionWindow: dateOf(selection.startDay),
    principal: principalResult!,
    costs: costs.map((m, i) => ({
      scenario: costGrid[i]!.label,
      net: m.net,
      minutePercent: m.minutePercent,
      entries: m.entries
    })),
    stopLevel: { net: stopLevel!.net, minutePercent: stopLevel!.minutePercent },
    worstFill: { net: worstFill!.net, minutePercent: worstFill!.minutePercent },
    flatStart: { net: flatStart!.net, minutePercent: flatStart!.minutePercent, entries: flatStart!.entries },
    attribution,
    neighbours: {
      count: sortedNets.length,
      medianNet:
        sortedNets.length % 2
          ? sortedNets[sortedNets.length >> 1]!
          : (sortedNets[(sortedNets.length >> 1) - 1]! + sortedNets[sortedNets.length >> 1]!) / 2,
      positiveShare: sortedNets.filter((net) => net > 0).length / sortedNets.length,
      minNet: sortedNets[0],
      maxNet: sortedNets[sortedNets.length - 1]
    }
  };
};

// The out-of-sample gate (PROTOCOL.md §8) on a pick's evidence for one window: every selection test that can be
// applied out of sample.
export const outOfSampleGate = (evidence: Awaited<ReturnType<typeof outOfSampleEvidence>>, window: Window) => {
  const p = evidence.principal;
  const minEntries = Math.ceil(procedure.foldGate.minTradesPerYear * ((window.endDay - window.startDay) / 365.25));
  const conservativeNet = evidence.costs.find(
    (row) => row.scenario === procedure.settings.conservative.costs.label
  )!.net;
  const carriedIn = p.net - p.tradeNets.reduce((total, net) => total + net, 0);
  const tests = {
    net: { value: p.net, pass: p.net > 0 },
    conservativeNet: { value: conservativeNet, pass: conservativeNet > 0 },
    worstFillNet: { value: evidence.worstFill.net, pass: evidence.worstFill.net > 0 },
    // No single trade carries the window: a position carried in from before the window counts as a trade too. Cash
    // changes only through trades, so its in-window contribution is the net minus the window's entered trades.
    netExTopOne: {
      value: p.net - Math.max(p.topOne, carriedIn),
      largestEntered: p.topOne,
      carriedIn,
      pass: p.net - Math.max(p.topOne, carriedIn) > 0
    },
    minutePercent: { value: p.minutePercent, pass: p.minutePercent <= procedure.foldGate.maxMinutePercent },
    minuteDrawdownUsdt: { value: p.minuteDrawdown, pass: p.minuteDrawdown <= procedure.foldGate.maxMinuteDrawdownUsdt },
    entries: { value: p.entries, minimum: minEntries, pass: p.entries >= minEntries }
  };

  return { tests, pass: Object.values(tests).every((test) => test.pass) };
};

export const runFoldStage = async (foldLabel: string, workers?: number) => {
  const { series, chronology, definition } = loadStudy(true);
  const freeze = assertFrozen(procedure, definition.seriesSha256);
  const fold = chronology.folds.find((candidate) => candidate.label === foldLabel);

  if (!fold) {
    throw new Error(`Unknown fold '${foldLabel}' (fold-a, fold-b)`);
  }

  const stage = `folds/${fold.label}`;
  const pool = await Pool.start(series, workers);
  const evaluator = new Evaluator(series);

  try {
    if (!fs.existsSync(stageFile(stage, 'PICKS.json'))) {
      log(
        `${fold.label}: selection on ${dateOf(fold.selection.startDay)} → ${dateOf(fold.selection.endDay)} (exclusive)`
      );

      const selection = await runSelection(pool, fold.label, fold.selection, chronology.armStartDay, log);

      writeSelection(stage, selection, freeze);
      log(`${fold.label}: picks sealed (${selection.picks.length})`);
    }

    const picks = readSealed<PicksRecord>(stageFile(stage, 'PICKS.json'));

    if (fs.existsSync(stageFile(stage, 'VALIDATION.json'))) {
      throw new Error(`${stage}/VALIDATION.json exists: the fold is complete and is never rerun`);
    }

    log(
      `${fold.label}: validation ${dateOf(fold.validation.startDay)} → ${dateOf(fold.validation.endDay)} (exclusive)`
    );

    const evidence = [];

    for (const pick of picks.picks) {
      evidence.push({
        rank: pick.rank,
        ...(await outOfSampleEvidence(
          pool,
          evaluator,
          chronology,
          pick.grid,
          fold.selection,
          fold.validation,
          fold.label
        ))
      });
    }

    const descriptive = [];

    if (picks.centre && !picks.picks.some((pick) => pick.key === picks.centre!.key)) {
      descriptive.push({
        role: 'centre (highest raw net in the shortlist; not a pick)',
        ...(await outOfSampleEvidence(
          pool,
          evaluator,
          chronology,
          picks.centre.grid,
          fold.selection,
          fold.validation,
          fold.label
        ))
      });
    }

    descriptive.push({
      role: 'diagnostic (unchanged VGT D1 vector; not optimised for BTC)',
      ...(await outOfSampleEvidence(
        pool,
        evaluator,
        chronology,
        diagnosticGrid,
        fold.selection,
        fold.validation,
        fold.label
      ))
    });

    const gate = evidence[0]
      ? outOfSampleGate(evidence[0], fold.validation)
      : { pass: false, reason: picks.noPickReason ?? 'no pick' };

    return writeSealed(stageFile(stage, 'VALIDATION.json'), {
      stage: `${stage} validation`,
      writtenAt: nowIso(),
      ...outcomeStamp(freeze),
      picksBodyHash: picks.bodyHash,
      validation: { start: dateOf(fold.validation.startDay), endExclusive: dateOf(fold.validation.endDay) },
      dataCutoff: `bars before ${dateOf(fold.validation.endDay)}T00:00:00Z only`,
      evidence,
      descriptive,
      gate
    });
  } finally {
    await pool.close();
  }
};

export const runGateStage = () => {
  const { definition } = loadStudy();

  const freeze = assertFrozen(procedure, definition.seriesSha256);
  const folds = ['fold-a', 'fold-b'].map((label) => {
    const validation = readSealed<{ gate: { pass: boolean }; picksBodyHash: string; outcomeCodeDigest: string }>(
      stageFile(`folds/${label}`, 'VALIDATION.json')
    );
    const picks = readSealed<{ outcomeCodeDigest: string }>(stageFile(`folds/${label}`, 'PICKS.json'));

    if (
      validation.picksBodyHash !== picks.bodyHash ||
      validation.outcomeCodeDigest !== freeze.outcomeCode.digest ||
      picks.outcomeCodeDigest !== freeze.outcomeCode.digest
    ) {
      throw new Error(`${label}: VALIDATION.json does not belong to this PICKS.json or this frozen code`);
    }

    return { label, bodyHash: validation.bodyHash, picksBodyHash: picks.bodyHash, gate: validation.gate };
  });

  return writeSealed(files.gate, {
    stage: 'procedure gate',
    writtenAt: nowIso(),
    ...outcomeStamp(freeze),
    rule: 'the rank-1 pick of each fold, sealed before its validation window, passes every out-of-sample test of PROTOCOL.md §8 on that window; the procedure passes only if both folds pass',
    folds,
    pass: folds.every((fold) => fold.gate.pass)
  });
};

export const runFinalStage = async (workers?: number) => {
  const { series, chronology, definition } = loadStudy(true);

  const freeze = assertFrozen(procedure, definition.seriesSha256);

  readSealed(files.gate);

  if (fs.existsSync(stageFile('final', 'PICKS.json'))) {
    throw new Error('final/PICKS.json exists: the final selection is never rerun');
  }

  const pool = await Pool.start(series, workers);

  try {
    log(
      `final: selection on ${dateOf(chronology.final.selection.startDay)} → ${dateOf(chronology.final.selection.endDay)}`
    );

    const selection = await runSelection(pool, 'final', chronology.final.selection, chronology.armStartDay, log);

    return writeSelection('final', selection, freeze);
  } finally {
    await pool.close();
  }
};

export const runHoldoutStage = async (workers?: number) => {
  const { series, chronology, definition } = loadStudy(true);
  const freeze = assertFrozen(procedure, definition.seriesSha256);
  const gate = readSealed<{ pass: boolean; outcomeCodeDigest: string }>(files.gate);

  if (gate.outcomeCodeDigest !== freeze.outcomeCode.digest) {
    throw new Error('results/PROCEDURE_GATE.json was not written under the frozen code');
  }

  if (!gate.pass) {
    throw new Error(
      'The procedure gate failed (results/PROCEDURE_GATE.json): the holdout stays sealed and is never evaluated'
    );
  }

  const picks = readSealed<PicksRecord & { outcomeCodeDigest: string }>(stageFile('final', 'PICKS.json'));

  if (picks.outcomeCodeDigest !== freeze.outcomeCode.digest) {
    throw new Error('results/final/PICKS.json was not written under the frozen code');
  }

  if (fs.existsSync(stageFile('final', 'HOLDOUT.json'))) {
    throw new Error('final/HOLDOUT.json exists: the holdout is evaluated exactly once');
  }

  if (picks.picks.length === 0) {
    throw new Error('The final selection has no pick: there is nothing to evaluate, so the holdout is not opened');
  }

  const pool = await Pool.start(series, workers);
  const evaluator = new Evaluator(series);

  try {
    const evidence = [];

    for (const pick of picks.picks) {
      evidence.push({
        rank: pick.rank,
        ...(await outOfSampleEvidence(
          pool,
          evaluator,
          chronology,
          pick.grid,
          chronology.final.selection,
          chronology.holdout,
          'holdout'
        ))
      });
    }

    return writeSealed(stageFile('final', 'HOLDOUT.json'), {
      stage: 'holdout (single authorised evaluation)',
      writtenAt: nowIso(),
      ...outcomeStamp(freeze),
      picksBodyHash: picks.bodyHash,
      holdout: { start: dateOf(chronology.holdout.startDay), endExclusive: dateOf(chronology.holdout.endDay) },
      evidence,
      gate: outOfSampleGate(evidence[0]!, chronology.holdout)
    });
  } finally {
    await pool.close();
  }
};

export { inBox, minTradesFor };
