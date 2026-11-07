# Growth 1.4.0 VGT follow-up — audit, stability and improved optimization

Carry out this follow-up study through completion using the project’s programmatic research tools and the canonical Growth 1.4.0 backtester. I accept the need to investigate the previous study’s exclusions, #4’s sensitivity and the search procedure. Find favorable phenotypes with higher net profit and low maximum minute drawdown, ideally preserving #4’s winning moves and capturing additional profitable opportunities. Report an unsuccessful search honestly.

Use the completed growth140-vgt-s8m study as evidence and reuse its verified engineering infrastructure. Create a new study namespace for all new outputs, caches, protocol and selection manifests. Preserve the completed study, browser state and saved Strategy Lab runs. Complete the audit, sensitivity analysis, new search and chronological evaluation autonomously. Stop only at a documented evidence-based stopping condition or a concrete blocker.

The repository on Apollo is /home/chad/projects/margin-trading. Start with research/growth140-vgt-s8m/REPORT.md, PROTOCOL.md, MEMORY.md, AMENDMENTS.md, FROZEN_SELECTION.json and results/archive/MANIFEST.json, plus src/growth140-vgt-s8m/. Verify the current locations and source revision.

## Research boundaries and objectives

Use January 4, 2016 through December 31, 2024 for development. Use January 2, 2025 through October 30, 2026 for the final frozen comparison. Both windows are already examined history. Freeze the new selection before computing additional 2025–2026 candidate outcomes. Disclose the previous study’s outcomes and #4’s full-history selection as prior knowledge. Reserve any later data for a separately specified prospective evaluation. Apply the same New York session boundaries, costs and execution conventions throughout.

I accept a maximum minute drawdown of 35%, using this study’s convention of drawdown divided by the fixed $100,000 notional. The permitted maximum is therefore $35,000. Apply this ceiling to the center’s development result, validation result and continuous full-history result. Report the dollar measure and denominator explicitly. A future drawdown can exceed a historical backtest ceiling.

Maximize net profit within that ceiling, assess nearby-setting performance and give chronological evidence substantial weight. Favor lower drawdown when profit and stability are comparable, and show the profit-versus-drawdown frontier. A candidate can improve on #4 by earning more while accepting additional drawdown within $35,000. Quantify that trade-off. Use wins, losses, exposure and retained profitable episodes as additional evidence. A lower count of losing trades does not compensate for larger dollar losses or hidden open losses.

For stability qualification, require independent confirmation p90 minute drawdown at or below $35,000 and positive neighborhood p10 net profit. Report the fraction and magnitude of neighborhood breaches above $35,000, including the worst observed drawdown. The p90 criterion permits some neighbors to exceed the ceiling, so present that sensitivity explicitly. Keep profitable centers that fail stability requirements visible with their failed criteria. Permit empty qualified sets. Set the remaining ranking and confirmation rules before the new search. Keep #4 visible as a control even when it fails a research criterion.

Replace automatic exclusions based on a minimum trade count, a largest-trade share of 25%, or a neighborhood median of $10,000 per year with explicit evidence and rankings. Report activity, concentration, annual profit, neighborhood median and p10, loss severity and drawdown. Treat sparse activity as limited evidence of stability. Quantify net profit after removing the largest winning episode, and how results change when its profit contribution is reduced. Label these arithmetic diagnostics and distinguish them from an engine replay. Deduplicate related entries into the same market move when assessing concentration. Freeze the episode definition in advance. Keep costs, financing and chronology checks mandatory.

## 1. Audit the development archive

Read the archive with bounded memory, verifying its manifest and hashes. The completed study exported 427,894 configuration/point rows and 23,501 fit rows in research/growth140-vgt-s8m/results/archive/search/. The SQLite source is .cache/growth140-vgt-s8m/jobs/search/archive.sqlite when available. Distinguish centers, neighbor evaluations, duplicates and different sampling fidelities. Reusing existing development results requires matching engine, data, accounting and effective parameters.

For each entry family, under the $35,000 ceiling, produce the profit-versus-drawdown frontier and an exclusion funnel. Count candidates rejected by activity, concentration, neighborhood profit, stability, promotion caps and structural crowding. Separate overlapping failure reasons from sequential exclusions. Show which promising Rise configurations were rejected and their exact settings, metrics and evidence quality. Include maximum-hold ON/OFF, recovery-gate ON/OFF and continuation method in the breakdown.

Select a bounded, structurally diverse set of development-only audit candidates using a declared rule. Reevaluate them under common independent neighborhood draws before comparing stability. Avoid treating a 16-draw estimate as equivalent to 384-draw confirmation. Additional evaluations belong to the new study. Identify whether useful low-drawdown regions were never explored adequately, poorly represented at promotion, or genuinely weak under the observed tests.

## 2. Diagnose #4’s sensitivity

Reproduce #4 on development data and verify its recorded $92,575.71 marked net profit and $14,578.10 minute drawdown. Explain any discrepancy before interpreting improvements. Use the exact settings below as a fixed control and as the starting point of an explicitly informed local investigation.

Measure individual parameter effects first, then the most consequential interactions, then joint perturbations. Include recovery retracement, loss buffer, ATR distance, entry lookback, trend threshold, eligibility age and confirmation count. Use finer supported steps around sensitive regions, including exactly 45% retracement and 2.9% buffer. Inspect wider ranges as well. Keep units explicit. Apply the same absolute perturbation conventions to comparable candidates and report sensitivity to both small and broad perturbations.

Identify which changes drop a major winner, trigger an extra loss, extend a losing hold or alter an eligibility/gate transition. Compare actual chronological ledgers and blocked/latched events where available. Test whether the earlier median development profit of $44,531.83 and p10 of $11,982.96 came from a narrow discontinuity, several interacting rules, or broad sensitivity. Investigate whether a nearby stable region sacrifices some center profit while improving neighborhood outcomes and risk.

## 3. Search with explicit family coverage

Use two documented sources of proposals. One is an independent global search with fresh seeds and no #4-derived initialization or range design. The other is an informed search seeded by #4 and the audit’s promising development configurations. Track provenance and compare them fairly. The informed search inherits knowledge from the history used to choose those seeds.

Allocate and freeze meaningful evaluation budgets to both Rise and breakout entry families. Within each, explore the available complementary filters, eligibility where supported, gate, continuation and exits with proper dependencies. Keep diverse candidates through promotion, with family-specific frontiers and qualifying finalists. Permit a family to have no qualifier. Audit enabled and disabled options and explain omissions. Include targeted maximum-hold-ON breakout comparisons and reasonable trade-spacing behavior only where the existing strategy supports it. Scope this study to existing Growth 1.4.0 behavior.

Use broad screening and evolutionary search followed by finer local refinement. Allow supported fine resolutions near promising regions, including the #4 values in the informed branch. Use the established progression of 16/64/128 neighborhood draws for efficient screening and independent selection and confirmation draws for finalists. Specify bounds, integer rounding, active-gene handling, effective configuration deduplication and shared random offsets. Report unique configurations and unique ledgers.

Set a compute budget after a bounded timing pilot. Keep a substantial part for chronological searches and confirmation. Define saturation using improvements in profit and stability within the $35,000 drawdown ceiling across independent seeds and generations. Avoid endlessly tuning after a disappointing final comparison. Record every trial, including failed and incomplete evaluations.

## 4. Test the selection procedure chronologically

Freeze the historical evaluation schedule before running it. Use expanding training windows and non-overlapping evaluation periods within development, for example training through 2019 then evaluating 2020–2021, training through 2021 then evaluating 2022–2023, and training through 2023 then evaluating 2024. Report unequal window lengths and sample sizes.

Repeat the complete independent search and selection at each cutoff using only data available through that cutoff. Match budgets across folds or document a predeclared scaling rule. Keep data, caches, statistics and seeds isolated by cutoff. Earlier searches must not inherit archive candidates, optimized ranges or #4-derived seeds selected using later data. Run the informed #4 branch as a retrospective diagnostic, with its inherited future information explicit.

Freeze each fold’s selections before opening its following slice. Carry strategy state forward causally and attribute equity changes and boundary-crossing positions consistently. Compare search procedures and entry families across folds, including empty selections and failures. Show aggregate sequential performance only under a predetermined policy for choosing and switching configurations, with costs included. Disclose that the overall research design was informed by previously examined history. If these fold results are used to redesign the procedure, record that adaptation and the loss of independence.

Select final configurations using the predeclared development criteria, with chronological results informing the choice of procedure. Verify stability on independent neighborhood draws and stress costs at 10 and 20 bps per side. Freeze final roles, rank order, full effective settings and the primary candidate before the final comparison.

## 5. Compare on 2025–2026

Run the frozen finalists and #4 through the same canonical engine, preserving state across the 2024 boundary. Measure validation net from marked equity at the 2024 close and initialize the validation drawdown peak at that boundary. Report whole-run drawdown separately. Separate carried-in positions from new entries and expose ending unrealized P&L. Apply the frozen qualification rules even if no candidate passes.

Show development and validation results separately, then full-history totals. Compare every finalist with #4 and the previous study’s frozen candidates using matched dates and accounting. Preserve development rank order. Report the number of configurations evaluated on this final window. After these results are opened, close selection for this study.

## Exact #4 control

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

## Memory and session protection

Apollo has 64 GB of memory. I explicitly approve MemoryHigh=44G and MemoryMax=48G. Use the memory needed for useful throughput within safe aggregate host limits. These are ceilings, and available headroom depends on the host’s actual MemTotal and other workloads. Check current memory pressure, available RAM, swap and ancestor cgroup limits before launching or increasing concurrency. Reduce usage when required by host conditions.

Reuse the successful completed study’s bounded worker design. Its measured peak was 8.38 GiB with 12 workers. Its documented failure mechanism was per-evaluation typed-array allocation multiplied across concurrent worker isolates. Retain measured garbage-collection scheduling, bounded SQLite/LRU caches, bounded queues and result streaming. Node heap limits alone do not bound typed-array or aggregate job memory.

Launch heavy jobs in dedicated systemd user services with verified cgroup separation from tmux and Claude. Enforce 44G/48G limits over all concurrently running study processes, through a shared parent limit or budgets whose aggregate fits the allowance. Confirm MemorySwapMax against current policy, using the prior zero-swap setting when appropriate. Keep automated restart loops disabled. Start from measured concurrency and scale only after profiling. Use an early stop/checkpoint threshold below MemoryHigh with enough headroom for outstanding work and checkpoint writes. The previous 16 GiB threshold is a conservative starting point that may be adjusted with measured evidence before a larger job.

Before scaling, verify a bounded pilot, parity on development data and deterministic stop/resume. Reuse documented tests where the relevant code is identical and rerun targeted checks for changed paths. Monitor aggregate memory, external/ArrayBuffer memory, queues, cache sizes and progress. Persist atomic checkpoints and completed trials frequently so a killed job loses only bounded work. Keep a recovery note with commands, current stage and hashes. Monitor through completion and safely recover from resource interruptions. Disclose any unresolved host limitation.

## Deliver the result

Provide an archive-audit report with the exclusion funnel, a #4 sensitivity report, chronological evaluation results and final ranked comparisons. Lead with whether any candidate achieved higher profit than #4 within the $35,000 drawdown ceiling, whether it met the stability criteria, and what evidence supports the conclusion. Also identify candidates that improved profit with equal or lower drawdown than #4, and quantify the extra drawdown accepted by other higher-profit candidates.

Provide up to ten distinct finalists plus #4 and relevant earlier controls. Include exact trial identifiers, development and validation marked net P&L, maximum minute drawdown and dates, neighborhood median/p10 profit and p90 drawdown, wins/losses, dollar losses, exposure, open P&L and profit concentration. Format dollars with commas and two decimals. Include which #4 winning episodes were retained, retimed or lost and which additional winning moves were captured. Supply exact effective configurations, reproducible commands, manifests, trial archives, memory measurements and limitations.

If the audit or new search exhausts its predeclared useful avenues, report why further work offers little evidence of benefit. Describe results as the best observed within the tested search and explain uncertainty about future performance.
