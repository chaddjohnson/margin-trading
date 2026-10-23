// The scenario engine: one chronological, look-ahead-free pass over the sessions that runs the frozen strategy
// machines minute by minute, gates their fills through the shared-margin policy, transfers a position on a
// takeover, and books everything in the account ledger (PROTOCOL.md §4–§5). Event order inside a session is
// §5.3's: entitlements, forced sales, carried orders at the open, then per completed minute: scheduled exits,
// core orders, entry fills, the machines; at the close: pay-date dividends, marks, the maintenance check.
import { type Account as AccountType, Account, type Lot, type Prices } from './account.ts';
import {
  type Distribution,
  type Etf,
  type ProgramData,
  type VoogFill,
  shiftDataset,
  shiftVoog,
  voogFirstTradeFrom,
  voogLastCompletedClose
} from './data.ts';
import {
  type ExecutionPrice,
  type ReboundSignal,
  type Setup,
  type SetupKind,
  type StopFill,
  type StrategyKey,
  type StrategyParams,
  EntryMachine,
  ExitManager,
  Levels,
  firstTradeAfterDecision,
  interestOn,
  isD1Family,
  priceAt,
  secondsPerMinute,
  strategies,
  timeAt,
  tradeExecution
} from './strategy.ts';

export type Policy = 'single' | 'firstWins' | 'd1Priority' | 'split' | 'dynamic' | 'takeover';
export type Semantics = 'hold' | 'cancel' | 'shadow';
export type CorePolicy = 'contribute' | 'rebalance' | 'none';
export type Transfer = 'T1' | 'T2';

export interface Shock {
  index: number; // every price from this session onwards is multiplied
  vgt: number; // factor, e.g. 0.9 for a 10% gap
  voog: number;
}

export interface ScenarioConfig {
  key: string;
  label: string;
  strategies: StrategyKey[]; // slot order is the same-bar precedence (D1 first)
  policy: Policy;
  transfer?: Transfer;
  holdClock?: 'original' | 'takeover';
  semantics: Semantics;
  allocation: number; // f: borrowed principal as a fraction of equity at the decision
  fixedPrincipal?: number; // legacy control: a fixed principal per entry instead of f × equity
  corePolicy: CorePolicy;
  rate: number;
  stopFill: StopFill;
  stopSlippageBps: number; // extra adverse slippage on stop fills (stress)
  costBps: number;
  maintenance?: number; // forced liquidation below this equity ÷ LMV; undefined: never
  wholeShares: boolean;
  initial: { voog: number; vgt: number };
  eligibilityIndex: number;
  shocks?: Shock[];
  endIndex?: number;
  params?: Partial<Record<StrategyKey, StrategyParams>>; // synthetic tests only: replaces the shipped constants
  regTCheck?: boolean; // default true; false for strategy-only ledgers with no core collateral (fixed-principal runs)
}

export const defaultConfig = (
  overrides: Partial<ScenarioConfig> & Pick<ScenarioConfig, 'key' | 'label' | 'strategies' | 'policy'>
): ScenarioConfig => ({
  semantics: 'hold',
  allocation: 0.2,
  corePolicy: 'contribute',
  rate: 0.11,
  stopFill: 'stop',
  stopSlippageBps: 0,
  costBps: 0,
  wholeShares: false,
  initial: { voog: 180000, vgt: 120000 },
  eligibilityIndex: 365,
  ...overrides
});

// A standalone strategy's trade, replayed under the shadow semantics.
export interface ShadowTrade {
  entryIndex: number;
  entryBar: number;
  entryRawPrice: number;
  entryExecution: ExecutionPrice;
  decisionTime: number;
  decisionPrice: number;
  setupKind: SetupKind;
  setupId: number;
  exitIndex: number;
  exitBar: number;
  exitRawPrice: number;
  exitTime: number;
  exitReason: Lot['exitReason'];
  exitExecution: ExecutionPrice;
}

export type SignalOutcome = 'granted' | 'declined' | 'takeover' | 'displace' | 'takeover-redundant' | 'reg-t';

export interface SignalRecord {
  slot: number;
  strategy: StrategyKey;
  index: number;
  date: string;
  barIndex: number;
  decisionTime: number;
  decisionPrice: number;
  setupId: number;
  setupKind: SetupKind;
  outcome: SignalOutcome;
  reason: string;
  otherLotOpen: boolean;
  otherLotOwner: StrategyKey | '';
  otherLotProfit: number; // the other lot's net at the decision price
  equityAtDecision: number;
  principal: number;
  repeatedDeclines: number; // earlier declined minutes of the same setup
}

export interface DailyRow {
  index: number;
  date: string;
  vgtClose: number;
  voogClose: number;
  voogShares: number;
  vgtCoreShares: number;
  lotShares: number;
  voogValue: number;
  vgtCoreValue: number;
  lotValue: number;
  cash: number;
  receivables: number;
  principal: number;
  accruedInterest: number;
  fundingPayable: number;
  lmv: number;
  equity: number;
  equityToLmv: number;
  debtToEquity: number;
  grossExposure: number;
  realizedStrategyProfit: number;
  unrealizedStrategyProfit: number;
  strategyMark: number;
  cumulativeInterest: number; // paid plus accrued
  cumulativeDividends: number;
  coreTurnover: number;
  openLots: number;
  owners: string;
}

export interface DrawdownStats {
  maximum: number;
  maximumPercent: number;
  peakTime: number;
  troughTime: number;
  peakValue: number;
  troughValue: number;
  recoveryTime: number; // NaN if not recovered
}

export interface ScenarioResult {
  config: ScenarioConfig;
  daily: DailyRow[];
  lots: Lot[];
  signals: SignalRecord[];
  events: AccountType['events'];
  dividends: {
    etf: Etf;
    exDate: string;
    payDate: string;
    source: 'core' | 'lot';
    shares: number;
    value: number;
    paidPrice: number;
    paidShares: number;
    paidIndex: number;
  }[];
  takeovers: NonNullable<Lot['takeover']>[];
  forcedSales: { index: number; date: string; lotsSold: number; coreSold: number; equityToLmvBefore: number }[];
  dailyDrawdown: DrawdownStats;
  minuteDrawdown: DrawdownStats;
  strategyDailyDrawdown: DrawdownStats;
  strategyMinuteDrawdown: DrawdownStats;
  minMarginRatio: { ratio: number; time: number; daily: number; dailyDate: string };
  maxDebtToEquity: { ratio: number; date: string };
  maxGross: { ratio: number; date: string };
  regTBreaches: number;
  machines: {
    strategy: StrategyKey;
    setups: number;
    setupLog: Setup[];
    activationsByKind: Record<SetupKind, number>;
    continuationWindows: number;
    continuationExpiries: number;
    armedAtEnd: boolean;
    pendingAtEnd: boolean;
  }[];
  endIndex: number;
}

interface EntryOrder {
  slot: number;
  signal: ReboundSignal;
  principal: number;
  equityAtDecision: number;
  fillBar: number; // -1: carried to the next session
  shadow?: ShadowTrade;
}

interface CoreOrder {
  etf: Etf;
  dollars: number; // + buy, − sell
  kind: 'reinvest' | 'fund loss' | 'rebalance';
  lotId: number;
  // VGT leg
  fillIndex: number;
  fillBar: number;
  // VOOG leg
  voogFill?: VoogFill;
  done: boolean;
}

interface Slot {
  index: number;
  key: StrategyKey;
  params: StrategyParams;
  machine: EntryMachine;
  exitedThisSession: boolean;
  lotAtStart: Lot | undefined;
  order?: EntryOrder;
  shadow?: ShadowTrade[];
  shadowNext: number;
}

class Tracker {
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

export const runScenario = (
  data: ProgramData,
  config: ScenarioConfig,
  shadowTrades?: Partial<Record<StrategyKey, ShadowTrade[]>>
): ScenarioResult => {
  let { ds, voog } = data;
  const { distributions } = data;

  for (const shock of config.shocks ?? []) {
    ds = shiftDataset(ds, shock.index, shock.vgt);
    voog = shiftVoog(voog, shock.index, shock.voog);
  }

  const endIndex = config.endIndex ?? ds.sessionCount - 1;
  const levels = new Levels(ds);
  const exitSettings = { stopFill: config.stopFill, marginInterestRate: config.rate };
  const account = new Account({ costBps: config.costBps, wholeShares: config.wholeShares, rate: config.rate });
  const slots: Slot[] = config.strategies.map((key, index) => ({
    index,
    key,
    params: config.params?.[key] ?? strategies[key],
    machine: new EntryMachine(ds, config.params?.[key] ?? strategies[key], levels, config.eligibilityIndex),
    exitedThisSession: false,
    lotAtStart: undefined,
    shadow: config.semantics === 'shadow' ? shadowTrades?.[key] : undefined,
    shadowNext: 0
  }));

  if (config.semantics === 'shadow') {
    for (const slot of slots) {
      if (!slot.shadow) {
        throw new Error(`Shadow semantics need the standalone trades of ${slot.key}`);
      }
    }
  }

  if (config.policy === 'takeover' && !config.transfer) {
    throw new Error('The takeover policy needs a transfer definition');
  }

  const signals: SignalRecord[] = [];
  const daily: DailyRow[] = [];
  const dividends: ScenarioResult['dividends'] = [];
  const takeovers: ScenarioResult['takeovers'] = [];
  const forcedSales: ScenarioResult['forcedSales'] = [];
  const coreOrders: CoreOrder[] = [];
  const skipAfterSession = new Set<Lot>(); // T2 takeovers: the reset high already covers the session
  let forcedSaleDue = false;
  let regTBreaches = 0;
  let lotId = 0;

  const closePrices = (s: number): Prices => ({ vgt: ds.sClose[s]!, voog: voog.close[s]!, sessionTime: ds.sTime[s]! });
  const voogMarkAt = (s: number, time: number) =>
    voogLastCompletedClose(voog, s, time)?.close ?? voog.close[Math.max(0, s - 1)]!;

  // ----- start: the 2016-01-04 close -----

  {
    const prices = closePrices(0);

    account.voog = account.sharesFor(config.initial.voog, prices.voog);
    account.vgtCore = account.sharesFor(config.initial.vgt, prices.vgt);
    account.cash = config.initial.voog + config.initial.vgt - account.voog * prices.voog - account.vgtCore * prices.vgt;
    account.log('start', 0, ds.dates[0]!, ds.sCloseTime[0]!, prices, {
      note: `VOOG ${account.voog} @ ${prices.voog}, VGT ${account.vgtCore} @ ${prices.vgt}`
    });
  }

  const equityTracker = new Tracker(account.equity(closePrices(0)), ds.sCloseTime[0]!);
  const minuteTracker = new Tracker(account.equity(closePrices(0)), ds.sCloseTime[0]!);
  const strategyTracker = new Tracker(0, ds.sTime[0]!);
  const strategyMinuteTracker = new Tracker(0, ds.sCloseTime[0]!);
  const minMargin = { ratio: Infinity, time: 0, daily: Infinity, dailyDate: '' };
  const maxDebt = { ratio: 0, date: '' };
  const maxGross = { ratio: 0, date: '' };

  daily.push(dailyRow(0));

  // ----- helpers -----

  function dailyRow(s: number): DailyRow {
    const prices = closePrices(s);
    const lmv = account.lmv(prices);
    const equity = account.equity(prices);
    const open = account.openLots;
    const accrued = account.accruedInterest(prices.sessionTime);
    const unrealized = account.unrealizedStrategyProfit(prices);

    return {
      index: s,
      date: ds.dates[s]!,
      vgtClose: prices.vgt,
      voogClose: prices.voog,
      voogShares: account.voog,
      vgtCoreShares: account.vgtCore,
      lotShares: account.lotShares(),
      voogValue: account.voog * prices.voog,
      vgtCoreValue: account.vgtCore * prices.vgt,
      lotValue: account.lotShares() * prices.vgt,
      cash: account.cash,
      receivables: account.receivableValue(),
      principal: account.principalOutstanding(),
      accruedInterest: accrued,
      fundingPayable: account.fundingPayable,
      lmv,
      equity,
      equityToLmv: lmv > 0 ? equity / lmv : 1,
      debtToEquity: equity > 0 ? account.liabilities(prices.sessionTime) / equity : Infinity,
      grossExposure: equity > 0 ? lmv / equity : Infinity,
      realizedStrategyProfit: account.realizedStrategyProfit,
      unrealizedStrategyProfit: unrealized,
      strategyMark: account.realizedStrategyProfit + unrealized,
      cumulativeInterest: account.cumulativeInterestPaid + accrued,
      cumulativeDividends: account.cumulativeDividends,
      coreTurnover: account.coreTurnover,
      openLots: open.length,
      owners: open.map((lot) => lot.owner).join('+')
    };
  }

  const slotHasLot = (slot: Slot) => account.openLots.some((lot) => lot.slot === slot.index);
  const otherOpenLots = (slot: Slot) => account.openLots.filter((lot) => lot.slot !== slot.index);
  const committedPrincipal = (except?: Slot) =>
    slots.filter((slot) => slot !== except && slot.order).reduce((total, slot) => total + slot.order!.principal, 0);

  const equityAtDecision = (s: number, decisionTime: number, decisionPrice: number) =>
    account.equity({ vgt: decisionPrice, voog: voogMarkAt(s, decisionTime), sessionTime: ds.sTime[s]! });

  type Gate =
    | { kind: 'grant'; principal: number; equity: number }
    | { kind: 'declined'; reason: string; equity: number }
    | { kind: 'takeover'; lot: Lot; equity: number }
    | { kind: 'displace'; lot: Lot; principal: number; equity: number };

  const gate = (slot: Slot, s: number, decisionTime: number, decisionPrice: number): Gate => {
    const equity = equityAtDecision(s, decisionTime, decisionPrice);
    const f = config.allocation;
    const full = config.fixedPrincipal ?? f * equity;
    const others = otherOpenLots(slot);
    const committed = committedPrincipal(slot);
    const regT = (principal: number) => {
      const prices = { vgt: decisionPrice, voog: voogMarkAt(s, decisionTime), sessionTime: ds.sTime[s]! };
      const debt = account.liabilities(prices.sessionTime) + committed + principal;
      const lmv = account.lmv(prices) + principal;

      return debt <= 0.5 * lmv;
    };
    const grant = (principal: number): Gate => {
      if (!(principal > 0)) {
        return { kind: 'declined', reason: 'no capital', equity };
      }

      if (config.regTCheck !== false && !regT(principal)) {
        regTBreaches++;

        return { kind: 'declined', reason: 'Reg T initial margin', equity };
      }

      return { kind: 'grant', principal, equity };
    };

    switch (config.policy) {
      case 'single':
        return others.length || committed ? { kind: 'declined', reason: 'pool occupied', equity } : grant(full);
      case 'firstWins':
      case 'd1Priority':
      case 'takeover': {
        if (!others.length && !committed) {
          return grant(full);
        }

        const other = others[0];

        if (other && isD1Family(slot.key) && other.owner === 'swing' && !committed) {
          if (config.policy === 'takeover') {
            return { kind: 'takeover', lot: other, equity };
          }

          if (config.policy === 'd1Priority') {
            return { kind: 'displace', lot: other, principal: full, equity };
          }
        }

        return {
          kind: 'declined',
          reason: committed ? 'pool committed to a pending order' : `pool occupied by ${other?.owner}`,
          equity
        };
      }
      case 'split':
        return grant(config.fixedPrincipal ? config.fixedPrincipal / 2 : (f / 2) * equity);
      case 'dynamic': {
        const used = others.reduce((total, lot) => total + lot.principal, 0) + committed;
        const available = full - used;

        return available >= full / 2 - 1e-9
          ? grant(available)
          : { kind: 'declined', reason: `only ${Math.round(available)} of the pool is free`, equity };
      }
    }
  };

  const record = (
    slot: Slot,
    signal: ReboundSignal,
    outcome: SignalOutcome,
    reason: string,
    equity: number,
    principal: number,
    s: number
  ) => {
    const other = otherOpenLots(slot)[0];
    const interest = other ? interestOn(other, config.rate, ds.sTime[s]!) : 0;

    signals.push({
      slot: slot.index,
      strategy: slot.key,
      index: s,
      date: ds.dates[s]!,
      barIndex: signal.barIndex,
      decisionTime: signal.decisionTime,
      decisionPrice: signal.decisionPrice,
      setupId: signal.setup.id,
      setupKind: signal.setup.kind,
      outcome,
      reason,
      otherLotOpen: Boolean(other),
      otherLotOwner: other?.owner ?? '',
      otherLotProfit: other ? other.shares * signal.decisionPrice - other.principal - interest : NaN,
      equityAtDecision: equity,
      principal,
      repeatedDeclines: signal.setup.declinedSignals
    });
  };

  const openLot = (slot: Slot, order: EntryOrder, s: number, k: number) => {
    const rawPrice = priceAt(ds, s, k);
    const price = account.buyPrice(rawPrice);
    const shares = account.sharesFor(order.principal, price);
    const principal = shares * price;
    const lot = account.openLot({
      id: ++lotId,
      owner: slot.key,
      slot: slot.index,
      originalOwner: slot.key,
      originalSlot: slot.index,
      entryIndex: s,
      entryBar: k,
      entryTime: timeAt(ds, s, k),
      entryExecution: k === 0 && order.signal.index < s ? 'opening trade' : tradeExecution(ds, s, k),
      decisionTime: order.signal.decisionTime,
      decisionPrice: order.signal.decisionPrice,
      setupKind: order.signal.setup.kind,
      setupId: order.signal.setup.id,
      entryPrice: price,
      shares,
      investment: principal,
      principal,
      grossCost: shares * rawPrice,
      entryTimestamp: ds.sTime[s]!,
      holdTimestamp: ds.sTime[s]!,
      equityAtDecision: order.equityAtDecision,
      fraction: order.principal / order.equityAtDecision,
      exit: new ExitManager(ds, slot.params, exitSettings),
      shadowExit: order.shadow
        ? {
            index: order.shadow.exitIndex,
            barIndex: order.shadow.exitBar,
            price: order.shadow.exitRawPrice,
            reason: order.shadow.exitReason,
            time: order.shadow.exitTime,
            execution: order.shadow.exitExecution
          }
        : undefined
    });

    lot.exit.onEntry(lot, s, k, rawPrice);
    slot.order = undefined;
    slot.machine.clearSetup('filled', s);
    account.log(
      'entry',
      s,
      ds.dates[s]!,
      lot.entryTime,
      { vgt: rawPrice, voog: voogMarkAt(s, lot.entryTime), sessionTime: ds.sTime[s]! },
      {
        strategy: slot.key,
        etf: 'VGT',
        shares,
        price,
        cashDelta: 0,
        note: `lot ${lot.id} ${order.signal.setup.kind} setup ${order.signal.setup.id}; principal ${principal.toFixed(2)} = ${(100 * lot.fraction).toFixed(2)}% of ${order.equityAtDecision.toFixed(2)}`
      }
    );

    return lot;
  };

  // Books an exit and schedules the core orders that follow it.
  const exitLot = (
    lot: Lot,
    s: number,
    k: number,
    time: number,
    rawPrice: number,
    reason: Lot['exitReason'],
    execution: ExecutionPrice
  ) => {
    const slot = slots[lot.slot]!;
    const isStop = reason === 'trailing stop' || reason === 'trailing stop gap';
    const net = account.closeLot(
      lot,
      s,
      k,
      time,
      rawPrice,
      reason,
      execution,
      ds.sTime[s]!,
      isStop ? config.stopSlippageBps / 10000 : 0
    );

    slot.exitedThisSession = true;

    if (reason !== 'forced liquidation' && reason !== 'displaced') {
      slot.machine.onExit(s, rawPrice, net);
    }

    account.log(
      'exit',
      s,
      ds.dates[s]!,
      time,
      { vgt: rawPrice, voog: voogMarkAt(s, time), sessionTime: ds.sTime[s]! },
      {
        strategy: lot.owner,
        etf: 'VGT',
        shares: -lot.shares,
        price: lot.exitPrice,
        cashDelta: lot.proceeds,
        note: `lot ${lot.id} ${reason}; net ${net.toFixed(2)} (interest ${lot.interest.toFixed(2)})`
      }
    );

    scheduleCoreOrders(lot, s, time, net, rawPrice);
  };

  const scheduleCoreOrders = (lot: Lot, s: number, exitTime: number, net: number, vgtMark: number) => {
    const decisionTime = exitTime + secondsPerMinute;
    const voogMark = voogMarkAt(s, exitTime);
    const voogValue = account.voog * voogMark;
    const vgtValue = account.vgtCore * vgtMark;
    const legs: { etf: Etf; dollars: number; kind: CoreOrder['kind'] }[] = [];
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

    // The earliest causally executable trades after the exit: VGT at the strategy's next-trade rule, VOOG at its
    // own first trade at or after the same time.
    let vgtFillIndex = s;
    let vgtFillBar = firstTradeAfterDecision(ds, s, decisionTime);

    if (vgtFillBar < 0) {
      vgtFillIndex = s + 1;
      vgtFillBar = 0;
    }

    const voogFill = voogFirstTradeFrom(voog, s, decisionTime);

    for (const leg of legs) {
      if (Math.abs(leg.dollars) < 0.005) {
        continue;
      }

      coreOrders.push({
        ...leg,
        lotId: lot.id,
        fillIndex: leg.etf === 'VGT' ? vgtFillIndex : (voogFill?.index ?? Infinity),
        fillBar: vgtFillBar,
        voogFill,
        done: false
      });
    }
  };

  const executeCoreOrder = (order: CoreOrder, s: number, rawPrice: number, time: number) => {
    const prices = {
      vgt: order.etf === 'VGT' ? rawPrice : ds.sClose[Math.max(0, s - 1)]!,
      voog: order.etf === 'VOOG' ? rawPrice : voogMarkAt(s, time),
      sessionTime: ds.sTime[s]!
    };

    if (order.etf === 'VGT') {
      prices.voog = voogMarkAt(s, time);
    } else {
      // VGT's last completed minute at or before the VOOG trade.
      const start = ds.sBarStart[s]!;
      const count = ds.sBarCount[s]!;
      let vgt = ds.sClose[Math.max(0, s - 1)]!;

      for (let k = 0; k < count; k++) {
        if (ds.bTime[start + k]! + secondsPerMinute <= time) {
          vgt = ds.bClose[start + k]!;
        } else {
          break;
        }
      }

      prices.vgt = vgt;
    }

    order.done = true;

    if (order.dollars > 0) {
      const dollars = Math.min(order.dollars, Math.max(0, account.cash));

      if (dollars <= 0) {
        return;
      }

      const { shares, price } = account.buyCore(order.etf, dollars, rawPrice);

      account.log(order.kind === 'rebalance' ? 'rebalance' : 'reinvest', s, ds.dates[s]!, time, prices, {
        etf: order.etf,
        shares,
        price,
        cashDelta: -shares * price,
        note: `lot ${order.lotId}: ${order.kind}`
      });
    } else {
      const price = account.sellPrice(rawPrice);
      const want = -order.dollars / price;
      const { shares, proceeds } = account.sellCore(order.etf, want, rawPrice);

      if (order.kind === 'fund loss' || account.fundingPayable > 0) {
        account.settleFunding(proceeds);
      }

      account.log(order.kind === 'rebalance' ? 'rebalance' : 'fund loss', s, ds.dates[s]!, time, prices, {
        etf: order.etf,
        shares: -shares,
        price,
        cashDelta: proceeds,
        note: `lot ${order.lotId}: ${order.kind}`
      });
    }
  };

  const runVoogLegs = (s: number, untilTime: number) => {
    for (const order of coreOrders) {
      if (
        !order.done &&
        order.etf === 'VOOG' &&
        order.voogFill &&
        order.voogFill.index === s &&
        order.voogFill.time <= untilTime
      ) {
        executeCoreOrder(order, s, order.voogFill.price, order.voogFill.time);
      }
    }
  };

  const runVgtLegs = (s: number, k: number) => {
    for (const order of coreOrders) {
      if (!order.done && order.etf === 'VGT' && order.fillIndex === s && order.fillBar === k) {
        executeCoreOrder(order, s, priceAt(ds, s, k), timeAt(ds, s, k));
      }
    }
  };

  const takeOver = (slot: Slot, lot: Lot, signal: ReboundSignal, s: number, k: number) => {
    const transfer = config.transfer!;
    const interest = interestOn(lot, config.rate, ds.sTime[s]!);
    const profitAtTakeover = lot.shares * signal.decisionPrice - lot.principal - interest;
    const highBefore = lot.exit.postEntryHigh;
    const lowBefore = lot.exit.postEntryLow;
    const stopBefore = lot.exit.stopPrice;
    const fromSlot = slots[lot.slot]!;
    const manager = new ExitManager(ds, slot.params, exitSettings);
    const fillBar = firstTradeAfterDecision(ds, s, signal.decisionTime);
    const refBar = fillBar >= 0 ? fillBar : ds.sBarCount[s]!;
    const refPrice = fillBar >= 0 ? priceAt(ds, s, fillBar) : ds.sClose[s]!;
    const time = fillBar >= 0 ? timeAt(ds, s, fillBar) : ds.sCloseTime[s]!;

    if (transfer === 'T1') {
      manager.initFromHigh(lot, highBefore, lowBefore);
    } else {
      manager.onEntry(lot, s, refBar, refPrice);
      skipAfterSession.add(lot);
    }

    if (config.holdClock === 'takeover') {
      lot.holdTimestamp = ds.sTime[s]!;
    }

    lot.exit = manager;
    lot.decision = undefined; // the previous owner's exit scheduled later this session is cancelled
    lot.owner = slot.key;
    lot.slot = slot.index;
    lot.takeover = {
      index: s,
      barIndex: k,
      time,
      price: refPrice,
      transfer,
      fromOwner: fromSlot.key,
      profitAtTakeover,
      highBefore,
      stopBefore,
      stopAfter: manager.stopPrice
    };
    takeovers.push(lot.takeover);
    fromSlot.exitedThisSession = true;
    slot.machine.clearSetup('taken over', s);
    account.log(
      'takeover',
      s,
      ds.dates[s]!,
      time,
      { vgt: refPrice, voog: voogMarkAt(s, time), sessionTime: ds.sTime[s]! },
      {
        strategy: `${fromSlot.key}->${slot.key}`,
        etf: 'VGT',
        note: `lot ${lot.id} ${transfer}: net at decision ${profitAtTakeover.toFixed(2)}; high ${highBefore.toFixed(2)} stop ${stopBefore.toFixed(2)} -> stop ${manager.stopPrice.toFixed(2)}${config.holdClock === 'takeover' ? '; hold clock restarted' : ''}`
      }
    );
  };

  const forcedSale = (s: number) => {
    const start = ds.sBarStart[s]!;
    const vgtOpen = ds.bOpen[start]!;
    const vgtTime = ds.bTime[start]!;
    const voogBar = voog.sessions[s]!.bars[0]!;
    const prices: Prices = { vgt: vgtOpen, voog: voogBar.open, sessionTime: ds.sTime[s]! };
    const m = config.maintenance!;
    const target = m + 0.05;
    const before = account.lmv(prices) > 0 ? account.equity(prices) / account.lmv(prices) : 1;
    let lotsSold = 0;
    let coreSold = 0;

    for (const lot of account.openLots) {
      exitLot(lot, s, 0, vgtTime, vgtOpen, 'forced liquidation', 'opening trade');
      lotsSold++;
    }

    const equity = account.equity(prices);
    const lmv = account.lmv(prices);
    const excess = Math.max(0, lmv - equity / target);

    if (excess > 0 && lmv > 0) {
      const voogValue = account.voog * prices.voog;
      const vgtValue = account.vgtCore * prices.vgt;
      const voogDollars = (excess * voogValue) / lmv;
      const vgtDollars = (excess * vgtValue) / lmv;
      const vgt = account.sellCore('VGT', vgtDollars / account.sellPrice(prices.vgt), prices.vgt);

      account.settleFunding(vgt.proceeds);
      account.log('forced sale', s, ds.dates[s]!, vgtTime, prices, {
        etf: 'VGT',
        shares: -vgt.shares,
        price: vgt.price,
        cashDelta: vgt.proceeds,
        note: `maintenance ${m}`
      });

      const voogSale = account.sellCore('VOOG', voogDollars / account.sellPrice(prices.voog), prices.voog);

      account.settleFunding(voogSale.proceeds);
      account.log('forced sale', s, ds.dates[s]!, voogBar.time, prices, {
        etf: 'VOOG',
        shares: -voogSale.shares,
        price: voogSale.price,
        cashDelta: voogSale.proceeds,
        note: `maintenance ${m}`
      });
      coreSold = vgt.proceeds + voogSale.proceeds;
    }

    forcedSales.push({ index: s, date: ds.dates[s]!, lotsSold, coreSold, equityToLmvBefore: before });
  };

  // ----- the sessions -----

  for (let s = 1; s <= endIndex; s++) {
    const date = ds.dates[s]!;
    const sessionTime = ds.sTime[s]!;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    for (const slot of slots) {
      slot.exitedThisSession = false;
      slot.lotAtStart = account.openLots.find((lot) => lot.slot === slot.index);
    }

    // 1. Entitlements: shares held at the previous close.
    for (const distribution of distributions) {
      if (distribution.exDate !== date) {
        continue;
      }

      bookEntitlement(distribution, s);
    }

    // 2. A forced sale ordered at the previous close.
    if (forcedSaleDue) {
      forcedSaleDue = false;
      forcedSale(s);
    }

    // 3. Carried orders resolve to this session's trades.
    for (const slot of slots) {
      if (slot.order && slot.order.fillBar < 0) {
        slot.order.fillBar = firstTradeAfterDecision(ds, s, slot.order.signal.decisionTime);
      }
    }

    // Exits of the lots open at the start, decided from the pre-session state and this session's bars.
    for (const lot of account.openLots) {
      if (lot.shadowExit) {
        lot.decision =
          lot.shadowExit.index === s
            ? {
                reason: lot.shadowExit.reason,
                barIndex: lot.shadowExit.barIndex,
                price: lot.shadowExit.price,
                time: lot.shadowExit.time,
                execution: lot.shadowExit.execution,
                isMaximumHoldDue: false,
                signalTime: NaN,
                signalPrice: NaN,
                stopPrice: NaN,
                stopActive: false
              }
            : undefined;
      } else if (lot.pendingDisplace !== undefined) {
        const k = firstTradeAfterDecision(ds, s, lot.pendingDisplace);

        lot.decision = {
          reason: 'displaced',
          barIndex: k,
          price: priceAt(ds, s, k),
          time: timeAt(ds, s, k),
          execution: 'opening trade',
          isMaximumHoldDue: false,
          signalTime: NaN,
          signalPrice: NaN,
          stopPrice: lot.exit.stopPrice,
          stopActive: false
        };
        lot.pendingDisplace = undefined;
      } else {
        lot.decision = lot.exit.evaluate(lot, s);
      }
    }

    // 4. The minute loop.
    for (let k = 0; k < count; k++) {
      const barTime = ds.bTime[start + k]!;

      runVoogLegs(s, barTime);

      // a. scheduled exits
      for (const lot of account.openLots) {
        if (lot.decision && lot.decision.barIndex === k) {
          exitLot(lot, s, k, lot.decision.time, lot.decision.price, lot.decision.reason, lot.decision.execution);
        }
      }

      // b. core orders
      runVgtLegs(s, k);

      // c. entry fills
      for (const slot of slots) {
        if (slot.order && slot.order.fillBar === k) {
          openLot(slot, slot.order, s, k);
        }
      }

      // shadow entries: a standalone trade filling at this bar
      for (const slot of slots) {
        if (!slot.shadow) {
          continue;
        }

        while (
          slot.shadowNext < slot.shadow.length &&
          (slot.shadow[slot.shadowNext]!.entryIndex < s ||
            (slot.shadow[slot.shadowNext]!.entryIndex === s && slot.shadow[slot.shadowNext]!.entryBar < k))
        ) {
          slot.shadowNext++;
        }

        const trade = slot.shadow[slot.shadowNext];

        if (!trade || trade.entryIndex !== s || trade.entryBar !== k) {
          continue;
        }

        slot.shadowNext++;

        const signal: ReboundSignal = {
          setup: {
            id: trade.setupId,
            kind: trade.setupKind,
            activationIndex: -1,
            activationTime: NaN,
            activationPrice: NaN,
            referenceHigh: NaN,
            anchorHigh: NaN,
            trailingLow: NaN,
            trailingLowTime: NaN,
            reboundTrigger: NaN,
            declinedSignals: 0,
            status: 'filled',
            endIndex: s
          },
          index: s,
          barIndex: k,
          decisionTime: trade.decisionTime,
          decisionPrice: trade.decisionPrice,
          trigger: NaN,
          trailingLow: NaN
        };
        const decisionIndex = trade.decisionTime < ds.bTime[start]! ? s - 1 : s;
        const result = gate(slot, decisionIndex, trade.decisionTime, trade.decisionPrice);

        if (result.kind === 'grant') {
          record(slot, signal, 'granted', '', result.equity, result.principal, s);
          openLot(
            slot,
            {
              slot: slot.index,
              signal,
              principal: result.principal,
              equityAtDecision: result.equity,
              fillBar: k,
              shadow: trade
            },
            s,
            k
          );
        } else {
          record(
            slot,
            signal,
            'declined',
            result.kind === 'declined' ? result.reason : 'shadow: no takeover',
            result.equity,
            0,
            s
          );
        }
      }

      // d. the machines, in slot order (the same-bar precedence)
      if (config.semantics !== 'shadow') {
        for (const slot of slots) {
          if (slot.lotAtStart || slot.exitedThisSession || slot.order || slotHasLot(slot)) {
            continue;
          }

          const signal = slot.machine.processBar(s, k);

          if (!signal) {
            continue;
          }

          const result = gate(slot, s, signal.decisionTime, signal.decisionPrice);

          switch (result.kind) {
            case 'grant': {
              record(slot, signal, 'granted', '', result.equity, result.principal, s);
              slot.machine.commit(signal);
              slot.order = {
                slot: slot.index,
                signal,
                principal: result.principal,
                equityAtDecision: result.equity,
                fillBar: firstTradeAfterDecision(ds, s, signal.decisionTime)
              };
              break;
            }
            case 'declined': {
              record(
                slot,
                signal,
                result.reason === 'Reg T initial margin' ? 'reg-t' : 'declined',
                result.reason,
                result.equity,
                0,
                s
              );

              if (config.semantics === 'cancel') {
                slot.machine.cancelSetup(s);
              } else {
                signal.setup.declinedSignals++;
              }

              break;
            }
            case 'takeover': {
              record(
                slot,
                signal,
                'takeover',
                `takes over lot ${result.lot.id} from ${result.lot.owner}`,
                result.equity,
                0,
                s
              );
              takeOver(slot, result.lot, signal, s, k);
              break;
            }
            case 'displace': {
              record(
                slot,
                signal,
                'displace',
                `displaces lot ${result.lot.id} of ${result.lot.owner}`,
                result.equity,
                result.principal,
                s
              );

              const fillBar = firstTradeAfterDecision(ds, s, signal.decisionTime);

              if (fillBar >= 0) {
                result.lot.decision = {
                  reason: 'displaced',
                  barIndex: fillBar,
                  price: priceAt(ds, s, fillBar),
                  time: timeAt(ds, s, fillBar),
                  execution: tradeExecution(ds, s, fillBar),
                  isMaximumHoldDue: false,
                  signalTime: NaN,
                  signalPrice: NaN,
                  stopPrice: result.lot.exit.stopPrice,
                  stopActive: false
                };
              } else {
                result.lot.decision = undefined;
                result.lot.pendingDisplace = signal.decisionTime;
              }

              slot.machine.commit(signal);
              slot.order = {
                slot: slot.index,
                signal,
                principal: result.principal,
                equityAtDecision: result.equity,
                fillBar
              };
              break;
            }
          }
        }
      }
    }

    // 5. The close.
    runVoogLegs(s, ds.sCloseTime[s]!);

    for (const lot of account.openLots) {
      if (lot.decision && lot.decision.barIndex === count) {
        exitLot(lot, s, count, lot.decision.time, lot.decision.price, lot.decision.reason, lot.decision.execution);
      }
    }

    runVgtLegs(s, count);

    for (const slot of slots) {
      if (slot.order && slot.order.fillBar === count) {
        openLot(slot, slot.order, s, count);
      }
    }

    // Pay-date dividends reinvested at the close into core.
    const prices = closePrices(s);

    for (const row of account.receivables.filter((row) => row.payDate === date)) {
      const price = row.etf === 'VGT' ? prices.vgt : prices.voog;

      account.cash += row.value;
      account.receivables.splice(account.receivables.indexOf(row), 1);

      const bought = account.buyCore(row.etf, row.value, price, true);

      account.cumulativeDividends += row.value;

      if (row.source === 'lot') {
        account.cumulativeLotDividends += row.value;
      }

      dividends.push({
        etf: row.etf,
        exDate: row.exDate,
        payDate: row.payDate,
        source: row.source,
        shares: row.shares,
        value: row.value,
        paidPrice: price,
        paidShares: bought.shares,
        paidIndex: s
      });
      account.log('dividend paid', s, date, ds.sCloseTime[s]!, prices, {
        etf: row.etf,
        shares: bought.shares,
        price,
        cashDelta: row.value - bought.cost,
        note: `${row.source} ${row.exDate} ${row.amountPerShare.toFixed(4)}/share`
      });
    }

    // Daily updates of the open positions' highs and stops (not for lots that entered this session).
    for (const lot of account.openLots) {
      if (lot.entryIndex === s) {
        continue;
      }

      if (skipAfterSession.has(lot)) {
        skipAfterSession.delete(lot);
        continue;
      }

      lot.exit.afterSession(lot, s);
    }

    for (const slot of slots) {
      slot.machine.afterSession(s);
    }

    // Marks.
    const row = dailyRow(s);

    daily.push(row);
    equityTracker.update(row.equity, ds.sCloseTime[s]!);
    strategyTracker.update(row.strategyMark, sessionTime);

    if (row.equityToLmv < minMargin.daily) {
      minMargin.daily = row.equityToLmv;
      minMargin.dailyDate = date;
    }

    if (row.debtToEquity > maxDebt.ratio) {
      maxDebt.ratio = row.debtToEquity;
      maxDebt.date = date;
    }

    if (row.grossExposure > maxGross.ratio) {
      maxGross.ratio = row.grossExposure;
      maxGross.date = date;
    }

    minuteMarks(s);

    if (config.maintenance !== undefined && row.equityToLmv < config.maintenance && s < endIndex) {
      forcedSaleDue = true;
    }
  }

  // ----- end -----

  {
    const prices = closePrices(endIndex);

    account.log('end', endIndex, ds.dates[endIndex]!, ds.sCloseTime[endIndex]!, prices, {
      note: `${account.openLots.length} lot(s) open, marked at ${prices.vgt}`
    });

    for (const lot of account.openLots) {
      lot.interest = interestOn(lot, config.rate, prices.sessionTime);
      lot.netProfit = lot.shares * prices.vgt - lot.principal - lot.interest; // unrealized, marked
      lot.exitStopPrice = lot.exit.stopPrice;
    }

    for (const slot of slots) {
      slot.machine.finish(endIndex);
    }
  }

  return {
    config,
    daily,
    lots: account.lots,
    signals,
    events: account.events,
    dividends,
    takeovers,
    forcedSales,
    dailyDrawdown: equityTracker.stats(),
    minuteDrawdown: minuteTracker.stats(),
    strategyDailyDrawdown: strategyTracker.stats(),
    strategyMinuteDrawdown: strategyMinuteTracker.stats(),
    minMarginRatio: {
      ratio: minMargin.ratio,
      time: minMargin.time,
      daily: minMargin.daily,
      dailyDate: minMargin.dailyDate
    },
    maxDebtToEquity: maxDebt,
    maxGross,
    regTBreaches,
    machines: slots.map((slot) => ({
      strategy: slot.key,
      setups: slot.machine.setups,
      setupLog: slot.machine.setupLog,
      activationsByKind: slot.machine.activationsByKind,
      continuationWindows: slot.machine.continuationWindows,
      continuationExpiries: slot.machine.continuationExpiries,
      armedAtEnd: slot.machine.state === 'ARMED',
      pendingAtEnd: slot.machine.state === 'PENDING_FILL' || Boolean(slot.order)
    })),
    endIndex
  };

  function bookEntitlement(distribution: Distribution, s: number) {
    const prices = openingPrices(s);
    const held: { source: 'core' | 'lot'; shares: number; lot?: Lot }[] =
      distribution.etf === 'VOOG'
        ? [{ source: 'core', shares: account.voog }]
        : [
            { source: 'core', shares: account.vgtCore },
            ...account.openLots.map((lot) => ({ source: 'lot' as const, shares: lot.shares, lot }))
          ];

    for (const entry of held) {
      if (!(entry.shares > 0)) {
        continue;
      }

      const value = entry.shares * distribution.amount;

      account.receivables.push({
        etf: distribution.etf,
        exDate: distribution.exDate,
        payDate: distribution.payDate,
        amountPerShare: distribution.amount,
        shares: entry.shares,
        value,
        source: entry.source
      });

      if (entry.lot) {
        entry.lot.dividends += value;
      }

      account.log('ex-date', s, ds.dates[s]!, ds.bTime[ds.sBarStart[s]!]!, prices, {
        etf: distribution.etf,
        shares: 0,
        price: distribution.amount,
        cashDelta: 0,
        note: `${entry.source} ${entry.shares.toFixed(4)} shares × ${distribution.amount.toFixed(4)} = ${value.toFixed(2)}, pays ${distribution.payDate}`
      });
    }
  }

  function openingPrices(s: number): Prices {
    const start = ds.sBarStart[s]!;

    return { vgt: ds.bOpen[start]!, voog: voogMarkAt(s, ds.bTime[start]!), sessionTime: ds.sTime[s]! };
  }

  // Minute-sampled marks of the session: at every minute either ETF traded, each ETF at its last observed trade,
  // the balance sheet from the latest ledger event at or before the minute, then the official close.
  function minuteMarks(s: number) {
    const events = account.events.filter((event) => event.index === s && event.kind !== 'ex-date');
    const previousState = account.events.filter((event) => event.index < s).at(-1)!;
    const voogSession = voog.sessions[s]!;
    const bars = sessionBars(s);
    const times = [...new Set([...bars.map((bar) => bar.time), ...voogSession.bars.map((bar) => bar.time)])].sort(
      (a, b) => a - b
    );
    const vgtBars = new Map(bars.map((bar) => [bar.time, bar.close]));
    const voogBars = new Map(voogSession.bars.map((bar) => [bar.time, bar.close]));
    const sessionTime = ds.sTime[s]!;
    // Interest through this session's date on the lots open at its start (a state from an earlier session carries
    // interest only through that session's date).
    const accruedAtStart = account.lots
      .filter((lot) => lot.entryIndex < s && (lot.exitIndex < 0 || lot.exitIndex >= s))
      .reduce((total, lot) => total + interestOn(lot, config.rate, sessionTime), 0);
    let vgt = ds.sClose[s - 1]!;
    let voogPrice = voog.close[s - 1]!;
    let eventIndex = 0;
    let state = previousState;
    const stateAt = (time: number) => {
      while (eventIndex < events.length && events[eventIndex]!.time <= time) {
        state = events[eventIndex]!;
        eventIndex++;
      }
    };
    const mark = (time: number) => {
      stateAt(time);

      const accrued = state.index === s ? state.accruedInterest : accruedAtStart;
      const lmv = state.voogShares * voogPrice + (state.vgtCoreShares + state.lotShares) * vgt;
      const equity = lmv + state.receivables + state.cash - state.principal - accrued - state.fundingPayable;
      const strategyMark = state.realizedStrategyProfit + (state.lotShares * vgt - state.principal - accrued);

      minuteTracker.update(equity, time);
      strategyMinuteTracker.update(strategyMark, time);

      if (lmv > 0 && equity / lmv < minMargin.ratio) {
        minMargin.ratio = equity / lmv;
        minMargin.time = time;
      }
    };

    for (const time of times) {
      vgt = vgtBars.get(time) ?? vgt;
      voogPrice = voogBars.get(time) ?? voogPrice;
      mark(time);
    }

    vgt = ds.sClose[s]!;
    voogPrice = voog.close[s]!;
    mark(ds.sCloseTime[s]!);
  }

  function sessionBars(s: number) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const bars: { time: number; close: number }[] = [];

    for (let k = 0; k < count; k++) {
      bars.push({ time: ds.bTime[start + k]!, close: ds.bClose[start + k]! });
    }

    return bars;
  }
};

export const formatTime = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : '';
