// The study's data doors (PROTOCOL.md §3). Rows are parsed exactly as the repository's loader parses them
// (csv-parse, `parseMinuteBar`, strictly ascending times) and grouped with `groupMarketSessions` (regular session plus
// the closing print). The development door reads only the pinned byte prefix of the canonical file — every row through
// 2024-12-31 New York time — and verifies its length, rows, last row and sha256 before grouping, so no price after 2024
// ever enters the process. The full door reads the whole file, checks its pinned hash, applies the recorded splits (VGT
// 8-for-1 on 2026-04-21) by the repository's forward adjustment, and opens only after the frozen selection is committed.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import fs from 'fs-extra';
import { parse } from 'csv-parse';
import { adjustSessionsForSplits, groupMarketSessions, minuteCsvDelimiter, parseMinuteBar, readSplits } from '#lib';
import type { MarketSession, Tick } from '#types';
import { nyseHolidays } from '../lib/calendar.ts';
import { dataFile, developmentDoor, frozenSelectionFile, fullDoor, symbol } from './context.ts';

export interface LoadedSessions {
  door: 'development' | 'full' | 'fixture';
  sessions: MarketSession[];
  bytes: number;
  rows: number;
  sha256: string;
  firstDate: string;
  lastDate: string;
  splitsApplied: { effectiveDate: string; ratio: number }[];
}

export const parseTicks = async (buffer: Buffer, where: string): Promise<Tick[]> => {
  const parser = Readable.from([buffer]).pipe(
    parse({ delimiter: minuteCsvDelimiter, relax_column_count: true, info: true })
  );
  const ticks: Tick[] = [];
  let previousTime = -Infinity;

  for await (const { record, info } of parser as AsyncIterable<{ record: string[]; info: { lines: number } }>) {
    const tick = parseMinuteBar(record, `${where}:${info.lines}`);

    if (tick.time <= previousTime)
      throw new Error(`${where}:${info.lines}: timestamp ${record[0]} is not after the previous row`);

    previousTime = tick.time;
    ticks.push(tick);
  }

  return ticks;
};

export const readPrefix = async (file: string, bytes: number) => {
  const handle = await fs.promises.open(file, 'r');

  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);

    if (bytesRead !== bytes)
      throw new Error(`${file}: expected ${bytes} bytes for the development prefix, read ${bytesRead}`);

    return buffer;
  } finally {
    await handle.close();
  }
};

export const sha256 = (buffer: Buffer | string) => createHash('sha256').update(buffer).digest('hex');

// The development door: 2016-01-04 through 2024-12-31, nothing later.
export const loadDevelopmentSessions = async (file = dataFile): Promise<LoadedSessions> => {
  const buffer = await readPrefix(file, developmentDoor.prefixBytes);
  const hash = sha256(buffer);

  if (hash !== developmentDoor.prefixSha256)
    throw new Error(
      `${file}: development prefix sha256 ${hash} differs from the pinned ${developmentDoor.prefixSha256}`
    );

  const ticks = await parseTicks(buffer, `${file} (development prefix)`);

  if (ticks.length !== developmentDoor.prefixRows)
    throw new Error(`${file}: the development prefix holds ${ticks.length} rows, not ${developmentDoor.prefixRows}`);

  const lastTime = new Date(ticks.at(-1)!.time * 1000).toISOString().replace('.000Z', 'Z');

  if (lastTime !== developmentDoor.lastRowTime)
    throw new Error(`${file}: the development prefix ends at ${lastTime}, not ${developmentDoor.lastRowTime}`);

  const sessions = groupMarketSessions(ticks);
  const lastDate = sessions.at(-1)!.date;

  if (lastDate > developmentDoor.end)
    throw new Error(`development door: a session dated ${lastDate} is after ${developmentDoor.end}`);
  if (sessions.length !== developmentDoor.sessions)
    throw new Error(`development door: ${sessions.length} sessions, not ${developmentDoor.sessions}`);

  // no split is recorded for VGT before 2025, so the development sessions need no adjustment (verified, not assumed)
  const { applied } = adjustSessionsForSplits(sessions, symbol, readSplits());

  if (applied.length) throw new Error(`development door: unexpected split adjustment ${JSON.stringify(applied)}`);

  return {
    door: 'development',
    sessions,
    bytes: buffer.length,
    rows: ticks.length,
    sha256: hash,
    firstDate: sessions[0]!.date,
    lastDate,
    splitsApplied: []
  };
};

// The frozen selection must be committed (tracked, identical to HEAD) before the full door opens.
export const frozenSelectionCommitted = () => {
  try {
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', frozenSelectionFile], { stdio: 'ignore' });
    execFileSync('git', ['ls-files', '--error-unmatch', frozenSelectionFile], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

// The full door (2016-01-04 → 2026-10-30): refuses unless the freeze exists, is committed, and the caller presents its
// body hash.
export const loadFullSessions = async (token: { frozenBodyHash: string }, file = dataFile): Promise<LoadedSessions> => {
  if (!fs.existsSync(frozenSelectionFile))
    throw new Error(`full door: ${frozenSelectionFile} does not exist; freeze first`);
  if (!frozenSelectionCommitted()) throw new Error(`full door: ${frozenSelectionFile} is not committed to git`);

  const frozen = JSON.parse(fs.readFileSync(frozenSelectionFile, 'utf8')) as { bodyHash: string };

  if (frozen.bodyHash !== token.frozenBodyHash)
    throw new Error('full door: the token does not match the sealed selection');

  const buffer = await fs.promises.readFile(file);
  const hash = sha256(buffer);

  if (hash !== fullDoor.fileSha256)
    throw new Error(`${file}: sha256 ${hash} differs from the pinned ${fullDoor.fileSha256}`);

  const ticks = await parseTicks(buffer, file);
  const grouped = groupMarketSessions(ticks);
  const { sessions, applied } = adjustSessionsForSplits(grouped, symbol, readSplits());

  if (sessions.length !== fullDoor.sessions)
    throw new Error(`full door: ${sessions.length} sessions, not ${fullDoor.sessions}`);

  return {
    door: 'full',
    sessions,
    bytes: buffer.length,
    rows: ticks.length,
    sha256: hash,
    firstDate: sessions[0]!.date,
    lastDate: sessions.at(-1)!.date,
    splitsApplied: applied.map(({ effectiveDate, ratio }) => ({ effectiveDate, ratio }))
  };
};

// Minute coverage of a door's sessions against the NYSE calendar (PROTOCOL.md §3.3): missing sessions, partial
// sessions (< 50% of the scheduled regular-session minutes have a bar), early closes, closing prints, and the named
// boundary sessions.
export const coverageOf = (sessions: readonly MarketSession[], named: readonly string[] = []) => {
  const first = sessions[0]!.date;
  const last = sessions.at(-1)!.date;
  const present = new Set(sessions.map((s) => s.date));
  const expected: string[] = [];

  for (let t = Date.parse(`${first}T00:00:00Z`); t <= Date.parse(`${last}T00:00:00Z`); t += 86400000) {
    const d = new Date(t);
    const date = d.toISOString().slice(0, 10);

    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !nyseHolidays.has(date)) expected.push(date);
  }

  const scheduled = (s: MarketSession) => (s.isEarlyClose ? 210 : 390);
  const ratio = sessions.map((s) => s.bars.length / scheduled(s));
  const sorted = [...ratio].sort((a, b) => a - b);
  const describeSession = (s: MarketSession) => ({
    date: s.date,
    bars: s.bars.length,
    scheduledMinutes: scheduled(s),
    coverage: Math.round((s.bars.length / scheduled(s)) * 1e4) / 1e4,
    earlyClose: s.isEarlyClose,
    closingPrint: s.closingPrint !== undefined,
    firstBarUtc: s.bars[0] ? new Date(s.bars[0].time * 1000).toISOString() : null,
    lastBarUtc: s.bars.at(-1) ? new Date(s.bars.at(-1)!.time * 1000).toISOString() : null
  });

  return {
    first,
    last,
    sessions: sessions.length,
    expectedSessions: expected.length,
    missing: expected.filter((d) => !present.has(d)),
    onClosedDays: sessions.filter((s) => !expected.includes(s.date)).map((s) => s.date),
    partial: sessions.filter((s) => s.bars.length < 0.5 * scheduled(s)).map(describeSession),
    withoutClosingPrint: sessions.filter((s) => s.closingPrint === undefined).map((s) => s.date),
    earlyCloses: sessions.filter((s) => s.isEarlyClose).map((s) => s.date),
    coverage: {
      median: sorted[Math.floor(sorted.length / 2)] ?? NaN,
      minimum: sorted[0] ?? NaN,
      below90: ratio.filter((r) => r < 0.9).length
    },
    named: named
      .map((date) => sessions.find((s) => s.date === date))
      .map((s, i) => (s ? describeSession(s) : { date: named[i], missing: true }))
  };
};
