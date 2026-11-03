# Workstream B — dependence on years and market regimes

**Source and method:**
- The two continuous `all` base runs of each pool (fixed and portfolio, frozen conventions) and C0.
- Attribution is **marked to market**: the change of the fixed pool's `strategyMark` (realized plus unrealized,
  net of accrued interest), or of portfolio equity, from the last close of one period to the last close of the next.
  Lots open across a boundary are therefore split by their marks, not booked in their exit year.
- Realized net by exit year is shown beside it, for contrast only.

Machine-readable results:
- `results/B_yearly.csv`;
- `results/B_regimes.csv`;
- `results/analysis.json` (keys `B`, `C.bridge`).

**Partial years:**
- 2016 cannot trade.
- 2017 trades only from 2017-06-15 (arming).
- 2026 runs to 2026-10-13.

## Calendar years — B4

{{t.years.B4}}

## Calendar years — B5

{{t.years.B5}}

**Reading:**
- **B4.** The largest single year is {{v.top1Year.B4}} of total fixed net, and the top two are {{v.top2Years.B4}}.
  Negative years: {{v.negativeYears.B4}}.
- **B5.** The largest single year is {{v.top1Year.B5}}, and the top two are {{v.top2Years.B5}}. Negative years:
  {{v.negativeYears.B5}}.
- **Gate B.** Neither pool crosses the 50% single-year threshold, so gate B (year part) raises no flag.
- **Quiet stretches.** In both pools, profit arrives in bursts tied to deep sector dips. 2024 and 2026 contributed
  nothing or less to B4. GDX alone made those years positive for B5.

## Leave-one-year-out (attribution only)

These figures subtract one year's marked-to-market contribution from the continuous run's total. **They are not
backtests:**
- no bar was deleted;
- no paths were joined;
- no peak was reset.

Removing a year from history would change every later state (reference highs, setups, the shared slot), so a real
counterfactual cannot be defined without changing the strategy.

{{t.loyo}}

Without its best year (2020), B4 keeps 73% of its total and B5 66%. Both stay strongly positive under every single-year
exclusion, so the history is not dominated by one year. It is, however, concentrated in the deep-dip years 2020,
2022 and 2023.

## B5 − B4 by year

The fixed-pool difference totals {{v.diffTotal}}. B5 and B4 are identical until GDX's first funded lot in March 2020,
so every difference falls in 2020 or later.

{{t.yearDiff}}

- The largest year is {{v.diffLargestYear}}: under the 50% threshold.
- Of the remainder, 2022, 2023, 2024 and 2026 each add $25k–31k. 2021 and 2025 add nothing.
- The portfolio difference keeps growing in years with no fixed difference (2021, 2025), because the larger B5
  account compounds the same percentage returns.

## Regimes (pre-registered, mechanical: VOOG closes, ≥ 15% falls)

Windows run close to close:
- **stress:** peak → trough;
- **rebound:** trough → recovery.

There are also the "2023 recovery" and "2026 partial" calendar windows, and three ≥ 10% corrections shown for context.

{{t.regimes}}

{{t.regimeDiff}}

- **Largest regime share.** The 2020 crash and its rebound (R2) produce {{v.diffLargestRegime}} of B5's advantage
  (marked to market): just under gate C's 50% threshold. The 2022 bear market and its long rebound (R3) produce most of
  the rest.
- **Selloff months themselves.** Both pools gain in the 2022 stress window (fixed pool +$53k / +$60k, while the core
  fell). They lose little in the 2018 and 2025 stress windows. That is the counter-cyclical character of a dip-buying
  overlay: it arms on deep sector falls and is paid on the rebound.
- **The 2022 size is parameter-specific.** The median joint neighbour makes only {{v.median2022.B4}} (B4) and
  {{v.median2022.B5}} (B5) in calendar 2022 (`PARAMETER_STABILITY.md`).
- **Up to 13 March 2020 both pools traded identically.** That includes the KRE lot of 9 March, a −$8.3k maximum-hold
  loss.
- **From 16 March the paths diverge.**
  - B5's GDX book won the slot: GDX lots of 16–18, 19–20 and 23–27 March added +$37.4k, +$10.9k and +$16.1k.
  - B4 cycled through brief XBI and KRE lots instead, including the KRE lot of 18 March (−$10.1k).
  - Fixed-pool result in the stress window: B4 −$25.3k, B5 +$32.6k.
  - Portfolio result: B4 −34.6% and B5 −26.8%, against C0's −31.6%.
- **The divergence persists into April.** GDX held the slot on 1–15 April 2020 (+$27.6k), so B5 missed B4's best
  trade, VGT 2 April → 4 September 2020 (+$51.3k).
- **R3 and 2026.** The 2022 rebound (R3r) adds +$65.8k to B5 through GDX lots in 2022–2024. 2026 adds +$31.1k.

## In-sample uncertainty: stationary block bootstrap

This is a diagnostic only. It resamples the {{v.bootstrapSessions}} daily fixed-pool marked-to-market changes from
arming to the end:
- blocks have a geometric mean length of 21 sessions;
- there are 5,000 resamples;
- B4 and B5 use the same indices (paired).

It assumes stationarity and dependence shorter than the blocks. It reshuffles the same inspected history, so **it is
not validation** and it says nothing about selection bias.

{{t.bootstrap}}

Reshuffling the same days in blocks leaves B5 − B4 positive in all but {{v.bootDiffShare}} of resamples (5th
percentile {{v.bootDiffP05}}). Given the history, the difference is therefore not one lucky ordering of days. Whether
the history itself repeats is a separate question.

## Assessment

- **Positive performance is reasonably spread.** Gate B raises no flag. Every leave-one-year-out total stays above
  $200k (B4) or $320k (B5).
- **But it is episodic.** Gains cluster in a handful of deep-dip windows (2020, 2022–2023, 2025).
- **B5's advantage clusters even more:**
  - its largest year is {{v.diffLargestYear}};
  - one regime provides {{v.diffLargestRegime}};
  - the rest arrives at about $25–30k per year from GDX in 2022–2024 and 2026.

  It is not driven by one year, but it rests on about two episodes and a few GDX trades (see `TRADE_CONCENTRATION.md`).
