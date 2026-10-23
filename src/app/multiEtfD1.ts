// The eight-ETF D1 parameter research program: `npm run multi-etf-d1 -- <command>`.
import { run } from '../multi-etf-d1/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
