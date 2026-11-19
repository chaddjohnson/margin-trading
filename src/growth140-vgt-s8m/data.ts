// The data doors (PROTOCOL.md §2). The development door reads ONLY the physical byte-prefix file of the canonical VGT
// minute file (every row through New York 2024-12-31), verified by size and sha256 at every opening; no process that
// searches, qualifies or selects ever opens the canonical file. The full door (2016-01-04 → 2026-10-30, the browser's
// path: partition `all`, forward split adjustment) opens only after the frozen selection is committed (validate.ts).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { MarketSession } from '#types';
import { nyseEarlyCloses, nyseHolidays } from '../lib/calendar.ts';
import { resolveDataset } from '../lib/dataset.ts';
import { loadDatasetSessions } from '../lib/evaluation.ts';
import { chronology, data, symbol } from './context.ts';
import type { DoorData } from './engine.ts';

export const sha256File = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export const sha256Prefix = (file: string, bytes: number) => {
  const fd = fs.openSync(file, 'r');
  const hash = createHash('sha256');
  const buffer = Buffer.alloc(1 << 20);
  let done = 0;

  try {
    while (done < bytes) {
      const n = fs.readSync(fd, buffer, 0, Math.min(buffer.length, bytes - done), done);

      if (n <= 0) throw new Error(`${file} is shorter than ${bytes} bytes`);
      hash.update(buffer.subarray(0, n));
      done += n;
    }
  } finally {
    fs.closeSync(fd);
  }

  return hash.digest('hex');
};

// The development prefix: size, sha256 and the last row's time, verified before a byte is parsed.
export const verifyDevelopmentFile = () => {
  const stat = fs.statSync(data.devFile);

  if (stat.size !== data.devBytes) throw new Error(`${data.devFile}: ${stat.size} bytes, expected ${data.devBytes}`);

  const sha = sha256File(data.devFile);

  if (sha !== data.devSha256) throw new Error(`${data.devFile}: sha256 ${sha}, expected ${data.devSha256}`);

  const tail = fs.readFileSync(data.devFile).subarray(-200).toString('utf8').trim().split('\n').at(-1)!;
  const last = tail.split(',')[0]!.replaceAll('"', '');

  if (!(last < data.devFirstExcludedUtc)) throw new Error(`${data.devFile}: last row ${last} is not before the cap`);

  return { sha256: sha, lastRowUtc: last };
};

// Builds the prefix from the canonical file (once): every row before devFirstExcludedUtc, byte for byte.
export const buildDevelopmentFile = () => {
  if (fs.existsSync(data.devFile)) return verifyDevelopmentFile();

  const prefix = sha256Prefix(data.canonicalFile, data.devBytes);

  if (prefix !== data.devSha256) throw new Error(`canonical prefix sha256 ${prefix}, expected ${data.devSha256}`);

  const fd = fs.openSync(data.canonicalFile, 'r');
  const buffer = Buffer.alloc(data.devBytes);

  fs.readSync(fd, buffer, 0, data.devBytes, 0);
  fs.closeSync(fd);
  fs.mkdirSync(new URL('.', `file://${data.devFile}`).pathname, { recursive: true });
  fs.writeFileSync(`${data.devFile}.tmp`, buffer);
  fs.renameSync(`${data.devFile}.tmp`, data.devFile);

  return verifyDevelopmentFile();
};

const noSplitIn = (from: string, to: string) => {
  const splits = JSON.parse(fs.readFileSync(data.splitsFile, 'utf8')) as {
    splits?: { symbol: string; effective?: string; date?: string }[];
  };
  const list = Array.isArray(splits) ? splits : (splits.splits ?? []);

  for (const s of list as { symbol: string; effective?: string; date?: string; effectiveDate?: string }[]) {
    const d = s.effective ?? s.effectiveDate ?? s.date ?? '';

    if (s.symbol === symbol && d >= from && d <= to)
      throw new Error(`a ${symbol} split (${d}) lies inside ${from} → ${to}`);
  }
};

export const loadDevelopmentDoor = async (): Promise<DoorData> => {
  const v = verifyDevelopmentFile();

  noSplitIn(chronology.firstSession, chronology.developmentEnd);

  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(symbol, data.devFile),
    startDate: chronology.firstSession,
    endDate: chronology.developmentEnd,
    warmupSessions: 0
  });
  const sessions = loaded.history;

  if (loaded.warmup !== 0) throw new Error('the development door has no warm-up sessions');
  if (sessions[0]!.date !== chronology.firstSession || sessions.at(-1)!.date !== chronology.developmentEnd)
    throw new Error(`development door covers ${sessions[0]!.date} → ${sessions.at(-1)!.date}`);
  if (sessions.length !== data.devSessions) throw new Error(`development door: ${sessions.length} sessions`);

  return {
    name: 'development',
    history: sessions,
    warmup: 0,
    dataSha256: v.sha256,
    from: chronology.firstSession,
    to: chronology.developmentEnd
  };
};

// The full door, exactly the browser's loading path (Strategy Lab trading-run.ts: partition `all`, the requested
// dates, warm-up 0 because 2016-01-04 is the file's first session, access 'manual evaluation').
export const loadFullDoorUnchecked = async (): Promise<DoorData> => {
  const sha = sha256File(data.canonicalFile);

  if (sha !== data.canonicalSha256) throw new Error(`canonical file sha256 ${sha}, expected ${data.canonicalSha256}`);

  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(symbol, 'all'),
    startDate: chronology.firstSession,
    endDate: chronology.validationEnd,
    warmupSessions: 0,
    access: 'manual evaluation'
  });

  if (loaded.history[0]!.date !== chronology.firstSession || loaded.history.at(-1)!.date !== chronology.validationEnd)
    throw new Error(`full door covers ${loaded.history[0]!.date} → ${loaded.history.at(-1)!.date}`);

  return {
    name: 'full',
    history: loaded.history,
    warmup: loaded.warmup,
    dataSha256: loaded.report!.dataSha256!,
    from: chronology.firstSession,
    to: chronology.validationEnd
  };
};

// A digest of the sessions themselves (dates, minute bars, closing prints): two doors agree on a span iff equal.
export const sessionsDigest = (sessions: readonly MarketSession[]) => {
  const hash = createHash('sha256');

  for (const s of sessions) {
    hash.update(`${s.date}|${s.openTime}|${s.closeTime}|${s.closingPrint ?? ''}|`);
    for (const b of s.bars) hash.update(`${b.time},${b.open},${b.high},${b.low},${b.close},${b.volume};`);
  }

  return hash.digest('hex');
};

// Minute coverage against the NYSE calendar: missing sessions, partial sessions (< 90% of the scheduled regular
// minutes have a bar), early closes and sessions without a closing print.
export const coverageOf = (sessions: readonly MarketSession[], from: string, to: string) => {
  const have = new Set(sessions.map((s) => s.date));
  const missing: string[] = [];
  const day = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);

  for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const d = day.toISOString().slice(0, 10);
    const wd = day.getUTCDay();

    if (wd === 0 || wd === 6 || nyseHolidays.has(d)) continue;
    if (!have.has(d)) missing.push(d);
  }

  const partial: { date: string; bars: number; scheduled: number }[] = [];
  const noClosingPrint: string[] = [];
  let bars = 0;

  for (const s of sessions) {
    const scheduled = Math.round((s.closeTime - s.openTime) / 60);

    bars += s.bars.length;
    if (s.bars.length < 0.9 * scheduled) partial.push({ date: s.date, bars: s.bars.length, scheduled });
    if (s.closingPrint === undefined) noClosingPrint.push(s.date);
  }

  return {
    from,
    to,
    sessions: sessions.length,
    regularMinuteBars: bars,
    missingSessions: missing,
    extraSessions: sessions.filter((s) => nyseHolidays.has(s.date)).map((s) => s.date),
    earlyCloses: sessions.filter((s) => s.isEarlyClose).map((s) => s.date),
    earlyClosesExpected: [...nyseEarlyCloses].filter((d) => d >= from && d <= to).sort(),
    partialSessions: partial,
    sessionsWithoutClosingPrint: noClosingPrint
  };
};
