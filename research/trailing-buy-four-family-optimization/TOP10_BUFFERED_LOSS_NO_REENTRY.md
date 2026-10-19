# Top 10 phenotypes — family 4: Trailing buy + buffered loss exit, no re-entry restriction

Source: `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` (unmodified). Free parameters: 6 (X, Y, stop, hold, L, buffer); absent parameters are **N/A**. File default Y = 3%.

Picked by the pre-declared rule (PROTOCOL.md §8) on the **final development fit, 2016-09-20 → 2023-12-29 (in-sample)**, frozen before the holdout. `stop` fills, 11% margin, $100,000 per entry, no costs. Drawdowns are of the $100,000 strategy P&L, not account equity.

**Summary.** In-sample development net of the picks was $35,099–$124,919, against the default's $76,480 (Y 3%,
minute DD $33,781). That default was the strongest of the four in development and walk-forward. In the frozen
holdout every pick was positive: median $20,553, best rank 2 at $42,164, worst rank 9 at $2,534. 3/10 beat
the default's $28,932 and 0/10 beat `allIn.ts`'s $48,432.


## A. Identity and parameters

| Rank | ID | Category | Unique phenotype (clone-group size) | X | Y | stop | hold | L | mat | lower | reset | buffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `4-a49f4cf75b` | profit | yes (1) | 11.4% | 0.8% | 9.8% | 18 | 58 | N/A | N/A | N/A | 0.8% |
| 2 | `4-81aca36069` | profit | yes (2) | 20.0% | 0.5% | 7.8% | 11 | 104 | N/A | N/A | N/A | 0.2% |
| 3 | `4-4782c72630` | profit | yes (2) | 11.2% | 0.5% | 7.8% | 8 | 46 | N/A | N/A | N/A | 1.8% |
| 4 | `4-8d385daec9` | balanced | yes (95) | 20.0% | 1.2% | 4.7% | 11 | 71 | N/A | N/A | N/A | 0.8% |
| 5 | `4-53d7248c4d` | balanced | yes (2) | 20.0% | 0.7% | 4.1% | 11 | 106 | N/A | N/A | N/A | 0.0% |
| 6 | `4-5133452ac9` | balanced | yes (2) | 17.8% | 0.6% | 7.3% | 11 | 49 | N/A | N/A | N/A | 0.8% |
| 7 | `4-0ee741b8b1` | low-DD | yes (1) | 20.0% | 0.9% | 4.0% | 5 | 65 | N/A | N/A | N/A | 0.5% |
| 8 | `4-f4fa61f367` | low-DD | yes (1) | 19.1% | 0.6% | 4.0% | 5 | 71 | N/A | N/A | N/A | 0.4% |
| 9 | `4-63f813566f` | Pareto-diverse | yes (1) | 18.7% | 0.8% | 4.0% | 5 | 48 | N/A | N/A | N/A | 0.9% |
| 10 | `4-2edbb840c2` | Pareto-diverse | yes (1) | 19.9% | 0.6% | 4.0% | 5 | 53 | N/A | N/A | N/A | 0.2% |
| base | `4-daabce77f9` | default (file Y 3%) | — | 10.0% | 3.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | 0.5% |
| base | `4-61341a2c22` | default at Y 4% | — | 10.0% | 4.0% | 8.0% | 15 | 90 | N/A | N/A | N/A | 0.5% |

## B. Development fit (in-sample, 2016-09-20 → 2023-12-29)

| Rank | Net after interest | Minute DD | Daily DD | Interest | Trades | W / L | Avg hold (d) | Max hold (d) | Time in market | Worst trade | Best-trade share | Δ net vs own default | Δ net vs allIn.ts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $124,919 | $41,579 | $38,265 | $61,088 | 25 | 10 / 14 | 81.1 | 320.0 | 76.4% | −$21,250 | 44% | +$48,439 | +$5,727 |
| 2 | $112,050 | $27,408 | $23,010 | $23,356 | 16 | 9 / 7 | 48.4 | 224.0 | 29.4% | −$9,460 | 45% | +$35,570 | −$7,143 |
| 3 | $114,565 | $32,144 | $30,883 | $44,753 | 38 | 14 / 23 | 39.1 | 218.0 | 56.1% | −$11,399 | 44% | +$38,085 | −$4,628 |
| 4 | $74,539 | $13,871 | $10,135 | $10,940 | 17 | 15 / 2 | 21.4 | 126.0 | 13.7% | −$147 | 31% | −$1,941 | −$44,654 |
| 5 | $73,495 | $14,371 | $13,530 | $9,945 | 22 | 17 / 5 | 15.0 | 64.0 | 12.6% | −$4,541 | 20% | −$2,985 | −$45,698 |
| 6 | $94,659 | $24,510 | $20,371 | $17,238 | 15 | 9 / 6 | 38.1 | 155.0 | 21.9% | −$9,460 | 54% | +$18,179 | −$24,533 |
| 7 | $39,030 | $12,216 | $10,371 | $7,233 | 23 | 13 / 10 | 10.4 | 63.0 | 9.0% | −$4,680 | 35% | −$37,450 | −$80,163 |
| 8 | $61,713 | $10,710 | $10,163 | $7,805 | 27 | 16 / 11 | 9.6 | 63.0 | 9.8% | −$5,394 | 22% | −$14,767 | −$57,480 |
| 9 | $35,099 | $12,027 | $10,102 | $5,184 | 22 | 15 / 7 | 7.8 | 17.0 | 6.4% | −$4,680 | 30% | −$41,381 | −$84,094 |
| 10 | $43,059 | $10,710 | $10,102 | $4,701 | 20 | 13 / 7 | 7.8 | 20.0 | 5.9% | −$4,166 | 29% | −$33,421 | −$76,134 |
| base | $76,480 | $33,781 | $32,607 | $44,121 | 33 | 12 / 20 | 44.4 | 215.0 | 55.2% | −$13,452 | 62% | $0 | −$42,713 |
| base | $67,729 | $36,003 | $32,962 | $42,403 | 30 | 10 / 19 | 46.9 | 218.0 | 53.2% | −$18,499 | 65% | −$8,751 | −$51,464 |

allIn.ts on the same dates and conventions: net $119,193, minute DD $26,287, daily DD $23,826, 27 trades.

## C. Out-of-sample: frozen holdout 2024-01-02 → 2025-10-13 (evaluated once) and combined

| Rank | Holdout net | Holdout minute DD | Holdout daily DD | Holdout interest | Holdout trades | Δ vs own default | Δ vs allIn.ts | Flat-start holdout net | Combined 2016-09-20 → 2025-10-13 net | Combined minute DD | Walk-forward evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $31,503 | $34,784 | $31,338 | $16,214 | 5 | +$2,570 | −$16,929 | $34,868 | $156,422 | $41,579 | n/a (not a fold pick) |
| 2 | $42,164 | $13,449 | $8,741 | $5,786 | 2 | +$13,232 | −$6,268 | $42,164 | $154,213 | $27,408 | n/a (not a fold pick) |
| 3 | $24,582 | $38,700 | $37,889 | $15,430 | 8 | −$4,350 | −$23,849 | $25,257 | $139,147 | $38,700 | n/a (not a fold pick) |
| 4 | $27,448 | $13,341 | $9,484 | $3,586 | 2 | −$1,485 | −$20,984 | $27,448 | $101,986 | $18,756 | n/a (not a fold pick) |
| 5 | $14,558 | $13,414 | $8,981 | $1,477 | 2 | −$14,374 | −$33,874 | $14,558 | $88,053 | $18,298 | n/a (not a fold pick) |
| 6 | $39,717 | $24,053 | $20,655 | $6,721 | 3 | +$10,785 | −$8,714 | $39,717 | $134,377 | $24,510 | n/a (not a fold pick) |
| 7 | $14,761 | $13,380 | $7,502 | $1,386 | 5 | −$14,171 | −$33,670 | $14,761 | $53,791 | $17,904 | n/a (not a fold pick) |
| 8 | $14,934 | $13,439 | $7,090 | $1,386 | 5 | −$13,999 | −$33,498 | $14,934 | $76,646 | $17,517 | n/a (not a fold pick) |
| 9 | $2,534 | $15,392 | $13,789 | $1,477 | 5 | −$26,398 | −$45,898 | $2,534 | $37,632 | $15,972 | n/a (not a fold pick) |
| 10 | $16,524 | $13,439 | $7,090 | $1,386 | 5 | −$12,408 | −$31,908 | $16,524 | $59,582 | $17,517 | n/a (not a fold pick) |
| base | $28,932 | $41,384 | $36,464 | $18,805 | 8 | $0 | −$19,499 | $29,909 | $105,412 | $41,384 | — |
| base | $17,706 | $40,270 | $38,868 | $17,811 | 8 | −$11,226 | −$30,726 | $18,705 | $85,435 | $40,270 | — |

allIn.ts on the same dates: holdout net $48,432, minute DD $32,084, 6 trades; combined net $167,624.

"Combined" is one continuous run over development and holdout; most of it is in-sample for these picks and it is **not** an out-of-sample figure. A final-fit pick has a walk-forward figure only if exactly the same vector was also picked on a fold's own training data.

## D. Robustness and notes

| Rank | Classification | Robust net (Q25 of probes) | Median probe net | Robust minute DD (Q75) | Worst ±1-step net | Probe clones | next-open dev net | next-open holdout net | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | stable | $109,240 | $117,682 | $41,946 | $101,077 | 9% | $124,819 | $31,190 | — |
| 2 | stable | $97,176 | $107,832 | $27,820 | $90,853 | 11% | $111,795 | $42,164 | — |
| 3 | stable | $94,978 | $109,802 | $36,095 | $70,946 | 0% | $114,559 | $24,737 | — |
| 4 | stable | $68,057 | $73,187 | $13,871 | $66,850 | 36% | $73,975 | $27,353 | — |
| 5 | stable | $67,984 | $71,103 | $17,151 | $63,674 | 0% | $73,843 | $14,558 | — |
| 6 | moderate | $73,964 | $83,822 | $25,076 | $70,776 | 0% | $95,684 | $39,717 | best trade = 54% of development net |
| 7 | stable | $36,605 | $38,539 | $12,464 | $36,730 | 4% | $39,187 | $14,761 | — |
| 8 | stable | $55,383 | $58,235 | $12,500 | $51,484 | 11% | $61,988 | $14,934 | — |
| 9 | stable | $29,065 | $34,247 | $12,573 | $32,343 | 19% | $35,256 | $2,534 | — |
| 10 | stable | $35,398 | $39,890 | $12,626 | $34,121 | 4% | $43,190 | $16,524 | — |

Full rows, including every probe and every per-year figure, are in `results/shortlist.csv`, `results/shortlist.json` and ROBUSTNESS.md.
