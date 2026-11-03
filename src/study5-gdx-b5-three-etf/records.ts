// Write-once sealed stage records ({ ...body, bodyHash }), JSONL archives, and the code digest of this namespace.
import path from 'node:path';
import fs from 'fs-extra';
import { codeDir } from './context.ts';
import { sealBody, sha256, verifySealed } from './data.ts';

export const nowIso = () => new Date().toISOString();

const json = (value: unknown) =>
  JSON.stringify(value, (_key, item) => (typeof item === 'number' && !Number.isFinite(item) ? String(item) : item), 1);

export const writeSealed = async (file: string, body: Record<string, unknown>, { overwrite = false } = {}) => {
  if (!overwrite && (await fs.pathExists(file))) {
    throw new Error(`${file} exists (sealed records are write-once)`);
  }

  const sealed = sealBody(JSON.parse(json(body)) as Record<string, unknown>);

  await fs.outputFile(file, `${JSON.stringify(sealed, null, 1)}\n`);

  return { file, bodyHash: sealed.bodyHash, fileSha256: sha256(await fs.readFile(file)) };
};

export const readSealed = async <T = Record<string, unknown>>(file: string): Promise<T> => {
  const record = (await fs.readJson(file)) as Record<string, unknown>;

  if (!verifySealed(record)) {
    throw new Error(`${file}: the body hash does not verify`);
  }

  return record as T;
};

export const writeJsonl = async (file: string, rows: readonly unknown[]) => {
  await fs.outputFile(file, rows.map((row) => json(row).replace(/\n\s*/g, '')).join('\n') + (rows.length ? '\n' : ''));

  return { file, rows: rows.length, fileSha256: sha256(await fs.readFile(file)) };
};

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

export const log = (line: string) => console.info(`[study5 ${new Date().toISOString().slice(11, 19)}] ${line}`);
