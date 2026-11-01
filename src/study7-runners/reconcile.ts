// Reconciliation of a runner result against the sealed Study 7 final door (results/final/final.json and its funded-lot
// ledger), to the cent and lot by lot. It applies only under the sealed convention: run end 2026-10-29, 5 bps per side,
// 11% interest, stops at the stop, $100,000 fixed slot; otherwise it is reported as not applicable (never silently
// compared across conventions). The three figures quoted in the runner brief are checked as explicit anchors too.
import type { PoolRunRecord } from '../pools/report.ts';
import { type Resolved, sealedCostBps, sealedEnd } from './resolve.ts';

const cents = (value: number) => Math.round(value * 100) / 100;
const near = (a: number, b: number, tolerance = 0.005) => Math.abs(a - b) < tolerance;

// The figures the runner brief states (fixed $100k, 5 bps, to 2026-10-29).
export const briefAnchors: Record<string, { net: number; dd: number; lots?: number }> = {
  'vg-profit': { net: 284271.14, dd: 28297.09, lots: 63 },
  'vgt-primary': { net: 176260.47, dd: 19534.41 },
  'b5-frozen': { net: 484636.97, dd: 26509.97 }
};

export interface Reconciliation {
  applicable: boolean;
  reason?: string;
  source?: string;
  totals?: { name: string; sealed: number; run: number; pass: boolean }[];
  lots?: { compared: number; mismatches: string[] };
  anchors?: { name: string; expected: number; run: number; pass: boolean }[];
  pass?: boolean;
}

interface TradeRow {
  symbol: string;
  status: string;
  entryNewYork: string;
  exitNewYork: string;
  net: number;
  interest: number;
  friction: number;
}

export const reconcile = (
  resolved: Resolved,
  record: PoolRunRecord,
  run: { lastSession: string; costBps: number }
): Reconciliation => {
  const sealed = resolved.sealed;
  const config = resolved.pool.config;

  if (!sealed) return { applicable: false, reason: 'no sealed Study 7 final-door record for this configuration' };
  if (
    run.lastSession !== sealedEnd ||
    run.costBps !== sealedCostBps ||
    config.interest.annualRate !== 0.11 ||
    config.execution.stopFill !== 'stop' ||
    config.execution.stopSlippageBps !== 0
  ) {
    return {
      applicable: false,
      reason: `the sealed figures are for the run to ${sealedEnd} at ${sealedCostBps} bps, 11%, stops at the stop; this run ends ${run.lastSession} at ${run.costBps} bps`
    };
  }

  const f = record.figures;
  const totals = [
    { name: 'net (realized + marked unrealized)', sealed: sealed.net, run: cents(f.net) },
    { name: 'realized', sealed: sealed.realized, run: cents(f.realized) },
    { name: 'unrealized (open lot marked at the last close)', sealed: sealed.unrealized, run: cents(f.unrealized) },
    { name: 'margin interest', sealed: sealed.interest, run: cents(f.interest) },
    { name: 'friction', sealed: sealed.costs, run: cents(f.frictionDollars) },
    { name: 'max minute drawdown', sealed: cents(sealed.dd), run: cents(f.minuteDrawdown) },
    { name: 'max daily drawdown', sealed: cents(sealed.ddDaily), run: cents(f.dailyDrawdown) },
    { name: 'funded lots', sealed: sealed.lots, run: f.fundedLots }
  ].map((row) => ({ ...row, pass: near(row.sealed, row.run) }));
  const trades = record.trades as unknown as TradeRow[];
  const mismatches: string[] = [];

  if (trades.length !== sealed.ledger.length)
    mismatches.push(`lot count ${trades.length} vs sealed ${sealed.ledger.length}`);

  sealed.ledger.forEach((lot, index) => {
    const row = trades[index];

    if (!row) return;

    const open = row.status.startsWith('OPEN');
    const problems = [
      row.symbol !== lot.symbol ? `symbol ${row.symbol}≠${lot.symbol}` : '',
      row.entryNewYork !== lot.entry ? `entry ${row.entryNewYork}≠${lot.entry}` : '',
      (open ? '' : row.exitNewYork) !== lot.exit ? `exit ${row.exitNewYork}≠${lot.exit}` : '',
      open !== lot.open ? `open ${open}≠${lot.open}` : '',
      !near(row.net, lot.net) ? `net ${cents(row.net)}≠${cents(lot.net)}` : '',
      !near(row.interest, lot.interest) ? `interest ${cents(row.interest)}≠${cents(lot.interest)}` : '',
      !near(row.friction, lot.costs) ? `friction ${cents(row.friction)}≠${cents(lot.costs)}` : ''
    ].filter(Boolean);

    if (problems.length) mismatches.push(`lot ${index + 1} ${lot.symbol} ${lot.entry}: ${problems.join('; ')}`);
  });

  const anchor = briefAnchors[resolved.spec.alias];
  const anchors = anchor
    ? [
        { name: 'brief anchor: net', expected: anchor.net, run: cents(f.net) },
        { name: 'brief anchor: max minute drawdown', expected: anchor.dd, run: cents(f.minuteDrawdown) },
        ...(anchor.lots !== undefined
          ? [{ name: 'brief anchor: funded lots', expected: anchor.lots, run: f.fundedLots }]
          : [])
      ].map((row) => ({ ...row, pass: near(row.expected, row.run) }))
    : [];

  return {
    applicable: true,
    source: `${sealed.source} (research/study7-stability-first-d1/results/final/final.json; lots: final-lots.jsonl.gz)`,
    totals,
    lots: { compared: sealed.ledger.length, mismatches },
    anchors,
    pass: totals.every((row) => row.pass) && mismatches.length === 0 && anchors.every((row) => row.pass)
  };
};
