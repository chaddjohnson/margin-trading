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
- **Protocol:** `PROTOCOL.md`, frozen at `{{v.protocolOriginal}}` before any new run. Amendment A1 corrects a rationale
  sentence and changes no rule; the head is `{{v.protocolHead}}`.
- **Baseline:** {{v.baselineChecks}} checks.
- **Runs:** 623 stored, plus the prior audit's 1,755 records, reused read-only.

## Headline

{{t.headline}}

## The three conclusions

### (a) Does standalone VGT D1 have plausible historical profitability? — **{{v.decision.a}}**

{{t.decisionA}}

**For:**
- **Profitable everywhere tested:**
  - all 32 OAT points;
  - all 64 matched and all 128 joint 8-D neighbours;
  - every one of the 19 cost and fill scenarios, down to {{v.cost.S.C3}} under C3;
  - above C0 in the portfolio in every cost scenario (by at least {{v.cost.S.minInc}}, under C3);
  - above C0 in every neighbour as well, but by as little as {{v.d.S_joint_8_D_both_seeds.incMin}} (joint) and
    {{v.d.S_matched_8_D_both_designs.incMin}} (matched).
- **At the frozen parameters, losses were small.** Every stop exit was profitable, the losers were small maximum-hold
  exits, and the worst lot was {{v.S.worst}}.
  - That is not a bound. The neighbours' worst lot reaches {{v.d.S_joint_8_D_both_seeds.worstLot}}, and the worst
    intraday excursion against a lot was {{v.S.worstMae}}.
  - D1 has no protective stop.

**Against: the evidence is thin.**
- **Few lots:** {{v.S.lots}} funded lots in about 9.3 eligible years (W2).
- **Concentration:** the top 3 lots are {{v.S.top3}} of net (W1). 2020 is {{v.S.y2020share}}, and 2020 + 2025 are
  {{v.S.top2Share}}.
- **Idle years:** no lot was entered in 2023 or 2024.
- **A sharp frozen point:** the parameters sit at the top of their own neighbourhood. The median 8-D neighbour earns
  about {{v.d.S_joint_8_D_seed_1.ret}} of the frozen net, and none of the 64 matched neighbours beats it.

**Plan on roughly {{v.d.S_joint_8_D_seed_1.median}} rather than {{v.S.fixedNet}} as an in-sample central figure.**
Even that is optimistic.

### (b) Is standalone behaviour more robust than pooled allocation on comparable tests? — **No.**

**On the matched tests the pools are more robust:**
- **Against B5:** {{v.matched.B5.tally}} → {{v.matched.B5.verdict}}.
- **Against B4:** {{v.matched.B4.tally}} → {{v.matched.B4.verdict}}.
- **Without item b6:** {{v.matched.B5.withoutB6}} / {{v.matched.B4.withoutB6}}.
- **Matched means:** the same 64 VGT parameter vectors, the same 32 OAT points, the same cost scenarios
  (`PARAMETER_STABILITY.md`).

**What the matched tests show:**
- **The fragility is in VGT's own parameters.**
  - S keeps a median {{v.d.S_matched_8_D_both_designs.ret}} of its frozen net when VGT's eight parameters move
    together.
  - The pools keep {{v.d.B4_8_D_VGT_book_only.ret}} (B4) and {{v.d.B5_8_D_VGT_book_only.ret}} (B5).
- **Why the pools look steadier: dilution.** Their other books are unperturbed.
- **Why the pools look steadier: displacement.** When VGT's changes free the slot, other books often fill it. The
  median "other books" change is positive.
- **VGT's own lot paths are equally fragile in both structures** (a post hoc, supplementary diagnostic, amendment A1).
  About 5–8% of VGT's lots survive unchanged, and about half keep their entry session.
- **Read the tally with the dilution caveat.**
  - Five of the eight items (b1–b4, b6) are diluted by construction: the pools' other books are not perturbed.
  - On the three less-diluted items (b5, b7, b8), the count is {{v.matched.B5.lessDiluted}} and
    {{v.matched.B4.lessDiluted}}. This is a post hoc reading.
  - The predeclared verdict stands. It is best read as: perturbing VGT's parameters moves the pools less, largely
    because VGT holds only part of their slot.
- **The bottom line.** Standalone VGT avoids slot competition, but it does not avoid D1's own sequence effects: entry,
  the net-profit stop, re-entry and post-exit continuation. Without other books it also has no buffer against them.

**Separately: system-level complexity (not part of (b)).**
- **What the joint stresses keep.** Perturbing all 32/40 pooled parameters together keeps only about 47% of each pool's
  frozen net. B5's portfolio drawdown advantage then disappears (median {{v.d.B5_system_level_joint_40_D_seed_1.daily}},
  {{v.d.B5_system_level_joint_40_D_seed_1.daily35}} above 35%).
- **What S's own joint 8-D stress keeps.** About 70% of its frozen net, with a median drawdown of
  {{v.d.S_joint_8_D_seed_1.daily}}.
- **How to read the gap.** It reflects how many more parameters a pool has to get wrong. It is **not** evidence that
  pooling is intrinsically less stable per parameter, and the matched tests say the opposite.

### (c) Does the evidence merit prospective observation, or live deployment? — **{{v.decision.c}}**; live deployment is not concluded

S meets the predeclared conditions:
- (a) is plausible (though thin);
- there is no accounting flag;
- its matched-neighbourhood median daily drawdown ({{v.c.matchedDaily}}) is within C0 + 2 pp ({{v.c.limit}}).

No historical audit can establish live deployment. That would need forward evidence and a review of broker mechanics
(below).

## Overall outcome (PROTOCOL.md §11): **{{v.decision.overall}}**

{{t.decisionRules}}

**Why "B5 preferable" failed: one condition.**
- **The condition.** B5's own-neighbourhood median daily drawdown must be at most S's + 1.0 pp.
- **Seed 1 (the rule).** B5 is {{v.in.b5Daily}} against S's {{v.in.sDaily}}, a gap of {{v.in.gap}}. The condition fails
  by {{v.in.margin}}.
- **Seed 2 (a reported sensitivity, not the rule).** The gap is larger ({{v.s2.b5Daily}} against {{v.s2.sDaily}},
  {{v.s2.gap}}), so seed 2 points the same way.
- **Still a close call.** The seed-1 margin is within seed-to-seed variation: B5's median moves {{v.seedShift.B5}}
  between the two seeds.
- **Every other B5 condition held.**
  - Wealth at the frozen point: {{v.in.b5IncFrozen}} against {{v.in.sIncFrozen}}.
  - Wealth at the own-neighbourhood medians: {{v.in.b5IncNbhd}} against {{v.in.sIncNbhd}}.
  - S is not more robust on matched tests.

**Why "standalone preferable" failed:**
- the matched tests favour the pools;
- S's capital efficiency is lower ({{v.S.perMillion}} against {{v.B5.perMillion}} of fixed net per $1M borrowing
  dollar-days).

### The predeclared warning flags

{{t.flags}}

## Where absolute returns, capital efficiency and risk diverge

| Dimension | Leader on this history | Note |
|---|---|---|
| Absolute and incremental wealth | **B5**, at the frozen point and at its own-neighbourhood median | B4 ≈ S at their own-neighbourhood medians ({{v.d.B4_system_level_joint_32_D_seed_1.inc}} against {{v.d.S_joint_8_D_seed_1.inc}}) |
| Capital efficiency (per borrowed dollar-day) | **B5**, then B4, then S | S has the best profit per lot but the worst profit per day of borrowing |
| Robustness to VGT's own parameters (matched) | **the pools** | dilution and slot refilling, not a better VGT book |
| Drawdown at the frozen point | **B5** ({{v.B5.daily}}), then S ({{v.S.daily}}), C0 ({{v.C0.daily}}), B4 ({{v.B4.daily}}) | B5's depth survives any one book's 8-D perturbation, but not all 40 parameters together |
| Drawdown under each one's own full parameter uncertainty | **S** (median {{v.d.S_joint_8_D_seed_1.daily}}; {{v.d.S_joint_8_D_seed_1.daily35}} > 35%) | B5 {{v.d.B5_system_level_joint_40_D_seed_1.daily}} / {{v.d.B5_system_level_joint_40_D_seed_1.daily35}}; B4 {{v.d.B4_system_level_joint_32_D_seed_1.daily}} / {{v.d.B4_system_level_joint_32_D_seed_1.daily35}}. This compares 8-D with 32/40-D, which is not like-for-like; on the matched b8 the pools lead |
| Trade and year concentration | **B5**, then B4 | S: top-3 lots {{v.S.top3}}, two idle years |
| Simplicity | **S**: 8 parameters, one book, no slot-sequence dependence | but a single-sector book, adding to the core's VGT |
| Exposure to VGT / Vanguard 30-day rule | **the pools**, which are less VGT-concentrated | every S lot is a new VGT purchase |

## The strongest evidence against this conclusion

**Against "both" (for B5 alone).**
- B5 beats S on wealth, efficiency, matched robustness, concentration and the in-sample bootstrap: B5 − S is positive
  {{v.boot.B5S.phrase}}.
- The only condition B5 failed was a drawdown comparison against S. That comparison sets B5's 40-D own-neighbourhood
  against S's 8-D one, and it missed by {{v.in.margin}} on the deciding seed.
- A reader who discounts that cross-dimensional drawdown comparison would call this "B5 preferable".

**Against "both" (for S alone).**
- **Under each one's own full parameter uncertainty, S's drawdown is steadier.** About one neighbour in ten exceeds
  35%, against about half for each pool. Two qualifications:
  - This compares an 8-D with a 32/40-D neighbourhood, which this report says is not like-for-like.
  - On the matched test (b8) the opposite holds. VGT perturbations raise S's median drawdown by
    {{v.matched.B5.b8S}} and B5's by {{v.matched.B5.b8P}}, and B5's VGT-only neighbours never exceed 35%
    ({{v.d.B5_8_D_VGT_book_only.daily35}}).
- **S's frozen portfolio lowers C0's drawdown on both measures,** but that too depends on S's own exact parameters.
  - Its median neighbour is at or slightly above C0: daily {{v.d.S_joint_8_D_seed_1.daily}} against 33.89%, minute
    {{v.d.S_joint_8_D_seed_1.minute}} against 35.76%.
  - For {{v.d.S_joint_8_D_both_seeds.r3Share}} of its joint neighbours, the worst episode becomes the 2022 bear market.
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
   - **S:** about {{v.d.S_joint_8_D_seed_1.median}} of fixed net on $100k over this history, about
     {{v.d.S_joint_8_D_seed_1.inc}} over C0 in the portfolio, and about a {{v.d.S_joint_8_D_seed_1.daily}} max daily
     drawdown.
   - **B5:** about {{v.d.B5_system_level_joint_40_D_seed_1.median}}, {{v.d.B5_system_level_joint_40_D_seed_1.inc}} and
     {{v.d.B5_system_level_joint_40_D_seed_1.daily}}.
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
