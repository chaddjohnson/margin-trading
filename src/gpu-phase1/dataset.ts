// The GP1 dataset file (v1, src/gpu-phase1/cuda/gp1.h Gp1DatasetHeader): the EXACT typed arrays of a door's two
// Datasets (GDX, VGT) as the canonical loader built them in memory — the same doubles the CPU engine reads, split
// adjustment included (FULL) — so the GPU never parses CSV or re-derives a price. A sidecar JSON records the door, its
// calendar, the canonical data hashes and the file's sha256; the server verifies size and a word checksum.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Dataset } from '../four-family/data.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { cacheDir } from './context.ts';

export const DATASET_VERSION = 1;
const HEADER = 48;

const sessionF64 = ['sTime', 'sCloseTime', 'sOpen', 'sHigh', 'sLow', 'sClose', 'sClosingPrint'] as const;
const sessionI32 = ['sBarStart', 'sBarCount'] as const;
const barF64 = ['bTime', 'bOpen', 'bHigh', 'bLow', 'bClose'] as const;

export const checksum32 = (buf: Buffer, from: number) => {
  const words = new Uint32Array(buf.buffer, buf.byteOffset + from, (buf.length - from) / 4);
  let h = 0x811c9dc5;

  for (let i = 0; i < words.length; i++) h = Math.imul(h ^ words[i]!, 16777619) >>> 0;
  return h;
};

export interface DatasetFile {
  file: string;
  sidecar: string;
  sha256: string;
  sessions: number;
  bars: { GDX: number; VGT: number };
}

export const exportDataset = (door: Door, label: string = door.name): DatasetFile => {
  const syms: Dataset[] = [door.sym.GDX.ds, door.sym.VGT.ds];
  const S = door.sessions;

  for (const ds of syms) if (ds.sessionCount !== S) throw new Error('session counts differ');

  const payload = syms.reduce((a, ds) => a + S * 7 * 8 + S * 2 * 4 + ds.barCount * 5 * 8, 0);
  const buf = Buffer.alloc(HEADER + payload);
  let o = HEADER;
  const put = (a: Float64Array | Int32Array, n: number) => {
    const bytes = Buffer.from(a.buffer, a.byteOffset, n * a.BYTES_PER_ELEMENT);

    bytes.copy(buf, o);
    o += bytes.length;
  };

  for (const ds of syms) {
    for (const k of sessionF64) put(ds[k], S);
    for (const k of sessionI32) put(ds[k], S);
    for (const k of barF64) put(ds[k], ds.barCount);
  }
  if (o !== buf.length) throw new Error('dataset layout mismatch');

  buf.write('GP1DSET1', 0, 'latin1');
  buf.writeUInt32LE(DATASET_VERSION, 8);
  buf.writeUInt32LE(2, 12);
  buf.writeUInt32LE(S, 16);
  buf.writeUInt32LE(0, 20);
  buf.writeUInt32LE(syms[0]!.barCount, 24);
  buf.writeUInt32LE(syms[1]!.barCount, 28);
  buf.writeBigUInt64LE(BigInt(checksum32(buf, HEADER)), 32);
  buf.writeBigUInt64LE(BigInt(payload), 40);

  const safe = label.replace(/[^A-Za-z0-9_.-]/g, '_');
  const file = path.join(cacheDir, `${safe}.gp1ds`);
  const sidecar = `${file}.json`;
  const sha256 = createHash('sha256').update(buf).digest('hex');

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, buf);
  fs.writeFileSync(
    sidecar,
    `${JSON.stringify(
      {
        kind: 'gp1 dataset',
        version: DATASET_VERSION,
        door: door.name,
        sessions: S,
        first: door.dates[0],
        last: door.dates.at(-1),
        bars: { GDX: syms[0]!.barCount, VGT: syms[1]!.barCount },
        dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
        fileSha256: sha256,
        bytes: buf.length,
        created: new Date().toISOString()
      },
      null,
      1
    )}\n`
  );
  return { file, sidecar, sha256, sessions: S, bars: { GDX: syms[0]!.barCount, VGT: syms[1]!.barCount } };
};
