// The selection freeze, the reporting batch and the blocking-only historical check (PROTOCOL.md §15–§16).
//
//   freeze-selection   always (also for no advancement): reads the sealed procedure gate, every round's sealed search
//                      manifest (coverage), the final round's assessments; recomputes the nominations of the
//                      nominating procedure (§15.3) from the assessment records; writes FROZEN_SELECTION.json once.
//   confirm-b          after the freeze (training only): N1 `confirm-B` for every final finalist, nominee, benchmark
//                      and the inspect-only references (R1, R4, the October 25 training finalist). Reported only.
//   evaluate           only if the frozen selection names nominees, once (`--confirm` re-runs and compares): the
//                      continuous `all` runs, C1–C4, bridges and omission bounds. It can only block.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { runFrozen } from '../joint-16-etf-d1/controls.ts';
import { bridgeOf, extrasOf, summaryOf } from '../joint-16-etf-d1/figures.ts';
import { canonicalBooks, keyOf, runEngine } from '../d1-robust/evaluate.ts';
import { RobustEvaluator } from '../d1-robust/evaluator.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import type { Assessment } from './assess.ts';
import {
  type ArmKey,
  type WindowKey,
  armSpecs,
  armsOf,
  frozenSelectionFile,
  log,
  nowIso,
  procedureGateFile,
  readJson,
  seedLabels,
  stageDir,
  study,
  writeJson
} from './context.ts';
import { readCalibration } from './controls.ts';
import { requireCoverage } from './coverage.ts';
import { eligibleSymbols, evaluationUniverse, picksFile, trainingUniverse } from './data.ts';
import { provenance, readSealed, requireFrozen, sha256File, writeSealed } from './freeze.ts';
import { type GateResult, type Procedure, type Ranked, gatesOf, pick, procedureValue, rankRows } from './gates.ts';
import { blocksOfLoaded } from './parity.ts';
import { inspectedReferenceBooks } from './references.ts';
import { readTier, roundDir, searchManifestFile, selectDir, selectionFile } from './round.ts';
import { scoreOfDraws, scoreSetOf, temporalNet } from './scores.ts';
import { bootstrapInterval, medianOf, q25Of } from '../d1-robust/stats.ts';
import { Rng } from '../optimizer/rng.ts';
import { validationFile } from './walkforward.ts';

const booksOf = (books: Assessment['books']): Book[] =>
  books.map((book) => ({ symbol: book.symbol, vector: { id: book.id, grid: book.grid, origin: book.origin } }));

type StoredFinalist = Assessment & { gates: GateResult[]; pass: boolean; value: number };

const readAssessments = async (window: WindowKey, arm: ArmKey) =>
  (await readJson<{ finalists: StoredFinalist[] }>(selectDir(window, arm, 'assessment.json'))).finalists;

// ----- freeze-selection -----

export const runFreezeSelection = async () => {
  await requireFrozen();

  if (await fs.pathExists(frozenSelectionFile)) {
    throw new Error(`${frozenSelectionFile} exists: the selection is frozen once`);
  }

  const gate = await readSealed(procedureGateFile);
  const manifests = Object.fromEntries(
    await Promise.all(
      (['fold-a', 'fold-b', 'final'] as const).map(
        async (window) => [window, await readSealed(searchManifestFile(window))] as const
      )
    )
  );
  const selection = (await readSealed(selectionFile('final'))) as unknown as {
    procedures: Record<Procedure, { wouldNominate: { role: string; key: string }[] }>;
  };
  const universe = await eligibleSymbols();

  // Coverage of every J/T arm of every round (§9.5, §15.4).
  const coverage = Object.entries(manifests).flatMap(([window, manifest]) =>
    Object.entries(manifest.arms as Record<string, { coveragePass: boolean; coverageFailures: number }>)
      .filter(([arm]) => arm !== 'Q-u')
      .map(([arm, item]) => ({
        label: `${window} ${arm}`,
        report: { pass: item.coveragePass, failures: [] as never[] },
        failures: item.coverageFailures
      }))
  );
  let coverageError = '';

  try {
    requireCoverage(coverage.map((item) => ({ label: item.label, report: item.report })));
  } catch (error) {
    coverageError = (error as Error).message;
  }

  const procedure = gate.nominatingProcedure as Procedure | null;
  let outcome: string;
  let nominees: {
    role: string;
    note?: string;
    key: string;
    arm: string;
    members: string[];
    books: Assessment['books'];
    labels: string[];
    value: number;
  }[] = [];
  const recomputed: Record<string, unknown> = {};
  const rankings: Record<string, unknown> = {};
  const finalCalibration = await readCalibration('final');
  let maxScoreDeviation = 0;

  for (const candidate of ['J', 'T'] as const) {
    const rows: Ranked[] = [];

    for (const arm of [`${candidate}-u`, `${candidate}-s`] as ArmKey[]) {
      for (const finalist of await readAssessments('final', arm)) {
        // The gates and the value are recomputed from the stored assessment numbers and must equal the stored ones.
        const gates = gatesOf(finalist, universe, candidate, false);
        const value = procedureValue(finalist, candidate);

        if (
          JSON.stringify(gates.map((gate) => [gate.gate, gate.pass])) !==
            JSON.stringify(finalist.gates.map((gate) => [gate.gate, gate.pass])) ||
          value !== finalist.value
        ) {
          throw new Error(`${finalist.label}: the recomputed gates or score differ from the stored assessment`);
        }

        // The score itself recomputed from the stored confirm-A draws and the sealed calibration (not read back).
        const fromDraws = scoreOfDraws(
          {
            net: Float64Array.from(candidate === 'J' ? finalist.draws.net : finalist.draws.netT),
            drawdown: Float64Array.from(finalist.draws.drawdown)
          },
          finalist.members.length,
          finalCalibration.references
        );

        maxScoreDeviation = Math.max(maxScoreDeviation, Math.abs(fromDraws - value));

        if (Math.abs(fromDraws - value) > 1e-6) {
          throw new Error(
            `${finalist.label}: the score recomputed from its stored draws differs (${fromDraws} vs ${value})`
          );
        }

        rows.push({ assessment: finalist, arm, gates, pass: gates.every((gate) => gate.pass), value });
      }
    }

    const order = rankRows(rows, candidate);
    const picked = pick(order, 'final');

    rankings[candidate] = order.map((row) => ({
      label: row.assessment.label,
      arm: row.arm,
      members: row.assessment.members,
      value: row.value,
      pass: row.pass,
      gates: row.gates.map((gate) => ({ gate: gate.gate, pass: gate.pass, detail: gate.detail })),
      labels: row.assessment.labels
    }));
    const stored = selection.procedures[candidate].wouldNominate.map((item) => `${item.role}:${item.key}`).join(',');

    if (picked.map((item) => `${item.role}:${item.row.assessment.key}`).join(',') !== stored) {
      throw new Error(`The recomputed ${candidate} nominations differ from the stored selection candidates`);
    }

    recomputed[candidate] = picked.map((item) => ({ role: item.role, key: item.row.assessment.key }));

    if (candidate === procedure) {
      nominees = picked.map((item) => ({
        role: item.role,
        ...(item.note ? { note: item.note } : {}),
        key: item.row.assessment.key,
        arm: item.row.arm,
        members: item.row.assessment.members,
        books: item.row.assessment.books,
        labels: item.row.assessment.labels,
        value: item.row.value
      }));
    }
  }

  if (!procedure) {
    outcome = 'no advancement — neither procedure passed its preregistered procedure gate GP (§14.5)';
    nominees = [];
  } else if (coverageError) {
    outcome = `no advancement — a coverage contract failed (${coverageError})`;
    nominees = [];
  } else if (nominees.length === 0) {
    outcome = `no advancement — procedure ${procedure} passed GP but none of its final finalists passed G1–G8`;
  } else {
    outcome = `nominees from procedure ${procedure}`;
  }

  const hashOfFile = async (file: string) => ((await fs.pathExists(file)) ? await sha256File(file) : 'missing');
  const records: Record<string, string> = {};

  for (const window of ['fold-a', 'fold-b', 'final'] as WindowKey[]) {
    records[`${window}/calibration`] = (await readCalibration(window)).bodyHash;
    records[`${window}/search`] = (manifests[window] as { bodyHash: string }).bodyHash;

    for (const arm of armsOf(window)) {
      records[`${window}/${arm}/search.json`] = await hashOfFile(roundDir(window, arm, 'search.json'));

      for (const name of ['promotion.json', 'assessment.json']) {
        records[`${window}/${arm}/${name}`] = await hashOfFile(selectDir(window, arm, name));
      }

      const armDir = selectDir(window, arm);

      for (const name of (await fs.pathExists(armDir))
        ? (await fs.readdir(armDir)).filter((item) => item.startsWith('refine-')).sort()
        : []) {
        records[`${window}/${arm}/${name}`] = await hashOfFile(selectDir(window, arm, name));
      }
    }

    records[`${window}/benchmarks.json`] = await hashOfFile(selectDir(window, 'benchmarks.json'));
  }

  for (const fold of ['fold-a', 'fold-b'] as const) {
    records[`${fold}/PICKS`] = (await readSealed(picksFile(fold))).bodyHash;
    records[`${fold}/validation`] = (await readSealed(validationFile(fold))).bodyHash;
  }

  records['final/selection.json'] = (selection as unknown as { bodyHash: string }).bodyHash;
  records.PROCEDURE_GATE = gate.bodyHash;

  // one file at a time (whole-file reads; concurrency would hold several GB transiently)
  const dataHashes: Record<string, string> = {};

  for (const symbol of universe) {
    dataHashes[`data/${symbol}/data.csv`] = await sha256File(`data/${symbol}/data.csv`);
  }

  const { tier } = await readTier();
  const parity = await readJson<{ counts: unknown }>(stageDir('parity', 'parity.json'));
  const manifest = await writeSealed(frozenSelectionFile, {
    frozenAt: nowIso(),
    study: study.version,
    outcome,
    nominatingProcedure: procedure,
    nominees,
    nomineeTieOrder: 'alphabetical (the engine default; identity order checked equal in G1)',
    hypotheticalNominations: {
      note: procedure
        ? `only procedure ${procedure}'s list is a nomination; the other procedure's list is hypothetical`
        : 'HYPOTHETICAL — GP failed for both procedures; these lists are NOT nominations and nothing is evaluated after 2023',
      ...recomputed
    },
    rankings,
    scoreRecomputation: {
      from: 'stored confirm-A draws and the sealed final calibration',
      maxDeviation: maxScoreDeviation
    },
    seeds: seedLabels,
    budgets: { tier: tier.key, tierRecord: tier },
    evaluations: Object.fromEntries(
      Object.entries(manifests).map(([window, manifest]) => [
        window,
        Object.fromEntries(
          Object.entries(manifest.arms as Record<string, { entries: number }>).map(([arm, item]) => [arm, item.entries])
        )
      ])
    ),
    paritySignature: parity.counts,
    procedureGate: gate.gp,
    comparison: gate.comparison,
    coverage: coverage.map((item) => ({ label: item.label, pass: item.report.pass, failures: item.failures })),
    records,
    data: dataHashes,
    provenance: await provenance(),
    lastCommonSession: study.lastCommonSession,
    evidence:
      'training figures are E0/E1; fold results E2 (reused historical diagnostics); nothing after 2023 has been read for any configuration of this study',
    authorizedCommands:
      nominees.length > 0
        ? ['confirm-b', 'evaluate', 'evaluate --confirm']
        : ['confirm-b', 'evaluate (writes only the no-advancement record)']
  });

  log(`selection frozen (${manifest.bodyHash.slice(0, 12)}): ${outcome}`);

  return manifest;
};

// ----- confirm-b -----

export const runConfirmB = async () => {
  await requireFrozen();

  const manifest = await readSealed(frozenSelectionFile);
  const file = stageDir('confirmB', 'confirmB.json');

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: confirm-b runs once`);
  }

  const calibration = await readCalibration('final');
  const { tier, workers, traceCache } = await readTier();
  const loaded = await trainingUniverse('final');
  const evaluator = await RobustEvaluator.create(loaded, study.neighbourWindowLabel('final'), workers, traceCache);
  const blocks = blocksOfLoaded(loaded);
  const benchmarks = await searchBenchmarkBooks();
  const references = await inspectedReferenceBooks();
  const configs: { label: string; kind: string; books: Book[]; assessmentA?: Assessment }[] = [];
  const frozenRecords = manifest.records as Record<string, string>;

  // The inputs must be the records the selection freeze bound.
  for (const [record, file] of [
    ...armsOf('final').map(
      (arm) => [`final/${arm}/assessment.json`, selectDir('final', arm, 'assessment.json')] as const
    ),
    ['final/benchmarks.json', selectDir('final', 'benchmarks.json')] as const
  ]) {
    if ((await sha256File(file)) !== frozenRecords[record]) {
      throw new Error(`${file} does not hash to the frozen selection's record`);
    }
  }

  const benchmarkA = (
    await readJson<{ benchmarks: Record<'B1' | 'B4' | 'B5', Assessment> }>(selectDir('final', 'benchmarks.json'))
  ).benchmarks;

  for (const arm of armsOf('final')) {
    for (const finalist of await readAssessments('final', arm)) {
      configs.push({
        label: finalist.label,
        kind: `finalist (${arm})`,
        books: booksOf(finalist.books),
        assessmentA: finalist
      });
    }
  }

  for (const key of ['B1', 'B4', 'B5'] as const) {
    configs.push({ label: key, kind: 'benchmark', books: benchmarks[key], assessmentA: benchmarkA[key] });
  }

  for (const reference of references) {
    configs.push({ label: reference.label, kind: 'inspect-only', books: reference.books });
  }

  const canonical = configs.map((config) => canonicalBooks(config.books));
  const centres = await evaluator.centres(canonical, study.principalCostBps, { markIndices: blocks.markIndices });
  const records = await evaluator.neighbourRecords(canonical, {
    stage: 'confirm-B',
    cls: 'N1',
    n: tier.confirmDraws,
    costBps: study.principalCostBps,
    markIndices: blocks.markIndices
  });
  const rows = configs.map((config, index) => {
    const centre = centres[index]!;
    const set = scoreSetOf(
      centre.net,
      centre.markAt,
      records[index]!,
      canonical[index]!.length,
      calibration.references
    );
    const a = config.assessmentA?.confirmA;
    const nets = records[index]!.map((record) => record.net);
    const netsT = records[index]!.map((record) => temporalNet(record.net, record.markAt));
    const rng = (statistic: string) =>
      Rng.from(study.seedLabel, 'final', 'bootstrap', 'confirm-B', keyOf(canonical[index]!), statistic);
    const p50 = bootstrapInterval(nets, medianOf, rng('p50'));
    const p50T = bootstrapInterval(netsT, medianOf, rng('p50T'));
    const q25 = bootstrapInterval(nets, q25Of, rng('q25'));
    const intervalsA = config.assessmentA?.intervals;
    // §16.2: the A/B disagreement is flagged beyond 2 pooled bootstrap standard errors.
    const flag = (b: number, aValue: number, seB: number, seA: number) =>
      Math.abs(b - aValue) > 2 * Math.sqrt(seB ** 2 + seA ** 2);

    return {
      label: config.label,
      kind: config.kind,
      key: keyOf(canonical[index]!),
      centre: { net: centre.net, minuteDrawdown: centre.minuteDrawdown, lots: centre.lots },
      confirmB: {
        p50: set.nbJ.p50,
        p50Interval: p50,
        q25: set.nbJ.q25,
        q25Interval: q25,
        p50T: set.nbT.p50,
        p50TInterval: p50T,
        sJ: set.j.s,
        sT: set.t.s,
        ddMedian: set.nbJ.ddMedian,
        dd90: set.nbJ.dd90
      },
      ...(a
        ? {
            confirmA: { p50: a.nbJ.p50, p50T: a.nbT.p50, sJ: a.j.s, sT: a.t.s },
            differenceBA: {
              p50: set.nbJ.p50 - a.nbJ.p50,
              p50T: set.nbT.p50 - a.nbT.p50,
              flaggedP50: intervalsA ? flag(set.nbJ.p50, a.nbJ.p50, p50.se, intervalsA.p50.se) : false,
              flaggedP50T: intervalsA ? flag(set.nbT.p50, a.nbT.p50, p50T.se, intervalsA.p50T.se) : false
            }
          }
        : {})
    };
  });

  await evaluator.close();
  await writeJson(file, {
    generatedAt: nowIso(),
    manifestHash: manifest.bodyHash,
    label:
      'reporting batch after the selection freeze — cannot change the selection; R1, R4 and the October 25 finalist are inspect-only references',
    rows
  });
  log(`confirm-b: ${rows.length} configurations`);
};

// ----- evaluate (blocking-only historical check) -----

export const runEvaluate = async (confirm: boolean) => {
  await requireFrozen();

  const manifest = await readSealed(frozenSelectionFile);
  const recordFile = stageDir('evaluation', 'evaluation.json');
  const nominees = manifest.nominees as {
    role: string;
    key: string;
    members: string[];
    books: Assessment['books'];
    labels: string[];
  }[];

  if (!(await fs.pathExists(stageDir('confirmB', 'confirmB.json')))) {
    throw new Error('confirm-b has not run: M3 precedes M4');
  }

  if (nominees.length === 0) {
    if (confirm) {
      throw new Error('There is nothing to confirm: the frozen selection names no nominee');
    }

    if (await fs.pathExists(recordFile)) {
      throw new Error(`${recordFile} exists: evaluate runs once`);
    }

    await writeJson(recordFile, {
      generatedAt: nowIso(),
      manifestHash: manifest.bodyHash,
      outcome: manifest.outcome,
      statement:
        'The frozen selection holds no nominee: nothing is evaluated after training; the benchmarks are retained.'
    });
    log('evaluate: no nominee — no-advancement record only');

    return;
  }

  if (!confirm && (await fs.pathExists(recordFile))) {
    throw new Error(`${recordFile} exists: evaluate runs once (a byte-identical --confirm re-run is allowed)`);
  }

  const benchmarks = await searchBenchmarkBooks();
  const configurations = [
    ...nominees.map((nominee) => ({
      key: nominee.role,
      kind: 'nominee',
      books: canonicalBooks(booksOf(nominee.books))
    })),
    ...(['B1', 'B4', 'B5'] as const).map((key) => ({ key, kind: 'benchmark', books: canonicalBooks(benchmarks[key]) })),
    { key: 'C0', kind: 'core', books: [] as Book[] }
  ];
  const members = [
    ...new Set(['VOOG', 'VGT', ...configurations.flatMap((item) => item.books.map((book) => book.symbol))])
  ];
  const loaded = await evaluationUniverse(members);

  if (loaded.universe.end !== study.lastCommonSession) {
    throw new Error(`The all window ends ${loaded.universe.end}, not ${study.lastCommonSession}`);
  }

  const evaluator = await RobustEvaluator.create(loaded, 'diverse-d1:evaluation', 0);
  const summaries: Record<
    string,
    Record<string, ReturnType<typeof summaryOf> & { extras: ReturnType<typeof extrasOf> }>
  > = {};
  const kept = new Map<string, Awaited<ReturnType<typeof runEngine>>>();
  const parity: { key: string; costBps: number; differences: number }[] = [];
  const frozenCheck: { key: string; equal: boolean }[] = [];

  for (const configuration of configurations) {
    summaries[configuration.key] = {};

    for (const mode of ['fixed', 'portfolio'] as const) {
      if (configuration.kind === 'core' && mode === 'fixed') {
        continue;
      }

      for (const costBps of study.costsBps) {
        for (const lotDividends of mode === 'portfolio' ? [false, true] : [false]) {
          const result = runEngine(loaded.universe, {
            ...portfolioSpec(evaluator, configuration.books, configuration.key, costBps, { lotDividends }),
            mode
          });
          const label = `${mode}-${costBps}${mode === 'portfolio' ? `-${lotDividends ? 'frozen' : 'symmetric'}` : ''}`;

          summaries[configuration.key]![label] = { ...summaryOf(result), extras: extrasOf(result) };

          if (costBps === study.principalCostBps) {
            kept.set(`${configuration.key}:${label}`, result);
          }

          if (configuration.kind === 'benchmark' && (mode === 'fixed' || lotDividends)) {
            const frozen = summaryOf(await runFrozen(loaded, configuration.key as 'B1' | 'B4' | 'B5', mode, costBps));

            frozenCheck.push({
              key: `${configuration.key}-${label}`,
              equal:
                frozen.net === summaries[configuration.key]![label]!.net &&
                (Number.isNaN(frozen.endEquity) || frozen.endEquity === summaries[configuration.key]![label]!.endEquity)
            });
          }
        }

        if (mode === 'fixed' && configuration.books.length > 0) {
          const outcome = replayAgainstFull(
            loaded,
            configuration.books.map((book) => book.symbol),
            evaluator.phenotypes(configuration.books),
            costBps
          );

          parity.push({ key: configuration.key, costBps, differences: outcome.differences.length });
        }
      }
    }
  }

  const segment = (key: string, label: string, name: string) =>
    summaries[key]![label]!.segments.find((row) => row.segment === name)!;
  const post = (key: string, costBps: number) =>
    segment(key, `fixed-${costBps}`, 'holdout').strategyPnl + segment(key, `fixed-${costBps}`, 'final').strategyPnl;
  const comparisons: Record<string, unknown> = {};
  const passing: string[] = [];

  for (const configuration of configurations.filter((item) => item.kind === 'nominee')) {
    const fixed5 = summaries[configuration.key]![`fixed-${study.principalCostBps}`]!;
    const portfolio5 = summaries[configuration.key]![`portfolio-${study.principalCostBps}-symmetric`]!;
    const rules = {
      C1: post(configuration.key, 5) >= 0,
      C2: [5, 10].every(
        (costBps) => post(configuration.key, costBps) - post('B4', costBps) >= study.confirmation.reverseVersusB4
      ),
      C3: fixed5.minuteDrawdown <= study.drawdownCeiling,
      C4: portfolio5.dailyPercent <= study.portfolioDailyCeiling
    };
    const run = kept.get(`${configuration.key}:fixed-5`)!;
    const bridgeB5 = bridgeOf(run, kept.get('B5:fixed-5')!);
    const bridgeB4 = bridgeOf(run, kept.get('B4:fixed-5')!);
    const topTwo = bridgeB5.rows
      .filter((row) => row.segment === 'holdout' || row.segment === 'final')
      .map((row) => row.contribution)
      .filter((value) => value > 0)
      .sort((a, b) => b - a)
      .slice(0, 2)
      .reduce((total, value) => total + value, 0);
    const lastTime = loaded.universe.instruments.VOOG!.ds.sCloseTime[loaded.universe.sessionCount - 1]!;
    const lotDays = Object.fromEntries(
      configuration.books.map((book) => [
        book.symbol,
        run.lots
          .filter((lot) => lot.symbol === book.symbol)
          .reduce(
            (total, lot) =>
              total + Math.max(0, ((lot.exitTime ?? 0) > 0 ? lot.exitTime! : lastTime) - lot.entryTime) / 86400,
            0
          )
      ])
    );
    const bounds = study.dividendBoundYields.map((yieldRate) =>
      Object.values(lotDays).reduce((total, days) => total + (days * study.principal * yieldRate) / 365, 0)
    );

    if (Object.values(rules).every(Boolean)) {
      passing.push(configuration.key);
    }

    comparisons[configuration.key] = {
      rules,
      postTraining: Object.fromEntries(
        study.costsBps.map((costBps) => [
          costBps,
          { own: post(configuration.key, costBps), B4: post('B4', costBps), B5: post('B5', costBps) }
        ])
      ),
      versusB5: {
        postTrainingDelta: post(configuration.key, 5) - post('B5', 5),
        withoutTopTwo: post(configuration.key, 5) - post('B5', 5) - topTwo
      },
      bridges: {
        B5: { bySegment: bridgeB5.bySegment, residual: bridgeB5.residual },
        B4: { bySegment: bridgeB4.bySegment, residual: bridgeB4.residual }
      },
      omittedDistributionBounds: {
        lotDays,
        atYields: study.dividendBoundYields,
        dollars: bounds,
        // a comparison whose sign the 6% bound could reverse is dividend-unresolved (§17)
        dividendUnresolvedC2:
          Math.abs(post(configuration.key, 5) - post('B4', 5) - study.confirmation.reverseVersusB4) < bounds.at(-1)!,
        dividendUnresolvedVersusB5: Math.abs(post(configuration.key, 5) - post('B5', 5)) < bounds.at(-1)!,
        dividendUnresolvedC1: Math.abs(post(configuration.key, 5)) < bounds.at(-1)!
      }
    };
  }

  const primaryEligible = (role: string) => {
    const labels = nominees.find((nominee) => nominee.role === role)!.labels;

    return !labels.includes('capacity-limited') && !labels.includes('box-constrained');
  };
  const checksPassed = parity.every((row) => row.differences === 0) && frozenCheck.every((row) => row.equal);
  const recommendation = !checksPassed
    ? 'withheld: replay parity or the frozen-book check failed'
    : passing.includes('primary') && primaryEligible('primary')
      ? 'primary forward-test candidate (E3: historically consistent on inspected history — not validated)'
      : 'benchmarks retained';
  const record = {
    manifestHash: manifest.bodyHash,
    evidence: 'E3 — blocking-only check on the inspected 2024-01-02 → 2026-10-13 window; not forward evidence',
    window: { first: loaded.universe.dates[0], last: loaded.universe.end, sessions: loaded.universe.sessionCount },
    summaries,
    comparisons,
    passing,
    recommendation,
    parity,
    frozenCheck
  };
  const digest = createHash('sha256').update(JSON.stringify(record)).digest('hex');

  await evaluator.close();

  if (confirm) {
    const original = await readJson<{ digest: string }>(recordFile);

    await writeJson(stageDir('evaluation', 'confirmation.json'), {
      generatedAt: nowIso(),
      digest,
      originalDigest: original.digest,
      identical: digest === original.digest
    });
    log(`confirmation: ${digest === original.digest ? 'identical' : 'DIFFERENT'}`);

    return;
  }

  await writeJson(recordFile, { generatedAt: nowIso(), digest, ...record });
  log(`evaluate: passing ${passing.join(', ') || 'none'}; ${recommendation}`);
};

export const armsOfProcedure = (procedure: Procedure) =>
  (Object.keys(armSpecs) as ArmKey[]).filter((arm) => armSpecs[arm].score === procedure);
