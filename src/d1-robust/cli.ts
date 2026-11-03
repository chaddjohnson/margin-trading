// The study's commands: `npm run robust-d1 -- <command> [options]`. See research/d1-robust-pool-discovery/README.md
// for the runbook, in order (PROTOCOL.md §20). The retrospective runner is loaded only by its own command.
import { log } from './context.ts';

type Handler = (args: string[]) => Promise<unknown>;

const commands: Record<string, () => Promise<Handler>> = {
  'commit-draft': async () => async () => (await import('./freeze.ts')).commitDraft(),
  ingest: async () => (await import('./ingest.ts')).runIngest,
  audit: async () => async () => (await import('./audit.ts')).runAudit(),
  benchmark: async () => async () => (await import('./benchmark.ts')).runBenchmark(),
  'freeze-protocol': async () => (await import('./stages.ts')).runFreezeProtocol,
  amend: async () => (await import('./stages.ts')).runAmend,
  controls: async () => async () => (await import('./controls.ts')).runControls(),
  parity: async () => async () => (await import('./parity.ts')).runParity(),
  pilot: async () => (await import('./stages.ts')).runPilotCommand,
  walkforward: async () => (await import('./walkforward.ts')).runFold,
  validate: async () => (await import('./walkforward.ts')).runValidation,
  gwf: async () => async () => (await import('./walkforward.ts')).runGwf(),
  determinism: async () => async () => (await import('./stages.ts')).runDeterminism(),
  search: async () => async () => (await import('./final.ts')).runFinalSearch(),
  'freeze-selection': async () => async () => (await import('./final.ts')).runFreezeSelection(),
  'confirm-b': async () => async () => (await import('./final.ts')).runConfirmB(),
  evaluate: async () => (await import('./evaluation.ts')).runEvaluation,
  'research-run': async () => (await import('./retrospective.ts')).runResearchRun,
  tables: async () => async () => (await import('./report.ts')).writeTables()
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
