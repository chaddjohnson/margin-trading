// Bounded background execution of manual test runs. Each run is a child process started with an allowlisted executable
// (this Node binary) and a fixed argument vector — the runner script and a server-generated run directory; no shell, no
// user text on the command line. Status lives in SQLite, so a page refresh or a server restart never loses a run:
// queued runs are re-queued on start, runs interrupted by a stop are marked failed with that reason.

import { type ChildProcess, spawn } from 'node:child_process';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { basisDateOf, type PriceSource } from '../shared/contract.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { readEvents, sha256, writeManifest } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Repo } from './repo.ts';

export const RUNNER_SCRIPT = 'apps/strategy-lab/runner/entry-signal-run.ts';
const NODE_FLAGS = [
  '--experimental-transform-types',
  '--disable-warning=ExperimentalWarning',
  '--max-old-space-size=6144'
];

interface Active {
  child: ChildProcess;
  cancelled: boolean;
  timedOut: boolean;
  timer: NodeJS.Timeout;
}

export class Jobs {
  private queue: { id: number; publicId: string }[] = [];
  private active = new Map<number, Active>();

  constructor(
    private repo: Repo,
    private cfg: Config,
    private log: (m: string) => void = () => {}
  ) {}

  /** Called once at start: re-queues queued runs, fails runs a previous server instance left running. */
  recover() {
    for (const r of this.repo.runsWithStatus(['running']))
      this.repo.finishUnsuccessfully(
        r.id,
        'failed',
        'Interrupted: the server stopped while this run was running. Start a new run.',
        null
      );
    for (const r of this.repo.runsWithStatus(['queued'])) this.queue.push({ id: r.id, publicId: r.publicId });
    this.pump();
  }

  enqueue(id: number, publicId: string) {
    this.queue.push({ id, publicId });
    this.pump();
  }

  get activeCount() {
    return this.active.size;
  }

  cancel(id: number): boolean {
    const i = this.queue.findIndex((q) => q.id === id);
    if (i >= 0) {
      this.queue.splice(i, 1);
      this.repo.finishUnsuccessfully(id, 'cancelled', 'Cancelled before it started.', null);
      return true;
    }
    const a = this.active.get(id);
    if (!a) return false;
    a.cancelled = true;
    a.child.kill('SIGTERM');
    setTimeout(() => a.child.kill('SIGKILL'), 5000).unref();
    return true;
  }

  /** Stops running children (server shutdown). Their runs are marked failed by the next recover(). */
  stopAll() {
    for (const a of this.active.values()) a.child.kill('SIGTERM');
  }

  private pump() {
    while (this.active.size < this.cfg.maxConcurrentRuns && this.queue.length > 0) {
      const next = this.queue.shift()!;
      try {
        this.start(next.id, next.publicId);
      } catch (e) {
        this.repo.finishUnsuccessfully(next.id, 'failed', `Could not start: ${(e as Error).message}`, null);
      }
    }
  }

  private start(id: number, publicId: string) {
    const relDir = join('runs', publicId);
    const dir = join(this.cfg.stateDir, relDir);
    if (!existsSync(join(dir, 'request.json'))) throw new Error('request.json is missing');
    this.repo.markRunning(id);
    this.repo.setProgress(id, 'Starting', 0);
    const logStream = createWriteStream(join(dir, 'run.log'), { flags: 'a' });
    const child = spawn(process.execPath, [...NODE_FLAGS, join(this.cfg.repoRoot, RUNNER_SCRIPT), dir], {
      cwd: this.cfg.repoRoot,
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? '/tmp', LANG: 'C.UTF-8', TZ: 'UTC' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    const a: Active = {
      child,
      cancelled: false,
      timedOut: false,
      timer: setTimeout(() => {
        a.timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      }, this.cfg.runTimeoutSeconds * 1000)
    };
    this.active.set(id, a);
    this.log(`run ${publicId}: started (pid ${child.pid})`);

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
          if (msg.type === 'progress') this.repo.setProgress(id, String(msg.message ?? ''), msg.fraction ?? null);
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
      clearTimeout(a.timer);
      this.active.delete(id);
      logStream.end();
      try {
        if (a.cancelled) this.repo.finishUnsuccessfully(id, 'cancelled', 'Cancelled while running.', relDir);
        else if (a.timedOut)
          this.repo.finishUnsuccessfully(id, 'failed', `Timed out after ${this.cfg.runTimeoutSeconds} s.`, relDir);
        else if (code !== 0)
          this.repo.finishUnsuccessfully(
            id,
            'failed',
            lastError || `Runner exited with ${code ?? signal}. ${stderrTail.trim().split('\n').slice(-3).join(' ')}`,
            relDir
          );
        else this.finalize(id, publicId, dir, relDir);
      } catch (e) {
        this.repo.finishUnsuccessfully(id, 'failed', `Result check failed: ${(e as Error).message}`, relDir);
      }
      this.log(
        `run ${publicId}: finished (${a.cancelled ? 'cancelled' : code === 0 ? 'ok' : `exit ${code ?? signal}`})`
      );
      this.pump();
    });
  }

  /** Verifies the runner's artifacts against the contract, then records the result (once; immutable after). */
  private finalize(id: number, publicId: string, dir: string, relDir: string) {
    const detail = this.repo.runDetail(publicId);
    if (!detail) throw new Error('run vanished');
    const file = readEvents(dir, null);
    const errors = validateEvents(file.events, publicId, detail.symbols);
    if (errors.length) throw new Error(`events.json violates the contract: ${errors.slice(0, 3).join('; ')}`);
    const eventsSha = sha256(readFileSync(join(dir, 'events.json')));
    const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8')) as Record<string, unknown>;
    const prov = JSON.parse(readFileSync(join(dir, 'provenance.json'), 'utf8')) as {
      basisBySymbol: Record<string, string>;
    } & Record<string, unknown>;
    writeManifest(dir, ['request.json', 'events.json', 'metrics.json', 'provenance.json']);
    const first = detail.symbols[0]!;
    const priceSource: PriceSource = {
      kind: 'market',
      basisDate: prov.basisBySymbol[first] ?? basisDateOf(detail.priceSource, first) ?? detail.window.from,
      basisBySymbol: prov.basisBySymbol
    };
    this.repo.complete(id, {
      eventCount: file.events.length,
      artifactDir: relDir,
      artifactSha256: eventsSha,
      metrics,
      provenance: { ...detail.provenance, runner: prov },
      priceSource
    });
  }
}
