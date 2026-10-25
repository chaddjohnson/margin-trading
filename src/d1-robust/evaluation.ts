// `npm run robust-d1 -- evaluate [--confirm]` (PROTOCOL.md §15.3): the one locked confirmation on the inspected
// 2024-01-02 → 2026-10-13 window, only after FROZEN_SELECTION.json verifies and only when it holds nominees. One
// continuous `all` run per nominee and per benchmark (B1, B4, B5, C0): fixed and 20% portfolio at 0/2/5/10 bps under
// both dividend conventions, B5's ladder, segment attribution (development/holdout/final), bridges against B4/B5,
// the two-largest-lots dependence, omitted-distribution bounds, replay parity on fixed runs; then C1–C4 applied
// mechanically. It can only block. `--confirm` re-runs everything and compares the record digest. Amendment 2: it
// refuses nominees until the §16 nominee dividend diagnostic exists, re-verifies the frozen hashes, requires the
// confirm-b record, and recommends only a primary-eligible nominee.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { sha256FileSync } from '#lib';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { runFrozen } from '../joint-16-etf-d1/controls.ts';
import { bridgeOf, extrasOf, summaryOf } from '../joint-16-etf-d1/figures.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import {
  contextFile,
  frozenSelectionFile,
  hasFlag,
  log,
  nowIso,
  protocolFile,
  readJson,
  stageDir,
  study,
  tierFile,
  universeFile,
  writeJson
} from './context.ts';
import { requireControls } from './controls.ts';
import { evaluationUniverse } from './data.ts';
import { canonicalBooks, runEngine } from './evaluate.ts';
import { RobustEvaluator } from './evaluator.ts';
import { readSealed, requireProtocolFrozen } from './freeze.ts';
import type { Book } from './neighbourhood.ts';
import { requireParity } from './parity.ts';
import { portfolioSpec } from './promote.ts';
import { booksOfPick } from './round.ts';

const evaluationDir = (...parts: string[]) => stageDir('evaluation', ...parts);

// Set only when the §16 nominee dividend diagnostic exists (it would need its own amendment before any evaluation).
const nomineeDividendDiagnostic: boolean = false;

// Every input the frozen selection recorded must still hash to its record.
const verifyFrozenHashes = (hashes: Record<string, unknown>) => {
  const single: [string, string][] = [
    ['protocol', protocolFile],
    ['context', contextFile],
    ['universe', universeFile],
    ['tier', tierFile],
    ['partitions', 'data/partitions.json'],
    ['splits', 'config/market-events/splits.json'],
    ['ledger', 'config/market-events/distributions.csv']
  ];
  const changed = single.filter(([key, file]) => sha256FileSync(file) !== hashes[key]).map(([, file]) => file);

  for (const [file, sha] of Object.entries(hashes.data as Record<string, string>)) {
    if (sha256FileSync(file) !== sha) {
      changed.push(file);
    }
  }

  if (changed.length > 0) {
    throw new Error(`Changed since the selection freeze: ${changed.join(', ')}`);
  }
};

export const runEvaluation = async (args: string[]) => {
  await requireProtocolFrozen();
  await requireControls();
  await requireParity();

  const manifest = (await readSealed(frozenSelectionFile)) as unknown as {
    bodyHash: string;
    nominees: {
      role: string;
      key: string;
      labels: string[];
      books: { symbol: string; id: string; grid: Book['vector']['grid']; origin: string }[];
    }[];
    lastCommonSession: string;
    hashes: Record<string, unknown>;
  };
  const confirm = hasFlag(args, 'confirm');
  const recordFile = evaluationDir('evaluation.json');

  verifyFrozenHashes(manifest.hashes);

  // M3 before M4: the reporting batch is computed before anything is evaluated after training.
  if (!(await fs.pathExists(stageDir('confirmB', 'confirmB.json')))) {
    throw new Error('confirm-b has not run: the evaluation comes after the reporting batch');
  }

  if (!confirm && (await fs.pathExists(recordFile))) {
    throw new Error(`${recordFile} exists: the evaluation runs once; use --confirm for the deterministic re-run`);
  }

  if (manifest.nominees.length === 0) {
    if (confirm) {
      throw new Error('The frozen selection holds no nominee: there is no evaluation to confirm');
    }

    await writeJson(recordFile, {
      generatedAt: nowIso(),
      manifestHash: manifest.bodyHash,
      outcome: 'no advancement',
      note: 'The frozen selection holds no nominee: nothing is evaluated after training; the benchmarks are retained.'
    });
    log('no nominee: nothing evaluated after training');
    return;
  }

  // §16: nominees need the distribution histories and the fully accounted fixed-pool diagnostic (or per-member bounds
  // with "unresolved" marks) before any C-rule is applied; that diagnostic is not implemented, so evaluate fails closed.
  if (!nomineeDividendDiagnostic) {
    throw new Error(
      'The §16 nominee dividend diagnostic is not implemented: evaluate refuses nominees until it is (amendment 2)'
    );
  }

  const benchmarks = await searchBenchmarkBooks();
  const configurations = [
    ...manifest.nominees.map((nominee) => ({
      key: nominee.role,
      kind: 'nominee',
      books: canonicalBooks(booksOfPick(nominee.books))
    })),
    ...(['B1', 'B4', 'B5'] as const).map((key) => ({ key, kind: 'benchmark', books: canonicalBooks(benchmarks[key]) })),
    { key: 'C0', kind: 'core', books: [] as Book[] }
  ];
  const members = [
    ...new Set(['VOOG', 'VGT', ...configurations.flatMap((item) => item.books.map((book) => book.symbol))])
  ];
  const loaded = await evaluationUniverse(members);

  if (loaded.universe.end !== manifest.lastCommonSession) {
    throw new Error(`The all window ends ${loaded.universe.end}, not the frozen ${manifest.lastCommonSession}`);
  }

  const evaluator = await RobustEvaluator.create(loaded, 'evaluation', 0);
  const summaries: Record<
    string,
    Record<string, ReturnType<typeof summaryOf> & { extras: ReturnType<typeof extrasOf> }>
  > = {};
  const kept = new Map<string, Awaited<ReturnType<typeof runEngine>>>();
  const parity: { key: string; costBps: number; differences: number }[] = [];
  const frozenCheck: { key: string; costBps: number; equal: boolean }[] = [];

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

          // The benchmarks' frozen books reproduce the search-view books in the frozen convention.
          if (configuration.kind === 'benchmark' && (mode === 'fixed' || lotDividends)) {
            const frozen = summaryOf(await runFrozen(loaded, configuration.key as 'B1' | 'B4' | 'B5', mode, costBps));

            frozenCheck.push({
              key: `${configuration.key}-${label}`,
              costBps,
              equal:
                (frozen.net === summaries[configuration.key]![label]!.net &&
                  frozen.endEquity === summaries[configuration.key]![label]!.endEquity) ||
                (Number.isNaN(frozen.endEquity) && frozen.net === summaries[configuration.key]![label]!.net)
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

    log(`${configuration.key}: evaluated`);
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
    const bridgeB5 = bridgeOf(kept.get(`${configuration.key}:fixed-5`)!, kept.get('B5:fixed-5')!);
    const bridgeB4 = bridgeOf(kept.get(`${configuration.key}:fixed-5`)!, kept.get('B4:fixed-5')!);
    const postRows = bridgeB5.rows.filter((row) => row.segment === 'holdout' || row.segment === 'final');
    const topTwo = postRows
      .map((row) => row.contribution)
      .filter((value) => value > 0)
      .sort((a, b) => b - a)
      .slice(0, 2)
      .reduce((total, value) => total + value, 0);

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
      }
    };
  }

  const ladder = [];

  for (const fraction of study.assessment.ladderFractions) {
    const result = runEngine(
      loaded.universe,
      portfolioSpec(evaluator, canonicalBooks(benchmarks.B5), `B5-ladder-${fraction}`, study.principalCostBps, {
        fraction
      })
    );
    const summary = summaryOf(result);

    ladder.push({
      fraction,
      endEquity: summary.endEquity,
      borrowingDollarDays: summary.borrowingDollarDays,
      dailyPercent: summary.dailyPercent
    });
  }

  // §15.4 with §14 and §17: only a primary-eligible nominee (neither capacity-limited nor box-constrained) can be the
  // primary forward-test candidate; replay parity and the frozen-book check must hold.
  const primaryEligible = (role: string) => {
    const labels = manifest.nominees.find((nominee) => nominee.role === role)!.labels;

    return !labels.includes('capacity-limited') && !labels.includes('box-constrained');
  };
  const checksPassed = parity.every((row) => row.differences === 0) && frozenCheck.every((row) => row.equal);
  const recommendation = !checksPassed
    ? 'withheld: replay parity or the frozen-book check failed'
    : (manifest.nominees
        .map((nominee) => nominee.role)
        .find((role) => passing.includes(role) && primaryEligible(role)) ?? 'benchmarks retained');
  const record = {
    manifestHash: manifest.bodyHash,
    window: { first: loaded.universe.dates[0], last: loaded.universe.end, sessions: loaded.universe.sessionCount },
    summaries,
    comparisons,
    ladder,
    passing,
    recommendation,
    parity,
    parityPassed: parity.every((row) => row.differences === 0),
    frozenCheck
  };
  const digest = createHash('sha256').update(JSON.stringify(record)).digest('hex');

  await evaluator.close();

  if (confirm) {
    const original = await readJson<{ digest: string }>(recordFile);

    await writeJson(evaluationDir('confirmation.json'), {
      generatedAt: nowIso(),
      digest,
      originalDigest: original.digest,
      identical: digest === original.digest
    });
    log(`confirmation: ${digest === original.digest ? 'identical' : 'DIFFERENT'}`);
    return;
  }

  await writeJson(recordFile, { generatedAt: nowIso(), digest, ...record });
  log(`evaluation: passing ${passing.join(', ') || 'none'}; recommendation ${recommendation}`);
};
