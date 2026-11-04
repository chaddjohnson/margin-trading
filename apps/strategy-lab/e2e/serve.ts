// The e2e server: a fresh state directory (temporary), the synthetic demo seeded, the latest local Study 8 vg-balanced
// runner output imported (when present), then the real server on port 5299 serving the built UI.
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { importStudy8 } from '../importers/study8.ts';
import { loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { start } from '../server/main.ts';
import { Repo } from '../server/repo.ts';
import { seedDemo } from '../server/seed-demo.ts';

const env = {
  ...process.env,
  STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-e2e-')),
  STRATEGY_LAB_PORT: '5299'
};
const cfg = loadConfig(env);
const db = openDb(cfg.dbFile);
const repo = new Repo(db);
seedDemo(repo, cfg);
const dir = join(REPO_ROOT, 'state/strategy-lab/imports/study8');
const latest = existsSync(dir)
  ? readdirSync(dir)
      .filter((d) => d.endsWith('-s8-vg-balanced'))
      .sort()
      .at(-1)
  : undefined;
if (latest) console.log(JSON.stringify(importStudy8(cfg, repo, join(dir, latest))));
db.close();
start(env);
