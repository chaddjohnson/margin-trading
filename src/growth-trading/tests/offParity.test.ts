// OFF parity (real data; skipped without the git-ignored data/ files, or when a data file no longer has the hash it had
// at capture). The fixture tests/fixtures/baseline-1.0.0.json was captured ONCE from rise-from-recent-low-trading@1.0.0
// at commit b590c60, before any continuation code existed (tools/capture-baseline.ts). With continuation OFF the
// current engine must reproduce every case exactly: every raw signal and its disposition, every trade field (decision,
// fills, prices, exit reason, stop, hold, buffer, interest, gross, net), every excursion, both drawdowns, every daily
// mark, the minute-mark count and the 1.0.0 metrics. "Exactly" = identical doubles (JSON numbers round-trip exactly).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sha256File } from '../../four-family/data.ts';
import { type BaselineCase, exactJson, recordCase } from '../tools/capture-baseline.ts';
import { warmupSessionsFor, warmupSessionsForParams } from '../riseTrading.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('./fixtures/baseline-1.0.0.json', import.meta.url), 'utf8'));
const parse = (text: string) =>
  JSON.parse(text, (_key, v: unknown) =>
    v === 'NaN' ? NaN : v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v
  );

// The 1.0.0 metrics keys, in the 1.0.0 shape: anything v1.1.0 adds (attribution, continuation) is outside the
// comparison, everything 1.0.0 had must be identical.
const project = (baseline: unknown, current: unknown): unknown => {
  if (baseline === null || typeof baseline !== 'object' || Array.isArray(baseline)) return current;

  const c = current as Record<string, unknown>;

  return Object.fromEntries(
    Object.keys(baseline).map((k) => [k, project((baseline as Record<string, unknown>)[k], c?.[k])])
  );
};

describe('Growth 1.1.0 with continuation OFF = the 1.0.0 baseline (captured before the change)', () => {
  test('the fixture is the before-change capture', () => {
    assert.equal(fixture.strategy.version, '1.0.0');
    assert.equal(fixture.commit, 'b590c6057a7714c17e94bd067efec9b51479f4ef');
    assert.equal(fixture.engineDirty, '');
    assert.equal(fixture.cases.length, 6);
  });

  for (const expected of fixture.cases as (BaselineCase & Record<string, any>)[]) {
    const dataFile = `${root}data/${expected.symbol}/data.csv`;

    test(`${expected.id}: identical signals, trades, excursions, drawdowns, marks and metrics`, async (t) => {
      if (!existsSync(dataFile)) return t.skip('no local data');
      if ((await sha256File(dataFile)) !== expected.dataSha256)
        return t.skip('the data file changed since the capture');

      // OFF: the configuration as 1.0.0 knew it (no continuation field), and the explicit OFF of 1.1.0.
      for (const params of [expected.params, { ...expected.params, continuation: null }]) {
        assert.equal(
          warmupSessionsForParams(params),
          warmupSessionsFor(params.resolution, params.recentLowLookbackBars)
        );

        const actual = parse(exactJson(await recordCase({ ...expected, params })));
        const want = parse(exactJson(expected));

        assert.equal(actual.dataSha256, want.dataSha256);
        assert.deepEqual(
          [actual.warmupSessions, actual.loadedSessions, actual.warmup, actual.firstSignalBar, actual.bars],
          [want.warmupSessions, want.loadedSessions, want.warmup, want.firstSignalBar, want.bars]
        );
        assert.deepEqual(actual.counts, want.counts);
        assert.deepEqual(actual.signals, want.signals);
        assert.deepEqual(actual.trades, want.trades);
        assert.deepEqual(actual.excursions, want.excursions);
        assert.deepEqual(actual.minuteDrawdown, want.minuteDrawdown);
        assert.deepEqual(actual.dailyDrawdown, want.dailyDrawdown);
        assert.equal(actual.realized, want.realized);
        assert.deepEqual(actual.lastDaily, want.lastDaily);
        assert.deepEqual(project(want.metrics, actual.metrics), want.metrics);
        // The hashes of the full serialisations (every daily mark and every ledger row included).
        assert.deepEqual(actual.hashes, want.hashes);
      }
    });
  }
});
