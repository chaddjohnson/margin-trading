// Dataset selection: partition names, the canonical file per symbol, partition intervals from data/partitions.json,
// the command-line shorthand and the optimizer guard.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import {
  assertOptimizationPartition,
  canonicalDataFile,
  expandDatasetArguments,
  optimizationDataset,
  parseDatasetPartition,
  resolveDataset
} from '../dataset.ts';
import { datasetPartitions, defaultPartitionConfigText, parsePartitionConfig } from '../partitions.ts';

let root = '';

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'dataset-test-'));
  await fs.writeFile(path.join(root, 'partitions.json'), defaultPartitionConfigText);
});

after(async () => {
  await fs.remove(root);
});

const config = parsePartitionConfig(defaultPartitionConfigText);

describe('dataset partitions', () => {
  test('every partition of a symbol is its one canonical file, data/<SYMBOL>/data.csv', () => {
    assert.deepEqual(datasetPartitions, ['training', 'holdout', 'final', 'all']);
    assert.equal(canonicalDataFile('VGT'), 'data/VGT/data.csv');
    assert.equal(canonicalDataFile('BRK.B', '/tmp/x'), '/tmp/x/BRK.B/data.csv');

    for (const partition of datasetPartitions) {
      const selection = resolveDataset('VGT', partition, root);

      assert.equal(selection.file, `${root}/VGT/data.csv`);
      assert.equal(selection.partition, partition);
      assert.deepEqual(selection.interval, config.partitions[partition]);
      assert.equal(selection.partitionsSha256, config.sha256);
      assert.equal(selection.partitionsFile, path.join(root, 'partitions.json'));
    }
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
    assert.throws(() => canonicalDataFile('vgt'), /not a symbol/);
    assert.throws(() => canonicalDataFile('../VGT'), /not a symbol/);
    assert.throws(() => resolveDataset('../VGT', 'training', root), /not a symbol/);
  });

  test('a strategy data-file argument: unset, a partition, the canonical path, or an explicit file', () => {
    assert.equal(resolveDataset('VGT', undefined, root).partition, 'training');
    assert.equal(resolveDataset('VGT', '-', root).partition, 'training');
    assert.deepEqual(resolveDataset('VGT', 'tmp/slice.csv', root), { symbol: 'VGT', file: 'tmp/slice.csv' });
    assert.equal(resolveDataset('VGT', `${root}/./VGT/data.csv`, root).partition, 'all');
    assert.equal(resolveDataset('SYN-lower', 'x.csv', root).partition, undefined);
  });

  test('the former physical partition files are refused with the replacement', () => {
    assert.throws(
      () => resolveDataset('VGT', 'data/VGT/holdout/data.csv', root),
      /no longer exists: each symbol has one file, .*VGT\/data.csv.*pass the partition name 'holdout'/
    );
    assert.throws(() => resolveDataset('KRE', './data/KRE/all/data.csv'), /pass the partition name 'all'/);
  });

  test('a missing or invalid partitions.json stops a partition run', async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'dataset-empty-'));

    try {
      assert.throws(() => resolveDataset('VGT', 'holdout', empty), /partitions.json is missing/);
      await fs.writeFile(
        path.join(empty, 'partitions.json'),
        defaultPartitionConfigText.replace('2024-01-01', '2024-01-02')
      );
      assert.throws(() => resolveDataset('VGT', 'holdout', empty), /must be 2024-01-01/);
      // An explicit file needs no metadata.
      assert.equal(resolveDataset('VGT', 'x.csv', empty).file, 'x.csv');
    } finally {
      await fs.remove(empty);
    }
  });

  test('optimizers read the training partition only', () => {
    assert.equal(assertOptimizationPartition(), 'training');
    assert.equal(optimizationDataset('VGT', 'training', root).partition, 'training');
    assert.deepEqual(optimizationDataset('VGT', undefined, root).interval, config.partitions.training);

    for (const partition of ['holdout', 'final', 'all', 'x', '']) {
      assert.throws(() => optimizationDataset('VGT', partition, root), /training partition only/);
      assert.throws(() => assertOptimizationPartition(partition), /training partition only/);
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
