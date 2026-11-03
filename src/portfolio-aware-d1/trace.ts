// A book's trace: the frozen ShadowBook (src/multi-etf-allocator/shadow.ts) driven over its own symbol's sessions alone,
// in exactly the per-bar order the allocator drives it (virtual exit, then virtual fill, then the completed minute's
// rebound test; at the close the exit and the fill on the closing print; then the session's after-close update).
// Under shadow semantics a book commits every signal it produces and the allocator's answer never feeds back into
// it (ShadowBook.commit is called for a refusal too; only its `allocator`/`fundedLotId` labels differ), so the trace
// is the book's full virtual-trade sequence inside any allocator run with the same data, window, parameters and
// execution settings. The replay (./replay.ts) funds from these traces; parity.ts proves the equality against the
// N-book engine trade for trade.
//
// A trace is keyed by every input that can change it (the cache key): the symbol, the dataset's content hash, id,
// first and last dates and session count (window, partition and warm-up), the recorded splits, every machine
// parameter, the notional, the interest rate, the per-side cost, the stop fill and stop slippage, the arming and
// accounting sessions, and the sha256 of the strategy machine and shadow book source files.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { Dataset } from '../four-family/data.ts';
import { protocol } from '../multi-etf-allocator/context.ts';
import { type BookSettings, type VirtualTrade, ShadowBook } from '../multi-etf-allocator/shadow.ts';
import type { PhenotypeName, Sym } from '../multi-etf-allocator/context.ts';
import type { BookPhenotype } from './nbook/engine.ts';

export const traceVersion = 'portfolio-aware-d1-trace-v1';

// The source files whose code decides a book's trades.
export const traceCodeFiles = [
  'src/multi-etf-allocator/shadow.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/four-family/data.ts',
  'src/portfolio-aware-d1/trace.ts'
] as const;

let codeHashCache: Record<string, string> | undefined;

export const traceCodeHashes = () => {
  if (!codeHashCache) {
    codeHashCache = Object.fromEntries(
      traceCodeFiles.map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])
    );
  }

  return codeHashCache;
};

export interface TraceSettings {
  costBps: number;
  rate: number;
  stopFill: BookSettings['stopFill'];
  stopSlippageBps: number;
  notional: number;
}

export const traceSettings = (costBps: number, overrides: Partial<TraceSettings> = {}): TraceSettings => ({
  costBps,
  rate: protocol.rate,
  stopFill: 'stop',
  stopSlippageBps: 0,
  notional: protocol.notional,
  ...overrides
});

export interface BookTrace {
  key: string; // sha256 of the behaviour-relevant inputs
  signature: string; // sha256 of the trades' content
  symbol: string;
  phenotype: string;
  short: string;
  settings: TraceSettings;
  armStart: number;
  startIndex: number;
  endIndex: number;
  dataId: string;
  trades: VirtualTrade[];
  setups: number;
  signals: number;
  armedAtEnd: boolean;
  pendingAtEnd: boolean;
}

export interface TraceWindow {
  armStart: number;
  startIndex: number;
  endIndex: number;
  splitsSha256: string;
}

export const traceKey = (ds: Dataset, phenotype: BookPhenotype, settings: TraceSettings, window: TraceWindow) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        version: traceVersion,
        symbol: phenotype.symbol,
        data: {
          id: ds.id,
          sha256: ds.dataHash,
          firstDate: ds.firstDate,
          lastDate: ds.lastDate,
          sessions: ds.sessionCount,
          bars: ds.barCount
        },
        splitsSha256: window.splitsSha256,
        params: phenotype.params,
        settings,
        armStart: window.armStart,
        startIndex: window.startIndex,
        endIndex: window.endIndex,
        code: traceCodeHashes()
      })
    )
    .digest('hex');

// The trades' content (allocator labels excluded): any change of a fill, exit, price or P&L changes it.
export const tradesSignature = (trades: readonly VirtualTrade[]) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        trades.map((trade) => {
          const { allocator, fundedLotId, ...rest } = trade;

          void allocator;
          void fundedLotId;
          return rest;
        }),
        (_key, value) => (typeof value === 'number' && !Number.isFinite(value) ? String(value) : value)
      )
    )
    .digest('hex');

export const traceBook = (
  ds: Dataset,
  phenotype: BookPhenotype,
  settings: TraceSettings,
  window: TraceWindow
): BookTrace => {
  const { armStart, startIndex, endIndex } = window;

  if (!(startIndex >= 0 && startIndex < endIndex && armStart >= startIndex && endIndex < ds.sessionCount)) {
    throw new Error(`${phenotype.symbol}: bad trace window ${startIndex}..${endIndex}, arming ${armStart}`);
  }

  const book = new ShadowBook(
    phenotype.symbol as Sym,
    phenotype.name as PhenotypeName,
    ds,
    phenotype.params,
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

    book.beginSession(s);

    for (let k = 0; k < count; k++) {
      const decision = book.exitAt(k);

      if (decision) {
        book.close(s, decision);
      }

      if (book.fillAt(k)) {
        book.open(s, k);
      }

      const signal = book.processBar(s, k);

      if (signal) {
        book.commit(signal, s, 'refused');
      }
    }

    const closing = book.exitAt(count);

    if (closing) {
      book.close(s, closing);
    }

    if (book.fillAt(count)) {
      book.open(s, count);
    }

    book.afterSession(s);
  }

  book.finish(endIndex);

  for (const trade of book.trades) {
    trade.allocator = '';
    trade.fundedLotId = -1;
  }

  return {
    key: traceKey(ds, phenotype, settings, window),
    signature: tradesSignature(book.trades),
    symbol: phenotype.symbol,
    phenotype: phenotype.name,
    short: phenotype.short,
    settings,
    armStart,
    startIndex,
    endIndex,
    dataId: ds.id,
    trades: book.trades,
    setups: book.machine.setups,
    signals: book.signals.length,
    armedAtEnd: book.machine.state === 'ARMED',
    pendingAtEnd: Boolean(book.order)
  };
};

// A per-process cache of traces by key. Traces are immutable once built; the replay copies trades it labels.
export class TraceCache {
  private readonly traces = new Map<string, BookTrace>();
  hits = 0;
  misses = 0;

  get(ds: Dataset, phenotype: BookPhenotype, settings: TraceSettings, window: TraceWindow) {
    const key = traceKey(ds, phenotype, settings, window);
    const cached = this.traces.get(key);

    if (cached) {
      this.hits++;
      return cached;
    }

    this.misses++;

    const trace = traceBook(ds, phenotype, settings, window);

    this.traces.set(key, trace);

    return trace;
  }

  clear() {
    this.traces.clear();
  }

  get size() {
    return this.traces.size;
  }
}
