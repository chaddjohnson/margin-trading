// The two tracks' feasibility, objectives and constraint violations (PROTOCOL.md §4.6, §5.1), shared by Stage A's
// finalist rule, Stage B's search and selection, and the reports.
import { study } from './context.ts';
import type { PoolMetrics, StandaloneMetrics, VectorResult } from './evaluate.ts';

export const feasibleS = (metrics: StandaloneMetrics) =>
  metrics.minuteDrawdown <= study.drawdownCeiling &&
  metrics.trades >= study.feasibility.S.minTrades &&
  metrics.years >= study.feasibility.S.minYears;

export const feasibleP = (metrics: PoolMetrics) =>
  metrics.minuteDrawdown <= study.drawdownCeiling &&
  metrics.lots >= study.feasibility.P.minLots &&
  metrics.lotYears >= study.feasibility.P.minYears;

export const violationS = (metrics: StandaloneMetrics) =>
  Math.max(0, metrics.minuteDrawdown - study.drawdownCeiling) / study.drawdownCeiling +
  Math.max(0, study.feasibility.S.minTrades - metrics.trades) / study.feasibility.S.minTrades +
  Math.max(0, study.feasibility.S.minYears - metrics.years) / study.feasibility.S.minYears;

export const violationP = (metrics: PoolMetrics) =>
  Math.max(0, metrics.minuteDrawdown - study.drawdownCeiling) / study.drawdownCeiling +
  Math.max(0, study.feasibility.P.minLots - metrics.lots) / study.feasibility.P.minLots +
  Math.max(0, study.feasibility.P.minYears - metrics.lotYears) / study.feasibility.P.minYears;

// The track's primary objective (maximized) and its drawdown (minimized).
export const objectiveOf = (track: 'S' | 'P', result: VectorResult) =>
  track === 'S' ? result.standalone.net : result.pool.delta;

export const drawdownOf = (track: 'S' | 'P', result: VectorResult) =>
  track === 'S' ? result.standalone.minuteDrawdown : result.pool.minuteDrawdown;

export const feasibleOf = (track: 'S' | 'P', result: VectorResult) =>
  track === 'S' ? feasibleS(result.standalone) : feasibleP(result.pool);

export const violationOf = (track: 'S' | 'P', result: VectorResult) =>
  track === 'S' ? violationS(result.standalone) : violationP(result.pool);

export const foldsOf = (track: 'S' | 'P', result: VectorResult) =>
  track === 'S' ? result.standalone.folds : result.pool.folds;

export const regimesOf = (track: 'S' | 'P', result: VectorResult) =>
  track === 'S' ? result.standalone.regimes : result.pool.regimes;

// Objective minus its largest positive regime contribution (§5.3 R3, §6.1 T3).
export const withoutBestRegime = (objective: number, regimes: readonly number[]) => objective - Math.max(0, ...regimes);

// Stable descending order by the objective; ties by ID.
export const byObjective = (track: 'S' | 'P') => (a: VectorResult, b: VectorResult) =>
  objectiveOf(track, b) - objectiveOf(track, a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export const median = (values: readonly number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};
