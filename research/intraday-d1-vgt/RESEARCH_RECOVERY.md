# Research recovery checkpoint — Intraday D1 (VGT, 1-minute), Study 8–style robust optimization

## Top screen

- **Updated:** 2026-11-06T17:49Z (UTC, from the clock). **Status: COMPLETE.** Recommendation: **no robust edge**.
- **Outcome:**
  - Study 8's V-track search on 2016–2024 found **no feasible intraday configuration** (0 of 7,890 at rung 1; 0/192
    at rung 2; 0/54 at rung 3). The near-misses fail only C5/E1 (neighbourhood median about $6.4k/yr against $10k/yr).
  - `FROZEN_SELECTION.json` has **no role holder** (pre-registered outcome "no robust edge").
  - Validation was run once on the frozen shortlist as a labelled diagnostic: it fails T3 and T5.
  - Details: `REPORT.md`.
- **Deliverables:**
  - `REPORT.md`, `results/report/REPORT_TABLES.md` (`59a7aa90`), `results/report/diagnostics.json` (`10b4088d`);
  - `FROZEN_SELECTION.json` `fffa2908` (body `1dd6700c`);
  - `results/validation/validation.json` `577f9674`, with ledgers and year tables (chain 7);
  - `results/search/search.json` `db62256e`, `results/qualify/qualification.json` `ae6313a5`;
  - `results/parity/parity.json` `30e1545b`;
  - `PROTOCOL.md` `5cfa4234`, `AMENDMENTS.md` `c5665933` (head A1);
  - code `src/intraday-d1/` and the `package.json` script `intraday-d1`.
  - Hashes were recomputed 2026-11-06T17:48Z; `REPORT.md` was edited after that, so recompute it.
- **Follow-up gate (needs the user):** none required. A walk-forward study is not recommended (REPORT §10). Any new
  intraday entry concept or execution model would need its own authorized protocol. Strategy Lab integration was not
  built (no candidate).
- **Running processes:** none.

## Environment

- Repository root `/home/chad/projects/margin-trading`, main checkout, no other worktree.
- Branch `research/intraday-d1-vgt`, created from `353e33f` (`feature/strategy-entry-explorer-ui`).
- Commits:
  - `f90d990`: protocol freeze, before the search;
  - `b3571c1`: selection freeze, before validation;
  - the final commit adds the validation, reports and tools, and is followed by the push of the branch (requested by
    the user).
- Node 24.21.0; 16 threads, 59 GB RAM. File listings show local time (UTC+1); every time here is UTC.

## Authority and chain (`npm run intraday-d1 -- verify`: 7 entries, 0 problems)

| Seq | Phase | At (UTC) | Records |
|---|---|---|---|
| 1 | protocol | 17:35:23 | `PROTOCOL.md`, `results/protocol_freeze.json` |
| 2 | amendment-A1 | 17:36:27 | `AMENDMENTS.md`, `results/parity/parity-attempt1.json`, `src/intraday-d1/parity.ts` |
| 3 | parity | 17:36:38 | `results/parity/parity.json` (0 differences: P1 ×2, P3 ×5, P2 ×60) |
| 4 | search | 17:37:54 | `results/search/search.json`, `search-archive.csv.gz` |
| 5 | qualify | 17:38:56 | `results/qualify/qualification.json` |
| 6 | selection | 17:39:04 | `FROZEN_SELECTION.json` (committed in `b3571c1` before the validation door) |
| 7 | validation | 17:39:38 | `results/validation/validation.json` + 5 ledgers + 5 year tables |

## Data doors (`results/doors.jsonl`)

- **Development door:** prefix of `data/VGT/data.csv` through 2024-12-31 (42,469,694 bytes; sha256
  `c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb`). Opened for:
  - parity attempts 1 and 2, the search and qualification;
  - after the freeze, for report labels and diagnostics.
- **Validation door:** the whole file (sha256 `2ee06310…412e`), with the 8:1 split of 2026-04-21 forward-adjusted.
  Opened once at 17:39:31, after the freeze commit. A post-study CLI check (`run --door full`) at 17:43:22 reproduced
  the sealed numbers.

## Verification

- **Study tests:** 17/17 pass.
- **D1 non-regression:** the data-free suites pass 21/21. The canonical D1 run on the development prefix equals its
  sealed development record ($137,222.97 / $19,330.69 / $15,611.46 / 17 trades).
- **Static checks:** tsc and eslint are clean for `src/intraday-d1`.
- **Full `npm test`** (after the freeze; `results/runlogs/npm-test.txt`): 1,214 tests, 1,203 pass, **7 fail**, 4
  skipped. All 7 failures are pre-existing and unrelated:
  - Six open the lowercase `src/app/allin-original.ts`, which does not exist on this case-sensitive filesystem. The
    repository already records this (`src/d1-signal-capital-complementarity/stages.ts:35`).
  - One, the `src/study7-runners` parity test, reconciles only when the data end on 2026-10-29 (`sealedEnd`), and the
    canonical VGT file was extended to 2026-10-30 on 2026-11-02.
  - None touches D1 or `src/intraday-d1`.

## Guards (do not rerun)

- Every chained stage is sealed and refuses to rerun: search, qualify, freeze and validation. Never reopen validation
  for selection or tuning.
- Do not edit the frozen box, the gates or `FROZEN_SELECTION.json`. A new question needs a new study namespace.

## Disclosures

- **Amendment A1:** parity comparator defect, found and fixed before the search.
- **Timestamp peek:** while pinning the prefix, one shell command displayed the next row's timestamp only
  (2025-01-02T12:26Z).
- **Audits read earlier results:** they read daily D1's own historical 2025–2026 results (not new candidates).
- **Diagnostics run twice:** `diagnose` was run twice (report-only; the second overwrote the first with the screen
  re-evaluation added).
- **Exposure column definition:** the sealed year tables' "exposure %" column is wall-clock minutes held ÷
  regular-session minutes, and exceeds 100% for overnight holders (stated in the REPORT).
- **Corrected timestamp:** one checkpoint update first carried an estimated timestamp and was corrected to the clock
  value.
