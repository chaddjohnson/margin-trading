// Strategy Lab server entry point:
//   node --experimental-transform-types apps/strategy-lab/server/main.ts      (or: npm --prefix apps/strategy-lab run serve)
// Configuration comes from the environment (server/config.ts, docs/strategy-lab/OPERATIONS.md).

import { createServer, type Server } from 'node:http';

import { loadConfig } from './config.ts';
import { openDb } from './db.ts';
import { createHandler } from './http.ts';
import { Jobs } from './jobs.ts';
import { MarketPrices } from './prices.ts';
import { Repo } from './repo.ts';
import { seedDemo } from './seed-demo.ts';
import { LabService } from './service.ts';

const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

export function start(env: NodeJS.ProcessEnv = process.env) {
  const cfg = loadConfig(env);
  const db = openDb(cfg.dbFile);
  const repo = new Repo(db);
  const prices = new MarketPrices(cfg.repoRoot, log);
  const jobs = new Jobs(repo, cfg, log);
  const service = new LabService(repo, cfg, jobs, prices);
  if (cfg.seedDemo) {
    const n = seedDemo(repo, cfg);
    if (n) log(`seeded the synthetic demo experiment (${n} runs)`);
  }
  jobs.recover();
  const handler = createHandler({ cfg, repo, jobs, prices, service, log });
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
    for (const s of servers) s.close();
    setTimeout(() => {
      db.close();
      process.exit(0);
    }, 300).unref();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return { cfg, db, repo, jobs, servers, stop };
}

if (import.meta.url === `file://${process.argv[1]}`) start();
