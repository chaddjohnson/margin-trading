# Final assessment — B4/B5 frozen-strategy robustness audit

**Scope and status:**
- An independent diagnostic of two frozen pools, B4 (`All-lowDd`) and B5 (`All-lowDd+GDX`), on the inspected
  2016-01-04 → 2026-10-13 history.
- Nothing was optimised, selected or promoted.
- No frozen file was changed.
- The prospective B4/B5 freeze still verifies.

**Record:**
- Protocol: `PROTOCOL.md`, sha256 `{{v.protocolSha}}`, frozen before any audit run.
- Runs: {{v.runs}}, all stored and analysed.
- Baseline: {{v.baselineChecks}} checks passed.

## Executive summary

- **Both pools are real in-sample effects, but their frozen figures are an isolated peak.**
  - Every one of the 128 jointly perturbed configurations of each pool (two seeds of 64; 256 in all) is profitable, and so is every single-parameter
    change.
  - The typical neighbour earns about half the frozen net ({{v.jointMedianRatio.B4}} B4, {{v.jointMedianRatio.B5}}
    B5).
  - No neighbour beats the frozen pool.
  - **Gate A flags both.** Expect materially less than the reported $284k / $486k.
- **Costs are not the main risk.** Both pools stay profitable, and above the no-margin core, under every tested
  financing, friction, slippage and stop scenario, up to 18% interest plus 45 bps per side plus 50 bps of stop
  overshoot. Degradation is non-linear: costs change the trade path through D1's net-profit stop.
- **GDX's increment is broad across costs and its own parameters, but narrow across time.**
  - B5 − B4 stays between {{v.costDiffMinFixed}} and {{v.costDiffMaxFixed}} in every cost scenario.
  - Every GDX-parameter variant of B5 still beats frozen B4.
  - It stays positive in all but {{v.bootDiffShare}} of block-bootstrap resamples.
  - But it comes from {{v.gdxLots}} GDX trades in about two episodes. The largest year is {{v.diffLargestYear}}; the
    2020-crash regime is {{v.diffLargestRegime}}, just under the 50% flag; the top five GDX trades are
    {{v.gdxTop5}}.
- **Portfolio risk.**
  - The 60/40 VOOG/VGT core alone falls {{v.daily.C0}} (daily) and {{v.minute.C0}} (minute). The 30% objective is
    unattainable on this history with or without an overlay.
  - B4 **adds** drawdown: {{v.daily.B4}} / {{v.minute.B4}}, so the 35% tolerance is exceeded on the minute measure.
  - Frozen B5 **reduces** it: {{v.daily.B5}} / {{v.minute.B5}}. But that reduction depends on the exact frozen
    parameters: the March-2020 slot sequence, and 2022 gains that neighbours do not reproduce. B5's median parameter
    neighbour draws down {{v.dmed.B5.joint-s1}}, in most cases in the 2022 bear market.
- **Verdicts:**
  - **B4: Conditional (material fragility).**
  - **B5: Conditional (material fragility).** On the evidence, B5 is the stronger of the two.
  - Neither is rejected. Neither is "retain" without qualification.

## Comparative table

{{t.headline}}

## Pre-registered gates (thresholds unchanged)

{{t.gates}}

## Evidence for B4

**Positive:**
- **Profitable everywhere nearby.** 100% of neighbours (OAT and joint) are profitable, and the worst joint neighbour
  still earns {{v.jointWorst.B4}}.
- **Robust to moderate costs.** C1 leaves {{v.cost.B4.C1}}. Every cost scenario stays above C0 in the portfolio.
- **Not dominated by one year.** The top year is {{v.top1Year.B4}}, and every leave-one-year-out total is above $200k.
- **Wealth.** {{v.inc.B4}} of incremental wealth over C0.

**Negative:**
- **Isolated peak.** The joint median is {{v.jointMedianRatio.B4}} of frozen (gate A flag).
- **Concentrated in VGT.** The VGT book provides {{v.share.B4.VGT}} of net, and three VGT trades {{v.top3.B4}}.
- **VGT's increment is mostly displacement.** The VGT book's fixed-pool increment is only
  {{v.abl.B4.VGT.fixedInc}}, because its slot time would otherwise fund other books' lots. Its portfolio increment is
  negative ({{v.abl.B4.VGT.portInc}}): removing VGT *raises* B4's end equity.
- **Adds drawdown to the core.** {{v.daily.B4}} daily / {{v.minute.B4}} minute against C0's {{v.daily.C0}} /
  {{v.minute.C0}} (D35, D30 and D+ flags). The March-2020 KRE lots deepen the crash drawdown by about 3 pp. Costs do
  not reduce that risk: under C3, B4 still draws down {{v.c3Daily.B4}} for only {{v.c3Inc.B4}} of incremental wealth.
- **The most cost-sensitive.** C2 −49% and C3 −60% of fixed net.

**Disposition: Conditional (material fragility).**
- Not rejected: its incremental wealth is large and positive in every scenario, and its excess drawdown over C0 is
  small (+0.75 pp daily, +1.25 pp minute).
- But it buys that wealth with more total-portfolio risk, in a book mix whose largest component (VGT) duplicates the
  core.

## Evidence for B5

**Positive:**
- **Profitable everywhere nearby.** All of it is, and the worst joint neighbour earns {{v.jointWorst.B5}}.
- **Robust to costs.** C1 leaves {{v.cost.B5.C1}}, and C3 {{v.cost.B5.C3}}.
- **Diversified across books.** Top-3 lots are {{v.top3.B5}}, and GDX {{v.share.B5.GDX}}, VGT {{v.share.B5.VGT}} and
  KRE {{v.share.B5.KRE}}.
- **A robust GDX increment** (cost-, GDX-parameter- and bootstrap-robust), with an economic rationale: gold miners
  rallied while equities fell in March 2020 and in 2022–2024.
- **Lower historical drawdown than C0** on both measures, with {{v.inc.B5}} of incremental wealth.
- **Helped in the 2022 bear market** at the frozen parameters, although this is not robust: neighbours made far less
  in 2022 (median {{v.median2022.B5}} against {{v.frozen2022.B5}}).

**Negative:**
- **Isolated peak.** The joint median is {{v.jointMedianRatio.B5}} of frozen (gate A flag).
- **A fragile drawdown advantage.**
  - {{v.d35.B5.joint-s1}} of joint neighbours exceed 35% daily, and the median is {{v.dmed.B5.joint-s1}}.
  - For {{v.peak2022.B5}} neighbours, the worst episode is the 2022 bear market. There the frozen pool earned
    {{v.frozen2022.B5}} and the median neighbour only {{v.median2022.B5}}.
  - D30 flag even at the frozen point: minute 31.09%, and C3 {{v.c3Daily.B5}} daily.
- **A thin increment.** The GDX increment rests on {{v.gdxLots}} lots and about two episodes, with 2020 and the
  2020-crash regime close to the 50% threshold. GDX trades rarely (about {{v.gdxPerYear}} a year).
- **No protective stop.** A lot's loss is bounded only by its maximum hold. GDX's 2026 maximum-hold losses
  (−$6.7k, −$8.0k at $100k) show the tail is live.

**Disposition: Conditional (material fragility). Preferred over B4.**
- B5 dominates B4 in every cost scenario, in fixed and portfolio terms, and its edge does not depend on cost
  assumptions.
- But its headline figures (net, and especially the 29.67% drawdown) are optimistic point estimates. GDX's
  contribution is economically plausible but statistically thin.

## Does GDX's incremental edge look broad or fragile?

**Broad in three senses:**
1. **Costs and execution.** It is positive and nearly constant under every scenario.
2. **GDX's own parameters.** Every one of 32 GDX-perturbed variants of B5 beats frozen B4.
3. **Block reshuffling of the history.** It is non-positive in only {{v.bootDiffShare}} of resamples.

**Fragile in two senses:**
1. **Time.** About half the increment comes from four GDX trades in March–April 2020, and most of the rest from the
   2022–2024 gold-miner rally.
2. **Joint perturbation.** With every book's parameters jittered together, B5's portfolio drawdown advantage over B4
   and C0 largely disappears, even though its profit advantage remains (joint median net {{v.jointMedian.B5}} against
   B4's {{v.jointMedian.B4}}).

The honest summary: GDX adds a real, cost-robust, low-frequency diversifying return stream, but one with too few
independent episodes to size its future contribution.

## Most important failure modes

1. **Over-estimated magnitude (selection bias).** The frozen nets are the top of the in-sample plateau. Plan on about
   half, or less.
2. **Slot-sequence dependence.** One shared slot means small changes, in parameters, costs (path effects) or forward
   data, reorder which book trades. B5's low drawdown and B4's VGT dependence are both products of specific
   sequences. The frozen pools' outsized 2022 gains are also not reproduced by their neighbours.
3. **Crash-gap tail with no protective stop.** A lot bought into a collapse can fall 18% below its entry before the
   maximum hold closes it (KRE, March 2020; the worst realized lot was −10.1% of notional). A larger gap within a hold
   would cost proportionally more: about 2% of portfolio equity per 10% gap at 20% borrowing.
4. **Core-driven portfolio drawdown.** The overlay cannot keep the account under 30%. B4 makes the worst episode
   slightly deeper.
5. **Unmodelled broker mechanics.** No maintenance calls are modelled; the passive ratios stayed ≥ 1.36× even at
   60%-uniform requirements. Nor are the Vanguard 30-day no-loan-value rule, house-requirement increases in a crash,
   uncredited XBI/XRT/KRE/GDX distributions, or capacity at $0.6–1.0M per lot.
6. **Execution in stress.** Spreads widen in exactly the episodes that pay. 20–45 bps per side was tested, but minute
   bars cannot show quote-level fills.

## Known model limitations

- **One inspected history.** Neighbours, years, regimes and bootstrap resamples all reuse it. None is independent
  validation.
- **No overfitting statistic.** PBO and deflated Sharpe are **not computed**. The books were selected through
  sequential searches across studies: about 20,000–22,500 candidates per ETF in `research/multi-etf-d1`, and 14,540
  pool evaluations for GDX in `research/portfolio-aware-d1-optimization`, plus pool-level choices. Their trial-level
  return series are not consolidated, so a defensible overfitting probability cannot be computed. None is invented
  here.
- **Attribution, not counterfactuals.** Year and regime exclusions are attribution only.
- **Partial years.** 2016 has no trading, 2017 is partial, and 2026 runs to 2026-10-13.
- **Minute and daily drawdowns differ.** Minute-sampled portfolio % drawdowns exist only as whole-run maxima; per-year
  and per-episode figures are daily-close.

## Incomplete or unavailable evidence

- **Every workstream ran in full.** Nothing pre-registered was skipped.
- **Per-year minute-sampled drawdowns** were not reconstructed. The engine exposes only the whole-run minute maximum,
  so per-year depths are daily-close.
- **Margin-call survival** is not modelled. Only passive proximity is reported.
- **No break-even** cost or rate exists inside the tested ranges, and none is extrapolated.

## Prospective validation plan (criteria frozen now)

The decision criteria are in **`PROSPECTIVE_VALIDATION_CRITERIA.md`**, hashed in `PROSPECTIVE_CRITERIA_FREEZE.json`
while the forward observation count is 0. In short:

- **Data and runs.** Only bars after 2026-10-13, through the existing frozen forward pipeline
  (`npm run pools -- forward import|report`). It is one continuous run; nothing is re-tuned or reset.
- **Kill-switches at every report:**
  - fixed max minute DD > $45k;
  - cumulative fixed net < −$30k;
  - a single lot < −$20k;
  - portfolio daily DD > C0's + 3 pp.
- **Formal review** at ≥ 252 sessions and ≥ 20 lots per pool, expected in about {{v.yearsTo20.B5}} years (B5) to
  {{v.yearsTo20.B4}} years (B4). Retain only if:
  - forward net > 0 at the base, at 10 bps and at 14%;
  - net per lot ≥ 25% of the historical rate;
  - the portfolio daily DD is ≤ C0's + 2 pp.
- **B5 replaces B4 as the default** only with:
  - a positive forward B5 − B4 at all three cost levels;
  - a drawdown no worse than B4's + 1 pp;
  - **≥ 6 forward GDX lots** with positive GDX net, expected in about 3.5 years.
- **Explicit limitation.** A few years of forward data can expose a broken strategy, but cannot confirm the
  historical magnitude. GDX's increment will likely stay "unvalidated" for years.

## Where everything is

| File | Contents |
|---|---|
| `README.md` | commands, reruns, tests, runtime |
| `PROTOCOL.md`, `PROTOCOL_FREEZE.json` | the pre-registered plan and gates, and their hashes |
| `MANIFEST.json` | commit, fingerprints, bounds, every sampled configuration, scenarios |
| `BASELINE_RECONCILIATION.md` | the frozen baselines reproduced exactly |
| `PARAMETER_STABILITY.md` | OAT, joint and per-book neighbourhoods |
| `YEAR_AND_REGIME_ANALYSIS.md` | years, leave-one-year-out, regimes, bootstrap |
| `ETF_ABLATION.md` | leave-one-book-out, B5 − GDX = B4, the B5 − B4 bridge |
| `COST_AND_EXECUTION_STRESS.md` | financing, friction, slippage, stops; cost versus path effects |
| `TRADE_CONCENTRATION.md` | trade ledger, concentration, MAE/MFE, episode lots |
| `DYNAMIC_PORTFOLIO_RISK.md` | C0 / B4 / B5 portfolios, drawdowns, margin proximity |
| `PROSPECTIVE_VALIDATION_CRITERIA.md`, `PROSPECTIVE_CRITERIA_FREEZE.json` | the frozen forward decision criteria and their hash |
| `results/` | every run (JSONL), analysis.json, CSV tables, detail ledgers, logs |
