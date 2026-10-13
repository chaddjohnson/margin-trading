# Limit-on-Close execution feasibility for the allIn.ts entries

Isolated study, 2026-10-12. Production code (`src/app/allIn.ts`) and every existing research directory were
read only; scripts and outputs are in `loc/` (see `loc/README.md`). All web sources were accessed on
2026-10-12. Where a fact could not be established from documentation this report says so.

## Verdict in one paragraph

A buy Limit-on-Close (LOC) order can reproduce the production entry rule exactly and without look-ahead:
the limit is computable before the close, and a simulation that fills an LOC at the close iff
close <= limit reproduces the production trade list trade for trade on all five datasets, including the
reset-priority sessions (section 3). NYSE Arca, where VGT is listed, supports LOC orders in its closing
auction and accepts them until 3:59 p.m. ET. The obstacle is the broker: Vanguard Brokerage's published
order types are market, limit, stop-loss and stop-limit only, with day or good-till-canceled duration; no
on-close or auction order type is documented, and a secondary source states outright that Vanguard does
not support on-close orders. On that basis LOC is NOT a realistic way to implement the entries in a
Vanguard Brokerage account unless Vanguard confirms otherwise (not verifiable from documentation;
section 1, question 2). Where LOC is available, the user must accept three structural differences from
the backtest: whole-share sizing fixed before the price is known under-invests by the limit-to-close gap
(mean about 3% per entry, up to 16% on crash-day entries, which cost 6-9% of the 2016-2026 net profit in
simulation); fills exactly at the boundary are not guaranteed, and the entries cluster near the limit by
construction (a third of VGT entries are within 0.5% of it); and the live limit must be computed from
unadjusted prices while the backtest thresholds are built from adjusted ones (section 4).

## 1. Research answers

### Q1. Does the NYSE Arca closing auction support LOC orders for VGT?

Yes, at the exchange level. VGT is listed on NYSE Arca: "The Fund's ETF Shares are listed for trading on
NYSE Arca" (Vanguard World Fund summary prospectus for the Information Technology ETF, dated December 19,
2025, SEC Form 497K, https://www.sec.gov/Archives/edgar/data/52848/000119312525325233/f43621d1.htm).
NYSE Arca Rule 7.31-E(c) defines Auction-Only Orders as "A Limit or Market Order that is to be traded only
within an auction pursuant to Rule 7.35-E", with LOC and MOC orders as the closing-auction instances
(Rule 7.31-E(c)(3) and (4), referenced in the SEC notice for SR-NYSETEX-2025-08, which copies the NYSE Arca
text, https://public-inspection.federalregister.gov/2025-08852.pdf, pp. 15-16; the Rule 7.31-E(c) text is
reproduced in the NYSE Arca Exhibit 5 at https://www.sec.gov/files/rules/sro/nysearca/2017/34-82004-ex5.pdf,
p. 22). Rule 7.35-E(d): "The Closing Auction will be conducted at the end of the Core Trading Session.
Orders in Auction-Eligible Securities that include a designation for the Core Trading Session and that are
eligible to participate in an auction will be eligible to participate in the Closing Auction"
(https://www.sec.gov/files/rules/sro/nysearca/2025/34-103886-ex5.pdf, p. 27). NYSE's own auctions page
lists MOC and LOC among the NYSE Arca closing-auction order types and states that the Arca closing auction
"occurs within Auction Collars" at 4:00 p.m. ET (https://www.nyse.com/trade/auctions). NYSE Arca's trading
information page adds "Auctions are conducted only in auction-eligible symbols"
(https://www.nyse.com/markets/nyse-arca/trading-info); whether VGT in fact has a closing auction every
session is not documented anywhere I could find (see Q7 and Q9).

### Q2. Does Vanguard Brokerage permit retail customers to submit LOC (or MOC) orders for VGT?

Not according to its published documentation. Vanguard's order-types page lists exactly four order types,
"Limit", "Market", "Stop-loss (also called a 'stop order')" and "Stop-limit", with durations "Day orders
remain active only for the trading day on which they're placed and expire if not executed" and
"Good-till-canceled orders remain active for up to 60 calendar days, unless they're executed or canceled"
(https://investor.vanguard.com/investing/online-trading/order-types). The page does not mention
market-on-close, limit-on-close, at-the-close, or auction orders. The only non-standard handling it describes
is a "not held" designation for oversized stock or ETF orders, at Vanguard's discretion, which "can only be
facilitated over the phone", and a request-for-quote process "used exclusively for ETF transactions". A
search of vanguard.com for "on close", "market-on-close" and "limit-on-close" returned no Vanguard page. A
secondary source (The Finance Buff, "How to harvest tax loss ETF / mutual fund", undated; the page returned
HTTP 403 to direct fetches, so only search-engine excerpts were available) states "Vanguard doesn't support
Market On Close orders. The only option for the duration of a market order is Day" and "Most of the mainstream
brokers except Vanguard support Market On Close orders for ETFs". I could not verify this on Vanguard's
platform or by phone. Conclusion: exchange support exists; retail availability at Vanguard Brokerage is not
documented and, on the evidence available, absent. Only Vanguard itself can confirm.

### Q3. Submission, modification and cancellation deadlines (NYSE Arca, ET)

NYSE Arca Rule 7.35-E(d)(2): "The Closing Auction Imbalance Freeze will begin one minute before the
scheduled time for the Closing Auction. Order entry and cancellation will be processed during the Closing
Auction Imbalance Freeze as follows: (A) LOC Orders and MOC Orders that are on the same side of the Total
Imbalance, would flip the Total Imbalance, or would create a new Total Imbalance will be rejected."
(https://www.sec.gov/files/rules/sro/nysearca/2025/34-103886-ex5.pdf, p. 27). NYSE's auctions page gives
the Arca timeline: imbalance publication from 3:00 p.m., "Closing Freeze Period" from 3:59 p.m. during which
"Requests to cancel MOC/LOC orders will be rejected" and only offsetting MOC/LOC orders are accepted, auction
at 4:00 p.m. (https://www.nyse.com/trade/auctions). The Arca trading-info page: "3:59 p.m. to 4:00 p.m. ET -
Closing Auction Imbalance Freeze Period", "4:00 p.m. ET - Closing Auction"
(https://www.nyse.com/markets/nyse-arca/trading-info). The 2018 NYSE filing corroborates: "NYSE Arca
initiates its 'Closing Auction Imbalance Freeze' for all MOC and LOC Orders at 3:59 p.m. See NYSE Arca Rule
7.35-E(d)(2)" (https://www.sec.gov/files/rules/sro/nyse/2018/34-84804.pdf, p. 4 n.19). Imbalance information
is published from "one hour before the scheduled time for the Closing Auction" (Rule 7.35-E(d)(1),
https://www.sec.gov/files/rules/sro/nysearca/2017/34-82140-ex5.pdf, p. 36). So on NYSE Arca an LOC can be
entered, modified or cancelled freely until 3:59:00 p.m. ET. Caution: the widely quoted 3:50 p.m. cutoff is
the NYSE (not NYSE Arca) rule: "Cutoff time for MOC/LOC order entry 3:50 p.m." applies to NYSE-listed
securities (NYSE Opening and Closing Auctions fact sheet,
https://www.nyse.com/publicdocs/nyse/NYSE_Auctions_Closing_Process_Fact_Sheet.pdf). A broker may impose an
earlier internal cutoff; Vanguard publishes none because it publishes no such order type.

### Q4. Can the limit be calculated entirely from information available before the deadline?

Yes. Every input is fixed before session i opens: the highest high of sessions i-90..i-1 (the production
window `ticks.slice(index - 90, index)` excludes the current session), the frozen loss-exit price and the
3% lower level, the frozen reference high, and the episode low through session i-1. The only quantity the
production rule reads from the current session is the close itself, which is exactly what the LOC condition
tests. Section 2 gives the formula.

### Q5. Can an LOC reproduce the close-based entry criteria without look-ahead?

Yes, with one subtlety (the reset cap, Q6) folded into the limit. The LOC fills at the closing auction price
iff that price is at or below the limit; the production rule buys at the close iff the close satisfies the
same inequalities. The equivalence was verified by simulation: the `loc_frac` variant (submit an LOC with the
knowable limit before every close while flat, fill iff close <= limit) produces exactly the production trade
list on all five datasets (`loc/results/verification.json`). Three operational conditions are part of the
rule and are not encoded in the limit: no LOC is submitted while a position is open at the session start
(which also covers sessions on which the position exits at the open or intraday: the production rule never
enters on an exit session, so the operator must not submit an LOC after an intraday stop); the limit must be
rounded down to the $0.01 minimum price variation; the order is a day, auction-only order.

### Q6. Does the retracement reset create same-session eligibility conflicts?

Derivation. Production tests, on a session with the 10% signal while restricted,
`close >= episodeLow_i + 0.38 (H - episodeLow_i)` with `episodeLow_i = min(episodeLow_{i-1}, close)`. If the
close is a new episode low, the reset level becomes `close + 0.38 (H - close) > close` (H exceeds any
restricted close), so no reset. Otherwise `episodeLow_i = episodeLow_{i-1}`. Hence a reset at session i
happens iff `close_i >= R_i` with `R_i = episodeLow_{i-1} + 0.38 (H - episodeLow_{i-1})`, a quantity known
before the close. Because a reset takes priority over an entry, the entry region is
`close <= min(0.90 H90prev, 0.97 lossExit)` AND `close < R_i`. An LOC with limit `min(0.90 H90prev,
0.97 lossExit)` would therefore fill wrongly on any session whose close lies in `[R_i, entryLevel]`; the
limit must be capped at one tick below `R_i` whenever `R_i <= entryLevel`.

Quantification (`loc/conflict_quantification.py` over the production `results/ts/<case>/states.csv`,
`loc/results/conflict_summary.json`). Over every restricted session on which the strategy was flat at the
session start:

| case | restricted flat sessions | sessions with R_i <= entry level (cap binding) | sessions where an uncapped LOC fills but production resets | restricted entries | closest restricted entry to R_i |
|---|---|---|---|---|---|
| VGT 2016-2026 | 97 | 0 | 0 | 10 | 6.9% below |
| VGT 2016-2025 | 96 | 0 | 0 | 10 | 6.9% below |
| VGT 2005-2015 | 212 | 0 | 0 | 7 | 6.6% below |
| QQQ 1999-2015 | 380 | 0 | 0 | 28 | 6.5% below |
| QQQ 2016-2026 | 70 | 0 | 0 | 9 | 7.3% below |

The knowable reset level sat at least 6.5% above the entry level on every one of the 855 restricted flat
session rows across the five cases (759 distinct sessions, since the two VGT 2016 cases overlap; median
headroom 10-15%), no historical entry sits in the conflict band, and none of the production resets had a
close at or below the entry level. The `loc_nocap` simulation variant confirms it: removing the
cap changes nothing historically. The cap nevertheless belongs in the formula. It can bind only through the
exit session itself: any later close low enough to drag the reset level below the entry level would have
been at or below the entry level and would have triggered an entry (or been a reset) on its own session;
the exit-session close is the only close that can set a deep episode low without an entry being allowed
(a crash-day exit at the open followed by a collapse into the close). That path never occurred in the data
but is not excluded by the rules.

### Q7. Can the closing-auction price differ from the adjusted daily close in the data?

Yes, in three ways.

1. Adjustment. The files hold adjusted prices: the VGT 2016-2026 file closes 2025-12-31 at 94.12 and
   2026-10-06 at 129.20, far below the dollar price at which VGT was quoted in 2025 (several hundred dollars;
   I did not download a quote to pin the factor). The ratio is far too large for dividend adjustment alone,
   so a share-split adjustment is embedded as well; the QQQ file (614.31 on 2025-12-31) is at its quoted
   scale. The strategy's thresholds are ratios, so a uniform scale factor is harmless, but dividend
   adjustment is not uniform: within a 90-session window that spans a VGT ex-dividend date, the adjusted
   highs before the ex-date are lower than the unadjusted highs by the dividend factor (VGT pays quarterly;
   each dividend is a fraction of a percent of the price), so a live limit computed from unadjusted highs is
   slightly higher than the backtest's. Not quantified here: the files carry no dividend history. Its
   relevance is section 4's finding that many entries sit within 0.5% of the limit.
2. Official closing price versus the auction print. NYSE Arca Rule 1.1(gg): "For Auction-Eligible
   Securities ... the Official Closing Price is the price established in a Closing Auction of one round lot or
   more on a trading day. If there is no Closing Auction or if a Closing Auction trade is less than a round
   lot on a trading day, the Official Closing Price is the most recent consolidated last sale eligible trade
   during Core Trading Hours on that trading day", and "An Official Closing Price may be adjusted to reflect
   corporate actions or a correction to a closing price"
   (https://www.nyse.com/publicdocs/nyse/regulation/nyse-arca/NYSE_Arca_Rule_1.1.pdf). When no auction
   occurs the data's close is a last trade, and an LOC does not execute at all (Q8), while the model would
   have entered. Whether the file's close is the Official Closing Price or some other vendor close is not
   documented in the repository; I could not verify it.
3. Collars and fallbacks. The closing auction runs "within Auction Collars" (Rule 7.35-E(a)(10): 1% for a
   reference price above $50, https://www.sec.gov/files/rules/sro/nysearca/2017/34-82004-ex5.pdf, p. 23),
   and Rule 1.1(gg)(2)-(4) substitutes a VWAP or an alternate exchange's close on a systems failure, in which
   case "all open interest designated for the Closing Auction residing in the NYSE Arca Marketplace will be
   deemed cancelled".

### Q8. What happens when the auction closes above the buy limit?

No fill, and the order is cancelled, not carried forward: "Any quantity of an Auction-Only Order that is
not traded in the designated auction will be cancelled" (Rule 7.31-E(c),
https://www.sec.gov/files/rules/sro/nysearca/2017/34-82004-ex5.pdf, p. 22; the same sentence is carried
into the 2025 NYSE Texas copy of the Arca rule). An LOC is by definition executed only "provided that the
closing price is at or within the specified limit" (NYSE's LOC definition in
https://www.sec.gov/files/rules/sro/nyse/2018/34-84804.pdf, p. 2 n.7). A new LOC must be entered the next
session, which is what the strategy wants.

### Q9. Are partial fills possible for LOC orders at the closing price?

In principle yes: an auction-only order is a limit order and the rule explicitly contemplates an unexecuted
"quantity" being cancelled (Q8), i.e. part of an order can trade. I could not retrieve the verbatim NYSE Arca
allocation text (Rule 7.35-E auction processing and ranking) from a document I could read, so the priority
order among MOC, LOC and continuous-book limit orders at the clearing price is stated here only generally:
orders priced better than the auction price trade in full before orders priced at it, and an LOC whose limit
equals the clearing price is the one at risk of a partial fill. Size context from the data (ratios are
scale-invariant under the file's adjustment): a $100,000 entry averaged 0.033% of VGT's full-day volume on
the entry sessions of 2016-2026 (maximum 0.094%); for 2005-2008 VGT the ratio reached 47% of a day's volume,
which is the file's early history, not today's VGT. VGT's closing-auction volume is not documented anywhere I
found. The only published figure is market-wide: "only about 2% of NYSE Arca ETF volume trades in the
auction" versus about 9% for NYSE equities (BMLL Technologies / Traders Magazine, "Into the Close", June 24,
2025, https://www.bmlltech.com/news/market-insight/into-the-close-unpacking-u-s-closing-auction-dynamics-and-the-impact-of-the-russell-reconstitution).
Illustrative only: 2% of VGT's recent average volume in the file (4.4M adjusted shares) is about 90,000
adjusted shares against roughly 1,000 adjusted shares per entry; that does not establish that an auction
occurs for VGT on a given day or that contra interest exists at the limit.

### Q10. How should the order quantity be set when the execution price is unknown?

shares = floor(100000 / limit) is the only sizing that guarantees at most $100,000 at every admissible fill
price, because the fill price is at most the limit. Its cost is that the dollars invested equal
shares x close, which falls short of $100,000 by the limit-to-close gap plus whole-share rounding; the gap
is large precisely on the sessions where the close gaps far below the limit (Q11). Alternatives: (a)
floor(100000 / close) cannot be submitted, the close is unknown at 3:59; (b) sizing at an expected price
below the limit risks exceeding $100,000; (c) a top-up order after the auction (after-hours or next open)
restores the dollar amount but at a different price and outside the model; (d) accept the under-investment
and treat the backtest's $100,000 as an upper bound. Vanguard's dollar-based fractional trading ("trade a
Vanguard ETF for any dollar amount you choose, regardless of the ETF's share price",
https://investor.vanguard.com/etf/how-to-buy) does not help: the page does not say it applies to limit
orders, and an LOC is not offered (Q2).

### Q11. Effect of whole-share sizing on the intended $100,000 position

From `loc/results/sizing_stats.json` and `whole_share_sizing.csv` (historical entries, adjusted prices;
the split between gap and rounding is exact, the rounding magnitude depends on the price scale):

| dataset | entries | floor(100000/limit): mean / median / max shortfall | of which limit-to-close gap (mean, max) | of which rounding (max, adjusted units) | floor(100000/close): mean / max shortfall (adjusted units) |
|---|---|---|---|---|---|
| VGT 2016-2026 | 38 | 2.81% / 1.33% / 16.15% | 2.77%, 16.13% | 0.09% | 0.022% / 0.067% |
| VGT 2016-2025 | 34 | 3.06% / 1.48% / 16.15% | 3.03%, 16.13% | 0.07% | 0.021% / 0.067% |
| VGT 2005-2015 | 33 | 3.47% / 1.12% / 31.12% | 3.47%, 31.11% | 0.008% | 0.003% / 0.009% |
| QQQ 1999-2015 | 83 | 6.69% / 1.88% / 38.60% | 6.67%, 38.55% | 0.07% | 0.022% / 0.076% |
| QQQ 2016-2026 | 32 | 3.51% / 2.08% / 16.99% | 3.36%, 16.87% | 0.36% | 0.18% / 0.44% |

Almost all of the shortfall is the limit-to-close gap, not rounding. Rounding in real dollars is bounded by
one share's price over $100,000: at a price of $700 that is 0.7%, at $100 it is 0.1% (the VGT file's scale
does not reveal the live price; this bound is an assumption, not a measurement). Totals: under
floor(100000/limit) the 38 VGT 2016-2026 entries invested $3.69M instead of $3.80M.

### Q12. Exchange- or broker-specific restrictions

- Broker: LOC/MOC not among Vanguard Brokerage's published order types (Q2). This is the decisive
  restriction.
- Order-entry window: none at NYSE Arca beyond the 3:59 p.m. freeze (Q3); a broker cutoff would be
  broker-specific.
- Margin: Vanguard's margin page lists as marginable "Most equities and ETFs trading over $3 a share" with
  the qualification that "newly purchased Vanguard ETF shares aren't eligible for the first 30 calendar days"
  (https://investor.vanguard.com/client-benefits/margin, house maintenance requirement 35%, base rate
  variable). For a margin-funded purchase of VGT, a Vanguard ETF, the purchased shares would not themselves
  count as collateral for 30 days, so the loan must be carried by other holdings. This is independent of the
  order type but applies to every entry of this strategy. The page says nothing about order-type restrictions
  in margin accounts.
- Fractional shares: dollar-based trading of Vanguard ETFs exists (Q10), but exchange auction orders are
  whole-share orders (a round lot is the Rule 1.1 unit); the production code's "Vanguard allows partial
  shares" assumption and an LOC are mutually exclusive.
- Exchange: LOC orders ride on the existence of a closing auction in VGT that day (Q7, Q9) and on the
  Official Closing Price falling inside the auction collar (Q7).

## 2. The limit formula, corrected

The brief's formula "normal: 0.90 x prev-90 high; restricted: min(normal, 0.97 x last material-loss exit)"
is correct as far as it goes and is historically sufficient, but it omits the reset-priority cap derived in
Q6. The complete knowable limit for session i, submitted while flat before 3:59 p.m. ET:

```
H90prev_i  = max(high of sessions i-90 .. i-1)            (fewer sessions at the start of the data)
normal:     L_i = 0.90 * H90prev_i
restricted: R_i = episodeLow_{i-1} + 0.38 * (refHigh - episodeLow_{i-1})
            L_i = min(0.90 * H90prev_i, 0.97 * lossExitPrice, R_i - 0.01)
submit only if no position is open at the session start (never on an exit session); day, auction-only;
round L_i down to $0.01; shares = floor(100000 / L_i).
```

`episodeLow_{i-1}` is the lowest close from the losing exit session through session i-1 (the exit session's
own close starts it). The third term never bound in 855 historical restricted sessions (headroom at least
6.5%), so the brief's formula and the complete formula produce identical history; the term is required for
correctness, not for the backtest. Note also that the production code tests `1 - close/H >= 0.10`; the
LOC tests `close <= 0.90 H`; the two agreed on every session of every dataset (the `loc_frac` reproduction),
so the floating-point difference is immaterial.

## 3. Simulation (`loc/loc_simulation.py`)

Method: the production loop was re-implemented in Python (entries, exits in the fixed order open-first then
intraday stop, interest per calendar day at 11%, daily mark-to-market, drawdown, the restriction state
machine) and the entry step replaced by an LOC model, switched on in layers. Datasets: VGT 2016-2026 (full
file), VGT 2016-2025 (file truncated at 2025-12-31), VGT 2005-2015, QQQ 1999-2015, QQQ 2016-2026. Exits are
untouched in every variant.

Verification (`loc/results/verification.json`): the `ideal` variant reproduces
`results/python/trades/<dataset>__new.csv` and `results/ts/<case>/trades.csv` trade for trade (entry and
exit index, prices, shares, investment, interest, profit) on all five datasets. `loc_frac` (LOC fill rule
with the section 2 limit) equals `ideal` on all five datasets: the limit formula is an exact restatement of
the entry rule. `loc_nocap` also equals `ideal` (the cap never binds historically).

Results (`loc/results/summary.csv`; net = realized + unrealized at the end; drawdown is the daily
mark-to-market drawdown):

| dataset | variant | entries | net | vs ideal | max drawdown | vs ideal | invested |
|---|---|---|---|---|---|---|---|
| VGT 2016-2026 | ideal / loc_frac / loc_nocap | 38 | 196,310 | 0 | 28,687 | 0 | 3,800,000 |
| VGT 2016-2026 | loc_whole | 38 | 184,704 | -11,606 (-5.9%) | 28,536 | -151 | 3,693,398 |
| VGT 2016-2026 | loc_whole_b | 38 | 184,704 | -11,606 | 28,536 | -151 | 3,693,398 |
| VGT 2016-2026 | loc_whole_c (illustrative) | 38 | 196,275 | -35 | 28,674 | -13 | 3,799,167 |
| VGT 2016-2025 | ideal / loc_frac / loc_nocap | 34 | 172,883 | 0 | 28,687 | 0 | 3,400,000 |
| VGT 2016-2025 | loc_whole | 34 | 161,454 | -11,428 (-6.6%) | 28,536 | -151 | 3,296,012 |
| VGT 2016-2025 | loc_whole_b | 34 | 161,454 | -11,428 | 28,536 | -151 | 3,296,012 |
| VGT 2005-2015 | ideal / loc_frac / loc_nocap | 33 | 26,600 | 0 | 50,883 | 0 | 3,300,000 |
| VGT 2005-2015 | loc_whole | 33 | 30,420 | +3,820 | 46,598 | -4,285 | 3,185,415 |
| VGT 2005-2015 | loc_whole_b | 33 | 30,865 | +4,265 | 46,598 | -4,285 | 3,185,036 |
| QQQ 1999-2015 | ideal / loc_frac / loc_nocap | 83 | 72,539 | 0 | 74,333 | 0 | 8,300,000 |
| QQQ 1999-2015 | loc_whole | 83 | 66,987 | -5,552 | 69,702 | -4,630 | 7,744,319 |
| QQQ 1999-2015 | loc_whole_b | 83 | 72,800 | +261 | 79,583 | +5,250 | 7,735,047 |
| QQQ 2016-2026 | ideal / loc_frac / loc_nocap | 32 | 138,791 | 0 | 24,060 | 0 | 3,200,000 |
| QQQ 2016-2026 | loc_whole | 32 | 126,528 | -12,263 (-8.8%) | 23,670 | -390 | 3,087,580 |
| QQQ 2016-2026 | loc_whole_b | 32 | 126,528 | -12,263 | 23,670 | -390 | 3,087,580 |

Reading the table:

- Whole-share sizing at the limit (`loc_whole`) never changes which sessions enter (entries identical to
  `ideal` everywhere); it changes how much is bought. The loss of 6-9% of net profit on the 2016-2026
  datasets is the limit-to-close gap: the deepest closes below the limit (the crash-day entries of 2018-12,
  2020-03, 2022, 2025-04) are bought with the fewest dollars. On VGT 2005-2015 the same effect helped
  (less invested into the 2008 entries that went on to lose). This is a data-supported calculation.
- Boundary misses (`loc_whole_b`, close within 0.05% below the limit treated as unfilled): no VGT 2016-2026
  entry is that close (closest 0.096% below the limit), so the variant is identical. On VGT 2005-2015 one
  entry (2011-06-13, close 0.0085% below the limit) is missed and the strategy enters two sessions later
  instead; on QQQ 1999-2015 three entries are missed (1999-05-24, 2008-03-10, 2011-08-05) and the sequence
  diverges for several trades (`loc/results/entry_differences.csv` lists every one). The 0.05% band and
  "missed" outcome are illustrative assumptions; the direction of the effect is not predictable.
- The reset cap (`loc_nocap` vs `loc_frac`) has no historical effect (section 1, Q6).
- `loc_whole_c` (floor(100000/close)) is not implementable with an LOC and is shown only to isolate pure
  whole-share rounding, which is negligible at the file's price scale.

Operational load (`loc/results/submission_stats.json`): an LOC would have been submitted on every flat
session, 105 sessions per year for VGT 2016-2026 (1,050 submissions, 38 fills, 3.6% fill rate), each with a
limit recomputed from the previous 90 sessions' highs.

Assumptions in every LOC variant, labelled: the fill price equals the file's close (Q7 lists how it can
differ); a closing auction occurs on every session; an order at or below the limit fills in full (Q9); the
cap is modelled as a strict inequality rather than a $0.01 step; adjusted prices stand in for live prices.

## 4. What the user must understand before considering LOC

1. At Vanguard Brokerage the order type is, on the published evidence, unavailable; implementing the entries
   there means either a plain limit day order entered minutes before the close (which fills at any moment the
   price touches the limit, not at the close, so it can enter on sessions the model would skip), a manual
   market order in the final minute (close to, not at, the closing price), or moving the strategy to a
   broker that publishes MOC/LOC support (not evaluated here).
2. Where LOC is available, the model's entry decisions are reproduced exactly, but the $100,000 size is not:
   quantity must be fixed at the limit, so the dollars invested fall short by the limit-to-close gap, which
   is largest on the entries that mattered most. Expect roughly 3% less invested per entry on average and up
   to 16% on crash days, and a net result 6-9% below the backtest on the 2016-2026 data.
3. The entries sit close to the limit by construction (13 of 38 VGT entries within 0.5%, the closest
   0.096%). Dividend-adjustment differences between the backtest and live highs, $0.01 rounding, and the
   difference between the Official Closing Price and a vendor close are all of that order, so the live entry
   set will not be the backtest's entry set even with a perfect LOC.
4. Fills are conditional on a closing auction existing in VGT that day and on contra-side interest at the
   price; neither is documented for VGT specifically. An unfilled LOC is cancelled and must be re-entered the
   next session; a reset session must not be bought, which the capped limit guarantees.
5. Newly bought Vanguard ETF shares are not margin-eligible for 30 days at Vanguard, so each VGT entry
   must be collateralized by other holdings; the exit side (stop and 15-day loss exit) is a separate
   execution problem that this study did not touch.

## Files

- `LOC_FEASIBILITY.md` (this report)
- `loc/README.md`, `loc/loc_simulation.py`, `loc/conflict_quantification.py`
- `loc/results/`: `summary.csv`, `summary.json`, `verification.json`, `entry_differences.csv`,
  `whole_share_sizing.csv`, `sizing_stats.json`, `conflict_sessions.csv`, `conflict_summary.json`,
  `submission_stats.json`, `<dataset>__<variant>__trades.csv`, `<dataset>__<variant>__orders.csv`
