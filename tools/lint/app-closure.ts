// The lint gate of `npm run app` (its `preapp` script): ESLint over exactly the source files the app command can execute —
// the static import closure of src/app.ts, of every script it can load (src/app/<script>.ts, imported dynamically by name)
// and of the phenotype CLI — with the repository's own ESLint configuration (eslint.config.js). Repository-wide linting
// stays available as `npx eslint`; this gate only scopes the pre-run check to the code being run, so frozen research
// code the app never loads (whose sealed records pin its bytes, e.g. Study 7's search) cannot block the command.
//
//   node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/lint/app-closure.ts [--list]
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const seeds = ['src/app.ts', 'src/phenotype/cli.ts', ...readdirSync(join(root, 'src/app')).filter((f) => f.endsWith('.ts')).map((f) => `src/app/${f}`)];
// static `import … from './x.ts'`, `export … from './x.ts'` and literal dynamic `import('./x.ts')`
const IMPORT = /(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g;

const closure = new Set<string>();
const stack = [...seeds];
while (stack.length) {
  const file = stack.pop()!;
  if (closure.has(file) || !existsSync(join(root, file))) continue;
  closure.add(file);
  for (const m of readFileSync(join(root, file), 'utf8').matchAll(IMPORT)) {
    const target = normalize(join(dirname(file), m[1] ?? m[2]!));
    if (existsSync(join(root, target))) stack.push(target);
  }
}
const files = [...closure].filter((f) => /\.(ts|tsx|js|mjs)$/.test(f)).sort();
if (process.argv.includes('--list')) {
  console.log(files.join('\n'));
  process.exit(0);
}

const eslint = new ESLint({ cwd: root });
const results = await eslint.lintFiles(files);
const formatter = await eslint.loadFormatter('stylish');
const errors = results.reduce((n, r) => n + r.errorCount, 0);
const warnings = results.reduce((n, r) => n + r.warningCount, 0);
const text = await formatter.format(results.filter((r) => r.errorCount > 0));
if (text) console.error(text);
console.log(`lint (npm run app closure): ${files.length} files, ${errors} errors, ${warnings} warnings${relative(root, process.cwd()) ? '' : ''}`);
process.exitCode = errors > 0 ? 1 : 0;
