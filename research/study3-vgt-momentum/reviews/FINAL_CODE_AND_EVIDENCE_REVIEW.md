# Final code and evidence review: Study 3 Stage 1 (`study3-vgt-independent-momentum-v1`)

Reviewer: an independent subagent, working read-only from 2026-10-28 17:52Z to 18:12Z UTC.

**Commands run:**
- `status`: 14 records, all "sealed, verifies".
- `verify`: `problems: []`.
- Study tests: 20/20 pass.
- `report_tables.py`: it regenerated every file in `results/tables/` and `CANDIDATE_REGISTER.json` byte-identically (sha256 compared before and after).
- Python scratch scripts that read the sealed records and payloads directly. They do not use `rubric.ts` or the tables.

**Not checked:** `tsc` and `eslint` were not run because they were not authorised, so the IMPLEMENTATION_AUDIT §7 claims about them are unverified here. The engine was not re-run on market data.

**Files changed during the review:** `RESEARCH_RECOVERY.md` (17:52:57Z) and `IMPLEMENTATION_AUDIT.md` (17:55:03Z) were rewritten while I was reviewing. The findings below refer to the versions on disk at 18:12Z.

## What I recomputed (and it matched)

**Rubric (PROTOCOL §11), recomputed from the `evaluate-*` and `robustness` summaries:**
- V_F = +18,608.32 / +14,576.96 / −57,578.30 / +24,646.00. Σ = +252.98. Positive windows: 3. min V = −57,578.
- Window minute DD = 25,298 / 24,808 / 63,078 / 18,359. Π minute DD = 63,569.06 (end +215.69). The chain formula matches `ledgers.ts` (peak carried, offset by the previous end).
- Labels 1–2 are not triggered: no fold is undefined, and every window has at least 2 lots entered or carried (2/2/4/3).
- **T:** (i) F, (ii) T, (iii) F, (iv) F, (v) F. The label "no demonstrated standalone edge" is correct.
- **E:** f = 0.7541 / 0.9973 / 0.3352 / 0.8626. Excess = −4,615 / −1,238 / −43,205 / −3,762. Σ = −52,820.03. No window reaches +2,000. E fails.
- **R0:** stress sums −579.29 / −8,590.86 / −198.74 / +692.92. Fold-C stressed DDs are 63,390 / 63,588 / 63,530 / 63,577. R0 fails.
- **R:** H-P\* r1–r6 = 119,218 / 104,216 / 0.8906 / 120,096 / 121,049 / 25,809 (all pass). D-P\* r3 = 0.6875 (fails). R fails.
- **K:** P\* minus control = −43,845 / −21,491 / −21,250. P\* exceeds none.
- P\* (highest neighbourhood median) and P0 (highest TPL default net among M1-passing families) re-derived for every history; all match the records.

**Selection leakage:**
- `createdAt` order: develop-A 17:32:47 → B 17:34:09 → C 17:35:43 → D 17:37:02 → H 17:38:41 → evaluate-A 17:38:56 → B → C → D 17:39:12 → diagnostics → robustness → analysis 17:39:35. The logs show each develop stage starting only after the previous one sealed.
- Doors: every develop record's `lastDate` is its development end, and every evaluate record's `lastDate` is its window end. No record has a `lastDate` after 2023-12-29.
- The data sha256 is the same everywhere (`d8e6991d…`).
- Loaded-bar sha256 prefixes are consistent: develop-B = evaluate-A (`e05fd150`), develop-C = evaluate-B, develop-D = evaluate-C, and develop-H = evaluate-D = audit.
- The code enforces this order (`stageOrder`, `assertPredecessors`, `assertSealed`). The code-freeze manifest matches the current code (`verify`).

**Window accounting:**
- For all nine controls, V_F equals the calendar-year increment of the full-history robustness run (max |Δ| 2.9e-11). The window daily DD recomputed from the sealed daily marks equals `windowDailyDD`.
- Fold-D V equals D-P\*'s 2023 yearly increment.
- The window dollar-days of P\*_A (276 days) and P\*_C (122 days), recomputed from trade dates, match the records (27.6M and 12.2M).

**2022 decomposition:**
- The carried lot contributed −33,954.39 in the window.
- The 2021-12-31 close was 458.17, so its 517.15 shares were worth $236,943.67 (2.37× the slot).
- The price then fell 14.03% to 393.88.
- The other lots lost −10,608.82, −9,699.31 and −3,315.79. All four sum to V.

**Report figures:**
- An automated scan matched every dollar figure in the 11 reports to a sealed value. The exceptions are listed below.
- Joint-draw quartiles (statistics 'exclusive' method), placebo medians, 90th percentiles and ranks, OAT ranges, inverted-state nets, X2 trace counts, gate failures, feasible counts, and 26 of 51 champions with t ≥ 14% all match.
- Audit data QA, parity counts (840 runs, 751 traded, 5,503 lots, 0 differences, max |Δ| 2.9e-11; 1,428 synthetic runs) and the D1 anchor (17 trades, net $135,359.04) match.
- Every file hash and body hash quoted in IMPLEMENTATION_AUDIT §4 and RESEARCH_RECOVERY matches.

**Scope:**
- Tracked changes are limited to `docs/claude/context-recovery.md` (+26/−8) and `package.json` (one added script line plus a comma on the line before it).
- The only untracked paths are the two study folders. Nothing under `config/`, `data/`, other `research/` folders or other `src/` folders differs.
- `results/logs/` is git-ignored, which is disclosed.

**Identical window values:** several different TPL configurations have identical V values (for example, 2021: E02 default, E08 default, C-SMA/TPL and C-TSM/TPL all +7,059.2457). I traced these to identical R3F reclaim lots (2020-12-07 and 2021-04-12, at the same raw prices). This is legitimate, not a bug (see item 26).

**Code:** I found no look-ahead in `features.ts` or `signals.ts`. In `engine.ts`, fills, stops (gap, minute open, stop level), the entry-bar stop, interest (sTime is NY-date midnight, so there is no DST error), friction, liquidation, window boundaries and C-ALR segments all match the protocol. I found no double financing.

## Findings

1. **MAJOR: outputs promised by the protocol and the brief, accepted in dispositions, but neither delivered nor disclosed.**
   - **Where:** PROTOCOL.md:180-182 (§8: P\*-R, and a Pareto report over development net, minute DD and exposure); METHODOLOGY_REVIEW_1_DISPOSITIONS.md:39 (#18 "Accepted"). Neither appears anywhere in `src/`, `scripts/`, `tables/` or the reports.
   - **Where:** PROTOCOL.md:194-198 (§9: per-window price gain, interest, friction, realised/unrealised split, profit factor, holding statistics, MAE/MFE, campaign economics); METHODOLOGY_REVIEW_1_DISPOSITIONS.md:31 (#10); METHODOLOGY_REVIEW_2_DISPOSITIONS.md:24 (#16 "Accepted"); brief §8 ("Per candidate and per fold … mandatory").
   - **Evidence:** CHRONOLOGICAL_RESULTS §1–2 report only V, window minute DD, lots and the first/re-entry split. The trade rows needed for the rest are sealed in `results/payloads/evaluate-*/runs.json.gz` but are not shown in any table or report.
   - **Fix:** compute these figures read-only from the sealed payloads under a new descriptive amendment A2, and add a per-fold accounting table to CHRONOLOGICAL_RESULTS. Otherwise, disclose each omission in AMENDMENTS.md and correct the two dispositions.

2. **MINOR, FINAL:36-37: "H-P\* captured ≥ 75% of 7 of the 12 hindsight up-legs."**
   - **Evidence:** the analysis ledgers give 6 legs ≥ 75% (captures 0.996, 1.310, 1.001, 1.153, 1.313 and 0.7506).
   - **Fix:** "6 of the 12".

3. **MINOR, FINAL:100-101: "the 2023 pick captured 75% of the 2022-12-28 → 2023-07-18 leg with an 18-session entry delay."**
   - **Evidence:** 75% and 18 sessions are the in-sample H-P\* figures. The fold-D pick (E06-47640253c0) captured 71.7% after 17 sessions, as FINAL:35-36 and TREND:58-59 correctly say. An in-sample figure is attributed to the chronological pick.
   - **Fix:** "72% … 17-session".

4. **MINOR, STANDALONE_DISCOVERY:38-39: "No untuned momentum prototype beat it [C-ALR +$78,296] on net."**
   - **Evidence:** in the develop-H panel, E02/OX made +$85,240, which also beats C-SMA (+$78,764).
   - **Fix:** say that only E02 with its own exit (OX, +$85,240) beat it.

5. **MINOR, FINAL:52 ("at the procedure level, no") and STANDALONE_DISCOVERY:80-81 ("without raising the next window's result").**
   - **Evidence:** Σ V(P\*) = +$252.98 and Σ V(P0) = −$11,889.65. The searched procedure beat the protocol's own no-search comparator by +$12,142 (P §11 reports the search's value as Σ V(P0) against Σ V(P\*)).
   - **Fix:** state the +$12,142 difference, then add that both fail T, both trail every control, and four windows cannot separate them.

6. **MINOR, STANDALONE_RISK:71-74: the placebo wording overstates timing evidence ("says their timing beat random timing in-sample").**
   - **Evidence:** each finalist is the best of about 1,300 searched points (14,349 in H). The centres rank at the 92nd–96th placebo percentile. Their own ±10% joint-draw medians rank much lower: H-P\* $74,079 at 84.5%, D-P\* 80.0%, E05 84.5%, E03 88.5%, E08 73.0%.
   - **Fix:** report both ranks, and say the centre's rank is inflated by selection. Qualify "as a working regime filter should" (line 74) as in-sample.

7. **MINOR (the brief §9 requires this audit note): the incentive to optimise against known 2023 history is not raised where 2023 results are claimed.**
   - **Evidence:** E06 was added because Study 2 found D1 idle in calm advances, including late 2023 (PROTOCOL:28-29, bias (c)). E06 then became P\* in folds A and D and in H. README:25-27, FINAL:32-37 and TREND:57-59 present E06's 2023 result (+$24,646, 72% capture) without that link.
   - **Mitigating fact:** even so, the fold-D pick earned less than C-ALR (+$32,931) and C-SMA (+$25,980) in 2023.
   - **Fix:** add one sentence at each of those places.

8. **MINOR, FINAL:10-15 (Exposure column) and README:19 ("an always-long slot scaled to the picks' exposure"): exposure is principal-based and undefined in the reports.**
   - **Evidence:** f_F is borrowed-principal dollar-days, which cannot see share-count drift. Fold C's 34% counts the carried lot at $100k, though it was worth $236,944 at b.
   - **Fix:** label it "principal exposure (borrowed $-days)" and note fold C's market exposure.
   - **Fix:** retitle the README bullet "Exposure, not timing". The label "explained by exposure" was never reached, and E shows the picks did worse than a principal-matched always-long slot. Something like "No timing edge" fits.

9. **MINOR, CHRONOLOGICAL_RESULTS:77: "holds of up to 415 sessions".**
   - **Evidence:** the maximum is 453 sessions (lot 1, 2017-01-04 → 2018-10-19), as STANDALONE_RISK:27 says.
   - **Fix:** 453.

10. **MINOR, EXIT_MECHANISM_STUDY:60-61: "the frozen procedure applied it out of sample".**
    - **Evidence:** this contradicts FINAL:28 and PROTOCOL §1 ("not out-of-sample evidence").
    - **Fix:** "in the chronological replay".

11. **MINOR, STANDALONE_DISCOVERY:11-12: sizing and modifier results are pointed to reports that do not contain them.**
    - **Evidence:** the line says M13 (Z1), M18 (Z2) and M19–M20 (A1, A2) are covered in EXIT and REENTRY; neither mentions sizing, A1 or A2. Brief §5 H requires progressive-commitment results with capital-normalised outcomes.
    - **Available data:** `sizing.md` (Z1 +$21,776 vs exposure-scaled Z0 +$24,999; Z2 +$27,864 vs +$28,691) and `diagnostics.md` (A1 +$35,387 and A2 +$29,376 vs +$31,017).
    - **Fix:** add a short section with these figures.

12. **MINOR: P0's drawdowns are omitted.**
    - **Evidence:** FINAL:80 shows "—" for P0's largest window minute DD. The sealed value is $56,227 (E09 default, 2022); 2020 was $49,584.
    - **Evidence:** STANDALONE_RISK §6 (84-89) lists breaches only for champions and controls, so P0's (the E09 default's) 2020 and 2022 breaches are missing.
    - **Fix:** fill in the value and add P0 to §6.

13. **MINOR: parity coverage gaps are not disclosed.**
    - **Evidence:** the verdict-bearing fold picks P\*_A–P\*_C (E06-9ee2ce7bd5, E04-86b6d59a31, E04-b4a27ac53b) were never compared with the reference on their evaluation data. S7 covers only finalists and controls; S2 used data ≤ 2019.
    - **Evidence:** the placebo, inverted-state, Z2 and A2 runs are engine-only (`reference.ts:467-468` throws for them).
    - **Evidence:** the rubric, Π and window dollar-days have no unit test (`pipeline.test.ts:69-71` only checks that the label is a string). This review recomputed them from sealed outputs but did not re-run the engine.
    - **Fix:** disclose these gaps in IMPLEMENTATION_AUDIT §2 and DATA §4. Optionally, add a descriptive, read-only check that engine = reference for the three fold picks through their window ends.

14. **MINOR, IMPLEMENTATION_AUDIT:25: "engine.test.ts (16 tests)".**
    - **Evidence:** the file has 19 tests (20 with the pipeline test).
    - **Fix:** 19.

15. **MINOR: stale or overstated checkpoint statements.**
    - **Evidence:** RESEARCH_RECOVERY:14-15 and :44 still say the after-study `npm test` is "running". `audit/tests/full-suite-after.txt` finished at 17:54:27Z (764 tests, 757 pass, the same 7 known failures).
    - **Evidence:** IMPLEMENTATION_AUDIT:115-116 says the checkpoint was "refreshed at the milestones". The version I read at 17:52Z was headed "Updated 17:44Z" and still said "INCOMPLETE — frozen; outcome stages starting", "Next step: stage develop A…", "Nothing outcome-bearing exists" and "PROTOCOL.md v1.1". So the checkpoint was not refreshed during the S4–S8 seals (17:32–17:39Z), and it contradicted itself until it was rewritten at 17:52:57Z.
    - **Fix:** update the after-study test row. Reword the audit sentence to match what happened (refreshed at the freezes and after all seals, with no per-seal updates).

16. **MINOR, PROTOCOL.md:10: amendments are to be logged in `AMENDMENTS.md` and `results/amendments.jsonl`.**
    - **Evidence:** `results/amendments.jsonl` does not exist.
    - **Fix:** create it with A1 (and A2 if added), or disclose the omission.

17. **MINOR, FINAL:116-118: recommends C-TSM/TPL, "the best risk-controlled control here", for a Stage 1b.**
    - **Evidence:** it was chosen on the same 2020–2023 windows that CHRONO:87-88 says must not be used to pick E06 or E03.
    - **Fix:** say this is itself a post-hoc choice among nine controls and may be tested only on unexamined data.

18. **NOTE: P0 rounding.** Σ P0 = −$11,889.65, which rounds to −$11,890. It is written −$11,889 at README:21, FINAL:56, FINAL:80 and CHRONO:36.

19. **NOTE: "no bar after 2023-12-29 was read" (README:34, FINAL:28, TREND:60).**
    - **Evidence:** the shared loader (`src/lib/evaluation.ts` `loadBounded`) parses every row of `data/VGT/data.csv` to check ordering and hashes the whole file. Rows after the end date are discarded and never used.
    - **Fix:** "no bar after 2023-12-29 entered any computation".

20. **NOTE: "bought at the COVID low" (README:22, FINAL:45-46, CHRONO:63-64, DISCOVERY:87).**
    - **Evidence:** the decision was at the 2020-03-13 close (a +11.0% day). The fill was at the 2020-03-16 opening trade after a −12.0% gap, five sessions before the 2020-03-23 closing low.
    - **Fix:** reword to say that.

21. **NOTE: "h_out 7.9 standard deviations" (FINAL:48-49, CHRONO:65).** h_out is a CUSUM threshold on cumulated standardised returns net of κ per session, not a 7.9σ move.

22. **NOTE: "four overlapping one-year windows" (FINAL:102).** The evaluation windows are disjoint; it is the development histories that are nested. The same wording is frozen in PROTOCOL:23-24.

23. **NOTE: "66,366 search evaluations stand behind these picks" (FINAL:23-24).** The four fold picks came from 52,017 evaluations (A–D). H's 14,349 produced only the in-sample pick.

24. **NOTE, FINAL:32-34.**
    - "Every family … without any drawdown prerequisite": E05 and E12 require a 2–12% pullback by construction.
    - "D1 primary made no decision" should read "opened no lot".

25. **NOTE: concentration of the development scores that drove selection is not reported.**
    - **Evidence:** the largest single lot was 68%, 67% and 76% of the A, B and C picks' development nets (for B and C, the open lot bought in March 2020). It was 51% for D.
    - **Evidence:** H-P\*'s top two lots make up 67% of its +$120,096 (91% for E05).
    - **Why it matters:** the neighbourhood median protects against parameter spikes, not against one lot dominating.
    - **Fix:** add a line in CHRONO §4 or RISK §2.

26. **NOTE: template convergence.**
    - **Evidence:** under TPL/R3F, a live campaign re-enters on price alone, so different signals produce identical lots:
      - 2021: E02 default, E08 default, C-SMA/TPL and C-TSM/TPL all +$7,059.25; E05 and E11 defaults both +$14,689.83.
      - 2022: E02, E08 and C-TSM/TPL all −$10,717.62; E11 and E12 both −$11,455.95.
    - **Why it matters:** comparisons between families and their defaults partly measure the template, not the family.
    - **Fix:** add one sentence to DISCOVERY §5.

27. **NOTE: small wording errors.**
    - CHRONO:85 "6 of 9 trading controls": the 9 include C-IDLE, so it is 6 of 8 trading controls.
    - REENTRY:48 "(it rarely stopped out)": it never did (0 stop fills).
    - REENTRY:48 and TREND:51 "C-SMA ≤ 3%": the maximum is 3.29%.
    - REENTRY:55: "but E11" moves in the same direction as E05.
    - EXIT:34 "widened only to 5.7%": true for 2020 only; the 2018 lot exited at the 4.0% floor.
    - EXIT:45 "halved": the drawdown fell by 44%.
    - EXIT:56 "by up to $61k": true only against CX1 and excluding HS. E02 X3 vs X5b differs by $95k.
    - DISCOVERY:68 "E06 v_out 44–56%": the fold picks are 51–56%.
    - DISCOVERY:70 "tight trails of 5–13%": E09 in fold A used 4.1%, and E01 and E04 also had tight trails.
    - README:30 "mattered only in 2022": true for the fold picks only. On the full history, E02 R0 vs R1 differs by about $15k.
    - STANDALONE_RISK:27 gives a median hold of 216; `risk-extras.md` gives 250 (different quantile rules).

28. **NOTE: `results/tables/risk-extras.md` (A1 script, `report_tables.py:270-285`).**
    - C-AL shows "Largest loss (lot) +$217,504" and C-ALR shows "Largest loss (campaign) +$78,296": these are each run's only lot or campaign, and neither is a loss.
    - C-AL's hold quartiles print "None/None/None".
    - "Share of sessions underwater" counts every session below the running peak, including flat sessions (90% for H-P\*). Define it or drop it.

29. **NOTE: record and door details.**
    - `PROTOCOL_FREEZE.json` says "version": "1.1" (hard-coded at `stages.ts:219`) for a v1.2 protocol.
    - Evaluate records omit the D1 `loadUniverse` door they also read (`stages.ts:699-700`).
    - S8 loads market data through 2023-12-29 for the leg zigzag (`stages.ts:1259`), though P §6 gives its door as "sealed records".
    - The S2 `realData` payload records per-run lot counts on fold-A data, beyond P §6's field names, difference counts and |Δ| (`stages.ts:362-371`). This is harmless: the protocol was already frozen and the code froze 15 s later.

30. **NOTE: carried-lot convention (disclosed in P §3).**
    - **Evidence:** 59% of the verdict-bearing 2022 loss comes from the continuous replay's 2020 lot.
    - **Why the verdict holds anyway:** under a flat start at b, T(iv) would still fail, because the three lots entered in 2022 alone lost −$23,624, beyond the −$15,000 floor.
    - **Fix:** one sentence in CHRONO §3.

## Verdict

**Code and sealed records:** I found no blocker and no defect that changes a reported result. The frozen label **"no demonstrated standalone edge"** recomputes independently and does not depend on any of the issues above: T fails on four of five tests, and T(iv) fails even under alternative conventions. The selection chronology, doors, freezes and scope are verified. The code is fit to commit as frozen.

**Reports:** they need text fixes first:
- Item 1 (MAJOR): deliver the promised per-fold accounting and the P\*-R/Pareto report, or disclose their absence and correct the two dispositions.
- Items 2–17 (MINOR): factual corrections, the in-sample labelling error, the search-value and placebo overstatements, the 2023 design-knowledge note, the exposure definition, the missing sizing section, P0's drawdowns, the undisclosed parity gaps and the stale checkpoint lines.

None of these fixes requires touching a sealed record, payload or frozen code. After them, the reports are fit to commit.
