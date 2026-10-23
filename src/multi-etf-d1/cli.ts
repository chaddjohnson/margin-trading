// The program's commands: `npm run multi-etf-d1 -- <command> [options]`. See research/multi-etf-d1/README.md.
import { runAudit } from './audit.ts';
import { runBenchmark, runParity, runProfile, showCandidate } from './baseline.ts';
import { runSearch } from './search.ts';
import { runFreeze } from './freeze.ts';
import { runHoldout } from './holdout.ts';
import { runReport } from './report.ts';

const commands: Record<string, (args: string[]) => Promise<void>> = {
  audit: async () => {
    await runAudit();
  },
  parity: async () => {
    await runParity();
  },
  benchmark: async (args) => {
    await runBenchmark(args);
  },
  profile: async (args) => {
    await runProfile(args);
  },
  search: runSearch,
  freeze: async () => {
    await runFreeze();
  },
  holdout: async (args) => {
    await runHoldout(args);
  },
  report: runReport,
  show: showCandidate
};

export const run = async (args: string[]) => {
  const [command, ...rest] = args;
  const handler = command ? commands[command] : undefined;

  if (!handler) {
    throw new Error(`Unknown command ${command ?? '(none)'}; commands: ${Object.keys(commands).join(', ')}`);
  }

  await handler(rest);
};
