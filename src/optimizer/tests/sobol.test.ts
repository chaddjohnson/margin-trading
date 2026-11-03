import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deriveSeed } from '../rng.ts';
import { Sobol, directionNumbers } from '../sobol.ts';

const take = (sobol: Sobol, count: number) => Array.from({ length: count }, () => sobol.next());

// Every elementary interval [k/2^a, (k+1)/2^a) x [l/2^b, (l+1)/2^b) with a + b = m holds exactly one of
// the first 2^m points: the (0, m, 2)-net property of Sobol's first two dimensions.
const isZeroNet = (points: number[][], m: number, dimensions: [number, number]) => {
  for (let a = 0; a <= m; a++) {
    const b = m - a;
    const counts = new Map<string, number>();

    for (const point of points) {
      const key = `${Math.floor(point[dimensions[0]]! * 2 ** a)},${Math.floor(point[dimensions[1]]! * 2 ** b)}`;

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    if (counts.size !== 2 ** m || [...counts.values()].some((count) => count !== 1)) {
      return false;
    }
  }

  return true;
};

describe('Sobol sequence', () => {
  it('reproduces the known first points of the unscrambled sequence', () => {
    const points = take(new Sobol({ dimensions: 3 }), 6);

    assert.deepEqual(points, [
      [0, 0, 0],
      [0.5, 0.5, 0.5],
      [0.75, 0.25, 0.25],
      [0.25, 0.75, 0.75],
      [0.375, 0.375, 0.625],
      [0.875, 0.875, 0.125]
    ]);
  });

  it('uses odd initial direction numbers below 2^k', () => {
    for (let dimension = 1; dimension < 16; dimension++) {
      const v = directionNumbers(dimension);

      for (let k = 0; k < 5; k++) {
        const m = v[k]! >>> (31 - k);

        assert.equal(m % 2, 1);
        assert.ok(m < 2 ** (k + 1));
      }
    }
  });

  it('stratifies every dimension: each 1/4096 interval holds exactly one of the first 4096 points', () => {
    for (const scramble of [undefined, { seed: deriveSeed('strata') }]) {
      const points = take(new Sobol({ dimensions: 7, scramble }), 4096);

      for (let dimension = 0; dimension < 7; dimension++) {
        const cells = new Set(points.map((point) => Math.floor(point[dimension]! * 4096)));

        assert.equal(cells.size, 4096, `dimension ${dimension + 1}, scrambled ${Boolean(scramble)}`);
      }
    }
  });

  it('keeps the (0, m, 2)-net property of dimensions 1 and 2 with and without scrambling', () => {
    assert.ok(isZeroNet(take(new Sobol({ dimensions: 2 }), 256), 8, [0, 1]));
    assert.ok(isZeroNet(take(new Sobol({ dimensions: 2, scramble: { seed: deriveSeed('net') } }), 256), 8, [0, 1]));
  });

  it('is deterministic for a seed and differs between seeds', () => {
    const a = take(new Sobol({ dimensions: 7, scramble: { seed: deriveSeed('x') } }), 50);
    const b = take(new Sobol({ dimensions: 7, scramble: { seed: deriveSeed('x') } }), 50);
    const c = take(new Sobol({ dimensions: 7, scramble: { seed: deriveSeed('y') } }), 50);

    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
  });

  it('covers the cube more evenly than pseudo-random points (lower centered discrepancy proxy)', () => {
    // Count empty cells of a 4^3 grid over dimensions 1-3 with 256 points: Sobol leaves none empty.
    const points = take(new Sobol({ dimensions: 3, scramble: { seed: deriveSeed('cover') } }), 256);
    const cells = new Set(points.map((point) => point.map((value) => Math.floor(value * 4)).join(',')));

    assert.equal(cells.size, 64);
  });
});
