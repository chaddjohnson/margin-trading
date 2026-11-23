// RC 3's D1 book on synthetic minute paths (RULE_SPECIFICATION.md §1, §4). The dip-buy of RC 1's crash path fills at
// 90 (raw) on Fri 2021-03-05 (session 4); the grid's stage-1 distance is 5 % (t1 = 50, minimum activation 5.4 %). With
// A = 10 % the activation price is 90 × 1.1. Checked: arming at a close takes effect the next session only; the staged
// exit and its level; a placement exit at the next open; arming exactly at the threshold (≥) and not one ulp below;
// arming on the entry session acting from the next session; an armed level made ineligible by interest (no exit, the
// level still raised); a later gap through an armed level (not a placement); the next-open and slippage stresses; a
// stage that never arms reproduces RC 2 exactly (paths, controls, stresses); split (×8) invariance; determinism.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession } from '#types';
import type { Dataset } from '../../four-family/data.ts';
import { type D1Grid, type Friction, baseFriction } from '../../vg-d1-growth-joint/books.ts';
import { type Bar, datasetOf, sessionOf, weekdays } from '../../d1-risk-controls/tests/fixtures.ts';
import { crash, grid, pathOf, recovery, whipsaw } from '../../d1-risk-controls/tests/scenarios.ts';
import { runD1BookRc2 } from '../../d1-risk-controls-rc2/book.ts';
import type { D1RiskControls2 } from '../../d1-risk-controls-rc2/config.ts';
import type { StagedBookConfig } from '../../staged-stop/config.ts';
import { type RiskVBook3, runD1BookRc3 } from '../book.ts';

const opts = (ds: Dataset, friction?: Friction, detail = true) => ({
  armStart: 0,
  accountingStart: 0,
  endIndex: ds.sessionCount - 1,
  friction,
  detail
});
const flat3 = (p: number): Bar[] => [
  { o: p, c: p },
  { o: p, c: p },
  { o: p, c: p }
];
const run = (
  ss: MarketSession[],
  st: StagedBookConfig,
  c: D1RiskControls2 | null = null,
  g: D1Grid = grid(),
  fr?: Friction
) => {
  const ds = datasetOf(ss);

  return { ds, b: runD1BookRc3(ds, 'VGT', g, c, st, opts(ds, fr)), rc2: runD1BookRc2(ds, 'VGT', g, c, opts(ds, fr)) };
};
const sessions = (spec: Bar[][]): MarketSession[] => {
  const dates = weekdays(spec.length);

  return spec.map((x, i) => sessionOf(dates[i]!, x));
};
const behaviour = (b: { key: string; rc?: unknown; staged?: unknown; stagedRows?: unknown }) => {
  const { rc: _rc, key: _key, staged: _s, stagedRows: _r, ...rest } = b as Record<string, unknown>;

  return rest;
};
const S10: StagedBookConfig = { activationTenths: 100, stage2Tenths: 20 }; // A 10 %, τ₂ 2 %
const ACT = 90 * (1 + 100 / 1000);
const entry: Bar[] = [
  { o: 95, c: 95 },
  { o: 95, c: 89.5 },
  { o: 89.5, c: 89 },
  { o: 89, c: 90 },
  { o: 90, c: 90.5 }
]; // fill at 90 (minute 4)
const pre = [flat3(100), flat3(100), flat3(100), flat3(100)];
const last = (b: Pick<RiskVBook3, 'trades'>) => b.trades.at(-1)!;

describe('the stage on a winner (fill 90, A 10 %, τ₂ 2 %, τ₁ 5 %)', () => {
  // day 5 up to 97 (not armed); day 6 high 101 ≥ 99 (armed at the close, level 98.98); day 7 dips to 98.5
  const path = (day6: Bar[], day7: Bar[]) =>
    sessions([
      ...pre,
      entry,
      [
        { o: 90.5, c: 92 },
        { o: 92, c: 95 },
        { o: 95, c: 97 }
      ],
      day6,
      day7,
      [{ o: 103, c: 110 }],
      [
        { o: 110, c: 104 },
        { o: 104, c: 103 }
      ],
      flat3(103),
      flat3(103)
    ]);

  it('arms at the close of the session that reaches the activation price; exits at the stage-2 level the next session', () => {
    const { ds, b, rc2 } = run(
      path(
        [
          { o: 97, c: 98 },
          { o: 98, c: 100 },
          { o: 100, c: 101 }
        ],
        [
          { o: 100.5, c: 100 },
          { o: 100, c: 98.5 },
          { o: 98.5, c: 99 }
        ]
      ),
      S10
    );
    const L2 = 101 * (1 - 20 / 1000);
    const t = last(b);

    assert.equal(t.fills[0]!.reason, 'trailing stop');
    assert.equal(ds.dates[t.fills[0]!.s], ds.dates[7]);
    assert.equal(t.fills[0]!.raw, L2);
    assert.equal(t.fills[0]!.k, 1);
    assert.deepEqual(b.staged, { arms: 1, stagedExits: 1, placementExits: 0 });
    assert.equal(b.stagedRows![0]!.armedS, 6);
    assert.equal(b.stagedRows![0]!.levelAtArming, L2);
    assert.equal(b.stagedRows![0]!.events[0]!.stage1Level, 101 * (1 - 0.05));
    // stage 1 alone (RC 2): 95.95 is not reached on day 7; the position runs to 110 and exits later at 104.5
    assert.notEqual(last(rc2).fills[0]!.s, 7);
    assert.equal(last(rc2).fills[0]!.raw, 110 * 0.95);
  });

  it('a placement exit: the arming session closes below the new level; the next session gaps through it at the open', () => {
    const { b } = run(
      path(
        [
          { o: 97, c: 98 },
          { o: 98, c: 101 },
          { o: 101, c: 97 }
        ],
        [
          { o: 97.5, c: 98 },
          { o: 98, c: 99 }
        ]
      ),
      S10
    );
    const t = last(b);

    assert.equal(t.fills[0]!.reason, 'trailing stop gap');
    assert.equal(t.fills[0]!.raw, 97.5);
    assert.equal(t.fills[0]!.s, 7);
    assert.deepEqual(b.staged, { arms: 1, stagedExits: 1, placementExits: 1 });
    assert.equal(b.stagedRows![0]!.placed, true);
  });

  it('a later gap through an armed level is a staged exit, not a placement exit', () => {
    const { b } = run(
      path(
        [
          { o: 97, c: 98 },
          { o: 98, c: 101 }
        ],
        [
          { o: 100.5, c: 100 },
          { o: 100, c: 99.5 }
        ]
      ),
      {
        activationTenths: 100,
        stage2Tenths: 20
      }
    );

    // day 8 opens at 103 ≥ 98.98 (no exit); arming at 101 → 98.98; then day 8's high 110 → 107.8; day 9 opens 110, falls to 103
    assert.equal(last(b).fills[0]!.reason, 'trailing stop');
    assert.equal(last(b).fills[0]!.raw, 110 * 0.98);
    assert.deepEqual(b.staged, { arms: 1, stagedExits: 1, placementExits: 0 });
  });

  it('threshold: a session high exactly at e × (1 + A) arms; one ulp below does not', () => {
    const below = new Float64Array([ACT]);
    const view = new DataView(below.buffer);

    view.setBigUint64(0, view.getBigUint64(0, true) - 1n, true);
    assert.ok(below[0]! < ACT);

    // after the threshold session the path never exceeds 97.5
    const tp = (h: number) =>
      sessions([
        ...pre,
        entry,
        [
          { o: 90.5, c: 92 },
          { o: 92, c: 95 },
          { o: 95, c: 97 }
        ],
        [{ o: 97, c: 97.5, h }],
        [
          { o: 97.5, c: 97 },
          { o: 97, c: 96.9 }
        ],
        flat3(97),
        flat3(96),
        flat3(97)
      ]);
    const at = run(tp(ACT), S10);
    const under = run(tp(below[0]!), S10);

    assert.equal(at.b.staged.arms, 1);
    assert.equal(at.b.stagedRows![0]!.highAtArming, ACT);
    assert.equal(under.b.staged.arms, 0);
    // armed at 99.0…: level 97.02 → day 7 trades through it; unarmed: stage 1's 94.05 holds
    assert.equal(last(at.b).fills[0]!.s, 7);
    assert.notEqual(last(under.b).fills[0]?.s, 7);
    assert.deepEqual(behaviour(under.b), behaviour(under.rc2));
  });

  it('the next-open stress fills the staged trigger at the next minute; stop slippage applies to the staged fill', () => {
    const p = path(
      [
        { o: 97, c: 98 },
        { o: 98, c: 100 },
        { o: 100, c: 101 }
      ],
      [
        { o: 100.5, c: 100 },
        { o: 100, c: 98.5 },
        { o: 98.6, c: 99 }
      ]
    );
    const nx = run(p, S10, null, grid(), { ...baseFriction, stopFill: 'next-open' });
    const sl = run(p, S10, null, grid(), { ...baseFriction, stopSlippageBps: 25 });
    const base = run(p, S10);

    assert.equal(last(nx.b).fills[0]!.raw, 98.6);
    assert.equal(last(nx.b).fills[0]!.k, 2);
    assert.equal(last(sl.b).fills[0]!.raw, last(base.b).fills[0]!.raw);
    assert.equal(last(sl.b).fills[0]!.price, last(base.b).fills[0]!.price * (1 - 25 / 1e4));
  });
});

describe('the entry session and eligibility', () => {
  it('arming on the entry session (fill-minute onwards) acts from the next session, never on the entry session', () => {
    // after the fill at 90 the entry session trades up to 99.5 (high) and closes at 95: armed at onEntry, level
    // 99.5 × 0.98 = 97.51 > 95 (placed); nothing exits on the entry session; the next session opens 96 → gap exit
    const day4: Bar[] = [...entry.slice(0, 4), { o: 90, c: 99, h: 99.5 }, { o: 99, c: 95 }];
    const { b } = run(sessions([...pre, day4, [{ o: 96, c: 96 }], flat3(96)]), S10);
    const t = last(b);

    assert.equal(t.eS, 4);
    assert.equal(t.fills[0]!.s, 5);
    assert.equal(t.fills[0]!.reason, 'trailing stop gap');
    assert.equal(t.fills[0]!.raw, 96);
    assert.equal(b.stagedRows![0]!.armedS, 4);
    assert.equal(b.stagedRows![0]!.levelAtArming, 99.5 * 0.98);
    assert.deepEqual(b.staged, { arms: 1, stagedExits: 1, placementExits: 1 });
  });

  it('an armed level made ineligible by interest does not exit (the level is still raised); the hold acts on the loss', () => {
    // A = 5.4 % (the minimum for τ₁ 5 %), τ₂ 1.5 %: armed at H 95 → level 93.575; ≈ $3,920 locked at day 0, consumed by
    // ≈ $30.14 / day of interest after ≈ 130 days; at ≈ 160 calendar days a dip to 93 does not exit (ineligible)
    const st: StagedBookConfig = { activationTenths: 54, stage2Tenths: 15 };
    const flatDays = Array.from({ length: 112 }, () => [{ o: 94, c: 94 }]);
    const { ds, b } = run(
      sessions([
        ...pre,
        entry,
        [
          { o: 90.5, c: 95 },
          { o: 95, c: 94 }
        ],
        ...flatDays,
        [
          { o: 94, c: 93 },
          { o: 93, c: 94 }
        ],
        ...Array.from({ length: 5 }, () => [{ o: 94, c: 94 }])
      ]),
      st,
      null,
      grid({ maximumHoldDays: 5 })
    );
    const t = last(b);
    const dipS = 4 + 1 + 112 + 1;

    assert.equal(b.staged.arms, 1);
    assert.equal(b.stagedRows![0]!.levelAtArming, 95 * (1 - 15 / 1000));
    assert.ok((ds.sTime[dipS]! - ds.sTime[4]!) / 86400 > 140);
    // no trailing exit at the dip; the position leaves by the maximum hold once it loses at the open
    assert.ok(!t.fills.length || t.fills[0]!.reason !== 'trailing stop', JSON.stringify(t.fills));
    assert.equal(b.staged.stagedExits, 0);
  });
});

describe('a stage that never arms is RC 2 exactly', () => {
  const controls: (D1RiskControls2 | null)[] = [
    null,
    { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } },
    { protectiveStop: { mode: 'on', stopDistanceTenths: 80, activation: 'entry-day' } },
    {
      protectiveStop: { mode: 'on', stopDistanceTenths: 60 },
      hold: { mode: 'adaptive', extendedHoldDays: 9, progressTenths: 30 }
    },
    {
      protectiveStop: { mode: 'on', stopDistanceTenths: 60 },
      hold: { mode: 'disabled' },
      declineGate: { mode: 'on', losses: 1, recoveryTenths: 500, maxBlockSessions: 5 }
    }
  ];
  const frictions: Friction[] = [
    baseFriction,
    { ...baseFriction, stopFill: 'next-open' },
    { ...baseFriction, stopSlippageBps: 25, costBps: 10 }
  ];

  for (const [name, days] of Object.entries({ crash, recovery, whipsaw }))
    it(`${name}: every control set and stress`, () => {
      const ds = datasetOf(pathOf(days));

      for (const c of controls)
        for (const fr of frictions) {
          const a = runD1BookRc3(ds, 'VGT', grid(), c, { activationTenths: 500, stage2Tenths: 20 }, opts(ds, fr));
          const r2 = runD1BookRc2(ds, 'VGT', grid(), c, opts(ds, fr, false));

          assert.equal(a.staged.arms, 0);
          assert.deepEqual(behaviour(a), behaviour(r2));
          assert.deepEqual(a.rc, r2.rc);
          assert.equal(a.key, `${r2.key}|st1:{"activationTenths":500,"stage2Tenths":20}`);
        }
    });

  it('random paths (seeded): RC 3 with an unreachable activation = RC 2', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

    for (let n = 0; n < 12; n++) {
      const days: number[][] = [];
      let p = 100;

      for (let d = 0; d < 60; d++) {
        const closes: number[] = [];

        for (let k = 0; k < 4; k++) {
          p = Math.min(140, Math.max(75, p * (1 + (rnd() - 0.5) * 0.04)));
          closes.push(Number(p.toFixed(2)));
        }
        days.push(closes);
      }

      const ds = datasetOf(pathOf(days));

      for (const c of controls.slice(0, 3)) {
        const a = runD1BookRc3(ds, 'VGT', grid(), c, { activationTenths: 500, stage2Tenths: 30 }, opts(ds));
        const r2 = runD1BookRc2(ds, 'VGT', grid(), c, opts(ds));

        assert.equal(a.staged.arms, 0);
        assert.deepEqual(behaviour(a), behaviour(r2));
      }
    }
  });
});

describe('invariance and determinism', () => {
  const p = (k: number) =>
    sessions(
      [
        ...pre,
        entry,
        [
          { o: 90.5, c: 92 },
          { o: 92, c: 95 },
          { o: 95, c: 97 }
        ],
        [
          { o: 97, c: 98 },
          { o: 98, c: 100 },
          { o: 100, c: 101 }
        ],
        [
          { o: 100.5, c: 100 },
          { o: 100, c: 98.5 },
          { o: 98.5, c: 99 }
        ],
        flat3(99),
        flat3(99)
      ].map((s) => s.map((b) => ({ o: b.o * k, c: b.c * k, ...(b.h ? { h: b.h * k } : {}) })))
    );

  it('a forward split (all prices × 8, exact in binary) changes no decision and no net', () => {
    const a = run(p(1), S10).b;
    const b = run(p(8), S10).b;

    assert.equal(a.trades.length, b.trades.length);
    a.trades.forEach((t, i) => {
      const u = b.trades[i]!;

      assert.equal(u.eS, t.eS);
      assert.equal(u.eRaw, t.eRaw * 8);
      assert.equal(u.fills[0]!.raw, t.fills[0]!.raw * 8);
      assert.equal(u.vNet, t.vNet);
    });
    assert.deepEqual(a.staged, b.staged);
  });

  it('two runs are identical', () => {
    assert.deepEqual(run(p(1), S10).b, run(p(1), S10).b);
  });
});
