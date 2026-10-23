// The multi-ETF D1 allocator research program: `npm run multi-etf-allocator -- <command>`.
import { run } from '../multi-etf-allocator/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
