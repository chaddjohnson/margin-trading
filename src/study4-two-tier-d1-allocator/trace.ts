// A book's trace (ENGINE_CONTRACT.md §1): the frozen ShadowBook driven over its own symbol's sessions in exactly the
// order of the frozen traceBook (src/portfolio-aware-d1/trace.ts) — virtual exit, virtual fill, completed-minute
// decision; at the close, exit then fill on the closing print; then the after-close update — plus what Study 4's
// gates and role checks need: each setup's activation and end (armed/pending spans) and the deep-path armings. Under
// shadow semantics the trades never depend on the allocator; `assertSameAsFrozen` proves the trades equal traceBook's.
import { type Dataset, computeReferenceHighs } from '../four-family/data.ts';
import type { PhenotypeName, Sym } from '../multi-etf-allocator/context.ts';
import { ShadowBook, type VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { traceBook, traceSettings, tradesSignature } from '../portfolio-aware-d1/trace.ts';
import { type BookSpec, gridKey, paramsOfGrid } from './books.ts';

export interface ExecSettings {
  costBps: number;
  rate: number;
  stopFill: 'stop' | 'next-open';
  stopSlippageBps: number;
  notional: number;
}

export const baseSettings = (overrides: Partial<ExecSettings> = {}): ExecSettings => ({
  costBps: 5,
  rate: 0.11,
  stopFill: 'stop',
  stopSlippageBps: 0,
  notional: 100000,
  ...overrides
});

export interface ArmedSpan {
  from: number; // activation time (end of the activating minute)
  to: number; // the trade's entry time, or Infinity while armed or pending at the end
  kind: 'deep' | 'continuation' | 'swing';
}

export interface Trace {
  key: string;
  symbol: string;
  grid: string;
  trades: VirtualTrade[];
  spans: ArmedSpan[];
  deepArmings: number;
  continuationArmings: number;
  setups: number;
  armedAtEnd: boolean;
  pendingAtEnd: boolean;
  lookback: number; // L, for the reference high (gate G2)
  x: number; // X as a fraction
}

export const traceKeyOf = (
  ds: Dataset,
  symbol: string,
  gridText: string,
  settings: ExecSettings,
  armStart: number,
  startIndex: number,
  endIndex: number
) =>
  `${ds.id}|${ds.sessionCount}|${symbol}|${gridText}|${settings.costBps}|${settings.rate}|${settings.stopFill}|${settings.stopSlippageBps}|${settings.notional}|${armStart}|${startIndex}|${endIndex}`;

export const buildTrace = (
  ds: Dataset,
  book: Pick<BookSpec, 'symbol' | 'grid'>,
  settings: ExecSettings,
  armStart: number,
  startIndex = 0,
  endIndex = ds.sessionCount - 1
): Trace => {
  if (!(startIndex >= 0 && startIndex < endIndex && endIndex < ds.sessionCount)) {
    throw new Error(`${book.symbol}: bad trace window ${startIndex}..${endIndex}`);
  }

  const params = paramsOfGrid(book.symbol, book.grid);
  const shadow = new ShadowBook(
    book.symbol as Sym,
    'study4' as PhenotypeName,
    ds,
    params,
    {
      notional: settings.notional,
      rate: settings.rate,
      stopFill: settings.stopFill,
      costBps: settings.costBps,
      stopSlippageBps: settings.stopSlippageBps
    },
    armStart
  );

  for (let s = startIndex + 1; s <= endIndex; s++) {
    const count = ds.sBarCount[s]!;

    shadow.beginSession(s);

    for (let k = 0; k < count; k++) {
      const decision = shadow.exitAt(k);

      if (decision) {
        shadow.close(s, decision);
      }

      if (shadow.fillAt(k)) {
        shadow.open(s, k);
      }

      const signal = shadow.processBar(s, k);

      if (signal) {
        shadow.commit(signal, s, 'refused');
      }
    }

    const closing = shadow.exitAt(count);

    if (closing) {
      shadow.close(s, closing);
    }

    if (shadow.fillAt(count)) {
      shadow.open(s, count);
    }

    shadow.afterSession(s);
  }

  shadow.finish(endIndex);

  for (const trade of shadow.trades) {
    trade.allocator = '';
    trade.fundedLotId = -1;
  }

  const machine = shadow.machine;
  const spans: ArmedSpan[] = shadow.trades.map((trade) => ({
    from: trade.activationTime,
    to: trade.entryIndex >= 0 ? trade.entryTime : Infinity,
    kind: trade.setupKind
  }));

  if (machine.setup && !machine.pending) {
    spans.push({ from: machine.setup.activationTime, to: Infinity, kind: machine.setup.kind });
  }

  return {
    key: traceKeyOf(ds, book.symbol, gridKey(book.grid), settings, armStart, startIndex, endIndex),
    symbol: book.symbol,
    grid: gridKey(book.grid),
    trades: shadow.trades,
    spans,
    deepArmings: machine.activationsByKind.deep,
    continuationArmings: machine.activationsByKind.continuation,
    setups: machine.setups,
    armedAtEnd: machine.state === 'ARMED',
    pendingAtEnd: Boolean(shadow.order),
    lookback: params.tickWindowSize,
    x: params.targetPercentChange
  };
};

// The trades equal the frozen traceBook's, field for field (content signature).
export const assertSameAsFrozen = (
  ds: Dataset,
  book: Pick<BookSpec, 'symbol' | 'grid'>,
  settings: ExecSettings,
  armStart: number,
  trace: Trace
) => {
  const frozen = traceBook(
    ds,
    { symbol: book.symbol, name: 'study4', params: paramsOfGrid(book.symbol, book.grid), short: '' },
    traceSettings(settings.costBps, {
      rate: settings.rate,
      stopFill: settings.stopFill,
      stopSlippageBps: settings.stopSlippageBps,
      notional: settings.notional
    }),
    { armStart, startIndex: 0, endIndex: ds.sessionCount - 1, splitsSha256: 'study4' }
  );
  const a = tradesSignature(frozen.trades.map((trade) => ({ ...trade, phenotype: 'x' as PhenotypeName })));
  const b = tradesSignature(trace.trades.map((trade) => ({ ...trade, phenotype: 'x' as PhenotypeName })));

  if (a !== b) {
    throw new Error(`${book.symbol} ${gridKey(book.grid)}: the Study 4 trace differs from the frozen traceBook`);
  }

  return a;
};

// The reference high per session for lookback L (the frozen Levels/computeReferenceHighs), cached per dataset.
const highsCache = new WeakMap<Dataset, Map<number, Float64Array>>();

export const referenceHighs = (ds: Dataset, lookback: number) => {
  let byL = highsCache.get(ds);

  if (!byL) {
    byL = new Map();
    highsCache.set(ds, byL);
  }

  let highs = byL.get(lookback);

  if (!highs) {
    highs = computeReferenceHighs(ds, lookback);
    byL.set(lookback, highs);
  }

  return highs;
};

// A bounded per-process cache of traces (least recently used evicted).
export class TraceCache {
  private readonly map = new Map<string, Trace>();
  hits = 0;
  misses = 0;

  constructor(
    readonly capacity = 5000,
    readonly datasets: Record<string, Dataset>,
    readonly armStart: number,
    readonly endIndex: number
  ) {}

  get(book: Pick<BookSpec, 'symbol' | 'grid'>, settings: ExecSettings): Trace {
    const ds = this.datasets[book.symbol];

    if (!ds) {
      throw new Error(`no data for ${book.symbol}`);
    }

    const key = traceKeyOf(ds, book.symbol, gridKey(book.grid), settings, this.armStart, 0, this.endIndex);
    const found = this.map.get(key);

    if (found) {
      this.hits++;
      this.map.delete(key);
      this.map.set(key, found);
      return found;
    }

    this.misses++;

    const trace = buildTrace(ds, book, settings, this.armStart, 0, this.endIndex);

    this.map.set(key, trace);

    if (this.map.size > this.capacity) {
      this.map.delete(this.map.keys().next().value!);
    }

    return trace;
  }

  get size() {
    return this.map.size;
  }
}
