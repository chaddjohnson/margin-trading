# Vanguard margin-call risk of the 20%-of-equity account

**Direct answer.** On the inspected 2016-01-04 → 2025-10-13 path, the simulated $300k VOOG/VGT account with 20% of
equity borrowed in VGT, XBI, XRT or KRE **never came within a modelled call under any requirement up to the 60%
research ceiling**: its closest approach was **equity ÷ LMV ≈ 81% in March 2020** (and ≈ 82% on 2025-04-07), when 35%
would have needed a further ≈ 71% fall of every holding, 50% a ≈ 62% fall and 60% a ≈ 52–55% fall. No requirement on
the traded ETF alone, at any level, could have caused a call then. A call needs **the core to fall with the lot**:
a correlated crash of more than half the account's value, or a sudden requirement increase combined with a
crash of that order. None of the 8,070 static entry shocks (gaps to −40%) and none of the 672 predeclared full-path
replays (−20%/−40% gaps in every traded ETF, VOOG −10% to −40%, requirement raised to 60% at the gap) produced a call.

That is a **model statement under assumed rules**, not broker safety. Three facts outside the model matter more than
the historical buffer: (1) Vanguard may raise house requirements immediately, without notice, and sell without
contacting the client, choosing what it sells; (2) Vanguard publishes that **newly purchased Vanguard ETF shares — VGT
and VOOG — are not marginable for 30 days and settle in the cash account**, so the VGT lots of B and of every C run
could not be bought on margin as modelled unless Vanguard confirms otherwise; (3) the account-specific requirements for
VOOG, VGT, XBI, XRT and KRE and the concentration treatment are **UNVERIFIED UNTIL USER CONFIRMS**.

Sources and tables: `results/tables/margin_distance.md`, `top20_closest_approaches.md`, `break_even_grid.md`,
`entry_shocks.md`, `requirement_timing.md`, `full_path.md`, `illustration_a1.md`, `vanguard_etf_rule.md`;
`results/stress/*.csv`; each principal run's `margin_requirements.csv`, `closest_approaches.csv`,
`maintenance_events.csv`, `forced_liquidations.csv`.

## 1. Verified broker rules versus assumptions (sources accessed 2026-10-23)

| Item | What the source says | Status in this study |
|---|---|---|
| House maintenance | "the minimum margin maintenance requirement is 35% for most marginable Securities"; "50% or higher maintenance requirement for concentrated positions"; requirements "may vary for certain Securities" — [Vanguard margin risk disclosure](https://investor.vanguard.com/client-benefits/margin-disclosure-statement) | published, general; **not** an account-specific number for VOOG/VGT/XBI/XRT/KRE |
| Changes without notice | "We may change Our 'house' maintenance margin requirements anytime and these changes will take effect immediately"; "We can increase a security's house requirement at any time, without advance written notice" — disclosure; [Vanguard margin overview](https://investor.vanguard.com/client-benefits/margin) | modelled as requirement jumps at any instant (§4) |
| Liquidation | "can sell Your Securities and Other Property without contacting You"; "You are not entitled to choose which Securities … will be liquidated"; "not automatically entitled to receive an extension" — disclosure; [FINRA Rule 2264](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2264) | modelled: immediate, next-open, halt, core-first broker choices; no grace period assumed |
| House-call timing | call "the morning after (known as Day 1)"; "You must meet the call by Day 4"; exchange call "within 2 days"; Reg T call "trade date plus 3 business days" — [Vanguard margin calls](https://investor.vanguard.com/investor-resources-education/online-trading/margin-calls) | a `deadline` model (liquidation at the fourth session's open if still deficient) — **not a guaranteed grace period** |
| Initial margin | "The initial requirement is 50% of the total cost of the trade" (100% under $5) — margin-calls page; FINRA Rule 4210(b) | Reg T check at every entry |
| Regulatory floor | 25% of the current market value of margin securities, $2,000 minimum equity — [FINRA Rule 4210](https://www.finra.org/rules-guidance/rulebooks/finra-rules/4210)(c)(1), (b)(4) | legal context only; not simulated |
| 30-day rule | "newly purchased Vanguard ETF shares aren't eligible for the first 30 calendar days" — margin overview; "Mutual fund and Vanguard ETF purchases … settle in Your cash account and after 30 days be journaled into Your Margin Account" — disclosure | **not simulated** (it would be a 100% requirement); counted in §7 |
| Interest | tiered, variable; base 9.75% (changed 2026-09-18), schedule changed 2026-09-29: Standard 12.25% (< $20k) … 10.25% ($250k–$499,999), Preferred 7.00%, Premier 6.00% by qualifying assets; "accrues daily, compounds monthly"; charge = average daily debit × rate × days ÷ **360** | primary 11% simple (parity); Vanguard tiers/360 with monthly capitalization as a sensitivity (today's schedule, not a historical one) |
| 60% | the user's hypothetical research ceiling | **not** a documented Vanguard maximum; no scenario exceeds it |

## 2. Executive table

Passive measures at every minute mark and close of the historical paths; requirement schedules of PROTOCOL.md §8.3
(U = uniform on every holding; L = on the funded ETF's security, 35% elsewhere; G = on the sector-fund group VGT, XBI,
XRT, KRE, 35% on VOOG). "Closest" = the lowest equity ÷ required of the run.

| Run | Calls / forced sales under U35, U50, U60, L50, L60, G50, G60 | Closest approach (UTC), lots held | Equity / debt there | Equity ÷ LMV | Excess under U35 / U50 / U60 (÷ equity) | Highest uniform requirement before a call (m*) | Requirement on the funded ETF alone before a call (r*) |
|---|---|---|---|---:|---|---:|---:|
| **B** VGT D1 | 0 / 0 under all seven | 2020-03-18 18:27, VGT lot #4 | $480,823 / $110,804 | 81.3% | $273,754 / $185,010 / $125,847 (26.2%) | 81.3% | 117.9% (VGT core + lot) |
| **C all-primary / shadow** | 0 / 0 under all seven | 2020-03-16 13:30, KRE lot #5 | $493,483 / $116,400 | 80.9% | $280,024 / $188,542 / $127,553 (25.8%) | 80.9% | 334.1% (KRE) |
| C all-primary / priority | identical to shadow | | | | | | |
| C all-primary / split | 0 / 0 | 2025-04-07 13:42, VGT #93 + KRE #94 | $1,456,031 / $318,084 | 82.1% | $835,091 / $568,973 / $391,562 (26.9%) | 82.1% | 118.9% |
| C all-lowDd / shadow | 0 / 0 | 2020-03-12 20:00, KRE lot #4 | $514,903 / $117,539 | 81.7% | $294,232 / $199,659 / $136,610 (26.5%) | 81.7% | 331.2% (KRE) |
| C all-lowDd / priority | 0 / 0 | same point as shadow | | | | | |
| C all-lowDd / split | 0 / 0 | 2025-04-07 13:42, VGT #120 + KRE #121 | $1,570,826 / $343,161 | 82.1% | $900,931 / $613,833 / $422,434 (26.9%) | 82.1% | 119.3% |

m* and r* are mathematical diagnostics, not simulated scenarios; both exceed the 60% ceiling in every run, so **no
modelled requirement level, applied alone, triggers a call on the historical path**. The dollar excess is smallest
in February 2016 ($106,454 under U60 for every run) only because the unleveraged account was smallest then; the ratio
is the comparable measure. No run spent a single minute below the warning level (equity ÷ required < 1.25) under any
schedule, U60 included.

### Ranked closest approaches

`results/tables/top20_closest_approaches.md` ranks the top 20 sessions (one per session) for B, all-primary/shadow,
all-lowDd/shadow and all-primary/split under U35, U60, G60 and L60, with timestamps, lots, equity, debt, requirement,
excess and break-evens. For B under U60 the top 20 are the March 2020 crash (ranks 1–3, 5, 14, 16), April 2025 (4, 6, 11, 19),
2022 (7–10, 12, 20), December 2018 (13, 15) and late October / early November 2020 (17, 18); every one has a
VGT lot open, a ratio of 1.355–1.381 and a uniform shock to a U60 call of 53–57%. The runs are almost indistinguishable: the closest points
of every account lie at equity ÷ LMV 80.9–82.1%, because a 20%-of-equity lot on an unleveraged core cannot take the
account much below 1 ÷ 1.2 ≈ 83% unless the core falls while the lot is open.

## 3. How close, normalized: VGT-only versus the allocators

| Run | Equity ÷ required at the closest point, U35 / U60 / G60 | Uniform fall to a call, U35 / U50 / U60 | Funded-ETF gap with the rest falling 0.5× (U60) | With the rest flat (U60) |
|---|---|---|---:|---:|
| B | 2.322 / 1.355 / 1.661 | 71.2% / 62.5% / 53.2% | 68.3% | 95.4% |
| C all-primary / shadow | 2.312 / 1.349 / 1.661 | 70.6% / 61.8% / 52.3% | 90.7% | none ≤ 100% |
| C all-primary / split | 2.345 / 1.368 / 1.674 | 72.4% / 64.1% / 55.2% | 70.7% | 98.4% |
| C all-lowDd / shadow | 2.333 / 1.361 / 1.673 | 71.8% / 63.3% / 54.2% | 93.6% | none ≤ 100% |
| C all-lowDd / split | 2.345 / 1.368 / 1.677 | 72.4% / 64.1% / 55.2% | 70.8% | 98.9% |

Normalized for their different equity paths, the allocators sit within one percentage point of B. A KRE lot is
*less* call-prone than a VGT lot of the same size because VGT is also 40–59% of the core: a VGT gap hits the lot and
the core together (the funded security includes core VGT), whereas a KRE gap alone cannot cause a call at any size
(r* > 300%). The split, holding two half-size lots, is marginally further from a call.

## 4. Sudden requirement changes (60% ceiling)

### 4.1 At the decision, after the fill, at the worst point (`results/tables/requirement_timing.md`)

| Run | Largest principal ÷ allowed at the decision under Reg T / U60 / L60 / G60 | Principal a 60% requirement would have disallowed at entry | Lowest equity ÷ required just after a fill, U60 / L60 / G60 | Lowest at a lot's worst session, U60 / G60 | Smallest uniform shock to a U60 call at a lot's worst session |
|---|---|---:|---|---|---:|
| B | 20.1% / 30.0% / 22.7% / 22.7% | $0 | 1.39 / 1.69 / 1.69 | 1.35 / 1.66 | 53.2% |
| C all-primary / shadow | 20.0% / 30.0% / 22.6% / 22.8% | $0 | 1.39 / 1.70 / 1.68 | 1.35 / 1.66 | 52.3% |
| C all-primary / split | 11.1% / 17.6% / 12.7% / 12.7% | $0 | 1.39 / 1.70 / 1.69 | 1.37 / 1.67 | 55.2% |
| C all-lowDd / shadow | 20.1% / 30.0% / 22.6% / 22.8% | $0 | 1.39 / 1.70 / 1.68 | 1.36 / 1.67 | 54.2% |
| C all-lowDd / split | 11.1% / 17.6% / 12.7% / 12.8% | $0 | 1.39 / 1.70 / 1.69 | 1.37 / 1.68 | 55.2% |

A 60% requirement imposed **right before an entry** would have allowed every historical entry (the largest principal
used 30% of what U60 allowed); imposed **immediately after a fill** it leaves at least 39% excess over the requirement;
imposed **during the deepest drawdown of a lot** it still leaves at least 35% (the closest approaches above).

### 4.2 During a gap: requirement jump and correlated price drop together

Break-even combinations at each run's closest point (`results/tables/break_even_grid.md`): the gap of the funded ETF
(with same-security core) that leaves zero excess when every other holding falls ρ × that gap.

| Run, point | Requirement | Uniform (ρ = 1) | ρ = 0.5 | ρ = 0 (lot ETF only) |
|---|---|---:|---:|---:|
| B, 2020-03-18 18:27 (VGT lot) | 35% / 50% / 60% everywhere | 71.2% / 62.5% / 53.2% | 91.4% / 80.3% / 68.3% | none / none / 95.4% |
| | 60% on VGT only (L60 = G60 here) | 63.3% | 88.1% | none ≤ 100% |
| C all-primary/shadow, 2020-03-16 13:30 (KRE lot) | 35% / 50% / 60% everywhere | 70.6% / 61.8% / 52.3% | none / none / 90.7% | none at any level |
| | 60% on KRE only (L60) / on the sector group (G60) | 68.8% / 62.8% | none / none | none / none |

Read: with a 60% requirement on everything, the March 2020 account needed every holding to fall another **≈ 52–53%**
for a call; if VOOG fell only half as much as the lot's ETF, the lot's ETF had to fall 68% (VGT lot) or 91% (KRE lot).
For comparison, the largest overnight gap in any file 2016–2025 is −14.0% (KRE, 2020-03-16) and VGT's is −12.0%.

### 4.3 Static next-open gaps after every entry (`results/tables/entry_shocks.md`, 8,070 rows)

For every funded lot, the traded ETF gaps −5/−10/−20/−30/−40% at the next open and every other holding by ρ × that.

| Run | Gap, ρ | Worst equity loss | Worst lot net after the replayed exit | Worst lot loss ÷ equity | Lowest equity ÷ LMV | Lowest ratio U35 / U60 / G60 | Calls |
|---|---|---:|---:|---:|---:|---|---:|
| B | −40%, 1 | 48.2% | −$128,308 | 8.8% | 71.5% | 2.04 / 1.19 / 1.45 | 0 |
| B | −40%, 0 | 27.6% | −$128,308 | 8.8% | 77.8% | 2.22 / 1.30 / 1.69 | 0 |
| C all-primary / shadow | −40%, 1 | 48.3% | −$142,898 | 10.6% | 71.3% | 2.04 / 1.19 / 1.45 | 0 |
| C all-primary / shadow | −40%, 0 | 27.0% | −$142,898 | 10.6% | 78.1% | 2.23 / 1.30 / 1.68 | 0 |
| C all-lowDd / shadow | −40%, 1 | 48.3% | −$158,424 | 9.2% | 71.4% | 2.04 / 1.19 / 1.46 | 0 |

Zero calls under U35, U50, U60, L60 and G60 in all 8,070 rows. The loss is the problem, not the call: a 40% gap the
day after the largest lots (2025-04 VGT lots of $310k–$387k) costs the lot alone $128k–$160k, 8–11% of equity, as D1's
inactive stop leaves the maximum-hold exit to sell after the gap.

### 4.4 Full-path replays (`results/tables/full_path.md`, 672 runs)

Every price shifted from the open of τ ∈ {2018-12-24, 2020-03-16, 2020-03-23, 2022-06-16, 2023-03-13, 2025-04-07,
and by rule the session after B's and all-primary's closest U60 approach}; VGT/XBI/XRT/KRE −20% or −40%, VOOG half or
equally; the requirement raised to L60, G60 or U60 at τ; intraday monitoring with immediate lot-first liquidation;
everything after τ recomputed. **0 of 672 replays produced a call.** The lowest equity ÷ required after τ was 1.137
(all-primary/shadow; B 1.146), the lowest equity ÷ LMV 68.2% (B 68.8%); the worst end-equity change −$1.37M
(all-lowDd/priority, −40% from 2020-03-23; B −$1.12M) and the worst maximum daily drawdown 66.9%. The breach re-runs (next-open, deadline, halt, core-first, 50 bps slippage) had
nothing to act on.

### 4.5 What a call would do (amendment A1, post hoc, beyond the grid; `results/tables/illustration_a1.md`)

To show the mechanics on the real ledger, every holding was gapped 50% or 60% at the open of the session after the
closest U60 approach. This is **not predeclared, enters no decision, and is no statement of likelihood**.

| Run, τ | Gap | 35% | 50% | 60% |
|---|---|---|---|---|
| B, 2020-03-19 (VGT lot open) | −50% | no call (lowest ratio 1.81) | no call (1.27) | no call (1.06) |
| B, 2020-03-19 | −60% | no call (1.55) | no call (1.08) | **call** at the first minute (13:31 UTC) |
| C all-primary/shadow, 2020-03-17 | −50% / −60% | the account held no lot (KRE lot closed 2020-03-16): no debt, no call possible at any requirement | | |

For B under 60% after a 60% gap, the broker model changes the outcome (end equity versus the same shock without a
sale, $687,908): immediate lot sale $669,786 (−$18,122), with 50 bps forced-sale slippage $668,774, sale at the next
open or after a one-session halt $689,212, core sold first ($36,893 of VOOG/VGT, lot kept) $682,280, and the
Day-4 deadline model sold nothing because the 2020-03-24 rebound cured the deficiency. The forced sale removes the
lot and frees the pool; later lots are sized from the lower equity.

### 4.6 Loss of marginability (not simulated)

Removing a security's loan value is equivalent to a 100% requirement on it and outside the 60% ceiling. Qualitatively:
for a funded lot it would leave its full principal as debt against the remaining collateral; the account's excess
would fall by roughly the lot's loan value (≈ 65% of its market value at a 35% requirement, i.e. ≈ 13% of equity for a
20% lot), which the historical closest points (excess 26–57% of equity) could absorb, but a broker removing the
marginability of a security during a crash would usually do so when prices have already fallen, and could apply it to
the core holdings as well. It is an eligibility risk to confirm with Vanguard, not a scenario quantified here.

## 5. The seven questions

1. **Breach/call under each named rule?** None under U35, U50, U60, L50, L60, G50 or G60 on the historical path, for
   B and every C run of the stress set: 0 calls, 0 deficiencies, 0 forced liquidations, 0 minutes below the
   1.25 warning ratio.
2. **Closest approach**: B 2020-03-18 18:27 UTC, VGT lot #4 open, equity $480,823, debt $110,804, equity ÷ LMV 81.3%,
   excess $273,754 (U35) / $125,847 (U60); all-primary/shadow 2020-03-16 13:30 UTC, KRE lot #5 open, equity $493,483,
   debt $116,400, 80.9%, excess $280,024 (U35) / $127,553 (U60). Table §2 for the others.
3. **How high could Vanguard raise its requirement at that instant before a call?** Uniformly to 81% (B 81.3%,
   all-primary 80.9%): proxy diagnostic, above the 60% research ceiling. On the funded ETF alone: 118% (VGT, which also
   carries core VGT) and 334% (KRE): no single-ETF requirement could have caused a call.
4. **Which correlated gap and requirement increase together cause a call?** At the March 2020 closest points: a 53%
   fall of everything under 60% (52% for the all-primary account), 62–63% under 50%, 71% under 35%; with VOOG falling
   half as much, a 68% VGT gap (B) or a 91% KRE gap (all-primary) under 60%. Table §4.2 and
   `results/tables/break_even_grid.md` give every combination.
5. **Under the highest modelled 60% requirement**: immediately (funded ETF only, group, all holdings) the historical
   account keeps at least 35% excess over the requirement at its closest point (L60/G60 ratio 1.66, U60 1.35); after a
   sharp drop, none of the predeclared gaps to −40% calls; a −60% overnight fall of everything would (A1, B). Loss of
   marginability is different in kind: it removes loan value rather than raising a percentage, can be applied to any
   holding, and is not modelled (§4.6).
6. **VGT-only versus the allocators**: within one percentage point of each other in every normalized measure (§3);
   the allocators are not riskier per dollar borrowed in maintenance terms. They borrow on more days (276.7M versus
   185.5M borrowing-dollar-days), so they spend more time exposed to the same per-day risk, and their lots are as large
   as B's (up to $345k–$383k versus $310k in 2025).
7. **Unknowns**: §6.

## 6. What is unknown, how it matters, and what to obtain from Vanguard before live deployment

Every item below is **UNVERIFIED UNTIL USER CONFIRMS**.

| Unknown | Why it matters here | What to obtain |
|---|---|---|
| Whether VGT (and VOOG reinvestments) can be bought on margin at all, given the published 30-day rule for newly purchased Vanguard ETF shares | if VGT purchases settle in the cash account, **no VGT lot of B or C can be bought with borrowed money as modelled**; the VGT D1 strategy would need cash, a non-Vanguard ETF, or a different broker | written confirmation of how a margin purchase of VGT is treated, and the loan value of Vanguard ETF shares in their first 30 days |
| Actual maintenance requirements for VOOG, VGT, XBI, XRT, KRE in this account | the whole distance analysis assumes 35% base; a higher base shifts every break-even | the current house requirement of each, and whether it differs for leveraged or concentrated holdings |
| Concentration treatment | VGT is 40–59% of LMV (single-sector ETF); a VGT lot adds to it; "50% or higher for concentrated positions" may apply account-wide | the concentration test (per security, per issuer, per sector?) and the requirement it triggers |
| Discretion to change requirements and how changes are applied (per security, per account, intraday) | the model applies changes at any instant; Vanguard says changes take effect immediately without notice | the policy for requirement changes and any notification practice |
| Liquidation practice: what is sold first, intraday versus next morning, deadlines | §4.5 shows the broker's choice moving end equity by up to $19k in the one illustrated call | the liquidation order and timing used in practice; whether Day-4 deadlines are ever shortened |
| Marginability of XBI, XRT, KRE and any eligibility changes during market stress | a security losing marginability removes its loan value (§4.6) | current marginability and the conditions under which it is withdrawn |
| Debit interest: the tier that applies (Standard vs Preferred / Premier by household qualifying assets), day count (published as 360), posting and compounding | 8%/14% move B by ±$34k and C by +$54k/−$171k; the Preferred tier proxy adds $18k (B) / $34k (C) | the applicable tier, rate history if possible, and the interest-period convention |
| Collateral and buying-power computation (SMA, receivables, unsettled trades, cash-account sweeps) | the proxy counts cash and receivables at zero requirement and the lot as immediate collateral | the account's actual buying-power formula and settlement treatment |

## 7. The 30-day rule in numbers (counted, not simulated; `results/tables/vanguard_etf_rule.md`)

| Run | VGT lots (sum of principal) | VGT lots closed within 30 days | Vanguard-ETF core purchases (dollars) | Largest value of Vanguard-ETF shares < 30 days old (share of LMV) |
|---|---:|---:|---:|---:|
| B | 20 ($3,702,197) | 12 | 117 ($275,694) | $375,532 on 2025-05-16 (16.9%) |
| C all-primary / shadow | 11 ($2,433,539) | 8 | 165 ($587,327) | $418,239 on 2025-05-16 (16.9%) |
| C all-primary / split | 19 ($1,758,197) | 12 | 197 ($459,154) | $203,680 (8.7%) |
| C all-lowDd / shadow | 14 ($2,903,796) | 7 | 179 ($670,131) | $463,682 (16.9%) |

Every VGT lot of every run is a Vanguard-ETF purchase; 12 of B's 20 VGT lots were sold within 30 days, so under the
published rule they would never have reached the margin account. XBI, XRT and KRE are State Street SPDR ETFs and are not
subject to this Vanguard-ETF rule, which makes the sector lots — not the VGT lots — the ones that can be bought on
margin as modelled at Vanguard, if Vanguard confirms.

## 8. Assessment: keep, lower or do not deploy 20%

Rules fixed in PROTOCOL.md §12 before the results:

| Test | Result | Consequence |
|---|---|---|
| Any historical breach under U35 or U50 | none (B and every C run) | not "do not deploy" on this ground |
| Closest-approach uniform shock to a U60 call < 30% | 52.3% (all-primary) – 55.2% (split); B 53.2% | not "lower" on this ground |
| Any predeclared full-path stress breach | none of 672 | not "lower" on this ground |
| 30-day Vanguard-ETF rule applies as published | yes, as published (UNVERIFIED for this account) | **the VGT component is not deployable at Vanguard as specified** |

**Assessment: keep 20% as the maintenance-risk sizing, conditional; do not deploy the VGT lots at Vanguard as
modelled until Vanguard confirms how a margin purchase of VGT is treated.** At 20% of equity the binding risk is not
a margin call but the dollar loss on a single large lot (−$128k to −$160k, 8–11% of equity, for a 40% gap after the
largest 2025 entries), the correlated core drawdown that every scenario shares (25% in 2025, 34% for buy-and-hold in
2022), and cost-sensitivity of the sector books (`STRESS_AND_EXECUTION_COSTS.md`). The historical buffer is large
because the core is unleveraged; it would shrink quickly if the borrowed fraction rose (25%: minimum equity ÷ LMV
77.9–78.4%) or if the core itself were margined. None of this makes a call "impossible": a sufficiently large
correlated crash, a requirement increase at the wrong moment, or a loss of marginability can produce one, and the
broker, not the account holder, decides what is sold.
