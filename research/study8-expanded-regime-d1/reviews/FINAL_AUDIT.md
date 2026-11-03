# Study 8 final audit (read-only), 2026-11-01T23:43Z

**Verdict: PASS WITH CORRECTIONS.** The integrity chain checks out completely: 13 entries in order, every quoted hash matches, the doors opened in the right order, all 71 sealed bodies verify, and the confirmation is identical. The mechanical result also re-derives exactly. Outcome *qualified*, 18 nominations (16 pass, 2 ambiguous), primary nominee #1 VG profit, and the T1–T7 status of every holder and member in all five folds recomputes with 0 mismatches. Every dollar figure in the README "Short answer", the RECOMMENDATION per-track table, CHRONOLOGICAL_VALIDATION §1, §2 and §5, the NEIGHBORHOOD_ROBUSTNESS §1 tables and the RISK_AND_TRADE_SEQUENCING §1 table matches the records. The errors are all in narrative ranges and generalisations (two of them in the README and RECOMMENDATION) plus one omitted hypothesis. None of them changes the outcome, the nominations or the decision.

## Findings

1. **error — CHRONOLOGICAL_VALIDATION.md:94.** Claim: "nominees' test-window profit ($22k–$84k)". Record: $19,512 (#17 VXR extra) to $83,793 (#5 VG extra), `holders[].deep.test.net`. Fix: "$19.5k–$83.8k", which is what README and RECOMMENDATION already say.
2. **error — RISK_AND_TRADE_SEQUENCING.md:148–149.** Claim: "The VXRKG and VXR nominees' worst drawdowns are in March → May/June 2022 ($19.0k–$25.3k)".
   - This is false for three nominees (`evidence.centre.record.ddPeak/ddTrough`):
     - #8 VXRKG profit: 2023-03-14 → 05-04, $25,616.
     - #14 VXRKG extra: 2021-01-25 → 01-28, $22,887.
     - #15 VXR profit: 2021-01-28, $22,020.
   - Fix: "#9 and #10 (VXRKG) and #17 and #21 (VXR) had their worst drawdowns in March → May/June 2022 ($19.0k–$25.3k); #8's was in March–May 2023, and #14's and #15's in January 2021."
3. **error — NEIGHBORHOOD_ROBUSTNESS.md:61.** Claim: "At 1.5r, the pooled nominees keep 80–96%". Record: 79.7% (#1) to 99.2% (#21); #17 is 98.4% and #11 97.7% (`evidence.alternates.wide.nb.share`). Fix: "80–99%".
4. **error — NEIGHBORHOOD_ROBUSTNESS.md:65.** Claim: "The nominees sit with 3–13 coordinates within one radius of a bound". Record: #5 VG extra has 2, so the pooled nominees range 2–13 and all nominees 0–13 (`evidence.nearBound`). Fix: "2–13 (pooled nominees)".
5. **error — NEIGHBORHOOD_ROBUSTNESS.md:67.** Claim: "[T2b] passed for every nominee except #18". #18 is not a nominee (it failed T2b), and #4 also failed T2b (in-box share 22.3%). Fix: "T2b passed for every pooled holder except #4 (22.3%) and #18 (88.3%)".
6. **error — NEIGHBORHOOD_ROBUSTNESS.md:68.** Claim: "The single-book G and V holders have little or no clipping". Record (`evidence.clipping.pointsWithClip`): #22 has 239/384 points clipped, #19 160/384, and #25 and #26 144/384 each. Only #12, #23 and #24 have 0. The section's own table shows #25 at 144/384. Fix: "Single-book holders have 0–3 coordinates near a bound, but 144–239 of 384 decisive points clipped for #19, #22, #25 and #26".
7. **error — RECOMMENDATION.md:168.** Claim: "drawdowns up to about $31k per $100k on the record". The largest nominee run drawdown is $34,472 (#26 V extra, 2020-02-19 → 03-18). $31,225 (#1) is only the largest test-window drawdown. The same bullet names #26 as close to the $35k screen, so it contradicts itself. Fix: "run drawdowns up to $34.5k (#26, 2020); test-window drawdowns up to $31.2k (#1, 2026)".
8. **error — README.md:48–49, and the bold line at CHRONOLOGICAL_VALIDATION.md:102.** Claim: "Study 7's references, trained only through 2023, also pass". Only Study 7 #1, #2, #5 and #6 (the VG/VXR references) pass. #7, #10 and #11 (GDX) fail T3, with test nets of $11,112, $6,853 and $7,442 (`controls["S7#7…"/"S7#10…"/"S7#11…"].gates`). Fix: "Study 7's VG/VXR references … also pass; its GDX references fail T3."
9. **error (omission) — no report.** PROTOCOL §1.2 says outcomes are reported against the hypotheses, but H3 ("the five-book track finds no configuration passing the full 40-D joint gate") is never reported. The records do not support it:
   - Five VXRKG holders qualified on F24 training.
   - On the test, VXRKG #8, #9, #10 and #14 pass T2 in the full 40-D design (99.0 / 99.5 / 98.4 / 95.1%).
   - Fix: add "H3 is not supported" with these figures to CHRONOLOGICAL_VALIDATION §1 or NEIGHBORHOOD_ROBUSTNESS §2.
10. **imprecise — RECOMMENDATION.md:143.** "VG 0.40" should be 0.39: `qualify/VG/F24/qualification.json pbo.pbo` = 0.3948 (shown as 0.395 in `qualify-pbo.md`). The other five F24 PBO values and "20 of 30" are correct.
11. **imprecise — RECOMMENDATION.md:158, CHRONOLOGICAL_VALIDATION.md:123, RISK_AND_TRADE_SEQUENCING.md:142.** "best year 25–59% of net": the lowest is 24.5% (#15 VXR profit, 2020 = $57,315 of $234,146; `centre.bestYearShare` 0.2448). Fix: "24–59%".
12. **imprecise — RECOMMENDATION.md:123.** "That property … persisted in 2025–2026 for 25 of 26 holders" is ambiguous. 24 of 26 holders pass T2 on the test families (#4 at 21.1% and #23 at 89.8% fail). 25 of 26 kept their test share within about 5 points of their training share (the largest move apart from #4 is #18, 95.3 → 90.1). State which measure is meant.
13. **imprecise (interpretation) — CHRONOLOGICAL_VALIDATION.md:33 and :38; README.md:50.**
    - "Unseen drawdown regimes break every candidate" and "Hypothesis H1 is confirmed" are causal and too strong for three overlapping, previously inspected folds; PROTOCOL §1.1 and §3.3 call them descriptive diagnostics.
    - "F19 0/19 on 2020 … F21 0/28 on 2022" oversimplifies:
      - 4 of the 19 F19 holders' worst drawdowns bottomed in 2021, and 3 F21 holders' in 2023, all at or above $35k.
      - Some holders never breached T1 and failed other gates: 2 in F19, 2 in F20, 5 in F21.
    - Fix: "H1 is supported (descriptively)" and "failed on test windows containing 2020 (F19) / 2022 (F20, F21)".
14. **imprecise — NEIGHBORHOOD_ROBUSTNESS.md:53–54.** "because the centres themselves breached the ceiling" is not the whole story. T2 failed for 36, 33 and 36 members on F19, F20 and F21, but T1 only for 29, 32 and 30; so 7, 1 and 6 members failed T2 with a centre below $35k. Fix: "largely because".
15. **imprecise — NEIGHBORHOOD_ROBUSTNESS.md:57–59.**
    - "fragile … but not under count-matched perturbation" overstates it: B5's k = 8 share of 87.5% is still below the 0.90 gate, and it is only 53.9% at 0.5r.
    - "Much of B5's fragility is the simultaneous perturbation of 40 coordinates" ignores that VXRKG nominees reach 98–99.5% under the same full 40-D design.
    - Fix: soften both statements, and note that dimension alone does not explain B5's fragility.
16. **imprecise — NEIGHBORHOOD_ROBUSTNESS.md:66.** "typically X near its 30% maximum, small Y and wide W" leaves out the most common case. Across the 18 nominees' near-bound coordinates: trailing stop near its 3% minimum 17 times, X at its maximum 13, Y at its minimum 11, loss buffer at its minimum 10; W is split, 9 at the maximum and 7 at the minimum.
17. **imprecise — RISK_AND_TRADE_SEQUENCING.md:149–150 and :157–158.** The quoted "lots of −$7.3k …" and "(−$10.9k, −$11.5k, −$7.6k, −$8.5k, …)" are drawdown contributions (`deep.series.lots[].contribution`), not lot P&L.
    - #12's "−$7.3k" lot actually made +$4,271.
    - #1's first lot made +$3,245 and its last −$3,106.
    - #1's list is out of order and leaves out −$654 and −$4,948.
    - Fix: call them "drawdown contributions" and list them in order.
18. **imprecise — RISK_AND_TRADE_SEQUENCING.md:152.** "[2025 tariff episode] Profitable for the nominees": #12 G profit made $0 in T2025Q2 (`periods.T2025Q2`). Fix: "17 of 18 nominees were profitable; #12 was flat".
19. **imprecise — RECOMMENDATION.md:104–105, CHRONOLOGICAL_VALIDATION.md:41–42.** "F23's candidates … did not earn the required $10k" is true of most, not all. 4 of 26 F23 holders made at least $10k at the centre: #1 VXRG $29,009, #3 $28,938, #10 VG $25,260 (the pass) and #11 G $25,874. #1 and #3 failed T3 on a $0 neighbour median, and #11 failed T2b. Fix: "most …".
20. **imprecise (omitted disclosure) — README, RECOMMENDATION §2, CHRONOLOGICAL_VALIDATION §3.** PROTOCOL §1.4 discloses that B1's 2024–2025 was inspected by the programs that chose it. That makes B1 not out of sample on the F24 window, which favours B1 in the tier, E3 and the bootstrap. The reports' B1 and B5 test-window comparisons do not repeat this. Add one line.
21. **imprecise (omitted disclosure) — CHRONOLOGICAL_VALIDATION §3, README.** None of the reports calls the Study 7 comparison **non-decisional** (PROTOCOL §8.6; brief §8). Only the generated `F24-study7-comparison.md` header does. Label it and point to that table.
22. **imprecise (brief §10.8) — EXECUTION_AND_INTEGRITY §6 / RESEARCH_RECOVERY §1.** The Study 8 worktree's own uncommitted set is never listed: `M package.json`; `?? config/research-phenotypes/study8-expanded-regime-d1/`, `config/research-pools/study8-expanded-regime-d1/`, `config/research-pools/study8-local-runners/`, `research/study8-expanded-regime-d1/`, `src/study8-expanded-regime-d1/`, `src/study8-runners/`. `protocol_freeze.json` `git.status` records only the state at the freeze.
23. **imprecise — RUN_COMMANDS.md:56; EXECUTION_AND_INTEGRITY.md:102.**
    - "about 23:05–23:08Z": the training-window `compare` ran at 23:14:19Z (output directory `20261101T231419Z-compare`).
    - The `list` command has no log under `results/runlogs/`, though §3 says the logs are `runner-*.txt`.
24. **imprecise — AMENDMENTS.md:101–102 (E1).** The `study8-run` adapter does not log to the door log. That departs from the frozen PROTOCOL §3.2 ("each run is logged in the door log"), not only from "the review note". AMENDMENTS is append-only, so add a disclosure entry rather than editing E1.
25. **imprecise — RESEARCH_RECOVERY.md:24 and :48–54; README.md:3 and :73.**
    - Line 24 says the amendments head is "R0 … at the freeze". It is now E2 plus the chain-head log through entry 13; the file's sha256 is `056a25d878973020…`.
    - Next-action items 1–2 are already done.
    - README says "Status: complete" while the checkpoint says INCOMPLETE.
    - README lists a "final audit" in `reviews/` that does not exist yet.
26. **imprecise — EXECUTION_AND_INTEGRITY.md:94–99 (and E2 line 125).**
    - "21:2x" is a placeholder time.
    - Test start times are rounded later than the door openings. Door-log times are F19 21:40:43, F20 21:52:34, F23 22:23:43, F24 22:39:52 and confirm 23:03:52Z. Use these.
27. **imprecise — SEARCH_AND_COMPUTE.md:83–85.** Hypervolumes: VXRG-F21 "659 → 751" should be 658 → 751 (658.46). VXRKG-F19 "584 → 584" should be 583 → 583 (583.47).
28. **note — NEIGHBORHOOD_ROBUSTNESS.md:70–72.**
    - #1's pooled share is 358/384 = 0.9323. One fewer neighbour below $35k (357/384 = 0.9297) would make it ambiguous; this is worth stating.
    - "the closest to failing on its own" (91.4%) holds only among pass-status holders: #12's family 1 is 88.3% with p90 $35,724 and fails on its own.
29. **note — NEIGHBORHOOD_ROBUSTNESS.md:79–80.** "$25.4k" is the median *absolute* own-P&L-versus-funding interaction (`sequence.medianAbsInteraction`). It is not evidence of profitability. That evidence is `lowJaccardMedianNet` $295,879 (centre $308,742). Reword.
30. **note.** `reviews/FINAL_AUDIT.md` and the narrative reports are outside the chain; there is no phase after entry 13. The checkpoint guard "reviews/*.md sealed" is broader than what the chain actually seals (three review files). Disclose this.
31. **note.** The runner commands and `research-configs` ran while F24 `--confirm` was running (23:03:52–23:27:28Z). The confirmation is still identical, so there was no effect, but it could be mentioned.
32. **note.** The brief asks for list / inspect / run commands. There is no separate `inspect` command; `list` and the config JSON cover it.

## Checks performed
- **Chain:** `npm run study8 -- verify-chain` printed "chain OK: 13 entries; integrity OK (code 3d0cb5b82ca1, engine 2b5c5dc4a113, accepted by E1)".
  - The 13 phases are in the required order.
  - All 13 entry hashes and seal times in EXECUTION §1 and the AMENDMENTS chain-head log equal `chain.jsonl`, as do the file hashes quoted there (test.json, confirm.json, the F24 body `f85b4d7a…`, the selection body `5d266eea…`, the audit, PROTOCOL).
  - Each entry's door-log prefix (line count and sha256) recomputes.
- **AMENDMENTS:** the "before" hashes for E1 (`6a031cfc…`) and E2 (`44c6b1c3…`) recompute, and both frozen snapshots are prefixes of the current file, so it is append-only as claimed.
- **Doors** (`doors.jsonl`, 90 lines): the pilot opened 2× before the freeze; parity next; search doors at lines 25–54 and qualification doors at 55–84, one per job; then the test doors F19 → F20 → F21 → F23 → F24 (lines 85–89) and one F24 confirm (line 90). Each test door recorded the previous phase's chain head (entries 7 → 12).
- **Confirmation:** `confirmation.identical` is true. Only stage, at, seconds and the lots path differ; the lots files have the same sha256 (`f06f18b6…`).
- **Body hashes:** all 71 sealed JSON bodies verify — search 30, qualify 30, the six test/confirm records, the selection, audit, freeze, parity and code-E1 records.
- **Ranking and nominations:** `FROZEN_SELECTION.rankedByFold` equals each test record's holder order and IDs (19/27/28/26/26 holders). The nominations recompute as the 18 non-failed holders in sealed order; outcome *qualified*; primary #1.
- **Fold counts:** holders not failed 0/19, 0/27, 0/28, 1/26, 18/26; members 0/36, 0/36, 0/36, 1/36, 22/36. The DD-breach counts, median test nets, gate-failure tallies and Study 7-equivalent pass counts (0, 0, 0, 2, 23) all match.
- **T gates:** T1–T7 and pass/ambiguous/fail were recomputed from the record fields per PROTOCOL §8.4, with yTest and floors taken from `window`, for every holder and non-holder member in all five folds: 0 mismatches. In detail, for F24:
  - **#1:** pooled share 0.9323, p90 $33,063, centre DD $31,225; status pass.
  - **#4:** fails T1 ($37,722), T2 (21.1%), T2b (22.3%), T3 ($921) and T4 (+25 bps test net −$1,175; next-open run DD $37,722).
  - **#12:** ambiguous, because the share is 0.919 ≤ 0.93 and family 1 fails on its own (88.3%).
  - **#26:** ambiguous, because the centre DD is $34,472 ≥ $33k (top lot 24.92%, just inside the 25% cap).
- **Controls and comparisons:**
  - B5 test net $71,986 and run net $484,636.97; B1 $40,901 and $176,260.47; frozen VG $70,420, 71.9%; G-PA 15.4%; B5 29.2% with p90 $53,941; B5 refused 78 signals.
  - Bootstraps for #1 (`holders[0].comparisons`): vs B5 −$7,820 (5–95% −$35,562 to +$19,021; 32.7% of resamples above 0); vs B1 +$23,265 (−$19,252 to +$70,182; 80.5%).
  - Positive test window: 96.3% of qualified members and 100% of non-qualified. 3 of the 9 non-qualified members survived the T gates (VG #4 ambiguous, VG #5 and VXR #4 pass).
  - Return-rank ρ values all match.
  - PBO is above 0.5 in 20 of 30 track-folds.
  - Search totals: 440,126 rung-1 configurations, 9,983,389 points, 55.42 CPU-h; per-track job-time ranges match; T1 fired in 5 jobs and T2 in 18.
- **Tables:** every row of CHRONOLOGICAL_VALIDATION §2–§3, NEIGHBORHOOD_ROBUSTNESS §1 (holders and controls) and RISK_AND_TRADE_SEQUENCING §1 (all 18 nominees, all columns) matches the records. The gap-risk and fill-stress ranges in RISK §3 and the refused-signal counts in §4 match too.
- **Other records:**
  - Parity: `passed` true with all gates true; attempt 1 is preserved (body `d0f05d9e…`, `passed: false`).
  - Minute series match the tracker, and lots reconcile, for every holder in every fold.
  - Inherited suite logs: base 847/793/9/28/17 and head 862/808/9/28/17, with the same failing set.
- **Deliverables (brief §10):** items 1–7 are present. All 36 research configs are labelled NOT DEPLOYED, with IDs and test status matching the record. The runner logs show reconcile PASS, or n/a off convention. Item 8 is met except for finding 22.
- **Interpretation:** no report calls 2025–2026 independent validation, implies deployment or reorders by test outcome. RECOMMENDATION §2 handles #2 versus #1 correctly. Exposure, local seal ≠ commit, and the inherited failures (in EXECUTION §5) are disclosed. The gaps are findings 9, 13, 20 and 21.
- **Read-only:** the door log is still 90 lines and the chain 13. The worktree's git status is unchanged from the start of this audit. Scratch files only.
