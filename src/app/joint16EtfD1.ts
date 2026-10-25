// The joint 16-ETF D1 study: `npm run joint-16-etf-d1 -- <command>`.
import { run } from '../joint-16-etf-d1/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
