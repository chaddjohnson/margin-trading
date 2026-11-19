// B1, the comparator (PROTOCOL.md §7): VGT D1 `primary` (daily D1, Study 8's frozen VGT grid) run by this study's
// engine on the session clock — D1 itself (parity P1/P3) — under the same economics, window and arming date, with its
// neighbourhoods drawn by Study 8's OWN design code on Study 8's daily box and radii (S8/designs.ts familyDesign, the
// N1 joint clip LHS), seeded in this study's namespace. It only tiers role holders and is reported beside them.
import type { Fit as S8Fit, Floors } from '../study8-expanded-regime-d1/fitness.ts';
import { centreView, nbView, objectivesOf, violationOf } from '../study8-expanded-regime-d1/fitness.ts';
import { frozenGrids } from '../study8-expanded-regime-d1/context.ts';
import { familyDesign, uniquePoints } from '../study8-expanded-regime-d1/designs.ts';
import { summarize } from '../study8-expanded-regime-d1/stats.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import type { Grid as DailyGrid } from '../portfolio-aware-d1/phenotypes.ts';
import { studyName, symbol } from './context.ts';
import { type EngineParams, type ExecutionSettings, simulate } from './engine.ts';
import { baseSettings, type DoorView } from './lab.ts';
import { sessionClock } from './periods.ts';
import { type IntradayRecord, recordOf } from './records.ts';
import type { Family } from './space.ts';

export const b1Grid: DailyGrid = frozenGrids.VGT;

export const dailyEngineParams = (grid: DailyGrid): EngineParams => {
  const p = candidateBook(symbol, 'B1', grid).params;

  return {
    targetPercentChange: p.targetPercentChange,
    trailingBuyPercentage: p.trailingBuyPercentage,
    trailingStopPercentage: p.trailingStopPercentage,
    holdSeconds: p.maximumHoldDays * 86400,
    lookbackPeriods: p.tickWindowSize,
    intradayLossBuffer: p.intradayLossBuffer,
    pullback: p.pullback,
    continuationPeriods: p.continuationWindow
  };
};

const cache = new Map<string, IntradayRecord>();

export const dailyPoint = (view: DoorView, grid: DailyGrid, settings: ExecutionSettings = baseSettings) => {
  const key = `${view.door}|${JSON.stringify(grid)}|${JSON.stringify(settings)}`;
  let record = cache.get(key);

  if (!record) {
    const result = simulate(
      view.market,
      sessionClock(view.market, view.sessions),
      dailyEngineParams(grid),
      settings,
      view.window
    );

    record = recordOf(view.market, result, view.window, view.ranges);
    cache.set(key, record);
  }

  return record;
};

export type DailyFit = Omit<S8Fit, 'books'> & {
  grid: DailyGrid;
  records: IntradayRecord[];
  centreRecord: IntradayRecord;
};

// B1 under one or several pooled families (labels namespaced to this study).
export const dailyFit = (
  view: DoorView,
  families: readonly Family[],
  floors: Floors,
  name: string,
  settings: ExecutionSettings = baseSettings,
  grid: DailyGrid = b1Grid
): DailyFit => {
  const centreBooks = { [symbol]: grid };
  const points = uniquePoints(
    families.flatMap((family) =>
      familyDesign(centreBooks, [symbol], {
        n: family.n,
        labels: [studyName, ...family.labels],
        ...(family.mode ? { mode: family.mode } : {}),
        ...(family.scale !== undefined ? { scale: family.scale } : {})
      })
    ),
    centreBooks
  );
  const centreRecord = dailyPoint(view, grid, settings);
  const records = points.map((point) => dailyPoint(view, point.books[symbol]!, settings));
  const c = centreView(centreRecord, [symbol], floors.y);
  const nb = nbView(summarize(records), floors.y);
  const { violation, parts } = violationOf(c, nb, floors, [symbol]);

  return {
    id: 'B1',
    family: name,
    grid,
    genome: [],
    centre: c,
    nb,
    objectives: objectivesOf(c, nb),
    violation,
    parts,
    records,
    centreRecord
  };
};
