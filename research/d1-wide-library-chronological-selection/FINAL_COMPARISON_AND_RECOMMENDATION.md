# Final comparison and recommendation — Study 1 of 3

## Answer

**No demonstrated improvement** (the predeclared study-level outcome, `results/analysis/ANALYSIS.json`, sealed
2026-10-28T02:10Z). Widening the training library, changing the training objective to keep large winners, or selecting
on an explicit neighbourhood-risk rule did **not** improve the next chronological window relative to the original
narrow selection, on a fair fixed budget, in both primary folds — and **validation-based selection (A4) was worse**.
The original optimizer did discard behaviourally distinct, profitable, risk-compliant right-tail phenotypes; those
phenotypes were not reliably better afterwards. All windows were inspected by earlier studies, so this is a
retrospective, period-correct method replay, not independent proof; it nominates nothing. The procedures' design
(thresholds from earlier studies, the family diameter chosen after a pre-freeze fold-a census, the arms) was informed by
that history, and a training-only S18 dry run preceded the freeze (PROTOCOL §0, §6.2).

**Study 1: completed. Study 2 (all-61 D1 timing and occupancy complementarity): not started. Study 3 (independent
momentum-entry strategy): not started.** No pool, phenotype, registry entry, default or prospective tracking was changed.

**Which verdicts define the outcome.** The study outcome applies PROTOCOL §9.4 to the 12 within-ETF verdicts (none
"improves"; 6 "worse"). The 12 across-ETF verdicts (each arm's top 5 of 61 ETFs by training score against the
baseline's top 5) are 1 "improves" (NEW-S A3, beside a within-ETF "worse" for the same arm and pool), 3 "worse" (ARCH
A1, ARCH A3, NEW-S A2) and 8 "mixed"; nested across-ETF: T1 mixed on NEW and NEW-S, T2 worse on ARCH, NEW-S and ALL
and mixed on NEW. §9.4(3)'s "'improves' on a pool other than ARCH" could also be read as covering the across-ETF
label; under that reading the outcome would be "mixed / inconclusive", not an improvement.

## The research question, point by point (brief §12)

1. **Does widening the library improve the next fold on a fixed selection budget, beyond a few ETFs?** No. A1 (wide,
   same J_s scoring) vs the sealed A0 on the same archive: unfavourable at every K in fold A (Σ V $187k vs $296k at
   K = 16), neither in fold B (−$78k vs −$159k, W/L 19/21) — "no evidence of improvement". On NEW, A1 is unfavourable in
   fold A and favourable in fold B ("mixed"); on NEW-S and ALL it is "no evidence of improvement". At equal checked
   budget (A1(8) vs A0) and against the no-diversity ablation (A1 vs A1n) diversity did not help consistently. Whatever
   helped in one regime hurt in the other.
2. **Does a tail-compatible objective (no largest-winner subtraction) improve later risk-adjusted results, or only
   training peak P&L?** It amplified the regime: A2 on ARCH beat A0 in the 2020–21 rebound (+$59.8k Σ V, favourable at
   every K — mostly from 8 ETFs where A0 had declined to nominate) and lost far more in 2022–23 (−$404k vs −$159k,
   unfavourable at every K); on the new pools it was "demonstrably worse or risk-incompatible". The families the
   best-trade deduction displaced (median 74–82% of training net from one trade) did better than the sealed library in
   2020–21 (mean +$9.4k vs +$4.2k) and much worse in 2022–23 (−$11.8k vs −$3.1k; 14 of 77 positive).
3. **Diversity, new optimization, validation-based selection, or more trials?** None: diversity (A1 vs A1n, A1(8) vs A0)
   inconsistent; new optimization (NEW/NEW-S/ALL vs the sealed A0; ARCH-S vs NEW-S at equal budget) no better; validation
   selection worse; more trials raised the training winner's score without raising its later result (nominees ≈ random
   library members; the hindsight oracle far above every rule; training-vs-window ρ ≈ 0).
4. **Does intermediate validation selection retain an advantage on the next period?** No: T1/NEW is "worse" (A4
   unfavourable against both A2(K) and the baseline at every K; picks +$25k each in 2020–21, −$5.5k in 2022–23; median
   ρ(selection V, later V) −0.13); T2 (secondary) worse or no evidence in every pool.
5. **Are risk ceilings, costs and capture robust; what drives the finding; could sparse folds make it indeterminate?**
   Costs do not change the conclusion (re-simulated at 0/2/5/10 bps; two near-zero comparisons flip). The $35,000
   training gate did not bound 2022–23 drawdowns for any procedure (8–17 breaches per arm). The result is driven by two
   market regimes — the 2020–21 rebound (74 window families, 24 major) and the 2022–23 bear market (156 / 78) — seen
   through correlated ETFs. In fold A no wide arm dip-captured more families than its baseline on a verdict pool; in
   fold B several did on the new pools (A3 on NEW 50 against 40, on ALL 57 against 53) without a better V — counts
   summed over correlated ETFs, and largely different families from the baseline's. Every procedure's median first
   entry came 13–21 sessions before the trough in 2022–23. The folds were not empty, so the result is not indeterminate
   for lack of trades; it is limited by the small number of independent regimes.
6. **Would the procedures have produced credible candidates without seeing their future?** Yes — every library and
   nomination was sealed before its window opened (calendar door; chronology checks pass). They produced credible
   candidates; those candidates did not generalize better. The procedures' *design* (thresholds, the family diameter,
   the arms) was informed by the inspected history; only their *execution* was blind to each window.
7. **Most conservative next step:** see below.

## Matching-window context (never a nomination; never compared dollar-for-dollar with Σ V over 61 slots)

VGT primary alone: fold A +$32,698, fold B +$22,145 (chosen with 2016–2026 known; not a test). B4 / B5 (pooled):
fold A +$62,161 / +$46,506, fold B +$112,826 / +$170,997 (source records). Nothing here "beats B5 out of sample", the
historical drawdown gate is not a cap on future losses, 2024–2026 was not validated, and widening a library does not
guarantee better generalization — this study found the opposite tendency for validation-based widening.

## Recommendation

- **Keep the original narrow selection as the reference;** do not adopt A1, A2, A3 or A4 as a selection procedure. Do
  not change any pool, phenotype, default or prospective protocol on the basis of this study.
- **Do not treat the best-trade deduction as a defect:** removing it admitted concentrated rebound bets that paid in
  2020–21 and failed in 2022–23, which is consistent with a regime bet (two correlated regimes cannot establish it). If
  revisited, it should be by a prospectively registered comparison, not by more retrospective optimization on
  2016–2023.
- **The more promising question is not "which vector" but "when not to trade":** every procedure lost in 2022–23 by
  buying dips that kept falling (falling knives in 63–87 episodes per arm). That belongs to a separately designed study,
  not to more selection on the same history. Within the agreed sequence, **Study 2** (all-61 D1 timing, overlap and
  capital occupancy) and **Study 3** (an independent momentum-entry strategy) come next; neither is started here.
- **A genuinely independent test** of any selection procedure needs bars after 2026-10-13 (none exist locally) or a
  separately authorized decision to open 2024-01-02 → 2026-10-13 for newly generated candidates under its own protocol.
  Neither was done.
