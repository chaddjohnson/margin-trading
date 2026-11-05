// Interactive Preview latency on real data (docs/strategy-lab/INTERACTIVE_PREVIEW.md §8): for representative Growth
// requests, the COLD path (a fresh cache: submit → poll until completed → the preview's detail + the first symbol's
// events + prices, all through the HTTP API, as the browser does) and the WARM path (the same request again: a validated
// cache hit, then the same three reads), in a temporary state directory (never the live one). Run from the repository
// root:
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning apps/strategy-lab/scripts/benchmark-preview.ts [out.json]

import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { createHandler } from '../server/http.ts';
import { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { PreviewService } from '../server/previews.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';
import type { PreviewTicketStatus } from '../shared/preview.ts';

const OFF = {
  advanceFromRecentLowPercent: 10,
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
  retentionEnabled: false
};
const CASES = [
  { name: 'Growth 1.3.0 VGT 1d 2016-01-04→2023-12-29, X 10', symbols: ['VGT'], from: '2016-01-04', to: '2023-12-29', resolution: '1d', params: OFF },
  {
    name: 'Growth 1.3.0 VGT+GDX 1d 2016-01-04→2023-12-29, trend A + eligibility time_limited',
    symbols: ['VGT', 'GDX'],
    from: '2016-01-04',
    to: '2023-12-29',
    resolution: '1d',
    params: {
      ...OFF,
      advanceFromRecentLowPercent: 5,
      trendFilterEnabled: true,
      trendMethod: 'price_change',
      trendChangeLookbackSessions: 20,
      trendChangeMinimumReturnPercent: 0,
      eligibilityEnabled: true,
      eligibilityPolicy: 'time_limited',
      eligibilityMaxAgeSessions: 10
    }
  },
  { name: 'Growth 1.3.0 VGT 60m 2018-01-02→2020-12-31, X 10', symbols: ['VGT'], from: '2018-01-02', to: '2020-12-31', resolution: '60m', params: OFF }
] as const;

const cfg = loadConfig({ STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-bench-')), STRATEGY_LAB_STATIC_DIR: '', STRATEGY_LAB_SEED_DEMO: '0' });
const repo = new Repo(openDb(cfg.dbFile));
const jobs = new Jobs(repo, cfg);
const prices = new MarketPrices(cfg.repoRoot);
const service = new LabService(repo, cfg, jobs, prices);
const previews = new PreviewService(cfg, repo, service);
previews.init();
const handler = createHandler({ cfg, repo, jobs, prices, service, previews, log: () => {} });
const server = createServer((req, res) => void handler(req, res));
await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The chart's price series of each symbol is loaded once per server process (as in normal use); warm it first so the
// cold figure measures the preview, not the first chart load of a symbol.
for (const s of ['VGT', 'GDX']) await prices.series(s);

async function once(c: (typeof CASES)[number]) {
  const { name: _name, ...request } = c;
  const t0 = performance.now();
  let t = await json<PreviewTicketStatus>(
    fetch(`${base}/api/previews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { strategyKey: 'rise-from-recent-low-trading', strategyVersion: '1.3.0', ...request } })
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} (${_name})`);
      return r;
    })
  );
  const submitted = performance.now() - t0;
  while (t.state === 'queued' || t.state === 'running') {
    await sleep(100);
    t = await json<PreviewTicketStatus>(fetch(`${base}/api/previews/tickets/${t.ticket}`));
  }
  if (t.state !== 'completed') throw new Error(`${c.name}: ${t.state} ${t.error}`);
  const ready = performance.now() - t0;
  const detail = await json<{ priceSource: { basisBySymbol: Record<string, string> } }>(fetch(`${base}/api/previews/${t.previewId}`));
  const sym = c.symbols[0];
  await Promise.all([
    json(fetch(`${base}/api/previews/${t.previewId}/events?symbol=${sym}&basis=${detail.priceSource.basisBySymbol[sym]}`)),
    json(fetch(`${base}/api/previews/${t.previewId}/prices?symbol=${sym}&points=3000`))
  ]);
  return {
    previewId: t.previewId,
    cacheHit: t.cacheHit,
    identityMs: t.timing.identityMs,
    executionMs: t.timing.executionMs,
    submitMs: Math.round(submitted),
    readyMs: Math.round(ready),
    displayedMs: Math.round(performance.now() - t0)
  };
}

const results = [];
for (const c of CASES) {
  const cold = await once(c);
  const warm = [];
  for (let i = 0; i < 5; i++) warm.push(await once(c));
  const sorted = warm.map((w) => w.displayedMs).sort((a, b) => a - b);
  const median = sorted[2]!;
  results.push({
    case: c.name,
    cold,
    warm: { runs: warm.length, allCacheHits: warm.every((w) => w.cacheHit && w.previewId === cold.previewId), medianDisplayedMs: median, minMs: sorted[0], maxMs: sorted.at(-1), identityMs: warm.map((w) => w.identityMs) },
    speedup: Math.round((cold.displayedMs / median) * 10) / 10
  });
  console.log(`${c.name}: cold ${cold.displayedMs} ms (runner ${cold.executionMs} ms) → warm median ${median} ms (×${results.at(-1)!.speedup})`);
}
const out = { measuredAt: new Date().toISOString(), node: process.version, cacheDir: cfg.previewCacheDir, cache: previews.cache.status(), results };
const file = process.argv[2] ? resolve(process.env.INIT_CWD ?? process.cwd(), process.argv[2]) : null;
if (file) writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
else console.log(JSON.stringify(out, null, 2));
server.close();
previews.stop();
process.exit(0);
