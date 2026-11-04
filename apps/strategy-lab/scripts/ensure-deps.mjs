// Installs the explorer's own dependencies (npm ci) when node_modules is missing or older than package-lock.json,
// so `npm --prefix apps/strategy-lab start` works from a fresh clone. Touches nothing outside this app.
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lock = join(root, 'package-lock.json');
const installed = join(root, 'node_modules', '.package-lock.json');

if (!existsSync(installed) || statSync(installed).mtimeMs < statSync(lock).mtimeMs) {
  console.log('strategy-lab: installing dependencies (npm ci) …');
  execSync('npm ci --no-audit --no-fund', { cwd: root, stdio: 'inherit' });
}
