// Write-once stage records, payload hashing, the protocol and code freezes, and the protected-scope check (PROTOCOL.md
// §6). A record holds its payloads' sha256, the git HEAD, the porcelain status outside the study, both freeze hashes
// and the record's own body hash; `verifyRecord` recomputes all of them.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { codeRoot, files, nowIso, resultFile, resultsRoot, study } from './context.ts';

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const sha256File = (file: string) => sha256(fs.readFileSync(file));

export const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === 'number' && !Number.isFinite(value) ? (Number.isNaN(value) ? null : String(value)) : value;

export const toJson = (value: unknown) => `${JSON.stringify(value, jsonReplacer, 1)}\n`;

// ----- the git scope -----

export const baseCommit = '70312f298742fa6f9ae493ef3828aa5621f19e54';

// Paths this study may add or change outside nothing else (brief §3, §12).
export const allowedPath = (file: string) =>
  file.startsWith('research/study3-vgt-momentum/') ||
  file.startsWith(`${codeRoot}/`) ||
  file === 'CLAUDE.md' ||
  file === 'docs/claude/context-recovery.md' ||
  file === 'package.json';

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
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  const basePkg = JSON.parse(git('show', `${baseCommit}:package.json`)) as { scripts: Record<string, string> };
  const scripts = { ...pkg.scripts };

  delete scripts['study3-momentum'];

  const packageOnlyScript =
    JSON.stringify({ ...pkg, scripts }) === JSON.stringify({ ...basePkg, scripts: basePkg.scripts });

  return { head, outside, packageOnlyScript };
};

export const assertScope = () => {
  const state = gitState();

  if (state.outside.length > 0 || !state.packageOnlyScript) {
    throw new Error(
      `protected scope violated: ${state.outside.slice(0, 10).join(', ')}${state.packageOnlyScript ? '' : ' (package.json beyond the study script)'}`
    );
  }

  return state;
};

// ----- freezes -----

export const protocolFiles = () => [
  files.protocol,
  files.catalog,
  files.matrix,
  path.join(path.dirname(files.protocol), 'FIRST_PRINCIPLES_AND_HYPOTHESES.md'),
  path.join(path.dirname(files.protocol), 'MECHANISM_SELECTION.md'),
  path.join(path.dirname(files.protocol), 'reviews', 'METHODOLOGY_REVIEW_1_DISPOSITIONS.md'),
  path.join(path.dirname(files.protocol), 'reviews', 'METHODOLOGY_REVIEW_2_DISPOSITIONS.md'),
  files.brief
];

export const protocolHashes = () => Object.fromEntries(protocolFiles().map((file) => [file, sha256File(file)]));

// The import closure of the study's entry point: every local module it reaches (relative and #lib/#types imports).
export const importClosure = (entry = path.join(codeRoot, 'main.ts')) => {
  const seen = new Set<string>();
  const stack = [path.normalize(entry)];
  const pattern = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

  while (stack.length > 0) {
    const file = stack.pop()!;

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);

    const source = fs.readFileSync(file, 'utf8');

    for (const match of source.matchAll(pattern)) {
      const spec = match[1] ?? match[2]!;
      let target: string | undefined;

      if (spec === '#lib') {
        target = 'src/lib/index.ts';
      } else if (spec === '#types') {
        target = 'src/types/index.ts';
      } else if (spec.startsWith('.')) {
        target = path.normalize(path.join(path.dirname(file), spec));
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
  const tests = fs
    .readdirSync(path.join(codeRoot, 'tests'))
    .filter((name) => name.endsWith('.ts'))
    .map((name) => path.join(codeRoot, 'tests', name));
  const filesList = [...new Set([...closure, ...tests, 'package.json', 'package-lock.json', 'tsconfig.json'])].sort();

  return Object.fromEntries(filesList.map((file) => [file, sha256File(file)]));
};

export const manifestHash = (manifest: Record<string, string>) => sha256(toJson(manifest));

// ----- records -----

export interface StageRecord {
  stage: string;
  study: string;
  createdAt: string;
  git: { head: string; outside: string[]; packageOnlyScript: boolean };
  protocolFreeze: string | null; // bodyHash of PROTOCOL_FREEZE.json
  codeFreeze: string | null; // manifest hash
  door?: unknown;
  payloads: Record<string, { file: string; sha256: string; bytes: number }>;
  summary: unknown;
  bodyHash?: string;
}

export const recordPath = (stage: string) => resultFile('records', `${stage}.json`);

export const readJsonFile = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const readGzJson = <T>(file: string): T => JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8')) as T;

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
  }
): StageRecord => {
  // Under the test root (always inside the OS temp directory) records go to that scratch tree, never the study's.
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
    const bytes = gzipSync(rows.map((row) => JSON.stringify(row, jsonReplacer)).join('\n') + '\n', { level: 9 });

    fs.writeFileSync(file, bytes);
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

  return payload.file.endsWith('.jsonl.gz')
    ? (gunzipSync(fs.readFileSync(payload.file))
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)) as T)
    : readGzJson<T>(payload.file);
};

// Stage order (PROTOCOL.md §6): every predecessor must exist and verify.
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
  'evaluate-A',
  'evaluate-B',
  'evaluate-C',
  'evaluate-D',
  'diagnostics',
  'robustness',
  'analysis'
];

export const assertPredecessors = (stage: string) => {
  const position = stageOrder.indexOf(stage);

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

export { resultsRoot };
