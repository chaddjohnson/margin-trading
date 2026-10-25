# Opportunity map (training only, descriptive)

`npm run portfolio-aware-d1 -- opportunity-map` → `results/opportunity/` (`opportunity.json`, `s0-lots.csv`,
`s0-signals.csv`, `representative-trades.csv`); tables in `results/tables/opportunity.md`. Everything here is
non-decisional: it explains the pool the candidates enter and what real D1 phenotypes do against it. All figures at
5 bps per side, fixed $100,000, 2017-06-15 → 2023-12-29. The earlier study's generic daily proxy (15%/2%/10%/20
sessions) is not used.

## 1. The S0 pool, minute by minute

S0 (All-lowDd) funds **71 lots out of 137 virtual trades** (66 signals refused) for **$242,196** net. A lot is held at
the close in 843 of 1,647 eligible sessions (51.2%); the pool is reserved or held 51.5% of calendar time. Every funded
lot (decision, fill and exit minute, reason, net) is in `s0-lots.csv`; every decision with its refusal reason and
holder in `s0-signals.csv`.

| Regime | Busy at close | Lots entered | Note |
|---|---:|---:|---|
| R1 2017-06-15 → 2018-01-25 | 0% | 0 | **idle**: no S0 book arms in the calm bull market |
| R2 Feb 2018 volatility shock | 0% | 0 | **idle** |
| R3 mid-2018 | 0% | 0 | **idle** |
| R4 Q4 2018 sell-off | 9.5% | 1 | the first S0 lot comes on 2018-12-21 |
| R5 2019 | 77.0% | 1 | one long VGT lot occupies most of the year |
| R6 early 2020 | 100% | 0 | |
| R7 COVID crash | 88.2% | 8 | |
| R8 2020 recovery | 92.4% | 6 | |
| R9 2021 | 46.4% | 6 | |
| R10 2022 bear market | 63.2% | 20 | KRE/XBI churn |
| R11 late-2022 rebound | 70.4% | 1 | |
| R12 2023 bank stress | 46.9% | 12 | KRE |
| R13 2023 H2 | 49.7% | 16 | |

- The longest idle gap is the first one, **2017-06-15 → 2018-12-21 (554 days)**; then 2019-05-13 → 2019-08-05 (84 d),
  2021-10-06 → 2021-12-21 (76 d), 2021-07-26 → 2021-09-22 (58 d). After 2019 the idle windows are short.
- Refusals inside S0 are dominated by **KRE refused while VGT holds (31)**; VGT itself is refused only 6 times.
- Busy share during each candidate's own major declines (below) is typically 60–100% from 2019 on: the crises that
  arm the candidates (Q4 2018, March 2020, 2022) are the crises that arm VGT, XBI, XRT and KRE.

## 2. Each candidate's declines and real D1 phenotypes against the pool

Declines: episodes ≥ 10% below the 74-session reference high, closing within 5% of it (daily, descriptive).
Representatives: unchanged D1 and, from the Stage A pool, the best Track S vector, the best Track P vector, and the
best Track-P-feasible vector of each stop class. Each virtual trade is classified at its decision minute: **busy**
(S0 holds or reserves the pool, so the trade is refused as a first-order matter), **idle-clean** (idle, and no S0
funded decision falls inside its holding interval), **idle-displacing** (idle, but it would block at least one S0
lot). "Funded" is the actual outcome of the complete chronological replay of S0 plus that book — which also funds
trades that were "busy" against S0 when an earlier candidate lot changed the later path.

| ETF | Declines | Representative | Virtual trades | Busy / idle-clean / idle-displacing | Funded | S0 lots displaced (their net) / gained | Δ@5 |
|---|---:|---|---:|---|---:|---|---:|
| GDX | 13 | unchanged D1 | 36 | 17 / 8 / 11 | 25 | 21 ($66,126) / 3 | +$3,992 |
| GDX | | best Track S (stop 5.0%) | 31 | 21 / 4 / 6 | 16 | 11 ($15,169) / 2 | +$55,373 |
| GDX | | **best Track P** (stop 9.1%) | 19 | 14 / 0 / 5 | 9 | 18 ($7,963) / 1 | **+$94,378** |
| GDX | | best P, medium stop | 68 | 36 / 17 / 15 | 40 | 35 ($60,711) / 5 | +$79,485 |
| XOP | 22 | unchanged D1 | 78 | 49 / 17 / 12 | 54 | 19 ($125,958) / 9 | +$48,199 |
| XOP | | **best Track P** (stop 9.4%) | 63 | 45 / 14 / 4 | 21 | 11 ($49,545) / 3 | **+$57,943** |
| XOP | | best P, tight stop | 89 | 69 / 15 / 5 | 28 | 6 ($41,142) / 4 | −$1,288 |
| XOP | | best P, medium stop | 22 | 16 / 3 / 3 | 7 | 5 ($22,657) / 0 | +$40,114 |
| XLE | 18 | unchanged D1 | 32 | 25 / 1 / 6 | 13 | 11 ($62,419) / 8 | −$42,190 |
| XLE | | best Track S (eight-ETF primary) | 23 | 22 / 0 / 1 | 1 | 2 ($2,186) / 0 | +$21,604 |
| XLE | | **best Track P** (stop 4.1%) | 70 | 55 / 10 / 5 | 17 | 11 ($19,377) / 5 | **+$62,732** |
| EWZ | 13 | unchanged D1 | 41 | 18 / 13 / 10 | 28 | 26 ($60,719) / 1 | −$107,571 |
| EWZ | | best Track S | 20 | 10 / 6 / 4 | 10 | 11 ($17,412) / 1 | +$10,980 |
| EWZ | | best Track P (stop 9.9%) | 45 | 30 / 14 / 1 | 15 | 2 ($2,186) / 1 | +$16,169 |
| TLT | 5 | unchanged D1 | 5 | 2 / 0 / 3 | 3 | 16 ($21,092) / 0 | −$16,748 |
| TLT | | best Track S | 9 | 5 / 0 / 4 | 6 | 9 ($32,841) / 2 | −$21,701 |
| TLT | | best Track P | 25 | 17 / 4 / 4 | 8 | 7 ($10,486) / 2 | −$10,393 |
| XLU | 9 | unchanged D1 | 7 | 5 / 0 / 2 | 4 | 5 ($59,754) / 16 | −$31,591 |
| XLU | | best Track P (stop 3.1%) | 25 | 18 / 2 / 5 | 8 | 8 ($65,034) / 18 | +$7,108 |
| GLD | 4 | unchanged D1 | 0 | — | 0 | — | $0 |
| GLD | | best Track P (stop 4.2%) | 28 | 17 / 5 / 6 | 18 | 9 ($7,865) / 2 | +$2,499 |

What the real phenotypes show that the generic proxy could not:

- **Most candidate signals are "busy" first-order, yet the full path can still pay.** Unchanged D1 on XOP has 49 of
  78 trades arriving while S0 holds the pool and displaces 19 S0 lots worth $125,958 — the complementary-ETF study's
  first-order bookkeeping called that −$117k — but the complete chronological replay gives **Δ = +$48,199**: once an
  XOP lot holds the pool, later S0 signals are refused and *later* XOP and S0 signals arrive at different times, so the
  first-order count of "displaced" lots is not their cost. The brief's insistence on the full path matters.
- **Where the Track P vectors' trades come from.** GDX's best Track P vector is funded 9 times: 3 in the COVID crash
  (R7), 1 in 2021, 3 in the 2022 bear market (R10), 2 in the late-2022 rebound (R11); none in the idle 2017–2018
  window (it arms on 26.9% declines from a 125-session high, which GDX did not reach while S0 was idle). XOP's and
  XLE's best Track P vectors, by contrast, take **idle-clean** trades in R1–R4 (XOP 9 funded, XLE 9 funded in
  2017–2018, when no S0 book arms) and then mostly busy-refused trades from 2019 on.
- **The S0 lots a candidate displaces are often cheap.** GDX's best Track P vector displaces 18 S0 lots whose net is
  only $7,963; EWZ's displaces 2 lots ($2,186). Displacing KRE/XBI churn in 2022 costs little; displacing VGT's
  large 2020–2021 lots costs a lot (XLE's unchanged D1: 11 displaced lots worth $62,419).
- **TLT and XLU rarely help.** TLT declines ≥ 10% only five times in training, three of them while S0 is busy; its
  phenotypes' funded lots displace more S0 value than they earn. XLU's one positive vector earns +$7,108 while
  displacing $65,034 of S0 lots and gaining 18 others — a churn, not a complement. GLD's declines are shallow (four
  ≥ 10%); unchanged D1 never arms.

## 3. Data validity per candidate

All seven files verified (DATA_AND_BASELINE_AUDIT.md): 2,710 sessions, every session with its 390 regular minutes in
the median, no sparse sessions, no zero-volume bars, daily dollar volume $0.56–1.26B. XOP's 1:4 reverse split
(2020-03-30) lies in training and is adjusted once (raw +287% → −3.2% adjusted overnight). XLE and XLU split 2:1 on
2025-12-05 (final window, adjusted once). Candidate lots are price-only: TLT (monthly income), XLU and XLE
(quarterly, ~3%), EWZ (semiannual, variable), XOP (quarterly, low), GDX (annual, low) and GLD (none) would receive
distributions while held; the evaluation bounds the omission. Bid/ask spreads are not measured (0–10 bps per side).
