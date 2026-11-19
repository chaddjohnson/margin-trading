// Runs Growth request files through the real Strategy Lab service and runner in a NEW scratch state directory (never the
// live state), then writes each run's research bundle (the same ZIP as "Export research bundle") into an output
// directory. For reproducible evidence of a configuration without touching the user's runs.
//
//   npm --prefix apps/strategy-lab run export-requests -- --out <dir> <request.json> [<request.json> …]
//
// Each request is the `request.json` shape (strategyKey, strategyVersion, params, symbols, from, to, resolution; a
// runId is ignored). Paths resolve against the directory the command was typed in (INIT_CWD). One configuration per
// request, one run each — no grid, no search.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';

import { loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { buildResearchBundle } from '../server/export.ts';
import { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import type { LabRunRequest } from '../shared/contract.ts';

const base = process.env.INIT_CWD ?? process.cwd();
const at = (p: string) => (isAbsolute(p) ? p : resolve(base, p));
const args = process.argv.slice(2);
const i = args.indexOf('--out');
if (i < 0 || !args[i + 1]) throw new Error('usage: export-requests.ts --out <dir> <request.json> [...]');
const out = at(args[i + 1]!);
const files = args.filter((_, k) => k !== i && k !== i + 1).map(at);
if (!files.length) throw new Error('no request file given');

const state = mkdtempSync(join(tmpdir(), 'strategy-lab-export-requests-'));
const cfg = loadConfig({ STRATEGY_LAB_STATE_DIR: state, STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
const repo = new Repo(openDb(cfg.dbFile));
const service = new LabService(repo, cfg, new Jobs(repo, cfg), new MarketPrices(cfg.repoRoot));
mkdirSync(out, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const file of files) {
  const request = JSON.parse(readFileSync(file, 'utf8')) as LabRunRequest & { runId?: string };
  delete request.runId;
  const name = basename(file).replace(/\.json$/, '');
  const r = service.createManualRun({ ...request, title: name });
  if ('errors' in r) throw new Error(`${name}: ${r.errors.join('; ')}`);
  for (;;) {
    const d = repo.runDetail(r.runId)!;
    if (d.status === 'failed') throw new Error(`${name}: the run failed: ${d.error}`);
    if (d.status === 'completed') break;
    await sleep(250);
  }
  const bundle = buildResearchBundle(cfg, repo, r.runId);
  writeFileSync(join(out, `${name}.zip`), bundle.zip);
  console.error(`${name}: ${r.runId} → ${join(out, `${name}.zip`)} (${bundle.zip.length} bytes)`);
}
repo.db.close();
console.error(`scratch state (safe to delete): ${state}`);
