// Writes src/vg-l0-risk-envelope-pilot/search.ts from Assignment 3's frozen search.ts and the declared substitutions
// (src/vg-l0-risk-envelope-pilot/derive.ts). Before the protocol freeze only; tests/derive.test.ts keeps it honest.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { deriveSearchFromDisk, derivedSearchFile, frozenSearchFile, substitutions } from '../../src/vg-l0-risk-envelope-pilot/derive.ts';

const text = deriveSearchFromDisk();
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');

fs.writeFileSync(derivedSearchFile, text);
console.log(
  JSON.stringify({
    frozen: { file: frozenSearchFile, sha256: sha(fs.readFileSync(frozenSearchFile)) },
    derived: { file: derivedSearchFile, sha256: sha(text) },
    substitutions: substitutions.length
  })
);
