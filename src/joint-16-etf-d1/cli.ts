// The study's commands: `npm run joint-16-etf-d1 -- <command> [options]`. See research/joint-16-etf-d1/README.md for
// the runbook, in order.
import { log } from './context.ts';
import { freezeProtocol } from './freeze.ts';

type Handler = (args: string[]) => Promise<void>;

const commands: Record<string, () => Promise<Handler>> = {
  'freeze-protocol': async () => async () => {
    await freezeProtocol();
  },
  audit: async () => (await import('./audit.ts')).runAudit,
  controls: async () => (await import('./controls.ts')).runControls,
  parity: async () => async () => {
    await (await import('./stages.ts')).runParityStage();
  },
  search: async () => (await import('./search.ts')).runSearch,
  determinism: async () => (await import('./search.ts')).runDeterminism,
  diagnostics: async () => async () => {
    await (await import('./diagnostics.ts')).runDiagnostics();
  },
  'freeze-selection': async () => async () => {
    await (await import('./selection.ts')).freezeSelection();
  },
  evaluate: async () => (await import('./evaluation.ts')).runEvaluation,
  run: async () => (await import('./evaluation.ts')).runFrozenConfiguration,
  tables: async () => async () => {
    await (await import('./report.ts')).writeTables();
  }
};

export const run = async (args: string[]) => {
  const [command, ...rest] = args;
  const load = command ? commands[command] : undefined;

  if (!load) {
    throw new Error(`Unknown command ${command ?? '(none)'}; commands: ${Object.keys(commands).join(', ')}`);
  }

  const started = Date.now();

  await (
    await load()
  )(rest);
  log(`${command} done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
};
