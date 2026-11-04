// Prints where the API token is and whether it exists (never the token itself unless --print is given).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const stateDir = process.env.STRATEGY_LAB_STATE_DIR ?? 'state/strategy-lab';
const file =
  process.env.STRATEGY_LAB_TOKEN_FILE ?? join(isAbsolute(stateDir) ? stateDir : join(repo, stateDir), 'api-token');
if (!existsSync(file)) console.log(`no token file at ${file} (created on the first non-loopback start)`);
else if (process.argv.includes('--print')) console.log(readFileSync(file, 'utf8').trim());
else console.log(`token file: ${file} (print it with: npm --prefix apps/strategy-lab run token -- --print)`);
