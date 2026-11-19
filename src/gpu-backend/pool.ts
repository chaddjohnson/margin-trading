// gpu-backend: the GPU evaluation pool — a drop-in for the optimizer's worker pool contract (Assignment 3's
// src/vg-l0-full-joint/workers.ts Pool: start, run(tasks, onResult), requestStop, stopping, inFlight, queued,
// refreshMemory, workerStats, size, close, completed, failed, computeMs). Tasks from every concurrent run() (the lanes
// of a job) are gathered into large device batches; each result is returned to its own caller keyed by its task key,
// so the search sees exactly the CPU pool's contract and its trajectory never depends on batch composition or order.
// The value returned per task is the canonical record — recordOf (+ RC 2 counters), or the detailed record — built by
// the unchanged CPU functions from the GPU's books and pooled replay (a CPU reduction of GPU evidence, never a CPU
// simulation).
//
// THERE IS NO CPU PATH. In official mode (an attested OfficialGpuSession):
//   - every batch receipt is verified (device UUID, nonce, the device's own execution counters, the output checksum)
//     and appended to the run's receipt ledger (JSONL);
//   - every task's capability bits must lie inside the attested domain (a feature outside it stops the job);
//   - the conservation invariant holds after every batch and at close: submitted = GPU-returned + failed + in flight,
//     CPU-scored = 0;
//   - a capacity overflow is re-evaluated ON THE GPU with larger capacities; any other per-candidate error fails the
//     job (the CPU engine would have thrown for that configuration too); a dead or hung server fails the job;
//   - telemetry (utilization, VRAM, power, temperature) and a progress line are logged; low utilization alone is never
//     treated as proof of anything — receipts are the evidence.
//
// HOST PATH. With hostWorkers = 0 every batch is encoded and decoded on the calling (main) thread — Phase 2's serial
// path. With hostWorkers ≥ 1 (or an attested pipeline from the official session) the batch codec runs on worker threads
// (hostPipeline.ts): the next batch is encoded while the device runs, and a returned batch is decoded while the next one
// runs, so the main thread keeps only the lanes, the archive and the request assembly. Results are the same objects
// computed by the same code; they are released per batch, in dispatch order, only after the receipt verified. A worker
// failure fails the pool like a server failure (no CPU fallback).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { StopRequested } from '../growth140-vgt-s8m/pool.ts';
import {
  type BatchOptions,
  type BatchReceipt,
  GpuError,
  GpuServer,
  type PreparedBatch,
  type Task,
  type TaskResult
} from './client.ts';
import { HostPipeline, type PreparedParallel } from './hostPipeline.ts';
import { CAPACITY_STATUSES, featureNames } from './layout.ts';
import { PolicyError } from './purpose.ts';
import { type OfficialGpuSession, smiTelemetry } from './official.ts';

export { StopRequested };

export interface GpuPoolOptions {
  door: Door;
  session: OfficialGpuSession | null; // null: a NON-OFFICIAL pool (parity tests, benchmarks) on `server`
  server?: GpuServer; // the non-official pool's server (already loaded with the door's dataset)
  uuid?: string;
  ledgerFile: string; // receipt ledger (JSONL)
  telemetryFile?: string;
  batchSize?: number; // candidates per device batch (default 8192)
  lingerMs?: number; // how long a partial batch waits for more tasks from other lanes (default 25 ms)
  batchTimeoutMs?: number; // a batch that does not return in time fails the job (default 20 min)
  log?: (s: string) => void;
  domainFeatures?: bigint; // official mode: the attested domain (each task must lie inside it)
  capBase?: number; // the first capacity level (default 512; tests use a small one to exercise the GPU retry)
  pipelineMin?: number; // when a batch returns and at least this many tasks wait, the next batch goes to the device before
  //                       this one is decoded (default batchSize / 4; a smaller batch waits for the linger as usual)
  hostWorkers?: number; // host-path worker threads (default 0: Phase 2's serial path); ignored when `pipeline` is given
  pipeline?: HostPipeline; // an already started (official: attested) pipeline on the same door; the pool does not close it
}

interface Pending {
  task: Task;
  orig: object; // the caller's task object
  resolve: (r: TaskResult, ms: number) => void;
  caps: number; // capacity escalation level
}

export class GpuPool {
  private queue: Pending[] = [];
  private stopReason: string | null = null;
  private failure: Error | null = null;
  private waiters: (() => void)[] = [];
  private busy = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private telemetryTimer: NodeJS.Timeout | null = null;
  private readonly server: GpuServer;
  private readonly uuid: string;
  private pipe: HostPipeline | null = null;
  private ownPipe = false;
  private released: Promise<void> = Promise.resolve(); // the previous batch's release (in-order release)
  readonly counters = {
    submitted: 0,
    gpuReturned: 0,
    failed: 0,
    cpuScored: 0,
    batches: 0,
    capacityRetries: 0,
    kernelMs: 0,
    wallMs: 0
  };
  completed = 0;
  failed = 0;
  computeMs = 0;
  inFlightCount = 0;
  private t0 = Date.now();

  constructor(readonly o: GpuPoolOptions) {
    if (o.session) {
      this.server = o.session.server;
      this.uuid = o.session.info.uuid;
      this.pipe = o.pipeline ?? o.session.pipeline ?? null;
      this.ownPipe = !o.pipeline && this.pipe !== null; // the session's attested host path ends with the pool, like its server
    } else {
      if (!o.server || !o.uuid) throw new Error('a non-official GpuPool needs its server and the device uuid');
      this.server = o.server;
      this.uuid = o.uuid;
      this.pipe = o.pipeline ?? null;
    }
    fs.mkdirSync(path.dirname(o.ledgerFile), { recursive: true });
  }

  get official() {
    return this.o.session !== null;
  }

  get workersWanted() {
    return 1;
  }

  get hostWorkers() {
    return this.pipe?.size ?? 0;
  }

  async start() {
    if (!this.pipe && (this.o.hostWorkers ?? 0) > 0) {
      this.pipe = await HostPipeline.start({ door: this.o.door, workers: this.o.hostWorkers! });
      this.ownPipe = true;
    }
    if (this.o.telemetryFile) {
      fs.mkdirSync(path.dirname(this.o.telemetryFile), { recursive: true });
      this.telemetryTimer = setInterval(() => this.sample(), 30000);
      this.telemetryTimer.unref();
      this.sample();
    }
  }

  private sample() {
    try {
      const t = smiTelemetry();
      const line = {
        t: new Date().toISOString(),
        ...t,
        uuidMatches: t.uuid === this.uuid,
        ...this.counters,
        evPerS: Math.round((this.counters.gpuReturned / Math.max(1, Date.now() - this.t0)) * 1000)
      };

      fs.appendFileSync(this.o.telemetryFile!, `${JSON.stringify(line)}\n`);
      this.o.log?.(
        `GPU ${this.uuid.slice(0, 12)}: ${this.counters.gpuReturned} GPU evaluations (${line.evPerS}/s), CPU-scored ${this.counters.cpuScored}, util ${t.utilizationPct}%, VRAM ${t.memoryUsedMiB} MiB, ${t.powerW} W, ${t.temperatureC} °C, failed ${this.counters.failed}`
      );
      if (!line.uuidMatches)
        this.fail(
          new PolicyError('device-changed', `nvidia-smi reports ${t.uuid}, the attested device is ${this.uuid}`)
        );
    } catch (e) {
      this.fail(new PolicyError('telemetry-lost', `GPU telemetry unavailable: ${(e as Error).message}`));
    }
  }

  private fail(error: Error) {
    if (!this.failure) {
      this.failure = error;
      this.o.log?.(`GPU pool failure: ${error.message.split('\n')[0]}`);
    }
    this.wake();
  }

  private wake() {
    const w = this.waiters;

    this.waiters = [];
    for (const x of w) x();
  }

  requestStop(reason: string) {
    if (!this.stopReason) {
      this.stopReason = reason;
      this.o.log?.(`stop requested (${reason}): dispatching ends; the batch in flight finishes`);
    }
    this.wake();
  }

  get stopping() {
    return this.stopReason;
  }

  get inFlight() {
    return this.inFlightCount;
  }

  get queued() {
    return this.queue.length;
  }

  async refreshMemory() {}

  workerStats() {
    return [
      {
        pid: this.server.pid ?? -1,
        mem: null,
        count: this.completed,
        gcs: 0,
        loadMs: 0,
        busy: this.inFlightCount,
        hostWorkers: this.hostWorkers
      }
    ];
  }

  get size() {
    return 1;
  }

  private conservation(where: string) {
    const c = this.counters;

    if (c.cpuScored !== 0)
      this.fail(new PolicyError('cpu-scored', `${c.cpuScored} evaluation(s) scored on the CPU (${where})`));
    if (c.submitted !== c.gpuReturned + c.failed + this.inFlightCount + this.queue.length)
      this.fail(
        new PolicyError(
          'conservation',
          `submitted ${c.submitted} ≠ GPU-returned ${c.gpuReturned} + failed ${c.failed} + in flight ${this.inFlightCount} + queued ${this.queue.length} (${where})`
        )
      );
  }

  private schedule() {
    if (this.busy || this.failure || !this.queue.length) return;
    if (this.queue.length >= (this.o.batchSize ?? 8192)) {
      void this.dispatch();
      return;
    }
    if (!this.flushTimer)
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.dispatch();
      }, this.o.lingerMs ?? 25);
  }

  private async dispatch() {
    if (this.busy || this.failure || !this.queue.length) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.busy = true;

    const size = this.o.batchSize ?? 8192;
    // tasks of the same capacity level share a batch
    const level = this.queue[0]!.caps;
    const batch: Pending[] = [];
    const rest: Pending[] = [];

    for (const p of this.queue) (p.caps === level && batch.length < size ? batch : rest).push(p);
    this.queue = rest;
    this.inFlightCount += batch.length;

    const caps = (this.o.capBase ?? 512) * 2 ** level;
    const opts: BatchOptions = { tradeCapD1: caps, tradeCapG: caps, lotCap: caps, fundCap: caps * 4, record: true };
    const t0 = performance.now();
    let timer: NodeJS.Timeout | null = null;
    let landed = false; // the batch left the in-flight count
    let deviceFree = false;
    // parallel host path: results are released in dispatch order (a later batch decoded sooner waits for this one)
    const before = this.released;
    let releaseDone = () => {};

    if (this.pipe) this.released = new Promise<void>((r) => (releaseDone = r));

    try {
      const prepared: PreparedBatch | PreparedParallel = this.pipe
        ? await this.pipe.prepare(
            this.o.door,
            batch.map((p) => p.task),
            opts
          )
        : this.server.prepare(
            this.o.door,
            batch.map((p) => p.task),
            opts
          );
      const timeout = new Promise<never>((_r, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new PolicyError(
                'gpu-hang',
                `a batch of ${batch.length} did not return within ${this.o.batchTimeoutMs ?? 1200000} ms`
              )
            ),
          this.o.batchTimeoutMs ?? 1200000
        );
      });
      const raw = await Promise.race([this.server.submit(prepared), timeout]);

      if (timer) clearTimeout(timer);
      // pipelining: the device is free — the next batch goes out before this one is decoded
      this.busy = false;
      deviceFree = true;
      if (!this.failure && this.queue.length >= (this.o.pipelineMin ?? Math.floor((this.o.batchSize ?? 8192) / 4)))
        void this.dispatch();

      const r = this.pipe
        ? await this.pipe.complete(prepared as PreparedParallel, raw, this.uuid, 'lean')
        : this.server.complete(prepared as PreparedBatch, raw, this.uuid);

      if (this.pipe) {
        await before;
        if (this.failure) throw this.failure; // an earlier batch failed: nothing of this one is released
      }

      this.ledger(r.receipt, batch, performance.now() - t0, r.timing);
      this.counters.batches++;
      this.counters.kernelMs += r.receipt.server.totalMs;
      this.inFlightCount -= batch.length;
      landed = true;

      const retry: Pending[] = [];
      // the batch's integrity BEFORE any of its results is released: no CPU-scored evaluation, every task inside the
      // attested domain (a violation fails the job and releases nothing)
      if (this.counters.cpuScored !== 0)
        throw new PolicyError(
          'cpu-scored',
          `${this.counters.cpuScored} evaluation(s) scored on the CPU; the batch's results are withheld`
        );
      if (this.o.domainFeatures !== undefined) {
        const bad = r.results.find((x) => (x.features & ~this.o.domainFeatures!) !== 0n);

        if (bad)
          throw new PolicyError(
            'capability-outside-domain',
            `task ${bad.key} needs ${featureNames(bad.features & ~this.o.domainFeatures).join(', ')} outside the attested domain; the batch's results are withheld`
          );
      }
      const msPer = r.receipt.server.totalMs / batch.length; // each task's share of the device batch

      r.results.forEach((res, i) => {
        const p = batch[i]!;

        if (res.status === 0) {
          this.counters.gpuReturned++;
          this.completed++;
          this.computeMs += msPer;
          p.resolve(res, msPer);
        } else if (CAPACITY_STATUSES.has(res.status) && p.caps < 4) {
          this.counters.capacityRetries++;
          retry.push({ ...p, caps: p.caps + 1 });
        } else {
          this.counters.failed++;
          this.failed++;
          this.fail(
            new GpuError(
              0,
              `evaluation ${p.task.k} failed on the GPU: ${res.statusText} (${res.errInfo}) — the canonical engine refuses this configuration too; the job stops`
            )
          );
        }
      });
      // a capacity retry goes back to the queue (still a GPU task: it is re-submitted to the device)
      this.queue.unshift(...retry);
      this.conservation(`batch ${this.counters.batches}`);
    } catch (e) {
      if (timer) clearTimeout(timer);
      if (!landed) this.inFlightCount -= batch.length;
      this.counters.failed += batch.length;
      this.failed += batch.length;
      try {
        this.server.kill();
      } catch {
        /* gone */
      }
      this.fail(e instanceof Error ? e : new Error(String(e)));
    } finally {
      releaseDone();
      this.counters.wallMs = Date.now() - this.t0;
      if (!deviceFree) this.busy = false;
      this.wake();
      this.schedule();
    }
  }

  private ledger(
    rc: BatchReceipt,
    batch: Pending[],
    ms: number,
    timing: { encodeMs: number; decodeMs: number; roundTripMs: number }
  ) {
    const keys = createHash('sha256')
      .update(batch.map((p) => p.task.k).join('\n'))
      .digest('hex')
      .slice(0, 16);

    fs.appendFileSync(
      this.o.ledgerFile,
      `${JSON.stringify({
        t: new Date().toISOString(),
        official: this.official,
        nonce: rc.nonce,
        uuid: rc.uuid,
        n: rc.nCand,
        d1Executed: rc.d1Executed,
        gExecuted: rc.gExecuted,
        poolExecuted: rc.poolExecuted,
        kernels: rc.kernels,
        outChecksum: rc.outChecksum,
        keys,
        caps: batch[0]?.caps ?? 0,
        serverMs: Math.round(rc.server.totalMs),
        d1Ms: Math.round(rc.server.d1Ms),
        gMs: Math.round(rc.server.gMs),
        poolMs: Math.round(rc.server.poolMs),
        encodeMs: Math.round(timing.encodeMs),
        decodeMs: Math.round(timing.decodeMs),
        wallMs: Math.round(ms),
        cpuScored: this.counters.cpuScored
      })}\n`
    );
  }

  // The optimizer's contract: runs tasks; `onResult` sees each record as it arrives (the caller archives it at once).
  async run<T>(
    tasks: { k: string; quad: Task['quad']; controls: Task['controls']; options: Task['options']; detail: boolean }[],
    onResult: (task: (typeof tasks)[number], value: T, ms: number) => void
  ): Promise<void> {
    let left = tasks.length;

    if (left === 0) return;
    if (this.failure) throw this.failure;
    if (this.stopReason) throw new StopRequested(this.stopReason);

    for (const task of tasks) {
      this.counters.submitted++;
      this.queue.push({
        task: { ...task, risk: (task as Task).risk },
        orig: task,
        caps: 0,
        resolve: (r, ms) => {
          onResult(task, r.record as T, ms);
          left--;
          this.wake();
        }
      });
    }
    this.schedule();

    for (;;) {
      if (this.failure) break; // a failed pool fails every caller, even one whose own tasks all returned
      if (left === 0) break;
      if (this.stopReason && this.inFlightCount === 0) break;
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }

    if (left > 0 || this.failure) {
      // the queued, never-dispatched tasks are dropped (the job checkpoints; a resume replays them)
      const before = this.queue.length;

      const mine = new Set<object>(tasks);

      this.queue = this.queue.filter((p) => !mine.has(p.orig));
      this.counters.submitted -= before - this.queue.length;
      if (this.failure) throw this.failure;
      throw new StopRequested(this.stopReason!);
    }
  }

  async close() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    this.conservation('close');
    if (this.o.telemetryFile) this.sample();
    fs.appendFileSync(
      this.o.ledgerFile,
      `${JSON.stringify({ t: new Date().toISOString(), event: 'close', ...this.counters, hostWorkers: this.hostWorkers, failure: this.failure?.message ?? null })}\n`
    );
    if (this.pipe && this.ownPipe) await this.pipe.close();
    await this.server.close();
  }
}
