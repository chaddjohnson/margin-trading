// Study B, controls, parity, freeze, final and the research-pool runner commands (dispatched from main.ts).
import type { Fold } from './studyA.ts';

export const run = async (command: string | undefined, args: string[], requireProtocolFrozen: () => Promise<void>) => {
  const fold = (args[0] ?? 'main') as Fold;

  if (['parity', 'track1'].includes(command ?? '') && fold !== 'main' && fold !== 'wf20') {
    throw new Error('fold must be main or wf20');
  }

  switch (command) {
    case 'parity':
      await requireProtocolFrozen();
      await (await import('./parity.ts')).runParity();
      break;
    case 'track1':
      await requireProtocolFrozen();
      await (await import('./track1.ts')).runTrack1(fold);
      break;
    case 'track1-wf20-test':
      await requireProtocolFrozen();
      await (await import('./track1.ts')).runTrack1Wf20Test();
      break;
    case 'track2':
      await requireProtocolFrozen();
      await (await import('./track2.ts')).runTrack2();
      break;
    case 'b-candidates':
      await requireProtocolFrozen();
      await (await import('./track2.ts')).runCandidatesB();
      break;
    case 'b-validate':
      await requireProtocolFrozen();
      await (await import('./track2.ts')).runValidateB();
      break;
    case 'freeze-selection':
      await requireProtocolFrozen();
      await (await import('./freeze.ts')).runFreezeSelection();
      break;
    case 'final':
      await requireProtocolFrozen();
      await (await import('./final.ts')).runFinal(args.includes('--confirm'));
      break;
    case 'pool':
      await (await import('./poolrun.ts')).runResearchPool(args);
      break;
    default:
      throw new Error(`unknown command ${command ?? '(none)'}`);
  }
};
