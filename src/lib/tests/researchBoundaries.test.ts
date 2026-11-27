// Explicit research date boundaries and append-only canonical data (standard 4.0.0 §1.3, §1.12–§1.14), on synthetic
// minute files only (no market prices reach any test): the authoritative ranges do not move when data are appended; the
// formal stages ('development', 'validation') never read past their authorized ends, at data access; a pinned input
// stays exactly the same input after an append; manual runs see the appended sessions and respect custom boundaries;
// the common complete endpoint of several files is the earliest complete session; the prefix and coverage helpers
// follow New York session dates (evening bars on the next UTC date, early closes, holidays).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import {
  commonCompleteEndpoint,
  historicalPin,
  prefixThroughDate,
  sha256Prefix,
  tailStatus,
  verifyBytePin,
  type VintageRegistry
} from '../canonicalPrefix.ts';
import { resolveDataset } from '../dataset.ts';
import { loadDatasetSessions } from '../evaluation.ts';
import { defaultPartitionConfigText } from '../partitions.ts';
import {
  parseResearchRanges,
  readResearchRanges,
  researchRange,
  researchRangesFile,
  researchWindow
} from '../researchRanges.ts';
import { csvText, nyTime, sessionsBetween, syntheticRows } from './fixtures/syntheticMinutes.ts';

let root = '';
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const file = (symbol = 'SYN') => path.join(root, symbol, 'data.csv');
const write = (rows: string[], symbol = 'SYN') => {
  fs.ensureDirSync(path.join(root, symbol));
  fs.writeFileSync(file(symbol), csvText(rows));
};
const append = (rows: string[], symbol = 'SYN') => fs.appendFileSync(file(symbol), csvText(rows));
const load = (o: Record<string, unknown>) =>
  loadDatasetSessions({ dataset: resolveDataset('SYN', 'all', root), splits: [], ...o } as Parameters<
    typeof loadDatasetSessions
  >[0]);

// The formal windows' edges and the sessions appended after the validation end.
const history = [...sessionsBetween('2024-12-23', '2025-01-10'), ...sessionsBetween('2026-10-26', '2026-10-30')];
const appended = sessionsBetween('2026-11-02', '2026-11-27'); // includes Thanksgiving week: 11-26 holiday, 11-27 early close

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-boundaries-'));
  fs.writeFileSync(path.join(root, 'partitions.json'), defaultPartitionConfigText);
});
after(() => fs.removeSync(root));

describe('the authoritative research date ranges (config/research/date-ranges.json)', () => {
  test('R1 is in force: development 2016-01-04 → 2024-12-31, validation 2025-01-01 → 2026-10-30 (never edited)', () => {
    const all = readResearchRanges();
    const r1 = all.ranges.find((r) => r.id === 'R1')!;

    assert.equal(all.current, 'R1');
    assert.deepEqual(
      [r1.development, r1.validation],
      [
        { from: '2016-01-04', to: '2024-12-31' },
        { from: '2025-01-01', to: '2026-10-30' }
      ]
    );
    assert.equal(r1.sessions?.validationFirst, '2025-01-02');
    assert.match(r1.authorization, /2026-11-27/);
  });

  test('appending market data changes neither the optimization nor the validation window', () => {
    write(syntheticRows(history));
    const before = [
      researchWindow('development'),
      researchWindow('validation'),
      sha(fs.readFileSync(researchRangesFile))
    ];

    append(syntheticRows(appended, { start: 200 }));
    assert.deepEqual(
      [researchWindow('development'), researchWindow('validation'), sha(fs.readFileSync(researchRangesFile))],
      before
    );
    assert.equal(researchWindow('validation').to, '2026-10-30');
    assert.equal(researchWindow('development').to, '2024-12-31');
  });

  test('a formal end after the authorized end is refused; an earlier one (a study cutoff) is allowed', () => {
    assert.throws(
      () => researchWindow('validation', '2026-11-25'),
      /validation window ends 2026-10-30 \(research date range R1/
    );
    assert.throws(() => researchWindow('development', '2025-01-02'), /development window ends 2024-12-31/);
    assert.deepEqual(researchWindow('development', '2021-12-31'), {
      from: '2016-01-04',
      to: '2021-12-31',
      range: 'R1'
    });
  });

  test('a new range needs the user’s authorization, ordered windows and calendar coverage; ids stay unique', () => {
    const base = JSON.parse(fs.readFileSync(researchRangesFile, 'utf8'));
    const withRange = (r: Record<string, unknown>, current = 'R2') =>
      JSON.stringify({
        ...base,
        current,
        ranges: [
          ...base.ranges,
          {
            id: 'R2',
            effective: '2026-12-01',
            development: { from: '2016-01-04', to: '2024-12-31' },
            validation: { from: '2025-01-01', to: '2026-11-25' },
            authorization: 'the user, 2026-12-01',
            ...r
          }
        ]
      });

    assert.equal(parseResearchRanges(withRange({})).current, 'R2');
    assert.throws(() => parseResearchRanges(withRange({ authorization: '' })), /authorization/);
    assert.throws(
      () => parseResearchRanges(withRange({ validation: { from: '2024-06-01', to: '2026-11-25' } })),
      /must end before the validation window starts/
    );
    assert.throws(
      () => parseResearchRanges(withRange({ validation: { from: '2025-01-01', to: '2027-01-29' } })),
      /NYSE calendar/
    );
    assert.throws(() => parseResearchRanges(withRange({ id: 'R1' })), /unique id/);
    assert.throws(() => parseResearchRanges(withRange({}, 'R7')), /current must name/);
    // the range in force stays R1 until such an entry is deliberately made current
    assert.equal(researchRange().id, 'R1');
  });
});

describe('formal stages read only through their authorized ends, at data access', () => {
  test('validation: the window ends 2026-10-30 although rows through 2026-11-27 exist; only the bytes through it are read', async () => {
    write(syntheticRows(history));
    const pre = fs.readFileSync(file());

    append(syntheticRows(appended, { start: 200 }));
    // rows after the boundary that would fail any parse: never read by the formal stage
    fs.appendFileSync(file(), 'not,a,row\n');

    const v = await load({ access: 'validation' });

    assert.equal(v.sessions.at(-1)!.date, '2026-10-30');
    assert.ok(!v.history.some((s) => s.date > '2026-10-30'));
    assert.deepEqual(v.report!.researchRange, { id: 'R1', stage: 'validation', authorizedEnd: '2026-10-30' });
    assert.equal(v.report!.dataPrefix!.bytes, pre.length);
    assert.equal(v.report!.dataSha256, sha(pre));
    assert.equal(v.report!.dataPrefix!.pinned, false);
    // a manual run of the same file parses everything and meets the bad row
    await assert.rejects(load({ access: 'manual evaluation' }), /expected 6 fields|not an ISO|is not a number/);
  });

  test('validation: an end after the authorized end is refused before a byte is read', async () => {
    await assert.rejects(
      loadDatasetSessions({
        dataset: { ...resolveDataset('SYN', 'all', root), file: path.join(root, 'missing.csv') },
        access: 'validation',
        endDate: '2026-11-25'
      }),
      /validation window ends 2026-10-30/
    );
    await assert.rejects(
      load({ access: 'validation', startDate: '2025-01-02', endDate: '2026-11-03' }),
      /research date range R1/
    );
  });

  test('development: the window ends 2024-12-31; a later end, the legacy partitions and explicit files are refused', async () => {
    write(syntheticRows([...history, ...appended]));

    const d = await load({ access: 'development' });

    assert.equal(d.sessions.at(-1)!.date, '2024-12-31');
    assert.ok(!d.history.some((s) => s.date > '2024-12-31'));
    await assert.rejects(load({ access: 'development', endDate: '2025-01-02' }), /development window ends 2024-12-31/);
    await assert.rejects(
      loadDatasetSessions({ dataset: resolveDataset('SYN', 'training', root), access: 'validation' }),
      /reads the canonical file by the research date ranges \(partition all\), not the training partition/
    );
    fs.copyFileSync(file(), path.join(root, 'other.csv')); // an explicit file (the canonical path itself resolves to all)
    await assert.rejects(
      loadDatasetSessions({
        dataset: resolveDataset('SYN', path.join(root, 'other.csv'), root),
        access: 'development'
      }),
      /not the explicit file/
    );
  });

  test('optimization (the legacy access) still reads the training partition only', async () => {
    await assert.rejects(load({ access: 'optimization' }), /training partition only, not 'all'/);
  });

  test('a formal stage refuses data that do not cover its end completely', async () => {
    write(syntheticRows(sessionsBetween('2026-10-26', '2026-10-29')));
    await assert.rejects(
      load({ access: 'validation', startDate: '2026-10-26' }),
      /does not cover the validation end 2026-10-30 completely/
    );
    write(syntheticRows(sessionsBetween('2026-10-26', '2026-10-30'), { partialLast: true }));
    await assert.rejects(
      load({ access: 'validation', startDate: '2026-10-26' }),
      /latest complete session is 2026-10-29/
    );
    write(syntheticRows(sessionsBetween('2026-10-26', '2026-10-30')));
    assert.equal((await load({ access: 'validation', startDate: '2026-10-26' })).sessions.at(-1)!.date, '2026-10-30');
  });
});

describe('pinned inputs stay the same input after an append', () => {
  test('a pin loads the identical sessions, reports the pinned sha256 and never reads the appended rows', async () => {
    write(syntheticRows(history));
    const pre = fs.readFileSync(file());
    const pin = { bytes: pre.length, sha256: sha(pre) };
    const whole = await load({ startDate: '2024-12-23', endDate: '2026-10-30' });

    append(syntheticRows(appended, { start: 200 }));
    fs.appendFileSync(file(), 'not,a,row\n');

    const pinned = await load({ startDate: '2024-12-23', endDate: '2026-10-30', pin });

    assert.deepEqual(pinned.history, whole.history);
    assert.equal(pinned.report!.dataSha256, whole.report!.dataSha256);
    assert.deepEqual(pinned.report!.dataPrefix, {
      bytes: pre.length,
      fileBytes: fs.statSync(file()).size,
      pinned: true
    });
  });

  test('a changed historical byte, a cut inside a row or a shorter file fails the pin', async () => {
    write(syntheticRows(history));
    const pre = fs.readFileSync(file());
    const pin = { bytes: pre.length, sha256: sha(pre) };

    fs.writeFileSync(
      file(),
      Buffer.concat([pre.subarray(0, 40), Buffer.from(pre[40] === 0x31 ? '2' : '1'), pre.subarray(41)])
    );
    await assert.rejects(load({ pin }), /the historical rows changed/);
    write(syntheticRows(history));
    assert.throws(
      () => verifyBytePin(file(), { bytes: 30, sha256: sha(pre.subarray(0, 30)) }),
      /does not end at a row boundary/
    );
    fs.writeFileSync(file(), pre.subarray(0, 100));
    assert.throws(() => verifyBytePin(file(), pin), /fewer than the pinned prefix/);
  });

  test('historicalPin resolves a whole-file pin to the recorded vintage once rows are appended', () => {
    write(syntheticRows(history));
    const pre = fs.readFileSync(file());
    const registry: VintageRegistry = {
      kind: 'canonical data vintages',
      schema: 1,
      description: 'test',
      symbols: {
        SYN: [
          {
            bytes: pre.length,
            rows: 1,
            sha256: sha(pre),
            lastRowUtc: '',
            latestCompleteSession: '2026-10-30',
            recorded: 'test'
          }
        ]
      }
    };

    assert.deepEqual(historicalPin(file(), 'SYN', sha(pre), registry), { bytes: pre.length, sha256: sha(pre) });
    append(syntheticRows(appended, { start: 200 }));
    assert.deepEqual(historicalPin(file(), 'SYN', sha(pre), registry), { bytes: pre.length, sha256: sha(pre) });
    assert.equal(historicalPin(file(), 'SYN', sha('another file'), registry), undefined);
  });
});

describe('manual runs: all available data and custom dates', () => {
  test('a manual run of the whole file includes the appended sessions; a custom window keeps its exact boundaries', async () => {
    write(syntheticRows([...history, ...appended]));

    const all = await load({});

    assert.equal(all.sessions.at(-1)!.date, '2026-11-27');
    assert.equal(all.report!.access, 'manual evaluation');
    assert.equal(all.report!.dataPrefix, undefined);

    const custom = await load({ startDate: '2025-01-03', endDate: '2026-11-03' });

    assert.equal(custom.sessions[0]!.date, '2025-01-03');
    assert.equal(custom.sessions.at(-1)!.date, '2026-11-03');
    assert.ok(custom.sessions.every((s) => s.date >= '2025-01-03' && s.date <= '2026-11-03'));
  });
});

describe('byte prefixes and coverage follow New York session dates', () => {
  test('the prefix through a date ends at the last row of that New York date (an EST evening bar is on the next UTC date)', () => {
    write(syntheticRows([...history, ...appended]));

    const p = prefixThroughDate(file(), '2026-11-02');

    assert.equal(p.lastRowUtc, nyTime('2026-11-02', 19, 30));
    assert.equal(p.lastRowUtc, '2026-11-03T00:30:00Z');
    assert.equal(p.lastDate, '2026-11-02');
    assert.equal(p.nextRowUtc, nyTime('2026-11-03', 9, 30));
    assert.equal(p.sha256, sha256Prefix(file(), p.bytes));
    // EDT before the 2026-11-01 change: the evening bar is on the same UTC date
    assert.equal(prefixThroughDate(file(), '2026-10-30').lastRowUtc, '2026-10-30T23:30:00Z');
    // a weekend or holiday end holds everything through the previous session
    assert.equal(prefixThroughDate(file(), '2026-11-26').lastDate, '2026-11-25');
  });

  test('the latest complete session: an early close completes at 1:00 p.m.; a session without its close does not count', () => {
    write(syntheticRows(appended));
    assert.equal(tailStatus(file()).latestCompleteSession, '2026-11-27'); // early close, 13:00 print present
    write(syntheticRows(appended, { partialLast: true }));
    assert.deepEqual(
      [tailStatus(file()).latestCompleteSession, tailStatus(file()).incomplete?.date],
      ['2026-11-25', '2026-11-27']
    );
  });

  test('several files: the common complete endpoint is the earliest complete session, naming the limiting file', () => {
    write(syntheticRows([...history, ...sessionsBetween('2026-11-02', '2026-11-25')]), 'AAA');
    write(syntheticRows(history), 'BBB');

    const c = commonCompleteEndpoint(['AAA', 'BBB'], root);

    assert.deepEqual([c.endpoint, c.limitedBy], ['2026-10-30', ['BBB']]);
    append(syntheticRows(sessionsBetween('2026-11-02', '2026-11-25'), { start: 300 }), 'BBB');
    assert.deepEqual(
      [commonCompleteEndpoint(['AAA', 'BBB'], root).endpoint, commonCompleteEndpoint(['AAA', 'BBB'], root).limitedBy],
      ['2026-11-25', ['AAA', 'BBB']]
    );
  });
});
