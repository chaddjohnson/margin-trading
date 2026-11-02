# Study 8 — execution and integrity

All times UTC, 2026-11-01. Everything ran in the worktree `/home/chad/projects/margin-trading-study8`, on branch
`research/study8-expanded-regime-d1`, based on `bce526f`. Nothing is committed: the brief requires the user's separate
approval.

## 1. The study freeze without Git: a local hash chain plus integrity pins

**The chain.** `results/chain.jsonl` lists the phases in order. Each entry holds:
- the sha256 of every record of its phase;
- the door log's sealed prefix (line count and hash);
- the previous entry's hash and its own hash.

Every door and stage command re-verifies the whole chain, and every door opening records the chain head it saw.

**The pins.** They were fixed at the freeze (`results/protocol_freeze.json`) and re-checked by every door and stage:
- the code digest of `src/study8-expanded-regime-d1/`;
- the digest of the shared engine files plus the namespace's transitive import closure (140 files);
- the full-file sha256 of the five data files, `data/partitions.json`, `splits.json`, `distributions.csv` and its
  manifest;
- the numeric rulebook.

**Limits.** This is a local integrity mechanism, not a signature, an external notarization or a commit-backed record.
Deleting the chain and the door log together, or re-running the whole study, cannot be prevented locally. The chain
head was therefore copied into `AMENDMENTS.md` (chain-head log) and the checkpoint after each phase. The audit-phase
head and the audit report's sha256 were also given to the user in the conversation before the first test door opened.

| # | Phase | Sealed at | Entry hash |
|---:|---|---|---|
| 1 | protocol (`PROTOCOL.md`, freeze record, both review files, code tarball, AMENDMENTS snapshot) | 15:46:01Z | `19e9913b07894adae626143e29754f404464a9810710f74d8970033aae9089a1` |
| 2 | code-E1 (acknowledged post-freeze fix of parity P5) | 15:56:15Z | `91bb0a857309d7e2054bea0fd4ac192c1b71342c7a1435b47992b2f761ac9a6c` |
| 3 | parity (attempt 2, every gate passed) | 16:06:07Z | `aa9e27260c3fb325e24f3480e208cc78c0e53d06984afee5dd6b23ae646c93d7` |
| 4 | search (30 records + archives) | 21:08:49Z | `e1befdcb18a87aebad9ad2e4491dbb92d0a42d6edf096861c612e9bacd5aa3a4` |
| 5 | qualify (30 records) | 21:23:05Z | `580a0fc9294d8eb781fb513e037ecc66c70cbc47d068ae139dff704487f04292` |
| 6 | selection (`FROZEN_SELECTION.json`) | 21:23:06Z | `77e37e7466cc02301f60bf2dae29497b41ffcdfad840fbf3b63521a6888e05a0` |
| 7 | audit (`reviews/PRE_TEST_AUDIT.md`, CLEARED) | 21:40:13Z | `9d60be5e83ea00569a1677d0f1beeb8527d5a3786f38cd6898c8881914370104` |
| 8 | test-F19 (`test.json` `aab77e67…`) | 21:52:05Z | `9b049017c65e0cc5b8c093595d1a1d12b31a826860b31058a0668d5d186ee924` |
| 9 | test-F20 (`c2d33b7a…`) | 22:06:50Z | `ba95ed7639f793a6058fa8c66420a0728e2e59b819543b5a0e88c8e285641c1b` |
| 10 | test-F21 (`4d435d72…`) | 22:23:09Z | `06f643a6a78c675d229a17198f137674b18e922a688ef4c2e5233d63d6a0300d` |
| 11 | test-F23 (`e8779299…`) | 22:39:21Z | `4fe8b6d4c12cbdadbca4097461d4ebf9fa5ed6d7bfd8dfe32b88fc5563dc4f70` |
| 12 | test-F24, the one-time primary door (`4053d842…`, body `f85b4d7a6c17…`) | 23:03:10Z | `eddc7992746ab33269c16f7fce5bf91821e7424e31c4b51620c33526291d90a6` |
| 13 | test-F24-confirm (`confirm.json` `337c6812…`; `identical: true`) | 23:27:28Z | `cd3dbb5f4d41967d4eb26d1989fed0e6d133da22d8f27911ff6aac2cf8e166ec` |

`npm run study8 -- verify-chain` at 23:27Z reported: "chain OK: 13 entries; integrity OK (code 3d0cb5b82ca1, engine
2b5c5dc4a113, accepted by E1)".

## 2. Reviews and audits

| Review | When | Verdict | File |
|---|---|---|---|
| Independent methodology review (fresh agent, read-only) | 15:08:50Z | no critical issue; 6 major, 25 minor, 5 notes, all resolved before the freeze (`PROTOCOL.md` §13) | `reviews/METHODOLOGY_REVIEW.md` |
| Verification pass (same agent) | 15:38:36Z | M2–M6 resolved; M1 gap and two new majors (N1, N2), resolved before the freeze | `reviews/METHODOLOGY_REVIEW_VERIFICATION.md` |
| Pre-test audit (fresh agent, read-only) | 21:37:46Z | **CLEARED** | `reviews/PRE_TEST_AUDIT.md` |
| Final audit (fresh agent, read-only) | 23:43Z | **PASS WITH CORRECTIONS**; every T-gate status recomputed with 0 mismatches; narrative corrections applied (AMENDMENTS E3) | `reviews/FINAL_AUDIT.md` |

**What the pre-test audit verified:**
- the chain and its 101 sealed files;
- that no test door had opened;
- that every training door was opened once, at its fold's cutoff;
- that E1 was the only code change;
- the recomputation of all 30 track-folds' roles and all five folds' rankings, with 0 mismatches;
- every Q/E flag of 180 candidates and the controls;
- seed-family independence, parity, the exact controls and the sealed rulebook.

Its finding 1 (multiplicity, PBO) shapes the reports.

## 3. Amendments and disclosures (`AMENDMENTS.md`)

- **R0** (pre-freeze record): the review findings and every pre-freeze code change.
- **E1** (amendment, 15:56Z): parity attempt 1 failed P5 only, because the check read Study 7's `DEV`/`VAL` period
  keys, which Study 8 names `TRAIN-F21`/`TEST-F21`.
  - **Preserved:** attempt 1 in `results/parity/attempt-1/` (record body `d0f05d9e09d4…`) and its log
    `results/runlogs/parity-attempt-1.txt`.
  - **Fix:** the keys only. It was acknowledged in the chain (phase `code-E1`, accepted code digest
    `3d0cb5b82ca1…`), and parity was rerun in full as attempt 2. No exposure.
  - **Tooling added after the freeze, outside the pins:** the `study8-run` adapter (`src/study8-runners/`), the frozen
    VXR/VXRG runner configurations, the `study8-run` npm script, and `scripts/build_tables.py`.
- **E2** (disclosures, 21:40Z), from the pre-test audit:
  - E1's two added comment lines;
  - `build_tables.py`;
  - the T0 dry run's use of the F23 test-family labels on frozen configurations only;
  - the inherited-suite results;
  - the test-stage operating rules.

- **E3** (disclosures, 23:49Z), from the final audit:
  - the report corrections;
  - the runner's door-log departure from PROTOCOL §3.2;
  - the runner verification running alongside `--confirm`;
  - what lies outside the chain.

## 4. Stages and processes

| Stage | Window | Result | Notes |
|---|---|---|---|
| Timing pilot | 14:40Z | timing only | pre-freeze door `pilot-F24`; plus the code-path smoke test (booleans only), `results/pilot/` |
| Parity attempt 1 | 15:46–15:55Z | P5 failed (key bug) | preserved |
| Parity attempt 2 | 15:56–16:06Z | all gates pass | `BASELINES_AND_PARITY.md` |
| Search | 16:06:28–21:08:30Z | 30/30 exit 0 | 12 parallel jobs; no watchdog stop, crash or resume; each door opened once |
| Qualification | 21:08:56–21:22:56Z | 30/30 exit 0 | each door opened once |
| Selection freeze | 21:23:06Z | 129 role rows; holders F19 19, F20 27, F21 28, F23 26, F24 26 | |
| Pre-test audit | 21:24:04–21:37:46Z | CLEARED | |
| Test F19 | 21:40:43–21:52:05Z | 0/19 holders not failed | door log: `test-F19` … `test-F23` opened once each, and `test-F24` twice (the one-time test and its deterministic `--confirm`); one fold at a time; `verify-chain` before each |
| Test F20 | 21:52:34–22:06:50Z | 0/27 | |
| Test F21 | 22:07:21–22:23:09Z | 0/28 | |
| Test F23 | 22:23:43–22:39:21Z | 1/26 | |
| Test F24 (primary, one time) | 22:39:52–23:03:10Z | 18/26 (16 pass, 2 ambiguous); outcome *qualified*; primary nominee #1 VG profit | |
| Test F24 `--confirm` | 23:03:52–23:27:28Z | **identical** to `test.json` | fresh memory cache |
| Research configurations | 23:04:43Z | 36 pools + 5 phenotype files, NOT DEPLOYED | `config/research-pools/study8-expanded-regime-d1/`, `config/research-phenotypes/study8-expanded-regime-d1/D1/` |
| Runner verification | 23:04:50–23:14:19Z (while `--confirm` ran; the confirmation stayed identical) | `compare --all` 8/8 reconciliations PASS; off-convention runs report n/a | `RUN_COMMANDS.md` §3 |

## 5. Tests and static checks

- **Study 8 unit tests:** `src/study8-expanded-regime-d1/tests/study8.test.ts`, 12 tests, pass. They cover:
  - the rulebook equal to Study 7's;
  - the dimension-scaled budgets;
  - the lean ranking equal to `selectSurvivors`;
  - fold and door ends, floors and test floors;
  - design determinism and the seed namespace;
  - Wilson bounds;
  - the Q and T gates (strict $35,000, NaN, partial 2026);
  - role assignment with ledger-distinct extras;
  - hash-chain tamper, door-log edit and truncation detection;
  - the door-gate order with integrity pins.
- **Runner unit tests:** `src/study8-runners/tests/runners.test.ts`, 3 tests, pass. The runner was also verified end to end
  on the sealed records (`RUN_COMMANDS.md` §3).
- **Static checks:** `tsc --noEmit` reports no error in the Study 8 files; `eslint` is clean on
  `src/study8-expanded-regime-d1`.
- **Inherited suite** (the `npm test` glob, 21:24:48–21:31:38Z, run in data-less detached worktrees as the
  repository's embargo practice requires):

  | | Tests | Pass | Fail | Cancelled | Skipped |
  |---|---:|---:|---:|---:|---:|
  | Base `bce526f` | 847 | 793 | 9 | 28 | 17 |
  | Head (Study 8 files added) | 862 | 808 | 9 | 28 | 17 |

  The failing and cancelled tests are the same inherited data-dependent suites in both; they need the git-ignored
  market data. **Not all green:** the 9 failures and 28 cancellations are inherited, not caused by Study 8. Logs:
  `results/runlogs/suite-base.txt`, `suite-head.txt`.
- **Ranking benchmark** (synthetic data): 43,520 configurations ranked in 1.4 s (30% feasible) and 11 s (all
  feasible), resident set ≤ 0.43 GB.

## 6. Environment and data

- **Runtime:** Node v24.21.0; 8 physical / 16 logical cores; 59 GB of memory. The job heap is 12 GB.
- **Data:** read-only symbolic links to the main checkout's canonical files (git-ignored, never copied or written).
  - sha256: VGT `624e4094…`, XBI `83b71f75…`, XRT `c625ca57…`, KRE `fd7ab8aa…`, GDX `134b7450…`.
  - 2,722 sessions, 2016-01-04 → 2026-10-29.
  - Pinned and re-checked at every door; no data change occurred during the study.
- **Untouched:**
  - the main checkout: branch `tools/study7-local-runners`, the user's modified market-event files and untracked raw
    files;
  - every frozen phenotype and pool;
  - the Study 5–7 records;
  - the prospective B4/B5 system.
- No broker or API access and no orders.
- **Worktrees:** two temporary data-less worktrees for the inherited suite were created at `bce526f` and removed.
- **Uncommitted Study 8 set** (`git status --short` in the Study 8 worktree at the end):
  - modified: `package.json` (the `study8` and `study8-run` scripts);
  - new: `config/research-phenotypes/study8-expanded-regime-d1/`, `config/research-pools/study8-expanded-regime-d1/`,
    `config/research-pools/study8-local-runners/`, `research/study8-expanded-regime-d1/`,
    `src/study8-expanded-regime-d1/`, `src/study8-runners/`.
  - That is 338 files, about 72 MB in the research directory. The point caches (`results/cache/`, 14 GB) and
    `evaluations/` are git-ignored.
  - The main checkout's uncommitted files are the user's own and untouched: `config/market-events/distributions.*`,
    `config/market-events/raw/vanguard-20261030T184421Z/` and the `._.DS_Store` files.
- **Outside the chain:** the narrative reports, `reviews/FINAL_AUDIT.md` and the generated tables are not sealed. The
  chain's last phase is entry 13, and of `reviews/` it seals the methodology review, its verification and the
  pre-test audit. The reports derive from sealed records and can be regenerated (`scripts/build_tables.py`).
