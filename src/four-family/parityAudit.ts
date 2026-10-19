// The parity audit (PARITY_AUDIT.md's evidence). Runs only on the research view (sessions up to the research
// end), so no holdout price is read; holdout.ts repeats the default-parameter checks on the full range.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import { Rng } from '../optimizer/rng.ts';
import { runAllInComparator } from './allInComparator.ts';
import { type SourceKey, generateCopies, sourceFiles, sourceHashes } from './copies.ts';
import { type Dataset, lastIndexOnOrBefore } from './data.ts';
import type { StopFill } from './engine.ts';
import { type Family, defaultValues, familySpecs, genomeToParams, gridSize, toStrategyParams } from './families.ts';
import {
  type ParityCase,
  type ParityOutcome,
  allFamilies,
  compareSourceRuns,
  fileDefaults,
  runParityCase
} from './parity.ts';
import { runSource } from './sourceRun.ts';

export interface AuditOptions {
  ds: Dataset;
  sessions: MarketSession[]; // the research sessions
  researchEnd: string;
  eligibilityIndex: number;
  goldenVectorsPerFamily: number;
  outDir: string;
  log?: (message: string) => void;
}

export const runParityAudit = async (options: AuditOptions) => {
  const { ds, sessions, researchEnd, eligibilityIndex, outDir } = options;
  const log = options.log ?? (() => {});
  const outcomes: (ParityOutcome & { section: string; durationMs: number })[] = [];
  const copyChecks: { key: SourceKey; stopFill: StopFill; mismatches: string[] }[] = [];
  const copies = await generateCopies();
  const run = async (section: string, parityCase: ParityCase) => {
    const started = Date.now();
    const outcome = await runParityCase(ds, sessions, parityCase);

    outcomes.push({ ...outcome, section, durationMs: Date.now() - started });
    log(`${outcome.ok ? 'PASS' : 'FAIL'} ${section}: ${parityCase.name} (${outcome.trades} trades)`);

    if (!outcome.ok) {
      log(outcome.mismatches.slice(0, 5).join('\n'));
    }
  };

  // A. The unmodified originals at their exact defaults: no X, Y or buffer option passed.
  for (const family of allFamilies) {
    for (const stopFill of ['stop', 'next-open'] as const) {
      await run('A originals at file defaults', {
        name: `${family.key} file defaults, ${stopFill}, through ${researchEnd}`,
        family,
        copy: false,
        endDate: researchEnd,
        stopFill,
        params: fileDefaults(family),
        injectAll: false,
        marginInterestRate: 0.11,
        omitOverrides: true
      });
    }
  }

  // B. The originals with X and Y passed explicitly, at both matched Y values.
  for (const family of allFamilies) {
    for (const y of [30, 40]) {
      await run('B originals at matched Y', {
        name: `${family.key} X=10% Y=${y / 10}%, stop`,
        family,
        copy: false,
        endDate: researchEnd,
        stopFill: 'stop',
        params: fileDefaults(family, y),
        injectAll: false,
        marginInterestRate: 0.11
      });
    }
  }

  // C. The originals on other date ranges (a later first session moves the source's warmup).
  const ranges: { startDate?: string; endDate: string; stopFill: StopFill }[] = [
    { endDate: '2019-12-31', stopFill: 'stop' },
    { startDate: '2018-01-02', endDate: researchEnd, stopFill: 'stop' },
    { startDate: '2020-01-02', endDate: '2021-12-31', stopFill: 'next-open' }
  ];

  for (const family of allFamilies) {
    for (const range of ranges) {
      await run('C originals on other ranges', {
        name: `${family.key} ${range.startDate ?? 'start'}..${range.endDate}, ${range.stopFill}`,
        family,
        copy: false,
        startDate: range.startDate,
        endDate: range.endDate,
        stopFill: range.stopFill,
        params: fileDefaults(family),
        injectAll: false,
        marginInterestRate: 0.11
      });
    }
  }

  // D. Each generated copy, with only the session list injected, equals its original byte for byte.
  for (const key of Object.keys(sourceFiles) as SourceKey[]) {
    for (const stopFill of ['stop', 'next-open'] as const) {
      const original = await runSource({ key, copy: false, endDate: researchEnd, stopFill });
      const copy = await runSource({ key, copy: true, endDate: researchEnd, stopFill, injected: { sessions } });
      const mismatches = compareSourceRuns(original, copy);

      copyChecks.push({ key, stopFill, mismatches });
      log(`${mismatches.length === 0 ? 'PASS' : 'FAIL'} D copy = original: ${key} ${stopFill}`);
    }
  }

  // E. Golden master: the copies at random lattice vectors, margin rates, stop fills, warmups and ranges,
  // plus the lattice corners.
  const rng = Rng.from('four-family', 'golden-master', 'v1');
  const rates = [0.08, 0.11, 0.14];

  for (const family of allFamilies) {
    const specs = familySpecs(family);
    const genomes: number[][] = [
      specs.map(() => 0),
      specs.map((spec) => gridSize(spec) - 1),
      ...Array.from({ length: options.goldenVectorsPerFamily }, () => specs.map((spec) => rng.int(gridSize(spec))))
    ];

    for (const [index, genome] of genomes.entries()) {
      const intParams = genomeToParams(family, genome);
      const params = toStrategyParams(family, intParams);
      const stopFill: StopFill = rng.next() < 0.5 ? 'stop' : 'next-open';
      const marginInterestRate = rates[rng.int(rates.length)]!;
      const commonStart = rng.next() < 0.5;
      const endDate = rng.next() < 0.25 ? '2019-12-31' : researchEnd;

      await run('E golden master (copies)', {
        name: `${family.key} vector ${index + 1} ${JSON.stringify(intParams)} ${stopFill} rate ${marginInterestRate} ${commonStart ? `armStart ${eligibilityIndex}` : 'source warmup'} to ${endDate}`,
        family,
        copy: true,
        endDate,
        stopFill,
        params,
        injectAll: true,
        armStart: commonStart ? eligibilityIndex : undefined,
        marginInterestRate
      });
    }
  }

  // F. The allIn.ts comparator: the copy with nothing but sessions injected equals the original (D), and the
  // shared accounting reproduces its totals (checked inside runAllInComparator), with and without the common
  // eligibility start.
  const allInChecks: { name: string; net: number; minuteDrawdown: number; dailyDrawdown: number; trades: number }[] =
    [];
  const endIndex = lastIndexOnOrBefore(ds, researchEnd);

  for (const armStart of [0, eligibilityIndex]) {
    for (const stopFill of ['stop', 'next-open'] as const) {
      const comparator = await runAllInComparator(ds, sessions, {
        label: 'parity',
        stopFill,
        marginInterestRate: 0.11,
        armStart,
        endIndex,
        segments: [{ label: 'all', start: 1, end: endIndex }]
      });

      allInChecks.push({
        name: `allIn armStart ${armStart} ${stopFill}`,
        net: comparator.metrics.net,
        minuteDrawdown: comparator.metrics.minuteDrawdown,
        dailyDrawdown: comparator.metrics.dailyDrawdown,
        trades: comparator.trades.length
      });
      log(`PASS F allIn accounting: armStart ${armStart} ${stopFill}`);
    }
  }

  const passed = outcomes.every((outcome) => outcome.ok) && copyChecks.every((check) => check.mismatches.length === 0);
  const engineFiles = [
    'src/four-family/engine.ts',
    'src/four-family/accounting.ts',
    'src/four-family/data.ts',
    'src/four-family/copies.ts'
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    codeHashes: Object.fromEntries(
      await Promise.all(
        engineFiles.map(async (file) => [
          file,
          createHash('sha256')
            .update(await fs.readFile(file))
            .digest('hex')
        ])
      )
    ),
    researchEnd,
    sourceHashes: await sourceHashes(),
    copies,
    defaults: defaultValues,
    passed,
    cases: outcomes.length,
    failures: outcomes.filter((outcome) => !outcome.ok).length,
    copyChecks,
    allInChecks,
    outcomes
  };

  await fs.outputFile(path.join(outDir, 'parity.json'), `${JSON.stringify(report, null, 1)}\n`);

  return report;
};

export type { Family };
