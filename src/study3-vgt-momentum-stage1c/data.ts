// The study's only market-data access (PROTOCOL.md §2): data/VGT/data.csv through a bounded reader. It reads raw byte
// chunks, splits lines by hand, checks each line's leading UTC timestamp field and compares its UTC date with the
// bound date (the end + 2 days: the shared loader's retention bound) **before** tokenising; the first line at or after
// the bound stops the read unparsed. Earlier lines are split and parsed with the shared `parseMinuteBar`, grouped into
// sessions and selected by the shared functions (no split file is read), giving Stage 1b's dataset — the audit proves
// it with the loaded-bar hash. One door per process: the first load fixes it, a different end is refused.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import {
  type DatasetSelection,
  assertAccess,
  groupMarketSessions,
  parseMinuteBar,
  resolveDataset,
  selectRunSessions,
  windowInterval
} from '#lib';
import type { Tick } from '#types';
import { type Dataset, fixtureDataset } from '../four-family/data.ts';
import { loadedBarsHash } from '../study3-vgt-momentum-stage1b/data.ts';
import { study } from './context.ts';

export {
  indexOfDate,
  loadedBarsHash,
  poisonAfter,
  truncate,
  withMissingBars
} from '../study3-vgt-momentum-stage1b/data.ts';

export interface DoorRecord {
  symbol: string;
  endDate: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  bars: number;
  lastBarTime: string;
  dataFile: string;
  rowsParsed: number;
  boundDate: string;
  stop: string; // "first line with UTC date ≥ <bound>" (its content is never parsed or recorded) or "end of file"
  prefixBytes: number; // bytes of the file before the stop line
  prefixSha256: string; // sha256 of those bytes
  loadedBarsSha256: string;
  access: 'optimization';
  partition: 'training';
  splitAdjustments: number;
}

const secondsPerDay = 86400;
const barCeiling = Date.parse(`${study.dataCap}T00:00:00Z`) / 1000 + secondsPerDay; // 2023-12-30T00:00Z

export const assertEndAllowed = (end: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error(`not a date: ${end}`);
  }

  if (end > study.dataCap) {
    throw new Error(`refused: ${end} is after the Stage 1c data cap ${study.dataCap}`);
  }
};

// The in-memory door: nothing after the request and nothing on or after 2023-12-30 UTC.
export const assertDoor = (ds: Dataset, end: string) => {
  if (ds.lastDate > end || ds.lastDate > study.dataCap) {
    throw new Error(`door: the dataset ends ${ds.lastDate}, after ${end}`);
  }

  const lastBar = ds.barCount > 0 ? ds.bTime[ds.barCount - 1]! : -Infinity;
  const lastClose = ds.sessionCount > 0 ? ds.sCloseTime[ds.sessionCount - 1]! : -Infinity;

  if (lastBar >= barCeiling || lastClose >= barCeiling) {
    throw new Error('door: a retained bar is at or after 2023-12-30T00:00Z');
  }
};

const leading = /^"?(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}Z"?,/;

// Reads lines from the file's start: lines before `fromTime` are parsed and dropped (as the shared loader); the first
// line whose UTC date is ≥ `boundDate` stops the read before it is tokenised. Returns the kept ticks and the prefix.
export const readBounded = (file: string, fromTime: number, boundDate: string) => {
  const fd = fs.openSync(file, 'r');
  const chunk = Buffer.alloc(65536);
  const hash = createHash('sha256');
  const ticks: Tick[] = [];
  let carry = Buffer.alloc(0);
  let consumed = 0; // file offset of `carry`'s first byte
  let previousTime = -Infinity;
  let rows = 0;
  let line = 0;
  let stopped = false;

  // false: the line is at or after the bound (not parsed)
  const take = (bytes: Buffer) => {
    line++;

    // only the first 32 bytes are decoded to recognise the timestamp field and its UTC date
    const head = bytes.subarray(0, 32).toString('latin1').replace(/\r$/, '');

    if (head.length === 0) {
      return true;
    }

    const match = leading.exec(head);

    if (!match) {
      throw new Error(`${file}:${line}: the line does not start with a quoted or bare ISO 8601 UTC timestamp`);
    }

    if (match[1]! >= boundDate) {
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
    rows++;

    if (tick.time >= fromTime) {
      ticks.push(tick);
    }

    return true;
  };

  try {
    while (!stopped) {
      const n = fs.readSync(fd, chunk, 0, chunk.length, consumed + carry.length);

      if (n === 0) {
        if (carry.length > 0 && take(carry)) {
          hash.update(carry);
          consumed += carry.length;
        } else if (carry.length > 0) {
          stopped = true;
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
    rows,
    stop: stopped ? `first line with UTC date ≥ ${boundDate}` : 'end of file',
    prefixBytes: consumed,
    prefixSha256: hash.digest('hex')
  };
};

let processDoor: string | undefined;
const cache = new Map<string, { ds: Dataset; door: DoorRecord }>();

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * secondsPerDay * 1000).toISOString().slice(0, 10);

// `audit` (no strategy run) may load every history end in one process; every other caller gets one door per process.
export const loadVgt = async (
  end: string,
  root = 'data',
  options: { audit?: boolean } = {}
): Promise<{ ds: Dataset; door: DoorRecord }> => {
  assertEndAllowed(end); // before a byte is read

  if (!options.audit) {
    if (processDoor !== undefined && processDoor !== end) {
      throw new Error(`refused: this process's door is ${processDoor}; a load to ${end} needs its own process`);
    }

    processDoor = end;
  }

  const key = `${root}|${end}`;
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const dataset: DatasetSelection = resolveDataset(study.symbol, 'training', root);
  // no split file is read: the loaded-bar hash proves that no split applies to 2016–2023 (Stage 1b's dataset)
  const request = { dataset, endDate: end, warmupSessions: 0, splits: [], access: 'optimization' as const };

  assertAccess(request);

  // The shared loader's bounds (src/lib/evaluation.ts loadDatasetSessions with no warm-up).
  const window = windowInterval(dataset.partition!, dataset.interval!, undefined, end);
  const fromTime =
    window.start === null ? -Infinity : Date.parse(`${window.start}T00:00:00Z`) / 1000 - 14 * secondsPerDay;
  const boundDate = addDays(end, 2);

  if (boundDate > addDays(study.dataCap, 2)) {
    throw new Error('refused: the read bound passes the cap');
  }

  const bounded = readBounded(dataset.file, fromTime, boundDate);
  const nextDay = Date.parse(`${addDays(end, 1)}T06:00:00Z`) / 1000;

  // no retained row may belong to a later trading day (true for the five ends, each followed by a weekend or holiday)
  if (bounded.ticks.length && bounded.ticks.at(-1)!.time >= nextDay) {
    throw new Error(`door: a retained row is at or after ${addDays(end, 1)}T06:00Z`);
  }

  const run = selectRunSessions(groupMarketSessions(bounded.ticks), request);
  const report = run.report!;
  const ds = fixtureDataset(run.history);

  ds.id = `${study.symbol}:${bounded.prefixSha256.slice(0, 16)}:${ds.lastDate}`;

  if (ds.firstDate !== study.firstSession) {
    throw new Error(`the data start ${ds.firstDate}, not ${study.firstSession}`);
  }

  if (ds.lastDate !== end) {
    throw new Error(`the data end ${ds.lastDate}, not the requested session ${end}`);
  }

  if (report.splitAdjustments.length !== 0) {
    throw new Error('a split adjustment was applied');
  }

  assertDoor(ds, end);

  const door: DoorRecord = {
    symbol: study.symbol,
    endDate: end,
    firstDate: ds.firstDate,
    lastDate: ds.lastDate,
    sessions: ds.sessionCount,
    bars: ds.barCount,
    lastBarTime: new Date(ds.bTime[ds.barCount - 1]! * 1000).toISOString(),
    dataFile: dataset.file,
    rowsParsed: bounded.rows,
    boundDate,
    stop: bounded.stop,
    prefixBytes: bounded.prefixBytes,
    prefixSha256: bounded.prefixSha256,
    loadedBarsSha256: loadedBarsHash(ds),
    access: 'optimization',
    partition: 'training',
    splitAdjustments: report.splitAdjustments.length
  };
  const value = { ds, door };

  cache.set(key, value);
  return value;
};
