# Final assessment — B4/B5 frozen-strategy robustness audit

**Scope and status:**
- An independent diagnostic of two frozen pools, B4 (`All-lowDd`) and B5 (`All-lowDd+GDX`), on the inspected
  2016-01-04 → 2026-10-13 history.
- Nothing was optimised, selected or promoted.
- No frozen file was changed.
- The prospective B4/B5 freeze still verifies.

**Record:**
- Protocol: `PROTOCOL.md`, sha256 `739134130ef2f058303422dda0cb90abff16372c8bdb19bb8757dbfabd2d95bf`, frozen before any audit run.
- Runs: 1,755, all stored and analysed.
- Baseline: 74/74 checks passed.

## Executive summary

- **Both pools are real in-sample effects, but their frozen figures are an isolated peak.**
  - Every one of the 128 jointly perturbed configurations of each pool (two seeds of 64; 256 in all) is profitable, and so is every single-parameter
    change.
  - The typical neighbour earns about half the frozen net (47% B4, 47%
    B5).
  - No neighbour beats the frozen pool.
  - **Gate A flags both.** Expect materially less than the reported $284k / $486k.
- **Costs are not the main risk.** Both pools stay profitable, and above the no-margin core, under every tested
  financing, friction, slippage and stop scenario, up to 18% interest plus 45 bps per side plus 50 bps of stop
  overshoot. Degradation is non-linear: costs change the trade path through D1's net-profit stop.
- **GDX's increment is broad across costs and its own parameters, but narrow across time.**
  - B5 − B4 stays between $172,554 and $205,757 in every cost scenario.
  - Every GDX-parameter variant of B5 still beats frozen B4.
  - It stays positive in all but 0.42% of block-bootstrap resamples.
  - But it comes from 16 GDX trades in about two episodes. The largest year is 2020 ($88,122, 43.6%); the
    2020-crash regime is 48.5%, just under the 50% flag; the top five GDX trades are
    71.7%.
- **Portfolio risk.**
  - The 60/40 VOOG/VGT core alone falls 33.89% (daily) and 35.76% (minute). The 30% objective is
    unattainable on this history with or without an overlay.
  - B4 **adds** drawdown: 34.65% / 37.01%, so the 35% tolerance is exceeded on the minute measure.
  - Frozen B5 **reduces** it: 29.67% / 31.09%. But that reduction depends on the exact frozen
    parameters: the March-2020 slot sequence, and 2022 gains that neighbours do not reproduce. B5's median parameter
    neighbour draws down 35.2%, in most cases in the 2022 bear market.
- **Verdicts:**
  - **B4: Conditional (material fragility).**
  - **B5: Conditional (material fragility).** On the evidence, B5 is the stronger of the two.
  - Neither is rejected. Neither is "retain" without qualification.

## Comparative table

| Measure (2016-01-04 → 2026-10-13, inspected history) | B4 | B5 |
|---|---|---|
| Fixed net / max minute DD | $284,245 / $28,659 | $486,208 / $26,510 |
| Joint neighbourhood median net (÷ frozen); worst | $133,373 (47%); $3,758 | $229,955 (47%); $82,999 |
| Neighbours profitable / beating the frozen net | 100% / 0% | 100% / 0% |
| Fixed net under C1 / C2 / C3 | $195,621 (−31.2%) / $143,892 (−49.4%) / $113,048 (−60.2%) | $387,521 (−20.3%) / $325,495 (−33.1%) / $285,602 (−41.3%) |
| Top year share; top-3 lots share | 2020 (27.4%); 40.7% | 2020 (34.1%); 23.3% |
| Portfolio end equity (C0 $2,279,769) | $3,608,484 (+$1,328,715) | $5,410,977 (+$3,131,208) |
| Portfolio max daily / minute % DD (C0 33.89% / 35.76%) | 34.65% / 37.01% | 29.67% / 31.09% |
| Joint-neighbour median portfolio daily % DD; share > 35% | 35.3%; 56% | 35.2%; 55% |

## Pre-registered gates (thresholds unchanged)

| Pool | Gate | Measured | Outcome |
|---|---|---|---|
| B4 | A Local stability | 100% of 64 joint samples profitable; median 46.9% of frozen (thresholds 75% / 50%) | **FLAG** |
| B4 | B Concentration | top year 27.4%; top-3 lots 40.7% (threshold 50%) | no flag |
| B4 | D Portfolio risk | max daily 34.86% / minute 37.21% over base, C1–C3; vs C0 +0.75 pp daily, +1.25 pp minute | D35 **FLAG**; D30 **FLAG**; D+ **FLAG** |
| B4 | E Costs | moderate stresses keep net > 0 and beat C0; C1 net −31.2%, net÷DD −23.1% (threshold 50%) | no flag |
| B5 | A Local stability | 100% of 64 joint samples profitable; median 47.3% of frozen (thresholds 75% / 50%) | **FLAG** |
| B5 | B Concentration | top year 34.1%; top-3 lots 23.3% (threshold 50%) | no flag |
| B5 | D Portfolio risk | max daily 30.93% / minute 33.29% over base, C1–C3; vs C0 −4.22 pp daily, −4.68 pp minute | D35 no flag; D30 **FLAG**; D+ no flag |
| B5 | E Costs | moderate stresses keep net > 0 and beat C0; C1 net −20.3%, net÷DD −23.9% (threshold 50%) | no flag |
| B5 | C GDX increment | B5 − B4 > 0 under r14, f10, f15, s25, C1 (min fixed $191,900, min portfolio $1,435,449); largest year 43.6%, largest regime 48.5% (threshold 50%) | no flag |
| both | F Accounting | baseline 74/74 checks; recomputed % DD = engine; minute ≥ daily DD in all 1755 runs; B5 − GDX = B4; bridge residual 2.33e-10 | no flag |

## Evidence for B4

**Positive:**
- **Profitable everywhere nearby.** 100% of neighbours (OAT and joint) are profitable, and the worst joint neighbour
  still earns $3,758.
- **Robust to moderate costs.** C1 leaves $195,621 (−31.2%). Every cost scenario stays above C0 in the portfolio.
- **Not dominated by one year.** The top year is 2020 (27.4%), and every leave-one-year-out total is above $200k.
- **Wealth.** +$1,328,715 of incremental wealth over C0.

**Negative:**
- **Isolated peak.** The joint median is 47% of frozen (gate A flag).
- **Concentrated in VGT.** The VGT book provides 58.6% of net, and three VGT trades 40.7%.
- **VGT's increment is mostly displacement.** The VGT book's fixed-pool increment is only
  +$20,762, because its slot time would otherwise fund other books' lots. Its portfolio increment is
  negative (−$93,316): removing VGT *raises* B4's end equity.
- **Adds drawdown to the core.** 34.65% daily / 37.01% minute against C0's 33.89% /
  35.76% (D35, D30 and D+ flags). The March-2020 KRE lots deepen the crash drawdown by about 3 pp. Costs do
  not reduce that risk: under C3, B4 still draws down 34.86% for only +$350,201 of incremental wealth.
- **The most cost-sensitive.** C2 −49% and C3 −60% of fixed net.

**Disposition: Conditional (material fragility).**
- Not rejected: its incremental wealth is large and positive in every scenario, and its excess drawdown over C0 is
  small (+0.75 pp daily, +1.25 pp minute).
- But it buys that wealth with more total-portfolio risk, in a book mix whose largest component (VGT) duplicates the
  core.

## Evidence for B5

**Positive:**
- **Profitable everywhere nearby.** All of it is, and the worst joint neighbour earns $82,999.
- **Robust to costs.** C1 leaves $387,521 (−20.3%), and C3 $285,602 (−41.3%).
- **Diversified across books.** Top-3 lots are 23.3%, and GDX 42.2%, VGT 22.6% and
  KRE 21.6%.
- **A robust GDX increment** (cost-, GDX-parameter- and bootstrap-robust), with an economic rationale: gold miners
  rallied while equities fell in March 2020 and in 2022–2024.
- **Lower historical drawdown than C0** on both measures, with +$3,131,208 of incremental wealth.
- **Helped in the 2022 bear market** at the frozen parameters, although this is not robust: neighbours made far less
  in 2022 (median $6,178 against $84,884).

**Negative:**
- **Isolated peak.** The joint median is 47% of frozen (gate A flag).
- **A fragile drawdown advantage.**
  - 55% of joint neighbours exceed 35% daily, and the median is 35.2%.
  - For 118 of 128 neighbours, the worst episode is the 2022 bear market. There the frozen pool earned
    $84,884 and the median neighbour only $6,178.
  - D30 flag even at the frozen point: minute 31.09%, and C3 30.93% daily.
- **A thin increment.** The GDX increment rests on 16 lots and about two episodes, with 2020 and the
  2020-crash regime close to the 50% threshold. GDX trades rarely (about 1.7 a year).
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
3. **Block reshuffling of the history.** It is non-positive in only 0.42% of resamples.

**Fragile in two senses:**
1. **Time.** About half the increment comes from four GDX trades in March–April 2020, and most of the rest from the
   2022–2024 gold-miner rally.
2. **Joint perturbation.** With every book's parameters jittered together, B5's portfolio drawdown advantage over B4
   and C0 largely disappears, even though its profit advantage remains (joint median net $229,955 against
   B4's $133,373).

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
- **Formal review** at ≥ 252 sessions and ≥ 20 lots per pool, expected in about 2.0 years (B5) to
  2.5 years (B4). Retain only if:
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
