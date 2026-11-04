// Installs Strategy Lab as a systemd user service on this machine (apollo):
//   npm --prefix apps/strategy-lab run service:install            writes ~/.config/systemd/user/strategy-lab.service
//   npm --prefix apps/strategy-lab run service:install -- --enable  also builds the UI and enables + starts it
// The unit pins this Node binary and this checkout's path. Nothing is enabled without --enable.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const unit = readFileSync(join(app, 'deploy', 'strategy-lab.service.template'), 'utf8')
  .replaceAll('@APP_DIR@', app)
  .replaceAll('@NODE@', process.execPath);
const target = join(homedir(), '.config', 'systemd', 'user', 'strategy-lab.service');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, unit);
console.log(`wrote ${target} (node ${process.execPath})`);
if (process.argv.includes('--enable')) {
  execFileSync('npx', ['vite', 'build'], { cwd: app, stdio: 'inherit' });
  execFileSync('systemctl', ['--user', 'daemon-reload'], { stdio: 'inherit' });
  execFileSync('systemctl', ['--user', 'enable', '--now', 'strategy-lab.service'], { stdio: 'inherit' });
  console.log('enabled and started: systemctl --user status strategy-lab');
} else {
  console.log('next: systemctl --user daemon-reload && systemctl --user enable --now strategy-lab.service');
}
