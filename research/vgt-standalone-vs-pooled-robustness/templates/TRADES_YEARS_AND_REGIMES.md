<!-- Rendered by `npm run vgt-robustness -- report` from templates/TRADES_YEARS_AND_REGIMES.md and results/analysis.json; edit the template, not this file. -->
# Trades, years and regimes

All ledgers are the base fixed runs: one $100,000 lot, 5 bps per side, 11% interest, on {{v.window}}.

**Sources:**
- S: fresh, `results/detail/s_VGT-primary_cost_base_fixed/`.
- B4/B5: the prior audit's stored base ledgers (reproduced exactly).

**The chronological ledger of S's funded lots:**
- `results/T_trades_VGT-primary_fixed.csv` (and `.json`);
- the portfolio-mode ledger, `results/T_trades_VGT-primary_portfolio.csv`.

Year and regime figures are marked-to-market **attribution** within one continuous run. Leaving a year out is an
accounting subtraction, not an executable backtest.

## 1. Trade quality

{{t.tradeStats}}

**S's profit rests on a few large trailing-stop winners:**
- **Lots:** {{v.S.lots}} lots, {{v.S.wins}} won.
- **Concentration:** the best lot earns {{v.S.best}}. The top 1 / 3 / 5 lots are {{v.S.top1}} / {{v.S.top3}} /
  {{v.S.top5}} of total net. The top 10 exceed 100% ({{v.S.top10}}): the other 11 lots lose money together.
- **Without the winners:** without the top 3 the total would be {{v.S.exTop3}}, and without the top 5 {{v.S.exTop5}}
  (descriptive only).
- **For comparison:** B4's top 3 lots are {{v.B4.top3}} of its net, and B5's {{v.B5.top3}}.
- **Conclusion:** S is the most trade-concentrated of the three. Its VGT book inside the pools is just as concentrated;
  the pools dilute it with other books.

**Exit reasons (S):**

{{t.reasons}}

- **Winners:** every stop exit was profitable, {{v.S.profitableStops}} of {{v.S.profitableStops}}. The net-profit stop
  activates only once a stop fill would net a profit.
- **Losers:** all six losing lots are maximum-hold exits ({{v.S.maxHoldLosers}} losers, {{v.S.maxHoldWinners}} winner).
  D1 has no protective stop. A lot's loss is bounded only by the 8-day hold (and the 2.9% buffer from day 8).
- **Worst figures:**
  - worst realised lot {{v.S.worst}};
  - worst intraday excursion (MAE, from legally observable minute bars) {{v.S.worstMae}}, which is
    {{v.S.worstMaeDollars}} at $100,000 before interest;
  - worst minute mark of a lot, net of interest, {{v.S.worstMark}}.
- **Typical excursions:** median MAE {{v.S.medianMae}}, median MFE {{v.S.medianMfe}}.
- **Profit factor:** {{v.S.profitFactor}}.
- **Holding:** median {{v.S.medianHold}} sessions, maximum {{v.S.maxHold}}.

**S's full ledger:**

{{t.sLedger}}

Prices after 2026-04-21 are in the forward-adjusted pre-split units of the canonical data (VGT split 8:1 that day).

**Limitations:**
- MAE/MFE come from one-minute OHLCV, not quotes. A gap is seen at the next bar's open.
- A stop fill at the stop level assumes the stop traded.

## 2. Years

{{t.years}}

- **2016–2019 are identical across the three.** Until 2020 only VGT ever held the pools' slot.
- **The divergence is all 2020 onwards.** From 2020 the other books fill time VGT leaves idle, and in 2020 GDX takes
  part of VGT's slot in B5 (`BASELINE_AND_COMPARABILITY.md` §4).

{{t.yearSummary}}

**S's dependence on a few years:**
- **Concentration:**
  - 2020 is {{v.S.y2020share}} of S's total ({{v.S.y2020}});
  - 2020 + 2025 are {{v.S.top2Share}};
  - 2022 contributes {{v.S.y2022share}}.
- **Idle years.** S entered **no lot** in {{v.S.noEntryYears}}. 2017 is partial eligibility. The 2026 lot was entered
  in November 2025, and the partial 2026 is {{v.S.y2026}}.
- **No mechanical regime holds more than half of S's net.** The largest is {{v.S.largestRegimeShare}}; for B4 and B5
  it is {{v.B4.largestRegimeShare}} and {{v.B5.largestRegimeShare}}.
- **But S's profit is clustered in time.**
  - The calendar years 2020 and 2025 dominate.
  - The two years without entries mean that long stretches carry no exposure and no evidence.
- **The pools are steadier through 2023–2024.** They spread across more years: B5's 2023 is {{v.B5.y2023}} and its 2026
  partial is {{v.B5.y2026}}.

**Leave-one-year-out** (attribution only: the total minus that year's marked-to-market change):

{{t.loyo}}

## 3. Mechanical regimes

These are the prior protocol's VOOG windows, fixed before any audit run: R1 2018 Q4, R2 2020 crash, R3 2022 bear,
R4 2025 selloff. Each has a stress (peak → trough) and a rebound (trough → recovery), plus calendar 2023, the partial
2026 and the ≥ 10% corrections K1–K3 for context. "S − C0" etc. is the portfolio's return minus C0's in the same window.

{{t.regimes}}

**By regime (stress + rebound together, fixed):**

{{t.regimeTotals}}

**Readings:**
- **R1 and R4 are identical for all three.** VGT alone traded then.
- **R2, the 2020 crash.**
  - In the stress leg, S lost less than B4. B4's March-2020 KRE lots lost more than the VGT lot they displaced
    (`BASELINE_AND_COMPARABILITY.md` §4).
  - B5 gained, because GDX held the slot.
- **R3, the 2022 bear and its rebound.**
  - S earned little across the window.
  - The pools earned much more, through XBI/XRT/KRE/GDX lots (B4 and B5) and the 2023 rebound. Those are the frozen
    2022 gains the prior audit found **not** reproduced by the pools' neighbours (median about $6–8k).
  - S's 2022 lots are VGT-only and small.
- **Portfolio excess over C0** is small in every stress leg for S, but positive in its rebounds.

## 4. The VGT book inside the pools (the prior ablation)

{{t.poolContext}}

**B4:**
- VGT is the largest funded book ({{v.B4.vgtFundedNet}}). Its **incremental** contribution, the pool against the pool
  without VGT, is only {{v.B4.vgtFixedIncrement}} in fixed mode and {{v.B4.vgtPortfolioIncrement}} in the portfolio.
  Removing VGT frees the slot for other books' signals. This is the prior `ETF_ABLATION.md` finding, reproduced
  from its records.
- It does **not** show that S is ineffective. S has no other books to displace, and alone it earns {{v.S.fixedNet}}.
  It shows that inside B4 VGT's slot time is nearly as valuable to the other books as to VGT.

**B5:** VGT's increment is positive in both modes: {{v.B5.vgtFixedIncrement}} fixed and {{v.B5.vgtPortfolioIncrement}}
portfolio.

## 5. In-sample uncertainty (paired stationary bootstrap)

The bootstrap resamples daily changes of the fixed strategy mark from arming to the end:
- mean block length 21 sessions;
- 5,000 resamples;
- seed `deriveSeed('vgt-standalone-vs-pooled-robustness-v1', 'bootstrap')`;
- the S, B4 and B5 series resampled on the same days.

It assumes stationarity and dependence shorter than the blocks, and it reuses the inspected history. It is **not**
validation.

{{t.bootstrap}}

**Findings:**
- **S's total is positive {{v.boot.S.phrase}}** (P5 {{v.boot.S.p05}}).
- **The B5 − S difference is positive {{v.boot.B5S.phrase}}** (P5 {{v.boot.B5S.p05}}).
- **B4 − S is positive in all but {{v.boot.B4S.nonPositive}}.**

On this history, then, the pools' extra profit over S is not a few-day accident. But the bootstrap cannot see the
selection of the pools' parameters on this same history.
