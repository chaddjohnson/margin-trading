// The allocator's --dataset path on synthetic data: command routing and refusals, the engine's accounting start
// (warm-up sessions feed the books' levels and nothing else), and the canonical loader over five synthetic symbols
// (one window for all, the same warm-up, aligned calendars, eligibility, distribution coverage).
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { type SplitEvent, defaultPartitionConfigText, newYorkOffset, nyseHolidays, parsePartitionConfig } from '#lib';
import { run } from '../cli.ts';
import {
  type DistributionLedger,
  assertOutsideResearch,
  coverageRefusal,
  datasetOutDir,
  datasetRunConfig,
  loadDatasetUniverse,
  parseDatasetOption,
  parseEndOption,
  warmupSessionsOf
} from '../dataset.ts';
import { segmentRows } from '../segments.ts';
import { runAllocator } from '../engine.ts';
import { dipSession, flat, testConfig, universeOf } from './fixtures.ts';

describe('the --dataset option', () => {
  test('accepts the four partitions only', () => {
    assert.equal(parseDatasetOption(undefined), undefined);

    for (const partition of ['training', 'holdout', 'final', 'all']) {
      assert.equal(parseDatasetOption(partition), partition);
    }

    assert.throws(() => parseDatasetOption('holdot'), /--dataset must be one of training, holdout, final, all/);
    assert.throws(() => parseDatasetOption('Final'), /--dataset must be one of/);
  });

  test('the frozen protocol studies refuse it before reading anything', async () => {
    for (const command of [
      'run',
      'all',
      'stress',
      'parity',
      'audit',
      'audit-ledger',
      'illustration',
      'final-validation'
    ]) {
      await assert.rejects(run([command, '--dataset', 'all']), /--dataset applies to fixed and portfolio only/);
    }
  });

  test('evaluations write outside research/', () => {
    assert.equal(
      datasetOutDir('holdout', 'C-all-lowDd-shadow-holdout'),
      'evaluations/multi-etf-allocator/holdout/C-all-lowDd-shadow-holdout'
    );
    assert.equal(datasetOutDir('final', 'k', 'tmp/x'), 'tmp/x');
    assert.throws(() => assertOutsideResearch('research/multi-etf-allocator/results/x'), /research\/ holds the frozen/);
    assert.doesNotThrow(() => assertOutsideResearch('evaluations/multi-etf-allocator/all/x'));
  });

  test('the warm-up is the books’ longest lookback', () => {
    const config = testConfig({ mode: 'fixed' });

    assert.equal(warmupSessionsOf(config), 3);
    config.phenotypes.KRE = {
      ...config.phenotypes.KRE,
      params: { ...config.phenotypes.KRE.params, tickWindowSize: 230 }
    };
    assert.equal(warmupSessionsOf(config), 230);
  });
});

describe('the accounting start', () => {
  // Sessions 0-7 are warm-up, with a dip at 4 that a continuous run trades (the 3-session high is complete from
  // session 3); the window starts at 8, and the dip at 10 arms off the high of sessions 7-9, of which 7 is warm-up
  // that the books read only through their levels.
  const specs = () => [
    ...[0, 1, 2, 3].map(() => flat(100)),
    dipSession(),
    ...[5, 6, 7, 8, 9].map(() => flat(100)),
    dipSession(),
    flat(91),
    flat(92)
  ];
  const universe = () => universeOf({ VOOG: specs(), VGT: specs() });

  for (const mode of ['fixed', 'portfolio'] as const) {
    test(`${mode}: nothing before the window is traded, accounted or reported`, () => {
      const isolated = runAllocator(
        universe(),
        testConfig({ mode, symbols: ['VGT'], eligibilityIndex: 8, accountingStartIndex: 8 })
      );
      const continuous = runAllocator(universe(), testConfig({ mode, symbols: ['VGT'], eligibilityIndex: 0 }));

      assert.ok(
        continuous.lots.some((lot) => lot.entryIndex === 4),
        'the continuous run trades the warm-up dip'
      );
      assert.deepEqual(
        isolated.lots.map((lot) => lot.entryIndex),
        [10],
        'the isolated run trades only the window dip'
      );
      assert.equal(isolated.daily[0]!.index, 9, 'the first processed session follows the start close');
      assert.ok(isolated.daily.every((row) => row.index > 8));
      assert.ok(
        isolated.trades.every((trade) => trade.activationIndex >= 8),
        'no virtual trade before the window'
      );

      if (mode === 'portfolio') {
        const start = isolated.events.find((event) => event.kind === 'start')!;

        assert.equal(start.index, 8, 'the portfolio is funded at the close of the window’s first session');
        assert.equal(isolated.events.filter((event) => event.index < 8).length, 0);
      }
    });
  }

  test('a start after arming, or at the end, is refused; the default start is the protocol’s', () => {
    const config = (overrides: Parameters<typeof testConfig>[0]) => testConfig({ symbols: ['VGT'], ...overrides });

    assert.throws(
      () => runAllocator(universe(), config({ mode: 'fixed', eligibilityIndex: 3, accountingStartIndex: 5 })),
      /accounting start 5 must precede the end 12 and arming 3/
    );
    assert.throws(
      () => runAllocator(universe(), config({ mode: 'fixed', accountingStartIndex: 12 })),
      /must precede the end/
    );
    assert.deepEqual(
      runAllocator(universe(), config({ mode: 'fixed', accountingStartIndex: 0 })).daily,
      runAllocator(universe(), config({ mode: 'fixed' })).daily
    );
  });
});

describe('the canonical loader', () => {
  let root = '';
  let splitRoot = '';
  const members = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] as const;
  // A split on the raw data: from `split.date` on, prices ÷ ratio and volumes × ratio, as an exchange prints them.
  const ratios: Record<string, number> = { VGT: 8, VOOG: 6 };
  const splitDate = '2024-01-17';

  const rows = (symbol: string, { skip, split = false }: { skip?: string; split?: boolean } = {}) => {
    const lines: string[] = [];
    let price = 100;
    let step = 0;

    for (let time = Date.parse('2023-06-01T00:00:00Z'); time <= Date.parse('2024-02-28T00:00:00Z'); time += 86400000) {
      const date = new Date(time).toISOString().slice(0, 10);
      const day = new Date(time).getUTCDay();

      if (day === 0 || day === 6 || nyseHolidays.has(date) || date === skip) {
        continue;
      }

      const at = (hour: number, minute: number) => {
        const local =
          Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;

        return `"${new Date((local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000)) * 1000).toISOString().replace('.000', '')}"`;
      };

      // A rise, a 12% dip on 2024-01-23 that arms the test phenotype, and a rebound.
      price = date === '2024-01-23' ? price * 0.88 : price + (step++ % 7 === 3 ? -0.3 : 0.1);

      const ratio = split && date >= splitDate ? (ratios[symbol] ?? 1) : 1;

      for (const [hour, minute] of [
        [9, 30],
        [12, 0],
        [15, 59],
        [16, 0]
      ] as const) {
        lines.push(
          `${at(hour, minute)},${price / ratio},${(price + 0.1) / ratio},${(price - 0.1) / ratio},${price / ratio},${1000 * ratio}`
        );
      }
    }

    return `${lines.join('\n')}\n`;
  };

  // Published per-share amounts: per post-split share once the split has happened.
  const ledgerOf = (split: boolean, coverage = '2024-03-31'): DistributionLedger => ({
    file: 'fixture',
    sha256: 'fixture',
    coverage: { VGT: coverage, VOOG: coverage },
    distributions: [
      {
        etf: 'VGT',
        exDate: '2023-09-20',
        payDate: '2023-09-22',
        amount: 0.4,
        amountMethod: 'issuer',
        exDateMethod: 'issuer',
        payDateMethod: 'issuer',
        closeBefore: 100
      },
      {
        etf: 'VOOG',
        exDate: '2023-09-20',
        payDate: '2023-09-22',
        amount: 0.3,
        amountMethod: 'issuer',
        exDateMethod: 'issuer',
        payDateMethod: 'issuer',
        closeBefore: 100
      },
      {
        etf: 'VGT',
        exDate: '2024-02-01',
        payDate: '2024-02-05',
        amount: split ? 0.48 / 8 : 0.48,
        amountMethod: 'issuer',
        exDateMethod: 'issuer',
        payDateMethod: 'issuer',
        closeBefore: 100
      },
      {
        etf: 'VOOG',
        exDate: '2024-02-01',
        payDate: '2024-02-05',
        amount: split ? 0.36 / 6 : 0.36,
        amountMethod: 'issuer',
        exDateMethod: 'issuer',
        payDateMethod: 'issuer',
        closeBefore: 100
      }
    ]
  });
  const splits: SplitEvent[] = [
    { symbol: 'VGT', effectiveDate: splitDate, ratio: 8, source: 'synthetic test split' },
    { symbol: 'VOOG', effectiveDate: splitDate, ratio: 6, source: 'synthetic test split' }
  ];
  const load = (overrides: Partial<Parameters<typeof loadDatasetUniverse>[0]> = {}) =>
    loadDatasetUniverse({
      members,
      partition: 'holdout',
      warmupSessions: 50,
      mode: 'portfolio',
      root,
      ledger: ledgerOf(false),
      splits: [],
      ...overrides
    });
  const near = (a: number, b: number, label: string) =>
    assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)), `${label}: ${a} vs ${b}`);

  before(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'allocator-dataset-'));
    splitRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'allocator-split-'));

    for (const dir of [root, splitRoot]) {
      await fs.writeFile(path.join(dir, 'partitions.json'), defaultPartitionConfigText);

      for (const symbol of members) {
        await fs.outputFile(path.join(dir, symbol, 'data.csv'), rows(symbol, { split: dir === splitRoot }));
      }
    }
  });

  after(async () => {
    await fs.remove(root);
    await fs.remove(splitRoot);
  });

  test('every member gets the same window and warm-up; arming and accounting start at the window', async () => {
    const loaded = await load();

    assert.equal(loaded.warmup, 50);
    assert.equal(loaded.universe.dates[50], '2024-01-02');
    assert.equal(loaded.universe.end, '2024-02-28');
    assert.equal(loaded.universe.eligibilityIndex, 50, 'the window start is after the protocol eligibility date');
    assert.deepEqual(Object.keys(loaded.windows), [...members]);
    assert.ok(Object.values(loaded.windows).every((window) => window!.warmup.sessions === 50));
    // Three regular bars a session: every window session is sparse, and is counted as such.
    assert.deepEqual(loaded.sparseSessions, { VOOG: 40, VGT: 40, XBI: 40, XRT: 40, KRE: 40 });
    assert.equal(loaded.distributions.covered, true);
    assert.equal(loaded.universe.distributions.length, 4);

    const config = datasetRunConfig(testConfig({ mode: 'portfolio' }), loaded);

    assert.equal(config.accountingStartIndex, 50);
    assert.equal(config.eligibilityIndex, 50);
    assert.match(config.key, /@holdout$/);

    const result = runAllocator(loaded.universe, config);

    assert.equal(result.events.find((event) => event.kind === 'start')!.date, '2024-01-02');
    assert.ok(result.daily.every((row) => row.date > '2024-01-02'));
    assert.deepEqual(
      result.dividends.map((row) => row.exDate),
      ['2024-02-01', '2024-02-01'],
      'the warm-up distribution is not booked; the window one is, for VOOG and VGT'
    );
  });

  test('all is one continuous run from the first session; training arms from the protocol eligibility date', async () => {
    const all = await load({ partition: 'all' });

    assert.equal(all.warmup, 0);
    assert.equal(all.universe.dates[0], '2023-06-01');
    assert.ok(Object.values(all.windows).every((window) => window!.mode === 'continuous all'));

    const result = runAllocator(all.universe, datasetRunConfig(testConfig({ mode: 'portfolio' }), all));
    const days = result.daily.map((row) => row.date);

    assert.ok(days.includes('2023-12-29') && days.includes('2024-01-02'), 'no break at the 2024-01-01 boundary');
    assert.deepEqual(
      result.dividends.map((row) => row.exDate),
      ['2023-09-20', '2023-09-20', '2024-02-01', '2024-02-01']
    );

    const training = await load({ members: ['VGT'], partition: 'training', warmupSessions: 74, mode: 'fixed' });

    assert.equal(training.warmup, 0);
    assert.equal(training.universe.dates[training.universe.eligibilityIndex], '2023-06-01');
  });

  test('a recorded split is forward-adjusted: the run equals the same economy without the split', async () => {
    const plain = await load({ partition: 'all' });
    const split = await load({ partition: 'all', root: splitRoot, ledger: ledgerOf(true), splits });

    assert.deepEqual(
      split.splits.map(({ symbol, ratio }) => `${symbol} ${ratio}`),
      ['VOOG 6', 'VGT 8']
    );
    assert.deepEqual(
      split.distributions.adjusted.map(({ etf, factor }) => `${etf} ${factor}`),
      ['VGT 8', 'VOOG 6']
    );

    for (const symbol of members) {
      const a = plain.universe.instruments[symbol]!.ds;
      const b = split.universe.instruments[symbol]!.ds;

      a.bClose.forEach((value, index) => near(b.bClose[index]!, value, `${symbol} bar ${index}`));
      a.sHigh.forEach((value, index) => near(b.sHigh[index]!, value, `${symbol} session ${index} high`));
    }

    for (const mode of ['fixed', 'portfolio'] as const) {
      const expected = runAllocator(plain.universe, datasetRunConfig(testConfig({ mode }), plain));
      const actual = runAllocator(split.universe, datasetRunConfig(testConfig({ mode }), split));

      assert.ok(expected.lots.length > 0, 'the fixture trades');
      assert.deepEqual(
        actual.lots.map((lot) => [lot.symbol, lot.entryIndex, lot.exitIndex]),
        expected.lots.map((lot) => [lot.symbol, lot.entryIndex, lot.exitIndex]),
        `${mode}: the same lots, no split-made signal`
      );
      actual.lots.forEach((lot, index) => {
        near(
          lot.entryPrice * lot.shares,
          expected.lots[index]!.entryPrice * expected.lots[index]!.shares,
          'cost basis'
        );
        near(lot.net, expected.lots[index]!.net, 'lot net');
      });
      actual.daily.forEach((row, index) => {
        near(row.equity, expected.daily[index]!.equity, `${mode} ${row.date} equity`);
        near(row.cumulativeDividends, expected.daily[index]!.cumulativeDividends, `${mode} ${row.date} dividends`);
      });
    }

    // Without the adjustment the split reads as a crash of the core.
    const raw = await load({ partition: 'all', root: splitRoot, ledger: ledgerOf(true), splits: [] });
    const rawRun = runAllocator(raw.universe, datasetRunConfig(testConfig({ mode: 'portfolio' }), raw));
    const day = rawRun.daily.find((row) => row.date === splitDate)!;
    const before = rawRun.daily[rawRun.daily.indexOf(day) - 1]!;

    assert.ok(day.equity < 0.5 * before.equity, 'raw prices would book the split as a loss');
  });

  test('coverage is required where distributions are booked; --end narrows the window inside the partition', async () => {
    const short = await load({ ledger: ledgerOf(false, '2024-02-15') });

    assert.equal(short.distributions.covered, false);
    assert.match(coverageRefusal(short, false)!, /after the distribution ledger's coverage \(VGT 2024-02-15/);
    assert.equal(coverageRefusal(short, true), undefined);

    const fixed = await load({ ledger: ledgerOf(false, '2024-02-15'), mode: 'fixed' });

    assert.equal(fixed.distributions.used, false);
    assert.equal(coverageRefusal(fixed, false), undefined, 'fixed mode books no distributions');

    const ended = await load({ ledger: ledgerOf(false, '2024-02-15'), endDate: '2024-02-15' });

    assert.equal(ended.universe.end, '2024-02-15');
    assert.equal(ended.distributions.covered, true);
    assert.match(datasetRunConfig(testConfig({ mode: 'portfolio' }), ended).key, /@holdout-to-2024-02-15$/);
    assert.equal(parseEndOption('2025-10-13'), '2025-10-13');
    assert.throws(() => parseEndOption('2025-13-01'), /--end must be a YYYY-MM-DD/);
    await assert.rejects(load({ endDate: '2023-12-01' }), /end date 2023-12-01 is outside the holdout partition/);
  });

  test('period attribution of one continuous run adds up across the boundaries', async () => {
    const all = await load({ partition: 'all' });
    const config = datasetRunConfig(testConfig({ mode: 'portfolio' }), all);
    const result = runAllocator(all.universe, config);
    const segments = segmentRows(result, parsePartitionConfig(defaultPartitionConfigText), 100000);
    const [development, holdout, full] = segments;

    assert.deepEqual(
      segments.map((row) => row.segment),
      ['development', 'holdout', 'full']
    );
    assert.equal(development!.lastDate, '2023-12-29');
    assert.equal(holdout!.firstDate, '2024-01-02');
    assert.equal(holdout!.startEquity, development!.endEquity, 'nothing resets at 2024-01-01');
    near(development!.equityChange + holdout!.equityChange, full!.equityChange, 'equity');
    near(development!.interest + holdout!.interest, full!.interest, 'interest');
    near(development!.dividends + holdout!.dividends, full!.dividends, 'dividends');
    assert.equal(development!.lotsEntered + holdout!.lotsEntered, full!.lotsEntered);
    assert.ok(full!.maxDrawdownPercent >= 0 && full!.maxDrawdownPercent < 1);

    for (const row of segments) {
      assert.ok(
        row.maxPercentDrawdown >= row.maxDrawdownPercent,
        `${row.segment}: the deepest fall is at least the largest-dollar episode's depth`
      );
      assert.ok(full!.maxPercentDrawdown >= row.maxPercentDrawdown, 'no period is deeper than the full run');
    }
  });

  test('members whose sessions differ are refused', async () => {
    await fs.outputFile(path.join(root, 'XBI', 'data.csv'), rows('XBI', { skip: '2024-01-10' }));
    await assert.rejects(load(), /XBI has \d+ sessions through 2024-02-28, VOOG \d+|Session \d+: XBI|calendars differ/);
    await fs.outputFile(path.join(root, 'XBI', 'data.csv'), rows('XBI'));
  });
});
