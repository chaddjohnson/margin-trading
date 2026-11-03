# Joint combinations (brief §7C–D, PROTOCOL §7.4–§7.6)

Twelve predeclared pairings per history — P01 E06 × XS, P02 E06 × XV, P03 E06 × XF-T (protective tighter trail +
re-arming), P04 E04 × XF, P05 E05 × XF, P06 E03 × XT, P07 E11 × XF-T (renewable campaign), P08 E09 × XF (trailing buy),
P09 C-SMA × XF (simple control), P10 E02 × XE, P11 E07 × XD, and the training-only adaptive P12 — each searched jointly
over entry and exit parameters (2,048 Sobol + 128 local + 16 × 33 joint/10 bps = 2,704 planned, plus the widening rule),
then the re-entry step (§7.4), then sizing on the top three (§7.5). Tables: `results/tables/pairings.md`, `picks.md`,
`reentry-lc.md`, `sizing-ld.md`. Budget per history 222,293 planned (cap = plan); used 155,118 / 173,105 / 158,021 /
150,998 / 157,381 (A–H; duplicates memoised); runtime 91–192 s on 14 workers, peak RSS ≈ 2.1 GB.

## 1. Final RoD score of each pairing (training data of the history)

| Pairing | A (≤2019) | B (≤2020) | C (≤2021) | D (≤2022) | H (≤2023, in-sample) |
|---|---:|---:|---:|---:|---:|
| P01 E06 × XS | 2.81 | 3.11 | 4.51 | 3.46 | 4.65 |
| P02 E06 × XV | **4.27** | 4.02 | 6.12 | **5.57** | 5.63 |
| P03 E06 × XF-T | 3.20 | 3.78 | 5.30 | 5.07 | 5.47 |
| P04 E04 × XF | 2.87 | 3.57 | 4.32 | 3.21 | 2.88 |
| P05 E05 × XF | 2.08 | 2.52 | 2.69 | 2.36 | 3.19 |
| P06 E03 × XT | 2.99 | 5.18 | **7.55** | 3.29 | 3.53 |
| P07 E11 × XF-T | 2.82 | 3.79 | 4.42 | 4.58 | 4.45 |
| P08 E09 × XF | 2.05 | 2.92 | 3.83 | 1.00 | 2.44 |
| P09 C-SMA × XF | 1.76 | 2.61 | 3.99 | eliminated | eliminated |
| P10 E02 × XE | 2.85 | 4.50 | 4.76 | 5.34 | 5.05 |
| P11 E07 × XD | 1.84 | 2.82 | 4.58 | 2.94 | 3.99 |
| P12 adaptive | 4.04 (E06 × XT) | **5.46** (E03 × XV) | 4.29 (E03 × XRD) | 4.52 (E06 × XT) | **6.23** (E06 × XT) |

(Bold = the history's pick. Each pairing's re-entry and sizing choice, development net and drawdown are in
`results/tables/pairings.md`.) The picks: A P02 E06 × XV + Z1; B P12 E03 × XV + RC10 +
Z2(0.5, 0); C P06 E03 × XT + Z1; D P02 E06 × XV + RC10 + Z1; H P12 E06 × XT + Z1. P\*-NET: A P12 E06 × XT + Z1; B and C P04
E04 × XF (the CUSUM family that Stage 1 picked in B and C); D P12 E06 × XT + Z2(0.5, 0); H P10 E02 × XE + REF.

## 2. Fair inclusion and eliminations

- The three mandated E06 designs, an E05 and an E03 pairing, a renewable campaign (P07), the trailing buy (P08), the
  simple control (P09), the invented exit (P10) and E04 (restored after review 1) were all searched in every history.
  P12 came from the L-B cells (A E06 × XT, B E03 × XV, C E03 × XRD, D E06 × XT, H E06 × XT); E06 entered through P12 in
  three histories — disclosed crowding.
- **Eliminated (training-only, logged):** P09 C-SMA × XF in D and H (no center with ≥ 75% J33 feasibility). P08 E09 × XF stayed
  eligible but ranked low (RoD 1.0–3.8): the trailing buy is nearly always long.
- E06 provided the pick in A, D and H; E03 in B and C. No E04 pick under RoD (it was P\*-NET's choice in B and C).

## 3. What the bounded search established

Within each history the five RoD picks reach RoD 4.3–7.5 with development drawdowns of $9–16k and J128 development
neighbourhoods that are 99–100% net-positive and within $35k (other protective pairings reach $19–20k drawdowns) (`NEIGHBORHOOD_AND_CHRONOLOGY.md`). The search therefore found
robust *in-sample* optima, and the robustness filters (φ, joint neighbourhoods, 10 bps) worked as designed. The failure
is out of the training window: the fold-C optimum (E03 × XT) lost in 2022 with its entire neighbourhood, and the fold-D
optimum (E06 × XV + RC10) under-captured 2023. Sizing was tested separately and on the top three only; Z1 won most of
those comparisons (`EXPOSURE_AND_POSITION_SIZING.md`).
