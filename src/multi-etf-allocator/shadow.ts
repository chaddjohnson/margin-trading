// One symbol's shadow D1 book (PROTOCOL.md §3): the verified minute-stepped machines of
// src/shared-margin-portfolio/strategy.ts (EntryMachine: FLAT → ARMED → PENDING_FILL; ExitManager: the net-profit
// trailing stop, the maximum hold, the buffered intraday loss and its overnight carry) driving a VIRTUAL position of a
// fixed notional. The book reads only its own symbol's completed minutes and pre-session state, and never the
// account. Under shadow semantics it takes every signal it produces, so its trades are exactly the symbol's
// standalone trades; the allocator only decides which of them are funded. Under the cancel and hold controls the
// allocator's refusal feeds back into the entry machine, exactly as in the earlier shared-margin engine.
//
// The engine calls, per session s: beginSession(s); then, for every bar k of the symbol in time order, exitAt(s, k),
// fillAt(s, k) and processBar(s, k); at the close the same with k = the bar count (the closing print); then
// afterSession(s). Nothing else moves the book.
import type { Dataset } from '../four-family/data.ts';
import {
  type ExecutionPrice,
  type ExitDecision,
  type ExitReason,
  type LotState,
  type ReboundSignal,
  type SetupKind,
  type StopFill,
  type StrategyParams,
  EntryMachine,
  ExitManager,
  Levels,
  firstTradeAfterDecision,
  interestOn,
  priceAt,
  timeAt,
  tradeExecution
} from '../shared-margin-portfolio/strategy.ts';
import type { PhenotypeName, Sym } from './context.ts';

export interface BookSettings {
  notional: number;
  rate: number; // the decision rate: simple annual interest per calendar day, 365-day year
  stopFill: StopFill;
  costBps: number; // per side, on every virtual fill
  stopSlippageBps: number; // extra adverse slippage on stop fills
}

export type DecisionOutcome = 'granted' | 'refused';

export interface VirtualTrade {
  id: number; // per book, 1-based
  symbol: Sym;
  phenotype: PhenotypeName;
  setupId: number;
  setupKind: SetupKind;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  decisionIndex: number;
  decisionBar: number;
  decisionTime: number;
  decisionPrice: number;
  trigger: number;
  trailingLow: number;
  carriedOvernight: boolean;
  entryIndex: number; // -1 until filled
  entryBar: number;
  entryTime: number;
  entryRawPrice: number;
  entryPrice: number; // after the per-side cost
  entryExecution: ExecutionPrice | '';
  shares: number; // of the notional
  investment: number;
  exitIndex: number; // -1 while open
  exitBar: number;
  exitTime: number;
  exitRawPrice: number;
  exitPrice: number; // after cost and stop slippage
  exitReason: ExitReason;
  exitExecution: ExecutionPrice | '';
  exitStopPrice: number;
  stopActiveAtExit: boolean;
  maximumHoldDue: boolean;
  bufferSignalTime: number;
  bufferSignalPrice: number;
  interest: number;
  gross: number;
  net: number; // on the notional, after interest (marked at the last close while open)
  stopFirstActiveIndex: number;
  stopActiveSessions: number;
  allocator: DecisionOutcome | ''; // the allocator's answer at the decision
  fundedLotId: number; // the real lot it funded, or -1
}

interface Position {
  trade: VirtualTrade;
  lot: LotState;
  exit: ExitManager;
  decision: ExitDecision | undefined; // this session's scheduled exit
}

export class ShadowBook {
  readonly machine: EntryMachine;
  readonly trades: VirtualTrade[] = [];
  readonly signals: { signal: ReboundSignal; decisionIndex: number }[] = [];
  position: Position | undefined;
  order: { trade: VirtualTrade; signal: ReboundSignal; fillBar: number } | undefined;
  positionAtStart = false;
  exitedThisSession = false;

  constructor(
    readonly symbol: Sym,
    readonly phenotype: PhenotypeName,
    readonly ds: Dataset,
    readonly params: StrategyParams,
    readonly settings: BookSettings,
    armStart: number
  ) {
    this.machine = new EntryMachine(ds, params, new Levels(ds), armStart);
  }

  buyPrice(raw: number) {
    return raw * (1 + this.settings.costBps / 10000);
  }

  sellPrice(raw: number) {
    return raw * (1 - this.settings.costBps / 10000);
  }

  get state() {
    return this.position ? 'LONG' : this.machine.state;
  }

  // Before the session's first bar: a carried order resolves to this session's trades, and the position open at the
  // start decides its exit for the session from the pre-session state and the session's bars (D1's own order).
  beginSession(s: number) {
    this.exitedThisSession = false;
    this.positionAtStart = Boolean(this.position);

    if (this.order && this.order.fillBar < 0) {
      this.order.fillBar = firstTradeAfterDecision(this.ds, s, this.order.signal.decisionTime);
    }

    if (this.position) {
      this.position.decision = this.position.exit.evaluate(this.position.lot, s);
    }
  }

  // The virtual exit scheduled at bar k (k = the bar count: the closing print), if any.
  exitAt(k: number) {
    return this.position?.decision && this.position.decision.barIndex === k ? this.position.decision : undefined;
  }

  // The order filling at bar k, if any.
  fillAt(k: number) {
    return this.order && this.order.fillBar === k ? this.order : undefined;
  }

  // Bar k completes: arming, trailing low and the rebound test, only while flat since the session's start.
  processBar(s: number, k: number): ReboundSignal | undefined {
    if (this.positionAtStart || this.exitedThisSession || this.order || this.position) {
      return undefined;
    }

    const signal = this.machine.processBar(s, k);

    if (signal) {
      this.signals.push({ signal, decisionIndex: s });
    }

    return signal;
  }

  // The book takes the signal: a virtual order waits for the first trade after the decision.
  commit(signal: ReboundSignal, s: number, outcome: DecisionOutcome): VirtualTrade {
    const { setup } = signal;
    const trade: VirtualTrade = {
      id: this.trades.length + 1,
      symbol: this.symbol,
      phenotype: this.phenotype,
      setupId: setup.id,
      setupKind: setup.kind,
      activationIndex: setup.activationIndex,
      activationTime: setup.activationTime,
      activationPrice: setup.activationPrice,
      referenceHigh: setup.referenceHigh,
      anchorHigh: setup.anchorHigh,
      decisionIndex: s,
      decisionBar: signal.barIndex,
      decisionTime: signal.decisionTime,
      decisionPrice: signal.decisionPrice,
      trigger: signal.trigger,
      trailingLow: signal.trailingLow,
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
      allocator: outcome,
      fundedLotId: -1
    };

    this.trades.push(trade);
    this.machine.commit(signal);
    this.order = { trade, signal, fillBar: firstTradeAfterDecision(this.ds, s, signal.decisionTime) };

    if (this.order.fillBar < 0) {
      trade.carriedOvernight = true;
    }

    return trade;
  }

  // The allocator refused the signal under the cancel or hold control (never under shadow semantics).
  refuse(signal: ReboundSignal, s: number, semantics: 'cancel' | 'hold') {
    if (semantics === 'cancel') {
      this.machine.cancelSetup(s);
    } else {
      signal.setup.declinedSignals++;
    }
  }

  // The pending order fills at bar k: the virtual position opens.
  open(s: number, k: number) {
    const order = this.order!;
    const { ds, settings } = this;
    const raw = priceAt(ds, s, k);
    const price = this.buyPrice(raw);
    const shares = settings.notional / price;
    const lot: LotState = {
      entryPrice: price,
      shares,
      investment: settings.notional,
      entryTimestamp: ds.sTime[s]!,
      holdTimestamp: ds.sTime[s]!
    };
    const exit = new ExitManager(ds, this.params, { stopFill: settings.stopFill, marginInterestRate: settings.rate });
    const trade = order.trade;

    trade.entryIndex = s;
    trade.entryBar = k;
    trade.entryTime = timeAt(ds, s, k);
    trade.entryRawPrice = raw;
    trade.entryPrice = price;
    trade.entryExecution = k === 0 && order.signal.index < s ? 'opening trade' : tradeExecution(ds, s, k);
    trade.shares = shares;
    trade.investment = settings.notional;
    exit.onEntry(lot, s, k, raw);
    this.machine.clearSetup('filled', s);
    this.order = undefined;
    this.position = { trade, lot, exit, decision: undefined };

    return trade;
  }

  // The scheduled exit executes: the virtual position closes and its true net opens the continuation window.
  close(s: number, decision: ExitDecision) {
    const position = this.position!;
    const { trade, lot, exit } = position;
    const isStop = decision.reason === 'trailing stop' || decision.reason === 'trailing stop gap';
    const price = this.sellPrice(decision.price) * (1 - (isStop ? this.settings.stopSlippageBps / 10000 : 0));
    const interest = interestOn(lot, this.settings.rate, this.ds.sTime[s]!);
    const proceeds = lot.shares * price;

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
    trade.gross = proceeds - lot.investment;
    trade.net = proceeds - lot.investment - interest;
    trade.stopFirstActiveIndex = exit.stopFirstActiveIndex;
    trade.stopActiveSessions = exit.stopActiveSessions;
    this.position = undefined;
    this.exitedThisSession = true;
    this.machine.onExit(s, decision.price, trade.net);

    return trade;
  }

  // After the close: the position's high and stop (not on its entry session), then the continuation window.
  afterSession(s: number) {
    if (this.position && this.position.trade.entryIndex !== s) {
      this.position.exit.afterSession(this.position.lot, s);
    }

    this.machine.afterSession(s);
  }

  // The end of the data: an open position is marked at the last close, with its accrued interest.
  finish(endIndex: number) {
    if (this.position) {
      const { trade, lot, exit } = this.position;
      const close = this.ds.sClose[endIndex]!;

      trade.interest = interestOn(lot, this.settings.rate, this.ds.sTime[endIndex]!);
      trade.gross = lot.shares * close - lot.investment;
      trade.net = trade.gross - trade.interest;
      trade.exitRawPrice = close;
      trade.exitStopPrice = exit.stopPrice;
      trade.stopFirstActiveIndex = exit.stopFirstActiveIndex;
      trade.stopActiveSessions = exit.stopActiveSessions;
    }

    this.machine.finish(endIndex);
  }

  // The virtual position's mark at a price, net of interest through the session date.
  markAt(price: number, sessionTime: number) {
    const position = this.position;

    return position
      ? position.lot.shares * price -
          position.lot.investment -
          interestOn(position.lot, this.settings.rate, sessionTime)
      : 0;
  }
}
