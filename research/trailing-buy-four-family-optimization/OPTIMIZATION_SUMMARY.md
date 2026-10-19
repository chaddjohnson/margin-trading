# Optimization summary: four intraday trailing-buy strategies on VGT minute data

## Executive summary

**Verdict: no credible improvement was demonstrated.** Optimizing any of the four trailing-buy families made the
in-sample results look much better and the out-of-sample results worse than the files' own defaults. Neither
modification shows a repeatable out-of-sample advantage under the pre-declared rule: not the buffered intraday
loss exit, not removing the re-entry restriction, and not both together. The immediate-entry `allIn.ts` beat
each of the four trailing-buy defaults in every out-of-sample window, and beat every optimized policy over the
four windows combined. In single windows some optimized picks did beat it: the deep-dip low-DD picks made
+$17k to +$23k in 2022, against its −$4.3k.

- **The search ran in full, as specified.** It covered 4 families × 4 fits (3 walk-forward folds plus the final
  development fit). Each stage ran 4,096 unique scrambled-Sobol points, 2 anchors, and 2 NSGA-II runs of 60
  generations × 128 offspring. That is 311,328 requested and 277,527 unique simulations, plus 55,006
  neighbourhood probes and a 69,362-simulation equal-budget random control. Nothing was shrunk. The search took
  about 2 minutes of wall clock on 8 worker threads, and the whole study about 15 minutes, most of it parity runs
  of the original files.
- **The engine is the strategy files.** Parity passed 156/156 cases plus 8 full-file cases at the holdout. Every
  trade field, daily mark, net profit and drawdown matched exactly, with a difference of 0. The comparison
  covered the four unmodified files at their defaults, the matched-Y runs, three other date ranges, 128
  golden-master vectors through generated injectable copies, and 240 synthetic edge-case scenarios
  (PARITY_AUDIT.md).
- **In sample (2016-09-20 → 2023-12-29),** each family's highest-net pick made 1.6× to 5.7× its default's development
  net, usually with a lower minute drawdown. Family 2's default made $27,377 (minute DD $47,324); its
  highest-net pick made $155,226 (DD $25,257). Family 4's top pick ($124,919) had a higher drawdown than its default ($41,579
  against $33,781). Sobol+NSGA-II's Pareto sets beat the random control in every family: hypervolume 17%–36% higher,
  higher best net, and every random front point dominated.
- **Walk-forward (true out of sample, 2020-01-02 → 2023-12-29).** Each window used picks made on the preceding
  training data only:

  | Policy | Total net, range across families |
  |---|---|
  | Stitched optimized policies (profit #1, balanced #1, low-DD #1, median of 10) | −$58.2k to +$28.5k |
  | Unoptimized family defaults | $27.0k to $67.6k |
  | `allIn.ts` | $94.8k |

  Overfitting is visible: the median training net of a fold's picks was $31k–$88k, and the median validation net
  was −$34.5k to +$20.5k.
- **Frozen holdout (2024-01-02 → 2025-10-13, evaluated once).**

  | Family | Median of 10 picks | Picks beating own default | File default |
  |---|---|---|---|
  | 1 | −$5,627 | 0/10 | $43,163 |
  | 2 | $15,902 | 0/10 | $43,204 |
  | 3 | $21,986 | 3/10 | $27,566 |
  | 4 | $20,553 | 3/10 | $28,932 |

  `allIn.ts` made $48,432; **0 of 40 picks beat it**, under `stop` or `next-open` fills, at 8%, 11% or 14%
  interest, continuous or flat start.
- **Why.** The training data reward turning the trailing buy almost off:
  - 39 of 40 frozen picks have Y ≤ 1.4%, and 32 have Y ≤ 0.8%, against the files' 3%–4%.
  - That comes with tight or very wide stops, short holds, and often very deep arming dips (X ≥ 19% in 16 of
    40).
  - Shallow-X, low-Y picks re-enter repeatedly in falling markets, and deep-X picks barely trade.
  - In the holdout, 27 of the 33 picks with positive net made at least 90% of it on a single trade.

## Prominent disclosures

1. **Idealized fills.** The primary results fill intraday stops at the stop price. The `next-open` sensitivity
   changed each pick's net by −$746 to +$1,024 on development data and by −$313 to +$247 in the holdout, so no
   conclusion depends on it. There is no spread, commission or slippage, which the brief excludes.
2. **Missing minutes.** About 20% of regular-session minutes have no bar (no trades), most in 2016–2017. The
   files and the engine use the bars as they are, and nothing was filled in or repaired. Five sessions have no
   closing print.
3. **Few trades.** Holdout picks made 2–11 entries each, and development picks 13–55. Single trades dominate
   many results; see concentration in ROBUSTNESS.md and HOLDOUT.md.
4. **Selection amended once before any out-of-sample result** (PROTOCOL.md Amendment 1). Exact-phenotype
   de-duplication left near-identical behaviours, so a held-session-overlap clone rule and a behaviour-cluster
   pool were added. Only final-fit in-sample metrics had been seen. No walk-forward, freeze or holdout result
   existed, and the superseded picks were never evaluated out of sample.
5. **Domain boundaries.** 9 of 40 picks sit at X = 20.0% (the upper bound), 15 at stop ≤ 4.1%, and 32 at
   Y ≤ 0.8% (lower bound 0.5%). The in-sample optimum may lie outside the pre-declared domain. It wasn't
   searched further.
6. **The holdout is not pristine.** 2024–2025 is chronologically withheld, and the optimizer never read it.
   But earlier research in this repository inspected prominent 2025 trades, and April 2025 drives many holdout
   results.
7. **Drawdowns** are of the $100,000 strategy P&L allocation's mark-to-market, minute-sampled and daily. They
   are not whole-account equity or margin-call risk.
8. **`allIn.ts` is a fixed comparator at its checked-in constants** (10% / 8% / 15 days / 90 / 1% / 2% / 38%),
   not optimized here. It runs its own code with the same first eligible session (2016-09-20), the same stop
   fill, the same interest and the same accounting.
9. **Matched Y.** The files' default Y differs: 4% in file 1 and 3% in the others. Every family was also
   evaluated at both Y = 3% and Y = 4%. The buffered exit would pass the pre-declared rule in 2 of the 4
   matched-Y default comparisons (restricted at Y = 4%, unrestricted at Y = 3%) and fail the other two, so it
   isn't consistent across Y. Removing the restriction never passes.

## Recommendation

- **Don't adopt any optimized parameter vector from this study.** Their development advantage is an in-sample
  fit. Out of sample they lost to the unoptimized defaults in most windows: at most 1 of 4 windows for each
  family's median and balanced #1 policies. They lost to `allIn.ts` in every family.
- **Don't switch to the buffered or no-reentry variants on this evidence.** No comparison was credited for the
  optimized families, and the default-level effects flip with Y and with the window.
- **If one of these strategies is to be run, the evidence favours `allIn.ts`'s immediate entry over any
  trailing-buy family.** It made $143,203 over the four out-of-sample windows, against $70,253–$96,498 for the
  trailing-buy defaults, and beat each default in all four windows. This repeats the earlier daily-bar study's
  conclusion to keep the immediate entry (research/trailing-buy-entry/).
- **If a trailing-buy file must be used, keep its file defaults rather than an optimized vector.** The
  differences among the four defaults out of sample aren't consistent (family 4 led the walk-forward; families
  1 and 2 led the holdout), so no family is recommended over another.


## Search budget actually run

| Fit | Family | Dims | Attempted | Unique simulated | Duplicates | Feasible | Phenotypes (feasible, net > 0) | Pool | Probe evaluations | Picks | Runtime (s) | Workers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fold1 | 1 | 8 | 19458 | 18433 | 1025 | 14699 | 5159 | 100 | 4319 new | 10 | 4.2 | 8 |
| fold1 | 2 | 9 | 19458 | 18580 | 878 | 15187 | 6940 | 100 | 4759 new | 10 | 4.0 | 8 |
| fold1 | 3 | 5 | 19458 | 16527 | 2931 | 13721 | 6201 | 100 | 2655 new | 10 | 3.8 | 8 |
| fold1 | 4 | 6 | 19458 | 17459 | 1999 | 14340 | 7494 | 100 | 3063 new | 10 | 4.5 | 8 |
| fold2 | 1 | 8 | 19458 | 18376 | 1082 | 16131 | 9013 | 100 | 4094 new | 10 | 7.8 | 8 |
| fold2 | 2 | 9 | 19458 | 18576 | 882 | 16122 | 8587 | 100 | 4743 new | 10 | 7.7 | 8 |
| fold2 | 3 | 5 | 19458 | 17134 | 2324 | 15256 | 8533 | 100 | 2658 new | 10 | 7.9 | 8 |
| fold2 | 4 | 6 | 19458 | 17642 | 1816 | 15566 | 8465 | 100 | 3181 new | 10 | 7.9 | 8 |
| fold3 | 1 | 8 | 19458 | 18009 | 1449 | 17968 | 9643 | 100 | 4205 new | 10 | 8.1 | 8 |
| fold3 | 2 | 9 | 19458 | 18116 | 1342 | 18084 | 12118 | 100 | 4720 new | 10 | 10.9 | 8 |
| fold3 | 3 | 5 | 19458 | 13931 | 5527 | 13925 | 8990 | 76 | 1844 new | 10 | 7.0 | 8 |
| fold3 | 4 | 6 | 19458 | 15382 | 4076 | 15369 | 9578 | 52 | 1500 new | 10 | 8.1 | 8 |
| final | 1 | 8 | 19458 | 18218 | 1240 | 18132 | 12846 | 100 | 4301 new | 10 | 10.7 | 8 |
| final | 2 | 9 | 19458 | 18346 | 1112 | 18260 | 13731 | 100 | 4668 new | 10 | 12.9 | 8 |
| final | 3 | 5 | 19458 | 15135 | 4323 | 15112 | 11614 | 100 | 2582 new | 10 | 8.9 | 8 |
| final | 4 | 6 | 19458 | 17663 | 1795 | 17629 | 14599 | 58 | 1714 new | 10 | 11.4 | 8 |

## Random-sampling control (final development fit, equal unique-evaluation budget)

| Family | Unique (Sobol+NSGA-II / random) | Hypervolume Sobol+NSGA-II | Hypervolume random | Ratio | Best net Sobol+NSGA-II | Best net random | Front size (S+N / random) | Front points dominated by the other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 18218 / 18218 | 1.2827e+10 | 1.0078e+10 | 1.273 | $155,504 | $125,937 | 282 / 6 | 0 / 6 |
| 2 | 18346 / 18346 | 1.3190e+10 | 9.6855e+9 | 1.362 | $155,226 | $118,210 | 402 / 10 | 0 / 10 |
| 3 | 15135 / 15135 | 9.3287e+9 | 7.9834e+9 | 1.169 | $118,416 | $108,940 | 210 / 9 | 0 / 9 |
| 4 | 17663 / 17663 | 1.0303e+10 | 8.4910e+9 | 1.213 | $124,919 | $106,027 | 165 / 10 | 0 / 10 |

## Cross-family comparison (same dates, same conventions)

Development = in-sample for the final picks; walk-forward = fold picks on their own validation windows (true out-of-sample); holdout = frozen picks, evaluated once. `stop` fills, 11%.

| Family | Contender | Parameters (final fit) | Dev net | Dev minute DD | Dev trades | Walk-forward 2020–2023 net (fold picks of this category) | Worst WF window minute DD | Holdout net | Holdout minute DD | Holdout trades |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | default (file Y 4%) | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $52,892 | $50,277 | 27 | $38,730 | $47,024 | $43,163 | $34,324 | 6 |
| 1 | highest net (profit #1) | X=11.4% Y=0.6% stop=9.8% hold=8 L=60 mat=1.4% lower=5.4% reset=68.0% | $155,504 | $31,388 | 27 | $19,298 | $32,624 | −$6,741 | $31,672 | 4 |
| 1 | balanced #1 | X=7.1% Y=0.5% stop=4.5% hold=11 L=63 mat=1.7% lower=5.3% reset=65.5% | $123,202 | $19,094 | 55 | $27,847 | $25,913 | −$4,512 | $37,549 | 11 |
| 1 | lowest DD (low-DD #1) | X=18.9% Y=0.6% stop=4.0% hold=9 L=58 mat=1.5% lower=5.5% reset=69.1% | $61,646 | $12,494 | 17 | $28,502 | $24,607 | $16,125 | $13,439 | 3 |
| 2 | default (file Y 3%) | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $27,377 | $47,324 | 30 | $27,049 | $45,620 | $43,204 | $36,190 | 6 |
| 2 | highest net (profit #1) | X=7.3% Y=1.4% stop=4.9% hold=13 L=62 mat=2.7% lower=5.9% reset=67.9% buffer=0.2% | $144,753 | $27,006 | 50 | −$29,924 | $51,238 | $19,193 | $29,587 | 9 |
| 2 | balanced #1 | X=11.6% Y=0.6% stop=5.1% hold=8 L=60 mat=1.1% lower=5.3% reset=66.4% buffer=2.7% | $126,612 | $17,988 | 37 | $1,783 | $38,305 | $33,022 | $24,989 | 7 |
| 2 | lowest DD (low-DD #1) | X=19.3% Y=0.6% stop=4.1% hold=10 L=71 mat=0.5% lower=5.8% reset=53.8% buffer=0.6% | $69,022 | $10,710 | 17 | $25,572 | $25,090 | $14,910 | $13,439 | 2 |
| 3 | default (file Y 3%) | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 | $58,107 | $40,846 | 32 | $55,107 | $40,735 | $27,566 | $42,750 | 8 |
| 3 | highest net (profit #1) | X=11.4% Y=0.8% stop=9.8% hold=6 L=64 | $114,049 | $37,516 | 44 | −$50,186 | $55,164 | $19,390 | $44,302 | 8 |
| 3 | balanced #1 | X=11.7% Y=0.8% stop=5.1% hold=7 L=160 | $111,888 | $23,354 | 54 | −$49,143 | $47,793 | $14,675 | $36,486 | 9 |
| 3 | lowest DD (low-DD #1) | X=19.1% Y=0.6% stop=4.0% hold=5 L=68 | $57,597 | $10,710 | 26 | $14,099 | $30,356 | $14,934 | $13,439 | 5 |
| 4 | default (file Y 3%) | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 buffer=0.5% | $76,480 | $33,781 | 33 | $67,566 | $33,781 | $28,932 | $41,384 | 8 |
| 4 | highest net (profit #1) | X=11.4% Y=0.8% stop=9.8% hold=18 L=58 buffer=0.8% | $124,919 | $41,579 | 25 | −$32,502 | $49,181 | $31,503 | $34,784 | 5 |
| 4 | balanced #1 | X=20.0% Y=1.2% stop=4.7% hold=11 L=71 buffer=0.8% | $74,539 | $13,871 | 17 | −$58,168 | $54,089 | $27,448 | $13,341 | 2 |
| 4 | lowest DD (low-DD #1) | X=20.0% Y=0.9% stop=4.0% hold=5 L=65 buffer=0.5% | $39,030 | $12,216 | 23 | $5,344 | $30,365 | $14,761 | $13,380 | 5 |
| — | allIn.ts (immediate entry) | 10% / 8% / 15 d / 90 / 1% / 2% / 38% | $119,193 | $26,287 | 27 | $94,771 | $25,231 | $48,432 | $32,084 | 6 |

The walk-forward column is the stitched policy for that category (each window's pick made on the preceding training data); it is a different parameter vector in each window, never the final-fit vector shown in the same row.

## The 10 frozen phenotypes per family (compact; every column is in the TOP10 files)

Dev = final development fit, 2016-09-20 → 2023-12-29, **in-sample**. Holdout = 2024-01-02 → 2025-10-13, evaluated once. Class = parameter-neighbourhood robustness on development data. N/A = the family has no such parameter.

### Family 1: Trailing buy (restricted re-entry)

| Rank | ID | Category | X | Y | stop | hold | L | mat | lower | reset | buffer | Dev net | Dev minute DD | Dev trades | Holdout net | Holdout minute DD | Holdout trades | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `1-417da6b3de` | profit | 11.4% | 0.6% | 9.8% | 8 | 60 | 1.4% | 5.4% | 68.0% | N/A | $155,504 | $31,388 | 27 | −$6,741 | $31,672 | 4 | stable |
| 2 | `1-3a57558dcd` | profit | 11.6% | 0.6% | 7.8% | 13 | 60 | 1.5% | 5.9% | 60.8% | N/A | $135,751 | $29,281 | 27 | $41,501 | $28,733 | 5 | stable |
| 3 | `1-6c793a656e` | profit | 11.3% | 0.6% | 10.0% | 6 | 62 | 1.4% | 5.9% | 65.6% | N/A | $120,799 | $30,389 | 27 | −$22,835 | $33,711 | 3 | stable |
| 4 | `1-75f7ace2a7` | balanced | 7.1% | 0.5% | 4.5% | 11 | 63 | 1.7% | 5.3% | 65.5% | N/A | $123,202 | $19,094 | 55 | −$4,512 | $37,549 | 11 | stable |
| 5 | `1-bf41eae7fb` | balanced | 7.0% | 0.6% | 4.1% | 11 | 58 | 0.7% | 5.3% | 66.6% | N/A | $125,144 | $20,265 | 50 | −$9,438 | $38,521 | 10 | stable |
| 6 | `1-af159a63f3` | balanced | 7.1% | 1.3% | 4.5% | 11 | 63 | 1.7% | 5.3% | 65.5% | N/A | $123,057 | $20,159 | 53 | −$30,236 | $44,735 | 8 | stable |
| 7 | `1-5d5ba8155b` | low-DD | 18.9% | 0.6% | 4.0% | 9 | 58 | 1.5% | 5.5% | 69.1% | N/A | $61,646 | $12,494 | 17 | $16,125 | $13,439 | 3 | stable |
| 8 | `1-77a7561333` | low-DD | 19.3% | 0.6% | 4.1% | 9 | 67 | 1.6% | 5.6% | 56.8% | N/A | $68,086 | $10,710 | 17 | $14,910 | $13,439 | 2 | stable |
| 9 | `1-0d0d1498c2` | Pareto-diverse | 19.4% | 0.6% | 4.1% | 9 | 104 | 1.5% | 5.3% | 52.3% | N/A | $71,841 | $13,313 | 20 | $14,910 | $13,439 | 2 | stable |
| 10 | `1-bf9654320c` | Pareto-diverse | 7.0% | 1.4% | 5.2% | 11 | 70 | 2.8% | 5.0% | 68.8% | N/A | $135,286 | $29,191 | 55 | −$34,366 | $47,362 | 9 | stable |
| base | `1-ea7ddf46c0` | default (file Y 4%) | 10.0% | 4.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | N/A | $52,892 | $50,277 | 27 | $43,163 | $34,324 | 6 | — |
| base | `1-58c2a4ea73` | default at Y 3% | 10.0% | 3.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | N/A | $23,662 | $44,659 | 28 | $43,204 | $36,190 | 6 | — |

### Family 2: Trailing buy + buffered loss exit (restricted re-entry)

| Rank | ID | Category | X | Y | stop | hold | L | mat | lower | reset | buffer | Dev net | Dev minute DD | Dev trades | Holdout net | Holdout minute DD | Holdout trades | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `2-3ee5816ff2` | profit | 7.3% | 1.4% | 4.9% | 13 | 62 | 2.7% | 5.9% | 67.9% | 0.2% | $144,753 | $27,006 | 50 | $19,193 | $29,587 | 9 | stable |
| 2 | `2-cb71dc593a` | profit | 7.0% | 1.4% | 6.6% | 13 | 94 | 2.7% | 5.9% | 51.2% | 0.0% | $155,226 | $25,257 | 48 | $33,836 | $40,367 | 9 | stable |
| 3 | `2-5ee65e820a` | profit | 7.1% | 1.6% | 5.3% | 13 | 69 | 2.1% | 5.3% | 54.7% | 2.8% | $134,617 | $25,695 | 47 | $24,601 | $31,482 | 8 | stable |
| 4 | `2-fd986c849f` | balanced | 11.6% | 0.6% | 5.1% | 8 | 60 | 1.1% | 5.3% | 66.4% | 2.7% | $126,612 | $17,988 | 37 | $33,022 | $24,989 | 7 | stable |
| 5 | `2-b9d1ab3d43` | balanced | 11.3% | 0.6% | 4.8% | 8 | 63 | 1.1% | 5.9% | 67.0% | 2.6% | $100,045 | $15,658 | 30 | −$5,908 | $23,212 | 4 | stable |
| 6 | `2-2c188c3dec` | balanced | 11.4% | 0.5% | 5.0% | 8 | 48 | 0.5% | 6.0% | 55.1% | 0.9% | $118,644 | $16,672 | 34 | $2,088 | $23,641 | 4 | moderate |
| 7 | `2-58ccfaf7dc` | low-DD | 19.3% | 0.6% | 4.1% | 10 | 71 | 0.5% | 5.8% | 53.8% | 0.6% | $69,022 | $10,710 | 17 | $14,910 | $13,439 | 2 | stable |
| 8 | `2-85c5ae0705` | low-DD | 20.0% | 0.5% | 4.1% | 10 | 153 | 0.5% | 6.0% | 49.8% | 1.4% | $70,170 | $11,086 | 19 | $15,678 | $13,449 | 3 | stable |
| 9 | `2-1e9be06c31` | Pareto-diverse | 7.1% | 0.7% | 5.1% | 13 | 61 | 1.1% | 5.3% | 68.7% | 2.6% | $134,211 | $31,250 | 47 | $8,408 | $38,509 | 8 | stable |
| 10 | `2-6ef23cd64e` | Pareto-diverse | 20.0% | 0.6% | 4.0% | 12 | 69 | 1.0% | 0.5% | 66.0% | 1.1% | $63,964 | $12,559 | 18 | $16,125 | $13,439 | 3 | stable |
| base | `2-8badd65cdc` | default (file Y 3%) | 10.0% | 3.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | 0.5% | $27,377 | $47,324 | 30 | $43,204 | $36,190 | 6 | — |
| base | `2-4a3c9a0f49` | default at Y 4% | 10.0% | 4.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | 0.5% | $69,213 | $39,537 | 28 | $43,163 | $34,324 | 6 | — |

### Family 3: Trailing buy, no re-entry restriction

| Rank | ID | Category | X | Y | stop | hold | L | mat | lower | reset | buffer | Dev net | Dev minute DD | Dev trades | Holdout net | Holdout minute DD | Holdout trades | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `3-01c6e7516c` | profit | 11.4% | 0.8% | 9.8% | 6 | 64 | N/A | N/A | N/A | N/A | $114,049 | $37,516 | 44 | $19,390 | $44,302 | 8 | stable |
| 2 | `3-5856a6037b` | profit | 20.0% | 0.7% | 7.8% | 11 | 101 | N/A | N/A | N/A | N/A | $108,239 | $27,403 | 16 | $42,781 | $13,414 | 2 | stable |
| 3 | `3-b56c62e561` | profit | 11.4% | 0.5% | 7.8% | 8 | 52 | N/A | N/A | N/A | N/A | $118,416 | $30,810 | 37 | $24,582 | $38,700 | 8 | moderate |
| 4 | `3-f3cbcfd2e7` | balanced | 11.7% | 0.8% | 5.1% | 7 | 160 | N/A | N/A | N/A | N/A | $111,888 | $23,354 | 54 | $14,675 | $36,486 | 9 | moderate |
| 5 | `3-afad112d68` | balanced | 20.0% | 1.2% | 4.7% | 10 | 99 | N/A | N/A | N/A | N/A | $80,119 | $15,978 | 19 | $27,448 | $13,341 | 2 | stable |
| 6 | `3-3769488b6b` | balanced | 17.8% | 0.6% | 7.3% | 11 | 50 | N/A | N/A | N/A | N/A | $92,431 | $24,510 | 15 | $39,717 | $24,053 | 3 | moderate |
| 7 | `3-f08a3e0eb6` | low-DD | 19.1% | 0.6% | 4.0% | 5 | 68 | N/A | N/A | N/A | N/A | $57,597 | $10,710 | 26 | $14,934 | $13,439 | 5 | stable |
| 8 | `3-5c50607453` | low-DD | 19.0% | 0.6% | 4.1% | 5 | 55 | N/A | N/A | N/A | N/A | $40,564 | $10,814 | 23 | $16,209 | $13,439 | 5 | moderate |
| 9 | `3-a591d5163c` | Pareto-diverse | 12.3% | 0.7% | 7.9% | 14 | 63 | N/A | N/A | N/A | N/A | $96,034 | $39,415 | 26 | $39,810 | $31,791 | 5 | stable |
| 10 | `3-e7eb402b22` | Pareto-diverse | 20.0% | 0.6% | 4.1% | 10 | 45 | N/A | N/A | N/A | N/A | $37,141 | $10,710 | 13 | $14,910 | $13,439 | 2 | stable |
| base | `3-a273c304e5` | default (file Y 3%) | 10.0% | 3.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | N/A | $58,107 | $40,846 | 32 | $27,566 | $42,750 | 8 | — |
| base | `3-3410e80353` | default at Y 4% | 10.0% | 4.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | N/A | $57,688 | $37,593 | 29 | $17,706 | $40,270 | 8 | — |

### Family 4: Trailing buy + buffered loss exit, no re-entry restriction

| Rank | ID | Category | X | Y | stop | hold | L | mat | lower | reset | buffer | Dev net | Dev minute DD | Dev trades | Holdout net | Holdout minute DD | Holdout trades | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `4-a49f4cf75b` | profit | 11.4% | 0.8% | 9.8% | 18 | 58 | N/A | N/A | N/A | 0.8% | $124,919 | $41,579 | 25 | $31,503 | $34,784 | 5 | stable |
| 2 | `4-81aca36069` | profit | 20.0% | 0.5% | 7.8% | 11 | 104 | N/A | N/A | N/A | 0.2% | $112,050 | $27,408 | 16 | $42,164 | $13,449 | 2 | stable |
| 3 | `4-4782c72630` | profit | 11.2% | 0.5% | 7.8% | 8 | 46 | N/A | N/A | N/A | 1.8% | $114,565 | $32,144 | 38 | $24,582 | $38,700 | 8 | stable |
| 4 | `4-8d385daec9` | balanced | 20.0% | 1.2% | 4.7% | 11 | 71 | N/A | N/A | N/A | 0.8% | $74,539 | $13,871 | 17 | $27,448 | $13,341 | 2 | stable |
| 5 | `4-53d7248c4d` | balanced | 20.0% | 0.7% | 4.1% | 11 | 106 | N/A | N/A | N/A | 0.0% | $73,495 | $14,371 | 22 | $14,558 | $13,414 | 2 | stable |
| 6 | `4-5133452ac9` | balanced | 17.8% | 0.6% | 7.3% | 11 | 49 | N/A | N/A | N/A | 0.8% | $94,659 | $24,510 | 15 | $39,717 | $24,053 | 3 | moderate |
| 7 | `4-0ee741b8b1` | low-DD | 20.0% | 0.9% | 4.0% | 5 | 65 | N/A | N/A | N/A | 0.5% | $39,030 | $12,216 | 23 | $14,761 | $13,380 | 5 | stable |
| 8 | `4-f4fa61f367` | low-DD | 19.1% | 0.6% | 4.0% | 5 | 71 | N/A | N/A | N/A | 0.4% | $61,713 | $10,710 | 27 | $14,934 | $13,439 | 5 | stable |
| 9 | `4-63f813566f` | Pareto-diverse | 18.7% | 0.8% | 4.0% | 5 | 48 | N/A | N/A | N/A | 0.9% | $35,099 | $12,027 | 22 | $2,534 | $15,392 | 5 | stable |
| 10 | `4-2edbb840c2` | Pareto-diverse | 19.9% | 0.6% | 4.0% | 5 | 53 | N/A | N/A | N/A | 0.2% | $43,059 | $10,710 | 20 | $16,524 | $13,439 | 5 | stable |
| base | `4-daabce77f9` | default (file Y 3%) | 10.0% | 3.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | 0.5% | $76,480 | $33,781 | 33 | $28,932 | $41,384 | 8 | — |
| base | `4-61341a2c22` | default at Y 4% | 10.0% | 4.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | 0.5% | $67,729 | $36,003 | 30 | $17,706 | $40,270 | 8 | — |

## Pre-declared verdicts (PROTOCOL.md §9)

| Comparison | Measure | Windows won (of 4) | Total OOS net (A vs B) | Worst OOS minute DD (A vs B) | Credited? |
| --- | --- | --- | --- | --- | --- |
| buffered vs not (restricted) | median of 10 picks | 1/4 | $23,088 vs $21,223 | $25,158 vs $32,692 | no |
| buffered vs not (restricted) | balanced #1 | 2/4 | $34,805 vs $23,335 | $38,305 vs $37,549 | no |
| buffered vs not (no restriction) | median of 10 picks | 1/4 | −$6,714 vs −$7,954 | $42,888 vs $46,380 | no |
| buffered vs not (no restriction) | balanced #1 | 2/4 | −$30,720 vs −$34,468 | $54,089 vs $47,793 | no |
| no restriction vs restriction (unbuffered) | median of 10 picks | 1/4 | −$7,954 vs $21,223 | $46,380 vs $32,692 | no |
| no restriction vs restriction (unbuffered) | balanced #1 | 1/4 | −$34,468 vs $23,335 | $47,793 vs $37,549 | no |
| no restriction vs restriction (buffered) | median of 10 picks | 1/4 | −$6,714 vs $23,088 | $42,888 vs $25,158 | no |
| no restriction vs restriction (buffered) | balanced #1 | 0/4 | −$30,720 vs $34,805 | $54,089 vs $38,305 | no |
| both vs neither | median of 10 picks | 1/4 | −$6,714 vs $21,223 | $42,888 vs $32,692 | no |
| both vs neither | balanced #1 | 1/4 | −$30,720 vs $23,335 | $54,089 vs $37,549 | no |

A modification is credited only if both measures are credited: buffered vs not (restricted): **not credited**; buffered vs not (no restriction): **not credited**; no restriction vs restriction (unbuffered): **not credited**; no restriction vs restriction (buffered): **not credited**; both vs neither: **not credited**.

### Matched-Y defaults (no optimization): modification effect alone

| Comparison | Y | Windows won (of 4) | Total OOS net (A vs B) | Worst OOS minute DD (A vs B) | Would be credited? |
| --- | --- | --- | --- | --- | --- |
| buffered vs not (restricted) | 3% | 2/4 | $70,253 vs $72,453 | $45,620 vs $43,189 | no |
| buffered vs not (restricted) | 4% | 3/4 | $92,633 vs $81,893 | $38,461 vs $47,024 | yes |
| buffered vs not (no restriction) | 3% | 3/4 | $96,498 vs $82,674 | $41,384 vs $42,750 | yes |
| buffered vs not (no restriction) | 4% | 2/4 | $65,692 vs $61,231 | $40,270 vs $40,270 | no |
| no restriction vs restriction (unbuffered) | 3% | 1/4 | $82,674 vs $72,453 | $42,750 vs $43,189 | no |
| no restriction vs restriction (unbuffered) | 4% | 1/4 | $61,231 vs $81,893 | $40,270 vs $47,024 | no |
| no restriction vs restriction (buffered) | 3% | 2/4 | $96,498 vs $70,253 | $41,384 vs $45,620 | no |
| no restriction vs restriction (buffered) | 4% | 1/4 | $65,692 vs $92,633 | $40,270 vs $38,461 | no |
| both vs neither | 3% | 2/4 | $96,498 vs $72,453 | $41,384 vs $43,189 | no |
| both vs neither | 4% | 1/4 | $65,692 vs $81,893 | $40,270 vs $47,024 | no |

### Optimized picks against their own defaults and against allIn.ts (4 out-of-sample windows)

| Family | Median of 10 vs own default | Balanced #1 vs own default | Median of 10 vs allIn.ts | Balanced #1 vs allIn.ts | Own default vs allIn.ts |
| --- | --- | --- | --- | --- | --- |
| 1 | 1/4 won; $21,223 vs $81,893 | 1/4 won; $23,335 vs $81,893 | 1/4 won; $21,223 vs $143,203 | 1/4 won; $23,335 vs $143,203 | 0/4 won; $81,893 vs $143,203 |
| 2 | 1/4 won; $23,088 vs $70,253 | 1/4 won; $34,805 vs $70,253 | 1/4 won; $23,088 vs $143,203 | 0/4 won; $34,805 vs $143,203 | 0/4 won; $70,253 vs $143,203 |
| 3 | 0/4 won; −$7,954 vs $82,674 | 0/4 won; −$34,468 vs $82,674 | 0/4 won; −$7,954 vs $143,203 | 0/4 won; −$34,468 vs $143,203 | 0/4 won; $82,674 vs $143,203 |
| 4 | 0/4 won; −$6,714 vs $96,498 | 0/4 won; −$30,720 vs $96,498 | 0/4 won; −$6,714 vs $143,203 | 0/4 won; −$30,720 vs $143,203 | 0/4 won; $96,498 vs $143,203 |

Per-family detail: [TOP10_TRAILING_BUY.md](TOP10_TRAILING_BUY.md), [TOP10_BUFFERED_LOSS.md](TOP10_BUFFERED_LOSS.md), [TOP10_NO_REENTRY.md](TOP10_NO_REENTRY.md), [TOP10_BUFFERED_LOSS_NO_REENTRY.md](TOP10_BUFFERED_LOSS_NO_REENTRY.md). Out-of-sample: [WALK_FORWARD.md](WALK_FORWARD.md), [HOLDOUT.md](HOLDOUT.md). Sensitivities: [ROBUSTNESS.md](ROBUSTNESS.md).
