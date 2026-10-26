# Research recovery checkpoint — D1 diverse-pool discovery

## Top screen (read this first)

All times UTC (the machine clock is CET = UTC+1; `ls`/`stat` show local time). Paths are relative to the study
directory `research/d1-diverse-pool-discovery/` unless they start with `src/`, `data/` or `npm`; run commands from the
repository root.

- **Updated:** 2026-10-26T07:50Z. **Current stage:** M3, final-round search RUNNING in the background since 06:40:39Z
  (exploration only — GP failed for both procedures, so the outcome will be **no advancement**; nothing is evaluated
  after 2023).
- **Frozen protocol:** `results/protocol_freeze.json`, frozen 2026-10-26T04:20:08Z.
  - file sha256 `fc22c70be5dd5c22725127b2b08985c260a850236e3b5925615a3234d50f5747`
  - bodyHash `918c221bc777e6d3d9b1c55469272583591863e716fee982597cb8e5ff84d015`
  - binds `PROTOCOL.md` `6e4df57a2cce6a77cb4283dd3fe19d49299cc3875610996bfb355ed1b878cb1c`, context
    `98428dac2fbd2ce9e13bbe002bffe1a859a3b4dad66b125dce1d95a28203803d`, code manifest
    `fd549635c92a60a9bcd928275fbf90291c286a6120b5767ec1f3454da18fd7be`
  - amendment head: none (`results/amendments.jsonl` absent). Pre-freeze change log head: change 1 `17c8e445…`.
- **Complete (sealed, never rerun):** M0 (design committed, body `bc6fcdf27859f0eaad0f3cba95c27638d744b80796fef29aeb279850e9385614`;
  change 1) · M1 (legacy-check, audit, benchmark → tier E, reproduce, parity, freeze) · M2 (controls ×3, fold-a, fold-b,
  determinism, `results/walkforward/PROCEDURE_GATE.json` body
  `9b343385f1c3188b7fb2cce9f7c40ed17d30810f38d3519043e0e840f64e20bb`: J fail, T fail) · independent reviews at the
  design (`reviews/design-review.md`) and before the final round (`reviews/pre-final-round-review.md`).
- **Incomplete, in order:** M3 final search (running) → amendment 1 → select final → independent pre-freeze review →
  freeze-selection → confirm-b → M4 evaluate (no-advancement record) → reports (§14 names) → §13A recovery test
  (attempt 1 done, INSUFFICIENT; see §6) → independent final audit.
- **Running process:** harness task `br8lda5es` (a bash chain started 06:40:39Z; node PID 71646 at 07:51Z) running
  `npm run diverse-d1 -- search --window final`, appending to `results/logs/final.log`. The chain writes the last log
  line `FINAL-SEARCH DONE <hh:mm:ss>` on success or `FINAL-SEARCH FAILED` on a non-zero exit. Arms J-u and T-u
  completed (47,032 configurations each, coverage met); J-s was in stage B at 07:40Z; T-s follows. The sealed output
  is `results/rounds/final/search.json`.
- **Decision rule before doing anything:**
  1. Check the process: harness task status if visible; otherwise `ps -ax | grep "diverseD1"` and whether the log's
     modification time still advances. If it is alive, **wait; launch nothing.**
  2. Last line `FINAL-SEARCH DONE` and `results/rounds/final/search.json` present → the next command below.
  3. Last line `FINAL-SEARCH FAILED`, or the process gone with no final line → read the error at the end of the log.
     - Resource failure (out of memory, killed, disk full) → rerun the identical command
       `npm run diverse-d1 -- search --window final >> research/d1-diverse-pool-discovery/results/logs/final.log 2>&1`
       (do not truncate the log). Completed arms whose record verifies its archive log are kept; the incomplete arm is
       moved aside and replayed deterministically. Label the rerun here.
     - Any integrity or code error (a refused freeze check, a hash mismatch, an exception in frozen code) → **stop and
       report** (guide §2.7). Search code can no longer be amended.
- **Next command (when the search is done):**
  1. `python3 research/d1-diverse-pool-discovery/amendments/amend1_final.py` (patches `src/d1-diverse/final.ts` only;
     patch sha256 `203cef2ccd8e8f3552b5b34c13d6942a81d8c6d66b82e07911441b0f51f771f3`; it asserts every anchor and
     prints `patched`; `final.ts` before the patch: `eb20e15e78755c70d84f47d2a2106d89a5dfcfeae3778e0df88f32817593cc22`).
  2. `npx tsc --noEmit`, `npx prettier --write src/d1-diverse/final.ts`, `npx eslint src/d1-diverse`.
  3. Record it (the amendment binds the patched code manifest, so it must follow the patch):
     ```
     npm run diverse-d1 -- amend --stage freeze-selection \
       --change "final.ts only: freeze-selection recomputes each final finalist's S_J/S_T from its stored confirm-A draws and the sealed final calibration; FROZEN_SELECTION gains full rankings with gate details, labelled hypothetical nominations, nominee tie order, seeds, tier budgets, evaluation counts and the parity signature, and binds select/benchmarks.json and every refine-f*.json; data files are hashed one at a time; confirm-b verifies its inputs against the frozen record hashes and reports the benchmarks' confirm-A beside confirm-B." \
       --reason "Record strength and reporting completeness only (PROTOCOL §16.1): the freeze re-read rather than recomputed scores, the manifest was thinner than §16.1, confirm-b did not verify its inputs, and hypothetical nominations could be misread. No selection rule, gate, threshold, budget, seed or data door changes; nothing can be nominated because GP failed." \
       --review "independent pre-final-round review (reviews/pre-final-round-review.md), minor findings 1-4" \
       --outputs research/d1-diverse-pool-discovery/FROZEN_SELECTION.json research/d1-diverse-pool-discovery/results/confirmB research/d1-diverse-pool-discovery/results/evaluation
     ```
  4. `npm run diverse-d1 -- select --window final >> research/d1-diverse-pool-discovery/results/logs/final-select.log 2>&1`.
- **Never:** commit, push, broker/order actions, downloads, edits to earlier studies, reruns of sealed stages, opening
  2024–2026 data for any configuration of this study.

## 1. Environment

- Main checkout, branch `research/trailing-buy-four-family-optimization`, HEAD `348f100b` (unchanged). Working tree:
  modified `.gitignore`, `package.json`, `src/phenotype/strategies.ts` (+1 line), `config/phenotypes/COMPATIBILITY.md`
  (+1 generated row); untracked `CLAUDE.md`, `docs/claude/`, `research/d1-diverse-pool-discovery/`,
  `src/app/diverseD1.ts`, `src/d1-diverse/`. Nothing committed.
- Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`; commands
  `npm run diverse-d1 -- <cmd>` (12 GB heap, `--expose-gc`). In zsh, split a multi-word step variable with `${=step}`.
- Apple M1 Pro, 10 cores, 16 GB; 8 workers; trace cache 150,000 (tier record).
- The brief: `brief/BRIEF_AS_RECEIVED.md`. The pasted brief was truncated at §13; **the user replaced the file with
  the full text (§13 remainder, §13A, §14, §15) at 07:35:16Z, after the design commitment, the freeze, both fold
  validations and the procedure gate (07:21:18Z).** The commitment's brief hash `c9ef0b91…` is of the truncated text.
- **How the full brief is adopted (no protocol amendment needed or possible):** its §14 report file names, the
  `PROTOCOL_FREEZE.json` index, finalist ledgers, the old-vs-new table and the §13A recovery test are reporting and
  process items. They are produced by `src/d1-diverse/report.ts` (outside the code manifest) or by supplementary
  scripts that read training data only. Frozen selection rules, gates, thresholds and data doors are unchanged.
  `PROTOCOL.md` cannot change after a fold validation; the adoption is disclosed (§5) and in `IMPLEMENTATION_AUDIT.md`.

## 2. Stages, records and resume semantics

| Stage | Status | Command | Sealed/bound records (file sha256 / body) | Resume |
|---|---|---|---|---|
| commitment | complete | `commit-design` | `results/design_commitment.json` `2fe3a7be…` / `bc6fcdf2…`; schedule `4fd1e90a…` | write-once |
| change log | complete (1) | `change …` | `results/changes-since-commitment.jsonl` `4d63adb8…` (change 1 `17c8e445…`) | append-only; refused after freeze |
| M1 checks | complete | legacy-check, audit, benchmark, reproduce, parity | universe `06f2fa77…`, tier `c63d0ab6…`, legacy `52969d04…`, reproduce `a217d54f…`, parity `2139a9c0…` (bound by the freeze) | refused after freeze |
| freeze | complete | `freeze-protocol` | `results/protocol_freeze.json` `fc22c70b…` / `918c221b…` | write-once |
| controls | complete | `controls --window w` | calibration fold-a `c9c771e8…`/`7bec4b6b…`, fold-b `2199b986…`/`d8919f74…`, final `29a983aa…`/`2bf44343…` | write-once; complete-stage replay only |
| fold-a | complete | search / select / validate | search `47f014d7…`/`6b4442ec…`; PICKS `b2966fb3…`/`206466c4…`; validation `84b32347…`/`1e96c85c…` | sealed; never rerun |
| fold-b | complete | search / select / validate | search `91033c13…`/`75178c0e…`; PICKS `988f112c…`/`0f6cdcdc…`; validation `79c8e120…`/`0e7fd4e2…` | sealed; never rerun |
| determinism | complete | `determinism` | `results/determinism/determinism.json` `323a495e…` (8,632 + 2,000 lines identical) | write-once |
| procedure gate | complete | `procedure-gate` | `results/walkforward/PROCEDURE_GATE.json` `fe82077f…` / `9b343385…` | write-once |
| final search | **running** | `search --window final` | → `results/rounds/final/search.json` (sealed) | resumes per arm (completed arms kept) |
| amendment 1 | not started | `amend …` (final.ts only) | → `results/amendments.jsonl` | before freeze-selection's first output |
| final select | not started | `select --window final` | → `results/rounds/final/selection.json` (sealed), `rounds/final/select/` | complete-stage replay (partial select/ moved aside) |
| pre-freeze review | not started | independent agent | → IMPLEMENTATION_AUDIT | — |
| freeze-selection | not started | `freeze-selection` | → `FROZEN_SELECTION.json` (sealed) | write-once |
| confirm-b | not started | `confirm-b` | → `results/confirmB/confirmB.json` | write-once |
| evaluate | not started | `evaluate` | → `results/evaluation/evaluation.json` (no-advancement record only) | write-once |
| reports, §13A test, final audit | not started | `tables`, report files, recovery test, audit agent | §14 files | — |

**Do-not-rerun:** every complete stage above; everything of the October 25 study (`research/d1-robust-pool-discovery/`)
and the earlier studies. Pre-freeze checks refuse to run; legacy-check may run (writes a new timestamped file).

## 3. Results so far (E2 = reused historical diagnostics)

- Coverage met in every arm of every round (min per symbol: folds 733 J/T, 534 Q; final J-u/T-u met). Families:
  fold-a J 2,651 / T 1,911 / Q 1,076; fold-b J 2,836 / T 1,797 / Q 1,135.
- fold-a: J pick GDX IBB SMH XHB V +$13,759 (pct 0.70), DD $14,293; T pick GDX SMH V −$12,043 (0.10); Q −$8,496 (0.13).
- fold-b: J pick GDX SMH XHB V +$5,462 (0.84), DD $48,269; T pick IGV VOOG V −$7,089 (0.46); Q −$4,001 (0.58).
- **GP(J) fail (clause iii only), GP(T) fail (clause i) → no procedure may nominate.** Report: WALK_FORWARD_RESULTS.md
  (to be renamed CHRONOLOGICAL_METHOD_COMPARISON.md per the full brief §14).

## 4. The prepared amendment 1 (final.ts only; pre-final-round review minor 1–4)

Patch on disk: `amendments/amend1_final.py` (the exact strings to record are in the top screen). It is applied only
after the final search seals: patching `final.ts` earlier would change the code manifest under a running stage. Content:
score recomputation from stored confirm-A draws (`scoreOfDraws` + sealed final calibration); rankings and gate details
for every final finalist; "hypotheticalNominations" (explicitly not nominations when GP failed); records add
`select/benchmarks.json` and every `refine-f*.json`; seeds (`seedLabels`), tier budgets, evaluation counts, parity
signature; data hashed one file at a time; confirm-b verifies its inputs against the frozen hashes and reports the
benchmarks' confirm-A vs confirm-B difference.

## 5. Disclosures for the final report

1. The brief was truncated; its remainder arrived after the freeze and the fold validations (see §1).
2. No independent review was held between sealing each fold's PICKS and opening its validation (the full brief asks
   for one "preferably"); reviews: at the commitment (22 findings), before the final round (no material finding),
   before the selection freeze (pending).
3. CLI flag-parsing bug found and fixed in change 1; a zsh word-splitting slip made the first fold-a launch run nothing.
4. The pruning design test used the October 25 study's symbols and −$1,897 as a scenario (the full brief asks not to
   bake XRT's result into fixtures) — made generic (tests are outside the code manifest).
5. Pre-final review observations 8–11 (zero-lot members winning on smoothing; near-duplicate finalists; pruning below
   the activity floor; one R1/R4 KRE vector equals B5's KRE vector in the seeded library).
6. Pre-final review minor 5–7 (runner-up interval pair, no "seeded provenance" label, unfillable quality slot) are
   handled in report wording only (`round.ts`/`assess.ts`/`promote.ts` can no longer change).
7. The two review reports were first held only in the conversation; they were saved verbatim to `reviews/` at
   2026-10-26T07:45Z, after the §13A recovery test (attempt 1) flagged on-disk gaps.

## 6. Recoveries and recovery tests

| When (UTC) | Kind | What was verified | Outcome |
|---|---|---|---|
| 2026-10-26 ~07:37Z | in-session context compaction | the guide and this checkpoint reread; final search alive (log advancing, J-s stage A → B); sealed records unchanged | continued; nothing rerun |
| 2026-10-26T07:38:10Z | §13A test, attempt 1: fresh headless session (read-only tools) given `CLAUDE.md`, the guide and a snapshot | `results/recovery-test/RESEARCH_RECOVERY.snapshot-20261026T073810Z.md` (sha256 `a22a68e1…`); answer `fresh-session-answer-20261026T073810Z.md` | **INSUFFICIENT**: stage, protocol, guards and process rule correct; gaps = local times written as UTC, elided amend strings, patch only in the scratchpad, no rule for a FAILED log, adoption of §14 names not formalised. All fixed above at ~07:50Z; attempt 2 follows |
