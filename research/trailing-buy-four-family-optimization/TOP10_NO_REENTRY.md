# Top 10 phenotypes — family 3: Trailing buy, no re-entry restriction

Source: `src/app/allIn-trailingBuy-noReentry.ts` (unmodified). Free parameters: 5 (X, Y, stop, hold, L); absent parameters are **N/A**. File default Y = 3%.

Picked by the pre-declared rule (PROTOCOL.md §8) on the **final development fit, 2016-09-20 → 2023-12-29 (in-sample)**, frozen before the holdout. `stop` fills, 11% margin, $100,000 per entry, no costs. Drawdowns are of the $100,000 strategy P&L, not account equity.

**Summary.** In-sample development net of the picks was $37,141–$118,416, against the default's $58,107 (Y 3%,
minute DD $40,846). In the frozen holdout every pick was positive: median $21,986, best rank 2 at $42,781, worst
rank 4 at $14,675. 3/10 beat the default's $27,566 and 0/10 beat `allIn.ts`'s $48,432. In the walk-forward,
this family's fold picks lost the most in 2022 (WALK_FORWARD.md): with no re-entry restriction, low-Y
re-entries kept buying the decline.


## A. Identity and parameters

| Rank | ID | Category | Unique phenotype (clone-group size) | X | Y | stop | hold | L | mat | lower | reset | buffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `3-01c6e7516c` | profit | yes (1) | 11.4% | 0.8% | 9.8% | 6 | 64 | N/A | N/A | N/A | N/A |
| 2 | `3-5856a6037b` | profit | yes (7) | 20.0% | 0.7% | 7.8% | 11 | 101 | N/A | N/A | N/A | N/A |
| 3 | `3-b56c62e561` | profit | yes (1) | 11.4% | 0.5% | 7.8% | 8 | 52 | N/A | N/A | N/A | N/A |
| 4 | `3-f3cbcfd2e7` | balanced | yes (11) | 11.7% | 0.8% | 5.1% | 7 | 160 | N/A | N/A | N/A | N/A |
| 5 | `3-afad112d68` | balanced | yes (5) | 20.0% | 1.2% | 4.7% | 10 | 99 | N/A | N/A | N/A | N/A |
| 6 | `3-3769488b6b` | balanced | yes (1) | 17.8% | 0.6% | 7.3% | 11 | 50 | N/A | N/A | N/A | N/A |
| 7 | `3-f08a3e0eb6` | low-DD | yes (1) | 19.1% | 0.6% | 4.0% | 5 | 68 | N/A | N/A | N/A | N/A |
| 8 | `3-5c50607453` | low-DD | yes (1) | 19.0% | 0.6% | 4.1% | 5 | 55 | N/A | N/A | N/A | N/A |
| 9 | `3-a591d5163c` | Pareto-diverse | yes (1) | 12.3% | 0.7% | 7.9% | 14 | 63 | N/A | N/A | N/A | N/A |
| 10 | `3-e7eb402b22` | Pareto-diverse | yes (1) | 20.0% | 0.6% | 4.1% | 10 | 45 | N/A | N/A | N/A | N/A |
| base | `3-a273c304e5` | default (file Y 3%) | — | 10.0% | 3.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | N/A |
| base | `3-3410e80353` | default at Y 4% | — | 10.0% | 4.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | N/A |

## B. Development fit (in-sample, 2016-09-20 → 2023-12-29)

| Rank | Net after interest | Minute DD | Daily DD | Interest | Trades | W / L | Avg hold (d) | Max hold (d) | Time in market | Worst trade | Best-trade share | Δ net vs own default | Δ net vs allIn.ts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $114,049 | $37,516 | $34,911 | $60,485 | 44 | 13 / 30 | 45.6 | 320.0 | 75.1% | −$12,835 | 44% | +$55,942 | −$5,143 |
| 2 | $108,239 | $27,403 | $23,005 | $23,326 | 16 | 10 / 6 | 48.4 | 224.0 | 29.4% | −$9,460 | 46% | +$50,132 | −$10,953 |
| 3 | $118,416 | $30,810 | $30,639 | $44,934 | 37 | 16 / 20 | 40.3 | 218.0 | 56.4% | −$11,399 | 42% | +$60,309 | −$777 |
| 4 | $111,888 | $23,354 | $21,520 | $30,710 | 54 | 26 / 27 | 18.9 | 143.0 | 38.6% | −$8,435 | 20% | +$53,781 | −$7,305 |
| 5 | $80,119 | $15,978 | $13,648 | $12,989 | 19 | 15 / 4 | 22.7 | 126.0 | 16.3% | −$4,358 | 29% | +$22,011 | −$39,074 |
| 6 | $92,431 | $24,510 | $20,371 | $17,208 | 15 | 10 / 5 | 38.1 | 155.0 | 21.9% | −$9,460 | 55% | +$34,324 | −$26,762 |
| 7 | $57,597 | $10,710 | $10,163 | $7,745 | 26 | 16 / 10 | 9.9 | 63.0 | 9.7% | −$5,394 | 24% | −$510 | −$61,596 |
| 8 | $40,564 | $10,814 | $10,273 | $5,244 | 23 | 14 / 9 | 7.6 | 17.0 | 6.6% | −$5,394 | 31% | −$17,543 | −$78,629 |
| 9 | $96,034 | $39,415 | $35,509 | $35,110 | 26 | 10 / 15 | 44.8 | 224.0 | 43.6% | −$15,348 | 52% | +$37,927 | −$23,159 |
| 10 | $37,141 | $10,710 | $9,268 | $3,526 | 13 | 12 / 1 | 9.0 | 23.0 | 4.7% | −$1,642 | 33% | −$20,967 | −$82,052 |
| base | $58,107 | $40,846 | $40,502 | $39,479 | 32 | 10 / 21 | 40.9 | 215.0 | 49.1% | −$13,452 | 82% | $0 | −$61,085 |
| base | $57,688 | $37,593 | $36,770 | $37,762 | 29 | 9 / 19 | 43.2 | 218.0 | 47.3% | −$18,499 | 76% | −$419 | −$61,505 |

allIn.ts on the same dates and conventions: net $119,193, minute DD $26,287, daily DD $23,826, 27 trades.

## C. Out-of-sample: frozen holdout 2024-01-02 → 2025-10-13 (evaluated once) and combined

| Rank | Holdout net | Holdout minute DD | Holdout daily DD | Holdout interest | Holdout trades | Δ vs own default | Δ vs allIn.ts | Flat-start holdout net | Combined 2016-09-20 → 2025-10-13 net | Combined minute DD | Walk-forward evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $19,390 | $44,302 | $42,014 | $16,244 | 8 | −$8,177 | −$29,042 | $22,755 | $133,439 | $44,302 | n/a (not a fold pick) |
| 2 | $42,781 | $13,414 | $8,981 | $5,786 | 2 | +$15,215 | −$5,650 | $42,781 | $151,021 | $27,403 | n/a (not a fold pick) |
| 3 | $24,582 | $38,700 | $37,889 | $15,430 | 8 | −$2,984 | −$23,849 | $25,257 | $142,998 | $38,700 | n/a (not a fold pick) |
| 4 | $14,675 | $36,486 | $33,563 | $9,373 | 9 | −$12,892 | −$33,757 | $20,345 | $126,563 | $36,486 | n/a (not a fold pick) |
| 5 | $27,448 | $13,341 | $9,484 | $3,586 | 2 | −$119 | −$20,984 | $27,448 | $107,566 | $19,056 | n/a (not a fold pick) |
| 6 | $39,717 | $24,053 | $20,655 | $6,721 | 3 | +$12,151 | −$8,714 | $39,717 | $132,148 | $24,510 | n/a (not a fold pick) |
| 7 | $14,934 | $13,439 | $7,090 | $1,386 | 5 | −$12,633 | −$33,498 | $14,934 | $72,531 | $17,517 | n/a (not a fold pick) |
| 8 | $16,209 | $13,439 | $7,090 | $1,386 | 5 | −$11,357 | −$32,222 | $16,209 | $56,773 | $17,517 | n/a (not a fold pick) |
| 9 | $39,810 | $31,791 | $26,607 | $11,030 | 5 | +$12,243 | −$8,622 | $40,664 | $135,843 | $39,415 | n/a (not a fold pick) |
| 10 | $14,910 | $13,439 | $8,809 | $1,477 | 2 | −$12,657 | −$33,522 | $14,910 | $52,050 | $16,850 | n/a (not a fold pick) |
| base | $27,566 | $42,750 | $37,830 | $18,836 | 8 | $0 | −$20,865 | $28,544 | $85,674 | $42,750 | — |
| base | $17,706 | $40,270 | $38,868 | $17,811 | 8 | −$9,860 | −$30,726 | $18,705 | $75,394 | $40,270 | — |

allIn.ts on the same dates: holdout net $48,432, minute DD $32,084, 6 trades; combined net $167,624.

"Combined" is one continuous run over development and holdout; most of it is in-sample for these picks and it is **not** an out-of-sample figure. A final-fit pick has a walk-forward figure only if exactly the same vector was also picked on a fold's own training data.

## D. Robustness and notes

| Rank | Classification | Robust net (Q25 of probes) | Median probe net | Robust minute DD (Q75) | Worst ±1-step net | Probe clones | next-open dev net | next-open holdout net | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | stable | $96,589 | $108,814 | $39,264 | $86,110 | 4% | $113,954 | $19,079 | — |
| 2 | stable | $93,944 | $103,959 | $27,504 | $87,051 | 16% | $107,985 | $42,781 | — |
| 3 | moderate | $92,004 | $106,149 | $33,190 | $76,536 | 12% | $118,318 | $24,737 | — |
| 4 | moderate | $87,145 | $100,889 | $29,765 | $84,164 | 21% | $111,252 | $14,613 | — |
| 5 | stable | $67,384 | $75,408 | $20,109 | $62,956 | 15% | $79,592 | $27,353 | — |
| 6 | moderate | $72,339 | $82,467 | $25,259 | $61,730 | 0% | $93,455 | $39,717 | best trade = 55% of development net |
| 7 | stable | $46,204 | $52,773 | $12,905 | $46,693 | 14% | $57,787 | $14,934 | — |
| 8 | moderate | $28,432 | $38,139 | $13,171 | $28,648 | 9% | $40,808 | $16,327 | — |
| 9 | stable | $85,543 | $91,360 | $39,673 | $85,543 | 4% | $95,738 | $39,810 | best trade = 52% of development net |
| 10 | stable | $30,801 | $35,368 | $13,456 | $28,292 | 10% | $37,516 | $14,910 | — |

Full rows, including every probe and every per-year figure, are in `results/shortlist.csv`, `results/shortlist.json` and ROBUSTNESS.md.
