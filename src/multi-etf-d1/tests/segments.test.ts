// A training window is a prefix segment of the continuous development run: its net, drawdowns and counts must equal
// those of a run truncated at the segment's end (the engine is causal; the accounting carries nothing across a
// segment start). Checked on random synthetic scenarios and, when the data is present, on a real development view.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import { randomScenario } from '../../four-family/tests/fixtures.ts';
import type { EvalSpec } from '../../d1-refinement/evaluate.ts';
import type { IntParams } from '../../d1-refinement/families.ts';
import { Rng } from '../../optimizer/rng.ts';
import { protocol } from '../context.ts';
import { loadDevelopment } from '../data.ts';
import { cachesFor, developmentSpec, evaluateOne } from '../evaluation.ts';
import { box, d1Params, genomeToParams, gridSizeOf } from '../space.ts';

const near = (a: number, b: number, label: string) =>
  assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)), `${label}: ${a} vs ${b}`);

const truncatedSpec = (armStart: number, endIndex: number): EvalSpec => ({
  label: 'truncated',
  stopFill: protocol.stopFill,
  marginInterestRate: protocol.marginInterestRate,
  armStart,
  endIndex,
  segments: [{ label: 'main', start: armStart, end: endIndex }]
});

const comparePrefix = (ds: Dataset, params: IntParams, armStart: number, ends: number[]) => {
  const caches = cachesFor(ds);
  const full: EvalSpec = {
    label: 'full',
    stopFill: protocol.stopFill,
    marginInterestRate: protocol.marginInterestRate,
    armStart,
    endIndex: ds.sessionCount - 1,
    segments: [
      { label: 'main', start: armStart, end: ds.sessionCount - 1 },
      ...ends.map((end) => ({ label: `prefix:${end}`, start: armStart, end }))
    ]
  };
  const continuous = evaluateOne(ds, caches, params, full);

  for (const end of ends) {
    const segment = continuous.metrics.segments.find((candidate) => candidate.label === `prefix:${end}`)!;
    const truncated = evaluateOne(ds, caches, params, truncatedSpec(armStart, end)).metrics;

    near(segment.net, truncated.net, `net through ${end}`);
    near(segment.minuteDrawdown, truncated.minuteDrawdown, `minute DD through ${end}`);
    near(segment.dailyDrawdown, truncated.dailyDrawdown, `daily DD through ${end}`);
    assert.equal(segment.entries, truncated.entries, `entries through ${end}`);
    assert.equal(segment.exits, truncated.closedTrades, `exits through ${end}`);
    assert.equal(segment.wins, truncated.wins, `wins through ${end}`);
    assert.equal(segment.losses, truncated.losses, `losses through ${end}`);
    near(segment.interest, truncated.interest, `interest through ${end}`);
  }
};

describe('prefix segments equal truncated runs', () => {
  test('on random synthetic scenarios with random in-box parameters', () => {
    const rng = Rng.from('multi-etf-d1', 'segments-test');

    for (let index = 0; index < 12; index++) {
      const sessions = randomScenario(`multi-etf-d1-segments-${index}`, 120 + rng.int(60));
      const ds = fixtureDataset(sessions);
      const params = genomeToParams(box.map((spec) => rng.int(gridSizeOf(spec))));

      // Small lookbacks and windows so that the short scenarios trade.
      params.tickWindowSize = 20 + rng.int(10);
      params.continuationWindow = 10 + rng.int(20);
      params.targetPercentChange = 80 + rng.int(60);

      const armStart = params.tickWindowSize + 2;
      const ends = [Math.floor(ds.sessionCount * 0.4), Math.floor(ds.sessionCount * 0.7), ds.sessionCount - 1];

      comparePrefix(ds, params, armStart, ends);
    }
  });

  test('on the XLF development view with D1 and two random vectors (skipped without the data)', async () => {
    if (
      !(await fs.pathExists(protocol.dataFile('XLF'))) ||
      !(await fs.pathExists('research/multi-etf-d1/results/audit/hashes.json'))
    ) {
      return;
    }

    const data = await loadDevelopment('XLF');
    const spec = developmentSpec(data);
    const rng = Rng.from('multi-etf-d1', 'segments-test', 'xlf');
    const ends = spec.segments.filter((segment) => segment.label.startsWith('train:')).map((segment) => segment.end);

    assert.equal(data.ds.lastDate <= protocol.developmentEnd, true, 'the development view ends in 2023');
    assert.equal(data.ds.dates[data.eligibility], protocol.eligibilityDate);

    for (const params of [
      d1Params(),
      genomeToParams(box.map((spec) => rng.int(gridSizeOf(spec)))),
      genomeToParams(box.map((spec) => rng.int(gridSizeOf(spec))))
    ]) {
      comparePrefix(data.ds, params, data.eligibility, ends);
    }
  });
});
