// Growth Drawdown Recovery Gate (rise-from-recent-low-trading v1.4.0): an OPTIONAL filter on Growth entry
// eligibility, OFF by default. It never creates an entry: it only allows or blocks the entry decisions the existing
// generators make (the Rise crossing or the breakout, a latched opportunity, a renewal signal, a continuation trigger).
// With it OFF the simulation never creates it, so every decision, fill, exit, mark and log entry is the v1.3.0 one
// (tests/offParity-1.3.0.test.ts). Specification: docs/strategy-lab/GROWTH_DRAWDOWN_GATE.md.
//
// OBSERVATIONS (strictly chronological, one symbol, regular session only). Per session:
//   open     the opening trade (the first regular minute's open), at that minute's start — continuity only;
//   reopen   after missing minutes inside a session, the next bar's open, at its start — continuity only;
//   minute   each completed one-minute close, at the minute's end (start + 60 s) — a FULL observation;
//   close    the closing print (the official close), at the scheduled close (16:00 ET, 13:00 on early-close days) —
//            a FULL observation; a session without a closing print has none (its last minute close is never
//            re-observed at the close: missing data are never evidence).
// A close is known at its instant, so a decision at that instant knows it. An opening or reopening TRADE at an instant
// happens after the decisions of that instant (it can be their own fill), so the simulation hands it to the gate only
// after them (riseTrading.ts baseUntil; check() allows exactly that pending trade).
// Full observations drive everything (detection, trough, recovery start, qualification, resolution, resets);
// continuity-only observations can only break a recovery streak (a gap below the threshold). A minute's high and low
// are never used: their intrabar order is unknowable.
//
// STATES. NORMAL (no unresolved qualifying dip: permissive) → RECOVERY_REQUIRED (blocking) ⇄ RECOVERY_CONFIRMED
// (permissive while the threshold holds) → RESOLVED (a transition back to NORMAL with a fresh detection epoch).
//
// DETECTION (NORMAL). At a full observation j (close c, session s) the candidate peaks are the full observations
// i < j of the current epoch with session(i) ≥ s − N: the current session and the N sessions before it (the discovery
// window). M = the highest candidate close (on equal closes the most recent one). Compared BEFORE j joins the
// candidates: c ≤ M × (1 − d) starts an episode with peak M (its time), trough c. So the peak always precedes the
// trough; a rise after a low ($90 → $100) is never a dip. A monotonic deque keeps M; tests/drawdownGate.test.ts proves
// it equal to a rescanning reference.
//
// EPISODE. The peak P is latched until resolution — the discovery window does not expire it. A strictly lower full
// close lowers the trough T. The recovery threshold is R = T + (P − T) × r (r = the retracement fraction of the whole
// peak-to-trough decline). Per full observation, in order: c ≥ P → RESOLVED (even before the confirmation completes:
// a full recovery supersedes the partial one); c < T → new trough (a running or completed confirmation is reset);
// c ≥ R → a confirmation streak starts (Y = 0: confirmed at once), or qualifies; T ≤ c < R → a running streak resets
// / a completed confirmation is lost. A continuity-only observation below R resets as well.
//
// CONFIRMATION CLOCK (Y trading-session intervals). The streak's first observation is in session s0 at New York
// wall-clock minute m0 (session index 0). With Y ≥ 1 it is confirmed at the first FULL observation, continuity intact,
// in session s0 + Y at a New York minute ≥ m0, or in any later session (early close, or no minute at that time: the
// next actual observation). Sessions are the dataset's (the NYSE sessions present in the canonical data); weekends,
// holidays and overnight gaps are not sessions and are never assumed to hold prices.
//
// AVAILABILITY. The detector starts N sessions before the run's first session (or at the first loaded session when the
// data begin later) with a fresh epoch — whatever other options load as warm-up, so the gate's history never depends
// on them. It permits only in NORMAL or RECOVERY_CONFIRMED, and only once N sessions have been observed (the discovery
// window complete); otherwise it blocks (fail closed, `insufficient_history`).
//
// "≥" / "≤" against a level absorb binary rounding only (relative 1e-12, as the Rise scanner); a new trough must be
// strictly lower.
import { RELATIVE_TOLERANCE } from '../entry-signals/riseFromRecentLow.ts';
import type { Dataset } from '../four-family/data.ts';
import { newYorkOffset } from '../lib/session.ts';
import type { LogValue } from './continuation.ts';

export interface DrawdownGateConfig {
  lookbackSessions: number; // N: the discovery window, trading sessions before the current one
  dipThresholdPercent: number; // d: the minimum peak-to-subsequent-trough decline, percent
  recoveryRetracementPercent: number; // r: the share of the whole decline to recover, percent (100 = the peak)
  confirmationSessions: number; // Y: trading-session intervals the recovery must hold (0 = at once)
}

// Illustrative defaults, not optimised.
export const DEFAULT_DRAWDOWN_GATE: Readonly<DrawdownGateConfig> = {
  lookbackSessions: 30,
  dipThresholdPercent: 5,
  recoveryRetracementPercent: 70,
  confirmationSessions: 2
};

export const DRAWDOWN_GATE_BOUNDS = {
  lookbackSessions: [1, 500],
  dipThresholdPercent: [0.1, 90],
  recoveryRetracementPercent: [0.1, 100],
  confirmationSessions: [0, 60]
} as const;

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const drawdownGateConfigErrors = (c: DrawdownGateConfig): string[] => {
  const errors: string[] = [];
  const b = DRAWDOWN_GATE_BOUNDS;
  const int = (name: keyof DrawdownGateConfig) => {
    const v = c[name];
    const [lo, hi] = b[name];

    if (!(Number.isInteger(v) && v >= lo && v <= hi)) errors.push(`${name} must be an integer in [${lo}, ${hi}]`);
  };
  const pct = (name: keyof DrawdownGateConfig) => {
    const v = c[name];
    const [lo, hi] = b[name];

    if (!(finite(v) && v >= lo && v <= hi)) errors.push(`${name} must be in [${lo}, ${hi}]`);
  };

  int('lookbackSessions');
  pct('dipThresholdPercent');
  pct('recoveryRetracementPercent');
  int('confirmationSessions');

  return errors;
};

// Sessions of history before the window: the discovery window.
export const drawdownGateWarmupSessions = (c: DrawdownGateConfig | null | undefined) => (c ? c.lookbackSessions : 0);

// A percentage as a fraction, the double nearest to the decimal (5 → 0.05).
const fraction = (percent: number) => {
  const f = Number(`${percent}e-2`);

  return Number.isFinite(f) ? f : percent / 100;
};
const atOrAbove = (price: number, level: number) => price >= level * (1 - RELATIVE_TOLERANCE);
const atOrBelow = (price: number, level: number) => price <= level * (1 + RELATIVE_TOLERANCE);
const r6 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : null);
const iso = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString() : null);

// ----- observations -----

export type ObservationKind = 'open' | 'reopen' | 'minute' | 'close';

export interface Observation {
  seq: number; // chronological index over every observation processed (continuity-only ones included)
  kind: ObservationKind;
  session: number;
  bar: number; // the bar index within the session (-1 for the close)
  time: number; // Unix seconds: when it is first known
  price: number;
}

export const isFull = (kind: ObservationKind) => kind === 'minute' || kind === 'close';

// Every observation of sessions [first, last] in chronological order (a reference enumeration for tests and tools; the
// gate itself walks the dataset with a cursor and never materialises this list).
export const observationsOf = (ds: Dataset, first = 0, last = ds.sessionCount - 1): Observation[] => {
  const out: Observation[] = [];

  for (let s = first; s <= last; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    for (let k = 0; k < count; k++) {
      const t = ds.bTime[start + k]!;

      if (k === 0) out.push({ seq: out.length, kind: 'open', session: s, bar: 0, time: t, price: ds.bOpen[start]! });
      else if (t > ds.bTime[start + k - 1]! + 60)
        out.push({ seq: out.length, kind: 'reopen', session: s, bar: k, time: t, price: ds.bOpen[start + k]! });
      out.push({ seq: out.length, kind: 'minute', session: s, bar: k, time: t + 60, price: ds.bClose[start + k]! });
    }
    if (Number.isFinite(ds.sClosingPrint[s]!))
      out.push({ seq: out.length, kind: 'close', session: s, bar: -1, time: ds.sCloseTime[s]!, price: ds.sClose[s]! });
  }

  return out;
};

// ----- records -----

export type DrawdownState = 'normal' | 'recovery_required' | 'recovery_confirmed';
export type DrawdownEvent =
  | 'dip_detected'
  | 'new_trough'
  | 'recovery_started'
  | 'confirmation_reset'
  | 'recovery_confirmed'
  | 'confirmation_lost'
  | 'dip_resolved'
  | 'window_complete'
  | 'entry_blocked_by_drawdown_gate';
export type ResetCause = 'opening_gap' | 'reopen_gap' | 'minute_close' | 'closing_print' | 'new_trough';

export interface Streak {
  startSeq: number;
  startTime: number;
  startSession: number;
  startPrice: number;
  startKind: ObservationKind;
  startMinute: number; // New York wall-clock minute of day of the start
  targetSession: number; // startSession + Y
  confirmedTime: number; // NaN until confirmed
  confirmedSession: number;
  confirmedPrice: number;
}

export interface DrawdownEpisode {
  id: string; // DD-1, DD-2 … per symbol
  epoch: number; // the detection epoch it was found in (1 = from the first loaded session)
  peak: number; // P (a full-observation close)
  peakTime: number;
  peakSession: number;
  peakKind: ObservationKind;
  detectedTime: number; // the first observation at least d below the peak
  detectedSession: number;
  detectedPrice: number;
  detectedDipPercent: number;
  windowCompleteAtDetection: boolean; // false: the discovery window reached before the loaded data (peak censored)
  beforeRun: boolean; // detected in the warm-up, before the first simulated session
  trough: number; // T
  troughTime: number;
  troughSession: number;
  troughUpdates: number; // strictly lower closes after the detection
  threshold: number; // R = T + (P − T) × r (current; final at the end)
  maxDipPercent: number; // (P − T) / P × 100
  state: DrawdownState | 'resolved';
  streak: Streak | null; // the current confirmation streak
  recoveryStarts: number;
  confirmations: number;
  confirmationResets: number; // running streaks broken before confirming
  confirmationLosses: number; // completed confirmations lost
  resetsByCause: Record<ResetCause, number>;
  firstConfirmedTime: number;
  resolvedTime: number;
  resolvedSession: number;
  resolvedPrice: number;
  resolvedBeforeConfirmation: boolean; // the price regained the peak while the recovery was not yet confirmed
  blocked: Record<string, number>; // entry decisions it blocked, by decision kind
}

export interface DrawdownTransition {
  seq: number;
  t: number;
  session: number;
  event: DrawdownEvent;
  episode: string | null;
  kind: ObservationKind | 'decision';
  price: number;
  state: DrawdownState; // after the transition
  reason: string;
  values: Record<string, LogValue>;
}

export interface DrawdownCheck {
  pass: boolean;
  state: DrawdownState | 'insufficient_history';
  episode: DrawdownEpisode | null;
  text: string;
  values: Record<string, LogValue>;
}

export interface DrawdownRelease {
  time: number;
  session: number;
  price: number;
  kind: ObservationKind;
  episode: string | null;
  cause: 'recovery_confirmed' | 'dip_resolved' | 'window_complete';
}

// ----- the gate -----

export class DrawdownRecoveryGate {
  readonly episodes: DrawdownEpisode[] = [];
  readonly transitions: DrawdownTransition[] = [];
  readonly releases: DrawdownRelease[] = [];
  onRelease: ((r: DrawdownRelease) => void) | null = null;
  state: DrawdownState = 'normal';
  current: DrawdownEpisode | null = null;
  epoch = 1;
  observations = 0;
  fullObservations = 0;
  lastFull: Observation | null = null;
  // the cursor: the next observation is (session, bar, phase); phase 0 = open/reopen check, 1 = minute, 2 = close
  private cs = 0;
  private ck = 0;
  private cp = 0;
  private nextT = NaN;
  // the discovery deque of the current epoch (full observations, decreasing closes from the front)
  private dqSeq: number[] = [];
  private dqSession: number[] = [];
  private dqTime: number[] = [];
  private dqPrice: number[] = [];
  private dqKind: ObservationKind[] = [];
  private dqHead = 0;
  private readonly d: number;
  private readonly r: number;
  private readonly offsetBySession = new Map<number, number>();
  private windowCompleteNoted = false;

  // the first session the detector reads: N sessions before the run's first one (or the first loaded session)
  readonly origin: number;

  constructor(
    readonly ds: Dataset,
    readonly config: DrawdownGateConfig,
    readonly runStartSession = 0
  ) {
    const errors = drawdownGateConfigErrors(config);

    if (errors.length) throw new Error(`invalid drawdown recovery gate: ${errors.join('; ')}`);
    this.d = fraction(config.dipThresholdPercent);
    this.r = fraction(config.recoveryRetracementPercent);
    this.origin = Math.max(0, runStartSession - config.lookbackSessions);
    this.cs = this.origin;
    this.nextT = this.timeAt(this.origin, 0, 0);
  }

  // ----- the cursor -----

  // The time of the observation at (s, k, phase), or NaN when that phase has no observation (no reopen gap).
  private timeAt(s: number, k: number, phase: number): number {
    const ds = this.ds;

    if (s >= ds.sessionCount) return Infinity;

    const start = ds.sBarStart[s]!;

    if (phase === 2) return Number.isFinite(ds.sClosingPrint[s]!) ? ds.sCloseTime[s]! : NaN;
    if (phase === 1) return ds.bTime[start + k]! + 60;
    if (k === 0) return ds.bTime[start]!;

    return ds.bTime[start + k]! > ds.bTime[start + k - 1]! + 60 ? ds.bTime[start + k]! : NaN;
  }

  private advanceCursor() {
    const ds = this.ds;

    for (;;) {
      if (this.cp === 0) this.cp = 1;
      else if (this.cp === 1) {
        if (this.ck + 1 < ds.sBarCount[this.cs]!) {
          this.ck++;
          this.cp = 0;
        } else this.cp = 2;
      } else {
        this.cs++;
        this.ck = 0;
        this.cp = 0;
      }

      const t = this.timeAt(this.cs, this.ck, this.cp);

      if (!Number.isNaN(t)) {
        this.nextT = t;
        return;
      }
    }
  }

  // When the next unprocessed observation is first known (Infinity past the data).
  get nextTime() {
    return this.nextT;
  }

  // Whether the next unprocessed observation is a full one (a completed close), not an opening or reopening trade.
  get nextIsFull() {
    return this.cp !== 0;
  }

  // Processes the next observation and returns it.
  step(): Observation {
    const ds = this.ds;
    const s = this.cs;

    if (s >= ds.sessionCount) throw new Error('the drawdown gate has no observation left');

    const start = ds.sBarStart[s]!;
    const k = this.ck;
    const kind: ObservationKind = this.cp === 2 ? 'close' : this.cp === 1 ? 'minute' : k === 0 ? 'open' : 'reopen';
    const o: Observation = {
      seq: this.observations++,
      kind,
      session: s,
      bar: this.cp === 2 ? -1 : k,
      time: this.nextT,
      price: kind === 'close' ? ds.sClose[s]! : kind === 'minute' ? ds.bClose[start + k]! : ds.bOpen[start + k]!
    };

    this.advanceCursor();
    this.observe(o);

    return o;
  }

  // Processes every observation known at or before `time`.
  advanceTo(time: number) {
    while (this.nextT <= time && this.nextT !== Infinity) this.step();
  }

  // ----- the state machine -----

  get windowComplete() {
    return this.windowCompleteAt(this.lastFull?.session ?? 0);
  }

  windowCompleteAt(s: number) {
    return s - this.config.lookbackSessions >= this.origin;
  }

  get permissive() {
    return this.permissiveAt(this.lastFull?.session ?? 0);
  }

  permissiveAt(s: number) {
    return this.windowCompleteAt(s) && this.state !== 'recovery_required';
  }

  private minuteOfDay(o: Observation) {
    let offset = this.offsetBySession.get(o.session);

    if (offset === undefined) {
      offset = newYorkOffset(this.ds.sCloseTime[o.session]!);
      this.offsetBySession.set(o.session, offset);
    }

    return Math.floor(((((o.time + offset) % 86400) + 86400) % 86400) / 60);
  }

  // The permissive status after the last processed observation (the window starts incomplete: N ≥ 1).
  private lastPermissive = false;
  private releaseCause: DrawdownRelease['cause'] | null = null;

  private observe(o: Observation) {
    if (!isFull(o.kind)) {
      this.observeContinuity(o);
      if (!this.permissiveAt(o.session)) this.lastPermissive = false;
      return;
    }

    this.releaseCause = null;
    this.observeFull(o);
    if (!this.windowCompleteNoted && this.windowCompleteAt(o.session)) {
      this.windowCompleteNoted = true;
      this.transition(
        o,
        'window_complete',
        `the ${this.config.lookbackSessions}-session discovery window lies inside the loaded data from here on`,
        { sessionsBefore: o.session }
      );
    }

    // A blocking → permissive transition is a release: an armed opportunity waiting on this gate may be decided now.
    const after = this.permissiveAt(o.session);

    if (after && !this.lastPermissive) {
      const release: DrawdownRelease = {
        time: o.time,
        session: o.session,
        price: o.price,
        kind: o.kind,
        episode: this.current?.id ?? (this.releaseCause === 'dip_resolved' ? this.episodes.at(-1)!.id : null),
        cause: this.releaseCause ?? 'window_complete'
      };

      this.releases.push(release);
      this.onRelease?.(release);
    }
    this.lastPermissive = after;
  }

  private observeContinuity(o: Observation) {
    const e = this.current;

    if (!e?.streak || atOrAbove(o.price, e.threshold)) return;
    this.breakStreak(o, o.kind === 'open' ? 'opening_gap' : 'reopen_gap');
  }

  private observeFull(o: Observation) {
    this.fullObservations++;
    this.lastFull = o;

    const e = this.current;

    if (!e) {
      this.detect(o);
      return;
    }

    // 1. a full recovery to the anchored peak resolves the episode, confirmed or not
    if (atOrAbove(o.price, e.peak)) {
      this.resolve(e, o);
      return;
    }

    // 2. a strictly lower close is the new trough: the threshold moves down and any confirmation restarts
    if (o.price < e.trough) {
      if (e.streak) this.breakStreak(o, 'new_trough');
      this.lowerTrough(e, o);
      return;
    }

    // 3. at or above the recovery threshold
    if (atOrAbove(o.price, e.threshold)) {
      if (!e.streak) {
        e.streak = {
          startSeq: o.seq,
          startTime: o.time,
          startSession: o.session,
          startPrice: o.price,
          startKind: o.kind,
          startMinute: this.minuteOfDay(o),
          targetSession: o.session + this.config.confirmationSessions,
          confirmedTime: NaN,
          confirmedSession: -1,
          confirmedPrice: NaN
        };
        e.recoveryStarts++;
        this.transition(
          o,
          'recovery_started',
          `close ${o.price} at or above the recovery threshold ${r6(e.threshold)}`,
          {
            ...this.levels(e),
            confirmationSessions: this.config.confirmationSessions,
            // qualifies Y sessions after this one at/after this New York minute (the future calendar is not read)
            qualifiesAtNewYorkMinute: e.streak.startMinute
          }
        );
        if (this.config.confirmationSessions === 0) this.confirm(e, o);
      } else if (this.state === 'recovery_required' && this.qualifies(e.streak, o)) this.confirm(e, o);
      return;
    }

    // 4. between the trough and the threshold
    if (e.streak) this.breakStreak(o, o.kind === 'close' ? 'closing_print' : 'minute_close');
  }

  private qualifies(st: Streak, o: Observation) {
    return o.session > st.targetSession || (o.session === st.targetSession && this.minuteOfDay(o) >= st.startMinute);
  }

  private detect(o: Observation) {
    const n = this.config.lookbackSessions;
    let h = this.dqHead;

    // the window: the current session and the N sessions before it
    while (h < this.dqSeq.length && this.dqSession[h]! < o.session - n) h++;
    this.dqHead = h;

    if (h < this.dqSeq.length) {
      const m = this.dqPrice[h]!;

      if (atOrBelow(o.price, m * (1 - this.d))) {
        this.open(o, h);
        return;
      }
    }

    this.push(o);
  }

  private push(o: Observation) {
    // pop equal and lower closes: the front is the highest close, the most recent of equal ones
    while (this.dqSeq.length > this.dqHead && this.dqPrice[this.dqPrice.length - 1]! <= o.price) {
      this.dqSeq.pop();
      this.dqSession.pop();
      this.dqTime.pop();
      this.dqPrice.pop();
      this.dqKind.pop();
    }
    this.dqSeq.push(o.seq);
    this.dqSession.push(o.session);
    this.dqTime.push(o.time);
    this.dqPrice.push(o.price);
    this.dqKind.push(o.kind);

    // compact the consumed front now and then
    if (this.dqHead > 4096 && this.dqHead * 2 > this.dqSeq.length) {
      this.dqSeq.splice(0, this.dqHead);
      this.dqSession.splice(0, this.dqHead);
      this.dqTime.splice(0, this.dqHead);
      this.dqPrice.splice(0, this.dqHead);
      this.dqKind.splice(0, this.dqHead);
      this.dqHead = 0;
    }
  }

  private clearDeque() {
    this.dqSeq = [];
    this.dqSession = [];
    this.dqTime = [];
    this.dqPrice = [];
    this.dqKind = [];
    this.dqHead = 0;
  }

  private open(o: Observation, h: number) {
    const peak = this.dqPrice[h]!;
    const e: DrawdownEpisode = {
      id: `DD-${this.episodes.length + 1}`,
      epoch: this.epoch,
      peak,
      peakTime: this.dqTime[h]!,
      peakSession: this.dqSession[h]!,
      peakKind: this.dqKind[h]!,
      detectedTime: o.time,
      detectedSession: o.session,
      detectedPrice: o.price,
      detectedDipPercent: ((peak - o.price) / peak) * 100,
      windowCompleteAtDetection: this.windowCompleteAt(o.session),
      beforeRun: o.session < this.runStartSession,
      trough: o.price,
      troughTime: o.time,
      troughSession: o.session,
      troughUpdates: 0,
      threshold: NaN,
      maxDipPercent: NaN,
      state: 'recovery_required',
      streak: null,
      recoveryStarts: 0,
      confirmations: 0,
      confirmationResets: 0,
      confirmationLosses: 0,
      resetsByCause: { opening_gap: 0, reopen_gap: 0, minute_close: 0, closing_print: 0, new_trough: 0 },
      firstConfirmedTime: NaN,
      resolvedTime: NaN,
      resolvedSession: -1,
      resolvedPrice: NaN,
      resolvedBeforeConfirmation: false,
      blocked: {}
    };

    this.setLevels(e);
    this.episodes.push(e);
    this.current = e;
    this.state = 'recovery_required';
    this.clearDeque();
    this.transition(
      o,
      'dip_detected',
      `close ${o.price} is ${r6(e.detectedDipPercent)}% below the peak ${peak} of ${iso(e.peakTime)} (≥ ${this.config.dipThresholdPercent}%)`,
      {
        ...this.levels(e),
        peakTime: iso(e.peakTime),
        peakSession: this.ds.dates[e.peakSession]!,
        detectedDipPercent: r6(e.detectedDipPercent),
        dipThresholdPercent: this.config.dipThresholdPercent,
        lookbackSessions: this.config.lookbackSessions,
        windowComplete: e.windowCompleteAtDetection,
        epoch: e.epoch
      }
    );
  }

  private setLevels(e: DrawdownEpisode) {
    e.threshold = e.trough + (e.peak - e.trough) * this.r;
    e.maxDipPercent = ((e.peak - e.trough) / e.peak) * 100;
  }

  private levels(e: DrawdownEpisode): Record<string, LogValue> {
    return {
      peak: e.peak,
      trough: e.trough,
      troughTime: iso(e.troughTime),
      dipPercent: r6(e.maxDipPercent),
      retracementPercent: this.config.recoveryRetracementPercent,
      threshold: r6(e.threshold)
    };
  }

  private lowerTrough(e: DrawdownEpisode, o: Observation) {
    const previous = e.trough;

    e.trough = o.price;
    e.troughTime = o.time;
    e.troughSession = o.session;
    e.troughUpdates++;
    this.setLevels(e);

    // one record per session for a run of new lows (its first and last instant and the count), so a crash does not
    // log every minute; the record is complete at the session's next transition or end
    const last = this.transitions.at(-1);

    if (last && last.event === 'new_trough' && last.episode === e.id && last.session === o.session) {
      last.t = o.time;
      last.seq = o.seq;
      last.kind = o.kind;
      last.price = o.price;
      last.reason = `new trough ${o.price} (${(last.values.updates as number) + 1} lower closes this session)`;
      Object.assign(last.values, this.levels(e), {
        updates: (last.values.updates as number) + 1,
        lastTime: iso(o.time)
      });
      return;
    }

    this.transition(o, 'new_trough', `new trough ${o.price} below ${previous}`, {
      ...this.levels(e),
      previousTrough: previous,
      updates: 1,
      firstTime: iso(o.time),
      lastTime: iso(o.time)
    });
  }

  private confirm(e: DrawdownEpisode, o: Observation) {
    const st = e.streak!;

    st.confirmedTime = o.time;
    st.confirmedSession = o.session;
    st.confirmedPrice = o.price;
    e.confirmations++;
    if (Number.isNaN(e.firstConfirmedTime)) e.firstConfirmedTime = o.time;
    this.state = 'recovery_confirmed';
    e.state = 'recovery_confirmed';
    this.releaseCause = 'recovery_confirmed';
    this.transition(
      o,
      'recovery_confirmed',
      this.config.confirmationSessions === 0
        ? `the recovery threshold ${r6(e.threshold)} reached (Y = 0: no confirmation interval)`
        : `the recovery threshold ${r6(e.threshold)} held at every observation for ${this.config.confirmationSessions} session interval(s) since ${iso(st.startTime)}`,
      {
        ...this.levels(e),
        confirmationStart: iso(st.startTime),
        confirmationSessions: this.config.confirmationSessions,
        sessionsElapsed: o.session - st.startSession
      }
    );
  }

  private breakStreak(o: Observation, cause: ResetCause) {
    const e = this.current!;
    const st = e.streak!;
    const confirmed = this.state === 'recovery_confirmed';

    e.streak = null;
    e.resetsByCause[cause]++;
    if (confirmed) e.confirmationLosses++;
    else e.confirmationResets++;
    this.state = 'recovery_required';
    e.state = 'recovery_required';
    this.transition(
      o,
      confirmed ? 'confirmation_lost' : 'confirmation_reset',
      `${cause}: ${o.kind === 'open' ? 'opening trade' : o.kind === 'reopen' ? 'reopening trade' : o.kind === 'close' ? 'closing print' : 'minute close'} ${o.price} below the recovery threshold ${r6(e.threshold)}${cause === 'new_trough' ? ' (a new trough)' : ''}`,
      {
        ...this.levels(e),
        cause,
        confirmationStart: iso(st.startTime),
        sessionsElapsed: o.session - st.startSession,
        wasConfirmed: confirmed
      }
    );
  }

  private resolve(e: DrawdownEpisode, o: Observation) {
    const early = this.state !== 'recovery_confirmed';

    e.state = 'resolved';
    e.resolvedTime = o.time;
    e.resolvedSession = o.session;
    e.resolvedPrice = o.price;
    e.resolvedBeforeConfirmation = early;
    e.streak = null;
    if (early) this.releaseCause = 'dip_resolved';
    this.current = null;
    this.state = 'normal';
    this.transition(
      o,
      'dip_resolved',
      `close ${o.price} regained the anchored peak ${e.peak}${early ? ' before the recovery was confirmed (a full recovery supersedes the partial-retracement requirement)' : ''}: episode closed, a fresh detection epoch starts here`,
      {
        ...this.levels(e),
        peakTime: iso(e.peakTime),
        resolvedBeforeConfirmation: early,
        confirmations: e.confirmations,
        confirmationResets: e.confirmationResets,
        confirmationLosses: e.confirmationLosses,
        sessionsSinceDetection: o.session - e.detectedSession
      }
    );
    // a fresh epoch: older prices can never re-arm this episode; the resolving close is the new baseline
    this.epoch++;
    this.clearDeque();
    this.push(o);
  }

  private transition(o: Observation, event: DrawdownEvent, reason: string, values: Record<string, LogValue>) {
    this.transitions.push({
      seq: o.seq,
      t: o.time,
      session: o.session,
      event,
      episode: this.current?.id ?? (event === 'dip_resolved' ? this.episodes.at(-1)!.id : null),
      kind: o.kind,
      price: o.price,
      state: this.state,
      reason,
      values
    });
  }

  // ----- decisions -----

  // The gate at a decision at `time` in session s (decision price `price`). Every observation known at `time` must have
  // been processed (the simulation interleaves them); a later observation is never read.
  check(s: number, time: number, price: number): DrawdownCheck {
    // pending at the decision instant may be only an opening/reopening trade of that instant (it follows the decision)
    if (this.nextT < time || (this.nextT === time && this.nextIsFull))
      throw new Error(`drawdown gate: observations up to ${iso(time)} were not processed before the decision`);

    const e = this.current;
    const complete = this.windowCompleteAt(s);
    const state: DrawdownCheck['state'] = complete ? this.state : 'insufficient_history';
    const pass = complete && this.state !== 'recovery_required';
    const st = e?.streak ?? null;
    const values: Record<string, LogValue> = {
      state,
      episode: e?.id ?? null,
      decisionPrice: price,
      ...(e
        ? {
            peak: e.peak,
            peakTime: iso(e.peakTime),
            trough: e.trough,
            troughTime: iso(e.troughTime),
            dipPercent: r6(e.maxDipPercent),
            retracementPercent: this.config.recoveryRetracementPercent,
            threshold: r6(e.threshold),
            recoveredPercent: r6(((price - e.trough) / (e.peak - e.trough)) * 100),
            confirmationSessions: this.config.confirmationSessions,
            confirmationStart: st ? iso(st.startTime) : null,
            sessionsElapsed: st ? s - st.startSession : null,
            confirmationStartNewYorkMinute: st ? st.startMinute : null,
            confirmedAt: st && st.confirmedSession >= 0 ? iso(st.confirmedTime) : null,
            confirmationResets: e.confirmationResets,
            confirmationLosses: e.confirmationLosses
          }
        : {}),
      windowComplete: complete
    };
    const text = !complete
      ? `drawdown_gate: insufficient_history — the ${this.config.lookbackSessions}-session discovery window reaches before the loaded data (${s} session(s) loaded before ${this.ds.dates[s]})`
      : !e
        ? 'drawdown gate: normal (no unresolved significant dip)'
        : this.state === 'recovery_confirmed'
          ? `drawdown gate: recovery confirmed — ${e.id} (peak ${e.peak}, trough ${e.trough}) held ≥ ${r6(e.threshold)} since ${iso(st!.startTime)}`
          : `drawdown_gate: recovery required — ${e.id} peak ${e.peak} (${iso(e.peakTime)}), trough ${e.trough}, dip ${r6(e.maxDipPercent)}%; needs ≥ ${r6(e.threshold)} (${this.config.recoveryRetracementPercent}% of the decline) held ${this.config.confirmationSessions} session(s)${st ? `, streak since ${iso(st.startTime)}` : ''}`;

    return { pass, state, episode: e, text, values };
  }

  // A decision this gate blocked (recorded once per decision by the caller).
  noteBlocked(
    s: number,
    time: number,
    price: number,
    decisionKind: string,
    ref: Record<string, LogValue>,
    check: DrawdownCheck
  ) {
    const e = check.episode;

    if (e) e.blocked[decisionKind] = (e.blocked[decisionKind] ?? 0) + 1;
    this.transitions.push({
      seq: this.observations,
      t: time,
      session: s,
      event: 'entry_blocked_by_drawdown_gate',
      episode: e?.id ?? null,
      kind: 'decision',
      price,
      state: this.state,
      reason: check.text,
      values: { decisionKind, ...ref, state: check.state }
    });
  }

  // Processes the rest of the data through session `end` (the run's last), so the records cover the whole window.
  finish(end: number) {
    this.advanceTo(this.ds.sCloseTime[end]!);
  }
}
