// Read-only audit of a Strategy Lab state directory, for before/after checks of a migration:
//
//   node --experimental-transform-types apps/strategy-lab/scripts/audit-state.ts <state dir> [--json]
//
// Prints (or writes as JSON) the row counts, every run's and variation's IMMUTABLE columns hashed per row (and their
// editable annotations: title, bookmark), the strategy rows, notes, migrations, PRAGMA foreign_key_check and
// integrity_check, and verifies every completed run's events.json against the database sha256 and its manifest.json.
// It opens the database read-only and never applies migrations (so it can audit a database before migrating it).

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: audit-state.ts <state dir> [--json]');
  process.exit(2);
}
const db = new DatabaseSync(join(dir, 'strategy-lab.sqlite'), { readOnly: true });
const h = (o: unknown) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const all = (sql: string) => db.prepare(sql).all() as Record<string, unknown>[];
const tables = all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map((r) => String(r.name));
const count = (t: string) => (tables.includes(t) ? Number((db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n) : null);

// The immutable columns as of migration 0001 (a later migration may ADD columns; these never change).
const RUN_IMMUTABLE = ['public_id', 'variation_id', 'kind', 'status', 'data_origin', 'symbols_json', 'window_from', 'window_to', 'resolution', 'partition', 'params_json', 'assumptions_json', 'request_json', 'price_source_json', 'provenance_json', 'code_revision_json', 'metrics_json', 'event_count', 'artifact_dir', 'artifact_sha256', 'error', 'created_at', 'started_at', 'completed_at'];
const VARIATION_IMMUTABLE = ['public_id', 'strategy_id', 'experiment_id', 'params_json', 'params_canonical', 'origin', 'parent_variation_id', 'created_at'];

const runs = all('SELECT * FROM runs ORDER BY id').map((r) => ({
  id: String(r.public_id),
  immutable: h(RUN_IMMUTABLE.map((k) => r[k])),
  title: r.title,
  bookmarked: r.bookmarked_at !== null,
  phenotype: 'phenotype_id' in r ? r.phenotype_id : undefined
}));
const variations = all('SELECT * FROM variations ORDER BY id').map((v) => ({
  id: String(v.public_id),
  immutable: h(VARIATION_IMMUTABLE.map((k) => v[k])),
  title: v.title,
  bookmarked: v.bookmarked_at !== null
}));
const strategies = all('SELECT * FROM strategies ORDER BY id').map((s) => ({
  id: s.public_id,
  key: s.key,
  version: s.version,
  title: s.title,
  formerTitle: s.former_title ?? null,
  runnable: s.runnable,
  schema: typeof s.param_schema_json === 'string' ? (s.param_schema_json.startsWith('[') ? 'v1 (ParamSpec[])' : `v${JSON.parse(s.param_schema_json).schemaVersion}`) : null,
  schemaSha256: typeof s.param_schema_json === 'string' ? h(s.param_schema_json) : null
}));
const artifacts = all("SELECT public_id, artifact_dir, artifact_sha256, event_count FROM runs WHERE status = 'completed' ORDER BY id").map((r) => {
  const d = join(dir, String(r.artifact_dir));
  const events = readFileSync(join(d, 'events.json'));
  const eventsOk = createHash('sha256').update(events).digest('hex') === r.artifact_sha256;
  const manifestFile = join(d, 'manifest.json');
  const manifest = existsSync(manifestFile) ? (JSON.parse(readFileSync(manifestFile, 'utf8')).sha256 as Record<string, string>) : {};
  const bad = Object.entries(manifest).filter(([f, sha]) => createHash('sha256').update(readFileSync(join(d, f))).digest('hex') !== sha).map(([f]) => f);
  return { id: r.public_id, eventsOk, eventCount: (JSON.parse(events.toString('utf8')).events as unknown[]).length === Number(r.event_count), manifestFiles: Object.keys(manifest).length, manifestMismatches: bad };
});
const report = {
  counts: Object.fromEntries(['experiments', 'strategies', 'variations', 'runs', 'run_symbols', 'notes', 'optimization_batches', 'optimization_trials', 'phenotype_imports', 'phenotypes', 'schema_migrations'].map((t) => [t, count(t)])),
  bookmarks: { runs: runs.filter((r) => r.bookmarked).length, variations: variations.filter((v) => v.bookmarked).length },
  migrations: all('SELECT version, name, sha256 FROM schema_migrations ORDER BY version'),
  triggers: all("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").map((r) => r.name),
  foreignKeyCheck: all('PRAGMA foreign_key_check'),
  integrity: all('PRAGMA integrity_check').map((r) => r.integrity_check),
  strategies,
  runsHash: h(runs.map((r) => [r.id, r.immutable])),
  variationsHash: h(variations.map((v) => [v.id, v.immutable])),
  annotationsHash: h([runs.map((r) => [r.id, r.title, r.bookmarked]), variations.map((v) => [v.id, v.title, v.bookmarked])]),
  notesHash: h(all('SELECT * FROM notes ORDER BY id')),
  artifacts: {
    completed: artifacts.length,
    eventsVerified: artifacts.filter((a) => a.eventsOk && a.eventCount).length,
    manifestMismatches: artifacts.filter((a) => a.manifestMismatches.length).map((a) => a.id)
  },
  runs,
  variations
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 1));
else {
  const summary = Object.fromEntries(Object.entries(report).filter(([k]) => k !== 'runs' && k !== 'variations'));
  console.log(JSON.stringify(summary, null, 1));
}
