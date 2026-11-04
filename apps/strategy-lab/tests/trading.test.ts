// The trading backtest in Strategy Lab: its registry entry (defaults = the engine's, no restriction controls), switch
// validation and the buffer → hold dependency, immutable variations and runs through the API (create, clone, toggle),
// the effective-state snapshot, the runner allowlist — and that the signal-only strategy records exactly what it did.

import { mkdtempSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { LabValue, ParamValue, RunDetail } from '../shared/contract.ts';
import {
  canonicalParams,
  crossParamErrors,
  defaultParams,
  findStrategy,
  isParamApplied,
  RISE_FROM_RECENT_LOW,
  RISE_FROM_RECENT_LOW_TRADING,
  RUNNABLE_STRATEGIES,
  validateRunRequest
} from '../shared/strategies.ts';
import { loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { createHandler } from '../server/http.ts';
import { RUNNER_SCRIPT, RUNNER_SCRIPTS, type Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';

const T = RISE_FROM_RECENT_LOW_TRADING;
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
      'rise-from-recent-low-trading@1.0.0:trades'
    ]);
    // The signal-only strategy's schema is exactly what its runs recorded (keys, defaults, ranges, resolutions).
    expect(RISE_FROM_RECENT_LOW.params.map((p) => [p.key, p.type, p.unit, p.default, p.min, p.max, p.step])).toEqual([
      ['advanceFromRecentLowPercent', 'number', 'percent', 5, 0.1, 100, 0.1],
      ['recentLowLookbackBars', 'integer', 'bars', 20, 2, 5000, 1]
    ]);
    expect(RISE_FROM_RECENT_LOW.params.every((p) => p.group === undefined && p.dependsOn === undefined)).toBe(true);
    expect(RISE_FROM_RECENT_LOW.resolutions).toEqual(['1d', '60m', '30m', '15m', '5m', '1m']);
    expect(canonicalParams(defaultParams(RISE_FROM_RECENT_LOW)) + '|1d').toBe(
      '{"advanceFromRecentLowPercent":5,"recentLowLookbackBars":20}|1d'
    );
  });

  // (src/growth-trading/tests/riseTrading.test.ts checks that these equal the engine's defaultTradingParams.)
  it('trading defaults are the VGT D1 baseline exits; X and N are the scanner’s own', () => {
    expect(defaultParams(T)).toEqual({
      advanceFromRecentLowPercent: 5,
      recentLowLookbackBars: 20,
      trailingStopPercent: 7.3,
      maximumHoldEnabled: true,
      maximumHoldDays: 8,
      intradayLossBufferEnabled: true,
      intradayLossBufferPercent: 2.9,
      costBpsPerSide: 5
    });
    expect(T.params.slice(0, 2).map(({ group: _g, ...p }) => p)).toEqual(RISE_FROM_RECENT_LOW.params);
    expect(T.defaultResolution).toBe('1d');
  });

  it('has a mandatory trailing stop (no switch) and NO restriction, lower re-entry or reset controls', () => {
    const keys = T.params.map((p) => p.key);
    expect(keys).toContain('trailingStopPercent');
    expect(keys).not.toContain('trailingStopEnabled');
    expect(T.params.find((p) => p.key === 'trailingStopPercent')!.dependsOn).toBeUndefined();
    expect(JSON.stringify(T)).not.toMatch(
      /material|lowerPrice|lower re-?entry level|retrace|recoveryReset|reference high/i
    );
    expect(T.params.filter((p) => p.type === 'boolean').map((p) => [p.key, p.default])).toEqual([
      ['maximumHoldEnabled', true],
      ['intradayLossBufferEnabled', true]
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

  it('a value whose switch is off is saved but not applied; the chain follows dependsOn', () => {
    const off = tradingParams({ maximumHoldEnabled: false, intradayLossBufferEnabled: false });
    expect(isParamApplied(T, off, 'maximumHoldDays')).toBe(false);
    expect(isParamApplied(T, off, 'intradayLossBufferPercent')).toBe(false);
    expect(isParamApplied(T, off, 'trailingStopPercent')).toBe(true);
    const noBuffer = tradingParams({ intradayLossBufferEnabled: false });
    expect(isParamApplied(T, noBuffer, 'maximumHoldDays')).toBe(true);
    expect(isParamApplied(T, noBuffer, 'intradayLossBufferPercent')).toBe(false);
    expect(
      crossParamErrors(RISE_FROM_RECENT_LOW, { maximumHoldEnabled: false, intradayLossBufferEnabled: true })
    ).toEqual([]);
  });
});

describe('the runner allowlist', () => {
  it('maps each runnable strategy to one fixed script and nothing else', () => {
    expect(RUNNER_SCRIPTS).toEqual({
      'rise-from-recent-low': RUNNER_SCRIPT,
      'rise-from-recent-low-trading': 'apps/strategy-lab/runner/trading-run.ts'
    });
    expect(RUNNER_SCRIPT).toBe('apps/strategy-lab/runner/entry-signal-run.ts');
    expect(Object.keys(RUNNER_SCRIPTS).sort()).toEqual(RUNNABLE_STRATEGIES.map((s) => s.key).sort());
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
    const handler = createHandler({ cfg, repo, jobs: jobs as unknown as Jobs, prices, service, log: () => {} });
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
    expect(on.body.variation.title).toBe('Trading · X 5% · N 20 bars · 1d · stop 7.3% · hold 8d · buffer 2.9% · 5 bps');
    expect(on.body.assumptions.map((a) => a.key)).toEqual([
      'kind',
      'entry',
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
