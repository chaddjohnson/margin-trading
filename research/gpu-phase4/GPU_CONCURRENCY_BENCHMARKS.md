# GPU concurrency and batching — benchmarks (GPU Phase 4)

All figures are **measured on Apollo** unless a row says *projection*. Every group run is reported (none dropped);
every group's results were verified bit-identical before its timing was used (`GPU_CONCURRENCY_CORRECTNESS.md`).
Machine-readable: `results/bench/SUMMARY.json`, `results/bench/groups.csv` (one row per group), `results/bench/jobs.csv`
(one row per job), and per group `results/bench/<group>/{group,admission,summary,verify,gate}.json` and `monitor.jsonl`;
per job `results/optimizer/<run>/gpu/{profile,result,archive-digest}.json`, `receipts.jsonl`, `telemetry.jsonl`, or
`results/pool/<run>/profile.json` and its receipt ledgers. Protocol: `PROTOCOL.md` (frozen 06:04:19Z before any
measurement); amendments A1–A3 (`AMENDMENTS.md`). Timings never selected or tuned any trading parameter, and no money
figure of any configuration is reported.

## 1. Set-up

| Item | Value |
|---|---|
| GPU | NVIDIA GeForce RTX 5090, 32,607 MiB, UUID `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07 / CUDA 13.2, toolkit 13.2.86 (user space), power limit 600 W, compute mode Default, persistence off, no MPS daemon (present, never started) |
| Display / other GPU clients | GNOME on this GPU: gnome-shell, Xwayland and gnome-remote-desktop (a CUDA client, 504 MiB); 767 MiB in use at rest. No LLM/vLLM service, no container, no other GPU job, no other optimization session |
| CPU / memory | Ryzen 7 9800X3D, 8 cores / 16 threads, governor `performance`; 59 GiB RAM (≈ 54 GiB available at rest) |
| Engine | the ACCEPTED Phase 3 engine for every benchmark (B1–B9): binary `research/gpu-phase3/build/gb3` sha256 `06a4a04a…dc23`, compatibility digest `30824182…2998`, acceptance record `b08738be…` re-verified after the benchmarks at commit `d46604c2` |
| Containment | every job a transient systemd unit in `gpup4.slice` (aggregate MemoryHigh 44G / MemoryMax 48G / no swap), per-job MemoryMax 11G (14G for the FULL stress), per-server VRAM refusal budget ⌊28,000 / k⌋ MiB for k ≥ 2 |
| Admission (before every group) | no foreign GPU compute process; free VRAM ≥ k × 6,144 + 3,072 MiB; MemAvailable ≥ k × 5,888 + 8,192 MiB; GPU ≤ 50 °C; load ≤ 2 — every group admitted; none refused for capacity |
| Start | k jobs start together after a file barrier (start spread ≤ 0.1 s); start-up (door, dataset, server, host workers) excluded from the measured wall |
| Collection | per job: wall, fresh evaluations, the pool's receipt ledger per batch (size, server time, encode/decode, dispatch-to-release), queue and in-flight counts and main-thread event-loop utilization every second, `/proc` VmHWM/IO/CPU of the job and its GPU server. Per group (`monitor.ts`, 1 s): `nvidia-smi dmon` (**"kernel-active %" = share of time ANY kernel ran — a wall-time share, not compute**), memory-controller busy %, power, temperatures, SM/memory clocks, frame buffer; the driver's **GPM** counters as reported (SM activity, SM occupancy, DRAM bandwidth; stream state untouched); per-process VRAM every 5 s; clock-event (throttle) reasons; `/proc/stat` CPU busy share and the busiest core; load; MemAvailable; the slice's cgroup memory. Nsight Systems / Compute and DCGM are not installed (nothing installed) |

**Definitions** (PROTOCOL.md §7). *Window* = from the latest job start + 30 s to the earliest job end − 2 s (all jobs
running). *Aggregate* = Σ candidates of the batches the jobs completed inside the window ÷ window. *Server overlap* =
Σ server time of those batches ÷ window (> 1: batches of different processes inside the device at once). *Device ms per
1k candidates* = a job's server time per 1,000 of its candidates. *Makespan* = last end − first start.

## 2. Verified baseline (B1, B3)

| Run | Wall | ev/s | Phase 3 reference |
|---|---:|---:|---|
| `ftw1-r1` (complete Assignment 3 C19 broad1 job, 8 host workers, batch 8,192) | **583.1 s** | 2,131 | 583.8 / 581.7 s |
| `ftw1-r2` (same, later in the day) | **584.0 s** | 2,128 | |

Both identical to the canonical CPU archive (1,242,714 records, digest `9c2d7108…`) and the sealed record. Peak VRAM of
the job's server 5,138 MiB (5,910 MiB in use on the GPU incl. the desktop); host memory 5.0 GiB (job + server VmHWM);
GPU server time 60 % of the wall; main-thread ELU 0.50; CPU 12.5 % of 16 threads.

## 3. One, two, three and four simultaneous jobs — steady state (B2, B2r; Assignment 3)

k identical independent jobs, each the complete job's first 300,000 fresh evaluations (screen + the first rung, the
phase that holds 70 % of the job's evaluations), batch 8,192.

| Group | k | workers/job (total) | window s | aggregate ev/s | × k=1 | per-job ev/s | per-job slowdown | per-job CV | server overlap | kernel-active % | GPM SM activity % | GPM SM occupancy % | server ms/batch | device ms per 1k cand. | median batch | job main-thread ELU | VRAM in use peak MiB | free VRAM min MiB | CPU busy % mean (p95) | MemAvailable min MiB | slice peak MiB | host MiB/job |
|---|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|
| `ss1-w8` | 1 | 8 (8) | 93.1 | 2,687.2 | 1.00 | 2,687 | 1.00 | — | 0.73 | 75.2 | 33.6 | 0.7 | 1,790 | 272 | 7,288 | 0.562 | 5,910 | 26,199 | 14.0 (28.0) | 49,695 | 5,649 | 4,447 |
| `ss1-w8-r2` | 1 | 8 (8) | 93.4 | 2,679.4 | 1.00 | 2,679 | 1.00 | — | 0.73 | 74.7 | 33.3 | 0.8 | 1,792 | 272 | 7,288 | 0.561 | 5,910 | 26,199 | 13.8 (28.5) | 49,561 | 5,534 | 4,537 |
| `ss2-w8` | 2 | 8 (16) | 159.7 | 3,339.2 | 1.24 | 1,670–1,670 | 1.61 | 0.000 | 1.73 | 93.1 | 42.4 | 1.1 | 3,453 | 518 | 7,944 | 0.308 | 11,053 | 21,055 | 18.5 (35.5) | 45,309 | 10,848 | 4,692 |
| `ss2-w8-r2` | 2 | 8 (16) | 159.2 | 3,350.6 | 1.25 | 1,675–1,675 | 1.60 | 0.000 | 1.73 | 93.6 | 42.4 | 1.1 | 3,436 | 515 | 7,944 | 0.312 | 11,053 | 21,055 | 18.3 (35.0) | 45,402 | 10,635 | 4,421 |
| `ss2-w4` | 2 | 4 (8) | 163.4 | 3,263.2 | 1.22 | 1,632–1,632 | 1.64 | 0.000 | 1.69 | 93.2 | 41.7 | 1.1 | 3,448 | 517 | 7,944 | 0.296 | 11,053 | 21,055 | 15.6 (35.6) | 47,307 | 9,383 | 3,698 |
| `ss3-w8` | 3 | 8 (24) | 232.6 | 3,488.6 | 1.30 | 1,148–1,182 | 2.31 | 0.012 | 2.67 | 98.9 | 45.7 | 1.2 | 5,141 | 767 | 8,176 | 0.206 | 16,197 | 15,912 | 20.3 (48.2) | 42,518 | 15,564 | 4,302 |
| `ss3-w5` | 3 | 5 (15) | 227.5 | 3,535.3 | 1.32 | 1,164–1,208 | 2.28 | 0.018 | 2.66 | 99.6 | 45.5 | 1.2 | 5,089 | 753 | 8,181 | 0.213 | 16,197 | 15,912 | 18.9 (50.5) | 43,802 | 13,739 | 3,808 |
| `ss3-w3` | 3 | 3 (9) | 231.2 | 3,545.6 | 1.32 | 1,166–1,191 | 2.27 | 0.010 | 2.64 | 99.0 | 45.5 | 1.2 | 4,997 | 744 | 8,181 | 0.206 | 16,197 | 15,912 | 17.7 (43.3) | 45,383 | 12,687 | 3,279 |
| `ss3-w3-r2` | 3 | 3 (9) | 234.2 | 3,428.9 | 1.28 | 1,115–1,173 | 2.35 | 0.021 | 2.58 | 98.4 | 45.0 | 1.1 | 5,032 | 752 | 8,176 | 0.199 | 16,197 | 15,912 | 17.0 (38.0) | 45,314 | 12,853 | 3,218 |
| `ss4-w8` | 4 | 8 (32) | 314.4 | 3,489.4 | 1.30 | 857–900 | 3.08 | 0.020 | 3.67 | 99.8 | 46.1 | 1.2 | 7,074 | 1,051 | 8,188 | 0.151 | 21,340 | 10,769 | 21.1 (51.8) | 39,467 | 19,815 | 4,014 |
| `ss4-w4` | 4 | 4 (16) | 316.4 | 3,492.0 | 1.30 | 852–894 | 3.07 | 0.025 | 3.60 | 100.0 | 46.6 | 1.3 | 6,957 | 1,033 | 8,184 | 0.153 | 21,340 | 10,769 | 19.5 (54.9) | 42,184 | 17,249 | 3,378 |
| `ss4-w2` | 4 | 2 (8) | 319.6 | 3,475.8 | 1.30 | 843–886 | 3.09 | 0.021 | 3.51 | 100.0 | 46.2 | 1.2 | 6,792 | 1,009 | 8,184 | 0.147 | 21,340 | 10,769 | 17.5 (37.4) | 43,232 | 16,009 | 3,105 |
| `ss4-w2-r2` | 4 | 2 (8) | 320.5 | 3,465.8 | 1.29 | 841–883 | 3.10 | 0.021 | 3.49 | 100.0 | 46.2 | 1.2 | 6,790 | 1,009 | 8,184 | 0.148 | 21,340 | 10,769 | 17.7 (44.3) | 43,406 | 15,952 | 3,107 |

Means (the decision record `results/decisions/b2r.json`): **k = 1 2,683 · k = 2 3,345 (1.25×) · k = 3 3,487 (1.30×) ·
k = 4 3,471 (1.29×) ev/s.** Run-to-run: k = 1 0.3 %, k = 2 0.3 %, k = 3 3.3 %, k = 4 0.3 %. Drift: k = 1 at the start
(06:16) 2,687 and at the end of B2 (07:04) 2,679. Power 135–158 W of 600 W, GPU ≤ 59 °C, SM clock 2,865 MHz in the
windows, clock-event (throttle) reasons 0 throughout, memory-controller busy ≤ 0.4 %, GPM DRAM bandwidth 0 %.

### What the counters show

1. **The device time-slices the processes; it does not run their kernels concurrently.** A job's server time per batch
   grows with k almost exactly (1,790 → 3,450 → 5,000–5,140 → 6,790–7,070 ms; device ms per 1,000 candidates 272 → 517
   → 744–767 → 1,009–1,051), while the batches are the same size. Divided by k the device cost per candidate is flat
   (272, 259, 250–256, 252–263 ms per 1,000). Two processes' kernels each run at about half speed whenever both are on
   the device.
2. **The gain comes only from filling one job's idle gaps.** At k = 1 the GPU runs a kernel 73–75 % of the time (the
   optimizer's own round trip: lanes wait for their batch, then compute the next proposals). A second job fills most of
   the gap (kernel-active 93 %); at k = 3 the device's time is full (99 %) and the aggregate stops rising. The ceiling
   implied by k = 1 — 2,683 ÷ 0.73 = 3,675 ev/s if the device were never idle at the same cost per candidate — is reached
   to 95 % (3,487), the rest being context-switch overhead.
3. **The silicon is mostly idle even when "a kernel is running".** GPM SM activity is 34 % at k = 1 and saturates at
   ≈ 46 % at k ≥ 3; SM occupancy ≈ 1 %; DRAM bandwidth 0 %. One GPU thread evaluates one (candidate, book) over the
   whole door (Phase 2 design), so a batch's duration is its slowest thread's: the kernels are latency-bound, and
   time-slicing cannot use the idle SMs.
4. **Host workers per job hardly matter once the GPU is shared.** At k = 3: 9, 15 or 24 workers give 3,546 / 3,535 /
   3,489 ev/s; at k = 4: 8, 16, 32 give 3,476 / 3,492 / 3,489. At k = 2, 4 workers per job are 2.3 % slower than 8.
   CPU use stays 14–21 % of 16 threads (p95 ≤ 55 %), the busiest core 52–71 %; per-job host memory falls from 4,302–4,692
   MiB (8 workers) to 3,105 MiB (2 workers). Over-subscription (32 threads on 16) cost nothing measurable; it also gained
   nothing.

## 4. Fixed total work — one study split into k concurrent jobs (B4; Assignment 3, complete)

The single Assignment 3 job's 64 lanes divided round-robin into k complete jobs (each part's cap its own lanes'), run
together. The parts' union equals the single job's archive exactly; no evaluation was duplicated across parts.

| Group | k | workers/job | makespan | × single (583.6 s) | per-job walls s | kernel-active % | GPM SM % | VRAM in use peak MiB | host MiB/job |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| `ftw1-r1` / `ftw1-r2` | 1 | 8 | 583.1 / 584.0 s | 1.00 | 583.1 / 584.0 | 61.5 / 59.1 | 24.2 / 24.6 | 5,910 | 5,008 |
| `ftw2` | 2 | 8 | **543.8 s** | 1.073 | 534.7, 543.8 | 83.3 | 26.6 | 11,041 | 4,396 |
| `ftw2-r2` | 2 | 8 | **549.2 s** | 1.063 | 538.2, 549.2 | 81.4 | 26.5 | 11,041 | 4,395 |
| `ftw3` | 3 | 3 | 638.5 s | 0.914 | 638.4, 622.1, 611.9 | 97.2 | 23.3 | 16,179 | 3,056 |
| `ftw4` | 4 | 2 | 780.1 s | 0.748 | 744.4, 743.8, 777.4, 780.1 | 99.4 | 19.5 | 21,312 | 3,207 |

Splitting one study helps only marginally at k = 2 (6–7 %) and hurts beyond: each part has 1/k of the lanes, so its
batches are 1/k as full (median 3,900–5,500 at k = 2), and a latency-bound kernel costs nearly the same for a small batch
as for a full one. **Do not split one optimization across processes to speed it up.**

## 5. The Growth-fixed Assignment 2 job (B5; steady state, 400,000-evaluation prefixes)

| Group | k | workers/job | aggregate ev/s | × k=1 | per-job ev/s | server overlap | kernel-active % | GPM SM % | job main-thread ELU | VRAM in use peak MiB | CPU % | host MiB/job |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| `a2-ss1-w8` | 1 | 8 | 3,101.5 | 1.00 | 3,101 | 0.47 | 47.5 | 28.6 | 0.658 | 5,894 | 15.2 | 4,180 |
| `a2-ss2-w8` | 2 | 8 | 4,820.6 | **1.55** | 2,356–2,464 | 1.26 | 75.4 | 47.2 | 0.459 | 11,021 | 25.1 | 4,463 |
| `a2-ss3-w3` | 3 | 3 | 5,339.0 | **1.72** | 1,727–1,806 | 2.14 | 85.6 | 54.3 | 0.296 | 16,149 | 25.3 | 3,555 |

The Growth-fixed job keeps its GPU idle more than half the time on its own (its main thread — lane logic and archive —
is the bottleneck, ELU 0.66), so a second and a third process find much more idle device time: 1.55× and 1.72×, one run
each (the protocol makes the Assignment 3 job decide Mode A; this is reported beside it, §8).

## 6. Batching (B3) — single job and two jobs

| Group | k | batch | result | vs 8,192 |
|---|---:|---:|---|---|
| `b4096-r1` | 1 | 4,096 | complete job **673.8 s** (median batch 4,096; kernel-active 81 %) | 15.5 % slower |
| `ftw1-r1`, `ftw1-r2` | 1 | 8,192 | **583.1 / 584.0 s** | — |
| `b16384-r1` | 1 | 16,384 | complete job **609.6 s** (server overlap 0.41: less device time, but longer rounds) | 4.5 % slower (Phase 3: 608.6 s) |
| `ss2-b4096` | 2 | 4,096 | aggregate 2,169 ev/s | 35 % lower than 3,345 |
| `ss2-w8`, `-r2` | 2 | 8,192 | aggregate 3,339 / 3,351 ev/s | — |
| `ss2-b16384` | 2 | 16,384 | aggregate 3,423 ev/s (kernel-active 55 %, device ms per 1k 312) | +2.3 % (< the 3 % rule) |

Rule R1 keeps **8,192** for one job (neither alternative was faster, so no second run was triggered); rule R4 keeps
8,192 at k = 2 (+2.3 % < 3 %). Larger batches cut device time per candidate sharply but lengthen every optimizer round;
smaller ones waste the latency-bound kernel.

## 7. The kernel batch-size curve and the shared-queue question (B7, W-K)

The production pool on D19, the joint mix, a fixed seeded set of 32,768 Assignment 3 genomes queued at once (the device
never waits for an optimizer); rounds 2–3 (steady); every batch size's hash map identical to the 8,192 reference.

| Group | batch | server ms per batch | device ms per 1k candidates | one-process ev/s | kernel-active % | GPM SM % | VRAM per server MiB |
|---|---:|---:|---:|---:|---:|---:|---:|
| `k-b2048` | 2,048 | 1,913 | 934 | 1,023 | 100 | 23.4 | 1,872 |
| `k-b4096` | 4,096 | 1,953 | 477 | 1,910 | 90.5 | 36.3 | 2,960 |
| `k-b8192` | 8,192 | 2,041 | 249 | 3,287 | 78.0 | 56.8 | 5,128 |
| `k-b16384` | 16,384 | 2,480 | 151 | 4,580 | 60.0 | 52.5 | 9,460 |
| `k-b32768` | 32,768 | 3,401 | 104 | 4,980 | 50.8 | 42.1 | 18,134 |
| `k2-b8192` | 2 processes × 8,192 | 3,868 (each, time-sliced) | 472 (each) | **3,766** together | 95.6 | 63.9 | 5,128 each |

**Shared queue (R5, not implemented).** The same 65,536 candidates take 17.4 s as two time-sliced processes at 8,192
(3,766 ev/s) and 14.3 s as one process at 16,384 (4,580 ev/s): **one server merging two jobs' batches into one launch
would deliver 1.22× the time-sliced throughput** of the device on this mix, 1.39× one process at 8,192 (measured,
device-saturated). For optimizer jobs, whose own round trips leave the device idle part of the time, the realized gain
would be smaller; a defensible *projection* for two Assignment 3 jobs is ≈ 1.1–1.3× over Mode A's measured 3,345 ev/s
(a merged 16,384 launch takes 2.5 s where two time-sliced 8,192 batches take ≈ 3.45 s). Architecture and caveats:
`GPU_OPERATING_RECOMMENDATIONS.md` §6.

## 8. The small-batch mini schedule (B6) and the large-door detailed-risk stress (B8)

| Group | Workload | k (workers) | result | × k=1 |
|---|---|---|---|---:|
| `s1-w8` | mini (16 lanes, D19, median batch ≈ 376), complete | 1 (8) | 65.1 s (Phase 3: 65.2 s), 472 ev/s | 1.00 |
| `s2-w4` | two minis | 2 (4) | makespan 126.2 s, aggregate 487 (window 543) ev/s | **1.03** |
| `s4-w2` | four minis | 4 (2) | makespan 226.9 s, aggregate 542 (window 553) ev/s | 1.15 |
| `sf2-w4` | the mini split in two | 2 (4) | 107.3 s | 0.61 |
| `r1b-w8` | FULL, detail + risk (16,384 fixed tasks/round, queued) | 1 (8) | 829 ev/s (rounds 2–3); VRAM 6,524 MiB per server; host 6,733 MiB | 1.00 |
| `r2b-w8` | same, two processes | 2 (8) | ≈ 860 ev/s together (423–436 each) | **1.04** |

The mini schedule is the cleanest test of cross-process kernel concurrency: each tiny batch's kernel occupies a few SMs
for ≈ 1.5 s, yet two processes gain 3 % — they cannot overlap on the device. A device-saturated workload (the queued FULL
stress) gains nothing either (4 %). VRAM for the large-door detailed-risk mix: 6,524 MiB per server at 8,192 (two
processes 13,825 MiB in use, 18,283 MiB free).

## 9. Thermal, power, clocks, memory, I/O (every group)

- Power 114–167 W mean (peak 253 W, `k-b32768`) of the 600 W limit; GPU ≤ 59 °C; SM clock 2,745–2,880 MHz mean; clock-event
  reasons `0x0` in every sample of every group (no power, thermal or software throttling). Minimum clock readings of
  ≈ 190 MHz are idle samples at a group's edges.
- VRAM per Assignment 3 job (server process, batch 8,192) 5,138 MiB; 4 jobs 21,340 MiB in use (10,769 MiB free). Host
  memory per job 3,105–5,008 MiB (falls with fewer host workers); slice peak 19,815 MiB (k = 4, 8 workers); MemAvailable
  ≥ 39,467 MiB;
  no swap, no cgroup `max` or OOM event. `memory.high` (10 G per job) reclaim events occurred only in the four complete
  single-job runs (803, 776, 223, 1,986 events): the job's cgroup counts its SQLite archive's page cache (≈ 5.4 GB);
  no failure, and B1's wall equals Phase 3's (disclosure D1).
- Archive and I/O: ≈ 6.8 GB written per 300,000-evaluation prefix and ≈ 31.6 GB per complete Assignment 3 job (SQLite WAL
  and checkpoints); archive-write time 11–17 s per prefix job, 66.7 s per complete job (main thread), unchanged by
  concurrency.

## 10. Measured versus projected

Measured: every table above. Projected (labelled where used): the complete-job completion time of Mode A from the
steady-state ratio (confirmed or corrected by the A3 confirmation run, §11), the shared-queue gain for optimizer jobs
(§7). No figure was extrapolated from memory size or SM counts.

## 11. Mode A confirmation with complete jobs (amendment A3) and the final binary's regression

(Filled after the acceptance campaign: `results/bench/modeA-complete/`, `results/optimizer/regression.json`.)
