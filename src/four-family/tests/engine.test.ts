// Real-data invariants (research view only): physical truncation, worker count, and lattice exactness.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { MarketSession } from '#types';
import { Rng } from '../../optimizer/rng.ts';
import { protocol, trainingSpec } from '../context.ts';
import { type Dataset, ReferenceHighCache, defaultDataFile, loadSessions, researchDataset } from '../data.ts';
import { evaluateCandidate } from '../evaluate.ts';
import {
  type IntParams,
  families,
  familyKeys,
  familySpecs,
  genomeToParams,
  gridSize,
  paramsToGenome,
  specs,
  toStrategyParams
} from '../families.ts';
import { LocalEvaluator, WorkerPool } from '../pool.ts';

let sessions: MarketSession[];
let ds: Dataset;

before(async () => {
  sessions = (await loadSessions(defaultDataFile)).filter((session) => session.date <= protocol.researchEnd);
  ds = researchDataset(sessions, 'test', protocol.researchEnd);
});

const randomParams = (rng: Rng, familyKey: (typeof familyKeys)[number]): IntParams => {
  const family = families[familyKey];

  return genomeToParams(
    family,
    familySpecs(family).map((spec) => rng.int(gridSize(spec)))
  );
};

describe('no lookahead through the data', () => {
  test('a run ending at the fold end equals the same run on data physically truncated there', () => {
    const truncated = researchDataset(
      sessions.filter((session) => session.date <= '2019-12-31'),
      'test',
      '2019-12-31'
    );
    const rng = Rng.from('truncation');
    const longSpec = trainingSpec(ds, 'fold1');
    const shortSpec = trainingSpec(truncated, 'fold1');

    assert.equal(longSpec.endIndex, shortSpec.endIndex);

    for (const familyKey of familyKeys) {
      for (let index = 0; index < 8; index++) {
        const params = randomParams(rng, familyKey);
        const long = evaluateCandidate(ds, new ReferenceHighCache(ds), familyKey, params, longSpec).metrics;
        const short = evaluateCandidate(
          truncated,
          new ReferenceHighCache(truncated),
          familyKey,
          params,
          shortSpec
        ).metrics;

        assert.deepEqual(long, short);
      }
    }
  });
});

describe('worker threads', () => {
  const pool = new WorkerPool({ size: 3, chunkSize: 5 });

  after(async () => {
    await pool.close();
  });

  test('results do not depend on the worker count', async () => {
    const local = new LocalEvaluator();
    const rng = Rng.from('workers');

    local.register(ds);
    pool.register(ds);

    for (const familyKey of familyKeys) {
      const params = Array.from({ length: 23 }, () => randomParams(rng, familyKey));
      const spec = trainingSpec(ds, 'final');

      assert.deepEqual(
        await pool.evaluate(ds.id, familyKey, spec, params),
        await local.evaluate(ds.id, familyKey, spec, params)
      );
    }
  });
});

describe('quantization', () => {
  test('every lattice percentage reaches the engine as the double of its decimal literal', () => {
    for (const spec of Object.values(specs)) {
      if (spec.unit !== 'tenths of a percentage point') {
        continue;
      }

      for (let value = spec.min; value <= spec.max; value++) {
        const literal = Number(`${Math.floor(value / 1000)}.${String(value % 1000).padStart(3, '0')}`);

        assert.equal(value / 1000, literal);
      }
    }
  });

  test('genomes and parameters round-trip, and the defaults sit on the lattice', () => {
    const rng = Rng.from('roundtrip');

    for (const familyKey of familyKeys) {
      const family = families[familyKey];

      for (let index = 0; index < 50; index++) {
        const params = randomParams(rng, familyKey);

        assert.deepEqual(genomeToParams(family, paramsToGenome(family, params)), params);
      }

      const strategy = toStrategyParams(family, {
        ...genomeToParams(family, paramsToGenome(family, randomParams(rng, familyKey)))
      });

      assert.equal(Number.isNaN(strategy.materialLossThreshold), !family.flags.restricted);
      assert.equal(Number.isNaN(strategy.intradayLossBuffer), !family.flags.buffered);
    }
  });
});
