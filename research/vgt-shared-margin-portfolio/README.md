# VGT D1 deployment risk, shared margin and the compounded VOOG/VGT portfolio

A research program (2026-10-22) on the frozen **D1** strategy (`src/app/allIn-trailingBuy-postExitContinuation.ts`),
its gross-breakeven variant (B2), its P 8.6% variant (B3) and the frozen **swing-low C2** strategy
(`src/app/allIn-trailingBuy-swingLow.ts`), asking three practical questions on VGT minute data 2016-01-04 →
2025-10-13:

1. can D1 and swing-low share one 20%-of-equity margin allowance better than D1 alone, including a D1 takeover of
   an open swing-low position;
2. how does D1 behave under gaps, costs, adverse fills, interest and margin-account constraints;
3. what happens to a **$300,000 portfolio, 60% VOOG / 40% VGT from the 2016-01-04 close**, when VGT-only margin
   trades borrow 20% of current equity and net profits are compounded 60/40 into the core.

No entry or exit parameter was optimized. Everything is a historical, inspected backtest on data every earlier
program has examined; nothing here is evidence of predictive skill.

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md) — data audit, dates, ledger and sizing rules, event order, signal semantics, the
   predeclared policies and scenarios, amendments.
2. [BASELINE_REPRODUCTION.md](BASELINE_REPRODUCTION.md) — D1 $183,044 / $19,331 / 20, B2 identical, B3 $182,842 /
   $18,990, swing-low $114,478 / 32 (and $124,508 / 33 as the file arms alone), reproduced to the cent three ways.
3. [OVERLAP_ANALYSIS.md](OVERLAP_ANALYSIS.md) — Track I: 16 overlapping position pairs, 13 of 20 D1 lots and 14 of
   32 swing-low lots, 17% of D1's and 28% of swing-low's invested time concurrent; every overlap and competing
   signal in chronological order with the T1/T2 counterfactual exits.
4. [SHARED_MARGIN_POLICIES.md](SHARED_MARGIN_POLICIES.md) — Track II: D1 priority, first signal wins (three
   declined-signal semantics), dedicated split, dynamic sharing, D1 takeover (T1, T2a, T2b); attribution of every
   displaced, altered and added trade.
5. [DEPLOYMENT_RISK.md](DEPLOYMENT_RISK.md) — Track III: gaps of 5–30%, correlated falls, costs, intrabar fills,
   interest, Reg T / FINRA / Vanguard requirements and forced liquidation, 10/15/20/25% sizing.
6. [PORTFOLIO_SIMULATION.md](PORTFOLIO_SIMULATION.md) — Track IV: year-by-year balance sheets, attribution controls,
   the matched borrowing-dollar-days comparator, reconciliation.
7. [STRATEGY_COMPARISON.md](STRATEGY_COMPARISON.md) — standalone, combined and portfolio-wide frontiers with
   evidence grades.
8. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — files, commands, hashes, tests, look-ahead, limitations.
9. [RECOMMENDATIONS.md](RECOMMENDATIONS.md) — the decision.

Generated tables are under [results/tables/](results/tables/); every number in the reports comes from a file under
[results/](results/), named next to it.

## Headline results (computed; one inspected history)

$300,000 at the 2016-01-04 close, dividends reinvested, strategies eligible from 2017-06-15, 11% margin interest,
20% of equity per entry, net profits reinvested 60/40, no taxes or costs unless stated. End 2025-10-13.

| Scenario | End equity | vs A | CAGR | Daily max drawdown | Strategy net | Trades | Min equity/LMV |
|---|---:|---:|---:|---:|---:|---:|---:|
| A — buy and hold 60/40 | $1,784,588 | — | 20.01% | $386,774 (33.9%, 2021-12 → 2022-10) | — | 0 | 100% |
| **B — D1 alone** | **$2,346,272** | **+$561,684** | **23.42%** | **$484,116 (25.3%, 2025-01 → 2025-04)** | **+$314,382** | **20** | **82.0%** |
| B2 — gross-breakeven D1 | $2,346,272 | +$561,684 | 23.42% | identical | +$314,382 | 20 | 82.0% |
| B3 — D1 P 8.6% | $2,345,129 | +$560,541 | 23.42% | $483,877 (25.3%) | +$313,512 | 20 | 82.0% |
| S — swing-low alone | $2,196,707 | +$412,119 | 22.59% | $503,358 (26.3%) | +$197,122 | 32 | 81.8% |
| P3 — split 10% + 10% | $2,273,611 | +$489,023 | 23.02% | $492,573 (25.8%) | +$257,111 | 52 | 82.3% |
| P2 = P4 — first signal wins / dynamic (hold semantics) | $2,376,575 | +$591,987 | 23.58% | $514,086 (26.3%) | +$361,178 | 40 | 78.9% |
| P1 — D1 displaces swing-low | $2,383,061 | +$598,473 | 23.62% | $515,970 (26.3%) | +$374,054 | 48 | 81.9% |
| P5-T1 = P5-T2a — D1 takeover | $2,419,970 | +$635,382 | 23.81% | $523,920 (26.3%) | +$394,352 | 43 | 80.7% |
| P5-T2b — takeover, hold clock restarted | $2,457,294 | +$672,706 | 24.01% | $532,038 (26.3%) | +$407,700 | 41 | 79.7% |
| P2c — first signal wins, cancel semantics | $2,493,788 | +$709,200 | 24.19% | $542,002 (26.3%) | +$416,369 | 37 | 81.8% |
| P2s — first signal wins, paper-book semantics | $2,567,929 | +$783,341 | 24.57% | $558,017 (26.3%) | +$447,899 | 38 | 81.8% |

Sensitivities on B: 10% / 15% / 25% of equity → $2,049,137 / $2,193,434 / $2,508,066 (min equity/LMV 90.2% /
85.9% / 78.4%); 8% / 14% interest → $2,380,245 / $2,312,738; 2 / 5 / 10 / 25 bps per side → $2,342,543 /
$2,336,965 / $2,327,701 / $2,153,645; next-open stop fills $2,347,854, 50 bps worse $2,318,121; profits not
reinvested $2,072,019; fixed $100,000 legacy control $1,959,043 (strategy net $183,044); full 60/40 rebalance after
each exit $2,254,816; whole shares $2,323,196; forced liquidation below 25% / 35% / 50%: no sale, identical to B.

## Main conclusions

1. **Reproduction is exact.** D1, B2, B3, swing-low (both eligibilities) and Set 2 match the strategy files and
   the D1-refinement engine to the cent in 27 cases; the buy-and-hold core matches the committed $400k study
   scaled by 0.75; the ledger reconciles at every event and 19 independent audits report 0 failures.
2. **Overlap is real but limited.** 16 overlapping position pairs; 5 D1 signals arrived while swing-low held a lot
   and 12 swing-low signals while D1 held one; under one shared pool 13 setups were refused (hold semantics), all
   later filled, several far from their original price (D1 2018-12-21 at 160.41 → filled 2019-03-08 at 187.30).
3. **Shared pools add swing-low's standalone trades, not a synergy.** Every policy except the split ends above B by
   +$30k to +$222k with a one-point higher drawdown, 40–65% more interest and twice the time on margin; the size
   depends by a factor of seven on what a refused strategy does next (hold / cancel / paper book). The dedicated
   split is worse than D1 alone (−$72,661). P4 collapses to P2 (the first entrant takes the whole allowance).
4. **Takeover does not earn its complexity.** T1 and T2a give identical trades (D1's net-profit stop stays
   inactive on lots taken over in loss, 9 of 12); T2b differs only through the restarted hold clock. The transferred
   lots netted +$8k (T1) / −$38k (T2b); takeover's main effect is consuming D1's own entries (11 displaced, worth
   +$86k in B). Relative to the no-takeover controls it is +$43k/+$81k (hold) or −$74k to −$148k (cancel / paper).
5. **Gross-breakeven D1 is a cleaner implementation of the same trades.** Identical to D1 at 8/11/14% and under
   both fill rules on this history; where the rules diverge is a future-path question, laid out in
   DEPLOYMENT_RISK.md §8.
6. **Margin pressure is not the binding risk at 20%.** Lowest equity ÷ LMV 82.0% (2020-03-16); a 76% / 72% / 64%
   uniform fall would be needed to reach 25% / 35% / 50%; no 30% gap from any historical balance sheet breached
   50%; no forced sale in any historical or full-path shock run. What binds is dollar loss on one lot: −$97,889
   (6.9% of equity) for a 30% gap the day after the 2025-04-11 entry, and −$846,443 of end equity if the whole
   path shifted 30% from 2025-04-14.
7. **Decision: deploy D1 alone at 20%, implemented with the gross-breakeven stop; do not add swing-low or a
   takeover; retain 20% rather than 25%** (RECOMMENDATIONS.md), subject to the broker checks listed there.

## Reproducing

Node 24. Every command verifies the input hashes.

```
npm run shared-margin -- all --file-dir <dir with the strategy files' own outputs>   # ≈40 s
npm run shared-margin -- report
npm test
```

See IMPLEMENTATION_AUDIT.md §3 for the individual commands and how to produce the files' outputs for the parity
check.
