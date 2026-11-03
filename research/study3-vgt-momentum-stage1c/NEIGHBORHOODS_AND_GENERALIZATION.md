# Neighbourhoods and generalisation

Sources: `results/tables/neighbourhoods.md` (J128 on development data and, post-selection, over each fold's next
window; one-at-a-time profiles including ±1/±2 integer steps for N and C and ±0.1/0.5/1/2 pp for percentage
parameters; rule × stop-distance grids in `results/payloads/robustness/development.json.gz`), `robustness.md`
(perturbed executable paths, stresses), `legs.md`; the rule × stop grids are tabulated in `rule-stop-grids.md`.
Parameter draws are not independent market samples. The study evaluated 5,114,598 configurations (5,111,641 in
development).

- **Perturbed executable paths (rubric f):** 128 S1 paths, path j using draw j of every fold pick. Π1: median Σ W
  +$21,845 (P10 −$4,981, P90 +$41,707); 58.6% (75 / 128) both positive and within $35k DD (threshold 75%) → **fails**;
  62% (79 / 128) within $35k DD alone (median DD $33,281). Their rule-free twins: median +$26,688 but **0%** within
  $35k DD (median DD $54,979). Π1 beats its twin in 34% of pairs. Median perturbed 2022: Π1 −$22,053, twins −$45,627
  **(target-year-informed)**. Π-NET and Π-000 perturbations: 0% and 2% within $35k. This drawdown difference is one
  retrospective, target-year-informed replay and its parameter perturbations — not independent evidence.
- **Stresses:** the five rubric-(h) stresses (10 bps, 14%, 25 bps stop slippage, 50 bps opening slippage, +1 minute)
  all pass. Across all non-zero-cost stresses (costs 2/10 bps, rates 8/14%, stop slippage 10/25/50 bps, entry slippage,
  opening slippage, +1/+5 minutes, missing bars, the same-print A fill): Σ W +$45.9k to +$63.6k, chained DD ≤ $25.2k.
  **0 bps is the outlier: +$9,831 / DD $51,541** — a friction change flips A's net-at-open decisions; the result sits on
  a knife edge. The missing-bar stress is weak: Π1 at 1% and Π-000 and P\*_H at both 1% and 5% are unchanged (the final
  audit found that the seeded removal never drops a session's first bar).
- **In-sample H pick (E11 × XRP OR + A, 2017–2023):** +$145,398 continuous with $17,712 DD, stable under every stress
  (Σ +$138.8k to +$152.0k) — an in-sample description, not evidence; its knock-outs and variants are in the robustness
  payload.
- **Development vs next window (J128, continuous runs; the next window is post-selection):** every fold pick's
  development neighbourhood turned out 100% net-positive (median +$56k to +$153k; 86–100% within $35k) — an empirical
  J128 result; selection required only φ ≥ 0.75 on J33. Over the next window:
  A (2020) median +$28,077, B (2021) +$31,291, D (2023) +$16,321, all 128 draws positive — but **C (2022): all 128
  draws lost** (median −$31,591, P90 −$16,094, best −$1,762; 34% within $35k DD). Π1's executable 2022 result (−$6,415)
  is therefore a favourable point of a neighbourhood that lost everywhere in 2022 — the same regime failure Stage 1b
  found for its fold-C optimum, now with the losses cut but not removed **(target-year-informed)**.
- **Edge optima:** every binding pick lies in a part of its box that the training-only widening opened, one at a
  natural limit — A t2 = 0.005 (declared 0.03–0.25), B ρ = 1.00 (declared 0.2–0.9; 1 is the limit), C ρ = 0.98, D
  γ = 2.57 (declared 0–2); H's ρ = 0.97 as well. Optima at box edges are consistent with the perturbation item (f)
  failing.
- **Trend legs (`legs.md`):** Π1 captured 26–102% of the 2020–2023 up-legs, including 91 / 82 / 102% of the three
  short 2022 bear-market rallies — but Π1-off captured the same three legs about as well (92 / 97 / 93%), so the rules
  did not improve rally capture; Π1's 2022 gain over Π1-off came from the losing entries it avoided or cut short
  **(target-year-informed)**. Π1 captured less than Π1-off of the 2020 and 2021 legs (42% vs 65%, 68% vs 98%).
