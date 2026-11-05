// Growth entry gates (rise-from-recent-low-trading v1.2.0): the OPTIONAL entry trend filter and the OPTIONAL persistent
// (latched) entry eligibility, both OFF by default. With both OFF the simulation never creates this controller, so every
// decision, fill, exit, mark and log entry is the v1.1.0 one (tests/offParity-1.1.0.test.ts). Specification:
// docs/strategy-lab/GROWTH_ENTRY_GATES.md.
//
// TREND FILTER. A gate on every Growth-owned entry DECISION (the base crossing, a latched opportunity's later decision,
// a renewal signal and a continuation trigger), evaluated at the decision instant from data complete at that instant.
// Observations are sampled in TRADING SESSIONS of the dataset (NYSE sessions present in the data), whatever the signal
// resolution: for a decision at time t in session s,
//   P_0 = the decision price (the close of the completed decision bar, the instant's latest observation),
//   P_k = the regular-session close of session s−k (k ≥ 1; the closing print, or the last regular trade),
//   H_0 / L_0 = the high / low of session s over the minutes completed by t (the whole session, closing print included,
//               for a decision at the close); H_k / L_k = session s−k's high / low (k ≥ 1).
// The current session is never duplicated and its later bars are never read. A window that reaches before the loaded
// history is `insufficient_history`; a non-positive or non-finite price is `invalid_data`; both BLOCK (fail closed).
//   price_change       A: P_0 ≥ P_N × (1 + m)                                        (m = minimumReturnPercent)
//   regression_slope   B: OLS of ln P against the session index over P_N … P_0 (N+1 points); slope b per session;
//                         slope% = (e^{bN} − 1) × 100 ≥ minimumSlopePercent. Logs are centred on ln P_N, so a flat
//                         series has exactly b = 0.
//   rising_sma         C: P_0 > SMA_now AND SMA_now > SMA_then (both strict), SMA_now = mean(P_0 … P_{N−1}),
//                         SMA_then = mean(P_K … P_{K+N−1}) (the SMA as it stood at the close K sessions earlier).
//   higher_highs_lows  D: the N observations k = 0 … N−1 split into a newer and an older half of floor(N/2) each (odd
//                         N: the middle one belongs to neither); max H(newer) > max H(older) × (1 + m) AND
//                         min L(newer) > min L(older) × (1 + m). A two-window structural proxy, not a swing-pivot rule.
//   momentum           E: P_0 ≥ P_S × (1 + mS) AND P_0 ≥ P_L × (1 + mL), 0 < S < L.
// "≥" comparisons of a price with a threshold absorb binary rounding only (relative 1e-12, as the Rise scanner).
//
// PERSISTENT ELIGIBILITY. A taken-while-flat raw crossing (or, under policy 5, a renewal signal) ARMS an opportunity:
// not an order and no capital reserved. It is evaluated at its arming decision and then at every completed bar of the
// run resolution while the book is flat with no order: expiry, then the policy's validity (failing it INVALIDATES,
// terminal), then capital (a harness hook; always free in standalone Growth), then the trend filter (failing either
// BLOCKS: the opportunity stays armed), then a DECISION — an order filled at the next eligible trade at the then-current
// price, never the original signal price. Age: the arming session is day 0; decisions are allowed through session
// origin + W inclusive; the opportunity expires after that session's close. One live opportunity per symbol.
//   time_limited       1: valid while the completed bar satisfies the original predicate (close ≥ rolling N-bar low × (1+X)).
//   minimum_strength   2: valid while close ≥ the FIXED signal-time recent low × (1 + a) (no rolling drift), from arming on.
//   maximum_extension  3: the predicate AND close ≤ the original signal price × (1 + e); above the cap → invalidated.
//   deterioration      4: the predicate AND close > the highest completed-bar close since arming × (1 − d).
//   reset_renew        5: as 1; after an UNCONSUMED opportunity expires or is invalidated, one renewal watch bounded by
//                         W sessions: a later close ≤ ref × (1 − D) resets it (ref = the ended opportunity's signal
//                         price); trough = the lowest close since the reset (the candidate bar excluded); the first bar
//                         closing ≥ trough × (1 + R) ends the watch, and is a renewal signal only if the original
//                         predicate holds on it. A genuine crossing takes precedence; any entry cancels the watch.
import type { SignalBar } from '../entry-signals/bars.ts';
import { RELATIVE_TOLERANCE } from '../entry-signals/riseFromRecentLow.ts';
import type { Dataset } from '../four-family/data.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import type { DecisionLog, LogEntry, LogValue } from './continuation.ts';

// ----- the trend filter -----

export const TREND_METHODS = [
  'price_change',
  'regression_slope',
  'rising_sma',
  'higher_highs_lows',
  'momentum'
] as const;
export type TrendMethod = (typeof TREND_METHODS)[number];

export const TREND_METHOD_LABEL: Record<TrendMethod, string> = {
  price_change: 'A — N-session price change',
  regression_slope: 'B — Regression trend slope',
  rising_sma: 'C — Rising moving average',
  higher_highs_lows: 'D — Higher highs and higher lows',
  momentum: 'E — Short-/long-term momentum'
};

export type TrendFilterConfig =
  | { method: 'price_change'; lookbackSessions: number; minimumReturnPercent: number }
  | { method: 'regression_slope'; lookbackSessions: number; minimumSlopePercent: number }
  | { method: 'rising_sma'; movingAverageSessions: number; slopeComparisonSessions: number }
  | { method: 'higher_highs_lows'; lookbackSessions: number; minimumStructureIncreasePercent: number }
  | {
      method: 'momentum';
      shortLookbackSessions: number;
      longLookbackSessions: number;
      minimumShortReturnPercent: number;
      minimumLongReturnPercent: number;
    };

// Illustrative defaults, not optimised.
export const DEFAULT_TREND: { [M in TrendMethod]: Extract<TrendFilterConfig, { method: M }> } = {
  price_change: { method: 'price_change', lookbackSessions: 20, minimumReturnPercent: 0 },
  regression_slope: { method: 'regression_slope', lookbackSessions: 20, minimumSlopePercent: 0 },
  rising_sma: { method: 'rising_sma', movingAverageSessions: 50, slopeComparisonSessions: 5 },
  higher_highs_lows: { method: 'higher_highs_lows', lookbackSessions: 20, minimumStructureIncreasePercent: 0 },
  momentum: {
    method: 'momentum',
    shortLookbackSessions: 5,
    longLookbackSessions: 60,
    minimumShortReturnPercent: 0,
    minimumLongReturnPercent: 0
  }
};

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const int = (v: unknown, min: number, max: number) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const inRange = (v: unknown, min: number, max: number) => finite(v) && v >= min && v <= max;

export const trendConfigErrors = (c: TrendFilterConfig): string[] => {
  const errors: string[] = [];
  const sessions = (name: string, v: unknown, min: number) => {
    if (!int(v, min, 1000)) errors.push(`${name} must be an integer in [${min}, 1000]`);
  };
  const pct = (name: string, v: unknown, min: number, max: number) => {
    if (!inRange(v, min, max)) errors.push(`${name} must be in [${min}, ${max}]`);
  };

  if (!TREND_METHODS.includes(c.method)) return [`unknown trend method ${String(c.method)}`];
  if (c.method === 'price_change') {
    sessions('lookbackSessions', c.lookbackSessions, 1);
    pct('minimumReturnPercent', c.minimumReturnPercent, -99, 1000);
  } else if (c.method === 'regression_slope') {
    sessions('lookbackSessions', c.lookbackSessions, 2);
    pct('minimumSlopePercent', c.minimumSlopePercent, -99, 1000);
  } else if (c.method === 'rising_sma') {
    sessions('movingAverageSessions', c.movingAverageSessions, 2);
    sessions('slopeComparisonSessions', c.slopeComparisonSessions, 1);
  } else if (c.method === 'higher_highs_lows') {
    sessions('lookbackSessions', c.lookbackSessions, 2);
    pct('minimumStructureIncreasePercent', c.minimumStructureIncreasePercent, 0, 100);
  } else {
    sessions('shortLookbackSessions', c.shortLookbackSessions, 1);
    sessions('longLookbackSessions', c.longLookbackSessions, 2);
    if (int(c.shortLookbackSessions, 1, 1000) && int(c.longLookbackSessions, 2, 1000))
      if (!(c.shortLookbackSessions < c.longLookbackSessions))
        errors.push('shortLookbackSessions must be below longLookbackSessions (0 < S < L)');
    pct('minimumShortReturnPercent', c.minimumShortReturnPercent, -99, 1000);
    pct('minimumLongReturnPercent', c.minimumLongReturnPercent, -99, 1000);
  }

  return errors;
};

// The oldest session offset k a method reads (P_k, H_k, L_k): the sessions of history it needs before a decision.
export const trendWarmupSessions = (c: TrendFilterConfig | null | undefined) => {
  if (!c) return 0;
  switch (c.method) {
    case 'price_change':
    case 'regression_slope':
      return c.lookbackSessions;
    case 'rising_sma':
      return c.slopeComparisonSessions + c.movingAverageSessions - 1;
    case 'higher_highs_lows':
      return c.lookbackSessions - 1;
    case 'momentum':
      return c.longLookbackSessions;
  }
};

// A percentage as a fraction, the double nearest to the decimal.
export const fraction = (percent: number) => {
  const f = Number(`${percent}e-2`);

  return Number.isFinite(f) ? f : percent / 100;
};

const r6 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : null);
const atOrAbove = (price: number, threshold: number) => price >= threshold * (1 - RELATIVE_TOLERANCE);
const atOrBelow = (price: number, threshold: number) => price <= threshold * (1 + RELATIVE_TOLERANCE);

export type TrendDecision = 'pass' | 'block' | 'insufficient_history' | 'invalid_data';

export interface TrendEvaluation {
  method: TrendMethod;
  decision: TrendDecision;
  pass: boolean;
  reason: string;
  values: Record<string, LogValue>;
}

// Evaluates the configured method for a decision at `time` in session s with decision price `price`. Pure with respect
// to the simulation (reads the dataset only, up to `time`); caches the current session's running high/low.
export class TrendGate {
  private prefixSession = -1;
  private prefixHigh: Float64Array = new Float64Array(0);
  private prefixLow: Float64Array = new Float64Array(0);
  evaluations = 0;

  constructor(
    readonly ds: Dataset,
    readonly config: TrendFilterConfig
  ) {
    const errors = trendConfigErrors(config);

    if (errors.length) throw new Error(`invalid trend filter: ${errors.join('; ')}`);
  }

  // Session s's high/low through the minutes completed by `time` (the whole session at or after its close).
  partialHighLow(s: number, time: number): { high: number; low: number; minutes: number } {
    const ds = this.ds;

    if (time >= ds.sCloseTime[s]!) return { high: ds.sHigh[s]!, low: ds.sLow[s]!, minutes: ds.sBarCount[s]! };

    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    if (this.prefixSession !== s) {
      this.prefixSession = s;
      this.prefixHigh = new Float64Array(count);
      this.prefixLow = new Float64Array(count);

      for (let i = 0; i < count; i++) {
        this.prefixHigh[i] = i ? Math.max(this.prefixHigh[i - 1]!, ds.bHigh[start + i]!) : ds.bHigh[start + i]!;
        this.prefixLow[i] = i ? Math.min(this.prefixLow[i - 1]!, ds.bLow[start + i]!) : ds.bLow[start + i]!;
      }
    }

    let k = -1;
    let lo = 0;
    let hi = count - 1;

    // the last minute that completes (start + 60 s) at or before `time`
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;

      if (ds.bTime[start + mid]! + 60 <= time) {
        k = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }

    return k < 0
      ? { high: NaN, low: NaN, minutes: 0 }
      : { high: this.prefixHigh[k]!, low: this.prefixLow[k]!, minutes: k + 1 };
  }

  evaluate(s: number, time: number, price: number): TrendEvaluation {
    this.evaluations++;

    const ds = this.ds;
    const c = this.config;
    const need = trendWarmupSessions(c);
    const base: Record<string, LogValue> = { method: c.method, decisionPrice: price, sessionsNeeded: need };

    if (s - need < 0)
      return {
        method: c.method,
        decision: 'insufficient_history',
        pass: false,
        reason: `insufficient_history: needs ${need} completed session(s) before ${ds.dates[s]}, ${s} loaded`,
        values: { ...base, sessionsAvailable: s }
      };

    const close = (k: number) => (k === 0 ? price : ds.sClose[s - k]!);
    const bad = (x: number) => !(Number.isFinite(x) && x > 0);
    const invalid = (what: string, values: Record<string, LogValue>): TrendEvaluation => ({
      method: c.method,
      decision: 'invalid_data',
      pass: false,
      reason: `invalid_data: ${what}`,
      values: { ...base, ...values }
    });
    const result = (pass: boolean, values: Record<string, LogValue>, why: string): TrendEvaluation => ({
      method: c.method,
      decision: pass ? 'pass' : 'block',
      pass,
      reason: pass ? `pass: ${why}` : `trend_veto: ${why}`,
      values: { ...base, ...values }
    });

    if (bad(price)) return invalid('the decision price is not a positive finite number', {});

    if (c.method === 'price_change') {
      const ref = close(c.lookbackSessions);

      if (bad(ref)) return invalid(`the close of ${ds.dates[s - c.lookbackSessions]}`, {});

      const threshold = ref * (1 + fraction(c.minimumReturnPercent));
      const pass = atOrAbove(price, threshold);
      const ret = (price / ref - 1) * 100;

      return result(
        pass,
        {
          lookbackSessions: c.lookbackSessions,
          referenceSession: ds.dates[s - c.lookbackSessions]!,
          referenceClose: ref,
          returnPercent: r6(ret),
          minimumReturnPercent: c.minimumReturnPercent,
          thresholdPrice: r6(threshold)
        },
        `${r6(ret)}% over ${c.lookbackSessions} session(s) ${pass ? '≥' : '<'} ${c.minimumReturnPercent}%`
      );
    }

    if (c.method === 'regression_slope') {
      const n = c.lookbackSessions;
      const ref = close(n);

      if (bad(ref)) return invalid(`the close of ${ds.dates[s - n]}`, {});

      const logRef = Math.log(ref);
      const points = n + 1;
      const xMean = n / 2;
      let yMean = 0;
      const y = new Float64Array(points);

      for (let j = 0; j <= n; j++) {
        const p = close(n - j);

        if (bad(p)) return invalid(`the close of ${ds.dates[s - (n - j)]}`, {});
        y[j] = j === 0 ? 0 : Math.log(p) - logRef; // centred on ln P_N: a flat series is exactly zero
        yMean += y[j]!;
      }

      yMean /= points;

      let sxy = 0;
      let sxx = 0;
      let syy = 0;

      for (let j = 0; j <= n; j++) {
        sxy += (j - xMean) * (y[j]! - yMean);
        sxx += (j - xMean) * (j - xMean);
        syy += (y[j]! - yMean) * (y[j]! - yMean);
      }

      const b = sxy / sxx;
      const slopePercent = (Math.exp(b * n) - 1) * 100;
      const pass = slopePercent >= c.minimumSlopePercent;

      return result(
        pass,
        {
          lookbackSessions: n,
          observations: points,
          firstSession: ds.dates[s - n]!,
          logSlopePerSession: r6(b),
          slopePercentOverLookback: r6(slopePercent),
          rSquared: syy > 0 ? r6((sxy * sxy) / (sxx * syy)) : null,
          minimumSlopePercent: c.minimumSlopePercent
        },
        `fitted ${r6(slopePercent)}% over ${n} session(s) ${pass ? '≥' : '<'} ${c.minimumSlopePercent}%`
      );
    }

    if (c.method === 'rising_sma') {
      const n = c.movingAverageSessions;
      const k = c.slopeComparisonSessions;
      let now = 0;
      let then = 0;

      for (let i = 0; i < n; i++) {
        const a = close(i);
        const b = close(k + i);

        if (bad(a) || bad(b)) return invalid(`a close inside the ${n}-session averages`, {});
        now += a;
        then += b;
      }

      now /= n;
      then /= n;

      const above = price > now;
      const rising = now > then;

      return result(
        above && rising,
        {
          movingAverageSessions: n,
          slopeComparisonSessions: k,
          sma: r6(now),
          smaEarlier: r6(then),
          smaRisePercent: r6((now / then - 1) * 100),
          priceAboveSma: above,
          smaRising: rising
        },
        `price ${above ? '>' : '≤'} SMA${n} ${r6(now)}; SMA ${rising ? '>' : '≤'} its value ${k} session(s) earlier ${r6(then)}`
      );
    }

    if (c.method === 'higher_highs_lows') {
      const n = c.lookbackSessions;
      const h = Math.floor(n / 2);
      const m = fraction(c.minimumStructureIncreasePercent);
      const current = this.partialHighLow(s, time);
      const highOf = (k: number) => (k === 0 ? current.high : ds.sHigh[s - k]!);
      const lowOf = (k: number) => (k === 0 ? current.low : ds.sLow[s - k]!);
      let newerHigh = -Infinity;
      let newerLow = Infinity;
      let olderHigh = -Infinity;
      let olderLow = Infinity;

      for (let k = 0; k < h; k++) {
        if (bad(highOf(k)) || bad(lowOf(k))) return invalid(`the high/low of ${ds.dates[s - k]}`, {});
        newerHigh = Math.max(newerHigh, highOf(k));
        newerLow = Math.min(newerLow, lowOf(k));
      }

      for (let k = n - h; k < n; k++) {
        if (bad(highOf(k)) || bad(lowOf(k))) return invalid(`the high/low of ${ds.dates[s - k]}`, {});
        olderHigh = Math.max(olderHigh, highOf(k));
        olderLow = Math.min(olderLow, lowOf(k));
      }

      const higherHigh = newerHigh > olderHigh * (1 + m);
      const higherLow = newerLow > olderLow * (1 + m);

      return result(
        higherHigh && higherLow,
        {
          lookbackSessions: n,
          halfSessions: h,
          middleExcluded: n % 2 === 1,
          currentSessionMinutes: current.minutes,
          newerHigh,
          newerLow,
          olderHigh,
          olderLow,
          highIncreasePercent: r6((newerHigh / olderHigh - 1) * 100),
          lowIncreasePercent: r6((newerLow / olderLow - 1) * 100),
          minimumStructureIncreasePercent: c.minimumStructureIncreasePercent,
          higherHigh,
          higherLow
        },
        `newer high ${newerHigh} ${higherHigh ? '>' : '≤'} older ${olderHigh}; newer low ${newerLow} ${higherLow ? '>' : '≤'} older ${olderLow}`
      );
    }

    const shortRef = close(c.shortLookbackSessions);
    const longRef = close(c.longLookbackSessions);

    if (bad(shortRef) || bad(longRef)) return invalid('a reference close', {});

    const shortPass = atOrAbove(price, shortRef * (1 + fraction(c.minimumShortReturnPercent)));
    const longPass = atOrAbove(price, longRef * (1 + fraction(c.minimumLongReturnPercent)));
    const shortReturn = (price / shortRef - 1) * 100;
    const longReturn = (price / longRef - 1) * 100;

    return result(
      shortPass && longPass,
      {
        shortLookbackSessions: c.shortLookbackSessions,
        longLookbackSessions: c.longLookbackSessions,
        shortReferenceClose: shortRef,
        longReferenceClose: longRef,
        shortReturnPercent: r6(shortReturn),
        longReturnPercent: r6(longReturn),
        minimumShortReturnPercent: c.minimumShortReturnPercent,
        minimumLongReturnPercent: c.minimumLongReturnPercent,
        shortPass,
        longPass
      },
      `short ${r6(shortReturn)}% ${shortPass ? '≥' : '<'} ${c.minimumShortReturnPercent}%, long ${r6(longReturn)}% ${longPass ? '≥' : '<'} ${c.minimumLongReturnPercent}%`
    );
  }
}

// ----- the original Rise predicate per bar (the scanner's formula, for the eligibility qualification) -----

export interface PredicateStates {
  low: Float64Array; // L_i (NaN before bar N−1)
  threshold: Float64Array; // T_i = L_i × (1 + X)
  holds: Uint8Array; // 1 = C_i true, 0 = false, 2 = not evaluable (i < N−1)
}

// The same rolling low and tolerance as src/entry-signals/riseFromRecentLow.ts (unchanged): C_i ⇔ close_i ≥ T_i(1−1e-12).
// Its false→true edges are exactly the scanner's crossings (tests/entryGates.test.ts).
export const risePredicateStates = (bars: readonly SignalBar[], x: number, n: number): PredicateStates => {
  const factor = 1 + x / 100;
  const low = new Float64Array(bars.length).fill(NaN);
  const threshold = new Float64Array(bars.length).fill(NaN);
  const holds = new Uint8Array(bars.length).fill(2);
  const deque: number[] = [];
  let head = 0;

  for (let i = 0; i < bars.length; i++) {
    while (deque.length > head && bars[deque.at(-1)!]!.low > bars[i]!.low) deque.pop();
    deque.push(i);
    while (deque[head]! <= i - n) head++;
    if (i < n - 1) continue;

    const l = bars[deque[head]!]!.low;

    low[i] = l;
    threshold[i] = l * factor;
    holds[i] = bars[i]!.close >= l * factor * (1 - RELATIVE_TOLERANCE) ? 1 : 0;
  }

  return { low, threshold, holds };
};

// ----- persistent eligibility -----

export const ELIGIBILITY_POLICIES = [
  'time_limited',
  'minimum_strength',
  'maximum_extension',
  'deterioration',
  'reset_renew'
] as const;
export type EligibilityPolicy = (typeof ELIGIBILITY_POLICIES)[number];

export const ELIGIBILITY_POLICY_LABEL: Record<EligibilityPolicy, string> = {
  time_limited: '1 — Time-limited opportunity',
  minimum_strength: '2 — Minimum trend strength',
  maximum_extension: '3 — Maximum price extension',
  deterioration: '4 — Trend-deterioration invalidation',
  reset_renew: '5 — Reset and renew after a fresh recovery'
};

export type EligibilityConfig =
  | { policy: 'time_limited'; maxAgeSessions: number }
  | { policy: 'minimum_strength'; maxAgeSessions: number; minimumAdvancePercent: number }
  | { policy: 'maximum_extension'; maxAgeSessions: number; maximumExtensionPercent: number }
  | { policy: 'deterioration'; maxAgeSessions: number; deteriorationDropPercent: number }
  | { policy: 'reset_renew'; maxAgeSessions: number; resetDropPercent: number; renewalReboundPercent: number };

// Illustrative defaults, not optimised.
export const DEFAULT_ELIGIBILITY: { [P in EligibilityPolicy]: Extract<EligibilityConfig, { policy: P }> } = {
  time_limited: { policy: 'time_limited', maxAgeSessions: 10 },
  minimum_strength: { policy: 'minimum_strength', maxAgeSessions: 10, minimumAdvancePercent: 3 },
  maximum_extension: { policy: 'maximum_extension', maxAgeSessions: 10, maximumExtensionPercent: 3 },
  deterioration: { policy: 'deterioration', maxAgeSessions: 10, deteriorationDropPercent: 3 },
  reset_renew: { policy: 'reset_renew', maxAgeSessions: 10, resetDropPercent: 3, renewalReboundPercent: 2 }
};

export const eligibilityConfigErrors = (c: EligibilityConfig): string[] => {
  const errors: string[] = [];
  const pct = (name: string, v: unknown, min: number, max: number, minInclusive: boolean) => {
    if (!finite(v) || (minInclusive ? v < min : v <= min) || v > max)
      errors.push(`${name} must be in ${minInclusive ? '[' : '('}${min}, ${max}]`);
  };

  if (!ELIGIBILITY_POLICIES.includes(c.policy)) return [`unknown eligibility policy ${String(c.policy)}`];
  if (!int(c.maxAgeSessions, 1, 250)) errors.push('maxAgeSessions must be an integer in [1, 250] (a bounded age)');
  if (c.policy === 'minimum_strength') pct('minimumAdvancePercent', c.minimumAdvancePercent, 0, 100, true);
  if (c.policy === 'maximum_extension') pct('maximumExtensionPercent', c.maximumExtensionPercent, 0, 100, false);
  if (c.policy === 'deterioration') pct('deteriorationDropPercent', c.deteriorationDropPercent, 0, 100, false);
  if (c.policy === 'reset_renew') {
    pct('resetDropPercent', c.resetDropPercent, 0, 100, false);
    pct('renewalReboundPercent', c.renewalReboundPercent, 0, 100, false);
  }

  return errors;
};

export type OpportunitySource = 'rise_from_recent_low' | 'eligibility_renewal';
export type OpportunityState =
  | 'armed'
  | 'blocked_by_trend'
  | 'blocked_by_capital'
  | 'blocked_by_protection' // v1.3.0: the initial risk stop is unavailable for this decision's fill
  | 'ordered'
  | 'consumed'
  | 'invalidated'
  | 'expired'
  | 'superseded'
  | 'unfilled_at_end'
  | 'end_of_data';
export type GateReason = 'trend_veto' | 'insufficient_history' | 'invalid_data' | 'capital_unavailable';

export interface Opportunity {
  id: string; // O-1, O-2 … per symbol
  source: OpportunitySource;
  renewedFrom: string | null; // policy 5: the opportunity whose expiry/invalidation opened the renewal watch
  policy: EligibilityPolicy;
  signalTime: number; // the arming decision instant (the signal bar's end)
  signalSession: number; // the origin session (day 0)
  signalBar: number;
  signalPrice: number; // the signal bar's close
  recentLow: number; // the rolling N-bar low at the signal (fixed reference of policy 2)
  threshold: number; // the Rise threshold at the signal
  advancePercent: number; // (signal price / recent low − 1) × 100
  lastEligibleSession: number; // origin + W (may lie past the data)
  state: OpportunityState;
  evaluations: number; // decisions evaluated (the arming one included)
  blockedEvaluations: Record<GateReason, number>;
  firstBlockedTime: number;
  lastBlockReason: string | null;
  maxClose: number; // policy 4: the highest completed-bar close since arming
  decisionTime: number;
  decisionPrice: number;
  decisionSession: number;
  ageSessionsAtDecision: number; // the decision session − the origin session
  decisionValues: Record<string, LogValue>;
  trade: VirtualTrade | null;
  endState: OpportunityState | null; // the terminal state
  endReason: string | null;
  endTime: number;
  endSession: number;
  endValues: Record<string, LogValue>;
  renewal: {
    watch: string;
    reference: number;
    resetTime: number;
    resetPrice: number;
    trough: number;
    troughTime: number;
    reboundThreshold: number;
  } | null;
  transitions: { t: number; session: number; state: OpportunityState; reason: string }[];
}

export interface RenewalWatch {
  id: string; // RW-1 …
  from: Opportunity;
  reference: number; // the ended opportunity's signal price
  startTime: number;
  lastSession: number; // the watch lapses after the close of this session (end session + W)
  state: 'waiting_reset' | 'reset' | 'renewed' | 'ended';
  resetTime: number;
  resetPrice: number;
  trough: number;
  troughTime: number;
  end:
    | 'renewed'
    | 'predicate_false_at_rebound'
    | 'lapsed'
    | 'superseded_by_crossing'
    | 'entry_taken'
    | 'end_of_data'
    | null;
  endTime: number;
}

export interface GateResult {
  pass: boolean;
  reason: 'pass' | GateReason;
  trend: TrendEvaluation | null;
  capital: boolean | null; // null = no capital hook (standalone)
  text: string;
  protection?: ProtectionResult; // v1.3.0: present only with the initial risk stop ON
}

// v1.3.0: the initial risk stop's decision-time availability (optionalRules.ts PositionRules.protection).
export interface ProtectionResult {
  pass: boolean;
  reason: 'pass' | 'insufficient_history' | 'invalid_data';
  text: string;
  values: Record<string, LogValue>;
}

// The record of one Growth entry decision judged by the gates (the raw crossing, a latched decision, a renewal signal).
export interface GatedDecision {
  kind: 'crossing' | 'latched' | 'renewal';
  time: number;
  session: number;
  price: number;
  opportunity: Opportunity | null;
  disposition: 'taken' | 'vetoed' | 'deferred' | 'invalidated';
  reason: string;
  gate: GateResult | null;
  validity: Record<string, LogValue> | null;
  trade: VirtualTrade | null;
  status: 'ordered' | 'filled' | 'unfilled_at_end' | null;
}

export interface GateRuntime {
  trend: TrendFilterConfig | null;
  eligibility: EligibilityConfig | null;
  bars: readonly SignalBar[]; // the run-resolution bars, warm-up included (the scanner's bars)
  entry: { advanceFromRecentLowPercent: number; recentLowLookbackBars: number };
  // Harness-only stand-in for a future shared-capital allocator: false = the slot is occupied at (s, time). Absent in
  // Strategy Lab (standalone Growth always has its own capital).
  capacity?: ((s: number, time: number) => boolean) | null;
  // v1.3.0: the initial risk stop's availability for a decision at (s, time), checked after the trend filter. A failure
  // BLOCKS like the trend filter (a crossing is vetoed; a latched opportunity waits). Absent = no initial stop.
  protection?: ((s: number, time: number) => ProtectionResult) | null;
}

export interface CrossingInput {
  time: number;
  price: number;
  trigger: number;
  reference: number;
  barIndex: number | null;
}

export interface GateHooks {
  // Places the order of a base-family decision (closes a continuation episode first: base priority) and returns it.
  enter: (
    decision: { id: string; time: number; price: number; trigger: number; reference: number },
    s: number
  ) => VirtualTrade;
  flatWithoutOrder: () => boolean;
}

// The gates of ONE symbol inside simulateTrading. The minute loop calls nextTime/evaluate (bar ends of the run
// resolution); decide() calls onCrossing for a raw crossing met while flat with no order; the continuation controller
// calls check() for its triggers and afterEntry() after an entry it took.
export class EntryGates {
  readonly trend: TrendGate | null;
  readonly predicate: PredicateStates | null;
  readonly opportunities: Opportunity[] = [];
  readonly watches: RenewalWatch[] = [];
  readonly decisions: GatedDecision[] = [];
  readonly gateBlocks: Record<string, Record<GateReason, number>> = {};
  private live: Opportunity | undefined;
  private watch: RenewalWatch | undefined;
  private byTrade = new Map<VirtualTrade, GatedDecision>();
  private nextBar = 0;

  constructor(
    readonly ds: Dataset,
    readonly runtime: GateRuntime,
    readonly log: DecisionLog,
    private readonly hooks: GateHooks
  ) {
    this.trend = runtime.trend ? new TrendGate(ds, runtime.trend) : null;
    if (runtime.eligibility) {
      const errors = eligibilityConfigErrors(runtime.eligibility);

      if (errors.length) throw new Error(`invalid eligibility: ${errors.join('; ')}`);
    }
    this.predicate = runtime.eligibility
      ? risePredicateStates(
          runtime.bars,
          runtime.entry.advanceFromRecentLowPercent,
          runtime.entry.recentLowLookbackBars
        )
      : null;
  }

  get eligibility() {
    return this.runtime.eligibility;
  }

  get liveOpportunity() {
    return this.live;
  }

  get activeWatch() {
    return this.watch;
  }

  // ----- the gate (capital, then the trend filter) -----

  check(s: number, time: number, price: number, origin: string): GateResult {
    const capital = this.runtime.capacity ? this.runtime.capacity(s, time) : null;
    const count = (reason: GateReason) => {
      const c = (this.gateBlocks[origin] ??= {
        trend_veto: 0,
        insufficient_history: 0,
        invalid_data: 0,
        capital_unavailable: 0
      });

      c[reason]++;
    };

    if (capital === false) {
      count('capital_unavailable');
      return {
        pass: false,
        reason: 'capital_unavailable',
        trend: null,
        capital,
        text: 'capital_unavailable: the shared slot is occupied'
      };
    }

    const trend = this.trend ? this.trend.evaluate(s, time, price) : null;

    if (trend && !trend.pass) {
      const reason: GateReason =
        trend.decision === 'insufficient_history'
          ? 'insufficient_history'
          : trend.decision === 'invalid_data'
            ? 'invalid_data'
            : 'trend_veto';

      count(reason);
      return { pass: false, reason, trend, capital, text: trend.reason };
    }

    const protection = this.runtime.protection ? this.runtime.protection(s, time) : null;

    if (protection && !protection.pass) {
      count(protection.reason as GateReason);
      return { pass: false, reason: protection.reason as GateReason, trend, capital, text: protection.text, protection };
    }

    return {
      pass: true,
      reason: 'pass',
      trend,
      capital,
      text: trend ? trend.reason : 'no trend filter',
      ...(protection ? { protection } : {})
    };
  }

  // ----- the raw crossing -----

  onCrossing(d: CrossingInput, s: number): GatedDecision {
    if (!this.eligibility) {
      const gate = this.check(s, d.time, d.price, 'base_signal');

      if (!gate.pass)
        return this.record({
          kind: 'crossing',
          time: d.time,
          session: s,
          price: d.price,
          opportunity: null,
          disposition: 'vetoed',
          reason: gate.text,
          gate,
          validity: null,
          trade: null,
          status: null
        });

      const trade = this.hooks.enter({ id: `${d.time}`, ...d }, s);

      return this.record({
        kind: 'crossing',
        time: d.time,
        session: s,
        price: d.price,
        opportunity: null,
        disposition: 'taken',
        reason: gate.text,
        gate,
        validity: null,
        trade,
        status: 'ordered'
      });
    }

    // A genuine crossing takes precedence: it supersedes a live opportunity (possible under policy 2 only) and clears
    // a renewal watch, then arms its own opportunity.
    if (this.live) this.end(this.live, 'superseded', 'superseded_by_new_crossing', d.time, s, {});
    this.cancelWatch('superseded_by_crossing', d.time, s);

    const j = d.barIndex ?? this.barAt(d.time);
    const o = this.arm('rise_from_recent_low', null, s, j, d.time, d.price, d.reference, d.trigger);

    return this.evaluateOpportunity(o, s, j, d.time, d.price, 'crossing');
  }

  // ----- the bar schedule of latched opportunities and the renewal watch -----

  beginSession(s: number) {
    const bars = this.runtime.bars;

    while (this.nextBar < bars.length && bars[this.nextBar]!.sessionIndex < s) this.nextBar++;
  }

  nextTime(s: number, t: number): number {
    if (!this.eligibility) return Infinity;

    const bar = this.runtime.bars[this.nextBar];

    return bar && bar.sessionIndex === s && bar.end <= t ? bar.end : Infinity;
  }

  evaluate(s: number) {
    const j = this.nextBar++;
    const bar = this.runtime.bars[j]!;

    if (!this.hooks.flatWithoutOrder()) return;

    const o = this.live;

    if (o) {
      if (j > o.signalBar) this.evaluateOpportunity(o, s, j, bar.end, bar.close, 'latched');
      return;
    }

    if (this.watch) this.stepWatch(this.watch, s, j);
  }

  // ----- opportunity lifecycle -----

  private arm(
    source: OpportunitySource,
    renewedFrom: Opportunity | null,
    s: number,
    j: number,
    time: number,
    price: number,
    recentLow: number,
    threshold: number
  ): Opportunity {
    const cfg = this.eligibility!;
    const o: Opportunity = {
      id: `O-${this.opportunities.length + 1}`,
      source,
      renewedFrom: renewedFrom?.id ?? null,
      policy: cfg.policy,
      signalTime: time,
      signalSession: s,
      signalBar: j,
      signalPrice: price,
      recentLow,
      threshold,
      advancePercent: (price / recentLow - 1) * 100,
      lastEligibleSession: s + cfg.maxAgeSessions,
      state: 'armed',
      evaluations: 0,
      blockedEvaluations: { trend_veto: 0, insufficient_history: 0, invalid_data: 0, capital_unavailable: 0 },
      firstBlockedTime: NaN,
      lastBlockReason: null,
      maxClose: price,
      decisionTime: NaN,
      decisionPrice: NaN,
      decisionSession: -1,
      ageSessionsAtDecision: NaN,
      decisionValues: {},
      trade: null,
      endState: null,
      endReason: null,
      endTime: NaN,
      endSession: -1,
      endValues: {},
      renewal: null,
      transitions: [{ t: time, session: s, state: 'armed', reason: source }]
    };

    this.opportunities.push(o);
    this.live = o;
    this.entry(
      time,
      s,
      'opportunity_armed',
      o,
      null,
      `armed by ${source === 'rise_from_recent_low' ? 'a raw Rise crossing' : 'a renewal signal'}`,
      {
        source,
        renewedFrom: o.renewedFrom,
        signalPrice: price,
        recentLow: r6(recentLow),
        threshold: r6(threshold),
        advancePercent: r6(o.advancePercent),
        policy: cfg.policy,
        maxAgeSessions: cfg.maxAgeSessions,
        lastEligibleSession: this.ds.dates[o.lastEligibleSession] ?? null
      }
    );

    return o;
  }

  // The policy's validity at bar j (close `price`). Pure apart from policy 4's running maximum.
  private validity(
    o: Opportunity,
    j: number,
    price: number
  ): { valid: boolean; reason: string; values: Record<string, LogValue> } {
    const cfg = this.eligibility!;
    const p = this.predicate!;
    const holds = p.holds[j] === 1;
    const predicate = {
      close: price,
      rollingLow: r6(p.low[j]!),
      rollingThreshold: r6(p.threshold[j]!),
      predicate: holds
    };

    switch (cfg.policy) {
      case 'time_limited':
      case 'reset_renew':
        return holds
          ? { valid: true, reason: 'predicate holds', values: predicate }
          : {
              valid: false,
              reason: 'predicate_false: the close fell below X% over the rolling low',
              values: predicate
            };
      case 'minimum_strength': {
        const level = o.recentLow * (1 + fraction(cfg.minimumAdvancePercent));
        const values = {
          close: price,
          referenceLow: o.recentLow,
          strengthPercent: r6((price / o.recentLow - 1) * 100),
          minimumAdvancePercent: cfg.minimumAdvancePercent,
          strengthLevel: r6(level)
        };

        return atOrAbove(price, level)
          ? { valid: true, reason: 'strength holds', values }
          : {
              valid: false,
              reason: 'strength_below_minimum: the advance over the fixed signal-time low fell below the minimum',
              values
            };
      }
      case 'maximum_extension': {
        const cap = o.signalPrice * (1 + fraction(cfg.maximumExtensionPercent));
        const values = {
          ...predicate,
          signalPrice: o.signalPrice,
          extensionPercent: r6((price / o.signalPrice - 1) * 100),
          capPrice: r6(cap)
        };

        if (!holds)
          return { valid: false, reason: 'predicate_false: the close fell below X% over the rolling low', values };
        return atOrBelow(price, cap)
          ? { valid: true, reason: 'within the extension cap', values }
          : {
              valid: false,
              reason: 'extension_exceeded: the price advanced beyond the cap above the original signal price',
              values
            };
      }
      case 'deterioration': {
        o.maxClose = Math.max(o.maxClose, price);

        const floor = o.maxClose * (1 - fraction(cfg.deteriorationDropPercent));
        const values = {
          ...predicate,
          highestCloseSinceArming: o.maxClose,
          deteriorationLevel: r6(floor),
          dropFromHighPercent: r6((1 - price / o.maxClose) * 100)
        };

        if (!holds)
          return { valid: false, reason: 'predicate_false: the close fell below X% over the rolling low', values };
        return atOrBelow(price, floor)
          ? {
              valid: false,
              reason: 'deteriorated: the close fell the configured drop below the highest close since arming',
              values
            }
          : { valid: true, reason: 'not deteriorated', values };
      }
    }
  }

  private evaluateOpportunity(
    o: Opportunity,
    s: number,
    j: number,
    time: number,
    price: number,
    kind: 'crossing' | 'latched' | 'renewal'
  ): GatedDecision {
    o.evaluations++;

    const v = this.validity(o, j, price);
    const base = {
      kind,
      time,
      session: s,
      price,
      opportunity: o,
      validity: v.values,
      trade: null,
      status: null
    } as const;

    if (!v.valid) {
      this.end(o, 'invalidated', v.reason, time, s, v.values);
      this.startWatch(o, s, time);
      return kind === 'latched'
        ? ({ ...base, disposition: 'invalidated', reason: v.reason, gate: null } as GatedDecision)
        : this.record({ ...base, disposition: 'invalidated', reason: v.reason, gate: null });
    }

    const gate = this.check(s, time, price, kind === 'crossing' ? 'base_signal' : kind);

    if (!gate.pass) {
      const state: OpportunityState =
        gate.reason === 'capital_unavailable'
          ? 'blocked_by_capital'
          : gate.protection && !gate.protection.pass
            ? 'blocked_by_protection'
            : 'blocked_by_trend';

      o.blockedEvaluations[gate.reason as GateReason]++;
      if (Number.isNaN(o.firstBlockedTime)) o.firstBlockedTime = time;
      if (o.state !== state || o.lastBlockReason !== gate.reason) {
        o.state = state;
        o.lastBlockReason = gate.reason;
        o.transitions.push({ t: time, session: s, state, reason: gate.reason });
        this.entry(time, s, 'opportunity_blocked', o, null, gate.text, {
          ...(gate.trend?.values ?? {}),
          ...(gate.protection ? Object.fromEntries(Object.entries(gate.protection.values).map(([k, v]) => [`protection.${k}`, v])) : {}),
          state,
          capital: gate.capital
        });
      }

      // Repeated blocks of a latched opportunity are counted on it, not recorded as decisions (no per-bar log).
      return kind === 'latched'
        ? ({ ...base, disposition: 'deferred', reason: gate.text, gate } as GatedDecision)
        : this.record({ ...base, disposition: 'deferred', reason: gate.text, gate });
    }

    const trade = this.hooks.enter(
      { id: `${o.id}@${time}`, time, price, trigger: o.threshold, reference: o.recentLow },
      s
    );

    o.state = 'ordered';
    o.decisionTime = time;
    o.decisionPrice = price;
    o.decisionSession = s;
    o.ageSessionsAtDecision = s - o.signalSession;
    o.decisionValues = { ...v.values, ...(gate.trend?.values ?? {}) };
    o.trade = trade;
    o.transitions.push({ t: time, session: s, state: 'ordered', reason: kind });
    this.live = undefined;
    this.cancelWatch('entry_taken', time, s);
    this.entry(
      time,
      s,
      'opportunity_decision',
      o,
      trade,
      `${kind === 'latched' ? 'latched decision' : kind === 'renewal' ? 'renewal signal' : 'crossing'}: order placed for the next eligible trade`,
      {
        ageSessions: o.ageSessionsAtDecision,
        ...o.decisionValues
      }
    );

    return this.record({ ...base, disposition: 'taken', reason: gate.text, gate, trade, status: 'ordered' });
  }

  private record(d: GatedDecision) {
    this.decisions.push(d);
    if (d.trade) this.byTrade.set(d.trade, d);

    return d;
  }

  private end(
    o: Opportunity,
    state: OpportunityState,
    reason: string,
    time: number,
    s: number,
    values: Record<string, LogValue>
  ) {
    o.state = state;
    o.endState = state;
    o.endReason = reason;
    o.endTime = time;
    o.endSession = s;
    o.endValues = values;
    o.transitions.push({ t: time, session: s, state, reason });
    if (this.live === o) this.live = undefined;
    this.entry(
      time,
      s,
      `opportunity_${state === 'end_of_data' ? 'closed' : state}` as LogEntry['event'],
      o,
      o.trade,
      reason,
      {
        ...values,
        evaluations: o.evaluations,
        blockedEvaluations: Object.values(o.blockedEvaluations).reduce((a, b) => a + b, 0),
        ageSessions: s - o.signalSession
      }
    );
  }

  // ----- policy 5: the renewal watch -----

  private startWatch(o: Opportunity, s: number, time: number) {
    if (this.eligibility?.policy !== 'reset_renew') return;

    const w: RenewalWatch = {
      id: `RW-${this.watches.length + 1}`,
      from: o,
      reference: o.signalPrice,
      startTime: time,
      lastSession: s + this.eligibility.maxAgeSessions,
      state: 'waiting_reset',
      resetTime: NaN,
      resetPrice: NaN,
      trough: NaN,
      troughTime: NaN,
      end: null,
      endTime: NaN
    };

    this.watches.push(w);
    this.watch = w;
    this.entry(time, s, 'renewal_watch', o, null, `renewal watch opened after ${o.id} ${o.endState}`, {
      watch: w.id,
      reference: w.reference,
      resetLevel: r6(w.reference * (1 - fraction(this.eligibility.resetDropPercent))),
      lastSession: this.ds.dates[w.lastSession] ?? null
    });
  }

  private endWatch(
    w: RenewalWatch,
    end: NonNullable<RenewalWatch['end']>,
    time: number,
    s: number,
    values: Record<string, LogValue> = {}
  ) {
    w.state = end === 'renewed' ? 'renewed' : 'ended';
    w.end = end;
    w.endTime = time;
    if (this.watch === w) this.watch = undefined;
    this.entry(time, s, 'renewal_watch_ended', w.from, null, end, { watch: w.id, ...values });
  }

  private cancelWatch(end: 'superseded_by_crossing' | 'entry_taken', time: number, s: number) {
    const w = this.watch;

    if (!w) return;
    this.endWatch(w, end, time, s);
  }

  private stepWatch(w: RenewalWatch, s: number, j: number) {
    const cfg = this.eligibility as Extract<EligibilityConfig, { policy: 'reset_renew' }>;
    const bar = this.runtime.bars[j]!;

    if (bar.end <= w.startTime) return;
    if (bar.sessionIndex > w.lastSession) {
      this.endWatch(w, 'lapsed', bar.end, s);
      return;
    }

    if (w.state === 'waiting_reset') {
      const level = w.reference * (1 - fraction(cfg.resetDropPercent));

      if (atOrBelow(bar.close, level)) {
        w.state = 'reset';
        w.resetTime = bar.end;
        w.resetPrice = bar.close;
        w.trough = bar.close;
        w.troughTime = bar.end;
        this.entry(bar.end, s, 'renewal_reset', w.from, null, `close ${bar.close} at or below the reset level`, {
          watch: w.id,
          reference: w.reference,
          resetLevel: r6(level),
          close: bar.close
        });
      }

      return;
    }

    const threshold = w.trough * (1 + fraction(cfg.renewalReboundPercent));

    if (!atOrAbove(bar.close, threshold)) {
      if (bar.close < w.trough) {
        w.trough = bar.close;
        w.troughTime = bar.end;
      }

      return;
    }

    // The first rebound bar ends the watch either way (one renewal per reset/rebound episode).
    const p = this.predicate!;
    const values = {
      watch: w.id,
      reference: w.reference,
      resetPrice: w.resetPrice,
      trough: w.trough,
      reboundThreshold: r6(threshold),
      close: bar.close,
      predicate: p.holds[j] === 1,
      rollingThreshold: r6(p.threshold[j]!)
    };

    if (p.holds[j] !== 1) {
      this.endWatch(w, 'predicate_false_at_rebound', bar.end, s, values);
      return;
    }

    this.endWatch(w, 'renewed', bar.end, s, values);
    this.entry(
      bar.end,
      s,
      'renewal_signal',
      w.from,
      null,
      'renewal signal: a reset and a fresh rebound with the original predicate true',
      values
    );

    const o = this.arm('eligibility_renewal', w.from, s, j, bar.end, bar.close, p.low[j]!, p.threshold[j]!);

    o.renewal = {
      watch: w.id,
      reference: w.reference,
      resetTime: w.resetTime,
      resetPrice: w.resetPrice,
      trough: w.trough,
      troughTime: w.troughTime,
      reboundThreshold: threshold
    };
    this.evaluateOpportunity(o, s, j, bar.end, bar.close, 'renewal');
  }

  // ----- notifications from the simulation -----

  // Any Growth entry taken by ANOTHER source (a continuation trigger): the live opportunity and a renewal watch end.
  afterEntry(trade: VirtualTrade, s: number, time: number, source: string) {
    if (this.live)
      this.end(this.live, 'superseded', `superseded: an entry was taken by ${source}`, time, s, { trade: trade.id });
    this.cancelWatch('entry_taken', time, s);
  }

  // After book.open(): the order of a gated decision filled (the opportunity is consumed).
  afterFill(trade: VirtualTrade) {
    const d = this.byTrade.get(trade);

    if (!d) return false;
    d.status = 'filled';

    const o = d.opportunity;

    if (o && o.trade === trade) {
      o.state = 'consumed';
      o.endState = 'consumed';
      o.endReason = 'consumed by its entry';
      o.endTime = trade.entryTime;
      o.endSession = trade.entryIndex;
      o.transitions.push({ t: trade.entryTime, session: trade.entryIndex, state: 'consumed', reason: 'filled' });
      this.entry(trade.entryTime, trade.entryIndex, 'opportunity_consumed', o, trade, 'its order filled', {
        fillPrice: trade.entryRawPrice,
        ageSessionsAtDecision: o.ageSessionsAtDecision,
        ageSessionsAtFill: trade.entryIndex - o.signalSession
      });
    }

    return true;
  }

  // After book.afterSession(s): expiry (after the close of origin + W) and the renewal watch's bound.
  afterSession(s: number) {
    const o = this.live;

    if (o && s >= o.lastEligibleSession) {
      this.end(
        o,
        'expired',
        `expired: the maximum age of ${this.eligibility!.maxAgeSessions} session(s) passed`,
        this.ds.sCloseTime[s]!,
        s,
        {
          lastEligibleSession: this.ds.dates[o.lastEligibleSession] ?? null
        }
      );
      this.startWatch(o, s, this.ds.sCloseTime[s]!);
    }

    const w = this.watch;

    if (w && s >= w.lastSession) this.endWatch(w, 'lapsed', this.ds.sCloseTime[s]!, s);
  }

  finish(endSession: number) {
    const t = this.ds.sCloseTime[endSession]!;

    if (this.live) this.end(this.live, 'end_of_data', 'end of the data: still armed', t, endSession, {});
    if (this.watch) this.endWatch(this.watch, 'end_of_data', t, endSession);
    for (const o of this.opportunities)
      if (o.state === 'ordered') {
        o.state = 'unfilled_at_end';
        o.endState = 'unfilled_at_end';
        o.endReason = 'its order was not filled before the end of the data';
        o.endTime = t;
        o.endSession = endSession;
      }
    for (const d of this.decisions) if (d.status === 'ordered') d.status = 'unfilled_at_end';
  }

  // The gated decision that opened a trade, if any.
  decisionOf(trade: VirtualTrade) {
    return this.byTrade.get(trade);
  }

  // ----- helpers -----

  private barAt(time: number) {
    const bars = this.runtime.bars;
    let lo = 0;
    let hi = bars.length - 1;
    let found = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;

      if (bars[mid]!.end <= time) {
        found = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }

    if (found < 0) throw new Error(`no completed bar at or before ${time}`);

    return found;
  }

  private entry(
    t: number,
    session: number,
    event: LogEntry['event'],
    o: Opportunity,
    trade: VirtualTrade | null,
    reason: string,
    values: Record<string, LogValue>
  ) {
    this.log.add({
      t,
      session,
      event,
      origin: 'base_growth',
      method: null,
      episode: null,
      opportunity: o.id,
      trade,
      disposition: null,
      reason,
      values
    });
  }
}
