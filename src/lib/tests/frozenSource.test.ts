// The strategy-definition check across the 2026-10-24 drawdown report edit: the D1 file pinned by the multi-ETF
// allocator is still its pinned definition plus the documented dataset plumbing and report text, the report edit is
// exact (once, and only on the old lines).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { checkStrategyDefinition, gitFileAt, withDatasetPlumbing, withDrawdownReporting } from '#lib';
import { d1Source, expectedHashes, pinnedRevisions } from '../../multi-etf-allocator/context.ts';

describe('the strategy-definition check', () => {
  test('D1 is its pinned definition plus the dataset plumbing and the drawdown report', async () => {
    const check = await checkStrategyDefinition(d1Source, expectedHashes.d1Source, pinnedRevisions.d1Source);

    assert.equal(check.status, 'dataset plumbing and drawdown reporting only');
    assert.equal(
      withDrawdownReporting(withDatasetPlumbing(gitFileAt(pinnedRevisions.d1Source, d1Source))),
      await fs.readFile(d1Source, 'utf8')
    );
  });

  test('the report edit rewrites only the three drawdown lines, exactly once', async () => {
    const pinned = withDatasetPlumbing(gitFileAt(pinnedRevisions.d1Source, d1Source));
    const edited = withDrawdownReporting(pinned);
    const before = pinned.split('\n');
    const after = edited.split('\n');
    const changed = before.flatMap((line, index) => (line === after[index] ? [] : [index]));

    assert.equal(before.length, after.length);
    assert.equal(changed.length, 3, 'three template lines');
    assert.ok(changed.every((index) => /Maximum drawdown|Drawdowns:/.test(after[index]!)));
    assert.match(edited, /Maximum drawdown \(daily\): .* of \$\{formatDollars\(investmentAmount\)\} allocation\)/);
    assert.match(edited, /Maximum drawdown \(minute\): .*minuteDrawdown\.maximumDrawdown \/ investmentAmount/);
    assert.throws(() => withDrawdownReporting(edited), /expected exactly one drawdown report, found 0/);
  });
});
