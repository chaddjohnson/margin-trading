// Synthetic tests of the study's predeclared rules (no market data needed): the episode catalog (zigzag pivots, one
// episode per price event whatever the depth thresholds, families, unconfirmed troughs, eligibility), attribution and
// outcomes, the deep arming condition, the perturbation designs (legal 0.1-pp grid, determinism, VGT primary's joint
// design equal to the completed VGT audit's), the shortlist's independence from concentration and runs, and the doors'
// refusals before any byte is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Dataset } from '../../four-family/data.ts';
import { d1Keys } from '../../multi-etf-allocator/phenotypes.ts';
import { jointDesign as vgtAuditJointDesign } from '../../vgt-standalone-robustness/specs.ts';
import { legal } from '../context.ts';
import { candidateUniverse, foldUniverse, fullHistoryUniverse } from '../data.ts';
import {
  capturesOf,
  catalogOf,
  coverageOf,
  deepConditionSessions,
  familiesOf,
  familyNetOf,
  independentOf,
  isDipEntry,
  phaseOf,
  zigzag
} from '../events.ts';
import type { CensusRow, Grid } from '../inventory.ts';
import type { CompactLot } from '../run.ts';
import { liquidationOf } from '../run.ts';
import { buildShortlist } from '../shortlist.ts';
import { jointDesignOf, oatPointsOf, vgtPrimary } from '../specs.ts';
import { fixedView } from '../views.ts';

const datesOf = (count: number) =>
  Array.from({ length: count }, (_, index) => new Date(Date.UTC(2017, 0, 2 + index)).toISOString().slice(0, 10));

// A path through the given anchor prices, linear between anchors (`steps` sessions per leg).
const pathOf = (anchors: number[], steps = 10) => {
  const closes: number[] = [anchors[0]!];

  for (let leg = 1; leg < anchors.length; leg++) {
    for (let step = 1; step <= steps; step++) {
      closes.push(anchors[leg - 1]! + ((anchors[leg]! - anchors[leg - 1]!) * step) / steps);
    }
  }

  return closes;
};

describe('episode catalog', () => {
  test('one crash crossing every depth band is one episode (no multiplication by threshold)', () => {
    const closes = pathOf([100, 55, 101]);
    const catalog = catalogOf('T', datesOf(closes.length), closes, 0);

    assert.equal(catalog.length, 1);
    assert.equal(catalog[0]!.band, '30+');
    assert.equal(catalog[0]!.major, true);
    assert.equal(catalog[0]!.status, 'recovered');
    assert.ok(Math.abs(catalog[0]!.depth - 0.45) < 1e-12);
    assert.equal(familiesOf(catalog, closes).length, 1);
  });

  test('a 12.5% bear-market rally splits a decline into two episodes of one family', () => {
    const closes = pathOf([100, 80, 90, 70, 101]);
    const catalog = catalogOf('T', datesOf(closes.length), closes, 0);

    assert.equal(catalog.length, 2);
    assert.equal(catalog[0]!.status, 'partial');
    assert.equal(catalog[0]!.endIndex, catalog[1]!.peakIndex);
    assert.equal(catalog[0]!.family, catalog[1]!.family);
    assert.equal(catalog[1]!.band, '20-30'); // 90 → 70
  });

  test('families: episodes whose troughs are within 126 sessions of the family’s first trough share it', () => {
    const near = pathOf([100, 85, 100, 110, 88, 111], 10); // troughs 30 sessions apart
    const far = pathOf([100, 85, 100, ...Array<number>(20).fill(100), 110, 88, 111], 10); // troughs > 200 apart
    const chain = pathOf([100, 85, 100, 110, 88, 111, 122, 99, 123, 135, 108, 136, 150, 120, 151], 15);

    assert.equal(new Set(catalogOf('T', datesOf(near.length), near, 0).map((episode) => episode.family)).size, 1);
    assert.equal(new Set(catalogOf('T', datesOf(far.length), far, 0).map((episode) => episode.family)).size, 2);
    // five troughs 45 sessions apart: anchored windows split the chain (troughs at 15, 60, 105 | 150, 195)
    assert.equal(new Set(catalogOf('T', datesOf(chain.length), chain, 0).map((episode) => episode.family)).size, 2);
  });

  test('a decline in progress at the cutoff has an unconfirmed trough and an open rebound', () => {
    const closes = pathOf([100, 84]);
    const catalog = catalogOf('T', datesOf(closes.length), closes, 0);

    assert.equal(catalog.length, 1);
    assert.equal(catalog[0]!.troughConfirmed, false);
    assert.equal(catalog[0]!.status, 'open');
  });

  test('a dip shallower than the 10% reversal is no episode', () => {
    const closes = pathOf([100, 91.5, 104]);

    assert.equal(catalogOf('T', datesOf(closes.length), closes, 0).length, 0);
    assert.equal(zigzag(closes, 0, closes.length - 1).filter((pivot) => pivot.kind === 'peak').length, 0);
  });

  test('a trough before arming is ineligible, never a miss', () => {
    const closes = pathOf([100, 80, 100, 100, 70, 100]);
    const catalog = catalogOf('T', datesOf(closes.length), closes, 25);

    assert.equal(catalog[0]!.eligible, false);
    assert.equal(catalog[1]!.eligible, true);

    const captures = capturesOf(catalog, [], new Uint8Array(closes.length));

    assert.equal(captures[0]!.outcome, 'ineligible');
    assert.equal(captures[1]!.outcome, 'not armed');
  });

  test('the catalog is deterministic', () => {
    const closes = pathOf([100, 80, 90, 70, 101, 120, 95, 130]);
    const a = catalogOf('T', datesOf(closes.length), closes, 0);
    const b = catalogOf('T', datesOf(closes.length), closes, 0);

    assert.deepEqual(a, b);
  });
});

const lot = (fields: Partial<CompactLot>): CompactLot =>
  ({
    id: 1,
    entryIndex: 0,
    exitIndex: 0,
    entryRawPrice: 100,
    exitRawPrice: 100,
    net: 0,
    interest: 0,
    friction: 0,
    maePercent: 0,
    ...fields
  }) as CompactLot;

describe('attribution and outcomes', () => {
  const closes = pathOf([100, 60, 100]); // peak 0, trough 10, recovery 20
  const catalog = catalogOf('T', datesOf(closes.length), closes, 0);

  test('phases: (peak, trough] is the decline, (trough, end] the rebound, elsewhere outside', () => {
    assert.equal(phaseOf(catalog, 0).phase, 'outside');
    assert.equal(phaseOf(catalog, 5).phase, 'decline');
    assert.equal(phaseOf(catalog, 10).phase, 'decline');
    assert.equal(phaseOf(catalog, 11).phase, 'rebound');
    assert.equal(phaseOf(catalog, 20).phase, 'rebound');
  });

  test('captured, entered with a loss, in position and armed without entry are distinct outcomes', () => {
    const none = new Uint8Array(closes.length);
    const armed = new Uint8Array(closes.length).fill(1);
    const captured = capturesOf(
      catalog,
      [lot({ entryIndex: 9, exitIndex: 15, net: 5000, entryRawPrice: 64, exitRawPrice: 84 })],
      none
    )[0]!;
    const loss = capturesOf(catalog, [lot({ entryIndex: 3, exitIndex: 6, net: -2000 })], none)[0]!;
    const held = capturesOf(catalog, [lot({ entryIndex: 0, exitIndex: 4, net: -9000 })], none)[0]!;

    assert.equal(captured.outcome, 'captured');
    assert.equal(captured.firstEntryOffset, -1);
    assert.ok(Math.abs(captured.capturedShare! - 20 / 40) < 1e-12);
    assert.equal(loss.outcome, 'entered, loss');
    assert.equal(loss.declineEntries, 1);
    assert.equal(held.outcome, 'in position');
    assert.equal(capturesOf(catalog, [], armed)[0]!.outcome, 'armed, no entry');
    assert.equal(capturesOf(catalog, [], none)[0]!.outcome, 'not armed');
  });

  test('dip entry: the decline phase, or at least 50% of the episode’s depth below its peak', () => {
    const episode = catalog[0]!; // peak 100 at 0, trough 60 at 10 (depth 40%): the dip line is 80

    assert.equal(isDipEntry(episode, { entryIndex: 4, entryRawPrice: 95 }), true); // decline phase
    assert.equal(isDipEntry(episode, { entryIndex: 14, entryRawPrice: 79.99 }), true); // rebound, below the line
    assert.equal(isDipEntry(episode, { entryIndex: 14, entryRawPrice: 80 }), true); // exactly on the line
    assert.equal(isDipEntry(episode, { entryIndex: 16, entryRawPrice: 80.01 }), false); // rebound, above the line
  });

  test('dip capture needs a dip entry with net > 0; a profitable high re-entry is captured but not dip-captured', () => {
    const none = new Uint8Array(closes.length);
    const high = capturesOf(
      catalog,
      [lot({ entryIndex: 17, exitIndex: 19, net: 4000, entryRawPrice: 88, exitRawPrice: 96 })],
      none
    )[0]!;
    const dip = capturesOf(
      catalog,
      [lot({ entryIndex: 12, exitIndex: 18, net: 9000, entryRawPrice: 68, exitRawPrice: 92 })],
      none
    )[0]!;
    const losingDip = capturesOf(
      catalog,
      [lot({ entryIndex: 8, exitIndex: 9, net: -3000, entryRawPrice: 70, exitRawPrice: 66 })],
      none
    )[0]!;

    assert.equal(high.outcome, 'captured');
    assert.equal(high.dipCaptured, false);
    assert.equal(dip.dipCaptured, true);
    assert.equal(losingDip.dipCaptured, false);
  });

  test('family nets count eligible episodes only', () => {
    const path2 = pathOf([100, 80, 100, 100, 70, 100]); // two episodes; the first is ineligible (arming at 25)
    const cat2 = catalogOf('T', datesOf(path2.length), path2, 25).map((episode) => ({ ...episode, family: 'T-F01' }));
    const captures = capturesOf(
      cat2,
      [
        lot({ id: 1, entryIndex: 15, exitIndex: 19, net: 7000, entryRawPrice: 90, exitRawPrice: 99 }),
        lot({ id: 2, entryIndex: 45, exitIndex: 49, net: 5000, entryRawPrice: 75, exitRawPrice: 95 })
      ],
      new Uint8Array(path2.length)
    );

    assert.equal(captures[0]!.eligible, false);
    assert.equal(familyNetOf(captures, 'T-F01'), 5000);
    assert.equal(familyNetOf(captures, 'T-F01', true), 5000);
  });

  test('coverage: the share of eligible sessions inside an episode span', () => {
    assert.ok(Math.abs(coverageOf(catalog, 0, 20) - 20 / 21) < 1e-12);
    assert.equal(coverageOf([], 0, 20), 0);
  });

  test('independent events: anchor troughs at least 252 sessions apart, greedily', () => {
    assert.equal(independentOf([]), 0);
    assert.equal(independentOf([100]), 1);
    assert.equal(independentOf([100, 300, 400, 700]), 3); // 100 | 300 too close | 400 | 700
    assert.equal(independentOf([700, 100, 352]), 3);
  });

  test('the deep condition uses the prior L sessions’ highs and the session’s lowest minute close', () => {
    const highs = [100, 100, 100, 100, 100, 100];
    const minCloses = [99, 99, 95, 79.9, 80.1, 90];
    const ds = {
      sessionCount: 6,
      sHigh: Float64Array.from(highs),
      sMinClose: Float64Array.from(minCloses)
    } as unknown as Dataset;
    const sessions = deepConditionSessions(ds, 0.2, 2, 0);

    assert.deepEqual([...sessions], [0, 0, 0, 1, 0, 0]);
    assert.deepEqual([...deepConditionSessions(ds, 0.2, 2, 4)], [0, 0, 0, 0, 0, 0]);
  });
});

const grid: Grid = {
  targetPercentChange: 278,
  trailingBuyPercentage: 11,
  trailingStopPercentage: 76,
  maximumHoldDays: 3,
  tickWindowSize: 231,
  intradayLossBuffer: 22,
  pullback: 70,
  continuationWindow: 127
};
const phenotype = {
  ...vgtPrimary,
  id: 'GDX:representative',
  symbol: 'GDX',
  grid,
  researchOnly: true
};

describe('perturbation designs', () => {
  test('OAT points are whole grid units inside the legal grid, or recorded as truncated', () => {
    const points = oatPointsOf({ ...phenotype, grid: { ...grid, targetPercentChange: 300, maximumHoldDays: 2 } });

    assert.equal(points.length, 32);

    for (const point of points) {
      const { min, max } = legal(point.key);

      assert.ok(Number.isInteger(point.value));
      assert.equal(point.feasible, point.value >= min && point.value <= max);
    }

    assert.ok(points.some((point) => !point.feasible && point.key === 'targetPercentChange'));
    assert.ok(points.some((point) => !point.feasible && point.key === 'maximumHoldDays'));
  });

  test('joint samples are deterministic and inside [v − m, v + m] ∩ the legal grid', () => {
    const a = jointDesignOf(phenotype, 1);
    const b = jointDesignOf(phenotype, 1);
    const c = jointDesignOf(phenotype, 2);

    assert.deepEqual(a.samples, b.samples);
    assert.notDeepEqual(a.samples, c.samples);
    assert.equal(a.samples.length, 64);

    for (const sample of a.samples) {
      for (const dimension of a.dimensions) {
        assert.ok(dimension.values.includes(sample[dimension.key]));
      }
    }
  });

  test('common random numbers: every phenotype’s samples sit at the same relative strata as VGT primary’s', () => {
    const other = jointDesignOf({ ...phenotype, grid: { ...grid } }, 1);
    const primary = jointDesignOf(vgtPrimary, 1);
    // two dimensions with the same number of legal values map to the same value positions
    const position = (design: typeof other, key: (typeof d1Keys)[number], sample: number) => {
      const dimension = design.dimensions.find((item) => item.key === key)!;

      return dimension.values.indexOf(design.samples[sample]![key]) / dimension.values.length;
    };

    for (const key of d1Keys) {
      const a = other.dimensions.find((item) => item.key === key)!;
      const b = primary.dimensions.find((item) => item.key === key)!;

      if (a.values.length === b.values.length) {
        for (let sample = 0; sample < 64; sample++) {
          assert.equal(position(other, key, sample), position(primary, key, sample));
        }
      }
    }
  });

  test('VGT primary’s joint design is the completed VGT audit’s (same vectors)', () => {
    for (const seed of [1, 2]) {
      const ours = jointDesignOf(vgtPrimary, seed);
      const theirs = vgtAuditJointDesign(
        {
          id: 'VGT-primary',
          symbol: 'VGT',
          phenotype: 'primary',
          file: 'config/phenotypes/D1/VGT.json',
          book: { symbol: 'VGT', phenotype: 'primary', grid: { ...vgtPrimary.grid } }
        },
        seed
      );

      assert.deepEqual(
        ours.samples.map((sample) => d1Keys.map((key) => sample[key])),
        theirs.samples
      );
    }
  });
});

describe('accounting', () => {
  test('liquidation: proceeds less the per-side cost, interest from the entry session’s midnight', () => {
    const value = liquidationOf({ shares: 1000, principal: 100000, entryTimestamp: 0 }, 110, 365 * 86400, 0.11, 5);

    assert.ok(Math.abs(value.price - 110 * 0.9995) < 1e-12);
    assert.ok(Math.abs(value.interest - 11000) < 1e-9);
    assert.ok(Math.abs(value.net - (1000 * 110 * 0.9995 - 100000 - 11000)) < 1e-9);
  });
});

const censusRow = (
  symbol: string,
  window: CensusRow['window'],
  net: number,
  extra: Partial<CensusRow> = {}
): CensusRow =>
  ({
    symbol,
    window,
    status: 'survivor',
    uncertain: false,
    minTrades: 7,
    library: [],
    liquidity: { coverageMedian: 1, medianDollarVolume: 1e9, p10DollarVolume: 1e9, barsPerSession: 390 },
    representative: {
      candidateId: `d1-${symbol}`,
      description: symbol,
      grid,
      phenotypeFile: `${symbol}.json`,
      phenotypeSha256: '0',
      sha256Verified: true,
      metrics: {
        trades: 20,
        net,
        bestTrade: net * 0.4,
        secondTrade: net * 0.2,
        thirdTrade: net * 0.1,
        worstTrade: -3000,
        occupiedDays: 400,
        minuteDrawdown: 15000,
        yearly: { 2020: net * 0.7, 2022: net * 0.3 },
        credible: true
      },
      derived: { top3Share: 0.7 },
      neighbourhood: { draws: 16, medianJ: 1, p10J: 1, minJ: 1, credibleShare: 1, credibleDraws: 16 }
    },
    ...extra
  }) as unknown as CensusRow;

describe('shortlist rule', () => {
  const symbols = ['XME', 'GDX', 'SLV', 'XLB', 'EDV', 'FXI', 'IJH', 'VGT', 'SMH'];
  const rows = symbols.flatMap((symbol, index) =>
    (['fold-a', 'fold-b', 'final'] as const).map((window) => censusRow(symbol, window, 200000 - index * 15000))
  );

  test('top-trade concentration changes nothing (it enters no gate and no grade)', () => {
    const concentrated = rows.map((row) =>
      row.window === 'final'
        ? ({
            ...row,
            representative: {
              ...row.representative!,
              metrics: { ...row.representative!.metrics, bestTrade: row.representative!.metrics.net * 0.95 },
              derived: { ...row.representative!.derived, top3Share: 1.2 }
            }
          } as CensusRow)
        : row
    );

    assert.deepEqual(
      buildShortlist(rows).selected.map((candidate) => candidate.symbol),
      buildShortlist(concentrated).selected.map((candidate) => candidate.symbol)
    );
  });

  test('the control instrument and semiconductors are scored but never placed; merit slots ignore clusters', () => {
    const { candidates, selected } = buildShortlist(rows);
    const placed = selected.map((candidate) => candidate.symbol);

    assert.ok(!placed.includes('VGT') && !placed.includes('SMH'));
    assert.equal(candidates.find((candidate) => candidate.symbol === 'VGT')!.decision, 'excluded from slots');
    assert.ok(placed.includes('XME') && placed.includes('GDX')); // both above $135,359 → merit
    assert.deepEqual(buildShortlist(rows).selected, selected);
  });
});

describe('doors refuse before reading', () => {
  test('a research phenotype may not be read after 2023-12-29', async () => {
    await assert.rejects(candidateUniverse(['GDX'], '2024-01-02'), /through 2023-12-29 only/);
  });

  test('a fold representative may not be read after its validation end', async () => {
    await assert.rejects(foldUniverse('fold-a', ['GDX'], '2022-01-03'), /through 2021-12-31 only/);
  });

  test('the full-history door opens the unchanged incumbents’ symbols only', async () => {
    await assert.rejects(fullHistoryUniverse(['XME']), /unchanged incumbents/);
  });

  test('a research phenotype whose symbol the full-history door would accept is still refused after 2023-12-29', async () => {
    await assert.rejects(
      fixedView('GDX:representative', { end: '2026-10-13' }),
      /research-only: it may be evaluated through 2023-12-29 only/
    );
    await assert.rejects(fixedView('source:final:VGT', { end: '2024-01-02' }), /research-only/);
    await assert.rejects(fixedView('config/phenotypes/D1/GDX.json', {}), /registry file/);
  });
});
