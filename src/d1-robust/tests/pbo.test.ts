// The descriptive PBO (CSCV): pure noise gives a PBO near one half; a configuration that is better in every period
// gives a PBO of zero.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Rng } from '../../optimizer/rng.ts';
import { blocksOf, pboOf } from '../pbo.ts';

describe('PBO by combinatorially symmetric cross-validation', () => {
  test('blocks cover the periods contiguously', () => {
    const blocks = blocksOf(27, 8);

    assert.equal(blocks.length, 8);
    assert.deepEqual(
      blocks.flat(),
      Array.from({ length: 27 }, (_, i) => i)
    );
  });

  test('noise is near one half, a dominant configuration is zero', () => {
    const rng = Rng.from('test', 'pbo');
    const noise = Array.from({ length: 200 }, () => Array.from({ length: 24 }, () => rng.next() - 0.5));
    const result = pboOf(noise, 8);

    assert.ok(result.pbo > 0.3 && result.pbo < 0.7, `noise PBO ${result.pbo}`);
    assert.equal(result.splits, 70);

    const dominant = noise.map((row, c) => (c === 7 ? row.map((value) => value + 10) : row));

    assert.equal(pboOf(dominant, 8).pbo, 0);
  });
});
