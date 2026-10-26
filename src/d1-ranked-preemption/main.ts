// The study's entry point (`npm run ranked-preemption -- <command> …`). It lives outside src/app/ on purpose: a new
// src/app/ entry point would need a registry line in src/phenotype/strategies.ts, a file bound by the prospective
// B4/B5 freeze. The script loads no .env file: no credential is read, nothing is downloaded, no broker is contacted.
import { runCli } from './cli.ts';

runCli(process.argv.slice(2)).catch((error: unknown) => {
  console.error(`❌ ${(error as Error)?.stack ?? String(error)}`);
  process.exit(1);
});
