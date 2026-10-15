# VGT minute optimizer: walk-forward results

Experiment `main`, seed 20261016. Each fold searched its training window (2016-10-07 to the end of the previous year) with the full budget and the pre-declared selection policy (MINUTE_OPTIMIZER_DESIGN.md), then traded its rank 1, unchanged, on the following calendar year. Every validation year starts flat, with earlier sessions as reference-high history only; an open position at the year end is marked to the last close net of accrued interest. Money is per $100,000 margin allocation at 11% interest. **Selection-cost figures are at 5 bp per side** unless a column says otherwise.

> **The comparison is tilted towards the incumbent.** The incumbent (2.5% / 2.1% / 8 d / 78 s / 2.2% / 4.0% / 36.7%) is the daily optimizer's VGT rank 1, fitted on 2014–2023 daily data, so it has seen every validation year below. The walk-forward policy only ever saw data before each year. The deep-dip control (10% / 8% / 15 d / 90 s / 1.0% / 2.0% / 38.0%) was also hand-tuned on VGT over overlapping years.

## Verdict (pre-declared rule)

At 5 bp/side the walk-forward policy earned **-$4,056** over 2020–2023 against **$72,671** for the incumbent; it was at least as good in 1 of 4 folds, and the total advantage without the best fold is -$76,933. Verdict: **negative**.

| Extra cost per side | Policy 2020–23 | Incumbent 2020–23 | Folds policy ≥ incumbent | Advantage without best fold | Verdict |
|---|---|---|---|---|---|
| 0 bp | $1,059 | $81,525 | 0 / 4 | -$79,772 | not demonstrated |
| 5 bp | -$4,056 | $72,671 | 1 / 4 | -$76,933 | negative |
| 10 bp | -$9,170 | $63,817 | 1 / 4 | -$74,094 | negative |
| 20 bp | -$19,398 | $46,109 | 1 / 4 | -$68,416 | negative |

## Per fold: selected parameters (chosen before the validation year) and validation results

| Fold | Training window | Dip | Stop | Hold (cal. days) | Lookback (sessions) | Material loss | Lower re-entry | Reset | Origin |
|---|---|---|---|---|---|---|---|---|---|
| fold-2020 | 2016-10-07 → 2019-12-31 | 3.8% | 6.3% | 37 | 209 | 0.5% | 12.9% | 49.9% | ga |
| fold-2021 | 2016-10-07 → 2020-12-31 | 0.6% | 2.1% | 12 | 167 | 2.8% | 3.4% | 8.2% | ga |
| fold-2022 | 2016-10-07 → 2021-12-31 | 0.6% | 2.7% | 11 | 144 | 1.8% | 3.1% | 81.0% | ga |
| fold-2023 | 2016-10-07 → 2022-12-30 | 2.5% | 2.7% | 9 | 210 | 1.5% | 5.8% | 57.8% | ga |

| Fold | Strategy | Trades | Exposure | Net 0 bp | Net 5 bp | Net 20 bp | Gross | Interest | Minute DD 5 bp | Daily DD 5 bp | Net 5 bp, next-open stops |
|---|---|---|---|---|---|---|---|---|---|---|---|
| fold-2020 | **rank 1** | 7 | 75.9% | $7,625 | $6,917 | $4,793 | $15,882 | $8,258 | $31,188 | $27,942 | $7,082 |
| fold-2020 | incumbent | 21 | 60.1% | $35,842 | $33,721 | $27,357 | $42,593 | $6,751 | $19,661 | $17,834 | $33,215 |
| fold-2020 | deep-dip | 6 | 73.5% | $55,943 | $55,311 | $53,416 | $63,960 | $8,016 | $19,248 | $15,561 | $55,359 |
| fold-2021 | **rank 1** | 20 | 88.1% | $10,199 | $8,189 | $2,159 | $19,993 | $9,795 | $12,873 | $11,423 | $8,142 |
| fold-2021 | incumbent | 18 | 59.1% | $19,138 | $17,325 | $11,886 | $25,708 | $6,570 | $9,152 | $8,929 | $17,310 |
| fold-2021 | deep-dip | 1 | 18.7% | $1,636 | $1,534 | $1,228 | $3,685 | $2,049 | $10,049 | $9,991 | $1,534 |
| fold-2022 | **rank 1** | 12 | 33.9% | -$26,008 | -$27,197 | -$30,763 | -$22,392 | $3,616 | $31,345 | $30,325 | -$27,337 |
| fold-2022 | incumbent | 28 | 63.3% | $16,608 | $13,796 | $5,361 | $23,509 | $6,901 | $12,774 | $10,425 | $13,874 |
| fold-2022 | deep-dip | 11 | 78.5% | -$4,315 | -$5,417 | -$8,724 | $4,093 | $8,408 | $25,519 | $22,400 | -$5,407 |
| fold-2023 | **rank 1** | 12 | 51.2% | $9,243 | $8,036 | $4,413 | $14,969 | $5,726 | $11,480 | $10,885 | $7,727 |
| fold-2023 | incumbent | 21 | 57.6% | $9,937 | $7,829 | $1,505 | $16,145 | $6,208 | $16,647 | $15,920 | $7,536 |
| fold-2023 | deep-dip | 3 | 84.0% | $43,291 | $42,965 | $41,986 | $52,422 | $9,132 | $16,217 | $14,779 | $42,965 |

## In-sample versus out-of-sample

Training P&L is the fold rank 1's result on its own training window, where it was selected (in-sample). Validation is the next year (out-of-sample for the procedure). The incumbent column shows the same windows for the incumbent.

| Fold | Rank 1 training net / year | Incumbent training net / year | Rank 1 validation net | Incumbent validation net | Rank 1 training trades / year | Rank 1 validation trades |
|---|---|---|---|---|---|---|
| fold-2020 | $23,242 | $20,796 | $6,917 | $33,721 | 2.8 | 7 |
| fold-2021 | $30,105 | $23,720 | $8,189 | $17,325 | 21.5 | 20 |
| fold-2022 | $26,022 | $22,502 | -$27,197 | $13,796 | 15.1 | 12 |
| fold-2023 | $20,495 | $21,069 | $8,036 | $7,829 | 12.7 | 12 |

## Fold-to-fold stability of the selected parameters

Stability score (mean over the seven parameters of the range of the fold rank-1 values divided by the parameter's search range; 0 = identical every year, 1 = spans the whole range): **0.39**.

| Parameter | fold-2020 | fold-2021 | fold-2022 | fold-2023 | Final run | Incumbent |
|---|---|---|---|---|---|---|
| Dip | 3.8% | 0.6% | 0.6% | 2.5% | 1.7% | 2.5% |
| Stop | 6.3% | 2.1% | 2.7% | 2.7% | 2.7% | 2.1% |
| Hold (cal. days) | 37 | 12 | 11 | 9 | 9 | 8 |
| Lookback (sessions) | 209 | 167 | 144 | 210 | 10 | 78 |
| Material loss | 0.5% | 2.8% | 1.8% | 1.5% | 0.8% | 2.2% |
| Lower re-entry | 12.9% | 3.4% | 3.1% | 5.8% | 6.3% | 4.0% |
| Reset | 49.9% | 8.2% | 81.0% | 57.8% | 9.1% | 36.7% |

## The whole shortlist out of sample (diagnostic, not the policy)

The policy trades rank 1 only. As a diagnostic of how much the ranking itself carries, every fold's full shortlist was also run on its validation year:

| Fold | Shortlist size | Median net 5 bp | Best | Worst | Beat the incumbent | Rank 1 position by validation net |
|---|---|---|---|---|---|---|
| fold-2020 | 10 | $10,442 | $26,863 | $182 | 0 / 10 | 7 of 10 |
| fold-2021 | 10 | $12,175 | $13,737 | $593 | 0 / 10 | 7 of 10 |
| fold-2022 | 10 | $9,289 | $13,168 | -$27,197 | 0 / 10 | 10 of 10 |
| fold-2023 | 10 | $7,586 | $16,053 | -$2,565 | 5 / 10 | 5 of 10 |

## Search statistics per fold

| Run | Sobol unique / drawn | GA runs (generations, new sims, stop) | Search sims | Total sims incl. probes | Gated | Passed all | Shortlist |
|---|---|---|---|---|---|---|---|
| fold-2020 | 4096 / 4096 | 47, 6010, budget; 47, 6013, budget | 16119 | 20613 | 10558 | 152 | 10 |
| fold-2021 | 4096 / 4096 | 47, 6009, budget; 47, 6014, budget | 16119 | 19243 | 9554 | 106 | 10 |
| fold-2022 | 4096 / 4096 | 47, 6015, budget; 47, 6008, budget | 16119 | 19772 | 7596 | 123 | 10 |
| fold-2023 | 4096 / 4096 | 47, 6012, budget; 47, 6012, budget | 16120 | 19705 | 7449 | 121 | 10 |
| final-2016-2023 | 4096 / 4096 | 47, 6012, budget; 47, 6008, budget | 16116 | 19213 | 7415 | 105 | 10 |

Machine-readable: `walk_forward.json` (this report's numbers), and per fold `results/<experiment>/<fold>/run.json`, `validation.json`, `evaluations.csv.gz` (every evaluated vector) and `validation-trades-*.csv`.
