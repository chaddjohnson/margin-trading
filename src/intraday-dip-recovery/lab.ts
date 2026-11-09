// The evaluation service of one job: the archive (read back on a rerun), the worker pool (fresh evaluations), a local
// door view (detailed centre runs), the counters the reports need (fresh evaluations, archive/cache hits, retries),
// the memory monitor with the pre-limit pressure stop, the graceful SIGTERM/SIGINT stop and the progress checkpoint.
import fs from 'node:fs';
import path from 'node:path';
import { type DoorKey, cacheDir, log, prefixDoors } from './context.ts';
import { openFullDoor, openPrefixDoor } from './data.ts';
import { type DoorView, type Rec, type RunSpec, settingsKey, viewOf } from './evaluate.ts';
import { Archive, Pool, StopRequested } from './pool.ts';
import { resources } from './resources.ts';
import { codeDigest, nowIso } from './seal.ts';
import { gridKey } from './space.ts';

export const specKey = (spec: RunSpec) =>
  `${spec.ruleSet}|${settingsKey(spec.settings)}|${gridKey(spec.grid)}${spec.endSession !== undefined ? `|e${spec.endSession}` : ''}${spec.blackout ? `|k${spec.blackout.join('-')}` : ''}`;

export interface Counters {
  requested: number; // evaluations asked for (after in-batch de-duplication)
  fresh: number; // computed by the pool in this process
  hits: number; // read from the archive or the in-memory cache
  retries: number;
}

const cgroupFile = () => {
  try {
    const line = fs.readFileSync('/proc/self/cgroup', 'utf8').trim().split('\n').at(-1)!;
    const rel = line.split('::')[1] ?? '';

    return path.join('/sys/fs/cgroup', rel);
  } catch {
    return '';
  }
};

export const cgroupMemory = () => {
  const dir = cgroupFile();

  try {
    return {
      cgroup: dir,
      current: Number(fs.readFileSync(path.join(dir, 'memory.current'), 'utf8')),
      peak: fs.existsSync(path.join(dir, 'memory.peak')) ? Number(fs.readFileSync(path.join(dir, 'memory.peak'), 'utf8')) : NaN
    };
  } catch {
    return { cgroup: dir, current: NaN, peak: NaN };
  }
};

export class Lab {
  readonly counters: Counters = { requested: 0, fresh: 0, hits: 0, retries: 0 };
  readonly archive: Archive;
  readonly view: DoorView;
  pool: Pool | null = null;
  private monitor: NodeJS.Timeout | null = null;
  private progressFile: string;
  readonly memoryLog: { at: string; cgroup: number; rss: number; external: number; arrayBuffers: number }[] = [];
  private readonly started = Date.now();
  stopReason: string | null = null;

  constructor(
    readonly job: string,
    readonly doorKey: DoorKey,
    readonly purpose: string,
    readonly options: { workers?: number; guardSha?: string; killAfter?: number; fullSha?: string } = {}
  ) {
    const door =
      doorKey === 'FULL'
        ? openFullDoor({ frozenSha256: options.guardSha ?? '', committed: true }, `${purpose} (orchestrator)`)
        : openPrefixDoor(doorKey, `${purpose} (orchestrator)`);

    this.view = viewOf(door);
    this.archive = new Archive(job, {
      job,
      door: doorKey,
      doorSha256: doorKey === 'FULL' ? door.sha256 : prefixDoors[doorKey].sha256,
      codeDigest: codeDigest().digest
    });
    this.progressFile = path.join(cacheDir, 'jobs', job, 'progress.json');
    if (this.archive.loaded > 0) log(`${job}: archive holds ${this.archive.loaded} evaluations (resume)`);
  }

  async start() {
    const workers = this.options.workers ?? resources.workers;

    this.pool = new Pool({
      door: this.doorKey,
      purpose: this.purpose,
      workers,
      ...(this.options.guardSha ? { guardSha: this.options.guardSha } : {}),
      ...(this.options.killAfter ? { killAfter: this.options.killAfter } : {})
    });
    await this.pool.start();

    const stop = (signal: string) => {
      this.stopReason = signal;
      this.pool?.requestStop(signal);
    };

    process.once('SIGTERM', () => stop('SIGTERM'));
    process.once('SIGINT', () => stop('SIGINT'));
    this.monitor = setInterval(() => void this.sample(), resources.monitorSeconds * 1000);
    this.monitor.unref();
    log(`${this.job}: ${workers} workers ready on ${this.doorKey}`);
  }

  private async sample() {
    if (!this.pool) return;

    await this.pool.refreshMemory();

    const cg = cgroupMemory();
    const stats = this.pool.workerStats();
    const rss = stats.reduce((t, w) => t + (w.mem?.rss ?? 0), 0) + process.memoryUsage().rss;
    const external = stats.reduce((t, w) => t + (w.mem?.external ?? 0), 0);
    const arrayBuffers = stats.reduce((t, w) => t + (w.mem?.arrayBuffers ?? 0), 0);

    this.memoryLog.push({ at: nowIso(), cgroup: cg.current, rss, external, arrayBuffers });
    if (this.memoryLog.length > 2000) this.memoryLog.splice(0, 1000);

    if (cg.current > resources.pressureBytes) {
      this.stopReason = `memory pressure ${(cg.current / 2 ** 30).toFixed(1)} GiB > ${(resources.pressureBytes / 2 ** 30).toFixed(0)} GiB`;
      this.pool.requestStop(this.stopReason);
    }
  }

  // Evaluates specs (archive first), returning records in order.
  async evaluate(specs: RunSpec[]): Promise<Rec[]> {
    const keys = specs.map(specKey);
    const missing = new Map<string, RunSpec>();

    keys.forEach((k, n) => {
      if (this.archive.has(k)) return;
      if (!missing.has(k)) missing.set(k, specs[n]!);
    });

    this.counters.requested += new Set(keys).size;
    this.counters.hits += new Set(keys).size - missing.size;

    const tasks = [...missing.entries()].map(([k, spec]) => ({ k, spec }));

    for (let i = 0; i < tasks.length; i += resources.batch) {
      if (!this.pool) throw new Error('the pool is not started');

      await this.pool.run(tasks.slice(i, i + resources.batch), (task, r) => {
        this.archive.put(task.k, r);
        this.counters.fresh++;
      });
      this.archive.flush();
      this.checkpoint();
    }

    return keys.map((k) => this.archive.get(k)!);
  }

  checkpoint(extra: Record<string, unknown> = {}) {
    fs.writeFileSync(
      this.progressFile,
      JSON.stringify({ at: nowIso(), job: this.job, counters: this.counters, archive: this.archive.size, elapsedS: (Date.now() - this.started) / 1000, ...extra })
    );
  }

  get elapsedSeconds() {
    return (Date.now() - this.started) / 1000;
  }

  async close() {
    this.archive.flush();
    if (this.monitor) clearInterval(this.monitor);
    await this.pool?.close();
  }
}

export { StopRequested };
