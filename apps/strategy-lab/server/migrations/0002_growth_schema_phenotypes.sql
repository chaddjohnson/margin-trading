-- Strategy Lab migration 0002 (2026-11-04, Task 10). Display metadata, the version-2 parameter schema of the stored
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
    title = 'Growth',
    description = 'Trading backtest. Buys (all-in, one position, $100,000 fixed notional) on each Rise-from-Recent-Low signal while flat, at the next eligible trade after the signal bar completes; signals while invested are recorded as ignored. Exits: the D1 profit-conditional trailing stop, plus (optional) the maximum losing hold and the buffered intraday-loss exit. Re-entry needs only a fresh signal: no lower-price test, loss restriction or reset. (Version 1.0.0, before continuation entries.)'
WHERE key = 'rise-from-recent-low-trading' AND version = '1.0.0' AND title = 'Rise from recent low (trading backtest)';

-- The pool's description said "Imported, not executable"; it now also has single phenotype reruns (launch 'phenotype').
UPDATE strategies SET description = 'D1 books on one funded $100,000 slot (src/study8-runners/, src/portfolio-aware-d1/nbook/). Imported replays, and single reruns of a sealed Study 8 phenotype through the unchanged Study 8 runner. Its configuration is the sealed book vectors, not form parameters.'
WHERE key = 'study8-d1-pool' AND version = 'pools-engine'
  AND description = 'D1 books on one funded $100,000 slot (src/study8-runners/, src/portfolio-aware-d1/nbook/). Imported, not executable from Strategy Lab.';

UPDATE strategies SET param_schema_json = '{"schemaVersion":2,"params":[{"key":"advanceFromRecentLowPercent","label":"Advance from recent low (X)","description":"Minimum rise of the completed bar’s close above the rolling low, in percent. The signal fires on the first bar at or above this level after a bar below it.","type":"number","unit":"percent","default":5,"min":0.1,"max":100,"step":0.1},{"key":"recentLowLookbackBars","label":"Recent-low lookback (N)","description":"Number of completed bars of the selected resolution in the rolling low, the current bar included. Counts bars present in the data (session gaps and missing minutes are not imputed).","type":"integer","unit":"bars","default":20,"min":2,"max":5000,"step":1}],"groups":[],"constraints":[],"identity":"effective"}'
WHERE key = 'rise-from-recent-low' AND version = '1.0.0';

UPDATE strategies SET param_schema_json = '{"schemaVersion":2,"params":[{"key":"advanceFromRecentLowPercent","label":"Advance from recent low (X)","description":"Minimum rise of the completed bar’s close above the rolling low, in percent. The signal fires on the first bar at or above this level after a bar below it.","type":"number","unit":"percent","default":5,"min":0.1,"max":100,"step":0.1,"group":"entry"},{"key":"recentLowLookbackBars","label":"Recent-low lookback (N)","description":"Number of completed bars of the selected resolution in the rolling low, the current bar included. Counts bars present in the data (session gaps and missing minutes are not imputed).","type":"integer","unit":"bars","default":20,"min":2,"max":5000,"step":1,"group":"entry"},{"key":"trailingStopPercent","label":"Trailing stop","description":"Always on. The stop sits this far below the highest price since the fill (raised after each session, never lowered) and is ACTIVE only on sessions where selling at the stop would be profitable after interest; a losing position has no active stop. Fills at the stop price, or at the opening trade after a gap through it.","type":"number","unit":"percent","default":7.3,"min":0.1,"max":50,"step":0.1,"group":"exit"},{"key":"maximumHoldEnabled","label":"Maximum losing hold","description":"From the given calendar-day age, a position whose opening trade shows a net loss (after interest) is sold at the next trade after the open. A profitable position may stay longer. Off: no loss exit at all.","type":"boolean","unit":"text","default":true,"group":"exit"},{"key":"maximumHoldDays","label":"Maximum losing hold age","description":"Calendar days from the fill session’s date (weekends and holidays count).","type":"integer","unit":"days","default":8,"min":1,"max":3650,"step":1,"group":"exit","activeWhen":{"param":"maximumHoldEnabled","equals":true},"whenInactive":"disable"},{"key":"intradayLossBufferEnabled","label":"Buffered intraday-loss exit","description":"Only from the maximum-hold age: sells after the first completed minute whose close puts the net P&L (after interest) at or below −buffer × $100,000, at the next eligible trade. Requires the maximum losing hold.","type":"boolean","unit":"text","default":true,"group":"exit","activeWhen":{"param":"maximumHoldEnabled","equals":true},"whenInactive":"disable"},{"key":"intradayLossBufferPercent","label":"Intraday loss buffer","description":"Percent of the $100,000 invested notional, on net P&L after interest — not a price decline (2.9% = −$2,900).","type":"number","unit":"percent","default":2.9,"min":0,"max":50,"step":0.1,"group":"exit","activeWhen":{"param":"intradayLossBufferEnabled","equals":true},"whenInactive":"disable"},{"key":"costBpsPerSide","label":"Transaction cost per side","description":"Charged on every fill (5 bps = the Study 8 pools convention). No separate commission.","type":"number","unit":"bps","default":5,"min":0,"max":100,"step":0.5,"group":"execution"}],"groups":[{"key":"entry","title":"Entry — Rise from recent low (unchanged scanner)"},{"key":"exit","title":"Exits"},{"key":"execution","title":"Execution"}],"constraints":[{"kind":"requires","id":"buffer-requires-hold","if":{"param":"intradayLossBufferEnabled","equals":true},"then":{"param":"maximumHoldEnabled","equals":true},"message":"Buffered intraday-loss exit: it applies only from the maximum losing-hold age — switch it off, or switch the maximum losing hold on"}],"identity":"all-values"}'
WHERE key = 'rise-from-recent-low-trading' AND version = '1.0.0';

UPDATE strategies SET param_schema_json = '{"schemaVersion":2,"params":[],"groups":[],"constraints":[],"identity":"effective"}'
WHERE key = 'study8-d1-pool' AND version = 'pools-engine';

UPDATE strategies SET param_schema_json = '{"schemaVersion":2,"params":[],"groups":[],"constraints":[],"identity":"effective"}'
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
