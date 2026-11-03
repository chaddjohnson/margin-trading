# Study 9, Phase B — seven-pool from-scratch joint D1 optimization and stability audit

**Research only. Nothing here is deployed, traded or live.**

Seven fixed ETF memberships (G4-ILF KRE+GDX+ILF+MTUM, G4-EWW KRE+EWW+GDX+MTUM, N3-EDV EDV+IWM+XLF, N2-SMH SMH+XHB,
V3-IWM VGT+IWM+XLF, N2-EDV EDV+XHB, and the user-approved exploratory VG3-IWM VGT+GDX+IWM), each jointly re-optimized
from scratch on all 8 × books D1 parameters with Study 8's unchanged optimizer, fitness, neighbourhood instrument,
qualification, selection and test gates, on five expanding-window folds (F19, F20, F21, F23, F24), then tested once
in Study 8's order and compared with Study 8's VG #2 balanced (the user's current favourite), VG #1, B1 and B5.

**Status:** every research stage is sealed (chain entries 1–18, 2026-11-02T23:32Z → 2026-11-03T09:11Z). The reports
are in this directory, the reviews and audits in `reviews/`, and the checkpoint is `RESEARCH_RECOVERY.md`.

**Result:**
- **Mechanical nomination (F24, outcome class qualified):** 13 research nominations among 32 role holders. The
  primary nominee is #2 G4-EWW profit (KRE+EWW+GDX+MTUM; test net $31,530, run DD $22,975, test share 98.4%).
- **The training-only #1, the exploratory VG3-IWM profit, failed its test** (80.5% share).
- **No Phase B holder showed an advantage over Study 8 VG #2 balanced** (test net $79,925, run DD $21,304, 98.2%).
  - None out-earned it on 2025–2026.
  - The confirmatory bootstrap puts the nominee $48.4k below it (5–95%: −$93.7k to −$9.1k).
  - No holder shows an advantage family-wise. The closest (#14 N2-SMH profit $76.5k, #15 and #16 VG3-IWM $65–67k)
    are inconclusive in either direction.
  - None is economically compelling. The comparison favours VG #2, which became the favourite after its 2025–2026
    results were seen.
- **Deployment: RESEARCH ONLY — NOT DEPLOYED.**

See `RECOMMENDATION.md`. Final independent audit: **CLEARED WITH NOTES** (0 blocking, 16 non-blocking findings), all
resolved (`reviews/FINAL_AUDIT.md`, `reviews/FINAL_AUDIT_RESOLUTION.md`, AMENDMENTS.md E5). The reports, tables and
reviews are sealed in chain phase `report-final`.

## Read in this order

1. `RECOMMENDATION.md` — the three decisions (mechanical nomination, user-preference assessment, deployment).
2. `CHRONOLOGICAL_VALIDATION.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `TRAINING_QUALIFICATION.md`, `SEARCH_AND_COMPUTE.md`.
3. `POOL_COMPLEMENTARITY_AND_LEDGER.md`, `EXECUTION_RISK_AND_LIQUIDITY.md`.
4. `BASELINES_AND_PARITY.md`, `PROTOCOL.md` (frozen), `AMENDMENTS.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`.

## Layout

| Path | Content |
|---|---|
| `brief/ASSIGNMENT.md` | the user's brief, verbatim |
| `PROTOCOL.md` | the frozen pre-search protocol (sealed in chain phase `protocol`) |
| `results/chain.jsonl`, `results/doors.jsonl`, `results/protocol_freeze.json`, `results/freeze/` | the tamper-evident record |
| `results/pilot/` | the timing pilot and the pre-freeze smoke script and outputs |
| `results/parity/` | the engineering and leakage gates (`parity.json`) and each attempt's run folder |
| `results/search/<TRACK>/<FOLD>/` | the 35 sealed search records and archives |
| `results/qualify/<TRACK>/<FOLD>/` | the 35 sealed qualification records |
| `FROZEN_SELECTION.json` | the sealed training-only selection |
| `results/test/<FOLD>/` | the one-time test records and per-lot ledgers |
| `results/slice/`, `results/diagnostics/`, `results/preference/` | report-only post-test records |
| `results/tables/` | generated tables (`tools/build_tables.py`) |
| `results/cache/` | persistent point caches (git-ignored; retained) |
| `results/runner/` | the runner's reconciliation, acceptance runs and the inherited `npm test` output |
| `scripts/`, `tools/` | the stage wrapper, the job orchestrator, the runner acceptance script; the table builder |
| `reviews/` | the independent methodology review, its verification, the pre-test audit and the final audit |
| `src/study9-phase-b/` | the study code (`npm run study9b -- <command>`) |
| `src/study9b-runners/` | the local runner (`npm run study9b-run`; `README.md` there) |
| `config/research-pools/study9-phase-b/`, `config/research-phenotypes/study9-phase-b/` | the runnable research configurations (`S9B-<TRACK>-F24-<n>.json`; RESEARCH ONLY) |
