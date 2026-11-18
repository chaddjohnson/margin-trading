// The GPU proof of concept's Node client (protocol v1, src/gpu-phase1/cuda/gp1.h). It runs the CUDA evaluator as a
// separate server process (a GPU fault can never take the caller down), encodes configurations, decodes results BY
// CANDIDATE ID (never by arrival order) and rebuilds the CPU engine's own objects — the D1 VBooks and the PoolResult —
// so that the unchanged canonical `recordOf` computes the compact record. Growth books are computed by the canonical
// CPU engine (Priority 3's booksOf) and supplied to the GPU pool as external virtual trades (PROTOCOL.md §6).
import { type ChildProcess, spawn } from 'node:child_process';
import path from 'node:path';
import { d1StrategyParams, type BookId, type VBook, type VFill, type VTrade, baseFriction, familyOf, symbolOf } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { indexOnOrAfter } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, booksOf as p3BooksOf, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { Lot, LotFill, PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { type Quad, quadId } from '../vg-d1-growth-joint/space.ts';
import { economics } from '../vg-d1-growth-joint/context.ts';
import { type RiskConfig2, canonicalConfig2, isLegacy2, riskId2, validateAgainstGrids2 } from '../d1-risk-controls-rc2/config.ts';
import type { RcLite, SRec } from '../vg-l0-risk-families/evaluate.ts';
import { buildDir } from './context.ts';

export const PROTOCOL_VERSION = 1;
export const SIZES = { cand: 304, d1: 128, trade: 280, fill: 48, out: 344, bookOut: 80, lot: 448, lotFill: 80, batchHeader: 64, resultHeader: 96 } as const;
export const FEATURE = {
  RC_CONTROLS: 1 << 0,
  EXT_GROWTH: 1 << 1,
  NEXT_OPEN: 1 << 2,
  ARM_START: 1 << 3,
  GROWTH_ON_GPU: 1 << 8,
  POOL_BLACKOUTS: 1 << 9,
  POOL_PERIODS: 1 << 10,
  POOL_WHOLE_SHARES: 1 << 11,
  POOL_TIE_ORDER: 1 << 12,
  POOL_FUND_FROM: 1 << 13,
  POOL_DETAIL_LOG: 1 << 14,
  RECORD_MARKS: 1 << 15
} as const;
export const FLAGS = { RETURN_TRADES: 1, RETURN_LOTS: 2, RUN_POOL: 4, RETURN_SERIES: 8 } as const;
export const STATUS: Record<number, string> = {
  0: 'ok', 100: 'bad frame', 101: 'bad version', 102: 'bad size', 103: 'unsupported feature', 104: 'no dataset',
  105: 'GPU memory', 106: 'CUDA error', 107: 'dataset check failed', 108: 'fault injection refused'
};
export const CAND_STATUS: Record<number, string> = {
  0: 'ok', 1: 'trade capacity', 2: 'lot capacity', 3: 'fill capacity', 4: 'invalid parameter', 10: 'decisions not strictly ordered',
  11: 'decision while the decline gate is blocked', 12: 'setup or continuation while blocked', 13: 'a profitable protective exit',
  14: 'carried sale minute missing', 15: 'protective level not below the fill', 16: 'unexpected legacy exit', 17: 'entry-day interest',
  18: 'a profitable exit while blocked', 20: 'pool decision while holding', 21: 'pool exit fill skipped', 22: 'external book unordered'
};
const D1_REASONS = ['maximum hold', 'trailing stop', 'trailing stop gap', 'buffered intraday loss', 'protective stop', 'protective stop gap'];
const BOOKS: BookId[] = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'];

export const defaultBinary = () => process.env.GPUP1_BINARY ?? path.join(buildDir, 'gp1');
export const cudaLibDir = () =>
  `${process.env.GPUP1_CUDA_HOME ?? '/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv/lib/python3.14/site-packages/nvidia/cu13'}/lib`;

export class GpuError extends Error {
  constructor(readonly status: number, message: string) {
    super(`GPU evaluator: ${STATUS[status] ?? status}: ${message}`);
  }
}

export interface EvalItem {
  key: string;
  quad: Quad;
  controls: RiskConfig2 | null;
  options: EvalOptions;
  growth?: VBook[]; // the configuration's Growth books, already computed by the canonical CPU path (else computed here)
}

export interface BatchOptions {
  tradeCap?: number;
  lotCap?: number;
  runPool?: boolean;
  returnTrades?: boolean;
  returnLots?: boolean;
  returnSeries?: boolean;
  record?: boolean; // rebuild the canonical record (needs lots)
  extraFeatures?: number; // negative tests: request features the server must refuse
}

export interface GpuItemResult {
  key: string;
  id: number;
  status: number;
  statusText: string;
  errInfo: number;
  d1: Partial<Record<'D1:GDX' | 'D1:VGT', VBook>>;
  rc: Partial<Record<'D1:GDX' | 'D1:VGT', RcLite>>;
  growth: VBook[];
  pool: PoolResult | null;
  record: SRec | null;
}

export interface BatchTiming {
  encodeMs: number;
  growthCpuMs: number;
  roundTripMs: number;
  decodeMs: number;
  server: { h2dMs: number; d1KernelMs: number; poolKernelMs: number; d2hMs: number; totalMs: number; deviceBytes: number };
  requestBytes: number;
  responseBytes: number;
}

// ----- the server process -----

export class GpuEvaluator {
  private child: ChildProcess;
  // the response stream: chunks are kept in a list with a running length and assembled ONCE per frame (re-concatenating
  // on every pipe chunk was quadratic in the frame size: 46.9 s for a 4,096-candidate batch, results/s5/pre-fix/)
  private chunks: Buffer[] = [];
  private have = 0;
  private pending: ((r: { status: number; payload: Buffer }) => void) | null = null;
  private dead: Error | null = null;
  private stderr = '';

  private constructor(child: ChildProcess) {
    this.child = child;
    child.stdout!.on('data', (chunk: Buffer) => {
      this.chunks.push(chunk);
      this.have += chunk.length;
      this.drain();
    });
    child.stderr!.on('data', (c: Buffer) => (this.stderr += c.toString()));
    child.on('exit', (code, signal) => {
      this.dead = new Error(`GPU evaluator exited (${code ?? signal})${this.stderr ? `: ${this.stderr.trim()}` : ''}`);
      const p = this.pending;

      this.pending = null;
      if (p) p({ status: -1, payload: Buffer.from(this.dead.message) });
    });
  }

  static start(o: { binary?: string; vramBudgetMb?: number; maxL?: number; tpb?: number; allowFault?: boolean } = {}) {
    const args = [
      ...(o.vramBudgetMb ? ['--vram-budget-mb', String(o.vramBudgetMb)] : []),
      ...(o.maxL ? ['--max-l', String(o.maxL)] : []),
      ...(o.tpb ? ['--tpb', String(o.tpb)] : []),
      ...(o.allowFault ? ['--allow-fault-injection'] : [])
    ];
    const child = spawn(o.binary ?? defaultBinary(), args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LD_LIBRARY_PATH: `${cudaLibDir()}:${process.env.LD_LIBRARY_PATH ?? ''}` }
    });

    return new GpuEvaluator(child);
  }

  get pid() {
    return this.child.pid;
  }

  private frameLength = -1; // 16 + payload bytes of the frame being received, once its header is known

  private drain() {
    if (!this.pending || this.have < 16) return;
    if (this.frameLength < 0) {
      if (this.chunks[0]!.length < 16) this.chunks = [Buffer.concat(this.chunks)];

      const head = this.chunks[0]!;

      if (head.readUInt32LE(0) !== 0x52315047) {
        this.dead = new Error('GPU evaluator: bad response frame');
        this.child.kill('SIGKILL');
        return;
      }
      this.frameLength = 16 + Number(head.readBigUInt64LE(8));
    }
    if (this.have < this.frameLength) return;

    const all = this.chunks.length === 1 ? this.chunks[0]! : Buffer.concat(this.chunks, this.have);
    const status = all.readUInt32LE(4);
    const payload = Buffer.from(all.subarray(16, this.frameLength)); // an own, aligned copy
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

    head.writeUInt32LE(0x51315047, 0);
    head.writeUInt32LE(type, 4);
    head.writeBigUInt64LE(BigInt(payload.length), 8);

    const done = new Promise<{ status: number; payload: Buffer }>((resolve) => (this.pending = resolve));

    this.child.stdin!.write(head);
    if (payload.length) this.child.stdin!.write(payload);

    const r = await done;

    if (r.status === -1) throw this.dead ?? new Error('GPU evaluator died');
    return r;
  }

  async info() {
    const r = await this.request(3);

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    return JSON.parse(r.payload.toString()) as Record<string, unknown>;
  }

  async load(file: string) {
    const r = await this.request(1, Buffer.from(file));

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    return JSON.parse(r.payload.toString()) as { sessions: number; bars: number[]; uploadMs: number; refHighMs: number; deviceBytes: number };
  }

  async fault() {
    const r = await this.request(5);

    if (r.status) throw new GpuError(r.status, r.payload.toString());
    return r.payload.toString();
  }

  async close() {
    if (this.dead) return;
    try {
      await this.request(4);
    } catch {
      /* already gone */
    }
    this.child.stdin!.end();
  }

  kill(signal: NodeJS.Signals = 'SIGKILL') {
    this.child.kill(signal);
  }

  // ----- evaluation -----

  async evaluate(door: Door, items: EvalItem[], o: BatchOptions = {}): Promise<{ results: GpuItemResult[]; timing: BatchTiming }> {
    const t0 = performance.now();
    const enc = encodeBatch(door, items, o);
    const t1 = performance.now();
    const r = await this.request(2, enc.buffer);
    const t2 = performance.now();

    if (r.status) throw new GpuError(r.status, r.payload.toString());

    const dec = decodeBatch(door, items, enc, r.payload, o);
    const t3 = performance.now();

    return {
      results: dec.results,
      timing: {
        encodeMs: t1 - t0 - enc.growthMs,
        growthCpuMs: enc.growthMs,
        roundTripMs: t2 - t1,
        decodeMs: t3 - t2,
        server: dec.server,
        requestBytes: enc.buffer.length,
        responseBytes: r.payload.length
      }
    };
  }
}

// ----- encoding -----

interface Encoded {
  buffer: Buffer;
  growth: VBook[][]; // per item: the CPU Growth books in bookIds order
  reasons: string[]; // interned exit reasons (index 64 + i)
  kinds: string[]; // interned Growth trade kinds
  growthMs: number;
  flags: number;
  tradeCap: number;
  lotCap: number;
}

const frictionOf = (o: EvalOptions) => ({ ...baseFriction, ...(o.friction ?? {}) });

export const featuresOf = (door: Door, item: EvalItem): number => {
  const o = item.options;
  let f = 0;
  const c = canonicalConfig2(item.controls);
  const fr = frictionOf(o);

  if (c && Object.keys(c.books).length) f |= FEATURE.RC_CONTROLS;
  if (fr.stopFill === 'next-open' || fr.stopSlippageBps !== 0) f |= FEATURE.NEXT_OPEN;
  if (o.d1Arm === 'native') f |= FEATURE.ARM_START;
  if (o.enabled?.['G:VGT'] !== false || o.enabled?.['G:GDX'] !== false) f |= FEATURE.EXT_GROWTH;
  if ((o.blackouts ?? []).length) f |= FEATURE.POOL_BLACKOUTS;
  if ((o.boundaries ?? []).length) f |= FEATURE.POOL_PERIODS;
  if (o.wholeShares) f |= FEATURE.POOL_WHOLE_SHARES;
  if (o.tieOrder) f |= FEATURE.POOL_TIE_ORDER;
  if (o.fundFrom && indexOnOrAfter(door, o.fundFrom) !== 0) f |= FEATURE.POOL_FUND_FROM;
  return f;
};

const encodeBatch = (door: Door, items: EvalItem[], o: BatchOptions): Encoded => {
  const n = items.length;
  const tradeCap = o.tradeCap ?? 1024;
  const lotCap = o.lotCap ?? 1024;
  const runPool = o.runPool ?? true;
  const flags =
    (o.returnTrades ? FLAGS.RETURN_TRADES : 0) |
    (runPool && (o.returnLots ?? o.record ?? true) ? FLAGS.RETURN_LOTS : 0) |
    (runPool ? FLAGS.RUN_POOL : 0) |
    (runPool && o.returnSeries ? FLAGS.RETURN_SERIES : 0);
  const reasons: string[] = [];
  const kinds: string[] = [];
  const intern = (list: string[], s: string) => {
    let i = list.indexOf(s);

    if (i < 0) i = list.push(s) - 1;
    return 64 + i;
  };
  // the Growth books: the canonical CPU path (Priority 3's booksOf with the D1 books disabled; its bounded cache)
  const tg = performance.now();
  const growth = items.map((it) => it.growth ?? p3BooksOf(door, it.quad, { ...it.options, enabled: { ...it.options.enabled, 'D1:GDX': false, 'D1:VGT': false } }));
  const growthMs = performance.now() - tg;
  const nExt = growth.reduce((a, g) => a + g.reduce((b, x) => b + x.trades.length, 0), 0);
  const buf = Buffer.alloc(SIZES.batchHeader + n * SIZES.cand + nExt * SIZES.trade);

  buf.write('GP1BATCH', 0, 'latin1');
  buf.writeUInt32LE(PROTOCOL_VERSION, 8);
  buf.writeUInt32LE(n, 12);
  buf.writeUInt32LE(flags, 16);
  buf.writeUInt32LE(tradeCap, 20);
  buf.writeUInt32LE(lotCap, 24);
  buf.writeUInt32LE(nExt, 28);
  buf.writeUInt32LE(door.sessions - 1, 32);
  buf.writeUInt32LE(0, 36);
  buf.writeDoubleLE(economics.budget, 40);
  buf.writeDoubleLE(frictionOf(items[0]?.options ?? {}).rate, 48);

  for (const it of items)
    if (frictionOf(it.options).rate !== frictionOf(items[0]!.options).rate) throw new Error('one pool rate per batch (v1)');

  let ext = 0;
  const extBase = SIZES.batchHeader + n * SIZES.cand;

  items.forEach((it, i) => {
    const at = SIZES.batchHeader + i * SIZES.cand;
    const c = canonicalConfig2(it.controls);

    validateAgainstGrids2(c, it.quad.d1);

    const fr = frictionOf(it.options);
    const armStart = it.options.d1Arm === 'native' ? indexOnOrAfter(door, '2017-06-15') : 0;

    buf.writeUInt32LE(i, at); // the candidate id = its index in this batch
    buf.writeUInt32LE((featuresOf(door, it) | (o.extraFeatures ?? 0)) >>> 0, at + 4);
    buf.writeInt32LE(it.quad.first === 'D1' ? 0 : 1, at + 8);

    // external Growth books [G:GDX, G:VGT]
    for (const g of growth[i]!) {
      const slot = g.book === 'G:GDX' ? 0 : 1;

      buf.writeInt32LE(1, at + 16 + slot * 4);
      buf.writeInt32LE(ext, at + 24 + slot * 4);
      buf.writeInt32LE(g.trades.length, at + 32 + slot * 4);
      for (const t of g.trades) {
        writeTrade(buf, extBase + ext * SIZES.trade, t, (r) => intern(reasons, r), (k) => intern(kinds, k));
        ext++;
      }
    }

    (['GDX', 'VGT'] as const).forEach((s, b) => {
      const d = at + 48 + b * SIZES.d1;
      const enabled = it.options.enabled?.[`D1:${s}`] !== false;
      const p = d1StrategyParams(s, it.quad.d1[s]);
      const ctl = c?.books[`D1:${s}`];
      const ps = ctl?.protectiveStop;
      const h = ctl?.hold;
      const g = ctl?.declineGate;

      if (p.stopPolicy !== 'net' || p.entryMode !== 'deep' || p.postExit !== true) throw new Error('only the D1 net-stop deep book is in the slice');
      [p.targetPercentChange, p.trailingBuyPercentage, p.trailingStopPercentage, p.maximumHoldDays, p.intradayLossBuffer, p.pullback, fr.costBps, fr.rate, fr.stopSlippageBps].forEach((x, j) =>
        buf.writeDoubleLE(x, d + j * 8)
      );
      [
        p.tickWindowSize,
        p.continuationWindow,
        enabled ? 1 : 0,
        ps?.mode === 'on' ? ps.stopDistanceTenths : -1,
        ps?.mode === 'on' && ps.activation === 'entry-day' ? 1 : 0,
        h?.mode === 'disabled' ? 1 : h?.mode === 'adaptive' ? 2 : 0,
        h?.mode === 'adaptive' ? h.extendedHoldDays : 0,
        h?.mode === 'adaptive' ? h.progressTenths : 0,
        g?.mode === 'on' ? 1 : 0,
        g?.mode === 'on' ? g.losses : 0,
        g?.mode === 'on' ? g.recoveryTenths : 0,
        g?.mode === 'on' ? g.maxBlockSessions : 0,
        armStart,
        fr.stopFill === 'stop' ? 0 : 1
      ].forEach((x, j) => buf.writeInt32LE(x, d + 72 + j * 4));
    });
  });

  return { buffer: buf, growth, reasons, kinds, growthMs, flags, tradeCap, lotCap };
};

const writeTrade = (buf: Buffer, at: number, t: VTrade, reason: (r: string) => number, kind: (k: string) => number) => {
  [t.dT, t.dPrice, t.eT, t.eRaw, t.ePrice, t.vNet, t.vInterest].forEach((x, j) => buf.writeDoubleLE(x, at + j * 8));
  [t.id, t.dS, t.eS, t.eK, kind(t.kind), t.open ? 1 : 0, t.fills.length, 0].forEach((x, j) => buf.writeInt32LE(x, at + 56 + j * 4));
  if (t.fills.length > 4) throw new Error(`a Growth trade with ${t.fills.length} fills exceeds the v1 interface`);
  t.fills.forEach((f, j) => {
    const fa = at + 88 + j * SIZES.fill;

    [f.t, f.raw, f.price, f.f].forEach((x, q) => buf.writeDoubleLE(x, fa + q * 8));
    [f.s, f.k, f.partial ? 1 : 0, reason(f.reason)].forEach((x, q) => buf.writeInt32LE(x, fa + 32 + q * 4));
  });
};

// ----- decoding -----

const decodeBatch = (door: Door, items: EvalItem[], enc: Encoded, payload: Buffer, o: BatchOptions) => {
  const ab = new ArrayBuffer(payload.length);

  new Uint8Array(ab).set(payload);

  const dv = new DataView(ab);
  const f64 = (p: number) => dv.getFloat64(p, true);
  const i32 = (p: number) => dv.getInt32(p, true);
  const u32 = (p: number) => dv.getUint32(p, true);
  const magic = Buffer.from(ab, 0, 8).toString('latin1');

  if (magic !== 'GP1OUT01' || u32(8) !== PROTOCOL_VERSION) throw new GpuError(101, 'bad result header');

  const n = u32(12);
  const flags = u32(16);
  const S = u32(28);

  if (n !== items.length || S !== door.sessions) throw new GpuError(102, `result shape ${n}×${S} ≠ ${items.length}×${door.sessions}`);

  const server = { h2dMs: f64(32), d1KernelMs: f64(48), poolKernelMs: f64(56), d2hMs: f64(64), totalMs: f64(72), deviceBytes: f64(80) };
  const outAt = (c: number) => 96 + c * SIZES.out;
  let p = 96 + n * SIZES.out;
  const reasonOf = (code: number) => (code < 64 ? D1_REASONS[code]! : enc.reasons[code - 64]!);
  const results: GpuItemResult[] = [];
  const statuses: number[] = [];
  const readOut = (c: number) => {
    const a = outAt(c);

    if (u32(a) !== c) throw new GpuError(102, `candidate id ${u32(a)} at slot ${c}`);
    return a;
  };

  for (let c = 0; c < n; c++) statuses.push(i32(readOut(c) + 4));

  // trades: per candidate (status ok), D1:GDX then D1:VGT
  const trades: VTrade[][][] = items.map(() => [[], []]);

  for (let c = 0; c < n; c++) {
    if (statuses[c] !== 0) continue;
    for (let b = 0; b < 2; b++) {
      const count = i32(outAt(c) + 16 + b * SIZES.bookOut + 32);

      if (flags & FLAGS.RETURN_TRADES) for (let t = 0; t < count; t++, p += SIZES.trade) trades[c]![b]!.push(readTrade(dv, p, BOOKS[b]!, reasonOf));
      // throughput mode: the trades stay on the device; the canonical record reads only each book's trade COUNT
      // (recordOf's `virtual`), never a trade (a lot's `trade` link is not read by recordOf either)
      else trades[c]![b] = new Array<VTrade>(count);
    }
  }

  const lotBlocks: number[] = [];

  if (flags & FLAGS.RETURN_LOTS)
    for (let c = 0; c < n; c++) {
      lotBlocks.push(p);
      if (statuses[c] === 0) p += i32(outAt(c) + 12) * SIZES.lot;
    }

  const dailyAt = p;

  if (flags & FLAGS.RETURN_LOTS) p += n * S * 8;

  const seriesAt = p;

  for (let c = 0; c < n; c++) {
    const a = outAt(c);
    const it = items[c]!;
    const status = statuses[c]!;
    const res: GpuItemResult = { key: it.key, id: c, status, statusText: CAND_STATUS[status] ?? String(status), errInfo: i32(a + 8), d1: {}, rc: {}, growth: enc.growth[c]!, pool: null, record: null };

    results.push(res);
    if (status !== 0) continue;

    (['D1:GDX', 'D1:VGT'] as const).forEach((book, b) => {
      if (it.options.enabled?.[book] === false) return;

      const bo = a + 16 + b * SIZES.bookOut;
      const firstDS = i32(bo + 76);
      const vb: VBook = {
        book,
        key: '',
        trades: trades[c]![b]!,
        signals: i32(bo + 36),
        firstDecision: firstDS >= 0 ? door.dates[firstDS]! : null,
        endIndex: S - 1,
        standalone: { net: f64(bo), realized: f64(bo + 8), minuteDd: f64(bo + 16), dailyDd: f64(bo + 24) }
      };

      res.d1[book] = vb;
      res.rc[book] = {
        virtualTrades: i32(bo + 32),
        protective: i32(bo + 40),
        protectiveGap: i32(bo + 44),
        entryDay: i32(bo + 72),
        maximumHold: i32(bo + 48),
        adaptive: i32(bo + 52),
        episodes: i32(bo + 56),
        blocks: i32(bo + 60),
        blockedSessions: i32(bo + 64)
      };
    });

    if (!(flags & FLAGS.RUN_POOL) || !(flags & FLAGS.RETURN_LOTS)) continue;

    // the books in Priority 3's bookIds order (D1:GDX, D1:VGT, G:GDX, G:VGT), as booksWithControls2 returns them
    const books: VBook[] = [];

    for (const id of BOOKS) {
      const vb = id.startsWith('D1') ? res.d1[id as 'D1:GDX'] : res.growth.find((g) => g.book === id);

      if (vb) books.push(vb);
    }

    const byBook = new Map(books.map((b) => [b.book, b]));
    const nLots = i32(a + 12);
    const lots: Lot[] = [];

    for (let l = 0; l < nLots; l++) {
      const la = lotBlocks[c]! + l * SIZES.lot;
      const book = BOOKS[i32(la + 104)]!;
      const trade = byBook.get(book)!.trades[i32(la + 108)]!; // undefined in throughput mode (D1 lots; never read)
      const fills: LotFill[] = [];

      for (let j = 0; j < i32(la + 120); j++) {
        const fa = la + 128 + j * SIZES.lotFill;

        fills.push({
          s: i32(fa + 64),
          k: i32(fa + 68),
          t: f64(fa),
          raw: f64(fa + 8),
          price: f64(fa + 16),
          partial: i32(fa + 72) !== 0,
          shares: f64(fa + 24),
          principal: f64(fa + 32),
          interest: f64(fa + 40),
          proceeds: f64(fa + 48),
          net: f64(fa + 56),
          reason: reasonOf(i32(fa + 76))
        });
      }

      lots.push({
        id: i32(la + 124),
        book,
        family: familyOf(book),
        symbol: symbolOf(book),
        trade,
        principal0: f64(la),
        shares0: f64(la + 8),
        shares: f64(la + 16),
        principal: f64(la + 24),
        entryS: i32(la + 112),
        entryT: f64(la + 32),
        entryRaw: f64(la + 40),
        entryPrice: f64(la + 48),
        entryTs: f64(la + 56),
        fills,
        realized: f64(la + 64),
        interest: f64(la + 72),
        open: i32(la + 116) !== 0,
        net: f64(la + 80),
        unrealized: f64(la + 88),
        costs: f64(la + 96),
        worst: Infinity,
        worstT: NaN,
        best: -Infinity,
        bestT: NaN
      });
    }

    const series = (k: number) => new Float64Array(ab.slice(seriesAt + (k * n + c) * S * 8, seriesAt + (k * n + c + 1) * S * 8));
    const decisions = Object.fromEntries(BOOKS.map((b, j) => [b, { total: i32(a + 296 + j * 12), granted: i32(a + 300 + j * 12), refused: i32(a + 304 + j * 12) }])) as PoolResult['decisions'];
    const refusedSlot = i32(a + 284);
    const pool: PoolResult = {
      endIndex: S - 1,
      net: f64(a + 176),
      realized: f64(a + 184),
      unrealized: f64(a + 192),
      dd: { max: f64(a + 216), peakT: f64(a + 224), troughT: f64(a + 232), recoveryT: f64(a + 240) },
      ddDaily: { max: f64(a + 248), peakT: f64(a + 256), troughT: f64(a + 264), recoveryT: f64(a + 272) },
      periods: [],
      lots,
      funding: [],
      daily: new Float64Array(ab.slice(dailyAt + c * S * 8, dailyAt + (c + 1) * S * 8)),
      principalAtClose: flags & FLAGS.RETURN_SERIES ? series(0) : new Float64Array(0),
      valueAtClose: flags & FLAGS.RETURN_SERIES ? series(1) : new Float64Array(0),
      heldAtClose:
        flags & FLAGS.RETURN_SERIES ? new Int8Array(ab.slice(seriesAt + 2 * n * S * 8 + c * S, seriesAt + 2 * n * S * 8 + (c + 1) * S)) : new Int8Array(0),
      peakPrincipal: f64(a + 200),
      peakValue: f64(a + 208),
      sessionsHeld: i32(a + 280),
      decisions,
      refusals: refusedSlot > 0 ? { 'slot occupied': refusedSlot } : {},
      marks: Number(dv.getBigInt64(a + 288, true)),
      markChanges: null
    };

    res.pool = pool;

    if (o.record ?? true) {
      const rec: Rec = recordOf(door, it.quad, { books, result: pool }, it.options);
      const legacy = isLegacy2(it.controls);

      res.record = { ...(legacy ? rec : { ...rec, id: riskId2(it.quad, it.controls) }), rc: res.rc } as SRec;
    }
  }

  return { results, server };
};

const readTrade = (dv: DataView, at: number, book: BookId, reasonOf: (c: number) => string): VTrade => {
  const f64 = (p: number) => dv.getFloat64(at + p, true);
  const i32 = (p: number) => dv.getInt32(at + p, true);
  const nFills = i32(80);
  const fills: VFill[] = [];

  for (let j = 0; j < nFills; j++) {
    const fa = 88 + j * SIZES.fill;

    fills.push({ s: i32(fa + 32), k: i32(fa + 36), t: f64(fa), raw: f64(fa + 8), price: f64(fa + 16), partial: i32(fa + 40) !== 0, f: f64(fa + 24), reason: reasonOf(i32(fa + 44)) });
  }

  return {
    book,
    id: i32(56),
    kind: i32(72) === 0 ? 'deep' : 'continuation',
    dS: i32(60),
    dT: f64(0),
    dPrice: f64(8),
    eS: i32(64),
    eK: i32(68),
    eT: f64(16),
    eRaw: f64(24),
    ePrice: f64(32),
    fills,
    open: i32(76) !== 0,
    vNet: f64(40),
    vInterest: f64(48)
  };
};

export const quadIdOf = quadId;
