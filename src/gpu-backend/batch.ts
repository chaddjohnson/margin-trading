// gpu-backend: the BATCH CODEC of protocol v2 — the single implementation of how a batch of tasks becomes the device's
// request bytes and how the device's response becomes the CPU engine's own objects (VBooks, the PoolResult) and, by the
// UNCHANGED canonical reductions (recordOf, riskInputsOf), the records. Both host paths use it:
//
//   serial    GpuServer.prepare / complete (client.ts): one shard on the calling thread (Phase 2's path);
//   parallel  HostPipeline (hostPipeline.ts): contiguous shards of the batch encoded and decoded on worker threads
//             (hostWorker.ts), the request assembled and the receipt verified on the calling thread.
//
// A batch is split into contiguous shards [c0, c1) of candidate ids. Encoding a shard writes each candidate's GbCandIn
// with its GLOBAL id and range offsets relative to the shard; assembly adds the shard's global range base, so the
// assembled request is byte-for-byte the one-shard request (only the random nonce differs between two encodings).
// Decoding is per candidate from a layout computed over the whole response (every candidate's trade, lot and funding
// offsets), so a shard decodes exactly the objects the one-shard decode builds for it. The receipt is verified before
// any result is used: header, nonce, the device's execution counters, every candidate's id and execution mark, and the
// FNV-1a-64 output checksum — the per-candidate hashes may be computed in shards, their combination is sequential and
// identical to the device's. Nothing here evaluates a strategy: every number of a result is the GPU's.
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
  PROTOCOL_VERSION, Period, REASONS, REFUSALS, Range, Receipt, ResultHeader, STATUS, Trade
} from './layout.ts';
import { type Task, encodeTask } from './encode.ts';

export type { Task };

export class GpuError extends Error {
  constructor(readonly status: number, message: string) {
    super(`GPU evaluator: ${STATUS[status] ?? status}: ${message}`);
  }
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

export const uuidText = (b: Uint8Array) => {
  const h = Buffer.from(b).toString('hex');

  return `GPU-${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

// ----- the output checksum (gb_server.cu hashKernel + the host combination), recomputed from the bytes received -----

const fnv64 = (bytes: Uint8Array, x = 0xcbf29ce484222325n) => {
  for (let i = 0; i < bytes.length; i++) {
    x ^= BigInt(bytes[i]!);
    x = (x * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return x;
};

// the per-candidate FNV-1a-64 of GbCandOut c0 … c1−1 (`cand` starts at candidate 0's GbCandOut)
export const candHashes = (cand: Uint8Array, c0: number, c1: number) => {
  const out = new BigUint64Array(c1 - c0);

  for (let c = c0; c < c1; c++) out[c - c0] = fnv64(cand.subarray(c * CandOut.size, (c + 1) * CandOut.size));
  return out;
};

// the sequential combination of the per-candidate hashes, in candidate order (the device's own combination)
export const combineChecksum = (hashes: BigUint64Array) => {
  let x = 0xcbf29ce484222325n;
  const h = Buffer.alloc(8);

  for (let c = 0; c < hashes.length; c++) {
    h.writeBigUInt64LE(hashes[c]!);
    x = fnv64(h, x);
  }
  return x;
};

export const outChecksumOf = (cand: Uint8Array, n: number) => combineChecksum(candHashes(cand, 0, n));

// ----- encoding -----

// what decoding needs to know of each encoded candidate (small; the request bytes carry the rest)
export interface CandMeta {
  books: BookId[]; // the books given to the pool (bookIds order)
  features: bigint;
  growthCostBps: Partial<Record<'G:GDX' | 'G:VGT', number>>; // the Growth book's friction cost (its parameter key)
  nRanges: number;
  periodOff: number; // GLOBAL after assembly (relative to the shard while a shard is not yet assembled)
  periodN: number;
}

export interface EncodedShard {
  c0: number; // the shard's first candidate id
  n: number;
  bytes: Uint8Array; // n × GbCandIn, ids global, range offsets relative to the shard
  ranges: Int32Array; // first, last pairs in candidate order
  metas: CandMeta[];
  d1: number; // D1 books given to the device
  g: number; // Growth books given to the device
}

// one shard of a batch: tasks[i] is candidate c0 + i
export const encodeShard = (door: Door, tasks: readonly Task[], c0: number, o: BatchOptions): EncodedShard => {
  const bytes = new Uint8Array(tasks.length * CandIn.size);
  const metas: CandMeta[] = [];
  const ranges: number[] = [];
  let nRanges = 0;
  let d1 = 0;
  let g = 0;

  tasks.forEach((t, i) => {
    const e = encodeTask(door, t, c0 + i, nRanges, o.extraFeatures ?? 0n);
    const growthCostBps: CandMeta['growthCostBps'] = {};

    bytes.set(e.bytes, i * CandIn.size);
    for (const r of e.ranges) ranges.push(r.first, r.last);
    for (const b of e.books) b.startsWith('D1') ? d1++ : g++;
    for (const [b, x] of Object.entries(e.growth)) growthCostBps[b as 'G:GDX'] = x!.friction.costBps;
    metas.push({
      books: e.books,
      features: e.features,
      growthCostBps,
      nRanges: e.ranges.length,
      periodOff: e.bytes.readInt32LE(CandIn.offsets.periodOff!),
      periodN: e.bytes.readInt32LE(CandIn.offsets.periodN!)
    });
    nRanges += e.ranges.length;
  });

  return { c0, n: tasks.length, bytes, ranges: Int32Array.from(ranges), metas, d1, g };
};

export const batchFlags = (o: BatchOptions) => {
  const runPool = o.runPool ?? true;
  const record = o.record ?? true;

  return (
    (o.returnTrades ? FLAGS.RETURN_TRADES : 0) |
    (runPool && record ? FLAGS.RETURN_LOTS | FLAGS.RETURN_DAILY : 0) |
    (runPool ? FLAGS.RUN_POOL : 0) |
    (runPool && o.returnSeries ? FLAGS.RETURN_SERIES | FLAGS.RETURN_DAILY | FLAGS.RETURN_LOTS : 0)
  );
};

export interface EncodedBatch {
  buffer: Buffer;
  nonce: bigint;
  flags: number;
  n: number;
  metas: CandMeta[]; // every candidate, global offsets
  shards: { c0: number; c1: number; rangeBase: number }[];
  nRanges: number;
  expectD1: number;
  expectG: number;
}

// the request from its shards (in candidate order; together they cover 0 … n−1)
export const assembleBatch = (door: Door, shards: readonly EncodedShard[], o: BatchOptions): EncodedBatch => {
  const n = shards.reduce((a, s) => a + s.n, 0);
  const nRanges = shards.reduce((a, s) => a + s.ranges.length / 2, 0);
  const flags = batchFlags(o);
  const buf = Buffer.alloc(BatchHeader.size + n * CandIn.size + nRanges * Range.size);
  const h = BatchHeader.offsets;
  const nonce = randomBytes(8).readBigUInt64LE();
  const off = CandIn.offsets;

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

  const metas: CandMeta[] = [];
  const parts: EncodedBatch['shards'] = [];
  let next = 0;
  let rangeBase = 0;
  let rp = BatchHeader.size + n * CandIn.size;
  let expectD1 = 0;
  let expectG = 0;

  for (const s of shards) {
    if (s.c0 !== next) throw new Error(`batch shards out of order: shard at ${s.c0}, expected ${next}`);

    const at = BatchHeader.size + s.c0 * CandIn.size;

    buf.set(s.bytes, at);
    for (let i = 0; i < s.n; i++) {
      const c = at + i * CandIn.size;

      if (buf.readUInt32LE(c + off.id!) !== s.c0 + i) throw new Error(`candidate ${s.c0 + i} encoded with id ${buf.readUInt32LE(c + off.id!)}`);
      buf.writeInt32LE(buf.readInt32LE(c + off.blackoutOff!) + rangeBase, c + off.blackoutOff!);
      buf.writeInt32LE(buf.readInt32LE(c + off.periodOff!) + rangeBase, c + off.periodOff!);
      metas.push({ ...s.metas[i]!, periodOff: s.metas[i]!.periodOff + rangeBase });
    }
    for (let j = 0; j < s.ranges.length; j += 2) {
      buf.writeInt32LE(s.ranges[j]!, rp);
      buf.writeInt32LE(s.ranges[j + 1]!, rp + 4);
      rp += Range.size;
    }
    parts.push({ c0: s.c0, c1: s.c0 + s.n, rangeBase });
    rangeBase += s.ranges.length / 2;
    expectD1 += s.d1;
    expectG += s.g;
    next = s.c0 + s.n;
  }

  return { buffer: buf, nonce, flags, n, metas, shards: parts, nRanges, expectD1, expectG };
};

// the one-shard request (the serial path)
export const encodeBatch = (door: Door, tasks: readonly Task[], o: BatchOptions) => assembleBatch(door, [encodeShard(door, tasks, 0, o)], o);

// ----- decoding -----

const DECODER = Symbol('decoder');

interface View {
  [DECODER]: true;
  ab: ArrayBufferLike;
  dv: DataView;
  f64: (p: number) => number;
  i32: (p: number) => number;
  u32: (p: number) => number;
}

export const viewOf = (ab: ArrayBufferLike): View => {
  const dv = new DataView(ab);

  return { [DECODER]: true, ab, dv, f64: (p) => dv.getFloat64(p, true), i32: (p) => dv.getInt32(p, true), u32: (p) => dv.getUint32(p, true) };
};

// a copy of [a, b) in a plain (non-shared) ArrayBuffer — the arrays a result keeps are always its own
const copyBytes = (ab: ArrayBufferLike, a: number, b: number) => {
  const out = new ArrayBuffer(b - a);

  new Uint8Array(out).set(new Uint8Array(ab, a, b - a));
  return out;
};

const candAtOf = () => ResultHeader.size + Receipt.size;

// header, shape and receipt — verified on the calling thread before any result is decoded or used (the checksum is
// verified separately: see verifyChecksum)
export const verifyResponse = (v: View, enc: Pick<EncodedBatch, 'n' | 'flags' | 'nonce' | 'expectD1' | 'expectG'>, sessions: number) => {
  const RH = ResultHeader.offsets;

  if (Buffer.from(v.ab as ArrayBuffer, 0, 8).toString('latin1') !== 'GB2OUT01' || v.u32(RH.version!) !== PROTOCOL_VERSION) throw new GpuError(101, 'bad result header');

  const n = v.u32(RH.nCand!);
  const flags = v.u32(RH.flags!);
  const S = v.u32(RH.sessions!);

  if (n !== enc.n || S !== sessions || flags !== enc.flags) throw new GpuError(102, `result shape ${n}×${S} ≠ ${enc.n}×${sessions}`);

  const rcAt = ResultHeader.size;
  const RC = Receipt.offsets;
  const receipt: BatchReceipt = {
    nonce: v.dv.getBigUint64(rcAt + RC.batchNonce!, true).toString(16),
    uuid: uuidText(new Uint8Array(v.ab, rcAt + RC.uuid!, 16)),
    nCand: v.u32(rcAt + RC.nCand!),
    d1Executed: v.u32(rcAt + RC.d1Executed!),
    gExecuted: v.u32(rcAt + RC.gExecuted!),
    poolExecuted: v.u32(rcAt + RC.poolExecuted!),
    kernels: v.u32(rcAt + RC.kernels!),
    outChecksum: v.dv.getBigUint64(rcAt + RC.outChecksum!, true).toString(16),
    server: {
      h2dMs: v.f64(rcAt + RC.h2dMs!),
      d1Ms: v.f64(rcAt + RC.d1Ms!),
      gMs: v.f64(rcAt + RC.gMs!),
      poolMs: v.f64(rcAt + RC.poolMs!),
      d2hMs: v.f64(rcAt + RC.d2hMs!),
      totalMs: v.f64(rcAt + RC.totalMs!),
      deviceBytes: v.f64(rcAt + RC.deviceBytes!)
    }
  };
  const runPool = (flags & FLAGS.RUN_POOL) !== 0;

  if (v.dv.getBigUint64(rcAt + RC.batchNonce!, true) !== enc.nonce) throw new GpuError(109, 'receipt nonce differs from the batch');
  if (receipt.nCand !== n || receipt.d1Executed !== enc.expectD1 || receipt.gExecuted !== enc.expectG || receipt.poolExecuted !== (runPool ? n : 0))
    throw new GpuError(109, `device counters ${JSON.stringify(receipt)} disagree with the batch (D1 ${enc.expectD1}, Growth ${enc.expectG})`);

  return { receipt, n, flags, S };
};

export const candidateBytes = (v: View, n: number) => new Uint8Array(v.ab, candAtOf(), n * CandOut.size);

export const verifyChecksum = (receipt: BatchReceipt, hashes: BigUint64Array) => {
  if (combineChecksum(hashes).toString(16) !== receipt.outChecksum) throw new GpuError(109, 'the results differ from the device checksum (corrupted transfer)');
};

// every candidate's id and device execution mark (before any result is used)
export const verifyCandidates = (v: View, n: number, flags: number) => {
  const CO = CandOut.offsets;
  const candAt = candAtOf();
  const runPool = (flags & FLAGS.RUN_POOL) !== 0;

  for (let c = 0; c < n; c++) {
    const a = candAt + c * CandOut.size;

    if (v.u32(a + CO.id!) !== c) throw new GpuError(102, `candidate id ${v.u32(a)} at slot ${c}`);
    if (runPool && v.i32(a + CO.executed!) !== 1) throw new GpuError(109, `candidate ${c} carries no device execution mark`);
  }
};

// where every candidate's variable-length outputs start (the response's sections in their fixed order)
export interface ResponseLayout {
  trades: Int32Array; // [c * 4 + b]: the first byte of candidate c's book b trades (RETURN_TRADES)
  lots: Int32Array; // [c]: candidate c's first lot (RETURN_LOTS)
  funding: Int32Array; // [c]: candidate c's first funding record (RETURN_LOTS)
  periodAt: number;
  dailyAt: number;
  seriesAt: number;
}

export const layoutOf = (v: View, n: number, flags: number, S: number, totalRanges: number): ResponseLayout => {
  const CO = CandOut.offsets;
  const BO = BookOut.offsets;
  const candAt = candAtOf();
  const outAt = (c: number) => candAt + c * CandOut.size;
  const bookAt = (c: number, b: number) => outAt(c) + CO.book! + b * BookOut.size;
  const ok = (c: number) => v.i32(outAt(c) + CO.status!) === 0;
  const trades = new Int32Array(n * 4);
  const lots = new Int32Array(n);
  const funding = new Int32Array(n);
  let p = candAt + n * CandOut.size;

  for (let c = 0; c < n; c++) {
    for (let b = 0; b < 4; b++) {
      trades[c * 4 + b] = p;
      if (ok(c) && flags & FLAGS.RETURN_TRADES) p += v.i32(bookAt(c, b) + BO.nTrades!) * Trade.size;
    }
  }
  if (flags & FLAGS.RETURN_LOTS) {
    for (let c = 0; c < n; c++) {
      lots[c] = p;
      if (ok(c)) p += v.i32(outAt(c) + CO.nLots!) * LotL.size;
    }
    for (let c = 0; c < n; c++) {
      funding[c] = p;
      if (ok(c)) p += v.i32(outAt(c) + CO.nFunding!) * Funding.size;
    }
  }

  const periodAt = p;

  if (flags & FLAGS.RUN_POOL) p += totalRanges * Period.size;

  const dailyAt = p;

  if (flags & FLAGS.RETURN_DAILY) p += n * S * 8;
  return { trades, lots, funding, periodAt, dailyAt, seriesAt: p };
};

const readTrade = (v: View, at: number, book: BookId): VTrade => {
  const T = Trade.offsets;
  const F = Fill.offsets;
  const f64 = (p: number) => v.f64(at + p);
  const i32 = (p: number) => v.i32(at + p);
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

// Candidates c0 … c1−1 of a verified response: tasks[i] and metas[i] belong to candidate c0 + i. Each result is built
// exactly as the one-shard decode builds it (Phase 2's decodeBatch, per candidate).
export const decodeRange = (
  door: Door,
  tasks: readonly Task[],
  metas: readonly CandMeta[],
  v: View,
  n: number,
  flags: number,
  S: number,
  L: ResponseLayout,
  c0: number,
  c1: number,
  o: BatchOptions
): TaskResult[] => {
  const CO = CandOut.offsets;
  const BO = BookOut.offsets;
  const candAt = candAtOf();
  const outAt = (c: number) => candAt + c * CandOut.size;
  const bookAt = (c: number, b: number) => outAt(c) + CO.book! + b * BookOut.size;
  const runPool = (flags & FLAGS.RUN_POOL) !== 0;
  const results: TaskResult[] = [];
  const budget = economics.budget;
  const { f64, i32 } = v;

  for (let c = c0; c < c1; c++) {
    const a = outAt(c);
    const t = tasks[c - c0]!;
    const e = metas[c - c0]!;
    const status = i32(a + CO.status!);
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

    // trades: books 0–3
    const trades: VTrade[][] = [[], [], [], []];

    for (let b = 0; b < 4; b++) {
      const count = i32(bookAt(c, b) + BO.nTrades!);

      if (flags & FLAGS.RETURN_TRADES) for (let k = 0, p = L.trades[c * 4 + b]!; k < count; k++, p += Trade.size) trades[b]!.push(readTrade(v, p, BOOKS[b]!));
      else trades[b] = new Array<VTrade>(count); // the records read only each book's trade count
    }

    for (const book of e.books) {
      const b = BOOKS.indexOf(book as (typeof BOOKS)[number]);
      const bo = bookAt(c, b);
      const firstDS = i32(bo + BO.firstDS!);
      const isD1 = b < 2;
      const vb: VBook = {
        book,
        key: isD1 ? d1KeyOf(t.quad.d1[symbolOf(book)]) : growthKeyOf({ ...t.quad.g[symbolOf(book)], costBpsPerSide: e.growthCostBps[book as 'G:GDX']! }),
        trades: trades[b]!,
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
      const la = L.lots[c]! + l * LotL.size;
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
      const fa = L.funding[c]! + j * Funding.size;
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

    const PO = Period.offsets;
    const periods: PoolResult['periods'] = [];

    for (let j = 0; j < e.periodN; j++) {
      const pa = L.periodAt + (e.periodOff + j) * Period.size;

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

    const series = (k: number) => new Float64Array(copyBytes(v.ab, L.seriesAt + (k * n + c) * S * 8, L.seriesAt + (k * n + c + 1) * S * 8));
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
      daily: new Float64Array(copyBytes(v.ab, L.dailyAt + c * S * 8, L.dailyAt + (c + 1) * S * 8)),
      principalAtClose: flags & FLAGS.RETURN_SERIES ? series(0) : new Float64Array(0),
      valueAtClose: flags & FLAGS.RETURN_SERIES ? series(1) : new Float64Array(0),
      heldAtClose: flags & FLAGS.RETURN_SERIES ? new Int8Array(copyBytes(v.ab, L.seriesAt + 2 * n * S * 8 + c * S, L.seriesAt + 2 * n * S * 8 + (c + 1) * S)) : new Int8Array(0),
      peakPrincipal: f64(a + CO.peakPrincipal!),
      peakValue: f64(a + CO.peakValue!),
      sessionsHeld: i32(a + CO.sessionsHeld!),
      decisions,
      refusals,
      marks: Number(v.dv.getBigInt64(a + CO.marks!, true)),
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

  return results;
};

// the one-shard decode (the serial path): verify the receipt, then decode every candidate on the calling thread
export const decodeBatch = (door: Door, tasks: readonly Task[], enc: EncodedBatch, payload: Buffer, o: BatchOptions) => {
  const ab = new ArrayBuffer(payload.length);

  new Uint8Array(ab).set(payload);

  const v = viewOf(ab);
  const { receipt, n, flags, S } = verifyResponse(v, enc, door.sessions);

  verifyChecksum(receipt, candHashes(candidateBytes(v, n), 0, n));
  verifyCandidates(v, n, flags);
  return { results: decodeRange(door, tasks, enc.metas, v, n, flags, S, layoutOf(v, n, flags, S, enc.nRanges), 0, n, o), receipt };
};

// the record-only view a search pool consumes (the books and the pooled replay stay in the decoder's thread)
export const leanResult = (r: TaskResult): TaskResult => ({ ...r, books: [], rc: {}, pool: null });
