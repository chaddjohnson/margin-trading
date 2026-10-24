// Share splits: the registry's validation, forward adjustment of sessions (a no-op for a run without a split), the
// window report, and the audit of split-sized moves no split explains.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession } from '#types';
import {
  adjustSessionsForSplits,
  parseSplits,
  readSplits,
  splitFactor,
  unexplainedSplitGaps
} from '../corporateActions.ts';
import { selectRunSessions } from '../evaluation.ts';
import { defaultPartitionConfigText, parsePartitionConfig } from '../partitions.ts';

const session = (date: string, price: number, volume = 1000): MarketSession => {
  const time = Date.parse(date) / 1000;

  return {
    date,
    time,
    openTime: time + 52200,
    closeTime: time + 75600,
    isEarlyClose: false,
    bars: [{ time: time + 52200, open: price, high: price + 1, low: price - 1, close: price, volume, trades: NaN }],
    open: price,
    high: price + 1,
    low: price - 1,
    close: price,
    volume,
    trades: NaN,
    closingPrint: price
  };
};

const splits = parseSplits(
  JSON.stringify({
    schemaVersion: 1,
    splits: [{ symbol: 'SYN', effectiveDate: '2026-04-21', ratio: 8, source: 'synthetic test split' }]
  })
);

describe('share splits', () => {
  test('the registry is validated strictly', () => {
    const one = (entry: Record<string, unknown>) => JSON.stringify({ schemaVersion: 1, splits: [entry] });
    const valid = { symbol: 'SYN', effectiveDate: '2026-04-21', ratio: 8, source: 'synthetic test split' };

    assert.throws(() => parseSplits('{"splits": []}'), /schemaVersion/);
    assert.throws(() => parseSplits(one({ ...valid, ratio: 1 })), /positive number other than 1/);
    assert.throws(() => parseSplits(one({ ...valid, ratio: -2 })), /positive number/);
    assert.throws(() => parseSplits(one({ ...valid, effectiveDate: '2026-13-01' })), /YYYY-MM-DD/);
    assert.throws(() => parseSplits(one({ ...valid, symbol: 'syn' })), /not a symbol/);
    assert.throws(() => parseSplits(one({ ...valid, source: '' })), /document the split/);
    assert.throws(() => parseSplits(one({ ...valid, extra: 1 })), /exactly symbol/);
    assert.throws(
      () => parseSplits(JSON.stringify({ schemaVersion: 1, splits: [valid, valid] })),
      /a second split of SYN 2026-04-21/
    );
  });

  test('the shipped registry holds the issuer-documented VGT 8:1 and VOOG 6:1 splits of 2026-04-21', () => {
    assert.deepEqual(
      readSplits().map(({ symbol, effectiveDate, ratio }) => `${symbol} ${effectiveDate} ${ratio}`),
      ['VGT 2026-04-21 8', 'VOOG 2026-04-21 6']
    );
    assert.ok(readSplits().every((split) => split.source.includes('Vanguard')));
  });

  test('forward adjustment: later prices × ratio, volumes ÷ ratio; earlier sessions are the same objects', () => {
    const raw = [session('2026-04-17', 800), session('2026-04-20', 808), session('2026-04-21', 101.5, 8000)];
    const { sessions, applied } = adjustSessionsForSplits(raw, 'SYN', splits);

    assert.deepEqual(applied, [{ symbol: 'SYN', effectiveDate: '2026-04-21', ratio: 8 }]);
    assert.equal(sessions[0], raw[0]);
    assert.equal(sessions[1], raw[1]);
    assert.equal(sessions[2]!.close, 812);
    assert.equal(sessions[2]!.closingPrint, 812);
    assert.equal(sessions[2]!.bars[0]!.high, 820);
    assert.equal(sessions[2]!.volume, 1000);
    assert.equal(sessions[2]!.bars[0]!.volume, 1000);
    assert.equal(sessions[2]!.close * sessions[2]!.volume, raw[2]!.close * raw[2]!.volume, 'dollar volume kept');
    assert.equal(raw[2]!.close, 101.5, 'the input is not modified');
    assert.equal(splitFactor(splits, 'SYN', '2026-04-17', '2026-06-24'), 8);
    assert.equal(splitFactor(splits, 'SYN', '2026-04-21', '2026-06-24'), 1, 'a run starting after the split');
    assert.equal(splitFactor(splits, 'OTHER', '2026-04-17', '2026-06-24'), 1);
  });

  test('a run that spans no split is unchanged; a run that spans one reports it', () => {
    const config = parsePartitionConfig(defaultPartitionConfigText);
    const dataset = (partition: 'holdout' | 'final') => ({
      symbol: 'SYN',
      partition,
      file: 'fixture',
      interval: config.partitions[partition],
      partitionsFile: 'fixture',
      partitionsSha256: 'fixture'
    });
    const all = [
      session('2025-10-15', 700),
      session('2025-10-16', 701),
      session('2026-04-20', 808),
      session('2026-04-21', 101.5)
    ];
    const holdout = selectRunSessions(all, { dataset: dataset('holdout'), splits });
    const final = selectRunSessions(all, { dataset: dataset('final'), warmupSessions: 2, splits });

    assert.equal(holdout.sessions[0], all[0]);
    assert.deepEqual(holdout.report!.splitAdjustments, []);
    assert.deepEqual(final.report!.splitAdjustments, [{ symbol: 'SYN', effectiveDate: '2026-04-21', ratio: 8 }]);
    assert.equal(final.history[0], all[0], 'the warm-up keeps its own units');
    assert.equal(final.sessions.at(-1)!.close, 812);
  });

  test('split-sized moves that no recorded split explains are listed', () => {
    const raw = [session('2026-04-20', 808), session('2026-04-21', 101.5), session('2026-04-22', 50)];

    assert.deepEqual(
      unexplainedSplitGaps(raw, 'SYN', splits).map((gap) => gap.date),
      ['2026-04-22']
    );
    assert.deepEqual(
      unexplainedSplitGaps(raw, 'SYN', []).map((gap) => gap.date),
      ['2026-04-21', '2026-04-22']
    );
  });
});
