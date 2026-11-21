// Strategy Lab server entry point:
//   node --no-maglev --experimental-transform-types apps/strategy-lab/server/main.ts   (or: npm --prefix apps/strategy-lab run serve)
// Configuration comes from the environment (server/config.ts, docs/strategy-lab/OPERATIONS.md).
//
// The engine runtime (GPU Phase 6): the server and every runner it starts evaluate with the canonical CPU engine, which
// V8's Maglev compiler can silently corrupt (research/gpu-phase5/PARITY_ROOT_CAUSE.md). start() refuses a process that
// was not started with `--no-maglev` (src/gpu-backend/runtime.ts); the runners get the flag through NODE_FLAGS
// (server/jobs.ts) and refuse without it as well.

import { createServer, type Server } from 'node:http';

import { requireEngineRuntime } from '../../../src/gpu-backend/runtime.ts';

import { loadConfig } from './config.ts';
import { openDb } from './db.ts';
import { recoverRunDeletions } from './delete-run.ts';
import { createHandler } from './http.ts';
import { Jobs } from './jobs.ts';
import { PortfolioService } from './portfolios.ts';
import { PreviewService } from './previews.ts';
import { MarketPrices } from './prices.ts';
import { Repo } from './repo.ts';
import { seedDemo } from './seed-demo.ts';
import { LabService } from './service.ts';

const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

export function start(env: NodeJS.ProcessEnv = process.env) {
  requireEngineRuntime('the Strategy Lab server');
  const cfg = loadConfig(env);
  const db = openDb(cfg.dbFile);
  const repo = new Repo(db);
  const prices = new MarketPrices(cfg.repoRoot, log);
  const jobs = new Jobs(repo, cfg, log);
  const service = new LabService(repo, cfg, jobs, prices);
  recoverRunDeletions(cfg, repo, log); // finish an interrupted run deletion before anything reads the state
  if (cfg.seedDemo) {
    const n = seedDemo(repo, cfg);
    if (n) log(`seeded the synthetic demo experiment (${n} runs)`);
  }
  jobs.recover();
  const previews = new PreviewService(cfg, repo, service, log);
  previews.init(); // the preview cache: interrupted work removed; entries validated when used
  const portfolios = new PortfolioService(cfg, log);
  portfolios.init(); // the pooled-candidate replay cache: interrupted work removed; entries validated when used
  const handler = createHandler({ cfg, repo, jobs, prices, service, previews, portfolios, log });
  const servers: Server[] = cfg.hosts.map((host) => {
    const s = createServer((req, res) => void handler(req, res));
    s.requestTimeout = 120_000;
    s.listen(cfg.port, host, () =>
      log(`Strategy Lab listening on http://${host.includes(':') ? `[${host}]` : host}:${cfg.port}`)
    );
    return s;
  });
  log(
    `database ${cfg.dbFile}; state ${cfg.stateDir}; UI ${cfg.staticDir ?? '(not built)'}; token ${cfg.token ? `required (${cfg.tokenFile})` : 'off (loopback only)'}`
  );
  const stop = () => {
    log('stopping');
    jobs.stopAll();
    previews.stop();
    portfolios.stop();
    for (const s of servers) s.close();
    setTimeout(() => {
      db.close();
      process.exit(0);
    }, 300).unref();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return { cfg, db, repo, jobs, previews, portfolios, servers, stop };
}

if (import.meta.url === `file://${process.argv[1]}`) start();
