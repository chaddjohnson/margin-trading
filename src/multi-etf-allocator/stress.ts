// The stress program of PROTOCOL.md §9, on the "stress set" (B and the all-primary / all-lowDd portfolio runs under
// shadow, priority and split):
//
//   1. static entry shocks      every funded lot: next-open gaps of the traded ETF, other holdings ρ × that; equity and
//                               excess under U35/U50/U60/L60/G60 from the entry close's balance sheet; the lot's exit
//                               replayed on the shifted path under D1's own rules (labelled static)
//   2. requirement timing       60% (L60, G60, U60) at the decision (largest allowed principal), just after the fill
//                               (the entry event's balance sheet), at the lot's worst session, at the gapped next open
//   3. full-path replays        every price shifted from the open of τ, the requirement raised at τ, calls with
//                               immediate lot-first liquidation; breaching paths re-run under the other broker models
//   4–8. sensitivities          costs, stop fills, rates (incl. Vanguard's method), borrowed fraction, lot dividends,
//                               core rebalance, in both modes where the protocol says so
//   9. Vanguard 30-day rule     the VGT lots and Vanguard-ETF purchases the published rule would affect (counted only)
import path from 'node:path';
import fs from 'fs-extra';
import type { Dataset } from '../four-family/data.ts';
import { shiftDataset } from '../shared-margin-portfolio/data.ts';
import { ExitManager, type LotState } from '../shared-margin-portfolio/strategy.ts';
import { configFile, formatDate, formatTime, log, protocol, readJson, stageDir, writeJson } from './context.ts';
import type { Universe } from './data.ts';
import { type Liquidation, type RunConfig, type RunResult, runAllocator, sessionIndexOf } from './engine.ts';
import type { InterestModel, RealLot } from './ledger.ts';
import {
  type BalanceSheet,
  type MarketValues,
  type ScheduleKey,
  distanceOf,
  fundedBreakEven,
  homogeneousBreakEven,
  shockedSheet
} from './margin.ts';
import { type Summary, attribution, summarize, summaryRow, toCsv, tradeRecords } from './metrics.ts';
import { fixedVgtConfig, allocatorConfig } from './scenarios.ts';
import { scenarioBConfig } from './parity.ts';
import { combinationOf } from './context.ts';

const stressDir = (...parts: string[]) => stageDir('stress', ...parts);

interface StressConfig {
  stress: {
    entryGaps: number[];
    correlations: number[];
    fullPathDates: string[];
    fullPathGaps: number[];
    fullPathCorrelations: number[];
    fullPathRequirements: ScheduleKey[];
    costsBps: number[];
    stopSlippageBps: number;
    forcedSaleSlippageBps: number;
  };
  vanguardInterest: {
    standardTiers: { upTo: number | null; rate: string }[];
    preferredRate: string;
    preferredQualifyingAssets: number;
  };
}

const rateOf = (text: string) => Number(text.replace('%', '')) / 100;

export const vanguardModels = (config: StressConfig): Record<'standard' | 'preferred', InterestModel> => {
  const tiers = config.vanguardInterest.standardTiers.map((tier) => ({
    upTo: tier.upTo ?? Infinity,
    rate: rateOf(tier.rate)
  }));

  return {
    standard: { kind: 'vanguard', tiers },
    preferred: {
      kind: 'vanguard',
      tiers,
      preferred: {
        rate: rateOf(config.vanguardInterest.preferredRate),
        threshold: config.vanguardInterest.preferredQualifyingAssets,
        cap: 499999.99
      }
    }
  };
};

export interface StressBase {
  key: string;
  build: (overrides?: Partial<RunConfig>) => Promise<RunConfig>;
}

export const stressSet = (): StressBase[] => [
  { key: 'B', build: (overrides = {}) => scenarioBConfig(overrides) },
  ...(['all-primary', 'all-lowDd'] as const).flatMap((alias) =>
    (['shadow', 'priority', 'split'] as const).map((policy) => ({
      key: `C-${alias}-${policy}`,
      build: (overrides: Partial<RunConfig> = {}) =>
        allocatorConfig('portfolio', combinationOf(alias), policy, overrides)
    }))
  )
];

const sheetOf = (equity: number, mv: MarketValues, funded: Iterable<string>, debt: number): BalanceSheet => ({
  equity,
  mv,
  funded: new Set(funded) as BalanceSheet['funded'],
  debt
});

// ----- 1. lot exit replays on a shifted path -----

const replayCache = new Map<
  string,
  { exitDate: string; reason: string; price: number; netPerNotional: number; stopActive: boolean }
>();

export const replayLotExit = (ds: Dataset, lot: RealLot, config: RunConfig, shockIndex: number, factor: number) => {
  const key = `${lot.symbol}:${lot.entryIndex}:${lot.entryBar}:${shockIndex}:${factor}:${config.phenotypes[lot.symbol].name}:${config.bookRate}`;
  const cached = replayCache.get(key);

  if (cached) {
    return cached;
  }

  const shifted = shiftDataset(ds, shockIndex, factor);
  const params = config.phenotypes[lot.symbol].params;
  const state: LotState = {
    entryPrice: lot.trade.entryPrice,
    shares: lot.trade.shares,
    investment: lot.trade.investment,
    entryTimestamp: ds.sTime[lot.entryIndex]!,
    holdTimestamp: ds.sTime[lot.entryIndex]!
  };
  const exit = new ExitManager(shifted, params, { stopFill: config.stopFill, marginInterestRate: config.bookRate });
  let outcome = { exitDate: 'open at end', reason: 'open', price: NaN, netPerNotional: NaN, stopActive: false };

  exit.onEntry(state, lot.entryIndex, lot.entryBar, lot.entryRawPrice);

  for (let s = lot.entryIndex + 1; s < shifted.sessionCount; s++) {
    const decision = exit.evaluate(state, s);

    if (decision) {
      const interest =
        state.investment * config.bookRate * ((shifted.sTime[s]! - state.entryTimestamp) / (365 * 86400));

      outcome = {
        exitDate: shifted.dates[s]!,
        reason: decision.reason,
        price: decision.price,
        netPerNotional: state.shares * decision.price - state.investment - interest,
        stopActive: decision.stopActive
      };
      break;
    }

    exit.afterSession(state, s);
  }

  if (outcome.reason === 'open') {
    const end = shifted.sessionCount - 1;
    const interest =
      state.investment * config.bookRate * ((shifted.sTime[end]! - state.entryTimestamp) / (365 * 86400));

    outcome.price = shifted.sClose[end]!;
    outcome.netPerNotional = state.shares * outcome.price - state.investment - interest;
  }

  replayCache.set(key, outcome);

  return outcome;
};

const staticSchedules: ScheduleKey[] = ['U35', 'U50', 'U60', 'L60', 'G60'];

export const entryShockRows = (base: string, result: RunResult, gaps: number[], rhos: number[]) => {
  const rows: Record<string, unknown>[] = [];

  for (const lot of result.lots) {
    const s = lot.entryIndex;
    const row = result.daily.find((candidate) => candidate.index === s);
    const next = s + 1;

    if (!row || next > result.endIndex) {
      continue;
    }

    const funded = row.owners.split('+').filter(Boolean);
    const sheet = sheetOf(row.equity, row.mv, funded, row.principal + row.interestLiability + row.fundingPayable);
    const historicalNet = lot.net;

    for (const g of gaps) {
      const replay = replayLotExit(result.universe.instruments[lot.symbol]!.ds, lot, result.config, next, 1 - g);
      const shockedNet = (replay.netPerNotional * lot.originalPrincipal) / protocol.notional;

      for (const rho of rhos) {
        const shocked = shockedSheet(sheet, g, rho);
        const record: Record<string, unknown> = {
          base,
          lot_id: lot.id,
          symbol: lot.symbol,
          entry_date: result.universe.dates[s],
          entry_price: lot.entryRawPrice,
          principal: lot.originalPrincipal,
          shock_date: result.universe.dates[next],
          gap: g,
          rho,
          pre_shock_equity: row.equity,
          pre_shock_lmv: row.lmv,
          debt: sheet.debt,
          equity_after_gap: shocked.equity,
          equity_loss_percent: 1 - shocked.equity / row.equity,
          equity_to_lmv_after:
            shocked.equity / (shocked.mv.VOOG + shocked.mv.VGT + shocked.mv.XBI + shocked.mv.XRT + shocked.mv.KRE),
          lot_exit_date: replay.exitDate,
          lot_exit_reason: replay.reason,
          lot_exit_price: replay.price,
          stop_active_at_exit: replay.stopActive,
          lot_net_shocked: shockedNet,
          lot_net_historical: historicalNet,
          lot_loss_percent_of_equity: -shockedNet / row.equity
        };

        for (const schedule of staticSchedules) {
          const distance = distanceOf(shocked, schedule);

          record[`excess_${schedule}`] = distance.excess;
          record[`ratio_${schedule}`] = distance.ratio;
          record[`call_${schedule}`] = distance.excess < 0;
        }

        rows.push(record);
      }
    }
  }

  return rows;
};

// ----- 2. requirement timing per lot -----

export const timingRows = (base: string, result: RunResult) => {
  const rows: Record<string, unknown>[] = [];
  const entries = result.events.filter((event) => event.kind === 'entry');

  for (const lot of result.lots) {
    const signal = result.signals.find(
      (candidate) => candidate.outcome === 'granted' && candidate.trade?.fundedLotId === lot.id
    );
    const event = entries.find((candidate) => candidate.lotId === lot.id);
    const holding = result.approaches.filter(
      (approach) =>
        approach.schedule === 'U35' &&
        approach.index >= lot.entryIndex &&
        approach.index <= (lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex)
    );
    const worst = holding.reduce<(typeof holding)[number] | undefined>(
      (low, approach) => (!low || approach.ratio < low.ratio ? approach : low),
      undefined
    );
    const record: Record<string, unknown> = {
      base,
      lot_id: lot.id,
      symbol: lot.symbol,
      decision_time: formatTime(lot.decisionTime),
      principal: lot.originalPrincipal,
      equity_at_decision: lot.equityAtDecision,
      fraction: lot.fraction,
      reg_t_maximum: signal?.regTMaximum ?? NaN,
      maximum_U50: signal?.maximumU50 ?? NaN,
      maximum_U60: signal?.maximumU60 ?? NaN,
      maximum_L60: signal?.maximumL60 ?? NaN,
      maximum_G60: signal?.maximumG60 ?? NaN,
      disallowed_U60: signal ? Math.max(0, lot.originalPrincipal - signal.maximumU60) : NaN,
      disallowed_L60: signal ? Math.max(0, lot.originalPrincipal - signal.maximumL60) : NaN,
      disallowed_G60: signal ? Math.max(0, lot.originalPrincipal - signal.maximumG60) : NaN,
      buying_power_used_reg_t: signal ? lot.originalPrincipal / signal.regTMaximum : NaN
    };

    if (event) {
      const funded = new Set<string>();

      for (const [symbol, shares] of Object.entries(event.lotShares)) {
        if (shares > 0) {
          funded.add(symbol);
        }
      }

      const sheet = sheetOf(
        event.equity,
        event.mv,
        funded,
        event.principal + event.interestLiability + event.fundingPayable
      );

      record.after_fill_equity = event.equity;
      record.after_fill_lmv = event.lmv;
      record.after_fill_homogeneous_break_even = homogeneousBreakEven(sheet);
      record.after_fill_funded_break_even = fundedBreakEven(sheet);

      for (const schedule of ['U60', 'L60', 'G60'] as ScheduleKey[]) {
        const distance = distanceOf(sheet, schedule);

        record[`after_fill_excess_${schedule}`] = distance.excess;
        record[`after_fill_ratio_${schedule}`] = distance.ratio;
        record[`after_fill_uniform_shock_${schedule}`] = distance.uniformShock;
      }
    }

    if (worst) {
      const sheet = sheetOf(worst.equity, worst.mv, worst.funded, worst.debt);

      record.worst_session = worst.date;
      record.worst_time = formatTime(worst.time);
      record.worst_equity_to_lmv = worst.equity / worst.lmv;

      for (const schedule of ['U60', 'L60', 'G60'] as ScheduleKey[]) {
        const distance = distanceOf(sheet, schedule);

        record[`worst_excess_${schedule}`] = distance.excess;
        record[`worst_ratio_${schedule}`] = distance.ratio;
        record[`worst_uniform_shock_${schedule}`] = distance.uniformShock;
        record[`worst_two_factor_rho1_${schedule}`] = distance.twoFactor[2]!.shock;
      }
    }

    rows.push(record);
  }

  return rows;
};

// ----- the closest point of a run, with every break-even -----

export const closestPointRows = (base: string, result: RunResult) =>
  (['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'] as ScheduleKey[]).map((schedule) => {
    const approaches = result.approaches.filter((approach) => approach.schedule === schedule);
    const closest = approaches.reduce((low, approach) => (approach.ratio < low.ratio ? approach : low), approaches[0]!);
    const sheet = sheetOf(closest.equity, closest.mv, closest.funded, closest.debt);
    const distance = distanceOf(sheet, schedule);

    return {
      base,
      schedule,
      date: closest.date,
      time: formatTime(closest.time),
      lots: closest.lots,
      equity: closest.equity,
      lmv: closest.lmv,
      debt: closest.debt,
      required: distance.required,
      excess: distance.excess,
      ratio: distance.ratio,
      equity_to_lmv: closest.equity / closest.lmv,
      homogeneous_break_even: homogeneousBreakEven(sheet),
      funded_break_even: fundedBreakEven(sheet),
      uniform_shock_to_call: distance.uniformShock,
      two_factor_rho0: distance.twoFactor[0]!.shock,
      two_factor_rho05: distance.twoFactor[1]!.shock,
      two_factor_rho1: distance.twoFactor[2]!.shock,
      account_fall_to_call: distance.accountFallToCall,
      stale_seconds: closest.staleSeconds,
      mv_voog: closest.mv.VOOG,
      mv_vgt: closest.mv.VGT,
      mv_xbi: closest.mv.XBI,
      mv_xrt: closest.mv.XRT,
      mv_kre: closest.mv.KRE
    };
  });

// The joint (gap, requirement) break-even grid at a balance sheet: for each requirement level and scope, the
// traded-ETF gap g that triggers a call when the other holdings fall ρg.
export const breakEvenGrid = (base: string, label: string, sheet: BalanceSheet) =>
  (['U35', 'U50', 'U60', 'L50', 'L60', 'G50', 'G60'] as ScheduleKey[]).map((schedule) => {
    const distance = distanceOf(sheet, schedule);

    return {
      base,
      point: label,
      schedule,
      excess: distance.excess,
      ratio: distance.ratio,
      uniform: distance.uniformShock,
      rho0: distance.twoFactor[0]!.shock,
      rho05: distance.twoFactor[1]!.shock,
      rho1: distance.twoFactor[2]!.shock
    };
  });

// ----- 3. full-path replays -----

export interface PathRun {
  base: string;
  date: string;
  index: number;
  gap: number;
  rho: number;
  requirement: ScheduleKey;
  liquidation: string;
  slippageBps: number;
  calls: number;
  forcedSales: number;
  lotsSold: number;
  coreSold: number;
  endEquity: number;
  baseEndEquity: number;
  endEquityChange: number;
  dailyDrawdownPercent: number;
  minRatioAfter: number;
  minRatioAfterTime: string;
  minExcessAfter: number;
  minEquityToLmvAfter: number;
  fundedLots: number;
  baseFundedLots: number;
  strategyNet: number;
  baseStrategyNet: number;
  lotsOpenAtShock: string;
  firstCall: string;
}

export const pathRun = (
  base: string,
  universe: Universe,
  config: RunConfig,
  baseResult: RunResult,
  index: number,
  gap: number,
  rho: number,
  requirement: ScheduleKey,
  liquidation: Liquidation,
  label: string
): { row: PathRun; result: RunResult } => {
  const result = runAllocator(universe, {
    ...config,
    key: `${base}-path-${universe.dates[index]}-g${gap}-r${rho}-${requirement}-${label}`,
    shocks: [{ index, factors: { VGT: 1 - gap, XBI: 1 - gap, XRT: 1 - gap, KRE: 1 - gap, VOOG: 1 - rho * gap } }],
    requirementChanges: [{ index, schedule: requirement }],
    liquidation,
    passiveSchedules: ['U35', requirement]
  });
  const after = result.approaches.filter((approach) => approach.schedule === requirement && approach.index >= index);
  const worst = after.reduce<(typeof after)[number] | undefined>(
    (low, approach) => (!low || approach.ratio < low.ratio ? approach : low),
    undefined
  );
  const summary = summarize(result);
  const baseSummary = summarize(baseResult);
  const openAtShock = baseResult.lots.filter(
    (lot) => lot.entryIndex < index && (lot.exitIndex < 0 || lot.exitIndex >= index)
  );

  return {
    row: {
      base,
      date: universe.dates[index]!,
      index,
      gap,
      rho,
      requirement,
      liquidation: label,
      slippageBps: liquidation.slippageBps,
      calls: result.maintenanceEvents.filter((event) => event.kind === 'call').length,
      forcedSales: result.forcedLiquidations.length,
      lotsSold: result.forcedLiquidations.filter((row) => row.reason === 'lot sold').length,
      coreSold: result.forcedLiquidations
        .filter((row) => row.reason === 'core sold')
        .reduce((total, row) => total + row.proceeds, 0),
      endEquity: summary.endEquity,
      baseEndEquity: baseSummary.endEquity,
      endEquityChange: summary.endEquity - baseSummary.endEquity,
      dailyDrawdownPercent: summary.dailyDrawdownPercent,
      minRatioAfter: worst?.ratio ?? NaN,
      minRatioAfterTime: worst ? formatTime(worst.time) : '',
      minExcessAfter: worst?.excess ?? NaN,
      minEquityToLmvAfter: worst ? worst.equity / worst.lmv : NaN,
      fundedLots: summary.fundedLots,
      baseFundedLots: baseSummary.fundedLots,
      strategyNet: summary.net,
      baseStrategyNet: baseSummary.net,
      lotsOpenAtShock: openAtShock.map((lot) => `${lot.symbol}#${lot.id}`).join('+'),
      firstCall: formatTime(result.maintenanceEvents.find((event) => event.kind === 'call')?.time ?? NaN)
    },
    result
  };
};

export const primaryLiquidation: Liquidation = {
  monitoring: 'intraday',
  timing: 'immediate',
  order: 'lot-first',
  slippageBps: 0
};

export const alternativeLiquidations = (slippage: number): { label: string; liquidation: Liquidation }[] => [
  {
    label: 'close-next-open',
    liquidation: { monitoring: 'close', timing: 'next-open', order: 'lot-first', slippageBps: 0 }
  },
  {
    label: 'close-deadline',
    liquidation: { monitoring: 'close', timing: 'deadline', order: 'lot-first', slippageBps: 0 }
  },
  {
    label: 'intraday-halt',
    liquidation: { monitoring: 'intraday', timing: 'halt', order: 'lot-first', slippageBps: 0 }
  },
  {
    label: 'intraday-core-first',
    liquidation: { monitoring: 'intraday', timing: 'immediate', order: 'core-first', slippageBps: 0 }
  },
  { label: `intraday-immediate-slip${slippage}`, liquidation: { ...primaryLiquidation, slippageBps: slippage } }
];

// ----- 9. the Vanguard 30-day rule (counts only) -----

export const vanguardEtfRuleRow = (base: string, result: RunResult) => {
  const vgtLots = result.lots.filter((lot) => lot.symbol === 'VGT');
  const purchases = result.events.filter(
    (event) =>
      (event.kind === 'reinvest' || event.kind === 'rebalance' || event.kind === 'dividend paid') && event.shares > 0
  );
  const dollars = (event: (typeof purchases)[number]) => event.shares * event.price;
  // The largest value of Vanguard-ETF shares (VGT lots + core purchases) bought within the previous 30 calendar days.
  let largestFresh = 0;
  let largestFreshDate = '';
  let largestFreshShare = 0;

  for (const row of result.daily) {
    const time = Date.parse(row.date) / 1000;
    let fresh = 0;

    for (const event of purchases) {
      if (event.time <= time + 86400 && event.time > time - 30 * 86400) {
        fresh += event.shares * row.closes[event.security as 'VOOG' | 'VGT'];
      }
    }

    for (const lot of vgtLots) {
      if (
        lot.entryTime <= time + 86400 &&
        lot.entryTime > time - 30 * 86400 &&
        (lot.exitIndex < 0 || lot.exitIndex >= row.index)
      ) {
        fresh += lot.shares * row.closes.VGT;
      }
    }

    if (fresh > largestFresh) {
      largestFresh = fresh;
      largestFreshDate = row.date;
      largestFreshShare = row.lmv > 0 ? fresh / row.lmv : 0;
    }
  }

  return {
    base,
    vgt_lots: vgtLots.length,
    vgt_lot_principal: vgtLots.reduce((total, lot) => total + lot.originalPrincipal, 0),
    vgt_lots_held_under_30_days: vgtLots.filter((lot) => {
      const end = lot.exitIndex >= 0 ? lot.exitTime : Infinity;

      return end - lot.entryTime < 30 * 86400;
    }).length,
    vanguard_etf_purchases: purchases.length,
    vanguard_etf_purchase_dollars: purchases.reduce((total, event) => total + dollars(event), 0),
    largest_fresh_vanguard_etf_value: largestFresh,
    largest_fresh_date: largestFreshDate,
    largest_fresh_share_of_lmv: largestFreshShare
  };
};

// ----- the runner -----

export const runStress = async (
  universe: Universe,
  parts: readonly string[] = ['static', 'paths', 'sensitivities']
) => {
  const config = await readJson<StressConfig>(configFile);
  const settings = config.stress;
  const vanguard = vanguardModels(config);
  const bases = new Map<string, { config: RunConfig; result: RunResult }>();
  const entryRows: Record<string, unknown>[] = [];
  const timing: Record<string, unknown>[] = [];
  const closest: Record<string, unknown>[] = [];
  const grid: Record<string, unknown>[] = [];
  const etfRule: Record<string, unknown>[] = [];

  await fs.ensureDir(stressDir());

  for (const base of stressSet()) {
    const runConfig = await base.build();
    const result = runAllocator(universe, runConfig);

    bases.set(base.key, { config: runConfig, result });
    entryRows.push(...entryShockRows(base.key, result, settings.entryGaps, settings.correlations));
    timing.push(...timingRows(base.key, result));

    const points = closestPointRows(base.key, result);

    closest.push(...points);

    const gridPoints = new Map<number, string[]>(); // closest-approach time → the schedules it is closest under

    for (const point of points.filter((candidate) => ['U35', 'U60', 'G60', 'L60'].includes(candidate.schedule))) {
      const approach = result.approaches
        .filter((candidate) => candidate.schedule === point.schedule)
        .reduce((low, candidate) => (candidate.ratio < low.ratio ? candidate : low));
      const seen = gridPoints.get(approach.time);

      if (seen) {
        seen.push(point.schedule);
        continue;
      }

      gridPoints.set(approach.time, [point.schedule]);
      grid.push(
        ...breakEvenGrid(base.key, `closest under ${point.schedule} (${point.date})`, {
          equity: approach.equity,
          mv: approach.mv,
          funded: new Set(approach.funded),
          debt: approach.debt
        })
      );
    }

    etfRule.push(vanguardEtfRuleRow(base.key, result));
    log(
      `stress base ${base.key}: ${result.lots.length} lots, closest U35 ratio ${result.minimum.U35!.ratio.toFixed(4)}`
    );
  }

  await fs.outputFile(stressDir('entry_shocks.csv'), toCsv(entryRows));
  await fs.outputFile(stressDir('requirement_timing.csv'), toCsv(timing));
  await fs.outputFile(stressDir('closest_points.csv'), toCsv(closest));
  await fs.outputFile(stressDir('break_even_grid.csv'), toCsv(grid));
  await fs.outputFile(stressDir('vanguard_etf_30_day_rule.csv'), toCsv(etfRule));

  // Top-20 closest approaches of every stress-set run, per schedule.
  const top: Record<string, unknown>[] = [];

  for (const [key, { result }] of bases) {
    for (const schedule of ['U35', 'U60', 'L60', 'G60'] as ScheduleKey[]) {
      const ranked = result.approaches
        .filter((approach) => approach.schedule === schedule)
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 20);

      ranked.forEach((approach, rank) => {
        const sheet = sheetOf(approach.equity, approach.mv, approach.funded, approach.debt);
        const distance = distanceOf(sheet, schedule);

        top.push({
          base: key,
          schedule,
          rank: rank + 1,
          date: approach.date,
          time: formatTime(approach.time),
          lots: approach.lots || 'none',
          equity: approach.equity,
          lmv: approach.lmv,
          debt: approach.debt,
          required: distance.required,
          excess: distance.excess,
          ratio: distance.ratio,
          equity_to_lmv: approach.equity / approach.lmv,
          homogeneous_break_even: homogeneousBreakEven(sheet),
          funded_break_even: fundedBreakEven(sheet),
          uniform_shock_to_call: distance.uniformShock,
          two_factor_rho1: distance.twoFactor[2]!.shock,
          two_factor_rho05: distance.twoFactor[1]!.shock,
          two_factor_rho0: distance.twoFactor[0]!.shock,
          account_fall_to_call: distance.accountFallToCall,
          stale_seconds: approach.staleSeconds
        });
      });
    }
  }

  await fs.outputFile(stressDir('top20_closest_approaches.csv'), toCsv(top));

  // 3. Full-path replays.
  if (parts.includes('paths')) {
    const ruleDates = ['B', 'C-all-primary-shadow'].map((key) => {
      const result = bases.get(key)!.result;
      const index = sessionIndexOf(result.universe, formatDate(result.minimum.U60!.time));

      return { key, index: Math.min(index + 1, result.endIndex) };
    });
    const dates = [
      ...settings.fullPathDates.map((date) => ({ label: date, index: sessionIndexOf(universe, date) })),
      ...ruleDates.map((rule) => ({ label: `rule:${rule.key}`, index: rule.index }))
    ];
    const pathRows: PathRun[] = [];
    const breachRows: PathRun[] = [];

    await writeJson(
      stressDir('full_path_dates.json'),
      dates.map((date) => ({ ...date, date: universe.dates[date.index] }))
    );

    for (const [key, { config: runConfig, result }] of bases) {
      for (const date of dates) {
        for (const gap of settings.fullPathGaps) {
          for (const rho of settings.fullPathCorrelations) {
            for (const requirement of settings.fullPathRequirements) {
              const { row } = pathRun(
                key,
                universe,
                runConfig,
                result,
                date.index,
                gap,
                rho,
                requirement,
                primaryLiquidation,
                'intraday-immediate'
              );

              pathRows.push(row);

              if (row.calls > 0) {
                for (const alternative of alternativeLiquidations(settings.forcedSaleSlippageBps)) {
                  breachRows.push(
                    pathRun(
                      key,
                      universe,
                      runConfig,
                      result,
                      date.index,
                      gap,
                      rho,
                      requirement,
                      alternative.liquidation,
                      alternative.label
                    ).row
                  );
                }
              }
            }
          }
        }
      }

      log(
        `full-path replays of ${key}: ${pathRows.filter((row) => row.base === key).length} runs, ${pathRows.filter((row) => row.base === key && row.calls > 0).length} with a call`
      );
    }

    await fs.outputFile(stressDir('full_path_replays.csv'), toCsv(pathRows as unknown as Record<string, unknown>[]));
    await fs.outputFile(
      stressDir('full_path_breach_alternatives.csv'),
      toCsv(breachRows as unknown as Record<string, unknown>[])
    );
    await writeJson(stressDir('full_path_summary.json'), {
      runs: pathRows.length,
      runsWithCalls: pathRows.filter((row) => row.calls > 0).length,
      breachAlternatives: breachRows.length,
      dates: dates.map((date) => ({ ...date, date: universe.dates[date.index] }))
    });
  }

  if (!parts.includes('sensitivities')) {
    return;
  }

  // 4–8. Sensitivities.
  const sensitivities: { key: string; base: string; variant: string; build: () => Promise<RunConfig> }[] = [];
  const primaryC = (overrides: Partial<RunConfig>) =>
    allocatorConfig('portfolio', combinationOf('all-primary'), 'shadow', overrides);
  const primaryF = (overrides: Partial<RunConfig>) =>
    allocatorConfig('fixed', combinationOf('all-primary'), 'shadow', overrides);
  const portfolioBases: [string, (overrides: Partial<RunConfig>) => Promise<RunConfig>][] = [
    ['B', (overrides) => scenarioBConfig(overrides)],
    ['C-all-primary-shadow', primaryC]
  ];
  const fixedBases: [string, (overrides: Partial<RunConfig>) => Promise<RunConfig>][] = [
    ['F-VGT', (overrides) => fixedVgtConfig(overrides)],
    ['F-all-primary-shadow', primaryF]
  ];

  for (const [base, build] of [...portfolioBases, ...fixedBases]) {
    for (const bps of settings.costsBps.filter((value) => value > 0)) {
      sensitivities.push({
        key: `${base}-cost${bps}`,
        base,
        variant: `${bps} bps per side`,
        build: () => build({ costBps: bps })
      });
    }

    sensitivities.push({
      key: `${base}-nextopen`,
      base,
      variant: 'next-open stop fills',
      build: () => build({ stopFill: 'next-open' })
    });
    sensitivities.push({
      key: `${base}-stopslip${settings.stopSlippageBps}`,
      base,
      variant: `+${settings.stopSlippageBps} bps adverse slippage on stop fills`,
      build: () => build({ stopSlippageBps: settings.stopSlippageBps })
    });

    for (const rate of [0.08, 0.14]) {
      sensitivities.push({
        key: `${base}-rate${Math.round(rate * 100)}`,
        base,
        variant: `${Math.round(rate * 100)}% simple (books and ledger)`,
        build: () => build({ interest: { kind: 'simple', rate }, bookRate: rate })
      });
    }
  }

  for (const [base, build] of portfolioBases) {
    sensitivities.push({
      key: `${base}-vanguard-standard`,
      base,
      variant: 'Vanguard Standard tiers, actual/360, monthly capitalization (books at 11%)',
      build: () => build({ interest: vanguard.standard })
    });
    sensitivities.push({
      key: `${base}-vanguard-standard-book`,
      base,
      variant: 'Vanguard Standard tiers (books at 10.75% × 365/360)',
      build: () => build({ interest: vanguard.standard, bookRate: (0.1075 * 365) / 360 })
    });
    sensitivities.push({
      key: `${base}-vanguard-preferred`,
      base,
      variant: 'Vanguard Preferred 7.00% while equity ≥ $1M (qualifying-asset proxy), else Standard (books at 11%)',
      build: () => build({ interest: vanguard.preferred })
    });
    sensitivities.push({
      key: `${base}-lots-price-only`,
      base,
      variant: 'every lot price-only (no VGT lot distributions)',
      build: () => build({ lotDividends: false })
    });
    sensitivities.push({
      key: `${base}-rebalance`,
      base,
      variant: 'full 60/40 core rebalance after each exit',
      build: () => build({ corePolicy: 'rebalance' })
    });
  }

  for (const [base, build] of [
    ...portfolioBases,
    [
      'C-all-lowDd-shadow',
      (overrides: Partial<RunConfig>) => allocatorConfig('portfolio', combinationOf('all-lowDd'), 'shadow', overrides)
    ] as [string, (overrides: Partial<RunConfig>) => Promise<RunConfig>]
  ]) {
    for (const fraction of [0.1, 0.15, 0.25]) {
      sensitivities.push({
        key: `${base}-f${Math.round(fraction * 100)}`,
        base,
        variant: `${Math.round(fraction * 100)}% of equity (risk-only)`,
        build: () => build({ fraction })
      });
    }
  }

  const sensitivitySummaries: (Summary & { base: string; variant: string })[] = [];
  const tradeDiffs: Record<string, unknown>[] = [];
  const baseResults = new Map<string, RunResult>();

  for (const [base, build] of [...portfolioBases, ...fixedBases]) {
    baseResults.set(base, runAllocator(universe, await build({})));
  }

  for (const sensitivity of sensitivities) {
    const runConfig = await sensitivity.build();
    const result = runAllocator(universe, {
      ...runConfig,
      key: sensitivity.key,
      label: `${sensitivity.base}: ${sensitivity.variant}`
    });
    const summary = summarize(result);

    sensitivitySummaries.push({ ...summary, base: sensitivity.base, variant: sensitivity.variant });

    const baseResult = baseResults.get(sensitivity.base);

    if (baseResult && /rate|vanguard|cost|nextopen|stopslip/.test(sensitivity.key)) {
      const signature = (trade: RunResult['trades'][number]) =>
        `${trade.symbol} ${formatDate(trade.entryTime)}→${trade.exitIndex >= 0 ? result.universe.dates[trade.exitIndex] : 'open'} ${trade.exitReason}`;
      const before = new Set(baseResult.trades.map(signature));
      const after = new Set(result.trades.map(signature));

      tradeDiffs.push({
        key: sensitivity.key,
        base: sensitivity.base,
        variant: sensitivity.variant,
        virtual_trades: result.trades.length,
        base_virtual_trades: baseResult.trades.length,
        only_in_variant: [...after].filter((trade) => !before.has(trade)).join('; '),
        only_in_base: [...before].filter((trade) => !after.has(trade)).join('; '),
        funded_lots: result.lots.length,
        base_funded_lots: baseResult.lots.length
      });
    }

    log(`sensitivity ${sensitivity.key}: net ${Math.round(summary.net)}, end ${Math.round(summary.endEquity)}`);
  }

  await fs.outputFile(
    stressDir('sensitivities.csv'),
    toCsv(
      sensitivitySummaries.map((summary) => ({ base: summary.base, variant: summary.variant, ...summaryRow(summary) }))
    )
  );
  await fs.outputFile(stressDir('sensitivity_trade_differences.csv'), toCsv(tradeDiffs));

  // 7. The analytic yield bound for price-only sector lots.
  const yieldRows: Record<string, unknown>[] = [];

  for (const key of ['C-all-primary-shadow', 'C-all-lowDd-shadow']) {
    const { result } = bases.get(key)!;
    const sectorDollarDays = tradeRecords(result)
      .filter((row) => row.symbol !== 'VGT')
      .reduce((total, row) => total + row.principal * row.hold_days, 0);

    for (const y of [0.01, 0.02, 0.03]) {
      yieldRows.push({
        base: key,
        annual_yield: y,
        sector_lot_dollar_days: sectorDollarDays,
        omitted_distributions_bound: (y * sectorDollarDays) / 365,
        note: 'ANALYTIC BOUND: y × principal × days held ÷ 365 over funded XBI/XRT/KRE lots; not documented cash flows'
      });
    }
  }

  await fs.outputFile(stressDir('sector_yield_bound.csv'), toCsv(yieldRows));

  // Per-symbol attribution of the stress set (for the reports).
  await fs.outputFile(
    stressDir('stress_set_attribution.csv'),
    toCsv([...bases].flatMap(([key, { result }]) => attribution(result).map((row) => ({ base: key, ...row }))))
  );

  await writeJson(stressDir('stress_summary.json'), {
    generatedAt: new Date().toISOString(),
    entryShockRows: entryRows.length,
    entryShockCalls: Object.fromEntries(
      staticSchedules.map((schedule) => [schedule, entryRows.filter((row) => row[`call_${schedule}`]).length])
    ),
    sensitivities: sensitivitySummaries.length
  });

  log(`stress written to ${path.relative('.', stressDir())}`);
};
