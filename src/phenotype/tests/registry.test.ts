// The registries: every src/app/ entry point is classified exactly once; every compatible strategy file derives
// an injectable module (each substitution matching exactly once, ignorable parameters really absent); the
// committed matrix is current; the shipped phenotypes are exactly the frozen research vectors; and planning
// refuses incompatible or conflicting runs before any market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { PhenotypeError, architectureOf } from '../architectures.ts';
import { appliedParametersOf, prepareStrategy, transformSource } from '../injection.ts';
import { matrixMarkdown } from '../matrix.ts';
import { listPhenotypeFiles } from '../phenotypes.ts';
import { planPhenotypeRun } from '../run.ts';
import { compatibleStrategies, executionConstants, incompatibleEntryPoints, strategyFileOf } from '../strategies.ts';

const refusesAsync = async (run: () => Promise<unknown>, pattern: RegExp) =>
  assert.rejects(run, (error: Error) => {
    assert.ok(error instanceof PhenotypeError, `expected a PhenotypeError, got ${error}`);
    assert.match(error.message, pattern);
    return true;
  });

describe('compatibility registry', () => {
  test('every src/app/ entry point is listed exactly once', async () => {
    const scripts = (await fs.readdir('src/app'))
      .filter((name) => name.endsWith('.ts'))
      .map((name) => name.replace(/\.ts$/, ''))
      .sort();
    const listed = [
      ...compatibleStrategies.map((entry) => entry.script),
      ...incompatibleEntryPoints.map((entry) => entry.script)
    ];

    assert.equal(new Set(listed).size, listed.length, 'an entry point is listed twice');
    assert.deepEqual([...listed].sort(), scripts);
  });

  test('every compatible file derives an injectable module, applying or ignoring each parameter', async () => {
    for (const entry of compatibleStrategies) {
      const file = strategyFileOf(entry.script);
      const source = await fs.readFile(file, 'utf8');
      const { copy, injectable, strategyConstants } = transformSource(source, entry, {
        sourceDir: 'src/app',
        targetDir: '.cache/phenotype'
      });
      const architecture = architectureOf(entry.architecture);
      const applied = appliedParametersOf(entry);

      assert.deepEqual(
        [...applied, ...Object.keys(entry.ignorable)].sort(),
        architecture.parameters.map((spec) => spec.name).sort(),
        `${entry.script}: applied + ignorable must cover ${architecture.name}`
      );

      for (const name of [...applied, ...executionConstants]) {
        assert.ok(injectable[name], `${entry.script}: ${name} is not injectable`);
        assert.equal(copy.split(`phenotypeValue('${name}',`).length - 1, 1, `${entry.script}: ${name}`);
      }

      assert.deepEqual(Object.keys(strategyConstants).sort(), [...entry.strategyConstants].sort());
      assert.equal(copy.split('phenotypeIneligible(session.time)').length - 1, 1, `${entry.script}: guard`);
      assert.ok(copy.includes('phenotypeInjection.sessions ?? groupMarketSessions('), `${entry.script}: sessions`);
      // Nothing else differs: undoing the substitutions gives back the source, byte for byte.
      const undone = copy
        .replace(
          /import fs from 'fs-extra';\n\n\/\/ Derived from [\s\S]*?return time < phenotypeInjection\.firstEligibleTime;\n\};/,
          "import fs from 'fs-extra';"
        )
        .replace(/phenotypeValue\('\w+', ([^;]+)\);/g, '$1;')
        .replace(' || phenotypeIneligible(session.time)', '')
        .replace('phenotypeInjection.sessions ?? ', '');

      assert.equal(undone, source, `${entry.script}: the derived module differs beyond the substitutions`);
    }
  });

  test('the derived module keeps the shipped D1 defaults', async () => {
    const d1 = await prepareStrategy(compatibleStrategies[0]!);

    assert.equal(d1.entry.script, 'allIn-trailingBuy-postExitContinuation');
    assert.deepEqual(
      Object.fromEntries(Object.entries(d1.injectable).map(([name, constant]) => [name, constant.literal])),
      {
        targetPercentChange: 0.216,
        trailingBuyPercentage: 0.003,
        trailingStopPercentage: 0.073,
        maximumHoldDays: 8,
        tickWindowSize: 74,
        intradayLossBuffer: 0.029,
        pullback: 0.09,
        continuationWindow: 60,
        investmentAmount: 100000,
        marginInterestRate: 0.11
      }
    );
  });

  test('a parameter listed as ignorable but declared by the file is refused', async () => {
    const entry = { ...compatibleStrategies[0]!, ignorable: { pullback: 'pretend' } };
    const source = await fs.readFile(strategyFileOf(entry.script), 'utf8');

    assert.throws(
      () => transformSource(source, entry, { sourceDir: 'src/app', targetDir: '.cache/phenotype' }),
      /declares pullback, so it can't be listed as ignorable/
    );
  });

  test('config/phenotypes/COMPATIBILITY.md is the generated matrix', async () => {
    assert.equal(
      await fs.readFile('config/phenotypes/COMPATIBILITY.md', 'utf8'),
      matrixMarkdown(),
      'regenerate it with `npm run app -- phenotypes matrix config/phenotypes/COMPATIBILITY.md`'
    );
  });
});

describe('shipped phenotypes', () => {
  const expected = {
    'VGT/primary': [216, 3, 73, 8, 74, 29, 90, 60],
    'XBI/primary': [291, 12, 104, 3, 64, 1, 107, 29],
    'XBI/lowDd': [300, 12, 31, 5, 49, 1, 82, 54],
    'XRT/primary': [244, 20, 77, 9, 49, 28, 65, 103],
    'XRT/lowDd': [244, 47, 80, 17, 48, 36, 62, 120],
    'KRE/primary': [299, 28, 31, 5, 233, 28, 94, 100],
    'KRE/lowDd': [299, 27, 31, 4, 230, 23, 94, 60]
  };

  test('are the seven frozen D1 configurations, each with its own symbol', async () => {
    const files = await listPhenotypeFiles();
    const found = Object.fromEntries(
      files.flatMap((file) =>
        Object.values(file.phenotypes).map((phenotype) => [
          `${file.symbol}/${phenotype.name}`,
          phenotype.parameters.map((parameter) => parameter.grid)
        ])
      )
    );

    assert.deepEqual(found, expected);
  });

  test('VGT primary is D1: the shipped constants of the D1 file', async () => {
    const d1 = await prepareStrategy(compatibleStrategies[0]!);
    const [vgt] = (await listPhenotypeFiles()).filter((file) => file.symbol === 'VGT');

    for (const parameter of vgt!.phenotypes.primary!.parameters) {
      assert.equal(parameter.value, d1.injectable[parameter.name]!.literal, parameter.name);
    }
  });

  test('the multi-ETF phenotypes are the frozen candidates, by candidate ID', async () => {
    const manifest = await fs.readJson('research/multi-etf-d1/FROZEN_CANDIDATES.json');

    for (const file of await listPhenotypeFiles()) {
      for (const phenotype of Object.values(file.phenotypes)) {
        const provenance = phenotype.provenance as Record<string, string>;

        if (provenance.program !== 'multi-etf-d1') {
          continue;
        }

        assert.equal(provenance.manifestHash, manifest.manifestHash);

        const nomination = manifest.tickers[file.symbol].nominations.find(
          (candidate: { id: string }) => candidate.id === provenance.candidateId
        );

        assert.ok(nomination, `${file.symbol}/${phenotype.name}: ${provenance.candidateId} is not a frozen nomination`);
        assert.equal(nomination.role, provenance.role);
        assert.deepEqual(
          Object.fromEntries(phenotype.parameters.map((parameter) => [parameter.name, parameter.grid])),
          nomination.params,
          `${file.symbol}/${phenotype.name}`
        );
        assert.deepEqual(
          Object.fromEntries(phenotype.parameters.map((parameter) => [parameter.name, parameter.value])),
          nomination.fractions,
          `${file.symbol}/${phenotype.name}: fractions`
        );
      }
    }
  });
});

describe('run planning', () => {
  const request = { script: 'allIn-trailingBuy-postExitContinuation', symbol: 'KRE', phenotype: 'primary' };

  test('selects the symbol-specific phenotype and the execution profile', async () => {
    const kre = await planPhenotypeRun(request);
    const xbi = await planPhenotypeRun({ ...request, symbol: 'XBI' });
    const lowDd = await planPhenotypeRun({ ...request, phenotype: 'lowDd' });

    assert.equal(kre.values.tickWindowSize, 233);
    assert.equal(xbi.values.tickWindowSize, 64);
    assert.equal(lowDd.values.tickWindowSize, 230);
    assert.equal(kre.values.trailingBuyPercentage, 0.028);
    assert.equal(lowDd.values.trailingBuyPercentage, 0.027);
    assert.equal(kre.dataFile.value, 'data/KRE/KRE-2016-2025-1-minute.csv');
    assert.equal(kre.firstEligibleDate, '2017-06-15');
    assert.equal(kre.values.investmentAmount, 100000);
    assert.equal(kre.values.marginInterestRate, 0.11);
    assert.equal(kre.stopFill.value, 'stop');
    assert.deepEqual(kre.ignored, []);
  });

  test('a strategy without post-exit continuation reports P and W as ignored', async () => {
    const plan = await planPhenotypeRun({ ...request, script: 'allIn-trailingBuy-bufferedLoss-noReentry' });

    assert.deepEqual(
      plan.ignored.map(({ parameter }) => parameter.name),
      ['pullback', 'continuationWindow']
    );
    assert.equal(plan.values.pullback, undefined);
    assert.equal(plan.applied.length, 6);
  });

  test('refuses incompatible strategies, unknown phenotypes, wrong symbols and research output directories', async () => {
    await refusesAsync(() => planPhenotypeRun({ ...request, script: 'allIn' }), /allIn does not take phenotypes/);
    await refusesAsync(
      () => planPhenotypeRun({ ...request, script: 'allIn-trailingBuy-noReentry' }),
      /no buffered intraday loss exit/
    );
    await refusesAsync(() => planPhenotypeRun({ ...request, script: 'nope' }), /not a known entry point/);
    await refusesAsync(() => planPhenotypeRun({ ...request, phenotype: 'lowdd' }), /did you mean 'lowDd'/);
    await refusesAsync(() => planPhenotypeRun({ ...request, symbol: 'XLF' }), /No D1 phenotypes for XLF/);
    await refusesAsync(
      () => planPhenotypeRun({ ...request, phenotypeFile: 'config/phenotypes/D1/XBI.json' }),
      /holds phenotypes for XBI, not KRE/
    );
    await refusesAsync(() => planPhenotypeRun({ ...request, execution: 'nope' }), /No execution profile/);
    await refusesAsync(
      () => planPhenotypeRun({ ...request, outDir: 'research/multi-etf-d1/results/holdout/KRE/primary' }),
      /frozen research artifacts/
    );
    await refusesAsync(() => planPhenotypeRun({ ...request, stopFill: 'close' }), /stop fill/);
    await refusesAsync(() => planPhenotypeRun({ ...request, startDate: 'soon' }), /YYYY-MM-DD/);
  });

  test('execution settings from the command line override the profile', async () => {
    const plan = await planPhenotypeRun({ ...request, stopFill: 'next-open', dataFile: 'x.csv', outDir: '-' });

    assert.deepEqual(plan.stopFill, { value: 'next-open', source: 'command line' });
    assert.deepEqual(plan.dataFile, { value: 'x.csv', source: 'command line' });
    assert.equal(plan.outDir, undefined);
  });
});
