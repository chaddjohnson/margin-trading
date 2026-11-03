// The data audit (brief section 0): every minute file is read row by row, tolerant of faults the strategy loader
// would refuse, then grouped into sessions exactly as the strategy files group it. Nothing here depends on a strategy
// parameter: the audit inspects existence, counts, timestamps, calendar coverage, bar sanity, overnight gaps (for
// corporate actions) and liquidity. Return-like statistics (declines from the rolling high, daily ranges) are computed
// on the development window only, as evidence for the search bounds; the holdout is inspected for data quality alone.
import path from 'node:path';
import { parse } from 'csv-parse';
import fs from 'fs-extra';
import { groupMarketSessions, newYorkOffset } from '#lib';
import type { MarketSession, Tick } from '#types';
import { computeReferenceHighs, fixtureDataset, sha256File } from '../four-family/data.ts';
import { type Ticker, log, protocol, stageDir, tickers, writeJson, writeText, formatDollars, pct } from './context.ts';
import { hashesFile } from './data.ts';

const secondsPerDay = 86400;

export interface RawAudit {
  rows: number;
  parsedRows: number;
  firstTimestamp: string;
  lastTimestamp: string;
  nonUtcRows: number;
  unsortedRows: number; // rows whose timestamp is not after the previous row's
  duplicateRows: number; // rows with the previous row's timestamp
  nanRows: number;
  nonPositivePriceRows: number;
  badOhlcRows: number; // high < low, high below open/close or low above open/close
  zeroVolumeRows: number;
  regularWallClockRows: number; // 9:30 <= minute < 16:00 New York time
  closingWallClockRows: number; // the 16:00 minute (or 13:00 on early-close days, counted below)
  extendedHoursRows: number;
  rowsAfterHoldoutEnd: number;
}

export interface GapRow {
  date: string;
  previousDate: string;
  previousClose: number;
  open: number;
  gap: number;
  volume: number;
}

export interface OutlierRow {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  move: number;
  range: number;
}

export interface WindowAudit {
  label: string;
  firstSession: string;
  lastSession: string;
  sessions: number;
  bars: number;
  calendarSessions: number; // sessions of the common calendar inside the window
  missingSessions: string[];
  sparseSessions: { date: string; bars: number; expected: number }[];
  sessionsWithoutClosingPrint: number;
  earlyCloseSessions: number;
  medianBarsPerSession: number;
  minBarsPerSession: number;
  meanCoverage: number; // bars / expected minutes
  zeroRangeBarShare: number;
  medianMinuteVolume: number;
  minutesBelow100Shares: number;
  largeGaps: GapRow[]; // |overnight gap| >= 10%: corporate-action candidates
}

export interface DevelopmentPriceStats {
  // From sessions on or before the development end only.
  deepestDeclineFromRolling74High: { date: string; decline: number };
  deepestDeclineByYear: Record<string, number>;
  sessionsWithDeclineAtLeast: Record<string, number>; // keys '10%', '15%', '20%', '25%', '30%', '40%'
  medianAbsoluteDailyReturn: number;
  p95AbsoluteDailyReturn: number;
  medianIntradayRange: number; // (high - low) / close
  gapsAtLeast5Percent: GapRow[];
  minuteOutliers: OutlierRow[]; // top 10 by absolute move
  minuteOutlierCount: number;
}

export interface TickerAudit {
  ticker: string;
  dataFile: string;
  sha256: string;
  bytes: number;
  source: string;
  adjustment: string;
  loaderWouldAccept: boolean;
  raw: RawAudit;
  sessionCount: number;
  firstSession: string;
  lastSession: string;
  eligibilitySessionPresent: boolean;
  eligibilityIndex: number;
  developmentEndSession: string;
  holdoutFirstSession: string;
  holdoutLastSession: string;
  rowsOnEarlyCloseAfternoons: number;
  windows: { development: WindowAudit; holdout: WindowAudit };
  development: DevelopmentPriceStats;
  critical: string[]; // faults that block the ticker
  warnings: string[];
}

const nyMinute = (time: number) => {
  const local = time + newYorkOffset(time);

  return { date: new Date(local * 1000).toISOString().slice(0, 10), minute: (local % secondsPerDay) / 60 };
};

const median = (values: number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

const quantile = (values: number[], q: number) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
};

// Pass 1: every row of the file, tolerant. Returns the ticks that parse, in file order (the loader would throw on
// the first unsorted or non-UTC row; the audit counts them instead).
export const auditRows = async (file: string): Promise<{ raw: RawAudit; ticks: Tick[] }> => {
  const parser = fs.createReadStream(file).pipe(parse({ columns: ['time', 'open', 'high', 'low', 'close', 'volume'] }));
  const raw: RawAudit = {
    rows: 0,
    parsedRows: 0,
    firstTimestamp: '',
    lastTimestamp: '',
    nonUtcRows: 0,
    unsortedRows: 0,
    duplicateRows: 0,
    nanRows: 0,
    nonPositivePriceRows: 0,
    badOhlcRows: 0,
    zeroVolumeRows: 0,
    regularWallClockRows: 0,
    closingWallClockRows: 0,
    extendedHoursRows: 0,
    rowsAfterHoldoutEnd: 0
  };
  const ticks: Tick[] = [];
  let previous = -Infinity;
  const holdoutEndTime = Date.parse(`${protocol.holdout.end}T23:59:59Z`) / 1000;

  for await (const record of parser as AsyncIterable<Record<string, string>>) {
    raw.rows++;

    const text = record.time ?? '';
    const isUtc = text.endsWith('Z');
    const time = isUtc ? Date.parse(text) / 1000 : NaN;

    if (!isUtc) {
      raw.nonUtcRows++;
    }

    if (raw.rows === 1) {
      raw.firstTimestamp = text;
    }

    raw.lastTimestamp = text;

    const open = Number(record.open);
    const high = Number(record.high);
    const low = Number(record.low);
    const close = Number(record.close);
    const volume = Number(record.volume);

    if ([time, open, high, low, close, volume].some((value) => Number.isNaN(value))) {
      raw.nanRows++;
      continue;
    }

    if (time === previous) {
      raw.duplicateRows++;
      raw.unsortedRows++;
    } else if (time < previous) {
      raw.unsortedRows++;
    }

    previous = Math.max(previous, time);

    if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
      raw.nonPositivePriceRows++;
    }

    if (high < low || high < Math.max(open, close) || low > Math.min(open, close)) {
      raw.badOhlcRows++;
    }

    if (volume <= 0) {
      raw.zeroVolumeRows++;
    }

    if (time > holdoutEndTime) {
      raw.rowsAfterHoldoutEnd++;
    }

    const { minute } = nyMinute(time);

    if (minute >= 570 && minute < 960) {
      raw.regularWallClockRows++;
    } else if (minute === 960) {
      raw.closingWallClockRows++;
    } else {
      raw.extendedHoursRows++;
    }

    raw.parsedRows++;
    ticks.push({ time, open, high, low, close, volume, trades: NaN });
  }

  return { raw, ticks };
};

const windowAudit = (
  label: string,
  sessions: MarketSession[],
  calendar: string[],
  start: string,
  end: string,
  minGap: number
): WindowAudit => {
  const inWindow = sessions.filter((session) => session.date >= start && session.date <= end);
  const own = new Set(inWindow.map((session) => session.date));
  const calendarInWindow = calendar.filter((date) => date >= start && date <= end);
  const barCounts = inWindow.map((session) => session.bars.length);
  const expected = (session: MarketSession) => (session.isEarlyClose ? 210 : 390);
  const volumes: number[] = [];
  let zeroRange = 0;
  let bars = 0;
  let below100 = 0;
  const largeGaps: GapRow[] = [];

  inWindow.forEach((session, index) => {
    for (const bar of session.bars) {
      bars++;
      volumes.push(bar.volume);

      if (bar.high === bar.low) {
        zeroRange++;
      }

      if (bar.volume < 100) {
        below100++;
      }
    }

    const previous = index > 0 ? inWindow[index - 1]! : sessions[sessions.indexOf(session) - 1];

    if (previous) {
      const gap = session.open / previous.close - 1;

      if (Math.abs(gap) >= minGap) {
        largeGaps.push({
          date: session.date,
          previousDate: previous.date,
          previousClose: previous.close,
          open: session.open,
          gap,
          volume: session.volume
        });
      }
    }
  });

  return {
    label,
    firstSession: inWindow[0]?.date ?? '',
    lastSession: inWindow.at(-1)?.date ?? '',
    sessions: inWindow.length,
    bars,
    calendarSessions: calendarInWindow.length,
    missingSessions: calendarInWindow.filter((date) => !own.has(date)),
    sparseSessions: inWindow
      .filter((session) => session.bars.length < 0.5 * expected(session))
      .map((session) => ({ date: session.date, bars: session.bars.length, expected: expected(session) })),
    sessionsWithoutClosingPrint: inWindow.filter((session) => session.closingPrint === undefined).length,
    earlyCloseSessions: inWindow.filter((session) => session.isEarlyClose).length,
    medianBarsPerSession: median(barCounts),
    minBarsPerSession: barCounts.length > 0 ? Math.min(...barCounts) : 0,
    meanCoverage:
      inWindow.length > 0
        ? inWindow.reduce((total, session) => total + session.bars.length / expected(session), 0) / inWindow.length
        : 0,
    zeroRangeBarShare: bars > 0 ? zeroRange / bars : 0,
    medianMinuteVolume: median(volumes),
    minutesBelow100Shares: below100,
    largeGaps: largeGaps.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
  };
};

const developmentStats = (sessions: MarketSession[]): DevelopmentPriceStats => {
  const dev = sessions.filter((session) => session.date <= protocol.developmentEnd);
  const ds = fixtureDataset(dev);
  const highs = computeReferenceHighs(ds, 74);
  const thresholds = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4];
  const counts: Record<string, number> = Object.fromEntries(thresholds.map((value) => [`${value * 100}%`, 0]));
  const byYear: Record<string, number> = {};
  let deepest = { date: '', decline: 0 };
  const absoluteReturns: number[] = [];
  const ranges: number[] = [];
  const gaps: GapRow[] = [];
  const outliers: OutlierRow[] = [];

  dev.forEach((session, s) => {
    const decline = Number.isFinite(highs[s]!) ? 1 - session.close / highs[s]! : NaN;
    const year = session.date.slice(0, 4);

    if (Number.isFinite(decline)) {
      for (const value of thresholds) {
        if (decline >= value) {
          counts[`${value * 100}%`]!++;
        }
      }

      if (decline > deepest.decline) {
        deepest = { date: session.date, decline };
      }

      byYear[year] = Math.max(byYear[year] ?? 0, decline);
    }

    ranges.push((session.high - session.low) / session.close);

    if (s > 0) {
      const previous = dev[s - 1]!;
      const gap = session.open / previous.close - 1;

      absoluteReturns.push(Math.abs(session.close / previous.close - 1));

      if (Math.abs(gap) >= 0.05) {
        gaps.push({
          date: session.date,
          previousDate: previous.date,
          previousClose: previous.close,
          open: session.open,
          gap,
          volume: session.volume
        });
      }
    }

    for (const bar of session.bars) {
      const move = bar.close / bar.open - 1;
      const range = (bar.high - bar.low) / bar.open;

      if (Math.abs(move) > 0.03 || range > 0.03) {
        outliers.push({
          time: new Date(bar.time * 1000).toISOString(),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
          move,
          range
        });
      }
    }
  });

  return {
    deepestDeclineFromRolling74High: deepest,
    deepestDeclineByYear: byYear,
    sessionsWithDeclineAtLeast: counts,
    medianAbsoluteDailyReturn: median(absoluteReturns),
    p95AbsoluteDailyReturn: quantile(absoluteReturns, 0.95),
    medianIntradayRange: median(ranges),
    gapsAtLeast5Percent: gaps.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)),
    minuteOutliers: outliers
      .sort((a, b) => Math.max(Math.abs(b.move), b.range) - Math.max(Math.abs(a.move), a.range))
      .slice(0, 10),
    minuteOutlierCount: outliers.length
  };
};

export const auditTicker = async (
  ticker: string,
  dataFile: string,
  calendar: string[],
  sessions: MarketSession[],
  raw: RawAudit
): Promise<TickerAudit> => {
  const sha256 = await sha256File(dataFile);
  const { size } = await fs.stat(dataFile);
  const dates = sessions.map((session) => session.date);
  const eligibilityIndex = dates.indexOf(protocol.eligibilityDate);
  const holdoutSessions = sessions.filter((session) => session.date >= protocol.holdout.start);
  const developmentSessions = sessions.filter((session) => session.date <= protocol.developmentEnd);
  const critical: string[] = [];
  const warnings: string[] = [];
  const loaderWouldAccept = raw.nonUtcRows === 0 && raw.unsortedRows === 0 && raw.nanRows === 0;

  if (!loaderWouldAccept) {
    critical.push(
      `the strategy loader would refuse the file: ${raw.nonUtcRows} non-UTC, ${raw.unsortedRows} unsorted/duplicate, ${raw.nanRows} unparsable rows`
    );
  }

  if (raw.nonPositivePriceRows > 0) {
    critical.push(`${raw.nonPositivePriceRows} rows with a zero or negative price`);
  }

  if (raw.badOhlcRows > 0) {
    warnings.push(`${raw.badOhlcRows} rows with an inconsistent open/high/low/close`);
  }

  if (eligibilityIndex < 0) {
    critical.push(`the eligibility session ${protocol.eligibilityDate} is missing`);
  }

  if (developmentSessions.length === 0 || holdoutSessions.length === 0) {
    critical.push('no development or no holdout sessions');
  }

  const development = windowAudit('development', sessions, calendar, '2016-01-01', protocol.developmentEnd, 0.1);
  const holdout = windowAudit('holdout', sessions, calendar, protocol.holdout.start, protocol.holdout.end, 0.1);

  // Rows on early-close afternoons (13:01-16:00) are dropped by the session grouping; count them from the ticks.
  let rowsOnEarlyCloseAfternoons = 0;

  for (const session of sessions) {
    if (session.isEarlyClose) {
      // The grouping keeps bars up to 13:00; raw regular-wall-clock rows on that date minus the kept ones.
      rowsOnEarlyCloseAfternoons += 0; // counted below from the raw ticks when available
    }
  }

  for (const window of [development, holdout]) {
    if (window.missingSessions.length > 0) {
      warnings.push(
        `${window.label}: ${window.missingSessions.length} calendar sessions missing (${window.missingSessions.slice(0, 5).join(', ')}${window.missingSessions.length > 5 ? ', …' : ''})`
      );
    }

    if (window.sparseSessions.length > 0) {
      warnings.push(
        `${window.label}: ${window.sparseSessions.length} sessions with fewer than half the expected minutes`
      );
    }

    for (const gap of window.largeGaps) {
      warnings.push(
        `${window.label}: overnight gap of ${pct(gap.gap)} on ${gap.date} (corporate-action candidate; verify)`
      );
    }

    if (window.sessionsWithoutClosingPrint > 0) {
      warnings.push(
        `${window.label}: ${window.sessionsWithoutClosingPrint} sessions without a closing print (the last regular minute's close is the official close)`
      );
    }
  }

  return {
    ticker,
    dataFile,
    sha256,
    bytes: size,
    source: 'Alpaca Market Data v2, SIP feed, 1-minute bars (data/download-ohlcv.sh)',
    adjustment: 'raw (adjustment=raw): no split or dividend adjustment; ex-dividend drops are price moves',
    loaderWouldAccept,
    raw,
    sessionCount: sessions.length,
    firstSession: dates[0] ?? '',
    lastSession: dates.at(-1) ?? '',
    eligibilitySessionPresent: eligibilityIndex >= 0,
    eligibilityIndex,
    developmentEndSession: developmentSessions.at(-1)?.date ?? '',
    holdoutFirstSession: holdoutSessions[0]?.date ?? '',
    holdoutLastSession: holdoutSessions.at(-1)?.date ?? '',
    rowsOnEarlyCloseAfternoons,
    windows: { development, holdout },
    development: developmentStats(sessions),
    critical,
    warnings
  };
};

const tableLine = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;

export const auditTables = (audits: TickerAudit[], commonHoldoutEnd: string) => {
  const lines: string[] = [];

  lines.push('## Files');
  lines.push('');
  lines.push(
    tableLine(['Ticker', 'File', 'SHA-256', 'Bytes', 'Rows', 'First row (UTC)', 'Last row (UTC)', 'Loader accepts'])
  );
  lines.push('|---|---|---|---:|---:|---|---|---|');

  for (const audit of audits) {
    lines.push(
      tableLine([
        audit.ticker,
        `\`${audit.dataFile}\``,
        `\`${audit.sha256.slice(0, 16)}…\``,
        audit.bytes.toLocaleString('en-US'),
        audit.raw.rows.toLocaleString('en-US'),
        audit.raw.firstTimestamp,
        audit.raw.lastTimestamp,
        audit.loaderWouldAccept ? 'yes' : 'NO'
      ])
    );
  }

  lines.push('');
  lines.push('## Row sanity');
  lines.push('');
  lines.push(
    tableLine([
      'Ticker',
      'Non-UTC',
      'Unsorted',
      'Duplicates',
      'Unparsable',
      'Non-positive price',
      'Bad OHLC',
      'Zero volume',
      'Regular (9:30-16:00)',
      'Closing (16:00)',
      'Extended hours',
      'Rows after 2025-12-31'
    ])
  );
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');

  for (const { ticker, raw } of audits) {
    lines.push(
      tableLine([
        ticker,
        raw.nonUtcRows,
        raw.unsortedRows,
        raw.duplicateRows,
        raw.nanRows,
        raw.nonPositivePriceRows,
        raw.badOhlcRows,
        raw.zeroVolumeRows,
        raw.regularWallClockRows.toLocaleString('en-US'),
        raw.closingWallClockRows.toLocaleString('en-US'),
        raw.extendedHoursRows.toLocaleString('en-US'),
        raw.rowsAfterHoldoutEnd
      ])
    );
  }

  lines.push('');
  lines.push('## Sessions and coverage');
  lines.push('');
  lines.push(
    tableLine([
      'Ticker',
      'Sessions',
      'First',
      'Last',
      `${protocol.eligibilityDate} present`,
      'Development sessions (→ 2023)',
      'Dev missing',
      'Dev sparse',
      'Dev mean coverage',
      'Holdout sessions (2024 →)',
      'Holdout first',
      'Holdout last',
      'Holdout missing',
      'Holdout sparse',
      'Holdout mean coverage'
    ])
  );
  lines.push('|---|---:|---|---|---|---:|---:|---:|---:|---:|---|---|---:|---:|---:|');

  for (const audit of audits) {
    const { development, holdout } = audit.windows;

    lines.push(
      tableLine([
        audit.ticker,
        audit.sessionCount,
        audit.firstSession,
        audit.lastSession,
        audit.eligibilitySessionPresent ? `yes (index ${audit.eligibilityIndex})` : 'NO',
        development.sessions,
        development.missingSessions.length,
        development.sparseSessions.length,
        pct(development.meanCoverage),
        holdout.sessions,
        holdout.firstSession,
        holdout.lastSession,
        holdout.missingSessions.length,
        holdout.sparseSessions.length,
        pct(holdout.meanCoverage)
      ])
    );
  }

  lines.push('');
  lines.push(`Common holdout end: **${commonHoldoutEnd}** (the last session every one of the eight files has).`);
  lines.push('');
  lines.push('## Liquidity and bar quality');
  lines.push('');
  lines.push(
    tableLine([
      'Ticker',
      'Window',
      'Median bars/session',
      'Min bars/session',
      'Without closing print',
      'Early closes',
      'Zero-range bars',
      'Median minute volume',
      'Minutes < 100 shares'
    ])
  );
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');

  for (const audit of audits) {
    for (const window of [audit.windows.development, audit.windows.holdout]) {
      lines.push(
        tableLine([
          audit.ticker,
          window.label,
          window.medianBarsPerSession,
          window.minBarsPerSession,
          window.sessionsWithoutClosingPrint,
          window.earlyCloseSessions,
          pct(window.zeroRangeBarShare),
          window.medianMinuteVolume.toLocaleString('en-US'),
          window.minutesBelow100Shares.toLocaleString('en-US')
        ])
      );
    }
  }

  lines.push('');
  lines.push('## Overnight gaps of at least 10% (corporate-action candidates, both windows)');
  lines.push('');
  lines.push(tableLine(['Ticker', 'Window', 'Date', 'Previous close', 'Open', 'Gap', 'Session volume']));
  lines.push('|---|---|---|---:|---:|---:|---:|');

  let anyGap = false;

  for (const audit of audits) {
    for (const window of [audit.windows.development, audit.windows.holdout]) {
      for (const gap of window.largeGaps) {
        anyGap = true;
        lines.push(
          tableLine([
            audit.ticker,
            window.label,
            gap.date,
            gap.previousClose.toFixed(2),
            gap.open.toFixed(2),
            pct(gap.gap),
            gap.volume.toLocaleString('en-US')
          ])
        );
      }
    }
  }

  if (!anyGap) {
    lines.push(tableLine(['—', '', 'none', '', '', '', '']));
  }

  lines.push('');
  lines.push('## Development-window price statistics (2016-01-04 → 2023-12-29; search-bound evidence, no strategy)');
  lines.push('');
  lines.push(
    tableLine([
      'Ticker',
      'Deepest decline from rolling 74-session high',
      '≥10%',
      '≥15%',
      '≥20%',
      '≥25%',
      '≥30%',
      '≥40%',
      'Median |daily return|',
      'P95 |daily return|',
      'Median intraday range',
      'Gaps ≥ 5%',
      'Minute outliers (>3%)'
    ])
  );
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');

  for (const audit of audits) {
    const dev = audit.development;
    const counts = dev.sessionsWithDeclineAtLeast;

    lines.push(
      tableLine([
        audit.ticker,
        `${pct(dev.deepestDeclineFromRolling74High.decline)} on ${dev.deepestDeclineFromRolling74High.date}`,
        counts['10%'] ?? 0,
        counts['15%'] ?? 0,
        counts['20%'] ?? 0,
        counts['25%'] ?? 0,
        counts['30%'] ?? 0,
        counts['40%'] ?? 0,
        pct(dev.medianAbsoluteDailyReturn, 2),
        pct(dev.p95AbsoluteDailyReturn, 2),
        pct(dev.medianIntradayRange, 2),
        dev.gapsAtLeast5Percent.length,
        dev.minuteOutlierCount
      ])
    );
  }

  lines.push('');
  lines.push('Deepest decline from the rolling 74-session high by development year:');
  lines.push('');

  const years = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'];

  lines.push(tableLine(['Ticker', ...years]));
  lines.push(`|---|${years.map(() => '---:').join('|')}|`);

  for (const audit of audits) {
    lines.push(
      tableLine([audit.ticker, ...years.map((year) => pct(audit.development.deepestDeclineByYear[year] ?? NaN))])
    );
  }

  lines.push('');
  lines.push('## Verdicts');
  lines.push('');

  for (const audit of audits) {
    lines.push(
      `- **${audit.ticker}**: ${audit.critical.length === 0 ? 'valid' : `BLOCKED — ${audit.critical.join('; ')}`}${audit.warnings.length > 0 ? `; warnings: ${audit.warnings.join('; ')}` : ''}`
    );
  }

  return lines.join('\n');
};

export const runAudit = async () => {
  const files = [...tickers, protocol.reference.symbol].map((ticker) => ({
    ticker,
    dataFile: ticker === protocol.reference.symbol ? protocol.reference.dataFile : protocol.dataFile(ticker)
  }));
  const loaded: { ticker: string; dataFile: string; raw: RawAudit; sessions: MarketSession[]; ticks: Tick[] }[] = [];

  for (const { ticker, dataFile } of files) {
    if (!(await fs.pathExists(dataFile))) {
      log(`${ticker}: ${dataFile} is missing`);
      loaded.push({
        ticker,
        dataFile,
        raw: {
          rows: 0,
          parsedRows: 0,
          firstTimestamp: '',
          lastTimestamp: '',
          nonUtcRows: 0,
          unsortedRows: 0,
          duplicateRows: 0,
          nanRows: 0,
          nonPositivePriceRows: 0,
          badOhlcRows: 0,
          zeroVolumeRows: 0,
          regularWallClockRows: 0,
          closingWallClockRows: 0,
          extendedHoursRows: 0,
          rowsAfterHoldoutEnd: 0
        },
        sessions: [],
        ticks: []
      });
      continue;
    }

    const { raw, ticks } = await auditRows(dataFile);
    // The grouping needs ascending times; a faulty file is grouped on its sorted, deduplicated ticks for the
    // session-level report only (the loader itself would refuse it, which the verdict records).
    const ordered =
      raw.unsortedRows === 0
        ? ticks
        : [...ticks]
            .sort((a, b) => a.time - b.time)
            .filter((tick, index, all) => index === 0 || tick.time !== all[index - 1]!.time);
    const sessions = groupMarketSessions(ordered);

    loaded.push({ ticker, dataFile, raw, sessions, ticks: ordered });
    log(
      `${ticker}: ${raw.rows.toLocaleString('en-US')} rows, ${sessions.length} sessions ${sessions[0]?.date} → ${sessions.at(-1)?.date}`
    );
  }

  // The common calendar: a date is a trading session if at least five of the nine files have one.
  const dateCounts = new Map<string, number>();

  for (const { sessions } of loaded) {
    for (const session of sessions) {
      dateCounts.set(session.date, (dateCounts.get(session.date) ?? 0) + 1);
    }
  }

  const calendar = [...dateCounts.entries()]
    .filter(([, count]) => count >= 5)
    .map(([date]) => date)
    .sort();
  const audits: TickerAudit[] = [];

  for (const entry of loaded) {
    if (entry.sessions.length === 0) {
      audits.push({
        ticker: entry.ticker,
        dataFile: entry.dataFile,
        sha256: '',
        bytes: 0,
        source: '',
        adjustment: '',
        loaderWouldAccept: false,
        raw: entry.raw,
        sessionCount: 0,
        firstSession: '',
        lastSession: '',
        eligibilitySessionPresent: false,
        eligibilityIndex: -1,
        developmentEndSession: '',
        holdoutFirstSession: '',
        holdoutLastSession: '',
        rowsOnEarlyCloseAfternoons: 0,
        windows: {
          development: windowAudit('development', [], calendar, '2016-01-01', protocol.developmentEnd, 0.1),
          holdout: windowAudit('holdout', [], calendar, protocol.holdout.start, protocol.holdout.end, 0.1)
        },
        development: developmentStats([]),
        critical: ['file missing'],
        warnings: []
      });
      continue;
    }

    const audit = await auditTicker(entry.ticker, entry.dataFile, calendar, entry.sessions, entry.raw);

    // Rows the grouping drops on early-close afternoons: regular-wall-clock rows after 13:00 on early-close dates.
    const earlyDates = new Set(entry.sessions.filter((session) => session.isEarlyClose).map((session) => session.date));
    let dropped = 0;

    for (const tick of entry.ticks) {
      const { date, minute } = nyMinute(tick.time);

      if (earlyDates.has(date) && minute > 780 && minute < 960) {
        dropped++;
      }
    }

    audit.rowsOnEarlyCloseAfternoons = dropped;
    audits.push(audit);
    await writeJson(stageDir('audit', `${entry.ticker}.json`), audit);
  }

  const eight = audits.filter((audit) => tickers.includes(audit.ticker as Ticker));
  const valid = eight.filter((audit) => audit.critical.length === 0);
  const commonHoldoutEnd = valid.length > 0 ? valid.map((audit) => audit.holdoutLastSession).sort()[0]! : '';
  const summary = {
    auditedAt: new Date().toISOString(),
    protocolVersion: protocol.version,
    calendarSessions: calendar.length,
    calendarFirst: calendar[0],
    calendarLast: calendar.at(-1),
    developmentEnd: protocol.developmentEnd,
    holdout: { ...protocol.holdout, commonEndSession: commonHoldoutEnd },
    tickers: Object.fromEntries(
      audits.map((audit) => [
        audit.ticker,
        {
          valid: audit.critical.length === 0,
          critical: audit.critical,
          warnings: audit.warnings,
          sha256: audit.sha256,
          sessions: audit.sessionCount,
          first: audit.firstSession,
          last: audit.lastSession,
          developmentEndSession: audit.developmentEndSession,
          holdoutFirstSession: audit.holdoutFirstSession,
          holdoutLastSession: audit.holdoutLastSession
        }
      ])
    )
  };

  await writeJson(stageDir('audit', 'summary.json'), summary);
  await writeJson(
    hashesFile,
    Object.fromEntries(audits.filter((audit) => audit.sha256).map((audit) => [audit.ticker, audit.sha256]))
  );
  await writeText(
    stageDir('audit', 'DATA_AUDIT_TABLES.md'),
    `# Data audit tables (generated ${summary.auditedAt})\n\n${auditTables(audits, commonHoldoutEnd)}`
  );
  log(
    `Wrote ${stageDir('audit')}: ${valid.length} of ${eight.length} tickers valid; common holdout end ${commonHoldoutEnd}`
  );

  for (const audit of audits) {
    log(
      `${audit.ticker}: ${audit.critical.length === 0 ? 'valid' : `BLOCKED (${audit.critical.join('; ')})`}${audit.warnings.length > 0 ? ` — ${audit.warnings.length} warnings` : ''}`
    );
  }

  return { audits, summary };
};

export const auditDir = stageDir('audit');
export const auditFile = (ticker: string) => path.join(auditDir, `${ticker}.json`);
export const dollars = formatDollars;
