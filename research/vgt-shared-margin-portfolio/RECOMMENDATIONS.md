# Recommendations

Everything below is a reading of one inspected history (VGT/VOOG 2016-01-04 → 2025-10-13) with strategies whose
parameters were fixed in-sample by earlier programs. Nothing here is evidence of predictive skill; the numbers say
what the account would have done, under stated conventions, had the rules been followed.

## Decision

**Deploy D1 alone, at 20% of equity, as the baseline; do not deploy a shared D1/swing-low pool as specified.**

1. **D1 alone vs the variants.** B, B2 and B3 are the same deployment on this history: identical trades for B and
   B2, a $1,143 difference for B3. Prefer **B2's gross-breakeven stop rule** as the implementation of D1: it is
   interest-independent, has no state that can switch off, and reproduced D1 exactly on every rate and fill rule
   tested. It is not safer or more profitable; it is simpler to operate and to monitor. Keep D1's own net-profit
   rule as the reference when comparing to earlier research.
2. **Shared pool.** Every policy except the dedicated split ends above B on this history (+$30k to +$222k on
   $2.35M), always with a higher drawdown (26.3% vs 25.3% daily), 40–65% more interest, twice the time on margin,
   and about twice the number of taxable exits. The gain is swing-low's standalone trades in D1-flat years, and
   swing-low C2 was an in-sample refinement the earlier program declined to credit. The size of the gain depends by
   a factor of seven on what a refused strategy does next (hold $30k, cancel $148k, paper book $222k) — a detail
   the brief did not fix and that would have to be specified, implemented and monitored before any live run.
   That dependence is itself the reason not to proceed: the result is dominated by an operational definition, not
   by the strategies.
3. **Takeover.** Not recommended. T1 and T2a are identical on this history; T2b differs only by the restarted hold
   clock. Takeover beats its own hold-semantics control by $43k–$81k and loses to the cancel and paper-book
   controls by $74k–$148k. The transferred lots netted +$8k (T1) and −$38k (T2b); the policy's real effect is to
   consume D1's own entries (11 D1 trades displaced under T1, worth +$86k in B). If the pair were ever run, "first
   signal wins" on a paper book (P2s) dominates every takeover variant.
4. **Dedicated split (10% + 10%)** is worse than D1 alone (−$72,661) and is the only shared policy that lowers the
   strategy drawdown. Not recommended.

## The 20% allocation

Retain 20%. The evidence:

- Margin pressure is not the binding constraint at 20%. The lowest equity ÷ LMV was 82.0% (2020-03-16, daily) and
  81.3% (2020-03-18 18:27Z, minute-sampled with VOOG forward-filled); Reg T was never approached; a uniform one-day
  fall of 76.1% / 72.4% / 64.1% in both ETFs from the worst historical balance sheet would have been needed to
  reach a 25% / 35% / 50% requirement; no 30% gap in both ETFs, from any historical balance sheet, breached 50%
  (lowest 74.9%); the full-path re-runs with 10–30% simultaneous gaps and a 50% maintenance requirement produced no
  forced sale.
- What binds is dollar loss size. At 20% the end-of-data lot was $302,751 of principal on $1.51M of equity; the
  worst historical realized loss was −$6,633, the worst intratrade excursion on minute lows −$24,954, and a 30% gap
  the day after the 2025-04-11 entry would have cost −$97,889 on the lot (6.9% of equity) and −$846,443 of end
  equity relative to B after the whole path shifted. Each 5 points of allocation moved the end equity by about
  +$150k and the minimum equity/LMV by about −3.7 points (10%: $2,049,137 / 90.2%; 15%: $2,193,434 / 85.9%; 20%:
  $2,346,272 / 82.0%; 25%: $2,508,066 / 78.4%).
- 25% is not imprudent by the margin arithmetic either, and on this history it bought as much CAGR as adding
  swing-low under the best semantics (24.27% vs 24.57%) with fewer trades. It is not recommended because the
  decision between 20% and 25% is a risk-appetite choice on one history, and the brief's 20% is the predeclared
  size; raising it would be a post-hoc choice.

## Material risks that remain

- **Concentration and house rules.** The account is 50–55% VGT by value and the lot is VGT. Vanguard's disclosure
  names a 35% house requirement and 50% or more for concentrated positions, both changeable without notice; none
  of this was verified against the account agreement. At 20% borrowing the cushion to 50% is still a 64% uniform
  fall, so the practical risk is a rule change combined with a crash, not a routine call.
- **Single-lot gap risk.** D1 holds one lot with an inactive stop for the first days after entry (the stop is
  eligible only above net breakeven) and a hard maximum-hold exit at day 8 if losing. A 20–30% gap in that window
  is the largest loss the design permits (−$67k / −$98k on the 2025-04-11 lot), and nothing in the rules limits it.
- **Interest.** Financing is ±$15k per 3 points of rate on this history; D1's exit timing moved by less than $3k
  with no exit changed. Vanguard's published tiers (10.00–12.00% in 2026 by debit size, secondary sources) bracket
  the 11% assumption.
- **Costs and fills.** 2–10 bps per side costs $4k–$19k of end equity; 25 bps costs $193k and changes two exits
  (costs feed the profit tests through the share count). Next-open stop fills are neutral; 50 bps of adverse stop
  slippage costs $28k. None of these are measured spreads.
- **Taxes.** Every D1 exit is a short-term gain or loss in a taxable account; the model excludes taxes, so the
  compounded increment is an upper bound for a taxable investor.
- **Dividend ledger.** Derived from adjusted prices, ±1% in aggregate (re-derivation differences 0.48% / 0.57% of
  the ledger amounts), 2016 VOOG amounts and all pay dates estimated. Same in every scenario, so increments are
  unaffected; levels could move by a few thousand dollars.
- **Data.** VOOG is thinly traded in the minute file (403 sessions without a closing print); the minute-sampled
  portfolio drawdown is a forward-filled diagnostic. The history ends 2025-10-13; nothing later was used.

## Before any live deployment

1. Confirm with the broker, in writing: the house maintenance requirement that applies to this account, whether a
   VGT-concentrated account falls under the concentrated-position rule, the current margin-rate tier, and whether
   fractional ETF shares are permitted for the trading lot (the model uses fractional shares; whole shares cost
   $23k of end equity with residual cash).
2. Fix the operational definitions in the ledger rules before trading: equity measured at the decision minute with
   VOOG's last completed minute; principal = 20% of that equity; proceeds repay principal and interest first; profit
   reinvested 60/40 at the next executable trades; losses funded by proportional core sales. These are PROTOCOL.md
   §4 and they are what the results assume.
3. Implement B2's gross-breakeven stop as the live stop rule, with D1's net rule running in parallel on paper for
   the first year to detect divergence (they have never diverged on 2016–2025).
4. Monitor: equity ÷ LMV daily (alert below 60%, far above any requirement, as an early signal of a regime the
   history never showed), the open lot's unrealized loss against the maximum-hold schedule, the gap between the
   decision price and the fill, and realized slippage against the 2–10 bps grid.
5. Do not add swing-low. If the pair is reconsidered, specify the refused-signal semantics first (paper book is the
   only one that preserved D1), re-run this program's `P2s` with the chosen semantics, and treat the result as the
   same in-sample evidence as S.

## What deserves follow-up and what should stop

- **Follow up**: the only new information is out-of-sample minute data after 2025-10-13 with B2 frozen; evaluate it
  through `npm run shared-margin -- run --keys A,B,B2` when it exists. Verifying broker terms is the other open
  item.
- **Stop**: further shared-pool designs, takeover variants, allocation tuning and any parameter work on D1 or
  swing-low. Each has now been examined on the same history and none changes the decision.
