// The exit side (SPECIFICATION.md §4–§5) on synthetic minute data: legacy equivalence of RiskExitManager with every
// control off (random paths), the protective trigger's fill conventions (identical to the frozen trailing stop's),
// boundaries, gaps, every precedence case of §4.1, the adaptive and the disabled hold. No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession } from '#types';
import type { Dataset } from '../../four-family/data.ts';
import {
  type ExitDecision,
  type ExitSettings,
  type LotState,
  type StopFill,
  type StrategyParams,
  ExitManager
} from '../../shared-margin-portfolio/strategy.ts';
import { type ExitPolicy, RiskExitManager, protectiveTrigger } from '../exit.ts';
import { type Bar, datasetOf, exitParams, flat, lotAt, sessionOf, weekdays } from './fixtures.ts';

const settings = (stopFill: StopFill = 'stop'): ExitSettings => ({ stopFill, marginInterestRate: 0.11 });
const legacyPolicy = (p: StrategyParams): ExitPolicy => ({ protectiveLevel: null, hold: { mode: 'legacy', days: p.maximumHoldDays } });
const COST = 1.0005; // the 5 bps entry cost inside the lot's entry price

// Drives one position from its fill (session 0, bar `fillBar`) through the sessions, as ShadowBook does: evaluate at
// each session it is open at the start, then afterSession (never on the entry session). Returns the exit, if any.
const drive = (ds: Dataset, m: ExitManager, raw: number, fillBar = 0) => {
  const lot = lotAt(ds, 0, raw * COST);

  m.onEntry(lot, 0, fillBar, raw);
  for (let s = 1; s < ds.sessionCount; s++) {
    const d = m.evaluate(lot, s);

    if (d) return { s, d, lot };
    m.afterSession(lot, s);
  }
  return { s: -1, d: undefined, lot };
};

// ----- a seeded generator of random minute paths -----

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const randomPath = (r: () => number, sessions: number, start: number): MarketSession[] => {
  const dates = weekdays(sessions, '2021-01-04');
  let p = start;

  return dates.map((date) => {
    const n = 2 + Math.floor(r() * 6);
    const gap = r() < 0.25 ? (r() - 0.6) * 0.12 : 0;
    const bars: Bar[] = [];

    p *= 1 + gap;
    for (let i = 0; i < n; i++) {
      const o = p;

      p *= 1 + (r() - 0.52) * 0.04;
      bars.push({ o, c: p, h: Math.max(o, p) * (1 + r() * 0.01), l: Math.min(o, p) * (1 - r() * 0.015), slot: i * (1 + Math.floor(r() * 3)) });
    }
    return sessionOf(date, bars, { closingPrint: r() < 0.15 ? null : p });
  });
};

describe('RiskExitManager with every control off equals the frozen ExitManager', () => {
  it('decides the same exit, session by session, on 400 random paths (both stop fills, both stop policies)', () => {
    const r = rng(20261113);
    let exits = 0;

    for (let i = 0; i < 400; i++) {
      const ds = datasetOf(randomPath(r, 25, 50 + r() * 100));
      const params = exitParams({
        trailingStopPercentage: 0.02 + r() * 0.1,
        maximumHoldDays: 1 + Math.floor(r() * 12),
        intradayLossBuffer: 0.005 + r() * 0.05,
        stopPolicy: r() < 0.8 ? 'net' : 'breakeven'
      });
      const fill: StopFill = r() < 0.5 ? 'stop' : 'next-open';
      const raw = ds.bOpen[0]!;
      const a = new ExitManager(ds, params, settings(fill));
      const b = new RiskExitManager(ds, params, settings(fill), legacyPolicy(params));
      const lotA = lotAt(ds, 0, raw * COST);
      const lotB = lotAt(ds, 0, raw * COST);

      a.onEntry(lotA, 0, 0, raw);
      b.onEntry(lotB, 0, 0, raw);
      for (let s = 1; s < ds.sessionCount; s++) {
        const da = a.evaluate(lotA, s);
        const db = b.evaluate(lotB, s);

        assert.deepEqual(db, da, `path ${i} session ${s}`);
        assert.equal(Object.is(b.pendingSignalTime, a.pendingSignalTime) || b.pendingSignalTime === a.pendingSignalTime, true);
        if (da) {
          exits++;
          break;
        }
        a.afterSession(lotA, s);
        b.afterSession(lotB, s);
        assert.equal(b.stopPrice, a.stopPrice);
        assert.equal(b.stopActiveSessions, a.stopActiveSessions);
      }
    }
    assert.ok(exits > 300, `exits on most paths (${exits})`);
  });
});

// A position in profit with an active trailing stop at T: entered at 100, its post-entry high is 120 (stop 5% → 114).
const profitable = (date: string, bars: Bar[], o: Parameters<typeof sessionOf>[2] = {}) =>
  datasetOf([sessionOf('2021-03-01', [{ o: 100, c: 120, h: 120, l: 100 }]), sessionOf(date, bars, o)]);

describe('the protective trigger uses the frozen trailing stop’s fill conventions', () => {
  const cases: { name: string; bars: Bar[]; fill: StopFill; o?: Parameters<typeof sessionOf>[2] }[] = [
    { name: 'gap at the open', bars: [{ o: 110, c: 112 }, { o: 112, c: 113 }], fill: 'stop' },
    { name: 'a minute opening through the level', bars: [{ o: 118, c: 116 }, { o: 113, c: 112 }], fill: 'stop' },
    { name: 'a minute trading down to the level (stop fill)', bars: [{ o: 118, c: 117, l: 113.5 }, { o: 117, c: 118 }], fill: 'stop' },
    { name: 'the same with the next-open fill', bars: [{ o: 118, c: 117, l: 113.5 }, { o: 116, c: 118 }], fill: 'next-open' },
    { name: 'next-open on the last minute: the closing print', bars: [{ o: 118, c: 117 }, { o: 117, c: 116, l: 113 }], fill: 'next-open' },
    {
      name: 'next-open on the last minute without a closing print: the trigger minute’s close',
      bars: [{ o: 118, c: 117 }, { o: 117, c: 116, l: 113 }],
      fill: 'next-open',
      o: { closingPrint: null }
    }
  ];

  for (const c of cases)
    it(c.name, () => {
      const ds = profitable('2021-03-02', c.bars, c.o);
      const legacy = drive(ds, new ExitManager(ds, exitParams({ maximumHoldDays: 30 }), settings(c.fill)), 100);
      const T = 120 * 0.95;

      assert.ok(legacy.d && legacy.d.stopActive, 'the legacy trailing stop is active and exits');

      const p = protectiveTrigger(ds, 1, T, c.fill)!;

      assert.deepEqual(
        { barIndex: p.barIndex, price: p.price, time: p.time, execution: p.execution },
        { barIndex: legacy.d!.barIndex, price: legacy.d!.price, time: legacy.d!.time, execution: legacy.d!.execution }
      );
    });
});

// An underwater position (no active trailing stop): entered at 100 (raw), stop 8% → L = 92.
const L8: ExitPolicy = { protectiveLevel: 92, hold: { mode: 'legacy', days: 30 } };
const L8at = (days: number): ExitPolicy => ({ protectiveLevel: 92, hold: { mode: 'legacy', days } });
const under = (bars: Bar[], o: Parameters<typeof sessionOf>[2] = {}) =>
  datasetOf([sessionOf('2021-03-01', [{ o: 100, c: 99 }]), sessionOf('2021-03-02', [{ o: 97, c: 96 }, { o: 96, c: 95 }]), sessionOf('2021-03-03', bars, o)]);
const run = (ds: Dataset, policy: ExitPolicy, p: Partial<StrategyParams> = {}, fill: StopFill = 'stop') => {
  const params = exitParams({ maximumHoldDays: 30, ...p });
  const hold = policy.hold.mode === 'legacy' ? { mode: 'legacy' as const, days: params.maximumHoldDays } : policy.hold;

  return drive(ds, new RiskExitManager(ds, params, settings(fill), { ...policy, hold }), 100);
};

describe('the protective stop on an underwater position', () => {
  it('protects a position that was never profitable (the legacy stop is inactive)', () => {
    const ds = under([{ o: 95, c: 93 }, { o: 93, c: 90, l: 89 }]);
    const legacy = drive(ds, new ExitManager(ds, exitParams({ maximumHoldDays: 30 }), settings()), 100);
    const x = run(ds, L8);

    assert.equal(legacy.d, undefined, 'no legacy exit: the trailing stop is inactive under water');
    assert.equal(x.d?.reason, 'protective stop');
    assert.equal(x.d?.stopActive, false);
    assert.deepEqual([x.s, x.d?.barIndex, x.d?.price, x.d?.execution], [2, 1, 92, 'stop level']);
  });

  it('triggers at equality (inclusive) and not a hair above', () => {
    assert.equal(run(under([{ o: 95, c: 93, l: 92 }]), L8).d?.price, 92);
    assert.equal(run(under([{ o: 95, c: 93, l: 92.000001 }]), L8).d, undefined);
  });

  it('fills a minute opening through the level at that open, below the level', () => {
    const x = run(under([{ o: 95, c: 94 }, { o: 91, c: 90.5 }]), L8);

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price, x.d?.execution], ['protective stop', 1, 91, 'minute open through stop']);
  });

  it('fills a gap at the opening trade, below the level: not a loss cap', () => {
    const x = run(under([{ o: 80, c: 82 }]), L8);

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price, x.d?.execution], ['protective stop gap', 0, 80, 'opening trade']);
    assert.ok(x.d!.price < 92);
  });

  it('uses the next minute’s open under the next-open fill', () => {
    const x = run(under([{ o: 95, c: 93, l: 91 }, { o: 90, c: 91 }]), L8, {}, 'next-open');

    assert.deepEqual([x.d?.barIndex, x.d?.price, x.d?.execution], [1, 90, 'first trade after decision']);
  });

  it('is not evaluated on the entry session (the D1 convention): a fall there is realized at the next open', () => {
    const ds = datasetOf([sessionOf('2021-03-01', [{ o: 100, c: 99 }, { o: 99, c: 85, l: 84 }]), sessionOf('2021-03-02', [{ o: 86, c: 87 }])]);
    const x = run(ds, L8);

    assert.deepEqual([x.s, x.d?.reason, x.d?.price], [1, 'protective stop gap', 86]);
  });

  it('is skipped when the session has no minute reaching it (missing minutes are not traded)', () => {
    const x = run(under([{ o: 95, c: 93, slot: 0 }, { o: 93.5, c: 94, slot: 30 }]), L8);

    assert.equal(x.d, undefined);
  });
});

describe('precedence inside one session (SPECIFICATION.md §4.1)', () => {
  it('an active trailing stop gapped through keeps the opening trade (legacy reason)', () => {
    const ds = profitable('2021-03-02', [{ o: 90, c: 91 }]);
    const x = drive(ds, new RiskExitManager(ds, exitParams({ maximumHoldDays: 30 }), settings(), { protectiveLevel: 95, hold: { mode: 'legacy', days: 30 } }), 100);

    assert.deepEqual([x.d?.reason, x.d?.price], ['trailing stop gap', 90]);
  });

  it('an active trailing stop is reached first intraday (its level is above L)', () => {
    const ds = profitable('2021-03-02', [{ o: 118, c: 117 }, { o: 117, c: 94, l: 90 }]);
    const x = drive(ds, new RiskExitManager(ds, exitParams({ maximumHoldDays: 30 }), settings(), { protectiveLevel: 95, hold: { mode: 'legacy', days: 30 } }), 100);

    assert.deepEqual([x.d?.reason, x.d?.price], ['trailing stop', 114]);
  });

  // the hold is due at 2021-03-03 (2 calendar days) with a loss at the open
  const due = (bars: Bar[]) => under(bars);

  it('a maximum hold due at the open loses to a protective stop reached in an earlier minute', () => {
    const x = run(due([{ o: 94, c: 93, l: 91.5 }, { o: 93, c: 93 }]), L8, { maximumHoldDays: 2 });

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price, x.d?.isMaximumHoldDue], ['protective stop', 0, 92, true]);
  });

  it('a maximum hold due at the open wins a tie at its own fill minute (decided at the open)', () => {
    const x = run(due([{ o: 94, c: 93 }, { o: 91, c: 90 }]), L8, { maximumHoldDays: 2 });

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price], ['maximum hold', 1, 91]);
  });

  it('a protective gap takes the opening trade ahead of a maximum hold due', () => {
    const x = run(due([{ o: 90, c: 89 }, { o: 89, c: 88 }]), L8, { maximumHoldDays: 2 });

    assert.deepEqual([x.d?.reason, x.d?.price], ['protective stop gap', 90]);
  });

  // a buffered sale signalled in the last minute of 2021-03-02 (its decision is the close: carried overnight)
  const carried = (next: Bar[]) =>
    datasetOf([
      sessionOf('2021-03-01', [{ o: 100, c: 100 }]),
      // a profitable open (no maximum-hold exit at 1 day), then a −3% close in the session's last minute
      sessionOf('2021-03-02', [{ o: 100.5, c: 100.5, slot: 0 }, { o: 99, c: 97, slot: 389 }], { closingPrint: 97 }),
      sessionOf('2021-03-03', next)
    ]);
  const carry = (ds: Dataset) =>
    drive(ds, new RiskExitManager(ds, exitParams({ maximumHoldDays: 1, intradayLossBuffer: 0.02 }), settings(), L8at(1)), 100);

  it('a carried buffered sale fills at the opening trade before a later protective trigger', () => {
    const x = carry(carried([{ o: 96, c: 95 }, { o: 95, c: 91, l: 90 }]));

    assert.deepEqual([x.s, x.d?.reason, x.d?.price, x.d?.execution], [2, 'buffered intraday loss', 96, 'opening trade']);
  });

  it('a protective gap takes the opening trade from a carried buffered sale', () => {
    const x = carry(carried([{ o: 90, c: 91 }]));

    assert.deepEqual([x.s, x.d?.reason, x.d?.price], [2, 'protective stop gap', 90]);
  });

  // after the hold age, a profitable open (no maximum-hold exit), then an intraday buffered-loss signal at minute 0
  const afterAge = (bars: Bar[]) =>
    datasetOf([sessionOf('2021-03-01', [{ o: 100, c: 100 }]), flat('2021-03-02', 100.5), sessionOf('2021-03-03', bars)]);
  const buf = (ds: Dataset) =>
    drive(ds, new RiskExitManager(ds, exitParams({ maximumHoldDays: 1, intradayLossBuffer: 0.02 }), settings(), { protectiveLevel: 95, hold: { mode: 'legacy', days: 1 } }), 100);

  it('the buffered loss wins when the stop is only reached by a low in the minute after its signal', () => {
    const x = buf(afterAge([{ o: 101, c: 97.5 }, { o: 96, c: 96, l: 94 }]));

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price], ['buffered intraday loss', 1, 96]);
  });

  it('the stop wins when the next minute opens through it', () => {
    const x = buf(afterAge([{ o: 101, c: 97.5 }, { o: 94.5, c: 94 }]));

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price], ['protective stop', 1, 94.5]);
  });

  it('the stop wins when reached in the signal minute', () => {
    const x = buf(afterAge([{ o: 101, c: 97.5, l: 94.9 }, { o: 96, c: 96 }]));

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price], ['protective stop', 0, 95]);
  });

  it('a stop reached by the signal minute voids the overnight carry of a last-minute buffered signal', () => {
    const ds = afterAge([{ o: 101, c: 100, slot: 0 }, { o: 100, c: 97.5, l: 94, slot: 389 }]);
    const m = new RiskExitManager(ds, exitParams({ maximumHoldDays: 1, intradayLossBuffer: 0.02 }), settings(), { protectiveLevel: 95, hold: { mode: 'legacy', days: 1 } });
    const x = drive(ds, m, 100);

    assert.deepEqual([x.d?.reason, x.d?.barIndex, x.d?.price], ['protective stop', 1, 95]);
    assert.ok(Number.isNaN(m.pendingSignalTime), 'no carry remains');
  });
});

describe('the adaptive (progress-extended) hold', () => {
  // entry at 100 raw on 2021-03-01 (Mon); base 3 days, extended 10, progress 5% → 105
  const adaptive = (extended = 10): ExitPolicy => ({
    protectiveLevel: null,
    hold: { mode: 'adaptive', baseDays: 3, extendedDays: extended, progressPrice: 100 * 1.05 }
  });
  const days = (entryHigh: number, path: number[]) =>
    datasetOf([
      sessionOf('2021-03-01', [{ o: 100, c: 100, h: entryHigh }]),
      ...weekdays(path.length, '2021-03-02').map((d, i) => flat(d, path[i]!))
    ]);
  const go = (ds: Dataset) => {
    const m = new RiskExitManager(ds, exitParams({ maximumHoldDays: 3, intradayLossBuffer: 0.5, trailingStopPercentage: 0.1 }), settings(), adaptive());

    return { m, x: drive(ds, m, 100) };
  };

  it('keeps the base hold without progress: a loss at the open on day 3 exits', () => {
    const { m, x } = go(days(101, [99, 99, 99, 99]));

    assert.deepEqual([x.d?.reason, (x.d!.time - Date.parse('2021-03-04') / 1000) > 0, m.effectiveHold, m.extendedFrom], ['maximum hold', true, 3, -1]);
  });

  it('extends from the next session once the post-entry high reaches entry × (1 + g), inclusive, and latches', () => {
    const { m, x } = go(days(105, [99, 99, 99, 99, 99, 99, 99, 99, 99, 99]));

    assert.equal(m.extendedFrom, 1, 'extended from the first session after the entry (the entry session’s high counts)');
    assert.equal(m.effectiveHold, 10);
    assert.equal(x.d?.reason, 'maximum hold');
    assert.equal(ds_date(x), '2021-03-11', 'the first session ≥ 10 calendar days after 2021-03-01');
  });

  it('uses only the post-entry high through the previous session (no lookahead)', () => {
    // the session of 2021-03-03 trades up to 106 (progress) but the base hold is due at 2021-03-04 at a loss:
    // the extension applies from 2021-03-04 (the high of 2021-03-03 is known after its close)
    const ds = datasetOf([
      sessionOf('2021-03-01', [{ o: 100, c: 100 }]),
      flat('2021-03-02', 99),
      sessionOf('2021-03-03', [{ o: 99, c: 99, h: 106 }]),
      flat('2021-03-04', 98),
      flat('2021-03-05', 98)
    ]);
    const m = new RiskExitManager(ds, exitParams({ maximumHoldDays: 3, intradayLossBuffer: 0.5, trailingStopPercentage: 0.1 }), settings(), adaptive());
    const x = drive(ds, m, 100);

    assert.equal(x.d, undefined, 'held: extended before 2021-03-04 opens');
    assert.equal(ds.dates[m.extendedFrom], '2021-03-04');
  });

  it('keeps a profitable position at the extended expiry (the loss-only condition is preserved)', () => {
    const { x } = go(days(106, [101, 101, 101, 101, 101, 101, 101, 101, 101, 101, 101]));

    assert.equal(x.d, undefined);
  });

  it('applies the loss buffer only from the effective age', () => {
    const ds = datasetOf([
      sessionOf('2021-03-01', [{ o: 100, c: 100, h: 106 }]),
      ...weekdays(6, '2021-03-02').map((d) => sessionOf(d, [{ o: 100.5, c: 100.5 }, { o: 100.5, c: 96 }, { o: 96, c: 100.5 }]))
    ]);
    const m = new RiskExitManager(ds, exitParams({ maximumHoldDays: 3, intradayLossBuffer: 0.02, trailingStopPercentage: 0.1 }), settings(), adaptive(7));
    const x = drive(ds, m, 100);

    assert.equal(ds_date(x), '2021-03-08', 'first buffered exit at day 7 (the extended age), not day 3');
    assert.equal(x.d?.reason, 'buffered intraday loss');
  });
});

const ds_date = (x: { d?: ExitDecision; s: number }) => (x.d ? new Date(x.d.time * 1000).toISOString().slice(0, 10) : null);

describe('the disabled hold', () => {
  it('never exits by the maximum hold or the loss buffer, however long; the protective stop still acts', () => {
    const dates = weekdays(300, '2021-03-02');
    const ds = datasetOf([
      sessionOf('2021-03-01', [{ o: 100, c: 100 }]),
      ...dates.map((d, i) => (i < 299 ? sessionOf(d, [{ o: 97, c: 93 }, { o: 93, c: 97 }]) : sessionOf(d, [{ o: 95, c: 92 }])))
    ]);
    const m = new RiskExitManager(ds, exitParams({ maximumHoldDays: 3, intradayLossBuffer: 0.02 }), settings(), { protectiveLevel: 92, hold: { mode: 'disabled' } });
    const x = drive(ds, m, 100);

    assert.equal(x.s, 300, 'held for 299 losing sessions (over 400 calendar days)');
    assert.equal(x.d?.reason, 'protective stop');
    assert.equal(m.effectiveHold, Infinity);
    assert.equal(x.d?.isMaximumHoldDue, false);
  });

  it('the legacy manager on the same path exits at the first losing open after 3 days', () => {
    const ds = datasetOf([sessionOf('2021-03-01', [{ o: 100, c: 100 }]), ...weekdays(5, '2021-03-02').map((d) => sessionOf(d, [{ o: 97, c: 93 }, { o: 93, c: 97 }]))]);
    const x = drive(ds, new ExitManager(ds, exitParams({ maximumHoldDays: 3 }), settings()), 100);

    assert.equal(x.d?.reason, 'maximum hold');
  });
});

describe('construction guards', () => {
  it('refuses a legacy hold that differs from the book’s own maximumHoldDays', () => {
    const ds = under([{ o: 95, c: 94 }]);

    assert.throws(() => new RiskExitManager(ds, exitParams({ maximumHoldDays: 5 }), settings(), { protectiveLevel: null, hold: { mode: 'legacy', days: 6 } }));
  });

  it('does not mutate the book’s params (the effective hold is written into a private copy)', () => {
    const ds = under([{ o: 95, c: 94 }]);
    const p = exitParams({ maximumHoldDays: 5 });

    drive(ds, new RiskExitManager(ds, p, settings(), { protectiveLevel: null, hold: { mode: 'disabled' } }), 100);
    assert.equal(p.maximumHoldDays, 5);
  });

  it('keeps LotState untouched', () => {
    const ds = under([{ o: 95, c: 90, l: 85 }]);
    const m = new RiskExitManager(ds, exitParams(), settings(), L8at(5));
    const x = drive(ds, m, 100);
    const lot: LotState = x.lot;

    assert.equal(lot.investment, 100_000);
  });
});
