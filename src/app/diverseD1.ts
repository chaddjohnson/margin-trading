// The diversity-preserving D1 pool-discovery study: `npm run diverse-d1 -- <command>`.
import { run } from '../d1-diverse/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
