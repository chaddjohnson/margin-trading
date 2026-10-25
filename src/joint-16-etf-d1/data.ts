// The study's data access (PROTOCOL.md §2). Three doors, each refusing what it may not open:
//
//   trainingUniverse     every library, search, refinement, robustness and gate computation: all 16 ETFs over the
//                        training partition through loadDatasetSessions({ access: 'optimization' }), which refuses any
//                        other partition before a byte is read. Nothing in the search code reads data any other way.
//   benchmarkUniverse    the benchmark reproduction on `all`: VOOG, VGT, XBI, XRT, KRE and GDX only (the B1/B4/B5
//                        members, whose `all` results were inspected and published earlier); any other symbol is refused.
//   evaluationUniverse   the post-freeze continuous `all` evaluation: only after FROZEN_SELECTION.json verifies.
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { benchmarkMembers, frozenSelectionFile, study, universe } from './context.ts';
import { readVerifiedSelection } from './freeze.ts';

const loadTraining = async (root: string) => {
  const loaded = await loadNUniverse({
    members: universe,
    partition: 'training',
    access: 'optimization',
    warmupSessions: 0,
    root
  });

  if (loaded.universe.end > study.trainingEnd) {
    throw new Error(`The training universe ends ${loaded.universe.end}, after ${study.trainingEnd}`);
  }

  for (const [symbol, window] of Object.entries(loaded.windows)) {
    if (window.partition !== 'training' || window.access !== 'optimization') {
      throw new Error(`${symbol}: not an optimization read of the training partition`);
    }
  }

  return loaded;
};

let trainingCache: Promise<LoadedUniverse> | undefined;

export const trainingUniverse = (root = 'data'): Promise<LoadedUniverse> => {
  if (root !== 'data') {
    return loadTraining(root);
  }

  trainingCache ??= loadTraining(root);

  return trainingCache;
};

export const benchmarkUniverse = async (members: readonly string[], endDate?: string): Promise<LoadedUniverse> => {
  for (const symbol of members) {
    if (!(benchmarkMembers as readonly string[]).includes(symbol)) {
      throw new Error(
        `${symbol} is not a benchmark member: the benchmark door opens ${benchmarkMembers.join(', ')} only`
      );
    }
  }

  return loadNUniverse({ members, partition: 'all', access: 'manual evaluation', warmupSessions: 0, endDate });
};

export const evaluationUniverse = async (
  members: readonly string[],
  manifestFile: string = frozenSelectionFile,
  root = 'data'
): Promise<LoadedUniverse> => {
  await readVerifiedSelection(manifestFile); // throws unless the frozen selection exists and its body hash verifies

  return loadNUniverse({ members, partition: 'all', access: 'manual evaluation', warmupSessions: 0, root });
};
