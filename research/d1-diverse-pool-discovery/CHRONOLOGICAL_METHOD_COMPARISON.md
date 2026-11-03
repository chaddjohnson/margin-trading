# Chronological method comparison: J versus T (and the Q control) on two walk-forward folds (PROTOCOL.md §14) — 2026-10-26

The protocol (§21) called this report `WALK_FORWARD_RESULTS.md`. It carries the full brief's §14 name.

**Verdict: GP failed for both procedures, so no procedure may nominate.** The neighbourhood procedure J missed only
the validation-drawdown clause: its fold-b pick earned +$5,462 at the 84th percentile of random controls but drew
down $48,269 against a $45,000 limit. The temporal procedure T was below the control median in both folds. Under
the predeclared comparison rule, the folds do not distinguish T from J. Sealed record:
`results/walkforward/PROCEDURE_GATE.json` (body `9b343385…`).

**Evidence label: E2, reused historical diagnostics.** Both validation windows (2020-07 → 2021-12 and 2022 → 2023) were
inspected by earlier studies of this programme. These are method comparisons on known dates, not fresh out-of-sample
tests. Two folds can stop a procedure that does not persist; they cannot certify one that passes. If each pick were
a random control, GP would pass with probability 0.1875 per procedure.

## 1. What ran

| | fold-a | fold-b |
|---|---|---|
| Search window (physically truncated at load) | 2016-01-04 → 2020-06-30 | 2016-01-04 → 2021-12-31 |
| Validation (opened only after the sealed `PICKS.json`) | 2020-07-01 → 2021-12-31 | 2022-01-01 → 2023-12-29 |
| Temporal blocks K (T's score) | 3 | 4 |
| Reference controls (576 per window): eligible | 63 | 67 |
| Configurations per arm (J-u / T-u / Q-u) | 26,832 / 26,832 / 12,692 | 26,832 / 26,832 / 12,692 |
| Coverage contracts | met in every arm | met in every arm |
| Credible configurations → families (J / T / Q) | 8,574 → 2,651 / 6,182 → 1,911 / 1,719 → 1,076 | 7,070 → 2,836 / 3,991 → 1,797 / 1,701 → 1,135 |
| Promoted, refined, pruned and assessed (J / T / Q) | 6 / 6 / 4 | 6 / 6 / 4 |
| `PICKS.json` (sealed) | `206466c4…` | `0f6cdcdc…` |
| `validation.json` (sealed; `picksHash` = the PICKS body) | `1e96c85c…` | `0e7fd4e2…` |
| Wall-clock: search + select + validate | 15 + 13 + 4 min | 20 + 17 + 4 min |

The repaired machinery did what it was built to do. Every symbol was searched at least 733 times in every J/T arm,
against 116 in the October 25 study. There were thousands of families where that study's single-linkage shortlist
had 6 and 1. Every arm filled its slots from distinct families, including compact, incumbent-free and far ones. That
is a property of the search; it is not a forward result.

## 1a. The exact go/no-go rules (frozen before any fold ran; PROTOCOL.md §14.2–§14.5)

- **Fold gates** (5 bps, confirm-A draws, per procedure P):
  - G1 replay = full engine.
  - G2 centre minute DD ≤ $35,000 at 5 and 10 bps, and training portfolio daily % DD ≤ 35%.
  - G3 ≥ 8 funded lots in ≥ 2 calendar years, and every member's P-marginal > 0.
  - G4 P50 of the neighbours' **net** at 10 bps > 0 and ≥ 0.80 × at 5 bps; centre net > 0 at 0, 2 and 10 bps.
  - G5 Q25 of the neighbours' net ≥ 0; centre net − two largest lots > 0; centre − best regime > 0.
  - G8 tie-order sensitivity ≤ $25,000.
  - G4 and G5 read actual net for both procedures; J and T differ only in the score that ranks and that G3 uses.
- **Picks:** the primary is the top passing finalist by P's score. Alternate 1 is the next one at Jaccard ≥ 0.5;
  alternate 2 the next with ≤ 3 books at distance ≥ 0.5 from both. Q gets the centre analogues, ranked by Q.
- **Validation:** one continuous fixed-pool run from 2016-01-04, carrying state across the search end.
  - V = strategy mark at the validation end − mark at the search end (5 bps).
  - Validation minute DD resets its peak at the search end.
  - The 576 random reference controls are scored the same way; eligible controls have centre DD@5 ≤ $35,000 and
    ≥ 4 lots.
- **Outcome category per procedure and fold**, decided in the order (c), (a), (b):
  - (c) a pick exists;
  - (a) fewer than 3 credible families;
  - (b) no finalist passed.
- **Procedure gate GP(P)** passes iff both folds are (c) and all three clauses hold. Fewer than 20 eligible controls
  means no comparator, and GP fails.
  - (i) V(primary) > ctl_0.50 in both folds;
  - (ii) V(primary) ≥ ctl_0.75 and > 0 in some fold;
  - (iii) no validation minute DD > $45,000.
- **Comparison rule:** "T persisted better than J" only if GP(T) passes and GP(J) fails, or both pass and T's
  percentile is higher in both folds. Otherwise: "the folds do not distinguish them".
- **Consequence:** only a passing procedure may nominate from the final round (T preferred if both pass); otherwise
  nothing is evaluated after 2023.

**No-pick folds: none.** Every procedure produced a pick in both folds, so all six procedure-fold cells are category
(c). The October 25 study's fold-b no-pick defect did not recur. As the brief's design note says, that is a repaired
method on already inspected years, not a new independent sample.

## 2. The picks and their validation (fixed pool, 5 bps; V = mark at the validation end − mark at the search end)

| Fold | Procedure | Pick (members) | Centre (E0) | P50 net (E1) | Score | V | Control pct | Validation minute DD | Validation lots |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| fold-a | **J** | GDX IBB SMH XHB | $187,965 | $179,365 | S_J $159,365 | **+$13,759** | **0.70** | $14,293 | 3 |
| fold-a | **T** | GDX SMH | $140,671 | $137,964 | S_T $87,861 | **−$12,043** | **0.10** | $33,094 | 23 |
| fold-a | Q (bounded control) | GDX IGV XRT | $178,051 | $135,883 | Q $163,051 | −$8,496 | 0.13 | $38,662 | 23 |
| fold-b | **J** | GDX SMH XHB | $239,556 | $225,267 | S_J $210,267 | **+$5,462** | **0.84** | **$48,269** | 12 |
| fold-b | **T** | IGV VOOG | $42,396 | $127,375 | S_T $103,196 | **−$7,089** | **0.46** | $42,201 | 17 |
| fold-b | Q | EWW GDX XHB | $217,989 | $174,919 | Q $202,989 | −$4,001 | 0.58 | $33,567 | 11 |

Control quantiles of V among eligible controls:
- fold-a: ctl_0.25 −$1,257; ctl_0.50 $564; ctl_0.75 $15,310.
- fold-b: ctl_0.25 −$22,484; ctl_0.50 −$6,279; ctl_0.75 $1,424.

The full tables are `results/tables/walkforward.md` and `round-fold-a.md` / `round-fold-b.md`. They list every finalist
with E0 beside E1, alternates, flat-start runs, V at 0/2/5/10 bps and activity-matched percentiles.

### 2a. The same picks in the 20% portfolio, with B1/B4/B5 for reference

The fixed $100k pool is the selection currency. In the 20%-of-equity compounded portfolio, the 60/40 VOOG/VGT core
dominates both windows; the strategy book changes the result at the margin.

Columns:
- validation return: portfolio equity at the validation end ÷ at the search end − 1, symmetric dividend convention;
- max daily % DD: the whole run, 2016-01-04 → validation end;
- B1/B4/B5: in-sample references (their vectors were chosen knowing these years).

| Fold | Row | Fixed V (5 bps) | Fixed validation minute DD | Validation lots | Portfolio validation return | Portfolio max daily % DD |
|---|---|---:|---:|---:|---:|---:|
| fold-a | J primary (GDX IBB SMH XHB) | +$13,759 | $14,293 | 3 | 68.5% | 26.4% |
| fold-a | T primary (GDX SMH) | −$12,043 | $33,094 | 23 | 60.2% | 26.1% |
| fold-a | Q primary (GDX IGV XRT) | −$8,496 | $38,662 | 23 | 60.8% | 27.6% |
| fold-a | B1 / B4 / B5 (references) | +$32,629 / +$62,144 / +$46,508 | $14,894 / $17,702 / $16,557 | 2 / 12 / 20 | 71.8% / 82.0% / 79.8% | 32.8% / 34.6% / 29.7% |
| fold-b | J primary (GDX SMH XHB) | +$5,462 | **$48,269** | 12 | −1.2% | 39.0% |
| fold-b | T primary (IGV VOOG) | −$7,089 | $42,201 | 17 | −3.5% | 37.8% |
| fold-b | Q primary (EWW GDX XHB) | −$4,001 | $33,567 | 11 | −2.2% | 37.3% |
| fold-b | B1 / B4 / B5 (references) | +$22,145 / +$112,774 / +$170,945 | $17,421 / $22,327 / $17,269 | 9 / 49 / 42 | 3.0% / 22.1% / 36.1% | 32.8% / 34.6% / 29.7% |

Alternates (fixed V at 5 bps):
- fold-a: J −$8,398 and $0 (no lot); T −$21,096 and −$11,421; Q −$54,944 and −$3,433.
- fold-b: J +$9,436; T −$8,504 and −$12,865; Q −$27,149.

The fold-b picks' portfolio drawdowns (37–39%) exceed the 35% risk limit used by the final gates. The fold gate G2
checks the training portfolio only, and validation portfolio risk is not a GP clause; it is reported, not acted on.

### 2b. Annual and regime attribution of the validation P&L (descriptive; added after GP was sealed)

Strategy-mark change per calendar year inside each validation window. The fixed pool runs at 5 bps, as one continuous
run.
- "Carried" counts lots opened before the search end and still open after it.
- Every row was first reconciled with the sealed V in `validation.json` (to 1e-6); the script stops on any
  difference.
- Source: `results/ledgers/fold-{a,b}-validation-attribution.json` from `scripts/ledgers.ts folds`. It reads the
  validation bars through the same door as `validate`, which requires the sealed `PICKS.json`; it decides nothing.

| Fold | Row (members) | 2020-07 → 2020-12 | 2021 | V | Validation lots | Carried |
|---|---|---:|---:|---:|---:|---:|
| fold-a | J primary (GDX IBB SMH XHB) | +$14,703 | −$944 | +$13,759 | 3 | 1 |
| fold-a | T primary (GDX SMH) | +$239 | −$12,283 | −$12,043 | 23 | 1 |
| fold-a | Q primary (GDX IGV XRT) | +$8,361 | −$16,857 | −$8,496 | 23 | 1 |
| fold-a | B1 / B4 / B5 (in-sample) | +$30,673 / +$46,449 / +$30,812 | +$1,957 / +$15,696 / +$15,696 | | | |

| Fold | Row (members) | 2022 | 2023 | V | Validation lots | Carried |
|---|---|---:|---:|---:|---:|---:|
| fold-b | J primary (GDX SMH XHB) | −$27,579 | +$33,041 | +$5,462 | 12 | 1 |
| fold-b | T primary (IGV VOOG) | −$8,361 | +$1,272 | −$7,089 | 17 | 0 |
| fold-b | Q primary (EWW GDX XHB) | −$12,236 | +$8,235 | −$4,001 | 11 | 1 |
| fold-b | B1 / B4 / B5 (in-sample) | +$22,145 / +$57,017 / +$84,884 | $0 / +$55,757 / +$86,060 | | | |

What the attribution shows:

1. **Fold-a's J result is one half-year.** The J pick made its validation profit in the second half of 2020 (the
   post-crash rebound, mostly on the lot carried across the search end) and lost a little in 2021. T's and Q's picks
   lost in 2021.
2. **In fold-b every pick lost in 2022** (rate-hike bear market) and recovered part or more of it in 2023. J's 2022
   loss of $27,579 is where its $48,269 validation drawdown came from.
3. **No pick earned in both years of either fold.** The in-sample references B4 and B5 did, but their vectors were
   chosen knowing these years.

Alternates follow the same pattern (`results/ledgers/…`). In fold-b, every J and T alternate lost $18k–$31k in 2022.

## 3. GP, clause by clause (§14.5)

| Procedure | (i) both folds > ctl_0.50 | (ii) some fold ≥ ctl_0.75 and > 0 | (iii) no validation DD > $45,000 | Both folds category (c) | GP |
|---|---|---|---|---|---|
| J | yes (0.70, 0.84) | yes (fold-b) | **no** (fold-b $48,269) | yes | **fail** |
| T | **no** (0.10, 0.46) | no | yes | yes | **fail** |

The independent pre-final-round review recomputed every clause from the sealed records: eligibility, type-7
quantiles, strictly-below percentiles and the 20-control floor. It agreed exactly.

## 4. What the folds say

1. **J's picks beat random pools on validation P&L in both folds (70th and 84th percentile), but not by enough or with
   acceptable risk.**
   - In fold-a, +$13,759 rests on 3 validation lots, mostly one lot carried across the search end; the isolated
     flat-start run lost $944.
   - In fold-b, the pick's validation drawdown ($48,269) exceeded the predeclared limit.
   - The limit is not moved after a near miss.
2. **T did not persist better than J; on these two windows it did worse.**
   - Its picks were below the control median in both folds.
   - The hypothesis behind T was that profit spread across sub-periods predicts the next 1.5–2 years. It found no
     support in the picks, and none among the random controls either: Spearman of search-window T0 with V was 0.07
     in fold-a and −0.04 in fold-b, against 0.00 and −0.04 for J0 and −0.10 and −0.21 for the raw centre net.
   - None of the three statistics predicts the next window among unoptimized pools.
3. **The peak control Q also failed to persist** (13th and 58th percentile). This matches the October 25 study's finding
   that peak selection persists worst.
4. **The 2022–2023 window was hard on everything the searches produced.** Twelve of the 16 fold-b finalists had a
   validation drawdown above $45,000 (up to $62k). The four below it were J-u-f3 ($36,210), T-u-f2 ($39,660), T-u-f3
   (the T pick, $42,201) and Q-u-f4 (the Q pick, $33,567). None of the four earned more than the 75th percentile
   (+$561 to −$35,501). B5's drawdown over the same window was $17,269.
   - B4 and B5 are in-sample references: their vectors were chosen with knowledge of these years. Their +$113k and
     +$171k in fold-b (+$62k and +$47k in fold-a) say nothing about selection skill.
5. **Finalists' score rank versus V** (descriptive):
   - J: Spearman 0.87 in fold-a, −0.60 in fold-b.
   - T: −0.31 in fold-a, 1.00 in fold-b.
   - Q: −0.60, 0.80.
   - On 4–6 finalists these flip sign between folds and carry no evidence.
6. **A smoothing artefact to keep in mind** (pre-final review, observation 8):
   - T's fold-b pick IGV VOOG had a centre net of $42,396, equal to IGV alone, because VOOG's one virtual trade was
     refused at the centre. Its smoothed median ($127,375) comes from perturbed draws in which VOOG's single
     long-held lot gets funded.
   - The block trim does not penalise one lot that accrues across blocks.
   - This is a mechanism divergence between centre and neighbourhood, flagged only as "thin evidence" by the gates.
     It is reported, not corrected after the outcome.

## 5. Why each fold came out as it did (categories, §14.4)

- Both folds are category (c) for J and T: picks existed, so the failure is forward performance (and, for J, forward
  risk). It is not search breadth (a) or economics (b).
- The repaired pruning removed members whose 90% lower bound was ≤ 0, before assessment.
  - In fold-b's J arm it removed SLV from three families, at prune-batch marginals of −$3,575 to −$8,053. Refinement
    had kept SLV because removing it gained less than δ = $5,000 on the refine batch. It also removed SMH from a
    fourth family. That is the October 25 study's failure mode (a small negative member kept by refinement and then
    failing G3), now caught by construction.
  - It removed inert members at exactly −λ = −$5,000 in the Q arm, VGT from a fold-a T family, and KBE then IGV from a
    fold-b T family. KBE had a positive point estimate (+$29,392) but an uncertain lower bound — the conservative rule
    at work; the result was VOOG alone (1 lot, which then failed G3's activity floor).
  - No pick failed on a member marginal.
- The fold-a J finalists are episode-concentrated: centre net $187k against net_T $53k, so one year (the block containing
  the 2020 crash and rebound) dominates. That is exactly what T penalises. T's less concentrated picks still lost.

## 6. Consequence

No procedure may nominate (§15.3). The final round runs as training-only exploration (PROTOCOL §15.1). Nothing from
this study is evaluated on 2024-01-02 → 2026-10-13, and the benchmarks are retained.
