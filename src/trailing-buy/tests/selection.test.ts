import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { baselineParams } from '../engine.ts';
import { spaces } from '../params.ts';
import type { Candidate, CandidateCache } from '../search.ts';
import { makePicks, robustFront, robustStats, selectFromArchive } from '../selection.ts';

const candidate = (id: string, net: number, dd: number, signature: string): Candidate => ({
  id,
  genome: spaces.legacy.specs.map(() => 0),
  params: baselineParams,
  metrics: {
    netProfit: net,
    maximumDrawdown: dd,
    interest: 0,
    entries: 20,
    closedTrades: 20,
    wins: 10,
    timeInMarket: 0.4,
    worstTradeMark: 0,
    setupsArmed: 0,
    setupsCancelled: 0,
    setupsPendingAtEnd: 0,
    meanWaitSessions: NaN,
    openAtEnd: false,
    positiveYears: 5,
    years: 9
  },
  signature,
  objectives: [-net / 100000, dd / 100000],
  violation: 0,
  origin: { stage: 'sobol', index: 0 }
});

describe('selection', () => {
  test('behavioural clones enter the pool once, so distinct strategies are not crowded out', async () => {
    const clones = Array.from({ length: 300 }, (_value, index) => candidate(`c${index}`, 100000, 20000, 'same'));
    const others = Array.from({ length: 80 }, (_value, index) =>
      candidate(`d${index}`, 90000 - index * 100, 19000 + index * 10, `s${index}`)
    );
    // Neighbours behave like the candidate itself.
    const cache = {
      simulations: 0,
      evaluate: async (genomes: number[][]) => genomes.map(() => clones[0]!)
    } as unknown as CandidateCache;
    const selection = await selectFromArchive(
      spaces.legacy,
      cache,
      [...clones, ...others],
      { net: 50000, dd: 25000 },
      64,
      256
    );

    assert.equal(selection.pool.filter((row) => row.signature === 'same').length, 1);
    assert.ok(selection.pool.length >= 64);
  });

  test('picks: profit = highest robust net; balanced respects B0 drawdown; lowDD respects 75% of B0 net', () => {
    const rows = [
      robustStats({ id: 'a', params: baselineParams, net: 120, dd: 30, entries: 10, signature: 'a' }, [
        { net: 120, dd: 30 }
      ]),
      robustStats({ id: 'b', params: baselineParams, net: 100, dd: 20, entries: 10, signature: 'b' }, [
        { net: 100, dd: 20 }
      ]),
      robustStats({ id: 'c', params: baselineParams, net: 70, dd: 10, entries: 10, signature: 'c' }, [
        { net: 70, dd: 10 }
      ]),
      robustStats({ id: 'd', params: baselineParams, net: 80, dd: 40, entries: 10, signature: 'd' }, [
        { net: 80, dd: 40 }
      ])
    ];
    const front = robustFront(rows);
    const picks = makePicks(front, { net: 100, dd: 25 });

    assert.deepEqual(
      front.map((row) => row.id),
      ['a', 'b', 'c']
    );
    assert.equal(picks.profit.id, 'a');
    assert.equal(picks.balanced.id, 'b');
    // c's robust net 70 is below 75% of B0's 100, so lowDD is b; with B0 net 90 the floor is 67.5 and c qualifies.
    assert.equal(picks.lowDD.id, 'b');
    assert.equal(makePicks(front, { net: 90, dd: 25 }).lowDD.id, 'c');
    // No robust drawdown within B0's: balanced falls back to the lowest robust drawdown.
    assert.equal(makePicks(front, { net: 100, dd: 5 }).balanced.fallback, true);
    assert.equal(makePicks(front, { net: 100, dd: 5 }).balanced.id, 'c');
  });
});
