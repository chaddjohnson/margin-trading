// A minimal, deterministic ZIP writer (and reader, for verification) with Node's zlib: deflate (method 8) or stored
// (method 0), CRC-32 from zlib.crc32, entries in the order given (callers sort them), one fixed timestamp for every
// entry, no extra fields, no comments, no ZIP64 (each file and the archive stay below 4 GiB; the caller bounds the
// size). The same inputs always give the same bytes.

import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

export interface ZipEntry {
  name: string; // forward slashes, no leading slash, no '..'
  data: Buffer;
}

const LIMIT = 0xffff_fff0;

// MS-DOS date/time of a UTC instant (DOS time has no zone; the bundle's README says the stamps are UTC).
function dosTime(at: Date) {
  const year = Math.max(1980, at.getUTCFullYear());
  return {
    time: (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | Math.floor(at.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate()
  };
}

export function writeZip(entries: readonly ZipEntry[], stamp: Date): Buffer {
  const { time, date } = dosTime(stamp);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  const names = new Set<string>();
  for (const e of entries) {
    if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(e.name) || e.name.split('/').includes('..'))
      throw new Error(`zip: invalid entry name ${e.name}`);
    if (names.has(e.name)) throw new Error(`zip: duplicate entry ${e.name}`);
    names.add(e.name);
    const name = Buffer.from(e.name, 'utf8');
    const deflated = deflateRawSync(e.data, { level: 9 });
    const store = deflated.length >= e.data.length;
    const body = store ? e.data : deflated;
    const crc = crc32(e.data) >>> 0;
    if (e.data.length > LIMIT || body.length > LIMIT || offset > LIMIT) throw new Error('zip: archive too large (no ZIP64)');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(store ? 0 : 8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4); // made by: Unix, 2.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(store ? 0 : 8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // -rw-r--r--
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

/** Reads an archive written by writeZip (or any plain deflate/stored ZIP without ZIP64), verifying every CRC. */
export function readZip(zip: Buffer): Map<string, Buffer> {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('zip: no end of central directory');
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('zip: bad central directory');
    const method = zip.readUInt16LE(p + 10);
    const crc = zip.readUInt32LE(p + 16);
    const size = zip.readUInt32LE(p + 20);
    const nameLength = zip.readUInt16LE(p + 28);
    const extra = zip.readUInt16LE(p + 30);
    const comment = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + nameLength).toString('utf8');
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const body = zip.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(body) : Buffer.from(body);
    if ((crc32(data) >>> 0) !== crc) throw new Error(`zip: CRC mismatch in ${name}`);
    out.set(name, data);
    p += 46 + nameLength + extra + comment;
  }
  return out;
}
