// The evaluation service of the neighbourhood stage: one door (D24), one pool of child-process workers, one SQLite
// archive bound to this study, the job, the door pin and Priority 2's evaluation digest, a bounded LRU in front, and
// the 10-second memory monitor with its stop threshold. It offers the two members Priority 2's qualifyMembers uses
// (`stage`, `evalMany`), so the instrument runs unchanged.
//
// RESUME. The stage is a deterministic function of the manifest; every evaluation is archived the moment it returns.
// Rerunning the same command reads archived evaluations back and computes only the missing ones, so a resumed job
// equals an uninterrupted one. A requested stop (SIGTERM/SIGINT, memory pressure) commits and exits 75; a worker death
// fails the job (exit 1) after committing; nothing restarts it.
import path from 'node:path';
import { Monitor as PriorMonitor, cgroupInfo } from '../growth140-vgt-s8m/pool.ts';
import { Store } from '../growth140-vgt-s8m/store.ts';
import { doorSpecs } from '../vgt-d1-growth-joint/context.ts';
import { type EvalOptions, type Rec, evalKey } from '../vgt-d1-growth-joint/evaluate.ts';
import type { Joint } from '../vgt-d1-growth-joint/space.ts';
import { STUDY, cacheRoot, log, p2, resources, resultsDir } from './context.ts';
import { Pool, StopRequested, type Task } from './pool.ts';

export const EXIT_STOPPED = 75;

const Monitor = PriorMonitor as unknown as new (o: {
  file: string;
  pool: Pool;
  lab?: () => { fresh: number; hits: number } | null;
  store?: () => Store | null;
  stage: () => string;
  extra?: () => Record<string, unknown>;
  pressureBytes: number;
}) => { sample(event?: string): Promise<unknown>; start(): void; stop(): void; peakCurrent: number; peakRss: number };

export interface LabOptions {
  job: string;
  workers: number;
  killWorkerAfter?: number;
}

export class Lab {
  readonly store: Store;
  readonly pool: Pool;
  private readonly monitor: InstanceType<typeof Monitor>;
  stage = 'opening';
  fresh = 0;
  hits = 0;
  private started = false;

  constructor(readonly o: LabOptions) {
    this.store = new Store(path.join(cacheRoot, 'jobs', o.job, 'archive.sqlite'), {
      binding: {
        study: STUDY,
        job: o.job,
        door: 'D24',
        doorPin: doorSpecs.D24.sha256,
        codeDigest: p2.evaluationDigest
      },
      lruCapacity: resources.lruCapacity,
      commitRows: resources.storeCommitRows,
      commitMs: resources.storeCommitMs
    });
    this.pool = new Pool({
      door: 'D24',
      purpose: `${STUDY} ${o.job}`,
      workers: o.workers,
      killAfter: o.killWorkerAfter
    });
    this.monitor = new Monitor({
      file: path.join(resultsDir, 'memory', `${o.job}.jsonl`),
      pool: this.pool,
      lab: () => ({ fresh: this.fresh, hits: this.hits }),
      store: () => this.store,
      stage: () => this.stage,
      extra: () => ({ job: o.job, fresh: this.fresh, hits: this.hits }),
      pressureBytes: resources.pressureBytes
    });
  }

  async open() {
    const cg = cgroupInfo();

    log(
      `job ${this.o.job}: ${this.o.workers} worker(s), cgroup ${cg.path} (memory.high ${cg.high}, memory.max ${cg.max}, swap.max ${cg.swapMax})`
    );
    process.on('SIGTERM', () => this.pool.requestStop('signal SIGTERM'));
    process.on('SIGINT', () => this.pool.requestStop('signal SIGINT'));
    await this.monitor.sample('job-start');
    this.monitor.start();
  }

  async evalMany(items: readonly { joint: Joint; options?: EvalOptions }[]): Promise<Rec[]> {
    const keys = items.map((x) => evalKey('D24', x.joint, x.options));
    const missing = new Map<string, Task>();

    keys.forEach((k, i) => {
      if (missing.has(k)) return;
      if (this.store.read('points', k)) {
        this.hits++;
        return;
      }
      missing.set(k, { k, joint: items[i]!.joint, options: items[i]!.options ?? {} });
    });

    if (missing.size) {
      if (!this.started) {
        this.started = true;
        await this.pool.start();
        await this.monitor.sample('workers-ready');
      }

      const tasks = [...missing.values()];

      for (let i = 0; i < tasks.length; i += 4096)
        await this.pool.run<Rec>(tasks.slice(i, i + 4096), (task, record) => {
          this.store.write('points', task.k, record);
          this.fresh++;
        });
    }

    return keys.map((k) => {
      const r = this.store.read<Rec>('points', k);

      if (!r) throw new Error(`${k} missing after evaluation`);
      return r;
    });
  }

  async close(event: string) {
    this.store.commit();
    await this.monitor.sample(event);
    this.monitor.stop();
    await this.pool.close();
    this.store.close();
    log(
      `job ${this.o.job}: ${event} (${this.fresh} fresh, ${this.hits} archive hits); peak cgroup ${this.monitor.peakCurrent}, peak RSS ${this.monitor.peakRss}`
    );
  }

  get peaks() {
    return { cgroup: this.monitor.peakCurrent, rss: this.monitor.peakRss };
  }
}

export const withLab = async <T>(o: LabOptions, body: (lab: Lab) => Promise<T>): Promise<T> => {
  const lab = new Lab(o);

  await lab.open();

  try {
    lab.stage = 'running';

    const out = await body(lab);

    lab.stage = 'done';
    await lab.close('job-end');
    return out;
  } catch (error) {
    if (error instanceof StopRequested) {
      await lab.close(`stopped: ${error.reason}`);
      log(`stopped (${error.reason}); resume with the same command`);
      process.exit(EXIT_STOPPED);
    }

    await lab.close(`failed: ${(error as Error).message.split('\n')[0]}`);
    throw error;
  }
};
