// The minute data for the VGT minute optimizer: the CSV is loaded once with the repository's verified
// loader (loadCsvMinuteBacktestData) and session grouping (groupMarketSessions), then turned into an
// immutable, typed-array index of everything that doesn't depend on a candidate's parameters. The arrays
// live on SharedArrayBuffers, so worker threads read the same memory instead of copies.
//
// Precomputed per session, each exactly as src/app/allIn.ts computes it:
// - the decision price: the close of the last minute completed one minute before the scheduled close;
// - the entry fill: the first trade at or after the decision (the open of the first minute starting at or
//   after it, else the closing print, else none), and the post-entry high that seeds the stop after an
//   entry (the fill, the session's close and the highs of the fill's minute onwards);
// - the maximum-hold fill: the first trade at or after one minute after the session's first minute;
// - for the minute-sampled mark to market: prefix minimum, maximum and largest peak-to-trough fall of the
//   marks (each minute's close, then the official close) over the session's first k marks, and the same
//   statistics over the marks from the entry fill's minute onwards.
// Per minute: the stop trigger key min(open, low) as a running minimum within the session, so the first
// minute that reaches a stop is found by binary search, and the next observed trade after each minute (the
// `next-open` stop fill).
//
// Nothing here looks ahead: every value is either a fact about a minute that a rule reads at or after that
// minute, or a session aggregate (high, close) that the original also only uses after the session.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import type { MarketSession } from '#types';

const secondsPerMinute = 60;

// Execution price sources, as codes; the labels are the original's ExecutionPrice strings.
export const executionLabels = [
  '',
  'first trade after decision',
  'closing print',
  'opening trade',
  'stop level',
  'minute open through stop',
  'trigger minute close'
] as const;

export const Execution = {
  none: 0,
  firstTradeAfterDecision: 1,
  closingPrint: 2,
  openingTrade: 3,
  stopLevel: 4,
  minuteOpenThroughStop: 5,
  triggerMinuteClose: 6
} as const;

export interface MinuteDataset {
  id: string; // symbol, data hash and last session
  symbol: string;
  dataHash: string;
  firstDate: string;
  lastDate: string;
  sessionCount: number;
  barCount: number;
  dates: string[];
  // Per session.
  sTime: Float64Array; // midnight UTC of the New York date, as MarketSession.time
  sCloseTime: Float64Array;
  sOpen: Float64Array;
  sHigh: Float64Array;
  sLow: Float64Array;
  sClose: Float64Array;
  sYear: Int16Array;
  sEarlyClose: Uint8Array;
  sBarStart: Int32Array; // first minute's index in the per-minute arrays
  sBarCount: Int32Array;
  sMarkStart: Int32Array; // first index in the mark prefix arrays (barCount + 2 entries per session)
  decisionPrice: Float64Array; // NaN without a completed minute before the decision
  entryFillPrice: Float64Array; // NaN without any trade after the decision
  entryFillBar: Int32Array; // the minute's index, barCount for the closing print, -1 for none
  entryFillExec: Uint8Array;
  entryPostHigh: Float64Array;
  entrySegMin: Float64Array; // marks from the entry fill's minute to the close
  entrySegMax: Float64Array;
  entrySegDrop: Float64Array;
  holdFillPrice: Float64Array; // NaN without a trade after the first minute
  holdFillBar: Int32Array;
  holdFillExec: Uint8Array;
  // Per minute (regular-session minutes only, in session order).
  bTime: Float64Array;
  bOpen: Float64Array;
  bClose: Float64Array;
  bTriggerMin: Float64Array; // running min of min(open, low) within the session
  bNextPrice: Float64Array; // the next observed trade after the minute, NaN for none
  bNextBar: Int32Array;
  bNextExec: Uint8Array;
  // Per session, k = 0..barCount+1 marks from the session's start.
  mPrefMin: Float64Array;
  mPrefMax: Float64Array;
  mPrefDrop: Float64Array;
}

const sharedFloat64 = (length: number) => new Float64Array(new SharedArrayBuffer(Math.max(1, length) * 8));
const sharedInt32 = (length: number) => new Int32Array(new SharedArrayBuffer(Math.max(1, length) * 4));
const sharedInt16 = (length: number) => new Int16Array(new SharedArrayBuffer(Math.max(1, length) * 2));
const sharedUint8 = (length: number) => new Uint8Array(new SharedArrayBuffer(Math.max(1, length)));

export const sha256File = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

export const defaultDataFile = 'data/VGT/VGT-2016-2025-1-minute.csv';

// Loads and groups the whole file, exactly as allIn.ts does.
export const loadSessions = async (file = defaultDataFile, symbol = 'VGT') =>
  groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));

// The original's firstTradeFrom over typed arrays: the open of the first minute starting at or after
// `time`, else the closing print, else none.
const firstTradeFrom = (session: MarketSession, time: number) => {
  let low = 0;
  let high = session.bars.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (session.bars[middle]!.time >= time) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  const bar = session.bars[low];

  if (bar) {
    return { price: bar.open, barIndex: low, execution: Execution.firstTradeAfterDecision };
  }

  if (session.closingPrint !== undefined) {
    return { price: session.closingPrint, barIndex: session.bars.length, execution: Execution.closingPrint };
  }

  return undefined;
};

export const buildDataset = (sessions: MarketSession[], symbol: string, dataHash: string): MinuteDataset => {
  const sessionCount = sessions.length;
  const barCount = sessions.reduce((total, session) => total + session.bars.length, 0);
  const markCount = barCount + 2 * sessionCount;
  const ds: MinuteDataset = {
    id: `${symbol}:${dataHash.slice(0, 16)}:${sessions.at(-1)?.date ?? ''}`,
    symbol,
    dataHash,
    firstDate: sessions[0]?.date ?? '',
    lastDate: sessions.at(-1)?.date ?? '',
    sessionCount,
    barCount,
    dates: sessions.map((session) => session.date),
    sTime: sharedFloat64(sessionCount),
    sCloseTime: sharedFloat64(sessionCount),
    sOpen: sharedFloat64(sessionCount),
    sHigh: sharedFloat64(sessionCount),
    sLow: sharedFloat64(sessionCount),
    sClose: sharedFloat64(sessionCount),
    sYear: sharedInt16(sessionCount),
    sEarlyClose: sharedUint8(sessionCount),
    sBarStart: sharedInt32(sessionCount),
    sBarCount: sharedInt32(sessionCount),
    sMarkStart: sharedInt32(sessionCount),
    decisionPrice: sharedFloat64(sessionCount),
    entryFillPrice: sharedFloat64(sessionCount),
    entryFillBar: sharedInt32(sessionCount),
    entryFillExec: sharedUint8(sessionCount),
    entryPostHigh: sharedFloat64(sessionCount),
    entrySegMin: sharedFloat64(sessionCount),
    entrySegMax: sharedFloat64(sessionCount),
    entrySegDrop: sharedFloat64(sessionCount),
    holdFillPrice: sharedFloat64(sessionCount),
    holdFillBar: sharedInt32(sessionCount),
    holdFillExec: sharedUint8(sessionCount),
    bTime: sharedFloat64(barCount),
    bOpen: sharedFloat64(barCount),
    bClose: sharedFloat64(barCount),
    bTriggerMin: sharedFloat64(barCount),
    bNextPrice: sharedFloat64(barCount),
    bNextBar: sharedInt32(barCount),
    bNextExec: sharedUint8(barCount),
    mPrefMin: sharedFloat64(markCount),
    mPrefMax: sharedFloat64(markCount),
    mPrefDrop: sharedFloat64(markCount)
  };
  let barOffset = 0;
  let markOffset = 0;

  sessions.forEach((session, s) => {
    const bars = session.bars;
    const count = bars.length;

    if (count === 0) {
      throw new Error(`Session ${session.date} has no regular-session minute`);
    }

    ds.sTime[s] = session.time;
    ds.sCloseTime[s] = session.closeTime;
    ds.sOpen[s] = session.open;
    ds.sHigh[s] = session.high;
    ds.sLow[s] = session.low;
    ds.sClose[s] = session.close;
    ds.sYear[s] = Number(session.date.slice(0, 4));
    ds.sEarlyClose[s] = session.isEarlyClose ? 1 : 0;
    ds.sBarStart[s] = barOffset;
    ds.sBarCount[s] = count;
    ds.sMarkStart[s] = markOffset;

    // The decision: the last minute that has completed one minute before the scheduled close.
    const decisionTime = session.closeTime - secondsPerMinute;
    const decisionBar = bars.findLast((bar) => bar.time + secondsPerMinute <= decisionTime);

    ds.decisionPrice[s] = decisionBar?.close ?? NaN;

    const entryFill = firstTradeFrom(session, decisionTime);
    const marks = [...bars.map((bar) => bar.close), session.close];

    if (entryFill) {
      ds.entryFillPrice[s] = entryFill.price;
      ds.entryFillBar[s] = entryFill.barIndex;
      ds.entryFillExec[s] = entryFill.execution;

      const laterBars = bars.slice(entryFill.barIndex);

      ds.entryPostHigh[s] = Math.max(entryFill.price, session.close, ...laterBars.map((bar) => bar.high));

      let segMin = Infinity;
      let segMax = -Infinity;
      let segDrop = 0;

      for (let k = entryFill.barIndex; k < marks.length; k++) {
        const mark = marks[k]!;

        segMax = Math.max(segMax, mark);
        segMin = Math.min(segMin, mark);
        segDrop = Math.max(segDrop, segMax - mark);
      }

      ds.entrySegMin[s] = segMin;
      ds.entrySegMax[s] = segMax;
      ds.entrySegDrop[s] = segDrop;
    } else {
      ds.entryFillPrice[s] = NaN;
      ds.entryFillBar[s] = -1;
      ds.entryFillExec[s] = Execution.none;
      ds.entryPostHigh[s] = NaN;
      ds.entrySegMin[s] = NaN;
      ds.entrySegMax[s] = NaN;
      ds.entrySegDrop[s] = NaN;
    }

    const holdFill = firstTradeFrom(session, bars[0]!.time + secondsPerMinute);

    ds.holdFillPrice[s] = holdFill?.price ?? NaN;
    ds.holdFillBar[s] = holdFill?.barIndex ?? -1;
    ds.holdFillExec[s] = holdFill?.execution ?? Execution.none;

    let triggerMin = Infinity;

    bars.forEach((bar, b) => {
      const index = barOffset + b;
      const next = firstTradeFrom(session, bar.time + secondsPerMinute);

      triggerMin = Math.min(triggerMin, bar.open, bar.low);
      ds.bTime[index] = bar.time;
      ds.bOpen[index] = bar.open;
      ds.bClose[index] = bar.close;
      ds.bTriggerMin[index] = triggerMin;
      ds.bNextPrice[index] = next?.price ?? NaN;
      ds.bNextBar[index] = next?.barIndex ?? -1;
      ds.bNextExec[index] = next?.execution ?? Execution.none;
    });

    let prefMin = Infinity;
    let prefMax = -Infinity;
    let prefDrop = 0;

    ds.mPrefMin[markOffset] = prefMin;
    ds.mPrefMax[markOffset] = prefMax;
    ds.mPrefDrop[markOffset] = prefDrop;

    marks.forEach((mark, k) => {
      prefMax = Math.max(prefMax, mark);
      prefMin = Math.min(prefMin, mark);
      prefDrop = Math.max(prefDrop, prefMax - mark);
      ds.mPrefMin[markOffset + k + 1] = prefMin;
      ds.mPrefMax[markOffset + k + 1] = prefMax;
      ds.mPrefDrop[markOffset + k + 1] = prefDrop;
    });

    barOffset += count;
    markOffset += count + 2;
  });

  return ds;
};

// The research view: a dataset physically truncated at `researchEnd` (inclusive), so nothing later can be
// read by the search, the selection or the walk-forward. Later sessions are only reachable through the
// locked final evaluation (finalEvaluation.ts).
const researchViews = new WeakSet<MinuteDataset>();

export const researchDataset = (sessions: MarketSession[], dataHash: string, researchEnd: string, symbol = 'VGT') => {
  const dataset = buildDataset(
    sessions.filter((session) => session.date <= researchEnd),
    symbol,
    dataHash
  );

  researchViews.add(dataset);

  return dataset;
};

export const assertResearchView = (dataset: MinuteDataset, researchEnd: string) => {
  if (!researchViews.has(dataset) || dataset.lastDate > researchEnd) {
    throw new Error(`Dataset ${dataset.id} is not a research view ending on or before ${researchEnd}`);
  }
};

let unlockIssued = false;
const unlockTokens = new WeakSet<object>();

// The one capability that can build a dataset beyond the research end. finalEvaluation.ts takes it when it
// is loaded; any second request throws.
export const issueUnlockCapability = () => {
  if (unlockIssued) {
    throw new Error('The final-evaluation unlock capability has already been issued');
  }

  const token = Object.freeze({});

  unlockIssued = true;
  unlockTokens.add(token);

  return token;
};

export const unlockedDataset = (sessions: MarketSession[], dataHash: string, token: object, symbol = 'VGT') => {
  if (!unlockTokens.has(token)) {
    throw new Error('A full-range dataset needs the final-evaluation capability');
  }

  return buildDataset(sessions, symbol, dataHash);
};

// First session index on or after a date, or the session count.
export const firstIndexOnOrAfter = (dataset: MinuteDataset, date: string) => {
  const index = dataset.dates.findIndex((value) => value >= date);

  return index < 0 ? dataset.sessionCount : index;
};

// Last session index on or before a date, or -1.
export const lastIndexOnOrBefore = (dataset: MinuteDataset, date: string) => {
  for (let index = dataset.sessionCount - 1; index >= 0; index--) {
    if (dataset.dates[index]! <= date) {
      return index;
    }
  }

  return -1;
};
