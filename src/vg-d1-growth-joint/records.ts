// Sealed, write-once records (PROTOCOL.md §17): JSON written atomically, made read-only (0444) and its sha256 appended
// to results/seals.jsonl. A sealed record is never rewritten; a stage whose record exists refuses to rerun.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { encode } from '../growth140-vgt-s8m/store.ts';
import { repoRoot, sealsLog } from './context.ts';

export const sha256Text = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

export const isSealed = (file: string) => fs.existsSync(file) && (fs.statSync(file).mode & 0o222) === 0;

export const sealJson = (file: string, value: unknown, stage: string) => {
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: a sealed record is never rewritten`);

  const text = `${JSON.stringify(JSON.parse(encode(value)), null, 1)}\n`;

  writeAtomic(file, text);
  fs.chmodSync(file, 0o444);

  const sha = sha256Text(text);

  fs.mkdirSync(path.dirname(sealsLog), { recursive: true });
  fs.appendFileSync(
    sealsLog,
    `${JSON.stringify({ t: new Date().toISOString(), stage, file: path.relative(repoRoot, file), sha256: sha, bytes: text.length })}\n`
  );
  return sha;
};

export const sealText = (file: string, text: string, stage: string) => {
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: a sealed record is never rewritten`);
  writeAtomic(file, text);
  fs.chmodSync(file, 0o444);

  const sha = sha256Text(text);

  fs.appendFileSync(
    sealsLog,
    `${JSON.stringify({ t: new Date().toISOString(), stage, file: path.relative(repoRoot, file), sha256: sha, bytes: text.length })}\n`
  );
  return sha;
};

export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeAtomic(file, `${JSON.stringify(JSON.parse(encode(value)), null, 1)}\n`);
};

export const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const pct = (x: number, digits = 2) => (Number.isFinite(x) ? `${(x * 100).toFixed(digits)}%` : '—');
