# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + failed-recovery invalidation exit (`invalidation`)

Runnable source: `src/app/allIn-trailingBuy-invalidation.ts`. Run it with `npm run app allIn-trailingBuy-invalidation VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | inv | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `5-3735ad8455` | 23.7% | 0.1% | 14.1% | 8 | 65 | 2.2% | 1.3% | $137,349 | $34,281 | 9 | 3/5 | 44.1% | stable | −$15,040 | $53,860 | $122,308 | $53,860 | **no** |
| pick 2 (profit) | `5-b17b2a8375` | 24.5% | 0.1% | 14.1% | 3 | 82 | 0.3% | 1.3% | $100,348 | $28,114 | 8 | 2/5 | 27.5% | stable | $35,724 | $51,927 | $136,073 | $51,927 | **no** |
| pick 3 (profit) | `5-ef0792bb92` | 23.7% | 0.1% | 12.1% | 7 | 75 | 2.3% | 1.3% | $99,639 | $32,300 | 9 | 4/5 | 29.1% | stable | −$12,192 | $14,474 | $87,447 | $32,300 | yes |
| pick 4 (balanced) | `5-40c1090ac3` | 20.5% | 1.8% | 3.0% | 8 | 68 | 2.8% | 5.1% | $77,691 | $11,679 | 21 | 18/3 | 7.8% | stable | $1,337 | $17,250 | $79,028 | $19,489 | yes |
| pick 5 (balanced) | `5-800ba646ce` | 23.9% | 0.2% | 7.3% | 18 | 74 | 0.0% | 1.4% | $92,959 | $19,518 | 10 | 5/5 | 15.2% | stable | −$11,426 | $14,208 | $81,533 | $21,940 | yes |
| pick 6 (balanced) | `5-b7279b7443` | 21.1% | 0.1% | 7.3% | 6 | 75 | 0.3% | 1.3% | $100,500 | $19,657 | 18 | 8/10 | 19.1% | stable | $46,419 | $12,168 | $146,919 | $19,657 | yes |
| pick 7 (low-DD) | `5-0fa6d110c4` | 24.3% | 0.6% | 3.6% | 16 | 77 | 2.9% | 5.3% | $44,990 | $10,710 | 10 | 10/0 | 3.2% | stable | $18,722 | $12,781 | $63,713 | $16,213 | yes |
| pick 8 (low-DD) | `5-c2cef3045f` | 23.7% | 0.6% | 3.8% | 11 | 61 | 0.6% | 5.2% | $43,485 | $10,710 | 10 | 10/0 | 3.4% | stable | $16,426 | $14,835 | $59,911 | $18,520 | yes |
| pick 9 (Pareto-diverse) | `5-b1db02c788` | 30.0% | 0.6% | 3.6% | 16 | 133 | 0.7% | 0.3% | $31,773 | $8,462 | 9 | 6/3 | 2.4% | moderate | $6,384 | $7,614 | $38,157 | $8,462 | yes |
| pick 10 (Pareto-diverse) | `5-3952a909eb` | 30.0% | 0.6% | 3.5% | 3 | 132 | 0.7% | 1.7% | $15,195 | $9,775 | 8 | 4/4 | 0.9% | stable | $6,495 | $7,614 | $21,690 | $9,775 | yes |
| Trades2 phenotype | `5-424e16b029` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 2.0% | $76,656 | $33,701 | 23 | 8/15 | 29.0% | — | $45,760 | $11,527 | $122,416 | $33,701 | yes |
| default (file Y 3%) | `5-1d61172346` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 2.0% | $49,404 | $49,905 | 40 | 13/26 | 54.0% | — | $32,727 | $31,910 | $82,131 | $49,905 | **no** |


## How to set each phenotype in the source file

- **pick 1** `5-3735ad8455`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 65;`; `intradayLossBufferOption ?? 0.022` (buffer 2.2%); `const invalidationBuffer = 0.013;`
- **pick 2** `5-b17b2a8375`: `targetPercentChangeOption ?? 0.245` (X 24.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 82;`; `intradayLossBufferOption ?? 0.003` (buffer 0.3%); `const invalidationBuffer = 0.013;`
- **pick 3** `5-ef0792bb92`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.121;`; `const maximumHoldDays = 7;`; `const tickWindowSize = 75;`; `intradayLossBufferOption ?? 0.023` (buffer 2.3%); `const invalidationBuffer = 0.013;`
- **pick 4** `5-40c1090ac3`: `targetPercentChangeOption ?? 0.205` (X 20.5%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 68;`; `intradayLossBufferOption ?? 0.028` (buffer 2.8%); `const invalidationBuffer = 0.051;`
- **pick 5** `5-800ba646ce`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 18;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const invalidationBuffer = 0.014;`
- **pick 6** `5-b7279b7443`: `targetPercentChangeOption ?? 0.211` (X 21.1%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 6;`; `const tickWindowSize = 75;`; `intradayLossBufferOption ?? 0.003` (buffer 0.3%); `const invalidationBuffer = 0.013;`
- **pick 7** `5-0fa6d110c4`: `targetPercentChangeOption ?? 0.243` (X 24.3%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.036;`; `const maximumHoldDays = 16;`; `const tickWindowSize = 77;`; `intradayLossBufferOption ?? 0.029` (buffer 2.9%); `const invalidationBuffer = 0.053;`
- **pick 8** `5-c2cef3045f`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.038;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 61;`; `intradayLossBufferOption ?? 0.006` (buffer 0.6%); `const invalidationBuffer = 0.052;`
- **pick 9** `5-b1db02c788`: `targetPercentChangeOption ?? 0.3` (X 30.0%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.036;`; `const maximumHoldDays = 16;`; `const tickWindowSize = 133;`; `intradayLossBufferOption ?? 0.007` (buffer 0.7%); `const invalidationBuffer = 0.003;`
- **pick 10** `5-3952a909eb`: `targetPercentChangeOption ?? 0.3` (X 30.0%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.035;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 132;`; `intradayLossBufferOption ?? 0.007` (buffer 0.7%); `const invalidationBuffer = 0.017;`
- **Trades2 phenotype** `5-424e16b029`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const invalidationBuffer = 0.02;`
- **default (file Y 3%)** `5-1d61172346`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const invalidationBuffer = 0.02;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 39 | $134,447 | $137,194 | $80,508 | $34,325 | $42,923 | $110,127 | stable | — |
| pick 2 | 35 | $98,280 | $100,082 | $72,951 | $28,629 | $41,971 | $72,951 | stable | — |
| pick 3 | 39 | $96,068 | $99,435 | $77,324 | $32,300 | $36,959 | $77,324 | stable | — |
| pick 4 | 37 | $71,505 | $77,343 | $53,089 | $11,679 | $20,308 | $68,492 | stable | — |
| pick 5 | 37 | $88,081 | $92,709 | $66,272 | $19,883 | $25,068 | $66,272 | stable | — |
| pick 6 | 38 | $89,855 | $99,486 | $74,023 | $20,273 | $32,525 | $74,023 | stable | — |
| pick 7 | 40 | $42,499 | $44,990 | $24,390 | $10,710 | $13,488 | $38,664 | stable | — |
| pick 8 | 42 | $41,457 | $43,485 | $19,957 | $10,710 | $16,553 | $41,318 | stable | — |
| pick 9 | 38 | $24,183 | $31,477 | $9,087 | $8,784 | $15,576 | $25,161 | moderate | — |
| pick 10 | 36 | $15,195 | $15,286 | $12,921 | $9,775 | $10,679 | $14,034 | stable | — |
