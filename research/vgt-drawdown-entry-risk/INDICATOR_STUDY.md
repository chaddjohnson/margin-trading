# Indicator study: can entry-time information flag dangerous −10% entries?

**Short answer: no, not with evidence that survives.** Development (2014–2022) has 10 independent episodes, 2 of them severe. No single indicator separates those two from the other eight, and none of the flags evaluated here, taken alone or combined, beat the unconditional rate in a way that held up in 2023–2026. The few indicators that rank signal sessions well describe a decline that is already deep or already old. They do not give early warning at the first −10%.

## Point-in-time definitions

Every feature at session t uses only data known at t's close: VGT's OHLCV through t, proxy closes on the same date (16:00 prints, like VGT's), and VIX through **t−1** (CBOE's close prints after 16:00). Missing proxy sessions are NaN; nothing is forward-filled; breadth needs ≥3 of the 5 proxies. Earliest actionable time is t's close under the research convention, t+1's open under the executable one. `tests/features.test.ts` scrambles every price, volume and VIX value after t and checks that all 36 features up to t are unchanged. The independent review repeated this end to end, with real data truncated at six dates, and found zero differences.

| Family | Feature | Formula (window, lag) |
|---|---|---|
| Speed | `dd` | 1 − close / refHigh (refHigh = max high of sessions t−90…t−1) |
| | `peakAge`, `ddPerSession` | sessions since the refHigh bar; dd / peakAge |
| | `ret5`, `ret10`, `ret20` | close_t / close_{t−k} − 1 |
| | `accel5` | ret5_t − (close_{t−5}/close_{t−10} − 1) (negative = the fall is speeding up) |
| | `consecDown`, `newLow20` | consecutive lower closes; close below the prior 20-session closing low |
| | `distSma50`, `distSma200` | close / SMA(t−49…t or t−199…t) − 1; 200 sessions of warm-up (available from 2005) |
| Volume | `relVol20`, `relVol50` | volume_t / mean(volume_{t−20…t−1}) (and 50) |
| | `downVolShare10` | volume on down closes / all volume, t−9…t |
| | `relVolMax10`, `volSubsiding` | max relVol20 over t−9…t; mean relVol20 of t−2…t ÷ that max (low = a volume spike fading) |
| Volatility | `atr14` | Wilder ATR(14) / close |
| | `rv10`, `rv20`, `volRatio`, `rv10Change5` | annualised stdev of log returns; rv10/rv60; rv10_t / rv10_{t−5} |
| | `bigDowns20`, `worst1d10` | count of ≤ −3% days in t−19…t; worst daily return in t−9…t |
| | `vixPrev`, `vixChange5` | VIX close at t−1; its change over 5 sessions |
| Cross-ETF proxies | `xDdFrac10`, `xBelowSma50Frac`, `xNewLow20Frac` | share of {QQQ, SOXX, IGV, SPY, IWN} ≥10% below their own 90-session high / below SMA50 / at a 20-session closing low |
| | `spyDd`, `relWeak20` | SPY's drawdown from its 90-session high; VGT ret20 − SPY ret20 |
| Stabilization | `lowAge` | sessions since the lowest close since the refHigh bar (0 = new closing low today) |
| | `reboundFromLow` | close / lowest close since the refHigh bar − 1 |
| | `failedRallies` | since the refHigh bar: rallies of ≥3% off the running closing low that were followed by a new closing low (counted when the new low prints, so no future pivot is needed) |
| | `upClose` | close_t > close_{t−1} |
| Candidate | `candVelocity`, `candAge` | sessions from the refHigh bar to the first 10% signal against it; sessions since that signal |

**These are cross-ETF confirmation proxies, not market breadth.** Five overlapping, highly correlated ETFs (QQQ, SOXX and IGV overlap VGT heavily) cannot measure constituent breadth. IWN (small-cap value) is the only small-cap series available. A constituent-level breadth series was not available (see the regime-filters study: NYSE advance/decline data ends in 2020 in free sources).

## Single-feature diagnostics (development, outcomes censored at 2022-12-30)

AUC = probability that a severe unit scores more dangerous than a non-severe one (0.5 = no information), oriented by each feature's pre-stated danger direction. Signal sessions are not independent (most belong to 2022), so their interval is a cluster bootstrap by episode (1,000 replicates).

<!-- table:feature_diagnostics_dev -->
| Feature | Family | Danger if | AUC episodes (n=10) | AUC candidates (n=21) | AUC signal sessions (n=385) | Cluster-bootstrap 95% | Spearman vs max DD ≤40 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| dd | speed | high | 0.50 | 0.88 | 0.78 | 0.67–0.92 | 0.50 |
| peakAge | speed | low | 0.63 | 0.14 | 0.38 | 0.15–0.85 | -0.25 |
| ddPerSession | speed | high | 0.63 | 0.16 | 0.52 | 0.30–0.95 | -0.01 |
| ret5 | speed | low | 0.63 | 0.32 | 0.55 | 0.36–0.72 | 0.12 |
| ret10 | speed | low | 0.69 | 0.37 | 0.56 | 0.33–0.77 | 0.18 |
| ret20 | speed | low | 0.13 | 0.52 | 0.63 | 0.40–0.94 | 0.31 |
| accel5 | speed | low | 0.63 | 0.37 | 0.49 | 0.42–0.55 | -0.00 |
| consecDown | speed | high | 0.56 | 0.29 | 0.53 | 0.41–0.60 | 0.02 |
| newLow20 | speed | high | 0.56 | 0.33 | 0.50 | 0.41–0.57 | 0.03 |
| distSma50 | speed | low | 0.44 | 0.61 | 0.63 | 0.37–0.97 | 0.29 |
| distSma200 | speed | low | 0.31 | 0.89 | 0.78 | 0.53–0.95 | 0.41 |
| relVol20 | volume | high | 0.81 | 0.27 | 0.50 | 0.35–0.64 | 0.07 |
| relVol50 | volume | high | 0.81 | 0.31 | 0.48 | 0.30–0.79 | 0.06 |
| downVolShare10 | volume | high | 0.44 | 0.28 | 0.54 | 0.30–0.78 | 0.11 |
| relVolMax10 | volume | high | 0.75 | 0.59 | 0.52 | 0.37–0.73 | 0.13 |
| volSubsiding | volume | high | 0.38 | 0.17 | 0.43 | 0.21–0.56 | -0.13 |
| atr14 | volatility | high | 0.63 | 0.86 | 0.68 | 0.42–0.92 | 0.35 |
| rv10 | volatility | high | 0.44 | 0.73 | 0.61 | 0.43–0.94 | 0.31 |
| rv20 | volatility | high | 0.63 | 0.84 | 0.61 | 0.38–0.91 | 0.30 |
| volRatio | volatility | high | 0.25 | 0.15 | 0.52 | 0.24–0.89 | 0.13 |
| rv10Change5 | volatility | high | 0.38 | 0.19 | 0.54 | 0.40–0.68 | 0.12 |
| bigDowns20 | volatility | high | 0.63 | 0.72 | 0.54 | 0.44–0.98 | 0.23 |
| worst1d10 | volatility | low | 0.44 | 0.67 | 0.53 | 0.38–0.96 | 0.22 |
| vixPrev | volatility | high | 0.56 | 0.72 | 0.55 | 0.30–0.92 | 0.12 |
| vixChange5 | volatility | high | 0.50 | 0.20 | 0.55 | 0.41–0.69 | 0.10 |
| xDdFrac10 | cross_etf | high | 0.34 | 0.88 | 0.63 | 0.54–0.84 | 0.25 |
| xBelowSma50Frac | cross_etf | high | 0.63 | 0.53 | 0.60 | 0.35–0.89 | 0.21 |
| xNewLow20Frac | cross_etf | high | 0.44 | 0.29 | 0.49 | 0.36–0.63 | 0.06 |
| spyDd | cross_etf | high | 0.44 | 0.89 | 0.58 | 0.42–0.92 | 0.24 |
| relWeak20 | cross_etf | low | 0.38 | 0.38 | 0.52 | 0.18–0.64 | 0.04 |
| lowAge | stabilization | low | 0.50 | 0.19 | 0.53 | 0.31–0.83 | 0.12 |
| reboundFromLow | stabilization | low | 0.50 | 0.19 | 0.54 | 0.24–0.82 | 0.07 |
| failedRallies | stabilization | high | 0.25 | 0.83 | 0.54 | 0.26–0.85 | 0.30 |
| upClose | stabilization | low | 0.50 | 0.38 | 0.52 | 0.44–0.58 | 0.04 |
| candVelocity | candidate | low | 0.63 | 0.14 | 0.36 | 0.08–0.81 | -0.20 |
| candAge | candidate | low | 0.50 | 0.50 | 0.47 | 0.25–0.76 | -0.02 |
<!-- /table -->

How to read this:

- **The episode column (n = 10, 2 severe) is effectively two observations.** An AUC of 0.81 for `relVol20` means the 2020 and 2022 first signals had higher relative volume than most of the others. With two positives, a coin-flip feature reaches 0.8 or more fairly often.
- **The signal-session columns are dominated by 2022**, where every signal is "severe" and the decline is long. The features that rank well there, `dd` (0.78) and `distSma200` (0.78), say *the decline is already deep or far below its long-term trend*. That is description, not early warning. At the decision that matters, the first −10% signal of an episode, `dd` is 10% by construction.
- **No speed, acceleration, volume, volatility or VIX feature has a cluster interval that excludes 0.5 in the expected direction**, except those depth proxies and `xDdFrac10` (0.54–0.84, again driven by 2022's broad bear market).

Feature values at each episode's first signal (development and holdout; the holdout rows were read only after the rules were frozen):

<!-- table:episode_features_full -->
| First −10% | Severe (≥20% ≤40) | Max DD | candVelocity | ret5 | accel5 | relVol20 | volRatio | atr14 | xDdFrac10 | spyDd | vixPrev | distSma200 | failedRallies |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2015-08-21 | no | 14.3% | 24.00 | -7.0% | -7.6% | 2.77 | 1.61 | 1.7% | 60.0% | 7.3% | 19.1 | -5.9% | 0.00 |
| 2016-01-07 | no | 16.6% | 24.00 | -7.8% | -9.0% | 2.08 | 1.14 | 1.7% | 40.0% | 7.8% | 20.6 | -5.0% | 1.00 |
| 2018-02-08 | no | 10.3% | 9.00 | -9.2% | -9.6% | 1.29 | 1.86 | 2.1% | 60.0% | 10.1% | 27.7 | 4.3% | 0.00 |
| 2018-04-02 | no | 10.3% | 13.00 | -1.0% | 6.4% | 1.03 | 1.44 | 2.4% | 40.0% | 9.8% | 20.0 | 4.5% | 1.00 |
| 2018-10-11 | no | 24.0% | 6.00 | -8.2% | -7.3% | 3.24 | 1.58 | 1.8% | 40.0% | 7.2% | 23.0 | 0.7% | 0.00 |
| 2019-06-03 | no | 11.5% | 22.00 | -3.8% | -1.0% | 1.20 | 1.01 | 1.8% | 60.0% | 6.9% | 18.7 | 0.4% | 1.00 |
| 2020-02-25 | yes | 32.0% | 4.00 | -9.0% | -9.7% | 2.32 | 1.48 | 2.2% | 20.0% | 7.8% | 25.0 | 9.2% | 0.00 |
| 2020-09-08 | no | 12.9% | 3.00 | -8.7% | -12.5% | 2.60 | 1.67 | 2.7% | 60.0% | 7.1% | 30.8 | 16.5% | 0.00 |
| 2021-03-04 | no | 11.3% | 12.00 | -3.1% | 2.0% | 2.24 | 1.59 | 2.5% | 60.0% | 4.4% | 26.7 | 8.1% | 1.00 |
| 2022-01-19 | yes | 35.2% | 15.00 | -5.6% | -2.3% | 3.33 | 1.12 | 2.4% | 60.0% | 5.9% | 22.8 | 1.2% | 0.00 |
| 2024-04-19 | no | 10.4% | 29.00 | -6.8% | -6.1% | 2.84 | 1.09 | 1.9% | 40.0% | 5.6% | 18.0 | 3.3% | 0.00 |
| 2024-08-01 | no | 15.5% | 13.00 | -1.4% | 2.9% | 1.21 | 1.67 | 2.5% | 20.0% | 3.9% | 16.4 | 8.0% | 1.00 |
| 2025-03-03 | yes | 27.4% | 25.00 | -6.0% | -2.1% | 1.79 | 1.14 | 2.4% | 60.0% | 4.8% | 19.6 | -2.1% | 1.00 |
| 2025-11-20 | no | 17.0% | 16.00 | -4.9% | -3.6% | 1.95 | 1.27 | 2.5% | 40.0% | 5.4% | 23.7 | 9.6% | 0.00 |
| 2026-06-10 | no | 14.1% | 5.00 | -9.3% | -14.9% | 0.98 | 1.54 | 2.9% | 40.0% | 4.6% | 19.9 | 16.6% | 0.00 |
<!-- /table -->

Failure examples a rule would have had to get right:

- **2020-02-25 (severe, −32%)** and **2020-09-08 (benign, −12.9%)** look alike at the first signal: velocity 4 vs 3, ret5 −9.0% vs −8.7%, relVol20 2.3 vs 2.6, volRatio 1.48 vs 1.67. The 2020-09 signal even had the higher VIX (30.8 vs 25.0).
- **2018-10-11 (−24% eventually)** had the highest development relVol20 (3.24) apart from 2022, but it is not severe by the 40-session label: −20% came after 49 sessions.
- **2025-03-03 (severe, −27%)** reached −10% slowly (velocity 25, ret5 −6.0%, relVol20 1.79, volRatio 1.14): every speed and stress flag was quiet. The damage came from a policy shock (the April 2025 tariff announcements) 5 weeks after the signal.
- **2024-08-01 (benign)** had a low VIX (16.4) and only 20% of proxies down 10%; **2026-06-10 (benign)** had the fastest acceleration in the sample (accel5 −14.9%).

## Pre-specified flags as danger classifiers (development)

Each flag is raised at the decision close. Benchmarks: the unconditional rate (72.5% of development signal sessions were severe; 2 of 10 episodes) and velocity alone.

<!-- table:flag_diagnostics_dev -->
Signal sessions: 385 uncensored (base rate of ≥20% within 40 sessions: 72.5%), 10 episodes. Baseline trades: 30.

| Danger flag at the decision close | Episodes flagged at first signal | Signal sessions flagged | Precision | Recall | False-alarm rate | Baseline winners flagged | Baseline losers flagged | P&L of flagged baseline trades | Deepest DD of a missed severe signal |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| velocity ≤15 sessions (benchmark) | 2/2 sev., 5/8 non-sev. | 276 | 77% | 76% | 60% | 9/12 | 12/18 | $68,861 | 31.9% |
| velocity >40 sessions (benchmark) | 0/2 sev., 0/8 non-sev. | 67 | 100% | 24% | 0% | 1/12 | 2/18 | $3,336 | 32.2% |
| ret5 ≤ −4% | 2/2 sev., 5/8 non-sev. | 101 | 74% | 27% | 25% | 8/12 | 12/18 | $62,877 | 32.2% |
| ret5 ≤ −6% | 1/2 sev., 5/8 non-sev. | 55 | 75% | 15% | 13% | 5/12 | 9/18 | $14,254 | 32.2% |
| ret5 ≤ −8% | 1/2 sev., 3/8 non-sev. | 26 | 77% | 7% | 6% | 3/12 | 4/18 | $6,077 | 32.2% |
| accel5 ≤ −3% | 1/2 sev., 5/8 non-sev. | 139 | 74% | 37% | 34% | 8/12 | 11/18 | $69,120 | 32.2% |
| accel5 ≤ −5% | 1/2 sev., 5/8 non-sev. | 105 | 75% | 28% | 25% | 6/12 | 8/18 | $58,394 | 32.2% |
| rv10 / rv60 ≥ 1.5 | 0/2 sev., 5/8 non-sev. | 45 | 56% | 9% | 19% | 3/12 | 5/18 | $2,352 | 32.2% |
| rv10 / rv60 ≥ 2.0 | 0/2 sev., 0/8 non-sev. | 16 | 94% | 5% | 1% | 1/12 | 1/18 | $4,988 | 32.2% |
| ATR14 ≥ 3.0% of price | 0/2 sev., 0/8 non-sev. | 142 | 81% | 41% | 25% | 5/12 | 2/18 | $68,382 | 32.2% |
| ATR14 ≥ 4.0% of price | 0/2 sev., 0/8 non-sev. | 32 | 69% | 8% | 9% | 2/12 | 1/18 | $53,002 | 32.2% |
| relVol20 ≥ 1.5 | 2/2 sev., 5/8 non-sev. | 64 | 75% | 17% | 15% | 3/12 | 10/18 | −$15,320 | 32.2% |
| relVol20 ≥ 2.0 | 2/2 sev., 5/8 non-sev. | 39 | 69% | 10% | 11% | 2/12 | 10/18 | −$24,321 | 32.2% |
| ≥60% of proxies ≥10% below their 90-session high | 1/2 sev., 5/8 non-sev. | 351 | 77% | 97% | 75% | 10/12 | 15/18 | $63,119 | 32.0% |
| ≥80% of proxies ≥10% below their 90-session high | 0/2 sev., 0/8 non-sev. | 282 | 78% | 79% | 58% | 6/12 | 10/18 | $49,319 | 32.2% |
| SPY ≥7% below its 90-session high | 1/2 sev., 6/8 non-sev. | 345 | 72% | 89% | 92% | 10/12 | 17/18 | $66,463 | 31.1% |
| SPY ≥10% below its 90-session high | 0/2 sev., 1/8 non-sev. | 220 | 77% | 61% | 47% | 7/12 | 7/18 | $65,812 | 32.2% |
| previous VIX close ≥ 25 | 1/2 sev., 3/8 non-sev. | 225 | 74% | 60% | 55% | 8/12 | 8/18 | $70,651 | 32.2% |
| previous VIX close ≥ 30 | 0/2 sev., 1/8 non-sev. | 106 | 73% | 28% | 27% | 4/12 | 4/18 | $64,690 | 32.2% |
| ≥1 failed ≥3% rally since the reference high | 0/2 sev., 4/8 non-sev. | 335 | 73% | 88% | 85% | 10/12 | 12/18 | $83,784 | 32.0% |
<!-- /table -->

- **Precision never clearly beats the base rate.** At the signal-session level the base rate is 72.5%; flags reach 56%–94%, and the 94% belongs to a flag raised on 16 sessions.
- **The "profitable trades blocked" columns are the economic problem.** Every flag that catches a severe episode at its first signal also catches non-severe ones (5 of 8 for velocity ≤15, ret5 ≤ −4%, relVol ≥1.5). Most flags mark a similar share of baseline winners and losers, and the flagged baseline trades are profitable in total for 18 of the 20 rows (only the two relative-volume flags mark net losers).
- **One trade-level pattern looked promising and did not replicate.** In development, relVol20 ≥ 2.0 at the entry close marked 10 of 18 losing baseline trades but only 2 of 12 winners (flagged P&L −$24,321). In 2023–2026 it marked 2 trades, 1 winner and 1 loser, net **+$13,938** (`results/flag_diagnostics_full.csv` and the trade files). Treat it as an untested hypothesis, not a finding.
- **Deepest miss:** every flag misses some severe signals, and the deepest missed drawdown is about 32% for every flag (the 2020 and 2022 sessions that no flag caught). A false "safe" reading still lets the full crash through.

Full period, including the holdout, is in `results/tables/flag_diagnostics_full.md` (descriptive only). The pattern is the same: velocity ≤15 flags 2 of 3 severe and 7 of 12 non-severe first signals.

## Risk score

Not built. The protocol allowed a score only if it materially beat a transparent rule-based baseline. No transparent rule cleared the base rate in development, and the episode count (2 severe in development, 3 overall) cannot support fitting or calibrating a score. The adaptive-threshold family E uses one small pre-specified count score (ret5, breadth, volatility expansion). Its strategy results are in ENTRY_COMPARISON.md.

## What would be needed

- **More independent severe episodes.** Pre-2014 VGT adds one (2007–2010) and the correlated ETFs add little independent information. A longer index history (for example the Nasdaq-100 or S&P 500 tech sector back to the 1990s, with its own dip strategy calibration) would be the next data step.
- **True breadth data** (constituent advance/decline or percent-above-MA for the VGT holdings) if the hypothesis "narrow vs broad selloff" is to be tested properly.
