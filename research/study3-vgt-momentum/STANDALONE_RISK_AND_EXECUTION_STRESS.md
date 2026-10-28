# Standalone risk and execution stress (M5)

Sources: sealed `robustness.json` (finalists and controls on 2017-01-03 → 2023-12-29), `evaluate-*.json` (R0 stresses
of the fold picks), tables `robustness.md`, `risk-extras.md` (amendment A1, descriptive). All drawdowns are fixed-slot
($100,000) marks; percentages are $DD / $100,000. **Historical drawdown is descriptive, not a guaranteed exit loss.**
Stops can be jumped by gaps, and margin requirements are not modelled. The finalists were chosen on this same history,
so their full-history figures are in-sample.

## 1. The procedure under stress (R0: the sealed fold picks over their windows, no re-selection)

| Stress | 2020 | 2021 | 2022 | 2023 | Σ |
|---|---:|---:|---:|---:|---:|
| Baseline (5 bps, 11%) | +$18,608 | +$14,577 | −$57,578 | +$24,646 | +$253 |
| 10 bps | +$18,481 | +$14,451 | −$57,824 | +$24,312 | −$579 |
| 14% interest | +$16,340 | +$11,585 | −$58,581 | +$22,065 | −$8,591 |
| 25 bps stop slippage (incl. gaps) | +$18,608 | +$14,577 | −$58,030 | +$24,646 | −$199 |
| +1 minute on every fill | +$19,121 | +$14,703 | −$58,045 | +$24,914 | +$693 |

The 2022 window's minute drawdown exceeds $35,000 under every stress ($63,078 at baseline). The procedure path Π
(the four windows chained, peak carried) has a minute drawdown of **$63,569 (63.6% of the slot)**. That is the
standalone breach of the $35,000 screening reference.

## 2. Finalists on the full history (in-sample)

| Finalist | Net | Minute DD | Daily DD | Exposure | Price gain | Interest | Friction | Lots | Median / max hold | Worst lot | Worst MAE |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| H P\* E06-4978efef20 | +$120,096 | $25,809 (25.8%) | $20,984 | 76% | +$179,109 | $58,225 | $789 | 7 | 216² / 453 | −$2,229 | −1.9% |
| D P\* E06-47640253c0 | +$115,479 | $25,809 | $20,984 | 77% | +$175,334 | $58,767 | $1,087 | 10 | 5 / 453 | −$2,229 | −3.0% |
| H champion E05 | +$97,193 | $34,463 | $33,501 | 72% | +$153,200 | $55,332 | $676 | 6 | 213 / 449 | −$4,062 | −4.5% |
| H champion E03 | +$92,336 | $34,796 | $32,615 | 76% | +$153,968 | $58,556 | $3,075 | 30 | 39 / 117 | −$10,816 | −7.7% |
| H champion E08 | +$91,254 | $26,704 | $25,987 | 78% | +$151,901 | $59,671 | $976 | 9 | 146 / 455 | −$3,924 | −3.0% |
| C-ALR (always long, re-sized monthly) | +$78,296 | $52,628 | — | 100% | | | | 84 | | | |
| C-SMA | +$78,764 | $44,934 | — | 81% | | | | 19 | | | |
| C-AL (one lot from 2017) | +$217,504 | $150,794 | — | 100% | | | | 1 | | | |

² Engine median of closed lots; `risk-extras.md` prints 250 by a different quantile rule.

Financing took a third of the finalists' gross price gains ($55–60k of $150–180k). Friction was negligible ($0.7–3.1k).
Every finalist's full-history minute drawdown is ≤ $35,000 (by construction for H's picks: it was a feasibility
condition). Largest losing lots were small (−$2.2k to −$10.8k) because these rules exit by their own signal after
gains. The largest *winning* lots carry the risk: H-P\*'s largest lot made +$45,819 (38% of its net) after holding
drifted exposure through 2020–2021 (`risk-extras.md`).

## 3. Execution, cost and rate sensitivity of the finalists (net; `robustness.md`)

| Finalist | 0 / 2 / 5 / 10 bps | 8 / 11 / 14% | Stop slip 10 / 25 / 50 bps | Entry slip 10 / 25 bps | Delay +1 / +5 min | Missing bars 1% / 5% |
|---|---|---|---|---|---|---|
| H P\* | +$120,974 / +$120,623 / +$120,096 / +$119,218 | +$135,975 / +$120,096 / +$104,216 | +$120,096 (all) | +$119,218 / +$117,905 | +$121,049 / +$119,986 | +$120,096 (both) |
| D P\* | +$116,654 / +$116,184 / +$115,479 / +$114,306 | +$131,507 / +$115,479 / +$99,452 | +$115,479 (all) | +$114,306 / +$112,551 | +$117,522 / +$114,927 | +$115,479 (both) |
| E05 | +$97,945 … +$96,440 | +$112,283 / +$97,193 / +$82,102 | +$97,193 (all) | +$96,441 / +$95,316 | +$98,427 / +$97,968 | +$97,193 (both) |
| E03 | +$95,488 … +$89,187 | +$108,306 / +$92,336 / +$76,366 | +$91,972 / +$91,425 / +$90,515 | +$89,188 / +$84,478 | +$90,111 / +$90,203 | +$92,176 / +$92,336 |
| E08 | +$92,305 … +$90,203 | +$107,528 / +$91,254 / +$74,980 | +$90,316 / +$88,909 / +$86,563 | +$90,204 / +$88,633 | +$91,554 / +$92,817 | +$91,254 / +$91,167 |

These low-turnover rules are insensitive to friction, slippage, delays and missing minutes, since they trade a few
times a year and mostly exit at an opening trade on their own signal. The H pick had no stop fills at all, so
stop-slippage stress cannot touch it. The interest rate is the material sensitivity: each 3 points of rate move net by
$15–17k. No held session closed with the closing print at or below an untriggered stop (count 0 for every finalist),
so the D1 closing-print convention never mattered.

## 4. Parameter neighbourhood and placebos (`robustness.json`)

| Finalist | One-at-a-time ±1/±2 steps: min / median / max | 64 joint draws (±10%): q1 / median / q3 (min) | Share net > 0 and DD ≤ $35k | Random-entry placebo: median / 90th pct; finalist's percentile | Inverted state |
|---|---|---|---:|---|---:|
| H P\* | +$50,003 / +$120,096 / +$121,257 | +$55,832 / +$74,079 / +$88,126 (+$38,123) | 89% | +$33,286 / +$84,535; 96th | −$30,217 |
| D P\* | +$55,330 / +$115,479 / +$118,416 | +$67,351 / +$83,320 / +$93,006 (+$45,404) | **69%** (fails r3) | +$40,268 / +$106,483; 94th | −$61,023 |
| E05 | +$51,759 / +$97,193 / +$98,357 | +$65,441 / +$76,025 / +$97,375 (+$43,230) | 30% | +$36,033 / +$85,753; 92nd | — |
| E03 | +$55,915 / +$91,305 / +$94,679 | +$53,173 / +$78,948 / +$84,859 (+$11,412) | 23% | +$42,824 / +$81,656; 94th | −$12,752 |
| E08 | +$39,208 / +$86,432 / +$104,942 | +$28,670 / +$55,048 / +$76,334 (−$11,008) | 61% | +$30,667 / +$80,517; 96th | — |

- **The in-sample H pick sits on a narrow peak.** Its centre (+$120,096) is far above its joint neighbourhood
  (median +$74,079). That is consistent with the winner's curse from 14,349 trials, and is why its in-sample figure
  is not an expectation.
- **Placebos.** The random-entry placebo (200 draws: the same entry rate, the candidate's own holding times and price
  stops, no entry rule) earns a median +$31k–43k in this bull market. The finalists' centres rank at the 92nd–96th
  percentile, but each centre is the best of ~1,300 searched points, so that rank is inflated by selection; their own
  ±10% joint-draw medians rank lower (H-P\* 84.5%, D-P\* 80.0%, E05 84.5%, E03 88.5%, E08 73.0%). Descriptive only, not a
  significance test. Inverting E06's state lost in-sample (−$30,217 and −$61,023), consistent with a working regime
  filter on this history.

## 5. Dividends (price-only convention; not booked anywhere)

VGT distributions on shares held over each ex-date, 2017–2023 (amendment A1): H pick +$6,802, D pick +$6,817, C-ALR
+$6,864, C-SMA +$7,430, C-AL +$15,016. Booking them would raise every invested rule by about 1% of the slot per year of
exposure. It would not change any comparison above.

## 6. Threshold breaches against the $35,000 screening reference

- **Procedure (verdict-bearing):** the 2022 window ($63,078) and Π ($63,569) breach.
- **P0 (the no-search comparator, E09 default):** 2020 ($49,584) and 2022 ($56,227).
- **Fold champions:** E04 in 2022 ($63,078), E09 in 2022 ($62,526), E07 in 2022 ($40,197), E04 in 2020 ($38,855), E09 in
  2020 ($38,727).
- **Controls (window):** C-SMA 2020 $38,334 and 2022 $40,792; C-TSM 2020 $52,756 and 2022 $62,120; C-ALR 2020 $39,444 and
  2022 $50,995; C-AL in 2020, 2021, 2022 and 2023.
- **Finalists (full history, in-sample):** none (H's by construction).
