// gpu-backend: the GB2 dataset file (v2, gb.h GbDatasetHeader): the EXACT typed arrays of a door's two Datasets (GDX,
// VGT) as the canonical loader built them — the same doubles the CPU engine reads, split adjustment included (FULL) —
// plus the CPU door's own daily signal bars (barsFromSessions '1d', the Growth scanner's input), each session's New York
// UTC offset from the CPU's newYorkOffset (the drawdown gate's wall-clock minute) and the drawdown gate's full
// observations (each session's minute closes, then its close when a closing print exists). The GPU never parses CSV
// or re-derives a price. The export REFUSES a dataset the evaluator's proofs do not cover (an empty session, a
// non-positive or non-finite price, non-integer times, bars not one per session), so validity branches the CPU takes
// only on such data are provably unreachable on every accepted dataset.
//
// PUBLICATION (GPU Phase 5): a dataset file is WRITE-ONCE and published atomically, so that concurrent exporters and
// readers of one cache directory can never meet a partial file:
//   1. the bytes are built in memory exactly as before (the format and every byte are unchanged);
//   2. an existing target must be a regular file holding exactly these bytes (sha256): then it is reused untouched. A
//      complete dataset with OTHER content under the same name is an explicit conflict; anything else (a truncated or
//      corrupt file, a symbolic link, a directory) is an explicit invalid-cache error. Nothing is ever overwritten;
//   3. otherwise the bytes go to a unique temporary file in the SAME directory (exclusive creation: never through an
//      existing path or link), are flushed (fsync), read back and verified, and are published with link(2) — which
//      creates the target only if it does not exist. Losing that race means another writer published first: its file
//      is then verified like any existing target (identical content converges; different content is a conflict);
//   4. the sidecar (.json) is derived metadata, published the same way after the data file.
// A reader therefore sees no file or a complete, verified one. A writer killed at any point leaves at most a temporary
// file (the target absent, or a previously published valid file); stale temporary files of dead writers are removed by
// a later export (bounded, by age, owner and writer liveness). After a power loss the target is absent or complete on a
// journaling file system (the data is flushed before it is linked); the directory entry itself is flushed best-effort.
// Per-job cache directories remain the recommended practice (docs/gpu/README.md §4a).
import { createHash, randomBytes } from 'node:crypto';
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
  published: 'created' | 'reused'; // this call created the file, or found it already published with these bytes
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

// ----- atomic, write-once publication -----

export class DatasetCacheError extends Error {
  constructor(
    readonly code: 'DATASET_CACHE_CONFLICT' | 'DATASET_CACHE_INVALID',
    message: string
  ) {
    super(message);
    this.name = 'DatasetCacheError';
  }
}

const TMP = '.tmp-';
const STALE_TEMPORARY_MS = 15 * 60 * 1000;
const hashOf = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const remedy = 'remove the file, or give this job its own dataset cache directory (the recommended practice)';

// a complete GB2 dataset by its own header (magic, version, size, payload checksum) — the checks the server makes
export const isCompleteDataset = (b: Buffer) => {
  const H = DatasetHeader.size;
  const off = DatasetHeader.offsets;

  if (b.length < H || b.toString('latin1', off.magic!, off.magic! + 8) !== 'GB2DSET1') return false;
  if (Number(b.readBigUInt64LE(off.payloadBytes!)) !== b.length - H || (b.length - H) % 4 !== 0) return false;
  return BigInt(checksum32(b, H)) === b.readBigUInt64LE(off.checksum!);
};

const describe = (sidecar: string) => {
  try {
    const x = JSON.parse(fs.readFileSync(sidecar, 'utf8')) as Record<string, unknown>;

    return ` (its sidecar: door ${String(x.door)}, version ${String(x.version)}, sha256 ${String(x.fileSha256).slice(0, 16)}…, data ${JSON.stringify(x.dataSha256)})`;
  } catch {
    return '';
  }
};

// the target as it is now: absent, or exactly the expected bytes, or an explicit error. Never follows a link.
const existing = (file: string, expectSha256: string, expectBytes: number, about: () => string): 'absent' | 'same' => {
  let st: fs.Stats;

  try {
    st = fs.lstatSync(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return 'absent';
    throw e;
  }
  if (!st.isFile())
    throw new DatasetCacheError(
      'DATASET_CACHE_INVALID',
      `dataset cache: ${file} is not a regular file (${st.isSymbolicLink() ? 'a symbolic link' : 'another kind of entry'}); it is never followed or replaced: ${remedy}`
    );

  const b = fs.readFileSync(file);

  if (b.length === expectBytes && hashOf(b) === expectSha256) return 'same';
  if (isCompleteDataset(b))
    throw new DatasetCacheError(
      'DATASET_CACHE_CONFLICT',
      `dataset cache conflict: ${file} holds a complete dataset with other content (sha256 ${hashOf(b).slice(0, 16)}…, ${b.length} bytes${about()}) than this export (sha256 ${expectSha256.slice(0, 16)}…, ${expectBytes} bytes): another door, data revision or dataset version under the same name. It is never overwritten: ${remedy}`
    );
  throw new DatasetCacheError(
    'DATASET_CACHE_INVALID',
    `invalid dataset cache: ${file} (${b.length} bytes) is not a complete dataset (truncated, corrupt or foreign) and is not the expected one. It is never overwritten: ${remedy}`
  );
};

// a new file with these bytes, created exclusively (an existing path — a file or a link — is never opened), flushed
export const writeExclusive = (file: string, bytes: Buffer) => {
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o644);

  try {
    let at = 0;

    while (at < bytes.length) at += fs.writeSync(fd, bytes, at, bytes.length - at);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
};

const temporaryOf = (file: string) =>
  `${path.join(path.dirname(file), `.${path.basename(file)}`)}${TMP}${process.pid}-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;

const flushDirectory = (dir: string) => {
  try {
    const fd = fs.openSync(dir, 'r');

    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    /* best effort: the published file's own data is already flushed */
  }
};

// publish `bytes` as `file` if and only if no `file` exists; reuse an identical one; refuse any other
const publishOnce = (file: string, bytes: Buffer, sha256: string, about: () => string): 'created' | 'reused' => {
  if (existing(file, sha256, bytes.length, about) === 'same') return 'reused';

  const tmp = temporaryOf(file);

  writeExclusive(tmp, bytes);
  try {
    const back = fs.readFileSync(tmp);

    if (back.length !== bytes.length || hashOf(back) !== sha256 || !isCompleteDataset(back))
      throw new DatasetCacheError(
        'DATASET_CACHE_INVALID',
        `dataset export: the temporary file ${tmp} does not read back as written (storage fault); nothing was published`
      );
    try {
      fs.linkSync(tmp, file); // atomic, and only if the target does not exist
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      // another writer published first: its file must be exactly these bytes
      if (existing(file, sha256, bytes.length, about) === 'same') return 'reused';
      throw new Error(`dataset export: ${file} vanished while it was being verified`);
    }
    flushDirectory(path.dirname(file));
    return 'created';
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};

// the sidecar: derived metadata of a verified data file. Identity = every field but `created`.
const publishSidecar = (sidecar: string, rec: Record<string, unknown>, file: string) => {
  const identity = (x: Record<string, unknown>) => JSON.stringify({ ...x, created: undefined });
  const read = () => {
    let st: fs.Stats;

    try {
      st = fs.lstatSync(sidecar);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return 'absent' as const;
      throw e;
    }
    if (!st.isFile())
      throw new DatasetCacheError(
        'DATASET_CACHE_INVALID',
        `dataset cache: ${sidecar} is not a regular file: ${remedy}`
      );

    let x: Record<string, unknown> | null = null;

    try {
      x = JSON.parse(fs.readFileSync(sidecar, 'utf8')) as Record<string, unknown>;
    } catch {
      /* unreadable: below */
    }
    if (x && identity(x) === identity(rec)) return 'same' as const;
    throw new DatasetCacheError(
      'DATASET_CACHE_CONFLICT',
      `dataset cache conflict: ${sidecar} describes another dataset than ${file} (which holds the expected bytes): ${remedy}`
    );
  };

  if (read() === 'same') return;

  const tmp = temporaryOf(sidecar);

  writeExclusive(tmp, Buffer.from(`${JSON.stringify({ ...rec, created: new Date().toISOString() }, null, 1)}\n`));
  try {
    try {
      fs.linkSync(tmp, sidecar);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      read(); // another writer's sidecar: the same identity, or a conflict
    }
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};

// temporary files of writers that died (a kill between creation and publication): removed when old enough, owned by
// this user and their writer's process is gone. Bounded and best-effort — a failure here never fails an export.
export const removeStaleTemporaries = (dir: string, base: string, olderThanMs = STALE_TEMPORARY_MS, limit = 32) => {
  let removed = 0;

  try {
    for (const name of fs.readdirSync(dir)) {
      if (removed >= limit) break;
      if (!name.startsWith(`.${base}`) || !name.includes(TMP)) continue;

      const m = /\.tmp-(\d+)-[0-9a-z]+-[0-9a-f]{12}$/.exec(name);

      if (!m) continue;
      try {
        const full = path.join(dir, name);
        const st = fs.lstatSync(full);

        if (!st.isFile() || st.uid !== process.getuid?.() || Date.now() - st.mtimeMs < olderThanMs) continue;
        try {
          process.kill(Number(m[1]), 0);
          continue; // a live process has this id: leave the file
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ESRCH') continue;
        }
        fs.unlinkSync(full);
        removed++;
      } catch {
        /* raced with another cleaner, or unreadable: leave it */
      }
    }
  } catch {
    /* the directory is unreadable: the export itself will say so */
  }
  return removed;
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
  removeStaleTemporaries(dir, path.basename(file));

  const published = publishOnce(file, buf, sha256, () => describe(sidecar));

  publishSidecar(sidecar, rec, file);
  return {
    file,
    sidecar,
    sha256,
    sessions: S,
    bars: rec.bars,
    full: rec.full,
    door: door.name,
    dataSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
    published
  };
};
