# Workstream E — trade quality, concentration and adverse excursions

**Sources:**
- The reconciled funded-lot ledgers of the base fixed-pool runs ($100,000 per lot, 5 bps, 11%). They are identical to
  `npm run pools -- fixed` (see `BASELINE_RECONCILIATION.md`).
- For the drawdown episodes, the portfolio runs' lots.

Every lot is in `results/E_trades.csv`, with its MAE/MFE.

**MAE/MFE definition** (pre-registered, PROTOCOL.md §7):
- They are taken over the symbol's regular-session minute bars legally observable while the lot was held: from the
  entry bar (its open is the fill) through the bar before the exit bar, plus the exit price itself.
- The exit bar's range beyond the fill is excluded, because the order of prices within a minute is unknown.
- Percentages are relative to the raw entry fill. Dollars are shares × (extreme − cost-adjusted entry), before
  interest.
- Gaps appear as the next bar's open.
- Minute OHLCV bars are not quotes. A stop exit "at the stop level" assumes the stop traded.
- The engine's own `worstMark` (minute close, net of interest) is in the CSV for comparison.

## Trade statistics

**B4**

{{t.tradeStats.B4}}

**B5**

{{t.tradeStats.B5}}

Profit factor is gross wins ÷ |gross losses| of lot nets. Holding periods are calendar days.

**Exit reasons — B4**

{{t.exitReasons.B4}}

**Exit reasons — B5**

{{t.exitReasons.B5}}

- **All profit comes from trailing-stop exits.** Stop and stop-gap exits net {{v.stopNet.B4}} (B4) and
  {{v.stopNet.B5}} (B5).
- **Maximum-hold exits are the losers.** B4's {{v.holdLots.B4}} maximum-hold exits net {{v.holdNet.B4}}, and B5's
  {{v.holdLots.B5}} net {{v.holdNet.B5}}. These are trades whose net-profit stop never became active.

**Setups:**

{{t.setups.B4}}

{{t.setups.B5}}

## Concentration (descriptive)

"Without the top N" subtracts the largest winners from the realized total. It shows how much of the result rests on a
few trades. **It is not a feasible alternative backtest:** those trades held the slot, and without them other trades
would have been funded.

**B4**

{{t.concentration.B4}}

{{t.topWinners.B4}}

**B5**

{{t.concentration.B5}}

{{t.topWinners.B5}}

- **B4 is concentrated in VGT.**
  - The VGT book provides {{v.share.B4.VGT}} of B4's net.
  - The top three lots, all VGT ({{v.top3.B4}}), are 2 April → 4 September 2020, 22 April 2025 and December 2018.
  - The top ten provide {{v.top10.B4}}, and without them B4 keeps {{v.withoutTop10.B4}}.
  - Gate B (top-3 lots) stays under 50%, so no flag, but B4 depends on a handful of long VGT rebound trades.
- **B5 is more evenly spread.** The top three provide {{v.top3.B5}} and the top ten {{v.top10.B5}}. GDX provides
  {{v.share.B5.GDX}}, VGT {{v.share.B5.VGT}} and KRE {{v.share.B5.KRE}}.

## Losses and adverse excursions

**Largest losing lots — B4**

{{t.topLosers.B4}}

**Largest losing lots — B5**

{{t.topLosers.B5}}

**MAE / MFE by book — B4**

{{t.excursions.B4}}

**MAE / MFE by book — B5**

{{t.excursions.B5}}

**Deepest adverse excursions — B4**

{{t.worstMae.B4}}

**Deepest adverse excursions — B5**

{{t.worstMae.B5}}

- **Losses are capped by the maximum hold, not by a stop.** The deepest excursion in either pool is
  {{v.worstMae.B4}}. That lot was bought into the March-2020 collapse, before any net-profit stop could be active,
  and it was closed by the maximum-hold rule.
- **There is no protective stop.** D1 has no protective stop below entry. Until the trailing stop is net-positive, a
  lot's downside is bounded only by time (the hold and the buffered intraday loss), not by price. A gap like March
  2020's (KRE −18% inside a 4-day hold) is the tail this history shows. Nothing in the rules caps a larger one.
- **GDX's excursions are wider (median MAE −3.2%), and so are its gains (median MFE +20.5%).** Both of its losing lots
  are 2026 maximum-hold exits.

## Clustering and the portfolio's worst episodes

The pool has a single slot, so funded lots never overlap. Losses cluster in time instead. Losses by the regime of the
lot's entry:

**B4**

{{t.lossesByRegime.B4}}

**B5**

{{t.lossesByRegime.B5}}

These are the lots held during the five deepest **portfolio** drawdowns (daily close; portfolio-mode lots, net at 20%
of equity):

**B4**

{{t.episodeLots.B4}}

**B5**

{{t.episodeLots.B5}}

**March 2020: B4's deepest episode.** The pool's own losses deepen the core's fall (C0 −31.6% in that episode) to
−34.6%, through:
- the KRE lots of 9 March (−$9.7k at portfolio scale) and 18 March (−$10.3k);
- a few small XBI losses.

**March 2020: B5.** Its episode ends earlier (trough 12 March), because GDX's gains from 16 March offset the core.

**2022:** after a KRE lot carried in from December 2021, both pools' lots were mostly brief XBI long trades. They earned
money while the core fell, so at the frozen parameters the overlay **reduced** the 2022 drawdown (B4
{{v.b4Episode2022}}, B5 {{v.b5Episode2022}}, against C0's {{v.c0Episode2022}}). The parameter neighbours do not
reproduce these 2022 gains (`PARAMETER_STABILITY.md`).

**2025 and the 2018 Q4 selloff:** a single VGT lot each, small relative to the core's fall.

## Trades responsible for B5's advantage over B4

These are the GDX lots, all funded only in B5. Together they exceed the whole B5 − B4 difference (see
`ETF_ABLATION.md` for the full bridge, including displaced lots):

{{t.gdxLots}}

{{v.gdxLots}} GDX lots in {{v.armedYears}} years of arming is about {{v.gdxPerYear}} a year.
- The top five provide {{v.gdxTop5}} of B5's advantage.
- Four March–April 2020 lots provide about $92k.
- Two 2026 maximum-hold losses (−$8.0k, −$6.7k) are the only GDX losers.

**Statistical restraint.** These lots are not independent observations:
- the four 2020 lots are one episode;
- the 2022–2024 lots are one gold-miner rally.

The effective sample behind the GDX increment is therefore a few episodes, not 16 trades. No significance test or
confidence interval is computed from them.
