// Stage 1c rule tests (ENGINE_CONTRACT.md §11, §15; brief §8): synthetic sessions with closed-form expectations
// computed here (never taken from an engine) for rule A's eligibility, open test, fills and precedence; rule B's
// cooldown; rule C's arming, level, tolerance, gap and consumption; the boundary carry; rules off = Stage 1b bit for
// bit; ledger identities on every run; the bounded reader's stop; the matrix's arithmetic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import {
  type Bar,
  type SessionSpec,
  datasetOf,
  flatSession,
  randomWalk
} from '../../study3-vgt-momentum/tests/fixtures.ts';
import { Engine as Stage1bEngine } from '../../study3-vgt-momentum-stage1b/engine.ts';
import { syntheticMarket } from '../../study3-vgt-momentum-stage1b/tests/synthetic.ts';
import { cellOf, dimsOf, exitSpecOf, fromUnit, keyOf, policyFromKey } from '../catalog.ts';
import { cells, masks, matrix, search } from '../context.ts';
import { assertEndAllowed, readBounded } from '../data.ts';
import { Engine, defaultOptions } from '../engine.ts';
import type { ExitSpec, Policy, ProtectSpec, RunOptions, RunResult, ScheduleItem } from '../types.ts';

const B0 = 100000;
const c = 5 / 10000;
const r = 0.11;
const day = 86400;

// Consecutive weekdays from Monday 2016-01-04: index 4 = Friday 2016-01-08, 9 = Friday 01-15, 10 = Monday 01-18.
const flat = (price: number, count = 8): SessionSpec => flatSession(price, count);
const opening = (open: number, rest: number, count = 8): SessionSpec => {
  const spec = flatSession(rest, count);

  spec.bars[0] = [open, Math.max(open, rest) * 1.0001, Math.min(open, rest) * 0.9999, rest];
  return spec;
};

const policy = (exit: ExitSpec, protect?: ProtectSpec, reentry: Policy['reentry'] = 'R3F', id = 'AL'): Policy => ({
  id,
  entry: 'C-AL',
  entryParams: {},
  exit,
  reentry,
  sizing: { kind: 'Z0' },
  ...(protect ? { protect } : {})
});

const wide: ExitSpec = { own: false, hard: 0.5 };

// Sessions 0–4 at 100: the C-AL policy decides at index 3's close (the first decision) and buys index 4's open (100).
const pre = () => Array.from({ length: 5 }, () => flat(100));

const runSpecs = (specs: SessionSpec[], schedule: Policy | ScheduleItem[], overrides: Partial<RunOptions> = {}) => {
  const ds = datasetOf(specs);
  const options: RunOptions = { ...defaultOptions(3, ds.sessionCount - 1), recordDaily: true, ...overrides };

  return { ds, result: new Engine(ds).run(schedule, options) };
};

// Identities (i), (ii) and S > 0 while long on any run (PROTOCOL.md §3).
const assertIdentities = (result: RunResult) => {
  const sum = result.trades.reduce((a, t) => a + t.net, 0);

  assert.ok(Math.abs(sum - result.carriedInterest - result.endLiquidation) < 1e-6, 'identity (i)');

  for (const t of result.trades) {
    assert.ok(Math.abs(t.proceeds - t.principal - t.interest - t.net) < 1e-6, `identity (ii) proceeds, trade ${t.id}`);
    assert.ok(Math.abs(t.priceGain - t.friction - t.interest - t.net) < 1e-6, `identity (ii) price gain ${t.id}`);
  }

  for (const row of result.daily ?? []) {
    assert.ok(row.openTrade === 0 || row.shares > 0, 'identity (vii)');
  }
};

// Shares and the threshold open price at which a sale at the open nets exactly zero after `days` of interest.
const entryShares = (entryRaw: number) => B0 / (entryRaw * (1 + c));
const breakEvenOpen = (entryRaw: number, days: number) =>
  (B0 + (B0 * r * days) / 365) / (entryShares(entryRaw) * (1 - c));

describe('rule A — maximum losing hold', () => {
  const losing = (n: number) => [...pre(), ...Array.from({ length: n }, () => flat(99))];

  test('Friday entry, N = 8: first eligible session is Monday after the weekend (date ≥ entry + 8), sold at minute 1', () => {
    const { ds, result } = runSpecs(losing(20), policy(wide, { A: { N: 8 } }));
    const t = result.trades[0]!;

    assert.equal(ds.dates[t.entryIndex], '2016-01-08');
    assert.equal(t.entryBar, 0);
    assert.equal(ds.dates[t.exitIndex], '2016-01-18'); // Saturday 01-16 has no session
    assert.equal(t.exitBar, 1);
    assert.equal(t.exitReason, 'losing hold');
    assert.equal(t.exitRaw, 99);
    // trade interest counted once, on the session dates (10 calendar days)
    assert.ok(Math.abs(t.interest - (B0 * r * 10) / 365) < 1e-9);
    assertIdentities(result);
  });

  test('N = 15: first eligible session is the first dated ≥ entry + 15', () => {
    const { ds, result } = runSpecs(losing(20), policy(wide, { A: { N: 15 } }));

    assert.equal(ds.dates[result.trades[0]!.exitIndex], '2016-01-25');
  });

  test('a holiday on the first eligible date moves the check to the next session', () => {
    const dates = [
      '2016-01-04',
      '2016-01-05',
      '2016-01-06',
      '2016-01-07',
      '2016-01-08',
      '2016-01-11',
      '2016-01-12',
      '2016-01-13',
      '2016-01-14',
      '2016-01-15',
      '2016-01-19',
      '2016-01-20',
      '2016-01-21'
    ];
    const ds = datasetWithDates(
      dates,
      dates.map((_, i) => (i < 4 ? flat(100) : flat(99)))
    );
    const result = new Engine(ds).run(policy(wide, { A: { N: 8 } }), { ...defaultOptions(3, ds.sessionCount - 1) });

    assert.equal(ds.dates[result.trades[0]!.exitIndex], '2016-01-19');
  });

  test('net at the open just above zero holds; just below sells; profitable then losing sells at the later open', () => {
    const at10 = breakEvenOpen(100, 10);
    const at11 = breakEvenOpen(100, 11);
    const base = [...pre(), ...Array.from({ length: 5 }, () => flat(99))];
    const above = runSpecs(
      [...base, opening(at10 * (1 + 1e-7), 99), opening(at11 * (1 - 1e-7), 99), flat(99)],
      policy(wide, { A: { N: 8 } })
    ).result;

    assert.equal(above.trades[0]!.exitIndex, 11, 'held at a net-profitable eligible open, sold at the next losing one');

    const below = runSpecs(
      [...base, opening(at10 * (1 - 1e-7), 99), flat(99), flat(99)],
      policy(wide, { A: { N: 8 } })
    ).result;

    assert.equal(below.trades[0]!.exitIndex, 10);
    assert.equal(below.trades[0]!.exitReason, 'losing hold');
    assert.equal(below.aDue, 1);
  });

  test('a profitable position is never sold by A, however long held', () => {
    const { result } = runSpecs(
      [...pre(), ...Array.from({ length: 40 }, () => flat(110))],
      policy(wide, { A: { N: 3 } })
    );

    assert.equal(result.trades[0]!.exitIndex, -1);
    assert.ok(result.aChecks > 30);
    assert.equal(result.aDue, 0);
  });

  test('stop gap at the eligible open takes the opening trade; A does not also sell', () => {
    const specs = [...pre(), ...Array.from({ length: 5 }, () => flat(96)), flat(90), flat(90)];
    const { result } = runSpecs(specs, policy({ own: false, hard: 0.05 }, { A: { N: 8 } }));
    const t = result.trades[0]!;

    assert.equal(t.exitIndex, 10);
    assert.equal(t.exitBar, 0);
    assert.equal(t.exitReason, 'stop gap');
    assert.equal(result.trades.filter((x) => x.exitReason === 'losing hold').length, 0);
    assert.equal(result.aCancelled, 1);
  });

  test('a stop touched in the opening minute fills first (mode next); in mode open A sells at the print', () => {
    const minute0: SessionSpec = flat(96);

    minute0.bars[0] = [96, 96.1, 94.5, 96]; // low through the 95 stop, open above it
    const specs = [...pre(), ...Array.from({ length: 5 }, () => flat(96)), minute0, flat(96)];
    const next = runSpecs(specs, policy({ own: false, hard: 0.05 }, { A: { N: 8 } })).result.trades[0]!;

    assert.equal(next.exitReason, 'stop');
    assert.equal(next.exitBar, 0);
    assert.ok(Math.abs(next.exitRaw - 95) < 1e-9);

    const open = runSpecs(specs, policy({ own: false, hard: 0.05 }, { A: { N: 8 } }), { losingHoldFill: 'open' }).result
      .trades[0]!;

    assert.equal(open.exitReason, 'losing hold');
    assert.equal(open.exitBar, 0);
    assert.equal(open.exitRaw, 96);
    assert.ok(Math.abs(open.exitPrice - 96 * (1 - c)) < 1e-9);
  });

  test('a delayed opening fill keeps offset 0 (eligible on day N); the sale moves with the delay', () => {
    const open = runSpecs(losing(20), policy(wide, { A: { N: 10 } })).result.trades[0]!;
    const delayed = runSpecs(losing(20), policy(wide, { A: { N: 10 } }), { delayMinutes: 1 });
    const t = delayed.result.trades[0]!;

    assert.equal(open.exitIndex, 10); // Monday 01-18 is day 10
    assert.equal(t.entryBar, 1); // the scheduled opening-fill bar under a 1-minute delay
    assert.equal(delayed.ds.dates[t.exitIndex], '2016-01-18');
    assert.equal(t.exitBar, 2); // the next trade after open + 60 s + the 1-minute delay
  });

  test('an intraday (minute-rule) fill after the opening bar is eligible only after day N', () => {
    // E09 (Y 0.5%): the reference is session 3's low 99.95; minute 3 of session 4 closes at 101 ≥ 100.45 → fill at
    // minute 4's open; the position then loses (99). N = 10: day 10 is Monday 01-18 → not eligible; 01-19 is.
    const trigger: SessionSpec = {
      bars: [
        [100, 100.05, 99.96, 100],
        [100, 100.05, 99.96, 100],
        [100, 100.05, 99.96, 100],
        [100, 101, 100, 101],
        [101, 101.05, 100.95, 101],
        [101, 101.05, 100.95, 101],
        [101, 101.05, 100.95, 101],
        [101, 101.05, 100.95, 101]
      ]
    };
    const specs = [flat(100), flat(100), flat(100), flat(100), trigger, ...Array.from({ length: 12 }, () => flat(99))];
    const e09: Policy = {
      id: 'E09',
      entry: 'E09',
      entryParams: { Y: 0.005 },
      exit: wide,
      reentry: 'R3F',
      sizing: { kind: 'Z0' },
      protect: { A: { N: 10 } }
    };
    const { ds, result } = runSpecs(specs, e09);
    const t = result.trades[0]!;

    assert.equal(t.entryIndex, 4);
    assert.equal(t.entryBar, 4);
    assert.equal(t.rule, 'minute');
    assert.equal(ds.dates[t.exitIndex], '2016-01-19');
    assert.equal(t.exitReason, 'losing hold');
  });

  test('an A exit at a loss keeps the campaign alive (as a stop) and writes the loss record (B applies)', () => {
    const specs = [...losing(12), ...Array.from({ length: 12 }, () => flat(99))];
    const withB = runSpecs(specs, policy(wide, { A: { N: 8 }, B: { C: 5 } }, 'R0')).result;
    const first = withB.trades[0]!;
    const second = withB.trades[1]!;

    assert.equal(first.exitReason, 'losing hold');
    assert.equal(second.entryIndex, first.exitIndex + 6);
    assert.equal(second.kind, 'reentry');
  });
});

describe('rule B — post-loss cooldown', () => {
  // entry 100 at index 4, hard stop 5% → stop at 95 in index 6 (a loss), then flat 96 (no further stop)
  const lossThen = (n = 20) => [...pre(), flat(100), opening(94, 96), ...Array.from({ length: n }, () => flat(96))];

  test('without B the re-entry fills the session after the exit; with C = 5 not before exit + 6', () => {
    const off = runSpecs(lossThen(), policy({ own: false, hard: 0.05 }, undefined, 'R0')).result;
    const on = runSpecs(lossThen(), policy({ own: false, hard: 0.05 }, { B: { C: 5 } }, 'R0')).result;
    const x = off.trades[0]!.exitIndex;

    assert.equal(off.trades[0]!.exitReason, 'stop gap');
    assert.equal(off.trades[1]!.entryIndex, x + 1);
    assert.equal(on.trades[1]!.entryIndex, x + 6);
    assert.equal(on.bBlocks, 5); // the closes x … x + 4 decided and were discarded
    assert.equal(on.trades[1]!.releaseEntry, true); // decided at the first permitted close x + 5
    assert.equal(off.trades[1]!.releaseEntry, false);
    assertIdentities(on);
  });

  test('C = 0 is the no-cooldown control (identical run)', () => {
    const off = runSpecs(lossThen(), policy({ own: false, hard: 0.05 }, undefined, 'R0')).result;
    const zero = runSpecs(lossThen(), policy({ own: false, hard: 0.05 }, { B: { C: 0 } }, 'R0')).result;

    assert.equal(zero.pathHash, off.pathHash);
    assert.equal(zero.endLiquidation, off.endLiquidation);
  });

  test('a profitable exit starts no cooldown', () => {
    const specs = [...pre(), flat(110), flat(120), opening(110, 112), ...Array.from({ length: 10 }, () => flat(112))];
    const exit: ExitSpec = { own: false, trail: { t: 0.05, ref: 0 } };
    const off = runSpecs(specs, policy(exit, undefined, 'R0')).result;
    const on = runSpecs(specs, policy(exit, { B: { C: 5 } }, 'R0')).result;

    assert.ok(off.trades[0]!.net > 0);
    assert.equal(on.pathHash, off.pathHash);
    assert.equal(on.bBlocks, 0);
  });

  test('a fresh event trigger inside the cooldown is discarded, not queued', () => {
    // E05-like behaviour is not needed: with R0 every flat close decides; none may fill early and none is carried
    const on = runSpecs(lossThen(), policy({ own: false, hard: 0.05 }, { B: { C: 3 } }, 'R0')).result;
    const x = on.trades[0]!.exitIndex;

    assert.equal(on.trades[1]!.entryIndex, x + 4);
    assert.equal(on.blocks!.length, 3);
    assert.ok(on.blocks!.every((b) => b.kind === 'B' && b.index >= x && b.index < x + 3));
  });
});

describe('rule B — intraday reference and consumed records', () => {
  const rebound = (): SessionSpec => ({
    bars: [
      [95, 95.05, 94.95, 95],
      [95, 95, 94, 94.2],
      [94.2, 95, 94.2, 95],
      [95, 95.05, 94.95, 95],
      [95, 95.05, 94.95, 95],
      [95, 95.05, 94.95, 95],
      [95, 95.05, 94.95, 95],
      [95, 95.05, 94.95, 95]
    ]
  });
  const trigger: SessionSpec = {
    bars: [
      [100, 100.05, 99.96, 100],
      [100, 100.05, 99.96, 100],
      [100, 100.05, 99.96, 100],
      [100, 101, 100, 101],
      [101, 101.05, 100.95, 101],
      [101, 101.05, 100.95, 101],
      [101, 101.05, 100.95, 101],
      [101, 101.05, 100.95, 101]
    ]
  };
  // E09 buys at session 4 minute 4 (101); session 5 gaps to 95 through the 5% hard stop (95.95): a loss
  const specs = [
    flat(100),
    flat(100),
    flat(100),
    flat(100),
    trigger,
    opening(95, 95),
    rebound(),
    rebound(),
    rebound(),
    flat(95),
    rebound(),
    flat(95)
  ];
  const e09 = (protect?: ProtectSpec): Policy => ({
    id: 'E09',
    entry: 'E09',
    entryParams: { Y: 0.005 },
    exit: { own: false, hard: 0.05 },
    reentry: 'R3F',
    sizing: { kind: 'Z0' },
    ...(protect ? { protect } : {})
  });

  test('E09: a rebound during the cooldown does not buy at the release; a fresh rebound after it does', () => {
    const off = runSpecs(specs, e09()).result;
    const on = runSpecs(specs, e09({ B: { C: 3 } })).result;

    assert.equal(off.trades[0]!.exitIndex, 5);
    assert.equal(off.trades[0]!.exitReason, 'stop gap');
    assert.equal(off.trades[1]!.entryIndex, 6); // the session-6 rebound fires without B
    assert.equal(on.trades[1]!.entryIndex, 10); // sessions 5–8 frozen, session 9 flat (no fresh rebound), 10 rebounds
    assert.equal(on.trades[1]!.rule, 'minute');
  });

  test('a consumed record does not restrict a new policy after a boundary (S1)', () => {
    // old: C-AL, 5% hard stop, R0 → loss at index 6 (95), re-entry at index 7 (consumes the record); boundary at 8
    const s2 = [
      ...pre(),
      flat(100),
      opening(95, 95),
      flat(96),
      flat(96),
      ...Array.from({ length: 14 }, () => flat(96))
    ];
    const ds = datasetOf(s2);
    const old = policy({ own: false, hard: 0.05 }, undefined, 'R0', 'old');
    const next = policy({ own: false, hard: 0.05 }, { B: { C: 10 } }, 'R0', 'new');
    const result = new Engine(ds).run(
      [
        { index: 3, policy: old },
        { index: 8, policy: next }
      ],
      { ...defaultOptions(3, ds.sessionCount - 1), recordDaily: true }
    );

    assert.equal(result.trades[1]!.entryIndex, 7);
    assert.equal(result.trades[1]!.exitReason, 'transition'); // sold at index 9's open
    assert.equal(result.trades[2]!.entryIndex, 10); // the new policy decides at 9's close; nothing blocks it
  });

  test('inert-but-present rules are bit-identical to the rule-less policy', () => {
    const ds = syntheticMarket(700, 33);
    const engine = new Engine(ds);
    let inert = 0;

    for (const cell of cells.filter((c) => c.mask !== '000' && c.index % 37 === 0)) {
      const values = Object.fromEntries(dimsOf(cell).map((d) => [d.name, d.hi]));
      const zero = cellOf(cell.entry, cell.exit, cell.contract, '000');
      const o = { ...defaultOptions(250, ds.sessionCount - 1), recordDaily: true };
      const a = engine.run(policyFromKey(keyOf(cell, values)), o);

      if (a.aDue === 0 && a.bBlocks + a.bcBoth === 0 && a.cBlocks === 0) {
        const b = engine.run(policyFromKey(keyOf(zero, values)), o);

        inert++;
        assert.equal(a.pathHash, b.pathHash);
        assert.equal(a.endLiquidation, b.endLiquidation);
        assert.deepEqual(
          a.daily!.map((d) => d.mark),
          b.daily!.map((d) => d.mark)
        );
      }
    }

    assert.ok(inert > 3);
  });
});

describe('re-review 3 cases', () => {
  const rally = (from: number, to: number): SessionSpec => {
    const bars: Bar[] = [];

    for (let k = 0; k < 8; k++) {
      const o = from + ((to - from) * k) / 8;
      const c = from + ((to - from) * (k + 1)) / 8;

      bars.push([o, Math.max(o, c) + 0.02, Math.min(o, c) - 0.02, c]);
    }

    return { bars };
  };
  // RF: only the minute rule can re-enter while the campaign lives (no close-decided re-entry)
  const e10 = (protect?: ProtectSpec, reentry: Policy['reentry'] = 'RF'): Policy => ({
    id: 'E10',
    entry: 'E10',
    entryParams: { Yb: 0 },
    exit: { own: false, hard: 0.05 },
    reentry,
    sizing: { kind: 'Z0' },
    ...(protect ? { protect } : {})
  });
  // E10 buys the breakout over session 3's high in session 4; session 5 gaps through the 5% stop (a loss); sessions
  // 6–8 rally to 103 (above the trade's highest close); session 9 is flat at 103; session 10 makes a new high (104)
  const e10Specs = [
    flat(100),
    flat(100),
    flat(100),
    flat(100),
    rally(100, 101),
    opening(95, 96),
    rally(96, 103),
    flat(103),
    flat(103),
    flat(103),
    rally(103, 104),
    flat(104)
  ];

  test('E10: highs made during the cooldown keep raising the reference; no buy at the release', () => {
    const off = runSpecs(e10Specs, e10()).result;
    const on = runSpecs(e10Specs, e10({ B: { C: 3 } })).result;

    assert.equal(off.trades[0]!.entryIndex, 4);
    assert.equal(off.trades[0]!.exitIndex, 5);
    assert.equal(off.trades[1]!.entryIndex, 6); // the rally over the trade's highest close fires without B
    assert.equal(on.trades[1]!.entryIndex, 10); // sessions 6–8 cooling (reference → 103.05), 9 flat, 10 breaks out
    assert.equal(on.trades[1]!.rule, 'minute');

    // under R3F the state-like close condition (C > the stopped trade's highest close, 101) persists and decides at
    // the first permitted close (8 = exit + C): a declared release entry, not the minute rule
    const r3f = runSpecs(e10Specs, e10({ B: { C: 3 } }, 'R3F')).result;

    assert.equal(r3f.trades[1]!.entryIndex, 9);
    assert.equal(r3f.trades[1]!.rule, 'R3F');
    assert.equal(r3f.trades[1]!.releaseEntry, true);
  });

  test('E10 adopted after a boundary exit (reference seeded at −∞): no unconditional buy at the release', () => {
    const specs = [...pre(), ...Array.from({ length: 9 }, () => flat(99)), rally(99, 100), flat(100)];
    const ds = datasetOf(specs);
    const old = policy({ own: false, hard: 0.5, maxHold: 4 }, undefined, 'R0', 'old');
    const result = new Engine(ds).run(
      [
        { index: 3, policy: old },
        { index: 7, policy: { ...e10({ B: { C: 3 } }), id: 'new' } }
      ],
      { ...defaultOptions(3, ds.sessionCount - 1), recordDaily: true }
    );

    assert.equal(result.trades[0]!.exitIndex, 8); // the old pick's losing `max hold` exit at b+1
    assert.equal(result.trades[1]!.entryIndex, 14); // flat 99 through the release (12): no fire; 14 breaks out
    assert.equal(result.trades[1]!.rule, 'minute');
  });

  test('C = 0 on an intraday family is identical to no B', () => {
    const specs = [
      flat(100),
      flat(100),
      flat(100),
      flat(100),
      rally(100, 101),
      opening(95, 96),
      rally(96, 99),
      flat(99)
    ];
    const e09 = (protect?: ProtectSpec): Policy => ({
      id: 'E09',
      entry: 'E09',
      entryParams: { Y: 0.005 },
      exit: { own: false, hard: 0.05 },
      reentry: 'R3F',
      sizing: { kind: 'Z0' },
      ...(protect ? { protect } : {})
    });
    const off = runSpecs(specs, e09()).result;
    const zero = runSpecs(specs, e09({ B: { C: 0 } })).result;

    assert.ok(off.trades.length >= 2);
    assert.equal(zero.pathHash, off.pathHash);
    assert.equal(zero.endLiquidation, off.endLiquidation);
  });

  test('S1: the old pick’s pending own-rule losing exit at b+1 feeds the new pick’s cooldown; the entry keeps its adoption label', () => {
    // old: C-AL with a 4-session maximum hold, bought at 100 (index 4); the hold is decided at index 7's close = b
    const specs = [...pre(), ...Array.from({ length: 16 }, () => flat(99))];
    const ds = datasetOf(specs);
    const old = policy({ own: false, hard: 0.5, maxHold: 4 }, undefined, 'R0', 'old');
    const next = policy({ own: false, hard: 0.5 }, { B: { C: 4 } }, 'R0', 'new');
    const result = new Engine(ds).run(
      [
        { index: 3, policy: old },
        { index: 7, policy: next }
      ],
      { ...defaultOptions(3, ds.sessionCount - 1), recordDaily: true }
    );

    assert.equal(result.trades[0]!.exitIndex, 8);
    assert.equal(result.trades[0]!.exitReason, 'max hold'); // the old reason, not `transition`: an own-rule exit
    assert.ok(result.trades[0]!.net < 0);
    assert.equal(result.trades[1]!.entryIndex, 13); // closes 8–11 discarded (8 < 8 + 4), close 12 decides
    assert.equal(result.trades[1]!.rule, 'adoption');
    assert.equal(result.trades[1]!.releaseEntry, true);
  });

  test('rule A on an early-close session sells at the second minute; under stop slippage the sale pays it', () => {
    const dates = [
      '2016-01-04',
      '2016-01-05',
      '2016-01-06',
      '2016-01-07',
      '2016-01-08',
      '2016-01-11',
      '2016-01-12',
      '2016-01-13',
      '2016-01-14',
      '2016-01-15',
      '2016-01-18',
      '2016-01-19'
    ];
    const specs = dates.map((_, i) => (i < 5 ? flat(100) : i === 10 ? flat(99, 3) : flat(99)));
    const ds = datasetWithDates(dates, specs);
    const plain = new Engine(ds).run(policy(wide, { A: { N: 8 } }), defaultOptions(3, ds.sessionCount - 1));
    const slipped = new Engine(ds).run(policy(wide, { A: { N: 8 } }), {
      ...defaultOptions(3, ds.sessionCount - 1),
      stopSlippageBps: 25
    });

    assert.equal(ds.sBarCount[10], 3);
    assert.equal(plain.trades[0]!.exitIndex, 10);
    assert.equal(plain.trades[0]!.exitBar, 1);
    assert.ok(Math.abs(plain.trades[0]!.exitPrice - 99 * (1 - c)) < 1e-9);
    assert.ok(Math.abs(slipped.trades[0]!.exitPrice - 99 * (1 - 0.0025) * (1 - c)) < 1e-9);
  });

  test('X and Y are quantised to 0.1 percentage point', () => {
    const cell = cellOf('E06', 'XF', 'rep', '001');
    const dims = dimsOf(cell);

    for (const name of ['c.X', 'c.Y']) {
      const dim = dims.find((d) => d.name === name)!;

      assert.equal(dim.q, 0.001);

      for (const u of [0, 0.123456, 0.5, 0.987654]) {
        const value = fromUnit(dim, u);

        assert.equal(value, Number(value.toFixed(3)));
        assert.ok(value >= dim.lo && value <= dim.hi);
      }
    }
  });
});

describe('rule C — post-material-loss recovery level', () => {
  // entry 100 at index 4; hard stop gap at 95 exactly on index 6 → gross −5%; then a recovery path
  const recovery = (after: SessionSpec[]) => [...pre(), flat(100), opening(95, 95), ...after];

  test('X inclusive at 5%; X = 5.1% does not arm', () => {
    const after = [flat(95.5), flat(96), flat(96), flat(96)];
    const armed = runSpecs(
      recovery(after),
      policy({ own: false, hard: 0.05 }, { C: { X: 0.05, Y: 0.02 } }, 'R0')
    ).result;
    const unarmed = runSpecs(
      recovery(after),
      policy({ own: false, hard: 0.05 }, { C: { X: 0.051, Y: 0.02 } }, 'R0')
    ).result;

    assert.equal(armed.trades[0]!.exitRaw, 95);
    assert.equal(armed.trades.length, 1, 'no purchase below 96.9');
    assert.ok(armed.cBlocks > 0);
    assert.equal(unarmed.trades.length, 2);
  });

  test('decision close 96.89 refused, 96.9 exactly allowed (level = 95 × 1.02, tolerance 1e-12)', () => {
    const refused = runSpecs(
      recovery([flat(96.89), flat(96.89), flat(96.89)]),
      policy({ own: false, hard: 0.05 }, { C: { X: 0.05, Y: 0.02 } }, 'R0')
    ).result;
    const allowed = runSpecs(
      recovery([flat(96.89), flat(95 * 1.02), flat(97)]),
      policy({ own: false, hard: 0.05 }, { C: { X: 0.05, Y: 0.02 } }, 'R0')
    ).result;

    assert.equal(refused.trades.length, 1);
    assert.equal(allowed.trades.length, 2);
    assert.equal(allowed.trades[1]!.entryIndex, 9); // decided at index 8's close, filled at index 9's open
    assert.ok(Math.abs(allowed.trades[1]!.cLevel - 96.9) < 1e-9);
    assert.equal(allowed.trades[1]!.cFillBelow, false);
  });

  test('a fill that gaps below the level is recorded, not undone', () => {
    const { result } = runSpecs(
      recovery([flat(96), flat(97), opening(96, 96), flat(96)]),
      policy({ own: false, hard: 0.05 }, { C: { X: 0.05, Y: 0.02 } }, 'R0')
    );
    const t = result.trades[1]!;

    assert.equal(t.entryIndex, 9);
    assert.equal(t.entryRaw, 96);
    assert.equal(t.cFillBelow, true);
    assert.equal(result.cFillsBelow, 1);
  });

  test('an interest-only loss never arms C (gross price move 0)', () => {
    // flat at 100; a 20-session maximum hold sells at 100: net < 0 (interest and costs), gross 0
    const specs = [...pre(), ...Array.from({ length: 30 }, () => flat(100))];
    const { result } = runSpecs(specs, policy({ own: false, maxHold: 20 }, { C: { X: 0.005, Y: 0.05 } }, 'R0'));
    const first = result.trades[0]!;

    assert.equal(first.exitReason, 'max hold');
    assert.ok(first.net < 0);
    assert.equal(first.exitRaw, first.entryRaw);
    assert.equal(result.cBlocks, 0);
    assert.equal(result.trades[1]!.entryIndex, first.exitIndex + 1);
  });

  test('the anchor is consumed by the next purchase and refreshed by the next qualifying loss', () => {
    const specs = recovery([flat(97), flat(98), flat(98), opening(93, 93), flat(93), flat(93), flat(96), flat(99)]);
    const { result } = runSpecs(specs, policy({ own: false, hard: 0.05 }, { C: { X: 0.05, Y: 0.02 } }, 'R0'));
    const [first, second, third] = result.trades;

    assert.equal(first!.exitRaw, 95);
    assert.equal(second!.entryIndex, 8); // 97 ≥ 96.9 at index 7's close
    assert.equal(second!.exitReason, 'stop gap'); // 93 ≤ 98 × 0.95 = 93.1; gross 93 / 98 − 1 = −5.1% arms C again
    // the refreshed anchor is 93: the next purchase needs a close ≥ 94.86; 93 refused, 96 allowed
    assert.equal(third!.entryIndex, 14);
    assert.ok(Math.abs(third!.cLevel - 93 * 1.02) < 1e-9);
  });

  test('C-cross needs a close below the level after the exit', () => {
    // exit at the 95 gap open, the exit session closes at 97 (above 96.9): plain C buys at the next open, cross waits
    const specs = [...pre(), flat(100), opening(95, 97), flat(97), flat(96), flat(97.5), flat(97.5), flat(97.5)];
    const plain = runSpecs(specs, policy({ own: false, hard: 0.05 }, { C: { X: 0.05, Y: 0.02 } }, 'R0')).result;
    const cross = runSpecs(
      specs,
      policy({ own: false, hard: 0.05 }, { C: { X: 0.05, Y: 0.02, cross: true } }, 'R0')
    ).result;

    assert.equal(plain.trades[1]!.entryIndex, 7); // close 6 = 97 ≥ 96.9
    assert.equal(cross.trades[1]!.entryIndex, 10); // first close below: index 8 (96); first qualifying close after: 9
  });

  test('B and C together: a decision failing both is discarded once and counted as both', () => {
    const specs = recovery([flat(96), flat(96), flat(96), flat(97), flat(97), flat(97), flat(97)]);
    const { result } = runSpecs(
      specs,
      policy({ own: false, hard: 0.05 }, { B: { C: 2 }, C: { X: 0.05, Y: 0.02 } }, 'R0')
    );

    assert.equal(result.bcBoth, 2); // closes 6 and 7: both in the cooldown and below the level
    assert.equal(result.trades[1]!.entryIndex, 11); // the first close ≥ 96.9 after the cooldown is index 10
  });
});

describe('the loss record across a boundary', () => {
  test('persist: the new policy honours the old policy’s losing exit; reset: it does not', () => {
    const specs = [...pre(), flat(100), opening(95, 95), ...Array.from({ length: 12 }, () => flat(96))];
    const ds = datasetOf(specs);
    const old = policy({ own: false, hard: 0.05 }, undefined, 'R3F', 'old');
    const next = policy({ own: false, hard: 0.05 }, { B: { C: 6 } }, 'R0', 'new');
    const schedule: ScheduleItem[] = [
      { index: 3, policy: old },
      { index: 7, policy: next }
    ];
    const o = { ...defaultOptions(3, ds.sessionCount - 1), recordDaily: true };
    const persist = new Engine(ds).run(schedule, o);
    const reset = new Engine(ds).run(schedule, { ...o, restrictionCarry: 'reset' });

    assert.equal(persist.trades[0]!.exitIndex, 6);
    assert.equal(persist.trades[1]!.entryIndex, 13); // decisions allowed from close 12 = 6 + 6
    assert.equal(reset.trades[1]!.entryIndex, 8); // adopted at the boundary close 7
  });
});

describe('rules off = Stage 1b bit for bit', () => {
  test('random policies, schedules, financing modes and stresses on synthetic markets', () => {
    const datasets = [syntheticMarket(700, 3), datasetOf(randomWalk(9, 600))];
    let runs = 0;

    for (const ds of datasets) {
      const a = new Stage1bEngine(ds);
      const b = new Engine(ds);
      const e = 250;
      const end = ds.sessionCount - 1;

      for (const cell of cells.filter((x) => x.mask === '000' && (x.index / 8) % 7 === 0)) {
        const dims = dimsOf(cell);
        const values = Object.fromEntries(dims.map((d) => [d.name, d.default]));
        const p = policyFromKey(keyOf(cell, values));

        for (const overrides of [
          {},
          { financing: 'slot' as const },
          { delayMinutes: 1 },
          { stopSlippageBps: 25, costBps: 10 }
        ]) {
          const o = { ...defaultOptions(e, end), recordDaily: true, ...overrides };
          const x = a.run(p, o);
          const y = b.run(p, o);

          runs++;
          assert.equal(y.pathHash, x.pathHash, `${p.id} path`);
          assert.equal(y.endLiquidation, x.endLiquidation, `${p.id} end`);
          assert.equal(y.minuteDd.maximum, x.minuteDd.maximum, `${p.id} dd`);
          assert.deepEqual(
            y.daily!.map((d) => d.mark),
            x.daily!.map((d) => d.mark)
          );
        }
      }

      // a two-boundary schedule under S1, S2 and S3
      const p1 = policyFromKey(
        keyOf(
          cellOf('E06', 'XV', 'rep', '000'),
          Object.fromEntries(dimsOf(cellOf('E06', 'XV', 'rep', '000')).map((d) => [d.name, d.default]))
        )
      );
      const p2 = policyFromKey(
        keyOf(
          cellOf('E05', 'XT', 'or', '000'),
          Object.fromEntries(dimsOf(cellOf('E05', 'XT', 'or', '000')).map((d) => [d.name, d.default]))
        )
      );
      const schedule: ScheduleItem[] = [
        { index: e, policy: p1 },
        { index: e + 150, policy: p2 },
        { index: e + 300, policy: p1 }
      ];

      for (const transition of ['S1', 'S2', 'S3'] as const) {
        const o = { ...defaultOptions(e, end), recordDaily: true, transition, windows: [e, e + 150, e + 300] };
        const x = a.run(schedule, o);
        const y = b.run(schedule, o);

        runs++;
        assert.equal(y.pathHash, x.pathHash);
        assert.equal(y.endLiquidation, x.endLiquidation);
        assert.deepEqual(
          y.windows.map((w) => w.increment),
          x.windows.map((w) => w.increment)
        );
      }
    }

    assert.ok(runs > 20);
  });

  test('every mask runs deterministically and keeps the identities', () => {
    const ds = syntheticMarket(600, 21);
    const engine = new Engine(ds);

    for (const mask of masks) {
      const cell = cellOf('E06', 'XF', 'or', mask);
      const values = Object.fromEntries(dimsOf(cell).map((d) => [d.name, d.default]));
      const p = policyFromKey(keyOf(cell, values));
      const o = { ...defaultOptions(250, ds.sessionCount - 1), recordDaily: true };
      const x = engine.run(p, o);
      const y = new Engine(ds).run(p, o);

      assert.equal(x.pathHash, y.pathHash);
      assert.equal(x.endLiquidation, y.endLiquidation);
      assertIdentities(x);
    }
  });
});

describe('XN, the matrix and the door', () => {
  test('XN is the D1 profit-conditional trail plus a hard stop', () => {
    assert.deepEqual(exitSpecOf('XN', { t: 0.073, h: 0.4, own: 0 }), { own: false, hard: 0.4, d1net: { t: 0.073 } });
  });

  test('the matrix: 2,400 cells, dimension lists, budget arithmetic', () => {
    assert.equal(cells.length, 2400);
    assert.equal(new Set(cells.map((c) => c.key)).size, 2400);

    for (const cell of cells) {
      assert.equal(dimsOf(cell).length, cell.dimensions);
    }

    const first = cells.reduce((a, c) => a + c.firstPassPlanned, 0);

    assert.equal(first, search.caps.firstPass);
    assert.equal(
      search.caps.perHistory,
      first + search.caps.deepCellsMax * search.caps.deepPerCell + 7 * search.caps.fixedParentPerMask
    );
    assert.equal(search.caps.deepPerCell, search.deep.global + 4 * search.deep.localPerSeed + 8 * 33 + 4 * 32);
    assert.equal(matrix.histories.C.developmentEnd, '2021-12-31');
  });

  test('a later end is refused before any read; the bounded reader never parses a line past its bound', () => {
    assert.throws(() => assertEndAllowed('2024-01-02'), /refused/);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage1c-door-'));
    const file = path.join(dir, 'data.csv');
    const clean = ['"2016-01-04T14:30:00Z",1,1,1,1,1', '2016-01-04T14:31:00Z,1,1,1,1,1'];
    // a poisoned tail: at/after the bound, malformed values, a non-UTC time, out-of-order times, garbage
    const tail = [
      '"2016-01-06T00:00:00Z",this,row,is,not,parsed',
      '"2016-01-05T23:00:00Z",1,1,1,1,1',
      '2016-01-07T10:00:00+05:00,x',
      'garbage'
    ];

    fs.writeFileSync(file, `${[...clean, ...tail].join('\n')}\n`);

    const bounded = readBounded(file, -Infinity, '2016-01-06');

    assert.equal(bounded.rows, 2);
    assert.equal(bounded.ticks.length, 2);
    assert.equal(bounded.ticks[1]!.time, Date.parse('2016-01-04T14:31:00Z') / 1000);
    assert.equal(bounded.stop, 'first line with UTC date ≥ 2016-01-06');
    assert.equal(bounded.prefixBytes, clean[0]!.length + clean[1]!.length + 2);

    // a malformed line before the bound fails closed
    fs.writeFileSync(file, `${[clean[0], '"2016-01-04T14:32:00Z",1,1,x,1,1', ...tail].join('\n')}\n`);
    assert.throws(() => readBounded(file, -Infinity, '2016-01-06'), /not a number/);
    fs.writeFileSync(file, `${[clean[0], 'not-a-time,1,1,1,1,1', ...tail].join('\n')}\n`);
    assert.throws(() => readBounded(file, -Infinity, '2016-01-06'), /timestamp/);
  });
});

// A dataset with explicit New York dates (holidays as gaps), minute bars from 14:30 UTC.
const datasetWithDates = (dates: string[], specs: SessionSpec[]) => {
  const sessions: MarketSession[] = dates.map((date, i) => {
    const time = Date.parse(`${date}T00:00:00Z`) / 1000;
    const openTime = time + 14.5 * 3600;
    const bars: Tick[] = specs[i]!.bars.map(([open, high, low, close]: Bar, k) => ({
      time: openTime + k * 60,
      open,
      high,
      low,
      close,
      volume: 100,
      trades: 1
    }));
    const close = bars.at(-1)!.close;

    return {
      date,
      time,
      openTime,
      closeTime: openTime + bars.length * 60,
      isEarlyClose: false,
      bars,
      open: bars[0]!.open,
      high: Math.max(...bars.map((b) => b.high)),
      low: Math.min(...bars.map((b) => b.low)),
      close,
      volume: bars.length * 100,
      trades: NaN,
      closingPrint: close
    };
  });

  return fixtureDataset(sessions);
};

void day;
