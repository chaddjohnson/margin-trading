// The margin algebra of PROTOCOL.md §8.3–§8.4 against brute force: each break-even, applied to the balance sheet,
// leaves exactly zero excess; the largest allowed principal leaves zero excess after the purchase; a proportional core
// sale of the computed size restores the 5% buffer.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  type BalanceSheet,
  type ScheduleKey,
  coreSaleToRestore,
  distanceOf,
  emptyValues,
  fundedBreakEven,
  homogeneousBreakEven,
  lmvOf,
  maximumPrincipal,
  regTMaximumPrincipal,
  requiredOf,
  requirementRate,
  scheduleKeys,
  shockedSheet
} from '../margin.ts';

// A 60/40 core of $1.2M with a $250k KRE lot ($250k of debt): equity $1.2M, LMV $1.45M.
const sheet = (): BalanceSheet => {
  const mv = emptyValues();

  mv.VOOG = 720000;
  mv.VGT = 480000;
  mv.KRE = 250000;

  return { equity: 1200000, mv, funded: new Set(['KRE']), debt: 250000 };
};

const excessOf = (balance: BalanceSheet, schedule: ScheduleKey) =>
  balance.equity - requiredOf(schedule, balance.mv, balance.funded);

describe('requirements per security', () => {
  test('uniform, funded-ETF and sector-group schedules', () => {
    const balance = sheet();
    const lmv = lmvOf(balance.mv);

    const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

    close(requiredOf('U35', balance.mv, balance.funded), 0.35 * lmv);
    close(requiredOf('L60', balance.mv, balance.funded), 0.35 * (720000 + 480000) + 0.6 * 250000);
    close(requiredOf('G60', balance.mv, balance.funded), 0.35 * 720000 + 0.6 * (480000 + 250000));
    assert.equal(requirementRate('L50', 'VGT', new Set(['VGT'])), 0.5);
    assert.equal(requirementRate('L50', 'VOOG', new Set(['VGT'])), 0.35);
  });
});

describe('break-evens', () => {
  for (const schedule of scheduleKeys) {
    test(`${schedule}: the uniform and two-factor shocks leave zero excess`, () => {
      const balance = sheet();
      const distance = distanceOf(balance, schedule);

      assert.ok(distance.excess > 0);
      assert.ok(Math.abs(excessOf(shockedSheet(balance, distance.uniformShock, 1), schedule)) < 1e-6);

      for (const { rho, shock } of distance.twoFactor) {
        if (Number.isFinite(shock)) {
          assert.ok(Math.abs(excessOf(shockedSheet(balance, shock, rho), schedule)) < 1e-6, `ρ ${rho}`);
        } else {
          // No gap of the funded ETF up to 100% can call at this correlation.
          assert.ok(excessOf(shockedSheet(balance, 1, rho), schedule) > 0, `ρ ${rho}`);
        }
      }
    });
  }

  test('the homogeneous break-even is equity ÷ LMV and the funded break-even can exceed 100%', () => {
    const balance = sheet();
    const m = homogeneousBreakEven(balance);
    const r = fundedBreakEven(balance);

    assert.ok(Math.abs(balance.equity - m * lmvOf(balance.mv)) < 1e-6);
    assert.ok(Math.abs(balance.equity - (0.35 * 1200000 + r * 250000)) < 1e-6);
    assert.ok(r > 1);
  });

  test('the largest allowed principal leaves zero excess after the purchase; Reg T is 50% initial', () => {
    const balance = sheet();

    for (const schedule of ['U35', 'U60', 'L60', 'G60'] as ScheduleKey[]) {
      const principal = maximumPrincipal(balance, schedule, 'XBI');
      const after: BalanceSheet = {
        ...balance,
        mv: { ...balance.mv, XBI: principal },
        funded: new Set([...balance.funded, 'XBI']),
        debt: balance.debt + principal
      };

      assert.ok(Math.abs(excessOf(after, schedule)) < 1e-6, schedule);
    }

    const regT = regTMaximumPrincipal(balance);

    assert.ok(Math.abs(balance.debt + regT - 0.5 * (lmvOf(balance.mv) + regT)) < 1e-6);
  });

  test('a proportional core sale of the computed size restores excess to 5% of LMV', () => {
    const balance = sheet();
    // A 60% fall of every holding under a 60% requirement leaves the account deficient (the break-even is 56.9%).
    const shocked = shockedSheet(balance, 0.6, 1);
    const required = requiredOf('U60', shocked.mv, shocked.funded);
    const lmv = lmvOf(shocked.mv);
    const x = coreSaleToRestore(shocked.equity, required, lmv, 0.6, 0.05);
    const core = shocked.mv.VOOG + shocked.mv.VGT;
    const after: BalanceSheet = {
      equity: shocked.equity,
      mv: { ...shocked.mv, VOOG: shocked.mv.VOOG * (1 - x / core), VGT: shocked.mv.VGT * (1 - x / core) },
      funded: shocked.funded,
      debt: shocked.debt - x
    };

    assert.ok(excessOf(shocked, 'U60') < 0);
    assert.ok(Math.abs(excessOf(after, 'U60') - 0.05 * lmvOf(after.mv)) < 1e-6);
  });
});
