// The study's commands: `npm run portfolio-aware-d1 -- <command> [options]`. See
// research/portfolio-aware-d1-optimization/README.md for the runbook, in order.
import { freezeProtocol } from './freeze.ts';

type Handler = (args: string[]) => Promise<void>;

const commands: Record<string, () => Promise<Handler>> = {
  'freeze-protocol': async () => async () => {
    await freezeProtocol();
  },
  audit: async () => (await import('./audit.ts')).runAudit,
  controls: async () => (await import('./controls.ts')).runControls,
  parity: async () => (await import('./parity.ts')).runParity,
  'stage-a': async () => async () => {
    const stageA = await import('./stageA.ts');

    await stageA.runStageAPool();
    await stageA.selectFinalists();
  },
  'select-finalists': async () => async () => {
    await (await import('./stageA.ts')).selectFinalists();
  },
  'opportunity-map': async () => async () => {
    await (await import('./opportunity.ts')).runOpportunityMap();
  },
  'stage-b': async () => (await import('./stageB.ts')).runStageB,
  'stage-c': async () => async () => {
    await (await import('./stageC.ts')).runStageC();
  },
  'freeze-selection': async () => async () => {
    await (await import('./selection.ts')).freezeSelection();
  },
  evaluate: async () => (await import('./evaluation.ts')).runEvaluation,
  run: async () => (await import('./evaluation.ts')).runFrozenConfiguration,
  'post-hoc': async () => async () => {
    await (await import('./evaluation.ts')).runPostHoc();
  },
  tables: async () => async (args: string[]) => {
    await (await import('./report.ts')).writeTables(args.length ? args : ['stage-a', 'opportunity']);
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
  console.info(`[portfolio-aware-d1] ${command} done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
};
