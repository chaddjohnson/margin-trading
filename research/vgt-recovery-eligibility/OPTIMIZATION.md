# Optimization: targeted sweeps, joint search, walk-forward

Everything here is generated (`results/tables/tables.md`, `results/sweeps/*.csv`, `results/search/<fit>/<family>/stage.json`,
`results/validation/rows.json`, `results/validation/mechanism-rows.json`) under the pre-registered
PROTOCOL.md. Seeds derive from `'recovery-eligibility'`, the fit and the family; every evaluation is
checkpointed (`evaluations.jsonl.gz`, git-ignored, 87 MB) so a stage replays deterministically. Percentages
are quantized to 0.1 point and durations to whole sessions or days.

## 1. Spaces

Six base parameters (X 5–30%, Y 0.1–8%, stop 3–15%, hold 3–40 days, L 45–365 sessions, buffer 0–5%) plus
the mechanism parameters: latch U 0–30%, episode reset 20–100%, reset policy {0, 1}, expiry 20–500; trough T
1–30%, F 0–80%; dual X2 3–25%, Y2 0.1–10%; post-exit P 1–20%, W 5–250. Families: `base` (the control),
`latch`, `trough`, `dual`, `postExit`, and the combinations `latchPostExit` and `troughPostExit`.

## 2. Targeted sweeps (Set 2 frozen, full common run, in-sample)

6,707 lattice points (`npm run recovery-eligibility -- sweeps`, 78 s on 9 workers):

| Mechanism | Lattice points | Identical to Set 2 | Dominating Set 2 (net ≥, DD ≤) | Within the ceiling | With a profitable 2023 trade | Best net within the ceiling | Best net with a profitable 2023 trade |
|---|---:|---:|---:|---:|---:|---|---|
| latch | 1,496 | 536 | 36 | 719 | 708 | U 20.0% reset 60% any-close (expiry irrelevant): $158,807 / $21,183 (2023: 2022-12-28, +$8,177) | same |
| trough | 4,500 | 648 | 261 | 4,500 | 294 | T 17.0% F 0 reset 50% flat-only or 60% any-close: $170,748 / $21,183 (2023: 2023-01-18, +$20,117) | same |
| dual | 360 | 62 | 0 | 203 | 101 | X2 ≥ 19% Y2 10% (= Set 2): $150,630 / $21,183 | X2 11.0% Y2 2.0%: $140,992 / $30,468 |
| postExit | 351 | 93 | 70 | 351 | 19 | P 9.0% W 60–120: $183,044 / $19,331 | P 7.0% W 60: $176,943 / $19,705 (2023: 2023-03-13, +$19,542) |

Shape of each sweep (`results/sweeps/<mechanism>.csv`):

- **postExit** is a smooth two-parameter surface: P 8–9% gives $178–183k at $19.0–19.3k for every W ≥ 45;
  P 7% gives $174–177k; P ≤ 5% is below Set 2 (the pullback arms into the next leg down); P ≥ 10% drops to
  $156k (fewer continuation trades) and from 12% equals Set 2. W only matters below 45 sessions.
- **trough** is a one-trade cliff: every row's difference from Set 2 is the 2023 trade, and only T 16–18%
  (with any reset ≥ 60% at any close, or any reset with the flat-only policy) produces the January 18 entry
  that holds to August; T 15% enters January 12 and loses $1,280; T 10% enters December 16 and loses
  $4,047; T ≥ 19% never enters. F adds nothing.
- **latch** is the A/E picture of COUNTERFACTUALS.md: U 20% / reset 60% is the single setting that adds the
  December 28 entry without the 2022 re-entries (+$8,177); every U with reset ≥ 70% is the L 365 result or
  worse.
- **dual** never dominates Set 2.

## 3. Joint search (each family, each fit) and walk-forward

28 stages × (Sobol 4,096 + 2 × 60 × 128 NSGA-II offspring), 515,155 unique evaluations in total (5.6 min of stage
runtime on 9 worker threads; `stage.json` per stage records the picks, the Pareto front, the hypervolume path and the random
seeds). Picks per PROTOCOL.md section 3.4; `base` is the control optimized with the same budget.

Validation of each fold's picks on its validation window (continuous run from 2017-06-15, attributed to the
window; entries = trades entered in the window):

| Family | Policy | 2020–2021 | 2022 | 2023 | Stitched | Worst validation DD | Wins vs base |
|---|---|---:|---:|---:|---:|---:|---:|
| Set 2 (frozen; in-sample on all three windows) | — | +$57,097 (3e) | +$27,337 (7e) | +$0 (0e) | +$84,435 | $17,994 | — |
| base | balanced | +$35,300 (30e) | −$34,919 (26e) | +$0 (0e) | +$381 | $51,345 | — |
| latch | balanced | +$35,300 (30e) | −$34,919 (26e) | +$6,034 (0e) | +$6,415 | $51,345 | 1/3 |
| trough | balanced | +$28,528 (35e) | −$34,938 (26e) | +$0 (0e) | −$6,410 | $51,372 | 0/3 |
| dual | balanced | +$4,538 (28e) | −$42,960 (27e) | +$0 (0e) | −$38,422 | $54,883 | 0/3 |
| postExit | balanced | +$28,184 (22e) | −$23,763 (14e) | −$55 (1e) | +$4,366 | $43,775 | 1/3 |
| latchPostExit | balanced | +$24,129 (34e) | −$7,579 (12e) | −$1,766 (1e) | +$14,784 | $47,626 | 1/3 |
| troughPostExit | balanced | +$27,285 (33e) | −$24,318 (13e) | +$0 (0e) | +$2,967 | $43,082 | 1/3 |

Median of each family's top-10 picks: base −$11,914, latch +$5,130, trough −$11,446, dual −$37,784, postExit
−$609, latchPostExit −$9,617, troughPostExit +$2,733 (stitched). The maxNet and lowDd policies are in
`tables.md`; none changes the picture.

### Credit rule (PROTOCOL.md section 3.5)

| Family | Balanced wins vs base | Stitched (family / base) | Worst DD (family / base) | Median-of-10 stitched (family / base) | Credited |
|---|---:|---|---|---|---|
| latch | 1/3 | +$6,415 / +$381 | $51,345 / $51,345 | +$5,130 / −$11,914 | no |
| trough | 0/3 | −$6,410 / +$381 | $51,372 / $51,345 | −$11,446 / −$11,914 | no |
| dual | 0/3 | −$38,422 / +$381 | $54,883 / $51,345 | −$37,784 / −$11,914 | no |
| postExit | 1/3 | +$4,366 / +$381 | $43,775 / $51,345 | −$609 / −$11,914 | no |
| latchPostExit | 1/3 | +$14,784 / +$381 | $47,626 / $51,345 | −$9,617 / −$11,914 | no |
| troughPostExit | 1/3 | +$2,967 / +$381 | $43,082 / $51,345 | +$2,733 / −$11,914 | no |

**No family is credited.** The dominant fact is the one the two previous programs found: a joint
optimization of this architecture on 2017–2019 or 2017–2021 data selects shallow thresholds (X 5–6%, 4%
stops) that lose $24–43k in 2022, whatever mechanism is added. The mechanisms neither cause nor cure that,
and the fold trained through 2022 (fold3) enters 2023 only with the latch family (+$6,034, the December 28
entry stopped in March).

## 4. Mechanism-only walk-forward (Set 2 frozen; `npm run recovery-eligibility -- mechanism-walk-forward`)

The fairer question for a mechanism added to a frozen base: choose only the mechanism's parameters on each
training window (from the sweep lattices, policies as above) and validate. Set 2 is itself in-sample on
every window here, which is why it is the reference, not a competitor.

| Mechanism (Set 2 frozen) | Policy | 2020–2021 | 2022 | 2023 | Stitched | Training picks (fold1; fold2; fold3) |
|---|---|---:|---:|---:|---:|---|
| Set 2 | frozen | +$57,097 (3e, DD $17,994) | +$27,337 (7e, DD $14,038) | +$0 | +$84,435 | — |
| latch | maxNet = balanced = lowDd | +$57,097 (3e) | −$17,040 (16e, DD $46,104) | +$6,003 (0e) | +$46,060 | U 0% reset 90% flat-only expiry 120; same; U 20% reset 60% expiry 60 |
| latch | median of top 10 | +$57,097 | +$5,148 | +$6,003 | +$68,249 | |
| trough | maxNet = balanced = lowDd | +$57,097 (3e) | +$27,337 (7e) | +$0 | +$84,435 | T 1.0% reset 50% (inert) on every fold |
| trough | median of top 10 | +$57,097 | +$27,337 | −$88 | +$84,347 | |
| dual | balanced | +$47,884 (11e, DD $29,674) | +$25,945 (8e) | +$0 | +$73,829 | X2 3.0% Y2 10%; X2 18% Y2 10%; X2 18.5% Y2 10% |
| dual | median of top 10 | +$61,524 | −$20,672 | +$0 | +$40,852 | |
| postExit | maxNet = balanced | +$54,711 (5e, DD $24,115) | +$23,074 (9e, DD $17,224) | −$1,637 (1e) | +$76,148 | P 6% W 45; P 9% W 60; P 9% W 180 |
| postExit | lowDd | +$78,003 (6e, DD $19,331) | +$22,455 (9e, DD $17,224) | +$0 | +$100,458 | P 9% W 60; P 8.5% W 60; P 16% W 250 |
| postExit | median of top 10 | +$58,989 | +$21,995 | +$0 | +$80,984 | |

- **trough:** on every training window the best lattice point is an inert one (T 1.0% at a 50% reset, which
  equals Set 2). The T 17% that captures 2023 is never chosen by data that ends before 2023; its $20,117 is a
  single-event fit.
- **latch:** the training windows prefer the eligibility latch (U 0%), which then loses $17,040 in 2022.
- **postExit:** the picks are stable across folds (P 6–9%, W 45–180) and the mechanism is roughly neutral
  out of sample: the lowDd policy is +$16,023 above Set 2 (it adds the 2019-08-05 and 2020-10-28 trades),
  the maxNet policy −$8,287 (a 6% pullback on fold1 is slightly worse than 9%), and 2022 costs $4–5k. It
  does not trade 2023 under any fold's pick.
- **dual:** worse than Set 2 under every policy.

## 5. Sensitivity of the finalists (`results/finalists/finalists.md`)

One-parameter probes (−5…+5 grid steps of each parameter; "stability" = share of probes within 20% of the
net and under the ceiling): Set 2 97%, D1 (P 9% / W 60) 85%, D2 (P 8.5%) 87%, D3 (P 7%) 96%, B1 (T 17%) 89%,
A1 (U 20%) 91%, BD1 90%, the joint postExit picks 80–85%, L 365 23%. The post-exit plateau (P 7–9%, W ≥ 45) is
wide; the trough optimum (T 16–18%) is a one-trade ridge whose neighbours at 15% and 19% give Set 2 ± $1k.
Next-open fills and 8%/14% interest move every finalist's net by under $1,000 and ±$9–10k respectively
without changing any ranking (STRATEGY_COMPARISON.md).

## 6. Multiple-testing record

4 single mechanisms + 2 combinations + the base control = 7 architectures; 1 predeclared counterfactual
grid of 44 settings plus an amendment of 66; 6,707 sweep points; 28 joint stages with 515,155 unique
candidate vectors; 129 mechanism-walk-forward rows; 34 finalists probed with 1,712 neighbours. Every
out-of-sample figure above is the descendant of this search, 2023 was the inspected problem and
2024–2025 was examined by the earlier programs: no number in this directory is an untouched holdout.
