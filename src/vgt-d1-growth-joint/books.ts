// The two canonical VIRTUAL books (PROTOCOL.md §4.1). Each is run standalone on the door's one Dataset, independently
// of the pool: its signals, its state (D1's shadow trades, setups and continuation windows; Growth's invested/flat
// state, gates, eligibility and continuation) and its trades are exactly the family's standalone ones. The pool only
// decides which virtual trades are funded and with how much principal; a funding refusal never feeds back into a book.
//
// - D1: the frozen ShadowBook (src/multi-etf-allocator/shadow.ts) under shadow semantics, driven in the N-book
//   engine's fixed-mode order for one book (src/portfolio-aware-d1/nbook/engine.ts runNAllocator: per session
//   beginSession; per bar the virtual exit, the virtual fill, then processBar → commit; at the close the exit and the
//   fill at the closing print; afterSession; at the end finish). Sessions from accountingStart + 1; arming from
//   `armStart` (and, inside the machine, only once L sessions of reference highs exist).
// - Growth 1.4.0: runRiseTrading's body (src/growth-trading/riseTrading.ts) on the door's cached Dataset and daily
//   signal bars instead of a fresh fixtureDataset per run, with the Strategy Lab request mapping (paramsOf). The
//   parity tests check every trade, fill, mark and drawdown against runRiseTrading itself.
//
// Both are reduced to a compact list of virtual trades: the decision, the entry fill and the exit fills (Growth's
// retention may sell part of the position first), with raw and after-cost prices and their (session, bar) positions.
import { paramsOf } from '../../apps/strategy-lab/runner/growth-params.ts';
import type { LabRunRequest } from '../../apps/strategy-lab/shared/contract.ts';
import { scanRiseFromRecentLow } from '../entry-signals/riseFromRecentLow.ts';
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { paramsOf as d1ParamsOf } from '../multi-etf-allocator/phenotypes.ts';
import { type BookSettings, type VirtualTrade, ShadowBook } from '../multi-etf-allocator/shadow.ts';
import { fractionOf, scanTrendBreakout } from '../growth-trading/optionalRules.ts';
import {
  type RiseTradingParams,
  type Simulation,
  assertTradingParams,
  bookSettingsOf,
  decisionsFromBreakout,
  decisionsFromSignals,
  entryMethodOf,
  exitParamsOf,
  simulateTrading
} from '../growth-trading/riseTrading.ts';
import type { GateRuntime } from '../growth-trading/entryGates.ts';
import type { StopFill, StrategyParams } from '../shared-margin-portfolio/strategy.ts';
import { economics, growthKey, growthVersion, resolution, symbol } from './context.ts';
import type { Door } from './data.ts';

export type Family = 'D1' | 'G';

// One exit fill of a virtual trade. `f` is the fraction of the position's CURRENT shares (and principal) it sells:
// retention's partial sale sells its configured fraction; a final exit sells the rest (f = 1).
export interface VFill {
  s: number;
  k: number; // bar index in session s (k = bar count: the closing print)
  t: number;
  raw: number;
  price: number; // after the per-side cost (and any stop slippage)
  partial: boolean;
  f: number;
  reason: string;
}

export interface VTrade {
  family: Family;
  id: number; // the book's trade id (1-based)
  kind: string; // D1: deep | continuation; Growth: rise | trend_breakout | a continuation method
  dS: number; // decision session
  dT: number; // decision time (Unix seconds: when the signal is first knowable)
  dPrice: number;
  eS: number; // entry fill session (-1: never filled — an order pending at the door's end)
  eK: number;
  eT: number;
  eRaw: number;
  ePrice: number; // after the per-side cost
  fills: VFill[]; // exits in order; empty or partial-only while open at the end
  open: boolean; // filled and still (partly) open at the door's end
  vNet: number; // the book's own net on its $100,000 notional (marked at the last close while open)
  vInterest: number;
}

export interface VBook {
  family: Family;
  key: string; // the parameter identity the book was built from
  trades: VTrade[]; // in decision order
  signals: number; // decisions the book took (D1: rebound signals; Growth: entries committed)
  firstDecision: string | null; // the first decision's date
  endIndex: number;
  // the standalone run's own figures on the $100,000 notional (parity checks only)
  standalone: { net: number; realized: number; minuteDd: number; dailyDd: number };
}

export interface Friction {
  costBps: number;
  rate: number;
  stopFill: StopFill;
  stopSlippageBps: number;
}

export const baseFriction: Friction = {
  costBps: economics.costBps,
  rate: economics.rate,
  stopFill: economics.stopFill,
  stopSlippageBps: economics.stopSlippageBps
};

const isStop = (reason: string) => reason === 'trailing stop' || reason === 'trailing stop gap';

// ----- D1 -----

// D1's eight parameters on the registry's integer grid (tenths of a percentage point, calendar days, sessions).
export interface D1Grid {
  targetPercentChange: number;
  trailingBuyPercentage: number;
  trailingStopPercentage: number;
  maximumHoldDays: number;
  tickWindowSize: number;
  intradayLossBuffer: number;
  pullback: number;
  continuationWindow: number;
}

export const d1Keys = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer',
  'pullback',
  'continuationWindow'
] as const satisfies readonly (keyof D1Grid)[];

export const d1KeyOf = (g: D1Grid) => d1Keys.map((k) => g[k]).join(',');
export const d1StrategyParams = (g: D1Grid): StrategyParams => d1ParamsOf(symbol, `d1-${d1KeyOf(g)}`, g);

// The standalone book's own marks on its notional (FixedLedger / ShadowBook formulas, strict trackers) are kept only to
// check a compact book against its canonical engine.
export const runD1Book = (
  ds: Dataset,
  grid: D1Grid,
  opts: { armStart: number; accountingStart: number; endIndex: number; friction?: Friction }
): VBook => {
  const fr = opts.friction ?? baseFriction;
  const params = d1StrategyParams(grid);
  const settings: BookSettings = {
    notional: economics.notional,
    rate: fr.rate,
    stopFill: fr.stopFill,
    costBps: fr.costBps,
    stopSlippageBps: fr.stopSlippageBps
  };
  const book = new ShadowBook(symbol as never, `d1` as never, ds, params, settings, opts.armStart);
  const out: VTrade[] = [];
  const byTrade = new Map<VirtualTrade, VTrade>();
  const minute = new Tracker(0, ds.bTime[ds.sBarStart[opts.accountingStart]!]!);
  const daily = new Tracker(0, ds.sTime[opts.accountingStart]!);
  let realized = 0;

  const close = (s: number, k: number) => {
    const decision = book.exitAt(k);

    if (!decision) return;

    const trade = book.close(s, decision);
    const v = byTrade.get(trade)!;

    v.fills.push({
      s,
      k: decision.barIndex,
      t: decision.time,
      raw: decision.price,
      price: trade.exitPrice,
      partial: false,
      f: 1,
      reason: decision.reason
    });
    v.vNet = trade.net;
    v.vInterest = trade.interest;
    realized += trade.net;
  };
  const fill = (s: number, k: number) => {
    if (!book.fillAt(k)) return;

    const trade = book.open(s, k);
    const v = byTrade.get(trade)!;

    v.eS = s;
    v.eK = k;
    v.eT = trade.entryTime;
    v.eRaw = trade.entryRawPrice;
    v.ePrice = trade.entryPrice;
  };
  const mark = (price: number, s: number, t: number) =>
    minute.updateStrict(realized + book.markAt(price, ds.sTime[s]!), t);

  for (let s = opts.accountingStart + 1; s <= opts.endIndex; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    book.beginSession(s);

    for (let k = 0; k < count; k++) {
      const heldBefore = Boolean(book.position);

      close(s, k);
      fill(s, k);

      const signal = book.processBar(s, k);

      if (signal) {
        const trade = book.commit(signal, s, 'granted');
        const v: VTrade = {
          family: 'D1',
          id: trade.id,
          kind: trade.setupKind,
          dS: s,
          dT: trade.decisionTime,
          dPrice: trade.decisionPrice,
          eS: -1,
          eK: -1,
          eT: NaN,
          eRaw: NaN,
          ePrice: NaN,
          fills: [],
          open: false,
          vNet: 0,
          vInterest: 0
        };

        byTrade.set(trade, v);
        out.push(v);
      }

      if (heldBefore || book.position) mark(ds.bClose[start + k]!, s, ds.bTime[start + k]!);
    }

    close(s, count);
    fill(s, count);
    book.afterSession(s);
    mark(ds.sClose[s]!, s, ds.sCloseTime[s]!);
    daily.updateStrict(realized + book.markAt(ds.sClose[s]!, ds.sTime[s]!), ds.sTime[s]!);
  }

  book.finish(opts.endIndex);

  for (const [trade, v] of byTrade) {
    if (v.eS >= 0 && v.fills.length === 0) {
      v.open = true;
      v.vNet = trade.net;
      v.vInterest = trade.interest;
    }
  }

  return {
    family: 'D1',
    key: d1KeyOf(grid),
    trades: out,
    signals: book.signals.length,
    firstDecision: out[0] ? ds.dates[out[0].dS]! : null,
    endIndex: opts.endIndex,
    standalone: {
      net: realized + book.markAt(ds.sClose[opts.endIndex]!, ds.sTime[opts.endIndex]!),
      realized,
      minuteDd: minute.stats().maximum,
      dailyDd: daily.stats().maximum
    }
  };
};

// ----- Growth -----

export type GrowthConfig = Record<string, number | boolean | string>; // flat Strategy Lab parameters (effective)

export const growthParamsOf = (c: GrowthConfig, door: Pick<Door, 'from' | 'to'>): RiseTradingParams =>
  paramsOf({
    strategyKey: growthKey,
    strategyVersion: growthVersion,
    params: c,
    symbols: [symbol],
    from: door.from,
    to: door.to,
    resolution
  } as unknown as LabRunRequest);

const EMPTY_SCAN = { signals: [], evaluableBars: 0, barsAtOrAboveThreshold: 0 };

// runRiseTrading (warm-up 0: 2016-01-04 is the file's first session) on the door's cached Dataset and bars, with an
// optional friction override (rate / stop fill / slippage are the book settings both the exits and the accounting
// read; the cost is the configuration's own costBpsPerSide).
export const simulateGrowth = (
  door: Door,
  params: RiseTradingParams,
  options: { friction?: Friction; recordMinuteMarks?: boolean } = {}
): { simulation: Simulation; decisions: number } => {
  assertTradingParams(params);

  if (params.resolution !== resolution) throw new Error(`Growth resolution ${params.resolution}`);

  const ds = door.ds;
  const bars = door.bars;
  const warmup = 0;
  const method = entryMethodOf(params);
  const first = bars.findIndex((bar) => bar.sessionIndex >= warmup);
  const firstSignalBar = first < 0 ? bars.length : first;
  const scanParams = {
    advanceFromRecentLowPercent: params.advanceFromRecentLowPercent,
    recentLowLookbackBars: params.recentLowLookbackBars
  };
  const scan = method === 'rise_from_recent_low' ? scanRiseFromRecentLow(bars, scanParams, firstSignalBar) : EMPTY_SCAN;
  const breakout =
    method === 'trend_breakout' ? scanTrendBreakout(ds, warmup, door.history.length - 1, params.breakout!) : null;
  const decisions = breakout ? decisionsFromBreakout(breakout.signals) : decisionsFromSignals(bars, scan.signals);
  const continuation = params.continuation
    ? { config: params.continuation, bars: params.continuation.method === 'classic_d1' ? null : bars }
    : null;
  const gates: GateRuntime | null =
    params.trendFilter || params.eligibility
      ? { trend: params.trendFilter ?? null, eligibility: params.eligibility ?? null, bars, entry: scanParams }
      : null;
  const fr = options.friction;
  const book: BookSettings = fr
    ? { ...bookSettingsOf(params), rate: fr.rate, stopFill: fr.stopFill, stopSlippageBps: fr.stopSlippageBps }
    : bookSettingsOf(params);
  const simulation = simulateTrading(ds, decisions, {
    symbol,
    firstSession: warmup,
    endSession: door.history.length - 1,
    exit: exitParamsOf(params),
    book,
    continuation,
    gates,
    recordMinuteMarks: options.recordMinuteMarks,
    entryMethod: method,
    rules:
      params.initialStop || params.retention
        ? { initialStop: params.initialStop ?? null, retention: params.retention ?? null }
        : null,
    drawdown: params.drawdownGate ?? null
  });

  return { simulation, decisions: decisions.length };
};

export const growthKeyOf = (c: GrowthConfig) => JSON.stringify(Object.entries(c).sort(([a], [b]) => (a < b ? -1 : 1)));

export const runGrowthBook = (
  door: Door,
  config: GrowthConfig,
  options: { friction?: Friction; costBps?: number } = {}
): VBook => {
  const c = options.costBps === undefined ? config : { ...config, costBpsPerSide: options.costBps };
  const params = growthParamsOf(c, door);
  const { simulation: sim } = simulateGrowth(door, params, { friction: options.friction });
  const ds = door.ds;
  const sellFraction = params.retention ? fractionOf(params.retention.sellPercent) : 1;
  const trades: VTrade[] = [];
  const seen = new Set<VirtualTrade>();
  const add = (trade: VirtualTrade) => {
    if (seen.has(trade)) return;
    seen.add(trade);

    const pos = sim.rules?.positionOf(trade);
    const fills: VFill[] = [];

    if (pos && pos.fills.length > 0) {
      for (const x of pos.fills)
        fills.push({
          s: x.session,
          k: x.bar,
          t: x.time,
          raw: x.rawPrice,
          price: x.price,
          partial: x.partial,
          f: x.partial ? sellFraction : 1,
          reason: String(x.reason)
        });
    } else if (trade.exitIndex >= 0) {
      fills.push({
        s: trade.exitIndex,
        k: trade.exitBar,
        t: trade.exitTime,
        raw: trade.exitRawPrice,
        price: trade.exitPrice,
        partial: false,
        f: 1,
        reason: String(trade.exitReason)
      });
    }

    trades.push({
      family: 'G',
      id: trade.id,
      kind: String(trade.setupKind),
      dS: trade.decisionIndex,
      dT: trade.decisionTime,
      dPrice: trade.decisionPrice,
      eS: trade.entryIndex,
      eK: trade.entryIndex >= 0 ? trade.entryBar : -1,
      eT: trade.entryIndex >= 0 ? trade.entryTime : NaN,
      eRaw: trade.entryIndex >= 0 ? trade.entryRawPrice : NaN,
      ePrice: trade.entryIndex >= 0 ? trade.entryPrice : NaN,
      fills,
      open: trade.entryIndex >= 0 && trade.exitIndex < 0,
      vNet: trade.net,
      vInterest: trade.interest
    });
  };

  for (const trade of sim.trades) add(trade);
  // orders committed but never filled by the door's end (they still reserved capital at their decision)
  for (const e of sim.log.entries) {
    const trade = (e as { trade?: VirtualTrade | null }).trade;

    if (trade && trade.entryIndex < 0) add(trade);
  }

  trades.sort((a, b) => a.dT - b.dT || a.id - b.id);

  for (let i = 1; i < trades.length; i++)
    if (trades[i]!.dT <= trades[i - 1]!.dT) throw new Error('Growth decisions are not strictly ordered');

  const last = sim.daily.at(-1);

  return {
    family: 'G',
    key: growthKeyOf(c),
    trades,
    signals: trades.length,
    firstDecision: trades[0] ? ds.dates[trades[0].dS]! : null,
    endIndex: sim.endSession,
    standalone: {
      net: last ? last.marked : 0,
      realized: sim.realized,
      minuteDd: sim.minuteDrawdown.maximum,
      dailyDd: sim.dailyDrawdown.maximum
    }
  };
};

export { isStop };
