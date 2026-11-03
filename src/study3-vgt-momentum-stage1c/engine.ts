// The Stage 1c fast simulator: Stage 1b's engine (src/study3-vgt-momentum-stage1b/engine.ts, copied unchanged in its
// order and arithmetic) plus the three protection rules of ENGINE_CONTRACT.md §11 — A the maximum losing hold at
// session opens, B the post-loss cooldown, C the post-material-loss recovery level — and the account loss record they
// read. With no `protect` on any policy every added branch is inert and the run is Stage 1b's bit for bit (parity).
//
// Stage 1b's description: one $100,000 borrowed slot holding at most one long VGT position, a self-financing account
// (cash, shares, loan, simple interest on the loan's segments), daily decisions at closes executed at the next opening
// trade, resting sell stops checked minute by minute from the fill bar, the minute rule of the intraday families,
// D1's fill primitives (imported), trims, re-entry campaigns and a schedule of policies with S1/S2/S3 transitions.
// Entry signals are Stage 1's (imported, position-independent).
import { createHash } from 'node:crypto';
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { firstTradeAfterDecision, firstTradeFrom, priceAt, timeAt } from '../shared-margin-portfolio/strategy.ts';
import { Features } from '../study3-vgt-momentum/features.ts';
import { type Params, type SignalId, type Signals, signalsOf } from '../study3-vgt-momentum/signals.ts';
import type {
  AccountEvent,
  BlockRow,
  DailyRow,
  DrawdownStats,
  ExitReason,
  LosingHoldEvent,
  Policy,
  RunOptions,
  RunResult,
  ScheduleItem,
  StopComponent,
  Trade,
  WindowResult
} from './types.ts';

const secondsPerMinute = 60;
const secondsPerYear = 365 * 24 * 60 * 60;
const secondsPerDay = 86400;

// Exits by the policy's own rules write the account loss record (ENGINE_CONTRACT.md §11.1); transitions,
// conversions, ZR resizes and the end-of-run valuation never do.
const ownRuleReasons = new Set<ExitReason>([
  'stop',
  'stop gap',
  'own out',
  'trend',
  'damage',
  'structural',
  'stale',
  'max hold',
  'stall',
  'losing hold'
]);

// The comparison tolerance of rule C's two thresholds (relative, inclusive).
const cTolerance = 1e-12;

export const defaultOptions = (firstDecisionIndex: number, endIndex: number): RunOptions => ({
  financing: 'net',
  costBps: 5,
  rate: 0.11,
  principal: 100000,
  stopSlippageBps: 0,
  entrySlippageBps: 0,
  openSlippageBps: 0,
  delayMinutes: 0,
  firstDecisionIndex,
  endIndex
});

// ----- per-policy runtime (signal arrays and the exit/re-entry arrays a policy reads) -----

interface Runtime {
  policy: Policy;
  sig: Signals;
  state?: Int8Array;
  trendLow?: Float64Array;
  damageLow?: Float64Array;
  sma200?: Float64Array;
  atr?: Float64Array;
  floorOut?: Int8Array;
  rfl?: Int8Array;
  er30?: Float64Array;
  a30?: Float64Array;
  max10?: Float64Array;
}

const stats = (tracker: Tracker): DrawdownStats => {
  const value = tracker.stats();

  return {
    maximum: value.maximum,
    peakTime: value.peakTime,
    troughTime: value.troughTime,
    peakValue: value.peakValue,
    troughValue: value.troughValue
  };
};

// sha256 over the trade path (entry session, bar, exit session, bar per trade; each trim's session and bar; an open
// trade's exit is (-1, -1)).
export const pathHashOf = (trades: Trade[]) => {
  const values: number[] = [];

  for (const trade of trades) {
    values.push(trade.entryIndex, trade.entryBar, trade.exitIndex, trade.exitBar);

    for (const trim of trade.trims) {
      values.push(-2, trim.index, trim.bar);
    }
  }

  return createHash('sha256')
    .update(new Uint8Array(Int32Array.from(values).buffer))
    .digest('hex')
    .slice(0, 24);
};

export class Engine {
  readonly F: Features;
  private readonly signalCache = new Map<string, Signals>();

  constructor(readonly ds: Dataset) {
    this.F = new Features(ds);
  }

  signals(id: SignalId, params: Params) {
    const key = `${id}|${JSON.stringify(params)}`;
    let value = this.signalCache.get(key);

    if (!value) {
      value = signalsOf(this.F, id, params);

      if (this.signalCache.size > 4096) {
        this.signalCache.clear();
      }

      this.signalCache.set(key, value);
    }

    return value;
  }

  runtime(policy: Policy): Runtime {
    const { F } = this;
    const x = policy.exit;
    const sig = this.signals(policy.entry, policy.entryParams);
    const rt: Runtime = { policy, sig };

    if (sig.kind === 'level') {
      rt.state = sig.state;
    }

    if (x.trendLow) {
      rt.trendLow = F.priorMinClose(x.trendLow);
    }

    if (x.damage && x.damage.N > 0) {
      rt.damageLow = F.priorMinClose(x.damage.N);
    }

    if (x.damage?.mode === 2 || policy.reentry === 'RPM') {
      rt.sma200 = F.sma(200);
    }

    if (x.vol) {
      rt.atr = F.atr(x.vol.n);
    }

    if (x.floor) {
      rt.floorOut = (this.signals('E05', { theta: x.floor.theta, b: x.floor.b }) as { out: Int8Array }).out;
    }

    if (policy.reentry === 'RFL') {
      rt.rfl = (this.signals('E05', { theta: 0.05, b: 0.005 }) as { trigger: Int8Array }).trigger;
    }

    if (policy.reentry === 'REF') {
      rt.er30 = F.efficiency(30);
      rt.a30 = F.annualisedReturn(30);
    }

    if (policy.reentry === 'RPM') {
      rt.max10 = F.priorMaxClose(10);
    }

    return rt;
  }

  run(schedule: Policy | ScheduleItem[], options: RunOptions): RunResult {
    const items = Array.isArray(schedule) ? schedule : [{ index: options.firstDecisionIndex, policy: schedule }];

    if (items.length === 1 && items[0]!.policy.sizing.kind === 'ZR') {
      return runRebalanced(this, items[0]!.policy, options);
    }

    return simulate(this, items, options);
  }
}

// ----- the run -----

interface Position {
  trade: Trade;
  rt: Runtime;
  entryIndex: number;
  firstRaw: number; // E
  hc: number;
  stop: number; // the resting level for the current session
  component: StopComponent;
  stopCore: number; // the ratcheted level of every component except B-D1N
  coreComponent: StopComponent;
  level: number; // the structural level of an E08/E12 campaign
  volLevel: number;
  shares: number;
  loan: number;
  segStart: number; // the session the current loan segment's interest runs from
  accrued: number; // interest of closed loan segments
  trimCash: number; // trim proceeds beyond the principal repaid (in the account's cash)
  peakProfit: number;
  floorArmed: boolean; // XS: a held close above the floor has been seen
  lastHigh: number; // XU: the session of the last new Hc
  ownCount: number;
  ownOutSeen: boolean;
  permExpired: boolean;
  permHigh: number;
  entryOffset: number; // rule A: seconds from the entry session's scheduled opening-fill bar to the fill
}

interface Campaign {
  id: number;
  stoppedHigh: number;
  stopAtExit: number;
  trough: number;
  exitIndex: number;
  level: number;
  permHigh: number;
  failedBefore: boolean;
  belowStop: boolean; // RS: a flat close at or below stopAtExit since the exit
}

// cLevel: rule C's level in force at the decision (NaN if C was not armed), recorded on the trade at its fill.
// release: the decision was made at the first permitted decision session after a rule-B block of the same record.
type Pending =
  | { kind: 'open'; rule: string; kindOf: 'first' | 'reentry'; level: number; cLevel: number; release: boolean }
  | {
      kind: 'minute';
      decisionTime: number;
      rule: string;
      kindOf: 'first' | 'reentry';
      cLevel: number;
      release: boolean;
    }
  | undefined;

type EntryInfo = { rule: string; kindOf: 'first' | 'reentry'; level: number; cLevel: number; release: boolean };

// The account loss record (ENGINE_CONTRACT.md §11.1): the last own-rule exit of a whole position.
interface LossRecord {
  exitIndex: number;
  exitRaw: number;
  entryRaw: number;
  net: number;
  consumed: boolean; // a later entry fill consumed the record (B and C no longer read it)
}

const simulate = (engine: Engine, items: ScheduleItem[], o: RunOptions): RunResult => {
  const { ds, F } = engine;
  const { C } = F;
  const B0 = o.principal;
  const transition = o.transition ?? 'S1';
  const buy = (raw: number, opening: boolean) =>
    raw * (1 + o.entrySlippageBps / 10000) * (1 + o.costBps / 10000) * (1 + (opening ? o.openSlippageBps : 0) / 10000);
  const sell = (raw: number, isStop: boolean, opening: boolean) =>
    raw *
    (1 - (isStop ? o.stopSlippageBps : 0) / 10000) *
    (1 - o.costBps / 10000) *
    (1 - (opening ? o.openSlippageBps : 0) / 10000);
  const runtimes = items.map((item) => engine.runtime(item.policy));
  const switchAt = new Map<number, number>(); // boundary session -> schedule item

  items.forEach((item, i) => {
    if (i > 0) {
      switchAt.set(item.index, i);
    }
  });

  const e = o.firstDecisionIndex;
  const end = o.endIndex;

  if (items[0]!.index !== e) {
    throw new Error('the schedule must start at the first decision session');
  }

  const trades: Trade[] = [];
  const transitions: RunResult['transitions'] = [];
  let realized = 0; // closed trades' nets
  let position: Position | undefined;
  let pending: Pending;
  let pendingExit: ExitReason | undefined;
  let pendingTrim: number | undefined; // shares to sell at the next open (sized at the deciding close)
  let pendingConversion: { rt: Runtime; target: number } | undefined;
  let campaign: Campaign | undefined;
  let campaignCount = 0;
  let reentries = 0;
  let reentryOpportunities = 0;
  let active = runtimes[0]!;
  let positionCampaign = 0;
  // The adoption decision close (the run start, a flat boundary, or the exit session that ends an old policy's
  // position): a first entry decided there is labelled `adoption` (PROTOCOL.md §11 (d) excludes it).
  let adoptionAt = e;
  // A first-entry decision at the adoption close discarded by rule B or C keeps its `adoption` label through the same
  // uninterrupted signal state (ENGINE_CONTRACT.md §11.4); never set without a protection rule.
  let adoptionDeferred = false;

  // ----- Stage 1c protection rules (ENGINE_CONTRACT.md §11) -----
  let loss: LossRecord | undefined;
  let aChecks = 0;
  let aDue = 0;
  let aCancelled = 0;
  let bBlocks = 0;
  let cBlocks = 0;
  let bcBoth = 0;
  let cFillsBelow = 0;
  const blocks: BlockRow[] | undefined = o.recordDaily ? [] : undefined;
  const aEvents: LosingHoldEvent[] | undefined = o.recordDaily ? [] : undefined;
  const holdFill = o.losingHoldFill ?? 'next';
  // The session's scheduled opening-fill bar: bar 0, or the first trade at open + delay (Stage 1b `delayed`).
  const scheduledOpenBar = (s: number) => {
    if (o.delayMinutes <= 0) {
      return 0;
    }

    const k = firstTradeFrom(ds, s, ds.bTime[ds.sBarStart[s]!]! + o.delayMinutes * secondsPerMinute);

    return k < 0 ? 0 : k;
  };
  const resetAtBoundary = (o.restrictionCarry ?? 'persist') === 'reset';
  // B: a close decision at s is discarded while s < exit + C, a minute decision in session s while s < exit + C + 1
  // (ENGINE_CONTRACT.md §11.2); a consumed record (an entry since the loss) no longer restricts.
  const blockB = (rt: Runtime, s: number, minute: boolean) => {
    const rule = rt.policy.protect?.B;

    return (
      rule !== undefined &&
      loss !== undefined &&
      !loss.consumed &&
      loss.net < 0 &&
      s < loss.exitIndex + rule.C + (minute ? 1 : 0)
    );
  };
  // The first permitted decision session after a cooldown of the active policy's B (for the trade's releaseEntry flag).
  const releaseAt = (rt: Runtime, s: number, minute: boolean) => {
    const rule = rt.policy.protect?.B;

    // a cooldown of at least one session (amendment A1: C = 0 is identical to no B in every field)
    return (
      rule !== undefined &&
      rule.C >= 1 &&
      loss !== undefined &&
      !loss.consumed &&
      loss.net < 0 &&
      s === loss.exitIndex + rule.C + (minute ? 1 : 0)
    );
  };
  // C: the level the next purchase's decision price must reach (NaN if not armed).
  const levelC = (rt: Runtime) => {
    const rule = rt.policy.protect?.C;

    if (
      rule === undefined ||
      loss === undefined ||
      loss.consumed ||
      !(loss.net < 0) ||
      !(loss.exitRaw <= loss.entryRaw * (1 - rule.X) * (1 + cTolerance))
    ) {
      return NaN;
    }

    return loss.exitRaw * (1 + rule.Y);
  };
  // C-cross additionally needs the previous observation strictly below the level, observed at or after the arming
  // exit session's close (`previous` = NaN when there is no such observation).
  const allowC = (rt: Runtime, price: number, previous: number) => {
    const level = levelC(rt);

    if (Number.isNaN(level)) {
      return true;
    }

    const reached = price >= level * (1 - cTolerance);

    return rt.policy.protect!.C!.cross ? reached && previous < level * (1 - cTolerance) : reached;
  };

  // The active policy's intraday reference (Stage 1: accumulated from the exit minute, from the first decision
  // session's minutes at the start; triggering only from the next session).
  let refActive = false;
  let refValue = Infinity;
  let triggerFrom = e + 1;
  let refCooling = false; // rule B froze the reference; a low-mode reference restarts after the cooldown
  const startReference = (rt: Runtime, session: number, fromBars: boolean, seed: number) => {
    const sig = rt.sig;

    if (sig.kind !== 'intraday') {
      refActive = false;
      return;
    }

    refActive = true;
    refValue = sig.mode === 'low' ? Infinity : seed;
    triggerFrom = session + 1;
    refCooling = false;

    if (fromBars) {
      for (let b = ds.sBarStart[session]!; b < ds.sBarStart[session]! + ds.sBarCount[session]!; b++) {
        refValue = sig.mode === 'low' ? Math.min(refValue, ds.bLow[b]!) : Math.max(refValue, ds.bHigh[b]!);
      }
    }
  };

  startReference(active, e, true, -Infinity);

  const tracker = new Tracker(0, ds.sCloseTime[e]!);
  const windowStarts = (o.windows ?? []).filter((b) => b >= e && b < end);
  const windows: WindowResult[] = [];
  let windowTracker: Tracker | undefined;
  let windowDailyPeak = 0;
  let current: WindowResult | undefined;
  let dailyPeak = 0;
  let dailyDd = 0;
  let sessionsLong = 0;
  let grossDollarDays = 0;
  let loanDollarDays = 0;
  let peakGross = 0;
  const yearsHeld = new Set<number>();
  const daily: DailyRow[] | undefined = o.recordDaily ? [] : undefined;
  const events: AccountEvent[] | undefined = o.recordDaily ? [] : undefined;
  let closedInterest = 0;

  // The account (§3.2): principal cash M (buys -, sales +) in both modes; in net-debit mode interest accrues on
  // max(-M, 0) in segments split at every fill. The fixed-slot mode keeps Stage 1's per-trade interest exactly.
  const net = o.financing === 'net';
  let M = 0;
  let aiClosed = 0;
  let segFrom = e;
  let segBase = 0;
  let flatBooked = 0;
  let flatInterest = 0;
  let debitDollarDays = 0;
  const accountInterest = (s: number) =>
    aiClosed + segBase * o.rate * ((ds.sTime[s]! - ds.sTime[segFrom]!) / secondsPerYear);
  const bookFill = (s: number, delta: number) => {
    if (net) {
      aiClosed = accountInterest(s);
      segFrom = s;
    }

    M += delta;

    if (net) {
      segBase = Math.max(-M, 0);
    }
  };
  // At an entry: the net-debit interest accrued while flat (reported; it is part of the carried-balance line).
  const bookFlat = (s: number) => {
    if (net) {
      aiClosed = accountInterest(s);
      segFrom = s;
      flatInterest += aiClosed - flatBooked;
    }
  };

  // Every trade is charged simple interest on its own principal L (Stage 1's fixed-slot formula), in both modes, so
  // trade paths and decisions never depend on the account's history; in net-debit mode the account's interest A(s)
  // differs from Σ trade interest by the carried-balance interest line (PROTOCOL.md §3.2).
  const interestOf = (p: Position, s: number) =>
    p.accrued + p.loan * o.rate * ((ds.sTime[s]! - ds.sTime[p.segStart]!) / secondsPerYear);
  const tradeInterest = (s: number) => closedInterest + (position ? interestOf(position, s) : 0);
  const carried = (s: number) => (net ? accountInterest(s) - tradeInterest(s) : 0);
  const openMark = (s: number, price: number) => {
    const p = position!;

    return p.trimCash + (p.shares * price - p.loan - interestOf(p, s));
  };
  const markAt = (s: number, price: number) =>
    net
      ? M + (position ? position.shares * price : 0) - accountInterest(s)
      : position
        ? realized + openMark(s, price)
        : realized;
  const flatMark = (s: number) => (net ? M - accountInterest(s) : realized);
  const cumulativeInterest = (s: number) => (net ? accountInterest(s) : tradeInterest(s));
  const event = (
    s: number,
    k: number,
    kind: AccountEvent['kind'],
    trade: number,
    raw: number,
    shares: number,
    cash: number
  ) => {
    if (events) {
      const held = position ? position.shares : 0;
      const interest = cumulativeInterest(s);

      events.push({
        index: s,
        bar: k,
        kind,
        trade,
        raw,
        shares,
        cash,
        M,
        L: position ? position.loan : 0,
        debit: Math.max(-M, 0),
        interest,
        S: held,
        G: held * raw,
        mark: M + held * raw - interest
      });
    }
  };

  const updateMinute = (value: number, time: number) => {
    tracker.updateStrict(value, time);
    windowTracker?.updateStrict(value, time);
    o.markSink?.(value, time);
  };

  const ownOutAt = (rt: Runtime, s: number, level: number) => {
    const sig = rt.sig;

    if (sig.kind === 'level') {
      return rt.state![s] === 0;
    }

    if (sig.kind === 'event' || sig.kind === 'intraday') {
      if (sig.kind === 'event' && sig.level) {
        return C[s]! < level;
      }

      return sig.out ? sig.out[s] === 1 : false;
    }

    return false;
  };

  const freshAt = (rt: Runtime, s: number) => {
    const sig = rt.sig;

    if (sig.kind === 'level') {
      return rt.state![s] === 1;
    }

    if (sig.kind === 'event') {
      return sig.trigger[s] === 1;
    }

    return false;
  };

  const stopLevelOf = (p: Position, s: number): { level: number; component: StopComponent; d1: number } => {
    const x = p.rt.policy.exit;
    const hh = Math.max(p.trade.mfeHigh, p.hc);
    let d1 = -Infinity;
    let level = -Infinity;
    let component: StopComponent = '';
    const take = (value: number, name: StopComponent) => {
      if (value > level) {
        level = value;
        component = name;
      }
    };

    if (x.hard !== undefined) {
      take(p.firstRaw * (1 - x.hard), 'hard');
    }

    if (x.trail !== undefined) {
      take((x.trail.ref === 1 ? hh : p.hc) * (1 - x.trail.t), 'trail');
    }

    if (x.catastrophic !== undefined) {
      take(p.hc * (1 - x.catastrophic), 'catastrophic');
    }

    if (x.vol && p.rt.atr) {
      const value = s >= 0 ? p.rt.atr[s]! : NaN;
      const distance = Number.isFinite(value)
        ? Math.min(x.vol.dmax, Math.max(x.vol.dmin, (x.vol.k * value) / p.hc))
        : x.vol.dmax;

      p.volLevel = Math.max(p.volLevel, p.hc * (1 - distance));
      take(p.volLevel, 'vol');
    }

    if (x.ratchet && p.hc >= p.firstRaw * (1 + x.ratchet.g)) {
      take(p.hc * (1 - x.ratchet.t2), 'ratchet');
    }

    if (x.retain && p.hc >= p.firstRaw * (1 + x.retain.a)) {
      take(p.firstRaw + x.retain.rho * (p.hc - p.firstRaw), 'retain');
    }

    const sizing = p.rt.policy.sizing;
    const givebacks = [x.giveback, sizing.kind === 'Z3' ? { A: sizing.G, G: sizing.G } : undefined];

    for (const g of givebacks) {
      if (g && p.shares > 0 && p.peakProfit >= g.A) {
        take(
          (p.peakProfit - g.G - p.trimCash + p.loan + interestOf(p, Math.max(s, p.entryIndex))) / p.shares,
          'giveback'
        );
      }
    }

    if (x.expTrail && p.shares > 0) {
      const ratio = (p.shares * p.hc) / B0;
      const t = Math.min(x.expTrail.t0, Math.max(x.expTrail.tmin, x.expTrail.t0 * Math.pow(ratio, -x.expTrail.gamma)));

      take(p.hc * (1 - t), 'exp');
    }

    // B-D1N (D1's net-profit rule): active iff selling at the level realises a net profit (no friction), re-evaluated
    // every session and never carried while inactive.
    if (x.d1net && p.shares > 0) {
      const value = hh * (1 - x.d1net.t);

      if (p.shares * value - p.loan - interestOf(p, Math.max(s, p.entryIndex)) + p.trimCash > 0) {
        d1 = value;
      }
    }

    return { level, component, d1 };
  };

  const applyStop = (p: Position, stop: { level: number; component: StopComponent; d1: number }) => {
    if (stop.level > p.stopCore) {
      p.stopCore = stop.level;
      p.coreComponent = stop.component;
    }

    p.stop = Math.max(p.stopCore, stop.d1);
    p.component = stop.d1 > p.stopCore ? 'd1net' : p.coreComponent;
  };

  const newTrade = (
    s: number,
    k: number,
    rt: Runtime,
    kindOf: Trade['kind'],
    rule: string,
    raw: number,
    shares: number,
    principal: number,
    entryPrice: number
  ): Trade => ({
    id: trades.length + 1,
    policy: rt.policy.id,
    campaign: 0,
    kind: kindOf,
    rule,
    entryIndex: s,
    entryBar: k,
    entryTime: timeAt(ds, s, k),
    entryRaw: raw,
    entryPrice,
    shares,
    principal,
    trims: [],
    exitIndex: -1,
    exitBar: -1,
    exitTime: NaN,
    exitRaw: NaN,
    exitPrice: NaN,
    exitShares: 0,
    exitReason: 'open',
    stopComponent: '',
    stopLevel: NaN,
    gapFlag: '',
    shortfall: 0,
    proceeds: 0,
    priceGain: 0,
    friction: principal - shares * raw,
    interest: 0,
    net: 0,
    sessionsHeld: 0,
    calendarDays: 0,
    maeLow: raw,
    mfeHigh: raw,
    highClose: NaN,
    peakProfit: -Infinity,
    peakGross: 0,
    cLevel: NaN,
    cFillBelow: false,
    releaseEntry: false
  });

  const openPosition = (s: number, k: number, rt: Runtime, trade: Trade, level: number, loan: number) => {
    // Every entry fill consumes rule C's anchor (ENGINE_CONTRACT.md §11.1).
    if (loss) {
      loss.consumed = true;
    }

    bookFlat(s);
    bookFill(s, -trade.principal);
    position = {
      trade,
      rt,
      entryIndex: s,
      firstRaw: trade.entryRaw,
      hc: trade.entryRaw,
      stop: -Infinity,
      component: '',
      stopCore: -Infinity,
      coreComponent: '',
      level,
      volLevel: -Infinity,
      shares: trade.shares,
      loan,
      segStart: s,
      accrued: 0,
      trimCash: 0,
      peakProfit: -Infinity,
      floorArmed: false,
      lastHigh: s,
      ownCount: 0,
      ownOutSeen: false,
      permExpired: false,
      permHigh: -Infinity,
      entryOffset: timeAt(ds, s, k) - timeAt(ds, s, scheduledOpenBar(s))
    };

    trades.push(trade);
    event(
      s,
      k,
      trade.kind === 'conversion' ? 'conversion' : 'entry',
      trade.id,
      trade.entryRaw,
      trade.shares,
      -trade.principal
    );

    // At the fill only completed sessions are known: the volatility-scaled part uses the previous close's ATR.
    applyStop(position, stopLevelOf(position, s - 1));
  };

  const startPosition = (s: number, k: number, entry: EntryInfo, opening: boolean) => {
    let permHigh = -Infinity;

    if (entry.kindOf === 'first' || !campaign) {
      campaignCount++;
      campaign = {
        id: campaignCount,
        stoppedHigh: 0,
        stopAtExit: NaN,
        trough: Infinity,
        exitIndex: -1,
        level: entry.level,
        permHigh: NaN,
        failedBefore: false,
        belowStop: false
      };
    } else {
      reentries++;
      permHigh = campaign.permHigh;
    }

    const raw = priceAt(ds, s, k);
    const price = buy(raw, opening);
    const shares = B0 / price;
    const trade = newTrade(s, k, active, entry.kindOf, entry.rule, raw, shares, B0, price);

    trade.campaign = campaign.id;

    trade.releaseEntry = entry.release;

    if (!Number.isNaN(entry.cLevel)) {
      trade.cLevel = entry.cLevel;
      trade.cFillBelow = raw < entry.cLevel * (1 - cTolerance);

      if (trade.cFillBelow) {
        cFillsBelow++;
      }
    }

    openPosition(s, k, active, trade, entry.level, B0);

    position!.permHigh = permHigh; // RPM: the highest close since the campaign's first entry

    const id = campaign.id;

    campaign = undefined; // the campaign continues inside the position; it is re-created at its exit
    return id;
  };

  // Sells the whole position at raw (a stop, a close-decided exit, a transition, the end of a conversion).
  const settle = (s: number, k: number, raw: number, time: number, reason: ExitReason, sold: number, value: number) => {
    const p = position!;
    const trade = p.trade;
    const interest = interestOf(p, s);

    trade.exitIndex = s;
    trade.exitBar = k;
    trade.exitTime = time;
    trade.exitRaw = raw;
    trade.exitShares = p.shares;
    trade.exitReason = reason;
    trade.stopComponent = reason === 'stop' || reason === 'stop gap' ? p.component : '';
    trade.stopLevel = p.stop;
    trade.proceeds += value;
    trade.exitPrice = sold > 0 ? value / p.shares : raw;
    trade.priceGain += p.shares * (raw - trade.entryRaw);
    trade.friction += p.shares * raw - value;
    trade.interest = interest;
    trade.net = trade.proceeds - trade.principal - interest;
    trade.sessionsHeld = s - trade.entryIndex + 1;
    trade.calendarDays = (ds.sTime[s]! - ds.sTime[trade.entryIndex]!) / secondsPerDay;
    trade.highClose = p.hc;
    realized += trade.net;
    closedInterest += interest;
    bookFill(s, value);
    flatBooked = net ? aiClosed : 0;
    event(
      s,
      k,
      reason === 'transition' ? 'transition' : reason === 'conversion' ? 'conversion' : 'exit',
      trade.id,
      raw,
      sold,
      value
    );
  };

  const closePosition = (s: number, k: number, raw: number, time: number, reason: ExitReason, opening: boolean) => {
    const p = position!;

    // A conversion still pending when the old position is stopped first (a delayed opening trade) becomes S1's
    // adoption of the new policy.
    if (pendingConversion) {
      active = pendingConversion.rt;
      pendingConversion = undefined;
    }

    const isStop = reason === 'stop' || reason === 'stop gap';
    // rule A's market sale after the open (mode next) pays the stop-slippage stress like a triggered stop
    const price = sell(raw, isStop || (reason === 'losing hold' && !opening), opening);
    const value = p.shares * price;

    settle(s, k, raw, time, reason, p.shares, value);
    p.trade.exitPrice = price;

    // The account loss record: every exit by the policy's own rules (not a transition) replaces it.
    if (ownRuleReasons.has(reason)) {
      loss = {
        exitIndex: s,
        exitRaw: raw,
        entryRaw: p.trade.entryRaw,
        net: p.trade.net,
        consumed: false
      };
    }

    if (isStop) {
      p.trade.shortfall = p.stop - raw;
      p.trade.gapFlag = reason === 'stop gap' ? (s > 0 && C[s - 1]! < p.stop ? 'level above prior close' : 'gap') : '';
    } else if (reason === 'transition' && k === 0 && ds.bOpen[ds.sBarStart[s]!]! <= p.stop) {
      p.trade.gapFlag = 'gap';
    }

    // Own OUT (an exit or a condition seen while long) ends the campaign; RPM's permission replaces the own-condition
    // death (only an own-OUT exit or an expired permission ends it); transitions and conversions end it.
    const rpm = p.rt.policy.reentry === 'RPM';
    const ends =
      reason === 'own out' ||
      reason === 'transition' ||
      p.rt.policy.id !== active.policy.id ||
      (rpm ? p.permExpired : p.ownOutSeen);

    if (!ends) {
      reentryOpportunities++;
    }

    if (p.rt.policy.id !== active.policy.id) {
      adoptionAt = s;
      adoptionDeferred = false; // the new policy's first decision close
    }

    campaign = ends
      ? undefined
      : {
          id: positionCampaign,
          stoppedHigh: p.hc,
          stopAtExit: p.stop,
          trough: Infinity,
          exitIndex: s,
          level: p.level,
          permHigh: p.permHigh,
          failedBefore: false,
          belowStop: false
        };

    const managing = p.rt;

    position = undefined;
    pendingTrim = undefined;

    if (active.sig.kind === 'intraday') {
      startReference(active, s, false, managing.policy.id === active.policy.id ? p.hc : -Infinity);
    }
  };

  // S3: the open position becomes the new policy's position at the opening trade x. The target share count
  // B0 / C_b is fixed at the boundary close; friction is paid only on the traded difference; the retained shares are
  // rebooked at x, so the new trade's principal (and loan) is its cost at x.
  const convert = (s: number, k: number, rt: Runtime, target: number) => {
    const p = position!;
    const x = priceAt(ds, s, k);
    const time = timeAt(ds, s, k);
    const holding = p.shares;
    let newShares: number;
    let newFriction: number;
    let principal: number;
    let value: number;

    if (holding >= target) {
      const q = holding - target;

      value = target * x + q * sell(x, false, true);
      newShares = target;
      newFriction = 0;
      principal = target * x;
    } else {
      const q = target - holding;

      value = holding * x;
      newShares = target;
      newFriction = q * (buy(x, true) - x);
      principal = holding * x + q * buy(x, true);
    }

    const gapped = k === 0 && ds.bOpen[ds.sBarStart[s]!]! <= p.stop;

    settle(s, k, x, time, 'conversion', holding, value);
    p.trade.exitPrice = value / holding;
    p.trade.gapFlag = gapped ? 'gap' : '';
    transitions.push({
      index: s,
      kind: 'conversion',
      detail: `${p.rt.policy.id} -> ${rt.policy.id}${gapped ? ' (gap)' : ''}`
    });
    position = undefined;
    campaign = undefined;
    pendingTrim = undefined;
    campaignCount++;
    active = rt;

    const trade = newTrade(s, k, rt, 'conversion', 'conversion', x, newShares, principal, principal / newShares);

    trade.friction = newFriction;
    trade.campaign = campaignCount;
    positionCampaign = campaignCount;
    openPosition(s, k, rt, trade, NaN, principal);
  };

  const trim = (s: number, k: number, quantity: number) => {
    const p = position!;
    const raw = priceAt(ds, s, k);
    const q = Math.min(quantity, p.shares);

    if (!(q > 0)) {
      return;
    }

    const price = sell(raw, false, true);
    const proceeds = q * price;
    const repaid = Math.min(p.loan, proceeds);

    p.accrued += p.loan * o.rate * ((ds.sTime[s]! - ds.sTime[p.segStart]!) / secondsPerYear);
    p.segStart = s;
    p.loan -= repaid;
    p.trimCash += proceeds - repaid;
    p.shares -= q;
    p.trade.trims.push({ index: s, bar: k, raw, price, shares: q, proceeds, repaid });
    p.trade.proceeds += proceeds;
    p.trade.priceGain += q * (raw - p.trade.entryRaw);
    p.trade.friction += q * (raw - price);
    bookFill(s, proceeds);
    event(s, k, 'trim', p.trade.id, raw, q, proceeds);
  };

  // Campaign state and entry decisions while flat (Stage 1's, plus the Stage 1b re-entry rules).
  const decideFlat = (rt: Runtime, s: number) => {
    const close = C[s]!;
    const rule = rt.policy.reentry;

    if (campaign) {
      const dies =
        rule === 'RPM'
          ? close < rt.sma200![s]! || close <= 0.85 * Math.max(campaign.permHigh, close)
          : ownOutAt(rt, s, campaign.level);

      if (dies) {
        campaign = undefined; // the campaign died: a fresh signal is needed
      } else {
        campaign.trough = Math.min(campaign.trough, close);
        campaign.permHigh = Math.max(campaign.permHigh, close);
      }
    }

    const reclaimed = campaign ? campaign.belowStop && close > campaign.stopAtExit : false;

    if (campaign && close <= campaign.stopAtExit) {
      campaign.belowStop = true;
    }

    if (s >= end) {
      return;
    }

    let entry: { rule: string; kindOf: 'first' | 'reentry'; level: number } | undefined;
    const sig = rt.sig;
    const level = sig.kind === 'event' && sig.level ? sig.level[s]! : NaN;

    if (campaign) {
      const fresh = sig.kind === 'event' ? sig.trigger[s] === 1 : false;
      const since = s - campaign.exitIndex;
      let ok = false;

      switch (rule) {
        case 'R0':
          ok = true;
          break;
        case 'RC10':
          ok = since >= 10;
          break;
        case 'R3F':
          ok = close > campaign.stoppedHigh;
          break;
        case 'RP50':
          ok = close >= campaign.trough + 0.5 * (campaign.stoppedHigh - campaign.trough);
          break;
        case 'RS':
          ok = reclaimed;
          break;
        case 'RFL':
          ok = rt.rfl![s] === 1;
          break;
        case 'REF': {
          const efficient = rt.er30![s]! >= 0.3 && rt.a30![s]! >= 0.11;

          ok = efficient && campaign.failedBefore;

          if (!efficient) {
            campaign.failedBefore = true;
          }

          break;
        }
        case 'RPM':
          ok = close > rt.max10![s]!;
          break;
        default:
          ok = false;
      }

      if (ok) {
        entry = { rule, kindOf: 'reentry', level: campaign.level };
      } else if (fresh && rule !== 'RN') {
        // a fresh signal inside a live campaign: a re-entry of the same campaign with the new signal's references
        entry = { rule: 'fresh', kindOf: 'reentry', level };
      }
    } else if (freshAt(rt, s)) {
      entry = { rule: s === adoptionAt || adoptionDeferred ? 'adoption' : 'fresh', kindOf: 'first', level };
    } else {
      adoptionDeferred = false; // the adoption state was interrupted
    }

    // Rules B and C filter the chosen entry (discarded, never queued; ENGINE_CONTRACT.md §11.2–§11.4).
    if (entry) {
      const byB = blockB(rt, s, false);
      // the previous observation for C-cross: the previous session's close, if at or after the arming exit's close
      const previous = loss && s - 1 >= loss.exitIndex ? C[s - 1]! : NaN;
      const byC = !allowC(rt, close, previous);

      if (byB || byC) {
        if (byB) {
          bBlocks++;
        } else {
          cBlocks++;
        }

        if (byB && byC) {
          bcBoth++;
        }

        blocks?.push({
          index: s,
          kind: byB && byC ? 'BC' : byB ? 'B' : 'C',
          entry: entry.kindOf,
          minute: false,
          policy: rt.policy.id
        });

        if (entry.rule === 'adoption') {
          adoptionDeferred = true;
        }

        entry = undefined;
      }
    }

    if (entry) {
      adoptionDeferred = false;

      if (entry.kindOf === 'first') {
        campaign = undefined;
      }

      pending = { kind: 'open', ...entry, cLevel: levelC(rt), release: releaseAt(rt, s, false) };
      refActive = false;
    }
  };

  const boundaryStart = (s: number) => {
    const mark = markAt(s, C[s]!);
    const liquidation = position ? mark - position.shares * C[s]! * (o.costBps / 10000) : mark;

    return { mark, liquidation };
  };

  for (let s = e; s <= end; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    let exited = false;
    let entered = false;
    let minuteBlockedB = false;
    let minuteBlockedC = false;

    if (s > e) {
      // ----- (1)–(2) the session's minutes -----
      const openTime = ds.bTime[start]!;
      const delayed = o.delayMinutes > 0 ? firstTradeFrom(ds, s, openTime + o.delayMinutes * secondsPerMinute) : 0;
      const exitBar = position && (pendingExit || pendingConversion) ? delayed : -1;
      let entryBar = -1;
      let entryOpening = false;
      let entryInfo: EntryInfo | undefined;

      if (!position && pending) {
        entryBar = delayed;
        entryOpening = true;
        entryInfo =
          pending.kind === 'open'
            ? pending
            : {
                rule: pending.rule,
                kindOf: pending.kindOf,
                level: NaN,
                cLevel: pending.cLevel,
                release: pending.release
              };
      }

      let trimBar = position && pendingTrim !== undefined ? delayed : -1;

      // Rule A (ENGINE_CONTRACT.md §11.5): at an eligible open with no close-decided exit, transition or conversion
      // executing, a liquidation at the opening print that nets < 0 sells the position — at the next trade after the
      // print (primary) or at the print itself (idealised). The resting stop stays live until the fill.
      let aBar = -1;
      let aOpening = false;
      let aFallback = false;
      const holdRule = position?.rt.policy.protect?.A;

      if (position && holdRule && exitBar < 0) {
        const p = position;
        const days = Math.round((ds.sTime[s]! - ds.sTime[p.entryIndex]!) / secondsPerDay);

        if (days > holdRule.N || (days === holdRule.N && p.entryOffset <= 0)) {
          // the opening print (mode next) or the print the idealised order fills at (mode open)
          const x0 = holdFill === 'open' && delayed > 0 ? priceAt(ds, s, delayed) : ds.bOpen[start]!;
          const netOpen =
            p.shares * x0 * (1 - o.costBps / 10000) * (1 - o.openSlippageBps / 10000) +
            p.trimCash -
            p.loan -
            interestOf(p, s);
          const due = netOpen < 0;

          aChecks++;
          aEvents?.push({ index: s, trade: p.trade.id, netOpen, due });

          if (due) {
            aDue++;

            if (holdFill === 'open') {
              aBar = delayed;
              aOpening = true;

              if (trimBar === aBar) {
                trimBar = -1; // the whole position is sold at that opening trade instead
                pendingTrim = undefined;
              }
            } else {
              aBar = firstTradeFrom(ds, s, openTime + secondsPerMinute * (1 + o.delayMinutes));

              if (aBar < 0) {
                aBar = count - 1;
                aFallback = true;
              }
            }
          }
        }
      }

      const needsLoop = position !== undefined || entryBar >= 0 || (refActive && !pending);
      const stopFill = (k: number, raw: number): { k: number; raw: number; time: number } => {
        if (o.delayMinutes <= 0) {
          return { k, raw, time: ds.bTime[start + k]! };
        }

        const kd = firstTradeFrom(ds, s, ds.bTime[start + k]! + o.delayMinutes * secondsPerMinute);

        return kd >= 0
          ? { k: kd, raw: priceAt(ds, s, kd), time: timeAt(ds, s, kd) }
          : { k: count - 1, raw: ds.bClose[start + count - 1]!, time: ds.bTime[start + count - 1]! };
      };
      const fillBarStop = (b: number, k: number) => {
        const level = position!.stop;

        if (ds.bLow[b]! <= level) {
          const fill = stopFill(k, level);

          closePosition(s, fill.k, fill.raw, fill.time, 'stop', false);
          exited = true;
          updateMinute(flatMark(s), ds.bTime[b]!);
        }
      };

      if (needsLoop) {
        for (let k = 0; k <= count; k++) {
          const b = start + k;
          const isPrint = k === count;

          // A close-decided exit, a transition or a conversion at its bar; at an opening trade through the resting
          // stop a close-decided exit is a gap stop.
          if (position && k === exitBar) {
            if (pendingConversion) {
              const { rt, target } = pendingConversion;

              pendingConversion = undefined;
              pendingExit = undefined;
              convert(s, k, rt, target);
              entered = true;

              if (!isPrint) {
                fillBarStop(b, k);
              }
            } else {
              const gapped = k === 0 && !isPrint && ds.bOpen[b]! <= position.stop;
              const reason: ExitReason =
                pendingExit === 'transition' ? 'transition' : gapped ? 'stop gap' : pendingExit!;

              if (reason === 'transition') {
                transitions.push({ index: s, kind: 'transition', detail: position.rt.policy.id });
              }

              closePosition(s, k, priceAt(ds, s, k), timeAt(ds, s, k), reason, true);
              pendingExit = undefined;
              exited = true;
              updateMinute(flatMark(s), timeAt(ds, s, k));
            }
          }

          // A pending trim at the opening trade, unless the open is through the resting stop (the gap stop below
          // then sells everything); at the closing print (a delay past the last minute) it fills at the print.
          if (position && k === trimBar && pendingTrim !== undefined) {
            if (isPrint || ds.bOpen[b]! > position.stop) {
              trim(s, k, pendingTrim);
            }

            pendingTrim = undefined;
          }

          // Step 2b, rule A's sale at its bar (ENGINE_CONTRACT.md §11.5): at the opening print (aBar = 0) a gap through
          // the resting level is the stop's (step 3); at a later bar the losing-hold order is working and sells at
          // that bar's open. The fallback (no trade after the decision) is handled after step 3.
          if (position && k === aBar && !aFallback) {
            if (k === 0 && !isPrint && ds.bOpen[b]! <= position.stop) {
              aCancelled++;
            } else {
              const time = timeAt(ds, s, k);

              closePosition(s, k, priceAt(ds, s, k), time, 'losing hold', aOpening);
              exited = true;
              updateMinute(flatMark(s), time);
            }

            aBar = -1;
          }

          // The resting stop (minute bars only; the closing print does not trigger it).
          if (position && !isPrint && !(k === exitBar)) {
            const level = position.stop;

            if (ds.bOpen[b]! <= level) {
              const fill = stopFill(k, ds.bOpen[b]!);

              closePosition(s, fill.k, fill.raw, fill.time, k === 0 ? 'stop gap' : 'stop', k === 0);
              exited = true;
            } else if (ds.bLow[b]! <= level) {
              const fill = stopFill(k, level);

              closePosition(s, fill.k, fill.raw, fill.time, 'stop', false);
              exited = true;
            }

            if (exited && !position) {
              pendingExit = undefined;
              updateMinute(flatMark(s), ds.bTime[b]!);
            }
          }

          // Rule A's fallback: no trade after the decision; sold at the last minute's close if still long.
          if (position && k === aBar && aFallback) {
            closePosition(s, k, ds.bClose[b]!, ds.bTime[b]!, 'losing hold', false);
            exited = true;
            updateMinute(flatMark(s), ds.bTime[b]!);
            aBar = -1;
          }

          // A pending entry at its bar (never in a session that had an exit).
          if (!position && !exited && !entered && k === entryBar && entryInfo) {
            positionCampaign = startPosition(s, k, entryInfo, entryOpening);
            pending = undefined;
            entered = true;

            if (!isPrint) {
              fillBarStop(b, k);
            }
          }

          // The intraday rule while flat: the reference accumulates every minute (also after an exit in this
          // session); a decision needs a later session, no pending order, and, under RN, no live campaign.
          const intraday = active.sig.kind === 'intraday' ? active.sig : undefined;

          if (!position && !pending && refActive && !isPrint && intraday) {
            const base = !entered && s >= triggerFrom && !(campaign && active.policy.reentry === 'RN');
            // Rule B (ENGINE_CONTRACT.md §11.2): during the cooldown the reference is frozen; at the first minute after
            // it a low-mode reference restarts at +∞, so a fresh rebound is needed (no buy queued by the timer).
            // (the freeze applies only after the exit session, so C = 0 is exactly "no B")
            const byB = loss !== undefined && s > loss.exitIndex && blockB(active, s, true);

            if (byB) {
              refCooling = true;

              // a high-mode reference keeps ratcheting (a breakout must exceed the cooldown's highs)
              if (intraday.mode === 'high') {
                refValue = Math.max(refValue, ds.bHigh[b]!);
              }

              if (base && !minuteBlockedB) {
                minuteBlockedB = true;
                bBlocks++;
                blocks?.push({
                  index: s,
                  kind: 'B',
                  entry: campaign ? 'reentry' : 'first',
                  minute: true,
                  policy: active.policy.id
                });
              }
            } else {
              if (refCooling) {
                refCooling = false;

                if (intraday.mode === 'low') {
                  refValue = Infinity;
                }
              }

              let would = false;

              if (intraday.mode === 'low') {
                refValue = Math.min(refValue, ds.bLow[b]!);
                would = ds.bClose[b]! >= refValue * (1 + intraday.y);
              } else {
                would = ds.bClose[b]! > refValue * (1 + intraday.y);
                refValue = Math.max(refValue, ds.bHigh[b]!);
              }

              let fire = base && would;

              // Rule C: the deciding minute's close must reach the level (C-cross: the previous minute's close, or
              // the previous session's close at minute 0, below it).
              if (fire) {
                const previous = k > 0 ? ds.bClose[b - 1]! : loss && s - 1 >= loss.exitIndex ? C[s - 1]! : NaN;

                if (!allowC(active, ds.bClose[b]!, previous)) {
                  fire = false;

                  if (!minuteBlockedC) {
                    minuteBlockedC = true;
                    cBlocks++;
                    blocks?.push({
                      index: s,
                      kind: 'C',
                      entry: campaign ? 'reentry' : 'first',
                      minute: true,
                      policy: active.policy.id
                    });
                  }
                }
              }

              if (fire) {
                const decisionTime = ds.bTime[b]! + secondsPerMinute + o.delayMinutes * secondsPerMinute;
                const kind: 'first' | 'reentry' = campaign ? 'reentry' : 'first';
                const fill = firstTradeAfterDecision(ds, s, decisionTime);
                const cLevel = levelC(active);
                const release = releaseAt(active, s, true);

                refActive = false;

                if (fill >= 0) {
                  entryBar = fill;
                  entryOpening = false;
                  entryInfo = { rule: 'minute', kindOf: kind, level: NaN, cLevel, release };
                } else {
                  pending = { kind: 'minute', decisionTime, rule: 'minute', kindOf: kind, cLevel, release };
                }
              }
            }
          }

          // Marks: every minute close while long, MAE/MFE (= the intraday-high reference Hh).
          if (position && !isPrint) {
            const trade = position.trade;

            if (!(trade.entryIndex === s && trade.entryBar > k)) {
              if (ds.bLow[b]! < trade.maeLow) {
                trade.maeLow = ds.bLow[b]!;
              }

              if (ds.bHigh[b]! > trade.mfeHigh) {
                trade.mfeHigh = ds.bHigh[b]!;
              }
            }

            updateMinute(markAt(s, ds.bClose[b]!), ds.bTime[b]!);
          }
        }
      }

      // A due losing-hold sale whose position was stopped first lapses.
      if (aBar >= 0) {
        aCancelled++;
      }
    }

    // ----- (3) the close -----
    const close = C[s]!;

    if (position) {
      const p = position;
      const x = p.rt.policy.exit;
      const trade = p.trade;

      updateMinute(markAt(s, close), ds.sCloseTime[s]!);

      if (close > p.hc) {
        p.lastHigh = s;
      }

      p.hc = Math.max(p.hc, close);

      const held = s - p.entryIndex + 1;
      const own = ownOutAt(p.rt, s, p.level);

      if (own) {
        p.ownOutSeen = true;
      }

      p.ownCount = own ? p.ownCount + 1 : 0;

      if (p.rt.policy.reentry === 'RPM') {
        p.permHigh = Math.max(p.permHigh, close);

        if (close < p.rt.sma200![s]! || close <= 0.85 * p.permHigh) {
          p.permExpired = true;
        }
      }

      const profit = openMark(s, close);

      p.peakProfit = Math.max(p.peakProfit, profit);
      trade.peakProfit = p.peakProfit;
      trade.peakGross = Math.max(trade.peakGross, p.shares * close);

      let reason: ExitReason | undefined;

      if (x.own && p.ownCount >= (x.ownConsecutive ?? 1)) {
        reason = 'own out';
      } else if (p.rt.trendLow && close < p.rt.trendLow[s]!) {
        reason = 'trend';
      } else if (x.damage) {
        const priceDamage = close <= p.hc * (1 - x.damage.p);
        const trendDamage = p.rt.damageLow !== undefined && close < p.rt.damageLow[s]!;
        const and = x.damage.mode === 1 || (x.damage.mode === 2 && close > p.rt.sma200![s]!);

        if (and ? priceDamage && trendDamage : priceDamage || trendDamage) {
          reason = 'damage';
        }
      }

      // XS: the floor is armed (Stage 1b) once a held close is above it; Stage 1's X3 is unarmed.
      if (!reason && p.rt.floorOut && p.rt.floorOut[s] === 1 && (!x.floor!.arm || p.floorArmed)) {
        reason = 'structural';
      }

      if (p.rt.floorOut && p.rt.floorOut[s] === 0) {
        p.floorArmed = true;
      }

      if (!reason && x.stale && s - p.lastHigh >= x.stale.U && close <= p.hc * (1 - x.stale.d)) {
        reason = 'stale';
      }

      const hurdle = (T: number, kind: 'financing' | 'sessions') =>
        kind === 'sessions'
          ? (T * 0.11) / 252 // Stage 1's X6b hurdle (parity-only): its fixed 11%
          : (p.loan * o.rate * ((ds.sTime[s]! - ds.sTime[s - T]!) / secondsPerYear)) / (p.shares * C[s - T]!);

      if (!reason && x.maxHold !== undefined && held >= x.maxHold) {
        reason = 'max hold';
      } else if (
        !reason &&
        x.stall &&
        s - p.entryIndex >= x.stall.T &&
        close < C[s - x.stall.T]! * (1 + hurdle(x.stall.T, x.stall.hurdle) + x.stall.m) &&
        close <= p.hc * (1 - x.stall.d)
      ) {
        reason = 'stall';
      }

      if (reason) {
        pendingExit = reason;
      } else if (s < end) {
        const sizing = p.rt.policy.sizing;
        const gross = p.shares * close;

        // Z1 decides at the first close of each calendar month (no look at the next session), Z2 at any close; the
        // quantity is fixed at the deciding close and sold at the next opening trade.
        if (sizing.kind === 'Z1' && s > 0 && ds.dates[s]!.slice(0, 7) !== ds.dates[s - 1]!.slice(0, 7)) {
          if (gross > B0 * (1 + sizing.band)) {
            pendingTrim = p.shares - B0 / close;
          }
        } else if (sizing.kind === 'Z2' && gross >= B0 * (1 + sizing.u)) {
          pendingTrim = p.shares - (B0 * (1 + sizing.v)) / close;
        }
      }

      // The resting stop for the next session: never lowered (B-D1N re-evaluated).
      applyStop(p, stopLevelOf(p, s));
    } else if (!pending) {
      decideFlat(active, s);
    }

    // ----- transitions at a boundary (after the old policy's close) -----
    const switchIndex = switchAt.get(s);

    if (switchIndex !== undefined && runtimes[switchIndex]!.policy.id !== active.policy.id) {
      const rt = runtimes[switchIndex]!;

      pending = undefined;

      // Sensitivity `reset`: the account loss record does not survive a policy change (before the new policy's
      // first decision at this close).
      if (resetAtBoundary) {
        loss = undefined;
      }

      if (position) {
        const p = position as Position;

        if (transition === 'S2') {
          transitions.push({ index: s, kind: 'continue-old', detail: `${p.rt.policy.id} -> ${rt.policy.id}` });
          campaign = undefined;
          active = rt;
          refActive = false;
        } else if (transition === 'S3' && !pendingExit && freshAt(rt, s)) {
          pendingConversion = { rt, target: B0 / C[s]! };
          pendingExit = undefined;
          pendingTrim = undefined;
          campaign = undefined;
          refActive = false;
        } else {
          pendingTrim = undefined;
          campaign = undefined;
          pendingExit = pendingExit ?? 'transition';
          active = rt;
          refActive = false;
        }
      } else {
        transitions.push({ index: s, kind: 'adopt-flat', detail: rt.policy.id });
        campaign = undefined;
        active = rt;
        adoptionAt = s;
        adoptionDeferred = false;
        startReference(rt, s, true, -Infinity);
        decideFlat(rt, s);
      }
    }

    // ----- (4) daily marks, exposure, windows -----
    const mark = markAt(s, close);
    let liquidation = mark;

    if (position) {
      const p = position as Position;

      liquidation = mark - p.shares * close * (o.costBps / 10000);
      sessionsLong++;
      yearsHeld.add(ds.sYear[s]!);
      peakGross = Math.max(peakGross, p.shares * close);
    }

    const gross = position ? (position as Position).shares * close : 0;
    const loan = position ? (position as Position).loan : 0;
    // the overnight s → s+1 belongs to the window (b, e] with b ≤ s < e: credited after the rollover below
    let overnight: { gross: number; loan: number; debit: number } | undefined;

    if (s < end) {
      const days = (ds.sTime[s + 1]! - ds.sTime[s]!) / secondsPerDay;

      grossDollarDays += gross * days;
      loanDollarDays += loan * days;
      debitDollarDays += Math.max(-M, 0) * days;
      overnight = { gross: gross * days, loan: loan * days, debit: Math.max(-M, 0) * days };
    }

    // Net-debit mode: a carried debit lowers the mark while flat.
    if (net && !position && s > e) {
      updateMinute(mark, ds.sCloseTime[s]!);
    }

    daily?.push({
      mark,
      liquidation,
      shares: position ? (position as Position).shares : 0,
      loan,
      gross,
      cash: M,
      realized: realized - carried(s),
      openTrade: position ? (position as Position).trade.id : 0
    });

    if (mark > dailyPeak) {
      dailyPeak = mark;
    }

    dailyDd = Math.max(dailyDd, dailyPeak - mark);

    if (current && s > current.boundary) {
      windowDailyPeak = Math.max(windowDailyPeak, mark);
      current.dailyDd = Math.max(current.dailyDd, windowDailyPeak - mark);
      current.peakGross = Math.max(current.peakGross, gross);
      current.sessions++;

      if (position) {
        current.sessionsLong++;
      }
    }

    if (windowStarts.includes(s) || (current && s === end)) {
      if (current) {
        current.end = s;
        current.endMark = mark;
        current.endLiquidation = liquidation;
        current.increment = liquidation - current.startLiquidation;
        current.minuteDd = stats(windowTracker!);
        current.calendarDays = (ds.sTime[s]! - ds.sTime[current.boundary]!) / secondsPerDay;
        current.interest = cumulativeInterest(s) - current.interest;
        windows.push(current);
        current = undefined;
      }

      if (windowStarts.includes(s)) {
        const startValues = boundaryStart(s);

        windowTracker = new Tracker(mark, ds.sCloseTime[s]!);
        windowDailyPeak = mark;
        current = {
          boundary: s,
          end: s,
          startMark: startValues.mark,
          startLiquidation: startValues.liquidation,
          endMark: mark,
          endLiquidation: liquidation,
          increment: 0,
          minuteDd: stats(windowTracker),
          dailyDd: 0,
          grossDollarDays: 0,
          loanDollarDays: 0,
          debitDollarDays: 0,
          calendarDays: 0,
          peakGross: 0,
          sessionsLong: 0,
          sessions: 0,
          interest: cumulativeInterest(s) // replaced by the window's interest at its end
        };
      }
    }

    if (overnight && current) {
      current.grossDollarDays += overnight.gross;
      current.loanDollarDays += overnight.loan;
      current.debitDollarDays += overnight.debit;
    }
  }

  // The end of the run: an open position at liquidation.
  let endMark = realized;
  let endLiquidation = realized;

  if (position) {
    const p = position as Position;
    const trade = p.trade;
    const close = C[end]!;
    const price = close * (1 - o.costBps / 10000);
    const interest = interestOf(p, end);

    trade.exitRaw = close;
    trade.exitPrice = price;
    trade.exitShares = p.shares;
    trade.proceeds += p.shares * price;
    trade.priceGain += p.shares * (close - trade.entryRaw);
    trade.friction += p.shares * (close - price);
    trade.interest = interest;
    trade.net = trade.proceeds - trade.principal - interest;
    trade.sessionsHeld = end - trade.entryIndex + 1;
    trade.calendarDays = (ds.sTime[end]! - ds.sTime[trade.entryIndex]!) / secondsPerDay;
    trade.highClose = p.hc;
    trade.stopLevel = p.stop;
    endMark = net ? markAt(end, close) : realized + openMark(end, close);
    endLiquidation = net ? M + p.shares * price - accountInterest(end) : realized + trade.net;
    event(end, ds.sBarCount[end]!, 'end', trade.id, close, p.shares, p.shares * price);
  } else if (net) {
    // the flat period at the end of the run
    flatInterest += accountInterest(end) - flatBooked;
    endMark = flatMark(end);
    endLiquidation = endMark;
  }

  const carriedInterest = carried(end);

  return {
    trades,
    realized,
    endMark,
    endLiquidation,
    minuteDd: stats(tracker),
    dailyDd,
    windows,
    sessionsLong,
    sessions: end - e,
    grossDollarDays,
    loanDollarDays,
    calendarDays: (ds.sTime[end]! - ds.sTime[e]!) / secondsPerDay,
    peakGross,
    campaigns: campaignCount,
    reentries,
    reentryOpportunities,
    yearsHeld: yearsHeld.size,
    transitions,
    flatInterest,
    carriedInterest,
    debitDollarDays,
    daily,
    events,
    pathHash: pathHashOf(trades),
    aChecks,
    aDue,
    aCancelled,
    bBlocks,
    cBlocks,
    bcBoth,
    cFillsBelow,
    blocks,
    aEvents
  };
};

// C-ALR (ZR): Stage 1's frozen always-long reference — $100,000 notional re-sized at the opening trade of each
// month's first session; the month's gain is realised on the shares held, friction is paid on the traded difference
// only, interest accrues on $100,000.
const runRebalanced = (engine: Engine, policy: Policy, o: RunOptions): RunResult => {
  const { ds, F } = engine;
  const { C } = F;
  const e = o.firstDecisionIndex;
  const end = o.endIndex;
  const trades: Trade[] = [];
  const tracker = new Tracker(0, ds.sCloseTime[e]!);
  const windowStarts = (o.windows ?? []).filter((b) => b >= e && b < end);
  const windows: WindowResult[] = [];
  let windowTracker: Tracker | undefined;
  let windowDailyPeak = 0;
  let current: WindowResult | undefined;
  let realized = 0;
  let shares = 0;
  let basis = 0;
  let segmentStart = -1;
  let segmentFriction = 0;
  let dailyPeak = 0;
  let dailyDd = 0;
  let sessionsLong = 0;
  let grossDollarDays = 0;
  let loanDollarDays = 0;
  let peakGross = 0;
  let closedInterest = 0;
  const yearsHeld = new Set<number>();
  const daily: DailyRow[] | undefined = o.recordDaily ? [] : undefined;
  // Net-debit mode: principal cash M (the segment's value at its basis less friction; realised segment gains settle
  // into M) and simple interest on max(-M, 0), split at each reset. Fixed-slot mode: Stage 1's arithmetic.
  const net = o.financing === 'net';
  let M = 0;
  let aiClosed = 0;
  let segFrom = e;
  let segBase = 0;
  let debitDollarDays = 0;
  const accountInterest = (s: number) =>
    aiClosed + segBase * o.rate * ((ds.sTime[s]! - ds.sTime[segFrom]!) / secondsPerYear);
  const rebase = (s: number, delta: number) => {
    aiClosed = accountInterest(s);
    segFrom = s;
    M += delta;
    segBase = net ? Math.max(-M, 0) : 0;
  };
  const interestOf = (from: number, s: number) =>
    o.principal * o.rate * ((ds.sTime[s]! - ds.sTime[from]!) / secondsPerYear);
  const markAt = (s: number, price: number) =>
    shares > 0 ? shares * (price - basis) - segmentFriction - interestOf(segmentStart, s) : 0;
  const tradeInterest = (s: number) => closedInterest + (shares > 0 ? interestOf(segmentStart, s) : 0);
  const accountMark = (s: number, price: number) =>
    net ? M + shares * price - accountInterest(s) : realized + markAt(s, price);
  const carried = (s: number) => (net ? accountInterest(s) - tradeInterest(s) : 0);
  const cumulativeInterest = (s: number) => (net ? accountInterest(s) : tradeInterest(s));

  const closeSegment = (s: number, k: number, raw: number) => {
    const trade = trades.at(-1)!;
    const interest = interestOf(segmentStart, s);

    trade.exitIndex = s;
    trade.exitBar = k;
    trade.exitTime = timeAt(ds, s, k);
    trade.exitRaw = raw;
    trade.exitPrice = raw;
    trade.exitShares = shares;
    trade.exitReason = 'resize';
    trade.priceGain = shares * (raw - basis);
    trade.friction = segmentFriction;
    trade.interest = interest;
    trade.net = trade.priceGain - segmentFriction - interest;
    trade.proceeds = trade.net + trade.principal + interest;
    trade.sessionsHeld = s - trade.entryIndex + 1;
    trade.calendarDays = (ds.sTime[s]! - ds.sTime[trade.entryIndex]!) / secondsPerDay;
    realized += trade.net;
    closedInterest += interest;
    rebase(s, trade.priceGain + o.principal); // the segment's value at its basis returns to cash
  };

  const openSegment = (s: number, k: number, raw: number, tradedShares: number) => {
    const target = o.principal / raw;

    segmentFriction = Math.abs(tradedShares) * raw * (o.costBps / 10000);
    shares = target;
    basis = raw;
    segmentStart = s;
    rebase(s, -o.principal - segmentFriction); // the segment's cost at its basis plus its friction
    trades.push({
      id: trades.length + 1,
      policy: policy.id,
      campaign: 1,
      kind: trades.length === 0 ? 'first' : 'reentry',
      rule: trades.length === 0 ? 'fresh' : 'resize',
      entryIndex: s,
      entryBar: k,
      entryTime: timeAt(ds, s, k),
      entryRaw: raw,
      entryPrice: raw,
      shares: target,
      principal: o.principal,
      trims: [],
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitRaw: NaN,
      exitPrice: NaN,
      exitShares: 0,
      exitReason: 'open',
      stopComponent: '',
      stopLevel: NaN,
      gapFlag: '',
      shortfall: 0,
      proceeds: 0,
      priceGain: 0,
      friction: segmentFriction,
      interest: 0,
      net: 0,
      sessionsHeld: 0,
      calendarDays: 0,
      maeLow: raw,
      mfeHigh: raw,
      highClose: NaN,
      peakProfit: -Infinity,
      peakGross: 0,
      cLevel: NaN,
      cFillBelow: false,
      releaseEntry: false
    });
  };

  for (let s = e; s <= end; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    if (s > e) {
      const k0 = o.delayMinutes > 0 ? firstTradeFrom(ds, s, ds.bTime[start]! + o.delayMinutes * secondsPerMinute) : 0;
      const monthStart = ds.dates[s]!.slice(0, 7) !== ds.dates[s - 1]!.slice(0, 7);

      for (let k = 0; k < count; k++) {
        const b = start + k;

        if (k === k0 && (shares === 0 || monthStart)) {
          const raw = ds.bOpen[b]!;
          const target = o.principal / raw;
          const traded = target - shares;

          if (shares > 0) {
            closeSegment(s, k, raw);
          }

          openSegment(s, k, raw, traded);
        }

        if (shares > 0) {
          const trade = trades.at(-1)!;

          trade.maeLow = Math.min(trade.maeLow, ds.bLow[b]!);
          trade.mfeHigh = Math.max(trade.mfeHigh, ds.bHigh[b]!);

          const value = accountMark(s, ds.bClose[b]!);

          tracker.updateStrict(value, ds.bTime[b]!);
          windowTracker?.updateStrict(value, ds.bTime[b]!);
          o.markSink?.(value, ds.bTime[b]!);
        }
      }
    }

    const mark = accountMark(s, C[s]!);
    const liquidation = shares > 0 ? mark - shares * C[s]! * (o.costBps / 10000) : mark;

    if (shares > 0) {
      const trade = trades.at(-1)!;

      tracker.updateStrict(mark, ds.sCloseTime[s]!);
      windowTracker?.updateStrict(mark, ds.sCloseTime[s]!);
      o.markSink?.(mark, ds.sCloseTime[s]!);
      sessionsLong++;
      yearsHeld.add(ds.sYear[s]!);
      peakGross = Math.max(peakGross, shares * C[s]!);
      trade.peakGross = Math.max(trade.peakGross, shares * C[s]!);
      trade.peakProfit = Math.max(trade.peakProfit, markAt(s, C[s]!));
    }

    const gross = shares * C[s]!;
    const loan = shares > 0 ? o.principal : 0;
    // the overnight s → s+1 belongs to the window (b, e] with b ≤ s < e: credited after the rollover below
    let overnight: { gross: number; loan: number; debit: number } | undefined;

    if (s < end) {
      const days = (ds.sTime[s + 1]! - ds.sTime[s]!) / secondsPerDay;

      grossDollarDays += gross * days;
      loanDollarDays += loan * days;
      debitDollarDays += Math.max(-M, 0) * days;
      overnight = { gross: gross * days, loan: loan * days, debit: Math.max(-M, 0) * days };
    }

    daily?.push({
      mark,
      liquidation,
      shares,
      loan,
      gross,
      cash: M,
      realized: realized - carried(s),
      openTrade: shares > 0 ? trades.at(-1)!.id : 0
    });

    if (mark > dailyPeak) {
      dailyPeak = mark;
    }

    dailyDd = Math.max(dailyDd, dailyPeak - mark);

    if (current && s > current.boundary) {
      windowDailyPeak = Math.max(windowDailyPeak, mark);
      current.dailyDd = Math.max(current.dailyDd, windowDailyPeak - mark);
      current.peakGross = Math.max(current.peakGross, gross);
      current.sessions++;

      if (shares > 0) {
        current.sessionsLong++;
      }
    }

    if (windowStarts.includes(s) || (current && s === end)) {
      if (current) {
        current.end = s;
        current.endMark = mark;
        current.endLiquidation = liquidation;
        current.increment = liquidation - current.startLiquidation;
        current.minuteDd = stats(windowTracker!);
        current.calendarDays = (ds.sTime[s]! - ds.sTime[current.boundary]!) / secondsPerDay;
        current.interest = cumulativeInterest(s) - current.interest;
        windows.push(current);
        current = undefined;
      }

      if (windowStarts.includes(s)) {
        windowTracker = new Tracker(mark, ds.sCloseTime[s]!);
        windowDailyPeak = mark;
        current = {
          boundary: s,
          end: s,
          startMark: mark,
          startLiquidation: liquidation,
          endMark: mark,
          endLiquidation: liquidation,
          increment: 0,
          minuteDd: stats(windowTracker),
          dailyDd: 0,
          grossDollarDays: 0,
          loanDollarDays: 0,
          debitDollarDays: 0,
          calendarDays: 0,
          peakGross: 0,
          sessionsLong: 0,
          sessions: 0,
          interest: cumulativeInterest(s)
        };
      }
    }

    if (overnight && current) {
      current.grossDollarDays += overnight.gross;
      current.loanDollarDays += overnight.loan;
      current.debitDollarDays += overnight.debit;
    }
  }

  let endLiquidation = realized;
  let endMark = realized;

  if (shares > 0) {
    const trade = trades.at(-1)!;
    const close = C[end]!;
    const exitFriction = shares * close * (o.costBps / 10000);
    const interest = interestOf(segmentStart, end);

    trade.exitRaw = close;
    trade.exitPrice = close * (1 - o.costBps / 10000);
    trade.exitShares = shares;
    trade.priceGain = shares * (close - basis);
    trade.friction = segmentFriction + exitFriction;
    trade.interest = interest;
    trade.net = trade.priceGain - trade.friction - interest;
    trade.proceeds = trade.net + trade.principal + interest;
    trade.sessionsHeld = end - trade.entryIndex + 1;
    trade.calendarDays = (ds.sTime[end]! - ds.sTime[trade.entryIndex]!) / secondsPerDay;
    endMark = net ? accountMark(end, close) : realized + trade.priceGain - segmentFriction - interest;
    endLiquidation = net ? M + shares * close * (1 - o.costBps / 10000) - accountInterest(end) : realized + trade.net;
  }

  return {
    trades,
    realized,
    endMark,
    endLiquidation,
    minuteDd: stats(tracker),
    dailyDd,
    windows,
    sessionsLong,
    sessions: end - e,
    grossDollarDays,
    loanDollarDays,
    calendarDays: (ds.sTime[end]! - ds.sTime[e]!) / secondsPerDay,
    peakGross,
    campaigns: 1,
    reentries: 0,
    reentryOpportunities: 0,
    yearsHeld: yearsHeld.size,
    transitions: [],
    flatInterest: 0,
    carriedInterest: carried(end),
    debitDollarDays,
    daily,
    pathHash: pathHashOf(trades),
    aChecks: 0,
    aDue: 0,
    aCancelled: 0,
    bBlocks: 0,
    cBlocks: 0,
    bcBoth: 0,
    cFillsBelow: 0
  };
};
