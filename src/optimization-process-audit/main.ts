// CLI: npm run opa -- <command> (from the repository root). Every substantive command runs the optimization-standard
// preflight in code before it does anything (PROTOCOL.md §0).
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { log, repoRoot, researchDir } from './context.ts';
import { verifySeals } from './records.ts';

const [command, ...args] = process.argv.slice(2);

const commands: Record<string, () => Promise<unknown> | unknown> = {
  freeze: async () => (await import('./freeze.ts')).runFreeze(),
  verify: () => {
    const v = verifySeals();

    if (v.failed.length) throw new Error(`sealed records failing verification: ${v.failed.join(', ')}`);
    log(`${v.ok} sealed record(s) verify`);
  },
  stage1: async () => (await import('./stage1.ts')).runStage1(args),
  stage2: async () => (await import('./stage2.ts')).runStage2(args),
  stage3: async () => (await import('./stage3.ts')).runStage3(args),
  stage4: async () => (await import('./stage4.ts')).runStage4(args)
};

const main = async () => {
  if (!command || !commands[command]) throw new Error(`usage: npm run opa -- <${Object.keys(commands).join('|')}> [args]`);
  requireStandardAdoption(researchDir, { repoRoot });
  await commands[command]();
};

main().then(
  () => process.exit(0),
  (error) => {
    if ((error as Error).constructor?.name === 'StopRequested') {
      log(`stopped (${(error as Error).message}); resume with the same command`);
      process.exit(75);
    }
    log(`FAILED: ${(error as Error).stack ?? error}`);
    process.exit(1);
  }
);
