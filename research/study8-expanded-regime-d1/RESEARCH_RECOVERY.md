# Research recovery checkpoint — Study 8: expanded-regime stability-first D1 reoptimization

## Top screen (read this first)

All times UTC. **Run every command from the Study 8 worktree `/home/chad/projects/margin-trading-study8`.** Do not run
commands from the main checkout `/home/chad/projects/margin-trading`, which stays on `tools/study7-local-runners` and
must not be touched.

- **Updated:** 2026-11-01T23:49Z. **Status: COMPLETE.**
  - Every stage is sealed in the local hash chain (13 entries, verified); the final independent audit is done (PASS
    WITH CORRECTIONS, corrections applied).
  - **Nothing is committed.**
  - **Follow-up gate:** the user's separate decision whether to commit and push Study 8. No merge, PR or deployment
    either way.
  - Recovery after a compaction at about 14:45Z: reread the brief, the checkpoint and the protocol, and checked the
    files on disk; no process was running.
- **Brief:** `brief/ASSIGNMENT.md`, sha256 `196ada5320ed71f4fdb8c9664bd38ab7d2214043581a289e78c3be7e90eb278a` (205 lines,
  31,858 bytes, read in full including its final section; reread at 14:46Z).
  - **Git:** the brief forbids commit, push, merge and PR without a separate explicit user request. The study freeze is
    a local SHA-256 hash chain plus integrity pins, which is not a commit-backed record.
- **Mechanical result** (sealed `results/test/F24/test.json`, sha256 `4053d842…`, body `f85b4d7a6c17…`; confirmed
  identical by `confirm.json` `337c6812…`):
  - Outcome **qualified**: 18 research nominations among 26 F24 role holders, 16 pass and 2 ambiguous (#12 G profit,
    #26 V extra).
  - **Primary nominee: #1 VG profit** (`VGT:d1-f41ebcd961` + `GDX:d1-016d8e4257`;
    `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-1.json`).
  - Procedure folds, holders not failed: F19 0/19, F20 0/27, F21 0/28, F23 1/26.
  - It is research only and NOT DEPLOYED. The evidence is a retrospective look at previously inspected history
    (`RECOMMENDATION.md`).
- **Authority (frozen 2026-11-01T15:46:01Z):**
  - `PROTOCOL.md` sha256 `22eebc3704c56d4637ebf1895f1e05780ce1a59477ed491b3efb9e76799513b6`;
  - `results/protocol_freeze.json` file `518c7bde…`, body `de05426ac17b…`;
  - pinned code digest at the freeze `b94fc38b413d…`; **accepted code digest after E1 `3d0cb5b82ca1…`** (chain entry 2
    `code-E1`); engine plus import-closure digest `2b5c5dc4a113…` (140 files, unchanged); rulebook `ff6e9d57b6e8…`;
  - code tarball `results/freeze/code-protocol.tar.gz` `8c4042aa…`;
  - `FROZEN_SELECTION.json` `88d079d1…` (body `5d266eeaccb3…`);
  - amendments head **E3** (AMENDMENTS.md `8fcd3577…`): R0 pre-freeze, E1 code fix, E2 and E3 disclosures, chain-head
    log.
- **Chain head:** entry 13 `test-F24-confirm` `cd3dbb5f4d41967d4eb26d1989fed0e6d133da22d8f27911ff6aac2cf8e166ec`. Every
  entry is listed in `EXECUTION_AND_INTEGRITY.md` §1 and the AMENDMENTS chain-head log. `npm run study8 --
  verify-chain` reports "chain OK: 13 entries; integrity OK".
- **Audited deliverables** (sha256 prefixes at 23:49Z):

  | File | sha256 |
  |---|---|
  | README.md | `7817542c…` |
  | RECOMMENDATION.md | `dd669e2a…` |
  | CHRONOLOGICAL_VALIDATION.md | `cd49f0b7…` |
  | NEIGHBORHOOD_ROBUSTNESS.md | `8f918e09…` |
  | RISK_AND_TRADE_SEQUENCING.md | `dc8b7cf4…` |
  | SEARCH_AND_COMPUTE.md | `f122fa45…` |
  | BASELINES_AND_PARITY.md | `aa8ac45a…` |
  | EXECUTION_AND_INTEGRITY.md | `750e5958…` |
  | RUN_COMMANDS.md | `22b5e8a5…` |
  | reviews/METHODOLOGY_REVIEW.md | `1a9f212a…` |
  | reviews/METHODOLOGY_REVIEW_VERIFICATION.md | `7168464e…` |
  | reviews/PRE_TEST_AUDIT.md | `2070d957…` |
  | reviews/FINAL_AUDIT.md | `0181a7ae…` |

  Also: 36 research configurations plus 5 phenotype files (NOT DEPLOYED), the `study8-run` adapter, and
  `results/tables/*.md`.
- **Running process:** none.
- **Next action:** none inside the study. Ask the user whether to commit/push. **Do not commit without an explicit
  request.** If they ask:
  - commit the Study 8 set on `research/study8-expanded-regime-d1` (338 files plus `package.json`; `results/cache/`
    and `evaluations/` are git-ignored);
  - push only that branch.
- **Data:** the main checkout's data may now be refreshed. The pins only stop the study's own stages, which are all
  done; the runner reconciles only at 2026-10-29 / 5 bps and reports "not applicable" otherwise.

## 1. Environment

- **Worktree:** `/home/chad/projects/margin-trading-study8`, branch `research/study8-expanded-regime-d1` (new, local
  only). It was created 2026-11-01T14:30Z with `git worktree add -b research/study8-expanded-regime-d1
  /home/chad/projects/margin-trading-study8 bce526f`.
- **Base commit:** `bce526fb25250b9828f7a77f49c5701299c80577`. It is the Study 7 runner head (`tools/study7-local-runners`,
  pushed). It descends from the Study 7 head `544c268`. The brief describes the runner as uncommitted; in fact it was
  committed and pushed at the user's explicit request before Study 8 began (`1ecc8e3`, `bce526f`).
- **Main checkout** `/home/chad/projects/margin-trading`: untouched.
  - It stays on `tools/study7-local-runners` (clean except the user's own files).
  - Modified: `config/market-events/distributions.csv` and `distributions.manifest.json`.
  - Untracked: `config/market-events/raw/vanguard-20261030T184421Z/` and the `._.DS_Store` files.
- **Data access:** read-only symbolic links in the worktree point at the main checkout's canonical files:
  `data/{VGT,XBI,XRT,KRE,GDX}` → `/home/chad/projects/margin-trading/data/<SYM>`. They are git-ignored, nothing is
  copied, and nothing writes to `data/`.
  - `data/VGT/data.csv`: sha256 `624e4094a988bd01…`
  - `data/XBI/data.csv`: `83b71f75a58a01c8…`
  - `data/XRT/data.csv`: `c625ca57b1bf6219…`
  - `data/KRE/data.csv`: `fd7ab8aa365cbb86…`
  - `data/GDX/data.csv`: `134b74506f190f43…`
  - `node_modules` → the main checkout's `node_modules`.
- **Market-event files in the worktree:**
  - The worktree has the **committed** `config/market-events/distributions.csv` (`3b4342eb…`). The main checkout holds
    the user's modified copy (`30feaa99…`), which Study 7 read.
  - The fixed $100k pool books no distributions, and parity checks equality with Study 7's sealed figures.
  - Splits `e5bde427…`; partitions `43893f3d…`.
- **Runtime:** Node v24.21.0; 16 logical CPUs (8 cores); 59 GB RAM.

## 2. Stage table

All commands run from `/home/chad/projects/margin-trading-study8` with Node v24.21.0 on `PATH`.

| Stage | Status | Command | Outputs / notes |
|---|---|---|---|
| Phase 0 inventory, worktree | complete | — | §1 |
| Code (`src/study8-expanded-regime-d1/`, 21 files) | frozen (digest `b94fc38b413d…` at the freeze; `3d0cb5b82ca1…` accepted after E1) | — | `tsc`, lint clean; unit tests 12/12 (15:45Z) |
| Timing pilot | complete (pre-freeze, timing only) | `npm run study8 -- pilot` | `results/pilot/pilot.json` (file sha `b639a32a…`, body `e08334c50583…`); door log lines 1–2; smoke test `results/pilot/smoke.ts`, `smoke-output.txt` |
| Methodology review and verification | complete | fresh agent, two passes | `reviews/METHODOLOGY_REVIEW.md`, `reviews/METHODOLOGY_REVIEW_VERIFICATION.md`; resolutions in `PROTOCOL.md` §13 and `AMENDMENTS.md` R0 |
| Freeze | **complete** 15:46:01Z | `npm run study8 -- freeze-protocol` | chain entry 1 `19e9913b…` |
| Parity | **complete**: attempt 1 15:46–15:55Z failed P5 only (key bug; E1, preserved in `results/parity/attempt-1/`); attempt 2 15:56–16:06Z all gates pass; chain entry 3 | `npm run study8 -- parity` | `results/parity/parity.json`, chain phase `parity`; log `results/runlogs/parity.txt`; write-once (cannot rerun) |
| Search (30 jobs) | **complete** 16:06:28Z → 21:08:30Z, 30/30 exit 0 | launch in the background, as one line: `cd /home/chad/projects/margin-trading-study8 && research/study8-expanded-regime-d1/scripts/run_jobs.sh research/study8-expanded-regime-d1/scripts/jobs-search.txt 12 > research/study8-expanded-regime-d1/results/runlogs/orchestrator-search.txt 2>&1` | `results/search/<track>/<fold>/search.json`; resumable from `results/cache/` (rerun the same command; repeated door openings need an AMENDMENTS entry and `seal search --acknowledge <ID>`); 45-minute watchdog |
| Seal search | **complete** 21:08:49Z, chain entry 4 `e1befdcb…` | `npm run study8 -- seal search` | chain phase `search` |
| Qualify (30 jobs) | **complete** 21:08:56–21:22:56Z, 30/30 exit 0 | `cd /home/chad/projects/margin-trading-study8 && research/study8-expanded-regime-d1/scripts/run_jobs.sh research/study8-expanded-regime-d1/scripts/jobs-qualify.txt 12 > research/study8-expanded-regime-d1/results/runlogs/orchestrator-qualify.txt 2>&1` | `results/qualify/<track>/<fold>/qualification.json` |
| Seal qualify, freeze selection | **complete** 21:23:05Z / 21:23:06Z, entries 5–6 | `npm run study8 -- seal qualify`; `npm run study8 -- freeze-selection` | `FROZEN_SELECTION.json` |
| Pre-test audit | **complete** 21:24:04–21:37:46Z, CLEARED; sealed 21:40:13Z, entry 7 | fresh agent, then `npm run study8 -- record-audit <report>` | `results/audit/pre_test_audit.json` |
| Tests | F19 sealed 21:52:05Z (entry 8, 0/19); F20 sealed 22:06:50Z (entry 9, 0/27); F21 sealed 22:23:09Z (entry 10, 0/28); F23 sealed 22:39:21Z (entry 11, 1/26); F24 sealed 23:03:10Z (entry 12, 18/26 not failed); F24 --confirm identical, sealed 23:27:28Z (entry 13) | `npm run study8 -- test F19` … `F24`, then `test F24 --confirm` | `results/test/<fold>/test.json` |
| Inherited suite | complete 21:24:48–21:31:38Z (data-less worktrees, removed) | `npm test` glob | base 847/793 pass/9 fail/28 cancelled/17 skipped; head 862/808/9/28/17 (same failures, inherited); logs `results/runlogs/suite-*.txt` |
| Research configs, runner, reports, final audit | **complete**: configs 23:04:43Z; runner verified 23:04:50–23:14:19Z (`RUN_COMMANDS.md` §3); reports written; final audit 23:43Z PASS WITH CORRECTIONS, applied (AMENDMENTS E3) | — | `reviews/FINAL_AUDIT.md` |

**Pre-freeze code changes made after the pilot** (no outcome seen): best-year concentration counts a `~partial`
year (`evaluate.ts`); a count-matched k = 16 report-only design for pools of three or more books, and Study 8 period
keys in the neighbourhood period table (`evidence.ts`). The review-driven changes are listed in `AMENDMENTS.md` R0.

## 3. Guards

- Never edit:
  - frozen phenotypes or pools;
  - the Study 5–7 records and configs;
  - `data/` (symlinked: read only);
  - market events;
  - the prospective system;
  - the main checkout or the `tools/study7-local-runners` branch.
- Never commit, push, merge or open a PR without the user's explicit request.
- **Sealed by the chain** (an edit fails `verify-chain`):
  - `PROTOCOL.md`, `results/protocol_freeze.json`, `results/freeze/*`;
  - three review files: METHODOLOGY_REVIEW, METHODOLOGY_REVIEW_VERIFICATION, PRE_TEST_AUDIT. `FINAL_AUDIT.md` and the
    narrative reports are outside the chain;
  - every record of a sealed phase;
  - the door log's sealed prefix.
- **Pinned** (any change stops every stage until `acknowledge-code <ID>` after an AMENDMENTS entry):
  - `src/study8-expanded-regime-d1/**`;
  - the 140 shared source files it imports.
  - Data and rulebook changes have no acknowledgement path.
- **Do not rerun:**
  - the pilot (its door is closed after the freeze);
  - the freeze;
  - parity (write-once);
  - any search or qualification job whose log ends `exit 0`;
  - any test fold whose `test.json` exists. All five are sealed, as is the confirm.
  - **Nothing in the study may be rerun or re-opened.** 2025-01-02 → 2026-10-29 is now exposed for any future
    optimization study.
- `AMENDMENTS.md` is append-only.

## 4. Disclosures for the final report

- **E1:** parity attempt 1 failed P5 on a key-name bug; it was preserved, fixed, acknowledged in the chain and rerun
  in full.
- **E2:** E1's two added comment lines; `build_tables.py` written after the freeze; T0 used the F23 test labels on
  frozen configurations only; inherited suite results (9 inherited failures and 28 cancellations in both base and
  head).
- **E3:**
  - the final audit's corrections;
  - the `study8-run` adapter does not log to the door log (a departure from PROTOCOL §3.2);
  - the runner verification ran alongside `--confirm`;
  - what lies outside the chain;
  - there is no separate `inspect` command.
- **Brief discrepancy:** the brief described the Study 7 runner as uncommitted; it had been committed and pushed at the
  user's request before Study 8 began.
- **Exposure:** 2025–2026 was previously inspected; the nominations are retrospective chronological persistence, not
  independent validation. B1 and B5 are not out of sample on that window either.
