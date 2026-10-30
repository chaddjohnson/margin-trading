// B5's books, grid conversion, quantization and the role bands (PROTOCOL.md §5). No market data.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  gridKey,
  gridOfParams,
  loadB5,
  neighbourhoodBounds,
  paramsOfGrid,
  shallowBand,
  deepBroadBand,
  inBounds
} from '../books.ts';
import { Rng } from '../../optimizer/rng.ts';
import { mutateGrid, randomGrid, sobolGrids } from '../space.ts';
import { perturbGrid } from '../selection.ts';
import { shallowBounds } from '../books.ts';

describe('books and bands', () => {
  test('B5 loads its five registered books exactly', async () => {
    const b5 = await loadB5();

    assert.deepEqual(
      b5.books.map((book) => `${book.symbol}:${gridKey(book.grid)}`),
      [
        'VGT:216.3.73.8.74.29.90.60',
        'XBI:300.12.31.5.49.1.82.54',
        'XRT:244.47.80.17.48.36.62.120',
        'KRE:299.27.31.4.230.23.94.60',
        'GDX:274.4.71.18.100.36.191.81'
      ]
    );

    for (const book of b5.books) {
      const params = paramsOfGrid(book.symbol, book.grid);

      assert.deepEqual(gridOfParams(book.symbol, params), book.grid);
    }
  });

  test('shallow band: [max(3.0%, 0.15σ), min(0.45σ, 15.0%)], ≤ 0.6 × B5 X, empty when narrower than 1.0 pp', () => {
    assert.deepEqual(shallowBand(0.2), { lo: 30, hi: 90, empty: false, reason: '' });
    assert.equal(shallowBand(0.2, 140).hi, 84);
    assert.equal(shallowBand(0.5).hi, 150);
    assert.equal(shallowBand(0.05).empty, true); // a bond-like ETF: 0.45σ = 2.25% < 3.0%
    assert.equal(deepBroadBand(0.3, 0.75).lo, 225);
    assert.equal(deepBroadBand(0.5, 0.75).empty, true);
  });

  test('the 4D-B neighbourhood always contains the incumbent', () => {
    const incumbent = {
      targetPercentChange: 274,
      trailingBuyPercentage: 4,
      trailingStopPercentage: 71,
      maximumHoldDays: 18,
      tickWindowSize: 100,
      intradayLossBuffer: 36,
      pullback: 191,
      continuationWindow: 81
    };

    assert.ok(inBounds(incumbent, neighbourhoodBounds(incumbent, 0.3, 1.0))); // even when ρσ exceeds X0
  });

  test('every generated, mutated and perturbed vector stays on the 0.1-pp grid inside its band', () => {
    const bounds = shallowBounds(shallowBand(0.25));
    const rng = new Rng([1, 2, 3, 4]);
    const grids = [
      ...sobolGrids('test', 'VGT', 256, bounds),
      ...Array.from({ length: 256 }, () => randomGrid(rng, bounds))
    ];

    for (const grid of grids) {
      for (const candidate of [grid, mutateGrid(grid, rng, bounds, 3, 3), perturbGrid(grid, rng, bounds)]) {
        assert.ok(inBounds(candidate, bounds), gridKey(candidate));
      }
    }

    assert.equal(new Set(sobolGrids('test', 'VGT', 256, bounds).map(gridKey)).size, 256);
  });
});
