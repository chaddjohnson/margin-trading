# Workstream E — trade quality, concentration and adverse excursions

**Sources:**
- The reconciled funded-lot ledgers of the base fixed-pool runs ($100,000 per lot, 5 bps, 11%). They are identical to
  `npm run pools -- fixed` (see `BASELINE_RECONCILIATION.md`).
- For the drawdown episodes, the portfolio runs' lots.

Every lot is in `results/E_trades.csv`, with its MAE/MFE.

**MAE/MFE definition** (pre-registered, PROTOCOL.md §7):
- They are taken over the symbol's regular-session minute bars legally observable while the lot was held: from the
  entry bar (its open is the fill) through the bar before the exit bar, plus the exit price itself.
- The exit bar's range beyond the fill is excluded, because the order of prices within a minute is unknown.
- Percentages are relative to the raw entry fill. Dollars are shares × (extreme − cost-adjusted entry), before
  interest.
- Gaps appear as the next bar's open.
- Minute OHLCV bars are not quotes. A stop exit "at the stop level" assumes the stop traded.
- The engine's own `worstMark` (minute close, net of interest) is in the CSV for comparison.

## Trade statistics

**B4**

| Book | Lots | Wins / losses | Win rate | Gross | Interest | Friction | Net | Profit factor | Median / mean net | Median / mean days | Lot-days |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT | 14 | 11 / 3 | 79% | $198,091 | $30,077 | $1,498 | $166,516 | 25.86 | $6,164 / $11,894 | 31.0 / 71.3 | 998 |
| XBI | 17 | 11 / 6 | 65% | $44,473 | $2,411 | $1,721 | $40,341 | 4.38 | $597 / $2,373 | 5.0 / 4.7 | 80 |
| XRT | 6 | 4 / 2 | 67% | $22,751 | $7,112 | $611 | $15,028 | 12.85 | $558 / $2,505 | 27.0 / 39.3 | 236 |
| KRE | 39 | 21 / 18 | 54% | $73,709 | $7,414 | $3,935 | $62,360 | 2.60 | $188 / $1,599 | 5.0 / 6.3 | 246 |
| **B4 total** | 76 | 47 / 29 | 62% | $339,024 | $47,014 | $7,766 | $284,245 | 5.83 | $634 / $3,740 | 5.5 / 20.5 | 1,560 |

**B5**

| Book | Lots | Wins / losses | Win rate | Gross | Interest | Friction | Net | Profit factor | Median / mean net | Median / mean days | Lot-days |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT | 12 | 10 / 2 | 83% | $136,919 | $25,556 | $1,268 | $110,095 | 33.24 | $2,804 / $9,175 | 38.0 / 70.7 | 848 |
| XBI | 16 | 11 / 5 | 69% | $57,314 | $2,622 | $1,628 | $53,064 | 5.64 | $1,652 / $3,316 | 5.0 / 5.4 | 87 |
| XRT | 4 | 2 / 2 | 50% | $18,314 | $5,063 | $409 | $12,842 | 11.13 | $231 / $3,210 | 27.0 / 42.0 | 168 |
| KRE | 46 | 24 / 22 | 52% | $118,770 | $9,132 | $4,657 | $104,981 | 3.26 | $537 / $2,282 | 5.0 / 6.6 | 303 |
| GDX | 16 | 14 / 2 | 88% | $217,391 | $10,458 | $1,708 | $205,225 | 14.94 | $10,140 / $12,827 | 18.0 / 21.7 | 347 |
| **B5 total** | 94 | 61 / 33 | 65% | $548,708 | $52,830 | $9,670 | $486,208 | 7.29 | $1,622 / $5,172 | 6.0 / 18.6 | 1,753 |

Profit factor is gross wins ÷ |gross losses| of lot nets. Holding periods are calendar days.

**Exit reasons — B4**

| Exit reason | Lots | Net |
|---|---:|---:|
| trailing stop | 35 | $304,121 |
| trailing stop gap | 13 | $37,454 |
| maximum hold | 27 | −$57,153 |
| buffered intraday loss | 1 | −$177 |

**Exit reasons — B5**

| Exit reason | Lots | Net |
|---|---:|---:|
| trailing stop | 44 | $419,830 |
| trailing stop gap | 17 | $142,801 |
| maximum hold | 32 | −$76,246 |
| buffered intraday loss | 1 | −$177 |

- **All profit comes from trailing-stop exits.** Stop and stop-gap exits net $341,575 (B4) and
  $562,631 (B5).
- **Maximum-hold exits are the losers.** B4's 27 maximum-hold exits net −$57,153, and B5's
  32 net −$76,246. These are trades whose net-profit stop never became active.

**Setups:**

| Setup | Lots | Net | Win rate |
|---|---:|---:|---:|
| deep | 58 | $226,645 | 64% |
| continuation | 18 | $57,600 | 56% |

| Setup | Lots | Net | Win rate |
|---|---:|---:|---:|
| deep | 74 | $357,159 | 65% |
| continuation | 20 | $129,049 | 65% |

## Concentration (descriptive)

"Without the top N" subtracts the largest winners from the realized total. It shows how much of the result rests on a
few trades. **It is not a feasible alternative backtest:** those trades held the slot, and without them other trades
would have been funded.

**B4**

| Measure | Value |
|---|---|
| Total fixed net | $284,245 |
| Top 1 / 3 / 5 / 10 winning lots, share of total net | 18.0% / 40.7% / 53.0% / 73.9% |
| Total without the top 1 / 3 / 5 / 10 winners (descriptive only) | $232,981 / $168,416 / $133,716 / $74,248 |
| Largest loss / worst 5 losses / all losses | −$10,094 / −$29,883 / −$58,805 |
| Share of net by book | VGT 58.6%, XBI 14.2%, XRT 5.3%, KRE 21.9% |
| Top calendar year (fixed MTM) | 2020 (27.4%) |
| Open positions at 2026-10-13 | 0 |

| # | Book | Entry | Exit | Net | Share of total |
|---:|---|---|---|---:|---:|
| 1 | VGT | 2020-04-02 | 2020-09-04 | $51,264 | 18.0% |
| 2 | VGT | 2025-04-22 | 2025-11-07 | $44,315 | 15.6% |
| 3 | VGT | 2018-12-21 | 2019-05-13 | $20,250 | 7.1% |
| 4 | VGT | 2019-08-05 | 2020-02-24 | $17,589 | 6.2% |
| 5 | KRE | 2023-11-29 | 2023-12-15 | $17,111 | 6.0% |
| 6 | XRT | 2023-01-03 | 2023-02-09 | $13,140 | 4.6% |
| 7 | VGT | 2020-10-28 | 2021-02-23 | $13,031 | 4.6% |
| 8 | KRE | 2021-12-21 | 2022-01-19 | $11,799 | 4.2% |
| 9 | VGT | 2022-07-05 | 2022-08-26 | $10,956 | 3.9% |
| 10 | XBI | 2022-05-12 | 2022-05-18 | $10,542 | 3.7% |

**B5**

| Measure | Value |
|---|---|
| Total fixed net | $486,208 |
| Top 1 / 3 / 5 / 10 winning lots, share of total net | 9.1% / 23.3% / 34.0% / 54.8% |
| Total without the top 1 / 3 / 5 / 10 winners (descriptive only) | $441,893 / $372,830 / $320,679 / $219,795 |
| Largest loss / worst 5 losses / all losses | −$8,258 / −$34,398 / −$77,278 |
| Share of net by book | VGT 22.6%, XBI 10.9%, XRT 2.6%, KRE 21.6%, GDX 42.2% |
| Top calendar year (fixed MTM) | 2020 (34.1%) |
| Open positions at 2026-10-13 | 0 |

| # | Book | Entry | Exit | Net | Share of total |
|---:|---|---|---|---:|---:|
| 1 | VGT | 2025-04-22 | 2025-11-07 | $44,315 | 9.1% |
| 2 | GDX | 2020-03-16 | 2020-03-18 | $37,416 | 7.7% |
| 3 | GDX | 2026-08-03 | 2026-08-31 | $31,646 | 6.5% |
| 4 | GDX | 2020-04-01 | 2020-04-15 | $27,571 | 5.7% |
| 5 | GDX | 2024-02-13 | 2024-04-15 | $24,581 | 5.1% |
| 6 | GDX | 2023-02-24 | 2023-04-21 | $23,559 | 4.8% |
| 7 | GDX | 2022-11-03 | 2022-12-15 | $22,376 | 4.6% |
| 8 | VGT | 2018-12-21 | 2019-05-13 | $20,250 | 4.2% |
| 9 | VGT | 2019-08-05 | 2020-02-24 | $17,589 | 3.6% |
| 10 | KRE | 2023-11-29 | 2023-12-15 | $17,111 | 3.5% |

- **B4 is concentrated in VGT.**
  - The VGT book provides 58.6% of B4's net.
  - The top three lots, all VGT (40.7%), are 2 April → 4 September 2020, 22 April 2025 and December 2018.
  - The top ten provide 73.9%, and without them B4 keeps $74,248.
  - Gate B (top-3 lots) stays under 50%, so no flag, but B4 depends on a handful of long VGT rebound trades.
- **B5 is more evenly spread.** The top three provide 23.3% and the top ten 54.8%. GDX provides
  42.2%, VGT 22.6% and KRE 21.6%.

## Losses and adverse excursions

**Largest losing lots — B4**

| # | Book | Entry | Exit | Exit reason | Net | MAE |
|---:|---|---|---|---|---:|---:|
| 1 | KRE | 2020-03-18 | 2020-03-23 | maximum hold | −$10,094 | −12.5% |
| 2 | KRE | 2020-03-09 | 2020-03-13 | maximum hold | −$8,258 | −17.9% |
| 3 | XBI | 2022-06-10 | 2022-06-15 | maximum hold | −$5,200 | −7.8% |
| 4 | VGT | 2022-09-16 | 2022-09-26 | maximum hold | −$3,284 | −4.2% |
| 5 | KRE | 2023-04-13 | 2023-04-17 | maximum hold | −$3,046 | −3.0% |
| 6 | XBI | 2022-02-18 | 2022-02-23 | maximum hold | −$2,849 | −3.5% |
| 7 | XBI | 2022-04-11 | 2022-04-18 | maximum hold | −$2,602 | −3.5% |
| 8 | VGT | 2025-04-11 | 2025-04-21 | maximum hold | −$2,239 | −2.0% |
| 9 | KRE | 2023-03-30 | 2023-04-03 | maximum hold | −$2,211 | −3.6% |
| 10 | KRE | 2023-09-01 | 2023-09-06 | maximum hold | −$2,082 | −2.1% |

**Largest losing lots — B5**

| # | Book | Entry | Exit | Exit reason | Net | MAE |
|---:|---|---|---|---|---:|---:|
| 1 | KRE | 2020-03-09 | 2020-03-13 | maximum hold | −$8,258 | −17.9% |
| 2 | GDX | 2026-06-22 | 2026-07-10 | maximum hold | −$8,015 | −11.7% |
| 3 | GDX | 2026-05-19 | 2026-06-08 | maximum hold | −$6,711 | −7.1% |
| 4 | KRE | 2020-06-16 | 2020-06-22 | maximum hold | −$5,956 | −5.8% |
| 5 | KRE | 2020-06-11 | 2020-06-15 | maximum hold | −$5,459 | −5.3% |
| 6 | XBI | 2022-06-10 | 2022-06-15 | maximum hold | −$5,200 | −7.8% |
| 7 | KRE | 2020-07-15 | 2020-07-20 | maximum hold | −$3,336 | −3.1% |
| 8 | XBI | 2022-02-18 | 2022-02-23 | maximum hold | −$2,849 | −3.5% |
| 9 | XBI | 2022-04-11 | 2022-04-18 | maximum hold | −$2,602 | −3.5% |
| 10 | KRE | 2020-06-25 | 2020-06-29 | maximum hold | −$2,562 | −4.8% |

**MAE / MFE by book — B4**

| Book | Median MAE | P10 MAE | Worst MAE ($ / %) | Median MFE | P90 MFE |
|---|---:|---:|---:|---:|---:|
| VGT | −1.2% | −4.0% | −$8,301 / −8.3% | 16.7% | 54.0% |
| XBI | −1.4% | −5.0% | −$7,879 / −7.8% | 7.2% | 13.7% |
| XRT | −2.4% | −6.2% | −$6,582 / −6.5% | 10.8% | 18.5% |
| KRE | −1.7% | −5.5% | −$17,982 / −17.9% | 3.7% | 12.9% |
| B4 total | −1.7% | −5.8% | −$17,982 / −17.9% | 6.3% | 19.8% |

**MAE / MFE by book — B5**

| Book | Median MAE | P10 MAE | Worst MAE ($ / %) | Median MFE | P90 MFE |
|---|---:|---:|---:|---:|---:|
| VGT | −1.1% | −4.7% | −$8,301 / −8.3% | 13.0% | 34.5% |
| XBI | −1.5% | −5.3% | −$7,879 / −7.8% | 7.6% | 14.2% |
| XRT | −3.9% | −6.3% | −$6,582 / −6.5% | 10.8% | 20.5% |
| KRE | −1.8% | −5.6% | −$17,982 / −17.9% | 4.0% | 15.1% |
| GDX | −3.2% | −7.5% | −$11,771 / −11.7% | 20.5% | 41.1% |
| B5 total | −1.9% | −6.5% | −$17,982 / −17.9% | 7.5% | 25.9% |

**Deepest adverse excursions — B4**

| # | Book | Entry | Exit | Exit reason | MAE % | MAE $ | Realized net |
|---:|---|---|---|---|---:|---:|---:|
| 1 | KRE | 2020-03-09 | 2020-03-13 | maximum hold | −17.9% | −$17,982 | −$8,258 |
| 2 | KRE | 2020-03-18 | 2020-03-23 | maximum hold | −12.5% | −$12,533 | −$10,094 |
| 3 | KRE | 2023-03-21 | 2023-03-27 | maximum hold | −9.8% | −$9,822 | −$1,424 |
| 4 | VGT | 2025-04-04 | 2025-04-10 | trailing stop | −8.3% | −$8,301 | $1,151 |
| 5 | XBI | 2022-06-10 | 2022-06-15 | maximum hold | −7.8% | −$7,879 | −$5,200 |
| 6 | XBI | 2022-01-21 | 2022-01-26 | buffered intraday loss | −6.6% | −$6,651 | −$177 |
| 7 | XRT | 2021-07-09 | 2021-07-26 | maximum hold | −6.5% | −$6,582 | −$508 |
| 8 | XRT | 2025-11-12 | 2026-03-03 | maximum hold | −5.8% | −$5,881 | −$760 |
| 9 | KRE | 2020-09-23 | 2020-09-28 | maximum hold | −5.7% | −$5,764 | −$757 |
| 10 | KRE | 2023-05-04 | 2023-05-09 | trailing stop gap | −5.5% | −$5,524 | $1,692 |

**Deepest adverse excursions — B5**

| # | Book | Entry | Exit | Exit reason | MAE % | MAE $ | Realized net |
|---:|---|---|---|---|---:|---:|---:|
| 1 | KRE | 2020-03-09 | 2020-03-13 | maximum hold | −17.9% | −$17,982 | −$8,258 |
| 2 | GDX | 2026-06-22 | 2026-07-10 | maximum hold | −11.7% | −$11,771 | −$8,015 |
| 3 | VGT | 2025-04-04 | 2025-04-10 | trailing stop | −8.3% | −$8,301 | $1,151 |
| 4 | XBI | 2022-06-10 | 2022-06-15 | maximum hold | −7.8% | −$7,879 | −$5,200 |
| 5 | KRE | 2020-04-15 | 2020-04-20 | maximum hold | −7.7% | −$7,734 | −$778 |
| 6 | GDX | 2022-09-16 | 2022-10-10 | trailing stop gap | −7.7% | −$7,725 | $2,048 |
| 7 | GDX | 2026-06-09 | 2026-06-18 | trailing stop | −7.4% | −$7,430 | $4,782 |
| 8 | GDX | 2026-05-19 | 2026-06-08 | maximum hold | −7.1% | −$7,145 | −$6,711 |
| 9 | XBI | 2022-01-21 | 2022-01-26 | buffered intraday loss | −6.6% | −$6,651 | −$177 |
| 10 | XRT | 2021-07-09 | 2021-07-26 | maximum hold | −6.5% | −$6,582 | −$508 |

- **Losses are capped by the maximum hold, not by a stop.** The deepest excursion in either pool is
  KRE 2020-03-09: −17.9% (−$17,982), realized −$8,258. That lot was bought into the March-2020 collapse, before any net-profit stop could be active,
  and it was closed by the maximum-hold rule.
- **There is no protective stop.** D1 has no protective stop below entry. Until the trailing stop is net-positive, a
  lot's downside is bounded only by time (the hold and the buffered intraday loss), not by price. A gap like March
  2020's (KRE −18% inside a 4-day hold) is the tail this history shows. Nothing in the rules caps a larger one.
- **GDX's excursions are wider (median MAE −3.2%), and so are its gains (median MFE +20.5%).** Both of its losing lots
  are 2026 maximum-hold exits.

## Clustering and the portfolio's worst episodes

The pool has a single slot, so funded lots never overlap. Losses cluster in time instead. Losses by the regime of the
lot's entry:

**B4**

| Regime of entry | Losing lots | Losses | Net of all lots |
|---|---:|---:|---:|
| R1 | 0 | $0 | $20,250 |
| outside R1–R4 | 4 | −$2,877 | $70,203 |
| R2 | 4 | −$19,467 | $45,724 |
| R3 | 20 | −$34,222 | $104,840 |
| R4 | 1 | −$2,239 | $43,227 |

**B5**

| Regime of entry | Losing lots | Losses | Net of all lots |
|---|---:|---:|---:|
| R1 | 0 | $0 | $20,250 |
| outside R1–R4 | 10 | −$26,382 | $104,452 |
| R2 | 8 | −$27,238 | $130,686 |
| R3 | 14 | −$21,420 | $187,592 |
| R4 | 1 | −$2,239 | $43,227 |

These are the lots held during the five deepest **portfolio** drawdowns (daily close; portfolio-mode lots, net at 20%
of equity):

**B4**

| Portfolio episode (daily close) | Depth | Lots held (book entry → exit: portfolio-mode net) |
|---|---:|---|
| 2020-02-19 → 2020-03-23 (recovered 2020-06-05) | 34.6% | VGT 2019-08-05→2020-02-24: +$19,182; VGT 2020-02-28→2020-03-06: +$2,785; KRE 2020-03-09→2020-03-13: −$9,692; XBI 2020-03-13→2020-03-16: −$659; KRE 2020-03-16→2020-03-17: +$2,711; XBI 2020-03-17→2020-03-18: −$505; KRE 2020-03-18→2020-03-23: −$10,296; VGT 2020-03-23→2020-04-01: +$8,639 |
| 2021-12-27 → 2022-10-14 (recovered 2023-06-12) | 27.0% | KRE 2021-12-21→2022-01-19: +$31,025; XBI 2022-01-21→2022-01-26: −$438; XBI 2022-01-28→2022-02-02: +$21,200; XBI 2022-02-18→2022-02-23: −$7,082; XBI 2022-02-24→2022-03-01: +$13,738; XBI 2022-03-08→2022-03-11: +$8,318; XBI 2022-03-14→2022-03-21: +$22,573; XBI 2022-04-11→2022-04-18: −$6,601; VGT 2022-04-26→2022-05-06: −$2,753; XBI 2022-05-09→2022-05-11: +$77; XBI 2022-05-12→2022-05-18: +$22,385; XBI 2022-05-19→2022-05-24: +$1,016; XBI 2022-05-25→2022-05-31: +$1,309; XBI 2022-06-01→2022-06-06: +$6,289; XBI 2022-06-10→2022-06-15: −$11,544; XBI 2022-06-16→2022-06-22: +$19,031; VGT 2022-06-22→2022-07-01: +$74; VGT 2022-07-05→2022-08-26: +$23,392; VGT 2022-09-16→2022-09-26: −$7,371; XRT 2022-10-03→2022-10-20: +$311 |
| 2025-01-23 → 2025-04-08 (recovered 2025-05-16) | 25.2% | VGT 2025-04-04→2025-04-10: +$4,190 |
| 2018-10-03 → 2018-12-24 (recovered 2019-03-15) | 22.6% | VGT 2018-12-21→2019-05-13: +$17,331 |
| 2025-10-29 → 2026-03-30 (recovered 2026-04-17) | 16.0% | VGT 2025-04-22→2025-11-07: +$163,293; XRT 2025-11-12→2026-03-03: −$4,441 |

**B5**

| Portfolio episode (daily close) | Depth | Lots held (book entry → exit: portfolio-mode net) |
|---|---:|---|
| 2020-02-19 → 2020-03-12 (recovered 2020-04-14) | 29.7% | VGT 2019-08-05→2020-02-24: +$19,182; VGT 2020-02-28→2020-03-06: +$2,785; KRE 2020-03-09→2020-03-13: −$9,692 |
| 2021-12-27 → 2022-06-16 (recovered 2023-04-13) | 26.4% | KRE 2021-12-21→2022-01-19: +$37,675; XBI 2022-01-21→2022-01-26: −$532; XBI 2022-01-28→2022-02-02: +$25,745; XBI 2022-02-18→2022-02-23: −$8,600; XBI 2022-02-24→2022-03-01: +$16,683; XBI 2022-03-08→2022-03-11: +$10,102; XBI 2022-03-14→2022-03-21: +$27,418; XBI 2022-04-11→2022-04-18: −$8,018; VGT 2022-04-26→2022-05-06: −$3,344; XBI 2022-05-09→2022-05-11: +$94; XBI 2022-05-12→2022-05-18: +$27,186; XBI 2022-05-19→2022-05-24: +$1,233; XBI 2022-05-25→2022-05-31: +$1,589; XBI 2022-06-01→2022-06-06: +$7,637; XBI 2022-06-10→2022-06-15: −$14,019; XBI 2022-06-16→2022-06-22: +$23,113 |
| 2025-01-23 → 2025-04-08 (recovered 2025-05-16) | 25.1% | VGT 2025-04-04→2025-04-10: +$5,950 |
| 2018-10-03 → 2018-12-24 (recovered 2019-03-15) | 22.6% | VGT 2018-12-21→2019-05-13: +$17,331 |
| 2025-10-29 → 2026-03-30 (recovered 2026-04-16) | 15.2% | VGT 2025-04-22→2025-11-07: +$231,892; XRT 2025-11-12→2026-03-03: −$6,298; GDX 2026-03-19→2026-04-02: +$71,456 |

**March 2020: B4's deepest episode.** The pool's own losses deepen the core's fall (C0 −31.6% in that episode) to
−34.6%, through:
- the KRE lots of 9 March (−$9.7k at portfolio scale) and 18 March (−$10.3k);
- a few small XBI losses.

**March 2020: B5.** Its episode ends earlier (trough 12 March), because GDX's gains from 16 March offset the core.

**2022:** after a KRE lot carried in from December 2021, both pools' lots were mostly brief XBI long trades. They earned
money while the core fell, so at the frozen parameters the overlay **reduced** the 2022 drawdown (B4
27.02%, B5 26.45%, against C0's 33.89%). The parameter neighbours do not
reproduce these 2022 gains (`PARAMETER_STABILITY.md`).

**2025 and the 2018 Q4 selloff:** a single VGT lot each, small relative to the core's fall.

## Trades responsible for B5's advantage over B4

These are the GDX lots, all funded only in B5. Together they exceed the whole B5 − B4 difference (see
`ETF_ABLATION.md` for the full bridge, including displaced lots):

| # | Entry | Exit | Exit reason | Regime | Net |
|---:|---|---|---|---|---:|
| 1 | 2020-03-16 | 2020-03-18 | trailing stop | R2 | +$37,416 |
| 2 | 2026-08-03 | 2026-08-31 | trailing stop | outside R1–R4 | +$31,646 |
| 3 | 2020-04-01 | 2020-04-15 | trailing stop gap | R2 | +$27,571 |
| 4 | 2024-02-13 | 2024-04-15 | trailing stop | R3 | +$24,581 |
| 5 | 2023-02-24 | 2023-04-21 | trailing stop | R3 | +$23,559 |
| 6 | 2022-11-03 | 2022-12-15 | trailing stop | R3 | +$22,376 |
| 7 | 2020-03-23 | 2020-03-27 | trailing stop gap | R2 | +$16,091 |
| 8 | 2020-03-19 | 2020-03-20 | trailing stop gap | R2 | +$10,921 |
| 9 | 2026-03-19 | 2026-04-02 | trailing stop gap | outside R1–R4 | +$9,359 |
| 10 | 2023-10-04 | 2023-10-31 | trailing stop | R3 | +$7,803 |
| 11 | 2026-06-09 | 2026-06-18 | trailing stop | outside R1–R4 | +$4,782 |
| 12 | 2022-09-16 | 2022-10-10 | trailing stop gap | R3 | +$2,048 |
| 13 | 2022-09-07 | 2022-09-15 | trailing stop | R3 | +$1,771 |
| 14 | 2026-07-13 | 2026-07-31 | maximum hold | outside R1–R4 | +$27 |
| 15 | 2026-05-19 | 2026-06-08 | maximum hold | outside R1–R4 | −$6,711 |
| 16 | 2026-06-22 | 2026-07-10 | maximum hold | outside R1–R4 | −$8,015 |

16 GDX lots in 9.33 years of arming is about 1.7 a year.
- The top five provide 71.7% of B5's advantage.
- Four March–April 2020 lots provide about $92k.
- Two 2026 maximum-hold losses (−$8.0k, −$6.7k) are the only GDX losers.

**Statistical restraint.** These lots are not independent observations:
- the four 2020 lots are one episode;
- the 2022–2024 lots are one gold-miner rally.

The effective sample behind the GDX increment is therefore a few episodes, not 16 trades. No significance test or
confidence interval is computed from them.
