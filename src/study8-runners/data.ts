// The local data the Study 8 runner reads: each canonical minute file's provenance, and its latest COMPLETE session.
// A session is complete once the file holds a bar at or after its regular close: 4:00 p.m. New York time, or 1:00 p.m.
// on an early-close day. That bar is the closing print the shared session builder (src/lib/session.ts) uses as the
// official close; a later bar or a later date also counts.
//
// The default end of a run is the latest session that every required file holds completely. So a day appended only in
// part never becomes the default end: bars up to mid-session, or pre-market bars only. An explicit --end on such a day
// is refused.
//
// Sessions after the shared NYSE calendar's last date (src/lib/calendar.ts) are never offered: the shared loader
// refuses them.
//
// Provenance per file: sha256, bytes, rows, first and last bar. It also says whether the file is exactly Study 8's
// pinned file, that file with rows appended (its pinned-length prefix hashes to the pin), or a different file.
//
// Read-only: files are hashed and their tails read; nothing is written.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { newYorkOffset, nyseCalendarCoverage, nyseEarlyCloses } from '#lib';
import { protocolFreezeFile } from '../study8-expanded-regime-d1/context.ts';
import { readSealed } from '../study8-expanded-regime-d1/records.ts';
import { firstEligibleDate, universeSymbols } from '../study7-runners/run.ts';
import { UsageError } from './aliases.ts';

export { firstEligibleDate, universeSymbols };

// The sealed Study 8 W29 endpoint (the last session of the F24 test door and of every pinned file).
export const study8LastSession = '2026-10-29';

// Byte lengths of the five files Study 8 pinned. Measured on 2026-11-02 from local files whose full sha256 equals the
// pin in results/protocol_freeze.json, which records only the hashes. They let the runner prove that a longer file
// is the pinned file with rows appended.
export const study8PinnedBytes: Record<string, number> = {
  VGT: 53357534,
  XBI: 63382315,
  XRT: 56442438,
  KRE: 60230261,
  GDX: 79996839
};

const openMinute = 9 * 60 + 30;
const closeMinuteOf = (date: string) => (nyseEarlyCloses.has(date) ? 13 * 60 : 16 * 60);

const newYorkOf = (seconds: number) => {
  const local = seconds + newYorkOffset(seconds);

  return {
    date: new Date(local * 1000).toISOString().slice(0, 10),
    minute: (((local % 86400) + 86400) % 86400) / 60
  };
};
const label = (seconds: number) => {
  const local = seconds + newYorkOffset(seconds);

  return `${new Date(local * 1000).toISOString().slice(0, 16).replace('T', ' ')} ET`;
};
const barTime = (line: string) => Date.parse(line.slice(0, line.indexOf(',')).replace(/"/g, '')) / 1000;

export interface TailStatus {
  lastBarUtc: string;
  lastBarNewYork: string;
  lastBarDate: string;
  latestCompleteSession: string | null;
  // the latest date with regular-session bars that the file does NOT yet hold completely (a partial append), if any
  incomplete: { date: string; lastBarNewYork: string } | null;
  // bars dated after the shared calendar's last date exist (they are never used)
  beyondCalendar: boolean;
}

// The latest complete session of one minute file, from its tail (read backwards in chunks).
export const tailStatus = async (file: string): Promise<TailStatus> => {
  const { size } = await fs.stat(file);
  const handle = await fs.open(file, 'r');
  const chunk = 1 << 18;
  let position = size;
  let carry = '';
  let lastBar: number | undefined;
  let incomplete: TailStatus['incomplete'] = null;
  let beyondCalendar = false;
  let latest: string | null = null;

  try {
    scan: while (position > 0) {
      const length = Math.min(chunk, position);
      const buffer = Buffer.alloc(length);

      position -= length;
      await fs.read(handle, buffer, 0, length, position);

      const lines = (buffer.toString('utf8') + carry).split('\n');

      // the first piece may be a partial line; keep it for the next (earlier) chunk unless the file starts here
      carry = position > 0 ? lines.shift()! : '';

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]!.trim();

        if (!line) continue;

        const time = barTime(line);

        if (!Number.isFinite(time)) throw new Error(`${file}: unreadable bar "${line.slice(0, 40)}"`);

        lastBar ??= time;

        const { date, minute } = newYorkOf(time);

        if (date > nyseCalendarCoverage.last) {
          beyondCalendar = true;
          continue;
        }

        // only a regular-session bar opens a session (as in groupMarketSessions)
        if (minute < openMinute || minute >= closeMinuteOf(date)) continue;

        const closeTime = Date.parse(date) / 1000 + closeMinuteOf(date) * 60 - newYorkOffset(time);

        if (lastBar >= closeTime) {
          latest = date;
          break scan;
        }

        incomplete ??= { date, lastBarNewYork: label(lastBar) };
      }
    }
  } finally {
    await fs.close(handle);
  }

  if (lastBar === undefined) throw new Error(`${file} holds no bars`);

  return {
    lastBarUtc: new Date(lastBar * 1000).toISOString(),
    lastBarNewYork: label(lastBar),
    lastBarDate: newYorkOf(lastBar).date,
    latestCompleteSession: latest,
    incomplete,
    beyondCalendar
  };
};

// Study 8's integrity pins of its data and market-event files (results/protocol_freeze.json, body hash verified).
export const study8Pins = async () => {
  const freeze = await readSealed<{ integrity: { data: Record<string, string> } }>(protocolFreezeFile);

  return freeze.integrity.data;
};

export interface FileProvenance extends TailStatus {
  symbol: string;
  file: string;
  present: true;
  bytes: number;
  rows: number;
  sha256: string;
  firstBarUtc: string;
  study8Pin: string | null;
  // exact = Study 8's pinned file; appended = that file plus later rows (prefix verified); differs = anything else
  study8Status: 'exact' | 'appended' | 'differs' | 'no pin';
  appendedBytes: number;
  datasetReport: { file: string; status: string; sha256Matches: boolean } | null;
}

export type DataStatus = Record<string, FileProvenance | { symbol: string; file: string; present: false }>;

// One pass per file: the full sha256, the hash of the pinned-length prefix, and the row count.
const hashFile = async (file: string, prefixBytes: number | undefined) => {
  const full = crypto.createHash('sha256');
  const prefix = crypto.createHash('sha256');
  let seen = 0;
  let rows = 0;
  let last = 10;

  for await (const chunk of fs.createReadStream(file, { highWaterMark: 1 << 20 }) as AsyncIterable<Buffer>) {
    full.update(chunk);

    if (prefixBytes !== undefined && seen < prefixBytes) prefix.update(chunk.subarray(0, prefixBytes - seen));

    seen += chunk.length;

    for (let at = chunk.indexOf(10); at >= 0; at = chunk.indexOf(10, at + 1)) rows++;

    last = chunk[chunk.length - 1] ?? last;
  }

  return {
    sha256: full.digest('hex'),
    prefixSha256: prefixBytes !== undefined && seen >= prefixBytes ? prefix.digest('hex') : '',
    rows: rows + (seen > 0 && last !== 10 ? 1 : 0)
  };
};

const readStatus = async (root: string, symbols: readonly string[]): Promise<DataStatus> => {
  const pins = await study8Pins();
  const out: DataStatus = {};

  for (const symbol of symbols) {
    const file = `${root}/${symbol}/data.csv`;

    if (!(await fs.pathExists(file))) {
      out[symbol] = { symbol, file, present: false };
      continue;
    }

    const pin = pins[`data/${symbol}/data.csv`] ?? null;
    const pinnedBytes = study8PinnedBytes[symbol];
    const { size } = await fs.stat(file);
    const hashes = await hashFile(file, pinnedBytes);
    const handle = await fs.open(file, 'r');
    const first = Buffer.alloc(Math.min(size, 256));

    await fs.read(handle, first, 0, first.length, 0);
    await fs.close(handle);

    const reportFile = path.join(root, symbol, 'dataset-report.json');
    const report = (await fs.pathExists(reportFile))
      ? ((await fs.readJson(reportFile)) as { status?: string; after?: { sha256?: string } })
      : undefined;
    let study8Status: FileProvenance['study8Status'] = 'differs';

    if (!pin) study8Status = 'no pin';
    else if (hashes.sha256 === pin) study8Status = 'exact';
    else if (pinnedBytes !== undefined && size > pinnedBytes && hashes.prefixSha256 === pin) study8Status = 'appended';

    out[symbol] = {
      symbol,
      file,
      present: true,
      bytes: size,
      rows: hashes.rows,
      sha256: hashes.sha256,
      firstBarUtc: new Date(barTime(first.toString('utf8').split('\n')[0]!) * 1000).toISOString(),
      ...(await tailStatus(file)),
      study8Pin: pin,
      study8Status,
      appendedBytes: study8Status === 'appended' ? size - pinnedBytes! : 0,
      datasetReport: report
        ? {
            file: reportFile,
            status: report.status ?? '',
            sha256Matches: report.after?.sha256 === hashes.sha256
          }
        : null
    };
  }

  return out;
};

const statusCache = new Map<string, Promise<DataStatus>>();

// Provenance of the five canonical files (all five are shown for every run, whichever the strategy reads).
export const dataStatus = (root = 'data', symbols: readonly string[] = universeSymbols): Promise<DataStatus> => {
  const key = `${root}|${symbols.join(',')}`;

  if (!statusCache.has(key)) statusCache.set(key, readStatus(root, symbols));

  return statusCache.get(key)!;
};

// The latest session every given symbol's file holds completely, and which file limits it.
export const latestCommonSession = async (symbols: readonly string[], root = 'data') => {
  const status = await dataStatus(root);
  const missing = symbols.filter((symbol) => !status[symbol]?.present);

  if (missing.length) throw new UsageError(`missing canonical data for ${missing.join(', ')} (data/<SYMBOL>/data.csv)`);

  const files = symbols.map((symbol) => status[symbol] as FileProvenance);
  const empty = files.filter((file) => file.latestCompleteSession === null);

  if (empty.length) throw new UsageError(`no complete session in ${empty.map((file) => file.file).join(', ')}`);

  const latest = files.map((file) => file.latestCompleteSession!).sort()[0]!;

  return {
    latest,
    limitedBy: files.filter((file) => file.latestCompleteSession === latest).map((file) => file.symbol),
    files
  };
};

// The run's end: the latest common complete session by default; an explicit date must not be later than it.
export const validateEnd = async (end: string | undefined, symbols: readonly string[], root = 'data') => {
  const { latest, files } = await latestCommonSession(symbols, root);

  if (end === undefined) return latest;
  // a real calendar date (Date.parse alone accepts e.g. 2026-02-30)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    new Date(Date.parse(`${end}T00:00:00Z`) || 0).toISOString().slice(0, 10) !== end
  )
    throw new UsageError(`--end must be a YYYY-MM-DD calendar date, not "${end}"`);

  if (end > latest) {
    const partial = files
      .filter((file) => file.incomplete && file.incomplete.date <= end)
      .map((file) => `${file.symbol} holds ${file.incomplete!.date} only up to ${file.incomplete!.lastBarNewYork}`);

    throw new UsageError(
      `--end ${end} is after the latest common complete session (${latest}) of ${symbols.join(', ')}${partial.length ? `; ${partial.join('; ')} (an incomplete session)` : ''}; nothing complete after ${latest} exists locally`
    );
  }

  if (end <= firstEligibleDate)
    throw new UsageError(`--end ${end} must be after the first eligible session ${firstEligibleDate}`);

  return end;
};
