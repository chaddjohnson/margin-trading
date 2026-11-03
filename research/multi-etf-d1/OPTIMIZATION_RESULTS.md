# Optimization results

Generated inputs: `results/search/<TICKER>/search.json` (Sobol summary, the five NSGA-II runs, every fold's selection
with the probed candidates), `results/selection/<TICKER>/selection.json` + `selection.md` + `pareto.csv` and the
per-role artifacts (`control/`, `primary/`, `alternate-lowDd/`: trades.csv, daily.csv, summary.json), and the tables
under `results/tables/` written by `npm run multi-etf-d1 -- report`. The search ran once per ticker on 2026-10-23
(13:05–13:17 UTC) under the budget of `PROTOCOL.md` section 6, after the protocol was written. The evaluation
checkpoints (`evaluations.jsonl`, ~75 MB per ticker) and the full candidate tables (`candidates.csv`) are kept locally
and git-ignored.

## 1. Coverage and budget use

| Ticker | Sobol unique / requested | GA per fold: generations, new simulations, stop | Candidates | Simulations | Final fold: feasible / beating D1 / distinct signatures | Probed (final) | Nominations | Box-edge parameters of nominations |
|---|---|---|---:|---:|---|---:|---:|---|
| XBI | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 32 gen, 3072, budget; fold3: 32 gen, 3072, budget; fold4: 32 gen, 3072, budget; final: 32 gen, 3072, budget | 22,378 | 22,378 | 10209 / 8080 / 6377 | 30 | 2 | primary: hold at min; alternate-lowDd: X at max |
| IWM | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 30 gen, 2880, stagnation; fold3: 32 gen, 3072, budget; fold4: 32 gen, 3072, budget; final: 12 gen, 1152, stagnation | 20,089 | 20,089 | 9830 / 8989 / 6570 | 20 | 2 | primary: none; alternate-lowDd: none |
| XRT | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 32 gen, 3072, budget; fold3: 32 gen, 3072, budget; fold4: 32 gen, 3072, budget; final: 32 gen, 3072, budget | 22,488 | 22,488 | 11669 / 7409 / 4886 | 20 | 2 | primary: none; alternate-lowDd: none |
| KRE | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 32 gen, 3072, budget; fold3: 32 gen, 3072, budget; fold4: 32 gen, 3072, budget; final: 32 gen, 3072, budget | 22,349 | 22,349 | 6824 / 5964 / 4028 | 20 | 2 | primary: none; alternate-lowDd: none |
| XLY | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 32 gen, 3072, budget; fold3: 32 gen, 3072, budget; fold4: 32 gen, 3072, budget; final: 32 gen, 3072, budget | 22,344 | 22,344 | 13045 / 945 / 529 | 20 | 2 | primary: none; alternate-lowDd: stop at min |
| IWN | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 32 gen, 3072, budget; fold3: 32 gen, 3072, budget; fold4: 12 gen, 1152, stagnation; final: 12 gen, 1152, stagnation | 17,841 | 17,841 | 13576 / 12392 / 6834 | 20 | 2 | primary: buffer at min; alternate-lowDd: none |
| XLF | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 32 gen, 3072, budget; fold3: 31 gen, 2976, stagnation; fold4: 12 gen, 1152, stagnation; final: 12 gen, 1152, stagnation | 18,163 | 18,163 | 12812 / 10899 / 6070 | 20 | 2 | primary: none; alternate-lowDd: none |
| XLE | 4096 / 4096 | fold1: 32 gen, 3072, budget; fold2: 32 gen, 3072, budget; fold3: 32 gen, 3072, budget; fold4: 32 gen, 3072, budget; final: 15 gen, 1440, stagnation | 20,306 | 20,306 | 10394 / 9727 / 6206 | 20 | 2 | primary: buffer at min; alternate-lowDd: buffer at min |


- Every ticker's design was the full 4,096 unique Sobol candidates (no duplicate on this grid) plus the D1 control;
  17,841–22,488 candidates were simulated per ticker in all (one simulation each).
- **The NSGA-II stage was budget-bound, not converged, on most folds**: 30 of the 40 fold runs stopped at the 3,000-run
  cap (32 generations × 96 children) rather than on hypervolume stagnation; the stagnation stops are the late folds of
  IWM, IWN, XLF and XLE, where the population had settled. The budget was the same for every ticker and was not
  extended after the fact (PROTOCOL.md 6.2). A larger budget would find higher in-sample nets; nothing in section 3
  suggests that would help out of sample.
- Beating frozen D1 in-sample is easy on seven tickers: 5,964–12,392 of the feasible candidates do (D1's development
  nets are $5k–$41k against $35k–$72k drawdowns). XLY is the exception: 945 of 13,045 feasible candidates beat D1's
  $72,921, D1 being near the top of its own feasible set there.
- **Box edges.** Five nominations sit on a bound (XBI primary hold 3 = min; XBI lowDd X 30.0% = max; XLY lowDd stop
  3.0% = min; IWN primary and both XLE nominations buffer 0.0% = min) and most of the others are within a few grid
  steps of one (stop 3.1–3.3% on IWM, KRE, XLY, IWN, XLF; X 29.7–29.9% on KRE, XLE; L 230–243 on KRE, IWN). The
  bounds were not widened (PROTOCOL.md 6.1): a 3% trailing stop is already inside one typical day of sector-ETF noise,
  and X above 30% would arm only in 2020 on most tickers. The edge-seeking itself is a finding: the in-sample optimum
  of this architecture on these ETFs is a very tight stop and a very deep dip, i.e. a different trading pattern from
  D1's, not a tuned D1.

## 2. What the search found (development window, 2017-06-15 → 2023-12-29)

| Ticker | Role | Parameters | Net | Δ vs D1 | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau | Sparse | WF pass |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| XBI | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $35,145 | — | $68,829 | $65,514 | 45 (1 open) | 16/28 | −$12,431 | −$14,875 | $34,213 | $932 | $21,488 | 30% | 16 d | — | no | — |
| XBI | primary | X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29 | $151,799 | +$116,653 | $27,885 | $25,741 | 24 | 7/17 | −$5,471 | −$8,912 | $63,681 | $88,117 | $20,252 | 28% | 28 d | pass (77% / 96% / min 23%) | no | yes |
| XBI | alternate-lowDd | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | $118,055 | +$82,910 | $12,837 | $10,948 | 29 | 21/8 | −$5,105 | −$7,953 | $14,981 | $103,074 | $5,425 | 7% | 6 d | pass (100% / 89% / min 62%) | no | no |
| IWM | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $13,778 | — | $39,694 | $35,112 | 12 | 6/6 | −$21,101 | −$24,239 | $14,016 | −$239 | $11,060 | 15% | 31 d | — | no | — |
| IWM | primary | X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127 | $120,856 | +$107,078 | $14,910 | $13,937 | 38 | 28/10 | −$6,256 | −$8,926 | $19,365 | $101,490 | $15,762 | 22% | 14 d | pass (100% / 96% / min 35%) | no | yes |
| IWM | alternate-lowDd | X 28.3% Y 0.5% L 211 stop 3.3% hold 13 buffer 5.9% P 5.5% W 96 | $106,642 | +$92,864 | $13,303 | $9,990 | 33 | 25/8 | −$2,475 | −$7,549 | $13,971 | $92,670 | $12,386 | 17% | 12 d | pass (100% / 97% / min 34%) | no | yes |
| XRT | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $41,132 | — | $41,800 | $38,237 | 34 | 14/20 | −$19,037 | −$22,154 | $17,696 | $23,436 | $20,825 | 29% | 20 d | — | no | — |
| XRT | primary | X 24.4% Y 2.0% L 49 stop 7.7% hold 9 buffer 2.8% P 6.5% W 103 | $145,468 | +$104,336 | $23,383 | $20,451 | 24 | 14/10 | −$15,167 | −$18,925 | $68,743 | $76,725 | $17,841 | 25% | 25 d | pass (97% / 93% / min 25%) | no | yes |
| XRT | alternate-lowDd | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120 | $127,705 | +$86,574 | $19,966 | $17,945 | 18 | 11/7 | −$8,060 | −$19,663 | $63,659 | $64,046 | $16,214 | 23% | 30 d | pass (100% / 97% / min 21%) | no | no |
| KRE | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $4,950 | — | $55,799 | $50,242 | 32 | 15/17 | −$19,646 | −$22,386 | $16,604 | −$11,653 | $13,923 | 19% | 14 d | — | no | — |
| KRE | primary | X 29.9% Y 2.8% L 233 stop 3.1% hold 5 buffer 2.8% P 9.4% W 100 | $171,785 | +$166,835 | $26,271 | $25,333 | 70 | 44/26 | −$19,601 | −$19,626 | $17,228 | $154,557 | $15,370 | 21% | 7 d | pass (100% / 89% / min 68%) | no | yes |
| KRE | alternate-lowDd | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | $158,512 | +$153,562 | $22,725 | $20,903 | 73 | 42/31 | −$10,004 | −$18,031 | $17,228 | $141,284 | $14,586 | 20% | 7 d | pass (93% / 88% / min 73%) | no | yes |
| XLY | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $72,921 | — | $29,065 | $23,162 | 17 | 9/8 | −$7,776 | −$18,562 | $29,527 | $43,394 | $15,942 | 22% | 31 d | — | no | — |
| XLY | primary | X 21.3% Y 3.5% L 112 stop 3.1% hold 10 buffer 0.8% P 8.4% W 175 | $112,490 | +$39,569 | $16,972 | $15,420 | 30 (1 open) | 26/3 | −$10,336 | −$10,609 | $15,121 | $97,369 | $13,592 | 19% | 15 d | pass (97% / 98% / min 32%) | no | no |
| XLY | alternate-lowDd | X 21.4% Y 4.1% L 126 stop 3.0% hold 6 buffer 1.4% P 9.1% W 188 | $86,163 | +$13,243 | $11,366 | $9,588 | 34 | 26/8 | −$5,118 | −$7,656 | $11,399 | $74,764 | $10,518 | 15% | 10 d | pass (100% / 89% / min 55%) | no | no |
| IWN | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,255 | — | $41,879 | $38,032 | 10 | 5/5 | −$21,857 | −$23,311 | $20,462 | −$206 | $7,775 | 11% | 26 d | — | no | — |
| IWN | primary | X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191 | $111,181 | +$90,925 | $16,875 | $13,033 | 38 | 22/16 | −$6,537 | −$11,608 | $16,407 | $94,774 | $10,729 | 15% | 9 d | pass (100% / 91% / min 56%) | no | yes |
| IWN | alternate-lowDd | X 27.4% Y 0.4% L 96 stop 3.5% hold 4 buffer 5.9% P 12.7% W 191 | $84,673 | +$64,418 | $15,180 | $12,040 | 22 | 15/7 | −$6,537 | −$6,537 | $19,324 | $65,349 | $5,364 | 7% | 8 d | pass (100% / 89% / min 12%) | no | yes |
| XLF | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,729 | — | $32,211 | $30,762 | 14 | 6/8 | −$12,084 | −$18,686 | $17,034 | $3,694 | $9,041 | 12% | 21 d | — | no | — |
| XLF | primary | X 25.4% Y 1.6% L 200 stop 4.0% hold 8 buffer 0.6% P 4.1% W 19 | $121,499 | +$100,770 | $17,071 | $13,399 | 30 | 21/9 | −$3,917 | −$12,261 | $25,454 | $96,045 | $20,011 | 28% | 22 d | pass (100% / 90% / min 32%) | no | no |
| XLF | alternate-lowDd | X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.8% P 7.3% W 15 | $99,222 | +$78,494 | $12,762 | $7,771 | 30 | 20/10 | −$6,702 | −$8,055 | $13,566 | $85,656 | $11,693 | 16% | 13 d | pass (96% / 93% / min 66%) | no | no |
| XLE | control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $26,974 | — | $72,402 | $69,371 | 32 | 12/20 | −$35,785 | −$35,900 | $23,616 | $3,358 | $19,107 | 26% | 20 d | — | no | — |
| XLE | primary | X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47 | $154,448 | +$127,473 | $24,861 | $24,453 | 23 | 16/7 | −$9,596 | −$16,743 | $35,262 | $119,185 | $11,181 | 16% | 16 d | pass (86% / 92% / min 37%) | no | no |
| XLE | alternate-lowDd | X 29.7% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.2% W 62 | $120,741 | +$93,766 | $22,438 | $21,331 | 25 | 18/7 | −$9,596 | −$16,743 | $18,475 | $102,266 | $6,630 | 9% | 9 d | pass (89% / 96% / min 72%) | no | no |


Reading: the primaries raise the development net by $40k (XLY) to $167k (KRE) and cut the minute-sampled drawdown to
$15k–$28k on every ticker, all with the plateau check passed (≥ 77% of one-parameter probes feasible, median probe net
≥ 89% of the candidate's). Two patterns dominate:

- **tight-stop scalps** (IWM, KRE, XLY, IWN, XLF primaries and most alternates: stop 3.0–4.0%, hold 4–11 days,
  33–73 entries, 7–22-day average hold, 21/9 to 44/26 win/loss): they buy the same deep dips D1 does, take a 3%
  rebound and re-enter on the continuation window; they win often and small, and their edge is the absence of D1's
  long losing holds through 2020 and 2022;
- **deep-dip trend rides** (XBI, XRT, XLE primaries: X 24–29%, stop 6.5–10.4%, 23–24 entries, 16–28-day holds, more
  losers than winners on XBI): a few large winners (XBI's best trade $63,681 is 42% of its net; XRT's $68,743 is 47%).

Profit concentration is much lower than D1's for the scalp phenotypes (net without the best trade 77–90% of the net)
and comparable to D1's for the trend rides (XBI 58%, XRT 53%). No nomination is sparse (fewer than 10 closed trades).
No `maxNet` alternate exists on any ticker: on every final fold the primary was itself the highest-net plateau
candidate, either inside the preferred $25,000 band (IWM, XLY, IWN, XLF) or because no plateau candidate above the band
beat it (XBI, XRT, KRE, XLE, whose primaries have DD $23k–$28k).

## 3. Chronological walk-forward of the selection rule (inside 2016–2023)

The rule of PROTOCOL.md section 7 was applied to each fold's pool on the training window alone and its picks were
attributed to the following calendar year; frozen D1 is the comparator on the same window.

| Ticker | Fold | Validation | D1 | primary | lowDd | maxNet |
|---|---|---|---|---|---|---|
| XBI | fold1 | 2020-01-02 → 2020-12-31 | $27,568 / $17,127 / 5e | $22,816 / $17,875 / 2e | $2,358 / $28,135 / 3e | none |
| XBI | fold2 | 2021-01-04 → 2021-12-31 | −$6,968 / $22,100 / 9e | $12,977 / $20,789 / 3e | $4,375 / $20,388 / 8e | none |
| XBI | fold3 | 2022-01-03 → 2022-12-30 | −$31,049 / $53,033 / 16e | $3,471 / $34,002 / 11e | $16,351 / $26,180 / 10e | none |
| XBI | fold4 | 2023-01-03 → 2023-12-29 | $42,759 / $17,385 / 6e | $0 / $0 / 0e | $0 / $0 / 0e | none |
| IWM | fold1 | 2020-01-02 → 2020-12-31 | $7,248 / $30,396 / 6e | $10,326 / $40,162 / 10e | $21,095 / $24,306 / 13e | none |
| IWM | fold2 | 2021-01-04 → 2021-12-31 | $0 / $0 / 0e | $15,249 / $36,609 / 0e | $0 / $0 / 0e | none |
| IWM | fold3 | 2022-01-03 → 2022-12-30 | $3,649 / $15,154 / 3e | −$15,395 / $20,776 / 1e | $8,302 / $14,206 / 9e | none |
| IWM | fold4 | 2023-01-03 → 2023-12-29 | $0 / $0 / 0e | $3,975 / $4,856 / 1e | $0 / $0 / 0e | none |
| XRT | fold1 | 2020-01-02 → 2020-12-31 | $19,200 / $32,939 / 5e | $48,075 / $47,440 / 9e | $25,388 / $20,069 / 4e | none |
| XRT | fold2 | 2021-01-04 → 2021-12-31 | $21,139 / $10,595 / 4e | $58,574 / $71,713 / 1e | $38,626 / $50,799 / 1e | none |
| XRT | fold3 | 2022-01-03 → 2022-12-30 | $939 / $25,214 / 17e | $1,033 / $10,355 / 3e | −$24,487 / $38,579 / 9e | −$5,898 / $19,856 / 4e |
| XRT | fold4 | 2023-01-03 → 2023-12-29 | $3,752 / $11,641 / 5e | $0 / $0 / 0e | $0 / $0 / 0e | $0 / $0 / 0e |
| KRE | fold1 | 2020-01-02 → 2020-12-31 | $25,066 / $48,496 / 14e | $21,268 / $40,091 / 19e | $40,172 / $28,523 / 22e | none |
| KRE | fold2 | 2021-01-04 → 2021-12-31 | $0 / $0 / 0e | $0 / $0 / 0e | $0 / $0 / 0e | none |
| KRE | fold3 | 2022-01-03 → 2022-12-30 | −$939 / $11,307 / 4e | −$3,526 / $14,869 / 1e | $0 / $0 / 0e | none |
| KRE | fold4 | 2023-01-03 → 2023-12-29 | −$21,214 / $47,949 / 10e | −$1,694 / $44,728 / 28e | $11,612 / $41,811 / 31e | none |
| XLY | fold1 | 2020-01-02 → 2020-12-31 | $30,417 / $20,891 / 3e | −$5,116 / $39,615 / 7e | $10,043 / $35,120 / 6e | none |
| XLY | fold2 | 2021-01-04 → 2021-12-31 | $0 / $0 / 0e | −$9,012 / $22,655 / 0e | −$557 / $10,915 / 1e | none |
| XLY | fold3 | 2022-01-03 → 2022-12-30 | $13,461 / $19,408 / 13e | −$39,055 / $49,182 / 20e | −$15,838 / $30,983 / 12e | none |
| XLY | fold4 | 2023-01-03 → 2023-12-29 | $12,020 / $9,586 / 0e | $0 / $0 / 0e | $4,070 / $3,866 / 1e | $12,091 / $9,555 / 1e |
| IWN | fold1 | 2020-01-02 → 2020-12-31 | $14,450 / $31,984 / 7e | $3,844 / $19,357 / 26e | $18,108 / $32,309 / 23e | none |
| IWN | fold2 | 2021-01-04 → 2021-12-31 | $0 / $0 / 0e | $7,747 / $4,534 / 2e | $0 / $0 / 0e | none |
| IWN | fold3 | 2022-01-03 → 2022-12-30 | $0 / $0 / 0e | $17,499 / $12,539 / 9e | $742 / $5,167 / 2e | none |
| IWN | fold4 | 2023-01-03 → 2023-12-29 | $0 / $0 / 0e | −$3,034 / $4,807 / 1e | −$3,316 / $4,793 / 1e | none |
| XLF | fold1 | 2020-01-02 → 2020-12-31 | $14,322 / $27,419 / 7e | −$10,344 / $47,065 / 13e | −$18,272 / $46,748 / 10e | none |
| XLF | fold2 | 2021-01-04 → 2021-12-31 | $0 / $0 / 0e | $11,303 / $5,999 / 2e | $0 / $0 / 0e | none |
| XLF | fold3 | 2022-01-03 → 2022-12-30 | −$895 / $14,020 / 6e | $8,624 / $7,972 / 7e | $11,183 / $10,524 / 8e | none |
| XLF | fold4 | 2023-01-03 → 2023-12-29 | $0 / $0 / 0e | $0 / $0 / 0e | $0 / $0 / 0e | none |
| XLE | fold1 | 2020-01-02 → 2020-12-31 | −$3,883 / $61,928 / 21e | −$19,195 / $64,090 / 8e | −$43,454 / $68,327 / 10e | none |
| XLE | fold2 | 2021-01-04 → 2021-12-31 | $7,674 / $14,690 / 1e | $0 / $0 / 0e | $0 / $0 / 0e | none |
| XLE | fold3 | 2022-01-03 → 2022-12-30 | $26,802 / $17,239 / 7e | $32,608 / $9,643 / 3e | $0 / $0 / 0e | none |
| XLE | fold4 | 2023-01-03 → 2023-12-29 | $0 / $0 / 0e | $0 / $0 / 0e | $0 / $0 / 0e | none |

| Ticker | D1 stitched | primary stitched (folds ≥ D1 / folds with a pick) | lowDd stitched | maxNet stitched |
|---|---:|---|---|---|
| XBI | $32,311 | $39,264 (2/4; pass) | $23,084 (2/4; fail) | $0 (0/0; fail) |
| IWM | $10,897 | $14,154 (3/4; pass) | $29,398 (4/4; pass) | $0 (0/0; fail) |
| XRT | $45,030 | $107,683 (3/4; pass) | $39,526 (2/4; fail) | −$5,898 (0/2; fail) |
| KRE | $2,913 | $16,047 (2/4; pass) | $51,784 (4/4; pass) | $0 (0/0; fail) |
| XLY | $55,897 | −$53,182 (0/4; fail) | −$2,282 (0/4; fail) | $12,091 (1/1; fail) |
| IWN | $14,450 | $26,055 (2/4; pass) | $15,534 (3/4; pass) | $0 (0/0; fail) |
| XLF | $13,427 | $9,584 (3/4; fail) | −$7,089 (3/4; fail) | $0 (0/0; fail) |
| XLE | $30,593 | $13,414 (2/4; fail) | −$43,454 (1/4; fail) | $0 (0/0; fail) |


Reading, with the caveat that every validation year holds 0–28 entries:

- The **primary rule passes on five tickers** (XBI, IWM, XRT, KRE, IWN: stitched 2020–2023 net above D1's and at
  least two of four years not below D1's) and **fails on three** (XLY: −$53,182 against D1's +$55,897, every year
  worse; XLF: 3 of 4 years better but stitched $9,584 against $13,427, the 2020 pick losing $10,344; XLE: $13,414
  against $30,593).
- The picks are unstable across folds. The XBI pick changes phenotype every year (hold 17 → 3, stop 6.4 → 10.4,
  X 23 → 29%); IWM's goes from a 3.5% stop to a 15% stop and back; XRT's 2021 pick (stop 12.1%) rides one trade for
  $58,574 and its 2022 pick nets $1,033. The lowDd rule passes on IWM, KRE and IWN only.
- Several validation years have **no trade for either side** (2021 and 2023 on four tickers), so "≥ D1" is often a
  tie at zero. The rule's apparent success on 2020 and 2022 is one deep-dip episode each.
- Conclusion before the holdout: the development improvements are large, the plateaus are real in-sample, but the rule
  that produced them did not reliably beat frozen D1 one year ahead even inside the development data. This was known,
  and recorded in `FROZEN_SELECTION.md`, before any 2024–2025 figure was computed.

## 4. Per-fold detail



| Ticker | Fold | Pool | Feasible | Beating D1 | primary | lowDd | maxNet |
|---|---|---:|---:|---:|---|---|---|
| XBI | fold1 | 7169 | 5525 | 4845 | X 23.4% Y 2.2% L 41 stop 6.4% hold 17 buffer 2.6% P 19.9% W 196: $61,470 / DD $9,456 / 4e; plateau 100% / 99% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 25.9% Y 2.8% L 64 stop 4.2% hold 18 buffer 2.5% P 14.9% W 188: $47,519 / DD $6,344 / 6e; plateau 100% / 100% |
| XBI | fold2 | 10794 | 8254 | 5506 | X 24.4% Y 1.2% L 22 stop 10.4% hold 3 buffer 4.3% P 8.5% W 45: $117,155 / DD $24,195 / 5e; plateau 100% / 99% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 19.0% Y 0.9% L 30 stop 3.1% hold 12 buffer 2.5% P 8.2% W 64: $90,857 / DD $10,145 / 21e; plateau 100% / 98% |
| XBI | fold3 | 14449 | 11025 | 9098 | X 28.7% Y 0.6% L 52 stop 10.4% hold 3 buffer 3.8% P 9.9% W 28: $136,200 / DD $20,014 / 5e; plateau 97% / 96% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 29.9% Y 0.7% L 63 stop 6.4% hold 16 buffer 0.4% P 8.2% W 31: $107,727 / DD $13,787 / 13e; plateau 100% / 72% |
| XBI | fold4 | 18087 | 7346 | 7293 | X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29: $151,799 / DD $27,885 / 24e; plateau 77% / 96% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 29.7% Y 1.0% L 62 stop 3.1% hold 5 buffer 0.6% P 8.2% W 36: $117,095 / DD $15,051 / 34e; plateau 100% / 87% |
| XBI | final | 21691 | 10209 | 8080 | X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29: $151,799 / DD $27,885 / 24e; plateau 77% / 96% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54: $118,055 / DD $12,837 / 29e; plateau 100% / 89% |
| IWM | fold1 | 7169 | 4515 | 3014 | X 27.2% Y 0.1% L 142 stop 3.5% hold 17 buffer 0.0% P 8.3% W 70: $33,379 / DD $6,432 / 3e; plateau 85% / 98% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 26.0% Y 0.3% L 232 stop 3.1% hold 6 buffer 3.9% P 9.3% W 98: $26,817 / DD $4,471 / 3e; plateau 87% / 100% |
| IWM | fold2 | 10621 | 6339 | 5523 | X 27.6% Y 0.1% L 95 stop 14.9% hold 3 buffer 0.3% P 4.8% W 69: $77,837 / DD $20,676 / 3e; plateau 92% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 27.3% Y 0.7% L 130 stop 3.3% hold 8 buffer 2.7% P 9.4% W 81: $66,410 / DD $13,303 / 14e; plateau 93% / 99% |
| IWM | fold3 | 14228 | 7503 | 6724 | X 29.7% Y 0.7% L 21 stop 15.0% hold 5 buffer 4.5% P 12.8% W 96: $81,450 / DD $34,820 / 4e; plateau 81% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 24.7% Y 0.4% L 159 stop 3.4% hold 13 buffer 3.8% P 8.2% W 98: $61,998 / DD $13,303 / 21e; plateau 93% / 100% |
| IWM | fold4 | 17856 | 8107 | 7241 | X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127: $116,881 / DD $14,910 / 37e; plateau 100% / 96% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 24.8% Y 0.5% L 134 stop 3.2% hold 13 buffer 3.9% P 7.0% W 128: $98,491 / DD $13,303 / 29e; plateau 97% / 99% |
| IWM | final | 19588 | 9830 | 8989 | X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127: $120,856 / DD $14,910 / 38e; plateau 100% / 96% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 28.3% Y 0.5% L 211 stop 3.3% hold 13 buffer 5.9% P 5.5% W 96: $106,642 / DD $13,303 / 33e; plateau 100% / 97% |
| XRT | fold1 | 7169 | 5137 | 4144 | X 21.4% Y 0.3% L 241 stop 5.7% hold 21 buffer 0.1% P 5.9% W 36: $36,460 / DD $16,086 / 10e; plateau 100% / 92% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 27.1% Y 1.0% L 227 stop 5.0% hold 29 buffer 0.1% P 5.9% W 38: $28,817 / DD $6,326 / 3e; plateau 93% / 100% |
| XRT | fold2 | 10829 | 6536 | 5519 | X 29.9% Y 1.7% L 29 stop 12.1% hold 8 buffer 3.9% P 9.0% W 182: $122,583 / DD $21,956 / 3e; plateau 100% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 27.6% Y 0.1% L 52 stop 10.7% hold 8 buffer 1.9% P 5.6% W 175: $93,063 / DD $19,863 / 4e; plateau 100% / 100% |
| XRT | fold3 | 14490 | 7097 | 3445 | X 24.7% Y 2.2% L 38 stop 7.4% hold 9 buffer 3.8% P 5.3% W 74: $128,690 / DD $23,109 / 12e; plateau 100% / 97% | X 22.6% Y 2.3% L 32 stop 7.4% hold 9 buffer 4.7% P 5.4% W 105: $133,698 / DD $32,094 / 14e; plateau 88% / 96% | X 30.0% Y 4.8% L 243 stop 8.0% hold 19 buffer 3.0% P 6.2% W 118: $102,400 / DD $19,966 / 6e; plateau 100% / 100% |
| XRT | fold4 | 18182 | 8090 | 4668 | X 24.5% Y 2.2% L 49 stop 7.3% hold 9 buffer 4.2% P 5.3% W 73: $137,661 / DD $23,109 / 24e; plateau 100% / 91% | X 23.5% Y 2.2% L 49 stop 7.3% hold 9 buffer 3.0% P 5.3% W 102: $138,719 / DD $33,841 / 28e; plateau 84% / 93% | X 27.3% Y 0.6% L 59 stop 3.8% hold 6 buffer 4.8% P 9.3% W 69: $104,114 / DD $15,613 / 26e; plateau 100% / 86% |
| XRT | final | 21879 | 11669 | 7409 | X 24.4% Y 2.0% L 49 stop 7.7% hold 9 buffer 2.8% P 6.5% W 103: $145,468 / DD $23,383 / 24e; plateau 97% / 93% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120: $127,705 / DD $19,966 / 18e; plateau 100% / 97% |
| KRE | fold1 | 7169 | 5452 | 4237 | X 12.6% Y 4.9% L 167 stop 4.9% hold 13 buffer 1.4% P 16.4% W 123: $37,173 / DD $9,052 / 7e; plateau 100% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 27.7% Y 2.3% L 187 stop 3.1% hold 11 buffer 4.2% P 13.2% W 77: $31,914 / DD $4,561 / 3e; plateau 100% / 100% |
| KRE | fold2 | 10834 | 4035 | 3552 | X 28.8% Y 2.2% L 234 stop 3.3% hold 5 buffer 1.7% P 13.8% W 94: $109,768 / DD $24,333 / 36e; plateau 100% / 94% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 28.6% Y 2.6% L 234 stop 3.1% hold 4 buffer 1.8% P 13.8% W 93: $93,549 / DD $21,881 / 37e; plateau 100% / 92% |
| KRE | fold3 | 14481 | 7359 | 6518 | X 24.9% Y 3.2% L 28 stop 10.1% hold 4 buffer 1.3% P 13.0% W 183: $126,007 / DD $28,746 / 12e; plateau 93% / 98% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 28.9% Y 2.6% L 215 stop 3.1% hold 4 buffer 0.3% P 8.8% W 147: $94,557 / DD $21,881 / 39e; plateau 100% / 100% |
| KRE | fold4 | 18140 | 10557 | 9243 | X 28.8% Y 2.2% L 226 stop 3.8% hold 5 buffer 3.5% P 8.6% W 88: $146,567 / DD $26,680 / 50e; plateau 97% / 99% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 28.4% Y 2.6% L 233 stop 3.1% hold 4 buffer 2.5% P 8.9% W 192: $117,118 / DD $22,059 / 47e; plateau 100% / 99% |
| KRE | final | 21791 | 6824 | 5964 | X 29.9% Y 2.8% L 233 stop 3.1% hold 5 buffer 2.8% P 9.4% W 100: $171,785 / DD $26,271 / 70e; plateau 100% / 89% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60: $158,512 / DD $22,725 / 73e; plateau 93% / 88% |
| XLY | fold1 | 7169 | 4273 | 1170 | X 21.1% Y 0.3% L 168 stop 3.8% hold 28 buffer 0.9% P 6.3% W 184: $34,550 / DD $5,975 / 4e; plateau 100% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 21.5% Y 0.3% L 168 stop 3.8% hold 24 buffer 2.3% P 7.0% W 184: $29,558 / DD $5,430 / 2e; plateau 97% / 100% |
| XLY | fold2 | 10829 | 6649 | 1523 | X 21.6% Y 3.5% L 241 stop 10.8% hold 5 buffer 2.3% P 18.0% W 175: $87,309 / DD $22,742 / 3e; plateau 94% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 16.3% Y 1.3% L 89 stop 4.1% hold 24 buffer 4.3% P 6.8% W 86: $75,080 / DD $12,460 / 13e; plateau 94% / 100% |
| XLY | fold3 | 14497 | 9165 | 3601 | X 21.7% Y 1.0% L 231 stop 14.0% hold 5 buffer 1.2% P 18.6% W 13: $103,870 / DD $33,387 / 5e; plateau 80% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 17.3% Y 1.0% L 50 stop 3.8% hold 29 buffer 5.5% P 5.7% W 57: $91,003 / DD $11,840 / 17e; plateau 93% / 92% |
| XLY | fold4 | 18147 | 9600 | 877 | X 29.6% Y 0.6% L 57 stop 8.7% hold 16 buffer 4.4% P 3.9% W 189: $88,106 / DD $15,745 / 7e; plateau 100% / 100% | X 22.1% Y 0.1% L 58 stop 6.4% hold 8 buffer 1.3% P 7.6% W 137: $95,096 / DD $27,810 / 21e; plateau 100% / 80% | X 21.5% Y 4.0% L 78 stop 3.0% hold 28 buffer 2.6% P 17.9% W 26: $71,765 / DD $9,654 / 16e; plateau 93% / 100% |
| XLY | final | 21798 | 13045 | 945 | X 21.3% Y 3.5% L 112 stop 3.1% hold 10 buffer 0.8% P 8.4% W 175: $112,490 / DD $16,972 / 30e; plateau 97% / 98% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 21.4% Y 4.1% L 126 stop 3.0% hold 6 buffer 1.4% P 9.1% W 188: $86,163 / DD $11,366 / 34e; plateau 100% / 89% |
| IWN | fold1 | 7169 | 4539 | 2358 | X 26.2% Y 0.1% L 171 stop 3.1% hold 3 buffer 0.0% P 9.9% W 187: $29,814 / DD $4,205 / 3e; plateau 91% / 98% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 23.8% Y 0.1% L 182 stop 3.0% hold 7 buffer 2.8% P 12.5% W 188: $23,033 / DD $3,911 / 2e; plateau 85% / 100% |
| IWN | fold2 | 10768 | 7112 | 5603 | X 24.9% Y 0.8% L 241 stop 3.0% hold 5 buffer 0.0% P 12.5% W 191: $79,374 / DD $16,392 / 25e; plateau 100% / 92% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 18.5% Y 5.0% L 246 stop 3.5% hold 5 buffer 0.1% P 15.2% W 78: $62,788 / DD $14,849 / 19e; plateau 100% / 100% |
| IWN | fold3 | 14348 | 10573 | 9125 | X 24.8% Y 0.8% L 249 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191: $92,981 / DD $16,611 / 26e; plateau 100% / 91% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 27.4% Y 0.3% L 97 stop 3.4% hold 4 buffer 5.8% P 12.7% W 191: $80,259 / DD $15,180 / 22e; plateau 100% / 89% |
| IWN | fold4 | 15986 | 12047 | 10945 | X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191: $114,215 / DD $16,875 / 37e; plateau 100% / 91% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 24.9% Y 0.9% L 239 stop 3.0% hold 5 buffer 0.0% P 12.7% W 198: $107,062 / DD $15,455 / 32e; plateau 100% / 92% |
| IWN | final | 17535 | 13576 | 12392 | X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191: $111,181 / DD $16,875 / 38e; plateau 100% / 91% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 27.4% Y 0.4% L 96 stop 3.5% hold 4 buffer 5.9% P 12.7% W 191: $84,673 / DD $15,180 / 22e; plateau 100% / 89% |
| XLF | fold1 | 7169 | 4403 | 3205 | X 24.1% Y 0.1% L 80 stop 3.1% hold 28 buffer 5.3% P 5.9% W 67: $42,916 / DD $5,586 / 5e; plateau 93% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 23.9% Y 0.1% L 67 stop 3.1% hold 21 buffer 5.0% P 7.7% W 138: $32,485 / DD $3,806 / 3e; plateau 86% / 100% |
| XLF | fold2 | 10791 | 6371 | 4015 | X 23.1% Y 2.3% L 199 stop 4.0% hold 4 buffer 0.0% P 4.6% W 82: $84,577 / DD $13,664 / 23e; plateau 100% / 100% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 23.4% Y 0.4% L 148 stop 3.1% hold 5 buffer 0.5% P 7.3% W 63: $66,145 / DD $12,762 / 25e; plateau 100% / 98% |
| XLF | fold3 | 14327 | 9686 | 7423 | X 25.4% Y 2.2% L 201 stop 4.0% hold 4 buffer 0.7% P 4.5% W 20: $108,498 / DD $13,598 / 25e; plateau 100% / 92% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 25.4% Y 0.7% L 200 stop 4.0% hold 5 buffer 0.6% P 4.6% W 19: $95,743 / DD $12,762 / 24e; plateau 93% / 89% |
| XLF | fold4 | 16050 | 11178 | 9426 | X 25.2% Y 2.2% L 212 stop 4.0% hold 4 buffer 0.3% P 4.5% W 19: $119,748 / DD $13,598 / 33e; plateau 100% / 94% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.3% P 7.3% W 15: $97,558 / DD $12,762 / 30e; plateau 96% / 91% |
| XLF | final | 17711 | 12812 | 10899 | X 25.4% Y 1.6% L 200 stop 4.0% hold 8 buffer 0.6% P 4.1% W 19: $121,499 / DD $17,071 / 30e; plateau 100% / 90% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.8% P 7.3% W 15: $99,222 / DD $12,762 / 30e; plateau 96% / 93% |
| XLE | fold1 | 7169 | 4776 | 3557 | X 21.3% Y 0.1% L 24 stop 4.1% hold 23 buffer 5.7% P 19.2% W 167: $24,803 / DD $5,190 / 2e; plateau 88% / 97% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 20.7% Y 0.3% L 28 stop 3.4% hold 13 buffer 5.5% P 19.1% W 190: $20,304 / DD $4,085 / 2e; plateau 96% / 100% |
| XLE | fold2 | 10725 | 2787 | 2778 | X 29.9% Y 2.7% L 58 stop 6.5% hold 4 buffer 0.4% P 13.6% W 66: $100,857 / DD $24,861 / 17e; plateau 89% / 97% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 29.9% Y 2.7% L 72 stop 5.0% hold 4 buffer 0.9% P 3.6% W 59: $84,772 / DD $22,438 / 25e; plateau 89% / 94% |
| XLE | fold3 | 14350 | 5936 | 5890 | X 27.3% Y 2.7% L 58 stop 6.5% hold 4 buffer 0.0% P 13.3% W 62: $119,019 / DD $24,861 / 20e; plateau 83% / 95% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 30.0% Y 2.7% L 72 stop 5.0% hold 4 buffer 0.1% P 13.3% W 66: $99,478 / DD $22,438 / 22e; plateau 89% / 96% |
| XLE | fold4 | 17972 | 8858 | 8200 | X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47: $154,448 / DD $24,861 / 23e; plateau 86% / 92% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 29.5% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.3% W 71: $120,741 / DD $22,438 / 25e; plateau 89% / 96% |
| XLE | final | 19963 | 10394 | 9727 | X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47: $154,448 / DD $24,861 / 23e; plateau 86% / 92% | none (the primary is already the highest-net plateau candidate (or no distinct one exists)) | X 29.7% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.2% W 62: $120,741 / DD $22,438 / 25e; plateau 89% / 96% |

