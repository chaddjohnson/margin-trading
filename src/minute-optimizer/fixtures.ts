// Synthetic one-minute CSV files in the Alpaca export format, for checking the original, the working copy
// and the fast engine against each other on corner cases that real data has rarely or never: gaps through
// stops, minutes that open through a stop, sessions with a single minute, sessions without any trade after
// the entry decision, missing minutes, early closes, daylight-saving changes and extended-hours rows that
// must be ignored. The generator is seeded and deterministic.
import fs from 'fs-extra';
import path from 'node:path';
import { newYorkOffset } from '#lib';
import { Rng } from '../optimizer/rng.ts';

const secondsPerMinute = 60;
const earlyCloseDates = new Set(['2017-07-03', '2017-11-24', '2018-07-03', '2018-11-23', '2018-12-24']);

export interface FixtureOptions {
  seed: number;
  start: string; // first calendar date (YYYY-MM-DD); weekends are skipped
  sessions: number;
  gapProbability?: number; // per session, an opening gap of up to +-6%
  missingMinuteProbability?: number;
  noTradeAfterDecisionProbability?: number; // no minute from 3:59 p.m. and no closing print
  singleMinuteProbability?: number; // a session with only its first minute (plus maybe a closing print)
  closingPrintProbability?: number;
}

export interface FixtureSummary {
  file: string;
  rows: number;
  sessions: number;
  firstDate: string;
  lastDate: string;
}

// UTC seconds for a New York wall-clock minute on a date. The offset is looked up at noon UTC of the date
// and then re-checked at the resulting time, which is exact away from the 2 a.m. switch.
const newYorkMinuteToUtc = (date: string, minuteOfDay: number) => {
  const midnight = Date.parse(date) / 1000;
  const guess = midnight + minuteOfDay * secondsPerMinute - newYorkOffset(midnight + 12 * 3600);

  return midnight + minuteOfDay * secondsPerMinute - newYorkOffset(guess);
};

const weekdays = (start: string, count: number) => {
  const dates: string[] = [];
  let time = Date.parse(start);

  while (dates.length < count) {
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(time).toISOString().slice(0, 10));
    }

    time += 86400000;
  }

  return dates;
};

const round = (value: number) => Math.round(value * 100) / 100;

export const writeMinuteFixture = async (dir: string, options: FixtureOptions): Promise<FixtureSummary> => {
  const rng = Rng.from('minute-fixture', options.seed);
  const gapProbability = options.gapProbability ?? 0.08;
  const missingMinuteProbability = options.missingMinuteProbability ?? 0.03;
  const noTradeProbability = options.noTradeAfterDecisionProbability ?? 0.03;
  const singleMinuteProbability = options.singleMinuteProbability ?? 0.02;
  const closingPrintProbability = options.closingPrintProbability ?? 0.9;
  const dates = weekdays(options.start, options.sessions);
  const rows: string[] = [];
  let price = 100;
  // A slowly changing drift, so the walk has runs of dips and recoveries for the entry and re-entry rules.
  let drift = 0;

  for (const date of dates) {
    const closeMinute = earlyCloseDates.has(date) ? 13 * 60 : 16 * 60;
    const openMinute = 9 * 60 + 30;
    const noTradeAfterDecision = rng.next() < noTradeProbability;
    const singleMinute = rng.next() < singleMinuteProbability;

    if (rng.next() < 0.05) {
      drift = (rng.next() - 0.5) * 0.0006;
    }

    // A pre-market row, which grouping must drop.
    if (rng.next() < 0.3) {
      const time = newYorkMinuteToUtc(date, 8 * 60 + Math.floor(rng.next() * 60));

      rows.push(`"${new Date(time * 1000).toISOString().replace('.000', '')}",${price},${price},${price},${price},100`);
    }

    if (rng.next() < gapProbability) {
      price = Math.max(5, price * (1 + (rng.next() - 0.55) * 0.12));
    }

    for (let minute = openMinute; minute < closeMinute; minute++) {
      const step = price * (drift + (rng.next() - 0.5) * 0.004);
      const open = round(price);
      const close = round(Math.max(1, price + step));
      const high = round(Math.max(open, close) + rng.next() * price * 0.0015);
      const low = round(Math.min(open, close) - rng.next() * price * 0.0015);

      price = Math.max(1, price + step);

      const isFirst = minute === openMinute;
      const afterDecision = minute >= closeMinute - 1;

      if (!isFirst && singleMinute) {
        continue;
      }

      if (!isFirst && rng.next() < missingMinuteProbability) {
        continue;
      }

      if (afterDecision && noTradeAfterDecision) {
        continue;
      }

      const time = newYorkMinuteToUtc(date, minute);

      rows.push(
        `"${new Date(time * 1000).toISOString().replace('.000', '')}",${open},${high},${low},${close},${1000 + Math.floor(rng.next() * 5000)}`
      );
    }

    if (!noTradeAfterDecision && rng.next() < closingPrintProbability) {
      const time = newYorkMinuteToUtc(date, closeMinute);
      const print = round(price * (1 + (rng.next() - 0.5) * 0.002));

      rows.push(
        `"${new Date(time * 1000).toISOString().replace('.000', '')}",${print},${print},${print},${print},50000`
      );
    }

    // An after-hours row, also dropped.
    if (rng.next() < 0.3) {
      const time = newYorkMinuteToUtc(date, closeMinute + 5 + Math.floor(rng.next() * 100));

      rows.push(
        `"${new Date(time * 1000).toISOString().replace('.000', '')}",${round(price)},${round(price)},${round(price)},${round(price)},10`
      );
    }
  }

  const file = path.join(dir, `fixture-${options.seed}.csv`);

  await fs.ensureDir(dir);
  await fs.writeFile(file, `${rows.join('\n')}\n`);

  return { file, rows: rows.length, sessions: dates.length, firstDate: dates[0]!, lastDate: dates.at(-1)! };
};
