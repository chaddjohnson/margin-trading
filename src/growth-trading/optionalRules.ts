// Growth optional rules (rise-from-recent-low-trading v1.3.0), each OFF by default and independently switchable:
//
//   1. INITIAL RISK STOP — a fixed protective stop set at the entry fill: fill price − m × ATR(L).
//   2. TREND-BREAKOUT ENTRY — an alternative base entry method (selector; the Rise entry stays the default).
//   3. TREND RETENTION — at the first profit trailing-stop event sell a fraction, keep the remainder and exit it on K
//      consecutive completed closes below an SMA.
//
// With all three OFF none of this module runs: riseTrading.ts takes its v1.2.0 code paths and every decision, fill,
// exit, mark and log entry is identical to v1.2.0 (tests/offParity-1.2.0.test.ts). Specification:
// docs/strategy-lab/GROWTH_OPTIONAL_RULES.md. Every observation is a COMPLETED trading session of the dataset (NYSE
// sessions present in the data, whatever the bar resolution): session s has high H_s, low L_s and close C_s (the
// regular-session close: the closing print, or the last regular trade), as the entry trend filter reads them.
//
// ATR (rule 1). True range TR_i = max(H_i, C_{i−1}) − min(L_i, C_{i−1}) (Wilder's true range). ATR_L = the SIMPLE mean
// of the L true ranges of the L sessions completed immediately before the FILL session (no Wilder/exponential
// smoothing, so the value depends on those L + 1 sessions only, never on where the loaded history starts). The fill
// session's own high, low and close are never read. Fewer than L + 1 completed sessions, or a non-positive or
// non-finite price among them, makes the stop unavailable: the ENTRY DECISION is then blocked and recorded
// (`insufficient_history` / `invalid_data`); a position is never opened without the requested protection. The fill
// session is known at the decision: the decision's own session when a trade follows the decision in it, else the
// next session (the book's own fill rule).
//
// BREAKOUT (rule 2). At the completed daily close of session s (decided at the scheduled close, filled at the next
// eligible trade: the next session's opening trade):
//   C_s > SMA_L(s)  AND  SMA_L(s) > SMA_L(s − K)  AND  C_s > max(H_{s−N} … H_{s−1})          (all strict)
// SMA_L(s) = mean(C_{s−L+1} … C_s). The prior-high window excludes the signal session. Each qualifying session is its
// OWN signal (id = its close instant): decided once, taken when flat with no order, otherwise rejected — never
// replayed. The reference high is always the preceding N sessions of the signal session; it is never reset to an exit
// fill and there is no cooldown. History short of max(L + K − 1, N) sessions, or invalid data, is recorded per session.
//
// RETENTION (rule 3). Stage FULL: the existing profit trailing stop, maximum losing hold and buffered loss. The first
// profit trailing-stop event (gap or intraday) sells f × the current shares at that fill and starts stage REMAINDER:
// the trailing stop is consumed (never re-armed); the remainder's exit is the trend rule — count consecutive completed
// closes strictly below SMA_L (C_s < SMA_L(s)), reset when a close is not below; the K-th consecutive one decides at
// that close, filled at the next eligible trade. The partial-sale session's own close is the FIRST observation
// counted (it is complete after the sale; nothing before the sale counts). The initial risk stop, the maximum losing
// hold and the buffered loss keep applying to the remaining shares, against the REMAINING principal and its interest.
//
// EXIT ORDER inside a session (rules 1 and 3; only when one of them is ON). Every exit candidate is an observed trade:
// the session's opening trade, a minute's opening trade (phase 0) or a level crossed within a minute (phase 1, filled
// at the level: an ASSUMED fill). The earliest candidate executes: by bar, then phase (a minute's opening trade comes
// before anything inside that minute), then — inside a minute — the higher stop level first (a falling price reaches
// it first), then at one trade the precedence
//   retention partial pending (stage full, retention ON): initial stop > maximum hold > buffered loss > trailing stop
//   otherwise:                                            trailing stop > initial stop > maximum hold > buffered loss
//                                                          > trend exit
// i.e. a FULL risk exit due at the same trade takes precedence over the partial sale (one fill, never a partial and a
// full sale of the same instant); without retention the higher active stop governs, as before. After a partial sale
// the remainder is re-evaluated from that very trade on (a lower initial stop crossed later in the same minute
// executes). Shares are sold once: a partial removes its shares and principal from the position before anything else
// is evaluated.
import type { Dataset } from '../four-family/data.ts';
import type { BookSettings, ShadowBook, VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import {
  type ExecutionPrice,
  type ExitDecision,
  type ExitReason,
  type LotState,
  type StrategyParams,
  ExitManager,
  firstTradeAfterDecision,
  firstTradeFrom,
  interestOn,
  priceAt,
  secondsPerDay,
  secondsPerMinute,
  secondsPerYear,
  timeAt,
  tradeExecution
} from '../shared-margin-portfolio/strategy.ts';
import type { DecisionLog, LogValue } from './continuation.ts';

// ----- configuration -----

export const ENTRY_METHODS = ['rise_from_recent_low', 'trend_breakout'] as const;
export type EntryMethod = (typeof ENTRY_METHODS)[number];

export const ENTRY_METHOD_LABEL: Record<EntryMethod, string> = {
  rise_from_recent_low: 'Rise from recent low',
  trend_breakout: 'Breakout above the prior high in a rising trend'
};

export interface BreakoutEntryConfig {
  smaSessions: number; // L: the intrinsic trend SMA of completed session closes
  slopeComparisonSessions: number; // K: SMA_L(s) > SMA_L(s − K)
  priorHighSessions: number; // N: the preceding completed sessions whose highest high must be exceeded
}

export interface InitialStopConfig {
  atrSessions: number; // L: completed sessions in the ATR
  atrMultiple: number; // m: stop = fill − m × ATR
}

export interface RetentionConfig {
  sellPercent: number; // f: percent of the current shares sold at the first profit trailing-stop event
  smaSessions: number; // L: the remainder's SMA of completed session closes
  closesBelow: number; // K: consecutive completed closes strictly below it that exit the remainder
}

// Initial research hypotheses (the brief's starting values), not optimised.
export const DEFAULT_BREAKOUT: Readonly<BreakoutEntryConfig> = {
  smaSessions: 50,
  slopeComparisonSessions: 40,
  priorHighSessions: 20
};
export const DEFAULT_INITIAL_STOP: Readonly<InitialStopConfig> = { atrSessions: 20, atrMultiple: 3 };
export const DEFAULT_RETENTION: Readonly<RetentionConfig> = { sellPercent: 50, smaSessions: 50, closesBelow: 2 };

const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isNum = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export const breakoutConfigErrors = (c: BreakoutEntryConfig): string[] => [
  ...(isInt(c.smaSessions, 2, 1000) ? [] : ['smaSessions must be an integer in [2, 1000]']),
  ...(isInt(c.slopeComparisonSessions, 1, 1000) ? [] : ['slopeComparisonSessions must be an integer in [1, 1000]']),
  ...(isInt(c.priorHighSessions, 1, 1000) ? [] : ['priorHighSessions must be an integer in [1, 1000]'])
];

export const initialStopConfigErrors = (c: InitialStopConfig): string[] => [
  ...(isInt(c.atrSessions, 1, 1000) ? [] : ['atrSessions must be an integer in [1, 1000]']),
  ...(isNum(c.atrMultiple, 0, 100) && c.atrMultiple > 0 ? [] : ['atrMultiple must be in (0, 100]'])
];

export const retentionConfigErrors = (c: RetentionConfig): string[] => [
  ...(isNum(c.sellPercent, 0, 100) && c.sellPercent > 0 && c.sellPercent < 100
    ? []
    : ['sellPercent must be in (0, 100): 100% would be the full exit of the version without retention']),
  ...(isInt(c.smaSessions, 1, 1000) ? [] : ['smaSessions must be an integer in [1, 1000]']),
  ...(isInt(c.closesBelow, 1, 1000) ? [] : ['closesBelow must be an integer in [1, 1000]'])
];

// Sessions of history each rule reads before a decision in the window (added to the configuration's warm-up).
export const breakoutWarmupSessions = (c: BreakoutEntryConfig | null | undefined) =>
  c ? Math.max(c.smaSessions + c.slopeComparisonSessions - 1, c.priorHighSessions) : 0;
export const initialStopWarmupSessions = (c: InitialStopConfig | null | undefined) => (c ? c.atrSessions + 1 : 0);
export const retentionWarmupSessions = (c: RetentionConfig | null | undefined) => (c ? c.smaSessions - 1 : 0);

// A percentage as a fraction, the double nearest to the decimal (50 → 0.5, 30 → 0.3).
export const fractionOf = (percent: number) => {
  const f = Number(`${percent}e-2`);

  return Number.isFinite(f) ? f : percent / 100;
};

const validPrice = (x: number) => Number.isFinite(x) && x > 0;
const r6 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : null);

// ----- session observations -----

export type Availability = 'insufficient_history' | 'invalid_data';

// SMA_length(s) of completed session closes C_{s−length+1} … C_s.
export const sessionSma = (
  ds: Dataset,
  s: number,
  length: number
): { ok: true; value: number } | { ok: false; reason: Availability; text: string } => {
  if (s - length + 1 < 0)
    return {
      ok: false,
      reason: 'insufficient_history',
      text: `needs ${length} completed session close(s) through ${ds.dates[s]}, ${s + 1} loaded`
    };

  let sum = 0;

  for (let i = s - length + 1; i <= s; i++) {
    const c = ds.sClose[i]!;

    if (!validPrice(c)) return { ok: false, reason: 'invalid_data', text: `the close of ${ds.dates[i]} is not a positive finite price` };
    sum += c;
  }

  return { ok: true, value: sum / length };
};

export interface AtrRecord {
  atr: number;
  sessions: number; // L
  fromSession: number; // the first true-range session (fill session − L)
  toSession: number; // the last (fill session − 1)
  fillSession: number;
}

// ATR_L from the L sessions completed immediately before `fillSession` (see the header).
export const atrBefore = (
  ds: Dataset,
  fillSession: number,
  length: number
): { ok: true; record: AtrRecord } | { ok: false; reason: Availability; text: string } => {
  const from = fillSession - length;
  const fillDate = ds.dates[fillSession] ?? `the session after ${ds.dates.at(-1)}`;

  if (from - 1 < 0)
    return {
      ok: false,
      reason: 'insufficient_history',
      text: `ATR(${length}) needs ${length + 1} completed sessions before the fill session ${fillDate}, ${Math.max(0, fillSession)} loaded`
    };

  let sum = 0;

  for (let i = from; i < fillSession; i++) {
    const high = ds.sHigh[i]!;
    const low = ds.sLow[i]!;
    const previous = ds.sClose[i - 1]!;

    if (!(validPrice(high) && validPrice(low) && validPrice(previous) && high >= low))
      return {
        ok: false,
        reason: 'invalid_data',
        text: `ATR(${length}): the high/low of ${ds.dates[i]} or the close of ${ds.dates[i - 1]} is not a valid price`
      };
    sum += Math.max(high, previous) - Math.min(low, previous);
  }

  return { ok: true, record: { atr: sum / length, sessions: length, fromSession: from, toSession: fillSession - 1, fillSession } };
};

// ----- rule 2: the trend-breakout scan -----

export interface BreakoutSignal {
  session: number;
  time: number; // the session's scheduled close: when the completed daily bar is first knowable
  close: number;
  sma: number; // SMA_L(s)
  smaThen: number; // SMA_L(s − K)
  priorHigh: number; // max H over s−N … s−1
  priorHighSession: number; // the session of that high (the latest on ties)
}

export interface BreakoutScan {
  config: BreakoutEntryConfig;
  signals: BreakoutSignal[];
  evaluated: number; // window sessions with every observation available
  unavailable: { session: number; reason: Availability; text: string }[];
  conditions: { aboveSma: number; smaRising: number; abovePriorHigh: number; all: number };
}

// Every session close of [first, end] (the window) where all three conditions hold. Reads sessions ≤ s only.
export const scanTrendBreakout = (
  ds: Dataset,
  first: number,
  end: number,
  c: BreakoutEntryConfig
): BreakoutScan => {
  const errors = breakoutConfigErrors(c);

  if (errors.length) throw new Error(`invalid trend-breakout entry: ${errors.join('; ')}`);

  const scan: BreakoutScan = {
    config: { ...c },
    signals: [],
    evaluated: 0,
    unavailable: [],
    conditions: { aboveSma: 0, smaRising: 0, abovePriorHigh: 0, all: 0 }
  };
  const need = breakoutWarmupSessions(c);

  for (let s = first; s <= end; s++) {
    if (s - need < 0) {
      scan.unavailable.push({
        session: s,
        reason: 'insufficient_history',
        text: `the breakout needs ${need} completed session(s) before ${ds.dates[s]} (SMA ${c.smaSessions} compared with ${c.slopeComparisonSessions} sessions earlier, high of the ${c.priorHighSessions} preceding sessions), ${s} loaded`
      });
      continue;
    }

    const now = sessionSma(ds, s, c.smaSessions);
    const then = sessionSma(ds, s - c.slopeComparisonSessions, c.smaSessions);
    let priorHigh = -Infinity;
    let priorHighSession = -1;
    let bad = '';

    for (let i = s - c.priorHighSessions; i < s; i++) {
      const h = ds.sHigh[i]!;

      if (!validPrice(h)) {
        bad = `the high of ${ds.dates[i]} is not a positive finite price`;
        break;
      }
      if (h >= priorHigh) {
        priorHigh = h;
        priorHighSession = i;
      }
    }

    if (!now.ok || !then.ok || bad) {
      scan.unavailable.push({ session: s, reason: 'invalid_data', text: bad || (!now.ok ? now.text : (then as { text: string }).text) });
      continue;
    }

    scan.evaluated++;

    const close = ds.sClose[s]!;
    const aboveSma = close > now.value;
    const smaRising = now.value > then.value;
    const abovePriorHigh = close > priorHigh;

    if (aboveSma) scan.conditions.aboveSma++;
    if (smaRising) scan.conditions.smaRising++;
    if (abovePriorHigh) scan.conditions.abovePriorHigh++;

    if (aboveSma && smaRising && abovePriorHigh) {
      scan.conditions.all++;
      scan.signals.push({
        session: s,
        time: ds.sCloseTime[s]!,
        close,
        sma: now.value,
        smaThen: then.value,
        priorHigh,
        priorHighSession
      });
    }
  }

  return scan;
};

// ----- rules 1 and 3: the position controller -----

export type GrowthExitReason = ExitReason | 'initial stop' | 'initial stop gap' | 'trend exit';
export type ExitRule = 'trailing_stop' | 'initial_stop' | 'maximum_hold' | 'buffered_loss' | 'trend_exit';

export interface PositionRulesRuntime {
  initialStop: InitialStopConfig | null;
  retention: RetentionConfig | null;
}

// The decision-time check of the initial risk stop: is ATR available for the fill this decision will get?
export interface ProtectionCheck {
  pass: boolean;
  reason: 'pass' | Availability;
  text: string;
  fillSession: number;
  atr: AtrRecord | null;
  values: Record<string, LogValue>;
}

export interface InitialStopRecord {
  level: number; // fixed for the position
  atr: number;
  atrSessions: number;
  atrMultiple: number;
  atrFromSession: number;
  atrToSession: number;
  fillPrice: number; // the raw fill it is measured from
  activeFrom: number; // the fill instant
  decisionTime: number; // the entry decision it was checked at
}

// The side record of an exit decision this controller produced (why, and how it relates to the others).
export interface ExitInstruction {
  rule: ExitRule;
  partial: boolean;
  phase: 0 | 1; // 0: a minute's (or the session's) opening trade; 1: a level crossed within a minute (assumed fill)
  level: number | null; // the stop level of a stop rule
  decidedAt: number; // when the instruction is first knowable (a stop: its trade; buffer/trend: the decision)
  sameTrade: ExitRule[]; // other rules due at the very same trade (resolved by the precedence)
  values: Record<string, LogValue>;
}

export interface ExitFill {
  n: number; // 1-based within the position
  partial: boolean;
  session: number;
  bar: number;
  time: number;
  rawPrice: number;
  price: number; // after the per-side cost
  execution: ExecutionPrice | '';
  reason: GrowthExitReason;
  rule: ExitRule;
  shares: number;
  principal: number; // repaid by this fill (proportional)
  interest: number; // paid by this fill: its principal × rate × calendar days since the entry session
  proceeds: number;
  grossBeforeCosts: number; // shares × (raw − entry raw)
  entryCost: number; // this fill's share of the entry cost
  exitCost: number; // shares × (raw − price)
  net: number; // proceeds − principal − interest
  sharesAfter: number;
  principalAfter: number;
  instruction: ExitInstruction;
}

export interface ProtectedPosition {
  trade: VirtualTrade;
  stop: InitialStopRecord | null;
  stage: 'full' | 'remainder';
  originalShares: number;
  originalPrincipal: number;
  fills: ExitFill[];
  partialNet: number; // the net of the partial fills so far
  remainderFromSession: number; // -1 in stage full
  count: number; // consecutive completed closes strictly below the SMA (stage remainder)
  run: { session: number; close: number; sma: number }[]; // those closes
  trendDecisions: number;
  pendingTrend: { time: number; session: number; values: Record<string, LogValue> } | null;
  pendingBuffer: { time: number; price: number } | null;
  sessionState: { s: number; maximumHoldDue: boolean; maximumHoldBar: number; active: boolean; stopPrice: number } | null;
  remainder: { shares: number; principal: number; interest: number; mark: number; net: number } | null; // open at the end
  closed: boolean;
}

interface Candidate {
  rule: ExitRule;
  k: number;
  phase: 0 | 1;
  level: number;
  decision: ExitDecision;
}

const RULE_REASON: Record<ExitRule, string> = {
  trailing_stop: 'profit trailing stop',
  initial_stop: 'initial risk stop',
  maximum_hold: 'maximum losing hold',
  buffered_loss: 'buffered intraday loss',
  trend_exit: 'trend-retention exit'
};

// The exit side of one position under the optional rules: the unchanged trailing-stop level (onEntry/afterSession of
// the ExitManager) and the evaluator below in place of ExitManager.evaluate.
class RulesExitManager extends ExitManager {
  constructor(
    ds: Dataset,
    params: StrategyParams,
    settings: { stopFill: 'stop' | 'next-open'; marginInterestRate: number },
    private readonly rules: PositionRules,
    private readonly pos: ProtectedPosition
  ) {
    super(ds, params, settings);
  }

  // The profit trailing stop exists in stage full only (retention consumes it).
  override isStopActive(lot: LotState, s: number) {
    return this.pos.stage === 'full' && super.isStopActive(lot, s);
  }

  override evaluate(lot: LotState, s: number): ExitDecision | undefined {
    return this.rules.evaluateSession(this.pos, this, lot, s, 'session', 0);
  }
}

export class PositionRules {
  readonly positions = new Map<VirtualTrade, ProtectedPosition>();
  readonly checks = new Map<VirtualTrade, ProtectionCheck>(); // the decision-time check of each protected order
  readonly blocked: { time: number; session: number; source: string; check: ProtectionCheck }[] = [];
  private readonly instructions = new WeakMap<ExitDecision, ExitInstruction>();
  private readonly atrCache = new Map<number, ReturnType<typeof atrBefore>>();

  constructor(
    readonly ds: Dataset,
    readonly runtime: PositionRulesRuntime,
    readonly book: ShadowBook,
    readonly exit: StrategyParams,
    readonly settings: BookSettings,
    readonly log: DecisionLog
  ) {
    if (runtime.initialStop) {
      const e = initialStopConfigErrors(runtime.initialStop);

      if (e.length) throw new Error(`invalid initial risk stop: ${e.join('; ')}`);
    }
    if (runtime.retention) {
      const e = retentionConfigErrors(runtime.retention);

      if (e.length) throw new Error(`invalid trend retention: ${e.join('; ')}`);
    }
    if (settings.stopFill !== 'stop') throw new Error('the optional rules assume stops filled at the stop level');
  }

  get initialStop() {
    return this.runtime.initialStop;
  }

  get retention() {
    return this.runtime.retention;
  }

  // ----- entries -----

  // The decision-time check for a decision at `time` in session s (null when the initial risk stop is OFF).
  protection(s: number, time: number): ProtectionCheck | null {
    const c = this.runtime.initialStop;

    if (!c) return null;

    const fillSession = firstTradeAfterDecision(this.ds, s, time) >= 0 ? s : s + 1;
    let atr = this.atrCache.get(fillSession);

    if (!atr) {
      atr = atrBefore(this.ds, fillSession, c.atrSessions);
      this.atrCache.set(fillSession, atr);
    }

    const base: Record<string, LogValue> = {
      atrSessions: c.atrSessions,
      atrMultiple: c.atrMultiple,
      fillSession: this.ds.dates[fillSession] ?? 'past the data'
    };

    if (!atr.ok)
      return {
        pass: false,
        reason: atr.reason,
        text: `${atr.reason}: initial risk stop unavailable — ${atr.text}; the entry is blocked (never entered without the requested protection)`,
        fillSession,
        atr: null,
        values: base
      };

    return {
      pass: true,
      reason: 'pass',
      text: `initial risk stop available: ATR(${c.atrSessions}) ${r6(atr.record.atr)} from ${this.ds.dates[atr.record.fromSession]} … ${this.ds.dates[atr.record.toSession]}`,
      fillSession,
      atr: atr.record,
      values: {
        ...base,
        atr: r6(atr.record.atr),
        atrFrom: this.ds.dates[atr.record.fromSession]!,
        atrTo: this.ds.dates[atr.record.toSession]!,
        stopDistance: r6(c.atrMultiple * atr.record.atr)
      }
    };
  }

  // A decision was refused for want of the stop (recorded for the metrics; the caller records the decision itself).
  noteBlocked(time: number, session: number, source: string, check: ProtectionCheck) {
    this.blocked.push({ time, session, source, check });
  }

  // An order was placed for a decision at (s, time): its protection is fixed now, from completed sessions only.
  attach(trade: VirtualTrade, s: number, time: number) {
    const check = this.protection(s, time);

    if (!check) return;
    if (!check.pass) throw new Error(`order ${trade.id} placed without an available initial risk stop (${check.text})`);
    this.checks.set(trade, check);
  }

  // The order filled at bar k of session s (book.open just ran): the position's rules start here.
  onFill(trade: VirtualTrade, s: number, k: number) {
    const position = this.book.position!;

    if (position.trade !== trade) throw new Error('the filled trade is not the book position');

    const ds = this.ds;
    const c = this.runtime.initialStop;
    let stop: InitialStopRecord | null = null;

    if (c) {
      const check = this.checks.get(trade);

      if (!check?.atr) throw new Error(`trade ${trade.id} filled without its decision-time initial-stop check`);
      if (check.fillSession > s) throw new Error(`trade ${trade.id} filled before the session its ATR was fixed for`);

      const a = check.atr;

      stop = {
        level: trade.entryRawPrice - c.atrMultiple * a.atr,
        atr: a.atr,
        atrSessions: c.atrSessions,
        atrMultiple: c.atrMultiple,
        atrFromSession: a.fromSession,
        atrToSession: a.toSession,
        fillPrice: trade.entryRawPrice,
        activeFrom: trade.entryTime,
        decisionTime: trade.decisionTime
      };
    }

    const pos: ProtectedPosition = {
      trade,
      stop,
      stage: 'full',
      originalShares: position.lot.shares,
      originalPrincipal: position.lot.investment,
      fills: [],
      partialNet: 0,
      remainderFromSession: -1,
      count: 0,
      run: [],
      trendDecisions: 0,
      pendingTrend: null,
      pendingBuffer: null,
      sessionState: null,
      remainder: null,
      closed: false
    };
    const mgr = new RulesExitManager(
      ds,
      this.exit,
      { stopFill: this.settings.stopFill, marginInterestRate: this.settings.rate },
      this,
      pos
    );

    // The same entry-session state as the book's own ExitManager (the trailing-stop level from the fill on).
    mgr.onEntry(position.lot, s, k, trade.entryRawPrice);
    position.exit = mgr;
    this.positions.set(trade, pos);

    if (stop) {
      this.log.add({
        t: trade.entryTime,
        session: s,
        event: 'initial_stop_set',
        origin: null,
        method: null,
        episode: null,
        trade,
        disposition: null,
        reason: `stop = fill ${trade.entryRawPrice} − ${c!.atrMultiple} × ATR(${c!.atrSessions}) ${r6(stop.atr)}; active from the fill, fixed for the position`,
        values: {
          level: stop.level,
          fill: trade.entryRawPrice,
          atr: stop.atr,
          atrSessions: stop.atrSessions,
          atrMultiple: stop.atrMultiple,
          atrFrom: ds.dates[stop.atrFromSession]!,
          atrTo: ds.dates[stop.atrToSession]!,
          decision: new Date(trade.decisionTime * 1000).toISOString()
        }
      });
      // Active from the fill: the rest of the entry session (the profit trailing stop, the maximum hold and the
      // buffer keep their rule: they first apply to a position open at a session's start).
      position.decision = this.evaluateSession(pos, mgr, position.lot, s, 'entry', k);
    }
  }

  instructionOf(decision: ExitDecision): ExitInstruction | undefined {
    return this.instructions.get(decision);
  }

  positionOf(trade: VirtualTrade) {
    return this.positions.get(trade);
  }

  // ----- the evaluator -----

  // The exit, if any, of the position from bar `from` of session s. `mode`: 'session' = a position open at the
  // session's start (the ExitManager.evaluate call); 'entry' = the rest of the entry session after the fill at bar
  // `from`; 'after_partial' = the remainder after a partial sale at bar `from` of this session.
  evaluateSession(
    pos: ProtectedPosition,
    mgr: ExitManager,
    lot: LotState,
    s: number,
    mode: 'session' | 'entry' | 'after_partial',
    from: number
  ): ExitDecision | undefined {
    const ds = this.ds;
    const p = this.exit;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const interest = interestOn(lot, this.settings.rate, ds.sTime[s]!);
    const profitAt = (price: number) => lot.shares * price - lot.investment - interest;
    const daysHeld = (ds.sTime[s]! - lot.holdTimestamp) / secondsPerDay;
    const P0 = pos.stop?.level ?? NaN;
    const hasStop = pos.stop !== null;
    const partialPending = this.runtime.retention !== null && pos.stage === 'full';

    // The session-start state (the trailing stop's activation, the maximum hold due at the open): once per session.
    if (mode === 'session') {
      const active = mgr.isStopActive(lot, s);

      if (active) {
        if (mgr.stopFirstActiveIndex < 0) mgr.stopFirstActiveIndex = s;
        mgr.stopActiveSessions++;
      }

      const due = daysHeld >= p.maximumHoldDays && profitAt(ds.sOpen[s]!) < 0;

      pos.sessionState = {
        s,
        maximumHoldDue: due,
        maximumHoldBar: due ? firstTradeFrom(ds, s, ds.bTime[start]! + secondsPerMinute) : -1,
        active,
        stopPrice: mgr.stopPrice
      };
    } else if (mode === 'entry') pos.sessionState = { s, maximumHoldDue: false, maximumHoldBar: -1, active: false, stopPrice: mgr.stopPrice };

    const st = pos.sessionState!;

    if (st.s !== s) throw new Error('evaluator state of another session');

    const cands: Candidate[] = [];
    const add = (
      rule: ExitRule,
      reason: GrowthExitReason,
      k: number,
      execution: ExecutionPrice,
      price: number,
      phase: 0 | 1,
      level = NaN,
      signal: { time: number; price: number } | null = null
    ) =>
      cands.push({
        rule,
        k,
        phase,
        level,
        decision: {
          reason: reason as ExitReason,
          barIndex: k,
          price,
          time: timeAt(ds, s, k),
          execution,
          isMaximumHoldDue: st.maximumHoldDue,
          signalTime: signal?.time ?? NaN,
          signalPrice: signal?.price ?? NaN,
          stopPrice: st.stopPrice,
          stopActive: st.active
        }
      });

    if (mode === 'session') {
      const open = ds.sOpen[s]!;

      // At the open: a resting stop gapped through takes the opening trade.
      if (st.active && open <= st.stopPrice) add('trailing_stop', 'trailing stop gap', 0, 'opening trade', open, 0, st.stopPrice);
      if (hasStop && open <= P0) add('initial_stop', 'initial stop gap', 0, 'opening trade', open, 0, P0);

      // A buffered sale left pending by an earlier session fills at this session's opening trade (lost without a
      // trade this session, exactly as the ExitManager).
      const pending = pos.pendingBuffer;

      pos.pendingBuffer = null;
      if (pending) {
        const k = firstTradeAfterDecision(ds, s, pending.time);

        if (k >= 0) add('buffered_loss', 'buffered intraday loss', k, 'opening trade', priceAt(ds, s, k), 0, NaN, pending);
      }

      // A trend exit decided at an earlier close fills at the next eligible trade.
      if (pos.pendingTrend) {
        const k = firstTradeAfterDecision(ds, s, pos.pendingTrend.time);

        if (k >= 0) add('trend_exit', 'trend exit', k, 'opening trade', priceAt(ds, s, k), 0);
      }

      // Just after the open: the maximum hold sells at the next observed trade.
      if (st.maximumHoldDue && st.maximumHoldBar >= 0)
        add('maximum_hold', 'maximum hold', st.maximumHoldBar, tradeExecution(ds, s, st.maximumHoldBar), priceAt(ds, s, st.maximumHoldBar), 0);

      // During the session: the first minute that reaches the active trailing stop (not when the hold is due: the
      // stop cannot be active then without a gap, as in the ExitManager).
      if (st.active && !st.maximumHoldDue)
        for (let k = 0; k < count; k++) {
          if (ds.bOpen[start + k]! <= st.stopPrice) {
            add('trailing_stop', 'trailing stop', k, 'minute open through stop', ds.bOpen[start + k]!, 0, st.stopPrice);
            break;
          }
          if (ds.bLow[start + k]! <= st.stopPrice) {
            add('trailing_stop', 'trailing stop', k, 'stop level', st.stopPrice, 1, st.stopPrice);
            break;
          }
        }
    } else if (mode === 'after_partial' && st.maximumHoldDue && st.maximumHoldBar > from)
      // The hold was due at this session's open: the remainder is sold at its trade.
      add('maximum_hold', 'maximum hold', st.maximumHoldBar, tradeExecution(ds, s, st.maximumHoldBar), priceAt(ds, s, st.maximumHoldBar), 0);

    // The initial risk stop: active from the fill, at a fixed level. On the entry session and after a partial sale
    // the minute `from` opened at (or before) the trade that started this evaluation: only its later prices count.
    if (hasStop)
      for (let k = from; k < count; k++) {
        if (!(mode !== 'session' && k === from) && ds.bOpen[start + k]! <= P0) {
          add('initial_stop', 'initial stop', k, 'minute open through stop', ds.bOpen[start + k]!, 0, P0);
          break;
        }
        if (ds.bLow[start + k]! <= P0) {
          add('initial_stop', 'initial stop', k, 'stop level', P0, 1, P0);
          break;
        }
      }

    // The buffered loss from the maximum-hold age on: the first completed minute whose close reaches it (minutes
    // completed after the trade that started this evaluation).
    let carry: { time: number; price: number } | null = null;

    if (mode !== 'entry' && !st.maximumHoldDue && daysHeld >= p.maximumHoldDays) {
      const threshold = -lot.investment * p.intradayLossBuffer;

      for (let j = mode === 'session' ? 0 : from; j < count; j++)
        if (profitAt(ds.bClose[start + j]!) <= threshold) {
          const decisionTime = ds.bTime[start + j]! + secondsPerMinute;
          const k = firstTradeAfterDecision(ds, s, decisionTime);
          const signal = { time: decisionTime, price: ds.bClose[start + j]! };

          if (k < 0) carry = signal;
          else add('buffered_loss', 'buffered intraday loss', k, tradeExecution(ds, s, k), priceAt(ds, s, k), 0, NaN, signal);
          break;
        }
    }

    const rank: Record<ExitRule, number> = partialPending
      ? { initial_stop: 0, maximum_hold: 1, buffered_loss: 2, trailing_stop: 3, trend_exit: 4 }
      : { trailing_stop: 0, initial_stop: 1, maximum_hold: 2, buffered_loss: 3, trend_exit: 4 };

    cands.sort(
      (a, b) =>
        a.k - b.k ||
        a.phase - b.phase ||
        (a.phase === 1 ? b.level - a.level : rank[a.rule] - rank[b.rule])
    );

    const w = cands[0];

    if (!w) {
      if (carry) pos.pendingBuffer = carry;
      return undefined;
    }

    const sameTrade = cands.filter((c) => c !== w && c.k === w.k && c.phase === 0 && w.phase === 0).map((c) => c.rule);
    const partial = w.rule === 'trailing_stop' && partialPending;
    const values: Record<string, LogValue> = {
      rule: w.rule,
      ...(Number.isFinite(w.level) ? { level: w.level } : {}),
      ...(hasStop ? { initialStop: P0 } : {}),
      trailingStop: st.stopPrice,
      trailingStopActive: st.active,
      ...(sameTrade.length ? { sameTrade: sameTrade.join(',') } : {}),
      ...(partial ? { sellPercent: this.runtime.retention!.sellPercent } : {}),
      ...(w.rule === 'trend_exit' && pos.pendingTrend ? pos.pendingTrend.values : {})
    };

    this.instructions.set(w.decision, {
      rule: w.rule,
      partial,
      phase: w.phase,
      level: Number.isFinite(w.level) ? w.level : null,
      decidedAt:
        w.rule === 'buffered_loss'
          ? w.decision.signalTime
          : w.rule === 'trend_exit'
            ? pos.pendingTrend!.time
            : w.rule === 'maximum_hold'
              ? ds.bTime[start]!
              : w.decision.time,
      sameTrade,
      values
    });

    return w.decision;
  }

  // ----- fills -----

  // The partial sale of retention at the first profit trailing-stop event (stage full → remainder).
  partialSale(s: number, decision: ExitDecision): ExitFill {
    const position = this.book.position!;
    const pos = this.positions.get(position.trade)!;
    const ins = this.instructions.get(decision)!;

    if (!ins.partial || pos.stage !== 'full') throw new Error('a partial sale outside stage full');

    const lot = position.lot;
    const trade = position.trade;
    const f = fractionOf(this.runtime.retention!.sellPercent);
    const shares = lot.shares * f;
    const principal = lot.investment * f;
    const price = this.book.sellPrice(decision.price) * (1 - this.settings.stopSlippageBps / 10000);
    const interest = principal * this.settings.rate * ((this.ds.sTime[s]! - lot.entryTimestamp) / secondsPerYear);
    const proceeds = shares * price;
    const fill: ExitFill = {
      n: pos.fills.length + 1,
      partial: true,
      session: s,
      bar: decision.barIndex,
      time: decision.time,
      rawPrice: decision.price,
      price,
      execution: decision.execution,
      reason: decision.reason,
      rule: ins.rule,
      shares,
      principal,
      interest,
      proceeds,
      grossBeforeCosts: shares * (decision.price - trade.entryRawPrice),
      entryCost: shares * (trade.entryPrice - trade.entryRawPrice),
      exitCost: shares * (decision.price - price),
      net: proceeds - principal - interest,
      sharesAfter: lot.shares - shares,
      principalAfter: lot.investment - principal,
      instruction: ins
    };

    lot.shares = fill.sharesAfter;
    lot.investment = fill.principalAfter;
    pos.fills.push(fill);
    pos.partialNet += fill.net;
    pos.stage = 'remainder';
    pos.remainderFromSession = s;
    pos.count = 0;
    pos.run = [];

    this.log.add({
      t: decision.time,
      session: s,
      event: 'partial_exit',
      origin: null,
      method: null,
      episode: null,
      trade,
      disposition: null,
      reason: `${decision.reason}: first profit trailing-stop event — sold ${this.runtime.retention!.sellPercent}% of the shares, the remainder is kept (the trailing stop is consumed; the trend-retention exit applies)`,
      values: {
        fill: decision.execution,
        price: decision.price,
        priceAfterCost: price,
        shares,
        sharesAfter: fill.sharesAfter,
        principalRepaid: principal,
        principalAfter: fill.principalAfter,
        interest: Math.round(interest * 100) / 100,
        net: Math.round(fill.net * 100) / 100,
        ...ins.values
      }
    });

    // The remainder, from this very trade on.
    position.decision = this.evaluateSession(pos, position.exit, lot, s, 'after_partial', decision.barIndex);

    return fill;
  }

  // book.close() just closed the position with `decision`: the final fill and the logical position's totals.
  // `snapshot` restores the D1 continuation machine when the book judged a remainder alone (classic_d1).
  finalize(trade: VirtualTrade, s: number, decision: ExitDecision, sharesSold: number, principalRepaid: number): ExitFill {
    const pos = this.positions.get(trade)!;
    const ins =
      this.instructions.get(decision) ??
      ({ rule: 'trailing_stop', partial: false, phase: 0, level: null, decidedAt: decision.time, sameTrade: [], values: {} } as ExitInstruction);

    if (ins.partial) throw new Error('a partial instruction closed the position');

    const proceeds = sharesSold * trade.exitPrice;
    const fill: ExitFill = {
      n: pos.fills.length + 1,
      partial: false,
      session: s,
      bar: decision.barIndex,
      time: decision.time,
      rawPrice: decision.price,
      price: trade.exitPrice,
      execution: decision.execution,
      reason: decision.reason,
      rule: ins.rule,
      shares: sharesSold,
      principal: principalRepaid,
      interest: trade.interest,
      proceeds,
      grossBeforeCosts: sharesSold * (decision.price - trade.entryRawPrice),
      entryCost: sharesSold * (trade.entryPrice - trade.entryRawPrice),
      exitCost: sharesSold * (decision.price - trade.exitPrice),
      net: trade.net,
      sharesAfter: 0,
      principalAfter: 0,
      instruction: ins
    };

    pos.fills.push(fill);
    pos.closed = true;
    pos.pendingTrend = null;

    if (pos.fills.length > 1) {
      trade.interest = pos.fills.reduce((a, x) => a + x.interest, 0);
      trade.gross = pos.fills.reduce((a, x) => a + x.proceeds, 0) - pos.originalPrincipal;
      trade.net = pos.fills.reduce((a, x) => a + x.net, 0);
    }

    return fill;
  }

  // After the session's bars (book.afterSession ran): the trend-retention count at the completed close.
  afterSession(s: number) {
    const position = this.book.position;
    const pos = position ? this.positions.get(position.trade) : undefined;
    const c = this.runtime.retention;

    if (!pos || !c || pos.stage !== 'remainder' || pos.pendingTrend) return;

    const ds = this.ds;
    const close = ds.sClose[s]!;
    const sma = sessionSma(ds, s, c.smaSessions);
    const entry = (event: 'trend_count' | 'trend_exit_decision', reason: string, values: Record<string, LogValue>) =>
      this.log.add({
        t: ds.sCloseTime[s]!,
        session: s,
        event,
        origin: null,
        method: null,
        episode: null,
        trade: pos.trade,
        disposition: null,
        reason,
        values
      });

    if (!sma.ok) {
      if (pos.count > 0 || pos.run.length === 0)
        entry('trend_count', `${sma.reason}: SMA(${c.smaSessions}) unavailable at this close — ${sma.text}; the count is reset`, {
          close,
          count: 0
        });
      pos.count = 0;
      pos.run = [];
      return;
    }

    if (close < sma.value) {
      pos.count++;
      pos.run.push({ session: s, close, sma: sma.value });
      entry('trend_count', `close ${close} < SMA(${c.smaSessions}) ${r6(sma.value)}: ${pos.count} of ${c.closesBelow} consecutive`, {
        close,
        sma: sma.value,
        count: pos.count,
        needed: c.closesBelow
      });
    } else {
      if (pos.count > 0)
        entry('trend_count', `close ${close} ≥ SMA(${c.smaSessions}) ${r6(sma.value)}: the count of ${pos.count} is reset`, {
          close,
          sma: sma.value,
          count: 0,
          needed: c.closesBelow
        });
      pos.count = 0;
      pos.run = [];
    }

    if (pos.count >= c.closesBelow) {
      const values: Record<string, LogValue> = {
        smaSessions: c.smaSessions,
        closesBelow: c.closesBelow,
        decisionClose: close,
        decisionSma: sma.value,
        closesBelowFrom: ds.dates[pos.run[0]!.session]!,
        closesBelowTo: ds.dates[s]!
      };

      pos.pendingTrend = { time: ds.sCloseTime[s]!, session: s, values };
      pos.trendDecisions++;
      entry(
        'trend_exit_decision',
        `${c.closesBelow} consecutive completed close(s) strictly below SMA(${c.smaSessions}) (${ds.dates[pos.run[0]!.session]} … ${ds.dates[s]}): the remainder is sold at the next eligible trade`,
        values
      );
      pos.count = 0;
      pos.run = [];
    }
  }

  // The end of the data (book.finish ran): an open position's totals include its partial fills.
  finish(endSession: number) {
    const position = this.book.position;

    if (!position) return;

    const pos = this.positions.get(position.trade);

    if (!pos) return;

    const trade = position.trade;

    pos.remainder = {
      shares: position.lot.shares,
      principal: position.lot.investment,
      interest: trade.interest,
      mark: this.ds.sClose[endSession]!,
      net: trade.net
    };

    if (pos.fills.length > 0) {
      trade.interest += pos.fills.reduce((a, x) => a + x.interest, 0);
      trade.gross =
        pos.fills.reduce((a, x) => a + x.proceeds, 0) + position.lot.shares * pos.remainder.mark - pos.originalPrincipal;
      trade.net = pos.partialNet + pos.remainder.net;
    }
  }

  // The partial nets of the position still open (realized cash that belongs to an open logical position).
  openPartialNet() {
    const position = this.book.position;
    const pos = position ? this.positions.get(position.trade) : undefined;

    return pos ? pos.partialNet : 0;
  }
}

export const describeRule = (rule: ExitRule) => RULE_REASON[rule];
