// The study's only market-data access (PROTOCOL.md §3). Each request is checked before a byte is read: the end may not
// pass the data cap, the purpose must be authorised (the evaluation door needs every fold's sealed selection; the H
// development door needs the sealed evaluation; the parity door closes at the code freeze), a process opens one door
// end only, and only the main thread may open one. Each canonical file is read from its first byte in raw chunks; a
// line's leading UTC timestamp is recognised from its first 32 bytes and the first line whose timestamp is ≥ end + 1
// day 06:00Z stops the read **before it is tokenised** (lines after it are never parsed). Only the bytes read are
// hashed (prefix sha256); every opening is appended to results/doors.jsonl. Kept rows are parsed with the shared `parseMinuteBar`,
// grouped by the shared session builder and selected by the shared `selectRunSessions` (training partition, access
// 'optimization'), with only the split events effective on or before the end. Calendars must agree across symbols.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isMainThread } from 'node:worker_threads';
import {
  type SplitEvent,
  assertAccess,
  groupMarketSessions,
  parseMinuteBar,
  readSplits,
  resolveDataset,
  selectRunSessions
} from '#lib';
import type { Tick } from '#types';
import { type Dataset, fixtureDataset } from '../four-family/data.ts';
import { type FoldKey, type WindowKey, b5Symbols, dataRoot, foldKeys, resultFile, study } from './context.ts';
import { codeIsFrozen, verifySealed } from './records.ts';

export type DoorPurpose = 'development' | 'evaluation' | 'parity' | 'test';

export interface SymbolDoorRecord {
  symbol: string;
  dataFile: string;
  rowsParsed: number;
  boundDate: string;
  stop: string;
  prefixBytes: number;
  prefixSha256: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  bars: number;
  lastBarTime: string;
  splitAdjustments: { effectiveDate: string; ratio: number }[];
  loadedBarsSha256: string;
}

export interface Door {
  purpose: DoorPurpose;
  window: WindowKey | null;
  end: string;
  root: string;
  symbols: string[];
  datasets: Record<string, Dataset>;
  dates: string[];
  sessionCount: number;
  armStart: number; // first session index on or after the arming date
  records: Record<string, SymbolDoorRecord>;
  openedAt: string;
}

const secondsPerDay = 86400;

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * secondsPerDay * 1000).toISOString().slice(0, 10);

export const selectionFile = (fold: FoldKey) => resultFile('selections', fold, 'SELECTION.json');
export const evaluationRecordFile = () => resultFile('evaluation', 'RECORD.json');
export const doorLogFile = () => resultFile('doors.jsonl');

// sha256 of a dataset's arrays and dates, in the field order of the ranked-preemption door (sMinClose included), so
// that the hashes are comparable with its sealed records.
export const loadedBarsHash = (ds: Dataset) => {
  const hash = createHash('sha256');

  for (const array of [
    ds.sTime,
    ds.sCloseTime,
    ds.sOpen,
    ds.sHigh,
    ds.sLow,
    ds.sClose,
    ds.sClosingPrint,
    ds.sMinClose,
    ds.sBarStart,
    ds.sBarCount,
    ds.bTime,
    ds.bOpen,
    ds.bHigh,
    ds.bLow,
    ds.bClose
  ]) {
    hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
  }

  return hash.update(ds.dates.join(',')).digest('hex');
};

const leading = /^"?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)"?,/;

// Reads lines from the file's start; the first line whose UTC timestamp is ≥ bound (ISO 8601, compared as text) stops
// the read before it is tokenised. Returns the parsed ticks and the hash of the bytes before the stop line.
export const readBounded = (file: string, bound: string) => {
  const fd = fs.openSync(file, 'r');
  const chunk = Buffer.alloc(1 << 20);
  const hash = createHash('sha256');
  const ticks: Tick[] = [];
  let carry = Buffer.alloc(0);
  let consumed = 0;
  let previousTime = -Infinity;
  let line = 0;
  let stopped = false;

  const take = (bytes: Buffer) => {
    line++;

    const head = bytes.subarray(0, 32).toString('latin1').replace(/\r$/, '');

    if (head.length === 0) {
      return true;
    }

    const match = leading.exec(head);

    if (!match) {
      throw new Error(`${file}:${line}: the line does not start with an ISO 8601 UTC timestamp`);
    }

    if (match[1]! >= bound) {
      return false;
    }

    let text = bytes.toString('utf8');

    if (text.endsWith('\r')) {
      text = text.slice(0, -1);
    }

    const fields = text.split(',');

    fields[0] = fields[0]!.replace(/^"(.*)"$/, '$1');

    const tick = parseMinuteBar(fields, `${file}:${line}`);

    if (tick.time <= previousTime) {
      throw new Error(`${file}:${line}: timestamp ${fields[0]} is not after the previous row`);
    }

    previousTime = tick.time;
    ticks.push(tick);
    return true;
  };

  try {
    while (!stopped) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, consumed + carry.length);

      if (n === 0) {
        if (carry.length > 0) {
          if (take(carry)) {
            hash.update(carry);
            consumed += carry.length;
          } else {
            stopped = true;
          }
        }

        break;
      }

      const buffer = Buffer.concat([carry, chunk.subarray(0, n)]);
      let start = 0;

      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0x0a) {
          if (!take(buffer.subarray(start, i))) {
            stopped = true;
            break;
          }

          hash.update(buffer.subarray(start, i + 1));
          start = i + 1;
        }
      }

      consumed += start;
      carry = buffer.subarray(start);
    }
  } finally {
    fs.closeSync(fd);
  }

  return {
    ticks,
    rows: ticks.length,
    stop: stopped ? `first line with UTC timestamp ≥ ${bound} (not parsed)` : 'end of file',
    prefixBytes: consumed,
    prefixSha256: hash.digest('hex')
  };
};

export const splitsThrough = (end: string, splits: readonly SplitEvent[] = readSplits()) =>
  splits.filter((split) => split.effectiveDate <= end);

let processDoor: string | undefined;

const isTempRoot = (root: string) => path.resolve(root).startsWith(path.resolve(os.tmpdir()));

// The authorisation of a request, checked before any read.
export const authorise = (purpose: DoorPurpose, window: WindowKey | null, symbols: readonly string[], root: string) => {
  if (purpose === 'test') {
    if (!isTempRoot(root)) {
      throw new Error('refused: a test door reads only synthetic files under the OS temp directory');
    }

    return window ? study.windows[window].developmentEnd : study.dataCap;
  }

  if (isTempRoot(root)) {
    throw new Error('refused: a study door never reads from the temp directory');
  }

  for (const symbol of symbols) {
    if (!study.universe.includes(symbol)) {
      throw new Error(`refused: ${symbol} is not in the Study 4 universe`);
    }
  }

  if (purpose === 'development') {
    if (!window) {
      throw new Error('refused: a development door needs a window');
    }

    if (window === 'H' && !verifySealed(evaluationRecordFile())) {
      throw new Error('refused: H opens only after the sealed fold evaluation');
    }

    return study.windows[window].developmentEnd;
  }

  if (purpose === 'evaluation') {
    for (const fold of foldKeys) {
      if (!verifySealed(selectionFile(fold))) {
        throw new Error(`refused: the evaluation door needs every sealed fold selection (${fold} missing)`);
      }
    }

    return study.dataCap;
  }

  // parity: the B5/B4/B1 members only, through the cap, to reproduce known sealed anchors; closed while the frozen code
  // is in force (it reopens only between an amendment's code change and its re-freeze) unless the evaluation door is
  // authorised
  if (codeIsFrozen() && !foldKeys.every((fold) => verifySealed(selectionFile(fold)))) {
    throw new Error('refused: the parity door is closed while the frozen code is in force');
  }

  for (const symbol of symbols) {
    if (!(b5Symbols as readonly string[]).includes(symbol)) {
      throw new Error(`refused: the parity door reads B5 members only (${symbol})`);
    }
  }

  return study.dataCap;
};

export const openDoor = async ({
  purpose,
  window = null,
  symbols,
  root = dataRoot
}: {
  purpose: DoorPurpose;
  window?: WindowKey | null;
  symbols: readonly string[];
  root?: string;
}): Promise<Door> => {
  if (!isMainThread) {
    throw new Error('refused: only the main thread opens a door');
  }

  const end = authorise(purpose, window, symbols, root);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || end > study.dataCap) {
    throw new Error(`refused: ${end} is after the Study 4 data cap ${study.dataCap}`);
  }

  if (purpose !== 'test') {
    const key = `${end}`;

    if (processDoor !== undefined && processDoor !== key) {
      throw new Error(`refused: this process's door ends ${processDoor}; a door to ${end} needs its own process`);
    }

    processDoor = key;
  }

  const boundDate = `${addDays(end, 1)}T06:00:00Z`;
  const nextDay = Date.parse(boundDate) / 1000;
  const barCeiling = Date.parse(`${addDays(study.dataCap, 1)}T00:00:00Z`) / 1000;
  const splits = splitsThrough(end);
  const datasets: Record<string, Dataset> = {};
  const records: Record<string, SymbolDoorRecord> = {};
  let dates: string[] | undefined;

  for (const symbol of [...new Set(symbols)]) {
    const dataset = resolveDataset(symbol, 'training', root);
    const request = { dataset, endDate: end, warmupSessions: 0, splits, access: 'optimization' as const };

    assertAccess(request);

    const bounded = readBounded(dataset.file, boundDate);

    if (bounded.ticks.length > 0 && bounded.ticks.at(-1)!.time >= nextDay) {
      throw new Error(`door: ${symbol} retained a row at or after ${addDays(end, 1)}T06:00Z`);
    }

    const run = selectRunSessions(groupMarketSessions(bounded.ticks), request);
    const report = run.report!;
    const ds = fixtureDataset(run.history);

    ds.id = `${symbol}:${bounded.prefixSha256.slice(0, 16)}:${ds.lastDate}`;
    ds.dataHash = bounded.prefixSha256;

    if (ds.lastDate !== end) {
      throw new Error(`door: ${symbol} ends ${ds.lastDate}, not the requested session ${end}`);
    }

    const lastBar = ds.barCount > 0 ? ds.bTime[ds.barCount - 1]! : -Infinity;

    if (lastBar >= barCeiling || ds.sCloseTime[ds.sessionCount - 1]! >= barCeiling) {
      throw new Error(`door: ${symbol} holds a bar at or after the data cap`);
    }

    const expectedSplits = splits.filter((split) => split.symbol === symbol && split.effectiveDate > ds.firstDate);

    if (report.splitAdjustments.length !== expectedSplits.length) {
      throw new Error(
        `door: ${symbol} applied ${report.splitAdjustments.length} splits, expected ${expectedSplits.length}`
      );
    }

    if (dates === undefined) {
      dates = ds.dates;
    } else if (ds.dates.length !== dates.length || ds.dates.some((date, index) => date !== dates![index])) {
      throw new Error(`door: ${symbol}'s session calendar differs from the other symbols'`);
    }

    datasets[symbol] = ds;
    records[symbol] = {
      symbol,
      dataFile: dataset.file,
      rowsParsed: bounded.rows,
      boundDate,
      stop: bounded.stop,
      prefixBytes: bounded.prefixBytes,
      prefixSha256: bounded.prefixSha256,
      firstDate: ds.firstDate,
      lastDate: ds.lastDate,
      sessions: ds.sessionCount,
      bars: ds.barCount,
      lastBarTime: new Date(lastBar * 1000).toISOString(),
      splitAdjustments: report.splitAdjustments.map((split) => ({
        effectiveDate: split.effectiveDate,
        ratio: split.ratio
      })),
      loadedBarsSha256: loadedBarsHash(ds)
    };
  }

  if (!dates) {
    throw new Error('door: no symbol requested');
  }

  const armStart = dates.findIndex((date) => date >= study.armingStart);
  const openedAt = new Date().toISOString();

  if (purpose !== 'test') {
    fs.mkdirSync(path.dirname(doorLogFile()), { recursive: true });
    fs.appendFileSync(
      doorLogFile(),
      `${JSON.stringify({
        at: openedAt,
        pid: process.pid,
        purpose,
        window,
        end,
        symbols: Object.keys(records),
        prefixSha256: Object.fromEntries(
          Object.entries(records).map(([symbol, record]) => [symbol, record.prefixSha256])
        ),
        loadedBarsSha256: Object.fromEntries(
          Object.entries(records).map(([symbol, record]) => [symbol, record.loadedBarsSha256])
        )
      })}\n`
    );
  }

  return {
    purpose,
    window,
    end,
    root,
    symbols: Object.keys(datasets),
    datasets,
    dates,
    sessionCount: dates.length,
    armStart: armStart < 0 ? dates.length : armStart,
    records,
    openedAt
  };
};
