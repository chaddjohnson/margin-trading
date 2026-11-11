// Import FIRST in a test file that loads research engine modules (src/…): they resolve repository-relative files such as
// config/archive/legacy-research-inputs.json at import time, like the runners, which the server starts with cwd = the
// repository root. ES modules evaluate in import order, so this runs before them; the previous cwd is restored after
// the file's tests.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll } from 'vitest';

const before = process.cwd();
process.chdir(join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..'));
afterAll(() => process.chdir(before));
