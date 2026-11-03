// Validation of a fold (PROTOCOL.md §14.3) and the procedure gate GP (§14.4–§14.5).
//
//   validate --fold <f>   only after the fold's sealed PICKS.json: one continuous fixed-pool run per configuration from
//                         2016-01-04 to the validation end (state carried across the search end) at 0/2/5/10 bps for
//                         the picks, every assessed finalist of the fold (descriptive), B1/B4/B5 (in-sample references)
//                         and the 576 controls; V = mark at the validation end − mark at the search end; validation
//                         minute DD with the peak reset at the search end (self-checked); isolated flat-start runs;
//                         portfolio validation returns; the picks' validation-window neighbourhoods; the persistence
//                         diagnostics. Sealed, once.
//   procedure-gate        GP(J), GP(T) from both folds' sealed picks and validations, with the fold categories and
//                         the predeclared comparison statement. Sealed, once.
import fs from 'fs-extra';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { windowedMinuteDrawdown } from '../d1-robust/walkforward.ts';
import type { RealLot } from '../multi-etf-allocator/ledger.ts';
import { buildTrace, canonicalBooks, keyOf, replayOf, runEngine } from '../d1-robust/evaluate.ts';
import { RobustEvaluator } from '../d1-robust/evaluator.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import { quantile, spearman, summarize } from '../d1-robust/stats.ts';
import type { TraceWindow } from '../portfolio-aware-d1/trace.ts';
import { type FoldKey, log, nowIso, procedureGateFile, stageDir, study } from './context.ts';
import { controlConfigs, readControls } from './controls.ts';
import { doorRecordOf, eligibleSymbols, picksFile, validationUniverse } from './data.ts';
import { provenance, readSealed, requireFrozen, writeSealed } from './freeze.ts';
import { readTier } from './round.ts';

export const validationFile = (fold: FoldKey) => stageDir('walkforward', fold, 'validation.json');

type PickSummary = {
  key: string;
  label: string;
  arm: string;
  members: string[];
  books: { symbol: string; id: string; grid: Book['vector']['grid']; origin: string }[];
  value: number;
};

const booksOf = (summary: Pick<PickSummary, 'books'>): Book[] =>
  summary.books.map((book) => ({ symbol: book.symbol, vector: { id: book.id, grid: book.grid, origin: book.origin } }));

interface Scored {
  key: string;
  label: string;
  kind: 'pick' | 'finalist' | 'benchmark' | 'control';
  role?: string;
  arm?: string;
  validation: Record<string, number>; // V by cost
  searchMark: number;
  minuteDrawdownValidation?: number;
  lotsValidation?: number;
  eligibleControl?: boolean;
}

export const runValidation = async (fold: FoldKey) => {
  await requireFrozen();

  const file = validationFile(fold);

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the validation of ${fold} runs once`);
  }

  const picks = await readSealed(picksFile(fold));
  const { workers, traceCache } = await readTier();
  const universe = await eligibleSymbols();
  const loaded = await validationUniverse(fold, universe);
  const evaluator = await RobustEvaluator.create(loaded, study.neighbourWindowLabel(fold), workers, traceCache);
  const window = study.windows[fold];
  const splitIndex = loaded.universe.dates.filter((date) => date <= window.searchEnd).length - 1;
  const benchmarks = await searchBenchmarkBooks();
  const controlRecords = await readControls(fold);
  const eligibleKeys = new Set(controlRecords.filter((record) => record.eligible).map((record) => record.key));
  const rows: { label: string; key: string; kind: Scored['kind']; role?: string; arm?: string; books: Book[] }[] = [];
  const pickSet = picks.picks as Record<
    'J' | 'T' | 'Q',
    { primary: PickSummary | null; alternates: (PickSummary & { role: string })[] }
  >;

  for (const procedure of ['J', 'T', 'Q'] as const) {
    const item = pickSet[procedure];

    if (item.primary) {
      rows.push({
        label: `${procedure} primary`,
        key: item.primary.key,
        kind: 'pick',
        role: `${procedure}-primary`,
        arm: item.primary.arm,
        books: booksOf(item.primary)
      });
    }

    for (const alternate of item.alternates) {
      rows.push({
        label: `${procedure} ${alternate.role}`,
        key: alternate.key,
        kind: 'pick',
        role: `${procedure}-${alternate.role}`,
        arm: alternate.arm,
        books: booksOf(alternate)
      });
    }
  }

  for (const finalist of picks.finalists as PickSummary[]) {
    rows.push({
      label: `finalist ${finalist.label}`,
      key: finalist.key,
      kind: 'finalist',
      arm: finalist.arm,
      books: booksOf(finalist)
    });
  }

  for (const key of ['B1', 'B4', 'B5'] as const) {
    rows.push({ label: key, key: keyOf(benchmarks[key]), kind: 'benchmark', books: benchmarks[key] });
  }

  for (const config of controlConfigs(universe)) {
    rows.push({
      label: `control ${config.stratum}/${config.index}`,
      key: config.key,
      kind: 'control',
      books: config.books
    });
  }

  const scored: Scored[] = rows.map((row) => ({
    key: row.key,
    label: row.label,
    kind: row.kind,
    ...(row.role ? { role: row.role } : {}),
    ...(row.arm ? { arm: row.arm } : {}),
    validation: {},
    searchMark: NaN,
    ...(row.kind === 'control' ? { eligibleControl: eligibleKeys.has(row.key) } : {})
  }));

  for (const costBps of study.costsBps) {
    const centres = await evaluator.centres(
      rows.map((row) => canonicalBooks(row.books)),
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

  rows.forEach((row, index) => {
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

  // Isolated flat-start runs (secondary diagnostic).
  const isolated: Record<string, { net: number; minuteDrawdown: number; lots: number }> = {};
  const flat: TraceWindow = { ...evaluator.window, armStart: splitIndex + 1, startIndex: splitIndex };

  for (const row of rows.filter((item) => item.kind !== 'control')) {
    const canonical = canonicalBooks(row.books);
    const replayBooks = canonical.map((book) => ({
      symbol: book.symbol,
      ds: evaluator.ds(book.symbol),
      trace: buildTrace(evaluator.ds(book.symbol), book, study.principalCostBps, flat)
    }));
    const result = replayOf(replayBooks, study.principalCostBps, flat);

    isolated[row.label] = { net: result.net, minuteDrawdown: result.minuteDrawdown.maximum, lots: result.lots.length };
  }

  // Portfolio validation returns (picks and benchmarks; both conventions).
  const portfolio: Record<
    string,
    Record<string, { searchEquity: number; validationEquity: number; validationReturn: number; dailyPercent: number }>
  > = {};

  for (const row of rows.filter((item) => item.kind === 'pick' || item.kind === 'benchmark')) {
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

  for (const [index, row] of rows.entries()) {
    if (row.kind !== 'pick') {
      continue;
    }

    const [records] = await evaluator.neighbourRecords([canonicalBooks(row.books)], {
      stage: 'validation',
      cls: 'N1',
      n: study.draws.validation,
      costBps: study.principalCostBps,
      markIndices: [splitIndex]
    });

    neighbourhoods[row.label] = summarize(
      scored[index]!.validation[study.principalCostBps]!,
      records!.map((record) => ({ ...record, net: record.net - record.markAt![0]! }))
    );
  }

  const controlV = scored
    .filter((row) => row.kind === 'control' && row.eligibleControl)
    .map((row) => row.validation[study.principalCostBps]!);
  const percentileOf = (value: number) =>
    controlV.filter((other) => other < value).length / Math.max(1, controlV.length);
  // Descriptive only (never GP): the percentile among eligible controls with comparable validation activity (funded
  // lots within ½× to 2× of the row's), NaN with fewer than 10 such controls.
  const eligibleRows = scored.filter((row) => row.kind === 'control' && row.eligibleControl);
  const matchedPercentileOf = (row: Scored) => {
    const lots = row.lotsValidation ?? 0;
    const matched = eligibleRows
      .filter((control) => {
        const other = control.lotsValidation ?? 0;

        return lots === 0 ? other <= 1 : other >= lots / 2 && other <= 2 * lots;
      })
      .map((control) => control.validation[study.principalCostBps]!);
    const value = row.validation[study.principalCostBps]!;

    return matched.length >= 10
      ? { percentile: matched.filter((other) => other < value).length / matched.length, controls: matched.length }
      : { percentile: NaN, controls: matched.length };
  };

  // Persistence diagnostics (descriptive): eligible controls' search-window statistics against V; each fold arm's
  // assessed finalists' score rank against V.
  const vOfKey = new Map(scored.map((row) => [`${row.kind}|${row.key}`, row.validation[study.principalCostBps]!]));
  const eligibleControls = controlRecords.filter((record) => record.eligible);
  const controlTarget = eligibleControls.map((record) => vOfKey.get(`control|${record.key}`)!);
  const persistence = {
    controls: eligibleControls.length,
    centreNet: spearman(
      eligibleControls.map((record) => record.centre[study.principalCostBps]!.net),
      controlTarget
    ),
    j0: spearman(
      eligibleControls.map((record) => record.j0),
      controlTarget
    ),
    t0: spearman(
      eligibleControls.map((record) => record.t0),
      controlTarget
    ),
    finalistsByArm: Object.fromEntries(
      ['J-u', 'T-u', 'Q-u'].map((arm) => {
        const finalists = (picks.finalists as PickSummary[]).filter((item) => item.arm === arm);

        return [
          arm,
          {
            n: finalists.length,
            spearman: spearman(
              finalists.map((item) => item.value),
              finalists.map((item) => vOfKey.get(`finalist|${item.key}`)!)
            )
          }
        ];
      })
    )
  };

  const record = await writeSealed(file, {
    fold,
    generatedAt: nowIso(),
    evidence:
      'E2 — reused historical walk-forward diagnostic (these validation dates were inspected by earlier studies)',
    provenance: await provenance(),
    picksHash: picks.bodyHash,
    door: doorRecordOf('validationUniverse', loaded, fold),
    splitIndex,
    searchEnd: window.searchEnd,
    validationEnd: window.validationEnd,
    controls: {
      eligible: controlV.length,
      p25: quantile(controlV, 0.25),
      p50: quantile(controlV, study.procedureGate.medianQuantile),
      p75: quantile(controlV, study.procedureGate.upperQuantile)
    },
    rows: scored.map((row) => ({
      ...row,
      controlPercentile: row.kind === 'control' ? undefined : percentileOf(row.validation[study.principalCostBps]!),
      ...(row.kind === 'control' ? {} : { activityMatched: matchedPercentileOf(row) })
    })),
    isolated,
    portfolio,
    neighbourhoods,
    persistence,
    selfChecks: { compared: selfChecks.length, equal: selfChecks.every((check) => check.equal) }
  });

  await evaluator.close();
  log(`${fold}: validation sealed ${record.bodyHash.slice(0, 12)}`);

  return record;
};

// ----- the procedure gate -----

export const runProcedureGate = async () => {
  await requireFrozen();

  if (await fs.pathExists(procedureGateFile)) {
    throw new Error(`${procedureGateFile} exists: GP is decided once`);
  }

  const folds = ['fold-a', 'fold-b'] as const;
  const records = Object.fromEntries(
    await Promise.all(
      folds.map(async (fold) => {
        const picks = await readSealed(picksFile(fold));
        const validation = await readSealed(validationFile(fold));

        if (validation.picksHash !== picks.bodyHash) {
          throw new Error(`${fold}: the validation does not belong to the sealed picks`);
        }

        return [fold, { picks, validation }] as const;
      })
    )
  );
  const gp = {} as Record<'J' | 'T', unknown>;
  const passes = {} as Record<'J' | 'T', boolean>;
  const percentiles = {} as Record<'J' | 'T', Record<string, number>>;

  for (const procedure of ['J', 'T'] as const) {
    const perFold: Record<string, Record<string, unknown>> = {};
    let pass = true;
    let upper = false;

    percentiles[procedure] = {};

    for (const fold of folds) {
      const { picks, validation } = records[fold]!;
      const item = (picks.picks as Record<string, { category: string; reason: string; primary: PickSummary | null }>)[
        procedure
      ]!;
      const controls = validation.controls as { eligible: number; p50: number; p75: number };
      const comparator =
        controls.eligible >= study.procedureGate.minimumControls &&
        Number.isFinite(controls.p50) &&
        Number.isFinite(controls.p75);
      const row = (validation.rows as (Scored & { controlPercentile?: number })[]).find(
        (candidate) => candidate.kind === 'pick' && candidate.role === `${procedure}-primary`
      );
      const v = row?.validation[study.principalCostBps];
      const dd = row?.minuteDrawdownValidation;
      const clauses = {
        category: item.category,
        comparator,
        aboveMedian: item.category === 'c' && comparator && v !== undefined && v > controls.p50,
        upperQuartileAndPositive: item.category === 'c' && comparator && v !== undefined && v >= controls.p75 && v > 0,
        drawdownWithin: item.category === 'c' && dd !== undefined && dd <= study.procedureGate.validationDrawdown
      };

      perFold[fold] = {
        ...clauses,
        reason: item.reason,
        primary: item.primary?.label ?? null,
        members: item.primary?.members ?? [],
        V: v ?? null,
        percentile: row?.controlPercentile ?? null,
        validationDrawdown: dd ?? null,
        controls
      };
      percentiles[procedure]![fold] = row?.controlPercentile ?? NaN;
      pass = pass && clauses.category === 'c' && clauses.comparator && clauses.aboveMedian && clauses.drawdownWithin;
      upper = upper || clauses.upperQuartileAndPositive;
    }

    passes[procedure] = pass && upper;
    gp[procedure] = { pass: passes[procedure], folds: perFold, clauseSomeUpperQuartile: upper };
  }

  const tBetter =
    (passes.T && !passes.J) ||
    (passes.T && passes.J && folds.every((fold) => percentiles.T![fold]! > percentiles.J![fold]!));
  const record = await writeSealed(procedureGateFile, {
    decidedAt: nowIso(),
    evidence: 'E2 — reused historical walk-forward diagnostic',
    provenance: await provenance(),
    hashes: Object.fromEntries(
      folds.flatMap((fold) => [
        [`${fold}-picks`, records[fold]!.picks.bodyHash],
        [`${fold}-validation`, records[fold]!.validation.bodyHash]
      ])
    ),
    gp,
    nullPassProbability: {
      perProcedure: study.procedureGate.nullPassProbability,
      atLeastOneOfTwo: 1 - (1 - study.procedureGate.nullPassProbability) ** 2
    },
    nominatingProcedure: passes.T ? 'T' : passes.J ? 'J' : null,
    comparison: tBetter
      ? 'T persisted better than J (predeclared rule)'
      : 'the folds do not distinguish T from J (predeclared rule)',
    q: Object.fromEntries(folds.map((fold) => [fold, (records[fold]!.picks.picks as Record<string, unknown>).Q]))
  });

  log(
    `procedure gate: J ${passes.J ? 'PASS' : 'fail'}, T ${passes.T ? 'PASS' : 'fail'} → ${String(record.nominatingProcedure ?? 'no procedure may nominate')}`
  );

  return record;
};
