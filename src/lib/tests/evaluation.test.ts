// Evaluation windows and warm-up on synthetic minute bars: the partition boundaries 2024-01-01 and 2025-10-17 with
// the weekends and holidays around them, daylight saving, sparse and early-close sessions, limited history, the
// explicit-file path, the continuous `all` run, date validation, and the bounded loader matching the full one.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import { loadCsvMinuteBacktestData } from '../csv.ts';
import { resolveDataset } from '../dataset.ts';
import { loadDatasetSessions, selectRunSessions, windowInterval } from '../evaluation.ts';
import { nyseEarlyCloses, nyseHolidays } from '../calendar.ts';
import { defaultPartitionConfigText } from '../partitions.ts';
import { groupMarketSessions, newYorkOffset } from '../session.ts';

let root = '';

// Every NYSE session from `first` to `last`: bars at 9:30, 10:00 and the last regular minute, the closing print,
// and an evening extended-hours bar after 20:00 New York (the next UTC date). Sparse dates get the 9:30 bar only.
const syntheticRows = (first: string, last: string, sparse = new Set<string>()) => {
  const rows: string[] = [];
  let price = 100;

  for (let time = Date.parse(`${first}T00:00:00Z`); time <= Date.parse(`${last}T00:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = new Date(time).getUTCDay();

    if (day === 0 || day === 6 || nyseHolidays.has(date)) {
      continue;
    }

    const at = (hour: number, minute: number) => {
      const local =
        Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;
      // New York wall-clock time to UTC: the offset at noon of that date (no change happens during a session).
      const utc = local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000);

      return `"${new Date(utc * 1000).toISOString().replace('.000', '')}"`;
    };
    const close = nyseEarlyCloses.has(date) ? 13 : 16;

    price += 0.1;
    rows.push(`${at(9, 30)},${price},${price + 0.5},${price - 0.5},${price},100`);

    if (!sparse.has(date)) {
      rows.push(`${at(10, 0)},${price},${price + 0.2},${price - 0.2},${price},100`);
      rows.push(`${at(close - 1, 59)},${price},${price},${price},${price},100`);
      rows.push(`${at(close, 0)},${price},${price},${price},${price},5000`);
      rows.push(`${at(20, 30)},${price},${price},${price},${price},10`);
    }
  }

  return rows;
};

let sessions: MarketSession[] = [];
const file = () => path.join(root, 'SYN', 'data.csv');
const dataset = (partition: string) => resolveDataset('SYN', partition, root);
const dates = (list: MarketSession[]) => list.map((session) => session.date);

before(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'evaluation-test-'));
  await fs.writeFile(path.join(root, 'partitions.json'), defaultPartitionConfigText);
  await fs.outputFile(file(), `${syntheticRows('2023-06-01', '2026-01-30', new Set(['2023-12-27'])).join('\n')}\n`);
  sessions = groupMarketSessions(await loadCsvMinuteBacktestData('SYN', file()));
});

after(async () => {
  await fs.remove(root);
});

describe('the evaluation window', () => {
  test('holdout starts on 2024-01-02 (New Year’s Day is a holiday) with the 90 sessions before it as warm-up', () => {
    const run = selectRunSessions(sessions, { dataset: dataset('holdout'), warmupSessions: 90 });

    assert.equal(run.sessions[0]!.date, '2024-01-02');
    assert.equal(run.sessions.at(-1)!.date, '2025-10-16');
    assert.ok(run.sessions.every((session) => session.date >= '2024-01-01' && session.date <= '2025-10-16'));
    assert.equal(run.warmup, 90);
    assert.equal(run.history.length, run.sessions.length + 90);
    assert.equal(run.history[89]!.date, '2023-12-29', 'the last warm-up session is the Friday before');
    assert.ok(run.history.slice(0, 90).every((session) => session.date < '2024-01-01'));
    assert.equal(run.history[90], run.sessions[0], 'the same session objects');
    assert.deepEqual(run.report!.warmup, {
      requiredSessions: 90,
      sessions: 90,
      firstDate: run.history[0]!.date,
      lastDate: '2023-12-29',
      sufficient: true,
      note: 'the 90 sessions before 2024-01-02, read for indicators only: no orders, positions, interest, P&L or drawdown'
    });
    assert.equal(run.report!.mode, 'isolated partition');
    assert.deepEqual(run.report!.partitionInterval, { start: '2024-01-01', end: '2025-10-16' });
  });

  test('final starts on Friday 2025-10-17 and its warm-up ends on 2025-10-16, the last holdout session', () => {
    const run = selectRunSessions(sessions, { dataset: dataset('final'), warmupSessions: 74 });

    assert.equal(run.sessions[0]!.date, '2025-10-17');
    assert.equal(run.history[run.warmup - 1]!.date, '2025-10-16');
    assert.equal(run.warmup, 74);
    assert.equal(run.sessions.at(-1)!.date, sessions.at(-1)!.date);
  });

  test('a sparse session (one bar) is a session of the warm-up; an early close is a session', () => {
    const run = selectRunSessions(sessions, { dataset: dataset('holdout'), warmupSessions: 90 });
    const sparse = run.history.find((session) => session.date === '2023-12-27')!;

    assert.equal(sparse.bars.length, 1);
    assert.equal(sparse.closingPrint, undefined);
    assert.ok(run.sessions.some((session) => session.date === '2024-07-03' && session.isEarlyClose));
  });

  test('daylight saving: sessions keep their New York dates and evening bars stay out of the session', () => {
    const march = sessions.filter((session) => session.date >= '2024-03-08' && session.date <= '2024-03-11');

    assert.deepEqual(dates(march), ['2024-03-08', '2024-03-11']);
    // 9:30 New York is 14:30 UTC in EST and 13:30 UTC in EDT; the 20:30 bars (next UTC date) are extended hours.
    assert.equal(new Date(march[0]!.bars[0]!.time * 1000).toISOString(), '2024-03-08T14:30:00.000Z');
    assert.equal(new Date(march[1]!.bars[0]!.time * 1000).toISOString(), '2024-03-11T13:30:00.000Z');
    assert.equal(march[1]!.bars.length, 3);
  });

  test('training has no history before its window: the warm-up is reported as insufficient', () => {
    const run = selectRunSessions(sessions, { dataset: dataset('training'), warmupSessions: 90 });

    assert.equal(run.warmup, 0);
    assert.equal(run.sessions[0]!.date, sessions[0]!.date);
    assert.equal(run.report!.warmup.sufficient, false);
    assert.match(run.report!.warmup.note, /no session before 2023-06-01 in the file: entries wait for 90 sessions/);

    const limited = selectRunSessions(sessions, {
      dataset: dataset('training'),
      startDate: '2023-07-03',
      warmupSessions: 90
    });

    assert.equal(limited.warmup, 21);
    assert.match(limited.report!.warmup.note, /only 21 of 90 sessions before 2023-07-03/);
  });

  test('dates narrow the window inside the partition and may not leave it', () => {
    const run = selectRunSessions(sessions, {
      dataset: dataset('holdout'),
      startDate: '2024-06-03',
      endDate: '2024-06-28',
      warmupSessions: 10
    });

    assert.equal(run.sessions[0]!.date, '2024-06-03');
    assert.equal(run.sessions.at(-1)!.date, '2024-06-28');
    assert.equal(run.history[0]!.date, '2024-05-17', 'the warm-up may come from the same partition');
    assert.deepEqual([run.report!.requestedStart, run.report!.requestedEnd], ['2024-06-03', '2024-06-28']);

    assert.throws(
      () => windowInterval('training', { start: '2016-01-01', end: '2023-12-31' }, undefined, '2025-10-13'),
      /end date 2025-10-13 is outside the training partition/
    );
    assert.throws(
      () => selectRunSessions(sessions, { dataset: dataset('holdout'), startDate: '2023-12-29' }),
      /outside the holdout partition/
    );
    assert.throws(
      () => selectRunSessions(sessions, { dataset: dataset('final'), startDate: '2025-10-16' }),
      /outside the final partition/
    );
    assert.throws(
      () => selectRunSessions(sessions, { dataset: dataset('holdout'), startDate: '2024-6-3' }),
      /YYYY-MM-DD/
    );
    assert.throws(
      () => selectRunSessions(sessions, { dataset: dataset('holdout'), startDate: '2024-02-30' }),
      /YYYY-MM-DD/
    );
    assert.throws(
      () =>
        selectRunSessions(sessions, { dataset: dataset('holdout'), startDate: '2024-06-03', endDate: '2024-06-01' }),
      /after the end date/
    );
    assert.throws(
      () =>
        selectRunSessions(sessions, { dataset: dataset('holdout'), startDate: '2024-06-01', endDate: '2024-06-02' }),
      /has no SYN session in holdout/
    );
  });

  test('all is the whole file as one continuous run', () => {
    const run = selectRunSessions(sessions, { dataset: dataset('all'), warmupSessions: 90 });

    assert.equal(run.sessions.length, sessions.length);
    assert.equal(run.warmup, 0);
    assert.equal(run.report!.mode, 'continuous all');
    assert.equal(
      selectRunSessions(sessions, { dataset: dataset('all'), startDate: '2024-01-02' }).report!.mode,
      'isolated partition'
    );
  });

  test('an explicit file keeps the original date filter, with no warm-up and no report', () => {
    const explicit = resolveDataset('SYN', file(), path.join(root, 'elsewhere'));
    const run = selectRunSessions(sessions, {
      dataset: explicit,
      startDate: '2024-01-02',
      endDate: '2024-02-01',
      warmupSessions: 90
    });

    assert.equal(explicit.partition, undefined);
    assert.equal(run.warmup, 0);
    assert.equal(run.report, undefined);
    assert.equal(run.history, run.sessions);
    assert.deepEqual(
      dates(run.sessions),
      dates(sessions.filter((session) => session.date >= '2024-01-02' && session.date <= '2024-02-01'))
    );
  });
});

describe('optimization access', () => {
  test('an optimization input is the training partition, refused otherwise before any data is read', async () => {
    const run = selectRunSessions(sessions, {
      dataset: dataset('training'),
      warmupSessions: 90,
      access: 'optimization'
    });

    assert.equal(run.report!.access, 'optimization');
    assert.equal(selectRunSessions(sessions, { dataset: dataset('holdout') }).report!.access, 'manual evaluation');

    for (const partition of ['holdout', 'final', 'all']) {
      assert.throws(
        () => selectRunSessions(sessions, { dataset: dataset(partition), access: 'optimization' }),
        /training partition only/
      );
      await assert.rejects(
        loadDatasetSessions({ dataset: { ...dataset(partition), file: '/nonexistent.csv' }, access: 'optimization' }),
        /training partition only/,
        'refused before the file is opened'
      );
    }

    assert.throws(
      () =>
        selectRunSessions(sessions, { dataset: resolveDataset('SYN', file(), '/elsewhere'), access: 'optimization' }),
      /not the explicit file/
    );
  });
});

describe('the bounded loader', () => {
  test('loads the same window and warm-up as the whole file, and nothing after the window', async () => {
    for (const [partition, warmupSessions] of [
      ['training', 90],
      ['holdout', 90],
      ['holdout', 250],
      ['final', 74],
      ['all', 0]
    ] as const) {
      const bounded = await loadDatasetSessions({ dataset: dataset(partition), warmupSessions });
      const full = selectRunSessions(sessions, { dataset: dataset(partition), warmupSessions });

      assert.deepEqual(bounded.history, full.history, `${partition} ${warmupSessions}`);
      assert.equal(bounded.warmup, full.warmup);
      assert.match(bounded.report!.dataSha256!, /^[0-9a-f]{64}$/);
    }

    const stats = { before: 0, after: 0 };
    const ticks = await loadCsvMinuteBacktestData('SYN', file(), {
      fromTime: Date.parse('2024-01-01T00:00:00Z') / 1000,
      toTime: Date.parse('2024-01-03T00:00:00Z') / 1000,
      stats
    });

    assert.ok(stats.before > 0 && stats.after > 0);
    assert.ok(ticks.every((tick) => tick.time >= Date.parse('2024-01-01T00:00:00Z') / 1000));

    const holdout = await loadDatasetSessions({ dataset: dataset('holdout'), warmupSessions: 90 });

    assert.ok(
      holdout.history.every((session) => session.date <= '2025-10-16'),
      'no final-partition session is read'
    );
  });
});
