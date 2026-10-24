// The canonical dataset tools on synthetic files in a temporary data directory: data/partitions.json validation,
// New York trading-date assignment at the boundaries and across daylight saving, the migration from the former four
// files (byte-exact promotion, refusals that keep every original, reruns, unrelated files kept), verify, and import.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, parsePartitionConfig, segmentOf } from '#lib';
import { discoverSymbols, ensurePartitionConfig, importSymbol, migrateSymbol, verifySymbol } from '../canonical.ts';
import { newYorkDateAndMinute } from '../scan.ts';

let dataDir = '';

const config = parsePartitionConfig(defaultPartitionConfigText);

const row = (iso: string, price = 100) => `"${iso}",${price},${price + 0.25},${price - 0.25},${price + 0.1},1200`;

// A few regular sessions in each partition (9:30-9:35 and the 16:00 closing print), plus extended-hours rows on
// both sides of each New York midnight boundary.
const sessionRows = (date: string, utcOpenHour: number, price: number) => [
  ...[0, 1, 2, 3, 4, 5].map((minute) => row(`${date}T${utcOpenHour}:3${minute}:00Z`, price + minute / 10)),
  row(`${date}T${utcOpenHour + 6}:30:00Z`, price + 1)
];

export const sourceRows = () => [
  ...sessionRows('2023-12-27', 14, 100),
  ...sessionRows('2023-12-28', 14, 101),
  ...sessionRows('2023-12-29', 14, 102),
  row('2024-01-01T04:59:00Z', 103), // 2023-12-31 23:59 New York: training
  row('2024-01-01T05:00:00Z', 103), // 2024-01-01 00:00 New York: holdout
  ...sessionRows('2024-01-02', 14, 104),
  ...sessionRows('2024-01-03', 14, 105),
  row('2024-03-10T06:59:00Z', 106), // 01:59 EST, the minute before the spring change
  row('2024-03-10T07:00:00Z', 106), // 03:00 EDT
  ...sessionRows('2024-03-11', 13, 107), // 9:30 EDT is 13:30 UTC
  row('2025-10-17T03:59:00Z', 108), // 2025-10-16 23:59 EDT: holdout
  row('2025-10-17T04:00:00Z', 108), // 2025-10-17 00:00 EDT: final
  ...sessionRows('2025-10-17', 13, 109),
  ...sessionRows('2025-10-20', 13, 110),
  ...sessionRows('2025-11-03', 14, 111) // after the autumn change, 9:30 EST is 14:30 UTC again
];

const partitionOfRow = (line: string) =>
  segmentOf(config, newYorkDateAndMinute(Date.parse(line.split(',')[0]!.replaceAll('"', '')) / 1000).date)!;

// The former layout: data/<SYMBOL>/{training,holdout,final,all}/data.csv, as the old partitioning script wrote it.
const writeFormer = async (symbol: string, lines: string[]) => {
  const files: Record<string, string> = { training: '', holdout: '', final: '' };

  for (const line of lines) {
    files[partitionOfRow(line)] += `${line}\n`;
  }

  files.all = files.training! + files.holdout! + files.final!;

  for (const [partition, text] of Object.entries(files)) {
    await fs.outputFile(path.join(dataDir, symbol, partition, 'data.csv'), text);
  }

  return files;
};

const canonical = (symbol: string) => fs.readFile(path.join(dataDir, symbol, 'data.csv'), 'utf8');

const snapshot = async (symbol: string) => {
  const result: Record<string, string> = {};

  for (const partition of ['training', 'holdout', 'final', 'all']) {
    const file = path.join(dataDir, symbol, partition, 'data.csv');

    if (await fs.pathExists(file)) {
      result[partition] = await fs.readFile(file, 'utf8');
    }
  }

  return result;
};

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'datasets-test-'));
  await fs.writeFile(path.join(dataDir, 'partitions.json'), defaultPartitionConfigText);
});

afterEach(async () => {
  await fs.remove(dataDir);
});

describe('data/partitions.json', () => {
  const withPartitions = (change: (partitions: Record<string, { start: unknown; end: unknown }>) => void) => {
    const json = JSON.parse(defaultPartitionConfigText);

    change(json.partitions);
    return JSON.stringify(json);
  };

  test('the shipped boundaries: inclusive New York dates, consecutive, all unbounded', () => {
    assert.deepEqual(config.partitions, {
      training: { start: '2016-01-01', end: '2023-12-31' },
      holdout: { start: '2024-01-01', end: '2025-10-16' },
      final: { start: '2025-10-17', end: null },
      all: { start: null, end: null }
    });
    assert.equal(segmentOf(config, '2015-12-31'), undefined);
    assert.equal(segmentOf(config, '2016-01-01'), 'training');
    assert.equal(segmentOf(config, '2023-12-31'), 'training');
    assert.equal(segmentOf(config, '2024-01-01'), 'holdout');
    assert.equal(segmentOf(config, '2025-10-16'), 'holdout');
    assert.equal(segmentOf(config, '2025-10-17'), 'final');
    assert.equal(segmentOf(config, '2030-01-01'), 'final');
    assert.match(config.sha256, /^[0-9a-f]{64}$/);
  });

  test('strict validation: gaps, overlaps, bad dates, other zones, unknown keys and a bounded all are refused', () => {
    const refuses = (text: string, pattern: RegExp) => assert.throws(() => parsePartitionConfig(text), pattern);

    refuses(
      withPartitions((p) => (p.holdout!.start = '2024-01-02')),
      /must be 2024-01-01.*without gaps or overlaps/
    );
    refuses(
      withPartitions((p) => (p.holdout!.start = '2023-12-31')),
      /must be 2024-01-01/
    );
    refuses(
      withPartitions((p) => (p.final!.start = '2025-10-16')),
      /must be 2025-10-17/
    );
    refuses(
      withPartitions((p) => (p.training!.end = '2023-02-30')),
      /YYYY-MM-DD date or null/
    );
    refuses(
      withPartitions((p) => (p.training!.end = null)),
      /only final may end unbounded/
    );
    refuses(
      withPartitions((p) => (p.holdout!.start = null)),
      /only training may start unbounded/
    );
    refuses(
      withPartitions((p) => (p.all!.end = '2026-01-01')),
      /partitions.all must be/
    );
    refuses(
      withPartitions((p) => (p.final!.end = '2025-01-01')),
      /is after end/
    );
    refuses(
      withPartitions((p) => ((p as Record<string, unknown>).extra = { start: null, end: null })),
      /exactly the keys/
    );
    refuses(
      withPartitions((p) => delete p.final),
      /exactly the keys/
    );
    refuses(defaultPartitionConfigText.replace('America/New_York', 'UTC'), /timezone must be America\/New_York/);
    refuses(defaultPartitionConfigText.replace('"schemaVersion": 1', '"schemaVersion": 2'), /schemaVersion must be 1/);
    refuses('{', /not valid JSON/);
  });

  test('migrate writes the default metadata only when there is none', async () => {
    await fs.remove(path.join(dataDir, 'partitions.json'));
    await ensurePartitionConfig(dataDir, () => {}, true);
    assert.equal(await fs.pathExists(path.join(dataDir, 'partitions.json')), false, 'a dry run writes nothing');
    await ensurePartitionConfig(dataDir, () => {});
    assert.equal(await fs.readFile(path.join(dataDir, 'partitions.json'), 'utf8'), defaultPartitionConfigText);

    await fs.writeFile(
      path.join(dataDir, 'partitions.json'),
      withPartitions((p) => (p.holdout!.start = '2024-02-01'))
    );
    await assert.rejects(() => ensurePartitionConfig(dataDir, () => {}), /must be 2024-01-01/);
  });
});

describe('migrating the former four files', () => {
  test('all becomes data/<SYMBOL>/data.csv byte for byte; the four files go; other files stay', async () => {
    const files = await writeFormer('SYN', sourceRows());

    await fs.writeFile(path.join(dataDir, 'SYN', 'partition-report.json'), '{}\n');
    await fs.writeFile(path.join(dataDir, 'SYN', 'final', 'notes.txt'), 'keep me\n');

    const report = await migrateSymbol('SYN', { dataDir });

    assert.equal(report.status, 'migrated', report.errors.join('; '));
    assert.equal(await canonical('SYN'), files.all);
    assert.equal(report.after!.sha256, report.before!.all!.sha256);
    assert.equal(report.after!.rows, sourceRows().length);
    assert.deepEqual(
      (await fs.readdir(path.join(dataDir, 'SYN'))).sort(),
      ['data.csv', 'final', 'partition-report.json'],
      'empty partition directories are removed, unrelated files kept'
    );
    assert.deepEqual(await fs.readdir(path.join(dataDir, 'SYN', 'final')), ['notes.txt']);
    assert.deepEqual(report.kept, [path.join(dataDir, 'SYN', 'final', 'notes.txt')]);
    assert.equal(report.partitions!.training.lastDate, '2023-12-31');
    assert.equal(report.partitions!.holdout.firstDate, '2024-01-01');
    assert.equal(report.partitions!.holdout.lastDate, '2025-10-16');
    assert.equal(report.partitions!.final.firstDate, '2025-10-17');

    // The audit: 2024-01-04 has no bars and is reported; New Year's Day is a holiday, so it is not.
    assert.ok(report.scan!.audit.missingSessions.includes('2024-01-04'));
    assert.ok(!report.scan!.audit.missingSessions.includes('2024-01-01'));

    // A rerun re-verifies without changing anything, and so does verify.
    const rerun = await migrateSymbol('SYN', { dataDir });

    assert.equal(rerun.status, 'unchanged', rerun.errors.join('; '));
    assert.equal((await verifySymbol('SYN', { dataDir })).status, 'verified');
    assert.deepEqual(await discoverSymbols(dataDir), ['SYN']);
  });

  test('a dry run checks everything and changes nothing', async () => {
    await writeFormer('DRY', sourceRows());

    const before = await snapshot('DRY');
    const report = await migrateSymbol('DRY', { dataDir, dryRun: true });

    assert.equal(report.status, 'dry run', report.errors.join('; '));
    assert.deepEqual(await snapshot('DRY'), before);
    assert.equal(await fs.pathExists(path.join(dataDir, 'DRY', 'data.csv')), false);
  });

  const refused = async (symbol: string, prepare: () => Promise<void>, pattern: RegExp) => {
    await prepare();

    const before = await snapshot(symbol);
    const report = await migrateSymbol(symbol, { dataDir });

    assert.equal(report.status, 'failed');
    assert.match(report.errors.join('; '), pattern);
    assert.deepEqual(await snapshot(symbol), before, 'every original file is untouched');
    assert.equal(await fs.pathExists(path.join(dataDir, symbol, 'data.csv')), false, 'no canonical file');
    assert.deepEqual(
      (await fs.readdir(path.join(dataDir, symbol))).filter((name) => name.startsWith('.')),
      [],
      'no temporary file is left'
    );
  };

  test('an all that is not the ordered union stops the symbol', async () => {
    await refused(
      'UNI',
      async () => {
        const files = await writeFormer('UNI', sourceRows());
        await fs.writeFile(
          path.join(dataDir, 'UNI', 'all', 'data.csv'),
          files.all!.replace('100.1,1200', '100.2,1200')
        );
      },
      /not training ‖ holdout ‖ final byte for byte/
    );
  });

  test('physical files that disagree with partitions.json stop the symbol', async () => {
    await refused(
      'BND',
      async () => {
        const files = await writeFormer('BND', sourceRows());
        const holdout = files.holdout!.split('\n');
        // Move holdout's first row (2024-01-01 00:00 New York) into training: the union is unchanged.
        await fs.writeFile(path.join(dataDir, 'BND', 'training', 'data.csv'), `${files.training}${holdout[0]}\n`);
        await fs.writeFile(path.join(dataDir, 'BND', 'holdout', 'data.csv'), holdout.slice(1).join('\n'));
      },
      /training\/data.csv has \d+ rows, but .* assigns \d+ rows of all to training/
    );
  });

  test('duplicates, disorder, rows outside the partitions and malformed rows stop the symbol', async () => {
    const lines = sourceRows();

    await refused(
      'DUP',
      () => writeFormer('DUP', [...lines.slice(0, 5), lines[4]!, ...lines.slice(5)]).then(() => {}),
      /duplicates/
    );
    await refused(
      'ORD',
      () => writeFormer('ORD', [lines[1]!, lines[0]!, ...lines.slice(2)]).then(() => {}),
      /outOfOrder/
    );
    await refused(
      'OLD',
      async () => {
        const files = await writeFormer('OLD', lines);
        const early = `${row('2015-12-31T15:00:00Z')}\n`;
        await fs.writeFile(path.join(dataDir, 'OLD', 'training', 'data.csv'), early + files.training);
        await fs.writeFile(path.join(dataDir, 'OLD', 'all', 'data.csv'), early + files.all);
      },
      /outOfRange.*2015-12-31, outside every partition/
    );
    await refused(
      'SHORT',
      async () => {
        const files = await writeFormer('SHORT', lines);
        const bad = '"2026-01-02T15:00:00Z",1,2,3\n';
        await fs.writeFile(path.join(dataDir, 'SHORT', 'final', 'data.csv'), files.final + bad);
        await fs.writeFile(path.join(dataDir, 'SHORT', 'all', 'data.csv'), files.all + bad);
      },
      /malformed.*4 fields/
    );
  });

  test('an incomplete former layout, or a different existing canonical file, is refused', async () => {
    await refused(
      'INC',
      async () => {
        await writeFormer('INC', sourceRows());
        await fs.remove(path.join(dataDir, 'INC', 'final'));
      },
      /incomplete former layout/
    );

    await writeFormer('EXI', sourceRows());
    await fs.writeFile(path.join(dataDir, 'EXI', 'data.csv'), 'something else\n');

    const before = await snapshot('EXI');
    const report = await migrateSymbol('EXI', { dataDir });

    assert.equal(report.status, 'failed');
    assert.match(report.errors.join(), /exists with sha256 .* left alone/);
    assert.deepEqual(await snapshot('EXI'), before);
    assert.equal(await canonical('EXI'), 'something else\n');
  });

  test('an interrupted migration (canonical file written, former files still there) resumes', async () => {
    const files = await writeFormer('RES', sourceRows());

    await fs.writeFile(path.join(dataDir, 'RES', 'data.csv'), files.all!);

    const report = await migrateSymbol('RES', { dataDir });

    assert.equal(report.status, 'migrated', report.errors.join('; '));
    assert.ok(report.proof.some((line) => line.includes('resumed')));
    assert.deepEqual(await fs.readdir(path.join(dataDir, 'RES')), ['data.csv']);
  });
});

describe('verify and import', () => {
  test('verify catches a damaged canonical file and reports left-over former files', async () => {
    await writeFormer('TAM', sourceRows());
    assert.equal((await migrateSymbol('TAM', { dataDir })).status, 'migrated');

    const file = path.join(dataDir, 'TAM', 'data.csv');
    const lines = (await fs.readFile(file, 'utf8')).split('\n');

    await fs.writeFile(file, [lines[1], lines[0], ...lines.slice(2)].join('\n'));
    assert.match((await verifySymbol('TAM', { dataDir })).errors.join('; '), /outOfOrder/);

    await fs.outputFile(path.join(dataDir, 'TAM', 'holdout', 'data.csv'), '');
    assert.ok((await verifySymbol('TAM', { dataDir })).anomalies.some((line) => line.includes('run migrate')));
  });

  test('a new download becomes the canonical file without any partition files; a header is left out', async () => {
    const lines = sourceRows();

    await fs.writeFile(
      path.join(dataDir, 'NEW.csv'),
      ['timestamp,open,high,low,close,volume', ...lines].join('\n') + '\n'
    );

    const report = await importSymbol('NEW', { dataDir });

    assert.equal(report.status, 'imported', report.errors.join('; '));
    assert.equal(await canonical('NEW'), lines.join('\n') + '\n');
    assert.deepEqual(await fs.readdir(path.join(dataDir, 'NEW')), ['data.csv']);
    assert.equal(await fs.pathExists(path.join(dataDir, 'NEW.csv')), false);
    assert.equal((await verifySymbol('NEW', { dataDir })).status, 'verified');

    // A refreshed download needs --replace, and the report says which partitions changed.
    await fs.writeFile(path.join(dataDir, 'NEW.csv'), [...lines, row('2025-11-04T15:00:00Z', 120)].join('\n') + '\n');
    assert.match((await importSymbol('NEW', { dataDir, keepSource: true })).errors.join(), /pass --replace/);

    const replaced = await importSymbol('NEW', { dataDir, replace: true });
    const finalRows = lines.filter((line) => partitionOfRow(line) === 'final').length;

    assert.equal(replaced.status, 'imported', replaced.errors.join('; '));
    assert.deepEqual(
      replaced.proof.filter((line) => !line.startsWith('sha256')),
      ['training: unchanged', 'holdout: unchanged', `final: CHANGED (${finalRows} → ${finalRows + 1} rows)`]
    );
  });

  test('an invalid download is refused and nothing is written', async () => {
    await fs.writeFile(
      path.join(dataDir, 'BAD.csv'),
      sourceRows()
        .map((line) => line.replaceAll(',', '|'))
        .join('\n') + '\n'
    );

    const report = await importSymbol('BAD', { dataDir });

    assert.equal(report.status, 'failed');
    assert.match(report.errors.join(), /pipe-delimited/);
    assert.equal(await fs.pathExists(path.join(dataDir, 'BAD.csv')), true);
    assert.deepEqual(await fs.readdir(path.join(dataDir, 'BAD')).catch(() => []), []);
  });
});
