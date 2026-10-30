// Write-once sealed records, canonical body hashes, the git scope check and the freezes (PROTOCOL.md §13). A sealed
// record holds its own canonical body hash (sha256 of the JSON without `bodyHash`), the git HEAD, the protocol and code
// freeze body hashes in force and the Node version; `readSealed` recomputes the body hash and refuses a mismatch.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { codeRoot, files, studyDir, testRoot } from './context.ts';

export const sha256 = (data: string | Buffer | Uint8Array) => createHash('sha256').update(data).digest('hex');
export const sha256File = (file: string) => sha256(fs.readFileSync(file));
export const nowIso = () => new Date().toISOString();

export const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === 'number' && !Number.isFinite(value) ? (Number.isNaN(value) ? null : String(value)) : value;

export const toJson = (value: unknown) => `${JSON.stringify(value, jsonReplacer, 1)}\n`;

// Canonical form: keys sorted recursively, non-finite numbers as strings, no whitespace.
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonical((value as Record<string, unknown>)[key])])
    );
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return Number.isNaN(value) ? null : String(value);
  }

  return value;
};

export const bodyHashOf = (record: Record<string, unknown>) => {
  const { bodyHash, ...body } = record;

  void bodyHash;
  return sha256(JSON.stringify(canonical(body)));
};

// ----- git scope -----

export const baseCommit = '9d9513bf58639b0dce6db7dedef19474e2b9ff4b'; // Study 3 Stage 1c's verified remote head

export const allowedPath = (file: string) =>
  file.startsWith(`${studyDir}/`) ||
  file.startsWith(`${codeRoot}/`) ||
  file === 'package.json' ||
  file === '.gitignore';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });

export const gitState = () => {
  const head = git('rev-parse', 'HEAD').trim();
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
  const porcelain = git('status', '--porcelain', '--untracked-files=all')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter((file) => !path.basename(file).startsWith('._'));
  const changedSinceBase = git('diff', '--name-only', baseCommit, '--').split('\n').filter(Boolean);
  const outside = [...new Set([...porcelain, ...changedSinceBase])].filter((file) => !allowedPath(file)).sort();

  return { head, branch, outside };
};

export const assertScope = () => {
  const state = gitState();

  if (state.outside.length > 0) {
    throw new Error(`protected scope violated: ${state.outside.slice(0, 10).join(', ')}`);
  }

  return state;
};

export const assertRealRoot = () => {
  if (testRoot) {
    throw new Error('refused: a write-once stage never runs under STUDY4_ROOT');
  }
};

export const assertNode = () => {
  if (process.version !== 'v24.21.0') {
    throw new Error(`refused: Node ${process.version}; the study runs on v24.21.0 (.node-version)`);
  }
};

// ----- sealed records -----

export interface Sealed {
  bodyHash: string;
  [key: string]: unknown;
}

export const writeSealed = (file: string, body: Record<string, unknown>): Sealed => {
  if (fs.existsSync(file)) {
    throw new Error(`refused: ${file} exists (write-once)`);
  }

  const record = { ...body, sealedAt: nowIso() } as Record<string, unknown>;
  const sealed = { ...record, bodyHash: bodyHashOf(record) } as Sealed;

  fs.ensureDirSync(path.dirname(file));
  fs.writeFileSync(`${file}.tmp`, toJson(sealed));
  fs.renameSync(`${file}.tmp`, file);
  fs.chmodSync(file, 0o444);

  return sealed;
};

export const readSealed = <T = Sealed>(file: string): T & Sealed => {
  const record = fs.readJsonSync(file) as Sealed;

  if (typeof record.bodyHash !== 'string' || bodyHashOf(record) !== record.bodyHash) {
    throw new Error(`${file}: the body hash does not verify`);
  }

  return record as T & Sealed;
};

export const verifySealed = (file: string) => {
  try {
    readSealed(file);
    return true;
  } catch {
    return false;
  }
};

// A large companion archive: gzipped JSON lines, listed in its record with its sha256 (git-ignored when large).
// Written as concatenated gzip members of at most 10,000 rows each (no single huge string).
export const writeArchive = (file: string, rows: unknown[]) => {
  const hash = createHash('sha256');
  let bytes = 0;

  fs.ensureDirSync(path.dirname(file));
  fs.writeFileSync(file, '');

  for (let i = 0; i < rows.length; i += 10000) {
    const text = rows
      .slice(i, i + 10000)
      .map((row) => JSON.stringify(row, jsonReplacer))
      .join('\n');
    const member = gzipSync(Buffer.from(i + 10000 < rows.length ? `${text}\n` : text));

    fs.appendFileSync(file, member);
    hash.update(member);
    bytes += member.length;
  }

  return { file, rows: rows.length, bytes, sha256: hash.digest('hex') };
};

export const readArchive = <T>(file: string): T[] => {
  const text = gunzipSync(fs.readFileSync(file)).toString('utf8');

  return text.length === 0 ? [] : text.split('\n').map((line) => JSON.parse(line) as T);
};

// ----- freezes -----

export const protocolFiles = () => [
  files.protocol,
  files.contract,
  files.searchPlan,
  files.matrix,
  files.audit,
  files.brief,
  files.dispositions,
  files.review1,
  files.review2
];

export const protocolHashes = () => Object.fromEntries(protocolFiles().map((file) => [file, sha256File(file)]));

export const protocolFreezeBody = () => {
  if (!fs.existsSync(files.protocolFreeze)) {
    throw new Error('refused: the protocol is not frozen');
  }

  const freeze = readSealed<{ hashes: Record<string, string> }>(files.protocolFreeze);

  for (const [file, hash] of Object.entries(freeze.hashes)) {
    if (sha256File(file) !== hash) {
      throw new Error(`refused: ${file} changed after the protocol freeze`);
    }
  }

  return freeze.bodyHash;
};

// Every local module reachable from the entry points (relative imports, #lib/#types and worker URLs).
export const importClosure = (entries: string[]) => {
  const seen = new Set<string>();
  const stack = entries.map((entry) => path.normalize(entry));
  const aliases: Record<string, string> = { '#lib': 'src/lib/index.ts', '#types': 'src/types/index.ts' };

  while (stack.length > 0) {
    const file = stack.pop()!;

    if (seen.has(file) || !fs.existsSync(file)) {
      continue;
    }

    seen.add(file);

    const text = fs.readFileSync(file, 'utf8');
    const specifiers = [
      ...text.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g),
      ...text.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...text.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)
    ].map((match) => match[1]!);

    for (const specifier of specifiers) {
      if (aliases[specifier]) {
        stack.push(aliases[specifier]);
      } else if (specifier.startsWith('.')) {
        stack.push(path.normalize(path.join(path.dirname(file), specifier)));
      }
    }
  }

  return [...seen].sort();
};

export const developmentEntries = () => [
  path.join(codeRoot, 'develop.ts'),
  path.join(codeRoot, 'worker.ts'),
  path.join(codeRoot, 'parity.ts'),
  path.join(codeRoot, 'referenceParity.ts')
];

// The digest of a closure's file hashes: parity records carry it, and the code freeze accepts only parity results
// produced by exactly the code it freezes.
export const closureDigest = (entries = developmentEntries()) => sha256(JSON.stringify(codeHashes(entries)));
export const evaluationEntries = () => [
  path.join(codeRoot, 'main.ts'),
  path.join(codeRoot, 'evaluation.ts'),
  path.join(codeRoot, 'worker.ts')
];

export const codeHashes = (entries = developmentEntries()) =>
  Object.fromEntries(importClosure(entries).map((file) => [file, sha256File(file)]));

// Every file bound by a code freeze must be unchanged, and no file may have joined its closure since.
export const verifyCodeFreeze = (file: string, entries: string[]) => {
  if (!fs.existsSync(file)) {
    throw new Error(`refused: ${file} does not exist (the code is not frozen)`);
  }

  const freeze = readSealed<{ hashes: Record<string, string> }>(file);
  const now = codeHashes(entries);

  for (const [bound, hash] of Object.entries(freeze.hashes)) {
    if (!fs.existsSync(bound) || sha256File(bound) !== hash) {
      throw new Error(`refused: ${bound} changed after ${file}`);
    }
  }

  for (const joined of Object.keys(now)) {
    if (!(joined in freeze.hashes)) {
      throw new Error(`refused: ${joined} joined the import closure after ${file}`);
    }
  }

  return freeze.bodyHash;
};

// The development code freezes in force: CODE_FREEZE.json, then CODE_FREEZE-2.json, … (a later freeze follows an
// amendment, PROTOCOL.md §11); the latest one binds the code.
export const codeFreezeFiles = () => {
  const list: string[] = [];

  if (fs.existsSync(files.codeFreeze)) {
    list.push(files.codeFreeze);

    for (let n = 2; fs.existsSync(files.codeFreeze.replace(/\.json$/, `-${n}.json`)); n++) {
      list.push(files.codeFreeze.replace(/\.json$/, `-${n}.json`));
    }
  }

  return list;
};

export const latestCodeFreezeFile = () => codeFreezeFiles().at(-1) ?? files.codeFreeze;

export const nextCodeFreezeFile = () =>
  codeFreezeFiles().length === 0
    ? files.codeFreeze
    : files.codeFreeze.replace(/\.json$/, `-${codeFreezeFiles().length + 1}.json`);

export const codeFreezeBody = () => verifyCodeFreeze(latestCodeFreezeFile(), developmentEntries());

// Whether the current development code is exactly the latest frozen code.
export const codeIsFrozen = () => {
  const file = latestCodeFreezeFile();

  return fs.existsSync(file) && readSealed<{ codeDigest?: string }>(file).codeDigest === closureDigest();
};

export const appendAmendment = (entry: Record<string, unknown>) => {
  fs.ensureDirSync(path.dirname(files.amendments));
  fs.appendFileSync(files.amendments, `${JSON.stringify({ ...entry, at: nowIso() })}\n`);
};
