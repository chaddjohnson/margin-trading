# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + progress-based hold extension (`progressHold`)

Runnable source: `src/app/allIn-trailingBuy-progressHold.ts`. Run it with `npm run app allIn-trailingBuy-progressHold VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | progress | extend | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `13-85f96e81d6` | 23.9% | 0.8% | 14.1% | 8 | 86 | 0.0% | 10.0% | 40 | $137,365 | $34,745 | 10 | 5/4 | 44.5% | stable | −$2,867 | $47,608 | $134,497 | $47,608 | **no** |
| pick 2 (profit) | `13-08fab9fee5` | 20.2% | 0.3% | 7.8% | 11 | 99 | 0.0% | 7.9% | 11 | $112,538 | $26,820 | 17 | 10/7 | 29.3% | stable | $42,383 | $13,459 | $154,921 | $26,820 | yes |
| pick 3 (profit) | `13-ed4c569ae3` | 24.4% | 0.9% | 14.1% | 8 | 88 | 0.0% | 10.0% | 40 | $99,675 | $31,875 | 9 | 3/5 | 28.4% | stable | −$2,776 | $47,839 | $96,899 | $47,839 | **no** |
| pick 4 (balanced) | `13-99b70555b5` | 20.3% | 1.8% | 3.0% | 13 | 72 | 0.6% | 9.0% | 23 | $77,691 | $11,679 | 21 | 18/3 | 7.8% | stable | $14,361 | $8,533 | $92,052 | $11,679 | yes |
| pick 5 (balanced) | `13-666e610ee8` | 21.1% | 0.8% | 5.0% | 11 | 76 | 0.0% | 9.6% | 18 | $71,260 | $13,912 | 16 | 14/2 | 12.9% | stable | $33,320 | $9,703 | $104,580 | $14,309 | yes |
| pick 6 (balanced) | `13-80fc448dba` | 21.1% | 0.3% | 7.3% | 8 | 72 | 2.1% | 7.9% | 9 | $103,603 | $21,183 | 12 | 9/3 | 19.4% | stable | $40,260 | $12,074 | $143,863 | $21,183 | yes |
| pick 7 (low-DD) | `13-9b026992a4` | 23.9% | 0.6% | 3.7% | 36 | 78 | 0.2% | 9.6% | 23 | $42,897 | $10,710 | 10 | 10/0 | 3.2% | stable | $24,432 | $8,922 | $67,329 | $12,454 | yes |
| pick 8 (low-DD) | `13-bdfbb071eb` | 29.3% | 0.6% | 4.7% | 12 | 154 | 1.9% | 5.3% | 17 | $46,423 | $10,710 | 10 | 9/1 | 5.6% | stable | $4,909 | $7,596 | $51,332 | $10,710 | yes |
| pick 9 (Pareto-diverse) | `13-308211542e` | 29.1% | 4.7% | 3.0% | 26 | 157 | 0.0% | 8.5% | 41 | $24,981 | $8,579 | 9 | 8/1 | 2.4% | stable | $3,000 | $7,327 | $27,981 | $8,579 | yes |
| pick 10 (Pareto-diverse) | `13-5f14c98e42` | 23.6% | 0.2% | 12.5% | 8 | 75 | 1.3% | 9.6% | 9 | $99,586 | $33,920 | 8 | 4/4 | 29.5% | stable | −$1,228 | $9,894 | $98,358 | $33,920 | yes |
| Trades2 phenotype | `13-dd75266ef6` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 3.0% | 10 | $84,830 | $30,669 | 14 | 7/7 | 29.4% | — | $41,002 | $13,449 | $125,832 | $30,669 | yes |
| default (file Y 3%) | `13-3944ad24b4` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 3.0% | 10 | $60,871 | $42,243 | 28 | 12/15 | 58.0% | — | $25,414 | $44,902 | $86,286 | $44,902 | **no** |


## How to set each phenotype in the source file

- **pick 1** `13-85f96e81d6`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 86;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const progressThreshold = 0.1;`; `const holdExtensionDays = 40;`
- **pick 2** `13-08fab9fee5`: `targetPercentChangeOption ?? 0.202` (X 20.2%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 99;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const progressThreshold = 0.079;`; `const holdExtensionDays = 11;`
- **pick 3** `13-ed4c569ae3`: `targetPercentChangeOption ?? 0.244` (X 24.4%); `trailingBuyPercentageOption ?? 0.009` (Y 0.9%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 88;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const progressThreshold = 0.1;`; `const holdExtensionDays = 40;`
- **pick 4** `13-99b70555b5`: `targetPercentChangeOption ?? 0.203` (X 20.3%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 13;`; `const tickWindowSize = 72;`; `intradayLossBufferOption ?? 0.006` (buffer 0.6%); `const progressThreshold = 0.09;`; `const holdExtensionDays = 23;`
- **pick 5** `13-666e610ee8`: `targetPercentChangeOption ?? 0.211` (X 21.1%); `trailingBuyPercentageOption ?? 0.008` (Y 0.8%); `const trailingStopPercentage = 0.05;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 76;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const progressThreshold = 0.096;`; `const holdExtensionDays = 18;`
- **pick 6** `13-80fc448dba`: `targetPercentChangeOption ?? 0.211` (X 21.1%); `trailingBuyPercentageOption ?? 0.003` (Y 0.3%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 72;`; `intradayLossBufferOption ?? 0.021` (buffer 2.1%); `const progressThreshold = 0.079;`; `const holdExtensionDays = 9;`
- **pick 7** `13-9b026992a4`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 36;`; `const tickWindowSize = 78;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const progressThreshold = 0.096;`; `const holdExtensionDays = 23;`
- **pick 8** `13-bdfbb071eb`: `targetPercentChangeOption ?? 0.293` (X 29.3%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.047;`; `const maximumHoldDays = 12;`; `const tickWindowSize = 154;`; `intradayLossBufferOption ?? 0.019` (buffer 1.9%); `const progressThreshold = 0.053;`; `const holdExtensionDays = 17;`
- **pick 9** `13-308211542e`: `targetPercentChangeOption ?? 0.291` (X 29.1%); `trailingBuyPercentageOption ?? 0.047` (Y 4.7%); `const trailingStopPercentage = 0.03;`; `const maximumHoldDays = 26;`; `const tickWindowSize = 157;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const progressThreshold = 0.085;`; `const holdExtensionDays = 41;`
- **pick 10** `13-5f14c98e42`: `targetPercentChangeOption ?? 0.236` (X 23.6%); `trailingBuyPercentageOption ?? 0.002` (Y 0.2%); `const trailingStopPercentage = 0.125;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 75;`; `intradayLossBufferOption ?? 0.013` (buffer 1.3%); `const progressThreshold = 0.096;`; `const holdExtensionDays = 9;`
- **Trades2 phenotype** `13-dd75266ef6`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const progressThreshold = 0.03;`; `const holdExtensionDays = 10;`
- **default (file Y 3%)** `13-3944ad24b4`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const progressThreshold = 0.03;`; `const holdExtensionDays = 10;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 42 | $131,880 | $137,100 | $86,153 | $34,747 | $45,502 | $110,324 | stable | — |
| pick 2 | 43 | $99,634 | $112,190 | $67,619 | $26,913 | $32,807 | $91,353 | stable | — |
| pick 3 | 42 | $98,427 | $99,553 | $72,460 | $32,137 | $45,567 | $72,460 | stable | — |
| pick 4 | 45 | $75,382 | $77,691 | $44,127 | $11,679 | $22,164 | $69,445 | stable | — |
| pick 5 | 44 | $66,200 | $71,260 | $48,896 | $13,912 | $23,021 | $48,896 | stable | — |
| pick 6 | 46 | $86,756 | $103,603 | $67,179 | $21,183 | $31,989 | $78,646 | stable | — |
| pick 7 | 45 | $42,897 | $42,897 | $29,863 | $10,710 | $16,446 | $41,245 | stable | — |
| pick 8 | 48 | $42,742 | $46,423 | $35,690 | $10,710 | $13,871 | $38,345 | stable | — |
| pick 9 | 42 | $23,682 | $24,981 | $12,623 | $8,579 | $13,638 | $17,301 | stable | — |
| pick 10 | 45 | $97,870 | $99,586 | $79,342 | $33,920 | $39,667 | $83,489 | stable | — |
