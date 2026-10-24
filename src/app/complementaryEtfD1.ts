// The complementary-ETF D1 study: `npm run complementary-etf-d1 -- <command>`.
import { run } from '../complementary-etf-d1/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
