// gpu-backend: the Node client of the CUDA evaluator server (protocol v2). The server is a separate process (a GPU
// fault never takes the optimizer down). Results are decoded BY CANDIDATE ID, never by arrival order, into the CPU
// engine's own objects — VBooks (D1 and Growth), the PoolResult — so that the UNCHANGED canonical functions build the
// records: recordOf (the compact record), riskInputsOf (the detailed record). Every batch carries a device receipt (the
// GPU's UUID, its own execution counters, an output checksum computed on the device) that the client verifies before
// a single result is used; a mismatch is an error, never a silent retry.
import { type ChildProcess, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { type BookId, type VBook, type VFill, type VTrade, familyOf, growthKeyOf, symbolOf, d1KeyOf } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type Rec, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { FundingRecord, Lot, LotFill, PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { economics } from '../vg-d1-growth-joint/context.ts';
import { isLegacy2, riskId2 } from '../d1-risk-controls-rc2/config.ts';
import { type DRec, type RcLite, type SRec, riskInputsOf } from '../vg-l0-risk-families/evaluate.ts';
import {
  BOOKS, BatchHeader, BookOut, CAND_STATUS, CandIn, CandOut, FLAGS, Fill, Funding, KINDS, Lot as LotL, LotFill as LotFillL,
  PROTOCOL_VERSION, Period, REASONS, REFUSALS, REQ_MAGIC, RES_MAGIC, Range, Receipt, ResultHeader, STATUS, TYPE, Trade
} from './layout.ts';
import { type Encoded, type Task, encodeTask } from './encode.ts';

export type { Task };

export class GpuError extends Error {
  constructor(readonly status: number, message: string) {
    super(`GPU evaluator: ${STATUS[status] ?? status}: ${message}`);
  }
}

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

export interface BatchOptions {
  tradeCapD1?: number;
  tradeCapG?: number;
  lotCap?: number;
  fundCap?: number;
  runPool?: boolean;
  returnTrades?: boolean; // the virtual trades of every book (parity; the records need only their counts)
  returnSeries?: boolean; // principal / value / held at each close (parity)
  record?: boolean; // build the canonical record (default true)
  extraFeatures?: bigint; // negative tests: capability bits the server must refuse
}

export interface Envelope {
  bankedDdMarked: number;
  bankedDdLiquidation: number;
  principalLossMarked: number;
  principalLossLiquidation: number;
}

export interface TaskResult {
  key: string;
  id: number;
  status: number;
  statusText: string;
  errInfo: number;
  features: bigint;
  books: VBook[]; // in bookIds order, as booksWithControls2 returns them
  rc: Partial<Record<'D1:GDX' | 'D1:VGT', RcLite>>;
  pool: PoolResult | null;
  record: SRec | DRec | null;
  envelope: Envelope | null;
}

export interface BatchReceipt {
  nonce: string;
  uuid: string;
  nCand: number;
  d1Executed: number;
  gExecuted: number;
  poolExecuted: number;
  kernels: number;
  outChecksum: string;
  server: { h2dMs: number; d1Ms: number; gMs: number; poolMs: number; d2hMs: number; totalMs: number; deviceBytes: number };
}

export interface BatchTiming {
  encodeMs: number;
  roundTripMs: number;
  decodeMs: number;
  requestBytes: number;
  responseBytes: number;
}

export const uuidText = (b: Uint8Array) => {
  const h = Buffer.from(b).toString('hex');

  return `GPU-${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

// the device-side output checksum (gb_server.cu hashKernel + the host combination), recomputed from the bytes received
const fnv64 = (bytes: Uint8Array, x = 0xcbf29ce484222325n) => {
  for (let i = 0; i < bytes.length; i++) {
    x ^= BigInt(bytes[i]!);
    x = (x * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return x;
};
export const outChecksumOf = (cand: Uint8Array, n: number) => {
  let x = 0xcbf29ce484222325n;
  const h = Buffer.alloc(8);

  for (let c = 0; c < n; c++) {
    h.writeBigUInt64LE(fnv64(cand.subarray(c * CandOut.size, (c + 1) * CandOut.size)));
    x = fnv64(h, x);
  }
  return x;
};

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
    child.on('exit', (code, signal) => this.die(new Error(`GPU evaluator exited (${code ?? signal})${this.stderr ? `: ${this.stderr.trim()}` : ''}`)));
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
      ...(o.watchdogS ? ['--watchdog-s', String(o.watchdogS)] : [])
    ];
    const cmd = o.wrapper?.length ? o.wrapper[0]! : o.binary;
    const argv = o.wrapper?.length ? [...o.wrapper.slice(1), o.binary, ...args] : args;
    const child = spawn(cmd, argv, {
      stdio: ['pipe', 'pipe', process.env.GPU_BACKEND_SERVER_STDERR === 'inherit' ? 'inherit' : 'pipe'],
      env: { ...(o.env ?? process.env), GB_DEBUG: process.env.GB_DEBUG ?? '1', LD_LIBRARY_PATH: `${o.libDir}:${process.env.LD_LIBRARY_PATH ?? ''}` }
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
  async smoke(): Promise<{ ok: boolean; uuid: string; sum: number; mix: string; expected: { sum: number; mix: string } }> {
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
    const x = JSON.parse(r.payload.toString()) as { sessions: number; bars: number[]; full: number[]; uploadMs: number; tablesMs: number; deviceBytes: number };

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
    const t0 = performance.now();
    const enc = encodeBatch(door, tasks, o);
    const t1 = performance.now();
    const r = await this.request(TYPE.EVAL, enc.buffer);
    const t2 = performance.now();

    if (r.status) throw new GpuError(r.status, r.payload.toString());

    const dec = decodeBatch(door, tasks, enc, r.payload, o);

    if (expectUuid && dec.receipt.uuid !== expectUuid) throw new GpuError(109, `receipt from ${dec.receipt.uuid}, expected ${expectUuid}`);

    const t3 = performance.now();

    return {
      results: dec.results,
      receipt: dec.receipt,
      timing: { encodeMs: t1 - t0, roundTripMs: t2 - t1, decodeMs: t3 - t2, requestBytes: enc.buffer.length, responseBytes: r.payload.length }
    };
  }
}

// ----- the batch -----

interface EncodedBatch {
  buffer: Buffer;
  nonce: bigint;
  flags: number;
  cands: Encoded[];
  expectD1: number;
  expectG: number;
}

const encodeBatch = (door: Door, tasks: Task[], o: BatchOptions): EncodedBatch => {
  const n = tasks.length;
  const runPool = o.runPool ?? true;
  const record = o.record ?? true;
  const flags =
    (o.returnTrades ? FLAGS.RETURN_TRADES : 0) |
    (runPool && record ? FLAGS.RETURN_LOTS | FLAGS.RETURN_DAILY : 0) |
    (runPool ? FLAGS.RUN_POOL : 0) |
    (runPool && o.returnSeries ? FLAGS.RETURN_SERIES | FLAGS.RETURN_DAILY | FLAGS.RETURN_LOTS : 0);
  const cands: Encoded[] = [];
  let nRanges = 0;

  tasks.forEach((t, i) => {
    const e = encodeTask(door, t, i, nRanges, o.extraFeatures ?? 0n);

    cands.push(e);
    nRanges += e.ranges.length;
  });

  const buf = Buffer.alloc(BatchHeader.size + n * CandIn.size + nRanges * Range.size);
  const h = BatchHeader.offsets;
  const nonce = randomBytes(8).readBigUInt64LE();

  buf.write('GB2BATCH', h.magic!, 'latin1');
  buf.writeUInt32LE(PROTOCOL_VERSION, h.version!);
  buf.writeUInt32LE(n, h.nCand!);
  buf.writeUInt32LE(flags, h.flags!);
  buf.writeUInt32LE(o.tradeCapD1 ?? 512, h.tradeCapD1!);
  buf.writeUInt32LE(o.tradeCapG ?? 512, h.tradeCapG!);
  buf.writeUInt32LE(o.lotCap ?? 512, h.lotCap!);
  buf.writeUInt32LE(o.fundCap ?? 2048, h.fundCap!);
  buf.writeUInt32LE(nRanges, h.nRanges!);
  buf.writeBigUInt64LE(nonce, h.batchNonce!);
  buf.writeUInt32LE(door.sessions - 1, h.endIndex!);

  let rp = BatchHeader.size + n * CandIn.size;
  let expectD1 = 0;
  let expectG = 0;

  cands.forEach((e, i) => {
    e.bytes.copy(buf, BatchHeader.size + i * CandIn.size);
    for (const r of e.ranges) {
      buf.writeInt32LE(r.first, rp);
      buf.writeInt32LE(r.last, rp + 4);
      rp += Range.size;
    }
    for (const b of e.books) b.startsWith('D1') ? expectD1++ : expectG++;
  });

  return { buffer: buf, nonce, flags, cands, expectD1, expectG };
};

const decodeBatch = (door: Door, tasks: Task[], enc: EncodedBatch, payload: Buffer, o: BatchOptions) => {
  const ab = new ArrayBuffer(payload.length);

  new Uint8Array(ab).set(payload);

  const dv = new DataView(ab);
  const f64 = (p: number) => dv.getFloat64(p, true);
  const i32 = (p: number) => dv.getInt32(p, true);
  const u32 = (p: number) => dv.getUint32(p, true);
  const RH = ResultHeader.offsets;

  if (Buffer.from(ab, 0, 8).toString('latin1') !== 'GB2OUT01' || u32(RH.version!) !== PROTOCOL_VERSION) throw new GpuError(101, 'bad result header');

  const n = u32(RH.nCand!);
  const flags = u32(RH.flags!);
  const S = u32(RH.sessions!);

  if (n !== tasks.length || S !== door.sessions || flags !== enc.flags) throw new GpuError(102, `result shape ${n}×${S} ≠ ${tasks.length}×${door.sessions}`);

  // ----- the receipt (verified before any result is used) -----
  const rcAt = ResultHeader.size;
  const RC = Receipt.offsets;
  const receipt: BatchReceipt = {
    nonce: dv.getBigUint64(rcAt + RC.batchNonce!, true).toString(16),
    uuid: uuidText(new Uint8Array(ab, rcAt + RC.uuid!, 16)),
    nCand: u32(rcAt + RC.nCand!),
    d1Executed: u32(rcAt + RC.d1Executed!),
    gExecuted: u32(rcAt + RC.gExecuted!),
    poolExecuted: u32(rcAt + RC.poolExecuted!),
    kernels: u32(rcAt + RC.kernels!),
    outChecksum: dv.getBigUint64(rcAt + RC.outChecksum!, true).toString(16),
    server: {
      h2dMs: f64(rcAt + RC.h2dMs!),
      d1Ms: f64(rcAt + RC.d1Ms!),
      gMs: f64(rcAt + RC.gMs!),
      poolMs: f64(rcAt + RC.poolMs!),
      d2hMs: f64(rcAt + RC.d2hMs!),
      totalMs: f64(rcAt + RC.totalMs!),
      deviceBytes: f64(rcAt + RC.deviceBytes!)
    }
  };
  const runPool = (flags & FLAGS.RUN_POOL) !== 0;

  if (dv.getBigUint64(rcAt + RC.batchNonce!, true) !== enc.nonce) throw new GpuError(109, 'receipt nonce differs from the batch');
  if (receipt.nCand !== n || receipt.d1Executed !== enc.expectD1 || receipt.gExecuted !== enc.expectG || receipt.poolExecuted !== (runPool ? n : 0))
    throw new GpuError(109, `device counters ${JSON.stringify(receipt)} disagree with the batch (D1 ${enc.expectD1}, Growth ${enc.expectG})`);

  const candAt = rcAt + Receipt.size;

  if (outChecksumOf(new Uint8Array(ab, candAt, n * CandOut.size), n).toString(16) !== receipt.outChecksum)
    throw new GpuError(109, 'the results differ from the device checksum (corrupted transfer)');

  const CO = CandOut.offsets;
  const BO = BookOut.offsets;
  const outAt = (c: number) => candAt + c * CandOut.size;
  const bookAt = (c: number, b: number) => outAt(c) + CO.book! + b * BookOut.size;
  let p = candAt + n * CandOut.size;
  const statuses: number[] = [];

  for (let c = 0; c < n; c++) {
    if (u32(outAt(c) + CO.id!) !== c) throw new GpuError(102, `candidate id ${u32(outAt(c))} at slot ${c}`);
    if (runPool && i32(outAt(c) + CO.executed!) !== 1) throw new GpuError(109, `candidate ${c} carries no device execution mark`);
    statuses.push(i32(outAt(c) + CO.status!));
  }

  // trades: per candidate (status ok), books 0–3
  const trades: VTrade[][][] = tasks.map(() => [[], [], [], []]);

  for (let c = 0; c < n; c++) {
    if (statuses[c] !== 0) continue;
    for (let b = 0; b < 4; b++) {
      const count = i32(bookAt(c, b) + BO.nTrades!);

      if (flags & FLAGS.RETURN_TRADES) for (let t = 0; t < count; t++, p += Trade.size) trades[c]![b]!.push(readTrade(dv, p, BOOKS[b]!));
      else trades[c]![b] = new Array<VTrade>(count); // the records read only each book's trade count
    }
  }

  const lotStart: number[] = [];
  const fundStart: number[] = [];

  if (flags & FLAGS.RETURN_LOTS) {
    for (let c = 0; c < n; c++) {
      lotStart.push(p);
      if (statuses[c] === 0) p += i32(outAt(c) + CO.nLots!) * LotL.size;
    }
    for (let c = 0; c < n; c++) {
      fundStart.push(p);
      if (statuses[c] === 0) p += i32(outAt(c) + CO.nFunding!) * Funding.size;
    }
  }

  const nRanges = enc.cands.reduce((a, e) => a + e.ranges.length, 0);
  const periodAt = p;

  if (runPool) p += nRanges * Period.size;

  const dailyAt = p;

  if (flags & FLAGS.RETURN_DAILY) p += n * S * 8;

  const seriesAt = p;
  const results: TaskResult[] = [];
  const budget = economics.budget;

  for (let c = 0; c < n; c++) {
    const a = outAt(c);
    const t = tasks[c]!;
    const e = enc.cands[c]!;
    const status = statuses[c]!;
    const res: TaskResult = {
      key: t.k,
      id: c,
      status,
      statusText: CAND_STATUS[status] ?? String(status),
      errInfo: i32(a + CO.errInfo!),
      features: e.features,
      books: [],
      rc: {},
      pool: null,
      record: null,
      envelope: null
    };

    results.push(res);
    if (status !== 0) continue;

    for (const book of e.books) {
      const b = BOOKS.indexOf(book as (typeof BOOKS)[number]);
      const bo = bookAt(c, b);
      const firstDS = i32(bo + BO.firstDS!);
      const isD1 = b < 2;
      const g = isD1 ? null : e.growth[book as 'G:GDX']!;
      const vb: VBook = {
        book,
        key: isD1 ? d1KeyOf(t.quad.d1[symbolOf(book)]) : growthKeyOf({ ...t.quad.g[symbolOf(book)], costBpsPerSide: g!.friction.costBps }),
        trades: trades[c]![b]!,
        signals: i32(bo + BO.signals!),
        firstDecision: firstDS >= 0 ? door.dates[firstDS]! : null,
        endIndex: S - 1,
        standalone: { net: f64(bo + BO.net!), realized: f64(bo + BO.realized!), minuteDd: f64(bo + BO.minuteDd!), dailyDd: f64(bo + BO.dailyDd!) }
      };

      res.books.push(vb);
      if (isD1)
        res.rc[book as 'D1:GDX'] = {
          virtualTrades: i32(bo + BO.nTrades!),
          protective: i32(bo + BO.protectiveExits!),
          protectiveGap: i32(bo + BO.protectiveGapExits!),
          entryDay: i32(bo + BO.entryDayExits!),
          maximumHold: i32(bo + BO.maximumHoldExits!),
          adaptive: i32(bo + BO.adaptiveExtensions!),
          episodes: i32(bo + BO.episodes!),
          blocks: i32(bo + BO.blocks!),
          blockedSessions: i32(bo + BO.blockedSessions!)
        };
    }

    if (!runPool || !(flags & FLAGS.RETURN_LOTS)) continue;

    const byBook = new Map(res.books.map((b) => [b.book, b]));
    const nLots = i32(a + CO.nLots!);
    const lots: Lot[] = [];
    const LO = LotL.offsets;
    const LF = LotFillL.offsets;

    for (let l = 0; l < nLots; l++) {
      const la = lotStart[c]! + l * LotL.size;
      const book = BOOKS[i32(la + LO.book!)]!;
      const trade = byBook.get(book)!.trades[i32(la + LO.tradeIdx!)]!; // undefined without returned trades (never read by the records)
      const fills: LotFill[] = [];

      for (let j = 0; j < i32(la + LO.nFills!); j++) {
        const fa = la + LO.fills! + j * LotFillL.size;

        fills.push({
          s: i32(fa + LF.s!),
          k: i32(fa + LF.k!),
          t: f64(fa + LF.t!),
          raw: f64(fa + LF.raw!),
          price: f64(fa + LF.price!),
          partial: i32(fa + LF.partial!) !== 0,
          shares: f64(fa + LF.shares!),
          principal: f64(fa + LF.principal!),
          interest: f64(fa + LF.interest!),
          proceeds: f64(fa + LF.proceeds!),
          net: f64(fa + LF.net!),
          reason: REASONS[i32(fa + LF.reason!)]!
        });
      }

      lots.push({
        id: i32(la + LO.id!),
        book,
        family: familyOf(book),
        symbol: symbolOf(book),
        trade,
        principal0: f64(la + LO.principal0!),
        shares0: f64(la + LO.shares0!),
        shares: f64(la + LO.shares!),
        principal: f64(la + LO.principal!),
        entryS: i32(la + LO.entryS!),
        entryT: f64(la + LO.entryT!),
        entryRaw: f64(la + LO.entryRaw!),
        entryPrice: f64(la + LO.entryPrice!),
        entryTs: f64(la + LO.entryTs!),
        fills,
        realized: f64(la + LO.realized!),
        interest: f64(la + LO.interest!),
        open: i32(la + LO.open!) !== 0,
        net: f64(la + LO.net!),
        unrealized: f64(la + LO.unrealized!),
        costs: f64(la + LO.costs!),
        worst: f64(la + LO.worst!),
        worstT: f64(la + LO.worstT!),
        best: f64(la + LO.best!),
        bestT: f64(la + LO.bestT!)
      });
    }

    const funding: FundingRecord[] = [];
    const FO = Funding.offsets;

    for (let j = 0; j < i32(a + CO.nFunding!); j++) {
      const fa = fundStart[c]! + j * Funding.size;
      const granted = i32(fa + FO.granted!) !== 0;
      const ob = i32(fa + FO.occupantBook!);
      const ol = i32(fa + FO.occupantLot!);
      const ownBook = BOOKS[i32(fa + FO.book!)]!;

      funding.push({
        book: ownBook,
        trade: i32(fa + FO.trade!),
        kind: KINDS[i32(fa + FO.kind!)]!,
        s: i32(fa + FO.s!),
        t: f64(fa + FO.t!),
        price: f64(fa + FO.price!),
        grant: granted ? budget : 0,
        outcome: granted ? 'granted' : 'refused',
        reason: REFUSALS[i32(fa + FO.reason!)]!,
        occupant: ol > 0 ? `${BOOKS[ob]} lot ${ol} ($${f64(fa + FO.occupantPrincipal!).toFixed(2)})` : ol === 0 ? `${BOOKS[ob]} order ($${budget.toFixed(2)})` : '',
        occupantBook: ob >= 0 ? BOOKS[ob]! : null
      });
    }

    const pOff = enc.cands[c]!.bytes.readInt32LE(CandIn.offsets.periodOff!);
    const pN = enc.cands[c]!.bytes.readInt32LE(CandIn.offsets.periodN!);
    const PO = Period.offsets;
    const periods: PoolResult['periods'] = [];

    for (let j = 0; j < pN; j++) {
      const pa = periodAt + (pOff + j) * Period.size;

      periods.push({
        boundary: i32(pa + PO.boundary!),
        equity: f64(pa + PO.equity!),
        dd: { max: f64(pa + PO.dd!), peakT: f64(pa + PO.dd! + 8), troughT: f64(pa + PO.dd! + 16), recoveryT: f64(pa + PO.dd! + 24) }
      });
    }

    const decisions = Object.fromEntries(
      BOOKS.map((b, j) => [b, { total: i32(a + CO.decisions! + j * 12), granted: i32(a + CO.decisions! + j * 12 + 4), refused: i32(a + CO.decisions! + j * 12 + 8) }])
    ) as PoolResult['decisions'];
    const refusals: Record<string, number> = {};

    for (let j = 1; j < 5; j++) {
      const x = i32(a + CO.refusals! + j * 4);

      if (x > 0) refusals[REFUSALS[j]!] = x;
    }

    const series = (k: number) => new Float64Array(ab.slice(seriesAt + (k * n + c) * S * 8, seriesAt + (k * n + c + 1) * S * 8));
    const pool: PoolResult = {
      endIndex: S - 1,
      net: f64(a + CO.net!),
      realized: f64(a + CO.realized!),
      unrealized: f64(a + CO.unrealized!),
      dd: { max: f64(a + CO.dd!), peakT: f64(a + CO.dd! + 8), troughT: f64(a + CO.dd! + 16), recoveryT: f64(a + CO.dd! + 24) },
      ddDaily: { max: f64(a + CO.ddDaily!), peakT: f64(a + CO.ddDaily! + 8), troughT: f64(a + CO.ddDaily! + 16), recoveryT: f64(a + CO.ddDaily! + 24) },
      periods,
      lots,
      funding,
      daily: new Float64Array(ab.slice(dailyAt + c * S * 8, dailyAt + (c + 1) * S * 8)),
      principalAtClose: flags & FLAGS.RETURN_SERIES ? series(0) : new Float64Array(0),
      valueAtClose: flags & FLAGS.RETURN_SERIES ? series(1) : new Float64Array(0),
      heldAtClose: flags & FLAGS.RETURN_SERIES ? new Int8Array(ab.slice(seriesAt + 2 * n * S * 8 + c * S, seriesAt + 2 * n * S * 8 + (c + 1) * S)) : new Int8Array(0),
      peakPrincipal: f64(a + CO.peakPrincipal!),
      peakValue: f64(a + CO.peakValue!),
      sessionsHeld: i32(a + CO.sessionsHeld!),
      decisions,
      refusals,
      marks: Number(dv.getBigInt64(a + CO.marks!, true)),
      markChanges: null
    };

    res.pool = pool;
    if (t.risk)
      res.envelope = {
        bankedDdMarked: f64(a + CO.bdMarked!),
        bankedDdLiquidation: f64(a + CO.bdLiq!),
        principalLossMarked: f64(a + CO.plMarked!),
        principalLossLiquidation: f64(a + CO.plLiq!)
      };

    if (o.record ?? true) {
      const rec: Rec = recordOf(door, t.quad, { books: res.books, result: pool }, t.options);
      const legacy = isLegacy2(t.controls);
      const srec = { ...(legacy ? rec : { ...rec, id: riskId2(t.quad, t.controls) }), rc: res.rc } as SRec;

      res.record = t.detail ? ({ ...srec, risk: riskInputsOf(door, { result: pool }, rec) } as DRec) : srec;
    }
  }

  return { results, receipt };
};

const readTrade = (dv: DataView, at: number, book: BookId): VTrade => {
  const T = Trade.offsets;
  const F = Fill.offsets;
  const f64 = (p: number) => dv.getFloat64(at + p, true);
  const i32 = (p: number) => dv.getInt32(at + p, true);
  const nFills = i32(T.nFills!);
  const fills: VFill[] = [];

  for (let j = 0; j < nFills; j++) {
    const fa = T.fills! + j * Fill.size;

    fills.push({
      s: i32(fa + F.s!),
      k: i32(fa + F.k!),
      t: f64(fa + F.t!),
      raw: f64(fa + F.raw!),
      price: f64(fa + F.price!),
      partial: i32(fa + F.partial!) !== 0,
      f: f64(fa + F.f!),
      reason: REASONS[i32(fa + F.reason!)]!
    });
  }

  return {
    book,
    id: i32(T.id!),
    kind: KINDS[i32(T.kind!)]!,
    dS: i32(T.dS!),
    dT: f64(T.dT!),
    dPrice: f64(T.dPrice!),
    eS: i32(T.eS!),
    eK: i32(T.eK!),
    eT: f64(T.eT!),
    eRaw: f64(T.eRaw!),
    ePrice: f64(T.ePrice!),
    fills,
    open: i32(T.open!) !== 0,
    vNet: f64(T.vNet!),
    vInterest: f64(T.vInterest!)
  };
};
