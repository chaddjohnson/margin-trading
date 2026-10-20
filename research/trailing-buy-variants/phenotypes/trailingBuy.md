# Phenotypes: Trailing buy (restricted re-entry) (`trailingBuy`)

Runnable source: `src/app/allIn-trailingBuy.ts`. Run it with `npm run app allIn-trailingBuy VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | mat | lower | reset | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `1-600cc74ac5` | 24.1% | 0.9% | 14.1% | 5 | 73 | 3.0% | 5.8% | 52.5% | $137,927 | $31,241 | 8 | 3/4 | 43.1% | stable | −$7,331 | $47,839 | $130,596 | $47,839 | **no** |
| pick 2 (profit) | `1-a844adbd0e` | 11.4% | 0.1% | 9.9% | 8 | 64 | 2.5% | 4.5% | 51.5% | $146,745 | $29,835 | 31 | 12/18 | 74.0% | stable | −$8,237 | $32,884 | $138,508 | $32,884 | yes |
| pick 3 (profit) | `1-a6490f75ec` | 5.7% | 1.3% | 6.8% | 12 | 150 | 2.4% | 6.0% | 45.0% | $147,528 | $28,506 | 49 | 21/27 | 79.7% | stable | $38,824 | $38,215 | $186,352 | $38,215 | **no** |
| pick 4 (balanced) | `1-4739cced14` | 24.1% | 0.8% | 7.3% | 5 | 72 | 2.5% | 5.8% | 52.9% | $95,563 | $15,495 | 9 | 6/3 | 15.0% | stable | −$4,218 | $8,922 | $91,345 | $16,565 | yes |
| pick 5 (balanced) | `1-7e39b4db21` | 21.6% | 1.0% | 7.4% | 33 | 78 | 0.6% | 5.3% | 31.7% | $91,750 | $15,324 | 10 | 9/1 | 19.1% | stable | $43,252 | $13,080 | $135,001 | $17,249 | yes |
| pick 6 (balanced) | `1-a72232b995` | 21.6% | 0.9% | 7.4% | 11 | 73 | 1.2% | 5.9% | 49.0% | $81,506 | $14,296 | 11 | 7/4 | 14.1% | stable | −$1,892 | $13,101 | $79,613 | $17,000 | yes |
| pick 7 (low-DD) | `1-d0ce84aa1d` | 26.3% | 3.0% | 3.1% | 30 | 159 | 1.0% | 4.4% | 50.8% | $44,513 | $8,409 | 15 | 14/1 | 3.9% | stable | $4,859 | $8,911 | $49,372 | $11,643 | yes |
| pick 8 (low-DD) | `1-755923ea93` | 29.9% | 0.2% | 3.9% | 8 | 132 | 1.8% | 0.2% | 57.2% | $37,820 | $9,196 | 9 | 6/3 | 3.2% | stable | $5,790 | $7,596 | $43,611 | $9,196 | yes |
| pick 9 (Pareto-diverse) | `1-437d8cb0a3` | 11.4% | 0.1% | 7.3% | 8 | 51 | 2.3% | 4.4% | 51.5% | $135,375 | $23,904 | 33 | 18/14 | 49.1% | stable | −$81 | $28,291 | $135,294 | $28,291 | yes |
| pick 10 (Pareto-diverse) | `1-7fab230d10` | 11.3% | 0.6% | 9.6% | 8 | 164 | 2.6% | 5.1% | 51.6% | $123,427 | $31,103 | 31 | 12/18 | 61.7% | stable | −$12,909 | $31,478 | $110,518 | $31,478 | yes |
| Trades2 phenotype | `1-4c131bd871` | 20.0% | 0.5% | 7.8% | 11 | 104 | 1.0% | 2.0% | 38.0% | $112,295 | $27,408 | 16 | 10/6 | 29.3% | — | $42,164 | $13,449 | $154,459 | $27,408 | yes |
| default (file Y 4%) | `1-4d3dd761f6` | 10.0% | 4.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | $52,892 | $50,277 | 27 | 8/18 | 43.7% | — | $43,163 | $34,324 | $96,055 | $50,277 | **no** |


## How to set each phenotype in the source file

- **pick 1** `1-600cc74ac5`: `targetPercentChangeOption ?? 0.241` (X 24.1%); `trailingBuyPercentageOption ?? 0.009` (Y 0.9%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 5;`; `const tickWindowSize = 73;`; `const materialLossThreshold = 0.03;`; `const lowerPriceReentry = 0.058;`; `const retraceFraction = 0.525;`
- **pick 2** `1-a844adbd0e`: `targetPercentChangeOption ?? 0.114` (X 11.4%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.099;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 64;`; `const materialLossThreshold = 0.025;`; `const lowerPriceReentry = 0.045;`; `const retraceFraction = 0.515;`
- **pick 3** `1-a6490f75ec`: `targetPercentChangeOption ?? 0.057` (X 5.7%); `trailingBuyPercentageOption ?? 0.013` (Y 1.3%); `const trailingStopPercentage = 0.068;`; `const maximumHoldDays = 12;`; `const tickWindowSize = 150;`; `const materialLossThreshold = 0.024;`; `const lowerPriceReentry = 0.06;`; `const retraceFraction = 0.45;`
- **pick 4** `1-4739cced14`: `targetPercentChangeOption ?? 0.241` (X 24.1%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 5;`; `const tickWindowSize = 72;`; `const materialLossThreshold = 0.025;`; `const lowerPriceReentry = 0.058;`; `const retraceFraction = 0.529;`
- **pick 5** `1-7e39b4db21`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.01` (Y 1.0%); `const trailingStopPercentage = 0.074;`; `const maximumHoldDays = 33;`; `const tickWindowSize = 78;`; `const materialLossThreshold = 0.006;`; `const lowerPriceReentry = 0.053;`; `const retraceFraction = 0.317;`
- **pick 6** `1-a72232b995`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.009` (Y 0.9%); `const trailingStopPercentage = 0.074;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 73;`; `const materialLossThreshold = 0.012;`; `const lowerPriceReentry = 0.059;`; `const retraceFraction = 0.49;`
- **pick 7** `1-d0ce84aa1d`: `targetPercentChangeOption ?? 0.263` (X 26.3%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 30;`; `const tickWindowSize = 159;`; `const materialLossThreshold = 0.01;`; `const lowerPriceReentry = 0.044;`; `const retraceFraction = 0.508;`
- **pick 8** `1-755923ea93`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.039;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 132;`; `const materialLossThreshold = 0.018;`; `const lowerPriceReentry = 0.002;`; `const retraceFraction = 0.572;`
- **pick 9** `1-437d8cb0a3`: `targetPercentChangeOption ?? 0.114` (X 11.4%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 51;`; `const materialLossThreshold = 0.023;`; `const lowerPriceReentry = 0.044;`; `const retraceFraction = 0.515;`
- **pick 10** `1-7fab230d10`: `targetPercentChangeOption ?? 0.113` (X 11.3%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.096;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 164;`; `const materialLossThreshold = 0.026;`; `const lowerPriceReentry = 0.051;`; `const retraceFraction = 0.516;`
- **Trades2 phenotype** `1-4c131bd871`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const materialLossThreshold = 0.01;`; `const lowerPriceReentry = 0.02;`; `const retraceFraction = 0.38;`
- **default (file Y 4%)** `1-4d3dd761f6`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.04` (Y 4.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const materialLossThreshold = 0.01;`; `const lowerPriceReentry = 0.02;`; `const retraceFraction = 0.38;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 42 | $136,004 | $137,927 | $99,726 | $32,024 | $44,103 | $110,886 | stable | — |
| pick 2 | 45 | $125,596 | $145,889 | $81,237 | $30,125 | $52,987 | $81,842 | stable | — |
| pick 3 | 45 | $125,287 | $143,906 | $91,322 | $29,764 | $38,548 | $109,763 | stable | — |
| pick 4 | 45 | $93,343 | $95,563 | $61,867 | $15,652 | $17,952 | $70,379 | stable | — |
| pick 5 | 46 | $88,545 | $91,750 | $67,381 | $16,901 | $23,083 | $85,192 | stable | — |
| pick 6 | 46 | $80,161 | $81,506 | $9,075 | $14,972 | $21,305 | $74,948 | stable | — |
| pick 7 | 46 | $41,256 | $44,513 | $31,437 | $8,722 | $18,458 | $32,485 | stable | — |
| pick 8 | 42 | $35,363 | $37,820 | $22,245 | $9,196 | $10,711 | $24,400 | stable | — |
| pick 9 | 44 | $115,082 | $133,867 | $72,979 | $24,197 | $38,838 | $72,979 | stable | — |
| pick 10 | 47 | $114,349 | $123,427 | $63,763 | $31,179 | $47,482 | $78,074 | stable | — |
