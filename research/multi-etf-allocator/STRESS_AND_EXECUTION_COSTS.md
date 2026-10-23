# Stress tests, execution costs, interest and sizing

All variations are predeclared in PROTOCOL.md §9 unless marked A1 (post hoc). Grades: **computed** (observed path),
**sensitivity** (one input changed, observed path), **stress** (named hypothetical shock applied to the observed
path), **static** (balance-sheet shock, later behaviour not recomputed). Sources: `results/stress/*.csv`,
`results/tables/{entry_shocks,full_path,sensitivities,matched_utilization,illustration_a1}.md`.

## 1. Price shocks

### 1.1 Static next-open gaps after every funded entry (static; 8,070 rows)

The traded ETF (with any same-security core) gaps −5/−10/−20/−30/−40% at the open after the entry, every other
holding falls ρ × that (ρ = 0, 0.5, 1); the lot's exit is replayed on the shifted path under D1's rules (a gap through
an active stop fills at the gapped open; an inactive stop leaves the maximum-hold and buffer exits).

| Run | −10%, ρ 0: worst lot net / ÷ equity | −20%, ρ 1: worst equity loss | −40%, ρ 0: worst lot net / ÷ equity | −40%, ρ 1: worst equity loss / lowest equity ÷ LMV | Calls (any schedule ≤ 60%) |
|---|---|---:|---|---|---:|
| B | −$37,052 / 2.8% | 24.1% | −$128,308 / 8.8% | 48.2% / 71.5% | 0 |
| C all-primary / shadow | −$41,265 / 5.6% | 24.2% | −$142,898 / 10.6% | 48.3% / 71.3% | 0 |
| C all-lowDd / shadow | −$45,749 / 3.8% | 24.1% | −$158,424 / 9.2% | 48.3% / 71.4% | 0 |

Every combination of gap and correlation is in `results/tables/entry_shocks.md` (also priority and split). The
allocators' worst single-lot losses are larger than B's at every gap because their largest lots are larger (KRE and
VGT lots of $345k–$383k in 2025) and the sector lots' inactive stops leave the gap to the loss exits.

### 1.2 Full-path replays (stress; 672 runs)

Every price shifted from τ, the requirement raised to L60/G60/U60 at τ, immediate lot-first liquidation; later
signals, exits, refusals, sizes and reinvestment recomputed (`results/tables/full_path.md`, every row).

| Run | Replays | With a call | Lowest equity ÷ required after τ | Lowest equity ÷ LMV after τ | Worst end-equity change | Worst max daily DD |
|---|---:|---:|---:|---:|---:|---:|
| B | 96 | 0 | 1.146 | 68.8% | −$1,117,625 | 65.3% |
| C all-primary / shadow | 96 | 0 | 1.137 | 68.2% | −$1,315,260 | 66.9% |
| C all-primary / priority | 96 | 0 | 1.137 | 68.2% | −$1,312,711 | 66.9% |
| C all-primary / split | 96 | 0 | 1.169 | 70.1% | −$1,272,003 | 66.0% |
| C all-lowDd / shadow | 96 | 0 | 1.165 | 69.9% | −$1,359,828 | 66.3% |
| C all-lowDd / priority | 96 | 0 | 1.165 | 69.9% | −$1,374,365 | 66.3% |
| C all-lowDd / split | 96 | 0 | 1.169 | 70.1% | −$1,248,157 | 65.4% |

The full-path shifts show how a shock propagates (the whole later path is lower), not what the strategy "would have
made"; the end-equity losses are dominated by the unleveraged core falling with the market.

### 1.3 Beyond the grid (A1, post hoc)

A −60% overnight fall of every holding at the session after B's closest approach produces a call under 60% (not under
35% or 50%); `VANGUARD_MARGIN_RISK.md` §4.5 has the broker-model outcomes. All-primary/shadow held no lot at its rule
date, so no call was possible.

## 2. Execution costs and adverse fills (sensitivity)

Per-side cost c on every fill except dividend reinvestment (lots and core), next-open stop fills, and 50 bps of
adverse slippage on stop fills. Costs enter the books' own net-profit tests (stop activation, buffered loss), so they
change which trades exist.

| Variant | Fixed: VGT D1 | Fixed: all-primary / shadow | Portfolio: B | Portfolio: C all-primary / shadow | C − B |
|---|---:|---:|---:|---:|---:|
| base | $183,044 | $249,580 | $2,346,272 | $2,608,223 | +$261,951 |
| 2 bps | $182,188 | $222,941 | $2,342,543 | $2,471,149 | +$128,606 |
| 5 bps | $180,904 | $218,421 | $2,336,965 | $2,449,124 | +$112,159 |
| 10 bps | $178,767 | $200,429 | $2,327,701 | $2,373,292 | +$45,591 |
| 25 bps | $133,321 | $159,189 | $2,153,645 | $2,197,308 | +$43,663 |
| next-open stop fills | $183,757 | $247,897 | $2,347,854 | $2,600,772 | +$252,918 |
| +50 bps on stop fills | $175,676 | $207,879 | $2,316,552 | $2,403,985 | +$87,433 |

| Virtual trades of the books | base | 2 bps | 5 bps | 10 bps | 25 bps | +50 bps stops |
|---|---:|---:|---:|---:|---:|---:|
| VGT D1 alone | 20 | 20 | 20 | 20 | 18 | 20 |
| all-primary (four books) | 146 | 139 | 137 | 135 | 129 | 140 |

- **The allocator's edge is cost-fragile.** Two basis points per side cost VGT D1 $856 (fixed) / $3,729 (portfolio)
  but the all-primary allocator $26,639 / $137,074; the portfolio advantage over B halves at 2 bps and falls to
  $45,591 at 10 bps. The trade-list changes are concentrated in KRE's 3.1%-stop trades (2021–2022) whose stop
  activation is marginal (`results/stress/sensitivity_trade_differences.csv`).
- At 25 bps the allocator's daily drawdown rises to **37.0%** (2021-12-27 → 2022-10-14), deeper than buy-and-hold's
  33.9%: the changed trade list holds losing levered lots through the 2022 bear market. B's is 25.4%.
- No bid-ask spread was measured; the cost grid is hypothetical. Vanguard charges no commission on online ETF trades;
  spreads on XBI/XRT/KRE are wider than on VGT/VOOG in stress, which is exactly where the books trade.

## 3. Interest (sensitivity)

| Variant | Fixed: VGT D1 | Fixed: all-primary | Portfolio: B | Portfolio: C all-primary | C − B | Virtual trades (all-primary) |
|---|---:|---:|---:|---:|---:|---:|
| 11% simple, 365-day (primary) | $183,044 | $249,580 | $2,346,272 | $2,608,223 | +$261,951 | 146 |
| 8% (books and ledger) | $192,142 | $261,429 | $2,380,245 | $2,662,067 | +$281,822 | 143 |
| 14% (books and ledger) | $173,945 | $214,169 | $2,312,738 | $2,437,012 | +$124,274 | 137 |
| Vanguard Standard tiers, actual/360, monthly capitalization (books at 11%) | — | — | $2,345,691 | $2,608,858 | +$263,167 | 146 |
| the same with books at 10.75% × 365/360 | — | — | $2,345,691 | $2,608,858 | +$263,167 | 146 |
| Vanguard Preferred 7.00% while equity ≥ $1M (qualifying-asset proxy) | — | — | $2,364,300 | $2,642,613 | +$278,313 | 146 |

- D1's stop is active only when a fill at the stop nets a profit after interest, so the rate changes trade lists:
  VGT D1's is unchanged at 8% and 14% (as in the earlier program), the sector books lose 3 trades at 8% and 9 at 14%,
  and the all-primary allocator loses $171,212 at 14% against B's $33,535.
- Today's Vanguard schedule (Standard tiers 10.25–11.25% for these loan sizes, 360-day count, monthly capitalization)
  is almost exactly the 11% simple convention: −$581 for B, +$635 for C. The books' trade lists do not change between
  11% and the 10.90% tier-equivalent. The schedule is today's (dated 2026-09-29); it is applied to 2017–2025 only as a
  method check, not as the rates those years would have carried.
- The Preferred-tier proxy (household qualifying assets ≥ $1M approximated by account equity) is worth +$18,028 for
  B and +$34,390 for C; whether the user's household qualifies is unknown.

## 4. Borrowed fraction (risk-only; 20% stays the policy)

| Fraction | B: end equity / min equity ÷ LMV | C all-primary / shadow | C all-lowDd / shadow |
|---|---|---|---|
| 10% | $2,049,137 / 90.2% | $2,162,978 / 90.2% | $2,276,138 / 90.2% |
| 15% | $2,193,434 / 85.9% | $2,376,693 / 85.8% | $2,566,638 / 85.8% |
| 20% | $2,346,272 / 82.0% | $2,608,223 / 81.7% | $2,891,291 / 81.7% |
| 25% | $2,508,066 / 78.4% | $2,858,730 / 77.9% | $3,253,744 / 77.9% |

Every step of 5 points of equity lowers the minimum equity ÷ LMV by about 4 points in all three; drawdowns move only
from 24.9% to 25.5% (the core's). At matched borrowing-dollar-days the all-primary allocator is −$6,821 (10%) and
−$7,418 (15%) against B (`results/tables/matched_utilization.md`). No fraction is selected from these runs.

## 5. Dividends and core policy (sensitivity)

| Variant | B | C all-primary / shadow |
|---|---:|---:|
| base (VGT lots entitled, sector lots price-only) | $2,346,272 | $2,608,223 |
| every lot price-only | $2,334,276 (−$11,996) | $2,600,442 (−$7,781) |
| full 60/40 core rebalance after each exit | $2,254,816 (−$91,457) | $2,516,183 (−$92,040) |
| sector-lot distributions, analytic bound at 1 / 2 / 3% yield | — | +$4,319 / +$8,637 / +$12,956 (not documented cash flows) |

## 6. Summary of what the stress program says

- **Margin**: no call in any predeclared test; the account's structure (20% borrowed on an unleveraged core) keeps it
  ≈ 50% of a correlated crash away from a 60% call at its worst historical moments.
- **Loss**: single-lot losses of 8–11% of equity for a 40% gap after the largest entries; a full-path −40% shock with a
  60% requirement costs over $1.1M of end equity in every account — almost all of it the core.
- **Execution**: the multi-ETF allocator's advantage is fragile to small costs and to higher rates because its sector
  phenotypes' stop and buffer tests sit close to their thresholds; VGT D1 alone is robust to both below 25 bps.
