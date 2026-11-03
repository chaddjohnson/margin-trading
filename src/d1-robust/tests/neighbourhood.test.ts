// The neighbourhood instrument and its statistics (PROTOCOL.md §4, §6.2–§6.3, §7.5) on synthetic vectors: reflection
// never leaves the box and moves boundary coordinates as often as interior ones; common random numbers pair
// configurations sharing a symbol; stage labels and windows give independent patterns; N2 moves exactly three
// coordinates and N3 one member; the score, the calibration rule (floors, caps, pooling, the uncalibrated fallback),
// the discovery sample-size rule and the paired bootstrap behave as written.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { box } from '../../multi-etf-d1/space.ts';
import type { Grid } from '../../portfolio-aware-d1/phenotypes.ts';
import { Rng } from '../../optimizer/rng.ts';
import { bandOf, candidateUniverse, study } from '../context.ts';
import {
  type Book,
  applySigns,
  boundaryCoordinates,
  movedCoordinates,
  neighbourOf,
  reflect,
  stepPattern,
  vectorOfGrid
} from '../neighbourhood.ts';
import {
  calibrateReferences,
  chooseDiscoveryDraws,
  floorReferences,
  medianOf,
  pairedBootstrap,
  quantile,
  scoreOf,
  spearman,
  subsampledSe,
  summarize
} from '../stats.ts';

const grid = (values: Partial<Grid> = {}): Grid => ({
  targetPercentChange: 150,
  trailingBuyPercentage: 10,
  trailingStopPercentage: 80,
  maximumHoldDays: 10,
  tickWindowSize: 100,
  intradayLossBuffer: 20,
  pullback: 90,
  continuationWindow: 60,
  ...values
});

const lowCorner = (): Grid => Object.fromEntries(box.map((spec) => [spec.key, spec.min])) as unknown as Grid;
const highCorner = (): Grid => Object.fromEntries(box.map((spec) => [spec.key, spec.max])) as unknown as Grid;

const book = (symbol: string, values: Grid): Book => ({ symbol, vector: vectorOfGrid(values, 'test') });

describe('reflection and step patterns', () => {
  test('reflect moves inward at a bound and never leaves the box', () => {
    assert.equal(reflect(300, 5, 80, 300), 295);
    assert.equal(reflect(80, -5, 80, 300), 85);
    assert.equal(reflect(150, 5, 80, 300), 155);
    assert.equal(reflect(150, 0, 80, 300), 150);

    for (const corner of [lowCorner(), highCorner()]) {
      for (let draw = 0; draw < 200; draw++) {
        const signs = stepPattern('final', 'test', 'N1', draw).get('XLV')!;

        for (const amplitude of [1, 2]) {
          const next = applySigns(corner, signs, amplitude);

          for (const spec of box) {
            const value = next[spec.key as keyof Grid];

            assert.ok(value >= spec.min && value <= spec.max, `${spec.key} ${value} left the box`);
          }
        }
      }
    }
  });

  test('boundary coordinates move with frequency 2/3, like interior ones', () => {
    let moves = 0;
    let total = 0;
    const draws = 3000;

    for (let draw = 0; draw < draws; draw++) {
      const signs = stepPattern('final', 'boundary-test', 'N1', draw).get('XBI')!;
      const next = applySigns(lowCorner(), signs);

      for (const spec of box) {
        total++;
        moves += next[spec.key as keyof Grid] !== spec.min ? 1 : 0;
      }
    }

    assert.ok(
      Math.abs(moves / total - 2 / 3) < study.pilot.boundaryMoveTolerance,
      `boundary move share ${moves / total}`
    );
  });

  test('common random numbers: a shared symbol gets identical steps; labels and windows are independent', () => {
    const a = [book('XBI', grid()), book('KRE', grid({ pullback: 120 }))];
    const b = [book('XBI', grid()), book('GDX', grid({ tickWindowSize: 50 })), book('VGT', grid())];

    for (let draw = 0; draw < 50; draw++) {
      const na = neighbourOf(a, 'final', 'disc', 'N1', draw);
      const nb = neighbourOf(b, 'final', 'disc', 'N1', draw);

      assert.deepEqual(
        na.find((item) => item.symbol === 'XBI')!.vector.grid,
        nb.find((item) => item.symbol === 'XBI')!.vector.grid
      );
    }

    const same = (window: string, stage: string) =>
      [...stepPattern(window, stage, 'N1', 3).values()].map((signs) => signs.join(',')).join('|');

    assert.notEqual(same('final', 'disc'), same('final', 'promo'));
    assert.notEqual(same('final', 'confirm-A'), same('final', 'confirm-B'));
    assert.notEqual(same('fold-a', 'disc'), same('fold-b', 'disc'));
    assert.equal(same('final', 'disc'), same('final', 'disc'));
    assert.equal(stepPattern('final', 'disc', 'N1', 0).size, candidateUniverse.length);
  });

  test('a zero step pattern reproduces the centre; N2 moves exactly three coordinates; N3 one member', () => {
    const centre = [book('XBI', grid()), book('KRE', grid()), book('GDX', grid())];

    assert.deepEqual(applySigns(grid(), new Int8Array(8)), grid());

    for (let draw = 0; draw < 40; draw++) {
      const n2 = neighbourOf(centre, 'final', 'pilot-N2', 'N2', draw);

      assert.equal(movedCoordinates(centre, n2), 3);

      const n3 = neighbourOf(centre, 'final', 'pilot-N3', 'N3', draw, 'KRE');

      for (const item of n3) {
        if (item.symbol !== 'KRE') {
          assert.deepEqual(item.vector.grid, centre.find((other) => other.symbol === item.symbol)!.vector.grid);
        }
      }
    }

    assert.equal(boundaryCoordinates([book('XBI', lowCorner())]), 8);
    assert.equal(boundaryCoordinates([book('XBI', grid())]), 0);
  });
});

describe('statistics, score and calibration', () => {
  test('the summary and the score', () => {
    const records = Array.from({ length: 64 }, (_, index) => ({
      net: 100000 + 1000 * index,
      drawdown: 20000 + 500 * index,
      lots: 10,
      top2Share: 0.3,
      moved: 5
    }));
    const stats = summarize(150000, records);

    assert.equal(
      stats.p50,
      quantile(
        records.map((record) => record.net),
        0.5
      )
    );
    assert.equal(stats.n, 64);
    assert.ok(stats.shareAbove > 0.2 && stats.shareAbove < 0.3);

    const parts = scoreOf({ p50: 200000, ddMedian: 40000, dd90: 50000 }, 4, floorReferences());

    assert.equal(parts.j0, 200000 - 4 * 5000);
    assert.equal(parts.penaltyMedian, 5000);
    assert.equal(parts.penaltyTail, 2500);
    assert.equal(parts.s, 200000 - 20000 - 7500);
    assert.equal(bandOf(7), 6);
    assert.equal(bandOf(11), 8);
    assert.equal(bandOf(15), 12);
    assert.equal(bandOf(30), 16);
  });

  test('the calibration rule: floors, caps, pooling of sparse strata, the uncalibrated fallback', () => {
    const controls = [
      ...Array.from({ length: 12 }, (_, i) => ({ stratum: 1, ddMedian: 20000 + 100 * i, dd90: 30000 })),
      ...Array.from({ length: 12 }, (_, i) => ({ stratum: 4, ddMedian: 40000 + 1000 * i, dd90: 60000 + 1000 * i })),
      ...Array.from({ length: 4 }, () => ({ stratum: 5, ddMedian: 90000, dd90: 120000 })),
      ...Array.from({ length: 12 }, () => ({ stratum: 16, ddMedian: 80000, dd90: 100000 }))
    ];
    const references = calibrateReferences(controls);

    assert.equal(references[1]!.median, 35000);
    assert.equal(references[1]!.flagMedian, 'floor');
    assert.equal(references[4]!.flagMedian, 'calibrated');
    assert.equal(
      references[4]!.median,
      quantile(
        controls.filter((c) => c.stratum === 4).map((c) => c.ddMedian),
        0.75
      )
    );
    assert.deepEqual(references[5]!.pooledStrata, [5, 4]); // nearest first, the lower one first on ties
    assert.equal(references[16]!.median, 55000);
    assert.equal(references[16]!.flagMedian, 'extreme');
    assert.equal(references[16]!.tail, 75000);
    assert.equal(calibrateReferences([{ stratum: 1, ddMedian: 1, dd90: 1 }])[1]!.flagMedian, 'uncalibrated');
  });

  test('the discovery sample size and the subsampled standard error', () => {
    const rng = Rng.from('test', 'se');
    const nets = Array.from({ length: 64 }, () => 100000 + 40000 * (rng.next() - 0.5));
    const se12 = subsampledSe(nets, 12, Rng.from('test', 'se12'), 2000);
    const se24 = subsampledSe(nets, 24, Rng.from('test', 'se24'), 2000);

    assert.ok(se24 < se12);
    assert.equal(chooseDiscoveryDraws({ 12: 20000, 16: 12000, 24: 9000 }, [12, 16, 24], 12500), 16);
    assert.equal(chooseDiscoveryDraws({ 12: 20000, 16: 19000, 24: 18000 }, [12, 16, 24], 12500), 24);
  });

  test('the paired bootstrap narrows a difference that common draws share', () => {
    const rng = Rng.from('test', 'paired');
    const common = Array.from({ length: 128 }, () => 50000 * (rng.next() - 0.5));
    const a = common.map((value) => 120000 + value + 2000 * (rng.next() - 0.5));
    const b = common.map((value) => 100000 + value + 2000 * (rng.next() - 0.5));
    const paired = pairedBootstrap(a, b, medianOf, Rng.from('test', 'boot'), 2000);

    assert.ok(paired.lower > 0, 'the shared noise cancels: the difference is precise');
    assert.ok(paired.varianceReduction > 4);
    assert.ok(spearman(a, b) > 0.9);
    assert.ok(Math.abs(paired.estimate - 20000) < 3000);
  });
});
