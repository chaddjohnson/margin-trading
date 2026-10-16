import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { baselineSettings } from '../constants.ts';
import { type EntryPolicy, baselinePolicy, simulate } from '../engine.ts';
import { barsFrom, randomWalk } from './helpers.ts';

// 100 flat sessions, a 10.6% dip bought at 89.5, a slide to 88 held past the 15-day maximum hold, then
// `tail`.
const scenario = (tail: number[]) => barsFrom([...Array(100).fill(100), 89.5, ...Array(14).fill(88), ...tail]);

describe('baseline state transitions', () => {
  it('restricts after a material loss, blocks a re-entry above 97% of the loss exit and re-enters below it', () => {
    const bars = scenario([87, 86, 85, 85]);
    const result = simulate({ bars, policy: baselinePolicy() });
    const reasons = result.stateLog.map((row) => row.reason);

    assert.equal(result.trades[0]!.entryPrice, 89.5);
    assert.equal(result.trades[0]!.reason, 'maximum hold');
    assert.ok(result.trades[0]!.priceReturn <= -0.005);
    assert.ok(reasons.includes('losing_exit'));
    assert.ok(reasons.includes('entry_blocked'));
    assert.ok(reasons.includes('lower_price_reentry'));
    const reentry = result.trades[1]!;
    assert.ok(reentry.entryPrice <= result.trades[0]!.exitPrice * 0.97);
  });

  it('clears the restriction by a 38% recovery reset without buying on the reset session', () => {
    const bars = scenario([90, 92, 95, 89.9]);
    const result = simulate({ bars, policy: baselinePolicy() });
    const reset = result.stateLog.find((row) => row.reason === 'recovery_reset')!;

    assert.ok(reset);
    assert.ok(!result.trades.some((trade) => trade.entryIndex === reset.index));
    // Entries resume after the reset: the 89.9 close is a fresh 10% signal.
    assert.equal(result.trades.at(-1)!.entryPrice, 89.9);
  });

  it('charges simple interest per calendar day held at 11%, none on the entry day', () => {
    const bars = scenario([87]);
    const trade = simulate({ bars, policy: baselinePolicy() }).trades[0]!;
    const days = (trade.exitTime - trade.entryTime) / 86400;
    assert.ok(Math.abs(trade.interest - (100000 * 0.11 * days) / 365) < 1e-9);
    assert.ok(Math.abs(trade.profit - (trade.shares * trade.exitPrice - 100000 - trade.interest)) < 1e-9);
  });

  it('scales financing with the margin-rate setting and leaves the trades unchanged', () => {
    const bars = barsFrom(randomWalk(800, 21, 0.0003, 0.025));
    const base = simulate({ bars, policy: baselinePolicy() });
    const dear = simulate({ bars, policy: baselinePolicy(), settings: { ...baselineSettings, marginRate: 0.14 } });
    assert.deepEqual(
      base.trades.slice(0, 3).map((t) => t.entryIndex),
      dear.trades.slice(0, 3).map((t) => t.entryIndex)
    );
    assert.ok(Math.abs(dear.trades[0]!.interest / base.trades[0]!.interest - 14 / 11) < 1e-9);
  });

  it('applies costs to P&L only, never to decisions', () => {
    const bars = barsFrom(randomWalk(800, 22, 0.0003, 0.025));
    const base = simulate({ bars, policy: baselinePolicy() });
    const costly = simulate({ bars, policy: baselinePolicy(), settings: { ...baselineSettings, costBps: 10 } });
    assert.deepEqual(
      base.trades.map((t) => [t.entryIndex, t.exitIndex, t.reason]),
      costly.trades.map((t) => [t.entryIndex, t.exitIndex, t.reason])
    );
    assert.ok(costly.netProfit < base.netProfit);
  });
});

describe('same-close versus next-session execution', () => {
  const bars = barsFrom(randomWalk(900, 31, 0.0003, 0.028), {});
  const close = simulate({ bars, policy: baselinePolicy(), execution: 'close' });
  const next = simulate({ bars, policy: baselinePolicy(), execution: 'nextOpen' });

  it('fills a same-close entry at the signal close', () => {
    for (const trade of close.trades) {
      assert.equal(trade.entryIndex, trade.signalIndex);
      assert.equal(trade.entryPrice, bars.close[trade.signalIndex]);
    }
  });

  it('fills a next-open entry at the following session’s open and evaluates no exit on the fill session', () => {
    assert.ok(next.trades.length > 3);
    for (const trade of next.trades) {
      assert.equal(trade.entryIndex, trade.signalIndex + 1);
      assert.equal(trade.entryPrice, bars.open[trade.signalIndex + 1]);
      assert.notEqual(trade.exitIndex, trade.entryIndex);
    }
  });

  it('never decides on a fill session or an exit session', () => {
    const fills = new Set(next.trades.map((trade) => trade.entryIndex));
    const exits = new Set(next.trades.map((trade) => trade.exitIndex));
    for (const row of next.decisions.filter((row) => !row.reason.startsWith('filled'))) {
      assert.ok(!fills.has(row.index) && !exits.has(row.index), row.date);
    }
  });
});

describe('policy-driven entries keep the original constraints', () => {
  it('blocks a policy entry the restriction forbids and labels it', () => {
    // A policy that always wants to buy, even without a signal.
    const eager: EntryPolicy = { id: 'eager', decide: () => ({ enter: true, reason: 'eager' }) };
    const bars = scenario([87, 86, 85, 85]);
    const result = simulate({ bars, policy: eager });
    const blocked = result.decisions.filter((row) => row.reason.includes('blocked_by_restriction'));
    assert.ok(blocked.length > 0);
    for (const row of blocked) assert.ok(!result.trades.some((trade) => trade.entryIndex === row.index));
  });

  it('holds at most one position at a time', () => {
    const eager: EntryPolicy = { id: 'eager', decide: () => ({ enter: true, reason: 'eager' }) };
    const result = simulate({ bars: barsFrom(randomWalk(600, 41, 0.0003, 0.03)), policy: eager });
    for (let i = 1; i < result.trades.length; i++) {
      assert.ok(result.trades[i]!.entryIndex > result.trades[i - 1]!.exitIndex);
    }
  });
});
