// Full-grid studies (Phases 1-3): every grid point is simulated on each fold's training window, robust
// statistics come from the box neighbourhood of PROTOCOL.md section 7 (every point within the radius on
// each swept dimension), and the pre-registered picks are made against B0 on the same window. Walk-forward
// folds then score the picks on their validation windows.
import type { RunOptions, StrategyParams } from './engine.ts';
import { baselineParams } from './engine.ts';
import type { CompactMetrics } from './evaluate.ts';
import { type NumericKey, paramsId } from './params.ts';
import { minimumEntries } from './search.ts';
import { type Picks, type RobustRow, makePicks, robustFront, robustStats } from './selection.ts';
import {
  type FoldIndexes,
  type Study,
  developmentFolds,
  flatTestJob,
  foldIndexes,
  runJobs,
  testJob,
  trainingJob,
  yearsBetween
} from './study.ts';

export interface GridDim {
  key: NumericKey;
  values: number[];
  radius: number; // index steps
}

export interface GridSpec {
  id: string;
  base: StrategyParams;
  dims: GridDim[];
  options?: Partial<RunOptions>;
  baseline?: StrategyParams; // the picks' reference (default B0)
}

export interface GridPoint {
  coords: number[];
  params: StrategyParams;
}

export const gridPoints = (spec: GridSpec): GridPoint[] => {
  let points: GridPoint[] = [{ coords: [], params: { ...spec.base } }];

  for (const dim of spec.dims) {
    points = points.flatMap((point) =>
      dim.values.map((value, index) => ({
        coords: [...point.coords, index],
        params: { ...point.params, [dim.key]: value }
      }))
    );
  }

  return points;
};

export interface GridRow extends RobustRow {
  coords: number[];
  metrics: CompactMetrics;
  feasible: boolean;
}

export interface FoldGrid {
  foldId: string;
  folds: FoldIndexes;
  baseline: CompactMetrics;
  rows: GridRow[];
  front: GridRow[];
  picks: Picks;
}

const key = (coords: number[]) => coords.join(',');

export const robustGrid = (spec: GridSpec, points: GridPoint[], metrics: CompactMetrics[], years: number) => {
  const byCoords = new Map(points.map((point, index) => [key(point.coords), index]));
  const required = minimumEntries(years);

  return points.map((point, index): GridRow => {
    const group: { net: number; dd: number }[] = [];
    const visit = (dimension: number, coords: number[]) => {
      if (dimension === spec.dims.length) {
        const found = byCoords.get(key(coords));

        if (found !== undefined) {
          group.push({ net: metrics[found]!.netProfit, dd: metrics[found]!.maximumDrawdown });
        }

        return;
      }

      const radius = spec.dims[dimension]!.radius;

      for (let offset = -radius; offset <= radius; offset++) {
        visit(dimension + 1, [...coords, point.coords[dimension]! + offset]);
      }
    };

    visit(0, []);

    const own = metrics[index]!;
    const row = robustStats(
      {
        id: paramsId(point.params),
        params: point.params,
        net: own.netProfit,
        dd: own.maximumDrawdown,
        entries: own.entries,
        signature: ''
      },
      group
    );

    return { ...row, coords: point.coords, metrics: own, feasible: own.entries >= required && own.netProfit > 0 };
  });
};

export const runGridFold = async (
  study: Study,
  spec: GridSpec,
  folds: FoldIndexes,
  points = gridPoints(spec)
): Promise<FoldGrid> => {
  const [baseline] = await runJobs(study, [trainingJob(folds, spec.baseline ?? baselineParams)]);
  const metrics = await runJobs(
    study,
    points.map((point) => trainingJob(folds, point.params, spec.options))
  );
  const rows = robustGrid(spec, points, metrics, yearsBetween(study, folds.trainStart, folds.trainEnd));
  const front = robustFront(rows.filter((row) => row.feasible)) as GridRow[];
  const picks = makePicks(front, { net: baseline!.netProfit, dd: baseline!.maximumDrawdown });

  return { foldId: folds.fold.id, folds, baseline: baseline!, rows, front, picks };
};

export interface Validation {
  foldId: string;
  label: string;
  params: StrategyParams;
  continuous: CompactMetrics;
  flat: CompactMetrics;
}

export const validate = async (
  study: Study,
  folds: FoldIndexes,
  entries: { label: string; params: StrategyParams; options?: Partial<RunOptions> }[]
): Promise<Validation[]> => {
  const continuous = await runJobs(
    study,
    entries.map((entry) => testJob(folds, entry.params, entry.options))
  );
  const flat = await runJobs(
    study,
    entries.map((entry) => flatTestJob(folds, entry.params, entry.options))
  );

  return entries.map((entry, index) => ({
    foldId: folds.fold.id,
    label: entry.label,
    params: entry.params,
    continuous: continuous[index]!,
    flat: flat[index]!
  }));
};

export interface GridStudy {
  spec: GridSpec;
  points: number;
  folds: FoldGrid[];
  validations: Validation[]; // WF1-3 only; the FINAL fold's test window is the holdout
}

// Runs a grid on every development fold, then validates each walk-forward fold's three picks (and B0).
export const runGridStudy = async (
  study: Study,
  spec: GridSpec,
  extra: (fold: FoldGrid) => { label: string; params: StrategyParams; options?: Partial<RunOptions> }[] = () => []
): Promise<GridStudy> => {
  const points = gridPoints(spec);
  const folds: FoldGrid[] = [];
  const validations: Validation[] = [];

  for (const fold of developmentFolds) {
    const indexes = foldIndexes(study, fold);
    const grid = await runGridFold(study, spec, indexes, points);

    folds.push(grid);

    if (indexes.testStart >= 0) {
      validations.push(
        ...(await validate(study, indexes, [
          { label: 'B0', params: baselineParams },
          ...(spec.baseline ? [{ label: 'baseline', params: spec.baseline }] : []),
          ...(['profit', 'balanced', 'lowDD'] as const).map((name) => ({
            label: name,
            params: grid.picks[name].params,
            options: spec.options
          })),
          ...extra(grid)
        ]))
      );
    }
  }

  return { spec, points: points.length, folds, validations };
};

export const rowsToCsv = (spec: GridSpec, rows: GridRow[]) =>
  rows.map((row) => ({
    ...Object.fromEntries(spec.dims.map((dim) => [dim.key, row.params[dim.key]])),
    net: row.net,
    drawdown: row.dd,
    netP25: row.netP25,
    ddP75: row.ddP75,
    neighbours: row.neighbours,
    entries: row.metrics.entries,
    closedTrades: row.metrics.closedTrades,
    wins: row.metrics.wins,
    interest: row.metrics.interest,
    timeInMarket: row.metrics.timeInMarket,
    worstTradeMark: row.metrics.worstTradeMark,
    setupsArmed: row.metrics.setupsArmed,
    setupsCancelled: row.metrics.setupsCancelled,
    setupsPendingAtEnd: row.metrics.setupsPendingAtEnd,
    meanWaitSessions: row.metrics.meanWaitSessions,
    feasible: row.feasible
  }));

// Walk-forward aggregate of one label: sum of validation net, worst validation drawdown.
export const aggregate = (validations: Validation[], label: string, mode: 'continuous' | 'flat' = 'continuous') => {
  const rows = validations.filter((row) => row.label === label);

  return {
    label,
    folds: rows.length,
    net: rows.reduce((total, row) => total + row[mode].netProfit, 0),
    worstDrawdown: Math.max(...rows.map((row) => row[mode].maximumDrawdown)),
    perFold: rows.map((row) => ({
      fold: row.foldId,
      net: row[mode].netProfit,
      dd: row[mode].maximumDrawdown,
      entries: row[mode].entries
    }))
  };
};

// PROTOCOL.md section 9 classes.
export const classify = (candidate: { net: number; dd: number }, baseline: { net: number; dd: number }) => {
  if (
    (candidate.net >= baseline.net + 5000 && candidate.dd <= baseline.dd) ||
    (candidate.dd <= 0.9 * baseline.dd && candidate.net >= baseline.net)
  ) {
    return 'Dominant';
  }

  if (candidate.dd <= 0.85 * baseline.dd && candidate.net >= 0.9 * baseline.net) {
    return 'Risk trade-off';
  }

  return 'Fails';
};
