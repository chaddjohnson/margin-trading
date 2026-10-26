// Post-cutoff minute data for the prospective comparison (PROTOCOL.md §4): verified, write-once snapshots under
// data/prospective/<id>/ (recorded with every hash in research/prospective-b4-b5-shadow/snapshots/<id>.json), and the
// composition of the frozen canonical files with a snapshot under evaluations/pools/forward/<id>/data/. The canonical
// data/<SYMBOL>/data.csv files are only read, and only when they still hash to the frozen pins.
import path from 'node:path';
import fs from 'fs-extra';
import { type SplitEvent, nyseCalendarCoverage, nyseEarlyCloses, nyseHolidays, parseSplits, readSplits } from '#lib';
import { type DistributionLedger, readDistributionLedger } from '../../multi-etf-allocator/dataset.ts';
import { verifyProspectiveFreeze } from './freeze.ts';
import { freezeFileOf, prospective, readSealed, sha256, sha256File, writeOnce } from './protocol.ts';

export const snapshotIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const rowPattern = /^"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)",([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)$/;
const distributionHeader =
  'etf,ex_date,pay_date,amount,amount_method,ex_date_method,pay_date_method,close_before,source';

export const snapshotDirOf = (id: string, root = prospective.snapshotsRoot) => path.join(root, id);
export const snapshotRecordOf = (id: string, dir = prospective.dir) => path.join(dir, 'snapshots', `${id}.json`);

const newYorkParts = (seconds: number) => {
  const text = new Date(seconds * 1000).toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false });

  return { date: text.slice(0, 10), minutes: Number(text.slice(11, 13)) * 60 + Number(text.slice(14, 16)) };
};

export const isNyseSession = (date: string) =>
  date >= nyseCalendarCoverage.first &&
  date <= nyseCalendarCoverage.last &&
  ![0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
  !nyseHolidays.has(date);

// Only completed sessions: every session before the import day (New York), and every member trading in the last
// minutes of every session (canonical 2024–2026: every member's last regular bar is within 2 minutes of the close).
export const completenessProblems = (
  sessionsBySymbol: Record<string, SessionSummary[]>,
  expected: readonly string[],
  today: string,
  window = 15
) => {
  const problems: string[] = [];
  const last = expected.at(-1);

  if (last !== undefined && last >= today) {
    problems.push(
      `the snapshot holds ${last}, not before today (${today}, New York): only completed sessions are imported`
    );
  }

  for (const date of expected) {
    const closeMinutes = nyseEarlyCloses.has(date) ? 13 * 60 : 16 * 60;
    const short = Object.entries(sessionsBySymbol)
      .filter(
        ([, sessions]) =>
          (sessions.find((session) => session.date === date)?.lastRegularMinute ?? -1) < closeMinutes - window
      )
      .map(([symbol]) => symbol);

    if (short.length) {
      problems.push(
        `${date}: ${short.join(' ')} without a bar in the last ${window} regular minutes (an incomplete session?)`
      );
    }
  }

  return problems;
};

// The NYSE trading days from `first` through `last` (weekdays that are not exchange holidays).
export const nyseSessions = (first: string, last: string) => {
  if (last > nyseCalendarCoverage.last) {
    throw new Error(
      `${last} is past the NYSE calendar's coverage (${nyseCalendarCoverage.last}, src/lib/calendar.ts): extend the calendar (a reviewed change) before importing later sessions`
    );
  }

  const days: string[] = [];

  for (let time = Date.parse(`${first}T12:00:00Z`); ; time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);

    if (date > last) {
      break;
    }

    const weekday = new Date(time).getUTCDay();

    if (weekday !== 0 && weekday !== 6 && !nyseHolidays.has(date)) {
      days.push(date);
    }
  }

  return days;
};

interface SessionSummary {
  date: string;
  regularBars: number;
  firstRegularOpen: number;
  lastRegularClose: number;
  lastRegularMinute: number; // minutes after New York midnight of the session's last regular-hours bar
}

// Validates one symbol's post-cutoff file and summarizes its sessions.
export const parseSnapshotFile = (symbol: string, text: string, cutoff = prospective.cutoff) => {
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const sessions = new Map<string, SessionSummary>();
  let previous = -Infinity;

  lines.forEach((line, index) => {
    const where = `${symbol}.csv line ${index + 1}`;
    const match = line.trim().match(rowPattern);

    if (!match) {
      throw new Error(`${where}: not "YYYY-MM-DDTHH:MM:SSZ",open,high,low,close,volume`);
    }

    const time = Date.parse(match[1]!) / 1000;
    const [open, high, low, close, volume] = match.slice(2).map(Number) as [number, number, number, number, number];

    if (![open, high, low, close].every((value) => Number.isFinite(value) && value > 0) || !(volume >= 0)) {
      throw new Error(`${where}: prices must be positive and the volume non-negative`);
    }

    if (high < Math.max(open, close, low) || low > Math.min(open, close, high)) {
      throw new Error(`${where}: high/low inconsistent with open/close`);
    }

    if (!(time > previous)) {
      throw new Error(`${where}: timestamps must strictly increase (a duplicate or out-of-order row)`);
    }

    previous = time;

    const { date, minutes } = newYorkParts(time);

    if (date <= cutoff) {
      throw new Error(`${where}: ${date} is not after the cutoff ${cutoff}; a snapshot holds only new sessions`);
    }

    const session = sessions.get(date) ?? {
      date,
      regularBars: 0,
      firstRegularOpen: NaN,
      lastRegularClose: NaN,
      lastRegularMinute: -1
    };
    const closeMinutes = nyseEarlyCloses.has(date) ? 13 * 60 : 16 * 60;

    if (minutes >= 9 * 60 + 30 && minutes < closeMinutes) {
      if (session.regularBars === 0) {
        session.firstRegularOpen = open;
      }

      session.regularBars++;
      session.lastRegularClose = close;
      session.lastRegularMinute = minutes;
    }

    sessions.set(date, session);
  });

  return { rows: lines.length, sessions: [...sessions.values()] };
};

// The last regular-hours close of the cutoff session in a canonical file (the reference for the first overnight move).
const cutoffClose = async (symbol: string, cutoff = prospective.cutoff) => {
  const text = await fs.readFile(`data/${symbol}/data.csv`, 'utf8');
  let close = NaN;

  for (const line of text.split('\n')) {
    const match = line.trim().match(rowPattern);

    if (match && match[1]!.startsWith(cutoff.slice(0, 7))) {
      const { date, minutes } = newYorkParts(Date.parse(match[1]!) / 1000);

      if (date === cutoff && minutes >= 9 * 60 + 30 && minutes < 16 * 60) {
        close = Number(match[5]);
      }
    }
  }

  return close;
};

// Overnight moves beyond the limit must be declared splits of the snapshot, or explicitly confirmed as genuine price
// moves (`--confirm-move SYMBOL:DATE`, recorded in the snapshot).
export const undeclaredSplitMoves = (
  symbol: string,
  sessions: SessionSummary[],
  referenceClose: number,
  declared: readonly SplitEvent[],
  limit = prospective.splitMoveLimit,
  confirmed: readonly string[] = []
) => {
  const moves: string[] = [];
  let previousClose = referenceClose;

  for (const session of sessions) {
    const move = session.firstRegularOpen / previousClose - 1;
    const split = declared.find((event) => event.symbol === symbol && event.effectiveDate === session.date);

    if (Math.abs(move) > limit && !split && !confirmed.includes(`${symbol}:${session.date}`)) {
      moves.push(`${symbol} ${session.date}: ${(move * 100).toFixed(1)}% overnight`);
    }

    // A declared split must explain the move: the adjusted move (open × ratio ÷ previous close) is within the limit.
    if (split && Math.abs((session.firstRegularOpen * split.ratio) / previousClose - 1) > limit) {
      moves.push(
        `${symbol} ${session.date}: the declared ${split.ratio}-for-1 split does not explain a ${(move * 100).toFixed(1)}% overnight move`
      );
    }

    previousClose = session.lastRegularClose;
  }

  return moves;
};

export interface SnapshotRecord {
  bodyHash: string;
  id: string;
  version: string;
  importedAt: string;
  source: string;
  cutoff: string;
  first: string;
  last: string;
  sessions: number;
  files: Record<string, { file: string; sha256: string; rows: number; sessions: number }>;
  splits: SplitEvent[];
  distributions: { file: string; sha256: string; through: Record<'VGT' | 'VOOG', string>; rows: number } | null;
  confirmedMoves: string[];
  freezeBodyHash: string;
}

// Distribution rows for VOOG/VGT after the frozen ledger's coverage: checked before they are stored.
export const distributionProblems = (
  text: string,
  through: string | undefined,
  coverage: Record<'VGT' | 'VOOG', string>
) => {
  const [header, ...rows] = text.trim().split('\n');
  const problems: string[] = [];
  const seen = new Set<string>();
  const date = /^\d{4}-\d{2}-\d{2}$/;

  if (header !== distributionHeader) {
    problems.push(`the header must be "${distributionHeader}"`);
  }

  if (!through || !date.test(through)) {
    problems.push('--distributions-through YYYY-MM-DD is required');
  } else if (through <= coverage.VGT || through <= coverage.VOOG) {
    problems.push(`--distributions-through ${through} must be after the frozen coverage (${coverage.VGT})`);
  }

  rows.forEach((line, index) => {
    const [etf, exDate, payDate, amount, , , , closeBefore] = line.split(',');
    const where = `distributions row ${index + 2}`;

    if (etf !== 'VGT' && etf !== 'VOOG') {
      problems.push(`${where}: only VGT and VOOG distributions are credited`);
      return;
    }

    if (!date.test(exDate ?? '') || !date.test(payDate ?? '') || payDate! < exDate!) {
      problems.push(`${where}: ex/pay dates must be YYYY-MM-DD with pay ≥ ex`);
    } else if (!isNyseSession(exDate!) || !isNyseSession(payDate!)) {
      problems.push(
        `${where}: ex-date ${exDate} and pay date ${payDate} must be NYSE sessions (the engine books on session dates)`
      );
    } else if (exDate! <= coverage[etf]) {
      problems.push(`${where}: ${etf} ${exDate} is inside the frozen ledger's coverage (through ${coverage[etf]})`);
    } else if (through && exDate! > through) {
      problems.push(`${where}: ${exDate} is after --distributions-through ${through}`);
    }

    if (!(Number(amount) > 0) || !(Number(closeBefore) > 0)) {
      problems.push(`${where}: amount and close_before must be positive numbers`);
    } else if (Number(amount) / Number(closeBefore) > 0.03) {
      problems.push(
        `${where}: a ${((Number(amount) / Number(closeBefore)) * 100).toFixed(2)}% distribution is implausible (> 3% of close_before; split units?)`
      );
    }

    if (seen.has(`${etf}:${exDate}`)) {
      problems.push(`${where}: duplicate ${etf} ${exDate}`);
    }

    seen.add(`${etf}:${exDate}`);
  });

  return { problems, rows: rows.length };
};

export const importSnapshot = async (options: {
  from: string;
  id: string;
  source: string;
  splitsFile?: string;
  distributionsFile?: string;
  distributionsThrough?: string;
  confirmMoves?: string[];
  dir?: string;
  snapshotsRoot?: string;
  today?: string; // the New York date of the import (tests)
}) => {
  const dir = options.dir ?? prospective.dir;
  const freezeFile = freezeFileOf(dir);

  if (!(await fs.pathExists(freezeFile))) {
    throw new Error(`${freezeFile} does not exist: the protocol must be frozen before any post-cutoff bar is imported`);
  }

  const verified = await verifyProspectiveFreeze(dir);

  if (!verified.frozen || verified.failures.length > 0) {
    throw new Error(
      `the prospective freeze does not verify; nothing is imported:\n  ${verified.failures.join('\n  ')}`
    );
  }

  const freeze = verified.freeze;
  const confirmed = options.confirmMoves ?? [];

  if (!snapshotIdPattern.test(options.id)) {
    throw new Error(`snapshot id must match ${snapshotIdPattern}`);
  }

  const target = snapshotDirOf(options.id, options.snapshotsRoot);
  const recordFile = snapshotRecordOf(options.id, dir);

  if ((await fs.pathExists(target)) || (await fs.pathExists(recordFile))) {
    throw new Error(`snapshot ${options.id} exists: a snapshot is written once (import a new id)`);
  }

  const declared = options.splitsFile
    ? parseSplits(await fs.readFile(options.splitsFile, 'utf8'), options.splitsFile)
    : [];

  for (const event of declared) {
    if (event.effectiveDate <= prospective.cutoff) {
      throw new Error(`declared split ${event.symbol} ${event.effectiveDate} is not after the cutoff`);
    }
  }

  const parsed: Record<string, ReturnType<typeof parseSnapshotFile> & { text: string }> = {};
  const problems: string[] = [];

  for (const symbol of prospective.members) {
    const file = path.join(options.from, `${symbol}.csv`);

    if (!(await fs.pathExists(file))) {
      throw new Error(`${file} is missing: a snapshot needs ${prospective.members.join(', ')}`);
    }

    const text = await fs.readFile(file, 'utf8');

    parsed[symbol] = { ...parseSnapshotFile(symbol, text), text };
  }

  const last = Object.values(parsed)
    .map((item) => item.sessions.at(-1)?.date ?? '')
    .sort()
    .at(-1)!;

  if (!last) {
    throw new Error('the snapshot holds no session');
  }

  const today = options.today ?? newYorkParts(Date.now() / 1000).date;
  const expected = nyseSessions(prospective.firstForwardSession, last);

  problems.push(
    ...completenessProblems(
      Object.fromEntries(prospective.members.map((symbol) => [symbol, parsed[symbol]!.sessions])),
      expected,
      today
    )
  );

  for (const symbol of prospective.members) {
    const dates = parsed[symbol]!.sessions.map((session) => session.date);
    const missing = expected.filter((date) => !dates.includes(date));
    const extra = dates.filter((date) => !expected.includes(date));

    if (missing.length || extra.length) {
      problems.push(
        `${symbol}: sessions differ from the NYSE calendar ${prospective.firstForwardSession} → ${last} (missing ${missing.slice(0, 5).join(' ') || 'none'}; not trading days ${extra.slice(0, 5).join(' ') || 'none'})`
      );
    }

    const empty = parsed[symbol]!.sessions.filter((session) => session.regularBars === 0).map(
      (session) => session.date
    );

    if (empty.length) {
      problems.push(`${symbol}: sessions without regular-hours bars: ${empty.slice(0, 5).join(' ')}`);
    }

    if (empty.length === 0) {
      problems.push(
        ...undeclaredSplitMoves(
          symbol,
          parsed[symbol]!.sessions,
          await cutoffClose(symbol),
          declared,
          prospective.splitMoveLimit,
          confirmed
        )
      );
    }
  }

  if (problems.length) {
    throw new Error(`snapshot refused:\n  ${problems.join('\n  ')}`);
  }

  let distributions: SnapshotRecord['distributions'] = null;

  if (options.distributionsFile) {
    const text = await fs.readFile(options.distributionsFile, 'utf8');
    const checked = distributionProblems(text, options.distributionsThrough, (await readDistributionLedger()).coverage);

    if (checked.problems.length) {
      throw new Error(`distributions refused:\n  ${checked.problems.join('\n  ')}`);
    }

    distributions = {
      file: 'distributions.csv',
      sha256: sha256(text),
      through: { VGT: options.distributionsThrough!, VOOG: options.distributionsThrough! },
      rows: checked.rows
    };
  }

  const files: SnapshotRecord['files'] = {};

  for (const symbol of prospective.members) {
    const file = path.join(target, `${symbol}.csv`);

    await fs.outputFile(file, parsed[symbol]!.text);
    files[symbol] = {
      file,
      sha256: await sha256File(file),
      rows: parsed[symbol]!.rows,
      sessions: parsed[symbol]!.sessions.length
    };
  }

  if (options.distributionsFile) {
    await fs.copy(options.distributionsFile, path.join(target, 'distributions.csv'));
  }

  const record = await writeOnce(recordFile, {
    id: options.id,
    version: prospective.version,
    importedAt: new Date().toISOString(),
    source: options.source,
    cutoff: prospective.cutoff,
    first: prospective.firstForwardSession,
    last,
    sessions: expected.length,
    files,
    splits: declared,
    distributions,
    confirmedMoves: confirmed,
    freezeBodyHash: freeze.bodyHash
  });

  await fs.outputFile(path.join(target, 'snapshot.json'), `${JSON.stringify(record, null, 2)}\n`);

  return record as unknown as SnapshotRecord;
};

export const listSnapshots = async (dir = prospective.dir) => {
  const folder = path.join(dir, 'snapshots');

  return (await fs.pathExists(folder))
    ? (await fs.readdir(folder))
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.slice(0, -5))
        .sort()
    : [];
};

// The frozen canonical files followed by a verified snapshot, with the split and distribution lists to load them.
export const composeSnapshot = async (
  id: string,
  pins: Record<string, string>,
  options: { dir?: string; snapshotsRoot?: string; outputRoot?: string } = {}
): Promise<{
  record: SnapshotRecord;
  root: string;
  composed: Record<string, string>;
  splits: SplitEvent[];
  ledger: DistributionLedger;
}> => {
  const record = await readSealed<SnapshotRecord & { bodyHash: string }>(snapshotRecordOf(id, options.dir));
  const root = path.join(options.outputRoot ?? prospective.outputRoot, id, 'data');
  const composed: Record<string, string> = {};

  await fs.ensureDir(root);
  await fs.copy('data/partitions.json', path.join(root, 'partitions.json'));

  for (const symbol of prospective.members) {
    const canonical = `data/${symbol}/data.csv`;
    const canonicalHash = await sha256File(canonical);

    if (canonicalHash !== pins[symbol]) {
      throw new Error(
        `${canonical} hashes to ${canonicalHash}, not the frozen ${pins[symbol]}: the historical part is not the frozen all`
      );
    }

    const snapshotFile = path.join(snapshotDirOf(id, options.snapshotsRoot), `${symbol}.csv`);

    if ((await sha256File(snapshotFile)) !== record.files[symbol]!.sha256) {
      throw new Error(`${snapshotFile} no longer hashes to its snapshot record`);
    }

    const head = await fs.readFile(canonical, 'utf8');
    const tail = await fs.readFile(snapshotFile, 'utf8');
    const file = path.join(root, symbol, 'data.csv');

    await fs.outputFile(file, `${head.endsWith('\n') ? head : `${head}\n`}${tail}`);
    composed[symbol] = await sha256File(file);
  }

  const frozenLedger = await readDistributionLedger();
  let ledger = frozenLedger;

  if (record.distributions) {
    const text = await fs.readFile(path.join(snapshotDirOf(id, options.snapshotsRoot), 'distributions.csv'), 'utf8');

    if (sha256(text) !== record.distributions.sha256) {
      throw new Error(`snapshot ${id}: distributions.csv no longer hashes to its record`);
    }
    const [, ...rows] = text.trim().split('\n');
    const added = rows.map((line) => {
      const [etf, exDate, payDate, amount, amountMethod, exDateMethod, payDateMethod, closeBefore] = line.split(',');

      return {
        etf,
        exDate,
        payDate,
        amount: Number(amount),
        amountMethod,
        exDateMethod,
        payDateMethod,
        closeBefore: Number(closeBefore)
      };
    }) as unknown as DistributionLedger['distributions'];

    ledger = {
      file: `${frozenLedger.file} + ${id}/distributions.csv`,
      sha256: sha256(`${frozenLedger.sha256}:${record.distributions.sha256}`),
      distributions: [...frozenLedger.distributions, ...added],
      coverage: record.distributions.through
    };
  }

  return { record, root, composed, splits: [...readSplits(), ...record.splits], ledger };
};
