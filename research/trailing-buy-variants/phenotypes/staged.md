# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + progressive deployment (`staged`)

Runnable source: `src/app/allIn-trailingBuy-staged.ts`. Run it with `npm run app allIn-trailingBuy-staged VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | first | add | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `11-82fd3d779e` | 24.2% | 0.9% | 14.1% | 8 | 73 | 1.2% | 75% | 0.6% | $135,202 | $34,934 | 8 | 3/4 | 43.3% | stable | −$4,095 | $45,870 | $131,107 | $45,870 | **no** |
| pick 2 (profit) | `11-67ddc11415` | 20.4% | 0.4% | 8.0% | 11 | 102 | 0.1% | 85% | 1.0% | $109,876 | $27,265 | 16 | 8/8 | 29.3% | stable | $41,572 | $13,439 | $151,448 | $27,265 | yes |
| pick 3 (profit) | `11-6e5ea29fbf` | 24.2% | 0.7% | 14.1% | 8 | 73 | 1.9% | 55% | 6.6% | $90,902 | $26,984 | 8 | 3/4 | 27.2% | stable | −$5,077 | $42,619 | $85,825 | $42,619 | **no** |
| pick 4 (balanced) | `11-3c23eca675` | 20.5% | 1.7% | 3.1% | 12 | 78 | 1.9% | 90% | 0.6% | $77,103 | $11,919 | 21 | 18/3 | 8.2% | stable | $14,352 | $8,578 | $91,455 | $11,919 | yes |
| pick 5 (balanced) | `11-57b8e4b98f` | 24.0% | 0.1% | 7.3% | 8 | 81 | 1.5% | 50% | 7.5% | $77,591 | $15,564 | 9 | 6/3 | 15.6% | stable | $41,482 | $8,789 | $119,073 | $15,564 | yes |
| pick 6 (balanced) | `11-e45a98ac77` | 18.8% | 1.7% | 3.0% | 8 | 77 | 0.8% | 80% | 6.6% | $59,591 | $10,548 | 26 | 19/7 | 9.4% | stable | $12,143 | $6,867 | $71,734 | $10,548 | yes |
| pick 7 (low-DD) | `11-97f78e124f` | 21.1% | 1.8% | 3.8% | 11 | 78 | 2.7% | 55% | 6.6% | $40,228 | $7,813 | 17 | 16/1 | 8.4% | stable | $16,934 | $5,708 | $57,162 | $8,965 | yes |
| pick 8 (low-DD) | `11-db49c1b382` | 20.0% | 1.8% | 3.0% | 11 | 98 | 1.8% | 75% | 6.0% | $61,056 | $12,641 | 24 | 19/5 | 9.6% | stable | $11,167 | $6,400 | $72,222 | $12,641 | yes |
| pick 9 (Pareto-diverse) | `11-15ae25c14d` | 22.8% | 2.9% | 3.1% | 26 | 81 | 1.7% | 10% | 10.0% | $2,216 | $1,451 | 11 | 10/1 | 3.1% | stable | $10,045 | $3,708 | $12,261 | $3,708 | yes |
| pick 10 (Pareto-diverse) | `11-86241f0dbf` | 7.6% | 2.2% | 7.3% | 10 | 149 | 2.9% | 40% | 1.2% | $93,136 | $26,287 | 47 | 15/31 | 67.7% | moderate | $34,483 | $34,716 | $127,618 | $34,716 | yes |
| Trades2 phenotype | `11-a84836668a` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 50% | 2.0% | $97,684 | $28,233 | 17 | 8/9 | 29.3% | — | $39,581 | $8,631 | $137,265 | $28,233 | yes |
| default (file Y 3%) | `11-afdfec26c8` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 50% | 2.0% | $74,466 | $33,752 | 33 | 12/20 | 54.7% | — | $36,543 | $29,122 | $111,009 | $33,752 | yes |


## How to set each phenotype in the source file

- **pick 1** `11-82fd3d779e`: `targetPercentChangeOption ?? 0.242` (X 24.2%); `trailingBuyPercentageOption ?? 0.009` (Y 0.9%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 73;`; `intradayLossBufferOption ?? 0.012` (buffer 1.2%); `const initialFraction = 0.75;`; `const addTrigger = 0.006;`
- **pick 2** `11-67ddc11415`: `targetPercentChangeOption ?? 0.204` (X 20.4%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 102;`; `intradayLossBufferOption ?? 0.001` (buffer 0.1%); `const initialFraction = 0.85;`; `const addTrigger = 0.01;`
- **pick 3** `11-6e5ea29fbf`: `targetPercentChangeOption ?? 0.242` (X 24.2%); `trailingBuyPercentageOption ?? 0.007` (Y 0.7%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 73;`; `intradayLossBufferOption ?? 0.019` (buffer 1.9%); `const initialFraction = 0.55;`; `const addTrigger = 0.066;`
- **pick 4** `11-3c23eca675`: `targetPercentChangeOption ?? 0.205` (X 20.5%); `trailingBuyPercentageOption ?? 0.017` (Y 1.7%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 12;`; `const tickWindowSize = 78;`; `intradayLossBufferOption ?? 0.019` (buffer 1.9%); `const initialFraction = 0.9;`; `const addTrigger = 0.006;`
- **pick 5** `11-57b8e4b98f`: `targetPercentChangeOption ?? 0.24` (X 24.0%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 81;`; `intradayLossBufferOption ?? 0.015` (buffer 1.5%); `const initialFraction = 0.5;`; `const addTrigger = 0.075;`
- **pick 6** `11-e45a98ac77`: `targetPercentChangeOption ?? 0.188` (X 18.8%); `trailingBuyPercentageOption ?? 0.017` (Y 1.7%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 77;`; `intradayLossBufferOption ?? 0.008` (buffer 0.8%); `const initialFraction = 0.8;`; `const addTrigger = 0.066;`
- **pick 7** `11-97f78e124f`: `targetPercentChangeOption ?? 0.211` (X 21.1%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.038;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 78;`; `intradayLossBufferOption ?? 0.027` (buffer 2.7%); `const initialFraction = 0.55;`; `const addTrigger = 0.066;`
- **pick 8** `11-db49c1b382`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 98;`; `intradayLossBufferOption ?? 0.018` (buffer 1.8%); `const initialFraction = 0.75;`; `const addTrigger = 0.06;`
- **pick 9** `11-15ae25c14d`: `targetPercentChangeOption ?? 0.228` (X 22.8%); `trailingBuyPercentageOption ?? 0.029` (Y 2.9%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 26;`; `const tickWindowSize = 81;`; `intradayLossBufferOption ?? 0.017` (buffer 1.7%); `const initialFraction = 0.1;`; `const addTrigger = 0.1;`
- **pick 10** `11-86241f0dbf`: `targetPercentChangeOption ?? 0.076` (X 7.6%); `trailingBuyPercentageOption ?? 0.022` (Y 2.2%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 10;`; `const tickWindowSize = 149;`; `intradayLossBufferOption ?? 0.029` (buffer 2.9%); `const initialFraction = 0.4;`; `const addTrigger = 0.012;`
- **Trades2 phenotype** `11-a84836668a`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const initialFraction = 0.5;`; `const addTrigger = 0.02;`
- **default (file Y 3%)** `11-afdfec26c8`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const initialFraction = 0.5;`; `const addTrigger = 0.02;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 44 | $133,242 | $134,739 | $97,429 | $35,008 | $43,385 | $108,210 | stable | — |
| pick 2 | 42 | $100,735 | $107,812 | $62,073 | $27,371 | $33,391 | $89,209 | stable | — |
| pick 3 | 46 | $86,076 | $90,892 | $40,691 | $27,612 | $40,289 | $64,649 | stable | — |
| pick 4 | 40 | $68,903 | $75,662 | $42,781 | $12,047 | $23,576 | $68,589 | stable | — |
| pick 5 | 43 | $67,493 | $76,024 | $18,786 | $15,763 | $21,295 | $53,274 | stable | — |
| pick 6 | 43 | $53,950 | $57,021 | $24,335 | $11,451 | $23,341 | $37,702 | stable | — |
| pick 7 | 45 | $33,506 | $39,737 | $18,972 | $8,441 | $15,676 | $22,790 | stable | — |
| pick 8 | 43 | $55,093 | $58,855 | $32,926 | $13,436 | $18,060 | $54,629 | stable | — |
| pick 9 | 39 | $2,153 | $2,216 | $12 | $1,470 | $9,978 | $1,507 | stable | — |
| pick 10 | 44 | $79,677 | $89,900 | $27,566 | $34,374 | $59,828 | $70,709 | moderate | — |
