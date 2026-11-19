// gpu-backend: the GB2 dataset file (v2, gb.h GbDatasetHeader): the EXACT typed arrays of a door's two Datasets (GDX,
// VGT) as the canonical loader built them — the same doubles the CPU engine reads, split adjustment included (FULL) —
// plus the CPU door's own daily signal bars (barsFromSessions '1d', the Growth scanner's input), each session's New York
// UTC offset from the CPU's newYorkOffset (the drawdown gate's wall-clock minute) and the drawdown gate's full
// observations (each session's minute closes, then its close when a closing print exists). The GPU never parses CSV
// or re-derives a price. The export REFUSES a dataset the evaluator's proofs do not cover (an empty session, a
// non-positive or non-finite price, non-integer times, bars not one per session), so validity branches the CPU takes
// only on such data are provably unreachable on every accepted dataset.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Dataset } from '../four-family/data.ts';
import type { Door, SymDoor } from '../vg-d1-growth-joint/data.ts';
import { newYorkOffset } from '../lib/session.ts';
import { DATASET_VERSION, DatasetHeader } from './layout.ts';

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
  full: { GDX: number; VGT: number };
  door: string;
  dataSha256: { GDX: string; VGT: string };
}

const valid = (x: number) => Number.isFinite(x) && x > 0;

// the per-symbol derived arrays, with the export's refusals
const derive = (sd: SymDoor, S: number) => {
  const ds: Dataset = sd.ds;
  const bars = sd.bars;

  if (ds.sessionCount !== S) throw new Error(`${sd.symbol}: ${ds.sessionCount} sessions ≠ ${S}`);
  if (bars.length !== S)
    throw new Error(
      `${sd.symbol}: ${bars.length} daily bars ≠ ${S} sessions (the evaluator needs one bar per session)`
    );

  const barEnd = new Float64Array(S);
  const barOpen = new Float64Array(S);
  const barHigh = new Float64Array(S);
  const barLow = new Float64Array(S);
  const barClose = new Float64Array(S);
  const nyOffset = new Int32Array(S);
  const fullStart = new Int32Array(S);
  let F = 0;

  for (let s = 0; s < S; s++) {
    const b = bars[s]!;

    if (b.sessionIndex !== s) throw new Error(`${sd.symbol}: bar ${s} belongs to session ${b.sessionIndex}`);
    barEnd[s] = b.end;
    barOpen[s] = b.open;
    barHigh[s] = b.high;
    barLow[s] = b.low;
    barClose[s] = b.close;
    for (const x of [b.open, b.high, b.low, b.close, ds.sOpen[s]!, ds.sHigh[s]!, ds.sLow[s]!, ds.sClose[s]!])
      if (!valid(x)) throw new Error(`${sd.symbol} ${ds.dates[s]}: a non-positive or non-finite session price`);
    if (!Number.isInteger(b.end) || !Number.isInteger(ds.sTime[s]!) || !Number.isInteger(ds.sCloseTime[s]!))
      throw new Error(`${sd.symbol} ${ds.dates[s]}: non-integer session times`);
    if (b.end !== ds.sCloseTime[s])
      throw new Error(`${sd.symbol} ${ds.dates[s]}: the daily bar does not end at the session close`);

    const off = newYorkOffset(ds.sCloseTime[s]!);

    if (!Number.isInteger(off)) throw new Error(`${sd.symbol} ${ds.dates[s]}: non-integer New York offset`);
    nyOffset[s] = off;

    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    if (count < 1) throw new Error(`${sd.symbol} ${ds.dates[s]}: a session without minute bars`);
    for (let k = 0; k < count; k++) {
      const t = ds.bTime[start + k]!;

      if (!Number.isInteger(t) || (k > 0 && !(t > ds.bTime[start + k - 1]!)))
        throw new Error(`${sd.symbol} ${ds.dates[s]}: minute times not strictly increasing integers`);
      for (const x of [ds.bOpen[start + k]!, ds.bHigh[start + k]!, ds.bLow[start + k]!, ds.bClose[start + k]!])
        if (!valid(x)) throw new Error(`${sd.symbol} ${ds.dates[s]}: a non-positive or non-finite minute price`);
    }
    if (s + 1 < S && ds.sBarStart[s + 1] !== start + count)
      throw new Error(`${sd.symbol}: minute bars are not contiguous`);
    fullStart[s] = F;
    F += count + (Number.isFinite(ds.sClosingPrint[s]!) ? 1 : 0);
  }

  const fullPrice = new Float64Array(F);

  for (let s = 0; s < S; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    let o = fullStart[s]!;

    for (let k = 0; k < count; k++) fullPrice[o++] = ds.bClose[start + k]!;
    if (Number.isFinite(ds.sClosingPrint[s]!)) fullPrice[o++] = ds.sClose[s]!;
  }

  return { ds, barEnd, barOpen, barHigh, barLow, barClose, nyOffset, fullStart, fullPrice, F };
};

export const exportDataset = (door: Door, dir: string, label: string = door.name): DatasetFile => {
  const S = door.sessions;
  const parts = [derive(door.sym.GDX, S), derive(door.sym.VGT, S)];
  const payload = parts.reduce((a, p) => a + S * 12 * 8 + S * 4 * 4 + p.ds.barCount * 5 * 8 + p.F * 8, 0);
  const H = DatasetHeader.size;
  const buf = Buffer.alloc(H + payload);
  let o = H;
  const put = (a: Float64Array | Int32Array, n: number) => {
    const bytes = Buffer.from(a.buffer, a.byteOffset, n * a.BYTES_PER_ELEMENT);

    bytes.copy(buf, o);
    o += bytes.length;
  };

  for (const p of parts) {
    const ds = p.ds;

    for (const a of [
      ds.sTime,
      ds.sCloseTime,
      ds.sOpen,
      ds.sHigh,
      ds.sLow,
      ds.sClose,
      ds.sClosingPrint,
      p.barEnd,
      p.barOpen,
      p.barHigh,
      p.barLow,
      p.barClose
    ])
      put(a, S);
    for (const a of [ds.sBarStart, ds.sBarCount, p.nyOffset, p.fullStart]) put(a, S);
    for (const a of [ds.bTime, ds.bOpen, ds.bHigh, ds.bLow, ds.bClose]) put(a, ds.barCount);
    put(p.fullPrice, p.F);
  }
  if (o !== buf.length) throw new Error('dataset layout mismatch');

  const off = DatasetHeader.offsets;

  buf.write('GB2DSET1', off.magic!, 'latin1');
  buf.writeUInt32LE(DATASET_VERSION, off.version!);
  buf.writeUInt32LE(2, off.nSym!);
  buf.writeUInt32LE(S, off.sessions!);
  buf.writeUInt32LE(0, off.flags!);
  buf.writeUInt32LE(parts[0]!.ds.barCount, off.bars!);
  buf.writeUInt32LE(parts[1]!.ds.barCount, off.bars! + 4);
  buf.writeUInt32LE(parts[0]!.F, off.full!);
  buf.writeUInt32LE(parts[1]!.F, off.full! + 4);
  buf.writeBigUInt64LE(BigInt(checksum32(buf, H)), off.checksum!);
  buf.writeBigUInt64LE(BigInt(payload), off.payloadBytes!);

  const safe = label.replace(/[^A-Za-z0-9_.-]/g, '_');
  const file = path.join(dir, `${safe}.gb2ds`);
  const sidecar = `${file}.json`;
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const rec = {
    kind: 'gb2 dataset',
    version: DATASET_VERSION,
    door: door.name,
    sessions: S,
    first: door.dates[0],
    last: door.dates.at(-1),
    bars: { GDX: parts[0]!.ds.barCount, VGT: parts[1]!.ds.barCount },
    full: { GDX: parts[0]!.F, VGT: parts[1]!.F },
    dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
    fileSha256: sha256,
    bytes: buf.length
  };

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, buf);
  fs.writeFileSync(sidecar, `${JSON.stringify({ ...rec, created: new Date().toISOString() }, null, 1)}\n`);
  return {
    file,
    sidecar,
    sha256,
    sessions: S,
    bars: rec.bars,
    full: rec.full,
    door: door.name,
    dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 }
  };
};
