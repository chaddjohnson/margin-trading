// The study's commands: `npm run diverse-d1 -- <command> [options]`, in the order of PROTOCOL.md §20. See
// research/d1-diverse-pool-discovery/README.md for the runbook.
import { type FoldKey, type WindowKey, log, option } from './context.ts';

type Handler = (args: string[]) => Promise<unknown>;

const windowOf = (args: string[]): WindowKey => {
  const window = option(args, 'window');

  if (window !== 'fold-a' && window !== 'fold-b' && window !== 'final') {
    throw new Error('--window fold-a|fold-b|final');
  }

  return window;
};

const foldOf = (args: string[]): FoldKey => {
  const fold = option(args, 'fold');

  if (fold !== 'fold-a' && fold !== 'fold-b') {
    throw new Error('--fold fold-a|fold-b');
  }

  return fold;
};

const commands: Record<string, () => Promise<Handler>> = {
  'commit-design': async () => async () => (await import('./stages.ts')).runCommitDesign(),
  change: async () => (await import('./stages.ts')).runChange,
  'legacy-check': async () => async () => (await import('./legacy.ts')).runLegacyCheck(),
  audit: async () => async () => (await import('./audit.ts')).runAudit(),
  benchmark: async () => async () => (await import('./benchmark.ts')).runBenchmark(),
  reproduce: async () => async () => (await import('./reproduce.ts')).runReproduce(),
  parity: async () => async () => (await import('./parity.ts')).runParity(),
  'freeze-protocol': async () => async () => (await import('./stages.ts')).runFreezeProtocol(),
  amend: async () => (await import('./stages.ts')).runAmend,
  controls: async () => async (args) => (await import('./controls.ts')).runControls(windowOf(args)),
  search: async () => async (args) => (await import('./round.ts')).runSearch(windowOf(args)),
  select: async () => async (args) => (await import('./round.ts')).runSelect(windowOf(args)),
  validate: async () => async (args) => (await import('./walkforward.ts')).runValidation(foldOf(args)),
  'procedure-gate': async () => async () => (await import('./walkforward.ts')).runProcedureGate(),
  determinism: async () => async () => (await import('./stages.ts')).runDeterminism(),
  'freeze-selection': async () => async () => (await import('./final.ts')).runFreezeSelection(),
  'confirm-b': async () => async () => (await import('./final.ts')).runConfirmB(),
  evaluate: async () => async (args) => (await import('./final.ts')).runEvaluate(args.includes('--confirm')),
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
