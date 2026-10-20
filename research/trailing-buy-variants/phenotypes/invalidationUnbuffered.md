# Phenotypes: Trailing buy, no re-entry restriction + failed-recovery invalidation exit (`invalidationUnbuffered`)

Runnable source: `(no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical)`. Run it with `npm run app (no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | inv | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `6-866fc7cb8e` | 23.7% | 0.1% | 14.1% | 3 | 68 | 1.3% | $137,349 | $34,281 | 9 | 3/5 | 44.1% | stable | −$15,040 | $53,860 | $122,308 | $53,860 | **no** |
| pick 2 (profit) | `6-8f79cfcf75` | 23.7% | 0.1% | 12.7% | 3 | 71 | 1.4% | $96,779 | $32,086 | 9 | 4/5 | 29.5% | stable | −$12,192 | $14,474 | $84,587 | $32,086 | yes |
| pick 3 (profit) | `6-bc77bb6269` | 21.2% | 0.1% | 7.3% | 3 | 72 | 1.3% | $98,494 | $19,657 | 18 | 8/10 | 19.1% | stable | $30,784 | $18,543 | $129,278 | $26,757 | yes |
| pick 4 (balanced) | `6-8835892a82` | 20.4% | 1.8% | 3.3% | 9 | 73 | 5.0% | $71,411 | $11,679 | 20 | 18/2 | 8.3% | stable | $12,006 | $17,250 | $83,417 | $21,139 | yes |
| pick 5 (balanced) | `6-360eec343d` | 24.5% | 0.1% | 7.3% | 3 | 64 | 1.4% | $71,625 | $14,344 | 8 | 4/4 | 10.1% | stable | $38,573 | $13,567 | $110,198 | $20,692 | yes |
| pick 6 (balanced) | `6-3e189ee947` | 21.5% | 0.9% | 4.8% | 31 | 77 | 5.7% | $75,069 | $13,871 | 14 | 14/0 | 12.9% | stable | $24,436 | $15,515 | $99,505 | $20,924 | yes |
| pick 7 (low-DD) | `6-83252515ec` | 29.9% | 0.5% | 3.7% | 29 | 179 | 5.6% | $37,468 | $9,050 | 9 | 8/1 | 3.6% | stable | $5,988 | $7,596 | $43,456 | $9,050 | yes |
| pick 8 (low-DD) | `6-3666e51d6d` | 29.9% | 0.4% | 4.7% | 3 | 148 | 4.3% | $36,672 | $9,786 | 9 | 7/2 | 4.4% | stable | $4,909 | $7,596 | $41,581 | $9,786 | yes |
| pick 9 (Pareto-diverse) | `6-2e7d80e702` | 20.0% | 0.4% | 7.8% | 11 | 102 | 1.9% | $85,931 | $32,195 | 22 | 9/13 | 29.0% | stable | $44,533 | $11,449 | $130,464 | $32,195 | yes |
| pick 10 (Pareto-diverse) | `6-2c1b0c3959` | 23.9% | 1.4% | 7.3% | 3 | 76 | 5.7% | $81,070 | $19,357 | 8 | 5/3 | 15.3% | stable | $45,689 | $11,957 | $126,759 | $19,357 | yes |
| Trades2 phenotype | `6-b20430d136` | 20.0% | 0.5% | 7.8% | 11 | 104 | 2.0% | $74,977 | $33,701 | 22 | 8/14 | 29.0% | — | $45,760 | $11,527 | $120,736 | $33,701 | yes |
| default (file Y 3%) | `6-7ba69767d8` | 10.0% | 3.0% | 8.0% | 15 | 90 | 2.0% | $35,568 | $51,386 | 39 | 12/26 | 48.0% | — | $32,727 | $31,910 | $68,295 | $51,386 | **no** |


## How to set each phenotype in the source file

- **pick 1** `6-866fc7cb8e`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 68;`; `const invalidationBuffer = 0.013;`
- **pick 2** `6-8f79cfcf75`: `targetPercentChangeOption ?? 0.237` (X 23.7%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.127;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 71;`; `const invalidationBuffer = 0.014;`
- **pick 3** `6-bc77bb6269`: `targetPercentChangeOption ?? 0.212` (X 21.2%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 72;`; `const invalidationBuffer = 0.013;`
- **pick 4** `6-8835892a82`: `targetPercentChangeOption ?? 0.204` (X 20.4%); `trailingBuyPercentageOption ?? 0.018` (Y 1.8%); `const trailingStopPercentage = 0.033;`; `const maximumHoldDays = 9;`; `const tickWindowSize = 73;`; `const invalidationBuffer = 0.05;`
- **pick 5** `6-360eec343d`: `targetPercentChangeOption ?? 0.245` (X 24.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 64;`; `const invalidationBuffer = 0.014;`
- **pick 6** `6-3e189ee947`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.009` (Y 0.9%); `const trailingStopPercentage = 0.048;`; `const maximumHoldDays = 31;`; `const tickWindowSize = 77;`; `const invalidationBuffer = 0.057;`
- **pick 7** `6-83252515ec`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 29;`; `const tickWindowSize = 179;`; `const invalidationBuffer = 0.056;`
- **pick 8** `6-3666e51d6d`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.047;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 148;`; `const invalidationBuffer = 0.043;`
- **pick 9** `6-2e7d80e702`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.004` (Y 0.4%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 102;`; `const invalidationBuffer = 0.019;`
- **pick 10** `6-2c1b0c3959`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.014` (Y 1.4%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 76;`; `const invalidationBuffer = 0.057;`
- **Trades2 phenotype** `6-b20430d136`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const invalidationBuffer = 0.02;`
- **default (file Y 3%)** `6-7ba69767d8`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const invalidationBuffer = 0.02;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 30 | $127,336 | $136,914 | $80,508 | $34,750 | $42,923 | $110,127 | stable | — |
| pick 2 | 30 | $93,905 | $96,351 | $79,908 | $32,393 | $37,636 | $95,818 | stable | — |
| pick 3 | 30 | $87,201 | $92,410 | $58,307 | $20,273 | $32,525 | $68,325 | stable | — |
| pick 4 | 35 | $66,439 | $71,411 | $44,382 | $11,679 | $23,125 | $69,252 | stable | — |
| pick 5 | 30 | $69,247 | $71,131 | $45,519 | $14,475 | $21,604 | $45,519 | stable | — |
| pick 6 | 35 | $66,113 | $73,308 | $42,012 | $14,370 | $24,422 | $70,079 | stable | — |
| pick 7 | 29 | $35,698 | $36,415 | $28,197 | $9,217 | $10,711 | $30,852 | stable | — |
| pick 8 | 30 | $33,845 | $36,672 | $17,203 | $10,085 | $11,257 | $28,961 | stable | — |
| pick 9 | 35 | $79,177 | $84,220 | $64,667 | $32,652 | $34,724 | $64,667 | stable | — |
| pick 10 | 32 | $76,971 | $81,070 | $52,093 | $19,553 | $21,674 | $52,093 | stable | — |
