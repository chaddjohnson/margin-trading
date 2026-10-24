// The allocator's --dataset path on synthetic data: command routing and refusals, the engine's accounting start
// (warm-up sessions feed the books' levels and nothing else), and the canonical loader over five synthetic symbols
// (one window for all, the same warm-up, aligned calendars, eligibility, distribution coverage).
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, newYorkOffset, nyseHolidays } from '#lib';
import { run } from '../cli.ts';
import {
  assertOutsideResearch,
  datasetOutDir,
  datasetRunConfig,
  loadDatasetUniverse,
  parseDatasetOption,
  warmupSessionsOf
} from '../dataset.ts';
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
  const members = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'] as const;

  const rows = (skip?: string) => {
    const lines: string[] = [];
    let price = 100;

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

      price += 0.1;

      for (const [hour, minute] of [
        [9, 30],
        [12, 0],
        [15, 59],
        [16, 0]
      ] as const) {
        lines.push(`${at(hour, minute)},${price},${price + 0.1},${price - 0.1},${price},1000`);
      }
    }

    return `${lines.join('\n')}\n`;
  };

  before(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'allocator-dataset-'));
    await fs.writeFile(path.join(root, 'partitions.json'), defaultPartitionConfigText);

    for (const symbol of members) {
      await fs.outputFile(path.join(root, symbol, 'data.csv'), rows());
    }

    await fs.writeFile(
      path.join(root, 'distributions.csv'),
      'etf,ex_date,pay_date,amount,amount_method,ex_date_method,pay_date_method,close_before\nVGT,2024-02-01,2024-02-05,0.5,derived,derived,estimated,120\n'
    );
  });

  after(async () => {
    await fs.remove(root);
  });

  test('every member gets the same window and warm-up; arming and accounting start at the window', async () => {
    const loaded = await loadDatasetUniverse({
      members,
      partition: 'holdout',
      warmupSessions: 50,
      root,
      distributionsFile: path.join(root, 'distributions.csv')
    });

    assert.equal(loaded.warmup, 50);
    assert.equal(loaded.universe.dates[50], '2024-01-02');
    assert.equal(loaded.universe.end, '2024-02-28');
    assert.equal(loaded.universe.eligibilityIndex, 50, 'the window start is after the protocol eligibility date');
    assert.deepEqual(Object.keys(loaded.windows), [...members]);
    assert.ok(Object.values(loaded.windows).every((window) => window!.warmup.sessions === 50));
    // Three regular bars a session: every window session is sparse, and is counted as such.
    assert.deepEqual(loaded.sparseSessions, { VOOG: 40, VGT: 40, XBI: 40, XRT: 40, KRE: 40 });
    assert.equal(loaded.distributions.covered, true);
    assert.equal(loaded.universe.distributions.length, 1);

    const config = datasetRunConfig(testConfig({ mode: 'portfolio' }), loaded);

    assert.equal(config.accountingStartIndex, 50);
    assert.equal(config.eligibilityIndex, 50);
    assert.match(config.key, /@holdout$/);

    const result = runAllocator(loaded.universe, config);

    assert.equal(result.events.find((event) => event.kind === 'start')!.date, '2024-01-02');
    assert.ok(result.daily.every((row) => row.date > '2024-01-02'));
  });

  test('training starts at the file with no warm-up and arms from the protocol eligibility date', async () => {
    const loaded = await loadDatasetUniverse({
      members: ['VGT'],
      partition: 'training',
      warmupSessions: 74,
      root,
      distributionsFile: path.join(root, 'distributions.csv')
    });

    assert.equal(loaded.warmup, 0);
    assert.equal(loaded.universe.dates[0], '2023-06-01');
    assert.equal(loaded.universe.dates[loaded.universe.eligibilityIndex], '2023-06-01');
  });

  test('members whose sessions differ are refused', async () => {
    await fs.outputFile(path.join(root, 'XBI', 'data.csv'), rows('2024-01-10'));

    await assert.rejects(
      loadDatasetUniverse({
        members,
        partition: 'holdout',
        warmupSessions: 50,
        root,
        distributionsFile: path.join(root, 'distributions.csv')
      }),
      /XBI has \d+ sessions through 2024-02-28, VOOG \d+|Session \d+: XBI/
    );
    await fs.outputFile(path.join(root, 'XBI', 'data.csv'), rows());
  });
});
