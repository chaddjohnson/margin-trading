// Writes a `strategy-lab.phenotype-export` directory (phenotypes.json + MANIFEST.json, shared/phenotypes.ts): the
// format any Claude/CLI study emits for its SELECTED phenotypes. Each record gets its recordSha256; the manifest the
// sha256 of every file. Refuses an existing directory (exports are write-once).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PHENOTYPE_MANIFEST_SCHEMA,
  type PhenotypeExport,
  type PhenotypeRecord,
  canonicalJson,
  exportShapeErrors
} from '../shared/phenotypes.ts';

const sha = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

export function sealRecord(r: Omit<PhenotypeRecord, 'recordSha256'>): PhenotypeRecord {
  return { ...r, recordSha256: sha(canonicalJson(r)) };
}

export function writePhenotypeExport(dir: string, exp: PhenotypeExport) {
  if (existsSync(dir)) throw new Error(`${dir} exists: an export is written once`);
  const errors = exportShapeErrors(exp);
  if (errors.length) throw new Error(errors.join('; '));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'phenotypes.json'), `${JSON.stringify(exp, null, 2)}\n`);
  const manifest = {
    schema: PHENOTYPE_MANIFEST_SCHEMA,
    schemaVersion: 1,
    files: { 'phenotypes.json': sha(readFileSync(join(dir, 'phenotypes.json'))) }
  };
  writeFileSync(join(dir, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
