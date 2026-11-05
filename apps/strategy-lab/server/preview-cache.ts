// The persistent Interactive Preview cache (docs/strategy-lab/INTERACTIVE_PREVIEW.md §Cache): completed, validated,
// reconciled preview results keyed by the sha256 of their execution identity (server/preview-identity.ts). It lives in
// its own directory (default <stateDir>/preview-cache) and never touches saved runs, the database, market data or
// imports. Layout:
//
//   PREVIEW_CACHE.md        marker + explanation (a directory without it is never cleared or pruned)
//   entries/<key>/          one committed entry: the runner's artifacts, manifest.json, entry.json, last-used.json
//   work/<execution>/       executions in progress (an interrupted one is removed at the next start)
//   trash/                  evicted entries on their way out (renamed first, then removed)
//
// Commit = verify the artifacts → write entry.json (identity, every file's sha256 and size) → rename the work directory
// to entries/<key> (atomic within one filesystem). A lookup recomputes nothing itself but requires the caller's FRESH
// identity to equal the stored one exactly and every file to match its recorded sha256 and size, and re-validates the
// events; anything else (corrupt, missing, tampered, older format, other identity) evicts the entry and reports a miss.
// Retention: least recently used first (lastUsedAt, then key), bounded by an entry count and a byte total.

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { canonicalJson } from '../shared/preview.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { atomicWrite, sha256 } from './artifacts.ts';
import { identityKey, PREVIEW_CACHE_FORMAT, type PreviewIdentity, previewIdOf } from './preview-identity.ts';

export const ENTRY_SCHEMA = 'strategy-lab.preview-cache-entry';
const KEY = /^[0-9a-f]{64}$/;
const MARKER = 'PREVIEW_CACHE.md';
const MARKER_TEXT = `# Strategy Lab — Interactive Preview cache

Disposable, rebuildable cache of temporary preview results (docs/strategy-lab/INTERACTIVE_PREVIEW.md). Nothing here is
a saved run: deleting this directory loses no research record. Manage it with
\`npm --prefix apps/strategy-lab run preview-cache -- status|verify|prune|clear\` (only directories carrying this file
are touched).
`;

export interface CacheLimits {
  maxEntries: number;
  maxBytes: number;
}

export interface EntryMeta {
  schema: typeof ENTRY_SCHEMA;
  format: number;
  key: string;
  previewId: string;
  identity: PreviewIdentity;
  /** Every artifact file of the entry (not entry.json / last-used.json): sha256 and size. */
  files: Record<string, { sha256: string; bytes: number }>;
  executedAt: string;
  executionMs: number;
  codeRevision: Record<string, unknown> | null;
  /** The saved run whose page started this execution (provenance only). */
  sourceRun: string | null;
}

export interface CacheEntry {
  meta: EntryMeta;
  dir: string;
  bytes: number;
  lastUsedAt: string;
}

export type LookupResult = { hit: true; entry: CacheEntry } | { hit: false; reason: string | null };

const dirSize = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? dirSize(join(dir, e.name)) : e.isFile() ? statSync(join(dir, e.name)).size : 0),
    0
  );

export class PreviewCache {
  readonly entriesDir: string;
  readonly workDir: string;
  private trashDir: string;
  /** key → size and recency (the LRU state; lastUsedAt persisted in each entry's last-used.json). */
  private index = new Map<string, { bytes: number; lastUsedAt: string }>();

  constructor(
    readonly dir: string,
    readonly limits: CacheLimits,
    private log: (m: string) => void = () => {}
  ) {
    this.entriesDir = join(dir, 'entries');
    this.workDir = join(dir, 'work');
    this.trashDir = join(dir, 'trash');
  }

  /**
   * Creates the layout, loads the LRU index (entries are validated on use) and — for the server at its start only —
   * removes interrupted work and trash. The maintenance CLI passes `cleanup: false`: a running server's work
   * directories are never touched from outside.
   */
  init({ cleanup = true }: { cleanup?: boolean } = {}) {
    if (existsSync(this.dir) && readdirSync(this.dir).length > 0 && !existsSync(join(this.dir, MARKER)))
      throw new Error(`${this.dir} is not empty and is not a preview cache (no ${MARKER}); refusing to use it`);
    for (const d of [this.dir, this.entriesDir, this.workDir, this.trashDir]) mkdirSync(d, { recursive: true });
    if (!existsSync(join(this.dir, MARKER))) writeFileSync(join(this.dir, MARKER), MARKER_TEXT);
    for (const d of cleanup ? [this.workDir, this.trashDir] : [])
      for (const name of readdirSync(d)) {
        rmSync(join(d, name), { recursive: true, force: true });
        this.log(`preview cache: removed leftover ${d === this.workDir ? 'work' : 'trash'} ${name}`);
      }
    this.index.clear();
    for (const name of readdirSync(this.entriesDir)) {
      const dir = join(this.entriesDir, name);
      if (!KEY.test(name) || !existsSync(join(dir, 'entry.json'))) {
        this.discard(dir, `malformed entry ${name}`);
        continue;
      }
      this.index.set(name, { bytes: dirSize(dir), lastUsedAt: this.lastUsedOf(dir) });
    }
  }

  private lastUsedOf(dir: string): string {
    try {
      const v = (JSON.parse(readFileSync(join(dir, 'last-used.json'), 'utf8')) as { lastUsedAt?: unknown }).lastUsedAt;
      if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return v;
    } catch {
      /* absent or corrupt: fall back to the execution time */
    }
    try {
      return (JSON.parse(readFileSync(join(dir, 'entry.json'), 'utf8')) as EntryMeta).executedAt;
    } catch {
      return new Date(0).toISOString();
    }
  }

  /** A fresh, empty work directory for one execution. */
  newWorkDir(): string {
    const d = join(this.workDir, `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`);
    mkdirSync(d, { recursive: true });
    return d;
  }

  /** Removes a work directory (failed, cancelled or already committed elsewhere). */
  dropWork(dir: string) {
    if (dir.startsWith(this.workDir)) rmSync(dir, { recursive: true, force: true });
  }

  /**
   * The entry of a key IF it is valid for this fresh identity: same format, the stored identity exactly equal (and
   * hashing to the key), every file present with its recorded sha256 and size, and contract-valid events. An invalid
   * entry is evicted. Never computes anything: the caller decides to execute on a miss.
   */
  lookup(key: string, fresh: PreviewIdentity): LookupResult {
    if (!KEY.test(key)) return { hit: false, reason: 'invalid key' };
    const dir = join(this.entriesDir, key);
    if (!existsSync(dir)) {
      this.index.delete(key);
      return { hit: false, reason: null };
    }
    const problem = this.problemOf(key, dir, fresh);
    if (problem) {
      this.evict(key, problem);
      return { hit: false, reason: problem };
    }
    return { hit: true, entry: this.touch(key)! };
  }

  /** What is wrong with an entry for this identity (null: valid). */
  private problemOf(key: string, dir: string, fresh: PreviewIdentity | null): string | null {
    let meta: EntryMeta;
    try {
      meta = JSON.parse(readFileSync(join(dir, 'entry.json'), 'utf8')) as EntryMeta;
    } catch {
      return 'entry.json is missing or corrupt';
    }
    if (meta.schema !== ENTRY_SCHEMA || meta.format !== PREVIEW_CACHE_FORMAT) return `unsupported entry format ${String(meta.format)}`;
    if (meta.key !== key || identityKey(meta.identity) !== key) return 'the stored identity does not hash to its key';
    if (fresh && canonicalJson(fresh) !== canonicalJson(meta.identity)) return 'the identity differs';
    for (const [f, rec] of Object.entries(meta.files ?? {})) {
      const p = join(dir, f);
      if (!existsSync(p)) return `${f} is missing`;
      const data = readFileSync(p);
      if (data.length !== rec.bytes || sha256(data) !== rec.sha256) return `${f} does not match its recorded sha256`;
    }
    for (const required of ['request.json', 'events.json', 'metrics.json', 'provenance.json', 'manifest.json'])
      if (!meta.files?.[required]) return `${required} is not recorded`;
    try {
      const events = (JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8')) as { runId: string; events: unknown }).events;
      const errors = validateEvents(events, meta.previewId, meta.identity.symbols);
      if (errors.length) return `events violate the contract: ${errors[0]}`;
    } catch (e) {
      return `events.json is unreadable: ${(e as Error).message}`;
    }
    return null;
  }

  /** Marks an entry used now (persisted) and returns it; null when absent. */
  touch(key: string): CacheEntry | null {
    const dir = join(this.entriesDir, key);
    if (!existsSync(dir)) return null;
    const lastUsedAt = new Date().toISOString();
    try {
      atomicWrite(join(dir, 'last-used.json'), `${JSON.stringify({ lastUsedAt })}\n`);
    } catch (e) {
      this.log(`preview cache: could not record the use of ${key}: ${(e as Error).message}`);
    }
    const meta = JSON.parse(readFileSync(join(dir, 'entry.json'), 'utf8')) as EntryMeta;
    const bytes = this.index.get(key)?.bytes ?? dirSize(dir);
    this.index.set(key, { bytes, lastUsedAt });
    return { meta, dir, bytes, lastUsedAt };
  }

  /** An entry for serving (detail, events, prices, export, save): its meta and directory, after an integrity check. */
  get(key: string): CacheEntry | null {
    if (!KEY.test(key)) return null;
    const dir = join(this.entriesDir, key);
    if (!existsSync(dir)) return null;
    const problem = this.problemOf(key, dir, null);
    if (problem) {
      this.evict(key, problem);
      return null;
    }
    const meta = JSON.parse(readFileSync(join(dir, 'entry.json'), 'utf8')) as EntryMeta;
    return { meta, dir, bytes: this.index.get(key)?.bytes ?? dirSize(dir), lastUsedAt: this.index.get(key)?.lastUsedAt ?? meta.executedAt };
  }

  /** Reads one artifact file of an entry, verified against entry.json (throws when it no longer matches). */
  readFile(entry: CacheEntry, file: string): Buffer {
    const rec = entry.meta.files[file];
    if (!rec) throw new Error(`${file} is not part of preview ${entry.meta.previewId}`);
    const data = readFileSync(join(entry.dir, file));
    if (data.length !== rec.bytes || sha256(data) !== rec.sha256) {
      this.evict(entry.meta.key, `${file} does not match its recorded sha256`);
      throw new Error(`${file} of preview ${entry.meta.previewId} was modified after it was cached; the entry was evicted`);
    }
    return data;
  }

  /**
   * Commits a verified work directory as the entry of its key: writes manifest.json and entry.json, then renames the
   * directory. If a valid entry for the key already exists (a concurrent commit), it is kept and the work is dropped.
   */
  commit(work: string, meta: Omit<EntryMeta, 'schema' | 'format' | 'files' | 'previewId'>, files: string[]): CacheEntry {
    if (!KEY.test(meta.key) || identityKey(meta.identity) !== meta.key) throw new Error('commit: the identity does not hash to the key');
    const entries = Object.fromEntries(files.map((f) => [f, sha256(readFileSync(join(work, f)))]));
    atomicWrite(join(work, 'manifest.json'), `${JSON.stringify({ sha256: entries }, null, 2)}\n`);
    const all = [...files, 'manifest.json'];
    const full: EntryMeta = {
      schema: ENTRY_SCHEMA,
      format: PREVIEW_CACHE_FORMAT,
      previewId: previewIdOf(meta.key),
      ...meta,
      files: Object.fromEntries(
        all.map((f) => {
          const data = readFileSync(join(work, f));
          return [f, { sha256: sha256(data), bytes: data.length }];
        })
      )
    };
    atomicWrite(join(work, 'entry.json'), `${JSON.stringify(full, null, 2)}\n`);
    const target = join(this.entriesDir, meta.key);
    if (existsSync(target)) {
      if (this.problemOf(meta.key, target, meta.identity) === null) {
        this.dropWork(work);
        return this.touch(meta.key)!;
      }
      this.evict(meta.key, 'replaced by a fresh execution');
    }
    renameSync(work, target);
    const bytes = dirSize(target);
    this.index.set(meta.key, { bytes, lastUsedAt: full.executedAt });
    const entry = this.touch(meta.key)!;
    this.prune(new Set([meta.key]));
    return entry;
  }

  /** Removes one entry (renamed into trash first, so a partial removal never looks like an entry). */
  evict(key: string, reason: string) {
    this.index.delete(key);
    const dir = join(this.entriesDir, key);
    if (!existsSync(dir)) return;
    this.discard(dir, `evicted ${key.slice(0, 12)}…: ${reason}`);
  }

  private discard(dir: string, why: string) {
    const t = join(this.trashDir, `${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`);
    try {
      renameSync(dir, t);
      rmSync(t, { recursive: true, force: true });
    } catch {
      rmSync(dir, { recursive: true, force: true });
    }
    this.log(`preview cache: ${why}`);
  }

  /**
   * Enforces the limits: least recently used first (lastUsedAt ascending, then key), never a protected key (the entry
   * just committed or displayed). Deterministic for a given index. Returns the evicted keys.
   */
  prune(protect: ReadonlySet<string> = new Set()): string[] {
    const order = [...this.index.entries()].sort(
      ([ka, a], [kb, b]) => (a.lastUsedAt < b.lastUsedAt ? -1 : a.lastUsedAt > b.lastUsedAt ? 1 : ka < kb ? -1 : 1)
    );
    let count = order.length;
    let bytes = order.reduce((n, [, v]) => n + v.bytes, 0);
    const evicted: string[] = [];
    for (const [key, v] of order) {
      if (count <= this.limits.maxEntries && bytes <= this.limits.maxBytes) break;
      if (protect.has(key)) continue;
      this.evict(key, 'least recently used (cache limits)');
      evicted.push(key);
      count--;
      bytes -= v.bytes;
    }
    return evicted;
  }

  status() {
    const list = [...this.index.entries()].map(([key, v]) => ({ key, ...v }));
    return {
      dir: this.dir,
      entries: list.length,
      bytes: list.reduce((n, e) => n + e.bytes, 0),
      limits: this.limits,
      oldestUse: list.map((e) => e.lastUsedAt).sort()[0] ?? null,
      newestUse: list.map((e) => e.lastUsedAt).sort().at(-1) ?? null
    };
  }

  /** Checks every entry's integrity (format, key, files, events) without a fresh identity; evicts the broken ones. */
  verifyAll(): { checked: number; evicted: { key: string; reason: string }[] } {
    const evicted: { key: string; reason: string }[] = [];
    let checked = 0;
    for (const key of readdirSync(this.entriesDir)) {
      checked++;
      const problem = KEY.test(key) ? this.problemOf(key, join(this.entriesDir, key), null) : 'not a cache key';
      if (problem) {
        evicted.push({ key, reason: problem });
        if (KEY.test(key)) this.evict(key, problem);
        else this.discard(join(this.entriesDir, key), `removed ${key}: ${problem}`);
      }
    }
    return { checked, evicted };
  }

  /** Removes every entry (the cache directory itself, its marker and running work are kept). */
  clear(): number {
    const keys = readdirSync(this.entriesDir);
    for (const key of keys) {
      if (KEY.test(key)) this.evict(key, 'cleared');
      else this.discard(join(this.entriesDir, key), `removed ${key} (cleared)`);
    }
    this.index.clear();
    return keys.length;
  }

  keys(): string[] {
    return [...this.index.keys()];
  }
}
