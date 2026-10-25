// The walk-forward experiment (PROTOCOL.md §13): `walkforward --round fold-a|fold-b` runs the whole procedure on the
// fold's truncated training window (arms J and Q) and writes PICKS.json once; `validate --round …` opens the
// validation bars only through the PICKS-gated door and scores the picks, the 360 pilot controls and B1/B4/B5 on one
// continuous run (state carried across the search end), with an isolated flat-start run beside it; `gwf` applies the
// predeclared procedure gate to both folds and writes GWF.json once.
import fs from 'fs-extra';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { FixedLedger, type RealLot } from '../multi-etf-allocator/ledger.ts';
import type { ReplayBook } from '../portfolio-aware-d1/replay.ts';
import type { TraceWindow } from '../portfolio-aware-d1/trace.ts';
import {
  type FoldKey,
  type TierKey,
  log,
  nowIso,
  option,
  readJson,
  stageDir,
  study,
  tierFile,
  tiers,
  writeJson
} from './context.ts';
import { doorRecordOf, eligibleSymbols, picksFile, trainingUniverse, validationUniverse } from './data.ts';
import { buildTrace, canonicalBooks, keyOf, replayOf, runEngine } from './evaluate.ts';
import { RobustEvaluator } from './evaluator.ts';
import { provenance, readSealed, requireProtocolFrozen, sha256, writeSealed } from './freeze.ts';
import { requireControls } from './controls.ts';
import type { Book } from './neighbourhood.ts';
import { requireParity } from './parity.ts';
import { pilotConfigs, pilotDir } from './pilot.ts';
import { portfolioSpec } from './promote.ts';
import { booksOfPick, readPilotFreeze, runRound, writePicks } from './round.ts';
import { quantile, summarize } from './stats.ts';

export const foldDir = (fold: FoldKey, ...parts: string[]) => stageDir('walkforward', fold, ...parts);
export const gwfFile = stageDir('walkforward', 'GWF.json');

export const readTier = async () => {
  const record = await readJson<{ tier: TierKey; workers: number }>(tierFile);

  return { tier: tiers[record.tier], workers: record.workers };
};

const foldOf = (args: string[]): FoldKey => {
  const round = option(args, 'round');

  if (round !== 'fold-a' && round !== 'fold-b') {
    throw new Error('--round fold-a|fold-b');
  }

  return round;
};

export const runFold = async (args: string[]) => {
  await requireProtocolFrozen();
  await requireParity();

  await requireControls();

  const fold = foldOf(args);

  if (await fs.pathExists(picksFile(fold))) {
    throw new Error(`${picksFile(fold)} exists: the ${fold} round ran once and its picks are frozen`);
  }

  const { tier, workers } = await readTier();
  const universe = await eligibleSymbols();
  const pilot = await readPilotFreeze(fold);
  const loaded = await trainingUniverse(fold, { symbols: universe });
  const evaluator = await RobustEvaluator.create(loaded, fold, workers);
  const benchmarks = await searchBenchmarkBooks();

  try {
    const outcome = await runRound(
      evaluator,
      loaded,
      { round: fold, tier, universe, benchmarks, outDir: foldDir(fold) },
      pilot
    );
    const picks = await writePicks(picksFile(fold), fold, outcome, {
      tier: tier.key,
      pilotFreeze: pilot.bodyHash,
      provenance: await provenance(),
      door: doorRecordOf('trainingUniverse', loaded, fold),
      evaluations: Object.fromEntries(Object.entries(outcome.archives).map(([arm, archive]) => [arm, archive.size]))
    });

    await writeJson(foldDir(fold, 'round-run.json'), {
      generatedAt: nowIso(),
      seconds: outcome.seconds,
      cache: evaluator.cacheStats()
    });

    log(
      `${fold}: PICKS.json written (${picks.bodyHash.slice(0, 12)}); J ${(picks.J as { primary?: { key: string } }).primary?.key ?? 'none'}; Q ${(picks.Q as { primary?: { key: string } }).primary?.key ?? 'none'}`
    );
  } finally {
    await evaluator.close();
  }
};

// The maximum minute-sampled drawdown of a fixed-pool replay's strategy mark with the peak reset at `fromIndex`'s
// close, recomputed from the replay's own ledger lots and bars in the replay's exact order of marks.
export const windowedMinuteDrawdown = (
  lots: readonly RealLot[],
  books: readonly ReplayBook[],
  marks: Float64Array,
  fromIndex: number,
  endIndex: number,
  costBps: number
) => {
  const ledger = new FixedLedger(study.rate, costBps);
  const bySymbol = new Map(books.map((book) => [book.symbol, book.ds]));
  const anyDs = books[0]!.ds;
  const sTime = anyDs.sTime;
  const closeTimes = anyDs.sCloseTime;
  const tracker = new Tracker(marks[fromIndex]!, closeTimes[fromIndex]!);
  const ordered = [...lots].sort((a, b) => a.entryIndex - b.entryIndex || a.entryBar - b.entryBar);
  let realized = ordered
    .filter((lot) => lot.exitIndex >= 0 && lot.exitIndex <= fromIndex)
    .reduce((total, lot) => total + lot.net, 0);
  let next = ordered.findIndex((lot) => lot.exitIndex < 0 || lot.exitIndex > fromIndex);
  let open: RealLot | undefined;

  if (next >= 0 && ordered[next]!.entryIndex <= fromIndex) {
    open = ordered[next]!;
    next++;
  }

  if (next < 0) {
    next = ordered.length;
  }

  for (let s = fromIndex + 1; s <= endIndex; s++) {
    for (;;) {
      if (open) {
        const ds = bySymbol.get(open.symbol)!;
        const start = ds.sBarStart[s]!;
        const count = ds.sBarCount[s]!;
        const exitBar = open.exitIndex === s ? open.exitBar : Infinity;
        let closed = false;

        for (let k = open.entryIndex === s ? open.entryBar : 0; k < count; k++) {
          const T = ds.bTime[start + k]!;

          if (k === exitBar) {
            realized += open.net;
            tracker.updateStrict(realized, T);
            open = undefined;
            closed = true;
            break;
          }

          tracker.updateStrict(realized + ledger.mark(open, ds.bClose[start + k]!, sTime[s]!), T);
        }

        if (!closed) {
          break;
        }

        continue;
      }

      const candidate = ordered[next];
      const count = candidate ? bySymbol.get(candidate.symbol)!.sBarCount[s]! : 0;

      if (!candidate || candidate.entryIndex !== s || candidate.entryBar >= count) {
        break;
      }

      open = candidate;
      next++;
    }

    if (open && open.exitIndex === s) {
      realized += open.net;
      open = undefined;
    }

    if (!open) {
      const candidate = ordered[next];

      if (candidate && candidate.entryIndex === s) {
        open = candidate;
        next++;
      }
    }

    const unrealized = open ? ledger.mark(open, bySymbol.get(open.symbol)!.sClose[s]!, sTime[s]!) : 0;

    tracker.updateStrict(realized + unrealized, closeTimes[s]!);
  }

  return tracker.maximum;
};

interface Scored {
  key: string;
  label: string;
  kind: 'pick' | 'benchmark' | 'control';
  validation: Record<string, number>; // V by cost
  searchMark: number;
  minuteDrawdownValidation?: number;
  minuteDrawdownWhole?: number;
  lotsValidation?: number;
}

export const runValidation = async (args: string[]) => {
  await requireProtocolFrozen();

  const fold = foldOf(args);
  const file = foldDir(fold, 'validation.json');

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the validation of ${fold} runs once`);
  }

  const picks = await readSealed(picksFile(fold));
  const { tier, workers } = await readTier();
  const universe = await eligibleSymbols();
  const loaded = await validationUniverse(fold, universe);
  const evaluator = await RobustEvaluator.create(loaded, fold, workers);
  const window = study.windows[fold];
  const splitIndex = loaded.universe.dates.filter((date) => date <= window.searchEnd).length - 1;
  const benchmarks = await searchBenchmarkBooks();
  const pickRows: { label: string; books: Book[]; role: string }[] = [];

  for (const arm of ['J', 'Q'] as const) {
    const pick = picks[arm] as {
      primary: { key: string; books: never[] } | null;
      alternates: { key: string; role: string; books: never[] }[];
    };

    if (pick.primary) {
      pickRows.push({ label: `${arm} primary`, books: booksOfPick(pick.primary.books), role: `${arm}-primary` });
    }

    for (const alternate of pick.alternates) {
      pickRows.push({
        label: `${arm} ${alternate.role}`,
        books: booksOfPick(alternate.books),
        role: `${arm}-${alternate.role}`
      });
    }
  }

  const controls = pilotConfigs(universe, tier.pilotPerStratum);
  const pilotFreeze = await readSealed(pilotDir(fold, 'pilot_freeze.json'));
  const controlsText = await fs.readFile(pilotDir(fold, 'controls.jsonl'), 'utf8');

  if (sha256(controlsText) !== pilotFreeze.controlsSha256) {
    throw new Error(`${pilotDir(fold, 'controls.jsonl')} does not hash to the pilot freeze`);
  }

  const pilotRecords = controlsText
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { key: string; label: string; eligible: boolean });
  const eligibleKeys = new Set(
    pilotRecords.filter((record) => record.eligible && record.label.startsWith('control')).map((record) => record.key)
  );
  const all: { label: string; key: string; kind: Scored['kind']; books: Book[] }[] = [
    ...pickRows.map((row) => ({ label: row.label, key: keyOf(row.books), kind: 'pick' as const, books: row.books })),
    ...(['B1', 'B4', 'B5'] as const).map((key) => ({
      label: key,
      key: keyOf(benchmarks[key]),
      kind: 'benchmark' as const,
      books: benchmarks[key]
    })),
    ...controls.map((config) => ({
      label: `control ${config.stratum}/${config.index}`,
      key: config.key,
      kind: 'control' as const,
      books: config.books
    }))
  ];
  const scored: Scored[] = all.map((row) => ({
    key: row.key,
    label: row.label,
    kind: row.kind,
    validation: {},
    searchMark: NaN
  }));

  for (const costBps of study.costsBps) {
    const centres = await evaluator.centres(
      all.map((row) => canonicalBooks(row.books)),
      costBps,
      { markIndices: [splitIndex] }
    );

    centres.forEach((centre, index) => {
      scored[index]!.validation[costBps] = centre.net - centre.markAt![0]!;

      if (costBps === study.principalCostBps) {
        scored[index]!.searchMark = centre.markAt![0]!;
      }
    });
  }

  // Validation drawdowns (peak reset at the search end), self-checked against the replay's whole-run figure.
  const selfChecks: { label: string; equal: boolean }[] = [];

  all.forEach((row, index) => {
    if (row.kind === 'control' && !eligibleKeys.has(row.key)) {
      return;
    }

    const detail = evaluator.replayDetail(row.books, study.principalCostBps);
    const lots = detail.full!.lots as unknown as RealLot[];
    const whole = windowedMinuteDrawdown(
      lots,
      detail.books,
      detail.marks,
      evaluator.window.startIndex,
      evaluator.window.endIndex,
      study.principalCostBps
    );

    selfChecks.push({ label: row.label, equal: whole === detail.minuteDrawdown.maximum });
    scored[index]!.minuteDrawdownWhole = detail.minuteDrawdown.maximum;
    scored[index]!.minuteDrawdownValidation = windowedMinuteDrawdown(
      lots,
      detail.books,
      detail.marks,
      splitIndex,
      evaluator.window.endIndex,
      study.principalCostBps
    );
    scored[index]!.lotsValidation = detail.lots.filter((lot) => lot.entryIndex > splitIndex).length;
  });

  if (!selfChecks.every((check) => check.equal)) {
    throw new Error(
      `The windowed drawdown differs from the replay on ${selfChecks
        .filter((check) => !check.equal)
        .map((check) => check.label)
        .join(', ')}`
    );
  }

  // Isolated flat-start runs (books arming at the validation start; the history before it as warm-up).
  const isolated: Record<string, { net: number; minuteDrawdown: number; lots: number }> = {};
  const flat: TraceWindow = { ...evaluator.window, armStart: splitIndex + 1, startIndex: splitIndex };

  for (const row of all.filter((item) => item.kind !== 'control')) {
    const canonical = canonicalBooks(row.books);
    const replayBooks = canonical.map((book) => ({
      symbol: book.symbol,
      ds: evaluator.ds(book.symbol),
      trace: buildTrace(evaluator.ds(book.symbol), book, study.principalCostBps, flat)
    }));
    const result = replayOf(replayBooks, study.principalCostBps, flat);

    isolated[row.label] = { net: result.net, minuteDrawdown: result.minuteDrawdown.maximum, lots: result.lots.length };
  }

  // Portfolio at 5 bps (both conventions): the validation return on own base.
  const portfolio: Record<
    string,
    Record<string, { searchEquity: number; validationEquity: number; validationReturn: number; dailyPercent: number }>
  > = {};

  for (const row of all.filter((item) => item.kind !== 'control')) {
    portfolio[row.label] = {};

    for (const lotDividends of [false, true]) {
      const run = runEngine(loaded.universe, {
        ...portfolioSpec(evaluator, canonicalBooks(row.books), row.label),
        lotDividends
      });
      const at = (index: number) => run.daily.find((day) => day.index === index)!.equity;

      portfolio[row.label]![lotDividends ? 'frozen' : 'symmetric'] = {
        searchEquity: at(splitIndex),
        validationEquity: at(evaluator.window.endIndex),
        validationReturn: at(evaluator.window.endIndex) / at(splitIndex) - 1,
        dailyPercent: run.dailyPercentDrawdown?.maximumPercent ?? NaN
      };
    }
  }

  // The picks' validation-window neighbourhoods (descriptive).
  const neighbourhoods: Record<string, ReturnType<typeof summarize>> = {};

  for (const row of all.filter((item) => item.kind === 'pick')) {
    const [records] = await evaluator.neighbourRecords([canonicalBooks(row.books)], {
      stage: 'validation',
      cls: 'N1',
      n: study.assessment.validationDraws,
      costBps: study.principalCostBps,
      markIndices: [splitIndex]
    });
    const validationNets = records!.map((record) => ({ ...record, net: record.net - record.markAt![0]! }));
    const row5 = scored.find((item) => item.label === row.label)!;

    neighbourhoods[row.label] = summarize(row5.validation[study.principalCostBps]!, validationNets);
  }

  const controlV = scored
    .filter((row) => row.kind === 'control' && eligibleKeys.has(row.key))
    .map((row) => row.validation[study.principalCostBps]!);
  const percentileOf = (value: number) =>
    controlV.filter((other) => other < value).length / Math.max(1, controlV.length);
  const record = await writeSealed(file, {
    fold,
    generatedAt: nowIso(),
    provenance: await provenance(),
    picksHash: picks.bodyHash,
    door: doorRecordOf('validationUniverse', loaded, fold),
    splitIndex,
    searchEnd: window.searchEnd,
    validationEnd: window.validationEnd,
    controls: {
      eligible: controlV.length,
      p25: quantile(controlV, study.gates.lowerControlQuantile),
      p50: quantile(controlV, 0.5),
      p75: quantile(controlV, study.gates.upperControlQuantile)
    },
    rows: scored.map((row) => ({
      ...row,
      controlPercentile: row.kind === 'control' ? undefined : percentileOf(row.validation[study.principalCostBps]!)
    })),
    isolated,
    portfolio,
    neighbourhoods,
    selfChecks: { compared: selfChecks.length, equal: selfChecks.every((check) => check.equal) }
  });

  await evaluator.close();
  log(`${fold}: validation written (${record.bodyHash.slice(0, 12)})`);

  return record;
};

export const runGwf = async () => {
  await requireProtocolFrozen();

  if (await fs.pathExists(gwfFile)) {
    throw new Error(`${gwfFile} exists: G-WF is decided once`);
  }

  const folds = {} as Record<
    FoldKey,
    {
      J?: { v: number; dd: number };
      Q?: { v: number; dd: number };
      p25: number;
      p75: number;
      eligible: number;
      comparator: boolean;
    }
  >;

  for (const fold of ['fold-a', 'fold-b'] as const) {
    const validation = (await readSealed(foldDir(fold, 'validation.json'))) as unknown as {
      controls: { p25: number | null; p75: number | null; eligible: number };
      rows: Scored[];
    };
    const row = (label: string) => validation.rows.find((item) => item.label === label);
    const j = row('J primary');
    const q = row('Q primary');

    folds[fold] = {
      ...(j ? { J: { v: j.validation[study.principalCostBps]!, dd: j.minuteDrawdownValidation! } } : {}),
      ...(q ? { Q: { v: q.validation[study.principalCostBps]!, dd: q.minuteDrawdownValidation! } } : {}),
      p25: validation.controls.p25 ?? NaN,
      p75: validation.controls.p75 ?? NaN,
      eligible: validation.controls.eligible,
      // A fold without a valid control comparator (fewer than the minimum eligible controls, or a non-finite
      // quantile) cannot pass: no percentile comparison exists (§13.4).
      comparator:
        validation.controls.eligible >= study.riskPenalty.minimumControls &&
        Number.isFinite(validation.controls.p25 ?? NaN) &&
        Number.isFinite(validation.controls.p75 ?? NaN)
    };
  }

  const values = Object.values(folds);
  const clauses = {
    i: values.some((fold) => fold.comparator && fold.J !== undefined && fold.J.v >= fold.p75 && fold.J.v > 0),
    ii: values.every((fold) => fold.comparator && fold.J !== undefined && fold.J.v > fold.p25),
    iii: values.every((fold) => fold.J !== undefined && fold.J.dd <= study.gates.validationDrawdown)
  };
  const passed = clauses.i && clauses.ii && clauses.iii;
  const record = await writeSealed(gwfFile, {
    decidedAt: nowIso(),
    provenance: await provenance(),
    rule: 'PROTOCOL.md §13.4: (i) some fold V(J) ≥ ctl_0.75 and > 0; (ii) no fold V(J) ≤ ctl_0.25 (no pick fails); (iii) no fold J validation minute DD > $45,000',
    folds,
    clauses,
    passed,
    ablation: Object.fromEntries(
      Object.entries(folds).map(([fold, item]) => [
        fold,
        { J: item.J?.v ?? null, Q: item.Q?.v ?? null, jMinusQ: item.J && item.Q ? item.J.v - item.Q.v : null }
      ])
    )
  });

  log(`G-WF: ${passed ? 'PASSED' : 'FAILED'} (${JSON.stringify(clauses)})`);

  return record;
};
