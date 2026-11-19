// The eligibility adapter on synthetic minute data (PROTOCOL.md §4, §11): OFF parity with the control engine, arming,
// expiry, cancellation (shadow close, trailing-low invalidation), the band (trigger and cap), fresh-versus-delayed
// priority, simultaneous candidates, duplicate prevention, fills after the decision (same minute as the slot frees,
// closing print), late-lot initialization and shadow/funded divergence, period accounting and causality.
//
// Fixture: D1 test parameters (arm on a 10% decline from the 3-session high, buy a 1% rebound, 5% stop, 0 bps, 11%).
// GDX dips first in session 3 and is funded; VGT dips later in the same session and is refused (pool occupied); the
// GDX lot exits by its trailing stop in session 5 at bar 3, freeing the slot while VGT's shadow trade is still open.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession } from '#types';
import { fixtureDataset } from '../../four-family/data.ts';
import { assembleUniverse } from '../../multi-etf-allocator/data.ts';
import {
  type SessionSpec,
  buildSession,
  dateOf,
  flat,
  testPhenotype
} from '../../multi-etf-allocator/tests/fixtures.ts';
import {
  type BookPhenotype,
  type NUniverse,
  baseNRunConfig,
  runNAllocator
} from '../../portfolio-aware-d1/nbook/engine.ts';
import { type VRunConfig, runVariant } from '../engine.ts';
import { compareExact } from '../parity.ts';

const bars = 8;
const level = (price: number): SessionSpec => flat(price, bars);

const universeOf = (specs: Record<string, SessionSpec[]>): NUniverse => {
  const instruments: Record<
    string,
    { symbol: string; file: string; hash: string; ds: ReturnType<typeof fixtureDataset> }
  > = {};
  let end = '';

  for (const [symbol, sessions] of Object.entries(specs)) {
    const built: MarketSession[] = sessions.map((spec, day) => buildSession(dateOf(day), spec));
    const ds = fixtureDataset(built);

    ds.id = `fixture-${symbol}`;
    instruments[symbol] = { symbol, file: 'fixture', hash: 'fixture', ds };
    end = built.at(-1)!.date;
  }

  const assembled = assembleUniverse(instruments as never, [], end, {}, dateOf(0));

  return { ...assembled, instruments } as unknown as NUniverse;
};

const bookOf = (symbol: string, grid: Parameters<typeof testPhenotype>[1] = {}): BookPhenotype => {
  const phenotype = testPhenotype('VGT', grid);

  return { symbol, name: 'test', params: { ...phenotype.params, label: `${symbol} test` }, short: phenotype.short };
};

const configOf = (
  symbols: string[],
  eligibility: VRunConfig['eligibility'] = {},
  books: Record<string, BookPhenotype> = {},
  extra: Partial<VRunConfig> = {}
): VRunConfig => ({
  ...baseNRunConfig({
    key: 'test',
    label: 'test',
    mode: 'fixed',
    symbols,
    phenotypes: Object.fromEntries(symbols.map((symbol) => [symbol, books[symbol] ?? bookOf(symbol)])),
    costBps: 0,
    initial: { voog: 60000, vgt: 40000 }
  }),
  eligibility,
  ...extra
});

const on = (A: number, E = 0) => ({ maxAgeSessions: A, maxExtension: E });

// GDX: dip in s3 (signal at bar 3, filled at bar 4), rally in s4, stop hit at bar 3 of s5 (stop 104.5).
const gdxPath = (sessions = 10): SessionSpec[] => [
  level(100),
  level(100),
  level(100),
  { closes: [100, 89, 88, 90, 90, 90, 90, 90] },
  { closes: [92, 96, 100, 104, 108, 110, 110, 110] },
  { closes: [109, 107, 105, 103, 103, 103, 103, 103] },
  ...Array.from({ length: sessions - 6 }, () => level(103))
];

// VGT: dip in s3 later than GDX (signal at bar 5 at 90: trigger 88.88, trailing low 88), then `after` sessions.
const vgtPath = (after: SessionSpec[], sessions = 10): SessionSpec[] => [
  level(100),
  level(100),
  level(100),
  { closes: [100, 100, 100, 89, 88, 90, 90, 90] },
  ...after,
  ...Array.from({ length: sessions - 4 - after.length }, () => level(89.5))
];

const scenario = (after: SessionSpec[] = [level(89.5), level(89.5)], sessions = 10) =>
  universeOf({ VGT: vgtPath(after, sessions), GDX: gdxPath(sessions) });

const timeOf = (universe: NUniverse, symbol: string, s: number, k: number) => {
  const ds = universe.instruments[symbol]!.ds;

  return ds.bTime[ds.sBarStart[s]! + k]!;
};

const lateLots = (result: ReturnType<typeof runVariant>) => result.lots.filter((lot) => 'opportunityId' in lot.trade);
const kinds = (result: ReturnType<typeof runVariant>) => result.transitions.map((t) => t.kind);

describe('OFF parity and arming', () => {
  test('eligibility OFF equals the control engine exactly on every scenario', () => {
    for (const universe of [
      scenario(),
      scenario([level(91), level(91)]),
      universeOf({ VGT: vgtPath([level(89.5)]), GDX: gdxPath(), XBI: gdxPath() })
    ]) {
      const symbols = Object.keys(universe.instruments).sort((a, b) =>
        a === 'VGT' ? -1 : b === 'VGT' ? 1 : a < b ? -1 : 1
      );
      const config = configOf(symbols);
      const control = runNAllocator(universe, config);
      const adapter = runVariant(universe, config);
      const keys = Object.keys(control).filter((key) => key !== 'universe');
      const result = compareExact(
        Object.fromEntries(keys.map((key) => [key, (control as never)[key]])),
        Object.fromEntries(keys.map((key) => [key, (adapter as never)[key]]))
      );

      assert.equal(result.equal, true, JSON.stringify(result.differences));
      assert.equal(adapter.transitions.length, 0);
    }
  });

  test('the refused VGT signal arms one opportunity with its immutable origin; the shadow books are unchanged', () => {
    const universe = scenario();
    const off = runVariant(universe, configOf(['VGT', 'GDX']));
    const result = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(5) }));
    const opp = result.opportunities[0]!;

    assert.equal(result.opportunities.length, 1);
    assert.equal(opp.symbol, 'VGT');
    assert.equal(opp.originIndex, 3);
    assert.equal(opp.originPrice, 90);
    assert.equal(opp.trailingLow, 88);
    assert.ok(Math.abs(opp.trigger - 88.88) < 1e-9);
    assert.match(opp.refusalReason, /^pool occupied \(GDX lot 1\)/);
    assert.equal(compareExact(off.trades, result.trades).equal, true, 'shadow trades identical ON and OFF');
    assert.equal(
      compareExact(
        off.signals.map((s) => [s.symbol, s.decisionTime, s.outcome]),
        result.signals.map((s) => [s.symbol, s.decisionTime, s.outcome])
      ).equal,
      true
    );
  });

  test('an ETF that is not enabled never arms', () => {
    const result = runVariant(scenario(), configOf(['VGT', 'GDX'], { GDX: on(20, 0.05) }));

    assert.equal(result.opportunities.length, 0);
    assert.equal(lateLots(result).length, 0);
  });
});

describe('delayed entry', () => {
  test('selected at the minute the slot frees, filled at the next trade, never at the refused price', () => {
    const universe = scenario();
    const result = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(2) }));
    const [late] = lateLots(result);
    const gdx = result.lots.find((lot) => lot.symbol === 'GDX')!;

    assert.ok(late);
    assert.equal(gdx.exitIndex, 5);
    assert.equal(gdx.exitBar, 3);
    assert.equal(late.decisionTime, timeOf(universe, 'GDX', 5, 3) + 60, 'decided at the close of the exit minute');
    assert.equal(late.entryIndex, 5);
    assert.equal(late.entryBar, 4);
    assert.ok(late.entryTime >= late.decisionTime, 'fill after the decision');
    assert.equal(late.entryRawPrice, 89.5);
    assert.notEqual(late.entryRawPrice, 90);
    assert.deepEqual(
      kinds(result).filter((k) => k !== 'pending'),
      ['armed', 'revalidated', 'selected', 'filled']
    );
  });

  test('expiry: A = 1 expires at the close of origin + 1, before the slot frees', () => {
    const result = runVariant(scenario(), configOf(['VGT', 'GDX'], { VGT: on(1) }));

    assert.equal(lateLots(result).length, 0);
    assert.equal(result.opportunities[0]!.status, 'expired');
    assert.equal(result.opportunities[0]!.endIndex, 4);
  });

  test('extension cap: above P0 × (1 + E) stays pending; a wider E revalidates', () => {
    const universe = scenario(Array.from({ length: 6 }, () => level(91)));

    for (const [E, expected] of [
      [0, 0],
      [0.01, 0],
      [0.03, 1]
    ] as const) {
      const result = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(5, E) }));

      assert.equal(lateLots(result).length, expected, `E ${E}`);

      if (!expected)
        assert.ok(result.transitions.some((t) => t.kind === 'pending' && /above the extension cap/.test(t.reason)));
    }
  });

  test('trigger boundary: below the original trigger is pending; the first minute back at or above it selects', () => {
    const universe = scenario([level(89.5), { closes: [88.5, 88.5, 88.5, 88.5, 88.5, 89, 89, 89] }]);
    const result = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(5) }));
    const [late] = lateLots(result);

    assert.ok(result.transitions.some((t) => t.kind === 'pending' && /below the original trigger/.test(t.reason)));
    assert.equal(late!.decisionTime, timeOf(universe, 'VGT', 5, 5) + 60);
    assert.equal(late!.entryBar, 6);
  });

  test('invalidation: a minute low below the trailing low cancels for good; the close rule is report-only', () => {
    const wick = {
      closes: [89.5, 89.5, 89.5, 89.5, 89.5, 89.5, 89.5, 89.5],
      opens: [89.5, 89.5, 87.9, 89.5, 89.5, 89.5, 89.5, 89.5]
    };
    const universe = scenario([wick, level(89.5)]);
    const low = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(5) }));
    const close = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(5) }, {}, { invalidation: 'minute close' }));

    assert.equal(lateLots(low).length, 0);
    assert.equal(low.opportunities[0]!.status, 'cancelled');
    assert.match(low.opportunities[0]!.endReason, /minute low 87.9 below the trailing low 88/);
    assert.equal(lateLots(close).length, 1, 'the close never went below 88');
  });

  test('the originating shadow trade closing cancels the opportunity', () => {
    const result = runVariant(
      scenario(),
      configOf(['VGT', 'GDX'], { VGT: on(5) }, { VGT: bookOf('VGT', { maximumHoldDays: 1 }) })
    );

    assert.equal(lateLots(result).length, 0);
    assert.equal(result.opportunities[0]!.status, 'cancelled');
    assert.match(result.opportunities[0]!.endReason, /originating shadow trade 1 closed \(maximum hold\)/);
    assert.equal(result.opportunities[0]!.endIndex, 4);
  });

  test('a decision after the last minute fills at the closing print', () => {
    const universe = universeOf({
      VGT: vgtPath([level(89.5), level(89.5)]),
      GDX: [...gdxPath().slice(0, 5), { closes: [109, 109, 109, 109, 109, 109, 109, 103] }, ...gdxPath().slice(6)]
    });
    const result = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(5) }));
    const [late] = lateLots(result);
    const ds = universe.instruments.VGT!.ds;

    assert.equal(late!.entryIndex, 5);
    assert.equal(late!.entryBar, ds.sBarCount[5]!, 'the closing print');
    assert.equal(late!.entryExecution, 'closing print');
  });
});

describe('priority, simultaneity, duplicates', () => {
  // XBI: a fresh dip in s5 whose signal (bar 3) comes at the minute GDX's stop frees the slot.
  const xbiFresh: SessionSpec[] = [
    level(100),
    level(100),
    level(100),
    level(100),
    level(100),
    { closes: [100, 89, 88, 90, 90, 90, 90, 90] },
    ...Array.from({ length: 4 }, () => level(90))
  ];

  test('fresh signals are decided before delayed candidates at the same minute', () => {
    const universe = universeOf({ VGT: vgtPath([level(89.5), level(89.5)]), GDX: gdxPath(), XBI: xbiFresh });
    const result = runVariant(universe, configOf(['VGT', 'GDX', 'XBI'], { VGT: on(5) }));
    const xbi = result.lots.find((lot) => lot.symbol === 'XBI');

    assert.ok(xbi, 'XBI funded');
    assert.equal(xbi.decisionTime, timeOf(universe, 'XBI', 5, 3) + 60);
    assert.ok(result.transitions.some((t) => t.kind === 'rejected' && t.reason === 'a fresh signal took the slot'));
    assert.equal(lateLots(result).length, 0);
  });

  test('simultaneous candidates: the oldest origin wins, then alphabetical', () => {
    const same = universeOf({
      VGT: vgtPath([level(89.5), level(89.5)]),
      GDX: gdxPath(),
      XBI: vgtPath([level(89.5), level(89.5)])
    });
    const sameResult = runVariant(same, configOf(['VGT', 'GDX', 'XBI'], { VGT: on(5), XBI: on(5) }));

    assert.equal(lateLots(sameResult).length, 1);
    assert.equal(lateLots(sameResult)[0]!.symbol, 'VGT', 'same origin minute → alphabetical');
    assert.ok(
      sameResult.transitions.some(
        (t) => t.kind === 'rejected' && t.symbol === 'XBI' && t.reason === 'an older opportunity took the slot'
      )
    );

    const earlier = universeOf({
      VGT: vgtPath([level(89.5), level(89.5)]),
      GDX: gdxPath(),
      XBI: [
        level(100),
        level(100),
        level(100),
        { closes: [100, 100, 89, 88, 90, 90, 90, 90] },
        level(89.5),
        level(89.5),
        ...Array.from({ length: 4 }, () => level(89.5))
      ]
    });
    const earlierResult = runVariant(earlier, configOf(['VGT', 'GDX', 'XBI'], { VGT: on(5), XBI: on(5) }));

    assert.equal(lateLots(earlierResult)[0]!.symbol, 'XBI', 'XBI refused one minute earlier → older');
  });

  test('a consumed opportunity is never funded again; a fresh signal while the ETF holds its late lot does not arm', () => {
    // VGT hold 3 days: the shadow trade max-holds out in s6; the late lot (s5) only in s8. A new VGT dip in s7 is refused.
    const universe12 = universeOf({
      VGT: vgtPath(
        [level(89.5), level(89.5), level(89.5), { closes: [89.5, 80, 79, 81, 81, 81, 81, 81] }, level(81), level(81)],
        12
      ),
      GDX: gdxPath(12)
    });
    const result = runVariant(
      universe12,
      configOf(['VGT', 'GDX'], { VGT: on(5) }, { VGT: bookOf('VGT', { maximumHoldDays: 3 }) })
    );
    const late = lateLots(result);
    const shadow = result.trades.find((t) => t.symbol === 'VGT' && t.id === 1)!;

    assert.equal(late.length, 1);
    assert.equal(result.opportunities.filter((o) => o.status === 'filled').length, 1);
    assert.equal(shadow.exitIndex, 6, 'shadow trade: maximum hold from its own s3 fill');
    assert.ok(late[0]!.exitIndex >= 8, 'late lot: maximum hold from its own s5 fill');
    assert.ok(
      result.transitions.some((t) => t.kind === 'not armed' && /VGT already holds the real lot/.test(t.reason))
    );
  });
});

describe('late-lot initialization, divergence and accounting', () => {
  test('own entry price, shares, interest start, holding age and post-entry high; independent of the shadow exit', () => {
    const universe = universeOf({ VGT: vgtPath([level(89.5), level(89.5)], 12), GDX: gdxPath(12) });
    const result = runVariant(
      universe,
      configOf(['VGT', 'GDX'], { VGT: on(5) }, { VGT: bookOf('VGT', { maximumHoldDays: 3 }) })
    );
    const [late] = lateLots(result);
    const shadow = result.trades.find((t) => t.symbol === 'VGT' && t.id === 1)!;
    const ds = universe.instruments.VGT!.ds;

    assert.equal(late!.shares, 100000 / 89.5);
    assert.equal(late!.entryTimestamp, ds.sTime[5]);
    assert.equal(shadow.exitIndex, 6);
    assert.equal(late!.exitIndex, 8, 'maximum hold counted from the late fill (3 days)');
    assert.equal(late!.exitReason, 'maximum hold');
    assert.equal(late!.interest, 100000 * 0.11 * ((ds.sTime[8]! - ds.sTime[5]!) / (365 * 86400)));
    assert.ok(Math.abs(late!.net - (late!.shares * late!.exitPrice - 100000 - late!.interest)) < 1e-9);
    // the slot is released only by the late lot's own exit
    assert.equal(result.daily.find((row) => row.date === dateOf(6))!.openLots, 1);
    assert.equal(result.daily.find((row) => row.date === dateOf(8))!.openLots, 0);
  });

  test('period accounting: period P&L sums to the total; period drawdowns restart at the period start', () => {
    const universe = scenario();
    const periods = [
      { name: 'a', first: dateOf(0), last: dateOf(4) },
      { name: 'b', first: dateOf(5), last: dateOf(9) }
    ];
    const result = runVariant(universe, configOf(['VGT', 'GDX'], { VGT: on(5) }, {}, { periods }));
    const at = (date: string) => result.daily.find((row) => row.date === date)!.strategyMark;
    const total = result.daily.at(-1)!.strategyMark;

    assert.ok(lateLots(result).length === 1 && total !== 0);
    assert.equal(result.periodDrawdowns.a!.startValue, 0);
    assert.equal(result.periodDrawdowns.a!.endValue, at(dateOf(4)));
    assert.equal(result.periodDrawdowns.b!.startValue, at(dateOf(4)));
    assert.equal(result.periodDrawdowns.b!.endValue, total);
    assert.ok(
      Math.abs(
        result.periodDrawdowns.a!.endValue -
          result.periodDrawdowns.a!.startValue +
          (result.periodDrawdowns.b!.endValue - result.periodDrawdowns.b!.startValue) -
          total
      ) < 1e-9
    );
    assert.ok(result.periodDrawdowns.b!.maximum <= result.minuteDrawdown.maximum + 1e-9);
    assert.ok(Number.isFinite(result.periodDrawdowns.a!.maximum));
  });

  test('causality: changing every bar after the delayed decision changes neither the decision nor anything before it', () => {
    const base = scenario();
    const result = runVariant(base, configOf(['VGT', 'GDX'], { VGT: on(5) }));
    const opp = result.opportunities[0]!;
    const altered = universeOf({
      VGT: vgtPath([
        level(89.5),
        { closes: [89.5, 89.5, 89.5, 89.5, 120, 120, 120, 120], opens: [89.5, 89.5, 89.5, 89.5, 120, 120, 120, 120] },
        level(120),
        level(120)
      ]),
      GDX: [
        ...gdxPath().slice(0, 5),
        { closes: [109, 107, 105, 103, 50, 50, 50, 50] },
        ...Array.from({ length: 4 }, () => level(50))
      ]
    });
    const changed = runVariant(altered, configOf(['VGT', 'GDX'], { VGT: on(5) }));
    const opp2 = changed.opportunities[0]!;

    assert.equal(opp2.selectedTime, opp.selectedTime);
    assert.equal(opp2.selectedPrice, opp.selectedPrice);
    const upToDecision = (r: typeof result) =>
      r.transitions
        .slice(0, r.transitions.findIndex((t) => t.kind === 'selected') + 1)
        .map((t) => [t.kind, t.time, t.price]);

    assert.deepEqual(upToDecision(changed), upToDecision(result));
    assert.notEqual(
      lateLots(changed)[0]!.entryRawPrice,
      lateLots(result)[0]!.entryRawPrice,
      'the fill is the later bar'
    );
  });
});
