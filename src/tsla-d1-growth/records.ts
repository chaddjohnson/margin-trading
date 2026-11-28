// Sealed, write-once records of P6-TSLA (results/seals.jsonl — never another study’s), the committed-record guard and the
// study's code digest (the import closure of main.ts: its own modules plus the frozen Assignment 3 / Stage B / pilot /
// Priority 3 / Priority 5 modules it reuses, the GPU backend and the risk-envelope policy). Priority 5's records.ts with
// this study's paths; the JSON encoding is the store's (non-finite numbers as "__Inf" / "__-Inf" / "__NaN").
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { importClosure, isSealed, plain, readJson, sha256File, sha256Text, textOf } from '../vg-l0-full-joint/records.ts';
import { codeDir, repoRoot, sealsLog } from './context.ts';

export { importClosure, isSealed, plain, readJson, sha256File, sha256Text, textOf };

export const rel = (file: string) => path.relative(repoRoot, file);

export const seal = (file: string, value: unknown, stage: string) => {
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: a sealed record is never rewritten`);

  const text = textOf(value);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeAtomic(file, text);
  fs.chmodSync(file, 0o444);

  const sha = sha256Text(text);

  fs.mkdirSync(path.dirname(sealsLog), { recursive: true });
  fs.appendFileSync(sealsLog, `${JSON.stringify({ t: new Date().toISOString(), stage, file: rel(file), sha256: sha, bytes: Buffer.byteLength(text) })}\n`);
  return sha;
};

export const verifySeals = () => {
  if (!fs.existsSync(sealsLog)) return { ok: 0, failed: [] as string[] };

  const failed: string[] = [];
  const lines = fs
    .readFileSync(sealsLog, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { file: string; sha256: string });

  for (const s of lines) {
    const f = path.join(repoRoot, s.file);

    if (!fs.existsSync(f) || sha256File(f) !== s.sha256 || !isSealed(f)) failed.push(s.file);
  }
  return { ok: lines.length - failed.length, failed };
};

const git = (...args: string[]) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();

// a record that must be committed unchanged before the next stage (the freeze, the gates, each selection, each slice)
export const isCommitted = (file: string) => {
  const r = rel(file);

  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', r], { cwd: repoRoot, stdio: 'ignore' });
    execFileSync('git', ['diff', '--quiet', 'HEAD', '--', r], { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
export const assertCommitted = (file: string) => {
  if (!isCommitted(file)) throw new Error(`${rel(file)} is not committed unchanged (the guard of the next stage)`);
};

export const headCommit = () => git('rev-parse', 'HEAD');
export const branchName = () => git('rev-parse', '--abbrev-ref', 'HEAD');

export const codeFiles = () => importClosure([path.join(codeDir, 'main.ts')]);
export const codeDigest = () =>
  sha256Text(
    codeFiles()
      .map((f) => `${f}:${sha256File(path.join(repoRoot, f))}`)
      .join('\n')
  );

// uncommitted changes to the code closure, the package scripts or the study's protocol documents
export const dirtyCode = (studyFiles: readonly string[]) => {
  const files = [...codeFiles(), 'package.json', ...studyFiles];
  const out = git('status', '--porcelain', '--', ...files);

  return out ? out.split('\n') : [];
};

export const readSealed = <T>(file: string): T => {
  if (!isSealed(file)) throw new Error(`${rel(file)} is not sealed`);
  return readJson<T>(file);
};

// a streaming sha256 (job archives exceed fs.readFileSync's 2 GiB limit)
export const sha256Stream = async (file: string) => {
  const { createHash } = await import('node:crypto');
  const h = createHash('sha256');

  await new Promise<void>((resolve, reject) =>
    fs
      .createReadStream(file)
      .on('data', (c) => h.update(c))
      .on('end', () => resolve())
      .on('error', reject)
  );
  return h.digest('hex');
};
