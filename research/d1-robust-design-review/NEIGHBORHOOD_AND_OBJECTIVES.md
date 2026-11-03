# Neighbourhoods, objectives, risk aggregation and pilot calibration

This document fixes, in implementable terms, what a "local parameter neighbourhood" of a D1 shared pool means in the
new study, how neighbourhood statistics are estimated and seeded, which statistic the search optimizes, how risk
enters, how benchmarks are compared fairly, and which constants the training-only pilot sets and by what rule. Every
constant below is to be declared in the study's `context.ts` and frozen with the protocol; nothing is tuned after a
candidate figure exists.

## 1. The parameter space and its metric

### 1.1 Coordinates

A configuration C is a nonempty set of books {(symbol_i, θ_i)}, i = 1..k, each θ_i an eight-vector on the existing
D1 grid (`src/multi-etf-d1/context.ts` `protocol.box`, unchanged): X 80–300 (tenths of a point), Y 1–50, stop 30–150,
hold 3–30 (days), L 20–250 (sessions), buffer 0–60, P 30–200, W 10–200. Books are indexed by **sorted symbol** so
that "slot i" is well defined for every configuration containing that symbol.

### 1.2 Step units (amplitude A1) and the metric

One **step unit** per parameter, in grid units, identical to the 16-ETF study's joint magnitudes so that the new
figures remain comparable in scale with the published P50 values:

| Parameter | Step unit u_j (grid units) | In natural units | Share of the box range |
|---|---:|---|---:|
| X | 5 | 0.5 point | 2.3% |
| Y | 1 | 0.1 point | 2.0% |
| stop | 5 | 0.5 point | 4.2% |
| hold | 1 | 1 calendar day | 3.7% |
| L | 5 | 5 sessions | 2.2% |
| buffer | 5 | 0.5 point | 8.3% |
| P | 5 | 0.5 point | 2.9% |
| W | 10 | 10 sessions | 5.3% |

Distance between two configurations with the same membership: d(C, C') = Σ_i Σ_j |θ_ij − θ'_ij| ÷ u_j (step units);
the **total moved coordinates** m(C, C') = #{(i, j): θ_ij ≠ θ'_ij} is always reported beside any neighbourhood
statistic. Configurations with different membership have no parameter distance; membership distance is the Jaccard
distance of symbol sets (`genome.ts jaccardDistance`), used for family diversity only.

**Why step units rather than parameter influence.** Scaling steps to measured influence (for example a parameter's
one-coordinate sensitivity) would let the optimizer shrink the neighbourhood along the directions it exploited —
the sampler must be fixed independently of outcomes. Uniform grid steps of 2–8% of each range are the honest, boring
choice; sensitivity to this choice is measured by the second amplitude (A2 = 2 × u_j) and by the fixed-mass class,
and is reported, not optimized.

### 1.3 Bounds: reflection, not clamping

For a draw step s ∈ {−u, 0, +u}: if θ + s lies inside the box, use it; otherwise use θ − s (reflect inward); if that
is also outside (impossible for every u_j above, since u_j < range), use θ. A coordinate at a bound thus still moves
with probability 2/3, like every other coordinate. This changes the neighbourhood of boundary-sitting vectors
relative to the 16-ETF study (which clamped), so **every published P50 of B1/B4/B5/R1/R4 is recomputed under the new
definition before any comparison**; cross-definition comparisons are forbidden.

## 2. Perturbation classes

| Class | Definition | Role | Draws (n) by stage |
|---|---|---|---|
| **N1 joint** (primary) | every book, every parameter: step independently 0 with probability 1/3, −u_j or +u_j with 1/3 each; reflection at bounds | the perturbation model of "a slightly different specification of the whole configuration"; **search fitness, promotion, refinement, finalist statistics** | discovery n_D (pilot-set, 8–16); promotion 64; refinement 32; finalists 2 × 128 independent |
| N1-A2 | N1 with 2 × u_j | amplitude sensitivity; a configuration whose statistics collapse at A2 but not A1 is "narrow-plateau" | finalists 128 |
| N2 fixed-mass | exactly K = 3 coordinates chosen uniformly without replacement among the 8k, each moved ±u_j (sign uniform), reflection at bounds | cardinality-neutral comparison across pools of different size (the same perturbation mass whatever k) | finalists 64; pilot 32 |
| N3 one-book | one book chosen uniformly; its eight coordinates perturbed as N1; the other books unchanged | localizes fragility to members | finalists 8 per member |
| N0 probes | the existing one-coordinate ±u_j, ±2u_j probes (≤ 32 per member, in box) | compatibility diagnostic with earlier studies; **never a gate** | finalists all |

Why N1 is primary and not N2: a four-book pool genuinely carries 32 uncertain coordinates, so the right model of
"what if the specification were slightly different" moves all of them. N1's cardinality dependence is a property of
the object, not an artefact — the artefact was dividing by the peak and applying one ratio threshold. N2 answers the
separate question "per unit of perturbation mass, how rough is the landscape here?" and is reported for every finalist.

Why the discrete {−u, 0, +u} law and not a wider distribution: it is the simplest symmetric law whose draws are all
reachable grid points; A2 covers the wider shell; and it preserves comparability with the measured 16-ETF values.
The design perturbation distribution is **not** a probability distribution over future markets or over "true"
parameters; it is a fixed instrument for measuring local dependence of a historical outcome on the exact vector.

## 3. Neighbourhood statistics

For a configuration C on window W at cost c (5 bps unless stated), with neighbourhood sample N = {C'_1 … C'_n} drawn
from class N1 (the centre is **excluded** from N):

- `base`   = fixed-pool net of C (realized + marked unrealized after interest and costs, at W's last close)
- `P50`    = median of net(C'_d); `Q25`, `P10`, `Q75` the quartiles/deciles; `MAD` = median |net(C'_d) − P50|
- `shareAbove` = #{d: net(C'_d) > base} ÷ n  (≈ 0.5 for an unselected configuration; ≈ 0 for a selected peak)
- `DDmed`  = median of minute-sampled maximum drawdown over N; `DD90` = its 90th percentile; `feasShare` = #{d: DD(C'_d) ≤ $35,000} ÷ n
- `retention` = P50 ÷ base, **reported only when base ≥ $50,000** (descriptive; never a gate)
- `moved`  = mean number of moved coordinates over N (≈ 2/3 × 8k)

Every neighbour evaluation records the same per-evaluation fields as the 16-ETF archive (lots, utilization, folds,
regimes, years, refusals, contested ties), so neighbourhood versions of activity and concentration are available at
no extra cost.

### 3.1 Why median and lower quartile rather than retention or peak

- The **peak** is the maximum of a rough function over the search's trials: its excess over the typical value of its
  region is selection, not skill. Nothing in the peak distinguishes an overfitted spike from a plateau.
- The **retention ratio** divides by the peak, so it is a selection-intensity measure: optimized configurations score
  0.5–0.7 whatever their merit, and it is undefined or absurd for small or negative bases.
- The **median** of the neighbourhood is the typical historical outcome of the region; it is still estimated on the
  same prices, so it can be inflated by selection *across* regions (the search picks the region with the luckiest
  median) — the winner's curse moves up one level. Its inflation is smaller because the median of n draws has lower
  variance than a single evaluation, but it does not vanish; the remedies are common random numbers (§4), independent
  confirmation batches (§5) and the walk-forward procedure test (WALK_FORWARD_AND_EVIDENCE.md).
- The **lower quartile** adds protection against regions with a fat lower tail (plateaus that fall off a cliff on one
  side); it is noisier than the median at small n, so it enters as an absolute floor rather than as the ranking key.
- **Drawdown distribution over the neighbourhood** is the right risk object because the fixed pool's maximum drawdown
  is itself a maximum statistic: a re-timed lot can raise it sharply, so a centre figure of $26k with a neighbourhood
  median of $37k is a $37k risk, not a $26k one.

### 3.2 Inert books, tiny profits, vacuous neighbourhoods

- A **member with no virtual trade** on the centre vector contributes nothing and makes the neighbourhood trivially
  stable in its slot. Feasibility requires every member to have ≥ 3 virtual trades on the window (centre) and
  ≥ 2 funded lots; otherwise the configuration is infeasible (not scored), whatever its net.
- **Activity floor:** ≥ 12 funded lots with funded lots in ≥ 3 calendar years of the window (for a fold window with
  < 4 eligible years, ≥ 2 years and ≥ 8 lots). A near-zero-return configuration has P50 ≈ 0 and J ≈ −λk: it never
  ranks above a profitable one.
- **Vacuous stability** (a configuration whose neighbours are all identical because every coordinate is far from any
  threshold that matters) is detected by `moved` ≫ 0 with MAD ≈ 0; such configurations are usually inert and fail the
  activity floor. The pilot reports how often MAD < $1,000 occurs among active controls (expected: never).

## 4. Seeds and common random numbers

All randomness comes from `Rng.from(label…)` (`src/optimizer/rng.ts`). Neighbour draws are **configuration-independent**
so that comparisons are paired (common random numbers, CRN):

```
for draw d in 0..n-1 of stage σ (σ ∈ {'disc', 'promo', 'refine', 'confirm-A', 'confirm-B', 'pilot'}) and window w:
  rng_d = Rng.from('robust-d1', w, σ, 'N1', d)
  for each symbol s in the FULL universe, alphabetically (whether or not it is a member of C):
    for each parameter j in box order:
      t = rng_d.int(3)        # 0,1,2 → step −u_j, 0, +u_j
      step[s][j] = (t − 1) × u_j
  neighbour C'_d = apply step[s][j] with reflection to every (s, j) with s ∈ members(C)
```

Consequences: two configurations sharing a symbol receive the *same* step pattern on that symbol in draw d; a
configuration and its one-coordinate move receive identical neighbourhoods except for that coordinate; the archive's
P50 figures are comparable across configurations because they rest on the same perturbation noise. Drawing the
pattern for the full universe (not only the members) keeps the pattern for a symbol fixed when membership changes.
N2/N3 draws use labels `'N2'`/`'N3'` the same way. The 16-ETF study seeded by configuration key, which made each
configuration's noise independent and allowed "lucky-noise" selection; this is the main change.

Independent batches: `confirm-A` and `confirm-B` (128 draws each) use labels disjoint from every search stage, so a
finalist's reported statistics come from draws no search decision ever saw. The reported P50 is batch B's; batch A is
used for the acceptance gates; their difference (expected within ± 2 × standard error) is a published sanity check.

Determinism: single-threaded island logic; evaluations are pure functions of (configuration, window, cost, draws) and
may be computed on worker threads, with results reduced in a fixed order (sorted by key), so the log is byte-identical
across runs regardless of scheduling.

## 5. Sampling uncertainty

For n draws, the standard error of the median is ≈ 1.2533 × σ ÷ √n for near-normal neighbour nets, where σ ≈ 1.4826 × MAD.
Indicative, from the 16-ETF batteries (P50 − P10 ≈ $60k → σ ≈ $47k for the leaders): n = 8 → SE ≈ $21k; n = 12 →
$17k; n = 16 → $15k; n = 48 → $8.5k; n = 64 → $7.4k; n = 128 → $5.2k. Every reported P50/Q25 carries a bootstrap
90% interval (1,000 resamples of the draw set; cheap, no new evaluations). Two configurations are "indistinguishable"
when their confirmation P50 intervals overlap; the materiality margin M (§8) is set so that a declared improvement
exceeds roughly twice the pooled standard error at n = 128 plus the economic minimum.

## 6. The objective

### 6.1 Feasibility (hard, centre and neighbourhood)

```
F1 centre risk:        DD(C) ≤ 35,000  at 5 bps and at 10 bps
F2 neighbourhood risk: DDmed(C) ≤ 35,000   (at least half the plausible specifications stay within the ceiling)
                       DD90(C)  ≤ 45,000   (no plausible specification blows through 45% of the lot)
F3 activity:           funded lots ≥ 12 in ≥ 3 calendar years (fold windows: ≥ 8 in ≥ 2); every member ≥ 3 virtual
                       trades and ≥ 2 funded lots on the centre
F4 lower tail:         Q25(C) ≥ 0
violation v(C) = Σ max(0, shortfall ÷ limit) over F1–F4 (for constrained ranking during discovery)
```

F2 and F4 are evaluated at the stage's n; at n_D = 8–16 they are noisy, so during discovery a violation of F2/F4 by
less than one standard error is treated as "provisionally feasible" (ranked by v but not discarded) and settled at
promotion with n = 64.

### 6.2 The scalar fitness

```
J(C) = P50(C) − λ × k,      λ = $5,000 per book
```

λ retained from the previous studies (it is the net a book must add in smoothed terms to pay for its presence; it also
removes inert members). The search maximizes J among feasible configurations (constrained domination: feasible beats
infeasible; among infeasible, lower v wins; among feasible, higher J wins; ties by Q25, then by key). There is no
Pareto front on drawdown, no books objective and no regime bonus; risk is a constraint, breadth a penalty, and
activity a floor. The centre net is logged but never ranks anything.

Why not J = Q25 − λk: Q25 at n_D = 8–16 is the 2nd–4th order statistic and too noisy to rank 20,000 configurations;
it is used as a floor (F4) and as the tie-breaker, and the finalists' Q25 is reported with its interval. Why not a
weighted blend: it adds a tuned weight for no identified benefit.

### 6.3 Costs and modes inside the objective

Fitness is computed at 5 bps per side in the fixed $100,000 pool (the fast path). 0/2/10 bps are evaluated for every
promoted configuration (centre and N1 at n = 32) and enter the finalist gates (G4). The 20% portfolio is **not** in the
objective (full engine only); it enters at promotion as a constraint (daily % DD ≤ 35% on training) and at the
finalist stage in full (ladder, matched borrowing, both dividend conventions).

### 6.4 Benchmarks under the same instrument

B1, B4, B5 (and the inspect-only R1, R4) are evaluated with the identical N1 definition, seeds and n at every stage
where a candidate is, and their J, P50, Q25, DDmed, DD90, shareAbove are reported beside the candidates'. **No
benchmark's peak net is a bar.** Materiality (G6 in the protocol) is P50_conf(C) − P50_conf(B) ≥ M with both under
`confirm-A` draws, and Q25(C) ≥ Q25(B).

## 7. Risk aggregation and the portfolio

- Fixed pool: F1/F2 above; the desired ceiling is $35,000 per $100,000 lot; the neighbourhood tail bound $45,000.
  Daily-sampled drawdown is reported beside the minute-sampled one and never substituted for it.
- Portfolio (20% of marked equity per lot, 60/40 VOOG/VGT core, 11% simple interest): the maximum **peak-to-trough
  percentage** daily drawdown over the training run ≤ 35% is a hard gate; ≤ 30% is the ideal; in (30%, 35%] all
  materiality margins double. The minute-sampled percentage drawdown is reported separately and is not gated (the core
  alone reaches 35.76% minute-sampled in March 2020). Because C0 (core only) falls 33.89% daily in the same episode,
  every candidate also reports its **excess drawdown over C0** on the same dates, which is the part the trading
  actually contributes.
- Neighbourhood risk in the portfolio is not computed (full engine only, ≈ 1–7 s per run); instead the finalists'
  N1 neighbours are run in the portfolio at n = 16 as a descriptive check that the fixed-pool DD ranking carries over.

## 8. The training-only pilot (calibration without a selection leak)

### 8.1 Purpose

To learn, from configurations **nobody optimized**, (a) the dispersion of neighbourhood statistics by cardinality and
activity, (b) whether the perturbation machinery is unbiased (shareAbove ≈ 0.5), (c) how feasibility propagates
to neighbourhoods, (d) whether the smoothed statistic is more temporally persistent than the raw net inside the window,
and (e) the two calibrated constants of §8.5. The pilot never evaluates a candidate and never reads a later partition.

### 8.2 Design

- **Strata by cardinality** k ∈ {1, 2, 3, 4, 5, 6, 8, 12, 16}; **40 configurations per stratum** (360 in all),
  memberships uniform over the eligible universe, vectors uniform from the Sobol library (1,024 vectors; controls
  excluded), seeds `Rng.from('robust-d1', w, 'pilot', k, i)`. The same 360 configurations are evaluated on every search
  window w (fold a, fold b, final).
- Per configuration: centre at 0/2/5/10 bps; N1 at A1 with n = 64; N1 at A2 with n = 64; N2 with n = 32; N3 with
  n = 8 per member; N0 probes. ≈ 170 + 8k neighbour evaluations per configuration.
- Recorded per configuration: base, P50, Q25, P10, Q75, MAD, shareAbove, DDmed, DD90, feasShare, funded lots, distinct
  funded decision minutes, lots per eligible year, utilization, top-2 lot share, best-regime share, borrowing-dollar-
  days, inert members, moved coordinates, fold attribution (for §8.4).
- Stratum summaries: medians and quartiles of every statistic; the share of centrally feasible configurations; among
  those, the distribution of feasShare and DDmed; MAD as a function of k and of funded lots.

### 8.3 Machinery checks (must pass before any search)

- shareAbove pooled over active controls within 0.5 ± 0.05 (unbiased perturbation).
- Zero-amplitude draws reproduce the base exactly (every configuration).
- Replay = full engine on 8 random pilot neighbours per stratum (field-for-field).
- Reflection never produces an out-of-box coordinate (every draw); boundary coordinates move with frequency 2/3 ± 0.05.

### 8.4 Persistence diagnostic (outcome-independent, inside the window)

On the final window, for the 360 controls: Spearman correlation of (a) raw net on 2017-06-15 → 2021-12-31 with raw net
on 2022–2023, and (b) P50 (N1, n = 64, computed on 2017-06-15 → 2021-12-31 marks) with raw net on 2022–2023. If (b)
exceeds (a) materially (predeclared: by ≥ 0.10), the smoothed statistic is more temporally persistent than the peak
on random configurations — supporting evidence for the objective choice, not proof. Reported either way.

### 8.5 Pilot-to-freeze rules (deterministic; written now, applied once, recorded in `pilot_freeze.json`)

1. **Materiality margin M_w** (dollars) = max($25,000, median MAD over centrally feasible controls with k ≤ 6 on
   window w), computed separately for each search window (fold a, fold b, final). Used in G6 (benchmark materiality)
   and in refinement acceptance (the protocol's §8 uses M_w/5).
2. **Discovery sample size n_D,w** ∈ {8, 12, 16} = the smallest n such that the subsampled standard error of P50 at n
   (10,000 subsamples of the 64 A1 draws on window w) is ≤ $15,000 for the median centrally feasible control with
   k ≤ 6; if none qualifies, 16.
3. Everything else (ceilings $35k/$45k, λ, step units, n at promotion/refinement/confirmation, M's floor) is fixed
   a priori and **not** pilot-dependent. If the pilot shows that F2 (DDmed ≤ $35k) is met by fewer than 10% of
   centrally feasible k ≤ 6 controls, the protocol *reports* that F2 is severe and keeps it; no threshold moves after
   the pilot.

### 8.6 What the pilot cannot license

The pilot uses the same training prices as the search. Its constants describe the roughness of *this* period; they do
not generalize to other periods, and passing calibrated gates does not imply out-of-sample robustness. Because the
pilot's configurations are random, its outputs are not candidates and cannot be selected; the residual double-dip is
that M and n_D are tuned to 2017–2023 roughness, which is disclosed, not corrected.

## 9. Summary of what replaces T6

| Old (T6) | New |
|---|---|
| ratio P50 ÷ peak ≥ 0.75, all cardinalities | **dollar P50 is the search objective**; the ratio is a descriptive peakedness figure, shown only for base ≥ $50k |
| 75% of neighbours feasible | DDmed ≤ $35,000 and DD90 ≤ $45,000 (absolute, a priori), with the pilot reporting how severe this is for random feasible pools |
| one-parameter probe median ≥ 0.85 × net | probes kept as N0 diagnostics only (shown not to discriminate) |
| perturbation seeded per configuration | common random numbers per (window, stage, draw); independent confirmation batches |
| clamping at bounds | reflection |
| 48 draws for 20 finalists only | n_D draws for every evaluated configuration, 64 at promotion, 32 in refinement, 2 × 128 for finalists |
| battery after a peak-net search | neighbourhood quality drives discovery, promotion and refinement |
