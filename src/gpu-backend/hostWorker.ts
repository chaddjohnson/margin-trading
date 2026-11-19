// gpu-backend: a HOST WORKER of the parallel host path (hostPipeline.ts). A worker thread that encodes and decodes
// contiguous shards of GPU batches with the batch codec (batch.ts) — the same functions the serial path runs. It never
// simulates a strategy: decoding reads the GPU's books and pooled replay and applies the UNCHANGED canonical record
// reductions to them, exactly as the main thread does in the serial path. It holds a shard's tasks and encoding
// metadata from its encode to its decode (the shard is always decoded by the worker that encoded it) and nothing else.
//
// Messages (in): door handshake via workerData; encode {seq, shard, c0, tasks, o}; decode {seq, shard, sab, n, flags,
// S, totalRanges, rangeBase, mode, o}; drop {seq}. Out: ready {digest}; encoded; decoded {hashes, results | error}.
// The per-candidate checksum hashes are computed before decoding and returned even when decoding fails, so the caller
// reports a corrupted response as such (its precedence over any decoding error, as in the serial path).
import { parentPort, workerData } from 'node:worker_threads';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type BatchOptions, type CandMeta, type Task, GpuError, candHashes, decodeRange, encodeShard, layoutOf, leanResult, viewOf } from './batch.ts';
import { CandOut, Receipt, ResultHeader } from './layout.ts';
import { doorDigest } from './hostDoor.ts';

const door = (workerData as { door: Door }).door;
const shards = new Map<string, { tasks: Task[]; c0: number; metas: CandMeta[] }>();
const port = parentPort!;
const errorOf = (e: unknown) => ({ status: e instanceof GpuError ? e.status : null, message: (e as Error)?.message ?? String(e), stack: (e as Error)?.stack ?? null });

port.postMessage({ t: 'ready', digest: doorDigest(door) });

port.on('message', (m: { t: string; seq: number; shard: number; c0: number; tasks: Task[]; o: BatchOptions; sab: SharedArrayBuffer; n: number; flags: number; S: number; totalRanges: number; rangeBase: number; mode: 'lean' | 'full'; crash?: string }) => {
  if (m.t === 'encode') {
    try {
      const e = encodeShard(door, m.tasks, m.c0, m.o);

      shards.set(`${m.seq}:${m.shard}`, { tasks: m.tasks, c0: m.c0, metas: e.metas });
      port.postMessage({ t: 'encoded', seq: m.seq, shard: m.shard, c0: e.c0, n: e.n, bytes: e.bytes, ranges: e.ranges, metas: e.metas, d1: e.d1, g: e.g }, [e.bytes.buffer as ArrayBuffer, e.ranges.buffer as ArrayBuffer]);
    } catch (error) {
      port.postMessage({ t: 'encoded', seq: m.seq, shard: m.shard, error: errorOf(error) });
    }
    return;
  }
  if (m.t === 'decode') {
    const s = shards.get(`${m.seq}:${m.shard}`);

    shards.delete(`${m.seq}:${m.shard}`);
    if (!s) {
      port.postMessage({ t: 'decoded', seq: m.seq, shard: m.shard, hashes: null, error: errorOf(new Error(`host worker: no encoded shard ${m.seq}:${m.shard}`)) });
      return;
    }

    const c1 = s.c0 + s.tasks.length;
    const v = viewOf(m.sab);
    let hashes: BigUint64Array | null = null;

    try {
      hashes = candHashes(new Uint8Array(m.sab, ResultHeader.size + Receipt.size, m.n * CandOut.size), s.c0, c1);

      const metas = s.metas.map((x) => ({ ...x, periodOff: x.periodOff + m.rangeBase }));
      const L = layoutOf(v, m.n, m.flags, m.S, m.totalRanges);
      const results = decodeRange(door, s.tasks, metas, v, m.n, m.flags, m.S, L, s.c0, c1, m.o);

      if (m.crash === 'throw') throw new Error('host worker: injected decode failure (test)');
      if (m.crash === 'exit') process.exit(7);
      port.postMessage({ t: 'decoded', seq: m.seq, shard: m.shard, hashes, results: m.mode === 'lean' ? results.map(leanResult) : results }, [hashes.buffer as ArrayBuffer]);
    } catch (error) {
      port.postMessage({ t: 'decoded', seq: m.seq, shard: m.shard, hashes, error: errorOf(error) });
    }
    return;
  }
  if (m.t === 'drop') for (const k of [...shards.keys()]) if (k.startsWith(`${m.seq}:`)) shards.delete(k);
});
