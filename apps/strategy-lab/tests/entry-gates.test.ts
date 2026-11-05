// Growth 1.2.0 entry gates in Strategy Lab: the registry (defaults OFF, applicability of each method's and policy's
// inputs, bounds, the S < L rule, the OFF branch as a valid optimiser candidate, the conditional search space), request
// validation and variation identity, the 1.2.0 entry-gate phenotype export (import + ONE rerun with provenance), and
// (real data) one gated run through the real job manager and runner: its assumptions, the decision records reconciled
// with the trade ledger, the research bundle (contents, determinism), an exact replay and the comparison with OFF.

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { importPhenotypes } from '../importers/phenotypes.ts';
import { compareRuns } from '../server/compare.ts';
import { type Config, loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { buildResearchBundle } from '../server/export.ts';
import { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { replayStoredRun } from '../server/replay.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import { readZip } from '../server/zip.ts';
import type { DecisionsFile } from '../shared/artifact-types.ts';
import type { ParamValue } from '../shared/contract.ts';
import { effectiveParams, isActive, sampleCandidate, searchSpaceOf, seededRandom, validateParams, variationIdentity } from '../shared/params.ts';
import {
  ELIGIBILITY_PARAM_KEYS,
  RISE_FROM_RECENT_LOW_TRADING as G,
  TREND_PARAM_KEYS,
  ENTRY_METHOD_PARAM_KEYS,
  INITIAL_STOP_PARAM_KEYS,
  RETENTION_PARAM_KEYS,
  defaultParams,
  validateRunRequest
} from '../shared/strategies.ts';

const TREND_FIELDS: Record<string, string[]> = {
  price_change: ['trendChangeLookbackSessions', 'trendChangeMinimumReturnPercent'],
  regression_slope: ['trendSlopeLookbackSessions', 'trendSlopeMinimumPercent'],
  rising_sma: ['trendSmaSessions', 'trendSmaComparisonSessions'],
  higher_highs_lows: ['trendStructureLookbackSessions', 'trendStructureMinimumIncreasePercent'],
  momentum: ['trendMomentumShortSessions', 'trendMomentumLongSessions', 'trendMomentumMinimumShortReturnPercent', 'trendMomentumMinimumLongReturnPercent']
};
const POLICY_FIELDS: Record<string, string[]> = {
  time_limited: [],
  minimum_strength: ['eligibilityMinimumAdvancePercent'],
  maximum_extension: ['eligibilityMaximumExtensionPercent'],
  deterioration: ['eligibilityDeteriorationDropPercent'],
  reset_renew: ['eligibilityResetDropPercent', 'eligibilityRenewalReboundPercent']
};
const D = defaultParams(G);
const active = (v: Record<string, ParamValue>) => [...TREND_PARAM_KEYS, ...ELIGIBILITY_PARAM_KEYS].filter((k) => isActive(G, v, k)).sort();
const symbols = new Set(['VGT', 'GDX']);
const req = (params: Record<string, ParamValue>, over: Record<string, unknown> = {}) => ({
  strategyKey: G.key,
  strategyVersion: G.version,
  params,
  symbols: ['VGT'],
  from: '2020-01-02',
  to: '2020-12-31',
  resolution: '1d',
  ...over
});

describe('the registry: both gates OFF by default, only the chosen inputs apply', () => {
  it('defaults OFF; OFF executes only the two switches; each method / policy activates exactly its inputs', () => {
    expect(D).toMatchObject({ trendFilterEnabled: false, eligibilityEnabled: false, trendMethod: 'price_change', eligibilityPolicy: 'time_limited', eligibilityMaxAgeSessions: 10 });
    expect(active(D)).toEqual(['eligibilityEnabled', 'trendFilterEnabled']);
    for (const [m, keys] of Object.entries(TREND_FIELDS))
      expect(active({ ...D, trendFilterEnabled: true, trendMethod: m })).toEqual(['eligibilityEnabled', 'trendFilterEnabled', 'trendMethod', ...keys].sort());
    for (const [p, keys] of Object.entries(POLICY_FIELDS))
      expect(active({ ...D, eligibilityEnabled: true, eligibilityPolicy: p })).toEqual(
        ['eligibilityEnabled', 'eligibilityMaxAgeSessions', 'eligibilityPolicy', 'trendFilterEnabled', ...keys].sort()
      );
  });

  it('inactive drafts never change the variation identity (no fake sensitivity)', () => {
    const off = variationIdentity(G, D, '1d');
    expect(variationIdentity(G, { ...D, trendMethod: 'momentum', trendMomentumShortSessions: 9, eligibilityPolicy: 'reset_renew', eligibilityResetDropPercent: 7 }, '1d')).toBe(off);
    const a = variationIdentity(G, { ...D, trendFilterEnabled: true, trendMethod: 'price_change', trendSmaSessions: 77 }, '1d');
    expect(a).toBe(variationIdentity(G, { ...D, trendFilterEnabled: true, trendMethod: 'price_change' }, '1d'));
    expect(a).not.toBe(off);
  });

  it('validation: the switches are required, bounds and S < L are enforced; 1.1.0 runs only as a phenotype', () => {
    expect(validateRunRequest(req(D), symbols)).toEqual([]);
    const noSwitch = Object.fromEntries(Object.entries(D).filter(([k]) => k !== 'trendFilterEnabled'));
    expect(validateRunRequest(req(noSwitch), symbols).join()).toMatch(/Entry trend filter: must be on or off/);
    const momentum = { ...D, trendFilterEnabled: true, trendMethod: 'momentum', trendMomentumShortSessions: 60 };
    expect(validateRunRequest(req(momentum), symbols).join()).toMatch(/short lookback S must be below the long lookback L/);
    expect(validateRunRequest(req({ ...momentum, trendMomentumShortSessions: 5 }), symbols)).toEqual([]);
    expect(validateRunRequest(req({ ...D, eligibilityEnabled: true, eligibilityMaxAgeSessions: 0 }), symbols).join()).toMatch(/between 1 and 120/);
    expect(validateRunRequest(req({ ...D, eligibilityEnabled: true, eligibilityPolicy: 'forever' }), symbols).join()).toMatch(/Eligibility policy: one of/);
    const later = [...TREND_PARAM_KEYS, ...ELIGIBILITY_PARAM_KEYS, ...ENTRY_METHOD_PARAM_KEYS, ...INITIAL_STOP_PARAM_KEYS, ...RETENTION_PARAM_KEYS];
    const v110 = { ...req(effectiveParams(G, D)), strategyVersion: '1.1.0', params: Object.fromEntries(Object.entries(D).filter(([k]) => !later.includes(k))) };
    expect(validateRunRequest(v110, symbols).join()).toMatch(/not runnable \(superseded by 1\.3\.0/);
    expect(validateRunRequest(v110, symbols, 'phenotype')).toEqual([]);
  });

  it('the conditional search space: switches, methods, policies and their inputs, the OFF branch a valid candidate', () => {
    const space = searchSpaceOf(G);
    const dim = (k: string) => space.dimensions.find((d) => d.key === k)!;
    expect(dim('trendFilterEnabled').domain).toEqual({ values: [false, true] });
    expect(dim('eligibilityEnabled').domain).toEqual({ values: [false, true] });
    expect(dim('trendMethod').domain).toEqual({ values: Object.keys(TREND_FIELDS) });
    expect(dim('eligibilityPolicy').domain).toEqual({ values: Object.keys(POLICY_FIELDS) });
    expect(dim('trendSmaSessions').activeWhen).toEqual({ param: 'trendMethod', equals: 'rising_sma' });
    expect(dim('eligibilityMaxAgeSessions').activeWhen).toEqual({ param: 'eligibilityEnabled', equals: true });
    expect(dim('trendChangeLookbackSessions').domain).toMatchObject({ min: 5, max: 120, step: 5 });
    const seen = { off: 0, methods: new Set<string>(), policies: new Set<string>() };
    for (let seed = 1; seed <= 400; seed++) {
      const c = sampleCandidate(G, seededRandom(seed), { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 });
      expect(validateParams(G, c)).toEqual([]);
      expect(effectiveParams(G, c)).toEqual(c); // no inactive dimension in a candidate
      if (c.trendFilterEnabled === false && c.eligibilityEnabled === false) seen.off++;
      if (c.trendFilterEnabled) seen.methods.add(String(c.trendMethod));
      if (c.eligibilityEnabled) seen.policies.add(String(c.eligibilityPolicy));
    }
    expect(seen.off).toBeGreaterThan(0);
    expect([...seen.methods].sort()).toEqual(Object.keys(TREND_FIELDS).sort());
    expect([...seen.policies].sort()).toEqual(Object.keys(POLICY_FIELDS).sort());
  });
});

describe('the 1.2.0 entry-gate phenotype export: import and ONE rerun with provenance', () => {
  let state: string;
  let repo: Repo;
  let service: LabService;
  const enqueued: string[] = [];
  beforeAll(() => {
    state = mkdtempSync(join(tmpdir(), 'strategy-lab-gates-ph-'));
    const cfg = loadConfig({ STRATEGY_LAB_STATE_DIR: state, STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
    repo = new Repo(openDb(cfg.dbFile));
    const jobs = { enqueue: (_id: number, pid: string) => enqueued.push(pid), cancel: () => false, activeCount: 0 } as unknown as Jobs;
    service = new LabService(repo, cfg, jobs, new MarketPrices(cfg.repoRoot));
    service.knownSymbols = () => symbols;
    importPhenotypes(cfg, repo, join(import.meta.dirname, '../fixtures/phenotypes/growth-gates-demo-2026-11'));
    importPhenotypes(cfg, repo, join(import.meta.dirname, '../fixtures/phenotypes/growth-demo-2026-11'));
  });
  afterAll(() => {
    repo.db.close();
    rmSync(state, { recursive: true, force: true });
  });

  it('imports the gated phenotypes; one rerun carries their switches, methods and policies and the phenotype provenance', () => {
    const list = repo.listPhenotypes({});
    const gated = list.filter((p) => p.studyRef === 'growth-gates-demo-2026-11');
    expect(gated).toHaveLength(3);
    const ph = repo.phenotypeDetail(gated[0]!.id)!;
    expect(service.capabilityOf(ph)).toMatchObject({ runnable: true, runner: 'growth-trading' });
    const r = service.createPhenotypeRun(ph.id, { from: '2020-01-02', to: '2020-12-31' });
    expect(r && 'runId' in r).toBe(true);
    const run = repo.runDetail((r as { runId: string }).runId)!;
    expect(run.strategy.version).toBe('1.2.0');
    expect(repo.runRequest(run.id)).toMatchObject({ params: { trendFilterEnabled: true, trendMethod: 'price_change', eligibilityEnabled: true, eligibilityPolicy: 'time_limited' } });
    expect(run.phenotype).toMatchObject({ id: ph.id, edited: false });
    expect(run.assumptions.find((a) => a.key === 'trendFilter')!.value).toMatch(/^ON — A — N-session price change/);
    expect(run.assumptions.find((a) => a.key === 'eligibility')!.value).toMatch(/^ON — 1 — Time-limited opportunity, maximum age 10 trading sessions/);
    expect(run.variation.title).toMatch(/trend A N 20 ≥ 0% · latch 1 W 10/);
  });

  it('a 1.1.0 phenotype still reruns as a 1.1.0 configuration (never silently reinterpreted)', () => {
    const ph = repo.listPhenotypes({}).find((p) => p.key === 'growth-demo-2026-11/breakout-vgt-1d')!;
    const cap = service.capabilityOf(repo.phenotypeDetail(ph.id)!);
    expect(cap).toMatchObject({ runnable: true, runner: 'growth-trading' });
    expect(cap.reason).toMatch(/a 1\.1\.0 configuration, rerun as 1\.1\.0/);
    const r = service.createPhenotypeRun(ph.id, { from: '2020-01-02', to: '2020-12-31' }) as { runId: string };
    const run = repo.runDetail(r.runId)!;
    expect(run.strategy.version).toBe('1.1.0');
    expect(Object.keys((repo.runRequest(run.id) as { params: object }).params)).not.toContain('trendFilterEnabled');
    expect(run.assumptions.map((a) => a.key)).not.toContain('trendFilter');
  });
});

const hasData = existsSync(join(REPO_ROOT, 'data/VGT/data.csv'));

describe.skipIf(!hasData)('(real data) one gated Growth run: records, bundle, replay, comparison', () => {
  let c: Config;
  let repo: Repo;
  let service: LabService;
  const wait = async (id: string) => {
    const end = Date.now() + 120_000;
    while (!['completed', 'failed'].includes(repo.runDetail(id)!.status)) {
      if (Date.now() > end) throw new Error('timeout');
      await new Promise((r) => setTimeout(r, 200));
    }
    return repo.runDetail(id)!;
  };
  const start = async (params: Record<string, ParamValue>) => {
    const r = service.createManualRun(req(params, { symbols: ['VGT', 'GDX'], from: '2016-01-04', to: '2023-12-29' }));
    if ('errors' in r) throw new Error(r.errors.join('; '));
    return wait(r.runId);
  };
  beforeAll(() => {
    c = loadConfig({ STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-gates-real-')), STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
    repo = new Repo(openDb(c.dbFile));
    service = new LabService(repo, c, new Jobs(repo, c), new MarketPrices(c.repoRoot));
  });
  afterAll(() => repo.db.close());

  it('records every decision, reconciles with the ledger, exports deterministically, replays exactly, compares with OFF', async () => {
    const on = await start({ ...D, trendFilterEnabled: true, eligibilityEnabled: true, eligibilityPolicy: 'reset_renew' });
    expect(on.error).toBeNull();
    const dir = join(c.stateDir, on.artifactDir!);
    const decisions = JSON.parse(readFileSync(join(dir, 'decisions.json'), 'utf8')) as DecisionsFile & { trendFilter: unknown; eligibility: unknown };
    const trades = JSON.parse(readFileSync(join(dir, 'trades.json'), 'utf8')) as { trades: Record<string, { trade: string; net: number; entrySource: string }[]> };
    const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8')) as { perSymbol: Record<string, { entryGates: { eligibility: { endedBy: Record<string, number> } }; signals: { raw: number } }>; trendFilter: { enabled: boolean } };
    expect(metrics.trendFilter.enabled).toBe(true);
    for (const symbol of ['VGT', 'GDX']) {
      const d = decisions.perSymbol![symbol]!;
      const byTrade = new Map(trades.trades[symbol]!.map((t) => [t.trade, t]));
      for (const x of d.entryDecisions!) if (x.trade && byTrade.has(x.trade)) expect(x.netUsd).toBe(Math.round(byTrade.get(x.trade)!.net * 100) / 100);
      expect(d.entryDecisions!.filter((x) => x.kind === 'crossing')).toHaveLength(metrics.perSymbol[symbol]!.signals.raw);
      const ended: Record<string, number> = {};
      for (const o of d.opportunities!) ended[o.end.state!] = (ended[o.end.state!] ?? 0) + 1;
      for (const [k, n] of Object.entries(metrics.perSymbol[symbol]!.entryGates.eligibility.endedBy)) expect(ended[k] ?? 0, k).toBe(n);
      // every consumed opportunity's trade carries its source: the signal itself when taken at arming, else latched
      for (const o of d.opportunities!.filter((o) => o.end.state === 'consumed'))
        expect(byTrade.get(o.trade!)!.entrySource).toBe(o.decision!.utc === o.signal.utc ? o.source : `latched:${o.source}`);
    }
    // the bundle: the gate files, verified hashes, deterministic bytes
    const a = buildResearchBundle(c, repo, on.id);
    const b = buildResearchBundle(c, repo, on.id);
    expect(a.zip.equals(b.zip)).toBe(true);
    const zip = readZip(a.zip);
    for (const f of ['entry-decisions.csv', 'opportunities.csv', 'entry-gates.md', 'trades.csv', 'decision-log.csv']) expect(zip.has(f), f).toBe(true);
    expect(zip.get('entry-gates.md')!.toString()).toContain('Eligibility (reset_renew)');
    const tradeRows = zip.get('trades.csv')!.toString().trim().split('\n').length - 1;
    expect(tradeRows).toBe(trades.trades.VGT!.length + trades.trades.GDX!.length);
    // an exact replay with the current runner reproduces every artifact
    const scratch = join(mkdtempSync(join(tmpdir(), 'strategy-lab-gates-replay-')), on.id);
    const { verdicts } = replayStoredRun(REPO_ROOT, dir, scratch, 'apps/strategy-lab/runner/trading-run.ts', 'exact');
    expect(verdicts.map((v) => [v.file, v.identical])).toEqual([
      ['trades.json', true],
      ['daily.json', true],
      ['metrics.json', true],
      ['decisions.json', true],
      ['events.json', true]
    ]);
    // the comparison with the otherwise identical OFF run: methodologically comparable, the gate states named
    const off = await start(D);
    const cmp = compareRuns(c, repo, off.id, on.id) as { comparable: boolean; a: { trendFilter: string; eligibility: string }; b: { trendFilter: string; eligibility: string } };
    expect(cmp.comparable).toBe(true);
    expect([cmp.a.trendFilter, cmp.a.eligibility]).toEqual(['OFF', 'OFF']);
    expect(cmp.b.trendFilter).toBe('ON (price_change)');
    expect(cmp.b.eligibility).toBe('ON (reset_renew, W 10)');
  }, 300_000);
});
