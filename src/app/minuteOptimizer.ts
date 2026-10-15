// VGT minute optimizer for the one-minute allIn strategy. See research/vgt-minute-optimizer/README.md.
//
//   npm run minute-optimizer -- <command> [options]
//   npm run app -- minuteOptimizer <command> [options]   (same, after lint and type checks)
import { runCli } from '../minute-optimizer/cli.ts';

export default async (...args: string[]) => {
  await runCli(args);
};
