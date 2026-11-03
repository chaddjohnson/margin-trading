# Phenotypes: Trailing buy, no re-entry restriction + rebound persistence confirmation (`persistenceUnbuffered`)

Runnable source: `(no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical)`. Run it with `npm run app (no dedicated file: the unbuffered base has no mechanism file; use the buffered file with buffer 0.0% as the nearest runnable form, which is not identical) VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | confirm | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `16-223625fe92` | 23.9% | 0.1% | 14.1% | 8 | 83 | 7 | $144,264 | $34,347 | 8 | 4/3 | 43.9% | stable | $44,268 | $48,380 | $188,533 | $48,380 | **no** |
| pick 2 (profit) | `16-1d12635209` | 24.0% | 0.1% | 12.3% | 8 | 83 | 7 | $104,694 | $32,207 | 8 | 5/3 | 29.2% | stable | $47,108 | $10,928 | $151,802 | $32,207 | yes |
| pick 3 (profit) | `16-257aac001b` | 20.2% | 0.1% | 7.8% | 11 | 103 | 4 | $106,311 | $27,065 | 16 | 10/6 | 29.4% | stable | $42,155 | $13,448 | $148,466 | $27,065 | yes |
| pick 4 (balanced) | `16-9356f2ef6a` | 21.5% | 0.1% | 4.9% | 38 | 73 | 7 | $84,463 | $10,640 | 15 | 13/2 | 12.9% | stable | $32,870 | $9,956 | $117,333 | $14,720 | yes |
| pick 5 (balanced) | `16-a6622b5c61` | 21.6% | 0.1% | 7.3% | 5 | 78 | 5 | $89,932 | $17,964 | 13 | 9/4 | 19.1% | stable | $39,672 | $9,653 | $129,604 | $17,964 | yes |
| pick 6 (balanced) | `16-69096f72a4` | 20.6% | 0.1% | 4.5% | 35 | 76 | 7 | $72,073 | $12,666 | 16 | 14/2 | 12.3% | stable | $13,204 | $13,439 | $85,277 | $17,565 | yes |
| pick 7 (low-DD) | `16-c292c84202` | 29.9% | 0.1% | 3.7% | 3 | 153 | 8 | $41,712 | $7,972 | 9 | 7/2 | 3.2% | stable | $5,113 | $7,533 | $46,825 | $7,972 | yes |
| pick 8 (low-DD) | `16-5aaedb77d1` | 29.9% | 0.1% | 4.7% | 8 | 152 | 8 | $40,972 | $9,659 | 9 | 7/2 | 4.4% | stable | $4,043 | $7,533 | $45,016 | $9,659 | yes |
| pick 9 (Pareto-diverse) | `16-0468b7cfad` | 21.5% | 0.1% | 14.4% | 8 | 72 | 9 | $97,606 | $31,748 | 10 | 3/6 | 30.2% | stable | $44,193 | $46,930 | $141,800 | $46,930 | **no** |
| pick 10 (Pareto-diverse) | `16-2575efddb1` | 20.5% | 0.5% | 7.3% | 11 | 103 | 4 | $98,669 | $26,767 | 16 | 11/5 | 23.6% | stable | $43,312 | $13,439 | $141,981 | $26,767 | yes |
| Trades2 phenotype | `16-bda1858497` | 20.0% | 0.5% | 7.8% | 11 | 104 | 3 | $109,158 | $27,170 | 16 | 10/6 | 29.4% | — | $42,214 | $13,444 | $151,372 | $27,170 | yes |
| default (file Y 3%) | `16-287be71520` | 10.0% | 3.0% | 8.0% | 15 | 90 | 3 | $53,936 | $42,616 | 32 | 9/22 | 49.1% | — | $26,703 | $43,154 | $80,639 | $43,154 | **no** |


## How to set each phenotype in the source file

- **pick 1** `16-223625fe92`: `targetPercentChangeOption ?? 0.239` (X 23.9%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 83;`; `const confirmMinutes = 7;`
- **pick 2** `16-1d12635209`: `targetPercentChangeOption ?? 0.24` (X 24.0%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.123;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 83;`; `const confirmMinutes = 7;`
- **pick 3** `16-257aac001b`: `targetPercentChangeOption ?? 0.202` (X 20.2%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 103;`; `const confirmMinutes = 4;`
- **pick 4** `16-9356f2ef6a`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.049;`; `const maximumHoldDays = 38;`; `const tickWindowSize = 73;`; `const confirmMinutes = 7;`
- **pick 5** `16-a6622b5c61`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 5;`; `const tickWindowSize = 78;`; `const confirmMinutes = 5;`
- **pick 6** `16-69096f72a4`: `targetPercentChangeOption ?? 0.206` (X 20.6%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.045;`; `const maximumHoldDays = 35;`; `const tickWindowSize = 76;`; `const confirmMinutes = 7;`
- **pick 7** `16-c292c84202`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.037;`; `const maximumHoldDays = 3;`; `const tickWindowSize = 153;`; `const confirmMinutes = 8;`
- **pick 8** `16-5aaedb77d1`: `targetPercentChangeOption ?? 0.299` (X 29.9%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.047;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 152;`; `const confirmMinutes = 8;`
- **pick 9** `16-0468b7cfad`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.144;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 72;`; `const confirmMinutes = 9;`
- **pick 10** `16-2575efddb1`: `targetPercentChangeOption ?? 0.205` (X 20.5%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 103;`; `const confirmMinutes = 4;`
- **Trades2 phenotype** `16-bda1858497`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `const confirmMinutes = 3;`
- **default (file Y 3%)** `16-287be71520`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `const confirmMinutes = 3;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 33 | $130,653 | $141,110 | $108,001 | $34,591 | $44,580 | $116,974 | stable | — |
| pick 2 | 33 | $97,117 | $102,461 | $67,106 | $32,407 | $37,060 | $79,571 | stable | — |
| pick 3 | 32 | $95,004 | $103,533 | $85,009 | $27,430 | $32,910 | $85,009 | stable | — |
| pick 4 | 32 | $76,128 | $82,492 | $47,725 | $13,017 | $25,134 | $70,567 | stable | — |
| pick 5 | 32 | $83,676 | $87,998 | $63,470 | $18,597 | $20,679 | $65,063 | stable | — |
| pick 6 | 33 | $66,727 | $70,872 | $49,174 | $12,905 | $26,231 | $69,133 | stable | — |
| pick 7 | 28 | $35,785 | $39,252 | $32,298 | $8,478 | $10,814 | $34,285 | stable | — |
| pick 8 | 31 | $36,834 | $40,164 | $25,455 | $9,856 | $13,808 | $25,455 | stable | — |
| pick 9 | 33 | $87,644 | $95,776 | $52,257 | $35,221 | $46,313 | $52,257 | stable | — |
| pick 10 | 34 | $84,559 | $93,651 | $51,648 | $27,172 | $31,967 | $73,998 | stable | — |
