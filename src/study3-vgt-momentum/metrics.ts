// Summary statistics of one run (PROTOCOL.md §3, §8 archive fields, §10 outputs). Pure functions of a RunResult and
// its Dataset; nothing here changes a decision.
import type { Dataset } from '../four-family/data.ts';
import type { RunResult, Trade } from './engine.ts';

export interface Summary {
  net: number; // liquidation-equivalent at the horizon
  priceGain: number;
  interest: number;
  friction: number;
  realized: number;
  unrealized: number;
  lots: number;
  closed: number;
  open: number;
  campaigns: number; // entries with no live campaign (first lots only)
  reentries: number;
  yearsHeld: number; // distinct calendar years with a lot held at a close
  minuteDrawdown: number;
  minuteDrawdownPeak: number;
  minuteDrawdownTrough: number;
  dailyDrawdown: number;
  exposureSessions: number; // share of sessions with a lot at the close
  exposureMinutes: number;
  borrowedDollarDays: number;
  worstLot: number;
  bestLot: number;
  worstMaePct: number;
  bestMfePct: number;
  holdMean: number;
  holdMedian: number;
  holdMax: number;
  profitFactor: number;
  netPerDollarDay: number;
  topLotShare: number; // the largest lot's share of net (net > 0), else NaN
  exitMix: Record<string, number>;
  entryMix: Record<string, number>;
  pathHash: string;
}

export const median = (values: number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

// Sessions at whose close the lot was held: entry..exit-1 (to the horizon when open).
export const heldCloses = (trade: Trade, end: number) => {
  const last = trade.exitIndex < 0 ? end : trade.exitIndex - 1;

  return last >= trade.entryIndex ? { first: trade.entryIndex, last } : undefined;
};

export const summarise = (ds: Dataset, run: RunResult, firstIndex: number, endIndex: number): Summary => {
  const trades = run.trades;
  const years = new Set<string>();
  const exitMix: Record<string, number> = {};
  const entryMix: Record<string, number> = {};
  const holds: number[] = [];
  let priceGain = 0;
  let interest = 0;
  let friction = 0;
  let positive = 0;
  let negative = 0;
  let worstLot = Infinity;
  let bestLot = -Infinity;
  let worstMae = Infinity;
  let bestMfe = -Infinity;
  let campaigns = 0;
  let reentries = 0;
  let unrealized = 0;

  for (const trade of trades) {
    priceGain += trade.priceGain;
    interest += trade.interest;
    friction += trade.friction;
    worstLot = Math.min(worstLot, trade.net);
    bestLot = Math.max(bestLot, trade.net);
    worstMae = Math.min(worstMae, trade.maeLow / trade.entryRaw - 1);
    bestMfe = Math.max(bestMfe, trade.mfeHigh / trade.entryRaw - 1);

    if (trade.net > 0) {
      positive += trade.net;
    } else {
      negative += trade.net;
    }

    exitMix[trade.exitReason] = (exitMix[trade.exitReason] ?? 0) + 1;

    if (trade.tranche === 0) {
      entryMix[trade.rule] = (entryMix[trade.rule] ?? 0) + 1;

      if (trade.kind === 'first') {
        campaigns++;
      } else {
        reentries++;
      }
    }

    if (trade.exitIndex >= 0) {
      holds.push(trade.sessionsHeld);
    } else {
      unrealized += trade.net;
    }

    const held = heldCloses(trade, endIndex);

    if (held) {
      for (let s = held.first; s <= held.last; s++) {
        years.add(ds.dates[s]!.slice(0, 4));
      }
    }
  }

  const net = run.endLiquidation;
  const sessions = endIndex - firstIndex + 1;
  const top = trades.length ? Math.max(...trades.map((trade) => trade.net)) : NaN;

  return {
    net,
    priceGain,
    interest,
    friction,
    realized: run.realized,
    unrealized,
    lots: trades.length,
    closed: trades.filter((trade) => trade.exitIndex >= 0).length,
    open: trades.filter((trade) => trade.exitIndex < 0).length,
    campaigns,
    reentries,
    yearsHeld: years.size,
    minuteDrawdown: run.minuteDrawdown.maximum,
    minuteDrawdownPeak: run.minuteDrawdown.peakTime,
    minuteDrawdownTrough: run.minuteDrawdown.troughTime,
    dailyDrawdown: run.dailyDrawdown.maximum,
    exposureSessions: run.investedSessions / sessions,
    exposureMinutes: run.totalMinutes > 0 ? run.investedMinutes / run.totalMinutes : 0,
    borrowedDollarDays: run.borrowedDollarDays,
    worstLot: trades.length ? worstLot : 0,
    bestLot: trades.length ? bestLot : 0,
    worstMaePct: trades.length ? worstMae : 0,
    bestMfePct: trades.length ? bestMfe : 0,
    holdMean: holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : NaN,
    holdMedian: median(holds),
    holdMax: holds.length ? Math.max(...holds) : NaN,
    profitFactor: negative < 0 ? positive / -negative : positive > 0 ? Infinity : NaN,
    netPerDollarDay: run.borrowedDollarDays > 0 ? net / run.borrowedDollarDays : NaN,
    topLotShare: net > 0 ? top / net : NaN,
    exitMix,
    entryMix,
    pathHash: run.pathHash
  };
};

// A compact, serialisable trade row for ledgers.
export const tradeRow = (ds: Dataset, trade: Trade) => ({
  id: trade.id,
  campaign: trade.campaign,
  kind: trade.kind,
  rule: trade.rule,
  tranche: trade.tranche,
  entryDate: ds.dates[trade.entryIndex]!,
  entryIndex: trade.entryIndex,
  entryBar: trade.entryBar,
  entryTime: trade.entryTime,
  entryRaw: trade.entryRaw,
  entryPrice: trade.entryPrice,
  shares: trade.shares,
  principal: trade.principal,
  exitDate: trade.exitIndex >= 0 ? ds.dates[trade.exitIndex]! : null,
  exitIndex: trade.exitIndex,
  exitBar: trade.exitBar,
  exitTime: trade.exitTime,
  exitRaw: trade.exitRaw,
  exitPrice: trade.exitPrice,
  exitReason: trade.exitReason,
  stopComponent: trade.stopComponent,
  stopLevel: trade.stopLevel,
  priceGain: trade.priceGain,
  friction: trade.friction,
  interest: trade.interest,
  net: trade.net,
  sessionsHeld: trade.sessionsHeld,
  calendarDays: trade.calendarDays,
  maePct: trade.maeLow / trade.entryRaw - 1,
  mfePct: trade.mfeHigh / trade.entryRaw - 1,
  maeDollars: trade.shares * (trade.maeLow - trade.entryRaw),
  highClose: trade.highClose
});

export type TradeRow = ReturnType<typeof tradeRow>;
