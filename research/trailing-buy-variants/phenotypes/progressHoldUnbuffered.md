# Phenotypes: Trailing buy, no re-entry restriction + progress-based hold extension (`progressHoldUnbuffered`)

Runnable source: `(no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical)`. Run it with `npm run app (no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | progress | extend | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `14-eec176d8b2` | 24.2% | 0.8% | 14.1% | 8 | 77 | 9.4% | 25 | $137,351 | $34,750 | 8 | 4/3 | 43.3% | stable | $44,971 | $47,608 | $182,322 | $47,608 | **no** |
| pick 2 (profit) | `14-de36bf2f0f` | 20.7% | 0.9% | 8.2% | 11 | 111 | 8.6% | 33 | $103,830 | $27,885 | 15 | 9/6 | 29.5% | stable | $42,391 | $13,380 | $146,221 | $27,885 | yes |
| pick 3 (profit) | `14-7363155db2` | 24.4% | 1.4% | 14.1% | 8 | 82 | 9.1% | 19 | $98,638 | $30,404 | 8 | 2/5 | 27.7% | stable | $47,421 | $45,937 | $146,059 | $45,937 | **no** |
| pick 4 (balanced) | `14-1147ae6344` | 21.6% | 0.3% | 7.3% | 8 | 68 | 7.9% | 24 | $104,810 | $21,183 | 11 | 9/2 | 19.2% | stable | $45,821 | $10,047 | $150,630 | $21,183 | yes |
| pick 5 (balanced) | `14-003c7f66c6` | 24.3% | 0.8% | 7.8% | 8 | 86 | 9.2% | 36 | $91,173 | $20,987 | 10 | 6/4 | 15.6% | stable | $49,909 | $8,922 | $141,082 | $20,987 | yes |
| pick 6 (balanced) | `14-dade6277da` | 21.5% | 0.8% | 4.9% | 17 | 74 | 7.3% | 14 | $78,563 | $13,912 | 14 | 14/0 | 12.9% | stable | $33,707 | $9,470 | $112,270 | $14,260 | yes |
| pick 7 (low-DD) | `14-ec93d0420e` | 29.9% | 0.4% | 3.7% | 3 | 132 | 4.2% | 25 | $40,119 | $8,883 | 9 | 7/2 | 3.0% | stable | $5,988 | $7,596 | $46,107 | $8,883 | yes |
| pick 8 (low-DD) | `14-800a88a7e0` | 29.8% | 0.4% | 4.7% | 8 | 150 | 7.6% | 43 | $37,721 | $10,679 | 9 | 8/1 | 4.4% | stable | $4,909 | $7,596 | $42,630 | $10,679 | yes |
| pick 9 (Pareto-diverse) | `14-04aa868ddb` | 29.9% | 0.5% | 3.0% | 6 | 167 | 9.7% | 12 | $28,137 | $7,869 | 9 | 7/2 | 2.0% | stable | $6,781 | $7,596 | $34,918 | $7,869 | yes |
| pick 10 (Pareto-diverse) | `14-4fbb3d51fb` | 24.1% | 0.8% | 12.6% | 8 | 74 | 9.1% | 29 | $97,538 | $32,780 | 8 | 5/3 | 28.7% | stable | $47,843 | $10,979 | $145,381 | $32,780 | yes |
| Trades2 phenotype | `14-d92a38d56c` | 20.0% | 0.5% | 7.8% | 11 | 104 | 3.0% | 10 | $84,830 | $30,669 | 14 | 7/7 | 29.4% | — | $41,002 | $13,449 | $125,832 | $30,669 | yes |
| default (file Y 3%) | `14-bad423c056` | 10.0% | 3.0% | 8.0% | 15 | 90 | 3.0% | 10 | $52,753 | $42,243 | 27 | 11/15 | 51.9% | — | $25,414 | $44,902 | $78,167 | $44,902 | **no** |


## How to set each phenotype in the source file

- **pick 1** `14-eec176d8b2`: `targetPercentChangeOption ?? 0.242` (X 24.2%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 77;`; `const progressThreshold = 0.094;`; `const holdExtensionDays = 25;`
- **pick 2** `14-de36bf2f0f`: `targetPercentChangeOption ?? 0.207` (X 20.7%); `trailingBuyPercentageOption ?? 0.009` (Y 0.9%); `const trailingStopPercentage = 0.082;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 111;`; `const progressThreshold = 0.086;`; `const holdExtensionDays = 33;`
- **pick 3** `14-7363155db2`: `targetPercentChangeOption ?? 0.244` (X 24.4%); `trailingBuyPercentageOption ?? 0.014` (Y 1.4%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 82;`; `const progressThreshold = 0.091;`; `const holdExtensionDays = 19;`
- **pick 4** `14-1147ae6344`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 68;`; `const progressThreshold = 0.079;`; `const holdExtensionDays = 24;`
- **pick 5** `14-003c7f66c6`: `targetPercentChangeOption ?? 0.243` (X 24.3%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 86;`; `const progressThreshold = 0.092;`; `const holdExtensionDays = 36;`
- **pick 6** `14-dade6277da`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.049;`; `const maximumHoldDays = 17;`; `const tickWindowSize = 74;`; `const progressThreshold = 0.073;`; `const holdExtensionDays = 14;`
- **pick 7** `14-ec93d0420e`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 132;`; `const progressThreshold = 0.042;`; `const holdExtensionDays = 25;`
- **pick 8** `14-800a88a7e0`: `targetPercentChangeOption ?? 0.298` (X 29.8%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.047;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 150;`; `const progressThreshold = 0.076;`; `const holdExtensionDays = 43;`
- **pick 9** `14-04aa868ddb`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 6;`; `const tickWindowSize = 167;`; `const progressThreshold = 0.097;`; `const holdExtensionDays = 12;`
- **pick 10** `14-4fbb3d51fb`: `targetPercentChangeOption ?? 0.241` (X 24.1%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.126;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 74;`; `const progressThreshold = 0.091;`; `const holdExtensionDays = 29;`
- **Trades2 phenotype** `14-d92a38d56c`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const progressThreshold = 0.03;`; `const holdExtensionDays = 10;`
- **default (file Y 3%)** `14-bad423c056`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const progressThreshold = 0.03;`; `const holdExtensionDays = 10;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 42 | $132,644 | $137,054 | $99,144 | $34,750 | $43,269 | $110,311 | stable | — |
| pick 2 | 42 | $95,951 | $101,816 | $42,525 | $27,939 | $33,070 | $74,294 | stable | — |
| pick 3 | 42 | $95,028 | $98,638 | $71,570 | $30,404 | $44,213 | $71,570 | stable | — |
| pick 4 | 40 | $93,915 | $103,603 | $76,151 | $21,183 | $26,930 | $79,852 | stable | — |
| pick 5 | 42 | $87,242 | $91,173 | $68,360 | $21,059 | $25,859 | $68,360 | stable | — |
| pick 6 | 42 | $72,137 | $77,884 | $44,917 | $13,912 | $24,765 | $71,925 | stable | — |
| pick 7 | 36 | $36,200 | $37,619 | $24,558 | $8,899 | $10,711 | $26,454 | stable | — |
| pick 8 | 38 | $36,246 | $37,721 | $28,279 | $10,679 | $13,871 | $30,007 | stable | — |
| pick 9 | 35 | $26,391 | $28,137 | $17,947 | $8,235 | $13,734 | $17,947 | stable | — |
| pick 10 | 42 | $94,553 | $97,538 | $58,394 | $32,780 | $37,652 | $82,226 | stable | — |
