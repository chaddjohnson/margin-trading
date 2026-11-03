// The observer (PROTOCOL.md §5.1): one frozen ShadowBook (src/multi-etf-allocator/shadow.ts) stepped over its own
// symbol's sessions in exactly the frozen engine's per-bar order for a one-book pool (beginSession; per bar: exitAt →
// close, fillAt → open, processBar → commit; at the close: exitAt, fillAt; afterSession; finish), every signal
// committed (shadow semantics: a one-book pool grants every signal, since a book signals only while flat). It changes no
// decision and only reads the book's state: the setups (armed episodes), the continuation windows and the trades. Its
// trades must equal the frozen engine's one-book run field for field (checked by `observeAndCheck`).
import { protocol } from '../multi-etf-allocator/context.ts';
import type { PhenotypeName, Sym } from '../multi-etf-allocator/context.ts';
import { ShadowBook, type VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import type { BookPhenotype, NRunResult, NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { study } from './context.ts';

export interface SetupRecord {
  id: number;
  kind: string; // deep | continuation
  activationIndex: number;
  activationTime: number; // the arming minute's end (decision-time convention)
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  trailingLow: number;
  status: string; // filled | armed at end | pending at end
  endIndex: number;
  signalTime: number; // the confirming decision time, NaN if never confirmed
  fillTime: number; // NaN if never filled
}

export interface ContinuationWindow {
  startIndex: number; // the profitable exit's session
  exitPrice: number;
  endIndex: number; // the session it closed (expiry or arming), or the last session if still open
  endReason: 'expired' | 'armed' | 'open at end';
}

export interface Observation {
  symbol: string;
  trades: VirtualTrade[];
  setups: SetupRecord[];
  continuation: ContinuationWindow[];
  endIndex: number;
}

export const observeBook = (
  universe: NUniverse,
  phenotype: BookPhenotype,
  options: { costBps: number; stopSlippageBps?: number; rate?: number }
): Observation => {
  const symbol = phenotype.symbol;
  const ds = universe.instruments[symbol]!.ds;
  const endIndex = universe.sessionCount - 1;
  const book = new ShadowBook(
    symbol as Sym,
    phenotype.name as PhenotypeName,
    ds,
    phenotype.params,
    {
      notional: protocol.notional,
      rate: options.rate ?? study.rate,
      stopFill: 'stop',
      costBps: options.costBps,
      stopSlippageBps: options.stopSlippageBps ?? 0
    },
    universe.eligibilityIndex
  );
  const continuation: ContinuationWindow[] = [];
  let open: ContinuationWindow | undefined;
  let windowsSeen = 0;

  const afterClose = (s: number) => {
    if (book.machine.continuationWindows > windowsSeen) {
      windowsSeen = book.machine.continuationWindows;

      if (open) {
        open.endIndex = s;
        open.endReason = 'expired';
      }

      open = { startIndex: s, exitPrice: book.machine.continuationHigh, endIndex: -1, endReason: 'open at end' };
      continuation.push(open);
    }
  };

  const afterProcess = (s: number) => {
    if (open && !book.machine.continuationActive && open.endIndex < 0) {
      open.endIndex = s;
      open.endReason = 'armed';
      open = undefined;
    }
  };

  // The engine's loop starts at the accounting start + 1 (session 1); arming starts at the eligibility index.
  for (let s = 1; s <= endIndex; s++) {
    book.beginSession(s);

    const count = ds.sBarCount[s]!;

    for (let k = 0; k < count; k++) {
      const decision = book.exitAt(k);

      if (decision) {
        book.close(s, decision);
        afterClose(s);
      }

      if (book.fillAt(k)) {
        book.open(s, k);
      }

      const signal = book.processBar(s, k);

      if (signal) {
        book.commit(signal, s, 'granted');
      }

      afterProcess(s);
    }

    const decision = book.exitAt(count);

    if (decision) {
      book.close(s, decision);
      afterClose(s);
    }

    if (book.fillAt(count)) {
      book.open(s, count);
    }

    const wasActive = book.machine.continuationActive;

    book.afterSession(s);

    if (open && wasActive && !book.machine.continuationActive && open.endIndex < 0) {
      open.endIndex = s;
      open.endReason = 'expired';
      open = undefined;
    }
  }

  book.finish(endIndex);

  if (open && open.endIndex < 0) {
    open.endIndex = endIndex;
  }

  const bySetup = new Map(book.trades.map((trade) => [trade.setupId, trade]));
  const setups: SetupRecord[] = book.machine.setupLog.map((setup) => {
    const trade = bySetup.get(setup.id);

    return {
      id: setup.id,
      kind: setup.kind,
      activationIndex: setup.activationIndex,
      activationTime: setup.activationTime,
      activationPrice: setup.activationPrice,
      referenceHigh: setup.referenceHigh,
      anchorHigh: setup.anchorHigh,
      trailingLow: setup.trailingLow,
      status: setup.status,
      endIndex: setup.endIndex,
      signalTime: trade ? trade.decisionTime : NaN,
      fillTime: trade && trade.entryIndex >= 0 ? trade.entryTime : NaN
    };
  });

  return { symbol, trades: book.trades, setups, continuation, endIndex };
};

// Field-for-field equality of the observer's trades with the frozen engine's one-book run (fundedLotId aside: the
// engine links each trade to its lot, the observer has no lots). Returns the list of differences (empty = parity).
export const tradeDifferences = (observed: readonly VirtualTrade[], engine: NRunResult) => {
  const differences: string[] = [];
  const reference = engine.trades;

  if (observed.length !== reference.length) {
    differences.push(`trade count ${observed.length} ≠ engine ${reference.length}`);
  }

  for (let index = 0; index < Math.min(observed.length, reference.length); index++) {
    const a = observed[index]!;
    const b = reference[index]!;

    for (const key of Object.keys(b) as (keyof VirtualTrade)[]) {
      if (key === 'fundedLotId') {
        continue;
      }

      const x = a[key];
      const y = b[key];
      const same = typeof x === 'number' && typeof y === 'number' ? Object.is(x, y) || x === y : x === y;

      if (!same) {
        differences.push(`trade ${index + 1} ${key}: ${String(x)} ≠ engine ${String(y)}`);
      }
    }
  }

  if (engine.lots.length !== reference.length) {
    differences.push(`engine lots ${engine.lots.length} ≠ engine trades ${reference.length} (one-book pool)`);
  }

  return differences;
};
