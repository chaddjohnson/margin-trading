<!-- Verbatim final report of the independent, read-only pre-freeze methodology and chronology reviewer (a subagent of
this session), as received at 2026-10-27T23:05Z with only the delivery channel's two-space indentation removed. The
reviewer created, modified and deleted no file and ran no npm or state-changing git command. Dispositions:
METHODOLOGY_DISPOSITIONS.md. -->

# Pre-freeze methodology and chronology review: `d1-wide-library-chronological-selection-v1` (Study 1 of 3)

**Reviewer:** independent, read-only (no file created, modified or deleted; no `npm run`; no state-changing git; no network).
**Time:** 2026-10-27T22:59Z (UTC). **HEAD:** `6489a63d`.
**Reviewed (sha256 prefixes):** `brief/BRIEF.md` `f6743100`, `PROTOCOL.md` `711f6eb2656d`, `LIBRARY_SELECTION_RULES.md` `bacee4088a7d`, `EXPERIMENT_MATRIX.json` `ebe6af7bc3de`, `RESEARCH_RECOVERY.md`. Source files: context, doors, fast, families, candidates, archive, census, library, search, engine, anchors, records, stats, matrix, freeze, cli. Also `selection.ts`, which appeared during the review.
**Not reviewed:** `evaluation.ts`, `nested.ts`, `analysis.ts`, `sample.ts`, `tables.ts` and `views.ts` also appeared during the review. I only skimmed them for how they call the guards; they need a full review in the implementation audit.
**Pre-freeze records:** INVENTORY, the fold-a RECONSTRUCTION and CENSUS (summary and rows sampled), ANCHORS (579/579).
**Earlier studies consulted:** the source protocol §4.3–§4.4, §6 and §13; the standalone audit's PROTOCOL §3 and §9 and its SOURCE_AND_EVIDENCE_BOUNDARIES.
**My one data check** was outcome-free. I compared only the `grid` field of `stage: sobol` rows in the three source archives (VGT, GDX). I computed or read no outcome for any window after a cutoff.

## Overall assessment

The design is careful and largely faithful to the brief:
- A0 is reproduced exactly (61/61 on fold-a).
- Family clustering is bounded-diameter with complete-linkage acceptance, so there is no single-linkage chaining.
- A1, A2, A3 and A4 differ in their components before any validation.
- The NEW-SEARCH budget is a count and does not depend on outcomes.
- Fold accounting uses one continuous run per vector with liquidation-equivalent marks at both ends and a fail-closed boundary-parity check.
- Nothing after 2023-12-29 can be loaded.

**The central chronology guarantee does not hold as designed or as coded.** The NEW Sobol design is identical in every fold, and the source archives share their 2,048 Sobol grids per ETF across fold-a, fold-b and final. So a later fold's *training* figures are, by subtraction, an earlier fold's *evaluation* figures. §8.2 runs the later-cutoff searches and reconstructions before any fold's selection, any nested selection or the evaluation/analysis code is sealed. The doors check only the same fold's own seals. The source study had exactly this cross-fold guard and the brief requires it (§10).

The other defects that must be fixed before freezing are:
- the post-freeze stages that already exist do not verify the freeze;
- §0 misstates what was already known;
- the paired decision rule has no floor on the number of ETFs where the two arms actually differ;
- the nested verdict names no primary pool;
- no ablation separates diversity from simply checking more candidates.

I found six MATERIAL defects. All are fixable before the freeze without changing the research question, the arms' substance, K, the thresholds or the windows.

## Findings

**1. MATERIAL — Chronology across folds is not enforced. Later-cutoff stages read earlier folds' later windows before those folds' selections and the evaluation code are sealed.**
- **Where:** PROTOCOL §8.2 step 1 and §3.4. `doors.ts` `trainingUniverse` L139–153 has no seal precondition. `evaluationUniverse` L184–198 checks only the same fold's SELECTION and triples with `triple.fold === fold`. In the draft `evaluation.ts` `phaseOf`, `T1-later` requires only T1 and phase A.
- **How the leak works (NEW-S).** NEW-S is the same set of grids in every fold: one Sobol stream, and a collision set that does not depend on the fold. The engine is causal and training net equals the liquidation-equivalent mark at the cutoff. So for every NEW-S grid v:
  - net_B(v) − net_A(v) = V_A(v), fold A's evaluation increment, which is also T1's selection-window figure V_sel;
  - net_S20 − net_A = V over the second half of 2020;
  - net_S22(v) − net_B(v) = V over 2022, which is T2's V_sel and the first year of T1's later window.

  Credible rows also store their trade intervals. Step 1 runs the B, S20 and S22 searches, plus the fold-b and final reconstructions (whose Sobol grids are the fold-a ARCH grids), before any fold's SELECTION, before T1/T2 are sealed and before CODE_FREEZE. The nested, evaluation and analysis code is therefore written with these records on disk.
- **Further door gaps:**
  - S22's training door (to 2022-12-30) does not require fold B's or T1's seal.
  - S22's evaluation and `T1-later` (to 2023-12-29) do not require T2's seal. Because the grids are shared, T1-later's NEW-S runs are exactly T2's later-window runs for fold B's NEW-S library.
- **Precedent:** the source protocol §4.4 refused fold-b until fold-a's validation was sealed, because "fold-b's data hold fold-a's validation years".
- **Fix:**
  - (a) Put a calendar door in `load()` and use it for every training and evaluation door. A load ending at date E refuses unless every fold SELECTION with cutoff < E, and every nested SELECTION with selectionEnd < E, is sealed and verifies. Incumbent anchors stay exempt.
  - (b) Reorder the execution: freeze the protocol → write all evaluation, nested and analysis code plus tests → CODE_FREEZE → S18 search and libraries → S19 → fold A NEW search and libraries → S20 → phase A → seal T1 → fold-b reconstruction and census, fold B search and libraries → B-sel → seal T2 → S22 search and libraries → phase B, T1-later and the S evaluations → final-window census last, or drop it. I checked this order against the door and it does not deadlock.
  - (c) Each stage record lists the seals it verified.
  - (d) Add tests that each door refuses when an earlier seal is missing.

**2. MATERIAL — The post-freeze stages that already exist do not verify the freeze, and stages accept the test overrides.**
- **Where:** `archive.ts` `reconstruct` L152, `census.ts` `runCensus` L36 and `search.ts` `runSearch` L51 never call `requireFrozen()`, although `freeze.ts` L9 says every post-freeze stage does. `doors.ts` L85–88 skips the audited-hash check whenever `D1_LIBRARY_STUDY_DATA` is set. `context.ts` L12 cites a `guard.ts` that does not exist.
- **Consequence:** `reconstruct --window fold-b` can run today. §0's claim about what existed at the freeze is therefore not machine-verifiable.
- **Fix:**
  - Call `requireFrozen()` at the start of the fold-b reconstruction and census and of every search.
  - Call `refuseOverrides()` in every stage, including archive-inventory and anchors.
  - Stamp `guard.protocolBody` into every post-freeze record. `verify` checks that it equals the freeze body and that `startedAt` is after `frozenAt`.

**3. MATERIAL — §0 overstates what was unknown at the freeze; three ways the outcomes were already knowable go undisclosed.**
- **Where:** PROTOCOL §0. The sentence "No fold-B or final-window archive outcome, no new-search result and no outcome of any candidate after a cutoff existed when this protocol was frozen" is false.
- **(i) A0's outcomes are published.** The standalone audit (its §9.1) ran every fold-a and fold-b representative — 119 vectors, which are A0's representatives — over its fold's evaluation window at 5 and 10 bps and published V per ETF. The brief quotes the resulting rank correlations.
- **(ii) ARCH outcomes are a subtraction of published files.** The source's 2,048 Sobol grids per ETF are identical in the three archives (checked on grids only: VGT and GDX, 2,048/2,048 in each pair). Archive `net` is the liquidation-equivalent mark at the search end. So:
  - fold-A V of every ARCH Sobol row = net(fold-b) − net(fold-a);
  - fold-B V = net(final) − net(fold-b);
  - both come from sealed source files that the pre-freeze inventory parsed row by row.
- **(iii) Thresholds come from a study that saw 2016–2023.** A3's 75%/75% filters and T's $10k worst-lot threshold are the standalone audit's F9/F10/F2 flag thresholds.
- **Fix:**
  - Rewrite the sentence as "this study computed or inspected none of these; the following were already published …".
  - Disclose (i)–(iii) and state that the subtraction in (ii) was not, and will not be, performed outside the planned evaluation.
  - Grade ARCH fold results at the lowest evidence level: retrospective, and fixed in advance by published records.

**4. MATERIAL — The paired rule has no floor on the number of ETFs where the arms differ, and "insufficient" is ambiguous.**
- **Where:** PROTOCOL §9.2–§9.3; `EXPERIMENT_MATRIX` `decisionRules.insufficient`.
- **The tie problem.** W and L count only ETFs whose nominees differ. Identical nominees, and ETFs where neither arm nominates, give ΔV = 0. In the fold-a census, one family holds at least half of the J_s top 32 in all 57 ETFs that have a credible vector (trigger T-b). Arms will therefore often coincide with A0r, especially A1(8). "Favourable" could then rest on W = 3, L = 2 with 56 ties.
- **The insufficiency test.** It counts ETFs with V ≠ 0, not ΔV ≠ 0. "For the arm or A0r" can be read either as "either one" or as "their union".
- **Undefined handling.** It is not said whether an insufficient cell counts against "≥ 3 of 4 K". As written, an insufficient K = 16 cell falls into "no evidence of improvement", whereas the brief requires "inconclusive" for sample-scarce evidence.
- **Fix:**
  - Insufficient ⇔ W + L < 10, or CW + CL < 5, or fewer than 10 ETFs with V ≠ 0 for the arm, or the same for A0r.
  - An insufficient cell is neither favourable nor unfavourable, and the K denominator stays 4.
  - An insufficient K = 16 cell in either fold makes the (pool, arm) verdict "insufficient evidence", which maps to mixed/inconclusive at study level.
  - I includes both-none ETFs.
  - Report the pairwise identical-nominee counts at the libraries seal, before any evaluation, so the power of each comparison is known in advance.

**5. MATERIAL — The nested verdict names no primary cell, so the pool can be picked after the fact.**
- **Where:** PROTOCOL §9.3 "Nested verdict"; the matrix's `nested` rule.
- **Problem:**
  - T1 has two pools (NEW, NEW-S) and T2 has four, and the rule does not say which cell(s) decide "retains an advantage".
  - There is no nested across-ETF verdict, although brief §6B(ii) asks for one.
  - Nothing says how A4 relates to §9.4.
- **Fix:**
  - T1/NEW is the primary nested cell. "Retains an advantage" requires it there and that A4 is not "worse" in T1/NEW-S.
  - T2 cells are secondary and are never counted as a replication.
  - Add an across-ETF nested rule: A4's top 5 against A2(K)'s and A0r's top 5 on the later window, structured like §9.3's across-ETF rule.
  - State that the nested verdict is reported beside the §9.4 outcome and not inside it.

**6. MATERIAL — No predeclared ablation separates diversity from "simply more trials" (brief §12.3).**
- **Where:** PROTOCOL §1 Q3 and §7 A1.
- **Problem:** A0r checks 8 vectors against their neighbourhoods, while A1(K) checks K (16 at the primary design point). Taking the best J_nb over more candidates is itself a training-side winner's curse. For K > 8, A1 − A0r therefore mixes the effect of diversity with the effect of more trials. Only A1(8) holds the number of checked candidates equal, and the protocol does not say so.
- **Fix:** declare a descriptive A1n(K), kept outside the verdict:
  - top-K credible vectors by J_s with distinct signatures and no family de-duplication;
  - nominee = best J_nb over the same 16 draws, with A1's eligibility;
  - report A1 vs A1n (diversity at equal trials) and A1n vs A0r (more trials without diversity);
  - name A1(8) vs A0r as the equal-budget diversity comparison.

  The cost is small: at most 64 × 16 draws per ETF and pool, most of them shared.

**7. MINOR — Sobol grids shared across source windows need explicit door semantics and a rule against reusing figures across provenances.**
- **Where:** PROTOCOL §3.3–§3.4; `doors.ts` `sourceCap` L156–166.
- **Problem:** The grids, and therefore the candidate ids (`idOf(grid)`), are identical across the three archives. Phase B necessarily runs grid-identical copies of every fold-a Sobol row and every final-window Sobol row through 2023-12-29, under fold-b provenance. That matches how the source and the audit applied their doors (per provenance record). But "a final-window vector is never evaluated" and "no fold-a vector after 2021-12-31" are false if read by id. It also opens a loophole: T1-on-ARCH, which is barred, could be rebuilt by looking up fold-a grids in phase B's rows.
- **Fix:** State that doors apply per (window, stage, row). Ban, in the protocol and in the analysis code, attributing any figure computed under one provenance or fold to a vector of another — in particular no T1 result for ARCH or ALL.

**8. MINOR — The collision guard checks identity only, and is partly influenced by post-cutoff data.**
- **Where:** `search.ts` L32–49, L82–85 and L175.
- **Problem:**
  - The guard set includes the fold-b and final local-search grids (chosen with data through 2021 and 2023) for every fold, and the fold-a local grids for S18 and S19. Whether a Sobol vector is dropped, or a refinement move redrawn, can therefore depend on post-cutoff data. The probability is negligible, but it is a strict leakage path.
  - A NEW vector that behaves identically to a barred archived vector is not excluded. That is not relabelling (independent stream, different id), but the protocol should say so.
- **Fix:**
  - Log drops and redraws by cause, and by whether the window that produced the archived grid ended after the fold's cutoff.
  - Count the Sobol-versus-local collisions now; this compares grids only and is outcome-free.
  - Disclose any nonzero count.
  - Using training data only, flag NEW nominees whose training signature equals a barred archived vector's, or whose grid equals an incumbent's.
  - Make no claim about any archived vector from NEW results.

**9. MINOR — The doors are not fully fail-closed as described.**
- **Where:** `doors.ts` L168–206.
- **Problem:**
  - `evaluationUniverse` loads symbols, not vectors. The provenance, pool and triple checks sit in the caller; the draft `evaluation.ts` calls `sourceCap` for archive rows, but the door itself does not.
  - `isSealedFile` checks only that the seal is valid. It does not check that the record is the right fold's, that its door digest matches, or that its guard equals the current protocol freeze.
  - The door does not require CODE_FREEZE.
  - The Stage A digest check for folds A and B lives only in `reconstruct`.
- **Fix:**
  - Pass the candidates into the door and apply `sourceCap`, pool ∈ triple.pools and provenance there.
  - Verify the SELECTION's fold, `door.lastDate`, digest and protocol body.
  - Call `requireCodeFrozen()` in the door.
  - Move the Stage A digest check into `trainingUniverse`.

**10. MINOR — First-fit visiting order biases family size and "support".**
- **Where:** `families.ts` L118–155; `library.ts` L201–213 (A3's ordering); `search.ts` L118–120 (the support quota).
- **Problem:** No chaining can occur; every pair in a family is within 0.5. But a candidate that fits several families joins the one created first, which is the one seeded by the highest net. High-net families therefore gain members and support, and later families fragment. A3's support-ordered library and NEW's support quota inherit an implicit preference for high net, which makes A3 less distinct from A2.
- **Fix:** Define support independently of order — the number of credible Sobol vectors within d ≤ 0.5 of the medoid. Otherwise disclose the bias and report a sensitivity using a second visiting order (grid key), training-only.

**11. MINOR — The "best-trade-penalty displacement" metric is confounded with crowding of the J_s top 32.**
- **Where:** PROTOCOL §4.4; `census.ts` L134–140.
- **Problem:** The metric fires in all 57 fold-a ETFs that have a credible vector — exactly the ETFs where one family dominates the top 32. It measures near-duplicate crowding (plus T's worst-lot term), not the best-trade subtraction.
- **Fix:** Compare against a counterfactual J′ = net − max(0, minute DD − $20k), i.e. J_s without the best-trade term, with families de-duplicated. A family is penalty-displaced iff it is among the top 4 families by J′ but not by J_s. Report separately the exclusions due to crowding, to the drawdown term and to the trade floor.

**12. MINOR — Asymmetries between arms and pools are not disclosed.**
- **Where:** PROTOCOL §5.2, §7 and §10.
- **Asymmetries:**
  - (a) A3 uses 48 draws per member, 16 of them at double amplitude; A0r, A1 and A2 use 16.
  - (b) A1 filters and then picks the maximum, while A0r picks the maximum and then filters. A1 can therefore nominate where A0r declines on the same candidates.
  - (c) NEW's refinements are steered by T (A2's objective) and ARCH's local search by J_s (A0r/A1's). NEW-S is the only objective-neutral pool.
  - (d) The pools' evaluation budgets differ without normalisation: ARCH ≈ 2,250–2,280 per ETF, NEW ≤ 1,152, NEW-S ≤ 1,024, ALL ≈ 3,400. The draw budget is not stated.
  - (e) The breach count B grows with the number of nominees.
- **Fix:** Disclose all of these. Name NEW-S as the pool for interpreting A1 vs A2. Optionally predeclare a budget-matched ARCH comparator: the first 1,024 source Sobol rows against NEW-S.

**13. MINOR — K saturation makes "≥ 3 of 4 K" weaker than it looks.**
- **Problem:** In the fold-a census, ≥ 32 families exist in 36 of 61 ETFs and ≥ 64 in 11. For most ETFs the K = 32 and K = 64 libraries are therefore nearly the same, so the rule in effect means K = 16 plus one of {8, 32≈64}.
- **Fix:** For each cell, report the share of ETFs whose library equals the next smaller K's. Consider requiring K = 8 among the three, or counting 32 and 64 as one design point when most ETFs are saturated.

**14. MINOR — No outlier check and no decomposition of abstention.**
- **Where:** PROTOCOL §9.1–§9.2.
- **Problem:** Because an ETF with no nominee counts as 0, an arm can be "favourable" in a rising window simply by nominating in more ETFs. Conversely, abstaining is credited whenever A0r loses.
- **Fix:** Predeclare, as descriptive results:
  - a four-way split of ΔV (identical nominees / both nominate different vectors / only the arm nominates / only A0r nominates), with W and L in each;
  - the mean ΔV after dropping the cluster with the largest |ΔV_c|;
  - the nomination rates;
  - an explicit statement that the verdict counts abstention as an idle slot by design.

**15. MINOR — Windowed risk conventions and nested boundary parity are missing from the protocol.**
- **Where:** PROTOCOL §8.1 and §9.2.
- **Problem:**
  - Two windowed daily-drawdown conventions exist; that difference caused the ANCHORS v1 incident.
  - The protocol does not say which path and cost define the breach count B and A4's drawdown filter.
  - The engine-versus-fast identity is stated for V only.
- **Fix:**
  - Specify fast path, 5 bps, liquidation-equivalent minute marks for B and A4.
  - Name the daily-drawdown convention.
  - Extend the fail-closed identity to windowed minute drawdown and lot counts.
  - Write into the protocol the cross-phase parity that the draft code already implements.
  - Add a nested boundary parity: the mark at the selection end in the later run equals the sealed selection-window run's end mark.

**16. MINOR — Mismatches between protocol, rules, matrix and code.**
- (a) §4.2 and §8.2 promise a final-window reconstruction and census, but the code supports only fold-a and fold-b (`archive.ts` L152, `cli.ts` L37–60) and there is no final-window door. Drop it, or define its door and schedule it last.
- (b) `cli.ts` L29–35 (`archive-inventory`) and L67 with `matrix.ts` L112–115 (`matrix`) overwrite INVENTORY.json and EXPERIMENT_MATRIX.json, both of which the freeze binds. Make them write-once and refuse after the freeze.
- (c) The comments in `freeze.ts` L9 and `context.ts` L12 describe guards that are not wired up (finding 2).
- (d) §10's count of nested comparisons (8 + 16) does not match the matrix (16 and 32, which counts both comparators).
- (e) §4.3 says the sealed A0 stands if fold-b does not reproduce, while §7 says A0r is the baseline of every comparison. Say which governs the ARCH verdict for any ETF where they differ; I recommend the sealed A0.

**17. MINOR — Brief items omitted or under-specified.**
- (a) Later-window behaviour of the discarded groups compared with A0's library (brief §8).
- (b) Sensitivity to the number of ETFs searched, e.g. fixed seeded subsets of 15 or 30 ETFs balanced by cluster (brief §7.5).
- (c) Comparison of complete procedures across pools — arm on NEW or ALL vs A0 on ARCH — as descriptive results with the budget difference stated (brief §6A and §8).
- (d) Size and strata of the parity sample (brief §10.3).
- (e) Coverage and liquidity labels (brief §4).
- (f) Win/loss, MFE, holding-period and entry-timing distributions (brief §5). Also the event-level items: entered too early, missed the move, narrow one-minute coincidences, entry-price variation (brief §9).
- (g) For short folds, judge insufficiency by event counts, not only by ETFs with V ≠ 0 (brief §6A).
- (h) The read-only CLI command set, with every view going through the doors (brief §11).
- (i) `tests/` is empty. The post-cutoff-mutation test (searches, libraries and selections stay byte-identical), the door-refusal tests and the boundary-state tests should pass before the first post-freeze data stage.
- (j) The SEARCH record omits the worker/core count (brief §8).

**18. MINOR — Amendments can re-hash outcome-defining code after selections are sealed.**
- **Where:** `freeze.ts` L95–103 and L213–245.
- **Fix:**
  - Each sealed record stores the hashes of the code it ran with.
  - `verify` fails when those hashes have changed, unless that record is labelled superseded.
  - After any SELECTION seal, refuse changes to context, library, families or search unless rebuilding the sealed outputs gives byte-identical results.

**19. NOTE — Distance and diameter.** The distance d = max(1 − Jaccard of held sessions, 1 − Dice of entries matched within ±3 sessions) is a reasonable bounded behavioural distance. But d ≤ 0.5 means "similar", not "near-identical". Exit mode and catalog-episode membership are descriptors, not part of the distance. The diameter was chosen after the fold-a census; this is disclosed.

**20. NOTE — What A2 really selects on.** Capital efficiency reaches A2 only through interest inside net and a tie-break that rarely binds (exact ties of a 16-draw median are rare). "Event coverage" means entries in at least 2 calendar years. Reports should not describe capital efficiency as an active selection criterion.

**21. NOTE — Across-ETF A0r is a study construct.** Its top 5 by J_nb is not the source's R1/R2 ranking; label it so.

**22. NOTE — The verdict rules lean conservative.** "Favourable" needs five conditions and "unfavourable" two. With 12 (arm × pool) chances to reach §9.4(3), "mixed / inconclusive" is the likely result when there is no real effect. The final report should explain this base rate.

**23. NOTE — Verified as correct:**
- splits are forward-adjusted;
- catalog thresholds are fixed (no percentiles), and the training catalog uses training closes only;
- `load()` refuses any end after 2023-12-29, and the training partition ends 2023-12-31;
- the fold-a reconstruction covers 137,486 rows with 0 mismatches, and its loaded bars equal the source's Stage A door;
- A0 reproduces 61/61; anchors pass 579/579;
- the trade floors (A 4, B 5, S18 4, S19 4, S20 4, S22 6) match ⌈eligible years⌉;
- `selection.ts`, `nested.ts` and `evaluation.ts` call the freeze guards.

## Answers to the review questions

1. **Chronology and leakage.**
   - **Within a fold:** the training stages read only through the cutoff, so there is no direct leakage into libraries or selections, apart from the negligible collision-guard path (8).
   - **Is §8.2 sufficient?** No. Paired designs plus the step-1 ordering compute earlier folds' and the triples' later-window figures before the seals and before the code freeze (1).
   - **Are the doors fail-closed?** Only for the 2023-12-29 cap and for a fold's own cutoff. They are not fail-closed for chronology across folds, for the freeze state or for provenance (1, 2, 9).
2. **Data doors.**
   - Fold-a rows stop at 2021-12-31, nothing after 2023-12-29 is read, and final-window rows are never evaluated — but the last holds only per provenance, because Sobol grids are shared (7).
   - T1's NEW and NEW-S candidates are a legitimate separate protocol under brief §2.6: an independent stream, their own ids, nothing relabelled. This holds provided the protocol states the provenance semantics and bars looking up figures across provenances.
   - The collision guard is adequate for identity. It has a negligible post-cutoff dependence and does not exclude behaviourally identical vectors (8).
3. **Arms.**
   - All arms are faithful to brief §7 and distinct before validation.
   - A1 isolates "same scoring, wider library" fairly only at K = 8 (6, 12b).
   - A2 does not penalise the largest winner. It guards the downside with dollar penalties on drawdown above $20k and on worst-lot losses beyond $10k, plus the $35k credibility ceiling.
   - A3 differs from A2 in all four components, but its support ordering is biased toward high net (10).
   - A3's 48-versus-16 draw asymmetry should be disclosed (12a).
4. **Families.**
   - There is no single-linkage chaining.
   - The distance is reasonable but coarse (19).
   - Visiting by training net biases support, which affects A3 and the NEW support quota (10).
5. **NEW-SEARCH.**
   - The triggers are training-only and frozen; T-c and T-d honestly make the search unconditional.
   - The budget is bounded at ≤ 1,152 evaluations per ETF and fold and does not depend on outcomes.
   - The code matches §5.2 and RULES §5, except for the missing freeze guard (2), the guard set influenced by post-cutoff data (8), and the unstated draw and core counts (12d, 17j).
6. **Decision rules.**
   - They are mostly tight: K = 16 plus ≥ 3 of 4 K in both folds, 5 and 10 bps, sign counts by ETF and by cluster, and breaches.
   - Loopholes: no floor on the number of differing ETFs, and "insufficient" is ambiguous (4); no primary pool for the nested verdict (5); K saturation (13); abstention and heavy tails (14).
   - Once 4 and 5 are fixed, the study-level rule is unambiguous. "Not worse on NEW or ALL" should be written as "on neither".
7. **Fold accounting.**
   - Correct: one continuous run per vector, and V is the difference of liquidation-equivalent marks.
   - A lot open at b is valued at liquidation, with exit friction and interest to b, so training profit is not double counted and the lot neither disappears nor is repriced.
   - Drawdown restarts at b; the windows add up; boundary parity fails closed.
   - Still to specify: the drawdown convention and path, and nested boundary parity (15).
8. **Caveats.** The caveats on inspected history, survivorship, structural hindsight and pre-freeze exploration are honest but incomplete: A0's fold outcomes are already published, ARCH outcomes can be derived by subtracting published files, and the thresholds come from the audit (3). The multiplicity count is adequate and no p-values are claimed.
9. **Mismatches.** See 2, 9, 12 and 16 (final-window census, overwritable bound files, guards described but not wired, nested counts, A0 vs A0r).
10. **Brief coverage.**
    - Correctly specified: the 0/2/5/10 bps engine reruns of every nominee from 2016 with the engine-equals-fast identity; the 20% portfolio overlay; event-level metrics at a high level.
    - Missing or under-specified: the later-window discarded-group audit, sensitivity to the number of ETFs, comparisons across pools, the parity-sample design, the liquidity labels, the distributions, the event detail, the read-only CLI, the tests and the core logging (17). The ablation separating diversity from more trials is also missing (6).
