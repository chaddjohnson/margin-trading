// Integrity helpers: write-once sealed records (0444, sha256 appended to results/seals.jsonl), the door log, hashes,
// git state and the evaluation-code digest every stage checks against the protocol freeze.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { codeDir, doorsLog, resultsDir, sealsLog } from './context.ts';

export const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const fileSha256 = (file: string) => sha256(fs.readFileSync(file));
export const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const stable = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value as object)
            .sort()
            .map((k) => [k, stable((value as Record<string, unknown>)[k])])
        )
      : value;

export const stableJson = (value: unknown) => JSON.stringify(stable(value));

// A sealed record: written once (refuses to overwrite), read-only, its sha256 appended to seals.jsonl.
export const writeSealed = (file: string, body: Record<string, unknown>, stage: string) => {
  if (fs.existsSync(file)) throw new Error(`${file} is sealed already; a sealed record is never rewritten`);

  fs.mkdirSync(path.dirname(file), { recursive: true });

  const text = `${JSON.stringify(body, null, 1)}\n`;

  fs.writeFileSync(file, text, { mode: 0o444 });
  fs.chmodSync(file, 0o444);

  const entry = { at: nowIso(), stage, file, sha256: sha256(text), bytes: Buffer.byteLength(text) };

  fs.appendFileSync(sealsLog, `${JSON.stringify(entry)}\n`);
  return entry;
};

// A sealed text artifact (CSV, JSONL, Markdown table) under the same rules.
export const writeSealedText = (file: string, text: string, stage: string) => {
  if (fs.existsSync(file)) throw new Error(`${file} is sealed already; a sealed record is never rewritten`);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, { mode: 0o444 });
  fs.chmodSync(file, 0o444);

  const entry = { at: nowIso(), stage, file, sha256: sha256(text), bytes: Buffer.byteLength(text) };

  fs.appendFileSync(sealsLog, `${JSON.stringify(entry)}\n`);
  return entry;
};

export const readJson = <T = Record<string, unknown>>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export const readSeals = (): { at: string; stage: string; file: string; sha256: string }[] =>
  fs.existsSync(sealsLog)
    ? fs
        .readFileSync(sealsLog, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line))
    : [];

// Every sealed record still has its recorded hash (the last entry per file wins; a file is sealed once).
export const verifySeals = () => {
  const problems: string[] = [];
  const seals = readSeals();

  for (const s of seals) {
    if (!fs.existsSync(s.file)) problems.push(`${s.file}: missing`);
    else if (fileSha256(s.file) !== s.sha256) problems.push(`${s.file}: sha256 differs from seals.jsonl`);
    else if ((fs.statSync(s.file).mode & 0o222) !== 0) problems.push(`${s.file}: writable`);
  }

  return { count: seals.length, problems };
};

export interface DoorEntry {
  at: string;
  door: string;
  purpose: string;
  bytes: number;
  sha256: string;
  lastRowUtc: string;
  lastSession: string;
  pid: number;
}

export const recordDoor = (entry: Omit<DoorEntry, 'at' | 'pid'>) => {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.appendFileSync(doorsLog, `${JSON.stringify({ at: nowIso(), ...entry, pid: process.pid })}\n`);
};

// The evaluation code: every source file of the study plus the imported modules it executes. A change after the
// protocol freeze needs an acknowledged amendment.
export const importedFiles = [
  'src/intraday-d1/periods.ts',
  'src/intraday-d1/engine.ts',
  'src/optimizer/nsga2.ts',
  'src/optimizer/rng.ts',
  'src/optimizer/sobol.ts',
  'src/study5-gdx-b5-three-etf/grid.ts',
  'src/lib/session.ts',
  'src/lib/csv.ts',
  'src/lib/calendar.ts',
  'src/lib/corporateActions.ts',
  'src/research-standard/preflight.ts'
];

export const codeFiles = () =>
  [
    ...fs
      .readdirSync(codeDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => path.join(codeDir, f)),
    ...importedFiles
  ].sort();

export const codeDigest = () => {
  const files = Object.fromEntries(codeFiles().map((f) => [f, fileSha256(f)]));

  return { digest: sha256(stableJson(files)), files };
};
