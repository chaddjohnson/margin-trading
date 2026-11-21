// gpu-phase5 (copy of tools/gpu-phase3/offline-check.ts, this study's namespace) (development check, no GPU): the batch codec and the parallel host path against real captured batches of
// the Phase 2 binary (tools/gpu-phase3/capture.ts; read only from research/gpu-phase3/cache/captures). For every capture:
//   1. the serial codec (batch.ts encodeBatch) builds the captured request byte for byte (the nonce excepted);
//   2. the serial decode (batch.ts decodeBatch) reproduces the Phase 2 serial path's canonical hashes of every result
//      (record, books, RC counters, pooled replay, envelope), recorded in the capture;
//   3. the host pipeline with 1, 2, 3 and 8 workers builds the same request and returns the same results (full mode) and
//      the same records (lean mode);
//   4. failures are refused: a flipped bit in a candidate's output (checksum), another device's receipt, a worker that
//      throws while decoding, a worker that exits (the pipeline fails closed and refuses every later call).
//   node --experimental-transform-types tools/gpu-phase5/offline-check.ts [capture …] [--workers 1,2,3,8] [--out <json>]
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot, writeJson } from '../../src/gpu-phase5/context.ts';
import { type DoorSpec, resolveDoor as resolveP4Door } from '../../src/gpu-phase5/doorSpec.ts';
// a captured fixture door is the Phase 3 harness's (its own seeds; a pure function, nothing written)
import { fixtureDoor as p3FixtureDoor } from '../../src/gpu-phase3/fixtures.ts';
import {
  type BatchOptions,
  type Task,
  type TaskResult,
  decodeBatch,
  encodeBatch
} from '../../src/gpu-backend/batch.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { BatchHeader, CandOut, Receipt, ResultHeader } from '../../src/gpu-backend/layout.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-backend/canon.ts';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
// Phase 3's development captures of real Phase 2 batches (read only)
const dir = path.join(repoRoot, 'research/gpu-phase3/cache/captures');
// market doors through this study's door log; captured fixtures rebuilt with the seeds they were captured with
const resolveDoor = (d: DoorSpec, purpose: string) =>
  d.kind === 'market' ? resolveP4Door(d, purpose) : Promise.resolve(p3FixtureDoor(d.seed, d.sessions));
const names = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]!.startsWith('--')));
const all = names.length
  ? names
  : fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .sort();
const workerCounts = opt('workers', '1,2,3,8').split(',').map(Number);
const report: Record<string, unknown>[] = [];
let failures = 0;

interface Ref {
  key: string;
  status: number;
  features: string;
  record: string;
  books: string;
  rc: string;
  pool: string | null;
  envelope: string | null;
}

const hashesOf = (r: TaskResult) => ({
  key: r.key,
  status: r.status,
  features: r.features.toString(16),
  record: canonHash(r.record),
  books: canonHash(r.books.map(bookView)),
  rc: canonHash(r.rc),
  pool: r.pool ? canonHash(poolView(r.pool)) : null,
  envelope: r.envelope ? canonHash(r.envelope) : null
});
const sameFull = (a: Ref[], b: Ref[]) =>
  a.length === b.length && a.every((x, i) => JSON.stringify(x) === JSON.stringify(b[i]));
const sameRecords = (a: Ref[], rs: TaskResult[]) =>
  a.length === rs.length &&
  a.every(
    (x, i) =>
      x.key === rs[i]!.key &&
      x.status === rs[i]!.status &&
      x.record === canonHash(rs[i]!.record) &&
      x.features === rs[i]!.features.toString(16)
  );
const nonceAt = BatchHeader.offsets.batchNonce!;
const withNonce = (payload: Buffer, nonce: bigint) => {
  const p = Buffer.from(payload);

  p.writeBigUInt64LE(nonce, ResultHeader.size + Receipt.offsets.batchNonce!);
  return p;
};
const sameRequest = (a: Buffer, b: Buffer) =>
  a.length === b.length &&
  Buffer.compare(a.subarray(0, nonceAt), b.subarray(0, nonceAt)) === 0 &&
  Buffer.compare(a.subarray(nonceAt + 8), b.subarray(nonceAt + 8)) === 0;
const refuses = async (f: () => Promise<unknown> | unknown, pattern: RegExp) => {
  try {
    await f();
    return 'accepted';
  } catch (e) {
    return pattern.test((e as Error).message)
      ? 'refused'
      : `refused with another error: ${(e as Error).message.slice(0, 200)}`;
  }
};

for (const name of all) {
  const meta = decode<{ door: never; o: BatchOptions; uuid: string; tasks: Task[]; reference: Ref[] }>(
    fs.readFileSync(path.join(dir, `${name}.json`), 'utf8')
  );
  const request = fs.readFileSync(path.join(dir, `${name}.req.bin`));
  const payload = fs.readFileSync(path.join(dir, `${name}.res.bin`));
  const door = await resolveDoor(meta.door, 'gpu-phase5 offline check (final campaign)');
  const row: Record<string, unknown> = { name, n: meta.tasks.length };

  // 1–2 the serial codec
  let t = performance.now();
  const enc = encodeBatch(door, meta.tasks, meta.o);

  row.serialEncodeMs = Math.round(performance.now() - t);
  row.serialRequestIdentical = sameRequest(enc.buffer, request);
  t = performance.now();
  const dec = decodeBatch(door, meta.tasks, enc, withNonce(payload, enc.nonce), meta.o);

  row.serialDecodeMs = Math.round(performance.now() - t);
  row.serialResultsIdentical = sameFull(meta.reference, dec.results.map(hashesOf));

  // 3 the pipeline
  row.pipeline = [];
  for (const w of workerCounts) {
    const pipe = await HostPipeline.start({ door, workers: w });

    try {
      const p = await pipe.prepare(door, meta.tasks, meta.o);
      const full = await pipe.complete(
        p,
        { payload: withNonce(payload, p.enc.nonce), roundTripMs: 0 },
        meta.uuid,
        'full'
      );
      const p2 = await pipe.prepare(door, meta.tasks, meta.o);
      const lean = await pipe.complete(
        p2,
        { payload: withNonce(payload, p2.enc.nonce), roundTripMs: 0 },
        meta.uuid,
        'lean'
      );

      (row.pipeline as unknown[]).push({
        workers: w,
        shards: p.enc.shards.length,
        requestIdentical: sameRequest(p.enc.buffer, request),
        fullIdentical: sameFull(meta.reference, full.results.map(hashesOf)),
        leanRecordsIdentical: sameRecords(meta.reference, lean.results),
        encodeMs: Math.round(p.encodeMs),
        decodeMs: Math.round(full.timing.decodeMs),
        leanEncodeMs: Math.round(p2.encodeMs),
        leanDecodeMs: Math.round(lean.timing.decodeMs)
      });
    } finally {
      await pipe.close();
    }
  }

  // 4 refusals
  const pipe = await HostPipeline.start({ door, workers: 3, allowFaultInjection: true });

  try {
    const flip = (p: Buffer) => {
      const x = Buffer.from(p);

      x[ResultHeader.size + Receipt.size + Math.floor(CandOut.size * 1.5)]! ^= 0x10;
      return x;
    };
    const p1 = await pipe.prepare(door, meta.tasks, meta.o);

    row.refuseCorrupt = await refuses(
      () => pipe.complete(p1, { payload: flip(withNonce(payload, p1.enc.nonce)), roundTripMs: 0 }, meta.uuid),
      /differ from the device checksum/
    );
    row.refuseCorruptSerial = await refuses(
      () => decodeBatch(door, meta.tasks, enc, flip(withNonce(payload, enc.nonce)), meta.o),
      /differ from the device checksum/
    );
    const p2 = await pipe.prepare(door, meta.tasks, meta.o);

    row.refuseOtherDevice = await refuses(
      () =>
        pipe.complete(
          p2,
          { payload: withNonce(payload, p2.enc.nonce), roundTripMs: 0 },
          'GPU-00000000-0000-0000-0000-000000000000'
        ),
      /receipt from GPU-.*expected GPU-0000/
    );
    const p3 = await pipe.prepare(door, meta.tasks, meta.o);

    row.refuseStaleNonce = await refuses(
      () => pipe.complete(p3, { payload, roundTripMs: 0 }, meta.uuid),
      /receipt nonce differs/
    );
    if (meta.tasks.length >= 192) {
      const p4 = await pipe.prepare(door, meta.tasks, meta.o);

      row.refuseWorkerThrow = await refuses(
        () =>
          pipe.complete(p4, { payload: withNonce(payload, p4.enc.nonce), roundTripMs: 0 }, meta.uuid, 'lean', {
            shard: 1,
            kind: 'throw'
          }),
        /injected decode failure/
      );
      const p5 = await pipe.prepare(door, meta.tasks, meta.o);

      row.refuseWorkerExit = await refuses(
        () =>
          pipe.complete(p5, { payload: withNonce(payload, p5.enc.nonce), roundTripMs: 0 }, meta.uuid, 'lean', {
            shard: 2,
            kind: 'exit'
          }),
        /exited \(7\)/
      );
      row.refuseAfterFailure = await refuses(() => pipe.prepare(door, meta.tasks, meta.o), /exited \(7\)/);
    }
  } finally {
    await pipe.close();
  }

  const ok =
    row.serialRequestIdentical === true &&
    row.serialResultsIdentical === true &&
    (row.pipeline as Record<string, unknown>[]).every(
      (x) => x.requestIdentical && x.fullIdentical && x.leanRecordsIdentical
    ) &&
    Object.entries(row)
      .filter(([k]) => k.startsWith('refuse'))
      .every(([, v]) => v === 'refused');

  row.ok = ok;
  if (!ok) failures++;
  report.push(row);
  console.log(JSON.stringify(row));
}

if (args.includes('--out'))
  writeJson(opt('out', ''), {
    kind: 'gpu-phase5 offline codec and host-pipeline check',
    t: new Date().toISOString(),
    captures: report.length,
    failures,
    report
  });
console.log(
  failures ? `FAILED: ${failures} capture(s)` : `all ${report.length} captures identical and every refusal correct`
);
process.exitCode = failures ? 2 : 0;
