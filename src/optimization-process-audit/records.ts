// Sealed, write-once records of this study (results/seals.jsonl — never a subject's), the door log, guards on
// committed records, and formatting. Mirrors the subjects' records.ts, bound to this study's paths.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { encode } from '../growth140-vgt-s8m/store.ts';
import { doorLog, repoRoot, sealsLog } from './context.ts';

export const sha256Text = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

export const sha256File = (file: string) => {
  const h = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.allocUnsafe(1 << 24);

  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);

      if (n === 0) break;
      h.update(buf.subarray(0, n));
    }
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
};

export const rel = (file: string) => path.relative(repoRoot, file);
export const isSealed = (file: string) => fs.existsSync(file) && (fs.statSync(file).mode & 0o222) === 0;
export const plain = <T>(value: T): T => JSON.parse(encode(value)) as T;
export const textOf = (value: unknown) => `${JSON.stringify(plain(value), null, 1)}\n`;
export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const sealJson = (file: string, value: unknown, stage: string) => {
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: a sealed record is never rewritten`);

  const text = textOf(value);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeAtomic(file, text);
  fs.chmodSync(file, 0o444);

  const sha = sha256Text(text);

  fs.mkdirSync(path.dirname(sealsLog), { recursive: true });
  fs.appendFileSync(
    sealsLog,
    `${JSON.stringify({ t: new Date().toISOString(), stage, file: rel(file), sha256: sha, bytes: Buffer.byteLength(text) })}\n`
  );
  return sha;
};

// A pilot record: read-only in the cache, never in the study's seal log.
export const writePilot = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeAtomic(file, textOf(value));
};

export const verifySeals = () => {
  if (!fs.existsSync(sealsLog)) return { ok: 0, failed: [] as string[] };

  const lines = fs
    .readFileSync(sealsLog, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { file: string; sha256: string });
  const failed: string[] = [];

  for (const s of lines) {
    const file = path.join(repoRoot, s.file);

    if (!fs.existsSync(file) || sha256File(file) !== s.sha256 || !isSealed(file)) failed.push(s.file);
  }

  return { ok: lines.length - failed.length, failed };
};

// A sealed record that must also be committed unchanged before the next door opens.
export const assertCommitted = (file: string) => {
  const r = rel(file);

  if (!isSealed(file)) throw new Error(`${r} is not sealed`);
  try {
    execSync(`git ls-files --error-unmatch -- "${r}"`, { cwd: repoRoot, stdio: 'ignore' });
    execSync(`git diff --quiet HEAD -- "${r}"`, { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    throw new Error(`${r} is not committed unchanged (the guard of the next stage)`);
  }
  return sha256File(file);
};

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(doorLog, `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, ...extra })}\n`);
};

export const gitHead = () => execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();

export const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pct = (x: number, digits = 1) => (Number.isFinite(x) ? `${(x * 100).toFixed(digits)}%` : '—');

// The digest of this study's code directory (every .ts file under src/optimization-process-audit, tests excluded).
export const codeDigest = (dir: string) => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = path.join(d, e.name);

      if (e.isDirectory()) {
        if (e.name !== 'tests') walk(p);
      } else if (e.name.endsWith('.ts')) files.push(p);
    }
  };

  walk(dir);

  const list = files.map((f) => ({ file: rel(f), sha256: sha256File(f) }));

  return { files: list, digest: sha256Text(list.map((x) => `${x.file}:${x.sha256}`).join('\n')) };
};
