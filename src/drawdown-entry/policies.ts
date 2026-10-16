// Entry policies for families A–F. Each is a deterministic daily state machine over point-in-time
// features. Shared semantics (see ENTRY_COMPARISON.md):
// - A candidate is the current reference-high bar once a 10% signal has occurred against it
//   (features.candAge ≥ 0). Its frozen attributes (velocity, regime at the first signal) are read at the
//   first-signal session t − candAge. A candidate ends when the reference-high bar changes (a new high, or
//   the old high leaving the 90-session window); a new bar needs its own first signal.
// - A rejected candidate stays rejected until it ends. Waiting is re-evaluated at every close.
// - 'zone' entries still need the original 10% signal on the entry session. 'rebound' entries (family D
//   only) may also enter after a confirmed stabilization while the close is at least 5% below the
//   reference high; they are separate strategies.
// - The engine adds the original's restriction (close ≤ 97% of a losing exit and below the reset level),
//   the one-position limit and the no-entry-on-exit-session rule to every policy.

import type { Decision, EntryPolicy, PolicyContext } from './engine.ts';
import type { Features } from './features.ts';
import { mulberry32 } from './stats.ts';

export type Family = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface PolicySpec {
  id: string;
  family: Family;
  description: string;
  build: (features: Features) => EntryPolicy;
}

type Predicate = (features: Features, t: number) => boolean;

const at = (features: Features, name: string, t: number) => features[name]![t]!;

// NaN compares false, so a missing feature never raises a flag or confirms stabilization.
const flags: Record<string, { text: string; test: Predicate }> = {
  ret5_4: { text: 'ret5 ≤ −4%', test: (f, t) => at(f, 'ret5', t) <= -0.04 },
  ret5_6: { text: 'ret5 ≤ −6%', test: (f, t) => at(f, 'ret5', t) <= -0.06 },
  ret5_8: { text: 'ret5 ≤ −8%', test: (f, t) => at(f, 'ret5', t) <= -0.08 },
  accel_3: { text: 'accel5 ≤ −3%', test: (f, t) => at(f, 'accel5', t) <= -0.03 },
  accel_5: { text: 'accel5 ≤ −5%', test: (f, t) => at(f, 'accel5', t) <= -0.05 },
  volRatio_15: { text: 'rv10 / rv60 ≥ 1.5', test: (f, t) => at(f, 'volRatio', t) >= 1.5 },
  volRatio_20: { text: 'rv10 / rv60 ≥ 2.0', test: (f, t) => at(f, 'volRatio', t) >= 2.0 },
  atr_30: { text: 'ATR14 ≥ 3.0% of price', test: (f, t) => at(f, 'atr14', t) >= 0.03 },
  atr_40: { text: 'ATR14 ≥ 4.0% of price', test: (f, t) => at(f, 'atr14', t) >= 0.04 },
  relVol_15: { text: 'relVol20 ≥ 1.5', test: (f, t) => at(f, 'relVol20', t) >= 1.5 },
  relVol_20: { text: 'relVol20 ≥ 2.0', test: (f, t) => at(f, 'relVol20', t) >= 2.0 },
  breadth_60: {
    text: '≥60% of proxies ≥10% below their 90-session high',
    test: (f, t) => at(f, 'xDdFrac10', t) >= 0.6
  },
  breadth_80: {
    text: '≥80% of proxies ≥10% below their 90-session high',
    test: (f, t) => at(f, 'xDdFrac10', t) >= 0.8
  },
  spyDd_7: { text: 'SPY ≥7% below its 90-session high', test: (f, t) => at(f, 'spyDd', t) >= 0.07 },
  spyDd_10: { text: 'SPY ≥10% below its 90-session high', test: (f, t) => at(f, 'spyDd', t) >= 0.1 },
  vix_25: { text: 'previous VIX close ≥ 25', test: (f, t) => at(f, 'vixPrev', t) >= 25 },
  vix_30: { text: 'previous VIX close ≥ 30', test: (f, t) => at(f, 'vixPrev', t) >= 30 },
  failedRally_1: {
    text: '≥1 failed ≥3% rally since the reference high',
    test: (f, t) => at(f, 'failedRallies', t) >= 1
  }
};

const stabilizers: Record<string, { text: string; test: Predicate }> = {
  noNewLow_2: {
    text: 'lowest close since the reference high set ≥2 sessions ago',
    test: (f, t) => at(f, 'lowAge', t) >= 2
  },
  noNewLow_3: {
    text: 'lowest close since the reference high set ≥3 sessions ago',
    test: (f, t) => at(f, 'lowAge', t) >= 3
  },
  noNewLow_5: {
    text: 'lowest close since the reference high set ≥5 sessions ago',
    test: (f, t) => at(f, 'lowAge', t) >= 5
  },
  rebound_2: {
    text: 'close ≥2% above the lowest close since the reference high',
    test: (f, t) => at(f, 'reboundFromLow', t) >= 0.02
  },
  rebound_3: {
    text: 'close ≥3% above the lowest close since the reference high',
    test: (f, t) => at(f, 'reboundFromLow', t) >= 0.03
  },
  rebound_5: {
    text: 'close ≥5% above the lowest close since the reference high',
    test: (f, t) => at(f, 'reboundFromLow', t) >= 0.05
  },
  upClose: { text: 'close above the previous close', test: (f, t) => at(f, 'upClose', t) === 1 },
  volContract: {
    text: 'rv10 below its value 5 sessions earlier and no new closing low for ≥2 sessions',
    test: (f, t) => at(f, 'rv10Change5', t) < 1 && at(f, 'lowAge', t) >= 2
  }
};

export const flagText = (name: string) => flags[name]!.text;
export const stabilizerText = (name: string) => stabilizers[name]!.text;
export const flagNames = Object.keys(flags);
export const stabilizerNames = Object.keys(stabilizers);

const candidateStart = (features: Features, t: number) => {
  const age = at(features, 'candAge', t);

  return Number.isNaN(age) ? -1 : t - age;
};

const enter = (reason: string): Decision => ({ enter: true, reason });
const wait = (reason: string): Decision => ({ enter: false, reason });

const original: PolicySpec = {
  id: 'A_original',
  family: 'A',
  description: 'Enter on every 10% signal (the unchanged baseline).',
  build: () => ({ id: 'A_original', decide: (c) => (c.signal ? enter('signal') : wait('no_signal')) })
};

const skipFast = (v: number): PolicySpec => ({
  id: `B_skipFast_${v}`,
  family: 'B',
  description: `Reject a candidate whose first 10% signal came ≤${v} sessions after its reference-high bar; otherwise as A.`,
  build: (f) => ({
    id: `B_skipFast_${v}`,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      return at(f, 'candVelocity', c.index) <= v
        ? wait(`reject_fast_v${at(f, 'candVelocity', c.index)}`)
        : enter('signal_slow_enough');
    }
  })
});

const skipSlow = (v: number): PolicySpec => ({
  id: `B_skipSlow_${v}`,
  family: 'B',
  description: `Reject a candidate whose first 10% signal came >${v} sessions after its reference-high bar; otherwise as A.`,
  build: (f) => ({
    id: `B_skipSlow_${v}`,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      return at(f, 'candVelocity', c.index) > v
        ? wait(`reject_slow_v${at(f, 'candVelocity', c.index)}`)
        : enter('signal_fast_enough');
    }
  })
});

const deferFast = (v: number, k: number): PolicySpec => ({
  id: `B_deferFast_${v}_${k}`,
  family: 'B',
  description: `If the first signal came ≤${v} sessions after the reference-high bar, wait until ${k} sessions after the first signal (10% signal still required); otherwise as A.`,
  build: (f) => ({
    id: `B_deferFast_${v}_${k}`,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      if (at(f, 'candVelocity', c.index) <= v && at(f, 'candAge', c.index) < k) return wait('defer_fast');
      return enter('signal');
    }
  })
});

const gate = (flag: string): PolicySpec => ({
  id: `C_gate_${flag}`,
  family: 'C',
  description: `Defer while ${flags[flag]!.text} at the close; enter on the first later 10% signal session without the flag.`,
  build: (f) => ({
    id: `C_gate_${flag}`,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      return flags[flag]!.test(f, c.index) ? wait(`defer_${flag}`) : enter('signal_flag_clear');
    }
  })
});

const gateSkip = (flag: string): PolicySpec => ({
  id: `C_skip_${flag}`,
  family: 'C',
  description: `Reject the candidate if ${flags[flag]!.text} at its first 10% signal; otherwise as A.`,
  build: (f) => ({
    id: `C_skip_${flag}`,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      const first = candidateStart(f, c.index);
      return flags[flag]!.test(f, first) ? wait(`reject_${flag}_at_first_signal`) : enter('signal');
    }
  })
});

const stabilize = (name: string, mode: 'zone' | 'rebound'): PolicySpec => ({
  id: `D_${name}_${mode}`,
  family: 'D',
  description:
    mode === 'zone'
      ? `After a candidate's first 10% signal, enter only on a 10% signal session where ${stabilizers[name]!.text}.`
      : `After a candidate's first 10% signal, enter on the first session where ${stabilizers[name]!.text} while the close is still ≥5% below the reference high.`,
  build: (f) => ({
    id: `D_${name}_${mode}`,
    decide: (c: PolicyContext) => {
      const hasCandidate = candidateStart(f, c.index) >= 0;
      const inZone = mode === 'zone' ? c.signal : hasCandidate && c.drawdown >= 0.05;

      if (!inZone) return { enter: false, reason: 'no_signal', log: false };
      return stabilizers[name]!.test(f, c.index)
        ? { ...enter(c.signal ? 'stabilized' : 'stabilized_rebound'), log: true }
        : { ...wait('await_stabilization'), log: true };
    }
  })
});

// Family E: the minimum entry drawdown is set at the candidate's first signal from the regime there.
interface Tier {
  minDrawdown: number; // Infinity = no entry
  stabilize: boolean;
}

const adaptive = (id: string, description: string, tierOf: (f: Features, first: number) => Tier): PolicySpec => ({
  id,
  family: 'E',
  description,
  build: (f) => ({
    id,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      const tier = tierOf(f, candidateStart(f, c.index));
      if (tier.minDrawdown === Infinity) return wait('reject_regime');
      if (c.drawdown < tier.minDrawdown) return wait(`below_${Math.round(tier.minDrawdown * 100)}pct`);
      if (tier.stabilize && !stabilizers.noNewLow_2!.test(f, c.index)) return wait('await_stabilization');
      return enter(`adaptive_${Math.round(tier.minDrawdown * 100)}pct`);
    }
  })
});

const normal: Tier = { minDrawdown: 0.1, stabilize: false };

const scoreAt = (f: Features, t: number) =>
  (at(f, 'ret5', t) <= -0.06 ? 1 : 0) + (at(f, 'xDdFrac10', t) >= 0.8 ? 1 : 0) + (at(f, 'volRatio', t) >= 1.5 ? 1 : 0);

const adaptiveSpecs: PolicySpec[] = [
  adaptive('E_flat15', 'Always require a 15% drawdown.', () => ({ minDrawdown: 0.15, stabilize: false })),
  adaptive('E_flat15_stab', 'Always require a 15% drawdown and no new closing low for ≥2 sessions.', () => ({
    minDrawdown: 0.15,
    stabilize: true
  })),
  adaptive('E_flat20', 'Always require a 20% drawdown.', () => ({ minDrawdown: 0.2, stabilize: false })),
  adaptive('E_flat20_stab', 'Always require a 20% drawdown and no new closing low for ≥2 sessions.', () => ({
    minDrawdown: 0.2,
    stabilize: true
  })),
  adaptive('E_fast15', 'Velocity ≤15 sessions at the first signal → require 15%; otherwise 10%.', (f, first) =>
    at(f, 'candVelocity', first) <= 15 ? { minDrawdown: 0.15, stabilize: false } : normal
  ),
  adaptive(
    'E_fast15_stab',
    'Velocity ≤15 → require 15% and no new closing low for ≥2 sessions; otherwise 10%.',
    (f, first) => (at(f, 'candVelocity', first) <= 15 ? { minDrawdown: 0.15, stabilize: true } : normal)
  ),
  adaptive('E_ret5_15', 'ret5 ≤ −6% at the first signal → require 15%; otherwise 10%.', (f, first) =>
    at(f, 'ret5', first) <= -0.06 ? { minDrawdown: 0.15, stabilize: false } : normal
  ),
  adaptive(
    'E_ret5_15_stab',
    'ret5 ≤ −6% at the first signal → require 15% and no new closing low for ≥2 sessions; otherwise 10%.',
    (f, first) => (at(f, 'ret5', first) <= -0.06 ? { minDrawdown: 0.15, stabilize: true } : normal)
  ),
  adaptive(
    'E_score',
    'Score = [ret5 ≤ −6%] + [≥80% of proxies ≥10% down] + [rv10/rv60 ≥ 1.5] at the first signal: 0 → 10%, 1 → 15%, ≥2 → 20%.',
    (f, first) => {
      const score = scoreAt(f, first);
      return score === 0 ? normal : { minDrawdown: score === 1 ? 0.15 : 0.2, stabilize: false };
    }
  ),
  adaptive(
    'E_score_stab',
    'As E_score, and the 15%/20% tiers also need no new closing low for ≥2 sessions.',
    (f, first) => {
      const score = scoreAt(f, first);
      return score === 0 ? normal : { minDrawdown: score === 1 ? 0.15 : 0.2, stabilize: true };
    }
  ),
  adaptive(
    'E_score_skip',
    'As E_score, but score 1 → 15% plus stabilization, score ≥2 → no entry on the candidate.',
    (f, first) => {
      const score = scoreAt(f, first);
      return score === 0
        ? normal
        : score === 1
          ? { minDrawdown: 0.15, stabilize: true }
          : { minDrawdown: Infinity, stabilize: false };
    }
  )
];

// Family F: a two-stage rule composed from one family-C flag and one zone stabilizer from family D, both
// chosen by the selection procedure on the training data: on a 10% signal, if the flag is raised, wait
// for the stabilizer; otherwise enter as A.
export const combined = (flag: string, stabilizer: string): PolicySpec => ({
  id: `F_${flag}+${stabilizer}`,
  family: 'F',
  description: `On a 10% signal: if ${flags[flag]!.text}, enter only once ${stabilizers[stabilizer]!.text} (10% signal still required); otherwise enter as A.`,
  build: (f) => ({
    id: `F_${flag}+${stabilizer}`,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      if (!flags[flag]!.test(f, c.index)) return enter('signal_flag_clear');
      return stabilizers[stabilizer]!.test(f, c.index)
        ? enter('flagged_then_stabilized')
        : wait(`defer_${flag}_await_stabilization`);
    }
  })
});

export const gridSpecs: PolicySpec[] = [
  original,
  ...[5, 10, 15, 20].map(skipFast),
  ...[20, 40, 60].map(skipSlow),
  deferFast(10, 5),
  deferFast(15, 5),
  ...flagNames.map(gate),
  ...['ret5_6', 'breadth_80', 'vix_30'].map(gateSkip),
  ...stabilizerNames.flatMap((name) => [stabilize(name, 'zone'), stabilize(name, 'rebound')]),
  ...adaptiveSpecs
];

export const specById = (id: string): PolicySpec => {
  const found = gridSpecs.find((spec) => spec.id === id);

  if (found) {
    return found;
  }

  const match = /^F_(.+)\+(.+)$/.exec(id);

  if (match) {
    return combined(match[1]!, match[2]!);
  }

  throw new Error(`Unknown policy ${id}`);
};

// Placebo (Amendment 1): an uninformed random deferral. Each candidate draws a delay of 0..maxDelay
// sessions from a hash of (seed, reference-high bar); entries need the 10% signal and candAge ≥ delay.
// It measures how much the result moves when entry timing changes for no reason.
export const placebo = (seed: number, maxDelay: number): PolicySpec => ({
  id: `P_jitter${maxDelay}_${seed}`,
  family: 'A',
  description: `Placebo: wait a random 0–${maxDelay} sessions after each candidate's first 10% signal (seed ${seed}).`,
  build: (f) => ({
    id: `P_jitter${maxDelay}_${seed}`,
    decide: (c) => {
      if (!c.signal) return wait('no_signal');
      const random = mulberry32(seed * 1000003 + c.peakIndex);
      random();
      const delay = Math.floor(random() * (maxDelay + 1));
      return at(f, 'candAge', c.index) >= delay ? enter('placebo_delay_done') : wait(`placebo_wait_${delay}`);
    }
  })
});
