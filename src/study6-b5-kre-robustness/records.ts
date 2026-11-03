// Write-once sealed stage records ({ ...body, bodyHash }), CSV/JSONL tables, the code digest of this namespace and the
// stage gates of PROTOCOL.md §9.
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { codeDir, diagnosticManifestFile, parityFile, protocolFile, protocolFreezeFile } from './context.ts';
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
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists (stage tables are write-once)`);
  }

  await fs.outputFile(file, rows.map((row) => json(row).replace(/\n\s*/g, '')).join('\n') + (rows.length ? '\n' : ''));

  return { file, rows: rows.length, fileSha256: sha256(await fs.readFile(file)) };
};

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  const text = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : String(value)) : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const writeCsv = async (file: string, rows: readonly Record<string, unknown>[]) => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists (stage tables are write-once)`);
  }

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const text = [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join(
    '\n'
  );

  await fs.outputFile(file, `${text}\n`);

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

export const log = (line: string) => console.info(`[study6 ${new Date().toISOString().slice(11, 19)}] ${line}`);

export const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();

// §9 stage gates
export const requireProtocolFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error('the protocol is not frozen (npm run study6 -- freeze-protocol)');
  }

  await readSealed(protocolFreezeFile);
};

export const requireParity = async () => {
  await requireProtocolFrozen();

  const record = await readSealed<{ passed: Record<string, boolean> }>(parityFile);

  for (const gate of ['P1', 'P3', 'P5'] as const) {
    if (record.passed[gate] !== true) {
      throw new Error(`parity gate ${gate} did not pass (${parityFile}); Part A refuses to run`);
    }
  }
};

export const requirePartAOpen = async () => {
  await requireParity();

  if (await fs.pathExists(diagnosticManifestFile)) {
    throw new Error('the diagnostic checkpoint is sealed; Part A stages refuse to re-run');
  }
};

export const requireDiagnosticCommitted = async () => {
  await requireProtocolFrozen();

  if (!(await fs.pathExists(diagnosticManifestFile))) {
    throw new Error('Part B refuses to run before the diagnostic checkpoint (npm run study6 -- diagnostic-freeze)');
  }

  const manifest = await readSealed<{ bodyHash: string }>(diagnosticManifestFile);
  const tracked = git(`ls-files ${diagnosticManifestFile}`);

  if (!tracked) {
    throw new Error(`${diagnosticManifestFile} is not committed; commit the diagnostic checkpoint before Part B`);
  }

  const committed = JSON.parse(git(`show HEAD:${diagnosticManifestFile}`)) as { bodyHash: string };

  if (committed.bodyHash !== manifest.bodyHash) {
    throw new Error(`${diagnosticManifestFile} differs from its committed version`);
  }

  return manifest;
};

export const protocolSha256 = async () => fileSha256(protocolFile);
