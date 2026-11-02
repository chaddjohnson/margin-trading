# Study 8 — amendments and disclosures (append-only)

Each entry states its UTC time and kind:
- **amendment:** a rule change after the freeze;
- **disclosure:** an incident or a fact the report must mention, with no rule change;
- **pre-freeze record:** written before the freeze, so the protocol still holds its content.

Each entry also states its reason and exposure. Hash chain: each entry records the sha256 of this file **before** the
entry was appended. A hash of the file after the entry cannot sit inside it. The local hash-chain head
(`results/chain.jsonl`) is copied here after each sealed phase.

## R0 — 2026-11-01T15:45Z — pre-freeze record (independent methodology review and verification)

- **Chain:** first entry (no earlier content).
- **Review:**
  - A fresh, read-only agent reviewed the draft protocol (sha256 `3c4ded12…`) and the code before the freeze. Its
    report is `reviews/METHODOLOGY_REVIEW.md` (sha256 `1a9f212a…`), verbatim.
  - It found **no critical issue**, 6 major (M1–M6), 25 minor (m1–m25) and 5 notes.
- **Verification pass:**
  - The same agent then verified the resolutions against the revised protocol (sha256 `55c29468…`) and code. Its
    report is `reviews/METHODOLOGY_REVIEW_VERIFICATION.md` (sha256 `7168464e…`), verbatim.
  - It confirmed M2–M6, found one gap in M1 (shared imported modules not pinned), two new major issues (N1: ranking
    memory at 32-D/40-D; N2: test-stage code unexercised before a test door, with statuses printed before the seal)
    and six minor notes.
- **Resolution:**
  - Every finding of both passes was resolved in the protocol and code before the freeze. `PROTOCOL.md` §13 lists each
    resolution; the protocol at the time of this entry has sha256 `22eebc37…`.
  - Only the review files' header lines (reviewer description and arrival time, taken from the session transcript)
    were corrected after the first quotation of their hashes (`b2fa75c1…`, `d3c92601…`). The reports' text is
    verbatim.
- **Pre-freeze code changes** in response to the reviews and to the author's own pre-review check:
  - `integrity.ts` (new): pins, including the transitive import closure;
  - the door-log and chain-head bindings (`records.ts`, `data.ts`);
  - the gates (`gates.ts`);
  - the freeze command, which seals both review files (`main.ts`);
  - `seal`'s door-opening count, `acknowledge-code`, and gating of the `pool` and `research-configs` commands
    (`commands.ts`);
  - dimension-scaled budgets, the lean ranking with identical order, and removal of the unused frozen-VGT fallback
    (`search.ts`, `context.ts`);
  - lite evidence, clipping mass, finite E3 and the k = 16 report-only design (`evidence.ts`);
  - non-finite violation treated as infeasible (`fitness.ts`);
  - the partial best year and NaN restored on cache reload (`evaluate.ts`);
  - training ledgers and the PBO comment (`qualify.ts`);
  - role assignment as a pure function with ledger-distinct extras, and the sealed rulebook (`select.ts`);
  - in `test.ts`:
    - the stage as a reusable pipeline with a fresh memory cache;
    - T6 and T7, every shortlist member gated, the Study 7-equivalent gates;
    - persistence, return rank, gap risk and the G-PA comparator;
    - enforced tracker and lot checks, statuses printed only after the seal, the stored `--confirm` result;
  - research-config labels for gated members (`poolrun.ts`);
  - P1 W23, P3 exact sets and W13 rows, N1 stress fills, the grid-only label, the T0 dry-run gate (`parity.ts`);
  - 12 unit tests;
  - the watchdog in `scripts/run_jobs.sh`;
  - the preserved smoke test (`results/pilot/smoke.ts`, `smoke-output.txt`).
- **Exposure:** none.
  - No search, qualification or test had run, and no economic figure of any candidate was seen.
  - The only data doors opened were the two pre-freeze `pilot-F24` openings (door log lines 1–2): the timing pilot,
    and the smoke test that printed booleans.
  - The ranking benchmark used synthetic random configurations only.
- **Disclosure (smoke test):** the smoke script imported Study 6's minute-series module from the main checkout's
  path. The file is byte-identical in both checkouts (sha256 `be94e23c…`).

## E1 — 2026-11-01T15:56Z — amendment (code fix to an engineering check; no rule, seed, threshold or data change)

- **Chain:** sha256 of this file before this entry `6a031cfcacafcce0569bb544f7833346627930c8e52cddcfdeb6796c2535600a`.
  Chain head at the time: entry 1 `protocol` `19e9913b07894adae626143e29754f404464a9810710f74d8970033aae9089a1`.
- **What happened:**
  - The first `npm run study8 -- parity` (15:46:01Z–15:55:14Z) wrote `results/parity/parity.json` with `passed: false`
    and stopped, as the protocol requires. Every gate passed except **P5**: P4, P1 (147 replay-versus-engine
    comparisons, 0 differences), P2, P3 (27/27 W29 and 27/27 W13 Study 7 rows to the cent; B5 anchors), N1 (110
    checks), C1, D1, T0 and G1.
  - P5 failed because its code read Study 7's period keys `DEV` and `VAL`, which Study 8's period list does not have
    (it names those windows `TRAIN-F21` and `TEST-F21`). The six re-run GDX controls therefore had `undefined` period
    figures.
  - Their other P5 fields matched: IDs, grids against Study 5, and minute drawdowns exactly to the dollar
    (e.g. G-PA 34,133.92 both). The registry check passed for all five books.
  - This is a defect in the check, missed when adapting Study 7's parity code; it is not an engine or provenance
    discrepancy.
- **Preserved, not deleted:**
  - attempt 1's record `results/parity/attempt-1/parity.json` (sha256 `769bf7b2…`, body `d0f05d9e09d4…`);
  - its restart-probe outputs `results/parity/attempt-1/restart/`;
  - its log `results/runlogs/parity-attempt-1.txt` (sha256 `89792d2a…`).
  - No chain phase was sealed for it.
- **Change:** `src/study8-expanded-regime-d1/parity.ts`, P5 only: the keys are `TRAIN-F21` (= Study 5's DEV,
  2017-06-15 → 2021-12-31) and `TEST-F21` (= Study 5's VAL, 2022-01-01 → 2023-12-31, the same sessions on the W23
  door). One header comment line was updated too. A diff against the frozen tarball shows only these lines. The code
  change is acknowledged in the chain as phase `code-E1`.
- **Rerun:** parity is rerun **in full**, with the original configuration and seeds, as attempt 2. It is labelled so
  in `BASELINES_AND_PARITY.md` and the checkpoint.
- **Exposure:** none. Parity reads only the frozen configurations and known anchors. No search, qualification or test
  had run.
- **Also after the freeze (tooling outside the pinned code, deciding nothing):**
  - `src/study8-runners/` (the `study8-run` adapter, its README and tests);
  - `config/research-pools/study8-local-runners/S8R-VXR-frozen.json` and `S8R-VXRG-frozen.json` (B5's books
    verbatim);
  - the `study8-run` script in `package.json`.
  - **Departure from the review note:** the adapter requires the sealed `test-F24` phase but does not append to the
    study's door log. A user run must not modify the study's records; each run's `runner.json` is its provenance.

## Chain-head log (appended after each sealed phase)

- 2026-11-01T15:46:01Z: protocol, entry 1 `19e9913b07894adae626143e29754f404464a9810710f74d8970033aae9089a1`
- 2026-11-01T15:56:15Z: code-E1, entry 2 `91bb0a857309d7e2054bea0fd4ac192c1b71342c7a1435b47992b2f761ac9a6c`
- 2026-11-01T16:06:07Z: parity (attempt 2), entry 3 `aa9e27260c3fb325e24f3480e208cc78c0e53d06984afee5dd6b23ae646c93d7`
- 2026-11-01T21:08:49Z: search (30 jobs, each door opened once), entry 4 `e1befdcb18a87aebad9ad2e4491dbb92d0a42d6edf096861c612e9bacd5aa3a4`
- 2026-11-01T21:23:05Z: qualify (30 jobs, each door opened once), entry 5 `580a0fc9294d8eb781fb513e037ecc66c70cbc47d068ae139dff704487f04292`
- 2026-11-01T21:23:06Z: selection (FROZEN_SELECTION.json body `5d266eeaccb3…`), entry 6 `77e37e7466cc02301f60bf2dae29497b41ffcdfad840fbf3b63521a6888e05a0`

## E2 — 2026-11-01T21:40Z — disclosures (no rule change), from the pre-test audit

- **Chain:** sha256 of this file before this entry `44c6b1c3d0c5eadce4947e03c3e522a8fd5831d5bf7657da27395804cbd51b11`.
  Chain head at the time: entry 6 `selection` `77e37e7466cc02301f60bf2dae29497b41ffcdfad840fbf3b63521a6888e05a0`.
- **E1's diff, completed:** besides the header comment and the four P5 key reads, E1 added two inline comment lines
  explaining the mapping (`parity.ts` lines 419–420). There was no functional change beyond what E1 states. The live
  code equals `results/freeze/code-E1.tar.gz` (code digest `3d0cb5b82ca1…`).
- **Post-freeze file outside the pins:** `scripts/build_tables.py`, the report-table generator. It reads only sealed
  records, writes only `results/tables/*.md` and decides nothing.
- **Parity T0 used the F23 test-family labels** `('test', 'sets', 'F23', rep)` on frozen configurations only (VG,
  G-NM1, B5, B1, G-PA), on a parity door ending 2024-12-31. Only booleans and counts were kept. Offsets depend on
  labels, not data, and no Study 8 candidate was evaluated.
- **Inherited suite** (`npm test` glob, data-less detached worktrees at `bce526f`, 21:2x–21:31Z; logs
  `results/runlogs/suite-base.txt` and `suite-head.txt`):
  - base: 847 tests, 793 pass, 9 fail, 28 cancelled, 17 skipped;
  - head (Study 8 files copied in): 862 tests, 808 pass, the **same** 9 fail, 28 cancelled and 17 skipped.
  - The failures and cancellations are the inherited data-dependent suites (no data files present). The 15 added tests
    (12 Study 8, 3 runner) pass.
- **Pre-test audit:** `reviews/PRE_TEST_AUDIT.md`, verbatim, verdict **CLEARED**, sealed next by `record-audit`. Its
  finding 1 (multiplicity: PBO > 0.5 in 20 of 30 track-folds; 25 of 26 F24 holders in the "strong" tier) is carried
  into the reports. Every F24 survivor is presented as surviving a sequential veto, not as a predictively ordered
  ranking.
- **Test-stage operations** (audit finding 5): each fold runs alone; `verify-chain` runs before each fold and its
  chain entry is confirmed before the next. Free disk space was 573 GB at 21:39Z.
- 2026-11-01T21:40:13Z: audit (PRE_TEST_AUDIT.md sha256 `2070d957…`, CLEARED), entry 7 `9d60be5e83ea00569a1677d0f1beeb8527d5a3786f38cd6898c8881914370104`
- 2026-11-01T21:52:05Z: test-F19 (0/19 holders not failed), entry 8 `9b049017c65e0cc5b8c093595d1a1d12b31a826860b31058a0668d5d186ee924`
- 2026-11-01T22:06:50Z: test-F20 (0/27 holders not failed), entry 9 `ba95ed7639f793a6058fa8c66420a0728e2e59b819543b5a0e88c8e285641c1b`
- 2026-11-01T22:23:09Z: test-F21 (0/28 holders not failed), entry 10 `06f643a6a78c675d229a17198f137674b18e922a688ef4c2e5233d63d6a0300d`
- 2026-11-01T22:39:21Z: test-F23 (1/26 holders not failed), entry 11 `4fe8b6d4c12cbdadbca4097461d4ebf9fa5ed6d7bfd8dfe32b88fc5563dc4f70`
- 2026-11-01T23:03:10Z: test-F24, the one-time primary door (18/26 holders not failed: 16 pass, 2 ambiguous), entry 12 `eddc7992746ab33269c16f7fce5bf91821e7424e31c4b51620c33526291d90a6`
- 2026-11-01T23:27:28Z: test-F24-confirm (IDENTICAL to test.json), entry 13 `cd3dbb5f4d41967d4eb26d1989fed0e6d133da22d8f27911ff6aac2cf8e166ec`

## E3 — 2026-11-01T23:49Z — disclosures (no rule change), from the final audit

- **Chain:** sha256 of this file before this entry `056a25d878973020b3c33a568aee662283c3e9f680baf2a353096faac91c5b3a`.
  Chain head at the time: entry 13 `test-F24-confirm` `cd3dbb5f4d41967d4eb26d1989fed0e6d133da22d8f27911ff6aac2cf8e166ec`.
- **Final audit:** `reviews/FINAL_AUDIT.md`, verbatim, verdict **PASS WITH CORRECTIONS**.
  - It verified the chain, 71 sealed bodies, the door order, the identical confirmation, and every holder's and member's
    T1–T7 status in all five folds (0 mismatches). The report tables match the records.
  - Its corrections to narrative ranges and generalisations were applied to the reports (not to any sealed record):
    - README, RECOMMENDATION, CHRONOLOGICAL_VALIDATION, NEIGHBORHOOD_ROBUSTNESS, RISK_AND_TRADE_SEQUENCING,
      SEARCH_AND_COMPUTE, EXECUTION_AND_INTEGRITY and RUN_COMMANDS;
    - hypothesis H3 is now reported as not supported;
    - the B1/B5 exposure and the non-decisional Study 7 comparison are restated where the comparisons appear.
- **Departure from PROTOCOL.md §3.2:** §3.2 says the `study8-run` adapter's runs are logged in the door log. The
  adapter instead requires the sealed `test-F24` phase and records each run's provenance in its own `runner.json`. A
  user run must not modify the study's records. (E1 described this only as a departure from a review note.) The
  study's own `pool` command does log to the door log, as §3.2 says.
- **Timing:**
  - the runner verification and `research-configs` ran (23:04:50–23:14:19Z) while F24 `--confirm` ran
    (23:03:52–23:27:28Z), and the confirmation stayed identical;
  - E2's "21:2x" is 21:24:48Z (the inherited suite started); the pre-test audit ran 21:24:04–21:37:46Z.
- **Outside the chain:** the narrative reports, the generated tables and `reviews/FINAL_AUDIT.md` are not sealed.
  The chain's last phase is entry 13.
- **No separate `inspect` command.** The brief asks for list / inspect / run. `study8-run list` shows each alias's
  rank, books, status and configuration, and the configuration JSON holds the full parameters and provenance.
