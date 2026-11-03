// Stage 1b fixtures (PROTOCOL.md §12, F1–F22): synthetic sessions with closed-form expectations computed here (never
// from either engine) for the fill, gap, interest, trim, conversion and one-entry rules; invariants and identities on
// every fixture; prefix invariance and the poisoned-future guard on a synthetic market; the code-vs-matrix constants.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';
import { sobolPoints as stage1Sobol } from '../../study3-vgt-momentum/sobol.ts';
import { type SessionSpec, datasetOf, flatSession, path } from '../../study3-vgt-momentum/tests/fixtures.ts';
import { exitBoxes, fixedExits, optimisedExits, pairings, reentryRules, sizingVariants } from '../catalog.ts';
import { exitControls, panelEntries, rubric, search, study } from '../context.ts';
import { assertEndAllowed, loadVgt } from '../data.ts';
import { Engine, defaultOptions } from '../engine.ts';
import { poisonedFuture, prefixInvariance, truncatedRunPrefix } from '../guards.ts';
import { sobolPoints } from '../sobol.ts';
import type { ExitSpec, Policy, RunOptions, RunResult, SizingSpec } from '../types.ts';
import { syntheticMarket } from './synthetic.ts';

const c = 5 / 10000;
const r = 0.11;
const year = 365;

const always = (
  exit: ExitSpec,
  sizing: SizingSpec = { kind: 'Z0' },
  reentry: Policy['reentry'] = 'R3F',
  id = 'AL'
): Policy => ({
  id,
  entry: 'C-AL',
  entryParams: {},
  exit,
  reentry,
  sizing
});

const run = (
  specs: SessionSpec[],
  policy: Policy | Parameters<Engine['run']>[0],
  overrides: Partial<RunOptions> = {}
) => {
  const ds = datasetOf(specs);
  const engine = new Engine(ds);
  const options: RunOptions = { ...defaultOptions(0, ds.sessionCount - 1), recordDaily: true, ...overrides };

  return { ds, result: engine.run(policy, options) };
};

// Identities (i), (ii), (iii), (v), (vii) on any run.
const assertIdentities = (result: RunResult) => {
  const sum = result.trades.reduce((a, t) => a + t.net, 0);

  assert.ok(Math.abs(sum - result.carriedInterest - result.endLiquidation) < 1e-6, 'identity (i)');

  for (const t of result.trades) {
    assert.ok(Math.abs(t.proceeds - t.principal - t.interest - t.net) < 1e-6, `identity (ii) proceeds, trade ${t.id}`);
    assert.ok(
      Math.abs(t.priceGain - t.friction - t.interest - t.net) < 1e-6,
      `identity (ii) price gain, trade ${t.id}`
    );

    let loan = t.principal;

    for (const trim of t.trims) {
      assert.ok(Math.abs(trim.repaid - Math.min(loan, trim.proceeds)) < 1e-9, 'identity (iii)');
      loan -= trim.repaid;
    }
  }

  if (result.windows.length) {
    const total = result.windows.reduce((a, w) => a + w.increment, 0);

    assert.ok(Math.abs(total - result.endLiquidation) < 1e-6, 'identity (v)');
  }

  for (const ev of result.events ?? []) {
    if (ev.kind === 'entry' || ev.kind === 'trim' || ev.kind === 'conversion') {
      assert.ok(ev.S > 0, 'identity (vii)');
    }
  }
};

describe('fills, gaps and stops (F1–F3, F5, F14)', () => {
  test('F1: a gap-down open through the stop fills at the open, never at the level', () => {
    const { result } = run(
      [flatSession(100), path(100, 100), path(90, 91), flatSession(91)],
      always({ own: false, hard: 0.05 })
    );
    const t = result.trades[0]!;

    assert.equal(t.exitRaw, 90);
    assert.equal(t.exitReason, 'stop gap');
    assert.equal(t.gapFlag, 'gap');

    const shares = 100000 / (100 * (1 + c));
    const interest = (100000 * r * 1) / year;

    assert.ok(Math.abs(t.net - (shares * 90 * (1 - c) - 100000 - interest)) < 1e-6);
    assertIdentities(result);
  });

  test('F2: a fill-bar low through the level exits at the level in the fill session', () => {
    const bars: SessionSpec = {
      bars: [
        [100, 100.1, 94, 99],
        [99, 99.5, 98.8, 99.2],
        [99.2, 99.4, 99, 99.1]
      ]
    };
    const { result } = run([flatSession(100), bars, flatSession(99)], always({ own: false, hard: 0.05 }));
    const t = result.trades[0]!;

    assert.equal(t.exitIndex, t.entryIndex);
    assert.equal(t.exitBar, 0);
    assert.equal(t.exitRaw, 95);
    assert.equal(t.exitReason, 'stop');
    assert.equal(t.interest, 0);
    assertIdentities(result);
  });

  test('F3: a closing print below an untriggered stop does not trigger it; the next open gaps', () => {
    const session: SessionSpec = { ...path(100, 99), closingPrint: 94 };
    const { result } = run(
      [flatSession(100), path(100, 100), session, path(93, 93.5)],
      always({ own: false, hard: 0.05 })
    );
    const t = result.trades[0]!;

    assert.equal(t.exitIndex, 3);
    assert.equal(t.exitRaw, 93);
    assert.equal(t.exitReason, 'stop gap');
  });

  test('F5: under a delay the resting stop is live from bar 0 and fills at the first trade ≥ trigger + k', () => {
    const minute = 60;
    const bars: SessionSpec = {
      bars: [
        [100, 100, 99, 99.5],
        [99.5, 99.6, 94, 94.5],
        [94.5, 94.6, 94, 94.2],
        [94.2, 94.4, 94, 94.3]
      ]
    };
    const { result } = run(
      [flatSession(100), path(100, 100, 4), bars, flatSession(94, 4)],
      always({ own: false, hard: 0.05 }),
      { delayMinutes: 2 }
    );
    const t = result.trades[0]!;

    assert.equal(t.exitIndex, 2);
    assert.equal(t.exitBar, 3); // triggered in bar 1, filled at the first trade ≥ bar 1 + 2 minutes
    assert.equal(t.exitRaw, 94.2);
    assert.ok(minute > 0);
  });

  test('F14: no entry in a session that had an exit; R0 re-enters at the next session', () => {
    const { result } = run(
      [flatSession(100), path(100, 100), path(90, 92), flatSession(92), flatSession(93)],
      always({ own: false, hard: 0.05 }, { kind: 'Z0' }, 'R0')
    );

    assert.ok(result.trades.length >= 2);
    assert.equal(result.trades[1]!.entryIndex, result.trades[0]!.exitIndex + 1);
    assertIdentities(result);
  });
});

describe('interest and the account (F6, F7, F8, F10, F11)', () => {
  test('F6: Friday → Monday accrues three days of interest', () => {
    const specs = [
      flatSession(100),
      flatSession(100),
      flatSession(100),
      flatSession(100),
      flatSession(100),
      path(90, 91),
      flatSession(91)
    ];
    const { ds, result } = run(specs, always({ own: false, hard: 0.05 }), { firstDecisionIndex: 3 });
    const t = result.trades[0]!;

    assert.equal(ds.dates[t.entryIndex], '2016-01-08'); // a Friday
    assert.equal(ds.dates[t.exitIndex], '2016-01-11'); // the Monday
    assert.ok(Math.abs(t.interest - (100000 * r * 3) / year) < 1e-9);
  });

  test('F7: a Z2 trim repays principal first; interest falls only with the loan', () => {
    const specs = [flatSession(100), path(100, 100), path(100, 160), path(160, 160), path(160, 160)];
    const { result } = run(specs, always({ own: false, hard: 0.05 }, { kind: 'Z2', u: 0.5, v: 0 }));
    const t = result.trades[0]!;
    const shares = 100000 / (100 * (1 + c));
    const q = shares - 100000 / 160;
    const proceeds = q * 160 * (1 - c);

    assert.equal(t.trims.length, 1);
    assert.ok(Math.abs(t.trims[0]!.shares - q) < 1e-9);
    assert.ok(Math.abs(t.trims[0]!.repaid - proceeds) < 1e-6);

    // segments: 100,000 from session 1 to 3 (2 days), then 100,000 − proceeds to the end (session 4, 1 day)
    const interest = (100000 * r * 2) / year + ((100000 - proceeds) * r * 1) / year;

    assert.ok(Math.abs(t.interest - interest) < 1e-6);
    assertIdentities(result);
  });

  test('F8: trims that drive the loan to zero put the rest into cash and stop the interest', () => {
    const specs = [flatSession(100), path(100, 100), path(100, 300), path(300, 300), path(300, 300), path(300, 300)];

    for (const financing of ['net', 'slot'] as const) {
      const { result } = run(specs, always({ own: false, hard: 0.05 }, { kind: 'Z2', u: 1, v: 0 }), { financing });
      const t = result.trades[0]!;

      assert.equal(t.trims.length, 1);
      assert.equal(t.trims[0]!.repaid, 100000);
      assert.ok(t.trims[0]!.proceeds > 100000);

      // only the two days before the trim bear interest
      assert.ok(Math.abs(t.interest - (100000 * r * 2) / year) < 1e-6, financing);
      assertIdentities(result);
    }
  });

  test('F10: +100% then −30% — fixed shares give back the gain on the whole appreciated position', () => {
    const specs = [flatSession(100), path(100, 100), path(100, 200), path(200, 200), path(200, 140), path(140, 140)];
    const z0 = run(specs, always({ own: false, hard: 0.05 })).result;
    const z1 = run(specs, always({ own: false, hard: 0.05 }, { kind: 'Z2', u: 0.5, v: 0 })).result;
    const shares = 100000 / (100 * (1 + c));

    // Z0's daily drawdown: from the close at 200 (session 2, Wednesday) to the last close at 140 (session 5, Monday):
    // the 200 → 140 decline on the fixed share count plus five more calendar days of interest
    const z0Dd = shares * 60 + (100000 * r * 5) / year;

    assert.ok(Math.abs(z0.dailyDd - z0Dd) < 1e-6);
    assert.ok(z1.dailyDd < z0.dailyDd);
    assertIdentities(z0);
    assertIdentities(z1);
  });

  test('F11: net-debit — a carried loss pays interest while flat; fixed-slot does not', () => {
    const specs = [flatSession(100), path(100, 100), path(90, 90), flatSession(90), flatSession(90), flatSession(90)];
    const exit: ExitSpec = { own: false, hard: 0.05 };
    const policy: Policy = { ...always(exit, { kind: 'Z0' }, 'RN'), entry: 'C-SMA' };
    const al = always(exit, { kind: 'Z0' }, 'RN');
    const net = run(specs, al, { financing: 'net' }).result;
    const slot = run(specs, al, { financing: 'slot' }).result;
    const t = net.trades[0]!;
    const debit = t.principal - t.proceeds; // the principal debit left by the loss (accrued interest bears none)

    assert.ok(policy.entry === 'C-SMA');
    // after the gap stop on session 2 (Wednesday) the always-long campaign stays alive under RN (no re-entry): flat
    // through session 5 (Monday), five calendar days
    assert.equal(net.trades.length, 1);
    assert.ok(Math.abs(net.flatInterest - (debit * r * 5) / year) < 1e-6);
    assert.equal(slot.flatInterest, 0);
    assertIdentities(net);
    assertIdentities(slot);
  });
});

describe('switching (F13)', () => {
  const specs = [
    flatSession(100),
    path(100, 100),
    path(100, 120),
    flatSession(120),
    path(125, 126),
    flatSession(126),
    flatSession(126)
  ];
  const a = always({ own: false, hard: 0.2, trail: { t: 0.3, ref: 0 } }, { kind: 'Z0' }, 'R3F', 'A');
  const b = always({ own: false, hard: 0.2, trail: { t: 0.31, ref: 0 } }, { kind: 'Z0' }, 'R3F', 'B');
  const schedule = [
    { index: 0, policy: a },
    { index: 3, policy: b }
  ];

  test('S1: the old position is sold at b+1 and the new policy enters at b+2', () => {
    const { result } = run(specs, schedule, { transition: 'S1' });

    assert.equal(result.trades[0]!.exitReason, 'transition');
    assert.equal(result.trades[0]!.exitIndex, 4);
    assert.equal(result.trades[0]!.exitRaw, 125);
    assert.equal(result.trades[1]!.entryIndex, 5);
    assert.equal(result.trades[1]!.policy, 'B');
    assertIdentities(result);
  });

  test('S2: the old position continues under its own exits', () => {
    const { result } = run(specs, schedule, { transition: 'S2' });

    assert.equal(result.trades.length, 1);
    assert.equal(result.trades[0]!.policy, 'A');
    assertIdentities(result);
  });

  test('S3: the sell branch converts to B0 / C_b shares at b+1 with friction only on the sale', () => {
    const { result } = run(specs, schedule, { transition: 'S3' });
    const old = result.trades[0]!;
    const next = result.trades[1]!;
    const shares = 100000 / (100 * (1 + c));
    const target = 100000 / 120;
    const q = shares - target;
    const value = target * 125 + q * 125 * (1 - c);
    const interest = (100000 * r * 3) / year; // sessions 1 → 4 (Tue → Fri)

    assert.equal(old.exitReason, 'conversion');
    assert.ok(Math.abs(old.net - (value - 100000 - interest)) < 1e-6);
    assert.equal(next.kind, 'conversion');
    assert.ok(Math.abs(next.shares - target) < 1e-9);
    assert.ok(Math.abs(next.principal - target * 125) < 1e-6);
    // no entry friction; the only friction is the end-of-run liquidation of the open trade
    assert.ok(Math.abs(next.friction - target * 126 * c) < 1e-9);
    assertIdentities(result);
  });

  test('S3: the buy branch buys the shortfall at the buy price', () => {
    const down = [
      flatSession(100),
      path(100, 100),
      path(100, 85),
      flatSession(85),
      path(86, 86),
      flatSession(86),
      flatSession(86)
    ];
    const { result } = run(down, schedule, { transition: 'S3' });
    const next = result.trades[1]!;
    const shares = 100000 / (100 * (1 + c));
    const target = 100000 / 85;
    const q = target - shares;

    assert.equal(next.kind, 'conversion');
    assert.ok(Math.abs(next.principal - (shares * 86 + q * 86 * (1 + c))) < 1e-6);
    // entry friction on the bought shortfall only, plus the end-of-run liquidation of the open trade
    assert.ok(Math.abs(next.friction - (q * 86 * c + target * 86 * c)) < 1e-9);
    assertIdentities(result);
  });

  test('an identical re-selection is not a transition', () => {
    const { result } = run(
      specs,
      [
        { index: 0, policy: a },
        { index: 3, policy: a }
      ],
      { transition: 'S1' }
    );

    assert.equal(result.trades.length, 1);
    assert.equal(result.transitions.length, 0);
  });
});

describe('re-entry (F15) and exits (F16, F17)', () => {
  test('F15: RS needs a flat close at or below the prior stop before a close above it', () => {
    const specs = [
      flatSession(100),
      path(100, 100),
      path(94, 96),
      path(96, 97),
      path(97, 93),
      path(93, 96),
      flatSession(96),
      flatSession(96)
    ];
    const { result } = run(specs, always({ own: false, hard: 0.05 }, { kind: 'Z0' }, 'RS'));

    // the stop (95) gapped at session 2's open; closes 96, 97 are above 95 without a close at or below it first,
    // the close of session 4 (93) is below, the close of session 5 (96) reclaims it → entry at session 6
    assert.equal(result.trades[0]!.exitIndex, 2);
    assert.equal(result.trades[1]?.entryIndex, 6);
  });

  test('F16: XE uses t0 while S·Hc/B0 < 1 and tightens as the position appreciates', () => {
    const specs = [flatSession(100), path(100, 100), path(100, 150), path(150, 150), path(150, 135), flatSession(135)];
    const { result } = run(specs, always({ own: false, hard: 0.2, expTrail: { t0: 0.2, gamma: 1, tmin: 0.05 } }));
    const t = result.trades[0]!;
    const shares = 100000 / (100 * (1 + c));
    const tEff = Math.min(0.2, Math.max(0.05, 0.2 * Math.pow((shares * 150) / 100000, -1)));

    // at Hc = 150 the trail is 150 (1 − t_eff) ≈ 150 × 0.8666 = 130 < 135: still held; a plain 20% trail is 120
    assert.ok(tEff < 0.2);
    assert.equal(t.exitIndex, -1);
    assert.ok(Math.abs(t.stopLevel - 150 * (1 - tEff)) < 1e-9);
  });

  test('F17: XS is armed only after a held close above the floor', () => {
    const exit: ExitSpec = { own: false, hard: 0.5, floor: { theta: 0.05, b: 0, arm: true } };
    const ds = syntheticMarket(400, 3, 20);
    const armed = new Engine(ds).run(always(exit), { ...defaultOptions(250, 399) });
    const unarmed = new Engine(ds).run(always({ ...exit, floor: { theta: 0.05, b: 0, arm: false } }), {
      ...defaultOptions(250, 399)
    });

    assert.ok(armed.trades.length <= unarmed.trades.length);
  });
});

describe('chronology guards (F21, F22) and the door (F19)', () => {
  const ds = syntheticMarket(700, 5, 30);
  const policies: Policy[] = optimisedExits.slice(0, 6).map((family, i): Policy => ({
    id: `g${i}`,
    entry: (['E06', 'E05', 'E09', 'E03', 'C-SMA', 'E11'] as const)[i]!,
    entryParams:
      i === 0
        ? { v_in: 0.2, v_gap: 0.15, N: 50 }
        : i === 1
          ? { theta: 0.05, b: 0.005 }
          : i === 2
            ? { Y: 0.03 }
            : i === 3
              ? { N: 30, e_in: 0.3, e_gap: 0.3 }
              : i === 4
                ? {}
                : { D: 0.15, n: 5 },
    exit: {
      own: true,
      hard: 0.08,
      trail: { t: 0.1, ref: 0 },
      ...(family === 'XV' ? { vol: { k: 3, n: 20, dmin: 0.04, dmax: 0.15 } } : {})
    },
    reentry: reentryRules[i]!,
    sizing: { kind: 'Z0' }
  }));

  test('F21: prefix invariance of every signal and exit array', () => {
    const outcome = prefixInvariance(ds, 500, policies);

    assert.equal(outcome.differences, 0, outcome.fields.join(','));
  });

  test('F22: a poisoned future leaves decisions and marks through b unchanged; truncated runs agree', () => {
    const runs = policies.map((policy) => ({ schedule: policy, options: { ...defaultOptions(260, 699) } }));

    assert.equal(poisonedFuture(ds, 500, runs, 9).differences, 0);
    assert.equal(truncatedRunPrefix(ds, 500, runs).differences, 0);
  });

  test('F19: an end after 2023-12-29 is refused before any read', async () => {
    assert.throws(() => assertEndAllowed('2024-01-02'), /refused/);
    await assert.rejects(() => loadVgt('2025-06-30', '/nonexistent'), /refused/);
  });
});

describe('constants: code = EXPERIMENT_MATRIX.json; Sobol = Stage 1 on 8 dimensions', () => {
  const matrix = JSON.parse(fs.readFileSync('research/study3-vgt-momentum-stage1b/EXPERIMENT_MATRIX.json', 'utf8'));

  test('the matrix and the code agree', () => {
    assert.deepEqual(matrix.panelEntries, [...panelEntries]);
    assert.deepEqual(matrix.exitControls, [...exitControls]);
    assert.deepEqual(matrix.optimisedExits, optimisedExits);
    assert.deepEqual(matrix.reentryRules, reentryRules);
    assert.equal(matrix.principal, study.principal);
    assert.equal(matrix.rate, study.rate);
    assert.equal(matrix.costBps, study.costBps);
    assert.equal(matrix.dataCap, study.dataCap);
    assert.equal(matrix.search.caps.perHistory, search.caps.perHistory);
    assert.equal(matrix.rubric.sumMin, rubric.sumMin);
    assert.equal(matrix.rubric.windowDd, rubric.windowDd);

    for (const [family, box] of Object.entries(matrix.exitBoxes) as [string, Record<string, number[]>][]) {
      const dims = exitBoxes[family as keyof typeof exitBoxes];

      assert.ok(dims, family);
      assert.deepEqual(
        dims.map((d) => [d.name, d.lo, d.hi, d.q, d.default]),
        Object.entries(box).map(([name, [lo, hi, q, def]]) => [name, lo, hi, q, def]),
        family
      );
    }

    assert.deepEqual(
      pairings.map((p) => [p.id, p.entry, p.exit]),
      (Object.entries(matrix.pairings) as [string, string[]][])
        .filter(([id]) => id !== 'P12')
        .map(([id, [entry, exit]]) => [id, entry, exit])
    );
    assert.equal(sizingVariants.length, 9);
    assert.deepEqual(Object.keys(fixedExits).sort(), Object.keys(matrix.fixedExits).sort());
  });

  test('the frozen policy-ID serialisation (matrix test vector)', async () => {
    const { policyId, policyKeyString } = await import('../catalog.ts');

    assert.equal(policyKeyString(matrix.policyIdVector.key), matrix.policyIdVector.string);
    assert.equal(policyId(matrix.policyIdVector.key), matrix.policyIdVector.id);
  });

  test('the 16-dimension Sobol generator equals Stage 1 on its 8 dimensions', () => {
    assert.deepEqual(sobolPoints(8, 256, 12345), stage1Sobol(8, 256, 12345));
  });
});

describe('re-review 3 fixtures (F23–F25)', () => {
  test('F23: net-debit — a carried loss bears interest while flat and through the next trade; trades pay on their own principal', () => {
    // trade 1: entry session 1 at 100, gap stop session 2 at 90; flat sessions 2–4; trade 2: R0 is not available under
    // RN, so a second always-long campaign cannot start: use two policies instead (S1 adoption at session 4).
    const specs = [
      flatSession(100),
      path(100, 100),
      path(90, 90),
      flatSession(90),
      flatSession(90),
      path(91, 120),
      path(120, 121),
      flatSession(121)
    ];
    const a = always({ own: false, hard: 0.05 }, { kind: 'Z0' }, 'RN', 'A');
    const b = always({ own: false, hard: 0.5 }, { kind: 'Z0' }, 'RN', 'B');
    const { ds, result } = run(specs, [
      { index: 0, policy: a },
      { index: 4, policy: b }
    ]);
    const [t1, t2] = result.trades as [RunResult['trades'][number], RunResult['trades'][number]];
    const debit = t1.principal - t1.proceeds;
    const flatDays = (ds.sTime[t2.entryIndex]! - ds.sTime[t1.exitIndex]!) / 86400;
    const heldDays = (ds.sTime[ds.sessionCount - 1]! - ds.sTime[t2.entryIndex]!) / 86400;

    assert.equal(t2.entryIndex, 5);
    assert.ok(Math.abs(t2.interest - (100000 * r * heldDays) / year) < 1e-9, 'trade 2 pays on its own principal');
    assert.ok(Math.abs(result.carriedInterest - (debit * r * (flatDays + heldDays)) / year) < 1e-6, 'carried line');
    assert.ok(Math.abs(result.flatInterest - (debit * r * flatDays) / year) < 1e-6, 'flat part');
    assertIdentities(result);
  });

  test('F24: S2 with an identical re-selection continues; a C-IDLE window liquidates and stays flat; XU counts from the last new high', () => {
    const specs = [
      flatSession(100),
      path(100, 100),
      path(100, 110),
      flatSession(110),
      flatSession(108),
      flatSession(108),
      flatSession(108),
      flatSession(108)
    ];
    const a = always({ own: false, hard: 0.2, trail: { t: 0.3, ref: 0 } }, { kind: 'Z0' }, 'R3F', 'A');
    const same = run(
      specs,
      [
        { index: 0, policy: a },
        { index: 3, policy: a }
      ],
      { transition: 'S2' }
    ).result;

    assert.equal(same.trades.length, 1);
    assert.equal(same.transitions.length, 0);

    const idle: Policy = {
      id: 'C-IDLE',
      entry: 'C-IDLE',
      entryParams: {},
      exit: { own: true },
      reentry: 'RF',
      sizing: { kind: 'Z0' }
    };
    const gone = run(
      specs,
      [
        { index: 0, policy: a },
        { index: 3, policy: idle }
      ],
      { transition: 'S1' }
    ).result;

    assert.equal(gone.trades.length, 1);
    assert.equal(gone.trades[0]!.exitReason, 'transition');
    assert.equal(gone.trades[0]!.exitIndex, 4);

    // XU (U = 3, d = 1%): new high at session 2's close (110); closes 108 at sessions 4, 5 ≤ 110 × 0.99;
    // session 5 is 3 sessions after 2 → stale exit decided at 5, filled at session 6's open
    const stale = run(specs, always({ own: false, hard: 0.2, stale: { U: 3, d: 0.01 } })).result;

    assert.equal(stale.trades[0]!.exitReason, 'stale');
    assert.equal(stale.trades[0]!.exitIndex, 6);
  });

  test('F25: on a synthetic four-window path, Σ trade contributions − Δ carried interest = W_F', async () => {
    const { contributions } = await import('../paths.ts');
    const ds = syntheticMarket(900, 13, 30);
    const policy = (id: string, t: number): Policy => ({
      id,
      entry: 'E06',
      entryParams: { v_in: 0.25, v_gap: 0.15, N: 50 },
      exit: { own: true, hard: 0.08, trail: { t, ref: 0 } },
      reentry: 'R3F',
      sizing: { kind: 'Z2', u: 0.25, v: 0 }
    });
    const b = [300, 450, 600, 750];
    const schedule = b.map((index, i) => ({ index, policy: policy(`P${i}`, 0.08 + 0.03 * i) }));
    const result = new Engine(ds).run(schedule, {
      ...defaultOptions(300, 899),
      windows: b,
      recordDaily: true,
      transition: 'S1'
    });
    const rows = contributions(result, 300);

    for (const [w, window] of result.windows.entries()) {
      const sum = rows.filter((row) => row.window === w).reduce((a, row) => a + row.contribution, 0);
      const carriedAt = (s: number) => {
        const d = result.daily![s - 300]!;

        return d.liquidation - d.realized; // the open trade's value
      };

      assert.ok(Number.isFinite(carriedAt(window.end)));
      // liquidation = realized column + open value, and the realized column = Σ closed nets − carried
      const realizedChange = result.daily![window.end - 300]!.realized - result.daily![window.boundary - 300]!.realized;
      const closedNets = result.trades
        .filter((t) => t.exitIndex > window.boundary && t.exitIndex <= window.end)
        .reduce((a, t) => a + t.net, 0);
      const carriedChange = closedNets - realizedChange;

      assert.ok(Math.abs(sum - carriedChange - window.increment) < 1e-6, `window ${w}`);
    }

    assertIdentities(result);
  });
});
