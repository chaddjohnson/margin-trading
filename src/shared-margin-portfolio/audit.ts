// Independent recomputation of a scenario from its event ledger and daily rows, without the Account class: share
// counts and cash from the events' deltas, equity from the logged prices, every lot's interest and net from first
// principles, dividend entitlements from the distribution ledger, and the daily balance sheet identity.
import type { ProgramData } from './data.ts';
import type { ScenarioResult } from './engine.ts';
import { secondsPerYear } from './strategy.ts';

export interface LedgerAudit {
  scenario: string;
  checks: number;
  failures: string[];
}

export const auditLedger = (data: ProgramData, result: ScenarioResult, tolerance = 0.01): LedgerAudit => {
  const { ds, distributions } = data;
  const failures: string[] = [];
  let checks = 0;
  const check = (label: string, a: number, b: number, tol = tolerance) => {
    checks++;

    if (!(Math.abs(a - b) <= tol * Math.max(1, Math.abs(a) / 1e6))) {
      failures.push(`${label}: ${a} vs ${b}`);
    }
  };

  // 1. Holdings and cash from deltas.
  const start = result.events[0]!;
  let voog = start.voogShares;
  let vgtCore = start.vgtCoreShares;
  let lotShares = start.lotShares;
  let cash = start.cash;

  for (const event of result.events.slice(1)) {
    cash += event.cashDelta;

    if (event.kind === 'entry') {
      lotShares += event.shares;
    } else if (event.kind === 'exit') {
      lotShares += event.shares; // negative
    } else if (
      event.kind === 'forced sale' ||
      event.kind === 'reinvest' ||
      event.kind === 'fund loss' ||
      event.kind === 'rebalance' ||
      event.kind === 'dividend paid'
    ) {
      if (event.etf === 'VOOG') {
        voog += event.shares;
      } else if (event.etf === 'VGT') {
        vgtCore += event.shares;
      }
    }

    check(`${event.date} ${event.kind} #${event.seq} VOOG shares`, voog, event.voogShares, 1e-6);
    check(`${event.date} ${event.kind} #${event.seq} VGT core shares`, vgtCore, event.vgtCoreShares, 1e-6);
    check(`${event.date} ${event.kind} #${event.seq} lot shares`, lotShares, event.lotShares, 1e-6);
    check(`${event.date} ${event.kind} #${event.seq} cash`, cash, event.cash);

    const equity =
      event.voogShares * event.voogPrice +
      (event.vgtCoreShares + event.lotShares) * event.vgtPrice +
      event.receivables +
      event.cash -
      event.principal -
      event.accruedInterest -
      event.fundingPayable;

    check(`${event.date} ${event.kind} #${event.seq} equity identity`, equity, event.equity);

    if (event.cash < -tolerance) {
      failures.push(`${event.date} ${event.kind}: negative cash ${event.cash}`);
    }
  }

  // 2. Lots: shares × entry price = principal, interest and net from first principles.
  for (const lot of result.lots) {
    check(`lot ${lot.id} principal`, lot.shares * lot.entryPrice, lot.principal);

    if (lot.exitIndex >= 0) {
      const interest =
        lot.principal * result.config.rate * ((ds.sTime[lot.exitIndex]! - lot.entryTimestamp) / secondsPerYear);

      check(`lot ${lot.id} interest`, interest, lot.interest);
      check(`lot ${lot.id} net`, lot.shares * lot.exitPrice - lot.principal - interest, lot.netProfit);
      check(`lot ${lot.id} proceeds`, lot.shares * lot.exitPrice, lot.proceeds);

      if (
        lot.exitIndex < lot.entryIndex ||
        (lot.exitIndex === lot.entryIndex && lot.exitReason !== 'forced liquidation')
      ) {
        failures.push(`lot ${lot.id}: exit on or before the entry session`);
      }
    }

    // No new borrowing at a takeover: the entry event is the only principal change for the lot.
    if (lot.takeover) {
      const entries = result.events.filter(
        (event) => event.kind === 'entry' && event.note.startsWith(`lot ${lot.id} `)
      );

      checks++;

      if (entries.length !== 1) {
        failures.push(`lot ${lot.id}: ${entries.length} entry events`);
      }
    }
  }

  const realized = result.lots.filter((lot) => lot.exitIndex >= 0).reduce((total, lot) => total + lot.netProfit, 0);

  check('realized strategy profit', realized, result.daily.at(-1)!.realizedStrategyProfit);

  // 3. Dividends: every distribution inside the window with shares held produced a receivable of shares × amount.
  const byExDate = new Map<string, number>();

  for (const event of result.events.filter((event) => event.kind === 'ex-date')) {
    const amount = Number(/= ([-\d.]+),/.exec(event.note)?.[1] ?? NaN);

    byExDate.set(`${event.etf}:${event.date}`, (byExDate.get(`${event.etf}:${event.date}`) ?? 0) + amount);
  }

  const dailyByDate = new Map(result.daily.map((row) => [row.date, row]));
  const dates = new Set(ds.dates.slice(0, result.endIndex + 1));

  for (const distribution of distributions) {
    if (!dates.has(distribution.exDate)) {
      continue;
    }

    const previous = result.daily[data.sessionIndex.get(distribution.exDate)! - 1];

    if (!previous) {
      continue;
    }

    const shares = distribution.etf === 'VOOG' ? previous.voogShares : previous.vgtCoreShares + previous.lotShares;
    const expected = shares * distribution.amount;

    check(
      `${distribution.etf} ${distribution.exDate} entitlement`,
      byExDate.get(`${distribution.etf}:${distribution.exDate}`) ?? 0,
      expected
    );
  }

  const paid = result.dividends.reduce((total, row) => total + row.value, 0);

  check('dividends paid', paid, result.daily.at(-1)!.cumulativeDividends);

  // 4. Daily balance-sheet identity.
  for (const row of result.daily) {
    const equity =
      row.voogShares * row.voogClose +
      (row.vgtCoreShares + row.lotShares) * row.vgtClose +
      row.cash +
      row.receivables -
      row.principal -
      row.accruedInterest -
      row.fundingPayable;

    check(`${row.date} daily equity`, equity, row.equity);

    if (row.openLots === 0 && row.principal !== 0) {
      failures.push(`${row.date}: principal without a lot`);
    }
  }

  // 5. Sizing: each lot's principal is the configured fraction of the equity at its decision (or the fixed amount),
  // except partial dynamic entries and whole-share rounding.
  for (const lot of result.lots) {
    if (result.config.fixedPrincipal !== undefined) {
      if (result.config.policy === 'split') {
        check(
          `lot ${lot.id} fixed half principal`,
          lot.principal,
          result.config.fixedPrincipal / 2,
          result.config.wholeShares ? 1000 : tolerance
        );
      } else {
        check(
          `lot ${lot.id} fixed principal`,
          lot.principal,
          result.config.fixedPrincipal,
          result.config.wholeShares ? 1000 : tolerance
        );
      }
    } else if (result.config.policy === 'split') {
      check(`lot ${lot.id} half-fraction`, lot.fraction, result.config.allocation / 2, 1e-9);
    } else if (result.config.policy !== 'dynamic') {
      check(`lot ${lot.id} fraction`, lot.fraction, result.config.allocation, 1e-9);
    } else {
      checks++;

      if (lot.fraction > result.config.allocation + 1e-9 || lot.fraction < result.config.allocation / 2 - 1e-9) {
        failures.push(`lot ${lot.id}: dynamic fraction ${lot.fraction} outside [f/2, f]`);
      }
    }
  }

  void dailyByDate;

  return { scenario: result.config.key, checks, failures };
};
