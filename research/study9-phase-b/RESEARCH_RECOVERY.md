# Research recovery checkpoint — Study 9 Phase B (seven-pool joint D1 optimization)

## Top screen (read this first)

- **Updated:** 2026-11-03T10:25Z (UTC, from the clock). **Status: COMPLETE.** The user approved commit + push. Commit
  `38fa0f87498448547abff6bf36ea3f7a18649fa2` (413 files) was pushed as the branch's first push
  (`origin/research/study9-phase-b-seven-pool`, upstream set); this checkpoint update follows as a separate commit.
- **Chain:** 19 entries, all verified. Entry 19 is `report-final` `3e11ff3cf247` (2026-11-03T10:18:38Z, 70 files:
  reports, reviews, tools, runner evidence and all 49 tables). `scripts/s9b.sh verify-chain` → "chain OK: 19 entries;
  integrity OK (code 051bb8ed140a, engine f1f833a3177f, accepted by E3)" at 10:18:39Z.
- **Authority:** `PROTOCOL.md` sha256 `3b5c8cd3278c5745…` (frozen, chain 1). `AMENDMENTS.md` head **E5**
  (`b69a6dc53e42a0c9…`, sealed in chain 19).
- **Result (sealed):**
  - F24 outcome class *qualified*, with 13 nominations among 32 holders. The primary nominee is **#2 G4-EWW profit**
    (`S9B-G4-EWW-F24-1`).
  - The training #1, VG3-IWM profit, failed (T2, T2b).
  - **No Phase B holder showed an advantage over Study 8 VG #2 balanced.** Confirmatory: −$48,394 [5% −$93,738, 95%
    −$9,108]. Family-wise p ≥ 0.958; #14, #15 and #16 are inconclusive. None is economically compelling.
  - Deployment: RESEARCH ONLY — NOT DEPLOYED.
- **Final audit:** CLEARED WITH NOTES (0 blocking, 16 non-blocking), all resolved (E5,
  `reviews/FINAL_AUDIT_RESOLUTION.md`).
- **Running:** nothing.
- **Follow-up gate (the user's decision):** whether to start a separate, prospective study (RECOMMENDATION.md §7).
  Nothing here authorises it; merging or opening a PR also needs the user's request.
- **Do not rerun:** any sealed stage (each refuses); never `seal search|qualify` again; never edit a file sealed in
  chain 19 (verify-chain rehashes them).

## Environment

- Main checkout `/home/chad/projects/margin-trading`; no other worktree (`git worktree list`: one).
- Branch `research/study9-phase-b-seven-pool`, created 2026-11-02T22:09Z from `research/study9-etf-pool-discovery` at
  `2beb1bd86f3c8ccd138c718c9ccfb0e63ffff97a`. Phase B is committed as `38fa0f8` and pushed (upstream
  `origin/research/study9-phase-b-seven-pool`); this checkpoint update is a follow-up commit.
- **Working tree** (`git status --short`):
  - **The user's own changes, never touched or staged:** `config/market-events/distributions.csv` and
    `distributions.manifest.json` are modified; `config/market-events/raw/vanguard-20261030T184421Z/` and seven
    `._.DS_Store` files are untracked.
  - **Phase B (committed in `38fa0f8`):**
    - `package.json` (2 script lines, E4);
    - untracked `research/study9-phase-b/`, `src/study9-phase-b/`, `src/study9b-runners/`;
    - untracked `config/research-pools/study9-phase-b/` (42 files) and `config/research-phenotypes/study9-phase-b/`.
- Node v24.21.0 (`.node-version`; `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`).
  The machine has 16 logical CPUs, 59 GB RAM and > 500 GB free disk. Heaps: study 12 GB, runner 8 GB.
- **Git-ignored and retained** (never delete):
  - `research/study9-phase-b/results/cache/` (70 files: 35 search caches of 15.9 GB and 35 qualification caches of
    0.86 GB, 16.8 GB in all; hashes in `results/search/cache-manifest.json` and `results/qualify/cache-manifest.json`);
  - the two A3 parity point caches `results/parity/run-*/a3-cache-VG-F19.jsonl` (238 MB each; git-ignored at 10:21Z
    by a line added to `research/study9-phase-b/.gitignore`, because GitHub refuses files over 100 MB);
  - Phase A's cache (1.1 GB);
  - runner outputs under `evaluations/study9b-runs/` (`reconcile-2026-10-29/`, `edge-cases-20261103T092727Z/`,
    `edge-cases-20261103T093208Z/`).
- Data: 13 canonical files `data/<SYMBOL>/data.csv` (KRE GDX ILF MTUM EWW EDV IWM XLF SMH XHB VGT XBI XRT), all ending
  2026-10-30; the training projection is `data/vintages/study9-train-2024/`. The freeze pins both, and every door
  re-checks the pins ("canonical bytes after 2026-10-30: {}").

## Authority and sealed records (sha256, first 16 hex; recomputed 09:36Z)

| File | sha256 | Chain entry |
|---|---|---|
| `brief/ASSIGNMENT.md` (the user's brief, verbatim) | `3158751595d1fc35` | — |
| `PROTOCOL.md` | `3b5c8cd3278c5745` | 1 `protocol` `46faf87919cd` |
| `results/parity/parity.json` | `878c2d5fac0215ac` | 3 `parity` `42c722d3fbc6` |
| `results/search/cache-manifest.json` (+ 35 `search.json`) | `b0658c373a381aa1` | 5 `search` `72b9f43b2d4d` |
| `results/qualify/cache-manifest.json` (+ 35 `qualification.json`) | `e771552ffbe57254` | 6 `qualify` `3a0d1a924c93` |
| `FROZEN_SELECTION.json` | `1a2e6222b4bbd84c` | 7 `selection` `2cc50fbeaa20` |
| `reviews/PRE_TEST_AUDIT.md` (Result: CLEARED) | `1d01fb9e5ce9bf04` | 9 `audit` `fd2fc387cd60` |
| `results/test/F19/test.json` | `e7ba30e3caf1a77e` | 10 `7808ffbe9de6` |
| `results/test/F20/test.json` | `526bd3de032a42dc` | 11 `44c7a1b5e5a2` |
| `results/test/F21/test.json` | `124a1eeeeeb18abe` | 12 `619a35ab8d85` |
| `results/test/F23/test.json` | `5304618d022ce705` | 13 `ef4d8a3e291e` |
| `results/test/F24/test.json` / `test-lots.jsonl.gz` | `b1b11e95ec4ff6f9` / `710368d75076484e` | 14 `f2fe57584769` |
| `results/test/F24/confirm.json` (IDENTICAL) | `88384ac0c6edd01a` | 15 `104880f14189` |
| `results/slice/slice-2026-10-30.json` | `f63505b15611c068` | 16 `e6dcef6eaf29` |
| `results/diagnostics/diagnostics.json` | `7fc735b0843710aa` | 17 `6d5f7d32e55a` |
| `results/preference/preference.json` | `146afac527790159` | 18 `dbe5d77748cb` |
| `results/chain.jsonl` / `results/doors.jsonl` (114 openings) | `d638143800003617` / `8b93e1ac7010269b` | — |

Code acknowledgements: chain 2 `code-E1`, 4 `code-E2`, 8 `code-E3` (records in `results/freeze/`). Reviews:
`reviews/METHODOLOGY_REVIEW.md` `8a5ab344ba0c4b80`, `METHODOLOGY_REVIEW_VERIFICATION.md` `d2141104ea170dbc`,
`PRE_TEST_AUDIT_BRIEF.md` `ef768aa093def856`.

## Stage table

All commands run from the repository root; `scripts/` = `research/study9-phase-b/scripts/`. Every stage is write-once
and refuses a rerun (the chain refuses a sealed phase). **Resume semantics:** no stage resumes mid-way except the
search jobs, whose point caches let an interrupted job restart from its cache. A test or post-test stage that died
before sealing would need a complete deterministic replay, labelled a rerun; none did.

| # | Stage | Status | Command | Runtime (UTC 11-03 unless noted) | Output |
|---|---|---|---|---|---|
| 0 | Protocol, review, freeze | complete | `scripts/s9b.sh freeze-protocol` | 11-02 23:32:25 | chain 1 |
| 1 | Parity (19 gates) | complete (attempt 2) | `scripts/s9b.sh parity` | 00:03:19 → 00:31:22 | chain 3 |
| 2 | Search (35 jobs) | complete | `scripts/run_jobs.sh scripts/jobs-search.txt 12`; `scripts/s9b.sh seal search` | 00:31:39 → 05:48:42; 60.9 CPU-h | chain 5 |
| 3 | Qualification (35) | complete | `scripts/run_jobs.sh scripts/jobs-qualify.txt 12`; `scripts/s9b.sh seal qualify` | 05:50:04 → 06:08:04; 3.1 CPU-h | chain 6 |
| 4 | Selection freeze | complete | `scripts/s9b.sh freeze-selection` | 06:09:03 | chain 7 |
| 5 | Pre-test audit | complete, CLEARED | `scripts/s9b.sh record-audit research/study9-phase-b/reviews/PRE_TEST_AUDIT.md` | 06:26:42 | chain 9 |
| 6 | Tests F19 → F24, F24 confirm | complete | `scripts/s9b.sh test F19` … `test F24`, `test F24 --confirm` | 06:26:48 → 09:00:31 | chain 10–15 |
| 7 | Slice, diagnostics, preference | complete | `scripts/s9b.sh slice`, `diagnostics`, `preference` | 09:00:48 → 09:11:06 | chain 16–18 |
| 8 | Runner, npm test, reports, tables | complete | `node … src/study9b-runners/main.ts research-configs` (before the npm script existed), reconciliation compare (RUN_COMMANDS.md), `npm test`, `tools/runner_edge_cases.sh evaluations/study9b-runs/edge-cases-20261103T093208Z`, `python3 research/study9-phase-b/tools/build_tables.py search qualify selection test folds tracks preference diagnostics execution slice` | 09:01 → 09:37 | `results/runner/`, `results/tables/`, the reports |
| 9 | Final independent audit | complete: CLEARED WITH NOTES; 16 notes resolved (E5) | a fresh read-only agent; brief `reviews/FINAL_AUDIT_BRIEF.md` | 09:38:55 → ≈ 10:00; resolutions to 10:20 | `reviews/FINAL_AUDIT.md`, `reviews/FINAL_AUDIT_RESOLUTION.md` |
| 10 | Report seal | complete | `scripts/s9b.sh seal report-final` (the 70 files under "Report seal") | 10:18:38 | chain 19 `3e11ff3cf247` |
| 11 | Commit / push | complete (user approved) | `git commit` (413 files: the Phase B paths + `package.json`); `git push -u origin research/study9-phase-b-seven-pool` | 10:25 | `38fa0f8` on origin |

## Report seal (stage 10, complete)

Command (repository root, 10:18:38Z): `research/study9-phase-b/scripts/s9b.sh seal report-final research/study9-phase-b/README.md research/study9-phase-b/RECOMMENDATION.md research/study9-phase-b/CHRONOLOGICAL_VALIDATION.md research/study9-phase-b/NEIGHBORHOOD_ROBUSTNESS.md research/study9-phase-b/TRAINING_QUALIFICATION.md research/study9-phase-b/SEARCH_AND_COMPUTE.md research/study9-phase-b/POOL_COMPLEMENTARITY_AND_LEDGER.md research/study9-phase-b/EXECUTION_RISK_AND_LIQUIDITY.md research/study9-phase-b/BASELINES_AND_PARITY.md research/study9-phase-b/RUN_COMMANDS.md research/study9-phase-b/AMENDMENTS.md research/study9-phase-b/reviews/FINAL_AUDIT_BRIEF.md research/study9-phase-b/reviews/FINAL_AUDIT.md research/study9-phase-b/reviews/FINAL_AUDIT_RESOLUTION.md research/study9-phase-b/tools/build_tables.py research/study9-phase-b/tools/runner_edge_cases.sh research/study9-phase-b/results/runner/reconcile-2026-10-29.txt research/study9-phase-b/results/runner/reconcile-attempt1-refused.txt research/study9-phase-b/results/runner/edge-cases.txt research/study9-phase-b/results/runner/npm-test.txt research/study9-phase-b/results/runner/list.txt research/study9-phase-b/results/tables/diag-complementarity.md research/study9-phase-b/results/tables/diag-episodes.md research/study9-phase-b/results/tables/diag-liquidity.md research/study9-phase-b/results/tables/diag-neighbourhood.md research/study9-phase-b/results/tables/diag-participation.md research/study9-phase-b/results/tables/diag-risk.md research/study9-phase-b/results/tables/F24-outcome.md research/study9-phase-b/results/tables/F24-tracks.md research/study9-phase-b/results/tables/folds-persistence.md research/study9-phase-b/results/tables/folds-return-rank.md research/study9-phase-b/results/tables/preference-decisions.md research/study9-phase-b/results/tables/preference-holders.md research/study9-phase-b/results/tables/qualify-candidates.md research/study9-phase-b/results/tables/qualify-clipping.md research/study9-phase-b/results/tables/qualify-controls.md research/study9-phase-b/results/tables/qualify-pbo.md research/study9-phase-b/results/tables/qualify-sequence.md research/study9-phase-b/results/tables/search-controls.md research/study9-phase-b/results/tables/search-islands.md research/study9-phase-b/results/tables/search-overview.md research/study9-phase-b/results/tables/search-shortlists.md research/study9-phase-b/results/tables/search-threshold-sensitivity.md research/study9-phase-b/results/tables/selection-ranked.md research/study9-phase-b/results/tables/selection-roles.md research/study9-phase-b/results/tables/slice-2026-10-30.md research/study9-phase-b/results/tables/test-F19-controls.md research/study9-phase-b/results/tables/test-F19-holders.md research/study9-phase-b/results/tables/test-F19-members.md research/study9-phase-b/results/tables/test-F19-risk.md research/study9-phase-b/results/tables/test-F20-controls.md research/study9-phase-b/results/tables/test-F20-holders.md research/study9-phase-b/results/tables/test-F20-members.md research/study9-phase-b/results/tables/test-F20-risk.md research/study9-phase-b/results/tables/test-F21-controls.md research/study9-phase-b/results/tables/test-F21-holders.md research/study9-phase-b/results/tables/test-F21-members.md research/study9-phase-b/results/tables/test-F21-risk.md research/study9-phase-b/results/tables/test-F23-controls.md research/study9-phase-b/results/tables/test-F23-holders.md research/study9-phase-b/results/tables/test-F23-members.md research/study9-phase-b/results/tables/test-F23-risk.md research/study9-phase-b/results/tables/test-F24-controls.md research/study9-phase-b/results/tables/test-F24-distribution.md research/study9-phase-b/results/tables/test-F24-holders.md research/study9-phase-b/results/tables/test-F24-members.md research/study9-phase-b/results/tables/test-F24-perbook.md research/study9-phase-b/results/tables/test-F24-risk.md research/study9-phase-b/results/tables/test-F24-stresses.md research/study9-phase-b/results/tables/test-inherited.md`

## Constants

- The numeric rulebook is Study 8's, imported unchanged (`src/study9-phase-b/context.ts`, sealed in
  `FROZEN_SELECTION.json` and re-checked at every door).
- Seed namespace `study9-phase-b` (`seedOf`). Bootstraps: block 21, 5,000 resamples, common indices.
- Execution: 5 bps per side, 11% simple interest, a fixed $100k single slot and a strict < $35k minute-DD ceiling.
- Doors and data cutoffs:
  - training on the projection to each fold's end (2019-12-31 … 2024-12-31);
  - tests on canonical data to 2026-10-29;
  - the slice and post-test stages to 2026-10-30.
- Preference bands: 95 / 93 / 90%.

## On disk versus in memory

Everything the next steps need is on disk: the decisions are in the sealed preference record, the reports and tables
are in the study directory, and the commands are here and in `RUN_COMMANDS.md`. Nothing decisional exists only in the
conversation.

## Guards

- **Do not rerun or edit:**
  - any sealed Phase B stage or record above;
  - any Phase A, Study 8 or earlier record;
  - the caches.
- **Never touch or stage:** `config/market-events/*` and any `.DS_Store` / `._.DS_Store` file.
- **No commit, push, PR, merge, deployment or broker access** without the user's explicit answer. If approved, the
  commit is 412 untracked files (≈ 82 MB, the largest 3.1 MB) plus the `package.json` diff:
  - `research/study9-phase-b/` (323 files, without the caches);
  - `src/study9-phase-b/` (27);
  - `src/study9b-runners/` (9);
  - `config/research-pools/study9-phase-b/` (42);
  - `config/research-phenotypes/study9-phase-b/` (11).

  The push would be the branch's first (`git push -u origin research/study9-phase-b-seven-pool`). The commit, if
  approved, stages only the Phase B paths listed under Environment.
- Never call 2025–2026 an untouched holdout, and never call the 2026-10-30 slice prospective.

## Disclosures (the final report must mention)

- **Amendments (`AMENDMENTS.md`):**
  - **E1:** the parity N2 header compared `doorKey`. Attempt 1 failed and attempt 2 passed.
  - **E2:** the seal's line count overflowed on large caches.
  - **E3:** a seal touched the manifest before refusing a sealed phase. Found by the pre-test audit; never happened.
  - **E4:** the `package.json` scripts break Phase A's own `verify-chain` code pin (verify Phase A at its commit). The
    runner's comparator labels were fixed, the report tables extended and the search end time corrected; the
    acceptance script briefly sat in the pinned `scripts/` directory.
- Two timestamp lapses were corrected earlier (22:40Z → 22:34Z; 00:34Z → 00:33Z); E2's heading time is approximate.
- **npm test:** 7 pre-existing failures. Six are from the user's rename of `src/app/allin-original.ts` (commit
  `86d2b2d`); one is the Study 7 runner parity test after Phase A's 2026-10-30 append.
- **Study 8's `verify-chain`** stops at its data pin (pre-existing, from Phase A's append).
- **Exposure:** everything through 2026-10-29 was inspected before Phase B.
- **Execution:** ILF and EDV are not executable at $100k on minute liquidity; the $35k ceiling is not a broker stop;
  the user's core portfolio is not modelled.

- **E5:** the runner was drafted 06:30–06:44Z during test-F19/F20 and first run at 09:01:55Z, overlapping the sealed
  diagnostics stage; no exposure. It also corrects E3/E4 and records the final audit's resolutions.
- Two sealed files quote approximate times: `reviews/FINAL_AUDIT_RESOLUTION.md` says the findings were resolved
  "10:00Z–10:20Z", and `RUN_COMMANDS.md` lists the seal "after 10:20". The seal actually ran at 10:18:38Z.

## Final deliverables (sha256, first 16 hex; recomputed after the seal)

`README.md` `4eaee6c8ace043f4`, `RECOMMENDATION.md` `0ba1ef92b890fcde`, `EXECUTION_RISK_AND_LIQUIDITY.md`
`bc5d9acaa2fad29e`, `POOL_COMPLEMENTARITY_AND_LEDGER.md` `69cfb53721e1e540`, `CHRONOLOGICAL_VALIDATION.md`
`bc5564d1a1c7f90d`, `AMENDMENTS.md` `b69a6dc53e42a0c9`, `reviews/FINAL_AUDIT.md` `fb8c00f04918b990`,
`reviews/FINAL_AUDIT_RESOLUTION.md` `57326f6b32733d8c`, `results/chain.jsonl` `c9d62a0719650023`,
`results/doors.jsonl` `8b93e1ac7010269b` (114 door openings, unchanged since chain 18). Every other sealed file's
hash is in `results/chain.jsonl` entry 19.

## Recovery log

- 2026-11-03T09:14Z: recovered after a context compaction. Reread `CLAUDE.md`, the guide and this checkpoint. No
  process was running; the chain verified.
