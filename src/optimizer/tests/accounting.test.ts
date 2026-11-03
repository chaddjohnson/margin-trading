// Accounting and edge cases of the working copy: interest accrual, gap fills, zero-trade configurations,
// too-short histories and the constraint violation that keeps "never trade" from looking safe.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { originalParams, simulateAllIn } from '../../app/allIn-optimizable.ts';
import { barsFromCloses, sessionDates } from '../fixtures.ts';
import { ReferenceHighCache, evaluateCandidate } from '../evaluate.ts';
import { defaultFitness, violationOf } from '../fitness.ts';
import { datasetFromBars } from './helpers.ts';

const series = (closes: number[], options: Parameters<typeof barsFromCloses>[2] = {}, start = '2015-01-05') =>
  barsFromCloses(sessionDates(start, closes.length), closes, options);

describe('interest and exits', () => {
  it('accrues simple interest per calendar day and sells a losing position at the open after the maximum hold', () => {
    // 100 flat sessions at 100, an 11% drop to 89 (entry), then a slow slide.
    const closes = [...Array(100).fill(100), 89, ...Array.from({ length: 30 }, (_value, index) => 89 - index * 0.05)];
    const bars = series(closes, { spread: 0.001 });
    const dataset = datasetFromBars('I', bars);
    const result = simulateAllIn({ symbol: 'I', bars: dataset, params: originalParams });
    const trade = result.trades[0]!;
    const days = (trade.exitTime - trade.entryTime) / 86400;

    assert.equal(trade.entryPrice, 89);
    assert.equal(trade.reason, 'maximum hold');
    assert.ok(days >= 15);
    assert.equal(trade.interest, (100000 * 0.11 * (trade.exitTime - trade.entryTime)) / (365 * 86400));
    assert.equal(trade.profit, trade.shares * trade.exitPrice - 100000 - trade.interest);
    assert.equal(trade.exitPrice, dataset.open[trade.exitIndex]);
  });

  it('fills a gap through an active stop at the open', () => {
    const closes = [...Array(100).fill(100), 89, 95, 100, 105, 110, 111, 112, 100, 100];
    const bars = series(closes, { gaps: { 107: -0.1 } });
    const result = simulateAllIn({ symbol: 'G', bars: datasetFromBars('G', bars), params: originalParams });
    const trade = result.trades[0]!;

    assert.equal(trade.reason, 'trailing stop gap');
    assert.equal(trade.exitPrice, bars[107]!.open);
  });

  it('counts calendar days across market closures for the maximum hold', () => {
    const closes = [...Array(100).fill(100), 89, 88.9, 88.8, 88.7];
    const dates = sessionDates('2016-01-04', 101);
    // Close the market for three weeks after the entry.
    const later = sessionDates('2016-06-20', 3);
    const bars = barsFromCloses([...dates, ...later], closes);
    const result = simulateAllIn({ symbol: 'C', bars: datasetFromBars('C', bars), params: originalParams });

    assert.equal(result.trades[0]!.reason, 'maximum hold');
    assert.equal(result.trades[0]!.exitIndex, 101);
  });
});

describe('degenerate inputs', () => {
  it('reports zero-trade configurations as infeasible, not as safe', () => {
    const closes = Array.from({ length: 400 }, (_value, index) => 100 + index * 0.1);
    const dataset = datasetFromBars('Z', series(closes));
    const metrics = evaluateCandidate(dataset, new ReferenceHighCache(dataset.high), originalParams, {
      startIndex: 100,
      endIndex: 399
    });

    assert.equal(metrics.entries, 0);
    assert.equal(metrics.netProfit, 0);
    assert.equal(metrics.maximumDrawdown, 0);
    assert.ok(Number.isNaN(metrics.winRate));
    assert.ok(violationOf(metrics, defaultFitness, 2) > 0);
  });

  it('handles one- and two-session histories', () => {
    const one = simulateAllIn({ symbol: 'S', bars: datasetFromBars('S', series([10])), params: originalParams });
    const two = simulateAllIn({ symbol: 'S', bars: datasetFromBars('S', series([10, 8.5])), params: originalParams });

    assert.equal(one.trades.length, 0);
    assert.equal(two.trades.length, 1);
    assert.equal(two.trades[0]!.reason, 'open');
    assert.equal(two.unrealizedProfit, 0);
  });

  it('handles an empty window', () => {
    const dataset = datasetFromBars('E', series([10, 11, 12]));
    const metrics = evaluateCandidate(dataset, new ReferenceHighCache(dataset.high), originalParams, {
      startIndex: 2,
      endIndex: 1
    });

    assert.equal(metrics.sessions, 0);
    assert.equal(metrics.entries, 0);
  });
});
