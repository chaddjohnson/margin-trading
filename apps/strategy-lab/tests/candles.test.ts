// Daily OHLC candles (Task 16): aggregation from known minute O/H/L/C in a fixture repository (a wick beyond every minute
// close, pre-market and after-hours bars, DST, an early close, a holiday, missing minutes, the closing-print convention,
// a missing print, a split basis, invalid data, the window), the series cache and its invalidation, the read-only HTTP
// routes with their validated response, and — on the real files when present — VGT's 8:1 split and per-symbol isolation.

import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { type CandlesResponse, ohlcProblem, validateCandles } from '../shared/candles.ts';
import type { LabValue } from '../shared/contract.ts';
import { loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { createHandler } from '../server/http.ts';
import type { Jobs } from '../server/jobs.ts';
import { dailyCandles, MarketPrices, windowPoints } from '../server/prices.ts';
import { PreviewService } from '../server/previews.ts';
import { Repo } from '../server/repo.ts';
import type { LabService } from '../server/service.ts';

// ----- the fixture repository -----

type Bar = [iso: string, o: number, h: number, l: number, c: number, v?: number];

// 2023-03-10 is a Friday in EST (09:30 ET = 14:30Z, 16:00 ET = 21:00Z); 2023-03-13 a Monday in EDT (13:30Z / 20:00Z).
// 2023-11-23 is Thanksgiving (closed) and 2023-11-24 an early close (13:00 ET = 18:00Z).
const TST: Bar[] = [
  ['2023-03-10T13:00:00Z', 90, 120, 80, 95], // 08:00 EST pre-market: never part of the session
  ['2023-03-10T14:30:00Z', 100, 101.5, 99.6, 100.2], // the first regular minute: its OPEN is the day's open
  ['2023-03-10T14:31:00Z', 100.2, 100.9, 98.7, 100.0], // low 98.7: below every minute close
  // 14:32 has no bar (no trade that minute)
  ['2023-03-10T14:33:00Z', 100.0, 102.4, 99.9, 101.0], // high 102.4: above every minute close
  ['2023-03-10T20:59:00Z', 101.0, 101.2, 100.8, 101.1],
  ['2023-03-10T21:00:00Z', 101.3, 101.5, 101.0, 101.2], // the closing print = this bar's open (101.3)
  ['2023-03-10T21:05:00Z', 150, 160, 140, 155], // after hours: never part of the session
  ['2023-03-13T13:29:00Z', 50, 50, 50, 50], // 09:29 EDT: before the open
  ['2023-03-13T13:30:00Z', 102, 103, 101.5, 102.5], // 09:30 EDT (14:30Z would be 10:30 after the DST switch)
  ['2023-03-13T19:59:00Z', 102.5, 102.8, 102.0, 102.1],
  ['2023-03-13T20:00:00Z', 104, 104, 104, 104], // the print, above every minute high: it widens the range
  ['2023-11-22T14:30:00Z', 99, 99.5, 98.5, 99.2],
  ['2023-11-22T21:00:00Z', 99, 99, 99, 99], // print = the open: a doji
  ['2023-11-24T14:30:00Z', 98, 98.6, 97.9, 98.4],
  ['2023-11-24T17:59:00Z', 98.4, 98.5, 98.1, 98.2],
  ['2023-11-24T18:00:00Z', 98.3, 98.3, 98.3, 98.3], // the 13:00 ET early-close print
  ['2023-11-24T18:01:00Z', 120, 125, 90, 110], // after the early close
  ['2023-11-24T20:59:00Z', 130, 131, 129, 130], // 15:59 ET: a regular minute on a normal day, not on this one
  ['2023-11-27T14:30:00Z', 97, 97.5, 96.5, 97.2],
  ['2023-11-27T20:59:00Z', 97.2, 97.4, 96.9, 96.95], // no print follows: the close is this minute's close
  ['2023-11-28T14:30:00Z', 48.5, 49, 48, 48.8], // a 2-for-1 split takes effect: raw prices halve
  ['2023-11-28T21:00:00Z', 48.9, 48.9, 48.9, 48.9],
  ['2023-11-29T14:30:00Z', 50, 49.5, 48.5, 49], // a corrupt row: open above high
  ['2023-11-29T21:00:00Z', 49.2, 49.2, 49.2, 49.2]
];
// Another symbol with very different prices, to prove that no symbol's candles contain another's.
const OTH: Bar[] = [
  ['2023-03-10T14:30:00Z', 20, 20.5, 19.8, 20.1],
  ['2023-03-10T21:00:00Z', 20.2, 20.2, 20.2, 20.2],
  ['2023-11-28T14:30:00Z', 21, 21.4, 20.9, 21.3],
  ['2023-11-28T21:00:00Z', 21.35, 21.35, 21.35, 21.35]
];

const csv = (bars: Bar[]) => bars.map(([t, o, h, l, c, v = 1000]) => `"${t}",${o},${h},${l},${c},${v}`).join('\n') + '\n';

function fixtureRepo() {
  const root = mkdtempSync(join(tmpdir(), 'strategy-lab-candles-'));
  mkdirSync(join(root, 'config/market-events'), { recursive: true });
  writeFileSync(
    join(root, 'config/market-events/splits.json'),
    JSON.stringify({
      schemaVersion: 1,
      splits: [{ symbol: 'TST', effectiveDate: '2023-11-28', ratio: 2, source: 'test fixture: a 2-for-1 split, not a real event' }]
    })
  );
  for (const [sym, bars] of [
    ['TST', TST],
    ['OTH', OTH]
  ] as const) {
    mkdirSync(join(root, 'data', sym), { recursive: true });
    writeFileSync(join(root, 'data', sym, 'data.csv'), csv(bars));
  }
  return root;
}

const byDate = (c: ReturnType<typeof dailyCandles>, d: string) => {
  const i = c.d.indexOf(d);
  if (i < 0) return null;
  return { o: c.o[i]!, h: c.h[i]!, l: c.l[i]!, c: c.c[i]!, x: c.x[i]!, print: c.print[i], minutes: c.minutes[i], scheduled: c.scheduled[i], factor: c.factor[i] };
};

describe('daily OHLC aggregation from minute O/H/L/C (fixture)', async () => {
  const root = fixtureRepo();
  const prices = new MarketPrices(root);
  const s = await prices.series('TST');
  const all = dailyCandles(s, prices.factorFor('TST', '2023-03-10', s), '2023-01-01', '2023-12-31');

  it('open = first regular minute’s open, high/low = minute HIGHS/LOWS (a wick beyond every minute close), close = the print', () => {
    expect(byDate(all, '2023-03-10')).toMatchObject({ o: 100, h: 102.4, l: 98.7, c: 101.3, print: 1 });
    const closes = [100.2, 100.0, 101.0, 101.1, 101.3];
    expect(102.4).toBeGreaterThan(Math.max(...closes));
    expect(98.7).toBeLessThan(Math.min(...closes));
  });

  it('drops pre-market and after-hours bars (08:00 EST, 21:05Z, 09:29 EDT, after an early close)', () => {
    const d = byDate(all, '2023-03-10')!;
    expect(d.h).toBeLessThan(120); // neither the pre-market 120 nor the after-hours 160
    expect(d.l).toBeGreaterThan(80);
    expect(byDate(all, '2023-03-13')!.o).toBe(102); // not the 09:29 EDT bar's 50
    expect(byDate(all, '2023-11-24')).toMatchObject({ o: 98, h: 98.6, l: 97.9, c: 98.3 }); // not 125 / 90 / 131
  });

  it('follows America/New_York across DST: 09:30 is 14:30Z in EST and 13:30Z in EDT; x is the session’s midpoint', () => {
    expect(new Date(byDate(all, '2023-03-10')!.x).toISOString()).toBe('2023-03-10T17:45:00.000Z'); // 12:45 EST
    expect(new Date(byDate(all, '2023-03-13')!.x).toISOString()).toBe('2023-03-13T16:45:00.000Z'); // 12:45 EDT
  });

  it('an early close ends at 13:00 ET (210 scheduled minutes); a holiday has no candle', () => {
    const d = byDate(all, '2023-11-24')!;
    expect(d.scheduled).toBe(210);
    expect(new Date(d.x).toISOString()).toBe('2023-11-24T16:15:00.000Z'); // 09:30–13:00 ET midpoint, 11:15 EST
    expect(all.d).not.toContain('2023-11-23'); // Thanksgiving
    expect(all.d).toEqual(['2023-03-10', '2023-03-13', '2023-11-22', '2023-11-24', '2023-11-27', '2023-11-28']);
  });

  it('counts minutes with a bar (missing minutes are not invented) against the scheduled 390', () => {
    expect(byDate(all, '2023-03-10')).toMatchObject({ minutes: 4, scheduled: 390 });
    expect(byDate(all, '2023-11-24')).toMatchObject({ minutes: 2, scheduled: 210 });
  });

  it('closing-print convention: the print is the close AND part of the range; without a print the last minute closes it', () => {
    expect(byDate(all, '2023-03-13')).toMatchObject({ o: 102, h: 104, l: 101.5, c: 104, print: 1 });
    expect(byDate(all, '2023-11-27')).toMatchObject({ o: 97, h: 97.5, l: 96.5, c: 96.95, print: 0 });
    expect(byDate(all, '2023-11-22')).toMatchObject({ o: 99, c: 99 }); // a doji: close = open exactly
  });

  it('split basis: all four prices of a session carry the SAME factor; another basis leaves them raw', () => {
    expect(byDate(all, '2023-11-28')).toMatchObject({ o: 97, h: 98, l: 96, c: 97.8, factor: 2 });
    expect(byDate(all, '2023-11-27')).toMatchObject({ factor: 1, o: 97 });
    const after = dailyCandles(s, prices.factorFor('TST', '2023-11-28', s), '2023-11-28', '2023-11-28');
    expect(byDate(after, '2023-11-28')).toMatchObject({ o: 48.5, h: 49, l: 48, c: 48.9, factor: 1 });
  });

  it('a session failing low ≤ min(open, close) ≤ max(open, close) ≤ high gets no candle and is listed with the reason', () => {
    const late = dailyCandles(s, prices.factorFor('TST', '2023-11-29', s), '2023-11-29', '2023-12-31');
    expect(late.d).toEqual([]);
    expect(late.omitted).toEqual([{ date: '2023-11-29', reason: expect.stringMatching(/above high/) }]);
    for (let i = 0; i < all.d.length; i++) expect(ohlcProblem(all.o[i]!, all.h[i]!, all.l[i]!, all.c[i]!)).toBeNull();
  });

  it('returns only the requested window’s sessions', () => {
    const w = dailyCandles(s, prices.factorFor('TST', '2023-11-22', s), '2023-11-22', '2023-11-27');
    expect(w.d).toEqual(['2023-11-22', '2023-11-24', '2023-11-27']);
    expect([w.firstSession, w.lastSession]).toEqual(['2023-11-22', '2023-11-27']);
  });

  it('agrees with the line: each close is the session’s last line point, and every line point lies within low–high', () => {
    const f = prices.factorFor('TST', '2023-03-10', s);
    const line = windowPoints(s, f, '2023-01-01', '2023-11-28', null, null, 100_000).points;
    for (const [i, d] of all.d.entries()) {
      const pts = line.filter(([t]) => t >= all.x[i]! - 5 * 3600_000 && t <= all.x[i]! + 5 * 3600_000).map(([, v]) => v);
      expect(pts.at(-1), d).toBeCloseTo(all.c[i]!, 9);
      for (const v of pts) expect(v >= all.l[i]! - 1e-9 && v <= all.h[i]! + 1e-9, d).toBe(true);
    }
  });

  it('keeps symbols apart: OTH’s candles are its own prices only', async () => {
    const o = await prices.series('OTH');
    const oc = dailyCandles(o, prices.factorFor('OTH', '2023-03-10', o), '2023-01-01', '2023-12-31');
    expect(oc.d).toEqual(['2023-03-10', '2023-11-28']);
    expect(Math.max(...oc.h)).toBeLessThan(22); // the OTH-only split-free range; no TST price (≥ 48) leaks in
    expect(oc.factor).toEqual([1, 1]); // the TST split never applies to OTH
  });
});

describe('candle cache and market-data invalidation', () => {
  it('reuses the loaded series until the file changes, then reloads it (a new session appears)', async () => {
    const root = fixtureRepo();
    const logs: string[] = [];
    const prices = new MarketPrices(root, (m) => logs.push(m));
    const a = await prices.series('TST');
    const b = await prices.series('TST');
    expect(b).toBe(a);
    expect(logs.filter((l) => l.includes('loaded TST'))).toHaveLength(1);
    appendFileSync(join(root, 'data/TST/data.csv'), csv([['2023-11-30T14:30:00Z', 49, 49.6, 48.8, 49.4], ['2023-11-30T21:00:00Z', 49.5, 49.5, 49.5, 49.5]]));
    const c = await prices.series('TST');
    expect(c).not.toBe(a);
    expect(logs.filter((l) => l.includes('loaded TST'))).toHaveLength(2);
    const cd = dailyCandles(c, prices.factorFor('TST', '2023-11-30', c), '2023-11-30', '2023-11-30');
    expect(cd.d).toEqual(['2023-11-30']);
    expect([cd.o[0], cd.h[0], cd.l[0], cd.c[0]]).toEqual([49, 49.6, 48.8, 49.5]);
  });
});

// ----- the HTTP routes -----

const params: LabValue[] = [{ key: 'x', label: 'X', value: 5, unit: 'percent' }];

function seed(repo: Repo, opts: { symbols: string[]; synthetic?: boolean; from: string; to: string; basis: string }) {
  const e = repo.ensureExperiment('t', 'Test');
  const st = repo.ensureStrategy({ key: 'k', version: '1', title: 'K', kind: 'entry_signal', runnable: false, description: '', schema: null, sourceRef: null });
  const v = repo.findOrCreateVariation({ strategyId: st.id, experimentId: e.id, params, canonical: `c-${opts.symbols.join()}-${opts.synthetic}`, title: 'v', origin: 'manual', parentVariationId: null });
  const r = repo.createRun({
    variationId: v.id,
    title: 'candles',
    kind: 'manual',
    status: 'queued',
    dataOrigin: opts.synthetic ? 'synthetic' : 'real',
    symbols: opts.symbols,
    window: { from: opts.from, to: opts.to, resolution: '1d', partition: 'training' },
    params,
    assumptions: [],
    request: null,
    priceSource: opts.synthetic ? { kind: 'synthetic', datasetId: 'demo' } : { kind: 'market', basisDate: opts.basis },
    provenance: {},
    codeRevision: null
  });
  return { id: r.publicId };
}

// Every file of a state directory, hashed — except SQLite's `-shm` shared-memory index, where every READER records its
// read marks (it holds no data: the database file and its WAL are hashed).
const treeHash = (dir: string): string => {
  const h = createHash('sha256');
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (!name.endsWith('-shm')) h.update(`${p}\0`).update(readFileSync(p));
    }
  };
  walk(dir);
  return h.digest('hex');
};

describe('GET /api/runs/:id/candles (read-only, typed, validated)', () => {
  it('serves the run’s symbol in its window and basis; refuses other symbols and synthetic data; changes nothing', async () => {
    const root = fixtureRepo();
    const cfg = loadConfig({ STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-candles-state-')), STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
    const db = openDb(cfg.dbFile);
    const repo = new Repo(db);
    const real = seed(repo, { symbols: ['TST'], from: '2023-03-10', to: '2023-11-28', basis: '2023-03-10' });
    const synth = seed(repo, { symbols: ['VGT'], synthetic: true, from: '2023-03-10', to: '2023-11-28', basis: '' });
    const handler = createHandler({ cfg, repo, jobs: {} as Jobs, prices: new MarketPrices(root), service: {} as LabService, previews: new PreviewService(cfg, repo, {} as LabService), log: () => {} });
    expect(handler.routes).toContain('GET ^\\/api\\/runs\\/(R-\\d{6,12})\\/candles$');
    expect(handler.routes).toContain('GET ^\\/api\\/previews\\/(PV-[0-9a-f]{64})\\/candles$');
    const server = createServer(handler);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const before = treeHash(cfg.stateDir);
      const runsBefore = JSON.stringify(repo.listRuns({ limit: 100 }));
      const res = await fetch(`${base}/api/runs/${real.id}/candles?symbol=TST`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as CandlesResponse;
      expect(validateCandles(body)).toEqual([]);
      expect(body).toMatchObject({ runId: real.id, symbol: 'TST', dataOrigin: 'real', basisDate: '2023-03-10', firstSession: '2023-03-10', lastSession: '2023-11-28' });
      expect(body.d).toEqual(['2023-03-10', '2023-03-13', '2023-11-22', '2023-11-24', '2023-11-27', '2023-11-28']); // not 11-29
      expect(body.units).toMatch(/split-adjusted to 2023-03-10/);
      expect([body.o.at(-1), body.h.at(-1), body.l.at(-1), body.c.at(-1)]).toEqual([97, 98, 96, 97.8]);
      expect((await fetch(`${base}/api/runs/${real.id}/candles?symbol=OTH`)).status).toBe(400); // not a symbol of the run
      expect((await fetch(`${base}/api/runs/${synth.id}/candles?symbol=VGT`)).status).toBe(409); // no genuine OHLC
      expect((await fetch(`${base}/api/runs/R-999999/candles?symbol=TST`)).status).toBe(404);
      expect((await fetch(`${base}/api/runs/${real.id}/candles?symbol=TST`, { method: 'POST' })).status).toBe(405);
      expect(treeHash(cfg.stateDir)).toBe(before); // nothing written: not the database, not an artifact
      expect(JSON.stringify(repo.listRuns({ limit: 100 }))).toBe(runsBefore);
    } finally {
      server.close();
      db.close();
    }
  });
});

describe('validateCandles refuses malformed responses (never repaired)', () => {
  const ok = (): CandlesResponse => ({
    runId: 'R-000001',
    symbol: 'TST',
    dataOrigin: 'real',
    basisDate: '2023-03-10',
    units: 'USD',
    source: 'x',
    firstSession: '2023-03-10',
    lastSession: '2023-03-13',
    d: ['2023-03-10', '2023-03-13'],
    x: [Date.parse('2023-03-10T17:45:00Z'), Date.parse('2023-03-13T16:45:00Z')],
    o: [100, 102],
    h: [102.4, 104],
    l: [98.7, 101.5],
    c: [101.3, 104],
    print: [1, 1],
    minutes: [4, 2],
    scheduled: [390, 390],
    factor: [1, 1],
    omitted: []
  });
  it('accepts a good response', () => expect(validateCandles(ok())).toEqual([]));
  it.each([
    ['high below the open', (r: CandlesResponse) => (r.h[0] = 99)],
    ['low above the close', (r: CandlesResponse) => (r.l[1] = 104.5)],
    ['unsorted sessions', (r: CandlesResponse) => r.d.reverse()],
    ['a short column', (r: CandlesResponse) => r.c.pop()],
    ['a non-finite price', (r: CandlesResponse) => (r.o[0] = Number.NaN)],
    ['synthetic origin', (r: CandlesResponse) => ((r as { dataOrigin: string }).dataOrigin = 'synthetic')]
  ])('refuses %s', (_name, spoil) => {
    const r = ok();
    spoil(r);
    expect(validateCandles(r).length).toBeGreaterThan(0);
  });
});

// ----- the real canonical files (skipped without data) -----

const hasData = existsSync(join(REPO_ROOT, 'data/VGT/data.csv')) && existsSync(join(REPO_ROOT, 'data/GDX/data.csv'));

describe.skipIf(!hasData)('real data: VGT’s 8:1 split (2026-04-21) and symbol isolation', () => {
  it('a pre-split basis multiplies every price of post-split sessions by 8, so the candles are continuous', async () => {
    const prices = new MarketPrices(REPO_ROOT);
    const s = await prices.series('VGT');
    const c = dailyCandles(s, prices.factorFor('VGT', '2026-03-02', s), '2026-03-02', '2026-06-30');
    const i = c.d.indexOf('2026-04-21');
    expect(i).toBeGreaterThan(0);
    expect(c.factor[i - 1]).toBe(1);
    expect(c.factor[i]).toBe(8);
    expect(Math.abs(c.o[i]! / c.c[i - 1]! - 1)).toBeLessThan(0.1); // no 8× jump at the split
    const raw = dailyCandles(s, () => 1, '2026-04-21', '2026-04-21');
    expect([c.o[i], c.h[i], c.l[i], c.c[i]]).toEqual([raw.o[0]! * 8, raw.h[0]! * 8, raw.l[0]! * 8, raw.c[0]! * 8]);
    expect(validateCandles({ runId: 'R-1', symbol: 'VGT', dataOrigin: 'real', basisDate: '2026-03-02', units: 'u', source: 's', ...c })).toEqual([]);
  });

  it('VGT and GDX candles come from their own files, and every 2023 candle passes the OHLC check', async () => {
    const prices = new MarketPrices(REPO_ROOT);
    const v = await prices.series('VGT');
    const g = await prices.series('GDX');
    const vc = dailyCandles(v, prices.factorFor('VGT', '2023-01-03', v), '2023-01-03', '2023-12-29');
    const gc = dailyCandles(g, prices.factorFor('GDX', '2023-01-03', g), '2023-01-03', '2023-12-29');
    expect(vc.d).toEqual(gc.d); // same NYSE sessions
    expect(vc.omitted).toEqual([]);
    expect(Math.min(...vc.l)).toBeGreaterThan(250); // VGT traded ~300–490 in 2023
    expect(Math.max(...gc.h)).toBeLessThan(40); // GDX ~25–36
    // the high/low come from minute highs/lows: on most days they lie beyond every minute close
    const f = prices.factorFor('VGT', '2023-01-03', v);
    const line = windowPoints(v, f, '2023-01-03', '2023-12-29', null, null, 1_000_000).points;
    let beyond = 0;
    for (const [i] of vc.d.entries()) {
      const pts = line.filter(([t]) => Math.abs(t - vc.x[i]!) < 5 * 3600_000).map(([, p]) => p);
      if (vc.h[i]! > Math.max(...pts) || vc.l[i]! < Math.min(...pts)) beyond++;
    }
    expect(beyond / vc.d.length).toBeGreaterThan(0.8);
  });
});
