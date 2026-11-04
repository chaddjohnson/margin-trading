// Migration 0002 (Growth display name, version-2 parameter schemas, phenotype catalogue) on a REAL-SHAPED prior
// database: migration 0001 only, the four strategy rows exactly as the live database stored them before 0002
// (tests/fixtures/strategies-0001.json: the signal-only strategy, Growth 1.0.0 with its old title and v1 schema, the
// synthetic demo, the imported Study 8 pool), and variations/runs/run_symbols/notes/bookmarks shaped like the live
// ones (the same canonical identity strings). Checks: the frozen SQL equals its generator (schemas = the registry);
// counts, ids, immutable columns, titles, notes and bookmarks unchanged; strategy display metadata migrated; foreign
// keys and integrity clean; the new immutability triggers; idempotent re-open; a failing migration rolls back.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import { schemaOf } from '../shared/params.ts';
import { RISE_FROM_RECENT_LOW, RISE_FROM_RECENT_LOW_TRADING_1_0_0, STUDY8_POOL } from '../shared/strategies.ts';
import { migrate, migrationFiles, openDb } from '../server/db.ts';
import { Repo } from '../server/repo.ts';

const APP = join(import.meta.dirname, '..');
const MIGRATIONS = join(APP, 'server', 'migrations');
const h = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fixture = JSON.parse(readFileSync(join(APP, 'tests/fixtures/strategies-0001.json'), 'utf8')) as {
  rows: { key: string; version: string; title: string; kind: string; runnable: number; description: string; param_schema_json: string | null; source_ref: string }[];
};

/** A database at migration 0001 with live-shaped rows. */
function priorDatabase() {
  const dir = mkdtempSync(join(tmpdir(), 'strategy-lab-migration-'));
  const only1 = join(dir, 'migrations-0001');
  mkdirSync(only1);
  copyFileSync(join(MIGRATIONS, '0001_init.sql'), join(only1, '0001_init.sql'));
  const file = join(dir, 'strategy-lab.sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db, only1);
  const t = '2026-11-04T12:00:00.000Z';
  const ins = (sql: string, ...args: (string | number | null)[]) => db.prepare(sql).run(...args);
  [['demo', 'Demo (synthetic data)'], ['study8-imports', 'Study 8 imports'], ['growth-entry-discovery', 'Growth Entry Discovery']].forEach(([slug, title], i) =>
    ins('INSERT INTO experiments (id, public_id, slug, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)', i + 1, `E-000${i + 1}`, slug!, title!, '', t)
  );
  fixture.rows.forEach((s, i) =>
    ins(
      `INSERT INTO strategies (id, public_id, key, version, title, kind, runnable, description, param_schema_json, source_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      i + 1, `S-000${i + 1}`, s.key, s.version, s.title, s.kind, s.runnable, s.description, s.param_schema_json, s.source_ref, t
    )
  );
  const variations: [number, number, string, string, string][] = [
    [1, 1, 'V1 · 5% rebound from the 20-session low', 'demo-rebound-5-from-20-low', 'demo'],
    [2, 2, 'Study 8 #2 VG balanced — VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d', 'VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d', 'import'],
    [3, 3, 'X 5% · N 20 bars · 1d', '{"advanceFromRecentLowPercent":5,"recentLowLookbackBars":20}|1d', 'manual'],
    [4, 4, 'Trading · X 5% · N 90 bars · 1d · stop 7.3% · hold off · buffer off · 5 bps',
      '{"advanceFromRecentLowPercent":5,"costBpsPerSide":5,"intradayLossBufferEnabled":false,"intradayLossBufferPercent":2.9,"maximumHoldDays":8,"maximumHoldEnabled":false,"recentLowLookbackBars":90,"trailingStopPercent":7.3}|1d', 'manual']
  ];
  for (const [id, strategy, title, canonical, origin] of variations)
    ins(
      `INSERT INTO variations (id, public_id, strategy_id, experiment_id, title, params_json, params_canonical, origin, parent_variation_id, created_at, bookmarked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      id, `V-00000${id}`, strategy, strategy === 1 ? 1 : strategy === 2 ? 2 : 3, title, '[]', canonical, origin, t, id === 3 ? t : null
    );
  const runKinds = ['demo', 'import', 'manual', 'manual'];
  for (let id = 1; id <= 4; id++) {
    ins(
      `INSERT INTO runs (id, public_id, variation_id, title, kind, status, data_origin, symbols_json, window_from, window_to, resolution,
         partition, params_json, assumptions_json, request_json, price_source_json, provenance_json, code_revision_json, metrics_json,
         event_count, artifact_dir, artifact_sha256, created_at, queued_at, started_at, completed_at, bookmarked_at)
       VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, '2016-01-04', '2023-12-29', '1d', 'training', '[]', '[]', ?, '{"kind":"market","basisDate":"2016-01-04"}',
         '{}', NULL, '{}', 3, ?, ?, ?, ?, ?, ?, ?)`,
      id, `R-00000${id}`, id, `user title ${id}`, runKinds[id - 1]!, id === 1 ? 'synthetic' : 'real', id === 2 ? '["GDX","VGT"]' : '["VGT"]',
      id >= 3 ? JSON.stringify({ strategyKey: fixture.rows[id - 1]!.key, strategyVersion: '1.0.0' }) : null,
      `runs/R-00000${id}`, 'a'.repeat(64), t, t, t, t, id === 4 ? t : null
    );
    ins('INSERT INTO run_symbols (run_id, symbol) VALUES (?, ?)', id, 'VGT');
  }
  ins('INSERT INTO run_symbols (run_id, symbol) VALUES (?, ?)', 2, 'GDX');
  ins("INSERT INTO notes (target_type, target_id, body, created_at, updated_at) VALUES ('run', 4, 'my own note', ?, ?)", t, t);
  db.close();
  return { dir, file };
}

const RUN_IMMUTABLE = ['public_id', 'variation_id', 'kind', 'status', 'data_origin', 'symbols_json', 'window_from', 'window_to', 'resolution', 'partition', 'params_json', 'assumptions_json', 'request_json', 'price_source_json', 'provenance_json', 'code_revision_json', 'metrics_json', 'event_count', 'artifact_dir', 'artifact_sha256', 'created_at', 'started_at', 'completed_at'];
function audit(file: string) {
  const db = new DatabaseSync(file, { readOnly: true });
  const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[];
  const out = {
    counts: Object.fromEntries(['experiments', 'strategies', 'variations', 'runs', 'run_symbols', 'notes'].map((t) => [t, all(`SELECT count(*) AS n FROM ${t}`)[0]!.n])),
    runs: all('SELECT * FROM runs ORDER BY id').map((r) => [r.public_id, h(RUN_IMMUTABLE.map((k) => r[k])), r.title, r.bookmarked_at]),
    variations: all('SELECT * FROM variations ORDER BY id').map((v) => [v.public_id, v.params_canonical, v.params_json, v.title, v.bookmarked_at, v.strategy_id]),
    notes: all('SELECT * FROM notes ORDER BY id'),
    strategies: all('SELECT * FROM strategies ORDER BY id'),
    fk: all('PRAGMA foreign_key_check'),
    integrity: all('PRAGMA integrity_check')[0]!.integrity_check,
    migrations: all('SELECT version, name FROM schema_migrations ORDER BY version')
  };
  db.close();
  return out;
}

describe('migration 0002', () => {
  it('the frozen SQL equals its generator: the stored schemas are the registry’s (legacy versions never drift)', () => {
    const generated = execFileSync(
      process.execPath,
      ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', join(APP, 'scripts/generate-migration-0002.ts')],
      { encoding: 'utf8' }
    );
    expect(generated).toBe(readFileSync(join(MIGRATIONS, '0002_growth_schema_phenotypes.sql'), 'utf8'));
    expect(migrationFiles(MIGRATIONS).map((m) => m.name)).toEqual(['0001_init.sql', '0002_growth_schema_phenotypes.sql']);
  });

  it('on a real-shaped 0001 database: counts, ids, immutable columns, titles, notes and bookmarks unchanged', () => {
    const { file } = priorDatabase();
    const before = audit(file);
    const db = openDb(file); // applies 0002 in one transaction
    db.close();
    const after = audit(file);
    expect(after.migrations.map((m) => m.name)).toEqual(['0001_init.sql', '0002_growth_schema_phenotypes.sql']);
    expect(after.counts).toEqual(before.counts);
    expect(after.runs).toEqual(before.runs);
    expect(after.variations).toEqual(before.variations);
    expect(after.notes).toEqual(before.notes);
    expect(after.fk).toEqual([]);
    expect(after.integrity).toBe('ok');
    // strategy display metadata: Growth (former title kept), v2 schemas equal to the registry
    const s = (key: string) => after.strategies.find((x) => x.key === key)!;
    expect(s('rise-from-recent-low-trading')).toMatchObject({
      title: 'Growth',
      former_title: 'Rise from recent low (trading backtest)',
      version: '1.0.0',
      public_id: 'S-0004'
    });
    expect(JSON.parse(String(s('rise-from-recent-low-trading').param_schema_json))).toEqual(schemaOf(RISE_FROM_RECENT_LOW_TRADING_1_0_0));
    expect(JSON.parse(String(s('rise-from-recent-low').param_schema_json))).toEqual(schemaOf(RISE_FROM_RECENT_LOW));
    expect(s('rise-from-recent-low').title).toBe('Rise from recent low (entry signal)'); // the signal-only one is not renamed
    expect(s('study8-d1-pool').description).toBe(STUDY8_POOL.description);
    for (const x of after.strategies) expect(JSON.parse(String(x.param_schema_json)).schemaVersion).toBe(2);
    // the run detail reads the migrated schema and the display name
    const repo = new Repo(openDb(file));
    const legacy = repo.runDetail('R-000004')!;
    expect(legacy.strategy).toMatchObject({ title: 'Growth', version: '1.0.0' });
    expect(legacy.strategyFormerTitle).toBe('Rise from recent low (trading backtest)');
    expect(legacy.paramSchema!.identity).toBe('all-values');
    expect(legacy.title).toBe('user title 4'); // user-authored titles untouched
    repo.db.close();
  });

  it('is idempotent and adds immutable, undeletable phenotype tables; run.phenotype_id is an immutable input', () => {
    const { file } = priorDatabase();
    openDb(file).close();
    const once = audit(file);
    openDb(file).close();
    expect(audit(file)).toEqual(once);
    const db = openDb(file);
    db.prepare(
      "INSERT INTO phenotype_imports (id, public_id, study_ref, source_path, source_sha256, manifest_json, checks_json, imported_at) VALUES (1, 'PI-0001', 's', 'p', 'x', '{}', '[]', 't')"
    ).run();
    db.prepare(
      `INSERT INTO phenotypes (id, public_id, phenotype_key, name, import_id, study_ref, strategy_key, strategy_version, execution_kind, symbols_json, record_json, record_sha256, created_at)
       VALUES (1, 'PH-0001', 'k', 'n', 1, 's', 'rise-from-recent-low-trading', '1.1.0', 'standalone', '["VGT"]', '{}', 'h', 't')`
    ).run();
    expect(() => db.prepare("UPDATE phenotypes SET name = 'x' WHERE id = 1").run()).toThrow(/frozen/);
    expect(() => db.prepare('DELETE FROM phenotypes WHERE id = 1').run()).toThrow(/never deleted/);
    expect(() => db.prepare("UPDATE phenotype_imports SET study_ref = 'x'").run()).toThrow(/immutable/);
    expect(() => db.prepare('UPDATE runs SET phenotype_id = 1 WHERE id = 1').run()).toThrow(/run inputs are immutable/);
    expect(() => db.prepare("UPDATE runs SET params_json = '[1]' WHERE id = 1").run()).toThrow(/run inputs are immutable/);
    expect(() => db.prepare('INSERT INTO phenotypes (id, public_id, phenotype_key, name, import_id, study_ref, strategy_key, strategy_version, execution_kind, symbols_json, record_json, record_sha256, created_at) VALUES (2, \'PH-0002\', \'k2\', \'n\', 1, \'s\', \'x\', \'1\', \'pool\', \'[]\', \'{}\', \'h\', \'t\')').run()).toThrow(/CHECK/);
    db.prepare("UPDATE runs SET title = 'renamed' WHERE id = 1").run(); // annotations stay editable
    db.close();
  });

  it('a failing migration rolls back completely and leaves the database usable at the previous version', () => {
    const { dir, file } = priorDatabase();
    const bad = join(dir, 'migrations-bad');
    mkdirSync(bad);
    copyFileSync(join(MIGRATIONS, '0001_init.sql'), join(bad, '0001_init.sql'));
    const sql = readFileSync(join(MIGRATIONS, '0002_growth_schema_phenotypes.sql'), 'utf8');
    writeFileSync(join(bad, '0002_growth_schema_phenotypes.sql'), `${sql}\nSELECT RAISE(ABORT, 'injected failure');\n`.replace('SELECT RAISE(ABORT', 'INSERT INTO no_such_table VALUES (1); SELECT RAISE(ABORT'));
    const before = audit(file);
    const db = new DatabaseSync(file);
    expect(() => migrate(db, bad)).toThrow();
    db.close();
    const after = audit(file);
    expect(after).toEqual(before);
    expect(after.strategies.find((s) => s.key === 'rise-from-recent-low-trading')!.title).toBe('Rise from recent low (trading backtest)');
  });
});
