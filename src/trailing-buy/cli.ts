// Command-line entry of the study. Each command writes its results under research/trailing-buy-entry/.
import fs from 'fs-extra';
import { resultsDir } from './constants.ts';
import { runPhase0 } from './phase0.ts';
import { runPhase1 } from './phase1.ts';
import { runPhase2 } from './phase2.ts';
import { runPhase3 } from './phase3.ts';
import { runPhase4 } from './phase4.ts';
import { runPrefreeze } from './prefreeze.ts';
import { writeFreeze } from './freeze.ts';
import { runHoldout } from './holdout.ts';
import { runEvents } from './events.ts';
import { exportReplayInputs } from './replayExport.ts';

// The Phase 0 gate: no later phase runs unless baseline parity was demonstrated.
export const requireParity = async () => {
  const file = `${resultsDir}/phase0/golden_master.json`;

  if (!(await fs.pathExists(file)) || !(await fs.readJson(file)).allIdentical) {
    throw new Error('Phase 0 parity has not passed; run the phase0 command first');
  }
};

const commands: Record<string, (...args: string[]) => Promise<unknown>> = {
  phase0: async () => {
    const result = await runPhase0();

    console.log(
      JSON.stringify(
        {
          dataset: result.manifest,
          golden: result.outcomes.map((outcome) => `${outcome.id}: ${outcome.identical ? 'identical' : 'DIFFERENT'}`),
          warmCold: result.warmCold
        },
        null,
        1
      )
    );

    if (!result.outcomes.every((outcome) => outcome.identical)) {
      throw new Error('Baseline parity failed: no later phase may run');
    }
  },
  phase2: async () => {
    await requireParity();
    console.log((await runPhase2()).tables);
  },
  phase3: async () => {
    await requireParity();
    console.log((await runPhase3()).tables);
  },
  phase4: async () => {
    await requireParity();

    // The ATR family is optimized only if it passed the Phase 3 continuation test (PROTOCOL.md section 8).
    const continuation = await fs.readJson(`${resultsDir}/phase3/continuation.json`);
    const families: ('legacy' | 'fixed' | 'atr')[] = continuation.continues
      ? ['legacy', 'fixed', 'atr']
      : ['legacy', 'fixed'];

    console.log((await runPhase4(families)).tables);
  },
  prefreeze: async () => {
    await requireParity();
    console.log((await runPrefreeze()).tables);
  },
  freeze: async () => {
    await requireParity();

    if (!(await fs.pathExists(`${resultsDir}/validation/development/walk_forward_scenarios.json`))) {
      throw new Error('Run prefreeze before the freeze');
    }

    const freeze = await writeFreeze();

    console.log(
      `Frozen ${freeze.types.length} candidate types and ${Object.values(freeze.shortlists).flat().length} shortlist members at ${freeze.frozenAtUtc}`
    );
  },
  holdout: async (...args: string[]) => {
    const flag = args.indexOf('--rerun-reason');

    console.log((await runHoldout(flag >= 0 ? args[flag + 1] : undefined)).tables);
  },
  events: async () => {
    console.log((await runEvents()).tables);
  },
  replayExport: async () => {
    console.log(`${await exportReplayInputs()} configurations exported`);
  },
  phase1: async () => {
    await requireParity();

    const { tables } = await runPhase1();

    console.log(tables);
  }
};

// Every development step in order (the freeze and the holdout are separate, deliberate commands).
commands.development = async () => {
  for (const name of ['phase0', 'phase1', 'phase2', 'phase3', 'phase4', 'prefreeze']) {
    console.error(`== ${name}`);
    await commands[name]!();
  }
};

export const main = async (command?: string, ...args: string[]) => {
  const run = command ? commands[command] : undefined;

  if (!run) {
    throw new Error(`Unknown command ${command}; expected one of ${Object.keys(commands).join(', ')}`);
  }

  await run(...args);
};
