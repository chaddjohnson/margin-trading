// Data coverage and quality audit of the minute file: what the strategies see after the repository's own
// loader and session grouping. Prices only; no strategy is run, so it reveals no performance. Nothing is
// repaired: anomalies are counted and listed for disclosure.
import fs from 'fs-extra';
import { loadCsvMinuteBacktestData, groupMarketSessions, newYorkOffset } from '#lib';
import { defaultDataFile, sha256File } from './data.ts';

const secondsPerMinute = 60;
const secondsPerDay = 86400;

export const auditData = async (file = defaultDataFile) => {
  const dataHash = await sha256File(file);
  const ticks = await loadCsvMinuteBacktestData('VGT', file);
  const sessions = groupMarketSessions(ticks);
  const regularBars = sessions.reduce((total, session) => total + session.bars.length, 0);
  const closingPrints = sessions.filter((session) => session.closingPrint !== undefined).length;
  const perYear = new Map<string, { sessions: number; bars: number; missingMinutes: number; noClosingPrint: number }>();
  const shortSessions: { date: string; bars: number; expected: number }[] = [];
  const lateOpens: { date: string; firstBarNy: string }[] = [];
  const anomalies: { date: string; time: string; kind: string; detail: string }[] = [];
  const gaps: { date: string; previousClose: number; open: number; change: number }[] = [];
  const minuteJumps: { date: string; time: string; previousClose: number; open: number; change: number }[] = [];
  const missingWeekdays: string[] = [];

  sessions.forEach((session, index) => {
    const year = session.date.slice(0, 4);
    const expected = session.isEarlyClose ? 210 : 390;
    const row = perYear.get(year) ?? { sessions: 0, bars: 0, missingMinutes: 0, noClosingPrint: 0 };

    row.sessions++;
    row.bars += session.bars.length;
    row.missingMinutes += expected - session.bars.length;
    row.noClosingPrint += session.closingPrint === undefined ? 1 : 0;
    perYear.set(year, row);

    if (session.bars.length < expected * 0.9) {
      shortSessions.push({ date: session.date, bars: session.bars.length, expected });
    }

    if (session.bars[0]!.time !== session.openTime) {
      const first = session.bars[0]!.time;

      lateOpens.push({
        date: session.date,
        firstBarNy: new Date((first + newYorkOffset(first)) * 1000).toISOString().slice(11, 16)
      });
    }

    session.bars.forEach((bar, b) => {
      const time = new Date(bar.time * 1000).toISOString();

      if (!(bar.low > 0) || !(bar.high > 0) || !(bar.open > 0) || !(bar.close > 0)) {
        anomalies.push({ date: session.date, time, kind: 'non-positive price', detail: JSON.stringify(bar) });
      }

      if (
        bar.high < bar.low ||
        bar.open > bar.high ||
        bar.open < bar.low ||
        bar.close > bar.high ||
        bar.close < bar.low
      ) {
        anomalies.push({ date: session.date, time, kind: 'OHLC inconsistent', detail: JSON.stringify(bar) });
      }

      const previous = session.bars[b - 1];

      if (previous && Math.abs(bar.open / previous.close - 1) >= 0.02) {
        minuteJumps.push({
          date: session.date,
          time,
          previousClose: previous.close,
          open: bar.open,
          change: bar.open / previous.close - 1
        });
      }
    });

    const previous = sessions[index - 1];

    if (previous) {
      const change = session.open / previous.close - 1;

      if (Math.abs(change) >= 0.04) {
        gaps.push({ date: session.date, previousClose: previous.close, open: session.open, change });
      }

      for (let time = previous.time + secondsPerDay; time < session.time; time += secondsPerDay) {
        const day = new Date(time * 1000).getUTCDay();

        if (day !== 0 && day !== 6) {
          missingWeekdays.push(new Date(time * 1000).toISOString().slice(0, 10));
        }
      }
    }
  });

  const extendedOrDropped = ticks.length - regularBars - closingPrints;

  return {
    file,
    dataHash,
    rows: ticks.length,
    firstRowUtc: new Date(ticks[0]!.time * 1000).toISOString(),
    lastRowUtc: new Date(ticks.at(-1)!.time * 1000).toISOString(),
    sessions: sessions.length,
    firstSession: sessions[0]!.date,
    lastSession: sessions.at(-1)!.date,
    regularBars,
    closingPrints,
    sessionsWithoutClosingPrint: sessions.length - closingPrints,
    extendedHoursOrUnusedRows: extendedOrDropped,
    earlyCloseSessions: sessions.filter((session) => session.isEarlyClose).map((session) => session.date),
    perYear: Object.fromEntries(perYear),
    shortSessions,
    lateOpens,
    anomalies,
    sessionGapsOver4Percent: gaps,
    intrasessionMinuteJumpsOver2Percent: minuteJumps,
    weekdaysWithoutSession: missingWeekdays,
    sessionIndexDates: Object.fromEntries(
      [0, 45, 90, 179, 180, 181].map((index) => [index, sessions[index]?.date ?? ''])
    ),
    minuteSpacing: secondsPerMinute
  };
};

export const writeAudit = async (outFile: string) => {
  const audit = await auditData();

  await fs.outputFile(outFile, `${JSON.stringify(audit, null, 1)}\n`);

  return audit;
};
