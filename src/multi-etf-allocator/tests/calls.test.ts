// Designed maintenance-call examples (PROTOCOL.md §8.5, §11): a 35% → 60% jump that calls immediately, a call from the
// traded ETF's requirement alone, a call from a price decline alone at 35%, and a call that needs both a 60% requirement
// and a gap (neither alone suffices). Each checks that the liquidation keeps the ledger reconciled (the engine asserts
// assets − liabilities = equity at every event), that the exported files pass the independent audit, and that the
// freed pool changes what happens next. The 60% ceiling is enforced.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { type Liquidation, type RunConfig, runAllocator } from '../engine.ts';
import { writeRun } from '../export.ts';
import { auditRun } from '../ledgerAudit.ts';
import { requirementRate } from '../margin.ts';
import { type SessionSpec, dipSession, flat, testConfig, universeOf } from './fixtures.ts';

const flats = (count: number, price = 100, bars = 6): SessionSpec[] =>
  Array.from({ length: count }, () => flat(price, bars));

const immediate: Liquidation = { monitoring: 'intraday', timing: 'immediate', order: 'lot-first', slippageBps: 0 };

// XBI is bought at 90 on session 3 with 99% of equity (Reg T allows up to 100% on an unleveraged account) and stays
// flat; XRT dips on session 7 while XBI's virtual position is still open.
const leveraged = (xbiAfter: SessionSpec[] = flats(6, 90)) =>
  universeOf({
    VOOG: flats(10),
    VGT: flats(10),
    XBI: [...flats(3), dipSession(), ...xbiAfter],
    XRT: [...flats(7), dipSession(), ...flats(2, 90)]
  });

const run = (universe: ReturnType<typeof leveraged>, overrides: Partial<RunConfig>) =>
  runAllocator(universe, testConfig({ mode: 'portfolio', symbols: ['XBI', 'XRT'], fraction: 0.99, ...overrides }));

describe('designed maintenance calls', () => {
  test('a 35% → 60% jump mid-position calls immediately; the forced sale frees the pool for a later signal', async () => {
    const universe = leveraged();
    const base = run(universe, { liquidation: immediate });
    // The requirement returns to 35% on session 6, so XRT's later entry is not refused by the 60% house check.
    const jumped = run(universe, {
      liquidation: immediate,
      requirementChanges: [
        { index: 5, schedule: 'U60' },
        { index: 6, schedule: 'U35' }
      ]
    });

    // Without the jump: no call, and XRT is refused while XBI holds the pool.
    assert.equal(base.forcedLiquidations.length, 0);
    assert.equal(base.lots.filter((lot) => lot.symbol === 'XRT').length, 0);

    // With it: equity ≈ $100k against 60% × $199k required → a call on session 5's first mark, the lot sold at XBI's
    // next trade.
    const call = jumped.maintenanceEvents.find((event) => event.kind === 'call')!;

    assert.equal(call.index, 5);
    assert.ok(call.equity < call.required);
    assert.equal(jumped.forcedLiquidations.length, 1);
    assert.equal(jumped.forcedLiquidations[0]!.reason, 'lot sold');

    const xbi = jumped.lots.find((lot) => lot.symbol === 'XBI')!;

    assert.equal(xbi.forced, true);
    assert.equal(xbi.exitReason, 'forced liquidation');
    assert.equal(xbi.exitIndex, 5);
    assert.equal(xbi.exitBar, 1);
    // The book's virtual XBI position runs on; the freed pool funds XRT's later signal.
    assert.equal(jumped.trades.find((trade) => trade.symbol === 'XBI')!.exitIndex, -1);
    assert.equal(jumped.lots.filter((lot) => lot.symbol === 'XRT').length, 1);
    assert.ok(jumped.lots.find((lot) => lot.symbol === 'XRT')!.originalPrincipal > 0);

    // The exported files pass the independent ledger audit.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'allocator-call-'));

    await writeRun(dir, jumped);

    const audit = await auditRun('designed-call', dir);

    assert.deepEqual(audit.failures, []);
    await fs.remove(dir);
  });

  test("raising only the traded ETF's requirement (L60) calls after a 15% fall; 35% and L50 do not", () => {
    // XBI falls from 90 to 76.5 over session 4 and stays there.
    const universe = leveraged([{ closes: [88, 84, 80, 76.5] }, ...flats(5, 76.5)]);
    const outcome = (schedule: 'U35' | 'L50' | 'L60') =>
      run(universe, { liquidation: immediate, requirementChanges: schedule === 'U35' ? [] : [{ index: 6, schedule }] });

    assert.equal(outcome('U35').forcedLiquidations.length, 0);
    assert.equal(outcome('L50').forcedLiquidations.length, 0);

    const l60 = outcome('L60');

    assert.equal(l60.forcedLiquidations.length, 1);
    assert.equal(l60.maintenanceEvents.find((event) => event.kind === 'call')!.schedule, 'L60');
  });

  test('a price decline alone breaches 35%: a 30% fall of every holding with a 99% lot', () => {
    const universe = leveraged();
    const factors = { VOOG: 0.7, VGT: 0.7, XBI: 0.7, XRT: 0.7, KRE: 0.7 };
    const shocked = run(universe, { liquidation: immediate, shocks: [{ index: 5, factors }] });
    const call = shocked.maintenanceEvents.find((event) => event.kind === 'call')!;

    assert.equal(call.schedule, 'U35');
    assert.equal(call.index, 5);
    assert.equal(shocked.forcedLiquidations.length, 1);
    // The forced sale restores the account: no further call.
    assert.equal(shocked.maintenanceEvents.filter((event) => event.kind === 'call').length, 1);
  });

  test('no call at 50% with a 10% gap, none at 60% without one, a call at 60% with the gap', () => {
    const universe = leveraged();
    const gap = [{ index: 5, factors: { VOOG: 0.9, VGT: 0.9, XBI: 0.9, XRT: 0.9, KRE: 0.9 } }];
    const variant = (schedule: 'U50' | 'U60', withGap: boolean) =>
      run(universe, {
        fraction: 0.6,
        baseSchedule: 'U50',
        liquidation: immediate,
        requirementChanges: schedule === 'U60' ? [{ index: 5, schedule }] : [],
        shocks: withGap ? gap : []
      });

    assert.equal(variant('U50', true).forcedLiquidations.length, 0);
    assert.equal(variant('U60', false).forcedLiquidations.length, 0);
    assert.equal(variant('U60', true).forcedLiquidations.length, 1);
  });
});

describe('broker discretion', () => {
  const universe = leveraged();
  const jump = [{ index: 5, schedule: 'U60' as const }];

  test('next-open: a deficiency seen at the close is sold at the next opening trade', () => {
    const result = run(universe, {
      liquidation: { monitoring: 'close', timing: 'next-open', order: 'lot-first', slippageBps: 0 },
      requirementChanges: jump
    });
    const lot = result.lots.find((candidate) => candidate.symbol === 'XBI')!;

    assert.equal(lot.exitIndex, 6);
    assert.equal(lot.exitBar, 0);
  });

  test('halt: the traded ETF cannot trade until the next open, and nothing else is sold meanwhile', () => {
    const result = run(universe, {
      liquidation: { monitoring: 'intraday', timing: 'halt', order: 'lot-first', slippageBps: 0 },
      requirementChanges: jump
    });

    assert.equal(result.forcedLiquidations.length, 1);
    assert.equal(result.forcedLiquidations[0]!.index, 6);
    assert.equal(result.lots.find((lot) => lot.symbol === 'XBI')!.exitBar, 0);
  });

  test('deadline: liquidation at the open of the fourth session after a close still deficient', () => {
    const result = run(universe, {
      liquidation: { monitoring: 'close', timing: 'deadline', order: 'lot-first', slippageBps: 0 },
      requirementChanges: jump
    });

    assert.equal(result.lots.find((lot) => lot.symbol === 'XBI')!.exitIndex, 9);
  });

  test('core-first: the broker sells core VOOG/VGT, repays the lot principal, and leaves the lot open', () => {
    const result = run(universe, {
      liquidation: { monitoring: 'intraday', timing: 'immediate', order: 'core-first', slippageBps: 0 },
      requirementChanges: jump
    });
    const lot = result.lots.find((candidate) => candidate.symbol === 'XBI')!;

    assert.ok(result.forcedLiquidations.length >= 2);
    assert.ok(result.forcedLiquidations.every((row) => row.reason === 'core sold'));
    assert.equal(lot.exitIndex, -1);
    assert.ok(lot.repaidByCore > 0);
    assert.ok(lot.principal < lot.originalPrincipal);
  });

  test('forced-sale slippage lowers the sale price', () => {
    const clean = run(universe, { liquidation: immediate, requirementChanges: jump });
    const slipped = run(universe, { liquidation: { ...immediate, slippageBps: 50 }, requirementChanges: jump });
    const price = (result: typeof clean) => result.lots.find((lot) => lot.symbol === 'XBI')!.exitPrice;

    assert.ok(Math.abs(price(slipped) - price(clean) * 0.995) < 1e-9);
  });
});

describe('the 60% ceiling', () => {
  test('no requirement above 60% can be expressed', () => {
    assert.equal(requirementRate('U60', 'VGT', new Set()), 0.6);
    assert.throws(() => requirementRate('U70' as never, 'VGT', new Set()), /no requirement above 60%/);
  });
});
