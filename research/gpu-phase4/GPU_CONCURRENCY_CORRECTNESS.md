# GPU concurrency and batching — correctness, isolation and acceptance tests (GPU Phase 4)

**Standard: bit-identical, zero tolerance** (PROTOCOL.md §9; IEEE-754 binary64; every comparison an exact equality of
record hashes or values — no tolerance, rounding or ULP allowance anywhere). Concurrency and batching are
performance-only: they changed no trading record, fitness, rank, promotion, extension decision, refinement, shortlist or
qualification result anywhere.

## 1. Every benchmark group verified before its timing was used

`tools/gpu-phase4/verify.ts` (optimizer jobs) and `verify-pool.ts` (pool workloads), per group
`results/bench/<group>/verify.json`:

- **every archived evaluation** of every job — key → record hash in the store's encoding (the complete record: books,
  trades and fills, the pooled replay's funded lots and decisions, marks, drawdowns, RC counters, the fitness inputs) —
  equals the **reference map**: the canonical CPU engine's archive of the same job for Assignment 3 (Phase 3's 12-worker
  CPU replay `final-a3-cpu`, digest `9c2d7108…`, itself = the sealed record) and the mini schedule (Phase 3's CPU arm,
  `014239d8…`); for Assignment 2 the accepted GPU replay whose lanes equal the sealed CPU record (`4a8624fc…`);
- **every archived configuration** likewise;
- for a complete job, **every lane result** (screen, promotions, islands and trigger logs, rung fits, refinements,
  shortlists and finalists, frontiers, top-by-net, failure reasons) equals the **sealed record's** lane, and every
  lane's extension-round history (fired / extended / at cap per round) equals the sealed one; a full job's archive digest
  equals the reference digest;
- for a fixed-total-work split, the **union of the parts** equals the reference archive key for key (nothing missing,
  nothing extra) and the parts' lanes are exactly the job's 64 (or 16) lanes;
- for the pool workloads, every task's canonical record hash is identical across rounds (repeatability), across jobs,
  across concurrency levels and across batch sizes (to the solo / 8,192 reference group), and **24 tasks per job are
  re-evaluated by the canonical CPU engine** (the accepted harness's reference function) — 0 mismatches;
- CPU-scored = 0 in every receipt ledger (the pool's conservation invariant at every batch and at close).

| Groups | Jobs | Archived evaluations compared | Configurations | Lanes = sealed | Mismatches |
|---|---:|---:|---:|---:|---:|
| Assignment 3 steady state (15 groups `ss*`) | 40 | 12,189,940 | 867,968 | — (prefixes) | **0** |
| Assignment 3 complete jobs (`ftw1-r1/r2`, `b4096-r1`, `b16384-r1`: full-job digest `9c2d7108…` each) | 4 | 4,970,856 | 366,244 | 256 | **0** |
| Assignment 3 fixed-total-work splits (`ftw2`, `ftw2-r2`, `ftw3`, `ftw4`: unions = reference) | 11 | 4,970,856 | 366,244 | 256 | **0** |
| Assignment 2 steady state (`a2-ss1/2/3`) | 6 | 2,434,086 | 132,864 | — | **0** |
| mini (`s1`, `s2`, `s4`, `sf2`, isolation `i1`, `i2`) | 13 | 368,988 | 68,952 | 192 | **0** |
| pool: kernel curve (`k-*`, `k2-b8192`), FULL detail + risk (`r1b`, `r2b`) | 10 | 278,528 tasks × 3 rounds; 240 canonical CPU samples | — | — | **0** |
| **Total** | **84** | **24,934,726** (+ the pool tasks) | **1,802,272** | **704** | **0** |

Every group is identical (`results/bench/SUMMARY.json`: 38 groups, `identical` true). Determinism shows even in the
prefixes: every 300,000-evaluation prefix at batch 8,192 stopped at exactly 304,957 archived evaluations whether it ran
alone or beside one, two or three other jobs — the jobs' evaluation order does not depend on timing or on the other
processes. One group, `r1-w8`, refused at start-up (the FULL door's guard, amendment A2) before any evaluation; it was
rerun as `r1b-w8`.

## 2. Ordering, promotions, checkpoints and archive isolation under concurrency

- **Deterministic proposals, seeds, batch ordering and promotions:** the complete concurrent and split jobs reproduce
  every lane's proposals, islands, promotions and extension decisions exactly (704 lanes); batch composition differs
  between k = 1 and k = 4 (median batch 7,288 → 8,184; splits 3,900–5,500) and between batch sizes 4,096 / 8,192 / 16,384 —
  no result changed.
- **Archive isolation:** every job wrote only its own namespace (`cache/replay/<run>/gpu/jobs/…/archive.sqlite`,
  `results/optimizer/<run>/`, its own exported dataset); a lock refuses a second live process on a namespace and a reused
  namespace without `--resume` (I6). The engine's archive store itself has no inter-process lock: two processes must
  never share a job name (an operating rule, `GPU_OPERATING_RECOMMENDATIONS.md` §4).
- **Checkpoint/restart under concurrency:** I1 and I2 below.

## 3. Failure, restart and resource-refusal tests under concurrency (B9, `results/isolation/`)

Each failing job ran **beside a neighbour job doing the same work**; the neighbour had to finish identical to its solo
reference. Nothing here endangered any other process (test jobs only, inside the slice).

| Test | Failing job | Outcome (failing job) | Neighbour | Pass |
|---|---|---|---|---|
| I3 GPU server killed | pool, D19 joint, server SIGKILLed 1.5 s into round 2 | "GPU evaluator exited (SIGKILL)", 0 of the batch's 8,192 results released, CPU-scored 0, exit 3 | identical to `i-ref`, 8/8 CPU samples | yes |
| I4 host-worker fault | the pipeline's test hook: worker 0 exits while decoding round 2 | "host worker 0 exited (7)", 0 released, CPU-scored 0 | identical | yes |
| I5 VRAM refusal | per-server budget 256 MiB | "GPU memory: batch needs 4,300 MiB > VRAM budget 256 MiB" at the first batch, nothing evaluated | identical | yes |
| I1 abrupt kill + resume | mini job's unit SIGKILLed after 8 batches | 4,464 committed evaluations survived; the same command resumed (stale lock taken over) and completed: archive digest `014239d8…` = the CPU arm, 16 lanes = reference | identical (digest, lanes) | yes |
| I2 graceful stop + resume | mini job stopped after 6,000 fresh (exit 75), resumed while the neighbour ran | completed identical | identical | yes |
| I6 namespace guards | a second process on a live namespace; a reused namespace without `--resume`; purpose official-optimization on the benchmark tool | each refused | — | yes |
| I7 shared dataset directory | 4 processes × 25: export the door into ONE directory, then load it into their own servers | 66 loads verified, **34 refused** (short file, size mismatch), **0 accepted with other content** | — | yes (fail closed) |

I7 shows a real, reachable collision in the engine's dataset export (`src/gpu-backend/dataset.ts` writes
`<cacheDir>/<door>.gb2ds` in place): concurrent jobs that share a cache directory can fail at start-up, never silently.
Per the frozen rule CC4 (PROTOCOL.md §9.4) it is **documented, not changed**: it only fails closed and an operating rule
(each job its own cache directory) avoids it. An atomic write (temporary file + rename) would remove it; it is listed as
an optional hardening for a future acceptance cycle.

## 4. The final acceptance campaign (the TypeScript fix, once, on the final candidate)

(Filled after the campaign: `results/final-binary.json`, `results/final/offline-check.json`,
`results/parity/final/SUMMARY.json`, `results/parity/final-finalists.json`, `results/optimizer/compare-final-*.json`,
`results/sanitizer-final/sanitizer.json`, `results/policy/negative-final.json`, `tamper-final.json`,
`results/sustained/p*/summary.json`, `results/tests/*.json`, `results/optimizer/regression.json`.)
