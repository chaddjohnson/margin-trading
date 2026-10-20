# Phenotypes: Trailing buy + buffered loss exit, no re-entry restriction + rebound persistence confirmation (`persistence`)

Runnable source: `src/app/allIn-trailingBuy-persistence.ts`. Run it with `npm run app allIn-trailingBuy-persistence VGT` (optionally `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`). To run a phenotype, edit the option defaults and constants in `runAllIn` as listed in the "How to set" column, then run the file; nothing else changes.

The ten picks were selected on the development window (2016-09-20 → 2023-12-29, in-sample) by the pre-declared rule (3 profit, 3 balanced, 2 low-DD, 2 Pareto-diverse; no behavioural clones; training minute drawdown ≤ $35,000). "Class" is the one-parameter neighbourhood robustness on development data (stable / moderate / fragile). The reused window (2024-01-02 → 2025-10-13) was previously inspected; "Combined" is the full continuous run, and a combined minute drawdown above $35,000 means **not accepted**.

| Contender | ID | X | Y | stop | hold | L | buffer | confirm | Dev net | Dev minute DD | Dev trades | Dev W/L | Dev exposure | Class | Reused net | Reused minute DD | Combined net | Combined minute DD | Within $35k |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 (profit) | `15-fc36d49ee7` | 23.8% | 0.1% | 14.1% | 8 | 89 | 1.3% | 7 | $143,335 | $34,380 | 9 | 5/3 | 44.6% | stable | −$4,092 | $48,380 | $139,243 | $48,380 | **no** |
| pick 2 (profit) | `15-a7ad5dfc13` | 20.4% | 0.6% | 7.8% | 11 | 100 | 0.0% | 4 | $114,798 | $27,430 | 17 | 10/7 | 29.3% | stable | $43,287 | $13,436 | $158,085 | $27,430 | yes |
| pick 3 (profit) | `15-2a1cc6709a` | 24.4% | 0.1% | 14.1% | 8 | 82 | 0.2% | 7 | $106,314 | $30,030 | 8 | 3/4 | 27.6% | stable | −$2,973 | $48,380 | $103,342 | $48,380 | **no** |
| pick 4 (balanced) | `15-7b758f836d` | 21.5% | 0.1% | 4.9% | 19 | 74 | 1.1% | 7 | $84,463 | $10,640 | 15 | 13/2 | 12.9% | stable | $32,870 | $9,956 | $117,333 | $14,720 | yes |
| pick 5 (balanced) | `15-80599bd5e8` | 21.6% | 0.1% | 7.3% | 5 | 77 | 2.6% | 5 | $89,932 | $17,964 | 13 | 9/4 | 19.1% | stable | $39,672 | $9,653 | $129,604 | $17,964 | yes |
| pick 6 (balanced) | `15-8ac3a4fe04` | 20.2% | 0.7% | 4.4% | 11 | 74 | 0.2% | 3 | $74,193 | $12,942 | 20 | 15/5 | 12.1% | stable | $14,574 | $13,401 | $88,767 | $17,777 | yes |
| pick 7 (low-DD) | `15-d25d5e7e8f` | 23.6% | 0.1% | 4.0% | 5 | 75 | 1.3% | 7 | $47,112 | $10,382 | 12 | 9/3 | 3.7% | stable | $16,649 | $8,880 | $63,761 | $13,260 | yes |
| pick 8 (low-DD) | `15-1fec51801b` | 22.4% | 0.1% | 3.8% | 8 | 68 | 1.0% | 7 | $46,553 | $10,382 | 14 | 12/2 | 4.6% | stable | $21,206 | $8,880 | $67,759 | $12,712 | yes |
| pick 9 (Pareto-diverse) | `15-1ca68bf561` | 23.8% | 0.1% | 4.2% | 12 | 81 | 0.1% | 7 | $52,514 | $10,382 | 12 | 11/1 | 4.6% | stable | $23,398 | $8,880 | $75,912 | $13,487 | yes |
| pick 10 (Pareto-diverse) | `15-053f876b84` | 24.3% | 0.1% | 5.0% | 8 | 82 | 1.0% | 7 | $47,596 | $10,382 | 12 | 10/2 | 5.0% | stable | $37,073 | $8,880 | $84,669 | $14,405 | yes |
| Trades2 phenotype | `15-483deefe6e` | 20.0% | 0.5% | 7.8% | 11 | 104 | 0.2% | 3 | $108,075 | $27,170 | 17 | 9/8 | 29.3% | — | $42,214 | $13,444 | $150,289 | $27,170 | yes |
| default (file Y 3%) | `15-229b2aa933` | 10.0% | 3.0% | 8.0% | 15 | 90 | 0.5% | 3 | $72,811 | $34,508 | 33 | 11/21 | 55.2% | — | $28,069 | $41,788 | $100,880 | $41,788 | **no** |


## How to set each phenotype in the source file

- **pick 1** `15-fc36d49ee7`: `targetPercentChangeOption ?? 0.238` (X 23.8%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 89;`; `intradayLossBufferOption ?? 0.013` (buffer 1.3%); `const confirmMinutes = 7;`
- **pick 2** `15-a7ad5dfc13`: `targetPercentChangeOption ?? 0.204` (X 20.4%); `trailingBuyPercentageOption ?? 0.006` (Y 0.6%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 100;`; `intradayLossBufferOption ?? 0` (buffer 0.0%); `const confirmMinutes = 4;`
- **pick 3** `15-2a1cc6709a`: `targetPercentChangeOption ?? 0.244` (X 24.4%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.141;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 82;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const confirmMinutes = 7;`
- **pick 4** `15-7b758f836d`: `targetPercentChangeOption ?? 0.215` (X 21.5%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.049;`; `const maximumHoldDays = 19;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.011` (buffer 1.1%); `const confirmMinutes = 7;`
- **pick 5** `15-80599bd5e8`: `targetPercentChangeOption ?? 0.216` (X 21.6%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.073;`; `const maximumHoldDays = 5;`; `const tickWindowSize = 77;`; `intradayLossBufferOption ?? 0.026` (buffer 2.6%); `const confirmMinutes = 5;`
- **pick 6** `15-8ac3a4fe04`: `targetPercentChangeOption ?? 0.202` (X 20.2%); `trailingBuyPercentageOption ?? 0.007` (Y 0.7%); `const trailingStopPercentage = 0.044;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 74;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const confirmMinutes = 3;`
- **pick 7** `15-d25d5e7e8f`: `targetPercentChangeOption ?? 0.236` (X 23.6%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.04;`; `const maximumHoldDays = 5;`; `const tickWindowSize = 75;`; `intradayLossBufferOption ?? 0.013` (buffer 1.3%); `const confirmMinutes = 7;`
- **pick 8** `15-1fec51801b`: `targetPercentChangeOption ?? 0.224` (X 22.4%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.038;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 68;`; `intradayLossBufferOption ?? 0.01` (buffer 1.0%); `const confirmMinutes = 7;`
- **pick 9** `15-1ca68bf561`: `targetPercentChangeOption ?? 0.238` (X 23.8%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.042;`; `const maximumHoldDays = 12;`; `const tickWindowSize = 81;`; `intradayLossBufferOption ?? 0.001` (buffer 0.1%); `const confirmMinutes = 7;`
- **pick 10** `15-053f876b84`: `targetPercentChangeOption ?? 0.243` (X 24.3%); `trailingBuyPercentageOption ?? 0.001` (Y 0.1%); `const trailingStopPercentage = 0.05;`; `const maximumHoldDays = 8;`; `const tickWindowSize = 82;`; `intradayLossBufferOption ?? 0.01` (buffer 1.0%); `const confirmMinutes = 7;`
- **Trades2 phenotype** `15-483deefe6e`: `targetPercentChangeOption ?? 0.2` (X 20.0%); `trailingBuyPercentageOption ?? 0.005` (Y 0.5%); `const trailingStopPercentage = 0.078;`; `const maximumHoldDays = 11;`; `const tickWindowSize = 104;`; `intradayLossBufferOption ?? 0.002` (buffer 0.2%); `const confirmMinutes = 3;`
- **default (file Y 3%)** `15-229b2aa933`: `targetPercentChangeOption ?? 0.1` (X 10.0%); `trailingBuyPercentageOption ?? 0.03` (Y 3.0%); `const trailingStopPercentage = 0.08;`; `const maximumHoldDays = 15;`; `const tickWindowSize = 90;`; `intradayLossBufferOption ?? 0.005` (buffer 0.5%); `const confirmMinutes = 3;`

## Neighbourhood robustness of the picks (development data)

| Pick | Probes | Robust net (25th pct) | Median net | Minimum net | Robust minute DD (75th pct) | Maximum minute DD | Worst one-step net | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 | 39 | $135,794 | $139,746 | $116,044 | $34,673 | $47,211 | $116,044 | stable | — |
| pick 2 | 38 | $99,993 | $112,494 | $65,057 | $27,834 | $32,629 | $93,648 | stable | — |
| pick 3 | 37 | $99,519 | $105,258 | $78,849 | $30,118 | $44,036 | $78,849 | stable | — |
| pick 4 | 39 | $77,410 | $83,495 | $56,104 | $12,729 | $25,134 | $80,852 | stable | — |
| pick 5 | 37 | $84,253 | $87,808 | $62,180 | $18,516 | $20,679 | $65,063 | stable | — |
| pick 6 | 38 | $68,092 | $71,835 | $33,135 | $14,023 | $23,887 | $60,244 | stable | — |
| pick 7 | 38 | $43,847 | $47,112 | $27,629 | $10,382 | $15,337 | $43,682 | stable | — |
| pick 8 | 39 | $42,594 | $45,064 | $32,940 | $10,434 | $15,337 | $42,689 | stable | — |
| pick 9 | 37 | $46,506 | $51,214 | $35,364 | $10,447 | $13,797 | $47,617 | stable | — |
| pick 10 | 39 | $43,035 | $47,033 | $28,178 | $10,452 | $16,272 | $33,889 | stable | — |
