// Writes the research bundle of a completed run to a file (the same bundle as the UI's "Export research bundle"):
//
//   node --experimental-transform-types apps/strategy-lab/scripts/export-run.ts R-000042 [--minute] [--out file.zip] [--state DIR]
//
// Read-only towards the state directory (it opens the database without migrating it). Default output:
// ./strategy-lab-R-000042.zip; an existing file is refused.

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { loadConfig } from '../server/config.ts';
import { buildResearchBundle } from '../server/export.ts';
import { Repo } from '../server/repo.ts';

const args = process.argv.slice(2);
const runId = args.find((a) => /^R-\d{6,12}$/.test(a));
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!runId) {
  console.error('usage: export-run.ts R-xxxxxx [--minute] [--out file.zip] [--state DIR]');
  process.exit(2);
}
const here = process.env.INIT_CWD ?? process.cwd(); // npm --prefix runs scripts in the package directory
const env = opt('--state') ? { ...process.env, STRATEGY_LAB_STATE_DIR: resolve(here, opt('--state')!) } : process.env;
const cfg = loadConfig(env);
const db = new DatabaseSync(cfg.dbFile, { readOnly: true });
const bundle = buildResearchBundle(cfg, new Repo(db), runId, { minuteMarks: args.includes('--minute') });
const out = resolve(here, opt('--out') ?? bundle.filename);
if (existsSync(out)) {
  console.error(`${out} exists: choose another --out`);
  process.exit(2);
}
writeFileSync(out, bundle.zip);
console.log(`${out}: ${bundle.zip.length.toLocaleString('en-US')} bytes, ${Object.keys(bundle.manifest.files as object).length} files`);
db.close();
