# Phenotypes: Trailing buy, no re-entry restriction (`noReentry`)

Runnable source: `src/app/allIn-trailingBuy-noReentry.ts`. Run it with `npm run app allIn-trailingBuy-noReentry VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `3-766db35025` | 24.2% | 0.8% | 14.1% | 8 | 76 | $137,351 | $34,750 | 8 | 4/3 | 43.3% | stable | $44,971 | $47,608 | $182,322 | $47,608 | **no** |
| pick 2 (profit) | `3-f6e88fba03` | 20.4% | 0.3% | 7.8% | 11 | 104 | $112,340 | $26,820 | 16 | 10/6 | 29.4% | stable | $42,383 | $13,459 | $154,723 | $26,820 | yes |
| pick 3 (profit) | `3-1c65f25d09` | 21.6% | 0.3% | 7.3% | 8 | 75 | $104,810 | $21,183 | 11 | 9/2 | 19.2% | stable | $45,821 | $10,047 | $150,630 | $21,183 | yes |
| pick 4 (balanced) | `3-7f9eb0fd3b` | 18.2% | 1.8% | 3.0% | 8 | 71 | $78,477 | $11,679 | 25 | 20/5 | 8.8% | stable | $13,656 | $13,956 | $92,134 | $13,956 | yes |
| pick 5 (balanced) | `3-5db1aeca40` | 20.1% | 1.8% | 3.5% | 12 | 63 | $67,022 | $11,679 | 18 | 16/2 | 8.2% | stable | $23,124 | $8,987 | $90,145 | $12,422 | yes |
| pick 6 (balanced) | `3-63b7eee00b` | 21.3% | 1.7% | 3.1% | 12 | 78 | $74,840 | $11,831 | 18 | 16/2 | 7.5% | stable | $14,644 | $8,584 | $89,484 | $11,831 | yes |
| pick 7 (low-DD) | `3-417ed02b41` | 29.9% | 0.4% | 3.4% | 34 | 179 | $32,750 | $8,883 | 9 | 8/1 | 3.1% | stable | $6,341 | $7,596 | $39,091 | $8,883 | yes |
| pick 8 (low-DD) | `3-8c7609f0d6` | 29.9% | 0.5% | 3.7% | 34 | 133 | $39,820 | $9,050 | 8 | 7/1 | 3.1% | stable | $5,988 | $7,596 | $45,808 | $9,050 | yes |
| pick 9 (Pareto-diverse) | `3-1b8939588b` | 24.2% | 0.1% | 12.1% | 8 | 82 | $103,147 | $33,899 | 8 | 6/2 | 28.9% | stable | $47,792 | $10,975 | $150,939 | $33,899 | yes |
| pick 10 (Pareto-diverse) | `3-11268f056e` | 24.4% | 0.3% | 14.1% | 6 | 90 | $93,908 | $31,501 | 8 | 4/3 | 27.8% | stable | $45,049 | $47,796 | $138,957 | $47,796 | **no** |
| Trades2 phenotype | `3-517f8653b1` | 20.0% | 0.5% | 7.8% | 11 | 104 | $108,791 | $27,408 | 16 | 10/6 | 29.4% | — | $42,164 | $13,449 | $150,954 | $27,408 | yes |
| default (file Y 3%) | `3-c4d670d7c7` | 10.0% | 3.0% | 8.0% | 15 | 90 | $58,107 | $40,846 | 32 | 10/21 | 49.1% | — | $27,566 | $42,750 | $85,674 | $42,750 | **no** |


## How to set each phenotype in the source file

- **pick 1** `3-766db35025`: `targetPercentChangeOption ?? 0.242` (X 24.2%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 76;`
- **pick 2** `3-f6e88fba03`: `targetPercentChangeOption ?? 0.204` (X 20.4%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`
- **pick 3** `3-1c65f25d09`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 75;`
- **pick 4** `3-7f9eb0fd3b`: `targetPercentChangeOption ?? 0.182` (X 18.2%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 71;`
- **pick 5** `3-5db1aeca40`: `targetPercentChangeOption ?? 0.201` (X 20.1%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.035;`; `const maximumHoldDays = 12;`; `const tickWindowSize = 63;`
- **pick 6** `3-63b7eee00b`: `targetPercentChangeOption ?? 0.213` (X 21.3%); `trailingBuyPercentageOption ?? 0.017` (Y 1.7%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 12;`; `const tickWindowSize = 78;`
- **pick 7** `3-417ed02b41`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.034;`; `const maximumHoldDays = 34;`; `const tickWindowSize = 179;`
- **pick 8** `3-8c7609f0d6`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 34;`; `const tickWindowSize = 133;`
- **pick 9** `3-1b8939588b`: `targetPercentChangeOption ?? 0.242` (X 24.2%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.121;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 82;`
- **pick 10** `3-11268f056e`: `targetPercentChangeOption ?? 0.244` (X 24.4%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 6;`; `const tickWindowSize = 90;`
- **Trades2 phenotype** `3-517f8653b1`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`
- **default (file Y 3%)** `3-c4d670d7c7`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 30 | $122,539 | $136,318 | $99,144 | $34,841 | $43,269 | $110,311 | stable | — |
| pick 2 | 28 | $94,776 | $105,548 | $72,495 | $27,225 | $33,614 | $88,614 | stable | — |
| pick 3 | 28 | $90,378 | $99,381 | $76,151 | $21,196 | $26,930 | $79,852 | stable | — |
| pick 4 | 27 | $67,596 | $75,409 | $35,820 | $12,251 | $28,004 | $61,467 | stable | — |
| pick 5 | 30 | $64,945 | $67,022 | $31,934 | $11,755 | $23,969 | $65,197 | stable | — |
| pick 6 | 28 | $62,136 | $69,484 | $49,180 | $11,974 | $21,591 | $60,690 | stable | — |
| pick 7 | 23 | $30,780 | $32,200 | $26,635 | $8,963 | $13,892 | $26,635 | stable | — |
| pick 8 | 27 | $34,649 | $37,930 | $24,326 | $9,257 | $10,711 | $32,277 | stable | — |
| pick 9 | 27 | $85,734 | $99,698 | $55,777 | $33,899 | $39,476 | $81,001 | stable | — |
| pick 10 | 28 | $83,622 | $93,014 | $66,526 | $35,929 | $44,980 | $66,526 | stable | — |
