// One Growth book under a funding lifecycle (PROTOCOL.md §5–§6): Priority 3's `simulateGrowth` / `runGrowthBook`
// (src/vg-d1-growth-joint/books.ts) with the study-local lifecycle orchestrator (lifecycle.ts) in place of the canonical
// one, on the door's cached Dataset and daily bars. With mode L0 it reproduces `runGrowthBook` exactly
// (tests/parity.test.ts).
//
// The book's REQUEST RECORDS are what the pool sees, in decision order, one per instant at most:
// - a granted request: the canonical virtual trade (its fill and exit fills; an order unfilled at the door's end keeps
//   eS = −1), exactly as runGrowthBook converts it;
// - a refused request (L1/L2) or an L2 reassessment that found the slot occupied ("waiting"): a PHANTOM record. It
//   carries the decision instant and a zero-duration fill/exit at the first trade after the decision, so that a pool
//   that (inconsistently) granted it would release the slot at once; in a converged (consistent) run every phantom is
//   refused by the pool, so no phantom ever becomes a lot (coupled.ts checks it).
import { scanRiseFromRecentLow } from '../entry-signals/riseFromRecentLow.ts';
import { fractionOf, scanTrendBreakout } from '../growth-trading/optionalRules.ts';
import {
  type RiseTradingParams,
  assertTradingParams,
  bookSettingsOf,
  decisionsFromBreakout,
  decisionsFromSignals,
  entryMethodOf,
  exitParamsOf
} from '../growth-trading/riseTrading.ts';
import type { GateRuntime } from '../growth-trading/entryGates.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { firstTradeAfterDecision, priceAt, timeAt } from '../shared-margin-portfolio/strategy.ts';
import {
  type Friction,
  type GrowthConfig,
  type VBook,
  type VFill,
  type VTrade,
  bookId,
  growthKeyOf,
  growthParamsOf
} from '../vg-d1-growth-joint/books.ts';
import { resolution } from '../vg-d1-growth-joint/context.ts';
import type { SymDoor } from '../vg-d1-growth-joint/data.ts';
import { type Ask, type LifeOutcome, type LifeSimulation, type Mode, simulateLifecycle } from './lifecycle.ts';

const EMPTY_SCAN = { signals: [], evaluableBars: 0, barsAtOrAboveThreshold: 0 };

// books.ts simulateGrowth with the lifecycle orchestrator (identical inputs; `ask` unused in L0).
export const simulateGrowthLife = (
  sd: SymDoor,
  params: RiseTradingParams,
  mode: Mode,
  ask: Ask,
  options: { friction?: Friction } = {}
): { simulation: LifeSimulation; decisions: number } => {
  assertTradingParams(params);

  if (params.resolution !== resolution) throw new Error(`Growth resolution ${params.resolution}`);

  const ds = sd.ds;
  const bars = sd.bars;
  const warmup = 0;
  const endSession = ds.sessionCount - 1;
  const method = entryMethodOf(params);
  const first = bars.findIndex((bar) => bar.sessionIndex >= warmup);
  const firstSignalBar = first < 0 ? bars.length : first;
  const scanParams = {
    advanceFromRecentLowPercent: params.advanceFromRecentLowPercent,
    recentLowLookbackBars: params.recentLowLookbackBars
  };
  const scan = method === 'rise_from_recent_low' ? scanRiseFromRecentLow(bars, scanParams, firstSignalBar) : EMPTY_SCAN;
  const breakout = method === 'trend_breakout' ? scanTrendBreakout(ds, warmup, endSession, params.breakout!) : null;
  const decisions = breakout ? decisionsFromBreakout(breakout.signals) : decisionsFromSignals(bars, scan.signals);
  const continuation = params.continuation
    ? { config: params.continuation, bars: params.continuation.method === 'classic_d1' ? null : bars }
    : null;
  const gates: GateRuntime | null =
    params.trendFilter || params.eligibility
      ? { trend: params.trendFilter ?? null, eligibility: params.eligibility ?? null, bars, entry: scanParams }
      : null;
  const fr = options.friction;
  const book = fr
    ? { ...bookSettingsOf(params), rate: fr.rate, stopFill: fr.stopFill, stopSlippageBps: fr.stopSlippageBps }
    : bookSettingsOf(params);
  const simulation = simulateLifecycle(
    ds,
    decisions,
    {
      symbol: sd.symbol,
      firstSession: warmup,
      endSession,
      exit: exitParamsOf(params),
      book,
      continuation,
      gates,
      entryMethod: method,
      rules:
        params.initialStop || params.retention
          ? { initialStop: params.initialStop ?? null, retention: params.retention ?? null }
          : null,
      drawdown: params.drawdownGate ?? null
    },
    mode === 'L0'
      ? null
      : {
          mode,
          ask,
          bars,
          rise: method === 'rise_from_recent_low' ? scanParams : null,
          breakout: method === 'trend_breakout' ? params.breakout! : null
        }
  );

  return { simulation, decisions: decisions.length };
};

export interface LifeBook extends VBook {
  life: LifeOutcome | null;
  simulation: LifeSimulation;
}

export const PHANTOM_ID = 1_000_000; // phantom record ids start here (real trades keep the book's 1-based ids)

// The phantom record of a refused request or a waiting reassessment (see the header).
const phantomOf = (sd: SymDoor, id: number, kind: string, s: number, t: number, price: number): VTrade => {
  const ds = sd.ds;
  let eS = s;
  let eK = firstTradeAfterDecision(ds, s, t);

  if (eK < 0) {
    eS = s + 1 < ds.sessionCount ? s + 1 : -1;
    eK = eS >= 0 ? firstTradeAfterDecision(ds, eS, t) : -1;
  }

  const filled = eS >= 0 && eK >= 0;
  const raw = filled ? priceAt(ds, eS, eK) : NaN;
  const t1 = filled ? timeAt(ds, eS, eK) : NaN;
  const fills: VFill[] = filled
    ? [{ s: eS, k: eK, t: t1, raw, price: raw, partial: false, f: 1, reason: 'phantom (never funded when consistent)' }]
    : [];

  return {
    book: bookId('G', sd.symbol),
    id,
    kind,
    dS: s,
    dT: t,
    dPrice: price,
    eS: filled ? eS : -1,
    eK: filled ? eK : -1,
    eT: t1,
    eRaw: raw,
    ePrice: raw,
    fills,
    open: false,
    vNet: 0,
    vInterest: 0
  };
};

export const lifeBookOf = (
  sd: SymDoor,
  window: { from: string; to: string },
  config: GrowthConfig,
  mode: Mode,
  ask: Ask,
  options: { friction?: Friction; costBps?: number } = {}
): LifeBook => {
  const c = options.costBps === undefined ? config : { ...config, costBpsPerSide: options.costBps };
  const params = growthParamsOf(c, sd.symbol, window);
  const { simulation: sim } = simulateGrowthLife(sd, params, mode, ask, { friction: options.friction });
  const ds = sd.ds;
  const id = bookId('G', sd.symbol);
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
      book: id,
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
  // orders committed but never filled by the door's end (they still reserved capital at their decision); a refused
  // request's trade object (allocator 'refused') never was an order
  for (const e of sim.log.entries) {
    const trade = (e as { trade?: VirtualTrade | null }).trade;

    if (trade && trade.entryIndex < 0 && trade.allocator !== 'refused') add(trade);
  }

  // the phantom records (L1/L2): refused requests and waiting reassessments
  let phantoms = 0;

  for (const r of sim.life?.requests ?? [])
    if (r.outcome !== 'granted')
      trades.push(phantomOf(sd, PHANTOM_ID + ++phantoms, `${r.outcome}:${r.kind}:${r.setupKind}`, r.s, r.t, r.price));

  trades.sort((a, b) => a.dT - b.dT || a.id - b.id);

  for (let i = 1; i < trades.length; i++)
    if (trades[i]!.dT <= trades[i - 1]!.dT) throw new Error(`${id}: requests are not strictly ordered`);

  const last = sim.daily.at(-1);

  return {
    book: id,
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
    },
    life: sim.life,
    simulation: sim
  };
};

export const isPhantom = (t: Pick<VTrade, 'id'>) => t.id > PHANTOM_ID;
