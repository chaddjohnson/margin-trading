// Interactive Preview end to end on real data (skipped without the git-ignored data/ files): the preview service
// (server/previews.ts) with the real runner, the persistent cache and Save as run, plus the HTTP routes.
//
//   C1 → C2 → C1: two cold executions, the return a validated cache hit, zero runs/variations/sidebar entries
//   coalescing, cancellation, superseded submissions; parity with a normal single run of the same configuration
//   Save as run from a fresh and a cached preview: exactly one immutable run each, the source run byte-identical
//   restart persistence; a code edit (same version), a data edit and a tampered payload each force a fresh execution
//   imports, pools, demo and legacy runs are not previewable (a legacy run offers an explicit upgrade only)

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runDirName } from '../server/artifacts.ts';
import { type Config, loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { buildResearchBundle, buildPreviewBundle } from '../server/export.ts';
import { createHandler } from '../server/http.ts';
import { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { PreviewError, PreviewService } from '../server/previews.ts';
import { Repo } from '../server/repo.ts';
import { seedDemo } from '../server/seed-demo.ts';
import { LabService } from '../server/service.ts';
import type { LabEvent } from '../shared/contract.ts';
import { variationIdentity } from '../shared/params.ts';
import type { PreviewDetail, PreviewTicketStatus } from '../shared/preview.ts';
import { RISE_FROM_RECENT_LOW_TRADING, STUDY8_POOL } from '../shared/strategies.ts';
import { repoCopy } from './preview-identity.test.ts';

const hasData = existsSync(join(REPO_ROOT, 'data/VGT/data.csv'));
const GROWTH = RISE_FROM_RECENT_LOW_TRADING;
const PARAMS = {
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 20,
  trailingStopPercent: 7.3,
  maximumHoldEnabled: true,
  maximumHoldDays: 8,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2.9,
  costBpsPerSide: 5,
  continuationEnabled: false,
  trendFilterEnabled: false,
  eligibilityEnabled: false,
  entryMethod: 'rise_from_recent_low',
  initialStopEnabled: false,
  retentionEnabled: false,
  drawdownRecoveryGateEnabled: false
};
const REQ = {
  strategyKey: GROWTH.key,
  strategyVersion: GROWTH.version,
  params: PARAMS,
  symbols: ['VGT'],
  from: '2019-01-02',
  to: '2021-12-31',
  resolution: '1d' as const
};
const withX = (x: number, extra: Record<string, unknown> = {}) => ({ ...REQ, params: { ...PARAMS, advanceFromRecentLowPercent: x, ...extra } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const filesHash = (dir: string) =>
  sha(
    JSON.stringify(
      readdirSync(dir)
        .sort()
        .map((f) => [f, sha(readFileSync(join(dir, f)))])
    )
  );

interface Lab {
  cfg: Config;
  repo: Repo;
  jobs: Jobs;
  service: LabService;
  previews: PreviewService;
  log: string[];
}

function lab(over: Partial<Config> = {}, stateDir?: string): Lab {
  const base = loadConfig({
    STRATEGY_LAB_STATE_DIR: stateDir ?? mkdtempSync(join(tmpdir(), 'strategy-lab-preview-')),
    STRATEGY_LAB_STATIC_DIR: '',
    STRATEGY_LAB_SEED_DEMO: '0'
  });
  const cfg = { ...base, ...over };
  const repo = new Repo(openDb(cfg.dbFile));
  const jobs = new Jobs(repo, cfg);
  const service = new LabService(repo, cfg, jobs, new MarketPrices(cfg.repoRoot));
  const log: string[] = [];
  const previews = new PreviewService(cfg, repo, service, (m) => log.push(m));
  previews.init();
  return { cfg, repo, jobs, service, previews, log };
}

async function savedRun(l: Lab, req: Record<string, unknown>, title = 'source') {
  const r = l.service.createManualRun({ ...req, title });
  if ('errors' in r) throw new Error(r.errors.join('; '));
  for (let i = 0; i < 600 && !['completed', 'failed'].includes(l.repo.runDetail(r.runId)!.status); i++) await sleep(200);
  const run = l.repo.runDetail(r.runId)!;
  expect(run.status, run.error ?? '').toBe('completed');
  return run;
}

async function settle(l: Lab, s: PreviewTicketStatus): Promise<PreviewTicketStatus> {
  let cur = s;
  for (let i = 0; i < 1200 && (cur.state === 'queued' || cur.state === 'running'); i++) {
    await sleep(100);
    cur = l.previews.status(cur.ticket);
  }
  return cur;
}

const preview = async (l: Lab, request: Record<string, unknown>, sourceRun?: string) =>
  settle(l, l.previews.submit({ request, ...(sourceRun ? { sourceRun } : {}) }));
const started = (l: Lab) => l.log.filter((m) => / started \(pid/.test(m)).length;
const entryDir = (l: Lab, previewId: string) => join(l.cfg.previewCacheDir, 'entries', previewId.slice(3));
const eventsOf = (dir: string) => (JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8')) as { events: LabEvent[] }).events;
const sidebar = (l: Lab) => ({
  runs: l.repo.listRuns({ limit: 500 }).map((r) => r.id),
  variations: l.repo.listVariations({ limit: 500 }).map((v) => v.id),
  trials: l.repo.listOptimizationBatches().length
});

describe.skipIf(!hasData)('Interactive Preview on real data', () => {
  let l: Lab;
  let source: Awaited<ReturnType<typeof savedRun>>;
  let sourceRow: string;
  let sourceFiles: string;
  let runDirs: string[];
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    l = lab();
    seedDemo(l.repo, l.cfg);
    source = await savedRun(l, REQ);
    sourceRow = sha(JSON.stringify(l.repo.runRow(source.id)));
    sourceFiles = filesHash(join(l.cfg.stateDir, runDirName(source.id)));
    runDirs = readdirSync(join(l.cfg.stateDir, 'runs')).sort();
  }, 240_000);

  it('capability: a completed run of the current Growth version is previewable, seeded with its own stored request', () => {
    const cap = l.previews.capability(source.id);
    expect(cap.previewable).toBe(true);
    expect(cap.strategy).toMatchObject({ key: GROWTH.key, version: GROWTH.version });
    expect(cap.seed).toMatchObject({ symbols: ['VGT'], from: '2019-01-02', to: '2021-12-31', resolution: '1d' });
    expect(cap.seed!.params).toEqual(PARAMS);
    expect(cap.drift).toEqual({ implementation: [], data: [], checked: true });
  });

  it('C1 → C2 → C1: two cold executions, the return is a validated cache hit; nothing is saved', async () => {
    const before = sidebar(l);
    const c1 = await preview(l, withX(10), source.id);
    const c2 = await preview(l, withX(7), source.id);
    expect([c1.state, c1.cacheHit, c2.state, c2.cacheHit]).toEqual(['completed', false, 'completed', false]);
    const t0 = performance.now();
    const back = l.previews.submit({ request: withX(10), sourceRun: source.id });
    const hitMs = performance.now() - t0;
    expect(back).toMatchObject({ state: 'completed', cacheHit: true, coalesced: false, previewId: c1.previewId });
    expect(started(l)).toBe(2);
    expect(c1.previewId).toMatch(/^PV-[0-9a-f]{64}$/);
    expect(c1.previewId).not.toBe(c2.previewId);
    // the hit is the original execution, byte for byte, and measurably faster than the cold run
    const d1 = l.previews.detail(c1.previewId);
    expect(d1.kind).toBe('preview');
    expect(d1.id).toBe(c1.previewId);
    expect(d1.preview.config.params.advanceFromRecentLowPercent).toBe(10);
    expect(hitMs).toBeLessThan(c1.timing.executionMs!);
    console.log(`cold ${c1.timing.executionMs} ms (identity ${c1.timing.identityMs} ms); hit ${hitMs.toFixed(0)} ms`);
    // zero runs, variations, trials or sidebar entries; the source run untouched
    expect(sidebar(l)).toEqual(before);
    expect(readdirSync(join(l.cfg.stateDir, 'runs')).sort()).toEqual(runDirs);
    expect(sha(JSON.stringify(l.repo.runRow(source.id)))).toBe(sourceRow);
    expect(filesHash(join(l.cfg.stateDir, runDirName(source.id)))).toBe(sourceFiles);
    ids.c1 = c1.previewId;
    ids.c2 = c2.previewId;
  }, 120_000);

  it('inactive draft values and number spellings reuse the same preview', async () => {
    const n = started(l);
    const same = l.previews.submit({
      request: withX(10, { trendMethod: 'momentum', trendMomentumShortSessions: 3, continuationMethod: 'breakout', breakoutBufferPercent: 9 })
    });
    expect(same).toMatchObject({ state: 'completed', cacheHit: true, previewId: ids.c1 });
    expect(started(l)).toBe(n);
  });

  it('coalesces identical concurrent requests; cancels work nobody waits for; never caches it', async () => {
    const n = started(l);
    const a = l.previews.submit({ request: withX(11) });
    const b = l.previews.submit({ request: withX(11) });
    expect(b).toMatchObject({ coalesced: true, cacheHit: false, previewId: a.previewId });
    const [fa, fb] = await Promise.all([settle(l, a), settle(l, b)]);
    expect([fa.state, fb.state, fb.cacheHit]).toEqual(['completed', 'completed', false]);
    expect(started(l)).toBe(n + 1);

    // queued and running executions with no ticket left: dropped / killed, not cached
    const running = l.previews.submit({ request: withX(12) });
    for (let i = 0; i < 100 && l.previews.status(running.ticket).state !== 'running'; i++) await sleep(20);
    const queued = l.previews.submit({ request: withX(13) }); // behind it (one preview at a time)
    expect(queued.state).toBe('queued');
    expect(l.previews.cancel(queued.ticket).state).toBe('cancelled');
    expect(l.previews.cancel(running.ticket).state).toBe('cancelled');
    for (let i = 0; i < 200 && l.previews.activeCount > 0; i++) await sleep(50);
    expect(l.log.some((m) => m.includes('dropped from the queue'))).toBe(true);
    expect(existsSync(entryDir(l, running.previewId))).toBe(false);
    expect(existsSync(entryDir(l, queued.previewId))).toBe(false);
    expect(readdirSync(join(l.cfg.previewCacheDir, 'work'))).toEqual([]);
    const again = await preview(l, withX(12));
    expect([again.state, again.cacheHit]).toEqual(['completed', false]);
  }, 180_000);

  it('rapid sequential submissions: superseded tickets are released, only the latest completes', async () => {
    const t = [14, 15, 16].map((x) => l.previews.submit({ request: withX(x) }));
    // the browser releases each superseded ticket as soon as it submits the next one
    l.previews.cancel(t[0]!.ticket);
    l.previews.cancel(t[1]!.ticket);
    const last = await settle(l, t[2]!);
    expect(last.state).toBe('completed');
    for (let i = 0; i < 200 && l.previews.activeCount > 0; i++) await sleep(50);
    expect(existsSync(entryDir(l, t[0]!.previewId))).toBe(false);
    expect(existsSync(entryDir(l, t[1]!.previewId))).toBe(false);
    expect(existsSync(entryDir(l, t[2]!.previewId))).toBe(true);
  }, 180_000);

  it('a preview equals a normal single run of the same configuration (events, ledger, marks, metrics, decisions)', async () => {
    // the normal run carries inactive drafts and a title: neither changes what executes
    const normal = await savedRun(l, withX(10, { trendMethod: 'rising_sma', eligibilityPolicy: 'deterioration' }), 'parity');
    const nd = join(l.cfg.stateDir, runDirName(normal.id));
    const pd = entryDir(l, ids.c1!);
    const norm = (dir: string, f: string, runId: string) => readFileSync(join(dir, f), 'utf8').split(JSON.stringify(runId)).join('"RUN"');
    for (const f of ['events.json', 'trades.json', 'daily.json', 'decisions.json', 'metrics.json'])
      expect(norm(pd, f, ids.c1!), f).toBe(norm(nd, f, normal.id));
    expect(sha(gunzipSync(readFileSync(join(pd, 'minute-marks.csv.gz'))))).toBe(sha(gunzipSync(readFileSync(join(nd, 'minute-marks.csv.gz')))));
    const pp = JSON.parse(readFileSync(join(pd, 'provenance.json'), 'utf8'));
    const np = JSON.parse(readFileSync(join(nd, 'provenance.json'), 'utf8'));
    for (const k of ['warmupSessions', 'basisBySymbol', 'engine', 'node', 'symbols']) expect(pp[k], k).toEqual(np[k]);
    // the executed configuration is the same; only the drafts and title differ in the stored requests
    expect({ ...pp.request.params }).toEqual(withX(10).params);
    // the event lineage is complete: every executed entry/exit pair links, every closed trade's net is in the events
    const ev = eventsOf(pd);
    const exits = ev.filter((e) => e.kind === 'executed_exit');
    expect(exits.every((x) => ev.find((e) => e.id === x.linkedEventId)?.linkedEventId === x.id)).toBe(true);
    const trades = JSON.parse(readFileSync(join(pd, 'trades.json'), 'utf8')).trades.VGT as { status: string; net: number }[];
    expect(exits.map((x) => x.values.find((v) => v.key === 'net')!.value)).toEqual(
      trades.filter((t) => t.status === 'closed').map((t) => Math.round(t.net * 100) / 100)
    );
  }, 180_000);

  it('Save as run from a fresh and from a cached preview: exactly one immutable run each; the source unchanged', async () => {
    const fresh = await preview(l, withX(8), source.id);
    expect(fresh.cacheHit).toBe(false);
    const runsBefore = l.repo.listRuns({ limit: 500 }).length;
    const a = l.previews.save(fresh.previewId, { sourceRun: source.id, title: 'saved fresh preview' });
    expect(l.repo.listRuns({ limit: 500 }).length).toBe(runsBefore + 1);
    const cached = l.previews.submit({ request: withX(7), sourceRun: source.id });
    expect(cached.cacheHit).toBe(true);
    const b = l.previews.save(cached.previewId, { sourceRun: source.id });
    expect(l.repo.listRuns({ limit: 500 }).length).toBe(runsBefore + 2);
    for (const [saved, pid, x] of [
      [a.runId, fresh.previewId, 8],
      [b.runId, cached.previewId, 7]
    ] as const) {
      const run = l.repo.runDetail(saved)!;
      expect(run).toMatchObject({ status: 'completed', kind: 'manual', dataOrigin: 'real', symbols: ['VGT'] });
      expect(run.window).toMatchObject({ from: '2019-01-02', to: '2021-12-31', resolution: '1d' });
      expect(run.provenance).toMatchObject({ createdBy: 'Strategy Lab Interactive Preview — Save as run', preview: { id: pid, sourceRun: source.id } });
      // the variation New Test would have used for this configuration, derived from the source run's variation
      const v = l.repo.listVariations({ limit: 500 }).find((x) => x.id === run.variation.id)!;
      expect(v).toBeDefined();
      expect(l.repo.runRequest(saved)).toMatchObject({ params: { advanceFromRecentLowPercent: x }, parentVariation: source.variation.id });
      expect(variationIdentity(GROWTH, withX(x).params, '1d')).toBe(
        (l.repo as unknown as { db: { prepare: (s: string) => { get: (...a: unknown[]) => { params_canonical: string } } } }).db
          .prepare('SELECT params_canonical FROM variations WHERE public_id = ?')
          .get(run.variation.id).params_canonical
      );
      // its artifacts are the preview's, with only the run id rewritten; the manifest verifies; it exports
      const dir = join(l.cfg.stateDir, runDirName(saved));
      expect(eventsOf(dir)).toEqual(eventsOf(entryDir(l, pid)).map((e) => ({ ...e, runId: saved })));
      const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).sha256 as Record<string, string>;
      for (const [f, h] of Object.entries(manifest)) expect(sha(readFileSync(join(dir, f))), f).toBe(h);
      expect(sha(readFileSync(join(dir, 'events.json')))).toBe(run.artifact.sha256);
      expect(buildResearchBundle(l.cfg, l.repo, saved).filename).toBe(`strategy-lab-${saved}.zip`);
    }
    // a second save of the same preview is reported, and made only when confirmed
    expect(() => l.previews.save(cached.previewId, { sourceRun: source.id })).toThrow(/Already saved as R-/);
    const c = l.previews.save(cached.previewId, { sourceRun: source.id, confirmDuplicate: true });
    expect(c.runId).not.toBe(b.runId);
    expect(l.previews.detail(cached.previewId).preview.savedAs).toEqual([b.runId, c.runId]);
    expect(sha(JSON.stringify(l.repo.runRow(source.id)))).toBe(sourceRow);
    expect(filesHash(join(l.cfg.stateDir, runDirName(source.id)))).toBe(sourceFiles);
  }, 180_000);

  it('a preview exports a research bundle labelled as a temporary preview', () => {
    const b = buildPreviewBundle(l.cfg, l.previews, ids.c1!);
    expect(b.filename).toBe(`strategy-lab-preview-${ids.c1!.slice(0, 15)}.zip`);
    expect(b.manifest).toMatchObject({ runId: ids.c1, preview: { temporary: true } });
  });

  it('persists across a restart; an interrupted execution is removed at start', async () => {
    const junk = join(l.cfg.previewCacheDir, 'work', 'interrupted');
    mkdirSync(junk);
    writeFileSync(join(junk, 'events.json'), '{"partial');
    const restarted = lab({}, l.cfg.stateDir);
    expect(existsSync(junk)).toBe(false);
    expect(restarted.previews.submit({ request: withX(10) })).toMatchObject({ state: 'completed', cacheHit: true, previewId: ids.c1 });
  });

  it('imports, pools, demo and legacy runs are not previewable; a legacy run offers only an explicit upgrade', () => {
    const fake = (key: string, version: string, kind: 'manual' | 'import', request: Record<string, unknown> | null, origin: 'real' | 'synthetic' = 'real') => {
      const exp = l.repo.ensureExperiment('fixtures', 'Fixtures');
      const strat = l.repo.ensureStrategy({ key, version, title: key, kind: 'trades', runnable: false, description: '', schema: null, sourceRef: '' });
      const v = l.repo.findOrCreateVariation({ strategyId: strat.id, experimentId: exp.id, params: [], canonical: `${key}@${version}|${kind}`, title: 'f', origin: kind, parentVariationId: null });
      const r = l.repo.createRun({
        variationId: v.id, title: 'f', kind, status: 'queued', dataOrigin: origin, symbols: ['VGT', 'GDX'], window: { from: '2016-01-04', to: '2020-12-31', resolution: '1d', partition: null },
        params: [], assumptions: [], request, priceSource: { kind: 'market', basisDate: '2016-01-04' }, provenance: {}, codeRevision: null
      });
      l.repo.complete(r.id, { eventCount: 0, artifactDir: null as unknown as string, artifactSha256: '', metrics: null, provenance: {}, priceSource: { kind: 'market', basisDate: '2016-01-04' } });
      return r.publicId;
    };
    const imported = l.previews.capability(fake(STUDY8_POOL.key, STUDY8_POOL.version, 'import', null));
    expect(imported).toMatchObject({ previewable: false, seed: null, upgrade: null });
    expect(imported.reason).toMatch(/never substitutes a standalone single-strategy simulation for a shared-capital strategy/);
    expect(l.previews.capability(fake(STUDY8_POOL.key, STUDY8_POOL.version, 'manual', { kind: 'study8-pool-rerun' })).reason).toMatch(/Shared-slot pool rerun/);
    expect(l.previews.capability('R-000001')).toMatchObject({ previewable: false, reason: expect.stringMatching(/Synthetic demo/) });
    const legacy = l.previews.capability(fake(GROWTH.key, '1.0.0', 'manual', { ...REQ, strategyVersion: '1.0.0', params: { ...PARAMS, continuationEnabled: undefined, trendFilterEnabled: undefined, eligibilityEnabled: undefined } }));
    expect(legacy.previewable).toBe(false);
    expect(legacy.reason).toMatch(/superseded version, kept exactly as recorded.*never upgrades a run invisibly/);
    expect(legacy.upgrade).toMatchObject({
      version: '1.4.0',
      seed: { strategyVersion: '1.4.0', params: { continuationEnabled: false, trendFilterEnabled: false, eligibilityEnabled: false, entryMethod: 'rise_from_recent_low', initialStopEnabled: false, retentionEnabled: false, drawdownRecoveryGateEnabled: false } }
    });
    // Growth 1.2.0 is superseded too: previewable only through the explicit 1.4.0 upgrade, which seeds its stored values
    // with the later options OFF (identical by the parity tests) and says so
    const v120 = l.previews.capability(fake(GROWTH.key, '1.2.0', 'manual', { ...REQ, strategyVersion: '1.2.0', params: { ...PARAMS, entryMethod: undefined, initialStopEnabled: undefined, retentionEnabled: undefined, drawdownRecoveryGateEnabled: undefined, trendFilterEnabled: true, trendMethod: 'rising_sma', trendSmaSessions: 50, trendSmaComparisonSessions: 40 } }));
    expect(v120.previewable).toBe(false);
    expect(v120.upgrade).toMatchObject({
      version: '1.4.0',
      seed: { strategyVersion: '1.4.0', params: { trendFilterEnabled: true, trendMethod: 'rising_sma', trendSmaSessions: 50, trendSmaComparisonSessions: 40, entryMethod: 'rise_from_recent_low', initialStopEnabled: false, retentionEnabled: false, drawdownRecoveryGateEnabled: false } }
    });
    expect(v120.upgrade!.note).toMatch(/reproduced every 1\.2\.0 artifact in the parity tests.*still labelled a new execution/);
    // Growth 1.3.0 (the user's current runs) likewise: the explicit 1.4.0 upgrade with the Drawdown Recovery Gate OFF
    const v130 = l.previews.capability(fake(GROWTH.key, '1.3.0', 'manual', { ...REQ, strategyVersion: '1.3.0', params: { ...PARAMS, drawdownRecoveryGateEnabled: undefined, initialStopEnabled: true, initialStopAtrSessions: 14, initialStopAtrMultiple: 2 } }));
    expect(v130.previewable).toBe(false);
    expect(v130.upgrade).toMatchObject({
      version: '1.4.0',
      seed: { strategyVersion: '1.4.0', params: { initialStopEnabled: true, initialStopAtrSessions: 14, initialStopAtrMultiple: 2, drawdownRecoveryGateEnabled: false } }
    });
    expect(v130.upgrade!.note).toMatch(/reproduced every 1\.3\.0 artifact in the parity tests.*still labelled a new execution/);
    expect(legacy.upgrade!.note).toMatch(/not a reproduction/);
    // the API refuses legacy versions and the pool outright (never substituted by a standalone run)
    for (const request of [{ ...REQ, strategyVersion: '1.1.0' }, { ...REQ, strategyKey: STUDY8_POOL.key, strategyVersion: STUDY8_POOL.version }])
      expect(() => l.previews.submit({ request })).toThrow(PreviewError);
  });

  it('refuses invalid and sweep-shaped requests, and fields a preview does not take', () => {
    const bad = [
      { request: { ...REQ, params: { ...PARAMS, advanceFromRecentLowPercent: [5, 10] } } },
      { request: { ...REQ, from: '2021-01-01', to: '2020-01-01' } },
      { request: { ...REQ, title: 'x' } },
      { request: { ...REQ, params: { ...PARAMS, unknownKnob: 1 } } },
      { request: REQ, sweep: true },
      { request: { ...REQ, symbols: ['NOPE'] } }
    ];
    for (const b of bad) expect(() => l.previews.submit(b), JSON.stringify(b).slice(0, 80)).toThrow(PreviewError);
    // a disabled value that is invalid does not block a valid submission (it is not part of the execution)
    expect(l.previews.submit({ request: withX(10, { maximumHoldEnabled: false, maximumHoldDays: -5, intradayLossBufferPercent: 'x' }) }).state).not.toBe('failed');
  });

  afterAll(async () => {
    l.previews.stop();
    for (let i = 0; i < 100 && l.previews.activeCount > 0; i++) await sleep(50);
  });
});

describe.skipIf(!hasData)('cache invalidation in a repository copy: code edit (same version), data edit, tampered payload', () => {
  it('each forces a fresh execution; the version alone never keeps a stale result', async () => {
    const root = repoCopy(['VGT'], true);
    const l = lab({ repoRoot: root });
    const first = await preview(l, withX(10));
    expect([first.state, first.cacheHit], first.error ?? '').toEqual(['completed', false]);
    expect(l.previews.submit({ request: withX(10) })).toMatchObject({ cacheHit: true, previewId: first.previewId });
    expect(l.previews.detail(first.previewId).preview.current).toBeUndefined(); // checked only on request
    expect(l.previews.detail(first.previewId, { checkCurrent: true }).preview.current).toEqual({ matches: true, differences: [] });

    // 1. a code edit that keeps STRATEGY_VERSION
    const engine = join(root, 'src/growth-trading/riseTrading.ts');
    writeFileSync(engine, `${readFileSync(engine, 'utf8')}\n// edited without a version change\n`);
    // the earlier preview, shown without being run (reload, Back/Forward), now says it is outdated, and why
    expect(l.previews.detail(first.previewId, { checkCurrent: true }).preview.current).toEqual({
      matches: false,
      differences: ['code src/growth-trading/riseTrading.ts']
    });
    const afterCode = await preview(l, withX(10));
    expect([afterCode.state, afterCode.cacheHit]).toEqual(['completed', false]);
    expect(afterCode.previewId).not.toBe(first.previewId);
    expect(l.previews.detail(afterCode.previewId).strategy.version).toBe(GROWTH.version);

    // 2. a data edit (one 2016 price, outside the window: the content hash changes all the same)
    const data = join(root, 'data/VGT/data.csv');
    const lines = readFileSync(data, 'utf8').split('\n');
    lines[1] = lines[1]!.replace(/(\d)(,|$)/, (_m, d: string, sep: string) => `${(Number(d) + 1) % 10}${sep}`);
    writeFileSync(data, lines.join('\n'));
    const afterData = await preview(l, withX(10));
    expect([afterData.state, afterData.cacheHit], afterData.error ?? '').toEqual(['completed', false]);
    expect(afterData.previewId).not.toBe(afterCode.previewId);

    // 3. a tampered cached payload: never served; recomputed under the same identity
    const ev = join(entryDir(l, afterData.previewId), 'events.json');
    writeFileSync(ev, readFileSync(ev, 'utf8').replace('"price":', '"price":1+'));
    const afterTamper = await preview(l, withX(10));
    expect([afterTamper.state, afterTamper.cacheHit, afterTamper.previewId]).toEqual(['completed', false, afterData.previewId]);
    expect(l.log.some((m) => m.includes('cache entry not reused (events.json does not match its recorded sha256)'))).toBe(true);

    // 4. Save as run of a preview whose identity no longer holds is refused (fail closed)
    writeFileSync(engine, `${readFileSync(engine, 'utf8')}\n// a second edit\n`);
    expect(() => l.previews.save(afterTamper.previewId, {})).toThrow(/no longer matches the current implementation or data/);
    l.previews.stop();
  }, 240_000);
});

describe.skipIf(!hasData)('preview HTTP routes', () => {
  it('capability, submit, poll, detail, events, prices, export, save, cancel and errors', async () => {
    const l = lab();
    const run = await savedRun(l, REQ);
    const prices = new MarketPrices(l.cfg.repoRoot);
    const handler = createHandler({ cfg: l.cfg, repo: l.repo, jobs: l.jobs, prices, service: l.service, previews: l.previews, log: () => {} });
    const server = createServer((req, res) => void handler(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const get = (p: string) => fetch(`${base}${p}`);
    const post = (p: string, body: unknown) => fetch(`${base}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    try {
      expect(((await (await get(`/api/runs/${run.id}/preview`)).json()) as { previewable: boolean }).previewable).toBe(true);
      expect(((await get('/api/health').then((r) => r.json())) as { features: string[] }).features).toContain('interactive-preview');
      let s = (await (await post('/api/previews', { request: withX(9), sourceRun: run.id })).json()) as PreviewTicketStatus;
      expect(s.ticket).toMatch(/^PT-[0-9a-f]{24}$/);
      while (s.state === 'queued' || s.state === 'running') {
        await sleep(100);
        s = (await (await get(`/api/previews/tickets/${s.ticket}`)).json()) as PreviewTicketStatus;
      }
      expect(s.state).toBe('completed');
      const detail = (await (await get(`/api/previews/${s.previewId}`)).json()) as PreviewDetail;
      expect(detail).toMatchObject({ id: s.previewId, kind: 'preview', status: 'completed', preview: { savedAs: [] } });
      expect(detail.preview.current).toBeUndefined();
      const checked = (await (await get(`/api/previews/${s.previewId}?current=1`)).json()) as PreviewDetail;
      expect(checked.preview.current).toEqual({ matches: true, differences: [] });
      const ev = (await (await get(`/api/previews/${s.previewId}/events?symbol=VGT`)).json()) as { runId: string; events: LabEvent[] };
      expect(ev.runId).toBe(s.previewId);
      expect(ev.events.length).toBe(detail.eventCount);
      const px = (await (await get(`/api/previews/${s.previewId}/prices?symbol=VGT&points=500`)).json()) as { firstSession: string; lastSession: string };
      expect(px.firstSession).toBe('2019-01-02');
      expect(px.lastSession).toBe('2021-12-31');
      const zip = await get(`/api/previews/${s.previewId}/export`);
      expect(zip.status).toBe(200);
      expect(zip.headers.get('content-disposition')).toMatch(/strategy-lab-preview-PV-/);
      const saved = await post(`/api/previews/${s.previewId}/save`, { sourceRun: run.id });
      expect(saved.status).toBe(201);
      const dup = await post(`/api/previews/${s.previewId}/save`, { sourceRun: run.id });
      expect(dup.status).toBe(409);
      expect(((await dup.json()) as { details: string[] }).details).toEqual([((await saved.json()) as { id: string }).id]);
      expect((await post('/api/previews', { request: { ...REQ, from: 'x' } })).status).toBe(400);
      expect((await get(`/api/previews/PV-${'0'.repeat(64)}`)).status).toBe(404);
      expect((await get('/api/previews/PV-123')).status).toBe(404);
      expect((await get(`/api/previews/tickets/PT-${'0'.repeat(24)}`)).status).toBe(404);
      const q = (await (await post('/api/previews', { request: withX(19) })).json()) as PreviewTicketStatus;
      expect(((await (await post(`/api/previews/tickets/${q.ticket}/cancel`, {})).json()) as PreviewTicketStatus).state).toBe('cancelled');
      expect((await get('/api/runs/R-000999/preview')).status).toBe(404);
    } finally {
      server.close();
      l.previews.stop();
    }
  }, 240_000);
});
