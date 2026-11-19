# Claude Code Research & Implementation Prompt — Intraday D1 (VGT, 1-Minute)

## Mission

Create, implement, test, optimize, and report on a **new, independent Intraday D1 strategy for VGT** in the existing `ai-trading` repository. It must operate on **1-minute market bars**, preserve the **same entry/exit rules and state-machine semantics as the existing D1**, and optimize its parameters for that finer timeframe.

**The existing daily D1 must remain completely intact.** Do not replace, refactor in a behavior-changing way, reconfigure, or overwrite its implementation, baselines, fixtures, results, or frozen phenotypes. The new strategy must be separately named, selectable, testable, and reproducible.

**Optimization directive:** Reuse the *actual, verified* **Study 8 robustness-focused optimization methodology**, adapting its multi-ETF/pool-specific parts only where necessary for a **single VGT strategy**. The primary goal is **robust net profitability**, not maximum historical profit, minimum drawdown, a particular win rate, or a predetermined number of trades.

**Fixed chronology:**

- **Development / backtesting / training:** January 1, 2016 – December 31, 2024.
- **Validation:** January 1, 2025 – the latest actually available, complete data in 2026 (report the precise cutoff; do not assume data exists through December 2026).
- Develop and select the final candidate(s) using **2016–2024 only**. Freeze parameters, criteria, execution assumptions, and evaluation protocol **before** inspecting the new candidates' 2025–2026 results. The user recognizes that this period has been examined in other research; describe it accurately as validation for this experiment, not as a universally untouched holdout.

**Out of scope:** multi-ETF pools, shared-margin allocation, combining this strategy with daily D1 or Growth, portfolio deployment simulations, changes to daily D1, and **new rolling/anchored walk-forward reoptimization**. The user may commission a *separate follow-up study* on walk-forward methods **only if these results warrant it**. Do not perform that follow-up now.

## 0. First: recover ground truth from the repository

Before designing or implementing anything:

1. Read the repository's current instructions and context-recovery files (including root `CLAUDE.md` and applicable research conventions). Inspect current Git branch/status and protect unrelated or uncommitted work.
2. Locate the **canonical D1 implementation and the precise D1 configuration/rule semantics** relevant to this experiment, including any continuation mechanisms and the distinctions between D1 variants. Identify which code paths are frozen and which are reusable; do **not** guess based on names or historical conversations.
3. Locate **Study 8's source code, research plan, optimization scripts/configurations, reports, manifests, and validation artifacts**. Reconstruct what was *actually done*, distinguishing verified behavior from documentation claims and any later modifications.
4. Produce a concise **methodology transfer map** before optimization:

   | Study 8 element | Verified source / implementation | Reuse unchanged | Adapt for standalone VGT | Reason / verification |
   |---|---|---|---|---|
   | Search / sampling | | | | |
   | Multi-objective scoring | | | | |
   | Candidate filters / constraints | | | | |
   | Local refinement | | | | |
   | Parameter-neighborhood testing | | | | |
   | Temporal robustness checks | | | | |
   | Selection / promotion / freeze | | | | |
   | Validation discipline | | | | |
   | Pool-specific mechanics | | | | |

5. **Do not assume** Study 8 used particular algorithms, sample counts, fold structures, or thresholds merely because they were discussed. For example, Sobol sampling, NSGA-II, local refinement, and staged neighborhood evaluations have been associated with Study 8 in our discussions; **verify these in the actual artifacts** and reproduce them *if they are indeed part of the canonical methodology*. If artifacts disagree, document the discrepancy and prefer authoritative executable evidence.
6. Identify adaptations **strictly required** because Study 8 selected multi-ETF phenotypes and evaluated a shared-capital pool, whereas this experiment optimizes one VGT strategy. Retain Study 8's robustness *principles and evaluation discipline*, but remove irrelevant ETF ranking, pool construction, and capital competition objectives. Do not invent a new optimization philosophy.

If critical source artifacts are unavailable, state exactly what could not be verified. Do not present a reconstructed approximation as a faithful Study 8 reproduction.

## 1. Strategy fidelity: same D1 rules, new clock

Build a new module/strategy entry point with an unambiguous name such as **`intradayD1`** (follow repository naming conventions). Use the existing D1 as the **behavioral specification**.

Requirements:

- Preserve D1's **entry eligibility, tracked peaks/lows, trailing-buy behavior (if applicable to canonical D1), trailing exits, profit-conditioned stopping, maximum losing-hold behavior, material-loss handling, lower-price reentry restrictions, recovery/reset rules, continuation eligibility, and all relevant sequencing / latching / state transitions**, *as implemented in the canonical D1*. If a listed mechanism is not actually part of that D1 variant, do not add it.
- Preserve the semantics of optional features and their defaults. Do not silently substitute a new strategy, add discretionary filters, switch to always-on stop losses, remove loss restrictions, or alter exit precedence.
- **Parameter values must be newly optimized.** Daily D1 magnitudes (e.g., ~7–8% trailing stop) should **not** be presumed sensible for intraday signals; a substantially smaller value (e.g., ~0.3%) is an illustrative hypothesis, **not a fixed requirement**.
- Carefully distinguish **lookback in bars**, **elapsed wall-clock time**, **regular-session trading minutes**, **trading sessions**, and **holding days**. Map every time-based D1 rule to a documented 1-minute interpretation that preserves the intended *mechanism* while permitting intraday-scaled tuning. In particular, investigate how session-based continuation windows, maximum losing holds, recovery resets, and any `tickWindowSize`-like parameters are implemented before translating them.
- Do not assume trades must close by end of day or must be held overnight. Preserve the applicable D1 holding semantics unless there is a demonstrated incompatibility; document overnight and session-boundary behavior.
- Allow an organically determined trade frequency. **Several trades per day are possible, not a target, constraint, or promised outcome.** Likewise, a ~0.5% winning trade is a research hypothesis, not an optimization target.

Create a **rule-parity matrix**: canonical D1 rule → source location → intraday implementation → parameter/time-unit mapping → regression/behavioral test → any unavoidable deviation. All deviations require justification; none may be hidden.

## 2. Market data, simulation integrity, and execution

- Use existing **VGT Alpaca SIP 1-minute history** and the repository's established data pipeline. Validate actual date coverage, gaps, duplicate bars, price/volume integrity, split/dividend adjustment policy, and whether prices and trade economics use compatible adjustment conventions. Do not fabricate missing bars or assume a continuous 24-hour exchange session.
- Explicitly distinguish **1-minute OHLCV bars** from **actual tick-by-tick trade/quote events**. This study uses the former unless genuine finer-resolution data already exists. Do not describe 1-minute bars as a guaranteed intraminute event sequence.
- Determine regular-session versus extended-hours scope from the repository's original D1 execution assumptions. State the selected market-hours policy and apply it consistently, including U.S. Eastern time, DST, early closes, holidays, overnight gaps, and session resets. Test relevant edge cases.
- Prevent lookahead: an order must not fill using data unavailable when the decision was made. Model the signal/decision timestamp, fill timestamp, order type, threshold crossing, and next-bar behavior explicitly.
- Resolve **same-bar high/low ambiguity** conservatively (or with a documented bounded-scenario policy). Never assume a favorable intrabar path when both entry and exit conditions could have occurred in one minute. Include conservative-versus-alternative fill sensitivity when material.
- Account for **bid/ask spread, slippage, commissions/fees if applicable, and financing costs**, with explicit, defensible assumptions and scenarios. Use **11% annual margin interest** as the existing research baseline unless repository canonical assumptions clearly dictate otherwise; report any deviation. Accrue financing according to actual borrow/exposure duration and the chosen broker-model convention; do not automatically charge a full day's interest for minutes-long positions without justification.
- Use the historical standalone notional/sizing convention (for example, **$100,000 borrowed per trade if that is the verified D1 benchmark**), or define a plainly comparable and justified fixed-capital baseline. Do not introduce ETF capital competition, pyramiding, or overlapping leveraged positions unless canonical D1 explicitly allows them. Specify whether returns are on exposure, borrowed notional, or account equity.
- Include realistic **execution-cost stress tests** that could overwhelm small intraday edges; report break-even transaction costs. Distinguish favorable idealized backtests from deployable assumptions.
- Make repeated runs deterministic with seeds, environment versions, dataset fingerprints, and exact commands. Require integrity checks on the full simulation event stream, especially entry/exit causality, stop activation, loss restriction, and trade-level cash accounting.

## 3. Optimize like Study 8, adapted to one instrument

Within **2016–2024 only**:

1. Define intraday-appropriate search bounds and parameter units from observed **development-period** VGT behavior, the canonical rule definitions, and defensible market-microstructure considerations. Document the bounds; avoid post-hoc bounds derived from validation outcomes.
2. Reuse the **verified Study 8** sampling/search, multi-objective evaluation, robustness filters, local exploration, parameter-neighborhood stages, and candidate-promotion criteria insofar as they apply. Replace pool-level economics with **standalone VGT net-return and risk metrics**; preserve the emphasis on robust profitability over isolated optima.
3. Evaluate **parameter neighborhoods**, not just the center configuration. Identify broad, stable profitable regions; quantify neighborhood median, adverse tail, feasibility/survival rate, and sensitivity to small changes, using Study 8's actual measures if present.
4. Preserve Study 8's actual **within-development temporal robustness checks** (including chronological subperiod checks if they were used). **Do not introduce a new rolling or anchored training/reoptimization method** in Stage 1 merely because it might sound more rigorous.
5. Consider profit concentration, regime dependence, drawdowns, tail losses, turnover, trading-hours concentration, trade count and duration, and market exposure, without overriding Study 8's central selection methodology.
6. Select a **small, explicitly justified shortlist**, with one preferred candidate if evidence supports it. Freeze candidates and the evaluation protocol before running validation.

**Selection objective:** repeatable **net profitability with stable neighborhoods, adequate performance across diverse development periods, and acceptable risk**, not the maximum backtest net, highest win rate, shortest drawdown, or highest trade frequency. If the strategy cannot survive reasonable costs and perturbations, report failure rather than lowering standards to force a winner.

Study 8 optimized multi-ETF pools. **Do not mechanically copy pooled P&L, diversification rewards, shared-margin allocation, or ETF-selection constraints** into the single-ETF objective. For every removed/adapted score component, explain the standalone substitute and why it preserves the underlying robustness intent.

## 4. Chronological isolation and validation

- All exploration, tuning, parameter-bound adjustments, diagnostics that guide selection, and candidate ranking must remain inside **2016–2024**.
- Before evaluating 2025–2026, record the frozen selected parameters, strategy version/hash, search evidence, exact costs and fill assumptions, selected metrics, validation protocol, and dataset cutoff.
- Evaluate frozen candidates **once under that protocol** against **2025 through the latest complete available 2026 data**. Report 2025 and 2026 separately as well as combined; make 2026's partial-year status unmistakable.
- Define what happens to state and open trades at the December 2024 / January 2025 boundary. Training metrics must never incorporate prices/events after December 31, 2024. If using historical warm-up to initialize validation state, it must be causal, and its effect must be disclosed. Define boundary trade marking/attribution so profit is neither leaked nor double counted.
- If validation is disappointing, **do not retune using 2025–2026** and still label the result out-of-sample. Report it faithfully, preserve candidates, and suggest separate future research only.

## 5. Required reporting — per trade, per year, and robustness

Deliver both a concise executive summary and reproducible detailed artifacts. At minimum:

**Per-trade ledger (machine-readable):** instrument; candidate ID; entry/exit Eastern timestamps; price; direction (if applicable); exit reason; gross and net P&L ($ and %); exposure/notional; holding time; financing; spread/slippage/fees; MAE/MFE; associated rule flags/trigger levels. Explicitly identify any synthetic or ambiguous fill handling.

**Per-year table** for every year in 2016–2026 with available data, separately identifying **development versus validation** and marking partial years: trades; wins/losses; win rate; average win/loss; median net trade; expectancy; gross/net P&L; execution costs; financing; max drawdown (state whether trade, strategy equity, and/or intraday marked-to-market); profit factor where meaningful; capital/exposure utilization; and relevant tail-loss measures. Include an all-development summary and a separate validation summary.

**Robustness diagnostics:**

- Parameter center versus neighborhood distribution and nearby alternatives.
- Development-period temporal consistency, including meaningful high/low-volatility and bearish/bullish environments without using validation to select criteria.
- Trading-frequency distribution (per day/week/month), not just a grand average; clustering and time-of-day effects.
- Execution sensitivity: baseline, higher-cost/adverse-fill cases, and break-even costs. Clarify whether available bar data can support the assumed execution quality.
- P&L concentration in a few trades or days, consecutive losses, exposure duration, maximum adverse excursion, and worst tail events.
- Validation degradation relative to development, evaluated with unchanged rules/parameters.
- Explicit pass/fail or confidence assessment against **Study 8's verified robustness discipline**, adapted to single-VGT metrics; explain any criteria that are inapplicable or need modified definitions.

Where helpful, provide representative *causal* winning and losing trade timelines showing the exact state transitions, rather than retrospectively labeling attractive chart patterns as guaranteed entries.

## 6. Engineering deliverables and tests

Use repository conventions for paths and CLI commands; do not overwrite existing results. Produce:

1. Separate Intraday D1 implementation, parameter schema, CLI entry point and/or Strategy Lab integration as appropriate to current architecture, with no behavior change to original D1.
2. Automated tests for **rule parity**, state transitions, time-unit translation, boundary events, eligibility/latching, loss restrictions, continuation windows, profit-conditional stop activation, execution ordering, interest accrual, and deterministic reruns.
3. A **non-regression check** proving original D1's relevant canonical baseline output remains bitwise/metric-equivalent under the same inputs/assumptions, or documenting any preexisting variability. Do not modify frozen D1 to make tests pass.
4. Study 8 transfer map, optimization configuration/seed, candidate manifest, reproducible execution commands, and artifacts tied to an immutable code/data revision.
5. Development/validation reports, annual tables, per-trade CSV/JSON, neighborhood robustness results, cost sensitivity results, and explicit limitations.
6. A concise final recommendation: **viable candidate / promising but unproven / no robust edge**, supported by evidence. If it fails, diagnose the primary reason without silently changing scope.

Check all newly added code with the project's test, type-check, lint, and build workflow as appropriate. Preserve unrelated files and honor repo branching/commit conventions; report changes and test outcomes. If any operation is prohibitively expensive, favor staged, reproducible optimization work and disclose exactly which planned runs were not completed instead of claiming completion.

## 7. Execution order / checkpoints

Execute in this order, keeping each phase auditable:

1. **Audit:** verify canonical D1, Study 8 methodology, data coverage, and repository state. Emit transfer map and rule-parity design.
2. **Implement:** add independent Intraday D1 and establish simulation/data correctness with small deterministic fixtures and targeted historical samples.
3. **Non-regression:** verify original D1 and its frozen baseline are unchanged.
4. **Development optimization:** perform Study 8-style standalone VGT search and robustness selection **only on 2016–2024**; keep all artifacts.
5. **Freeze:** commit/record the candidate manifest and evaluation protocol before any validation results are examined.
6. **Validation:** evaluate frozen candidates on 2025–2026 exactly once under the frozen protocol, with separate annual reporting.
7. **Conclusion:** present results, robustness assessment, code changes, and exact reproduction commands.

Proceed through these phases within this task where feasible; don't stop at planning. **Do not add a follow-up walk-forward optimization study.** If Stage 1 produces no satisfactory candidate, conclude honestly and document whether walk-forward recalibration *might* be worth a **separately authorized future experiment**. Do not change the dates or loosen criteria merely to obtain a positive result.

## Non-negotiable acceptance criteria

- Original D1 and frozen baselines are preserved and regression-tested.
- The new strategy is truly independent, VGT-only, and driven by 1-minute data.
- D1's real state-machine rules are preserved; any unavoidable intraday reinterpretation is explicit and tested.
- Study 8's **verified** robust-profitability methodology is reused appropriately, without carrying over unrelated multi-ETF pool objectives.
- **2016–2024 development; 2025–2026 validation**, with candidate freezing and no validation leakage.
- No unrequested walk-forward reoptimization, portfolio combination, Growth integration, or trade-frequency target.
- Realistic execution/financing and conservative bar-level assumptions; full trade and annual reporting.
- Results are reproducible, including negative results, with no unsupported claim of profitability.

**Begin by inspecting the repository and Study 8/D1 artifacts; report the audit findings before deciding the implementation and optimization details.**
