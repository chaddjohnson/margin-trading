# CPU/GPU parity report — risk-envelope delivery and the GPU Phase 7 campaign (deliverable C)

Non-official evidence (purposes `parity-test` / `benchmark`) on Apollo, RTX 5090 `GPU-ae5f222c…`, final binary
`research/gpu-phase7/build/gb7` sha256 `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82`, Node v24.21.0
`--no-maglev`, source HEAD `ed3cf5c5`. Every comparison is **exact** (canonical bit-pattern hashes of complete values;
zero tolerance). No figure here is a candidate, a selection or official optimization evidence; nothing of the pilot ran.

**Verdict: no discrepancy.** Every compared value was identical between the GPU (through `GpuPool` → `EvalLab`) and the
TypeScript/CPU reference, and every sealed historical figure checked was reproduced exactly. The only non-trivial
observations are structural properties of the envelope itself (§5), not parity differences.

## 1. Parity campaign (gate A1; `chains/parity.sh`, 54 runs, record `results/parity/final/SUMMARY.json` `35e3c4a2…`)

| Total | Value |
|---|---:|
| runs | 54 |
| subjects compared (GPU vs CPU, complete records) | 144,795 |
| identical / mismatches | 144,795 / **0** |
| of which seeded random genomes | 141,600 |
| envelopes compared (detail + risk runs) | 64,033 (0 differing) |
| determinism runs (repeat, host-worker counts 0/1/8, orderings) | 176 |
| trades / lots / funding records / partial fills covered | 8,410,897 / 5,417,834 / 2,968,518 / 197,399 |
| Growth structures covered | 5,040 |
| doors | D19, D21, D23, D24, FULL, E-2020, E-2022, E-2025, S0–S7, W-BEAR, W-CRASH, W-QUIET, W-TREND |
| option sets | 18 (base, all, blackout, cost0/10/20, d1only, fund, ggdx, gonly, native, nextopen, periods, rate14, slip25, tie, vgtonly, whole) |
| CPU / GPU seconds | 3,651 / 448 |

FULL and the episode windows were opened only for identity comparisons (as in every earlier acceptance); no money figure
of them is reported. Per-run table (from `results/tables/parity.md`):

| run | door | options | detail | risk | subjects | identical | mismatches | envelopes | seconds |
|---|---|---|---|---|---|---|---|---|---|
| D19-bulk | D19 | base | false | false | 10,061 | 10,061 | 0 | 0 | 92 |
| D21-bulk | D21 | base | false | false | 10,061 | 10,061 | 0 | 0 | 140 |
| D23-bulk | D23 | base | false | false | 10,061 | 10,061 | 0 | 0 | 185 |
| D24-all | D24 | all | true | true | 1,561 | 1,561 | 0 | 1,561 | 104 |
| D24-blackout | D24 | blackout | true | true | 1,561 | 1,561 | 0 | 1,561 | 94 |
| D24-bulk-fine | D24 | base | false | false | 8,000 | 8,000 | 0 | 0 | 166 |
| D24-bulk | D24 | base | false | false | 26,000 | 26,000 | 0 | 0 | 492 |
| D24-core | D24 | base | false | false | 2,325 | 2,325 | 0 | 0 | 711 |
| D24-cost0 | D24 | cost0 | true | true | 1,561 | 1,561 | 0 | 1,561 | 98 |
| D24-cost10 | D24 | cost10 | true | true | 1,561 | 1,561 | 0 | 1,561 | 98 |
| D24-cost20 | D24 | cost20 | true | true | 1,561 | 1,561 | 0 | 1,561 | 98 |
| D24-d1only | D24 | d1only | true | true | 1,561 | 1,561 | 0 | 1,561 | 78 |
| D24-detail | D24 | base | true | true | 3,117 | 3,117 | 0 | 3,117 | 1161 |
| D24-fund | D24 | fund | true | true | 1,561 | 1,561 | 0 | 1,561 | 83 |
| D24-ggdx | D24 | ggdx | true | true | 1,561 | 1,561 | 0 | 1,561 | 111 |
| D24-gonly | D24 | gonly | true | true | 1,561 | 1,561 | 0 | 1,561 | 60 |
| D24-growth-first | D24 | base | true | true | 1,561 | 1,561 | 0 | 1,561 | 97 |
| D24-native | D24 | native | true | true | 1,561 | 1,561 | 0 | 1,561 | 95 |
| D24-nextopen | D24 | nextopen | true | true | 1,561 | 1,561 | 0 | 1,561 | 98 |
| D24-periods | D24 | periods | true | true | 1,561 | 1,561 | 0 | 1,561 | 107 |
| D24-rate14 | D24 | rate14 | true | true | 1,561 | 1,561 | 0 | 1,561 | 98 |
| D24-slip25 | D24 | slip25 | true | true | 1,561 | 1,561 | 0 | 1,561 | 99 |
| D24-tie | D24 | tie | true | true | 1,561 | 1,561 | 0 | 1,561 | 99 |
| D24-vgtonly | D24 | vgtonly | true | true | 1,561 | 1,561 | 0 | 1,561 | 77 |
| D24-whole | D24 | whole | true | true | 1,561 | 1,561 | 0 | 1,561 | 97 |
| E-2020 | E-2020 | base | true | true | 3,061 | 3,061 | 0 | 3,061 | 33 |
| E-2022 | E-2022 | base | true | true | 3,061 | 3,061 | 0 | 3,061 | 33 |
| E-2025 | E-2025 | base | true | true | 3,061 | 3,061 | 0 | 3,061 | 36 |
| FULL-all | FULL | all | true | true | 1,033 | 1,033 | 0 | 1,033 | 96 |
| FULL-bulk | FULL | base | false | false | 12,000 | 12,000 | 0 | 0 | 290 |
| FULL-core | FULL | base | false | false | 2,213 | 2,213 | 0 | 0 | 872 |
| FULL-detail | FULL | base | true | true | 2,061 | 2,061 | 0 | 2,061 | 150 |
| FULL-nextopen | FULL | nextopen | true | true | 1,033 | 1,033 | 0 | 1,033 | 92 |
| FULL-periods | FULL | periods | true | true | 1,033 | 1,033 | 0 | 1,033 | 102 |
| S0-all | S0 | all | true | true | 328 | 328 | 0 | 309 | 3 |
| S0-base | S0 | base | true | true | 456 | 456 | 0 | 456 | 23 |
| S1-all | S1 | all | true | true | 328 | 328 | 0 | 328 | 2 |
| S1-base | S1 | base | true | true | 456 | 456 | 0 | 456 | 15 |
| S2-all | S2 | all | true | true | 328 | 328 | 0 | 321 | 3 |
| S2-base | S2 | base | true | true | 456 | 456 | 0 | 456 | 19 |
| S3-all | S3 | all | true | true | 328 | 328 | 0 | 323 | 2 |
| S3-base | S3 | base | true | true | 456 | 456 | 0 | 456 | 18 |
| S4-all | S4 | all | true | true | 328 | 328 | 0 | 328 | 2 |
| S4-base | S4 | base | true | true | 456 | 456 | 0 | 456 | 14 |
| S5-all | S5 | all | true | true | 328 | 328 | 0 | 325 | 2 |
| S5-base | S5 | base | true | true | 456 | 456 | 0 | 456 | 17 |
| S6-all | S6 | all | true | true | 328 | 328 | 0 | 328 | 2 |
| S6-base | S6 | base | true | true | 456 | 456 | 0 | 456 | 12 |
| S7-all | S7 | all | true | true | 328 | 328 | 0 | 321 | 2 |
| S7-base | S7 | base | true | true | 456 | 456 | 0 | 456 | 16 |
| W-BEAR | W-BEAR | base | true | true | 3,061 | 3,061 | 0 | 3,061 | 40 |
| W-CRASH | W-CRASH | base | true | true | 3,061 | 3,061 | 0 | 3,061 | 36 |
| W-QUIET | W-QUIET | base | true | true | 3,061 | 3,061 | 0 | 3,061 | 30 |
| W-TREND | W-TREND | base | true | true | 3,061 | 3,061 | 0 | 3,061 | 46 |

## 2. Sealed historical results reproduced (gates A2, A3)

| Check | Result | Record |
|---|---|---|
| A2: Assignment 3's 48 sealed C24 finalists (incl. New L0, N/original, C4, C4R) on D24, compact + detail: CPU = GPU | 96/96 identical; sealed net and DD equal 48/48 | `results/parity/finalists.json` `9aa198ae…` |
| A3: Assignment 3 C19 broad1 replay (64 lanes, 1,242,714 fresh evaluations), plain | = sealed lane results (0 differences) | `results/compare/a3-plain-vs-sealed.json` `f47f4cde…` |
| A3: the same replay **with the envelope requested** on every evaluation | = sealed lane results after stripping the 192 envelope-bearing values (0 differences): requesting the envelope does not change search behaviour | `results/compare/a3-risk-vs-sealed.json` `6a39bb14…` |
| A3: Assignment 2 C19 base replay (128 lanes, 2,196,920 fresh evaluations) | = sealed (0 differences) | `results/compare/a2-plain-vs-sealed.json` `466e07e0…` |

Frozen references, reproduced exactly on D24 (GPU = CPU = sealed): **New L0** net $382,721.46, DD $19,459.83;
**N/original** (`C24/informed/GD.VB/R2#1`) net $388,031.02, DD $19,459.83; C4 $302,785.91 / $17,332.09;
C4R $360,569.71 / $17,280.74.

## 3. Risk-delivery parity through the EvalLab (gates R1–R3; `tools/gpu-phase7/risk-parity.ts`)

- **R1** every delivered value (record + envelope; canonical bit-pattern hash) GPU = CPU, risk and plain items alike.
- **R2** requesting the envelope never changes the record (risk value minus `envelope` = plain record, both backends);
  for the edge runs, additionally the plain record = the row archived by Assignment 3 in the restored search archive.
- **R3** `src/risk-envelope/policy.ts` `assess()` under `nl0-control` and `re-40-25-25` gives identical checks,
  pass/fail and violation for GPU and CPU values, and the qualified and constrained rankings have the same order.

Edge subjects (engineering only, not candidates): `tools/gpu-phase7/edge-subjects.py` drew, read-only from the restored
archives, 300 configurations with archived DD within ±1 % of $35k, 300 within ±1 % of $40k and 400 in the band between
(`results/risk-parity/edge-subjects-D21.json` `6ee8d7ae…`, `-D24.json` `0ebe2ae5…`).

| run | door | options | subjects | items | R1 differing | R2 differing | archive compared / differing | R3 differing | rankings identical | pass |
|---|---|---|---|---|---|---|---|---|---|---|
| edge-D21 | D21 | base, cost10 | 1,000 | 4,000 | 0 | 0 | 1,000 / 0 | 0 | true | true |
| edge-D24 | D24 | base, cost10 | 1,000 | 4,000 | 0 | 0 | 1,000 / 0 | 0 | true | true |
| finalists-D24 | D24 | base, cost10, cost0, rate14 | 48 | 384 | 0 | 0 | 0 / 0 | 0 | true | true |
| random-D19 | D19 | base, cost0 | 1,000 | 4,000 | 0 | 0 | 0 / 0 | 0 | true | true |

Records: `edge-D21.json` `d3ca8add…`, `edge-D24.json` `fb0ae3d0…`, `finalists-D24.json` `3daed687…`, `random-D19.json`
`82a6f7d4…` (all in `results/risk-parity/`). Items = subjects × option sets × {risk, plain}.

## 4. Threshold census and policy disagreement (base option set; engineering subjects)

Counts of members whose value lies within ±1 % of each limit, the closest distance to the $35k/$40k DD limits, and the
decisions of the two policies (`nl0-control`: DD ≤ $35,000; `re-40-25-25`: DD ≤ $40,000, trade principal loss
(liquidation) ≤ $25,000, banked DD (liquidation) ≤ $25,000; value = limit passes). "EXP fails" counts failing metrics
(a member can fail several).

| run | ±1 % of $35k DD | ±1 % of $40k DD | ±1 % of $25k PL | ±1 % of $25k BD | closest to $35k / $40k (|Δ| $) | control pass | experimental pass | control only | experimental only | EXP fails: DD / PL / BD |
|---|---|---|---|---|---|---|---|---|---|---|
| edge-D21 | 304 | 304 | 16 | 33 | 0.20 / 0.67 | 490 | 519 | 88 | 117 | 183 / 114 / 432 |
| edge-D24 | 306 | 304 | 7 | 28 | 0.65 / 0.10 | 408 | 401 | 122 | 115 | 242 / 63 / 564 |
| finalists-D24 | 0 | 0 | 0 | 0 | 4641.58 / 9641.58 | 48 | 48 | 0 | 0 | 0 / 0 / 0 |
| random-D19 | 20 | 19 | 6 | 16 | 0.74 / 1.47 | 492 | 476 | 58 | 42 | 376 / 97 / 507 |

Reading (the protocol cites this section): on the 1,000 near-threshold engineering configurations per door, **20.5 %
(D21) and 23.7 % (D24) passed exactly one of the two policies**; experimental-only passes (DD between $35k and $40k with
both 25 % gates met) were roughly balanced by control-only passes (DD ≤ $35k but a 25 % gate exceeded). Banked DD
(liquidation) > $25k was the most frequent experimental failure (432 / 564 members), ahead of DD > $40k (183 / 242) and
trade principal loss > $25k (114 / 63). The experimental envelope is therefore **not a pure relaxation** of the control.
These subjects were picked by DD to stress the limits; they say nothing about how often the gates bind in a real search.
At the finalists (D24) no limit is within 1 %: the closest DD is $4,641.58 below $35k.

Every value was computed exactly on both backends, so these decisions are identical GPU vs CPU (R3, 0 differing).

## 5. Selected candidate records (frozen references, D24, GPU = CPU, envelope in dollars)

| Reference | Options | Net | Marked DD | Banked DD marked / liquidation | Trade principal loss marked / liquidation | Control | Experimental |
|---|---|---:|---:|---:|---:|---|---|
| New L0 | base | 382,721.46 | 19,459.83 | 10,335.73 / 10,383.82 | 8,046.67 / 8,092.81 | pass | pass |
| N/original | base | 388,031.02 | 19,459.83 | 10,335.73 / 10,383.82 | 8,046.67 / 8,092.81 | pass | pass |
| N/original | cost10 | 384,383.34 | 19,651.95 | 10,477.72 / 10,573.85 | 8,092.76 / 8,185.00 | pass | pass |
| N/original | cost0 | 391,682.36 | 19,267.52 | 10,193.59 / 10,193.59 | 8,000.52 / 8,000.52 | pass | pass |
| N/original | rate14 | 371,263.90 | 19,673.53 | 10,475.45 / 10,523.54 | 8,137.08 / 8,183.22 | pass | pass |
| C4 | base | 302,785.91 | 17,332.09 | 10,335.73 / 10,383.82 | 8,833.16 / 8,878.83 | pass | pass |
| C4R | base | 360,569.71 | 17,280.74 | 10,335.73 / 10,383.82 | 8,833.16 / 8,878.83 | pass | pass |

New L0's row is the byte-identical GPU and CPU archive row of job `riskpar-finalists-D24-{gpu,cpu}` (key
`…a2e385640ca61012|risk`); the others are `selected[]` of `finalists-D24.json`. Liquidation ≥ marked holds in every value;
at 0 bps costs liquidation = marked (as required). The identical banked-DD figures across New L0, N/original, C4 and C4R
come from their shared D1:GDX book's episode (same window); New L0 and N/original are frozen and unchanged.

## 6. Structural checks of the envelope (all runs)

| Property | Result |
|---|---|
| trade principal loss (marked) ≤ marked DD | 0 exceptions (all four runs) |
| banked DD (marked) ≤ marked DD | 1 (edge-D24) + 3 (random-D19) exceptions — expected: the relation holds only when no partial sale happens while the remainder is under water (then a banked level is not a marked value the tracker has seen; `research/vg-l0-risk-metrics/SELECTION_PIPELINE_AUDIT.md` §3); both backends agree exactly |
| liquidation ≥ marked (both pairs) | every value (enforced by `checkEnvelope`; a violation would fail the job) |
| liquidation = marked at 0 bps | true (finalists-D24 cost0, random-D19 cost0) |

## 7. Fixed-seed mini-optimization and qualification (gates A4, Q1)

| comparison | identical | envelopes stripped | lanes | archived (a / b) | differing rows | lane differences |
|---|---|---|---|---|---|---|
| a2-plain-vs-sealed | true | — | 128 | — | — | 0 |
| a3-plain-vs-sealed | true | — | 64 | — | — | 0 |
| a3-risk-vs-sealed | true | 192 | 64 | — | — | 0 |
| mini-concurrent-plain-vs-ref | true | — | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-concurrent-risk-vs-ref | true | — | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-gpu-vs-cpu | true | — | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-killed-resumed-vs-ref | true | — | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-risk-gpu-vs-cpu | true | — | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-risk-vs-plain | true | 32 | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-stopped-resumed-vs-ref | true | — | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-w0-vs-w8 | true | — | 16 | 30,749 / 30,749 | 0 | 0 |
| mini-w1-vs-w8 | true | — | 16 | 30,749 / 30,749 | 0 | 0 |

All nine A4 comparisons (and the risk-vs-plain identity) are identical: CPU = GPU, 0/1/8 host workers, stopped and
SIGKILLed jobs resumed, two concurrent jobs, risk on and off. **Q1** (`results/qualify/mini-risk.json` `700bc5f7…`):
the 30,749 risk evaluations of the GPU and CPU mini jobs give 61,498 identical assessments (0 differing); qualified
counts 28,102 (control) and 27,793 (experimental), same qualified and constrained order for both policies.

## 8. Sanitizer (gate A5; `results/sanitizer-final/sanitizer.json` `c9c4840e…`)

memcheck (leak check full), racecheck, initcheck, synccheck on gb7 with risk mode: 0 errors, 0 hazards, 0 leaked bytes;
97/97 subjects identical under each tool.

## 9. Scaling (Phase E, diagnostic, not an acceptance gate; `SCALING_CHECKS.md`)

$100k / $250k / $500k on 148 configurations per door (D24 `450e0193…`, D21 `6bd4fb0d…`): trade chronology and every
policy decision identical; worst dollar deviation 2.8e-15 × C0 (criterion < 1e-12 × C0, amendment A1).

## 10. Discrepancies

None. Two disclosed non-evidence items: the dev runs (AMENDMENTS D0, D1) and the scaling criterion change (A1).
