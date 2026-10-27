// Reference engine versus fast replay (ENGINE_PARITY_AND_TESTS.md §2): every trade's timing, prices, quantity,
// notional, fees and net; every window's start and end equity, net, both drawdowns in USDT and percent, entries, exits
// and mark count; the final cash, BTC balance, equity, realized and unrealized. Times, bar indices and prices must be
// identical; money is compared with an absolute tolerance (the two implementations evaluate the same expressions,
// so the observed difference is 0, but a tolerance keeps the check meaningful if a compiler reorders anything).
import type { RunResult } from './engine.ts';
import type { FastResult } from './fast.ts';

const reasonOf = (reason: string) => (reason === 'open at end (marked)' ? 'open' : reason);

export interface ParityReport {
  differences: string[];
  maxMoneyDifference: number;
  trades: number;
}

export const compareRuns = (reference: RunResult, fast: FastResult, tolerance = 1e-6): ParityReport => {
  const differences: string[] = [];
  let maxMoneyDifference = 0;
  const exact = (label: string, a: unknown, b: unknown) => {
    if (!Object.is(a, b) && !(Number.isNaN(a) && Number.isNaN(b))) {
      differences.push(`${label}: reference ${String(a)} vs fast ${String(b)}`);
    }
  };
  const money = (label: string, a: number, b: number) => {
    const difference = Math.abs(a - b);

    maxMoneyDifference = Math.max(maxMoneyDifference, Number.isFinite(difference) ? difference : 0);

    if (!(difference <= tolerance) && !(Number.isNaN(a) && Number.isNaN(b)) && a !== b) {
      differences.push(`${label}: reference ${a} vs fast ${b}`);
    }
  };

  exact('trade count', reference.trades.length, fast.trades.length);

  reference.trades.forEach((r, i) => {
    const f = fast.trades[i];

    if (!f) {
      return;
    }

    const label = `trade ${i + 1}`;

    exact(`${label} entry time`, r.entryTime, f.entryTime);
    exact(`${label} entry bar`, r.entryBar, f.entryBar);
    exact(`${label} entry day`, r.entryDay, f.entryDay);
    exact(`${label} entry price`, r.entryPrice, f.entryPrice);
    exact(`${label} kind`, r.setupKind, f.kind);
    exact(`${label} exit time`, r.exitTime, f.exitTime);
    exact(`${label} exit bar`, r.exitBar, f.exitBar);
    exact(`${label} exit day`, r.exitDay, f.exitDay);
    exact(`${label} exit price`, r.exitPrice, f.exitPrice);
    exact(`${label} reason`, reasonOf(r.exitReason), f.reason);
    money(`${label} quantity x 1e6`, r.quantity * 1e6, f.quantity * 1e6);
    money(`${label} notional`, r.notional, f.notional);
    money(`${label} entry fee`, r.entryFee, f.entryFee);
    money(`${label} exit fee`, r.exitFee, f.exitFee);
    money(`${label} gross`, r.grossPnl, f.grossPnl);
    money(`${label} net`, r.netPnl, f.netPnl);
  });

  exact('window count', reference.windows.length, fast.windows.length);

  reference.windows.forEach((r, i) => {
    const f = fast.windows[i];

    if (!f) {
      return;
    }

    const label = `window ${r.label}`;

    money(`${label} start equity`, r.startEquity, f.startEquity);
    money(`${label} end equity`, r.endEquity, f.endEquity);
    money(`${label} net`, r.net, f.net);
    money(`${label} minute drawdown`, r.minute.drawdown, f.minuteDrawdown);
    money(`${label} daily drawdown`, r.daily.drawdown, f.dailyDrawdown);
    money(`${label} minute percent x 1e6`, r.minute.percent * 1e6, f.minutePercent * 1e6);
    money(`${label} daily percent x 1e6`, r.daily.percent * 1e6, f.dailyPercent * 1e6);
    exact(`${label} entries`, r.entries, f.entries);
    exact(`${label} exits`, r.exits, f.exits);
    exact(`${label} marks`, r.marks, f.marks);
  });

  money('cash', reference.cash, fast.cash);
  money('BTC x 1e6', reference.quantity * 1e6, fast.quantity * 1e6);
  money('equity', reference.equity, fast.equity);
  money('realized', reference.realized, fast.realized);
  money('unrealized', reference.unrealized, fast.unrealized);
  exact('signal count', reference.signals.length, fast.signals.length);
  reference.signals.forEach((signal, i) => {
    const other = fast.signals[i];

    if (!other || other.bar !== signal.bar || other.type !== signal.type) {
      differences.push(
        `signal ${i + 1}: reference ${signal.type}@${signal.bar} vs fast ${other ? `${other.type}@${other.bar}` : 'none'}`
      );
    }
  });
  exact('deep setups', reference.setups.deep, fast.deepSetups);
  exact('continuation setups', reference.setups.continuation, fast.continuationSetups);
  exact('cancelled setups', reference.setups.cancelled, fast.cancelled);

  return { differences, maxMoneyDifference, trades: reference.trades.length };
};

// The ledger's own arithmetic (ENGINE_PARITY_AND_TESTS.md §3): closed nets sum to the realized total, cash equals
// the initial equity plus top-ups plus realized minus the open position's cost, equity equals cash plus the open
// BTC's liquidation value, and equity - initial - top-ups = realized + unrealized. Returns the problems found.
export const reconcileLedger = (result: RunResult, initialEquity: number, tolerance = 1e-6) => {
  const problems: string[] = [];
  const closed = result.trades.filter((trade) => trade.status === 'closed');
  const open = result.trades.find((trade) => trade.status === 'open');
  const sum = closed.reduce((total, trade) => total + trade.netPnl, 0);
  const check = (label: string, a: number, b: number) => {
    if (!(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)))) {
      problems.push(`${label}: ${a} vs ${b}`);
    }
  };

  check('sum of closed nets = realized', sum, result.realized);
  check(
    'cash = initial + top-ups + realized - open cost',
    result.cash,
    initialEquity + result.contributions + result.realized - (open ? open.notional + open.entryFee : 0)
  );
  check(
    'equity = initial + top-ups + realized + unrealized',
    result.equity,
    initialEquity + result.contributions + result.realized + result.unrealized
  );

  for (const trade of result.trades) {
    const net = trade.grossPnl - trade.entryFee - trade.exitFee - trade.entryImpact - trade.exitImpact;

    check(`trade ${trade.number} gross - fees - impact = net`, net, trade.netPnl);
    check(`trade ${trade.number} notional = quantity x fill`, trade.notional, trade.quantity * trade.entryFillPrice);

    if (trade.notional > 100000 + 1e-9) {
      problems.push(`trade ${trade.number} notional ${trade.notional} exceeds the 100,000 USDT cap`);
    }
  }

  if (result.cash < -1e-6) {
    problems.push(`negative cash ${result.cash}`);
  }

  return problems;
};
