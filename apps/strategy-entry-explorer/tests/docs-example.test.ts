import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildModel } from '../src/data/model.ts';
import { validateDataset } from '../src/schema/validate.ts';

const doc = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'research',
  'growth-entry-discovery',
  'ENTRY_EXPLORER.md'
);

describe('ENTRY_EXPLORER.md minimal example', () => {
  it('is a valid schema-v1 dataset whose events align exactly', () => {
    const text = readFileSync(doc, 'utf8');
    const block = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)]
      .map((m) => m[1]!)
      .find((b) => b.includes('"example-minimal"'));
    expect(block).toBeDefined();
    const r = validateDataset(JSON.parse(block!));
    expect(r.ok ? [] : r.errors).toEqual([]);
    if (r.ok) expect(buildModel(r.dataset).alignment.unaligned).toEqual([]);
  });
});
