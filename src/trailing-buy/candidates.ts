// The registry of candidate types: for every phase's selection (grid or optimizer) and every pick, the
// parameters chosen on each walk-forward fold and on the FINAL (development) fold, read back from the
// phase results. Walk-forward checks use the fold-specific picks; the holdout uses the FINAL ones.
import fs from 'fs-extra';
import { resultsDir } from './constants.ts';
import { type StrategyParams, baselineParams, checkedInParams } from './engine.ts';
import type { PickName } from './selection.ts';

export interface CandidateType {
  id: string;
  source: string; // human-readable source
  row: string; // the brief's summary-table row this belongs to
  pick: PickName | 'baseline';
  perFold: Record<string, StrategyParams>; // WF1, WF2, WF3, FINAL
}

const picks: PickName[] = ['profit', 'balanced', 'lowDD'];

const fromGridPicks = async (file: string, idPrefix: string, source: string, row: string): Promise<CandidateType[]> => {
  const folds: { fold: string; picks: Record<PickName, { params: StrategyParams }> }[] = await fs.readJson(
    `${resultsDir}/${file}`
  );

  return picks.map((pick) => ({
    id: `${idPrefix}.${pick}`,
    source,
    row,
    pick,
    perFold: Object.fromEntries(folds.map((fold) => [fold.fold, fold.picks[pick].params]))
  }));
};

const fromPhase4 = async (family: string, row: string): Promise<CandidateType[]> => {
  const perFold: Record<string, Record<PickName, StrategyParams>> = {};

  for (const fold of ['WF1', 'WF2', 'WF3', 'FINAL']) {
    const selection = await fs.readJson(`${resultsDir}/phase4/${family}/${fold}/selection.json`);

    perFold[fold] = Object.fromEntries(picks.map((pick) => [pick, selection.picks[pick].params])) as Record<
      PickName,
      StrategyParams
    >;
  }

  return picks.map((pick) => ({
    id: `P4.${family}.${pick}`,
    source: `Phase 4 optimizer, ${family} family`,
    row,
    pick,
    perFold: Object.fromEntries(Object.entries(perFold).map(([fold, values]) => [fold, values[pick]]))
  }));
};

const constant = (params: StrategyParams) =>
  Object.fromEntries(['WF1', 'WF2', 'WF3', 'FINAL'].map((fold) => [fold, params]));

export const loadCandidateTypes = async (): Promise<CandidateType[]> => {
  const atrContinues = (await fs.readJson(`${resultsDir}/phase3/continuation.json`)).continues as boolean;

  return [
    {
      id: 'B0',
      source: 'Original immediate entry, 1% / 2%',
      row: 'Original baseline',
      pick: 'baseline',
      perFold: constant(baselineParams)
    },
    {
      id: 'B0c',
      source: 'Checked-in settings, 0.5% / 3%',
      row: 'Original baseline (checked-in control)',
      pick: 'baseline',
      perFold: constant(checkedInParams)
    },
    ...(await fromGridPicks(
      'phase1/picks.json',
      'P1',
      'Phase 1 grid: X = 10%, Y swept, B0 exits',
      'Fixed 10% activation, optimized Y (exits fixed)'
    )),
    ...(await fromGridPicks(
      'phase2/xy/picks.json',
      'P2xy',
      'Phase 2 grid: joint X / Y, B0 exits',
      'Joint X / Y (exits fixed)'
    )),
    ...(await fromGridPicks(
      'phase2/legacyX/picks.json',
      'P2legacy',
      'Phase 2 grid: immediate entry, X swept, B0 exits',
      'Immediate entry, optimized X (exits fixed)'
    )),
    ...(await fromGridPicks(
      'phase3/snapshot/picks.json',
      'P3snap',
      'Phase 3 grid: ATR snapshot, B0 exits',
      'ATR trailing (exits fixed)'
    )),
    ...(await fromGridPicks(
      'phase3/rolling/picks.json',
      'P3roll',
      'Phase 3 grid: ATR rolling, B0 exits',
      'ATR rolling (exits fixed, robustness)'
    )),
    ...(await fromPhase4('legacy', 'Optimized legacy immediate entry')),
    ...(await fromPhase4('fixed', 'Fully optimized fixed trailing')),
    ...(atrContinues ? await fromPhase4('atr', 'Fully optimized ATR trailing') : [])
  ];
};
