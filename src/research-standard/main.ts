// The optimization-standard preflight command (docs/research/OPTIMIZATION_STANDARD.md §7), run from the repository root:
//
//   npm run research-preflight -- --study research/<study> [--json]   check one study's STANDARD_ADOPTION.json
//   npm run research-preflight -- --all [--json]                      check every research/*/STANDARD_ADOPTION.json
//   npm run research-preflight -- --registry                          check only the registry against the standard
//   npm run research-preflight -- --hash                              print the current standard's sha256 and version
//
// Exit status 0 when every check passes (notices are printed but do not fail), 1 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import {
  type Result,
  checkAdoption,
  checkRegistry,
  declaredVersion,
  manifestName,
  sha256File,
  standardPath
} from './preflight.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);
// npm runs scripts in the package directory; a user path is relative to where the command was typed
const cwd = process.env.INIT_CWD ?? process.cwd();

const print = (results: Result[]) => {
  if (flag('json')) {
    console.log(JSON.stringify(results, null, 1));
    return;
  }

  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.study} (standard ${r.version ?? '—'}, scope ${r.scope ?? '—'})`);
    for (const e of r.errors) console.log(`  error: ${e}`);
    for (const n of r.notices) console.log(`  notice: ${n}`);
  }
};

if (flag('hash')) {
  const file = path.join(repoRoot, standardPath);

  console.log(
    JSON.stringify({
      path: standardPath,
      version: declaredVersion(fs.readFileSync(file, 'utf8')),
      sha256: sha256File(file)
    })
  );
  process.exit(0);
}

if (flag('registry')) {
  const { errors } = checkRegistry(repoRoot);

  console.log(
    errors.length ? errors.map((e) => `error: ${e}`).join('\n') : `PASS ${standardPath} matches the registry`
  );
  process.exit(errors.length ? 1 : 0);
}

const studies = flag('all')
  ? fs
      .readdirSync(path.join(repoRoot, 'research'))
      .filter((d) => fs.existsSync(path.join(repoRoot, 'research', d, manifestName)))
      .map((d) => path.join(repoRoot, 'research', d))
  : opt('study')
    ? [path.resolve(cwd, opt('study')!)]
    : [];

if (studies.length === 0) {
  console.error('usage: research-preflight --study research/<study> | --all | --registry | --hash [--json]');
  process.exit(flag('all') ? 0 : 2);
}

const results = studies.map((s) => checkAdoption(s, { repoRoot }));

print(results);
process.exit(results.every((r) => r.ok) ? 0 : 1);
