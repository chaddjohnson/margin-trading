// Real data (skipped without the git-ignored data/ files): one single configuration per continuation method with its
// illustrative defaults, on VGT/GDX training dates (2016–2023, already explored). Nothing is ranked or tuned; the
// figures are not asserted, only the invariants:
// - the raw Rise signals are exactly the OFF run's (the base scanner is unchanged), and every base signal is either
//   taken or rejected with a reason;
// - every continuation trade comes from an episode opened by a net-profitable exit, is decided inside its window
//   (s0+1 … s0+W; classic_d1 may fire later from a setup armed inside it), never before the decision is knowable, and
//   fills strictly after the decision; positions never overlap; accounting reconciles to the cent;
// - classic_d1 equals an independently written driver of D1's ShadowBook in the N-book engine's per-minute order
//   (exits, fills, then processBar of the completed minute), with Growth's base priority, trade by trade and setup by
//   setup.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveDataset } from '../../lib/dataset.ts';
import { loadDatasetSessions } from '../../lib/evaluation.ts';
import type { PhenotypeName, Sym } from '../../multi-etf-allocator/context.ts';
import { ShadowBook, type VirtualTrade } from '../../multi-etf-allocator/shadow.ts';
import type { ReboundSignal, Setup, SetupKind } from '../../shared-margin-portfolio/strategy.ts';
import { CONTINUATION_METHODS, type ContinuationConfig, DEFAULT_CONTINUATION } from '../continuation.ts';
import {
  type RiseTradingParams,
  bookSettingsOf,
  defaultTradingParams,
  exitParamsOf,
  lastMinuteBefore,
  originOf,
  runRiseTrading,
  summarizeSimulation,
  warmupSessionsForParams
} from '../riseTrading.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const hasData = ['VGT', 'GDX'].every((symbol) => existsSync(`${root}data/${symbol}/data.csv`));

const load = async (symbol: string, from: string, to: string, params: RiseTradingParams) => {
  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(symbol, 'all'),
    startDate: from,
    endDate: to,
    warmupSessions: warmupSessionsForParams(params),
    access: 'manual evaluation'
  });

  return runRiseTrading(symbol, loaded.history, loaded.warmup, params, loaded.report!.dataSha256!);
};

const invariants = (run: Awaited<ReturnType<typeof load>>, off: Awaited<ReturnType<typeof load>>) => {
  const { simulation: sim, ds } = run;
  const c = sim.continuation!;
  const cfg = c.runtime.config;

  // The base scanner is unchanged: identical raw signals (instants and prices) to the OFF run.
  assert.deepEqual(
    sim.outcomes.map((o) => [o.decision.time, o.decision.price]),
    off.simulation.outcomes.map((o) => [o.decision.time, o.decision.price])
  );

  // Positions never overlap, and every trade's fill comes strictly after its decision.
  for (let i = 0; i < sim.trades.length; i++) {
    const t = sim.trades[i]!;

    assert.ok(t.entryTime >= t.decisionTime, `trade ${t.id} fills before its decision`);
    if (i > 0) assert.ok(t.entryTime >= sim.trades[i - 1]!.exitTime, `trade ${t.id} overlaps the previous one`);
  }

  // Episodes: opened only by net-profitable exits, decided inside the window.
  for (const e of c.episodes) {
    assert.ok(e.sourceTrade.net > 0);
    assert.equal(e.anchorSession, e.sourceTrade.exitIndex);
    if (e.trade) {
      const s = e.trade.decisionIndex;

      assert.ok(s >= e.firstEligibleSession, `${e.id} decided before its window`);
      if (cfg.method !== 'classic_d1') assert.ok(s <= e.lastEligibleSession, `${e.id} decided after its window`);
      else
        assert.ok(
          e.armedTime <= ds.sCloseTime[Math.min(e.lastEligibleSession, ds.sessionCount - 1)]!,
          `${e.id} armed after its window`
        );
      assert.deepEqual(originOf(e.trade), { origin: 'continuation', method: cfg.method });
    }
  }

  const continuationTrades = sim.trades.filter((t) => originOf(t).origin === 'continuation');

  assert.equal(continuationTrades.length, c.outcomes.filter((o) => o.status === 'filled').length);

  const { metrics } = summarizeSimulation(sim, ds);

  assert.ok(metrics.checks.fixedLedgerMaxDifferenceUsd <= 1e-6);
  assert.ok(metrics.checks.identityMaxResidualUsd <= 1e-6);
  assert.ok(metrics.checks.markedEqualsLedger <= 1e-6);

  return { metrics, continuationTrades: continuationTrades.length, episodes: c.episodes.length };
};

describe(
  'continuation on real data: one illustrative configuration per method (diagnostics only)',
  { skip: !hasData },
  () => {
    for (const [symbol, resolution, from, to] of [
      ['VGT', '1d', '2016-01-04', '2023-12-29'],
      ['GDX', '1d', '2016-01-04', '2023-12-29'],
      ['VGT', '60m', '2018-01-02', '2020-12-31']
    ] as const)
      for (const method of CONTINUATION_METHODS)
        test(`${symbol} ${resolution} ${method}: causal, attributed, reconciled, base signals unchanged`, async () => {
          const base: RiseTradingParams = { ...defaultTradingParams, resolution };
          const on = await load(symbol, from, to, { ...base, continuation: DEFAULT_CONTINUATION[method] });
          const off = await load(symbol, from, to, base);
          const r = invariants(on, off);

          assert.ok(r.episodes > 0, 'profitable exits open episodes');
        });
  }
);

// ----- an independent driver of D1's book, in the N-book engine's order, with Growth's base priority -----

const referenceClassic = (run: Awaited<ReturnType<typeof load>>) => {
  const { ds, decisions, simulation } = run;
  const params = run.params;
  const book = new ShadowBook(
    run.simulation.symbol as Sym,
    'reference' as PhenotypeName,
    ds,
    exitParamsOf(params),
    bookSettingsOf(params),
    simulation.firstSession
  );
  let next = 0;
  let baseSetups = 0;
  const base = (s: number, time: number) => {
    while (next < decisions.length && decisions[next]!.time <= time) {
      const d = decisions[next++]!;

      if (book.position || book.order) continue;
      if (book.machine.setup) book.machine.cancelSetup(s);
      book.machine.continuationActive = false;

      const setup: Setup = {
        id: ++baseSetups,
        kind: 'rise' as string as SetupKind,
        activationIndex: s,
        activationTime: d.time,
        activationPrice: d.price,
        referenceHigh: NaN,
        anchorHigh: NaN,
        trailingLow: d.reference,
        trailingLowTime: NaN,
        reboundTrigger: d.trigger,
        declinedSignals: 0,
        status: 'armed',
        endIndex: -1
      };
      const signal: ReboundSignal = {
        setup,
        index: s,
        barIndex: lastMinuteBefore(ds, s, d.time),
        decisionTime: d.time,
        decisionPrice: d.price,
        trigger: d.trigger,
        trailingLow: d.reference
      };

      book.commit(signal, s, 'granted');
    }
  };

  for (let s = simulation.firstSession; s <= simulation.endSession; s++) {
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;

    book.beginSession(s);
    for (let k = 0; k <= count; k++) {
      const t = k < count ? ds.bTime[start + k]! : ds.sCloseTime[s]!;

      base(s, t); // decisions known by this instant (the previous minute's end at the latest)

      const exit = book.exitAt(k);

      if (exit) book.close(s, exit);
      if (book.fillAt(k)) book.open(s, k);
      if (k < count) {
        // Minute k completes at bTime + 60: base decisions at that instant come first (Growth's base priority).
        base(s, ds.bTime[start + k]! + 60);

        const signal = book.processBar(s, k);

        if (signal) book.commit(signal, s, 'granted');
      }
    }
    book.afterSession(s);
  }
  book.finish(simulation.endSession);

  return book;
};

const tradeFields: (keyof VirtualTrade)[] = [
  'setupKind',
  'decisionIndex',
  'decisionTime',
  'decisionPrice',
  'entryIndex',
  'entryBar',
  'entryTime',
  'entryRawPrice',
  'exitIndex',
  'exitTime',
  'exitRawPrice',
  'exitReason',
  'net'
];

describe('classic_d1 = D1’s book driven independently (real data)', { skip: !hasData }, () => {
  for (const [symbol, resolution, from, to, config] of [
    ['VGT', '1d', '2016-01-04', '2023-12-29', DEFAULT_CONTINUATION.classic_d1],
    ['GDX', '1d', '2016-01-04', '2023-12-29', DEFAULT_CONTINUATION.classic_d1],
    [
      'VGT',
      '1d',
      '2016-01-04',
      '2023-12-29',
      { ...DEFAULT_CONTINUATION.classic_d1, pullbackPercent: 4, reboundPercent: 1, windowSessions: 20 }
    ],
    [
      'VGT',
      '60m',
      '2018-01-02',
      '2020-12-31',
      { ...DEFAULT_CONTINUATION.classic_d1, pullbackPercent: 4, reboundPercent: 1, windowSessions: 20 }
    ]
  ] as const)
    test(`${symbol} ${resolution} P ${config.pullbackPercent}% Y ${config.reboundPercent}% W ${config.windowSessions}`, async () => {
      const run = await load(symbol, from, to, {
        ...defaultTradingParams,
        resolution,
        continuation: config as ContinuationConfig
      });
      const reference = referenceClassic(run);
      const pick = (t: VirtualTrade) => tradeFields.map((f) => t[f]);

      assert.deepEqual(run.simulation.trades.map(pick), reference.trades.filter((t) => t.entryIndex >= 0).map(pick));

      const growthSetups = run.simulation.continuation!.book.machine.setupLog.map((x) => [
        x.kind,
        x.activationTime,
        x.activationPrice,
        x.status
      ]);
      const referenceSetups = reference.machine.setupLog.map((x) => [
        x.kind,
        x.activationTime,
        x.activationPrice,
        x.status
      ]);

      assert.deepEqual(growthSetups, referenceSetups);
      assert.equal(
        run.simulation.continuation!.book.machine.continuationWindows,
        reference.machine.continuationWindows
      );
      assert.equal(
        run.simulation.continuation!.book.machine.continuationExpiries,
        reference.machine.continuationExpiries
      );
      assert.ok(reference.machine.setupLog.length > 0, 'the path arms at least once');
    });
});
