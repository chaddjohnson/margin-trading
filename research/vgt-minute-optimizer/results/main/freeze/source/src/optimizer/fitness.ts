// Objectives and constraints, declared before any validation result was seen.
//
// Objectives (both minimized by NSGA-II):
//   f1 = -(net P&L) / allocation   net of margin interest; the open position is marked to market
//   f2 = maximum drawdown / allocation   daily mark to market, unrealized losses and accrued interest
//                                        included, measured from the window's starting value of $0
// Constraints (Deb's constrained domination; violation 0 = feasible):
//   drawdown <= drawdownLimit x allocation (strategy-level drawdown on the $100,000 trading allocation;
//   not an account or portfolio drawdown)
//   entries >= ceil(minTradesPerYear x calendar years in the window), so never trading can't look safe
import type { Metrics } from './evaluate.ts';

export interface FitnessConfig {
  allocation: number;
  drawdownLimit: number; // fraction of the allocation
  minTradesPerYear: number;
}

export const defaultFitness: FitnessConfig = {
  allocation: 100000,
  drawdownLimit: 0.3,
  minTradesPerYear: 1
};

export const minimumTrades = (config: FitnessConfig, years: number) => Math.ceil(config.minTradesPerYear * years);

export const objectivesOf = (metrics: Metrics, config: FitnessConfig) => [
  -metrics.netProfit / config.allocation,
  metrics.maximumDrawdown / config.allocation
];

export const violationOf = (metrics: Metrics, config: FitnessConfig, years: number) => {
  const drawdown = metrics.maximumDrawdown / config.allocation;
  const required = minimumTrades(config, years);
  const drawdownExcess = Math.max(0, drawdown - config.drawdownLimit) / config.drawdownLimit;
  const tradeShortfall = required > 0 ? Math.max(0, required - metrics.entries) / required : 0;

  return drawdownExcess + tradeShortfall;
};
