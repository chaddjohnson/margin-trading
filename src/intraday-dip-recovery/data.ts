// The data doors (PROTOCOL.md §3). A development door reads ONLY its pinned byte prefix of the canonical file and
// verifies length, sha256, row count and last-row time before parsing, so no later byte enters the process; rows are
// parsed exactly as the repository's loader parses them (`parseMinuteBar`, strictly ascending times) and grouped by
// `groupMarketSessions` (regular session plus the closing print). FULL reads the whole file only under the frozen
// C24 selection's guard (committed), applies the recorded split by forward adjustment, and is logged. The coverage
// scan reads only the timestamp field of each row (never a price) to measure the common complete endpoint.
import fs from 'node:fs';
import { adjustSessionsForSplits, groupMarketSessions, newYorkOffset, parseMinuteBar, readSplits } from '#lib';
import { nyseEarlyCloses, nyseHolidays } from '../lib/calendar.ts';
import type { MarketSession, Tick } from '#types';
import { type DoorKey, chronology, dataBytes, dataFile, dataSha256, prefixDoors, symbol } from './context.ts';
import { recordDoor, sha256 } from './seal.ts';

export interface Door {
  key: DoorKey | 'fixture';
  sessions: MarketSession[];
  volume: Float64Array; // per regular bar, in bar order (for the capacity review)
  bytes: number;
  rows: number;
  sha256: string;
  lastSession: string;
  splits: { effectiveDate: string; ratio: number }[];
}

const isoOf = (t: number) => new Date(t * 1000).toISOString().replace('.000Z', 'Z');

// The minute CSV has no quoting beyond the timestamp's quotes and no header (src/lib/csv.ts).
const parseRows = (buffer: Buffer, where: string): Tick[] => {
  const text = buffer.toString('utf8');
  const ticks: Tick[] = [];
  let previous = -Infinity;
  let start = 0;
  let line = 0;

  while (start < text.length) {
    let end = text.indexOf('\n', start);

    if (end < 0) end = text.length;

    const row = text.slice(start, end).replace(/\r$/, '');

    start = end + 1;
    line++;

    if (row.length === 0) continue;

    const fields = row.split(',').map((f) => f.replace(/^"|"$/g, ''));
    const tick = parseMinuteBar(fields, `${where}:${line}`);

    if (tick.time <= previous) throw new Error(`${where}:${line}: timestamp ${fields[0]} is not after the previous row`);

    previous = tick.time;
    ticks.push(tick);
  }

  return ticks;
};

const readPrefix = (bytes: number) => {
  const fd = fs.openSync(dataFile, 'r');

  try {
    const buffer = Buffer.alloc(bytes);
    const read = fs.readSync(fd, buffer, 0, bytes, 0);

    if (read !== bytes) throw new Error(`${dataFile}: expected ${bytes} bytes for the door, read ${read}`);

    return buffer;
  } finally {
    fs.closeSync(fd);
  }
};

const volumesOf = (sessions: readonly MarketSession[]) => {
  const n = sessions.reduce((t, s) => t + s.bars.length, 0);
  const volume = new Float64Array(n);
  let k = 0;

  for (const s of sessions) for (const bar of s.bars) volume[k++] = bar.volume;

  return volume;
};

export const openPrefixDoor = (key: Exclude<DoorKey, 'FULL'>, purpose: string, log = true): Door => {
  const pin = prefixDoors[key];
  const buffer = readPrefix(pin.bytes);
  const hash = sha256(buffer);

  if (hash !== pin.sha256) throw new Error(`door ${key}: sha256 ${hash} differs from the pinned ${pin.sha256}`);
  if (buffer[buffer.length - 1] !== 0x0a) throw new Error(`door ${key}: the prefix does not end at a row boundary`);

  const ticks = parseRows(buffer, `${dataFile} (door ${key})`);

  if (ticks.length !== pin.rows) throw new Error(`door ${key}: ${ticks.length} rows, pinned ${pin.rows}`);
  if (isoOf(ticks.at(-1)!.time) !== pin.lastRowUtc)
    throw new Error(`door ${key}: last row ${isoOf(ticks.at(-1)!.time)}, pinned ${pin.lastRowUtc}`);

  const sessions = groupMarketSessions(ticks);
  const lastSession = sessions.at(-1)!.date;

  if (lastSession !== pin.last) throw new Error(`door ${key}: last session ${lastSession}, expected ${pin.last}`);
  if (sessions.length !== pin.sessions) throw new Error(`door ${key}: ${sessions.length} sessions, pinned ${pin.sessions}`);
  if (sessions[0]!.date !== chronology.firstSession) throw new Error(`door ${key}: first session ${sessions[0]!.date}`);

  if (log)
    recordDoor({ door: key, purpose, bytes: pin.bytes, sha256: hash, lastRowUtc: pin.lastRowUtc, lastSession });

  return {
    key,
    sessions,
    volume: volumesOf(sessions),
    bytes: pin.bytes,
    rows: ticks.length,
    sha256: hash,
    lastSession,
    splits: []
  };
};

// FULL: the whole canonical file. `guard` must have verified the committed frozen C24 selection first.
export const openFullDoor = (guard: { frozenSha256: string; committed: true }, purpose: string): Door => {
  if (!guard.committed || !/^[0-9a-f]{64}$/.test(guard.frozenSha256))
    throw new Error('FULL door: refused without the committed frozen C24 selection');

  const buffer = fs.readFileSync(dataFile);
  const hash = sha256(buffer);

  if (hash !== dataSha256) throw new Error(`FULL door: sha256 ${hash} differs from the pinned ${dataSha256}`);
  if (buffer.length !== dataBytes) throw new Error(`FULL door: ${buffer.length} bytes, pinned ${dataBytes}`);

  const ticks = parseRows(buffer, `${dataFile} (FULL)`);
  const grouped = groupMarketSessions(ticks);
  const { sessions, applied } = adjustSessionsForSplits(grouped, symbol, readSplits());
  const lastSession = sessions.at(-1)!.date;

  if (lastSession !== chronology.endpoint) throw new Error(`FULL door: last session ${lastSession}, expected ${chronology.endpoint}`);

  recordDoor({
    door: 'FULL',
    purpose: `${purpose} (guard ${guard.frozenSha256.slice(0, 12)})`,
    bytes: buffer.length,
    sha256: hash,
    lastRowUtc: isoOf(ticks.at(-1)!.time),
    lastSession
  });

  return {
    key: 'FULL',
    sessions,
    volume: volumesOf(sessions),
    bytes: buffer.length,
    rows: ticks.length,
    sha256: hash,
    lastSession,
    splits: applied.map(({ effectiveDate, ratio }) => ({ effectiveDate, ratio }))
  };
};

export const fixtureDoor = (sessions: MarketSession[]): Door => ({
  key: 'fixture',
  sessions,
  volume: volumesOf(sessions),
  bytes: 0,
  rows: sessions.reduce((t, s) => t + s.bars.length, 0),
  sha256: 'fixture',
  lastSession: sessions.at(-1)?.date ?? '',
  splits: []
});

// The coverage scan: the timestamp field only (no price is parsed), every row of the file. Per New York date: the
// regular-session bars, the first and last regular minute, the closing-print row and rows after the close. A session
// is complete when it has regular bars and a row at or after its scheduled close (the closing print or later rows),
// and every NYSE trading day between the first session and it is present.
export const coverageScan = () => {
  const buffer = fs.readFileSync(dataFile);
  const hash = sha256(buffer);
  const text = buffer.toString('utf8');
  const days = new Map<
    string,
    { regular: number; first: number; last: number; closingPrint: boolean; afterClose: number; early: boolean }
  >();
  let rows = 0;
  let start = 0;
  let lastUtc = '';

  while (start < text.length) {
    let end = text.indexOf('\n', start);

    if (end < 0) end = text.length;

    const comma = text.indexOf(',', start);
    const stamp = text.slice(start, comma).replaceAll('"', '');

    start = end + 1;

    if (!stamp) continue;

    rows++;
    lastUtc = stamp;

    const t = Date.parse(stamp) / 1000;
    const local = t + newYorkOffset(t);
    const date = new Date(local * 1000).toISOString().slice(0, 10);
    const minute = (local % 86400) / 60;
    const early = nyseEarlyCloses.has(date);
    const close = early ? 13 * 60 : 16 * 60;
    const d = days.get(date) ?? { regular: 0, first: NaN, last: NaN, closingPrint: false, afterClose: 0, early };

    if (minute >= 9 * 60 + 30 && minute < close) {
      d.regular++;
      if (Number.isNaN(d.first)) d.first = minute;
      d.last = minute;
    } else if (minute === close) d.closingPrint = true;
    else if (minute > close) d.afterClose++;

    days.set(date, d);
  }

  const sessions = [...days.entries()].filter(([, d]) => d.regular > 0).map(([date, d]) => ({ date, ...d }));
  const tradingDays: string[] = [];

  for (let t = Date.parse(`${chronology.firstSession}T00:00:00Z`); ; t += 86400000) {
    const date = new Date(t).toISOString().slice(0, 10);

    if (date > sessions.at(-1)!.date) break;

    const wd = new Date(t).getUTCDay();

    if (wd !== 0 && wd !== 6 && !nyseHolidays.has(date)) tradingDays.push(date);
  }

  const have = new Set(sessions.map((s) => s.date));
  const missing = tradingDays.filter((d) => !have.has(d));
  const extra = sessions.filter((s) => !tradingDays.includes(s.date)).map((s) => s.date);
  const complete = sessions.filter((s) => s.closingPrint || s.afterClose > 0);
  let endpoint = '';

  for (const s of complete) {
    if (missing.some((m) => m <= s.date)) break;
    endpoint = s.date;
  }

  return { file: dataFile, bytes: buffer.length, sha256: hash, rows, lastRowUtc: lastUtc, sessions, missing, extra, endpoint };
};
