// Named D1 shared-pool configurations (config/pools/), their prospective shadow comparison and the research-only
// archives: `npm run pools -- <command>` (src/pools/cli.ts, docs/pools/README.md).
import { run } from '../pools/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
