// The ingestion orchestrator's protections (PROTOCOL.md §3.3) on a temporary data directory with a fixture downloader
// and dummy credentials: adversarial deletion paths are refused; a retryable failure deletes only the attempt's own
// partial staging file before the retry (no duplicated rows); a terminal failure stops; an unexplained staging file or
// an existing canonical file is never touched; a failed import is quarantined, not deleted; a download reaching past
// the study end fails; and no output file or log contains a credential value.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText } from '#lib';
import { type IngestOptions, ingestSymbol } from '../ingest.ts';
import {
  assertCanonicalDir,
  assertStagingPath,
  classifyFailure,
  childEnvironment,
  mayDeleteAfterVerification,
  mayDeleteForRetry,
  redact
} from '../ingestSafety.ts';

const dummy = { ALPACA_API_KEY: 'DUMMYKEY-7f3a91c2', ALPACA_SECRET_KEY: 'DUMMYSECRET-b84e05d6' };
let root = '';
let dataDir = '';
let resultsDir = '';

const row = (iso: string, price: number) => `"${iso}",${price},${price + 0.25},${price - 0.25},${price + 0.1},1200`;
const fixtureRows = (lastDate = '2016-01-06') => {
  const dates = ['2016-01-04', '2016-01-05', '2016-01-06'].filter((date) => date <= lastDate);

  if (lastDate > '2016-01-06') {
    dates.push(lastDate);
  }

  return dates.flatMap((date, day) =>
    [0, 1, 2, 3].map((minute) => row(`${date}T14:3${minute}:00Z`, 100 + day + minute / 10))
  );
};

// A downloader stand-in with the real script's interface: appends to $OUTPUT_DIR/<SYMBOL>.csv, prints the pages and
// "Download complete"; MODE selects a failure. It also echoes the credentials, as a misbehaving tool might.
const downloader = (rowsText: string) => `#!/usr/bin/env bash
set -euo pipefail
SYMBOL="$1"
OUT="\${OUTPUT_DIR}/\${SYMBOL}.csv"
STATE="${'${OUTPUT_DIR}'}/../fixture-state-\${SYMBOL}"
COUNT=$(cat "$STATE" 2>/dev/null || echo 0)
COUNT=$((COUNT + 1))
echo "$COUNT" > "$STATE"
echo "using key $ALPACA_API_KEY and secret $ALPACA_SECRET_KEY"
MODE=$(cat "${'${OUTPUT_DIR}'}/../fixture-mode-\${SYMBOL}" 2>/dev/null || echo ok)
printf '%b\\n' ${JSON.stringify(rowsText)} | head -n 2 >> "$OUT"
if [[ "$MODE" == "429-once" && "$COUNT" == "1" ]]; then echo "curl: (22) The requested URL returned error: 429" >&2; exit 22; fi
if [[ "$MODE" == "403" ]]; then echo "curl: (22) The requested URL returned error: 403" >&2; exit 22; fi
printf '%b\\n' ${JSON.stringify(rowsText)} | tail -n +3 >> "$OUT"
echo "Page 1: 12 bars"
echo "Download complete: $OUT"
`;

const options = (rowsText: string): IngestOptions => {
  const script = path.join(root, 'download.sh');

  fs.outputFileSync(script, downloader(rowsText), { mode: 0o755 });

  return {
    dataDir,
    resultsDir,
    downloadScript: script,
    npmCommand: (args) => {
      // `datasets -- <command> ...` through the repository's datasets CLI on the temporary directory.
      const rest = args.slice(args.indexOf('--') + 1);
      const cli = path.resolve('src/data-partition/cli.ts');

      return {
        command: process.execPath,
        args: [
          '--experimental-transform-types',
          '--disable-warning=ExperimentalWarning',
          '--input-type=module',
          '-e',
          `const m = await import(${JSON.stringify(cli)}); process.exitCode = (await m.runDatasetsCli(${JSON.stringify(rest)}, ${JSON.stringify(dataDir)})) ? 0 : 1;`
        ]
      };
    },
    credentials: () => ({ ...dummy }),
    wait: async () => {},
    env: { PATH: process.env.PATH, HOME: process.env.HOME },
    verifyGaps: false
  };
};

const everyFile = async (dir: string): Promise<string[]> => {
  const out: string[] = [];

  for (const name of await fs.readdir(dir)) {
    const full = path.join(dir, name);

    if ((await fs.stat(full)).isDirectory()) {
      out.push(...(await everyFile(full)));
    } else {
      out.push(full);
    }
  }

  return out;
};

const assertNoCredential = async () => {
  for (const file of [...(await everyFile(resultsDir)), ...(await everyFile(dataDir))]) {
    const text = await fs.readFile(file, 'utf8');

    for (const value of Object.values(dummy)) {
      assert.ok(!text.includes(value), `${file} contains a credential value`);
    }
  }
};

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'robust-d1-ingest-'));
  dataDir = path.join(root, 'data');
  resultsDir = path.join(root, 'results');
  await fs.outputFile(path.join(dataDir, 'partitions.json'), defaultPartitionConfigText);
});

afterEach(async () => {
  await fs.remove(root);
});

describe('ingestion safety rules', () => {
  test('only the symbol’s own staging file is an acceptable deletion path', () => {
    assert.ok(assertStagingPath('data/XLV.csv', 'XLV'));
    assert.ok(assertStagingPath('./data/XLV.csv', 'XLV'));

    for (const file of [
      'data/VGT/data.csv',
      'data/XLV/data.csv',
      'data/XLK.csv',
      'data/../XLV.csv',
      'data/archive/XLV.csv',
      '/etc/XLV.csv',
      'data/XLV.csv.bak',
      'data/xlv.csv',
      'XLV.csv'
    ]) {
      assert.throws(() => assertStagingPath(file, 'XLV'), /refused/, file);
    }

    assert.throws(() => assertStagingPath('data/../data/VGT.csv', '../VGT'), /not a symbol/);
    assert.throws(() => assertCanonicalDir('data/VGT', 'XLV'), /refused/);
    assert.throws(() => assertCanonicalDir('data/archive', 'XLV'), /refused/);
    assert.ok(assertCanonicalDir('data/XLV', 'XLV'));
  });

  test('deletion requires the attempt log’s authorization', () => {
    const base = { number: 1, startedAt: '', log: '', canonicalDirExistedBefore: false };

    assert.ok(
      mayDeleteForRetry(
        { symbol: 'XLV', attempts: [{ ...base, status: 'download-failed', stagingCreatedByAttempt: true }] },
        'XLV'
      )
    );
    assert.ok(
      !mayDeleteForRetry(
        { symbol: 'XLV', attempts: [{ ...base, status: 'download-failed', stagingCreatedByAttempt: false }] },
        'XLV'
      )
    );
    assert.ok(
      !mayDeleteForRetry(
        { symbol: 'XLV', attempts: [{ ...base, status: 'imported', stagingCreatedByAttempt: true }] },
        'XLV'
      )
    );
    assert.ok(
      !mayDeleteForRetry(
        { symbol: 'XLK', attempts: [{ ...base, status: 'download-failed', stagingCreatedByAttempt: true }] },
        'XLV'
      )
    );
    assert.ok(!mayDeleteForRetry({ symbol: 'XLV', attempts: [] }, 'XLV'));
    assert.ok(
      !mayDeleteAfterVerification(
        { symbol: 'XLV', attempts: [{ ...base, status: 'imported', stagingCreatedByAttempt: true }] },
        'XLV'
      )
    );
    assert.ok(
      mayDeleteAfterVerification(
        { symbol: 'XLV', attempts: [{ ...base, status: 'verified', stagingCreatedByAttempt: true }] },
        'XLV'
      )
    );
  });

  test('failures are classified retryable or terminal', () => {
    assert.equal(classifyFailure('curl: (22) The requested URL returned error: 403', 22), 'terminal');
    assert.equal(classifyFailure('curl: (22) The requested URL returned error: 401', 22), 'terminal');
    assert.equal(classifyFailure('download.sh: line 30: ALPACA_API_KEY: Set ALPACA_API_KEY', 1), 'terminal');
    assert.equal(
      classifyFailure('data/XLV.csv exists; move it away first (the download appends to it)', 1),
      'terminal'
    );
    assert.equal(classifyFailure('curl: (22) The requested URL returned error: 429', 22), 'retryable');
    assert.equal(classifyFailure('curl: (22) The requested URL returned error: 503', 22), 'retryable');
    assert.equal(classifyFailure('curl: (28) Operation timed out after 30000 milliseconds', 28), 'retryable');
    assert.equal(classifyFailure('curl: (6) Could not resolve host: data.alpaca.markets', 6), 'retryable');
  });

  test('redaction and the child environment', () => {
    assert.equal(
      redact(`a ${dummy.ALPACA_API_KEY} b ${dummy.ALPACA_SECRET_KEY}`, dummy),
      'a [REDACTED:ALPACA_API_KEY] b [REDACTED:ALPACA_SECRET_KEY]'
    );

    const env = childEnvironment({ PATH: '/bin', HOME: '/h', SECRET_OTHER: 'x', NODE_OPTIONS: '--foo' }, dummy, 'data');

    assert.deepEqual(Object.keys(env).sort(), [
      'ALPACA_API_KEY',
      'ALPACA_SECRET_KEY',
      'HOME',
      'LANG',
      'OUTPUT_DIR',
      'PATH'
    ]);
  });
});

describe('the orchestrator on a temporary data directory', () => {
  test('a clean ingestion verifies, cleans the staging file and leaks no credential', async () => {
    const result = await ingestSymbol('XLV', options(fixtureRows().join('\n')));

    assert.equal(result.status, 'verified', result.reason);
    assert.ok(await fs.pathExists(path.join(dataDir, 'XLV', 'data.csv')));
    assert.ok(await fs.pathExists(path.join(dataDir, 'XLV', 'dataset-report.json')));
    assert.ok(!(await fs.pathExists(path.join(dataDir, 'XLV', 'partition-report.json'))));
    assert.ok(!(await fs.pathExists(path.join(dataDir, 'XLV.csv'))), 'the staging file is removed after verification');
    assert.equal((await fs.readFile(path.join(dataDir, 'XLV', 'data.csv'), 'utf8')).trim().split('\n').length, 12);
    await assertNoCredential();
  });

  test('a retryable failure deletes only its own partial file, and the retry does not duplicate rows', async () => {
    await fs.outputFile(path.join(root, 'fixture-mode-XLV'), '429-once');

    const result = await ingestSymbol('XLV', options(fixtureRows().join('\n')));

    assert.equal(result.status, 'verified', result.reason);
    assert.equal(result.attempts, 2);
    assert.equal((await fs.readFile(path.join(dataDir, 'XLV', 'data.csv'), 'utf8')).trim().split('\n').length, 12);
    await assertNoCredential();
  });

  test('a terminal failure stops and keeps the partial file for diagnosis', async () => {
    await fs.outputFile(path.join(root, 'fixture-mode-XLV'), '403');

    const result = await ingestSymbol('XLV', options(fixtureRows().join('\n')));

    assert.equal(result.status, 'failed');
    assert.equal(result.attempts, 1);
    assert.ok(await fs.pathExists(path.join(dataDir, 'XLV.csv')));
    assert.ok(!(await fs.pathExists(path.join(dataDir, 'XLV'))));
    await assertNoCredential();
  });

  test('an unexplained staging file and an existing canonical file are never touched', async () => {
    await fs.outputFile(path.join(dataDir, 'XLV.csv'), 'someone else’s file\n');

    const refused = await ingestSymbol('XLV', options(fixtureRows().join('\n')));

    assert.equal(refused.status, 'failed');
    assert.equal(await fs.readFile(path.join(dataDir, 'XLV.csv'), 'utf8'), 'someone else’s file\n');

    await fs.outputFile(path.join(dataDir, 'VGT', 'data.csv'), 'canonical\n');

    const exists = await ingestSymbol('VGT', options(fixtureRows().join('\n')));

    assert.equal(exists.status, 'exists');
    assert.equal(await fs.readFile(path.join(dataDir, 'VGT', 'data.csv'), 'utf8'), 'canonical\n');
  });

  test('a failed import is quarantined, not deleted, and its staging file is kept', async () => {
    const rows = fixtureRows();

    rows.splice(5, 0, rows[4]!); // a duplicated row: the scan refuses the import

    const result = await ingestSymbol('XLV', options(rows.join('\n')));

    assert.equal(result.status, 'failed');
    assert.ok(!(await fs.pathExists(path.join(dataDir, 'XLV', 'data.csv'))), 'no canonical file');
    assert.ok(await fs.pathExists(path.join(dataDir, 'XLV.csv')), 'the staging evidence is kept');

    assert.ok(result.quarantinedTo, 'the directory the import created is quarantined');
    assert.ok(await fs.pathExists(path.join(result.quarantinedTo, 'QUARANTINED.json')));
    assert.ok(
      !(await fs.pathExists(path.join(dataDir, 'XLV'))),
      'nothing unverified is left where a universe would look'
    );

    await assertNoCredential();
  });

  test('a download reaching past the study end fails', async () => {
    const result = await ingestSymbol('XLV', options(fixtureRows('2026-10-14').join('\n')));

    assert.equal(result.status, 'failed');
    assert.match(result.reason, /after the study end/);
    assert.ok(!(await fs.pathExists(path.join(dataDir, 'XLV', 'data.csv'))));
  });
});
