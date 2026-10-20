# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + depth-adjusted rebound (`depthRebound`)

Runnable source: `src/app/allIn-trailingBuy-depthRebound.ts`. Run it with `npm run app allIn-trailingBuy-depthRebound VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | slope | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `9-086530980f` | 24.0% | 0.5% | 14.1% | 8 | 77 | 0.0% | 17.0% | $138,952 | $34,750 | 8 | 5/2 | 43.3% | stable | −$2,862 | $47,665 | $136,090 | $47,665 | **no** |
| pick 2 (profit) | `9-0ffecbb27f` | 20.4% | 0.3% | 7.8% | 11 | 104 | 0.1% | 11.8% | $115,184 | $26,874 | 17 | 9/8 | 29.3% | stable | $42,236 | $13,459 | $157,420 | $26,874 | yes |
| pick 3 (profit) | `9-08dfb38c44` | 24.4% | 1.3% | 14.1% | 8 | 82 | 0.2% | 2.0% | $98,781 | $30,558 | 8 | 2/5 | 27.6% | stable | −$3,234 | $47,988 | $95,548 | $47,988 | **no** |
| pick 4 (balanced) | `9-d6b7d672ae` | 20.6% | 1.2% | 3.5% | 11 | 67 | 0.0% | 1.6% | $77,964 | $11,986 | 19 | 17/2 | 9.0% | stable | $15,641 | $13,341 | $93,605 | $18,140 | yes |
| pick 5 (balanced) | `9-7b4e76bd71` | 21.1% | 0.3% | 7.3% | 3 | 76 | 0.4% | 16.1% | $95,617 | $19,257 | 15 | 6/9 | 19.2% | stable | $37,898 | $15,224 | $133,514 | $23,271 | yes |
| pick 6 (balanced) | `9-b806d0e880` | 21.2% | 0.6% | 5.1% | 30 | 74 | 3.0% | 4.5% | $74,315 | $14,155 | 13 | 12/1 | 13.0% | stable | $33,315 | $9,620 | $107,629 | $14,419 | yes |
| pick 7 (low-DD) | `9-6c13c2e853` | 29.9% | 0.5% | 3.7% | 6 | 132 | 2.9% | 1.7% | $39,995 | $9,050 | 9 | 7/2 | 3.0% | stable | $5,988 | $7,596 | $45,983 | $9,050 | yes |
| pick 8 (low-DD) | `9-21f4fa01d8` | 22.1% | 0.2% | 3.5% | 30 | 78 | 0.1% | 45.4% | $37,018 | $9,427 | 12 | 11/1 | 4.6% | stable | $22,756 | $8,987 | $59,774 | $11,065 | yes |
| pick 9 (Pareto-diverse) | `9-3e03873b58` | 29.9% | 0.5% | 3.0% | 7 | 132 | 0.6% | 0.2% | $28,740 | $7,869 | 9 | 7/2 | 1.7% | stable | $6,781 | $7,596 | $35,521 | $7,869 | yes |
| pick 10 (Pareto-diverse) | `9-5a25a2159d` | 29.9% | 0.5% | 3.3% | 15 | 148 | 2.8% | 0.0% | $28,224 | $8,194 | 8 | 7/1 | 2.1% | stable | $6,451 | $7,596 | $34,675 | $8,194 | yes |
| Trades2 phenotype | `9-868864f8de` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 10.0% | $111,461 | $27,403 | 17 | 9/8 | 29.3% | — | $42,970 | $13,439 | $154,430 | $27,403 | yes |
| default (file Y 3%) | `9-41952ad31b` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 10.0% | $80,801 | $34,116 | 30 | 9/20 | 53.7% | — | $12,864 | $43,225 | $93,665 | $43,225 | **no** |


## How to set each phenotype in the source file

- **pick 1** `9-086530980f`: `targetPercentChangeOption ?? 0.24` (X 24.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 77;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const reboundDepthSlope = 0.17;`
- **pick 2** `9-0ffecbb27f`: `targetPercentChangeOption ?? 0.204` (X 20.4%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.001` (buffer 0.1%); `const reboundDepthSlope = 0.118;`
- **pick 3** `9-08dfb38c44`: `targetPercentChangeOption ?? 0.244` (X 24.4%); `trailingBuyPercentageOption ?? 0.013` (Y 1.3%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 82;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const reboundDepthSlope = 0.02;`
- **pick 4** `9-d6b7d672ae`: `targetPercentChangeOption ?? 0.206` (X 20.6%); `trailingBuyPercentageOption ?? 0.012` (Y 1.2%); `const trailingStopPercentage = 0.035;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 67;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const reboundDepthSlope = 0.016;`
- **pick 5** `9-7b4e76bd71`: `targetPercentChangeOption ?? 0.211` (X 21.1%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 76;`; `intradayLossBufferOption ?? 0.004` (buffer 0.4%); `const reboundDepthSlope = 0.161;`
- **pick 6** `9-b806d0e880`: `targetPercentChangeOption ?? 0.212` (X 21.2%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.051;`; `const maximumHoldDays = 30;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.03` (buffer 3.0%); `const reboundDepthSlope = 0.045;`
- **pick 7** `9-6c13c2e853`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 6;`; `const tickWindowSize = 132;`; `intradayLossBufferOption ?? 0.029` (buffer 2.9%); `const reboundDepthSlope = 0.017;`
- **pick 8** `9-21f4fa01d8`: `targetPercentChangeOption ?? 0.221` (X 22.1%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.035;`; `const maximumHoldDays = 30;`; `const tickWindowSize = 78;`; `intradayLossBufferOption ?? 0.001` (buffer 0.1%); `const reboundDepthSlope = 0.454;`
- **pick 9** `9-3e03873b58`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 7;`; `const tickWindowSize = 132;`; `intradayLossBufferOption ?? 0.006` (buffer 0.6%); `const reboundDepthSlope = 0.002;`
- **pick 10** `9-5a25a2159d`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.033;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 148;`; `intradayLossBufferOption ?? 0.028` (buffer 2.8%); `const reboundDepthSlope = 0;`
- **Trades2 phenotype** `9-868864f8de`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const reboundDepthSlope = 0.1;`
- **default (file Y 3%)** `9-41952ad31b`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const reboundDepthSlope = 0.1;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 38 | $133,126 | $138,188 | $99,965 | $34,911 | $43,170 | $111,869 | stable | — |
| pick 2 | 38 | $100,054 | $112,445 | $62,593 | $27,023 | $33,531 | $93,908 | stable | — |
| pick 3 | 40 | $97,316 | $98,610 | $71,646 | $30,729 | $44,367 | $71,646 | stable | — |
| pick 4 | 39 | $71,624 | $75,913 | $43,427 | $11,986 | $21,537 | $64,876 | stable | — |
| pick 5 | 36 | $89,338 | $94,821 | $68,324 | $19,654 | $29,113 | $68,324 | stable | — |
| pick 6 | 39 | $69,502 | $74,122 | $58,006 | $14,155 | $22,906 | $68,395 | stable | — |
| pick 7 | 37 | $36,133 | $37,753 | $24,471 | $9,050 | $10,711 | $26,485 | stable | — |
| pick 8 | 38 | $34,522 | $37,018 | $24,482 | $9,549 | $15,361 | $35,827 | stable | — |
| pick 9 | 34 | $25,512 | $28,075 | $19,039 | $8,276 | $13,734 | $20,354 | stable | — |
| pick 10 | 33 | $27,386 | $28,224 | $21,144 | $8,473 | $13,789 | $21,144 | stable | — |
