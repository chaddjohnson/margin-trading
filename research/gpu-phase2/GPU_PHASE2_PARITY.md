# GPU Phase 2 — parity evidence

**Standard: bit-identical, zero tolerance** (IEEE-754 binary64; PROTOCOL.md §6, §9). Every comparison below is an
exact equality of canonical hashes or values; no tolerance, rounding or ULP allowance is used anywhere. All runs use
the frozen final binary `3fe09e6791ff9996bc4f463c43e7d8dff46600ca3bcbf0d7777be155301e13fc` (compat
`f67dcb3b…daea`) unless labelled development.

## 1. What is compared

| Object | Content compared | How |
|---|---|---|
| Every book (D1·GDX, D1·VGT, Growth·GDX, Growth·VGT) | every virtual trade: kind, decision and signal times/prices, entry fill, every exit fill (time, price, shares, reason, partial flag), nets, interest, open/unfilled state; standalone figures (realized, marked net, minute and daily drawdown with instants) | `canonHash(books.map(bookView))` — bit patterns of every number, insertion-ordered keys (`src/gpu-backend/canon.ts`) |
| Pooled replay | every lot (book, trade, shares, principal, fills, worst/best marks), every funding decision and refusal with its reason and occupant, marks, strict minute/session trackers, daily closes, period drawdowns, peaks | `canonHash(poolView(result))` |
| Fitness inputs | the compact record (`recordOf`) or the detailed record (`riskInputsOf`) | `canonHash(record)` |
| Risk-envelope inputs | banked-capital drawdown and maximum trade principal loss, marked and liquidation bases | exact equality of the four numbers |
| Optimizer | lane results (screens, promotions, islands and trigger logs, rung fits, refinements, shortlists, frontiers, top-by-net, failure reasons), extension rounds, every archived evaluation (key → record hash) and configuration | deep equality / sha256 in the sealed records' encoding (±Infinity and NaN kept distinct) |

The CPU side is an **independent reference**: the canonical engine run fresh per subject (`runWithControls2` with
caches off, then `evaluate` / `evaluateDetail` and the risk-metric functions), in 12 child processes
(`src/gpu-phase2/cpuRefWorker.ts`). The GPU side is the server's books and pooled replay; the records are the unchanged
CPU reductions of that GPU evidence.

## 2. The FINAL parity campaign (gates G1–G6)

`chains/parity.sh` with `PARITY_OUT=results/parity/final`, 2026-11-19 03:05 → 04:56Z, every run a contained sub-unit, fail-fast; summary `results/parity/final/SUMMARY.json` (all checks true). **54 runs, 144,795 candidates, 144,795 identical, 0 mismatches.**

| Coverage | Value |
|---|---|
| Seeded random Assignment 3 genomes (set A, coarse and fine grids) | 141,600 (≥ 100,000 required) |
| Growth-structure strata (G: every value of each of the 8 structural genes, random numerics) | 2,828 |
| Branch-heavy D1 designs and box corners (B); neighbourhoods of the references (N); references (R) | 64; 128; 175 |
| Distinct Growth structures exercised | 5,040 of 8,640 (every value of every structural gene; the capability preflight covers all 8,640) |
| Doors, windows, episodes, fixtures | D19, D21, D23, D24, E-2020, E-2022, E-2025, FULL, S0, S1, S2, S3, S4, S5, S6, S7, W-BEAR, W-CRASH, W-QUIET, W-TREND |
| Option sets | all, base, blackout, cost0, cost10, cost20, d1only, fund, ggdx, gonly, native, nextopen, periods, rate14, slip25, tie, vgtonly, whole (plus Growth-first tie order) |
| Risk-envelope inputs compared | 64,063 |
| Virtual trades / funded lots / funding decisions / partial fills compared | 8,379,431 / 5,384,434 / 2,918,811 / 199,087 |
| Determinism runs | 121 (11 per run in D24-core, FULL-core, D24-detail and S0–S7 base), all 0 |
| Binary / compat / device | one each: `3fe09e67…13fc` / `f67dcb3b…daea` / GPU-ae5f222c |
| CPU reference / GPU time | 3,652 s / 466 s (sum over runs) |

| Run | Door | Options | Detail + risk | Candidates | Identical | Mismatches | Envelopes | Determinism |
|---|---|---|---|---:|---:|---:|---:|---|
| D19-bulk | D19 | base | — | 10,061 | 10,061 | 0 | 0 | — |
| D21-bulk | D21 | base | — | 10,061 | 10,061 | 0 | 0 | — |
| D23-bulk | D23 | base | — | 10,061 | 10,061 | 0 | 0 | — |
| D24-all | D24 | all | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-blackout | D24 | blackout | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-bulk-fine | D24 | base | — | 8,000 | 8,000 | 0 | 0 | — |
| D24-bulk | D24 | base | — | 26,000 | 26,000 | 0 | 0 | — |
| D24-core | D24 | base | — | 2,325 | 2,325 | 0 | 0 | all 0 (11 runs) |
| D24-cost0 | D24 | cost0 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-cost10 | D24 | cost10 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-cost20 | D24 | cost20 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-d1only | D24 | d1only | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-detail | D24 | base | yes | 3,117 | 3,117 | 0 | 3,117 | all 0 (11 runs) |
| D24-fund | D24 | fund | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-ggdx | D24 | ggdx | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-gonly | D24 | gonly | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-growth-first | D24 | base (Growth first) | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-native | D24 | native | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-nextopen | D24 | nextopen | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-periods | D24 | periods | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-rate14 | D24 | rate14 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-slip25 | D24 | slip25 | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-tie | D24 | tie | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-vgtonly | D24 | vgtonly | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| D24-whole | D24 | whole | yes | 1,561 | 1,561 | 0 | 1,561 | — |
| E-2020 | E-2020 | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| E-2022 | E-2022 | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| E-2025 | E-2025 | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| FULL-all | FULL | all | yes | 1,033 | 1,033 | 0 | 1,033 | — |
| FULL-bulk | FULL | base | — | 12,000 | 12,000 | 0 | 0 | — |
| FULL-core | FULL | base | — | 2,213 | 2,213 | 0 | 0 | all 0 (11 runs) |
| FULL-detail | FULL | base | yes | 2,061 | 2,061 | 0 | 2,061 | — |
| FULL-nextopen | FULL | nextopen | yes | 1,033 | 1,033 | 0 | 1,033 | — |
| FULL-periods | FULL | periods | yes | 1,033 | 1,033 | 0 | 1,033 | — |
| S0-all | S0 | all | yes | 328 | 328 | 0 | 328 | — |
| S0-base | S0 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| S1-all | S1 | all | yes | 328 | 328 | 0 | 328 | — |
| S1-base | S1 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| S2-all | S2 | all | yes | 328 | 328 | 0 | 327 | — |
| S2-base | S2 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| S3-all | S3 | all | yes | 328 | 328 | 0 | 328 | — |
| S3-base | S3 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| S4-all | S4 | all | yes | 328 | 328 | 0 | 328 | — |
| S4-base | S4 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| S5-all | S5 | all | yes | 328 | 328 | 0 | 328 | — |
| S5-base | S5 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| S6-all | S6 | all | yes | 328 | 328 | 0 | 318 | — |
| S6-base | S6 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| S7-all | S7 | all | yes | 328 | 328 | 0 | 328 | — |
| S7-base | S7 | base | yes | 456 | 456 | 0 | 456 | all 0 (11 runs) |
| W-BEAR | W-BEAR | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| W-CRASH | W-CRASH | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| W-QUIET | W-QUIET | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |
| W-TREND | W-TREND | base | yes | 3,061 | 3,061 | 0 | 3,061 | — |

Eleven candidates (S2-all 1, S6-all 10) are configurations that **both** engines refuse identically: the CPU engine throws its invariant "a profitable protective exit" and the GPU returns the matching per-candidate status 13; they are counted as identical refusals (no envelope exists). In an official run such a candidate stops the job on either engine.

## 3. Reference identities with Growth on the GPU (G4)

- New L0, N/original, IJ1, C4 and C4-refined are in every campaign run's reference set (`--refs`), on every door,
  window and option set, with detailed records and risk inputs where the run has them.

FINALISTS_SECTION

## 4. Complete optimizer jobs of Assignment 3, replayed on the GPU

| Job | Compared with | Result |
|---|---|---|
| C19 broad1 search (64 lanes, 1,242,714 fresh evaluations, 7,607 archive hits) | its sealed record `research/vg-l0-full-joint/results/search/C19/broad1.json` | **identical**: extension rounds and every lane result, fresh and archive-hit counts (`results/optimizer/compare-a3-C19-broad1.json`) |
| C19 broad qualification (385 members, 251,405 evaluations: detailed centres, 5 stresses, removal reruns, selection and confirmation neighbourhoods; 377 qualified) | `research/vg-l0-full-joint/results/folds/C19/broad-qualification.json` | **identical** evidence for every member (`results/optimizer/compare-a3-C19-broad-qualification.json`) |

So the fitness inputs, gates, ranks, promotions, extension decisions, refinement endpoints, shortlists and the
qualification verdicts of a real study are reproduced exactly by the GPU.

The first search replay (run 1) is kept as a timing sample only: its record wrote non-finite values as `null`
(91 fields, all ±Infinity/NaN; nothing else differed), which cannot carry the sign; run 2 used the sealed encoding.

## 5. Fixed-seed mini-optimization (G7)

Assignment 3's broad job body and `Lane` (unchanged) on D19, 8 cells × 2 replicates, a reduced declared schedule
(screen 96, promote 12, islands 2–3, population 8, 24 new per island, rungs 8 / 16 / 24, refinement 6, shortlist 2):

| Comparison (final binary, run g7f) | Lanes | Archived evaluations | Configurations | Differences |
|---|---:|---:|---:|---:|
| CPU (12 workers) vs GPU | 16 | 30,749 = 30,749 | 5,746 = 5,746 | **0** |
| GPU vs GPU interrupted after 2,000 fresh evaluations and resumed | 16 | 30,749 = 30,749 | 5,746 = 5,746 | **0** |

Identical proposals and IDs, archived records, fitness inputs, gates, ranks, promotions, extension decisions,
refinement endpoints and finalists (`results/optimizer/compare-g7f-cpu-vs-gpu.json`,
`compare-g7f-gpu-vs-resumed.json`). The development runs g7 and g7p (before the final binary) gave the same result.

## 6. Determinism (G5)

Batch sizes 1, 7, 13, 16, 32, 50, 64, 128 and the large primary batch (4,096), a shuffled order, a repeat in the same
process and a server restart, on a 256-subject subset in the D24-core, FULL-core, D24-detail and fixture runs of the
campaign (§2): 121 determinism runs, every one with 0 differences from the primary batch. Every benchmark repetition (3 per point, batch 1 to 49,152) returned the identical
record hash (`results/bench/bench.json`).

## 7. Other bit-exact evidence

| Evidence | Result |
|---|---|
| V8 `Math.log` / `Math.exp` port (`v8math.cuh`) | 10,000,000 inputs, 0 mismatches on the GPU and the host (`results/parity/v8math.json`) |
| Struct layout TypeScript ↔ C++ | every size and field offset equal (`src/gpu-backend/tests/layout.test.ts`) |
| Benchmark CPU baseline vs GPU on the same tasks | 26,400 records (D19, D24, FULL joint; D24 D1-only, Growth-only, Growth-fixed, detail + risk, all options), 0 differing |
| compute-sanitizer runs (final binary) | 97 subjects (references, every Growth structural value, 64 random; detail + risk, blackouts, period boundaries) identical to the CPU under each of the four tools |
| Capacity retry | records after a GPU capacity overflow and retry equal the normal-capacity run (negative tests) |
| Pre-final D24-core (development) | 2,325 / 2,325 identical; determinism 0 at all batch sizes |

## 8. Edge cases

The synthetic fixtures S0–S7 (seeded regime phases with gaps, holidays, missing minutes, sessions without a closing
print, threshold equalities) run with the base options and with all options at once (§2). Data refusals (empty
session, invalid prices, non-integer or non-increasing times, corrupted dataset file) are negative tests
(`GPU_PHASE2_POLICY_AND_ENFORCEMENT.md` §3.2).

## 9. Differences

**None.** No CPU/GPU difference of any size was found in any final record. No tolerance was introduced, and no
comparison was loosened.
