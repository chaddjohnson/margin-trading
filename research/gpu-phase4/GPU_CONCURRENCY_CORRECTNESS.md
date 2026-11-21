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
| Mode A confirmation (`modeA-complete`, two complete jobs at once; amendment A3) | 2 | 2,485,428 | 183,122 | 128 | **0** |
| **Total** | **86** | **27,420,154** (+ the pool tasks) | **1,985,394** | **832** | **0** |

Every group is identical (`results/bench/SUMMARY.json`: 39 groups, `identical` true). Determinism shows even in the
prefixes: every 300,000-evaluation prefix at batch 8,192 stopped at exactly 304,957 archived evaluations whether it ran
alone or beside one, two or three other jobs — the jobs' evaluation order does not depend on timing or on the other
processes. One group, `r1-w8`, refused at start-up (the FULL door's guard, amendment A2) before any evaluation; it was
rerun as `r1b-w8`.

## 2. Ordering, promotions, checkpoints and archive isolation under concurrency

- **Deterministic proposals, seeds, batch ordering and promotions:** the complete concurrent and split jobs reproduce
  every lane's proposals, islands, promotions and extension decisions exactly (832 lanes); batch composition differs
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

Final binary `research/gpu-phase4/build/gb4` sha256 `b01f4362383526c78d0621d1573dc9937bb1a85711e23cfd375670d19fa7441e`
(reproducible; device code byte-identical to the accepted gb3 and to Phase 2's gb2), compatibility digest
`3594f002…`, the final host path (8 workers), the RTX 5090 — `chains/final.sh` from 10:13:21Z, stopped by the parity
gate at 11:43:40Z, completed for evidence by `chains/final-resume.sh` 11:58–14:01Z (amendment A4); the test step rerun
after amendment A5.

| Gate | Result | Evidence |
|---|---|---|
| A1 final binary | pass — built twice, equal; fatbin and SASS = gb3 = gb2 | `results/final-binary.json` |
| A2 offline codec check (Phase 3's 7 captured real batches; serial codec and 1/2/3/8/12 workers) | pass — 7/7, request bytes and every result hash identical, refusals correct | `results/final/offline-check.json` |
| A3 parity campaign (this study's seeds) | **FAILED — 1 mismatch in 146,356 candidates** (55 runs: the 54 planned + the labelled rerun `D24-fund-r2`; 143,100 random genomes; 20 doors/windows/episodes/fixtures; 18 option sets; 65,606 risk envelopes; 8.55 M virtual trades, 5.48 M funded lots, 3.10 M funding decisions, 202,934 partial fills compared; 176 determinism runs — batch sizes 1…128, shuffled and reversed order, host workers 0/1/3/12, restarts — 0 differences). The one mismatch: run `D24-fund`, candidate `O-fund:coarse:28`, record hash only (books, pooled replay incl. daily series, risk envelope identical); **not reproducible** (§5) | `results/parity/final/SUMMARY.json` (`everyRunPassed: false`; all other checks true) |
| A3 Assignment 3's 48 sealed finalists | pass — D24 96/96 (sealed figures 48/48 to the cent), FULL 96/96 | `results/parity/final-finalists.json` |
| A4 sealed-job replays | pass — Assignment 3 C19 broad1 = sealed record twice (582.3 / 583.2 s; 1,242,714 evaluations); Assignment 3 C19 qualification = sealed evidence (385 members, 377 qualified, 251,405 evaluations, 163.9 s); Assignment 2 C19 base = sealed record (2,196,920 evaluations, 722.6 s) | `results/optimizer/compare-final-*.json` |
| A4 fixed-seed mini-optimization | pass — CPU arm (12 workers, 122.9 s) = GPU (65.1 s) = GPU interrupted after 6,000 fresh (exit 75) and resumed = 1 host worker (73.7 s) = serial path (72.6 s): 30,749 archived records and 5,746 configurations each, lanes identical | `compare-final-mini-*.json` |
| A5 compute-sanitizer (W-CRASH, 97 subjects, requests from the host pipeline) | pass — memcheck (leak check), racecheck, initcheck, synccheck: 0 errors, 97/97 identical each | `results/sanitizer-final/sanitizer.json` |
| A6 negative suite | pass — 45/45 (gate, runtime and CLI cases on the final binary; every case refused or terminated, CPU-scored 0) | `results/policy/negative-final.json` |
| A6 source-tamper suite (sandbox clone of HEAD) | pass — 14/14 + baseline | `results/policy/tamper-final.json` |
| A7 bounded reliability run in the Mode A configuration — two concurrent processes, 8 workers each, 32.6 min | pass — 98 rounds, 3,211,264 GPU evaluations rotating D19, D21, D23, D24, FULL and five mixes; 4,704 canonical CPU parity samples, **0 mismatches**; 8 repeatability checks (16,384 tasks), 0 mismatches; 0 failures, 0 restarts, CPU-scored 0; peaks 59 °C, 243 W, 14,021 MiB VRAM in use, ≤ 8.6 GiB host per process; no throttling | `results/sustained/p0`, `p1/summary.json` |
| A8 repository suite | run 1: `npm test` 1,696 tests, 29 failures = 7 known + 23 from one environment cause (writable sealed records, A5); root `tsc` **0 errors**; ESLint 0; Strategy Lab typecheck, lint, 314/314, e2e 81/81 (one allowed rerun of a layout-timing test), state and live dist untouched — **rerun after A5: pass** — `npm test` 1,699 tests, 1,688 pass, 7 fail (exactly the 7 known pre-existing failures, 0 unexpected), 4 skipped (= the Phase 3 baseline); root `tsc` 0 errors; ESLint on the GPU code 0; Strategy Lab typecheck, lint, 314/314, e2e 81/81 first time, state unchanged, live dist untouched | `results/tests-run1/` (run 1), `results/tests/` (rerun) |
| A9 final-binary regression | pass — 582.8 s vs 583.5 s on the accepted binary (×0.9986), identical | `results/optimizer/regression.json` |

## 5. The parity mismatch (amendment A4)

| Item | Finding |
|---|---|
| Where | run `D24-fund` (D24, option set `fund` = New L0's options with funding from 2018-09-12, Growth·GDX off; detail + risk; 1,561 candidates), candidate `O-fund:coarse:28` |
| What differed | the detailed record's canonical hash; books, pooled replay (lots, funding decisions, marks, daily series, drawdown trackers) and the four risk-envelope inputs were identical |
| Reproductions (all identical; record `f17d66f4…`) | CPU fresh; CPU after the run's whole preceding sequence; the 12-worker CPU pool exactly as run (twice); GPU in the full batch (2 + 20 repeated batches of all 1,561 candidates, 0 differences in any candidate); GPU alone; with the campaign's server history (smoke kernel first); the labelled rerun `D24-fund-r2` (1,561/1,561) |
| Cache hypothesis | 1,560 pairs (every other task, then the candidate, caches cleared between pairs): 0 changes (`results/diagnostics/d24-fund-cache-pairs.json`) |
| Hardware | no Xid / MCE / EDAC entry in the kernel log; no ECC on the GPU (GeForce) to report device-memory errors |
| Attribution | impossible after the fact (the run kept booleans only). GPU side: the record is a deterministic host reduction of the matching books, pool and checksummed RC counters. CPU side: the record comes from a separate cached evaluation in a worker process. A transient on either side remains possible |
| Rate | 1 in ≈ 436,000 parity candidates over Phases 2–4 (Phase 2 144,795 and Phase 3 144,795 had none) plus 0 in the reliability runs' 4,704 CPU samples and 0 in this study's 27.4 M benchmark comparisons against archived references |
| Since | `tools/gpu-phase4/parity.ts` keeps both sides' hashes and attributes any mismatch (CPU-side transient / GPU-side transient / reproducible defect) |

**Consequence:** the zero-tolerance parity gate is failed and is not loosened here; no new acceptance record is issued;
the renewal is the user's decision (`GPU_ACCEPTANCE_AND_MERGE.md` §5). The final candidate is runtime-identical to the
accepted engine, so the finding concerns the accepted engine (or its CPU reference, or the machine) equally; the
benchmark identity checks of this study (on the accepted engine) were unaffected.
