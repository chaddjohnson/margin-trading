// Builds the UI (vite build) when dist/ is missing or older than any file in src/ or shared/, so `npm start` serves the
// current code. Touches nothing outside this app.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const newest = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
    const p = join(dir, e.name);
    return Math.max(m, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }, 0);
const built = join(root, 'dist', 'index.html');
const source = Math.max(
  newest(join(root, 'src')),
  newest(join(root, 'shared')),
  statSync(join(root, 'index.html')).mtimeMs
);
if (!existsSync(built) || statSync(built).mtimeMs < source) {
  console.log('strategy-lab: building the UI (vite build) …');
  execSync('npx vite build', { cwd: root, stdio: 'inherit' });
}
