# Frozen phenotypes: catalogue, import contract and single reruns

After a Claude/CLI optimisation study has **selected** configurations, Strategy Lab can hold them as **frozen
phenotypes** and run any one of them, one test at a time, on a chosen period — under the correct engine and execution
contract. The browser never starts, resumes or schedules a search; there is no route for one.

## 1. What a phenotype is

A named, versioned, executable configuration with a stable id (`study/phenotype`), frozen once imported:

- the strategy key and version, the **effective** parameters (switches, the continuation method and only its active
  inputs), the bar resolution — or, for a shared-slot pool, the sealed pool configuration (alias, sealed id, config
  file and hash, every book's vector);
- the symbols it was selected for, and its **execution kind**:
  - `standalone` — one symbol, one $100,000 backtest;
  - `independent-symbol batch` — several symbols, one independent $100,000 backtest each, never summed;
  - `shared-slot pool` — ONE allocator replay with ONE shared funded $100,000 slot across its books;
- the engine version and commit, the execution assumptions (notional, interest, costs, stop fills, capital model);
- the study's origin: id, kind, role, rank, selection method and metrics, the selection and test windows and the data
  exposure; the import manifest and the record's sha256.

Rows in `phenotypes` and `phenotype_imports` (migration 0002) are immutable and never deleted (SQLite triggers). A
changed configuration is a new id or a new record version.

## 2. The export contract a study emits (`strategy-lab.phenotype-export` v1)

A directory with two files (types and checks: `apps/strategy-lab/shared/phenotypes.ts`; writer:
`apps/strategy-lab/importers/phenotype-export.ts`):

```json
// MANIFEST.json
{ "schema": "strategy-lab.phenotype-export-manifest", "schemaVersion": 1,
  "files": { "phenotypes.json": "<sha256 of the file>" } }
```

```json
// phenotypes.json (one record shown, abbreviated)
{
  "schema": "strategy-lab.phenotype-export", "schemaVersion": 1,
  "study": { "id": "growth-continuation-2027-01", "title": "…", "kind": "optimisation",
             "protocol": { "path": "research/<study>/PROTOCOL.md", "sha256": "…" },
             "methodology": "docs/strategy-lab/STUDY8_METHODOLOGY.md",
             "sealedRecords": [{ "path": "research/<study>/FROZEN_SELECTION.json", "sha256": "…" }],
             "dataExposure": "which dates the study had inspected" },
  "generatedAt": "…", "generator": { "tool": "…", "commit": "…" },
  "phenotypes": [{
    "id": "growth-continuation-2027-01/vgt-balanced", "version": 1, "name": "…",
    "role": "balanced", "rank": 2,
    "strategy": { "key": "rise-from-recent-low-trading", "version": "1.1.0" },
    "executionKind": "standalone", "symbols": ["VGT"],
    "params": { "advanceFromRecentLowPercent": 5, "…": "…", "continuationEnabled": true,
                "continuationMethod": "breakout", "continuationWindowSessions": 40,
                "breakoutBufferPercent": 1.5, "breakoutFormationBars": 2 },
    "resolution": "1d",
    "engine": { "version": "1.1.0", "commit": "…" },
    "execution": { "notionalUsd": 100000, "annualInterestRate": 0.11, "costBpsPerSide": 5,
                   "stopFill": "…", "capital": "standalone" },
    "data": { "selectionWindow": { "from": "2016-01-04", "to": "2023-12-29" },
              "testWindows": [{ "label": "test door", "from": "2024-01-02", "to": "2024-12-31" }],
              "exposure": "2025–2026 exposed" },
    "selection": { "method": "…", "metrics": { "…": 0 } },
    "recordSha256": "<sha256 of the canonical JSON of this record without recordSha256>"
  }],
  "trials": [ /* optional, read-only: stored as an optimisation batch, never runnable */ ]
}
```

- `params` are the **effective** values only: a dimension whose switch or method makes it inactive must be absent
  (the importer refuses it). A future optimiser gets the legal conditional domains from `searchSpaceOf(spec)`
  (`apps/strategy-lab/shared/params.ts`): each dimension's domain and the predicate under which it applies, plus the
  cross-field constraints; `sampleCandidate` draws valid effective candidates for smoke tests.
- `recordSha256` = sha256 of `canonicalJson(record without recordSha256)` (keys sorted at every level, no whitespace).
- Only the phenotypes listed in `phenotypes` are promoted; intermediate trials are never runnable.

## 3. Import (CLI only)

```sh
npm --prefix apps/strategy-lab run import:phenotypes -- <export directory>
```

The importer refuses, writing nothing, unless: the manifest lists `phenotypes.json` and every listed sha256 matches;
the shape is valid; every `recordSha256` matches; the study's protocol and sealed records exist here with the listed
hashes; every strategy version is registered and launchable (a legacy version such as Growth 1.0.0 is refused), the
engine version equals it, the parameters are valid **effective** values and the resolution allowed; a pool names the
registered Study 8 runner and a config file with its hash, its symbols equal its books; no existing id has different
content. It is **idempotent**: the same export again reports `alreadyImported`; a phenotype already present with the
same hash is skipped.

Exports in the repository:

| Directory | Contents |
| --- | --- |
| `apps/strategy-lab/fixtures/phenotypes/growth-demo-2026-11/` | Five **demonstration** Growth phenotypes (OFF and each continuation method, illustrative defaults, VGT daily). Not selected by any search; generated by `scripts/make-growth-demo-phenotypes.ts` |
| `apps/strategy-lab/fixtures/phenotypes/study8-expanded-regime-d1/` | The sealed Study 8 selection `s8-vg-balanced` (#2 VG balanced) as a shared-slot pool phenotype; generated read-only from the sealed records by `importers/export-study8-phenotypes.ts --out <dir> s8-vg-balanced` |

## 4. The catalogue in the UI

**Phenotypes** (header tab, `#/phenotypes`): search by id, name or study; filter by study, strategy, symbol and role;
select one (`#/phenotype/PH-0001`) to see its locked configuration, execution kind, engine, execution assumptions,
selection, data windows and exposure, record hash, import, and its runs. **Run selected phenotype…** opens the test
dialog in phenotype mode:

- **Growth (standalone / batch).** The parameters start at the frozen values. The form is the schema of the
  phenotype's OWN version: a 1.2.0 phenotype shows its entry trend filter and eligibility settings. A 1.1.0 phenotype
  (for example `growth-demo-2026-11`) shows the 1.1.0 form and reruns **as a 1.1.0 configuration**: the 1.2.0 engine
  with both entry gates OFF, recorded as `legacyReplay` and never silently reinterpreted. To try the gates on it, clone
  the result into a New test. Title, dates, symbols and resolution are free. Editing anything executed shows *"this run is a NEW variation derived from PH-…"*; the frozen phenotype never
  changes. The run records `phenotype_id`, the study, role, record hash and import, and `phenotypeEdited` with the
  edited keys (`experiment: Phenotype reruns`).
- **Shared-slot pool.** Only the title and the **end date** can be chosen: the start is fixed at 2016-01-04 (Study 8:
  accounting from that close, arming on 2017-06-15), the books, symbols, costs and parameters are locked. The run is
  ONE replay through the **unchanged Study 8 runner** (`runner/pool-run.ts` → `src/study8-runners` `runFor`, the pools
  engine, shadow books, first executable signal wins), never independent per-symbol tests and never a sum. Its lots
  and funding decisions (granted and refused) become events with the importer's own conversion. To the sealed end
  (2026-10-29) at 5 bps it reconciles with the sealed F24 record trade by trade and equals the imported vg-balanced
  run event for event (109 events; `tests/growth-parity.test.ts`); for another end the reconciliation is reported as
  not applicable.
- **Exposure.** A window that reaches holdout/final dates, or the study's test windows, is labelled exposed: the rerun
  is exploratory and **not another independent holdout**.

**Capability is explicit** (`GET /api/phenotypes`): `runnable` with its runner (`growth-trading`, `entry-signal`,
`study8-pool`) and what is locked, or **view-only** with the reason (an unregistered or non-launchable strategy version,
a pool without a registered runner, missing sealed records or data). A superseded Growth version with a replay contract
(1.1.0: `launch: phenotype`) is runnable as itself, and its reason says so. Nothing is simulated in place of a missing
runner.

**Fixture exports** (`apps/strategy-lab/fixtures/phenotypes/`, demonstrations only — not optimisations, not imported
into the live catalogue):
- `growth-demo-2026-11`: 1.1.0, continuation OFF and each method;
- `growth-gates-demo-2026-11`: 1.2.0 with the entry gates ON (trend A + policy 1, trend E + policy 5, trend C alone);
  written by `scripts/make-growth-gates-demo-phenotypes.ts`;
- `study8-expanded-regime-d1`: the sealed `s8-vg-balanced`.

Import one into the live catalogue (permanent rows) with `npm --prefix apps/strategy-lab run import:phenotypes --
apps/strategy-lab/fixtures/phenotypes/<export>`.

## 5. API

| Route | What |
| --- | --- |
| `GET /api/phenotypes?q=&study=&strategy=&symbol=&role=` | The catalogue with each phenotype's capability |
| `GET /api/phenotypes/PH-0001` | One phenotype: record, import, capability, its runs |
| `POST /api/phenotypes/PH-0001/runs` | ONE run: `{ title?, from, to, symbols?, params?, resolution? }` (Growth); `{ title?, to }` (pool) |

Unknown fields (for example a grid of values) and arrays as parameter values are refused. There is no route that
creates, edits or deletes phenotypes, or launches several runs.
