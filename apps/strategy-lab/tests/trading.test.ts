// The trading backtest ("Growth") in Strategy Lab: its registry entries (1.4.0 current, 1.3.0, 1.2.0, 1.1.0 and 1.0.0 legacy with their
// frozen schemas; defaults = the engine's, no post-loss restriction controls), switch validation and the buffer → hold dependency,
// immutable variations and runs through the API (create, clone, toggle), the effective-state snapshot, the runner
// allowlist — and that the signal-only strategy records exactly what it did.

import { mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { LabValue, NumericParamSpec, ParamValue, RunDetail } from '../shared/contract.ts';
import { constraintErrors, isActive } from '../shared/params.ts';
import {
  canonicalParams,
  defaultParams,
  findStrategy,
  RISE_FROM_RECENT_LOW,
  RISE_FROM_RECENT_LOW_TRADING,
  RISE_FROM_RECENT_LOW_TRADING_1_0_0,
  RISE_FROM_RECENT_LOW_TRADING_1_2_0,
  RUNNABLE_STRATEGIES,
  STRATEGY_REGISTRY,
  validateRunRequest
} from '../shared/strategies.ts';
import { loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { createHandler } from '../server/http.ts';
import { PreviewService } from '../server/previews.ts';
import { RUNNER_SCRIPT, RUNNER_SCRIPTS, type Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';

const T = RISE_FROM_RECENT_LOW_TRADING;
const LEGACY = RISE_FROM_RECENT_LOW_TRADING_1_0_0;
const symbols = new Set(['VGT', 'GDX']);
const tradingParams = (over: Record<string, ParamValue> = {}) => ({ ...defaultParams(T), ...over });
const request = (over: Record<string, unknown> = {}) => ({
  strategyKey: T.key,
  strategyVersion: T.version,
  params: tradingParams(),
  symbols: ['VGT'],
  from: '2023-01-03',
  to: '2023-06-30',
  resolution: '1d',
  ...over
});

describe('registry', () => {
  it('offers the unchanged signal-only strategy and the new trading backtest, separately versioned', () => {
    expect(RUNNABLE_STRATEGIES.map((s) => `${s.key}@${s.version}:${s.kind}`)).toEqual([
      'rise-from-recent-low@1.0.0:entry_signal',
      'rise-from-recent-low-trading@1.4.0:trades'
    ]);
    // Every registered version, with how it may be launched: one visible "Growth"; 1.3.0, 1.2.0 and 1.1.0 kept as legacy whose
    // catalogue phenotypes still rerun (launch: phenotype), 1.0.0 kept as legacy (not launchable).
    expect(STRATEGY_REGISTRY.map((s) => `${s.key}@${s.version}:${s.launch}:${s.title}`)).toEqual([
      'rise-from-recent-low@1.0.0:form:Rise from recent low (entry signal)',
      'rise-from-recent-low-trading@1.4.0:form:Growth',
      'rise-from-recent-low-trading@1.3.0:phenotype:Growth',
      'rise-from-recent-low-trading@1.2.0:phenotype:Growth',
      'rise-from-recent-low-trading@1.1.0:phenotype:Growth',
      'rise-from-recent-low-trading@1.0.0:none:Growth',
      'study8-d1-pool@pools-engine:phenotype:Study 8 D1 shared-slot pool (pools engine)',
      'demo-toy-rules@1.0.0:none:Demo toy rules (synthetic)'
    ]);
    expect(LEGACY.legacy?.supersededBy).toBe('1.4.0');
    expect(findStrategy(T.key, '1.1.0')!.legacy?.supersededBy).toBe('1.4.0');
    expect(findStrategy(T.key, '1.2.0')!.legacy?.supersededBy).toBe('1.4.0');
    expect(findStrategy(T.key, '1.3.0')!.legacy?.supersededBy).toBe('1.4.0');
    expect(T.formerTitles).toEqual(['Rise from recent low (trading backtest)']);
    // The signal-only strategy's schema is exactly what its runs recorded (keys, defaults, ranges, resolutions).
    expect((RISE_FROM_RECENT_LOW.params as NumericParamSpec[]).map((p) => [p.key, p.type, p.unit, p.default, p.min, p.max, p.step])).toEqual([
      ['advanceFromRecentLowPercent', 'number', 'percent', 5, 0.1, 100, 0.1],
      ['recentLowLookbackBars', 'integer', 'bars', 20, 2, 5000, 1]
    ]);
    expect(RISE_FROM_RECENT_LOW.params.every((p) => p.group === undefined && p.activeWhen === undefined)).toBe(true);
    expect(RISE_FROM_RECENT_LOW.resolutions).toEqual(['1d', '60m', '30m', '15m', '5m', '1m']);
    expect(canonicalParams(defaultParams(RISE_FROM_RECENT_LOW)) + '|1d').toBe(
      '{"advanceFromRecentLowPercent":5,"recentLowLookbackBars":20}|1d'
    );
  });

  // (src/growth-trading/tests/riseTrading.test.ts checks that these equal the engine's defaultTradingParams.)
  it('trading defaults are the VGT D1 baseline exits; X and N are the scanner’s own; continuation OFF', () => {
    // 1.0.0 keeps exactly its eight parameters; 1.1.0 = the same eight + the continuation dimensions, OFF by default.
    expect(defaultParams(LEGACY)).toEqual({
      advanceFromRecentLowPercent: 5,
      recentLowLookbackBars: 20,
      trailingStopPercent: 7.3,
      maximumHoldEnabled: true,
      maximumHoldDays: 8,
      intradayLossBufferEnabled: true,
      intradayLossBufferPercent: 2.9,
      costBpsPerSide: 5
    });
    expect(Object.fromEntries(Object.entries(defaultParams(T)).filter(([k]) => k in defaultParams(LEGACY)))).toEqual(
      defaultParams(LEGACY)
    );
    expect(defaultParams(T)).toMatchObject({
      continuationEnabled: false,
      continuationMethod: 'classic_d1',
      continuationWindowSessions: 60,
      classicPullbackPercent: 9,
      classicReboundPercent: 0.3
    });
    // 1.2.0 (legacy) starts with the scanner's X and N as they were; 1.3.0 puts the entry-method selector first and X
    // and N apply to the Rise entry only (its default): the same specs, plus their applicability.
    expect(RISE_FROM_RECENT_LOW_TRADING_1_2_0.params.slice(0, 2).map(({ group: _g, ...p }) => p)).toEqual(RISE_FROM_RECENT_LOW.params);
    expect(T.params[0]).toMatchObject({ key: 'entryMethod', type: 'enum', default: 'rise_from_recent_low' });
    expect(T.params.slice(1, 3).map(({ group: _g, activeWhen: _a, whenInactive: _w, ...p }) => p)).toEqual(RISE_FROM_RECENT_LOW.params);
    expect(defaultParams(T)).toMatchObject({ entryMethod: 'rise_from_recent_low', initialStopEnabled: false, retentionEnabled: false });
    expect(T.defaultResolution).toBe('1d');
  });

  // The cancelled post-LOSS restriction (material loss, lower re-entry level, recovery reset) stays absent. Growth 1.2.0's
  // eligibility policy 5 (reset and renew) concerns an UNCONSUMED opportunity, never a trade's loss, and is OFF by default.
  it('has a mandatory trailing stop (no switch) and NO post-loss restriction or lower re-entry controls', () => {
    const keys = T.params.map((p) => p.key);
    expect(keys).toContain('trailingStopPercent');
    expect(keys).not.toContain('trailingStopEnabled');
    expect(T.params.find((p) => p.key === 'trailingStopPercent')!.activeWhen).toBeUndefined();
    // Growth 1.4.0's Drawdown Recovery Gate is a filter on the MARKET's decline (a retracement of a price dip), never a
    // trade's loss: its five inputs are exactly these, and the guard applies to everything else.
    const drawdownKeys = ['drawdownRecoveryGateEnabled', 'dipLookbackSessions', 'dipThresholdPercent', 'recoveryRetracementPercent', 'recoveryConfirmationSessions'];
    expect(T.params.filter((p) => p.group === 'drawdownGate').map((p) => p.key)).toEqual(drawdownKeys);
    expect(
      JSON.stringify({ ...T, params: T.params.filter((p) => p.group !== 'drawdownGate'), groups: T.groups.filter((g) => g.key !== 'drawdownGate'), groupNotes: T.groupNotes?.filter((n) => n.group !== 'drawdownGate'), notes: T.notes?.filter((n) => !n.startsWith('Drawdown Recovery Gate')), description: '' })
    ).not.toMatch(/material|lowerPrice|lower re-?entry level|retrace|recoveryReset|reference high/i);
    expect(T.params.filter((p) => p.type === 'boolean').map((p) => [p.key, p.default])).toEqual([
      ['trendFilterEnabled', false],
      ['eligibilityEnabled', false],
      ['drawdownRecoveryGateEnabled', false],
      ['maximumHoldEnabled', true],
      ['intradayLossBufferEnabled', true],
      ['initialStopEnabled', false],
      ['retentionEnabled', false],
      ['continuationEnabled', false]
    ]);
  });
});

describe('validation of switches and dependencies', () => {
  it('accepts the defaults and every valid ON/OFF combination; refuses the buffer without the hold', () => {
    expect(validateRunRequest(request(), symbols)).toEqual([]);
    const combos = [
      [true, true, true],
      [true, false, true],
      [false, false, true],
      [false, true, false]
    ] as const;
    for (const [hold, buffer, ok] of combos) {
      const errors = validateRunRequest(
        request({ params: tradingParams({ maximumHoldEnabled: hold, intradayLossBufferEnabled: buffer }) }),
        symbols
      );
      expect(errors.length === 0, `${hold}/${buffer}`).toBe(ok);
      if (!ok) expect(errors.join(' ')).toMatch(/applies only from the maximum losing-hold age/);
    }
  });

  it('refuses switches that are not booleans, values out of range, missing and unknown parameters', () => {
    const bad = [
      tradingParams({ maximumHoldEnabled: 'true' as unknown as boolean }),
      tradingParams({ maximumHoldEnabled: 1 as unknown as boolean }),
      tradingParams({ trailingStopPercent: 0 }),
      tradingParams({ trailingStopPercent: 51 }),
      tradingParams({ maximumHoldDays: 2.5 }),
      tradingParams({ intradayLossBufferPercent: -0.1 }),
      tradingParams({ costBpsPerSide: 101 }),
      tradingParams({ materialLossThreshold: 1 }),
      (({ trailingStopPercent: _t, ...rest }) => rest)(tradingParams())
    ];
    for (const params of bad) expect(validateRunRequest(request({ params }), symbols).length).toBeGreaterThan(0);
    expect(validateRunRequest(request({ params: [tradingParams(), tradingParams()] }), symbols).length).toBeGreaterThan(
      0
    );
  });

  it('a value whose switch is off is saved but not applied; the applicability chain follows activeWhen', () => {
    const off = tradingParams({ maximumHoldEnabled: false, intradayLossBufferEnabled: false });
    expect(isActive(T, off, 'maximumHoldDays')).toBe(false);
    expect(isActive(T, off, 'intradayLossBufferPercent')).toBe(false);
    expect(isActive(T, off, 'trailingStopPercent')).toBe(true);
    const noBuffer = tradingParams({ intradayLossBufferEnabled: false });
    expect(isActive(T, noBuffer, 'maximumHoldDays')).toBe(true);
    expect(isActive(T, noBuffer, 'intradayLossBufferPercent')).toBe(false);
    // the chain: the buffer percent applies only while its switch applies, i.e. while the hold is on
    expect(isActive(T, tradingParams({ maximumHoldEnabled: false, intradayLossBufferEnabled: true }), 'intradayLossBufferPercent')).toBe(false);
    expect(constraintErrors(RISE_FROM_RECENT_LOW, { maximumHoldEnabled: false, intradayLossBufferEnabled: true })).toEqual([]);
    for (const spec of [T, LEGACY])
      expect(constraintErrors(spec, { maximumHoldEnabled: false, intradayLossBufferEnabled: true })[0]).toMatch(
        /maximum losing-hold age/
      );
  });
});

describe('the runner allowlist', () => {
  it('maps each runnable strategy to one fixed script and nothing else', () => {
    expect(RUNNER_SCRIPTS).toEqual({
      'rise-from-recent-low': RUNNER_SCRIPT,
      'rise-from-recent-low-trading': 'apps/strategy-lab/runner/trading-run.ts',
      'study8-d1-pool': 'apps/strategy-lab/runner/pool-run.ts'
    });
    expect(RUNNER_SCRIPT).toBe('apps/strategy-lab/runner/entry-signal-run.ts');
    expect(Object.keys(RUNNER_SCRIPTS).sort()).toEqual([
      ...new Set(STRATEGY_REGISTRY.filter((s) => s.launch !== 'none').map((s) => s.key))
    ].sort());
    expect(Object.hasOwn(RUNNER_SCRIPTS, '__proto__')).toBe(false);
  });
});

describe('HTTP API: one configuration, immutable variations and runs', () => {
  let server: Server;
  let base: string;
  const enqueued: string[] = [];

  beforeAll(async () => {
    const cfg = loadConfig({
      STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-trading-')),
      STRATEGY_LAB_STATIC_DIR: '',
      STRATEGY_LAB_SEED_DEMO: '0'
    });
    const repo = new Repo(openDb(cfg.dbFile));
    const jobs = { enqueue: (_id: number, pid: string) => enqueued.push(pid), cancel: () => false, activeCount: 0 };
    const prices = new MarketPrices(cfg.repoRoot);
    const service = new LabService(repo, cfg, jobs as unknown as Jobs, prices);
    const handler = createHandler({ cfg, repo, jobs: jobs as unknown as Jobs, prices, service, previews: new PreviewService(cfg, repo, service), log: () => {} });
    server = createServer((req, res) => void handler(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => server.close());

  type Run = RunDetail & { request: Record<string, unknown> };
  const post = async (body: unknown) => {
    const res = await fetch(`${base}/api/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { status: res.status, body: (await res.json()) as Run & { error?: string; details?: string[] } };
  };
  const get = async (id: string) => (await (await fetch(`${base}/api/runs/${id}`)).json()) as Run;
  const value = (params: LabValue[], key: string) => params.find((p) => p.key === key);

  it('saves every value and its effective ON/OFF state; an inactive value is labelled "not applied"', async () => {
    const on = await post(request({ title: 'defaults' }));
    expect(on.status).toBe(201);
    expect(value(on.body.params, 'maximumHoldEnabled')!.value).toBe('ON');
    expect(value(on.body.params, 'maximumHoldDays')).toMatchObject({ value: 8, unit: 'days' });
    expect(value(on.body.params, 'maximumHoldDays')!.label).not.toMatch(/not applied/);
    expect(on.body.variation.title).toBe(
      'Growth · X 5% · N 20 bars · 1d · stop 7.3% · hold 8d · buffer 2.9% · 5 bps · continuation off'
    );
    expect(on.body.strategy).toMatchObject({ key: 'rise-from-recent-low-trading', version: '1.4.0', title: 'Growth' });
    expect(on.body.assumptions.map((a) => a.key)).toEqual([
      'kind',
      'entry',
      'continuation',
      'trendFilter',
      'eligibility',
      'initialStop',
      'retention',
      'drawdownGate',
      'position',
      'reentry',
      'stop',
      'hold',
      'buffer',
      'interest',
      'costs',
      'fills',
      'marks',
      'bars',
      'signalTime',
      'lookback',
      'trigger',
      'access'
    ]);
    const off = await post(
      request({ params: tradingParams({ maximumHoldEnabled: false, intradayLossBufferEnabled: false }) })
    );
    expect(off.status).toBe(201);
    expect(value(off.body.params, 'maximumHoldEnabled')!.value).toBe('OFF');
    expect(value(off.body.params, 'maximumHoldDays')).toMatchObject({ value: 8 });
    expect(value(off.body.params, 'maximumHoldDays')!.label).toMatch(/saved, not applied/);
    expect(value(off.body.params, 'intradayLossBufferPercent')!.label).toMatch(/saved, not applied/);
    expect(String(value(off.body.assumptions, 'hold')!.value)).toMatch(/OFF: no loss exit .* open/);
    expect(off.body.variation.id).not.toBe(on.body.variation.id);
    expect((await get(off.body.id)).request.params).toMatchObject({ maximumHoldEnabled: false, maximumHoldDays: 8 });
    const codePaths = (off.body.codeRevision as { paths?: string[] }).paths ?? [];
    expect(codePaths).toEqual(
      expect.arrayContaining(['src/growth-trading', 'src/shared-margin-portfolio/strategy.ts'])
    );
  });

  it('refuses the unsatisfiable buffer-without-hold configuration before anything is queued', async () => {
    const before = enqueued.length;
    const bad = await post(request({ params: tradingParams({ maximumHoldEnabled: false }) }));
    expect(bad.status).toBe(400);
    expect(bad.body.details!.join(' ')).toMatch(/maximum losing-hold age/);
    expect(enqueued.length).toBe(before);
  });

  it('clone 5% → 6% creates a new variation and run; the old run and variation are unchanged', async () => {
    const a = (await post(request({ title: 'five' }))).body;
    const b = (
      await post(
        request({
          title: 'six',
          params: tradingParams({ advanceFromRecentLowPercent: 6 }),
          parentVariation: a.variation.id
        })
      )
    ).body;
    const again = (await post(request({ title: 'five again' }))).body;
    expect(b.variation.id).not.toBe(a.variation.id);
    expect(b.id).not.toBe(a.id);
    expect(again.variation.id).toBe(a.variation.id); // same configuration → same variation, a new run
    expect(again.id).not.toBe(a.id);
    const old = await get(a.id);
    expect(value(old.params, 'advanceFromRecentLowPercent')!.value).toBe(5);
    expect(old.request.params).toEqual(tradingParams());
    expect(value(b.params, 'advanceFromRecentLowPercent')!.value).toBe(6);
  });

  it('the signal-only strategy records exactly the snapshot, title and assumptions it always did', async () => {
    const s = await post({
      strategyKey: RISE_FROM_RECENT_LOW.key,
      strategyVersion: RISE_FROM_RECENT_LOW.version,
      params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 },
      symbols: ['VGT'],
      from: '2023-01-03',
      to: '2023-06-30',
      resolution: '1d'
    });
    expect(s.status).toBe(201);
    expect(s.body.params).toEqual([
      { key: 'advanceFromRecentLowPercent', label: 'Advance from recent low (X)', value: 5, unit: 'percent' },
      { key: 'recentLowLookbackBars', label: 'Recent-low lookback (N)', value: 20, unit: 'bars' },
      { key: 'resolution', label: 'Bar resolution', value: '1d', unit: 'text' }
    ]);
    expect(s.body.variation.title).toBe('X 5% · N 20 bars · 1d');
    expect(s.body.assumptions.map((a) => a.key)).toEqual([
      'signalOnly',
      'bars',
      'signalTime',
      'lookback',
      'trigger',
      'outcomes',
      'access'
    ]);
    expect((s.body.codeRevision as { paths: string[] }).paths).toEqual([
      'src/entry-signals',
      'src/lib',
      'apps/strategy-lab/runner',
      'apps/strategy-lab/shared'
    ]);
    expect(findStrategy('rise-from-recent-low', '1.0.0')).toBe(RISE_FROM_RECENT_LOW);
  });
});
