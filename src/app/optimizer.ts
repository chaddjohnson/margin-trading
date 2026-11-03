// Multi-asset optimizer for the daily allIn strategy. See research/multi-asset-optimizer/README.md.
//
//   npm run optimizer -- <command> [options]
//   npm run app -- optimizer <command> [options]   (same, after lint and type checks)
import { runCli } from '../optimizer/cli.ts';

export default async (...args: string[]) => {
  await runCli(args);
};
