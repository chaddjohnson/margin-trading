# Pre-freeze review 1 — methodology, leakage, statistics (verbatim)

Reviewer: independent general-purpose subagent in an isolated context (read-only; no files edited, no tests run, nothing
under data/ opened). Commissioned 2026-10-29T19:42Z on the draft protocol (PROTOCOL.md, ENGINE_CONTRACT.md,
SEARCH_PLAN.md, EXPERIMENT_MATRIX.json, SOURCE_AND_CONFLICTS_AUDIT.md); returned ≈19:55Z (subagent runtime 773 s). The report below is reproduced
verbatim as delivered. Dispositions: `PRE_FREEZE_DISPOSITIONS.md`.

---

I found one blocker and twelve major issues. Nothing needs a redesign, but the protocol should not be frozen until they are fixed. This was a read-only review: no files were edited, no tests were run, and nothing under data/ was opened. Volatility figures are the 2016–2023 realised values from `research/d1-standalone-etf-opportunity-audit/OPPORTUNITY_EVENT_CATALOG.md`.

**1. BLOCKER — PROTOCOL §12 and §10.2: the verdict object and the nominee are not defined.**
- The rubric scores a chained account made of four different fold picks, which is a procedure, not a configuration.
- "Only a historically promising candidate may be named" never says which configuration would be named.
- If several experiments pass, choosing among them would mean selecting on 2020–2023 evaluation results.
- The chained account's starting state is not specified: whether it runs from 2016 or starts flat on 2020-01-02, and how it lines up with B5's continuous run when B5 holds a lot at the 2019-12-31 boundary.
- **Fix:**
  - Declare the nominee to be that experiment's sealed H pick, and require it to also meet the H feasibility rules and E3.
  - If several experiments pass, take them in a fixed parsimony order (4B → 4C → 4D-A → 4D-B → 4D-C) and report "k of n passed".
  - State that 4D-B0, 4D-C0, SA, S-raw and S-risk can never be nominated.
  - Specify the chained start state and how B5's boundary lot is treated, so that code can compute the verdict.

**2. MAJOR — §12 E6: a "new B5" can still be credited to the two-tier design.**
- 4D-B and 4D-C are compared only with their own shallow-off ablation.
- After joint optimization, the deep tier can come to depend on the shallow tier, so removing the shallow tier makes the ablation look worse than it should.
- **Fix:** also require ΣΔ(4D-B) − ΣΔ(4D-B0) ≥ $10k, with a positive margin in at least 3 of 4 years (likewise C against C0). Require the "B5 deep tier + the pick's shallow tier and allocator" decomposition to be ≥ 0. State that ablations of an optimized configuration are biased in its favour.

**3. MAJOR — §9.3: the preservation metric can be gamed.**
- "Matched-altered" counts any candidate lot on the same symbol whose holding interval overlaps, including shallow lots.
- Matched-altered lots count as "preserved" in the count-weighted figure, which contradicts brief §7 ("without pretending it was preserved").
- Each lot's contribution is uncapped, so a mirror or altered lot that earns more than B5 offsets missed trades.
- One candidate lot can match several B5 lots.
- The 0.90 and 0.75 thresholds are not justified.
- **Fix:**
  - Match one-to-one.
  - Allow matched-altered only by the deep lot of that symbol's reoptimized book, and report it separately, never as preserved.
  - Cap each lot's contribution at min(candidate net, B5 net).
  - Gate 4B, 4C and 4D-A on exact plus delayed lots only.
  - Add a count-weighted floor and a rule that none of B5's top 10 winners is missed (brief Q2).
  - Write down why the thresholds are what they are.

**4. MAJOR — §5, shallow band: high-volatility "shallow" books can be as deep as B5's deep books.**
- With 0.55σ, the upper bound is about 18.9% on XME (σ 34.4%) and 17.1% on KBE (σ 31.1%); XOP is likely above 20%. VGT's deep book is 21.6%.
- Off the B5 symbols there is no frequency check at all.
- On B5 symbols the check is only "≥ as many armings", which can be equal and counts armings rather than entries.
- This recreates Study 2's deep-dip complements, including the XOP reshuffle, under a "shallow" label.
- **Fix:** apply a frequency role check on every symbol, counting development decisions (deep path plus continuation): at least max(2 per year, 1.5 × a reference vector at 0.85σ). Add an absolute cap (e.g. X ≤ 15%) or cap X/σ at 0.45.

**5. MAJOR — §5, deep role: deep books can become high-frequency books through the continuation path.**
- The role check counts deep-path armings only. P can go down to 3% and W up to 200 sessions, so a "deep" book can trade often through continuation entries.
- The 0.70σ floor is below every incumbent's X/σ (VGT ≈ 0.89, GDX ≈ 0.73).
- 4D-C has no frequency check on non-B5 symbols.
- If 0.70σ exceeds GDX's X₀ in some window, the incumbent falls outside its own neighbourhood.
- **Fix:**
  - Check total decisions: ≤ 1.5 × the incumbent's + 2 on B5 symbols, and ≤ the busiest B5 book's yearly rate elsewhere.
  - Set the deep floor at the smallest incumbent X₀/σ in that window (or 0.75σ).
  - Make every 4D-B neighbourhood contain X₀.

**6. MAJOR — §12: the rubric leaves out three sub-results the brief requires (§8 verdict).**
- *Execution sensitivity:* E7 covers financing and costs only. In the ranked-preemption study almost every switch relied on buying the replacement in the same minute.
- *Fundability* has no criterion.
- *Opportunity specificity* has no criterion, so a pick whose gain is entirely a reshuffle (Study 2's XOP case) could still pass.
- **Fix:**
  - E7b: ΣΔ > 0 under +5 min replacement latency, 25 bps stop slippage and next-open stop fills.
  - E9: at least 8 shallow-funded lots, spread over at least 3 years.
  - E10: first-order idle-clean shallow net > 0 and ≥ 50% of ΣΔ; otherwise label the result a reshuffle.

**7. MAJOR — §12 E8: the concentration test has exemptions.**
- It removes only the largest "non-B5-preserved" lot, so mirror lots and matched-altered deep winners (the 4D-B gains) are never tested.
- Removing one lot does not catch a cluster of trades in one episode such as COVID.
- **Fix:** leave out the largest paired Δ contribution (candidate lot minus matched B5 lot, any category), and separately the largest episode (regime label or 20-session cluster). Add a cap on any single symbol's share.

**8. MAJOR — §10.6 and §12: there is no selection-null gate.**
- Selection skill is measured but is not in the rubric, despite roughly 50k configurations per experiment-window and 5 experiments.
- **Fix:** E11 — the pick's chained ΣΔ must be at or above the 75th percentile of a matched-budget random-champion distribution (100 random one-tenth subsamples of the evaluated configurations, same §8 rule, each evaluated). Pooled Spearman(development Δ, evaluation Δ) must be > 0. Otherwise cap the label at "descriptive".

**9. MAJOR — §8: the selection rule is weaker than the verdict and omits criteria the brief requires.**
- Brief §7 lists "exposure to single event/year/ETF" and "resampling stability" as objectives or constraints; neither is in selection. F21–F23 development windows are dominated by COVID (B5 2020: $165,888).
- The robust step moves 1–3 coordinates by one unit around only the top 10 candidates, far weaker than E5's joint ±10%. The ranked-preemption study found that neighbourhood-median selection did not prevent overfitting.
- Feasibility does not include E3's "≤ B5 + $5k" drawdown limit.
- **Fix:** add development-stage versions of E8 (no year > 70% of Δ) and leave-one-year-out (Δ > 0 with each development year removed). Set minute DD ≤ min($35k, B5's development DD + $5k). Use E5-style joint ±10% perturbations on the top 50 structurally distinct candidates.

**10. MAJOR — SEARCH_PLAN §6: the 4D budget is too small for the brief's aim.**
- At the plan's own throughput (500–1,500 evaluations/s), the whole 1.36M 4D floor takes about 15–45 minutes, and the 4A floor about 12 minutes.
- 4D-B has about 86 mixed dimensions and 4D-C about 100 (including 55-way symbol choices), searched with 48k–64k evaluations.
- Fixed single defaults (G2 λ = 0.75, G1 counting continuation setups, P4 D ∈ {0, 1}) and early NSGA-II convergence risk ruling out whole structures because of one bad default.
- **Fix:**
  - Raise the floors 5–10× (4D-A, 4D-B, 4D-B0 ≥ 300k; 4D-C, 4D-C0 ≥ 500k per window).
  - Run at least 4 seeded islands inside the development stage; this also gives seed stability for every experiment, including 4D-B, before evaluation and replaces §10.5.
  - Guarantee a refinement floor for each cardinality × policy × gate cell.
  - Search λ over {0.5, 0.75, 0.9}, add a G1 variant counting deep-path setups only, and record hypervolume convergence.

**11. MAJOR — §7.4 and §10.1: no same-budget search tests whether preemption itself adds value.**
- The "preemption off" ablation in 4E is a configuration tuned with preemption, then switched to P0, so it is biased against P0.
- **Fix:** add 4D-A0P, a same-budget 4D-A search with the policy fixed at P0 (gates allowed). Answer brief Q4's allocator question from 4D-A versus 4D-A0P.

**12. MAJOR — Audit §5.2: B5 hindsight contaminates the 4D-B and 4D-C challengers.**
- B5's vectors were chosen using 2016–2026, and the 4D-B neighbourhoods, 4D-C incumbent options and the shallow cap (≤ 0.6 × B5's X) all derive from them.
- Challengers therefore inherit 2024–2026 information and cannot later get a clean 2024–2025 validation.
- Moving away from a look-ahead optimum also biases fold Δ against challengers.
- **Fix:** register this, state the direction of the bias, name 4D-B vs 4D-B0 as the clean contrast, and say so in the "next gate" answer.

**13. MAJOR — §3 and the draft `doors.ts`: the parity door has a gap.**
- `parity` opens VGT, XBI, XRT, KRE and GDX through 2023-12-29 at any time, with no stage guard and no limit on what is computed.
- These are exactly the symbols for the same-symbol shallow candidates.
- **Fix:** refuse the parity door once CODE_FREEZE exists, unless evaluation is authorised. Have the parity entry point assert that it traces only the registered B5, B4 and B1 phenotype hashes. Keep an append-only log of door openings, sealed with each stage.

**14. MINOR — §7.3, MATRIX 4C, SEARCH_PLAN §4: the policy count is wrong.** The list (P0, P1, P2, P2L, P3 × 8, P4 × 2) is 14 policies, not 13. Also state what happens if the 4B pick is no-fill, and whether a 4B pick's gate carries into 4C.

**15. MINOR — §12 E4: the overlay criterion is not computable.**
- The chained overlay is not defined, and the "35% conditional" condition is not stated.
- Because "not evaluated" caps the label, the overlay is effectively required for any nominee. Either commit to building it or say upfront that there can be no nominee without it.

**16. MINOR — §7.1: the 4A library can collapse.**
- The four library slots (L1–L4) are each an argmax, so they can land on near-identical vectors at one depth. Brief §4 asks for several levels of shallowness, not near-identical hits.
- **Fix:** stratify by X tertile of the band with a minimum distance between members. Also record yearly and regime behaviour, falling-knife losses, signal correlation and neighbourhood shape.

**17. MINOR — §9.4 vs §7.1: internal contradiction.** §9.4 says idle-clean net is "never a decision input", but L2, L3 and the refinement seeds select on it. Reword: it is a training-window feature (allowed by brief §4) and ex-post only in evaluation.

**18. MINOR — §7.4 4D-A: two items from brief §7 are missing.** The genome omits "assigned tier" and "priority/tie" (ties are fixed alphabetical). Add a shallow-priority gene, or disclose the deviation.

**19. MINOR — §11: post-evaluation fixes are not covered.** If a correctness fix after the evaluation door opens changes a sealed selection, evaluate both versions, report both, and cap the label at "descriptive".

**20. MINOR — embargo hygiene.**
- Register that post-2023 events in `splits.json` and `distributions.csv` have already been seen as metadata.
- Forbid any whole-file data hash (e.g. the prospective-freeze verifier, which binds B5's data files).
- Key any on-disk cache by door end plus loaded-bar hash.
- Forbid worker threads from opening doors; the `processDoor` guard is per module instance, so it does not cover workers.
- State that the 2023-12-29 cross-check for non-B5 symbols happens only in the evaluation stage.
- Stop parsing at end + 1 day 06:00Z rather than end + 2 days.

**21. MINOR — registration and reporting.**
- F20's development window contains B5's 384-session idle stretch and only a few B5 lots, so preservation there is coarse.
- The designer has seen the full-history σ table and Study 2's map of idle stretches; register both as design-informing.
- The 4D-A vs 4B/4C comparison is not budget-matched.
- Missing items:
  - One-at-a-time parameter profiles (brief §8.4).
  - Stability of membership across folds.
  - Classification of refused shallow opportunities (brief §5).
  - Counts of switches near the breakeven threshold (brief §8.5).
  - A P2L parity fixture against ranked-preemption B-R1 ($334,495; 5 executed / 11 declined).

**22. NOTE — shadow semantics.** By construction, preemption never changes signals: virtual positions continue and mirror lots follow virtual exits. This matches the frozen B5 but is an interpretation of brief §3 ("can change future signals"). Disclose it; no live-state variant is tested.

**23. NOTE — other disclosures.**
- A same-symbol preemption pays a full round trip to keep identical exposure; an in-place re-designation would be causal and cheaper.
- The price-only fixed slot creates artificial ex-dividend dips and stops for 3–5% shallow books on high-yield ETFs.
- A P3 or P4 pick with zero executed switches in development should be treated as equivalent to P0 when attributing gains.

**Overall: freeze after fixes.** Fix 1–13 before freezing; the minor items can go in the same revision. Ordering and leakage control are sound: every fold is sealed before any evaluation, H comes last, and 4D cannot see 4A–4C evaluation results.
