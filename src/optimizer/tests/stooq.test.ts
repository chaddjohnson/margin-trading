// Stooq acquisition: URL mapping, link resolution, response classification, retries, caching modes,
// provenance, and the exact header-removal and delimiter conversion checked through the optimizer's loader.
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import fs from 'fs-extra';
import { loadCsvBacktestData } from '#lib';
import { dataPaths, prepareData, readManifest, validateCachedData } from '../data/prepare.ts';
import {
  type Fetcher,
  directCsvUrl,
  downloadStooqDaily,
  findCsvLink,
  historicalPageUrl,
  stooqSymbol
} from '../data/stooq.ts';
import { StooqFormatError, transformStooqBulkTxt, transformStooqPageCsv } from '../data/transform.ts';
import { tempDir } from './helpers.ts';

const pageHtml = (symbol: string) =>
  `<html><body><table><tr><td><a href="q/d/l/?s=${symbol}&amp;f=20050101&amp;t=20261015&amp;i=d" id=c>Download data in csv file...</a></td></tr></table></body></html>`;
const challenge =
  '<!DOCTYPE html><html><head></head><body><noscript>This site requires JavaScript to verify your browser.</noscript><script>fetch("/__verify")</script></body></html>';
const csv =
  'Date,Open,High,Low,Close,Volume\n2005-01-03,10.5,10.9,10.1,10.2,1000\n2005-01-04,10.2,10.4,9.9,10.0,1500.5\n';
const semicolonCsv =
  'Date;Open;High;Low;Close;Volume\r\n2005-01-03;10.5;10.9;10.1;10.2;1000\r\n2005-01-04;10.2;10.4;9.9;10.0;1500.5';

const scripted = (
  responses: Record<string, { status: number; body: string }[] | Error>
): Fetcher & { calls: string[] } => {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(url);

    const key = Object.keys(responses).find((prefix) => url.startsWith(prefix))!;
    const queue = responses[key]!;

    if (queue instanceof Error) {
      throw queue;
    }

    const response = queue.length > 1 ? queue.shift()! : queue[0]!;

    return { status: response.status, contentType: 'text/plain', body: response.body };
  }) as unknown as Fetcher & { calls: string[] };

  fetcher.calls = calls;

  return fetcher;
};

const noSleep = async () => {};

describe('Stooq URLs', () => {
  it('maps symbols and reproduces the reference page URL exactly', () => {
    assert.equal(stooqSymbol('VGT'), 'vgt.us');
    assert.equal(stooqSymbol('IGV'), 'igv.us');
    assert.equal(stooqSymbol('XLY'), 'xly.us');
    assert.equal(stooqSymbol('IWN'), 'iwn.us');
    assert.equal(
      historicalPageUrl('VGT', '2005-01-01', '2026-10-15'),
      'https://stooq.com/q/d/?f=20050101&t=20261015&s=vgt.us&c=1'
    );
    assert.equal(
      directCsvUrl('VGT', '2005-01-01', '2026-10-15'),
      'https://stooq.com/q/d/l/?s=vgt.us&f=20050101&t=20261015&i=d'
    );
    assert.throws(() => historicalPageUrl('VGT', '20050101', '2026-10-15'));
  });

  it('follows the "Download data in csv file" link from the page', () => {
    const page = historicalPageUrl('VGT', '2005-01-01', '2026-10-15');

    const expected = 'https://stooq.com/q/d/l/?s=vgt.us&f=20050101&t=20261015&i=d';

    assert.equal(findCsvLink(pageHtml('vgt.us'), page), expected);
    assert.equal(findCsvLink(pageHtml('vgt.us').replace('href="q/d/l/', 'href="/q/d/l/'), page), expected);
    assert.equal(
      findCsvLink(`<html><head><base href="https://stooq.com/"></head>${pageHtml('vgt.us').slice(6)}`, page),
      expected
    );
    assert.equal(
      findCsvLink('<a href=q/d/l/?s=vgt.us&amp;i=d>Download data in csv file...</a>', page),
      'https://stooq.com/q/d/l/?s=vgt.us&i=d'
    );
    assert.equal(findCsvLink('<html><body>nothing</body></html>', page), undefined);
  });
});

describe('Stooq downloads', () => {
  it('downloads through the page link', async () => {
    const fetcher = scripted({
      'https://stooq.com/q/d/?': [{ status: 200, body: pageHtml('vgt.us') }],
      'https://stooq.com/q/d/l/': [{ status: 200, body: csv }]
    });
    const result = await downloadStooqDaily('VGT', '2005-01-01', '2026-10-15', { fetcher, sleep: noSleep });

    assert.equal(result.ok, true);
    assert.equal(result.body, csv);
    assert.equal(result.csvUrl, 'https://stooq.com/q/d/l/?s=vgt.us&f=20050101&t=20261015&i=d');
  });

  it('reports a browser-verification challenge as blocked, without retrying', async () => {
    const fetcher = scripted({ 'https://stooq.com/q/d/?': [{ status: 200, body: challenge }] });
    const result = await downloadStooqDaily('VGT', '2005-01-01', '2026-10-15', { fetcher, sleep: noSleep });

    assert.equal(result.ok, false);
    assert.equal(result.failure, 'blocked');
    assert.equal(fetcher.calls.length, 1);
  });

  it('reports a 403 as blocked', async () => {
    const fetcher = scripted({
      'https://stooq.com/q/d/?': [{ status: 403, body: '<html><body>Forbidden</body></html>' }]
    });
    const result = await downloadStooqDaily('VGT', '2005-01-01', '2026-10-15', { fetcher, sleep: noSleep });

    assert.equal(result.failure, 'blocked');
    assert.match(result.attempts[0]!.detail, /Forbidden/);
  });

  it('retries transient failures with backoff, then succeeds', async () => {
    const waits: number[] = [];
    const fetcher = scripted({
      'https://stooq.com/q/d/?': [
        { status: 503, body: 'busy' },
        { status: 429, body: '' },
        { status: 200, body: pageHtml('vgt.us') }
      ],
      'https://stooq.com/q/d/l/': [{ status: 200, body: csv }]
    });
    const result = await downloadStooqDaily('VGT', '2005-01-01', '2026-10-15', {
      fetcher,
      retries: 2,
      backoffMs: 100,
      sleep: async (ms) => {
        waits.push(ms);
      }
    });

    assert.equal(result.ok, true);
    assert.deepEqual(waits, [100, 200]);
  });

  it('gives up after bounded retries on network errors', async () => {
    const fetcher = scripted({ 'https://stooq.com/': new Error('ECONNRESET') });
    const result = await downloadStooqDaily('VGT', '2005-01-01', '2026-10-15', { fetcher, retries: 2, sleep: noSleep });

    assert.equal(result.ok, false);
    assert.equal(result.failure, 'network_error');
    assert.equal(fetcher.calls.length, 3);
  });

  it('never accepts HTML, "No data" or the daily-limit page as CSV', async () => {
    for (const [body, failure] of [
      ['<!DOCTYPE html><html><body>error</body></html>', 'not_csv'],
      ['No data', 'no_data'],
      ['Exceeded the daily hits limit', 'rate_limited']
    ] as const) {
      const fetcher = scripted({
        'https://stooq.com/q/d/?': [{ status: 200, body: pageHtml('vgt.us') }],
        'https://stooq.com/q/d/l/': [{ status: 200, body }]
      });
      const result = await downloadStooqDaily('VGT', '2005-01-01', '2026-10-15', {
        fetcher,
        retries: 0,
        sleep: noSleep
      });

      assert.equal(result.failure, failure, body);
    }
  });

  it('reports a page without a CSV link', async () => {
    const fetcher = scripted({
      'https://stooq.com/q/d/?': [{ status: 200, body: '<html><body>symbol not found</body></html>' }]
    });
    const result = await downloadStooqDaily('XXXX', '2005-01-01', '2026-10-15', { fetcher, sleep: noSleep });

    assert.equal(result.failure, 'no_csv_link');
  });
});

describe('transformation', () => {
  it('removes exactly the header row and keeps the first observation (comma source)', () => {
    const result = transformStooqPageCsv(csv);

    assert.deepEqual(result.lines, ['2005-01-03|10.5|10.9|10.1|10.2|1000', '2005-01-04|10.2|10.4|9.9|10.0|1500.5']);
    assert.equal(result.sourceRows, 2);
    assert.equal(result.delimiter, ',');
  });

  it('replaces every ";" with "|" (CRLF, no final newline)', () => {
    const result = transformStooqPageCsv(semicolonCsv);

    assert.equal(result.text, '2005-01-03|10.5|10.9|10.1|10.2|1000\n2005-01-04|10.2|10.4|9.9|10.0|1500.5\n');
    assert.equal(result.delimiter, ';');
    assert.equal(result.lineEnding, 'CRLF');
    assert.ok(!result.text.includes(';'));
  });

  it('accepts LF with a final newline and the Polish header', () => {
    const result = transformStooqPageCsv(
      'Data;Otwarcie;Najwyzszy;Najnizszy;Zamkniecie;Wolumen\n2005-01-03;1;2;0.5;1.5;10\n'
    );

    assert.deepEqual(result.lines, ['2005-01-03|1|2|0.5|1.5|10']);
  });

  it('rejects duplicate headers, blank rows, missing volume, decimal commas, quotes and HTML', () => {
    for (const bad of [
      `${csv}Date,Open,High,Low,Close,Volume\n`,
      'Date,Open,High,Low,Close,Volume\n2005-01-03,1,2,0.5,1.5,10\n\n2005-01-04,1,2,0.5,1.5,10\n',
      'Date,Open,High,Low,Close\n2005-01-03,1,2,0.5,1.5\n',
      'Date;Open;High;Low;Close;Volume\n2005-01-03;1,5;2;0,5;1,5;10\n',
      'Date,Open,High,Low,Close,Volume\n2005-01-03,"1,5",2,0.5,1.5,10\n',
      challenge,
      'Date,Open,High,Low,Close,Volume\n',
      ''
    ]) {
      assert.throws(() => transformStooqPageCsv(bad), StooqFormatError, JSON.stringify(bad.slice(0, 60)));
    }
  });

  it('converts the bulk archive layout with an explicit field mapping', () => {
    const text =
      '<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>\r\nVGT.US,D,20050225,000000,4.81978,4.84669,4.81978,4.84669,6438.53,0\r\n';

    assert.deepEqual(transformStooqBulkTxt(text, 'VGT.US').lines, [
      '2005-02-25|4.81978|4.84669|4.81978|4.84669|6438.53'
    ]);
    assert.throws(() => transformStooqBulkTxt(text, 'XLK.US'), StooqFormatError);
  });

  it('produces files the optimizer loader reads back exactly', async () => {
    const dir = await tempDir('loader');
    const file = path.join(dir, 'x.csv');

    await fs.writeFile(file, transformStooqPageCsv(semicolonCsv).text);

    const ticks = await loadCsvBacktestData('X', file);

    assert.equal(ticks.length, 2);
    assert.deepEqual(
      ticks.map((tick) => [
        new Date(tick.time * 1000).toISOString().slice(0, 10),
        tick.open,
        tick.high,
        tick.low,
        tick.close,
        tick.volume
      ]),
      [
        ['2005-01-03', 10.5, 10.9, 10.1, 10.2, 1000],
        ['2005-01-04', 10.2, 10.4, 9.9, 10.0, 1500.5]
      ]
    );
  });
});

describe('preparation pipeline', () => {
  const blocked = scripted({ 'https://stooq.com/q/d/?': [{ status: 200, body: challenge }] });

  it('falls back to a browser download in the inbox, records provenance and checks parity', async () => {
    const dir = await tempDir('prepare');
    const paths = dataPaths(dir);

    await fs.ensureDir(paths.inbox);
    await fs.writeFile(path.join(paths.inbox, 'tst_us_d.csv'), semicolonCsv);

    const manifest = await prepareData({
      dataDir: dir,
      symbols: ['TST'],
      startDate: '2005-01-01',
      endDate: '2026-10-15',
      mode: 'missing',
      http: { fetcher: blocked, sleep: noSleep },
      requestSpacingMs: 0
    });
    const entry = manifest.entries.TST!;

    assert.equal(entry.status, 'ok');
    assert.equal(entry.source, 'stooq-manual-download');
    assert.equal(entry.attempts[0]!.status, 'blocked');
    assert.equal(entry.parity!.mismatches, 0);
    assert.equal(entry.processed!.firstDate, '2005-01-03');
    assert.equal(entry.raw!.delimiter, ';');
    assert.equal(await fs.readFile(entry.raw!.path, 'utf8'), semicolonCsv, 'the raw copy must be byte-identical');
    assert.equal(
      await fs.readFile(entry.processed!.path, 'utf8'),
      '2005-01-03|10.5|10.9|10.1|10.2|1000\n2005-01-04|10.2|10.4|9.9|10.0|1500.5\n'
    );
  });

  it('reuses a valid cache, refreshes on request, works offline, regenerates and detects tampering', async () => {
    const dir = await tempDir('modes');
    const paths = dataPaths(dir);
    const options = {
      dataDir: dir,
      symbols: ['TST'],
      startDate: '2005-01-01',
      endDate: '2026-10-15',
      requestSpacingMs: 0
    };

    await fs.ensureDir(paths.inbox);
    await fs.writeFile(path.join(paths.inbox, 'tst_us_d.csv'), csv);
    await prepareData({ ...options, mode: 'offline' });

    const counting = scripted({ 'https://stooq.com/q/d/?': [{ status: 200, body: challenge }] });

    await prepareData({ ...options, mode: 'missing', http: { fetcher: counting, sleep: noSleep } });
    assert.equal(counting.calls.length, 0, 'a valid cache must not trigger a download');

    await prepareData({ ...options, mode: 'refresh', http: { fetcher: counting, sleep: noSleep } });
    assert.equal(counting.calls.length, 1, 'refresh must try the network first');

    const before = (await readManifest(paths.manifest)).entries.TST!.processed!.sha256;

    await fs.writeFile(paths.processed('TST'), 'tampered\n');
    assert.equal((await validateCachedData(['TST'], () => {}, dir))[0]!.ok, false);

    await prepareData({ ...options, mode: 'regenerate' });
    assert.equal((await readManifest(paths.manifest)).entries.TST!.processed!.sha256, before);
    assert.equal((await validateCachedData(['TST'], () => {}, dir))[0]!.ok, true);
  });

  it('records a failure with every attempt instead of dropping the symbol', async () => {
    const dir = await tempDir('failure');
    const manifest = await prepareData({
      dataDir: dir,
      symbols: ['NONE'],
      startDate: '2005-01-01',
      endDate: '2026-10-15',
      mode: 'missing',
      http: { fetcher: blocked, sleep: noSleep },
      requestSpacingMs: 0
    });
    const entry = manifest.entries.NONE!;

    assert.equal(entry.status, 'failed');
    assert.match(entry.failureReason!, /stooq-http: blocked/);
    assert.match(entry.failureReason!, /stooq-manual-download: absent/);
  });
});
