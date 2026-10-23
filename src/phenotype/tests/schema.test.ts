// Phenotype files and execution profiles: valid files load; every kind of mistake (unknown or missing parameters,
// wrong units, off-grid or out-of-range values, unknown keys, wrong symbol or architecture, unknown names,
// missing files) is refused with a message that says what to write instead. No market data is read.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { PhenotypeError, architectureOf, parseParameter } from '../architectures.ts';
import { parseExecutionProfile, parseRate, readExecutionProfile } from '../execution.ts';
import { listPhenotypeFiles, parsePhenotypeFile, phenotypeFileOf, selectPhenotype } from '../phenotypes.ts';

const d1 = architectureOf('D1');
const spec = (name: string) => d1.parameters.find((parameter) => parameter.name === name)!;

const validParameters = () => ({
  targetPercentChange: '21.6%',
  trailingBuyPercentage: '0.3%',
  trailingStopPercentage: '7.3%',
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: '2.9%',
  pullback: '9.0%',
  continuationWindow: 60
});

const validFile = (parameters: Record<string, unknown> = validParameters()) => ({
  schemaVersion: 1,
  architecture: 'D1',
  symbol: 'TEST',
  execution: 'multi-etf-d1',
  phenotypes: { primary: { description: 'a test', parameters, provenance: { candidateId: 'x' } } }
});

const refuses = (run: () => unknown, pattern: RegExp) =>
  assert.throws(run, (error: Error) => {
    assert.ok(error instanceof PhenotypeError, `expected a PhenotypeError, got ${error}`);
    assert.match(error.message, pattern);
    return true;
  });

const refusesAsync = async (run: () => Promise<unknown>, pattern: RegExp) =>
  assert.rejects(run, (error: Error) => {
    assert.ok(error instanceof PhenotypeError, `expected a PhenotypeError, got ${error}`);
    assert.match(error.message, pattern);
    return true;
  });

describe('percent parameters', () => {
  test('are percentage strings on the 0.1 percentage-point grid', () => {
    const parsed = parseParameter(spec('targetPercentChange'), '29.9%', 'test');

    assert.equal(parsed.grid, 299);
    assert.equal(parsed.value, 0.299);
    assert.equal(parsed.display, '29.9%');
    assert.equal(parseParameter(spec('trailingBuyPercentage'), '0.3%', 'test').value, 0.003);
    assert.equal(parseParameter(spec('pullback'), '9%', 'test').value, 0.09);
    assert.equal(parseParameter(spec('intradayLossBuffer'), '0.0%', 'test').value, 0);
  });

  test('tenths / 1000 is the same double as the decimal literal, on the whole grid', () => {
    for (let tenths = 0; tenths <= 1000; tenths++) {
      const literal = Number(`0.${String(tenths).padStart(3, '0')}`);
      const expected = tenths === 1000 ? 1 : literal;

      assert.equal(tenths / 1000, expected, `${tenths} tenths`);
    }
  });

  test('refuse bare numbers, with the percentage they probably meant', () => {
    refuses(() => parseParameter(spec('targetPercentChange'), 0.299, 'test'), /not the number 0.299.*"29.9%"/);
    refuses(() => parseParameter(spec('targetPercentChange'), 29.9, 'test'), /did you mean "29.9%"/);
  });

  test('refuse strings without the % sign, off the grid or malformed', () => {
    refuses(() => parseParameter(spec('targetPercentChange'), '29.9', 'test'), /must end with '%'/);
    refuses(() => parseParameter(spec('targetPercentChange'), '0.299', 'test'), /must end with '%'/);
    refuses(() => parseParameter(spec('targetPercentChange'), '29.15%', 'test'), /off the 0.1 percentage-point grid/);
    refuses(() => parseParameter(spec('targetPercentChange'), '29.90%', 'test'), /off the 0.1 percentage-point grid/);
    refuses(() => parseParameter(spec('targetPercentChange'), '-5%', 'test'), /not a percentage/);
    refuses(() => parseParameter(spec('targetPercentChange'), ' 5%', 'test'), /not a percentage/);
    refuses(() => parseParameter(spec('targetPercentChange'), null, 'test'), /percentage string/);
  });

  test('refuse values outside the parameter range', () => {
    refuses(() => parseParameter(spec('targetPercentChange'), '100.0%', 'test'), /outside 0.1% to 99.9%/);
    refuses(() => parseParameter(spec('targetPercentChange'), '0.0%', 'test'), /outside/);
    refuses(() => parseParameter(spec('trailingStopPercentage'), '150%', 'test'), /outside/);
  });
});

describe('integer parameters', () => {
  test('are JSON integers in their unit', () => {
    const parsed = parseParameter(spec('maximumHoldDays'), 8, 'test');

    assert.equal(parsed.value, 8);
    assert.equal(parsed.display, '8 calendar days');
    assert.equal(parseParameter(spec('tickWindowSize'), 233, 'test').display, '233 sessions');
  });

  test('refuse fractions, strings and out-of-range counts', () => {
    refuses(() => parseParameter(spec('maximumHoldDays'), 8.5, 'test'), /JSON integer \(calendar days\)/);
    refuses(() => parseParameter(spec('tickWindowSize'), '74', 'test'), /JSON integer \(sessions\), not "74"/);
    refuses(() => parseParameter(spec('continuationWindow'), 0, 'test'), /outside/);
    refuses(() => parseParameter(spec('maximumHoldDays'), -1, 'test'), /outside/);
  });
});

describe('phenotype files', () => {
  test('a valid file loads with every parameter in architecture order, metadata kept apart', () => {
    const file = parsePhenotypeFile(validFile(), 'test.json');
    const phenotype = file.phenotypes.primary!;

    assert.deepEqual(
      phenotype.parameters.map((parameter) => parameter.name),
      d1.parameters.map((parameter) => parameter.name)
    );
    assert.deepEqual(
      phenotype.parameters.map((parameter) => parameter.value),
      [0.216, 0.003, 0.073, 8, 74, 0.029, 0.09, 60]
    );
    assert.deepEqual(phenotype.provenance, { candidateId: 'x' });
    assert.equal(file.execution, 'multi-etf-d1');
  });

  test('a misspelled parameter is refused with a suggestion', () => {
    const parameters: Record<string, unknown> = validParameters();

    parameters.targetPercentChnage = parameters.targetPercentChange;
    delete parameters.targetPercentChange;
    refuses(() => parsePhenotypeFile(validFile(parameters), 't.json'), /did you mean 'targetPercentChange'/);
  });

  test('a missing parameter is refused: nothing falls back to a strategy default', () => {
    const parameters: Record<string, unknown> = validParameters();

    delete parameters.pullback;
    refuses(
      () => parsePhenotypeFile(validFile(parameters), 't.json'),
      /missing D1 parameter pullback.*nothing falls back/
    );
  });

  test('a wrong unit inside a file names the file, the phenotype and the parameter', () => {
    refuses(
      () => parsePhenotypeFile(validFile({ ...validParameters(), trailingStopPercentage: 0.073 }), 'KRE.json'),
      /KRE.json: phenotype 'primary': trailingStopPercentage must be a percentage string.*"7.3%"/
    );
  });

  test('unknown keys, versions, architectures, symbols and names are refused', () => {
    refuses(() => parsePhenotypeFile({ ...validFile(), sybmol: 'X' }, 't.json'), /unknown key 'sybmol'/);
    refuses(() => parsePhenotypeFile({ ...validFile(), schemaVersion: 2 }, 't.json'), /schemaVersion must be 1/);
    refuses(
      () => parsePhenotypeFile({ ...validFile(), architecture: 'D9' }, 't.json'),
      /Unknown phenotype architecture/
    );
    refuses(() => parsePhenotypeFile({ ...validFile(), symbol: 'A/B' }, 't.json'), /symbol must be a ticker/);
    refuses(() => parsePhenotypeFile({ ...validFile(), phenotypes: {} }, 't.json'), /at least one named phenotype/);
    refuses(
      () => parsePhenotypeFile({ ...validFile(), phenotypes: { '1st': { parameters: validParameters() } } }, 't.json'),
      /names start with a letter/
    );
    refuses(
      () =>
        parsePhenotypeFile(
          { ...validFile(), phenotypes: { primary: { parameters: validParameters(), notes: 'x' } } },
          't.json'
        ),
      /unknown key 'notes'/
    );
  });

  test('selection is per architecture, symbol and name, case-sensitively', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'phenotypes-'));

    try {
      await fs.ensureDir(path.join(root, 'D1'));
      await fs.writeJson(path.join(root, 'D1', 'TEST.json'), validFile());
      await fs.writeJson(path.join(root, 'D1', 'OTHER.json'), validFile());

      const { phenotype, file } = await selectPhenotype({ architecture: 'D1', symbol: 'TEST', name: 'primary', root });

      assert.equal(phenotype.name, 'primary');
      assert.equal(file.symbol, 'TEST');
      await refusesAsync(
        () => selectPhenotype({ architecture: 'D1', symbol: 'TEST', name: 'primry', root }),
        /No phenotype 'primry' for TEST.*did you mean 'primary'.*available: primary/
      );
      await refusesAsync(
        () => selectPhenotype({ architecture: 'D1', symbol: 'MISSING', name: 'primary', root }),
        /No D1 phenotypes for MISSING.*symbols with D1 phenotypes: OTHER, TEST/
      );
      await refusesAsync(
        () => selectPhenotype({ architecture: 'D1', symbol: 'test', name: 'primary', root }),
        /case-sensitive/
      );
      // OTHER.json declares symbol TEST: never applied to OTHER.
      await refusesAsync(
        () => selectPhenotype({ architecture: 'D1', symbol: 'OTHER', name: 'primary', root }),
        /holds phenotypes for TEST, not OTHER/
      );
      await refusesAsync(() => listPhenotypeFiles(root), /should be named TEST.json/);
      await refusesAsync(
        () =>
          selectPhenotype({ architecture: 'D1', symbol: 'TEST', name: 'primary', file: path.join(root, 'nope.json') }),
        /does not exist/
      );
      await fs.writeFile(path.join(root, 'D1', 'BROKEN.json'), '{ "schemaVersion": 1,');
      await refusesAsync(
        () => selectPhenotype({ architecture: 'D1', symbol: 'BROKEN', name: 'primary', root }),
        /is not valid JSON/
      );
      await refusesAsync(() => phenotypeFileOf('D2', 'TEST', root), /No phenotype directory/);
    } finally {
      await fs.remove(root);
    }
  });
});

describe('execution profiles', () => {
  const profile = () => ({
    schemaVersion: 1,
    name: 'test',
    firstEligibleDate: '2017-06-15',
    investmentPerEntry: 100000,
    marginInterestRate: '11%',
    stopFill: 'stop',
    periods: [{ label: 'development', start: '2017-06-15', end: '2023-12-29' }],
    dataHashes: {}
  });

  test('a valid profile loads, its rate converting exactly as the literal', () => {
    const parsed = parseExecutionProfile(profile(), 'test.json', 'test');

    assert.equal(parsed.marginInterestRate!.value, 0.11);
    assert.equal(parseRate('8.25%', 'rate').value, 0.0825);
    assert.equal(parsed.periods[0]!.end, '2023-12-29');
  });

  test('bad dates, rates, labels and keys are refused', () => {
    refuses(() => parseExecutionProfile({ ...profile(), firstEligibleDate: '2017-02-30' }, 't', 'test'), /YYYY-MM-DD/);
    refuses(() => parseExecutionProfile({ ...profile(), marginInterestRate: 0.11 }, 't', 'test'), /"11%"/);
    refuses(() => parseExecutionProfile({ ...profile(), stopFill: 'close' }, 't', 'test'), /stopFill/);
    refuses(
      () => parseExecutionProfile({ ...profile(), periods: [{ label: 'full', start: '2017-06-15' }] }, 't', 'test'),
      /reserved/
    );
    refuses(
      () =>
        parseExecutionProfile(
          { ...profile(), periods: [{ label: 'a', start: '2020-01-02', end: '2019-01-02' }] },
          't',
          'test'
        ),
      /before start/
    );
    refuses(() => parseExecutionProfile({ ...profile(), investment: 1 }, 't', 'test'), /unknown key 'investment'/);
    refuses(() => parseExecutionProfile(profile(), 't', 'other'), /name must be "other"/);
    refuses(
      () => parseExecutionProfile({ ...profile(), dataFile: 'data/{symbol}/{symbol}.csv' }, 't', 'test'),
      /dataFile is no longer a profile setting; runs read data\/<SYMBOL>\/<partition>\/data.csv/
    );
  });

  test('the shipped profile is the multi-ETF D1 protocol', async () => {
    const shipped = await readExecutionProfile('multi-etf-d1');

    assert.equal(shipped.firstEligibleDate, '2017-06-15');
    assert.equal(shipped.investmentPerEntry, 100000);
    assert.equal(shipped.marginInterestRate!.value, 0.11);
    assert.equal(shipped.stopFill, 'stop');
    assert.deepEqual(shipped.periods, [
      { label: 'development', start: '2017-06-15', end: '2023-12-29' },
      { label: 'holdout', start: '2024-01-02', end: '2025-10-16' }
    ]);
    await refusesAsync(() => readExecutionProfile('nope'), /No execution profile.*available: multi-etf-d1/);
  });
});
