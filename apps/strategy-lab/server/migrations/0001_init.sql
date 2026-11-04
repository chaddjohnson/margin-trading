-- Strategy Lab schema, migration 0001. Times are ISO 8601 UTC strings with milliseconds ("…Z"), so they sort as text.
-- Public identifiers (E-0001, S-0001, V-000001, R-000001, OB-0001) are derived from the integer primary key and never
-- change; titles, notes and bookmarks are editable annotations that never touch execution facts.

CREATE TABLE experiments (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE strategies (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('entry_signal', 'trades')),
  runnable INTEGER NOT NULL CHECK (runnable IN (0, 1)),
  description TEXT NOT NULL DEFAULT '',
  param_schema_json TEXT,
  source_ref TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (key, version)
);

-- A variation is one immutable parameter configuration of one strategy version, within an experiment.
CREATE TABLE variations (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  strategy_id INTEGER NOT NULL REFERENCES strategies (id),
  experiment_id INTEGER NOT NULL REFERENCES experiments (id),
  title TEXT NOT NULL,
  params_json TEXT NOT NULL,
  params_canonical TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('manual', 'import', 'demo')),
  parent_variation_id INTEGER REFERENCES variations (id),
  created_at TEXT NOT NULL,
  bookmarked_at TEXT,
  UNIQUE (strategy_id, experiment_id, params_canonical)
);

-- A run is one execution (or one import) of a variation. Running a variation again creates a new run.
CREATE TABLE runs (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  variation_id INTEGER NOT NULL REFERENCES variations (id),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('manual', 'import', 'demo')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  data_origin TEXT NOT NULL CHECK (data_origin IN ('real', 'synthetic')),
  symbols_json TEXT NOT NULL,
  window_from TEXT NOT NULL,
  window_to TEXT NOT NULL,
  resolution TEXT,
  partition TEXT,
  params_json TEXT NOT NULL,
  assumptions_json TEXT NOT NULL,
  request_json TEXT,
  price_source_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL DEFAULT '{}',
  code_revision_json TEXT,
  metrics_json TEXT,
  event_count INTEGER,
  artifact_dir TEXT,
  artifact_sha256 TEXT,
  error TEXT,
  progress_json TEXT,
  created_at TEXT NOT NULL,
  queued_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  bookmarked_at TEXT
);

CREATE INDEX runs_by_variation ON runs (variation_id);
CREATE INDEX runs_by_result_time ON runs (coalesce(completed_at, created_at));
CREATE INDEX runs_by_status ON runs (status);

CREATE TABLE run_symbols (
  run_id INTEGER NOT NULL REFERENCES runs (id),
  symbol TEXT NOT NULL,
  PRIMARY KEY (run_id, symbol)
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('run', 'variation')),
  target_id INTEGER NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 20000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX notes_by_target ON notes (target_type, target_id);

-- Read-only history imported from Claude/CLI optimisation studies (never launched from Strategy Lab).
CREATE TABLE optimization_batches (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  experiment_id INTEGER REFERENCES experiments (id),
  title TEXT NOT NULL,
  study_ref TEXT NOT NULL,
  methodology_ref TEXT,
  source_path TEXT NOT NULL,
  source_sha256 TEXT NOT NULL UNIQUE,
  summary_json TEXT NOT NULL DEFAULT '{}',
  imported_at TEXT NOT NULL
);

CREATE TABLE optimization_trials (
  id INTEGER PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES optimization_batches (id),
  trial_key TEXT NOT NULL,
  variation_id INTEGER REFERENCES variations (id),
  run_id INTEGER REFERENCES runs (id),
  params_json TEXT NOT NULL,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  role TEXT,
  rank INTEGER,
  UNIQUE (batch_id, trial_key)
);

-- Execution facts are immutable: enforced here, not only in application code.
CREATE TRIGGER variations_immutable
BEFORE UPDATE OF strategy_id, experiment_id, params_json, params_canonical, origin, parent_variation_id, created_at
ON variations
BEGIN
  SELECT RAISE(ABORT, 'variation parameters are immutable: create a new variation');
END;

CREATE TRIGGER variations_no_delete BEFORE DELETE ON variations
BEGIN
  SELECT RAISE(ABORT, 'variations are never deleted');
END;

CREATE TRIGGER runs_inputs_immutable
BEFORE UPDATE OF variation_id, kind, data_origin, symbols_json, window_from, window_to, resolution, partition,
  params_json, assumptions_json, request_json, created_at
ON runs
BEGIN
  SELECT RAISE(ABORT, 'run inputs are immutable: start a new run');
END;

CREATE TRIGGER runs_results_immutable
BEFORE UPDATE OF status, price_source_json, provenance_json, code_revision_json, metrics_json, event_count, artifact_dir,
  artifact_sha256, error, progress_json, queued_at, started_at, completed_at
ON runs
WHEN OLD.status IN ('completed', 'failed', 'cancelled')
BEGIN
  SELECT RAISE(ABORT, 'a finished run is immutable');
END;

CREATE TRIGGER runs_no_delete BEFORE DELETE ON runs
BEGIN
  SELECT RAISE(ABORT, 'runs are never deleted');
END;
