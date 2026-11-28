// risk-envelope: tests of the nonbinding drawdown-policy diagnostics D1–D3 on synthetic portfolio paths (exact
// arithmetic chosen so every expected value is representable), including their edge cases.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { PathPoint } from '../../vg-l0-risk-metrics/ledger.ts';
import {
  ILLUSTRATIVE_HYBRID,
  cappedHybrid,
  componentDrawdown,
  hybridAllowance,
  partitionDrawdown,
  peakEquityDrawdown
} from '../diagnostics.ts';

const path = (xs: [number, number][]): PathPoint[] =>
  // [marked net, banked net]
  xs.map(([m, r], i) => ({ t: 1_500_000_000 + i * 86_400, date: '', m, liq: m - 50, r, lot: null }));

test('D1: the largest decline as a share of the equity peak it fell from (a maximum of ratios)', () => {
  // equity 100k → 150k → 120k → 300k → 240k: 20% then 20%; dollars 30k then 60k
  const d = peakEquityDrawdown(
    path([
      [0, 0],
      [50_000, 0],
      [20_000, 0],
      [200_000, 0],
      [140_000, 0]
    ]),
    100_000
  );

  assert.equal(d.pct, 0.2);
  assert.equal(d.dollars, 30_000); // the first 20% (a strictly larger ratio is needed to replace it)
  const e = peakEquityDrawdown(
    path([
      [0, 0],
      [50_000, 0],
      [20_000, 0],
      [200_000, 0],
      [130_000, 0]
    ]),
    100_000
  );

  assert.equal(e.pct, 70_000 / 300_000);
  assert.equal(e.dollars, 70_000);
  assert.equal(e.peakEquity, 300_000);
  // a loss from the start: the peak is C0 itself
  assert.equal(
    peakEquityDrawdown(
      path([
        [0, 0],
        [-25_000, 0]
      ]),
      100_000
    ).pct,
    0.25
  );
  // no decline
  assert.equal(
    peakEquityDrawdown(
      path([
        [0, 0],
        [1, 0],
        [2, 0]
      ]),
      100_000
    ).pct,
    0
  );
  assert.throws(() => peakEquityDrawdown([], 100_000), /empty/);
  assert.throws(
    () =>
      peakEquityDrawdown(
        path([
          [0, 0],
          [NaN, 0]
        ]),
        100_000
      ),
    /non-finite/
  );
});

test('D2: the capped hybrid allowance and its three regimes', () => {
  const k = ILLUSTRATIVE_HYBRID;

  assert.equal(hybridAllowance(100_000, 100_000, k), 40_000); // floor
  assert.equal(hybridAllowance(130_000, 100_000, k), 40_000); // 0.3 × 130k = 39k < floor
  assert.equal(hybridAllowance(150_000, 100_000, k), 45_000); // peak-proportional
  assert.equal(hybridAllowance(200_000, 100_000, k), 60_000); // 0.3 × 200k = 60k = cap
  assert.equal(hybridAllowance(400_000, 100_000, k), 60_000); // cap
  assert.equal(hybridAllowance(500_000, 500_000, k), 200_000); // scales with C0
  assert.throws(() => hybridAllowance(1, 1, { floorPct: 70, slopePct: 30, capPct: 60 }), /floor exceeds/);

  const a = cappedHybrid(
    path([
      [0, 0],
      [50_000, 0],
      [10_000, 0]
    ]),
    100_000
  ); // peak 150k, allowance 45k, DD 40k

  assert.equal(a.allowance, 45_000);
  assert.equal(a.utilization, 40_000 / 45_000);
  assert.equal(a.pass, true);
  assert.equal(a.regime, 'peak-proportional');
  const b = cappedHybrid(
    path([
      [0, 0],
      [300_000, 0],
      [230_000, 0]
    ]),
    100_000
  ); // cap 60k, DD 70k

  assert.equal(b.pass, false);
  assert.equal(b.regime, 'cap');
  const c = cappedHybrid(
    path([
      [0, 0],
      [-40_000, 0]
    ]),
    100_000
  ); // floor 40k, DD 40k: exactly at the allowance

  assert.equal(c.utilization, 1);
  assert.equal(c.pass, true);
  assert.equal(c.regime, 'floor');
});

test('D3: the account-level interval partition adds up to the drawdown exactly and never double counts', () => {
  // peak +60k, trough −10k, banked high +30k: 30k unbanked giveback, 30k banked erosion, 10k below the starting capital
  assert.deepEqual(partitionDrawdown(60_000, -10_000, 30_000), {
    unbankedGiveback: 30_000,
    bankedErosion: 30_000,
    capitalLoss: 10_000,
    residual: 0
  });
  // all above the banked high: pure giveback
  assert.deepEqual(partitionDrawdown(60_000, 40_000, 30_000), {
    unbankedGiveback: 20_000,
    bankedErosion: 0,
    capitalLoss: 0,
    residual: 0
  });
  // a banked high above the marked peak (a partial sale while the remainder was under water): no giveback above it
  assert.deepEqual(partitionDrawdown(20_000, 5_000, 30_000), {
    unbankedGiveback: 0,
    bankedErosion: 15_000,
    capitalLoss: 0,
    residual: 0
  });
  // nothing banked: everything above zero is giveback, everything below is capital loss
  assert.deepEqual(partitionDrawdown(10_000, -5_000, 0), {
    unbankedGiveback: 10_000,
    bankedErosion: 0,
    capitalLoss: 5_000,
    residual: 0
  });
  // a drawdown entirely below the starting capital
  assert.deepEqual(partitionDrawdown(-1_000, -9_000, 0), {
    unbankedGiveback: 0,
    bankedErosion: 0,
    capitalLoss: 8_000,
    residual: 0
  });
  assert.throws(() => partitionDrawdown(0, 1, 0), /peak ≥ trough/);
  assert.throws(() => partitionDrawdown(1, 0, -1), /banked high/);

  // on a path: the tracker's window, H by the trough
  const p = componentDrawdown(
    path([
      [0, 0],
      [30_000, 30_000],
      [60_000, 30_000],
      [-10_000, 30_000],
      [5_000, 5_000]
    ]),
    null
  );

  assert.equal(p.dd, 70_000);
  assert.deepEqual(p.account, { unbankedGiveback: 30_000, bankedErosion: 30_000, capitalLoss: 10_000, residual: 0 });
  assert.equal(p.window!.bankedHigh, 30_000);
  assert.equal(p.bankedDd, 40_000); // H 30k − M −10k
  const flat = componentDrawdown(
    path([
      [0, 0],
      [1, 0]
    ]),
    null
  );

  assert.equal(flat.window, null);
  assert.equal(flat.dd, 0);
});
