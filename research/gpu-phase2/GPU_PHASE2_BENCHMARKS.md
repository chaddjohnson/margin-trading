# GPU Phase 2 — benchmarks

All figures are **measured** on Apollo with the frozen final binary (`3fe09e67…13fc`) unless a row says *estimate*.
Timings only (study rule AD7: no money figures). Machine-readable sources: `results/bench/bench.json` (sweeps, mixes,
pooled runs, max batch, CPU baselines, display), `results/optimizer/compare-a3-C19-broad1.json` and
`compare-a3-C19-broad-qualification.json` (complete optimizer jobs), `results/optimizer/a3-C19-broad1/gpu/receipts.jsonl`
(per-batch phases), `results/bench/projections.json` (model and projections), `results/bench/ptxas-resource-usage.txt`
(registers, spills), `results/tr1-tranche-gate.json`.

## 1. Setup and fair-measurement protocol

| Item | Value |
|---|---|
| Host | Apollo: AMD Ryzen 7 9800X3D (8 cores / 16 threads), 59 GiB RAM visible, Ubuntu (kernel 7.0.0-38), Node v24.21.0 |
| GPU | NVIDIA GeForce RTX 5090, 32,607 MiB, cc 12.0, driver 595.91.07, power limit 600 W, max SM clock 3,105 MHz |
| GPU background | **vLLM absent**; desktop on the RTX 5090: gnome-remote-desktop 504 MiB (C+G), gnome-shell 182 MiB, Xwayland 8 MiB; idle 767 MiB used, 13.7 W, 43 °C; `nvidia-smi pmon` shows no measurable SM use by these processes |
| Toolchain | CUDA 13.2.2 user-space toolkit, nvcc 13.2.86, `-O3 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true -ffp-contract=off` |
| CPU reference | the production 12-worker CPU pool with Assignment 3's worker semantics (`cpuEvalWorker`: the canonical `evaluate` / `evaluateDetail`, D1 cache 64), on **the same task generator** (prefix-stable seeded genomes) |
| Repetitions | 3 timed repetitions per GPU sweep point (median reported; all three listed in the JSON) after a warm-up batch; cold start measured separately; complete optimizer jobs run twice (search) |
| Result identity in the benchmark | each GPU repetition's record hash identical; **26,400 CPU baseline records compared with the GPU's: 0 differing** |
| Containment | each run in `gpup2.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0); one GPU job at a time; host swap 1,018 MiB in use system-wide before and after (not from these jobs) |

## 2. Complete optimizer jobs (end-to-end, measured)

Assignment 3's own search and qualification code, unchanged, running on the GPU Lab and pool, replaying sealed jobs of
that study; the results are **identical** to its sealed records.

| Job (door D19) | Evaluations | CPU (12 workers, recorded) | GPU | Speedup |
|---|---:|---:|---:|---:|
| C19 broad1 search: 64 lanes (screen, rung fits, NSGA-II islands and extensions, rungs 2–3, refinement, shortlists) — run 2 | 1,242,714 | 5,900.8 s (98.3 min) | **1,130.6 s (18.8 min)** | **5.22×** |
| same, run 1 (timing sample) | 1,242,714 | 5,900.8 s | 1,132.5 s | 5.21× |
| C19 broad qualification: 385 members (detailed centres, five stresses, removal reruns, selection and confirmation neighbourhoods) | 251,405 | 1,249.5 s | **238.5 s** | **5.24×** |

Peak memory of the search replay: 10.5 GB (unit), GPU VRAM ≈ 5.9 GB in use. CPU-scored evaluations: 0.

**Where the GPU job's time goes** (run 2, 211 batches, median 7,980 candidates; `receipts.jsonl`):

| Component | Seconds | Share of 1,130.6 s |
|---|---:|---:|
| GPU server (D1 kernel ‖ Growth kernel, then pool kernel, hash, transfers) | 346.8 | 31 % |
| Client encode (Node main thread) | 160.4 | 14 % |
| Client decode and record reduction (main thread; the unchanged CPU `recordOf`) | 291.1 | 26 % |
| Assignment 3's lane logic, archive writes, scheduling (main thread) | ≈ 332 | 29 % |

The end-to-end limit is the **single Node main thread** (≈ 69 % of the wall time), not the GPU (busy ≈ 31 %).

## 3. GPU throughput by batch size (single batch, end-to-end including encode and decode)

Random Assignment 3 genomes, V structure (D1·GDX, D1·VGT, Growth·VGT), compact record. Median of 3.

| Door | Batch | Wall ms | ev/s | Server ms | D1 / Growth / pool ms | Encode / decode ms | Device MiB | VRAM peak MiB | Power mean / peak W | Temp peak °C |
|---|---:|---:|---:|---:|---|---|---:|---:|---|---:|
| D19 | 1 | 336 | 3 | 335 | 164 / 233 / 101 | 0 / 1 | 1 | 2,104 | 112 / 112 | 46 |
| D19 | 1,024 | 2,252 | 455 | 1,831 | 527 / 1,149 / 679 | 133 / 263 | 538 | 2,104 | 117 / 124 | 48 |
| D19 | 4,096 | 3,657 | 1,120 | 1,988 | 551 / 1,272 / 710 | 524 / 1,082 | 2,150 | 3,730 | 124 / 143 | 50 |
| D19 | 8,192 | 5,215 | 1,571 | 2,031 | 588 / 1,298 / 711 | 1,052 / 1,996 | 4,300 | 5,898 | 128 / 170 | 50 |
| D19 | 16,384 | 9,020 | 1,817 | 2,478 | 711 / 1,690 / 745 | 2,094 / 4,172 | 8,600 | 10,232 | 141 / 184 | 52 |
| D24 | 1 | 1,062 | 0.9 | 1,061 | 368 / 632 / 428 | 0 / 1 | 1 | 2,286 | 115 / 117 | 48 |
| D24 | 1,024 | 5,095 | 201 | 4,469 | 1,259 / 2,748 / 1,717 | 133 / 441 | 547 | 2,286 | 123 / 132 | 50 |
| D24 | 4,096 | 6,913 | 593 | 4,607 | 1,298 / 2,825 / 1,752 | 527 / 1,595 | 2,189 | 3,976 | 137 / 165 | 52 |
| D24 | 8,192 | 9,694 | 845 | 4,780 | 1,399 / 2,973 / 1,751 | 1,255 / 3,248 | 4,379 | 6,224 | 148 / 223 | 54 |
| D24 | 16,384 | 15,843 | 1,034 | 6,027 | 1,519 / 4,123 / 1,795 | 2,354 / 6,802 | 8,758 | 10,724 | 175 / 235 | 55 |
| FULL | 1 | 1,994 | 0.5 | 1,993 | 450 / 1,617 / 376 | 0 / 1 | 1 | 2,408 | 114 / 115 | 44 |
| FULL | 1,024 | 6,725 | 152 | 5,515 | 1,506 / 3,420 / 2,090 | 138 / 913 | 551 | 2,408 | 120 / 126 | 47 |
| FULL | 4,096 | 10,699 | 383 | 5,693 | 1,532 / 3,571 / 2,085 | 537 / 2,860 | 2,204 | 4,122 | 128 / 171 | 50 |
| FULL | 8,192 | 16,580 | 494 | 5,894 | 1,670 / 3,682 / 2,141 | 1,082 / 5,840 | 4,408 | 6,402 | 131 / 197 | 52 |
| FULL | 16,384 | 30,413 | 539 | 7,239 | 1,837 / 4,915 / 2,180 | 2,136 / 12,311 | 8,815 | 10,960 | 129 / 237 | 52 |

(Batch sizes 64, 256 and 2,048 are in the JSON.) D1 and Growth run concurrently on two streams; the server time is
flat up to ≈ 8,192 candidates (**latency-bound**: one thread walks a whole door sequentially) and the client decode
grows linearly with the batch and with the door's trades (FULL decode dominates at large batches).

**Cold start** (server process start → INFO → dataset upload → first 1,024-candidate batch): D19 97 + 16 + 2,993 ms;
D24 104 + 33 + 6,542 ms; FULL 145 + 42 + 8,424 ms (datasets 34–95 MB).

## 4. CPU versus GPU on the same tasks

| Door / workload | CPU 12 workers ev/s | GPU single batch 8,192 ev/s | Speedup | GPU pipelined pool (4 × 8,192) ev/s | Speedup |
|---|---:|---:|---:|---:|---:|
| D19 joint | 200.0 | 1,571 | 7.9× | 1,519 | 7.6× |
| D24 joint | 92.3 | 845 | 9.2× | 597 | 6.5× |
| FULL joint | 77.0 | 494 | 6.4× | 419 | 5.4× |
| D24 D1-only (Growth disabled) | 203.5 | 855 | 4.2× | — | — |
| D24 Growth-only | 143.0 | 779 | 5.4× | — | — |
| D24 Growth fixed (New L0's Growth·VGT, D1 searched) | 193.0 | 804 | 4.2× | — | — |
| D24 detail + risk envelope (the pilot's evaluation) | 74.9 | 518 | 6.9× | — | — |
| D24 all options (stresses, native arming, whole shares) | 77.8 | 533 | 6.9× | — | — |

- CPU worker cost per evaluation: 59.5 ms (D19), 129.4 ms (D24), 155.1 ms (FULL), 158.9 ms (detail + risk); host RSS
  of the 12 workers 9.1–20.5 GB.
- The pipelined pool did **not** beat a single synchronous batch in these runs (D24 597 vs 845 ev/s): with 32,768
  queued tasks the main thread alternates encode and decode of 8 MB batches and its garbage collection grows (host
  RSS 6.9 GB vs 4.1 GB); the GPU is idle while the main thread decodes. Pipelining helps only when the main thread
  has spare time — which, in optimizer jobs, it does not (§2).
- **Workloads with a fixed Growth book gain less** (4.2×): the CPU caches the fixed Growth book across candidates while
  the GPU recomputes it for every candidate.

## 5. Maximum batch and memory per candidate

| Batch (D24) | Result | Wall ms | ev/s | Device MiB | VRAM peak MiB (of 32,607) | Power peak W | Temp peak °C |
|---:|---|---:|---:|---:|---:|---:|---:|
| 24,576 | ok | 36,301 | 677 | 13,136 | 16,118 | 256 | 55 |
| 32,768 | ok | 36,048 | 909 | 17,515 | 20,616 | 268 | 55 |
| 49,152 | ok | 54,918 | 895 | 26,273 | 29,616 | 281 | 55 |

- **Memory per candidate ≈ 0.535 MiB** of device memory at the default capacities (512 trades per book, 512 lots,
  2,048 funding records) plus the dataset (34–95 MB) and sparse tables; measured as the server's allocated device
  bytes divided by the batch, and confirmed by `nvidia-smi` during the run.
- **Largest measured batch: 49,152** (29.6 GB VRAM in use). The official gate refuses a batch whose planned device
  bytes exceed free VRAM minus 1 GiB; the production default is 8,192 (best end-to-end throughput, 4.4 GB).
- Beyond ≈ 16k the host decode dominates; larger batches do not raise throughput.
- Power stayed at 112–281 W (limit 600 W), temperatures ≤ 55 °C, SM clocks ≈ 2.6–2.8 GHz: no thermal or power
  throttling.

## 6. Bottlenecks

1. **Node main thread** (encode, decode, the canonical record reduction, optimizer logic): ≈ 69 % of an optimizer
   job's wall time. The largest remaining gain is moving encode/decode to worker threads (estimated up to ≈ 2× more on
   D19 jobs, bounded by the optimizer's own ≈ 0.25 ms per evaluation); this is a change to the host path (in the
   compatibility manifest) and therefore needs the full parity checklist and a new acceptance.
2. **Per-thread latency**: one thread per (candidate, book) walking every minute of the door; a single D24 candidate
   takes 0.6–4 s. The GPU needs thousands of candidates per batch to be efficient; optimizer stages that issue small
   batches (late refinement steps: 14 of 211 batches had < 1,024 candidates) run at a fraction of capacity.
3. **Occupancy**: the Growth kernel uses 255 registers with 624 B of spills (≈ 17 % theoretical occupancy), the D1
   kernel 180, the pool kernel 155 registers and a 1,360-byte stack (`ptxas-resource-usage.txt`). Kernel tuning
   (splitting the Growth state machine, shrinking state) is possible but must preserve bit-exactness.
4. **Transfers** are small relative to compute (≈ 8 MB request and ≈ 5 MB response per 8,192 batch).

## 7. Display hardware (monitor on the RTX 5090)

Measured: the desktop processes hold ≈ 0.7 GB of VRAM (2 % of 32.6 GB) and show no measurable SM utilization
(`pmon`), and every benchmark ran with the desktop as configured. A material benefit from moving the display to the
iGPU is **not** shown by these measurements (the bottleneck is the host CPU thread, and VRAM headroom is ample at the
production batch); **no change is recommended**, and none was made.

## 8. Projections (estimates derived from the measurements; `results/bench/projections.json`)

Model: per-evaluation GPU time = the measured pipelined-pool time of the door (D19 0.658 ms, D24 1.674 ms, FULL
2.385 ms; D21 1.066 / D23 1.471 ms interpolated by sessions) + the optimizer's host overhead calibrated on the two
complete D19 jobs (0.251 ms search, 0.290 ms qualification), times the workload's measured cost factor (detail + risk
1.41, all options 1.37, Growth fixed 0.91). A conservative variant scales the measured D19 job speedup by each door's
measured pooled speedup ratio.

| Workload | CPU (recorded) | GPU projected | Speedup | Basis |
|---|---:|---:|---:|---|
| Risk-envelope pilot, 0.3 M evaluations in total (screens + rung 1 of C21 and C24 under the envelope; incl. the 35 % control and the 40 / 25 / 25 % arms, +10 % qualification, two gate preflights) | ≈ 57 min (estimate, 12 workers) | **≈ 18 min** | ≈ 3.2× | detail + risk cost; preflights ≈ 3 min each |
| Same, 0.5 M | ≈ 95 min (estimate) | **≈ 26 min** | ≈ 3.7× | as above; if each arm is a separate 0.3–0.5 M search, multiply by the number of arms |
| Priority 3B scale, 5.83 M (four books, Growth·GDX funded) | 16.0 h (14 workers) | **2.5–3.1 h** | 5.2–6.5× | door model; the fourth book costs 0–30 % more (no ggdx throughput benchmark) |
| Assignment 3 scale, 17.53 M search + 1.64 M qualification | 44.3 h | **8.3–9.6 h** | 4.6–5.4× | job-by-job over A3's 23 recorded jobs (C24 informed lanes ≈ 1.1–1.5 h each instead of 6.4–6.6 h) |
| Assignment 2 scale, 34.2 M (Growth fixed) | 31.0 h | **12.9–14.0 h** | 2.2–2.4× | Growth-fixed factor; the CPU's fixed-Growth cache narrows the gain |
| Future staged trailing-stop studies | — | — | ≈ 2–4× (D1-focused, Growth fixed) to ≈ 5× (joint) | by analogy with the measured mixes; the workload is unknown |
| TSLA / MSFT studies | — | — | unknown | the GPU path is two-symbol and door-generic, but new symbols need their own doors, data checks, split adjustment and a parity campaign; more volatile symbols trade more (larger capacities and decode) |

Limits of extrapolation: complete jobs were measured on D19 only; longer doors raise both CPU and GPU cost (the GPU's
latency and decode grow faster than its throughput at D24/FULL); optimizer stages with small batches gain less; a
future host-path optimization (§6.1) would change every GPU figure.

## 9. Tranche gate TR1

Growth kernel time per candidate (amortized at batch 8,192): D19 0.158 ms, D24 0.363 ms, FULL 0.449 ms (≈ 62–64 % of
the server time; overlapped with the D1 kernel). Measured end-to-end on the complete Assignment 3 jobs: **5.22×**
(search) and **5.24×** (qualification); projected at Assignment 3 scale 4.6–5.4×. The gate (≥ 3× end-to-end, ideally
≥ 5×) **passes**; the decision to continue the Growth port was taken during development on the throughput probe and is
recorded in `results/tr1-tranche-gate.json`.
