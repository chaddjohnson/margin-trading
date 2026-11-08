// Sealed, write-once records of this follow-up: JSON written atomically, made read-only (0444), its sha256 appended to
// research/vgt-d1-growth-separate-pooled/results/seals.jsonl. A sealed record is never rewritten; a stage whose record
// exists refuses to rerun. (Priority 2's records.ts writes Priority 2's seal log, so it is not reused here.)
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { encode } from '../growth140-vgt-s8m/store.ts';
import { doorLog, repoRoot, sealsLog } from './context.ts';

export const sha256Text = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
export const sha256File = (file: string) => sha256Text(fs.readFileSync(file));
export const rel = (file: string) => path.relative(repoRoot, file);

export const isSealed = (file: string) => fs.existsSync(file) && (fs.statSync(file).mode & 0o222) === 0;

// The JSON form every record and every comparison uses: non-finite numbers become "__NaN" / "__Inf" (as in the
// Priority 2 records, so recomputed values compare with sealed ones exactly).
export const normal = <T>(value: T): T => JSON.parse(encode(value)) as T;

export const sealJson = (file: string, value: unknown, stage: string) => {
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: a sealed record is never rewritten`);

  const text = `${JSON.stringify(normal(value), null, 1)}\n`;

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

export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(
    doorLog,
    `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, ...extra })}\n`
  );
};

// The committed-and-unchanged check of a file (the manifest guard): tracked by git, no working-tree change.
export const isCommittedUnchanged = (file: string) => {
  const r = rel(file);
  const tracked = execSync(`git ls-files -- '${r}'`, { cwd: repoRoot }).toString().trim();
  const status = execSync(`git status --porcelain -- '${r}'`, { cwd: repoRoot }).toString().trim();

  return Boolean(tracked) && !status;
};

export const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';

  const keys = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);

    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  return `${keys.join(',')}\n${rows.map((r) => keys.map((k) => cell(r[k])).join(',')).join('\n')}\n`;
};

export const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
