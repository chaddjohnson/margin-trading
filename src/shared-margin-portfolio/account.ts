// The margin-account ledger: core VOOG and VGT shares, trading lots with their borrowed principal and accrued
// interest, cash (never negative), dividend receivables, and a funding payable for a loss not yet covered by core
// sales. Every event is logged with the balance sheet after it, and `assertReconciled` checks that assets minus
// liabilities equals the running equity to a cent after each event. Prices come from the caller; the ledger never
// looks at market data itself.
import type { Etf } from './data.ts';
import type {
  ExecutionPrice,
  ExitDecision,
  ExitManager,
  ExitReason,
  LotState,
  SetupKind,
  StrategyKey
} from './strategy.ts';
import { interestOn } from './strategy.ts';

export interface Lot extends LotState {
  id: number;
  owner: StrategyKey; // the strategy whose exit rules manage the lot now
  slot: number; // the strategy slot that owns it now
  originalOwner: StrategyKey;
  originalSlot: number;
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryExecution: ExecutionPrice;
  decisionTime: number;
  decisionPrice: number;
  setupKind: SetupKind;
  setupId: number;
  principal: number; // = investment
  grossCost: number; // shares × fill price before costs = principal
  equityAtDecision: number;
  fraction: number; // principal / equity at the decision
  exit: ExitManager;
  decision?: ExitDecision; // this session's scheduled exit
  shadowExit?: {
    index: number;
    barIndex: number;
    price: number;
    reason: ExitReason;
    time: number;
    execution: ExecutionPrice;
  };
  takeover?: {
    index: number;
    barIndex: number;
    time: number;
    price: number;
    transfer: 'T1' | 'T2';
    fromOwner: StrategyKey;
    profitAtTakeover: number;
    highBefore: number;
    stopBefore: number;
    stopAfter: number;
  };
  extraTakeoverSignals: number;
  pendingDisplace?: number; // a displacement decided at the close, executed at the next opening trade
  dividends: number; // distributions the lot was entitled to while open
  // Filled at exit.
  exitIndex: number;
  exitBar: number;
  exitTime: number;
  exitPrice: number; // realized (after costs)
  exitRawPrice: number;
  exitExecution: ExecutionPrice | '';
  exitReason: ExitReason;
  exitStopPrice: number;
  interest: number;
  proceeds: number;
  netProfit: number; // proceeds − principal − interest
  worstMark: number; // the most negative minute mark of the lot against its cost, net of interest
}

export interface Receivable {
  etf: Etf;
  exDate: string;
  payDate: string;
  amountPerShare: number;
  shares: number;
  value: number;
  source: 'core' | 'lot';
}

export type EventKind =
  | 'start'
  | 'ex-date'
  | 'dividend paid'
  | 'entry'
  | 'exit'
  | 'takeover'
  | 'reinvest'
  | 'fund loss'
  | 'rebalance'
  | 'forced sale'
  | 'end';

export interface LedgerEvent {
  seq: number;
  index: number;
  date: string;
  time: number;
  kind: EventKind;
  strategy: string;
  etf: Etf | '';
  shares: number; // signed
  price: number;
  cashDelta: number;
  note: string;
  voogShares: number;
  vgtCoreShares: number;
  lotShares: number;
  cash: number;
  receivables: number;
  principal: number;
  accruedInterest: number;
  fundingPayable: number;
  vgtPrice: number;
  voogPrice: number;
  lmv: number;
  equity: number;
  realizedStrategyProfit: number;
}

export interface AccountOptions {
  costBps: number; // per side, on every fill but DRIP
  wholeShares: boolean;
  rate: number;
}

export interface Prices {
  vgt: number;
  voog: number;
  sessionTime: number; // interest accrues through this session date
}

export class Account {
  voog = 0;
  vgtCore = 0;
  cash = 0;
  fundingPayable = 0; // a realized loss not yet funded by core sales
  receivables: Receivable[] = [];
  lots: Lot[] = []; // every lot ever opened
  events: LedgerEvent[] = [];
  realizedStrategyProfit = 0;
  cumulativeInterestPaid = 0;
  cumulativeDividends = 0;
  cumulativeLotDividends = 0;
  coreTurnover = 0; // dollars of core bought and sold after the start
  private seq = 0;
  private lastCash = 0;

  constructor(readonly options: AccountOptions) {}

  get openLots() {
    return this.lots.filter((lot) => lot.exitIndex < 0);
  }

  lotShares() {
    return this.openLots.reduce((total, lot) => total + lot.shares, 0);
  }

  receivableValue() {
    return this.receivables.reduce((total, row) => total + row.value, 0);
  }

  principalOutstanding() {
    return this.openLots.reduce((total, lot) => total + lot.principal, 0);
  }

  accruedInterest(sessionTime: number) {
    return this.openLots.reduce((total, lot) => total + interestOn(lot, this.options.rate, sessionTime), 0);
  }

  liabilities(sessionTime: number) {
    return this.principalOutstanding() + this.accruedInterest(sessionTime) + this.fundingPayable;
  }

  lmv(prices: Prices) {
    return this.voog * prices.voog + (this.vgtCore + this.lotShares()) * prices.vgt;
  }

  assets(prices: Prices) {
    return this.lmv(prices) + this.receivableValue() + this.cash;
  }

  equity(prices: Prices) {
    return this.assets(prices) - this.liabilities(prices.sessionTime);
  }

  // Unrealized strategy profit: lots marked at the price, net of interest through the session date.
  unrealizedStrategyProfit(prices: Prices) {
    return this.openLots.reduce(
      (total, lot) =>
        total + lot.shares * prices.vgt - lot.principal - interestOn(lot, this.options.rate, prices.sessionTime),
      0
    );
  }

  buyPrice(raw: number) {
    return raw * (1 + this.options.costBps / 10000);
  }

  sellPrice(raw: number) {
    return raw * (1 - this.options.costBps / 10000);
  }

  sharesFor(dollars: number, price: number) {
    const exact = dollars / price;

    return this.options.wholeShares ? Math.floor(exact + 1e-9) : exact;
  }

  log(
    kind: EventKind,
    index: number,
    date: string,
    time: number,
    prices: Prices,
    fields: Partial<Pick<LedgerEvent, 'strategy' | 'etf' | 'shares' | 'price' | 'cashDelta' | 'note'>> = {}
  ) {
    const event: LedgerEvent = {
      seq: this.seq++,
      index,
      date,
      time,
      kind,
      strategy: fields.strategy ?? '',
      etf: fields.etf ?? '',
      shares: fields.shares ?? 0,
      price: fields.price ?? NaN,
      cashDelta: this.cash - this.lastCash,
      note: fields.note ?? '',
      voogShares: this.voog,
      vgtCoreShares: this.vgtCore,
      lotShares: this.lotShares(),
      cash: this.cash,
      receivables: this.receivableValue(),
      principal: this.principalOutstanding(),
      accruedInterest: this.accruedInterest(prices.sessionTime),
      fundingPayable: this.fundingPayable,
      vgtPrice: prices.vgt,
      voogPrice: prices.voog,
      lmv: this.lmv(prices),
      equity: this.equity(prices),
      realizedStrategyProfit: this.realizedStrategyProfit
    };

    this.lastCash = this.cash;
    this.events.push(event);
    this.assertReconciled(prices, event);

    return event;
  }

  assertReconciled(prices: Prices, event?: LedgerEvent) {
    const equity = this.assets(prices) - this.liabilities(prices.sessionTime);

    if (event && Math.abs(event.equity - equity) > 0.01) {
      throw new Error(`Ledger does not reconcile at ${event.date} ${event.kind}: ${event.equity} vs ${equity}`);
    }

    if (this.cash < -0.005 || this.voog < -1e-9 || this.vgtCore < -1e-9) {
      throw new Error(`Negative balance at ${event?.date}: cash ${this.cash}, VOOG ${this.voog}, VGT ${this.vgtCore}`);
    }

    for (const lot of this.openLots) {
      if (lot.shares < -1e-9) {
        throw new Error(`Negative lot shares at ${event?.date}`);
      }
    }
  }

  // ----- core -----

  buyCore(etf: Etf, dollars: number, rawPrice: number, isDrip = false) {
    const price = isDrip ? rawPrice : this.buyPrice(rawPrice);
    const shares = this.sharesFor(dollars, price);
    const cost = shares * price;

    if (etf === 'VOOG') {
      this.voog += shares;
    } else {
      this.vgtCore += shares;
    }

    this.cash -= cost;

    if (!isDrip) {
      this.coreTurnover += cost;
    }

    return { shares, price, cost };
  }

  sellCore(etf: Etf, shares: number, rawPrice: number) {
    const price = this.sellPrice(rawPrice);
    const held = etf === 'VOOG' ? this.voog : this.vgtCore;
    const sold = Math.min(shares, held);
    const proceeds = sold * price;

    if (etf === 'VOOG') {
      this.voog -= sold;
    } else {
      this.vgtCore -= sold;
    }

    this.cash += proceeds;
    this.coreTurnover += proceeds;

    return { shares: sold, price, proceeds };
  }

  // ----- lots -----

  openLot(
    fields: Omit<
      Lot,
      | 'exitIndex'
      | 'exitBar'
      | 'exitTime'
      | 'exitPrice'
      | 'exitRawPrice'
      | 'exitExecution'
      | 'exitReason'
      | 'exitStopPrice'
      | 'interest'
      | 'proceeds'
      | 'netProfit'
      | 'worstMark'
      | 'dividends'
      | 'extraTakeoverSignals'
    >
  ) {
    const lot: Lot = {
      ...fields,
      dividends: 0,
      extraTakeoverSignals: 0,
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitPrice: NaN,
      exitRawPrice: NaN,
      exitExecution: '',
      exitReason: 'open',
      exitStopPrice: NaN,
      interest: 0,
      proceeds: 0,
      netProfit: 0,
      worstMark: 0
    };

    this.lots.push(lot);

    return lot;
  }

  // Sells the lot, repays its principal and interest, and returns the net. A shortfall becomes a funding payable
  // until core sales cover it, so cash never goes negative.
  closeLot(
    lot: Lot,
    s: number,
    barIndex: number,
    time: number,
    rawPrice: number,
    reason: ExitReason,
    execution: ExecutionPrice,
    sessionTime: number,
    extraSlippage = 0
  ) {
    const price = this.sellPrice(rawPrice) * (1 - extraSlippage);
    const proceeds = lot.shares * price;
    const interest = interestOn(lot, this.options.rate, sessionTime);
    const owed = lot.principal + interest;

    lot.exitIndex = s;
    lot.exitBar = barIndex;
    lot.exitTime = time;
    lot.exitPrice = price;
    lot.exitRawPrice = rawPrice;
    lot.exitExecution = execution;
    lot.exitReason = reason;
    lot.exitStopPrice = lot.exit.stopPrice;
    lot.interest = interest;
    lot.proceeds = proceeds;
    lot.netProfit = proceeds - owed;

    this.cash += proceeds;

    if (proceeds >= owed) {
      this.cash -= owed;
    } else {
      this.cash -= proceeds;
      this.fundingPayable += owed - proceeds;
    }

    this.cumulativeInterestPaid += interest;
    this.realizedStrategyProfit += lot.netProfit;

    return lot.netProfit;
  }

  // Core sale proceeds cover the funding payable.
  settleFunding(dollars: number) {
    const paid = Math.min(dollars, this.fundingPayable, this.cash);

    this.fundingPayable -= paid;
    this.cash -= paid;

    return paid;
  }
}
