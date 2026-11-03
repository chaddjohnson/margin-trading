// Level C (PROTOCOL.md §7.2–7.3): a baseline and baseline + one candidate book, each one continuous run of the frozen
// engine from 2016-01-04 to the window's data end, at every cost fully re-simulated, the adverse s25 stress, and the
// 20% portfolio; the gate replay must equal the engine's funded set in every fixed run (fail closed); the window
// increment's path attribution comes from lot shares keyed by (symbol, decision time).
import type { BookPhenotype, NRunResult, NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { study } from './context.ts';
import { runBooks, runCore } from './engine.ts';
import { classify, firstOrderOf, keyOf, replayGate } from './gate.ts';
import { fundedGateTrades, gateTradeOf, tradeRecordsOf } from './ledger.ts';
import { lotSharesOf, windowIncrementOf } from './marks.ts';
import { fixedRiskOf, portfolioRiskOf } from './risk.ts';
import { regimeOf } from './events.ts';

export interface CostRun {
  cost: string; // '0' | '2' | '5' | '10' | 's25'
  costBps: number;
  stopSlippageBps: number;
}

export const costRuns: CostRun[] = [
  ...study.costGrid.map((bps) => ({ cost: String(bps), costBps: bps, stopSlippageBps: 0 })),
  { cost: study.stress.id, costBps: study.stress.costBps, stopSlippageBps: study.stress.stopSlippageBps }
];

// The gate replay of every virtual trade of a fixed run must equal the engine's funded lots exactly.
export const gateCheck = (universe: NUniverse, result: NRunResult, costBps: number) => {
  const records = tradeRecordsOf(universe, result, costBps);
  const replayed = new Set(
    replayGate(records.map(gateTradeOf))
      .filter((o) => o.granted)
      .map((o) => o.trade.key)
  );
  const funded = new Set(fundedGateTrades(records).map((trade) => trade.key));
  const missing = [...funded].filter((key) => !replayed.has(key));
  const extra = [...replayed].filter((key) => !funded.has(key));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${result.config.key}: gate replay ≠ engine (missing ${missing.slice(0, 3).join(' ')}; extra ${extra.slice(0, 3).join(' ')})`
    );
  }

  return { funded: funded.size, trades: records.length, records };
};

export interface RunSummary {
  key: string;
  cost: string;
  increment: number;
  wholeRun: number;
  lots: number;
  lotsInWindow: number;
  refused: number;
  interest: number;
  gross: number;
  friction: number;
}

const fixedSummary = (result: NRunResult, cost: CostRun, boundary?: string): RunSummary => {
  const b = boundary ? result.universe.dates.indexOf(boundary) : -1;
  const records = tradeRecordsOf(result.universe, result, cost.costBps).filter((record) => record.fundedLot > 0);
  const inWindow = records.filter((record) => record.entryIndex > b);

  return {
    key: result.config.key,
    cost: cost.cost,
    increment: windowIncrementOf(result, cost.costBps, boundary).increment,
    wholeRun: windowIncrementOf(result, cost.costBps).increment,
    lots: result.lots.length,
    lotsInWindow: inWindow.length,
    refused: result.signals.filter((signal) => signal.outcome === 'refused').length,
    interest: inWindow.reduce((total, record) => total + record.interest, 0),
    gross: inWindow.reduce((total, record) => total + (Number.isFinite(record.gross) ? record.gross : 0), 0),
    friction: inWindow.reduce((total, record) => total + (Number.isFinite(record.friction) ? record.friction : 0), 0)
  };
};

// Path attribution at one cost: ΔV = Σ scenario-only lot shares − Σ baseline-only lot shares, split by role.
export const attributionOf = (
  baseline: NRunResult,
  scenario: NRunResult,
  candidate: string,
  costBps: number,
  boundary?: string,
  firstDecisionIndex = 0
) => {
  const keyed = (result: NRunResult) => {
    const shares = lotSharesOf(result, costBps, boundary).shares;
    const lotById = new Map(result.lots.map((lot) => [lot.id, lot]));

    return new Map(
      shares.map((share) => {
        const lot = lotById.get(share.id)!;

        return [keyOf(lot.symbol, lot.decisionTime), { ...share, net: lot.net, entryIndex: lot.entryIndex }];
      })
    );
  };
  const base = keyed(baseline);
  const scen = keyed(scenario);
  const baseRecords = tradeRecordsOf(baseline.universe, baseline, costBps);
  const scenRecords = tradeRecordsOf(scenario.universe, scenario, costBps);
  const candidateTrades = scenRecords.filter((record) => record.symbol === candidate).map(gateTradeOf);
  const classified = classify(candidateTrades, fundedGateTrades(baseRecords));
  const classOf = new Map(classified.map((item) => [item.trade.key, item.class]));
  const displacedAll = new Set(firstOrderOf(classified).displacedKeys);
  const parts = {
    candidateIdleClean: 0,
    candidateIdleDisplacing: 0,
    candidateBusyAgainstBaseline: 0,
    incumbentGained: 0,
    incumbentLostDirect: 0,
    incumbentLostCascade: 0
  };
  const counts = { ...parts };
  const byRegime: Record<string, number> = {};
  let largestScenarioOnlyShare = 0;
  let commonDifference = 0;
  const regimeAdd = (entryIndex: number, value: number) => {
    const regime = regimeOf(scenario.universe.dates[entryIndex]!);

    byRegime[regime] = (byRegime[regime] ?? 0) + value;
  };

  for (const [key, item] of scen) {
    const other = base.get(key);

    if (other) {
      commonDifference = Math.max(commonDifference, Math.abs(other.share - item.share));
      continue;
    }

    largestScenarioOnlyShare = Math.max(largestScenarioOnlyShare, item.share);
    regimeAdd(item.entryIndex, item.share);

    if (item.symbol === candidate) {
      const cls = classOf.get(key);
      const part =
        cls === 'idle-clean'
          ? 'candidateIdleClean'
          : cls === 'idle-displacing'
            ? 'candidateIdleDisplacing'
            : 'candidateBusyAgainstBaseline';

      parts[part] += item.share;
      counts[part]++;
    } else {
      parts.incumbentGained += item.share;
      counts.incumbentGained++;
    }
  }

  for (const [key, item] of base) {
    if (scen.has(key)) {
      continue;
    }

    const part = displacedAll.has(key) ? 'incumbentLostDirect' : 'incumbentLostCascade';

    regimeAdd(item.entryIndex, -item.share);
    parts[part] -= item.share;
    counts[part]++;
  }

  if (commonDifference > 1e-6) {
    throw new Error(`a lot common to both runs has different window shares (${commonDifference})`);
  }

  const delta = Object.values(parts).reduce((total, value) => total + value, 0);
  const incrementDelta =
    lotSharesOf(scenario, costBps, boundary).increment - lotSharesOf(baseline, costBps, boundary).increment;

  if (Math.abs(delta - incrementDelta) > 1e-6) {
    throw new Error(`attribution ${delta} ≠ ΔV ${incrementDelta}`);
  }

  // First-order on the window's candidate decisions (nets, not shares): the bookkeeping the full path is compared with.
  const windowClassified = classified.filter((item) => {
    const record = scenRecords.find((r) => keyOf(r.symbol, r.decisionTime) === item.trade.key)!;

    return record.decisionIndex >= firstDecisionIndex;
  });
  const firstOrder = firstOrderOf(windowClassified);

  return {
    delta,
    parts,
    counts,
    firstOrder: {
      idleNet: firstOrder.idleNet,
      displacedNet: firstOrder.displacedNet,
      delta: firstOrder.delta,
      displaced: firstOrder.displacedKeys.length
    },
    signAgreement: Math.sign(firstOrder.delta) === Math.sign(delta),
    candidateClasses: {
      busy: windowClassified.filter((item) => item.class === 'busy').length,
      idleClean: windowClassified.filter((item) => item.class === 'idle-clean').length,
      idleDisplacing: windowClassified.filter((item) => item.class === 'idle-displacing').length
    },
    complementShare: delta > 0 ? parts.candidateIdleClean / delta : null,
    largestScenarioOnlyShare,
    deltaWithoutLargest: delta - largestScenarioOnlyShare,
    byRegime,
    worstOwnLotInWindow: (() => {
      const b = boundary ? scenario.universe.dates.indexOf(boundary) : -1;
      const own = scenario.lots.filter((lot) => lot.symbol === candidate && lot.entryIndex > b);

      return own.length > 0
        ? Math.min(
            ...[...scen.values()]
              .filter((item) => item.symbol === candidate && item.entryIndex > b)
              .map((item) => item.net)
          )
        : null;
    })()
  };
};

export interface Scenario {
  id: string;
  baseline: string;
  view: string;
  fold: string;
  role: string;
  candidate: string;
  window: string;
  boundary?: string;
  firstDecisionIndex: number;
}

// One baseline set of runs (every cost, the stress, the portfolio) — shared by the scenarios of the same baseline/window.
export const baselineRuns = (universe: NUniverse, phenotypes: Record<string, BookPhenotype>, key: string) => {
  const fixed = new Map<string, NRunResult>();

  for (const cost of costRuns) {
    const result = runBooks(universe, phenotypes, {
      key: `${key}@${cost.cost}`,
      mode: 'fixed',
      costBps: cost.costBps,
      stopSlippageBps: cost.stopSlippageBps
    });

    gateCheck(universe, result, cost.costBps);
    fixed.set(cost.cost, result);
  }

  const portfolio = runBooks(universe, phenotypes, {
    key: `${key}@portfolio`,
    mode: 'portfolio',
    costBps: study.costBps
  });

  return { fixed, portfolio };
};

export const scenarioRecord = (
  scenario: Scenario,
  universe: NUniverse,
  basePhenotypes: Record<string, BookPhenotype>,
  candidateBook: BookPhenotype,
  base: ReturnType<typeof baselineRuns>,
  core: NRunResult
) => {
  const phenotypes = { ...basePhenotypes, [candidateBook.symbol]: candidateBook };
  const runs = baselineRuns(universe, phenotypes, scenario.id);
  const costs = costRuns.map((cost) => {
    const b = fixedSummary(base.fixed.get(cost.cost)!, cost, scenario.boundary);
    const s = fixedSummary(runs.fixed.get(cost.cost)!, cost, scenario.boundary);

    return { cost: cost.cost, baseline: b, scenario: s, delta: s.increment - b.increment };
  });
  const five = String(study.costBps);
  const attribution = attributionOf(
    base.fixed.get(five)!,
    runs.fixed.get(five)!,
    candidateBook.symbol,
    study.costBps,
    scenario.boundary,
    scenario.firstDecisionIndex
  );
  const attribution10 = attributionOf(
    base.fixed.get('10')!,
    runs.fixed.get('10')!,
    candidateBook.symbol,
    10,
    scenario.boundary,
    scenario.firstDecisionIndex
  );
  const riskBase = fixedRiskOf(base.fixed.get(five)!, study.costBps, scenario.boundary);
  const riskScenario = fixedRiskOf(runs.fixed.get(five)!, study.costBps, scenario.boundary);
  const portfolioBase = portfolioRiskOf(base.portfolio, scenario.boundary);
  const portfolioScenario = portfolioRiskOf(runs.portfolio, scenario.boundary);
  const portfolioCore = portfolioRiskOf(core, scenario.boundary);

  return {
    scenario,
    candidateBook: { symbol: candidateBook.symbol, name: candidateBook.name, short: candidateBook.short },
    costs,
    attribution,
    attribution10,
    risk: { baseline: riskBase, scenario: riskScenario },
    portfolio: { core: portfolioCore, baseline: portfolioBase, scenario: portfolioScenario },
    ledgers: {
      baseline: tradeRecordsOf(universe, base.fixed.get(five)!, study.costBps).filter((record) => record.fundedLot > 0),
      scenario: tradeRecordsOf(universe, runs.fixed.get(five)!, study.costBps).filter((record) => record.fundedLot > 0),
      scenarioSignals: runs.fixed.get(five)!.signals.map((signal) => ({
        symbol: signal.symbol,
        decisionTime: signal.decisionTime,
        outcome: signal.outcome,
        reason: signal.reason
      }))
    }
  };
};

export { runCore };
