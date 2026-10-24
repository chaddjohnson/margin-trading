// Rebuilds and verifies the legacy research inputs listed in config/archive/legacy-research-inputs.json
// (src/lib/archive.ts). Every file is reconstructed from data on disk and must hash to its pinned sha256:
// - a legacy minute file is the first `rows` rows of the symbol's canonical file; a row in the final partition stops
//   the build, so the archive can never hold data the legacy downloads didn't have;
// - the legacy daily VGT file is a line range of the trailing-buy research's combined daily file, itself checked
//   against the hash that research recorded.
// Files are written to a temporary name and moved into place only when their hash and row count match; an existing
// file is never replaced, so a mismatch leaves the archive as it was and says which bytes differ. Archive files are
// made read-only once built.
import { createHash } from 'node:crypto';
import path from 'node:path';
import readline from 'node:readline';
import fs from 'fs-extra';
import {
  type LegacyArchiveEntry,
  canonicalDataFile,
  legacyArchivePath,
  newYorkOffset,
  readLegacyArchiveManifest,
  readPartitionConfig,
  segmentOf
} from '#lib';

export interface ArchiveResult {
  legacyPath: string;
  file: string;
  status: 'built' | 'verified' | 'failed';
  detail: string;
}

const sha256File = async (file: string) => {
  const hash = createHash('sha256');

  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
};

async function* linesOf(file: string) {
  for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
    yield line;
  }
}

const newYorkDateOf = (line: string) => {
  const time = Date.parse(line.split(',')[0]!.replaceAll('"', '')) / 1000;

  return new Date((time + newYorkOffset(time)) * 1000).toISOString().slice(0, 10);
};

// The entry's lines, from its source, in order.
async function* sourceLines(entry: LegacyArchiveEntry, dataDir: string): AsyncGenerator<string> {
  const { source } = entry;

  if (source.kind === 'canonical-prefix') {
    const config = readPartitionConfig(dataDir);
    let emitted = 0;

    for await (const line of linesOf(canonicalDataFile(source.symbol, dataDir))) {
      if (emitted === source.rows) {
        return;
      }

      if (segmentOf(config, newYorkDateOf(line)) === 'final') {
        throw new Error(
          `${entry.legacyPath}: row ${emitted + 1} is in the final partition, which legacy inputs never held`
        );
      }

      emitted++;
      yield line;
    }

    return;
  }

  const actual = await sha256File(source.file);

  if (actual !== source.fileSha256) {
    throw new Error(`${source.file} hashes to ${actual}, not the recorded ${source.fileSha256}`);
  }

  let number = 0;

  for await (const line of linesOf(source.file)) {
    number++;

    if (number > source.lastLine) {
      return;
    }

    if (number >= source.firstLine) {
      yield line;
    }
  }
}

export const buildEntry = async (entry: LegacyArchiveEntry, dataDir = 'data'): Promise<ArchiveResult> => {
  const file = legacyArchivePath(entry.legacyPath);
  const result = (status: ArchiveResult['status'], detail: string) => ({
    legacyPath: entry.legacyPath,
    file,
    status,
    detail
  });

  try {
    if (await fs.pathExists(file)) {
      const actual = await sha256File(file);

      return actual === entry.sha256
        ? result('verified', 'already in place')
        : result('failed', `exists with sha256 ${actual}, not ${entry.sha256}; it was left alone`);
    }

    const temporary = `${file}.tmp-${process.pid}`;
    const hash = createHash('sha256');
    let rows = 0;
    let first = '';
    let last = '';

    await fs.mkdirp(path.dirname(file));

    const out = fs.createWriteStream(temporary, { flags: 'wx' });

    try {
      for await (const line of sourceLines(entry, dataDir)) {
        const text = `${line}\n`;

        if (!out.write(text)) {
          await new Promise<void>((resolve) => out.once('drain', () => resolve()));
        }

        hash.update(text);
        rows++;
        first ||= line;
        last = line;
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        out.end((error?: Error | null) => (error ? reject(error) : resolve()))
      );
    }

    const actual = hash.digest('hex');

    if (actual !== entry.sha256 || rows !== entry.rows) {
      await fs.remove(temporary);
      return result(
        'failed',
        `rebuilt ${rows} rows hashing to ${actual}, not ${entry.rows} rows hashing to ${entry.sha256} (first ${first.slice(0, 40)}, last ${last.slice(0, 40)}); the source data no longer reproduces it`
      );
    }

    await fs.rename(temporary, file);
    await fs.chmod(file, 0o444);

    return (await sha256File(file)) === entry.sha256
      ? result('built', `${rows} rows, sha256 ${actual}`)
      : result('failed', 'changed while it was moved into place');
  } catch (error) {
    await fs.remove(`${file}.tmp-${process.pid}`);
    return result('failed', (error as Error).message);
  }
};

export const verifyEntry = async (entry: LegacyArchiveEntry): Promise<ArchiveResult> => {
  const file = legacyArchivePath(entry.legacyPath);

  if (!(await fs.pathExists(file))) {
    return { legacyPath: entry.legacyPath, file, status: 'failed', detail: 'not built' };
  }

  const actual = await sha256File(file);

  return {
    legacyPath: entry.legacyPath,
    file,
    status: actual === entry.sha256 ? 'verified' : 'failed',
    detail: actual === entry.sha256 ? `sha256 ${actual}` : `sha256 ${actual}, not ${entry.sha256}`
  };
};

export const selectEntries = (names: string[]) => {
  const { files } = readLegacyArchiveManifest();

  if (names.length === 0) {
    return files;
  }

  return names.map((name) => {
    const entry = files.find(
      (file) => file.legacyPath === name || (file.source.kind === 'canonical-prefix' && file.source.symbol === name)
    );

    if (!entry) {
      throw new Error(`${name} is not in the legacy archive (${files.map((file) => file.legacyPath).join(', ')})`);
    }

    return entry;
  });
};
