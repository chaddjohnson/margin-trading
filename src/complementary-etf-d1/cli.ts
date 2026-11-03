// The study's commands: `npm run complementary-etf-d1 -- <command> [options]`. See research/complementary-etf-d1/README.md.
import { runAudit } from './audit.ts';
import { runDiagnose } from './diagnose.ts';
import { freezeCandidates, freezeProtocol } from './freeze.ts';
import { runParity } from './parity.ts';
import { runRegression } from './regression.ts';
import { runScreen } from './screen.ts';
import { runStageC } from './stageC.ts';

const commands: Record<string, (args: string[]) => Promise<void>> = {
  audit: async () => {
    await runAudit();
  },
  'freeze-protocol': async () => {
    await freezeProtocol();
  },
  screen: async () => {
    await runScreen();
  },
  diagnose: async () => {
    await runDiagnose();
  },
  parity: async () => {
    await runParity();
  },
  regression: async () => {
    await runRegression();
  },
  'freeze-candidates': async () => {
    await freezeCandidates();
  },
  'stage-c': async () => {
    await runStageC();
  }
};

export const run = async (args: string[]) => {
  const [command, ...rest] = args;
  const handler = command ? commands[command] : undefined;

  if (!handler) {
    throw new Error(`Unknown command ${command ?? '(none)'}; commands: ${Object.keys(commands).join(', ')}`);
  }

  await handler(rest);
};
