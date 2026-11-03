# Independent results and implementation review (verbatim)

Reviewer: an independent read-only subagent (general-purpose), 2026-10-28 (UTC, about 14:40–15:05Z), given the brief, the frozen protocol, the amendment ledger, every report and read-only access to the sealed records and CLI. Its report follows unedited; dispositions are in `RESULTS_REVIEW_DISPOSITIONS.md`.

---

## Results and implementation review: Study 2 (read-only)

Everything checked is relative to the working tree at about 14:40–15:05Z, 2026-10-28.

### Findings

**1. MAJOR: `verify` now fails, and the C1 scope is under-reported.**
- My first `verify` passed 17/17. A rerun at 15:03Z fails with "the study code changed since the code freeze: cli.ts, tests/realData.test.ts". Both files have mtime 14:55:49Z, which is the pending C2 correction.
- Before delivery: log C2, run code freeze 3, rerun the tests and `verify`.
- Separately, `AMENDMENTS.md` gives C1's scope as "analysisStage.ts (+ tests/rubric.test.ts)". `results/code_freeze-2.json` `changedFiles` also lists `cli.ts` and `freeze.ts`. Disclose those two.

**2. MAJOR: the S1 losses are mostly direct, not cascade.** `FINAL_COMPARISON…md:43` says the S1 losses came "mostly through incumbent trades lost by cascade". This is wrong.
- Across the six S1 replays, incumbent lots lost **directly** (lots in ∪S(c)) total −$138.3k; lost by **cascade** total −$24.6k (`REPLAYS.json` `attribution.parts`).
- Cascade dominates only in B5+P-A:IGV (−16,714 cascade vs −7,736 direct). For GDX@B the split is −51,534 direct vs −5,805 cascade; for SMH −35,420 vs 0.
- `EXACT…` §3.1 words this correctly; FINAL should match it.

**3. MAJOR (missing deliverable): no side-by-side risk table for the scenarios.**
- PROTOCOL §8 and brief §7 require side-by-side risk for **every scenario**. `results/tables/risk.md` has no B4+/B5+ rows.
- `replays.csv` lacks worst lot, MAE, consecutive losses, 30/60/90-day change, daily DD, falling knives and time in market.
- `RISK…` §5 cites only four scenarios. The data exist in each payload's `risk.scenario`, so the table can be generated.

**4. MINOR: portfolio framing in `EXACT…` §5.** It says the fixed-pool sign "usually carries over, but not always: B4+XME, B5+XLB".
- The sign actually flips in 5 of 18 fold replays (5 of 9 in fold A). The missing three are:
  - B4+U:GDX@A: fixed −10,452, portfolio +44,573
  - B4+P-A:GDX@A: −16,172, +27,251
  - B5+P-A:XME@A: +4,374, −106,947
- "Every S1 negative" holds only in fold B.
- The window increments are not like-for-like. Scenarios start the window with different equity because the candidate runs from 2016, e.g. B5+U:EWZ@B $1,320,371 vs $1,667,618, and B4+U:GDX@A $849,744 vs $753,934.
- PROTOCOL §7.3 requires boundary equity; no report shows it.

**5. MINOR: XOP fold-B count.** `EXACT…:76` says "XOP's fold-b A0 −$1,418 (three idle-clean trades…)". Correct figure: **1** idle-clean decision (the only funded lot, 2022-08-31) and 4 busy. Source: payload `candidateClasses`, P-B-B Level D.

**6. MINOR: XME is not "entirely" idle-clean for B5.** `EXACT…:77` and `FINAL…:58` say XME's gain was "entirely/fully from its own idle-clean lots". That holds for B4 only. For B5, ΔV 4,374 = idle-clean +3,809, idle-displacing −3,205, busy +6,829, gained +683, lost +2,461 and −6,203.

**7. MINOR: XOP's gain is not only busy lots.** `FINAL…:44–46` and `EXACT…` §3.2 say the rest of the gain is "XOP lots that were busy against the baseline". In B4+U:XOP@B, idle-displacing lots (+30,749) contribute as much as busy lots (+29,842).

**8. MINOR: one "reshuffle" label is not a formal reshuffle.**
- `FINAL…:5` says the only material gains are `pool-path gain (reshuffle)`, and the `EXACT…` table flags B4+U:XOP@A as "reshuffle, thin".
- Under C1, B4+U:XOP@A is neither a reshuffle nor a thin positive: it fails both the complement and not-thin tests (largest scenario-only lot 31,354 > ΔV 22,930).
- Only 2 of the 3 material gains are formal reshuffles.

**9. MINOR: unreproducible 2021 H2 figure.** `FINAL…:75` says "2021 H2 20 decisions, −$123".
- B5's 2021 H2 idle stretches (07-26→09-22 and 10-06→12-21) hold 16 non-member decisions, net −$2,906 (22 and −$8,124 including members).
- For B4: 20 decisions, −$11,076.

**10. MINOR: the Spearman 0.43 is not traceable.** `FINAL…:21` and `PAIRWISE…:51` cite Spearman(ρ, ±5 share) = 0.43. It is in no sealed record or table. My recomputations over the 990 pairs:

| Orientation | Spearman |
|---|---|
| Row = alphabetically first | 0.445 |
| Min of the two shares | 0.46 |
| Max | 0.48 |
| Mean of both | 0.59 |
| All ordered pairs | 0.36 |

Compute it in a script and state the orientation.

**11. MINOR: the `PAIRWISE` §2 footnote misdescribes the table.** It says "means of the ordered values", but `report_tables.py:213–220` uses only the a<b orientation. Symmetric means:

| View-window | Mean ±5 share | Pairs ≥ 0.5 | Reported |
|---|---|---|---|
| U-T | 0.51 | 858 | 0.56 / 818 |
| U-A | 0.23 | 53 | |
| U-B | 0.40 | 215 | |
| P-A | 0.26 | 150 | |
| P-B | 0.40 | 337 | |
| P-F | 0.41 | 347 | |

**12. MINOR: wrong values in `PAIRWISE…:42`.** It says "(the larger of the two shares) … EDV against IJR, IWN, XLI, IJH, KIE, INDA (0.04)".
- 0.04 is EDV's own (smaller) share. The larger shares are 0.09, 0.10, 0.10, 0.12, 0.12 and 0.17.
- IWM is 0.17 and EWW 0.13 (both stated as 0.09); EDV–SLV is 0.16 (stated 0.13).

**13. MINOR: event counts in `INDEPENDENT…:113,109`.**
- XOP solo families: "eight in 2019" is actually 7 in 2019, with 2 in mid-2017.
- "F064–F073, 17–25 ETFs each": F068–F071 have 4, 2, 7 and 9 ETFs.

**14. MINOR: `RISK…` §2 table and text.**
- The "Worst 30-day" column shows the worst of the 30/60/90-day windows for four rows:

| Row | Shown | Actual 30-day |
|---|---|---|
| A/B4 | −13,655 (90-day) | −10,326 |
| A/B5 | −13,655 (90-day) | −10,149 |
| B/S | −14,344 (60-day) | −9,077 |
| B/B4 | −13,811 (60-day) | −10,130 |

- Line 67's "30-day … −$9k to −$14k in late 2022" should be −$9.1k / −$10.1k ending 2023-01-03; −$13.8k is the 60-day figure.
- The training-era list of falling-knife episodes omits B5's KRE-E10 (2020-03-26→04-03, −$1,745).

**15. MINOR: "refused" is the wrong word in `FINAL…:65`.** "68–71% of signals refused while busy" is the first-order share of standalone decisions arriving busy against B5. B5 itself refused 34 of 76 signals in fold B (B4: 15 of 64).

**16. MINOR: `FINAL…:19` overgeneralises.** "Idle at entry is mostly idle-displacing" holds for IGV (3 clean / 11 displacing), IBB (1/6) and SMH (1/12). It does not hold for EWZ (13/8) or GDX (11/9).

**17. MINOR: slot and pair counts.**
- `FINAL…:35` and README: "+$1.33M across 61 separate slots" should be 56 non-member slots.
- README: "88 ETF pairs" should be 88 *ordered* pairs.

**18. MINOR: "out of sample" contradicts the study's own limits.** `FINAL…:50` and the `EXACT…` §4 GDX row call the fold results "out of sample", but `CHRONOLOGICAL…` §1 says no replay is an out-of-sample validation. The fold windows also lie inside T, where the +$3,992 was measured.

**19. MINOR: stale recovery checkpoint.**
- `RESEARCH_RECOVERY.md` lower sections still say "Protocol: not yet frozen" (line 51), Stage 0 running, `scratch-check.ts` to delete (line 76), and "Next: write the remaining reports".
- README and FINAL say "Study 2 completed" while the checkpoint says INCOMPLETE, with C2, the review and the commit still pending.

**20. NOTE: rubric code deviation with no effect.** `analysisStage.ts` sets the materiality floor as `−min(worst,0)`, while PROTOCOL §9.1 says |worst|. They differ only if the worst own lot is positive and above $5,000; the maximum positive worst is +3,809, so no replay is affected.

**21. NOTE: weak interpretations to soften.**
- `FINAL…:25`: "who signals with whom … is a product of each ETF's parameters" rests on a Spearman of −0.01 on U-A. U-A has only 97 decisions and 9 ETFs with ≥ 4 decisions, which is too sparse to support it.
- `RISK…:35`: maximum hold "fires only when the lot is losing". In fact 4 of 24 B4 maximum-hold lots had positive gross, and 2 positive net.
- XLE "never passed a gate" means it never passed all gates. Against B5, its fold-B A0 had 2 idle decisions before 2022 with idle_net +$7,673.

### Checks that passed

- **Tests:** 22/22 study tests pass. The first `verify` passed 17/17 (seals, payload hashes, protected inputs).
- **Level D ledger reconciliation:** I recomputed every ETF × view-window × baseline summary (732 of them) from the signals payload trade records and the baselines' funded records, using the §6.5 rule. Decisions in window, busy, idle-clean and idle-displacing counts and nets, all-trade net and first-order Δ all match: **0 mismatches**. This includes F7 ETFs (ILF, VPU, DBC, EDV), designer-seen ETFs (XOP, GDX, EWZ, XLE), P nominees (SMH, IGV, FXI, XME) and zero-decision ETFs (AGG, GLD).
- **Report aggregates** match: `BASELINE` §1–4 and the U-T/fold tables, `EVENTS` §1/§3/§4/§5 (90/19/21, 541/816, solo +$4,718, 628/223 dips), Q7 shares (20.5%, 20.9%, 0.0%, 5.3%, 6.9%) and the 384/59-session idle stretches.
- **Matrices:** all six view-windows have 61 symbols and 3,721 ordered pairs. Matched counts are symmetric and the diagonal is 1. The NA rules hold with 0 violations (match, holding, armed and armed-episode shares). No-vector rows (12/7/8) are all NA. The CSV matrices equal the payloads. The Q1 lists (88/45) and H3 figures (−0.007 over 272 pairs, 0.397 over 930) verify.
- **All 25 replays:**
  - Attribution parts sum to ΔV@5 and ΔV@10 (within 1e-10), and ΔV equals scenario minus baseline increment.
  - Candidate lots exist only in the scenario ledgers, with counts equal to the attribution counts.
  - No funded lots overlap.
  - Baseline ledgers equal the sealed signals baselines.
  - Where no lot spans the boundary (B4+U:GDX@B, B4→B5@B), attribution reconciles exactly with lot nets.
- **Replay menu and dates:** 2 / 2 / 6 / 6 distinct ETFs per baseline × view, no members, no VOOG. Fold A records end 2021-12-31. No market date after 2023-12-29 appears in any record; the only post-2023 dates are split-registry metadata.
- **Screens:** gates, scores, S1/S2 and NC re-derived from the sealed rows are identical; SRC is XLB / XOP.
- **Rubric:**
  - C fails on all 18 fold replays; R passes 16 (it fails for EWZ@B at $38,471 and FXI@B at $39,826).
  - 7 replays are positive at every cost, 3 are material, 2 complement-type. The two reshuffles are B5+U:XOP@A and B4+U:XOP@B.
  - The verdict, "no demonstrated economically useful complementarity", is the same in ANALYSIS and ANALYSIS-2.
  - C1 changed only the reshuffle count (5 → 2), the XOP U labels and qualifiers on 6 P labels.
  - One floating-point edge (B4+P-A:XME, ΔV minus the largest lot ≈ 0) is correctly sealed as thin.
- **EXACT §2 table:** all 18 rows match `REPLAYS.json` (B's V, ΔV at 0/2/5/10 bps, first-order, attribution parts, Δ minute DD).
- **RISK tables:** pool, capacity, portfolio and standalone tallies match (U-T 145 / 22 / −$35,850; U-B 55 / 7 / −$18,142; P-B 87 / 11 / −$19,998).
- **Parity:** 512/512.
- **Labels:** the FINAL per-ETF label lists match ANALYSIS-2.

My scratch scripts are in the session scratchpad.
