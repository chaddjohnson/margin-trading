// Write-once sealed records ({ ...body, bodyHash }), tables, the code digest of this namespace, the logger and the
// LOCAL HASH CHAIN that freezes the study's stages without Git commits (PROTOCOL.md §2.3). Each phase appends one entry
// to results/chain.jsonl listing every record of the phase with its sha256 and the previous entry's hash; every gate
// re-verifies the whole chain (all listed file hashes and every link) before a stage may start, and fails closed on any
// mismatch. Each entry also binds the door log (results/doors.jsonl) as it stood at sealing time (line count and the
// sha256 of those lines), and every door opening records the chain head it saw, so editing earlier door-log lines or
// truncating the chain below a recorded head fails verification. This is a local integrity mechanism, not a signature,
// a notarization or a commit-backed record.
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { sha256 } from '../study5-gdx-b5-three-etf/data.ts';
import { readSealed, writeCsv, writeJsonl, writeSealed } from '../study6-b5-kre-robustness/records.ts';
import { chainFile, codeDir, doorsLog, protocolFile } from './context.ts';

export { readSealed, writeCsv, writeJsonl, writeSealed };

export const nowIso = () => new Date().toISOString();

export const fileSha256 = async (file: string) => sha256(await fs.readFile(file));

export const codeDigest = async () => {
  const files = (await fs.readdir(codeDir, { recursive: true }))
    .map(String)
    .filter((name) => name.endsWith('.ts'))
    .sort();
  const hashes: Record<string, string> = {};

  for (const name of files) hashes[path.join(codeDir, name)] = await fileSha256(path.join(codeDir, name));

  return { digest: sha256(JSON.stringify(hashes)), files: hashes };
};

let tag = 'study8';

export const setLogTag = (value: string) => {
  tag = value;
};

export const log = (line: string) => console.info(`[${tag} ${new Date().toISOString().slice(11, 19)}Z] ${line}`);

export const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();

export const protocolSha256 = async () => fileSha256(protocolFile);

export const jsonText = (value: unknown, space = 1) =>
  JSON.stringify(
    value,
    (_key, item) => (typeof item === 'number' && !Number.isFinite(item) ? String(item) : item),
    space
  );

// ----- the local hash chain -----

export interface ChainEntry {
  seq: number;
  phase: string;
  at: string;
  files: { file: string; sha256: string }[];
  doors: { lines: number; sha256: string }; // the door log's first `lines` lines at sealing time
  prev: string; // the previous entry's entryHash ('' for the first)
  entryHash: string; // sha256 of the entry without this field
}

// The door log's complete lines (a torn final line being appended by another process is ignored).
export const doorLogLines = async () => {
  if (!(await fs.pathExists(doorsLog))) return [];

  const text = await fs.readFile(doorsLog, 'utf8');
  const lines = text.split('\n');

  lines.pop(); // the text after the last newline (empty, or a line still being written)
  return lines;
};

const linesSha = (lines: readonly string[]) => sha256(lines.map((line) => `${line}\n`).join(''));

const entryHashOf = (entry: Omit<ChainEntry, 'entryHash'>) => sha256(JSON.stringify(entry));

export const readChain = async (): Promise<ChainEntry[]> => {
  if (!(await fs.pathExists(chainFile))) return [];

  return (await fs.readFile(chainFile, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ChainEntry);
};

// Re-verify every link, every listed file and the door-log bindings; throws on the first mismatch (fail closed).
export const verifyChain = async () => {
  const chain = await readChain();
  const doorLines = await doorLogLines();
  let prev = '';

  for (const [index, entry] of chain.entries()) {
    const { entryHash, ...rest } = entry;

    if (entry.seq !== index + 1 || entry.prev !== prev || entryHashOf(rest) !== entryHash) {
      throw new Error(`hash chain broken at entry ${index + 1} (${entry.phase}): link or entry hash mismatch`);
    }

    if (
      !entry.doors ||
      entry.doors.lines > doorLines.length ||
      linesSha(doorLines.slice(0, entry.doors.lines)) !== entry.doors.sha256
    ) {
      throw new Error(`hash chain: the door log no longer matches its state when phase ${entry.phase} was sealed`);
    }

    for (const item of entry.files) {
      if (!(await fs.pathExists(item.file)))
        throw new Error(`hash chain: ${item.file} (phase ${entry.phase}) is missing`);

      const actual = await fileSha256(item.file);

      if (actual !== item.sha256)
        throw new Error(`hash chain: ${item.file} (phase ${entry.phase}) changed: ${actual} ≠ ${item.sha256}`);
    }

    prev = entryHash;
  }

  // every door opened after the freeze recorded the chain head it saw; the chain must still contain it
  for (const line of doorLines) {
    const head = (JSON.parse(line) as { chainHead?: { seq: number; entryHash: string } }).chainHead;

    if (head && head.seq > 0 && chain[head.seq - 1]?.entryHash !== head.entryHash) {
      throw new Error(
        `hash chain: a door opening recorded chain head ${head.seq} ${head.entryHash.slice(0, 12)}, which the chain no longer holds (truncated or rewritten)`
      );
    }
  }

  return chain;
};

export const chainHead = (chain: readonly ChainEntry[]) => ({
  seq: chain.length,
  entryHash: chain.at(-1)?.entryHash ?? ''
});

export const requirePhase = async (phase: string) => {
  const chain = await verifyChain();

  if (!chain.some((entry) => entry.phase === phase))
    throw new Error(`stage refused: phase "${phase}" is not sealed in ${chainFile}`);

  return chain;
};

export const phaseSealed = async (phase: string) => (await readChain()).some((entry) => entry.phase === phase);

// Append one phase (write-once per phase name), after verifying the existing chain.
export const appendPhase = async (phase: string, files: readonly string[]) => {
  const chain = await verifyChain();

  if (chain.some((entry) => entry.phase === phase)) throw new Error(`phase "${phase}" is already sealed`);

  const listed = [];

  for (const file of [...files].sort()) {
    if (!(await fs.pathExists(file))) throw new Error(`cannot seal phase ${phase}: ${file} is missing`);

    listed.push({ file, sha256: await fileSha256(file) });
  }

  const doorLines = await doorLogLines();
  const rest = {
    seq: chain.length + 1,
    phase,
    at: nowIso(),
    files: listed,
    doors: { lines: doorLines.length, sha256: linesSha(doorLines) },
    prev: chain.at(-1)?.entryHash ?? ''
  };
  const entry: ChainEntry = { ...rest, entryHash: entryHashOf(rest) };

  await fs.ensureFile(chainFile);
  await fs.appendFile(chainFile, `${JSON.stringify(entry)}\n`);

  return entry;
};
