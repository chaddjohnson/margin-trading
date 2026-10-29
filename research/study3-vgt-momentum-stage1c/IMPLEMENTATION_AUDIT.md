# Implementation audit — Study 3, Stage 1c

(Sections 1–4 written before any outcome; §5 onward completed after the sealed stages; corrections from the final
audit, `reviews/FINAL_AUDIT.md`, are marked "corrected after the final audit".) The study evaluated 5,114,598
configurations (5,111,641 in development).

## 1. Git lineage and scope

- Branch `research/study3-vgt-momentum-stage1c`, created 2026-10-29T13:53Z in the clean main checkout from
  `2a7996ddd5585849964a795151ac7a80d56f419f` = `origin/research/study3-vgt-momentum-stage1b` after `git fetch` (it
  contains Stage 1b's completion commit `70257acc…` and Stage 1's head `db6a3ec8…`). No other worktree was used for the
  work; a detached, data-less scratch worktree served only the project test suite.
- Recovery policy: `3ef43015…` (policy-only commit on `main`) is not an ancestor of the Stage 1b head, but `CLAUDE.md`
  and `docs/claude/context-recovery.md` are byte-identical on Stage 1b, `main` and that commit, and both loaded in this
  session; nothing was cherry-picked or merged.
- Scope guard: every stage computes `git status --porcelain --untracked-files=all` and `git diff --name-only
  2a7996dd`, refuses to seal if any path lies outside `research/study3-vgt-momentum-stage1c/` and
  `src/study3-vgt-momentum-stage1c/`, and stores the git `HEAD` and that filtered `outside` list (empty in every
  record) — not the full porcelain status (corrected after the final audit).

## 2. Data embargo

- One input file, `data/VGT/data.csv`, through a bounded reader (`src/study3-vgt-momentum-stage1c/data.ts`): raw byte
  lines; only the first 32 bytes of a line are decoded to recognise its timestamp and UTC date; the first line at or
  after the bound (end + 2 days) stops the read before tokenising; no split file is read. The audit proves dataset
  identity with Stage 1b for all five ends (loaded-bar sha256 equal) and records each stop as "first line with UTC
  date ≥ <bound>" with the prefix byte count and sha256. One door per process; workers refuse a dataset past their
  door; a later end is refused before any byte is read.
- **Disclosed incidents.** (a) At the session start `sha256sum data/VGT/*` hashed the data file and the two JSON reports
  once (bytes only). (b) The first baseline `npm test` (2026-10-29 14:23:14–14:25:36Z) ran in the main checkout with
  `data/` present: other studies' real-data regression tests (B4/B5 pools on the `all` dataset, allocator parity,
  phenotype injection, whole-file hashes) read VGT bars after 2023; no Stage 1c code ran and only pass/fail lines were
  read (791 / 784 / 7, the inherited failures). Stage 1b's audit did the same. All later suite runs used a detached
  worktree without `data/` (first attempt hung on data-waiting suites and was stopped at 14:49Z; rerun with
  `--test-timeout=180000`: 748 / 697 pass / 8 fail / 28 cancelled / 15 skipped). (c) Review 2's text mentions a 2026
  VGT split recorded in `config/market-events/splits.json` (never read by Stage 1c code).
- Development stages load only through their development end; `evaluate` and `robustness` through 2023-12-29.

## 3. Reviews and freezes

- Methodology review 1 (selection/statistics) and review 2 (execution/causality/embargo) of v1.0, re-review 3 of v1.1,
  each in a separate read-only agent context; verbatim with dispositions in `reviews/`. Review 2 found one blocker (the
  in-checkout test suite), adopted; re-review 3 found two majors (E10 under a cooldown; the Π-NET-off comparator),
  adopted before the freeze.
- Protocol v1.2 frozen 2026-10-29T15:22:58Z (`PROTOCOL_FREEZE.json` sha256 `540697db…`, body `9c82742a…`), binding
  PROTOCOL, ENGINE_CONTRACT, EXPERIMENT_MATRIX v1.1 (and its generator), MECHANISM_CATALOG, the brief and the three
  disposition files.
- The reference engine (`src/study3-vgt-momentum-stage1c/reference.ts`) was written after the freeze in a separate
  agent context from `reviews/REFERENCE_AUTHOR_BRIEF.md`, starting from Stage 1b's independent reference for §1–§10,
  without reading the fast engine; notes in `reviews/REFERENCE_AUTHOR_NOTES.md`.

## 4. Tests before outcomes

- `src/study3-vgt-momentum-stage1c/tests/rules.test.ts` (synthetic only): 36 tests covering brief §8 (A eligibility
  across weekends, a holiday, early close, delays and intraday fills; net at the open just above/below zero; repeat
  opens; stop-gap and first-minute stop precedence; both fill modes; slippage; B with C = 0, profitable
  exits, discarded decisions, intraday freeze/restart and E10's ratchet, a consumed record, the S1 boundary in persist
  and reset, the adoption label; C's arming, tolerance, gap fills, interest-only losses, consumption and refresh,
  C-cross, B + C; rules off = Stage 1b bit for bit; inert rules; all masks; identities; the door and bounded reader
  with a poisoned tail; the matrix arithmetic).
- Synthetic dry run of develop (3 pairs) → evaluate → robustness → analysis → report tables, written into a temporary
  `STAGE1C_ROOT` tree: guards 0, b-marks equal, ledger identities clean. It found and fixed one matrix bug (`nulls`
  placement) before the freeze.
- Synthetic parity rounds before the code freeze: `reviews/PARITY_DEVELOPMENT_LOG.md`.

## 5. Sealed stages, parity, guards

| Stage | Sealed (UTC) | Record sha256 | Notes |
|---|---|---|---|
| audit | 15:04:45 | `0a5dacef9b28…` | five datasets = Stage 1b's loaded-bar hashes |
| freeze-protocol | 15:22:58 | `PROTOCOL_FREEZE.json` `540697db…` | v1.2 |
| parity | 15:48:00 | `39a39cc8bf91…` | fold-A data: rules off vs Stage 1b 1,151 / 0 differences; inert rules 45 / 0; fast vs reference 539 / 0; the same sets on two synthetic markets all 0; coverage union complete (incl. 13 conversions, 1,877 losing-hold exits, 18 B+C blocks); prefix / poisoned-future / truncation guards 0 |
| freeze-code | 15:48:17 | `code_freeze.json` `376330be…` | 87 files, manifest `c0cea391…` |
| develop-A … H | 15:56:46 – 16:55:41 | A `55cc82c6…`, B `09d638bd…`, C `47e300a7…`, D `690cf0c9…`, H `c0e54160…` | 5,111,641 evaluations, each below its cap; peak RSS ≈ 4.8 GB; archives git-ignored |
| evaluate | 16:57:06 | `6d697dd4…` | guards 0; b-marks equal; fast = reference on 48 paths; Stage 1b Π1 and Stage 1 S1 reproduced to the cent |
| robustness | 16:58:11 | `c9b8269f…` | 2,619 evaluations |
| analysis | 16:58:28 | `be873bd2…` | no demonstrated edge (g, f, e2) |

Amendments: A1 (pre-outcome contract clarifications from reference authoring; fast engine aligned on one metadata
field), A2 (post-outcome: the degenerate C-ALR annual-reset control row, unused by the rubric). Disclosed choices: the
parity coverage gate is computed over fold-A data plus two synthetic markets (Stage 1b's "parity ∪ fixtures"
convention); the project test suite runs only data-less (§2).

## 6. Test suite after the study

Data-less detached worktree at `2a7996dd` with `src/study3-vgt-momentum-stage1c/` and the study's frozen files copied
in, `--test-timeout=180000`, finished 2026-10-29T17:12:17Z: **784 tests / 733 pass / 8 fail / 28 cancelled / 15
skipped** against the data-less baseline 748 / 697 / 8 / 28 / 15 — the 36 Stage 1c tests all pass and no new file fails
or is cancelled; the failures and cancellations are the inherited suites that need `data/` or the missing
`src/app/allin-original.ts` (`results/logs/final-tests-dataless.json`, git-ignored; summarised here). TypeScript
`tsc --noEmit` is clean for the repository; ESLint reports 0 errors (7 warnings) on the Stage 1c sources.

## 7. Final audit (independent, read-only) and corrections

`reviews/FINAL_AUDIT.md` (verbatim) recomputed every binding rubric item, the selection, the ledger identities and the
rule mechanics from the sealed payloads and found no discrepancy (agreement with `analysis.json` within 1e-9); its
findings concern the reports and are dispositioned in `reviews/FINAL_AUDIT_DISPOSITIONS.md`. Implementation points it
raised, disclosed here:

- **No explicit synthetic test of B after repeated losses** (brief §8). §4 originally listed "repeated losses" among
  the B tests; no such test exists (corrected after the final audit). The cooldown restarts per losing exit in the
  engine, and the sealed Π1 ledger shows four consecutive losses (trades 8–11) each followed by a correct block window
  (the audit's check of all 127 blocks).
- **Ledger checks are narrower than PROTOCOL §11 (a) suggests:** `ledgerChecks` in `analysis.ts` tests identities (i),
  (ii), (iii), (v), tests (vii) only as "shares ≥ 0 on every daily row", and its executability check covers ordering
  (no entry before the previous exit; no second entry in an exit session except a conversion). It does not assert that
  positions are held only under the active policy, nor B/C compliance. The auditor's own checks of those on Π1, Π1-off
  and Π1-reset found 0 violations.
- **`evaluate` (338 evaluations) and `robustness` (2,619) have no planned count or overrun guard**; their counts are
  recorded. The develop stages have caps and stayed below them.
- **Degenerate annual-reset control rows:** C-ALR (A2) and C-ALZ1 (A3; the Z0 override in `controlResetSchedule`'s
  call replaces Z1). Neither enters the rubric; both are omitted from the tables.
- **Missing-bar stress is weak:** it leaves Π1 at 1% and Π-000 and P\*_H at 1% and 5% unchanged, because the seeded
  removal never drops a session's first bar.
- **Fresh clones:** the develop records list the git-ignored archives as payloads, so `status`/`verify` report the
  develop stages as BROKEN on a clone without them (README "Reproducing").
- **`tsc` / ESLint** (§6) were run by the parent session, not by the auditor: `npx tsc --noEmit` clean, ESLint 0 errors and
  7 warnings on `src/study3-vgt-momentum-stage1c/` (rerun 2026-10-29, finished before 17:38:06Z, same result).
- **`report_tables.py`** (not part of the code freeze) now fails closed on a missing record or payload, verifies a
  develop archive's sha256 before reading it, runs from any working directory, and adds the H Pareto set
  (`pareto-H.md`), drawdown peak/trough dates, rule × stop grids (`rule-stop-grids.md`) and ledger fill columns. A
  stray header-only copy of six tables created by an earlier run from the wrong directory was deleted before the
  commit, together with `scripts/__pycache__/`.
