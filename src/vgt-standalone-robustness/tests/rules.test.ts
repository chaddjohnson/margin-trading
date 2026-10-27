// The study's rules without market data: the constants are the prior audit's, the matched designs are its per-book
// VGT designs, the joint designs are deterministic and legal, no variant touches a phenotype or pool config, the run
// list matches the protocol's counts, the lot-path identity and the (b) tally behave as predeclared, and a cost change
// alters a profit-dependent exit (synthetic data).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { d1Keys } from '../../multi-etf-allocator/phenotypes.ts';
import { testGrid } from '../../multi-etf-allocator/tests/fixtures.ts';
import { type SessionSpec, flat, flats, weekdayUniverse } from '../../d1-ranked-preemption/tests/fixtures.ts';
import * as prior from '../../b4-b5-robustness/context.ts';
import { lotRecordsOf, runSpec } from '../../b4-b5-robustness/run.ts';
import type { RunSpec as PriorRunSpec } from '../../b4-b5-robustness/specs.ts';
import { itemOutcome, lotIdentity, pathChange, tallyOf } from '../analysis.ts';
import * as context from '../context.ts';
import { allSpecs, jointDesign, loadFrozenPools, loadStandalones, pairedDesign, vgtOatPoints } from '../specs.ts';

const sha256 = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

describe('protocol constants', () => {
  test('the window, conventions, cost scenarios and regimes are the prior audit’s objects', () => {
    assert.equal(context.base, prior.base);
    assert.equal(context.costScenarios, prior.costScenarios);
    assert.equal(context.regimeWindows, prior.regimeWindows);
    assert.equal(context.distancesOf, prior.distancesOf);
    assert.equal(context.priorProtocolSha256, prior.protocolSha256);
  });

  test('the cost layers add up and the flag thresholds are the prior gates where shared', () => {
    for (const scenario of context.costScenarios) {
      assert.equal(scenario.costBps, scenario.feeBps + scenario.slippageBps);
    }

    assert.equal(context.flags.concentrationShare, prior.gates.concentrationShare);
    assert.equal(context.flags.stabilityProfitableShare, prior.gates.stabilityProfitableShare);
    assert.equal(context.flags.stabilityMedianRatio, prior.gates.stabilityMedianRatio);
  });

  test('the protocol file hashes to the recorded amendment head', async () => {
    assert.equal(await sha256(context.protocolFile), context.protocolSha256);

    const freeze = await fs.readJson(context.protocolFreezeFile);

    assert.equal(freeze.protocolSha256, context.protocolOriginalSha256);
    assert.equal(freeze.amendments.at(-1).protocolSha256, context.protocolSha256);
  });
});

describe('designs', async () => {
  const configFiles = ['config/pools/B4.json', 'config/pools/B5.json', 'config/phenotypes/D1/VGT.json'];
  const before = await Promise.all(configFiles.map(sha256));
  const pools = await loadFrozenPools();
  const standalones = await loadStandalones();
  const s = standalones[0]!;

  test('the only standalone is VGT primary, equal to the pools’ VGT book', () => {
    assert.deepEqual(
      standalones.map((item) => item.id),
      ['VGT-primary']
    );

    for (const pool of ['B4', 'B5'] as const) {
      assert.deepEqual(pools[pool].books.find((book) => book.symbol === 'VGT')!.grid, s.book.grid);
    }
  });

  test('the matched designs equal the prior audit’s per-book VGT samples (MANIFEST.json)', async () => {
    const manifest = await fs.readJson(`${context.priorRoot}/MANIFEST.json`);

    for (const pool of ['B4', 'B5'] as const) {
      const { samples } = pairedDesign(pools, pool);
      const stored = manifest.samples.filter(
        (item: { pool: string; design: string }) => item.pool === pool && item.design === 'book-VGT'
      );

      assert.equal(samples.length, 32);
      assert.deepEqual(
        stored.map((item: { values: number[] }) => item.values),
        samples
      );
    }
  });

  test('the joint designs are deterministic, legal, inside the moderate box and on the integer grid', () => {
    for (const seed of context.jointSeeds) {
      const first = jointDesign(s, seed);
      const second = jointDesign(s, seed);

      assert.deepEqual(first.samples, second.samples);
      assert.equal(first.samples.length, 64);

      first.dimensions.forEach((dimension, d) => {
        const { moderate } = context.distancesOf(dimension.key, dimension.frozen);
        const { min, max } = context.legal(dimension.key);

        for (const values of first.samples) {
          const value = values[d]!;

          assert.ok(Number.isInteger(value));
          assert.ok(
            value >= Math.max(min, dimension.frozen - moderate) && value <= Math.min(max, dimension.frozen + moderate)
          );
        }

        // Latin hypercube: every stratum of N is hit once, so the column spans its range.
        assert.ok(new Set(first.samples.map((values) => values[d])).size > 1);
      });
    }

    assert.notDeepEqual(jointDesign(s, 1).samples, jointDesign(s, 2).samples);
  });

  test('the OAT points are the 32 feasible prior VGT points', () => {
    const points = vgtOatPoints(pools);

    assert.equal(points.length, 32);
    assert.ok(points.every((point) => point.feasible));
  });

  test('the run list has the protocol’s counts, unique keys, and leaves every config untouched', async () => {
    const { specs } = allSpecs(pools, standalones);
    const count = (family: string) => specs.filter((spec) => spec.family === family).length;

    assert.equal(specs.length, 623);
    assert.deepEqual(
      ['s-base', 's-control', 's-cost', 's-oat', 's-paired', 's-joint', 'p-path'].map(count),
      [2, 7, 36, 64, 128, 256, 130]
    );
    assert.equal(new Set(specs.map((spec) => spec.key)).size, specs.length);

    // Every perturbed book is labelled diagnostic, and the frozen books in memory are unchanged.
    for (const spec of specs.filter(
      (item) => item.diagnostic && ['s-oat', 's-paired', 's-joint'].includes(item.family)
    )) {
      assert.ok(
        spec.books.every(
          (book) => book.phenotype.endsWith('~diag') || d1Keys.every((key) => book.grid[key] === s.book.grid[key])
        )
      );
    }

    assert.deepEqual(pools.B4.books.find((book) => book.symbol === 'VGT')!.grid, s.book.grid);
    assert.deepEqual(await Promise.all(configFiles.map(sha256)), before);
  });
});

describe('lot paths and the (b) rule', () => {
  const lot = (symbol: string, decisionTime: number, exitTime: number, exitReason = 'trailing stop') =>
    ({
      symbol,
      decisionTime,
      exitTime,
      exitReason,
      entryDate: '',
      exitDate: '',
      net: 0,
      interest: 0,
      friction: 0,
      lotDays: 1
    }) as never;

  test('identity uses the decision, the exit time and the reason', () => {
    assert.notEqual(lotIdentity(lot('VGT', 1, 2)), lotIdentity(lot('VGT', 1, 3)));
    assert.notEqual(lotIdentity(lot('VGT', 1, 2)), lotIdentity(lot('VGT', 1, 2, 'maximum hold')));
    assert.equal(lotIdentity(lot('VGT', 1, NaN, 'open')), 'VGT@1>open:open');
  });

  test('preservation, additions, removals and changed exits', () => {
    const frozen = [lot('VGT', 1, 2), lot('VGT', 3, 4), lot('XBI', 5, 6)];
    const run = [lot('VGT', 1, 2), lot('VGT', 3, 9), lot('KRE', 7, 8)];
    const all = pathChange(frozen, run);
    const vgt = pathChange(frozen, run, (symbol) => symbol === 'VGT');

    assert.equal(all.kept, 1);
    assert.equal(all.removed.length, 2);
    assert.equal(all.added.length, 2);
    assert.equal(all.exitChanged, 1);
    assert.ok(Math.abs(all.preserved - 1 / 3) < 1e-12);
    assert.equal(vgt.preserved, 0.5);
  });

  test('item outcomes respect the direction and the tie band', () => {
    assert.equal(itemOutcome({ s: 0.8, p: 0.9, higher: true, tie: 0.02 }), 'pool better');
    assert.equal(itemOutcome({ s: 0.9, p: 0.89, higher: true, tie: 0.02 }), 'tie');
    assert.equal(itemOutcome({ s: 0.01, p: 0.03, higher: false, tie: 0.005 }), 'S better');
  });

  test('the tally needs five wins and at most two losses', () => {
    const rows = (s: number, p: number) => [
      ...Array.from({ length: s }, () => ({ outcome: 'S better' })),
      ...Array.from({ length: p }, () => ({ outcome: 'pool better' })),
      ...Array.from({ length: 8 - s - p }, () => ({ outcome: 'tie' }))
    ];

    assert.equal(tallyOf(rows(5, 2)).verdict, 'S more robust on matched tests');
    assert.equal(tallyOf(rows(5, 3)).verdict, 'no clear difference');
    assert.equal(tallyOf(rows(1, 7)).verdict, 'pool more robust on matched tests');
    assert.equal(tallyOf(rows(4, 4)).verdict, 'no clear difference');
  });
});

describe('a cost change alters a profit-dependent exit (synthetic)', () => {
  // Flats at 100, a dip that arms and fills at 90, one session up to 95 (the 5% stop trails to 90.25), then a fall
  // through 90.25. At 0 bps a fill at 90.25 nets a profit, so D1's net-profit stop is active and exits there; at 30 bps
  // per side it would not, so the stop stays inactive and the lot is still held at the end.
  const sessions: SessionSpec[] = [
    ...flats(4, 100),
    { closes: [100, 89, 88, 90, 89.5, 90] },
    flat(95),
    { closes: [95, 92, 90, 89, 89] },
    ...flats(3, 89)
  ];
  const universe = weekdayUniverse({ AAA: sessions });
  const spec = (costBps: number) =>
    ({
      key: 'synthetic',
      family: 'cost',
      pool: 'B4',
      mode: 'fixed',
      books: [{ symbol: 'AAA', phenotype: 'test', grid: { ...testGrid } }],
      rate: 0.11,
      costBps,
      stopSlippageBps: 0,
      stopFill: 'stop',
      dividends: 'frozen',
      diagnostic: true,
      detail: true,
      meta: {}
    }) satisfies PriorRunSpec;

  test('the exit changes, not only the net', () => {
    const cheap = lotRecordsOf(runSpec(universe, spec(0)));
    const costly = lotRecordsOf(runSpec(universe, spec(30)));

    assert.equal(cheap.length, 1);
    assert.equal(costly.length, 1);
    assert.equal(cheap[0]!.exitReason, 'trailing stop');
    assert.ok(Math.abs(cheap[0]!.exitRawPrice - 95 * 0.95) < 1e-9);
    assert.notEqual(costly[0]!.exitReason, 'trailing stop');
    assert.notEqual(lotIdentity(costly[0]!), lotIdentity(cheap[0]!));
  });
});
