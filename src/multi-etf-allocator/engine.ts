// The allocator engine (PROTOCOL.md §3–§8): one chronological, look-ahead-free pass over the common sessions. Each
// session merges the minute bars of every file into one timeline; at each bar start T the order is §3.1's: forced
// sales, core VOOG orders, virtual exits (closing their funded lots), core VGT orders, virtual entry fills (opening
// funded lots), then every book processes its bar and a rebound decision stamped T + 60 s goes to the allocator, then
// the marks. The same books and the same allocator serve both modes; only the ledger differs:
//
//   fixed      a fixed principal per lot (one $100,000 pool, or two $50,000 slots), realized P&L from $0, simple 11%
//   portfolio  the $300,000 VOOG/VGT margin account, f × equity per lot, profits reinvested 60/40, losses funded by
//              proportional core sales, dividends, Reg T and house checks at entry, maintenance measures at every
//              mark, and (stress runs only) calls and forced liquidation
import { type Dataset, firstIndexOnOrAfter } from '../four-family/data.ts';
import type { Distribution } from '../shared-margin-portfolio/data.ts';
import {
  type ExecutionPrice,
  type ExitDecision,
  type ReboundSignal,
  type StopFill,
  firstTradeAfterDecision,
  priceAt,
  secondsPerMinute,
  timeAt
} from '../shared-margin-portfolio/strategy.ts';
import {
  type Combination,
  type CoreEtf,
  type Policy,
  type Security,
  type Sym,
  combinationKey,
  policySemantics,
  protocol,
  securities,
  symbols,
  tieOrderOf
} from './context.ts';
import { type Shock, type Universe, shockedUniverse } from './data.ts';
import {
  type InterestModel,
  type LedgerEvent,
  type Prices,
  type RealLot,
  FixedLedger,
  PortfolioLedger,
  secondsPerDay
} from './ledger.ts';
import {
  type BalanceSheet,
  type MarketValues,
  type ScheduleKey,
  coreSaleToRestore,
  emptyValues,
  lmvOf,
  maximumPrincipal,
  regTMaximumPrincipal,
  requiredOf,
  requirementRate
} from './margin.ts';
import type { ResolvedPhenotype } from './phenotypes.ts';
import { type VirtualTrade, ShadowBook } from './shadow.ts';

export type Mode = 'fixed' | 'portfolio';
export type CorePolicy = 'contribute' | 'rebalance' | 'none';

export interface Liquidation {
  monitoring: 'intraday' | 'close';
  timing: 'immediate' | 'next-open' | 'deadline' | 'halt';
  order: 'lot-first' | 'core-first';
  slippageBps: number;
}

export interface RequirementChange {
  index: number; // effective from the start of this session
  schedule: ScheduleKey;
}

export interface RunConfig {
  key: string;
  label: string;
  mode: Mode;
  combination: Combination;
  symbols: Sym[]; // the books that run (the VGT-only controls run one)
  phenotypes: Record<Sym, ResolvedPhenotype>;
  policy: Policy;
  fraction: number; // portfolio: borrowed principal ÷ equity at the decision
  fixedPrincipal: number; // fixed: the full pool
  interest: InterestModel; // the ledger's interest
  bookRate: number; // the books' decision rate (simple, 365)
  stopFill: StopFill;
  costBps: number;
  stopSlippageBps: number;
  corePolicy: CorePolicy;
  lotDividends: boolean; // VGT lots entitled to VGT distributions (the earlier study's convention)
  initial: { voog: number; vgt: number };
  eligibilityIndex?: number;
  // The session at whose close the run starts (default 0, the protocol's 2016-01-04): the portfolio is funded and
  // every tracker starts there, and sessions are processed from the next one. Earlier sessions are history only:
  // the books' reference levels read them, nothing is traded, marked, accrued or recorded in them
  // (src/multi-etf-allocator/dataset.ts sets it for a warmed-up --dataset evaluation).
  accountingStartIndex?: number;
  endIndex?: number;
  shocks?: Shock[];
  baseSchedule: ScheduleKey; // the requirement in force from the start (entry check and calls)
  requirementChanges?: RequirementChange[];
  liquidation?: Liquidation;
  passiveSchedules: readonly ScheduleKey[];
}

export const baseRunConfig = (
  overrides: Partial<RunConfig> & Pick<RunConfig, 'key' | 'label' | 'mode' | 'combination' | 'phenotypes'>
): RunConfig => ({
  symbols: [...symbols],
  policy: 'shadow',
  fraction: protocol.fraction,
  fixedPrincipal: protocol.fixedPrincipal,
  interest: { kind: 'simple', rate: protocol.rate },
  bookRate: protocol.rate,
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

export interface SignalRecord {
  repeatedRefusals: number; // hold semantics: later refused re-tests of the same setup
  symbol: Sym;
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
  occupiedBy: string; // the lots / reservations holding the pool
  equityAtDecision: number;
  principal: number; // granted principal, or the would-be principal of a refusal
  regTMaximum: number;
  houseMaximum: number; // under the schedule in force
  maximumU50: number;
  maximumU60: number;
  maximumL60: number;
  maximumG60: number;
  staleSeconds: Partial<Record<Security, number>>;
  trade?: VirtualTrade; // the virtual trade it created (shadow semantics, or a grant)
}

export interface DailyRow {
  index: number;
  date: string;
  closes: Prices;
  voogShares: number;
  vgtCoreShares: number;
  lotShares: Record<Sym, number>;
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
  minuteMinRatio: Partial<Record<ScheduleKey, number>>; // lowest equity/required of the session's minute marks
  minutesBelowWarning: Partial<Record<ScheduleKey, number>>;
  minutesBelowCritical: Partial<Record<ScheduleKey, number>>;
}

export interface DrawdownStats {
  maximum: number;
  maximumPercent: number;
  peakTime: number;
  troughTime: number;
  peakValue: number;
  troughValue: number;
  recoveryTime: number;
}

export class Tracker {
  peak: number;
  peakTime: number;
  maximum = 0;
  maximumPercent = 0;
  ddPeakTime: number;
  troughTime: number;
  peakValue: number;
  troughValue: number;
  recoveryTime = NaN;
  private recovering = false;

  constructor(start: number, time: number) {
    this.peak = start;
    this.peakTime = time;
    this.ddPeakTime = time;
    this.troughTime = time;
    this.peakValue = start;
    this.troughValue = start;
  }

  // The earlier ledger's tracker (portfolio): a new peak on ≥, percentages of the peak.
  update(value: number, time: number) {
    if (value >= this.peak) {
      if (this.recovering && value >= this.peakValue) {
        this.recoveryTime = time;
        this.recovering = false;
      }

      this.peak = value;
      this.peakTime = time;
    }

    if (this.peak - value > this.maximum) {
      this.maximum = this.peak - value;
      this.maximumPercent = this.peak > 0 ? this.maximum / this.peak : 0;
      this.ddPeakTime = this.peakTime;
      this.troughTime = time;
      this.peakValue = this.peak;
      this.troughValue = value;
      this.recoveryTime = NaN;
      this.recovering = true;
    }
  }

  // The strategy files' tracker (fixed pool): a new peak only on >.
  updateStrict(value: number, time: number) {
    if (value > this.peak) {
      if (this.recovering && value >= this.peakValue) {
        this.recoveryTime = time;
        this.recovering = false;
      }

      this.peak = value;
      this.peakTime = time;
    }

    if (this.peak - value > this.maximum) {
      this.maximum = this.peak - value;
      this.maximumPercent = this.peak > 0 ? this.maximum / this.peak : 0;
      this.ddPeakTime = this.peakTime;
      this.troughTime = time;
      this.peakValue = this.peak;
      this.troughValue = value;
      this.recoveryTime = NaN;
      this.recovering = true;
    }
  }

  stats(): DrawdownStats {
    return {
      maximum: this.maximum,
      maximumPercent: this.maximumPercent,
      peakTime: this.ddPeakTime,
      troughTime: this.troughTime,
      peakValue: this.peakValue,
      troughValue: this.troughValue,
      recoveryTime: this.recoveryTime
    };
  }
}

export interface PercentDrawdownStats {
  maximumPercent: number;
  dollars: number; // the fall of that episode
  peakTime: number;
  troughTime: number;
  peakValue: number;
  troughValue: number;
  recoveryTime: number;
}

// The largest fall in percent of the running peak, tracked independently of Tracker, which keeps the largest fall in
// dollars and reports that episode's depth. In a compounding account the two are generally different episodes (a
// small early account falls further in percent for fewer dollars). A new peak on ≥, as Tracker.update.
export class PercentTracker {
  private peak: number;
  private peakTime: number;
  private recovering = false;
  private worst: PercentDrawdownStats;

  constructor(start: number, time: number) {
    this.peak = start;
    this.peakTime = time;
    this.worst = {
      maximumPercent: 0,
      dollars: 0,
      peakTime: time,
      troughTime: time,
      peakValue: start,
      troughValue: start,
      recoveryTime: NaN
    };
  }

  update(value: number, time: number) {
    if (value >= this.peak) {
      if (this.recovering && value >= this.worst.peakValue) {
        this.worst.recoveryTime = time;
        this.recovering = false;
      }

      this.peak = value;
      this.peakTime = time;
    }

    const percent = this.peak > 0 ? (this.peak - value) / this.peak : 0;

    if (percent > this.worst.maximumPercent) {
      this.worst = {
        maximumPercent: percent,
        dollars: this.peak - value,
        peakTime: this.peakTime,
        troughTime: time,
        peakValue: this.peak,
        troughValue: value,
        recoveryTime: NaN
      };
      this.recovering = true;
    }
  }

  stats(): PercentDrawdownStats {
    return { ...this.worst };
  }
}

// A closest-approach candidate: the lowest equity/required of one session under one schedule.
export interface Approach {
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
  funded: Security[];
  lots: string;
  staleSeconds: number; // the oldest mark among held securities
}

export interface MaintenanceEvent {
  index: number;
  date: string;
  time: number;
  kind: 'requirement change' | 'call' | 'liquidation' | 'call cleared' | 'warning' | 'critical' | 'deadline check';
  schedule: ScheduleKey | '';
  equity: number;
  required: number;
  excess: number;
  lmv: number;
  note: string;
}

export interface ForcedLiquidation {
  callId: number;
  index: number;
  date: string;
  time: number;
  security: Security;
  lotId: number;
  shares: number;
  price: number;
  proceeds: number;
  reason: string;
  equityBefore: number;
  requiredBefore: number;
  equityAfter: number;
  requiredAfter: number;
}

export interface RunResult {
  config: RunConfig;
  universe: Universe;
  endIndex: number;
  trades: VirtualTrade[]; // every virtual trade of every book
  lots: RealLot[];
  signals: SignalRecord[];
  events: LedgerEvent[];
  daily: DailyRow[];
  dividends: { etf: CoreEtf; exDate: string; payDate: string; source: string; lotId: number; value: number }[];
  dailyDrawdown: DrawdownStats;
  minuteDrawdown: DrawdownStats;
  strategyDailyDrawdown: DrawdownStats;
  strategyMinuteDrawdown: DrawdownStats;
  // Portfolio only: the largest percentage falls of marked equity at the closes and at every minute mark, independent
  // of the largest-dollar episodes above (whose maximumPercent is that episode's depth, not the largest percentage).
  dailyPercentDrawdown?: PercentDrawdownStats;
  minutePercentDrawdown?: PercentDrawdownStats;
  approaches: Approach[]; // per session per schedule
  minimum: Partial<
    Record<ScheduleKey, { ratio: number; time: number; excess: number; excessTime: number; dailyRatio: number }>
  >;
  marginMarks: number;
  minutesBelow: Partial<Record<ScheduleKey, { warning: number; critical: number }>>;
  maintenanceEvents: MaintenanceEvent[];
  forcedLiquidations: ForcedLiquidation[];
  reservationsAtEnd: { symbol: Sym; principal: number; decisionTime: number }[];
  ledgerChecks: { events: number; poolChecks: number };
  books: {
    symbol: Sym;
    phenotype: string;
    setups: number;
    signals: number;
    armedAtEnd: boolean;
    pendingAtEnd: boolean;
  }[];
}

interface Reservation {
  trade: VirtualTrade;
  symbol: Sym;
  principal: number;
  equity: number;
  slot: number;
  decisionIndex: number;
}

interface CoreOrder {
  etf: CoreEtf;
  dollars: number; // + buy, − sell
  kind: 'reinvest' | 'fund loss' | 'rebalance';
  lotId: number;
  fillIndex: number;
  fillBar: number;
  done: boolean;
}

interface ForcedOrder {
  callId: number;
  kind: 'lot' | 'core';
  security: Security;
  lotId: number;
  shares: number; // core sales
  fillIndex: number;
  fillBar: number;
  done: boolean;
}

// The first trade at or after `time`: a bar starting at or after it in session s, the closing print for a time
// before the close, else the next session's opening trade. Undefined at the end of the data.
export const firstTradeAtOrAfter = (ds: Dataset, s: number, time: number, endIndex: number) => {
  const k = firstTradeAfterDecision(ds, s, time);

  if (k >= 0) {
    return { index: s, bar: k };
  }

  return s + 1 <= endIndex ? { index: s + 1, bar: 0 } : undefined;
};

const symbolOrder: Sym[] = ['VGT', 'XBI', 'XRT', 'KRE'];

export const runAllocator = (baseUniverse: Universe, config: RunConfig): RunResult => {
  const universe = shockedUniverse(baseUniverse, config.shocks ?? []);
  const endIndex = Math.min(config.endIndex ?? universe.sessionCount - 1, universe.sessionCount - 1);
  const armStart = config.eligibilityIndex ?? universe.eligibilityIndex;
  const startIndex = config.accountingStartIndex ?? 0;

  if (!(startIndex >= 0 && startIndex < endIndex && armStart >= startIndex)) {
    throw new Error(
      `${config.key}: accounting start ${startIndex} must precede the end ${endIndex} and arming ${armStart}`
    );
  }

  const isPortfolio = config.mode === 'portfolio';
  const semantics = policySemantics[config.policy];
  const tieOrder = tieOrderOf(config.policy).filter((symbol) => config.symbols.includes(symbol));
  const instrumentOf = (security: Security) => {
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
  const marketSecurities: Security[] = isPortfolio
    ? securities.filter(
        (security) => security === 'VOOG' || security === 'VGT' || config.symbols.includes(security as Sym)
      )
    : [...config.symbols];
  const datasets = Object.fromEntries(marketSecurities.map((security) => [security, instrumentOf(security)])) as Record<
    Security,
    Dataset
  >;
  const books = new Map<Sym, ShadowBook>();

  for (const symbol of config.symbols) {
    const phenotype = config.phenotypes[symbol];

    books.set(
      symbol,
      new ShadowBook(
        symbol,
        phenotype.name,
        datasets[symbol],
        phenotype.params,
        {
          notional: protocol.notional,
          rate: config.bookRate,
          stopFill: config.stopFill,
          costBps: config.costBps,
          stopSlippageBps: config.stopSlippageBps
        },
        armStart
      )
    );
  }

  const portfolio = isPortfolio
    ? new PortfolioLedger({ costBps: config.costBps, interest: config.interest })
    : undefined;
  const fixed = isPortfolio ? undefined : new FixedLedger((config.interest as { rate: number }).rate, config.costBps);
  const lots = (): RealLot[] => (portfolio ? portfolio.open : fixed!.open);
  const allLots = (): RealLot[] => (portfolio ? portfolio.lots : fixed!.lots);
  const reservations: Reservation[] = [];
  const signals: SignalRecord[] = [];
  const daily: DailyRow[] = [];
  const dividends: RunResult['dividends'] = [];
  const coreOrders: CoreOrder[] = [];
  const forcedOrders: ForcedOrder[] = [];
  const maintenanceEvents: MaintenanceEvent[] = [];
  const forcedLiquidations: ForcedLiquidation[] = [];
  const approaches: Approach[] = [];
  const lotById = new Map<number, RealLot>();
  const passive = [
    ...new Set([
      ...config.passiveSchedules,
      config.baseSchedule,
      ...(config.requirementChanges ?? []).map((change) => change.schedule)
    ])
  ] as ScheduleKey[];
  const minimum: RunResult['minimum'] = {};
  const minutesBelow: RunResult['minutesBelow'] = {};
  let lotId = 0;
  let callId = 0;
  let poolChecks = 0;
  let marginMarks = 0;
  let activeSchedule: ScheduleKey = config.baseSchedule;
  let callPending = false;
  let deadline: { index: number; callId: number } | undefined;

  for (const schedule of passive) {
    minimum[schedule] = { ratio: Infinity, time: NaN, excess: Infinity, excessTime: NaN, dailyRatio: Infinity };
    minutesBelow[schedule] = { warning: 0, critical: 0 };
  }

  // ----- marks -----

  const lastClose = Object.fromEntries(securities.map((security) => [security, NaN])) as Prices;
  const lastCloseTime = Object.fromEntries(securities.map((security) => [security, NaN])) as Record<Security, number>;
  const closePrices = (s: number): Prices => {
    const prices = Object.fromEntries(securities.map((security) => [security, NaN])) as Prices;

    for (const security of marketSecurities) {
      prices[security] = datasets[security].sClose[s]!;
    }

    return prices;
  };

  const lotSharesOf = () => {
    const shares: Record<Sym, number> = { VGT: 0, XBI: 0, XRT: 0, KRE: 0 };

    for (const lot of lots()) {
      shares[lot.symbol] += lot.shares;
    }

    return shares;
  };

  const fundedSet = () => new Set<Security>(lots().map((lot) => lot.symbol));

  const sheetAt = (prices: Prices, sessionTime: number): BalanceSheet => {
    const ledger = portfolio!;

    return {
      equity: ledger.equity(prices, sessionTime),
      mv: ledger.marketValues(prices),
      funded: fundedSet(),
      debt: ledger.liabilities(sessionTime)
    };
  };

  // ----- start: the close of session startIndex (2016-01-04 in the protocol) -----

  if (portfolio) {
    const prices = closePrices(startIndex);

    portfolio.voog = portfolio.sharesFor(config.initial.voog, prices.VOOG);
    portfolio.vgtCore = portfolio.sharesFor(config.initial.vgt, prices.VGT);
    portfolio.cash =
      config.initial.voog + config.initial.vgt - portfolio.voog * prices.VOOG - portfolio.vgtCore * prices.VGT;
    portfolio.log('start', startIndex, dates[startIndex]!, closeTimes[startIndex]!, prices, sTime[startIndex]!, {
      note: `VOOG ${portfolio.voog} @ ${prices.VOOG}, VGT ${portfolio.vgtCore} @ ${prices.VGT}`
    });
    portfolio.accrueTo(sTime[startIndex]!, 0);
  }

  const startValue = portfolio ? portfolio.equity(closePrices(startIndex), sTime[startIndex]!) : 0;
  const firstDs = datasets[marketSecurities[0]!];
  const firstBarTime = firstDs.bTime[firstDs.sBarStart[startIndex]!]!;
  const equityTracker = new Tracker(startValue, portfolio ? closeTimes[startIndex]! : sTime[startIndex]!);
  const minuteTracker = new Tracker(startValue, portfolio ? closeTimes[startIndex]! : firstBarTime);
  const strategyTracker = new Tracker(0, sTime[startIndex]!);
  const strategyMinuteTracker = new Tracker(0, portfolio ? closeTimes[startIndex]! : firstBarTime);
  const dailyPercentTracker = new PercentTracker(startValue, closeTimes[startIndex]!);
  const minutePercentTracker = new PercentTracker(startValue, closeTimes[startIndex]!);

  // ----- the allocator's gate -----

  const occupancy = () => {
    const open = lots();
    const parts = [
      ...open.map((lot) => `${lot.symbol} lot ${lot.id}`),
      ...reservations.map((reservation) => `${reservation.symbol} pending order`)
    ];

    return { count: open.length + reservations.length, label: parts.join('+') };
  };

  const outstandingPrincipal = () =>
    lots().reduce((total, lot) => total + lot.principal, 0) +
    reservations.reduce((total, reservation) => total + reservation.principal, 0);

  const staleAges = (decisionTime: number) => {
    const ages: Partial<Record<Security, number>> = {};

    for (const security of marketSecurities) {
      ages[security] = decisionTime - lastCloseTime[security];
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

  const gate = (symbol: Sym, s: number): Gate => {
    poolChecks++;

    const { count, label } = occupancy();
    const isSplit = config.policy === 'split';
    const slots = isSplit ? 2 : 1;
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
      const principal = isSplit ? protocol.splitPrincipal : config.fixedPrincipal;

      if (count >= slots) {
        return refused(isSplit ? `both slots occupied (${label})` : `pool occupied (${label})`, principal);
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
      reservedSheet.mv[reservation.symbol] += reservation.principal;
    }

    const maxima: Partial<Record<ScheduleKey, number>> = {};

    for (const schedule of ['U35', 'U50', 'U60', 'L60', 'G60'] as ScheduleKey[]) {
      maxima[schedule] = maximumPrincipal(reservedSheet, schedule, symbol);
    }

    const regTMaximum = regTMaximumPrincipal(reservedSheet);
    const houseMaximum = maximumPrincipal(reservedSheet, activeSchedule, symbol);
    let principal = full;

    if (isSplit) {
      principal = Math.min(0.5 * full, full - outstandingPrincipal());
    }

    const extra = { regTMaximum, houseMaximum, maxima };

    if (count >= slots) {
      return refused(
        isSplit
          ? `both slots occupied (${label})`
          : count === reservations.length
            ? `pool reserved by a pending order (${label})`
            : `pool occupied (${label})`,
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

  // The pool cap at every fill: the outstanding principal never exceeds the cap measured at each lot's own decision.
  const assertPoolCap = (s: number, time: number) => {
    const open = lots();
    const slots = config.policy === 'split' ? 2 : 1;

    if (open.length + reservations.length > slots) {
      throw new Error(
        `${config.key}: ${open.length} lots + ${reservations.length} reservations exceed ${slots} at ${dates[s]} ${time}`
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
    const ds = datasets[book.symbol];
    const raw = priceAt(ds, s, k);
    const time = timeAt(ds, s, k);
    const ledger = portfolio ?? fixed!;
    const price = ledger.buyPrice(raw);
    const shares = reservation.principal / price;
    // The portfolio books the purchase cost as the principal (the earlier ledger); the fixed pool borrows exactly
    // its principal (the strategy files).
    const principal = portfolio ? shares * price : reservation.principal;
    const fields = {
      id: ++lotId,
      symbol: book.symbol,
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
    const lot = portfolio ? portfolio.openLot(fields) : fixed!.openLot(fields);

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

  const scheduleCoreOrders = (lot: RealLot, s: number, exitTime: number, net: number, vgtMark: number) => {
    const ledger = portfolio!;
    const decisionTime = exitTime + secondsPerMinute;
    const voogValue = ledger.voog * lastClose.VOOG;
    const vgtValue = ledger.vgtCore * vgtMark;
    const legs: { etf: CoreEtf; dollars: number; kind: CoreOrder['kind'] }[] = [];
    const proportional = (dollars: number, kind: CoreOrder['kind']) => {
      const total = voogValue + vgtValue;

      if (total <= 0) {
        return;
      }

      legs.push({ etf: 'VOOG', dollars: (dollars * voogValue) / total, kind });
      legs.push({ etf: 'VGT', dollars: (dollars * vgtValue) / total, kind });
    };

    if (config.corePolicy === 'rebalance') {
      const total = voogValue + vgtValue + net;

      legs.push({ etf: 'VOOG', dollars: 0.6 * total - voogValue, kind: 'rebalance' });
      legs.push({ etf: 'VGT', dollars: 0.4 * total - vgtValue, kind: 'rebalance' });
    } else if (net > 0 && config.corePolicy === 'contribute') {
      legs.push({ etf: 'VOOG', dollars: 0.6 * net, kind: 'reinvest' });
      legs.push({ etf: 'VGT', dollars: 0.4 * net, kind: 'reinvest' });
    } else if (net < 0) {
      proportional(net, 'fund loss');
    }

    for (const leg of legs) {
      if (Math.abs(leg.dollars) < 0.005) {
        continue;
      }

      const fill = firstTradeAtOrAfter(datasets[leg.etf], s, decisionTime, endIndex);

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
    lot: RealLot,
    s: number,
    bar: number,
    time: number,
    rawPrice: number,
    reason: RealLot['exitReason'],
    execution: ExecutionPrice | '',
    forced: boolean,
    extraSlippage: number
  ) => {
    const sessionTime = sTime[s]!;

    if (fixed) {
      fixed.closeLot(lot, { index: s, bar, time, rawPrice, reason, execution, sessionTime, extraSlippage });

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
      forced
    });
    const prices = { ...lastClose, [lot.symbol]: rawPrice };

    ledger.log(forced ? 'forced sale' : 'exit', s, dates[s]!, time, prices, sessionTime, {
      security: lot.symbol,
      lotId: lot.id,
      shares: -lot.shares,
      price: lot.exitPrice,
      note: `lot ${lot.id} ${reason}; net ${lot.net.toFixed(2)} (interest ${lot.interest.toFixed(2)})`
    });
    scheduleCoreOrders(lot, s, time, cashNet, lot.symbol === 'VGT' ? rawPrice : lastClose.VGT);
  };

  const executeCoreOrder = (order: CoreOrder, s: number, k: number) => {
    const ledger = portfolio!;
    const ds = datasets[order.etf];
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

      ledger.log(order.kind === 'rebalance' ? 'rebalance' : 'reinvest', s, dates[s]!, time, prices, sTime[s]!, {
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

      ledger.log(order.kind === 'rebalance' ? 'rebalance' : 'fund loss', s, dates[s]!, time, prices, sTime[s]!, {
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

  // ----- calls and forced liquidation (stress runs only) -----

  const coreRate = (prices: Prices) => {
    const ledger = portfolio!;
    const funded = fundedSet();
    const voogValue = ledger.voog * prices.VOOG;
    const vgtValue = ledger.vgtCore * prices.VGT;
    const total = voogValue + vgtValue;

    return total > 0
      ? (requirementRate(activeSchedule, 'VOOG', funded) * voogValue +
          requirementRate(activeSchedule, 'VGT', funded) * vgtValue) /
          total
      : protocol.baseRequirement;
  };

  const scheduleLiquidation = (s: number, detectionTime: number, prices: Prices, nextOpen: boolean) => {
    const ledger = portfolio!;
    const liquidation = config.liquidation!;
    const sessionTime = sTime[s]!;
    const sheet = sheetAt(prices, sessionTime);
    const required = requiredOf(activeSchedule, sheet.mv, sheet.funded);
    const lmv = lmvOf(sheet.mv);
    const id = ++callId;
    // A halted security (any funded lot's ETF, including core VGT when the lot is VGT) trades again at the next open.
    const resolve = (security: Security) =>
      nextOpen || (liquidation.timing === 'halt' && fundedSet().has(security))
        ? s + 1 <= endIndex
          ? { index: s + 1, bar: 0 }
          : undefined
        : firstTradeAtOrAfter(datasets[security], s, detectionTime, endIndex);

    maintenanceEvents.push({
      index: s,
      date: dates[s]!,
      time: detectionTime,
      kind: 'call',
      schedule: activeSchedule,
      equity: sheet.equity,
      required,
      excess: sheet.equity - required,
      lmv,
      note: `${liquidation.timing} ${liquidation.order}, monitoring ${liquidation.monitoring}`
    });

    const lotOrders = () => {
      for (const lot of [...lots()].sort((a, b) => b.shares * prices[b.symbol] - a.shares * prices[a.symbol])) {
        const halted = liquidation.timing === 'halt';
        const fill = halted
          ? s + 1 <= endIndex
            ? { index: s + 1, bar: 0 }
            : undefined
          : nextOpen
            ? s + 1 <= endIndex
              ? { index: s + 1, bar: 0 }
              : undefined
            : firstTradeAtOrAfter(datasets[lot.symbol], s, detectionTime, endIndex);

        if (fill) {
          forcedOrders.push({
            callId: id,
            kind: 'lot',
            security: lot.symbol,
            lotId: lot.id,
            shares: lot.shares,
            fillIndex: fill.index,
            fillBar: fill.bar,
            done: false
          });
        }
      }
    };
    const coreOrdersFor = (dollars: number) => {
      const voogValue = ledger.voog * prices.VOOG;
      const vgtValue = ledger.vgtCore * prices.VGT;
      const total = voogValue + vgtValue;

      for (const [etf, value] of [
        ['VOOG', voogValue],
        ['VGT', vgtValue]
      ] as [CoreEtf, number][]) {
        const fill = resolve(etf);

        if (fill && total > 0 && value > 0) {
          forcedOrders.push({
            callId: id,
            kind: 'core',
            security: etf,
            lotId: 0,
            shares: Math.min(ledger.coreShares(etf), (dollars * value) / total / prices[etf]),
            fillIndex: fill.index,
            fillBar: fill.bar,
            done: false
          });
        }
      }
    };

    if (liquidation.order === 'lot-first' || lots().length === 0) {
      lotOrders();
    } else {
      const dollars = coreSaleToRestore(sheet.equity, required, lmv, coreRate(prices), protocol.liquidationBuffer);
      const coreValue = ledger.voog * prices.VOOG + ledger.vgtCore * prices.VGT;

      coreOrdersFor(Math.min(dollars, coreValue));

      if (dollars > coreValue) {
        lotOrders();
      }
    }

    callPending = forcedOrders.some((order) => !order.done);
  };

  const executeForcedOrder = (order: ForcedOrder, s: number, k: number) => {
    const ledger = portfolio!;
    const ds = datasets[order.security];
    const raw = priceAt(ds, s, k);
    const time = timeAt(ds, s, k);
    const sessionTime = sTime[s]!;
    const prices = { ...lastClose, [order.security]: raw };
    const before = sheetAt(prices, sessionTime);
    const requiredBefore = requiredOf(activeSchedule, before.mv, before.funded);
    const slip = config.liquidation!.slippageBps / 10000;
    let shares = 0;
    let proceeds = 0;
    let lotIdSold = 0;

    order.done = true;

    if (order.kind === 'lot') {
      const lot = lotById.get(order.lotId);

      if (!lot || lot.exitIndex >= 0) {
        return;
      }

      shares = lot.shares;
      lotIdSold = lot.id;
      exitRealLot(
        lot,
        s,
        k,
        time,
        raw,
        'forced liquidation',
        k === 0 ? 'opening trade' : 'first trade after decision',
        true,
        slip
      );
      proceeds = lot.proceeds;
    } else {
      const sale = ledger.sellCore(order.security as CoreEtf, order.shares, raw, slip);

      shares = sale.shares;
      proceeds = sale.proceeds;
      ledger.settleFunding(proceeds);
      ledger.repayPrincipal(Math.max(0, ledger.cash), sessionTime);
      ledger.log('forced sale', s, dates[s]!, time, prices, sessionTime, {
        security: order.security,
        shares: -sale.shares,
        price: sale.price,
        note: `call ${order.callId}: core sale, proceeds repay the lots' principal`
      });
    }

    const after = sheetAt(prices, sessionTime);

    forcedLiquidations.push({
      callId: order.callId,
      index: s,
      date: dates[s]!,
      time,
      security: order.security,
      lotId: lotIdSold,
      shares,
      price: raw,
      proceeds,
      reason: order.kind === 'lot' ? 'lot sold' : 'core sold',
      equityBefore: before.equity,
      requiredBefore,
      equityAfter: after.equity,
      requiredAfter: requiredOf(activeSchedule, after.mv, after.funded)
    });
    maintenanceEvents.push({
      index: s,
      date: dates[s]!,
      time,
      kind: 'liquidation',
      schedule: activeSchedule,
      equity: after.equity,
      required: requiredOf(activeSchedule, after.mv, after.funded),
      excess: after.equity - requiredOf(activeSchedule, after.mv, after.funded),
      lmv: lmvOf(after.mv),
      note: `call ${order.callId}: ${order.kind === 'lot' ? `lot ${lotIdSold}` : order.security} sold, ${shares.toFixed(4)} shares at ${raw}`
    });

    if (!forcedOrders.some((candidate) => !candidate.done && candidate.callId === order.callId)) {
      callPending = false;

      // A lot-first sale that did not restore the buffer continues with proportional core sales.
      const sheet = sheetAt({ ...lastClose, [order.security]: raw }, sessionTime);
      const required = requiredOf(activeSchedule, sheet.mv, sheet.funded);

      if (sheet.equity - required < 0) {
        scheduleLiquidation(s, time + secondsPerMinute, { ...lastClose, [order.security]: raw }, false);
      }
    }
  };

  const runForcedOrders = (security: Security, s: number, k: number) => {
    for (const order of forcedOrders) {
      if (!order.done && order.security === security && order.fillIndex === s && order.fillBar === k) {
        executeForcedOrder(order, s, k);
      }
    }
  };

  // ----- dividends -----

  const bookEntitlement = (distribution: Distribution, s: number) => {
    const ledger = portfolio!;
    const held: { source: 'core' | 'lot'; shares: number; lot?: RealLot }[] =
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

  const lastSignal = new Map<Sym, SignalRecord>();

  const handleDecision = (book: ShadowBook, signal: ReboundSignal, s: number, sameMinute: number) => {
    const result = gate(book.symbol, s);
    const previous = lastSignal.get(book.symbol);

    // Hold semantics re-test a refused setup on every later minute: one record per setup, with the repeats counted.
    if (
      semantics === 'hold' &&
      !result.grant &&
      previous &&
      previous.outcome === 'refused' &&
      previous.setupId === signal.setup.id
    ) {
      previous.repeatedRefusals++;
      book.refuse(signal, s, semantics);

      return;
    }

    const record: SignalRecord = {
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
    lastSignal.set(book.symbol, record);

    if (semantics === 'shadow' || result.grant) {
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
    } else {
      book.refuse(signal, s, semantics);
    }
  };

  // ----- marks and margin measures -----

  let sessionMin: Partial<Record<ScheduleKey, Approach>> = {};
  let dayBelow: { warning: Partial<Record<ScheduleKey, number>>; critical: Partial<Record<ScheduleKey, number>> } = {
    warning: {},
    critical: {}
  };

  const markPortfolio = (s: number, time: number, isClose: boolean) => {
    const ledger = portfolio!;
    const sessionTime = sTime[s]!;
    const mv = ledger.marketValues(lastClose);
    const lmv = lmvOf(mv);
    const debt = ledger.liabilities(sessionTime);
    const equity = lmv + ledger.receivableValue() + ledger.cash - debt;
    const funded = fundedSet();
    const strategyMark = ledger.realized + ledger.unrealized(lastClose, sessionTime);

    minuteTracker.update(equity, time);
    minutePercentTracker.update(equity, time);
    strategyMinuteTracker.update(strategyMark, time);
    marginMarks++;

    for (const lot of ledger.open) {
      const mark = lot.shares * lastClose[lot.symbol] - lot.originalPrincipal - ledger.lotInterest(lot, sessionTime);

      lot.heldMarks++;

      if (mark < lot.worstMark) {
        lot.worstMark = mark;
        lot.worstMarkTime = time;
      }
    }

    for (const schedule of passive) {
      const required = requiredOf(schedule, mv, funded);
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
        if (ratio < protocol.warningRatio) {
          minutesBelow[schedule]!.warning++;
          dayBelow.warning[schedule] = (dayBelow.warning[schedule] ?? 0) + 1;
        }

        if (ratio < protocol.criticalRatio) {
          minutesBelow[schedule]!.critical++;
          dayBelow.critical[schedule] = (dayBelow.critical[schedule] ?? 0) + 1;
        }
      }

      const current = sessionMin[schedule];

      if (!current || ratio < current.ratio) {
        let stale = 0;

        for (const security of securities) {
          if (mv[security] > 0) {
            stale = Math.max(stale, time - lastCloseTime[security]);
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

    // Calls under the schedule in force (stress runs only).
    if (config.liquidation && !callPending) {
      const required = requiredOf(activeSchedule, mv, funded);

      if (equity < required) {
        const monitoring = config.liquidation.monitoring;

        if (monitoring === 'intraday' || isClose) {
          const detection = isClose ? closeTimes[s]! : time + secondsPerMinute;

          if (config.liquidation.timing === 'deadline') {
            if (isClose && !deadline) {
              deadline = { index: s + 3, callId: ++callId };
              maintenanceEvents.push({
                index: s,
                date: dates[s]!,
                time: detection,
                kind: 'call',
                schedule: activeSchedule,
                equity,
                required,
                excess: equity - required,
                lmv,
                note: `house call; liquidation at the open of ${dates[s + 4] ?? 'after the data'} if still deficient at the close of ${dates[s + 3] ?? 'after the data'}`
              });
            }
          } else {
            scheduleLiquidation(s, detection, { ...lastClose }, config.liquidation.timing === 'next-open');
          }
        }
      }
    }
  };

  const fixedMarks = new Map<number, number>(); // lot id → its last own-bar mark

  const markFixed = (s: number, time: number, barSymbols: ReadonlySet<Sym> | undefined) => {
    const ledger = fixed!;
    const sessionTime = sTime[s]!;
    let value = ledger.realized;

    for (const lot of ledger.open) {
      if (!barSymbols || barSymbols.has(lot.symbol)) {
        const mark = ledger.mark(lot, lastClose[lot.symbol], sessionTime);

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

  const instruments = marketSecurities.map((security) => ({ security, ds: datasets[security] }));
  const bookList = symbolOrder.filter((symbol) => books.has(symbol)).map((symbol) => books.get(symbol)!);
  const tieBooks = tieOrder.map((symbol) => books.get(symbol)!);
  const cursor = new Int32Array(instruments.length);
  const atBar = Object.fromEntries(securities.map((security) => [security, -1])) as Record<Security, number>;

  for (let s = startIndex + 1; s <= endIndex; s++) {
    const date = dates[s]!;
    const sessionTime = sTime[s]!;

    sessionMin = {};
    dayBelow = { warning: {}, critical: {} };

    for (const security of marketSecurities) {
      lastClose[security] = datasets[security].sClose[s - 1]!;
      lastCloseTime[security] = closeTimes[s - 1]!;
    }

    if (portfolio) {
      portfolio.accrueTo(sessionTime, daily.at(-1)?.equity ?? startValue, (posted, time) =>
        portfolio.log('interest posted', s, date, time, { ...lastClose }, sessionTime, {
          note: `${posted.toFixed(2)} of accrued interest added to the debit`
        })
      );

      // Requirement changes in force from this session's start.
      for (const change of config.requirementChanges ?? []) {
        if (change.index === s && change.schedule !== activeSchedule) {
          const sheet = sheetAt({ ...lastClose }, sessionTime);
          const required = requiredOf(change.schedule, sheet.mv, sheet.funded);

          maintenanceEvents.push({
            index: s,
            date,
            time: sessionTime,
            kind: 'requirement change',
            schedule: change.schedule,
            equity: sheet.equity,
            required,
            excess: sheet.equity - required,
            lmv: lmvOf(sheet.mv),
            note: `${activeSchedule} → ${change.schedule} before the open, marked at the previous close`
          });
          activeSchedule = change.schedule;
        }
      }

      // Ex-date entitlements for the shares held at the previous close.
      for (const distribution of universe.distributions) {
        if (distribution.exDate === date) {
          bookEntitlement(distribution, s);
        }
      }

      // A deadline call: liquidate at this session's open if still deficient at the previous close.
      if (deadline && deadline.index + 1 === s) {
        const previous = daily.at(-1)!;
        const required = previous.required[activeSchedule] ?? requiredOf(activeSchedule, previous.mv, fundedSet());

        maintenanceEvents.push({
          index: s,
          date,
          time: sessionTime,
          kind: 'deadline check',
          schedule: activeSchedule,
          equity: previous.equity,
          required,
          excess: previous.equity - required,
          lmv: previous.lmv,
          note: previous.equity < required ? 'still deficient: liquidation at this open' : 'cured by the market'
        });

        if (previous.equity < required) {
          scheduleLiquidation(s - 1, closeTimes[s - 1]!, { ...lastClose }, true);
        }

        deadline = undefined;
      }
    }

    for (const book of bookList) {
      book.beginSession(s);
    }

    for (let i = 0; i < instruments.length; i++) {
      cursor[i] = 0;
    }

    // The merged minute timeline.
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

      const present = new Set<Security>();

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

      const heldBefore = new Set<Sym>(lots().map((lot) => lot.symbol));

      // 1. forced sales
      if (forcedOrders.length > 0) {
        for (const security of present) {
          runForcedOrders(security, s, atBar[security]);
        }
      }

      // 2. core VOOG orders
      if (portfolio && present.has('VOOG')) {
        runCoreOrders('VOOG', s, atBar.VOOG);
      }

      // 3. virtual exits, closing their funded lots
      for (const book of bookList) {
        const k = atBar[book.symbol];

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
        runCoreOrders('VGT', s, atBar.VGT);
      }

      // 5. virtual entry fills, opening funded lots
      for (const book of bookList) {
        const k = atBar[book.symbol];

        if (k >= 0 && book.fillAt(k)) {
          fillVirtual(book, s, k);
        }
      }

      // The bars starting at T complete at T + 60 s: they are the marks of every decision stamped then.
      for (const security of present) {
        const ds = datasets[security];

        lastClose[security] = ds.bClose[ds.sBarStart[s]! + atBar[security]]!;
        lastCloseTime[security] = T + secondsPerMinute;
      }

      // 6. decisions, in the policy's tie order
      let sameMinute = 0;
      const pendingSignals: { book: ShadowBook; signal: ReboundSignal }[] = [];

      for (const book of tieBooks) {
        const k = atBar[book.symbol];

        if (k < 0) {
          continue;
        }

        const signal = book.processBar(s, k);

        if (signal) {
          pendingSignals.push({ book, signal });
        }
      }

      sameMinute = pendingSignals.length;

      for (const { book, signal } of pendingSignals) {
        handleDecision(book, signal, s, sameMinute);
      }

      // 7. marks
      if (portfolio) {
        let isHeld = present.has('VOOG') || present.has('VGT');

        for (const security of present) {
          if (heldBefore.has(security as Sym) || lots().some((lot) => lot.symbol === security)) {
            isHeld = true;
          }
        }

        if (isHeld) {
          markPortfolio(s, T, false);
        }
      } else {
        const barSymbols = new Set<Sym>();

        for (const security of present) {
          barSymbols.add(security as Sym);
        }

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
      marketSecurities.map((security) => [security, datasets[security].sBarCount[s]!])
    ) as Record<Security, number>;

    if (forcedOrders.length > 0) {
      for (const security of marketSecurities) {
        runForcedOrders(security, s, counts[security]);
      }
    }

    if (portfolio) {
      runCoreOrders('VOOG', s, counts.VOOG);
    }

    for (const book of bookList) {
      const decision = book.exitAt(counts[book.symbol]);

      if (decision) {
        closeVirtual(book, s, decision);
      }
    }

    if (portfolio) {
      runCoreOrders('VGT', s, counts.VGT);
    }

    for (const book of bookList) {
      if (book.fillAt(counts[book.symbol])) {
        fillVirtual(book, s, counts[book.symbol]);
      }
    }

    for (const security of marketSecurities) {
      lastClose[security] = datasets[security].sClose[s]!;
      lastCloseTime[security] = closeTime;
    }

    if (portfolio) {
      const prices = { ...lastClose };

      for (const row of portfolio.receivables.filter((receivable) => receivable.payDate === date)) {
        const price = prices[row.etf];

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

    // Marks at the close.
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
        unrealized += ledger.mark(lot, lastClose[lot.symbol], sessionTime);
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
    const close = datasets[lot.symbol].sClose[endIndex]!;

    lot.exitRawPrice = close;
    lot.interest = portfolio ? portfolio.lotInterest(lot, lastSessionTime) : fixed!.lotInterest(lot, lastSessionTime);
    lot.gross = lot.shares * close - lot.originalPrincipal;
    lot.net = lot.gross - lot.interest; // unrealized, marked
  }

  if (portfolio) {
    portfolio.log('end', endIndex, dates[endIndex]!, closeTimes[endIndex]!, closePrices(endIndex), lastSessionTime, {
      note: `${portfolio.open.length} lot(s) open`
    });
  }

  // Shadow refusals: the counterfactual is the virtual trade itself (filled in by the books).
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
    maintenanceEvents,
    forcedLiquidations,
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
        false,
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

  function dailyRow(s: number): DailyRow {
    const ledger = portfolio!;
    const prices = { ...lastClose };
    const sessionTime = sTime[s]!;
    const mv = ledger.marketValues(prices);
    const lmv = lmvOf(mv);
    const interestLiability = ledger.interestLiability(sessionTime);
    const liabilities = ledger.liabilities(sessionTime);
    const equity = ledger.equity(prices, sessionTime);
    const unrealized = ledger.unrealized(prices, sessionTime);
    const funded = fundedSet();
    const required: Partial<Record<ScheduleKey, number>> = {};

    for (const schedule of passive) {
      required[schedule] = requiredOf(schedule, mv, funded);
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

  function dailyRowFixed(s: number, unrealized: number): DailyRow {
    const ledger = fixed!;
    const prices = { ...lastClose };
    const sessionTime = sTime[s]!;
    const mv = emptyValues();

    for (const lot of ledger.open) {
      mv[lot.symbol] += lot.shares * prices[lot.symbol];
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
      lmv: lmvOf(mv),
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

// The session index of a date (the first session on or after it).
export const sessionIndexOf = (universe: Universe, date: string) =>
  firstIndexOnOrAfter(Object.values(universe.instruments)[0]!.ds, date);

export const runLabel = (config: RunConfig) =>
  `${config.mode} ${config.policy} ${config.symbols.length === 1 ? `${config.symbols[0]} only` : combinationKey(config.combination)}`;

export const calendarDays = (from: number, to: number) => (to - from) / secondsPerDay;
