// Synthetic tests of the predeclared flags and standing (./standing.ts, PROTOCOL.md §10): each flag's trigger, the
// F4 and F8 status values, the (iii)/(i)/(ii) rule, ties versus "strictly better", both seeds required on an axis, the
// procedure-matched control, and the ETF-level rule (the representative decides; the alternative only corroborates).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type PhenotypeSummary, axesOf, etfStandingOf, flagsOf, standingOf } from '../standing.ts';

const clean = (overrides: Partial<PhenotypeSummary> = {}): PhenotypeSummary => ({
  id: 'X:representative',
  isControl: false,
  hindsightFolds: false,
  baseNet: 150000,
  baseMinuteDrawdown: 20000,
  c1Net: 120000,
  c1MinuteDrawdown: 22000,
  f10Net: 140000,
  f20Net: 130000,
  basePortfolioDaily: 0.3,
  worstLot: -5000,
  worstMae: -0.12,
  accountingMaxError: 0,
  eligibleMajorFamilies: 4,
  dipFamilies: 4,
  eligibleFamilies: 6,
  majorDipFamilies: 3,
  neighbourMajorCapture: 0.67,
  winnerKeptShare: 0.6,
  pooled: {
    medianNet: 110000,
    shareProfitable: 1,
    medianRetention: 0.75,
    shareDdWithinCeiling: 0.95,
    medianPortfolioDaily: 0.31
  },
  seeds: [
    { medianNet: 108000, shareProfitable: 1 },
    { medianNet: 112000, shareProfitable: 1 }
  ],
  liquidityConcern: false,
  folds: [
    { fold: 'fold-a', increment5: 20000, lotsEntered: 3, openAtBoundary: 0 },
    { fold: 'fold-b', increment5: 15000, lotsEntered: 4, openAtBoundary: 1 }
  ],
  foldsExpected: 2,
  ...overrides
});

const control = (overrides: Partial<PhenotypeSummary> = {}) =>
  clean({
    id: 'VGT-primary',
    isControl: true,
    hindsightFolds: true,
    pooled: {
      medianNet: 100000,
      shareProfitable: 1,
      medianRetention: 0.7,
      shareDdWithinCeiling: 1,
      medianPortfolioDaily: 0.33
    },
    seeds: [
      { medianNet: 99000, shareProfitable: 1 },
      { medianNet: 101000, shareProfitable: 1 }
    ],
    dipFamilies: 3,
    ...overrides
  });

describe('flags', () => {
  test('a clean summary raises nothing', () => {
    const flags = flagsOf(clean());

    assert.deepEqual(
      Object.entries(flags).filter(([, value]) => value !== false && value !== 'pass'),
      []
    );
  });

  test('each flag fires at its predeclared threshold', () => {
    assert.equal(flagsOf(clean({ dipFamilies: 1 })).F1, true);
    assert.equal(flagsOf(clean({ eligibleMajorFamilies: 1 })).F1, true);
    assert.equal(flagsOf(clean({ worstLot: -10000.01 })).F2, true);
    assert.equal(flagsOf(clean({ worstLot: -10000 })).F2, false);
    assert.equal(flagsOf(clean({ worstMae: -0.2501 })).F2, true);
    assert.equal(flagsOf(clean({ c1MinuteDrawdown: 35000.01 })).F3, true);
    assert.equal(flagsOf(clean({ basePortfolioDaily: 0.3501 })).F3, true);
    assert.equal(flagsOf(clean({ neighbourMajorCapture: 0.49 })).F4, 'raised');
    assert.equal(flagsOf(clean({ winnerKeptShare: 0.24 })).F5, true);
    assert.equal(flagsOf(clean({ winnerKeptShare: null })).F5, true);
    assert.equal(flagsOf(clean({ c1Net: 74000 })).F6, true); // below 50% of base
    assert.equal(flagsOf(clean({ f20Net: 0 })).F6, true);
    assert.equal(flagsOf(clean({ liquidityConcern: true })).F7, true);
    assert.equal(flagsOf(clean({ pooled: { ...clean().pooled, shareProfitable: 0.74 } })).F9, true);
    assert.equal(flagsOf(clean({ pooled: { ...clean().pooled, medianRetention: 0.49 } })).F9, true);
    assert.equal(flagsOf(clean({ pooled: { ...clean().pooled, shareDdWithinCeiling: 0.74 } })).F10, true);
    assert.equal(flagsOf(clean({ pooled: { ...clean().pooled, medianPortfolioDaily: 0.36 } })).F10, true);
  });

  test('F4 is "insufficient" when the base dip-captured fewer than two major families', () => {
    assert.equal(flagsOf(clean({ majorDipFamilies: 1, neighbourMajorCapture: 1 })).F4, 'insufficient');
    assert.equal(flagsOf(clean({ majorDipFamilies: 0, neighbourMajorCapture: 0 })).F4, 'insufficient');
  });

  test('F8 separates negative evidence, no evidence and hindsight', () => {
    assert.equal(flagsOf(clean()).F8, 'pass');
    assert.equal(
      flagsOf(
        clean({ folds: [{ fold: 'fold-a', increment5: -1, lotsEntered: 2, openAtBoundary: 0 }, clean().folds[1]!] })
      ).F8,
      'negative'
    );
    assert.equal(
      flagsOf(
        clean({ folds: [{ fold: 'fold-a', increment5: 0, lotsEntered: 0, openAtBoundary: 0 }, clean().folds[1]!] })
      ).F8,
      'no evidence'
    );
    assert.equal(flagsOf(clean({ folds: [clean().folds[0]!] })).F8, 'no evidence');
    assert.equal(flagsOf(control()).F8, 'not assessable (hindsight)');
  });
});

describe('standing', () => {
  test('(iii) when the base or C1 loses, the neighbourhood median loses or < 50% profit, or the DD ceiling is breached', () => {
    for (const overrides of [
      { baseNet: 0 },
      { c1Net: -1 },
      { pooled: { ...clean().pooled, medianNet: -1 } },
      { pooled: { ...clean().pooled, shareProfitable: 0.49 } },
      { baseMinuteDrawdown: 35001 },
      { accountingMaxError: 0.02 }
    ]) {
      assert.equal(standingOf(clean(overrides), control(), control()).standing, '(iii) unsupported');
    }
  });

  test('(i) needs no blocking flag and two of three axes; F7 and F8 "no evidence" do not block', () => {
    assert.match(standingOf(clean(), control(), control()).standing, /^\(i\)/);
    assert.match(standingOf(clean({ liquidityConcern: true }), control(), control()).standing, /^\(i\)/);
    assert.match(standingOf(clean({ folds: [clean().folds[0]!] }), control(), control()).standing, /^\(i\)/);
    assert.match(standingOf(clean({ winnerKeptShare: 0.1 }), control(), control()).standing, /^\(ii\)/);
    assert.match(standingOf(clean({ majorDipFamilies: 1 }), control(), control()).standing, /^\(ii\)/);
    assert.match(
      standingOf(
        clean({ folds: [{ fold: 'fold-a', increment5: -5, lotsEntered: 1, openAtBoundary: 0 }, clean().folds[1]!] }),
        control(),
        control()
      ).standing,
      /^\(ii\)/
    );
  });

  test('an axis must hold on the pooled samples and on each seed; ties count as met but not as strictly better', () => {
    const tied = axesOf(
      clean({
        seeds: [
          { medianNet: 98000, shareProfitable: 1 },
          { medianNet: 112000, shareProfitable: 1 }
        ]
      }),
      control()
    );

    assert.equal(tied.axes.jointMedianNet.met, false); // seed 1 below the control's seed 1
    assert.equal(tied.axes.jointProfitableShare.met, true); // 100% = 100%: a tie
    assert.equal(tied.axes.jointProfitableShare.strictly, false);
  });

  test('"stronger" needs all three axes, one strictly better, the procedure-matched control on two, and no F7', () => {
    const equal = clean({ pooled: control().pooled, seeds: control().seeds, dipFamilies: 3 });

    assert.equal(standingOf(equal, control(), control()).stronger, false); // ties everywhere
    assert.equal(standingOf(clean(), control(), control()).stronger, true);
    assert.equal(standingOf(clean({ liquidityConcern: true }), control(), control()).stronger, false);

    const strongMatched = control({
      id: 'VGT:research-representative',
      hindsightFolds: false,
      pooled: { ...clean().pooled, medianNet: 200000, shareProfitable: 1 },
      seeds: [
        { medianNet: 200000, shareProfitable: 1 },
        { medianNet: 200000, shareProfitable: 1 }
      ],
      dipFamilies: 9
    });

    assert.equal(standingOf(clean(), control(), strongMatched).stronger, false);
  });

  test('"stronger" also needs period-correct support: a fold with V > 0 and none negative', () => {
    const noEvidence = clean({
      folds: [
        { fold: 'fold-a', increment5: 0, lotsEntered: 0, openAtBoundary: 0 },
        { fold: 'fold-b', increment5: 0, lotsEntered: 0, openAtBoundary: 0 }
      ]
    });
    const oneGood = clean({
      folds: [
        { fold: 'fold-a', increment5: 0, lotsEntered: 0, openAtBoundary: 0 },
        { fold: 'fold-b', increment5: 9000, lotsEntered: 2, openAtBoundary: 0 }
      ]
    });

    assert.match(standingOf(noEvidence, control(), control()).standing, /^\(i\)/); // "no evidence" does not block (i)
    assert.equal(standingOf(noEvidence, control(), control()).stronger, false);
    assert.equal(standingOf(oneGood, control(), control()).stronger, true);
  });

  test('a control is never "stronger" than itself', () => {
    assert.equal(standingOf(control(), control(), control()).stronger, false);
  });
});

describe('ETF level', () => {
  const good = standingOf(clean(), control(), control());
  const weak = standingOf(clean({ winnerKeptShare: 0 }), control(), control());
  const bad = standingOf(clean({ baseNet: -1 }), control(), control());

  test('the representative decides; an unsupported alternative demotes (i) to (ii)', () => {
    assert.match(etfStandingOf(good).standing, /^\(i\)/);
    assert.match(etfStandingOf(good, weak).standing, /^\(i\)/);
    assert.match(etfStandingOf(good, bad).standing, /^\(ii\)/);
    assert.equal(etfStandingOf(good, bad).observation, false);
  });

  test('a better alternative never promotes the ETF', () => {
    assert.match(etfStandingOf(weak, good).standing, /^\(ii\)/);
    assert.match(etfStandingOf(bad, good).standing, /^\(iii\)/);
  });
});
