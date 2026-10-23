# Recommendations

Decisions on inspected 2016–2025 history, using the rules fixed in PROTOCOL.md §12 before any result. Nothing here
is a forecast; the only clean next evidence is minute data after 2025-10-16 run once on the frozen setup.

## 1. Standalone fixed-$100k performance

**Do not replace VGT D1 with the multi-ETF allocator on this evidence.**

- The main configuration (all-primary / shadow) raises net from $183,044 to $249,580 but raises the minute-sampled
  drawdown from $19,331 to $30,140; net ÷ DD falls from 9.47 to 8.28. By the predeclared rule this is not an
  improvement.
- The gain is not additive diversification: the pool displaces 9 of VGT D1's 20 trades (−$101,487) and adds $168,022
  of sector trades. All drawdowns sit in the same March 2020 episode.
- The advantage is cost-fragile: −40% of it at 2 bps per side, −74% at 10 bps; VGT D1 loses under 3% of its net at
  10 bps.
- The low-DD combination and the dedicated split look better on this history (net ÷ DD 10.5–13.5). They were
  predeclared sensitivities, the XBI low-DD phenotype carries most of it, and the phenotypes were selected on the
  same data: they merit a forward test, not deployment.

## 2. Portfolio improvement versus VGT D1 (B)

**Keep B (VGT D1 alone at 20%) as the reference policy; do not add XBI/XRT/KRE to the shared budget yet.**

- Every predeclared allocator run ends above B (main configuration $2,608,223 versus $2,346,272) at the same core
  drawdown (25.2% versus 25.3%), but the main configuration's gain comes from borrowing on 49% more dollar-days. At
  matched borrowing it is ≈ $7k *below* B, so it fails the predeclared matched-utilization test.
- Its advantage over B halves at 2 bps of cost (+$128,606) and is +$45,591 at 10 bps; at 25 bps the account's drawdown
  reaches 37.0%, deeper than buy-and-hold.
- The low-DD combination is above B at matched borrowing (+$111k at 10%, +$179k at 15%) — the one result worth
  carrying into a forward test, with the cost fragility of its tight-stop sector phenotypes tested on new data first.

## 3. Historical margin risk at 20%

**Keep 20% as the maintenance-risk sizing, conditional on Vanguard's confirmations; it is not the binding risk.**

- No call under 35%, 50% or 60% (uniform, funded-ETF or sector-group) on the historical path; closest approach
  equity ÷ LMV ≈ 81% (March 2020), ≈ 52–55% of a correlated crash away from a 60% call; no call in 8,070 static gap
  rows or 672 full-path replays with requirement jumps to 60%.
- What binds instead: single-lot losses of 8–11% of equity after a 40% gap on the largest entries; the shared core
  drawdown (25%; 34% for buy-and-hold in 2022); and, for the allocator, cost and rate sensitivity.
- Raising the fraction shrinks the cushion about 4 points of equity ÷ LMV per 5 points of fraction; nothing here
  supports raising it, and the protocol forbids choosing one from these runs.

## 4. Pre-live prerequisites (all UNVERIFIED UNTIL USER CONFIRMS)

1. **Vanguard ETF 30-day rule**: written confirmation of whether VGT can be bought on margin. As published, newly
   purchased Vanguard ETF shares settle in the cash account and carry no loan value for 30 days, which would make the
   modelled VGT lots (B's entire strategy) impossible to fund with borrowed money at Vanguard. If so, choose: fund VGT
   lots with cash, trade a non-Vanguard technology ETF (a new phenotype study, not a parameter copy), or another broker.
2. Account-specific **maintenance requirements** for VOOG, VGT, XBI, XRT and KRE, the **concentration test** and its
   requirement, and the policy for **changing requirements** intraday.
3. **Liquidation practice**: what is sold first, timing, and whether Day-4 deadlines can be shortened.
4. **Marginability** of XBI/XRT/KRE and the conditions under which it can be withdrawn.
5. **Debit interest**: tier (Standard / Preferred / Premier by household assets), the 360-day convention, posting.
6. **Execution**: measured spreads and fills for XBI/XRT/KRE at the open and in fast markets (the allocator's edge
   disappears at about 10 bps per side); stop-market behaviour through gaps.
7. **Taxes**: the allocator realizes ~4× as many short-term trades and 3× the core turnover of B.

## 5. What must be frozen for a genuine forward test

`FORWARD_TEST_FREEZE.json` records it by hash: the allocator code (`src/multi-etf-allocator/*.ts` and the shared
machines it uses), `config/allocator/multi-etf-allocator.json`, PROTOCOL.md, the four phenotype files, the D1 source
and the data hashes. Frozen rules: shadow policy with alphabetical same-minute ties (priority and split as
sensitivities), all-primary as the main configuration and all-lowDd as the sensitivity, 20% of equity, 60/40
reinvestment, 11% simple interest with the Vanguard method as a sensitivity, the seven requirement schedules, the
2017-06-15 eligibility with continuous state. The forward test needs new Alpaca SIP minute files for VGT, XBI, XRT,
KRE and VOOG after 2025-10-16, audited and hashed before any run, then **one** run of the frozen catalogue with the
state carried from 2016, reporting only the new sessions. No such data exists in the repository today.

## 6. Next research decision

Stop allocator design work on this history: the policies are compact, the main answer is negative, and further
variants would be selected on inspected data. Next information: (1) the Vanguard answers of §4, which may rule the
VGT lots out at Vanguard regardless of any backtest; (2) the forward minute data, run once.
