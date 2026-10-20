# Phenotypes: Trailing buy, no re-entry restriction + correction-episode loss budget (`episodeBudgetUnbuffered`)

Runnable source: `(no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical)`. Run it with `npm run app (no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | budget | epReset | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `8-0aa6d2ff51` | 24.0% | 0.8% | 14.1% | 8 | 76 | 18.0% | 52.2% | $137,351 | $34,750 | 8 | 4/3 | 43.3% | stable | $44,971 | $47,608 | $182,322 | $47,608 | **no** |
| pick 2 (profit) | `8-050d8bcdc1` | 24.3% | 0.8% | 12.2% | 8 | 76 | 18.0% | 67.7% | $99,413 | $32,780 | 8 | 5/3 | 28.5% | stable | $47,843 | $10,979 | $147,255 | $32,780 | yes |
| pick 3 (profit) | `8-34f7da79d5` | 21.6% | 0.3% | 7.3% | 8 | 68 | 16.3% | 63.5% | $104,810 | $21,183 | 11 | 9/2 | 19.2% | stable | $45,821 | $10,047 | $150,630 | $21,183 | yes |
| pick 4 (balanced) | `8-1bfc42e862` | 20.6% | 1.8% | 3.0% | 9 | 78 | 17.5% | 36.2% | $78,334 | $11,679 | 22 | 19/3 | 7.9% | stable | $14,361 | $8,533 | $92,695 | $11,679 | yes |
| pick 5 (balanced) | `8-22f1bbc6fd` | 21.6% | 0.6% | 7.3% | 8 | 75 | 16.8% | 62.3% | $81,080 | $17,994 | 11 | 7/4 | 14.4% | stable | $44,695 | $10,534 | $125,775 | $17,994 | yes |
| pick 6 (balanced) | `8-54c4f8f56f` | 23.9% | 1.4% | 7.3% | 6 | 74 | 10.5% | 32.8% | $78,820 | $19,357 | 10 | 5/5 | 15.2% | stable | $51,065 | $9,046 | $129,886 | $19,357 | yes |
| pick 7 (low-DD) | `8-6add4a5755` | 23.5% | 0.6% | 4.1% | 11 | 61 | 18.3% | 24.4% | $43,040 | $10,710 | 10 | 10/0 | 3.9% | stable | $24,387 | $8,922 | $67,427 | $12,909 | yes |
| pick 8 (low-DD) | `8-b1b92a3ec8` | 24.4% | 0.6% | 4.0% | 11 | 78 | 15.0% | 68.9% | $37,367 | $10,710 | 9 | 9/0 | 2.9% | stable | $24,432 | $8,922 | $61,799 | $12,798 | yes |
| pick 9 (Pareto-diverse) | `8-6e5b0b2a98` | 20.6% | 0.2% | 7.9% | 9 | 95 | 18.9% | 53.7% | $102,120 | $29,714 | 16 | 10/6 | 29.5% | stable | $42,695 | $13,459 | $144,814 | $29,714 | yes |
| pick 10 (Pareto-diverse) | `8-815f2b3508` | 24.8% | 0.6% | 4.1% | 38 | 69 | 17.5% | 28.6% | $34,654 | $10,710 | 8 | 8/0 | 2.9% | stable | $24,891 | $8,945 | $59,545 | $12,467 | yes |
| Trades2 phenotype | `8-d646c9a8b0` | 20.0% | 0.5% | 7.8% | 11 | 104 | 8.0% | 50.0% | $50,239 | $30,950 | 14 | 8/6 | 23.1% | — | $42,164 | $13,449 | $92,403 | $30,950 | yes |
| default (file Y 3%) | `8-0223a3da6d` | 10.0% | 3.0% | 8.0% | 15 | 90 | 8.0% | 50.0% | $6,497 | $42,482 | 23 | 7/15 | 31.4% | — | $13,215 | $42,750 | $19,712 | $42,750 | **no** |


## How to set each phenotype in the source file

- **pick 1** `8-0aa6d2ff51`: `targetPercentChangeOption ?? 0.24` (X 24.0%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 76;`; `const episodeLossBudget = 0.18;`; `const episodeResetRetrace = 0.522;`
- **pick 2** `8-050d8bcdc1`: `targetPercentChangeOption ?? 0.243` (X 24.3%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.122;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 76;`; `const episodeLossBudget = 0.18;`; `const episodeResetRetrace = 0.677;`
- **pick 3** `8-34f7da79d5`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 68;`; `const episodeLossBudget = 0.163;`; `const episodeResetRetrace = 0.635;`
- **pick 4** `8-1bfc42e862`: `targetPercentChangeOption ?? 0.206` (X 20.6%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 9;`; `const tickWindowSize = 78;`; `const episodeLossBudget = 0.175;`; `const episodeResetRetrace = 0.362;`
- **pick 5** `8-22f1bbc6fd`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 75;`; `const episodeLossBudget = 0.168;`; `const episodeResetRetrace = 0.623;`
- **pick 6** `8-54c4f8f56f`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.014` (Y 1.4%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 6;`; `const tickWindowSize = 74;`; `const episodeLossBudget = 0.105;`; `const episodeResetRetrace = 0.328;`
- **pick 7** `8-6add4a5755`: `targetPercentChangeOption ?? 0.235` (X 23.5%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.041;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 61;`; `const episodeLossBudget = 0.183;`; `const episodeResetRetrace = 0.244;`
- **pick 8** `8-b1b92a3ec8`: `targetPercentChangeOption ?? 0.244` (X 24.4%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.04;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 78;`; `const episodeLossBudget = 0.15;`; `const episodeResetRetrace = 0.689;`
- **pick 9** `8-6e5b0b2a98`: `targetPercentChangeOption ?? 0.206` (X 20.6%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.079;`; `const maximumHoldDays = 9;`; `const tickWindowSize = 95;`; `const episodeLossBudget = 0.189;`; `const episodeResetRetrace = 0.537;`
- **pick 10** `8-815f2b3508`: `targetPercentChangeOption ?? 0.248` (X 24.8%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.041;`; `const maximumHoldDays = 38;`; `const tickWindowSize = 69;`; `const episodeLossBudget = 0.175;`; `const episodeResetRetrace = 0.286;`
- **Trades2 phenotype** `8-d646c9a8b0`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const episodeLossBudget = 0.08;`; `const episodeResetRetrace = 0.5;`
- **default (file Y 3%)** `8-0223a3da6d`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const episodeLossBudget = 0.08;`; `const episodeResetRetrace = 0.5;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 42 | $134,440 | $137,151 | $99,144 | $34,750 | $43,269 | $110,311 | stable | — |
| pick 2 | 42 | $94,754 | $99,213 | $60,269 | $32,780 | $37,652 | $60,269 | stable | — |
| pick 3 | 40 | $93,915 | $103,603 | $76,151 | $21,183 | $26,930 | $79,852 | stable | — |
| pick 4 | 39 | $70,700 | $77,691 | $55,346 | $11,679 | $20,483 | $67,741 | stable | — |
| pick 5 | 42 | $75,535 | $81,080 | $56,094 | $17,994 | $22,582 | $56,094 | stable | — |
| pick 6 | 42 | $78,820 | $78,820 | $53,614 | $19,523 | $23,247 | $53,614 | stable | — |
| pick 7 | 42 | $40,365 | $43,040 | $29,825 | $10,710 | $16,873 | $34,500 | stable | — |
| pick 8 | 42 | $35,838 | $37,367 | $29,486 | $10,710 | $16,766 | $31,911 | stable | — |
| pick 9 | 40 | $91,710 | $102,120 | $55,894 | $29,714 | $33,032 | $72,063 | stable | — |
| pick 10 | 41 | $34,626 | $34,654 | $24,058 | $10,710 | $16,873 | $26,332 | stable | — |
