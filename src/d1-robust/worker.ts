// A worker thread of the study's pool (./pool.ts): it holds the loaded universe once (the datasets' typed arrays are
// SharedArrayBuffers, so every worker reads the main thread's memory) and evaluates pure functions on request —
// book traces, trace-based replays (centre metrics or neighbour records) and full-engine summaries. It has no
// randomness and no clock dependence; results are posted back in request order.
import { parentPort } from 'node:worker_threads';
import type { Dataset } from '../four-family/data.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import type { ReplayBook } from '../portfolio-aware-d1/replay.ts';
import type { BookTrace, TraceWindow } from '../portfolio-aware-d1/trace.ts';
import {
  type EngineSpec,
  type EvalPeriods,
  buildTrace,
  engineSummaryOf,
  evaluationOf,
  neighbourRecordOf,
  replayOf,
  runEngine
} from './evaluate.ts';
import type { Book } from './neighbourhood.ts';

export interface WorkerInit {
  type: 'init';
  universe: NUniverse;
  window: TraceWindow;
  periods: EvalPeriods;
  eligibleDays: number;
}

export interface TraceItem {
  symbol: string;
  book: Book;
  costBps: number;
}

export interface ReplayItem {
  mode: 'centre' | 'neighbour';
  key: string;
  symbols: string[]; // canonical order
  traces: number[]; // indices into the task's trace list, by symbol order
  costBps: number;
  priority?: string[];
  moved?: number;
  markIndices?: number[];
  withFunded?: boolean;
}

export type WorkerTask =
  | { type: 'traces'; taskId: number; items: TraceItem[] }
  | { type: 'replays'; taskId: number; traces: BookTrace[]; items: ReplayItem[] }
  | { type: 'engine'; taskId: number; items: EngineSpec[] };

export type WorkerReply =
  | { type: 'ready' }
  | { type: 'result'; taskId: number; results: unknown[] }
  | { type: 'error'; taskId: number; message: string };

let state: Omit<WorkerInit, 'type'> | undefined;

const dsOf = (symbol: string): Dataset => {
  const instrument = state!.universe.instruments[symbol];

  if (!instrument) {
    throw new Error(`${symbol} is not loaded in this worker`);
  }

  return instrument.ds;
};

export const handleTask = (context: Omit<WorkerInit, 'type'>, task: WorkerTask): unknown[] => {
  state = context;

  if (task.type === 'traces') {
    return task.items.map((item) => buildTrace(dsOf(item.symbol), item.book, item.costBps, context.window));
  }

  if (task.type === 'replays') {
    return task.items.map((item) => {
      const books: ReplayBook[] = item.symbols.map((symbol, index) => ({
        symbol,
        ds: dsOf(symbol),
        trace: task.traces[item.traces[index]!]!
      }));
      const result = replayOf(books, item.costBps, context.window, false, item.priority);

      return item.mode === 'centre'
        ? evaluationOf(
            item.key,
            books,
            item.costBps,
            result,
            context.periods,
            context.eligibleDays,
            context.universe.dates,
            item.markIndices,
            item.withFunded
          )
        : neighbourRecordOf(result, item.moved ?? 0, item.markIndices);
    });
  }

  return task.items.map((spec) => engineSummaryOf(spec, runEngine(context.universe, spec)));
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
