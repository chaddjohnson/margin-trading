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

  test('the shipped registry holds the documented splits: VGT, VOOG, XOP (1:4 reverse), XLE, XLU, XLY', () => {
    assert.deepEqual(
      readSplits().map(({ symbol, effectiveDate, ratio }) => `${symbol} ${effectiveDate} ${ratio}`),
      [
        'VGT 2026-04-21 8',
        'VOOG 2026-04-21 6',
        'XOP 2020-03-30 0.25',
        'XLE 2025-12-05 2',
        'XLU 2025-12-05 2',
        'XLY 2025-12-05 2'
      ]
    );

    const documents: Record<string, string> = {
      VGT: 'Vanguard',
      VOOG: 'Vanguard',
      XOP: 'Form 8937',
      XLE: 'OCC Information Memo #57734',
      XLU: 'OCC Information Memo #57736',
      XLY: 'OCC Information Memo #57733'
    };

    for (const split of readSplits()) {
      assert.ok(split.source.includes(documents[split.symbol]!), `${split.symbol}: ${documents[split.symbol]}`);
    }
  });

  test('a reverse split and successive splits: the factors compose, volumes move the other way', () => {
    const composed = parseSplits(
      JSON.stringify({
        schemaVersion: 1,
        splits: [
          { symbol: 'REV', effectiveDate: '2020-03-30', ratio: 0.25, source: 'synthetic reverse split' },
          { symbol: 'REV', effectiveDate: '2025-12-05', ratio: 2, source: 'synthetic forward split' }
        ]
      })
    );
    // One flat economy at 8 (in the units of 2020-03-27), printed raw: 32 after the 1:4 reverse split, 16 after the 2:1.
    const raw = [
      session('2020-03-27', 8, 4000),
      session('2020-03-30', 32, 1000),
      session('2025-12-04', 32, 1000),
      session('2025-12-05', 16, 2000)
    ];
    const { sessions, applied } = adjustSessionsForSplits(raw, 'REV', composed);

    assert.equal(applied.length, 2);
    assert.equal(sessions[0], raw[0]);
    assert.equal(sessions[1]!.close, 8, '1:4: a later price × 0.25');
    assert.equal(sessions[1]!.volume, 4000, '1:4: a later volume × 4');
    assert.equal(sessions[2]!.close, 8);
    assert.equal(sessions[3]!.close, 8, 'then 2:1: × 0.25 × 2');
    assert.equal(sessions[3]!.bars[0]!.low, 7.5, 'every bar field in the same units');
    assert.equal(sessions[3]!.volume, 4000);
    assert.equal(sessions[3]!.close * sessions[3]!.volume, raw[3]!.close * raw[3]!.volume, 'dollar volume kept');
    assert.equal(splitFactor(composed, 'REV', '2020-03-27', '2025-12-05'), 0.5);
    assert.equal(splitFactor(composed, 'REV', '2020-03-30', '2025-12-05'), 2, 'a run starting on the first split');
    assert.deepEqual(unexplainedSplitGaps(sessions, 'REV', []), [], 'the adjusted series has no split-sized gap');
    assert.deepEqual(
      unexplainedSplitGaps(raw, 'REV', composed).map((gap) => gap.date),
      [],
      'the raw gaps are explained by the registry'
    );
    assert.deepEqual(
      unexplainedSplitGaps(raw, 'REV', []).map((gap) => gap.date),
      ['2020-03-30', '2025-12-05']
    );
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
