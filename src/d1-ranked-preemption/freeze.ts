// The study's write-once records (PROTOCOL.md §17): generic JSON records sealed with a body hash (the protocol and
// code freezes, every stage record, PICKS.json, PROCEDURE_GATE.json, FROZEN_SELECTION.json, the rankings), the
// append-only amendment log, and the code manifest. Each record refuses to be written twice and is verified by its
// hash before anything that depends on it reads it.
import { execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import { gitState, sha256, sha256File } from '../portfolio-aware-d1/freeze.ts';
import { amendmentsFile, jsonReplacer, nowIso, readJson, writeJson } from './context.ts';

export { gitState, sha256, sha256File };

export const hashBody = (body: Record<string, unknown>) => sha256(JSON.stringify(body));

export interface Sealed {
  bodyHash: string;
  [key: string]: unknown;
}

export const safeJson = <T>(value: T): T => JSON.parse(JSON.stringify(value, jsonReplacer)) as T;

export const writeSealed = async (file: string, body: Record<string, unknown>): Promise<Sealed> => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  // The hash is of the JSON-safe body (NaN → null, ±Infinity → strings), exactly as it is written and read back.
  const safe = safeJson(body);
  const sealed = { ...safe, bodyHash: hashBody(safe) };

  await writeJson(file, sealed);

  return sealed as Sealed;
};

export const readSealed = async <T extends Sealed = Sealed>(file: string): Promise<T> => {
  if (!(await fs.pathExists(file))) {
    throw new Error(`${file} does not exist`);
  }

  const sealed = await readJson<T>(file);
  const { bodyHash, ...body } = sealed;

  if (hashBody(body) !== bodyHash) {
    throw new Error(`${file}: the body hash does not verify; the record was changed after it was written`);
  }

  return sealed;
};

export const isSealed = async (file: string) => {
  try {
    await readSealed(file);
    return true;
  } catch {
    return false;
  }
};

// The code manifest: every tracked or untracked src/**/*.ts except tests, with its sha256, and their digest.
export const codeManifest = async () => {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src'], {
    encoding: 'utf8'
  })
    .split('\n')
    .filter((file) => file.endsWith('.ts') && !file.includes('/tests/') && !file.endsWith('.test.ts'))
    .sort();
  const files: Record<string, string> = {};

  for (const file of listed) {
    if (await fs.pathExists(file)) {
      files[file] = await sha256File(file);
    }
  }

  return { files: Object.keys(files).length, digest: sha256(JSON.stringify(files)), hashes: files };
};

// The study's own code: src/d1-ranked-preemption/**/*.ts (tests included) with hashes.
export const studyCode = async () => {
  const listed = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', 'src/d1-ranked-preemption'],
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter((file) => file.endsWith('.ts'))
    .sort();
  const files: Record<string, string> = {};

  for (const file of listed) {
    if (await fs.pathExists(file)) {
      files[file] = await sha256File(file);
    }
  }

  return { files: Object.keys(files).length, digest: sha256(JSON.stringify(files)), hashes: files };
};

// ----- the amendment log (append-only; each entry chained to the previous) -----

export interface Amendment {
  index: number;
  at: string;
  stage: string;
  change: string;
  reason: string;
  review: string;
  affected: string[];
  previous: string;
  codeDigest: string;
  hash: string;
}

export const readAmendments = async (file = amendmentsFile): Promise<Amendment[]> => {
  if (!(await fs.pathExists(file))) {
    return [];
  }

  const lines = (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean);
  const entries = lines.map((line) => JSON.parse(line) as Amendment);
  let previous = '';

  entries.forEach((entry, index) => {
    const { hash, ...body } = entry;

    if (entry.index !== index + 1 || entry.previous !== previous || hashBody(body) !== hash) {
      throw new Error(`${file}: amendment ${index + 1} does not verify`);
    }

    previous = hash;
  });

  return entries;
};

export const appendAmendment = async (
  entry: Pick<Amendment, 'stage' | 'change' | 'reason' | 'review' | 'affected'>,
  file = amendmentsFile
) => {
  const entries = await readAmendments(file);
  const body = {
    index: entries.length + 1,
    at: nowIso(),
    ...entry,
    previous: entries.at(-1)?.hash ?? '',
    codeDigest: (await codeManifest()).digest
  };
  const amendment: Amendment = { ...body, hash: hashBody(body) };

  await fs.ensureFile(file);
  await fs.appendFile(file, `${JSON.stringify(amendment)}\n`);

  return amendment;
};

export const timestamp = () => nowIso();
