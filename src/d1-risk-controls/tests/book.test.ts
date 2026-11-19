// The controlled D1 book (SPECIFICATION.md §4–§8) on synthetic paths: legacy parity with Priority 3's runD1Book
// (scenarios and random paths/grids, both stop fills, stresses), the protective stop on a crash (loss smaller than the
// legacy maximum-hold loss on this modelled path, yet larger than the stop distance: not a cap), stop slippage on
// protective fills, calendar-day interest, the decline gate (block, refusal log, cooldown, allowance, profitable-exit
// reset, continuation untouched), the disabled and adaptive holds, and determinism. No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Dataset } from '../../four-family/data.ts';
import { type D1Grid, type Friction, baseFriction, runD1Book } from '../../vg-d1-growth-joint/books.ts';
import { type RiskVBook, runD1BookWithControls } from '../book.ts';
import type { D1RiskControls } from '../config.ts';
import { datasetOf } from './fixtures.ts';
import { type Day, crash, grid, pathOf, recovery, whipsaw } from './scenarios.ts';

const opts = (ds: Dataset, friction?: Friction) => ({ armStart: 0, accountingStart: 0, endIndex: ds.sessionCount - 1, friction });
const run = (days: Day[], c: D1RiskControls | null, g: D1Grid = grid(), friction?: Friction) => {
  const ds = datasetOf(pathOf(days));

  return { ds, b: runD1BookWithControls(ds, 'VGT', g, c, opts(ds, friction)) };
};
const withoutRc = (b: RiskVBook) => {
  const { rc: _rc, ...rest } = b;

  return rest;
};
// the behaviour of a book (a non-legacy book's key carries its controls by design)
const behaviour = (b: RiskVBook) => {
  const { rc: _rc, key: _key, ...rest } = b;

  return rest;
};
const dateOf = (ds: Dataset, s: number) => ds.dates[s]!;
const STOP8: D1RiskControls = { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } };

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('legacy parity: every control at its default equals Priority 3’s runD1Book exactly', () => {
  const legacyForms: (D1RiskControls | null)[] = [
    null,
    {},
    { protectiveStop: { mode: 'off' }, hold: { mode: 'legacy' }, declineGate: { mode: 'off' } }
  ];

  for (const [name, days] of Object.entries({ crash, recovery, whipsaw }))
    it(`${name}: identical VBook for absent, empty and explicit-default controls`, () => {
      const ds = datasetOf(pathOf(days));
      const p3 = runD1Book(ds, 'VGT', grid(), opts(ds));

      for (const c of legacyForms) assert.deepEqual(withoutRc(runD1BookWithControls(ds, 'VGT', grid(), c, opts(ds))), p3);
    });

  it('identical on 150 random paths × random grids, both stop fills, cost/interest/slippage stresses', () => {
    const r = rng(7);
    let trades = 0;

    for (let i = 0; i < 150; i++) {
      const days: Day[] = [];
      let p = 100;

      for (let d = 0; d < 40; d++) {
        const open = p * (1 + (r() < 0.2 ? (r() - 0.6) * 0.1 : 0));
        const closes: number[] = [];

        p = open;
        for (let k = 0; k < 2 + Math.floor(r() * 5); k++) closes.push((p *= 1 + (r() - 0.5) * 0.05));
        days.push({ open, closes, closingPrint: r() < 0.1 ? null : undefined });
      }

      const ds = datasetOf(pathOf(days));
      const g = grid({
        targetPercentChange: 30 + Math.floor(r() * 120),
        trailingBuyPercentage: 1 + Math.floor(r() * 30),
        trailingStopPercentage: 20 + Math.floor(r() * 100),
        maximumHoldDays: 1 + Math.floor(r() * 12),
        tickWindowSize: 1 + Math.floor(r() * 6),
        intradayLossBuffer: Math.floor(r() * 60),
        pullback: 10 + Math.floor(r() * 100),
        continuationWindow: 1 + Math.floor(r() * 10)
      });
      const fr: Friction = {
        ...baseFriction,
        stopFill: r() < 0.5 ? 'stop' : 'next-open',
        costBps: r() < 0.5 ? 5 : 20,
        rate: r() < 0.5 ? 0.11 : 0.14,
        stopSlippageBps: r() < 0.5 ? 0 : 25
      };
      const p3 = runD1Book(ds, 'VGT', g, opts(ds, fr));

      trades += p3.trades.length;
      assert.deepEqual(withoutRc(runD1BookWithControls(ds, 'VGT', g, null, opts(ds, fr))), p3, `path ${i}`);
    }
    assert.ok(trades > 300, `the random paths trade (${trades})`);
  });
});

describe('the protective stop in a book', () => {
  it('on the crash path: a gap exit below the stop level, with an exact net (not a loss cap)', () => {
    const { ds, b } = run(crash, STOP8);
    const t = b.trades[0]!;
    const f = t.fills[0]!;
    const shares = 100_000 / (90 * 1.0005);
    const interest = (100_000 * 0.11 * 4) / 365; // Fri 2021-03-05 → Tue 2021-03-09: 4 calendar days

    assert.deepEqual([dateOf(ds, t.eS), t.eRaw, dateOf(ds, f.s), f.k, f.raw, f.reason], ['2021-03-05', 90, '2021-03-09', 0, 80, 'protective stop gap']);
    assert.ok(Math.abs(t.vNet - (shares * 80 * 0.9995 - 100_000 - interest)) < 1e-6);
    assert.ok(t.vNet < -8_000, `the realized loss ${t.vNet.toFixed(2)} exceeds the 8% stop distance`);
    assert.equal(b.rc.trades[0]!.protectiveLevel, 90 * 0.92);
    assert.equal(b.rc.trades[0]!.exitControl, 'protective stop');
  });

  it('on the crash path: smaller first-lot loss than the legacy maximum-hold exit (this modelled path only)', () => {
    const legacy = run(crash, null).b.trades[0]!;
    const protectedLot = run(crash, STOP8).b.trades[0]!;

    assert.equal(legacy.fills[0]!.reason, 'maximum hold');
    assert.ok(protectedLot.vNet > legacy.vNet, `${protectedLot.vNet.toFixed(2)} > ${legacy.vNet.toFixed(2)}`);
  });

  it('intraday stop-level fill at exactly L (a minute trading through it), logged apart from trailing and hold exits', () => {
    const { ds, b } = run(crash, STOP8);
    const t = b.trades[2]!;

    assert.deepEqual([dateOf(ds, t.eS), t.eRaw, t.fills[0]!.reason, t.fills[0]!.raw], ['2021-03-16', 62, 'protective stop', 62 * 0.92]);
    assert.deepEqual(b.rc.summary, {
      protectiveExits: 3,
      protectiveGapExits: 2,
      maximumHoldExits: 0,
      adaptiveExtensions: 0,
      episodes: 0,
      blocks: 0,
      blockedSessions: 0,
      blockedMinutes: 0
    });
  });

  it('applies the stop-slippage stress to protective fills (as to trailing-stop fills)', () => {
    const fr: Friction = { ...baseFriction, stopSlippageBps: 25 };
    const t = run(crash, STOP8, grid(), fr).b.trades[0]!;

    assert.ok(Math.abs(t.fills[0]!.price - 80 * 0.9995 * 0.9975) < 1e-12);
    assert.equal(t.fills[0]!.raw, 80);
  });

  it('never opens a continuation window (a protective exit always loses)', () => {
    const { b } = run(crash, STOP8);

    for (const t of b.trades.filter((x) => x.fills[0]?.reason.startsWith('protective'))) assert.ok(t.vNet < 0);
    assert.ok(b.trades.every((t) => t.kind === 'deep'));
  });
});

describe('the decline gate', () => {
  const gate = (losses: number, recoveryTenths: number, maxBlockSessions: number): D1RiskControls['declineGate'] => ({
    mode: 'on',
    losses,
    recoveryTenths,
    maxBlockSessions
  });

  it('K = 1: blocks arming after a failed attempt, logs each refused session, and ends at the cooldown', () => {
    const { ds, b } = run(crash, { ...STOP8, declineGate: gate(1, 500, 3) });
    const types = b.rc.events.map((e) => `${e.date} ${e.type}${e.reason ? ` (${String(e.reason)})` : ''}`);

    assert.deepEqual(types, [
      '2021-03-09 episode start',
      '2021-03-09 block engaged',
      '2021-03-10 arming refused',
      '2021-03-11 arming refused',
      '2021-03-12 arming refused',
      '2021-03-12 episode end (block expired)',
      '2021-03-18 episode start',
      '2021-03-18 block engaged',
      '2021-03-19 arming refused',
      '2021-03-22 arming refused',
      '2021-03-23 episode end (block expired)'
    ]);
    // the stop-only book's second attempt (2021-03-11) is refused; its third attempt (decided 2021-03-16) is allowed
    const stopOnly = run(crash, STOP8).b;

    assert.deepEqual(stopOnly.trades.map((t) => dateOf(ds, t.dS)), ['2021-03-05', '2021-03-11', '2021-03-16', '2021-03-23']);
    assert.deepEqual(b.trades.map((t) => dateOf(ds, t.dS)), ['2021-03-05', '2021-03-16']);
    assert.deepEqual(b.rc.trades.map((t) => [t.gate, t.episode, t.lossesBefore]), [
      ['no episode', null, 0],
      ['no episode', null, 0]
    ]);

    const refused = b.rc.events.find((e) => e.type === 'arming refused')!;

    assert.deepEqual([refused.kind, refused.refHigh, refused.low, refused.resetLevel], ['deep', 100, 76, 88]);
  });

  it('K = 2: the second attempt is "within allowance", the second failure blocks, and the block expires after its sessions', () => {
    const { ds, b } = run(crash, { declineGate: gate(2, 500, 4) });

    assert.deepEqual(b.trades.map((t) => dateOf(ds, t.dS)), ['2021-03-05', '2021-03-11']);
    assert.deepEqual(b.rc.trades[1]!.gate, 'within allowance');
    assert.equal(b.rc.trades[1]!.lossesBefore, 1);
    assert.deepEqual(
      b.rc.events.filter((e) => e.type !== 'arming refused').map((e) => `${e.date} ${e.type}`),
      ['2021-03-10 episode start', '2021-03-16 failed attempt', '2021-03-16 block engaged', '2021-03-22 episode end']
    );
    assert.equal(b.rc.summary.blockedSessions, 4);
  });

  it('a recovery of r of the decline ends the episode at a session close', () => {
    const { b } = run(whipsaw, { declineGate: gate(1, 200, 50) });
    const end = b.rc.events.find((e) => e.type === 'episode end')!;

    // refHigh 100, episode low 76 (2021-03-10 close): reset level 76 + 0.2 × 24 = 80.8, first reached by the close of
    // 2021-03-12 (86)
    assert.deepEqual([end.date, end.reason, end.resetLevel, end.close], ['2021-03-12', 'recovery', 80.8, 86]);
  });

  it('a profitable exit ends an unblocked episode, and the continuation re-entry is untouched', () => {
    const legacy = run(whipsaw, null).b;
    const { ds, b } = run(whipsaw, { declineGate: gate(2, 1000, 10) });

    assert.deepEqual(behaviour(b), behaviour(legacy));
    assert.deepEqual(b.trades.map((t) => t.kind), ['deep', 'deep', 'continuation']);
    assert.deepEqual(
      b.rc.events.map((e) => `${e.date} ${e.type}${e.reason ? ` (${String(e.reason)})` : ''}`),
      ['2021-03-10 episode start', '2021-03-17 episode end (profitable exit)']
    );
    assert.equal(b.rc.trades[1]!.gate, 'within allowance');
    assert.equal(b.rc.trades[2]!.gate, 'no episode');
    assert.equal(dateOf(ds, b.trades[2]!.dS), '2021-03-19');
  });

  it('never blocks a book without failures (the recovery path is unchanged)', () => {
    const legacy = run(recovery, null).b;
    const { b } = run(recovery, { declineGate: gate(1, 500, 3) });

    assert.deepEqual(behaviour(b), behaviour(legacy));
    assert.deepEqual(b.rc.events, []);
  });
});

describe('the hold policies in a book', () => {
  it('disabled (with the stop): no maximum-hold exit; the stop decides', () => {
    const { b } = run(crash, { protectiveStop: { mode: 'on', stopDistanceTenths: 150 }, hold: { mode: 'disabled' } });

    assert.equal(b.rc.summary.maximumHoldExits, 0);
    assert.deepEqual(b.trades.slice(0, 2).map((t) => [t.fills[0]!.reason, t.fills[0]!.raw]), [
      ['protective stop', 76.5],
      ['protective stop', 78 * 0.85]
    ]);
    assert.equal(b.rc.trades[0]!.hold.effectiveDaysAtExit, Infinity);
  });

  it('refuses the disabled hold without the stop, at the runner boundary', () => {
    assert.throws(() => run(crash, { hold: { mode: 'disabled' } }), /requires protectiveStop "on"/);
  });

  it('adaptive: logs the latched extension; the exits are the legacy ones on this path', () => {
    const legacy = run(recovery, null, grid({ maximumHoldDays: 3 })).b;
    const { b } = run(recovery, { hold: { mode: 'adaptive', extendedHoldDays: 10, progressTenths: 50 } }, grid({ maximumHoldDays: 3 }));

    assert.deepEqual(behaviour(b), behaviour(legacy));
    // the post-entry high reaches 90 × 1.05 = 94.5 during 2021-03-08 (high 95): the extension applies from the next session
    assert.equal(b.rc.trades[0]!.hold.extendedFrom, '2021-03-09');
    assert.equal(b.rc.trades[0]!.hold.effectiveDaysAtExit, 10);
    assert.equal(b.rc.summary.adaptiveExtensions, 1);
  });

  it('adaptive: refuses an extended bound not above the book’s hold', () => {
    assert.throws(() => run(recovery, { hold: { mode: 'adaptive', extendedHoldDays: 5, progressTenths: 50 } }), /must exceed maximumHoldDays 5/);
  });

  it('adaptive without progress exits at the base hold (a shorter base than legacy cuts the failed lot earlier)', () => {
    const { ds, b } = run(crash, { hold: { mode: 'adaptive', extendedHoldDays: 20, progressTenths: 100 } }, grid({ maximumHoldDays: 3 }));
    const t = b.trades[0]!;

    assert.deepEqual([dateOf(ds, t.fills[0]!.s), t.fills[0]!.reason, b.rc.trades[0]!.hold.effectiveDaysAtExit], ['2021-03-08', 'maximum hold', 3]);
  });
});

describe('determinism and replay', () => {
  it('repeated runs give byte-identical books and logs', () => {
    const c: D1RiskControls = { ...STOP8, declineGate: { mode: 'on', losses: 1, recoveryTenths: 500, maxBlockSessions: 3 } };
    const a = JSON.stringify(run(crash, c).b);
    const b = JSON.stringify(run(crash, JSON.parse(JSON.stringify(c)) as D1RiskControls).b);

    assert.equal(a, b);
  });
});
