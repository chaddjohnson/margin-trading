// Write-once sealed records (Study 6's writeSealed: { ...body, bodyHash }), the study's code digest, the door log and a
// local hash chain of sealed phases (Study 8's mechanism, PROTOCOL.md §8): every phase appends one entry listing its
// records with their sha256 and the previous entry's hash; `verifyChain` re-hashes everything. A local integrity
// mechanism; the freeze is additionally committed to git before the validation door opens.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { readSealed, writeCsv, writeJsonl, writeSealed } from '../study6-b5-kre-robustness/records.ts';
import { codeDir, doorsLog, protocolFile, resultFile } from './context.ts';

export { readSealed, writeCsv, writeJsonl, writeSealed };

export const chainFile = resultFile('chain.jsonl');
export const nowIso = () => new Date().toISOString();
export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export const fileSha256 = async (file: string) => sha256(await fs.readFile(file));
export const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
export const log = (line: string) => console.info(`[intraday-d1 ${new Date().toISOString().slice(11, 19)}Z] ${line}`);

// Every .ts file of the namespace (tests included) and the Study 8 / engine modules it imports.
export const importedFiles = [
  'src/study8-expanded-regime-d1/context.ts',
  'src/study8-expanded-regime-d1/fitness.ts',
  'src/study8-expanded-regime-d1/stats.ts',
  'src/study8-expanded-regime-d1/search.ts',
  'src/study5-gdx-b5-three-etf/grid.ts',
  'src/study6-b5-kre-robustness/records.ts',
  'src/optimizer/nsga2.ts',
  'src/optimizer/rng.ts',
  'src/optimizer/sobol.ts',
  'src/lib/session.ts',
  'src/lib/csv.ts',
  'src/lib/calendar.ts',
  'src/lib/corporateActions.ts',
  'config/market-events/splits.json'
];

export const codeDigest = async () => {
  const files = (await fs.readdir(codeDir, { recursive: true }))
    .map(String)
    .filter((name) => name.endsWith('.ts'))
    .sort()
    .map((name) => path.join(codeDir, name));
  const hashes: Record<string, string> = {};

  for (const file of [...files, ...importedFiles]) hashes[file] = await fileSha256(file);

  return { digest: sha256(JSON.stringify(hashes)), files: hashes };
};

export const protocolSha256 = async () => fileSha256(protocolFile);

export interface DoorEntry {
  at: string;
  door: string;
  purpose: string;
  dataSha256: string;
  lastDate: string;
  chainHead: string;
}

export const readDoors = async (): Promise<DoorEntry[]> =>
  (await fs.pathExists(doorsLog))
    ? (await fs.readFile(doorsLog, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as DoorEntry)
    : [];

export interface ChainEntry {
  seq: number;
  phase: string;
  at: string;
  files: { file: string; sha256: string }[];
  doors: { lines: number; sha256: string };
  previous: string;
  hash: string;
}

export const readChain = async (): Promise<ChainEntry[]> =>
  (await fs.pathExists(chainFile))
    ? (await fs.readFile(chainFile, 'utf8'))
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ChainEntry)
    : [];

export const chainHead = async () => (await readChain()).at(-1)?.hash ?? 'genesis';

export const recordDoor = async (door: string, purpose: string, dataSha256: string, lastDate: string) => {
  const entry: DoorEntry = { at: nowIso(), door, purpose, dataSha256, lastDate, chainHead: await chainHead() };

  await fs.ensureDir(path.dirname(doorsLog));
  await fs.appendFile(doorsLog, `${JSON.stringify(entry)}\n`);
  return entry;
};

const doorsDigest = async () => {
  const text = (await fs.pathExists(doorsLog)) ? await fs.readFile(doorsLog, 'utf8') : '';
  const lines = text.split('\n').filter(Boolean);

  return { lines: lines.length, sha256: sha256(lines.join('\n')) };
};

export const appendChain = async (phase: string, files: string[]) => {
  const chain = await readChain();

  if (chain.some((entry) => entry.phase === phase)) {
    throw new Error(`chain: phase ${phase} is already sealed`);
  }

  const body = {
    seq: chain.length + 1,
    phase,
    at: nowIso(),
    files: await Promise.all(files.map(async (file) => ({ file, sha256: await fileSha256(file) }))),
    doors: await doorsDigest(),
    previous: chain.at(-1)?.hash ?? 'genesis'
  };
  const entry: ChainEntry = { ...body, hash: sha256(JSON.stringify(body)) };

  await fs.ensureDir(path.dirname(chainFile));
  await fs.appendFile(chainFile, `${JSON.stringify(entry)}\n`);
  return entry;
};

export const verifyChain = async () => {
  const chain = await readChain();
  const problems: string[] = [];
  let previous = 'genesis';

  for (const entry of chain) {
    const { hash, ...body } = entry;

    if (body.previous !== previous) problems.push(`${entry.phase}: previous link ${body.previous} ≠ ${previous}`);
    if (sha256(JSON.stringify(body)) !== hash) problems.push(`${entry.phase}: entry hash mismatch`);

    for (const { file, sha256: expected } of entry.files) {
      if (!(await fs.pathExists(file))) problems.push(`${entry.phase}: ${file} missing`);
      else if ((await fileSha256(file)) !== expected) problems.push(`${entry.phase}: ${file} changed`);
    }

    previous = hash;
  }

  return { entries: chain.length, head: previous, problems };
};
