# Recommendation — robust D1 pool discovery (Phase 2) — 2026-10-25

**Keep the current configuration: B5, i.e. All-lowDd plus the GDX `portfolioAware` book. Do not adopt any pool from
this study.**

## Why

1. **The selection procedure did not persist forward inside training (G-WF failed), so the protocol forbids
   nominating anything.**
   - **fold-a:** the robust (neighbourhood-scored) arm's pick, EDV GDX KRE, earned +$4,189 over 2020-07 → 2021-12. That
     is the 40th percentile of 40 random, unoptimized pools, and the gate needs the top quartile in at least one fold.
   - **fold-b:** the robust arm produced no pick. Its search converged on one GDX + XRT family, and the family's only
     refined result failed the evidence gate by $1,897 (XRT's smoothed marginal).
2. **Selecting on peak training profit did worse still.** The peak arm's picks finished in the bottom 3% of the random
   controls in both folds (−$30,323 and −$39,158), with validation drawdowns of $49k and $69k. This supports the
   study's premise that peak selection overfits, but the robust alternative did not clear the bar either.
3. **The one configuration that passed every final-round gate is a close descendant of B5,** found by the arm seeded
   from the benchmarks: GDX KRE XBI XLE, which is B5 without VGT and XRT, plus XLE.
   - It beats B5's smoothed training median by about $81k–$86k on two independent draw batches.
   - With G-WF failed, it was not nominated and not evaluated after 2023. Its training advantage is the kind of
     in-sample edge that the folds just showed does not reliably carry forward.
4. **The inspect-only retrospective of the 16-ETF study's R1/R4 points the same way.**
   - Both had training figures above B5's.
   - On the inspected 2024–2026 window both earned about $27k less than B5 after training. They still beat B4 by about
     $28k.
   - This is labelled RETROSPECTIVE and decides nothing, but it is one more case of a training lead over B5 not
     persisting.

## What would change this

Only forward evidence after 2026-10-13 (E4), or a new preregistered protocol. This study's stop rules allow no further
search, re-ranking or threshold change. If a new study is designed, the lessons below are the useful output.

## Lessons for any next protocol (findings, not changes to this one)

- **Seeded arms need their own protection.**
  - **What happened:** pooling the two final arms' top 300 let the benchmark-seeded arm fill every slot, and families
    are formed only from those candidates. All three diversity safeguards had nothing to act on: ≤ 3 books, far from
    B5, and an unseeded family in the top three.
  - **The fix:** form families per arm, or reserve candidate slots per arm.
- **Single linkage collapses a converged archive into one family.** That happened in fold-b's robust arm and in the
  final round, and it left one finalist and therefore one chance to pass the gates. A cap on family size, or
  medoid-based clustering, would keep several candidates.
- **The refinement acceptance step (δ = $5,000) and G3 (every member's marginal > 0) can disagree.**
  - **What happened:** refinement keeps a member worth less than δ, and G3 then rejects the configuration for it.
  - **The fix:** a final "remove any member with a non-positive marginal" pass before assessment.
- **The coverage floor was unattainable in the final round.**
  - **What happened:** the 15% reserve with its ≥ 100-per-symbol rule could lift only 36 of the 48 symbols under the
    floor; 25–29 symbols per final arm stayed short. The unseeded arm barely visited the B5 region (XBI in 222 of
    24,000 configurations).
  - **The fix:** a larger reserve, or a per-symbol quota inside the islands.
- **The instrument is a parameter-robustness check, not a time-robustness check.** In the pilot, one-step neighbourhood
  medians predicted the next two years no better than raw net (Spearman 0.023 against −0.006). The folds agree.

## Operational notes

- **Nothing to activate or deploy.** No phenotype file was created or changed, no order was placed, no broker was
  connected and nothing was committed.
- **Vanguard books.** B5 and B4 include VGT lots, which carry the Vanguard 30-day no-loan-value constraint recorded by
  the allocator study. It is unchanged by this study.
