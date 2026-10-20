# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction (`bufferedLossNoReentry`)

Runnable source: `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts`. Run it with `npm run app allIn-trailingBuy-bufferedLoss-noReentry VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `4-e680397b48` | 24.0% | 0.8% | 14.1% | 8 | 75 | 2.7% | $137,351 | $34,750 | 8 | 4/3 | 43.3% | stable | $44,971 | $47,608 | $182,322 | $47,608 | **no** |
| pick 2 (profit) | `4-4c344726dd` | 20.5% | 0.1% | 7.8% | 11 | 102 | 0.0% | $113,664 | $26,915 | 17 | 10/7 | 29.3% | stable | $42,630 | $13,450 | $156,294 | $26,915 | yes |
| pick 3 (profit) | `4-10e50f05e1` | 24.0% | 0.8% | 12.1% | 8 | 74 | 2.6% | $99,874 | $32,780 | 8 | 5/3 | 28.3% | stable | $47,843 | $10,979 | $147,717 | $32,780 | yes |
| pick 4 (balanced) | `4-63845f4e43` | 20.0% | 1.7% | 3.1% | 13 | 73 | 0.5% | $78,037 | $11,831 | 20 | 17/3 | 8.1% | stable | $14,644 | $8,584 | $92,681 | $11,831 | yes |
| pick 5 (balanced) | `4-798cb70c6d` | 21.6% | 0.3% | 7.3% | 8 | 74 | 2.9% | $104,810 | $21,183 | 11 | 9/2 | 19.2% | stable | $45,821 | $10,047 | $150,630 | $21,183 | yes |
| pick 6 (balanced) | `4-3edca9999f` | 23.1% | 0.8% | 7.4% | 3 | 72 | 0.1% | $86,720 | $19,680 | 9 | 4/5 | 15.0% | stable | $42,120 | $15,534 | $128,839 | $24,379 | yes |
| pick 7 (low-DD) | `4-d00bea4fdc` | 23.8% | 0.6% | 4.1% | 17 | 72 | 2.5% | $48,341 | $10,710 | 11 | 11/0 | 4.4% | stable | $24,387 | $8,922 | $72,728 | $12,909 | yes |
| pick 8 (low-DD) | `4-ae41382f0c` | 23.1% | 0.6% | 4.0% | 16 | 59 | 2.4% | $37,750 | $10,710 | 11 | 11/0 | 3.9% | stable | $21,291 | $8,922 | $59,041 | $12,674 | yes |
| pick 9 (Pareto-diverse) | `4-6c52311280` | 20.1% | 0.5% | 7.3% | 11 | 105 | 0.2% | $96,462 | $26,735 | 16 | 9/7 | 23.6% | stable | $42,164 | $13,449 | $138,625 | $26,735 | yes |
| pick 10 (Pareto-diverse) | `4-847834f174` | 28.8% | 3.9% | 3.0% | 19 | 160 | 0.8% | $29,202 | $9,107 | 9 | 8/1 | 2.6% | stable | $4,208 | $7,413 | $33,410 | $9,107 | yes |
| Trades2 phenotype | `4-d6aa287598` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | $112,050 | $27,408 | 16 | 9/7 | 29.4% | — | $42,164 | $13,449 | $154,213 | $27,408 | yes |
| default (file Y 3%) | `4-6777ed97f3` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | $76,480 | $33,781 | 33 | 12/20 | 55.2% | — | $28,932 | $41,384 | $105,412 | $41,384 | **no** |


## How to set each phenotype in the source file

- **pick 1** `4-e680397b48`: `targetPercentChangeOption ?? 0.24` (X 24.0%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 75;`; `intradayLossBufferOption ?? 0.027` (buffer 2.7%)
- **pick 2** `4-4c344726dd`: `targetPercentChangeOption ?? 0.205` (X 20.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 102;`; `intradayLossBufferOption ?? 0` (buffer 0.0%)
- **pick 3** `4-10e50f05e1`: `targetPercentChangeOption ?? 0.24` (X 24.0%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.121;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.026` (buffer 2.6%)
- **pick 4** `4-63845f4e43`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.017` (Y 1.7%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 13;`; `const tickWindowSize = 73;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%)
- **pick 5** `4-798cb70c6d`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.029` (buffer 2.9%)
- **pick 6** `4-3edca9999f`: `targetPercentChangeOption ?? 0.231` (X 23.1%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.074;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 72;`; `intradayLossBufferOption ?? 0.001` (buffer 0.1%)
- **pick 7** `4-d00bea4fdc`: `targetPercentChangeOption ?? 0.238` (X 23.8%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.041;`; `const maximumHoldDays = 17;`; `const tickWindowSize = 72;`; `intradayLossBufferOption ?? 0.025` (buffer 2.5%)
- **pick 8** `4-ae41382f0c`: `targetPercentChangeOption ?? 0.231` (X 23.1%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.04;`; `const maximumHoldDays = 16;`; `const tickWindowSize = 59;`; `intradayLossBufferOption ?? 0.024` (buffer 2.4%)
- **pick 9** `4-6c52311280`: `targetPercentChangeOption ?? 0.201` (X 20.1%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 105;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%)
- **pick 10** `4-847834f174`: `targetPercentChangeOption ?? 0.288` (X 28.8%); `trailingBuyPercentageOption ?? 0.039` (Y 3.9%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 19;`; `const tickWindowSize = 160;`; `intradayLossBufferOption ?? 0.008` (buffer 0.8%)
- **Trades2 phenotype** `4-d6aa287598`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%)
- **default (file Y 3%)** `4-6777ed97f3`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%)

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 35 | $130,240 | $136,575 | $99,144 | $34,751 | $43,269 | $110,311 | stable | — |
| pick 2 | 30 | $96,022 | $107,313 | $63,905 | $26,982 | $33,925 | $91,395 | stable | — |
| pick 3 | 35 | $92,681 | $98,443 | $56,923 | $32,780 | $37,652 | $77,723 | stable | — |
| pick 4 | 34 | $70,719 | $76,614 | $40,749 | $11,831 | $22,385 | $40,749 | stable | — |
| pick 5 | 32 | $90,541 | $102,475 | $76,151 | $21,183 | $26,930 | $79,852 | stable | — |
| pick 6 | 31 | $83,551 | $85,885 | $59,766 | $19,832 | $23,992 | $75,466 | stable | — |
| pick 7 | 36 | $43,040 | $48,341 | $34,619 | $10,710 | $16,873 | $39,735 | stable | — |
| pick 8 | 36 | $36,056 | $37,750 | $28,785 | $10,710 | $16,766 | $35,839 | stable | — |
| pick 9 | 33 | $83,217 | $93,278 | $70,459 | $26,836 | $32,743 | $72,018 | stable | — |
| pick 10 | 33 | $27,963 | $29,202 | $19,010 | $9,240 | $15,361 | $20,628 | stable | — |
