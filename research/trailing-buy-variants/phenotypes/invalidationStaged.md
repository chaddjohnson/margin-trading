# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + failed-recovery invalidation exit + progressive deployment (`invalidationStaged`)

Runnable source: `(no dedicated file: combination)`. Run it with `npm run app (no dedicated file: combination) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | inv | first | add | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `18-f9ab2f0367` | 23.7% | 0.1% | 14.2% | 14 | 65 | 2.7% | 1.4% | 85% | 0.5% | $135,823 | $34,769 | 9 | 3/5 | 44.1% | stable | −$15,634 | $52,407 | $120,189 | $52,407 | **no** |
| pick 2 (profit) | `18-34448e33cb` | 23.7% | 0.1% | 7.3% | 4 | 70 | 2.5% | 1.4% | 85% | 0.5% | $96,471 | $20,074 | 11 | 6/5 | 16.0% | stable | −$10,508 | $12,303 | $85,963 | $20,479 | yes |
| pick 3 (profit) | `18-173f8b0135` | 24.8% | 0.1% | 14.1% | 9 | 82 | 1.5% | 1.4% | 80% | 9.8% | $93,139 | $28,816 | 8 | 2/5 | 27.6% | stable | $36,853 | $47,671 | $129,992 | $47,671 | **no** |
| pick 4 (balanced) | `18-9b11185f4e` | 20.0% | 1.7% | 3.0% | 21 | 68 | 1.8% | 4.8% | 85% | 0.9% | $74,972 | $11,953 | 19 | 17/2 | 8.1% | stable | −$3,563 | $15,763 | $71,409 | $17,568 | yes |
| pick 5 (balanced) | `18-bcfb053ec0` | 24.4% | 0.1% | 7.3% | 3 | 79 | 2.5% | 1.4% | 85% | 0.5% | $70,701 | $14,713 | 8 | 4/4 | 10.1% | stable | $38,626 | $12,685 | $109,328 | $19,889 | yes |
| pick 6 (balanced) | `18-edcb2b57a7` | 21.3% | 0.2% | 7.3% | 13 | 80 | 1.4% | 1.4% | 70% | 9.1% | $76,482 | $16,545 | 19 | 7/12 | 19.7% | stable | $31,112 | $12,010 | $107,594 | $20,734 | yes |
| pick 7 (low-DD) | `18-4b904b4646` | 20.0% | 1.8% | 3.1% | 15 | 68 | 1.5% | 4.9% | 60% | 6.5% | $37,760 | $7,007 | 20 | 17/3 | 5.6% | stable | −$4,826 | $10,350 | $32,934 | $13,056 | yes |
| pick 8 (low-DD) | `18-88e972457f` | 21.6% | 0.5% | 4.0% | 19 | 65 | 2.0% | 5.5% | 55% | 7.7% | $35,742 | $7,454 | 13 | 13/0 | 8.0% | stable | $9,720 | $8,338 | $45,462 | $11,991 | yes |
| pick 9 (Pareto-diverse) | `18-2193f0b980` | 26.9% | 1.8% | 3.2% | 16 | 140 | 1.0% | 0.1% | 10% | 9.5% | $914 | $1,708 | 18 | 10/8 | 3.2% | stable | −$3,099 | $4,479 | −$2,185 | $4,479 | yes |
| pick 10 (Pareto-diverse) | `18-5b8636879d` | 24.2% | 0.2% | 12.5% | 15 | 78 | 1.4% | 1.4% | 80% | 9.7% | $88,856 | $29,747 | 9 | 4/5 | 28.6% | stable | $37,216 | $10,844 | $126,072 | $29,747 | yes |
| Trades2 phenotype | `18-70e8d6fa07` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 2.0% | 50% | 2.0% | $63,225 | $38,455 | 25 | 7/18 | 28.9% | — | $40,352 | $12,430 | $103,577 | $38,455 | **no** |
| default (file Y 3%) | `18-7994b7fd0e` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 2.0% | 50% | 2.0% | $46,104 | $51,517 | 40 | 12/27 | 53.7% | — | $32,125 | $29,549 | $78,230 | $51,517 | **no** |


## How to set each phenotype in the source file

- **pick 1** `18-f9ab2f0367`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.142;`; `const maximumHoldDays = 14;`; `const tickWindowSize = 65;`; `intradayLossBufferOption ?? 0.027` (buffer 2.7%); `const invalidationBuffer = 0.014;`; `const initialFraction = 0.85;`; `const addTrigger = 0.005;`
- **pick 2** `18-34448e33cb`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 4;`; `const tickWindowSize = 70;`; `intradayLossBufferOption ?? 0.025` (buffer 2.5%); `const invalidationBuffer = 0.014;`; `const initialFraction = 0.85;`; `const addTrigger = 0.005;`
- **pick 3** `18-173f8b0135`: `targetPercentChangeOption ?? 0.248` (X 24.8%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 9;`; `const tickWindowSize = 82;`; `intradayLossBufferOption ?? 0.015` (buffer 1.5%); `const invalidationBuffer = 0.014;`; `const initialFraction = 0.8;`; `const addTrigger = 0.098;`
- **pick 4** `18-9b11185f4e`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.017` (Y 1.7%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 21;`; `const tickWindowSize = 68;`; `intradayLossBufferOption ?? 0.018` (buffer 1.8%); `const invalidationBuffer = 0.048;`; `const initialFraction = 0.85;`; `const addTrigger = 0.009;`
- **pick 5** `18-bcfb053ec0`: `targetPercentChangeOption ?? 0.244` (X 24.4%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 79;`; `intradayLossBufferOption ?? 0.025` (buffer 2.5%); `const invalidationBuffer = 0.014;`; `const initialFraction = 0.85;`; `const addTrigger = 0.005;`
- **pick 6** `18-edcb2b57a7`: `targetPercentChangeOption ?? 0.213` (X 21.3%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 13;`; `const tickWindowSize = 80;`; `intradayLossBufferOption ?? 0.014` (buffer 1.4%); `const invalidationBuffer = 0.014;`; `const initialFraction = 0.7;`; `const addTrigger = 0.091;`
- **pick 7** `18-4b904b4646`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.031;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 68;`; `intradayLossBufferOption ?? 0.015` (buffer 1.5%); `const invalidationBuffer = 0.049;`; `const initialFraction = 0.6;`; `const addTrigger = 0.065;`
- **pick 8** `18-88e972457f`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.04;`; `const maximumHoldDays = 19;`; `const tickWindowSize = 65;`; `intradayLossBufferOption ?? 0.02` (buffer 2.0%); `const invalidationBuffer = 0.055;`; `const initialFraction = 0.55;`; `const addTrigger = 0.077;`
- **pick 9** `18-2193f0b980`: `targetPercentChangeOption ?? 0.269` (X 26.9%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.032;`; `const maximumHoldDays = 16;`; `const tickWindowSize = 140;`; `intradayLossBufferOption ?? 0.01` (buffer 1.0%); `const invalidationBuffer = 0.001;`; `const initialFraction = 0.1;`; `const addTrigger = 0.095;`
- **pick 10** `18-5b8636879d`: `targetPercentChangeOption ?? 0.242` (X 24.2%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.125;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 78;`; `intradayLossBufferOption ?? 0.014` (buffer 1.4%); `const invalidationBuffer = 0.014;`; `const initialFraction = 0.8;`; `const addTrigger = 0.097;`
- **Trades2 phenotype** `18-70e8d6fa07`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const invalidationBuffer = 0.02;`; `const initialFraction = 0.5;`; `const addTrigger = 0.02;`
- **default (file Y 3%)** `18-7994b7fd0e`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const invalidationBuffer = 0.02;`; `const initialFraction = 0.5;`; `const addTrigger = 0.02;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 44 | $134,173 | $135,561 | $79,758 | $34,944 | $43,327 | $134,863 | stable | — |
| pick 2 | 43 | $92,397 | $96,134 | $58,621 | $20,263 | $25,512 | $58,621 | stable | — |
| pick 3 | 47 | $90,818 | $93,139 | $66,257 | $29,144 | $42,429 | $66,257 | stable | — |
| pick 4 | 47 | $71,765 | $74,972 | $51,566 | $11,955 | $23,225 | $67,387 | stable | — |
| pick 5 | 42 | $69,026 | $70,394 | $43,538 | $14,952 | $21,963 | $43,538 | stable | — |
| pick 6 | 50 | $71,762 | $75,758 | $50,412 | $17,486 | $26,204 | $50,412 | stable | — |
| pick 7 | 50 | $36,162 | $37,760 | $16,884 | $7,007 | $15,041 | $35,132 | stable | — |
| pick 8 | 51 | $34,261 | $35,742 | $17,755 | $7,455 | $14,342 | $27,538 | stable | — |
| pick 9 | 46 | $746 | $914 | −$50 | $1,765 | $4,793 | $471 | stable | — |
| pick 10 | 49 | $87,444 | $88,856 | $53,566 | $29,826 | $34,187 | $87,105 | stable | — |
