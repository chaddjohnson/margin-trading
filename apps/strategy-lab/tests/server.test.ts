// Server: SQLite migrations and persistence, run-ID uniqueness, immutability enforced by the database, notes and
// bookmarks, newest-first ordering, request validation, the absence of any optimisation route, and access control.

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { LabValue } from '../shared/contract.ts';
import { RISE_FROM_RECENT_LOW } from '../shared/strategies.ts';
import { type Config, loadConfig } from '../server/config.ts';
import { migrate, migrationFiles, openDb } from '../server/db.ts';
import { createHandler } from '../server/http.ts';
import type { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';

const tmp = () => mkdtempSync(join(tmpdir(), 'strategy-lab-test-'));

function config(extra: Record<string, string> = {}): Config {
  const dir = tmp();
  return loadConfig({
    STRATEGY_LAB_STATE_DIR: dir,
    STRATEGY_LAB_STATIC_DIR: '',
    STRATEGY_LAB_SEED_DEMO: '0',
    ...extra
  });
}

const params: LabValue[] = [{ key: 'x', label: 'X', value: 5, unit: 'percent' }];

function seedRun(repo: Repo, opts: { canonical?: string; title?: string } = {}) {
  const e = repo.ensureExperiment('t', 'Test');
  const s = repo.ensureStrategy({
    key: 'k',
    version: '1',
    title: 'K',
    kind: 'entry_signal',
    runnable: false,
    description: '',
    params: null,
    sourceRef: null
  });
  const v = repo.findOrCreateVariation({
    strategyId: s.id,
    experimentId: e.id,
    params,
    canonical: opts.canonical ?? 'a',
    title: 'v',
    origin: 'manual',
    parentVariationId: null
  });
  const r = repo.createRun({
    variationId: v.id,
    title: opts.title ?? 'run',
    kind: 'manual',
    status: 'queued',
    dataOrigin: 'real',
    symbols: ['VGT'],
    window: { from: '2020-01-02', to: '2020-12-31', resolution: '1d', partition: 'training' },
    params,
    assumptions: [],
    request: null,
    priceSource: { kind: 'market', basisDate: '2020-01-02' },
    provenance: {},
    codeRevision: null
  });
  return { e, s, v, r };
}

const complete = (repo: Repo, id: number) =>
  repo.complete(id, {
    eventCount: 0,
    artifactDir: 'runs/x',
    artifactSha256: 'abc',
    metrics: null,
    provenance: {},
    priceSource: { kind: 'market', basisDate: '2020-01-02' }
  });

describe('SQLite schema, migrations and persistence', () => {
  it('applies migrations once, survives a restart, and refuses a changed migration', () => {
    const cfg = config();
    let db = openDb(cfg.dbFile);
    const repo = new Repo(db);
    const { r } = seedRun(repo);
    repo.addNote('run', r.publicId, 'first note');
    db.close();
    db = openDb(cfg.dbFile); // "restart"
    const again = new Repo(db);
    expect(again.runDetail(r.publicId)?.title).toBe('run');
    expect(again.listNotes('run', r.publicId)?.map((n) => n.body)).toEqual(['first note']);
    expect((db.prepare('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode).toBe('wal');
    expect((db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number }).foreign_keys).toBe(1);
    expect((db.prepare('SELECT count(*) AS n FROM schema_migrations').get() as { n: number }).n).toBe(
      migrationFiles().length
    );
    db.close();

    const dir = tmp();
    mkdirSync(join(dir, 'm'));
    writeFileSync(join(dir, 'm', '0001_a.sql'), 'CREATE TABLE a (x INTEGER);');
    const d2 = new DatabaseSync(':memory:');
    migrate(d2, join(dir, 'm'));
    writeFileSync(join(dir, 'm', '0001_a.sql'), 'CREATE TABLE a (y INTEGER);');
    expect(() => migrate(d2, join(dir, 'm'))).toThrow(/changed after it was applied/);
  });

  it('gives runs unique, stable, zero-padded ids independent of titles', () => {
    const repo = new Repo(openDb(':memory:'));
    const ids = Array.from({ length: 5 }, () => seedRun(repo, { title: 'same title' }).r.publicId);
    expect(new Set(ids).size).toBe(5);
    expect(ids[0]).toMatch(/^R-\d{6}$/);
    repo.setRunTitle(ids[0]!, 'renamed');
    expect(repo.runDetail(ids[0]!)?.id).toBe(ids[0]);
  });

  it('enforces immutable execution facts in the database', () => {
    const db = openDb(':memory:');
    const repo = new Repo(db);
    const { r, v } = seedRun(repo);
    expect(() => db.prepare('UPDATE runs SET params_json = ? WHERE id = ?').run('[]', r.id)).toThrow(/immutable/);
    expect(() => db.prepare('UPDATE variations SET params_json = ? WHERE id = ?').run('[]', v.id)).toThrow(/immutable/);
    complete(repo, r.id);
    expect(() => db.prepare("UPDATE runs SET metrics_json = '{}' WHERE id = ?").run(r.id)).toThrow(
      /finished run is immutable/
    );
    expect(() => db.prepare("UPDATE runs SET status = 'failed' WHERE id = ?").run(r.id)).toThrow(
      /finished run is immutable/
    );
    expect(() => db.prepare('DELETE FROM runs WHERE id = ?').run(r.id)).toThrow(/never deleted/);
    // Annotations stay editable.
    expect(repo.setRunTitle(r.publicId, 'new title')).toBe(true);
    expect(repo.setBookmark('run', r.publicId, true)).toBe(true);
  });

  it('notes: add, edit, delete; bookmarks: toggle and filter', () => {
    const repo = new Repo(openDb(':memory:'));
    const a = seedRun(repo, { canonical: 'a' });
    const b = seedRun(repo, { canonical: 'b' });
    const n = repo.addNote('run', a.r.publicId, '**hello**')!;
    expect(repo.updateNote(n.id, 'edited')).toBe(true);
    expect(repo.listNotes('run', a.r.publicId)![0]!.body).toBe('edited');
    expect(repo.listRuns()[0]!.noteCount + repo.listRuns()[1]!.noteCount).toBe(1);
    expect(repo.deleteNote(n.id)).toBe(true);
    expect(repo.listNotes('run', a.r.publicId)).toEqual([]);
    expect(repo.addNote('run', 'R-999999', 'x')).toBeNull();

    repo.setBookmark('run', b.r.publicId, true);
    repo.setBookmark('variation', a.v.publicId, true);
    expect(repo.listRuns({ bookmarked: true }).map((r) => r.id)).toEqual([b.r.publicId]);
    expect(repo.listVariations({ bookmarked: true }).map((v) => v.id)).toEqual([a.v.publicId]);
    repo.setBookmark('run', b.r.publicId, false);
    expect(repo.listRuns({ bookmarked: true })).toEqual([]);
  });

  it('orders runs and variations by their latest result, newest first; never-run variations last', () => {
    const db = openDb(':memory:');
    const repo = new Repo(db);
    const v1 = seedRun(repo, { canonical: 'one' });
    const v2 = seedRun(repo, { canonical: 'two' });
    const v3 = seedRun(repo, { canonical: 'three' }); // stays queued: no result
    // Test-only: drop the guard to set deterministic completion times (v2 finished before v1).
    db.exec('DROP TRIGGER runs_results_immutable');
    db.prepare("UPDATE runs SET status = 'completed', completed_at = '2026-01-01T00:00:00.000Z' WHERE id = ?").run(
      v2.r.id
    );
    db.prepare("UPDATE runs SET status = 'completed', completed_at = '2026-02-01T00:00:00.000Z' WHERE id = ?").run(
      v1.r.id
    );
    expect(repo.listVariations().map((v) => v.id)).toEqual([v1.v.publicId, v2.v.publicId, v3.v.publicId]);
    const runs = repo.listRuns().map((r) => r.id);
    expect(runs[0]).toBe(v3.r.publicId); // queued now: created most recently
    expect(runs.slice(1)).toEqual([v1.r.publicId, v2.r.publicId]);
  });
});

describe('HTTP API', () => {
  let server: Server;
  let base: string;
  let cfg: Config;
  const enqueued: string[] = [];

  beforeAll(async () => {
    cfg = config();
    const db = openDb(cfg.dbFile);
    const repo = new Repo(db);
    const jobs = {
      enqueue: (_id: number, pid: string) => enqueued.push(pid),
      cancel: () => false,
      activeCount: 0
    } as unknown as Jobs;
    const prices = new MarketPrices(cfg.repoRoot);
    const service = new LabService(repo, cfg, jobs, prices);
    const handler = createHandler({ cfg, repo, jobs, prices, service, log: () => {} });
    server = createServer((req, res) => void handler(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    (globalThis as Record<string, unknown>).__routes = handler.routes;
  });
  afterAll(() => server.close());

  const post = (path: string, body: unknown) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  const request = (over: Record<string, unknown> = {}) => ({
    strategyKey: RISE_FROM_RECENT_LOW.key,
    strategyVersion: RISE_FROM_RECENT_LOW.version,
    params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 },
    symbols: ['VGT'],
    from: '2023-01-03',
    to: '2023-06-30',
    resolution: '1d',
    ...over
  });

  it('exposes no optimisation, sweep or batch-launch route', async () => {
    const routes = (globalThis as Record<string, unknown>).__routes as string[];
    const mutating = routes.filter((r) => !r.startsWith('GET '));
    expect(mutating.some((r) => /optimi|sweep|grid|batch|search/i.test(r))).toBe(false);
    for (const path of ['/api/optimize', '/api/optimization', '/api/sweeps', '/api/runs/sweep'])
      expect((await post(path, {})).status).toBe(404);
    expect((await post('/api/optimization-batches', {})).status).toBe(405);
  });

  it('rejects invalid or sweep-shaped run requests and accepts exactly one configuration', async () => {
    const bad = [
      request({ params: { advanceFromRecentLowPercent: [5, 6], recentLowLookbackBars: 20 } }),
      request({ params: { advanceFromRecentLowPercent: -1, recentLowLookbackBars: 20 } }),
      request({ params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 2.5 } }),
      request({ symbols: ['VGT; rm -rf /'] }),
      request({ symbols: ['NOPE'] }),
      request({ from: '2023-07-01', to: '2023-01-01' }),
      request({ resolution: '2h' }),
      request({ extra: 'x' }),
      request({ strategyKey: 'study8-d1-pool' })
    ];
    for (const b of bad) expect((await post('/api/runs', b)).status).toBe(400);
    expect(enqueued).toEqual([]);
    const res = await post('/api/runs', request());
    expect(res.status).toBe(201);
    expect(enqueued).toHaveLength(1);
  });

  it('editing X from 5% to 6% creates a new variation and run; the old run is unchanged', async () => {
    const a = (await (await post('/api/runs', request({ title: 'five' }))).json()) as {
      id: string;
      variation: { id: string };
      params: LabValue[];
    };
    const b = (await (
      await post(
        '/api/runs',
        request({
          title: 'six',
          params: { advanceFromRecentLowPercent: 6, recentLowLookbackBars: 20 },
          parentVariation: a.variation.id
        })
      )
    ).json()) as typeof a;
    const again = (await (await post('/api/runs', request({ title: 'five again' }))).json()) as typeof a;
    expect(b.variation.id).not.toBe(a.variation.id);
    expect(b.id).not.toBe(a.id);
    expect(again.variation.id).toBe(a.variation.id); // same configuration = same variation, new run
    expect(again.id).not.toBe(a.id);
    const old = (await (await fetch(`${base}/api/runs/${a.id}`)).json()) as typeof a;
    expect(old.params.find((p) => p.key === 'advanceFromRecentLowPercent')?.value).toBe(5);
    expect(b.params.find((p) => p.key === 'advanceFromRecentLowPercent')?.value).toBe(6);
  });

  it('only the title of a run can be changed through the API', async () => {
    const a = (await (await post('/api/runs', request())).json()) as { id: string };
    const patch = (body: unknown) =>
      fetch(`${base}/api/runs/${a.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
    expect((await patch({ params: [] })).status).toBe(400);
    expect((await patch({ title: 'renamed' })).status).toBe(200);
  });

  it('access control: Host header, client address and bearer token', async () => {
    const tokenCfg = config({ STRATEGY_LAB_TOKEN: 'x'.repeat(32), STRATEGY_LAB_ALLOWED_CIDRS: '10.9.9.0/24' });
    const repo = new Repo(openDb(tokenCfg.dbFile));
    const jobs = { activeCount: 0 } as unknown as Jobs;
    const prices = new MarketPrices(tokenCfg.repoRoot);
    const h = createHandler({
      cfg: tokenCfg,
      repo,
      jobs,
      prices,
      service: new LabService(repo, tokenCfg, jobs, prices),
      log: () => {}
    });
    const s2 = createServer((req, res) => void h(req, res));
    await new Promise<void>((r) => s2.listen(0, '127.0.0.1', () => r()));
    const port = (s2.address() as AddressInfo).port;
    expect((await fetch(`http://127.0.0.1:${port}/api/health`)).status).toBe(403); // 127.0.0.1 not in 10.9.9.0/24
    s2.close();

    const cfg3 = config({ STRATEGY_LAB_TOKEN: 'y'.repeat(32) });
    const repo3 = new Repo(openDb(cfg3.dbFile));
    const h3 = createHandler({
      cfg: cfg3,
      repo: repo3,
      jobs,
      prices,
      service: new LabService(repo3, cfg3, jobs, prices),
      log: () => {}
    });
    const s3 = createServer((req, res) => void h3(req, res));
    await new Promise<void>((r) => s3.listen(0, '127.0.0.1', () => r()));
    const p3 = (s3.address() as AddressInfo).port;
    expect((await fetch(`http://127.0.0.1:${p3}/api/health`)).status).toBe(200);
    expect((await fetch(`http://127.0.0.1:${p3}/api/runs`)).status).toBe(401);
    expect(
      (await fetch(`http://127.0.0.1:${p3}/api/runs`, { headers: { authorization: `Bearer ${'y'.repeat(32)}` } }))
        .status
    ).toBe(200);
    expect(
      (await fetch(`http://127.0.0.1:${p3}/api/runs`, { headers: { authorization: 'Bearer wrong' } })).status
    ).toBe(401);
    // fetch() cannot set Host (a forbidden header), so these go through node:http.
    const withHost = (host: string) =>
      new Promise<number>((resolve, reject) => {
        const r = httpRequest({ host: '127.0.0.1', port: p3, path: '/api/health', headers: { host } }, (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        });
        r.on('error', reject);
        r.end();
      });
    expect(await withHost('evil.example.com')).toBe(421);
    expect(await withHost('apollo:4317')).toBe(200);
    expect(await withHost('apollo.tail1234.ts.net')).toBe(200);
    s3.close();
  });

  it('refuses to bind every interface, and requires a token off loopback', () => {
    expect(() => config({ STRATEGY_LAB_HOSTS: '0.0.0.0' })).toThrow(/every interface/);
    const c = config({ STRATEGY_LAB_HOSTS: '127.0.0.1,100.101.102.103' });
    expect(c.token).toMatch(/^[\w-]{24,}$/);
  });
});
