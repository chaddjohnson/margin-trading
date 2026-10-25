// The portfolio ledger of src/multi-etf-allocator/ledger.ts over any list of securities (the frozen five plus any
// candidate book), with the same booking rules line for line: core VOOG and VGT shares, funded trading lots with their
// borrowed principal and simple 11% interest, cash (never negative), dividend receivables and a funding payable. Only
// the simple-interest model is carried over (the Vanguard tier model was a sensitivity of the earlier program), and
// the forced-liquidation paths are not (no stress run here). The fixed-$100,000 ledger needs no generalization and is
// imported unchanged (src/multi-etf-allocator/ledger.ts FixedLedger).
import type { CoreEtf, Sym } from '../../multi-etf-allocator/context.ts';
import type { EventKind, Receivable, RealLot } from '../../multi-etf-allocator/ledger.ts';
import type { ExecutionPrice, ExitReason } from '../../shared-margin-portfolio/strategy.ts';
import { type MarketValues, emptyValuesOf, lmvOf } from './margin.ts';

export const secondsPerDay = 86400;
export const secondsPerYear = 365 * secondsPerDay;

export type Prices = Record<string, number>;

// A funded lot of any book symbol (the frozen RealLot with a string symbol).
export type Lot = Omit<RealLot, 'symbol'> & { symbol: string };

export interface PortfolioEvent {
  seq: number;
  index: number;
  date: string;
  time: number;
  kind: EventKind;
  security: string;
  lotId: number;
  shares: number;
  price: number;
  cashDelta: number;
  principalDelta: number;
  note: string;
  voog: number;
  vgtCore: number;
  lotShares: Record<string, number>;
  cash: number;
  receivables: number;
  principal: number;
  interestLiability: number;
  fundingPayable: number;
  lmv: number;
  mv: MarketValues;
  equity: number;
  realized: number;
}

type ExitField =
  | 'exitIndex'
  | 'exitBar'
  | 'exitTime'
  | 'exitRawPrice'
  | 'exitPrice'
  | 'exitExecution'
  | 'exitReason'
  | 'forced'
  | 'interest'
  | 'proceeds'
  | 'gross'
  | 'net'
  | 'worstMark'
  | 'worstMarkTime'
  | 'heldMarks';

export class NPortfolioLedger {
  voog = 0;
  vgtCore = 0;
  cash = 0;
  fundingPayable = 0;
  receivables: Receivable[] = [];
  lots: Lot[] = [];
  open: Lot[] = [];
  events: PortfolioEvent[] = [];
  realized = 0;
  interestPaid = 0;
  dividends = 0;
  lotDividends = 0;
  coreTurnover = 0;
  private seq = 0;
  private lastCash = 0;
  private lastPrincipal = 0;

  constructor(
    readonly options: { costBps: number; rate: number },
    readonly securities: readonly string[], // every security of the run, frozen order first
    readonly lotKeys: readonly string[] // the lot-share keys of an event (the frozen four, then candidate books)
  ) {}

  buyPrice(raw: number) {
    return raw * (1 + this.options.costBps / 10000);
  }

  sellPrice(raw: number) {
    return raw * (1 - this.options.costBps / 10000);
  }

  coreShares(etf: CoreEtf) {
    return etf === 'VOOG' ? this.voog : this.vgtCore;
  }

  marketValues(prices: Prices): MarketValues {
    const mv = emptyValuesOf(this.securities);

    mv.VOOG = this.voog * prices.VOOG!;
    mv.VGT = this.vgtCore * prices.VGT!;

    for (const lot of this.open) {
      mv[lot.symbol] = mv[lot.symbol]! + lot.shares * prices[lot.symbol]!;
    }

    return mv;
  }

  lmv(prices: Prices) {
    return lmvOf(this.securities, this.marketValues(prices));
  }

  receivableValue() {
    let total = 0;

    for (const row of this.receivables) {
      total += row.value;
    }

    return total;
  }

  principalOutstanding() {
    let total = 0;

    for (const lot of this.open) {
      total += lot.principal;
    }

    return total;
  }

  lotInterest(lot: Lot, sessionTime: number) {
    return lot.accruedBefore + lot.principal * this.options.rate * ((sessionTime - lot.accrualStart) / secondsPerYear);
  }

  interestLiability(sessionTime: number) {
    let total = 0;

    for (const lot of this.open) {
      total += this.lotInterest(lot, sessionTime);
    }

    return total;
  }

  liabilities(sessionTime: number) {
    return this.principalOutstanding() + this.interestLiability(sessionTime) + this.fundingPayable;
  }

  assets(prices: Prices) {
    return this.lmv(prices) + this.receivableValue() + this.cash;
  }

  equity(prices: Prices, sessionTime: number) {
    return this.assets(prices) - this.liabilities(sessionTime);
  }

  unrealized(prices: Prices, sessionTime: number) {
    let total = 0;

    for (const lot of this.open) {
      total += lot.shares * prices[lot.symbol]! - lot.originalPrincipal - this.lotInterest(lot, sessionTime);
    }

    return total;
  }

  sharesFor(dollars: number, price: number) {
    return dollars / price;
  }

  log(
    kind: EventKind,
    index: number,
    date: string,
    time: number,
    prices: Prices,
    sessionTime: number,
    fields: Partial<Pick<PortfolioEvent, 'security' | 'lotId' | 'shares' | 'price' | 'note'>> = {}
  ) {
    const lotShares = Object.fromEntries(this.lotKeys.map((key) => [key, 0])) as Record<string, number>;

    for (const lot of this.open) {
      lotShares[lot.symbol] = lotShares[lot.symbol]! + lot.shares;
    }

    const principal = this.principalOutstanding();
    const interestLiability = this.interestLiability(sessionTime);
    const mv = this.marketValues(prices);
    const lmv = lmvOf(this.securities, mv);
    const receivables = this.receivableValue();
    const equity = lmv + receivables + this.cash - principal - interestLiability - this.fundingPayable;
    const event: PortfolioEvent = {
      seq: this.seq++,
      index,
      date,
      time,
      kind,
      security: fields.security ?? '',
      lotId: fields.lotId ?? 0,
      shares: fields.shares ?? 0,
      price: fields.price ?? NaN,
      cashDelta: this.cash - this.lastCash,
      principalDelta: principal - this.lastPrincipal,
      note: fields.note ?? '',
      voog: this.voog,
      vgtCore: this.vgtCore,
      lotShares,
      cash: this.cash,
      receivables,
      principal,
      interestLiability,
      fundingPayable: this.fundingPayable,
      lmv,
      mv,
      equity,
      realized: this.realized
    };

    this.lastCash = this.cash;
    this.lastPrincipal = principal;
    this.events.push(event);
    this.assertInvariants(prices, sessionTime, event);

    return event;
  }

  assertInvariants(prices: Prices, sessionTime: number, event: PortfolioEvent) {
    const equity = this.assets(prices) - this.liabilities(sessionTime);

    if (Math.abs(event.equity - equity) > 0.01) {
      throw new Error(`Ledger does not reconcile at ${event.date} ${event.kind}: ${event.equity} vs ${equity}`);
    }

    if (this.cash < -0.005 || this.voog < -1e-9 || this.vgtCore < -1e-9 || this.fundingPayable < -0.005) {
      throw new Error(
        `Negative balance at ${event.date} ${event.kind}: cash ${this.cash}, VOOG ${this.voog}, VGT ${this.vgtCore}, payable ${this.fundingPayable}`
      );
    }

    for (const lot of this.open) {
      if (lot.shares < -1e-9 || lot.principal < -0.005) {
        throw new Error(`Negative lot ${lot.id} at ${event.date}: ${lot.shares} shares, principal ${lot.principal}`);
      }
    }
  }

  buyCore(etf: CoreEtf, dollars: number, rawPrice: number, isDrip = false) {
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

  sellCore(etf: CoreEtf, shares: number, rawPrice: number, extraSlippage = 0) {
    const price = this.sellPrice(rawPrice) * (1 - extraSlippage);
    const held = this.coreShares(etf);
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

  settleFunding(dollars: number) {
    const paid = Math.min(dollars, this.fundingPayable, this.cash);

    this.fundingPayable -= paid;
    this.cash -= paid;

    return paid;
  }

  openLot(fields: Omit<Lot, ExitField>) {
    const lot: Lot = {
      ...fields,
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitRawPrice: NaN,
      exitPrice: NaN,
      exitExecution: '',
      exitReason: 'open',
      forced: false,
      interest: 0,
      proceeds: 0,
      gross: 0,
      net: 0,
      worstMark: 0,
      worstMarkTime: NaN,
      heldMarks: 0
    };

    this.lots.push(lot);
    this.open.push(lot);

    return lot;
  }

  closeLot(
    lot: Lot,
    exit: {
      index: number;
      bar: number;
      time: number;
      rawPrice: number;
      reason: ExitReason;
      execution: ExecutionPrice | '';
      sessionTime: number;
      extraSlippage: number;
      forced: boolean;
    }
  ) {
    const price = this.sellPrice(exit.rawPrice) * (1 - exit.extraSlippage);
    const proceeds = lot.shares * price;
    const interest = this.lotInterest(lot, exit.sessionTime);
    const owed = lot.principal + interest;

    lot.exitIndex = exit.index;
    lot.exitBar = exit.bar;
    lot.exitTime = exit.time;
    lot.exitRawPrice = exit.rawPrice;
    lot.exitPrice = price;
    lot.exitExecution = exit.execution;
    lot.exitReason = exit.reason;
    lot.forced = exit.forced;

    const cashNet = proceeds - owed;

    lot.interest = interest;
    lot.proceeds = proceeds;
    lot.gross = proceeds - lot.originalPrincipal;
    lot.net = lot.repaidByCore > 0 ? proceeds - lot.originalPrincipal - interest : cashNet;

    this.cash += proceeds;

    if (proceeds >= owed) {
      this.cash -= owed;
    } else {
      this.cash -= proceeds;
      this.fundingPayable += owed - proceeds;
    }

    this.open.splice(this.open.indexOf(lot), 1);
    this.interestPaid += interest;
    this.realized += lot.net;

    return cashNet;
  }
}

// The frozen engine's lot type for a lot of any symbol (the classes it is passed to read the symbol as a key only).
export const asFrozenLot = (lot: Lot) => lot as unknown as RealLot & { symbol: Sym };
