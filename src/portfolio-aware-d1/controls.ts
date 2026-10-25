// The baseline controls (PROTOCOL.md §9), reproduced before any outcome claim:
//
//   1. the old horizon on the frozen protocol path (archived legacy inputs, pinned hashes, frozen engine, through
//      2025-10-13): fixed VGT D1 alone, fixed All-lowDd, portfolio B (VGT D1 alone) and portfolio All-lowDd, against the
//      reference figures, and every CSV the frozen writer produces against the committed artifacts byte for byte;
//   2. the same four on the canonical path (`--dataset all --end 2025-10-13`), result for result against (1);
//   3. the full canonical history (`all`, through the last common session) of fixed and portfolio All-lowDd against
//      the current evaluation artifacts;
//   4. the S0 training figures at 0/2/5/10 bps (fixed and portfolio), the study's baseline.
// None of these runs holds a candidate book.
import path from 'node:path';
import fs from 'fs-extra';
import { combinationOf } from '../multi-etf-allocator/context.ts';
import { loadUniverse } from '../multi-etf-allocator/data.ts';
import { datasetRunConfig, loadDatasetUniverse } from '../multi-etf-allocator/dataset.ts';
import { type RunConfig, type RunResult, runAllocator } from '../multi-etf-allocator/engine.ts';
import { writeRun } from '../multi-etf-allocator/export.ts';
import { scenarioBConfig } from '../multi-etf-allocator/parity.ts';
import { allocatorConfig, fixedVgtConfig } from '../multi-etf-allocator/scenarios.ts';
import { compareValues } from './compare.ts';
import { baselineBooks, formatCents, log, pct, stageDir, study, writeJson } from './context.ts';
import { trainingUniverse } from './data.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { baseNRunConfig, runNAllocator } from './nbook/engine.ts';
import { s0Books } from './phenotypes.ts';

interface Control {
  key: string; // the frozen run key (research/multi-etf-allocator/results/runs/principal/<key>)
  label: string;
  build: () => Promise<RunConfig>;
  reference: {
    net?: number;
    minuteDrawdown?: number;
    endEquity?: number;
    dailyPercent?: number;
    minutePercent?: number;
  };
}

const controls: Control[] = [
  {
    key: 'F-VGT',
    label: 'fixed $100k, VGT D1 alone',
    build: () => fixedVgtConfig(),
    reference: { net: 183043.82, minuteDrawdown: 19330.69 }
  },
  {
    key: 'F-all-lowDd-shadow',
    label: 'fixed $100k, All-lowDd shadow',
    build: () => allocatorConfig('fixed', combinationOf('all-lowDd'), 'shadow'),
    reference: { net: 294675.77, minuteDrawdown: 27968.03 }
  },
  {
    key: 'B',
    label: '$300k portfolio, VGT D1 alone at 20%',
    build: () => scenarioBConfig(),
    reference: { endEquity: 2346272.33, dailyPercent: 0.3273, minutePercent: 0.3517 }
  },
  {
    key: 'C-all-lowDd-shadow',
    label: '$300k portfolio, All-lowDd shadow at 20%',
    build: () => allocatorConfig('portfolio', combinationOf('all-lowDd'), 'shadow'),
    reference: { endEquity: 2891290.87, dailyPercent: 0.3455, minutePercent: 0.3692 }
  }
];

const cents = (value: number) => Math.round(value * 100) / 100;

export const figuresOf = (result: RunResult | ReturnType<typeof runNAllocator>) => {
  const isPortfolio = result.config.mode === 'portfolio';
  const last = result.daily.at(-1)!;

  return {
    lots: result.lots.length,
    virtualTrades: result.trades.length,
    net: result.lots.reduce((total, lot) => total + lot.net, 0),
    strategyMark: last.strategyMark,
    endEquity: isPortfolio ? last.equity : NaN,
    minuteDrawdown: result.minuteDrawdown.maximum,
    dailyDrawdown: result.dailyDrawdown.maximum,
    dailyPercent: result.dailyPercentDrawdown?.maximumPercent ?? NaN,
    dailyPercentPeak: result.dailyPercentDrawdown?.peakTime ?? NaN,
    dailyPercentTrough: result.dailyPercentDrawdown?.troughTime ?? NaN,
    minutePercent: result.minutePercentDrawdown?.maximumPercent ?? NaN,
    interest: result.lots.reduce((total, lot) => total + lot.interest, 0)
  };
};

const checkReference = (control: Control, figures: ReturnType<typeof figuresOf>) => {
  const failures: string[] = [];
  const { reference } = control;

  if (reference.net !== undefined && cents(figures.net) !== reference.net) {
    failures.push(`net ${formatCents(figures.net)} vs ${formatCents(reference.net)}`);
  }

  if (reference.minuteDrawdown !== undefined && cents(figures.minuteDrawdown) !== reference.minuteDrawdown) {
    failures.push(`minute DD ${formatCents(figures.minuteDrawdown)} vs ${formatCents(reference.minuteDrawdown)}`);
  }

  if (reference.endEquity !== undefined && cents(figures.endEquity) !== reference.endEquity) {
    failures.push(`end equity ${formatCents(figures.endEquity)} vs ${formatCents(reference.endEquity)}`);
  }

  if (
    reference.dailyPercent !== undefined &&
    Math.round(figures.dailyPercent * 10000) / 10000 !== reference.dailyPercent
  ) {
    failures.push(`daily % DD ${pct(figures.dailyPercent, 2)} vs ${pct(reference.dailyPercent, 2)}`);
  }

  if (
    reference.minutePercent !== undefined &&
    Math.round(figures.minutePercent * 10000) / 10000 !== reference.minutePercent
  ) {
    failures.push(`minute % DD ${pct(figures.minutePercent, 2)} vs ${pct(reference.minutePercent, 2)}`);
  }

  return failures;
};

// Every CSV the frozen writer produces for a run, against the committed artifact of the same key.
const compareArtifacts = async (key: string, result: RunResult) => {
  const committed = path.join('research/multi-etf-allocator/results/runs/principal', key);
  const scratch = stageDir('controls', 'legacy-runs', key);

  await writeRun(scratch, result);

  const files = (await fs.readdir(scratch)).filter((file) => file.endsWith('.csv')).sort();
  const outcome: { file: string; identical: boolean }[] = [];

  for (const file of files) {
    const ours = await fs.readFile(path.join(scratch, file));
    const theirs = (await fs.pathExists(path.join(committed, file)))
      ? await fs.readFile(path.join(committed, file))
      : undefined;

    outcome.push({ file, identical: theirs !== undefined && ours.equals(theirs) });
  }

  return outcome;
};

export const runControls = async () => {
  await requireProtocolFrozen();

  const record: Record<string, unknown> = { generatedAt: new Date().toISOString() };
  const failures: string[] = [];
  const ignore = new Set(['config', 'universe']);

  // 1. The frozen protocol path.
  const legacy = await loadUniverse({ members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'], end: '2025-10-13' });
  const legacyResults = new Map<string, RunResult>();
  const legacyRows = [];

  for (const control of controls) {
    const result = runAllocator(legacy, await control.build());
    const figures = figuresOf(result);
    const referenceFailures = checkReference(control, figures);
    const artifacts = await compareArtifacts(control.key, result);

    legacyResults.set(control.key, result);
    failures.push(...referenceFailures.map((failure) => `legacy ${control.key}: ${failure}`));
    failures.push(
      ...artifacts
        .filter((row) => !row.identical)
        .map((row) => `legacy ${control.key}: ${row.file} differs from the committed artifact`)
    );
    legacyRows.push({ key: control.key, label: control.label, figures, referenceFailures, artifacts });
    log(`legacy ${control.key}: ${JSON.stringify(figures)}; ${referenceFailures.length} reference failures`);
  }

  record.legacy = legacyRows;

  // 2. The canonical path through 2025-10-13, against (1).
  const canonicalOld = await loadDatasetUniverse({
    members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'],
    partition: 'all',
    warmupSessions: 0,
    mode: 'portfolio',
    endDate: '2025-10-13'
  });
  const canonicalRows = [];

  for (const control of controls) {
    const config = datasetRunConfig(await control.build(), canonicalOld);
    const result = runAllocator(canonicalOld.universe, config);
    const differences = compareValues(legacyResults.get(control.key), result, { ignore, maxDifferences: 10 });

    failures.push(...differences.map((difference) => `canonical-to-2025-10-13 ${control.key}: ${difference}`));
    canonicalRows.push({ key: control.key, figures: figuresOf(result), differencesFromLegacy: differences });
    log(`canonical to 2025-10-13 ${control.key}: ${differences.length} differences from the frozen protocol path`);
  }

  record.canonicalTo20251013 = canonicalRows;

  // 3. The full canonical history against the current evaluation artifacts, and the N-book engine on it.
  const full = await loadDatasetUniverse({
    members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'],
    partition: 'all',
    warmupSessions: 0,
    mode: 'portfolio'
  });
  const fullRows = [];
  const books = await s0Books();

  for (const [mode, evaluationKey] of [
    ['fixed', 'F-all-lowDd-shadow-all'],
    ['portfolio', 'C-all-lowDd-shadow-all']
  ] as const) {
    const config = datasetRunConfig(await allocatorConfig(mode, combinationOf('all-lowDd'), 'shadow'), full);
    const result = runAllocator(full.universe, config);
    const figures = figuresOf(result);
    const summaryFile = path.join('evaluations/multi-etf-allocator/all', evaluationKey, 'summary.json');
    const artifact = (await fs.pathExists(summaryFile))
      ? ((await fs.readJson(summaryFile)) as { summary: { net: number; endEquity: number; fundedLots: number } })
          .summary
      : undefined;
    const n = runNAllocator(
      full.universe as never,
      baseNRunConfig({
        key: `S0-${mode}-all`,
        label: `S0 ${mode} all`,
        mode,
        symbols: [...baselineBooks],
        phenotypes: books,
        eligibilityIndex: config.eligibilityIndex,
        accountingStartIndex: config.accountingStartIndex
      })
    );
    const nDifferences = compareValues(result, n, {
      ignore: new Set([...ignore, 'maintenanceEvents', 'forcedLiquidations']),
      maxDifferences: 10
    });
    const artifactNet = mode === 'fixed' ? artifact?.net : artifact?.endEquity;
    const ours = mode === 'fixed' ? figures.net : figures.endEquity;

    if (artifact === undefined || artifactNet !== ours || artifact.fundedLots !== figures.lots) {
      failures.push(
        `full all ${mode}: ${ours} / ${figures.lots} lots vs the artifact ${artifactNet} / ${artifact?.fundedLots}`
      );
    }

    failures.push(...nDifferences.map((difference) => `full all ${mode} N-book: ${difference}`));
    fullRows.push({
      mode,
      lastSession: full.universe.end,
      figures,
      artifact: artifact ? { file: summaryFile, value: artifactNet, lots: artifact.fundedLots } : null,
      nBookDifferences: nDifferences
    });
    log(`full all ${mode}: ${JSON.stringify(figures)}; N-book differences ${nDifferences.length}`);
  }

  record.fullHistory = fullRows;

  // 4. S0 on training at the four costs, both modes (the study's baseline; the N-book engine).
  const training = await trainingUniverse();
  const trainingRows = [];

  for (const mode of ['fixed', 'portfolio'] as const) {
    for (const costBps of study.costsBps) {
      const result = runNAllocator(
        training.universe,
        baseNRunConfig({
          key: `S0-${mode}-training-${costBps}`,
          label: `S0 ${mode} training ${costBps} bps`,
          mode,
          symbols: [...baselineBooks],
          phenotypes: books,
          costBps,
          eligibilityIndex: training.universe.eligibilityIndex,
          accountingStartIndex: training.warmup
        })
      );

      trainingRows.push({ mode, costBps, figures: figuresOf(result) });
    }
  }

  record.training = trainingRows;
  record.failures = failures;
  record.passed = failures.length === 0;
  await writeJson(stageDir('controls', 'controls.json'), record);
  log(`controls: ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`Controls failed: ${failures.slice(0, 5).join('; ')}`);
  }
};
