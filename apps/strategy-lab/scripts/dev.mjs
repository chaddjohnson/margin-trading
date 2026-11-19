// Development: the API server (port 4317, loopback) and the Vite dev server (port 5174, proxying /api) together.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const children = [
  spawn('npm', ['run', 'serve'], { cwd: root, stdio: 'inherit', env: { ...process.env, STRATEGY_LAB_STATIC_DIR: '' } }),
  spawn('npx', ['vite'], { cwd: root, stdio: 'inherit' })
];
const stop = () => children.forEach((c) => c.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const c of children) c.on('exit', stop);
