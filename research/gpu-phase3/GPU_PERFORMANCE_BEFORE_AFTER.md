# GPU performance — before (accepted Phase 2 path) and after (Phase 3 host pipeline)

All figures are **measured on Apollo** (RTX 5090 `GPU-ae5f222c…`, Ryzen 7 9800X3D 8 cores / 16 threads, 59 GiB, Node
v24.21.0) unless a row says *estimate*. Timings only (AD7: no money figure of any searched configuration). **Every run
is reported**; none was dropped. Machine-readable: `results/bench/before-after.json` (every run's profile),
`results/optimizer/<run>/gpu/profile.json` and `receipts.jsonl` (per batch), `results/optimizer/compare-*.json`
(identity of every replay).

## 1. What was measured, and how

| Item | Value |
|---|---|
| Real optimizer jobs (not microbenchmarks) | **W-A3**: Assignment 3's sealed C19 broad1 search (Growth searched jointly; 64 lanes; 1,242,714 fresh evaluations, 7,607 archive hits; door D19). **W-A2**: Assignment 2's sealed C19 base search (Growth fixed to New L0's phenotype; 128 lanes; 2,196,920 fresh, 15,979 hits; D19). **W-S**: the small-batch control — Assignment 3's broad lane on Phase 2's G7 schedule (16 lanes; 30,749 fresh; median batch 376) |
| Code | each job's own frozen search code, seeds, cells, budgets, caps and doors (`tools/gpu-phase3/replay.ts`, the job body of its `stages.ts` line for line); identical command line for every version |
| "Before" | the **accepted Phase 2 host path**: the unmodified code of `a1836407` and the Phase 2 binary `3fe09e67…`, measured in this study before any change (Stage 1) |
| "After" | the Phase 3 host pipeline (8 host worker threads, batch 8,192, linger 30 ms) on the final binary `06a4a04a…` (kernels byte-identical to `3fe09e67…`; Stage 2 sweeps ran on `3fe09e67…`) |
| CPU baseline | the **original** CPU runs recorded in the sealed records: W-A3 5,900.8 s on 12 workers (Assignment 3's production pool); W-A2 4,681.1 s on 14 workers (Assignment 2's). The canonical CPU engine is unchanged since (its 94-file digest `c8a9f416…` is identical), and Phase 2 re-measured the 12-worker CPU throughput on this machine one day earlier (D19 joint 200.0 ev/s ⇒ ≈ 6,214 s implied for W-A3), so the sealed figure is a fair baseline; it was not re-run here (98 min) |
| Identity | every replay compared with its sealed record (lanes, extension rounds, fresh counts) or, for W-S, every archived record hash with the other arm: **all identical** (§5) |
| Profile | wall (from the Lab's open to the job's end), main-thread event-loop utilization, process CPU, GC, peak RSS, archive-write time, per-batch server / encode / decode times from the receipt ledger; GPU telemetry every 30 s |

## 2. Headline (wall time of complete optimizer jobs; every run listed)

| Job | CPU, original sealed run | Phase 2 path (before) | Phase 3 host pipeline (after, final binary) | after vs before | after vs CPU |
|---|---:|---:|---:|---:|---:|
| **W-A3** Growth searched, 64 lanes, 1.24 M evaluations | 5,900.8 s (12 workers) | 1,131.1 / 1,126.8 s | **583.8 / 581.7 s** | **1.94×** | **10.1×** |
| **W-Q** A3 C19 broad qualification, 385 members, 251 k | 1,249.5 s (12 workers) | 238.5 s (Phase 2's run) | **163.7 s** | 1.46× | **7.6×** |
| **W-A2** Growth fixed, 128 lanes, 2.20 M evaluations | 4,681.1 s (14 workers) | 1,641.0 s | **724.8 / 726.4 s** | **2.26×** | **6.45×** |
| **W-S** small batches, 16 lanes, 30,749 (median batch 376) | 123.2 s (12 workers, this study's CPU arm) | 72.8 / 72.8 / 72.8 s | **65.2 / 65.3 / 65.2 s** | 1.12× | 1.89× |
| W-S on 1 host worker / on the serial path (0) | | | 73.8 s / 72.6 s | 0.99× / 1.00× | |
| W-A3, the protocol's CPU re-measurement on this machine (12 workers, this study) | FILL | | | | |

Interpretation (brief §6): the Growth-searched job reaches **≈ 10× the original 12-worker CPU job** (the lower edge of
the brief's 10–15× hypothesis) at **≈ 1.9× the accepted Phase 2 design**; the Growth-fixed job reaches ≈ 6.5× (it is
now bound by the main thread's lane logic and archive, utilization 0.77); the small-batch control is GPU-latency-bound
and gains little (1.12×). Every figure is measured; nothing is extrapolated in this table.

## 3. Where the time went (W-A3, before → after)

| Component (seconds) | Phase 2 path | 8 host workers | Note |
|---|---:|---:|---|
| Wall | 1,131.1 | 583.9 | Stage 2 run `s2-a3-w8-b8192` |
| GPU server (kernels + transfers, sum over 211 batches) | 347.0 | 348.3 | unchanged: same kernels, same batches |
| GPU idle between batches | 774.8 | 228.2 | median gap 3.57 s → 0.62 s |
| Encode, wall per batch (sum) | 161.1 (main thread) | 34.7 (8 workers) | |
| Decode + canonical record reduction (sum) | 291.7 (main thread) | 68.3 (8 workers) | |
| Main thread active / idle | 791.0 / 340.1 (ELU 0.70) | 363.8 / 220.1 (ELU 0.62) | the main thread now holds the lanes, the archive and the request assembly |
| Archive writes (main thread) | 69.7 | 66.8 | JSON encode ≈ 8.8 s of it (7.1 µs/record); the rest SQLite commits |
| GC (main thread) | 30.8 | 7.8 | |
| Process CPU (user) | 1,147.8 | 1,072.6 | the workers' time replaces the main thread's |
| Peak RSS | 3.2 GiB | 4.8 GiB | 8 worker heaps (the door's arrays are shared) |
| Batches (median size) | 211 (7,980) | 211 (7,980) | the batch structure is the optimizer's, unchanged |

The phases in the Phase 2 handoff (server ≈ 347, encode ≈ 160, decode ≈ 291, lane logic/archive ≈ 332 s) are
reproduced. After the change neither the GPU (busy ≈ 60 % of the wall) nor the main thread (62 %) is saturated: what
remains is the optimizer's own round-trip dependency — lanes wait for their batch, then compute the next proposals.

## 4. Variants measured (Stage 2, W-A3; every run identical to the sealed record)

| Host workers | Batch | Wall s | ev/s | × sealed CPU | × Phase 2 | GPU server s | Batches | Peak RSS MiB |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 (Phase 2 path) | 8,192 | 1,131.1 / 1,126.8 | 1,099 / 1,103 | 5.22 / 5.24 | 1.00 | 347.0 | 211 | 3,178 / 3,188 |
| 4 | 8,192 | 611.7 | 2,032 | 9.65 | 1.85 | 348.3 | 211 | 3,826 |
| **8 (chosen)** | **8,192** | **583.9** | **2,128** | **10.11** | **1.93** | 348.3 | 211 | 4,797 |
| 12 | 8,192 | 582.1 | 2,135 | 10.14 | 1.94 | 348.3 | 211 | 5,463 |
| 8 | 16,384 | 608.6 | 2,042 | 9.70 | 1.85 | 245.2 | 136 | 5,019 |

- 8 workers is the knee: 12 gain 0.3 % for +0.7 GiB. Default `DEFAULT_HOST_WORKERS = 8` (`src/gpu-backend/hostPipeline.ts`).
- Larger batches cut GPU time (the kernels are latency-bound: one thread walks a candidate's whole door) but lengthen
  every round the lanes wait for, so the wall grew; 8,192 stays the default.

### Sustained production-pool throughput (H6 run, 45 min, 8 host workers; mean ev/s per round, rounds in brackets) vs Phase 2's 8 h run

| Door | joint | detail + risk | all options | D1-only | Growth-only |
|---|---|---|---|---|---|
| D19 | 3,012 (5) vs 1,445 = 2.08× | 2,167 (5) vs 1,170 = 1.85× | 3,140 (5) vs 1,314 = 2.39× | 5,333 (5) vs 2,204 = 2.42× | 4,046 (5) vs 1,684 = 2.40× |
| D21 | 2,030 (5) vs 1,088 = 1.87× | 1,509 (5) vs 872 = 1.73× | 2,106 (5) vs 991 = 2.13× | 3,519 (5) vs 1,637 = 2.15× | 2,739 (5) vs 1,294 = 2.12× |
| D23 | 1,559 (5) vs 901 = 1.73× | 1,146 (5) vs 698 = 1.64× | 1,574 (5) vs 822 = 1.91× | 2,606 (5) vs 1,354 = 1.92× | 2,155 (5) vs 1,123 = 1.92× |
| D24 | 1,399 (4) vs 825 = 1.70× | 1,020 (4) vs 632 = 1.61× | 1,404 (4) vs 748 = 1.88× | 2,372 (4) vs 1,239 = 1.91× | 1,912 (4) vs 1,021 = 1.87× |
| FULL | 1,137 (4) vs 687 = 1.65× | 851 (4) vs 542 = 1.57× | 1,156 (4) vs 653 = 1.77× | 1,957 (4) vs 1,036 = 1.89× | 1,574 (4) vs 877 = 1.79× |

(Phase 2's figures: `research/gpu-phase2/GPU_PHASE2_BENCHMARKS.md` §10. Longer doors gain less: their kernels take longer
per batch, so the host share was smaller to begin with; detail + risk gains least: its decode is heavier per candidate.)

## 5. Decisions (complexity budget, brief §6)

- **Priority A — done:** worker-thread encode/decode with a shared door and in-order release. ≈ 1.9× on the real
  Assignment 3-shaped job, i.e. ≈ 10× the original CPU job, with no change to any result.
- **Priority B — rejected after measurement:** archive JSON encoding is 1.5 % of the wall; the rest of the archive time is
  SQLite commits inside the legacy `Store` (pinned; moving them off-thread changes its read-after-write semantics) for at
  most ≈ 5–8 %; the main thread is not saturated (ELU 0.62). Not worth its complexity.
- **Priority C — deferred:** the kernels are now ≈ 60 % of the W-A3 wall and are latency-bound; any kernel change needs a
  new GPU-level parity and sanitizer burden; the measured remaining potential (§3) does not justify it now.
- The brief's 10–15× hypothesis: **≈ 10× measured** on the Growth-searched job (the 10× lower bound of the range);
  FILL the Growth-fixed job.

## 6. Remaining bottlenecks (measured) and what would move them

1. The optimizer's round-trip dependency (lanes waiting for their batch): GPU idle ≈ 228 s of 584 s. Fewer, larger
   rounds would need more concurrent lanes (a study design choice, not an engine change).
2. GPU latency per batch (≈ 1.65 s at 8,192 on D19, nearly flat in batch size): only a kernel redesign moves it
   (Priority C).
3. Main-thread lane logic and archive (≈ 340 s of work, overlapped): a search-code matter, outside this study.
