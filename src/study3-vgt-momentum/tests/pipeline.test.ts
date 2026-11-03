// A synthetic dry run of the outcome stages' computations (develop → evaluate → diagnostics → robustness →
// analysis) under a scratch root with small search sizes, so that the frozen code is exercised end to end before any
// market data is used. Nothing here reads market data or writes a study record.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

process.env.STUDY3_ROOT = path.join(os.tmpdir(), `study3-dry-run-${process.pid}`);

const { histories, folds } = await import('../context.ts');
const { setTestLimits } = await import('../search.ts');
const stages = await import('../stages.ts');
const { datasetOf, randomWalk } = await import('./fixtures.ts');
const { weekdays } = await import('./fixtures.ts');

test('the outcome stages run end to end on a synthetic history', () => {
  setTestLimits({ global: 32, localSeeds: 2, localPerSeed: 4, shortlist: 4 });
  stages.setTestDraws({ joint: 4, placebo: 5 });

  const dates = weekdays(2200);
  const last = dates.indexOf('2023-12-29');
  const specs = randomWalk(4242, last + 1, { vol: 0.016, drift: 0.0008 });
  const upTo = (date: string) => datasetOf(specs.slice(0, dates.indexOf(date) + 1));
  const selections: Record<string, ReturnType<typeof stages.developCore>['payloads']['selection']> = {};
  const evaluations: { history: 'A' | 'B' | 'C' | 'D' | 'H'; used: number; planned: number }[] = [];

  for (const key of ['A', 'B', 'C', 'D', 'H'] as const) {
    const core = stages.developCore(upTo(histories[key].developmentEnd), key);

    selections[key] = core.payloads.selection;
    evaluations.push({ history: key, used: core.summary.used, planned: core.summary.planned });
    assert.ok(core.summary.used <= core.summary.planned, `${key} used ≤ planned`);
    assert.equal(core.summary.gates.length, 12);
  }

  const evals = folds.map((fold) => {
    const core = stages.evaluateCore(upTo(histories[fold].window!.end), fold, selections[fold] as never, null);

    assert.ok(
      core.summary.checks.every((check) => check.equal),
      `${fold} b-mark checks`
    );
    return core.summary as unknown as import('../stages.ts').EvaluateSummary;
  });
  const h = upTo('2023-12-29');
  const diagnostics = stages.diagnosticsCore(h);

  assert.ok(diagnostics.summary.configs > 50);

  const robustness = stages.robustnessCore(h, selections.H as never, selections.D as never);

  for (const finalist of robustness.summary.finalists) {
    assert.equal(finalist.parityDifferences, 0, `${finalist.id} full-history parity`);
  }

  assert.ok(robustness.summary.controlParity.every((row) => row.differences === 0));

  const analysis = stages.analysisCore(h, {
    evals,
    finalists: robustness.payloads.finalists as never,
    controls: robustness.payloads.controls as never,
    hSel: selections.H as never,
    dSel: selections.D as never,
    d1Trades: [],
    evaluations
  });

  assert.equal(typeof analysis.summary.label, 'string');
  assert.ok(Number.isFinite(analysis.summary.rubric.sum));
  assert.ok(analysis.payloads.ledgers.legs.length >= 0);
});
