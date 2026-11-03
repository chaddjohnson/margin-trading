// The D1-refinement research program: `npm run d1-refinement -- <command>`.
import { run } from '../d1-refinement/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
