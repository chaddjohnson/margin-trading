# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + failed-recovery invalidation exit + depth-adjusted rebound (`invalidationDepth`)

Runnable source: `(no dedicated file: combination)`. Run it with `npm run app (no dedicated file: combination) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | inv | slope | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `17-dec43fcd20` | 23.8% | 0.1% | 14.1% | 13 | 79 | 0.6% | 1.3% | 0.5% | $137,349 | $34,281 | 9 | 3/5 | 44.1% | stable | −$17,330 | $54,086 | $120,018 | $54,086 | **no** |
| pick 2 (profit) | `17-ebe2c04f69` | 20.5% | 0.5% | 7.8% | 11 | 101 | 0.2% | 5.3% | 8.2% | $103,219 | $31,540 | 18 | 9/9 | 29.2% | stable | −$3,545 | $13,656 | $99,674 | $31,540 | yes |
| pick 3 (profit) | `17-f2c7cf0644` | 23.7% | 0.1% | 14.1% | 18 | 54 | 0.3% | 1.3% | 0.1% | $99,397 | $29,065 | 8 | 2/5 | 28.0% | stable | −$17,330 | $54,086 | $82,066 | $54,086 | **no** |
| pick 4 (balanced) | `17-5946244c9e` | 20.0% | 1.6% | 3.2% | 12 | 69 | 0.6% | 5.5% | 2.5% | $78,207 | $11,679 | 20 | 17/3 | 8.3% | stable | $18,043 | $8,987 | $96,250 | $11,679 | yes |
| pick 5 (balanced) | `17-e3ca64bc9f` | 23.7% | 0.1% | 7.3% | 17 | 74 | 1.6% | 1.4% | 0.6% | $97,302 | $19,534 | 11 | 6/5 | 16.0% | stable | −$12,243 | $14,474 | $85,059 | $22,625 | yes |
| pick 6 (balanced) | `17-da351e418a` | 21.5% | 0.4% | 7.3% | 3 | 68 | 0.1% | 5.1% | 16.0% | $100,684 | $19,517 | 14 | 7/7 | 18.5% | stable | $36,030 | $15,423 | $136,714 | $23,455 | yes |
| pick 7 (low-DD) | `17-f9810bf92f` | 29.9% | 0.5% | 3.7% | 7 | 162 | 0.4% | 4.7% | 0.0% | $36,493 | $9,050 | 9 | 7/2 | 3.2% | stable | $5,988 | $7,596 | $42,481 | $9,050 | yes |
| pick 8 (low-DD) | `17-118e357b14` | 21.5% | 0.4% | 3.1% | 14 | 65 | 1.1% | 5.4% | 38.2% | $40,760 | $9,521 | 15 | 13/2 | 4.4% | stable | $2,806 | $9,987 | $43,565 | $10,725 | yes |
| pick 9 (Pareto-diverse) | `17-82dcc595f6` | 20.9% | 7.9% | 3.2% | 7 | 117 | 0.2% | 1.6% | 33.9% | $18,542 | $8,551 | 9 | 5/4 | 4.2% | stable | $14,782 | $8,721 | $33,323 | $11,551 | yes |
| pick 10 (Pareto-diverse) | `17-bff2757412` | 23.5% | 0.1% | 12.1% | 18 | 79 | 1.4% | 1.4% | 1.1% | $99,028 | $32,038 | 9 | 4/5 | 29.1% | stable | −$14,608 | $14,885 | $84,420 | $32,038 | yes |
| Trades2 phenotype | `17-c76ee26ca4` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 2.0% | 10.0% | $83,990 | $34,948 | 21 | 8/13 | 29.1% | — | $43,461 | $12,214 | $127,450 | $34,948 | yes |
| default (file Y 3%) | `17-c46172aa67` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 2.0% | 10.0% | $41,448 | $58,067 | 36 | 11/24 | 53.3% | — | $27,578 | $35,021 | $69,026 | $58,067 | **no** |


## How to set each phenotype in the source file

- **pick 1** `17-dec43fcd20`: `targetPercentChangeOption ?? 0.238` (X 23.8%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 13;`; `const tickWindowSize = 79;`; `intradayLossBufferOption ?? 0.006` (buffer 0.6%); `const invalidationBuffer = 0.013;`; `const reboundDepthSlope = 0.005;`
- **pick 2** `17-ebe2c04f69`: `targetPercentChangeOption ?? 0.205` (X 20.5%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 101;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const invalidationBuffer = 0.053;`; `const reboundDepthSlope = 0.082;`
- **pick 3** `17-f2c7cf0644`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 18;`; `const tickWindowSize = 54;`; `intradayLossBufferOption ?? 0.003` (buffer 0.3%); `const invalidationBuffer = 0.013;`; `const reboundDepthSlope = 0.001;`
- **pick 4** `17-5946244c9e`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.016` (Y 1.6%); `const trailingStopPercentage = 0.032;`; `const maximumHoldDays = 12;`; `const tickWindowSize = 69;`; `intradayLossBufferOption ?? 0.006` (buffer 0.6%); `const invalidationBuffer = 0.055;`; `const reboundDepthSlope = 0.025;`
- **pick 5** `17-e3ca64bc9f`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 17;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.016` (buffer 1.6%); `const invalidationBuffer = 0.014;`; `const reboundDepthSlope = 0.006;`
- **pick 6** `17-da351e418a`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 68;`; `intradayLossBufferOption ?? 0.001` (buffer 0.1%); `const invalidationBuffer = 0.051;`; `const reboundDepthSlope = 0.16;`
- **pick 7** `17-f9810bf92f`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 7;`; `const tickWindowSize = 162;`; `intradayLossBufferOption ?? 0.004` (buffer 0.4%); `const invalidationBuffer = 0.047;`; `const reboundDepthSlope = 0;`
- **pick 8** `17-118e357b14`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 14;`; `const tickWindowSize = 65;`; `intradayLossBufferOption ?? 0.011` (buffer 1.1%); `const invalidationBuffer = 0.054;`; `const reboundDepthSlope = 0.382;`
- **pick 9** `17-82dcc595f6`: `targetPercentChangeOption ?? 0.209` (X 20.9%); `trailingBuyPercentageOption ?? 0.079` (Y 7.9%); `const trailingStopPercentage = 0.032;`; `const maximumHoldDays = 7;`; `const tickWindowSize = 117;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const invalidationBuffer = 0.016;`; `const reboundDepthSlope = 0.339;`
- **pick 10** `17-bff2757412`: `targetPercentChangeOption ?? 0.235` (X 23.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.121;`; `const maximumHoldDays = 18;`; `const tickWindowSize = 79;`; `intradayLossBufferOption ?? 0.014` (buffer 1.4%); `const invalidationBuffer = 0.014;`; `const reboundDepthSlope = 0.011;`
- **Trades2 phenotype** `17-c76ee26ca4`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const invalidationBuffer = 0.02;`; `const reboundDepthSlope = 0.1;`
- **default (file Y 3%)** `17-c46172aa67`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const invalidationBuffer = 0.02;`; `const reboundDepthSlope = 0.1;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 45 | $135,423 | $137,320 | $82,035 | $34,413 | $42,923 | $110,127 | stable | — |
| pick 2 | 45 | $97,611 | $102,411 | $62,023 | $31,698 | $33,909 | $82,108 | stable | — |
| pick 3 | 41 | $96,631 | $99,368 | $43,353 | $29,551 | $42,923 | $71,999 | stable | — |
| pick 4 | 46 | $73,074 | $78,207 | $50,898 | $12,200 | $20,265 | $51,871 | stable | — |
| pick 5 | 45 | $92,976 | $97,302 | $70,552 | $19,638 | $25,083 | $70,552 | stable | — |
| pick 6 | 42 | $90,663 | $99,902 | $63,829 | $19,517 | $29,164 | $63,829 | stable | — |
| pick 7 | 41 | $34,918 | $36,493 | $27,093 | $9,050 | $10,711 | $28,949 | stable | — |
| pick 8 | 45 | $36,515 | $40,760 | $11,058 | $10,249 | $29,127 | $22,445 | stable | — |
| pick 9 | 42 | $18,541 | $18,542 | $8,391 | $8,551 | $18,056 | $16,978 | stable | — |
| pick 10 | 45 | $95,117 | $99,028 | $76,779 | $32,078 | $37,587 | $76,779 | stable | — |
