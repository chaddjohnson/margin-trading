# Protocol — GPU Phase 4: concurrency, batching, final acceptance and research handoff

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before the first
benchmark measurement). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

This is an **engineering benchmark study**. It measures how best to use Apollo's RTX 5090 for independent optimization
jobs — one job at a time versus two, three or four at once, and larger or smaller batches — on the **accepted** Phase 3
engine, proves that concurrency and batching change nothing but timing, fixes the one disclosed root TypeScript error,
renews the acceptance once on the final code, integrates the result and writes the handoff. It does **not** search for,
select, rank, adopt or deploy any trading configuration, changes no trading rule, candidate, risk gate, objective,
genome, optimizer algorithm, budget, seed or research finding, builds no multi-job scheduler, and **does not create,
implement, run, preflight, adopt, qualify or modify the risk-envelope pilot** (brief: "Non-negotiable scope boundary").

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `3.0.0`, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (read in full, §0–§9, before 2026-11-20T05:40Z) |
| Adoption manifest | `research/gpu-phase4/STANDARD_ADOPTION.json`; preflight `npm run research-preflight -- --study research/gpu-phase4` |
| Scope | `diagnostic` (benchmarks and identity checks of replays of sealed jobs and of seeded/fixed configurations; nothing is selected) |
| Brief | `research/gpu-phase4/brief/BRIEF.md`, sha256 `ffcb79abacd9b8a0c3deeed28ba7e394f926891f49ebe84043e242e99c4a353e` (the user's handoff, 147 lines, read in full, final section "Success criterion" present) |
| Branch / base | `research/gpu-phase4` from `3a52cc635c95f74fc6cf3c22aa30bf4507293fa3` (= `main` = `research/gpu-phase2` = `research/gpu-phase3` on origin) |
| Accepted baseline (immutable) | `config/gpu-backend/acceptance.json` ACCEPTED (schema 2, written by `research/gpu-phase3/`), record sha256 `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214` (equal to the out-of-band value in the brief; a copy outside Git: `~/.local/share/margin-trading-gpu/acceptance-pins/`), binary `research/gpu-phase3/build/gb3` sha256 `06a4a04a83265616ab363632c02bf5d7737f34ec12156655cf95e135dde0dc23`, source revision `e33da74f`; `tools/gpu-backend/verify-acceptance.sh --device --expect-record-sha256 b08738be…` VERIFIED at 2026-11-20T05:38Z |
| Evaluation backend (§9) | `{ policy: "non-official-cpu", purpose: "benchmark" }` — no official evaluation happens. GPU runs are non-official benchmarks and identity checks on the accepted binary (purpose `benchmark`); the acceptance campaign (§10) runs non-official parity tests (purpose `parity-test`) and CPU parity references. Nothing is official optimization evidence (§9.8). |
| Reference method | none |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §2.3 | adaptation | No roles, no primary: nothing is selected. Outcomes are measured benchmark figures, two operating recommendations (§8) and engineering gates (§9–§10). |
| AD2 | §4, §1.8 | adaptation | No search for selection and no chronological verdict. The search-shaped runs replay sealed jobs (Assignment 3 C19 broad1, Assignment 2 C19 base) with their own frozen code, seeds, cells, budgets and doors, and Phase 2's parity-only mini schedule; they are compared by identity only. |
| AD3 | §1.4 | adaptation | Doors D19 and FULL (and, in the acceptance campaign, every door and fixture of Phase 3's campaign) are opened quietly through this study's own door log for replays and seeded timing/parity configurations, as in Phases 2–3. All of 2016–2026 is previously examined history. |
| AD4 | §5.1 | adaptation | The TypeScript/CPU engine is the unmodified canonical reference; every concurrent, split or re-batched run must reproduce the canonical or sealed records bit for bit (zero tolerance). |
| AD5 | §5.9 | adaptation | Not applicable (no fold primary or final candidate). |
| AD6 | §6.3 | adaptation | The concurrency, worker-count and batch-size measurements are the subject of this study (engineering of the evaluator's use), not a search's tuning pilot; they never tune a trading parameter. |
| AD7 | §1.5 | adaptation | Stricter: no money figure of any configuration is reported; replays and seeded runs appear only as identity booleans, counts, hashes and timings. |
| AD8 | §6.4 | adaptation | Endurance: no long endurance run (brief §1). Benchmarks last minutes; one bounded 30–35 min reliability run on the final code (§10). Phase 2's 8 h run is reused only for byte-identical kernels and server. |
| AD9 | §0.4 | adaptation | The risk-envelope pilot is out of scope (the brief's scope boundary takes precedence): nothing of it is created, implemented, preflighted or run; `GPU_PILOT_READINESS.md`'s missing delivery route stays untouched. |

## 1. Questions and outcomes

- **Q1 (concurrency).** Do 2, 3 or 4 simultaneous independent GPU optimization jobs raise the **aggregate** candidate
  evaluations per second over one optimized job, and at what per-job slowdown, resource cost and stability?
- **Q2 (worker allocation).** How many host-pipeline workers should each job use when several run at once (8 physical /
  16 logical CPU cores)?
- **Q3 (batching).** Does another supported batch size (4,096 / 16,384 vs the accepted 8,192) shorten a single job, or
  a concurrent group?
- **Q4 (correctness and isolation).** Do concurrency and batching leave every trade record, fitness, rank, promotion and
  selection unchanged, keep jobs isolated, and fail closed?
- **Q5 (engineering).** Fix the root TypeScript error (`hostPipeline.ts:196`) narrowly, renew the acceptance once on the
  final candidate, integrate only what needs integration, restore the working branch, hand off.
- **Outcomes:** Mode S and Mode A recommendations (§8; possibly identical, possibly "one job at a time"), measured
  tables, verified identity, a new acceptance record for the final code (or, if the fix had to be abandoned, the
  Phase 3 acceptance unchanged and the reason), the merge decision, the handoff ZIP.

## 2. Baselines (verified, not forced)

Phase 3 (`research/gpu-phase3/GPU_PERFORMANCE_BEFORE_AFTER.md`): Assignment 3 C19 broad1 job (1,242,714 fresh
evaluations) 583.8 / 581.7 s on 8 host workers, batch 8,192 (sealed CPU job 5,900.8 s on 12 workers); 211 batches
(median 7,980), GPU server 348 s, main-thread ELU 0.63, peak RSS 4.8 GiB, VRAM ≈ 5.9 GiB in use (≈ 5.1 GiB of it the
job's); batch 16,384: 608.6 s. Assignment 2 C19 base: 724.8 / 726.5 s (ELU 0.77). Mini schedule: 65.2 s. These are
re-measured where §5 says so; a different figure is reported as measured, never adjusted.

## 3. Environment, safety and admission

- **Recorded before the first benchmark** (`results/preflight/environment.json`): hardware (RTX 5090 32,607 MiB, UUID,
  driver 595.91.07, CUDA 13.2, toolkit 13.2.86; Ryzen 7 9800X3D 8 cores / 16 threads, governor; 59 GiB RAM), display
  use (gnome-shell, Xwayland, gnome-remote-desktop — a CUDA client with ≈ 504 MiB), free/used VRAM, other GPU clients,
  running services and containers (no vLLM/LLM service), clocks, power limit, temperatures, P-state, load, host workers,
  batch settings, source/binary/acceptance/door hashes, the acceptance status.
- **Never:** reboot, change the display connection, drivers, clocks, power limits or GPM/persistence settings, start an
  MPS daemon, stop any service, or touch another session's job. If capacity is insufficient, the level is **refused and
  reported**, never forced.
- **Containment:** every job is a transient systemd user unit in **`gpup4.slice`** (aggregate MemoryHigh 44G, MemoryMax
  48G, MemorySwapMax 0 — standard §6.2) with its own per-job MemoryMax (default 11G, so that k = 4 stays ≤ 44G and a
  runaway job meets its own cap, never a neighbour's) and, for k ≥ 2, a per-server VRAM budget of ⌊28,000 / k⌋ MiB
  (`--vram-budget-mb`: the server refuses a batch beyond it — the job fails closed instead of starving another).
- **Admission before every group** (`tools/gpu-phase4/admit.ts`): no GPU compute process other than the desktop's and
  no gpup4 job unit running; free VRAM ≥ k × V + 3,072 MiB reserve; MemAvailable ≥ k × R + 8 GiB; GPU ≤ 50 °C (wait ≤
  180 s); load ≤ 2.0 (wait ≤ 120 s). V and R are 1.15 × the per-process VRAM and per-job host memory measured at k = 1
  for that workload and batch (defaults before measurement: V 7,000 MiB at 8,192, 4,000 at 4,096, 11,000 at 16,384;
  R 7,168 MiB).
- **Between levels** (in the order k = 1 → 2 → 3 → 4): the previous level's verification passed, no job failed, no OOM
  or cgroup `max` event, minimum free VRAM ≥ 3,072 MiB, minimum MemAvailable ≥ 8 GiB, no swap in the slice. Otherwise
  the higher levels are not run and the limitation is reported.

## 4. Workloads (real, fixed, reproducible)

| ID | Workload | Size | Reference for identity |
|---|---|---|---|
| W-A3 | Assignment 3 C19 broad1 search replay: joint D1·GDX + D1·VGT + Growth·VGT with mutable Growth (64 lanes, door D19) — the Assignment 3-representative joint job | 1,242,714 fresh | the canonical CPU archive of this job (Phase 3's 12-worker CPU replay `final-a3-cpu`, digest `9c2d7108…`, = the GPU replays) and the sealed record `research/vg-l0-full-joint/results/search/C19/broad1.json` |
| W-A2 | Assignment 2 C19 base search replay: Growth fixed to New L0's phenotype, D1 shared capital (128 lanes, D19) | 2,196,920 fresh | the sealed record `research/vg-l0-risk-families/results/search/C19/base.json` and the accepted replay's archive (`final-a2-r1`, digest `4a8624fc…`) |
| W-S | the mini schedule (Assignment 3's broad lane on Phase 2's G7 schedule, 16 lanes, D19; median batch ≈ 376): small batches, GPU-latency-bound | 30,749 fresh | Phase 3's CPU arm `final-mini/cpu` (digest `014239d8…`) |
| W-R | large-door detailed-risk stress: the production pool on FULL, the detail + risk mix (detailed record and risk-envelope inputs), a fixed seeded set of 16,384 Assignment 3 genomes per round, 3 rounds, the whole round queued | 49,152 | repeatability across rounds, identical hash maps across groups, 24 canonical CPU samples per job |
| W-K | kernel batch-size curve: the production pool on D19, the joint mix, a fixed seeded set of 32,768 genomes, 3 rounds, batch 2,048 / 4,096 / 8,192 / 16,384 / 32,768; and two processes at 8,192 against one at 16,384 | 98,304 | as W-R |

Tools: `tools/gpu-phase4/replay.ts` (the job body of Phase 3's replay, unchanged, plus per-job namespaces with a lock,
the round-robin lane partition, the stop-after prefix dump, a start barrier and 1 s queue sampling), `poolbench.ts`
(W-R, W-K), `group.sh` (launch, containment, admission, monitor), `monitor.ts`, `admit.ts`, `verify.ts`,
`verify-pool.ts`, `summarize.ts`. Every job writes only its own namespace (`results/optimizer/<run>/`,
`results/pool/<run>/`, `cache/replay/<run>/` with its own exported dataset and archive, `results/raw-large/…`): no file
is shared for writing between concurrent jobs. The harness smoke checks `smoke-m1`, `smoke-m2` (mini prefixes of 3,000
evaluations, before this freeze) only tested the tools; they are not results.

## 5. Designs and the run matrix (in this order)

**Steady state (SS):** k identical independent jobs (the same full job, each in its own namespace) start together
after a barrier and each stops after a fixed prefix of fresh evaluations (W-A3: 300,000 ≈ the screen and the first rung
phase, which is 70 % of the job's evaluations; W-A2: 400,000), dumping and verifying its archive. **Fixed total work
(FTW):** the one W-A3 job split into k complete jobs by lane (lane index i → job i mod k; each part's cap is its own
lanes' cap, as a genuinely smaller job's), run together; total work is the same job — cross-lane archive hits of the
single job become fresh evaluations in another part (counted and reported), and each part's batches are smaller (the
batch fill is the optimizer's, never padded).

| Stage | Groups (k, host workers per job, batch) | Purpose |
|---|---|---|
| B1 | `ftw1-r1`: W-A3 complete, k = 1, w8, b8192 | baseline verification (582–584 s?); V and R for admission |
| B2 | SS W-A3: `ss1-w8`; `ss2-w8`, `ss2-w4`; `ss3-w8`, `ss3-w5`, `ss3-w3`; `ss4-w8`, `ss4-w4`, `ss4-w2`; `ss1-w8-r2` (drift) | Q1, Q2: totals 8/16/8/24/15/9/32/16/8 workers |
| B2r | repeat (r2) of the best allocation of each k ≥ 2 (rule R2) | variability |
| B3 | W-A3 complete single job: `b4096-r1`, `b16384-r1` (w8), `ftw1-r2` (b8192); a second run of 4,096 or 16,384 if it beats 8,192 by ≥ 3 %; SS at k = 2 with the k = 2 best allocation: `ss2-b4096`, `ss2-b16384` | Q3, alone and concurrently |
| B4 | FTW W-A3 complete: `ftw2`, `ftw3` (lanes 22/21/21), `ftw4` with each k's best allocation; `ftw<k*>-r2` for the Mode A candidate k* | Q1 as one study split into concurrent jobs; full identity under concurrency |
| B5 | SS W-A2 (stop 400,000): `a2-ss1-w8`, `a2-ss2`, `a2-ss3` with the W-A3 best allocations | Q1 for the Growth-fixed, main-thread-bound job |
| B6 | W-S mini complete: `s1-w8`, `s2-w4` (SS), `s4-w2` (SS), `sf2-w4` (FTW, 8 lanes each) | small batches: does the device run kernels of two processes at once? |
| B7 | W-K: `k-b2048`, `k-b4096`, `k-b8192`, `k-b16384`, `k-b32768` (k = 1, w8); `k2-b8192` (k = 2, w8) | the shared-queue question (§8) |
| B8 | W-R: `r1-w8` (k = 1), `r2-w<best>` (k = 2) | large-door detailed-risk VRAM, memory and throughput |
| B9 | isolation, restart and failure tests (§9) | Q4 |

Cool-down: each group starts only after admission (GPU ≤ 50 °C, load ≤ 2). Every run is reported; none is discarded for
being slow. One group at a time; nothing else of this study runs on the GPU meanwhile. A failed admission or safety
check stops the higher levels (§3).

## 6. Measurement (per job and per group; collection methods)

- **Per job** (`profile.json`, `receipts.jsonl`, `telemetry.jsonl`): barrier-to-end wall, fresh evaluations, ev/s;
  main-thread event-loop utilization (`performance.eventLoopUtilization`); process CPU (user/system, main thread and
  host workers together); peak RSS (1 s samples and `/proc/<pid>/status` VmHWM) of the job and of its GPU server process;
  `/proc/<pid>/io` bytes; archive-write seconds; GC; the pool's queue and in-flight counts every second; per batch (the
  receipt ledger): size, server time (kernels + transfers inside the server), encode and decode times, dispatch-to-
  release time.
- **Per group** (`monitor.jsonl`, 1 s): `nvidia-smi dmon` — "sm" = the share of time **any kernel** ran (a wall-time
  share, not compute activity), "mem" = memory-controller busy share, power, temperatures, SM/memory clocks, frame
  buffer; the driver's **GPM** columns (SM activity, SM occupancy, DRAM bandwidth) as reported — the GPM stream state is
  not changed; a column that reads "-" or a constant 0 is reported as not available / not interpretable; per-process VRAM
  (`--query-compute-apps`, 5 s); clock-event (throttle) reasons; `/proc/stat` CPU busy share and the busiest core;
  load; MemAvailable; swap; the slice's `memory.current`, `memory.peak`, `memory.events`. Nsight Systems, Nsight
  Compute and DCGM are not installed (`which` finds none); nothing is installed.
- Never invented: a figure that was not measured is "not measured"; projections are labelled as such.

## 7. Metrics (exact definitions)

- **Makespan** = max end − min start (after the barrier); **aggregate (makespan)** = Σ fresh / makespan.
- **Window** = [latest start + 30 s, earliest end − 2 s] (all jobs running); null if < 60 s. **Window rate** per job =
  candidates of its batches completed in the window / window length; **aggregate rate** = their sum; **CV** across jobs.
- **Speed-up (aggregate)** = aggregate rate at k / the k = 1 rate of the same workload, allocation and batch (and
  against the k = 1, w8, b8192 default); **per-job slowdown** = k = 1 rate / per-job rate at k.
- **Server overlap** = Σ server time of the window's batches / window (> 1: batches of different processes inside the
  device at once, i.e. time-sliced); **device-idle share** per job = 1 − its server time / window.
- **Equivalent-work wall** = 1,242,714 / aggregate rate (W-A3: the time one full job's work takes at that rate;
  projection) and, for FTW, the measured makespan; **per-job completion** at k = 1,242,714 / per-job rate (projection
  for SS; measured for FTW and complete runs).

## 8. Decision rules (frozen) and the two recommendations

- **R1 — Mode S** (maximum single-optimization speed): the batch with the lowest mean complete W-A3 wall among 4,096 /
  8,192 / 16,384 at 8 host workers; the accepted default (8,192, 8 workers) stays unless another batch is faster by
  ≥ 3 % in each of two runs. Host workers: 8 (Phase 3's measured knee: 4 → 611.7 s, 8 → 583.9 s, 12 → 582.1 s) unless
  B1/B3 contradict it.
- **R2 — per-k allocation:** for each k, the allocation with the highest SS aggregate window rate (mean of the runs);
  within 2 % of it, the allocation with fewer total host workers.
- **R3 — Mode A** (maximum aggregate throughput): k* = the **smallest** k whose best aggregate rate is within 5 % of the
  maximum over k, provided it exceeds the k = 1 rate by ≥ 10 % in every run of that configuration; otherwise Mode A =
  **one job at a time**. A level that fits in memory but adds < 5 % is not recommended. Every correctness gate (§9) and
  safety margin (§3) must hold at k*; FTW (B4) and W-A2 (B5) are reported beside it and can only make the
  recommendation more conservative (a k* that does not help FTW or W-A2 is stated with that limit).
- **R4 — batch in Mode A:** the batch with the highest SS aggregate rate at k* among those measured; 8,192 unless
  another is ≥ 3 % better.
- **R5 — shared queue (not implemented):** from W-K, the potential of one server merging several jobs' batches is the
  measured difference between one process at 16,384 and two processes at 8,192 (device seconds and wall for the same
  candidates); a minimal architecture is described, never built (brief §3).
- Mode S and Mode A are each stated with: batch, host workers, GPU memory budget and headroom, measured throughput and
  latency (per-job completion), capacity limits, and which figures are measured vs projected.

## 9. Correctness, isolation and failure gates (zero tolerance)

1. **Identity of every group** (`verify.ts`): every archived evaluation's record hash and every archived configuration
   equals the reference map (canonical CPU for W-A3 and W-S; the accepted sealed-equal replay for W-A2); a complete job's
   lanes (screens, promotions, islands, trigger logs, rung fits, refinements, shortlists, frontiers, failure reasons) and
   each lane's extension history equal the sealed record; a full job's archive digest equals the reference digest; an
   FTW group's union equals the reference archive key for key, its lanes exactly the job's. Poolbench groups
   (`verify-pool.ts`): repeatability across rounds, 24 canonical CPU samples per job, every job's hash map identical
   across jobs and to the solo group (and across batch sizes for W-K). CPU-scored = 0 in every receipt ledger.
2. A difference stops the stage; the group's timing is not used; the cause is traced (a mismatch is a defect).
3. **Isolation and failure tests (B9)**, each with a neighbour job that must finish identical to its reference:
   (I1) a job killed abruptly (SIGKILL of its unit) while its neighbour runs, then resumed in its namespace → both
   identical; (I2) a graceful stop (stop-after) and resume under concurrency → identical; (I3) a job's GPU server
   killed → that job fails closed (no result released, CPU-scored 0), the neighbour identical; (I4) a host-worker fault
   injected in one job (the pipeline's test hook) → that job fails closed, the neighbour identical; (I5) a VRAM refusal
   (a too-small per-server budget) → that job refuses, the neighbour identical; (I6) a second process on a live
   namespace, and a reused namespace without `--resume` → refused; (I7) the engine's dataset export into ONE shared
   cache directory by concurrent processes (a scratch directory, no evaluation): every load either verifies or is
   refused (short file, size or checksum) — never a silently wrong dataset.
4. **Code-change rule CC4:** a hazard that only fails closed and that an operating rule avoids (e.g. per-job cache
   directories) is documented, not changed; a hazard that can produce a wrong result, or makes a recommended mode fail
   unavoidably, is fixed narrowly and enters the acceptance campaign (§10).

## 10. Corrective work and the final acceptance (once, on the final candidate)

- **CC1 (brief §4):** `src/gpu-backend/hostPipeline.ts` — `import { type Transferable, Worker } from
  'node:worker_threads'` (Node's own type; `@types/node` 24.19 exports it) and the `as never` cast at the
  `postMessage` call removed if the type check passes without it. No `any`, no disabled check. Proof of no runtime
  change: Node's TypeScript transform (`module.stripTypeScriptTypes`, mode `transform`, the mode every script uses)
  emits byte-identical JavaScript for the old and new file (checked before this freeze on scratch copies: sha256 prefix
  `db51a760e9bb94fd` for both); root `tsc --noEmit` must report 0 errors.
- **CC2:** the new binary is built to `research/gpu-phase4/build/gb4` and `src/gpu-backend/toolchain.ts`'s default path
  points to it (the accepted Phase 3 binary `research/gpu-phase3/build/gb3` stays untouched and identifiable).
- **CC3:** the acceptance campaign's harness `src/gpu-phase4/` (copies of `src/gpu-phase3/` with this study's namespace
  and seeds) is registered as non-official in `config/gpu-backend/entrypoints.json`; the campaign tools and chains are
  copies of Phase 3's under `tools/gpu-phase4/` and `research/gpu-phase4/chains/`, writing only to this study.
- All pinned-file changes (CC1, CC2, CC3, any CC4) are made **after** the benchmarks (B1–B9 run on the accepted tree
  and binary) in one commit; the campaign runs once on that commit. `docs/gpu/PARITY_CHECKLIST.md` §2:
  1. reproducible build of gb4 (twice the same sha256) with kernels (`.nv_fatbin`, SASS) byte-identical to gb3;
  2. the offline codec check on Phase 3's 7 captured batches (read-only) with 1/2/3/8/12 workers;
  3. the parity campaign through the final host path (this study's seeds: ≥ 100,000 random genomes, every door, window,
     episode, fixture and option set, risk envelopes, determinism across batch sizes, input order, host workers,
     restarts) and Assignment 3's 48 sealed finalists (D24, FULL) — zero mismatches;
  4. sealed-job replays: W-A3 (search; twice — also the regression benchmark: within ±3 % of B1/B3's 8,192 runs or
     investigated), Assignment 3 C19 broad qualification, W-A2 (search); the fixed-seed mini-optimization CPU = GPU = GPU
     interrupted and resumed = host workers 1 = 0;
  5. compute-sanitizer memcheck (leak check), racecheck, initcheck, synccheck (0 errors);
  6. the negative suite (45 cases) and the source-tamper suite (14 cases) on the final tree;
  7. ONE bounded reliability run of 30–35 min in the Mode A configuration (k processes if Mode A > 1): 0 errors,
     0 parity mismatches, stable memory and throughput;
  8. `npm test` (= the 1,699-test baseline + new tests; the 7 known failures listed separately), root `tsc` 0 errors,
     ESLint on the GPU code, Strategy Lab's suites (typecheck, lint, vitest, a UI build into a scratch directory, e2e;
     `state/strategy-lab/` untouched), the research preflight of every study, the live official gate;
  9. `tools/gpu-phase4/accept.ts` writes the new record only if 1–8 pass; its sha256 is kept outside the repository.
- If CC1 causes any consequential mismatch, it is reverted and the Phase 3 acceptance stays (its tree restored).

## 11. Integration (brief §5)

- New source merge only if §10 accepted a changed tree: commit on `research/gpu-phase4`, focused source/integrity review,
  non-destructive merge into `main` (no force, no rewrite), verification on the merged `main` (verifier, merge gate,
  official gate, Strategy Lab's CPU engine untouched), then `research/gpu-phase2` (the branch active at the start)
  brought to the accepted `main` and checked out, clean, pushed. Otherwise report-only integration or none, stated.

## 12. Integrity

No sealed record of any study is written; `research/gpu-phase3/` (records, results, build, cache) and the Phase 1–3
harnesses are read only. Binaries, datasets, caches, key maps and unit logs are git-ignored; their sha256 or digests are
recorded. Archives of benchmark jobs are deleted after their verification (git-ignored scratch); the verification
records and digests are kept.

## 13. Reporting

Text, Markdown tables, JSON and CSV only (standard §7.7). Bundle (brief §6): `GPU_CONCURRENCY_FINAL_HANDOFF.md`,
`GPU_CONCURRENCY_BENCHMARKS.md`, `GPU_CONCURRENCY_CORRECTNESS.md`, `GPU_ACCEPTANCE_AND_MERGE.md`,
`GPU_OPERATING_RECOMMENDATIONS.md`, machine-readable summaries, this protocol, amendments, manifest,
`CHECKSUMS.sha256`, run commands — a verified ZIP under `research/gpu-phase4/bundle/`. "Risk-envelope pilot NOT STARTED."
