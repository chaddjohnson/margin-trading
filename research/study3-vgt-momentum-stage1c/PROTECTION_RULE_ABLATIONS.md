# Protection-rule ablations (A, B, C and their combinations)

Sources: `results/tables/paths.md` (Π1 knock-outs, Π-m, Π-FP), `deep-masks.md`, `develop.md` (twins, rule activity),
`robustness.md` (paired perturbed paths), `counterfactuals-2022.md`. Every 2022 statement attributable to a rule event
is **(target-year-informed)**: the rules were designed after inspecting Stage 1b's losing 2022 entries. The study
evaluated 5,114,598 configurations (5,111,641 in development).

## 1. Knock-outs of the verdict path (same picks, rules removed by sub-mask; no reselection)

| Rules kept | 2020 | 2021 | 2022 | 2023 | Σ W | Chained DD |
|---|---:|---:|---:|---:|---:|---:|
| none (Π1-off) | +$31,536 | +$25,858 | −$46,766 | +$14,824 | +$25,452 | $56,063 |
| A | +$31,536 | +$21,023 | −$48,457 | +$14,460 | +$18,562 | $56,786 |
| B | +$23,749 | +$25,010 | −$66,245 | +$13,251 | −$4,235 | $71,192 |
| C | = none | | | | +$25,452 | $56,063 |
| A+B (= A+B+C = Π1) | +$23,749 | +$18,148 | −$6,415 | +$16,186 | +$51,669 | $24,193 |

C never acted on the verdict path (C and B+C equal none and B). On this path A and B are each harmful alone and
strongly helpful together: after an A sale at a losing open, B's cooldown kept the fold-C policy out of the next
rallies' failed re-entries **(target-year-informed)**. Trade classes against Π1-off (`knockout-classes.md`): in 2022 two
rule-free losers (−$29,381) were never entered, one shared entry was cut short (−$10,540 instead of −$21,554), and four
new entries netted +$1,328 **(target-year-informed)**; in 2020 the rules replaced seven rule-free trades (+$44,161) by
three (+$37,357).

**Primary protection statement (predeclared):** Σ W(Π1) − Σ W(Π1-off) = +$26,216 and DD −$31,870, but Π1 beats its
rule-free twin in only 33.6% of the 128 paired perturbed paths (threshold 75%) → **does not hold**. In one
retrospective, target-year-informed replay and its 128 parameter perturbations (perturbations of the same picks on the
same data, not independent market samples), 62% of perturbed Π1 paths (79 / 128) stay within a $35,000 drawdown
against 0% of their rule-free twins (median DD $33,281 vs $54,979; 58.6% are both positive and within $35k), but the
profit does not carry over (median Σ W +$21,845 vs +$26,688).

**2022 with trend retention (predeclared):** Π1's 2022 −$6,415 against Π1-off's −$46,766, while 2020 + 2021 + 2023 keep
$58,084 of $72,219 (≥ the 75% retention bound, $54,164) → **holds, in one retrospective, target-year-informed
replay**.

## 2. Procedure-level and fixed-parent comparisons

- Π1 vs Π-000 (the identical procedure restricted to mask-000 cells): +$68,104, DD −$21,824 → the predeclared
  procedure statement **holds, in one retrospective, target-year-informed replay**; Π-000 itself lost $16,435.
- Mask picks Π-m (each mask's best deep champion per fold): Σ W 000 −$16,435; A +$25,241; B +$13,458; C −$7,299; A+B
  +$42,013; A+C +$27,511; B+C +$11,645; A+B+C −$9,016 (pair choice confounds these).
- Fixed parent (P\*-000 with rule-only search): training adopted rules only where they raised the parent's development
  RoD (A: B, B+C; B: most masks; H: A masks); forward, **0 of 7** gated variants improved on Π-000 by ≥ $5,000 with no
  higher DD; Π-FP-gated paths range −$28,034 to −$16,435.
- Matched-budget deep pairs (`deep-masks.md`): within a pair the best mask differs from pair to pair; masks raise the
  training champion score in some pairs and lower it in others — no rule is uniformly beneficial in training.

## 3. First-pass rule activity and twins (`develop.md`)

With common random numbers each masked design vector has a rule-off twin. Across the five histories A acted on
73–91% of the first-pass vectors of its single-rule cells, B on 35–54% and C on 9–26% (C is often inert because R3F
re-entries already require a close above the stopped trade's high and many losing exits fall short of the X
threshold). Median Δnet
versus the twin is $0 for B-only and C-only cells in every history; for A-only cells it is $0 in A and −$909, −$4,429,
−$2,351 and −$5,434 in B, C, D and H (median ΔDD ≈ $0); for A+B it is −$1,816 to −$12,406 and for A+B+C −$2,501 to
−$14,283, with slightly lower median drawdowns (ΔDD −$252 to −$1,912).

## 4. Sensitivities on the verdict path

A idealised same-print fill (Π1-open): +$51,907; C-cross (Π1-cross) = Π1 (C inert); loss record reset at boundaries
(Π1-reset) = Π1; S2 continue-old +$16,664 / DD $41,287; S3 netted re-entry +$51,195; monthly trim Z1 +$49,547. The
mask picks' C-cross and same-print-A variants are in `paths.md`.
