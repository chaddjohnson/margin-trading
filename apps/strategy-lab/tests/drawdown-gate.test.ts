// Growth 1.4.0 Drawdown Recovery Gate in Strategy Lab: the registry (one switch, OFF by default, four inputs that apply
// only ON, typed bounds, conditional search space), variation identity (inactive inputs are drafts), the unchanged
// stored schemas of 1.0.0–1.3.0, the request → engine mapping from EFFECTIVE values, the run profile texts — and, on
// real data (the training partition, already explored): one run with the gate and persistent eligibility ON (events,
// trades, decision records, metrics, the research bundle, an exact replay, the comparison with the OFF control), and
// Interactive Preview (the gate in the cache identity, drafts never in it, no saved run created).

import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { drawdownGateOf, paramsOf } from '../runner/growth-params.ts';
import { compareRuns } from '../server/compare.ts';
import { type Config, loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { buildResearchBundle } from '../server/export.ts';
import { Jobs } from '../server/jobs.ts';
import { PreviewService } from '../server/previews.ts';
import { MarketPrices } from '../server/prices.ts';
import { replayStoredRun } from '../server/replay.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import { readZip } from '../server/zip.ts';
import type { DecisionsFile } from '../shared/artifact-types.ts';
import type { LabEvent, LabRunRequest, ParamValue } from '../shared/contract.ts';
import type { PreviewTicketStatus } from '../shared/preview.ts';
import { effectiveParams, isActive, noteShown, paramSnapshot, schemaOf, searchSpaceOf, variationIdentity } from '../shared/params.ts';
import {
  defaultParams,
  DRAWDOWN_GATE_PARAM_KEYS,
  RISE_FROM_RECENT_LOW_TRADING as G,
  RISE_FROM_RECENT_LOW_TRADING_1_3_0,
  validateRunRequest
} from '../shared/strategies.ts';
import { validateEvents } from '../shared/validate-events.ts';

const D = defaultParams(G);
const symbols = new Set(['VGT', 'GDX']);
const req = (params: Record<string, ParamValue>, over: Record<string, unknown> = {}): LabRunRequest =>
  ({ strategyKey: G.key, strategyVersion: G.version, params, symbols: ['VGT'], from: '2023-01-03', to: '2023-06-30', resolution: '1d', ...over }) as LabRunRequest;
const GATE = { drawdownRecoveryGateEnabled: true } as const;

describe('the registry: one optional switch, OFF by default, its inputs only ON', () => {
  it('defaults and the group: OFF; N 30, d 5%, r 70%, Y 2 (illustrative); hidden inputs when OFF', () => {
    expect(G.version).toBe('1.4.0');
    expect(DRAWDOWN_GATE_PARAM_KEYS).toEqual(['drawdownRecoveryGateEnabled', 'dipLookbackSessions', 'dipThresholdPercent', 'recoveryRetracementPercent', 'recoveryConfirmationSessions']);
    expect(D).toMatchObject({ drawdownRecoveryGateEnabled: false, dipLookbackSessions: 30, dipThresholdPercent: 5, recoveryRetracementPercent: 70, recoveryConfirmationSessions: 2 });
    expect(G.groups.find((g) => g.key === 'drawdownGate')!.title).toBe('Drawdown Recovery Gate (optional)');
    for (const k of DRAWDOWN_GATE_PARAM_KEYS.slice(1)) {
      const p = G.params.find((x) => x.key === k)!;
      expect([p.group, p.whenInactive, p.activeWhen]).toEqual(['drawdownGate', 'hide', { param: 'drawdownRecoveryGateEnabled', equals: true }]);
      expect([isActive(G, D, k), isActive(G, { ...D, ...GATE }, k)]).toEqual([false, true]);
    }
    // percentages are percentage points, sessions are integers (documented units)
    const unit = (k: string) => G.params.find((x) => x.key === k)!.unit;
    expect([unit('dipLookbackSessions'), unit('dipThresholdPercent'), unit('recoveryRetracementPercent'), unit('recoveryConfirmationSessions')]).toEqual(['sessions', 'percent', 'percent', 'sessions']);
    // the notes: the state machine when ON; the "never replayed" consequence with eligibility OFF
    const note = (id: string) => G.groupNotes!.find((n) => n.id === id)!.when;
    expect([noteShown(G, D, note('drawdown-gate-note')), noteShown(G, { ...D, ...GATE }, note('drawdown-gate-note'))]).toEqual([false, true]);
    expect(noteShown(G, { ...D, ...GATE }, note('drawdown-gate-eligibility-off'))).toBe(true);
    expect(noteShown(G, { ...D, ...GATE, eligibilityEnabled: true }, note('drawdown-gate-eligibility-off'))).toBe(false);
    // the help text explains the full-decline retracement, the session-interval clock and that it never signals
    const help = (k: string) => G.params.find((x) => x.key === k)!.description;
    expect(help('recoveryRetracementPercent')).toMatch(/Peak 100, trough 90, r 70% → 97 — not 70% above the trough/);
    expect(help('recoveryConfirmationSessions')).toMatch(/Monday 11:15, Y = 2 → Wednesday 11:15/);
    expect(help('drawdownRecoveryGateEnabled')).toMatch(/never an entry signal of its own/);
  });

  it('validation: typed bounds; Y = 0 and r = 100 allowed; the switch is required on a 1.4.0 request', () => {
    const on = { ...D, ...GATE };
    expect(validateRunRequest(req(on), symbols)).toEqual([]);
    const oks: Record<string, ParamValue>[] = [{ recoveryConfirmationSessions: 0 }, { recoveryRetracementPercent: 100 }, { dipLookbackSessions: 1 }, { dipLookbackSessions: 500 }, { dipThresholdPercent: 90 }, { recoveryConfirmationSessions: 60 }];
    for (const ok of oks)
      expect(validateRunRequest(req({ ...on, ...ok }), symbols)).toEqual([]);
    for (const [bad, msg] of [
      [{ dipLookbackSessions: 0 }, /Dip lookback/],
      [{ dipLookbackSessions: 2.5 }, /Dip lookback/],
      [{ dipThresholdPercent: 0 }, /Significant decline/],
      [{ recoveryRetracementPercent: 0 }, /Required retracement/],
      [{ recoveryRetracementPercent: 100.1 }, /Required retracement/],
      [{ recoveryConfirmationSessions: -1 }, /Confirmation/],
      [{ recoveryConfirmationSessions: 61 }, /Confirmation/]
    ] as const)
      expect(validateRunRequest(req({ ...on, ...bad }), symbols).join()).toMatch(msg);
    // an out-of-range draft of an OFF gate is not executed — and a switched-OFF value is still checked as saved
    const noSwitch = Object.fromEntries(Object.entries(D).filter(([k]) => k !== 'drawdownRecoveryGateEnabled'));
    expect(validateRunRequest(req(noSwitch), symbols).join()).toMatch(/Drawdown Recovery Gate: must be on or off/);
  });

  it('variation identity and snapshots: an OFF gate’s inputs are drafts; ON, each input changes what executes', () => {
    const id = (v: Record<string, ParamValue>) => variationIdentity(G, v, '1d');
    expect(id({ ...D, dipLookbackSessions: 90, recoveryRetracementPercent: 50 })).toBe(id(D));
    const ons = [id({ ...D, ...GATE }), id({ ...D, ...GATE, dipLookbackSessions: 60 }), id({ ...D, ...GATE, dipThresholdPercent: 8 }), id({ ...D, ...GATE, recoveryRetracementPercent: 100 }), id({ ...D, ...GATE, recoveryConfirmationSessions: 0 })];
    expect(new Set([id(D), ...ons]).size).toBe(6);
    const snap = paramSnapshot(G, { ...D, dipLookbackSessions: 90 });
    expect(snap.find((v) => v.key === 'dipLookbackSessions')!.label).toMatch(/saved, not applied/);
    expect(snap.find((v) => v.key === 'drawdownRecoveryGateEnabled')!.value).toBe('OFF');
  });

  it('the conditional search space for a future CLI optimiser: ON/OFF and the four inputs under ON (nothing searched here)', () => {
    const dims = Object.fromEntries(searchSpaceOf(G).dimensions.map((d) => [d.key, d]));
    expect(dims.drawdownRecoveryGateEnabled!.domain).toEqual({ values: [false, true] });
    expect(dims.drawdownRecoveryGateEnabled!.activeWhen).toBeNull();
    for (const k of DRAWDOWN_GATE_PARAM_KEYS.slice(1)) expect(dims[k]!.activeWhen).toEqual({ param: 'drawdownRecoveryGateEnabled', equals: true });
    expect(dims.recoveryConfirmationSessions!.domain).toMatchObject({ min: 0, step: 1 });
  });

  it('the stored schemas of the earlier versions are byte-identical to before (1.3.0 is now legacy, phenotype-launchable)', () => {
    const h = (s: typeof G) => createHash('sha256').update(JSON.stringify(schemaOf(s))).digest('hex');
    // computed from apps/strategy-lab/shared/*.ts at commit d13148a (before this change)
    expect(h(RISE_FROM_RECENT_LOW_TRADING_1_3_0)).toBe('a2cca0659b8793c54852cf1e62a80dbe715d9d245944e2c4bf1d320dc7311654');
    expect(RISE_FROM_RECENT_LOW_TRADING_1_3_0.launch).toBe('phenotype');
    expect(RISE_FROM_RECENT_LOW_TRADING_1_3_0.legacy?.supersededBy).toBe('1.4.0');
    expect(RISE_FROM_RECENT_LOW_TRADING_1_3_0.params.some((p) => p.key === 'drawdownRecoveryGateEnabled')).toBe(false);
  });

  it('the request maps from EFFECTIVE values: OFF (with drafts) adds no engine field; ON maps the four inputs; 1.3.0 requests are OFF', () => {
    const off = paramsOf(req({ ...D, dipLookbackSessions: 90 }));
    expect('drawdownGate' in off).toBe(false);
    expect(paramsOf(req(effectiveParams(G, D)))).toEqual(off);
    const on = paramsOf(req({ ...D, ...GATE, dipLookbackSessions: 45, recoveryConfirmationSessions: 0 }));
    expect(on.drawdownGate).toEqual({ lookbackSessions: 45, dipThresholdPercent: 5, recoveryRetracementPercent: 70, confirmationSessions: 0 });
    expect(paramsOf(req(effectiveParams(G, { ...D, ...GATE, dipLookbackSessions: 45, recoveryConfirmationSessions: 0 })))).toEqual(on);
    const v130 = { ...req({}), strategyVersion: '1.3.0', params: Object.fromEntries(Object.entries(D).filter(([k]) => !DRAWDOWN_GATE_PARAM_KEYS.includes(k))) };
    expect(validateRunRequest(v130, symbols, 'phenotype')).toEqual([]);
    expect(drawdownGateOf(v130 as LabRunRequest)).toBeNull();
    expect('drawdownGate' in paramsOf(v130 as LabRunRequest)).toBe(false);
  });
});

const hasData = ['VGT', 'GDX'].every((s) => existsSync(join(REPO_ROOT, 'data', s, 'data.csv')));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!hasData)('(real data, training partition) the gate ON: records, bundle, replay, comparison; previews', () => {
  let c: Config;
  let repo: Repo;
  let service: LabService;
  let previews: PreviewService;
  const wait = async (id: string) => {
    const end = Date.now() + 240_000;
    while (!['completed', 'failed'].includes(repo.runDetail(id)!.status)) {
      if (Date.now() > end) throw new Error('timeout');
      await sleep(200);
    }
    return repo.runDetail(id)!;
  };
  const start = async (params: Record<string, ParamValue>, over: Record<string, unknown> = {}) => {
    const r = service.createManualRun(req(params, { symbols: ['VGT', 'GDX'], from: '2016-01-04', to: '2019-12-31', ...over }));
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
    c = loadConfig({ STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-drawdown-')), STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
    repo = new Repo(openDb(c.dbFile));
    service = new LabService(repo, c, new Jobs(repo, c), new MarketPrices(c.repoRoot));
    previews = new PreviewService(c, repo, service, () => undefined);
    previews.init();
  });
  afterAll(() => {
    previews.stop();
    repo.db.close();
  });

  it('gate + persistent eligibility: causal records, release decisions intraday, the bundle, an exact replay, the OFF control', async () => {
    const params = { ...D, ...GATE, eligibilityEnabled: true, eligibilityPolicy: 'time_limited' };
    const on = await start(params);
    expect(on.error).toBeNull();
    expect(on.variation.title).toMatch(/drawdown gate N 30 d 5% r 70% Y 2/);
    expect(on.assumptions.find((a) => a.key === 'drawdownGate')!.value).toMatch(/^ON — a filter on every Growth entry decision/);
    const dir = join(c.stateDir, on.artifactDir!);
    const events = (JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8')) as { events: LabEvent[] }).events;
    expect(validateEvents(events, on.id, ['VGT', 'GDX'])).toEqual([]);
    const decisions = JSON.parse(readFileSync(join(dir, 'decisions.json'), 'utf8')) as DecisionsFile & { drawdownGate: unknown };
    expect(decisions.drawdownGate).toEqual({ enabled: true, lookbackSessions: 30, dipThresholdPercent: 5, recoveryRetracementPercent: 70, confirmationSessions: 2 });
    for (const sym of ['VGT', 'GDX']) {
      const d = decisions.perSymbol![sym]!.drawdownGate!;
      expect(d.episodes.length).toBeGreaterThan(0);
      // stable ids, the peak before the first qualifying observation before (or at) the trough
      d.episodes.forEach((e, i) => {
        expect(e.id).toBe(`DD-${i + 1}`);
        expect(e.peak.utc < e.detected.utc).toBe(true);
        expect(e.detected.utc <= e.trough.utc).toBe(true);
        expect(e.maxDipPercent).toBeGreaterThanOrEqual(5);
        expect(Math.abs(e.threshold - (e.trough.price + (e.peak.price - e.trough.price) * 0.7))).toBeLessThan(1e-3);
      });
      // transitions in time order, each naming its observation and the state after it
      const t = d.transitions;
      for (let i = 1; i < t.length; i++) expect(t[i - 1]!.utc <= t[i]!.utc).toBe(true);
      expect(new Set(t.map((x) => x.event))).toEqual(new Set(['window_complete', 'dip_detected', 'new_trough', 'recovery_started', 'confirmation_reset', 'recovery_confirmed', 'confirmation_lost', 'dip_resolved', 'entry_blocked_by_drawdown_gate'].filter((e) => t.some((x) => x.event === e))));
      expect(t.filter((x) => x.event === 'dip_detected')).toHaveLength(d.episodes.length);
      // every entry decision carries the gate's state and the blockers it recorded
      const ed = decisions.perSymbol![sym]!.entryDecisions!;
      // (signals ignored while invested and policy invalidations never reach the gates: no gate record)
      const gated = ed.filter((x) => x.kind !== 'continuation' && x.gate);
      expect(gated.length).toBeGreaterThan(0);
      for (const x of gated) expect(x.gate!.drawdown!.state).toBeDefined();
      for (const x of ed.filter((x) => x.kind !== 'continuation' && !x.gate)) expect(['rejected', 'invalidated']).toContain(x.disposition);
      for (const x of ed.filter((x) => x.gate?.decision === 'drawdown_gate')) expect(x.gate!.blockedBy).toContain('drawdown');
    }
    // release decisions: intraday, the next eligible trade, the then-current price, labelled
    const releases = events.filter((e) => e.meta.via === 'drawdown_release' && e.kind === 'entry_signal');
    expect(releases.length).toBeGreaterThan(0);
    for (const e of releases) {
      expect(e.timePrecision).toBe('minute');
      expect(e.timeMeaning).toMatch(/Drawdown Recovery Gate turned permissive/);
      const entry = events.find((x) => x.kind === 'executed_entry' && x.tradeId === e.tradeId && x.symbol === e.symbol)!;
      expect(entry.meta.via).toBe('drawdown_release');
      expect(entry.t >= e.t).toBe(true); // never backdated: the fill is the next eligible trade after the decision
    }
    type Row = { trade: string; drawdownGate: { stateAtDecision: string; decidedAtRelease: boolean } | null };
    const rows = (JSON.parse(readFileSync(join(dir, 'trades.json'), 'utf8')) as { trades: Record<string, Row[]> }).trades;
    for (const list of Object.values(rows))
      for (const r of list.filter((x) => x.drawdownGate)) expect(['normal', 'recovery_confirmed']).toContain(r.drawdownGate!.stateAtDecision);
    expect(Object.values(rows).flat().filter((r) => r.drawdownGate?.decidedAtRelease).length).toBe(releases.length);
    const m = on.metrics as { drawdownGate: { enabled: boolean }; perSymbol: Record<string, { drawdownGate: { episodes: { total: number }; releaseDecisions: { taken: number }; note: string } }> };
    expect(m.drawdownGate.enabled).toBe(true);
    for (const sym of ['VGT', 'GDX'])
      expect(m.perSymbol[sym]!.drawdownGate.episodes.total).toBe(decisions.perSymbol![sym]!.drawdownGate!.episodes.length);
    expect(m.perSymbol.VGT!.drawdownGate.note).toMatch(/not causal per-trade contributions/);

    // the research bundle: episodes, transitions, the gate summary, the gate columns of entry-decisions.csv
    const a = buildResearchBundle(c, repo, on.id);
    expect(a.zip.equals(buildResearchBundle(c, repo, on.id).zip)).toBe(true);
    const zip = readZip(a.zip);
    const lines = (f: string) => zip.get(f)!.toString().trim().split('\n');
    const nEpisodes = ['VGT', 'GDX'].reduce((n, s) => n + decisions.perSymbol![s]!.drawdownGate!.episodes.length, 0);
    const nTransitions = ['VGT', 'GDX'].reduce((n, s) => n + decisions.perSymbol![s]!.drawdownGate!.transitions.length, 0);
    expect(lines('drawdown-episodes.csv').length - 1).toBe(nEpisodes);
    expect(lines('drawdown-transitions.csv').length - 1).toBe(nTransitions);
    expect(lines('entry-decisions.csv')[0]).toMatch(/,blocked_by,drawdown_state,drawdown_episode,drawdown_peak,drawdown_trough,drawdown_threshold,drawdown_confirmation_start,via,drawdown_values_json$/);
    expect(zip.get('drawdown-gate.md')!.toString()).toMatch(/# Drawdown Recovery Gate \(descriptive\)[\s\S]*## VGT[\s\S]*## GDX/);
    expect(zip.get('README.md')!.toString()).toMatch(/Drawdown Recovery Gate\*\* \(Growth 1\.4\.0, when ON\)/);

    // an exact replay with the current runner reproduces every artifact
    const scratch = join(mkdtempSync(join(tmpdir(), 'strategy-lab-drawdown-replay-')), on.id);
    const { verdicts } = replayStoredRun(REPO_ROOT, dir, scratch, 'apps/strategy-lab/runner/trading-run.ts', 'exact');
    expect(verdicts.every((v) => v.identical)).toBe(true);

    // the OFF control (only the gate switched OFF): comparable, the gate state named on both sides
    const off = await start({ ...params, drawdownRecoveryGateEnabled: false });
    expect(off.assumptions.find((x) => x.key === 'drawdownGate')!.value).toBe('OFF (identical to Growth 1.3.0)');
    const cmp = compareRuns(c, repo, off.id, on.id) as unknown as { comparable: boolean; a: Record<string, string>; b: Record<string, string> };
    expect(cmp.comparable).toBe(true);
    expect([cmp.a.drawdownGate, cmp.b.drawdownGate]).toEqual(['OFF', 'ON (N 30, d 5%, r 70%, Y 2)']);
    const offMetrics = off.metrics as { drawdownGate: unknown; perSymbol: Record<string, { drawdownGate?: unknown }> };
    expect(offMetrics.drawdownGate).toEqual({ enabled: false });
    expect(offMetrics.perSymbol.VGT!.drawdownGate).toBeUndefined();
    const offBundle = readZip(buildResearchBundle(c, repo, off.id).zip);
    expect(offBundle.has('drawdown-episodes.csv')).toBe(false);
  }, 900_000);

  it('Interactive Preview: the gate is part of the cache identity, its OFF drafts are not; previews create no saved run', async () => {
    const base = req({}, { from: '2017-01-03', to: '2018-12-31' });
    const runsBefore = JSON.stringify(repo.listRuns());
    const run = async (params: Record<string, ParamValue>) => settle(previews.submit({ request: { ...base, params } }));
    const off = await run(effectiveParams(G, D));
    expect(off.state, off.error ?? '').toBe('completed');
    const offDrafts = await run({ ...D, dipLookbackSessions: 99, recoveryRetracementPercent: 40 });
    expect([offDrafts.cacheHit, offDrafts.previewId]).toEqual([true, off.previewId]);
    const on = await run(effectiveParams(G, { ...D, ...GATE }));
    expect(on.state, on.error ?? '').toBe('completed');
    expect(on.previewId).not.toBe(off.previewId);
    const onY0 = await run(effectiveParams(G, { ...D, ...GATE, recoveryConfirmationSessions: 0 }));
    expect([onY0.cacheHit, onY0.previewId === on.previewId]).toEqual([false, false]);
    const again = await run({ ...D, ...GATE });
    expect([again.cacheHit, again.previewId]).toEqual([true, on.previewId]);
    expect((previews.detail(on.previewId!).metrics as { drawdownGate: { enabled: boolean } }).drawdownGate.enabled).toBe(true);
    expect(JSON.stringify(repo.listRuns())).toBe(runsBefore);
  }, 600_000);
});
