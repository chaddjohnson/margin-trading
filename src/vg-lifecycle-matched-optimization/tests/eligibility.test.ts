// The eligibility documentation correction (PROTOCOL.md §16; docs/strategy-lab/GROWTH_ENTRY_GATES.md §3.1, §8) checked on
// the canonical engine with synthetic daily sessions (no market data). An armed opportunity is evaluated at its own
// arming bar: expiry, the policy's validity, capital, then the blockers (the trend filter, the Drawdown Recovery Gate,
// an unavailable initial risk stop). Eligibility ON = OFF trade for trade therefore needs BOTH no active blocker AND a
// policy valid at every arming bar:
// - policies 1, 3, 4 and 5 are always valid at the arming bar (the crossing's own predicate holds, the decision price
//   is the signal price, the highest close since arming is that close), and so is policy 2 when a ≤ X;
// - policy 2 with a > X invalidates at once every crossing whose own advance over the fixed low is below a (ON trades
//   less than OFF, with no blocker at all);
// - with no trend filter, a Drawdown Recovery Gate or an unavailable initial stop still blocks, and a blocked armed
//   opportunity is decided later (canonical tests: drawdownGate.test.ts "eligibility ON: the armed opportunity is
//   decided at the 09:32 release …"; entryGates.test.ts "eligibility ON with nothing blocking … = OFF").
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import { scanRiseFromRecentLow } from '../../entry-signals/riseFromRecentLow.ts';
import { type SessionSpec, buildData, flat } from '../../shared-margin-portfolio/tests/fixtures.ts';
import { DEFAULT_ELIGIBILITY, ELIGIBILITY_POLICIES, type EligibilityConfig } from '../../growth-trading/entryGates.ts';
import {
  type RiseTradingParams,
  bookSettingsOf,
  decisionsFromSignals,
  defaultTradingParams,
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

const simulate = (closes: number[], eligibility: EligibilityConfig | null) => {
  const specs: SessionSpec[] = closes.map((c) => flat(c, 3));
  const data = buildData(specs);
  const bars = barsFromSessions(data.vgtSessions, BASE.resolution);
  const entry = { advanceFromRecentLowPercent: BASE.advanceFromRecentLowPercent, recentLowLookbackBars: BASE.recentLowLookbackBars };
  const scan = scanRiseFromRecentLow(bars, entry, 0);

  return simulateTrading(data.ds, decisionsFromSignals(bars, scan.signals), {
    symbol: 'TEST',
    firstSession: 0,
    endSession: data.ds.sessionCount - 1,
    exit: exitParamsOf(BASE),
    book: bookSettingsOf(BASE),
    continuation: null,
    gates: eligibility ? { trend: null, eligibility, bars, entry, capacity: null } : null
  });
};

const pick = (r: ReturnType<typeof simulate>) => r.trades.map((t) => [t.decisionTime, t.entryTime, t.entryRawPrice, t.exitTime, t.net]);

// two ordinary crossings (5.7% and ≈ 6% over their fixed lows) and one violent bar (≥ 9% over the low)
const DOWN = [130, 128, 126, 124, 122, 120, 118, 116, 110, 100, 96];
const PATH = [...DOWN, 101.5, 102, 103, 96, 92, 90, 89, 88, 87, 86, 86, 91.2, 92, 93, 80, 79, 78, 77, 76, 75, 74, 74, 82, 84, 85, 86];

describe('eligibility with no blocker (no trend filter, no recovery gate, no initial stop, standalone capital)', () => {
  test('policies 1, 3, 4 and 5 at their defaults, and policy 2 with a ≤ X: ON = OFF, trade for trade', () => {
    const off = simulate(PATH, null);

    assert.ok(off.trades.length >= 1);
    for (const p of ELIGIBILITY_POLICIES) {
      const cfg = p === 'minimum_strength' ? { ...DEFAULT_ELIGIBILITY.minimum_strength, minimumAdvancePercent: 5 } : DEFAULT_ELIGIBILITY[p];

      assert.deepEqual(pick(simulate(PATH, cfg)), pick(off), p);
    }
  });

  test('policy 2 with a > X (8% > 5%): the ordinary crossings are invalidated at their arming bar; ON ≠ OFF', () => {
    const off = simulate(PATH, null);
    const on = simulate(PATH, { ...DEFAULT_ELIGIBILITY.minimum_strength, minimumAdvancePercent: 8 });
    const vetoed = on.outcomes.filter((o) => o.status === 'vetoed' && o.reason === 'policy_invalidated');

    // OFF takes the first (ordinary, 5.7%) crossing at s11; ON vetoes it and the next ordinary one (s22) at once and
    // enters only on the violent bar (s33, ≥ 8% over its fixed low)
    assert.equal(off.trades[0]!.decisionIndex, 11);
    assert.deepEqual(
      vetoed.map((o) => o.decision.sessionIndex),
      [11, 22]
    );
    assert.equal(on.trades[0]!.decisionIndex, 33);
    assert.notDeepEqual(pick(on), pick(off), 'eligibility ON ≠ OFF with no blocker');
  });
});
