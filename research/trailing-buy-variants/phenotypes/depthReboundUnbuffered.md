# Phenotypes: Trailing buy, no re-entry restriction + depth-adjusted rebound (`depthReboundUnbuffered`)

Runnable source: `(no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical)`. Run it with `npm run app (no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | slope | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `10-060a79997e` | 24.1% | 0.6% | 14.1% | 8 | 73 | 11.7% | $139,280 | $34,750 | 8 | 5/2 | 43.3% | stable | $44,976 | $47,665 | $184,256 | $47,665 | **no** |
| pick 2 (profit) | `10-c4d76baf39` | 23.9% | 0.8% | 12.2% | 8 | 73 | 9.2% | $100,182 | $32,776 | 8 | 4/4 | 28.5% | stable | $47,457 | $10,952 | $147,639 | $32,776 | yes |
| pick 3 (profit) | `10-84a7ab1417` | 20.0% | 0.2% | 7.8% | 11 | 103 | 10.7% | $106,695 | $26,820 | 17 | 11/6 | 29.4% | stable | $41,185 | $13,376 | $147,880 | $26,820 | yes |
| pick 4 (balanced) | `10-4f68e39c15` | 21.5% | 0.8% | 4.9% | 31 | 68 | 3.8% | $78,242 | $13,871 | 14 | 14/0 | 12.9% | stable | $33,436 | $9,478 | $111,678 | $14,491 | yes |
| pick 5 (balanced) | `10-98833bfd91` | 21.6% | 0.3% | 7.3% | 8 | 64 | 1.6% | $104,933 | $21,183 | 11 | 9/2 | 19.2% | stable | $45,572 | $10,047 | $150,505 | $21,183 | yes |
| pick 6 (balanced) | `10-8675c48628` | 20.3% | 0.5% | 4.9% | 11 | 111 | 9.9% | $80,719 | $15,194 | 20 | 14/6 | 17.0% | stable | $28,912 | $13,439 | $109,631 | $18,664 | yes |
| pick 7 (low-DD) | `10-b83f1f35b3` | 21.5% | 1.2% | 3.0% | 15 | 55 | 34.6% | $37,105 | $9,676 | 14 | 12/2 | 3.7% | stable | $11,589 | $8,911 | $48,694 | $11,327 | yes |
| pick 8 (low-DD) | `10-08483939bd` | 26.4% | 0.6% | 3.7% | 27 | 90 | 1.4% | $39,378 | $10,710 | 8 | 8/0 | 1.9% | stable | $9,509 | $8,666 | $48,887 | $10,710 | yes |
| pick 9 (Pareto-diverse) | `10-3f6fe5aad9` | 20.0% | 0.3% | 7.3% | 11 | 96 | 10.1% | $95,058 | $26,208 | 16 | 10/6 | 23.6% | stable | $41,055 | $13,376 | $136,114 | $26,208 | yes |
| pick 10 (Pareto-diverse) | `10-20791c7195` | 23.9% | 0.6% | 7.3% | 8 | 73 | 33.4% | $92,229 | $20,770 | 9 | 5/4 | 15.3% | stable | $49,868 | $8,900 | $142,096 | $20,770 | yes |
| Trades2 phenotype | `10-2dc1ec0fd2` | 20.0% | 0.5% | 7.8% | 11 | 104 | 10.0% | $107,834 | $27,403 | 16 | 9/7 | 29.4% | — | $42,970 | $13,439 | $150,804 | $27,403 | yes |
| default (file Y 3%) | `10-bd6d7066d6` | 10.0% | 3.0% | 8.0% | 15 | 90 | 10.0% | $69,320 | $35,181 | 29 | 8/20 | 48.1% | — | $11,284 | $44,805 | $80,604 | $44,805 | **no** |


## How to set each phenotype in the source file

- **pick 1** `10-060a79997e`: `targetPercentChangeOption ?? 0.241` (X 24.1%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 73;`; `const reboundDepthSlope = 0.117;`
- **pick 2** `10-c4d76baf39`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.122;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 73;`; `const reboundDepthSlope = 0.092;`
- **pick 3** `10-84a7ab1417`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 103;`; `const reboundDepthSlope = 0.107;`
- **pick 4** `10-4f68e39c15`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.049;`; `const maximumHoldDays = 31;`; `const tickWindowSize = 68;`; `const reboundDepthSlope = 0.038;`
- **pick 5** `10-98833bfd91`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 64;`; `const reboundDepthSlope = 0.016;`
- **pick 6** `10-8675c48628`: `targetPercentChangeOption ?? 0.203` (X 20.3%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.049;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 111;`; `const reboundDepthSlope = 0.099;`
- **pick 7** `10-b83f1f35b3`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.012` (Y 1.2%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 55;`; `const reboundDepthSlope = 0.346;`
- **pick 8** `10-08483939bd`: `targetPercentChangeOption ?? 0.264` (X 26.4%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 27;`; `const tickWindowSize = 90;`; `const reboundDepthSlope = 0.014;`
- **pick 9** `10-3f6fe5aad9`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 96;`; `const reboundDepthSlope = 0.101;`
- **pick 10** `10-20791c7195`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 73;`; `const reboundDepthSlope = 0.334;`
- **Trades2 phenotype** `10-2dc1ec0fd2`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const reboundDepthSlope = 0.1;`
- **default (file Y 3%)** `10-bd6d7066d6`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const reboundDepthSlope = 0.1;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 36 | $125,625 | $138,222 | $101,240 | $34,898 | $43,320 | $112,197 | stable | — |
| pick 2 | 36 | $95,489 | $98,920 | $61,175 | $32,780 | $38,029 | $79,820 | stable | — |
| pick 3 | 34 | $93,327 | $105,410 | $62,510 | $26,964 | $38,151 | $80,096 | stable | — |
| pick 4 | 36 | $70,624 | $76,705 | $44,597 | $13,871 | $24,765 | $74,359 | stable | — |
| pick 5 | 34 | $90,521 | $101,945 | $65,634 | $21,189 | $26,930 | $79,975 | stable | — |
| pick 6 | 35 | $73,873 | $76,145 | $61,270 | $18,598 | $24,072 | $75,710 | stable | — |
| pick 7 | 33 | $35,376 | $36,867 | $22,402 | $9,908 | $21,575 | $35,328 | stable | — |
| pick 8 | 36 | $33,226 | $39,378 | $26,936 | $10,710 | $15,207 | $33,413 | stable | — |
| pick 9 | 34 | $84,174 | $93,290 | $70,208 | $26,484 | $31,657 | $70,208 | stable | — |
| pick 10 | 36 | $82,437 | $88,985 | $61,132 | $22,419 | $26,811 | $61,132 | stable | — |
