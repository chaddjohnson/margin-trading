// The decline gate's state machine in isolation (SPECIFICATION.md §6): the exact recovery boundary (inclusive), the
// cooldown boundary, re-anchoring (none), the profitable-exit reset, and the refusal log (one event per session).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { VirtualTrade } from '../../multi-etf-allocator/shadow.ts';
import { DeclineGate, type RcEvent } from '../book.ts';
import { datasetOf, flat, weekdays } from './fixtures.ts';

const closes = (xs: number[]) => datasetOf(weekdays(xs.length).map((d, i) => flat(d, xs[i]!)));
const trade = (id: number, net: number, referenceHigh = 100) => ({ id, net, referenceHigh }) as VirtualTrade;
const gateOn = (xs: number[], cfg = { losses: 1, recoveryTenths: 500, maxBlockSessions: 100 }) => {
  const events: RcEvent[] = [];

  return { ds: closes(xs), g: new DeclineGate(closes(xs), cfg, events), events };
};

describe('decline gate boundaries', () => {
  it('resets at a close exactly at the recovery level (inclusive), not a hair below', () => {
    // refHigh 100, low 80 (session 0's close): level 80 + 0.5 × 20 = 90
    const below = gateOn([80, 89.999999, 85]);

    below.g.onExit(0, 0, trade(1, -500));
    for (let s = 0; s < 3; s++) below.g.afterClose(s);
    assert.equal(below.g.blocked, true);

    const at = gateOn([80, 90, 85]);

    at.g.onExit(0, 0, trade(1, -500));
    at.g.afterClose(0);
    at.g.afterClose(1);
    assert.equal(at.g.episode, null);
    assert.deepEqual(at.events.map((e) => [e.type, e.reason ?? '']), [
      ['episode start', ''],
      ['block engaged', ''],
      ['episode end', 'recovery']
    ]);
  });

  it('ends a block exactly maxBlockSessions sessions after it engaged (at that session’s close)', () => {
    const { g, events } = gateOn([80, 79, 78, 77, 76], { losses: 1, recoveryTenths: 1000, maxBlockSessions: 3 });

    g.onExit(1, 0, trade(1, -500));
    g.afterClose(1);
    g.afterClose(2);
    g.afterClose(3);
    assert.equal(g.blocked, true, 'two sessions after: still blocked');
    g.afterClose(4);
    assert.equal(g.episode, null, 'three sessions after: ended');
    assert.equal(events.at(-1)!.reason, 'block expired');
  });

  it('keeps the first attempt’s reference high (no re-anchoring) and counts every failure once', () => {
    const { g } = gateOn([80, 70, 60], { losses: 3, recoveryTenths: 500, maxBlockSessions: 100 });

    g.onExit(0, 0, trade(1, -1, 100));
    g.afterClose(0);
    g.onExit(1, 0, trade(2, -1, 85));
    g.afterClose(1);
    assert.deepEqual([g.episode!.refHigh, g.episode!.losses, g.blocked], [100, 2, false]);
    g.onExit(2, 0, trade(3, 0, 70)); // net exactly 0 is a failed attempt (the complement of net > 0)
    assert.deepEqual([g.episode!.losses, g.blocked], [3, true]);
  });

  it('a profitable exit ends an unblocked episode; it is an error while blocked', () => {
    const a = gateOn([80, 81]);

    a.g.onExit(0, 0, trade(1, -1));
    assert.throws(() => a.g.onExit(1, 0, trade(2, 10)), /while the decline gate is blocked/);

    const b = gateOn([80, 81], { losses: 2, recoveryTenths: 500, maxBlockSessions: 10 });

    b.g.onExit(0, 0, trade(1, -1));
    b.g.onExit(1, 0, trade(2, 10));
    assert.equal(b.g.episode, null);
    assert.equal(b.events.at(-1)!.reason, 'profitable exit');
  });

  it('logs one refusal event per session, with the minutes counted', () => {
    const { g, events } = gateOn([80, 79, 78]);

    g.onExit(0, 0, trade(1, -1));
    g.refuse(1, 100, 'deep', 79);
    g.refuse(1, 160, 'deep', 79);
    g.refuse(2, 200, 'deep', 78);
    g.finish(2);

    const refused = events.filter((e) => e.type === 'arming refused');

    assert.deepEqual(refused.map((e) => [e.date, e.minutes]), [
      [weekdays(3)[1], 2],
      [weekdays(3)[2], 1]
    ]);
    assert.deepEqual([g.blockedSessions, g.blockedMinutes], [2, 3]);
    assert.equal(events.at(-1)!.reason, 'open at end');
  });
});
