// The engine's execution and accounting semantics on synthetic sessions (PROTOCOL.md §3), its causality, and its
// equality with the independent slow reference (reference.ts) across every family, exit, re-entry rule and sizing.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Engine, type StrategySpec } from '../engine.ts';
import { compareWithReference } from '../parity.ts';
import { type FamilyId, familyIds, signalsOf } from '../signals.ts';
import { type ExitKey, controlSpec, exitOf, panelSpec } from '../specs.ts';
import { type SessionSpec, datasetOf, flatSession, options, path, randomWalk } from './fixtures.ts';

const YEAR = 365 * 86400;
const al = (exit: ExitKey, reentry: StrategySpec['reentry'] = 'R3F'): StrategySpec => ({
  ...controlSpec('C-AL'),
  id: `AL/${exit}/${reentry}`,
  exit: exitOf(exit),
  reentry
});

describe('execution and accounting', () => {
  test('a close decision fills at the next opening trade with friction; interest on calendar days; liquidation at the end', () => {
    const specs: SessionSpec[] = [flatSession(100), path(100, 101), path(102, 104), path(104, 103)];
    const ds = datasetOf(specs);
    const engine = new Engine(ds);
    const result = engine.run(controlSpec('C-AL'), options(ds));
    const trade = result.trades[0]!;

    assert.equal(result.trades.length, 1);
    assert.equal(trade.entryIndex, 1);
    assert.equal(trade.entryBar, 0);
    assert.equal(trade.entryRaw, ds.sOpen[1]);
    assert.equal(trade.entryPrice, 100 * 1.0005);
    assert.equal(trade.shares, 100000 / (100 * 1.0005));

    const days = (ds.sTime[3]! - ds.sTime[1]!) / YEAR;
    const interest = 100000 * 0.11 * days;

    assert.ok(Math.abs(trade.interest - interest) < 1e-9);
    assert.ok(Math.abs(trade.net - (trade.shares * ds.sClose[3]! * 0.9995 - 100000 - interest)) < 1e-9);
    assert.equal(result.endLiquidation, trade.net);
    assert.equal(trade.exitReason, 'open');
  });

  test('a resting stop gapped through fills at the opening trade; a minute through it at its open; else at the stop', () => {
    // hard stop 8% below a fill at 100 → 92
    const gap = datasetOf([flatSession(100), flatSession(100), path(90, 91)]);
    const g = new Engine(gap).run(al('HS'), options(gap));

    assert.equal(g.trades[0]!.exitReason, 'stop gap');
    assert.equal(g.trades[0]!.exitRaw, 90);
    assert.equal(g.trades[0]!.exitBar, 0);

    const through: SessionSpec = {
      bars: [
        [100, 100.2, 99.8, 99],
        [91, 91.5, 90.5, 91] // opens below 92
      ]
    };
    const t = datasetOf([flatSession(100), flatSession(100), through]);
    const tr = new Engine(t).run(al('HS'), options(t));

    assert.equal(tr.trades[0]!.exitReason, 'stop');
    assert.equal(tr.trades[0]!.exitRaw, 91);
    assert.equal(tr.trades[0]!.exitBar, 1);

    const touch: SessionSpec = {
      bars: [
        [100, 100.2, 99.8, 99],
        [99, 99.5, 91.9, 95]
      ]
    };
    const u = datasetOf([flatSession(100), flatSession(100), touch]);
    const ur = new Engine(u).run(al('HS'), options(u));

    assert.equal(ur.trades[0]!.exitReason, 'stop');
    assert.ok(Math.abs(ur.trades[0]!.exitRaw - 92) < 1e-9);
    // a same-session round trip pays no interest
    const same = datasetOf([flatSession(100), touch]);
    const sr = new Engine(same).run(al('HS'), options(same));

    assert.equal(sr.trades[0]!.entryIndex, sr.trades[0]!.exitIndex);
    assert.equal(sr.trades[0]!.interest, 0);
  });

  test('the closing print never triggers a resting stop; the next session’s open does', () => {
    const lowPrint: SessionSpec = { bars: path(100, 99).bars, closingPrint: 91 };
    const held = datasetOf([flatSession(100), flatSession(100), lowPrint, path(93, 94)]);
    const kept = new Engine(held).run(al('HS'), options(held));

    assert.equal(kept.trades[0]!.exitReason, 'open'); // the print at 91 < 92 did not sell; the next open is above

    const ds = datasetOf([flatSession(100), flatSession(100), lowPrint, path(91, 94)]);
    const result = new Engine(ds).run(al('HS'), options(ds));

    assert.equal(result.trades[0]!.exitIndex, 3);
    assert.equal(result.trades[0]!.exitReason, 'stop gap');
  });

  test('a fill waits for the next existing minute (missing bars are never imputed)', () => {
    const missing: SessionSpec = {
      bars: [
        [101, 101.2, 100.8, 101],
        [101, 101.5, 100.9, 101.2]
      ],
      missing: [0]
    };
    const ds = datasetOf([flatSession(100), missing]);
    const result = new Engine(ds).run(controlSpec('C-AL'), options(ds, { delayMinutes: 1 }));

    // the open bar is minute 1 (minute 0 has no bar); a one-minute delay fills at minute 2's bar (index 1)
    assert.equal(result.trades[0]!.entryBar, 1);
    assert.equal(result.trades[0]!.entryRaw, 101);
  });

  test('re-entry after a protective exit: R0 immediate, R3 on reclaiming the stopped high, R5 never while alive', () => {
    const specs: SessionSpec[] = [
      flatSession(100),
      path(100, 110), // Hc 110
      path(110, 99), // trailing 10% of 110 = 99 → stop
      path(99, 105),
      path(105, 109),
      path(109, 112), // first close above 110
      path(112, 113),
      path(113, 114)
    ];
    const ds = datasetOf(specs);
    const engine = new Engine(ds);
    const r0 = engine.run(al('CX1', 'R0'), options(ds));
    const r3 = engine.run(al('CX1', 'R3'), options(ds));
    const r5 = engine.run(al('CX1', 'R5'), options(ds));

    assert.equal(r0.trades[0]!.exitIndex, 2);
    assert.equal(r0.trades[1]!.entryIndex, 3);
    assert.equal(r0.trades[1]!.kind, 'reentry');
    assert.equal(r3.trades[1]!.entryIndex, 6); // decided at the close of 5 (112 > 110)
    assert.equal(r3.trades[1]!.rule, 'R3');
    assert.equal(r5.trades.length, 1);
  });

  test('the intraday rule: decision at a completed minute, fill at the next minute’s open; a last-minute decision carries', () => {
    const tb = (Y: number): StrategySpec => ({ ...panelSpec('E09', 'CX1'), params: { Y } });
    // flat sessions, then a 3% rebound from the running low inside a session
    const rise: SessionSpec = {
      bars: [
        [100, 100.1, 99, 99.5],
        [99.5, 100, 99.4, 100],
        [100, 102.5, 99.9, 102.2], // close 102.2 >= 99 x 1.03 = 101.97
        [102.3, 102.6, 102.1, 102.4]
      ]
    };
    const ds = datasetOf([flatSession(100), rise, flatSession(102)]);
    const result = new Engine(ds).run(tb(0.03), options(ds));

    assert.equal(result.trades[0]!.entryIndex, 1);
    assert.equal(result.trades[0]!.entryBar, 3);
    assert.equal(result.trades[0]!.entryRaw, 102.3);

    const late: SessionSpec = {
      bars: [
        [100, 100.1, 99, 99.5],
        [99.5, 102.5, 99.4, 102.2] // the last minute confirms
      ],
      closingPrint: null
    };
    const ds2 = datasetOf([flatSession(100), late, path(103, 104)]);
    const r2 = new Engine(ds2).run(tb(0.03), options(ds2));

    assert.equal(r2.trades[0]!.entryIndex, 2);
    assert.equal(r2.trades[0]!.entryBar, 0);
  });

  test('no entry in a session that had an exit, and at most one entry per session', () => {
    const tb: StrategySpec = { ...panelSpec('E09', 'HS'), params: { Y: 0.01 } };
    const whipsaw: SessionSpec = {
      bars: [
        [100, 100, 99.6, 99.7],
        [99.7, 101, 99.6, 100.8], // +1% from 99.6 → decision, fill next minute
        [100.8, 100.9, 92, 93], // hard 8% below 100.8 = 92.736 → stop at the stop level
        [93, 95, 92.9, 94.9] // +1% rebound: no second entry this session
      ]
    };
    const ds = datasetOf([flatSession(100), whipsaw, flatSession(95)]);
    const result = new Engine(ds).run(tb, options(ds));

    assert.equal(result.trades.length >= 1, true);
    assert.equal(result.trades[0]!.exitIndex, 1);
    assert.ok(result.trades.slice(1).every((trade) => trade.entryIndex > 1));
  });

  test('progressive tranches (Z1) are separate lots with their own fills and interest clocks', () => {
    const specs: SessionSpec[] = [
      flatSession(100),
      path(100, 103.5),
      path(103.5, 104),
      path(104, 107),
      path(107, 108),
      path(108, 109)
    ];
    const ds = datasetOf(specs);
    const result = new Engine(ds).run({ ...al('CX1'), sizing: 'Z1' }, options(ds));

    assert.equal(result.trades.length, 3);
    assert.ok(result.trades.every((trade) => Math.abs(trade.principal - 100000 / 3) < 1e-9));
    assert.deepEqual(
      result.trades.map((trade) => trade.entryIndex),
      [1, 2, 4]
    );
    assert.ok(result.trades[1]!.interest < result.trades[0]!.interest);
  });

  test('a window increment is the liquidation mark at the end minus the one at the boundary', () => {
    const ds = datasetOf(randomWalk(7, 320));
    const engine = new Engine(ds);
    const spec = panelSpec('E02', 'TPL');
    const whole = engine.run(spec, options(ds, { firstDecisionIndex: 255, recordDaily: true }));
    const windowed = engine.run(spec, options(ds, { firstDecisionIndex: 255, boundaryIndex: 290 }));
    const atBoundary = whole.daily![290 - 255]!.liquidation;

    assert.ok(Math.abs(windowed.window!.increment - (whole.endLiquidation - atBoundary)) < 1e-6);
    assert.equal(windowed.window!.boundaryLiquidation, atBoundary);
  });
});

describe('the minute rules (E09/E10)', () => {
  test('E10 re-enters only above both the exited trade’s high reference and every minute high since the exit', () => {
    const th: StrategySpec = { ...panelSpec('E10', 'CX1'), params: { Yb: 0 } };
    const specs: SessionSpec[] = [
      flatSession(100),
      path(100, 112), // first session: E10 buys a minute above the seeded high (100.05), then Hc reaches 112
      path(112, 100), // the trailing stop at 112 x 0.90 = 100.8 is hit
      path(100, 108),
      path(108, 111.9), // still below the exited trade's high reference
      path(111.9, 113), // a minute closes above it: decision, fill at the next minute
      flatSession(113)
    ];
    const ds = datasetOf(specs);
    const result = new Engine(ds).run(th, options(ds));
    const reentry = result.trades[1]!;

    assert.equal(result.trades[0]!.exitReason, 'stop');
    assert.equal(reentry.entryIndex, 5);
    assert.ok(reentry.entryRaw > result.trades[0]!.highClose);
    assert.equal(reentry.kind, 'reentry');
  });

  test('changing minutes after a minute decision changes neither the decision nor its fill', () => {
    const tb: StrategySpec = { ...panelSpec('E09', 'CX1'), params: { Y: 0.03 } };
    const rise: SessionSpec = {
      bars: [
        [100, 100.1, 99, 99.5],
        [99.5, 102.5, 99.4, 102.2],
        [102.3, 102.6, 102.1, 102.4],
        [102.4, 102.5, 101, 101.2]
      ]
    };
    const altered: SessionSpec = { bars: [...rise.bars.slice(0, 3), [102.4, 110, 95, 96]] };
    const a = datasetOf([flatSession(100), rise, flatSession(102)]);
    const b = datasetOf([flatSession(100), altered, path(80, 70)]);
    const ta = new Engine(a).run(tb, options(a)).trades[0]!;
    const tbb = new Engine(b).run(tb, options(b)).trades[0]!;

    assert.deepEqual([ta.entryIndex, ta.entryBar, ta.entryRaw], [tbb.entryIndex, tbb.entryBar, tbb.entryRaw]);
  });
});

describe('causality', () => {
  test('signals at s are unchanged when later sessions change (every family and control)', () => {
    const specs = randomWalk(11, 330);
    const full = datasetOf(specs);
    const cut = 300;
    const changed = datasetOf([...specs.slice(0, cut), ...randomWalk(99, 30)]);
    const engineFull = new Engine(full);
    const engineChanged = new Engine(changed);
    const ids = [...familyIds, 'X-CS', 'C-SMA', 'C-DON', 'C-TSM'] as const;

    for (const id of ids) {
      const params = id.startsWith('E')
        ? panelSpec(id as FamilyId, 'TPL').params
        : id === 'X-CS'
          ? { N: 20, c_in: 0.6, c_out: 0.45 }
          : {};
      const a = signalsOf(engineFull.F, id, params);
      const b = signalsOf(engineChanged.F, id, params);
      const arrays = (sig: typeof a) =>
        sig.kind === 'level'
          ? [sig.state]
          : sig.kind === 'event'
            ? [sig.trigger, sig.out, sig.level].filter(Boolean)
            : sig.kind === 'intraday'
              ? [sig.out]
              : [];
      const aa = arrays(a);
      const bb = arrays(b);

      for (let j = 0; j < aa.length; j++) {
        for (let s = 0; s < cut; s++) {
          const x = aa[j]![s]!;
          const y = bb[j]![s]!;

          assert.ok(x === y || (Number.isNaN(x) && Number.isNaN(y)), `${id} array ${j} differs at ${s}`);
        }
      }
    }
  });

  test('a run ending at a cutoff equals the longer run’s prefix (decisions and marks)', () => {
    const specs = randomWalk(5, 340);
    const longer = datasetOf(specs);
    const shorter = datasetOf(specs.slice(0, 310));

    for (const family of familyIds) {
      const spec = panelSpec(family, 'TPL');
      const a = new Engine(longer).run(spec, options(longer, { firstDecisionIndex: 255, recordDaily: true }));
      const b = new Engine(shorter).run(spec, options(shorter, { firstDecisionIndex: 255, recordDaily: true }));
      const closedBefore = (trades: typeof a.trades) =>
        trades
          .filter((trade) => trade.exitIndex >= 0 && trade.exitIndex < 309)
          .map((t) => [t.entryIndex, t.entryBar, t.exitIndex, t.exitBar]);

      assert.deepEqual(closedBefore(a.trades), closedBefore(b.trades), family);

      for (let i = 0; i < 309 - 255; i++) {
        assert.equal(a.daily![i]!.mark, b.daily![i]!.mark, `${family} mark ${i}`);
      }
    }
  });
});

describe('adversarial paths and reference parity', () => {
  const adversarial: Record<string, SessionSpec[]> = {
    // a spike and reversal, a gap below every stop, a long range, a bull run after an early stop, a falling knife
    spikeReversal: [
      ...randomWalk(1, 280, { vol: 0.01 }),
      path(110, 125),
      path(125, 126),
      path(118, 104),
      ...randomWalk(2, 40)
    ],
    gapBelowStop: [...randomWalk(3, 280), path(100, 101), { bars: path(85, 84).bars }, ...randomWalk(4, 40)],
    prolongedRange: [...randomWalk(5, 260, { drift: 0, vol: 0.004 }), ...randomWalk(6, 120, { drift: 0, vol: 0.004 })],
    bullAfterStop: [
      ...randomWalk(7, 270),
      path(100, 96),
      path(96, 90),
      ...Array.from({ length: 60 }, (_, i) => path(90 + i, 91 + i))
    ],
    fallingKnife: [
      ...randomWalk(8, 270),
      ...Array.from({ length: 30 }, (_, i) => path(100 - i * 1.5, 98.5 - i * 1.5)),
      path(55, 58),
      path(58, 60),
      ...Array.from({ length: 20 }, (_, i) => path(60 - i, 59 - i))
    ]
  };

  const exits: ExitKey[] = [
    'OX',
    'CX1',
    'CX2',
    'TPL',
    'X2',
    'X3',
    'X4',
    'X5a',
    'X5b',
    'X6a',
    'X6b',
    'X8OR',
    'X8AND',
    'HS'
  ];
  const signals = [...familyIds, 'X-CS', 'C-SMA', 'C-DON', 'C-TSM', 'C-AL'] as const;

  test('fast engine = reference on adversarial paths (every family and control × every exit)', () => {
    let runs = 0;

    for (const [name, specs] of Object.entries(adversarial)) {
      const ds = datasetOf(specs);
      const engine = new Engine(ds);

      for (const id of signals) {
        for (const exit of exits) {
          const spec = id.startsWith('C-')
            ? { ...controlSpec(id as 'C-AL'), exit: exitOf(exit), id: `${id}/${exit}` }
            : panelSpec(id as FamilyId, exit);
          const outcome = compareWithReference(engine, ds, spec, options(ds, { firstDecisionIndex: 252 }));

          assert.deepEqual(outcome.differences, [], `${name} ${spec.id}`);
          runs++;
        }
      }
    }

    assert.ok(runs > 0);
  });

  test('fast engine = reference on random walks: re-entry rules, tranches, costs, slippage and delays', () => {
    const tradesOf: Record<string, number> = {};

    for (const seed of [21, 22, 23, 24]) {
      const ds = datasetOf(randomWalk(seed, 900, { vol: 0.015 }));
      const engine = new Engine(ds);

      for (const family of [...familyIds, 'X-CS'] as const) {
        tradesOf[family] =
          (tradesOf[family] ?? 0) +
          engine.run(panelSpec(family, 'TPL'), options(ds, { firstDecisionIndex: 252 })).trades.length;

        for (const reentry of ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R3F'] as const) {
          const spec = panelSpec(family, family === 'X-CS' ? 'CX1' : 'TPL', reentry);
          const outcome = compareWithReference(engine, ds, spec, options(ds, { firstDecisionIndex: 252 }));

          assert.deepEqual(outcome.differences, [], `${seed} ${spec.id}`);
        }

        const z1 = compareWithReference(
          engine,
          ds,
          panelSpec(family, 'CX1', 'R3F', 'Z1'),
          options(ds, { firstDecisionIndex: 252 })
        );

        assert.deepEqual(z1.differences, [], `${seed} ${family} Z1`);

        const stressed = compareWithReference(
          engine,
          ds,
          panelSpec(family, 'TPL'),
          options(ds, {
            firstDecisionIndex: 252,
            costBps: 10,
            stopSlippageBps: 25,
            entrySlippageBps: 10,
            delayMinutes: 1,
            rate: 0.14
          })
        );

        assert.deepEqual(stressed.differences, [], `${seed} ${family} stressed`);
      }
    }

    // the property is not vacuous: every family trades on these walks
    for (const [family, count] of Object.entries(tradesOf)) {
      assert.ok(count >= 8, `${family} made only ${count} trades on the parity walks`);
    }
  });

  test('a non-trading control, the exhaustion filter and searched vectors match too', () => {
    const ds = datasetOf(randomWalk(31, 400));
    const engine = new Engine(ds);
    const idle = engine.run(controlSpec('C-IDLE'), options(ds, { firstDecisionIndex: 252 }));

    assert.equal(idle.trades.length, 0);
    assert.equal(idle.endLiquidation, 0);
    assert.equal(idle.minuteDrawdown.maximum, 0);

    const filtered = compareWithReference(
      engine,
      ds,
      { ...panelSpec('E02', 'TPL'), exhaustion: 0.1 },
      options(ds, { firstDecisionIndex: 252 })
    );

    assert.deepEqual(filtered.differences, []);

    const vector = compareWithReference(
      engine,
      ds,
      { ...panelSpec('E04', 'TPL'), params: { kappa: 0.1, h_in: 2.5, h_out: 1.5 }, exit: exitOf('TPL', 0.05, 0.06) },
      options(ds, { firstDecisionIndex: 252 })
    );

    assert.deepEqual(vector.differences, []);
  });
});

describe('budget and the always-long reference', () => {
  test('the code-enforced caps equal the protocol and cover every family passing M1', async () => {
    const { search } = await import('../context.ts');
    const { plannedPerFamily } = await import('../search.ts');
    const worst = familyIds.reduce((sum, family) => sum + plannedPerFamily(family), 0);

    assert.equal(search.capPerHistory, 16000);
    assert.equal(search.capTotal, 80000);
    assert.equal(worst, 4 * 1328 + 6 * 1296 + 2 * 1264);
    assert.ok(worst + 70 <= search.capPerHistory);
    assert.ok(5 * worst <= search.capTotal);
  });

  test('C-ALR: monthly segments, friction on the traded shares only, interest on $100,000, liquidation at the end', () => {
    // three sessions in January 2016 then two in February (weekdays from 2016-01-04): re-size on the first February session
    const specs: SessionSpec[] = [];

    for (let i = 0; i < 25; i++) {
      specs.push(flatSession(100 + i, 4));
    }

    const ds = datasetOf(specs);
    const engine = new Engine(ds);
    const result = engine.run(controlSpec('C-ALR'), options(ds, { recordDaily: true }));
    const feb = ds.dates.findIndex((date) => date.startsWith('2016-02'));
    const p1 = ds.sOpen[1]!;
    const p2 = ds.sOpen[feb]!;
    const s1 = 100000 / p1;
    const s2 = 100000 / p2;
    const year = 365 * 86400;
    const seg1 = s1 * (p2 - p1) - s1 * p1 * 0.0005 - 100000 * 0.11 * ((ds.sTime[feb]! - ds.sTime[1]!) / year);
    const end = ds.sessionCount - 1;
    const close = ds.sClose[end]!;
    const seg2 =
      s2 * (close - p2) -
      Math.abs(s2 - s1) * p2 * 0.0005 -
      s2 * close * 0.0005 -
      100000 * 0.11 * ((ds.sTime[end]! - ds.sTime[feb]!) / year);

    assert.equal(result.trades.length, 2);
    assert.ok(Math.abs(result.trades[0]!.net - seg1) < 1e-9);
    assert.ok(Math.abs(result.endLiquidation - (seg1 + seg2)) < 1e-9);

    const parity = compareWithReference(engine, ds, controlSpec('C-ALR'), options(ds));

    assert.deepEqual(parity.differences, []);
  });

  test('C-ALR = its independent reference on random walks (incl. a delay and 10 bps)', () => {
    for (const seed of [41, 42]) {
      const ds = datasetOf(randomWalk(seed, 400));
      const engine = new Engine(ds);

      for (const extra of [{}, { delayMinutes: 1, costBps: 10 }]) {
        const outcome = compareWithReference(
          engine,
          ds,
          controlSpec('C-ALR'),
          options(ds, { firstDecisionIndex: 252, ...extra })
        );

        assert.deepEqual(outcome.differences, [], `${seed} ${JSON.stringify(extra)}`);
      }
    }
  });
});
