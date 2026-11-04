// The frozen phenotype catalogue: the export contract and the import CLI (manifest and record hashes, the registry,
// effective parameters, sealed study records, idempotence, frozen ids), the read-only API, ONE run per action with its
// phenotype provenance (unedited and edited = a derived variation), the locked phenotype never changing, the
// shared-slot pool contract (locked books, start and costs; never independent symbol tests), and that no route
// searches, sweeps or schedules.

import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { importPhenotypes, phenotypeErrors } from '../importers/phenotypes.ts';
import { sealRecord } from '../importers/phenotype-export.ts';
import { loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { createHandler } from '../server/http.ts';
import type { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import type { RunDetail } from '../shared/contract.ts';
import { type PhenotypeExport, canonicalJson, exportShapeErrors, recordBody } from '../shared/phenotypes.ts';

const APP = join(import.meta.dirname, '..');
const FIX = join(APP, 'fixtures/phenotypes');
const GROWTH_EXPORT = join(FIX, 'growth-demo-2026-11');
const STUDY8_EXPORT = join(FIX, 'study8-expanded-regime-d1');

let state: string;
let cfg: ReturnType<typeof loadConfig>;
let repo: Repo;
const enqueued: string[] = [];
let base: string;
let server: ReturnType<typeof createServer>;

beforeAll(async () => {
  state = mkdtempSync(join(tmpdir(), 'strategy-lab-phenotypes-'));
  cfg = loadConfig({ STRATEGY_LAB_STATE_DIR: state, STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
  repo = new Repo(openDb(cfg.dbFile));
  const jobs = { enqueue: (_id: number, pid: string) => enqueued.push(pid), cancel: () => false, activeCount: 0 } as unknown as Jobs;
  const prices = new MarketPrices(cfg.repoRoot);
  const service = new LabService(repo, cfg, jobs, prices);
  // the API needs local symbols for Growth reruns: allow VGT/GDX whether or not data/ is present
  service.knownSymbols = () => new Set(['VGT', 'GDX']);
  const handler = createHandler({ cfg, repo, jobs, prices, service, log: () => {} });
  server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.close();
  repo.db.close();
  rmSync(state, { recursive: true, force: true });
});

const tamper = (src: string, edit: (exp: PhenotypeExport) => void, opts: { reseal?: boolean; remanifest?: boolean } = {}) => {
  const dir = join(mkdtempSync(join(tmpdir(), 'strategy-lab-export-')), 'x');
  cpSync(src, dir, { recursive: true });
  const exp = JSON.parse(readFileSync(join(dir, 'phenotypes.json'), 'utf8')) as PhenotypeExport;
  edit(exp);
  if (opts.reseal) exp.phenotypes = exp.phenotypes.map((p) => sealRecord(recordBody(p)));
  writeFileSync(join(dir, 'phenotypes.json'), `${JSON.stringify(exp, null, 2)}\n`);
  if (opts.remanifest ?? true) {
    const m = JSON.parse(readFileSync(join(dir, 'MANIFEST.json'), 'utf8'));
    m.files['phenotypes.json'] = createHash('sha256').update(readFileSync(join(dir, 'phenotypes.json'))).digest('hex');
    writeFileSync(join(dir, 'MANIFEST.json'), `${JSON.stringify(m, null, 2)}\n`);
  }
  return dir;
};

describe('the export contract', () => {
  it('the checked-in exports are valid and every record hash is its canonical record', () => {
    for (const dir of [GROWTH_EXPORT, STUDY8_EXPORT]) {
      const exp = JSON.parse(readFileSync(join(dir, 'phenotypes.json'), 'utf8')) as PhenotypeExport;
      expect(exportShapeErrors(exp)).toEqual([]);
      expect(phenotypeErrors(cfg.repoRoot, exp)).toEqual([]);
      for (const p of exp.phenotypes) expect(sealRecord(recordBody(p)).recordSha256).toBe(p.recordSha256);
    }
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe('{"a":[{"c":3,"d":2}],"b":1}');
  });
});

describe('import', () => {
  it('promotes exactly the listed phenotypes, idempotently', () => {
    const a = importPhenotypes(cfg, repo, GROWTH_EXPORT);
    expect(a.alreadyImported).toBe(false);
    expect(a.imported).toHaveLength(5);
    expect(importPhenotypes(cfg, repo, GROWTH_EXPORT)).toMatchObject({ alreadyImported: true, imported: [] });
    const b = importPhenotypes(cfg, repo, STUDY8_EXPORT);
    expect(b.imported).toHaveLength(1);
    expect(b.checks.join(' ')).toMatch(/study records: 5 file\(s\) present with matching sha256/);
    expect(repo.listPhenotypes().map((p) => [p.key, p.executionKind, p.runner])).toEqual([
      ['growth-demo-2026-11/off-vgt-1d', 'standalone', 'growth-trading'],
      ['growth-demo-2026-11/classic-d1-vgt-1d', 'standalone', 'growth-trading'],
      ['growth-demo-2026-11/breakout-vgt-1d', 'standalone', 'growth-trading'],
      ['growth-demo-2026-11/shallow-pullback-vgt-1d', 'standalone', 'growth-trading'],
      ['growth-demo-2026-11/ma-cross-vgt-1d', 'standalone', 'growth-trading'],
      ['study8-expanded-regime-d1/s8-vg-balanced', 'shared-slot pool', 'study8-pool']
    ]);
  });

  it('refuses tampered files, unverifiable records, inactive dimensions, unknown engines and changed frozen ids', () => {
    const refuse = (dir: string, re: RegExp) => expect(() => importPhenotypes(cfg, repo, dir)).toThrow(re);
    refuse(tamper(GROWTH_EXPORT, (e) => (e.phenotypes[0]!.name = 'renamed'), { remanifest: false }), /sha256 differs from MANIFEST/);
    refuse(tamper(GROWTH_EXPORT, (e) => (e.phenotypes[0]!.name = 'renamed')), /recordSha256 does not match/);
    refuse(
      tamper(GROWTH_EXPORT, (e) => (e.phenotypes[0]!.params!.breakoutBufferPercent = 3), { reseal: true }),
      /EFFECTIVE values only/
    );
    refuse(tamper(GROWTH_EXPORT, (e) => (e.phenotypes[0]!.strategy.version = '9.9.9'), { reseal: true }), /not registered/);
    refuse(
      tamper(GROWTH_EXPORT, (e) => (e.phenotypes[0]!.strategy.version = '1.0.0'), { reseal: true }),
      /cannot be launched \(legacy or read-only\)/
    );
    refuse(tamper(GROWTH_EXPORT, (e) => (e.phenotypes[1]!.params!.classicPullbackPercent = 99), { reseal: true }), /between 0.1 and 50/);
    refuse(
      tamper(STUDY8_EXPORT, (e) => (e.study.sealedRecords![0]!.sha256 = '0'.repeat(64))),
      /sha256 differs from the export/
    );
    // a new export reusing a frozen id with different content
    refuse(
      tamper(GROWTH_EXPORT, (e) => ((e.generatedAt = '2026-11-05T00:00:00.000Z'), (e.phenotypes[0]!.name = 'changed')), { reseal: true }),
      /exists \(PH-0001\) with different content/
    );
    expect(repo.listPhenotypes()).toHaveLength(6); // nothing was written by a refused import
  });
});

describe('API: read-only catalogue, one run per action', () => {
  const post = async (path: string, body: unknown) => {
    const r = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: (await r.json()) as RunDetail & { details?: string[] } };
  };

  it('lists and filters phenotypes with their capability', async () => {
    const all = (await (await fetch(`${base}/api/phenotypes`)).json()) as { id: string; capability: { runnable: boolean; reason: string } }[];
    expect(all).toHaveLength(6);
    expect(all.slice(0, 5).every((p) => p.capability.runnable)).toBe(true);
    const pool = (await (await fetch(`${base}/api/phenotypes?strategy=study8-d1-pool`)).json()) as { id: string; capability: { runnable: boolean; reason: string } }[];
    expect(pool.map((p) => p.id)).toEqual(['PH-0006']);
    expect(pool[0]!.capability.reason).toMatch(/one allocator replay|view-only/);
    const byRole = (await (await fetch(`${base}/api/phenotypes?role=balanced`)).json()) as unknown[];
    expect(byRole).toHaveLength(1);
    expect(((await (await fetch(`${base}/api/phenotypes?q=breakout`)).json()) as unknown[]).length).toBe(1);
  });

  it('runs a Growth phenotype as ONE run with its provenance; an edit is a derived variation; the phenotype stays frozen', async () => {
    const before = repo.phenotypeDetail('PH-0002')!;
    const n = enqueued.length;
    const asIs = await post('/api/phenotypes/PH-0002/runs', { from: '2020-01-02', to: '2020-12-31' });
    expect(asIs.status).toBe(201);
    expect(enqueued.length).toBe(n + 1);
    expect(asIs.body.phenotype).toMatchObject({ id: 'PH-0002', key: 'growth-demo-2026-11/classic-d1-vgt-1d', edited: false, executionKind: 'standalone' });
    expect(asIs.body.experiment.title).toBe('Phenotype reruns');
    expect(asIs.body.provenance).toMatchObject({ phenotype: { recordSha256: before.recordSha256, study: 'growth-demo-2026-11' } });
    const again = await post('/api/phenotypes/PH-0002/runs', { from: '2020-01-02', to: '2020-12-31' });
    expect(again.body.variation.id).toBe(asIs.body.variation.id);
    const edited = await post('/api/phenotypes/PH-0002/runs', { from: '2020-01-02', to: '2020-12-31', params: { classicPullbackPercent: 6 } });
    expect(edited.status).toBe(201);
    expect(edited.body.phenotype!.edited).toBe(true);
    expect(edited.body.variation.id).not.toBe(asIs.body.variation.id);
    expect((edited.body.provenance as { editedKeys: string[] }).editedKeys).toEqual(['classicPullbackPercent']);
    expect(repo.phenotypeDetail('PH-0002')).toEqual({ ...before, runCount: 3 }); // the frozen record is unchanged
    expect(repo.listRuns({ phenotype: 'PH-0002' })).toHaveLength(3);
    // invalid edits and sweep-shaped bodies are refused before anything is queued
    const m = enqueued.length;
    expect((await post('/api/phenotypes/PH-0002/runs', { from: '2020-01-02', to: '2020-12-31', params: { classicPullbackPercent: [6, 7] } })).status).toBe(400);
    expect((await post('/api/phenotypes/PH-0002/runs', { from: '2020-01-02', to: '2020-12-31', grid: { x: [1, 2] } })).status).toBe(400);
    expect((await post('/api/phenotypes/PH-9999/runs', { to: '2020-12-31' })).status).toBe(404);
    expect(enqueued.length).toBe(m);
  });

  it('a shared-slot pool phenotype keeps its sealed books, start and costs: never independent symbol tests', async () => {
    const p = repo.phenotypeDetail('PH-0006')!;
    const cap = (await (await fetch(`${base}/api/phenotypes/PH-0006`)).json()) as { capability: { runnable: boolean; locked?: string[]; fixedFrom?: string } };
    expect(cap.capability.runnable).toBe(true);
    expect(cap.capability.fixedFrom).toBe('2016-01-04');
    for (const [body, re] of [
      [{ to: '2026-10-29', params: { x: 1 } }, /sealed configuration only/],
      [{ to: '2026-10-29', symbols: ['VGT'] }, /never independent symbol tests/],
      [{ from: '2018-01-02', to: '2026-10-29' }, /fixed at 2016-01-04/],
      [{ to: '2016-05-01' }, /after the 2017-06-15 arming/]
    ] as const) {
      const r = await post('/api/phenotypes/PH-0006/runs', body);
      expect(r.status).toBe(400);
      expect(r.body.details!.join(' ')).toMatch(re);
    }
    const ok = await post('/api/phenotypes/PH-0006/runs', { to: '2026-10-29', title: 'pool rerun' });
    expect(ok.status).toBe(201);
    expect(ok.body.strategy.key).toBe('study8-d1-pool');
    expect(ok.body.symbols).toEqual(['GDX', 'VGT']);
    expect(ok.body.window).toMatchObject({ from: '2016-01-04', to: '2026-10-29', resolution: '1m' });
    const request = JSON.parse(readFileSync(join(state, 'runs', ok.body.id, 'request.json'), 'utf8'));
    expect(request).toMatchObject({ kind: 'study8-pool-rerun', alias: 's8-vg-balanced', sealedId: (p.record as { pool: { sealedId: string } }).pool.sealedId, costBps: 5, end: '2026-10-29' });
  });

  it('exposes no optimisation, sweep, batch or search-launching route', async () => {
    const handler = createHandler({ cfg, repo, jobs: {} as Jobs, prices: new MarketPrices(cfg.repoRoot), service: {} as LabService, log: () => {} });
    const mutating = handler.routes.filter((r) => !r.startsWith('GET '));
    expect(mutating.some((r) => /optimi|sweep|grid|batch|search|tune/i.test(r))).toBe(false);
    expect(mutating.filter((r) => /phenotype/.test(r))).toEqual(['POST ^\\/api\\/phenotypes\\/(PH-\\d{4,12})\\/runs$']);
    expect((await fetch(`${base}/api/phenotypes`, { method: 'POST' })).status).toBe(405);
  });
});
