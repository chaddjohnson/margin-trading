// The fast simulator (PROTOCOL.md §3): one fixed $100,000 slot, one long VGT position (possibly in tranches), daily
// decisions at closes executed at the next opening trade, resting sell stops checked minute by minute, the minute
// trigger of the intraday families, D1's fill primitives (imported), 11% simple interest on calendar days, per-side
// friction, and the frozen fixed-slot minute-drawdown Tracker. Entry signals come from signals.ts and are
// position-independent; everything that depends on the position (stops, campaigns, re-entry, tranches) is here.
//
// Per session: (1) the opening trade and the first minutes: a pending close-decided exit, else the resting stop's gap
// check, then a pending entry or tranche; (2) the minute loop: resting stop, the intraday trigger, minute marks;
// (3) the close: features, stop levels for the next session, exit decisions, campaign state, entry decisions; (4)
// the daily marks. At most one entry per session, and none in a session that had an exit.
import { createHash } from 'node:crypto';
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { firstTradeAfterDecision, firstTradeFrom, priceAt, timeAt } from '../shared-margin-portfolio/strategy.ts';
import { Features, isFriday } from './features.ts';
import { type Params, type SignalId, type Signals, signalsOf } from './signals.ts';

const secondsPerMinute = 60;
const secondsPerYear = 365 * 24 * 60 * 60;

// ----- strategy specification -----

export type ReentryRule = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R3F';
export type SizingRule = 'Z0' | 'Z1' | 'Z2';

export interface ExitSpec {
  ownOut: boolean;
  hard?: number; // below the first fill's raw price
  trail?: number; // below Hc = max(first raw fill, closes since entry)
  catastrophic?: number; // below Hc
  volTrail?: { k: number; min: number; max: number; atrN: number }; // distance clamp(k ATR / Hc) below Hc
  floor?: { theta: number; b: number }; // X3: a close below the rising floor exits next open
  trendLow?: number; // a close below the prior N sessions' lowest close exits next open
  andPrice?: number; // X8AND: exit only when C <= Hc (1 - p) and C < prior 20-session low close
  maxHold?: number; // sessions held (the entry session is the first)
  stall?: { T: number; margin: number };
  profitStages?: boolean; // X5a
  probation?: { q: number; P: number; g: number; trail: number }; // X5b
}

export interface StrategySpec {
  id: string;
  signal: SignalId;
  params: Params;
  exit: ExitSpec;
  reentry: ReentryRule;
  sizing: SizingRule;
  exhaustion?: number; // A1: entry only if C / SMA50 - 1 <= this
  weekly?: boolean; // A2: close decisions only on Fridays
  invertState?: boolean; // placebo: a level family's state inverted
  // placebo: entries at random flat closes with this probability, each held for a session count drawn from `holds`
  // (exit at the next open once reached) unless a price stop fires first; the family's own OUT is not used
  randomEntry?: { probability: number; seed: number; holds: number[] };
}

export interface RunOptions {
  costBps: number;
  rate: number;
  principal: number;
  stopSlippageBps: number;
  entrySlippageBps: number;
  delayMinutes: number;
  firstDecisionIndex: number; // e: the first close that may decide; accounting from its close
  endIndex: number; // the last session of the run
  boundaryIndex?: number; // a window's boundary b (marks restart there)
  recordDaily?: boolean;
}

export type ExitReason =
  'own out' | 'trend' | 'structural' | 'max hold' | 'stall' | 'probation' | 'stop' | 'stop gap' | 'resize' | 'open';

export type StopComponent = 'hard' | 'trail' | 'catastrophic' | 'vol' | 'stage' | 'probation' | '';

export interface Trade {
  id: number;
  campaign: number;
  kind: 'first' | 'reentry';
  rule: string; // the entry's reason: fresh, R0..R5, R3 reclaim, minute, random, tranche
  tranche: number; // 0 = the first lot of a position
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryRaw: number;
  entryPrice: number;
  shares: number;
  principal: number;
  exitIndex: number;
  exitBar: number;
  exitTime: number;
  exitRaw: number;
  exitPrice: number;
  exitReason: ExitReason;
  stopComponent: StopComponent;
  stopLevel: number;
  priceGain: number; // shares (exit raw - entry raw)
  friction: number;
  interest: number;
  net: number; // priceGain - friction - interest (an open lot: at liquidation)
  sessionsHeld: number;
  calendarDays: number;
  maeLow: number; // lowest minute low between fill and exit
  mfeHigh: number; // highest minute high between fill and exit
  highClose: number; // Hc at exit
}

export interface DailyRow {
  mark: number; // realised + open (shares x close - principal - interest)
  liquidation: number; // the same with exit friction deducted
  invested: number; // principal of open lots at the close
}

export interface RunResult {
  spec: StrategySpec;
  trades: Trade[];
  realized: number;
  endMark: number;
  endLiquidation: number;
  minuteDrawdown: ReturnType<Tracker['stats']>;
  dailyDrawdown: { maximum: number; peakIndex: number; troughIndex: number };
  window?: {
    boundaryMark: number;
    boundaryLiquidation: number;
    endMark: number;
    increment: number;
    minuteDrawdown: ReturnType<Tracker['stats']>;
    dailyDrawdown: number;
    minuteMin: number; // lowest and highest minute mark after the boundary (for chaining windows, PROTOCOL.md §3)
    minuteMax: number;
  };
  investedSessions: number;
  investedMinutes: number;
  totalMinutes: number;
  borrowedDollarDays: number;
  daily?: DailyRow[];
  pathHash: string;
  printBelowStop?: { index: number; stop: number; close: number }[]; // sessions closing at or below an untriggered stop
}

// ----- the run -----

interface Lot {
  trade: Trade;
}

interface Position {
  lots: Lot[];
  entryIndex: number;
  firstRaw: number;
  hc: number;
  stop: number; // the resting stop level for the current session
  component: StopComponent;
  stage: number; // X5a: 0 initial, 1 break-even, 2 trail 8%, 3 trail 5%
  promoted: boolean; // X5b
  level: number; // the campaign's recorded structural level (E08/E12)
  tranches: number; // Z1/Z2 lots added
  volLevel: number; // X2: the volatility-scaled level, never lowered
  maxHold: number; // the random-entry placebo's drawn holding period (sessions), else Infinity
  ownOutSeen: boolean; // the family's own OUT condition held at a close while long (the campaign then ends at the exit)
}

interface Campaign {
  id: number;
  alive: boolean;
  stoppedHigh: number;
  trough: number;
  exitIndex: number;
  level: number;
}

type Pending =
  | { kind: 'open'; rule: string; kindOf: 'first' | 'reentry'; level: number }
  | { kind: 'minute'; decisionTime: number; rule: string; kindOf: 'first' | 'reentry' }
  | undefined;

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export { mulberry32 };

// sha256 over the trade path (entry session, bar, exit session, bar; an open lot's exit is (-1, -1)).
const pathHashOf = (trades: Trade[]) => {
  const values = new Int32Array(trades.length * 4);

  trades.forEach((trade, i) => {
    values.set([trade.entryIndex, trade.entryBar, trade.exitIndex, trade.exitBar], i * 4);
  });

  return createHash('sha256').update(new Uint8Array(values.buffer)).digest('hex').slice(0, 24);
};

export class Engine {
  readonly F: Features;
  readonly barLow: Float64Array; // lowest minute low of the session (closing print excluded)
  private readonly signalCache = new Map<string, Signals>();

  constructor(readonly ds: Dataset) {
    this.F = new Features(ds);
    this.barLow = new Float64Array(ds.sessionCount);

    for (let s = 0; s < ds.sessionCount; s++) {
      let low = Infinity;

      for (let b = ds.sBarStart[s]!; b < ds.sBarStart[s]! + ds.sBarCount[s]!; b++) {
        low = Math.min(low, ds.bLow[b]!);
      }

      this.barLow[s] = low;
    }
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

  run(spec: StrategySpec, options: RunOptions): RunResult {
    if (spec.signal === 'C-ALR') {
      return runAlwaysLongRebalanced(this, spec, options);
    }

    return simulate(this, spec, options);
  }
}

const simulate = (engine: Engine, spec: StrategySpec, o: RunOptions): RunResult => {
  const { ds, F } = engine;
  const { C } = F;
  const sig = engine.signals(spec.signal, spec.params);
  const exit = spec.exit;
  const buy = (raw: number) => raw * (1 + o.entrySlippageBps / 10000) * (1 + o.costBps / 10000);
  const sell = (raw: number, isStop: boolean) =>
    raw * (1 - (isStop ? o.stopSlippageBps : 0) / 10000) * (1 - o.costBps / 10000);
  const interestOf = (principal: number, entryIndex: number, s: number) =>
    principal * o.rate * ((ds.sTime[s]! - ds.sTime[entryIndex]!) / secondsPerYear);
  const low20 = F.priorMinClose(20);
  const trendLow = exit.trendLow ? F.priorMinClose(exit.trendLow) : undefined;
  const atr = exit.volTrail ? F.atr(exit.volTrail.atrN) : undefined;
  const floorOut = exit.floor
    ? (signalsOf(F, 'E05', { theta: exit.floor.theta, b: exit.floor.b }) as { out: Int8Array }).out
    : undefined;
  const sma50 = spec.exhaustion !== undefined ? F.sma(50) : undefined;
  const random = spec.randomEntry ? mulberry32(spec.randomEntry.seed) : undefined;
  const tranches = spec.sizing === 'Z1' ? 3 : spec.sizing === 'Z2' ? 4 : 1;
  const unit = o.principal / tranches;
  const sigma20 = spec.sizing === 'Z2' ? F.sigma(20) : undefined;
  const volTarget = (s: number) => {
    const value = Math.floor((4 * 0.2) / sigma20![s]! + 1e-9);

    return Number.isFinite(value) ? Math.max(1, Math.min(4, value)) : 1;
  };
  const state =
    sig.kind === 'level' && spec.invertState
      ? sig.state.map((value) => 1 - value)
      : sig.kind === 'level'
        ? sig.state
        : undefined;
  const e = o.firstDecisionIndex;
  const end = o.endIndex;
  const trades: Trade[] = [];
  let realized = 0;
  let position: Position | undefined;
  let pending: Pending;
  let pendingExit: ExitReason | undefined;
  let pendingTranche = 0; // Z1/Z2: lots to add (+) or remove (-) at the next open
  let campaign: Campaign | undefined;
  let campaignCount = 0;
  // The intraday rule's running reference (E09: lowest minute low, E10: highest minute high, seeded with the exited
  // trade's high reference): accumulated from the exit minute onwards (from the first decision session's minutes at
  // the start), triggering only from the next session on.
  const intraday = sig.kind === 'intraday' ? sig : undefined;
  let refActive = Boolean(intraday);
  let refValue = intraday?.mode === 'low' ? Infinity : -Infinity;
  let triggerFrom = e + 1;

  if (intraday) {
    for (let b = ds.sBarStart[e]!; b < ds.sBarStart[e]! + ds.sBarCount[e]!; b++) {
      refValue = intraday.mode === 'low' ? Math.min(refValue, ds.bLow[b]!) : Math.max(refValue, ds.bHigh[b]!);
    }
  }

  const tracker = new Tracker(0, ds.sCloseTime[e]!);
  let windowTracker: Tracker | undefined;
  let windowBoundaryMark = 0;
  let windowBoundaryLiquidation = 0;
  let windowDailyPeak = 0;
  let windowDailyDd = 0;
  let dailyPeak = 0;
  let dailyPeakIndex = e;
  let dailyDd = 0;
  let dailyDdPeak = e;
  let dailyDdTrough = e;
  let investedSessions = 0;
  let investedMinutes = 0;
  let totalMinutes = 0;
  let borrowedDollarDays = 0;
  const daily: DailyRow[] | undefined = o.recordDaily ? [] : undefined;
  const printBelowStop: { index: number; stop: number; close: number }[] = [];

  const openMark = (s: number, price: number) => {
    let value = 0;

    for (const lot of position!.lots) {
      value +=
        lot.trade.shares * price - lot.trade.principal - interestOf(lot.trade.principal, lot.trade.entryIndex, s);
    }

    return value;
  };

  let windowMin = Infinity;
  let windowMax = -Infinity;
  const updateMinute = (value: number, time: number) => {
    tracker.updateStrict(value, time);

    if (windowTracker) {
      windowTracker.updateStrict(value, time);
      windowMin = Math.min(windowMin, value);
      windowMax = Math.max(windowMax, value);
    }
  };

  const stopLevelOf = (p: Position, s: number): { level: number; component: StopComponent } => {
    let level = -Infinity;
    let component: StopComponent = '';
    const take = (value: number, name: StopComponent) => {
      if (value > level) {
        level = value;
        component = name;
      }
    };

    if (exit.probation) {
      if (!p.promoted) {
        take(p.firstRaw * (1 - exit.probation.q), 'probation');
      } else {
        take(p.hc * (1 - exit.probation.trail), 'trail');
      }

      return { level, component };
    }

    if (exit.profitStages) {
      take(p.firstRaw * (1 - 0.06), 'hard');

      if (p.stage >= 1) {
        take(p.firstRaw * 1.002, 'stage');
      }

      if (p.stage >= 2) {
        take(p.hc * (1 - (p.stage >= 3 ? 0.05 : 0.08)), 'stage');
      }

      return { level, component };
    }

    if (exit.hard !== undefined) {
      take(p.firstRaw * (1 - exit.hard), 'hard');
    }

    if (exit.trail !== undefined) {
      take(p.hc * (1 - exit.trail), 'trail');
    }

    if (exit.catastrophic !== undefined) {
      take(p.hc * (1 - exit.catastrophic), 'catastrophic');
    }

    if (exit.volTrail && atr) {
      const value = atr[s]!;
      const distance = Number.isFinite(value)
        ? Math.min(exit.volTrail.max, Math.max(exit.volTrail.min, (exit.volTrail.k * value) / p.hc))
        : exit.volTrail.max;

      p.volLevel = Math.max(p.volLevel, p.hc * (1 - distance));
      take(p.volLevel, 'vol');
    }

    return { level, component };
  };

  const openLot = (s: number, k: number, rule: string, kindOf: 'first' | 'reentry', tranche: number) => {
    const raw = priceAt(ds, s, k);
    const price = buy(raw);
    const shares = unit / price;
    const trade: Trade = {
      id: trades.length + 1,
      campaign: campaign && kindOf === 'reentry' ? campaign.id : 0,
      kind: kindOf,
      rule,
      tranche,
      entryIndex: s,
      entryBar: k,
      entryTime: timeAt(ds, s, k),
      entryRaw: raw,
      entryPrice: price,
      shares,
      principal: unit,
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitRaw: NaN,
      exitPrice: NaN,
      exitReason: 'open',
      stopComponent: '',
      stopLevel: NaN,
      priceGain: 0,
      friction: unit - shares * raw,
      interest: 0,
      net: 0,
      sessionsHeld: 0,
      calendarDays: 0,
      maeLow: raw,
      mfeHigh: raw,
      highClose: NaN
    };

    trades.push(trade);
    return trade;
  };

  const startPosition = (s: number, k: number, entry: { rule: string; kindOf: 'first' | 'reentry'; level: number }) => {
    if (entry.kindOf === 'first' || !campaign) {
      campaignCount++;
      campaign = {
        id: campaignCount,
        alive: false,
        stoppedHigh: 0,
        trough: Infinity,
        exitIndex: -1,
        level: entry.level
      };
    }

    const level = entry.level; // an R-rule re-entry carries the campaign's level; a fresh signal its own
    const campaignId = campaign.id;
    // Z2 enters at its volatility target (from the decision's close), the others with one lot.
    const lots = spec.sizing === 'Z2' ? volTarget(s - 1) : 1;
    const opened: Lot[] = [];

    for (let i = 0; i < lots; i++) {
      const trade = openLot(s, k, i === 0 ? entry.rule : 'tranche', entry.kindOf, i);

      trade.campaign = campaignId;
      opened.push({ trade });
    }

    position = {
      lots: opened,
      entryIndex: s,
      firstRaw: opened[0]!.trade.entryRaw,
      hc: opened[0]!.trade.entryRaw,
      stop: 0,
      component: '',
      stage: 0,
      promoted: false,
      level,
      tranches: lots,
      volLevel: -Infinity,
      maxHold: random ? spec.randomEntry!.holds[Math.floor(random() * spec.randomEntry!.holds.length)]! : Infinity,
      ownOutSeen: false
    };

    // At the fill only completed sessions are known: the volatility-scaled part uses the previous close's ATR.
    const stop = stopLevelOf(position, s - 1);

    position.stop = stop.level;
    position.component = stop.component;
    campaign = undefined; // the campaign continues inside the position; it is re-created at its exit
    return campaignId;
  };

  let positionCampaign = 0;

  const closePosition = (s: number, k: number, raw: number, time: number, reason: ExitReason) => {
    const p = position!;
    const isStop = reason === 'stop' || reason === 'stop gap';

    for (const { trade } of p.lots) {
      const price = sell(raw, isStop);
      const interest = interestOf(trade.principal, trade.entryIndex, s);

      trade.exitIndex = s;
      trade.exitBar = k;
      trade.exitTime = time;
      trade.exitRaw = raw;
      trade.exitPrice = price;
      trade.exitReason = reason;
      trade.stopComponent = isStop ? p.component : '';
      trade.stopLevel = p.stop;
      trade.priceGain = trade.shares * (raw - trade.entryRaw);
      trade.friction += trade.shares * (raw - price);
      trade.interest = interest;
      trade.net = trade.shares * price - trade.principal - interest;
      trade.sessionsHeld = s - trade.entryIndex + 1;
      trade.calendarDays = (ds.sTime[s]! - ds.sTime[trade.entryIndex]!) / 86400;
      trade.highClose = p.hc;
      realized += trade.net;
    }

    // Own OUT ends the campaign, and so does an own-OUT condition seen at a close while long (even when it is not an
    // exit of this configuration); any other exit leaves it alive while the family's own condition holds.
    campaign =
      reason === 'own out' || p.ownOutSeen
        ? undefined
        : { id: positionCampaign, alive: true, stoppedHigh: p.hc, trough: Infinity, exitIndex: s, level: p.level };
    position = undefined;

    if (intraday) {
      refActive = true;
      refValue = intraday.mode === 'low' ? Infinity : p.hc;
      triggerFrom = s + 1;
    }
  };

  // Partial removal (Z2): the earliest lots are sold first (FIFO); the position keeps at least one lot.
  const removeLots = (s: number, k: number, count: number) => {
    const p = position!;
    const raw = priceAt(ds, s, k);

    for (let i = 0; i < count && p.lots.length > 1; i++) {
      const { trade } = p.lots.shift()!;
      const price = sell(raw, false);
      const interest = interestOf(trade.principal, trade.entryIndex, s);

      trade.exitIndex = s;
      trade.exitBar = k;
      trade.exitTime = timeAt(ds, s, k);
      trade.exitRaw = raw;
      trade.exitPrice = price;
      trade.exitReason = 'resize';
      trade.priceGain = trade.shares * (raw - trade.entryRaw);
      trade.friction += trade.shares * (raw - price);
      trade.interest = interest;
      trade.net = trade.shares * price - trade.principal - interest;
      trade.sessionsHeld = s - trade.entryIndex + 1;
      trade.calendarDays = (ds.sTime[s]! - ds.sTime[trade.entryIndex]!) / 86400;
      trade.highClose = p.hc;
      realized += trade.net;
    }
  };

  const ownOutAt = (s: number, level: number) => {
    if (sig.kind === 'level') {
      return state![s] === 0;
    }

    if (sig.kind === 'event' || sig.kind === 'intraday') {
      if (sig.kind === 'event' && sig.level) {
        return C[s]! < level;
      }

      return sig.out ? sig.out[s] === 1 : false;
    }

    return false;
  };

  const freshAt = (s: number) => {
    if (sig.kind === 'level') {
      return state![s] === 1;
    }

    if (sig.kind === 'event') {
      return sig.trigger[s] === 1;
    }

    return false;
  };

  for (let s = e; s <= end; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    let exited = false;
    let entered = false;

    if (s > e) {
      // ----- (1)–(2) the session's minutes -----
      const openTime = ds.bTime[start]!;
      const delayed = o.delayMinutes > 0 ? firstTradeFrom(ds, s, openTime + o.delayMinutes * secondsPerMinute) : 0;
      const exitBar = position && pendingExit ? delayed : -1;
      let entryBar = -1;
      let entryInfo: { rule: string; kindOf: 'first' | 'reentry'; level: number } | undefined;

      if (!position && pending) {
        if (pending.kind === 'open') {
          entryBar = delayed;
          entryInfo = pending;
        } else {
          // A minute decision carried from the previous session fills at this session's first trade (+ the delay,
          // counted from the open like every opening fill).
          entryBar = delayed;
          entryInfo = { rule: pending.rule, kindOf: pending.kindOf, level: NaN };
        }
      }

      const trancheBar = position && pendingTranche !== 0 ? delayed : -1;
      const needsLoop = position !== undefined || entryBar >= 0 || (refActive && !pending);
      // A stop triggered at bar k fills at the trigger (open or stop level), or with a delay at the first trade at or
      // after bar k's time + the delay (the session's last minute close if none is left).
      const stopFill = (k: number, raw: number): { k: number; raw: number; time: number } => {
        if (o.delayMinutes <= 0) {
          return { k, raw, time: ds.bTime[start + k]! };
        }

        const kd = firstTradeFrom(ds, s, ds.bTime[start + k]! + o.delayMinutes * secondsPerMinute);

        return kd >= 0
          ? { k: kd, raw: priceAt(ds, s, kd), time: timeAt(ds, s, kd) }
          : { k: count - 1, raw: ds.bClose[start + count - 1]!, time: ds.bTime[start + count - 1]! };
      };

      if (needsLoop) {
        for (let k = 0; k <= count; k++) {
          const b = start + k;
          const isPrint = k === count;

          // A close-decided exit at its bar; at the opening trade through the resting stop it is a gap stop.
          if (position && k === exitBar) {
            const gapped = k === 0 && !isPrint && ds.bOpen[b]! <= position.stop;

            closePosition(s, k, priceAt(ds, s, k), timeAt(ds, s, k), gapped ? 'stop gap' : pendingExit!);
            pendingExit = undefined;
            exited = true;
            updateMinute(realized, timeAt(ds, s, k));
          }

          // The resting stop (minute bars only; the closing print does not trigger it).
          if (position && !isPrint && !(k === exitBar)) {
            const level = position.stop;

            if (ds.bOpen[b]! <= level) {
              const fill = stopFill(k, ds.bOpen[b]!);

              closePosition(s, fill.k, fill.raw, fill.time, k === 0 ? 'stop gap' : 'stop');
              exited = true;
            } else if (ds.bLow[b]! <= level) {
              const fill = stopFill(k, level);

              closePosition(s, fill.k, fill.raw, fill.time, 'stop');
              exited = true;
            }

            if (exited && !position) {
              pendingExit = undefined;
              pendingTranche = 0;
              updateMinute(realized, ds.bTime[b]!);
            }
          }

          // A pending entry at its bar (never in a session that had an exit).
          if (!position && !exited && !entered && k === entryBar && entryInfo) {
            positionCampaign = startPosition(s, k, entryInfo);
            pending = undefined;
            entered = true;

            if (!isPrint) {
              const level = position!.stop;

              if (ds.bLow[b]! <= level) {
                const fill = stopFill(k, level);

                closePosition(s, fill.k, fill.raw, fill.time, 'stop');
                exited = true;
                updateMinute(realized, ds.bTime[b]!);
              }
            }
          }

          // Tranche changes (Z1/Z2) at the opening trade.
          if (position && k === trancheBar && pendingTranche !== 0) {
            if (pendingTranche > 0) {
              for (let i = 0; i < pendingTranche; i++) {
                const trade = openLot(s, k, 'tranche', 'reentry', position.tranches);

                trade.campaign = positionCampaign;
                trade.kind = position.lots[0]!.trade.kind;
                position.lots.push({ trade });
                position.tranches++;
              }
            } else {
              removeLots(s, k, -pendingTranche);
            }

            pendingTranche = 0;
          }

          // The intraday rule while flat: the reference accumulates every minute (also after an exit in this
          // session); a decision needs a later session, no pending order, and, under R5, no live campaign.
          if (!position && !pending && refActive && !isPrint && intraday) {
            // (a random-entry placebo never uses the family's own entry rule)
            const allowed =
              !random && !entered && s >= triggerFrom && !spec.weekly && !(campaign && spec.reentry === 'R5');
            let fire = false;

            if (intraday.mode === 'low') {
              refValue = Math.min(refValue, ds.bLow[b]!);
              fire = allowed && ds.bClose[b]! >= refValue * (1 + intraday.y);
            } else {
              fire = allowed && ds.bClose[b]! > refValue * (1 + intraday.y);
              refValue = Math.max(refValue, ds.bHigh[b]!);
            }

            if (fire) {
              const decisionTime = ds.bTime[b]! + secondsPerMinute + o.delayMinutes * secondsPerMinute;
              const kind: 'first' | 'reentry' = campaign ? 'reentry' : 'first';
              const fill = firstTradeAfterDecision(ds, s, decisionTime);

              refActive = false;

              if (fill >= 0) {
                entryBar = fill;
                entryInfo = { rule: 'minute', kindOf: kind, level: NaN };
              } else {
                pending = { kind: 'minute', decisionTime, rule: 'minute', kindOf: kind };
              }
            }
          }

          // Marks: every minute close while a lot is open, MAE/MFE.
          if (position && !isPrint) {
            for (const { trade } of position.lots) {
              if (ds.bLow[b]! < trade.maeLow && !(trade.entryIndex === s && trade.entryBar > k)) {
                trade.maeLow = ds.bLow[b]!;
              }

              if (ds.bHigh[b]! > trade.mfeHigh && !(trade.entryIndex === s && trade.entryBar > k)) {
                trade.mfeHigh = ds.bHigh[b]!;
              }
            }

            updateMinute(realized + openMark(s, ds.bClose[b]!), ds.bTime[b]!);
            investedMinutes++;
          }
        }
      }

      totalMinutes += count;
    }

    // ----- (3) the close -----
    const close = C[s]!;

    if (position) {
      updateMinute(realized + openMark(s, close), ds.sCloseTime[s]!);

      // A close at or below the session's resting stop that no minute triggered (the closing print; review 2 #19).
      if (close <= position.stop) {
        printBelowStop.push({ index: s, stop: position.stop, close });
      }

      position.hc = Math.max(position.hc, close);

      // Position management decided at the close.
      const p = position;
      const held = s - p.entryIndex + 1;
      const decides = !spec.weekly || isFriday(ds.dates[s]!);

      if (ownOutAt(s, p.level)) {
        p.ownOutSeen = true;
      }

      if (exit.profitStages) {
        const gain = close / p.firstRaw - 1;

        p.stage = Math.max(p.stage, gain >= 0.25 ? 3 : gain >= 0.1 ? 2 : gain >= 0.04 ? 1 : 0);
      }

      if (exit.probation && !p.promoted && close >= p.firstRaw * (1 + exit.probation.g)) {
        p.promoted = true;
      }

      let reason: ExitReason | undefined;

      if (decides) {
        if (exit.ownOut && !random && ownOutAt(s, p.level)) {
          reason = 'own out';
        } else if (trendLow && close < trendLow[s]!) {
          reason = 'trend';
        } else if (exit.andPrice !== undefined && close <= p.hc * (1 - exit.andPrice) && close < low20[s]!) {
          reason = 'trend';
        } else if (floorOut && floorOut[s] === 1) {
          reason = 'structural';
        }
      }

      if (!reason && held >= Math.min(exit.maxHold ?? Infinity, p.maxHold)) {
        reason = 'max hold';
      } else if (
        !reason &&
        exit.stall &&
        s - p.entryIndex >= exit.stall.T &&
        close < C[s - exit.stall.T]! * (1 + (exit.stall.T * 0.11) / 252 + exit.stall.margin)
      ) {
        reason = 'stall';
      } else if (!reason && exit.probation && !p.promoted && held >= exit.probation.P) {
        reason = 'probation';
      }

      if (reason) {
        pendingExit = reason;
      } else if (spec.sizing === 'Z1' && p.tranches < 3 && close >= p.firstRaw * (1 + 0.03 * p.tranches)) {
        pendingTranche = 1;
      } else if (spec.sizing === 'Z2') {
        pendingTranche = volTarget(s) - p.lots.length;
      }

      // Every component is monotone by construction (hard: fixed; trail, catastrophic: from Hc; stages: one-way;
      // vol: never lowered) except the probation promotion, which deliberately widens the stop.
      const stop = stopLevelOf(p, s);

      p.stop = stop.level;
      p.component = stop.component;
    } else if (!pending) {
      // Campaign state and entry decisions while flat.
      if (campaign) {
        if (ownOutAt(s, campaign.level)) {
          campaign = undefined; // the campaign died: a fresh signal is needed
        } else {
          campaign.trough = Math.min(campaign.trough, close);
        }
      }

      const decides = (!spec.weekly || isFriday(ds.dates[s]!)) && s < end;
      const filterOk = !sma50 || close / sma50[s]! - 1 <= spec.exhaustion!;

      if (decides && filterOk) {
        let entry: { rule: string; kindOf: 'first' | 'reentry'; level: number } | undefined;
        const level = sig.kind === 'event' && sig.level ? sig.level[s]! : NaN;

        if (random) {
          if (s >= e && random() < spec.randomEntry!.probability) {
            entry = { rule: 'random', kindOf: 'first', level: NaN };
          }
        } else if (campaign) {
          const fresh = sig.kind === 'event' ? sig.trigger[s] === 1 : false;
          const since = s - campaign.exitIndex;
          const rule = spec.reentry;
          let ok = false;

          if (rule === 'R0') {
            ok = true;
          } else if (rule === 'R2') {
            ok = since >= 10;
          } else if (rule === 'R3' || rule === 'R3F') {
            ok = close > campaign.stoppedHigh;
          } else if (rule === 'R4') {
            ok = close >= campaign.trough + 0.5 * (campaign.stoppedHigh - campaign.trough);
          }

          if (ok) {
            entry = { rule, kindOf: 'reentry', level: campaign.level };
          } else if (fresh && rule !== 'R5') {
            // a fresh signal inside a live campaign: a re-entry of the same campaign with the new signal's references
            entry = { rule: 'fresh', kindOf: 'reentry', level };
          }
        } else if (freshAt(s)) {
          entry = { rule: 'fresh', kindOf: 'first', level };
        }

        if (entry) {
          if (entry.kindOf === 'first') {
            campaign = undefined;
          }

          pending = { kind: 'open', ...entry };
          refActive = false;
        }
      }
    }

    // ----- (4) daily marks -----
    let mark = realized;
    let liquidation = realized;
    let invested = 0;

    if (position) {
      mark += openMark(s, close);

      for (const { trade } of position.lots) {
        liquidation +=
          trade.shares * close * (1 - o.costBps / 10000) -
          trade.principal -
          interestOf(trade.principal, trade.entryIndex, s);
        invested += trade.principal;
      }

      investedSessions++;
    }

    if (s < end) {
      borrowedDollarDays += invested * ((ds.sTime[s + 1]! - ds.sTime[s]!) / 86400);
    }

    daily?.push({ mark, liquidation, invested });

    if (mark > dailyPeak) {
      dailyPeak = mark;
      dailyPeakIndex = s;
    }

    if (dailyPeak - mark > dailyDd) {
      dailyDd = dailyPeak - mark;
      dailyDdPeak = dailyPeakIndex;
      dailyDdTrough = s;
    }

    if (o.boundaryIndex !== undefined) {
      if (s === o.boundaryIndex) {
        windowTracker = new Tracker(mark, ds.sCloseTime[s]!);
        windowBoundaryMark = mark;
        windowBoundaryLiquidation = liquidation;
        windowDailyPeak = mark;
        windowMin = mark;
        windowMax = mark;
      } else if (s > o.boundaryIndex) {
        windowDailyPeak = Math.max(windowDailyPeak, mark);
        windowDailyDd = Math.max(windowDailyDd, windowDailyPeak - mark);
        windowMin = Math.min(windowMin, mark);
        windowMax = Math.max(windowMax, mark);
      }
    }
  }

  // The end of the run: an open position at liquidation.
  let endMark = realized;
  let endLiquidation = realized;

  if (position) {
    const p = position as Position;

    for (const { trade } of p.lots) {
      const close = C[end]!;
      const price = close * (1 - o.costBps / 10000);
      const interest = interestOf(trade.principal, trade.entryIndex, end);

      trade.exitRaw = close;
      trade.exitPrice = price;
      trade.priceGain = trade.shares * (close - trade.entryRaw);
      trade.friction += trade.shares * (close - price);
      trade.interest = interest;
      trade.net = trade.shares * price - trade.principal - interest;
      trade.sessionsHeld = end - trade.entryIndex + 1;
      trade.calendarDays = (ds.sTime[end]! - ds.sTime[trade.entryIndex]!) / 86400;
      trade.highClose = p.hc;
      trade.stopLevel = p.stop;
      endMark += trade.shares * close - trade.principal - interest;
      endLiquidation += trade.net;
    }
  }

  return {
    spec,
    trades,
    realized,
    endMark,
    endLiquidation,
    minuteDrawdown: tracker.stats(),
    dailyDrawdown: { maximum: dailyDd, peakIndex: dailyDdPeak, troughIndex: dailyDdTrough },
    window:
      o.boundaryIndex !== undefined && windowTracker
        ? {
            boundaryMark: windowBoundaryMark,
            boundaryLiquidation: windowBoundaryLiquidation,
            endMark,
            increment: endLiquidation - windowBoundaryLiquidation,
            minuteDrawdown: windowTracker.stats(),
            dailyDrawdown: windowDailyDd,
            minuteMin: windowMin,
            minuteMax: windowMax
          }
        : undefined,
    investedSessions,
    investedMinutes,
    totalMinutes,
    borrowedDollarDays,
    daily,
    pathHash: pathHashOf(trades),
    printBelowStop
  };
};

// C-ALR: $100,000 notional re-sized at the opening trade of each month's first session: the month's gain is realised
// on the shares held, friction is paid on the traded difference only, interest accrues on $100,000.
const runAlwaysLongRebalanced = (engine: Engine, spec: StrategySpec, o: RunOptions): RunResult => {
  const { ds, F } = engine;
  const { C } = F;
  const e = o.firstDecisionIndex;
  const end = o.endIndex;
  const trades: Trade[] = [];
  const tracker = new Tracker(0, ds.sCloseTime[e]!);
  let windowTracker: Tracker | undefined;
  let windowBoundaryMark = 0;
  let windowBoundaryLiquidation = 0;
  let windowDailyPeak = 0;
  let windowDailyDd = 0;
  let windowMin = Infinity;
  let windowMax = -Infinity;
  let realized = 0;
  let shares = 0;
  let basis = 0; // the raw price the current segment's gain is measured from
  let segmentStart = -1;
  let segmentFriction = 0;
  let dailyPeak = 0;
  let dailyPeakIndex = e;
  let dailyDd = 0;
  let dailyDdPeak = e;
  let dailyDdTrough = e;
  let investedSessions = 0;
  let investedMinutes = 0;
  let totalMinutes = 0;
  let borrowedDollarDays = 0;
  const daily: DailyRow[] | undefined = o.recordDaily ? [] : undefined;
  const interestOf = (from: number, s: number) =>
    o.principal * o.rate * ((ds.sTime[s]! - ds.sTime[from]!) / secondsPerYear);
  const markAt = (s: number, price: number) =>
    shares > 0 ? shares * (price - basis) - segmentFriction - interestOf(segmentStart, s) : 0;

  const closeSegment = (s: number, k: number, raw: number, reason: ExitReason) => {
    const trade = trades.at(-1)!;
    const interest = interestOf(segmentStart, s);

    trade.exitIndex = s;
    trade.exitBar = k;
    trade.exitTime = timeAt(ds, s, k);
    trade.exitRaw = raw;
    trade.exitPrice = raw;
    trade.exitReason = reason;
    trade.priceGain = shares * (raw - basis);
    trade.friction = segmentFriction;
    trade.interest = interest;
    trade.net = trade.priceGain - segmentFriction - interest;
    trade.sessionsHeld = s - trade.entryIndex + 1;
    trade.calendarDays = (ds.sTime[s]! - ds.sTime[trade.entryIndex]!) / 86400;
    realized += trade.net;
  };

  const openSegment = (s: number, k: number, raw: number, tradedShares: number) => {
    const target = o.principal / raw;

    segmentFriction = Math.abs(tradedShares) * raw * (o.costBps / 10000);
    shares = target;
    basis = raw;
    segmentStart = s;
    trades.push({
      id: trades.length + 1,
      campaign: 1,
      kind: trades.length === 0 ? 'first' : 'reentry',
      rule: trades.length === 0 ? 'fresh' : 'resize',
      tranche: 0,
      entryIndex: s,
      entryBar: k,
      entryTime: timeAt(ds, s, k),
      entryRaw: raw,
      entryPrice: raw,
      shares: target,
      principal: o.principal,
      exitIndex: -1,
      exitBar: -1,
      exitTime: NaN,
      exitRaw: NaN,
      exitPrice: NaN,
      exitReason: 'open',
      stopComponent: '',
      stopLevel: NaN,
      priceGain: 0,
      friction: segmentFriction,
      interest: 0,
      net: 0,
      sessionsHeld: 0,
      calendarDays: 0,
      maeLow: raw,
      mfeHigh: raw,
      highClose: NaN
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
            closeSegment(s, k, raw, 'resize');
          }

          openSegment(s, k, raw, traded);
        }

        if (shares > 0) {
          const trade = trades.at(-1)!;

          trade.maeLow = Math.min(trade.maeLow, ds.bLow[b]!);
          trade.mfeHigh = Math.max(trade.mfeHigh, ds.bHigh[b]!);
          const value = realized + markAt(s, ds.bClose[b]!);

          tracker.updateStrict(value, ds.bTime[b]!);

          if (windowTracker) {
            windowTracker.updateStrict(value, ds.bTime[b]!);
            windowMin = Math.min(windowMin, value);
            windowMax = Math.max(windowMax, value);
          }

          investedMinutes++;
        }
      }

      totalMinutes += count;
    }

    const mark = realized + markAt(s, C[s]!);
    const liquidation = shares > 0 ? mark - shares * C[s]! * (o.costBps / 10000) : mark;

    if (shares > 0) {
      tracker.updateStrict(mark, ds.sCloseTime[s]!);
      windowTracker?.updateStrict(mark, ds.sCloseTime[s]!);
      investedSessions++;

      if (s < end) {
        borrowedDollarDays += o.principal * ((ds.sTime[s + 1]! - ds.sTime[s]!) / 86400);
      }
    }

    daily?.push({ mark, liquidation, invested: shares > 0 ? o.principal : 0 });

    if (mark > dailyPeak) {
      dailyPeak = mark;
      dailyPeakIndex = s;
    }

    if (dailyPeak - mark > dailyDd) {
      dailyDd = dailyPeak - mark;
      dailyDdPeak = dailyPeakIndex;
      dailyDdTrough = s;
    }

    if (o.boundaryIndex !== undefined) {
      if (s === o.boundaryIndex) {
        windowTracker = new Tracker(mark, ds.sCloseTime[s]!);
        windowBoundaryMark = mark;
        windowBoundaryLiquidation = liquidation;
        windowDailyPeak = mark;
        windowMin = mark;
        windowMax = mark;
      } else if (s > o.boundaryIndex) {
        windowDailyPeak = Math.max(windowDailyPeak, mark);
        windowDailyDd = Math.max(windowDailyDd, windowDailyPeak - mark);
        windowMin = Math.min(windowMin, mark);
        windowMax = Math.max(windowMax, mark);
      }
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
    trade.priceGain = shares * (close - basis);
    trade.friction = segmentFriction + exitFriction;
    trade.interest = interest;
    trade.net = trade.priceGain - trade.friction - interest;
    trade.sessionsHeld = end - trade.entryIndex + 1;
    trade.calendarDays = (ds.sTime[end]! - ds.sTime[trade.entryIndex]!) / 86400;
    endMark = realized + trade.priceGain - segmentFriction - interest;
    endLiquidation = realized + trade.net;
  }

  return {
    spec,
    trades,
    realized,
    endMark,
    endLiquidation,
    minuteDrawdown: tracker.stats(),
    dailyDrawdown: { maximum: dailyDd, peakIndex: dailyDdPeak, troughIndex: dailyDdTrough },
    window:
      o.boundaryIndex !== undefined && windowTracker
        ? {
            boundaryMark: windowBoundaryMark,
            boundaryLiquidation: windowBoundaryLiquidation,
            endMark,
            increment: endLiquidation - windowBoundaryLiquidation,
            minuteDrawdown: windowTracker.stats(),
            dailyDrawdown: windowDailyDd,
            minuteMin: windowMin,
            minuteMax: windowMax
          }
        : undefined,
    investedSessions,
    investedMinutes,
    totalMinutes,
    borrowedDollarDays,
    daily,
    pathHash: pathHashOf(trades)
  };
};
