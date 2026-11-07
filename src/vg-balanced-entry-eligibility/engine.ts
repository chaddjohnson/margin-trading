// The research adapter of vg-balanced-entry-eligibility (research/vg-balanced-entry-eligibility/PROTOCOL.md §4): the
// fixed-pool path of the N-book engine (src/portfolio-aware-d1/nbook/engine.ts runNAllocator, mode 'fixed'), copied
// statement for statement in the same order, plus an optional bounded entry eligibility for D1 signals refused because
// the single slot was occupied or reserved. With eligibility OFF (no ETF enabled, no diagnostic option) every output
// equals runNAllocator's exactly (parity.ts checks every trade, lot, signal, daily row and drawdown).
//
// Eligibility ON, per enabled ETF (§4 of the protocol):
// - a genuine shadow-book D1 signal refused with "pool occupied" / "pool reserved" ARMS one opportunity (at most one
//   live per ETF; never while that ETF holds a real lot), with its immutable origin (decision time, price, setup,
//   trigger, trailing low, the refused shadow trade);
// - at every completed minute of that ETF the opportunity is cancelled if the minute's low is below the setup's
//   trailing low; it is cancelled when the originating shadow trade closes; it expires at the close of session
//   origin + A (A = maximum age in completed sessions);
// - when the slot is free after the minute's fresh decisions (fresh signals first, incumbent tie order), a live
//   opportunity REVALIDATES on that minute's close: trigger ≤ close ≤ decision price × (1 + E); the oldest origin
//   wins, then alphabetical; the winner reserves the slot and fills at the first trade after the decision;
// - the late lot is a new position: its own fill, shares, costs, interest start, holding age and post-entry high,
//   managed by D1's own exit rules (ExitManager) independently of the shadow trade, which keeps its own life.
//   Its exit releases the slot; the shadow books never see it.
import type { Dataset } from '../four-family/data.ts';
import type { PhenotypeName, Sym } from '../multi-etf-allocator/context.ts';
import { protocol } from '../multi-etf-allocator/context.ts';
import { type DrawdownStats, Tracker } from '../multi-etf-allocator/engine.ts';
import { FixedLedger } from '../multi-etf-allocator/ledger.ts';
import type { RealLot } from '../multi-etf-allocator/ledger.ts';
import type { ScheduleKey } from '../multi-etf-allocator/margin.ts';
import { type VirtualTrade, ShadowBook } from '../multi-etf-allocator/shadow.ts';
import {
  type NDailyRow,
  type NRunConfig,
  type NRunResult,
  type NSignalRecord,
  type NUniverse,
  bookOrderOf,
  lotKeysOf,
  tieOrderOf
} from '../portfolio-aware-d1/nbook/engine.ts';
import type { Lot, Prices } from '../portfolio-aware-d1/nbook/ledger.ts';
import { emptyValuesOf, lmvOf, securitiesOf } from '../portfolio-aware-d1/nbook/margin.ts';
import {
  type ExitDecision,
  type LotState,
  type ReboundSignal,
  ExitManager,
  firstTradeAfterDecision,
  interestOn,
  priceAt,
  secondsPerMinute,
  timeAt,
  tradeExecution
} from '../shared-margin-portfolio/strategy.ts';

// ----- the variant's configuration -----

export interface EtfEligibility {
  maxAgeSessions: number; // A: selectable while (session index − origin session index) ≤ A
  maxExtension: number; // E: close ≤ original decision price × (1 + E); a fraction (0.01 = 1%)
}

export interface Period {
  name: string;
  first: string; // first session date (inclusive)
  last: string; // last session date (inclusive)
}

export interface VRunConfig extends NRunConfig {
  eligibility?: Partial<Record<string, EtfEligibility>>; // absent or {} = OFF
  periods?: readonly Period[]; // period minute drawdowns, reset at each period's start (report only)
  blackouts?: readonly { first: string; last: string }[]; // diagnostic: no new funding in these sessions
  lateEntryFill?: 'next trade' | 'fill-minute high'; // stress: delayed entries fill at the fill minute's high
  // PROTOCOL.md §4.3b: 'minute low' (the protocol); 'minute close' and 'none' are §9's report-only sensitivity
  invalidation?: 'minute low' | 'minute close' | 'none';
}

export type OppStatus = 'armed' | 'pending' | 'selected' | 'filled' | 'expired' | 'cancelled' | 'live at end';

export interface Opportunity {
  id: number;
  symbol: string;
  phenotype: string;
  originIndex: number;
  originDate: string;
  originBar: number;
  originTime: number; // the refused decision's time (end of its confirming minute)
  originPrice: number; // the refused decision's price (that minute's close)
  trigger: number; // D1's rebound trigger at the refusal: trailing low × (1 + Y)
  trailingLow: number;
  setupId: number;
  setupKind: string;
  shadowTradeId: number; // the refused shadow trade (its book's trade id)
  refusalReason: string;
  occupiedBy: string;
  maxAgeSessions: number;
  maxExtension: number;
  cap: number; // originPrice × (1 + E)
  status: OppStatus;
  endReason: string;
  endIndex: number;
  endTime: number;
  firstFreeTime: number; // the first minute it was evaluated on a free slot (NaN if never)
  selectedTime: number;
  selectedPrice: number;
  selectedAge: number;
  lotId: number;
}

export type TransitionKind =
  | 'armed'
  | 'not armed'
  | 'pending'
  | 'revalidated'
  | 'rejected'
  | 'selected'
  | 'filled'
  | 'expired'
  | 'cancelled'
  | 'live at end';

export interface Transition {
  kind: TransitionKind;
  opportunity: number; // 0 for 'not armed'
  symbol: string;
  index: number;
  date: string;
  time: number; // the minute's decision time (bar start + 60 s), a fill/exit time, or the close
  price: number; // the minute's close, the fill price, or NaN
  age: number; // completed sessions since the origin
  reason: string;
}

export interface LateTrade extends VirtualTrade {
  opportunityId: number;
  originTradeId: number;
  originIndex: number;
  originTime: number;
  originPrice: number;
  originTrigger: number;
  originTrailingLow: number;
  ageAtDecision: number;
}

export interface VRunResult extends Omit<NRunResult, 'config'> {
  config: VRunConfig;
  opportunities: Opportunity[];
  transitions: Transition[];
  lateTrades: LateTrade[];
  periodDrawdowns: Record<string, DrawdownStats & { startValue: number; startTime: number; endValue: number }>;
}

interface Reservation {
  trade: VirtualTrade;
  symbol: string;
  principal: number;
  equity: number;
  slot: number;
  decisionIndex: number;
}

interface LateOrder {
  opp: Opportunity;
  trade: LateTrade;
  reservation: Reservation;
  fillIndex: number; // −1 until the fill session is known (decided after the last trade of a session)
  fillBar: number;
}

interface LatePosition {
  opp: Opportunity;
  trade: LateTrade;
  lot: RealLot;
  state: LotState;
  exit: ExitManager;
  decision: ExitDecision | undefined;
}

export const isEligibilityOn = (config: VRunConfig) =>
  Object.values(config.eligibility ?? {}).some((value) => value !== undefined);

export const runVariant = (universe: NUniverse, config: VRunConfig): VRunResult => {
  if (config.mode !== 'fixed') {
    throw new Error(`${config.key}: the eligibility adapter runs the fixed pool only`);
  }

  const endIndex = Math.min(config.endIndex ?? universe.sessionCount - 1, universe.sessionCount - 1);
  const armStart = config.eligibilityIndex ?? universe.eligibilityIndex;
  const startIndex = config.accountingStartIndex ?? 0;

  if (!(startIndex >= 0 && startIndex < endIndex && armStart >= startIndex)) {
    throw new Error(
      `${config.key}: accounting start ${startIndex} must precede the end ${endIndex} and arming ${armStart}`
    );
  }

  const eligibility = config.eligibility ?? {};

  for (const [symbol, setting] of Object.entries(eligibility)) {
    if (!setting) continue;
    if (!config.symbols.includes(symbol)) throw new Error(`${config.key}: eligibility for ${symbol}, not a book`);
    if (!(Number.isInteger(setting.maxAgeSessions) && setting.maxAgeSessions >= 0))
      throw new Error(`${config.key}: ${symbol} maximum age ${setting.maxAgeSessions}`);
    if (!(setting.maxExtension >= 0)) throw new Error(`${config.key}: ${symbol} extension ${setting.maxExtension}`);
  }

  if (isEligibilityOn(config) && config.fixedPrincipal !== protocol.notional) {
    throw new Error(`${config.key}: a late lot sizes like a fresh one only with the ${protocol.notional} notional`);
  }

  const securities = securitiesOf(config.symbols);
  const lotKeys = lotKeysOf(config.symbols);
  const tieOrder = tieOrderOf(config.symbols);
  const instrumentOf = (security: string) => {
    const instrument = universe.instruments[security];

    if (!instrument) {
      throw new Error(`${config.key}: ${security} is not loaded`);
    }

    return instrument.ds;
  };
  const anyDs = instrumentOf(config.symbols[0]!);
  const dates = anyDs.dates;
  const sTime = anyDs.sTime;
  const closeTimes = anyDs.sCloseTime;
  const marketSecurities: string[] = [...config.symbols];
  const datasets = Object.fromEntries(marketSecurities.map((security) => [security, instrumentOf(security)])) as Record<
    string,
    Dataset
  >;
  const books = new Map<string, ShadowBook>();

  for (const symbol of config.symbols) {
    const phenotype = config.phenotypes[symbol];

    if (!phenotype || phenotype.symbol !== symbol) {
      throw new Error(`${config.key}: no phenotype for the ${symbol} book`);
    }

    books.set(
      symbol,
      new ShadowBook(
        symbol as Sym,
        phenotype.name as PhenotypeName,
        datasets[symbol]!,
        phenotype.params,
        {
          notional: protocol.notional,
          rate: config.rate,
          stopFill: config.stopFill,
          costBps: config.costBps,
          stopSlippageBps: config.stopSlippageBps
        },
        armStart
      )
    );
  }

  const fixed = new FixedLedger(config.rate, config.costBps);
  const lots = (): Lot[] => fixed.open as unknown as Lot[];
  const allLots = (): Lot[] => fixed.lots as unknown as Lot[];
  const reservations: Reservation[] = [];
  const signals: NSignalRecord[] = [];
  const daily: NDailyRow[] = [];
  const lotById = new Map<number, Lot>();
  const passive = [...new Set([...config.passiveSchedules, config.baseSchedule])] as ScheduleKey[];
  const minimum: NRunResult['minimum'] = {};
  const minutesBelow: NRunResult['minutesBelow'] = {};
  let lotId = 0;
  let poolChecks = 0;

  for (const schedule of passive) {
    minimum[schedule] = { ratio: Infinity, time: NaN, excess: Infinity, excessTime: NaN, dailyRatio: Infinity };
    minutesBelow[schedule] = { warning: 0, critical: 0 };
  }

  // ----- the variant's state -----

  const opportunities: Opportunity[] = [];
  const transitions: Transition[] = [];
  const lateTrades: LateTrade[] = [];
  const live = new Map<string, Opportunity>();
  const latePositions = new Map<string, LatePosition>();
  let lateOrder: LateOrder | undefined;
  const blackouts = config.blackouts ?? [];
  const inBlackout = (s: number) => blackouts.some((b) => b.first <= dates[s]! && dates[s]! <= b.last);

  const note = (
    kind: TransitionKind,
    opp: Opportunity | undefined,
    symbol: string,
    s: number,
    time: number,
    price: number,
    reason: string
  ) => {
    transitions.push({
      kind,
      opportunity: opp?.id ?? 0,
      symbol,
      index: s,
      date: dates[s]!,
      time,
      price,
      age: opp ? s - opp.originIndex : NaN,
      reason
    });
  };

  const end = (opp: Opportunity, status: OppStatus, s: number, time: number, price: number, reason: string) => {
    opp.status = status;
    opp.endReason = reason;
    opp.endIndex = s;
    opp.endTime = time;
    live.delete(opp.symbol);
    note(
      status === 'live at end' ? 'live at end' : (status as TransitionKind),
      opp,
      opp.symbol,
      s,
      time,
      price,
      reason
    );
  };

  // ----- marks -----

  const lastClose = Object.fromEntries(securities.map((security) => [security, NaN])) as Prices;
  const lastCloseTime = Object.fromEntries(securities.map((security) => [security, NaN])) as Record<string, number>;

  const lotSharesOf = () => {
    const shares = Object.fromEntries(lotKeys.map((key) => [key, 0])) as Record<string, number>;

    for (const lot of lots()) {
      shares[lot.symbol] = shares[lot.symbol]! + lot.shares;
    }

    return shares;
  };

  const startValue = 0;
  const firstDs = datasets[marketSecurities[0]!]!;
  const firstBarTime = firstDs.bTime[firstDs.sBarStart[startIndex]!]!;
  const equityTracker = new Tracker(startValue, sTime[startIndex]!);
  const minuteTracker = new Tracker(startValue, firstBarTime);

  // Period trackers (report only): each starts at the close before its first session with the marked value there.
  const periods = config.periods ?? [];
  const periodTrackers = new Map<
    string,
    { tracker: Tracker; startValue: number; startTime: number; endValue: number }
  >();
  const activePeriods: { period: Period; tracker: Tracker }[] = [];

  // ----- the allocator's gate (shadow policy: one pool, one lot or reservation at a time) -----

  const occupancy = () => {
    const open = lots();
    const parts = [
      ...open.map((lot) => `${lot.symbol} lot ${lot.id}`),
      ...reservations.map((reservation) => `${reservation.symbol} pending order`)
    ];

    return { count: open.length + reservations.length, label: parts.join('+') };
  };

  const staleAges = (decisionTime: number) => {
    const ages: Partial<Record<string, number>> = {};

    for (const security of marketSecurities) {
      ages[security] = decisionTime - lastCloseTime[security]!;
    }

    return ages;
  };

  interface Gate {
    grant: boolean;
    reason: string;
    principal: number;
    equity: number;
    slot: number;
    regTMaximum: number;
    houseMaximum: number;
    maxima: Partial<Record<ScheduleKey, number>>;
  }

  const gate = (_symbol: string, s: number): Gate => {
    poolChecks++;

    const { count, label } = occupancy();
    const slots = 1;
    const usedSlots = new Set([
      ...lots().map((lot) => lot.slot),
      ...reservations.map((reservation) => reservation.slot)
    ]);
    const slot = usedSlots.has(0) ? 1 : 0;
    const refused = (reason: string, principal: number, equity = NaN, extra: Partial<Gate> = {}): Gate => ({
      grant: false,
      reason,
      principal,
      equity,
      slot: -1,
      regTMaximum: NaN,
      houseMaximum: NaN,
      maxima: {},
      ...extra
    });
    const principal = config.fixedPrincipal;

    if (count >= slots) {
      return refused(`pool occupied (${label})`, principal);
    }

    if (blackouts.length > 0 && inBlackout(s)) {
      return refused('blackout (diagnostic)', principal);
    }

    return { ...refused('', principal), grant: true, slot };
  };

  // ----- entries -----

  const assertPoolCap = (s: number, time: number) => {
    const open = lots();

    if (open.length + reservations.length > 1) {
      throw new Error(
        `${config.key}: ${open.length} lots + ${reservations.length} reservations exceed 1 at ${dates[s]} ${time}`
      );
    }
  };

  const openRealLot = (
    symbol: string,
    trade: VirtualTrade,
    reservation: Reservation,
    s: number,
    k: number,
    raw: number,
    execution: VirtualTrade['entryExecution']
  ) => {
    const ds = datasets[symbol]!;
    const time = timeAt(ds, s, k);
    const price = fixed.buyPrice(raw);
    const shares = reservation.principal / price;
    const principal = reservation.principal;
    const fields = {
      id: ++lotId,
      symbol: symbol,
      trade,
      slot: reservation.slot,
      shares,
      entryIndex: s,
      entryBar: k,
      entryTime: time,
      entryRawPrice: raw,
      entryPrice: price,
      entryExecution: execution,
      entryTimestamp: sTime[s]!,
      decisionIndex: reservation.decisionIndex,
      decisionTime: trade.decisionTime,
      decisionPrice: trade.decisionPrice,
      equityAtDecision: reservation.equity,
      fraction: NaN,
      originalPrincipal: principal,
      principal,
      accruedBefore: 0,
      accrualStart: sTime[s]!,
      posted: 0,
      accrued: 0,
      repaidByCore: 0,
      dividends: 0
    };
    const lot = fixed.openLot(fields as unknown as Parameters<FixedLedger['openLot']>[0]) as unknown as Lot;

    lotById.set(lot.id, lot);
    trade.fundedLotId = lot.id;
    reservations.splice(reservations.indexOf(reservation), 1);

    return lot;
  };

  // ----- exits -----

  const exitRealLot = (
    lot: Lot,
    s: number,
    bar: number,
    time: number,
    rawPrice: number,
    reason: Lot['exitReason'],
    execution: VirtualTrade['exitExecution'],
    extraSlippage: number
  ) => {
    const sessionTime = sTime[s]!;

    fixed.closeLot(lot as unknown as RealLot, {
      index: s,
      bar,
      time,
      rawPrice,
      reason,
      execution,
      sessionTime,
      extraSlippage
    });
  };

  // ----- eligibility: arming, invalidation, revalidation, selection, late lots -----

  const oppTrade = new Map<Opportunity, VirtualTrade>(); // each opportunity's originating (refused) shadow trade
  const lastPending = new Map<Opportunity, string>(); // the last logged failing boundary (logged on change only)

  const armIfEligible = (
    book: ShadowBook,
    signal: ReboundSignal,
    record: NSignalRecord,
    trade: VirtualTrade,
    s: number
  ) => {
    const setting = eligibility[book.symbol];

    if (!setting) return;

    const symbol = book.symbol as string;
    const time = signal.decisionTime;

    if (!/^pool (occupied|reserved)/.test(record.reason)) {
      note(
        'not armed',
        undefined,
        symbol,
        s,
        time,
        signal.decisionPrice,
        `refusal is not for capital: ${record.reason}`
      );
      return;
    }

    if (lots().some((lot) => lot.symbol === symbol) || (lateOrder && lateOrder.opp.symbol === symbol)) {
      note(
        'not armed',
        undefined,
        symbol,
        s,
        time,
        signal.decisionPrice,
        `${symbol} already holds the real lot or order`
      );
      return;
    }

    if (live.has(symbol)) {
      note(
        'not armed',
        undefined,
        symbol,
        s,
        time,
        signal.decisionPrice,
        `${symbol} already has live opportunity ${live.get(symbol)!.id}`
      );
      return;
    }

    const opp: Opportunity = {
      id: opportunities.length + 1,
      symbol,
      phenotype: book.phenotype,
      originIndex: s,
      originDate: dates[s]!,
      originBar: signal.barIndex,
      originTime: time,
      originPrice: signal.decisionPrice,
      trigger: signal.trigger,
      trailingLow: signal.trailingLow,
      setupId: signal.setup.id,
      setupKind: signal.setup.kind,
      shadowTradeId: trade.id,
      refusalReason: record.reason,
      occupiedBy: record.occupiedBy,
      maxAgeSessions: setting.maxAgeSessions,
      maxExtension: setting.maxExtension,
      cap: signal.decisionPrice * (1 + setting.maxExtension),
      status: 'armed',
      endReason: '',
      endIndex: -1,
      endTime: NaN,
      firstFreeTime: NaN,
      selectedTime: NaN,
      selectedPrice: NaN,
      selectedAge: NaN,
      lotId: -1
    };

    opportunities.push(opp);
    live.set(symbol, opp);
    oppTrade.set(opp, trade);
    lastPending.set(opp, '');
    note(
      'armed',
      opp,
      symbol,
      s,
      time,
      signal.decisionPrice,
      `${record.reason}; ${signal.setup.kind} setup ${signal.setup.id}; trigger ${signal.trigger}, trailing low ${signal.trailingLow}, cap ${opp.cap}; A ${setting.maxAgeSessions}, E ${setting.maxExtension}`
    );
  };

  // The band test on a completed minute's close: '' when it revalidates, else the failing boundary.
  const bandOf = (opp: Opportunity, close: number) =>
    close < opp.trigger
      ? `close ${close} below the original trigger ${opp.trigger}`
      : close > opp.cap
        ? `close ${close} above the extension cap ${opp.cap}`
        : '';

  const placeLateOrder = (opp: Opportunity, s: number, k: number, close: number) => {
    const ds = datasets[opp.symbol]!;
    const shadow = oppTrade.get(opp)!;
    const decisionTime = ds.bTime[ds.sBarStart[s]! + k]! + secondsPerMinute;
    const trade: LateTrade = {
      ...shadow,
      id: lateTrades.length + 1,
      decisionIndex: s,
      decisionBar: k,
      decisionTime,
      decisionPrice: close,
      carriedOvernight: false,
      entryIndex: -1,
      entryBar: -1,
      entryTime: NaN,
      entryRawPrice: NaN,
      entryPrice: NaN,
      entryExecution: '',
      shares: 0,
      investment: 0,
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitRawPrice: NaN,
      exitPrice: NaN,
      exitReason: 'open',
      exitExecution: '',
      exitStopPrice: NaN,
      stopActiveAtExit: false,
      maximumHoldDue: false,
      bufferSignalTime: NaN,
      bufferSignalPrice: NaN,
      interest: 0,
      gross: 0,
      net: 0,
      stopFirstActiveIndex: -1,
      stopActiveSessions: 0,
      allocator: 'granted',
      fundedLotId: -1,
      opportunityId: opp.id,
      originTradeId: opp.shadowTradeId,
      originIndex: opp.originIndex,
      originTime: opp.originTime,
      originPrice: opp.originPrice,
      originTrigger: opp.trigger,
      originTrailingLow: opp.trailingLow,
      ageAtDecision: s - opp.originIndex
    };
    const reservation: Reservation = {
      trade,
      symbol: opp.symbol,
      principal: config.fixedPrincipal,
      equity: NaN,
      slot: 0,
      decisionIndex: s
    };
    const fillBar = firstTradeAfterDecision(ds, s, decisionTime);

    lateTrades.push(trade);
    reservations.push(reservation);
    assertPoolCap(s, decisionTime);
    lateOrder = { opp, trade, reservation, fillIndex: fillBar < 0 ? -1 : s, fillBar };

    if (fillBar < 0) trade.carriedOvernight = true;

    opp.status = 'selected';
    opp.selectedTime = decisionTime;
    opp.selectedPrice = close;
    opp.selectedAge = s - opp.originIndex;
    live.delete(opp.symbol);
    note(
      'selected',
      opp,
      opp.symbol,
      s,
      decisionTime,
      close,
      `slot free; reserved, fills at the first trade after ${decisionTime}`
    );
  };

  const fillLateOrder = (s: number, k: number) => {
    const order = lateOrder!;
    const { opp, trade, reservation } = order;
    const ds = datasets[opp.symbol]!;
    const book = books.get(opp.symbol)!;
    const raw =
      config.lateEntryFill === 'fill-minute high' && k < ds.sBarCount[s]!
        ? Math.max(ds.bOpen[ds.sBarStart[s]! + k]!, ds.bHigh[ds.sBarStart[s]! + k]!)
        : priceAt(ds, s, k);
    const execution = k === 0 && trade.decisionIndex < s ? 'opening trade' : tradeExecution(ds, s, k);
    const lot = openRealLot(opp.symbol, trade, reservation, s, k, raw, execution);
    const price = lot.entryPrice;
    const state: LotState = {
      entryPrice: price,
      shares: lot.shares,
      investment: lot.principal,
      entryTimestamp: sTime[s]!,
      holdTimestamp: sTime[s]!
    };
    const exit = new ExitManager(ds, book.params, { stopFill: config.stopFill, marginInterestRate: config.rate });

    trade.entryIndex = s;
    trade.entryBar = k;
    trade.entryTime = timeAt(ds, s, k);
    trade.entryRawPrice = raw;
    trade.entryPrice = price;
    trade.entryExecution = execution;
    trade.shares = lot.shares;
    trade.investment = lot.principal;
    exit.onEntry(state, s, k, raw);
    latePositions.set(opp.symbol, {
      opp,
      trade,
      lot: lot as unknown as RealLot,
      state,
      exit,
      decision: undefined
    });
    opp.status = 'filled';
    opp.lotId = lot.id;
    lateOrder = undefined;
    note(
      'filled',
      opp,
      opp.symbol,
      s,
      trade.entryTime,
      raw,
      `lot ${lot.id}: ${execution}, ${lot.shares} shares at ${price}`
    );
  };

  const closeLatePosition = (position: LatePosition, s: number, decision: ExitDecision) => {
    const { trade, state, exit, lot } = position;
    const isStop = decision.reason === 'trailing stop' || decision.reason === 'trailing stop gap';
    const extraSlippage = isStop ? config.stopSlippageBps / 10000 : 0;

    exitRealLot(
      lot as unknown as Lot,
      s,
      decision.barIndex,
      decision.time,
      decision.price,
      decision.reason,
      decision.execution,
      extraSlippage
    );

    const price = fixed.sellPrice(decision.price) * (1 - extraSlippage);
    const interest = interestOn(state, config.rate, sTime[s]!);
    const proceeds = state.shares * price;

    trade.exitIndex = s;
    trade.exitBar = decision.barIndex;
    trade.exitTime = decision.time;
    trade.exitRawPrice = decision.price;
    trade.exitPrice = price;
    trade.exitReason = decision.reason;
    trade.exitExecution = decision.execution;
    trade.exitStopPrice = exit.stopPrice;
    trade.stopActiveAtExit = decision.stopActive;
    trade.maximumHoldDue = decision.isMaximumHoldDue;
    trade.bufferSignalTime = decision.signalTime;
    trade.bufferSignalPrice = decision.signalPrice;
    trade.interest = interest;
    trade.gross = proceeds - state.investment;
    trade.net = proceeds - state.investment - interest;
    trade.stopFirstActiveIndex = exit.stopFirstActiveIndex;
    trade.stopActiveSessions = exit.stopActiveSessions;
    latePositions.delete(trade.symbol);
  };

  // At a completed minute of `symbol`: the trailing-low invalidation of its live opportunity.
  const invalidate = (symbol: string, s: number, k: number) => {
    const opp = live.get(symbol);

    if (!opp || (s === opp.originIndex && k <= opp.originBar)) return;

    const ds = datasets[symbol]!;
    const b = ds.sBarStart[s]! + k;
    const rule = config.invalidation ?? 'minute low';

    if (rule === 'none') return;

    const level = rule === 'minute low' ? ds.bLow[b]! : ds.bClose[b]!;

    if (level < opp.trailingLow) {
      end(
        opp,
        'cancelled',
        s,
        ds.bTime[b]! + secondsPerMinute,
        level,
        `setup invalidated: ${rule} ${level} below the trailing low ${opp.trailingLow}`
      );
    }
  };

  // After the minute's fresh decisions: delayed candidates on their own completed minutes, oldest origin first.
  const delayedDecisions = (s: number, freeBefore: boolean) => {
    if (live.size === 0) return;

    const free = occupancy().count === 0;

    if (!free && !freeBefore) return;

    const candidates = [...live.values()]
      .filter((opp) => atBar[opp.symbol]! >= 0)
      .sort((a, b) => a.originTime - b.originTime || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));
    let taken = !free;

    for (const opp of candidates) {
      const ds = datasets[opp.symbol]!;
      const k = atBar[opp.symbol]!;
      const b = ds.sBarStart[s]! + k;
      const close = ds.bClose[b]!;
      const time = ds.bTime[b]! + secondsPerMinute;
      const failing = bandOf(opp, close);

      if (Number.isNaN(opp.firstFreeTime)) opp.firstFreeTime = time;

      if (failing) {
        if (lastPending.get(opp) !== failing.replace(/[\d.]+/g, '#')) {
          lastPending.set(opp, failing.replace(/[\d.]+/g, '#'));
          opp.status = 'pending';
          note('pending', opp, opp.symbol, s, time, close, failing);
        }

        continue;
      }

      lastPending.set(opp, '');
      note('revalidated', opp, opp.symbol, s, time, close, `trigger ${opp.trigger} ≤ close ${close} ≤ cap ${opp.cap}`);

      if (taken) {
        note(
          'rejected',
          opp,
          opp.symbol,
          s,
          time,
          close,
          free ? 'an older opportunity took the slot' : 'a fresh signal took the slot'
        );
        opp.status = 'pending';
        continue;
      }

      if (blackouts.length > 0 && inBlackout(s)) {
        note('rejected', opp, opp.symbol, s, time, close, 'blackout (diagnostic)');
        continue;
      }

      placeLateOrder(opp, s, k, close);
      taken = true;
    }
  };

  // ----- decisions -----

  const handleDecision = (book: ShadowBook, signal: ReboundSignal, s: number, sameMinute: number) => {
    const result = gate(book.symbol, s);
    const record: NSignalRecord = {
      repeatedRefusals: 0,
      symbol: book.symbol,
      phenotype: book.phenotype,
      index: s,
      date: dates[s]!,
      barIndex: signal.barIndex,
      decisionTime: signal.decisionTime,
      decisionPrice: signal.decisionPrice,
      setupId: signal.setup.id,
      setupKind: signal.setup.kind,
      outcome: result.grant ? 'granted' : 'refused',
      reason: result.reason,
      sameMinuteCandidates: sameMinute,
      occupiedBy: occupancy().label,
      equityAtDecision: result.equity,
      principal: result.principal,
      regTMaximum: result.regTMaximum,
      houseMaximum: result.houseMaximum,
      maximumU50: result.maxima.U50 ?? NaN,
      maximumU60: result.maxima.U60 ?? NaN,
      maximumL60: result.maxima.L60 ?? NaN,
      maximumG60: result.maxima.G60 ?? NaN,
      staleSeconds: staleAges(signal.decisionTime)
    };

    signals.push(record);

    // Shadow semantics: the book takes the signal either way.
    const trade = book.commit(signal, s, result.grant ? 'granted' : 'refused');

    record.trade = trade;

    if (result.grant) {
      reservations.push({
        trade,
        symbol: book.symbol,
        principal: result.principal,
        equity: result.equity,
        slot: result.slot,
        decisionIndex: s
      });
      assertPoolCap(s, signal.decisionTime);
    } else {
      armIfEligible(book, signal, record, trade, s);
    }
  };

  // ----- marks -----

  const fixedMarks = new Map<number, number>();

  const markFixed = (s: number, time: number, barSymbols: ReadonlySet<string> | undefined) => {
    const ledger = fixed;
    const sessionTime = sTime[s]!;
    let value = ledger.realized;

    for (const lot of ledger.open) {
      if (!barSymbols || barSymbols.has(lot.symbol)) {
        const mark = ledger.mark(lot, lastClose[lot.symbol]!, sessionTime);

        fixedMarks.set(lot.id, mark);
        lot.heldMarks++;

        if (mark < lot.worstMark) {
          lot.worstMark = mark;
          lot.worstMarkTime = time;
        }
      }

      value += fixedMarks.get(lot.id) ?? 0;
    }

    minuteTracker.updateStrict(value, time);

    for (const active of activePeriods) {
      active.tracker.updateStrict(value, time);
    }
  };

  // ----- the sessions -----

  const instruments = marketSecurities.map((security) => ({ security, ds: datasets[security]! }));
  const bookList = bookOrderOf(config.symbols).map((symbol) => books.get(symbol)!);
  const tieBooks = tieOrder.map((symbol) => books.get(symbol)!);
  const cursor = new Int32Array(instruments.length);
  const atBar = Object.fromEntries(securities.map((security) => [security, -1])) as Record<string, number>;

  const periodFirst = periods.map((period) => dates.findIndex((date) => date >= period.first));
  // A period starts at the close before its first session; one whose first session is at or before the run's first
  // trading session starts at the accounting start (initial call).
  const startPeriods = (s: number, value: number, time: number, initial = false) => {
    for (const [i, period] of periods.entries()) {
      const firstIndex = periodFirst[i]!;
      const starts = initial ? firstIndex >= 0 && firstIndex <= s + 1 : firstIndex === s + 1;

      if (starts && s + 1 < dates.length && dates[s + 1]! <= period.last) {
        const tracker = new Tracker(value, time);

        activePeriods.push({ period, tracker });
        periodTrackers.set(period.name, { tracker, startValue: value, startTime: time, endValue: NaN });
      }
    }
  };

  const stopPeriods = (s: number, value: number) => {
    for (let i = activePeriods.length - 1; i >= 0; i--) {
      const { period } = activePeriods[i]!;

      if (dates[s]! >= period.last || s === endIndex) {
        periodTrackers.get(period.name)!.endValue = value;
        activePeriods.splice(i, 1);
      }
    }
  };

  startPeriods(startIndex, 0, sTime[startIndex]!, true);

  for (let s = startIndex + 1; s <= endIndex; s++) {
    for (const security of marketSecurities) {
      lastClose[security] = datasets[security]!.sClose[s - 1]!;
      lastCloseTime[security] = closeTimes[s - 1]!;
    }

    for (const book of bookList) {
      book.beginSession(s);
    }

    // The late lots decide their session's exits from the pre-session state (D1's own order), and a late order
    // decided after the previous session's last trade gets its fill minute.
    for (const position of latePositions.values()) {
      position.decision = position.exit.evaluate(position.state, s);
    }

    if (lateOrder && lateOrder.fillIndex < 0) {
      lateOrder.fillIndex = s;
      lateOrder.fillBar = firstTradeAfterDecision(datasets[lateOrder.opp.symbol]!, s, lateOrder.trade.decisionTime);
    }

    for (let i = 0; i < instruments.length; i++) {
      cursor[i] = 0;
    }

    for (;;) {
      let T = Infinity;

      for (let i = 0; i < instruments.length; i++) {
        const { ds } = instruments[i]!;

        if (cursor[i]! < ds.sBarCount[s]!) {
          T = Math.min(T, ds.bTime[ds.sBarStart[s]! + cursor[i]!]!);
        }
      }

      if (T === Infinity) {
        break;
      }

      const present = new Set<string>();

      for (let i = 0; i < instruments.length; i++) {
        const { security, ds } = instruments[i]!;
        const k = cursor[i]!;

        if (k < ds.sBarCount[s]! && ds.bTime[ds.sBarStart[s]! + k] === T) {
          atBar[security] = k;
          present.add(security);
        } else {
          atBar[security] = -1;
        }
      }

      const heldBefore = new Set<string>(lots().map((lot) => lot.symbol));

      // 3. virtual exits, closing their funded lots; the late lots' own exits; an origin's shadow close cancels
      for (const book of bookList) {
        const k = atBar[book.symbol]!;

        if (k < 0) {
          continue;
        }

        const decision = book.exitAt(k);

        if (decision) {
          closeVirtual(book, s, decision);
        }

        const position = latePositions.get(book.symbol);

        if (position?.decision && position.decision.barIndex === k) {
          closeLatePosition(position, s, position.decision);
        }
      }

      // 5. virtual entry fills, opening funded lots; then a late order's fill
      for (const book of bookList) {
        const k = atBar[book.symbol]!;

        if (k >= 0 && book.fillAt(k)) {
          fillVirtual(book, s, k);
        }
      }

      if (lateOrder && lateOrder.fillIndex === s && atBar[lateOrder.opp.symbol]! === lateOrder.fillBar) {
        fillLateOrder(s, lateOrder.fillBar);
      }

      for (const security of present) {
        const ds = datasets[security]!;

        lastClose[security] = ds.bClose[ds.sBarStart[s]! + atBar[security]!]!;
        lastCloseTime[security] = T + secondsPerMinute;
      }

      // 6. decisions, in the tie order; the opportunities' invalidation, then the delayed decisions
      for (const symbol of live.keys()) {
        if (atBar[symbol]! >= 0) invalidate(symbol, s, atBar[symbol]!);
      }

      const freeBefore = occupancy().count === 0;
      const pendingSignals: { book: ShadowBook; signal: ReboundSignal }[] = [];

      for (const book of tieBooks) {
        const k = atBar[book.symbol]!;

        if (k < 0) {
          continue;
        }

        const signal = book.processBar(s, k);

        if (signal) {
          pendingSignals.push({ book, signal });
        }
      }

      const sameMinute = pendingSignals.length;

      for (const { book, signal } of pendingSignals) {
        handleDecision(book, signal, s, sameMinute);
      }

      delayedDecisions(s, freeBefore);

      // 7. marks
      const barSymbols = new Set<string>(present);
      let isHeld = false;

      for (const symbol of barSymbols) {
        if (heldBefore.has(symbol) || lots().some((lot) => lot.symbol === symbol)) {
          isHeld = true;
        }
      }

      if (isHeld) {
        markFixed(s, T, barSymbols);
      }

      for (let i = 0; i < instruments.length; i++) {
        if (present.has(instruments[i]!.security)) {
          cursor[i]!++;
        }
      }
    }

    // ----- the close -----

    const closeTime = closeTimes[s]!;
    const counts = Object.fromEntries(
      marketSecurities.map((security) => [security, datasets[security]!.sBarCount[s]!])
    ) as Record<string, number>;

    for (const book of bookList) {
      const decision = book.exitAt(counts[book.symbol]!);

      if (decision) {
        closeVirtual(book, s, decision);
      }

      const position = latePositions.get(book.symbol);

      if (position?.decision && position.decision.barIndex === counts[book.symbol]!) {
        closeLatePosition(position, s, position.decision);
      }
    }

    for (const book of bookList) {
      if (book.fillAt(counts[book.symbol]!)) {
        fillVirtual(book, s, counts[book.symbol]!);
      }
    }

    if (lateOrder && lateOrder.fillIndex === s && lateOrder.fillBar === counts[lateOrder.opp.symbol]!) {
      fillLateOrder(s, lateOrder.fillBar);
    }

    for (const security of marketSecurities) {
      lastClose[security] = datasets[security]!.sClose[s]!;
      lastCloseTime[security] = closeTime;
    }

    // Expiry at the close of session origin + A (after this close's exits and fills).
    for (const opp of [...live.values()]) {
      if (s - opp.originIndex >= opp.maxAgeSessions) {
        end(
          opp,
          'expired',
          s,
          closeTime,
          datasets[opp.symbol]!.sClose[s]!,
          `age ${s - opp.originIndex} = maximum ${opp.maxAgeSessions} at the close`
        );
      }
    }

    for (const book of bookList) {
      book.afterSession(s);
    }

    for (const position of latePositions.values()) {
      if (position.trade.entryIndex !== s) {
        position.exit.afterSession(position.state, s);
      }
    }

    markFixed(s, closeTime, undefined);

    const ledger = fixed;
    let unrealized = 0;

    for (const lot of ledger.open) {
      unrealized += ledger.mark(lot, lastClose[lot.symbol]!, sTime[s]!);
    }

    equityTracker.updateStrict(ledger.realized + unrealized, sTime[s]!);
    daily.push(dailyRowFixed(s, unrealized));
    stopPeriods(s, ledger.realized + unrealized);
    startPeriods(s, ledger.realized + unrealized, closeTime);
  }

  // ----- the end -----

  const lastSessionTime = sTime[endIndex]!;

  for (const book of bookList) {
    book.finish(endIndex);
  }

  for (const lot of lots()) {
    const close = datasets[lot.symbol]!.sClose[endIndex]!;

    lot.exitRawPrice = close;
    lot.interest = fixed.lotInterest(lot as unknown as RealLot, lastSessionTime);
    lot.gross = lot.shares * close - lot.originalPrincipal;
    lot.net = lot.gross - lot.interest;
  }

  for (const position of latePositions.values()) {
    const { trade, state, exit } = position;
    const close = datasets[trade.symbol]!.sClose[endIndex]!;

    trade.interest = interestOn(state, config.rate, lastSessionTime);
    trade.gross = state.shares * close - state.investment;
    trade.net = trade.gross - trade.interest;
    trade.exitRawPrice = close;
    trade.exitStopPrice = exit.stopPrice;
    trade.stopFirstActiveIndex = exit.stopFirstActiveIndex;
    trade.stopActiveSessions = exit.stopActiveSessions;
  }

  for (const opp of [...live.values()]) {
    end(opp, 'live at end', endIndex, closeTimes[endIndex]!, datasets[opp.symbol]!.sClose[endIndex]!, 'end of data');
  }

  if (lateOrder) {
    note(
      'live at end',
      lateOrder.opp,
      lateOrder.opp.symbol,
      endIndex,
      closeTimes[endIndex]!,
      NaN,
      'late order unfilled at the end of data'
    );
  }

  const trades = bookList.flatMap((book) => book.trades);
  const minuteStats = minuteTracker.stats();
  const dailyStats = equityTracker.stats();

  return {
    config,
    universe,
    endIndex,
    trades,
    lots: allLots(),
    signals,
    events: [],
    daily,
    dividends: [],
    dailyDrawdown: dailyStats,
    minuteDrawdown: minuteStats,
    strategyDailyDrawdown: equityTracker.stats(),
    strategyMinuteDrawdown: minuteTracker.stats(),
    approaches: [],
    minimum,
    marginMarks: 0,
    minutesBelow,
    reservationsAtEnd: reservations.map((reservation) => ({
      symbol: reservation.symbol,
      principal: reservation.principal,
      decisionTime: reservation.trade.decisionTime
    })),
    ledgerChecks: { events: 0, poolChecks },
    books: bookList.map((book) => ({
      symbol: book.symbol,
      phenotype: book.phenotype,
      setups: book.machine.setups,
      signals: book.signals.length,
      armedAtEnd: book.machine.state === 'ARMED',
      pendingAtEnd: Boolean(book.order)
    })),
    opportunities,
    transitions,
    lateTrades,
    periodDrawdowns: Object.fromEntries(
      [...periodTrackers.entries()].map(([name, p]) => [
        name,
        { ...p.tracker.stats(), startValue: p.startValue, startTime: p.startTime, endValue: p.endValue }
      ])
    )
  };

  // ----- helpers that need the run's state -----

  function closeVirtual(book: ShadowBook, s: number, decision: ExitDecision) {
    const trade = book.position!.trade;
    const lot = trade.fundedLotId > 0 ? lotById.get(trade.fundedLotId) : undefined;

    book.close(s, decision);

    if (lot && lot.exitIndex < 0) {
      const isStop = decision.reason === 'trailing stop' || decision.reason === 'trailing stop gap';

      exitRealLot(
        lot,
        s,
        decision.barIndex,
        decision.time,
        decision.price,
        decision.reason,
        decision.execution,
        isStop ? config.stopSlippageBps / 10000 : 0
      );
    }

    // The originating shadow trade closed: its live opportunity is cancelled (closed shadow trades are never funded).
    const opp = live.get(book.symbol);

    if (opp && oppTrade.get(opp) === trade) {
      end(
        opp,
        'cancelled',
        s,
        decision.time,
        decision.price,
        `originating shadow trade ${trade.id} closed (${decision.reason})`
      );
    }
  }

  function fillVirtual(book: ShadowBook, s: number, k: number) {
    const order = book.order!;
    const reservation = reservations.find((candidate) => candidate.trade === order.trade);
    const trade = book.open(s, k);

    if (reservation) {
      openRealLot(book.symbol, trade, reservation, s, k, trade.entryRawPrice, trade.entryExecution);
    }
  }

  function dailyRowFixed(s: number, unrealized: number): NDailyRow {
    const ledger = fixed;
    const prices = { ...lastClose };
    const sessionTime = sTime[s]!;
    const mv = emptyValuesOf(securities);

    for (const lot of ledger.open) {
      mv[lot.symbol] = mv[lot.symbol]! + lot.shares * prices[lot.symbol]!;
    }

    const interestLiability = ledger.open.reduce((total, lot) => total + ledger.lotInterest(lot, sessionTime), 0);

    return {
      index: s,
      date: dates[s]!,
      closes: prices,
      voogShares: 0,
      vgtCoreShares: 0,
      lotShares: lotSharesOf(),
      mv,
      cash: 0,
      receivables: 0,
      principal: ledger.open.reduce((total, lot) => total + lot.principal, 0),
      interestLiability,
      fundingPayable: 0,
      lmv: lmvOf(securities, mv),
      equity: ledger.realized + unrealized,
      equityToLmv: NaN,
      debtToEquity: NaN,
      grossExposure: NaN,
      realized: ledger.realized,
      unrealized,
      strategyMark: ledger.realized + unrealized,
      cumulativeInterest: ledger.interestPaid + interestLiability,
      cumulativeDividends: 0,
      coreTurnover: 0,
      openLots: ledger.open.length,
      owners: ledger.open.map((lot) => lot.symbol).join('+'),
      required: {},
      minuteMinRatio: {},
      minutesBelowWarning: {},
      minutesBelowCritical: {}
    };
  }
};
