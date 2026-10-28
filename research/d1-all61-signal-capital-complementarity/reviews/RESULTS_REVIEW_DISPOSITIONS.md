# Dispositions of the results and implementation review

The reviewer recomputed every Level D summary (732, 0 mismatches), every matrix's NA rules, all 25 replays'
attribution identities, the screens and the rubric, and confirmed the verdict. No sealed record was found wrong; every
finding concerned report text, a missing reporting table, the pending test correction or disclosure. All are accepted.
New reporting tables come from the read-only `scripts/report_tables.py` (`results/tables/pair-statistics.md`,
`idle-stretch-decisions.md`, `scenario-risk.{md,csv}`); no stage was rerun.

| # | Severity | Disposition |
|---|---|---|
| 1 | major | Accepted. C2 logged and frozen (`results/code_freeze-3.json`), tests and `verify` rerun after it (`IMPLEMENTATION_AUDIT.md` §7). C1's scope corrected in `AMENDMENTS.md`: besides `analysisStage.ts` and the test, C1 changed `freeze.ts` (the code-freeze chain and `freezeCodeCorrection`) and `cli.ts` (the new stage, status lines, latest-analysis display) — amendment machinery, outside parity's import closure, no effect on any record. |
| 2 | major | Accepted. FINAL Q4 now says the S1 losses came mostly from incumbent lots lost **directly** (−$138.3k vs −$24.6k by cascade over the six S1 replays; cascade dominates only for IGV). |
| 3 | major | Accepted. `results/tables/scenario-risk.{md,csv}`: side-by-side risk of every replay (baseline and baseline + candidate) — V, lots, W/L, worst lot, MAE, consecutive losses, 30/60/90-day changes, minute/daily drawdown, falling knives, time in market, portfolio start equity, increment and windowed drawdown; referenced from `RISK…` §5 and `EXACT…` §5. |
| 4 | minor | Accepted. `EXACT…` §5 rewritten: the sign flips in 5 of 18 fold replays (listed); increments are not like-for-like because start equity differs (shown); "every S1 negative" restricted to fold B. |
| 5 | minor | Accepted. XOP fold-b A0: 1 idle-clean decision (its only funded lot, 2022-08-31) and 4 busy. |
| 6 | minor | Accepted. XME: entirely idle-clean for B4 only; for B5 +$3.8k idle-clean of +$4.4k. |
| 7 | minor | Accepted. XOP's gain attributed to busy-against-baseline **and** idle-displacing lots, with figures. |
| 8 | minor | Accepted. Two of the three material XOP gains are formal reshuffles; B4 fold A fails the complement and the thin tests (table flag and FINAL/README wording fixed). |
| 9 | minor | Accepted. Idle-stretch figures recomputed minute-precisely by the reporting script (2017–18: B5 39 decisions −$54,011, B4 41 −$53,260; 2021 H2: B5 16 −$2,907, B4 20 −$11,076; the earlier date-based figures are withdrawn) and the one positive stretch (B5 2022-12-15 → 2023-01-03, +$25,212) added. |
| 10 | minor | Accepted. Spearman computed by the reporting script with stated orientations (0.445 alphabetically-first share; 0.46 / 0.48 / 0.59). |
| 11 | minor | Accepted. `PAIRWISE` §2 now reports ordered-pair means over both orientations (U-T 0.51, 1,460 ordered pairs ≥ 0.5, …) and labels ρ/Jaccard as unordered. |
| 12 | minor | Accepted. Least-coincident pairs restated with both shares from `pair-statistics.md`. |
| 13 | minor | Accepted. XOP solo families: two in mid-2017, seven in 2019; the 2022 families named F064–F067 and F072–F073. |
| 14 | minor | Accepted. `RISK…` §2 column is now the 30-day change (A/B4 −$10,326, A/B5 −$10,149, B/S −$9,077, B/B4 −$10,130), the cumulative-loss sentence corrected, B5's KRE-E10 (−$1,745) added. |
| 15 | minor | Accepted. FINAL Q6: "68–71% of the other ETFs' decisions arrive while B5 holds the slot; in fold B B5 itself refused 34 of 76, B4 15 of 64". |
| 16 | minor | Accepted. FINAL Q1: idle-displacing dominates for IGV, IBB and SMH; EWZ and GDX's vector have more idle-clean decisions. |
| 17 | minor | Accepted. "56 non-member slots"; "88 ordered pairs". |
| 18 | minor | Accepted. "Out of sample" replaced by "in the fold windows (period-correct selection, not an independent out-of-sample test; both windows lie inside the training era)". |
| 19 | minor | Accepted. `RESEARCH_RECOVERY.md` rewritten at delivery; "Study 2 completed" stated only after the commit and push. |
| 20 | note | Accepted as a disclosure (no code change). The code's materiality floor uses the magnitude of the worst own **loss**, max($5,000, −min(worst, 0)); PROTOCOL §9.1 writes \|worst own lot net\|. The readings differ only when the worst own lot is a profit above $5,000; the largest positive worst own lot in any fold replay is +$3,809, so every floor and flag is identical under both. Recorded in `AMENDMENTS.md` (note N1) and `IMPLEMENTATION_AUDIT.md`. |
| 21 | note | Accepted. The U-A interpretation softened (sparse uniform rule); maximum-hold wording corrected (armed when losing at the open; sells at the next trade, can close slightly positive); XLE "never passed all of a screen's gates", with its fold-b A0's 2 idle-displacing decisions against B5 (idle net +$7,673). |
