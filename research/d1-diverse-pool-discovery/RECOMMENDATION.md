# Recommendation — diverse-d1 (2026-10-26)

**Written for:** the decision-maker choosing what, if anything, to forward-test.

## Decision

**Retain B5 as the leading candidate and B4 as the default. Adopt nothing from this study for forward testing.**

- **Nothing may be nominated: no selection procedure passed the walk-forward procedure gate (GP).**
  - The neighbourhood procedure J picked pools that beat random controls on validation P&L in both folds (70th and
    84th percentile). In 2022–2023, though, its pick drew down $48,269, above the predeclared $45,000 limit.
  - The temporal procedure T was below the control median in both folds.
  - The peak control Q also failed to persist.
  - Under the frozen rules, neither J nor T may nominate from the final round.
- **Even without GP, the final round found no primary-eligible finalist.**
  - Each of the 15 unseeded finalists beat B5's smoothed training P&L in the $100k pool, except one.
  - Every one failed G7: in the 20% portfolio, each ends below what B5 earns for the same borrowing.
  - The six finalists that pass every gate come from the arms seeded with B5 and are B5 re-tuned or B5 without VGT.
    They carry the label "seeded from inspected benchmarks — start not walk-forward testable", and B5 is already the
    candidate.
- **No configuration of this study was evaluated on 2024–2026.**

## What this does and does not mean

- **It does not show that B5 or B4 will earn their historical returns.** They are inspected comparators. Their
  vectors were chosen on data covering every year tested here, so beating or failing to beat them in training says
  little about the future. Historical CAGR is not an expected IRR.
- **It does not show that no better D1 pool exists.** It shows that this search found none that its preregistered
  rules can distinguish from luck, and none that beats B5's borrowing efficiency on training. The searches were
  broad: 47,032 configurations per final arm, every symbol ≥ 1,026 times.
- **It does show something about the selection methods.** Neither smoothing over parameter neighbourhoods (J) nor
  penalising year-concentration (T) produced picks that held up on the next 1.5–2 years in these folds. The
  validation P&L of every pick came largely from a single half-year or year:
  - fold-a's J pick earned +$14,703 in 2020H2 and −$944 in 2021;
  - fold-b's lost $27,579 in 2022 and earned $33,041 in 2023.

  Two folds on inspected years cannot certify a method. They can and did stop these two.

## What would change the recommendation

The protocol forbids "one more look" (§22). A new question needs a new protocol. Two inputs could reopen it:
- genuinely new data: forward bars after 2026-10-13, for B5/B4 and any pre-registered challenger;
- a method whose selection persists on folds it has not seen.

Forward-testing B5 against B4 on new data remains the most informative next step for the strategy decision.

## Limitations that apply to every figure

- **Dividends:** lots are price-only, and omission bounds at 1/3/6% replace issuer histories, since no download was
  authorised. The portfolio core receives verified VOOG/VGT distributions.
- **Costs:** 0/2/5/10 bps per side are tested, with 5 bps as the principal case; slippage beyond that is not modelled.
- **Capacity:** many finalists are "capacity-unverified" at portfolio scale.
- **Brokerage:** the Vanguard 30-day no-loan-value rule is not modelled ("brokerage-constraint pending").
- **Evidence grade:** the walk-forward folds are E2 (inspected years); the final round is E1 (training only).
