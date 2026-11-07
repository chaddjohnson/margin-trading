// The trial archive (PROTOCOL.md §3.2): an indexed SQLite file (node:sqlite) per job, with a bounded LRU of compact
// records in front and a bounded write buffer behind (committed every `commitRows` rows or `commitMs`). Memory never
// holds the archive: a record is looked up by key, and the LRU only decides what is kept in memory, never what is
// computed (an evicted record is read back from disk byte for byte). The file is bound to its namespace (study, door,
// data, engine digest); opening it under another binding is refused, so no cache crosses doors, studies or attempts.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const encode = (value: unknown) =>
  JSON.stringify(value, (_k, v) =>
    typeof v === 'number' && !Number.isFinite(v) ? (Number.isNaN(v) ? '__NaN' : v > 0 ? '__Inf' : '__-Inf') : v
  );
const decode = <T>(text: string): T =>
  JSON.parse(text, (_k, v) => (v === '__NaN' ? NaN : v === '__Inf' ? Infinity : v === '__-Inf' ? -Infinity : v)) as T;

export { decode, encode };

export class Lru<V> {
  private readonly map = new Map<string, V>();
  hits = 0;
  misses = 0;
  evictions = 0;

  constructor(readonly capacity: number) {}

  get(key: string) {
    const v = this.map.get(key);

    if (v === undefined) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  set(key: string, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);

    while (this.map.size > this.capacity) {
      this.map.delete(this.map.keys().next().value!);
      this.evictions++;
    }
  }

  get size() {
    return this.map.size;
  }
}

export interface StoreOptions {
  binding: Record<string, string>; // namespace: refuses a file bound to anything else
  lruCapacity: number;
  commitRows: number;
  commitMs: number;
  readOnly?: boolean;
}

export class Store {
  private readonly db: DatabaseSync;
  private readonly lru: Lru<unknown>;
  private pending = new Map<string, { table: string; json: string; value: unknown }>();
  private lastCommit = Date.now();
  private readonly put: Record<string, ReturnType<DatabaseSync['prepare']>>;
  private readonly get_: Record<string, ReturnType<DatabaseSync['prepare']>>;
  inserted = 0;
  diskReads = 0;
  commits = 0;

  constructor(
    readonly file: string,
    private readonly options: StoreOptions
  ) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file, options.readOnly ? { readOnly: true } : {});

    if (!options.readOnly) {
      this.db.exec('PRAGMA journal_mode = WAL');
      this.db.exec('PRAGMA synchronous = NORMAL');
    }

    this.db.exec('PRAGMA cache_size = -32768'); // 32 MiB page cache (bounded)

    if (!options.readOnly) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS points (key TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS configs (key TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS fits (key TEXT PRIMARY KEY, json TEXT NOT NULL);`);
    }

    const meta = Object.fromEntries(
      (this.db.prepare('SELECT k, v FROM meta').all() as { k: string; v: string }[]).map((r) => [r.k, r.v])
    );

    if (Object.keys(meta).length === 0) {
      if (options.readOnly) throw new Error(`${file}: no namespace binding`);
      const ins = this.db.prepare('INSERT INTO meta (k, v) VALUES (?, ?)');

      for (const [k, v] of Object.entries(options.binding)) ins.run(k, v);
    } else {
      for (const [k, v] of Object.entries(options.binding))
        if (meta[k] !== v) throw new Error(`${file}: bound to ${k} = ${meta[k]}, refused for ${v}`);
    }

    this.lru = new Lru(options.lruCapacity);
    this.put = Object.fromEntries(
      ['points', 'configs', 'fits'].map((t) => [
        t,
        this.db.prepare(`INSERT OR IGNORE INTO ${t} (key, json) VALUES (?, ?)`)
      ])
    );
    this.get_ = Object.fromEntries(
      ['points', 'configs', 'fits'].map((t) => [t, this.db.prepare(`SELECT json FROM ${t} WHERE key = ?`)])
    );
  }

  private k(table: string, key: string) {
    return `${table}:${key}`;
  }

  read<T>(table: 'points' | 'configs' | 'fits', key: string): T | undefined {
    const k = this.k(table, key);
    const cached = this.lru.get(k);

    if (cached !== undefined) return cached as T;

    const p = this.pending.get(k);

    if (p) return p.value as T;

    const row = this.get_[table]!.get(key) as { json: string } | undefined;

    if (!row) return undefined;

    this.diskReads++;
    const value = decode<T>(row.json);

    this.lru.set(k, value);
    return value;
  }

  write(table: 'points' | 'configs' | 'fits', key: string, value: unknown) {
    const k = this.k(table, key);

    if (this.pending.has(k)) return;
    this.pending.set(k, { table, json: encode(value), value });
    this.lru.set(k, value);
    if (this.pending.size >= this.options.commitRows || Date.now() - this.lastCommit >= this.options.commitMs)
      this.commit();
  }

  commit() {
    if (this.pending.size === 0) {
      this.lastCommit = Date.now();
      return;
    }

    this.db.exec('BEGIN');
    try {
      for (const [k, p] of this.pending) {
        const r = this.put[p.table]!.run(k.slice(p.table.length + 1), p.json);

        this.inserted += Number(r.changes);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    this.commits++;
    this.pending = new Map();
    this.lastCommit = Date.now();
  }

  count(table: 'points' | 'configs' | 'fits') {
    return Number((this.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n);
  }

  // Bounded iteration in key order (exports and checkpoint reloads never load a table at once).
  *iterate<T>(table: 'points' | 'configs' | 'fits', batch = 2000): Generator<[string, T]> {
    let after = '';

    for (;;) {
      const rows = this.db
        .prepare(`SELECT key, json FROM ${table} WHERE key > ? ORDER BY key LIMIT ?`)
        .all(after, batch) as { key: string; json: string }[];

      if (rows.length === 0) return;
      for (const row of rows) yield [row.key, decode<T>(row.json)];
      after = rows.at(-1)!.key;
    }
  }

  stats() {
    return {
      lruSize: this.lru.size,
      lruCapacity: this.lru.capacity,
      lruHits: this.lru.hits,
      lruMisses: this.lru.misses,
      lruEvictions: this.lru.evictions,
      pending: this.pending.size,
      inserted: this.inserted,
      diskReads: this.diskReads,
      commits: this.commits
    };
  }

  close() {
    if (!this.options.readOnly) {
      this.commit();
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    }
    this.db.close();
  }
}
