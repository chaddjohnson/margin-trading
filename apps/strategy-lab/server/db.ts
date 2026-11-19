// SQLite (Node's built-in node:sqlite) with forward-only, checksummed migrations. One process owns the database; it
// runs in WAL mode with foreign keys on and a busy timeout, so a backup tool or the importer CLI can read or write
// concurrently without corrupting it.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export type Db = DatabaseSync;

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

export interface AppliedMigration {
  version: number;
  name: string;
  sha256: string;
  applied_at: string;
}

export function migrationFiles(dir = MIGRATIONS_DIR) {
  return readdirSync(dir)
    .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((f) => {
      const sql = readFileSync(join(dir, f), 'utf8');
      return { version: Number(f.slice(0, 4)), name: f, sql, sha256: createHash('sha256').update(sql).digest('hex') };
    });
}

/** Applies pending migrations in order inside one transaction each; refuses to start if an applied one changed. */
export function migrate(db: Db, dir = MIGRATIONS_DIR): AppliedMigration[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL)`);
  const applied = new Map(
    (
      db
        .prepare('SELECT version, name, sha256, applied_at FROM schema_migrations')
        .all() as unknown as AppliedMigration[]
    ).map((m) => [m.version, m])
  );
  for (const m of migrationFiles(dir)) {
    const done = applied.get(m.version);
    if (done) {
      if (done.sha256 !== m.sha256)
        throw new Error(`migration ${m.name} changed after it was applied (sha256 ${done.sha256} → ${m.sha256})`);
      continue;
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(m.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, sha256, applied_at) VALUES (?, ?, ?, ?)').run(
        m.version,
        m.name,
        m.sha256,
        new Date().toISOString()
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db
    .prepare('SELECT version, name, sha256, applied_at FROM schema_migrations ORDER BY version')
    .all() as unknown as AppliedMigration[];
}

export function openDb(file: string): Db {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  migrate(db);
  return db;
}

/** Runs `fn` in an IMMEDIATE transaction (one writer at a time); re-entrant: an inner call joins the outer one. */
export function tx<T>(db: Db, fn: () => T): T {
  if (db.isTransaction) return fn();
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const now = () => new Date().toISOString();

export const formatPublicId = (prefix: string, id: number, width: number) =>
  `${prefix}-${String(id).padStart(width, '0')}`;

export function parsePublicId(prefix: string, publicId: string): number | null {
  const m = new RegExp(`^${prefix}-(\\d{1,12})$`).exec(publicId);
  return m ? Number(m[1]) : null;
}
