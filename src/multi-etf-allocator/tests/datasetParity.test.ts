// Historical parity of the --dataset path: `portfolio --policy shadow --config all-lowDd --dataset all --end
// 2025-10-13` (canonical files, the extended distribution ledger, split adjustment) equals the frozen protocol run of
// C-all-lowDd-shadow (archived files, the frozen ledger) at every daily close, lot and dividend, and reproduces the
// committed research figures. Skipped without the data.
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { combinationOf, files, protocol } from '../context.ts';
import { loadUniverse } from '../data.ts';
import { datasetRunConfig, loadDatasetUniverse, warmupSessionsOf } from '../dataset.ts';
import { runAllocator } from '../engine.ts';
import { summarize } from '../metrics.ts';
import { allocatorConfig } from '../scenarios.ts';

const missing = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'].some(
  (symbol) => !fs.existsSync(`data/${symbol}/data.csv`) || !fs.existsSync(files.minute(symbol))
)
  ? 'the canonical files or the legacy archive are not present'
  : false;

describe('the --dataset path against the frozen protocol', { skip: missing }, () => {
  test('all-lowDd shadow portfolio through 2025-10-13: identical to the frozen run and its committed figures', async () => {
    const base = await allocatorConfig('portfolio', combinationOf('all-lowDd'), 'shadow');
    const members = ['VOOG', ...base.symbols] as const;
    const frozen = runAllocator(await loadUniverse({ members, end: protocol.commonEnd }), base);
    const loaded = await loadDatasetUniverse({
      members,
      partition: 'all',
      endDate: protocol.commonEnd,
      warmupSessions: warmupSessionsOf(base),
      mode: 'portfolio'
    });
    const evaluation = runAllocator(loaded.universe, datasetRunConfig(base, loaded));
    const committed = (
      await fs.readJson('research/multi-etf-allocator/results/runs/principal/C-all-lowDd-shadow/summary.json')
    ).summary;
    // Everything but the run's key and label.
    const comparable = (run: typeof evaluation) =>
      Object.fromEntries(
        Object.entries(summarize(run) as unknown as Record<string, unknown>).filter(
          ([name]) => name !== 'key' && name !== 'label'
        )
      );
    const summary = comparable(evaluation);
    const frozenSummary = comparable(frozen);

    assert.equal(loaded.universe.end, '2025-10-13');
    assert.equal(loaded.splits.length, 0, 'no split before 2025-10-13');
    assert.deepEqual(summary, frozenSummary);
    assert.ok(isDeepStrictEqual(evaluation.daily, frozen.daily), 'every daily close');
    assert.ok(isDeepStrictEqual(evaluation.dividends, frozen.dividends), 'every dividend');
    assert.deepEqual(
      evaluation.lots.map((lot) => [lot.symbol, lot.entryTime, lot.exitTime, lot.shares, lot.net]),
      frozen.lots.map((lot) => [lot.symbol, lot.entryTime, lot.exitTime, lot.shares, lot.net])
    );
    assert.equal(summary.net, committed.net);
    assert.equal(summary.endEquity, committed.endEquity);
    assert.equal(summary.fundedLots, committed.fundedLots);
  });
});
