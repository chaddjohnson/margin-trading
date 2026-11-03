# Neighbourhood robustness (PROTOCOL.md §4, §12, §15.2) — 2026-10-25

This report covers what the perturbation instrument says about the configurations this study selected or compared.
Read every interval here as **Monte Carlo uncertainty under the chosen perturbation distribution on one historical
path**. None of them is uncertainty about future markets.

Labels used below:
- **E0** is a centre (optimized peak).
- **E1** is a neighbourhood median from draws that no selection used. **confirm-A** is the selection batch;
  **confirm-B** was drawn after `FROZEN_SELECTION.json` and is reported only.

## 1. The instrument, recalled

N1 moves every coordinate of every member by −1, 0 or +1 step unit:
- **Step units:** X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5, W 10.
- **Bounds:** a step that would leave the box is reflected.
- **Common random numbers:** draw *d* applies the same signs to the same symbol and parameter in every configuration,
  so paired differences are sharp.

Sensitivity classes:
- **A2:** two step units.
- **N2:** exactly three coordinates.
- **N3:** one member at a time.
- **N0:** the one-coordinate probes.

The pilots (PILOT_CALIBRATION.md) checked the machinery in all three windows:
- shareAbove ≈ 0.5 over active random controls;
- zero-amplitude draws reproduce the base exactly;
- replay = engine on sampled neighbours;
- reflection never leaves the box.

## 2. The final round's finalist and the benchmarks (training 2016–2023, 5 bps)

| | Centre (E0) | P50_A [90%] (n = 256) | P50_B [90%] (n = 256, after the freeze) | B − A | Q25_A | MAD | shareAbove | DDmed / DD90 | feasShare | A2 P50 | N2 P50 |
|---|---:|---|---|---:|---:|---:|---:|---|---:|---:|---:|
| finalist GDX KRE XBI XLE (seeded arm) | $309,743 | $291,440 [$289,748, $293,496] | $290,689 [$288,428, $293,697] | −$751 | $277,611 | $13,164 | 0.13 | $34,799 / $41,466 | 0.53 | $182,701 | $306,540 |
| B1 | $135,359 | $96,352 | $93,606 | −$2,746 | $78,971 | $16,265 | 0.00 | $21,312 / $27,153 | 1.00 | $71,890 | $114,158 |
| B4 | $242,196 | $134,121 | $130,632 | −$3,488 | $113,024 | $21,049 | 0.00 | $38,106 / $52,754 | 0.36 | $90,624 | $219,115 |
| B5 | $388,489 | $210,556 [$204,703, $217,107] | $204,393 [$196,135, $214,430] | −$6,163 | $172,189 | $36,232 | 0.00 | $36,660 / $53,870 | 0.37 | $152,801 | $362,420 |
| R1 (inspect-only) | $467,806 | $265,286 | $262,061 | −$3,225 | — | — | — | $35,850 / $49,112 (B) | — | — | — |
| R4 (inspect-only) | $371,690 | $241,843 | $239,683 | −$2,159 | — | — | — | $36,317 / $51,826 (B) | — | — | — |

**Agreement.** All six B − A differences are inside two pooled bootstrap standard errors: the selection batch did not
flatter its own picks.

**Paired differences on confirm-B.** The finalist's paired P50 differences against the benchmarks were:

| Finalist − | ΔP50_B | 90% interval |
|---|---:|---|
| B5 | +$86,296 | [$76,385, $94,557] |
| B4 | +$160,057 | [$153,754, $164,805] |

On confirm-A (256 common draws) they were +$80,884 against B5 and +$157,320 against B4. The paired correlation is low
(Spearman 0.17–0.19), so pairing reduced the variance only about 1.1×.

**What the neighbourhoods say.**

- **Every peak sits above its neighbourhood.** shareAbove is 0.00 for the benchmarks and 0.13 for the finalist. The
  smoothed figure retains 94% of the finalist's peak, but only 54% of B5's and 55% of B4's. B5's and B4's E0 figures
  are knife-edge optima of vectors chosen on these years. The finalist's centre is flatter, which is what the
  objective rewarded.
- **The finalist is flat in profit, not in drawdown.** Only 53% of its N1 neighbours keep the centre minute drawdown
  within $35,000. Its median neighbour drawdown ($34,799) sits right at the floor reference, its DD90 is $41,466, and
  its 16 portfolio neighbours reach a 36.4% maximum daily drawdown against the centre's 29.23%. The soft penalty
  charged nothing because DDmed ≤ $35,000 and DD90 ≤ $45,000, but a one-step perturbation breaches the hard F1 ceiling
  about half the time. B4 and B5 are worse on this count (feasShare 0.36–0.37, DDmed above $36,000).
- **A2 halves the smoothed profit everywhere.** The A2 P50 is $182,701 for the finalist and $152,801 for B5, against
  N1 medians of $291,440 and $210,556. Two step units on every coordinate at once is far from a "nearby" pool.
- **N2 is close to the centre.** The N2 P50 is $306,540 for the finalist and $362,420 for B5. Each draw moves only three
  of 32–40 coordinates, so its median sits near the centre and says little.
- **N3 (one member moved).** XBI is the finalist's most sensitive member: the N3 P50 is $287,322 with XBI moved,
  against $301,748–$316,056 for the other three. XLE is the least valuable: its smoothed leave-one-out marginal is
  $19,999.71, the smallest of the four.

## 3. The fold picks (search-window E1 against the validation window)

| Fold | Pick | P50_A (search window) | V (validation, centre) | Validation-window P50 (n = 64) | Validation shareAbove | Validation feasShare |
|---|---|---:|---:|---:|---:|---:|
| fold-a | J primary EDV GDX KRE | $175,746 | +$4,189 | $2,295 | 0.41 | 0.89 |
| fold-a | Q primary EWZ GDX | $137,694 | −$30,323 | −$21,738 | 0.84 | 0.00 |
| fold-b | Q primary GDX VGT XHB | $200,203 | −$39,158 | −$32,548 | 0.77 | 0.00 |

In validation, each pick's neighbourhood sits close to its centre: P50 within $2,000–$9,000 of V, with the same sign. So the forward result is not one unlucky vector; the whole neighbourhood earned about the same. The J pick's
validation neighbourhood was drawdown-feasible (0.89). Both Q picks' were not (0.00).

## 4. What the instrument can and cannot do

- **Within training.** The smoothed objective did what it was built to do. It preferred flatter centres, and its
  figures held up on a second, independent batch of draws (confirm-B).
- **Forward in time.** It did not make selection persist. In the pilot, random configurations' N1 P50 predicted
  2022–2023 no better than their raw net (Spearman 0.023 against −0.006). In the folds, the J pick reached the 40th
  percentile once and failed to exist once.
- **Neighbourhood size.** A neighbourhood of one step unit is small next to the change in market behaviour between
  windows. Robustness to parameter perturbation is not robustness to time.
