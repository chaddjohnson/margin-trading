// Sealed, write-once records of THIS study only (results/seals.jsonl), its door log and hashing helpers. Another study's
// records are read (and their sha256 checked), never written.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../growth140-vgt-s8m/store.ts';
import { doorLog, repoRoot, resultsDir, sealsLog } from './context.ts';

export const sha256Text = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
export const sha256File = (file: string) => sha256Text(fs.readFileSync(file));
export const rel = (file: string) => path.relative(repoRoot, file);

// Another study's sealed JSON with its sha256 checked first; non-finite numbers decoded (store encoding).
export const readPinned = <T>(file: string, sha256: string): T => {
  const text = fs.readFileSync(file, 'utf8');
  const got = sha256Text(text);

  if (got !== sha256) throw new Error(`${rel(file)}: sha256 ${got}, expected ${sha256}`);
  return decode<T>(text);
};
export const readJson = <T>(file: string): T => decode<T>(fs.readFileSync(file, 'utf8'));

export const isSealed = (file: string) => fs.existsSync(file) && (fs.statSync(file).mode & 0o222) === 0;

// Write once, make read-only, append the sha256 to this study's seals.jsonl. Refuses to overwrite.
export const sealJson = (file: string, value: unknown, label: string) => {
  if (!path.resolve(file).startsWith(resultsDir + path.sep)) throw new Error(`refusing to seal outside ${rel(resultsDir)}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: sealed records are write-once`);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const text = encode(value);

  fs.writeFileSync(file, text);
  fs.chmodSync(file, 0o444);

  const sha256 = sha256Text(text);

  fs.appendFileSync(sealsLog, `${JSON.stringify({ t: new Date().toISOString(), file: rel(file), sha256, bytes: Buffer.byteLength(text), label })}\n`);
  return sha256;
};

export const verifySeals = () => {
  const rows = fs.existsSync(sealsLog)
    ? fs
        .readFileSync(sealsLog, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { file: string; sha256: string })
    : [];
  const bad: string[] = [];

  for (const r of rows) {
    const f = path.join(repoRoot, r.file);

    if (!fs.existsSync(f) || sha256File(f) !== r.sha256 || !isSealed(f)) bad.push(r.file);
  }
  return { records: rows.length, bad };
};

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(doorLog, `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, ...extra })}\n`);
};
