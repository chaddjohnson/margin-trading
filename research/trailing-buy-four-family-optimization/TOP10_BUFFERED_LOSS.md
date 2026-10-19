# Top 10 phenotypes — family 2: Trailing buy + buffered loss exit (restricted re-entry)

Source: `src/app/allIn-trailingBuy-bufferedLoss.ts` (unmodified). Free parameters: 9 (X, Y, stop, hold, L, mat, lower, reset, buffer); absent parameters are **N/A**. File default Y = 3%.

Picked by the pre-declared rule (PROTOCOL.md §8) on the **final development fit, 2016-09-20 → 2023-12-29 (in-sample)**, frozen before the holdout. `stop` fills, 11% margin, $100,000 per entry, no costs. Drawdowns are of the $100,000 strategy P&L, not account equity.

**Summary.** In-sample development net of the picks was $63,964–$155,226, against the default's $27,377 (Y 3%,
minute DD $47,324). In the frozen holdout the picks' median was $15,902, with 9/10 positive and 0/10 above the
default's $43,204 or `allIn.ts`'s $48,432; the best was rank 2 at $33,836. The picks' `intradayLossBuffer`
ranges from 0.0% to 2.8%. Rank 2 uses 0.0%, which adds an intraday exit at any net loss from the hold day;
it does not reproduce the original open-only rule.


## A. Identity and parameters

| Rank | ID | Category | Unique phenotype (clone-group size) | X | Y | stop | hold | L | mat | lower | reset | buffer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `2-3ee5816ff2` | profit | yes (1) | 7.3% | 1.4% | 4.9% | 13 | 62 | 2.7% | 5.9% | 67.9% | 0.2% |
| 2 | `2-cb71dc593a` | profit | yes (285) | 7.0% | 1.4% | 6.6% | 13 | 94 | 2.7% | 5.9% | 51.2% | 0.0% |
| 3 | `2-5ee65e820a` | profit | yes (1) | 7.1% | 1.6% | 5.3% | 13 | 69 | 2.1% | 5.3% | 54.7% | 2.8% |
| 4 | `2-fd986c849f` | balanced | yes (17) | 11.6% | 0.6% | 5.1% | 8 | 60 | 1.1% | 5.3% | 66.4% | 2.7% |
| 5 | `2-b9d1ab3d43` | balanced | yes (1) | 11.3% | 0.6% | 4.8% | 8 | 63 | 1.1% | 5.9% | 67.0% | 2.6% |
| 6 | `2-2c188c3dec` | balanced | yes (1) | 11.4% | 0.5% | 5.0% | 8 | 48 | 0.5% | 6.0% | 55.1% | 0.9% |
| 7 | `2-58ccfaf7dc` | low-DD | yes (4) | 19.3% | 0.6% | 4.1% | 10 | 71 | 0.5% | 5.8% | 53.8% | 0.6% |
| 8 | `2-85c5ae0705` | low-DD | yes (2) | 20.0% | 0.5% | 4.1% | 10 | 153 | 0.5% | 6.0% | 49.8% | 1.4% |
| 9 | `2-1e9be06c31` | Pareto-diverse | yes (1) | 7.1% | 0.7% | 5.1% | 13 | 61 | 1.1% | 5.3% | 68.7% | 2.6% |
| 10 | `2-6ef23cd64e` | Pareto-diverse | yes (1) | 20.0% | 0.6% | 4.0% | 12 | 69 | 1.0% | 0.5% | 66.0% | 1.1% |
| base | `2-8badd65cdc` | default (file Y 3%) | — | 10.0% | 3.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | 0.5% |
| base | `2-4a3c9a0f49` | default at Y 4% | — | 10.0% | 4.0% | 8.0% | 15 | 90 | 1.0% | 2.0% | 38.0% | 0.5% |

## B. Development fit (in-sample, 2016-09-20 → 2023-12-29)

| Rank | Net after interest | Minute DD | Daily DD | Interest | Trades | W / L | Avg hold (d) | Max hold (d) | Time in market | Worst trade | Best-trade share | Δ net vs own default | Δ net vs allIn.ts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $144,753 | $27,006 | $23,751 | $44,995 | 50 | 28 / 21 | 29.9 | 144.0 | 55.8% | −$9,571 | 16% | +$117,376 | +$25,560 |
| 2 | $155,226 | $25,257 | $24,649 | $57,652 | 48 | 22 / 25 | 39.9 | 168.0 | 71.8% | −$9,571 | 17% | +$127,849 | +$36,034 |
| 3 | $134,617 | $25,695 | $24,782 | $47,526 | 47 | 23 / 23 | 33.6 | 144.0 | 58.7% | −$9,726 | 17% | +$107,239 | +$15,424 |
| 4 | $126,612 | $17,988 | $17,105 | $23,447 | 37 | 21 / 15 | 21.0 | 126.0 | 29.0% | −$5,944 | 19% | +$99,235 | +$7,419 |
| 5 | $100,045 | $15,658 | $15,289 | $19,770 | 30 | 17 / 12 | 21.9 | 125.0 | 24.7% | −$5,944 | 23% | +$72,668 | −$19,148 |
| 6 | $118,644 | $16,672 | $16,132 | $21,940 | 34 | 20 / 13 | 21.4 | 125.0 | 27.0% | −$5,944 | 19% | +$91,267 | −$549 |
| 7 | $69,022 | $10,710 | $9,268 | $7,022 | 17 | 13 / 4 | 13.7 | 64.0 | 8.8% | −$3,080 | 22% | +$41,645 | −$50,171 |
| 8 | $70,170 | $11,086 | $9,268 | $8,559 | 19 | 15 / 4 | 14.9 | 64.0 | 10.8% | −$1,484 | 21% | +$42,793 | −$49,023 |
| 9 | $134,211 | $31,250 | $30,838 | $47,496 | 47 | 28 / 18 | 33.5 | 144.0 | 59.1% | −$14,666 | 17% | +$106,834 | +$15,018 |
| 10 | $63,964 | $12,559 | $11,870 | $7,173 | 18 | 15 / 3 | 13.2 | 64.0 | 9.1% | −$5,104 | 23% | +$36,587 | −$55,228 |
| base | $27,377 | $47,324 | $46,734 | $33,512 | 30 | 9 / 20 | 37.1 | 167.0 | 41.9% | −$13,452 | 174% | $0 | −$91,815 |
| base | $69,213 | $39,537 | $36,276 | $40,052 | 28 | 10 / 17 | 47.5 | 218.0 | 50.1% | −$18,499 | 63% | +$41,835 | −$49,980 |

allIn.ts on the same dates and conventions: net $119,193, minute DD $26,287, daily DD $23,826, 27 trades.

## C. Out-of-sample: frozen holdout 2024-01-02 → 2025-10-13 (evaluated once) and combined

| Rank | Holdout net | Holdout minute DD | Holdout daily DD | Holdout interest | Holdout trades | Δ vs own default | Δ vs allIn.ts | Flat-start holdout net | Combined 2016-09-20 → 2025-10-13 net | Combined minute DD | Walk-forward evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | $19,193 | $29,587 | $25,742 | $9,192 | 9 | −$24,010 | −$29,238 | $24,796 | $163,946 | $29,587 | n/a (not a fold pick) |
| 2 | $33,836 | $40,367 | $36,479 | $14,225 | 9 | −$9,368 | −$14,596 | $32,960 | $189,062 | $40,367 | n/a (not a fold pick) |
| 3 | $24,601 | $31,482 | $27,325 | $9,192 | 8 | −$18,603 | −$23,831 | $30,284 | $159,218 | $31,482 | n/a (not a fold pick) |
| 4 | $33,022 | $24,989 | $19,690 | $8,468 | 7 | −$10,182 | −$15,410 | $38,767 | $159,634 | $24,989 | n/a (not a fold pick) |
| 5 | −$5,908 | $23,212 | $19,234 | $2,622 | 4 | −$49,111 | −$54,339 | −$235 | $94,137 | $23,212 | n/a (not a fold pick) |
| 6 | $2,088 | $23,641 | $19,906 | $4,792 | 4 | −$41,116 | −$46,344 | $7,829 | $120,731 | $23,641 | n/a (not a fold pick) |
| 7 | $14,910 | $13,439 | $8,809 | $1,477 | 2 | −$28,294 | −$33,522 | $14,910 | $83,932 | $17,517 | n/a (not a fold pick) |
| 8 | $15,678 | $13,449 | $8,741 | $1,447 | 3 | −$27,526 | −$32,754 | $15,678 | $85,847 | $18,069 | n/a (not a fold pick) |
| 9 | $8,408 | $38,509 | $35,015 | $6,932 | 8 | −$34,796 | −$40,023 | $14,150 | $142,619 | $39,499 | n/a (not a fold pick) |
| 10 | $16,125 | $13,439 | $8,809 | $1,447 | 3 | −$27,078 | −$32,306 | $16,125 | $80,090 | $17,517 | n/a (not a fold pick) |
| base | $43,204 | $36,190 | $32,457 | $17,811 | 6 | $0 | −$5,228 | $44,181 | $70,581 | $47,324 | — |
| base | $43,163 | $34,324 | $30,814 | $17,781 | 6 | −$41 | −$5,269 | $44,162 | $112,376 | $39,537 | — |

allIn.ts on the same dates: holdout net $48,432, minute DD $32,084, 6 trades; combined net $167,624.

"Combined" is one continuous run over development and holdout; most of it is in-sample for these picks and it is **not** an out-of-sample figure. A final-fit pick has a walk-forward figure only if exactly the same vector was also picked on a fold's own training data.

## D. Robustness and notes

| Rank | Classification | Robust net (Q25 of probes) | Median probe net | Robust minute DD (Q75) | Worst ±1-step net | Probe clones | next-open dev net | next-open holdout net | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | stable | $126,847 | $142,842 | $27,428 | $111,529 | 33% | $144,071 | $19,296 | — |
| 2 | stable | $125,343 | $152,871 | $26,726 | $122,960 | 36% | $155,062 | $33,824 | — |
| 3 | stable | $122,925 | $134,617 | $27,305 | $107,259 | 40% | $135,325 | $24,848 | — |
| 4 | stable | $107,896 | $121,539 | $17,988 | $80,641 | 27% | $126,376 | $32,890 | — |
| 5 | stable | $99,197 | $100,045 | $16,346 | $74,807 | 43% | $100,338 | −$5,908 | — |
| 6 | moderate | $93,907 | $112,435 | $16,742 | $60,746 | 21% | $118,181 | $2,218 | — |
| 7 | stable | $63,968 | $68,711 | $10,921 | $57,212 | 38% | $69,265 | $14,910 | — |
| 8 | stable | $64,364 | $68,910 | $12,052 | $51,695 | 20% | $70,661 | $15,786 | — |
| 9 | stable | $117,443 | $130,471 | $31,250 | $87,273 | 27% | $134,152 | $8,295 | — |
| 10 | stable | $62,862 | $63,964 | $12,559 | $56,265 | 57% | $64,319 | $16,125 | — |

Full rows, including every probe and every per-year figure, are in `results/shortlist.csv`, `results/shortlist.json` and ROBUSTNESS.md.
