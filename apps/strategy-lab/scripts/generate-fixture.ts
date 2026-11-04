// Regenerates the checked-in demo fixture (fixtures/demo-dataset.v1.json) from the deterministic generator.
// Usage: npm run generate:fixture            (writes the file)
//        npm run generate:fixture -- --check (exits 1 if the checked-in file differs from a fresh generation)

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateDemoDataset } from '../shared/demo/generate.ts';
import { stableStringify } from '../shared/demo/serialize.ts';
import { validateDataset } from '../shared/demo-schema/validate.ts';

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'demo-dataset.v1.json');
const dataset = generateDemoDataset();
const result = validateDataset(dataset);
if (!result.ok) {
  console.error('generated dataset is invalid:\n' + result.errors.join('\n'));
  process.exit(1);
}
const text = stableStringify(dataset);
const sha = createHash('sha256').update(text).digest('hex');

if (process.argv.includes('--check')) {
  const current = readFileSync(file, 'utf8');
  if (current !== text) {
    console.error(`fixture differs from a fresh generation (fresh sha256 ${sha})`);
    process.exit(1);
  }
  console.log(`fixture matches a fresh generation: sha256 ${sha}`);
} else {
  writeFileSync(file, text);
  const events = dataset.variations.reduce((n, v) => n + v.events.length, 0);
  console.log(
    `wrote ${file}\n  ${dataset.priceSeries.bars.length} bars, ${dataset.variations.length} variations, ${events} events`
  );
  console.log(`  ${text.length} bytes, sha256 ${sha}`);
}
