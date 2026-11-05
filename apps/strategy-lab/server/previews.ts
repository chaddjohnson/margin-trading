// Interactive Preview (docs/strategy-lab/INTERACTIVE_PREVIEW.md): ONE explicit configuration of a form strategy
// executed by the same allowlisted runner, flags and environment as a saved run (server/jobs.ts), WITHOUT a run row,
// variation, trial or sidebar entry. Results are cached by their execution identity (server/preview-identity.ts,
// server/preview-cache.ts); a request whose identity has a valid entry is served from it, an identical request already
// executing joins it (one execution, several tickets), and an execution nobody waits for any more is cancelled. Only
// completed, contract-valid, reconciled outputs whose recorded data and code hashes equal the identity's are cached.
// "Save as run" materialises a cached preview as ONE normal immutable run, after re-validating its identity.

import { type ChildProcess, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createWriteStream, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { LabEvent, LabRunRequest, ParamValue, RunDetail, StrategySpec } from '../shared/contract.ts';
import { paramOf, schemaOf, variationIdentity } from '../shared/params.ts';
import {
  canonicalJson,
  canonicalPreviewConfig,
  type PreviewCapability,
  type PreviewConfig,
  type PreviewDetail,
  type PreviewState,
  type PreviewTicketStatus
} from '../shared/preview.ts';
import { currentVersionOf, findStrategy, STUDY8_POOL, validateRunRequest } from '../shared/strategies.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { atomicWrite, runDirName, sha256, writeManifest } from './artifacts.ts';
import type { Config } from './config.ts';
import { NODE_FLAGS, OPTIONAL_ARTIFACTS, RUNNER_SCRIPTS, runnerEnv } from './jobs.ts';
import { type CacheEntry, PreviewCache } from './preview-cache.ts';
import {
  identityDifferences,
  identityKey,
  keyOfPreviewId,
  type PreviewIdentity,
  PreviewIdentityError,
  previewIdentity,
  previewIdOf
} from './preview-identity.ts';
import type { Repo } from './repo.ts';
import { codeRevision, dataAssumptions, GROWTH_EXPERIMENT, type LabService, partitionsTouched, runProfile } from './service.ts';

export class PreviewError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[]
  ) {
    super(message);
  }
}

/** A ticket nobody polled for this long is released (a closed tab never keeps an execution alive). */
export const TICKET_IDLE_MS = 60_000;
const FINISHED_TICKET_TTL_MS = 15 * 60_000;
const TOLERANCE_USD = 1e-6;
const REQUEST_FIELDS = new Set(['strategyKey', 'strategyVersion', 'params', 'symbols', 'from', 'to', 'resolution']);

interface Execution {
  id: string;
  key: string;
  previewId: string;
  identity: PreviewIdentity;
  config: PreviewConfig;
  spec: StrategySpec;
  sourceRun: string | null;
  state: PreviewState;
  tickets: Set<string>;
  work: string | null;
  child: ChildProcess | null;
  cancelled: boolean;
  timedOut: boolean;
  progress: { message: string; fraction: number | null } | null;
  error: string | null;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

interface Ticket {
  id: string;
  key: string;
  previewId: string;
  execution: Execution | null;
  state: PreviewState;
  cacheHit: boolean;
  coalesced: boolean;
  error: string | null;
  createdAt: number;
  lastSeen: number;
  finishedAt: number | null;
  identityMs: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export class PreviewService {
  readonly cache: PreviewCache;
  private executions = new Map<string, Execution>(); // by key, while queued or running
  private queue: Execution[] = [];
  private running = new Set<Execution>();
  private tickets = new Map<string, Ticket>();
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    private cfg: Config,
    private repo: Repo,
    private service: LabService,
    private log: (m: string) => void = () => {}
  ) {
    this.cache = new PreviewCache(cfg.previewCacheDir, { maxEntries: cfg.previewCacheMaxEntries, maxBytes: cfg.previewCacheMaxBytes }, log);
  }

  /** Prepares the cache (removes interrupted work) and starts releasing idle tickets. */
  init() {
    this.cache.init();
    this.sweeper = setInterval(() => this.sweep(), 10_000);
    this.sweeper.unref();
  }

  /** Stops every preview execution (server shutdown); nothing partial is ever cached. */
  stop() {
    if (this.sweeper) clearInterval(this.sweeper);
    for (const e of this.running) {
      e.cancelled = true;
      e.child?.kill('SIGTERM');
    }
  }

  get activeCount() {
    return this.running.size;
  }

  // ----- capability: may this saved run's configuration be previewed here? -----

  capability(runId: string): PreviewCapability {
    const run = this.repo.runDetail(runId);
    if (!run) throw new PreviewError(404, `no run ${runId}`);
    const spec = findStrategy(run.strategy.key, run.strategy.version);
    const out: PreviewCapability = {
      runId,
      previewable: false,
      reason: '',
      strategy: { key: run.strategy.key, version: run.strategy.version, title: run.strategy.title, kind: spec?.kind ?? 'unknown' },
      seed: null,
      upgrade: null,
      drift: { implementation: [], data: [], checked: false }
    };
    const no = (reason: string) => ({ ...out, reason });
    if (run.dataOrigin === 'synthetic' || run.kind === 'demo')
      return no('Synthetic demo run: its toy rules and fictional prices are not executable, so it cannot be previewed.');
    if (run.kind === 'import')
      return no(
        'Imported result: a replay produced outside Strategy Lab (e.g. a Study 8 shared-slot allocator) and verified on import. Strategy Lab never re-executes it, and Interactive Preview never substitutes a standalone single-strategy simulation for a shared-capital strategy.'
      );
    if (run.strategy.key === STUDY8_POOL.key)
      return no(
        'Shared-slot pool rerun: ONE allocator replay of a sealed configuration through the unchanged Study 8 runner. Its parameters cannot be edited, and it is never run as independent per-symbol backtests; rerun it from the phenotype catalogue.'
      );
    if (run.status !== 'completed') return no(`Available once the run has completed (it is ${run.status}).`);
    const request = this.repo.runRequest(runId) as LabRunRequest | null;
    if (!spec || !request || !isRecord(request) || !isRecord(request.params))
      return no(`This run has no stored executable request of a registered strategy version (${run.strategy.key}@${run.strategy.version}).`);
    const current = currentVersionOf(spec.key);
    if (spec.launch !== 'form') {
      const upgrade =
        current && current.launch === 'form'
          ? {
              version: current.version,
              seed: {
                strategyKey: current.key,
                strategyVersion: current.version,
                params: Object.fromEntries(
                  current.params.map((p) => [p.key, (request.params[p.key] as ParamValue | undefined) ?? p.default])
                ),
                symbols: [...request.symbols],
                from: request.from,
                to: request.to,
                resolution: request.resolution
              },
              note: `A preview as ${current.title} ${current.version} with the options added after ${spec.version} OFF — a NEW execution on the current version, not a reproduction of ${runId}.`
            }
          : null;
      return {
        ...no(
          `${spec.title} ${spec.version} is a superseded version, kept exactly as recorded${spec.legacy ? ` (${spec.legacy.replay})` : ''}. Interactive Preview runs only the current version${current ? ` (${current.version})` : ''}; it never upgrades a run invisibly.`
        ),
        upgrade
      };
    }
    const runner = (run.provenance as { runner?: { engine?: Record<string, string>; symbols?: Record<string, { dataSha256?: string }> } }).runner;
    const drift: PreviewCapability['drift'] = { implementation: [], data: [], checked: Boolean(runner?.engine) };
    for (const [f, h] of Object.entries(runner?.engine ?? {})) {
      const p = join(this.cfg.repoRoot, f);
      if (!existsSync(p) || sha256(readFileSync(p)) !== h) drift.implementation.push(f);
    }
    for (const s of run.symbols) {
      const recorded = runner?.symbols?.[s]?.dataSha256;
      const p = join(this.cfg.repoRoot, 'data', s, 'data.csv');
      if (recorded && (!existsSync(p) || sha256(readFileSync(p)) !== recorded)) drift.data.push(s);
    }
    return {
      ...out,
      previewable: true,
      reason: run.phenotype
        ? `A preview of this phenotype rerun runs its configuration as a standalone ${spec.title} ${spec.version} test (not a phenotype run).`
        : `Runs ${spec.title} ${spec.version} on one configuration at a time; nothing is saved unless you choose Save as run.`,
      seed: {
        strategyKey: spec.key,
        strategyVersion: spec.version,
        params: request.params as Record<string, ParamValue>,
        symbols: [...request.symbols],
        from: request.from,
        to: request.to,
        resolution: request.resolution
      },
      drift
    };
  }

  // ----- submission, tickets, cancellation -----

  /** ONE configuration: served from a valid cache entry, joined to an identical running execution, or queued. */
  submit(body: unknown): PreviewTicketStatus {
    if (!isRecord(body)) throw new PreviewError(400, 'request: must be a JSON object');
    const unknown = Object.keys(body).filter((k) => k !== 'request' && k !== 'sourceRun');
    if (unknown.length) throw new PreviewError(400, 'Invalid preview request', unknown.map((k) => `unknown field "${k}"`));
    const sourceRun = body.sourceRun === undefined ? null : body.sourceRun;
    if (sourceRun !== null && (typeof sourceRun !== 'string' || !/^R-\d{6,12}$/.test(sourceRun) || !this.repo.runIdOf(sourceRun)))
      throw new PreviewError(400, 'sourceRun: an existing run id such as R-000042');
    const { spec, config } = this.validated(body.request);

    const t0 = performance.now();
    let identity: PreviewIdentity;
    try {
      identity = previewIdentity(this.cfg.repoRoot, spec, config);
    } catch (e) {
      if (e instanceof PreviewIdentityError)
        throw new PreviewError(409, `Interactive Preview cannot establish this execution's identity, so it does not run (fail closed): ${e.message}`);
      throw e;
    }
    const key = identityKey(identity);
    const identityMs = Math.round(performance.now() - t0);
    const ticket: Ticket = {
      id: `PT-${randomBytes(12).toString('hex')}`,
      key,
      previewId: previewIdOf(key),
      execution: null,
      state: 'queued',
      cacheHit: false,
      coalesced: false,
      error: null,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      finishedAt: null,
      identityMs
    };
    this.tickets.set(ticket.id, ticket);

    const inFlight = this.executions.get(key);
    if (!inFlight) {
      const hit = this.cache.lookup(key, identity);
      if (hit.hit) {
        ticket.state = 'completed';
        ticket.cacheHit = true;
        ticket.finishedAt = Date.now();
        return this.statusOf(ticket);
      }
      if (hit.reason) this.log(`preview ${key.slice(0, 12)}…: cache entry not reused (${hit.reason}); executing`);
    }
    const exec = inFlight ?? this.enqueue(key, identity, spec, config, sourceRun);
    ticket.coalesced = Boolean(inFlight);
    ticket.execution = exec;
    ticket.state = exec.state;
    exec.tickets.add(ticket.id);
    return this.statusOf(ticket);
  }

  /** The request of ONE configuration, validated as New Test validates it, then reduced to its effective values. */
  private validated(raw: unknown): { spec: StrategySpec; config: PreviewConfig } {
    if (!isRecord(raw)) throw new PreviewError(400, 'Invalid preview request', ['request: must be a JSON object']);
    const unknown = Object.keys(raw).filter((k) => !REQUEST_FIELDS.has(k));
    if (unknown.length) throw new PreviewError(400, 'Invalid preview request', unknown.map((k) => `request: unknown field "${k}"`));
    const spec =
      typeof raw.strategyKey === 'string' && typeof raw.strategyVersion === 'string' ? findStrategy(raw.strategyKey, raw.strategyVersion) : undefined;
    if (spec && isRecord(raw.params)) {
      const unknownParams = Object.keys(raw.params).filter((k) => !paramOf(spec, k));
      if (unknownParams.length)
        throw new PreviewError(400, 'Invalid preview request', unknownParams.map((k) => `params: unknown parameter "${k}"`));
    }
    // Only the effective values are validated and executed: an inactive draft never blocks or changes a preview.
    const candidate = spec && isRecord(raw.params) ? canonicalPreviewConfig(spec, raw as unknown as LabRunRequest) : raw;
    const errors = validateRunRequest(candidate, this.service.knownSymbols(), 'form');
    if (errors.length || !spec) throw new PreviewError(400, 'Invalid preview request', errors.length ? errors : ['strategy: unknown']);
    return { spec, config: candidate as PreviewConfig };
  }

  status(ticketId: string): PreviewTicketStatus {
    const t = this.tickets.get(ticketId);
    if (!t) throw new PreviewError(404, `unknown preview ticket ${ticketId} (finished long ago, or the server restarted): run the preview again`);
    t.lastSeen = Date.now();
    return this.statusOf(t);
  }

  /** Releases one ticket; an execution nobody waits for any more is cancelled (never cached). */
  cancel(ticketId: string): PreviewTicketStatus {
    const t = this.tickets.get(ticketId);
    if (!t) throw new PreviewError(404, `unknown preview ticket ${ticketId}`);
    this.release(t, 'cancelled by the browser');
    return this.statusOf(t);
  }

  private release(t: Ticket, why: string) {
    this.statusOf(t); // the ticket's state follows its execution (it may have finished since the last poll)
    const e = t.execution;
    if (!e || (t.state !== 'queued' && t.state !== 'running')) return;
    t.state = 'cancelled';
    t.error = why;
    t.finishedAt = Date.now();
    e.tickets.delete(t.id);
    if (e.tickets.size === 0) this.cancelExecution(e);
  }

  private cancelExecution(e: Execution) {
    if (e.state === 'queued') {
      this.queue = this.queue.filter((q) => q !== e);
      this.finish(e, 'cancelled', 'cancelled: nobody waits for it any more');
      this.log(`preview ${e.key.slice(0, 12)}…: dropped from the queue (no ticket)`);
    } else if (e.state === 'running' && e.child) {
      e.cancelled = true;
      e.child.kill('SIGTERM');
      setTimeout(() => e.child?.kill('SIGKILL'), 5000).unref();
      this.log(`preview ${e.key.slice(0, 12)}…: cancelled (no ticket)`);
    }
  }

  private sweep() {
    const now = Date.now();
    for (const t of this.tickets.values()) {
      if ((t.state === 'queued' || t.state === 'running') && now - t.lastSeen > TICKET_IDLE_MS) this.release(t, 'released: not polled for 60 s');
      else if (t.finishedAt !== null && now - t.finishedAt > FINISHED_TICKET_TTL_MS) this.tickets.delete(t.id);
    }
  }

  private statusOf(t: Ticket): PreviewTicketStatus {
    const e = t.execution;
    if (e && (t.state === 'queued' || t.state === 'running')) {
      t.state = e.state;
      if (e.state !== 'queued' && e.state !== 'running') {
        t.error = e.error;
        t.finishedAt = e.finishedAt;
      }
    }
    return {
      ticket: t.id,
      previewId: t.previewId,
      state: t.state,
      cacheHit: t.cacheHit,
      coalesced: t.coalesced,
      progress: e && (e.state === 'queued' || e.state === 'running') ? (e.progress ?? { message: e.state === 'queued' ? 'Queued' : 'Starting', fraction: null }) : null,
      error: t.error,
      timing: {
        identityMs: t.identityMs,
        executionMs: e && e.startedAt !== null && e.finishedAt !== null ? e.finishedAt - e.startedAt : null,
        waitedMs: (t.finishedAt ?? Date.now()) - t.createdAt
      }
    };
  }

  // ----- execution -----

  private enqueue(key: string, identity: PreviewIdentity, spec: StrategySpec, config: PreviewConfig, sourceRun: string | null): Execution {
    const e: Execution = {
      id: `PX-${randomBytes(6).toString('hex')}`,
      key,
      previewId: previewIdOf(key),
      identity,
      config,
      spec,
      sourceRun,
      state: 'queued',
      tickets: new Set(),
      work: null,
      child: null,
      cancelled: false,
      timedOut: false,
      progress: null,
      error: null,
      queuedAt: Date.now(),
      startedAt: null,
      finishedAt: null
    };
    this.executions.set(key, e);
    this.queue.push(e);
    queueMicrotask(() => this.pump());
    return e;
  }

  private pump() {
    while (this.running.size < this.cfg.maxConcurrentPreviews && this.queue.length > 0) {
      const e = this.queue.shift()!;
      if (e.state !== 'queued') continue;
      try {
        this.start(e);
      } catch (err) {
        this.finish(e, 'failed', `Could not start: ${(err as Error).message}`);
      }
    }
  }

  private start(e: Execution) {
    const script = RUNNER_SCRIPTS[e.spec.key];
    if (!script) throw new Error(`no runner for strategy ${e.spec.key}`);
    const work = this.cache.newWorkDir();
    e.work = work;
    atomicWrite(join(work, 'request.json'), `${JSON.stringify({ runId: e.previewId, ...e.config }, null, 2)}\n`);
    const revision = codeRevision(this.cfg.repoRoot, runProfile(e.spec, e.config).sourcePaths);
    e.state = 'running';
    e.startedAt = Date.now();
    this.running.add(e);
    const logStream = createWriteStream(join(work, 'run.log'), { flags: 'a' });
    const child = spawn(process.execPath, [...NODE_FLAGS, join(this.cfg.repoRoot, script), work], {
      cwd: this.cfg.repoRoot,
      env: runnerEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    e.child = child;
    const timer = setTimeout(() => {
      e.timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
    }, this.cfg.runTimeoutSeconds * 1000);
    this.log(`preview ${e.key.slice(0, 12)}…: started (pid ${child.pid})`);
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
          if (e.cancelled) this.finish(e, 'cancelled', 'cancelled while running');
          else if (e.timedOut) this.finish(e, 'failed', `Timed out after ${this.cfg.runTimeoutSeconds} s.`);
          else if (code !== 0)
            this.finish(e, 'failed', lastError || `Runner exited with ${code ?? signal}. ${stderrTail.trim().split('\n').slice(-3).join(' ')}`);
          else {
            this.verifyAndCommit(e, revision);
            this.finish(e, 'completed', null);
          }
        } catch (err) {
          this.finish(e, 'failed', `Not cached — the result did not verify: ${(err as Error).message}`);
        }
        this.log(`preview ${e.key.slice(0, 12)}…: ${e.state}${e.error ? ` (${e.error})` : ''}`);
        this.pump();
      });
    });
  }

  private finish(e: Execution, state: PreviewState, error: string | null) {
    e.state = state;
    e.error = error;
    e.finishedAt = Date.now();
    e.child = null;
    this.running.delete(e);
    if (this.executions.get(e.key) === e) this.executions.delete(e.key);
    if (state !== 'completed' && e.work) this.cache.dropWork(e.work);
    for (const id of e.tickets) {
      const t = this.tickets.get(id);
      if (t) this.statusOf(t);
    }
  }

  /**
   * The checks a result must pass before it is cached: the contract (events of exactly this preview id and its
   * symbols), the runner's own accounting identities, the ledger against the events and metrics, the request the
   * runner recorded equal to the canonical configuration, the data and code hashes the runner recorded equal to the
   * identity's, and the identity unchanged after the run (no data or code edit while it ran).
   */
  private verifyAndCommit(e: Execution, revision: Record<string, unknown>) {
    const work = e.work!;
    const json = <T>(f: string) => JSON.parse(readFileSync(join(work, f), 'utf8')) as T;
    for (const f of ['request.json', 'events.json', 'metrics.json', 'provenance.json'])
      if (!existsSync(join(work, f))) throw new Error(`${f} is missing`);
    const file = json<{ runId: string; events: LabEvent[] }>('events.json');
    if (file.runId !== e.previewId) throw new Error('events.json names another run');
    const errors = validateEvents(file.events, e.previewId, e.config.symbols);
    if (errors.length) throw new Error(`events violate the contract: ${errors.slice(0, 3).join('; ')}`);
    const metrics = json<{ kind: string; perSymbol: Record<string, Record<string, unknown>> }>('metrics.json');
    if (metrics.kind === 'trading backtest') this.reconcileTrading(e, file.events, metrics, json('trades.json'));
    else if (file.events.some((x) => x.kind !== 'entry_signal')) throw new Error('a signal-only result holds executed events');
    const prov = json<{
      request: Record<string, unknown>;
      engine: Record<string, string>;
      node: string;
      symbols: Record<string, { dataSha256?: string; partitionsSha256?: string }>;
    }>('provenance.json');
    if (canonicalJson(prov.request) !== canonicalJson({ runId: e.previewId, ...e.config }))
      throw new Error('the runner recorded another request than the canonical configuration');
    if (prov.node !== e.identity.implementation.node) throw new Error(`the runner ran on Node ${prov.node}, not ${e.identity.implementation.node}`);
    for (const [f, h] of Object.entries(prov.engine ?? {}))
      if (e.identity.implementation.files[f] !== h) throw new Error(`engine file ${f} differs from the fingerprinted implementation`);
    for (const s of e.config.symbols) {
      const rec = prov.symbols?.[s];
      if (!rec?.dataSha256 || rec.dataSha256 !== e.identity.data.symbols[s]?.[`data/${s}/data.csv`])
        throw new Error(`the runner read other ${s} data than the identity's`);
      const parts = e.identity.data.inputs['data/partitions.json'];
      if (rec.partitionsSha256 && parts && rec.partitionsSha256 !== parts) throw new Error('the partitions file changed during the run');
    }
    const after = previewIdentity(this.cfg.repoRoot, e.spec, e.config);
    const diff = identityDifferences(e.identity, after);
    if (diff.length) throw new Error(`changed while the preview ran: ${diff.slice(0, 4).join(', ')}`);
    const files = ['request.json', 'events.json', 'metrics.json', 'provenance.json', ...OPTIONAL_ARTIFACTS, 'run.log'].filter((f) =>
      existsSync(join(work, f))
    );
    this.cache.commit(
      work,
      {
        key: e.key,
        identity: e.identity,
        executedAt: new Date(e.startedAt!).toISOString(),
        executionMs: Date.now() - e.startedAt!,
        codeRevision: revision,
        sourceRun: e.sourceRun
      },
      files
    );
  }

  private reconcileTrading(
    e: Execution,
    events: LabEvent[],
    metrics: { perSymbol: Record<string, Record<string, unknown>> },
    trades: { trades: Record<string, { status: string; net: number }[]> }
  ) {
    for (const s of e.config.symbols) {
      const m = metrics.perSymbol[s] as {
        trades: { filled: number; closed: number };
        pnl: { realizedNetUsd: number };
        checks: { fixedLedgerMaxDifferenceUsd: number; identityMaxResidualUsd: number; markedEqualsLedger: number };
      };
      if (!m) throw new Error(`no metrics for ${s}`);
      const c = m.checks;
      if (!(c.fixedLedgerMaxDifferenceUsd <= TOLERANCE_USD && c.identityMaxResidualUsd <= TOLERANCE_USD && c.markedEqualsLedger <= TOLERANCE_USD))
        throw new Error(`${s}: an accounting check does not close`);
      const rows = trades.trades[s] ?? [];
      const closed = rows.filter((r) => r.status === 'closed');
      const ofKind = (k: LabEvent['kind']) => events.filter((x) => x.symbol === s && x.kind === k).length;
      if (rows.length !== m.trades.filled || closed.length !== m.trades.closed) throw new Error(`${s}: the ledger and the metrics count different trades`);
      if (ofKind('executed_entry') !== rows.length || ofKind('executed_exit') !== closed.length)
        throw new Error(`${s}: the events and the ledger count different fills`);
      const realized = closed.reduce((n, r) => n + r.net, 0);
      if (Math.abs(realized - m.pnl.realizedNetUsd) > TOLERANCE_USD) throw new Error(`${s}: the ledger's realized net differs from the metrics`);
    }
  }

  // ----- reading a cached preview -----

  /** A cached preview's entry (integrity-checked) or a 404 with the reason. */
  entryOf(previewId: string): CacheEntry {
    const key = keyOfPreviewId(previewId);
    if (!key) throw new PreviewError(400, 'a preview id is PV- followed by 64 hexadecimal characters');
    const entry = this.cache.get(key);
    if (!entry) throw new PreviewError(404, `preview ${previewId.slice(0, 15)}… is not in the cache (evicted, cleared or never completed): run it again`);
    return entry;
  }

  readJson<T>(entry: CacheEntry, file: string): T {
    return JSON.parse(this.cache.readFile(entry, file).toString('utf8')) as T;
  }

  /**
   * The preview as a run-shaped record (kind `preview`, id PV-…): what the run page renders. With `checkCurrent`, its
   * execution identity is recomputed from the current code and data and compared with the stored one (`current`), so
   * a preview shown without being run (a reload, Back/Forward, a link) says when it is outdated.
   */
  detail(previewId: string, { checkCurrent = false }: { checkCurrent?: boolean } = {}): PreviewDetail {
    const entry = this.entryOf(previewId);
    const { config, spec } = this.configOf(entry);
    const metrics = this.readJson<Record<string, unknown>>(entry, 'metrics.json');
    const prov = this.readJson<{ basisBySymbol: Record<string, string> } & Record<string, unknown>>(entry, 'provenance.json');
    const events = this.readJson<{ events: LabEvent[] }>(entry, 'events.json').events;
    const req = config as LabRunRequest;
    const profile = runProfile(spec, req);
    const partition = partitionsTouched(this.cfg.repoRoot, config.from, config.to);
    const m = entry.meta;
    const first = config.symbols[0]!;
    const detail: RunDetail = {
      id: m.previewId,
      title: 'Temporary preview (not saved)',
      status: 'completed',
      kind: 'preview',
      dataOrigin: 'real',
      experiment: { id: '', title: 'Interactive Preview (not saved)' },
      strategy: { id: '', key: spec.key, version: spec.version, title: spec.title },
      variation: { id: '', title: 'not saved' },
      symbols: [...config.symbols],
      window: { from: config.from, to: config.to, resolution: config.resolution, partition },
      createdAt: m.executedAt,
      startedAt: m.executedAt,
      completedAt: new Date(Date.parse(m.executedAt) + m.executionMs).toISOString(),
      eventCount: events.length,
      bookmarked: false,
      noteCount: 0,
      noteExcerpt: null,
      params: profile.params,
      paramSchema: schemaOf(spec),
      strategyFormerTitle: null,
      phenotype: null,
      assumptions: [...profile.assumptions, ...dataAssumptions(req, partition)],
      priceSource: { kind: 'market', basisDate: prov.basisBySymbol[first] ?? config.from, basisBySymbol: prov.basisBySymbol },
      provenance: {
        createdBy: 'Strategy Lab Interactive Preview (temporary; not a saved run)',
        preview: { id: m.previewId, key: m.key, sourceRun: m.sourceRun, executedAt: m.executedAt, executionMs: m.executionMs },
        runner: prov
      },
      codeRevision: m.codeRevision,
      metrics,
      error: null,
      artifact: { sha256: m.files['events.json']!.sha256, files: Object.keys(m.files) },
      progress: null
    };
    return {
      ...detail,
      request: config,
      preview: {
        id: m.previewId,
        key: m.key,
        config,
        executedAt: m.executedAt,
        executionMs: m.executionMs,
        implementationSha256: m.identity.implementation.sha256,
        dataSha256: Object.fromEntries(Object.entries(m.identity.data.symbols).map(([s, f]) => [s, f[`data/${s}/data.csv`]!])),
        savedAs: this.repo.runsSavedFromPreview(m.key),
        ...(checkCurrent ? { current: this.currentOf(m.identity, spec, config) } : {})
      }
    };
  }

  /** Whether a stored identity is still the one the current code and data give (fail closed: unknown = outdated). */
  private currentOf(stored: PreviewIdentity, spec: StrategySpec, config: PreviewConfig): { matches: boolean; differences: string[] } {
    try {
      const differences = identityDifferences(stored, previewIdentity(this.cfg.repoRoot, spec, config));
      return { matches: differences.length === 0, differences };
    } catch (e) {
      return { matches: false, differences: [`the current identity cannot be established: ${(e as Error).message}`] };
    }
  }

  private configOf(entry: CacheEntry): { config: PreviewConfig; spec: StrategySpec } {
    const stored: Partial<PreviewConfig & { runId: string }> = this.readJson(entry, 'request.json');
    delete stored.runId; // the preview id the runner was given
    const config = stored as PreviewConfig;
    const spec = findStrategy(config.strategyKey, config.strategyVersion);
    if (!spec) throw new PreviewError(410, `${config.strategyKey}@${config.strategyVersion} is no longer registered`);
    return { config, spec };
  }

  /** What the chart needs (symbols, window, split basis): request.json and provenance.json only. */
  chartSource(previewId: string): Pick<RunDetail, 'id' | 'symbols' | 'priceSource' | 'window' | 'dataOrigin'> {
    const entry = this.entryOf(previewId);
    const { config } = this.configOf(entry);
    const prov = this.readJson<{ basisBySymbol: Record<string, string> }>(entry, 'provenance.json');
    return {
      id: entry.meta.previewId,
      symbols: [...config.symbols],
      dataOrigin: 'real',
      window: { from: config.from, to: config.to, resolution: config.resolution, partition: null },
      priceSource: { kind: 'market', basisDate: prov.basisBySymbol[config.symbols[0]!] ?? config.from, basisBySymbol: prov.basisBySymbol }
    };
  }

  events(previewId: string): { events: LabEvent[]; detail: PreviewDetail } {
    const detail = this.detail(previewId);
    const entry = this.entryOf(previewId);
    return { events: this.readJson<{ events: LabEvent[] }>(entry, 'events.json').events, detail };
  }

  // ----- Save as run: ONE normal immutable run from a cached, still-valid preview -----

  save(previewId: string, body: unknown): { runId: string } {
    if (body !== undefined && !isRecord(body)) throw new PreviewError(400, 'body: a JSON object');
    const b = (body ?? {}) as Record<string, unknown>;
    const unknown = Object.keys(b).filter((k) => !['title', 'sourceRun', 'confirmDuplicate'].includes(k));
    if (unknown.length) throw new PreviewError(400, 'Invalid save request', unknown.map((k) => `unknown field "${k}"`));
    if (b.title !== undefined && (typeof b.title !== 'string' || b.title.length > 160)) throw new PreviewError(400, 'title: at most 160 characters');
    const sourceRun = b.sourceRun === undefined ? null : b.sourceRun;
    if (sourceRun !== null && (typeof sourceRun !== 'string' || !this.repo.runDetail(sourceRun)))
      throw new PreviewError(400, 'sourceRun: an existing run id');
    const entry = this.entryOf(previewId);
    const { config, spec } = this.configOf(entry);
    if (spec.launch !== 'form') throw new PreviewError(409, `${spec.key}@${spec.version} can no longer be launched as a test`);
    // The identity is recomputed NOW: a preview is saved only if it is what the current code and data would produce.
    let fresh: PreviewIdentity;
    try {
      fresh = previewIdentity(this.cfg.repoRoot, spec, config);
    } catch (e) {
      throw new PreviewError(409, `Not saved: the execution identity cannot be established (${(e as Error).message})`);
    }
    const diff = identityDifferences(entry.meta.identity, fresh);
    if (diff.length)
      throw new PreviewError(409, 'Not saved: this preview no longer matches the current implementation or data. Run the preview again, then save it.', diff.slice(0, 12));
    const existing = this.repo.runsSavedFromPreview(entry.meta.key);
    if (existing.length && b.confirmDuplicate !== true)
      throw new PreviewError(409, `Already saved as ${existing.join(', ')}`, existing);
    return this.materialise(entry, spec, config, sourceRun as string | null, typeof b.title === 'string' ? b.title.trim() : '');
  }

  private materialise(entry: CacheEntry, spec: StrategySpec, config: PreviewConfig, sourceRun: string | null, title: string): { runId: string } {
    const m = entry.meta;
    // Every artifact is read and verified BEFORE a run row exists: a damaged entry never produces a run.
    const files = Object.keys(m.files).filter((f) => f !== 'manifest.json');
    const contents = new Map(files.map((f) => [f, this.cache.readFile(entry, f)]));
    const quoted = JSON.stringify(m.previewId);
    const source = sourceRun ? this.repo.runDetail(sourceRun) : null;
    const req: LabRunRequest = {
      ...config,
      ...(title ? { title } : {}),
      ...(source && source.variation.id ? { parentVariation: source.variation.id } : {})
    };
    const profile = runProfile(spec, req);
    const exp = this.repo.ensureExperiment(GROWTH_EXPERIMENT.slug, GROWTH_EXPERIMENT.title, GROWTH_EXPERIMENT.description);
    const strat = this.service.ensureRegistered(spec, profile.sourceRef);
    const variation = this.repo.findOrCreateVariation({
      strategyId: strat.id,
      experimentId: exp.id,
      params: profile.variationParams,
      canonical: variationIdentity(spec, req.params, req.resolution),
      title: profile.title,
      origin: 'manual',
      parentVariationId: source ? this.repo.variationIdOf(source.variation.id) : null
    });
    const partition = partitionsTouched(this.cfg.repoRoot, config.from, config.to);
    const savedAt = new Date().toISOString();
    const previewProvenance = {
      id: m.previewId,
      key: m.key,
      sourceRun,
      executedAt: m.executedAt,
      executionMs: m.executionMs,
      savedAt,
      implementationSha256: m.identity.implementation.sha256,
      dataSha256: Object.fromEntries(Object.entries(m.identity.data.symbols).map(([s, f]) => [s, f[`data/${s}/data.csv`]!])),
      note: 'Materialised from a cached Interactive Preview whose execution identity was re-validated at save time; the artifacts are the preview\'s, with only their run id rewritten.'
    };
    const base = {
      createdBy: 'Strategy Lab Interactive Preview — Save as run',
      preview: previewProvenance,
      variation: variation.publicId,
      variationCreated: variation.created
    };
    const run = this.repo.createRun({
      variationId: variation.id,
      title,
      kind: 'manual',
      status: 'queued',
      dataOrigin: 'real',
      symbols: [...config.symbols],
      window: { from: config.from, to: config.to, resolution: config.resolution, partition },
      params: profile.params,
      assumptions: [...profile.assumptions, ...dataAssumptions(req, partition)],
      request: req,
      priceSource: { kind: 'market', basisDate: config.from },
      provenance: base,
      codeRevision: m.codeRevision,
      phenotypeId: null
    });
    this.repo.markRunning(run.id);
    const relDir = runDirName(run.publicId);
    const dir = join(this.cfg.stateDir, relDir);
    try {
      const quotedRun = JSON.stringify(run.publicId);
      for (const [f, data] of contents) {
        if (f === 'run.log') {
          atomicWrite(join(dir, f), Buffer.concat([data, Buffer.from(`saved from ${m.previewId} as ${run.publicId} at ${savedAt}\n`)]));
          continue;
        }
        if (!f.endsWith('.json')) {
          atomicWrite(join(dir, f), data);
          continue;
        }
        const text = data.toString('utf8');
        const rewritten = text.split(quoted).join(quotedRun);
        if (rewritten.includes(m.previewId)) throw new Error(`${f} mentions the preview id outside a run id field`);
        atomicWrite(join(dir, f), rewritten);
      }
      const events = JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8')) as { runId: string; events: LabEvent[] };
      const errors = validateEvents(events.events, run.publicId, config.symbols);
      if (events.runId !== run.publicId || errors.length) throw new Error(`events do not validate as ${run.publicId}: ${errors.slice(0, 2).join('; ')}`);
      const sameEvents = JSON.parse(contents.get('events.json')!.toString('utf8')) as { events: LabEvent[] };
      if (canonicalJson(sameEvents.events.map((x) => ({ ...x, runId: run.publicId }))) !== canonicalJson(events.events))
        throw new Error('the saved events differ from the preview events beyond the run id');
      writeManifest(dir, ['request.json', 'events.json', 'metrics.json', 'provenance.json', ...OPTIONAL_ARTIFACTS.filter((f) => existsSync(join(dir, f)))]);
      const prov = JSON.parse(readFileSync(join(dir, 'provenance.json'), 'utf8')) as { basisBySymbol: Record<string, string> } & Record<string, unknown>;
      const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8')) as Record<string, unknown>;
      this.repo.complete(run.id, {
        eventCount: events.events.length,
        artifactDir: relDir,
        artifactSha256: sha256(readFileSync(join(dir, 'events.json'))),
        metrics,
        provenance: { ...base, runner: prov },
        priceSource: { kind: 'market', basisDate: prov.basisBySymbol[config.symbols[0]!] ?? config.from, basisBySymbol: prov.basisBySymbol }
      });
    } catch (e) {
      this.repo.finishUnsuccessfully(run.id, 'failed', `Save as run failed: ${(e as Error).message}`, null);
      rmSync(dir, { recursive: true, force: true });
      throw new PreviewError(500, `Save as run failed (${run.publicId} is marked failed; delete it if you like): ${(e as Error).message}`);
    }
    this.log(`preview ${m.key.slice(0, 12)}…: saved as ${run.publicId}`);
    return { runId: run.publicId };
  }
}
