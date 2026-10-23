// Track III: deployment-risk tests on the frozen strategies under dynamic sizing (PROTOCOL.md §7). Nothing is tuned.
//   gapTable        per-trade gap-through-stop tests: VGT gaps down at the open of a chosen session while a lot is open,
//                   the lot replayed under its own exit rules on the shifted path, the portfolio hit from the ledger
//                   row at the previous close (VOOG falling ρ × the gap).
//   correlated      uniform falls in both ETFs from each session's balance sheet: the fall that reaches each
//                   maintenance threshold, and the equity after 20/30/40/50% falls at the worst points.
//   interestSplit   financing-only recomputation of a run's lots at another rate versus the actual rerun.
import type { ProgramData } from './data.ts';
import type { ScenarioResult } from './engine.ts';
import { replayLot } from './replay.ts';
import { interestOn, strategies } from './strategy.ts';
import { shiftDataset } from './data.ts';

export const gapSizes = [0.05, 0.1, 0.2, 0.3];
export const correlations = [0, 0.5, 1];
export const maintenanceThresholds = [0.25, 0.35, 0.5];

export interface GapRecord extends Record<string, unknown> {
  scenario: string;
  lot: number;
  owner: string;
  entry_date: string;
  entry_price: number;
  principal: number;
  shock_case: 'after entry (stop inactive)' | 'first active stop' | 'deepest core drawdown while open';
  shock_date: string;
  stop_active_before_shock: boolean;
  stop_level_before_shock: number;
  gap: number;
  voog_fall: number;
  pre_shock_equity: number;
  pre_shock_lmv: number;
  pre_shock_debt: number;
  equity_after_gap: number;
  equity_loss: number;
  equity_loss_percent: number;
  equity_to_lmv_after_gap: number;
  breach_25: boolean;
  breach_35: boolean;
  breach_50: boolean;
  sale_to_restore_35: number;
  sale_to_restore_50: number;
  lot_exit_date: string;
  lot_exit_price: number;
  lot_exit_reason: string;
  lot_net_shocked: number;
  lot_net_historical: number;
  lot_loss_percent_of_pre_shock_equity: number;
}

export const gapTable = (data: ProgramData, result: ScenarioResult): GapRecord[] => {
  const { ds } = data;
  const rows: GapRecord[] = [];
  const rate = result.config.rate;

  for (const lot of result.lots) {
    const last = lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex;

    if (lot.entryIndex + 1 > last) {
      continue;
    }

    const params = strategies[lot.owner];
    const cases: { label: GapRecord['shock_case']; index: number }[] = [
      { label: 'after entry (stop inactive)', index: lot.entryIndex + 1 }
    ];
    const firstActive = lot.exit.stopFirstActiveIndex;

    if (firstActive > lot.entryIndex && firstActive <= last) {
      cases.push({ label: 'first active stop', index: firstActive });
    }

    let deepest = -1;
    let deepestEquity = Infinity;

    for (let s = lot.entryIndex + 1; s <= last; s++) {
      const row = result.daily[s]!;

      if (row.equity < deepestEquity) {
        deepestEquity = row.equity;
        deepest = s;
      }
    }

    if (deepest > 0 && deepest !== cases[0]!.index && deepest !== firstActive) {
      cases.push({ label: 'deepest core drawdown while open', index: deepest });
    }

    for (const shock of cases) {
      const previous = result.daily[shock.index - 1]!;
      const entry = {
        entryIndex: lot.entryIndex,
        entryBar: lot.entryBar,
        entryPrice: lot.entryPrice,
        shares: lot.shares,
        principal: lot.principal,
        entryTimestamp: lot.entryTimestamp
      };
      // The stop level before the shock session (through the previous session's daily update) and whether the stop
      // is eligible on the shock session, both from the unshocked path: the eligibility is decided before the open.
      const stopBefore = replayLot(ds, entry, params, rate, result.config.stopFill, shock.index - 1).stopAtEnd;
      const probe = replayLot(ds, entry, params, rate, result.config.stopFill, shock.index);
      const stopActive = probe.stopFirstActiveIndex >= 0 && probe.stopFirstActiveIndex <= shock.index;

      for (const gap of gapSizes) {
        const shocked = shiftDataset(ds, shock.index, 1 - gap);
        const outcome = replayLot(shocked, entry, params, rate, result.config.stopFill, result.endIndex);

        for (const rho of correlations) {
          const voogFall = rho * gap;
          const vgtValue = (previous.vgtCoreShares + previous.lotShares) * previous.vgtClose;
          const debt = previous.principal + previous.accruedInterest + previous.fundingPayable;
          const lmvAfter = previous.voogValue * (1 - voogFall) + vgtValue * (1 - gap);
          const equityAfter = lmvAfter + previous.cash + previous.receivables - debt;
          const ratio = lmvAfter > 0 ? equityAfter / lmvAfter : 1;
          const restore = (m: number) => Math.max(0, lmvAfter - equityAfter / (m + 0.05));

          rows.push({
            scenario: result.config.key,
            lot: lot.id,
            owner: lot.owner,
            entry_date: ds.dates[lot.entryIndex]!,
            entry_price: lot.entryPrice,
            principal: lot.principal,
            shock_case: shock.label,
            shock_date: ds.dates[shock.index]!,
            stop_active_before_shock: stopActive,
            stop_level_before_shock: stopBefore,
            gap,
            voog_fall: voogFall,
            pre_shock_equity: previous.equity,
            pre_shock_lmv: previous.lmv,
            pre_shock_debt: debt,
            equity_after_gap: equityAfter,
            equity_loss: previous.equity - equityAfter,
            equity_loss_percent: 1 - equityAfter / previous.equity,
            equity_to_lmv_after_gap: ratio,
            breach_25: ratio < 0.25,
            breach_35: ratio < 0.35,
            breach_50: ratio < 0.5,
            sale_to_restore_35: ratio < 0.35 ? restore(0.35) : 0,
            sale_to_restore_50: ratio < 0.5 ? restore(0.5) : 0,
            lot_exit_date: outcome.exitIndex >= 0 ? ds.dates[outcome.exitIndex]! : 'open',
            lot_exit_price: outcome.exitPrice,
            lot_exit_reason: outcome.reason,
            lot_net_shocked: outcome.net,
            lot_net_historical: lot.netProfit,
            lot_loss_percent_of_pre_shock_equity: -outcome.net / previous.equity
          });
        }
      }
    }
  }

  return rows;
};

export interface CorrelatedRecord extends Record<string, unknown> {
  scenario: string;
  date: string;
  context: string;
  equity: number;
  lmv: number;
  debt: number;
  equity_to_lmv: number;
  fall_to_reach_25: number;
  fall_to_reach_35: number;
  fall_to_reach_50: number;
  equity_after_20: number;
  equity_after_30: number;
  equity_after_40: number;
  equity_after_50: number;
  ratio_after_20: number;
  ratio_after_30: number;
  ratio_after_40: number;
  ratio_after_50: number;
  sale_after_30_for_35: number;
  sale_after_30_for_50: number;
}

// The uniform fall in both ETFs that takes equity ÷ LMV down to m, from a balance sheet: equity' = LMV(1−f) + cash
// + receivables − debt = m × LMV(1−f)  ⇒  f = 1 − (debt − cash − receivables) / ((1 − m) × LMV).
export const fallToReach = (lmv: number, cash: number, receivables: number, debt: number, m: number) => {
  const fall = 1 - (debt - cash - receivables) / ((1 - m) * lmv);

  return Math.min(1, Math.max(0, fall));
};

export const correlatedStress = (data: ProgramData, result: ScenarioResult): CorrelatedRecord[] => {
  const rows: CorrelatedRecord[] = [];
  const record = (index: number, context: string) => {
    const row = result.daily[index]!;
    const debt = row.principal + row.accruedInterest + row.fundingPayable;
    const after = (fall: number) => {
      const lmv = row.lmv * (1 - fall);
      const equity = lmv + row.cash + row.receivables - debt;

      return { equity, ratio: lmv > 0 ? equity / lmv : 1, lmv };
    };
    const a20 = after(0.2);
    const a30 = after(0.3);
    const a40 = after(0.4);
    const a50 = after(0.5);

    rows.push({
      scenario: result.config.key,
      date: row.date,
      context,
      equity: row.equity,
      lmv: row.lmv,
      debt,
      equity_to_lmv: row.equityToLmv,
      fall_to_reach_25: fallToReach(row.lmv, row.cash, row.receivables, debt, 0.25),
      fall_to_reach_35: fallToReach(row.lmv, row.cash, row.receivables, debt, 0.35),
      fall_to_reach_50: fallToReach(row.lmv, row.cash, row.receivables, debt, 0.5),
      equity_after_20: a20.equity,
      equity_after_30: a30.equity,
      equity_after_40: a40.equity,
      equity_after_50: a50.equity,
      ratio_after_20: a20.ratio,
      ratio_after_30: a30.ratio,
      ratio_after_40: a40.ratio,
      ratio_after_50: a50.ratio,
      sale_after_30_for_35: Math.max(0, a30.lmv - a30.equity / 0.4),
      sale_after_30_for_50: Math.max(0, a30.lmv - a30.equity / 0.55)
    });
  };

  // The worst balance sheet overall and per year (lowest equity ÷ LMV), plus the highest-debt session.
  let worst = -1;
  let worstRatio = Infinity;
  let highestDebt = -1;
  let highestDebtValue = -Infinity;
  const worstByYear = new Map<string, { index: number; ratio: number }>();

  result.daily.forEach((row, index) => {
    if (row.equityToLmv < worstRatio) {
      worstRatio = row.equityToLmv;
      worst = index;
    }

    const debt = row.principal + row.accruedInterest;

    if (debt > highestDebtValue) {
      highestDebtValue = debt;
      highestDebt = index;
    }

    const year = row.date.slice(0, 4);
    const current = worstByYear.get(year);

    if (!current || row.equityToLmv < current.ratio) {
      worstByYear.set(year, { index, ratio: row.equityToLmv });
    }
  });

  if (worst >= 0) {
    record(worst, 'lowest equity ÷ LMV of the run');
  }

  if (highestDebt >= 0 && highestDebt !== worst) {
    record(highestDebt, 'highest debt of the run');
  }

  for (const [year, { index }] of [...worstByYear.entries()].sort()) {
    if (index !== worst && index !== highestDebt) {
      record(index, `lowest equity ÷ LMV of ${year}`);
    }
  }

  return rows;
};

export interface InterestSplit {
  scenario: string;
  from_rate: number;
  to_rate: number;
  net_at_from_rate: number;
  financing_only_net: number; // the from-rate trades with interest recomputed at the to-rate
  actual_net_at_to_rate: number;
  financing_effect: number;
  timing_effect: number;
  trades_from: number;
  trades_to: number;
  changed_exits: number; // trades of the from-rate run whose exit differs in the to-rate run
}

export const interestSplit = (data: ProgramData, from: ScenarioResult, to: ScenarioResult): InterestSplit => {
  const { ds } = data;
  const fromRate = from.config.rate;
  const toRate = to.config.rate;
  const financingOnly = from.lots.reduce((total, lot) => {
    const last = lot.exitIndex >= 0 ? lot.exitIndex : from.endIndex;
    const price = lot.exitIndex >= 0 ? lot.exitPrice : ds.sClose[from.endIndex]!;

    return total + lot.shares * price - lot.principal - interestOn(lot, toRate, ds.sTime[last]!);
  }, 0);
  const netFrom = from.lots.reduce((total, lot) => total + lot.netProfit, 0);
  const netTo = to.lots.reduce((total, lot) => total + lot.netProfit, 0);
  let changed = 0;

  for (const lot of from.lots) {
    const match = to.lots.find((other) => other.entryIndex === lot.entryIndex && other.entryBar === lot.entryBar);

    if (!match || match.exitIndex !== lot.exitIndex || match.exitBar !== lot.exitBar) {
      changed++;
    }
  }

  return {
    scenario: from.config.key,
    from_rate: fromRate,
    to_rate: toRate,
    net_at_from_rate: netFrom,
    financing_only_net: financingOnly,
    actual_net_at_to_rate: netTo,
    financing_effect: financingOnly - netFrom,
    timing_effect: netTo - financingOnly,
    trades_from: from.lots.length,
    trades_to: to.lots.length,
    changed_exits: changed
  };
};
