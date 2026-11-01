# Research recovery checkpoint — Study 7: stability-first D1 optimization (GDX standalone, VGT control, smaller pools)

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root.

- **Updated:** 2026-11-01T01:55Z.
- **Status: COMPLETE.** Every stage is sealed. Reports are written. Commit and push are in the commit section below,
  updated by the follow-up commit.
- **Brief:** `brief/ASSIGNMENT.md`, sha256 `53291b3a995c1b6d78fbece693a88a9d5f9b442514e758c70d4434cc3ed0580d`, read in
  full. It authorizes implementation, execution, verification, and a commit and push of this branch only: no PR, no
  merge, no broker, no live trading, no deployment.
- **Authority:**
  - `PROTOCOL.md`, frozen 2026-10-31T23:42:49Z, sha256 `6590ecfeca3be67fe7ce3051debdcc72953593fdba68504c52330e75b2a93581`
    (`results/protocol_freeze.json` body `aa43c4f45ff9…`). No amendment.
  - Disclosures E1–E2 in `AMENDMENTS.md` (a hash chain).
- **Outcome:**
  - **Class M** (DEV search, 2022–2023 validation): **no nomination**. No fold-M candidate qualified.
  - **Class L** (2017–2023 search, in-sample qualification, block-only check on 2024–2026): **12 research
    nominations**, none blocked.
  - Analyst assessment: no candidate is chronologically validated. VG #2 and #5 offer the best trade-off. Deploy
    nothing. Keep B1 and B5 frozen. See `RECOMMENDATION.md`.
- **Running process:** none. Worktrees: none besides the main checkout. The two data-less test worktrees were removed.
- **Follow-up gate (the user's decision):** any prospective observation of Class L nominees needs a separately
  approved research-only addendum. Nothing may be merged, deployed or added to the prospective B4/B5 system without
  the user's review.

## 1. Environment

- **Checkout:** `/home/chad/projects/margin-trading`, branch `research/study7-stability-first-d1`, created
  2026-10-31T22:58:48Z from `research/study6-b5-kre-robustness` at `418208eae1fbfc1541b269d0bed1fd3a82d8f7ee`.
- **Runtime:** Node v24.21.0, 16 logical CPUs (8 cores), 59 GB.
- **User changes never touched or committed:**
  - `config/market-events/distributions.csv` and `distributions.manifest.json` (modified);
  - `config/market-events/raw/vanguard-20261030T184421Z/` (untracked);
  - nine `._.DS_Store` files.
- **Local, git-ignored, regenerable:** `research/study7-stability-first-d1/results/cache/` (4.4 GB of persistent
  point caches). They are needed only to resume a job, and every job is complete.

## 2. Stage table (all complete; write-once stages refuse to re-run)

| Stage | Command | Record (body hash, first 12) |
|---|---|---|
| Pilot (pre-freeze) | `npm run study7 -- pilot` | `results/pilot/pilot.json` `07b56738d8df` |
| Protocol freeze | `npm run study7 -- freeze-protocol` | `results/protocol_freeze.json` `aa43c4f45ff9` |
| Parity | `npm run study7 -- parity` | `results/parity/parity.json` `795fc0c209a7` (passed) |
| Phase A (45 jobs) | `scripts/run_jobs.sh scripts/jobs-phaseA.txt 12` | `results/phaseA/*.json`; manifest `926465a66f13`; commit `e6aebab` |
| Phase B (18 jobs) | `scripts/run_jobs.sh scripts/jobs-phaseB.txt 14` | `results/phaseB/<track>/<fold>/search.json` |
| V trigger | `npm run study7 -- v-trigger` | not fired (in `FROZEN_SELECTION.json` `v`) |
| Phase D (16 jobs) | `scripts/run_jobs.sh scripts/jobs-phaseD.txt 14` | `results/phaseD/<track>/<fold>/validation.json` |
| Selection freeze | `npm run study7 -- freeze-selection` | `FROZEN_SELECTION.json` `8d841f8a8a64` (file `f49a8cf9…`) |
| Final / confirm | `npm run study7 -- final`, `final --confirm` | `results/final/final.json` `cc609b0d62a0` / `confirmation.json` `827f635f472e` (identical) |
| Research configurations | `npm run study7 -- research-configs` | 44 pools + 4 phenotype files (research only) |
| Tables | `python3 research/study7-stability-first-d1/scripts/build_tables.py phaseB phaseD selection final phaseA` | `results/tables/*.md` |

## 3. Guards

- **Do not rerun** any sealed stage. `final --confirm` has already run, and a second one refuses because the file
  exists. Never reopen the final door for tuning.
- Never edit `PROTOCOL.md`, the sealed records, the frozen phenotypes/pools, `data/` or the prospective system.
- Any further search on 2016–2026 is search on observed data. A new question needs a new study namespace.

## 4. Commits and push

- `e6aebab`: the Phase A lock (before any Phase B search).
- Final study commit and push: recorded by the follow-up commit (see `git log`).
