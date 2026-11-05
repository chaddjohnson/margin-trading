// OFF parity with Growth 1.2.0 (real data; skipped without the git-ignored data/ files, or when a data file no longer
// has the hash it had at capture). The fixture tests/fixtures/baseline-1.2.0.json was captured ONCE from
// rise-from-recent-low-trading@1.2.0 at commit 8d2800e, before any v1.3.0 code existed (tools/capture-baseline-1.2.0.ts):
// nine cases — every trend method, every eligibility policy and every continuation method ON at least once, the hold
// and the buffer OFF, daily, 60- and 15-minute bars, and Candidate A (the research control). With the initial risk stop,
// the trend-breakout entry and trend retention OFF the current engine must reproduce every case EXACTLY: raw signals and
// dispositions, every trade field, excursions, both drawdowns, every daily mark, the continuation outcomes and
// episodes, the complete decision log (entry-gate entries included), the minute-mark change points and the full
// metrics (identical doubles: JSON numbers round-trip exactly).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../../four-family/data.ts';
import { exactJson } from '../tools/capture-baseline.ts';
import { type BaselineCase11, recordCase11 } from '../tools/capture-baseline-1.1.0.ts';
import { warmupSessionsForParams } from '../riseTrading.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/baseline-1.2.0.json', import.meta.url), 'utf8'));
const parse = (text: string) =>
  JSON.parse(text, (_key, v: unknown) =>
    v === 'NaN' ? NaN : v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v
  );

describe('Growth 1.3.0 with the three optional rules OFF = the 1.2.0 baseline (captured before the change)', () => {
  test('the fixture is the before-change capture of 1.2.0', () => {
    assert.equal(fixture.strategy.version, '1.2.0');
    assert.equal(fixture.commit, '8d2800ebcab8bda86a7c7fb519119d140e94fbf6');
    assert.equal(fixture.engineDirty, '');
    assert.equal(fixture.cases.length, 9);
    assert.ok(fixture.cases.some((c: BaselineCase11) => c.id === 'candidate-a'));
    assert.ok(fixture.cases.some((c: BaselineCase11) => c.params.trendFilter && c.params.eligibility && c.params.continuation));
  });

  for (const expected of fixture.cases as (BaselineCase11 & Record<string, any>)[]) {
    const dataFile = `${root}data/${expected.symbol}/data.csv`;

    test(`${expected.id}: identical signals, trades, episodes, decision log, marks and metrics`, async (t) => {
      if (!existsSync(dataFile)) return t.skip('no local data');
      if ((await sha256File(dataFile)) !== expected.dataSha256)
        return t.skip('the data file changed since the capture');

      // OFF: the configuration as 1.2.0 knew it (no v1.3.0 fields), and the explicit OFF of 1.3.0.
      for (const params of [
        expected.params,
        { ...expected.params, entryMethod: 'rise_from_recent_low' as const, breakout: null, initialStop: null, retention: null }
      ]) {
        assert.equal(warmupSessionsForParams(params), expected.warmupSessions);

        const actual = parse(exactJson(await recordCase11({ ...expected, params })));
        const want = parse(exactJson(expected));

        assert.deepEqual(
          [actual.dataSha256, actual.loadedSessions, actual.warmup, actual.firstSignalBar, actual.bars],
          [want.dataSha256, want.loadedSessions, want.warmup, want.firstSignalBar, want.bars]
        );
        assert.deepEqual(actual.counts, want.counts);
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
        // Hashes of the full serialisations: every daily mark, ledger row, log entry and mark change included.
        assert.deepEqual(actual.hashes, want.hashes);
      }
    });
  }
});
