// A minimal read-only ZIP reader for Stooq's bulk archives (d_us_txt.zip): it reads the central
// directory, then extracts single members (stored or deflated) and checks their CRC-32. ZIP64 and
// encrypted archives are refused rather than guessed at.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';

export interface ZipEntry {
  name: string;
  method: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  modified: string; // MS-DOS date and time as YYYY-MM-DDTHH:MM:SS, local to the archiver
}

const dosDateTime = (date: number, time: number) => {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${1980 + (date >> 9)}-${pad((date >> 5) & 15)}-${pad(date & 31)}T${pad(time >> 11)}:${pad((time >> 5) & 63)}:${pad((time & 31) * 2)}`;
};

export const readZipDirectory = async (file: string): Promise<ZipEntry[]> => {
  const handle = await fs.open(file, 'r');

  try {
    const { size } = await handle.stat();
    const tailLength = Math.min(size, 65557);
    const tail = Buffer.alloc(tailLength);

    await handle.read(tail, 0, tailLength, size - tailLength);

    const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));

    if (eocd < 0) {
      throw new Error(`${file}: no end-of-central-directory record`);
    }

    const entryCount = tail.readUInt16LE(eocd + 10);
    const directorySize = tail.readUInt32LE(eocd + 12);
    const directoryOffset = tail.readUInt32LE(eocd + 16);

    if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
      throw new Error(`${file}: ZIP64 archives are not supported`);
    }

    const directory = Buffer.alloc(directorySize);

    await handle.read(directory, 0, directorySize, directoryOffset);

    const entries: ZipEntry[] = [];
    let offset = 0;

    for (let index = 0; index < entryCount; index++) {
      if (directory.readUInt32LE(offset) !== 0x02014b50) {
        throw new Error(`${file}: corrupt central directory at entry ${index}`);
      }

      const flags = directory.readUInt16LE(offset + 8);
      const nameLength = directory.readUInt16LE(offset + 28);
      const extraLength = directory.readUInt16LE(offset + 30);
      const commentLength = directory.readUInt16LE(offset + 32);

      if (flags & 1) {
        throw new Error(`${file}: encrypted entries are not supported`);
      }

      entries.push({
        name: directory.toString(flags & 0x800 ? 'utf8' : 'latin1', offset + 46, offset + 46 + nameLength),
        method: directory.readUInt16LE(offset + 10),
        modified: dosDateTime(directory.readUInt16LE(offset + 14), directory.readUInt16LE(offset + 12)),
        crc32: directory.readUInt32LE(offset + 16),
        compressedSize: directory.readUInt32LE(offset + 20),
        uncompressedSize: directory.readUInt32LE(offset + 24),
        localHeaderOffset: directory.readUInt32LE(offset + 42)
      });
      offset += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
  } finally {
    await handle.close();
  }
};

export const extractZipEntry = async (file: string, entry: ZipEntry): Promise<Buffer> => {
  const handle = await fs.open(file, 'r');

  try {
    const header = Buffer.alloc(30);

    await handle.read(header, 0, 30, entry.localHeaderOffset);

    if (header.readUInt32LE(0) !== 0x04034b50) {
      throw new Error(`${file}: bad local header for ${entry.name}`);
    }

    const dataOffset = entry.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
    const compressed = Buffer.alloc(entry.compressedSize);

    await handle.read(compressed, 0, entry.compressedSize, dataOffset);

    let data: Buffer;

    if (entry.method === 0) {
      data = compressed;
    } else if (entry.method === 8) {
      data = zlib.inflateRawSync(compressed);
    } else {
      throw new Error(`${file}: compression method ${entry.method} of ${entry.name} is not supported`);
    }

    if (data.length !== entry.uncompressedSize || zlib.crc32(data) >>> 0 !== entry.crc32) {
      throw new Error(`${file}: ${entry.name} failed its size or CRC-32 check`);
    }

    return data;
  } finally {
    await handle.close();
  }
};
