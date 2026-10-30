// Part B commands (PROTOCOL.md §10). Every Part B command refuses to run before the diagnostic checkpoint is sealed
// and committed (records.ts requireDiagnosticCommitted).
//   b-track-k <main|wf19|wf20>   Track K (search doors)
//   b-wf-test                    the walk-forward folds' shortlists on their test windows (reporting)
//   b-track-j                    Track J (conditional; search door)
//   b-track-o-pa | b-track-o-me  Track O (search door; O-ME in a detached worktree)
//   b-shortlist                  the frozen shortlist (no door)
//   b-validate                   validation evidence and gates (validation door)
//   freeze-selection             once: FROZEN_SELECTION.json
//   final [--confirm]            once (after the freeze): the final evaluation (final door)
//   pool fixed <ID> [options]    a research pool of this study through the pools engine and report
import { requireDiagnosticCommitted } from './records.ts';

const kFold = (value: string | undefined) => {
  if (value !== 'main' && value !== 'wf19' && value !== 'wf20') {
    throw new Error('fold must be main, wf19 or wf20');
  }

  return value;
};

export const run = async (command: string | undefined, args: string[]) => {
  if (command === 'pool') {
    await (await import('./poolrun.ts')).runResearchPool(args);
    return;
  }

  await requireDiagnosticCommitted();

  switch (command) {
    case 'b-track-k':
      await (await import('./trackK.ts')).runTrackK(kFold(args[0]));
      break;
    case 'b-wf-test':
      await (await import('./trackK.ts')).runWalkForwardTest();
      break;
    case 'b-track-j':
      await (await import('./trackJ.ts')).runTrackJ();
      break;
    case 'b-track-o-pa':
      await (await import('./trackO.ts')).runTrackOPA();
      break;
    case 'b-track-o-me':
      await (await import('./trackO.ts')).runTrackOME();
      break;
    case 'b-shortlist':
      await (await import('./validate.ts')).runShortlist();
      break;
    case 'b-validate':
      await (await import('./validate.ts')).runValidate();
      break;
    case 'freeze-selection':
      await (await import('./validate.ts')).runFreezeSelection();
      break;
    case 'final':
      await (await import('./final.ts')).runFinal(args.includes('--confirm'));
      break;
    default:
      throw new Error(`unknown command ${command ?? '(none)'}`);
  }
};
