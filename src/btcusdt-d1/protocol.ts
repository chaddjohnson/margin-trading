// The frozen procedure (PROTOCOL.md §6-§9): every budget, gate, threshold and seed label the outcome stages use.
// research/btcusdt-d1/PROTOCOL_FREEZE.json records this object, its hash and the code that reads it; an outcome stage
// refuses to run if any of them changed.
import { type ExecutionSettings, conservative, principal, stress } from './costs.ts';
import { seedRoot } from './space.ts';

export const settingsFor = (
  costs: ExecutionSettings['costs'],
  stopFill: ExecutionSettings['stopFill'] = 'adverse'
) => ({
  costs,
  stopFill,
  minOrderNotional: 10
});

export const procedure = {
  version: 'btcusdt-d1-procedure-v1',
  seedRoot,
  settings: {
    principal: settingsFor(principal),
    conservative: settingsFor(conservative),
    stress: settingsFor(stress),
    worstFill: settingsFor(principal, 'low'),
    stopLevel: settingsFor(principal, 'stop')
  },
  // Sized from the outcome-blind benchmark (results/benchmark/BENCHMARK.json: 3.5 ms per evaluation with 9 workers on
  // the longest selection window), before any selection stage: about 72,000 evaluations, ~4 minutes, per selection.
  budgets: {
    sobol: 65536,
    refinementSeeds: 8,
    generations: 24,
    offspring: 16,
    shortlist: 60,
    neighbours: 32,
    wideNeighbours: 16
  },
  gates: {
    // G1: minute-sampled peak-to-trough <= 35% of the cash account's running peak AND <= 35,000 USDT (the user's
    // 35,000-per-100,000 reference: a percentage alone loosens as non-compounded profits raise the peak), entries >=
    // ceil(3 x window years), net > 0.
    maxMinutePercent: 0.35,
    maxMinuteDrawdownUsdt: 35000,
    minTradesPerYear: 3,
    // G2: net minus the two largest POSITIVE trade nets > 0.
    // G6: net > 0 in at least 2 of the window's 3 consecutive equal subperiods.
    subperiods: 3,
    minPositiveSubperiods: 2,
    // G3: >= 50% of the radius-1 neighbours pass G1 and their median net > 0. G4: net > 0 at the conservative costs.
    // G5: net > 0 with worst-case ("low") stop fills at the principal costs.
    neighbourFeasibleShare: 0.5
  },
  // The shortlist: the ranked G1+G2+G6 pool, one vector per schedule, each admitted only if its exposure-day distance
  // from every admitted vector is >= 0.1 and its refinement lineage (seed) has fewer than 6 admitted vectors.
  shortlistRule: { minDistance: 0.1, lineageQuota: 6 },
  seedMinDistance: 0.5, // refinement seeds: exposure-day Jaccard distance from every earlier seed
  families: { slots: 3, minDistance: 0.5 },
  exploratoryLowDrawdown: 0.25,
  // The fold gate on the rank-1 pick's validation window (and, reported, the holdout gate): every selection test
  // that can be applied out of sample. Net > 0 at the principal costs, at the conservative costs and with worst-case
  // stop fills; net minus the largest positive trade net > 0; minute peak-to-trough <= 35% and <= 35,000 USDT;
  // entries >= ceil(3 x window years).
  foldGate: { maxMinutePercent: 0.35, maxMinuteDrawdownUsdt: 35000, minTradesPerYear: 3 }
} as const;

export type Procedure = typeof procedure;

export const minTradesFor = (windowDays: number) => Math.ceil(procedure.gates.minTradesPerYear * (windowDays / 365.25));
