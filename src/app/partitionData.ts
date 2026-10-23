import { runPartitionCli } from '../data-partition/cli.ts';

// Run with `npm run partition-data -- [SYMBOL ...] [--replace] [--keep-source]`, or `npm run partition-data --
// verify [SYMBOL ...]`; see src/data-partition/cli.ts and the README.
export default async (...args: string[]) => {
  if (!(await runPartitionCli(args))) {
    process.exitCode = 1;
  }
};
