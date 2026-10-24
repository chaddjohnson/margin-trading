// The readable run report and the drawdowns it states: the percentage tracker against a brute-force recomputation,
// the largest-dollar and largest-percent episodes kept apart, the engine's minute and daily percentages, the summary
// of a warmed-up run counted from its accounting start, and the report's lines in both modes.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { defaultPartitionConfigText, parsePartitionConfig } from '#lib';
import { PercentTracker, Tracker, runAllocator } from '../engine.ts';
import { summarize } from '../metrics.ts';
import { formatRunReport, runDrawdowns, strategyName, textTable } from '../runReport.ts';
import { segmentRows } from '../segments.ts';
import { dateOf, dipSession, flat, testConfig, universeOf } from './fixtures.ts';

// The largest fall in percent of the running peak, from first principles.
const bruteForcePercent = (start: number, values: number[]) => {
  let worst = 0;

  for (let trough = 0; trough < values.length; trough++) {
    const peak = Math.max(start, ...values.slice(0, trough + 1));

    worst = Math.max(worst, peak > 0 ? (peak - values[trough]!) / peak : 0);
  }

  return worst;
};

describe('the percentage drawdown tracker', () => {
  test('equals a brute-force recomputation on random paths', () => {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    for (let path = 0; path < 50; path++) {
      const values: number[] = [];
      let value = 1000;

      for (let step = 0; step < 200; step++) {
        value *= 1 + (random() - 0.5) * 0.08;
        values.push(value);
      }

      const tracker = new PercentTracker(1000, 0);

      values.forEach((v, time) => tracker.update(v, time + 1));
      assert.ok(Math.abs(tracker.stats().maximumPercent - bruteForcePercent(1000, values)) < 1e-12, `path ${path}`);
    }
  });

  test('keeps the deepest episode, not the largest in dollars', () => {
    // A 40% fall of a small account ($40), then a 20% fall of a larger one ($200).
    const path = [100, 60, 100, 1000, 800, 900];
    const dollars = new Tracker(100, 0);
    const percent = new PercentTracker(100, 0);

    path.forEach((value, index) => {
      dollars.update(value, index + 1);
      percent.update(value, index + 1);
    });

    assert.equal(dollars.maximum, 200);
    assert.equal(dollars.maximumPercent, 0.2, 'the dollar tracker reports its own episode’s depth');
    assert.deepEqual(percent.stats(), {
      maximumPercent: 0.4,
      dollars: 40,
      peakTime: 1,
      troughTime: 2,
      peakValue: 100,
      troughValue: 60,
      recoveryTime: 3
    });
  });
});

describe('the run’s drawdowns', () => {
  // Two dips: the books buy at 90 in session 4 and the core and lot fall in session 6.
  const specs = () => [
    ...[0, 1, 2, 3].map(() => flat(100)),
    dipSession(),
    flat(95),
    { closes: [95, 70, 92] },
    flat(93),
    flat(96)
  ];
  const universe = () => universeOf({ VOOG: specs(), VGT: specs() });

  test('portfolio: the daily percent is the deepest close-to-close fall; the minute marks fall at least as far', () => {
    const result = runAllocator(universe(), testConfig({ mode: 'portfolio', symbols: ['VGT'], eligibilityIndex: 0 }));
    const start = result.config.initial.voog + result.config.initial.vgt;
    const daily = result.dailyPercentDrawdown!;
    const minute = result.minutePercentDrawdown!;
    const segments = segmentRows(result, parsePartitionConfig(defaultPartitionConfigText), start);

    assert.ok(result.lots.length > 0, 'the fixture trades');
    assert.ok(
      Math.abs(
        daily.maximumPercent -
          bruteForcePercent(
            start,
            result.daily.map((row) => row.equity)
          )
      ) < 1e-12
    );
    assert.equal(daily.maximumPercent, segments.at(-1)!.maxPercentDrawdown, 'the period attribution agrees');
    assert.ok(minute.maximumPercent > daily.maximumPercent, 'the 70 print inside session 6 is deeper than its close');
    assert.ok(minute.dollars >= result.dailyPercentDrawdown!.dollars);
    assert.ok(result.minuteDrawdown.maximum >= result.dailyDrawdown.maximum);
  });

  test('fixed: no account percentage; the pool is the reference, the same episode as the dollar maximum', () => {
    const result = runAllocator(universe(), testConfig({ mode: 'fixed', symbols: ['VGT'], eligibilityIndex: 0 }));
    const drawdowns = runDrawdowns(result);

    assert.equal(result.dailyPercentDrawdown, undefined);
    assert.equal(drawdowns.percentBasis, 'allocation');
    assert.equal(drawdowns.allocation, result.config.fixedPrincipal);
    assert.equal(drawdowns.minute.largestPercent, drawdowns.minute.largestDollar);
    assert.equal(drawdowns.minute.largestDollar.percent, result.minuteDrawdown.maximum / result.config.fixedPrincipal);
  });

  test('a warmed-up run is summarized from its accounting start', () => {
    const config = testConfig({ mode: 'portfolio', symbols: ['VGT'], eligibilityIndex: 4, accountingStartIndex: 3 });
    const result = runAllocator(universe(), config);
    const summary = summarize(result);
    const days = (from: number, to: number) => (Date.parse(dateOf(to)) - Date.parse(dateOf(from))) / 86400000;

    assert.equal(summary.start, dateOf(3));
    assert.equal(summary.sessions, result.endIndex - 3 + 1);
    assert.equal(summary.spanYears, days(3, result.endIndex) / 365.25);
    assert.equal(summary.cagr, (summary.endEquity / summary.startEquity) ** (1 / summary.spanYears) - 1);
  });
});

describe('the readable report', () => {
  const specs = () => [...[0, 1, 2, 3].map(() => flat(100)), dipSession(), flat(95), flat(96)];
  const universe = () => universeOf({ VOOG: specs(), VGT: specs() });

  test('portfolio: headline, independent dollar and percent drawdowns, symbols and periods', () => {
    const result = runAllocator(universe(), testConfig({ mode: 'portfolio', symbols: ['VGT'], eligibilityIndex: 0 }));
    const summary = summarize(result);
    const segments = segmentRows(result, parsePartitionConfig(defaultPartitionConfigText), summary.startEquity);
    const report = formatRunReport({ result, summary, dataset: 'all', segments, outDir: 'out' });

    for (const expected of [
      'Strategy: VGT D1 shadow',
      'Dataset: all',
      `Period: ${summary.start} to ${summary.end}`,
      'Starting portfolio: $100,000',
      `Closed trades: ${summary.closed}`,
      'Realized margin profit: ',
      'Unrealized margin profit: ',
      'Margin interest: ',
      'Maximum portfolio daily drawdown ($): ',
      'Maximum portfolio daily drawdown (peak-to-trough %): ',
      'Maximum portfolio minute drawdown ($): ',
      'Maximum portfolio minute drawdown (peak-to-trough %): ',
      'Percent basis: peak-to-trough falls of marked portfolio equity',
      'By symbol (funded lots):',
      'development',
      'full',
      'Machine-readable results: out'
    ]) {
      assert.ok(report.includes(expected), `missing “${expected}”:\n${report}`);
    }

    assert.match(
      report,
      new RegExp(
        `Maximum portfolio minute drawdown \\(peak-to-trough %\\): ${(result.minutePercentDrawdown!.maximumPercent * 100).toFixed(2)}% \\(\\$`
      )
    );
  });

  test('fixed: profit rather than margin profit, the pool as the percent reference, no portfolio lines', () => {
    const result = runAllocator(universe(), testConfig({ mode: 'fixed', symbols: ['VGT'], eligibilityIndex: 0 }));
    const report = formatRunReport({ result, summary: summarize(result) });

    assert.match(report, /Mode: fixed \$100,000 pool/);
    assert.match(report, /Dataset: frozen protocol inputs/);
    assert.match(
      report,
      /Maximum drawdown \(daily\): \$[\d,]+ \(\d+\.\d\d% of \$100,000 allocation\), \d{4}-\d\d-\d\d → /
    );
    assert.match(report, /Maximum drawdown \(minute\): \$[\d,]+ \(\d+\.\d\d% of \$100,000 allocation\), .* ET → /);
    assert.match(
      report,
      /Percent basis: the fixed \$100,000 trading allocation, a capital-allocation reference, not a peak-to-trough/
    );
    assert.ok(!report.includes('peak-to-trough %'), 'no account percentage in the fixed mode');
    assert.ok(!report.includes('Starting portfolio') && !report.includes('margin profit'));
  });

  test('names and tables', () => {
    assert.equal(strategyName(testConfig({ mode: 'fixed' })), 'All-primary shadow');
    assert.equal(strategyName(testConfig({ mode: 'fixed', symbols: ['VGT'], policy: 'cancel' })), 'VGT D1 cancel');

    assert.deepEqual(
      textTable(
        ['A', 'B', 'C'],
        [
          ['x', 'yy', '1'],
          ['zzz', 'w', '22']
        ],
        2
      ),
      ['A    B    C', '---  --  --', 'x    yy   1', 'zzz  w   22']
    );
  });
});
