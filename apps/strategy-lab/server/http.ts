// The Strategy Lab HTTP API and static file server (node:http, no framework). Every route is listed in ROUTES; there is
// deliberately NO route that starts an optimisation, a sweep or any batch of configurations — POST /api/runs accepts
// exactly one configuration. See docs/strategy-lab/API.md.

import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

import { basisDateOf, EVENT_CONTRACT_VERSION, eventsForSymbol, type LabEvent } from '../shared/contract.ts';
import { DeleteRunError, deleteRun } from './delete-run.ts';
import { RUNNABLE_STRATEGIES, MAX_TITLE_LENGTH, STRATEGY_REGISTRY } from '../shared/strategies.ts';
import { readEvents } from './artifacts.ts';
import { CompareError, compareRuns } from './compare.ts';
import { ExportError, buildResearchBundle } from './export.ts';
import type { Config } from './config.ts';
import type { Jobs } from './jobs.ts';
import { priceAtOrBefore, syntheticSeries, windowPoints, type MarketPrices, type Series } from './prices.ts';
import type { Repo } from './repo.ts';
import { clientAllowed, hostAllowed, makeClientAllowlist, tokenMatches } from './security.ts';
import { DEMO_FIXTURE } from './seed-demo.ts';
import type { LabService } from './service.ts';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[]
  ) {
    super(message);
  }
}

interface Ctx {
  req: IncomingMessage;
  url: URL;
  m: RegExpExecArray;
  body: () => Promise<unknown>;
}

type Handler = (c: Ctx) => unknown | Promise<unknown>;

const MAX_BODY = 64 * 1024;
const NOTE_MAX = 20000;

export interface Deps {
  cfg: Config;
  repo: Repo;
  jobs: Jobs;
  prices: MarketPrices;
  service: LabService;
  log: (m: string) => void;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
  '.woff2': 'font/woff2'
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};

/** A handler result that is a file download (the research bundle), not JSON. */
interface Download {
  download: Buffer;
  filename: string;
  contentType: string;
}

function sendFile(res: ServerResponse, d: Download) {
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': d.contentType,
    'Content-Length': String(d.download.length),
    'Content-Disposition': `attachment; filename="${d.filename.replace(/[^A-Za-z0-9._-]/g, '_')}"`,
    'Cache-Control': 'no-store'
  });
  res.end(d.download);
}

function send(res: ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(text);
}

const str = (v: unknown, name: string, max: number) => {
  if (typeof v !== 'string' || v.trim().length === 0 || v.length > max)
    throw new HttpError(400, `${name}: text of 1–${max} characters`);
  return v;
};

const intParam = (url: URL, name: string, def: number, min: number, max: number) => {
  const v = url.searchParams.get(name);
  if (v === null) return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name}: integer in [${min}, ${max}]`);
  return n;
};

export function createHandler(d: Deps) {
  const { cfg, repo, jobs, prices, service } = d;
  const clients = makeClientAllowlist(cfg.allowedClientCidrs);
  let synthetic: Series | null = null;
  const demoSeries = () => (synthetic ??= syntheticSeries(join(cfg.repoRoot, DEMO_FIXTURE)));

  const runOr404 = (id: string) => {
    const r = repo.runDetail(id);
    if (!r) throw new HttpError(404, `no run ${id}`);
    return r;
  };

  const loadRunEvents = (id: string): { events: LabEvent[]; run: NonNullable<ReturnType<Repo['runDetail']>> } => {
    const run = runOr404(id);
    if (run.status !== 'completed' || !run.artifactDir) return { events: [], run };
    return { events: readEvents(join(cfg.stateDir, run.artifactDir), run.artifact.sha256).events, run };
  };

  const seriesFor = async (run: NonNullable<ReturnType<Repo['runDetail']>>, symbol: string) => {
    if (!run.symbols.includes(symbol)) throw new HttpError(400, `${symbol} is not a symbol of ${run.id}`);
    if (run.priceSource.kind === 'synthetic') return { series: demoSeries(), factor: () => 1, basis: null };
    const basis = basisDateOf(run.priceSource, symbol) ?? run.window.from;
    const series = await prices.series(symbol);
    return { series, factor: prices.factorFor(symbol, basis, series), basis };
  };

  const ROUTES: [string, RegExp, Handler][] = [
    [
      'GET',
      /^\/api\/health$/,
      () => ({ ok: true, contractVersion: EVENT_CONTRACT_VERSION, activeRuns: jobs.activeCount })
    ],
    [
      'GET',
      /^\/api\/meta$/,
      () => ({
        contractVersion: EVENT_CONTRACT_VERSION,
        strategies: RUNNABLE_STRATEGIES,
        phenotypeStrategies: STRATEGY_REGISTRY.filter((s) => s.launch !== 'none'),
        // every registered version (legacy and read-only ones too), for showing historical runs' schemas and names
        registry: STRATEGY_REGISTRY.map((s) => ({
          key: s.key,
          version: s.version,
          title: s.title,
          kind: s.kind,
          launch: s.launch,
          formerTitles: s.formerTitles ?? [],
          legacy: s.legacy ?? null
        })),
        symbols: prices.symbols(),
        experiments: repo.listExperiments(),
        partitions: JSON.parse(readFileSync(join(cfg.repoRoot, 'data', 'partitions.json'), 'utf8')).partitions,
        maxConcurrentRuns: cfg.maxConcurrentRuns
      })
    ],
    [
      'GET',
      /^\/api\/runs$/,
      ({ url }) =>
        repo.listRuns({
          experiment: url.searchParams.get('experiment') || undefined,
          variation: url.searchParams.get('variation') || undefined,
          q: url.searchParams.get('q')?.slice(0, 80) || undefined,
          bookmarked: url.searchParams.get('bookmarked') === '1',
          limit: intParam(url, 'limit', 100, 1, 500),
          offset: intParam(url, 'offset', 0, 0, 1_000_000)
        })
    ],
    [
      'POST',
      /^\/api\/runs$/,
      async ({ body }) => {
        const r = service.createManualRun(await body());
        if ('errors' in r) throw new HttpError(400, 'Invalid run request', r.errors);
        return { status: 201, body: repo.runDetail(r.runId) };
      }
    ],
    ['GET', /^\/api\/runs\/(R-\d{6,12})$/, ({ m }) => ({ ...runOr404(m[1]!), request: repo.runRequest(m[1]!) })],
    [
      'PATCH',
      /^\/api\/runs\/(R-\d{6,12})$/,
      async ({ m, body }) => {
        const b = (await body()) as Record<string, unknown>;
        const keys = Object.keys(b ?? {});
        if (keys.length !== 1 || keys[0] !== 'title') throw new HttpError(400, 'only the title can change');
        runOr404(m[1]!);
        repo.setRunTitle(m[1]!, str(b.title, 'title', MAX_TITLE_LENGTH).trim());
        return runOr404(m[1]!);
      }
    ],
    [
      // Deletes exactly this run (server/delete-run.ts). The body must repeat the id: { "confirm": "R-…" }.
      'DELETE',
      /^\/api\/runs\/(R-\d{6,12})$/,
      async ({ m, body }) => {
        const b = (await body()) as Record<string, unknown> | undefined;
        if (!b || typeof b !== 'object' || Object.keys(b).join() !== 'confirm' || b.confirm !== m[1])
          throw new HttpError(400, `confirm the deletion with the body {"confirm": "${m[1]}"}`);
        try {
          return deleteRun(cfg, repo, m[1]!);
        } catch (e) {
          if (e instanceof DeleteRunError) throw new HttpError(e.status, e.message, e.details);
          throw e;
        }
      }
    ],
    [
      'PUT',
      /^\/api\/runs\/(R-\d{6,12})\/bookmark$/,
      ({ m }) => (runOr404(m[1]!), repo.setBookmark('run', m[1]!, true), { bookmarked: true })
    ],
    [
      'DELETE',
      /^\/api\/runs\/(R-\d{6,12})\/bookmark$/,
      ({ m }) => (runOr404(m[1]!), repo.setBookmark('run', m[1]!, false), { bookmarked: false })
    ],
    [
      'POST',
      /^\/api\/runs\/(R-\d{6,12})\/cancel$/,
      ({ m }) => {
        const id = repo.runIdOf(m[1]!);
        if (id === null) throw new HttpError(404, `no run ${m[1]}`);
        if (!jobs.cancel(id)) throw new HttpError(409, 'the run is not queued or running');
        return { cancelled: true };
      }
    ],
    [
      'GET',
      /^\/api\/runs\/(R-\d{6,12})\/events$/,
      async ({ m, url }) => {
        const { events, run } = loadRunEvents(m[1]!);
        const symbol = url.searchParams.get('symbol');
        const selected = symbol ? eventsForSymbol(events, symbol) : events;
        // Markers of events without a recorded price are placed on the price line at that instant; the event's own
        // price stays null (unknown) and the UI says so.
        const markerPrices: Record<string, number | null> = {};
        const unknown = selected.filter((e) => e.price === null);
        if (unknown.length && symbol) {
          const { series, factor } = await seriesFor(run, symbol);
          for (const e of unknown) markerPrices[e.id] = priceAtOrBefore(series, factor, Date.parse(e.t));
        }
        // `display`: the plotting price in the share units of `basis` (another run's chart, when comparing); the
        // events' own prices are returned unchanged.
        const basis = url.searchParams.get('basis');
        if (basis !== null && !/^\d{4}-\d{2}-\d{2}$/.test(basis)) throw new HttpError(400, 'basis: YYYY-MM-DD');
        const runBasis = symbol ? basisDateOf(run.priceSource, symbol) : null;
        const conv = basis && runBasis && symbol ? prices.conversion(symbol, runBasis, basis) : 1;
        const display: Record<string, number | null> = {};
        for (const e of selected) {
          const p = e.price ?? markerPrices[e.id] ?? null;
          display[e.id] = p === null ? null : p * conv;
        }
        return {
          runId: run.id,
          symbol,
          events: selected,
          markerPrices,
          display,
          conversion: conv,
          total: events.length
        };
      }
    ],
    [
      'GET',
      /^\/api\/runs\/(R-\d{6,12})\/prices$/,
      async ({ m, url }) => {
        const run = runOr404(m[1]!);
        const symbol = url.searchParams.get('symbol') ?? '';
        const { series, factor, basis } = await seriesFor(run, symbol);
        const num = (k: string) => {
          const v = url.searchParams.get(k);
          if (v === null) return null;
          const n = Number(v);
          if (!Number.isFinite(n)) throw new HttpError(400, `${k}: a number (ms)`);
          return n;
        };
        const pts = windowPoints(
          series,
          factor,
          run.window.from,
          run.window.to,
          num('from'),
          num('to'),
          intParam(url, 'points', 3000, 100, 8000)
        );
        return {
          runId: run.id,
          symbol,
          dataOrigin: run.dataOrigin,
          basisDate: basis,
          units:
            run.priceSource.kind === 'synthetic'
              ? 'synthetic price units'
              : `USD per share, split-adjusted to ${basis} share units`,
          ...pts
        };
      }
    ],
    [
      'GET',
      /^\/api\/runs\/(R-\d{6,12})\/log$/,
      ({ m }) => {
        const run = runOr404(m[1]!);
        const file = run.artifactDir
          ? join(cfg.stateDir, run.artifactDir, 'run.log')
          : join(cfg.stateDir, 'runs', run.id, 'run.log');
        if (!existsSync(file)) return { log: '' };
        const text = readFileSync(file, 'utf8');
        return { log: text.slice(-65536) };
      }
    ],
    [
      'GET',
      /^\/api\/variations$/,
      ({ url }) =>
        repo.listVariations({
          experiment: url.searchParams.get('experiment') || undefined,
          q: url.searchParams.get('q')?.slice(0, 80) || undefined,
          bookmarked: url.searchParams.get('bookmarked') === '1',
          limit: intParam(url, 'limit', 100, 1, 500),
          offset: intParam(url, 'offset', 0, 0, 1_000_000)
        })
    ],
    [
      'PATCH',
      /^\/api\/variations\/(V-\d{6,12})$/,
      async ({ m, body }) => {
        const b = (await body()) as Record<string, unknown>;
        if (Object.keys(b ?? {}).join() !== 'title') throw new HttpError(400, 'only the title can change');
        if (!repo.setVariationTitle(m[1]!, str(b.title, 'title', MAX_TITLE_LENGTH).trim()))
          throw new HttpError(404, `no variation ${m[1]}`);
        return { ok: true };
      }
    ],
    [
      'PUT',
      /^\/api\/variations\/(V-\d{6,12})\/bookmark$/,
      ({ m }) => {
        if (!repo.setBookmark('variation', m[1]!, true)) throw new HttpError(404, `no variation ${m[1]}`);
        return { bookmarked: true };
      }
    ],
    [
      'DELETE',
      /^\/api\/variations\/(V-\d{6,12})\/bookmark$/,
      ({ m }) => {
        if (!repo.setBookmark('variation', m[1]!, false)) throw new HttpError(404, `no variation ${m[1]}`);
        return { bookmarked: false };
      }
    ],
    [
      'GET',
      /^\/api\/notes$/,
      ({ url }) => {
        const type = url.searchParams.get('targetType');
        const id = url.searchParams.get('targetId') ?? '';
        if (type !== 'run' && type !== 'variation') throw new HttpError(400, 'targetType: run or variation');
        const notes = repo.listNotes(type, id);
        if (!notes) throw new HttpError(404, `no ${type} ${id}`);
        return notes;
      }
    ],
    [
      'POST',
      /^\/api\/notes$/,
      async ({ body }) => {
        const b = (await body()) as Record<string, unknown>;
        if (b?.targetType !== 'run' && b?.targetType !== 'variation')
          throw new HttpError(400, 'targetType: run or variation');
        const note = repo.addNote(b.targetType, String(b.targetId ?? ''), str(b.body, 'body', NOTE_MAX));
        if (!note) throw new HttpError(404, `no ${b.targetType} ${String(b.targetId)}`);
        return { status: 201, body: note };
      }
    ],
    [
      'PATCH',
      /^\/api\/notes\/(\d{1,12})$/,
      async ({ m, body }) => {
        const b = (await body()) as Record<string, unknown>;
        if (!repo.updateNote(Number(m[1]), str(b?.body, 'body', NOTE_MAX))) throw new HttpError(404, `no note ${m[1]}`);
        return { ok: true };
      }
    ],
    [
      'DELETE',
      /^\/api\/notes\/(\d{1,12})$/,
      ({ m }) => {
        if (!repo.deleteNote(Number(m[1]))) throw new HttpError(404, `no note ${m[1]}`);
        return { ok: true };
      }
    ],
    ['GET', /^\/api\/optimization-batches$/, () => repo.listOptimizationBatches()],
    [
      'GET',
      /^\/api\/runs\/(R-\d{6,12})\/export$/,
      ({ m, url }) => {
        try {
          const b = buildResearchBundle(cfg, repo, m[1]!, { minuteMarks: url.searchParams.get('minute') === '1' });
          return { download: b.zip, filename: b.filename, contentType: 'application/zip' } satisfies Download;
        } catch (e) {
          if (e instanceof ExportError) throw new HttpError(e.status, e.message);
          throw e;
        }
      }
    ],
    [
      'GET',
      /^\/api\/compare$/,
      ({ url }) => {
        const a = url.searchParams.get('a') ?? '';
        const b = url.searchParams.get('b') ?? '';
        if (!/^R-\d{6,12}$/.test(a) || !/^R-\d{6,12}$/.test(b)) throw new HttpError(400, 'a and b: run ids');
        if (a === b) throw new HttpError(400, 'compare two different runs');
        try {
          return compareRuns(cfg, repo, a, b);
        } catch (e) {
          if (e instanceof CompareError) throw new HttpError(e.status, e.message);
          throw e;
        }
      }
    ],
    [
      'GET',
      /^\/api\/phenotypes$/,
      ({ url }) =>
        repo
          .listPhenotypes({
            q: url.searchParams.get('q')?.slice(0, 80) || undefined,
            study: url.searchParams.get('study') || undefined,
            strategy: url.searchParams.get('strategy') || undefined,
            symbol: url.searchParams.get('symbol') || undefined,
            role: url.searchParams.get('role') || undefined
          })
          .map((p) => ({ ...p, capability: service.capabilityOf({ ...p, internalId: 0 }) }))
    ],
    [
      'GET',
      /^\/api\/phenotypes\/(PH-\d{4,12})$/,
      ({ m }) => {
        const p = repo.phenotypeDetail(m[1]!);
        if (!p) throw new HttpError(404, `no phenotype ${m[1]}`);
        const pub = Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'internalId'));
        return { ...pub, capability: service.capabilityOf(p), runs: repo.listRuns({ phenotype: m[1]!, limit: 100 }) };
      }
    ],
    [
      // ONE run of ONE frozen phenotype per request (never a search, sweep or batch)
      'POST',
      /^\/api\/phenotypes\/(PH-\d{4,12})\/runs$/,
      async ({ m, body }) => {
        const r = service.createPhenotypeRun(m[1]!, await body());
        if (r === null) throw new HttpError(404, `no phenotype ${m[1]}`);
        if ('errors' in r) throw new HttpError(400, 'Invalid phenotype run', r.errors);
        return { status: 201, body: repo.runDetail(r.runId) };
      }
    ]
  ];

  const readBody = (req: IncomingMessage) => async (): Promise<unknown> => {
    if (!(req.headers['content-type'] ?? '').startsWith('application/json'))
      throw new HttpError(415, 'JSON body expected');
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
      size += (c as Buffer).length;
      if (size > MAX_BODY) throw new HttpError(413, 'request body too large');
      chunks.push(c as Buffer);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    } catch {
      throw new HttpError(400, 'malformed JSON');
    }
  };

  const serveStatic = (res: ServerResponse, pathname: string) => {
    if (!cfg.staticDir)
      return send(res, 404, { error: 'The UI build is missing: run npm --prefix apps/strategy-lab run build' });
    const root = resolve(cfg.staticDir);
    let file = resolve(join(root, normalize(decodeURIComponent(pathname))));
    if (!file.startsWith(root + sep) && file !== root) return send(res, 400, { error: 'bad path' });
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    const type = MIME[extname(file)] ?? 'application/octet-stream';
    const immutable = file.includes(`${sep}assets${sep}`);
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': type,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache'
    });
    createReadStream(file).pipe(res);
  };

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (!clientAllowed(clients, req.socket.remoteAddress))
        return send(res, 403, { error: 'client address not allowed' });
      if (!hostAllowed(cfg.allowedHostHeaders, req.headers.host))
        return send(res, 421, { error: 'unexpected Host header' });
      const url = new URL(req.url ?? '/', 'http://strategy-lab.invalid');
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
        return serveStatic(res, url.pathname);
      }
      if (url.pathname !== '/api/health' && !tokenMatches(cfg.token, req.headers.authorization))
        return send(res, 401, { error: 'access token required', tokenRequired: true });
      for (const [method, re, handler] of ROUTES) {
        const m = re.exec(url.pathname);
        if (!m) continue;
        if (req.method !== method) continue;
        const out = await handler({ req, url, m, body: readBody(req) });
        if (out && typeof out === 'object' && 'download' in out) return sendFile(res, out as Download);
        if (
          out &&
          typeof out === 'object' &&
          'status' in out &&
          'body' in out &&
          typeof (out as { status: unknown }).status === 'number'
        )
          return send(res, (out as { status: number }).status, (out as { body: unknown }).body);
        return send(res, 200, out);
      }
      const known = ROUTES.some(([, re]) => re.test(url.pathname));
      return send(res, known ? 405 : 404, { error: known ? 'method not allowed' : 'not found' });
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { error: e.message, details: e.details });
      d.log(`error ${req.method} ${req.url}: ${(e as Error).stack ?? String(e)}`);
      return send(res, 500, { error: 'internal error', message: (e as Error).message.slice(0, 300) });
    }
  };
  /** The route table (method and path pattern) — inspected by tests to prove no optimisation route exists. */
  return Object.assign(handler, { routes: ROUTES.map(([method, re]) => `${method} ${re.source}`) });
}
