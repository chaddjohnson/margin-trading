// Small parity runs for the test suite (the sealed parity stages run the full counts): P0 = the frozen replay, P2L = the
// frozen replayPreemptive, fast = the independent reference on synthetic pools. Synthetic markets only.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { paritySyntheticFrozen } from '../parity.ts';
import { compareWithReference } from '../referenceParity.ts';
import { syntheticMarket } from '../../study3-vgt-momentum-stage1b/tests/synthetic.ts';
import { paramsOfGrid } from '../books.ts';
import { policyOf, runAllocator, type Policy } from '../allocator.ts';
import { buildTrace, baseSettings } from '../trace.ts';
import { runReference } from '../reference.ts';
import { Rng } from '../../optimizer/rng.ts';

describe('parity', () => {
  test('P0 = frozen replayFixedPool and P2L = frozen replayPreemptive on synthetic pools', () => {
    const result = paritySyntheticFrozen();

    assert.equal(result.pass, true, JSON.stringify(result.checks.filter((c) => !c.pass).slice(0, 3)));
  });

  test('fast allocator = independent reference engine on random synthetic pools and policies', () => {
    const rng = new Rng([3, 1, 4, 1]);
    const markets = Array.from({ length: 4 }, (_, i) => {
      const ds = syntheticMarket(300, 60 + i, 30);

      ds.id = `test-${i}`;
      return ds;
    });
    const kinds: Policy['kind'][] = ['P0', 'P0M', 'P1', 'P2', 'P3', 'P4'];

    for (let r = 0; r < 30; r++) {
      const books = [0, 1, 2].map((i) => {
        const tier = i === 0 ? 'deep' : 'shallow';
        const grid = {
          targetPercentChange: tier === 'deep' ? 50 + rng.int(60) : 20 + rng.int(30),
          trailingBuyPercentage: 1 + rng.int(20),
          trailingStopPercentage: 20 + rng.int(40),
          maximumHoldDays: 3 + rng.int(5),
          tickWindowSize: 20 + rng.int(20),
          intradayLossBuffer: rng.int(30),
          pullback: 30 + rng.int(90),
          continuationWindow: 10 + rng.int(100)
        };
        const m = rng.int(markets.length);

        return { id: `${tier}${i}:M${m}`, symbol: `M${m}`, tier, grid, ds: markets[m]! } as const;
      });
      const policy = policyOf(kinds[rng.int(kinds.length)]!, {
        budget: 1000,
        deadline: rng.int(2),
        gate: (['G0', 'G1', 'G2'] as const)[rng.int(3)]!
      });
      const settings = baseSettings();
      const fast = runAllocator(
        books.map((book, rank) => ({
          id: book.id,
          symbol: book.symbol,
          tier: book.tier,
          ds: book.ds,
          trace: buildTrace(book.ds, book, settings, 40),
          shallowRank: book.tier === 'shallow' ? rank : undefined
        })),
        {
          startIndex: 0,
          endIndex: 299,
          armStart: 40,
          principal: 100000,
          rate: 0.11,
          costBps: 5,
          stopSlippageBps: 0,
          policy,
          tieMode: 'tier'
        }
      );
      const ref = runReference(
        books.map((book, rank) => ({
          id: book.id,
          symbol: book.symbol,
          tier: book.tier,
          ds: book.ds,
          params: paramsOfGrid(book.symbol, book.grid),
          shallowRank: book.tier === 'shallow' ? rank : undefined
        })),
        {
          startIndex: 0,
          endIndex: 299,
          armStart: 40,
          principal: 100000,
          rate: 0.11,
          costBps: 5,
          stopSlippageBps: 0,
          stopFill: 'stop',
          policy,
          tieMode: 'tier'
        }
      );
      const check = compareWithReference(`pool ${r}`, fast, ref)[0]!;

      assert.equal(check.pass, true, String(check.actual));
    }
  });
});
