import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession } from '#types';
import { bandOf, policies, policyById } from '../constants.ts';
import { isDip } from '../data.ts';
import { type Gate, scanEntry } from '../policies.ts';
import { bar, buildSessions, flatBars, minuteLabel, utcOf, withBars } from './helpers.ts';

const open: Gate = () => true;
const date = '2017-03-14';

const sessionOf = (bars = flatBars(100), closingPrint: number | null = 100, day = date, closeAt = '16:00') =>
  buildSessions([{ date: day, bars, closingPrint: closingPrint ?? undefined, closeAt }])[0]!;

// Qualifying bars (recent high 100) from `from` for `count` minutes at a close and low.
const dipRun = (from: string, count: number, close: number, low = close - 0.1) => {
  const [hours, minutes] = from.split(':').map(Number) as [number, number];

  return Array.from({ length: count }, (_, k) => {
    const at = minuteLabel(hours * 60 + minutes + k);

    return bar(at, close, close + 0.05, low, close);
  });
};

const scan = (id: string, session: MarketSession, gate = open, recentHigh = 100) =>
  scanEntry(policyById(id), session, recentHigh, gate);

describe('decision and fill clock', () => {
  it('FIRST_1000 ignores qualifying minutes before 10:00 and fills after the deciding minute', () => {
    const session = sessionOf(
      withBars(flatBars(100), [
        bar('09:45', 100, 100, 96.9, 97),
        bar('10:05', 99, 99, 96.9, 97),
        bar('10:06', 98.5, 99, 98, 98.6)
      ])
    );
    const { entry } = scan('FIRST_1000', session);

    assert.equal(entry?.decisionTime, utcOf(date, '10:06'));
    assert.equal(entry?.decisionPrice, 97);
    assert.equal(entry?.fill?.time, utcOf(date, '10:06'));
    assert.equal(entry?.fill?.price, 98.5);
    assert.ok(entry!.fill!.barIndex > entry!.barIndex);
  });

  it('FIRST_0935 decides on the 09:34 minute at 09:35 at the earliest', () => {
    const session = sessionOf(withBars(flatBars(100), [bar('09:33', 97, 97, 97, 97), bar('09:34', 97, 97, 97, 97)]));

    assert.equal(scan('FIRST_0935', session).entry?.decisionTime, utcOf(date, '09:35'));
  });

  it('a 10:00 earliest decision uses the 09:59 minute, completed at 10:00, and fills at the 10:00 open', () => {
    const session = sessionOf(
      withBars(flatBars(100), [bar('09:59', 97, 97, 97, 97), bar('10:00', 97.2, 98, 97, 97.5)])
    );
    const { entry } = scan('FIRST_1000', session);

    assert.equal(entry?.decisionTime, utcOf(date, '10:00'));
    assert.equal(entry?.fill?.price, 97.2);
  });

  it('never decides on the minute that ends at the close, and the last decision matches the incumbent', () => {
    const late = sessionOf(withBars(flatBars(100), [bar('15:59', 97, 97, 97, 97)]));

    assert.equal(scan('FIRST_1000', late).entry, undefined);
    assert.equal(scan('CLOSE_1M', late).entry, undefined);

    const last = sessionOf(
      withBars(flatBars(100), [bar('15:58', 97, 97, 97, 97), bar('15:59', 97.1, 97.1, 97.1, 97.1)])
    );

    for (const id of ['FIRST_1000', 'CLOSE_1M']) {
      const { entry } = scan(id, last);

      assert.equal(entry?.decisionTime, utcOf(date, '15:59'));
      assert.equal(entry?.fill?.price, 97.1);
      assert.equal(entry?.isFinalDecision, true);
    }
  });

  it('falls back to the closing print, and has no entry without any later trade', () => {
    const noLastMinute = sessionOf(withBars(flatBars(100, '16:00', ['15:59']), [bar('15:58', 97, 97, 97, 97)]), 96.5);

    assert.equal(scan('FIRST_1400', noLastMinute).entry?.fill?.execution, 'closing print');
    assert.equal(scan('FIRST_1400', noLastMinute).entry?.fill?.price, 96.5);

    const nothingAfter = sessionOf(withBars(flatBars(100, '16:00', ['15:59']), [bar('15:58', 97, 97, 97, 97)]), null);
    const result = scan('FIRST_1400', nothingAfter);

    assert.ok(result.entry);
    assert.equal(result.entry.fill, undefined);
  });

  it('keeps FIRST_1400 at 14:00 on an early close: no eligible minute, while CLOSE_1M decides at 12:59', () => {
    const early = '2017-11-24';
    const session = sessionOf(flatBars(97, '13:00'), 97, early, '13:00');

    assert.equal(session.isEarlyClose, true);

    const result = scan('FIRST_1400', session);

    assert.equal(result.entry, undefined);
    assert.equal(result.eligibleBars, 0);
    assert.equal(scan('CLOSE_1M', session).entry?.decisionTime, utcOf(early, '12:59'));
    assert.equal(scan('FIRST_1200', session).entry?.decisionTime, utcOf(early, '12:00'));
  });

  it('decisions do not depend on any later minute (causality)', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    for (let trial = 0; trial < 40; trial++) {
      let price = 98;
      const bars = flatBars(100).map((item) => {
        price = Math.max(90, Math.min(101, price + (random() - 0.5) * 0.6));

        return bar(item.at, price, price + random() * 0.3, price - random() * 0.3, price + (random() - 0.5) * 0.2);
      });
      const session = sessionOf(bars, price);

      for (const policy of policies) {
        const result = scanEntry(policy, session, 100, open);

        if (!result.entry) {
          continue;
        }

        const { barIndex, decisionTime, decisionPrice } = result.entry;
        const changed = sessionOf(
          bars.map((item, index) => (index > barIndex ? bar(item.at, 50, 120, 40, 60 + random() * 50) : item)),
          77
        );
        const again = scanEntry(policy, changed, 100, open).entry;

        assert.equal(again?.decisionTime, decisionTime, policy.id);
        assert.equal(again?.decisionPrice, decisionPrice, policy.id);
        assert.ok(result.entry.fill!.time >= decisionTime);
      }
    }
  });
});

describe('confirmation mechanisms', () => {
  it('PERSIST_15 needs 15 consecutive qualifying minutes and restarts after a missing minute', () => {
    const short = sessionOf(withBars(flatBars(100), dipRun('10:00', 14, 97)));

    assert.equal(scan('PERSIST_15', short).entry, undefined);

    const full = sessionOf(withBars(flatBars(100), dipRun('11:00', 15, 97)));

    assert.equal(scan('PERSIST_15', full).entry?.decisionTime, utcOf(date, '11:15'));

    // 11:07 missing: the count restarts at 11:08 and reaches 15 at 11:22.
    const gapped = sessionOf(
      withBars(flatBars(100, '16:00', ['11:07']), dipRun('11:00', 7, 97).concat(dipRun('11:08', 15, 97)))
    );

    assert.equal(scan('PERSIST_15', gapped).entry?.decisionTime, utcOf(date, '11:23'));
  });

  it('STABLE_15 waits for 15 minutes without a new low, resets on a new low and on a missing minute', () => {
    const base = withBars(flatBars(100), [bar('10:30', 97, 97, 96.5, 97), ...dipRun('10:31', 60, 97, 96.8)]);

    assert.equal(scan('STABLE_15', sessionOf(base)).entry?.decisionTime, utcOf(date, '10:46'));

    const newLow = withBars(base, [bar('10:40', 97, 97, 96, 97)]);

    assert.equal(scan('STABLE_15', sessionOf(newLow)).entry?.decisionTime, utcOf(date, '10:56'));

    const gap = sessionOf(base.filter((item) => item.at !== '10:35'));

    assert.equal(scan('STABLE_15', gap).entry?.decisionTime, utcOf(date, '10:51'));

    // The close must still qualify when the timer is reached.
    const lifted = withBars(base, dipRun('10:44', 5, 98, 97.5));

    assert.equal(scan('STABLE_15', sessionOf(lifted)).entry?.decisionTime, utcOf(date, '10:50'));
  });

  it('REBOUND_03 fires on the first close 0.3% above the trough that still qualifies, never on the first minute', () => {
    const bars = withBars(flatBars(100), [
      bar('10:30', 96.2, 96.6, 96, 96.5),
      bar('10:31', 96.3, 96.3, 95.9, 96.18),
      bar('10:32', 96.1, 96.3, 96, 96.2)
    ]);

    assert.equal(scan('REBOUND_03', sessionOf(bars)).entry?.decisionTime, utcOf(date, '10:33'));

    // A rebound above the 2.5% threshold doesn't qualify.
    const above = withBars(bars, [bar('10:32', 96.1, 97.8, 96, 97.6), bar('10:33', 97.6, 97.6, 97.6, 97.6)]);

    assert.equal(scan('REBOUND_03', sessionOf(above)).entry, undefined);
  });

  it('a gate-blocked decision does not reset the setup', () => {
    const session = sessionOf(withBars(flatBars(100), [bar('10:05', 97, 97, 97, 97), bar('10:10', 96, 96, 96, 96)]));
    const result = scan('FIRST_1000', session, (price) => price <= 96.5);

    assert.equal(result.blocked, 1);
    assert.equal(result.entry?.decisionTime, utcOf(date, '10:11'));
  });
});

describe('correction-depth bands', () => {
  it('has the frozen boundaries', () => {
    assert.equal(bandOf(0.025), 'SHALLOW');
    assert.equal(bandOf(0.0499999), 'SHALLOW');
    assert.equal(bandOf(0.05), 'MODERATE');
    assert.equal(bandOf(0.0999999), 'MODERATE');
    assert.equal(bandOf(0.1), 'DEEP');
    assert.equal(bandOf(0.1499999), 'DEEP');
    assert.equal(bandOf(0.15), 'EXTREME');
    assert.equal(bandOf(0.4), 'EXTREME');
    assert.equal(isDip(97.6, 100), false);
    assert.equal(isDip(97.4, 100), true);
  });

  it('records the band at the decision instant', () => {
    const session = sessionOf(withBars(flatBars(100), [bar('10:05', 94, 94, 94, 94), bar('15:58', 88, 88, 88, 88)]));

    assert.equal(scan('FIRST_1000', session).entry?.band, 'MODERATE');
    assert.equal(scan('CLOSE_1M', session).entry?.band, 'DEEP');
  });

  it('BAND_LATE_DEEP buys a stabilized moderate dip intraday but deep and shallow ones only at the final decision', () => {
    const moderate = sessionOf(
      withBars(flatBars(100), [bar('10:30', 94, 94, 93.5, 94), ...dipRun('10:31', 30, 94, 93.8)])
    );

    assert.equal(scan('BAND_LATE_DEEP', moderate).entry?.decisionTime, utcOf(date, '10:46'));

    for (const close of [88, 97]) {
      const entry = scan('BAND_LATE_DEEP', sessionOf(flatBars(close), close)).entry;

      assert.equal(entry?.decisionTime, utcOf(date, '15:59'));
      assert.equal(entry?.mechanism, 'close');
    }
  });

  it('starts a new band run from scratch: no time is credited across bands', () => {
    const bars = withBars(flatBars(100), [
      ...dipRun('10:30', 11, 94, 93.9),
      ...dipRun('10:41', 20, 89, 88.9),
      ...dipRun('11:01', 40, 94, 93.95)
    ]);

    assert.equal(scan('BAND_STABILIZE', sessionOf(bars)).entry?.decisionTime, utcOf(date, '11:17'));
  });

  it('the EXTREME branch of BAND_STABILIZE needs 30 quiet minutes and a 0.5% rebound on the same minute', () => {
    const rebound = withBars(flatBars(100), [bar('10:30', 84, 84, 83.5, 84), ...dipRun('10:31', 60, 84, 83.6)]);

    assert.equal(scan('BAND_STABILIZE', sessionOf(rebound)).entry?.decisionTime, utcOf(date, '11:01'));

    const noRebound = withBars(flatBars(100), [bar('10:30', 84, 84, 83.5, 83.8), ...dipRun('10:31', 329, 83.8, 83.6)]);

    assert.equal(scan('BAND_STABILIZE', sessionOf(noRebound, 83.8)).entry, undefined);
    assert.equal(scan('BAND_PERSIST', sessionOf(noRebound, 83.8)).entry?.decisionTime, utcOf(date, '11:01'));
  });
});
