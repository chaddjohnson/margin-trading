// The study's data doors (PROTOCOL.md §3). Rows are parsed exactly as the repository's loader parses them
// (csv-parse, `parseMinuteBar`, strictly ascending times) and grouped with `groupMarketSessions` (regular session plus
// the closing print), but the development door reads only the pinned byte prefix of the canonical file — every row
// through 2024-12-31 New York time — and verifies its length and sha256 before parsing, so no price after 2024 ever
// enters the process. The validation door reads the whole file, checks its pinned hash, applies the recorded splits
// (VGT 8-for-1 on 2026-04-21) by the repository's forward adjustment, and opens only after the freeze.
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import fs from 'fs-extra';
import { parse } from 'csv-parse';
import { adjustSessionsForSplits, groupMarketSessions, minuteCsvDelimiter, parseMinuteBar, readSplits } from '#lib';
import type { MarketSession, Tick } from '#types';
import { dataFile, developmentDoor, frozenSelectionFile, symbol, validationDoor } from './context.ts';

export interface LoadedSessions {
  door: 'development' | 'validation' | 'fixture';
  sessions: MarketSession[];
  bytes: number;
  rows: number;
  sha256: string;
  firstDate: string;
  lastDate: string;
  splitsApplied: { effectiveDate: string; ratio: number }[];
}

const parseTicks = async (buffer: Buffer, where: string): Promise<Tick[]> => {
  const parser = Readable.from([buffer]).pipe(
    parse({ delimiter: minuteCsvDelimiter, relax_column_count: true, info: true })
  );
  const ticks: Tick[] = [];
  let previousTime = -Infinity;

  for await (const { record, info } of parser as AsyncIterable<{ record: string[]; info: { lines: number } }>) {
    const tick = parseMinuteBar(record, `${where}:${info.lines}`);

    if (tick.time <= previousTime) {
      throw new Error(`${where}:${info.lines}: timestamp ${record[0]} is not after the previous row`);
    }

    previousTime = tick.time;
    ticks.push(tick);
  }

  return ticks;
};

const readPrefix = async (file: string, bytes: number) => {
  const handle = await fs.promises.open(file, 'r');

  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);

    if (bytesRead !== bytes) {
      throw new Error(`${file}: expected ${bytes} bytes for the development prefix, read ${bytesRead}`);
    }

    return buffer;
  } finally {
    await handle.close();
  }
};

const sha256 = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

// The development door: 2016-01-04 through 2024-12-31, nothing later.
export const loadDevelopmentSessions = async (file = dataFile): Promise<LoadedSessions> => {
  const buffer = await readPrefix(file, developmentDoor.prefixBytes);
  const hash = sha256(buffer);

  if (hash !== developmentDoor.prefixSha256) {
    throw new Error(
      `${file}: development prefix sha256 ${hash} differs from the pinned ${developmentDoor.prefixSha256}`
    );
  }

  const ticks = await parseTicks(buffer, `${file} (development prefix)`);

  if (ticks.length !== developmentDoor.prefixRows) {
    throw new Error(`${file}: the development prefix holds ${ticks.length} rows, not ${developmentDoor.prefixRows}`);
  }

  const lastTime = new Date(ticks.at(-1)!.time * 1000).toISOString().replace('.000Z', 'Z');

  if (lastTime !== developmentDoor.lastRowTime) {
    throw new Error(`${file}: the development prefix ends at ${lastTime}, not ${developmentDoor.lastRowTime}`);
  }

  const sessions = groupMarketSessions(ticks);
  const lastDate = sessions.at(-1)!.date;

  if (lastDate > developmentDoor.end) {
    throw new Error(`development door: a session dated ${lastDate} is after ${developmentDoor.end}`);
  }

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

// The validation door: refuses unless the freeze exists and the token from the validation stage is presented.
export const loadValidationSessions = async (
  token: { frozenBodyHash: string },
  file = dataFile
): Promise<LoadedSessions> => {
  if (!fs.existsSync(frozenSelectionFile)) {
    throw new Error(`validation door: ${frozenSelectionFile} does not exist; the selection must be frozen first`);
  }

  const frozen = JSON.parse(fs.readFileSync(frozenSelectionFile, 'utf8')) as { bodyHash: string };

  if (frozen.bodyHash !== token.frozenBodyHash) {
    throw new Error('validation door: the token does not match the sealed selection');
  }

  const buffer = await fs.promises.readFile(file);
  const hash = sha256(buffer);

  if (hash !== validationDoor.fileSha256) {
    throw new Error(`${file}: sha256 ${hash} differs from the pinned ${validationDoor.fileSha256}`);
  }

  const ticks = await parseTicks(buffer, file);
  const grouped = groupMarketSessions(ticks);
  const { sessions, applied } = adjustSessionsForSplits(grouped, symbol, readSplits());

  return {
    door: 'validation',
    sessions,
    bytes: buffer.length,
    rows: ticks.length,
    sha256: hash,
    firstDate: sessions[0]!.date,
    lastDate: sessions.at(-1)!.date,
    splitsApplied: applied.map(({ effectiveDate, ratio }) => ({ effectiveDate, ratio }))
  };
};

// Synthetic or test sessions, never from the canonical file.
export const fixtureSessions = (sessions: MarketSession[]): LoadedSessions => ({
  door: 'fixture',
  sessions,
  bytes: 0,
  rows: sessions.reduce((total, session) => total + session.bars.length, 0),
  sha256: 'fixture',
  firstDate: sessions[0]?.date ?? '',
  lastDate: sessions.at(-1)?.date ?? '',
  splitsApplied: []
});
