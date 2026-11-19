# GPU benchmarks — GPU acceleration Phase 1 (RTX 5090 proof of concept)

Self-contained benchmark record. Every number below comes from a record in `research/gpu-phase1-feasibility/results/`
(`s1/` CPU baseline, `s5/` GPU and hybrid benchmarks; CSV in `results/tables/`). Benchmarks were run only after the
parity gates passed (protocol gate G7). No timing was used to choose or tune any trading parameter.

## 1. Environment

| Item | Value |
|---|---|
| Host | Apollo, Ubuntu 26.04.1 LTS, kernel 7.0.0-38-generic |
| CPU | AMD Ryzen 7 9800X3D, 8 cores / 16 threads, 96 MiB L3 |
| RAM | 64 GB (59 GiB visible); swap 7 GiB (partly used by vLLM) |
| GPU | NVIDIA GeForce RTX 5090, 32 GB GDDR7 (512-bit), compute capability 12.0, 170 SMs, 96 MiB L2, SM clock up to 3,105 MHz; no kernel watchdog (`cudaDevAttrKernelExecTimeout` = 0) |
| Driver | 595.91.07 (open kernel module), CUDA 13.2 driver API |
| Toolchain | CUDA 13.2.86 (nvcc, runtime, crt, nvvm, cccl) and compute-sanitizer 13.2.87 from NVIDIA's PyPI wheels in a user-space venv; gcc 15.2 host compiler |
| Build flags | `-O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true` (binary64 only, IEEE division, no FMA contraction) |
| Node | v24.21.0 (TypeScript via `--experimental-transform-types`) |
| GPU co-tenants | vLLM (Docker `ai-trading-qwen`, Qwen 27B INT4) holds ≈ 27.97 GB VRAM, idle during the runs; gnome-remote-desktop 0.5 GB; the desktop (gnome-shell/Xwayland) on the same GPU. **≈ 2.8 GiB VRAM free**: every GPU run used a VRAM budget of 2,400 MiB. Nothing was stopped or reconfigured. |
| Containment | every heavy run in a transient systemd user unit inside `gpup1.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) |
| Raw GPU capability (smoke test) | FP64 FMA ≈ 1.6 TFLOP/s; FP32 FMA ≈ 105–113 TFLOP/s (the 1 : 64 consumer-Blackwell FP64 ratio) |

## 2. CPU baseline (the canonical engine, unchanged)

### 2.1 Cost of one evaluation, by component (one thread, warm)

`results/s1/components.json`; 82 subjects per door (2 reference identities, 48 uniform random Assignment 3 genomes,
32 branch-heavy designs), each component built fresh (no book cache), median of 3 repetitions, GC at the production
cadence outside timings, the composed record equal to the study's `evaluate()` record for every subject.

Milliseconds per evaluation, mean over the subjects (evaluate = the study's whole `evaluate()` path).

| Door | Set | n | D1·GDX | D1·VGT | Growth·VGT | Pool | Record | Evaluate mean | p90 | max | D1 + pool | Growth |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D24 | all | 82 | 12.4 | 10.0 | 43.6 | 20.8 | 0.45 | 87.0 | 128.2 | 132.9 | 49.5% | 50.0% |
| D24 | R | 2 | 12.2 | 10.1 | 54.1 | 11.4 | 0.45 | 88.3 | 90.3 | 90.8 | 38.2% | 61.3% |
| D24 | A | 48 | 12.2 | 9.9 | 35.1 | 11.4 | 0.39 | 68.7 | 89.3 | 100.7 | 48.5% | 50.9% |
| D24 | B | 32 | 12.6 | 10.1 | 55.6 | 35.5 | 0.53 | 114.4 | 132.1 | 132.9 | 50.9% | 48.6% |
| FULL | all | 82 | 14.7 | 12.1 | 53.0 | 26.3 | 0.47 | 106.3 | 157.1 | 164.9 | 49.8% | 49.8% |
| FULL | R | 2 | 14.6 | 12.0 | 72.8 | 14.1 | 0.44 | 113.0 | 114.9 | 115.4 | 35.7% | 63.9% |
| FULL | A | 48 | 14.2 | 12.0 | 42.7 | 14.2 | 0.42 | 83.5 | 110.8 | 123.4 | 48.4% | 51.1% |
| FULL | B | 32 | 15.3 | 12.3 | 67.3 | 45.1 | 0.55 | 140.1 | 162.0 | 164.9 | 51.7% | 47.9% |
| D19 | all | 82 | 5.2 | 4.1 | 20.1 | 7.9 | 0.24 | 37.6 | 54.5 | 61.4 | 45.8% | 53.6% |
| D19 | R | 2 | 5.2 | 4.0 | 26.9 | 3.6 | 0.23 | 40.0 | 40.2 | 40.3 | 32.0% | 67.4% |
| D19 | A | 48 | 5.1 | 4.0 | 16.0 | 3.8 | 0.22 | 29.2 | 39.4 | 45.2 | 44.4% | 54.9% |
| W-QUIET | all | 82 | 1.3 | 1.0 | 5.1 | 1.2 | 0.12 | 8.8 | 12.0 | 14.8 | 40.2% | 58.4% |
| W-QUIET | R | 2 | 1.4 | 1.1 | 7.0 | 1.1 | 0.13 | 10.3 | 10.8 | 10.9 | 33.6% | 65.2% |
| W-QUIET | A | 48 | 1.2 | 1.0 | 4.3 | 0.4 | 0.12 | 7.0 | 9.9 | 12.0 | 37.8% | 60.5% |
| W-CRASH | all | 82 | 1.7 | 1.5 | 6.2 | 3.1 | 0.15 | 12.6 | 17.4 | 22.6 | 49.8% | 49.0% |
| W-CRASH | R | 2 | 1.8 | 2.3 | 8.3 | 2.5 | 0.15 | 12.8 | 12.9 | 12.9 | 44.0% | 55.0% |
| W-CRASH | A | 48 | 1.7 | 1.5 | 5.4 | 1.5 | 0.14 | 10.0 | 13.6 | 15.1 | 45.8% | 52.9% |
| W-BEAR | all | 82 | 1.9 | 1.6 | 6.0 | 4.3 | 0.16 | 14.1 | 22.7 | 26.7 | 56.1% | 42.8% |
| W-BEAR | R | 2 | 2.9 | 2.1 | 8.8 | 2.1 | 0.17 | 13.7 | 13.7 | 13.7 | 44.0% | 54.9% |
| W-BEAR | A | 48 | 1.9 | 1.6 | 5.0 | 1.9 | 0.15 | 10.6 | 13.7 | 14.9 | 51.2% | 47.5% |
| W-TREND | all | 82 | 2.7 | 2.0 | 10.2 | 4.3 | 0.17 | 19.3 | 28.4 | 39.2 | 46.5% | 52.5% |
| W-TREND | R | 2 | 2.9 | 2.2 | 13.3 | 2.5 | 0.18 | 19.1 | 19.8 | 19.9 | 35.9% | 63.3% |
| W-TREND | A | 48 | 2.7 | 2.0 | 8.2 | 1.8 | 0.16 | 14.7 | 19.5 | 21.1 | 43.5% | 55.5% |

- **Growth·VGT is the largest single cost: 50–64% of an evaluation** (more for the reference identities' richer Growth
  structures). The D1 books are 20–32%, the pool 13–32% (heavier when the D1 books trade a lot), the record 0.4–1.4%.
- Cost scales with the data span: D19 ≈ 38 ms, D24 ≈ 87 ms, FULL ≈ 106 ms mean per evaluation; the regime windows
  (1–2 years) 9–19 ms.
- Door loading (CSV parse, session grouping, typed arrays, signal bars): D24 4.4 s, FULL 5.6 s, D19 2.1 s per process.

### 2.2 Throughput at production worker counts

`results/s1/cpu-pool-*.json`. Workload: rung-1-shaped work as Assignment 3's lanes dispatch it — 130 centres (the two
reference identities + 128 seeded uniform A3 genomes) each with 16 'joint' neighbours from A3's own generator =
2,210 evaluations — through a mirror of A3's pool (child processes, 2 tasks in flight per worker, GC every 64
evaluations, A3's Growth (48) and D1 (64) book caches on). Warm-up of 4 tasks per worker excluded; start-up timed apart.

| Door | Workers | Evaluations | Evaluations/s | In-worker ms | Worker busy | Host CPU | Start-up s | Workers' RSS GiB | Forced GCs (s) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| D24 | 1 | 256 | **12** | 82.8 | 99.7% | 8% | 4.6 | 0.65 | 4 (0.01) |
| D24 | 8 | 2210 | **88.2** | 90.3 | 99.5% | 60% | 9.7 | 5.36 | 32 (0.15) |
| D24 | 12 | 2210 | **92** | 129.6 | 99.4% | 83% | 14.7 | 7.94 | 27 (0.26) |
| D24 | 14 | 2210 | **90.3** | 153.7 | 99.1% | 93% | 19.3 | 9.37 | 28 (0.43) |
| D24 | 16 | 2210 | **90.4** | 175.4 | 99.1% | 100% | 19.4 | 10.7 | 32 (0.58) |
| D19 | 12 | 2210 | **194.3** | 61.2 | 99.1% | 87% | 6.7 | 5.5 | 28 (0.26) |
| FULL | 12 | 2210 | **74.4** | 159.7 | 99.1% | 83% | 18.1 | 9.04 | 30 (0.3) |

(The D19 and FULL runs used 12 workers; the cgroup peak memory is cumulative per unit and therefore not repeated here.)

- **Production configuration: 12 workers, 92.0 evaluations/s on D24** (Assignment 3's own bench: 96.7–99.0 at 10–16
  workers; its C24 broad jobs ran 106.7 fresh/s). Throughput saturates at the 8 physical cores; SMT adds ≈ 4%.
- Output hashes were identical at every worker count. GC cost is negligible (27–32 forced collections, 0.1–0.6 s per
  2,210 evaluations). Worker memory ≈ 0.65 GiB RSS each.

### 2.3 Where a real optimization spends its time (Assignment 3, sealed production records)

From the sealed `compute` fields of Assignment 3's 14 search jobs (`research/vg-l0-full-joint/results/search/*/*.json`;
`results/tables/a3_production_jobs.csv`): 17,533,469 fresh simulations in 40.4 h of job wall time on 12 workers.

| Measure | Value |
|---|---|
| Worker busy share (Σ worker compute ÷ (wall × 12)) | **98.7%** (97.4–99.1% per job) |
| Everything else on the critical path: candidate generation, NSGA-II, neighbourhood generation, ranking, promotion, archive (SQLite), IPC, barriers | ≈ 1.3% (it runs in the coordinator, overlapped with the workers) |
| Evaluation time by stage | rung 1 (centres + 16 neighbours) 79.8%, refinement 10.9%, rung 3 4.6%, rung 2 3.3%, screens 1.4% |
| Worker ms per fresh simulation | D19 jobs 55.6–58.6, D21 80–84, D23 100–102, D24 105–140 |
| Whole chain (search + 1.64 M qualification + folds + validation) | 44 h 24 min |

**Consequence:** in today's optimizer, candidate evaluation is essentially the whole runtime; accelerating evaluation
accelerates studies almost one for one — until the coordinator's own per-evaluation work (record handling, archive, GA
bookkeeping, IPC) becomes the bottleneck at much higher throughput (§6).

### 2.4 Numeric character of the workload

| Kind of work | Where | Share / note |
|---|---|---|
| binary64 arithmetic | fills (price × (1 ± cost)), shares, P&L, interest, marks (`shares × price − principal − interest` at every held minute), stop levels, the arming test `1 − close ÷ high` at every flat minute (one FP64 division per minute) | small per minute; FP64 divisions dominate the arithmetic |
| comparisons and branches | stop / gap / buffer / threshold tests, state-machine transitions, tie orders | the bulk of the work; data-dependent and divergent across candidates |
| integer state | session and bar indices, counters, gate episodes, cursors | |
| timestamps | Unix seconds as binary64; calendar-day hold age and interest from session midnights | exact in binary64 |
| order-dependent reductions | strict drawdown trackers (running peak, maximum fall, peak/trough/recovery instants) over ≈ 0.5–1 M marks per evaluation; realized P&L accumulation in fill order | strictly sequential within a candidate |
| memory | ≈ 40 MB of minute bars per symbol (FULL), read in time order | the whole two-symbol dataset (≈ 85 MB) fits in VRAM and nearly in the 96 MiB L2 |

## 3. Timing methodology

- **CPU:** `performance.now()` around the evaluation inside each worker (in-worker ms) and around the whole batch in the
  coordinator (wall); warm-up excluded; start-up and door loading reported separately; the production pool mechanics.
- **GPU kernel-only:** CUDA events around the D1 kernel (plus the tiny init/combine kernels) and the pool kernel.
- **GPU total evaluation:** wall time in the Node client for complete batches — CPU-side encoding (the candidates' D1
  doubles, controls and the supplied Growth trades), the framed request over the server's stdin pipe, host→device copies,
  kernels, device-side compaction, device→host copies, the response over the stdout pipe, decoding, rebuilding the CPU
  engine's `VBook`/`PoolResult` objects and running the canonical `recordOf` — i.e. a finished compact record per
  candidate, exactly as the CPU workers deliver it. **No transfer, decoding or record cost is excluded** from "total".
- **Cold versus warm:** cold = server start + CUDA context creation + dataset export + upload + reference-high table;
  first call per batch size (buffer allocation) reported apart from the steady state (median of 2 repetitions after it).
- **Equivalence:** the CPU and the GPU evaluate the same seeded candidates on the same door with the same options; **every
  GPU record's hash is compared with the CPU record's hash** (any mismatch is reported in the tables).
- **GPU telemetry:** `nvidia-smi` sampled every 200 ms (utilization, memory, power, temperature, SM clock).

## 4. GPU slice: D1 books + pool (Growth fixed)

Workload **F** (the shape of Assignment 2's searches): 4,096 seeded uniform Assignment 3 genomes (`GPUBENCH-F`) — random
D1 books, RC 2 families, gates, activations and control values — all with New L0's Growth·VGT, so the CPU's Growth cache
always hits and both sides evaluate D1 books + pool + record. **CPU: the production pool, 12 workers.** GPU: the
slice, the Growth book computed once by the CPU (98 ms, reported apart), records rebuilt by the canonical `recordOf`.
Median workload = uniform genomes; heavy workload = the same genomes with every D1 grid redrawn from the box's
high-activity corner (X 8–12%, Y 0.1–0.5%, short holds, long continuation windows).

| Door | Workload | Batch | Timed | CPU 12 workers ev/s | GPU total ev/s | GPU kernel-only ev/s | Speed-up total | Speed-up kernel-only | D1 kernel ms | Pool kernel ms | H→D ms | D→H ms | Round trip ms | Encode ms | Decode + record ms | Wall ms | Record mismatches |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D19 | median | 1,024 | 4,096 | 450.3 | **817.1** | 990.5 | **1.81×** | 2.2× | 2135 | 2001 | 0.5 | 5.6 | 4155 | 25 | 818 | 5013 | 0 |
| D19 | median | 4,096 | 4,096 | 450.3 | **2120.6** | 3887.3 | **4.71×** | 8.63× | 543 | 511 | 0.4 | 6.1 | 1087 | 34 | 795 | 1932 | 0 |
| D24 | heavy | 1,024 | 4,096 | 140.5 | **298.4** | 345.7 | **2.12×** | 2.46× | 4751 | 7096 | 0.7 | 63.5 | 12105 | 50 | 1550 | 13725 | 0 |
| D24 | heavy | 4,096 | 4,096 | 140.5 | **824.2** | 1376.8 | **5.87×** | 9.8× | 1197 | 1778 | 0.5 | 67.6 | 3329 | 32 | 1589 | 4970 | 0 |
| D24 | median | 64 | 512 | 200.2 | **26** | 26.2 | **0.13×** | 0.13× | 9687 | 9839 | 0.3 | 6.4 | 19538 | 5 | 163 | 19708 | 0 |
| D24 | median | 256 | 1,024 | 200.2 | **99.1** | 102.6 | **0.5×** | 0.51× | 4945 | 5038 | 0.3 | 6.7 | 10000 | 9 | 320 | 10334 | 0 |
| D24 | median | 1,024 | 4,096 | 200.2 | **339.8** | 396.6 | **1.7×** | 1.98× | 5002 | 5327 | 0.8 | 35.3 | 10429 | 28 | 1577 | 12053 | 0 |
| D24 | median | 2,048 | 4,096 | 200.2 | **610.9** | 783.2 | **3.05×** | 3.91× | 2512 | 2718 | 0.6 | 32.9 | 5373 | 48 | 1261 | 6705 | 0 |
| D24 | median | 4,096 | 4,096 | 200.2 | **977.4** | 1557 | **4.88×** | 7.78× | 1254 | 1376 | 0.5 | 33.1 | 2821 | 28 | 1323 | 4191 | 0 |
| D24 | median | 4,096 | 8,192 | 202.6 | **971.5** | 1526.6 | **4.79×** | 7.53× | 2520 | 2846 | 1 | 63.4 | 5758 | 60 | 2574 | 8432 | 8 |
| D24 | median | 8,192 | 8,192 | 202.6 | **1394.6** | 2976.5 | **6.88×** | 14.69× | 1284 | 1468 | 1.1 | 64 | 3089 | 108 | 2640 | 5875 | 8 |
| FULL | median | 1,024 | 4,096 | 166.3 | **281.3** | 325 | **1.69×** | 1.95× | 5975 | 6629 | 0.8 | 22 | 12723 | 38 | 1778 | 14559 | 0 |
| FULL | median | 4,096 | 4,096 | 166.3 | **812.6** | 1275 | **4.89×** | 7.67× | 1496 | 1717 | 0.6 | 41.2 | 3448 | 32 | 1541 | 5040 | 0 |
| W-CRASH | median | 1,024 | 4,096 | 826.2 | **2118.4** | 3235.9 | **2.56×** | 3.92× | 558 | 708 | 0.3 | 3 | 1276 | 21 | 621 | 1934 | 0 |
| W-CRASH | median | 4,096 | 4,096 | 826.2 | **4111.5** | 12349 | **4.98×** | 14.95× | 149 | 183 | 0.2 | 3.8 | 349 | 20 | 611 | 996 | 0 |

Reading the table:

- **Total throughput includes everything** — encoding, the pipe both ways, H→D and D→H copies, kernels, device-side
  compaction, decoding, rebuilding the CPU objects and the canonical record. Every GPU record's hash equals the CPU's
  (0 mismatches except the 4 explicit capacity refusals at batch 8,192 with 256-trade caps, §5).
- **At the batch size today's free VRAM allows (4,096; ≈ 2.4 GB), the GPU is 4.7–5.9× the production CPU on every
  door, 6.9× at 8,192 with tighter capacities; kernel-only 7.5–15×.** Small batches are slower than the CPU (64:
  0.13×; 256: 0.5×); the break-even is ≈ 600–700 candidates per call on D24.
- **Decode + record on the client is ≈ 32% of the wall time at batch 4,096** (1.3 s for 4,096 candidates =
  0.32 ms each, single-threaded) and transfers + pipe ≈ 5%; the kernels are the rest. The pipe itself is not a
  bottleneck after the fix (§5.2).

## 5. Scaling with batch size and VRAM

### 5.1 Throughput is set by the number of candidates in flight, and VRAM caps it

| D24 median, batch | Kernel time per call (D1 + pool) | Kernel-only evaluations/s |
|---:|---:|---:|
| 64 | 2.44 s | 26 |
| 256 | 2.50 s | 103 |
| 1,024 | 2.58 s | 397 |
| 2,048 | 2.62 s | 783 |
| 4,096 | 2.63 s | 1,557 |
| 8,192 (256-trade / 256-lot caps) | 2.75 s | 2,977 |

The kernel time per call is **nearly constant from 64 to 8,192 candidates**: one GPU thread walking one D24 book takes
≈ 1.25 s (D1 kernel) and one pool ≈ 1.38 s, latency-bound (dependent global-memory loads; ≈ 1–2 µs per minute bar),
and at these batch sizes the GPU is far from occupied — at 4,096 candidates the D1 kernel has ≈ 1.5 warps per SM
against a register-limited maximum of ≈ 11 (178 registers per thread). GPU power stayed at a median of 119–133 W
(peak 195 W of the 600 W limit). **Throughput therefore grows linearly with batch size until the SMs fill — at roughly
tens of thousands of candidates per call — but the v1 memory layout needs ≈ 575 KB of VRAM per candidate** (fixed-capacity
trade and lot buffers), and vLLM leaves ≈ 2.8 GiB: batches above ≈ 4,000 (8,000 with tighter capacities) do not fit.
This, not FP64 throughput, is the binding constraint of the POC. A memory-lean layout (compact records or a fused streaming
evaluator, `GPU_PHASE2_PLAN.md` §3.2) or a VRAM decision (U1) removes it; the slope above 8,192 was **not measured**.

### 5.2 A client bug found and fixed during benchmarking

The first benchmark run (`results/s5/pre-fix/slice-D24-median.json`) showed total throughput falling above batch 1,024
(84.8 evaluations/s at 4,096, with 2.6 s of kernels and a 46.9 s round trip). Cause: the client re-concatenated its whole
response buffer on every pipe chunk (quadratic in a ≈ 150 MB response). Fixed by assembling each frame once (linear); the
same batch then ran at 977 evaluations/s. The change is I/O only; every parity record and benchmark above was re-run on
the fixed build (one binary and client for all final records).

### 5.3 VRAM, cold start and warm start

| Item | Value |
|---|---|
| VRAM used by the POC | ≈ 3.2 GB at most (device total 31.7 of 32.6 GB with vLLM's 28 GB resident); dataset + reference-high tables: D19 31.7 MiB, D24 72.2 MiB, FULL 87.4 MiB |
| Per-candidate VRAM (v1 layout, 512-trade / 512-lot capacities) | ≈ 575 KB (D1 trades 287 KB, lots 229 KB, daily closes 18–22 KB) |
| Cold start | server start + CUDA context ≈ 0.1 s; dataset export from the CPU loader's arrays 0.12 s (D24); upload 3.4 ms; reference-high table 0.5 ms. (A CPU worker parses its door in 4.4 s on D24, 5.5 s on FULL.) |
| First call per batch size | within ≈ 2% of the steady state (device buffers grow once) |
| Compilation | ahead of time for sm_120 (≈ 2 s with nvcc); no JIT at run time |

## 6. Hybrid end-to-end (Assignment 3's joint workload) and whole-study projections

### 6.1 Measured: the hybrid end-to-end test

Workload **J** (Assignment 3's joint genome: every candidate has its own Growth·VGT book): 6,144 seeded genomes
(`GPUBENCH-J`). **CPU-only:** the production pool (full evaluations). **Hybrid:** the same pool computes only the Growth
books (the canonical CPU path) and returns their virtual trades; as they arrive the coordinator fills GPU batches, the GPU
evaluates both D1 books and the pool, and the coordinator rebuilds each canonical record (pipelined).

| Door | Workload | CPU workers | GPU batch | Evaluations | CPU-only ev/s | Hybrid ev/s | Speed-up | GPU busy s / wall s | Records compared (mismatches) |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| D24 | heavy | 12 | 1024 | 6,144 | 76.6 | **151.1** | **1.97×** | 22.6 / 40.7 | 6,144 (0) |
| D24 | median | 12 | 1024 | 6,144 | 93.9 | **154.6** | **1.65×** | 20.1 / 39.7 | 6,144 (0) |
| D24 | median | 14 | 2048 | 6,144 | 94.3 | **157** | **1.67×** | 11.7 / 39.1 | 6,144 (0) |

**The hybrid is 1.65–1.97× faster end to end, with every record identical.** The GPU was busy only 30–55% of the wall
time: the bottleneck is the CPU computing Growth books (50–64% of an evaluation's CPU cost, §2.1). This is the Amdahl
bound of a slice that leaves Growth on the CPU: 1 ÷ 0.51 ≈ 2.0× for median candidates, more when the D1 books are
busier (heavy: 1.97×). Fourteen workers do not help (1.67×), as on the CPU alone.

### 6.2 Whole-study projections (from measured fractions)

Measured inputs: Assignment 3's chain took **44 h 24 min** (search jobs 40.4 h of wall time, 98.7% of it worker
evaluation; 17.53 M fresh search simulations + 1.64 M qualification); its production configuration evaluates
92–94 joint candidates/s on D24 (§2.2, §6.1); Assignment 2's chain (Growth fixed) ran 34.21 M fresh simulations in
30.95 h (its D24 bench: 200–205/s, matching this study's 200.2/s Growth-fixed CPU baseline).

| Scenario | Basis | Speed-up | Assignment 3-sized study (44.4 h) | Assignment 2-sized study (31.0 h) | Status |
|---|---|---:|---:|---:|---|
| Today's CPU | measured | 1.0× | 44.4 h | 31.0 h | — |
| Phase 1 POC as a hybrid backend (GPU D1 + pool, CPU Growth), today's VRAM | measured (§6.1, §4) | 1.65–1.97× (joint); 4.7–5.9× (Growth fixed) | **≈ 22.5–27 h** | **≈ 5.3–6.6 h** | needs Phase 2a integration (pool options for qualification, the optimizer's batched pool) |
| + memory-lean layout, batch 8,192 | measured at 8,192 (§4) | joint: unchanged (CPU Growth bound); Growth fixed: 6.9× | ≈ 22.5–27 h | ≈ 4.5 h | Phase 2a |
| Growth also on the GPU, at the D1 book's measured GPU efficiency | **extrapolation:** the slice's kernel at batch 4,096 replaced 137–177 s of single-thread CPU work in 2.6 s (≈ 52–67 CPU-thread equivalents); Growth's 179 s (4,096 × 43.6 ms) → ≈ 2.7–3.4 s more kernel time, plus today's 1.3 s record path | ≈ 5.7–6.4× at batch 4,096; ≈ 8–10× at 8,192 (coordinator record path then limits at ≈ 3,000/s single-threaded) | ≈ 4.5–8 h | as above | **not measured; Growth is not ported** |
| Growth on the GPU at half that efficiency (more divergence: gates, daily bars, per-minute drawdown observations) | extrapolation | ≈ 3.5–4.5× at batch 4,096 | ≈ 10–13 h | as above | not measured |

The deferred risk-envelope pilot is estimated at ≈ 0.3–0.5 M simulations (`research/vg-l0-risk-metrics/REPORT.md`): on
today's CPU at Assignment 3's C21–C24 rates (107–147 fresh/s) that is ≈ 0.6–1.3 h; it does not need the GPU (the user's
decision; it was not run).

## 7. System effects

| Item | Observation |
|---|---|
| GPU power / temperature | median 119–133 W, peak 195 W during slice runs (limit 600 W); hybrid runs median 69–98 W; ≤ 53 °C; SM clock 2,880 MHz (2,542 median in the 14-worker hybrid) |
| GPU energy (slice runs) | 0.8–19 kJ per benchmark file (nvidia-smi integration; CPU package energy was not measurable here, so no energy-per-evaluation comparison is claimed) |
| Host memory | the 12 CPU workers ≈ 7.9–9.0 GiB RSS (FULL the larger); the GPU server's and client's own RSS were not separately measured; every run stayed inside the 44G/48G slice limits |
| CPU load | the production pool saturates the 8 cores (host CPU 83% at 12 workers); in the hybrid the coordinator (encode/decode/record) adds ≈ 1 core |
| Co-tenants | vLLM idle during every run (its 28 GB resident); the desktop compositor shares the GPU; no kernel watchdog, no display artifacts noticed (not instrumented). Performance under vLLM inference load was **not measured**; it would compete for SMs and VRAM |
| Determinism | identical records across batch sizes 1–8,192, repeats, server restarts and shuffled orders (`GPU_CPU_PARITY.md` G5); identical CPU records across 1–16 workers |

## 8. Commands

```bash
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
B="$NODE --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
# CPU baseline
$B tools/gpu-phase1/profile-components.ts --doors D24,FULL,D19,W-QUIET,W-CRASH,W-BEAR,W-TREND --random 48 --reps 3 --out research/gpu-phase1-feasibility/results/s1/components.json
$B tools/gpu-phase1/bench-cpu-pool.ts --door D24 --workers 1,8,12,14,16 --centres 128 --out research/gpu-phase1-feasibility/results/s1/cpu-pool-D24.json
# GPU slice and hybrid (the final chain runs these after the parity reruns)
$B tools/gpu-phase1/bench.ts --mode slice --door D24 --n 4096 --batches 64,256,1024,2048,4096 --workers 12 --reps 2 --out research/gpu-phase1-feasibility/results/s5/slice-D24-median.json
$B tools/gpu-phase1/bench.ts --mode hybrid --door D24 --n 4096 --hybrid-batch 1024 --workers 12 --out research/gpu-phase1-feasibility/results/s5/hybrid-D24-median-w12.json
# tables
$B tools/gpu-phase1/tables.ts
```
