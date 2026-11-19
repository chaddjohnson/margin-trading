// gpu-backend: the PARALLEL HOST PATH — a fixed set of worker threads (hostWorker.ts) that encode and decode the
// contiguous shards of each GPU batch with the batch codec (batch.ts), so that the main thread (the optimizer's lanes
// and archive) is no longer the place where every request is built and every response decoded. It changes WHERE the
// host work runs, never WHAT it computes:
//
//   prepare   the batch is cut into contiguous shards of candidate ids; each worker encodes its shard (global ids,
//             shard-relative range offsets); the main thread assembles the request in candidate order — byte for byte
//             the serial request (only the random nonce differs);
//   complete  the response is placed in shared memory once; the main thread verifies header, shape, nonce and the
//             device's execution counters; every worker computes its candidates' checksum hashes and decodes its shard
//             (the worker that encoded a shard decodes it); the main thread combines the hashes in candidate order and
//             verifies the device's output checksum, then every candidate's id and execution mark, then any decoding
//             error, then the device UUID — the serial path's order — and only then returns the results, in candidate
//             order. A failed batch releases nothing.
//
// Fail closed: a worker that throws, exits, fails to start, holds a different door, or does not answer within the
// operation timeout fails the pipeline; every pending and later call rejects (the GPU pool then fails the job, which
// checkpoints; there is no CPU fallback and no silent retry). Test hooks (an injected decode failure or worker exit)
// exist only with allowFaultInjection, which an official session refuses.
import { Worker } from 'node:worker_threads';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import {
  type BatchOptions, type BatchReceipt, type CandMeta, type EncodedBatch, type EncodedShard, type Task, type TaskResult, GpuError,
  assembleBatch, verifyCandidates, verifyChecksum, verifyResponse, viewOf
} from './batch.ts';
import { doorDigest, workerDoorOf } from './hostDoor.ts';

// the host-path worker threads of an official session's pool unless the run declares otherwise (measured in
// research/gpu-phase3: GPU_PERFORMANCE_BEFORE_AFTER.md)
export const DEFAULT_HOST_WORKERS = 8;

export interface HostPipelineOptions {
  door: Door;
  workers: number; // ≥ 1
  minShard?: number; // candidates per shard at least (default 64): a small batch uses fewer workers
  opTimeoutMs?: number; // one worker operation (default 10 min)
  maxOldGenerationSizeMb?: number; // per worker (default 3072)
  allowFaultInjection?: boolean; // TESTS ONLY
}

export interface PreparedParallel {
  seq: number;
  door: Door;
  tasks: Task[];
  o: BatchOptions;
  enc: EncodedBatch;
  encodeMs: number;
  shardWorker: number[]; // the worker of each shard
}

interface Pending {
  resolve: (m: Record<string, unknown>) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

const errorFrom = (e: { status: number | null; message: string; stack: string | null }) => {
  if (e.status !== null) {
    const g = new GpuError(e.status, '');

    g.message = e.message;
    return g;
  }
  const x = new Error(e.message);

  if (e.stack) x.stack = e.stack;
  return x;
};

export class HostPipeline {
  private readonly workers: Worker[] = [];
  private readonly pending = new Map<string, Pending>();
  private failure: Error | null = null;
  private closing = false;
  private seq = 0;
  private nextFault: { shard: number; kind: 'throw' | 'exit' | 'hang' } | null = null;
  readonly digest: string;
  readonly stats = { batches: 0, encodeShards: 0, decodeShards: 0, workerFailures: 0 };

  private constructor(readonly o: HostPipelineOptions) {
    this.digest = doorDigest(o.door);
  }

  get size() {
    return this.workers.length;
  }

  get failed() {
    return this.failure;
  }

  get faultInjection() {
    return Boolean(this.o.allowFaultInjection);
  }

  static async start(o: HostPipelineOptions): Promise<HostPipeline> {
    if (!Number.isInteger(o.workers) || o.workers < 1) throw new Error(`a host pipeline needs at least one worker (got ${o.workers})`);

    const p = new HostPipeline(o);
    const door = workerDoorOf(o.door);

    try {
      await Promise.all(Array.from({ length: o.workers }, (_v, i) => p.spawn(i, door)));
    } catch (e) {
      await p.close();
      throw e;
    }
    return p;
  }

  private spawn(i: number, door: Door) {
    return new Promise<void>((resolve, reject) => {
      const w = new Worker(new URL('./hostWorker.ts', import.meta.url), {
        workerData: { door },
        resourceLimits: { maxOldGenerationSizeMb: this.o.maxOldGenerationSizeMb ?? 3072 },
        name: `gpu-host-${i}`
      });
      let ready = false;

      w.on('message', (m: Record<string, unknown>) => {
        if (m.t === 'ready') {
          if (m.digest !== this.digest) {
            const e = new Error(`host worker ${i} holds another door (digest ${String(m.digest).slice(0, 16)} ≠ ${this.digest.slice(0, 16)})`);

            this.fail(e);
            reject(e);
            return;
          }
          ready = true;
          this.workers[i] = w;
          resolve();
          return;
        }

        const key = `${m.t}:${m.seq}:${m.shard}`;
        const p = this.pending.get(key);

        if (!p) return;
        this.pending.delete(key);
        clearTimeout(p.timer);
        p.resolve(m);
      });
      w.on('error', (e) => {
        const x = new Error(`host worker ${i} failed: ${e.message}`);

        this.fail(x);
        if (!ready) reject(x);
      });
      w.on('messageerror', (e) => this.fail(new Error(`host worker ${i}: unreadable message: ${e.message}`)));
      w.on('exit', (code) => {
        if (!this.closing) {
          const x = new Error(`host worker ${i} exited (${code})`);

          this.fail(x);
          if (!ready) reject(x);
        }
      });
    });
  }

  private fail(e: Error) {
    if (!this.failure) {
      this.failure = e;
      this.stats.workerFailures++;
    }
    for (const [k, p] of this.pending) {
      this.pending.delete(k);
      clearTimeout(p.timer);
      p.reject(this.failure);
    }
  }

  private call(worker: number, kind: 'encoded' | 'decoded', seq: number, shard: number, msg: Record<string, unknown>, transfer: Transferable[] = []) {
    if (this.failure) return Promise.reject(this.failure);

    const key = `${kind}:${seq}:${shard}`;

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(key);
        this.fail(new Error(`host worker ${worker} did not answer ${kind === 'encoded' ? 'encode' : 'decode'} ${seq}:${shard} within ${this.o.opTimeoutMs ?? 600000} ms`));
        reject(this.failure!);
      }, this.o.opTimeoutMs ?? 600000);

      this.pending.set(key, { resolve, reject, timer });
      this.workers[worker]!.postMessage(msg, transfer as never);
    });
  }

  // contiguous shards, as even as possible, at most one per worker, at least minShard candidates each
  private cut(n: number) {
    const k = Math.max(1, Math.min(this.workers.length, Math.floor(n / (this.o.minShard ?? 64))));
    const out: { c0: number; c1: number }[] = [];

    for (let s = 0, c0 = 0; s < k; s++) {
      const c1 = Math.round(((s + 1) * n) / k);

      out.push({ c0, c1 });
      c0 = c1;
    }
    return out;
  }

  async prepare(door: Door, tasks: Task[], o: BatchOptions = {}): Promise<PreparedParallel> {
    if (door !== this.o.door) throw new Error('host pipeline: a batch for another door');
    if (this.failure) throw this.failure;

    const t0 = performance.now();
    const seq = ++this.seq;
    const cuts = this.cut(tasks.length);
    const shardWorker = cuts.map((_c, s) => s % this.workers.length);
    const replies = await Promise.all(
      cuts.map(({ c0, c1 }, s) => this.call(shardWorker[s]!, 'encoded', seq, s, { t: 'encode', seq, shard: s, c0, tasks: tasks.slice(c0, c1), o }))
    ).catch((e) => {
      this.drop(seq);
      throw e;
    });
    const failed = replies.find((m) => m.error);

    if (failed) {
      this.drop(seq);
      throw errorFrom(failed.error as never);
    }

    const shards: EncodedShard[] = replies.map((m) => ({
      c0: m.c0 as number,
      n: m.n as number,
      bytes: m.bytes as Uint8Array,
      ranges: m.ranges as Int32Array,
      metas: m.metas as CandMeta[],
      d1: m.d1 as number,
      g: m.g as number
    }));
    const enc = assembleBatch(door, shards, o);

    this.stats.batches++;
    this.stats.encodeShards += shards.length;
    return { seq, door, tasks, o, enc, encodeMs: performance.now() - t0, shardWorker };
  }

  // TESTS ONLY (allowFaultInjection): the next decoded batch fails in one worker (negative tests of the pool)
  injectNextDecodeFault(kind: 'throw' | 'exit' | 'hang', shard = 0) {
    if (!this.o.allowFaultInjection) throw new Error('host pipeline: fault injection is not enabled');
    this.nextFault = { shard, kind };
  }

  // forget a batch's encoded shards (a batch that will never be decoded)
  drop(seq: number) {
    if (this.failure) return;
    for (const w of this.workers) w?.postMessage({ t: 'drop', seq });
  }

  async complete(
    p: PreparedParallel,
    raw: { payload: Buffer; roundTripMs: number },
    expectUuid: string | undefined,
    mode: 'lean' | 'full' = 'lean',
    testCrash?: { shard: number; kind: 'throw' | 'exit' | 'hang' }
  ): Promise<{ results: TaskResult[]; receipt: BatchReceipt; timing: { encodeMs: number; roundTripMs: number; decodeMs: number; requestBytes: number; responseBytes: number } }> {
    if (this.failure) throw this.failure;
    if (testCrash && !this.o.allowFaultInjection) throw new Error('host pipeline: fault injection is not enabled');
    if (!testCrash && this.nextFault) {
      testCrash = this.nextFault;
      this.nextFault = null;
    }

    const t0 = performance.now();
    const sab = new SharedArrayBuffer(raw.payload.length);

    new Uint8Array(sab).set(raw.payload);

    const v = viewOf(sab);
    let verified: ReturnType<typeof verifyResponse>;

    try {
      verified = verifyResponse(v, p.enc, p.door.sessions);
    } catch (e) {
      this.drop(p.seq);
      throw e;
    }

    const { receipt, n, flags, S } = verified;
    const replies = await Promise.all(
      p.enc.shards.map((s, k) =>
        this.call(p.shardWorker[k]!, 'decoded', p.seq, k, {
          t: 'decode',
          seq: p.seq,
          shard: k,
          sab,
          n,
          flags,
          S,
          totalRanges: p.enc.nRanges,
          rangeBase: s.rangeBase,
          mode,
          o: p.o,
          ...(testCrash && testCrash.shard === k ? { crash: testCrash.kind } : {})
        })
      )
    );

    // the serial path's order of verdicts: checksum, ids and execution marks, decoding, device
    const hashes = new BigUint64Array(n);

    for (const [k, m] of replies.entries()) {
      if (!m.hashes) throw errorFrom(m.error as never); // a shard that could not even hash its candidates
      hashes.set(m.hashes as BigUint64Array, p.enc.shards[k]!.c0);
    }
    verifyChecksum(receipt, hashes);
    verifyCandidates(v, n, flags);

    const failed = replies.find((m) => m.error);

    if (failed) throw errorFrom(failed.error as never);
    if (expectUuid && receipt.uuid !== expectUuid) throw new GpuError(109, `receipt from ${receipt.uuid}, expected ${expectUuid}`);

    const results = replies.flatMap((m) => m.results as TaskResult[]);

    this.stats.decodeShards += replies.length;
    return {
      results,
      receipt,
      timing: { encodeMs: p.encodeMs, roundTripMs: raw.roundTripMs, decodeMs: performance.now() - t0, requestBytes: p.enc.buffer.length, responseBytes: raw.payload.length }
    };
  }

  async close() {
    this.closing = true;
    for (const [k, p] of this.pending) {
      this.pending.delete(k);
      clearTimeout(p.timer);
      p.reject(this.failure ?? new Error('host pipeline closed'));
    }
    await Promise.all(this.workers.filter(Boolean).map((w) => w.terminate()));
  }
}
