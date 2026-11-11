// Build (or check) the pooled-candidate catalog from the authoritative research records.
//
//   node --experimental-transform-types apps/strategy-lab/scripts/build-candidate-catalog.ts [--check]
//   npm --prefix apps/strategy-lab run portfolio-catalog -- [--check]
//
// Run from the repository root. --check rebuilds in memory and fails unless the committed file is byte-identical.
// Reads research records only; writes nothing outside apps/strategy-lab/catalog/.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCatalog } from '../runner/portfolio-catalog.ts';
import { CATALOG_FILE, catalogText } from '../runner/portfolio-catalog-read.ts';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
const text = catalogText(buildCatalog(repoRoot));
const file = join(repoRoot, CATALOG_FILE);
if (process.argv.includes('--check')) {
  let committed = '';
  try {
    committed = readFileSync(file, 'utf8');
  } catch {
    // missing
  }
  if (committed !== text) {
    console.error(`${CATALOG_FILE} differs from the catalog rebuilt from the research records`);
    process.exitCode = 1;
  } else console.log(`${CATALOG_FILE}: identical to the rebuilt catalog`);
} else {
  writeFileSync(file, text);
  console.log(`wrote ${CATALOG_FILE} (${text.length} bytes)`);
}
