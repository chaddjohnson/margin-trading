// rise-from-recent-low-trading v1.4.0 ("Growth"): a growth-following trading backtest of ONE symbol (see README.md).
//
// v1.4.0 adds the OPTIONAL Drawdown Recovery Gate (drawdownGate.ts), OFF by default: a filter on every Growth-owned
// entry decision, never an entry signal. Maintained on completed one-minute observations independently of the signal
// resolution, it blocks entries while a significant chronological peak-to-trough dip is unresolved, until the price has
// recovered the configured share of the whole decline and held it for Y trading-session intervals (or regained the
// peak). Its observations are interleaved with the decisions in time order (baseUntil), so a decision reads only
// observations known at its instant; a release of the gate may decide an already-armed opportunity intraday (fill at
// the next eligible trade). With it OFF none of its code runs: every decision, fill, exit, mark and log entry is the
// v1.3.0 one (tests/offParity-1.3.0.test.ts), so v1.3.0 runs replay as v1.4.0 with the gate OFF.
//
// v1.3.0 adds three OPTIONAL, independently switchable rules (optionalRules.ts), all OFF by default: an INITIAL RISK
// STOP (fill − m × ATR, active from the fill), an alternative TREND-BREAKOUT base entry (an entry-method selector; the
// Rise entry stays the default) and TREND RETENTION (a partial sale at the first profit trailing-stop event, the
// remainder exited on consecutive closes below an SMA). With all three OFF none of their code runs: every decision,
// fill, exit, mark and log entry is identical to v1.2.0 (tests/offParity-1.2.0.test.ts, against the fixture captured
// from v1.2.0 before the change), so v1.2.0 runs replay as v1.3.0 with the three OFF. The engine validation no longer
// checks a value whose switch is OFF (the maximum-hold age, the buffer switch and percent): requests that carry only
// the effective values (Interactive Preview) are valid.
//
// v1.2.0 adds two OPTIONAL entry gates (entryGates.ts), both OFF by default: an entry TREND FILTER (five methods, on
// trading-session observations) applied to every Growth entry decision, and PERSISTENT ENTRY ELIGIBILITY (five bounded
// policies) that keeps a raw crossing available for a limited number of sessions. With both OFF no gate code runs and
// every decision, fill, exit, mark and log entry is identical to v1.1.0 (tests/offParity-1.1.0.test.ts, against the
// fixture captured from v1.1.0 before the change), so v1.1.0 runs replay as v1.2.0 with both gates OFF.
//
// v1.1.0 adds OPTIONAL continuation entries after a net-profitable exit (continuation.ts), OFF by default; with them
// OFF every decision, fill, exit and mark is identical to v1.0.0 (tests/offParity.test.ts against the fixtures captured
// from v1.0.0 before the change), so v1.0.0 runs replay as v1.1.0 with continuation OFF. It also records a
// chronological decision log (base signals, exits, fills, continuation state transitions).
//
// Entry: the unchanged Rise-from-Recent-Low scanner (src/entry-signals/riseFromRecentLow.ts) is the ONLY entry. Each of
// its signals is one entry DECISION at the signal bar's end (when its close is first knowable). A decision is taken
// when the strategy is flat with no order pending; otherwise it is rejected and discarded (a signal is an event, not a
// state: it is never replayed later). The scanner is edge-triggered (a bar at or above X% over the rolling low after a
// bar below it), so a condition that stays true signals once and re-arming needs a bar below the threshold first:
// no extra cooldown, lower-price test, loss restriction or reset exists here.
//
// Execution: the unchanged Study 8 per-symbol D1 book, ShadowBook (src/multi-etf-allocator/shadow.ts), driven through
// its commit() by these decisions. Its D1 entry machine (deep-dip trailing buy, post-exit continuation) is never asked
// for a signal (processBar is never called), and postExit is off. Everything after the decision is the book's own:
// - the fill: the first trade after the decision (the next minute's open; the closing print only for a decision made
//   before the close; otherwise the next session's opening trade), cost-adjusted per side;
// - the exits: its ExitManager (src/shared-margin-portfolio/strategy.ts) — the trailing stop that is active only while
//   filling at the stop would be profitable after interest, the maximum losing hold decided at the opening trade, and
//   the buffered intraday loss from the maximum-hold age on, with its overnight carry; exits are evaluated only for a
//   position open at a session's start, so a position never exits on its entry session;
// - interest (simple, per calendar day between session dates) and the net of each trade.
// A rule switched OFF is passed to the unchanged ExitManager as an infinite threshold, so its condition is never met:
// maximum hold OFF → maximumHoldDays = ∞ (no hold exit, and the buffer, which applies only from that age, cannot
// apply); buffer OFF → intradayLossBuffer = ∞ (no net loss reaches −∞).
//
// Chronology inside a session (as in the Study 8 N-book engine): at each minute bar start T, decisions known at or
// before T (which completed earlier) are evaluated first, then the exit scheduled at T, then the fill scheduled at T,
// then the mark at that minute's close; at the close the same with the closing print. A decision is therefore judged
// against the state before any trade at the same instant. A fresh signal after an exit may re-enter in the same
// session: the new position first exits next session, like any entry (D1's "no entry on a session that started
// invested" belongs to its entry machine, which is not used).
//
// Marks: realized net + the open position marked at each minute's close and at the session close, net of interest
// accrued to the session's date (exit cost not yet charged), into the frozen Tracker (strict new peaks), per minute and
// per session — the conventions of the N-book engine's fixed mode.
import type { MarketSession } from '#types';
import { type SignalBar, type SignalResolution, barsFromSessions, isSignalResolution } from '../entry-signals/bars.ts';
import {
  type RiseFromRecentLowParams,
  type RiseScan,
  type RiseSignal,
  scanRiseFromRecentLow
} from '../entry-signals/riseFromRecentLow.ts';
import { type Dataset, fixtureDataset } from '../four-family/data.ts';
import type { PhenotypeName, Sym } from '../multi-etf-allocator/context.ts';
import { type DrawdownStats, Tracker } from '../multi-etf-allocator/engine.ts';
import { FixedLedger } from '../multi-etf-allocator/ledger.ts';
import { type BookSettings, type VirtualTrade, ShadowBook } from '../multi-etf-allocator/shadow.ts';
import {
  CONTINUATION_METHODS,
  type ContinuationConfig,
  ContinuationController,
  type ContinuationMethod,
  type ContinuationRuntime,
  DecisionLog,
  type LogValue,
  type Origin,
  continuationConfigErrors,
  continuationWarmupBars
} from './continuation.ts';
import {
  type EligibilityConfig,
  EntryGates,
  type GateResult,
  type GateRuntime,
  type GatedDecision,
  type TrendFilterConfig,
  eligibilityConfigErrors,
  trendConfigErrors,
  trendWarmupSessions
} from './entryGates.ts';
import {
  type DrawdownGateConfig,
  DrawdownRecoveryGate,
  drawdownGateConfigErrors,
  drawdownGateWarmupSessions
} from './drawdownGate.ts';
import {
  type BreakoutEntryConfig,
  type BreakoutScan,
  type BreakoutSignal,
  ENTRY_METHODS,
  type EntryMethod,
  type ExitFill,
  type InitialStopConfig,
  PositionRules,
  type PositionRulesRuntime,
  type ProtectionCheck,
  type RetentionConfig,
  breakoutConfigErrors,
  breakoutWarmupSessions,
  initialStopConfigErrors,
  initialStopWarmupSessions,
  retentionConfigErrors,
  retentionWarmupSessions,
  scanTrendBreakout
} from './optionalRules.ts';
import {
  type ExitReason,
  type ReboundSignal,
  type Setup,
  type SetupKind,
  type StrategyParams,
  secondsPerDay,
  strategies
} from '../shared-margin-portfolio/strategy.ts';

export const STRATEGY_KEY = 'rise-from-recent-low-trading';
export const STRATEGY_VERSION = '1.4.0';
// Earlier versions this engine replays (each with the Drawdown Recovery Gate OFF): 1.0.0 = with continuation, both
// entry gates and the three optional rules OFF (no continuation fields); 1.1.0 = with both entry gates and the optional
// rules OFF (its continuation settings unchanged); 1.2.0 = with the three optional rules OFF (its gates and
// continuation unchanged); 1.3.0 = its own settings unchanged.
export const LEGACY_STRATEGY_VERSIONS = ['1.0.0', '1.1.0', '1.2.0', '1.3.0'] as const;

export interface RiseTradingParams {
  advanceFromRecentLowPercent: number; // X, percent (the Rise entry; not read by the breakout entry)
  recentLowLookbackBars: number; // N, bars of `resolution` (the Rise entry; not read by the breakout entry)
  resolution: SignalResolution;
  trailingStopPercent: number; // mandatory: the stop sits this far below the post-entry high
  maximumHoldEnabled: boolean;
  maximumHoldDays: number; // calendar days between session dates (read only with the maximum hold ON)
  intradayLossBufferEnabled: boolean; // only together with the maximum hold
  intradayLossBufferPercent: number; // net loss after interest, percent of the invested notional (buffer ON only)
  costBpsPerSide: number; // basis points on every fill
  continuation?: ContinuationConfig | null; // absent or null = OFF (v1.0.0 behaviour)
  trendFilter?: TrendFilterConfig | null; // absent or null = OFF (v1.1.0 behaviour)
  eligibility?: EligibilityConfig | null; // absent or null = OFF (v1.1.0 behaviour); the Rise entry only
  // v1.3.0 (absent = the v1.2.0 behaviour): the base entry method, its breakout inputs, and the two exit options.
  entryMethod?: EntryMethod; // absent = 'rise_from_recent_low'
  breakout?: BreakoutEntryConfig | null; // required with entryMethod 'trend_breakout', absent otherwise
  initialStop?: InitialStopConfig | null; // absent or null = OFF
  retention?: RetentionConfig | null; // absent or null = OFF
  drawdownGate?: DrawdownGateConfig | null; // v1.4.0: the Drawdown Recovery Gate; absent or null = OFF
}

export const entryMethodOf = (p: Pick<RiseTradingParams, 'entryMethod'>): EntryMethod =>
  p.entryMethod ?? 'rise_from_recent_low';

// The research defaults: X and N of rise-from-recent-low@1.0.0, the exits of the registered VGT D1 baseline
// (config/phenotypes/D1/VGT.json `primary` = the constants of src/app/allIn-trailingBuy-postExitContinuation.ts), and
// the Study 8 / pools cost. Illustrative, not optimised for this strategy.
export const defaultTradingParams: Readonly<RiseTradingParams> = {
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 20,
  resolution: '1d',
  trailingStopPercent: 7.3,
  maximumHoldEnabled: true,
  maximumHoldDays: 8,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2.9,
  costBpsPerSide: 5
};

// Fixed execution settings: the project's $100,000 fixed notional per trade (never compounded), 11% simple annual
// margin interest on a 365-day year, stops filled at the stop price (or the gapped opening trade), no extra slippage,
// no commission.
export const EXECUTION = {
  notional: 100_000,
  annualRate: 0.11,
  stopFill: 'stop' as const,
  stopSlippageBps: 0
};

// Only values that apply are checked: the maximum-hold age only with the hold ON, the buffer switch only with the hold
// ON (absent = OFF), the buffer percent only with the buffer ON, X and N only with the Rise entry. A switched-off value
// is never read by the engine (exitParamsOf), so a request carrying only the effective values is valid.
export const tradingParamErrors = (p: RiseTradingParams): string[] => {
  const errors: string[] = [];
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const method = entryMethodOf(p);
  const hold = p.maximumHoldEnabled === true;

  if (!(ENTRY_METHODS as readonly string[]).includes(method))
    errors.push(`entryMethod ${String(method)} is not supported`);
  if (method === 'rise_from_recent_low') {
    if (
      !finite(p.advanceFromRecentLowPercent) ||
      p.advanceFromRecentLowPercent <= 0 ||
      p.advanceFromRecentLowPercent > 100
    )
      errors.push('advanceFromRecentLowPercent must be in (0, 100]');
    if (!Number.isInteger(p.recentLowLookbackBars) || p.recentLowLookbackBars < 2)
      errors.push('recentLowLookbackBars must be an integer ≥ 2');
    if (p.breakout) errors.push('breakout: inputs given, but the entry method is the Rise entry');
  } else if (method === 'trend_breakout') {
    if (!p.breakout) errors.push('breakout: the trend-breakout entry needs its inputs');
    else errors.push(...breakoutConfigErrors(p.breakout).map((e) => `breakout: ${e}`));
    if (p.eligibility)
      errors.push(
        'eligibility: persistent entry eligibility applies only to the Rise entry method (not applicable to the breakout)'
      );
  }
  if (!isSignalResolution(p.resolution)) errors.push(`resolution ${String(p.resolution)} is not supported`);
  if (!finite(p.trailingStopPercent) || p.trailingStopPercent <= 0 || p.trailingStopPercent >= 100)
    errors.push('trailingStopPercent must be in (0, 100)');
  if (typeof p.maximumHoldEnabled !== 'boolean') errors.push('maximumHoldEnabled must be true or false');
  if (hold && (!Number.isInteger(p.maximumHoldDays) || p.maximumHoldDays < 1))
    errors.push('maximumHoldDays must be an integer ≥ 1');
  // the buffer switch applies only with the hold ON; with the hold OFF it may be absent (OFF)
  if ((hold || p.intradayLossBufferEnabled !== undefined) && typeof p.intradayLossBufferEnabled !== 'boolean')
    errors.push('intradayLossBufferEnabled must be true or false');
  if (
    hold &&
    p.intradayLossBufferEnabled === true &&
    (!finite(p.intradayLossBufferPercent) || p.intradayLossBufferPercent < 0 || p.intradayLossBufferPercent >= 100)
  )
    errors.push('intradayLossBufferPercent must be in [0, 100)');
  if (p.intradayLossBufferEnabled === true && p.maximumHoldEnabled === false)
    errors.push(
      'the buffered intraday-loss exit applies only from the maximum losing-hold age: switch it off, or switch the maximum losing hold on'
    );
  if (!finite(p.costBpsPerSide) || p.costBpsPerSide < 0 || p.costBpsPerSide >= 1000)
    errors.push('costBpsPerSide must be in [0, 1000)');
  if (p.continuation) errors.push(...continuationConfigErrors(p.continuation).map((e) => `continuation: ${e}`));
  if (p.trendFilter) errors.push(...trendConfigErrors(p.trendFilter).map((e) => `trend filter: ${e}`));
  if (p.eligibility) errors.push(...eligibilityConfigErrors(p.eligibility).map((e) => `eligibility: ${e}`));
  if (p.initialStop) errors.push(...initialStopConfigErrors(p.initialStop).map((e) => `initial stop: ${e}`));
  if (p.retention) errors.push(...retentionConfigErrors(p.retention).map((e) => `retention: ${e}`));
  if (p.drawdownGate)
    errors.push(...drawdownGateConfigErrors(p.drawdownGate).map((e) => `drawdown recovery gate: ${e}`));

  return errors;
};

export const assertTradingParams = (p: RiseTradingParams) => {
  const errors = tradingParamErrors(p);

  if (errors.length) throw new Error(`Invalid ${STRATEGY_KEY} parameters: ${errors.join('; ')}`);
};

// A percentage as the fraction a strategy file would ship: the double nearest to the decimal (2.9 → 0.029, as the
// registry's tenths / 1000), not 2.9 / 100 = 0.028999999999999998.
export const percentToFraction = (percent: number) => {
  const fraction = Number(`${percent}e-2`);

  return Number.isFinite(fraction) ? fraction : percent / 100;
};

// The effective exit configuration as the unchanged ExitManager reads it. Only its exit fields are used (ExitManager
// reads stopPolicy, trailingStopPercentage, maximumHoldDays and intradayLossBuffer); the D1 entry fields are
// neutralised. With the classic_d1 continuation the D1 machine's post-exit continuation fields are set (P, Y, W) while
// its deep-dip arming stays disabled (a NaN target never compares true).
export const exitParamsOf = (p: RiseTradingParams): StrategyParams => {
  assertTradingParams(p);

  const hold = p.maximumHoldEnabled;
  const c = p.continuation;

  if (c?.method === 'classic_d1')
    return {
      ...exitParamsOf({ ...p, continuation: null }),
      label: `${STRATEGY_KEY} exits (D1 ExitManager) + D1 post-exit continuation (classic_d1)`,
      postExit: true,
      trailingBuyPercentage: percentToFraction(c.reboundPercent),
      pullback: percentToFraction(c.pullbackPercent),
      continuationWindow: c.windowSessions
    };

  return {
    ...strategies.d1,
    label: `${STRATEGY_KEY} exits (D1 ExitManager, net-profit stop policy)`,
    postExit: false,
    stopPolicy: 'net',
    targetPercentChange: NaN,
    tickWindowSize: 1,
    trailingBuyPercentage: NaN,
    pullback: NaN,
    continuationWindow: NaN,
    trailingStopPercentage: percentToFraction(p.trailingStopPercent),
    maximumHoldDays: hold ? p.maximumHoldDays : Infinity,
    intradayLossBuffer: hold && p.intradayLossBufferEnabled ? percentToFraction(p.intradayLossBufferPercent) : Infinity
  };
};

export const bookSettingsOf = (p: RiseTradingParams): BookSettings => ({
  notional: EXECUTION.notional,
  rate: EXECUTION.annualRate,
  stopFill: EXECUTION.stopFill,
  costBps: p.costBpsPerSide,
  stopSlippageBps: EXECUTION.stopSlippageBps
});

// Sessions of history the scanner needs before the window: exactly the signal-only runner's formula
// (apps/strategy-lab/runner/entry-signal-run.ts), so both see the same bars and the same raw signals.
export const warmupSessionsFor = (resolution: SignalResolution, n: number) => {
  const minutes = resolution === '1d' ? 390 : Number(resolution.slice(0, -1));
  const barsPerSession = Math.ceil(390 / minutes);

  return resolution === '1d' ? n + 1 : Math.ceil((n + 1) / barsPerSession) + 1;
};

// The warm-up of a whole configuration: the scanner's, extended when a bar-based continuation method needs more
// completed bars for its moving averages, and when the trend filter reads older sessions (its lookback in sessions).
// With continuation and the trend filter OFF it is exactly the scanner's (v1.0.0); persistent eligibility reads the
// scanner's own bars and needs nothing more.
// v1.3.0: the breakout entry replaces the scanner's warm-up by its own (its SMA comparison and prior-high window);
// the initial risk stop needs ATR + 1 sessions before a fill, retention its SMA. With the three OFF: v1.2.0 exactly.
// v1.4.0: the Drawdown Recovery Gate needs its N-session discovery window (OFF: nothing more).
export const warmupSessionsForParams = (p: RiseTradingParams) =>
  Math.max(
    entryMethodOf(p) === 'trend_breakout'
      ? breakoutWarmupSessions(p.breakout)
      : warmupSessionsFor(p.resolution, p.recentLowLookbackBars),
    p.continuation ? warmupSessionsFor(p.resolution, continuationWarmupBars(p.continuation)) : 0,
    p.trendFilter ? trendWarmupSessions(p.trendFilter) : 0,
    initialStopWarmupSessions(p.initialStop),
    retentionWarmupSessions(p.retention),
    drawdownGateWarmupSessions(p.drawdownGate)
  );

// ----- decisions -----

export interface EntryDecision {
  id: string;
  sessionIndex: number; // the dataset session the decision is made in
  time: number; // Unix seconds: when it is first knowable (the signal bar's end)
  price: number; // the decision price: the signal bar's close
  trigger: number; // the scanner's threshold price (NaN for other decision sources)
  reference: number; // the scanner's recent low (NaN for other decision sources); the breakout: SMA_L at the signal
  signal?: RiseSignal;
  breakout?: BreakoutSignal; // v1.3.0: a trend-breakout decision (trigger = the prior high, reference = the SMA)
}

export type RejectReason = 'position_open' | 'order_pending';
// v1.2.0 (an entry gate ON): why a raw crossing met while flat was not taken at its own decision.
export type GateVetoReason =
  | 'trend_veto'
  | 'insufficient_history'
  | 'invalid_data'
  | 'capital_unavailable'
  | 'policy_invalidated'
  | 'drawdown_gate'; // v1.4.0

export interface DecisionOutcome {
  decision: EntryDecision;
  // vetoed: not taken and nothing remains (a gate blocked it with eligibility OFF, or its opportunity was invalidated
  // at arming); deferred: not taken at its own decision, but its armed opportunity stays live (see `gate`).
  status: 'filled' | 'rejected' | 'unfilled_at_end' | 'vetoed' | 'deferred';
  reason: RejectReason | GateVetoReason | null;
  trade: VirtualTrade | null; // the trade it opened, or (rejected) the trade holding the position or the order
  gate?: GatedDecision; // v1.2.0: the gate record of a crossing met while flat (absent with both gates OFF)
  protection?: ProtectionCheck; // v1.3.0: the initial risk stop was unavailable (absent otherwise)
}

export const decisionsFromSignals = (bars: readonly SignalBar[], signals: readonly RiseSignal[]): EntryDecision[] =>
  signals.map((signal) => ({
    id: `${signal.time}`,
    sessionIndex: bars[signal.index]!.sessionIndex,
    time: signal.time,
    price: signal.close,
    trigger: signal.thresholdPrice,
    reference: signal.recentLow,
    signal
  }));

// v1.3.0: one decision per breakout session close (its id is the close instant: a signal decides once).
export const decisionsFromBreakout = (signals: readonly BreakoutSignal[]): EntryDecision[] =>
  signals.map((b) => ({
    id: `${b.time}`,
    sessionIndex: b.session,
    time: b.time,
    price: b.close,
    trigger: b.priorHigh,
    reference: b.sma,
    breakout: b
  }));

const EMPTY_SCAN: RiseScan = { signals: [], evaluableBars: 0, barsAtOrAboveThreshold: 0 };

// ----- the simulation -----

export interface SimulationOptions {
  symbol: string;
  firstSession: number; // the first session simulated (the window's first)
  endSession: number; // the last
  exit: StrategyParams;
  book: BookSettings;
  originSession?: number; // where the drawdown trackers start (default firstSession)
  continuation?: ContinuationRuntime | null; // OFF when absent; classic_d1 also needs `exit` from exitParamsOf
  gates?: GateRuntime | null; // the entry trend filter / persistent eligibility (v1.2.0); OFF when absent
  recordMinuteMarks?: boolean; // keep the change points of the minute-marked net (for exports)
  // v1.3.0: the base entry method of `decisions` (absent = the Rise entry) and the initial risk stop / trend retention
  // (absent, or both null = OFF: the v1.2.0 exit path).
  entryMethod?: EntryMethod;
  rules?: PositionRulesRuntime | null;
  // v1.4.0: the Drawdown Recovery Gate (absent or null = OFF). The simulation creates it on this dataset (its detector
  // starts at the first loaded session) and adds it to the entry gates.
  drawdown?: DrawdownGateConfig | null;
}

export interface Excursion {
  worst: number; // the lowest mark while held (net of interest), dollars
  worstTime: number;
  best: number;
  bestTime: number;
  marks: number;
}

export interface DailyMark {
  index: number;
  date: string;
  close: number;
  realized: number;
  unrealized: number;
  marked: number;
  heldAtClose: boolean;
  investedDuringSession: boolean;
}

export interface Simulation {
  symbol: string;
  firstSession: number;
  endSession: number;
  exit: StrategyParams;
  book: BookSettings;
  trades: VirtualTrade[]; // filled positions, in entry order (open last, if any)
  outcomes: DecisionOutcome[];
  excursions: Map<VirtualTrade, Excursion>;
  daily: DailyMark[];
  minuteDrawdown: DrawdownStats;
  dailyDrawdown: DrawdownStats;
  minuteMarks: number;
  realized: number;
  log: DecisionLog; // chronological decisions and state transitions (always recorded)
  continuation: ContinuationController | null;
  gates: EntryGates | null; // v1.2.0 entry gates (null with both OFF)
  markChanges: { t: number[]; marked: number[] } | null; // minute-marked net at each change (recordMinuteMarks)
  entryMethod: EntryMethod; // v1.3.0
  rules: PositionRules | null; // v1.3.0: the initial risk stop / trend retention (null with both OFF)
}

// The origin of a trade: the base Growth entry (the Rise entry, or v1.3.0's trend breakout), or a continuation method.
export const originOf = (trade: VirtualTrade): { origin: Origin; method: ContinuationMethod | null } => {
  const kind = trade.setupKind as string;

  if (kind === 'rise' || kind === 'trend_breakout') return { origin: 'base_growth', method: null };
  if (kind === 'continuation') return { origin: 'continuation', method: 'classic_d1' };
  if ((CONTINUATION_METHODS as readonly string[]).includes(kind))
    return { origin: 'continuation', method: kind as ContinuationMethod };

  throw new Error(`trade ${trade.id} has an unknown setup kind ${kind}`);
};

// The last regular-session minute that completes at or before `time` (informational: the decision's bar).
export const lastMinuteBefore = (ds: Dataset, s: number, time: number) => {
  const start = ds.sBarStart[s]!;
  let k = ds.sBarCount[s]! - 1;

  while (k >= 0 && ds.bTime[start + k]! + 60 > time) k--;

  return k;
};

const prefixed = (prefix: string, values: Record<string, LogValue>) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [`${prefix}${k}`, v]));

// The log values of a gate result: the decision ('pass' or the block reason) and the trend filter's observed values
// (v1.3.0: and the initial risk stop's availability, only with that stop ON).
export const gateLogValues = (g: GateResult): Record<string, LogValue> => ({
  gate: g.reason,
  ...(g.capital === null ? {} : { capitalAvailable: g.capital }),
  ...prefixed('trend.', g.trend?.values ?? {}),
  ...(g.protection ? prefixed('protection.', g.protection.values) : {}),
  // v1.4.0: only with the Drawdown Recovery Gate ON
  ...(g.drawdown ? { ...prefixed('drawdown.', g.drawdown.values), blockedBy: g.blockedBy!.join(',') } : {})
});

export const simulateTrading = (
  ds: Dataset,
  decisions: readonly EntryDecision[],
  options: SimulationOptions
): Simulation => {
  const { firstSession, endSession } = options;
  const origin = options.originSession ?? firstSession;

  if (!(firstSession >= 0 && firstSession <= endSession && endSession < ds.sessionCount))
    throw new Error(`session range ${firstSession}..${endSession} is outside the dataset`);

  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i]!;

    if (i > 0 && d.time <= decisions[i - 1]!.time)
      throw new Error('decisions must be in strictly ascending time order');
    if (d.sessionIndex < firstSession || d.sessionIndex > endSession)
      throw new Error(`decision ${d.id} lies outside the simulated sessions`);
    if (!(d.time > ds.sTime[d.sessionIndex]! && d.time <= ds.sCloseTime[d.sessionIndex]!))
      throw new Error(`decision ${d.id} is not inside its session ${ds.dates[d.sessionIndex]}`);
  }

  const classic = options.continuation?.config.method === 'classic_d1';

  // classic_d1 needs the D1 machine's continuation fields (exitParamsOf sets them). Without classic_d1 a postExit flag
  // in the exit params is inert (the machine never arms and processBar is never called), as in v1.0.0 — the Study 8
  // exit-parity test feeds D1 books' own params this way.
  if (classic && options.exit.postExit !== true)
    throw new Error('classic_d1 continuation needs exit params with the D1 continuation fields (exitParamsOf)');

  // The book's own entry machine is never asked for a deep-dip signal. Without classic_d1 it never arms (arming would
  // start after the data); with it, only its post-exit continuation path can arm, from the first simulated session.
  const book = new ShadowBook(
    options.symbol as Sym,
    STRATEGY_KEY as PhenotypeName,
    ds,
    options.exit,
    options.book,
    classic ? firstSession : ds.sessionCount
  );
  const log = new DecisionLog();
  const entryMethod: EntryMethod = options.entryMethod ?? 'rise_from_recent_low';
  // v1.3.0: the initial risk stop / trend retention. Null with both OFF: none of their code runs (the v1.2.0 paths).
  const rules =
    options.rules && (options.rules.initialStop || options.rules.retention)
      ? new PositionRules(ds, options.rules, book, options.exit, options.book, log)
      : null;
  // The initial risk stop's decision-time availability, wherever an entry is decided (a failure is noted once per
  // check; the caller records the blocked decision).
  const protect = (s: number, time: number, source: string) => {
    const check = rules!.protection(s, time)!;

    if (!check.pass) rules!.noteBlocked(time, s, source, check);
    return check;
  };
  // v1.4.0: the Drawdown Recovery Gate joins the entry gates (alone: without the trend filter and eligibility).
  const drawdownGate = options.drawdown ? new DrawdownRecoveryGate(ds, options.drawdown, firstSession) : null;
  const baseGates: GateRuntime | null = drawdownGate
    ? {
        ...(options.gates ?? {
          trend: null,
          eligibility: null,
          bars: [],
          entry: { advanceFromRecentLowPercent: NaN, recentLowLookbackBars: NaN }
        }),
        drawdown: drawdownGate
      }
    : (options.gates ?? null);
  const gateRuntime =
    baseGates && rules?.initialStop
      ? { ...baseGates, protection: (s: number, time: number) => protect(s, time, 'entry_gate') }
      : (baseGates ?? null);
  const gated = Boolean(
    gateRuntime && (gateRuntime.trend || gateRuntime.eligibility || gateRuntime.capacity || gateRuntime.drawdown)
  );
  let continuation: ContinuationController | null = null;
  let setupSeq = 0;
  const outcomes: DecisionOutcome[] = [];
  // Places the order of a base-family decision (the crossing, a latched opportunity, a renewal signal).
  const enter = (d: Pick<EntryDecision, 'id' | 'time' | 'price' | 'trigger' | 'reference'>, s: number) => {
    // Base priority: an open continuation episode is closed (and an armed setup cancelled) before the base order.
    continuation?.beforeBaseEntry(s, d.time);

    const setup: Setup = {
      id: gated ? ++setupSeq : outcomes.length + 1,
      // ShadowBook only records it; not a D1 setup kind
      kind: (entryMethod === 'trend_breakout' ? 'trend_breakout' : 'rise') as string as SetupKind,
      activationIndex: s,
      activationTime: d.time,
      activationPrice: d.price,
      referenceHigh: NaN,
      anchorHigh: NaN,
      trailingLow: d.reference,
      trailingLowTime: NaN,
      reboundTrigger: d.trigger,
      declinedSignals: 0,
      status: 'armed',
      endIndex: -1
    };
    const signal: ReboundSignal = {
      setup,
      index: s,
      barIndex: lastMinuteBefore(ds, s, d.time),
      decisionTime: d.time,
      decisionPrice: d.price,
      trigger: d.trigger,
      trailingLow: d.reference
    };
    const trade = book.commit(signal, s, 'granted');

    rules?.attach(trade, s, d.time); // v1.3.0: fixes the initial risk stop's ATR for this order

    return trade;
  };
  const gates =
    gated && gateRuntime
      ? new EntryGates(ds, gateRuntime, log, { enter, flatWithoutOrder: () => !book.position && !book.order })
      : null;
  const protectedOnly = Boolean(rules?.initialStop && !gates);

  continuation = options.continuation
    ? new ContinuationController(
        ds,
        book,
        options.continuation,
        log,
        (s, time) => lastMinuteBefore(ds, s, time),
        gates
          ? {
              check: (s, time, price) => {
                const g = gates.check(s, time, price, 'continuation');

                return { pass: g.pass, reason: g.reason, text: g.text, values: gateLogValues(g) };
              },
              afterEntry: (trade, s, time) => {
                rules?.attach(trade, s, time);
                gates.afterEntry(trade, s, time, 'a continuation entry');
              }
            }
          : protectedOnly
            ? {
                // v1.3.0, the initial risk stop ON without an entry gate: its availability is the only check.
                check: (s, time) => {
                  const c = protect(s, time, 'continuation');

                  return { pass: c.pass, reason: c.reason, text: c.text, values: prefixed('protection.', c.values) };
                },
                afterEntry: (trade, s, time) => rules!.attach(trade, s, time)
              }
            : null
      )
    : null;
  const markChanges = options.recordMinuteMarks ? { t: [] as number[], marked: [] as number[] } : null;
  const byTrade = new Map<VirtualTrade, DecisionOutcome>();
  const excursions = new Map<VirtualTrade, Excursion>();
  const daily: DailyMark[] = [];
  const minute = new Tracker(0, ds.bTime[ds.sBarStart[origin]!]!);
  const session = new Tracker(0, ds.sTime[origin]!);
  let realized = 0;
  let minuteMarks = 0;
  let next = 0;

  const baseEntry = (
    d: EntryDecision,
    s: number,
    disposition: 'taken' | 'rejected' | 'vetoed' | 'deferred' | 'invalidated',
    reason: string | null,
    trade: VirtualTrade | null,
    g: GatedDecision | null = null,
    at = log.entries.length,
    protection: ProtectionCheck | null = null
  ) =>
    log.insert(at, {
      t: d.time,
      session: s,
      event: 'base_signal',
      origin: 'base_growth',
      method: null,
      episode: null,
      ...(g?.opportunity ? { opportunity: g.opportunity.id } : {}),
      trade,
      disposition,
      reason,
      values: {
        close: d.price,
        // v1.3.0 breakout decisions: the prior high and the intrinsic SMA (the Rise entry: its threshold and low)
        ...(d.breakout
          ? {
              entryMethod: 'trend_breakout',
              priorHigh: d.breakout.priorHigh,
              priorHighSession: ds.dates[d.breakout.priorHighSession]!,
              sma: d.breakout.sma,
              smaThen: d.breakout.smaThen
            }
          : { threshold: d.trigger, recentLow: d.reference }),
        ...(g ? { ...(g.gate ? gateLogValues(g.gate) : {}), ...prefixed('policy.', g.validity ?? {}) } : {}),
        ...(protection ? { gate: protection.reason, ...prefixed('protection.', protection.values) } : {})
      }
    });

  const decide = (d: EntryDecision, s: number) => {
    if (book.position) {
      outcomes.push({ decision: d, status: 'rejected', reason: 'position_open', trade: book.position.trade });
      baseEntry(d, s, 'rejected', 'position_open', book.position.trade);
      return;
    }

    if (book.order) {
      outcomes.push({ decision: d, status: 'rejected', reason: 'order_pending', trade: book.order.trade });
      baseEntry(d, s, 'rejected', 'order_pending', book.order.trade);
      return;
    }

    if (gates) {
      const at = log.entries.length; // the raw crossing is logged before the entries the gates add for it
      const g = gates.onCrossing(
        { time: d.time, price: d.price, trigger: d.trigger, reference: d.reference, barIndex: d.signal?.index ?? null },
        s
      );

      if (g.disposition === 'taken') {
        const outcome: DecisionOutcome = {
          decision: d,
          status: 'unfilled_at_end',
          reason: null,
          trade: g.trade,
          gate: g
        };

        outcomes.push(outcome);
        byTrade.set(g.trade!, outcome);
        baseEntry(d, s, 'taken', null, g.trade, g, at);
      } else {
        const reason: GateVetoReason =
          g.disposition === 'invalidated' ? 'policy_invalidated' : (g.gate!.reason as GateVetoReason);

        outcomes.push({
          decision: d,
          status: g.disposition === 'deferred' ? 'deferred' : 'vetoed',
          reason,
          trade: null,
          gate: g
        });
        baseEntry(d, s, g.disposition, g.reason, null, g, at);
      }

      return;
    }

    // v1.3.0, the initial risk stop ON without an entry gate: no entry without the requested protection.
    if (protectedOnly) {
      const check = protect(s, d.time, 'base_signal');

      if (!check.pass) {
        outcomes.push({
          decision: d,
          status: 'vetoed',
          reason: check.reason as GateVetoReason,
          trade: null,
          protection: check
        });
        baseEntry(d, s, 'vetoed', check.text, null, null, log.entries.length, check);
        return;
      }
    }

    const trade = enter(d, s);
    const outcome: DecisionOutcome = { decision: d, status: 'unfilled_at_end', reason: null, trade };

    outcomes.push(outcome);
    byTrade.set(trade, outcome);
    baseEntry(d, s, 'taken', null, trade);
  };

  const r2 = (x: number) => Math.round(x * 100) / 100;
  const tagOf = (trade: VirtualTrade) => {
    const o = originOf(trade);

    return { origin: o.origin, method: o.method };
  };
  const logExit = (trade: VirtualTrade, s: number) => {
    // v1.3.0: a position closed in several fills sums its fills (the trade's net, interest and gross are its totals).
    const pos = rules?.positionOf(trade);
    const fills = pos && pos.fills.length > 1 ? pos.fills : null;
    const grossBeforeCosts = fills
      ? fills.reduce((a, f) => a + f.grossBeforeCosts, 0)
      : trade.shares * (trade.exitRawPrice - trade.entryRawPrice);
    const costs = fills
      ? trade.shares * (trade.entryPrice - trade.entryRawPrice) + fills.reduce((a, f) => a + f.exitCost, 0)
      : trade.shares * (trade.entryPrice - trade.entryRawPrice) + trade.shares * (trade.exitRawPrice - trade.exitPrice);
    const final = pos?.fills.at(-1);

    log.add({
      t: trade.exitTime,
      session: s,
      event: 'exit',
      ...tagOf(trade),
      episode: null,
      trade,
      disposition: null,
      reason: trade.exitReason,
      values: {
        fill: trade.exitExecution,
        price: trade.exitRawPrice,
        stopPrice: trade.exitStopPrice,
        stopActive: trade.stopActiveAtExit,
        maximumHoldDue: trade.maximumHoldDue,
        bufferDecision: Number.isNaN(trade.bufferSignalTime)
          ? null
          : new Date(trade.bufferSignalTime * 1000).toISOString(),
        grossBeforeCosts: r2(grossBeforeCosts),
        costs: r2(costs),
        interest: r2(trade.interest),
        net: r2(trade.net),
        reconciles: Math.abs(grossBeforeCosts - costs - trade.interest - trade.net) < 1e-6,
        qualifiesForContinuation: trade.net > 0,
        ...(final
          ? {
              rule: final.rule,
              ...(pos!.stop ? { initialStop: pos!.stop.level } : {}),
              ...(final.instruction.sameTrade.length ? { sameTrade: final.instruction.sameTrade.join(',') } : {}),
              fills: pos!.fills.length,
              ...(fills
                ? {
                    finalFillShares: final.shares,
                    finalFillNet: r2(final.net),
                    partialFillsNet: r2(pos!.partialNet),
                    positionNet: r2(trade.net)
                  }
                : {})
            }
          : {})
      }
    });
  };
  const logFill = (trade: VirtualTrade, s: number) =>
    log.add({
      t: trade.entryTime,
      session: s,
      event: 'fill',
      ...tagOf(trade),
      episode: null,
      trade,
      disposition: null,
      reason: trade.entryExecution,
      values: {
        price: trade.entryRawPrice,
        priceAfterCost: trade.entryPrice,
        decision: new Date(trade.decisionTime * 1000).toISOString(),
        carriedOvernight: trade.carriedOvernight
      }
    });

  // v1.3.0 (the initial risk stop or retention ON): the exits due at bar k, in order. A partial sale keeps the
  // position and the remainder's next exit may be due at the same bar (a lower stop crossed later in the minute).
  const exitsAt = (s: number, k: number) => {
    for (let guard = 0; guard < 3; guard++) {
      const exit = book.exitAt(k);

      if (!exit) return;

      const instruction = rules!.instructionOf(exit);

      if (instruction?.partial) {
        const fill = rules!.partialSale(s, exit);

        realized += fill.net;
        continue;
      }

      const position = book.position!;
      const sharesSold = position.lot.shares;
      const principalRepaid = position.lot.investment;
      const partials = rules!.positionOf(position.trade)?.fills.length ?? 0;
      // classic_d1: the D1 machine opens its continuation window from the net the book computes, which after partial
      // fills is the remainder's alone; it is re-judged on the whole position's net below.
      const m = book.machine;
      const machine = partials
        ? { a: m.continuationActive, h: m.continuationHigh, st: m.continuationStart, w: m.continuationWindows }
        : null;
      const trade = book.close(s, exit);
      const fill = rules!.finalize(trade, s, exit, sharesSold, principalRepaid);

      if (machine) {
        m.continuationActive = machine.a;
        m.continuationHigh = machine.h;
        m.continuationStart = machine.st;
        m.continuationWindows = machine.w;
        m.onExit(s, exit.price, trade.net);
      }
      realized += fill.net;
      logExit(trade, s);
      continuation?.afterExit(s, trade);
      return;
    }

    throw new Error(`more than two exit fills at one bar (${ds.dates[s]} bar ${k})`);
  };

  for (let s = firstSession; s <= endSession; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const sessionTime = ds.sTime[s]!;

    book.beginSession(s);
    continuation?.beginSession(s);
    gates?.beginSession(s);

    let invested = Boolean(book.position);

    for (let k = 0; k <= count; k++) {
      const t = k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!;
      // Base decisions and (v1.2.0) latched-opportunity steps due at or before `time`, in time order; at one instant a
      // fresh crossing goes first, then the live opportunity. With both gates OFF this is the v1.1.0 base loop.
      // v1.4.0: the Drawdown Recovery Gate's observations join the merge; at one instant the observation goes first
      // (a decision at that instant knows it), and a release it causes may schedule a latched step at that instant.
      const baseUntil = (time: number) => {
        for (;;) {
          const tb = next < decisions.length && decisions[next]!.sessionIndex === s ? decisions[next]!.time : Infinity;
          const tg = gates ? gates.nextTime(s, time) : Infinity;

          if (drawdownGate) {
            const to = drawdownGate.nextTime;

            if (to <= time && to <= tb && to <= tg) {
              drawdownGate.step();
              continue;
            }
          }

          if (tb <= time && tb <= tg) {
            decide(decisions[next]!, s);
            next++;
          } else if (tg <= time) gates!.evaluate(s);
          else return;
        }
      };

      // In time order: a base decision (and a latched step) at or before a continuation step goes first (priority at a
      // tie: fresh crossing, then live opportunity, then continuation).
      if (continuation)
        for (let ct = continuation.nextTime(s, k, t); ct <= t; ct = continuation.nextTime(s, k, t)) {
          baseUntil(ct);
          continuation.evaluate(s, k);
        }

      baseUntil(t);

      if (rules) exitsAt(s, k);
      else {
        const exit = book.exitAt(k);

        if (exit) {
          const trade = book.close(s, exit);

          realized += trade.net;
          logExit(trade, s);
          continuation?.afterExit(s, trade);
        }
      }

      if (book.fillAt(k)) {
        const trade = book.open(s, k);
        const base = byTrade.get(trade);
        const gatedFill = gates ? gates.afterFill(trade) : false;

        if (base) base.status = 'filled';
        else if (!gatedFill && !continuation?.afterFill(trade))
          throw new Error(`fill of an unknown order (trade ${trade.id})`);
        excursions.set(trade, { worst: Infinity, worstTime: NaN, best: -Infinity, bestTime: NaN, marks: 0 });
        invested = true;
        logFill(trade, s);

        // v1.3.0: the position's rules start at its fill; the initial risk stop may already act in this minute.
        if (rules) {
          rules.onFill(trade, s, k);
          exitsAt(s, k);
        }
      }

      const price = k < count ? ds.bClose[start + k]! : ds.sClose[s]!;
      const mark = book.markAt(price, sessionTime);
      // v1.3.0: a position's own excursion includes the net of its partial fills (the book marks the remainder).
      const positionMark = rules && book.position ? mark + rules.openPartialNet() : mark;

      minute.updateStrict(realized + mark, t);
      minuteMarks++;

      if (markChanges && markChanges.marked.at(-1) !== realized + mark) {
        markChanges.t.push(t);
        markChanges.marked.push(realized + mark);
      }

      if (book.position) {
        const x = excursions.get(book.position.trade)!;

        x.marks++;

        if (positionMark < x.worst) {
          x.worst = positionMark;
          x.worstTime = t;
        }

        if (positionMark > x.best) {
          x.best = positionMark;
          x.bestTime = t;
        }
      }
    }

    if (next < decisions.length && decisions[next]!.sessionIndex === s)
      throw new Error(`decision ${decisions[next]!.id} comes after the close of ${ds.dates[s]}`);
    if (continuation && !continuation.classic && continuation.nextTime(s, count + 1, Infinity) !== Infinity)
      throw new Error(`a continuation bar of ${ds.dates[s]} ends after its close`);
    if (gates && gates.nextTime(s, Infinity) !== Infinity)
      throw new Error(`an eligibility bar of ${ds.dates[s]} ends after its close`);

    book.afterSession(s);
    rules?.afterSession(s); // v1.3.0: the trend-retention count at the completed close
    continuation?.afterSession(s);
    gates?.afterSession(s);

    const unrealized = book.markAt(ds.sClose[s]!, sessionTime);

    session.updateStrict(realized + unrealized, sessionTime);
    daily.push({
      index: s,
      date: ds.dates[s]!,
      close: ds.sClose[s]!,
      realized,
      unrealized,
      marked: realized + unrealized,
      heldAtClose: Boolean(book.position),
      investedDuringSession: invested
    });
  }

  book.finish(endSession);
  rules?.finish(endSession);
  continuation?.finish(endSession);
  gates?.finish(endSession);

  return {
    symbol: options.symbol,
    firstSession,
    endSession,
    exit: options.exit,
    book: options.book,
    trades: book.trades.filter((trade) => trade.entryIndex >= 0),
    outcomes,
    excursions,
    daily,
    minuteDrawdown: minute.stats(),
    dailyDrawdown: session.stats(),
    minuteMarks,
    realized,
    log,
    continuation,
    gates,
    markChanges,
    entryMethod,
    rules
  };
};

// ----- the whole strategy on loaded sessions -----

export interface RiseTradingRun {
  params: RiseTradingParams;
  ds: Dataset;
  bars: SignalBar[];
  firstSignalBar: number;
  scan: RiseScan; // the Rise scanner's (empty with the breakout entry, which does not run it)
  breakout: BreakoutScan | null; // v1.3.0: the trend-breakout scan (null with the Rise entry)
  decisions: EntryDecision[];
  simulation: Simulation;
}

// `history` = warm-up sessions followed by the window (src/lib/evaluation.ts loadDatasetSessions); `warmup` = how many.
export const runRiseTrading = (
  symbol: string,
  history: MarketSession[],
  warmup: number,
  params: RiseTradingParams,
  dataHash = 'unhashed',
  options: { recordMinuteMarks?: boolean } = {}
): RiseTradingRun => {
  assertTradingParams(params);

  if (warmup >= history.length) throw new Error(`${symbol}: no session inside the window`);

  const scanParams: RiseFromRecentLowParams = {
    advanceFromRecentLowPercent: params.advanceFromRecentLowPercent,
    recentLowLookbackBars: params.recentLowLookbackBars
  };
  const method = entryMethodOf(params);
  const bars = barsFromSessions(history, params.resolution);
  const first = bars.findIndex((bar) => bar.sessionIndex >= warmup);
  const firstSignalBar = first < 0 ? bars.length : first;
  const scan = method === 'rise_from_recent_low' ? scanRiseFromRecentLow(bars, scanParams, firstSignalBar) : EMPTY_SCAN;
  const ds = fixtureDataset(history);

  ds.id = `${symbol}:${dataHash.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = dataHash;

  // v1.3.0: the trend-breakout entry decides at the window's completed session closes.
  const breakout =
    method === 'trend_breakout' ? scanTrendBreakout(ds, warmup, history.length - 1, params.breakout!) : null;
  const decisions = breakout ? decisionsFromBreakout(breakout.signals) : decisionsFromSignals(bars, scan.signals);
  const continuation = params.continuation
    ? { config: params.continuation, bars: params.continuation.method === 'classic_d1' ? null : bars }
    : null;
  const gates: GateRuntime | null =
    params.trendFilter || params.eligibility
      ? {
          trend: params.trendFilter ?? null,
          eligibility: params.eligibility ?? null,
          bars,
          entry: scanParams
        }
      : null;
  const simulation = simulateTrading(ds, decisions, {
    symbol,
    firstSession: warmup,
    endSession: history.length - 1,
    exit: exitParamsOf(params),
    book: bookSettingsOf(params),
    continuation,
    gates,
    recordMinuteMarks: options.recordMinuteMarks,
    entryMethod: method,
    rules:
      params.initialStop || params.retention
        ? { initialStop: params.initialStop ?? null, retention: params.retention ?? null }
        : null,
    drawdown: params.drawdownGate ?? null
  });

  return { params, ds, bars, firstSignalBar, scan, breakout, decisions, simulation };
};

// ----- the trade ledger, reconciliation and metrics -----

export interface LedgerRow {
  trade: VirtualTrade;
  number: number; // 1-based, in entry order
  status: 'closed' | 'open';
  shares: number;
  principal: number;
  entryRawPrice: number;
  entryPrice: number; // after the entry cost
  exitRawPrice: number; // the raw exit fill; for an open position the last close it is marked at
  exitPrice: number; // after the exit cost (NaN while open: not yet charged)
  grossBeforeCosts: number; // shares × (raw exit − raw entry)
  entryFriction: number; // shares × (entry after cost − raw entry)
  exitFriction: number; // shares × (raw exit − exit after cost); 0 while open
  interest: number; // paid at exit, or accrued to the last session while open
  net: number; // the book's net = gross − friction − interest (checked)
  netReturnPercent: number; // net ÷ principal × 100
  priceReturnPercent: number; // (raw exit ÷ raw entry − 1) × 100, before costs and interest
  calendarDaysHeld: number; // (exit time, or the last close while open) − entry time, days
  sessionsHeld: number; // sessions from the entry session to the exit (or last) session, inclusive
  interestDays: number; // calendar days between the entry and exit (or last) session dates
  excursion: Excursion;
  identityResidual: number; // gross − entryFriction − exitFriction − interest − net
  // v1.3.0, only for a position closed in several fills (or open with a partial fill): every exit fill (partial ones
  // first), the net of the partial fills, the open remainder, and the share-weighted average exit price. The row's
  // gross, frictions, interest and net are then the whole logical position's totals.
  exitFills?: ExitFill[];
  partialFillsNet?: number;
  remainder?: { shares: number; principal: number; interest: number; mark: number; net: number } | null;
  averageExitRawPrice?: number;
}

// The fills of a position whose ledger row must sum several fills (null for an ordinary one-fill position).
const multiFillOf = (sim: Pick<Simulation, 'rules'>, trade: VirtualTrade) => {
  const pos = sim.rules?.positionOf(trade);

  if (!pos) return null;

  const open = trade.exitIndex < 0;

  return pos.fills.length > 1 || (open && pos.fills.length > 0) ? pos : null;
};

export const ledgerOf = (sim: Simulation, ds: Dataset): LedgerRow[] =>
  sim.trades.map((trade, i) => {
    const open = trade.exitIndex < 0;
    const lastIndex = open ? sim.endSession : trade.exitIndex;
    const endTime = open ? ds.sCloseTime[sim.endSession]! : trade.exitTime;
    const multi = multiFillOf(sim, trade);

    if (multi) {
      const rem = open ? multi.remainder! : null;
      const grossBeforeCosts =
        multi.fills.reduce((a, f) => a + f.grossBeforeCosts, 0) +
        (rem ? rem.shares * (trade.exitRawPrice - trade.entryRawPrice) : 0);
      const entryFriction = trade.shares * (trade.entryPrice - trade.entryRawPrice);
      const exitFriction = multi.fills.reduce((a, f) => a + f.exitCost, 0);
      const averageExitRawPrice =
        (multi.fills.reduce((a, f) => a + f.shares * f.rawPrice, 0) + (rem ? rem.shares * trade.exitRawPrice : 0)) /
        trade.shares;

      return {
        trade,
        number: i + 1,
        status: open ? 'open' : 'closed',
        shares: trade.shares,
        principal: trade.investment,
        entryRawPrice: trade.entryRawPrice,
        entryPrice: trade.entryPrice,
        exitRawPrice: trade.exitRawPrice,
        exitPrice: open ? NaN : trade.exitPrice,
        grossBeforeCosts,
        entryFriction,
        exitFriction,
        interest: trade.interest,
        net: trade.net,
        netReturnPercent: (trade.net / trade.investment) * 100,
        priceReturnPercent: (averageExitRawPrice / trade.entryRawPrice - 1) * 100,
        calendarDaysHeld: (endTime - trade.entryTime) / secondsPerDay,
        sessionsHeld: lastIndex - trade.entryIndex + 1,
        interestDays: Math.round((ds.sTime[lastIndex]! - ds.sTime[trade.entryIndex]!) / secondsPerDay),
        excursion: sim.excursions.get(trade)!,
        identityResidual: grossBeforeCosts - entryFriction - exitFriction - trade.interest - trade.net,
        exitFills: multi.fills,
        partialFillsNet: multi.partialNet,
        remainder: rem,
        averageExitRawPrice
      };
    }

    const grossBeforeCosts = trade.shares * (trade.exitRawPrice - trade.entryRawPrice);
    const entryFriction = trade.shares * (trade.entryPrice - trade.entryRawPrice);
    const exitFriction = open ? 0 : trade.shares * (trade.exitRawPrice - trade.exitPrice);

    return {
      trade,
      number: i + 1,
      status: open ? 'open' : 'closed',
      shares: trade.shares,
      principal: trade.investment,
      entryRawPrice: trade.entryRawPrice,
      entryPrice: trade.entryPrice,
      exitRawPrice: trade.exitRawPrice,
      exitPrice: open ? NaN : trade.exitPrice,
      grossBeforeCosts,
      entryFriction,
      exitFriction,
      interest: trade.interest,
      net: trade.net,
      netReturnPercent: (trade.net / trade.investment) * 100,
      priceReturnPercent: (trade.exitRawPrice / trade.entryRawPrice - 1) * 100,
      calendarDaysHeld: (endTime - trade.entryTime) / secondsPerDay,
      sessionsHeld: lastIndex - trade.entryIndex + 1,
      interestDays: Math.round((ds.sTime[lastIndex]! - ds.sTime[trade.entryIndex]!) / secondsPerDay),
      excursion: sim.excursions.get(trade)!,
      identityResidual: grossBeforeCosts - entryFriction - exitFriction - trade.interest - trade.net
    };
  });

// Re-books every trade in the shared fixed ledger (src/multi-etf-allocator/ledger.ts FixedLedger, the N-book engine's
// accounting) from its raw fills, and returns the largest absolute difference from the book's own figures, dollars.
export const reconcileWithFixedLedger = (sim: Simulation, ds: Dataset) => {
  const ledger = new FixedLedger(sim.book.rate, sim.book.costBps);
  let maxDifference = 0;
  const diff = (a: number, b: number) => (maxDifference = Math.max(maxDifference, Math.abs(a - b)));

  sim.trades.forEach((trade, i) => {
    const entryPrice = ledger.buyPrice(trade.entryRawPrice);
    const multi = multiFillOf(sim, trade);

    // v1.3.0: a position closed in several fills is re-booked as one lot per fill (its shares and the principal it
    // repays), each closed at its own fill with its own interest; an open remainder is marked. The fills must add up
    // to the position (shares, principal) and their nets to its net.
    if (multi) {
      const lotOf = (shares: number, principal: number, n: number) =>
        ledger.openLot({
          id: (i + 1) * 1000 + n,
          symbol: trade.symbol,
          trade,
          slot: 0,
          shares,
          entryIndex: trade.entryIndex,
          entryBar: trade.entryBar,
          entryTime: trade.entryTime,
          entryRawPrice: trade.entryRawPrice,
          entryPrice,
          entryExecution: trade.entryExecution,
          entryTimestamp: ds.sTime[trade.entryIndex]!,
          decisionIndex: trade.decisionIndex,
          decisionTime: trade.decisionTime,
          decisionPrice: trade.decisionPrice,
          equityAtDecision: NaN,
          fraction: NaN,
          originalPrincipal: principal,
          principal,
          accruedBefore: 0,
          accrualStart: ds.sTime[trade.entryIndex]!,
          posted: 0,
          accrued: 0,
          repaidByCore: 0,
          dividends: 0
        });
      let net = 0;
      let shares = 0;
      let principal = 0;

      diff(entryPrice, trade.entryPrice);
      for (const f of multi.fills) {
        const lot = lotOf(f.shares, f.principal, f.n);
        const isStop = f.reason === 'trailing stop' || f.reason === 'trailing stop gap';
        const fillNet = ledger.closeLot(lot, {
          index: f.session,
          bar: f.bar,
          time: f.time,
          rawPrice: f.rawPrice,
          reason: f.reason as ExitReason,
          execution: f.execution,
          sessionTime: ds.sTime[f.session]!,
          extraSlippage: isStop ? sim.book.stopSlippageBps / 10000 : 0
        });

        diff(fillNet, f.net);
        diff(lot.interest, f.interest);
        diff(lot.exitPrice, f.price);
        net += fillNet;
        shares += f.shares;
        principal += f.principal;
      }
      if (multi.remainder) {
        const r = multi.remainder;
        const lot = lotOf(r.shares, r.principal, 0);

        diff(ledger.mark(lot, r.mark, ds.sTime[sim.endSession]!), r.net);
        diff(ledger.lotInterest(lot, ds.sTime[sim.endSession]!), r.interest);
        net += r.net;
        shares += r.shares;
        principal += r.principal;
      }
      diff(net, trade.net);
      diff(shares * entryPrice, sim.book.notional);
      diff(principal, sim.book.notional);
      return;
    }

    const lot = ledger.openLot({
      id: i + 1,
      symbol: trade.symbol,
      trade,
      slot: 0,
      shares: sim.book.notional / entryPrice,
      entryIndex: trade.entryIndex,
      entryBar: trade.entryBar,
      entryTime: trade.entryTime,
      entryRawPrice: trade.entryRawPrice,
      entryPrice,
      entryExecution: trade.entryExecution,
      entryTimestamp: ds.sTime[trade.entryIndex]!,
      decisionIndex: trade.decisionIndex,
      decisionTime: trade.decisionTime,
      decisionPrice: trade.decisionPrice,
      equityAtDecision: NaN,
      fraction: NaN,
      originalPrincipal: sim.book.notional,
      principal: sim.book.notional,
      accruedBefore: 0,
      accrualStart: ds.sTime[trade.entryIndex]!,
      posted: 0,
      accrued: 0,
      repaidByCore: 0,
      dividends: 0
    });

    diff(lot.entryPrice, trade.entryPrice);
    diff(lot.shares, trade.shares);

    if (trade.exitIndex >= 0) {
      const isStop = trade.exitReason === 'trailing stop' || trade.exitReason === 'trailing stop gap';
      const net = ledger.closeLot(lot, {
        index: trade.exitIndex,
        bar: trade.exitBar,
        time: trade.exitTime,
        rawPrice: trade.exitRawPrice,
        reason: trade.exitReason,
        execution: trade.exitExecution,
        sessionTime: ds.sTime[trade.exitIndex]!,
        extraSlippage: isStop ? sim.book.stopSlippageBps / 10000 : 0
      });

      diff(net, trade.net);
      diff(lot.interest, trade.interest);
      diff(lot.exitPrice, trade.exitPrice);
    } else {
      diff(ledger.mark(lot, trade.exitRawPrice, ds.sTime[sim.endSession]!), trade.net);
      diff(ledger.lotInterest(lot, ds.sTime[sim.endSession]!), trade.interest);
    }
  });

  return { trades: sim.trades.length, maxDifference, realized: ledger.realized };
};

const median = (values: number[]) => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const ATTRIBUTION_NOTE =
  'Descriptive attribution: each trade is credited to the mechanism that opened it. This is NOT the incremental (causal) ' +
  'effect of enabling a mechanism: enabling it changes which later signals are taken and so the whole trade sequence. ' +
  'The causal comparison is a complete ON run against an otherwise identical OFF run (path-dependent counterfactual).';

// Per origin (base Growth, each continuation method): entries, outcomes and the money of the trades it opened.
export const attributionOf = (rows: readonly LedgerRow[]) => {
  const groups = new Map<string, LedgerRow[]>();

  for (const row of rows) {
    const o = originOf(row.trade);
    const key = o.origin === 'base_growth' ? 'base_growth' : `continuation:${o.method}`;

    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const byOrigin = Object.fromEntries(
    [...groups].map(([key, list]) => {
      const closed = list.filter((row) => row.status === 'closed');
      const open = list.filter((row) => row.status === 'open');

      return [
        key,
        {
          entries: list.length,
          closed: closed.length,
          open: open.length,
          wins: closed.filter((row) => row.net > 0).length,
          losses: closed.filter((row) => row.net < 0).length,
          breakeven: closed.filter((row) => row.net === 0).length,
          realizedNetUsd: sum(closed.map((row) => row.net)),
          realizedGrossBeforeCostsUsd: sum(closed.map((row) => row.grossBeforeCosts)),
          realizedCostsUsd: sum(closed.map((row) => row.entryFriction + row.exitFriction)),
          realizedInterestUsd: sum(closed.map((row) => row.interest)),
          unrealizedNetUsd: sum(open.map((row) => row.net)),
          worstClosedNetUsd: closed.length ? Math.min(...closed.map((row) => row.net)) : null,
          bestClosedNetUsd: closed.length ? Math.max(...closed.map((row) => row.net)) : null,
          meanCalendarDaysHeld: closed.length ? sum(closed.map((row) => row.calendarDaysHeld)) / closed.length : null,
          calendarDaysInvested: sum(list.map((row) => row.calendarDaysHeld)),
          worstMarkUsd: list.length ? Math.min(...list.map((row) => row.excursion.worst)) : null
        }
      ];
    })
  );

  return { note: ATTRIBUTION_NOTE, byOrigin };
};

// The continuation episodes of a simulation, counted (descriptive diagnostics, never a ranking).
export const continuationMetricsOf = (sim: Simulation) => {
  const c = sim.continuation;
  const exits = sim.trades.filter((t) => t.exitIndex >= 0);

  if (!c) return { enabled: false as const, qualifyingExits: exits.filter((t) => t.net > 0).length };

  const ends: Record<string, number> = {
    triggered: 0,
    base_entry: 0,
    window_expired: 0,
    pullback_too_deep: 0,
    end_of_data: 0,
    // v1.2.0: a trigger blocked by an entry gate ends its episode (keys present only with a gate ON; v1.3.0: or with
    // the initial risk stop ON, whose unavailability blocks a trigger as insufficient_history / invalid_data)
    ...(sim.gates || sim.rules?.initialStop
      ? { trend_veto: 0, insufficient_history: 0, invalid_data: 0, capital_unavailable: 0 }
      : {})
  };

  for (const e of c.episodes) if (e.end) ends[e.end]!++;

  const expired = c.episodes.filter((e) => e.end === 'window_expired' && Number.isFinite(e.maxHighInWindow));

  return {
    enabled: true as const,
    method: c.method,
    config: c.runtime.config,
    qualifyingExits: exits.filter((t) => t.net > 0).length,
    nonQualifyingExits: exits.filter((t) => !(t.net > 0)).length,
    episodes: c.episodes.length,
    endedBy: ends,
    armed: c.episodes.filter((e) => Number.isFinite(e.armedTime)).length,
    armedAtEnd: c.episodes.filter((e) => e.end === 'end_of_data' && Number.isFinite(e.armedTime)).length,
    triggered: c.outcomes.filter((o) => o.status !== 'suppressed' && o.status !== 'vetoed').length,
    // v1.2.0: triggers blocked by an entry gate (always 0 with both gates OFF; the key exists only with a gate ON;
    // v1.3.0: or the initial risk stop)
    vetoedByEntryGate:
      sim.gates || sim.rules?.initialStop ? c.outcomes.filter((o) => o.status === 'vetoed').length : undefined,
    filled: c.outcomes.filter((o) => o.status === 'filled').length,
    unfilledAtEnd: c.outcomes.filter((o) => o.status === 'unfilled_at_end').length,
    suppressedBasePriority: c.outcomes.filter((o) => o.status === 'suppressed').length,
    expiredWithLaterHigherHigh: expired.filter((e) => e.maxHighInWindow > e.exitPrice).length,
    note: 'Episode counts are descriptive. "Expired with a later higher high" counts windows that expired although a session high above the exit price followed inside the window (a possible missed continuation); it is not a profit estimate.'
  };
};

// ----- v1.2.0 entry gates: entry sources and descriptive counts -----

export type EntrySource =
  | 'rise_from_recent_low'
  | 'trend_breakout' // v1.3.0
  | 'latched:rise_from_recent_low'
  | 'eligibility_renewal'
  | 'latched:eligibility_renewal'
  | `continuation:${ContinuationMethod}`;

// Which decision opened a trade: the raw crossing itself, a later (latched) decision of its opportunity, a renewal
// signal, a later decision of a renewal opportunity, or a continuation method.
export const entrySourceOf = (sim: Pick<Simulation, 'gates'>, trade: VirtualTrade): EntrySource => {
  const o = originOf(trade);

  if (o.origin === 'continuation') return `continuation:${o.method!}`;
  if ((trade.setupKind as string) === 'trend_breakout') return 'trend_breakout';

  const d = sim.gates?.decisionOf(trade);

  if (!d || d.kind === 'crossing') return 'rise_from_recent_low';
  if (d.kind === 'renewal') return 'eligibility_renewal';

  return d.opportunity?.source === 'eligibility_renewal'
    ? 'latched:eligibility_renewal'
    : 'latched:rise_from_recent_low';
};

export const ENTRY_GATES_NOTE =
  'Descriptive counts of one run. A blocked or added entry changes every later decision (path dependence), so these ' +
  'are not the effect of the filter or of eligibility; compare a complete ON run with an otherwise identical OFF run ' +
  '(tools/paired-comparison.ts). Retrospective historical data only; not evidence that a rule makes trading safer.';

export const entryGatesMetricsOf = (sim: Simulation, rows: readonly LedgerRow[]) => {
  const g = sim.gates!;
  const rowOf = new Map(rows.map((row) => [row.trade, row]));
  const stats = (list: readonly LedgerRow[]) => {
    const closed = list.filter((row) => row.status === 'closed');

    return {
      entries: list.length,
      closed: closed.length,
      open: list.length - closed.length,
      wins: closed.filter((row) => row.net > 0).length,
      losses: closed.filter((row) => row.net < 0).length,
      breakeven: closed.filter((row) => row.net === 0).length,
      realizedNetUsd: sum(closed.map((row) => row.net)),
      unrealizedNetUsd: sum(list.filter((row) => row.status === 'open').map((row) => row.net)),
      interestUsd: sum(list.map((row) => row.interest))
    };
  };
  const bySource: Record<string, LedgerRow[]> = {};

  for (const row of rows) (bySource[entrySourceOf(sim, row.trade)] ??= []).push(row);

  const trend = g.trend
    ? {
        enabled: true as const,
        method: g.runtime.trend!.method,
        config: g.runtime.trend,
        evaluations: g.trend.evaluations,
        blockedByDecisionKind: g.gateBlocks,
        note: 'blockedByDecisionKind counts every blocked evaluation (a latched opportunity is evaluated at each completed bar while it waits)'
      }
    : { enabled: false as const };
  const e = g.eligibility;
  const ops = g.opportunities;
  const ended = (state: string) => ops.filter((o) => o.endState === state).length;
  const reasons: Record<string, number> = {};

  for (const o of ops)
    if (o.endState === 'invalidated')
      reasons[o.endReason!.split(':')[0]!] = (reasons[o.endReason!.split(':')[0]!] ?? 0) + 1;

  const decided = ops.filter((o) => Number.isFinite(o.decisionTime));
  const ages = decided.map((o) => o.ageSessionsAtDecision);
  const histogram: Record<string, number> = {};

  for (const a of ages) histogram[String(a)] = (histogram[String(a)] ?? 0) + 1;

  const opportunityTrades = decided.map((o) => o.trade).filter((t): t is VirtualTrade => Boolean(t && rowOf.has(t)));
  const eligibility = e
    ? {
        enabled: true as const,
        policy: e.policy,
        config: e,
        opportunities: ops.length,
        bySource: {
          rise_from_recent_low: ops.filter((o) => o.source === 'rise_from_recent_low').length,
          eligibility_renewal: ops.filter((o) => o.source === 'eligibility_renewal').length
        },
        endedBy: {
          consumed: ended('consumed'),
          expired: ended('expired'),
          invalidated: ended('invalidated'),
          superseded: ended('superseded'),
          unfilled_at_end: ended('unfilled_at_end'),
          end_of_data: ended('end_of_data')
        },
        invalidatedByReason: reasons,
        takenAtArming: decided.filter((o) => o.decisionTime === o.signalTime).length,
        takenLater: decided.filter((o) => o.decisionTime !== o.signalTime).length,
        everBlocked: ops.filter((o) => Number.isFinite(o.firstBlockedTime)).length,
        blockedEvaluations: {
          trend_veto: sum(ops.map((o) => o.blockedEvaluations.trend_veto)),
          insufficient_history: sum(ops.map((o) => o.blockedEvaluations.insufficient_history)),
          invalid_data: sum(ops.map((o) => o.blockedEvaluations.invalid_data)),
          capital_unavailable: sum(ops.map((o) => o.blockedEvaluations.capital_unavailable)),
          // v1.4.0, only with the Drawdown Recovery Gate ON
          ...(g.drawdown ? { drawdown_gate: sum(ops.map((o) => o.blockedEvaluations.drawdown_gate)) } : {})
        },
        ageSessionsAtDecision: {
          mean: ages.length ? sum(ages) / ages.length : null,
          median: median(ages),
          max: ages.length ? Math.max(...ages) : null,
          histogram
        },
        renewals: {
          watches: g.watches.length,
          resets: g.watches.filter((w) => Number.isFinite(w.resetTime)).length,
          endedBy: Object.fromEntries(
            [
              'renewed',
              'predicate_false_at_rebound',
              'lapsed',
              'superseded_by_crossing',
              'entry_taken',
              'end_of_data'
            ].map((k) => [k, g.watches.filter((w) => w.end === k).length])
          )
        },
        tradesFromOpportunities: stats(opportunityTrades.map((t) => rowOf.get(t)!))
      }
    : { enabled: false as const };

  return {
    trendFilter: trend,
    eligibility,
    capitalHook: g.runtime.capacity ? 'harness capacity hook (not Strategy Lab)' : null,
    bySource: Object.fromEntries(Object.entries(bySource).map(([k, list]) => [k, stats(list)])),
    note: ENTRY_GATES_NOTE
  };
};

// ----- v1.3.0 optional rules: descriptive counts -----

export const OPTIONAL_RULES_NOTE =
  'Descriptive counts of one run, not the effect of a rule: a stop, a breakout entry or a retained remainder changes ' +
  'every later decision (path dependence). Compare a complete ON run with an otherwise identical OFF run. Retrospective ' +
  'historical data only; the defaults are starting hypotheses, not optimised values.';

export const optionalRulesMetricsOf = (sim: Simulation, rows: readonly LedgerRow[]) => {
  const rules = sim.rules;
  const positions = rules ? [...rules.positions.values()] : [];
  const byRule = (fills: readonly ExitFill[]) => {
    const out: Record<string, number> = {};

    for (const f of fills) out[f.reason] = (out[f.reason] ?? 0) + 1;
    return out;
  };
  const breakout = sim.entryMethod === 'trend_breakout';
  const decisions = sim.outcomes;
  const initialStop = rules?.initialStop
    ? (() => {
        const finals = positions.filter((p) => p.closed).map((p) => p.fills.at(-1)!);
        const byStop = finals.filter((f) => f.rule === 'initial_stop');

        return {
          enabled: true as const,
          config: rules.initialStop,
          atrConvention:
            'simple mean of the true ranges (max(high, previous close) − min(low, previous close)) of the L sessions completed before the fill session',
          protectedPositions: positions.filter((p) => p.stop).length,
          blockedChecks: rules.blocked.length,
          blockedBySource: rules.blocked.reduce<Record<string, number>>(
            (a, b) => ((a[b.source] = (a[b.source] ?? 0) + 1), a),
            {}
          ),
          blockedByReason: rules.blocked.reduce<Record<string, number>>(
            (a, b) => ((a[b.check.reason] = (a[b.check.reason] ?? 0) + 1), a),
            {}
          ),
          exitsByInitialStop: byStop.length,
          exitsByInitialStopGap: byStop.filter((f) => f.reason === 'initial stop gap').length,
          exitsByInitialStopAssumedFill: byStop.filter((f) => f.execution === 'stop level').length,
          exitsOnEntrySession: positions.filter(
            (p) => p.closed && p.fills.at(-1)!.rule === 'initial_stop' && p.fills.at(-1)!.session === p.trade.entryIndex
          ).length
        };
      })()
    : { enabled: false as const };
  const retention = rules?.retention
    ? (() => {
        const withPartial = positions.filter((p) => p.fills.some((f) => f.partial));
        const partialFills = positions.flatMap((p) => p.fills.filter((f) => f.partial));
        const remainderFinals = withPartial.filter((p) => p.closed).map((p) => p.fills.at(-1)!);
        const rowOf = new Map(rows.map((r) => [r.trade, r]));

        return {
          enabled: true as const,
          config: rules.retention,
          positionsWithPartialSale: withPartial.length,
          partialFills: partialFills.length,
          partialFillsByReason: byRule(partialFills),
          partialFillsNetUsd: sum(partialFills.map((f) => f.net)),
          partialFillsAtALoss: partialFills.filter((f) => f.net < 0).length,
          remainderExitsByReason: byRule(remainderFinals),
          trendExitDecisions: sum(positions.map((p) => p.trendDecisions)),
          pendingTrendExitAtEnd: positions.filter((p) => !p.closed && p.pendingTrend).length,
          openRemainderAtEnd: withPartial.filter((p) => !p.closed).length,
          closedPositionsWithPartial: {
            count: remainderFinals.length,
            wins: withPartial.filter((p) => p.closed && rowOf.get(p.trade)!.net > 0).length,
            losses: withPartial.filter((p) => p.closed && rowOf.get(p.trade)!.net < 0).length,
            netUsd: sum(withPartial.filter((p) => p.closed).map((p) => rowOf.get(p.trade)!.net))
          },
          classification:
            'a position is ONE closed trade when its last share is sold, a win or a loss by its total net (all its fills); partial fills are reported separately'
        };
      })()
    : { enabled: false as const };

  return {
    entryMethod: sim.entryMethod,
    ...(breakout
      ? {
          breakout: {
            signals: decisions.length,
            taken: decisions.filter((o) => o.status === 'filled' || o.status === 'unfilled_at_end').length,
            rejectedWhileInvested: decisions.filter((o) => o.status === 'rejected').length,
            vetoed: decisions.filter((o) => o.status === 'vetoed').length
          }
        }
      : {}),
    initialStop,
    retention,
    note: OPTIONAL_RULES_NOTE
  };
};

// Every figure a Strategy Lab run shows for one symbol. A figure that cannot be computed is null with a reason in
// `unavailable`, never 0.
export const summarizeSimulation = (sim: Simulation, ds: Dataset) => {
  const rows = ledgerOf(sim, ds);
  const closed = rows.filter((row) => row.status === 'closed');
  const open = rows.find((row) => row.status === 'open') ?? null;
  const wins = closed.filter((row) => row.net > 0);
  const losses = closed.filter((row) => row.net < 0);
  const unavailable: Record<string, string> = {};
  const reasons: Record<string, number> = {};
  const rejected: Record<RejectReason, number> = { position_open: 0, order_pending: 0 };

  for (const row of closed) reasons[row.trade.exitReason] = (reasons[row.trade.exitReason] ?? 0) + 1;
  for (const o of sim.outcomes) if (o.status === 'rejected') rejected[o.reason as RejectReason]++;

  if (closed.length === 0) {
    unavailable.winRate = 'no closed trades';
    unavailable.holding = 'no closed trades';
  }

  const grossWins = sum(wins.map((row) => row.net));
  const grossLosses = -sum(losses.map((row) => row.net));

  if (losses.length === 0) unavailable.profitFactor = 'no losing closed trades';

  const sessions = sim.daily.length;
  const firstOpen = ds.bTime[ds.sBarStart[sim.firstSession]!]!;
  const lastClose = ds.sCloseTime[sim.endSession]!;
  const windowDays = (lastClose - firstOpen) / secondsPerDay;
  // v1.3.0: an open position with partial fills holds realized cash (its partial fills) and the marked remainder;
  // the partial fills count as realized, the remainder as unrealized (each exactly once). Otherwise as before.
  const openFills = open?.remainder ? open.exitFills! : null;
  const closedNet = sum(closed.map((row) => row.net));
  const realizedNet = openFills ? closedNet + open!.partialFillsNet! : closedNet;
  const unrealizedNet = openFills ? open!.remainder!.net : (open?.net ?? 0);
  const openPart = (pick: (f: ExitFill) => number) => (openFills ? sum(openFills.map(pick)) : 0);
  const reconciliation = reconcileWithFixedLedger(sim, ds);
  const identity = Math.max(0, ...rows.map((row) => Math.abs(row.identityResidual)));
  const lastDaily = sim.daily.at(-1);
  const drawdown = (stats: DrawdownStats) => ({
    maximumUsd: stats.maximum,
    percentOfNotional: (stats.maximum / sim.book.notional) * 100,
    peakTime: stats.maximum > 0 ? stats.peakTime : null,
    troughTime: stats.maximum > 0 ? stats.troughTime : null,
    peakValueUsd: stats.peakValue,
    troughValueUsd: stats.troughValue,
    recoveryTime: Number.isFinite(stats.recoveryTime) ? stats.recoveryTime : null
  });

  if (!open) unavailable.openPosition = 'no position open at the end of the window';

  return {
    rows,
    metrics: {
      sessions,
      window: { firstDate: ds.dates[sim.firstSession]!, lastDate: ds.dates[sim.endSession]!, calendarDays: windowDays },
      signals: {
        raw: sim.outcomes.length,
        filled: sim.outcomes.filter((o) => o.status === 'filled').length,
        rejected: sim.outcomes.filter((o) => o.status === 'rejected').length,
        rejectedByReason: rejected,
        unfilledAtEnd: sim.outcomes.filter((o) => o.status === 'unfilled_at_end').length,
        // v1.2.0 entry gates (only with a gate ON): raw crossings met while flat but not taken at their own decision
        ...(sim.gates || sim.rules?.initialStop
          ? {
              vetoed: sim.outcomes.filter((o) => o.status === 'vetoed').length,
              vetoedByReason: Object.fromEntries(
                ['trend_veto', 'insufficient_history', 'invalid_data', 'capital_unavailable', 'policy_invalidated'].map(
                  (r) => [r, sim.outcomes.filter((o) => o.status === 'vetoed' && o.reason === r).length]
                )
              ),
              deferred: sim.outcomes.filter((o) => o.status === 'deferred').length
            }
          : {})
      },
      trades: {
        filled: rows.length,
        closed: closed.length,
        open: open ? 1 : 0,
        wins: wins.length,
        losses: losses.length,
        breakeven: closed.length - wins.length - losses.length,
        winRatePercent: closed.length ? (wins.length / closed.length) * 100 : null,
        profitFactor: losses.length ? grossWins / grossLosses : null,
        averageNetUsd: closed.length ? closedNet / closed.length : null,
        bestNetUsd: closed.length ? Math.max(...closed.map((row) => row.net)) : null,
        worstNetUsd: closed.length ? Math.min(...closed.map((row) => row.net)) : null,
        exitReasons: reasons
      },
      pnl: {
        realizedGrossBeforeCostsUsd:
          sum(closed.map((row) => row.grossBeforeCosts)) + openPart((f) => f.grossBeforeCosts),
        realizedCostsUsd:
          sum(closed.map((row) => row.entryFriction + row.exitFriction)) + openPart((f) => f.entryCost + f.exitCost),
        realizedInterestUsd: sum(closed.map((row) => row.interest)) + openPart((f) => f.interest),
        realizedNetUsd: realizedNet,
        unrealized: open
          ? openFills
            ? {
                // the remainder of a position with partial fills (its partial fills are in realized)
                grossBeforeCostsUsd: open.remainder!.shares * (open.exitRawPrice - open.entryRawPrice),
                entryCostUsd: open.remainder!.shares * (open.entryPrice - open.entryRawPrice),
                accruedInterestUsd: open.remainder!.interest,
                netUsd: open.remainder!.net,
                markPrice: open.exitRawPrice,
                markDate: ds.dates[sim.endSession]!,
                exitCostCharged: false,
                remainderShares: open.remainder!.shares,
                remainderPrincipalUsd: open.remainder!.principal,
                partialFillsNetUsd: open.partialFillsNet!,
                positionNetUsd: open.net
              }
            : {
                grossBeforeCostsUsd: open.grossBeforeCosts,
                entryCostUsd: open.entryFriction,
                accruedInterestUsd: open.interest,
                netUsd: open.net,
                markPrice: open.exitRawPrice,
                markDate: ds.dates[sim.endSession]!,
                exitCostCharged: false
              }
          : null,
        totalMarkedNetUsd: realizedNet + unrealizedNet,
        totalInterestUsd: sum(rows.map((row) => row.interest)),
        totalCostsUsd: sum(rows.map((row) => row.entryFriction + row.exitFriction)),
        lastDailyMarkUsd: lastDaily?.marked ?? null
      },
      drawdown: { minute: drawdown(sim.minuteDrawdown), daily: drawdown(sim.dailyDrawdown) },
      occupancy: {
        sessionsInvested: sim.daily.filter((d) => d.investedDuringSession).length,
        sessionsHeldAtClose: sim.daily.filter((d) => d.heldAtClose).length,
        sessionsInvestedPercent: sessions
          ? (sim.daily.filter((d) => d.investedDuringSession).length / sessions) * 100
          : null,
        calendarDaysInvested: sum(rows.map((row) => row.calendarDaysHeld)),
        calendarTimeInvestedPercent:
          windowDays > 0 ? (sum(rows.map((row) => row.calendarDaysHeld)) / windowDays) * 100 : null
      },
      holding: {
        meanCalendarDays: closed.length ? sum(closed.map((row) => row.calendarDaysHeld)) / closed.length : null,
        medianCalendarDays: median(closed.map((row) => row.calendarDaysHeld)),
        longestCalendarDays: rows.length ? Math.max(...rows.map((row) => row.calendarDaysHeld)) : null,
        medianSessions: median(closed.map((row) => row.sessionsHeld))
      },
      attribution: attributionOf(rows),
      continuation: continuationMetricsOf(sim),
      ...(sim.gates ? { entryGates: entryGatesMetricsOf(sim, rows) } : {}),
      ...(sim.rules || sim.entryMethod !== 'rise_from_recent_low'
        ? { optionalRules: optionalRulesMetricsOf(sim, rows) }
        : {}),
      checks: {
        fixedLedgerMaxDifferenceUsd: reconciliation.maxDifference,
        identityMaxResidualUsd: identity,
        markedEqualsLedger: lastDaily ? Math.abs(lastDaily.marked - (realizedNet + unrealizedNet)) : 0,
        minuteMarks: sim.minuteMarks
      },
      unavailable
    }
  };
};
