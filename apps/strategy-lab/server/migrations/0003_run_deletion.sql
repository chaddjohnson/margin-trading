-- Strategy Lab migration 0003 (2026-11-05): explicit, audited deletion of ONE saved run (DELETE /api/runs/:id,
-- server/delete-run.ts; docs/strategy-lab/OPERATIONS.md §Deleting a saved result).
--
-- Runs stay immutable: the only way to remove a run row is the deletion procedure, which first writes a tombstone in
-- the SAME transaction. The tombstone keeps the minimum needed to stay auditable and to never reuse the id (the next
-- run id is above every live AND deleted id): no results, events, parameters, notes or title. Tombstones are never
-- deleted. Variations, strategies, experiments, phenotypes and optimisation history are never touched by a deletion.

CREATE TABLE run_deletions (
  run_id INTEGER PRIMARY KEY,                -- the deleted run's internal id
  public_id TEXT NOT NULL UNIQUE,            -- R-xxxxxx (never reused)
  state TEXT NOT NULL CHECK (state IN ('deleting', 'deleted')),
  kind TEXT NOT NULL,                        -- manual | import | demo
  summary_json TEXT NOT NULL,                -- strategy key/version, variation id, symbols, window, status, dates, counts
  artifact_dir TEXT,                         -- runs/R-xxxxxx, if it existed
  trash_dir TEXT,                            -- where the artifact directory waited for its purge (null once purged)
  artifacts_purged INTEGER NOT NULL DEFAULT 0 CHECK (artifacts_purged IN (0, 1)),
  requested_at TEXT NOT NULL,
  deleted_at TEXT
);

DROP TRIGGER runs_no_delete;

CREATE TRIGGER runs_no_delete BEFORE DELETE ON runs
WHEN NOT EXISTS (SELECT 1 FROM run_deletions d WHERE d.run_id = OLD.id AND d.state = 'deleting')
BEGIN
  SELECT RAISE(ABORT, 'runs are deleted only by the explicit run deletion procedure (DELETE /api/runs/:id)');
END;

CREATE TRIGGER run_deletions_no_delete BEFORE DELETE ON run_deletions
BEGIN
  SELECT RAISE(ABORT, 'run deletion records are kept');
END;
