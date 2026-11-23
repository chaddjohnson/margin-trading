// The Growth book with the S1 staged trailing stop (staged-stop@1, research/vg-l0-staged-stop/RULE_SPECIFICATION.md):
// Priority 3's simulateGrowth / runGrowthBook (src/vg-d1-growth-joint/books.ts — a registered, frozen legacy runner
// directory that is never edited) copied statement for statement, with ONE addition: the Growth engine revision 1.5.0
// option `staged` passed to simulateTrading, the book key's staged suffix and the counters. With `staged` absent the
// result equals runGrowthBook's exactly (tests/growth.test.ts); the pooled runner (run.ts) uses runGrowthBook itself for
// every book whose stage is OFF, so this copy runs only for an ON book.
import { scanRiseFromRecentLow } from '../entry-signals/riseFromRecentLow.ts';
import type { BookSettings, VirtualTrade } from '../multi-etf-allocator/shadow.ts';
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
import { type StagedBookConfig, bookKeySuffix } from '../staged-stop/config.ts';
import type { StagedLite, StagedRow } from '../staged-stop/tracker.ts';

const EMPTY_SCAN = { signals: [], evaluableBars: 0, barsAtOrAboveThreshold: 0 };

// runRiseTrading (warm-up 0: 2016-01-04 is the files' first session) on the door's cached Dataset and bars of one
// symbol, with an optional friction override (rate / stop fill / slippage are the book settings both the exits and the
// accounting read; the cost is the configuration's own costBpsPerSide).
export const simulateGrowthStaged = (
  sd: SymDoor,
  params: RiseTradingParams,
  options: {
    friction?: Friction;
    recordMinuteMarks?: boolean;
    staged?: StagedBookConfig | null;
    stagedDetail?: boolean;
  } = {}
): { simulation: Simulation; decisions: number } => {
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
    recordMinuteMarks: options.recordMinuteMarks,
    entryMethod: method,
    rules:
      params.initialStop || params.retention
        ? { initialStop: params.initialStop ?? null, retention: params.retention ?? null }
        : null,
    drawdown: params.drawdownGate ?? null,
    ...(options.staged ? { staged: options.staged, stagedDetail: options.stagedDetail === true } : {}) // the one addition
  });

  return { simulation, decisions: decisions.length };
};

export const runGrowthBookStaged = (
  sd: SymDoor,
  window: { from: string; to: string },
  config: GrowthConfig,
  options: { friction?: Friction; costBps?: number; staged?: StagedBookConfig | null; stagedDetail?: boolean } = {}
): VBook & { staged?: StagedLite; stagedRows?: StagedRow[] } => {
  const c = options.costBps === undefined ? config : { ...config, costBpsPerSide: options.costBps };
  const params = growthParamsOf(c, sd.symbol, window);
  const { simulation: sim } = simulateGrowthStaged(sd, params, {
    friction: options.friction,
    ...(options.staged ? { staged: options.staged, stagedDetail: options.stagedDetail === true } : {})
  });
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
  // orders committed but never filled by the door's end (they still reserved capital at their decision)
  for (const e of sim.log.entries) {
    const trade = (e as { trade?: VirtualTrade | null }).trade;

    if (trade && trade.entryIndex < 0) add(trade);
  }

  trades.sort((a, b) => a.dT - b.dT || a.id - b.id);

  for (let i = 1; i < trades.length; i++)
    if (trades[i]!.dT <= trades[i - 1]!.dT) throw new Error(`${id}: decisions are not strictly ordered`);

  const last = sim.daily.at(-1);

  return {
    book: id,
    key: `${growthKeyOf(c)}${bookKeySuffix(options.staged)}`,
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
    ...(sim.staged ? { staged: sim.staged.lite(), ...(sim.staged.rows ? { stagedRows: sim.staged.rows } : {}) } : {})
  };
};
