// Track I: D1 / swing-low position overlap and signal concurrency from the two standalone runs on the same data and
// eligibility (PROTOCOL.md §3). Positions are minute intervals from the fill's minute to the exit's minute; signals
// are the standalone fills (a standalone fill is a confirmed rebound that was executable). The hypothetical exit
// under the other strategy's rules is the T1/T2 transfer replay from the second strategy's decision minute.
import type { Lot } from './account.ts';
import type { ProgramData } from './data.ts';
import { type ScenarioResult, formatTime } from './engine.ts';
import { formatDate } from './metrics.ts';
import { replayTransfer } from './replay.ts';
import { type StrategyKey, interestOn, strategies } from './strategy.ts';

export interface OverlapRecord extends Record<string, unknown> {
  pair: number;
  first: StrategyKey;
  first_lot: number;
  first_entry: string;
  first_entry_price: number;
  first_exit: string;
  first_exit_price: number;
  first_reason: string;
  first_net_100k: number;
  second: StrategyKey;
  second_lot: number;
  second_entry: string;
  second_entry_price: number;
  second_exit: string;
  second_exit_price: number;
  second_reason: string;
  second_net_100k: number;
  overlap_start: string;
  overlap_end: string;
  overlap_minutes: number;
  overlap_sessions: number;
  first_net_at_second_entry: number; // the first lot's net (per $100k) at the second's decision price
  joint_mark_min: number; // most negative sum of both lots' marks during the overlap (per $100k each)
  joint_mark_max: number;
  transfer_T1_exit: string;
  transfer_T1_price: number;
  transfer_T1_reason: string;
  transfer_T1_net: number;
  transfer_T2_exit: string;
  transfer_T2_price: number;
  transfer_T2_reason: string;
  transfer_T2_net: number;
  transfer_note: string;
}

export interface CompetingSignal extends Record<string, unknown> {
  signal_strategy: StrategyKey;
  signal_lot: number;
  signal_time: string;
  signal_date: string;
  signal_price: number;
  signal_kind: string;
  holder: StrategyKey;
  holder_lot: number;
  holder_entry: string;
  holder_exit: string;
  holder_net_at_signal: number;
  holder_eventual_net: number;
  signal_standalone_net: number;
  signal_standalone_exit: string;
}

export interface OverlapSummary {
  eligibility: string;
  d1: { trades: number; investedMinutes: number; investedSessions: number };
  swing: { trades: number; investedMinutes: number; investedSessions: number };
  overlappingPairs: number;
  d1LotsWithOverlap: number;
  swingLotsWithOverlap: number;
  concurrentMinutes: number;
  concurrentSessions: number;
  shareOfD1Time: number;
  shareOfSwingTime: number;
  longestOverlapMinutes: number;
  longestOverlapSessions: number;
  d1SignalsWhileSwingOpen: number;
  swingSignalsWhileD1Open: number;
  d1ArmingsWhileSwingOpen: number;
  swingArmingsWhileD1Open: number;
  identicalEntries: number;
  d1EntriesWithSwingEntryWithin20Sessions: number;
  swingEntriesWithD1EntryWithin20Sessions: number;
  dailyPnlCorrelation: number;
  bothInDrawdownSessions: number; // sessions on which both standalone marks were below their running peaks
}

const minutesBetween = (data: ProgramData, start: number, end: number) => {
  // Regular-session VGT minutes with start ≤ time < end.
  const { ds } = data;
  let count = 0;

  for (let b = 0; b < ds.barCount; b++) {
    const time = ds.bTime[b]!;

    if (time >= start && time < end) {
      count++;
    }
  }

  return count;
};

const sessionsBetween = (data: ProgramData, start: number, end: number) => {
  const { ds } = data;
  let count = 0;

  for (let s = 0; s < ds.sessionCount; s++) {
    if (ds.sCloseTime[s]! >= start && ds.sTime[s]! <= end) {
      count++;
    }
  }

  return count;
};

const endTime = (data: ProgramData, lot: Lot, endIndex: number) =>
  lot.exitIndex >= 0 ? lot.exitTime : data.ds.sCloseTime[endIndex]!;

const markAt = (lot: Lot, price: number, sessionTime: number, rate: number) =>
  lot.shares * price - lot.principal - interestOn(lot, rate, sessionTime);

export const analyzeOverlap = (data: ProgramData, d1: ScenarioResult, swing: ScenarioResult) => {
  const { ds } = data;
  const endIndex = d1.endIndex;
  const rate = d1.config.rate;
  const overlaps: OverlapRecord[] = [];
  const competing: CompetingSignal[] = [];
  const d1Lots = d1.lots;
  const swingLots = swing.lots;
  const d1Params = strategies[d1.config.strategies[0]!];
  const swingParams = strategies.swing;
  let concurrentMinutes = 0;
  let longestMinutes = 0;
  let longestSessions = 0;
  const concurrentSessionSet = new Set<number>();
  const d1WithOverlap = new Set<number>();
  const swingWithOverlap = new Set<number>();

  for (const a of d1Lots) {
    for (const b of swingLots) {
      const aEnd = endTime(data, a, endIndex);
      const bEnd = endTime(data, b, endIndex);
      const start = Math.max(a.entryTime, b.entryTime);
      const end = Math.min(aEnd, bEnd);

      if (!(a.entryTime < bEnd && b.entryTime < aEnd)) {
        continue;
      }

      const [first, second] = a.entryTime <= b.entryTime ? [a, b] : [b, a];
      const firstKey: StrategyKey = first === a ? d1.config.strategies[0]! : 'swing';
      const secondKey: StrategyKey = second === a ? d1.config.strategies[0]! : 'swing';
      const minutes = minutesBetween(data, start, end);
      const sessions = sessionsBetween(data, start, end);

      concurrentMinutes += minutes;
      longestMinutes = Math.max(longestMinutes, minutes);
      longestSessions = Math.max(longestSessions, sessions);
      d1WithOverlap.add(a.id);
      swingWithOverlap.add(b.id);

      for (let s = 0; s < ds.sessionCount; s++) {
        if (ds.sCloseTime[s]! >= start && ds.sTime[s]! <= end) {
          concurrentSessionSet.add(s);
        }
      }

      // Joint marks over the overlapping minutes.
      let jointMin = Infinity;
      let jointMax = -Infinity;

      for (let s = 0; s < ds.sessionCount; s++) {
        if (ds.sCloseTime[s]! < start || ds.sTime[s]! > end) {
          continue;
        }

        const barStart = ds.sBarStart[s]!;
        const count = ds.sBarCount[s]!;

        for (let k = 0; k < count; k++) {
          const time = ds.bTime[barStart + k]!;

          if (time < start || time >= end) {
            continue;
          }

          const price = ds.bClose[barStart + k]!;
          const joint = markAt(a, price, ds.sTime[s]!, rate) + markAt(b, price, ds.sTime[s]!, rate);

          jointMin = Math.min(jointMin, joint);
          jointMax = Math.max(jointMax, joint);
        }
      }

      // The first lot under the second strategy's rules from the second's decision minute.
      const secondParams = secondKey === 'swing' ? swingParams : d1Params;
      const firstParams = firstKey === 'swing' ? swingParams : d1Params;
      const decisionIndex = second.entryIndex;
      const decisionBar = Math.max(0, second.entryBar - 1); // the decision minute precedes the fill's minute
      const entry = {
        entryIndex: first.entryIndex,
        entryBar: first.entryBar,
        entryPrice: first.entryPrice,
        shares: first.shares,
        principal: first.principal,
        entryTimestamp: first.entryTimestamp
      };
      const t1 = replayTransfer(
        ds,
        entry,
        firstParams,
        secondParams,
        decisionIndex,
        decisionBar,
        'T1',
        'original',
        rate,
        'stop',
        endIndex
      );
      const t2 = replayTransfer(
        ds,
        entry,
        firstParams,
        secondParams,
        decisionIndex,
        decisionBar,
        'T2',
        'original',
        rate,
        'stop',
        endIndex
      );
      const describe = (replay: typeof t1) =>
        'after' in replay && replay.after
          ? {
              exit: replay.after.exitIndex >= 0 ? ds.dates[replay.after.exitIndex]! : 'open',
              price: replay.after.exitPrice,
              reason: replay.after.reason,
              net: replay.after.net
            }
          : {
              exit: replay.before ? ds.dates[replay.before.exitIndex]! : '',
              price: replay.before?.exitPrice ?? NaN,
              reason: replay.before ? `${replay.before.reason} (before the transfer)` : '',
              net: replay.before?.net ?? NaN
            };
      const d1t1 = describe(t1);
      const d1t2 = describe(t2);

      overlaps.push({
        pair: overlaps.length + 1,
        first: firstKey,
        first_lot: first.id,
        first_entry: formatTime(first.entryTime),
        first_entry_price: first.entryPrice,
        first_exit: first.exitIndex >= 0 ? formatTime(first.exitTime) : 'open',
        first_exit_price: first.exitIndex >= 0 ? first.exitPrice : NaN,
        first_reason: first.exitReason,
        first_net_100k: first.netProfit,
        second: secondKey,
        second_lot: second.id,
        second_entry: formatTime(second.entryTime),
        second_entry_price: second.entryPrice,
        second_exit: second.exitIndex >= 0 ? formatTime(second.exitTime) : 'open',
        second_exit_price: second.exitIndex >= 0 ? second.exitPrice : NaN,
        second_reason: second.exitReason,
        second_net_100k: second.netProfit,
        overlap_start: formatTime(start),
        overlap_end: formatTime(end),
        overlap_minutes: minutes,
        overlap_sessions: sessions,
        first_net_at_second_entry: markAt(first, second.decisionPrice, ds.sTime[second.entryIndex]!, rate),
        joint_mark_min: Number.isFinite(jointMin) ? jointMin : NaN,
        joint_mark_max: Number.isFinite(jointMax) ? jointMax : NaN,
        transfer_T1_exit: d1t1.exit,
        transfer_T1_price: d1t1.price,
        transfer_T1_reason: d1t1.reason,
        transfer_T1_net: d1t1.net,
        transfer_T2_exit: d1t2.exit,
        transfer_T2_price: d1t2.price,
        transfer_T2_reason: d1t2.reason,
        transfer_T2_net: d1t2.net,
        transfer_note: `${firstKey} lot managed by ${secondKey}'s exit rules from ${ds.dates[decisionIndex]} (the second's decision minute); no new principal`
      });

      // The second's entry is a signal while the first holds.
      competing.push({
        signal_strategy: secondKey,
        signal_lot: second.id,
        signal_time: formatTime(second.decisionTime),
        signal_date: ds.dates[second.entryIndex]!,
        signal_price: second.decisionPrice,
        signal_kind: second.setupKind,
        holder: firstKey,
        holder_lot: first.id,
        holder_entry: formatDate(first.entryTimestamp),
        holder_exit: first.exitIndex >= 0 ? ds.dates[first.exitIndex]! : 'open',
        holder_net_at_signal: markAt(first, second.decisionPrice, ds.sTime[second.entryIndex]!, rate),
        holder_eventual_net: first.netProfit,
        signal_standalone_net: second.netProfit,
        signal_standalone_exit: second.exitIndex >= 0 ? ds.dates[second.exitIndex]! : 'open'
      });
    }
  }

  // Armings while the other holds.
  const openAt = (lots: Lot[], time: number) =>
    lots.some((lot) => lot.entryTime <= time && time < endTime(data, lot, endIndex));
  const d1Setups = d1.machines[0]?.setupLog ?? [];
  const swingSetups = swing.machines[0]?.setupLog ?? [];
  const d1ArmingsWhileSwingOpen = d1Setups.filter((setup) => openAt(swingLots, setup.activationTime)).length;
  const swingArmingsWhileD1Open = swingSetups.filter((setup) => openAt(d1Lots, setup.activationTime)).length;
  const d1SignalsWhileSwingOpen = d1Lots.filter((lot) => openAt(swingLots, lot.decisionTime)).length;
  const swingSignalsWhileD1Open = swingLots.filter((lot) => openAt(d1Lots, lot.decisionTime)).length;
  const identicalEntries = d1Lots.filter((lot) =>
    swingLots.some((other) => other.entryIndex === lot.entryIndex && other.entryBar === lot.entryBar)
  ).length;
  const near = (lots: Lot[], others: Lot[]) =>
    lots.filter((lot) => others.some((other) => Math.abs(other.entryIndex - lot.entryIndex) <= 20)).length;

  // Daily P&L correlation and joint drawdowns of the two standalone marks.
  const d1Marks = d1.daily.map((row) => row.strategyMark);
  const swingMarks = swing.daily.map((row) => row.strategyMark);
  const changes = (marks: number[]) => marks.slice(1).map((mark, index) => mark - marks[index]!);
  const x = changes(d1Marks);
  const y = changes(swingMarks);
  const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;

  x.forEach((value, index) => {
    sxy += (value - mx) * (y[index]! - my);
    sxx += (value - mx) ** 2;
    syy += (y[index]! - my) ** 2;
  });

  let peakA = -Infinity;
  let peakB = -Infinity;
  let bothInDrawdown = 0;

  d1Marks.forEach((mark, index) => {
    peakA = Math.max(peakA, mark);
    peakB = Math.max(peakB, swingMarks[index]!);

    if (mark < peakA - 1 && swingMarks[index]! < peakB - 1) {
      bothInDrawdown++;
    }
  });

  const invested = (lots: Lot[]) => ({
    trades: lots.length,
    investedMinutes: lots.reduce(
      (total, lot) => total + minutesBetween(data, lot.entryTime, endTime(data, lot, endIndex)),
      0
    ),
    investedSessions: lots.reduce(
      (total, lot) => total + sessionsBetween(data, lot.entryTime, endTime(data, lot, endIndex)),
      0
    )
  });
  const d1Invested = invested(d1Lots);
  const swingInvested = invested(swingLots);
  const summary: OverlapSummary = {
    eligibility: ds.dates[d1.config.eligibilityIndex]!,
    d1: d1Invested,
    swing: swingInvested,
    overlappingPairs: overlaps.length,
    d1LotsWithOverlap: d1WithOverlap.size,
    swingLotsWithOverlap: swingWithOverlap.size,
    concurrentMinutes,
    concurrentSessions: concurrentSessionSet.size,
    shareOfD1Time: d1Invested.investedMinutes ? concurrentMinutes / d1Invested.investedMinutes : 0,
    shareOfSwingTime: swingInvested.investedMinutes ? concurrentMinutes / swingInvested.investedMinutes : 0,
    longestOverlapMinutes: longestMinutes,
    longestOverlapSessions: longestSessions,
    d1SignalsWhileSwingOpen,
    swingSignalsWhileD1Open,
    d1ArmingsWhileSwingOpen,
    swingArmingsWhileD1Open,
    identicalEntries,
    d1EntriesWithSwingEntryWithin20Sessions: near(d1Lots, swingLots),
    swingEntriesWithD1EntryWithin20Sessions: near(swingLots, d1Lots),
    dailyPnlCorrelation: sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN,
    bothInDrawdownSessions: bothInDrawdown
  };

  return { overlaps, competing, summary };
};
