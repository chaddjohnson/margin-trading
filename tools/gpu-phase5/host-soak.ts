// gpu-phase5 root cause (PROTOCOL.md §4.3 H4, §4.5): the GPU HOST PATH's record reduction in cold worker threads. One
// real device response of Phase 4's D24-fund batch (1,561 tasks; evaluated once on the GPU at the start, or the serial
// decode of it as the reference) is decoded again and again by FRESH host pipelines (8 cold worker threads each: the
// official pool's path) — no GPU after the capture. Every result's hashes are compared with the serial reference; a
// mismatch is dissected leaf by leaf (the original objects as the main thread received them), with the alias
// signature check, and the same response is decoded again by the same (now warm) pipeline. Optional CPU burners
// (--load N) starve the compiler threads, as concurrent jobs do.
//   node --expose-gc --experimental-transform-types tools/gpu-phase5/host-soak.ts --cycles 500 --max-minutes 30 [--load 12] [--mode full|lean] [--workers 8] --out <json>
import fs from 'node:fs';
import { type ChildProcess, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { cacheDir, writeJson } from '../../src/gpu-phase5/context.ts';
import { resolveDoor } from '../../src/gpu-phase5/doorSpec.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-backend/canon.ts';
import type { RefTask } from '../../src/gpu-phase5/cpuRefWorker.ts';
import { type Leaf, leavesOf } from '../../src/gpu-phase5/bits.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer, type TaskResult } from '../../src/gpu-backend/client.ts';
import { Receipt, ResultHeader } from '../../src/gpu-backend/layout.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const out = opt('out', '');

if (!out) throw new Error('--out <json> is required');
if (fs.existsSync(out)) throw new Error(`${out} exists (write-once)`);

const door = await resolveDoor({ kind: 'market', name: 'D24' }, 'gpu-phase5 host-path cold soak');
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const options = { ...vOptions, fundFrom: at(0.3) };
const subjects = [...referenceSubjects(), ...randomSubjects(1500, 'O-fund', 'coarse', 0), ...growthStrata(2, 'O-fund-G')];
const tasks: RefTask[] = subjects.map((s) => ({ k: s.key, quad: s.quad, controls: s.controls, options, detail: true, risk: true }));
const mode = opt('mode', 'full') as 'full' | 'lean';
// full: the parity campaign's request (trades and series returned); lean: the official pool's (records only)
const batchOpts = mode === 'full' ? { returnTrades: true, returnSeries: true, tradeCapD1: 1024, tradeCapG: 1024, lotCap: 1024, fundCap: 4096 } : {};
const workers = Number(opt('workers', '8'));
const maxCycles = Number(opt('cycles', '500'));
const deadline = Date.now() + Number(opt('max-minutes', '30')) * 60000;
const hashes = (r: TaskResult) =>
  r.status !== 0
    ? { status: r.status }
    : {
        status: 0,
        record: canonHash(r.record),
        ...(mode === 'full' ? { books: canonHash(r.books.map(bookView)), pool: canonHash(poolView(r.pool!)), rc: canonHash(r.rc) } : {}),
        envelope: r.envelope ? [r.envelope.bankedDdMarked, r.envelope.bankedDdLiquidation, r.envelope.principalLossMarked, r.envelope.principalLossLiquidation] : null
      };
const key = (h: ReturnType<typeof hashes>) => JSON.stringify(h);

// ----- the capture: one real device response, decoded serially on this thread (the reference) -----
const ds = exportDataset(door, cacheDir);
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();

if (!(await server.smoke()).ok) throw new Error('GPU smoke self-test failed');
await server.load(ds.file);

const cap = server.prepare(door, tasks, batchOpts);
const raw = await server.submit(cap);
const serial = server.complete(cap, raw, info.uuid).results;
const ref = serial.map(hashes);
const refRecords = serial.map((r) => (r.status === 0 ? leavesOf(r.record) : []));

await server.close();

const payloadSha = createHash('sha256').update(raw.payload.subarray(ResultHeader.size + Receipt.size)).digest('hex');
const withNonce = (nonce: bigint) => {
  const p = Buffer.from(raw.payload);

  p.writeBigUInt64LE(nonce, ResultHeader.size + Receipt.offsets.batchNonce!);
  return p;
};
const burners: ChildProcess[] = Array.from({ length: Number(opt('load', '0')) }, () => spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }));
const diffLeaves = (a: Leaf[], b: Leaf[]) => {
  const res: unknown[] = [];
  const byPath = new Map(a.map((l) => [l.path, l]));

  for (let j = 0; j < Math.max(a.length, b.length) && res.length < 24; j++) {
    const x = a[j] ?? null;
    const y = b[j] ?? null;

    if (!x || !y || x.path !== y.path || x.kind !== y.kind || x.value !== y.value) {
      let aliasOf: string | null = null;
      const m = x && /^(.*)\[(\d+)\](\.[^[\]]+)$/.exec(x.path);

      if (m && x)
        for (const d of [1, -1, 2, -2]) {
          const sib = byPath.get(`${m[1]}[${Number(m[2]) + d}]${m[3]}`);

          if (sib && sib.value === x.value) {
            aliasOf = sib.path;
            break;
          }
        }
      res.push({ path: (x ?? y)!.path, got: x, expected: y, aliasOf });
    }
  }
  return res;
};
const totals = { cycles: 0, coldWorkerThreads: 0, resultsCompared: 0, mismatches: 0, recordOnly: 0, warmRepeatMismatches: 0 };
const events: unknown[] = [];
let stop = false;

process.on('SIGTERM', () => (stop = true));
process.on('SIGINT', () => (stop = true));
try {
  for (let cycle = 0; cycle < maxCycles && !stop && Date.now() < deadline; cycle++) {
    const pipe = await HostPipeline.start({ door, workers });
    const p = await pipe.prepare(door, tasks, batchOpts);
    const done = await pipe.complete(p, { payload: withNonce(p.enc.nonce), roundTripMs: 0 }, info.uuid, mode);

    totals.cycles++;
    totals.coldWorkerThreads += workers;
    for (let i = 0; i < done.results.length; i++) {
      const r = done.results[i]!;
      const h = hashes(r);

      totals.resultsCompared++;
      if (key(h) === key(ref[i]!)) continue;
      totals.mismatches++;

      const recordOnly = h.status === 0 && h.record !== ref[i]!.record && (mode === 'lean' || (h.books === ref[i]!.books && h.pool === ref[i]!.pool && h.rc === ref[i]!.rc));
      const shard = p.enc.shards.findIndex((s) => i >= s.c0 && i < s.c1);

      if (recordOnly) totals.recordOnly++;
      // the same response again through the same (now warm) pipeline
      const p2 = await pipe.prepare(door, tasks, batchOpts);
      const again = hashes((await pipe.complete(p2, { payload: withNonce(p2.enc.nonce), roundTripMs: 0 }, info.uuid, mode)).results[i]!);

      if (key(again) !== key(ref[i]!)) totals.warmRepeatMismatches++;
      if (events.length < 40)
        events.push({
          cycle,
          i,
          k: tasks[i]!.k,
          shard,
          hostWorker: p.shardWorker[shard],
          positionInShard: i - p.enc.shards[shard]!.c0,
          recordOnly,
          original: h,
          reference: ref[i],
          rehashOfTheSameReceivedObject: hashes(r),
          samePipelineAgain: again,
          recordLeaves: r.status === 0 ? diffLeaves(leavesOf(r.record), refRecords[i]!) : []
        });
    }
    await pipe.close();
    if (cycle % 25 === 0) console.error(`cycle ${cycle}: ${JSON.stringify(totals)}`);
    if (global.gc) global.gc();
  }
} finally {
  for (const b of burners) b.kill('SIGKILL');
}

const rec = {
  kind: 'gpu-phase5 host-path cold soak: fresh host pipelines decoding one real device response of Phase 4 D24-fund',
  t: new Date().toISOString(),
  node: process.version,
  v8: process.versions.v8,
  execArgv: process.execArgv,
  mode,
  hostWorkers: workers,
  cpuBurners: burners.length,
  tasks: tasks.length,
  binarySha256: createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex'),
  responseBytes: raw.payload.length,
  responseSha256AfterReceipt: payloadSha,
  knownCandidate: { index: 33, k: tasks[33]!.k, referenceRecord: ref[33]!.record, equalsPhase4Diagnostics: ref[33]!.record === 'f17d66f45b4fa8806c67d4f4' },
  ...totals,
  events,
  pass: totals.mismatches === 0
};

writeJson(out, rec);
console.log(JSON.stringify({ ...rec, events: events.slice(0, 2) }).slice(0, 3000));
process.exitCode = rec.pass ? 0 : 2;
