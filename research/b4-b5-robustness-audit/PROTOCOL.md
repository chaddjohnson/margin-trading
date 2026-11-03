# B4/B5 frozen-strategy robustness audit — pre-registered protocol

Version 1. Written 2026-10-27 after the baseline verification (`npm run pools -- verify`, all checks passed) and
**before any audit experiment** (perturbation, ablation, cost stress, attribution, concentration or portfolio-risk
run). Frozen by `PROTOCOL_FREEZE.json` (sha256 of this file). Any later change is an amendment appended in §12 with
its reason and time. A gate threshold is never changed after results are seen.

## 1. Purpose and status of the evidence

This is a diagnostic audit of two **already selected, frozen** D1 shared pools: B4 (`config/pools/B4.json`) and B5
(`config/pools/B5.json`). It optimises nothing, selects no winning perturbation, and promotes, persists or defaults
no configuration. Every variant below is **diagnostic-only**. It is never written to `config/`, and it is labelled
as diagnostic in every record.

The whole 2016-01-04 → 2026-10-13 history was inspected while B4 and B5 were chosen, including 2024–2026. Nothing
here is out-of-sample evidence. Local neighbours, years, regimes, books and trades share one price history and are
not independent observations. The neighbourhood statistics describe the shape of the in-sample response surface; they
are not validation.

## 2. Frozen baseline and conventions (unchanged from the pools)

- **Engine:** the N-book allocator `src/portfolio-aware-d1/nbook/engine.ts` (`runNAllocator`), called with exactly
  the configuration that `src/pools/run.ts` (`runPoolOn`) builds. Imports are read-only. No file bound by
  `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` is edited.
- **Data:** the canonical `data/<SYMBOL>/data.csv` (`all` partition), 2016-01-04 → 2026-10-13, 2,710 sessions. The
  hashes are pinned in the pools. Splits are forward-adjusted (`config/market-events/splits.json`). Books arm from
  2017-06-15 (session index 365).
- **Fixed pool:**
  - one funded slot, shadow policy, $100,000 per funded trade, never compounded;
  - 11% simple interest on a 365-day year;
  - 5 bps per side;
  - stops fill at the stop, with 0 extra stop slippage;
  - same-minute ties go in alphabetical order.
- **Dynamic portfolio:**
  - $300,000 core, 60% VOOG / 40% VGT, never liquidated to fund exposure;
  - each funded trade borrows 20% of marked equity at the decision, in one shared slot;
  - profits are reinvested 60/40, and losses are funded by core sales (the frozen policy);
  - Reg T and the U35 house requirement are checked at entry;
  - maintenance ratios are measured passively, with no calls and no forced sales;
  - **frozen** dividend convention, which the anchors use: the core and open VGT lots receive VGT/VOOG
    distributions, and no other lot receives a distribution. The **symmetric** convention, in which no lot is
    credited, is reported once as a sensitivity.
- **No-margin control C0:** the same engine and portfolio with no books (`src/joint-16-etf-d1/controls.ts`).
- **Regression anchors** (the audit runner must reproduce them before anything else is interpreted):

  | | Fixed net | Fixed max minute DD | Lots | Portfolio end equity | Portfolio max daily % DD |
  |---|---:|---:|---:|---:|---:|
  | B4 | $284,244.74 | $28,659.34 | 76 | $3,608,484.05 | 34.65% |
  | B5 | $486,207.77 | $26,509.97 | 94 | $5,410,976.72 | 29.67% |

  Monetary values must match to the cent and percentages to 0.01 pp. The audit runner must also equal
  `runPoolOn` field for field (lots, signals and daily rows). If either check fails, the comparative audit stops (§10).

## 3. Workstream A — parameter fragility

**Parameters:** the eight D1 parameters of every book:
- X `targetPercentChange`
- Y `trailingBuyPercentage`
- stop `trailingStopPercentage`
- hold `maximumHoldDays` (calendar days)
- L `tickWindowSize` (sessions)
- buffer `intradayLossBuffer`
- P `pullback`
- W `continuationWindow` (sessions)

Percentages are in tenths of a percentage point (the 0.1-pp grid). Two other fields have no numeric value to
perturb, so they are not perturbed: `stopPolicy` is fixed to 'net' and `postExit` is fixed to true. GDX has no
GDX-specific control beyond these eight.

**Legal region:** the engine's admissible grid in `src/d1-refinement/families.ts`:
- X 3.0–30.0%;
- Y 0.1–15.0%;
- stop 2.0–15.0%;
- hold 2–60 days;
- L 20–365 sessions;
- buffer 0.0–6.0%;
- P 1.0–20.0%;
- W 5–250 sessions.

The engine requires no cross-parameter relationship. The largest tested L is 276 sessions (KRE + m), below the
arming index of 365, so every reference high is fully formed before arming.

**Distances** (s = small, m = moderate; v = frozen value in grid units):
- percentage parameters with v ≥ 2.0%: s = ±0.5 pp, m = ±1.0 pp;
- percentage parameters with v < 2.0% (here VGT Y 0.3%, XBI Y 1.2%, GDX Y 0.4% and XBI buffer 0.1%):
  - the ±0.5 pp rule would be a relative change of 40% to 500%, or impossible, so a relative rule applies;
  - s = ±max(0.1 pp, round(0.25·v));
  - m = ±max(0.2 pp, round(0.5·v));
  - rounding is half-up to the 0.1-pp grid;
- integer parameters (hold, L, W): s = ±max(1, round(0.10·v)), m = ±max(s + 1, round(0.20·v)).

**One-at-a-time (OAT):**
- For each pool, each book and each parameter, run v − m, v − s, v + s and v + m, holding everything else frozen.
- A point outside the legal grid is **infeasible**. It is recorded with its reason and not run, and it is never
  replaced. For example, XBI buffer 0.1% − 0.2 pp is infeasible.
- **Supplementary boundary probes** (labelled, excluded from every gate statistic): XBI X = 30.0% and KRE X = 29.9%
  sit at or one step under the grid ceiling. Their upward OAT points (XBI 30.5% / 31.0%; KRE 30.4% / 30.9%) are run
  outside the grid as a description of the boundary. The engine computes them; they are not legal phenotypes.

**Joint local neighbourhoods:**
- **Design.** For each pool, a Latin hypercube over all books' parameters together (32 dimensions for B4, 40 for B5).
  Each coordinate is uniform over the legal grid values inside [v − m, v + m]; this range is truncated by the grid,
  so the boundary parameters have asymmetric ranges.
- **Samples.** N = 64 per pool for seed 1 (primary) and N = 64 for seed 2 (the sampling-variability replicate).
- **Mapping.** Stratum j of dimension d is (π_d(j) + u)/N. The sample index is floor(value × count) over that
  coordinate's legal values.
- **Seeds.** sfc32 (`src/optimizer/rng.ts`) seeded by `deriveSeed('b4-b5-robustness-audit-v1', 'joint', <pool>,
  <seed>)`.
- **Per-book neighbourhoods.** For each pool and each book, N = 32 samples that vary only that book's eight
  parameters, with the same construction under the label `'book'`, `<pool>`, `<symbol>`, seed 1.
- **Rejections.** Every sample is inside the legal grid by construction, so none is rejected for validity. An engine
  error is recorded as a failed run and never replaced. Samples identical to the frozen vector are kept and flagged.
- **Modes.** Every OAT point and every sample is re-run through the full shared allocator, in **fixed** and in
  **portfolio** mode, at the base costs. Multi-book results are never sums of standalone runs.

**Reported per pool:**
- the baseline;
- OAT tornado and range tables;
- for each neighbourhood design:
  - median, P10 and P90;
  - the worst case;
  - the share with fixed net > 0;
  - the share whose portfolio max daily % DD exceeds 30% and 35%;
  - the share with portfolio incremental end equity over C0 > 0;
  - the baseline's percentile rank among its neighbours;
- metrics:
  - fixed net margin P&L, gross, interest, friction, lots, wins and losses, realised losses (the sum of losing lots),
    worst lot;
  - exposure (lot-days, and sessions held ÷ sessions from arming);
  - fixed max minute and daily DD ($ and % of $100k);
  - net ÷ minute DD;
  - portfolio end equity;
  - portfolio max daily and minute % DD (running peak) and $ DD;
  - net per $1M borrowing dollar-days.

**Gate statistic A** uses the primary joint neighbourhood (seed 1), fixed mode:
- the share of samples with net > 0;
- the median net ÷ frozen net.

## 4. Workstream B — years and regimes

**Calendar years.** The base runs' daily rows (fixed: `strategyMark` = realised + unrealised, net of accrued
interest; portfolio: marked `equity`) attribute the marked-to-market change from the last close of year Y−1 (for 2016,
the start) to the last close of year Y.

The same table also reports:
- interest accrued in the year (the change in `cumulativeInterest`);
- lots entered and exited;
- realised net by exit year;
- the deepest daily-close drawdown inside the year;
- open-lot status at the year boundary.

Year labels:
- 2016 and 2017 to 2017-06-14 cannot trade (arming starts 2017-06-15), so 2017 is labelled **partial eligibility**;
- 2026 is **partial: 2026-01-02 → 2026-10-13**.

**Leave-one-year-out.** This is **attribution only**: total − that year's marked-to-market contribution. No bar is
deleted, no paths are joined and no peak is reset, and it is not an executable backtest. The report gives:
- the top-1 and top-2 year shares of total fixed net;
- the worst year;
- the B5 − B4 difference per year.

**Regimes.** These were fixed mechanically from VOOG daily closes (split-adjusted, price-only) before any audit run.
A **stress** is a fall of ≥ 15% from the running closing high, from the session after the peak to the trough. A
**rebound** runs from the session after the trough to the first close at or above the old peak. Attribution runs
close to close:

| ID | Regime | Stress (peak close → trough close) | Rebound (trough close → recovery close) |
|---|---|---|---|
| R1 | 2018 Q4 selloff (−21.0%) | 2018-10-01 → 2018-12-24 | 2018-12-24 → 2019-04-23 |
| R2 | 2020 crash (−31.6%) | 2020-02-19 → 2020-03-23 | 2020-03-23 → 2020-07-02 |
| R3 | 2022 bear market (−33.1%) | 2021-12-27 → 2022-10-14 | 2022-10-14 → 2024-03-20 |
| R4 | 2025 selloff (−22.3%) | 2025-02-19 → 2025-04-08 | 2025-04-08 → 2025-06-24 |

Further named periods:
- "2023 recovery" = calendar 2023 (it lies inside R3's rebound);
- "2026 partial" = 2025-12-31 close → 2026-10-13 close;
- the ≥ 10% VOOG corrections are listed for context only: 2020-09-02 → 09-23, 2024-07-10 → 08-05 and
  2025-10-29 → 2026-03-30.

Per window, the report gives:
- the fixed-pool marked-to-market change;
- interest accrued;
- lots entered;
- lot-days in the window;
- the worst MAE among lots entered in the window;
- portfolio returns for B4, B5 and C0.

## 5. Workstream C — books

Leave-one-book-out pools:
- **from B4:** −VGT, −XBI, −XRT, −KRE (3 books each);
- **from B5:** −VGT, −XBI, −XRT, −KRE, −GDX (4 books each).

Each run keeps the other books' frozen phenotypes and the frozen shadow allocator, and runs in fixed and portfolio
mode at the base costs.

"B5 − GDX" must equal B4 lot for lot, signal for signal and in every daily row. If it does not, the reason is
investigated and reported. For each ablation the report gives:
- fixed and portfolio metrics (as in §3);
- the change in funded lots of the remaining books (lots gained or lost through freed or blocked capacity, by
  (symbol, decision time));
- refusals by holder;
- the incremental value and the marginal change in peak DD of each book versus its parent pool.

The B5 − B4 bridge (`bridgeOf`) splits the difference into three groups, by year and regime:
- lots only B5 funded;
- lots only B4 funded;
- lots both funded.

## 6. Workstream D — financing, costs and execution

The cost layers are defined so that none is double-counted. The engine applies one multiplicative per-side
adjustment to every fill price, `costBps`, plus an extra adverse adjustment on stop fills only, `stopSlippageBps`:
- **fee/spread** (the baseline 5 bps, standing for the commission-free spread and fee crossing) and **additional fill
  slippage** both enter through `costBps`, as their sum per side. The engine cannot tell them apart, so a
  "10 bps fee" run and a "5 bps fee + 5 bps slippage" run are the same run, reported once with both labels;
- **stop overshoot** is `stopSlippageBps` on stop and stop-gap exits only, on top of `costBps`;
- **stop fill rule** `next-open` fills at the first trade after the trigger minute instead of at the stop level. It is
  an execution-rule stress and a different exit path, not a cost;
- **financing:** the annual simple rate on both the books' net-profit stop test and the ledgers.

Rate and per-side cost both change the trade path (the net-profit trailing stop and the continuation window use net
after interest and friction), so **every scenario is re-simulated**. No cost is recomputed from the base ledger. Each
scenario reports the funded-lot set changes versus the base: lots added or removed, and exits changed. This separates
path changes from pure cost subtraction.

Scenarios (both pools, fixed and portfolio):

| ID | Rate | costBps per side (fee + slippage) | Stop overshoot | Stop fill |
|---|---:|---:|---:|---|
| base | 11% | 5 (5 + 0) | 0 | stop |
| r08 / r14 / r18 | 8% / 14% / 18% | 5 | 0 | stop |
| f00 / f02 | 11% | 0 / 2 | 0 | stop |
| f10 | 11% | 10 (10 + 0 = 5 + 5) | 0 | stop |
| f15 | 11% | 15 (5 + 10) | 0 | stop |
| f20 | 11% | 20 (20 + 0 = 10 + 10) | 0 | stop |
| f30 | 11% | 30 (5 + 25) | 0 | stop |
| f45 | 11% | 45 (20 + 25) | 0 | stop |
| s10 / s25 / s50 / s100 | 11% | 5 | 10 / 25 / 50 / 100 | stop |
| nxo | 11% | 5 | 0 | next-open |
| C1 | 14% | 20 (10 + 10) | 0 | stop |
| C2 | 18% | 45 (20 + 25) | 0 | stop |
| C3 | 18% | 45 (20 + 25) | 50 | stop |

**Break-even** rate or friction is reported only if the sign of the measured quantity changes between two tested
points. The value is then linearly interpolated between those two points and labelled as interpolated. It is never
extrapolated.

## 7. Workstream E — trades

The source is the base funded-lot ledgers (fixed mode). For B4, B5 and each book, the report gives:
- counts, wins and losses;
- gross and net, interest and friction;
- the win rate;
- the profit factor: gross wins ÷ |gross losses| of the lot nets, "∞ (no losses)" when there are no losing lots;
- median and mean net;
- holding periods;
- lot-days.

Concentration:
- the shares of total net from the top 1 / 3 / 5 / 10 winning lots, from the top year(s) and from each book;
- the total excluding the top N winners. This is a **descriptive** figure, not a feasible backtest;
- the losing tail, and open positions (none expected at 2026-10-13).

**MAE/MFE per lot** come from the symbol's regular-session minute bars legally observable while the lot was held:
- **Bars counted:** the entry bar k (its open is the fill, and its high and low follow the fill) through the bar
  before the exit bar.
- **Exit:** the exit price itself. The exit bar's range beyond the fill is not counted, because the order within a
  minute is unknown.
- **Entry and exit at the same bar:** the lot can't exit on its entry session, so this does not occur.
- **Formulas:**
  - MAE% = min(low) ÷ raw entry fill − 1;
  - MFE% = max(high) ÷ raw entry fill − 1;
  - in dollars, shares × (extreme − cost-adjusted entry price), before interest.
- **Cross-check:** the engine's `worstMark` (minute close, net of interest) is reported beside them.
- **Limitations:** one-minute OHLCV is not quote data. Gaps are seen as the next bar's open. A stop exit at the stop
  level assumes the stop traded.

**Clustering:**
- losing lots by regime window;
- the lots open during the five deepest portfolio drawdown episodes;
- signals refused because another book held the slot (from the signals);
- the B5 − B4 bridge rows ranked by contribution.

## 8. Workstream F — dynamic portfolio and risk

Runs:
- B4, B5 and C0 in portfolio mode at the base;
- B4 and B5 under C1, C2 and C3, the base with the symmetric dividends, and every neighbourhood sample (§3).

Reported for each:
- initial and final equity, total return and CAGR (calendar days ÷ 365.25);
- max drawdown, daily close and minute-sampled:
  - in $ (the engine's largest-dollar episode);
  - in % (running peak; `dailyPercentDrawdown` / `minutePercentDrawdown`, recomputed from daily equity as a check);
- drawdown duration and recovery, and the five deepest daily-close episodes;
- max principal and principal ÷ equity;
- time with a funded lot;
- minimum equity ÷ requirement for each passive schedule (U35, U50, U60, L50, L60, G50, G60) and its date;
- incremental wealth (B − C0 end equity) and incremental drawdown (B max % DD − C0 max % DD, same measure);
- return ÷ max daily % DD.

Thresholds: **30% preferred** and **35% conditional tolerance**. They are evaluation thresholds, not proof of safety.
Fixed-pool drawdowns (% of $100k) are never quoted as portfolio drawdowns.

Margin calls, liquidation and broker house rules beyond the frozen schedules are **not modelled**. The passive ratios
are reported as proximity only. In addition, the Vanguard 30-day rule (newly bought VGT/VOOG not marginable) is not
modelled.

## 9. Statistics

- No confidence interval is computed from i.i.d. trade assumptions.
- One **in-sample uncertainty diagnostic**: a stationary bootstrap (Politis–Romano) of the paired daily fixed-pool
  `strategyMark` changes of B4, B5 and B5 − B4:
  - from arming (2017-06-15) to the end;
  - mean block length 21 sessions;
  - 5,000 resamples;
  - seed `deriveSeed('b4-b5-robustness-audit-v1', 'bootstrap')`.

  It reports the resampled distribution of the total and the share of resamples ≤ 0. It assumes stationarity and
  dependence shorter than the blocks, and it is **not** validation.
- PBO and the deflated Sharpe ratio are not computed. B4's and B5's books came from several sequential searches whose
  complete trial counts and selection paths across studies are not available as one consistent record. The audit
  reports what the prior study records state, as context only.

## 10. Pre-registered interpretation gates (heuristic warning flags; thresholds never changed)

| Gate | Flag raised when |
|---|---|
| **A** Local stability | In the primary joint neighbourhood (seed 1, fixed): < 75% of samples have net > 0, **or** median net < 50% of the frozen net. |
| **B** Concentration | The largest single calendar-year marked-to-market contribution > 50% of total fixed net, **or** the top-3 winning lots' net > 50% of total fixed net. If total net ≤ 0, the flag is raised (shares undefined). |
| **C** GDX increment (B5 only) | (i) B5 − B4 fixed net ≤ 0 **or** B5 − B4 portfolio end equity ≤ 0 under any small plausible cost increase (r14, f10, f15, s25, C1); **or** (ii) > 50% of B5 − B4 fixed net comes from one calendar year **or** from one regime window of §4 (stress + rebound of one R counted together). |
| **D** Portfolio risk | Max % DD (daily close or minute) > 35% in the base or in C1/C2/C3 → **D35** flag; > 30% → **D30** flag. Reported for C0 too. Also flagged: the pool's base max % DD (daily close or minute) exceeds C0's on the same measure by any amount (**D+**, an incremental-risk flag). |
| **E** Costs | Under any moderate stress (r14, f15, f20, C1): fixed net ≤ 0, **or** portfolio incremental end equity over C0 ≤ 0, **or** under C1 fixed net falls > 50% from the base, **or** fixed net ÷ minute DD falls > 50%. |
| **F** Accounting | The runner does not reproduce the anchors and `runPoolOn`; or a ledger identity fails (Σ lot net ≠ final strategy mark; gross − friction − interest ≠ net by more than $0.01; per-year attribution not summing to the total); or minute DD < daily DD; or the recomputed running-peak % DD differs from the engine's by more than 1e-9. |

**Dispositions** (judgment categories, separately for B4 and B5, explained with evidence):
- **Retain for prospective validation:** no F flag; any A/B/C/E flag explained as non-material.
- **Conditional (material fragility):** at least one material A, B, C or E flag, while still profitable at the base
  and under C1.
- **Reject as currently specified:** a fixed net ≤ 0 under C1; or < 50% of the neighbourhood profitable; or a
  portfolio drawdown materially worse than C0 (D+, judged with its size) without a compensating incremental wealth.
- **Inconclusive due to audit blockers:** any F flag that is not resolved.

The D30 and D35 flags are discussed against C0. The unleveraged core alone already had a 33.9% daily and a 35.8%
minute drawdown (the frozen control). So the margin overlay's incremental risk, not the absolute level alone, decides
whether a pool worsens the portfolio's risk. A pool can never get a favourable verdict for more money if it pushes
total risk materially beyond C0's.

**Disclosure: what was known when these gates were written.**
- These figures were known from the brief, the pool configs and the frozen controls:
  - B4's and B5's base fixed net and DD;
  - their portfolio end equity and max daily % DD;
  - their minute % DD;
  - C0's end equity and its drawdowns.
- No audit-specific result (neighbourhood, ablation, cost scenario, attribution or concentration figure) had been
  computed.
- The A, B, C, D35/D30 and F thresholds are the brief's.
- These are this protocol's choices:
  - the scenario sets that make "small" and "moderate" concrete;
  - D+ (any increase over C0, so no margin is chosen);
  - E's "> 50% fall" as the reading of "disproportionately degrades".

## 11. Outputs

`research/b4-b5-robustness-audit/`:
- `README.md`;
- `MANIFEST.json`;
- `BASELINE_RECONCILIATION.md`;
- `PARAMETER_STABILITY.md`;
- `YEAR_AND_REGIME_ANALYSIS.md`;
- `ETF_ABLATION.md`;
- `COST_AND_EXECUTION_STRESS.md`;
- `TRADE_CONCENTRATION.md`;
- `DYNAMIC_PORTFOLIO_RISK.md`;
- `FINAL_ASSESSMENT.md`;
- `results/` (compact CSV and JSON).

Code is in `src/b4-b5-robustness/`, and the entry point is `npm run robustness-audit -- <command>`.

## 12. Amendments

(none)
