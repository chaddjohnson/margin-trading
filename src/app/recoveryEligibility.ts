// The recovery-eligibility research program: `npm run recovery-eligibility -- <command>`.
import { run } from '../recovery-eligibility/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
