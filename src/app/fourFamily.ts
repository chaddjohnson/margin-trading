// Four-family trailing-buy optimization. See research/trailing-buy-four-family-optimization/README.md.
//
//   npm run four-family -- <command> [options]
//   npm run app -- fourFamily <command> [options]   (same, after lint and type checks)
import { runCli } from '../four-family/cli.ts';

export default async (...args: string[]) => {
  await runCli(args);
};
