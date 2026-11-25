# Robustness and risk — P6-TSLA (report-only)

Subjects: the five C24 primaries, one per arm. The roles, the fold primaries and the external controls have the same
tables in the arm reports (§E–§I of `STANDALONE_D1_REPORT.md`, `STANDALONE_GROWTH_REPORT.md`,
`FIXED_COMBINATION_REPORT.md`, `JOINT_REPORT.md`, `SEQUENTIAL_REPORT.md`). Every dollar figure is in dollars of the
fixed $100,000 TSLA allocation.

**Sources and labels:**
- *Development* (2016–2024): the sealed C24 qualification records, through `reports/tables/finalists.json`.
- *Validation* (2025-01-02 → 2026-10-30, once, retrospective): `results/validation/validation.json`.
- *Report-only diagnostics* after the outcome, in `reports/diagnostics/`. Lot replays on FULL use the canonical CPU
  engine in detail mode (gate E4: CPU = GPU on every record field). The small/wide neighbourhoods are non-official GPU
  runs on D24, with 35 device receipts and 0 CPU-scored. The tail stress is daily, on pre-2016 TSLA history disjoint
  from every door, and on 2016–2024.

None of these is a selection input. Centre figures (the selected vector) are kept separate from perturbation
distributions (its neighbourhood).

| Arm | C24 primary | Cell |
|---|---|---|
| D | `C24/D/refine/D.B1/R103#1 profit` | D1 family B, decline gate on; protective stop 5.8 % |
| G | `C24/G/refine/G.h2.s1/R101#1 profit` | Growth: hold on, buffer on, initial ATR stop on |
| C | `C24/C/pair DF1×GF3` | D's primary × G's balanced role, unchanged |
| J | `C24/J/refine/J.B1.h2.s1/R104#1 profit` | D1 B1 (stop 7.1 %, from the entry day) + Growth h2.s1 |
| S | `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | frozen D1 = D's primary + Growth h1.s1 |

## 1. Drawdown, principal loss, banked capital and give-back

| Arm | Marked minute DD, development (% of $100k) | Worst marked lot = worst principal loss | Worst realized lot | Banked-capital DD, marked / liquidation | Total / largest lot give-back (2016–2026) | Marked DD, validation reset / whole run |
|---|---:|---:|---:|---:|---:|---:|
| D | $25,587 (25.6 %) | −$10,332 | −$10,332 (2024-10-08, stop gap) | $16,246 / $16,295 | $446,290 / $16,388 | $13,924 / $27,742 |
| G | $28,655 (28.7 %) | −$6,171 (2016–2024); −$6,188 (2025) | −$6,188 (2025-11-11, initial stop) | $14,157 / $14,205 | $298,820 / $25,679 | $18,255 / $28,655 |
| C | $26,288 (26.3 %) | −$11,197 | −$11,197 (2024-07-17, initial stop gap) | $16,246 / $16,295 | $656,306 / $25,679 | $25,953 / $26,288 |
| J | $27,882 (27.9 %) | −$9,140 | −$9,140 (2018-09-06, stop gap) | $12,664 / $12,714 | $507,062 / $25,679 | $29,253 / $29,253 |
| S | $26,288 (26.3 %) | −$10,332 | −$10,332 (2024-10-08, stop gap) | $16,246 / $16,295 | $656,712 / $25,679 | $26,869 / $26,869 |

Over the whole run (2016–2026), the banked-capital drawdown is D $19,311, G $14,157, C $19,456, J $21,695 and S $20,338
(marked = liquidation).

**In development, the drawdowns are mostly give-back of unrealized gains, not loss of principal.** For every primary,
the worst single-lot principal loss ($6,171–$11,197) is well under half of the marked drawdown ($25,587–$28,655).
Out of sample it was the other way round (`CHRONOLOGICAL_VALIDATION.md` §3). The folds' drawdowns were realized
single-lot losses of $18,500–$31,800 (D, C, J and S) under the fold primaries' wider stops and longer holds. In the
validation, under the C24 vectors, each primary's worst lot was −$6,045 to −$8,575.

## 2. Profitable exits that still produced the drawdown (brief §7)

Each primary's development drawdown was reconstructed from its lot ledger: the running peak and trough of the
cumulative realized net plus the open lot's best and worst marks. All five reconstructions **match the sealed DD to the
cent**.

- **G, C, J and S: the same profitable Growth lot.** Growth·TSLA was entered on 2020-01-23 and marked at +$71,179 on its
  best minute. It exited on 2020-02-05 by a gapped trailing stop at **+$45,500**, a winning trade that gave back
  $25,679. The next lot then dipped before a new high: G's Growth lot of 2020-02-11 (worst mark −$2,977; DD $28,655),
  and the D1 lot of 2020-02-06 in C and S (−$609; $26,288) and in J (−$2,203; $27,882). In each case the realized net fell
  only $609–$2,977 below its previous realized high. The rest of the drawdown is the open lot's unrealized gain given back.
- **D: give-back, then realized losses.** The peak is a D1 lot of 2021-12-21 → 2022-01-05 (best mark +$34,076, exit
  +$24,734). The trough is a D1 lot entered on 2023-04-26, at its worst mark. In between, the lots entered in 2022 lost
  $14,702 net.
- From the folds: C21's shared $32,291.84 drawdown is one Growth lot marked at +$190,508 at 09:45 ET on 2020-07-13,
  which reversed the same day and still exited profitably. G's sequential DD ($36,079) starts from a January 2020 mark
  ($48,930) of a lot that exited profitably.

The $35,000 criterion is a peak-to-trough measure of the marked equity. A profitable lot can consume most of it
without any loss of principal.

## 3. Neighbourhood distributions (development; perturbation, not centre)

Columns 1–5 come from the confirmation family (3 × 128 draws, the qualification instrument). Columns 6–7 come from the
report-only small (0.5×) and wide (1.5×) families (128 draws each, D24).

| Arm | Centre net | Median / p10 net | p90 / p95 DD | Worst-10 % mean / worst DD | Breach share (Wilson 95 %) | Small: median net, p90 DD, breaches | Wide: median net, p90 DD, breaches |
|---|---:|---:|---:|---:|---:|---:|---:|
| D | $319,654 | $148,203 / $79,447 | $34,819 / $38,513 | $38,422 / $46,624 | 9.6 % (7.1–13.0 %) | $185,120, $31,619, 0 | $128,984, $39,772, 29 (22.7 %) |
| G | $340,913 | $266,369 / $222,806 | $32,572 / $35,305 | $35,181 / $39,048 | 5.5 % (3.6–8.2 %) | $307,058, $28,946, 0 | $234,328, $34,180, 13 (10.2 %) |
| C | $498,120 | $357,589 / $298,234 | $32,456 / $33,809 | $34,421 / $40,607 | 2.3 % | $388,172, $30,154, 0 | $318,621, $36,656, 25 (19.5 %) |
| J | $435,551 | $314,983 / $254,243 | $33,240 / $34,260 | $34,814 / $44,149 | 2.9 % | $356,501, $32,101, 0 | $272,698, $35,401, 16 (12.5 %) |
| S | $540,641 | $383,476 / $327,862 | $34,452 / $37,354 | $37,414 / $45,742 | 8.1 % | $419,691, $30,104, 1 (0.8 %) | $343,396, $40,033, 35 (27.3 %) |

- **Every centre is a peak above its neighbourhood.**
  - D's centre net is 2.2 × its confirmation median, a sharp optimum: D1's in-sample profit depends on exact parameter
    values.
  - The others' centres are 1.3–1.4 × their medians.
- **The tails reach past the limit.** D's, G's and S's p95 exceed $35,000, and every worst draw does ($39,048–$46,624).
  In the wide family, 10–27 % of draws breach.
- **On later data the tails grew.**
  - On the folds, the same kind of confirmation draws breached in up to 256 of 256 cases (`CHRONOLOGICAL_VALIDATION.md` §3).
  - On the validation, under the C24 vectors: D 0, G 0, C 4, J 56 and S 4 of 256.

## 4. Costs, interest, slippage and stop fills (centre; development and validation)

| Arm | Dev net at 5 bps | 10 bps net / DD | 20 bps net / DD | 14 % interest | Stop slippage +25 bps | Stops at the next open | Validation at 5 / 10 / 20 bps | Validation, next-open stops |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| D | $319,654 | $314,318 / $26,080 | $309,869 / $27,064 | $314,492 | $313,695 | **$246,882** | −$8,979 / −$9,170 / −$9,552 | −$8,504 |
| G | $340,913 | $337,461 / $28,764 | $330,568 / $28,981 | $337,477 | $334,418 | $340,913 | +$10,703 / +$10,291 / +$9,467 | +$10,703 |
| C | $498,120 | $490,699 / $26,398 | $482,085 / $27,064 | $490,870 | $488,108 | $479,815 | +$71 / **−$531** / −$1,734 | +$546 |
| J | $435,551 | $430,399 / $27,990 | $420,110 / $28,208 | $430,299 | $424,337 | $436,156 | −$10,751 / −$11,241 / −$12,221 | −$10,380 |
| S | $540,641 | $533,176 / $26,398 | $524,474 / $27,064 | $532,882 | $530,299 | $510,664 | −$2,412 / −$3,012 / −$4,210 | −$1,937 |

- Development net is robust to costs and interest: 20 bps per side costs 3.0–3.5 %.
- **D1 depends on intraday stop fills.** Filling stops at the next session's open instead cuts D's development net by
  $72,772 (−23 %). Growth (G) is unaffected.
- **C's validation profit is within cost noise.** +$71 at 5 bps per side becomes −$531 at 10 bps (Q5's cost level).

## 5. Gaps through stops: the D1 maximum-hold tail stress (standard §5.9; daily resolution)

A $100,000 lot is bought at every daily close and marked at the daily lows for the book's maximum hold. It exits at the
protective stop, or at the open when the open gaps through the stop.

| D1 book | Stop / hold | Pre-2016 worst (date) | Pre-2016 p5 | Worst gap below the stop | 2016–2024 worst (date) | Share beyond $35,000 |
|---|---|---:|---:|---:|---:|---:|
| D, C, S (C24F1) | 5.8 % / 11 days | −$16,599 (2015-08-14) | −$5,802 | 10.8 % (2015-08-24) | −$16,325 (2020-03-05; gap 10.5 % on 2020-03-09) | 0 % |
| J | 7.1 % / 9 days | −$16,265 (2015-08-20) | −$7,100 | 9.2 % (2015-08-24) | −$16,325 (2020-03-05) | 0 % |
| C19's D primary (for contrast) | 24.1 % / 12 days | −$24,100 (2010-06-29) | −$16,474 | — | −$27,364 (2020-03-10) | 0 % |

**A protective stop is not a loss cap.** TSLA has opened 9–11 % below a 5.8–7.1 % stop (August 2015, March 2020), so a
single lot can lose about 16 % of the slot with these stops. A gap like March 2020's, with the 24 % stop of C19's
primary, meant −$24,400 realized twice on the 2020–2021 fold. Growth's initial ATR stops gap as well: C's worst lot,
−$11,197 on 2024-07-17, is an initial stop filled at a gapped open. Growth has no maximum-hold tail stress (§5.9 is
defined for D1). Unrestricted Growth (G-U, `G.h0.s0`) has no exit protection at all (§9).

## 6. Margin and liquidation (ILLUSTRATIVE only)

This assumes the lot is fully financed and the account must hold maintenance m of the position's market value. It uses
no broker's house rules. The figures are the cash the account must hold beside the lot at its worst mark (2016–2026):

| Arm | m = 25 % | m = 30 % | m = 50 % |
|---|---:|---:|---:|
| D | $32,749 | $37,233 | $55,166 |
| G | $29,641 | $34,331 | $53,094 |
| C | $33,398 | $37,838 | $55,599 |
| J | $31,855 | $36,398 | $54,570 |
| S | $32,749 | $37,233 | $55,166 |

A broker may set a higher house requirement for a volatile single stock than the 25 % minimum, and may change it; these
rows are not any broker's rules. On these assumptions a financed TSLA slot needs about 30–56 % of the lot's value in
reserve at its worst mark. That is a separate requirement from the $35,000 research ceiling.

## 7. Trades, duration, occupancy, families, displacement and attribution

| Arm | Lots 2016–2024 (W/L) | Lots 2016–2026, win rate | Median / max days | Occupancy (sessions, 2016–2026) | D1 / Growth booked (development) | Gross / interest / costs (development) |
|---|---:|---:|---:|---:|---:|---:|
| D | 50 (34/16) | 52, 65.4 % | 10 / 64 | 16.6 % | $319,654 / — | $343,750 / $18,926 / $5,169 |
| G | 31 (22/9) | 35, 68.6 % | 11 / 69 | 12.1 % | — / $340,913 | $356,787 / $12,597 / $3,277 |
| C | 69 (48/21) | 75, 66.7 % | 10 / 64 | 24.5 % | $263,023 / $235,097 | $531,863 / $26,581 / $7,162 |
| J | 47 (34/13) | 52, 67.3 % | 9.5 / 69 | 17.5 % | $178,970 / $256,581 | $459,736 / $19,258 / $4,928 |
| S | 69 (49/20) | 75, 68.0 % | 10 / 66 | 26.3 % | $300,958 / $239,683 | $576,275 / $28,449 / $7,185 |

**Displacement and the profit from allocator chronology (development, C24).** "Alone" means the same vector run with
the other book disabled (removal test):

| Arm | Signals refused because the other book held the slot | D1 in the shared slot vs alone | Growth in the shared slot vs alone | Effect of the shared chronology | The vectors vs the standalone primaries |
|---|---|---:|---:|---:|---|
| C | D1 3 (Growth held), Growth 6 (D1 held) | $263,023 vs $319,654 | $235,097 vs $311,583 | **−$133,117** | D1 = D's primary; Growth = G's balanced role (−$29,330 vs G's primary) |
| J | none | $178,970 = alone | $256,581 = alone | $0 | D1 −$140,684 vs D's primary; Growth −$84,332 vs G's primary |
| S | D1 2, Growth 8 | $300,958 vs $319,654 | $239,683 vs $318,721 | **−$97,734** | D1 = D's primary; Growth −$22,192 vs G's primary |

- **No combined primary earns more than the two standalone primaries' sum** ($660,567). The combined arms' higher
  in-sample nets come from **using more of the slot's idle time**: occupancy is 24.5–26.3 % for C and S, against
  12.1–16.6 % for G and D. They lose $98,000–$133,000 to displacement, and J's books do not collide at all.
- J's C24 primary is not a better D1 or a better Growth: each of its books alone earns much less than the standalone
  primary. Its advantage over G is the sum of two non-colliding books. At C21 and C23, by contrast, J's D1 component
  earned more than arm D's best (`reports/narrative/J.md`).
- In the validation C is exactly D's primary plus G's balanced role, with no collision. S's D1 traded exactly D's
  primary's lots.

## 8. Annual results (centre; development years, then the validation years from the FULL run)

| Arm | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 (to 10-30) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D | $5,277 | $0 | $19,421 | −$466 | $142,384 | $94,852 | −$7,509 | $53,283 | $12,412 | −$2,934 | −$6,045 |
| G | $0 | $19,142 | $0 | $46,006 | $146,236 | $63,440 | $0 | $19,628 | $46,460 | $11,011 | −$308 |
| C | $5,277 | $22,155 | $19,421 | $29,173 | $210,993 | $107,489 | −$7,509 | $53,283 | $57,837 | $7,143 | −$7,072 |
| J | $5,272 | $31,276 | $820 | $576 | $134,983 | $81,151 | $4,401 | $128,049 | $49,023 | $5,681 | −$16,432 |
| S | $5,277 | $45,054 | $13,989 | $33,587 | $214,104 | $106,812 | −$7,509 | $53,283 | $76,045 | $5,085 | −$7,497 |

**Episode dependence.** 2020–2021 holds 51–77 % of every development net by lot-entry year: D 76.5 %, C 65.4 %,
G 61.5 %, S 60.7 % and J 51.0 %. G's 31 development lots span 9 years, and three calendar years (2016, 2018, 2022) have no lot. The top episode share of the net is D 36.4 %, G 27.1 %, C 22.0 %, S 20.9 % and
J 14.9 %.

## 9. Disclosures: overfitting, rare trades and unbounded exposure

- **Overfitting.**
  - Out of sample the fold primaries earned 10–35 % of their in-sample rate.
  - D's centre sits at 2.2 × its neighbourhood median.
  - Seeds found materially different optima in the same cell (`SEARCH_AND_CONVERGENCE_REPORT.md` §D). J's selected
    C24 cell `J.B1.h2.s1` ranged from $45,961 to $326,267 in best broad-lane fit across its 4 replicates.
- **Rare trades.** Growth's profit is a handful of trends: one +$18,674 lot made G's validation result. The validation
  had 2–6 lots per primary.
- **Structurally unbounded exposure.** Unrestricted Growth (`G.h0.s0`; report-only populations G-U, J-U and S-U) has no
  maximum hold, buffer or initial stop. Its chained fold drawdowns ($85,703–$111,944) exceed the slot. In the validation,
  G-U's primary held a lot entered on 2025-12-16 to the end, marked −$24,954 with a worst mark of −$43,743 (reset DD
  $54,344). The protected cells' stops limit the typical loss, not the worst one (§5).
- The $35,000 ceiling is a research criterion on historical marked paths, never an enforceable loss limit.
