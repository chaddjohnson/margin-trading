# Final independent code-and-evidence review (verbatim)

Reviewer: an independent subagent (no part in building Study 4), given `reviews/FINAL_REVIEW_PROMPT.md` verbatim,
read-only, 2026-10-30 ≈05:05–05:29Z, after `results/FINAL.json` was sealed. The report below is reproduced verbatim; the
study lead's responses are in `reviews/FINAL_REVIEW_DISPOSITIONS.md`. The reviewer's recomputation script is saved as
`reviews/final_review_recompute.py`.

---

# Study 4: final code-and-evidence review

I worked read-only. The only commands I ran were `status`, `verify`, `report.py`, the Study 4 unit tests, git, and Python reads of the sealed JSON. My recomputation script is at `/tmp/claude-1000/-home-chad-projects-margin-trading/39a7f3c7-2695-462b-81da-ac6c7d32fe7d/scratchpad/recompute.py`. It lives outside the repository; save it if you want to keep it as evidence. I opened nothing under `data/` myself. Two of the authorised commands do read `data/partitions.json`, which holds no bars: `verify` hashes it, and the unit tests copy it (`tests/doors.test.ts:51`).

## Findings

**1. MAJOR: the 4A per-symbol floor (5,120 vectors) was not met in F21, F22, F23 or H, and the reports say it was.**
- **What the records show.** `results/<w>/4A/RECORD.json` `symbols[].evaluated` is below the floor for:
  - F21, 6 symbols: ILF 4,992; KBE 4,800; KRE 4,864; XLE 4,608; XOP 4,608; XRT 4,736.
  - F22, 7 symbols; F23, 17 symbols; H, 18 symbols.
  - Window totals against the floor: F21 284,608 of 286,720; F22 279,040 of 281,600; F23 285,376 of 291,840; H 284,544 of 291,840.
  - Overall shortfall: 18,432 of 1,428,480 planned (1.29%). F20 is exact.
- **Cause.** All 4,096 Sobol vectors ran; only refinement children are missing. `phases.ts:79-101` takes "8 by net" seeds only among vectors with minute DD ≤ $35k, plus a diversity rule, and never tops up. For example, F21 XLE's best minute DD among its top vectors is $51,804, so it got only 8 seeds.
- **Why it matters.** SEARCH_PLAN §3 says "Floor per symbol and window: 5,120 vectors", and its header says every floor is "always spent in full". The checker `floorsMet` (`verify.ts:63-67`) only tests that a 4A record exists.
- **Wrong claims in the reports:**
  - `PHASE_4A…:108` says the frozen budget was spent for every symbol, and "4A is complete".
  - `FINAL_COMPARISON…:151-152` says "every frozen budget was spent in every window".
  - The README says "the study is complete".
- **Consequence.** Read strictly, V2 fails, so all eight labels would be "invalid/incomplete". The nominee would still be none.
- **Fix:**
  - Add an append-only post-outcome disclosure with a table of achieved counts against the floor.
  - Correct the three wordings above.
  - Present both readings of V2 and let the user decide.
  - Do not touch the sealed `FINAL.json`.

**2. MAJOR (disclosure): A5 names only `evaluation.ts`, but the fix also changed `main.ts` and `verify.ts`.**
- The two evaluation freezes (`results/superseded/evaluation-freeze1/` and `results/CODE_FREEZE_EVALUATION.json`) differ in three files: `evaluation.ts`, `main.ts` and `verify.ts`.
- File modification times are 02:48:49Z, 02:51:41Z and 02:52:00Z. All are after the crash (02:47:31Z) and before the refreeze (02:52:32Z).
- The visible additions are A5 bookkeeping: the supersession logic in `main.ts:187-198` and a new check in `verify.ts:123-140`.
- However, `verify.ts` also holds `floorsMet`, which feeds V2 (`evaluation.ts:39`, `:998`). No pre-crash copy exists, so I cannot show `floorsMet` was untouched.
- **Fix:** list and describe all three changes in A5 and in IMPLEMENTATION_AUDIT §5, state explicitly whether `floorsMet` changed, and say that no prior copy exists.

**3. MINOR: `verify.ts` does not recompute the labels, although its header says it does.**
- `verify.ts:4` claims "recomputes the verdict labels"; the code has no rubric step.
- PROTOCOL §13 promises that a fresh clone can check every verdict figure.
- **Fix:** correct the comment and the README. Point to this review's independent recomputation.

**4. MINOR: the data door reads 1 MiB raw chunks, so bytes past the bound reach memory.**
- `doors.ts:105,156` reads in 1 MiB chunks, so up to about 1 MiB after the stop line is buffered. That is the first weeks of 2024, or of each fold's evaluation year for the development doors.
- The stop line's first 32 bytes, a post-bound timestamp, are decoded to compare against the bound.
- Nothing past the bound is parsed or hashed. `prefixBytes` and the hashes cover only bytes that were consumed, and the prefix hashes are identical across repeated openings (door-log rows 0/1/2/5, 3/4/6/7, 11/12/13).
- The README line "No 2024… bar was loaded, previewed" and IMPLEMENTATION_AUDIT §3 therefore overstate the position.
- Related: `splits.json` (2024–26 splits) and `distributions.csv` (22 rows after 2023) are parsed and then filtered out.
- **Fix:** reword the claim precisely. Use bounded reads in future studies.

**5. MINOR: the protocol's evaluation-stage hash cross-check (§3) was never implemented.**
- The only comparison of loaded-bar hashes is for the five B5 members, in `parity.ts:149-153`.
- I checked it myself: all 29 symbols in `research/d1-ranked-preemption/results/controls/final/CONTROLS.json` match the evaluation door's `loadedBarsSha256`. The other 32 symbols have no sealed hash to compare against.
- **Fix:** disclose the omission and record this result.

**6. MINOR: E11's Spearman differs from the protocol's "pooled" wording and mishandles ties.**
- The code uses only the 100 best configurations (`evaluation.ts:607-611`) and plain ordinal ranks without tie-averaging (`:234-260`).
- Ties are heavy: 355 of 400 in 4D-A, 262 of 300 in 4D-B0.
- With tie-averaged ranks, 4D-B0 is −0.95 rather than −0.82. Pooling the best and random sets turns 4D-B's value slightly positive (+0.01).
- No label changes, because E1 fails everywhere.
- **Fix:** disclose. The reports already say "top-100".

**7. MINOR: the parity tests do not meet all the minimum case counts in ENGINE_CONTRACT §10.**
- Reference parity has no "closing-print" minimum and folds P4 deadline cases into "P4 forced or recovered" (`referenceParity.ts:159-174`).
- The P2L check against the frozen engine requires only executed ≥ 20 and aborted ≥ 10 (`parity.ts:516-525`). Its record shows zero superseded and zero auction-aborted cases.
- No sealed pick uses P2L, so this cannot affect a result.
- **Fix:** disclose in IMPLEMENTATION_AUDIT §2.

**8. MINOR: `tests/doors.test.ts` no longer exercises the refusal paths it was written for.**
- Lines 84-102 now branch on whether records are sealed. With everything sealed, the evaluation-door and H-door refusals are never tested.
- The header (line 3) says no file under `data/` is opened, but line 51 copies `data/partitions.json`.
- **Fix:** point the test at a temporary results directory so both branches run, and correct the header.

**9. NOTE: notes with no effect on any label.**
- **Latency stress.** E7b's "+5 minutes" stress sets latency to 300 s in place of the 60 s base (`evaluation.ts:446`), which is +4 minutes.
- **Chained priority ranks.** The chained account would apply a continuing shallow book's new priority rank backwards over earlier years (`evaluation.ts:171-174` with the static ranks in `allocator.ts:373-385`). This never happens: no shallow book continues from one fold to the next in any experiment.
- **Vacuous passes.** E10 passes trivially when ΣΔ is negative, and E6 passes trivially for the controls; PHASE_4E discloses both. Separately, "two-tier" is defined from chained shallow lots (`:1026`), not from what the pick contains.
- **Reference engine provenance.** `reference.ts` imports only frozen modules, and the two A18 sites (`:516`, `:556`) match A3. But no hash of the author's handed-back version was recorded, so "the only edit" cannot be checked.
- **Missing script.** The A5 dry-run scratch script is not in the task directory.
- **Recorded verify failure.** `verify` reports 89 of 90 because the superseded F20 4D-A record still points at the overwritten archive path. The moved file `archive/superseded/F20/4D-A-freeze1.jsonl.gz` hashes to `046bdee9…`, which matches that record. This is already disclosed.
- **Small report gaps:**
  - FINAL's list of positive fold-years leaves out the two +$524 years (4B and 4C in 2023).
  - 4D-B0's perturbation median is exactly $0, not negative.
  - The reset's non-executable closing mark has no separate label.
  - The evaluation record carries no `doorLogSha256` (only the SPEC records do).

## Verified correct

- **Chained Δ and every criterion.** I recomputed Δ as chained years minus B5 years, plus E1, E2 (rebuilt from `b5Trades` and B5's lots), E3, E5 (from the perturbation rows), E6, E7, E7b, E8, E9 (from the lot list), E10, and E11 (null 75th percentile). Every value matches `rubric` and `FINAL.json`.
- **Lot reconciliation.** Where no lot spans a year end, the yearly increments equal the sum of lot nets to the cent.
- **4D floors and extensions.** All 30 searches meet their floors at scale 1. The extension trigger, recomputed from `bestByGeneration`, is consistent in all 30 (11 extended). Archive row counts and unique keys match for the archives I sampled.
- **A4.** The rerun's initial design and evolution are identical to the superseded run's, and both are no-fill.
- **Sealing order.** The F20–F23 selections were sealed at 22:23:31, 23:34:51, 01:04:23 and 02:43:47Z. The evaluation code was frozen at 02:44:36Z and the first evaluation door opened at 02:46:14Z. The evaluation was sealed at 02:57:14.996Z and the H door opened at 02:59:37Z.
- **Door records.** Each development door opened after the previous fold was sealed. Each SPEC `doorLogSha256` matches the door log's prefix at that point (5, 9, 10, 11 and 15 lines). Last dates and bounds are correct, and `prefixBytes` grows across windows.
- **A5 rerun.** Every figure the crashed run printed is reproduced exactly. Nothing was sealed by the crashed run. The development code is unchanged across both evaluation freezes.
- **Development figures reproduced.** All 32 fold picks' development Δ, recomputed with traces through 2023, equal the sealed values. That is evidence of no look-ahead into the development scores.
- **Selection rule.** All 33 sealed picks meet the §8 rules: feasibility, preservation, top-five, year share, leave-one-year-out, and robust step with n = 24, median ≥ $5k, share ≥ 0.60.
- **Allocator against ENGINE_CONTRACT.** I checked the phase order (exit, switch, intrabar exit, fill, then P4 check and decide). Estimates use only closes known at the time. Sales go at the first trade at or after the decision; purchases are decided at the fill time plus latency, and can never come before the virtual fill. I also checked supersession, stale and orphan handling (they read a trade's fields only at its own events, and unclassified exits throw), fill tests, P4 and P0M, cancelled reservations, gates (only for shallow decisions, active books, and causal spans), and the chained policy schedule and runoff books. I found no look-ahead.
- **Fast = reference.** All 16 checks on the verdict accounts compare money, lots, switches, marks and drawdowns for exact equality.
- **Parity.** B5 373/373. The evaluation's B5 net of $388,489.25791641016 equals the parity anchor.
- **Scope and protected inputs.** Changes are limited to `package.json` (one script line) and the two Study 4 directories. The `._.DS_Store` files are from 18:38Z, before the branch was created at 19:21Z. All protected-input hashes pass. The hashes quoted in RESEARCH_RECOVERY recompute correctly.
- **Reports and tests.** `report.py` regenerated tables, ledgers and reports with no differences. The headline report numbers match the records. The limitations are stated: in-sample, designer knowledge, B5 hindsight, overlay not evaluated, mirror-lot management, and F20's two B5 lots. Unit tests pass 28/28.

## My independent recomputation of the labels

| Exp | ΣΔ | Min DD | E1 | E2 | E3 | Label |
|---|---:|---:|---|---|---|---|
| 4B | −27,669 | 33,493 | F | P | F | risk-incompatible |
| 4C | −48,533 | 26,510 | F | F | P | no demonstrated |
| 4D-A | −67,337 | 27,596 | F | P | P | no demonstrated |
| 4D-A0P | −87,312 | 48,188 | F | P | F | risk-incompatible |
| 4D-B | −178,741 | 47,510 | F | F | F | risk-incompatible |
| 4D-B0 | −13,140 | 26,510 | F | F | P | no demonstrated |
| 4D-C | −101,768 | 38,653 | F | F | F | risk-incompatible |
| 4D-C0 | −123,403 | 55,226 | F | F | F | risk-incompatible |

- The risk cap is min($35k, B5 $26,510 + $5k) = $31,510.
- E5, E7, E7b, E8 and E11 fail for all eight. Margins against the controls: 4D-A − 4D-A0P = +$19,975; 4D-C − 4D-C0 = +$21,635; 4D-B − 4D-B0 = −$165,601.
- Under the V2 as coded, these labels are identical to FINAL.json. Under the strict reading in Finding 1, all eight become "invalid/incomplete". Either way there is no nominee.

## Overall assessment

There are no blockers. The engine and its causal ordering are sound, the embargo held for every bar that was decoded, the sealing order is clean, and the negative result is robust.

Two disclosure corrections are needed before commit:
- **4A floors (Finding 1):** the floor shortfall, and the false "every budget spent" claim in the reports.
- **A5 file list (Finding 2):** the full set of files the fix changed.

Whether V2 passes or fails under Finding 1 is a decision for the user.
