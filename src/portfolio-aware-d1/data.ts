// The study's data access. Three doors, each refusing what it may not open:
//
//   trainingUniverse     every optimization, fitness evaluation, selection and Stage C design: the training partition
//                        through loadDatasetSessions({ access: 'optimization' }), which refuses any other partition
//                        before a byte is read. Nothing in the search code reads data any other way.
//   baselineUniverse     the controls and parity gates of S0 and VGT alone on `all` (to 2025-10-13 or the whole file),
//                        already authorized and inspected in earlier work; it refuses any candidate symbol.
//   evaluationUniverse   the post-freeze continuous `all` evaluation: only after FROZEN_SELECTION.json verifies.
import { readSplits, sha256FileSync } from '#lib';
import { baselineBooks, candidates, study } from './context.ts';
import { readVerifiedSelection } from './freeze.ts';
import { type LoadedUniverse, loadNUniverse } from './nbook/universe.ts';

export const coreSymbol = 'VOOG';

// VOOG and the four frozen books first (the portfolio's order), then the candidates.
export const allMembers = [coreSymbol, ...baselineBooks, ...candidates] as const;

let trainingCache: Promise<LoadedUniverse> | undefined;

export const trainingUniverse = (): Promise<LoadedUniverse> => {
  if (!trainingCache) {
    trainingCache = (async () => {
      const loaded = await loadNUniverse({
        members: allMembers,
        partition: 'training',
        access: 'optimization',
        warmupSessions: 0
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
    })();
  }

  return trainingCache;
};

export const baselineUniverse = async (endDate?: string): Promise<LoadedUniverse> =>
  loadNUniverse({
    // VOOG and the four frozen books only: no candidate symbol can be read here.
    members: [coreSymbol, ...baselineBooks],
    partition: 'all',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate
  });

export const evaluationUniverse = async (
  members: readonly string[],
  manifestFile?: string,
  root = 'data'
): Promise<LoadedUniverse> => {
  await readVerifiedSelection(manifestFile); // throws unless the frozen selection exists and its body hash verifies

  return loadNUniverse({ members, partition: 'all', access: 'manual evaluation', warmupSessions: 0, root });
};

export const splitsSha256 = () => sha256FileSync('config/market-events/splits.json');

export const splitEvents = () => readSplits();

// The trace window of a loaded universe (arming, accounting start and end sessions, splits registry hash).
export const traceWindowOf = (loaded: LoadedUniverse) => ({
  armStart: loaded.universe.eligibilityIndex,
  startIndex: loaded.warmup,
  endIndex: loaded.universe.sessionCount - 1,
  splitsSha256: splitsSha256()
});
