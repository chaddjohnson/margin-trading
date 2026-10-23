# Recommendations

Restrained, because the evidence is thin: one sealed episode (April 2025), 0–6 holdout trades per contender, eight
correlated ETFs, twenty-four frozen vectors, and an architecture whose rules were themselves built on VGT with data
through 2025. Everything below is conditional on `HOLDOUT_RESULTS.md` §4.

## 1. Which tickers merit further forward validation, and which do not

| Ticker | Development (primary vs D1) | Walk-forward of the rule | Holdout (primary vs D1) | Recommendation |
|---|---|---|---|---|
| KRE | +$167k, DD $56k → $26k, 70 trades | pass (4 folds, stitched +$16k vs +$3k; lowDd +$52k) | +$23k vs +$15k on 5 trades, DD $7k vs $15k | **the only ticker where every stage pointed the same way**; keep the primary and the lowDd alternate (X 29.9%, stop 3.1%, hold 4–5, L 230–233) under paper forward validation; note the cost fragility (−15% at 2 bps) and the box edges |
| XBI | +$117k, DD $69k → $28k, 24 trades | pass (2 of 4 folds) | +$54k vs −$1k, but one open position | forward-validate the primary only as a trend-ride phenotype (X 29.1%, stop 10.4%, hold 3); its holdout result is one unrealized trade and its minimum probe share is 23%; the lowDd alternate (X 30.0%) never traded in the holdout and should be dropped |
| XRT | +$104k, DD $42k → $23k | pass (3 of 4) | tie (+$20.3k vs +$20.6k) | no basis to prefer the primary over D1 out of sample; a 5-bps cost removes half its development net; do not advance |
| IWM | +$107k, DD $40k → $15k, 38 trades | pass (3 of 4); lowDd pass (4 of 4) | −$15k vs D1 (3 scalps vs one ride) | the scalp phenotype is coherent in development and walked forward, but lost the one holdout episode to D1's wider stop; forward-validate only if the question is "many small trades at low drawdown", not "more profit" |
| IWN | +$91k, DD $42k → $17k | pass (2 of 4) | −$4k vs D1 | as IWM, weaker; thin tape (1.5k shares a minute) makes the scalp fills least credible here; do not advance |
| XLY | +$40k, DD $29k → $17k | **fail** (−$53k vs +$56k) | −$25k vs D1 | the rule never beat D1 on XLY in any year; frozen D1 is the better-supported choice on this ticker; do not advance the nominations |
| XLF | +$101k, DD $32k → $17k | fail (stitched below D1) | no trade for anyone | untested out of sample; the 2024–2025 window held no 21.6–25% XLF dip; nothing to recommend either way |
| XLE | +$127k, DD $72k → $25k | fail | no trade for anyone | untested; XLE's 2025 decline did not reach 21.6–30% from its rolling high; nothing to recommend |

Across all eight the frozen controls earned +$95,912 in the holdout against the primaries' +$114,351, of which XBI's
single open position is $54,247; without it the primaries trail the controls ($60k vs $97k). **The development
optimization did not generalize as a set.**

## 2. Multiple defensible phenotypes (what the research keeps, not what it deploys)

1. **Frozen D1** (X 21.6%, stop 7.3%, hold 8): weak and high-drawdown on sector ETFs in development (six of eight above
   $35k), but the only phenotype that captured the April 2025 recovery on four tickers. Its known weakness is the
   inactive stop below breakeven: the hold-day exit sold 20–26 of its 32–45 trades on XBI, KRE and XLE at a loss.
2. **Tight-stop scalp** (stop 3–4%, hold 4–13, long lookbacks, many continuation re-entries): the in-sample optimum on
   five tickers, low drawdown, high win rate, cost-fragile (5–10 bps per side removes 12–46% of the net), and the loser
   when a rebound runs. It is a different strategy wearing D1's rules.
3. **Deep-dip trend ride** (X 24–30%, stop 6.5–10.4%): few trades, large winners, half the net in one or two trades;
   coherent with D1's own character but rarely armed (XLE and XLF never armed in 2024–2025).

A fourth, not searched here because the brief excluded architecture changes: D1 with a stop that is active below
breakeven (the earlier programs' B-C/B-D variants), which is what the hold-day losses on XBI, KRE and XLE call for.

## 3. What would need testing before any combined shared-margin pool

1. **Forward data.** The eight files end on 2025-10-16. The next 12–24 months of minute data, evaluated once on the
   frozen vectors in `FROZEN_CANDIDATES.json` without re-selection, is the only way to add evidence; nothing in the
   existing 2024–2025 window can be re-used as a test.
2. **Simultaneity, not overlap.** `STRATEGY_COMPARISON.md` §3 shows every traded ticker arming within ten sessions in
   April 2025, as in December 2018 and March 2020. A shared pool is therefore a *priority rule under simultaneous
   demand*, and the earlier shared-margin program showed the refused-signal semantics alone change results seven-fold.
   That rule, with hold / cancel / paper-book semantics, must be designed and preregistered before any pooled backtest.
3. **Costs and fills on the thin tickers.** The scalp phenotypes need a measured spread model (not the hypothetical
   2/5/10 bps) on IWN and XRT before their drawdown figures mean anything.
4. **The distribution basis.** Price-only backtests ignore quarterly distributions on XLE, KRE, XLF; a total-return
   comparison needs a per-share distribution history the repository does not hold.
5. **The architecture's stop.** Before pooling, the question of a stop that protects below breakeven (the main driver
   of D1's sector drawdowns) should be settled on VGT and these eight together, under a fresh protocol.

No deployment, sizing or allocation decision follows from this program.
