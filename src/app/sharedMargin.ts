// The shared-margin portfolio research program: `npm run shared-margin -- <command>`.
import { run } from '../shared-margin-portfolio/cli.ts';

export default async (...args: string[]) => {
  await run(args);
};
