// The two ledgers of the allocator (PROTOCOL.md §6–§7).
//
// PortfolioLedger — one self-financing margin account: core VOOG and VGT shares, funded trading lots of VGT, XBI,
// XRT or KRE (each with its borrowed principal and interest), cash (never negative), dividend receivables and a
// funding payable for a loss not yet covered by core sales. It generalizes src/shared-margin-portfolio/account.ts to
// several symbols with the same booking rules, so a VGT-only run books exactly what that ledger books. Interest is
// either the strategy files' simple 365-day convention (primary) or Vanguard's published method (actual/360 daily
// accrual on the debit at the tier rate of the whole loan balance, capitalized monthly; a sensitivity).
//
// FixedLedger — the standalone research ledger of the fixed $100,000 pool: lots of a fixed principal, realized P&L
// from $0, no core, no compounding, no collateral claim.
//
// Every event is logged with the balance sheet after it. Prices come from the caller.
import { type CoreEtf, type Security, type Sym, securities } from './context.ts';
import { type MarketValues, emptyValues } from './margin.ts';
import type { VirtualTrade } from './shadow.ts';
import type { ExecutionPrice, ExitReason } from '../shared-margin-portfolio/strategy.ts';

export const secondsPerDay = 86400;
export const secondsPerYear = 365 * secondsPerDay;

export type Prices = Record<Security, number>;

export interface Tier {
  upTo: number; // loan balance ceiling (Infinity for the last)
  rate: number;
}

export type InterestModel =
  | { kind: 'simple'; rate: number }
  | {
      kind: 'vanguard';
      tiers: Tier[];
      // Qualifying-asset proxy: the Preferred rate while account equity ≥ threshold (and the loan ≤ cap).
      preferred?: { rate: number; threshold: number; cap: number };
    };

export const describeInterest = (model: InterestModel) =>
  model.kind === 'simple'
    ? `${(model.rate * 100).toFixed(2)}% simple, 365-day, paid at exit`
    : `Vanguard tiers on the whole loan balance, actual/360, monthly capitalization${model.preferred ? `, Preferred ${(model.preferred.rate * 100).toFixed(2)}% while equity ≥ $${model.preferred.threshold.toLocaleString('en-US')}` : ''}`;

export interface RealLot {
  id: number;
  symbol: Sym;
  trade: VirtualTrade;
  slot: number;
  shares: number;
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryRawPrice: number;
  entryPrice: number;
  entryExecution: ExecutionPrice | '';
  entryTimestamp: number; // the entry session's midnight UTC: interest accrues from here
  decisionIndex: number;
  decisionTime: number;
  decisionPrice: number;
  equityAtDecision: number; // NaN in fixed mode
  fraction: number; // principal / equity at the decision (NaN in fixed mode)
  originalPrincipal: number;
  principal: number; // outstanding (core-first forced sales can repay part of it)
  // Interest state. Simple: accruedBefore + principal × rate × (t − accrualStart) / year. Vanguard: posted + accrued.
  accruedBefore: number;
  accrualStart: number;
  posted: number;
  accrued: number;
  repaidByCore: number;
  dividends: number; // entitlements while open (VGT lots only)
  exitIndex: number;
  exitBar: number;
  exitTime: number;
  exitRawPrice: number;
  exitPrice: number;
  exitExecution: ExecutionPrice | '';
  exitReason: ExitReason;
  forced: boolean;
  interest: number;
  proceeds: number;
  gross: number;
  net: number; // proceeds − original principal − interest
  worstMark: number; // most negative minute mark (net of interest) while open
  worstMarkTime: number;
  heldMarks: number; // minute marks while open
}

export interface Receivable {
  etf: CoreEtf;
  exDate: string;
  payDate: string;
  amountPerShare: number;
  shares: number;
  value: number;
  source: 'core' | 'lot';
  lotId: number;
}

export type EventKind =
  | 'start'
  | 'ex-date'
  | 'dividend paid'
  | 'entry'
  | 'exit'
  | 'reinvest'
  | 'fund loss'
  | 'rebalance'
  | 'forced sale'
  | 'interest posted'
  | 'requirement change'
  | 'end';

export interface LedgerEvent {
  seq: number;
  index: number;
  date: string;
  time: number;
  kind: EventKind;
  security: Security | '';
  lotId: number;
  shares: number; // signed change
  price: number;
  cashDelta: number;
  principalDelta: number;
  note: string;
  voog: number;
  vgtCore: number;
  lotShares: Record<Sym, number>;
  cash: number;
  receivables: number;
  principal: number;
  interestLiability: number;
  fundingPayable: number;
  lmv: number;
  mv: MarketValues; // per security, at the event's prices
  equity: number;
  realized: number;
}

const zeroLots = (): Record<Sym, number> => ({ VGT: 0, XBI: 0, XRT: 0, KRE: 0 });

export interface LedgerOptions {
  costBps: number;
  interest: InterestModel;
}

export class PortfolioLedger {
  voog = 0;
  vgtCore = 0;
  cash = 0;
  fundingPayable = 0;
  receivables: Receivable[] = [];
  lots: RealLot[] = [];
  open: RealLot[] = [];
  events: LedgerEvent[] = [];
  realized = 0;
  interestPaid = 0;
  dividends = 0;
  lotDividends = 0;
  coreTurnover = 0;
  lastAccrualTime = NaN; // Vanguard model: the last calendar day accrued (midnight UTC)
  private seq = 0;
  private lastCash = 0;
  private lastPrincipal = 0;

  constructor(readonly options: LedgerOptions) {}

  buyPrice(raw: number) {
    return raw * (1 + this.options.costBps / 10000);
  }

  sellPrice(raw: number) {
    return raw * (1 - this.options.costBps / 10000);
  }

  coreShares(etf: CoreEtf) {
    return etf === 'VOOG' ? this.voog : this.vgtCore;
  }

  lotShares(symbol: Sym) {
    let total = 0;

    for (const lot of this.open) {
      if (lot.symbol === symbol) {
        total += lot.shares;
      }
    }

    return total;
  }

  marketValues(prices: Prices): MarketValues {
    const mv = emptyValues();

    mv.VOOG = this.voog * prices.VOOG;
    mv.VGT = this.vgtCore * prices.VGT;

    for (const lot of this.open) {
      mv[lot.symbol] += lot.shares * prices[lot.symbol];
    }

    return mv;
  }

  lmv(prices: Prices) {
    const mv = this.marketValues(prices);

    return mv.VOOG + mv.VGT + mv.XBI + mv.XRT + mv.KRE;
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

  // Interest owed on a lot through a session date (not yet paid).
  lotInterest(lot: RealLot, sessionTime: number) {
    const model = this.options.interest;

    if (model.kind === 'simple') {
      return lot.accruedBefore + lot.principal * model.rate * ((sessionTime - lot.accrualStart) / secondsPerYear);
    }

    return lot.posted + lot.accrued;
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
      total += lot.shares * prices[lot.symbol] - lot.originalPrincipal - this.lotInterest(lot, sessionTime);
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
    fields: Partial<Pick<LedgerEvent, 'security' | 'lotId' | 'shares' | 'price' | 'note'>> = {}
  ) {
    const lotShares = zeroLots();

    for (const lot of this.open) {
      lotShares[lot.symbol] += lot.shares;
    }

    const principal = this.principalOutstanding();
    const interestLiability = this.interestLiability(sessionTime);
    const mv = this.marketValues(prices);
    const lmv = mv.VOOG + mv.VGT + mv.XBI + mv.XRT + mv.KRE;
    const receivables = this.receivableValue();
    const equity = lmv + receivables + this.cash - principal - interestLiability - this.fundingPayable;
    const event: LedgerEvent = {
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

  // assets − liabilities = equity to a cent; no negative cash, inventory or principal.
  assertInvariants(prices: Prices, sessionTime: number, event: LedgerEvent) {
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

  // ----- core -----

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

  // Cash applied to the open lots' principal (core-first forced sales), oldest lot first.
  repayPrincipal(dollars: number, sessionTime: number) {
    let remaining = Math.min(dollars, this.cash);
    let paid = 0;

    for (const lot of this.open) {
      if (remaining <= 0) {
        break;
      }

      const amount = Math.min(remaining, lot.principal);

      if (amount <= 0) {
        continue;
      }

      this.freezeAccrual(lot, sessionTime);
      lot.principal -= amount;
      lot.repaidByCore += amount;
      this.cash -= amount;
      remaining -= amount;
      paid += amount;
    }

    return paid;
  }

  // Simple model: fold the interest so far into accruedBefore before a principal change.
  private freezeAccrual(lot: RealLot, sessionTime: number) {
    const model = this.options.interest;

    if (model.kind === 'simple') {
      lot.accruedBefore = this.lotInterest(lot, sessionTime);
      lot.accrualStart = sessionTime;
    }
  }

  // ----- lots -----

  openLot(fields: Omit<RealLot, ExitField>) {
    const lot: RealLot = {
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

  // Sells the lot, repays its principal and interest and returns its net. A shortfall becomes a funding payable
  // until core sales cover it, so cash never goes negative (the earlier ledger's rule).
  closeLot(
    lot: RealLot,
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
    // The cash the exit leaves after repaying what is still owed. Without a core-first repayment it is the lot's net,
    // computed exactly as the earlier ledger computes it; with one, the lot's net is measured on its original
    // principal (the repaid part came from core sales, not from the trade).
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

  // ----- Vanguard interest: daily accrual at the tier rate of the whole loan balance, monthly capitalization -----

  tierRate(debit: number, equity: number) {
    const model = this.options.interest;

    if (model.kind !== 'vanguard') {
      return NaN;
    }

    if (model.preferred && equity >= model.preferred.threshold && debit <= model.preferred.cap) {
      return model.preferred.rate;
    }

    return model.tiers.find((tier) => debit <= tier.upTo)?.rate ?? model.tiers.at(-1)!.rate;
  }

  // Accrues every calendar day after the last accrued day through `sessionTime` (the D1 convention: interest through
  // the session's date, none on the entry day). On the first day of a month the interest accrued so far is posted to
  // each lot's debit before that day accrues. `equity` selects the Preferred proxy tier.
  accrueTo(sessionTime: number, equity: number, onPost?: (posted: number, time: number) => void) {
    if (this.options.interest.kind !== 'vanguard') {
      return;
    }

    if (Number.isNaN(this.lastAccrualTime)) {
      this.lastAccrualTime = sessionTime;
      return;
    }

    for (let day = this.lastAccrualTime + secondsPerDay; day <= sessionTime; day += secondsPerDay) {
      if (new Date(day * 1000).getUTCDate() === 1) {
        let posted = 0;

        for (const lot of this.open) {
          lot.posted += lot.accrued;
          posted += lot.accrued;
          lot.accrued = 0;
        }

        if (posted > 0) {
          onPost?.(posted, day);
        }
      }

      let debit = 0;

      for (const lot of this.open) {
        if (lot.entryTimestamp < day) {
          debit += lot.principal + lot.posted;
        }
      }

      if (debit <= 0) {
        continue;
      }

      const rate = this.tierRate(debit, equity);

      for (const lot of this.open) {
        if (lot.entryTimestamp < day) {
          lot.accrued += ((lot.principal + lot.posted) * rate) / 360;
        }
      }
    }

    this.lastAccrualTime = sessionTime;
  }
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

// The fixed-$100,000 research ledger: realized P&L from $0 plus open lots marked net of simple interest.
export class FixedLedger {
  lots: RealLot[] = [];
  open: RealLot[] = [];
  realized = 0;
  interestPaid = 0;

  constructor(
    readonly rate: number,
    readonly costBps: number
  ) {}

  buyPrice(raw: number) {
    return raw * (1 + this.costBps / 10000);
  }

  sellPrice(raw: number) {
    return raw * (1 - this.costBps / 10000);
  }

  lotInterest(lot: RealLot, sessionTime: number) {
    return lot.principal * this.rate * ((sessionTime - lot.entryTimestamp) / secondsPerYear);
  }

  mark(lot: RealLot, price: number, sessionTime: number) {
    return lot.shares * price - lot.principal - this.lotInterest(lot, sessionTime);
  }

  openLot(fields: Omit<RealLot, ExitField>) {
    const lot: RealLot = {
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
    lot: RealLot,
    exit: {
      index: number;
      bar: number;
      time: number;
      rawPrice: number;
      reason: ExitReason;
      execution: ExecutionPrice | '';
      sessionTime: number;
      extraSlippage: number;
    }
  ) {
    const price = this.sellPrice(exit.rawPrice) * (1 - exit.extraSlippage);
    const proceeds = lot.shares * price;
    const interest = this.lotInterest(lot, exit.sessionTime);

    lot.exitIndex = exit.index;
    lot.exitBar = exit.bar;
    lot.exitTime = exit.time;
    lot.exitRawPrice = exit.rawPrice;
    lot.exitPrice = price;
    lot.exitExecution = exit.execution;
    lot.exitReason = exit.reason;
    lot.interest = interest;
    lot.proceeds = proceeds;
    lot.gross = proceeds - lot.principal;
    lot.net = proceeds - lot.principal - interest;
    this.open.splice(this.open.indexOf(lot), 1);
    this.realized += lot.net;
    this.interestPaid += interest;

    return lot.net;
  }
}

export const securityList = securities;
