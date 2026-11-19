// OFF parity with Growth 1.3.0 (real data; skipped without the git-ignored data/ files, or when a data file no longer
// has the hash it had at capture). The fixture tests/fixtures/baseline-1.3.0.json was captured ONCE from
// rise-from-recent-low-trading@1.3.0 at commit d13148a, before any v1.4.0 code existed (tools/capture-baseline-1.3.0.ts):
// seven cases switching the trend-breakout entry, the initial risk stop and trend retention ON (alone and with the
// entry trend filter, persistent eligibility and continuation), on daily, 60- and 15-minute bars, Candidate A + the
// initial stop among them. With the Drawdown Recovery Gate OFF the current engine must reproduce every case EXACTLY:
// raw signals and dispositions, every trade field, excursions, both drawdowns, every daily mark, the continuation
// outcomes and episodes, the complete decision log, the minute-mark change points, the full metrics, and the records
// kept outside the log (gated decisions, opportunities, renewal watches, block counts, the optional rules' positions
// and fills, the breakout scan). The 1.2.0 fixture (offParity-1.2.0.test.ts) covers the configurations with the 1.3.0
// options OFF and runs on the same engine.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../../four-family/data.ts';
import { exactJson } from '../tools/capture-baseline.ts';
import type { BaselineCase11 } from '../tools/capture-baseline-1.1.0.ts';
import { recordCase13 } from '../tools/capture-baseline-1.3.0.ts';
import { warmupSessionsForParams } from '../riseTrading.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/baseline-1.3.0.json', import.meta.url), 'utf8'));
const parse = (text: string) =>
  JSON.parse(text, (_key, v: unknown) =>
    v === 'NaN' ? NaN : v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v
  );

describe('Growth 1.4.0 with the Drawdown Recovery Gate OFF = the 1.3.0 baseline (captured before the change)', () => {
  test('the fixture is the before-change capture of 1.3.0', () => {
    assert.equal(fixture.strategy.version, '1.3.0');
    assert.equal(fixture.commit, 'd13148a92023019afa294439e3d76c42cac49b76');
    assert.equal(fixture.engineDirty, '');
    assert.equal(fixture.cases.length, 7);
    assert.ok(fixture.cases.some((c: BaselineCase11) => c.params.entryMethod === 'trend_breakout'));
    assert.ok(fixture.cases.some((c: BaselineCase11) => c.params.initialStop && c.params.retention));
    assert.ok(
      fixture.cases.some((c: BaselineCase11) => c.params.initialStop && c.params.eligibility && c.params.continuation)
    );
  });

  for (const expected of fixture.cases as (BaselineCase11 & Record<string, any>)[]) {
    const dataFile = `${root}data/${expected.symbol}/data.csv`;

    test(`${expected.id}: identical signals, trades, gates, rules, decision log, marks and metrics`, async (t) => {
      if (!existsSync(dataFile)) return t.skip('no local data');
      if ((await sha256File(dataFile)) !== expected.dataSha256)
        return t.skip('the data file changed since the capture');

      // OFF: the configuration as 1.3.0 knew it (no drawdownGate field), and the explicit OFF of 1.4.0.
      for (const params of [expected.params, { ...expected.params, drawdownGate: null }]) {
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
        // Hashes of the full serialisations: every daily mark, ledger row, log entry, mark change, gate and rule record.
        assert.deepEqual(actual.hashes, want.hashes);
        assert.deepEqual(actual.extraHashes, want.extraHashes);
      }
    });
  }
});
