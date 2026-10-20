// VGT trailing-buy strategy variants program. See research/trailing-buy-variants/README.md.
//
//   npm run trailing-buy-variants -- <command> [options]
import { runCli } from '../trailing-buy-variants/cli.ts';

export default async (...args: string[]) => {
  await runCli(args);
};
