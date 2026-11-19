// Pooled portfolio candidates (Priority 6, docs/strategy-lab/POOLED_CANDIDATES.md): the read-only catalog of frozen
// candidates and their replays. A replay is ONE execution of runner/portfolio-run.ts (the research engine, unchanged,
// through runner/portfolio-bridge.ts) on the archived benchmark; it creates NO run, variation or database row. Verified
// results are kept in a disposable, namespaced cache of their own:
//
//   <stateDir>/portfolio-cache/
//     PORTFOLIO_CACHE.md   marker (a directory without it is never used, pruned or cleared)
//     entries/<key>/       request.json events.json positions.json equity.json metrics.json provenance.json run.log
//                          entry.json (identity + every file's sha256 and size) last-used.json
//     work/<execution>/    replays in progress (removed at the next start if interrupted)
//     trash/               evicted entries on their way out
//
// The key is sha256 of the replay IDENTITY: the catalog entry's own sha256 (its full vectors, enabled components,
// conventions and targets), the lifecycle, the benchmark window, the content hashes of the VGT and GDX data files and
// the runtime inputs, the read-only guard file of the FULL door, and the implementation fingerprint of the runner's
// whole static import closure (server/preview-identity.ts), Node version and flags. Every request recomputes it; a hit
// requires the stored identity to be equal and every file to match its sha256 and size. A changed engine, catalog or
// data file therefore never serves an older replay under the new identity. Replays run one at a time; identical
// requests are coalesced; a queued replay nobody waits for is dropped (a running one finishes and is cached).

import { type ChildProcess, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { EVENT_CONTRACT_VERSION, type LabEvent } from '../shared/contract.ts';
import {
  type CandidateCatalog,
  type CandidateEntry,
  PORTFOLIO_BENCHMARK,
  PORTFOLIO_REPLAY_FORMAT,
  type PortfolioEquity,
  type PortfolioMetrics,
  type PortfolioPosition,
  type PortfolioReplayDetail
} from '../shared/portfolio.ts';
import { canonicalJson } from '../shared/preview.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { readCatalog } from '../runner/portfolio-catalog-read.ts';
import { atomicWrite, readEvents, sha256 } from './artifacts.ts';
import type { Config } from './config.ts';
import { NODE_FLAGS, runnerEnv } from './jobs.ts';
import { type DataFingerprint, type ImplementationFingerprint, dataFingerprint, implementationFingerprint } from './preview-identity.ts';

export const PORTFOLIO_RUNNER = 'apps/strategy-lab/runner/portfolio-run.ts';
/** The FULL door's read-only guard file (its sha256 is pinned in the engine code; recorded here for completeness). */
export const PORTFOLIO_GUARD_FILE = 'research/vg-d1-growth-joint/FROZEN_SELECTION.json';
const ENTRY_SCHEMA = 'strategy-lab.portfolio-cache-entry';
const IDENTITY_SCHEMA = 'strategy-lab.portfolio-replay-identity';
const MARKER = 'PORTFOLIO_CACHE.md';
const MARKER_TEXT = `# Strategy Lab — pooled-candidate replay cache

Disposable, rebuildable cache of pooled-candidate replays (docs/strategy-lab/POOLED_CANDIDATES.md). Nothing here is a
saved run: deleting this directory loses no research record; a replay is recomputed on demand.
`;
const FILES = ['request.json', 'events.json', 'positions.json', 'equity.json', 'metrics.json', 'provenance.json'];
const KEY = /^[0-9a-f]{64}$/;
const TICKET_IDLE_MS = 60_000;
const TIMEOUT_MS = 15 * 60_000;

export class PortfolioError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export interface ReplayIdentity {
  schema: typeof IDENTITY_SCHEMA;
  format: number;
  eventContract: number;
  candidate: { id: string; entrySha256: string };
  lifecycle: 'L0';
  window: { from: string; to: string; boundary: string };
  data: DataFingerprint;
  guard: { file: string; sha256: string | null };
  implementation: ImplementationFingerprint;
}

interface EntryMeta {
  schema: typeof ENTRY_SCHEMA;
  format: number;
  key: string;
  replayId: string;
  identity: ReplayIdentity;
  files: Record<string, { sha256: string; bytes: number }>;
  executedAt: string;
  executionMs: number;
}

type State = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

interface Execution {
  key: string;
  replayId: string;
  identity: ReplayIdentity;
  entry: CandidateEntry;
  state: State;
  progress: { message: string; fraction: number | null } | null;
  error: string | null;
  tickets: Set<string>;
  child: ChildProcess | null;
  work: string | null;
  startedAt: number;
}

interface Ticket {
  id: string;
  key: string;
  candidateId: string;
  replayId: string;
  cacheHit: boolean;
  coalesced: boolean;
  lastPolled: number;
  outcome: { state: State; error: string | null } | null;
}

export interface TicketView {
  ticket: string;
  candidateId: string;
  replayId: string;
  state: State;
  cacheHit: boolean;
  coalesced: boolean;
  progress: { message: string; fraction: number | null } | null;
  error: string | null;
}

const fileSha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const dirSize = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? dirSize(join(dir, e.name)) : e.isFile() ? statSync(join(dir, e.name)).size : 0),
    0
  );

export class PortfolioService {
  readonly entriesDir: string;
  readonly workDir: string;
  private trashDir: string;
  private index = new Map<string, { bytes: number; lastUsedAt: string }>();
  private executions = new Map<string, Execution>();
  private tickets = new Map<string, Ticket>();
  private queue: Execution[] = [];
  private running: Execution | null = null;
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    private cfg: Pick<Config, 'repoRoot' | 'portfolioCacheDir' | 'portfolioCacheMaxEntries' | 'portfolioCacheMaxBytes'>,
    private log: (m: string) => void = () => {}
  ) {
    this.entriesDir = join(cfg.portfolioCacheDir, 'entries');
    this.workDir = join(cfg.portfolioCacheDir, 'work');
    this.trashDir = join(cfg.portfolioCacheDir, 'trash');
  }

  init() {
    const dir = this.cfg.portfolioCacheDir;
    if (existsSync(dir) && readdirSync(dir).length > 0 && !existsSync(join(dir, MARKER)))
      throw new Error(`${dir} is not empty and is not a portfolio replay cache (no ${MARKER}); refusing to use it`);
    for (const d of [dir, this.entriesDir, this.workDir, this.trashDir]) mkdirSync(d, { recursive: true });
    if (!existsSync(join(dir, MARKER))) writeFileSync(join(dir, MARKER), MARKER_TEXT);
    for (const d of [this.workDir, this.trashDir]) for (const n of readdirSync(d)) rmSync(join(d, n), { recursive: true, force: true });
    this.index.clear();
    for (const name of readdirSync(this.entriesDir)) {
      const d = join(this.entriesDir, name);
      if (!KEY.test(name) || !existsSync(join(d, 'entry.json'))) {
        rmSync(d, { recursive: true, force: true });
        continue;
      }
      this.index.set(name, { bytes: dirSize(d), lastUsedAt: this.lastUsedOf(d) });
    }
    this.sweeper = setInterval(() => this.sweep(), 10_000);
    this.sweeper.unref();
  }

  stop() {
    if (this.sweeper) clearInterval(this.sweeper);
    for (const e of [this.running, ...this.queue]) if (e?.child) e.child.kill('SIGTERM');
  }

  // ----- the catalog -----

  catalog(): CandidateCatalog {
    try {
      return readCatalog(this.cfg.repoRoot);
    } catch (e) {
      throw new PortfolioError(500, `the candidate catalog is unreadable: ${(e as Error).message}`);
    }
  }

  candidate(id: string): CandidateEntry {
    const e = this.catalog().candidates.find((c) => c.id === id);
    if (!e) throw new PortfolioError(404, `no portfolio candidate ${id}`);
    return e;
  }

  /** The catalog for the selector: every entry with its full settings, and the cached replay id when one is valid. */
  list() {
    const c = this.catalog();
    const shared = this.sharedParts();
    return {
      schema: c.schema,
      version: c.version,
      note: c.note,
      benchmark: c.benchmark,
      candidates: c.candidates.map((e) => ({ ...e, cached: this.index.has(this.keyOf(e, shared)) }))
    };
  }

  // ----- identity -----

  /** The parts of the identity shared by every candidate (data, guard, implementation): computed once per request. */
  private sharedParts(): Pick<ReplayIdentity, 'data' | 'guard' | 'implementation'> {
    const guard = join(this.cfg.repoRoot, PORTFOLIO_GUARD_FILE);
    try {
      return {
        data: dataFingerprint(this.cfg.repoRoot, ['GDX', 'VGT']),
        guard: { file: PORTFOLIO_GUARD_FILE, sha256: existsSync(guard) ? fileSha(guard) : null },
        implementation: implementationFingerprint(this.cfg.repoRoot, PORTFOLIO_RUNNER)
      };
    } catch (e) {
      throw new PortfolioError(409, `the replay identity cannot be established: ${(e as Error).message}`);
    }
  }

  identityOf(entry: CandidateEntry, shared = this.sharedParts()): ReplayIdentity {
    return {
      schema: IDENTITY_SCHEMA,
      format: PORTFOLIO_REPLAY_FORMAT,
      eventContract: EVENT_CONTRACT_VERSION,
      candidate: { id: entry.id, entrySha256: entry.entrySha256 },
      lifecycle: entry.lifecycle,
      window: { from: PORTFOLIO_BENCHMARK.from, to: PORTFOLIO_BENCHMARK.to, boundary: PORTFOLIO_BENCHMARK.boundary },
      ...shared
    };
  }

  private keyOf(entry: CandidateEntry, shared = this.sharedParts()) {
    return sha256(canonicalJson(this.identityOf(entry, shared)));
  }

  // ----- submit / tickets -----

  /** ONE replay of ONE catalog candidate: a validated cache hit, a join of the same running replay, or a new one. */
  submit(candidateId: string): TicketView {
    const entry = this.candidate(candidateId);
    const identity = this.identityOf(entry);
    const key = sha256(canonicalJson(identity));
    const replayId = `PR-${key}`;
    const ticket: Ticket = {
      id: `PQ-${randomBytes(12).toString('hex')}`,
      key,
      candidateId,
      replayId,
      cacheHit: false,
      coalesced: false,
      lastPolled: Date.now(),
      outcome: null
    };
    this.tickets.set(ticket.id, ticket);
    if (this.lookup(key, identity)) {
      ticket.cacheHit = true;
      ticket.outcome = { state: 'completed', error: null };
      return this.view(ticket);
    }
    const running = this.executions.get(key);
    if (running && (running.state === 'queued' || running.state === 'running')) {
      ticket.coalesced = true;
      running.tickets.add(ticket.id);
      return this.view(ticket);
    }
    const e: Execution = { key, replayId, identity, entry, state: 'queued', progress: null, error: null, tickets: new Set([ticket.id]), child: null, work: null, startedAt: 0 };
    this.executions.set(key, e);
    this.queue.push(e);
    this.pump();
    return this.view(ticket);
  }

  status(ticketId: string): TicketView {
    const t = this.tickets.get(ticketId);
    if (!t) throw new PortfolioError(404, 'unknown replay ticket (the server may have restarted): select the candidate again');
    t.lastPolled = Date.now();
    return this.view(t);
  }

  /** Release a ticket (a newer selection, a closed tab): a queued replay nobody waits for is dropped. */
  release(ticketId: string): TicketView {
    const t = this.tickets.get(ticketId);
    if (!t) throw new PortfolioError(404, 'unknown replay ticket');
    const view = this.view(t);
    this.drop(t);
    return { ...view, state: view.state === 'queued' ? 'cancelled' : view.state };
  }

  private drop(t: Ticket) {
    this.tickets.delete(t.id);
    const e = this.executions.get(t.key);
    if (!e) return;
    e.tickets.delete(t.id);
    if (e.tickets.size === 0 && e.state === 'queued') {
      this.queue = this.queue.filter((x) => x !== e);
      e.state = 'cancelled';
      this.executions.delete(e.key);
      this.log(`portfolio replay ${e.entry.id}: dropped (nobody waits for it)`);
    }
  }

  private view(t: Ticket): TicketView {
    const e = this.executions.get(t.key);
    const state = t.outcome?.state ?? e?.state ?? 'failed';
    return {
      ticket: t.id,
      candidateId: t.candidateId,
      replayId: t.replayId,
      state,
      cacheHit: t.cacheHit,
      coalesced: t.coalesced,
      progress: state === 'running' || state === 'queued' ? (e?.progress ?? null) : null,
      error: t.outcome?.error ?? e?.error ?? (state === 'failed' ? 'the replay is no longer known' : null)
    };
  }

  private sweep() {
    const now = Date.now();
    for (const t of [...this.tickets.values()]) if (now - t.lastPolled > TICKET_IDLE_MS) this.drop(t);
  }

  // ----- execution -----

  private pump() {
    if (this.running) return;
    const e = this.queue.shift();
    if (!e) return;
    try {
      this.start(e);
    } catch (err) {
      this.finish(e, 'failed', `could not start: ${(err as Error).message}`);
      this.pump();
    }
  }

  private start(e: Execution) {
    const work = join(this.workDir, `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`);
    mkdirSync(work, { recursive: true });
    e.work = work;
    atomicWrite(
      join(work, 'request.json'),
      `${JSON.stringify({ kind: 'pooled-candidate-replay', format: PORTFOLIO_REPLAY_FORMAT, replayId: e.replayId, candidateId: e.entry.id, entrySha256: e.entry.entrySha256 }, null, 2)}\n`
    );
    e.state = 'running';
    e.startedAt = Date.now();
    this.running = e;
    const logStream = createWriteStream(join(work, 'run.log'), { flags: 'a' });
    const child = spawn(process.execPath, [...NODE_FLAGS, join(this.cfg.repoRoot, PORTFOLIO_RUNNER), work], {
      cwd: this.cfg.repoRoot,
      env: runnerEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    e.child = child;
    this.log(`portfolio replay ${e.entry.id} (${e.key.slice(0, 12)}…): started (pid ${child.pid})`);
    const timer = setTimeout(() => {
      e.error = `timed out after ${TIMEOUT_MS / 1000} s`;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    }, TIMEOUT_MS);
    let lastError = '';
    let buffer = '';
    child.stdout!.on('data', (chunk: Buffer) => {
      logStream.write(chunk);
      buffer += chunk.toString('utf8');
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        try {
          const msg = JSON.parse(line) as { type: string; message?: string; fraction?: number | null };
          if (msg.type === 'progress') e.progress = { message: String(msg.message ?? ''), fraction: msg.fraction ?? null };
          if (msg.type === 'error') lastError = String(msg.message ?? '');
        } catch {
          /* not a protocol line */
        }
      }
    });
    let stderrTail = '';
    child.stderr!.on('data', (chunk: Buffer) => {
      logStream.write(chunk);
      stderrTail = (stderrTail + chunk.toString('utf8')).slice(-2000);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      logStream.end(() => {
        try {
          if (e.error) this.finish(e, 'failed', e.error);
          else if (code !== 0)
            this.finish(e, 'failed', lastError || `the runner exited with ${code ?? signal}. ${stderrTail.trim().split('\n').slice(-3).join(' ')}`);
          else {
            this.commit(e);
            this.finish(e, 'completed', null);
          }
        } catch (err) {
          this.finish(e, 'failed', `not cached — the replay did not verify: ${(err as Error).message}`);
        }
        this.log(`portfolio replay ${e.entry.id}: ${e.state}${e.error ? ` (${e.error})` : ''} in ${Date.now() - e.startedAt} ms`);
        this.running = null;
        this.pump();
      });
    });
  }

  private finish(e: Execution, state: State, error: string | null) {
    e.state = state;
    e.error = error;
    e.child = null;
    if (e.work && existsSync(e.work)) rmSync(e.work, { recursive: true, force: true });
    for (const id of e.tickets) {
      const t = this.tickets.get(id);
      if (t) t.outcome = { state, error };
    }
    this.executions.delete(e.key);
  }

  /** Verify the runner's output and move it into the cache under its key. */
  private commit(e: Execution) {
    const work = e.work!;
    for (const f of FILES) if (!existsSync(join(work, f))) throw new Error(`the runner wrote no ${f}`);
    const metrics = JSON.parse(readFileSync(join(work, 'metrics.json'), 'utf8')) as PortfolioMetrics;
    const events = readEvents(work, null).events;
    const problems = validateEvents(events, e.replayId, e.entry.symbols);
    if (problems.length) throw new Error(`invalid events: ${problems.slice(0, 3).join('; ')}`);
    const positions = (JSON.parse(readFileSync(join(work, 'positions.json'), 'utf8')) as { positions: PortfolioPosition[] }).positions;
    if (metrics.kind !== 'pooled candidate replay' || metrics.full.positions !== positions.length)
      throw new Error('the metrics and the ledger disagree');
    const fills = positions.reduce((a, p) => a + p.fills.length, 0);
    const executed = events.filter((x) => x.kind === 'executed_entry' || x.kind === 'executed_exit').length;
    if (fills !== executed) throw new Error(`${fills} ledger fills ≠ ${executed} executed events`);
    const net = positions.reduce((a, p) => a + p.net, 0);
    if (Math.abs(net - metrics.full.net) > 0.01 * (positions.length + 1)) throw new Error('Σ position net ≠ the portfolio net');
    const fresh = this.identityOf(e.entry);
    if (sha256(canonicalJson(fresh)) !== e.key) throw new Error('the code, catalog or data changed while the replay ran');
    const files = Object.fromEntries(
      FILES.concat('run.log').map((f) => [f, { sha256: fileSha(join(work, f)), bytes: statSync(join(work, f)).size }])
    );
    const meta: EntryMeta = {
      schema: ENTRY_SCHEMA,
      format: PORTFOLIO_REPLAY_FORMAT,
      key: e.key,
      replayId: e.replayId,
      identity: e.identity,
      files,
      executedAt: new Date().toISOString(),
      executionMs: Date.now() - e.startedAt
    };
    atomicWrite(join(work, 'entry.json'), `${JSON.stringify(meta, null, 2)}\n`);
    const dest = join(this.entriesDir, e.key);
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    renameSync(work, dest);
    e.work = null;
    this.index.set(e.key, { bytes: dirSize(dest), lastUsedAt: meta.executedAt });
    this.touch(e.key);
    this.prune(e.key);
  }

  // ----- the cache -----

  private lastUsedOf(dir: string): string {
    try {
      const v = (JSON.parse(readFileSync(join(dir, 'last-used.json'), 'utf8')) as { lastUsedAt?: string }).lastUsedAt;
      if (v && !Number.isNaN(Date.parse(v))) return v;
    } catch {
      /* absent */
    }
    return new Date(0).toISOString();
  }

  private touch(key: string) {
    const lastUsedAt = new Date().toISOString();
    const i = this.index.get(key);
    if (i) i.lastUsedAt = lastUsedAt;
    try {
      atomicWrite(join(this.entriesDir, key, 'last-used.json'), `${JSON.stringify({ lastUsedAt })}\n`);
    } catch {
      /* recency is advisory */
    }
  }

  private problemOf(key: string, fresh: ReplayIdentity | null): string | null {
    const dir = join(this.entriesDir, key);
    let meta: EntryMeta;
    try {
      meta = JSON.parse(readFileSync(join(dir, 'entry.json'), 'utf8')) as EntryMeta;
    } catch {
      return 'unreadable entry.json';
    }
    if (meta.schema !== ENTRY_SCHEMA || meta.format !== PORTFOLIO_REPLAY_FORMAT || meta.key !== key) return 'older or foreign format';
    if (sha256(canonicalJson(meta.identity)) !== key) return 'the identity does not hash to the key';
    if (fresh && canonicalJson(fresh) !== canonicalJson(meta.identity)) return 'another identity';
    for (const f of FILES.concat('run.log')) {
      const rec = meta.files[f];
      const p = join(dir, f);
      if (!rec || !existsSync(p) || statSync(p).size !== rec.bytes || fileSha(p) !== rec.sha256) return `${f} is missing or altered`;
    }
    return null;
  }

  private evict(key: string, why: string) {
    const dir = join(this.entriesDir, key);
    this.index.delete(key);
    if (!existsSync(dir)) return;
    const to = join(this.trashDir, `${key}-${Date.now().toString(36)}`);
    try {
      renameSync(dir, to);
      rmSync(to, { recursive: true, force: true });
    } catch {
      rmSync(dir, { recursive: true, force: true });
    }
    this.log(`portfolio cache: evicted ${key.slice(0, 12)}… (${why})`);
  }

  private lookup(key: string, fresh: ReplayIdentity): boolean {
    if (!existsSync(join(this.entriesDir, key))) {
      this.index.delete(key);
      return false;
    }
    const problem = this.problemOf(key, fresh);
    if (problem) {
      this.evict(key, problem);
      return false;
    }
    this.touch(key);
    return true;
  }

  private prune(protect: string) {
    const max = this.cfg.portfolioCacheMaxEntries;
    const maxBytes = this.cfg.portfolioCacheMaxBytes;
    const order = [...this.index.entries()].filter(([k]) => k !== protect).sort(([ka, a], [kb, b]) => (a.lastUsedAt < b.lastUsedAt ? -1 : a.lastUsedAt > b.lastUsedAt ? 1 : ka < kb ? -1 : 1));
    let total = [...this.index.values()].reduce((n, x) => n + x.bytes, 0);
    while (order.length && (this.index.size > max || total > maxBytes)) {
      const [k, x] = order.shift()!;
      this.evict(k, 'least recently used');
      total -= x.bytes;
    }
  }

  // ----- reading a cached replay -----

  private entryDir(replayId: string): { key: string; dir: string; meta: EntryMeta } {
    const key = replayId.slice(3);
    if (!KEY.test(key)) throw new PortfolioError(400, 'invalid replay id');
    const dir = join(this.entriesDir, key);
    if (!existsSync(dir)) throw new PortfolioError(404, `replay ${replayId.slice(0, 15)}… is not cached (select the candidate to replay it)`);
    const problem = this.problemOf(key, null);
    if (problem) {
      this.evict(key, problem);
      throw new PortfolioError(410, `replay ${replayId.slice(0, 15)}… was discarded: ${problem}`);
    }
    return { key, dir, meta: JSON.parse(readFileSync(join(dir, 'entry.json'), 'utf8')) as EntryMeta };
  }

  private readVerified<T>(dir: string, meta: EntryMeta, file: string): T {
    const p = join(dir, file);
    const text = readFileSync(p);
    if (createHash('sha256').update(text).digest('hex') !== meta.files[file]?.sha256) throw new PortfolioError(410, `${file} was altered`);
    return JSON.parse(text.toString('utf8')) as T;
  }

  detail(replayId: string, opts: { checkCurrent?: boolean } = {}): PortfolioReplayDetail & { current?: { matches: boolean; candidateEntrySha256: string | null } } {
    const { key, dir, meta } = this.entryDir(replayId);
    const metrics = this.readVerified<PortfolioMetrics>(dir, meta, 'metrics.json');
    const positions = this.readVerified<{ positions: PortfolioPosition[] }>(dir, meta, 'positions.json').positions;
    const prov = this.readVerified<{ basisBySymbol: Record<string, string>; data: Record<string, string> }>(dir, meta, 'provenance.json');
    const entry = this.catalog().candidates.find((c) => c.id === meta.identity.candidate.id);
    this.touch(key);
    const out: PortfolioReplayDetail & { current?: { matches: boolean; candidateEntrySha256: string | null } } = {
      id: replayId,
      candidateId: meta.identity.candidate.id,
      catalogEntrySha256: meta.identity.candidate.entrySha256,
      window: { from: meta.identity.window.from, to: metrics.window.to },
      executedAt: meta.executedAt,
      executionMs: meta.executionMs,
      cacheHit: true,
      name: entry?.name ?? meta.identity.candidate.id,
      symbols: entry?.symbols ?? Object.keys(prov.basisBySymbol),
      metrics,
      positions,
      priceSource: { kind: 'market', basisDate: meta.identity.window.from, basisBySymbol: prov.basisBySymbol },
      implementationSha256: meta.identity.implementation.sha256,
      dataSha256: prov.data
    };
    if (opts.checkCurrent && entry) {
      let matches: boolean;
      try {
        matches = this.keyOf(entry) === key;
      } catch {
        matches = false;
      }
      out.current = { matches, candidateEntrySha256: entry.entrySha256 };
    }
    return out;
  }

  /** The run-shaped view the chart routes need (prices, candles, events): real data, the benchmark window. */
  chartSource(replayId: string) {
    const { meta, dir } = this.entryDir(replayId);
    const prov = this.readVerified<{ basisBySymbol: Record<string, string> }>(dir, meta, 'provenance.json');
    return {
      id: replayId,
      symbols: Object.keys(prov.basisBySymbol),
      priceSource: { kind: 'market' as const, basisDate: meta.identity.window.from, basisBySymbol: prov.basisBySymbol },
      // the archived benchmark window over the canonical files (partition all); minute fills, daily Growth signals
      window: { from: meta.identity.window.from, to: meta.identity.window.to, resolution: null, partition: 'all' },
      dataOrigin: 'real' as const
    };
  }

  events(replayId: string): { events: LabEvent[]; source: ReturnType<PortfolioService['chartSource']> } {
    const { meta, dir } = this.entryDir(replayId);
    const events = readEvents(dir, meta.files['events.json']!.sha256).events;
    return { events, source: this.chartSource(replayId) };
  }

  equity(replayId: string): PortfolioEquity & { replayId: string } {
    const { meta, dir } = this.entryDir(replayId);
    return this.readVerified<PortfolioEquity & { replayId: string }>(dir, meta, 'equity.json');
  }

  cacheStatus() {
    return { entries: this.index.size, bytes: [...this.index.values()].reduce((n, x) => n + x.bytes, 0), running: this.running?.entry.id ?? null, queued: this.queue.map((e) => e.entry.id) };
  }
}
