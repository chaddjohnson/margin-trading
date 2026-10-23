// The --phenotype command line: flag forms, positional arguments passed through unchanged, conflicts refused, and
// src/app.ts only taking the phenotype path when asked to (every other command line is left to its script).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { PhenotypeError } from '../architectures.ts';
import { parsePhenotypeArguments, usesPhenotype } from '../cli.ts';

const refuses = (args: string[], pattern: RegExp) =>
  assert.throws(
    () => parsePhenotypeArguments(args),
    (error: Error) => error instanceof PhenotypeError && pattern.test(error.message)
  );

describe('phenotype command line', () => {
  test('--phenotype <name> and --phenotype=<name>, anywhere among the positional arguments', () => {
    assert.deepEqual(parsePhenotypeArguments(['KRE', '--phenotype', 'lowDd']), {
      positional: ['KRE'],
      phenotype: 'lowDd',
      phenotypeFile: undefined,
      execution: undefined
    });
    assert.deepEqual(parsePhenotypeArguments(['--phenotype=primary', 'VGT']).positional, ['VGT']);
    assert.deepEqual(
      parsePhenotypeArguments([
        'XBI',
        '-',
        '2023-12-29',
        '-',
        'out/xbi',
        'next-open',
        '--phenotype',
        'primary',
        '--execution=multi-etf-d1',
        '--phenotype-file',
        'my.json'
      ]),
      {
        positional: ['XBI', '-', '2023-12-29', '-', 'out/xbi', 'next-open'],
        phenotype: 'primary',
        phenotypeFile: 'my.json',
        execution: 'multi-etf-d1'
      }
    );
  });

  test('a phenotype-setting positional argument conflicts; "-" leaves it unset', () => {
    refuses(
      ['VGT', '-', '-', '-', '-', 'stop', '0.003', '--phenotype', 'primary'],
      /argument 7 \(trailingBuyPercentage/
    );
    refuses(
      ['VGT', '-', '-', '-', '-', 'stop', '-', '0.029', '--phenotype', 'primary'],
      /argument 8 \(intradayLossBuffer/
    );
    assert.doesNotThrow(() =>
      parsePhenotypeArguments(['VGT', '-', '-', '-', '-', 'stop', '-', '-', '--phenotype', 'primary'])
    );
    refuses(['VGT', '-', '-', '-', '-', 'stop', '-', '-', 'extra', '--phenotype', 'primary'], /Too many positional/);
  });

  test('mistakes are refused', () => {
    refuses(['--phenotype', 'primary'], /A symbol is required/);
    refuses(['VGT', '--phenotype'], /--phenotype needs a value/);
    refuses(['VGT', '--phenotype', '--execution', 'x'], /--phenotype needs a value/);
    refuses(['VGT', '--phenotype=', 'x'], /--phenotype needs a value/);
    refuses(['VGT', '--phenotype', 'a', '--phenotype', 'b'], /given twice/);
    refuses(['VGT', '--phenotype', 'a', '--verbose'], /Unknown option --verbose/);
    refuses(['VGT', '--phenotype-file', 'x.json'], /needs --phenotype <name>/);
  });

  test('only --phenotype and --phenotype-file route a command to the phenotype runner', () => {
    assert.equal(usesPhenotype(['VGT', '--phenotype', 'primary']), true);
    assert.equal(usesPhenotype(['VGT', '--phenotype=primary']), true);
    assert.equal(usesPhenotype(['VGT', '--phenotype-file', 'x.json']), true);
    // Strategy positional arguments and the research command lines' own flags are untouched.
    assert.equal(usesPhenotype(['VGT', '2016-10-07', '2025-10-13', '-', '-', 'stop', '0.003', '0.029']), false);
    assert.equal(usesPhenotype(['parity', '--vectors', '10', '--only', 'd1']), false);
    assert.equal(usesPhenotype(['holdout', '--rerun-reason', 'x', '--execution', 'y']), false);
    assert.equal(usesPhenotype(['--phenotypes']), false);
  });

  test('src/app.ts dispatches to the phenotype runner only through usesPhenotype', async () => {
    const app = await fs.readFile('src/app.ts', 'utf8');

    assert.match(app, /import \{ usesPhenotype \} from '\.\/phenotype\/detect\.ts';/);
    assert.match(app, /if \(usesPhenotype\(args\)\) \{[\s\S]*?runPhenotypeCli\(script, args\);\s*return;\s*\}/);
    // The original dispatch follows, with only the dataset shorthand of the strategy entry points expanded.
    assert.match(app, /const mod = await import\(`\.\/app\/\$\{script\}\.ts`\);/);
    assert.match(app, /await fn\(\.\.\.\(takesDataset\(script\) \? expandDatasetArguments\(args\) : args\)\);/);
  });
});
