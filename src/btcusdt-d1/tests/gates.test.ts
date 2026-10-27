import assert from 'node:assert/strict';
import { test } from 'node:test';
import { procedure } from '../protocol.ts';
import { outOfSampleGate } from '../stages.ts';

// The out-of-sample gate (PROTOCOL.md §8) on hand-made evidence for a 455-day window (minimum 4 entries).
const window = { label: 'validation', startDay: 0, endDay: 455 };
const evidence = (principal: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
  ({
    principal: {
      net: 9000,
      tradeNets: [6000, 2000, 500, 500],
      topOne: 6000,
      minutePercent: 0.1,
      minuteDrawdown: 12000,
      entries: 4,
      ...principal
    },
    costs: [{ scenario: procedure.settings.conservative.costs.label, net: 3000, minutePercent: 0.12, entries: 4 }],
    worstFill: { net: 1000, minutePercent: 0.12 },
    ...overrides
  }) as never;

test('a window passing every out-of-sample test passes', () => {
  assert.equal(outOfSampleGate(evidence({}), window).pass, true);
});

test('a position carried into the window is a trade for the single-trade test', () => {
  // Net 30,000, almost all from a carried-in position; the four entries net -100. Without that one position the
  // window loses money, so it fails, exactly as it would if the 30,100 had been an entered trade.
  const carried = outOfSampleGate(evidence({ net: 30000, tradeNets: [200, 100, -200, -200], topOne: 200 }), window) as {
    pass: boolean;
    tests: { netExTopOne: { carriedIn: number; value: number; pass: boolean } };
  };

  assert.equal(carried.tests.netExTopOne.carriedIn, 30100);
  assert.equal(carried.tests.netExTopOne.value, -100);
  assert.equal(carried.pass, false);

  // The reviewer's case: no entry made money, the carried-in position made it all.
  assert.equal(outOfSampleGate(evidence({ net: 30677, tradeNets: [0, 0, 0, 0], topOne: 0 }), window).pass, false);

  // Still profitable without the carried-in position: the same rule passes it.
  assert.equal(
    outOfSampleGate(evidence({ net: 30000, tradeNets: [200, 100, -100, -100], topOne: 200 }), window).pass,
    true
  );
});

test('each test can fail the gate on its own', () => {
  const failures: [string, Record<string, unknown>, Record<string, unknown>?][] = [
    ['net', { net: -1, tradeNets: [-1] }],
    ['single trade', { net: 5900, tradeNets: [6000, -50, -50], topOne: 6000 }],
    ['drawdown %', { minutePercent: 0.36 }],
    ['drawdown USDT', { minuteDrawdown: 35001 }],
    ['entries', { entries: 3 }],
    ['conservative costs', {}, { costs: [{ scenario: procedure.settings.conservative.costs.label, net: -1 }] }],
    ['worst fill', {}, { worstFill: { net: -1 } }]
  ];

  for (const [label, principal, overrides] of failures) {
    assert.equal(outOfSampleGate(evidence(principal, overrides), window).pass, false, label);
  }
});
