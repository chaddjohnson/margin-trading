// Fast engine versus the slow reference: every trade's sessions, bars, prices, reason, shares, interest and net, the
// daily marks, the horizon liquidation value and the minute drawdown (PROTOCOL.md §6 S2). Differences are returned,
// never thrown, so a stage can record them.
import type { Dataset } from '../four-family/data.ts';
import { Engine, type RunOptions, type StrategySpec } from './engine.ts';
import { referenceRun } from './reference.ts';

const close = (a: number, b: number, tolerance: number) =>
  (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

export interface ParityOutcome {
  id: string;
  trades: number;
  differences: string[];
  largestMoneyDifference: number;
}

export const compareWithReference = (
  engine: Engine,
  ds: Dataset,
  spec: StrategySpec,
  options: RunOptions,
  tolerance = 1e-9,
  redact = false // market-data mode: field names and |Δ| only, never a price, net, mark or drawdown level
): ParityOutcome => {
  const fast = engine.run(spec, { ...options, recordDaily: true });
  const slow = referenceRun(ds, spec, options);
  const differences: string[] = [];
  let largest = 0;
  const money = (label: string, a: number, b: number) => {
    largest = Math.max(largest, Math.abs(a - b) || 0);

    if (!close(a, b, tolerance)) {
      differences.push(redact ? `${label}: |Δ| ${Math.abs(a - b)}` : `${label}: engine ${a} reference ${b}`);
    }
  };

  if (fast.trades.length !== slow.trades.length) {
    differences.push(
      redact
        ? `trade count differs by ${Math.abs(fast.trades.length - slow.trades.length)}`
        : `trade count: engine ${fast.trades.length} reference ${slow.trades.length}`
    );
  }

  const n = Math.min(fast.trades.length, slow.trades.length);

  for (let i = 0; i < n; i++) {
    const a = fast.trades[i]!;
    const b = slow.trades[i]!;
    const tag = `trade ${i + 1}`;
    const exact: [string, number | string, number | string][] = [
      ['entryIndex', a.entryIndex, b.entryIndex],
      ['entryBar', a.entryBar, b.entryBar],
      ['exitIndex', a.exitIndex, b.exitIndex],
      ['exitBar', a.exitBar, b.exitBar],
      ['exitReason', a.exitReason, b.exitReason],
      ['rule', a.rule, b.rule],
      ['kind', a.kind, b.kind]
    ];

    for (const [label, x, y] of exact) {
      if (x !== y) {
        differences.push(redact ? `${tag} ${label} differs` : `${tag} ${label}: engine ${x} reference ${y}`);
      }
    }

    money(`${tag} entryRaw`, a.entryRaw, b.entryRaw);
    money(`${tag} exitRaw`, a.exitRaw, b.exitRaw);
    money(`${tag} shares`, a.shares, b.shares);
    money(`${tag} interest`, a.interest, b.interest);
    money(`${tag} net`, a.net, b.net);
  }

  money('endLiquidation', fast.endLiquidation, slow.endLiquidation);
  money('minuteDrawdown', fast.minuteDrawdown.maximum, slow.minuteDrawdown);

  const marks = fast.daily!.slice(0); // one row per session from the first decision close

  if (marks.length !== slow.dailyMarks.length) {
    differences.push(`daily rows: engine ${marks.length} reference ${slow.dailyMarks.length}`);
  } else {
    let worst = 0;
    let at = -1;

    for (let i = 0; i < marks.length; i++) {
      const d = Math.abs(marks[i]!.mark - slow.dailyMarks[i]!);

      if (d > worst) {
        worst = d;
        at = i;
      }
    }

    if (worst > tolerance * 1e5) {
      differences.push(
        redact
          ? `daily mark ${at}: |Δ| ${worst}`
          : `daily mark ${at}: engine ${marks[at]!.mark} reference ${slow.dailyMarks[at]}`
      );
    }

    largest = Math.max(largest, worst);
  }

  return {
    id: spec.id,
    trades: fast.trades.length,
    differences: differences.slice(0, 20),
    largestMoneyDifference: largest
  };
};
