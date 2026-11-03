// Write-once stage records, payload hashing, the protocol and code freezes, and the protected-scope check (PROTOCOL.md
// §12), after Stage 1b's records.ts. A record holds its payloads' sha256, the git HEAD, the porcelain status outside the
// Stage 1c namespace, both freeze hashes and its own body hash; `verifyRecord` recomputes all of them. Large JSON-lines
// archives are written beside the record and listed with their sha256 (git-ignored when large).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { codeRoot, files, nowIso, resultFile, study, studyDir, testRoot } from './context.ts';

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const sha256File = (file: string) => sha256(fs.readFileSync(file));

export const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === 'number' && !Number.isFinite(value) ? (Number.isNaN(value) ? null : String(value)) : value;

export const toJson = (value: unknown) => `${JSON.stringify(value, jsonReplacer, 1)}\n`;

// ----- the git scope -----

export const baseCommit = '2a7996ddd5585849964a795151ac7a80d56f419f'; // Stage 1b's verified remote head

// The only paths Stage 1c may add or change (brief §11).
export const allowedPath = (file: string) => file.startsWith(`${studyDir}/`) || file.startsWith(`${codeRoot}/`);

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });

export const gitState = () => {
  const head = git('rev-parse', 'HEAD').trim();
  const porcelain = git('status', '--porcelain', '--untracked-files=all')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter((file) => !path.basename(file).startsWith('._'));
  const changedSinceBase = git('diff', '--name-only', baseCommit, '--').split('\n').filter(Boolean);
  const outside = [...new Set([...porcelain, ...changedSinceBase])].filter((file) => !allowedPath(file)).sort();

  return { head, outside };
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
    throw new Error('refused: a write-once stage never runs under STAGE1C_ROOT');
  }
};

// ----- freezes -----

export const protocolFiles = () => [
  files.protocol,
  files.contract,
  files.matrix,
  files.catalog,
  files.brief,
  path.join(studyDir, 'scripts', 'make_matrix.py'),
  ...fs
    .readdirSync(path.join(studyDir, 'reviews'))
    .filter((name) => /^METHODOLOGY_.*_DISPOSITIONS\.md$/.test(name))
    .sort()
    .map((name) => path.join(studyDir, 'reviews', name))
];

export const protocolHashes = () => Object.fromEntries(protocolFiles().map((file) => [file, sha256File(file)]));

// The import closure of the study's entry point: every local module it reaches (relative and #lib/#types imports,
// and worker scripts started with new URL('./x.ts', import.meta.url)).
export const importClosure = (entry = path.join(codeRoot, 'main.ts')) => {
  const seen = new Set<string>();
  const stack = [path.normalize(entry)];
  const pattern =
    /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g;

  while (stack.length > 0) {
    const file = stack.pop()!;

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);

    const source = fs.readFileSync(file, 'utf8');

    for (const match of source.matchAll(pattern)) {
      const spec = match[1] ?? match[2] ?? match[3]!;
      let target: string | undefined;

      if (spec === '#lib') {
        target = 'src/lib/index.ts';
      } else if (spec === '#types') {
        target = 'src/types/index.ts';
      } else if (spec.startsWith('.') || spec.startsWith('/')) {
        target = path.normalize(spec.startsWith('/') ? spec : path.join(path.dirname(file), spec));
      }

      if (target && fs.existsSync(target)) {
        stack.push(target);
      }
    }
  }

  return [...seen].sort();
};

export const codeManifest = () => {
  const closure = importClosure();
  const testsDir = path.join(codeRoot, 'tests');
  const tests = fs.existsSync(testsDir)
    ? fs
        .readdirSync(testsDir)
        .filter((name) => name.endsWith('.ts'))
        .map((name) => path.join(testsDir, name))
    : [];
  const list = [...new Set([...closure, ...tests, 'package.json', 'package-lock.json', 'tsconfig.json'])].sort();

  return Object.fromEntries(list.map((file) => [file, sha256File(file)]));
};

export const manifestHash = (manifest: Record<string, string>) => sha256(toJson(manifest));

// ----- records -----

export interface StageRecord {
  stage: string;
  study: string;
  createdAt: string;
  git: { head: string; outside: string[] };
  protocolFreeze: string | null;
  codeFreeze: string | null;
  door?: unknown;
  payloads: Record<string, { file: string; sha256: string; bytes: number }>;
  summary: unknown;
  bodyHash?: string;
}

export const recordPath = (stage: string) => resultFile('records', `${stage}.json`);

export const payloadDir = (stage: string) => resultFile('payloads', stage);

export const readJsonFile = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const readRecord = (stage: string) => readJsonFile<StageRecord>(recordPath(stage));

export const recordExists = (stage: string) => fs.existsSync(recordPath(stage));

const bodyHashOf = (record: StageRecord) => {
  const { bodyHash: _drop, ...body } = record;

  return sha256(toJson(body));
};

export const protocolFreezeHash = () =>
  fs.existsSync(files.protocolFreeze) ? readJsonFile<{ bodyHash: string }>(files.protocolFreeze).bodyHash : null;

export const codeFreezeHash = () =>
  fs.existsSync(files.codeFreeze) ? readJsonFile<{ manifestHash: string }>(files.codeFreeze).manifestHash : null;

// Payloads are gzip-compressed JSON (".json.gz") or JSON lines (".jsonl.gz") written beside the record.
export const writeStage = (
  stage: string,
  options: {
    door?: unknown;
    summary: unknown;
    payloads: Record<string, unknown>;
    jsonl?: Record<string, unknown[]>;
    written?: Record<string, string>; // payload files already streamed into the stage's payload directory
  }
): StageRecord => {
  const target = recordPath(stage);

  if (fs.existsSync(target)) {
    throw new Error(`refused: ${stage} is sealed (${target})`);
  }

  const dir = resultFile('payloads', stage);
  const payloads: StageRecord['payloads'] = {};

  fs.ensureDirSync(dir);

  for (const [name, value] of Object.entries(options.payloads)) {
    const file = path.join(dir, `${name}.json.gz`);
    const bytes = gzipSync(toJson(value), { level: 9 });

    fs.writeFileSync(file, bytes);
    payloads[name] = { file, sha256: sha256(bytes), bytes: bytes.length };
  }

  for (const [name, rows] of Object.entries(options.jsonl ?? {})) {
    const file = path.join(dir, `${name}.jsonl.gz`);
    const text = rows.map((row) => JSON.stringify(row, jsonReplacer)).join('\n') + '\n';
    const bytes = gzipSync(text, { level: 9 });

    fs.writeFileSync(file, bytes);
    payloads[name] = { file, sha256: sha256(bytes), bytes: bytes.length };
  }

  for (const [name, file] of Object.entries(options.written ?? {})) {
    if (path.dirname(path.resolve(file)) !== path.resolve(dir)) {
      throw new Error(`refused: ${file} is not in ${dir}`);
    }

    const bytes = fs.readFileSync(file);

    payloads[name] = { file, sha256: sha256(bytes), bytes: bytes.length };
  }

  const record: StageRecord = {
    stage,
    study: study.id,
    createdAt: nowIso(),
    git: gitState(),
    protocolFreeze: protocolFreezeHash(),
    codeFreeze: codeFreezeHash(),
    door: options.door,
    payloads,
    summary: options.summary
  };

  record.bodyHash = bodyHashOf(record);
  fs.outputFileSync(target, toJson(record));
  return record;
};

export const verifyRecord = (stage: string) => {
  const record = readRecord(stage);
  const problems: string[] = [];

  if (bodyHashOf(record) !== record.bodyHash) {
    problems.push(`${stage}: body hash`);
  }

  for (const [name, payload] of Object.entries(record.payloads)) {
    if (!fs.existsSync(payload.file) || sha256File(payload.file) !== payload.sha256) {
      problems.push(`${stage}: payload ${name}`);
    }
  }

  return { record, problems };
};

export const readPayload = <T>(stage: string, name: string): T => {
  const record = readRecord(stage);
  const payload = record.payloads[name];

  if (!payload) {
    throw new Error(`${stage} has no payload ${name}`);
  }

  if (sha256File(payload.file) !== payload.sha256) {
    throw new Error(`${stage} payload ${name} does not verify`);
  }

  const text = gunzipSync(fs.readFileSync(payload.file)).toString('utf8');

  return payload.file.endsWith('.jsonl.gz')
    ? (text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)) as T)
    : (JSON.parse(text) as T);
};

// Stage order (PROTOCOL.md §12): every predecessor must exist and verify.
export const stageOrder = [
  'audit',
  'freeze-protocol',
  'parity',
  'freeze-code',
  'develop-A',
  'develop-B',
  'develop-C',
  'develop-D',
  'develop-H',
  'evaluate',
  'robustness',
  'analysis'
];

export const assertPredecessors = (stage: string) => {
  const position = stageOrder.indexOf(stage.replace(/-rerun-\d+$/, ''));

  if (position < 0) {
    throw new Error(`unknown stage ${stage}`);
  }

  for (const previous of stageOrder.slice(0, position)) {
    const marker =
      previous === 'freeze-protocol'
        ? files.protocolFreeze
        : previous === 'freeze-code'
          ? files.codeFreeze
          : recordPath(previous);

    if (!fs.existsSync(marker)) {
      throw new Error(`refused: ${stage} needs ${previous} first`);
    }

    if (previous !== 'freeze-protocol' && previous !== 'freeze-code') {
      const { problems } = verifyRecord(previous);

      if (problems.length > 0) {
        throw new Error(`refused: ${previous} does not verify (${problems.join('; ')})`);
      }
    }
  }
};

// Both freezes must hold for every stage after them.
export const assertFreezes = (requireCode: boolean) => {
  const frozen = readJsonFile<{ hashes: Record<string, string>; bodyHash: string }>(files.protocolFreeze);
  const now = protocolHashes();

  for (const [file, hash] of Object.entries(frozen.hashes)) {
    if (now[file] !== hash) {
      throw new Error(`protocol freeze broken: ${file}`);
    }
  }

  if (requireCode) {
    const code = readJsonFile<{ manifest: Record<string, string>; manifestHash: string }>(files.codeFreeze);
    const manifest = codeManifest();

    if (manifestHash(manifest) !== code.manifestHash) {
      const changed = Object.keys({ ...manifest, ...code.manifest }).filter(
        (file) => manifest[file] !== code.manifest[file]
      );

      throw new Error(`code freeze broken: ${changed.join(', ')}`);
    }
  }
};
