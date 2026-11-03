# Methodology review 1 — selection and statistics (independent read-only agent context)

Reviewer: a separate Claude agent context with read-only instructions (no file changes, no runs, no market data),
emphasis on selection methodology and statistics. Reviewed draft: PROTOCOL.md v1.0 (pre-freeze), ENGINE_CONTRACT.md,
MECHANISM_CATALOG.md, EXPERIMENT_MATRIX.json, scripts/make_matrix.py. Received 2026-10-29, saved by 14:35Z (clock at the following checkpoint). Text below is the
reviewer's final message, verbatim.

---

**Stage 1c PROTOCOL v1.0 (draft) — methodology review: selection and statistics**

This was a read-only review; no file was changed and nothing was run. I read the following in full: BRIEF.md, PROTOCOL.md, ENGINE_CONTRACT.md, MECHANISM_CATALOG.md, make_matrix.py, and the constants and cell table of EXPERIMENT_MATRIX.json. For context I also read Stage 1b's PROTOCOL §6–§11, EXIT_OPTIMIZATION.md, FINAL_COMPARISON_AND_RECOMMENDATION.md, results/tables/verdict.md, ledger-Pi1-S1.md, screening-H.md, the runtimes in develop-*.json, and search.ts, metrics.ts and sobol.ts.

What the matrix actually contains:
- 2,400 cells, all with status `eligible`.
- Cell dimension counts: 3:6, 4:54, 5:192, 6:380, 7:514, 8:530, 9:408, 10:220, 11:80, 12:16.
- The caps in `caps` (776,400 / 1,049,068 / 5,245,340) match §7.6.

---

**1. MAJOR — §7.1 seed labels, §7.2, §7.3, §5(iii). The 8 masks of a pair are sampled independently.**

- **Problem.**
  - The label `study3c|<history>|<cellKey>|global` includes the mask. Stage 1b's `sobolPoints` draws its per-dimension digital shifts from the label seed. So the 8 masks of one (entry, exit contract) pair see 8 unrelated sets of entry/exit vectors.
  - (a) Every comparison between masks of the same pair (for example 000 vs 101) is dominated by sampling noise in the entry/exit coordinates, not by the rule.
  - (b) §5(iii) says an inert rule leaves the path identical to the mask-000 parent. That cannot be checked per vector, because no rule-off twin of any masked vector is ever evaluated.
  - (c) If the rules are useless, the 7 masked cells behave like 7 extra independent search replicas of the 000 space (see finding 2).
- **Fix: use common random numbers.**
  - Seed the global and deep Sobol sequences with a pair-level label: `…|<entry>|<exit>|<contract>|global`.
  - Always generate the full set of dimensions: entry dims, exit dims, then fixed slots for a.N, b.C, c.X, c.Y (at most 16 dimensions). Each mask uses only its active slots. Because the shifts are drawn in dimension order, the entry/exit coordinates then coincide exactly across all 8 masks.
  - Generate the local and J33 draws per pair and center with the same fixed slots, so the entry/exit perturbations also coincide.
  - Result: every masked vector has an evaluated rule-off twin in the 000 cell. Report per cell the paired Δnet, ΔDD and ΔRoD distribution, and the exact inert share (identical path hash). This costs no extra evaluations.

**2. MAJOR — §7.3, §7.5, §11(d) and the protection-value statements. Π1 vs Π-000 is neither budget-matched nor equally targeted.**

- **Problem.**
  - P\* is the maximum over 176 deep cells: about 8 × 22 × 1,867 evaluations, with up to 10 centers per cell.
  - P\*-000 is the maximum over only 22 cells, which is 1/8 of the evaluations and centers.
  - Of the 22 deep pairs, 18 are chosen by statistics maximised over all masks (lists (i) and (iii)). Only 4 are chosen by the 000 score (list (ii)). So most of P\*-000's candidate set is incidental to its own objective.
  - With independent shifts (finding 1), any advantage of Π1 over Π-000 can come from 8× search effort and from targeting rather than from the rules. That difference feeds item (d) and all three protection-value statements.
- **Fix.**
  - (i) Adopt finding 1. With common random numbers, an inert masked cell is an exact copy of the 000 cell, which removes most of the replica effect.
  - (ii) Make targeting symmetric. For example, take deep pairs as the union over masks m of the top-3 pairs by the mask-m champion score (same caps). Alternatively, raise list (ii) to 12 pairs with list (i)'s caps.
  - (iii) If independent shifts are kept, add a placebo control: 7 extra 000 replicas per deep pair, each with a different seed and the same budget (labels `…|000|placebo<k>`). Define P\*-placebo as the maximum over these replicas and compare Π1 with Π-placebo. Cost is about 0.29M evaluations per history.

**3. MAJOR — §7.4, §9.1, §9.2(d), §11 protection-value statements. The verdict path's own rules are never knocked out.**

- **Problem.**
  - FP-m adds rules to P\*-000, which is generally a different pair from P\*.
  - Π-m uses a different pair and different entry/exit parameters for each mask.
  - Neither isolates what the rules actually inside Π1 contributed. A pick whose rules never fire in a window still counts as "protected".
- **Fix.**
  - Add descriptive paths with no reselection:
    - Π1-off: each fold pick with its mask set to 000 and every other parameter unchanged.
    - Π1-minus-r: for each active rule r, and for every sub-mask of each pick's mask.
    - The same knock-outs for P\*_H, labelled in-sample.
  - Classify every Π1 trade against Π1-off in all four windows (blocked / exited sooner / delayed / newly entered / unchanged), not only Stage 1b's three 2022 trades.
  - Report each pick's rule counters in development and in its window, and label picks whose rules are inert.
  - Base the primary protection-value statement and (d)'s protection clause on Π1 vs Π1-off. Treat Π-000 (procedure level) and FP-m as secondary.
  - State in the text that FP-m is a lower bound (its parent was tuned without rules) and that Π-m is confounded by pair choice.

**4. MAJOR — §11 item (d). Degenerate cases make (d) ambiguous or collapse it into the 2022 ≥ 0 gate that brief §11 forbids.**

As written, (d)'s protection clause passes iff W_C(Π1) ≥ 0 or W_C(Π1) ≥ W_C(Π-000) + $5,000.

- **Problem (edge cases).**
  - (a) If P\*_C has mask 000, it is by construction also P\*-000_C. The second clause then cannot hold, because the paths differ only through carried state. (d) becomes "W_C ≥ 0".
  - (b) If P\*-000_C is undefined, Π-000 runs C-IDLE in 2022, which earns about 0 or minus the debit interest. (d) again becomes roughly "W_C ≥ 0".
  - (c) If P\*-000 is undefined in several folds, the trend-retention clause compares against roughly 0 and passes trivially.
  - (d) The zero threshold is inconsistent with "positive" meaning at least +$2,000, so −$1 of carried interest flips the clause.
  - (e) When W_C(Π-000) is far below zero, the clause is lenient: −$24k passes against −$30k, and only (b)'s −$15k floor binds.
- **Fix.** Before the freeze, write an explicit edge-case table into §11:
  - Use Π1-off (finding 3), which is always defined, as the comparator for the protection clause.
  - If Π1's fold-C pick has no active rule, report "protection: not applicable" and evaluate (d) on trend retention plus (b)'s floor only.
  - If P\*-000 is undefined in a window, compare trend retention with a fixed predeclared reference, for example the exposure-matched B_F, rather than C-IDLE.
  - Either set the no-loss tolerance to W_C ≥ −$2,000 or state that 0 is intended.

**5. MAJOR — §7.2, §7.1 (champion definition), §7.3 (eligibility). Whether a cell can reach deep refinement rests on two arg-max centers.**

- **Problem.**
  - A pair becomes eligible for deep refinement, and so for P\*, only if one of its cells has a first-pass champion.
  - Each first-pass champion is chosen from just two centers: the best-by-net and best-by-RoD of about 258 points.
  - Arg-max points of a 256-point design in up to 12 dimensions tend to sit on sharp spikes. If both centers fail φ ≥ 0.75, the cell is dropped despite the "no single-default dismissal" rule. If all 8 masks fail the same way, the whole pair is lost.
  - For comparison, Stage 1b scored 16 centers per cell.
- **Fix.**
  - At roughly the same budget, score at least 4 centers per cell: distinctBest(·, 2, 2) with J17, then rescore any deep-selected center with the full J33. Alternatively, pick the 2 centers by a free smoothed score, such as the mean RoD of each point's k nearest Sobol neighbours in normalised coordinates.
  - Report per cell and per pair why there is no champion (no feasible point / φ / 10 bps).
  - List near-miss pairs: those with no champion whose feasible best-by-net beats the 22nd deep pair.

**6. MAJOR — §4.2 boxes (MECHANISM_CATALOG §3, matrix `exits`). The parameter boxes have no widening rule.**

- **Problem.**
  - Stage 1c inherits Stage 1b's unwidened exit boxes and silently drops Stage 1b's training-only widening rule.
  - In Stage 1b, 127 of 220 exit cells (58%) had a RoD champion within 5% of a non-zero box edge. By family (each out of 20): XT 17, XE 17, XRD 16, XP 15, XO 13, XS 10, XRP 10 (EXIT_OPTIMIZATION.md §2).
  - Several families are therefore likely edge-truncated. That handicaps exactly the "credible extra families" the brief wants to compete.
  - The A/B/C boxes (N ≤ 60, C ≤ 60, Y ≤ 0.20) also have no widening, although brief §5 expects a frozen, training-only expansion rule.
- **Fix.**
  - Predeclare one training-only widening at the deep stage, decided per pair from the first-pass champions of all 8 masks together, so the masks stay matched.
  - Use Stage 1b's 5% / 50% rule and natural limits, and add limits for the rule dimensions (for example N ≤ 120, C ≤ 120, X ≤ 0.30, Y ≤ 0.40).
  - Budget the worst case, and report edge-hit rates per family and per dimension.
  - Do not import Stage 1b's widened bounds: they come from Stage 1b development runs that include 2020–2023.

**7. MAJOR — §7, §11, §13 (multiplicity). Nothing estimates selection noise or selection skill.**

- **Problem.**
  - The verdict rests on one realisation of a high-variance arg-max over about 1M configurations per history.
  - Stage 1b showed how large this noise is. Changing only the objective (RoD to NET) moved ΣW by $38k and the 2022 result by $23k.
  - Stage 1b's fold-C pick had 0% of its 128 J128 neighbours positive in 2022. So item (f)'s parameter perturbation does not measure selection risk.
- **Fix.**
  - (i) Predeclare a cheap selection-skill null: 128 seeded S1 paths that, in each fold, pick a uniformly random deep-cell RoD champion. Add a variant that draws from all first-pass champions. Report Π1's percentile for ΣW, W_C and chained DD. This can be descriptive, or a binding qualifier such as "(selection-indistinguishable)" when Π1 falls below the median.
  - (ii) Predeclare at least 2 replicate develop-A…D runs under another seed namespace (`study3c-r<k>|…`). They would be descriptive and sealed before `evaluate`. Report how stable the picks are and the replicates' Π1 labels. Each replicate costs about 4.2M evaluations, roughly 1–2 h at measured throughput.

**8. MAJOR — §11 protection-value statements. Nine statements with small margins, no multiplicity control and causal wording.**

- **Problem.**
  - There are nine statements: one for the procedure, seven for FP-m, one for 2022.
  - Each passes on a +$5,000 margin, with no multiplicity control, no noise calibration, and causal wording ("protection improved…").
  - With 7 FP statements, at least one chance pass is likely. +$5k is far smaller than the path-to-path variation in finding 7.
- **Fix.**
  - Name one primary statement (Π1 vs Π1-off, finding 3) and report the FP statements as "k of 7".
  - Also require the improvement to hold in at least 75% of paired perturbed paths. Pairing is possible: give FP-m's J128 the parent's entry/exit draws with the rule dimensions appended, and run Π1-off on Π1's J128 draws with the rules zeroed. If finding 7(ii) is adopted, require it in the replicates as well.
  - Reword along the lines of: "Π1 exceeded Π1-off / Π-000 by ≥ $5k in one retrospective, target-year-informed replay".

**9. MAJOR — §10 vs §11.5. The binding "(objective-dependent)" qualifier cannot be computed as planned.**

- **Problem.** §11.5 assesses Π-NET on (b)–(h) "with its own perturbed paths and stresses". But §10 runs stresses only for Π1, Π-000 and P\*_H. Because the `robustness` caps are code-enforced, Π-NET's item (h) cannot be computed without a post-outcome amendment.
- **Fix.** Add Π-NET to §10, at least for the five rubric stresses (cost10, rate14, stop25, open50, delay1), and add them to the planned count.

**10. MINOR — §7.4. FP-m is close to forced adoption.**

- **Problem.**
  - The parent with rules off is never a candidate.
  - FP centers' φ uses a J33 over the rule dimensions only, with entry/exit fixed. That is far easier to pass than the full-dimension φ the parent needed.
  - So "rule rejected in training" happens essentially only when a rule makes the parent infeasible, and training never checks whether the rule beat the parent.
- **Fix.**
  - Predeclare a gated FP-m: adopt it only if its rule-only-J33 RoD is strictly higher than the parent's RoD on the same neighbourhood (that is, the parent's center RoD).
  - Keep the forced variant as a labelled second version.
  - Record the training ΔRoD (FP-m minus parent) per mask and history.

**11. MINOR — §7.2. Fairness across cell dimensions.**

- **Problem.**
  - The same 256 points cover cells of 3 to 12 dimensions. That is about 6.3 points per axis at d = 3 but only 1.6 at d = 12.
  - J33 perturbs every non-discrete dimension by ±10%, so φ falls systematically as dimension rises.
  - Both effects penalise 111 masks and multi-parameter exits (XV, XT, XD, XP) relative to small cells such as E09/E10 × XO/XN.
- **Fix.**
  - Report champion rate and median J33 φ by dimension and by mask.
  - Consider a dimension-scaled first pass: 256 points for d ≤ 4, 512 for d 5–8, 1,024 for d 9–12. That is about 1.58M Sobol points per history instead of 0.61M, which is affordable (finding 13).
  - Otherwise, state explicitly that this bias works against the rules (conservative).

**12. MINOR — §7.3. Ambiguities and tilts in the deep-pair rule.**

- **Problem.**
  - (a) It is unclear whether the "3 per exit family" cap counts XF and XF-T (XF-T's box is inside XF's) as one family, and rep/or as one family. It is also unclear whether caps apply per list or cumulatively, and list (ii) has no cap at all.
  - (b) Trail-type families (XF, XF-T, XN) could take 9 of the 12 RoD slots.
  - (c) Each two-contract family gets 2 chances per entry against XO's 1.
  - (d) Brief §4 asks for an explicit retain / replace / OR comparison. That comparison is at matched depth only if both contracts of a family happen to be selected.
- **Fix.**
  - Count caps by exit family, with XF-T counted as XF (Stage 1b's P12 convention), and make caps cumulative across lists.
  - Add a behavioural-distinctness skip: skip a pair whose champion's trade path matches an already-chosen pair's.
  - Either make the deep unit (entry, exit family) with both contracts × 8 masks, or state that contract comparisons use first-pass statistics only.

**13. MINOR — §7.6. The throughput estimate is optimistic.**

- **Problem.**
  - Stage 1b's sealed real-data develop runs measured 0.59 ms per evaluation in history A (155,118 evaluations in 91 s) and 1.22 ms in history H (157,381 in 192 s), on 14 workers. Stage 1c assumes about 0.5 ms from a synthetic benchmark.
  - In Stage 1c, 400 of the 2,400 cells use intraday entries (E09/E10), which cost about 2–4× more, and the rules add overhead. Expect roughly 1.2–2.6 h for 5.25M evaluations.
  - Stage 1b peaked at 2.1–2.3 GB of memory at about 155k evaluations per history. Stage 1c runs about 1.05M per history with richer archive rows.
- **Fix.**
  - Measure real-data throughput per entry kind at the parity door (data ≤ 2019, no P&L recorded).
  - Stream archives to disk and set a memory bound.
  - Spend the measured slack on findings 1, 5, 7 and 11 rather than on more deep cells.
- The §7.6 arithmetic itself matches the matrix caps: 776,400; 271,744; 924 (actual at most 921); 1,049,068; 5,245,340.

**14. MINOR — §7.1 feasibility vs §11(e). Selection has no participation floor.**

- **Problem.**
  - Center feasibility only requires 6 closed trades, 3 campaigns and a position held in 3 calendar years. The rubric, however, requires being long at ≥ 20% of session closes.
  - Rule B with cooldowns up to 60 sessions and rule C with no expiry make low-participation champions possible under RoD's $10k floor. A fold could therefore pick a policy the rubric must reject.
- **Fix.** Add "long at ≥ 20% of development closes" to center feasibility. This is a pre-outcome alignment with the rubric, not hindsight.

**15. MINOR — §11. Completeness and clarity of the rubric.**

- **Problem and fix.**
  - (a) Item (e2): restore Stage 1b's exact up-leg contribution definition (the liquidation-mark change over (max(t0, 2019-12-31), t1]), define campaign giveback, and handle the case where no campaign qualifies. Stage 1b's verdict table shows "largest up-leg +$0" for Π1-S3, Π-P0, Π-noE06 and static-A, while the near-identical Π1-S1 path shows +$18,349. That suggests the inherited computation is unreliable and needs a test.
  - (b) Add Π1-reset (loss record cleared at each boundary) to the "transition-convention-dependent" qualifier. Persisting the loss record across boundaries is a new Stage 1c design choice.
  - (c) In item (h), also check each window's DD under each stress (brief §11(c) asks for "per-window stress").
  - (d) Include C-STOP, the brief §8 fixed-stop control, in item (g)'s controls, or justify leaving it out.
  - (e) Report every item for every label, not only within label 4. Predeclare a near-miss band, for example within 10% of a threshold, since the brief requires near misses to be retained.

**16. MINOR — §7.5, §11.5. Π-NET is not an independent second selector.**

- **Problem.** Π-NET's candidates are deep cells whose pairs were chosen 16 of 22 times by RoD or by 000-RoD. In Stage 1b, P\*-NET used NET throughout its pipeline.
- **Fix.** Say so in §7.5 and in the qualifier text, or give NET its own capped 12-pair list.

**17. MINOR — §1 leakage register. Three items are missing.**

- **Problem.**
  - (a) Rule C's "no time expiry" and "anchor consumed only by the next purchase" were chosen knowing the 2022 path. On Stage 1b's ledger, an unconsumed anchor at 366.70 (trade #11's exit) refuses the #12 decision (about 350). It also refuses any later decision below 366.70, including #13's (about 335), unless an intervening purchase above the level consumed the anchor first.
  - (b) Trade #11 was never net-profitable (ledger peak profit −$2,015), so rule A with any N ≤ 21 sells it at its first eligible open.
  - (c) XN was added after the designer had seen Stage 1b's in-sample H screen of its precursor B-D1N (for example E05 × B-D1N +$95,017 / $24,476).
- **Fix.** Add all three to the register. Require the tag "(target-year-informed)" on every 2022 statement whose improvement is attributable to C or A events.

**18. MINOR — §9.2(c). The 2022 upper-bound diagnostic is mostly noise.**

- **Problem.** "The best 2022 increment of any develop-D/H archive point" is a maximum over about 1M points.
- **Fix.** Restrict it to center-feasible points or to cell champions per mask, and report a distribution (P50 / P90 / max) rather than the maximum alone.

**19. NOTE — §1.2, §7.5. RoD vs NET as the binding selector.**

- Keeping Stage 1b's RoD as the binding selector is the non-hindsight choice, and the stated reasoning is sound.
- However, RoD rewards DD reduction, which A/B/C deliver mechanically, and 7 of every 8 deep cells are masked. So "P\* has an active mask" is expected even if the rules are useless, and must not be reported as evidence for them.
- If Π-NET outperforms Π1, the report must not present NET as a lesson to adopt. Stage 1b handled this correctly.

**20. NOTE — §6, §11(b). Dependence across folds.**

- The histories are nested and account state carries across boundaries, so the four windows are dependent.
- "Positive in ≥ 3 windows" mostly tests the three bull years (2020, 2021, 2023). 2022 is a single bear observation with about 3 decision episodes.
- State this in §13 and in the verdict, and do not describe the window count as replication.

**21. NOTE — §5. Dimension count.** "2–12 dimensions" is wrong: the minimum is 3 (E09/E10 × XO/XN × 000, 6 cells).

**22. NOTE — §7.3. Sobol and index details.**

- Deep indices 256…1,279 give 1,280 points in total. That is not a power of two, so the Sobol net's balance property is lost.
- With only a digital shift as randomisation, 256 points give weak projections in dimensions 9–12. Prefer totals of 1,024 or 2,048.
- "Draw j of center i has index 10⁶ + 1000 i + j": specify that i is the center's own index (Stage 1b's convention), not its ordinal. Ordinals would make first-pass and deep center draws collide.

**23. NOTE — §11 nomination.** P\*_H's rule parameters are fitted with 2022 inside its development data. Label the nominee as such, and note that it is a different object from the verdict path Π1.

**24. NOTE — passability.** The rubric is not trivially passable. Stage 1b's C-SMA earned ΣW +$45.7k (flat start) and +$42.4k (annual reset), so item (g)'s control margin implies Π1 needs ΣW of roughly $50.7k or more. Stage 1b's Π-NET (+$50.5k / $18.0k DD) passed the risk and profit items yet still failed the exposure-matched excess. The rubric is also not impossible: no item demands more than a protective, actively timed strategy could plausibly deliver.

---

**Overall assessment**

The main guards are sound:
- Selection is forward-only, with data doors enforced in code.
- Deep allocation uses only training data. Fold C sees no 2022 bar, and no selection rule reads a window increment.
- All 2,400 cells get at least 256 distinct points, and budgets are matched across the 8 masks of every deep pair.
- The binding selector is carried over unchanged from Stage 1b, the best possible label is "historically promising but unvalidated", and the design leakage is disclosed rather than hidden.
- The rubric covers brief items (a)–(h) and is demanding without being impossible.

The weaknesses are in attribution and inference, which is the brief's central question. Masks are sampled independently, the pure-momentum control gets 1/8 of the search effort and weaker targeting, and the verdict path's own rules are never knocked out. As written, a Π1 − Π-000 difference — and therefore item (d) and the protection-value statements — cannot be separated from search effort, pair choice or chance. In plausible degenerate cases, (d) also collapses into the 2022 ≥ 0 gate the brief forbids. In addition, first-pass eligibility rests on two arg-max centers, boxes that were edge-bound in 58% of Stage 1b's exit cells get no widening, and nothing estimates selection noise or selection skill.

None of these is a blocker. All can be fixed before the freeze, mostly at negligible cost: common random numbers, Π1-off knock-outs, a random-champion null and Π-NET stresses are nearly free, and the measured compute slack covers the rest. The protocol should not be frozen until findings 1–9 have dispositions.
