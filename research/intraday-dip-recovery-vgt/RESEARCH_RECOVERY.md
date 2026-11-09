# Research recovery checkpoint — Short-term VGT dip recovery, Phase 1 (`intraday-dip-recovery-vgt`)

## Top screen

- **Updated:** 2026-11-09T20:18Z (UTC, from `date -u`). **Status: COMPLETE.** Verdict **(c) no attractive edge
  demonstrated** (`REPORT.md`). Every stage is sealed and committed; the validation ran once.
- **Authority:**
  - `PROTOCOL.md`, sha256 `8a71e641da357ab6…`, frozen by `results/protocol-freeze.json` (`8e3c50de…`) at
    2026-11-09T19:10:57Z and committed in `0be0088e`;
  - code digest `13e803f3953c…`, unchanged through validation;
  - `AMENDMENTS.md` (`bfb04414…`): no amendment;
  - standard 2.0.0 (`2005a88c…0105`), retained pinned;
  - brief `brief/BRIEF.md` (`7224c602…7c4c`).
- **Outcome:**
  - Primary `F2-4.1v.m.1x.0.u.0.1r.1e` (independent lane): development +$85,809 at DD $15,270; qualified.
  - Chronological procedure **unsupported** (sequential +$9,710, DD $46,082).
  - Validation once: +$5,645, V1–V3 pass, −68% pace.
  - Daily D1 control: +$40,901 in validation.
- **Running processes:** none (`systemctl --user list-units 'dip-*'` is empty after the units).
- **Follow-up gate (needs the user):** none required. Phase 2 is not recommended (`REPORT.md` §11). Any execution-cost or
  limit-order study, GDX, portfolio combination, Strategy Lab integration or live use needs a separately authorized
  brief.

## Audited deliverables (sha256 prefix, recomputed 2026-11-09T20:17:48Z)

| File | sha256 |
|---|---|
| `PROTOCOL.md` | `8a71e641da357ab6` |
| `STANDARD_ADOPTION.json` | `ff70cf4327d81f38` |
| `STANDARD_COMPLIANCE_MAP.md` | `5d0be5d58801c7fd` |
| `EXISTING_FINDINGS_AND_CHANGE_MAP.md` | `f59abbeef9aa7041` |
| `AMENDMENTS.md` | `bfb04414253a546f` |
| `FROZEN_SELECTION.json` | `f175226982f3b2b0` |
| `results/protocol-freeze.json` | `8e3c50dee9c96d1b` |
| `results/parity/parity.json` | `63b6747df5cd39d4` |
| `results/qualify/C19.json` / `C21.json` / `C23.json` / `C24.json` | `cd961c28` / `70792f5a` / `4d3bf8a3` / `ba6e3720` |
| `results/folds/sequential.json` | `e6a6015c3940c98f` |
| `results/ablation/ablation.json` | `4b955d0b1cb8ebc0` |
| `results/controls/development.json` | `c3650cf555182250` |
| `results/diagnostics/diagnostics.json` | `198af49a7650329b` |
| `results/validation/validation.json` | `88ac1c5719f852a3` |
| `results/data/coverage.json` | `771ef2c3dee91700` |
| `results/pilot/PILOT.md` | `ef48bfdac241f85d` |

`REPORT.md` and `REPORT_TABLES.md` are narrative and generated tables: report-only and regenerable (`tools/intraday-dip-recovery/tables.ts`). They are not sealed. Every sealed record (345) is in
`results/seals.jsonl` and verifies (`npm run dip-recovery -- verify`: 0 problems).

## Environment

- Repository root `/home/chad/projects/margin-trading-2`, main checkout.
- Branch `research/intraday-dip-recovery-vgt`, from `8c20f855`. No other worktree.
- Node 24.21.0; 16 threads (8 cores); 59 GiB RAM.
- `diprecovery.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0); 12 workers. Peak unit memory 8.9 GiB; zero swap.
- Data `data/VGT/data.csv` (git-ignored), sha256 `2ee06310…412e`. The endpoint 2026-10-30 is measured.

## Stage table (all complete; commits in order)

| Stage | Commit | Record |
|---|---|---|
| coverage, doors, parity (0 failures), pilot, protocol freeze | `0be0088e` | `results/data/`, `results/parity/`, `results/pilot/`, `results/protocol-freeze.json` |
| C19 searches + qualification + fold selection (before its slice) | `d76e2cab` | `results/search/C19/`, `results/qualify/C19.json`, `results/folds/C19-selection.json` |
| C19 fold evaluation | `5bc068e2` | `results/folds/C19-evaluation.json` |
| C21 (selection / evaluation) | `a13ae56b` / `f69be3f4` | as above |
| C23 (selection / evaluation) | `0c047bea` / `37c6737b` | as above |
| sequential verdict, L0–L5 ablation, development controls | `bbcec0e0` | `results/folds/sequential.json`, `results/ablation/`, `results/controls/` |
| C24 searches (indep, informed, explore2), qualification, diagnostics | `929d3c52` | `results/search/C24/`, `results/qualify/C24.json`, `results/diagnostics/` |
| C24 frozen selection (before validation) | `440b8d87` | `FROZEN_SELECTION.json` |
| validation (FULL opened once, 20:11:54Z) | `b1e7935a` | `results/validation/` |
| report, tables, final checkpoint, push | the final commit | `REPORT.md`, `REPORT_TABLES.md`, `results/report/`, `results/verification/` |

## Guards (do not rerun or reopen)

- Every sealed stage refuses to rerun. The validation is sealed: never reopen FULL for selection, tuning or a rescue
  search.
- Do not edit the frozen protocol, gates, budgets or `FROZEN_SELECTION.json`. A new question needs a new study
  namespace.
- Never edit `research/intraday-d1-vgt/`, `src/intraday-d1/`, D1, Study 8, Growth or Strategy Lab files.

## Disclosures

- **Parity dry run 1:** a defect of the independent reference, not the engine, fixed before sealing
  (`results/parity/dry-run-1-failed.txt`).
- **Departure D1** (brief §4, §3.3): the earlier-cutoff repeat covers the independent four-family procedure only. The
  preflight's §1 checks are therefore skipped, and the date split was verified by hand.
- **Exposure before validation:**
  - the coverage scan read every row's timestamp (no price);
  - the pilot and bench logs printed development-only pilot results;
  - D24 was opened for engineering probes before the freeze.

  Every opening is in `results/doors.jsonl`.
- **Data quality:** two 2016 sessions lack a closing-print row.
- **Box edges:** the S upper bound (4.99%) binds in several slow members; the bounds were frozen and not moved.
- **Code quality:** the study code has 0 eslint errors and 338 formatting warnings, deliberately left because
  reformatting would change the frozen digest.
- **Validation framing:** validation is on previously examined history, not an untouched holdout.
