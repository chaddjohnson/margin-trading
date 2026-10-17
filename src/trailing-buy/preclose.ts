// The pre-close execution model's decision prices (PROTOCOL.md section 5, model 3). For each daily bar
// covered by the minute file: the last trade before 15:55 New York time (12:55 on early-close days), i.e.
// the close of the last minute bar that ends by then, scaled from the raw minute prices to the
// back-adjusted daily series by the PREVIOUS session's ratio of adjusted daily close to the minute file's
// official close. Sessions without minute data (or without a previous covered session) are NaN.
import { groupMarketSessions, loadCsvMinuteBacktestData } from '#lib';
import { minuteFile } from './constants.ts';
import { sha256Of } from './data.ts';
import type { Bars } from './engine.ts';
import fs from 'fs-extra';

export const minutesBeforeClose = 5;

export interface PreCloseSeries {
  file: string;
  sha256: string;
  price: Float64Array; // aligned with the daily bars
  covered: number;
  firstDate: string;
  lastDate: string;
  missingDailySessions: string[]; // daily bars inside the minute coverage without a minute session
  meanAbsGapToClose: number; // mean |pre-close / close - 1| over covered sessions, for orientation
}

export const loadPreClose = async (bars: Bars): Promise<PreCloseSeries> => {
  const text = await fs.readFile(minuteFile);
  const sessions = groupMarketSessions(await loadCsvMinuteBacktestData('VGT', minuteFile));
  const byDate = new Map(sessions.map((session) => [session.date, session]));
  const price = new Float64Array(bars.date.length).fill(NaN);
  const firstDate = sessions[0]!.date;
  const lastDate = sessions.at(-1)!.date;
  const missing: string[] = [];
  let covered = 0;
  let gap = 0;

  for (let index = 1; index < bars.date.length; index++) {
    const date = bars.date[index]!;

    if (date < firstDate || date > lastDate) {
      continue;
    }

    const session = byDate.get(date);
    const previous = byDate.get(bars.date[index - 1]!);

    if (!session) {
      missing.push(date);
      continue;
    }

    if (!previous) {
      continue;
    }

    const decisionTime = session.closeTime - minutesBeforeClose * 60;
    const bar = session.bars.findLast((candidate) => candidate.time + 60 <= decisionTime);

    if (!bar) {
      continue;
    }

    const factor = bars.close[index - 1]! / previous.close;

    price[index] = bar.close * factor;
    covered++;
    gap += Math.abs(price[index]! / bars.close[index]! - 1);
  }

  return {
    file: minuteFile,
    sha256: sha256Of(text),
    price,
    covered,
    firstDate,
    lastDate,
    missingDailySessions: missing,
    meanAbsGapToClose: gap / covered
  };
};
