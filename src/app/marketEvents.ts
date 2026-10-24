import { runMarketEventsCli } from '../market-events/cli.ts';

// Run with `npm run market-events -- update [--offline <snapshot dir>]` or `npm run market-events -- verify`; see
// src/market-events/cli.ts and the README.
export default async (...args: string[]) => {
  if (!(await runMarketEventsCli(args))) {
    process.exitCode = 1;
  }
};
