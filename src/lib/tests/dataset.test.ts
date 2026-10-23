// Dataset selection: partition names, the one path layout, the command-line shorthand and the optimizer guard.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  datasetFile,
  datasetPartitions,
  expandDatasetArguments,
  optimizationDatasetFile,
  parseDatasetPartition,
  resolveDataset
} from '../dataset.ts';

describe('dataset partitions', () => {
  test('the four partitions resolve to data/<SYMBOL>/<partition>/data.csv', () => {
    assert.deepEqual(datasetPartitions, ['training', 'holdout', 'final', 'all']);

    for (const partition of datasetPartitions) {
      assert.equal(datasetFile('VGT', partition), `data/VGT/${partition}/data.csv`);
    }

    assert.equal(datasetFile('KRE'), 'data/KRE/training/data.csv');
    assert.equal(datasetFile('BRK.B', 'all', '/tmp/x'), '/tmp/x/BRK.B/all/data.csv');
  });

  test('training is the default; unknown partitions and odd symbols are refused', () => {
    assert.equal(parseDatasetPartition(undefined), 'training');
    assert.equal(parseDatasetPartition('-'), 'training');
    assert.equal(parseDatasetPartition(''), 'training');
    assert.equal(parseDatasetPartition('final'), 'final');
    assert.throws(
      () => parseDatasetPartition('holdot'),
      /Unknown dataset partition 'holdot'.*training, holdout, final, all/
    );
    assert.throws(() => parseDatasetPartition('Training'), /Unknown dataset partition/);
    assert.throws(() => datasetFile('vgt'), /not a symbol/);
    assert.throws(() => datasetFile('../VGT'), /not a symbol/);
  });

  test('a strategy data-file argument: unset, a partition, or an explicit file', () => {
    assert.deepEqual(resolveDataset('VGT'), {
      symbol: 'VGT',
      partition: 'training',
      file: 'data/VGT/training/data.csv'
    });
    assert.deepEqual(resolveDataset('VGT', '-'), {
      symbol: 'VGT',
      partition: 'training',
      file: 'data/VGT/training/data.csv'
    });

    for (const partition of datasetPartitions) {
      assert.deepEqual(resolveDataset('XBI', partition), {
        symbol: 'XBI',
        partition,
        file: `data/XBI/${partition}/data.csv`
      });
    }

    assert.deepEqual(resolveDataset('VGT', 'tmp/slice.csv'), {
      symbol: 'VGT',
      partition: undefined,
      file: 'tmp/slice.csv'
    });
    // A path that is a partition file is reported as that partition.
    assert.equal(resolveDataset('VGT', './data/VGT/holdout/data.csv').partition, 'holdout');
    assert.equal(resolveDataset('SYN-lower', 'x.csv').partition, undefined);
  });

  test('optimizers read the training partition only', () => {
    assert.equal(optimizationDatasetFile('VGT'), 'data/VGT/training/data.csv');
    assert.equal(optimizationDatasetFile('VGT', 'training'), 'data/VGT/training/data.csv');

    for (const partition of ['holdout', 'final', 'all']) {
      assert.throws(() => optimizationDatasetFile('VGT', partition), /training partition only/);
    }
  });
});

describe('the dataset argument of the strategy command lines', () => {
  test('existing command lines pass through unchanged', () => {
    for (const args of [
      [],
      ['VGT'],
      ['VGT', '2016-10-07', '2025-10-13'],
      ['VGT', '-', '-', 'data/x.csv', 'out', 'stop', '0.03'],
      ['VGT', '', '2023-12-29']
    ]) {
      assert.deepEqual(expandDatasetArguments(args), args);
    }
  });

  test('a partition after the symbol moves into the data-file slot', () => {
    assert.deepEqual(expandDatasetArguments(['VGT', 'training']), ['VGT', '-', '-', 'training']);
    assert.deepEqual(expandDatasetArguments(['VGT', 'holdout']), ['VGT', '-', '-', 'holdout']);
    assert.deepEqual(expandDatasetArguments(['VGT', 'final']), ['VGT', '-', '-', 'final']);
    assert.deepEqual(expandDatasetArguments(['VGT', 'all']), ['VGT', '-', '-', 'all']);
    assert.deepEqual(expandDatasetArguments(['VGT', 'all', '2020-01-02', '2020-12-31']), [
      'VGT',
      '2020-01-02',
      '2020-12-31',
      'all'
    ]);
    assert.deepEqual(expandDatasetArguments(['VGT', 'holdout', '-', '-', '-', 'out/dir', 'next-open', '0.03']), [
      'VGT',
      '-',
      '-',
      'holdout',
      'out/dir',
      'next-open',
      '0.03'
    ]);
  });

  test('a misspelt partition, or a partition together with a data file, is refused', () => {
    assert.throws(() => expandDatasetArguments(['VGT', 'holdot']), /neither a dataset partition.*nor a YYYY-MM-DD/);
    assert.throws(() => expandDatasetArguments(['VGT', '2016']), /neither a dataset partition/);
    assert.throws(
      () => expandDatasetArguments(['VGT', 'final', '-', '-', 'data/VGT/x.csv']),
      /either the partition 'final' or the data file 'data\/VGT\/x.csv', not both/
    );
  });
});
