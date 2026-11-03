# Strategy and allocation comparison

Every predeclared policy × configuration, side by side, **with no winner selected**: the protocol fixed the main
comparison (all-primary / shadow) and the low-DD sensitivity (all-lowDd) before any result, and the other six
combinations are reported to show how much the answer depends on the phenotype choice. All of it is inspected history
(2016–2025; the sector phenotypes were selected on 2017–2023 and their 2024–2025 window was opened by the earlier
program). Sources: `results/tables/strategy_comparison.md`, `fixed_pool.md`, `portfolio.md`, `scenario_summary.csv`.

## 1. Fixed $100k pool: net against minute-sampled drawdown

| Configuration (XBI-XRT-KRE) | shadow: net / minute DD / ratio | priority | split | Lots (shadow) |
|---|---|---|---|---:|
| VGT D1 alone (control) | $183,044 / $19,331 / 9.47 | — | — | 20 |
| P-P-P (all-primary, main) | $249,580 / $30,140 / 8.28 | same as shadow | $231,202 / $20,525 / 11.26 | 74 |
| P-P-L | $269,551 / $28,987 / 9.30 | same | $242,533 / $17,941 / 13.52 | 79 |
| P-L-P | $238,387 / $31,284 / 7.62 | $240,863 / $31,284 / 7.70 | $228,944 / $20,525 / 11.15 | 72 |
| P-L-L | $258,316 / $30,795 / 8.39 | $263,628 / $30,795 / 8.56 | $240,243 / $18,919 / 12.70 | 77 |
| L-P-P | $300,302 / $28,331 / 10.60 | same | $242,280 / $19,667 / 12.32 | 74 |
| L-P-L | $299,101 / $27,968 / 10.69 | same | $229,073 / $18,068 / 12.68 | 79 |
| L-L-P | $295,918 / $28,331 / 10.45 | $298,394 / $28,331 / 10.53 | $247,840 / $19,667 / 12.60 | 70 |
| L-L-L (all-lowDd) | $294,676 / $27,968 / 10.54 | $299,988 / $27,968 / 10.73 | $231,372 / $18,068 / 12.81 | 75 |

Patterns (descriptive, not a selection):

- **The XBI phenotype dominates the spread.** With XBI lowDd (3.1% stop) every full-pool run is ≈ $296–300k and beats
  VGT D1's net ÷ DD; with XBI primary (10.4% stop, long holds) every one is $238–270k and does not. XBI primary holds
  the pool through VGT's best entries (VGT kept 11 of 20 trades under P-P-P, 14 under L-L-L).
- **The split trades net for drawdown consistently**: in all eight configurations it has the lowest minute drawdown
  ($17,941–$20,525, about VGT D1's $19,331) and the highest net ÷ DD (11.2–13.5), with net $229k–$248k. Half-size lots
  halve each loss; two slots fund more of the colliding signals (96–125 lots).
- **Shadow and priority** differ only where the one decisive same-minute tie exists (XRT lowDd configurations), by
  $2,476–$5,312.
- **Refused-signal semantics** (main configurations only): cancel $196,591 / $259,341 and hold $229,629 / $200,955
  (all-primary / all-lowDd) against shadow $249,580 / $294,676 — differences of the same order as the allocator's
  whole advantage. The modelling choice of what a refused book does next is first-order.

## 2. Compounded 20% portfolio

| Configuration | shadow: end equity / vs B | priority | split | Borrowing $-days (shadow) |
|---|---|---|---|---:|
| B (VGT D1 alone) | $2,346,272 | — | — | 185.5M |
| P-P-P (main) | $2,608,223 / +$261,951 | same | $2,510,234 / +$163,961 | 276.7M |
| P-P-L | $2,731,994 / +$385,722 | same | $2,576,031 / +$229,759 | 285.0M |
| P-L-P | $2,561,859 / +$215,587 | $2,574,352 | $2,502,497 | 270.2M |
| P-L-L | $2,683,090 / +$336,818 | $2,711,773 | $2,567,905 | 278.2M |
| L-P-P | $2,903,665 / +$557,393 | same | $2,693,538 | 283.7M |
| L-P-L | $2,911,632 / +$565,360 | same | $2,635,998 | 282.0M |
| L-L-P | $2,883,737 / +$537,465 | $2,897,799 | $2,726,799 | 285.1M |
| L-L-L | $2,891,291 / +$545,019 | $2,922,199 | $2,653,068 | 283.4M |

Daily maximum drawdown: 25.2% for every shadow/priority run, 24.6% for every split, 25.3% for B (the core's
2025-01-23 → 2025-04-08 decline). Minimum equity ÷ LMV 81.7% (shadow) and 82.9–83.0% (split) versus B's 82.0%.

## 3. Risk/return frontier and what it does and does not show

- **Fixed pool**: VGT D1 sits at (DD $19.3k, net $183k). The split runs lie to the upper right at the same drawdown;
  the full-pool runs lie further right ($28–31k DD). Whether any of them is "above" VGT D1 depends on the phenotype
  choice and on costs: at 2 bps all-primary/shadow loses 40% of its advantage (`STRESS_AND_EXECUTION_COSTS.md`).
- **Portfolio**: because the drawdown is the core's, every run sits at ≈ 25% and the frontier is end equity against
  borrowing. At matched borrowing-dollar-days the main configuration is ≈ $7k below B; L-L-L is $111k–$179k above
  (`results/tables/matched_utilization.md`). More borrowing is what most of the end-equity spread buys.
- **Margin**: every run's closest approach is at equity ÷ LMV 80.9–82.1%; the allocator choice does not move the
  maintenance distance by more than a point (`VANGUARD_MARGIN_RISK.md` §3).

## 4. Evidence grades

| Claim | Grade |
|---|---|
| Baselines reproduce (seven phenotypes, A, B) | verified, exact |
| Allocator nets, drawdowns, lots for every configuration and policy | computed on inspected history (exploratory) |
| "XBI lowDd configurations beat VGT D1 on net ÷ DD" | descriptive, in-sample; the phenotypes were chosen on development data and their holdout was already opened; no forward evidence |
| "The main configuration does not improve VGT D1" | computed, by the predeclared §12 rule; robust to the cost/interest sensitivities in the same direction |
| Margin distances and break-evens | model proxies under assumed (unverified) Vanguard rules |
| Cost and interest fragility | sensitivity on the observed path |
