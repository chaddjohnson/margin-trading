// Audits the Alpaca minute file against the original daily file: coverage, time zone and bar labeling,
// regular versus extended hours, missing sessions and minutes, early closes, duplicates, OHLCV
// consistency, daylight-saving transitions and the price-adjustment convention.
// Usage: node --experimental-transform-types scripts/audit-data.ts <minute csv> <daily csv> <report json>
import { formatNewYorkTime, groupMarketSessions, loadCsvMinuteBacktestData, newYorkOffset } from '#lib';
import fs from 'fs-extra';

const [, , minuteFile = '', dailyFile = '', reportFile = ''] = process.argv;
const rawLines = (await fs.readFile(minuteFile, 'utf8')).trim().split('\n');
const ticks = await loadCsvMinuteBacktestData('VGT', minuteFile);
const sessions = groupMarketSessions(ticks);
const daily = new Map(
  (await fs.readFile(dailyFile, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => {
      const [date, open, high, low, closePrice] = line.split('|');

      return [date!, { open: Number(open), high: Number(high), low: Number(low), close: Number(closePrice) }];
    })
);
const etMinute = (t: number) => new Date((t + newYorkOffset(t)) * 1000).toISOString().slice(11, 16);
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? NaN;

// Rows and timestamps.
const timestamps = rawLines.map((line) => line.split(',')[0]!.replaceAll('"', ''));
const regularBars = sessions.reduce((total, session) => total + session.bars.length, 0);
const closingPrints = sessions.filter((session) => session.closingPrint !== undefined).length;
const inconsistent = ticks.filter(
  (tick) =>
    !(tick.low <= Math.min(tick.open, tick.close) && tick.high >= Math.max(tick.open, tick.close) && tick.volume > 0)
).length;

// Sessions against the daily file over the common range.
const first = sessions[0]!.date;
const last = sessions.at(-1)!.date;
const dailyDates = [...daily.keys()].filter((date) => date >= first && date <= last);
const sessionDates = new Set(sessions.map((session) => session.date));
const commonStart = [...daily.keys()][0]!;

// Missing minutes.
const barsPerSession = sessions.map((session) => session.bars.length);
const fullSessions = sessions.filter((session) => session.bars.length === (session.isEarlyClose ? 210 : 390)).length;
const byYear: Record<string, { sessions: number; medianBars: number }> = {};

for (const year of new Set(sessions.map((session) => session.date.slice(0, 4)))) {
  const yearSessions = sessions.filter((session) => session.date.startsWith(year));

  byYear[year] = {
    sessions: yearSessions.length,
    medianBars: median(yearSessions.filter((s) => !s.isEarlyClose).map((s) => s.bars.length))
  };
}

const hasMinute = (session: (typeof sessions)[number], minutesBeforeClose: number) =>
  session.bars.some((bar) => bar.time === session.closeTime - minutesBeforeClose * 60);
const missing = {
  decisionMinute: sessions.filter((s) => !hasMinute(s, 2)).map((s) => s.date), // 15:58
  entryMinute: sessions.filter((s) => !hasMinute(s, 1)).map((s) => s.date), // 15:59
  closingPrint: sessions.filter((s) => s.closingPrint === undefined).map((s) => s.date),
  openingMinute: sessions.filter((s) => s.bars[0]!.time !== s.openTime).map((s) => s.date), // 9:30
  secondMinute: sessions.filter((s) => !s.bars.some((bar) => bar.time === s.openTime + 60)).length // 9:31
};
// Sessions whose last regular-session trade is more than 10 minutes before the close.
const earlyEnds = sessions
  .filter((s) => s.bars.at(-1)!.time < s.closeTime - 10 * 60)
  .map((s) => `${s.date} last regular trade ${formatNewYorkTime(s.bars.at(-1)!.time)}`);

// Early closes: regular volume before 1:00 p.m. against extended-hours volume until 4:00 p.m.
const earlyCloseEvidence = sessions
  .filter((session) => session.isEarlyClose)
  .map((session) => {
    const afterClose = ticks
      .filter((tick) => tick.time > session.closeTime && tick.time < session.closeTime + 3 * 3600)
      .reduce((total, tick) => total + tick.volume, 0);

    return {
      date: session.date,
      lastRegularMinute: etMinute(session.bars.at(-1)!.time),
      closingPrint: session.closingPrint ?? null,
      regularVolume: session.volume,
      volumeAfterCloseUntil4pm: afterClose
    };
  });
// On normal sessions the afternoon must trade, or the session might have closed early unlisted.
const normalAfternoonShare = sessions
  .filter((session) => !session.isEarlyClose)
  .map((session) => ({
    date: session.date,
    share:
      session.bars.filter((bar) => bar.time >= session.closeTime - 3 * 3600).reduce((t, bar) => t + bar.volume, 0) /
      session.volume
  }))
  .sort((a, b) => a.share - b.share)
  .slice(0, 3);

// Daylight saving: the 9:30 a.m. open in UTC either side of each transition.
const dstTransitions: string[] = [];

sessions.forEach((session, index) => {
  const previous = sessions[index - 1];

  if (previous && newYorkOffset(previous.openTime) !== newYorkOffset(session.openTime)) {
    dstTransitions.push(
      `${previous.date} open ${new Date(previous.openTime * 1000).toISOString().slice(11, 16)}Z -> ${session.date} open ${new Date(session.openTime * 1000).toISOString().slice(11, 16)}Z`
    );
  }
});

// Price adjustment: the daily file's close divided into the closing print. A constant ratio means the
// same adjustment; quarterly steps mean dividend adjustment in only one of the files.
const ratios = sessions
  .filter((session) => daily.has(session.date) && session.closingPrint !== undefined)
  .map((session) => ({ date: session.date, ratio: session.closingPrint! / daily.get(session.date)!.close }));
const steps = ratios
  .map((row, index) => {
    const before = ratios[index - 1];
    const after = ratios[index + 1];

    return before &&
      after &&
      Math.abs(Math.log(row.ratio / before.ratio)) > 0.0005 &&
      Math.abs(Math.log(after.ratio / before.ratio)) > 0.0005 &&
      Math.abs(Math.log(after.ratio / row.ratio)) < 0.0005
      ? `${row.date} ${((row.ratio / before.ratio - 1) * 100).toFixed(3)}%`
      : '';
  })
  .filter(Boolean);
const ratioByYear: Record<string, number> = {};

for (const row of ratios) {
  ratioByYear[row.date.slice(0, 4)] ??= row.ratio;
}

let largestOvernightGap = { date: '', gap: 0 };

sessions.forEach((session, index) => {
  const previous = sessions[index - 1];
  const gap = previous ? session.open / previous.close - 1 : 0;

  if (Math.abs(gap) > Math.abs(largestOvernightGap.gap)) {
    largestOvernightGap = { date: session.date, gap };
  }
});

// Which minute price is the official close: day-over-day stability of the ratio to the daily close.
const stability = (price: (session: (typeof sessions)[number]) => number | undefined) => {
  const values = sessions
    .filter((s) => daily.has(s.date) && price(s) !== undefined)
    .map((s) => price(s)! / daily.get(s.date)!.close);

  return median(values.slice(1).map((value, index) => Math.abs(Math.log(value / values[index]!))));
};

const report = {
  minuteFile,
  rows: rawLines.length,
  firstTimestamp: timestamps[0],
  lastTimestamp: timestamps.at(-1),
  allTimestampsUtc: timestamps.every((stamp) => stamp.endsWith('Z')),
  strictlyAscendingNoDuplicates: true, // enforced by loadCsvMinuteBacktestData, which throws otherwise
  ohlcvInconsistentRows: inconsistent,
  regularSessionBars: regularBars,
  closingPrintBars: closingPrints,
  extendedHoursBars: rawLines.length - regularBars - closingPrints,
  sessions: sessions.length,
  firstSession: first,
  lastSession: last,
  dailyFileFirstSession: commonStart,
  dailyDatesMissingFromMinuteFile: dailyDates.filter((date) => !sessionDates.has(date)),
  minuteSessionsMissingFromDailyFile: sessions
    .filter((s) => s.date >= commonStart && !daily.has(s.date))
    .map((s) => s.date),
  barsPerSession: { median: median(barsPerSession), min: Math.min(...barsPerSession), fullSessions },
  medianBarsByYear: byYear,
  missing,
  sessionsEndingMoreThan10MinutesEarly: earlyEnds,
  earlyCloseEvidence,
  lowestAfternoonVolumeShareOnNormalSessions: normalAfternoonShare,
  dstTransitions,
  officialCloseMatch: {
    closingPrintMedianDailyRatioChange: stability((s) => s.closingPrint),
    lastRegularTradeMedianDailyRatioChange: stability((s) => s.bars.at(-1)!.close)
  },
  adjustment: {
    firstRatioByYear: ratioByYear,
    persistentRatioSteps: steps,
    largestOvernightRawGap: largestOvernightGap
  }
};

await fs.writeFile(reportFile, `${JSON.stringify(report, null, 1)}\n`);
console.info(JSON.stringify({ ...report, earlyCloseEvidence: report.earlyCloseEvidence.length }, null, 1));
