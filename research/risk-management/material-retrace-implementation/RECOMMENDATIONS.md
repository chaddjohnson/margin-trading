# Recommendations — findings, limitations and next investigations

Companion to IMPLEMENTATION.md, VERIFICATION.md, VGT_2016_2025.md, COMPARISON.md, SENSITIVITY.md and
LOC_FEASIBILITY.md (2026-10-12). Nothing is committed; production parameters are unchanged; no LOC
execution is adopted.

## What was established

1. **The implementation is exact.** `allIn.ts` now contains one strategy — 0.5% material-loss trigger,
   3% lower-price re-entry, 38% retracement reset — and reproduces the frozen Python research
   configuration trade for trade, session for session and state row for state row on all four
   historical datasets and on VGT 2016 → 2025-12-31 (max difference 3×10⁻¹¹ dollars).
2. **VGT 2016 → 2025-12-31: $172,883 net profit, $28,687 maximum daily mark-to-market drawdown**
   (6.03 profit/DD; 33 closed trades, 15 winners; $59,008 interest; 58% of sessions invested). Every
   calendar year from 2018 is positive except −$358 (2021) and −$165 (2022).
3. **Versus the references on that period:** +$34,538 net and −$9,636 drawdown vs the original
   baseline ($138,345 / $38,323); +$36,217 at equal drawdown vs the previous 3% rule ($136,666 /
   $28,687); −$4,285 vs the original G8 with its 1% cutoff ($177,168 / $28,208), a gap that is one
   trade (the exempted −0.78% loss of 2024-09-04). Against a baseline scaled to equal margin
   dollar-days the strategy is +$53,183 with $4,471 less drawdown: the improvement is decision timing,
   not reduced leverage. On the four full datasets it beats the previous 3% rule on net everywhere and
   beats its matched-exposure control on both profit and drawdown everywhere.
4. **Where the improvement comes from — three episodes.** The material-loss exemption of the
   2022-11-03 loss (−0.49% price) opened the 2022-11-04 (+$4,640) and **2023-01-04 (+$28,006)** entries:
   +$32,646, i.e. 90% of the gain over the previous rule, and it hinges on a 0.0076-percentage-point
   margin under the 0.5% cutoff. The retracement reset turned the December-2018 episode from −$3,949
   into +$3,061 by re-admitting the January-2019 rebound (+$11,183 after two extra losses). The
   exemption cost −$3,297 in October 2023 (an earlier, higher entry). 2020 and 2025 are unchanged from
   the previous rule; the 2022 cascade is avoided by both (−$165 vs the baseline's −$23,643).
5. **Parameter stability.** On VGT the production point sits on a plateau: retrace 0.34–0.42 at any
   cutoff from 0.5% to 1% gives $167.8k–$177.2k; the 0.5% and 0.75% cutoffs are trade-identical on
   every dataset (no historical trade has a price return in that band); the only cliff is on the
   0.25% row (a $40.7k discontinuity driven by December 2018 and December 2022). On QQQ 1999–2015 the
   retrace fraction is a knife edge in both directions (0.34: +$16k more 2000–02 loss; 0.42: −$28.9k),
   and the cutoff preference (1% better there, 0.5% better on QQQ 2016–2026) reverses between eras.
6. **LOC execution.** NYSE Arca supports Limit-on-Close orders on VGT (entry and cancellation until
   3:59 p.m. ET; auction-only, unexecuted quantity cancelled), and a buy LOC with limit
   `min(0.90 × previous-90-session high, 0.97 × frozen loss exit, knowable reset level − $0.01)`
   reproduces the production entry rule exactly and without look-ahead — the simulation's idealized
   variant equals the production run trade for trade on all five cases, and the reset-level cap never
   bound in 855 restricted session-rows. But Vanguard Brokerage's published order types are market,
   limit, stop and stop-limit only — no on-close order type could be documented — and where LOC is
   available, sizing the order at the limit under-invests by the limit-to-close gap (VGT 2016–2025:
   $172,883 → $161,454, −6.6%; rounding itself costs ~$26). Boundary fills are not guaranteed and 13 of
   38 VGT entries sit within 0.5% of the limit. Verdict: a correct representation of the rule, not a
   practical implementation through the user's account as documented.

## Limitations to understand before any live use

- **Selection and reuse.** This strategy is the end product of a program that evaluated 188 pre-
  registered configurations on these same four datasets (plus 26 more here). Its in-sample edges are
  the expected magnitude of a winner's curse; the earlier validation found the restriction family's
  advantage era- and instrument-local and, at matched exposure, usually behind an equally-sized baseline
  on fresh instruments (QLD, SPY, IWM, SOXX). Those fresh-instrument tests were not re-run for the 0.5%
  combination.
- **Trade concentration.** The improvement over the previous rule is one January-2023 trade, decided
  by a sub-0.01pp classification margin; the largest trade (April 2020, +$48,014) is 28% of the
  period's profit; the 2005–2015 VGT result for every strategy is a single 2009 trade.
- **Execution model.** Entries fill at the signal session's close by assumption; the prior intraday
  study showed this assumption has been flattering results, and the LOC study shows the only
  look-ahead-free way to realize it under-invests by several percent and is not offered by the broker.
- **Risk reporting.** Drawdowns are strategy dollars against a $100k allocation, not account-equity
  drawdowns; no portfolio-level margin-capacity analysis exists (Vanguard: newly purchased Vanguard ETF
  shares are not margin-eligible for 30 days; 35% house maintenance).
- **Data.** Prices are split- and dividend-adjusted; a live limit computed from unadjusted prices
  differs across ex-dividend dates inside the 90-session window; the adjustment factor was not verified.

## Suggested next investigations (none performed; none required before deciding)

1. A prospective, pre-registered test of exactly this configuration on data that accrues after
   2026-10 and on instruments not used in design — the only remaining source of evidence that is not
   in-sample.
2. If execution matters: confirm with Vanguard directly whether any closing-auction order type exists
   for the account (the documentation says no); otherwise model a near-close limit order (3:55–3:59 p.m.
   submission at the knowable limit, fill at the last trade rather than the auction) as the realistic
   proxy, and quantify its shortfall against the backtest.
3. Treat the 0.5% cutoff as a 0.5–0.75% band in any future robustness work (the two are identical
   historically) and the retrace fraction as the parameter that actually moves results.
4. Portfolio-level margin-capacity analysis before any live consideration.

## Answers to the ten final questions

1. **Changes to `allIn.ts`:** removed the selectable `baseline`/`lower3` configurations, the
   `strategies` object and the strategy argument; added `materialLossThreshold = 0.005`,
   `lowerPriceReentry = 0.03`, `retraceFraction = 0.38`; the restriction now arms only when
   `exitPrice/entryPrice − 1 ≤ −0.005`, tracks the lowest close since the exit session, and clears at
   `close ≥ episodeLow + 0.38 × (frozenReferenceHigh − episodeLow)` instead of 95% of the frozen high;
   the 3% lower-price re-entry, all exit rules, sizing, interest and chronology are unchanged; CLI is
   `allIn [symbol] [start] [end] [data file] [output dir]`; outputs gain `episodes.csv` and extra
   state-log columns. Details: IMPLEMENTATION.md.
2. **Reproduces the Python results?** Yes — exactly, on all five cases, at the trade, daily-P&L,
   state-row and episode level (VERIFICATION.md).
3. **VGT 2016 (from 2016-10-07) through 2025-12-31 net profit:** **$172,883** ($168,691 realized +
   $4,192 unrealized on the open 2025-11-20 position).
4. **Maximum drawdown on that period:** **$28,687** (2024-07-10 peak to 2025-04-08 trough); 6.03
   profit/drawdown.
5. **Versus baseline / previous 3% / G8:** baseline $138,345 / $38,323 (new: +$34,538, −$9,636 DD);
   previous 3% $136,666 / $28,687 (+$36,217, equal DD); G8 $177,168 / $28,208 (−$4,285, +$479 DD —
   one trade). Full tables and the other datasets: COMPARISON.md.
6. **Trades behind the change:** 2023-01-04 → 08-09 (+$28,006) and 2022-11-04 → 12-16 (+$4,640),
   both enabled by exempting the −0.49% loss of 2022-11-03; the 2019-01-22 → 05-13 trade (+$11,183,
   net +$7,010 for the episode) enabled by the retracement resets of 2018-11-07 and 2019-01-18; the
   October-2023 earlier entry (−$3,297) as the cost; and the 2024-09-05 trade (+$4,285) that G8 takes
   and the 0.5% rule does not.
7. **Parameter sensitivity:** reasonably stable on VGT (plateau; 19/20 grid points beat the previous
   rule; only the 0.25% cutoff row is fragile), genuinely sensitive on QQQ 1999–2015 (retrace 0.38 is
   a two-sided peak), and era-dependent on the cutoff (QQQ old prefers 1%, QQQ new prefers 0.5%).
   SENSITIVITY.md.
8. **Decisions vs exposure:** the strategy borrows 13.5% fewer dollar-days than the baseline on
   VGT 2016–2025, yet beats an equally-exposed baseline by $53,183 with $4,471 less drawdown; across
   the grid the matched-control advantage moves with the net result, not with exposure. The
   improvement is predominantly timing — concentrated, as noted, in a few trades.
9. **Is LOC realistic?** As a representation of the rule, yes (exact, look-ahead-free, verified). As
   an implementation through Vanguard Brokerage, no on the documented order types; and even where
   available it costs ~6–9% of net through limit-based sizing and leaves boundary fills uncertain.
   LOC_FEASIBILITY.md.
10. **Limitations before live trading:** in-sample selection over 214 configurations on reused data
    and weak transfer to fresh instruments; dependence on a handful of trades and a 0.0076pp
    classification margin; the same-close execution assumption with no practical order type to
    realize it; strategy-level (not account-level) drawdown figures and no margin-capacity analysis;
    adjusted-price data vs live unadjusted limits.
