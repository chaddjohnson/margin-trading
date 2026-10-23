// The partitioning script on synthetic sources in a temporary data directory: New York trading-date assignment at
// the boundaries and across daylight saving, byte-exact copies, `all` equal to the ordered union, header removal,
// refusals that leave the source and the destinations alone, reruns, and the verify mode. The last test runs a
// strategy through src/app.ts on every partition.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import fs from 'fs-extra';
import { discoverSources, partitionSymbol, verifySymbol } from '../partition.ts';
import { newYorkDateAndMinute, partitionOf } from '../scan.ts';

let dataDir = '';

const row = (iso: string, price = 100) => `"${iso}",${price},${price + 0.25},${price - 0.25},${price + 0.1},1200`;

// A few regular sessions in each partition (9:30-9:35 and the 16:00 closing print), plus extended-hours rows on
// both sides of each New York midnight boundary.
const sessionRows = (date: string, utcOpenHour: number, price: number) => [
  ...[0, 1, 2, 3, 4, 5].map((minute) => row(`${date}T${utcOpenHour}:3${minute}:00Z`, price + minute / 10)),
  row(`${date}T${utcOpenHour + 6}:30:00Z`, price + 1)
];

const sourceRows = () => [
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

const writeSource = async (symbol: string, lines: string[], ending = '\n') => {
  const file = path.join(dataDir, `${symbol}.csv`);

  await fs.writeFile(file, lines.join('\n') + ending);
  return file;
};

const read = (symbol: string, partition: string) =>
  fs.readFileSync(path.join(dataDir, symbol, partition, 'data.csv'), 'utf8');

const linesOf = (text: string) => text.split('\n').filter(Boolean);

beforeEach(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'partition-test-'));
});

afterEach(async () => {
  await fs.remove(dataDir);
});

describe('trading dates', () => {
  test('New York dates around midnight and the daylight-saving changes', () => {
    const at = (iso: string) => newYorkDateAndMinute(Date.parse(iso) / 1000);

    assert.deepEqual(at('2024-01-01T04:59:00Z'), { date: '2023-12-31', minute: 23 * 60 + 59 });
    assert.deepEqual(at('2024-01-01T05:00:00Z'), { date: '2024-01-01', minute: 0 });
    assert.deepEqual(at('2024-03-10T06:59:00Z'), { date: '2024-03-10', minute: 60 + 59 });
    assert.deepEqual(at('2024-03-10T07:00:00Z'), { date: '2024-03-10', minute: 3 * 60 });
    assert.deepEqual(at('2024-11-03T05:59:00Z'), { date: '2024-11-03', minute: 60 + 59 }); // 01:59 EDT
    assert.deepEqual(at('2024-11-03T06:00:00Z'), { date: '2024-11-03', minute: 60 }); // 01:00 EST
    assert.deepEqual(at('2025-10-17T03:59:00Z'), { date: '2025-10-16', minute: 23 * 60 + 59 });
  });

  test('inclusive partition boundaries', () => {
    assert.equal(partitionOf('2015-12-31'), undefined);
    assert.equal(partitionOf('2016-01-01'), 'training');
    assert.equal(partitionOf('2023-12-31'), 'training');
    assert.equal(partitionOf('2024-01-01'), 'holdout');
    assert.equal(partitionOf('2025-10-16'), 'holdout');
    assert.equal(partitionOf('2025-10-17'), 'final');
    assert.equal(partitionOf('2030-01-01'), 'final');
  });
});

describe('partitioning a source', () => {
  test('four headerless comma-delimited files; all is the source byte for byte; the source is removed', async () => {
    const lines = sourceRows();
    const source = await writeSource('SYN', lines);
    const sourceText = await fs.readFile(source, 'utf8');
    const report = await partitionSymbol('SYN', { dataDir });

    assert.equal(report.status, 'ok', report.errors.join('; '));
    assert.equal(await fs.pathExists(source), false);
    assert.equal(report.sourceRemoved, true);

    const training = read('SYN', 'training');
    const holdout = read('SYN', 'holdout');
    const final = read('SYN', 'final');
    const all = read('SYN', 'all');

    assert.equal(all, sourceText);
    assert.equal(training + holdout + final, all);
    assert.equal(linesOf(training).at(-1), row('2024-01-01T04:59:00Z', 103));
    assert.equal(linesOf(holdout)[0], row('2024-01-01T05:00:00Z', 103));
    assert.equal(linesOf(holdout).at(-1), row('2025-10-17T03:59:00Z', 108));
    assert.equal(linesOf(final)[0], row('2025-10-17T04:00:00Z', 108));
    assert.equal(linesOf(training).length + linesOf(holdout).length + linesOf(final).length, lines.length);
    assert.equal(report.files.all!.rows, lines.length);
    assert.deepEqual(report.destinations, {
      training: 'created',
      holdout: 'created',
      final: 'created',
      all: 'created'
    });
    assert.ok(report.proof.some((line) => line.includes('all is the source, byte for byte')));
    assert.ok(await fs.pathExists(path.join(dataDir, 'SYN', 'partition-report.json')));
    assert.deepEqual(await fs.readdir(path.join(dataDir, 'SYN')), [
      'all',
      'final',
      'holdout',
      'partition-report.json',
      'training'
    ]);

    // The audit: 2024-01-04 has no bars and is reported; New Year's Day is a holiday, so it is not.
    assert.ok(report.scan!.audit.missingSessions.includes('2024-01-04'));
    assert.ok(!report.scan!.audit.missingSessions.includes('2024-01-01'));
    assert.deepEqual(report.scan!.audit.sessionsOnClosedDays, []);

    // A rerun finds nothing to do, and verify re-proves the files from disk.
    assert.deepEqual((await discoverSources(dataDir)).symbols, []);
    assert.equal((await verifySymbol('SYN', { dataDir })).status, 'ok');
  });

  test('a header row is left out of every output; a missing final newline is added', async () => {
    const lines = sourceRows();

    await writeSource('HDR', ['timestamp,open,high,low,close,volume', ...lines], '');

    const report = await partitionSymbol('HDR', { dataDir });

    assert.equal(report.status, 'ok', report.errors.join('; '));
    assert.equal(report.header, 'timestamp,open,high,low,close,volume');
    assert.equal(read('HDR', 'all'), lines.join('\n') + '\n');
  });

  test('--keep-source keeps the source', async () => {
    const source = await writeSource('KEEP', sourceRows());

    assert.equal((await partitionSymbol('KEEP', { dataDir, keepSource: true })).status, 'ok');
    assert.ok(await fs.pathExists(source));
  });

  const refused = async (symbol: string, lines: string[], pattern: RegExp) => {
    const source = await writeSource(symbol, lines);
    const before = await fs.readFile(source);
    const report = await partitionSymbol(symbol, { dataDir });

    assert.equal(report.status, 'failed');
    assert.match(report.errors.join('; '), pattern);
    assert.deepEqual(await fs.readFile(source), before, 'the source is untouched');
    assert.deepEqual(await fs.readdir(path.join(dataDir, symbol)).catch(() => []), [], 'nothing is left behind');
  };

  test('duplicate timestamps fail and are reported, not dropped', async () => {
    const lines = sourceRows();

    await refused('DUP', [...lines.slice(0, 5), lines[4]!, ...lines.slice(5)], /1 duplicates row\(s\).*identical row/);
    await refused(
      'DUPV',
      [...lines.slice(0, 5), lines[4]!.replace(',1200', ',1300'), ...lines.slice(5)],
      /different values/
    );
  });

  test('rows out of order fail rather than being sorted', async () => {
    const lines = sourceRows();

    await refused('ORD', [lines[1]!, lines[0]!, ...lines.slice(2)], /1 outOfOrder row\(s\)/);
  });

  test('rows before 2016 stop the symbol', async () => {
    await refused(
      'OLD',
      [row('2015-12-31T15:00:00Z'), ...sourceRows()],
      /1 outOfRange row\(s\).*2015-12-31, outside every partition/
    );
  });

  test('pipe-delimited, short, non-numeric and local-time rows fail', async () => {
    const lines = sourceRows();

    await refused(
      'PIPE',
      lines.map((line) => line.replaceAll(',', '|')),
      /looks pipe-delimited, but minute data is comma/
    );
    await refused(
      'PIPEU',
      lines.map((line) => line.replaceAll('"', '').replaceAll(',', '|')),
      /1 fields \(pipe-delimited\? minute data is comma-delimited\)/
    );
    await refused('SHORT', [...lines, '"2026-01-02T15:00:00Z",1,2,3'], /4 fields/);
    await refused('NAN', [...lines, '"2026-01-02T15:00:00Z",1,2,x,3,4'], /low "x" is not a number/);
    await refused('LOCAL', [...lines, '"2026-01-02T10:00:00",1,2,1,1,4'], /not ISO 8601 with a UTC offset/);
    await refused(
      'CRLF',
      lines.map((line) => `${line}\r`),
      /CRLF/
    );
  });

  test('existing destinations: identical ones are kept, different ones need --replace', async () => {
    const lines = sourceRows();

    await writeSource('EXI', lines);
    assert.equal((await partitionSymbol('EXI', { dataDir, keepSource: true })).status, 'ok');

    const rerun = await partitionSymbol('EXI', { dataDir, keepSource: true });

    assert.equal(rerun.status, 'ok', rerun.errors.join('; '));
    assert.deepEqual(rerun.destinations, {
      training: 'unchanged',
      holdout: 'unchanged',
      final: 'unchanged',
      all: 'unchanged'
    });

    const holdoutFile = path.join(dataDir, 'EXI', 'holdout', 'data.csv');

    await fs.writeFile(holdoutFile, 'something else\n');

    const refusedRun = await partitionSymbol('EXI', { dataDir, keepSource: true });

    assert.equal(refusedRun.status, 'failed');
    assert.match(refusedRun.errors.join(), /holdout\/data.csv exists with different content \(pass --replace/);
    assert.equal(await fs.readFile(holdoutFile, 'utf8'), 'something else\n', 'not overwritten');

    const replaced = await partitionSymbol('EXI', { dataDir, replace: true });

    assert.equal(replaced.status, 'ok', replaced.errors.join('; '));
    assert.equal(replaced.destinations.holdout, 'replaced');
    assert.equal(read('EXI', 'training') + read('EXI', 'holdout') + read('EXI', 'final'), read('EXI', 'all'));
  });

  test('verify catches a partition file that no longer matches all', async () => {
    await writeSource('TAM', sourceRows());
    assert.equal((await partitionSymbol('TAM', { dataDir })).status, 'ok');

    const holdoutFile = path.join(dataDir, 'TAM', 'holdout', 'data.csv');

    await fs.writeFile(
      holdoutFile,
      linesOf(await fs.readFile(holdoutFile, 'utf8'))
        .slice(1)
        .join('\n') + '\n'
    );

    const report = await verifySymbol('TAM', { dataDir });

    assert.equal(report.status, 'failed');
    assert.match(report.errors.join('; '), /holdout: \d+ rows on disk, \d+ expected/);
    assert.match(report.errors.join('; '), /not byte-for-byte the concatenation/);
  });
});

describe('the strategy command line on partitioned data', () => {
  test('allIn-trailingBuy reads training by default and each named partition', async () => {
    await writeSource('SYN', sourceRows());
    assert.equal((await partitionSymbol('SYN', { dataDir })).status, 'ok');

    const cwd = path.dirname(dataDir);
    const root = path.basename(dataDir);
    // src/app.ts resolves data/<SYMBOL>/... against the working directory, so run it where `data` is the fixture.
    const work = await fs.mkdtemp(path.join(os.tmpdir(), 'partition-cli-'));

    await fs.symlink(path.join(cwd, root), path.join(work, 'data'));

    const app = path.resolve('src/app.ts');
    const run = (...args: string[]) =>
      spawnSync(
        process.execPath,
        ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', app, 'allIn-trailingBuy', ...args],
        { cwd: work, encoding: 'utf8' }
      );

    try {
      const expected: [string[], string][] = [
        [['SYN'], 'Dataset: SYN training (data/SYN/training/data.csv)'],
        [['SYN', 'training'], 'Dataset: SYN training (data/SYN/training/data.csv)'],
        [['SYN', 'holdout'], 'Dataset: SYN holdout (data/SYN/holdout/data.csv)'],
        [['SYN', 'final'], 'Dataset: SYN final (data/SYN/final/data.csv)'],
        [['SYN', 'all'], 'Dataset: SYN all (data/SYN/all/data.csv)'],
        [['SYN', '-', '-', 'holdout'], 'Dataset: SYN holdout (data/SYN/holdout/data.csv)']
      ];

      for (const [args, line] of expected) {
        const result = run(...args);

        assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
        assert.ok(result.stdout.includes(line), `${args.join(' ')}: ${result.stdout}`);
      }

      const invalid = run('SYN', 'holdot');

      assert.equal(invalid.status, 1);
      assert.match(invalid.stderr, /'holdot' is neither a dataset partition \(training, holdout, final, all\)/);
    } finally {
      await fs.remove(work);
    }
  });
});
