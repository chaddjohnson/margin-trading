// Growth continuation entries (rise-from-recent-low-trading v1.1.0): an OPTIONAL second way to enter, after a
// realised net-profitable exit, next to the unchanged Rise-from-Recent-Low base entry. OFF by default; OFF reproduces
// v1.0.0 exactly (tests/offParity.test.ts). Specification: docs/strategy-lab/GROWTH_CONTINUATION.md.
//
// Common lifecycle (every method):
// - A QUALIFYING exit is a closed trade whose book net is > 0: after both per-side costs and the margin interest
//   (ShadowBook.close). A losing or exactly-breakeven exit never opens a window.
// - It opens one EPISODE anchored at the exit session s0. Eligible sessions: s0+1 … s0+W (W trading sessions of the
//   dataset, i.e. NYSE sessions); the window expires after the close of session s0+W.
// - An episode is evaluated only while the book is flat with no order pending. Every taken entry decision closes it:
//   a base Growth entry closes the window (`base_entry`) and cancels an armed setup; a continuation trigger consumes
//   it. So a continuation signal can never meet a position or a pending order, and windows never overlap.
// - At one instant, a base decision is judged first (priority). A continuation predicate that would have fired at
//   that instant is recorded as suppressed (`base_priority`); it never trades.
// - Decisions are made at the END of a completed bar (its close is first knowable) and fill at the first eligible
//   trade after the decision (ShadowBook.commit → firstTradeAfterDecision): the next minute's open, the closing print
//   only for a decision before the close, otherwise the next session's opening trade (carried overnight).
//
// Methods:
// - classic_d1: D1's OWN continuation machine (src/shared-margin-portfolio/strategy.ts EntryMachine, unchanged) inside
//   the same ShadowBook, minute-native at every run resolution: H = the raw exit fill, raised after each later session
//   by its high; a completed minute closing at or below H(1−P) ARMS a trailing buy (arming closes the window; the
//   arming minute never buys); the armed setup trails the lowest minute low and fires when a minute closes at or above
//   trailingLow(1+Y). As in D1 the armed setup persists until it fires (no expiry). Growth adaptation: Growth's base
//   entry is not D1's deep-dip arming, so a taken base entry plays the role of "a competing ordinary arming": it
//   closes the window and, if a setup is armed, cancels it.
// - breakout: on the run's resolution bars. H = the raw exit fill, raised by each completed eligible bar's high AFTER
//   that bar was evaluated (a candidate never sees its own high). After at least F completed eligible bars (formation),
//   a bar whose close is strictly above H(1+b) triggers. Exit-session bars are not used (as in D1).
// - shallow_pullback: on the run's resolution bars. Uptrend = SMA_L(c) > SMA_L(c−M)(1+r), required both at arming and
//   at the trigger. WATCHING: a close with pullback 1−close/H in [pmin, pmax] arms (H freezes); a close deeper than
//   pmax ends the episode (`pullback_too_deep`); otherwise H is raised by the bar's high. ARMED: a close deeper than
//   pmax ends it; a close at or above trough(1+R) in an uptrend triggers; the trough is the lowest close since arming
//   (the candidate excluded). The armed setup expires with the window.
// - ma_cross: on the run's resolution bars. SMA_L over completed closes (the candidate included). Triggers when the
//   previous bar closed at or below its SMA, this bar closes strictly above SMA(c)(1+m), and the SMA is rising:
//   SMA(c) > SMA(c−M)(1+s). One-shot per episode, so a price staying above the average never re-triggers.
import type { SignalBar } from '../entry-signals/bars.ts';
import type { Dataset } from '../four-family/data.ts';
import type { ShadowBook, VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import type { ReboundSignal, Setup, SetupKind } from '../shared-margin-portfolio/strategy.ts';

export const CONTINUATION_METHODS = ['classic_d1', 'breakout', 'shallow_pullback', 'ma_cross'] as const;
export type ContinuationMethod = (typeof CONTINUATION_METHODS)[number];

export const CONTINUATION_METHOD_LABEL: Record<ContinuationMethod, string> = {
  classic_d1: 'Classic D1: pullback + trailing rebound',
  breakout: 'Breakout above post-exit high',
  shallow_pullback: 'Shallow pullback + recovery in an uptrend',
  ma_cross: 'Cross above a rising moving average'
};

// The effective configuration of one method: only the dimensions that method reads.
export type ContinuationConfig =
  | { method: 'classic_d1'; windowSessions: number; pullbackPercent: number; reboundPercent: number }
  | { method: 'breakout'; windowSessions: number; bufferPercent: number; formationBars: number }
  | {
      method: 'shallow_pullback';
      windowSessions: number;
      smaBars: number;
      slopeBars: number;
      minimumRisePercent: number;
      pullbackMinimumPercent: number;
      pullbackMaximumPercent: number;
      recoveryPercent: number;
    }
  | {
      method: 'ma_cross';
      windowSessions: number;
      smaBars: number;
      risingBars: number;
      minimumSlopePercent: number;
      marginPercent: number;
    };

// Illustrative defaults (not optimised for Growth). classic_d1 = D1's shipped W 60, P 9%, Y 0.3%.
export const DEFAULT_CONTINUATION: { [M in ContinuationMethod]: Extract<ContinuationConfig, { method: M }> } = {
  classic_d1: { method: 'classic_d1', windowSessions: 60, pullbackPercent: 9, reboundPercent: 0.3 },
  breakout: { method: 'breakout', windowSessions: 60, bufferPercent: 1, formationBars: 1 },
  shallow_pullback: {
    method: 'shallow_pullback',
    windowSessions: 60,
    smaBars: 50,
    slopeBars: 10,
    minimumRisePercent: 0,
    pullbackMinimumPercent: 2,
    pullbackMaximumPercent: 8,
    recoveryPercent: 1
  },
  ma_cross: {
    method: 'ma_cross',
    windowSessions: 60,
    smaBars: 20,
    risingBars: 5,
    minimumSlopePercent: 0,
    marginPercent: 0
  }
};

export const continuationConfigErrors = (c: ContinuationConfig): string[] => {
  const errors: string[] = [];
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const int = (v: unknown, min: number) => Number.isInteger(v) && (v as number) >= min;
  const pct = (name: string, v: unknown, min: number, max: number, minInclusive = true) => {
    if (!finite(v) || (minInclusive ? (v as number) < min : (v as number) <= min) || (v as number) >= max)
      errors.push(`${name} must be in ${minInclusive ? '[' : '('}${min}, ${max})`);
  };

  if (!CONTINUATION_METHODS.includes(c.method)) return [`unknown continuation method ${String(c.method)}`];
  if (!int(c.windowSessions, 1)) errors.push('windowSessions must be an integer ≥ 1');
  if (c.method === 'classic_d1') {
    pct('pullbackPercent', c.pullbackPercent, 0, 100, false);
    pct('reboundPercent', c.reboundPercent, 0, 100, false);
  } else if (c.method === 'breakout') {
    pct('bufferPercent', c.bufferPercent, 0, 100);
    if (!int(c.formationBars, 1)) errors.push('formationBars must be an integer ≥ 1');
  } else if (c.method === 'shallow_pullback') {
    if (!int(c.smaBars, 2)) errors.push('smaBars must be an integer ≥ 2');
    if (!int(c.slopeBars, 1)) errors.push('slopeBars must be an integer ≥ 1');
    pct('minimumRisePercent', c.minimumRisePercent, 0, 100);
    pct('pullbackMinimumPercent', c.pullbackMinimumPercent, 0, 100, false);
    pct('pullbackMaximumPercent', c.pullbackMaximumPercent, 0, 100, false);
    if (
      finite(c.pullbackMinimumPercent) &&
      finite(c.pullbackMaximumPercent) &&
      c.pullbackMinimumPercent >= c.pullbackMaximumPercent
    )
      errors.push('pullbackMinimumPercent must be below pullbackMaximumPercent');
    pct('recoveryPercent', c.recoveryPercent, 0, 100, false);
  } else {
    if (!int(c.smaBars, 2)) errors.push('smaBars must be an integer ≥ 2');
    if (!int(c.risingBars, 1)) errors.push('risingBars must be an integer ≥ 1');
    pct('minimumSlopePercent', c.minimumSlopePercent, 0, 100);
    pct('marginPercent', c.marginPercent, 0, 100);
  }

  return errors;
};

// Completed bars of the run resolution a bar-based method needs before the first evaluated bar (SMA warm-up).
export const continuationWarmupBars = (c: ContinuationConfig | null | undefined) =>
  !c
    ? 0
    : c.method === 'shallow_pullback'
      ? c.smaBars + c.slopeBars
      : c.method === 'ma_cross'
        ? c.smaBars + c.risingBars + 1
        : 0;

// A percentage as a fraction, the double nearest to the decimal (9 → 0.09, not 9 / 100 rounding).
const fraction = (percent: number) => {
  const f = Number(`${percent}e-2`);

  return Number.isFinite(f) ? f : percent / 100;
};

// ----- records -----

export type Origin = 'base_growth' | 'continuation';
export type EpisodeEnd =
  | 'triggered'
  | 'base_entry'
  | 'window_expired'
  | 'pullback_too_deep'
  | 'end_of_data'
  // v1.2.0, only with an entry gate ON: the trigger was blocked by the trend filter (or the harness capital hook)
  | 'trend_veto'
  | 'insufficient_history'
  | 'invalid_data'
  | 'capital_unavailable';
export type LogValue = number | string | boolean | null;

export interface Episode {
  id: string; // C-1, C-2 … per symbol
  method: ContinuationMethod;
  sourceTrade: VirtualTrade; // the qualifying exit's trade
  anchorSession: number; // s0, the exit session
  firstEligibleSession: number; // s0 + 1
  lastEligibleSession: number; // s0 + W (may lie past the data)
  exitTime: number;
  exitPrice: number; // the raw exit fill
  exitNet: number;
  referenceHigh: number; // H: current, frozen at arming, final at the end
  maxHighInWindow: number; // diagnostic: the highest session high of the eligible sessions observed while open
  eligibleSessionsObserved: number;
  barsEvaluated: number;
  formationBars: number;
  status: 'watching' | 'armed' | 'ordered' | 'filled' | 'unfilled_at_end' | 'closed';
  windowClosedTime: number; // classic_d1: arming closes the window while the setup lives on
  armedTime: number;
  armedPrice: number;
  trough: number; // classic_d1: the trailing low; shallow_pullback: the lowest close since arming
  troughTime: number;
  triggerTime: number;
  triggerPrice: number;
  triggerValues: Record<string, LogValue>;
  end: EpisodeEnd | null;
  endTime: number;
  endSession: number;
  trade: VirtualTrade | null; // the continuation trade it opened
}

export type LogEvent =
  | 'base_signal'
  | 'exit'
  | 'episode_opened'
  | 'setup_armed'
  | 'window_closed'
  | 'setup_cancelled'
  | 'continuation_signal'
  | 'episode_closed'
  | 'fill'
  // v1.2.0 entry gates (src/growth-trading/entryGates.ts), only with a gate ON
  | 'opportunity_armed'
  | 'opportunity_blocked'
  | 'opportunity_decision'
  | 'opportunity_invalidated'
  | 'opportunity_expired'
  | 'opportunity_superseded'
  | 'opportunity_consumed'
  | 'opportunity_closed'
  | 'renewal_watch'
  | 'renewal_reset'
  | 'renewal_signal'
  | 'renewal_watch_ended';

export interface LogEntry {
  seq: number;
  t: number; // Unix seconds (UTC)
  session: number;
  event: LogEvent;
  origin: Origin | null;
  method: ContinuationMethod | null;
  episode: string | null;
  opportunity?: string; // v1.2.0: the persistent-eligibility opportunity (absent otherwise)
  trade: VirtualTrade | null;
  disposition: 'taken' | 'rejected' | 'suppressed' | 'vetoed' | 'deferred' | 'invalidated' | null;
  reason: string | null;
  values: Record<string, LogValue>;
}

export interface ContinuationOutcome {
  episode: Episode;
  time: number;
  session: number;
  price: number;
  status: 'filled' | 'unfilled_at_end' | 'ordered' | 'suppressed' | 'vetoed'; // vetoed: v1.2.0 entry gate
  reason: string | null;
  trade: VirtualTrade | null;
  values: Record<string, LogValue>;
}

// The chronological decision/state log of one simulation (base decisions, exits, continuation state transitions).
export class DecisionLog {
  readonly entries: LogEntry[] = [];

  add(e: Omit<LogEntry, 'seq'>) {
    this.entries.push({ seq: this.entries.length + 1, ...e });
  }

  // v1.2.0: inserts an entry at a position (the raw crossing before the opportunity entries it caused at the same
  // instant) and renumbers the entries after it.
  insert(at: number, e: Omit<LogEntry, 'seq'>) {
    this.entries.splice(at, 0, { seq: at + 1, ...e });
    for (let i = at + 1; i < this.entries.length; i++) this.entries[i]!.seq = i + 1;
  }
}

// ----- pure assessments (read-only), shared by the state machines and the same-instant diagnostics -----

const sma = (bars: readonly SignalBar[], end: number, length: number) => {
  if (end - length + 1 < 0) return NaN;

  let sum = 0;

  for (let i = end - length + 1; i <= end; i++) sum += bars[i]!.close;

  return sum / length;
};

type Assessment =
  | { action: 'none' | 'warmup'; values: Record<string, LogValue> }
  | { action: 'arm' | 'trigger' | 'invalidate'; values: Record<string, LogValue> };

const r6 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : null);

export const assessBar = (
  c: Exclude<ContinuationConfig, { method: 'classic_d1' }>,
  e: Pick<Episode, 'referenceHigh' | 'formationBars' | 'status' | 'trough'>,
  bars: readonly SignalBar[],
  j: number
): Assessment => {
  const bar = bars[j]!;

  if (c.method === 'breakout') {
    const threshold = e.referenceHigh * (1 + fraction(c.bufferPercent));
    const values = {
      referenceHigh: r6(e.referenceHigh),
      threshold: r6(threshold),
      close: bar.close,
      formationBars: e.formationBars,
      requiredFormationBars: c.formationBars
    };

    return { action: e.formationBars >= c.formationBars && bar.close > threshold ? 'trigger' : 'none', values };
  }

  if (c.method === 'ma_cross') {
    const now = sma(bars, j, c.smaBars);
    const before = sma(bars, j - 1, c.smaBars);
    const earlier = sma(bars, j - c.risingBars, c.smaBars);
    const prior = j > 0 ? bars[j - 1]!.close : NaN;
    const values = {
      sma: r6(now),
      smaPrevious: r6(before),
      smaEarlier: r6(earlier),
      priorClose: Number.isFinite(prior) ? prior : null,
      close: bar.close,
      crossThreshold: r6(now * (1 + fraction(c.marginPercent))),
      risingThreshold: r6(earlier * (1 + fraction(c.minimumSlopePercent))),
      smaRisePercent: r6((now / earlier - 1) * 100)
    };

    if (!(Number.isFinite(now) && Number.isFinite(before) && Number.isFinite(earlier) && Number.isFinite(prior)))
      return { action: 'warmup', values };

    const rising = now > earlier * (1 + fraction(c.minimumSlopePercent));
    const fromBelow = prior <= before;
    const above = bar.close > now * (1 + fraction(c.marginPercent));

    return {
      action: rising && fromBelow && above ? 'trigger' : 'none',
      values: { ...values, rising, fromBelow, above }
    };
  }

  // shallow_pullback
  const now = sma(bars, j, c.smaBars);
  const earlier = sma(bars, j - c.slopeBars, c.smaBars);
  const uptrend =
    Number.isFinite(now) && Number.isFinite(earlier) && now > earlier * (1 + fraction(c.minimumRisePercent));
  const depth = 1 - bar.close / e.referenceHigh;
  const recoveryThreshold = e.trough * (1 + fraction(c.recoveryPercent));
  const values = {
    referenceHigh: r6(e.referenceHigh),
    close: bar.close,
    pullbackPercent: r6(depth * 100),
    pullbackBand: `${c.pullbackMinimumPercent}–${c.pullbackMaximumPercent}%`,
    trendSma: r6(now),
    trendSmaEarlier: r6(earlier),
    trendRisePercent: r6((now / earlier - 1) * 100),
    uptrend,
    trough: e.status === 'armed' ? r6(e.trough) : null,
    recoveryThreshold: e.status === 'armed' ? r6(recoveryThreshold) : null
  };

  if (!(Number.isFinite(now) && Number.isFinite(earlier))) return { action: 'warmup', values };
  if (depth > fraction(c.pullbackMaximumPercent)) return { action: 'invalidate', values };
  if (e.status === 'armed') return { action: uptrend && bar.close >= recoveryThreshold ? 'trigger' : 'none', values };

  return { action: depth >= fraction(c.pullbackMinimumPercent) && uptrend ? 'arm' : 'none', values };
};

// ----- the controller -----

export interface ContinuationRuntime {
  config: ContinuationConfig;
  bars: readonly SignalBar[] | null; // the run-resolution bars (warm-up included) for the bar-based methods
}

// v1.2.0: the entry gates seen from a continuation trigger. Absent (both gates OFF) = v1.1.0 behaviour exactly.
export interface ContinuationGateHooks {
  // The gate result at the trigger instant: `pass` false blocks the trigger (the episode ends with `reason`).
  check: (
    s: number,
    time: number,
    price: number
  ) => { pass: boolean; reason: string; text: string; values: Record<string, LogValue> };
  // An entry was taken by the continuation (the gates end a live opportunity of another source).
  afterEntry: (trade: VirtualTrade, s: number, time: number) => void;
}

// Drives one method for one symbol inside simulateTrading. `nextTime` / `evaluate` are called from the minute loop;
// `beforeBaseEntry`, `afterExit`, `afterFill`, `afterSession` and `finish` from the corresponding points.
export class ContinuationController {
  readonly episodes: Episode[] = [];
  readonly outcomes: ContinuationOutcome[] = [];
  private current: Episode | undefined;
  private byTrade = new Map<VirtualTrade, ContinuationOutcome>();
  private nextBar = 0; // bar-based: the next run-resolution bar to complete
  private processedMinute = -1; // classic: the last minute index of the current session handed to processBar
  private windows = 0;
  private expiries = 0;
  private setupCount = 0;

  constructor(
    readonly ds: Dataset,
    readonly book: ShadowBook,
    readonly runtime: ContinuationRuntime,
    readonly log: DecisionLog,
    private readonly minuteBefore: (s: number, time: number) => number,
    private readonly gates: ContinuationGateHooks | null = null
  ) {
    if (runtime.config.method !== 'classic_d1' && !runtime.bars) throw new Error('bar-based continuation needs bars');
  }

  get method() {
    return this.runtime.config.method;
  }

  get classic() {
    return this.runtime.config.method === 'classic_d1';
  }

  get open() {
    return this.current && (this.current.status === 'watching' || this.current.status === 'armed')
      ? this.current
      : undefined;
  }

  beginSession(s: number) {
    this.processedMinute = -1;

    if (!this.classic) {
      const bars = this.runtime.bars!;

      while (this.nextBar < bars.length && bars[this.nextBar]!.sessionIndex < s) this.nextBar++;
    }
  }

  // The instant of the next continuation evaluation due at or before `t` in session s (bar k starts at t), or ∞.
  nextTime(s: number, k: number, t: number): number {
    if (this.classic) {
      const m = this.book.machine;

      if (!(m.continuationActive || m.setup) || k === 0 || this.processedMinute >= k - 1) return Infinity;

      return this.ds.bTime[this.ds.sBarStart[s]! + k - 1]! + 60;
    }

    const bar = this.runtime.bars![this.nextBar];

    return bar && bar.sessionIndex === s && bar.end <= t ? bar.end : Infinity;
  }

  // Evaluates the continuation step due at `nextTime` (the minute k−1 for classic_d1; the next bar otherwise).
  evaluate(s: number, k: number) {
    if (this.classic) return this.evaluateClassic(s, k - 1);

    const j = this.nextBar++;
    const e = this.open;

    if (!e) return;

    const bars = this.runtime.bars!;
    const bar = bars[j]!;

    if (bar.sessionIndex < e.firstEligibleSession || bar.sessionIndex > e.lastEligibleSession) return;
    if (this.book.position || this.book.order) throw new Error('continuation evaluated while not flat');

    const config = this.runtime.config as Exclude<ContinuationConfig, { method: 'classic_d1' }>;
    const a = assessBar(config, e, bars, j);

    e.barsEvaluated++;

    if (a.action === 'trigger') {
      this.trigger(e, s, bar.end, bar.close, a.values, {
        trailingLow: e.status === 'armed' ? e.trough : NaN,
        trigger: Number(a.values.threshold ?? a.values.recoveryThreshold ?? a.values.crossThreshold ?? NaN)
      });
      return;
    }

    if (a.action === 'invalidate') {
      this.close(e, 'pullback_too_deep', bar.end, s, a.values);
      return;
    }

    if (a.action === 'arm') {
      e.status = 'armed';
      e.armedTime = bar.end;
      e.armedPrice = bar.close;
      e.trough = bar.close;
      e.troughTime = bar.end;
      this.entry(bar.end, s, 'setup_armed', e, null, 'pullback into the band while the trend rises', a.values);
      return;
    }

    // No action: update the reference (watching) or the trough (armed), the candidate's own values now included.
    if (e.status === 'armed') {
      if (bar.close < e.trough) {
        e.trough = bar.close;
        e.troughTime = bar.end;
      }
    } else {
      e.referenceHigh = Math.max(e.referenceHigh, bar.high);
      e.formationBars++;
    }
  }

  private evaluateClassic(s: number, k: number) {
    const m = this.book.machine;
    const e = this.open;
    const before = m.setupLog.length;

    this.processedMinute = k;

    const signal = this.book.processBar(s, k);

    if (m.setupLog.length > before) {
      const setup = m.setupLog.at(-1)!;

      if (setup.kind !== 'continuation' || !e) throw new Error(`unexpected D1 arming of kind ${setup.kind}`);

      e.status = 'armed';
      e.armedTime = setup.activationTime;
      e.armedPrice = setup.activationPrice;
      e.referenceHigh = setup.anchorHigh;
      e.trough = setup.trailingLow;
      e.troughTime = setup.trailingLowTime;
      e.windowClosedTime = setup.activationTime;

      const values = {
        referenceHigh: setup.anchorHigh,
        pullbackThreshold: r6(setup.anchorHigh * (1 - fraction(this.cfgClassic.pullbackPercent))),
        armingClose: setup.activationPrice,
        trailingLow: setup.trailingLow,
        reboundTrigger: r6(setup.reboundTrigger)
      };

      this.entry(
        setup.activationTime,
        s,
        'setup_armed',
        e,
        null,
        'D1 pullback: a completed minute closed at or below H(1−P)',
        values
      );
      this.entry(
        setup.activationTime,
        s,
        'window_closed',
        e,
        null,
        'armed (D1: any arming closes the continuation window)',
        {}
      );
    }

    if (signal) {
      if (!e || signal.setup.kind !== 'continuation') throw new Error('unexpected D1 rebound signal');

      e.trough = signal.trailingLow;
      this.trigger(
        e,
        s,
        signal.decisionTime,
        signal.decisionPrice,
        {
          referenceHigh: signal.setup.anchorHigh,
          armingClose: signal.setup.activationPrice,
          armedAt: new Date(signal.setup.activationTime * 1000).toISOString(),
          trailingLow: signal.trailingLow,
          reboundTrigger: r6(signal.trigger),
          close: signal.decisionPrice
        },
        signal
      );
    } else if (e?.status === 'armed') {
      e.trough = m.setup?.trailingLow ?? e.trough;
      e.troughTime = m.setup?.trailingLowTime ?? e.troughTime;
    }
  }

  private get cfgClassic() {
    return this.runtime.config as Extract<ContinuationConfig, { method: 'classic_d1' }>;
  }

  // A trigger: the decision is taken (the book is flat with no order, by construction) and an order is placed.
  private trigger(
    e: Episode,
    s: number,
    time: number,
    price: number,
    values: Record<string, LogValue>,
    d1: ReboundSignal | { trailingLow: number; trigger: number }
  ) {
    const gate = this.gates ? this.gates.check(s, time, price) : null;

    if (gate && !gate.pass) {
      this.veto(e, s, time, price, values, gate);
      return;
    }

    const signal: ReboundSignal =
      'setup' in d1
        ? d1
        : {
            setup: {
              id: ++this.setupCount,
              kind: this.method as string as SetupKind, // ShadowBook only records it
              activationIndex: s,
              activationTime: Number.isFinite(e.armedTime) ? e.armedTime : time,
              activationPrice: Number.isFinite(e.armedPrice) ? e.armedPrice : price,
              referenceHigh: e.referenceHigh,
              anchorHigh: e.referenceHigh,
              trailingLow: d1.trailingLow,
              trailingLowTime: e.troughTime,
              reboundTrigger: d1.trigger,
              declinedSignals: 0,
              status: 'armed',
              endIndex: -1
            } satisfies Setup,
            index: s,
            barIndex: this.minuteBefore(s, time),
            decisionTime: time,
            decisionPrice: price,
            trigger: d1.trigger,
            trailingLow: d1.trailingLow
          };
    const trade = this.book.commit(signal, s, 'granted');
    const outcome: ContinuationOutcome = {
      episode: e,
      time,
      session: s,
      price,
      status: 'ordered',
      reason: null,
      trade,
      values
    };

    e.triggerTime = time;
    e.triggerPrice = price;
    e.triggerValues = values;
    e.trade = trade;
    e.status = 'ordered';
    e.end = 'triggered';
    e.endTime = time;
    e.endSession = s;
    this.outcomes.push(outcome);
    this.byTrade.set(trade, outcome);
    this.entry(
      time,
      s,
      'continuation_signal',
      e,
      trade,
      'trigger: order placed for the next eligible trade',
      values,
      'taken'
    );
    this.entry(time, s, 'episode_closed', e, trade, 'triggered', {});
    this.gates?.afterEntry(trade, s, time);
  }

  // v1.2.0: a trigger blocked by an entry gate. It is recorded (never traded) and ENDS the episode, so a condition that
  // stays true cannot re-trigger on every later bar and the trigger is never replayed when the gate later passes.
  private veto(
    e: Episode,
    s: number,
    time: number,
    price: number,
    values: Record<string, LogValue>,
    gate: { reason: string; text: string; values: Record<string, LogValue> }
  ) {
    const all = { ...values, ...gate.values };

    this.outcomes.push({
      episode: e,
      time,
      session: s,
      price,
      status: 'vetoed',
      reason: gate.reason,
      trade: null,
      values: all
    });
    this.entry(time, s, 'continuation_signal', e, null, gate.text, all, 'vetoed');

    if (this.classic) {
      const m = this.book.machine;

      if (m.setup) m.cancelSetup(s);
      m.continuationActive = false;
    }

    e.triggerTime = time;
    e.triggerPrice = price;
    e.triggerValues = all;
    this.close(e, gate.reason as EpisodeEnd, time, s, {});
  }

  // A base Growth decision is about to be taken at `time` (the book is flat with no order). It has priority: the open
  // episode is closed (`base_entry`) and an armed setup cancelled. A continuation step due at the same instant is
  // assessed read-only and, if it would have fired, recorded as suppressed.
  beforeBaseEntry(s: number, time: number) {
    const e = this.open;

    if (!e) return;

    const same = this.sameInstant(s, time, e);

    // Only a would-be TRIGGER is a suppressed entry signal; a would-be D1 arming is noted on the episode only.
    if (same?.fires && same.kind === 'would_trigger') {
      this.outcomes.push({
        episode: e,
        time,
        session: s,
        price: same.price,
        status: 'suppressed',
        reason: 'base_priority',
        trade: null,
        values: same.values
      });
      this.entry(
        time,
        s,
        'continuation_signal',
        e,
        null,
        'base_priority: a base Growth entry was taken at the same instant',
        same.values,
        'suppressed'
      );
    }

    if (this.classic) {
      const m = this.book.machine;

      if (m.setup) {
        m.cancelSetup(s);
        this.entry(
          time,
          s,
          'setup_cancelled',
          e,
          null,
          'superseded by a base Growth entry (Growth adaptation of D1)',
          {}
        );
      }

      m.continuationActive = false;
    } else if (e.status === 'armed') {
      this.entry(time, s, 'setup_cancelled', e, null, 'superseded by a base Growth entry', {});
    }

    this.close(e, 'base_entry', time, s, { sameInstant: same ? (same.fires ? same.kind : 'none') : 'no step due' });
  }

  // The continuation step that is due exactly at `time`, assessed without changing any state.
  private sameInstant(s: number, time: number, e: Episode) {
    if (this.classic) {
      const start = this.ds.sBarStart[s]!;
      const count = this.ds.sBarCount[s]!;
      let k = -1;

      for (let i = 0; i < count; i++) if (this.ds.bTime[start + i]! + 60 === time) k = i;
      if (k < 0 || k <= this.processedMinute || this.book.positionAtStart || this.book.exitedThisSession) return null;

      const b = start + k;
      const close = this.ds.bClose[b]!;
      const cfg = this.cfgClassic;
      const m = this.book.machine;

      if (m.setup) {
        const low = Math.min(m.setup.trailingLow, this.ds.bLow[b]!);
        const trigger = low * (1 + fraction(cfg.reboundPercent));

        return {
          fires: close >= trigger,
          kind: 'would_trigger',
          price: close,
          values: { trailingLow: low, reboundTrigger: r6(trigger), close }
        };
      }

      const threshold = m.continuationHigh * (1 - fraction(cfg.pullbackPercent));
      const open = s > m.continuationStart && s - m.continuationStart <= cfg.windowSessions;

      return {
        fires: open && close <= threshold,
        kind: 'would_arm',
        price: close,
        values: { referenceHigh: m.continuationHigh, pullbackThreshold: r6(threshold), close }
      };
    }

    const bars = this.runtime.bars!;
    const bar = bars[this.nextBar];

    if (!bar || bar.end !== time || bar.sessionIndex !== s) return null;
    if (bar.sessionIndex < e.firstEligibleSession || bar.sessionIndex > e.lastEligibleSession) return null;

    const a = assessBar(
      this.runtime.config as Exclude<ContinuationConfig, { method: 'classic_d1' }>,
      e,
      bars,
      this.nextBar
    );

    return {
      fires: a.action === 'trigger',
      kind: a.action === 'trigger' ? 'would_trigger' : a.action,
      price: bar.close,
      values: a.values
    };
  }

  // After book.close(): a qualifying exit (net > 0 after costs and interest) opens an episode.
  afterExit(s: number, trade: VirtualTrade) {
    if (this.open) throw new Error('an exit while a continuation episode is open');

    const cfg = this.runtime.config;
    const qualifies = trade.net > 0;

    if (this.classic) {
      const m = this.book.machine;
      const opened = m.continuationWindows > this.windows;

      this.windows = m.continuationWindows;
      if (opened !== qualifies) throw new Error('D1 window opening disagrees with the qualifying-exit rule');
      if (!opened) return;
    } else if (!qualifies) return;

    const e: Episode = {
      id: `C-${this.episodes.length + 1}`,
      method: cfg.method,
      sourceTrade: trade,
      anchorSession: s,
      firstEligibleSession: s + 1,
      lastEligibleSession: s + cfg.windowSessions,
      exitTime: trade.exitTime,
      exitPrice: trade.exitRawPrice,
      exitNet: trade.net,
      referenceHigh: this.classic ? this.book.machine.continuationHigh : trade.exitRawPrice,
      maxHighInWindow: -Infinity,
      eligibleSessionsObserved: 0,
      barsEvaluated: 0,
      formationBars: 0,
      status: 'watching',
      windowClosedTime: NaN,
      armedTime: NaN,
      armedPrice: NaN,
      trough: NaN,
      troughTime: NaN,
      triggerTime: NaN,
      triggerPrice: NaN,
      triggerValues: {},
      end: null,
      endTime: NaN,
      endSession: -1,
      trade: null
    };

    this.episodes.push(e);
    this.current = e;
    this.entry(trade.exitTime, s, 'episode_opened', e, trade, 'qualifying exit: net > 0 after costs and interest', {
      exitNet: Math.round(trade.net * 100) / 100,
      referenceHigh: e.referenceHigh,
      firstEligibleDate: this.ds.dates[s + 1] ?? null,
      lastEligibleDate: this.ds.dates[s + cfg.windowSessions] ?? null,
      windowSessions: cfg.windowSessions
    });
  }

  // After book.open(): the continuation order filled.
  afterFill(trade: VirtualTrade) {
    const outcome = this.byTrade.get(trade);

    if (!outcome) return false;

    outcome.status = 'filled';
    outcome.episode.status = 'filled';

    return true;
  }

  // After book.afterSession(s): the window's diagnostics and expiry.
  afterSession(s: number) {
    const e = this.open;

    if (!e) return;

    if (s >= e.firstEligibleSession && s <= e.lastEligibleSession && !(this.classic && e.status === 'armed')) {
      e.maxHighInWindow = Math.max(e.maxHighInWindow, this.ds.sHigh[s]!);
      e.eligibleSessionsObserved++;
    }

    if (this.classic) {
      const m = this.book.machine;

      if (e.status === 'watching') e.referenceHigh = m.continuationHigh;
      if (m.continuationExpiries > this.expiries) {
        this.expiries = m.continuationExpiries;
        if (e.status !== 'watching') throw new Error('D1 window expiry disagrees with the episode state');
        this.close(e, 'window_expired', this.ds.sCloseTime[s]!, s, { referenceHigh: e.referenceHigh });
      }

      return;
    }

    if (s - e.anchorSession >= this.runtime.config.windowSessions)
      this.close(e, 'window_expired', this.ds.sCloseTime[s]!, s, {
        referenceHigh: e.referenceHigh,
        armed: e.status === 'armed'
      });
  }

  // The end of the data: an open episode ends `end_of_data` (a classic armed setup is "armed at end"); an order that
  // never filled stays unfilled.
  finish(endSession: number) {
    const e = this.current;

    if (e && (e.status === 'watching' || e.status === 'armed'))
      this.close(e, 'end_of_data', this.ds.sCloseTime[endSession]!, endSession, { armed: e.status === 'armed' });
    if (e && e.status === 'ordered') {
      e.status = 'unfilled_at_end';
      this.byTrade.get(e.trade!)!.status = 'unfilled_at_end';
    }
  }

  private close(e: Episode, end: EpisodeEnd, time: number, s: number, values: Record<string, LogValue>) {
    e.status = 'closed';
    e.end = end;
    e.endTime = time;
    e.endSession = s;
    this.entry(time, s, 'episode_closed', e, null, end, {
      ...values,
      maxHighInWindow: Number.isFinite(e.maxHighInWindow) ? e.maxHighInWindow : null,
      riseAfterExitPercent: Number.isFinite(e.maxHighInWindow) ? r6((e.maxHighInWindow / e.exitPrice - 1) * 100) : null
    });
  }

  private entry(
    t: number,
    session: number,
    event: LogEvent,
    e: Episode,
    trade: VirtualTrade | null,
    reason: string | null,
    values: Record<string, LogValue>,
    disposition: LogEntry['disposition'] = null
  ) {
    this.log.add({
      t,
      session,
      event,
      origin: 'continuation',
      method: e.method,
      episode: e.id,
      trade,
      disposition,
      reason,
      values
    });
  }
}
