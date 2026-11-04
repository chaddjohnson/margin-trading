// rise-from-recent-low-trading v1.0.0: a growth-following trading backtest of ONE symbol (see README.md).
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
  type ReboundSignal,
  type Setup,
  type SetupKind,
  type StrategyParams,
  secondsPerDay,
  strategies
} from '../shared-margin-portfolio/strategy.ts';

export const STRATEGY_KEY = 'rise-from-recent-low-trading';
export const STRATEGY_VERSION = '1.0.0';

export interface RiseTradingParams {
  advanceFromRecentLowPercent: number; // X, percent
  recentLowLookbackBars: number; // N, bars of `resolution`
  resolution: SignalResolution;
  trailingStopPercent: number; // mandatory: the stop sits this far below the post-entry high
  maximumHoldEnabled: boolean;
  maximumHoldDays: number; // calendar days between session dates
  intradayLossBufferEnabled: boolean; // only together with the maximum hold
  intradayLossBufferPercent: number; // net loss after interest, percent of the invested notional
  costBpsPerSide: number; // basis points on every fill
}

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

export const tradingParamErrors = (p: RiseTradingParams): string[] => {
  const errors: string[] = [];
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

  if (
    !finite(p.advanceFromRecentLowPercent) ||
    p.advanceFromRecentLowPercent <= 0 ||
    p.advanceFromRecentLowPercent > 100
  )
    errors.push('advanceFromRecentLowPercent must be in (0, 100]');
  if (!Number.isInteger(p.recentLowLookbackBars) || p.recentLowLookbackBars < 2)
    errors.push('recentLowLookbackBars must be an integer ≥ 2');
  if (!isSignalResolution(p.resolution)) errors.push(`resolution ${String(p.resolution)} is not supported`);
  if (!finite(p.trailingStopPercent) || p.trailingStopPercent <= 0 || p.trailingStopPercent >= 100)
    errors.push('trailingStopPercent must be in (0, 100)');
  if (typeof p.maximumHoldEnabled !== 'boolean') errors.push('maximumHoldEnabled must be true or false');
  if (!Number.isInteger(p.maximumHoldDays) || p.maximumHoldDays < 1)
    errors.push('maximumHoldDays must be an integer ≥ 1');
  if (typeof p.intradayLossBufferEnabled !== 'boolean') errors.push('intradayLossBufferEnabled must be true or false');
  if (!finite(p.intradayLossBufferPercent) || p.intradayLossBufferPercent < 0 || p.intradayLossBufferPercent >= 100)
    errors.push('intradayLossBufferPercent must be in [0, 100)');
  if (p.intradayLossBufferEnabled === true && p.maximumHoldEnabled === false)
    errors.push(
      'the buffered intraday-loss exit applies only from the maximum losing-hold age: switch it off, or switch the maximum losing hold on'
    );
  if (!finite(p.costBpsPerSide) || p.costBpsPerSide < 0 || p.costBpsPerSide >= 1000)
    errors.push('costBpsPerSide must be in [0, 1000)');

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

// The effective exit configuration as the unchanged ExitManager reads it. Only its exit fields are used; the D1 entry
// fields are neutralised (the entry machine is never asked for a signal).
export const exitParamsOf = (p: RiseTradingParams): StrategyParams => {
  assertTradingParams(p);

  const hold = p.maximumHoldEnabled;

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

// ----- decisions -----

export interface EntryDecision {
  id: string;
  sessionIndex: number; // the dataset session the decision is made in
  time: number; // Unix seconds: when it is first knowable (the signal bar's end)
  price: number; // the decision price: the signal bar's close
  trigger: number; // the scanner's threshold price (NaN for other decision sources)
  reference: number; // the scanner's recent low (NaN for other decision sources)
  signal?: RiseSignal;
}

export type RejectReason = 'position_open' | 'order_pending';

export interface DecisionOutcome {
  decision: EntryDecision;
  status: 'filled' | 'rejected' | 'unfilled_at_end';
  reason: RejectReason | null;
  trade: VirtualTrade | null; // the trade it opened, or (rejected) the trade holding the position or the order
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

// ----- the simulation -----

export interface SimulationOptions {
  symbol: string;
  firstSession: number; // the first session simulated (the window's first)
  endSession: number; // the last
  exit: StrategyParams;
  book: BookSettings;
  originSession?: number; // where the drawdown trackers start (default firstSession)
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
}

// The last regular-session minute that completes at or before `time` (informational: the decision's bar).
const lastMinuteBefore = (ds: Dataset, s: number, time: number) => {
  const start = ds.sBarStart[s]!;
  let k = ds.sBarCount[s]! - 1;

  while (k >= 0 && ds.bTime[start + k]! + 60 > time) k--;

  return k;
};

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

  // The book's own entry machine is constructed but never asked for a signal; arming would start after the data.
  const book = new ShadowBook(
    options.symbol as Sym,
    STRATEGY_KEY as PhenotypeName,
    ds,
    options.exit,
    options.book,
    ds.sessionCount
  );
  const outcomes: DecisionOutcome[] = [];
  const byTrade = new Map<VirtualTrade, DecisionOutcome>();
  const excursions = new Map<VirtualTrade, Excursion>();
  const daily: DailyMark[] = [];
  const minute = new Tracker(0, ds.bTime[ds.sBarStart[origin]!]!);
  const session = new Tracker(0, ds.sTime[origin]!);
  let realized = 0;
  let minuteMarks = 0;
  let next = 0;

  const decide = (d: EntryDecision, s: number) => {
    if (book.position) {
      outcomes.push({ decision: d, status: 'rejected', reason: 'position_open', trade: book.position.trade });
      return;
    }

    if (book.order) {
      outcomes.push({ decision: d, status: 'rejected', reason: 'order_pending', trade: book.order.trade });
      return;
    }

    const setup: Setup = {
      id: outcomes.length + 1,
      kind: 'rise' as string as SetupKind, // ShadowBook only records it; not a D1 setup kind
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
    const outcome: DecisionOutcome = { decision: d, status: 'unfilled_at_end', reason: null, trade };

    outcomes.push(outcome);
    byTrade.set(trade, outcome);
  };

  for (let s = firstSession; s <= endSession; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const sessionTime = ds.sTime[s]!;

    book.beginSession(s);

    let invested = Boolean(book.position);

    for (let k = 0; k <= count; k++) {
      const t = k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!;

      while (next < decisions.length && decisions[next]!.sessionIndex === s && decisions[next]!.time <= t) {
        decide(decisions[next]!, s);
        next++;
      }

      const exit = book.exitAt(k);

      if (exit) {
        realized += book.close(s, exit).net;
      }

      if (book.fillAt(k)) {
        const trade = book.open(s, k);

        byTrade.get(trade)!.status = 'filled';
        excursions.set(trade, { worst: Infinity, worstTime: NaN, best: -Infinity, bestTime: NaN, marks: 0 });
        invested = true;
      }

      const price = k < count ? ds.bClose[start + k]! : ds.sClose[s]!;
      const mark = book.markAt(price, sessionTime);

      minute.updateStrict(realized + mark, t);
      minuteMarks++;

      if (book.position) {
        const x = excursions.get(book.position.trade)!;

        x.marks++;

        if (mark < x.worst) {
          x.worst = mark;
          x.worstTime = t;
        }

        if (mark > x.best) {
          x.best = mark;
          x.bestTime = t;
        }
      }
    }

    if (next < decisions.length && decisions[next]!.sessionIndex === s)
      throw new Error(`decision ${decisions[next]!.id} comes after the close of ${ds.dates[s]}`);

    book.afterSession(s);

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
    realized
  };
};

// ----- the whole strategy on loaded sessions -----

export interface RiseTradingRun {
  params: RiseTradingParams;
  ds: Dataset;
  bars: SignalBar[];
  firstSignalBar: number;
  scan: RiseScan;
  decisions: EntryDecision[];
  simulation: Simulation;
}

// `history` = warm-up sessions followed by the window (src/lib/evaluation.ts loadDatasetSessions); `warmup` = how many.
export const runRiseTrading = (
  symbol: string,
  history: MarketSession[],
  warmup: number,
  params: RiseTradingParams,
  dataHash = 'unhashed'
): RiseTradingRun => {
  assertTradingParams(params);

  if (warmup >= history.length) throw new Error(`${symbol}: no session inside the window`);

  const scanParams: RiseFromRecentLowParams = {
    advanceFromRecentLowPercent: params.advanceFromRecentLowPercent,
    recentLowLookbackBars: params.recentLowLookbackBars
  };
  const bars = barsFromSessions(history, params.resolution);
  const first = bars.findIndex((bar) => bar.sessionIndex >= warmup);
  const firstSignalBar = first < 0 ? bars.length : first;
  const scan = scanRiseFromRecentLow(bars, scanParams, firstSignalBar);
  const ds = fixtureDataset(history);

  ds.id = `${symbol}:${dataHash.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = dataHash;

  const decisions = decisionsFromSignals(bars, scan.signals);
  const simulation = simulateTrading(ds, decisions, {
    symbol,
    firstSession: warmup,
    endSession: history.length - 1,
    exit: exitParamsOf(params),
    book: bookSettingsOf(params)
  });

  return { params, ds, bars, firstSignalBar, scan, decisions, simulation };
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
}

export const ledgerOf = (sim: Simulation, ds: Dataset): LedgerRow[] =>
  sim.trades.map((trade, i) => {
    const open = trade.exitIndex < 0;
    const lastIndex = open ? sim.endSession : trade.exitIndex;
    const endTime = open ? ds.sCloseTime[sim.endSession]! : trade.exitTime;
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
  for (const o of sim.outcomes) if (o.status === 'rejected') rejected[o.reason!]++;

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
  const realizedNet = sum(closed.map((row) => row.net));
  const unrealizedNet = open?.net ?? 0;
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
        unfilledAtEnd: sim.outcomes.filter((o) => o.status === 'unfilled_at_end').length
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
        averageNetUsd: closed.length ? realizedNet / closed.length : null,
        bestNetUsd: closed.length ? Math.max(...closed.map((row) => row.net)) : null,
        worstNetUsd: closed.length ? Math.min(...closed.map((row) => row.net)) : null,
        exitReasons: reasons
      },
      pnl: {
        realizedGrossBeforeCostsUsd: sum(closed.map((row) => row.grossBeforeCosts)),
        realizedCostsUsd: sum(closed.map((row) => row.entryFriction + row.exitFriction)),
        realizedInterestUsd: sum(closed.map((row) => row.interest)),
        realizedNetUsd: realizedNet,
        unrealized: open
          ? {
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
