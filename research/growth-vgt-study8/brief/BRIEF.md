# Run a Study 8–style optimization for VGT Growth 1.4.0

Use the project’s normal programmatic optimizer and the Growth 1.4.0 execution engine. Run the study and deliver reproducible results. Leave the Strategy Lab browser tab and saved runs untouched. My objective is to find stable VGT phenotypes that earn significant net profit with low maximum minute drawdown and capture more distinct winning trades. I value an honest finding that no challenger qualified.

## Use two chronological windows

| Purpose | First session | Last session | Permitted use |
|---|---|---|---|
| Development backtest | 2016-01-04 | 2024-12-31 | All search, refinement, stability testing, ranking and selection |
| Final validation | 2025-01-02 | 2026-10-30 | One predeclared evaluation of frozen finalists and controls |

Use New York regular-session dates and verify actual minute-data coverage. October 30 is intentional. The original Study 8 protocol ended October 29. Identify any missing or partial session and its effect on comparability. Keep development data and caches physically or logically capped at December 31, 2024. Exclude prior full-history trial rankings, ledgers and 2025–2026 outcomes from the search. Record the code revision, data fingerprint, effective configuration, seed and date window for each run.

## Adapt Study 8’s VGT-only workflow

Read the project’s original `research/study8-expanded-regime-d1/PROTOCOL.md` and corresponding runner under `src/study8-expanded-regime-d1/`. Use the single-instrument V track and the F24 chronology as the methodological reference. Run the **Growth 1.4.0 rules** below through the canonical backtester. Check the optimizer adapter against direct backtests with development data before spending the search budget. Keep the original study’s artifacts intact.

1. **Freeze the protocol before the search.** Specify the parameter schema and conditional fields, parameter ranges and steps, risk and activity gates, optimizer budget, seeds, promotion rules, shortlist size, stability thresholds and validation pass criteria. Record any departures from Study 8 and why VGT Growth requires them. Use a development-only timing pilot to size the run. If compute is limited, scale the breadth explicitly and retain independent confirmation.
2. **Search independently of #4.** Use Study 8’s broad Sobol screen, independent NSGA-II islands, constrained Pareto promotion and local refinement. Use #4 only as a fixed control. Exclude its vector from initialization, range design and refinement starts. Search across meaningful combinations of entry methods, trend filter, eligibility, recovery gate, continuation and exit rules. Respect feature dependencies, deduplicate equivalent configurations and document excluded options. Keep VGT, daily signal bars, position sizing, costs and execution rules fixed for primary comparisons.
3. **Reward stable neighborhoods.** Follow Study 8’s progression from 16 to 64 to 128 nearby parameter draws. Use separate selection draws (2 × 128) and independent confirmation draws (3 × 128) on development data for shortlisted phenotypes. Define perturbations for continuous, integer and conditional inputs. Show how many *distinct effective configurations* and *distinct trade ledgers* the draws produce. Use Study 8’s objectives of center net profit per year, neighborhood median and 10th-percentile annual net profit, and 90th-percentile maximum minute drawdown. Report robust annual profit as the average of the neighborhood median and 10th percentile. Show dollar totals as well.
4. **Test what generated the profit.** On development data, examine expanding historical folds, year-by-year contributions, dependence on the largest winning trade, number of distinct profitable episodes, losses, exposure and time underwater. Stress costs at 10 and 20 bps per side as separate diagnostics. For finalists, compare winning trades with #4 within the same window using a predeclared one-to-one matching rule. Distinguish retained and retimed winners, genuinely new winning moves, and multiple entries into one move. Report sparse evidence as inconclusive where appropriate.
5. **Freeze the shortlist.** Select distinct profit-first, robustness-first and balanced phenotypes using development evidence only. Name the primary candidate before validation. Record exact settings, configuration hashes, rankings, qualification results and timestamp in a read-only manifest. If no candidate qualifies, report that outcome. Avoid filling a role with a weak candidate merely to complete the table.

## Use #4 to establish browser parity

The browser trial was **retracement 45**. Its exact settings follow. The full-window reference numbers apply only to the parity check. Measure #4 anew on each study window for comparisons.

| Parameter | Exact #4 setting |
|---|---|
| Strategy and instrument | Growth 1.4.0, rise-from-recent-low-trading, VGT only |
| Browser parity window and bars | January 4, 2016 through October 30, 2026 inclusive, 1d regular-session bars |
| Entry method | Rise from recent low (rise_from_recent_low), advance 5%, recent-low lookback 90 bars |
| Entry trend filter | ON, method A (price_change), 30 trading sessions, minimum return **−2%** |
| Persistent entry eligibility | ON, policy 1 (time_limited), maximum opportunity age 20 trading sessions |
| Drawdown Recovery Gate | ON, chronological dip lookback 60 trading sessions, significant decline 10%, required retracement **45% of the whole decline**, confirmation 2 sessions |
| Trailing stop | 6% |
| Maximum losing hold | ON, 21 **calendar days** |
| Buffered intraday-loss exit | ON, loss buffer 2.9% |
| Initial risk stop | ON, ATR lookback 20 sessions, distance 1.5 × ATR |
| Retain part of profitable trend | OFF |
| Continuation entries | ON, shallow pullback + recovery in an uptrend (shallow_pullback) |
| Continuation trend | Window 60 sessions, SMA 50 bars, slope period 10 bars, minimum rise 0% |
| Continuation pullback and recovery | Minimum pullback 1.5%, maximum pullback 8%, recovery from trough 1% |
| Transaction cost | 5 basis points per side |

Keep the benchmark economics fixed across primary comparisons. Use the benchmark’s standalone $100,000 fixed notional, no compounding, $0 commission, and 11% simple annual margin interest accrued by calendar day on a 365-day basis. Keep the engine’s native fill timing, gap handling, costs and marking. A daily signal still requires minute-level execution and drawdown measurement.

**Expected continuous full-window result:** $145,468.46 total marked net P&L, $145,468.46 realized net P&L, $14,578.10 maximum minute drawdown (14.58% of fixed notional), 10 wins, 3 losses, 0 breakeven, 13 closed trades, 37.0% exposure and a flat ending position.

Run #4 on development data as the comparator. **Defer the full-history parity replay until after the shortlist is frozen**, as the first step of the final evaluation. Reconcile dollar metrics to the displayed cent, counts exactly and exposure to displayed precision. If parity fails, report expected versus observed values and investigate data coverage, engine version, adjusted price units, fill timing, stops, financing and marking. Withhold claims of browser-equivalent improvement while a discrepancy remains. Never tune #4’s parameters to force a match.

## Open validation once

Use a frozen, continuous chronological replay for each finalist and #4. Carry positions, pending orders, indicator history and accrued financing across the boundary as the engine does. Measure validation net P&L from marked equity at the 2024 close. Initialize the validation drawdown peak at that boundary equity and update it from minute marks within validation. Report carried-in positions separately from new validation entries and split boundary-crossing trade contributions at the boundary. The single-window replay of #4 can supply both its full-history parity result and its validation slice. Document any differences between these conventions and the original Study 8 metrics.

Execute the predeclared validation battery for all frozen candidates, including failures. Preserve development rank order when displaying validation. Compare every candidate to #4 over the **same dates**. Report whether it earned higher net P&L with equal or lower maximum minute drawdown, how many winning moves it retained or added, and whether losses increased. A profitable finalist can still fail the stability criteria. After opening validation, end selection for this study. Record further ideas for future research.

## Deliverables

- A side-by-side table of #4 and the frozen finalists, with **separate development and validation columns** for total marked net P&L, maximum minute drawdown in dollars and percent, wins/losses/breakevens, exposure and deltas to #4. Format dollar amounts to two decimals. Include realized and open P&L, drawdown dates and recovery status in the detailed ledger.
- Exact settings, freeze manifest, rerun commands, trial archive, count of independent configurations at each rung, neighborhood statistics and trade-level evidence. Explain the main profit-versus-drawdown trade-offs, including where a candidate lost an important #4 winner.
- State which phenotypes met the frozen criteria, how much evidence supports stability and whether the primary candidate delivered on validation. Describe the winners as the best found within the declared search. The earlier browser work used 2025–2026 to select #4, so disclose its advantage and describe validation as a forward-period test for this frozen search on previously examined market history.
