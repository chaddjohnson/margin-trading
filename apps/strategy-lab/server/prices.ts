// Chart prices. Real symbols come from the canonical minute files through the repository's own loader and session
// builder (src/lib/csv.ts, src/lib/session.ts): regular-session minute closes (x = the minute's START, the data's
// convention) plus each session's closing print (x = the scheduled close). Prices are forward-adjusted for splits to a
// run's basis date with src/lib/corporateActions.ts splitFactor — the same rule the run's events were computed with.
// Synthetic prices come only from the demo fixture and are only served for synthetic runs.
//
// Long windows are decimated with a min/max-per-bucket rule (both extremes of every bucket are kept, in time order), so
// the line never loses a spike. Decimation only affects the line: event markers keep their exact instants and prices.

import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { type SplitEvent, readSplits, splitFactor } from '../../../src/lib/corporateActions.ts';
import { loadCsvMinuteBacktestData } from '../../../src/lib/csv.ts';
import { groupMarketSessions } from '../../../src/lib/session.ts';
import type { SymbolInfo } from '../shared/contract.ts';

export interface Series {
  key: string;
  t: Float64Array; // Unix seconds
  v: Float64Array; // raw (unadjusted) prices
  sessionOf: Int32Array; // point → session index
  sessionDates: string[]; // New York dates, ascending
  sessionFirst: Int32Array; // session → first point
  sessionLast: Int32Array; // session → last point
  stamp: string; // file size + mtime, to notice appended data
}

export interface PricePoints {
  points: [number, number][]; // [ms, price]
  decimated: boolean;
  rawPoints: number;
  firstSession: string | null;
  lastSession: string | null;
}

const SYMBOL = /^[A-Z0-9][A-Z0-9.-]{0,9}$/;

const lowerBound = (a: Float64Array, x: number) => {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (a[m]! < x) lo = m + 1;
    else hi = m;
  }
  return lo;
};

const dateBound = (dates: string[], d: string, strict: boolean) => {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (strict ? dates[m]! <= d : dates[m]! < d) lo = m + 1;
    else hi = m;
  }
  return lo;
};

/** Points of a series between two inclusive session dates, optionally narrowed to [fromMs, toMs], split-adjusted. */
export function windowPoints(
  s: Series,
  factorOf: (sessionIndex: number) => number,
  fromDate: string,
  toDate: string,
  fromMs: number | null,
  toMs: number | null,
  maxPoints: number
): PricePoints {
  const firstS = dateBound(s.sessionDates, fromDate, false);
  const lastS = dateBound(s.sessionDates, toDate, true) - 1;
  if (firstS > lastS) return { points: [], decimated: false, rawPoints: 0, firstSession: null, lastSession: null };
  let lo = s.sessionFirst[firstS]!;
  let hi = s.sessionLast[lastS]!;
  if (fromMs !== null) lo = Math.max(lo, lowerBound(s.t, fromMs / 1000));
  if (toMs !== null) hi = Math.min(hi, lowerBound(s.t, toMs / 1000 + 1e-6) - 1);
  const value = (i: number) => s.v[i]! * factorOf(s.sessionOf[i]!);
  const out: [number, number][] = [];
  const n = hi - lo + 1;
  const range = { firstSession: s.sessionDates[firstS] ?? null, lastSession: s.sessionDates[lastS] ?? null };
  if (n <= 0) return { points: out, decimated: false, rawPoints: 0, ...range };
  if (n <= maxPoints) {
    for (let i = lo; i <= hi; i++) out.push([s.t[i]! * 1000, value(i)]);
    return { points: out, decimated: false, rawPoints: n, ...range };
  }
  const buckets = Math.max(1, Math.floor((maxPoints - 2) / 2));
  const size = n / buckets;
  out.push([s.t[lo]! * 1000, value(lo)]);
  for (let b = 0; b < buckets; b++) {
    const a = lo + Math.floor(b * size);
    const z = Math.min(hi, lo + Math.floor((b + 1) * size) - 1);
    let iMin = a;
    let iMax = a;
    for (let i = a + 1; i <= z; i++) {
      const v = value(i);
      if (v < value(iMin)) iMin = i;
      if (v > value(iMax)) iMax = i;
    }
    const first = Math.min(iMin, iMax);
    const second = Math.max(iMin, iMax);
    if (first > lo) out.push([s.t[first]! * 1000, value(first)]);
    if (second !== first && second < hi) out.push([s.t[second]! * 1000, value(second)]);
  }
  out.push([s.t[hi]! * 1000, value(hi)]);
  return { points: out, decimated: true, rawPoints: n, ...range };
}

/** The adjusted price of the last point at or before an instant (for placing markers of events without a price). */
export function priceAtOrBefore(s: Series, factorOf: (i: number) => number, ms: number): number | null {
  const i = lowerBound(s.t, ms / 1000 + 1e-6) - 1;
  return i < 0 ? null : s.v[i]! * factorOf(s.sessionOf[i]!);
}

export class MarketPrices {
  private cache = new Map<string, Promise<Series>>();
  private splits: SplitEvent[];

  constructor(
    readonly repoRoot: string,
    private log: (m: string) => void = () => {}
  ) {
    this.splits = readSplits(join(repoRoot, 'config/market-events/splits.json'));
  }

  file(symbol: string) {
    if (!SYMBOL.test(symbol)) throw new Error(`invalid symbol ${symbol}`);
    return join(this.repoRoot, 'data', symbol, 'data.csv');
  }

  /** Symbols with a canonical file, with their first/last New York session read from the file's ends. */
  symbols(): SymbolInfo[] {
    const dataDir = join(this.repoRoot, 'data');
    if (!existsSync(dataDir)) return [];
    return readdirSync(dataDir)
      .filter((d) => SYMBOL.test(d) && existsSync(join(dataDir, d, 'data.csv')))
      .sort()
      .map((symbol) => {
        const file = join(dataDir, symbol, 'data.csv');
        const size = statSync(file).size;
        return { symbol, bytes: size, firstSession: endDate(file, 'first'), lastSession: endDate(file, 'last') };
      });
  }

  /** Multiplier converting a price in `fromBasis` share units into `toBasis` share units (splits between the two). */
  conversion(symbol: string, fromBasis: string, toBasis: string): number {
    if (fromBasis === toBasis) return 1;
    return fromBasis > toBasis
      ? splitFactor(this.splits, symbol, toBasis, fromBasis)
      : 1 / splitFactor(this.splits, symbol, fromBasis, toBasis);
  }

  factorFor(symbol: string, basisDate: string, s: Series) {
    const factors = s.sessionDates.map((d) => splitFactor(this.splits, symbol, basisDate, d));
    return (i: number) => factors[i]!;
  }

  async series(symbol: string): Promise<Series> {
    const file = this.file(symbol);
    const st = statSync(file);
    const stamp = `${st.size}:${st.mtimeMs}`;
    const key = `${symbol}`;
    const cached = this.cache.get(key);
    if (cached) {
      const s = await cached.catch(() => null);
      if (s && s.stamp === stamp) return s;
    }
    const loading = this.load(symbol, file, stamp);
    this.cache.set(key, loading);
    loading.catch(() => this.cache.delete(key));
    return loading;
  }

  private async load(symbol: string, file: string, stamp: string): Promise<Series> {
    const started = Date.now();
    const sessions = groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));
    let n = 0;
    for (const s of sessions) n += s.bars.length + (s.closingPrint === undefined ? 0 : 1);
    const t = new Float64Array(n);
    const v = new Float64Array(n);
    const sessionOf = new Int32Array(n);
    const sessionFirst = new Int32Array(sessions.length);
    const sessionLast = new Int32Array(sessions.length);
    let k = 0;
    sessions.forEach((s, si) => {
      sessionFirst[si] = k;
      for (const b of s.bars) {
        t[k] = b.time;
        v[k] = b.close;
        sessionOf[k++] = si;
      }
      if (s.closingPrint !== undefined) {
        t[k] = s.closeTime;
        v[k] = s.closingPrint;
        sessionOf[k++] = si;
      }
      sessionLast[si] = k - 1;
    });
    this.log(`prices: loaded ${symbol} (${sessions.length} sessions, ${n} points) in ${Date.now() - started} ms`);
    return {
      key: symbol,
      t,
      v,
      sessionOf,
      sessionDates: sessions.map((s) => s.date),
      sessionFirst,
      sessionLast,
      stamp
    };
  }
}

/** The synthetic demo series (daily closes of the checked-in fixture), as a Series with one point per session. */
export function syntheticSeries(fixtureFile: string): Series {
  const ds = JSON.parse(readFileSync(fixtureFile, 'utf8')) as {
    priceSeries: { bars: { t: string; d: string; c: number }[] };
  };
  const bars = ds.priceSeries.bars;
  const idx = Int32Array.from(bars.map((_, i) => i));
  return {
    key: 'synthetic',
    t: Float64Array.from(bars.map((b) => Date.parse(b.t) / 1000)),
    v: Float64Array.from(bars.map((b) => b.c)),
    sessionOf: idx,
    sessionDates: bars.map((b) => b.d),
    sessionFirst: idx,
    sessionLast: idx,
    stamp: 'fixture'
  };
}

const NY_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/** The New York date of a canonical file's first or last row, read from the file's ends only. */
function endDate(file: string, which: 'first' | 'last'): string | null {
  const fd = openSync(file, 'r');
  try {
    const size = statSync(file).size;
    const len = Math.min(size, 256);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, which === 'first' ? 0 : size - len);
    const lines = buf
      .toString('utf8')
      .split('\n')
      .filter((l) => l.trim());
    const line = which === 'first' ? lines[0] : lines.at(-1);
    const m = /^"?(\d{4}-\d{2}-\d{2}T[\d:.]+Z)"?,/.exec(line ?? '');
    return m ? NY_DATE.format(new Date(m[1]!)) : null;
  } finally {
    closeSync(fd);
  }
}
