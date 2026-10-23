# Multi-ETF D1 allocator: fixed $100k pool, compounded 20% portfolio, Vanguard margin-call risk

A research program (2026-10-23) that runs the frozen D1 phenotypes of **VGT (primary), XBI, XRT and KRE (primary or
lowDd)** as four independent shadow books and lets one causal allocator fund their signals from a **single shared
borrowing budget**, in two accounting modes: a fixed $100,000 research pool, and a $300,000 60/40 VOOG/VGT margin
account that borrows 20% of equity per admitted trade. It then measures how close that account came to a Vanguard
maintenance call and what would cause one. No D1 parameter, ranking function or borrowed fraction was optimized;
eight predeclared phenotype combinations × five predeclared policies were run. **Everything through October 2025 is
an exploratory comparison on inspected history** (the sector phenotypes' 2024–2025 holdout was opened on 2026-10-23).

## Answer to the decision question

| Question | Answer (exploratory, 2016-01-04 → 2025-10-13) |
|---|---|
| Fixed $100k: better than VGT D1 alone? | **No, by the predeclared rule.** Main configuration (all-primary/shadow): net $249,580 vs $183,044 (+$66,536) but minute DD $30,140 vs $19,331; net ÷ DD 8.28 vs 9.47. The shared pool displaces 9 of VGT's 20 trades (−$101,487) and adds $168,022 of sector trades. Advantage −40% at 2 bps of cost. |
| Compounded portfolio: better than B (VGT D1 at 20%)? | **Not at matched risk.** End equity $2,608,223 vs $2,346,272 (+$261,951) at the same core drawdown (25.2% vs 25.3%), but with 49% more borrowing-dollar-days; at matched borrowing it is ≈ $7k below B. +$128,606 at 2 bps, +$45,591 at 10 bps. |
| Incremental return from executable trades vs hypothetical overlaps | Funded nets only: +$66,536 (fixed, all-primary). The four standalone books together "earn" $745,710 per $100k of each trade — a hypothetical sum no single pool can execute (72 refused trades). |
| How near did the 20% account come to a call? | Closest: **equity ÷ LMV 81.3% (B, 2020-03-18) / 80.9% (all-primary, 2020-03-16)**; excess $125,847 / $127,553 above a 60% requirement. 0 calls under 35/50/60% uniform, funded-ETF or sector-group requirements; 0 in 8,070 static gap rows and 672 full-path replays with jumps to 60%. |
| What would cause a call? | A correlated fall of ≈ 52–53% of every holding under 60% (62% under 50%, 71% under 35%) at the March 2020 balance sheet; no requirement on the traded ETF alone. A post-hoc −60% overnight fall (A1) calls B at 60% only. |
| Unknown pending Vanguard | Account-specific requirements and concentration test; requirement-change and liquidation practice; marginability; interest tier — and **Vanguard's published 30-day rule for newly purchased Vanguard ETF shares, which as written would prevent buying VGT lots on margin at all.** |
| What to freeze for a forward test | `FORWARD_TEST_FREEZE.json` (code, config, protocol, phenotypes, data hashes); run once on minute data after 2025-10-16 (none exists yet). |

Margin sizing assessment: **keep 20% conditionally; do not deploy the VGT lots at Vanguard as modelled until the
30-day Vanguard-ETF rule is clarified.** At 20% the binding risks are single-lot gap losses (8–11% of equity for a 40%
gap after the largest entries), the shared core drawdown and execution costs — not the maintenance call.

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md) — rules, policies, configurations, risk scenarios, decision rules, written and frozen
   before any allocator result (`results/protocol_freeze.json`); change log with amendment A1.
2. [DATA_AND_BASELINE_AUDIT.md](DATA_AND_BASELINE_AUDIT.md) — hashes, calendars, sparsity, distributions, fresh-data
   check, the seven exact phenotype reproductions and A/B equal to the earlier engine.
3. [SIGNAL_OVERLAP_AND_DENIALS.md](SIGNAL_OVERLAP_AND_DENIALS.md) — collisions, independent episodes, funded versus
   hypothetical, who blocked whom.
4. [FIXED_POOL_RESULTS.md](FIXED_POOL_RESULTS.md) — Mode A against VGT D1, attribution bridge, cost sensitivity.
5. [COMPOUNDED_PORTFOLIO_RESULTS.md](COMPOUNDED_PORTFOLIO_RESULTS.md) — Mode B against A and B, year by year, matched
   utilization.
6. **[VANGUARD_MARGIN_RISK.md](VANGUARD_MARGIN_RISK.md)** — sources, executive table, closest approaches, requirement
   changes, break-even shocks, the seven answers, unknowns, the keep/lower/do-not-deploy assessment.
7. [STRESS_AND_EXECUTION_COSTS.md](STRESS_AND_EXECUTION_COSTS.md) — gaps, full paths, costs, fills, rates (incl.
   Vanguard's method), fractions, dividends.
8. [STRATEGY_AND_ALLOCATION_COMPARISON.md](STRATEGY_AND_ALLOCATION_COMPARISON.md) — every policy × configuration, no
   winner.
9. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — files, design, tests, parity, commands, limitations.
10. [RECOMMENDATIONS.md](RECOMMENDATIONS.md) — decisions and pre-live prerequisites.

## Runbook

Node 24. Every command verifies the data hashes; the result commands refuse to run before the protocol freeze.

```bash
npm run multi-etf-allocator -- audit                                  # results/audit/
npm run multi-etf-allocator -- parity                                 # results/parity/ (7 phenotypes, A, B)
npm run multi-etf-allocator -- fixed --policy shadow --config all-primary       # results/runs/single/
npm run multi-etf-allocator -- portfolio --policy shadow --config all-primary   # results/runs/single/
npm run multi-etf-allocator -- run                                    # the 59-run catalogue → results/runs/, scenario_summary.*
npm run multi-etf-allocator -- audit-ledger                           # independent recomputation → results/audit/ledger_audit.json
npm run multi-etf-allocator -- stress [--only static,paths,sensitivities]   # results/stress/ (≈ 20 min with paths)
npm run multi-etf-allocator -- illustration                           # amendment A1 (post hoc)
npm run multi-etf-allocator -- report                                 # results/tables/*.md (compare = report)
npm run multi-etf-allocator -- forward-freeze                         # FORWARD_TEST_FREEZE.json
npm run multi-etf-allocator -- manifest                               # results/MANIFEST.json
npm run multi-etf-allocator -- all                                    # everything above in order (≈ 25 min)
```

Policies: `shadow` (primary), `priority`, `split`, `cancel`, `hold`. Configurations: `all-primary`, `all-lowDd`, or
`xbiP-xrtL-kreP` style keys (8 in all). Settings: `config/allocator/multi-etf-allocator.json`. The existing strategy
commands are unchanged (`npm run app -- allIn-trailingBuy-postExitContinuation VGT --phenotype primary` still prints
$183,044).

## Results directory

| Path | Content |
|---|---|
| `results/protocol_freeze.json` | the protocol's hash and inputs at the freeze (2026-10-23T16:51:11Z) |
| `results/audit/` | `data_audit.json`, `DATA_AUDIT_TABLES.md`, `ledger_audit.json` |
| `results/parity/parity.json` | the nine reproduction outcomes |
| `results/runs/principal/<key>/` | A, B, F-VGT and both modes × all-primary/all-lowDd × five policies: `trades.csv`, `virtual_trades.csv`, `signals.csv`, `refusals.csv`, `daily.csv`, `annual.csv`, `monthly.csv`, `summary.json`; portfolio runs also `account_ledger.csv`, `margin_requirements.csv`, `maintenance_events.csv`, `forced_liquidations.csv`, `closest_approaches.csv`, `minute_extremes.csv` |
| `results/runs/grid/<key>/` | the other six combinations × shadow/priority/split (per-session files git-ignored, regenerable) |
| `results/scenario_summary.csv/.json` | one row per catalogue run |
| `results/stress/` | entry shocks, requirement timing, closest points, top-20, break-even grid, full-path replays, sensitivities, trade-list differences, Vanguard 30-day rule counts, yield bound, A1 illustration |
| `results/overlap/` | pairwise overlaps, concurrency, episodes, refusal matrix, return correlations |
| `results/tables/` | every Markdown table the reports quote |
| `results/MANIFEST.json` | every result file with its size and sha256, dated |

Every number in the reports is copied from a file under `results/`.
