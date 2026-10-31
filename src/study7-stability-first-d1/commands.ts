// Stage commands (see main.ts and RUN_COMMANDS.md). Door preconditions are intrinsic to each door (gates.ts); the
// commands add their own write-once guards.
import fs from 'fs-extra';
import { type FoldKey, type TrackKey, folds, parityFile, tracks } from './context.ts';
import { protocolFrozen, requireParity, requireProtocolFrozen } from './gates.ts';
import { runSearch } from './search.ts';

const trackArg = (value: string | undefined): TrackKey => {
  if (!value || !(value in tracks)) throw new Error(`track must be one of ${Object.keys(tracks).join(', ')}`);
  return value as TrackKey;
};

const foldArg = (value: string | undefined): FoldKey => {
  if (!value || !(value in folds)) throw new Error(`fold must be one of ${Object.keys(folds).join(', ')}`);
  return value as FoldKey;
};

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const dispatch = async (command: string, args: string[]) => {
  switch (command) {
    case 'smoke-search': {
      // Pre-freeze engineering smoke test of the optimizer code path (tiny budget, the smoke-F19 door, output outside
      // results/; never research evidence).
      if (await protocolFrozen()) throw new Error('smoke-search is a pre-freeze engineering check only');

      const out = option(args, 'out');
      const cacheFile = option(args, 'cache');

      if (!out || !cacheFile) throw new Error('smoke-search needs --out <file> --cache <file> outside the study tree');

      await runSearch(trackArg(args[0]), 'F19', { mode: 'smoke', out, cacheFile, doorKey: 'smoke-F19' });
      break;
    }
    case 'parity': {
      await requireProtocolFrozen();

      if (await fs.pathExists(parityFile)) throw new Error(`${parityFile} exists (sealed); parity refuses to re-run`);

      const { runParity } = await import('./parity.ts');

      await runParity();
      break;
    }
    case 'restart-probe': {
      // D1 child process (parity only): a reduced-budget VG job on the parity-F19 door, optionally stopped early.
      const [, out, cacheFile, stop] = args;

      await runSearch(trackArg(args[0]), 'F19', {
        mode: 'smoke',
        out: out!,
        cacheFile: cacheFile!,
        doorKey: 'parity-F19',
        ...(stop ? { stopAfterPoints: Number(stop) } : {})
      });
      break;
    }
    case 'phase-a': {
      await requireParity();

      const { phaseAKeys, runPhaseA } = await import('./phaseA.ts');
      const key = args[0] as (typeof phaseAKeys)[number];

      if (!phaseAKeys.includes(key)) throw new Error(`Phase A key must be one of ${phaseAKeys.join(', ')}`);

      await runPhaseA(key, args[1] as 'WDEV' | 'W23' | 'W29');
      break;
    }
    case 'phase-a-freeze': {
      await requireParity();

      const { runPhaseAFreeze } = await import('./phaseA.ts');

      await runPhaseAFreeze();
      break;
    }
    case 'search': {
      const track = trackArg(args[0]);
      const fold = foldArg(args[1]);

      if (track === 'V' && fold !== 'M' && fold !== 'L') {
        throw new Error('the Track V diagnostic runs in folds M and L only (PROTOCOL.md §9.5)');
      }

      if (track === 'VC') {
        const { requireVTrigger } = await import('./vtrigger.ts');

        await requireVTrigger();
      }

      await runSearch(track, fold, { mode: track === 'V' ? 'diagnostic' : 'base' });
      break;
    }
    case 'v-trigger': {
      const { vTriggerOf } = await import('./vtrigger.ts');

      console.info(JSON.stringify(await vTriggerOf(), null, 1));
      break;
    }
    case 'validate': {
      const { runValidation } = await import('./validate.ts');

      await runValidation(trackArg(args[0]), foldArg(args[1]));
      break;
    }
    case 'freeze-selection': {
      const { runFreezeSelection } = await import('./select.ts');

      await runFreezeSelection();
      break;
    }
    case 'final': {
      const { runFinal } = await import('./final.ts');

      await runFinal({ confirm: args.includes('--confirm') });
      break;
    }
    case 'research-configs': {
      const { writeResearchConfigs } = await import('./poolrun.ts');

      await writeResearchConfigs();
      break;
    }
    case 'pool': {
      const { runResearchPool } = await import('./poolrun.ts');

      await runResearchPool(args);
      break;
    }
    default:
      throw new Error(`unknown command ${command}`);
  }
};
