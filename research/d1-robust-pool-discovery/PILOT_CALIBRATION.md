# Pilot calibration (PROTOCOL.md §7) — 2026-10-25

**What the pilot is.** For each search window (fold-a ≤ 2020-06-30, fold-b ≤ 2021-12-31, final ≤ 2023-12-29), the same
360 random, **unoptimized** configurations — nine cardinality strata (1, 2, 3, 4, 5, 6, 8, 12, 16 books) × 40,
memberships uniform over the 61 eligible symbols, vectors uniform from the 1,024 Sobol vectors — each evaluated at its
centre (0/2/5/10 bps) and under every neighbourhood class (N1 at A1 and A2, 64 draws each; N2, 32; N3, 8 per member;
N0 probes), plus B1/B4/B5 identically. Training data only, through the truncated fold door. No pilot configuration is a
candidate. The pilot sets exactly two kinds of constants, by rules written before it ran: the drawdown-penalty
references R_m, R_t per cardinality stratum (§6.3) and the discovery draw count n_D (§7.5). Records:
`results/pilot/<window>/pilot.json`, `controls.jsonl`, `pilot_freeze.json` (sealed). Full tables:
[results/tables/pilot.md](results/tables/pilot.md).

## 1. Amendment 1 (post-outcome, disclosed)

The first pilot run failed the shareAbove machinery check in all three windows and stopped before writing any pilot
freeze. The check pooled *eligible* controls (centre drawdown ≤ $35k and ≥ 4 funded lots): pooled shareAbove 0.406 /
0.412 / 0.411 over only 40 / 42 / 26 controls. The same records over **all** 360 controls give 0.505 / 0.516 / 0.519,
over the **active** ones (≥ 4 lots, any drawdown) 0.504 / 0.517 / 0.519, and over the active drawdown-infeasible ones
0.517 / 0.532 / 0.527. Conditioning on a low centre drawdown keeps the centres that happened to avoid a losing lot;
their neighbours regress. That is a selection on a centre outcome — exactly what a test of an unbiased sampler must not
contain — not a bias of the perturbation. Fable's design (NEIGHBORHOOD §8.3) specified "active controls"; this
protocol's "eligible" had been an unlisted transcription change.

Amendment 1 (PROTOCOL §24; `results/amendments.jsonl`, hash-chained from the frozen head) restores "active controls"
and reports every pool. It was recorded **after** the pilot's records existed, which the protocol's amendment rule does
not normally allow; it is disclosed here and in the final report as a judgement call the user may reject. It changes no
constant, gate, ranking or selection: the references and n_D come from the unchanged §6.3/§7.5 mapping applied to the
same records, and no candidate existed. The first run's records are kept in `results/pilot/<window>/first-run/`; the
re-run reproduced each window's `controls.jsonl` **byte for byte**.

## 2. Machinery checks (all pass after the amendment)

| Window | shareAbove (active, ties ½) | Zero amplitude | Replay = engine (72 neighbours) | Reflection: out of box / corner move freq. / pilot boundary move freq. (samples) |
|---|---:|---|---|---|
| fold-a | 0.504 (330 controls) | exact | 0 differences | 0 / 0.656 / 0.669 (27,904) |
| fold-b | 0.517 (335) | exact | 0 differences | 0 / 0.667 / 0.665 (27,904) |
| final | 0.519 (346) | exact | 0 differences | 0 / 0.667 / 0.662 (27,904) |

## 3. What unoptimized pools look like

- **Random pools mostly lose and mostly breach the drawdown ceiling.** Few random configurations are drawdown-feasible
  at their centre (final window: 17 of 40 one-book, 13 two-book, 8 three-book, 2 four-book, none with ≥ 5 books), and
  median centre nets turn negative from about five books on: an arbitrary D1 vector on an arbitrary ETF is not a
  profitable book, and one shared lot amplifies bad timing.
- **Roughness grows with cardinality.** Median neighbourhood MAD rises from about $5k (one book) to about $25k (16
  books) in the final window; shareAbove medians sit near 0.5 in every stratum (no systematic selection at the centre).
- **Activity:** median funded lots rise from 15 (one book) to 57 (16 books) on the final window.
- **Persistence (final window, 26 eligible controls):** Spearman(raw net to 2021-12-31, net 2022–2023) = −0.006 and
  Spearman(N1 P50 to 2021-12-31, net 2022–2023) = 0.023. For random pools neither the raw nor the smoothed statistic
  predicts the next two years; the smoothed one does **not** beat the raw one by ≥ 0.10. This is no support for the
  smoothed objective from random configurations (stated, as predeclared, either way).

## 4. The benchmarks under the new instrument (reflection, common random numbers; never comparable with the 16-ETF clamped figures)

| Window | | Centre net (E0) | P50 | Q25 | DDmed | DD90 | feasShare | shareAbove |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| final | B1 | $135,359 | $91,688 | $74,123 | $21,334 | $27,296 | 1.00 | 0.00 |
| final | B4 | $242,196 | $133,125 | $115,928 | $36,858 | $51,162 | 0.42 | 0.00 |
| final | B5 | $388,489 | $205,455 | $172,599 | $36,768 | $57,609 | 0.38 | 0.00 |
| fold-b | B5 | $217,544 | $158,438 | $140,630 | $32,556 | $39,568 | 0.70 | 0.00 |
| fold-a | B5 | $171,036 | $98,726 | $84,682 | $33,121 | $38,894 | 0.66 | 0.00 |

The benchmarks' peaks sit far above their neighbourhoods (shareAbove ≈ 0: no neighbour beats the centre) — the
signature of vectors selected on these years. B5's smoothed training figure is about 53% of its peak.

## 5. Severity of Fable's uncalibrated hard F2 (diagnosis only; F2 is not a rule in this protocol)

DDmed ≤ $35k and DD90 ≤ $45k would have rejected 10 of 40 (fold-a), 9 of 42 (fold-b) and 3 of 26 (final) eligible
controls — and, on the final window, **B4 and B5 themselves** (DDmed ≈ $36.8k, DD90 $51–58k). As a hard veto it would
have recreated the 16-ETF failure mode; it enters only as the soft, capped penalty of §6.2.

## 6. The frozen constants (applied mechanically)

| Window | n_D | References R_m / R_t by stratum |
|---|---:|---|
| fold-a | 12 | k ≤ 5: $35,000 / $45,000 (floors); 6: $35,379 / $49,061; 8, 12, 16: $48,649 / $62,644 (calibrated, pooled strata) |
| fold-b | 12 | k ≤ 6: floors; 8, 12, 16: $45,438 / $54,295 (calibrated, pooled) |
| final | 12 | every stratum: floors $35,000 / $45,000 (the eligible controls' Q75 are below the floors) |

n_D: the median subsampled standard error of P50 at 12 draws (finite-population corrected) was $2,781 / $3,928 /
$3,126, far below the $12,500 target, so the smallest candidate, 12, applies. These random controls have small
dispersions; the leaders' neighbourhoods are rougher (B5's MAD is $31k on the final window), so a 12-draw P50 is a
noisy ranking statistic at the top of the archive — which is why promotion (96 draws), refinement (48) and the
confirmation batches (256 each) re-estimate everything that is selected. Large pools in the fold windows get higher
references (their typical neighbourhood drawdowns are higher); the final window's references are the user's floors,
so every dollar of DDmed above $35k and every dollar of DD90 above $45k is penalized (×1 and ×0.5) in the final round.
A calibrated reference above a floor is not an endorsement of that drawdown for live trading.
