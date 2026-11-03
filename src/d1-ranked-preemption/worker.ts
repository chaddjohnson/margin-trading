// A worker thread of the study's pool (./pool.ts): it holds the loaded window once (the datasets' typed arrays are
// SharedArrayBuffers, so every worker reads the main thread's memory) and evaluates pure functions on request —
// standalone metrics, book traces and preemptive pool replays. No randomness, no clock; results in request order.
import { parentPort } from 'node:worker_threads';
import type { Dataset } from '../four-family/data.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import type { BookTrace, TraceWindow } from '../portfolio-aware-d1/trace.ts';
import type { Allocation } from './allocation.ts';
import { type Book, buildTrace, replayRequest, standaloneOf } from './evaluate.ts';

export interface WorkerInit {
  type: 'init';
  universe: NUniverse;
  window: TraceWindow;
}

export interface StandaloneItem {
  book: Book;
  costBps: number;
  minTrades: number;
}

export interface TraceItem {
  book: Book;
  costBps: number;
}

export interface PoolItem {
  books: Book[]; // canonical order
  traces: number[]; // indices into the task's trace list, by book
  costBps: number;
  allocation: Allocation;
  windowStarts?: number[];
  minLots: number;
}

export type WorkerTask =
  | { type: 'standalone'; taskId: number; items: StandaloneItem[] }
  | { type: 'traces'; taskId: number; items: TraceItem[] }
  | { type: 'pools'; taskId: number; traces: BookTrace[]; items: PoolItem[] };

export type WorkerReply =
  | { type: 'ready' }
  | { type: 'result'; taskId: number; results: unknown[] }
  | { type: 'error'; taskId: number; message: string };

let state: Omit<WorkerInit, 'type'> | undefined;

export const handleTask = (context: Omit<WorkerInit, 'type'>, task: WorkerTask): unknown[] => {
  const dsOf = (symbol: string): Dataset => {
    const instrument = context.universe.instruments[symbol];

    if (!instrument) {
      throw new Error(`${symbol} is not loaded in this worker`);
    }

    return instrument.ds;
  };

  if (task.type === 'standalone') {
    return task.items.map((item) => {
      const ds = dsOf(item.book.symbol);
      const trace = buildTrace(ds, item.book, item.costBps, context.window);

      return standaloneOf(ds, trace, item.book.vector.grid, item.minTrades);
    });
  }

  if (task.type === 'traces') {
    return task.items.map((item) => buildTrace(dsOf(item.book.symbol), item.book, item.costBps, context.window));
  }

  return task.items.map(
    (item) =>
      replayRequest(
        { books: item.books, costBps: item.costBps, allocation: item.allocation, windowStarts: item.windowStarts },
        item.books.map((book, index) => ({
          symbol: book.symbol,
          ds: dsOf(book.symbol),
          trace: task.traces[item.traces[index]!]!
        })),
        context.window,
        context.universe.dates,
        item.minLots
      ).metrics
  );
};

if (parentPort) {
  parentPort.on('message', (message: WorkerInit | WorkerTask) => {
    if (message.type === 'init') {
      const { type, ...rest } = message;

      void type;
      state = rest;
      parentPort!.postMessage({ type: 'ready' } satisfies WorkerReply);
      return;
    }

    try {
      if (!state) {
        throw new Error('The worker was not initialized');
      }

      const results = handleTask(state, message);

      parentPort!.postMessage({ type: 'result', taskId: message.taskId, results } satisfies WorkerReply);
    } catch (error) {
      parentPort!.postMessage({
        type: 'error',
        taskId: message.taskId,
        message: (error as Error)?.stack ?? String(error)
      } satisfies WorkerReply);
    }
  });
}
