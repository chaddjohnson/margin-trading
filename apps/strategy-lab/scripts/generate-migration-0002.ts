// Generated server/migrations/0002_growth_schema_phenotypes.sql ONCE (2026-11-04) from the registry. An applied migration
// never changes (server/db.ts refuses an edited one); tests/migration.test.ts checks that this script still reproduces
// the file byte for byte, i.e. that the frozen schemas equal the registry.
//   node --experimental-transform-types scripts/generate-migration-0002.ts > server/migrations/0002_growth_schema_phenotypes.sql
import { schemaOf } from '../shared/params.ts';
import { DEMO_TOY_RULES, RISE_FROM_RECENT_LOW, RISE_FROM_RECENT_LOW_TRADING_1_0_0, STUDY8_POOL } from '../shared/strategies.ts';
const q = (x: string) => `'${x.replaceAll("'", "''")}'`;
const j = (s: Parameters<typeof schemaOf>[0]) => q(JSON.stringify(schemaOf(s)));
const out = `-- Strategy Lab migration 0002 (2026-11-04, Task 10). Display metadata, the version-2 parameter schema of the stored
-- strategy rows, and the frozen phenotype catalogue. It changes NO run or variation column and no artifact: runs keep
-- their immutable inputs, results, hashes and provenance; variations keep their parameters and identities.
--
-- 1. "Growth": the display name of rise-from-recent-low-trading (key and version unchanged). The pre-rename title is
--    kept in strategies.former_title. Only the 1.0.0 row exists before this migration; 1.1.0 rows are created by the
--    server from the registry (shared/strategies.ts) with the new name.
-- 2. strategies.param_schema_json → the version-2 schema object (shared/contract.ts ParamSchema) of each registered
--    version, generated from the registry and frozen here (tests/migration.test.ts pins them to the registry).
-- 3. Phenotype catalogue: phenotype_imports (one validated import manifest each) and phenotypes (frozen executable
--    configurations), both immutable and never deleted; runs.phenotype_id links a rerun to its phenotype and is part of
--    the run's immutable inputs (the inputs trigger is recreated with it).
-- Every statement is conditional or additive, inside the migration's single transaction (server/db.ts migrate).

ALTER TABLE strategies ADD COLUMN former_title TEXT;

UPDATE strategies
SET former_title = title,
    title = ${q(RISE_FROM_RECENT_LOW_TRADING_1_0_0.title)},
    description = ${q(RISE_FROM_RECENT_LOW_TRADING_1_0_0.description)}
WHERE key = 'rise-from-recent-low-trading' AND version = '1.0.0' AND title = 'Rise from recent low (trading backtest)';

-- The pool's description said "Imported, not executable"; it now also has single phenotype reruns (launch 'phenotype').
UPDATE strategies SET description = ${q(STUDY8_POOL.description)}
WHERE key = 'study8-d1-pool' AND version = 'pools-engine'
  AND description = 'D1 books on one funded $100,000 slot (src/study8-runners/, src/portfolio-aware-d1/nbook/). Imported, not executable from Strategy Lab.';

UPDATE strategies SET param_schema_json = ${j(RISE_FROM_RECENT_LOW)}
WHERE key = 'rise-from-recent-low' AND version = '1.0.0';

UPDATE strategies SET param_schema_json = ${j(RISE_FROM_RECENT_LOW_TRADING_1_0_0)}
WHERE key = 'rise-from-recent-low-trading' AND version = '1.0.0';

UPDATE strategies SET param_schema_json = ${j(STUDY8_POOL)}
WHERE key = 'study8-d1-pool' AND version = 'pools-engine';

UPDATE strategies SET param_schema_json = ${j(DEMO_TOY_RULES)}
WHERE key = 'demo-toy-rules' AND version = '1.0.0';

-- One validated import of a phenotype export (apps/strategy-lab/importers/phenotypes.ts).
CREATE TABLE phenotype_imports (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  study_ref TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_sha256 TEXT NOT NULL UNIQUE,
  manifest_json TEXT NOT NULL,
  checks_json TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

-- A frozen phenotype: a named, versioned executable configuration selected by a study and promoted explicitly.
CREATE TABLE phenotypes (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  phenotype_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  import_id INTEGER NOT NULL REFERENCES phenotype_imports (id),
  study_ref TEXT NOT NULL,
  role TEXT,
  rank INTEGER,
  strategy_key TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  execution_kind TEXT NOT NULL CHECK (execution_kind IN ('standalone', 'independent-symbol batch', 'shared-slot pool')),
  runner TEXT,
  symbols_json TEXT NOT NULL,
  resolution TEXT,
  record_json TEXT NOT NULL,
  record_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX phenotypes_by_study ON phenotypes (study_ref);

ALTER TABLE runs ADD COLUMN phenotype_id INTEGER REFERENCES phenotypes (id);

DROP TRIGGER runs_inputs_immutable;

CREATE TRIGGER runs_inputs_immutable
BEFORE UPDATE OF variation_id, kind, data_origin, symbols_json, window_from, window_to, resolution, partition,
  params_json, assumptions_json, request_json, created_at, phenotype_id
ON runs
BEGIN
  SELECT RAISE(ABORT, 'run inputs are immutable: start a new run');
END;

CREATE TRIGGER phenotypes_immutable BEFORE UPDATE ON phenotypes
BEGIN
  SELECT RAISE(ABORT, 'a phenotype is frozen: import a new version');
END;

CREATE TRIGGER phenotypes_no_delete BEFORE DELETE ON phenotypes
BEGIN
  SELECT RAISE(ABORT, 'phenotypes are never deleted');
END;

CREATE TRIGGER phenotype_imports_immutable BEFORE UPDATE ON phenotype_imports
BEGIN
  SELECT RAISE(ABORT, 'a phenotype import is immutable');
END;

CREATE TRIGGER phenotype_imports_no_delete BEFORE DELETE ON phenotype_imports
BEGIN
  SELECT RAISE(ABORT, 'phenotype imports are never deleted');
END;
`;
process.stdout.write(out);
