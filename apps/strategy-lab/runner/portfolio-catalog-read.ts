// Reading the committed pooled-candidate catalog (catalog/pooled-candidates.json) with its per-entry sha256 check. Kept
// apart from portfolio-catalog.ts (which reads the research records to BUILD the catalog) so the replay runner and the
// server load only this small module and the JSON file.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { canonicalJson } from '../shared/preview.ts';
import { CATALOG_SCHEMA, CATALOG_VERSION, type CandidateCatalog, type CandidateEntry } from '../shared/portfolio.ts';

export const CATALOG_FILE = 'apps/strategy-lab/catalog/pooled-candidates.json';

export const sha256Of = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');

/** The catalog file's text (stable: two-space JSON, trailing newline). */
export const catalogText = (c: CandidateCatalog) => `${JSON.stringify(c, null, 2)}\n`;

/** The entry's own sha256: of the canonical JSON of every other field. */
export const entrySha256 = (e: Omit<CandidateEntry, 'entrySha256'> | CandidateEntry) => {
  const rest: Record<string, unknown> = { ...e };
  delete rest.entrySha256;
  return sha256Of(rest);
};

/** Read the committed catalog and check each entry's sha256. Fails closed. */
export function readCatalog(repoRoot: string, file = CATALOG_FILE): CandidateCatalog {
  const c = JSON.parse(readFileSync(join(repoRoot, file), 'utf8')) as CandidateCatalog;
  if (c.schema !== CATALOG_SCHEMA || c.version !== CATALOG_VERSION)
    throw new Error(`pooled-candidate catalog: unexpected ${String(c.schema)} v${String(c.version)}`);
  const ids = new Set<string>();
  for (const e of c.candidates) {
    if (ids.has(e.id)) throw new Error(`pooled-candidate catalog: duplicate id ${e.id}`);
    ids.add(e.id);
    if (entrySha256(e) !== e.entrySha256) throw new Error(`pooled-candidate catalog: entry ${e.id} does not match its sha256`);
  }
  return c;
}
