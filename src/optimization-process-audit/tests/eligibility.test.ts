// The 4A eligibility interaction in miniature (PROTOCOL.md §5.4): Growth's canonical engine on synthetic daily
// sessions, with a Rise trigger X = 5% and minimum-strength eligibility a = 8% > X, no trend filter.
// - An ordinary crossing (5.7% over the fixed low) is armed and invalidated AT ONCE ("vetoed", policy_invalidated):
//   no trade, where eligibility OFF trades it.
// - A violent crossing (one bar ≥ 8% over the low) is armed, valid, decided and filled.
// - After that base trade exits, a classic-D1 continuation re-enters WITHOUT any new crossing: eligibility gates only
//   raw crossings, so continuation rights exist only after a violent-day base entry.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import { scanRiseFromRecentLow } from '../../entry-signals/riseFromRecentLow.ts';
import { type SessionSpec, buildData, flat } from '../../shared-margin-portfolio/tests/fixtures.ts';
import { DEFAULT_CONTINUATION } from '../../growth-trading/continuation.ts';
import { DEFAULT_ELIGIBILITY, type EligibilityConfig } from '../../growth-trading/entryGates.ts';
import {
  type RiseTradingParams,
  bookSettingsOf,
  decisionsFromSignals,
  defaultTradingParams,
  entrySourceOf,
  exitParamsOf,
  simulateTrading
} from '../../growth-trading/riseTrading.ts';

const BASE: RiseTradingParams = {
  ...defaultTradingParams,
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 10,
  resolution: '1d',
  trailingStopPercent: 5,
  maximumHoldEnabled: false,
  intradayLossBufferEnabled: false,
  costBpsPerSide: 0
};

const simulate = (closes: number[], over: Partial<RiseTradingParams> = {}) => {
  const specs: SessionSpec[] = closes.map((c) => flat(c, 3));
  const data = buildData(specs);
  const p: RiseTradingParams = { ...BASE, ...over };
  const bars = barsFromSessions(data.vgtSessions, p.resolution);
  const entry = { advanceFromRecentLowPercent: p.advanceFromRecentLowPercent, recentLowLookbackBars: p.recentLowLookbackBars };
  const scan = scanRiseFromRecentLow(bars, entry, 0);
  const c = p.continuation ?? null;
  const sim = simulateTrading(data.ds, decisionsFromSignals(bars, scan.signals), {
    symbol: 'TEST',
    firstSession: 0,
    endSession: data.ds.sessionCount - 1,
    exit: exitParamsOf(p),
    book: bookSettingsOf(p),
    continuation: c ? { config: c, bars: c.method === 'classic_d1' ? null : bars } : null,
    gates: p.eligibility ? { trend: null, eligibility: p.eligibility, bars, entry, capacity: null } : null
  });

  return { sim, trades: sim.trades, ops: sim.gates?.opportunities ?? [], signals: scan.signals };
};

const strength8: EligibilityConfig = { ...DEFAULT_ELIGIBILITY.minimum_strength, minimumAdvancePercent: 8 };
const DOWN = [130, 128, 126, 124, 122, 120, 118, 116, 110, 100, 96];

describe('4A pattern: minimum strength above the Rise trigger, no trend filter', () => {
  test('an ordinary crossing is armed and invalidated at once; eligibility OFF would trade it', () => {
    const path = [...DOWN, 101.5, 102, 102.5, 103, 103.5, 104, 104];
    const on = simulate(path, { eligibility: strength8 });
    const off = simulate(path);

    assert.equal(on.signals.length, 1);
    assert.equal(on.sim.outcomes[0]!.status, 'vetoed');
    assert.equal(on.sim.outcomes[0]!.reason, 'policy_invalidated');
    assert.equal(on.ops[0]!.endState, 'invalidated');
    assert.equal(on.ops[0]!.endSession, 11); // the arming session itself
    assert.equal(on.trades.length, 0);
    assert.equal(off.trades.length, 1);
  });

  test('a violent crossing (one bar ≥ 8% over the fixed low) is decided at arming and filled', () => {
    const on = simulate([...DOWN, 104, 105, 106, 107], { eligibility: strength8 });

    assert.equal(on.ops[0]!.endState, 'consumed');
    assert.equal(on.ops[0]!.ageSessionsAtDecision, 0);
    assert.equal(on.trades.length, 1);
  });

  test('continuation re-enters after the eligible base trade without any new crossing', () => {
    // base entry on the violent day, a run-up, a ≥ 5% fall (trailing-stop exit), a ≥ 9% pullback and a 0.3% rebound
    const wave = [104, 108, 112, 116, 118, 116, 112, 108, 104, 101, 100, 100.5, 101, 101.5, 102, 102.5, 103];
    const cont = { ...DEFAULT_CONTINUATION.classic_d1, pullbackPercent: 9, reboundPercent: 0.3 };
    const on = simulate([...DOWN, ...wave], { eligibility: strength8, continuation: cont });
    const sources = on.trades.map((t) => entrySourceOf(on.sim, t));

    assert.equal(on.signals.length, 1); // one raw crossing in the whole path
    assert.ok(on.trades.length >= 2, `trades ${on.trades.length}`);
    assert.equal(sources[0], 'rise_from_recent_low');
    assert.ok(sources.slice(1).every((s) => s.startsWith('continuation:')), sources.join(','));
  });
});
