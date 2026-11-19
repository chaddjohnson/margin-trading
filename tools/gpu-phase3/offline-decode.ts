// gpu-phase3 (development): times the Phase 2 serial host path on a captured batch, offline (no GPU): re-encode (prepare),
// the receipt checksum, and the decode with the canonical record reductions (complete).
//   node --experimental-transform-types tools/gpu-phase3/offline-decode.ts <capture name> [reps]
import fs from 'node:fs';
import path from 'node:path';
import { cacheDir } from '../../src/gpu-phase3/context.ts';
import { resolveDoor } from '../../src/gpu-phase3/doorSpec.ts';
import { GpuServer, outChecksumOf, type Task, type BatchOptions } from '../../src/gpu-backend/client.ts';
import { CandOut, Receipt, ResultHeader } from '../../src/gpu-backend/layout.ts';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';

const name = process.argv[2]!;
const reps = Number(process.argv[3] ?? '3');
const dir = path.join(cacheDir, 'captures');
const meta = decode<{ door: never; o: BatchOptions; uuid: string; nonce: string; tasks: Task[] }>(
  fs.readFileSync(path.join(dir, `${name}.json`), 'utf8')
);
const payload = fs.readFileSync(path.join(dir, `${name}.res.bin`));
const door = await resolveDoor(meta.door, 'gpu-phase3 offline decode (development)');
const P = GpuServer.prototype as unknown as { prepare: GpuServer['prepare']; complete: GpuServer['complete'] };

for (let r = 0; r < reps; r++) {
  const t0 = performance.now();
  const p = P.prepare.call(null, door, meta.tasks, meta.o);
  const t1 = performance.now();

  p.enc.nonce = BigInt(`0x${meta.nonce}`);
  const n = meta.tasks.length;
  const candAt = ResultHeader.size + Receipt.size;
  const t2 = performance.now();
  outChecksumOf(new Uint8Array(payload.buffer, payload.byteOffset + candAt, n * CandOut.size), n);
  const t3 = performance.now();
  const res = P.complete.call(null, p, { payload, roundTripMs: 0 }, meta.uuid);
  const t4 = performance.now();

  console.log(
    JSON.stringify({
      name,
      n,
      candOutBytes: CandOut.size,
      encodeMs: Math.round(t1 - t0),
      checksumMs: Math.round(t3 - t2),
      decodeMs: Math.round(t4 - t3),
      results: res.results.length
    })
  );
}
