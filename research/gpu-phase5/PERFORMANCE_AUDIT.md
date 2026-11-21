# Performance audit of the accepted GPU path (GPU Phase 5, stage P)

**Outcome: no performance change is retained.** The audit measured first (PROTOCOL.md §6). Inside the surface this
study may change — the GPU host path, `src/gpu-backend/` — nothing reaches the frozen keep-rule (§6.3: bit-identical
outputs and ≥ 2 % of a complete job's wall in each of two runs): that code is ≈ 1 % of the main thread's active time and
≈ 11 % of a host worker's. The time that is left outside the device is spent in code this study must not change: the
parameter-schema canonicalization of the pinned canonical CPU closure (≈ 48 % of the main thread's active time) and
the frozen archive store (≈ 22 %). That is the audit's finding, with its estimated size, for a separately authorized
change (§5). The engine fix of this study (`--no-maglev`) costs **+0.2 %** on the complete Assignment 3 job (§2).

All figures are from this machine (RTX 5090, driver 595.91.07, Node v24.21.0), batch 8,192, 8 host workers, one job.
Machine-readable: `results/perf/performance.json` / `.csv`, `results/perf/cpuprof-summary.json`,
`results/perf/cpuprof-callers.json`, `results/perf/copy-bench.json`, `results/bench/<group>/`,
`results/optimizer/<run>/gpu/profile.json`.

## 1. Workloads and identity

| ID | Workload | Fresh evaluations | Identity reference |
|---|---|---|---|
| W-A3 | Assignment 3 C19 broad1 search replay (joint D1 + Growth, 64 lanes, D19) | 1,242,714 | the canonical CPU archive digest `9c2d7108…` and the sealed lanes |
| W-A2 | Assignment 2 C19 base search replay (Growth fixed, 128 lanes, D19) | 2,196,920 | the sealed record and the accepted replay's archive `4a8624fc…` |
| W-S | the fixed-seed mini schedule (16 lanes, D19) | 30,749 | Phase 3's CPU arm `014239d8…` |

Every timed run is verified against its reference (archive digest, lanes, proposals) before its time counts.

## 2. Baselines and the cost of the fix (W-A3, complete job)

| Run | Configuration | Wall | Evaluations / s | Device (server) | Encode / decode (batch wall) | Main thread active | Archive writes | Identical to reference |
|---|---|---|---|---|---|---|---|---|
| Phase 4 `ftw1-r1`, `ftw1-r2` (2026-11-20, Phase 4's record) | accepted binary gb3, default engine | 583.1 s, 584.0 s | 2,131 / 2,128 | — | — | — | — | yes |
| `p3-a3-r1` (23:10Z) | accepted binary gb3, default engine (Maglev enabled) | **586.6 s** | 2,118.7 | 346.8 s | 35.1 s / 69.2 s | 369.7 s (ELU 0.630) | 66.9 s | yes |
| `nm-a3-r1` (23:21Z) | the same binary, `--no-maglev` | **587.8 s** | 2,114.1 | 348.1 s | 35.1 s / 68.2 s | 371.3 s (ELU 0.632) | 67.0 s | yes |

- `--no-maglev` against the default engine: **+1.2 s, +0.2 %** — inside the run-to-run noise of this job (Phase 4's two
  runs differ by 0.9 s). Process CPU 1,093 s user against 1,101 s; peak RSS 4.5 GiB against 4.6 GiB; garbage collection
  8.3 s in both (≈ 8,750 scavenges 6.5 s, ≈ 218 mark-compacts 1.6 s). Turbofan still optimizes the hot code; only the
  middle tier is off.
- `p3-a3-r1` is 0.5 % slower than Phase 4's runs of the same configuration: `tsc` and `eslint` ran beside it for part
  of the run (disclosed, checkpoint D3). The second accepted-configuration run and the final candidate's two runs are
  in §6, on a quiet machine.
- Where the wall goes (`nm-a3-r1`): the device is busy 348 s (59 %); the GPU's kernel-active share over the steady
  window is 59.5 % (driver's `dmon` column, as the driver reports it), so the device idles ≈ 40 % of the time waiting
  for the host; no batch is in flight 7.7 % of the window. The process uses 1.9 cores on average and wrote 33.2 GB
  (the archive and its write-ahead log).

## 3. Where the host's time goes (CPU profile of the first 300,000 evaluations, `--no-maglev`)

Group `prof-a3-nm` (`chains/p-profile.sh`; V8 `--cpu-prof` on the main thread and every worker; a profile, never a
timing; it includes the tool's end-of-run archive digest). Self time, percentages of each thread's **active** time.

**Main thread** (active 104.2 s):

| Self time | Share | Function | File | In this study's change surface? |
|---|---|---|---|---|
| 19.2 s | 18.4 % | `isActive` | `apps/strategy-lab/shared/params.ts:28` | no — canonical CPU closure |
| 10.8 s | 10.3 % | `validateParams` | `apps/strategy-lab/shared/params.ts:61` | no — closure |
| 9.2 s | 8.8 % | `decode` | `src/growth140-vgt-s8m/store.ts:10` | no — closure (frozen legacy store) |
| 7.1 s | 6.8 % | (anonymous) | `apps/strategy-lab/shared/params.ts:78` | no — closure |
| 7.0 s | 6.7 % | `commit` | `src/growth140-vgt-s8m/store.ts:132` | no — closure |
| 5.7 s | 5.5 % | `fsync` | native (the store's write-ahead log) | no |
| 4.4 s | 4.2 % | `encode` | `src/growth140-vgt-s8m/store.ts:9` | no — closure |
| 4.2 s | 4.0 % | `effectiveOf` | `src/growth140-vgt-s8m/space.ts:209` | no — closure |
| 4.0 s | 3.8 % | garbage collector | native | — |
| 3.5 s | 3.3 % | `canonicalParams` | `apps/strategy-lab/shared/params.ts:83` | no — closure |
| 1.0 s | 1.0 % | all of `src/gpu-backend/hostPipeline.ts` (`complete` 1.1 s and `prepare` 0.9 s inclusive) | host path | **yes** |

By source file: `apps/strategy-lab/shared/params.ts` 44.9 s (43.1 %), `src/growth140-vgt-s8m/store.ts` 22.8 s
(21.9 %), `src/growth140-vgt-s8m/space.ts` 5.4 s (5.2 %), the hash functions of `node:crypto` 2.1 s (2.0 %),
`src/gpu-backend/hostPipeline.ts` 1.0 s (1.0 %).

**The parameter schema by its callers** (`results/perf/cpuprof-callers.json`): 49.7 s, **47.8 % of the main thread's
active time**, is self time of the Strategy Lab parameter schema and of `effectiveOf` / `configId`, reached through

| Seconds | Call path (nearest callers outside the schema) | What it is |
|---|---|---|
| 38.2 | `canonicalOf` ← `quadCanonical` (`src/vg-d1-growth-joint/space.ts`) | the identity of a configuration: the search's `cfgId` (`riskId2`, 24.4 s inclusive) and the Lab's archive key (`evalKeyOf`, 18.3 s inclusive) each canonicalize every requested configuration |
| 6.6 | `canonicalGrowth` ← `cfgOf` ← `neighbourhood` (`src/vg-l0-full-joint/space.ts`) | generating a point's neighbours |
| 4.3 | `configOfGenome` / `canonicalGrowth` ← `decode` | decoding genomes |

**A host worker** (each of the eight is alike; active 16.8 s): the parameter schema is 9.8 s (58 %) — 5.4 s in
`growthParamsOf` called by the encoder (89 % of the worker's 6.1 s of encoding) and 4.3 s in `canonicalOf` called by
`recordOf` (49 % of its 8.9 s of decoding). The host path's own files (`batch.ts`, `encode.ts`, `hostWorker.ts`) are
1.8 s (11 %).

## 4. Candidates (PROTOCOL.md §6.2) and decisions

| Candidate | Evidence | Upper bound on a W-A3 job | Decision |
|---|---|---|---|
| Receive the device response straight into one shared buffer (today: chunk list → concatenate → copy → copy into the shared buffer) | microbenchmark `results/perf/copy-bench.json`: 87.9 ms today against 31.8 ms per 172 MB response (a full 8,192-candidate batch) | 56 ms × ≈ 152 full-batch equivalents = 8.5 s, **≤ 1.5 %** if all of it were on the critical path | **rejected** — below the 2 % rule before any end-to-end run; it would change the client framing and the pipeline (evaluation manifest) |
| Host-path encode / decode loops, typed-array marshaling | the host path's own code is 11 % of a worker's active time; the rest of encode and decode is closure code (§3) | < 1 % | **rejected** — nothing to gain in the host path's own code |
| Worker transfer of results (structured clone) | `hostPipeline.complete` 1.1 s inclusive of 104 s | ≈ 1 % | **rejected** |
| Queue discipline, batch size, linger | Phase 3 and Phase 4 measured them (batch 8,192, 8 workers retained); no batch in flight 7.7 % | — | unchanged; a scheduler or shared queue is prohibited |
| Archive writing | 67 s per job (11 %); the store commits every 2,000 rows or 5 s, write-ahead log, flushed at checkpoints | the flush share (≈ 5 % of the main thread's active time) | **not attempted** — the store is frozen closure code and its commit cadence is the resume guarantee; changing durability is not an implementation-only change |
| Dataset load | one load per job, < 1 s | — | none |
| CUDA register pressure, the record reduction on the device | diagnostics only by protocol; the kernels are byte-identical to Phase 2's | — | no kernel change |

Prohibited changes (fast-math, precision or reduction order, search semantics, cache relaxation, skipped records, a CPU
fallback, a shared GPU queue, MPS, a scheduler, kernel rewrites) were not considered.

## 5. The finding for a separately authorized change (not implemented here)

**Most of the host time of a GPU job is configuration canonicalization in the canonical CPU closure, not GPU host-path
code.** Each requested configuration is canonicalized through Strategy Lab's parameter schema (`validateParams`,
`isActive`, `canonicalParams`) several times: by the search for its identity, by the Lab for the archive key, by the
encoder for the device parameters and by the record reduction for the record's identity. In the profiled prefix that is
47.8 % of the main thread's active time and 58 % of each worker's.

- **Size (an estimate from the profile, not a measurement):** applied to the complete job, 0.478 × 371 s ≈ 177 s of
  main-thread time; the device idles ≈ 40 % of the job waiting for the host, so a large part of what is saved there
  would come off the wall — of the order of **15–30 % of a W-A3 job** if the canonicalization were made several times
  cheaper (for example, caching the canonical form per configuration object, or resolving the schema's activation
  rules once). Only an end-to-end measurement can confirm it.
- **Why it is not done here:** the files (`apps/strategy-lab/shared/params.ts`, `src/growth140-vgt-s8m/space.ts`,
  `src/vg-d1-growth-joint/space.ts`, `src/vg-l0-full-joint/space.ts`) are part of the pinned canonical CPU closure
  (digest `c8a9f416…`), which this study keeps unchanged (gate A11) and which Strategy Lab and every earlier study
  share. A cache keyed on object identity is only correct if no caller mutates a configuration after its first use —
  that needs a review of every caller, not a late addition to an acceptance campaign.
- **What it would need:** the user's authorization of a change to the canonical engine's parameter code; the change;
  the CPU engine's own regression suite; and a full acceptance cycle (the closure digest changes, so the acceptance
  becomes STALE: parity campaign, replays, sanitizer, negative and tamper suites — this study's `chains/final.sh`
  adapted to a successor study, about six hours of mostly unattended Apollo time).
- A smaller, host-path-only variant (a content-keyed cache around the encoder's `growthParamsOf` call) would save part
  of the 35 s of encoding (≤ 5 % of the wall by the profile if every call hit the cache, and partly overlapped with
  device time) and was **not attempted**: it wraps the
  cost instead of removing it and adds a cache whose key must capture every input exactly.
- Also for the record: one Assignment 3 job writes ≈ 33 GB to the SSD (archive and write-ahead log) in ten minutes.

## 6. End-to-end result on the final candidate against the accepted Phase 3 engine

Complete jobs, one at a time, batch 8,192, 8 host workers, each verified identical to its reference before its time
counts (`results/perf/performance.json` / `.csv`; gate A9: `results/optimizer/regression.json`).

| Workload | Accepted Phase 3 configuration (binary gb3, default engine) | Final candidate (binary gb5, `--no-maglev`) | Final / accepted |
|---|---|---|---|
| W-A3 (1,242,714 fresh evaluations) | 586.6 s (2026-11-20T23:10Z, beside `tsc` / `eslint`, §2), **583.2 s** (2026-11-21T05:02Z) | **585.1 s**, **584.0 s** | **0.999** (means 584.9 s and 584.6 s) |
| W-A2 (2,196,920 fresh) | 727.1 s | 721.9 s | 0.993 (one run each) |
| W-S (30,749 fresh) | 65.1 s | 65.2 s | 1.002 (one run each) |

| Run | Evaluations / s | Device (server) | Encode / decode (batch wall) | Main thread active (ELU) | Archive writes | GC | Process CPU (user) | Peak RSS |
|---|---|---|---|---|---|---|---|---|
| `p3-a3-r2` (accepted) | 2,131.0 | 348.4 s | 34.6 s / 68.5 s | 365.8 s (0.627) | 66.9 s | 7.9 s | 1,088 s | 4.5 GiB |
| `final-a3-r1` | 2,123.8 | 347.4 s | 35.1 s / 67.1 s | 367.4 s (0.628) | 66.9 s | 7.7 s | 1,071 s | 4.5 GiB |
| `final-a3-r2` | 2,127.8 | 347.9 s | 34.8 s / 67.1 s | 365.2 s (0.625) | 66.3 s | 7.5 s | 1,071 s | 4.5 GiB |
| `p3-a2-r1` (accepted) | 3,021.4 | 354.5 s | 56.3 s / 123.3 s | 561.6 s (0.772) | 122.2 s | 12.5 s | 1,748 s | 4.6 GiB |
| `final-a2-r1` | 3,043.1 | 354.3 s | 56.1 s / 120.1 s | 556.9 s (0.771) | 120.7 s | 12.2 s | 1,714 s | 4.8 GiB |
| `p3-s-r1` (accepted) | 472.7 | 53.5 s | 1.0 s / 1.7 s | 9.6 s (0.148) | 0.8 s | 0.2 s | 27 s | 2.1 GiB |
| `final-mini-w8` | 471.7 | 53.5 s | 1.0 s / 1.8 s | 10.0 s (0.153) | 0.8 s | 0.3 s | 32 s | 2.2 GiB |

- **Speed-up against the accepted Phase 3 engine: none, ×1.00.** No performance change was retained, and the final
  candidate measures the same as the accepted configuration on all three workloads: every difference is inside the
  spread of the accepted configuration's own runs (583.1–586.6 s over four W-A3 runs, Phase 4's two included). The
  0.7 % on W-A2 is one run against one run and is not claimed as a gain.
- **No regression:** gate A9 allows ±3 %; measured −0.1 % (W-A3, two runs each), −0.7 % (W-A2), +0.2 % (W-S). The fix
  (`--no-maglev`), the atomic dataset publication and the shutdown guard cost nothing measurable on a complete job.
- **Against the canonical CPU engine** the figures are Phase 3's: the Assignment 3 search replay ≈ ×10.1 the sealed
  CPU run's wall, the Assignment 2 replay ≈ ×6.5, the Assignment 3 qualification replay ≈ ×7.6
  (`results/optimizer/compare-final-*.json`).
- **Two jobs at once (Mode A):** not re-measured as a benchmark — no kept change touches scheduling or transfers
  (protocol §6.1, W-2); Phase 4's figures stand (two Assignment 3 jobs together 1.25–1.31× one job's throughput). The
  campaign's 32-minute reliability run in that configuration is in `GPU_ACCEPTANCE_REPORT.md` (gate A7).
