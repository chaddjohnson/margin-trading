// The research bundle (server/export.ts) and the comparison (server/compare.ts) on the synthetic Growth fixture pair:
// the ZIP parses and every CRC verifies; manifest checksums; artifacts are unmodified copies; entry ↔ exit linkage;
// UTC and America/New_York times; gross − costs − interest = net; attribution labelled descriptive; the optional
// minute marks; legacy/partial runs say what is unavailable instead of inventing it; deterministic bytes; the access
// token never leaks; the download route needs the token and serves only completed runs. Comparison: ON vs OFF is
// comparable and path-dependent; mismatched assumptions are flagged; the route only reads.

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compareRuns } from '../server/compare.ts';
import { loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { buildResearchBundle, csv, newYork } from '../server/export.ts';
import { createHandler } from '../server/http.ts';
import { PreviewService } from '../server/previews.ts';
import type { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import { readZip, writeZip } from '../server/zip.ts';
import { FIXTURE_SYMBOL, seedGrowthPair } from './growth-fixture.ts';

const TOKEN = 'fixture-token-0123456789abcdefABCDEF';
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const endCell = () => {
    row.push(cell);
    cell = '';
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') endCell();
    else if (c === '\n') {
      endCell();
      rows.push(row);
      row = [];
    } else cell += c;
  }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i] ?? ''])));
};

let state: string;
let cfg: ReturnType<typeof loadConfig>;
let repo: Repo;
let ids: { on: string; off: string };

beforeAll(() => {
  state = mkdtempSync(join(tmpdir(), 'strategy-lab-export-'));
  cfg = { ...loadConfig({ STRATEGY_LAB_STATE_DIR: state, STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' }), token: TOKEN };
  repo = new Repo(openDb(cfg.dbFile));
  ids = seedGrowthPair(repo, cfg);
});
afterAll(() => {
  repo.db.close();
  rmSync(state, { recursive: true, force: true });
});

describe('zip writer', () => {
  it('round-trips stored and deflated entries with verified CRCs, and is deterministic', () => {
    const entries = [
      { name: 'a.txt', data: Buffer.from('x') },
      { name: 'dir/b.json', data: Buffer.from(JSON.stringify({ k: 'v'.repeat(500) })) }
    ];
    const z = writeZip(entries, new Date('2026-11-04T12:00:00Z'));
    expect(writeZip(entries, new Date('2026-11-04T12:00:00Z')).equals(z)).toBe(true);
    const back = readZip(z);
    expect([...back.keys()]).toEqual(['a.txt', 'dir/b.json']);
    expect(back.get('dir/b.json')!.toString()).toBe(entries[1]!.data.toString());
    expect(() => writeZip([{ name: '../x', data: Buffer.alloc(0) }], new Date())).toThrow(/invalid entry name/);
    const bad = Buffer.from(z);
    const at = 30 + 'a.txt'.length; // a.txt's stored data byte, after its 30-byte local header and name
    bad.writeUInt8(bad.readUInt8(at) ^ 0xff, at);
    expect(() => readZip(bad)).toThrow(/CRC mismatch/);
  });

  it('formats CSV cells and New York times explicitly', () => {
    expect(csv(['a', 'b'], [['x,y', 'he said "hi"']])).toBe('a,b\n"x,y","he said ""hi"""\n');
    expect(newYork('2020-01-06T21:00:00Z')).toBe('2020-01-06 16:00:00 EST');
    expect(newYork('2020-07-06T20:00:00Z')).toBe('2020-07-06 16:00:00 EDT');
  });
});

describe('research bundle', () => {
  it('holds verified unmodified artifacts, checksums, linked trades, reconciled money, UTC + ET, attribution', () => {
    const b = buildResearchBundle(cfg, repo, ids.on);
    const files = readZip(b.zip);
    expect(b.filename).toBe(`strategy-lab-${ids.on}.zip`);
    for (const f of ['README.md', 'manifest.json', 'run.json', 'parameters.json', 'events.csv', 'trades.csv', 'continuation-episodes.csv', 'decision-log.csv', 'daily-marks.csv', 'attribution.json', 'attribution.md'])
      expect(files.has(f), f).toBe(true);
    const manifest = JSON.parse(files.get('manifest.json')!.toString());
    expect(manifest.schema).toBe('strategy-lab.research-bundle');
    for (const [name, m] of Object.entries(manifest.files as Record<string, { sha256: string; bytes: number }>)) {
      expect(sha(files.get(name)!), name).toBe(m.sha256);
      expect(files.get(name)!.length).toBe(m.bytes);
    }
    // unmodified copies: byte-identical to the run directory, and to the run's own manifest
    const dir = join(state, 'runs', ids.on);
    for (const f of ['events.json', 'metrics.json', 'trades.json', 'decisions.json', 'request.json'])
      expect(files.get(`artifacts/${f}`)!.equals(readFileSync(join(dir, f))), f).toBe(true);
    expect(files.has('artifacts/minute-marks.csv.gz')).toBe(false);
    expect(manifest.unavailable['minute-marks.csv.gz']).toMatch(/include minute marks/);
    const trades = parseCsv(files.get('trades.csv')!.toString());
    expect(trades.map((t) => [t.trade, t.origin, t.method, t.status])).toEqual([
      ['T-1', 'base_growth', '', 'closed'],
      ['T-2', 'continuation', 'classic_d1', 'closed'],
      ['T-3', 'base_growth', '', 'open']
    ]);
    for (const t of trades)
      expect(Math.abs(Number(t.gross_before_costs_usd) - Number(t.costs_usd) - Number(t.interest_usd) - Number(t.net_usd))).toBeLessThan(0.005);
    const events = parseCsv(files.get('events.csv')!.toString());
    for (const e of events.filter((x) => x.kind === 'executed_exit')) {
      const entry = events.find((x) => x.id === e.linked_event_id)!;
      expect(entry.linked_event_id).toBe(e.id);
      expect(entry.trade_id).toBe(e.trade_id);
      expect(Date.parse(e.t_utc!)).toBeGreaterThan(Date.parse(entry.t_utc!));
    }
    expect(events.every((e) => /Z$/.test(e.t_utc!) && /E[SD]T$/.test(e.t_new_york!))).toBe(true);
    const attribution = JSON.parse(files.get('attribution.json')!.toString());
    expect(Object.keys(attribution[FIXTURE_SYMBOL].attribution.byOrigin).sort()).toEqual(['base_growth', 'continuation:classic_d1']);
    expect(files.get('attribution.md')!.toString()).toMatch(/descriptive/i);
    const readme = files.get('README.md')!.toString();
    expect(readme).toMatch(/STANDALONE PER SYMBOL/);
    expect(readme).toMatch(/DESCRIPTIVE: it is not the incremental effect/);
    expect(readme).toMatch(/SYNTHETIC demo data/);
    expect(parseCsv(files.get('continuation-episodes.csv')!.toString())[0]).toMatchObject({ id: 'C-1', end: 'triggered', trade: 'T-2' });
    const params = JSON.parse(files.get('parameters.json')!.toString());
    expect(params.effective.continuationEnabled).toBe(true);
    expect(Object.keys(params.savedNotApplied)).toContain('breakoutBufferPercent');
  });

  it('is deterministic, adds the minute marks only on request, and refuses a bundle that would leak the token', () => {
    expect(buildResearchBundle(cfg, repo, ids.on).zip.equals(buildResearchBundle(cfg, repo, ids.on).zip)).toBe(true);
    const withMarks = readZip(buildResearchBundle(cfg, repo, ids.on, { minuteMarks: true }).zip);
    expect(withMarks.has('artifacts/minute-marks.csv.gz')).toBe(true);
    repo.setRunTitle(ids.off, `leak ${TOKEN}`);
    expect(() => buildResearchBundle(cfg, repo, ids.off)).toThrow(/contains the access token/);
    repo.setRunTitle(ids.off, 'Growth fixture continuation OFF');
  });

  it('says what is unavailable for a run without the Growth 1.1.0 artifacts (legacy or import)', () => {
    rmSync(join(state, 'runs', ids.off, 'decisions.json'));
    const b = buildResearchBundle({ ...cfg, token: null }, repo, ids.off);
    const files = readZip(b.zip);
    expect(files.has('decision-log.csv')).toBe(false);
    expect(b.manifest.unavailable).toMatchObject({ 'decision-log.csv': expect.stringMatching(/not recorded by this run/) });
    expect(files.get('README.md')!.toString()).toMatch(/Not available in this bundle/);
  });

  it('refuses an artifact that no longer matches its manifest', () => {
    const run = seedGrowthPair(repo, cfg, { to: '2020-03-30' });
    const file = join(state, 'runs', run.on, 'trades.json');
    const original = readFileSync(file);
    writeFileSync(file, Buffer.concat([original, Buffer.from(' ')]));
    expect(() => buildResearchBundle(cfg, repo, run.on)).toThrow(/no longer matches its manifest/);
    writeFileSync(file, original);
  });
});

describe('comparison', () => {
  it('ON vs OFF: comparable, trades matched by decision, metrics side by side, non-additivity stated', () => {
    const c = compareRuns(cfg, repo, ids.off, ids.on);
    expect(c.comparable).toBe(true);
    expect(c.mismatches).toEqual([]);
    expect(c.nonAdditivity).toMatch(/path-dependent counterfactual/);
    const s = c.perSymbol[FIXTURE_SYMBOL]!;
    expect(s.trades.identical).toBe(1); // T-1
    expect(s.trades.introduced.map((t) => [t.trade, t.origin])).toEqual([['T-2', 'continuation']]);
    expect(s.trades.shifted.map((x) => [x.a.trade, x.b.trade])).toEqual([['T-2', 'T-3']]); // same base decision, other outcome
    expect(s.metrics.bMinusA!.totalMarkedNetUsd).toBeCloseTo(s.metrics.b!.totalMarkedNetUsd! - s.metrics.a!.totalMarkedNetUsd!, 6);
    expect(s.continuation.b).toMatchObject({ episodes: 1, filled: 1 });
  });

  it('flags runs that are not methodologically comparable', () => {
    const other = seedGrowthPair(repo, cfg, { to: '2020-03-27' });
    const c = compareRuns(cfg, repo, ids.off, other.on);
    expect(c.comparable).toBe(false);
    expect(c.mismatches.join()).toMatch(/window/);
    expect(c.verdict).toMatch(/NOT comparable/);
  });
});

describe('HTTP: download and compare routes', () => {
  let base: string;
  let server: ReturnType<typeof createServer>;
  beforeAll(async () => {
    const jobs = { enqueue: () => {}, cancel: () => false, activeCount: 0 } as unknown as Jobs;
    const prices = new MarketPrices(cfg.repoRoot);
    const service = new LabService(repo, cfg, jobs, prices);
    const handler = createHandler({ cfg, repo, jobs, prices, service, previews: new PreviewService(cfg, repo, service), log: () => {} });
    server = createServer((req, res) => void handler(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => server.close());
  const auth = { Authorization: `Bearer ${TOKEN}` };

  it('downloads a ZIP only with the token, only for a known completed run', async () => {
    expect((await fetch(`${base}/api/runs/${ids.on}/export`)).status).toBe(401);
    const r = await fetch(`${base}/api/runs/${ids.on}/export`, { headers: auth });
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/zip');
    expect(r.headers.get('content-disposition')).toBe(`attachment; filename="strategy-lab-${ids.on}.zip"`);
    expect(readZip(Buffer.from(await r.arrayBuffer())).has('manifest.json')).toBe(true);
    expect((await fetch(`${base}/api/runs/R-999999/export`, { headers: auth })).status).toBe(404);
    expect((await fetch(`${base}/api/runs/${ids.on}/export`, { method: 'POST', headers: auth })).status).toBe(405);
  });

  it('compares through GET only', async () => {
    const r = await fetch(`${base}/api/compare?a=${ids.off}&b=${ids.on}`, { headers: auth });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { comparable: boolean }).comparable).toBe(true);
    expect((await fetch(`${base}/api/compare?a=${ids.on}&b=${ids.on}`, { headers: auth })).status).toBe(400);
    expect((await fetch(`${base}/api/compare?a=${ids.off}&b=${ids.on}`, { method: 'POST', headers: auth })).status).toBe(405);
  });
});
