// The frozen holdout (PROTOCOL.md section 9): runs once, after the freeze, on 2024-01-02 → 2025-10-13.
// - Refuses to run without results/fits/final/freeze.json, if its hash doesn't verify, or if the frozen
//   data, source files or decision code have changed since the freeze.
// - Refuses a second attempt unless --rerun-reason is given; every attempt is recorded.
// - Takes the one capability that can build the full dataset, then first repeats parity section A (the four
//   unmodified files at their defaults, both stop fills) on the full file; any mismatch aborts.
// - Evaluates the 40 frozen picks, the family defaults (own Y, Y 3%, Y 4%) and allIn.ts: one continuous run
//   from 2016-09-20 (holdout, development, combined, per-year and April 2025 segments) under both stop fills at
//   8%, 11% and 14%, and a flat start on 2024-01-02 under both stop fills at 11%. Nothing is re-selected.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import type { Segment } from './accounting.ts';
import { runAllInComparator } from './allInComparator.ts';
import { sourceHashes } from './copies.ts';
import { monthSegment, protocol, readJson, resultsRoot, writeJson, yearSegments } from './context.ts';
import {
  ReferenceHighCache,
  firstIndexOnOrAfter,
  issueUnlockCapability,
  lastIndexOnOrBefore,
  loadSessions,
  sha256File,
  unlockedDataset
} from './data.ts';
import type { StopFill } from './engine.ts';
import { type EvalSpec, type Metrics, evaluateCandidate } from './evaluate.ts';
import { families } from './families.ts';
import { allFamilies, fileDefaults, runParityCase } from './parity.ts';
import { LocalEvaluator } from './pool.ts';
import type { Pick } from './selection.ts';
import {
  type Contender,
  type StudyOptions,
  baselineContenders,
  familyList,
  freezeFile,
  pickContenders,
  writeDetail
} from './study.ts';

const unlock = issueUnlockCapability();

export const holdoutDir = path.join(resultsRoot, 'holdout');

// Files whose change after the freeze would change a decision or a figure.
const decisionFiles = [
  'src/four-family/engine.ts',
  'src/four-family/accounting.ts',
  'src/four-family/data.ts',
  'src/four-family/evaluate.ts',
  'src/four-family/families.ts',
  'src/four-family/context.ts',
  'src/four-family/copies.ts',
  'src/four-family/allInComparator.ts',
  'src/four-family/holdout.ts',
  'src/lib/csv.ts',
  'src/lib/session.ts'
];

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

const hashFile = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

interface Freeze {
  freezeHash: string;
  frozenAt: string;
  dataHash: string;
  sourceHashes: Record<string, string>;
  codeHashes: Record<string, string>;
  picks: Record<string, Pick[]>;
  [key: string]: unknown;
}

const verifyFreeze = async () => {
  if (!(await fs.pathExists(freezeFile))) {
    throw new Error('No freeze: run `npm run four-family -- freeze` first');
  }

  const freeze = await readJson<Freeze>(freezeFile);
  const { freezeHash, ...body } = freeze;
  const recomputed = createHash('sha256').update(JSON.stringify(body)).digest('hex');

  if (recomputed !== freezeHash) {
    throw new Error(`The freeze hash does not verify (${recomputed} vs ${freezeHash})`);
  }

  if ((await sha256File(protocol.dataFile)) !== freeze.dataHash) {
    throw new Error('The data file changed after the freeze');
  }

  const sources = await sourceHashes();

  for (const [key, hash] of Object.entries(freeze.sourceHashes)) {
    if (sources[key as keyof typeof sources] !== hash) {
      throw new Error(`Strategy file ${key} changed after the freeze`);
    }
  }

  for (const file of decisionFiles) {
    if (freeze.codeHashes[file] !== (await hashFile(file))) {
      throw new Error(`${file} changed after the freeze (or wasn't frozen)`);
    }
  }

  return freeze;
};

export const runHoldout = async (args: string[], options: StudyOptions) => {
  const { log } = options;
  const freeze = await verifyFreeze();
  const attemptsFile = path.join(holdoutDir, 'attempts.json');
  const attempts = (await fs.pathExists(attemptsFile)) ? await readJson<Record<string, unknown>[]>(attemptsFile) : [];
  const rerunReason = option(args, 'rerun-reason');

  if (attempts.length > 0 && !rerunReason) {
    throw new Error(`The holdout already ran ${attempts.length} time(s); a rerun needs --rerun-reason "<why>"`);
  }

  const attempt = {
    attempt: attempts.length + 1,
    startedAt: new Date().toISOString(),
    freezeHash: freeze.freezeHash,
    frozenAt: freeze.frozenAt,
    rerunReason: rerunReason ?? null
  };

  await writeJson(attemptsFile, [...attempts, attempt]);
  log(`Holdout attempt ${attempt.attempt} on freeze ${freeze.freezeHash}`);

  const sessions = await loadSessions(protocol.dataFile);
  const ds = unlockedDataset(sessions, freeze.dataHash, unlock);
  const lastDate = ds.lastDate;

  // Parity section A on the full file.
  const parity = [];

  for (const family of allFamilies) {
    for (const stopFill of ['stop', 'next-open'] as const) {
      const outcome = await runParityCase(ds, sessions, {
        name: `${family.key} file defaults, ${stopFill}, full file`,
        family,
        copy: false,
        endDate: lastDate,
        stopFill,
        params: fileDefaults(family),
        injectAll: false,
        marginInterestRate: 0.11,
        omitOverrides: true
      });

      parity.push(outcome);
      log(`${outcome.ok ? 'PASS' : 'FAIL'} full-file parity ${outcome.name}`);
    }
  }

  if (!parity.every((outcome) => outcome.ok)) {
    await writeJson(path.join(holdoutDir, 'parity-failure.json'), parity);
    throw new Error('Full-file parity failed; no holdout result is reported');
  }

  const eligibility = protocol.eligibilityIndex;
  const endIndex = ds.sessionCount - 1;
  const holdoutStart = firstIndexOnOrAfter(ds, protocol.holdout.start);
  const researchEndIndex = lastIndexOnOrBefore(ds, protocol.researchEnd);
  const april = monthSegment(ds, '2025-04');
  const continuousSegments: Segment[] = [
    { label: 'holdout', start: holdoutStart, end: endIndex },
    { label: 'development', start: eligibility, end: researchEndIndex },
    { label: 'combined', start: eligibility, end: endIndex },
    ...yearSegments(ds, eligibility, endIndex),
    ...(april ? [april] : [])
  ];
  const continuous = (fill: StopFill, rate: number): EvalSpec => ({
    label: `holdout-continuous-${fill}-${rate}`,
    stopFill: fill,
    marginInterestRate: rate,
    armStart: eligibility,
    endIndex,
    segments: continuousSegments
  });
  const flat = (fill: StopFill, rate: number): EvalSpec => ({
    label: `holdout-flat-${fill}-${rate}`,
    stopFill: fill,
    marginInterestRate: rate,
    armStart: holdoutStart,
    endIndex,
    segments: [{ label: 'holdout', start: holdoutStart, end: endIndex }, ...(april ? [april] : [])]
  });
  const specs: Record<string, EvalSpec> = {};

  for (const fill of ['stop', 'next-open'] as const) {
    for (const rate of [protocol.marginInterestRate, ...protocol.sensitivityRates]) {
      specs[`continuous-${fill}-${rate}`] = continuous(fill, rate);
    }

    specs[`flat-${fill}-${protocol.marginInterestRate}`] = flat(fill, protocol.marginInterestRate);
  }

  const evaluator = new LocalEvaluator();
  const highs = new ReferenceHighCache(ds);

  evaluator.register(ds);

  const output: Record<string, unknown> = {
    attempt: attempt.attempt,
    freezeHash: freeze.freezeHash,
    dataLastDate: lastDate,
    holdoutStartDate: ds.dates[holdoutStart],
    specs: Object.fromEntries(
      Object.entries(specs).map(([key, spec]) => [
        key,
        {
          ...spec,
          segments: spec.segments.map((segment) => ({
            ...segment,
            startDate: ds.dates[segment.start],
            endDate: ds.dates[segment.end]
          }))
        }
      ])
    ),
    parity: parity.map(({ name, ok, trades, sourceNet, engineNet, maxProfitDifference, maxMarkDifference }) => ({
      name,
      ok,
      trades,
      sourceNet,
      engineNet,
      maxProfitDifference,
      maxMarkDifference
    })),
    families: {} as Record<string, unknown>,
    allIn: {} as Record<string, Metrics>
  };

  for (const family of familyList) {
    const contenders: Contender[] = [
      ...pickContenders(freeze.picks[family.key] as Pick[]),
      ...baselineContenders(family)
    ];
    const runs: Record<string, unknown> = {};

    for (const [key, spec] of Object.entries(specs)) {
      const metrics = await evaluator.evaluate(
        ds.id,
        family.key,
        spec,
        contenders.map((contender) => contender.params)
      );

      runs[key] = contenders.map((contender, index) => ({ ...contender, metrics: metrics[index]! }));
    }

    (output.families as Record<string, unknown>)[family.key] = runs;

    for (const contender of contenders) {
      const { detail } = evaluateCandidate(
        ds,
        highs,
        family.key,
        contender.params,
        specs[`continuous-stop-${protocol.marginInterestRate}`]!,
        true
      );

      await writeDetail(path.join(resultsRoot, 'traces', 'full', family.key, contender.id), ds, detail!);
    }

    log(`Holdout evaluated for ${families[family.key].name}`);
  }

  for (const [key, spec] of Object.entries(specs)) {
    const comparator = await runAllInComparator(ds, sessions, spec);

    (output.allIn as Record<string, Metrics>)[key] = comparator.metrics;
  }

  await writeJson(path.join(holdoutDir, 'holdout.json'), output);
  await writeJson(attemptsFile, [...attempts, { ...attempt, completedAt: new Date().toISOString() }]);
  log(`Holdout written (attempt ${attempt.attempt})`);
};
