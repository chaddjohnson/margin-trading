# Research recovery checkpoint — D1 diverse-pool discovery

## Top screen (read this first)

All times UTC (the machine clock is CET = UTC+1; `ls`/`stat` show local time). Paths are relative to the study
directory `research/d1-diverse-pool-discovery/` unless they start with `src/`, `data/` or `npm`; run commands from the
repository root.

- **Updated:** 2026-10-26T11:47Z (from `date -u`). **Status: TASK COMPLETE.** All study stages are sealed (M0–M4). **Outcome: no
  advancement**: the walk-forward procedure gate GP failed for both procedures (J: clause iii; T: clauses i and ii),
  so nothing was nominated and no configuration of this study was evaluated after 2023-12-29. B5 remains the leading
  candidate, B4 the default. The final audit found no material defect. **Committed at the user's request** on
  `research/trailing-buy-four-family-optimization`: `57b53756` (`CLAUDE.md` + guide) and `c123faa2` (the study); not
  pushed.
- **Frozen protocol:** `results/protocol_freeze.json`, frozen 2026-10-26T04:20:08Z.
  - file sha256 `fc22c70be5dd5c22725127b2b08985c260a850236e3b5925615a3234d50f5747`
  - bodyHash `918c221bc777e6d3d9b1c55469272583591863e716fee982597cb8e5ff84d015`
  - binds `PROTOCOL.md` `6e4df57a2cce6a77cb4283dd3fe19d49299cc3875610996bfb355ed1b878cb1c`, context
    `98428dac2fbd2ce9e13bbe002bffe1a859a3b4dad66b125dce1d95a28203803d`, code manifest
    `fd549635c92a60a9bcd928275fbf90291c286a6120b5767ec1f3454da18fd7be`
  - amendment head: amendment 1 `7a0aa61026a59cb0c9c58a9c2b61cec0184b644aa31f129563d06b3dfba23ef0` (08:49:19Z;
    `final.ts` only; code manifest → `42d2dd4795b4…`; `results/amendments.jsonl` `6cda48ed…`). No further amendment.
- **Complete (sealed, never rerun):**
  - M0: design committed (body `bc6fcdf2…`), change 1.
  - M1: legacy-check, audit, benchmark → tier E, reproduce, parity, freeze.
  - M2: controls ×3, fold-a, fold-b, determinism, `PROCEDURE_GATE.json` (body `9b343385…`; J fail, T fail).
  - M3: final search (body `77f553e5…`), final select (`selection.json` body `26b29f03…`), `FROZEN_SELECTION.json`
    (body `ae20e9844c400fe24e2a78a8b4584062ea9cc4b0b9b2d8c5755a0e1b8f2cfe33`), confirm-B (`e4916bbb…`).
  - M4: `results/evaluation/evaluation.json` (`87018fa9…`, no nominee).
  - Three independent reviews and the independent final audit (`reviews/`); descriptive ledgers and summaries; all §14 reports; my final checks
    (`results/audit-final/`).
- **Incomplete:** nothing. The §13A re-test (attempt 3, SUFFICIENT), the independent final audit
  (`reviews/final-audit.md`), the memory note and the reports are done.
- **Running process:** none (check: `ps -ax -o pid,etime,command | grep "[d]iverseD1"`).
- **Decision rule for any later session:** do not run any study command again. Every outcome stage is write-once and
  refuses, and the protocol forbids "one more look" (§22). A new question needs a new study and protocol. If a sealed
  record fails to verify: stop and report (guide §2.7). Nothing remains; pushing or merging needs the user's request.
- **Never:** commit or push without the user's explicit request; broker/order actions, downloads, edits to earlier studies, reruns of sealed stages, opening
  2024–2026 data for any configuration of this study.

## 1. Environment

- Main checkout, branch `research/trailing-buy-four-family-optimization`. The task started at `HEAD` `348f100b`; the
  work was committed at the user's request as `57b53756` (instructions) and `c123faa2` (study), plus this checkpoint
  update. The working tree was clean after the commits.
- Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`; commands
  `npm run diverse-d1 -- <cmd>` (12 GB heap, `--expose-gc`). In zsh, split a multi-word step variable with `${=step}`.
- Apple M1 Pro, 10 cores, 16 GB; 8 workers; trace cache 150,000 (tier record).
- The brief: `brief/BRIEF_AS_RECEIVED.md`. The pasted brief was truncated at §13; **the user replaced the file with
  the full text (§13 remainder, §13A, §14, §15) at 07:35:16Z, after the design commitment, the freeze, both fold
  validations and the procedure gate (06:21:18Z, from the record's `generatedAt`).** The commitment's brief hash `c9ef0b91…` is of the truncated text.
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
| PROTOCOL_FREEZE.json (root index) | complete | `node --experimental-transform-types research/d1-diverse-pool-discovery/scripts/protocol-freeze-index.ts` | `PROTOCOL_FREEZE.json` `3f442114…` / body `1f11e7fe36776646a8ed40708b8787d2464ef37345bab80e670db994ef32306f`; re-verified the 64 canonical CSVs and every freeze-bound check record | write-once (refuses if present) |
| coverage/family summary | complete | `python3 -I research/d1-diverse-pool-discovery/scripts/coverage_summary.py > …/results/tables/coverage-summary.json` | `results/tables/coverage-summary.json` `d74c49ba…` | regenerable |
| final checks (my own) | complete 10:51–10:54Z | `npm test`, `npx tsc --noEmit`, `npx eslint src/d1-diverse`, `npm run diverse-d1 -- legacy-check`, `shasum -c` of `results/baseline/*.sha256`, `cmp` of `git ls-files -s` | `results/audit-final/`: 547/547 tests pass; tsc 0; eslint 0; legacy manifest `d8b9b900…` equal, protected trees clean, hash lists 99/99 + 13/13 (`results/legacy/legacy-check-after-freeze-2026-10-26T10-53-15-708Z.json`); 64/64 data CSVs + 3 configs OK; tracked index byte-identical to baseline (`f3125ec6…`) | rerunnable (read-only, legacy-check writes a new timestamped file) |
| reports | complete (drafts finalised; audit section pending the independent audit) | — | `BASELINE_AND_PARITY.md`; `CHRONOLOGICAL_METHOD_COMPARISON.md` (renamed from `WALK_FORWARD_RESULTS.md`; rules, portfolio, annual attribution); `COVERAGE_AND_DIVERSITY.md`; `FAMILY_SELECTION.md`; `NEIGHBORHOOD_AND_RISK.md` (confirm-B §4 filled); `FINAL_CANDIDATES_AND_GATES.md`, `README.md` (verdict + old-vs-new table), `RECOMMENDATION.md`, `HISTORICAL_CONFIRMATION.md` (hashes filled); `IMPLEMENTATION_AUDIT.md` (draft) | editable reports, not sealed |
| fold attribution (descriptive) | complete (both folds reconciled to the sealed V to 1e-6) | `node --max-old-space-size=8192 --experimental-transform-types research/d1-diverse-pool-discovery/scripts/ledgers.ts folds` (harness task `b591jlmjb`) | `results/ledgers/fold-a-validation-attribution.json`, `results/ledgers/fold-b-validation-attribution.json` (written 08:01Z/08:09Z) | refuses if a file exists |
| final search | complete 06:40:39–08:48:36Z (7,675 s) | `search --window final` | `results/rounds/final/search.json` `3c3c44ed…` / body `77f553e56841129fc1741b127610daf82ee09e521de36bced3927f0f8ad20dbf`; 4 arms × 47,032, coverage met; credible J-u 20,467, T-u 21,030, J-s 21,028, T-s 23,375 | sealed; never rerun |
| amendment 1 | complete 08:49:19Z | patch `amendments/amend1_final.py` then `amend …` (top screen strings) | `results/amendments.jsonl` `6cda48ed…`, hash `7a0aa610…`; `final.ts` `eb20e15e…` → `3a156064…` | append-only; never re-record |
| final select | complete 08:50–10:21:14Z (5,495 s) | `select --window final` | `results/rounds/final/selection.json` `19eae964…` / body `26b29f0384aec2e0e417d00d73313ee7b0016ed1b9253611349dd0007f92067c`; `rounds/final/select/{J-u,T-u,J-s,T-s}/`, `select/benchmarks.json`. J: 16 finalists (J-u 8 all fail G7; J-s 5 pass); T: 14 (T-u 7 all fail G7; T-s 1 passes); hypothetical lists only seeded alternates ('no primary-eligible finalist'); GP failed → no nomination | sealed; never rerun |
| pre-selection-freeze review | complete 10:25–10:44Z | independent agent, brief `reviews/pre-selection-freeze-review.PROMPT.md` | `reviews/pre-selection-freeze-review.md` `e8e0ffc6…`: no material finding; safe to run freeze-selection, confirm-b, evaluate; minor 1–5 → report wording (no amendment) | — |
| freeze-selection | complete 10:44:31Z | `freeze-selection` | `FROZEN_SELECTION.json` `9f2ec049…` / body `ae20e9844c400fe24e2a78a8b4584062ea9cc4b0b9b2d8c5755a0e1b8f2cfe33`: no advancement, nominees [] | write-once |
| confirm-b | complete 10:45–10:49:13Z (266 s) | `confirm-b` | `results/confirmB/confirmB.json` `e4916bbb…` (manifestHash = FROZEN_SELECTION body); 36 rows; B−A P50 within −$7.1k…+$5.5k, 6 of 33 flagged > 2 SE | write-once |
| final ledgers (descriptive) | complete: first written 10:26:04Z (after the sealed selection, before freeze-selection); regenerated 11:22Z with the B1/B4/B5 reconciliation added (content identical, CSVs byte-identical) | `node --max-old-space-size=8192 --experimental-transform-types research/d1-diverse-pool-discovery/scripts/ledgers.ts final` | `results/ledgers/final-finalists.json` `25f0b552…`, 33 CSVs in `results/ledgers/final/` | refuses if present |
| evaluate | complete 10:49:40Z | `evaluate` | `results/evaluation/evaluation.json` `87018fa9…`: no nominee, no data loaded | write-once |
| §13A re-test, final audit | complete: §13A attempt 3 SUFFICIENT (10:55Z, §6); import check (10:56Z, `results/audit-final/import-check.md`: guide loaded verbatim in a fresh tool-less session); independent final audit 10:55–11:18Z, no material finding, dispositions in `IMPLEMENTATION_AUDIT.md` §9 | see §6 | `results/recovery-test/`, `results/audit-final/`, `reviews/final-audit.md` `3159ba47…` | — |

**Do-not-rerun:** every complete stage above; everything of the October 25 study (`research/d1-robust-pool-discovery/`)
and the earlier studies. Pre-freeze checks refuse to run; legacy-check may run (writes a new timestamped file).

## 3. Results so far (E2 = reused historical diagnostics)

- Coverage met in every arm of every round (min per symbol: folds 733 J/T, 534 Q; final J-u/T-u met). Families:
  fold-a J 2,651 / T 1,911 / Q 1,076; fold-b J 2,836 / T 1,797 / Q 1,135.
- fold-a: J pick GDX IBB SMH XHB V +$13,759 (pct 0.70), DD $14,293; T pick GDX SMH V −$12,043 (0.10); Q −$8,496 (0.13).
- fold-b: J pick GDX SMH XHB V +$5,462 (0.84), DD $48,269; T pick IGV VOOG V −$7,089 (0.46); Q −$4,001 (0.58).
- **GP(J) fail (clause iii only), GP(T) fail (clauses i and ii) → no procedure may nominate.** Report:
  `CHRONOLOGICAL_METHOD_COMPARISON.md` (renamed from `WALK_FORWARD_RESULTS.md`).

## Constants (pointers; all frozen)

- **Seeds:** `seedLabels` in `src/d1-diverse/context.ts`, recorded in `FROZEN_SELECTION.json` (`seeds`) and
  `PROTOCOL_FREEZE.json`.
- **Budgets:** tier E (`results/benchmark/tier.json`; per-arm budgets in `context.ts` `tiers.E`): stage A 6,632; stage
  B 400/200/60 per island; stage C 2,000/1,000/300 per island; draws disc 16, promo 96, refine 48, prune 128,
  confirm 256.
- **Data cutoffs:**
  - fold-a search ≤ 2020-06-30, validation ≤ 2021-12-31;
  - fold-b search ≤ 2021-12-31, validation ≤ 2023-12-29;
  - final ≤ 2023-12-29;
  - 2024-01-02 → 2026-10-13 never opened for any configuration of this study.
- **Thresholds:** `PROTOCOL.md` §6, §14, §15 and `context.ts`.

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
   before the selection freeze (10:25–10:44Z, `reviews/pre-selection-freeze-review.md`).
3. CLI flag-parsing bug found and fixed in change 1; a zsh word-splitting slip made the first fold-a launch run nothing.
4. The pruning design test used the October 25 study's symbols and −$1,897 as a scenario (the full brief asks not to
   bake XRT's result into fixtures) — made generic (tests are outside the code manifest).
5. Pre-final review observations 8–11 (zero-lot members winning on smoothing; near-duplicate finalists; pruning below
   the activity floor; one R1/R4 KRE vector equals B5's KRE vector in the seeded library).
6. Pre-final review minor 5–7 (runner-up interval pair, no "seeded provenance" label, unfillable quality slot) are
   handled in report wording only (`round.ts`/`assess.ts`/`promote.ts` can no longer change).
7. The two review reports were first held only in the conversation; they were saved verbatim to `reviews/` at
   2026-10-26T07:43Z, after the §13A recovery test (attempt 1) flagged on-disk gaps.

## 6. Recoveries and recovery tests

| When (UTC) | Kind | What was verified | Outcome |
|---|---|---|---|
| 2026-10-26 ~07:37Z | in-session context compaction | the guide and this checkpoint reread; final search alive (log advancing, J-s stage A → B); sealed records unchanged | continued; nothing rerun |
| 2026-10-26T07:38:10Z | §13A test, attempt 1: fresh headless session (read-only tools) given `CLAUDE.md`, the guide and a snapshot | `results/recovery-test/RESEARCH_RECOVERY.snapshot-20261026T073810Z.md` (sha256 `a22a68e1…`); answer `fresh-session-answer-20261026T073810Z.md` | **INSUFFICIENT**: stage, protocol, guards and process rule correct; gaps = local times written as UTC, elided amend strings, patch only in the scratchpad, no rule for a FAILED log, adoption of §14 names not formalised. All fixed at ~07:43Z; attempt 2 follows |
| 2026-10-26T07:44:11Z | §13A test, attempt 2: same prompt and tools, corrected checkpoint | snapshot `RESEARCH_RECOVERY.snapshot-20261026T074411Z.md` (sha256 `269c1d7f…`); answer `fresh-session-answer-20261026T074411Z.md` | **SUFFICIENT**: one unambiguous next action with a process-state decision rule; sealed vs active distinguished. Non-blocking notes fixed afterwards: hand-written update time ahead of the clock (now taken from `date -u`), GP and arm suffixes undefined, `ps` pattern unverified (now verified) |
| 2026-10-26 ~08:09Z | in-session context compaction | `CLAUDE.md`, the guide and this checkpoint reread; search PID 71646 alive (J-s stage C); `protocol_freeze.json` `fc22c70b…` and `PROCEDURE_GATE.json` `fe82077f…` recomputed equal; no `amendments.jsonl`; fold attribution task `b591jlmjb` exited 0 with both files | continued; nothing rerun |
| 2026-10-26T10:55:07Z | §13A test, attempt 3: same prompt and tools, end-state checkpoint (all stages sealed) | snapshot `RESEARCH_RECOVERY.snapshot-20261026T105507Z.md` (sha256 `e3c5b37e…`); answer `fresh-session-answer-20261026T105507Z.md` | **SUFFICIENT**: correct stage, sealed set, never-rerun list and next action (launch the final-audit agent with its brief if its report is absent). Non-blocking notes fixed afterwards: one stale stage-table row, stale 'pending' notes in the reports row, `ps` pattern restored to the top screen |
