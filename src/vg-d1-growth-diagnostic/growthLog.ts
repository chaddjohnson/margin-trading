// The Growth book's own decision log, read without changing anything (PROTOCOL.md §5.2).
//
// `simulateGrowthWith` is books.ts `simulateGrowth` (the function every Priority 3 Growth book is built from) with one
// addition: the base decision list may be filtered. Unfiltered, it is the same call on the same inputs, and the
// observer checks that its trades equal the pooled run's virtual book trade for trade. Filtered to ONE base decision,
// it answers a completed-data question only: at that decision's own instant, with the book flat and nothing pending,
// do its entry gates (trend filter, Drawdown Recovery Gate) pass? Both gates and both scanners read prices only, so the
// answer does not depend on the book's earlier trades; eligibility opportunities and continuation windows do, and
// anything that needs them is reported as unresolved. It never books a fill or a profit for the pool.
import { scanRiseFromRecentLow } from '../entry-signals/riseFromRecentLow.ts';
import type { GateRuntime } from '../growth-trading/entryGates.ts';
import { scanTrendBreakout } from '../growth-trading/optionalRules.ts';
import {
  type EntryDecision,
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
import type { BookSettings } from '../multi-etf-allocator/shadow.ts';
import type { Friction, VBook } from '../vg-d1-growth-joint/books.ts';
import { resolution } from '../vg-d1-growth-joint/context.ts';
import type { SymDoor } from '../vg-d1-growth-joint/data.ts';

const EMPTY_SCAN = { signals: [], evaluableBars: 0, barsAtOrAboveThreshold: 0 };

export interface GrowthRun {
  simulation: Simulation;
  decisions: EntryDecision[]; // the complete base decision list (before any filter)
  rise: ReturnType<typeof scanRiseFromRecentLow> | null;
  breakout: ReturnType<typeof scanTrendBreakout> | null;
}

export const simulateGrowthWith = (
  sd: SymDoor,
  params: RiseTradingParams,
  options: { friction?: Friction; keep?: (d: EntryDecision) => boolean } = {}
): GrowthRun => {
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
  const all = breakout ? decisionsFromBreakout(breakout.signals) : decisionsFromSignals(bars, scan.signals);
  const decisions = options.keep ? all.filter(options.keep) : all;
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
  });

  return {
    simulation,
    decisions: all,
    rise: method === 'rise_from_recent_low' ? (scan as ReturnType<typeof scanRiseFromRecentLow>) : null,
    breakout
  };
};

// The observer's run must be the pooled run's book: the same decisions, fills, exits and nets, trade for trade.
export const sameBook = (run: GrowthRun, book: VBook) => {
  const sim = run.simulation;
  const filled = [...sim.trades].sort((a, b) => a.decisionTime - b.decisionTime);
  const vFilled = book.trades.filter((t) => t.eS >= 0);

  if (filled.length !== vFilled.length) return `trades ${filled.length} ≠ ${vFilled.length}`;

  for (let i = 0; i < filled.length; i++) {
    const a = filled[i]!;
    const b = vFilled[i]!;

    if (
      a.decisionTime !== b.dT ||
      a.entryIndex !== b.eS ||
      a.entryTime !== b.eT ||
      a.entryPrice !== b.ePrice ||
      a.net !== b.vNet ||
      (a.exitIndex >= 0 && b.fills.at(-1)?.t !== a.exitTime)
    )
      return `trade ${i} (${a.id}) differs`;
  }

  return null;
};
