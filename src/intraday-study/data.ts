// Loads the minute file once through the incumbent's own loader and session grouping, and derives the
// session facts that don't depend on a policy's state. Sessions are frozen so that no run can change them.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import type { MarketSession } from '#types';
import { type Fill, firstTradeFrom } from '../app/allIn.ts';
import { type Band, bandOf, incumbent, secondsPerMinute } from './constants.ts';

export interface StudyData {
  file: string;
  hash: string;
  sessions: readonly MarketSession[];
}

export const sha256File = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

const deepFreeze = (sessions: MarketSession[]) => {
  for (const session of sessions) {
    for (const bar of session.bars) {
      Object.freeze(bar);
    }

    Object.freeze(session.bars);
    Object.freeze(session);
  }

  return Object.freeze(sessions);
};

export const loadSessions = async (file: string): Promise<MarketSession[]> =>
  groupMarketSessions(await loadCsvMinuteBacktestData('VGT', file));

export const loadStudyData = async (file: string): Promise<StudyData> => {
  const hash = await sha256File(file);
  const sessions = deepFreeze(await loadSessions(file));

  return { file, hash, sessions };
};

// The highest session high of the previous `tickWindowSize` sessions of the array, as the incumbent's
// Math.max over the window (-Infinity for the first session).
export const computeRecentHighs = (sessions: readonly MarketSession[]) => {
  const highs = new Float64Array(sessions.length);

  for (let index = 0; index < sessions.length; index++) {
    let high = -Infinity;

    for (let k = Math.max(0, index - incumbent.tickWindowSize); k < index; k++) {
      high = Math.max(high, sessions[k]!.high);
    }

    highs[index] = high;
  }

  return highs;
};

// The incumbent's dip test, with its exact expression.
export const depthOf = (price: number, recentHigh: number) => 1 - price / recentHigh;
export const isDip = (price: number, recentHigh: number) => depthOf(price, recentHigh) >= incumbent.targetPercentChange;

// The decision one minute before the close, as src/app/allIn.ts makes it.
export const finalDecision = (session: MarketSession) => {
  const decisionTime = session.closeTime - secondsPerMinute;
  const barIndex = session.bars.findLastIndex((bar) => bar.time + secondsPerMinute <= decisionTime);

  return { decisionTime, barIndex, price: barIndex >= 0 ? session.bars[barIndex]!.close : NaN };
};

// UTC seconds of a New York wall-clock minute on a session's date.
export const sessionMinute = (session: MarketSession, minuteOfDay: number) =>
  session.openTime + (minuteOfDay - (9 * 60 + 30)) * secondsPerMinute;

export interface SessionFacts {
  index: number;
  date: string;
  recentHigh: number;
  finalPrice: number;
  finalDip: boolean;
  finalBand: Band | '';
  // The incumbent-style fill of this session: what CLOSE_1M would pay if it entered here.
  benchmark: Fill | undefined;
  // First completed minute in [09:35, close - 60] whose close qualifies, and the deepest one there.
  firstDip0935Time: number;
  firstDip0935Band: Band | '';
  firstDip1000Time: number;
  firstDip1000Band: Band | '';
  maxDepth: number;
  maxDepthBand: Band | '';
}

export const computeSessionFacts = (
  sessions: readonly MarketSession[],
  recentHighs: Float64Array,
  index: number
): SessionFacts => {
  const session = sessions[index]!;
  const recentHigh = recentHighs[index]!;
  const decision = finalDecision(session);
  const finalDip = isDip(decision.price, recentHigh);
  const from0935 = sessionMinute(session, 9 * 60 + 35);
  const from1000 = sessionMinute(session, 10 * 60);
  let firstDip0935Time = NaN;
  let firstDip0935Band: Band | '' = '';
  let firstDip1000Time = NaN;
  let firstDip1000Band: Band | '' = '';
  let maxDepth = -Infinity;

  for (const bar of session.bars) {
    const completed = bar.time + secondsPerMinute;

    if (completed < from0935 || completed > decision.decisionTime) {
      continue;
    }

    const depth = depthOf(bar.close, recentHigh);

    maxDepth = Math.max(maxDepth, depth);

    if (depth >= incumbent.targetPercentChange) {
      if (Number.isNaN(firstDip0935Time)) {
        firstDip0935Time = completed;
        firstDip0935Band = bandOf(depth);
      }

      if (completed >= from1000 && Number.isNaN(firstDip1000Time)) {
        firstDip1000Time = completed;
        firstDip1000Band = bandOf(depth);
      }
    }
  }

  return {
    index,
    date: session.date,
    recentHigh,
    finalPrice: decision.price,
    finalDip,
    finalBand: finalDip ? bandOf(depthOf(decision.price, recentHigh)) : '',
    benchmark: firstTradeFrom(session as MarketSession, decision.decisionTime),
    firstDip0935Time,
    firstDip0935Band,
    firstDip1000Time,
    firstDip1000Band,
    maxDepth,
    maxDepthBand: maxDepth >= incumbent.targetPercentChange ? bandOf(maxDepth) : ''
  };
};
