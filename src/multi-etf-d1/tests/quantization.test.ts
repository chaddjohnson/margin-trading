// Every candidate the search can produce is an integer vector inside the box: the Sobol design, crossover and
// mutation children, and the plateau probes. Percentages are whole tenths of a point, durations whole numbers.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { specs } from '../../d1-refinement/families.ts';
import { polynomialMutation, sbx } from '../../optimizer/nsga2.ts';
import { Rng } from '../../optimizer/rng.ts';
import {
  box,
  d1Params,
  genomeToParams,
  idOf,
  inBox,
  operatorSpace,
  paramsToGenome,
  probeParams,
  sobolDesign
} from '../space.ts';

describe('quantization', () => {
  test('the Sobol design is unique, in the box and on the integer grid', () => {
    const { genomes, summary } = sobolDesign('TEST', 512);
    const ids = new Set<string>();

    assert.equal(genomes.length, 512);
    assert.equal(summary.unique, 512);

    for (const genome of genomes) {
      const params = genomeToParams(genome);

      assert.ok(inBox(params));

      for (const spec of box) {
        assert.ok(Number.isInteger(params[spec.key]));
      }

      ids.add(idOf(params));
    }

    assert.equal(ids.size, 512, 'IDs are unique');
  });

  test('the design is deterministic per ticker and differs between tickers', () => {
    const a = sobolDesign('XBI', 64).genomes.map((genome) => genome.join(','));
    const b = sobolDesign('XBI', 64).genomes.map((genome) => genome.join(','));
    const c = sobolDesign('XLE', 64).genomes.map((genome) => genome.join(','));

    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
  });

  test('crossover and mutation children stay on the grid inside the box', () => {
    const rng = Rng.from('multi-etf-d1', 'quantization-test');
    const { genomes } = sobolDesign('TEST', 32);
    const variation = { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 };

    for (let index = 0; index < 200; index++) {
      const a = genomes[rng.int(genomes.length)]!;
      const b = genomes[rng.int(genomes.length)]!;
      const { children } = sbx(operatorSpace, a, b, rng, variation);

      for (const child of children) {
        const mutated = polynomialMutation(operatorSpace, child, rng, variation);

        assert.ok(inBox(genomeToParams(mutated.genome)));
      }
    }
  });

  test('D1 is inside the box and round-trips through the genome', () => {
    const params = d1Params();

    assert.ok(inBox(params));
    assert.deepEqual(genomeToParams(paramsToGenome(params)), params);
    assert.equal(params.targetPercentChange, 216);
    assert.equal(params.trailingBuyPercentage, 3);
    assert.equal(params.trailingStopPercentage, 73);
    assert.equal(params.maximumHoldDays, 8);
    assert.equal(params.tickWindowSize, 74);
    assert.equal(params.intradayLossBuffer, 29);
    assert.equal(params.pullback, 90);
    assert.equal(params.continuationWindow, 60);
  });

  test('probes stay inside the box and never repeat the candidate', () => {
    for (const params of [
      d1Params(),
      genomeToParams(box.map(() => 0)),
      genomeToParams(box.map((spec) => spec.max - spec.min))
    ]) {
      for (const probe of probeParams(params)) {
        assert.ok(inBox(probe.params));
        assert.notEqual(idOf(probe.params), idOf(params));
      }
    }
  });

  test('the box lies inside the engine grid', () => {
    for (const spec of box) {
      assert.ok(spec.min >= specs[spec.key].min && spec.max <= specs[spec.key].max, spec.key);
    }
  });
});
