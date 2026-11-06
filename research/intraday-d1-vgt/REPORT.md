# Intraday D1 on VGT 1-minute bars — Study 8–style robust optimization: report

**Recommendation: no robust edge.** Canonical D1's rule set, re-clocked to intraday periods and re-optimized on
2016–2024 with Study 8's verified methodology, produced **no configuration that satisfies Study 8's robustness
constraints**. Every one of the 7,890 configurations the search explored was infeasible, so no candidate was frozen.
Validation (2025-01-02 → 2026-10-30) was still run once, for the four frozen shortlist fillers, as a labelled
diagnostic. It does not change the conclusion: they fail T3 (validation profit) and T5 (concentration).

- **Primary reason (development evidence):**
  - At genuinely intraday magnitudes, turnover is high and the pre-cost edge is small.
  - Across the unbiased 8,192-point Sobol screen, configurations with a dip threshold X < 0.5% made a median
    −$173,904 over nine years. Their median cost bill was $244,485 from a median of 2,446 trades. Only 15% were
    profitable, and those were isolated points whose neighbourhoods fail.
  - Profitability rises steadily as the parameters become more daily-like: larger dips, 130-minute periods, holds of
    about ten sessions.
  - Even at that edge of the intraday box the best configurations earn a neighbourhood median of about
    **$6,400–$6,500/yr**, below Study 8's $10,000/yr bar (C5/E1). Every other gate passes.
- **Comparison with daily D1:**
  - Daily D1 (`primary`, run by the same engine under the same economics) made $135,359 in development and $40,901
    in validation.
  - Neither does daily D1 meet every Study 8 gate: it fails C5 and C7, which matches Study 8's own F24 finding.
- **Scope kept:** the frozen box was not widened after the search and no criterion was relaxed. That keeps this an
  intraday study rather than a re-run of daily D1 optimization.

Chronology note: 2025–2026 is validation *for this experiment*. VGT's 2024–2026 data had been examined by earlier
research, so it is not an untouched holdout. The data end on **2026-10-30**, so 2026 is a partial year (10 months).

Generated tables: `results/report/REPORT_TABLES.md`. Machine-readable records: `results/` (see `README.md`).

## 1. What was built

- **Strategy `intradayD1`** (`src/intraday-d1/engine.ts`).
  - It is canonical D1 (`src/app/allIn-trailingBuy-postExitContinuation.ts`, unchanged) statement for statement.
  - D1's **session** clock is replaced by a **period** of B regular-session minutes (B ∈ {5, 10, 15, 30, 65, 130}).
  - Every session-keyed rule applies per period: the reference high fixed per period; the once-per-period stop ratchet;
    stop activation decided before each period; the maximum-hold test at the period open; the buffered loss;
    entry/exit exclusivity; carry to the next period; the continuation window.
  - L and W are trading-minute durations converted to periods. The hold H is in scheduled trading minutes
    (a disclosed deviation from D1's calendar days). Interest keeps D1's calendar-night convention.
  - The rule-parity matrix is in `audit/RULE_PARITY_DESIGN.md`. Canonical D1 has no material-loss, lower-price
    re-entry or recovery-reset rule, so none was added.
- **Parity, sealed** (`results/parity/parity.json`): **0 differences in 67 comparisons.**
  - **P1:** in session mode (costs 0, no arming date) the engine reproduces the **canonical D1 file** on the
    development bytes trade for trade, including minute timestamps, prices, reasons, interest, net and both
    drawdowns, under `stop` and `next-open` fills.
  - **P3:** session mode under Study 8's costs and its four stresses equals **Study 8's own `traceBook`**.
  - **P2:** 60 intraday Sobol vectors (interest 0, up to 11k trades each) equal the verified D1 machines on
    period-structured data.
  - The first parity attempt failed on a comparator defect, kept and disclosed as amendment A1.
- **Non-regression of D1.**
  - The canonical D1 CLI on the 2016–2024 prefix gives exactly its sealed development record: 17 trades, $137,222.97,
    minute DD $19,330.69, daily DD $15,611.46.
  - The data-free D1 suites pass 21/21 (frozen-source pin, split run, cross-path, machine equivalence).
  - No existing source, phenotype, baseline or study record was changed; `package.json` gains one script line.
- **Tests:** the study suite `src/intraday-d1/tests/` passes 17/17, covering:
  - period construction across DST, a weekend, a holiday and an early close; time-unit conversion;
  - arming, trailing low and the next-minute fill; carry across a period boundary;
  - no exit in the entry period; the profit-conditioned stop, inactive and active; the trading-minute hold with
    calendar-night interest; no restriction after a loss;
  - the differential property test against the verified machines (72 random vectors on sparse synthetic data);
  - determinism; the data-door refusals; P1 and D1 non-regression on real data.
- **CLI:** `npm run intraday-d1 -- <parity|search|qualify|freeze|validate|report|diagnose|run|verify>`.
  - `run` is the strategy entry point for any parameter set (schema-checked), on the development door, or on the full
    history once the study is complete.
  - Strategy Lab integration was not built: no candidate qualified, and the audit rated the integration moderate to
    heavy (a runner, a registry entry, end-to-end tests and live-state cautions). The CLI is the selectable entry point.

## 2. Data, execution and integrity

- **Data.**
  - Alpaca SIP 1-minute OHLCV for VGT, raw prices, from `data/VGT/data.csv`, grouped by the repository's
    `groupMarketSessions`.
  - Only the regular session is used: 09:30 ET to 16:00, or 13:00 on early-close days, plus the closing print.
    Extended hours are excluded, as in D1.
  - The 2016–2024 development window has 2,264 sessions and 734,112 regular bars, with no duplicates, no out-of-order
    rows and no invalid OHLC.
  - Bars are **sparse**: a minute without trades has no bar. Only a median of 286–371 of the 390 minutes have one, and
    missing minutes are never filled in.
  - These are 1-minute bars, not tick data: the order of prices within a minute is unknown.
- **Data doors.**
  - **Development:** the pinned byte prefix through 2024-12-31 (42,469,694 bytes, sha256 `c144619f…9ecb`), read with
    a byte limit, so no 2025 byte entered any development stage.
  - **Validation:** the whole file (sha256 `2ee06310…412e`), opened once, after the freeze commit, with the 8-for-1
    split of 2026-04-21 forward-adjusted.
  - Every door opening is logged in `results/doors.jsonl`.
- **Execution** (Study 8's convention, imported unchanged from its context):
  - $100,000 notional per entry (returns are on that notional), one position, fractional shares.
  - 5 bps per side, built into the entry price, so every D1 net test sees it.
  - 11% simple interest by calendar nights: zero for a same-day round trip, three days over a weekend.
  - Stops fill at the stop level, or at the opening trade when a minute or period opens through it.
- **Same-bar policy:**
  - Decisions are made on completed minutes and fill at the next observed trade.
  - The stop level and its activation are fixed before each period.
  - Entry and exit can never fall in the same period, so never in the same bar.
  - The optimistic intrabar stop fill is bounded by gating stresses (next-open fill, +25 bps slippage) and by a
    report-only worst-trade-of-the-minute fill.
- **Cost realism** (development data, `results/report/diagnostics.json`):
  - VGT's median 1-minute high–low range is 0.9–3.2 bp.
  - Roll's effective-spread estimate is 0.7–1.7 bp, so 5 bps per side is conservative against the spread.
  - However, the median 1-minute dollar volume was only $62k–$89k in 2016–2017 (rising to $437k in 2024). A $100,000
    market order would often exceed a typical minute's volume in the early years, and market impact is not modelled.
- **Integrity:**
  - Local hash chain: protocol → A1 → parity → search → qualify → selection → validation. It verifies with 0 problems.
  - Git commits: `f90d990` (protocol freeze, before the search) and `b3571c1` (selection freeze, before validation).
  - The validation stage refused to run unless the freeze was committed and the decision-relevant code was unchanged.

## 3. Study 8 methodology, as reused

Executable Study 8 was audited (`audit/STUDY8_AUDIT.md`; transfer map in `audit/METHODOLOGY_TRANSFER_MAP.md`). Its
V-track (VGT-alone) pipeline was reproduced stage for stage:

1. **Screen:** 8,192 scrambled-Sobol centres; plausibility filter; ≤ 1,024 promoted.
2. **Rung 1 and NSGA-II:** 16-point Latin-hypercube neighbourhoods; four NSGA-II islands of 64, each with 2,048 new
   configurations (≤ 8 islands under trigger T1); stagnation on the 2-D hypervolume.
3. **Rungs 2–3:** rung 2 keeps 192 at 64 points; rung 3 keeps 48 at 128 points.
4. **Refinement:** six starts, two passes.
5. **T2 tie check:** bootstrap.
6. **Shortlist:** ledger de-duplication; profit, robust, balanced, centre, front and infeasible picks.
7. **Selection, qualification and freeze:** selection 2 × 128; confirmation 3 × 128 with gates Q1–Q8, E1, E2; roles;
   tiering against B1; sealed freeze.
8. **Validation:** test 3 × 128 and gates T1–T7.

Study 8's scoring functions, thresholds, budgets and stresses are **imported unchanged**. What changed:

- **The box and radii:** Study 8's daily eight-ETF box contains no intraday magnitudes; the new box is log-spaced with
  ±19–21% radii, derived before the search from development data only.
- **The C3 episode count:** distinct quarters with an entry. Study 8's 10-session-gap rule would penalize continuous
  activity.
- **Removed as pool-specific:** E3 and the pool devices.
- **Folds:** only the fold matching this chronology was run (Study 8's F24, training through 2024-12-31). Study 8's
  expanding folds F19–F23 are anchored walk-forward re-optimizations, which the brief excludes.

## 4. Development results (2016–2024)

### 4.1 Search funnel (`results/search/search.json`, 182,054 point evaluations, 0.8 min on 14 worker threads)

| Stage | Result |
|---|---|
| Sobol screen | 8,192 centres; 594 plausible; all 594 promoted |
| Rung 1 (archive) | 7,890 configurations, **0 feasible** |
| NSGA-II islands | 4 islands (3 stopped on budget, 1 on stagnation); T1 did not fire (no feasible hypervolume) |
| Rung 2 / rung 3 | 0/192 and 0/54 feasible (rung 3: 48 + 6 refinement endpoints) |
| Shortlist | 4 "infeasible on training" fillers |

The best near-misses violate **only C5** (neighbourhood median ≥ $10,000/yr). Shortlist #1, `id-5.1v.e.1f.1y.t.1y.6.1f`:

- **Parameters:** B 130 min, X 4.96% (box maximum), Y 0.045%, S 0.98%, H 3,949 trading minutes (box maximum),
  L 159 min, U 0.70%, P 0.071%, W 1,291 min.
- **Centre:** net $71,246 ($7,997/yr), minute DD $17,280, 83 trades.
- **Concentration and capital use:** top trade 9.7% of net, best year 41% (2020), ex-best-year $5,283/yr,
  $62,211 per capital-year.
- **Confirmation neighbourhood (383 points):**
  - share below the DD ceiling 99.7% (Wilson lower bound 0.988), p90 DD $27,031;
  - median **$6,444/yr**, p10 $3,595/yr; 100% of neighbours profitable;
  - Q8 plateau ratio 0.81.
- **Variants:** in-box share 96.1% (median $5,018/yr); half radius median $7,201/yr; 1.5× radius median $5,307/yr.
- **Gates:** Q1–Q8 and E2 all pass; **E1 fails** ($6,444 < $10,000).
- **All four Q7 stresses stay profitable:** 10 bps $57,386; 14% interest $74,299; next-open stops $53,892;
  +25 bps slippage $46,069.

In short, this configuration is **robust but under-profitable**, and it sits at the edge of the box: three
coordinates are within one radius of their upper bound, and 279 of 383 neighbours were clipped.

### 4.2 Why the intraday region fails (`results/report/diagnostics.json`, development only, report-only)

**Unbiased Sobol screen at 5 bps per side, by dip threshold X:**

| X | configs | profitable | median net | p90 net | median trades | median costs |
|---|---:|---:|---:|---:|---:|---:|
| < 0.5% | 3,373 | 521 (15%) | −$173,904 | $26,915 | 2,446 | $244,485 |
| 0.5–1% | 1,446 | 181 (13%) | −$142,034 | $13,783 | 1,784 | $178,294 |
| 1–2% | 1,445 | 165 (11%) | −$85,313 | $6,262 | 1,005 | $100,454 |
| 2–4% | 1,446 | 450 (31%) | −$20,347 | $18,515 | 353 | $35,303 |
| ≥ 4% | 482 | 298 (62%) | +$5,011 | $24,376 | 97 | $9,704 |

**By period length B (unbiased screen):** the median net improves monotonically, from −$135,678 at B 5 to −$61,079 at
B 130. **In the search archive**, 7,867 of 7,890 explored configurations have X ≥ 2%: the optimizer abandoned the
small-dip region because nothing there was near-feasible.

**The most profitable genuinely intraday archive configuration** (B 15, X 0.32%, Y 0.99%, S 0.69%):

- **Edge per trade:** 679 trades with a pre-cost gross of only **23.7 bp per trade**, against 10 bp of round-trip costs.
- **Net at different costs:** $91,277 at 0 bps, $71,894 at 2 bps, $41,659 at 5 bps, with a $32,129 drawdown.
- **Holding:** even this configuration holds a median of 3 days. Only 16% of its trades close in the session they
  opened, because D1's profit-conditioned stop stays off while a trade is under water, and the maximum hold sells
  only at a period open when losing.

**Costs move decisions as well as P&L.** Net is **not monotone in cost**: under Study 8's convention the entry cost
enters D1's net tests (stop activation, maximum hold, continuation), so a cost change can reroute the whole path of
trades. Reported break-even costs are bisection crossings, and the full cost curves are tabulated.

### 4.3 B1 (daily D1 `primary`) on the same development door

| | Net | Trades | Confirmation share | Median/yr | p10/yr | Violated |
|---|---:|---:|---:|---:|---:|---|
| Development (2016–2024) | $135,359 | 17 | 100% | $8,364 | $5,151 | C5 (median), C7 (top trade 38% > 25%) |

B1's development net is about twice the intraday near-miss's, from a fifth of the trades. PBO over the 64 best rung-2
configurations is **0.57** (report-only; Study 8 found > 0.5 in 20 of 30 track-folds). The selection→confirmation
Spearman correlation is 0.80.

## 5. Frozen selection and validation

`FROZEN_SELECTION.json` (body `1dd6700c…`, committed in `b3571c1` before the door opened): **no role holder**, so no
preferred candidate. Under the pre-registered mapping (PROTOCOL.md §9) the recommendation is "no robust edge". The
validation door was opened once (2026-11-06T17:39Z) for the frozen shortlist, as a labelled diagnostic, and for B1.

### Shortlist #1 (diagnostic), one continuous causal run

| Window | Trades | Win % | Net (by entry) | Mark-attributed | PF | Notes |
|---|---:|---:|---:|---:|---:|---|
| Development 2016–2024 | 83 | 78.3 | $71,246 | $71,246 | 2.75 | 66 trades held overnight; median hold 4,185 wall-clock minutes |
| Validation 2025-01-02 → 2026-10-30 | 13 | 69.2 | $6,184 | $6,184 | 1.65 | |
| 2025 | 8 | 62.5 | $7,415 | $7,415 | 3.36 | |
| 2026 (partial, to 2026-10-30) | 5 | 80.0 | −$1,231 | −$1,231 | 0.81 | one −$6,382 trade |

- **Test gates (yTest 1.82):**
  - **Pass:** T1, T2 (validation neighbourhood share 98.2%), T2b, T4 (every stress has positive validation net),
    T6, T7.
  - **T3 fails:** validation net $6,184 is below $10,000 × 1.82, although the pooled validation median ($5,765) is
    above $5,000 × 1.82.
  - **T5 fails:** whole-run concentration.
- **Degradation:** the development pace was $7,997/yr; validation ran at $3,396/yr (−58%).
- **The other three shortlist members:** nearly identical behaviour, with the same failures.
- **B1 on the same run:** validation +$40,901 from 4 trades (2025 +$47,463; 2026 −$6,561).
- **Boundary handling:** no trade straddled 2024-12-31. The development attribution of the continuous run equals the
  development-door result exactly ($71,245.59), so nothing leaked or was double counted.

### Per-year table (shortlist #1, diagnostic)

Full table, with average win/loss, median, expectancy, costs, financing, profit factor, worst trade and loss streak:
`results/report/REPORT_TABLES.md`.

| Year | Window | Trades | Win % | Gross pre-cost | Costs | Financing | Net | Minute DD in year | PF |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 2016 | dev | 0 | – | 0 | 0 | 0 | 0 | 0 | – |
| 2017 | dev | 0 | – | 0 | 0 | 0 | 0 | 0 | – |
| 2018 | dev | 9 | 88.9 | 4,202 | 902 | 1,627 | 1,672 | 13,788 | 1.27 |
| 2019 | dev | 12 | 91.7 | 16,762 | 1,208 | 2,230 | 13,324 | 4,834 | 109.1 |
| 2020 | dev | 35 | 74.3 | 37,790 | 3,517 | 4,792 | 29,481 | 17,280 | 2.41 |
| 2021 | dev | 4 | 75.0 | 4,171 | 402 | 603 | 3,166 | 8,838 | 17.5 |
| 2022 | dev | 18 | 72.2 | 15,577 | 1,807 | 2,923 | 10,847 | 9,472 | 1.85 |
| 2023 | dev | 0 | – | 0 | 0 | 0 | 0 | 0 | – |
| 2024 | dev | 5 | 80.0 | 13,685 | 507 | 422 | 12,756 | 3,772 | 19.2 |
| 2025 | val | 8 | 62.5 | 9,214 | 804 | 995 | 7,415 | 15,466 | 3.36 |
| 2026 (partial) | val | 5 | 80.0 | 143 | 500 | 874 | −1,231 | 8,311 | 0.81 |

All drawdowns are of the strategy's marked P&L on the $100,000 notional (minute-sampled, within the year). The sealed
tables' "exposure %" column is wall-clock minutes held ÷ regular-session minutes, so it exceeds 100% for overnight
holders. In calendar terms, entries occurred on 3.4% of development sessions and 2.8% of validation sessions.

## 6. Robustness diagnostics (shortlist #1 unless stated; report-only)

- **Neighbourhood versus centre.**
  - Development: centre $7,997/yr against a neighbourhood median of $6,444/yr and p10 of $3,595/yr. The centre is
    not an isolated peak (Q8 0.81), but the whole region sits below the $10k/yr bar.
  - Validation neighbourhood: median $5,765 over the window ($3,166/yr), p10 −$549; 89% of neighbours positive in
    validation.
- **Temporal consistency (development).**
  - There were no entries in 2016, 2017 or 2023. With B = 130 the 159-minute lookback rounds to the previous period
    alone, and no minute closed 4.96% below the previous 130-minute period's high. Without a profitable exit, no
    continuation window opens either. 2020 supplied 41% of the profit.
  - By regime of the entry month (labels use the month's whole return and volatility tercile, so they are descriptive
    and not causal):
    - bull months: 48 trades, +$79,710;
    - bear months: 35 trades, −$8,464;
    - high-volatility months: 67 trades, +$44,906;
    - mid/low-volatility months: 16 trades, +$26,340.
  - The profit is a **dip-buying-in-uptrends** effect concentrated in high-volatility periods.
- **Trading frequency.**
  - Entries happened on 77 of 2,245 development sessions: median 1 per active session (max 2), 1 per active week
    (max 6), 3 per active month (max 11).
  - Time of day: entries cluster at 09:30–10:00 (24) and 11:00–12:00 (21); exits at the open (21 at 09:xx) and
    11:00 (25).
  - Validation: 13 entries on 459 sessions.
- **Execution sensitivity** (development / validation net):

  | Setting | Development | Validation |
  |---|---:|---:|
  | 0 bps | $82,619 | $7,493 |
  | 1 bps | $76,001 | $7,231 |
  | 2 bps | $74,203 | $6,969 |
  | 5 bps (base) | $71,246 | $6,184 |
  | 10 bps | $57,386 | $4,877 |
  | 20 bps | $50,502 | $2,266 |
  | Next-open stops | $53,892 | $6,472 |
  | +10 bps stop slippage | $55,454 | $4,970 |
  | +25 bps stop slippage | $46,069 | $3,149 |
  | Minute-low stop fills (worst case) | $53,047 | $5,782 |
  | 8% interest | $74,753 | $6,694 |
  | 14% interest | $74,299 | $5,674 |
  | Pro-rata interest (ledger re-accounting) | $71,245 | $6,198 |

  - Break-even cost is about **82 bps per side** in both windows. This daily-like configuration is not cost-fragile,
    whereas the genuinely intraday region is (§4.2).
  - About 45% of exits (37/83) fill at the assumed stop level (optimistic intrabar); the next-open and minute-low
    bounds cut development net by about 25%.
- **Concentration and tails.**
  - Development: top trade 10% of net, top 5 trades 39%, top 10 trades 62%, top 5 days 36%.
  - Worst trades: −$11,889 (the 2020-02-24 entry), −$6,482, −$6,189. MAE: median −1.0%, 5th percentile −7.6%,
    worst −15.4%. Longest losing streak: 3 trades.
  - Validation: one trade is 51% of net; the top 5 trades are 191% of net.
- **Validation degradation:** −58% in profit pace. Share and drawdown persisted (98.2% share; whole-run DD $17,280),
  as Study 8's archive audit found for risk measures. Profit did not persist.

## 7. Assessment against Study 8's verified robustness discipline

| Study 8 requirement | Intraday D1 (best region) | Status |
|---|---|---|
| C1/Q1 centre minute DD < $35k | $17,280 | pass |
| C2/Q2 neighbourhood share ≥ 0.90, p90 DD < $35k | 99.7%, $27,031 | pass |
| Q2b in-box pair (near bounds) | 96.1% | pass |
| C3/Q5 activity floors (lots, quarters, lot-years) | 83, 13, 6 | pass |
| C5/E1 neighbourhood median ≥ $10k/yr, p10 > 0 | $6,444/yr; p10 $3,595/yr | **fail** (binding everywhere) |
| C6/E2 ≥ $11k per capital-year | $62,211 | pass |
| C7/Q4/Q6 concentration (top trade, best year, ex-best) | 9.7%, 41%, $5,283/yr | pass |
| Q7 stresses (10 bps, 14%, next-open, +25 bps) | all net > 0, DD < $35k | pass |
| Q8 plateau (nb median ≥ 0.6 × centre) | 0.81 | pass |
| Feasible region exists in the intraday box | none (0 of 7,890) | **fail** |
| Validation T1–T7 (diagnostic only) | T3, T5 fail | **fail** |

The intraday rules are **robust in risk terms but not profitable enough**. The only near-feasible region is the
daily-like corner of the box, and it falls short on Study 8's own profit bar.

## 8. Representative causal timelines (shortlist #1, development; from the ledger)

**Winner, lot 82 (continuation, +$6,904):**

1. A profitable exit opened the continuation window.
2. On 2024-08-12 the 15:42 ET minute closed at 536.74, at least 0.071% below the post-exit high, which armed a
   continuation setup at 15:43 with the trailing low at 536.74 and the rebound trigger at 536.98.
3. The 15:43 minute closed at 537.33, above the trigger, so the buy decision came at 15:44. It filled at the 15:44
   minute's open, 537.28.
4. The stop (high × (1 − 0.98%)) was first active two periods later and stayed active for 16 of 17 periods while the
   high rose to 8.4% above entry (MAE −0.15%).
5. On 2024-08-20 the 13:00 ET minute opened through the 576.70 stop and filled at 576.25 (exit `minute open through
   stop`).
6. Result: held 8 nights; gross $7,249, costs $104, interest $241.

**Loser, lot 23 (continuation, −$11,889):**

1. On 2020-02-24 the 13:52 ET minute closed at 254.54, which armed a continuation setup at 13:53.
2. The 13:53 minute set the trailing low at 254.46. The 13:54 minute closed at 254.64, so the buy decision came at
   13:55. It filled at the 13:55 minute's open, 254.58.
3. The COVID sell-off began. The stop, 0.98% below the post-entry high, was never active because it sat below the
   cost-inclusive breakeven. D1 holds an under-water trade until the maximum hold.
4. After H = 3,949 trading minutes (about ten sessions), the position was still losing at the period open, so the
   maximum hold sold it at the next trade, 2020-03-10 09:31 ET, at 225.69.
5. Result: MAE −15.4%; interest $452 over 15 nights. This is the strategy's worst trade, and it shows D1's exposure
   to a crash while the stop is still off.

## 9. Limitations and disclosures

- **Bars, not ticks.** Intraminute order is unknown. Stop-level fills are assumed (37 of 83 development exits), and
  bounded by the next-open, +25 bps and minute-low scenarios. Sparse minutes mean "the next minute" is the next
  observed trade, possibly several minutes later.
- **Market impact.** A $100,000 order exceeded the median minute's dollar volume in 2016–2017; impact is not modelled.
  The 5 bps per side is conservative against VGT's estimated 1–2 bp spread, but not a model of depth.
- **No quote data.** Bid/ask is inferred from minute ranges and Roll's estimator only.
- **Dividends.** Raw prices are used and distributions are not credited (D1's convention). An ex-dividend drop counts
  as a price move. This is minor for trades held a few days.
- **Pattern-day-trader and margin rules.** These are assumed satisfied by an account large enough to borrow $100,000.
  Not modelled.
- **Hold-clock deviation.** H is in trading minutes rather than calendar days (justified in the design note).
  Interest stays calendar-based. A pro-rata interest re-accounting changes little.
- **Box edge.** The best region lies on the box's upper bounds (B 130, X 4.96%, H 3,949). The bounds were fixed before
  the search to keep the strategy intraday and were not moved afterwards. Beyond them lies daily D1, which is out of
  scope and already studied.
- **Amendment A1** (parity comparator defect, before any search) is recorded in `AMENDMENTS.md`.
- **Data peeks.** While pinning the development prefix, one shell command displayed the next row's timestamp
  (2025-01-02T12:26Z) without prices. The audits read D1's own historical 2025–2026 results (daily D1, not any new
  candidate).
- **Post-study door.** A post-study `run` re-ran shortlist #1 on the full history (logged as door "full (post-study
  run)") to check the CLI. It reproduced the sealed validation numbers exactly.
- **Rule-parity scope.** Parity is proven against the canonical file and Study 8's machines, which share D1's
  semantics. A defect common to D1 itself would not be detected; none is known.

## 10. Should walk-forward recalibration be tried?

**Not recommended on this evidence.** The failure is structural rather than a matter of when the parameters are
re-tuned:

- At intraday magnitudes, turnover times a realistic cost overwhelms a gross edge of a few tens of basis points.
- Where the edge survives, it is a slow, regime-dependent dip-buying effect: profitable in bull and high-volatility
  months, and rare (no entries at all in 2016, 2017 or 2023).

Study 8's own archive audit found weak out-of-fold rank persistence (PBO > 0.5 in most folds), and this study's PBO is
0.57. Re-optimizing on rolling windows would likely chase noise. A different question, such as an intraday entry
concept that is not D1's, or a limit-order execution model, would need its own separately authorized protocol.

## 11. Reproduction (repository root; Node 24.21.0)

```sh
npm run intraday-d1 -- parity     # P1/P2/P3 on the development door (sealed: results/parity/parity.json)
npm run intraday-d1 -- search     # Study 8 V-track search (sealed; refuses to rerun)
npm run intraday-d1 -- qualify
npm run intraday-d1 -- freeze     # then commit FROZEN_SELECTION.json before:
npm run intraday-d1 -- validate   # once; refuses if already sealed
npm run intraday-d1 -- report     # results/report/REPORT_TABLES.md
npm run intraday-d1 -- diagnose   # results/report/diagnostics.json (development only)
npm run intraday-d1 -- verify     # re-hash the chain
npm run intraday-d1 -- run --candidate id-5.1v.e.1f.1y.t.1y.6.1f --door full   # any parameter set: see src/intraday-d1/run.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/intraday-d1/tests/*.test.ts
```

All seeds are `deriveSeed('intraday-d1-vgt', …)` (sfc32), so reruns are deterministic. The sealed stages refuse to
overwrite their records, so a full re-execution needs a copy of the study directory without `results/`. Exact
commands, hashes and timings are in `RUN_COMMANDS.md` and `RESEARCH_RECOVERY.md`.
