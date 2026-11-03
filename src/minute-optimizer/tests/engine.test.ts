// Leakage, cutoffs, costs, quantization, determinism and isolation checks on the real minute data (research
// period only) and on synthetic fixtures.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import { type MinuteParams, incumbentParams, tenthsToFraction } from '../../app/allIn-minute-optimizable.ts';
import { candidateId, genomeToParams, gridSize, paramsToGenome } from '../../optimizer/params.ts';
import { defaultSearch, explorationGenomes } from '../../optimizer/search.ts';
import {
  type MinuteDataset,
  assertResearchView,
  buildDataset,
  defaultDataFile,
  firstIndexOnOrAfter,
  lastIndexOnOrBefore,
  loadSessions,
  researchDataset,
  unlockedDataset
} from '../data.ts';
import { type EvalWindow, computeReferenceHighs, defaultSettings, simulate } from '../engine.ts';
import { evaluateCandidate, summarize } from '../evaluate.ts';
import { defaultExperiment, resultsRoot, runTraining, windowInfo } from '../experiment.ts';
import { goldenVectors } from '../goldenMaster.ts';
import { minuteParameterSpace } from '../params.ts';
import { LocalEvaluator, WorkerPool } from '../pool.ts';
import { ReferenceHighCache } from '../engine.ts';

let sessions: MarketSession[];
let dataset: MinuteDataset;

before(async () => {
  sessions = (await loadSessions(defaultDataFile)).filter((session) => session.date <= '2023-12-31');
  dataset = researchDataset(sessions, 'test-hash', '2023-12-31');
});

const window = (ds: MinuteDataset, start: string, end: string, warmup = true): EvalWindow => {
  const startIndex = firstIndexOnOrAfter(ds, start);

  return { historyStart: warmup ? 0 : startIndex, startIndex, endIndex: lastIndexOnOrBefore(ds, end) };
};

const run = (ds: MinuteDataset, params: MinuteParams, evalWindow: EvalWindow) =>
  simulate(
    ds,
    computeReferenceHighs(ds.sHigh, params.lookbackSessions, evalWindow.historyStart),
    params,
    evalWindow,
    defaultSettings,
    true
  );

describe('no look-ahead', () => {
  test('changing every session after a window leaves the window unchanged', () => {
    const shorter = buildDataset(
      sessions.filter((session) => session.date <= '2019-12-31'),
      'VGT',
      'test-hash'
    );

    for (const params of [incumbentParams, ...goldenVectors(3, 5)]) {
      const a = summarize(run(dataset, params, window(dataset, '2016-10-07', '2019-12-31')));
      const b = summarize(run(shorter, params, window(shorter, '2016-10-07', '2019-12-31')));

      assert.deepEqual(a, b);
    }
  });

  test('the decision price is the 15:58 minute close (12:58 on early closes); later minutes never enter it', () => {
    for (let index = 0; index < dataset.sessionCount; index += 37) {
      const session = sessions[index]!;
      const decisionTime = session.closeTime - 60;
      const last = session.bars.filter((bar) => bar.time + 60 <= decisionTime).at(-1);

      assert.equal(dataset.decisionPrice[index], last?.close ?? NaN);
      assert.ok(!last || last.time <= session.closeTime - 120);
    }
  });

  test('a session never enters its own reference high', () => {
    const high = Float64Array.from(dataset.sHigh);
    const before = computeReferenceHighs(high, 78, 0);

    high[500] = 1e9;

    const after = computeReferenceHighs(high, 78, 0);

    assert.equal(after[500], before[500]);
    assert.equal(after[501], 1e9);
    assert.equal(after[578], 1e9);
    assert.equal(after[579], before[579]);
  });

  test('reference highs never reach back before the history start', () => {
    const highs = computeReferenceHighs(dataset.sHigh, 250, 100);

    assert.equal(highs[100], -Infinity);
    assert.equal(highs[101], dataset.sHigh[100]);
  });
});

describe('cutoffs and boundaries', () => {
  test('an open position at the cutoff is marked at the last close with interest through that session', () => {
    const evalWindow = window(dataset, '2016-10-07', '2019-12-31');

    for (const params of [incumbentParams, ...goldenVectors(11, 30)]) {
      const result = run(dataset, params, evalWindow);
      const open = result.trades.find((trade) => trade.reason === 'open');

      if (!open) {
        continue;
      }

      const lastTime = dataset.sTime[evalWindow.endIndex]!;
      const entryTime = dataset.sTime[open.entryIndex]!;
      const interest = 100000 * 0.11 * ((lastTime - entryTime) / (365 * 86400));

      assert.equal(open.interest, interest);
      assert.equal(open.profit, open.shares * dataset.sClose[evalWindow.endIndex]! - 100000 - interest);
      assert.equal(result.netProfit, result.realizedProfit + open.profit);

      return;
    }

    assert.fail('no vector ended with an open position');
  });

  test('a window starts flat: earlier sessions only provide reference-high history', () => {
    const fold = window(dataset, '2020-01-01', '2020-12-31');
    const result = run(dataset, incumbentParams, fold);

    assert.ok(result.trades.every((trade) => trade.entryIndex >= fold.startIndex));
    // History deeper than the lookback is irrelevant.
    const trimmed = { ...fold, historyStart: fold.startIndex - incumbentParams.lookbackSessions };

    assert.deepEqual(summarize(run(dataset, incumbentParams, trimmed)), summarize(result));
  });

  test('the research view ends at 2023-12-31 and full data needs the final-evaluation capability', () => {
    assert.equal(dataset.lastDate <= '2023-12-31', true);
    assert.doesNotThrow(() => assertResearchView(dataset, '2023-12-31'));
    assert.throws(() => assertResearchView(buildDataset(sessions, 'VGT', 'x'), '2023-12-31'));
    assert.throws(() => unlockedDataset(sessions, 'x', {}));
  });

  test('every fold trains strictly before it validates', () => {
    for (const fold of defaultExperiment().protocol.folds) {
      const train = windowInfo(dataset, fold.train);
      const validation = windowInfo(dataset, fold.validation);

      assert.ok(train.endIndex < validation.startIndex);
      assert.equal(train.firstDate, '2016-10-07');
    }
  });

  test('results go to their own directory, never to the daily study', () => {
    assert.ok(resultsRoot('main').startsWith('research/vgt-minute-optimizer/'));
  });
});

describe('extra execution costs', () => {
  test('the zero-cost level is the cost-free result, and costs never change a decision', () => {
    for (const params of [incumbentParams, ...goldenVectors(5, 20)]) {
      const evalWindow = window(dataset, '2016-10-07', '2023-12-31');
      const free = simulate(
        dataset,
        computeReferenceHighs(dataset.sHigh, params.lookbackSessions, 0),
        params,
        evalWindow,
        { stopFill: 'stop', costBps: [] }
      );
      const costed = run(dataset, params, evalWindow);
      const metrics = summarize(costed);

      assert.equal(costed.levels[0]!.netProfit, costed.netProfit);
      assert.equal(costed.levels[0]!.minuteMaximumDrawdown, costed.minuteMaximumDrawdown);
      assert.equal(summarize(free).signature, metrics.signature);
      assert.equal(free.netProfit, costed.netProfit);

      for (const level of costed.levels) {
        const rate = level.bps / 10000;

        assert.ok(Math.abs(level.costs - rate * costed.turnover) < 1e-6);
        assert.ok(Math.abs(level.netProfit - (costed.netProfit - rate * costed.turnover)) < 1e-6);
      }
    }
  });
});

describe('quantization and identity', () => {
  test('percentage genes are whole tenths of a percentage point and convert to the literal double', () => {
    assert.equal(tenthsToFraction(25), 0.025);
    assert.equal(tenthsToFraction(21), 0.021);
    assert.equal(tenthsToFraction(367), 0.367);

    const { genomes } = explorationGenomes(minuteParameterSpace, { ...defaultSearch, samples: 512 }, ['quantization']);

    for (const genome of genomes) {
      const params = genomeToParams(minuteParameterSpace, genome);

      minuteParameterSpace.specs.forEach((spec) => {
        const value = params[spec.key];

        assert.ok(Number.isInteger(value), `${spec.key}=${value}`);
        assert.ok(value >= spec.min && value <= spec.max);
      });
      assert.deepEqual(paramsToGenome(minuteParameterSpace, params), genome);
    }

    assert.throws(() => paramsToGenome(minuteParameterSpace, { ...incumbentParams, dipTenths: 25.4 }));
    assert.deepEqual(
      minuteParameterSpace.specs.map((spec) => gridSize(spec)),
      [246, 196, 60, 241, 101, 151, 1001]
    );
  });

  test('candidate IDs are canonical and the Sobol stream is reproducible', () => {
    const a = explorationGenomes(minuteParameterSpace, { ...defaultSearch, samples: 256 }, ['ids']);
    const b = explorationGenomes(minuteParameterSpace, { ...defaultSearch, samples: 256 }, ['ids']);

    assert.deepEqual(a.genomes, b.genomes);
    assert.equal(new Set(a.genomes.map((genome) => genome.join(','))).size, 256);
    assert.equal(
      candidateId(minuteParameterSpace, incumbentParams),
      candidateId(minuteParameterSpace, { ...incumbentParams })
    );
  });
});

describe('determinism', () => {
  const tmp = 'research/vgt-minute-optimizer/tmp/determinism';

  after(async () => {
    await fs.remove(`research/vgt-minute-optimizer/results/__determinism`);
    await fs.remove(tmp);
  });

  test('evaluations are identical in-process and with 1 or 3 workers', async () => {
    const params = goldenVectors(9, 40);
    const evalWindow = window(dataset, '2016-10-07', '2019-12-31');
    const local = new LocalEvaluator();
    const highs = new ReferenceHighCache(dataset.sHigh);
    const expected = params.map((candidate) =>
      evaluateCandidate(dataset, highs, candidate, evalWindow, defaultSettings)
    );

    local.register(dataset);
    assert.deepEqual(await local.evaluate(dataset.id, evalWindow, defaultSettings, params), expected);

    for (const size of [1, 3]) {
      const pool = new WorkerPool({ size, chunkSize: 7 });

      pool.register(dataset);

      try {
        assert.deepEqual(await pool.evaluate(dataset.id, evalWindow, defaultSettings, params), expected);
      } finally {
        await pool.close();
      }
    }
  });

  test('a small training run is identical whatever the evaluator', async () => {
    const config = defaultExperiment({
      id: '__determinism',
      search: {
        ...defaultSearch,
        samples: 64,
        populationSize: 8,
        generations: 2,
        gaRuns: 1,
        maxEvaluationsPerGaRun: 50
      },
      selection: { ...defaultExperiment().selection, topN: 5, poolByNet: 8, maxPool: 16, perturbations: 4 }
    });
    const records = [];

    for (const evaluator of [new LocalEvaluator(), new WorkerPool({ size: 2, chunkSize: 5 })]) {
      evaluator.register(dataset);
      await fs.remove(resultsRoot(config.id));

      try {
        records.push(
          await runTraining(
            { config, dataset, sessions, evaluator, codeHash: 'test', log: () => {} },
            'fold-2020',
            'fold',
            config.protocol.folds[0]!.train,
            config.search,
            [config.seed, 'VGT', 'fold-2020']
          )
        );
      } finally {
        await evaluator.close();
      }
    }

    assert.deepEqual(records[0], records[1]);
  });
});
