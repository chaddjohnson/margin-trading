<!-- Rendered by `npm run vgt-robustness -- report` from templates/FINAL_COMPARISON_AND_RECOMMENDATION.md and results/analysis.json; edit the template, not this file. -->
# Final comparison and recommendation: frozen standalone VGT D1 against B4/B5

**Question.** Is the existing, frozen standalone VGT D1 strategy a more dependable way to deploy opportunistic margin
than the B4/B5 shared pools, even with lower historical profit?

**Scope.**
- **Tested:** the only registered VGT D1 phenotype, **VGT-primary** (S). **No VGT lowDd exists**, and none was made
  (`VGT_PHENOTYPE_INVENTORY.md`).
- **Not done:** nothing was tuned, searched, promoted or written to `config/`.
- **Evidence status:** every figure is from the 2016-01-04 → 2026-10-13 history already inspected while these
  strategies were chosen. **None of it is out-of-sample evidence.**

**Record.**
- **Protocol:** `PROTOCOL.md`, frozen at `1545f48d890f69f89668c58fee18731da128af0c98c487108639433daaa7a31a` before any new run. Amendment A1 corrects a rationale
  sentence and changes no rule; the head is `11fccfe77172493697116f4e91dca0bf75d921a4b290903026ae22e4e6d8f444`.
- **Baseline:** 49/49 checks.
- **Runs:** 623 stored, plus the prior audit's 1,755 records, reused read-only.

## Headline

| Measure (inspected 2016-01-04 → 2026-10-13; retrospective) | S: VGT-primary standalone | B4 | B5 |
|---|---:|---:|---:|
| Tunable D1 parameters | 8 | 32 | 40 |
| Fixed $100k: net / max minute DD / funded lots | $176,260 / $19,534 / 21 | $284,245 / $28,659 / 76 | $486,208 / $26,510 / 94 |
| Fixed net per $1M borrowing dollar-days; net per lot | $1,459; $8,393 | $1,822; $3,740 | $2,774; $5,172 |
| Matched 8-D (VGT parameters only): median ÷ own frozen; P10 | 70.1%; 45.6% | 91.5%; 78.0% | 94.9%; 83.1% |
| Own full neighbourhood (S 8-D; pools 32/40-D), seed 1: median net (÷ frozen) | $123,337 (70.0%) | $133,373 (46.9%) | $229,955 (47.3%) |
| Fixed net under C1 / C3 (Δ) | $125,033 (−29.1%) / $97,586 (−44.6%) | $195,621 (−31.2%) / $113,048 (−60.2%) | $387,521 (−20.3%) / $285,602 (−41.3%) |
| Top year (share); top-3 lots share | 2020 (42.7%); 65.7% | 2020 (27.4%); 40.7% | 2020 (34.1%); 23.3% |
| Portfolio end equity (C0 $2,279,769) / vs C0 | $2,958,026 / +$678,257 | $3,608,484 / +$1,328,715 | $5,410,977 / +$3,131,208 |
| Portfolio max daily / minute % DD (C0 33.89% / 35.76%) | 32.78% / 35.21% | 34.65% / 37.01% | 29.67% / 31.09% |
| Own full neighbourhood, seed 1: median vs C0; median daily % DD; share daily > 35% | +$424,217; 34.1%; 11% | +$478,729; 35.3%; 56% | +$1,019,518; 35.2%; 55% |
| Portfolio wealth vs C0 per $1M borrowing dollar-days | $2,992 | $3,739 | $5,158 |

## The three conclusions

### (a) Does standalone VGT D1 have plausible historical profitability? — **plausible but thinly evidenced**

| Condition (PROTOCOL.md §11a) | Holds |
|---|---|
| baseFixedPositive | yes |
| c1c2c3FixedPositive | yes |
| pairedProfitable | yes |
| jointProfitable | yes |
| portfolioIncrementalBase | yes |
| portfolioIncrementalC1 | yes |

**For:**
- **Profitable everywhere tested:**
  - all 32 OAT points;
  - all 64 matched and all 128 joint 8-D neighbours;
  - every one of the 19 cost and fill scenarios, down to $97,586 under C3;
  - above C0 in the portfolio in every cost scenario (by at least +$309,560, under C3);
  - above C0 in every neighbour as well, but by as little as +$40,238 (joint) and
    +$129,298 (matched).
- **At the frozen parameters, losses were small.** Every stop exit was profitable, the losers were small maximum-hold
  exits, and the worst lot was −$3,544.
  - That is not a bound. The neighbours' worst lot reaches −$12,987, and the worst
    intraday excursion against a lot was −10.8%.
  - D1 has no protective stop.

**Against: the evidence is thin.**
- **Few lots:** 21 funded lots in about 9.3 eligible years (W2).
- **Concentration:** the top 3 lots are 65.7% of net (W1). 2020 is 42.7%, and 2020 + 2025 are
  69.6%.
- **Idle years:** no lot was entered in 2023 or 2024.
- **A sharp frozen point:** the parameters sit at the top of their own neighbourhood. The median 8-D neighbour earns
  about 70.0% of the frozen net, and none of the 64 matched neighbours beats it.

**Plan on roughly $123,337 rather than $176,260 as an in-sample central figure.**
Even that is optimistic.

### (b) Is standalone behaviour more robust than pooled allocation on comparable tests? — **No.**

**On the matched tests the pools are more robust:**
- **Against B5:** S better 0, B5 better 7, ties 1 → pool more robust on matched tests.
- **Against B4:** S better 1, B4 better 7, ties 0 → pool more robust on matched tests.
- **Without item b6:** S better 0, B5 better 6, ties 1 / S better 1, B4 better 6, ties 0.
- **Matched means:** the same 64 VGT parameter vectors, the same 32 OAT points, the same cost scenarios
  (`PARAMETER_STABILITY.md`).

**What the matched tests show:**
- **The fragility is in VGT's own parameters.**
  - S keeps a median 70.1% of its frozen net when VGT's eight parameters move
    together.
  - The pools keep 91.5% (B4) and 94.9% (B5).
- **Why the pools look steadier: dilution.** Their other books are unperturbed.
- **Why the pools look steadier: displacement.** When VGT's changes free the slot, other books often fill it. The
  median "other books" change is positive.
- **VGT's own lot paths are equally fragile in both structures** (a post hoc, supplementary diagnostic, amendment A1).
  About 5–8% of VGT's lots survive unchanged, and about half keep their entry session.
- **Read the tally with the dilution caveat.**
  - Five of the eight items (b1–b4, b6) are diluted by construction: the pools' other books are not perturbed.
  - On the three less-diluted items (b5, b7, b8), the count is B5 better 3, S better 0, ties 0 and
    B4 better 2, S better 1, ties 0. This is a post hoc reading.
  - The predeclared verdict stands. It is best read as: perturbing VGT's parameters moves the pools less, largely
    because VGT holds only part of their slot.
- **The bottom line.** Standalone VGT avoids slot competition, but it does not avoid D1's own sequence effects: entry,
  the net-profit stop, re-entry and post-exit continuation. Without other books it also has no buffer against them.

**Separately: system-level complexity (not part of (b)).**
- **What the joint stresses keep.** Perturbing all 32/40 pooled parameters together keeps only about 47% of each pool's
  frozen net. B5's portfolio drawdown advantage then disappears (median 35.2%,
  55% above 35%).
- **What S's own joint 8-D stress keeps.** About 70% of its frozen net, with a median drawdown of
  34.1%.
- **How to read the gap.** It reflects how many more parameters a pool has to get wrong. It is **not** evidence that
  pooling is intrinsically less stable per parameter, and the matched tests say the opposite.

### (c) Does the evidence merit prospective observation, or live deployment? — **merits prospective observation**; live deployment is not concluded

S meets the predeclared conditions:
- (a) is plausible (though thin);
- there is no accounting flag;
- its matched-neighbourhood median daily drawdown (34.09%) is within C0 + 2 pp (35.89%).

No historical audit can establish live deployment. That would need forward evidence and a review of broker mechanics
(below).

## Overall outcome (PROTOCOL.md §11): **both worth parallel observation**

| Rule (PROTOCOL.md §11, overall) | Condition | Seed 1 (the rule) | Seed 2 (sensitivity) |
|---|---|---|---|
| B5 preferable | wealthFrozen | yes | yes |
| B5 preferable | wealthNeighbourhood | yes | yes |
| B5 preferable | drawdown | no | no |
| B5 preferable | notSMoreRobust | yes | yes |
| Standalone preferable | drawdown | yes | yes |
| Standalone preferable | wealthPositive | yes | yes |
| Standalone preferable | sMoreRobust | no | no |
| Standalone preferable | efficiency | no | no |

**Why "B5 preferable" failed: one condition.**
- **The condition.** B5's own-neighbourhood median daily drawdown must be at most S's + 1.0 pp.
- **Seed 1 (the rule).** B5 is 35.17% against S's 34.11%, a gap of 1.06 pp. The condition fails
  by 0.06 pp.
- **Seed 2 (a reported sensitivity, not the rule).** The gap is larger (35.69% against 33.88%,
  1.81 pp), so seed 2 points the same way.
- **Still a close call.** The seed-1 margin is within seed-to-seed variation: B5's median moves 0.52 pp
  between the two seeds.
- **Every other B5 condition held.**
  - Wealth at the frozen point: +$3,131,208 against +$678,257.
  - Wealth at the own-neighbourhood medians: +$1,019,518 against +$424,217.
  - S is not more robust on matched tests.

**Why "standalone preferable" failed:**
- the matched tests favour the pools;
- S's capital efficiency is lower ($1,459 against $2,774 of fixed net per $1M borrowing
  dollar-days).

### The predeclared warning flags

| Configuration | W1 Concentration | W2 Low trade count | W3 Cost fragility | W4 Matched-parameter fragility | W5 Portfolio drawdown | W6 Unmodelled margin | W7 Neighbourhood drawdown |
|---|---|---|---|---|---|---|---|
| S (VGT-primary standalone) | **FLAG** (top year 2020 42.7%; top-3 lots 65.7%) | **FLAG** (21 lots) | no flag (C1 −29.1%; net ÷ DD −23.9%) | no flag (matched 8-D, both designs (64): 100% profitable, median 70.1%; joint 8-D, seed 1 (64): 100% profitable, median 70.0%) | D35 **FLAG**, D30 **FLAG**, D+ no flag (base 32.78% / 35.21%; worst of base/C1–C3 33.98% / 36.24%) | **FLAG** | no flag (matched 8-D, both designs (64): median 34.1%; joint 8-D, seed 1 (64): median 34.1%) |
| B4 | no flag (top year 2020 27.4%; top-3 lots 40.7%) | no flag (76 lots) | no flag (C1 −31.2%; net ÷ DD −23.1%) | no flag (B4: 8-D, VGT book only (32): 100% profitable, median 91.5%); system-level joint: **FLAG** (median 46.9%) | D35 **FLAG**, D30 **FLAG**, D+ **FLAG** (base 34.65% / 37.01%; worst of base/C1–C3 34.86% / 37.21%) | **FLAG** | no flag (B4: 8-D, VGT book only (32): median 34.0%); system-level joint: **FLAG** (35.3%) |
| B5 | no flag (top year 2020 34.1%; top-3 lots 23.3%) | no flag (94 lots) | no flag (C1 −20.3%; net ÷ DD −23.9%) | no flag (B5: 8-D, VGT book only (32): 100% profitable, median 94.9%); system-level joint: **FLAG** (median 47.3%) | D35 no flag, D30 **FLAG**, D+ no flag (base 29.67% / 31.09%; worst of base/C1–C3 30.93% / 33.29%) | **FLAG** | no flag (B5: 8-D, VGT book only (32): median 29.7%); system-level joint: **FLAG** (35.2%) |

## Where absolute returns, capital efficiency and risk diverge

| Dimension | Leader on this history | Note |
|---|---|---|
| Absolute and incremental wealth | **B5**, at the frozen point and at its own-neighbourhood median | B4 ≈ S at their own-neighbourhood medians (+$478,729 against +$424,217) |
| Capital efficiency (per borrowed dollar-day) | **B5**, then B4, then S | S has the best profit per lot but the worst profit per day of borrowing |
| Robustness to VGT's own parameters (matched) | **the pools** | dilution and slot refilling, not a better VGT book |
| Drawdown at the frozen point | **B5** (29.67%), then S (32.78%), C0 (33.89%), B4 (34.65%) | B5's depth survives any one book's 8-D perturbation, but not all 40 parameters together |
| Drawdown under each one's own full parameter uncertainty | **S** (median 34.1%; 11% > 35%) | B5 35.2% / 55%; B4 35.3% / 56%. This compares 8-D with 32/40-D, which is not like-for-like; on the matched b8 the pools lead |
| Trade and year concentration | **B5**, then B4 | S: top-3 lots 65.7%, two idle years |
| Simplicity | **S**: 8 parameters, one book, no slot-sequence dependence | but a single-sector book, adding to the core's VGT |
| Exposure to VGT / Vanguard 30-day rule | **the pools**, which are less VGT-concentrated | every S lot is a new VGT purchase |

## The strongest evidence against this conclusion

**Against "both" (for B5 alone).**
- B5 beats S on wealth, efficiency, matched robustness, concentration and the in-sample bootstrap: B5 − S is positive
  in every one of the 5,000 resamples.
- The only condition B5 failed was a drawdown comparison against S. That comparison sets B5's 40-D own-neighbourhood
  against S's 8-D one, and it missed by 0.06 pp on the deciding seed.
- A reader who discounts that cross-dimensional drawdown comparison would call this "B5 preferable".

**Against "both" (for S alone).**
- **Under each one's own full parameter uncertainty, S's drawdown is steadier.** About one neighbour in ten exceeds
  35%, against about half for each pool. Two qualifications:
  - This compares an 8-D with a 32/40-D neighbourhood, which this report says is not like-for-like.
  - On the matched test (b8) the opposite holds. VGT perturbations raise S's median drawdown by
    +1.30 pp and B5's by +0.03 pp, and B5's VGT-only neighbours never exceed 35%
    (0%).
- **S's frozen portfolio lowers C0's drawdown on both measures,** but that too depends on S's own exact parameters.
  - Its median neighbour is at or slightly above C0: daily 34.1% against 33.89%, minute
    36.4% against 35.76%.
  - For 70% of its joint neighbours, the worst episode becomes the 2022 bear market.
- **Fewer parameters.** S needs only 8 parameters to be right rather than 40.
- **B5's thin lead.** B5's lead rests heavily on 16 GDX lots, concentrated in the 2020 crash and the 2022–2024
  gold-miner rally (the prior audit).

**Against observing S at all.**
- S is thin: 21 lots, three of which are two-thirds of net.
- It adds VGT concentration to a VGT-heavy core.
- Every lot meets the Vanguard 30-day restriction.
- It produces about 2.3 lots a year (21 in about 9.3 eligible years), so forward evidence on S accumulates slowly.
  Twenty forward lots would take about nine years at the historical rate.

## Recommendation (prospective observation only; no promotion, no trading instruction)

1. **Change no default.** B4 stays the default and B5 the leading pool unless the user decides otherwise. Nothing here
   promotes S, and no file in `config/` changed.
2. **Observe S in parallel with B5, if the user wants a simpler fallback measured forward.** It requires nothing new
   from the frozen prospective program. By the shadow identity, S's forward trades are exactly the VGT book's virtual
   trades inside the frozen B4/B5 forward runs. The identity covers trade timing and the fixed $100k lots, not
   portfolio-mode lot sizes, which are a share of a different account's equity.
   - The existing forward report does not print them.
   - Reading them out would need a separate, newly frozen, read-only report or protocol, written **before** any
     post-cutoff bar is imported. The prospective B4/B5 freeze must not be edited.
   - This is the user's decision. It was not done here.
3. **Plan on neighbourhood medians, not frozen figures.**
   - **S:** about $123,337 of fixed net on $100k over this history, about
     +$424,217 over C0 in the portfolio, and about a 34.1% max daily
     drawdown.
   - **B5:** about $229,955, +$1,019,518 and
     35.2%.
   - All of these are in-sample and optimistic.
4. **Treat 30% and 35% as historical thresholds, not bounds.** The unleveraged core exceeded 30%. No overlay's median
   neighbour stays clearly below C0, and none of these configurations is a safety certification.
5. **What would change the conclusion (forward evidence only):**
   - forward S lots that keep a positive net through a stress episode;
   - forward B5 drawdowns that track its frozen 29.7% rather than its neighbours' about 35%;
   - whether GDX keeps contributing.

   No historical re-analysis can settle these.

## Limitations

- **One inspected history.** Neighbours, years, regimes and bootstrap resamples reuse it. Nothing is independent
  validation. PBO and the deflated Sharpe ratio are not computed: the trial counts across the earlier VGT searches are
  not consolidated.
- **Small samples.** S has 21 lots. The neighbourhood designs are sensitivity designs (32–128 points), not calibrated
  probabilities.
- **Comparability limits.** Pool retention is diluted by unperturbed books (amendment A1). The 8-D against 32/40-D
  joint comparison is **not** a like-for-like stability measure, and it is labelled as such everywhere.
- **The model.** No margin calls, forced sales, Vanguard 30-day rule, house-requirement changes or quote-level fills are
  modelled. Per-year minute-sampled drawdowns are not reconstructed (whole-run maxima only).
- **One phenotype.** Only VGT-primary was tested, because no other registered VGT D1 phenotype exists.

## Commands I can run

Every command was executed during this study (Node v24.21.0, repository root). The outputs of `fixed`, `portfolio` and
`compare` go to the terminal and to `evaluations/` (git-ignored), never to `research/`.

```bash
# Standalone VGT primary (the only registered VGT D1 phenotype; there is no lowDd)
npm run vgt-robustness -- fixed VGT-primary                  # one $100,000 lot on `all`, 5 bps, 11%: every trade + summary
npm run vgt-robustness -- fixed VGT-primary --cost-bps 10    # the same at 10 bps per side
npm run vgt-robustness -- portfolio VGT-primary              # $300,000 60/40 core, 20% of equity per lot
npm run vgt-robustness -- compare                            # S, B4, B5 and C0 side by side (fixed and portfolio)
npm run app -- allIn-trailingBuy-postExitContinuation VGT all --phenotype primary   # the existing CLI (0 bps, no friction)

# The frozen pools
npm run pools -- fixed B5
npm run pools -- compare B4 B5

# Verification and tests
npm run vgt-robustness -- verify      # read-only inputs, prior audit, prospective freeze, stored records = MANIFEST.json
npm run vgt-robustness -- baseline    # the parity checks (about 45 s); idempotent
npm run pools -- verify               # the existing regression
npm run pools -- forward status       # the prospective freeze still verifies
node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/vgt-standalone-robustness/tests/*.test.ts'
```

`npm run vgt-robustness -- fixed lowDd` is refused: no such phenotype exists.
