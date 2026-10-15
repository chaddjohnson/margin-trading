// Objectives and constraints, declared before any search result was seen (MINUTE_OPTIMIZER_DESIGN.md).
//
// Objectives (both minimized by NSGA-II), at the selection cost of 5 bp per side:
//   f1 = -(net P&L) / allocation   net of margin interest and the extra costs; the open position is marked
//                                  to market at the window's last close, net of the cost of selling it
//   f2 = minute-sampled maximum drawdown / allocation   the mark to market at every regular-session
//                                  minute's close and the official close, from the window's start at $0
// Constraints (Deb's constrained domination; violation 0 = feasible):
//   minute drawdown <= drawdownLimit x allocation (a strategy-level figure on the $100,000 allocation, not
//   an account or portfolio drawdown)
//   entries >= ceil(minTradesPerYear x years in the window), so rarely trading can't look safe
import { type MinuteMetrics, levelOf } from './evaluate.ts';

export interface MinuteFitnessConfig {
  allocation: number;
  drawdownLimit: number; // fraction of the allocation
  minTradesPerYear: number;
  selectionCostBps: number; // the extra cost per side under which candidates are searched and ranked
  stressCostBps: number; // a candidate must still be profitable at this cost (selection gate)
  minExposure: number; // share of sessions with a position open at the close (selection gate)
}

export const defaultMinuteFitness: MinuteFitnessConfig = {
  allocation: 100000,
  drawdownLimit: 0.3,
  minTradesPerYear: 2,
  selectionCostBps: 5,
  stressCostBps: 20,
  minExposure: 0.05
};

export const minimumTrades = (config: MinuteFitnessConfig, years: number) => Math.ceil(config.minTradesPerYear * years);

export const objectivesOf = (metrics: MinuteMetrics, config: MinuteFitnessConfig) => {
  const level = levelOf(metrics, config.selectionCostBps);

  return [-level.netProfit / config.allocation, level.minuteDrawdown / config.allocation];
};

export const violationOf = (metrics: MinuteMetrics, config: MinuteFitnessConfig, years: number) => {
  const level = levelOf(metrics, config.selectionCostBps);
  const drawdown = level.minuteDrawdown / config.allocation;
  const required = minimumTrades(config, years);
  const drawdownExcess = Math.max(0, drawdown - config.drawdownLimit) / config.drawdownLimit;
  const tradeShortfall = required > 0 ? Math.max(0, required - metrics.entries) / required : 0;

  return drawdownExcess + tradeShortfall;
};
