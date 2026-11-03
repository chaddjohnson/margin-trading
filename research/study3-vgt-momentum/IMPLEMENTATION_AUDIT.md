# Implementation audit — Study 3, Stage 1

*(Sections 1–3 written before the code freeze; sections 4–7 are completed after the results and the final review.)*

## 1. Modules (`src/study3-vgt-momentum/`)

| File | Role |
|---|---|
| `context.ts` | every PROTOCOL constant: dates, folds, costs, caps, M5 settings, seeds |
| `data.ts` | the only market-data access: shared loader, training partition, `optimization` access, end ≤ 2023-12-29, door records (file and loaded-bar hashes) |
| `features.ts` | causal daily features by direct window loops (no running sums), cached per window length |
| `signals.ts` | the twelve entry families, X-CS and the controls as position-independent arrays (level states, event triggers + own OUT, intraday rules) |
| `engine.ts` | the fast simulator: next-open daily execution, D1's minute fill primitives (imported), resting stops with gap/minute/stop-level fills, campaigns and re-entry, tranches, interest, friction, frozen `Tracker` minute drawdown, liquidation marks, window statistics; C-ALR |
| `reference.ts` | an independent slow restatement (every feature recomputed from raw closes at each decision; minute-by-minute walk) used only for parity |
| `parity.ts` | engine vs reference: every trade field, daily marks, horizon value, minute drawdown |
| `specs.ts` | named exits, re-entry rules, sizing, controls; candidate IDs (`<family>-<sha256[:10] of parameters>`) |
| `metrics.ts` | run summaries and trade rows |
| `sobol.ts` | Joe–Kuo Sobol (dims 1–8), Gray-code order, seeded digital shift |
| `search.ts` | M1 gates, M3 search (global, local, shortlist, neighbourhood, 10 bps), champions, P\*, P0, caps |
| `ledgers.ts` | hindsight trend legs, episodes, yearly increments, procedure path Π, D1-idle overlap |
| `rubric.ts` | the frozen verdict rubric and family labels |
| `records.ts` | write-once records, payload hashes, protocol and code freezes (import closure), git-scope checks, stage order |
| `stages.ts` | S0–S8 (thin wrappers that load through the door and seal; computational cores testable on synthetic data) |
| `main.ts` | the CLI (`npm run study3-momentum -- …`) |
| `tests/` | `engine.test.ts` (19 tests), `pipeline.test.ts` (synthetic end-to-end dry run), `fixtures.ts` |

Read-only reporting outside the code freeze: `research/study3-vgt-momentum/scripts/report_tables.py` (reads sealed
records, verifies every payload hash, writes `results/tables/`).

## 2. Tests and parity built before any outcome

- Execution and accounting: next-open fills with friction; interest on calendar days; liquidation at the horizon;
  gap / minute-open / stop-level fills; same-session round trips pay no interest; the closing print never triggers a
  stop; missing minutes never imputed; R0/R3/R5 re-entry; the minute rule's decision and carried order; one entry per
  session and none after an exit; Z1 tranches; window increment identity.
- Minute rules: E10 re-enters only above the exited trade's Hc and every post-exit minute high; mutating minutes after a
  decision changes neither the decision nor its fill.
- Causality: every family's and control's signals at s are unchanged when later sessions change; a run ending at a
  cutoff equals the longer run's prefix (decisions and daily marks).
- Parity: fast = reference, field for field, on five adversarial paths (spike/reversal, gap below stop, prolonged
  range, bull continuation after an early stop, falling-knife bounce) × 17 signals × 14 exits, and on four 900-session
  random walks × 13 families × 7 re-entry rules, Z1, and a stressed setting (10 bps, 25 bps stop slippage, 10 bps entry
  slippage, +1 minute, 14%); every family makes ≥ 8 trades on those walks (the property is not vacuous).
- Pipeline dry run: develop (A–D, H) → evaluate (A–D) → diagnostics → robustness → analysis on a synthetic 2016–2023
  history with small search sizes (`setTestLimits`/`setTestDraws` refuse to run outside the scratch test root).

## 3. Defects caught before the freeze (none affected any recorded result)

1. **Feature cache key collision**: `maxClose(N)` and `minClose(N)` (and the prior-window pair) shared a memo key, so a
   50-session minimum could be served as a maximum (found by the parity test on the adversarial paths; fixed by keying
   on the extreme's kind).
2. **E09 under R5**: the engine kept updating the intraday reference while a live campaign blocked entries; the
   reference implementation did not (parity test; resolved by the v1.1 rule for both).
3. **Look-ahead at entry (X2)**: the volatility-scaled stop at the fill used the entry session's own ATR; both
   implementations now use the previous close's ATR.
4. **M1 gate lookup**: the gate read panel IDs without their re-entry/sizing suffix and would have failed on the first
   real development stage (found by the synthetic pipeline dry run).
5. Test mis-specifications in two of my own unit tests (a closing-print case whose next open was above the stop; an E10
   case whose hard stop could not be reached) — the tests were corrected, not the code.

## 4. Freezes and sealed records (clock times from the records' own fields)

| Item | File | sha256 (file) | body/manifest hash | Time (UTC) |
|---|---|---|---|---|
| Protocol freeze (protocol v1.2, catalog, matrix, FP, selection, both dispositions, brief) | `PROTOCOL_FREEZE.json` | `53fb4f55e837…` | `a707eb105b506b0e…` | 17:31:30 |
| S0 audit | `results/records/audit.json` | `ed866525625846…` | `2ce26f297b35a4e5…` | 17:14:22 |
| S2 parity (PASS) | `results/records/parity.json` | `d10628e7942a56…` | `8a710c6e2fd15ede…` | 17:31:47 |
| Code freeze (120 files: the import closure, tests, package.json, package-lock.json, tsconfig.json) | `results/code_freeze.json` | `83ba179a2caf32…` | `1822bc10bf9145d4…` | 17:32:02 |
| S4 develop-A / B / C / D / H | `results/records/develop-*.json` | `1dab1787…` / `58237dd6…` / `92c1e7b8…` / `1c8c6ceb…` / `d029e15c…` | `d1f51b5e…` / `870b9489…` / `7c52874c…` / `7d4bf0b0…` / `b78eb450…` | 17:32:47 / 17:34:09 / 17:35:43 / 17:37:02 / 17:38:41 |
| S5 evaluate-A / B / C / D | `results/records/evaluate-*.json` | `fd7ea5b8…` / `e1d8dd89…` / `2ccb93fe…` / `537fb4d9…` | `f83c3953…` / `b809b059…` / `900ed713…` / `10827dd8…` | 17:38:56 / 17:39:01 / 17:39:07 / 17:39:12 |
| S6 diagnostics | `results/records/diagnostics.json` | `22dba3707088…` | `6579d10f2545…` | 17:39:15 |
| S7 robustness | `results/records/robustness.json` | `6f7467271b65…` | `28130957d470…` | 17:39:32 |
| S8 analysis (verdict) | `results/records/analysis.json` | `6d397a84ec09…` | `d7002d564eb5…` | 17:39:35 |

`npm run study3-momentum -- verify` recomputes every record's body hash and payload sha256, the protocol freeze and the
code-freeze manifest; `-- status` lists every stage. Each record holds its door (data and loaded-bar sha256, last
date), the git HEAD, the scope check (no tracked or untracked change outside the study folders, `CLAUDE.md`,
`docs/claude/context-recovery.md` and the one `package.json` script line), and both freeze hashes. The stage order was
enforced: every fold's selection was sealed before any evaluation window was loaded, and S6–S8 ran after all seals.
No stage failed, so none was rerun; no code changed after the code freeze; amendment A1 (descriptive report figures)
is the only amendment (`AMENDMENTS.md`).

## 5. What was found by the reviewers before the freeze

Methodology review 1 (31 findings, 3 blockers) and re-review 2 (24 findings). Both are kept verbatim in `reviews/` with
written dispositions. The blockers concerned caps that were smaller than the design, undefined campaign/re-entry rules,
and a rubric unable to tell exposure from timing skill. Re-review 2 found that my disposition of the first blocker had
**not** been carried into the code (caps still 15,000/75,000), and that C-ALR — the E benchmark — had no independent
check. Both were fixed before the freeze (`context.ts` caps 16,000/80,000 with a test; an independent C-ALR
restatement, a closed-form test, and C-ALR in both parity runs).

## 6. Permanent context-recovery policy (brief §2)

- **What existed.** Root `CLAUDE.md` (10 lines; commit `57b5375`) already imports `@docs/claude/context-recovery.md`, a
  general procedure for all substantial tasks. There is no `.claude/`, `AGENTS.md` or `.claude/rules`. The policy was
  improved minimally rather than duplicated, and `CLAUDE.md` is unchanged.
- **The diff** (`docs/claude/context-recovery.md`, +26 / −8 lines, committed separately from the study so it can be
  reviewed and cherry-picked on its own): §2.1 verify branch, worktree and authorisation, and look for unfinished
  checkpoints (`grep -l "INCOMPLETE" research/*/RESEARCH_RECOVERY.md`); §2.2 research checkpoints also hold
  hypotheses, rejected paths, candidate IDs, budgets and test status; §2.5 rely on automatic compaction and never ask
  the user to compact merely because the context seems full (this replaced a sentence that suggested asking); §2.7
  fail closed on unresolved door/method/process/authorisation ambiguity and ask only for genuine decisions; new §2.8
  closing checkpoint (COMPLETE/INCOMPLETE, audited deliverables, follow-up gate); §3 how to confirm loading
  (`/memory`, `/context`) and how a long-lived branch inherits the files. No hook was added; no user or global setting
  was touched.
- **Evidence that it loads.** Claude Code 2.1.283. This session's initial context listed both `CLAUDE.md` and the
  imported `docs/claude/context-recovery.md` as loaded project instructions. That is evidence the `@path` import
  resolves in this checkout; it is not a test of a separately started fresh session. To confirm in a fresh session,
  start Claude Code in the checkout and run `/memory` (both files listed) or `/context`.
- **Scope of persistence.** The policy loads only in branches and worktrees that contain both files. Commit `57b5375`
  is on the research branches but **not on `origin/main`**. Minimal integration step for a long-lived branch (needs the
  user's decision; not done here): `git cherry-pick 57b5375 <policy commit of this branch>` onto that branch (or
  `git checkout research/study3-vgt-momentum-first-principles -- CLAUDE.md docs/claude/context-recovery.md` and
  commit).
- **This study followed it, with lapses.** The checkpoint was created at 16:23Z before any expensive step and refreshed
  at the freezes and after all seals — but not at each individual seal of S4–S8 (17:32–17:39Z), so between 17:33Z and
  17:52Z its body still described the pre-run state; the stages are write-once and self-describing, so nothing was at
  risk, but the procedure asks for per-milestone updates. Two early updates used estimated times ("17:2xZ") and claimed a cap change that had
  not yet been made; re-review 2 caught both (finding 18), and they were corrected with clock times. Both reviews, the brief and every command live in the study folder. No compaction or
  interruption occurred, so no recovery was performed.

## 7. Repository tests before and after

| Run | Tests | Pass | Fail | Failing tests | Log |
|---|---:|---:|---:|---|---|
| Baseline, before any study edit (16:23–16:25Z) | 744 | 737 | 7 | the 6 known `allin-original.ts` filename-case failures (`trailing-buy` ×4, `minute-optimizer`, `intraday-study`) + Study 2 `realData.test.ts:83` (its guard rejects any untracked file outside Study 2; at that moment only this study's three new files) | `audit/tests/baseline-full-suite-before.txt` |
| Pre-freeze (17:21–17:23Z) | 761 | 754 | 7 | the same 7 | `audit/tests/full-suite-prefreeze.txt` |
| After the study (17:52–17:55Z) | 764 | 757 | 7 | the same 7 | `audit/tests/full-suite-after.txt` |

**No new regression.** The study adds 20 tests (`src/study3-vgt-momentum/tests/`, all pass). The Study 2 guard fails
on this branch by design, and will keep failing after the commit (its base-commit diff then includes this study).
Read-only check instead of relaxing that guard: on this branch, `git diff 70312f2 -- research/ config data/partitions.json src`
(excluding this study's two folders) is empty, so every prior study, config, partition and other source file is
byte-identical to the Study 2 head. `npm run d1-signal-complementarity -- verify` (read-only) reports all 16 Study 2
seals verifying, its protocol and code unchanged since their freezes, and the prospective B4/B5 freeze's 148 pinned
files with 0 mismatches. Its only failure is the branch-bound "protected inputs" check, which lists this study's new
files, `docs/claude/context-recovery.md` and the `package.json` script line. `npx tsc --noEmit` passes. `eslint` on the study
folder reports warnings only (no errors).

## 8. Coverage gaps and record details (final review, findings 13 and 29)

- **Parity coverage.** S2 compared engine and reference on fold A's development data and on synthetic paths; S7 on the
  full history for the finalists and controls. The verdict-bearing fold picks over their evaluation windows were first
  compared after all seals (amendment A2, `audit/fold-pick-parity.json`): 0 differences for all four. The placebo,
  inverted-state, Z2 and weekly-clock (A2 modifier) runs are engine-only; the reference refuses them. The rubric, Π and
  window dollar-days have no unit test beyond the synthetic dry run (which checks only that they compute). The final
  reviewer recomputed every one of them independently from the sealed outputs, and they matched.
- **Record details.** `PROTOCOL_FREEZE.json` carries `"version": "1.1"` (hard-coded in `stages.ts`) although it froze
  protocol v1.2; the hashes it records are of the v1.2 files. Evaluate records do not list the door of the D1-context
  load (Study 2's `loadUniverse` through the same window end, which applies its own refusals). S8 loads VGT through
  2023-12-29 to compute the hindsight legs, beyond its "sealed records" door in P §6. The S2 market-data payload also
  records each run's lot count, beyond the protocol's "field names, counts and |Δ|". None of these changes a result.
- **Wording in the frozen protocol.** P §1 calls the windows "overlapping". The evaluation windows are disjoint; the
  development histories are nested. The frozen text is left as it is, and the reports use the accurate wording.
