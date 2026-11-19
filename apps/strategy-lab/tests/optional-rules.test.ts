// Growth 1.3.0 optional rules in Strategy Lab: the registry (three namespaces, OFF / the Rise entry by default, only the
// chosen inputs apply, eligibility not applicable to the breakout), variation identity and snapshots (inactive values
// are drafts), the unchanged stored schemas of 1.0.0–1.2.0, the run request → engine mapping from EFFECTIVE values, the
// browser trade model of a position sold in several fills, Interactive Preview of the new options and of the
// effective-only OFF states (the 1.2.0 "buffer OFF" failure), and — on real data — one run with the three options:
// events, ledger, decision records, the research bundle (exit-fills.csv, optional-rules.md), an exact replay and the
// comparison with Candidate A as the OFF control.

import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { paramsOf } from '../runner/growth-params.ts';
import { compareRuns } from '../server/compare.ts';
import { type Config, loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { buildResearchBundle } from '../server/export.ts';
import { Jobs } from '../server/jobs.ts';
import { PreviewError, PreviewService } from '../server/previews.ts';
import { MarketPrices } from '../server/prices.ts';
import { replayStoredRun } from '../server/replay.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import { readZip } from '../server/zip.ts';
import type { LabEvent, LabRunRequest, ParamValue } from '../shared/contract.ts';
import type { PreviewTicketStatus } from '../shared/preview.ts';
import { effectiveParams, isActive, noteShown, paramSnapshot, schemaOf, variationIdentity } from '../shared/params.ts';
import {
  defaultParams,
  RISE_FROM_RECENT_LOW_TRADING as G,
  RISE_FROM_RECENT_LOW_TRADING_1_0_0,
  RISE_FROM_RECENT_LOW_TRADING_1_1_0,
  RISE_FROM_RECENT_LOW_TRADING_1_2_0,
  validateRunRequest
} from '../shared/strategies.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { glyphSvg, isPartialExit } from '../src/chart/markers.ts';
import { buildTrades } from '../src/trades.ts';

const D = defaultParams(G);
const symbols = new Set(['VGT', 'GDX']);
const req = (params: Record<string, ParamValue>, over: Record<string, unknown> = {}): LabRunRequest =>
  ({ strategyKey: G.key, strategyVersion: G.version, params, symbols: ['VGT'], from: '2023-01-03', to: '2023-06-30', resolution: '1d', ...over }) as LabRunRequest;
const BREAKOUT = { entryMethod: 'trend_breakout' } as const;
const STOP = { initialStopEnabled: true } as const;
const RETAIN = { retentionEnabled: true } as const;
// Candidate A (the research control of the brief): Growth with X 8% N 60, stop 4%, hold 15 days, trend filter C 50/40.
const CANDIDATE_A = {
  ...D,
  advanceFromRecentLowPercent: 8,
  recentLowLookbackBars: 60,
  trailingStopPercent: 4,
  maximumHoldDays: 15,
  trendFilterEnabled: true,
  trendMethod: 'rising_sma',
  trendSmaSessions: 50,
  trendSmaComparisonSessions: 40
};

describe('the registry: three namespaces, OFF by default, only the chosen inputs apply', () => {
  it('defaults: the Rise entry, the initial risk stop OFF, retention OFF; the brief’s starting values', () => {
    expect(D).toMatchObject({
      entryMethod: 'rise_from_recent_low',
      breakoutSmaSessions: 50,
      breakoutSlopeComparisonSessions: 40,
      breakoutPriorHighSessions: 20,
      initialStopEnabled: false,
      initialStopAtrSessions: 20,
      initialStopAtrMultiple: 3,
      retentionEnabled: false,
      retentionSellPercent: 50,
      retentionSmaSessions: 50,
      retentionClosesBelow: 2
    });
    // the defaults execute exactly the earlier version's effective configuration plus the three switches
    const eff = effectiveParams(G, D);
    expect(Object.keys(eff).filter((k) => /^(breakout|initialStop[A-Z]|retention[A-Z])/.test(k) && !/Enabled$/.test(k))).toEqual([]);
    expect(eff).toMatchObject({ entryMethod: 'rise_from_recent_low', initialStopEnabled: false, retentionEnabled: false });
  });

  it('applicability: X/N only for the Rise entry, the breakout inputs only for the breakout, each option’s inputs only ON', () => {
    const b = { ...D, ...BREAKOUT };
    expect([isActive(G, D, 'advanceFromRecentLowPercent'), isActive(G, b, 'advanceFromRecentLowPercent')]).toEqual([true, false]);
    expect([isActive(G, D, 'breakoutSmaSessions'), isActive(G, b, 'breakoutSmaSessions')]).toEqual([false, true]);
    expect([isActive(G, D, 'initialStopAtrMultiple'), isActive(G, { ...D, ...STOP }, 'initialStopAtrMultiple')]).toEqual([false, true]);
    expect([isActive(G, D, 'retentionClosesBelow'), isActive(G, { ...D, ...RETAIN }, 'retentionClosesBelow')]).toEqual([false, true]);
    // persistent eligibility is Rise-specific: disabled (recorded as not applicable) with the breakout, its chain too
    expect(isActive(G, { ...b, eligibilityEnabled: true }, 'eligibilityEnabled')).toBe(false);
    expect(isActive(G, { ...b, eligibilityEnabled: true }, 'eligibilityMaxAgeSessions')).toBe(false);
    expect(G.params.find((p) => p.key === 'eligibilityEnabled')!.whenInactive).toBe('disable');
    expect(noteShown(G, b, G.groupNotes!.find((n) => n.id === 'eligibility-not-applicable')!.when)).toBe(true);
    expect(noteShown(G, D, G.groupNotes!.find((n) => n.id === 'eligibility-not-applicable')!.when)).toBe(false);
    // the trend filter stays an independent, separately labelled gate for either method
    expect(isActive(G, { ...b, trendFilterEnabled: true, trendMethod: 'rising_sma' }, 'trendSmaSessions')).toBe(true);
    expect(G.groups.find((g) => g.key === 'trend')!.title).toMatch(/additional gate/);
    expect(G.params.find((p) => p.key === 'breakoutSmaSessions')!.label).toMatch(/intrinsic/);
    // the observation timing is stated in the help
    expect(G.params.find((p) => p.key === 'breakoutSmaSessions')!.description).toMatch(/completed daily close.*next eligible trade/);
  });

  it('validation: each option alone and every combination is valid; bounds are enforced; eligibility under the breakout is a draft', () => {
    for (const b of [{}, BREAKOUT])
      for (const s of [{}, STOP])
        for (const r of [{}, RETAIN]) expect(validateRunRequest(req({ ...D, ...b, ...s, ...r }), symbols)).toEqual([]);
    expect(validateRunRequest(req({ ...D, ...RETAIN, retentionSellPercent: 100 }), symbols).join()).toMatch(/Fraction sold.*between 1 and 99/);
    expect(validateRunRequest(req({ ...D, ...STOP, initialStopAtrMultiple: 0 }), symbols).join()).toMatch(/between 0.1 and 20/);
    expect(validateRunRequest(req({ ...D, ...STOP, initialStopAtrSessions: 0 }), symbols).join()).toMatch(/ATR lookback/);
    expect(validateRunRequest(req({ ...D, entryMethod: 'other' }), symbols).join()).toMatch(/Entry method: one of/);
    // a switch is required (an old 1.2.0-shaped request is not silently a 1.3.0 one)
    const noSwitch = Object.fromEntries(Object.entries(D).filter(([k]) => k !== 'initialStopEnabled'));
    expect(validateRunRequest(req(noSwitch), symbols).join()).toMatch(/Initial risk stop: must be on or off/);
    expect(validateRunRequest(req({ ...D, ...BREAKOUT, eligibilityEnabled: true }), symbols)).toEqual([]);
  });

  it('identity: inactive drafts never change the variation; each option and input that executes does', () => {
    const id = (p: Record<string, unknown>) => variationIdentity(G, p, '1d');
    expect(id({ ...D, initialStopAtrMultiple: 2, retentionSellPercent: 30, breakoutSmaSessions: 70 })).toBe(id(D));
    expect(id({ ...D, ...BREAKOUT, advanceFromRecentLowPercent: 9, eligibilityEnabled: true })).toBe(id({ ...D, ...BREAKOUT }));
    const ids = [id(D), id({ ...D, ...STOP }), id({ ...D, ...STOP, initialStopAtrMultiple: 2 }), id({ ...D, ...RETAIN }), id({ ...D, ...BREAKOUT })];
    expect(new Set(ids).size).toBe(ids.length);
    // the snapshot labels an inactive draft "saved, not applied"
    const snap = paramSnapshot(G, { ...D, initialStopAtrMultiple: 2 });
    expect(snap.find((v) => v.key === 'initialStopAtrMultiple')!.label).toMatch(/saved, not applied/);
    expect(snap.find((v) => v.key === 'initialStopEnabled')!.value).toBe('OFF');
  });

  it('the stored schemas of the earlier versions are byte-identical to before (their snapshots keep their meaning)', () => {
    const h = (s: typeof G) => createHash('sha256').update(JSON.stringify(schemaOf(s))).digest('hex');
    // computed from apps/strategy-lab/shared/*.ts at commit 8d2800e (before this change)
    expect(h(RISE_FROM_RECENT_LOW_TRADING_1_2_0)).toBe('f43f851009693871e3b47fe28ae36cf2c31d68d41bffd81ff36a3f07b088f642');
    expect(h(RISE_FROM_RECENT_LOW_TRADING_1_1_0)).toBe('43c1fa822d5b05d36f055ffb70ceeebd44aa1078162a21a84dc5316ba8b57afb');
    expect(h(RISE_FROM_RECENT_LOW_TRADING_1_0_0)).toBe('59e72ed4f3a7c1b9a8847308ff4d6f940ba28d115879d44fa74dedb50d77e495');
    expect(RISE_FROM_RECENT_LOW_TRADING_1_2_0.launch).toBe('phenotype');
  });

  it('the run request maps from EFFECTIVE values: drafts or their absence execute identically; OFF states are valid', () => {
    // the 1.2.0 failure: the buffer OFF (or the hold OFF) with the inactive values absent, as Interactive Preview sends
    const offs: Record<string, ParamValue>[] = [{ intradayLossBufferEnabled: false }, { maximumHoldEnabled: false, intradayLossBufferEnabled: false }];
    for (const off of offs) {
      const all = req({ ...D, ...off });
      const only = req(effectiveParams(G, all.params));
      expect(Object.keys(only.params)).not.toContain('intradayLossBufferPercent');
      const a = paramsOf(all);
      const b = paramsOf(only);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      for (const v of ['1.0.0', '1.1.0', '1.2.0']) {
        const spec = [RISE_FROM_RECENT_LOW_TRADING_1_0_0, RISE_FROM_RECENT_LOW_TRADING_1_1_0, RISE_FROM_RECENT_LOW_TRADING_1_2_0].find((s) => s.version === v)!;
        const legacy = { ...req(Object.fromEntries(Object.entries({ ...D, ...off }).filter(([k]) => spec.params.some((p) => p.key === k))) as Record<string, ParamValue>), strategyVersion: v };
        expect(() => paramsOf({ ...legacy, params: effectiveParams(spec, legacy.params) })).not.toThrow();
      }
    }
    const on = paramsOf(req({ ...D, ...BREAKOUT, ...STOP, ...RETAIN, initialStopAtrMultiple: 2 }));
    expect(on).toMatchObject({
      entryMethod: 'trend_breakout',
      breakout: { smaSessions: 50, slopeComparisonSessions: 40, priorHighSessions: 20 },
      initialStop: { atrSessions: 20, atrMultiple: 2 },
      retention: { sellPercent: 50, smaSessions: 50, closesBelow: 2 }
    });
    expect(Number.isNaN(on.advanceFromRecentLowPercent)).toBe(true); // the Rise inputs are not executed
    // with the three OFF, no 1.3.0 field reaches the engine (the earlier versions' mapping exactly)
    expect(Object.keys(paramsOf(req(D)))).not.toEqual(expect.arrayContaining(['entryMethod']));
    expect(Object.keys(paramsOf(req(D))).some((k) => ['initialStop', 'retention', 'breakout'].includes(k))).toBe(false);
  });
});

describe('the browser trade model of a position sold in several fills', () => {
  const ev = (over: Partial<LabEvent>): LabEvent =>
    ({ runId: 'R-1', symbol: 'VGT', timePrecision: 'minute', timeMeaning: 'x', priceBasis: 'fill', reason: 'r', values: [], meta: {}, linkedEventId: null, ...over }) as LabEvent;
  const entry = ev({ id: 'VGT:T-1:entry', kind: 'executed_entry', t: '2020-01-02T14:30:00Z', price: 100, tradeId: 'T-1', linkedEventId: 'VGT:T-1:exit', values: [{ key: 'principal', label: 'p', value: 100000, unit: 'usd' }] });
  const partial = ev({ id: 'VGT:T-1:partial-1', kind: 'executed_exit', t: '2020-01-10T15:00:00Z', price: 110, tradeId: 'T-1', linkedEventId: 'VGT:T-1:entry', meta: { partial: true, fill: 1 }, values: [{ key: 'fillNet', label: 'n', value: 4900, unit: 'usd' }] });
  const final = ev({ id: 'VGT:T-1:exit', kind: 'executed_exit', t: '2020-01-20T14:30:00Z', price: 95, tradeId: 'T-1', linkedEventId: 'VGT:T-1:entry', values: [{ key: 'net', label: 'n', value: -300, unit: 'usd' }, { key: 'exitReason', label: 'e', value: 'Trend-retention exit', unit: 'text' }] });

  it('the final exit is the trade’s exit; partial fills are listed apart; the net is the whole position’s', () => {
    const t = buildTrades([entry, partial, final], 'VGT', 'A', 'R-1', null).get('T-1')!;
    expect([t.status, t.problem, t.exit?.id, t.partials.map((p) => p.id), t.pnl?.netUsd, t.exitReason]).toEqual([
      'closed',
      null,
      'VGT:T-1:exit',
      ['VGT:T-1:partial-1'],
      -300,
      'Trend-retention exit'
    ]);
    expect(isPartialExit(partial)).toBe(true);
    expect(glyphSvg('executed_exit', 'A', 'loss', 14, true)).toContain('data-partial="true"');
  });

  it('an open remainder after a partial fill: open, its P&L the whole open position from the run’s mark', () => {
    const open = { ...entry, linkedEventId: null, meta: { open: true } };
    const metrics = { kind: 'trading backtest', perSymbol: { VGT: { pnl: { unrealized: { netUsd: 1200, partialFillsNetUsd: 4900, positionNetUsd: 6100, markDate: '2020-02-01' } } } } };
    const t = buildTrades([open, partial], 'VGT', 'A', 'R-1', metrics).get('T-1')!;
    expect([t.status, t.partials.length, t.pnl?.netUsd, t.pnl?.unrealized]).toEqual(['open', 1, 6100, true]);
    expect(t.pnl!.basis).toMatch(/partial fill\(s\) realized \+\$4,900\.00 \+ the remainder marked/);
  });
});

const hasData = existsSync(join(REPO_ROOT, 'data/VGT/data.csv'));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!hasData)('(real data) the three options: one run, records, bundle, replay, comparison; previews', () => {
  let c: Config;
  let repo: Repo;
  let service: LabService;
  let previews: PreviewService;
  const wait = async (id: string) => {
    const end = Date.now() + 180_000;
    while (!['completed', 'failed'].includes(repo.runDetail(id)!.status)) {
      if (Date.now() > end) throw new Error('timeout');
      await sleep(200);
    }
    return repo.runDetail(id)!;
  };
  const start = async (params: Record<string, ParamValue>) => {
    const r = service.createManualRun(req(params, { from: '2016-01-04', to: '2026-10-30' }));
    if ('errors' in r) throw new Error(r.errors.join('; '));
    return wait(r.runId);
  };
  const settle = async (s: PreviewTicketStatus) => {
    let cur = s;
    for (let i = 0; i < 1800 && (cur.state === 'queued' || cur.state === 'running'); i++) {
      await sleep(100);
      cur = previews.status(cur.ticket);
    }
    return cur;
  };
  beforeAll(() => {
    c = loadConfig({ STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-optional-')), STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
    repo = new Repo(openDb(c.dbFile));
    service = new LabService(repo, c, new Jobs(repo, c), new MarketPrices(c.repoRoot));
    previews = new PreviewService(c, repo, service, () => undefined);
    previews.init();
  });
  afterAll(() => {
    previews.stop();
    repo.db.close();
  });

  it('Candidate A + retention + the initial stop: partial fills, one trade per position, the bundle, an exact replay', async () => {
    const on = await start({ ...CANDIDATE_A, ...STOP, ...RETAIN });
    expect(on.error).toBeNull();
    expect(on.strategy.version).toBe(G.version);
    const dir = join(c.stateDir, on.artifactDir!);
    const events = (JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8')) as { events: LabEvent[] }).events;
    expect(validateEvents(events, on.id, ['VGT'])).toEqual([]);
    type Row = { trade: string; status: string; net: number; exitReason: string; exitFills: { partial: boolean; net: number; shares: number; principalRepaid: number; interestPaid: number }[]; shares: number; principal: number; partialFillsNet: number; initialStop: { level: number } | null };
    const rows = (JSON.parse(readFileSync(join(dir, 'trades.json'), 'utf8')) as { trades: { VGT: Row[] } }).trades.VGT;
    const partials = events.filter((e) => e.meta.partial === true);
    expect(partials.length).toBeGreaterThan(0);
    expect(partials.length).toBe(rows.reduce((n, r) => n + r.exitFills.filter((f) => f.partial).length, 0));
    const built = buildTrades(events, 'VGT', 'A', on.id, on.metrics);
    for (const row of rows) {
      // the fills add up to the position: shares, principal, net; the position net is the final exit's `net`
      const sold = row.exitFills.reduce((a, f) => a + f.shares, 0);
      if (row.status === 'closed') expect(Math.abs(sold - row.shares)).toBeLessThan(1e-9);
      expect(Math.abs(row.exitFills.reduce((a, f) => a + f.principalRepaid, 0) - (row.status === 'closed' ? row.principal : row.principal - (row as unknown as { remainderOpen: { principal: number } }).remainderOpen.principal))).toBeLessThan(1e-6);
      expect(row.initialStop).not.toBeNull();
      const t = built.get(row.trade)!;
      expect(t.problem).toBeNull();
      expect(t.partials.length).toBe(row.exitFills.filter((f) => f.partial).length);
      if (row.status === 'closed') expect(t.pnl!.netUsd).toBe(Math.round(row.net * 100) / 100);
    }
    const m = on.metrics as { perSymbol: { VGT: { trades: { closed: number }; optionalRules: { retention: { partialFills: number }; initialStop: { protectedPositions: number } }; checks: Record<string, number> } }; initialStop: { enabled: boolean }; retention: { enabled: boolean } };
    expect(m.initialStop.enabled && m.retention.enabled).toBe(true);
    expect(m.perSymbol.VGT.trades.closed).toBe(rows.filter((r) => r.status === 'closed').length); // positions, not fills
    expect(m.perSymbol.VGT.optionalRules.retention.partialFills).toBe(partials.length);
    expect(m.perSymbol.VGT.optionalRules.initialStop.protectedPositions).toBe(rows.length);
    expect(m.perSymbol.VGT.checks.fixedLedgerMaxDifferenceUsd).toBeLessThan(1e-6);
    // the decision log explains each partial and each trend exit
    const decisions = JSON.parse(readFileSync(join(dir, 'decisions.json'), 'utf8')) as { perSymbol: { VGT: { log: { event: string }[]; optionalRules: { positions: unknown[] } } } };
    expect(decisions.perSymbol.VGT.log.filter((x) => x.event === 'partial_exit')).toHaveLength(partials.length);
    expect(decisions.perSymbol.VGT.log.filter((x) => x.event === 'initial_stop_set')).toHaveLength(rows.length);
    expect(decisions.perSymbol.VGT.optionalRules.positions).toHaveLength(rows.length);
    // the bundle: exit-fills.csv (one row per fill) and optional-rules.md; deterministic bytes
    const a = buildResearchBundle(c, repo, on.id);
    expect(a.zip.equals(buildResearchBundle(c, repo, on.id).zip)).toBe(true);
    const zip = readZip(a.zip);
    expect(zip.get('exit-fills.csv')!.toString().trim().split('\n').length - 1).toBe(rows.reduce((n, r) => n + r.exitFills.length, 0));
    expect(zip.get('optional-rules.md')!.toString()).toMatch(/Retention: \d+ position\(s\) with a partial sale/);
    expect(zip.get('trades.csv')!.toString()).toMatch(/ONE position closed in 2 fills/);
    // an exact replay with the current runner reproduces every artifact
    const scratch = join(mkdtempSync(join(tmpdir(), 'strategy-lab-optional-replay-')), on.id);
    const { verdicts } = replayStoredRun(REPO_ROOT, dir, scratch, 'apps/strategy-lab/runner/trading-run.ts', 'exact');
    expect(verdicts.every((v) => v.identical)).toBe(true);
    // the comparison with Candidate A (OFF): comparable, the options named
    const off = await start(CANDIDATE_A);
    const cmp = compareRuns(c, repo, off.id, on.id) as unknown as { comparable: boolean; a: Record<string, string>; b: Record<string, string> };
    expect(cmp.comparable).toBe(true);
    expect([cmp.a.initialStop, cmp.a.retention, cmp.a.entryMethod]).toEqual(['OFF', 'OFF', 'Rise from recent low']);
    expect([cmp.b.initialStop, cmp.b.retention]).toEqual(['ON (3 × ATR 20)', 'ON (sell 50%, 2 close(s) < SMA 50)']);
  }, 600_000);

  it('the breakout entry: each signal once (rejected while invested, never replayed); eligibility recorded as not applicable', async () => {
    const r = await start({ ...CANDIDATE_A, ...BREAKOUT, eligibilityEnabled: true });
    expect(r.error).toBeNull();
    const dir = join(c.stateDir, r.artifactDir!);
    const events = (JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8')) as { events: LabEvent[] }).events;
    const signals = events.filter((e) => e.meta.entryMethod === 'trend_breakout' && (e.kind === 'entry_signal' || e.kind === 'rejected_signal'));
    expect(new Set(signals.map((e) => e.t)).size).toBe(signals.length);
    const taken = signals.filter((e) => e.kind === 'entry_signal');
    expect(taken.length).toBe(events.filter((e) => e.kind === 'executed_entry').length);
    expect(signals.every((e) => e.timePrecision === 'session-close')).toBe(true);
    expect(r.assumptions.find((a) => a.key === 'eligibility')!.value).toMatch(/not applicable/);
    expect(r.params.find((v) => v.key === 'eligibilityEnabled')!.label).toMatch(/saved, not applied/);
    expect(String(r.title)).not.toMatch(/latch/);
  }, 600_000);

  it('Interactive Preview: the new options, the effective-only OFF states and a refused configuration', async () => {
    const base = { ...req({}, { from: '2019-01-02', to: '2021-12-31' }) };
    const run = async (params: Record<string, ParamValue>) => settle(previews.submit({ request: { ...base, params } }));
    const all = await run(effectiveParams(G, { ...D, ...BREAKOUT, ...STOP, ...RETAIN }));
    expect(all.state, all.error ?? '').toBe('completed');
    // the same configuration with drafts is ONE identity: an immediate cache hit, never a second execution
    const again = await run({ ...D, ...BREAKOUT, ...STOP, ...RETAIN, advanceFromRecentLowPercent: 9 });
    expect([again.state, again.cacheHit, again.previewId]).toEqual(['completed', true, all.previewId]);
    expect(previews.detail(all.previewId!).strategy.version).toBe(G.version);
    // the 1.2.0 failure: buffer OFF / hold OFF with only the effective values — now executed
    const offs: Record<string, ParamValue>[] = [{ intradayLossBufferEnabled: false }, { maximumHoldEnabled: false, intradayLossBufferEnabled: false }];
    for (const off of offs) {
      const p = await run(effectiveParams(G, { ...D, ...off }));
      expect(p.state, p.error ?? '').toBe('completed');
    }
    // an invalid configuration is refused with its reason (nothing executes)
    expect(() => previews.submit({ request: { ...base, params: { ...D, ...RETAIN, retentionSellPercent: 100 } } })).toThrow(PreviewError);
  }, 600_000);
});
