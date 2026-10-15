// Data-window isolation: research views end at the research end, the optimizer refuses anything else,
// windows use earlier sessions only as reference-high history, future sessions can't change a window's
// result, and positions crossing a window's end are marked to market with interest accrued through it.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { originalParams } from '../../app/allIn-optimizable.ts';
import { ReferenceHighCache, evaluateCandidate, simulateWindow } from '../evaluate.ts';
import { windowInfo } from '../experiment.ts';
import { defaultProtocol } from '../protocol.ts';
import {
  HoldoutLockedError,
  assertResearchView,
  buildSeries,
  issueHoldoutCapability,
  researchSeries,
  unlockedSeries
} from '../series.ts';
import { datasetFromBars, fixtureManifest, tempDir, walkBars } from './helpers.ts';

describe('research views', () => {
  it('physically exclude sessions after the research end', async () => {
    const dir = await tempDir('views');
    const manifest = await fixtureManifest(dir, { AAA: walkBars(3, '2021-01-04', 900) });
    const series = await researchSeries('AAA', manifest, '2023-12-31');

    assert.ok(series.dates.at(-1)! <= '2023-12-31');
    assert.ok(series.dates.length < 900);
    assert.doesNotThrow(() => assertResearchView(series, '2023-12-31'));
  });

  it('are the only series the optimizer accepts', async () => {
    const forged = buildSeries(
      'AAA',
      [{ time: Date.parse('2025-01-02') / 1000, open: 1, high: 1, low: 1, close: 1, volume: 1 }],
      'unlocked',
      '9999-12-31',
      'x'
    );

    assert.throws(() => assertResearchView(forged, '2023-12-31'), HoldoutLockedError);

    const dir = await tempDir('views2');
    const manifest = await fixtureManifest(dir, { AAA: walkBars(3, '2021-01-04', 900) });
    const later = await researchSeries('AAA', manifest, '2024-06-30');

    assert.throws(() => assertResearchView(later, '2023-12-31'), HoldoutLockedError);
  });

  it('keep the holdout capability out of reach', async () => {
    const dir = await tempDir('capability');
    const manifest = await fixtureManifest(dir, { AAA: walkBars(3, '2021-01-04', 900) });

    // holdout.ts takes the capability when it is first imported; any second request fails.
    await import('../holdout.ts');
    assert.throws(() => issueHoldoutCapability(), HoldoutLockedError);
    await assert.rejects(unlockedSeries('AAA', manifest, Symbol('forged')), HoldoutLockedError);
  });
});

describe('window evaluation', () => {
  const bars = walkBars(7, '2012-01-02', 3000, 0.02);
  const dataset = datasetFromBars('W', bars);
  const highs = new ReferenceHighCache(dataset.high);
  const series = buildSeries(
    'W',
    bars.map((bar) => ({ ...bar, time: Date.parse(bar.date) / 1000 })),
    'research',
    '9999-12-31',
    'x'
  );
  const train = windowInfo(series, { start: '2014-01-01', end: '2018-12-31' });

  it('does not depend on sessions after the window (no look-ahead)', () => {
    const poisoned = bars.map((bar) =>
      bar.date > '2018-12-31' ? { ...bar, open: 1e9, high: 1e9, low: 1e-9, close: 1e-9 } : bar
    );
    const poisonedDataset = datasetFromBars('P', poisoned);
    const a = evaluateCandidate(dataset, highs, originalParams, train);
    const b = evaluateCandidate(poisonedDataset, new ReferenceHighCache(poisonedDataset.high), originalParams, train);

    assert.deepEqual(a, b);
  });

  it('uses only the lookback before the window as history (warmup)', () => {
    // Drop everything before the lookback that the window needs; the result must not change.
    const lookback = 120;
    const params = { ...originalParams, lookbackSessions: lookback };
    const trimmedBars = bars.slice(train.startIndex - lookback);
    const trimmed = datasetFromBars('T', trimmedBars);
    const shifted = { startIndex: lookback, endIndex: train.endIndex - (train.startIndex - lookback) };
    const full = evaluateCandidate(dataset, highs, params, train);
    const cut = evaluateCandidate(trimmed, new ReferenceHighCache(trimmed.high), params, shifted);

    assert.equal(full.netProfit, cut.netProfit);
    assert.equal(full.maximumDrawdown, cut.maximumDrawdown);
    assert.equal(full.entries, cut.entries);
  });

  it('starts every window flat and marks an open position at the window end, with interest', () => {
    // Find a window end where a position is open.
    for (let end = train.startIndex + 200; end < train.endIndex; end++) {
      const result = simulateWindow(dataset, highs, originalParams, { startIndex: train.startIndex, endIndex: end });
      const open = result.trades.find((trade) => trade.reason === 'open');

      if (!open) {
        continue;
      }

      const days = (dataset.time[end]! - open.entryTime) / 86400;
      const expectedInterest = (open.investment * 0.11 * (days * 86400)) / (365 * 86400);

      assert.ok(Math.abs(result.accruedInterest - expectedInterest) < 1e-9);
      assert.equal(
        result.unrealizedProfit,
        open.shares * dataset.close[end]! - open.investment - result.accruedInterest
      );
      assert.equal(result.netProfit, result.realizedProfit + result.unrealizedProfit);

      // The next window starts flat: its first trade's entry is on or after its own first session.
      const next = simulateWindow(dataset, highs, originalParams, {
        startIndex: end + 1,
        endIndex: Math.min(end + 250, dataset.time.length - 1)
      });

      assert.ok(next.trades.every((trade) => trade.entryIndex >= end + 1));

      return;
    }

    assert.fail('no window end with an open position found');
  });

  it('computes the protocol windows from dates', () => {
    const fold = defaultProtocol.folds[0]!;
    const info = windowInfo(series, fold.validation);

    assert.equal(info.firstSession >= '2019-01-01', true);
    assert.equal(info.lastSession <= '2019-12-31', true);
    assert.equal(info.years, 1);
    assert.ok(info.warmupSessions > 250);
  });
});
