# Robustness: perturbations, neighbourhoods, folds, years, costs and multiple testing

All definitions are PROTOCOL.md §4.2 (frozen before any candidate was evaluated): **probes** = one parameter at a
time, ±1 and ±2 increments (X ±0.5/±1.0 pt, Y ±0.1/±0.2, stop ±0.5/±1.0, hold ±1/±2, L ±5/±10, buffer ±0.5/±1.0,
P ±0.5/±1.0, W ±10/±20), ≤ 32 in-box; **N1** = 128-point Latin hypercube over centre ± (the ±2 increment) per
dimension, rounded to the grid, clipped to the box, distance L∞ ≤ 1 in increment units, seeds
`deriveSeed('study5-gdx-b5-3etf','nbhd',scope,centreId)`; **N2** = 64 points at twice the radius (reported only);
pools: **joint N1** over all 24 parameters (128 points) and **per-book N1** (64 points per book). Quantiles by linear
interpolation. The neighbourhoods were evaluated on the run to 2023-12-29 for selection, and the same points again on
the full history after the freeze.

## 1. Standalone GDX (Study A)

- **Plateau on DEV, cliffs in risk.** Shortlisted vectors keep 63–78% of their DEV net across N1 (93–100% of probes
  feasible on DEV). Every centre sits at the 99th–100th percentile of its own neighbourhood on DEV — an optimizer's
  peak on a broad hill, not an isolated spike, but the peak itself is inflated. The binding failure is risk: N1 p90
  minute DD $40.9k–$63.6k over 2017–2023 and at most 65% of neighbours below $35,000 (G2 fails for all 32): the 2022
  bear turns modest parameter changes into $35k–$60k drawdowns.
- **Near-misses after the freeze** (`STANDALONE_GDX_RESULTS.md` §3): FX N1 medians +$39k–$44k with every neighbour
  positive, but full-history N1 DD p90 $40.9k–$44.4k and 51–57% of neighbours below $35,000.
- **Cost / interest / fills**: profitable at 0–20 bps, 8–14% interest, next-open stops and 10–25 bps stop
  slippage; drawdown margin to $35,000 is thin ($0.8k–$4.4k at 5 bps; `d1-143e245fb1` breaches at 10 bps).
- **Years**: 2020 alone is ≈ 54% of the near-misses' full-history net; every leave-one-year-out total stays positive
  ($112k–$262k without any single year), the smallest without 2020.
- **Concentration**: largest trade 15% of net, top three 36–38%; the March–April 2020 sequence (five lots) ≈ $97k.

## 2. Restricted pools (Study B)

- **Joint N1 (all 24 parameters)**: no candidate and no control except VGT alone keeps ≥ 90% of neighbours below $35k
  (C3 24%, T1-P 29%, T1-S 34%, Track 2a 1–20%); joint p90 DD $54k–$69k.
- **Per-book N1**: perturbing only the frozen KRE `lowDd` book leaves 62% of neighbours below $35k in C3, T1-P and
  T1-S (p90 ≈ $35,251) — KRE `lowDd` (X 29.9% at the box ceiling, hold 4, stop 3.1%) is the fragile book. Perturbing
  only VGT keeps 86–97%; only GDX: 83% (T1-P), 94% (T1-S), 91% (C3's `portfolioAware`).
- **Development folds D1/D2/D3** (Track 1 R2/T3): T1-P's Δ vs C2 is positive in all three folds ($23,993 / $57,760 /
  $19,292); T1-S's too ($24,247 / $35,363 / $7,389). The original rules passed every shortlisted vector again (20/20 in
  both tracks), as in the original study: they do not discriminate in-sample fits.
- **Sensitivities** (`POOL_B5_THREE_ETF_RESULTS.md` §6): all configurations stay profitable from 0 to 20 bps, 8–14%
  interest, next-open stops and 10–25 bps slippage; C3's and C5's DD stay at $26.2k–$27.2k; T1-S's at $29.3k–$32.4k; T1-P's is $39.2k–$41.0k in
  every setting (the 2026 GDX decline).

## 3. Walk-forward and leave-period-out evidence

| Procedure | Selected on | Tested on | Result |
|---|---|---|---|
| Study A pipeline (WF20) | 2017-06-15 → 2019-12-31 | 2020–2021 | no vector passed; shortlist median $24,639/yr → −$2,553/yr; PBO 0.79 |
| Study A pipeline (main) | DEV | VAL 2022–2023 | no vector passed; median $40,925/yr → $3,345/yr; PBO 0.49 |
| Track 1 (WF20) | 2017-06-15 → 2019-12-31 | 2020–2021 | T1-P +$81,846, T1-S +$41,846 (DD $44,007) vs C2 alone +$93,918 |
| Track 1 (main) | DEV | VAL / FX | T1-P +$74,231 / +$75,429 (DD breach $39,623); T1-S +$61,393 / +$91,470 vs C3 (in-sample) +$119,070 / +$96,152 |
| Track 2a (main) | DEV | VAL / FX | DEV +$89k…+$127k over C3, VAL −$79k…−$128k under C3, FX −$32k…−$50k under C3 |

Rank correlation between the Study A validation score and the FX net across the 32 shortlisted vectors (after the
freeze): Spearman 0.31.

## 4. What was not done, and why

- **Bootstrap / resampled histories.** Not run. D1 and the shared pool are path-dependent at minute resolution
  (trailing highs, continuation windows, stops and the single slot); resampling bars or trades would not produce a
  valid market history, and block-resampling of a handful of dip episodes (1–5 per ETF in DEV) is not statistically
  meaningful. Chronology-preserving checks were used instead: walk-forward, leave-one-year-out, arming-date shifts,
  isolated-window runs and neighbourhoods.
- **20% portfolio mode.** Out of scope (fixed $100,000 objective; VOOG not appended).
- **Statistical significance.** With 1–5 deep dips per ETF in development and 1–2 in validation, no test here can
  establish an edge; the checks can only reject fragile candidates, which they did.

## 5. Multiple testing ledger

| Stage | Evaluations | Effective dimension |
|---|---:|---:|
| Study A search, main + WF20 | 20,194 vectors (2 × (4,097 screen + 6,000 GA)) | 8 |
| Study A evidence, main + WF20 | 18,852 runs (probes, N1, N2, stresses) | — |
| Track 1 main + WF20 (Stage A at 4 costs, both tracks' GA, probes) | 10,851 traces, 21,737 replays | 8 |
| Track 2a | 27,945 pool configurations | 8 per step, 24 joint |
| Track 2b evidence | 10,016 traces (21 configurations × probes/N1/stresses) | — |
| Final (after freeze) | 3,320 traces | — |

Under this search volume, the DEV maxima ($192k standalone, $330k pool) are expected to be inflated; the
DEV→VAL decay and PBO above quantify it.
