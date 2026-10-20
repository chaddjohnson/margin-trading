# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + correction-episode loss budget (`episodeBudget`)

Runnable source: `src/app/allIn-trailingBuy-episodeBudget.ts`. Run it with `npm run app allIn-trailingBuy-episodeBudget VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | budget | epReset | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `7-039e854ad0` | 24.1% | 0.8% | 14.1% | 8 | 74 | 0.5% | 10.0% | 51.8% | $137,351 | $34,750 | 8 | 4/3 | 43.3% | stable | −$3,423 | $47,608 | $133,928 | $47,608 | **no** |
| pick 2 (profit) | `7-edab13c98e` | 24.0% | 0.8% | 12.2% | 8 | 78 | 0.5% | 9.7% | 24.2% | $99,413 | $32,780 | 8 | 5/3 | 28.5% | stable | −$551 | $9,620 | $98,861 | $32,780 | yes |
| pick 3 (profit) | `7-232fafd906` | 21.3% | 0.3% | 7.3% | 8 | 75 | 2.3% | 18.4% | 61.3% | $103,603 | $21,183 | 12 | 9/3 | 19.4% | stable | $45,821 | $10,047 | $149,424 | $21,183 | yes |
| pick 4 (balanced) | `7-cc2e2adbbb` | 20.4% | 1.8% | 3.0% | 8 | 77 | 0.4% | 13.5% | 79.5% | $78,752 | $11,679 | 22 | 19/3 | 7.8% | stable | $14,361 | $8,533 | $93,113 | $11,679 | yes |
| pick 5 (balanced) | `7-4e67ae82b9` | 23.9% | 1.4% | 7.3% | 3 | 74 | 0.1% | 11.0% | 57.7% | $91,385 | $19,342 | 8 | 5/3 | 15.3% | stable | $45,689 | $11,957 | $137,074 | $19,342 | yes |
| pick 6 (balanced) | `7-dcb18e001f` | 21.6% | 0.1% | 7.3% | 8 | 81 | 0.0% | 15.5% | 78.9% | $83,246 | $17,994 | 14 | 10/4 | 14.6% | stable | $45,059 | $10,319 | $128,305 | $17,994 | yes |
| pick 7 (low-DD) | `7-4672d01094` | 29.9% | 0.4% | 3.7% | 7 | 178 | 2.3% | 16.9% | 49.5% | $37,191 | $8,899 | 10 | 8/2 | 3.5% | stable | $5,988 | $7,596 | $43,180 | $8,899 | yes |
| pick 8 (low-DD) | `7-f6c37a48c4` | 29.9% | 0.5% | 4.7% | 8 | 179 | 0.3% | 16.8% | 62.5% | $36,265 | $10,233 | 10 | 8/2 | 4.7% | stable | $4,909 | $7,596 | $41,174 | $10,233 | yes |
| pick 9 (Pareto-diverse) | `7-3a8b6c9751` | 29.9% | 0.5% | 3.0% | 5 | 173 | 0.0% | 15.5% | 77.2% | $25,006 | $7,869 | 9 | 6/3 | 1.7% | stable | $6,781 | $7,596 | $31,787 | $7,869 | yes |
| pick 10 (Pareto-diverse) | `7-50ad50965d` | 29.9% | 0.5% | 3.4% | 8 | 173 | 0.3% | 16.4% | 59.4% | $32,062 | $8,286 | 9 | 7/2 | 2.7% | stable | $6,341 | $7,596 | $38,403 | $8,286 | yes |
| Trades2 phenotype | `7-0a16adee03` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 8.0% | 50.0% | $53,498 | $28,340 | 14 | 7/7 | 23.1% | — | $42,164 | $13,449 | $95,662 | $28,340 | yes |
| default (file Y 3%) | `7-b38f8d65bd` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 8.0% | 50.0% | $15,767 | $40,934 | 24 | 8/15 | 37.4% | — | $14,581 | $41,384 | $30,348 | $41,384 | **no** |


## How to set each phenotype in the source file

- **pick 1** `7-039e854ad0`: `targetPercentChangeOption ?? 0.241` (X 24.1%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const episodeLossBudget = 0.1;`; `const episodeResetRetrace = 0.518;`
- **pick 2** `7-edab13c98e`: `targetPercentChangeOption ?? 0.24` (X 24.0%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.122;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 78;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const episodeLossBudget = 0.097;`; `const episodeResetRetrace = 0.242;`
- **pick 3** `7-232fafd906`: `targetPercentChangeOption ?? 0.213` (X 21.3%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 75;`; `intradayLossBufferOption ?? 0.023` (buffer 2.3%); `const episodeLossBudget = 0.184;`; `const episodeResetRetrace = 0.613;`
- **pick 4** `7-cc2e2adbbb`: `targetPercentChangeOption ?? 0.204` (X 20.4%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 77;`; `intradayLossBufferOption ?? 0.004` (buffer 0.4%); `const episodeLossBudget = 0.135;`; `const episodeResetRetrace = 0.795;`
- **pick 5** `7-4e67ae82b9`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.014` (Y 1.4%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.001` (buffer 0.1%); `const episodeLossBudget = 0.11;`; `const episodeResetRetrace = 0.577;`
- **pick 6** `7-dcb18e001f`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 81;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const episodeLossBudget = 0.155;`; `const episodeResetRetrace = 0.789;`
- **pick 7** `7-4672d01094`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 7;`; `const tickWindowSize = 178;`; `intradayLossBufferOption ?? 0.023` (buffer 2.3%); `const episodeLossBudget = 0.169;`; `const episodeResetRetrace = 0.495;`
- **pick 8** `7-f6c37a48c4`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.047;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 179;`; `intradayLossBufferOption ?? 0.003` (buffer 0.3%); `const episodeLossBudget = 0.168;`; `const episodeResetRetrace = 0.625;`
- **pick 9** `7-3a8b6c9751`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 5;`; `const tickWindowSize = 173;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const episodeLossBudget = 0.155;`; `const episodeResetRetrace = 0.772;`
- **pick 10** `7-50ad50965d`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.034;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 173;`; `intradayLossBufferOption ?? 0.003` (buffer 0.3%); `const episodeLossBudget = 0.164;`; `const episodeResetRetrace = 0.594;`
- **Trades2 phenotype** `7-0a16adee03`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const episodeLossBudget = 0.08;`; `const episodeResetRetrace = 0.5;`
- **default (file Y 3%)** `7-b38f8d65bd`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const episodeLossBudget = 0.08;`; `const episodeResetRetrace = 0.5;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 48 | $135,693 | $137,351 | $100,177 | $34,750 | $43,269 | $110,311 | stable | — |
| pick 2 | 48 | $96,699 | $99,413 | $56,530 | $32,780 | $37,652 | $80,916 | stable | — |
| pick 3 | 46 | $90,939 | $103,603 | $66,948 | $21,183 | $31,989 | $78,646 | stable | — |
| pick 4 | 44 | $72,161 | $78,109 | $42,236 | $11,679 | $26,185 | $61,843 | stable | — |
| pick 5 | 43 | $88,254 | $91,385 | $61,423 | $19,362 | $21,143 | $62,419 | stable | — |
| pick 6 | 42 | $75,691 | $82,377 | $48,939 | $17,994 | $24,211 | $55,030 | stable | — |
| pick 7 | 43 | $35,661 | $37,191 | $27,914 | $9,100 | $10,711 | $30,496 | stable | — |
| pick 8 | 41 | $35,061 | $36,265 | $25,178 | $10,233 | $12,968 | $28,675 | stable | — |
| pick 9 | 37 | $23,539 | $25,006 | $17,947 | $8,317 | $13,734 | $17,947 | stable | — |
| pick 10 | 42 | $30,763 | $32,062 | $24,993 | $8,339 | $13,892 | $24,993 | stable | — |
