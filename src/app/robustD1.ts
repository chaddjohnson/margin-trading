// The robust D1 pool-discovery study: `npm run robust-d1 -- <command>`.
import { run } from '../d1-robust/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
