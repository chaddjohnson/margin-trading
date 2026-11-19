// Shared helpers of the walk-forward robustness diagnostic (research/vg-l0-walk-forward-diagnostic/PROTOCOL.md).
// Records are written once and sealed (0444, sha256 appended to results/seals.jsonl); the audited studies' records and
// logs are only read.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';

export const STUDY = 'vg-l0-walk-forward-diagnostic';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const studyDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(studyDir, 'results');
export const sealsFile = path.join(resultsDir, 'seals.jsonl');
export const doorsLog = path.join(resultsDir, 'doors.jsonl');
export const rel = (f: string) => path.relative(repoRoot, f);

export const sha256Text = (t: string | Buffer) => createHash('sha256').update(t).digest('hex');
export const sha256File = (f: string) => sha256Text(fs.readFileSync(f));

// non-finite numbers are stored as "__Inf" / "__-Inf" / "__NaN" (the audited studies' convention)
const encodeValue = (v: unknown): unknown =>
  typeof v === 'number' && !Number.isFinite(v)
    ? Number.isNaN(v)
      ? '__NaN'
      : v > 0
        ? '__Inf'
        : '__-Inf'
    : Array.isArray(v)
      ? v.map(encodeValue)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, encodeValue(x)]))
        : v;

export const readRecord = <T>(file: string): T => decode<T>(fs.readFileSync(file, 'utf8'));

export const isSealed = (file: string) => fs.existsSync(file) && (fs.statSync(file).mode & 0o222) === 0;

// --dry: write the record to WFD_SCRATCH (default: the OS temp dir) instead, unsealed, for a check before sealing
export const dry = process.argv.includes('--dry');

export const sealJson = (file: string, value: unknown, stage: string) => {
  const text = `${JSON.stringify(encodeValue(value), null, 1)}\n`;

  if (dry) {
    const out = path.join(process.env.WFD_SCRATCH ?? os.tmpdir(), 'dry', rel(file));

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log(`dry run: ${out}`);
    return sha256Text(text);
  }
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: a sealed record is never rewritten`);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, text);
  fs.renameSync(`${file}.tmp`, file);
  fs.chmodSync(file, 0o444);

  const sha = sha256Text(text);

  fs.appendFileSync(
    sealsFile,
    `${JSON.stringify({ t: new Date().toISOString(), stage, file: rel(file), sha256: sha, bytes: Buffer.byteLength(text) })}\n`
  );
  return sha;
};

export const logDoor = (door: string, purpose: string, sha256: Record<string, string>) => {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.appendFileSync(doorsLog, `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, sha256 })}\n`);
};

export const r2 = (x: number) => Math.round(x * 100) / 100;
export const usd = (x: number) =>
  `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const isoMin = (t: number) =>
  Number.isFinite(t) && t > 0 ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—';
export const isoDay = (t: number) => (Number.isFinite(t) && t > 0 ? new Date(t * 1000).toISOString().slice(0, 10) : '—');

// The audited studies (paths of their sealed fold records and fold mark caches).
export const audited = {
  '5B-L0': {
    study: 'vg-lifecycle-matched-optimization',
    mode: 'L0',
    path: 'research/vg-lifecycle-matched-optimization'
  },
  SES: { study: 'vg-l0-session-hold', unit: 'ses', path: 'research/vg-l0-session-hold' },
  B1: { study: 'vg-l0-shadow-eligibility', track: 'B1', path: 'research/vg-l0-shadow-eligibility' },
  B2: { study: 'vg-l0-shadow-eligibility', track: 'B2', path: 'research/vg-l0-shadow-eligibility' }
} as const;
export type PathKey = keyof typeof audited;
export const pathKeys = Object.keys(audited) as PathKey[];

export const folds = [
  { fold: 'C19', trainDoor: 'D19', evalDoor: 'D21', boundary: '2019-12-31', slice: ['2020-01-02', '2021-12-31'] },
  { fold: 'C21', trainDoor: 'D21', evalDoor: 'D23', boundary: '2021-12-31', slice: ['2022-01-03', '2023-12-29'] },
  { fold: 'C23', trainDoor: 'D23', evalDoor: 'D24', boundary: '2023-12-29', slice: ['2024-01-02', '2024-12-31'] }
] as const;

export const ceiling = 35000;
