// Write-once sealed stage records ({ ...body, bodyHash }), CSV/JSONL tables, the code digest of this namespace, the
// logger and the stage gates of PROTOCOL.md §11.
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { readSealed, writeCsv, writeJsonl, writeSealed } from '../study6-b5-kre-robustness/records.ts';
import { codeDir, protocolFile } from './context.ts';
import { sha256 } from '../study5-gdx-b5-three-etf/data.ts';

export { readSealed, writeCsv, writeJsonl, writeSealed };

export const nowIso = () => new Date().toISOString();

export const fileSha256 = async (file: string) => sha256(await fs.readFile(file));

export const codeDigest = async () => {
  const files = (await fs.readdir(codeDir, { recursive: true }))
    .map(String)
    .filter((name) => name.endsWith('.ts'))
    .sort();
  const hashes: Record<string, string> = {};

  for (const name of files) {
    hashes[path.join(codeDir, name)] = await fileSha256(path.join(codeDir, name));
  }

  return { digest: sha256(JSON.stringify(hashes)), files: hashes };
};

let tag = 'study7';

export const setLogTag = (value: string) => {
  tag = value;
};

export const log = (line: string) => console.info(`[${tag} ${new Date().toISOString().slice(11, 19)}Z] ${line}`);

export const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();

export const protocolSha256 = async () => fileSha256(protocolFile);

export const requireSealed = async (file: string, what: string) => {
  if (!(await fs.pathExists(file))) {
    throw new Error(`${what} (${file}) does not exist`);
  }

  return readSealed(file);
};

// A JSON replacer that keeps non-finite numbers readable.
export const jsonText = (value: unknown, space = 1) =>
  JSON.stringify(value, (_key, item) => (typeof item === 'number' && !Number.isFinite(item) ? String(item) : item), space);
