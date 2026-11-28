// Assignment 2 Stage F: an HTTP smoke test of a Strategy Lab server (read-only towards research; it creates replays in the
// server's own disposable portfolio cache only). Replays N/original on the Research and All windows and prints the
// figures the brief's reference table names, the post-validation lots and a chart route of a November lot.
// The token is read from a file and never printed.
//   node --no-maglev strategy-lab-smoke.mjs <base url> <token file> [--out <json>]
import { readFileSync, writeFileSync } from 'node:fs';

const [base, tokenFile] = process.argv.slice(2);
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
const token = readFileSync(tokenFile, 'utf8').trim();
const H = { authorization: `Bearer ${token}` };
const get = async (p) => {
  const r = await fetch(base + p, { headers: H });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const post = async (p, body) => {
  const r = await fetch(base + p, { method: 'POST', headers: { ...H, 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const replay = async (window) => {
  const t0 = Date.now();
  let t = (await post('/api/portfolios/n-original/replay', window ? { window } : {})).body;
  while (t && t.state !== 'completed' && t.state !== 'failed') {
    await new Promise((r) => setTimeout(r, 1000));
    t = (await get(`/api/portfolio-replays/tickets/${t.ticket}`)).body;
  }
  if (!t || t.state !== 'completed') throw new Error(`replay ${JSON.stringify(window)}: ${JSON.stringify(t)}`);
  const d = (await get(`/api/portfolio-replays/${t.replayId}`)).body;
  return { replayId: t.replayId, seconds: (Date.now() - t0) / 1000, cacheHit: t.cacheHit, d };
};
const health = (await get('/api/health')).body;
const list = (await get('/api/portfolios')).body;
const research = await replay(null);
const all = await replay({ mode: 'all' });
const m = (x) => x.d.metrics;
const lots = (x) =>
  (x.d.positions ?? x.d.ledger?.positions ?? [])
    .filter((p) => p.inPeriod?.B)
    .map((p) => ({ id: p.id, book: p.book, lifetimeNet: Math.round((p.net ?? p.lotNet) * 100) / 100, afterValidation: p.inPeriod.B }));
const summary = {
  health,
  catalogKeys: list ? Object.keys(list) : null,
  catalog: (list?.candidates ?? list?.entries ?? []).map((c) => c.id),
  coverage: list?.coverage ?? null,
  research: { seconds: research.seconds, window: m(research).window, full: m(research).full, parity: m(research).parity?.status, lots: m(research).full?.lots },
  all: { seconds: all.seconds, window: m(all).window, full: m(all).full, postValidation: m(all).postValidation, trajectory: m(all).trajectory, parity: m(all).parity?.status },
  allLots: lots(all)
};
const eventsGdx = await get(`/api/portfolio-replays/${all.replayId}/events?symbol=GDX`);
const candlesVgt = await get(`/api/portfolio-replays/${all.replayId}/candles?symbol=VGT`);
summary.charts = { eventsGdx: eventsGdx.status, eventsGdxCount: eventsGdx.body?.events?.length ?? null, candlesVgt: candlesVgt.status };
if (out) writeFileSync(out, `${JSON.stringify(summary, null, 1)}\n`);
console.log(JSON.stringify(summary, null, 1).slice(0, 6000));
