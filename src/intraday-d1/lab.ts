// Point evaluation: one grid vector under one execution setting on one door's window → a Study 8–shaped record.
// `Lab` evaluates in-process; `ParallelLab` fans batches out to worker threads that open the same door themselves
// (the development door re-verifies the pinned prefix in every worker) and caches every record by (grid, settings).
// Records depend only on their inputs, so the order of evaluation never matters.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import type { MarketSession } from '#types';
import { chronology, execution, type Grid } from './context.ts';
import { type ExecutionSettings, type RunResult, type TraceOptions, simulate } from './engine.ts';
import { type Market, buildMarket, minuteClock } from './periods.ts';
import { type IntradayRecord, type Range, type RunWindow, rangesOf, recordOf } from './records.ts';
import { engineParamsOf, gridKey, valuesOf } from './space.ts';

export const baseSettings: ExecutionSettings = {
  principal: execution.principal,
  rate: execution.rate,
  costBps: execution.costBps,
  stopFill: execution.stopFill,
  stopSlippageBps: execution.stopSlippageBps
};

export const settingsWith = (overrides: Partial<ExecutionSettings>): ExecutionSettings => ({
  ...baseSettings,
  ...overrides
});
export const settingsKey = (s: ExecutionSettings) =>
  `${s.costBps}/${s.rate}/${s.stopFill}/${s.stopSlippageBps}/${s.principal}`;

export interface DoorView {
  door: 'development' | 'validation' | 'fixture';
  sessions: MarketSession[];
  market: Market;
  window: RunWindow;
  ranges: Range[];
  developmentEndSession: number;
  y: number; // sessions from arming to the end ÷ 252 (S8/evaluate.ts:290-295)
}

export const doorView = (door: DoorView['door'], sessions: MarketSession[]): DoorView => {
  const market = buildMarket(sessions);
  const armFromSession = sessions.findIndex((session) => session.date >= chronology.armFrom);
  const endSession = sessions.length - 1;
  let developmentEndSession = -1;

  sessions.forEach((session, s) => {
    if (session.date <= chronology.developmentEnd) developmentEndSession = s;
  });

  const named: Range[] = [{ key: 'DEV', first: 0, last: developmentEndSession }];

  if (endSession > developmentEndSession) {
    named.push({ key: 'VAL', first: developmentEndSession + 1, last: endSession });
  }

  // Half-year blocks (report-only CSCV/PBO, as Study 8's S8/qualify.ts:166-187), e.g. "2018H1".
  for (let s = 0; s <= endSession;) {
    const half = `${sessions[s]!.date.slice(0, 4)}H${Number(sessions[s]!.date.slice(5, 7)) <= 6 ? 1 : 2}`;
    let e = s;

    while (e + 1 <= endSession) {
      const next = sessions[e + 1]!.date;

      if (`${next.slice(0, 4)}H${Number(next.slice(5, 7)) <= 6 ? 1 : 2}` !== half) break;
      e++;
    }

    named.push({ key: half, first: s, last: e });
    s = e + 1;
  }

  if (armFromSession < 0) throw new Error('no session on or after the arming date');

  return {
    door,
    sessions,
    market,
    window: { armFromSession, endSession },
    ranges: rangesOf(market, endSession, named),
    developmentEndSession,
    y: (endSession - armFromSession + 1) / 252
  };
};

export const runGrid = (
  view: DoorView,
  grid: Grid,
  settings: ExecutionSettings = baseSettings,
  trace: TraceOptions = {}
): RunResult => {
  const values = valuesOf(grid);
  const clock = minuteClock(view.market, view.sessions, values.periodMinutes);

  return simulate(view.market, clock, engineParamsOf(values), settings, view.window, trace);
};

export const pointOf = (view: DoorView, grid: Grid, settings: ExecutionSettings = baseSettings): IntradayRecord =>
  recordOf(view.market, runGrid(view, grid, settings), view.window, view.ranges);

export interface Job {
  grid: Grid;
  settings: ExecutionSettings;
}

export const jobKey = (job: Job) => `${gridKey(job.grid)}|${settingsKey(job.settings)}`;

export class Lab {
  readonly cache = new Map<string, IntradayRecord>();
  evaluations = 0;

  constructor(readonly view: DoorView) {}

  point(grid: Grid, settings: ExecutionSettings = baseSettings) {
    const key = jobKey({ grid, settings });
    let record = this.cache.get(key);

    if (!record) {
      record = pointOf(this.view, grid, settings);
      this.cache.set(key, record);
      this.evaluations++;
    }

    return record;
  }

  async points(jobs: readonly Job[]) {
    return jobs.map((job) => this.point(job.grid, job.settings));
  }

  async close() {}
}

export interface WorkerInit {
  door: 'development' | 'validation';
  frozenBodyHash?: string;
}

export class ParallelLab extends Lab {
  private workers: Worker[] = [];
  private ready: Promise<void>[] = [];

  constructor(view: DoorView, init: WorkerInit, size = Math.max(1, Math.min(14, os.availableParallelism() - 2))) {
    super(view);

    for (let w = 0; w < size; w++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        workerData: init,
        execArgv: ['--experimental-transform-types', '--disable-warning=ExperimentalWarning'],
        resourceLimits: { maxOldGenerationSizeMb: 3072 }
      });

      this.ready.push(
        new Promise((resolve, reject) => {
          worker.once('message', (message: { ready?: boolean; error?: string }) =>
            message.ready ? resolve() : reject(new Error(message.error))
          );
          worker.once('error', reject);
        })
      );
      this.workers.push(worker);
    }
  }

  override async points(jobs: readonly Job[]) {
    const missing = new Map<string, Job>();

    for (const job of jobs) {
      const key = jobKey(job);

      if (!this.cache.has(key)) missing.set(key, job);
    }

    if (missing.size > 0) {
      await Promise.all(this.ready);

      const queue = [...missing.entries()];
      const chunk = Math.max(1, Math.min(16, Math.ceil(queue.length / (this.workers.length * 4))));
      let next = 0;

      await Promise.all(
        this.workers.map(async (worker) => {
          while (next < queue.length) {
            const batch = queue.slice(next, next + chunk);

            next += chunk;

            const records = await new Promise<IntradayRecord[]>((resolve, reject) => {
              const handlers: { message?: (m: unknown) => void; error?: (e: Error) => void } = {};

              handlers.message = (message) => {
                worker.off('error', handlers.error!);

                const { records: result, error } = message as { records?: IntradayRecord[]; error?: string };

                if (result) resolve(result);
                else reject(new Error(error));
              };
              handlers.error = (error) => {
                worker.off('message', handlers.message!);
                reject(error);
              };
              worker.once('message', handlers.message);
              worker.once('error', handlers.error);
              worker.postMessage({ jobs: batch.map(([, job]) => job) });
            });

            // structured clone keeps every number exactly (NaN included)
            batch.forEach(([key], i) => this.cache.set(key, records[i]!));
            this.evaluations += batch.length;
          }
        })
      );
    }

    return jobs.map((job) => this.cache.get(jobKey(job))!);
  }

  override async close() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
