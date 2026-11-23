// OFF parity with Growth 1.4.0 (real data; skipped without the git-ignored data/ files, or when a data file no longer
// has the hash it had at capture). The fixture tests/fixtures/baseline-1.4.0.json was captured ONCE from the unedited
// rise-from-recent-low-trading@1.4.0 engine at commit 3aa51963 (tools/capture-baseline-1.4.0.ts), before Growth engine
// revision 1.5.0 (the optional staged trailing stop, research/vg-l0-staged-stop/RULE_SPECIFICATION.md) existed: eight
// development-window cases, among them the Growth·VGT books of New L0 and N/original and the Drawdown Recovery Gate with
// every exit rule. With the staged stop absent the current engine must reproduce every
// case EXACTLY: raw signals and dispositions, every trade field, excursions, both drawdowns, every daily mark, the
// continuation outcomes and episodes, the complete decision log, the minute-mark change points, the full metrics and the
// records kept outside the log (gated decisions, opportunities, renewal watches, block counts, the optional rules'
// positions and fills, the breakout scan).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../../four-family/data.ts';
import { exactJson } from '../tools/capture-baseline.ts';
import type { BaselineCase11 } from '../tools/capture-baseline-1.1.0.ts';
import { recordCase13 } from '../tools/capture-baseline-1.3.0.ts';
import { STRATEGY_VERSION, warmupSessionsForParams } from '../riseTrading.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/baseline-1.4.0.json', import.meta.url), 'utf8'));
const parse = (text: string) =>
  JSON.parse(text, (_key, v: unknown) =>
    v === 'NaN' ? NaN : v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v
  );

describe('Growth engine revision 1.5.0 with the staged trailing stop OFF = the 1.4.0 baseline (captured before the change)', () => {
  test('the fixture is the before-change capture of 1.4.0; the Strategy Lab version is unchanged', () => {
    assert.equal(fixture.strategy.version, '1.4.0');
    assert.equal(STRATEGY_VERSION, '1.4.0'); // the staged stop is an engine option, not a Strategy Lab parameter
    assert.equal(fixture.commit, '3aa519636574904605d9315cd3df060e561a1521');
    assert.equal(fixture.engineDirty, '');
    assert.equal(fixture.cases.length, 8);
    assert.ok(fixture.cases.some((c: BaselineCase11) => c.id === 'new-l0-growth-vgt'));
    assert.ok(fixture.cases.some((c: BaselineCase11) => c.params.drawdownGate && c.params.retention));
  });

  for (const expected of fixture.cases as (BaselineCase11 & Record<string, any>)[]) {
    const dataFile = `${root}data/${expected.symbol}/data.csv`;

    test(`${expected.id}: identical signals, trades, gates, rules, decision log, marks and metrics`, async (t) => {
      if (!existsSync(dataFile)) return t.skip('no local data');
      if ((await sha256File(dataFile)) !== expected.dataSha256)
        return t.skip('the data file changed since the capture');

      // the staged stop is a simulation option (absent here: runRiseTrading never sets it); the explicit-null path is
      // tested at Priority 3's book runner (src/d1-risk-controls-rc3/tests/pooled.test.ts)
      for (const params of [expected.params]) {
        assert.equal(warmupSessionsForParams(params), expected.warmupSessions);

        const actual = parse(exactJson(await recordCase13({ ...expected, params })));
        const want = parse(exactJson(expected));

        assert.deepEqual(
          [actual.dataSha256, actual.loadedSessions, actual.warmup, actual.firstSignalBar, actual.bars],
          [want.dataSha256, want.loadedSessions, want.warmup, want.firstSignalBar, want.bars]
        );
        assert.deepEqual(actual.counts, want.counts);
        assert.deepEqual(actual.extraCounts, want.extraCounts);
        assert.deepEqual(actual.signals, want.signals);
        assert.deepEqual(actual.trades, want.trades);
        assert.deepEqual(actual.excursions, want.excursions);
        assert.deepEqual(actual.continuationOutcomes, want.continuationOutcomes);
        assert.deepEqual(actual.episodes, want.episodes);
        assert.deepEqual(actual.minuteDrawdown, want.minuteDrawdown);
        assert.deepEqual(actual.dailyDrawdown, want.dailyDrawdown);
        assert.equal(actual.realized, want.realized);
        assert.deepEqual(actual.lastDaily, want.lastDaily);
        assert.deepEqual(actual.metrics, want.metrics);
        assert.deepEqual(actual.hashes, want.hashes);
        assert.deepEqual(actual.extraHashes, want.extraHashes);
      }
    });
  }
});
