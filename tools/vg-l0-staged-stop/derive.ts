// Writes src/vg-l0-staged-stop/search.ts from Stage B's lane by the declared substitutions (src/vg-l0-staged-stop/derive.ts).
//   node --no-maglev --experimental-transform-types tools/vg-l0-staged-stop/derive.ts
import fs from 'node:fs';
import { deriveSearchFromDisk, derivedSearchFile } from '../../src/vg-l0-staged-stop/derive.ts';

fs.writeFileSync(derivedSearchFile, deriveSearchFromDisk());
console.log(`wrote ${derivedSearchFile}`);
