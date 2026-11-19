// The pooled-candidate server (server/portfolios.ts + routes): the catalog routes, the replay identity, the namespaced
// cache (hit after a replay, eviction of a tampered entry), coalescing and releasing, the chart routes on a replay,
// and that browsing never creates a saved run. Replays need the real data (skipped without it).
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { createHandler } from '../server/http.ts';
import type { Jobs } from '../server/jobs.ts';
import { PortfolioService } from '../server/portfolios.ts';
import { PreviewService } from '../server/previews.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import { hasData } from './portfolio-env.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('pooled-candidate server', () => {
  let server: Server;
  let base: string;
  let portfolios: PortfolioService;
  let repo: Repo;
  let state: string;
  let routes: string[];
  beforeAll(async () => {
    state = mkdtempSync(join(tmpdir(), 'strategy-lab-portfolio-'));
    const cfg = loadConfig({ STRATEGY_LAB_STATE_DIR: state, STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
    repo = new Repo(openDb(cfg.dbFile));
    const jobs = { enqueue: () => {}, cancel: () => false, activeCount: 0 } as unknown as Jobs;
    const prices = new MarketPrices(cfg.repoRoot);
    const service = new LabService(repo, cfg, jobs, prices);
    portfolios = new PortfolioService(cfg);
    portfolios.init();
    const handler = createHandler({ cfg, repo, jobs, prices, service, previews: new PreviewService(cfg, repo, service), portfolios, log: () => {} });
    routes = handler.routes;
    server = createServer((req, res) => void handler(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    portfolios.stop();
    server.close();
    rmSync(state, { recursive: true, force: true });
  });
  const get = async <T,>(path: string) => {
    const r = await fetch(`${base}${path}`);
    return { status: r.status, body: (await r.json()) as T };
  };
  const post = async <T,>(path: string) => {
    const r = await fetch(`${base}${path}`, { method: 'POST' });
    return { status: r.status, body: (await r.json()) as T };
  };
  type Ticket = { ticket: string; replayId: string; state: string; cacheHit: boolean; coalesced: boolean; error: string | null; candidateId: string };
  const until = async (t: Ticket) => {
    let x = t;
    for (let i = 0; i < 240 && (x.state === 'queued' || x.state === 'running'); i++) {
      await sleep(250);
      x = (await get<Ticket>(`/api/portfolio-replays/tickets/${t.ticket}`)).body;
    }
    return x;
  };

  it('lists the five frozen candidates with their full settings; no route launches a search or batch', async () => {
    const { status, body } = await get<{ candidates: { id: string; cached: boolean; quad: unknown; components: unknown[] }[] }>('/api/portfolios');
    expect(status).toBe(200);
    expect(body.candidates.map((c) => c.id)).toEqual(['l0-primary', 'c4-refined', 'c4', 'vgt-d1-g4', 'vgt-d1-g085']);
    expect(body.candidates.every((c) => c.quad && c.components.length === 4)).toBe(true);
    expect((await get('/api/portfolios/c4')).status).toBe(200);
    expect((await get('/api/portfolios/nope')).status).toBe(404);
    expect((await post('/api/portfolios/nope/replay')).status).toBe(404);
    const mutating = routes.filter((r) => !r.startsWith('GET '));
    expect(mutating.some((r) => /optimi|sweep|grid|batch|search/i.test(r))).toBe(false);
    const health = await get<{ features: string[] }>('/api/health');
    expect(health.body.features).toContain('pooled-candidates');
  });

  it('keys a replay on the catalog entry, the window, the data and the implementation', () => {
    const list = portfolios.list().candidates;
    const a = portfolios.identityOf(list[0]!);
    const b = portfolios.identityOf(list[1]!);
    expect(a.candidate.entrySha256).not.toBe(b.candidate.entrySha256);
    expect(a.window).toEqual({ from: '2016-01-04', to: '2026-10-30', boundary: '2024-12-31' });
    expect(Object.keys(a.data.symbols)).toEqual(['GDX', 'VGT']);
    expect(Object.keys(a.implementation.files)).toEqual(
      expect.arrayContaining([
        'apps/strategy-lab/runner/portfolio-run.ts',
        'apps/strategy-lab/runner/portfolio-bridge.ts',
        'src/vg-d1-growth-joint/pool.ts',
        'src/vg-lifecycle-matched-optimization/life.ts'
      ])
    );
    const edited = portfolios.identityOf({ ...list[0]!, entrySha256: '0'.repeat(64) });
    expect(JSON.stringify(edited)).not.toBe(JSON.stringify(a));
  });

  it.skipIf(!hasData)(
    'replays ONE candidate, then serves it from the cache; identical requests coalesce; no run is created',
    async () => {
      const runsBefore = repo.listRuns({ limit: 100 }).length;
      const t1 = (await post<Ticket>('/api/portfolios/vgt-d1-g4/replay')).body;
      const t2 = (await post<Ticket>('/api/portfolios/vgt-d1-g4/replay')).body;
      expect(t1.state).toMatch(/queued|running/);
      expect(t2.coalesced).toBe(true);
      expect(t2.replayId).toBe(t1.replayId);
      const done = await until(t1);
      expect(done.state).toBe('completed');
      expect((await until(t2)).state).toBe('completed');
      const hit = (await post<Ticket>('/api/portfolios/vgt-d1-g4/replay')).body;
      expect(hit).toMatchObject({ state: 'completed', cacheHit: true, replayId: t1.replayId });
      const d = (await get<{ candidateId: string; metrics: { full: { net: number; minuteDd: { usd: number } }; validation: { net: number }; parity: { status: string } } }>(`/api/portfolio-replays/${t1.replayId}`)).body;
      expect(d.candidateId).toBe('vgt-d1-g4');
      expect([d.metrics.full.net, d.metrics.full.minuteDd.usd, d.metrics.validation.net]).toEqual([271525.33, 19534.41, 66585.12]);
      expect(d.metrics.parity.status).toBe('verified');
      // chart routes in the run routes' shapes
      const ev = (await get<{ events: { kind: string; symbol: string }[] }>(`/api/portfolio-replays/${t1.replayId}/events?symbol=VGT`)).body;
      expect(ev.events.every((e) => e.symbol === 'VGT')).toBe(true);
      expect(ev.events.filter((e) => e.kind === 'rejected_signal').length).toBe(6);
      expect((await get(`/api/portfolio-replays/${t1.replayId}/events?symbol=GDX`)).status).toBe(200);
      const candles = await get<{ d: string[] }>(`/api/portfolio-replays/${t1.replayId}/candles?symbol=VGT`);
      expect(candles.status).toBe(200);
      expect(candles.body.d[0]).toBe('2016-01-04');
      expect(candles.body.d.at(-1)).toBe('2026-10-30');
      expect((await get(`/api/portfolio-replays/${t1.replayId}/candles?symbol=GDX`)).status).toBe(400); // not a symbol of a VGT-only replay
      const eq = (await get<{ marked: number[]; drawdown: number[] }>(`/api/portfolio-replays/${t1.replayId}/equity`)).body;
      expect(eq.marked.at(-1)).toBe(271525.33);
      expect(Math.max(...eq.drawdown)).toBe(19534.41);
      // browsing created no saved run and wrote nothing outside the replay cache
      expect(repo.listRuns({ limit: 100 })).toHaveLength(runsBefore);
      expect(readdirSync(join(state, 'portfolio-cache', 'entries'))).toHaveLength(1);
      expect(existsSync(join(state, 'runs'))).toBe(false);
    },
    120_000
  );

  it.skipIf(!hasData)(
    'releases a queued replay nobody waits for, and evicts a tampered cache entry instead of serving it',
    async () => {
      const running = (await post<Ticket>('/api/portfolios/c4/replay')).body; // occupies the one replay slot
      const queued = (await post<Ticket>('/api/portfolios/c4-refined/replay')).body;
      expect(queued.state).toBe('queued');
      const released = (await post<Ticket>(`/api/portfolio-replays/tickets/${queued.ticket}/release`)).body;
      expect(released.state).toBe('cancelled');
      expect(portfolios.cacheStatus().queued).toEqual([]);
      const done = await until(running);
      expect(done.state).toBe('completed');
      expect(portfolios.cacheStatus().entries).toBe(2);
      // tamper with the cached metrics: the read refuses it, the entry is evicted, a new request replays again
      const dir = join(state, 'portfolio-cache', 'entries', done.replayId.slice(3));
      writeFileSync(join(dir, 'metrics.json'), '{"tampered":true}\n');
      expect((await get(`/api/portfolio-replays/${done.replayId}`)).status).toBe(410);
      expect(existsSync(dir)).toBe(false);
      const again = (await post<Ticket>('/api/portfolios/c4/replay')).body;
      expect(again.cacheHit).toBe(false);
      expect((await until(again)).state).toBe('completed');
    },
    120_000
  );
});
