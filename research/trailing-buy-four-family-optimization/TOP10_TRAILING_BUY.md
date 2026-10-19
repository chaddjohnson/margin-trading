# Top 10 phenotypes — family 1: Trailing buy (restricted re-entry)

Source: `src/app/allIn-trailingBuy.ts` (unmodified). Free parameters: 8 (X, Y, stop, hold, L, mat, lower, reset); absent parameters are **N/A**. File default Y = 4%.

Picked by the pre-declared rule (PROTOCOL.md §8) on the **final development fit, 2016-09-20 → 2023-12-29 (in-sample)**, frozen before the holdout. `stop` fills, 11% margin, $100,000 per entry, no costs. Drawdowns are of the $100,000 strategy P&L, not account equity.

**Summary.** In-sample development net of the picks was $61,646–$155,504, against the default's $52,892 (Y 4%,
minute DD $50,277). In the frozen holdout the picks' median was −$5,627, with 4/10 positive and 0/10 above the
default's $43,163 or `allIn.ts`'s $48,432. The best holdout pick (rank 2, $41,501) made 99% of it on one trade.
The worst (rank 10, −$34,366) had a development net of $135,286. All 10 picks use Y = 0.5%–1.4%.


## A. Identity and parameters

| Rank | ID | Category | Unique phenotype (clone-group size) | X | Y | stop | hold | L | mat | lower | reset | buffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `1-417da6b3de` | profit | yes (3) | 11.4% | 0.6% | 9.8% | 8 | 60 | 1.4% | 5.4% | 68.0% | N/A |
| 2 | `1-3a57558dcd` | profit | yes (1) | 11.6% | 0.6% | 7.8% | 13 | 60 | 1.5% | 5.9% | 60.8% | N/A |
| 3 | `1-6c793a656e` | profit | yes (1) | 11.3% | 0.6% | 10.0% | 6 | 62 | 1.4% | 5.9% | 65.6% | N/A |
| 4 | `1-75f7ace2a7` | balanced | yes (4) | 7.1% | 0.5% | 4.5% | 11 | 63 | 1.7% | 5.3% | 65.5% | N/A |
| 5 | `1-bf41eae7fb` | balanced | yes (1) | 7.0% | 0.6% | 4.1% | 11 | 58 | 0.7% | 5.3% | 66.6% | N/A |
| 6 | `1-af159a63f3` | balanced | yes (1) | 7.1% | 1.3% | 4.5% | 11 | 63 | 1.7% | 5.3% | 65.5% | N/A |
| 7 | `1-5d5ba8155b` | low-DD | yes (1) | 18.9% | 0.6% | 4.0% | 9 | 58 | 1.5% | 5.5% | 69.1% | N/A |
| 8 | `1-77a7561333` | low-DD | yes (81) | 19.3% | 0.6% | 4.1% | 9 | 67 | 1.6% | 5.6% | 56.8% | N/A |
| 9 | `1-0d0d1498c2` | Pareto-diverse | yes (2) | 19.4% | 0.6% | 4.1% | 9 | 104 | 1.5% | 5.3% | 52.3% | N/A |
| 10 | `1-bf9654320c` | Pareto-diverse | yes (2) | 7.0% | 1.4% | 5.2% | 11 | 70 | 2.8% | 5.0% | 68.8% | N/A |
| base | `1-ea7ddf46c0` | default (file Y 4%) | — | 10.0% | 4.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | N/A |
| base | `1-58c2a4ea73` | default at Y 3% | — | 10.0% | 3.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | N/A |

## B. Development fit (in-sample, 2016-09-20 → 2023-12-29)

| Rank | Net after interest | Minute DD | Daily DD | Interest | Trades | W / L | Avg hold (d) | Max hold (d) | Time in market | Worst trade | Best-trade share | Δ net vs own default | Δ net vs allIn.ts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $155,504 | $31,388 | $30,007 | $57,170 | 27 | 12 / 14 | 70.3 | 320.0 | 71.4% | −$11,399 | 39% | +$102,611 | +$36,311 |
| 2 | $135,751 | $29,281 | $26,381 | $37,490 | 27 | 12 / 14 | 46.1 | 215.0 | 46.5% | −$7,116 | 37% | +$82,859 | +$16,559 |
| 3 | $120,799 | $30,389 | $29,078 | $43,819 | 27 | 9 / 17 | 53.9 | 321.0 | 54.6% | −$12,835 | 53% | +$67,907 | +$1,606 |
| 4 | $123,202 | $19,094 | $18,232 | $40,685 | 55 | 31 / 23 | 24.5 | 132.0 | 50.5% | −$7,610 | 20% | +$70,309 | +$4,009 |
| 5 | $125,144 | $20,265 | $17,889 | $34,537 | 50 | 32 / 17 | 22.9 | 116.0 | 43.3% | −$8,219 | 15% | +$72,252 | +$5,952 |
| 6 | $123,057 | $20,159 | $17,787 | $38,063 | 53 | 32 / 20 | 23.8 | 132.0 | 47.3% | −$8,155 | 19% | +$70,165 | +$3,865 |
| 7 | $61,646 | $12,494 | $11,805 | $6,449 | 17 | 14 / 3 | 12.6 | 64.0 | 8.5% | −$4,541 | 25% | +$8,754 | −$57,547 |
| 8 | $68,086 | $10,710 | $9,268 | $7,022 | 17 | 13 / 4 | 13.7 | 64.0 | 8.8% | −$3,080 | 22% | +$15,193 | −$51,107 |
| 9 | $71,841 | $13,313 | $11,914 | $9,282 | 20 | 14 / 6 | 15.4 | 64.0 | 11.4% | −$4,541 | 21% | +$18,949 | −$47,351 |
| 10 | $135,286 | $29,191 | $28,276 | $48,942 | 55 | 29 / 25 | 29.5 | 144.0 | 60.8% | −$13,199 | 16% | +$82,394 | +$16,094 |
| base | $52,892 | $50,277 | $47,016 | $35,079 | 27 | 8 / 18 | 43.1 | 218.0 | 43.7% | −$18,499 | 83% | $0 | −$66,300 |
| base | $23,662 | $44,659 | $41,317 | $28,690 | 28 | 8 / 19 | 34.0 | 155.0 | 35.9% | −$13,452 | 201% | −$29,230 | −$95,530 |

allIn.ts on the same dates and conventions: net $119,193, minute DD $26,287, daily DD $23,826, 27 trades.

## C. Out-of-sample: frozen holdout 2024-01-02 → 2025-10-13 (evaluated once) and combined

| Rank | Holdout net | Holdout minute DD | Holdout daily DD | Holdout interest | Holdout trades | Δ vs own default | Δ vs allIn.ts | Flat-start holdout net | Combined 2016-09-20 → 2025-10-13 net | Combined minute DD | Walk-forward evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | −$6,741 | $31,672 | $27,939 | $9,433 | 4 | −$49,904 | −$55,173 | −$3,376 | $148,762 | $31,672 | n/a (not a fold pick) |
| 2 | $41,501 | $28,733 | $25,107 | $15,159 | 5 | −$1,662 | −$6,930 | $42,174 | $177,252 | $29,281 | n/a (not a fold pick) |
| 3 | −$22,835 | $33,711 | $32,145 | $3,978 | 3 | −$65,998 | −$71,267 | −$19,205 | $97,964 | $33,711 | n/a (not a fold pick) |
| 4 | −$4,512 | $37,549 | $33,395 | $5,123 | 11 | −$47,675 | −$52,944 | $163 | $118,690 | $37,549 | n/a (not a fold pick) |
| 5 | −$9,438 | $38,521 | $34,746 | $4,219 | 10 | −$52,601 | −$57,870 | −$4,986 | $115,706 | $39,511 | n/a (not a fold pick) |
| 6 | −$30,236 | $44,735 | $40,885 | $3,858 | 8 | −$73,399 | −$78,667 | −$25,592 | $92,822 | $44,735 | n/a (not a fold pick) |
| 7 | $16,125 | $13,439 | $8,809 | $1,447 | 3 | −$27,037 | −$32,306 | $16,125 | $77,771 | $17,517 | n/a (not a fold pick) |
| 8 | $14,910 | $13,439 | $8,809 | $1,477 | 2 | −$28,253 | −$33,522 | $14,910 | $82,996 | $17,517 | n/a (not a fold pick) |
| 9 | $14,910 | $13,439 | $8,809 | $1,477 | 2 | −$28,253 | −$33,522 | $14,910 | $86,751 | $18,120 | n/a (not a fold pick) |
| 10 | −$34,366 | $47,362 | $43,517 | $4,159 | 9 | −$77,529 | −$82,797 | −$28,667 | $100,921 | $47,362 | n/a (not a fold pick) |
| base | $43,163 | $34,324 | $30,814 | $17,781 | 6 | $0 | −$5,269 | $44,162 | $96,055 | $50,277 | — |
| base | $43,204 | $36,190 | $32,457 | $17,811 | 6 | +$41 | −$5,228 | $44,181 | $66,866 | $44,659 | — |

allIn.ts on the same dates: holdout net $48,432, minute DD $32,084, 6 trades; combined net $167,624.

"Combined" is one continuous run over development and holdout; most of it is in-sample for these picks and it is **not** an out-of-sample figure. A final-fit pick has a walk-forward figure only if exactly the same vector was also picked on a fold's own training data.

## D. Robustness and notes

| Rank | Classification | Robust net (Q25 of probes) | Median probe net | Robust minute DD (Q75) | Worst ±1-step net | Probe clones | next-open dev net | next-open holdout net | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | stable | $130,511 | $151,512 | $31,465 | $95,462 | 28% | $155,395 | −$7,054 | — |
| 2 | stable | $116,698 | $131,865 | $29,281 | $109,462 | 32% | $135,458 | $41,596 | — |
| 3 | stable | $115,682 | $120,799 | $30,457 | $76,220 | 31% | $120,896 | −$22,825 | best trade = 53% of development net |
| 4 | stable | $110,765 | $119,328 | $20,603 | $84,014 | 26% | $122,455 | −$4,523 | — |
| 5 | stable | $112,221 | $122,127 | $21,528 | $90,599 | 23% | $125,020 | −$9,370 | — |
| 6 | stable | $108,109 | $121,412 | $21,818 | $76,128 | 30% | $122,674 | −$30,006 | — |
| 7 | stable | $55,696 | $61,058 | $12,938 | $43,873 | 35% | $61,932 | $16,125 | — |
| 8 | stable | $60,621 | $68,086 | $13,169 | $61,048 | 49% | $68,329 | $14,910 | — |
| 9 | stable | $68,814 | $71,841 | $13,432 | $61,753 | 36% | $72,081 | $14,910 | — |
| 10 | stable | $115,459 | $132,254 | $30,777 | $106,212 | 28% | $135,621 | −$34,535 | — |

Full rows, including every probe and every per-year figure, are in `results/shortlist.csv`, `results/shortlist.json` and ROBUSTNESS.md.
