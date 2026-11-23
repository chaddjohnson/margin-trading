// gpu-backend: the Node client of the CUDA evaluator server (protocol v2). The server is a separate process (a GPU
// fault never takes the optimizer down). Results are decoded BY CANDIDATE ID, never by arrival order, into the CPU
// engine's own objects — VBooks (D1 and Growth), the PoolResult — so that the UNCHANGED canonical functions build the
// records: recordOf (the compact record), riskInputsOf (the detailed record). Every batch carries a device receipt (the
// GPU's UUID, its own execution counters, an output checksum computed on the device) that the client verifies before
// a single result is used; a mismatch is an error, never a silent retry. The request and response formats live in the
// batch codec (batch.ts), shared with the parallel host path (hostPipeline.ts); this file's prepare / complete are the
// serial path (one shard on the calling thread).
import { type ChildProcess, spawn } from 'node:child_process';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { RES_MAGIC, REQ_MAGIC, TYPE } from './layout.ts';
import {
  type BatchOptions,
  type BatchReceipt,
  type EncodedBatch,
  type Envelope,
  type Task,
  type TaskResult,
  GpuError,
  decodeBatch,
  encodeBatch,
  outChecksumOf,
  uuidText
} from './batch.ts';

export type { BatchOptions, BatchReceipt, Envelope, Task, TaskResult };
export { GpuError, outChecksumOf, uuidText };

export interface ServerInfo {
  protocol: number;
  datasetVersion: number;
  device: string;
  uuid: string;
  cc: string;
  sms: number;
  totalBytes: number;
  freeBytes: number;
  driver: number;
  runtime: number;
  supportedFeatures: string;
  compatDigest: string;
  buildFlags: string;
  pid: number;
  [k: string]: unknown;
}

export interface BatchTiming {
  encodeMs: number;
  roundTripMs: number;
  decodeMs: number;
  requestBytes: number;
  responseBytes: number;
}

// the SMOKE request's expected answer, computed by JavaScript itself (V8's Math.log/Math.exp, the same integer mix)
export const smokeExpected = () => {
  let sum = 0;
  let x = 0n;
  const M = 0xffffffffffffffffn;

  for (let i = 0; i < 256; i++) {
    const v = 0.5 + i * 0.75;

    sum += Math.log(v) + Math.exp(v / 64.0) * (1.0 / 3.0);
    let h = 0xcbf29ce484222325n ^ BigInt(i);

    for (let r = 0; r < 64; r++) {
      h ^= BigInt((r * 2654435761) >>> 0);
      h = (h * 0x100000001b3n) & M;
    }
    x = (x ^ ((h + 0x9e3779b97f4a7c15n + ((x << 6n) & M) + (x >> 2n)) & M)) & M;
  }
  return { sum, mix: x.toString(16).padStart(16, '0') };
};

// %a (C99 hexadecimal float) → double
const hexFloat = (s: string) => {
  const m = /^(-?)0x([01])\.?([0-9a-f]*)p([+-]\d+)$/i.exec(s);

  if (!m) return NaN;
  const mant = Number.parseInt(m[2]!, 16) + (m[3] ? Number.parseInt(m[3], 16) / 16 ** m[3].length : 0);

  return (m[1] ? -1 : 1) * mant * 2 ** Number(m[4]);
};

export interface StartOptions {
  binary: string;
  libDir: string;
  vramBudgetMb?: number;
  maxL?: number;
  tpb?: number;
  allowFault?: boolean;
  env?: NodeJS.ProcessEnv;
  wrapper?: string[]; // e.g. compute-sanitizer and its arguments (memory-safety runs): the server runs under it
  watchdogS?: number; // the server's kernel watchdog (default 300 s; a sanitizer run needs more)
  testHooks?: string[]; // TEST ONLY (negative tests): --test-corrupt-smoke, --test-corrupt-output, --test-bad-receipt, --test-stall-ms N
}

export class GpuServer {
  private child: ChildProcess;
  private chunks: Buffer[] = [];
  private have = 0;
  private frameLength = -1;
  private pending: ((r: { status: number; payload: Buffer }) => void) | null = null;
  private dead: Error | null = null;
  private stderr = '';
  loaded: { file: string; sessions: number } | null = null;

  private constructor(child: ChildProcess) {
    this.child = child;
    child.stdout!.on('data', (chunk: Buffer) => {
      this.chunks.push(chunk);
      this.have += chunk.length;
      this.drain();
    });
    child.stderr?.on('data', (c: Buffer) => {
      this.stderr += c.toString();
      if (this.stderr.length > 65536) this.stderr = this.stderr.slice(-32768);
    });
    child.on('error', (e) => this.die(new Error(`GPU evaluator could not start: ${e.message}`)));
    // GPU Phase 8: a write to a server that has just exited (EPIPE on its input pipe) is the server's death — the pending
    // request fails closed — never an unhandled stream error that would end the host process
    child.stdin!.on('error', (e) => this.die(new Error(`GPU evaluator input pipe: ${e.message}`)));
    child.on('exit', (code, signal) =>
      this.die(new Error(`GPU evaluator exited (${code ?? signal})${this.stderr ? `: ${this.stderr.trim()}` : ''}`))
    );
  }

  private die(e: Error) {
    if (!this.dead) this.dead = e;
    const p = this.pending;

    this.pending = null;
    if (p) p({ status: -1, payload: Buffer.from(this.dead.message) });
  }

  static start(o: StartOptions) {
    const args = [
      ...(o.vramBudgetMb ? ['--vram-budget-mb', String(o.vramBudgetMb)] : []),
      ...(o.maxL ? ['--max-l', String(o.maxL)] : []),
      ...(o.tpb ? ['--tpb', String(o.tpb)] : []),
      ...(o.allowFault ? ['--allow-fault-injection'] : []),
      ...(o.watchdogS ? ['--watchdog-s', String(o.watchdogS)] : []),
      ...(o.testHooks ?? [])
    ];
    const cmd = o.wrapper?.length ? o.wrapper[0]! : o.binary;
    const argv = o.wrapper?.length ? [...o.wrapper.slice(1), o.binary, ...args] : args;
    const child = spawn(cmd, argv, {
      stdio: ['pipe', 'pipe', process.env.GPU_BACKEND_SERVER_STDERR === 'inherit' ? 'inherit' : 'pipe'],
      env: {
        ...(o.env ?? process.env),
        GB_DEBUG: process.env.GB_DEBUG ?? '1',
        LD_LIBRARY_PATH: `${o.libDir}:${process.env.LD_LIBRARY_PATH ?? ''}`
      }
    });

    return new GpuServer(child);
  }

  get pid() {
    return this.child.pid;
  }

  get alive() {
    return !this.dead;
  }

  // the server's recent stderr (per-batch phase timestamps; the watchdog's report)
  get stderrTail() {
    return this.stderr.slice(-4000);
  }

  private drain() {
    if (!this.pending || this.have < 16) return;
    if (this.frameLength < 0) {
      if (this.chunks[0]!.length < 16) this.chunks = [Buffer.concat(this.chunks)];
      const head = this.chunks[0]!;

      if (head.readUInt32LE(0) !== RES_MAGIC) {
        this.dead = new Error('GPU evaluator: bad response frame');
        this.child.kill('SIGKILL');
        return;
      }
      this.frameLength = 16 + Number(head.readBigUInt64LE(8));
    }
    if (this.have < this.frameLength) return;

    const all = this.chunks.length === 1 ? this.chunks[0]! : Buffer.concat(this.chunks, this.have);
    const status = all.readUInt32LE(4);
    const payload = Buffer.from(all.subarray(16, this.frameLength));
    const rest = all.subarray(this.frameLength);
    const p = this.pending;

    this.chunks = rest.length ? [rest] : [];
    this.have = rest.length;
    this.frameLength = -1;
    this.pending = null;
    p({ status, payload });
  }

  async request(type: number, payload: Buffer = Buffer.alloc(0)): Promise<{ status: number; payload: Buffer }> {
    if (this.dead) throw this.dead;
    if (this.pending) throw new Error('GPU evaluator: one request at a time');

    const head = Buffer.alloc(16);

    head.writeUInt32LE(REQ_MAGIC, 0);
    head.writeUInt32LE(type, 4);
    head.writeBigUInt64LE(BigInt(payload.length), 8);

    const done = new Promise<{ status: number; payload: Buffer }>((resolve) => (this.pending = resolve));

    this.child.stdin!.write(head);
    if (payload.length) this.child.stdin!.write(payload);

    const r = await done;

    if (r.status === -1) throw this.dead ?? new Error('GPU evaluator died');
    return r;
  }

  async info(): Promise<ServerInfo> {
    const r = await this.request(TYPE.INFO);

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    return JSON.parse(r.payload.toString()) as ServerInfo;
  }

  // A live kernel execution whose result JavaScript verifies exactly (the evaluator's own numerics).
  async smoke(): Promise<{
    ok: boolean;
    uuid: string;
    sum: number;
    mix: string;
    expected: { sum: number; mix: string };
  }> {
    const r = await this.request(TYPE.SMOKE);

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    const m = JSON.parse(r.payload.toString()) as { sum: string; mix: string; uuid: string };
    const expected = smokeExpected();
    const sum = hexFloat(m.sum);

    return { ok: Object.is(sum, expected.sum) && m.mix === expected.mix, uuid: m.uuid, sum, mix: m.mix, expected };
  }

  async load(file: string) {
    const r = await this.request(TYPE.LOAD, Buffer.from(file));

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    const x = JSON.parse(r.payload.toString()) as {
      sessions: number;
      bars: number[];
      full: number[];
      uploadMs: number;
      tablesMs: number;
      deviceBytes: number;
    };

    this.loaded = { file, sessions: x.sessions };
    return x;
  }

  async fault() {
    const r = await this.request(TYPE.FAULT);

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    return r.payload.toString();
  }

  async close() {
    if (this.dead) return;
    try {
      await this.request(TYPE.QUIT);
    } catch {
      /* already gone */
    }
    this.child.stdin!.end();
  }

  kill(signal: NodeJS.Signals = 'SIGKILL') {
    this.child.kill(signal);
  }

  // ----- evaluation -----

  async evaluate(
    door: Door,
    tasks: Task[],
    o: BatchOptions = {},
    expectUuid?: string
  ): Promise<{ results: TaskResult[]; receipt: BatchReceipt; timing: BatchTiming }> {
    const p = this.prepare(door, tasks, o);
    const raw = await this.submit(p);

    return this.complete(p, raw, expectUuid);
  }

  // the three phases of a batch, for pipelining (GpuPool submits the next batch before it decodes this one):
  // prepare (encode, main thread) → submit (the device; one request at a time) → complete (decode and verify)
  prepare(door: Door, tasks: Task[], o: BatchOptions = {}): PreparedBatch {
    const t0 = performance.now();
    const enc = encodeBatch(door, tasks, o);

    return { door, tasks, o, enc, encodeMs: performance.now() - t0 };
  }

  async submit(p: PreparedBatch): Promise<{ payload: Buffer; roundTripMs: number }> {
    const t0 = performance.now();
    const r = await this.request(TYPE.EVAL, p.enc.buffer);

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    return { payload: r.payload, roundTripMs: performance.now() - t0 };
  }

  complete(
    p: PreparedBatch,
    raw: { payload: Buffer; roundTripMs: number },
    expectUuid?: string
  ): { results: TaskResult[]; receipt: BatchReceipt; timing: BatchTiming } {
    const t0 = performance.now();
    const dec = decodeBatch(p.door, p.tasks, p.enc, raw.payload, p.o);

    if (expectUuid && dec.receipt.uuid !== expectUuid)
      throw new GpuError(109, `receipt from ${dec.receipt.uuid}, expected ${expectUuid}`);
    return {
      results: dec.results,
      receipt: dec.receipt,
      timing: {
        encodeMs: p.encodeMs,
        roundTripMs: raw.roundTripMs,
        decodeMs: performance.now() - t0,
        requestBytes: p.enc.buffer.length,
        responseBytes: raw.payload.length
      }
    };
  }
}

export interface PreparedBatch {
  door: Door;
  tasks: Task[];
  o: BatchOptions;
  enc: EncodedBatch;
  encodeMs: number;
}
