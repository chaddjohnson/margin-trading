// The pooled evaluation's hold-unit option (evaluate.ts EvalOptions.holdUnit, experimental): the default adds nothing to
// the evaluation key (every archived key and record stays valid) and the session unit is keyed apart. The book caches
// key the unit too (booksOf); stage V of research/vg-l0-session-hold verifies on real data that interleaved calendar and
// session evaluations in one process never share a book.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evalKey, optionsKey } from '../evaluate.ts';
import type { Quad } from '../space.ts';

const q = {
  d1: {
    GDX: {
      targetPercentChange: 277,
      trailingBuyPercentage: 1,
      trailingStopPercentage: 61,
      maximumHoldDays: 13,
      tickWindowSize: 232,
      intradayLossBuffer: 25,
      pullback: 152,
      continuationWindow: 10
    },
    VGT: {
      targetPercentChange: 237,
      trailingBuyPercentage: 9,
      trailingStopPercentage: 73,
      maximumHoldDays: 15,
      tickWindowSize: 72,
      intradayLossBuffer: 42,
      pullback: 103,
      continuationWindow: 41
    }
  },
  g: {
    GDX: {
      entryMethod: 'rise_from_recent_low',
      advanceFromRecentLowPercent: 5,
      recentLowLookbackBars: 20,
      trendFilterEnabled: false,
      eligibilityEnabled: false,
      drawdownRecoveryGateEnabled: false,
      trailingStopPercent: 7.3,
      maximumHoldEnabled: true,
      maximumHoldDays: 8,
      intradayLossBufferEnabled: true,
      intradayLossBufferPercent: 2.9,
      initialStopEnabled: false,
      retentionEnabled: false,
      continuationEnabled: false,
      costBpsPerSide: 5
    },
    VGT: {
      entryMethod: 'rise_from_recent_low',
      advanceFromRecentLowPercent: 5,
      recentLowLookbackBars: 20,
      trendFilterEnabled: false,
      eligibilityEnabled: false,
      drawdownRecoveryGateEnabled: false,
      trailingStopPercent: 7.3,
      maximumHoldEnabled: true,
      maximumHoldDays: 8,
      intradayLossBufferEnabled: true,
      intradayLossBufferPercent: 2.9,
      initialStopEnabled: false,
      retentionEnabled: false,
      continuationEnabled: false,
      costBpsPerSide: 5
    }
  },
  first: 'D1'
} as unknown as Quad;

describe('pooled evaluation: the hold-unit option', () => {
  it('leaves the default key exactly as archived (5B / 3B key format)', () => {
    const archived = 'c5|r0.11|sstop|sl0|armharmonized|ff-|en1101|ws0|bo|bd';
    const o = { enabled: { 'G:GDX': false } } as const;

    assert.equal(optionsKey(o), archived);
    assert.equal(optionsKey({ ...o, holdUnit: 'calendar-days' }), archived);
    assert.equal(evalKey('D24', q, { ...o, holdUnit: 'calendar-days' }), evalKey('D24', q, o));
  });

  it('keys the session unit apart', () => {
    const o = { enabled: { 'G:GDX': false } } as const;

    assert.equal(
      optionsKey({ ...o, holdUnit: 'sessions' }),
      'c5|r0.11|sstop|sl0|armharmonized|ff-|en1101|ws0|bo|bd|husessions'
    );
    assert.notEqual(evalKey('D24', q, { ...o, holdUnit: 'sessions' }), evalKey('D24', q, o));
  });
});
