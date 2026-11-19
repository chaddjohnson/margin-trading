// The e2e server: a fresh state directory (temporary), the synthetic demo and the synthetic trade-colour fixture
// seeded, the latest local Study 8 vg-balanced runner output imported (when present), the three phenotype fixture
// exports imported into the catalogue (Growth 1.1.0 demo, Study 8, Growth 1.2.0 entry-gate demo), then the real server
// on port 5299 serving the built UI.
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { importPhenotypes } from '../importers/phenotypes.ts';
import { importStudy8 } from '../importers/study8.ts';
import { loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { start } from '../server/main.ts';
import { Repo } from '../server/repo.ts';
import { seedDemo } from '../server/seed-demo.ts';
import { seedTradeColourFixture } from './trade-colour-fixture.ts';

const env = {
  ...process.env,
  STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-e2e-')),
  STRATEGY_LAB_PORT: '5299'
};
const cfg = loadConfig(env);
const db = openDb(cfg.dbFile);
const repo = new Repo(db);
seedDemo(repo, cfg);
seedTradeColourFixture(repo, cfg); // test-only synthetic trades (incl. an exactly breakeven one), temporary state only
const dir = join(REPO_ROOT, 'state/strategy-lab/imports/study8');
const latest = existsSync(dir)
  ? readdirSync(dir)
      .filter((d) => d.endsWith('-s8-vg-balanced'))
      .sort()
      .at(-1)
  : undefined;
if (latest) console.log(JSON.stringify(importStudy8(cfg, repo, join(dir, latest))));
for (const exp of ['growth-demo-2026-11', 'study8-expanded-regime-d1', 'growth-gates-demo-2026-11'])
  console.log(JSON.stringify(importPhenotypes(cfg, repo, join(REPO_ROOT, 'apps/strategy-lab/fixtures/phenotypes', exp))));
db.close();
start(env);
