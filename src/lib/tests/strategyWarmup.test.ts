// Warm-up in a real strategy file (src/app/allIn-trailingBuy.ts through src/app.ts) on synthetic minute bars, in a
// temporary working directory whose data/ holds partitions.json and two canonical files:
// - SYA rises through 2023, then dips more than 10% below its 90-session high on 2024-01-03 and rebounds: the isolated
//   holdout run, warmed up on 2023, arms and buys in January; the same bars without the warm-up (an explicit file of
//   the holdout rows only) start cold and cannot arm for 90 sessions;
// - SYB buys on a November 2023 dip and holds through the boundary: `all` carries that position into 2024, while the
//   isolated holdout run starts flat, with no inherited position, interest, P&L or drawdown, and reports only the
//   window's sessions.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { nyseHolidays } from '../calendar.ts';
import { defaultPartitionConfigText } from '../partitions.ts';
import { newYorkOffset } from '../session.ts';

let work = '';
const app = path.resolve('src/app.ts');

const tradingDates = (first: string, last: string) => {
  const dates: string[] = [];

  for (let time = Date.parse(`${first}T00:00:00Z`); time <= Date.parse(`${last}T00:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6 && !nyseHolidays.has(date)) {
      dates.push(date);
    }
  }

  return dates;
};

const stamp = (date: string, hour: number, minute: number) => {
  const local = Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;
  const utc = local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000);

  return `"${new Date(utc * 1000).toISOString().replace('.000', '')}"`;
};

const bar = (date: string, hour: number, minute: number, open: number, close: number) =>
  `${stamp(date, hour, minute)},${open.toFixed(2)},${(Math.max(open, close) + 0.05).toFixed(2)},${(Math.min(open, close) - 0.05).toFixed(2)},${close.toFixed(2)},1000`;

// One session: the open, a midday bar closing at `mid`, the last minute and the closing print, all at `close` after.
const session = (date: string, open: number, mid: number, close: number) => [
  bar(date, 9, 30, open, open),
  bar(date, 11, 0, open, mid),
  bar(date, 15, 59, mid, close),
  bar(date, 16, 0, close, close)
];

// A steady rise with one dip-and-rebound: on `dip` a midday close 12% below the running price, the next session a
// midday close 5% above that low (the trailing buy's 4% rebound), then the rise resumes from there.
const series = (first: string, last: string, dip: string) => {
  const rows: string[] = [];
  let price = 100;
  let state: 'rise' | 'dipped' = 'rise';

  for (const date of tradingDates(first, last)) {
    if (date === dip) {
      const low = price * 0.88;

      rows.push(...session(date, price, low, low));
      price = low;
      state = 'dipped';
      continue;
    }

    if (state === 'dipped') {
      const rebound = price * 1.05;

      rows.push(...session(date, price, rebound, rebound));
      price = rebound;
      state = 'rise';
      continue;
    }

    price += 0.05;
    rows.push(...session(date, price, price, price));
  }

  return rows;
};

const run = (...args: string[]) =>
  spawnSync(
    process.execPath,
    ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', app, 'allIn-trailingBuy', ...args],
    { cwd: work, encoding: 'utf8' }
  );

const outputs = (name: string) => {
  const dir = path.join(work, 'out', name);
  const csv = (file: string) =>
    fs
      .readFileSync(path.join(dir, file), 'utf8')
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => line.split(','));

  return {
    summary: fs.readJsonSync(path.join(dir, 'summary.json')),
    trades: csv('trades.csv'),
    daily: csv('daily.csv')
  };
};

const backtest = (name: string, ...args: string[]) => {
  const result = run(...args.map((arg) => (arg === 'OUT' ? path.join(work, 'out', name) : arg)));

  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  return { ...outputs(name), stdout: result.stdout };
};

before(async () => {
  work = await fs.mkdtemp(path.join(os.tmpdir(), 'strategy-warmup-'));
  await fs.outputFile(path.join(work, 'data', 'partitions.json'), defaultPartitionConfigText);

  const sya = series('2023-06-01', '2024-03-28', '2024-01-03');
  const syb = series('2023-01-03', '2024-03-28', '2023-11-01');

  await fs.outputFile(path.join(work, 'data', 'SYA', 'data.csv'), `${sya.join('\n')}\n`);
  await fs.outputFile(path.join(work, 'data', 'SYB', 'data.csv'), `${syb.join('\n')}\n`);
  // The holdout rows of SYA alone, as an explicit file: the same window without any history before it.
  await fs.outputFile(
    path.join(work, 'holdout-only.csv'),
    `${sya.filter((row) => row.slice(1, 11) >= '2024-01-02').join('\n')}\n`
  );
});

after(async () => {
  await fs.remove(work);
});

describe('warm-up in a strategy file', () => {
  test('the warmed holdout run arms on its third session; the cold run of the same bars cannot', () => {
    const warm = backtest('sya-holdout', 'SYA', '-', '-', 'holdout', 'OUT');
    const cold = backtest('sya-cold', 'SYA', '-', '-', path.join(work, 'holdout-only.csv'), 'OUT');

    assert.match(
      warm.stdout,
      /Dataset: SYA holdout \(data\/SYA\/data.csv; data\/partitions.json holdout = 2024-01-01 → 2025-10-16/
    );
    assert.match(
      warm.stdout,
      /Evaluation: SYA holdout \(isolated partition\), 2024-01-02 → 2024-03-28, \d+ sessions; warm-up 90 of 90 sessions/
    );
    assert.equal(warm.summary.dataset.warmup.sessions, 90);
    assert.equal(warm.summary.dataset.evaluation.firstDate, '2024-01-02');
    assert.ok(warm.stdout.includes('armed at 2024-01-03'), warm.stdout);
    assert.match(warm.stdout, /Still open on 2024-03-28: entered at/, 'bought on the January rebound');

    assert.equal(cold.summary.dataset, undefined, 'an explicit file has no partition window');
    assert.doesNotMatch(cold.stdout, /armed at|Still open/, 'no arming before 90 sessions of its own');
    assert.equal(cold.trades.length, 0);
    assert.equal(warm.summary.sessions, cold.summary.sessions, 'the warm-up does not widen the window');
    assert.equal(warm.daily[0]![1], '2024-01-02');
    assert.equal(warm.daily.length, cold.daily.length, 'warm-up sessions are not reported');
  });

  test('all carries the November position across the boundary; the isolated holdout starts flat', () => {
    const all = backtest('syb-all', 'SYB', '-', '-', 'all', 'OUT');
    const holdout = backtest('syb-holdout', 'SYB', '-', '-', 'holdout', 'OUT');

    assert.equal(all.summary.dataset.mode, 'continuous all');
    assert.match(all.stdout, /Still open on 2024-03-28: entered at/);
    assert.ok(all.stdout.includes('armed at 2023-11-01'), all.stdout);
    assert.ok(Number(all.daily.find((row) => row[1] === '2024-01-02')![3]) > 0, 'all is borrowed on 2024-01-02');

    assert.equal(holdout.summary.dataset.warmup.sessions, 90);
    assert.equal(holdout.trades.length, 0);
    assert.doesNotMatch(holdout.stdout, /Still open/);
    assert.doesNotMatch(holdout.stdout, /armed at 2023/);
    assert.equal(holdout.summary.netProfit, 0);
    assert.ok(holdout.daily.every((row) => row[1]! >= '2024-01-02' && Number(row[3]) === 0 && Number(row[4]) === 0));
    assert.match(holdout.stdout, /Maximum drawdown \(daily mark-to-market\): \$0/);
  });

  test('invalid partitions and dates outside the partition are refused', () => {
    const misspelt = run('SYA', 'holdot');

    assert.equal(misspelt.status, 1);
    assert.match(misspelt.stderr, /'holdot' is neither a dataset partition \(training, holdout, final, all\)/);

    const outside = run('SYA', 'holdout', '2023-12-01');

    assert.equal(outside.status, 1);
    assert.match(outside.stderr, /start date 2023-12-01 is outside the holdout partition/);

    const former = run('SYA', '-', '-', 'data/SYA/holdout/data.csv');

    assert.equal(former.status, 1);
    assert.match(former.stderr, /no longer exists: each symbol has one file/);
  });
});
