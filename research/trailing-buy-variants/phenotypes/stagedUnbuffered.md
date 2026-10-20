# Phenotypes: Trailing buy, no re-entry restriction + progressive deployment (`stagedUnbuffered`)

Runnable source: `(no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical)`. Run it with `npm run app (no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | first | add | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `12-8855c5329d` | 23.5% | 1.0% | 14.1% | 8 | 76 | 90% | 0.5% | $134,023 | $34,790 | 8 | 3/4 | 44.2% | stable | $44,159 | $47,182 | $178,182 | $47,182 | **no** |
| pick 2 (profit) | `12-2a79eb80ef` | 20.0% | 0.3% | 7.8% | 11 | 103 | 90% | 0.6% | $110,466 | $26,883 | 17 | 11/6 | 29.3% | stable | $40,709 | $12,038 | $151,175 | $26,883 | yes |
| pick 3 (profit) | `12-574906f156` | 21.6% | 0.3% | 7.3% | 8 | 69 | 90% | 0.6% | $103,946 | $21,227 | 11 | 9/2 | 19.2% | stable | $45,612 | $10,108 | $149,559 | $21,227 | yes |
| pick 4 (balanced) | `12-40a4dd0056` | 20.4% | 1.7% | 3.1% | 8 | 77 | 90% | 0.6% | $76,083 | $11,919 | 22 | 18/4 | 8.1% | stable | $14,352 | $8,578 | $90,435 | $11,919 | yes |
| pick 5 (balanced) | `12-830914e8e1` | 24.2% | 0.3% | 7.5% | 8 | 81 | 65% | 7.9% | $80,840 | $17,571 | 8 | 6/2 | 15.3% | stable | −$1,865 | $8,882 | $78,976 | $17,571 | yes |
| pick 6 (balanced) | `12-577aad8a37` | 21.6% | 0.5% | 7.3% | 8 | 77 | 90% | 0.6% | $81,311 | $17,984 | 11 | 7/4 | 14.4% | stable | $45,148 | $10,105 | $126,460 | $17,984 | yes |
| pick 7 (low-DD) | `12-255176f62d` | 20.0% | 1.8% | 3.5% | 7 | 73 | 75% | 7.8% | $48,772 | $8,759 | 21 | 16/5 | 8.4% | stable | $19,218 | $6,741 | $67,991 | $10,487 | yes |
| pick 8 (low-DD) | `12-42df0727ea` | 20.2% | 1.4% | 3.4% | 11 | 104 | 75% | 0.6% | $65,938 | $14,392 | 21 | 16/5 | 10.3% | stable | $12,358 | $9,997 | $78,296 | $14,392 | yes |
| pick 9 (Pareto-diverse) | `12-a38ac6857f` | 19.7% | 0.6% | 3.1% | 15 | 45 | 15% | 9.6% | $3,536 | $4,142 | 13 | 10/3 | 3.8% | moderate | $831 | $2,016 | $4,367 | $4,142 | yes |
| pick 10 (Pareto-diverse) | `12-2ac7b93950` | 19.7% | 1.6% | 3.0% | 23 | 48 | 10% | 9.9% | $3,895 | $3,447 | 13 | 12/1 | 4.4% | stable | $1,696 | $10,356 | $5,591 | $10,356 | yes |
| Trades2 phenotype | `12-a8c9159415` | 20.0% | 0.5% | 7.8% | 11 | 104 | 50% | 2.0% | $96,015 | $28,233 | 17 | 8/9 | 29.1% | — | $39,214 | $8,631 | $135,229 | $28,233 | yes |
| default (file Y 3%) | `12-8b8921e8e4` | 10.0% | 3.0% | 8.0% | 15 | 90 | 50% | 2.0% | $73,455 | $33,752 | 33 | 12/20 | 55.0% | — | $34,043 | $30,856 | $107,498 | $33,752 | yes |


## How to set each phenotype in the source file

- **pick 1** `12-8855c5329d`: `targetPercentChangeOption ?? 0.235` (X 23.5%); `trailingBuyPercentageOption ?? 0.01` (Y 1.0%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 76;`; `const initialFraction = 0.9;`; `const addTrigger = 0.005;`
- **pick 2** `12-2a79eb80ef`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 103;`; `const initialFraction = 0.9;`; `const addTrigger = 0.006;`
- **pick 3** `12-574906f156`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 69;`; `const initialFraction = 0.9;`; `const addTrigger = 0.006;`
- **pick 4** `12-40a4dd0056`: `targetPercentChangeOption ?? 0.204` (X 20.4%); `trailingBuyPercentageOption ?? 0.017` (Y 1.7%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 77;`; `const initialFraction = 0.9;`; `const addTrigger = 0.006;`
- **pick 5** `12-830914e8e1`: `targetPercentChangeOption ?? 0.242` (X 24.2%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.075;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 81;`; `const initialFraction = 0.65;`; `const addTrigger = 0.079;`
- **pick 6** `12-577aad8a37`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 77;`; `const initialFraction = 0.9;`; `const addTrigger = 0.006;`
- **pick 7** `12-255176f62d`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.035;`; `const maximumHoldDays = 7;`; `const tickWindowSize = 73;`; `const initialFraction = 0.75;`; `const addTrigger = 0.078;`
- **pick 8** `12-42df0727ea`: `targetPercentChangeOption ?? 0.202` (X 20.2%); `trailingBuyPercentageOption ?? 0.014` (Y 1.4%); `const trailingStopPercentage = 0.034;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const initialFraction = 0.75;`; `const addTrigger = 0.006;`
- **pick 9** `12-a38ac6857f`: `targetPercentChangeOption ?? 0.197` (X 19.7%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 45;`; `const initialFraction = 0.15;`; `const addTrigger = 0.096;`
- **pick 10** `12-2ac7b93950`: `targetPercentChangeOption ?? 0.197` (X 19.7%); `trailingBuyPercentageOption ?? 0.016` (Y 1.6%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 23;`; `const tickWindowSize = 48;`; `const initialFraction = 0.1;`; `const addTrigger = 0.099;`
- **Trades2 phenotype** `12-a8c9159415`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const initialFraction = 0.5;`; `const addTrigger = 0.02;`
- **default (file Y 3%)** `12-8b8921e8e4`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const initialFraction = 0.5;`; `const addTrigger = 0.02;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 35 | $128,065 | $133,497 | $107,007 | $34,905 | $44,387 | $107,007 | stable | — |
| pick 2 | 34 | $93,268 | $106,216 | $86,164 | $27,448 | $33,959 | $86,164 | stable | — |
| pick 3 | 34 | $91,346 | $102,195 | $75,312 | $21,269 | $27,040 | $79,014 | stable | — |
| pick 4 | 34 | $68,597 | $73,243 | $49,703 | $11,984 | $26,044 | $67,569 | stable | — |
| pick 5 | 38 | $74,585 | $80,347 | $57,573 | $18,067 | $21,307 | $66,139 | stable | — |
| pick 6 | 35 | $73,782 | $79,537 | $56,342 | $18,718 | $23,797 | $56,342 | stable | — |
| pick 7 | 40 | $44,160 | $48,040 | $20,691 | $8,989 | $17,653 | $36,124 | stable | — |
| pick 8 | 37 | $62,139 | $64,826 | $34,014 | $14,564 | $21,738 | $59,592 | stable | — |
| pick 9 | 33 | $2,797 | $3,536 | $2,327 | $4,144 | $6,587 | $2,382 | moderate | — |
| pick 10 | 31 | $3,889 | $4,104 | $1,313 | $4,172 | $6,644 | $3,682 | stable | — |
