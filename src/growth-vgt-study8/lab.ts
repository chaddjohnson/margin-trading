// Point evaluation: one effective configuration on one door → a Study 8–shaped record. `Lab` evaluates in-process;
// `ParallelLab` fans batches out to worker threads that open the same door themselves (the development door
// re-verifies the pinned prefix in every worker) and caches every record by its effective configuration (which
// includes the cost). Records depend only on their inputs, so the order of evaluation never matters.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import type { MarketSession } from '#types';
import { chronology, folds } from './context.ts';
import { type GrowthRecord, type Range, dateRange, recordOf, runConfig, yearRanges } from './adapter.ts';
import { type Effective, effectiveKey } from './space.ts';

export interface DoorView {
  door: 'development' | 'full' | 'fixture';
  sessions: MarketSession[];
  dataSha256: string;
  ranges: Range[];
  y: number; // sessions of the run ÷ 252
}

export const rangesFor = (dates: readonly string[]): Range[] => {
  const named: (Range | null)[] = [
    dateRange(dates, 'DEV', chronology.firstSession, chronology.developmentEnd),
    dateRange(dates, 'VAL', chronology.validationStart, chronology.validationEnd),
    ...folds.flatMap((f) => [
      dateRange(dates, `${f.key}-train`, chronology.firstSession, f.trainEnd),
      dateRange(dates, `${f.key}-test`, f.testStart, f.testEnd)
    ])
  ];
  // half-years (report-only CSCV/PBO, Study 8 §7.2)
  const halves: Range[] = [];

  for (let s = 0; s < dates.length;) {
    const half = (d: string) => `${d.slice(0, 4)}H${Number(d.slice(5, 7)) <= 6 ? 1 : 2}`;
    const key = half(dates[s]!);
    let e = s;

    while (e + 1 < dates.length && half(dates[e + 1]!) === key) e++;
    halves.push({ key, first: s, last: e });
    s = e + 1;
  }

  return [...yearRanges(dates), ...named.filter((r): r is Range => r !== null), ...halves];
};

export const doorView = (door: DoorView['door'], sessions: MarketSession[], dataSha256: string): DoorView => ({
  door,
  sessions,
  dataSha256,
  ranges: rangesFor(sessions.map((s) => s.date)),
  y: sessions.length / 252
});

export const withCost = (effective: Effective, costBps: number): Effective => ({
  ...effective,
  costBpsPerSide: costBps
});

export const pointOf = (view: DoorView, effective: Effective): GrowthRecord =>
  recordOf(runConfig(view.sessions, view.dataSha256, effective), view.ranges);

export class Lab {
  readonly cache = new Map<string, GrowthRecord>();
  evaluations = 0;

  constructor(readonly view: DoorView) {}

  point(effective: Effective) {
    const key = effectiveKey(effective);
    let record = this.cache.get(key);

    if (!record) {
      record = pointOf(this.view, effective);
      this.cache.set(key, record);
      this.evaluations++;
    }

    return record;
  }

  async points(jobs: readonly Effective[]) {
    return jobs.map((job) => this.point(job));
  }

  async close() {}
}

export interface WorkerInit {
  door: 'development' | 'full';
  frozenBodyHash?: string;
}

export const workerCount = () => Math.max(1, Math.min(14, os.availableParallelism() - 2));

export class ParallelLab extends Lab {
  private workers: Worker[] = [];
  private ready: Promise<void>[] = [];

  constructor(view: DoorView, init: WorkerInit, size = workerCount()) {
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

  get size() {
    return this.workers.length;
  }

  override async points(jobs: readonly Effective[]) {
    const missing = new Map<string, Effective>();

    for (const job of jobs) {
      const key = effectiveKey(job);

      if (!this.cache.has(key)) missing.set(key, job);
    }

    if (missing.size > 0) {
      await Promise.all(this.ready);

      const queue = [...missing.entries()];
      const chunk = Math.max(1, Math.min(8, Math.ceil(queue.length / (this.workers.length * 4))));
      let next = 0;

      await Promise.all(
        this.workers.map(async (worker) => {
          while (next < queue.length) {
            const batch = queue.slice(next, next + chunk);

            next += chunk;

            const records = await new Promise<GrowthRecord[]>((resolve, reject) => {
              const handlers: { message?: (m: unknown) => void; error?: (e: Error) => void } = {};

              handlers.message = (message) => {
                worker.off('error', handlers.error!);

                const { records: result, error } = message as { records?: GrowthRecord[]; error?: string };

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

    return jobs.map((job) => this.cache.get(effectiveKey(job))!);
  }

  override async close() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
