import { runDatasetsCli } from '../data-partition/cli.ts';

// Run with `npm run datasets -- migrate [SYMBOL ...] [--dry-run]`, `npm run datasets -- verify [SYMBOL ...]`,
// `npm run datasets -- import SYMBOL ... [--replace] [--keep-source]` or `npm run datasets -- config`; see
// src/data-partition/cli.ts and the README.
export default async (...args: string[]) => {
  if (!(await runDatasetsCli(args))) {
    process.exitCode = 1;
  }
};
