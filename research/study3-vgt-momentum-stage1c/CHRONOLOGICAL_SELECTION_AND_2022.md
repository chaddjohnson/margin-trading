# Chronological selection and 2022

Executable S1 account, flat at 2019-12-31; each year's policy sealed with data through the previous year end
(`results/records/develop-*.json`). These are **retrospective forward-selection evaluations**, not out-of-sample tests:
all of 2016–2023 was known, and the rules were designed from 2022's losing trades. The study evaluated 5,114,598
configurations (5,111,641 in development).

| Fold | Training ≤ | Pick (RoD) | Rules | Window | W |
|---|---|---|---|---|---:|
| A | 2019-12-31 | E09 trailing buy × XT two-layer (replace) | B | 2020 | +$23,749 |
| B | 2020-12-31 | E04 CUSUM × XRP retention (replace) | A+B | 2021 | +$18,148 |
| C | 2021-12-31 | E09 × XRP (replace) | A+B+C | 2022 | −$6,415 |
| D | 2022-12-30 | E02 drift × XE exposure trail (replace) | B | 2023 | +$16,186 |

No boundary had consecutive picks differing only in rule parameters; no losing transition exit occurred on Π1. Every
pick sits in a training-only widened part of its box, one at a natural limit: A t2 = 0.005 (declared 0.03–0.25), B
ρ = 1.00 (declared 0.2–0.9; 1 is the natural limit), C ρ = 0.98, D γ = 2.57 (declared 0–2); H's ρ = 0.97 too.

The Π1 chained minute drawdown ($24,193) runs from a peak on 2021-11-22 to a trough on 2022-05-20; Π1-off's ($56,063)
from 2021-12-27 to 2022-10-13 (`paths.md`).

## 2022

- **(a) Fold C, chosen through 2021:** five entries in 2022 (E09 minute rule); four were sold by rule A at a losing
  open (−$10,540 on 2022-02-03, −$78, −$3,650, −$1,487) and the fifth was carried into 2023 (+$6,543 at the transition).
  2022 W −$6,415, window DD $22,004. Π1 sits at the 94th percentile of 2022 results of the random-deep-champion null.
  **(target-year-informed)**
- **(b) Stage 1b's three losing entries** (#11 2022-04-05, #12 2022-07-27, #13 2022-11-11; hindsight counterfactual at
  reference parameters, `results/tables/counterfactuals-2022.md`): A (8 or 15 days) exits all three sooner; C blocks
  #12 and #13 but re-enters later, so C alone makes 2022 worse (−$38,748); B at 10 sessions leaves them and 2022
  unchanged (it changes 2023: +$11,049 → +$14,343); A15+C
  gives −$6,193 (Σ +$31,482, DD $15,699). **(target-year-informed)**
- **(c) Forbidden-for-selection upper bounds** (`results/tables/diag-2022.md`): inside develop-D/H, where 2022 is
  development data, the median center-feasible point still lost $6,719–$10,567 in 2022 under every mask (A+B and A+B+C
  masks have the highest medians); the best feasible points reach +$7,332 to +$18,546.
- **(d) Attribution:** the 2022 improvement over Π1-off (+$40,351) comes from avoiding two losing re-entries and
  cutting one loss short — timing via A×B, not non-participation (Π1 was long at 69% of 2022 closes) and not one
  single trade; on perturbed picks the median 2022 is −$22,053. **(target-year-informed)** The predeclared statement
  "2022 improved with trend retention" holds in one retrospective, target-year-informed replay (item (d); the primary
  protection statement over perturbed pairs does not, 33.6%).
- **(e) Profit given up:** 2020+2021+2023 Π1 $58,084 vs Π1-off $72,219 (−$14,135), vs C-ALR $92,111, vs Stage 1b Π1
  $43,540 and vs Π-000 (the rule-free procedure) $23,685 (Π1 better than both).
