// Writes src/gdx-d1-growth/search.ts from the lane Priority 5 ran (src/vg-l0-risk-envelope-pilot/search.ts) and the
// declared substitutions (src/gdx-d1-growth/derive.ts). Before the protocol freeze only; tests/derive.test.ts keeps it
// honest.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { deriveSearchFromDisk, derivedSearchFile, sourceSearchFile, substitutions } from '../../src/gdx-d1-growth/derive.ts';

const text = deriveSearchFromDisk();
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');

fs.writeFileSync(derivedSearchFile, text);
console.log(
  JSON.stringify({
    source: { file: sourceSearchFile, sha256: sha(fs.readFileSync(sourceSearchFile)) },
    derived: { file: derivedSearchFile, sha256: sha(text) },
    substitutions: substitutions.length
  })
);
