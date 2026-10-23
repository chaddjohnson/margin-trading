# Baseline reproduction

Generated inputs: `results/baseline/VGT/parity.json` + `parity.md` (`npm run multi-etf-d1 -- parity`),
`results/baseline/benchmark.json` + `benchmark.md` and the per-ticker directories `results/baseline/<TICKER>/`
(`d1-development/`: the engine from the eligibility session; `d1-file-native/`: the engine from session 74;
`file-output/`: the D1 file's own trades.csv, daily.csv, setups.csv and summary.json) from
`npm run multi-etf-d1 -- benchmark`, both run on 2026-10-23 on development data only (the file was given
`endDate = 2023-12-31`).

## 1. VGT regression control: the unchanged D1 file reproduces the prior figures exactly

The D1 file (`src/app/allIn-trailingBuy-postExitContinuation.ts`, untouched: `git diff` shows no change) was run through
its exported `runAllIn` on the full VGT file (`600322af…`, 2,459 sessions 2016-01-04 → 2025-10-13) with its defaults,
stop fills, 11%, $100,000 per entry.

File: `src/app/allIn-trailingBuy-postExitContinuation.ts` on `data/VGT/VGT-2016-2025-1-minute.csv` (sha256 `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f`), 2459 sessions 2016-01-04 → 2025-10-13, stop fills, 11%, $100,000 per entry.

| Figure | File (this run) | Prior reference | Match |
|---|---:|---:|---|
| Net profit | $183043.82 | $183043.82 | yes |
| Minute-sampled maximum drawdown | $19330.69 | $19330.69 | yes |
| Entries (including the open one) | 20 | 20 | yes |

Engine, arming from session 74 as the file: identical on every trade field, the totals and both drawdowns (20 trades).

Engine, arming from the common eligibility session 2017-06-15 (index 365): identical to the file (20 trades).

Development window (2017-06-15 → 2023-12-29): net $137,223, minute DD $19,331, 17 entries. 2024-01-02 → 2025-10-13 (previously inspected by earlier programs, not a holdout of this one): net $45,821.

## Trades (engine, eligibility run)

1. 2018-12-21 160.42 → 2019-05-13 200.02 (trailing stop) $20,375
2. 2019-08-05 203.65 → 2020-02-24 252.18 (trailing stop gap) $17,713
3. 2020-02-28 226.94 → 2020-03-06 232.86 (trailing stop) $2,398
4. 2020-03-12 205.22 → 2020-03-20 198.64 (maximum hold) −$3,447
5. 2020-03-23 185.73 → 2020-04-01 203.18 (trailing stop) $9,125
6. 2020-04-02 202.36 → 2020-09-04 315.87 (trailing stop) $51,420
7. 2020-10-28 304.01 → 2021-02-23 354.79 (trailing stop) $13,147
8. 2021-03-05 337.17 → 2021-05-11 355.50 (trailing stop gap) $3,419
9. 2022-03-14 367.27 → 2022-04-07 398.20 (trailing stop) $7,698
10. 2022-04-26 366.26 → 2022-05-06 363.42 (maximum hold) −$1,077
11. 2022-05-12 332.71 → 2022-06-10 342.66 (trailing stop) $2,116
12. 2022-06-13 328.51 → 2022-06-21 325.72 (maximum hold) −$1,092
13. 2022-06-22 324.92 → 2022-07-01 326.24 (maximum hold) $135
14. 2022-07-05 322.29 → 2022-08-26 363.01 (trailing stop) $11,068
15. 2022-09-16 329.27 → 2022-09-26 319.77 (maximum hold) −$3,187
16. 2022-10-10 306.40 → 2022-11-03 310.69 (trailing stop) $676
17. 2022-11-04 306.91 → 2022-12-15 331.37 (trailing stop) $6,736
18. 2025-04-04 491.58 → 2025-04-10 498.62 (trailing stop) $1,252
19. 2025-04-11 507.00 → 2025-04-21 497.68 (maximum hold) −$2,141
20. 2025-04-22 497.19 → open $46,709


The engine of this program (`src/d1-refinement/engine.ts` with the additive, default-off cost option, plus
`src/trailing-buy-variants/accounting.ts`) reproduces every trade field (entry and exit session, minute, price,
execution, decision time, path, reason, profit, interest), the realized/unrealized partition, the interest and both
drawdowns, whether it arms from session 74 as the file does or from the common eligibility session 2017-06-15 (D1's
first VGT trade is 2018-12-21, so the two conventions give the same 20 trades on VGT). The d1-refinement test suite
(16 tests) still passes with the cost option in place.

## 2. The eight tickers: file parity and the development benchmark

Same file, same engine, same settings, through the last 2023 session (2023-12-29); nothing later was read. The primary
benchmark arms from 2017-06-15 on every ticker (PROTOCOL.md section 3); the file's own convention (session 74) is run
as the parity check and the two are compared trade by trade.

## File parity (the file as shipped, arming from session 74, through the last 2023 session)

| Ticker | File trades | Engine trades | File net | Engine net | File minute DD | Engine minute DD | Differences |
|---|---:|---:|---:|---:|---:|---:|---|
| XBI | 47 | 47 | $48,666 | $48,666 | $68,829 | $68,829 | none |
| IWM | 12 | 12 | $13,778 | $13,778 | $39,694 | $39,694 | none |
| XRT | 34 | 34 | $41,132 | $41,132 | $41,800 | $41,800 | none |
| KRE | 32 | 32 | $4,950 | $4,950 | $55,799 | $55,799 | none |
| XLY | 17 | 17 | $72,921 | $72,921 | $29,065 | $29,065 | none |
| IWN | 10 | 10 | $20,255 | $20,255 | $41,879 | $41,879 | none |
| XLF | 16 | 16 | $35,331 | $35,331 | $32,211 | $32,211 | none |
| XLE | 32 | 32 | $26,974 | $26,974 | $72,402 | $72,402 | none |

## Development benchmark (eligibility 2017-06-15, the primary control)

| Ticker | Net | Realized / unrealized | Interest | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net without best | Exposure | Avg hold | Exit reasons |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| XBI | $35,145 | open at the end | $21,488 | $68,829 | $65,514 | 45 (1 open) | 16/28 | −$12,431 | −$14,875 | $34,213 | $932 | 30% | 16 d | buffered intraday loss 3, maximum hold 26, trailing stop 13, trailing stop gap 2, open 1 |
| IWM | $13,778 | all closed | $11,060 | $39,694 | $35,112 | 12 | 6/6 | −$21,101 | −$24,239 | $14,016 | −$239 | 15% | 31 d | maximum hold 6, trailing stop 3, trailing stop gap 3 |
| XRT | $41,132 | all closed | $20,825 | $41,800 | $38,237 | 34 | 14/20 | −$19,037 | −$22,154 | $17,696 | $23,436 | 29% | 20 d | maximum hold 16, trailing stop 12, trailing stop gap 3, buffered intraday loss 3 |
| KRE | $4,950 | all closed | $13,923 | $55,799 | $50,242 | 32 | 15/17 | −$19,646 | −$22,386 | $16,604 | −$11,653 | 19% | 14 d | maximum hold 19, trailing stop 12, trailing stop gap 1 |
| XLY | $72,921 | all closed | $15,942 | $29,065 | $23,162 | 17 | 9/8 | −$7,776 | −$18,562 | $29,527 | $43,394 | 22% | 31 d | trailing stop gap 2, maximum hold 8, trailing stop 7 |
| IWN | $20,255 | all closed | $7,775 | $41,879 | $38,032 | 10 | 5/5 | −$21,857 | −$23,311 | $20,462 | −$206 | 11% | 26 d | maximum hold 5, trailing stop 2, trailing stop gap 3 |
| XLF | $20,729 | all closed | $9,041 | $32,211 | $30,762 | 14 | 6/8 | −$12,084 | −$18,686 | $17,034 | $3,694 | 12% | 21 d | trailing stop 3, maximum hold 7, trailing stop gap 4 |
| XLE | $26,974 | all closed | $19,107 | $72,402 | $69,371 | 32 | 12/20 | −$35,785 | −$35,900 | $23,616 | $3,358 | 26% | 20 d | maximum hold 20, trailing stop 10, trailing stop gap 2 |

## Net by calendar year (eligibility run)

| Ticker | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| XBI | $0 (0e) | −$16,266 (6e) | $19,100 (3e) | $27,568 (5e) | −$6,968 (9e) | −$31,049 (16e) | $42,759 (6e) |
| IWM | $0 (0e) | −$3,525 (2e) | $6,406 (1e) | $7,248 (6e) | $0 (0e) | $3,649 (3e) | $0 (0e) |
| XRT | $0 (0e) | −$3,055 (2e) | −$844 (1e) | $19,200 (5e) | $21,139 (4e) | $939 (17e) | $3,752 (5e) |
| KRE | $0 (0e) | −$7,285 (3e) | $9,322 (1e) | $25,066 (14e) | $0 (0e) | −$939 (4e) | −$21,214 (10e) |
| XLY | $0 (0e) | $7,338 (1e) | $9,685 (0e) | $30,417 (3e) | $0 (0e) | $13,461 (13e) | $12,020 (0e) |
| IWN | $0 (0e) | −$194 (2e) | $5,999 (1e) | $14,450 (7e) | $0 (0e) | $0 (0e) | $0 (0e) |
| XLF | $0 (0e) | $4,127 (1e) | $3,175 (0e) | $14,322 (7e) | $0 (0e) | −$895 (6e) | $0 (0e) |
| XLE | $0 (0e) | −$9,877 (2e) | $6,258 (1e) | −$3,883 (21e) | $7,674 (1e) | $26,802 (7e) | $0 (0e) |

## Arming conventions: the file (session 74) against the eligibility session (365)

| Ticker | File-convention net | Eligibility net | Preserved | Altered | Gained | Lost | Lost trades | Gained trades |
|---|---:|---:|---:|---:|---:|---:|---|---|
| XBI | $35,145 | $35,145 | 45 | 0 | 0 | 2 | 2016-11-03 → 2016-11-23; 2016-12-08 → 2016-12-22 |  |
| IWM | $13,778 | $13,778 | 12 | 0 | 0 | 0 |  |  |
| XRT | $41,132 | $41,132 | 34 | 0 | 0 | 0 |  |  |
| KRE | $4,950 | $4,950 | 32 | 0 | 0 | 0 |  |  |
| XLY | $72,921 | $72,921 | 17 | 0 | 0 | 0 |  |  |
| IWN | $20,255 | $20,255 | 10 | 0 | 0 | 0 |  |  |
| XLF | $20,729 | $20,729 | 14 | 0 | 0 | 2 | 2016-09-19 → 2016-09-27; 2016-09-28 → 2017-03-22 |  |
| XLE | $26,974 | $26,974 | 32 | 0 | 0 | 0 |  |  |

## XLF: exposure of the rolling reference high to the 2016-09-19 distribution (sessions after eligibility)

| Lookback L | Sessions whose rolling high is a pre-distribution high | Last such session | Largest distortion of the high |
|---:|---:|---|---:|
| 150 | 0 | — | 0.0% |
| 160 | 0 | — | 0.0% |
| 170 | 0 | — | 0.0% |
| 180 | 0 | — | 0.0% |
| 190 | 0 | — | 0.0% |
| 200 | 0 | — | 0.0% |
| 210 | 0 | — | 0.0% |
| 220 | 0 | — | 0.0% |
| 230 | 0 | — | 0.0% |
| 240 | 0 | — | 0.0% |
| 250 | 0 | — | 0.0% |


## 3. Reading the benchmark

- **Parity holds on every ticker**: the engine arming from session 74 equals the file on every trade, the totals and
  both drawdowns (8 of 8). The eligibility convention changes nothing on six tickers and removes only pre-2017-06-15
  trades on XBI (two 2016 trades) and XLF (the two trades armed by the 2016-09-19 distribution gap); every later trade
  is preserved.
- **Unchanged D1 is weak on sector ETFs.** Over 6.5 development years it nets $5k (KRE) to $73k (XLY) against $100,000
  of borrowed principal, with minute-sampled drawdowns of $29k (XLY) and $32k (XLF) and **$40k–$72k on the other six**,
  so six of eight breach the $35,000 screening constraint before any optimization. The exits are dominated by the
  maximum-hold loss exit (XBI 26 of 44 closed trades, XLE 20 of 32, KRE 19 of 32), the pattern of a dip rule whose 7.3%
  stop never becomes active because the rebound does not come: sector ETFs mean-revert less cleanly than VGT did.
- **Profit concentration**: XBI's net without its best trade is $932, IWM's and IWN's are negative, KRE's −$11,653;
  only XLY and XRT keep a majority of their net without the best trade. Year by year, 2020 is the only year positive
  on every ticker; 2018 is negative on six.
- **Sample sizes**: 10 (IWN), 12 (IWM), 14 (XLF) and 17 (XLY) entries in 6.5 years are thin; 32–45 on XBI, XRT,
  KRE, XLE are not, but most of those are losing hold-day exits.
- These are development-window figures of the *control*. The full-horizon figures of frozen D1 (including 2024–2025)
  are reported only in `HOLDOUT_RESULTS.md`, after the freeze.
