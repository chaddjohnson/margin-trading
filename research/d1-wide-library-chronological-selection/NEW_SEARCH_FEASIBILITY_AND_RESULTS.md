# NEW-SEARCH — feasibility, budget and results (training only)

**Evidence level: training only.** Every figure here comes from a fold's own training window; no evaluation-window
figure enters this report. Records: `results/search/<fold>/SEARCH.json` (sealed; candidates in the git-ignored
`candidates.jsonl.gz`, sha256 in the record), `results/parity/SAMPLE_PARITY_<fold>.json`. Protocol: `PROTOCOL.md` §5.

## Why a new search was run (frozen triggers, PROTOCOL §5.1)

| Trigger | Rule | fold-a archive | fold-b archive | Raised? |
|---|---|---:|---:|---|
| T-a few families | < 12 credible families in > 20% of ETFs | 18% | 15% | no |
| T-b dominance | one family holds ≥ 50% of the top 32 credible by J_s in > 20% of ETFs | 93% | 89% | **yes** |
| T-c legal | T1 needs fold-A candidates evaluable 2022–2023; archived fold-a vectors are barred after 2021-12-31 | — | — | **yes** (by construction) |
| T-d objective | the archive's refinement stage was steered by J_s (best-trade subtraction) | — | — | **yes** (structural) |

T-b is the substantive training-side finding: the archive's best region is almost always one family of local-search
clones (the source refined only the top 4 starts by J_s), so its top 32 rarely holds more than one or two behaviours.
T-c alone would have required new fold-A candidates for the nested design.

## Procedure and budget (as frozen)

Per ETF and fold: the first 1,024 unique grid vectors of the ETF's scrambled Sobol stream
(`sobolVectors(symbol, 1024, 'd1-wide-library-v1:new-search')`, the source's box and quantization; the same design in
every fold, so folds are paired); up to 8 refinement starts from distinct credible Sobol families by quota (4 by T, 2 by
order-independent support, 2 by lowest minute drawdown); 2 rounds × 8 moves per start (the source's operators), moving
only to a credible move with strictly higher **T = net − DD excess over $20,000 − worst-lot loss beyond $10,000** (no
best-trade deduction); at most 128 refinements per ETF and fold. Collision guard: every archived Sobol grid and the
local-search grids of source windows ending on or before the fold's cutoff (later-window grids would only be flagged).

| Fold | Training through | Evaluations | Sobol | Refinements | Credible | ETFs with no credible vector | Refinement starts | Collisions dropped | Later-window collisions kept | Redraws (duplicates) | UTC |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| S18 | 2018-12-31 | 67,008 | 62,464 | 4,544 | 5,381 | 12 | 284 | 0 | 0 | 349 | 23:49:24–23:51:56 |
| S19 | 2019-12-31 | 68,848 | 62,464 | 6,384 | 12,648 | 7 | 399 | 0 | 0 | 492 | 23:56:49–23:59:33 |
| A | 2020-06-30 | 69,312 | 62,464 | 6,848 | 14,606 | 4 | 428 | 0 | 0 | 523 | 00:07:34–00:10:26 |
| S20 | 2020-12-31 | 69,328 | 62,464 | 6,864 | 16,321 | 4 | 429 | 0 | 0 | 497 | 00:20:21–00:23:19 |
| B | 2021-12-31 | 69,184 | 62,464 | 6,720 | 14,140 | 5 | 420 | 0 | 0 | 519 | 00:48:07–00:51:19 |
| S22 | 2022-12-30 | 69,600 | 62,464 | 7,136 | 13,244 | 3 | 446 | 0 | 0 | 511 | 01:06:38–01:10:04 |

Total **413,280 evaluations** (budget ≤ 421,632), 14 worker threads on a 16-thread AMD Ryzen 7 9800X3D, 2.5–3.5 min per
fold. Refinements average 75–117 per ETF: an ETF with fewer than 8 credible families has fewer starts, and the unused
budget is never reallocated; no move was skipped. The pre-freeze outcome-free count of the design's collisions
with every archived grid was 0 (`results/archive/NEW_SOBOL_COLLISIONS_PREFREEZE.json`).

**Engine-versus-fast parity** (per fold, after its search, before its libraries; per ETF the top-J_s credible and one
hash-chosen archived row, one hash-chosen new Sobol row and one refinement row, re-run on the full N-book engine on the
training window; 10 fields to the cent): S18 1,100 / S19 1,150 / A 2,360 / S20 1,180 / B 2,350 / S22 1,190 checks —
**9,330 checks on 933 vectors, 0 failures**.

**Determinism:** a pre-freeze, training-only dry run of S18 (disclosed in PROTOCOL §0; loads capped at 2018-12-31) and
the official post-freeze S18 run produced byte-identical candidates (`797c5c13…`), nominee digest (`3f0ff3ea…`),
library digest (`f346367d…`), member records and library CSV (`results/dryrun-S18-prefreeze/DRYRUN_DIGESTS.json`).

## How the new pools differ from the archive (training only)

| Fold | Pool | Candidates per ETF | ETFs with a credible vector | Median credible families | ETFs with ≥ 8 / 16 / 32 / 64 families |
|---|---|---:|---:|---:|---|
| A | ARCH (archive: 2,048 Sobol + J_s local search) | ≈ 2,254 | 57 | 40 | 53 / 48 / 36 / 11 |
| A | ARCH-S (first 1,024 archived Sobol rows) | 1,024 | 57 | 26 | 49 / 43 / 20 / 3 |
| A | NEW (1,024 Sobol + ≤ 128 T-refinements) | ≈ 1,136 | 57 | 27 | 51 / 47 / 24 / 4 |
| A | NEW-S (new Sobol only) | 1,024 | 57 | 26 | 50 / 44 / 21 / 3 |
| A | ALL (ARCH ∪ NEW) | ≈ 3,390 | 57 | 49 | 54 / 50 / 41 / 17 |
| B | ARCH | ≈ 2,277 | 57 | 59 | 53 / 50 / 48 / 28 |
| B | ARCH-S | 1,024 | 56 | 37 | 50 / 48 / 39 / 9 |
| B | NEW | ≈ 1,134 | 56 | 38 | 51 / 49 / 40 / 10 |
| B | NEW-S | 1,024 | 56 | 35 | 50 / 48 / 38 / 9 |
| B | ALL | ≈ 3,411 | 57 | 76 | 53 / 51 / 48 / 37 |

- **Budget-matched pools look alike.** ARCH-S and NEW-S (two independent 1,024-point Sobol designs) give nearly the
  same family counts in both folds; the archive's extra ~1,230 evaluations per ETF (another 1,024 Sobol points and
  ~200 local-search rows) add families, and its J_s local search adds clones of one family.
- **The refinements barely add diversity** (NEW vs NEW-S: +1 to +3 median families): by design they move from distinct
  starts toward higher T inside or near the start's family.
- **No NEW vector of NEW or NEW-S shares a training trade signature with an archived vector of its fold** and none
  equals an incumbent's grid. The selection records' flag list (215 in fold A, 290 in fold B, all in the ALL pool) is
  a defect of the flag rule: it also compares ALL's archive-provenance members with themselves — all 505 flagged
  vectors are of archive provenance. Restricted to new provenance (NEW, NEW-S and ALL's new members) the count is
  **0**. The flag is descriptive and enters no rule.
- The 2018 training window is short (1.55 armed years): 12 ETFs have no credible new vector and the median ETF has 7
  families; S18's evaluation is correspondingly thin (see `CHRONOLOGICAL_FOLD_COMPARISON.md`).

## What the new search does and does not show

- It shows that the archive's narrowness is mostly a property of its **refinement and selection**, not of the Sobol
  design: an independent design of half the size finds about as many families as the archive's first half.
- It does not show that new vectors are better: whether any procedure on these pools did better in its next window is
  the subject of `CHRONOLOGICAL_FOLD_COMPARISON.md` and `NESTED_SELECTION_AND_LATER_EVALUATION.md`.
- The new pools are separately costed procedures with extra multiple testing (`MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md`);
  no claim about any archived vector is made from NEW results.
