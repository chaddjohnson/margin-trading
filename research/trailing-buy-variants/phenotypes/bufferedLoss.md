# Phenotypes: Trailing buy + buffered loss exit (restricted re-entry) (`bufferedLoss`)

Runnable source: `src/app/allIn-trailingBuy-bufferedLoss.ts`. Run it with `npm run app allIn-trailingBuy-bufferedLoss VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | mat | lower | reset | buffer | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `2-723e75d7e0` | 23.7% | 0.1% | 14.1% | 4 | 76 | 1.8% | 5.8% | 39.4% | 1.9% | $142,004 | $32,053 | 8 | 4/3 | 43.9% | stable | −$4,870 | $48,267 | $137,134 | $48,267 | **no** |
| pick 2 (profit) | `2-da601b44d8` | 11.4% | 0.6% | 7.9% | 6 | 53 | 1.2% | 5.9% | 59.1% | 2.6% | $136,086 | $25,279 | 33 | 13/19 | 47.0% | stable | −$14,053 | $28,268 | $122,033 | $28,268 | yes |
| pick 3 (profit) | `2-5a28fd24e1` | 11.4% | 0.1% | 7.3% | 10 | 166 | 0.9% | 5.9% | 47.3% | 2.6% | $144,480 | $22,742 | 32 | 16/15 | 51.4% | stable | $31,390 | $26,919 | $175,870 | $26,919 | yes |
| pick 4 (balanced) | `2-3615fa7ab5` | 23.8% | 0.8% | 7.3% | 8 | 70 | 1.2% | 5.9% | 25.5% | 0.6% | $89,000 | $15,451 | 9 | 6/3 | 14.1% | stable | $50,456 | $8,922 | $139,457 | $16,565 | yes |
| pick 5 (balanced) | `2-4d327855ac` | 21.8% | 0.8% | 7.3% | 3 | 78 | 2.3% | 5.9% | 66.3% | 0.9% | $85,163 | $15,341 | 9 | 5/4 | 15.5% | stable | −$7,015 | $7,691 | $78,148 | $21,218 | yes |
| pick 6 (balanced) | `2-079468726e` | 21.5% | 0.1% | 4.9% | 8 | 68 | 1.5% | 5.0% | 27.1% | 2.3% | $82,693 | $12,949 | 15 | 12/3 | 12.8% | stable | $33,283 | $9,762 | $115,975 | $14,700 | yes |
| pick 7 (low-DD) | `2-11783d9df4` | 29.9% | 0.1% | 3.7% | 6 | 178 | 1.0% | 0.8% | 35.3% | 2.5% | $39,474 | $8,920 | 10 | 8/2 | 3.5% | stable | $5,988 | $7,596 | $45,462 | $8,920 | yes |
| pick 8 (low-DD) | `2-2d3f282c61` | 23.8% | 0.6% | 4.1% | 29 | 63 | 2.8% | 5.8% | 67.0% | 0.4% | $43,040 | $10,710 | 10 | 10/0 | 3.9% | stable | $24,387 | $8,922 | $67,427 | $12,909 | yes |
| pick 9 (Pareto-diverse) | `2-de95dcdacf` | 11.7% | 0.1% | 7.3% | 8 | 178 | 0.7% | 5.7% | 45.3% | 2.6% | $138,158 | $23,963 | 31 | 16/14 | 42.9% | stable | $28,587 | $26,956 | $166,745 | $26,956 | yes |
| pick 10 (Pareto-diverse) | `2-4d1f6062ac` | 12.2% | 0.1% | 8.0% | 14 | 76 | 1.8% | 5.7% | 39.3% | 1.9% | $118,182 | $32,966 | 23 | 10/12 | 41.6% | stable | $36,861 | $27,250 | $155,044 | $32,966 | yes |
| Trades2 phenotype | `2-0531bf87a8` | 20.0% | 0.5% | 7.8% | 11 | 104 | 1.0% | 2.0% | 38.0% | 0.2% | $113,505 | $27,408 | 16 | 10/6 | 29.3% | — | $42,164 | $13,449 | $155,669 | $27,408 | yes |
| default (file Y 3%) | `2-24e376e677` | 10.0% | 3.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | 0.5% | $27,377 | $47,324 | 30 | 9/20 | 41.9% | — | $43,204 | $36,190 | $70,581 | $47,324 | **no** |


## How to set each phenotype in the source file

- **pick 1** `2-723e75d7e0`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 4;`; `const tickWindowSize = 76;`; `const materialLossThreshold = 0.018;`; `const lowerPriceReentry = 0.058;`; `const retraceFraction = 0.394;`; `intradayLossBufferOption ?? 0.019` (buffer 1.9%)
- **pick 2** `2-da601b44d8`: `targetPercentChangeOption ?? 0.114` (X 11.4%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.079;`; `const maximumHoldDays = 6;`; `const tickWindowSize = 53;`; `const materialLossThreshold = 0.012;`; `const lowerPriceReentry = 0.059;`; `const retraceFraction = 0.591;`; `intradayLossBufferOption ?? 0.026` (buffer 2.6%)
- **pick 3** `2-5a28fd24e1`: `targetPercentChangeOption ?? 0.114` (X 11.4%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 10;`; `const tickWindowSize = 166;`; `const materialLossThreshold = 0.009;`; `const lowerPriceReentry = 0.059;`; `const retraceFraction = 0.473;`; `intradayLossBufferOption ?? 0.026` (buffer 2.6%)
- **pick 4** `2-3615fa7ab5`: `targetPercentChangeOption ?? 0.238` (X 23.8%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 70;`; `const materialLossThreshold = 0.012;`; `const lowerPriceReentry = 0.059;`; `const retraceFraction = 0.255;`; `intradayLossBufferOption ?? 0.006` (buffer 0.6%)
- **pick 5** `2-4d327855ac`: `targetPercentChangeOption ?? 0.218` (X 21.8%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 78;`; `const materialLossThreshold = 0.023;`; `const lowerPriceReentry = 0.059;`; `const retraceFraction = 0.663;`; `intradayLossBufferOption ?? 0.009` (buffer 0.9%)
- **pick 6** `2-079468726e`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.049;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 68;`; `const materialLossThreshold = 0.015;`; `const lowerPriceReentry = 0.05;`; `const retraceFraction = 0.271;`; `intradayLossBufferOption ?? 0.023` (buffer 2.3%)
- **pick 7** `2-11783d9df4`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 6;`; `const tickWindowSize = 178;`; `const materialLossThreshold = 0.01;`; `const lowerPriceReentry = 0.008;`; `const retraceFraction = 0.353;`; `intradayLossBufferOption ?? 0.025` (buffer 2.5%)
- **pick 8** `2-2d3f282c61`: `targetPercentChangeOption ?? 0.238` (X 23.8%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.041;`; `const maximumHoldDays = 29;`; `const tickWindowSize = 63;`; `const materialLossThreshold = 0.028;`; `const lowerPriceReentry = 0.058;`; `const retraceFraction = 0.67;`; `intradayLossBufferOption ?? 0.004` (buffer 0.4%)
- **pick 9** `2-de95dcdacf`: `targetPercentChangeOption ?? 0.117` (X 11.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 178;`; `const materialLossThreshold = 0.007;`; `const lowerPriceReentry = 0.057;`; `const retraceFraction = 0.453;`; `intradayLossBufferOption ?? 0.026` (buffer 2.6%)
- **pick 10** `2-4d1f6062ac`: `targetPercentChangeOption ?? 0.122` (X 12.2%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 14;`; `const tickWindowSize = 76;`; `const materialLossThreshold = 0.018;`; `const lowerPriceReentry = 0.057;`; `const retraceFraction = 0.393;`; `intradayLossBufferOption ?? 0.019` (buffer 1.9%)
- **Trades2 phenotype** `2-0531bf87a8`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const materialLossThreshold = 0.01;`; `const lowerPriceReentry = 0.02;`; `const retraceFraction = 0.38;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%)
- **default (file Y 3%)** `2-24e376e677`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const materialLossThreshold = 0.01;`; `const lowerPriceReentry = 0.02;`; `const retraceFraction = 0.38;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%)

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 47 | $140,303 | $142,004 | $114,782 | $32,053 | $45,337 | $114,782 | stable | — |
| pick 2 | 50 | $124,741 | $134,633 | $53,608 | $25,497 | $40,371 | $72,771 | stable | — |
| pick 3 | 47 | $122,872 | $142,558 | $92,414 | $23,154 | $32,368 | $115,008 | stable | — |
| pick 4 | 52 | $87,746 | $89,000 | $63,825 | $15,451 | $21,445 | $63,825 | stable | — |
| pick 5 | 49 | $84,058 | $85,163 | $56,217 | $15,386 | $20,159 | $56,217 | stable | — |
| pick 6 | 51 | $76,419 | $81,988 | $29,094 | $12,994 | $19,975 | $64,450 | stable | — |
| pick 7 | 47 | $35,179 | $38,516 | $24,697 | $8,991 | $12,187 | $28,172 | stable | — |
| pick 8 | 49 | $42,162 | $43,040 | $32,296 | $10,710 | $14,400 | $36,062 | stable | — |
| pick 9 | 45 | $116,362 | $133,493 | $87,872 | $24,299 | $32,427 | $87,872 | stable | — |
| pick 10 | 50 | $111,861 | $117,880 | $67,210 | $32,966 | $36,011 | $67,210 | stable | — |
