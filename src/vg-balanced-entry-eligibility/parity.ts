// OFF parity (PROTOCOL.md §5): the adapter with eligibility OFF against the control engine (runPoolOn → runNAllocator)
// on the same universe: every key of the control's run result except the universe itself, compared recursively and
// exactly (numbers bit for bit; NaN equals NaN; the tolerance is zero). Then the cash reconciliation to the cent.
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import type { VRunResult } from './engine.ts';

export interface Difference {
  path: string;
  control: string;
  adapter: string;
}

const show = (value: unknown) => {
  if (typeof value === 'number') return Number.isNaN(value) ? 'NaN' : String(value);
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'object') return Array.isArray(value) ? `array(${value.length})` : 'object';
  return JSON.stringify(value);
};

// Exact recursive equality; collects up to `limit` differences. Shared references are compared once per pair.
export const compareExact = (a: unknown, b: unknown, limit = 20) => {
  const differences: Difference[] = [];
  const seen = new WeakMap<object, WeakSet<object>>();
  let compared = 0;

  const walk = (x: unknown, y: unknown, at: string) => {
    if (differences.length >= limit) return;

    compared++;

    if (typeof x === 'number' && typeof y === 'number') {
      if (!(x === y || (Number.isNaN(x) && Number.isNaN(y))))
        differences.push({ path: at, control: show(x), adapter: show(y) });
      return;
    }

    if (x === null || y === null || typeof x !== 'object' || typeof y !== 'object') {
      if (x !== y) differences.push({ path: at, control: show(x), adapter: show(y) });
      return;
    }

    const pairs = seen.get(x) ?? new WeakSet<object>();

    if (pairs.has(y)) return;

    pairs.add(y);
    seen.set(x, pairs);

    if (Array.isArray(x) !== Array.isArray(y)) {
      differences.push({ path: at, control: show(x), adapter: show(y) });
      return;
    }

    if (x instanceof Map || x instanceof Set) {
      walk([...(x as Map<unknown, unknown>)], [...(y as Map<unknown, unknown>)], at);
      return;
    }

    const keys = new Set([...Object.keys(x), ...Object.keys(y)]);

    for (const key of keys) {
      walk((x as Record<string, unknown>)[key], (y as Record<string, unknown>)[key], `${at}.${key}`);
    }
  };

  walk(a, b, '$');

  return { equal: differences.length === 0, differences, compared };
};

export const controlKeys = (control: NRunResult) => Object.keys(control).filter((key) => key !== 'universe');

export const offParity = (control: NRunResult, adapter: VRunResult) => {
  const keys = controlKeys(control);
  const left = Object.fromEntries(keys.map((key) => [key, (control as unknown as Record<string, unknown>)[key]]));
  const right = Object.fromEntries(keys.map((key) => [key, (adapter as unknown as Record<string, unknown>)[key]]));
  const result = compareExact(left, right);
  const extras = {
    opportunities: adapter.opportunities.length,
    transitions: adapter.transitions.length,
    lateTrades: adapter.lateTrades.length
  };

  return {
    ...result,
    keys,
    extras,
    pass: result.equal && extras.opportunities === 0 && extras.transitions === 0 && extras.lateTrades === 0
  };
};

const cents = (value: number) => Math.round(value * 100);

// The cash summary of one run, reconciled to the cent: Σ lot nets = realized + unrealized = the last daily mark;
// gross − friction − interest = net, lot by lot and in total; Σ period changes = net.
export const cashReconciliation = (result: { lots: VRunResult['lots']; daily: VRunResult['daily'] }) => {
  const closed = result.lots.filter((lot) => lot.exitIndex >= 0);
  const open = result.lots.filter((lot) => lot.exitIndex < 0);
  const realized = closed.reduce((total, lot) => total + lot.net, 0);
  const unrealized = open.reduce((total, lot) => total + lot.net, 0);
  const last = result.daily.at(-1)!;
  const friction = result.lots.reduce(
    (total, lot) =>
      total +
      lot.shares * (lot.entryPrice - lot.entryRawPrice) +
      (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0),
    0
  );
  const grossBeforeCosts = result.lots.reduce(
    (total, lot) =>
      total + lot.shares * ((lot.exitIndex >= 0 ? lot.exitRawPrice : lot.exitRawPrice) - lot.entryRawPrice),
    0
  );
  const interest = result.lots.reduce((total, lot) => total + lot.interest, 0);
  const net = realized + unrealized;
  const checks = [
    { name: 'realized + unrealized = last daily mark', a: cents(net), b: cents(last.strategyMark) },
    { name: 'realized = ledger realized', a: cents(realized), b: cents(last.realized) },
    { name: 'gross − friction − interest = net', a: cents(grossBeforeCosts - friction - interest), b: cents(net) },
    {
      name: 'every lot: gross − interest = net',
      a: result.lots.filter((lot) => cents(lot.gross - lot.interest) !== cents(lot.net)).length,
      b: 0
    }
  ];

  return {
    realized,
    unrealized,
    net,
    friction,
    grossBeforeCosts,
    interest,
    lots: result.lots.length,
    openLots: open.length,
    checks: checks.map((check) => ({ ...check, pass: check.a === check.b })),
    pass: checks.every((check) => check.a === check.b)
  };
};
