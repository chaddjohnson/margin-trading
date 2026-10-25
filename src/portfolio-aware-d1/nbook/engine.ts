// The N-book allocator: src/multi-etf-allocator/engine.ts's runAllocator with the books' symbols taken from the run's
// configuration instead of the fixed VGT/XBI/XRT/KRE, so a frozen All-lowDd run can carry a fifth (or sixth) D1 book
// of another ETF, or replace one of XBI/XRT/KRE. Everything else is the frozen engine's, in the frozen order:
//
// - one chronological pass over the common sessions, each session's minute bars of every file merged into one
//   timeline; at each bar start T: core VOOG orders, virtual exits (closing their funded lots), core VGT orders,
//   virtual entry fills (opening funded lots), then every book processes its bar and the rebound decisions stamped
//   T + 60 s go to the allocator in the tie order, then the marks; at the close the same, then dividends;
// - the books are the frozen ShadowBook (src/multi-etf-allocator/shadow.ts) under shadow semantics: each takes every
//   signal it produces, so its trades are its standalone trades and the allocator only decides which are funded;
// - the gate, the fixed and portfolio ledgers, the core orders, distributions, the drawdown trackers and the passive
//   maintenance measures are the frozen ones (FixedLedger, Tracker and PercentTracker imported unchanged; the
//   portfolio ledger and margin functions generalized over the security list in ./ledger.ts and ./margin.ts).
//
// Book order (exits, fills): VGT, XBI, XRT, KRE, then any other book alphabetically. Tie order of same-minute
// decisions: the books alphabetically (the frozen shadow policy's order, KRE VGT XBI XRT, extended). Only the shadow
// policy, the simple interest model and unstressed runs are carried over: no price shocks, calls, forced sales or
// requirement changes. For the frozen books alone every output equals the frozen engine's exactly
// (src/portfolio-aware-d1/parity.ts checks every trade, lot, signal, daily row, ledger event and drawdown).
import type { Dataset } from '../../four-family/data.ts';
import type { CoreEtf, PhenotypeName, Sym } from '../../multi-etf-allocator/context.ts';
import { protocol } from '../../multi-etf-allocator/context.ts';
import {
  type DrawdownStats,
  type PercentDrawdownStats,
  PercentTracker,
  Tracker,
  firstTradeAtOrAfter
} from '../../multi-etf-allocator/engine.ts';
import { FixedLedger } from '../../multi-etf-allocator/ledger.ts';
import type { RealLot } from '../../multi-etf-allocator/ledger.ts';
import type { ScheduleKey } from '../../multi-etf-allocator/margin.ts';
import { type VirtualTrade, ShadowBook } from '../../multi-etf-allocator/shadow.ts';
import type { Distribution } from '../../shared-margin-portfolio/data.ts';
import {
  type ExecutionPrice,
  type ExitDecision,
  type ReboundSignal,
  type StopFill,
  type StrategyParams,
  priceAt,
  secondsPerMinute,
  timeAt
} from '../../shared-margin-portfolio/strategy.ts';
import { type Lot, type PortfolioEvent, type Prices, NPortfolioLedger } from './ledger.ts';
import {
  type BalanceSheet,
  type MarketValues,
  baseSecurities,
  emptyValuesOf,
  lmvOf,
  maximumPrincipal,
  regTMaximumPrincipal,
  requiredOf,
  securitiesOf
} from './margin.ts';

export type Mode = 'fixed' | 'portfolio';

// A book's phenotype: a symbol, a name and the D1 machine parameters (frozen books from the registry, candidates
// from their eight-parameter vector).
export interface BookPhenotype {
  symbol: string;
  name: string;
  params: StrategyParams;
  short: string;
}

export interface Instrument {
  symbol: string;
  file: string;
  hash: string;
  ds: Dataset;
}

export interface NUniverse {
  end: string;
  dates: string[];
  sessionCount: number;
  instruments: Record<string, Instrument>;
  distributions: Distribution[];
  eligibilityIndex: number;
}

export interface NRunConfig {
  key: string;
  label: string;
  mode: Mode;
  symbols: string[]; // the books
  phenotypes: Record<string, BookPhenotype>;
  fraction: number; // portfolio: borrowed principal ÷ equity at the decision
  fixedPrincipal: number;
  rate: number; // simple annual interest, 365-day year (ledger and books)
  stopFill: StopFill;
  costBps: number;
  stopSlippageBps: number;
  corePolicy: 'contribute';
  lotDividends: boolean;
  initial: { voog: number; vgt: number };
  eligibilityIndex?: number;
  accountingStartIndex?: number;
  endIndex?: number;
  baseSchedule: ScheduleKey;
  passiveSchedules: readonly ScheduleKey[];
}

export const baseNRunConfig = (
  overrides: Partial<NRunConfig> & Pick<NRunConfig, 'key' | 'label' | 'mode' | 'symbols' | 'phenotypes'>
): NRunConfig => ({
  fraction: protocol.fraction,
  fixedPrincipal: protocol.fixedPrincipal,
  rate: protocol.rate,
  stopFill: 'stop',
  costBps: 0,
  stopSlippageBps: 0,
  corePolicy: 'contribute',
  lotDividends: true,
  initial: { ...protocol.initial },
  baseSchedule: 'U35',
  passiveSchedules: ['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'],
  ...overrides
});

export interface NSignalRecord {
  repeatedRefusals: number;
  symbol: string;
  phenotype: string;
  index: number;
  date: string;
  barIndex: number;
  decisionTime: number;
  decisionPrice: number;
  setupId: number;
  setupKind: string;
  outcome: 'granted' | 'refused';
  reason: string;
  sameMinuteCandidates: number;
  occupiedBy: string;
  equityAtDecision: number;
  principal: number;
  regTMaximum: number;
  houseMaximum: number;
  maximumU50: number;
  maximumU60: number;
  maximumL60: number;
  maximumG60: number;
  staleSeconds: Partial<Record<string, number>>;
  trade?: VirtualTrade;
}

export interface NDailyRow {
  index: number;
  date: string;
  closes: Prices;
  voogShares: number;
  vgtCoreShares: number;
  lotShares: Record<string, number>;
  mv: MarketValues;
  cash: number;
  receivables: number;
  principal: number;
  interestLiability: number;
  fundingPayable: number;
  lmv: number;
  equity: number;
  equityToLmv: number;
  debtToEquity: number;
  grossExposure: number;
  realized: number;
  unrealized: number;
  strategyMark: number;
  cumulativeInterest: number;
  cumulativeDividends: number;
  coreTurnover: number;
  openLots: number;
  owners: string;
  required: Partial<Record<ScheduleKey, number>>;
  minuteMinRatio: Partial<Record<ScheduleKey, number>>;
  minutesBelowWarning: Partial<Record<ScheduleKey, number>>;
  minutesBelowCritical: Partial<Record<ScheduleKey, number>>;
}

export interface NApproach {
  schedule: ScheduleKey;
  index: number;
  date: string;
  time: number;
  ratio: number;
  excess: number;
  required: number;
  equity: number;
  lmv: number;
  debt: number;
  mv: MarketValues;
  funded: string[];
  lots: string;
  staleSeconds: number;
}

export interface NRunResult {
  config: NRunConfig;
  universe: NUniverse;
  endIndex: number;
  trades: VirtualTrade[];
  lots: Lot[];
  signals: NSignalRecord[];
  events: PortfolioEvent[];
  daily: NDailyRow[];
  dividends: { etf: CoreEtf; exDate: string; payDate: string; source: string; lotId: number; value: number }[];
  dailyDrawdown: DrawdownStats;
  minuteDrawdown: DrawdownStats;
  strategyDailyDrawdown: DrawdownStats;
  strategyMinuteDrawdown: DrawdownStats;
  dailyPercentDrawdown?: PercentDrawdownStats;
  minutePercentDrawdown?: PercentDrawdownStats;
  approaches: NApproach[];
  minimum: Partial<
    Record<ScheduleKey, { ratio: number; time: number; excess: number; excessTime: number; dailyRatio: number }>
  >;
  marginMarks: number;
  minutesBelow: Partial<Record<ScheduleKey, { warning: number; critical: number }>>;
  reservationsAtEnd: { symbol: string; principal: number; decisionTime: number }[];
  ledgerChecks: { events: number; poolChecks: number };
  books: {
    symbol: string;
    phenotype: string;
    setups: number;
    signals: number;
    armedAtEnd: boolean;
    pendingAtEnd: boolean;
  }[];
}

interface Reservation {
  trade: VirtualTrade;
  symbol: string;
  principal: number;
  equity: number;
  slot: number;
  decisionIndex: number;
}

interface CoreOrder {
  etf: CoreEtf;
  dollars: number;
  kind: 'reinvest' | 'fund loss' | 'rebalance';
  lotId: number;
  fillIndex: number;
  fillBar: number;
  done: boolean;
}

// The frozen order of the four books, then the others alphabetically.
const frozenBookOrder = ['VGT', 'XBI', 'XRT', 'KRE'];

export const bookOrderOf = (symbols: readonly string[]) => [
  ...frozenBookOrder.filter((symbol) => symbols.includes(symbol)),
  ...symbols.filter((symbol) => !frozenBookOrder.includes(symbol)).sort()
];

// Same-minute decisions: the shadow policy's alphabetical order.
export const tieOrderOf = (symbols: readonly string[]) => [...symbols].sort();

// The lot-share keys of the daily rows and ledger events: the frozen four, then the candidate books.
export const lotKeysOf = (symbols: readonly string[]) => [
  ...frozenBookOrder,
  ...symbols.filter((symbol) => !frozenBookOrder.includes(symbol)).sort()
];

export const runNAllocator = (universe: NUniverse, config: NRunConfig): NRunResult => {
  const endIndex = Math.min(config.endIndex ?? universe.sessionCount - 1, universe.sessionCount - 1);
  const armStart = config.eligibilityIndex ?? universe.eligibilityIndex;
  const startIndex = config.accountingStartIndex ?? 0;

  if (!(startIndex >= 0 && startIndex < endIndex && armStart >= startIndex)) {
    throw new Error(
      `${config.key}: accounting start ${startIndex} must precede the end ${endIndex} and arming ${armStart}`
    );
  }

  const isPortfolio = config.mode === 'portfolio';
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
  const anyDs = instrumentOf(isPortfolio ? 'VGT' : config.symbols[0]!);
  const dates = anyDs.dates;
  const sTime = anyDs.sTime;
  const closeTimes = anyDs.sCloseTime;
  const marketSecurities: string[] = isPortfolio
    ? securities.filter((security) => security === 'VOOG' || security === 'VGT' || config.symbols.includes(security))
    : [...config.symbols];
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

  const portfolio = isPortfolio
    ? new NPortfolioLedger({ costBps: config.costBps, rate: config.rate }, securities, lotKeys)
    : undefined;
  const fixed = isPortfolio ? undefined : new FixedLedger(config.rate, config.costBps);
  const lots = (): Lot[] => (portfolio ? portfolio.open : (fixed!.open as unknown as Lot[]));
  const allLots = (): Lot[] => (portfolio ? portfolio.lots : (fixed!.lots as unknown as Lot[]));
  const reservations: Reservation[] = [];
  const signals: NSignalRecord[] = [];
  const daily: NDailyRow[] = [];
  const dividends: NRunResult['dividends'] = [];
  const coreOrders: CoreOrder[] = [];
  const approaches: NApproach[] = [];
  const lotById = new Map<number, Lot>();
  const passive = [...new Set([...config.passiveSchedules, config.baseSchedule])] as ScheduleKey[];
  const minimum: NRunResult['minimum'] = {};
  const minutesBelow: NRunResult['minutesBelow'] = {};
  const activeSchedule: ScheduleKey = config.baseSchedule;
  let lotId = 0;
  let poolChecks = 0;
  let marginMarks = 0;

  for (const schedule of passive) {
    minimum[schedule] = { ratio: Infinity, time: NaN, excess: Infinity, excessTime: NaN, dailyRatio: Infinity };
    minutesBelow[schedule] = { warning: 0, critical: 0 };
  }

  // ----- marks -----

  const lastClose = Object.fromEntries(securities.map((security) => [security, NaN])) as Prices;
  const lastCloseTime = Object.fromEntries(securities.map((security) => [security, NaN])) as Record<string, number>;
  const closePrices = (s: number): Prices => {
    const prices = Object.fromEntries(securities.map((security) => [security, NaN])) as Prices;

    for (const security of marketSecurities) {
      prices[security] = datasets[security]!.sClose[s]!;
    }

    return prices;
  };

  const lotSharesOf = () => {
    const shares = Object.fromEntries(lotKeys.map((key) => [key, 0])) as Record<string, number>;

    for (const lot of lots()) {
      shares[lot.symbol] = shares[lot.symbol]! + lot.shares;
    }

    return shares;
  };

  const fundedSet = () => new Set<string>(lots().map((lot) => lot.symbol));

  const sheetAt = (prices: Prices, sessionTime: number): BalanceSheet => {
    const ledger = portfolio!;

    return {
      equity: ledger.equity(prices, sessionTime),
      mv: ledger.marketValues(prices),
      funded: fundedSet(),
      debt: ledger.liabilities(sessionTime)
    };
  };

  // ----- start -----

  if (portfolio) {
    const prices = closePrices(startIndex);

    portfolio.voog = portfolio.sharesFor(config.initial.voog, prices.VOOG!);
    portfolio.vgtCore = portfolio.sharesFor(config.initial.vgt, prices.VGT!);
    portfolio.cash =
      config.initial.voog + config.initial.vgt - portfolio.voog * prices.VOOG! - portfolio.vgtCore * prices.VGT!;
    portfolio.log('start', startIndex, dates[startIndex]!, closeTimes[startIndex]!, prices, sTime[startIndex]!, {
      note: `VOOG ${portfolio.voog} @ ${prices.VOOG}, VGT ${portfolio.vgtCore} @ ${prices.VGT}`
    });
  }

  const startValue = portfolio ? portfolio.equity(closePrices(startIndex), sTime[startIndex]!) : 0;
  const firstDs = datasets[marketSecurities[0]!]!;
  const firstBarTime = firstDs.bTime[firstDs.sBarStart[startIndex]!]!;
  const equityTracker = new Tracker(startValue, portfolio ? closeTimes[startIndex]! : sTime[startIndex]!);
  const minuteTracker = new Tracker(startValue, portfolio ? closeTimes[startIndex]! : firstBarTime);
  const strategyTracker = new Tracker(0, sTime[startIndex]!);
  const strategyMinuteTracker = new Tracker(0, portfolio ? closeTimes[startIndex]! : firstBarTime);
  const dailyPercentTracker = new PercentTracker(startValue, closeTimes[startIndex]!);
  const minutePercentTracker = new PercentTracker(startValue, closeTimes[startIndex]!);

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

  const gate = (symbol: string, s: number): Gate => {
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

    if (!portfolio) {
      const principal = config.fixedPrincipal;

      if (count >= slots) {
        return refused(`pool occupied (${label})`, principal);
      }

      return { ...refused('', principal), grant: true, slot };
    }

    const sessionTime = sTime[s]!;
    const prices = { ...lastClose };
    const sheet = sheetAt(prices, sessionTime);
    const equity = sheet.equity;
    const full = config.fraction * equity;
    const reserved = reservations.reduce((total, reservation) => total + reservation.principal, 0);
    const reservedSheet: BalanceSheet = {
      ...sheet,
      debt: sheet.debt + reserved,
      mv: { ...sheet.mv },
      funded: new Set([...sheet.funded, ...reservations.map((reservation) => reservation.symbol)])
    };

    for (const reservation of reservations) {
      reservedSheet.mv[reservation.symbol] = reservedSheet.mv[reservation.symbol]! + reservation.principal;
    }

    const maxima: Partial<Record<ScheduleKey, number>> = {};

    for (const schedule of ['U35', 'U50', 'U60', 'L60', 'G60'] as ScheduleKey[]) {
      maxima[schedule] = maximumPrincipal(securities, reservedSheet, schedule, symbol);
    }

    const regTMaximum = regTMaximumPrincipal(securities, reservedSheet);
    const houseMaximum = maximumPrincipal(securities, reservedSheet, activeSchedule, symbol);
    const principal = full;
    const extra = { regTMaximum, houseMaximum, maxima };

    if (count >= slots) {
      return refused(
        count === reservations.length ? `pool reserved by a pending order (${label})` : `pool occupied (${label})`,
        principal,
        equity,
        extra
      );
    }

    if (!(principal > 0)) {
      return refused(`aggregate cap reached (${label})`, principal, equity, extra);
    }

    if (equity < protocol.minimumEquity) {
      return refused('equity below the $2,000 minimum', principal, equity, extra);
    }

    if (principal > regTMaximum + 1e-9) {
      return refused('Reg T initial margin', principal, equity, extra);
    }

    if (principal > houseMaximum + 1e-9) {
      return refused(`house requirement at entry (${activeSchedule})`, principal, equity, extra);
    }

    return { grant: true, reason: '', principal, equity, slot, ...extra };
  };

  // ----- entries -----

  const assertPoolCap = (s: number, time: number) => {
    const open = lots();

    if (open.length + reservations.length > 1) {
      throw new Error(
        `${config.key}: ${open.length} lots + ${reservations.length} reservations exceed 1 at ${dates[s]} ${time}`
      );
    }

    if (portfolio) {
      for (const lot of open) {
        const capAtDecision = config.fraction * lot.equityAtDecision;
        const others = open.filter((other) => other !== lot && other.entryTime <= lot.entryTime);
        const total = lot.originalPrincipal + others.reduce((sum, other) => sum + other.originalPrincipal, 0);

        if (total > capAtDecision * (1 + 1e-9) + 0.01) {
          throw new Error(
            `${config.key}: borrowing ${total} exceeds the cap ${capAtDecision} at lot ${lot.id}'s entry`
          );
        }
      }
    }
  };

  const openRealLot = (book: ShadowBook, trade: VirtualTrade, reservation: Reservation, s: number, k: number) => {
    const ds = datasets[book.symbol]!;
    const raw = priceAt(ds, s, k);
    const time = timeAt(ds, s, k);
    const ledger = portfolio ?? fixed!;
    const price = ledger.buyPrice(raw);
    const shares = reservation.principal / price;
    const principal = portfolio ? shares * price : reservation.principal;
    const fields = {
      id: ++lotId,
      symbol: book.symbol as string,
      trade,
      slot: reservation.slot,
      shares,
      entryIndex: s,
      entryBar: k,
      entryTime: time,
      entryRawPrice: raw,
      entryPrice: price,
      entryExecution: trade.entryExecution,
      entryTimestamp: sTime[s]!,
      decisionIndex: reservation.decisionIndex,
      decisionTime: trade.decisionTime,
      decisionPrice: trade.decisionPrice,
      equityAtDecision: reservation.equity,
      fraction: portfolio ? reservation.principal / reservation.equity : NaN,
      originalPrincipal: principal,
      principal,
      accruedBefore: 0,
      accrualStart: sTime[s]!,
      posted: 0,
      accrued: 0,
      repaidByCore: 0,
      dividends: 0
    };
    const lot: Lot = portfolio
      ? portfolio.openLot(fields)
      : (fixed!.openLot(fields as unknown as Parameters<FixedLedger['openLot']>[0]) as unknown as Lot);

    lotById.set(lot.id, lot);
    trade.fundedLotId = lot.id;
    reservations.splice(reservations.indexOf(reservation), 1);

    if (portfolio) {
      const prices = { ...lastClose, [book.symbol]: raw };

      portfolio.log('entry', s, dates[s]!, time, prices, sTime[s]!, {
        security: book.symbol,
        lotId: lot.id,
        shares,
        price,
        note: `${book.symbol} ${trade.setupKind} setup ${trade.setupId}; principal ${principal.toFixed(2)} = ${(100 * lot.fraction).toFixed(2)}% of ${reservation.equity.toFixed(2)}`
      });
      assertPoolCap(s, time);
    }
  };

  // ----- exits and core orders -----

  const scheduleCoreOrders = (lot: Lot, s: number, exitTime: number, net: number) => {
    const ledger = portfolio!;
    const decisionTime = exitTime + secondsPerMinute;
    const legs: { etf: CoreEtf; dollars: number; kind: CoreOrder['kind'] }[] = [];
    const voogValue = ledger.voog * lastClose.VOOG!;
    const vgtMark = lot.symbol === 'VGT' ? lot.exitRawPrice : lastClose.VGT!;
    const vgtValue = ledger.vgtCore * vgtMark;

    if (net > 0) {
      legs.push({ etf: 'VOOG', dollars: 0.6 * net, kind: 'reinvest' });
      legs.push({ etf: 'VGT', dollars: 0.4 * net, kind: 'reinvest' });
    } else if (net < 0) {
      const total = voogValue + vgtValue;

      if (total > 0) {
        legs.push({ etf: 'VOOG', dollars: (net * voogValue) / total, kind: 'fund loss' });
        legs.push({ etf: 'VGT', dollars: (net * vgtValue) / total, kind: 'fund loss' });
      }
    }

    for (const leg of legs) {
      if (Math.abs(leg.dollars) < 0.005) {
        continue;
      }

      const fill = firstTradeAtOrAfter(datasets[leg.etf]!, s, decisionTime, endIndex);

      coreOrders.push({
        ...leg,
        lotId: lot.id,
        fillIndex: fill?.index ?? Infinity,
        fillBar: fill?.bar ?? -1,
        done: false
      });
    }
  };

  const exitRealLot = (
    lot: Lot,
    s: number,
    bar: number,
    time: number,
    rawPrice: number,
    reason: Lot['exitReason'],
    execution: ExecutionPrice | '',
    extraSlippage: number
  ) => {
    const sessionTime = sTime[s]!;

    if (fixed) {
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

      return;
    }

    const ledger = portfolio!;
    const cashNet = ledger.closeLot(lot, {
      index: s,
      bar,
      time,
      rawPrice,
      reason,
      execution,
      sessionTime,
      extraSlippage,
      forced: false
    });
    const prices = { ...lastClose, [lot.symbol]: rawPrice };

    ledger.log('exit', s, dates[s]!, time, prices, sessionTime, {
      security: lot.symbol,
      lotId: lot.id,
      shares: -lot.shares,
      price: lot.exitPrice,
      note: `lot ${lot.id} ${reason}; net ${lot.net.toFixed(2)} (interest ${lot.interest.toFixed(2)})`
    });
    scheduleCoreOrders(lot, s, time, cashNet);
  };

  const executeCoreOrder = (order: CoreOrder, s: number, k: number) => {
    const ledger = portfolio!;
    const ds = datasets[order.etf]!;
    const raw = priceAt(ds, s, k);
    const time = timeAt(ds, s, k);
    const prices = { ...lastClose, [order.etf]: raw };

    order.done = true;

    if (order.dollars > 0) {
      const dollars = Math.min(order.dollars, Math.max(0, ledger.cash));

      if (dollars <= 0) {
        return;
      }

      const { shares, price } = ledger.buyCore(order.etf, dollars, raw);

      ledger.log('reinvest', s, dates[s]!, time, prices, sTime[s]!, {
        security: order.etf,
        lotId: order.lotId,
        shares,
        price,
        note: `lot ${order.lotId}: ${order.kind}`
      });
    } else {
      const price = ledger.sellPrice(raw);
      const want = -order.dollars / price;
      const { shares, proceeds } = ledger.sellCore(order.etf, want, raw);

      if (order.kind === 'fund loss' || ledger.fundingPayable > 0) {
        ledger.settleFunding(proceeds);
      }

      ledger.log('fund loss', s, dates[s]!, time, prices, sTime[s]!, {
        security: order.etf,
        lotId: order.lotId,
        shares: -shares,
        price,
        note: `lot ${order.lotId}: ${order.kind}`
      });
    }
  };

  const runCoreOrders = (etf: CoreEtf, s: number, k: number) => {
    for (const order of coreOrders) {
      if (!order.done && order.etf === etf && order.fillIndex === s && order.fillBar === k) {
        executeCoreOrder(order, s, k);
      }
    }
  };

  // ----- dividends (VGT and VOOG only; the books' other ETFs are price-only, the frozen convention) -----

  const bookEntitlement = (distribution: Distribution, s: number) => {
    const ledger = portfolio!;
    const held: { source: 'core' | 'lot'; shares: number; lot?: Lot }[] =
      distribution.etf === 'VOOG'
        ? [{ source: 'core', shares: ledger.voog }]
        : [
            { source: 'core', shares: ledger.vgtCore },
            ...(config.lotDividends
              ? ledger.open
                  .filter((lot) => lot.symbol === 'VGT')
                  .map((lot) => ({ source: 'lot' as const, shares: lot.shares, lot }))
              : [])
          ];
    const prices = { ...lastClose };

    for (const entry of held) {
      if (!(entry.shares > 0)) {
        continue;
      }

      const value = entry.shares * distribution.amount;

      ledger.receivables.push({
        etf: distribution.etf,
        exDate: distribution.exDate,
        payDate: distribution.payDate,
        amountPerShare: distribution.amount,
        shares: entry.shares,
        value,
        source: entry.source,
        lotId: entry.lot?.id ?? 0
      });

      if (entry.lot) {
        entry.lot.dividends += value;
      }

      ledger.log('ex-date', s, dates[s]!, sTime[s]!, prices, sTime[s]!, {
        security: distribution.etf,
        lotId: entry.lot?.id ?? 0,
        price: distribution.amount,
        note: `${entry.source} ${entry.shares.toFixed(4)} shares × ${distribution.amount.toFixed(4)} = ${value.toFixed(2)}, pays ${distribution.payDate}`
      });
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
    }
  };

  // ----- marks and margin measures -----

  const warningRatio = protocol.warningRatio;
  const criticalRatio = protocol.criticalRatio;
  let sessionMin: Partial<Record<ScheduleKey, NApproach>> = {};
  let dayBelow: { warning: Partial<Record<ScheduleKey, number>>; critical: Partial<Record<ScheduleKey, number>> } = {
    warning: {},
    critical: {}
  };

  const markPortfolio = (s: number, time: number, isClose: boolean) => {
    const ledger = portfolio!;
    const sessionTime = sTime[s]!;
    const mv = ledger.marketValues(lastClose);
    const lmv = lmvOf(securities, mv);
    const debt = ledger.liabilities(sessionTime);
    const equity = lmv + ledger.receivableValue() + ledger.cash - debt;
    const funded = fundedSet();
    const strategyMark = ledger.realized + ledger.unrealized(lastClose, sessionTime);

    minuteTracker.update(equity, time);
    minutePercentTracker.update(equity, time);
    strategyMinuteTracker.update(strategyMark, time);
    marginMarks++;

    for (const lot of ledger.open) {
      const mark = lot.shares * lastClose[lot.symbol]! - lot.originalPrincipal - ledger.lotInterest(lot, sessionTime);

      lot.heldMarks++;

      if (mark < lot.worstMark) {
        lot.worstMark = mark;
        lot.worstMarkTime = time;
      }
    }

    for (const schedule of passive) {
      const required = requiredOf(securities, schedule, mv, funded);
      const ratio = required > 0 ? equity / required : Infinity;
      const excess = equity - required;
      const min = minimum[schedule]!;

      if (ratio < min.ratio) {
        min.ratio = ratio;
        min.time = time;
      }

      if (excess < min.excess) {
        min.excess = excess;
        min.excessTime = time;
      }

      if (!isClose) {
        if (ratio < warningRatio) {
          minutesBelow[schedule]!.warning++;
          dayBelow.warning[schedule] = (dayBelow.warning[schedule] ?? 0) + 1;
        }

        if (ratio < criticalRatio) {
          minutesBelow[schedule]!.critical++;
          dayBelow.critical[schedule] = (dayBelow.critical[schedule] ?? 0) + 1;
        }
      }

      const current = sessionMin[schedule];

      if (!current || ratio < current.ratio) {
        let stale = 0;

        for (const security of securities) {
          if (mv[security]! > 0) {
            stale = Math.max(stale, time - lastCloseTime[security]!);
          }
        }

        sessionMin[schedule] = {
          schedule,
          index: s,
          date: dates[s]!,
          time,
          ratio,
          excess,
          required,
          equity,
          lmv,
          debt,
          mv: { ...mv },
          funded: [...funded],
          lots: ledger.open.map((lot) => `${lot.symbol}#${lot.id}`).join('+'),
          staleSeconds: stale
        };
      }
    }
  };

  const fixedMarks = new Map<number, number>();

  const markFixed = (s: number, time: number, barSymbols: ReadonlySet<string> | undefined) => {
    const ledger = fixed!;
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
  };

  // ----- the sessions -----

  const instruments = marketSecurities.map((security) => ({ security, ds: datasets[security]! }));
  const bookList = bookOrderOf(config.symbols).map((symbol) => books.get(symbol)!);
  const tieBooks = tieOrder.map((symbol) => books.get(symbol)!);
  const cursor = new Int32Array(instruments.length);
  const atBar = Object.fromEntries(securities.map((security) => [security, -1])) as Record<string, number>;

  for (let s = startIndex + 1; s <= endIndex; s++) {
    const date = dates[s]!;
    const sessionTime = sTime[s]!;

    sessionMin = {};
    dayBelow = { warning: {}, critical: {} };

    for (const security of marketSecurities) {
      lastClose[security] = datasets[security]!.sClose[s - 1]!;
      lastCloseTime[security] = closeTimes[s - 1]!;
    }

    if (portfolio) {
      for (const distribution of universe.distributions) {
        if (distribution.exDate === date) {
          bookEntitlement(distribution, s);
        }
      }
    }

    for (const book of bookList) {
      book.beginSession(s);
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

      // 2. core VOOG orders
      if (portfolio && present.has('VOOG')) {
        runCoreOrders('VOOG', s, atBar.VOOG!);
      }

      // 3. virtual exits, closing their funded lots
      for (const book of bookList) {
        const k = atBar[book.symbol]!;

        if (k < 0) {
          continue;
        }

        const decision = book.exitAt(k);

        if (decision) {
          closeVirtual(book, s, decision);
        }
      }

      // 4. core VGT orders
      if (portfolio && present.has('VGT')) {
        runCoreOrders('VGT', s, atBar.VGT!);
      }

      // 5. virtual entry fills, opening funded lots
      for (const book of bookList) {
        const k = atBar[book.symbol]!;

        if (k >= 0 && book.fillAt(k)) {
          fillVirtual(book, s, k);
        }
      }

      for (const security of present) {
        const ds = datasets[security]!;

        lastClose[security] = ds.bClose[ds.sBarStart[s]! + atBar[security]!]!;
        lastCloseTime[security] = T + secondsPerMinute;
      }

      // 6. decisions, in the tie order
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

      // 7. marks
      if (portfolio) {
        let isHeld = present.has('VOOG') || present.has('VGT');

        for (const security of present) {
          if (heldBefore.has(security) || lots().some((lot) => lot.symbol === security)) {
            isHeld = true;
          }
        }

        if (isHeld) {
          markPortfolio(s, T, false);
        }
      } else {
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

    if (portfolio) {
      runCoreOrders('VOOG', s, counts.VOOG!);
    }

    for (const book of bookList) {
      const decision = book.exitAt(counts[book.symbol]!);

      if (decision) {
        closeVirtual(book, s, decision);
      }
    }

    if (portfolio) {
      runCoreOrders('VGT', s, counts.VGT!);
    }

    for (const book of bookList) {
      if (book.fillAt(counts[book.symbol]!)) {
        fillVirtual(book, s, counts[book.symbol]!);
      }
    }

    for (const security of marketSecurities) {
      lastClose[security] = datasets[security]!.sClose[s]!;
      lastCloseTime[security] = closeTime;
    }

    if (portfolio) {
      const prices = { ...lastClose };

      for (const row of portfolio.receivables.filter((receivable) => receivable.payDate === date)) {
        const price = prices[row.etf]!;

        portfolio.cash += row.value;
        portfolio.receivables.splice(portfolio.receivables.indexOf(row), 1);

        const bought = portfolio.buyCore(row.etf, row.value, price, true);

        portfolio.dividends += row.value;

        if (row.source === 'lot') {
          portfolio.lotDividends += row.value;
        }

        dividends.push({
          etf: row.etf,
          exDate: row.exDate,
          payDate: row.payDate,
          source: row.source,
          lotId: row.lotId,
          value: row.value
        });
        portfolio.log('dividend paid', s, date, closeTime, prices, sessionTime, {
          security: row.etf,
          lotId: row.lotId,
          shares: bought.shares,
          price,
          note: `${row.source} ${row.exDate} ${row.amountPerShare.toFixed(4)}/share`
        });
      }
    }

    for (const book of bookList) {
      book.afterSession(s);
    }

    if (portfolio) {
      const row = dailyRow(s);

      daily.push(row);
      equityTracker.update(row.equity, closeTime);
      dailyPercentTracker.update(row.equity, closeTime);
      strategyTracker.update(row.strategyMark, sessionTime);
      markPortfolio(s, closeTime, true);

      for (const schedule of passive) {
        const approach = sessionMin[schedule];

        if (approach) {
          approaches.push(approach);
          row.minuteMinRatio[schedule] = approach.ratio;
        }

        const ratio = row.required[schedule]! > 0 ? row.equity / row.required[schedule]! : Infinity;

        minimum[schedule]!.dailyRatio = Math.min(minimum[schedule]!.dailyRatio, ratio);
        row.minutesBelowWarning[schedule] = dayBelow.warning[schedule] ?? 0;
        row.minutesBelowCritical[schedule] = dayBelow.critical[schedule] ?? 0;
      }
    } else {
      markFixed(s, closeTime, undefined);

      const ledger = fixed!;
      let unrealized = 0;

      for (const lot of ledger.open) {
        unrealized += ledger.mark(lot, lastClose[lot.symbol]!, sessionTime);
      }

      equityTracker.updateStrict(ledger.realized + unrealized, sessionTime);
      daily.push(dailyRowFixed(s, unrealized));
    }
  }

  // ----- the end -----

  const lastSessionTime = sTime[endIndex]!;

  for (const book of bookList) {
    book.finish(endIndex);
  }

  for (const lot of lots()) {
    const close = datasets[lot.symbol]!.sClose[endIndex]!;

    lot.exitRawPrice = close;
    lot.interest = portfolio
      ? portfolio.lotInterest(lot, lastSessionTime)
      : fixed!.lotInterest(lot as unknown as RealLot, lastSessionTime);
    lot.gross = lot.shares * close - lot.originalPrincipal;
    lot.net = lot.gross - lot.interest;
  }

  if (portfolio) {
    portfolio.log('end', endIndex, dates[endIndex]!, closeTimes[endIndex]!, closePrices(endIndex), lastSessionTime, {
      note: `${portfolio.open.length} lot(s) open`
    });
  }

  const trades = bookList.flatMap((book) => book.trades);

  return {
    config,
    universe,
    endIndex,
    trades,
    lots: allLots(),
    signals,
    events: portfolio?.events ?? [],
    daily,
    dividends,
    dailyDrawdown: equityTracker.stats(),
    minuteDrawdown: minuteTracker.stats(),
    strategyDailyDrawdown: (portfolio ? strategyTracker : equityTracker).stats(),
    strategyMinuteDrawdown: (portfolio ? strategyMinuteTracker : minuteTracker).stats(),
    ...(portfolio
      ? { dailyPercentDrawdown: dailyPercentTracker.stats(), minutePercentDrawdown: minutePercentTracker.stats() }
      : {}),
    approaches,
    minimum,
    marginMarks,
    minutesBelow,
    reservationsAtEnd: reservations.map((reservation) => ({
      symbol: reservation.symbol,
      principal: reservation.principal,
      decisionTime: reservation.trade.decisionTime
    })),
    ledgerChecks: { events: portfolio?.events.length ?? 0, poolChecks },
    books: bookList.map((book) => ({
      symbol: book.symbol,
      phenotype: book.phenotype,
      setups: book.machine.setups,
      signals: book.signals.length,
      armedAtEnd: book.machine.state === 'ARMED',
      pendingAtEnd: Boolean(book.order)
    }))
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
  }

  function fillVirtual(book: ShadowBook, s: number, k: number) {
    const order = book.order!;
    const reservation = reservations.find((candidate) => candidate.trade === order.trade);
    const trade = book.open(s, k);

    if (reservation) {
      openRealLot(book, trade, reservation, s, k);
    }
  }

  function dailyRow(s: number): NDailyRow {
    const ledger = portfolio!;
    const prices = { ...lastClose };
    const sessionTime = sTime[s]!;
    const mv = ledger.marketValues(prices);
    const lmv = lmvOf(securities, mv);
    const interestLiability = ledger.interestLiability(sessionTime);
    const liabilities = ledger.liabilities(sessionTime);
    const equity = ledger.equity(prices, sessionTime);
    const unrealized = ledger.unrealized(prices, sessionTime);
    const funded = fundedSet();
    const required: Partial<Record<ScheduleKey, number>> = {};

    for (const schedule of passive) {
      required[schedule] = requiredOf(securities, schedule, mv, funded);
    }

    return {
      index: s,
      date: dates[s]!,
      closes: prices,
      voogShares: ledger.voog,
      vgtCoreShares: ledger.vgtCore,
      lotShares: lotSharesOf(),
      mv,
      cash: ledger.cash,
      receivables: ledger.receivableValue(),
      principal: ledger.principalOutstanding(),
      interestLiability,
      fundingPayable: ledger.fundingPayable,
      lmv,
      equity,
      equityToLmv: lmv > 0 ? equity / lmv : 1,
      debtToEquity: equity > 0 ? liabilities / equity : Infinity,
      grossExposure: equity > 0 ? lmv / equity : Infinity,
      realized: ledger.realized,
      unrealized,
      strategyMark: ledger.realized + unrealized,
      cumulativeInterest: ledger.interestPaid + interestLiability,
      cumulativeDividends: ledger.dividends,
      coreTurnover: ledger.coreTurnover,
      openLots: ledger.open.length,
      owners: ledger.open.map((lot) => lot.symbol).join('+'),
      required,
      minuteMinRatio: {},
      minutesBelowWarning: {},
      minutesBelowCritical: {}
    };
  }

  function dailyRowFixed(s: number, unrealized: number): NDailyRow {
    const ledger = fixed!;
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

export { baseSecurities };
