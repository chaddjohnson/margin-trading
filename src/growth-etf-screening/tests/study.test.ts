// Unit tests of growth-etf-screening's own logic (synthetic; no market data is read).
//   node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/growth-etf-screening/tests/*.test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { adjustSessionsForSplits } from '../../lib/corporateActions.ts';
import { plans, proposalsPerEtf, screenJobCap, studyPlan, transferJobCap } from '../budgets.ts';
import { shortlistRule } from '../final.ts';
import { policyOf, type SliceRow } from '../folds.ts';
import { assertWithinCeiling, addToLedger, ledgerTotal } from '../ledger.ts';
import { type Evidence, confirmationPicks } from '../qualify.ts';
import type { Pick } from '../search.ts';
import {
  CASH_ID,
  build,
  canonicalG,
  decodeG,
  gId,
  pinEntry,
  pinStratum,
  rowsOf,
  screenGenomes,
  strataCount
} from '../space.ts';
import { etfShortlist } from '../stages.ts';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'getf-test-'));

after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const someG = (n: number, label: string) => {
  const out = [];

  for (const [i, g] of screenGenomes(n * 8, 'test', label).entries()) {
    if (out.length >= n) break;
    try {
      out.push(decodeG(pinStratum(pinEntry(g, i % 2 ? 'breakout' : 'rise'), i % 2 ? 'breakout' : 'rise', i)));
    } catch {
      // invalid draw
    }
  }
  return out;
};

describe('budgets', () => {
  it('1,024 proposals per ETF per cutoff and the exact worst-case caps', () => {
    assert.equal(proposalsPerEtf('study'), 1024);
    // 1 cash + 4 × (160 + 16×8 + 96×9 + 4×32) + 4×128 + 3 × (384 + 5 + 7)
    assert.equal(screenJobCap('study'), 1 + 4 * (160 + 128 + 864 + 128) + 512 + 3 * 396);
    assert.equal(transferJobCap('study', 9), 1 + 9 + 3 * 128 + 2 * 396);

    const p = studyPlan(60, 9);

    assert.equal(p.screensWorstCase, 240 * screenJobCap('study'));
    assert.ok(p.worstCase < 2_000_000, `worst case ${p.worstCase}`);
    assert.equal(plans.study.lane.screen + plans.study.lane.island, 256);
  });
});

describe('space', () => {
  it('cash and identities; inactive inputs never change the identity', () => {
    assert.equal(build(null).id, CASH_ID);

    for (const g of someG(12, 'ids')) {
      const b = build(g);

      assert.equal(b.id, gId(canonicalG(g)));

      const noisy = { ...g } as Record<string, unknown>;

      if (!g.retentionEnabled) noisy.retentionSellPercent = 37;
      if (!g.trendFilterEnabled) noisy.trendChangeLookbackSessions = 55;
      assert.equal(build(noisy as never).id, b.id);
      // only the Growth slot is enabled
      assert.deepEqual(Object.keys(b.options.enabled ?? {}).sort(), ['D1:GDX', 'D1:VGT', 'G:VGT']);
    }
  });

  it('64 Rise and 32 breakout strata', () => {
    assert.equal(strataCount('rise'), 64);
    assert.equal(strataCount('breakout'), 32);
  });

  it('neighbourhood rows: common random numbers, duplicates flagged, clipping counted, deterministic', () => {
    const g = someG(1, 'rows')[0]!;
    const a = rowsOf(build(g), { name: 't', n: 32, labels: ['unit', 'rows'] });
    const b = rowsOf(build(g), { name: 't', n: 32, labels: ['unit', 'rows'] });

    assert.equal(a.length, 32);
    assert.deepEqual(
      a.map((r) => r.id),
      b.map((r) => r.id)
    );
    assert.ok(a.every((r) => r.clipped >= 0));

    const seen = new Set<string>([build(g).id]);

    for (const r of a) {
      assert.equal(r.dup, seen.has(r.id));
      seen.add(r.id);
    }
  });
});

const fakePick = (
  id: string,
  lane: string,
  net: number,
  robust: number,
  p90: number,
  sig: string,
  g = someG(40, 'picks')[Number.parseInt(id, 36) % 40]!
): Pick =>
  ({
    id,
    lane,
    pick: 'profit',
    origin: 'screen',
    g,
    violation: 0,
    rung: 'r2',
    parts: {},
    objectives: [-net, -robust, p90],
    centre: { net, dd: 10_000, lots: 3, signature: sig } as never,
    nb: { robust, p90Dd: p90 } as never
  }) as Pick;

describe('the ETF shortlist from the lanes', () => {
  it('profit, robust, balanced, then a seed alternative when one seed is represented; one per ledger', () => {
    const lanes = [
      {
        picks: [
          fakePick('a', 'C19/XLK/A-rise', 50_000, 10_000, 30_000, 's1'),
          fakePick('b', 'C19/XLK/A-rise', 20_000, 30_000, 20_000, 's2')
        ]
      },
      { picks: [fakePick('c', 'C19/XLK/A-breakout', 10_000, 5_000, 2_000, 's3')] },
      {
        picks: [
          fakePick('d', 'C19/XLK/B-rise', 15_000, 1_000, 25_000, 's4'),
          fakePick('e', 'C19/XLK/B-rise', 49_000, 1_000, 25_000, 's1')
        ]
      },
      { picks: [] }
    ] as never;
    const out = etfShortlist(lanes, 4);

    assert.equal(out[0]!.slot, 'profit');
    assert.equal(out[0]!.p.id, 'a');
    assert.equal(out[1]!.p.id, 'b'); // robust
    assert.equal(out[2]!.p.id, 'c'); // balanced (5,000 ÷ 2,000)
    assert.equal(out[3]!.slot, 'seed-alternative');
    assert.equal(out[3]!.p.id, 'd'); // 'e' shares a's ledger
  });
});

const ev = (label: string, net: number, dd: number, selRobust: number, selP90: number, selP10: number) =>
  ({
    label,
    g: {},
    centre: { net, dd, lots: 2, error: undefined, books: { 'G:GDX': { lots: 2 } } },
    select: { robust: selRobust, p90Dd: selP90, p10: selP10 }
  }) as unknown as Evidence;

describe('confirmation picks', () => {
  it('ranks on the selection family among passing members; one attempt when none passes', () => {
    const picks = confirmationPicks(
      [
        ev('x', 90_000, 20_000, 10_000, 40_000, 5_000),
        ev('y', 60_000, 10_000, 30_000, 20_000, 9_000),
        ev('z', 50_000, 9_000, 20_000, 5_000, 1_000)
      ],
      3
    );

    assert.deepEqual(
      picks.map((e) => e.label),
      ['y', 'z']
    ); // x fails the selection p90; y = profit and robust; z = balanced

    const none = confirmationPicks(
      [ev('x', 90_000, 20_000, 10_000, 40_000, 5_000), ev('w', 95_000, 36_000, 10_000, 40_000, 5_000)],
      3
    );

    assert.deepEqual(
      none.map((e) => e.label),
      ['x']
    ); // w is not plausible (centre DD)
  });
});

describe('the ETF-shortlisting rule', () => {
  const row = (
    sym: string,
    cluster: string,
    P: number,
    R: number,
    supported: boolean,
    control = false,
    qualified = 1
  ) => ({
    sym,
    cluster,
    control,
    qualified,
    P,
    R,
    chronology: { supported, verdict: supported ? 'SUPPORTED' : 'UNSUPPORTED' }
  });

  it('Tier 1 by rank sum, one per cluster, at most three; near misses then Tier 2; controls never count', () => {
    const r = shortlistRule([
      row('VGT', 'tech', 999_999, 999_999, true, true),
      row('AAA', 'tech', 100_000, 50_000, true),
      row('BBB', 'tech', 90_000, 60_000, true),
      row('CCC', 'energy', 80_000, 40_000, true),
      row('DDD', 'bonds', 10_000, 5_000, true),
      row('EEE', 'metals', 70_000, 70_000, true),
      row('FFF', 'banks', 200_000, 100_000, false),
      row('GGG', 'banks', 1, 1, false, false, 0)
    ]);

    assert.deepEqual(
      r.ordered.map((x) => x.sym),
      ['FFF', 'AAA', 'BBB', 'EEE', 'CCC', 'DDD']
    );
    assert.deepEqual(
      r.shortlist.map((x) => x.sym),
      ['AAA', 'EEE', 'CCC']
    );
    assert.deepEqual(r.substitutes, [{ sym: 'BBB', substituteOf: 'AAA', cluster: 'tech' }]);
    assert.deepEqual(
      r.nearMisses.map((x) => x.sym),
      ['BBB', 'DDD', 'FFF']
    );
  });

  it('no Tier-1 ETF: no shortlist', () => {
    const r = shortlistRule([row('AAA', 'tech', 100_000, 50_000, false)]);

    assert.equal(r.shortlist.length, 0);
    assert.deepEqual(
      r.nearMisses.map((x) => x.sym),
      ['AAA']
    );
  });
});

describe('sequential policies', () => {
  const slice = (key: string, net: number, openIn: number, openOut: number, t0: number): SliceRow => ({
    key,
    sym: key.split('|')[0]!,
    label: key,
    sliceNet: net,
    sliceDd: 0,
    t: [t0 + 1, t0 + 2],
    v: [net / 2, net],
    openAtBoundary: openIn,
    openAtSliceEnd: openOut,
    sliceLots: []
  });

  it('charges 5 bps of $100,000 per lot closed or adopted at a switch; none for the same configuration', () => {
    const same = policyOf('same', ['C19', 'C21'], [slice('XLK|a', 1000, 0, 1, 0), slice('XLK|a', 1000, 1, 0, 10)]);

    assert.equal(same.charges, 0);
    assert.equal(same.net, 2000);

    const sw = policyOf(
      'switch',
      ['C19', 'C21', 'C23'],
      [slice('XLK|a', 1000, 0, 1, 0), slice('SMH|b', 1000, 1, 0, 10), null]
    );

    assert.equal(sw.charges, 100); // closing XLK's lot and adopting SMH's
    assert.equal(sw.net, 1900);
    assert.match(sw.verdict, /no primary/);
  });

  it('a drawdown over the ceiling makes the policy unsupported', () => {
    const p = policyOf(
      'dd',
      ['C19', 'C21'],
      [
        { ...slice('A|x', 0, 0, 0, 0), t: [1, 2], v: [10_000, -30_000] },
        { ...slice('A|x', 5_000, 0, 0, 10), t: [11, 12], v: [-10_000, 5_000] }
      ]
    );

    assert.equal(p.sequentialDd, 50_000);
    assert.match(p.verdict, /UNSUPPORTED/);
  });
});

describe('the compute ledger guard', () => {
  it('refuses a job whose worst case would pass the ceiling', () => {
    process.env.GETF_LEDGER_FILE = path.join(tmp, 'ledger.jsonl');
    addToLedger({ job: 'x', door: 'D', fresh: 1_999_000, hits: 5 });
    assert.equal(ledgerTotal().fresh, 1_999_000);
    assert.doesNotThrow(() => assertWithinCeiling(1_000, 'ok'));
    assert.throws(() => assertWithinCeiling(1_001, 'too much'), /resource guard/);
    delete process.env.GETF_LEDGER_FILE;
  });
});

describe('forward split adjustment is causal', () => {
  it('a later split never changes earlier prices; the effective session onwards is × ratio', () => {
    const s = (date: string, p: number) => ({
      date,
      time: 0,
      openTime: 0,
      closeTime: 0,
      isEarlyClose: false,
      open: p,
      high: p,
      low: p,
      close: p,
      volume: 100,
      bars: [{ time: 0, open: p, high: p, low: p, close: p, volume: 100 }]
    });
    const sessions = [s('2020-01-02', 100), s('2020-01-03', 101), s('2020-01-06', 50.5), s('2020-01-07', 51)];
    const splits = [{ symbol: 'ZZZ', effectiveDate: '2020-01-06', ratio: 2, source: 'test' }];
    const short = adjustSessionsForSplits(sessions.slice(0, 2) as never, 'ZZZ', splits);
    const long = adjustSessionsForSplits(sessions as never, 'ZZZ', splits);

    assert.deepEqual(short.applied, []);
    assert.deepEqual(long.sessions.slice(0, 2), short.sessions);
    assert.equal(long.sessions[2]!.close, 101);
    assert.equal(long.sessions[3]!.bars[0]!.close, 102);
  });
});
