// This study's period attributions (PROTOCOL.md §4) computed from a replay's close marks with this study's own period
// list. Part B uses these instead of the Study 5 evaluator's `periods`, whose `WF20-SEARCH`/`WF20-TEST` keys are Study
// 5's (2017-06-15 → 2019-12-31 and 2020–2021) and differ from this study's walk-forward windows; DEV, VAL, FX, RECENT,
// FULL, the development folds and the calendar years are identical in both lists.
import type { ReplayResult } from '../portfolio-aware-d1/replay.ts';
import { devFolds, periods, years } from './context.ts';
import { type Lab, type RunSettings, baseSettings } from './evaluate.ts';

export const periodList = [
  ...periods,
  ...devFolds,
  ...years.map((year) => ({
    key: String(year),
    start: year === 2017 ? '2017-06-15' : `${year}-01-01`,
    end: `${year}-12-31`
  }))
];

export const ownPeriods = (lab: Lab, result: ReplayResult, settings: RunSettings = baseSettings) =>
  Object.fromEntries(
    lab.ev
      .rangesOf(periodList, settings)
      .map((range) => [range.key, result.marks[range.last]! - (range.first > 0 ? result.marks[range.first - 1]! : 0)])
  ) as Record<string, number>;

// Eligible sessions of a period inside the run (for annualizing: sessions ÷ 252).
export const periodSessions = (lab: Lab, key: string, settings: RunSettings = baseSettings) => {
  const range = lab.ev.rangesOf(
    periodList.filter((period) => period.key === key),
    settings
  )[0];

  return range ? range.last - range.first + 1 : 0;
};
