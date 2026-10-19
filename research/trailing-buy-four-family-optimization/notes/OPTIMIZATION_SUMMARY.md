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
