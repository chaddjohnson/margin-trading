// The portfolio-aware D1 optimization study: `npm run portfolio-aware-d1 -- <command>`.
import { run } from '../portfolio-aware-d1/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
