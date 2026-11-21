# GPU evaluator — operations guide

How to build, verify, run and troubleshoot the CUDA evaluator on Apollo (RTX 5090). Acceptance status: see
`config/gpu-backend/acceptance.json` (schema 2; written by the current acceptance study `research/gpu-phase6/` — the
enforcement-only re-acceptance for the Maglev protection beyond the official path and the automatic job isolation, which
carries the evaluation evidence of `research/gpu-phase5/`, which
resolved Phase 4's parity mismatch — a JavaScript-engine defect, hence the `--no-maglev` requirement of §3a — and made
the dataset export atomic; `research/gpu-phase3/` added the parallel host path and the enforcement pins; the first
acceptance was `research/gpu-phase2/`). Normative rules:
[OPTIMIZATION_STANDARD.md](../research/OPTIMIZATION_STANDARD.md) §9 (from 3.0.0). Change procedure:
[PARITY_CHECKLIST.md](PARITY_CHECKLIST.md). Feature map: [FEATURE_MATRIX.md](FEATURE_MATRIX.md). Evidence and handoffs:
`research/gpu-phase5/GPU_FINAL_HANDOFF.md` (current), `research/gpu-phase4/GPU_CONCURRENCY_FINAL_HANDOFF.md`
(concurrency), `research/gpu-phase3/GPU_ENGINE_FINAL_HANDOFF.md`, `research/gpu-phase2/GPU_PHASE2_HANDOFF.md` (first).

## 1. Components

| Component | Path | Role |
|---|---|---|
| CUDA server | `src/gpu-backend/cuda/gb_server.cu` (+ `gb_d1.cuh`, `gb_growth.cuh`, `gb_pool.cuh`, `gb_common.cuh`, `v8math.cuh`, `gb.h`) | a separate process; framed binary IPC on stdin/stdout (protocol v2); LOAD, EVAL, INFO, SMOKE, QUIT |
| Batch codec | `src/gpu-backend/batch.ts` (+ `encode.ts`, `layout.ts`) | the one implementation of request encoding (contiguous shards, assembly) and response verification and decoding (receipt, nonce, counters, checksum, ids; the canonical records by the UNCHANGED CPU reductions) |
| Host client (serial path) | `src/gpu-backend/client.ts`, `dataset.ts` | the server process and its IPC; `prepare` / `submit` / `complete` on the calling thread (`hostWorkers` 0) |
| Parallel host path | `src/gpu-backend/hostPipeline.ts`, `hostWorker.ts`, `hostDoor.ts` | worker threads that encode and decode the shards of each batch (the door shared, its digest checked per worker); the receipt verified on the main thread in the serial path's order; results in candidate order; any worker failure fails closed |
| Official gate | `src/gpu-backend/official.ts` `openOfficialGpuSession`; `officialRunner.ts` (an official study's npm-script wrapper) | purpose, acceptance (schema 2), an independent re-hash of every pinned file, committed source, server/build/device, reachable-domain capabilities, smoke, memory, the host path, parity mini-set through it, attestation |
| Pool and Lab | `src/gpu-backend/pool.ts` `GpuPool`, `lab.ts` `EvalLab` | the A3 `Pool` contract on the GPU (batching, pipelining, receipts ledger, conservation, telemetry, GPU-only capacity retries); the A3 Lab semantics with the backend in the archive binding |
| Policy | `purpose.ts`, `acceptance.ts`, `compat.ts`, `domain.ts`, `legacyRunner.ts`, `entrypoints.ts`, `doors.ts`, `runtime.ts`; `src/research-standard/gpuPolicy.ts`; `tools/gpu-backend/verify-acceptance.sh` | purposes, the acceptance record and its independent verifier, the compatibility manifest (evaluation digest + enforcement group), capability domains, the legacy CPU runner gate, the entrypoint registry, the study door opener, the engine-runtime requirement (`--no-maglev`, §3a), the preflight rules |
| Toolchain | `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit` (user space; `tools/gpu-phase2/install-toolkit.sh`) | nvcc 13.2, cudart, compute-sanitizer, cuda-gdb; nothing system-wide, no driver change |

## 2. Build

```bash
D=$(node --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh research/gpu-phase5/build/gb5 "$D"   # prints the binary's sha256 (the accepted path)
tools/gpu-backend/verify-acceptance.sh --rebuild --device       # the record, the tree, a reproducible rebuild, the GPU
```

- Flags (never change them without a full parity campaign): `-O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true
  -prec-sqrt=true -Xcompiler -ffp-contract=off`.
- The compatibility digest is compiled in; the official gate refuses a binary whose digest differs from the working
  tree's (`preflight-compat`). Rebuild after ANY change in the manifest (`compat.ts --manifest` lists the files).
- The build replaces the binary atomically (a running server keeps its file). The build is reproducible (stripped): the
  same sources, flags and toolkit give the same sha256 — a fresh checkout rebuilds the accepted binary and verifies it.
- `GPU_BACKEND_BINARY` overrides the default path (`src/gpu-backend/toolchain.ts`).

## 3. Running

- **Official optimization:** only through `openOfficialGpuSession` (blocked until `config/gpu-backend/acceptance.json`
  is ACCEPTED and matches the tree, binary and device, its source revision is in the history and every pinned file is
  committed unmodified). The study's adoption manifest declares `evaluationBackend` (standard §9.11) and
  `npm run research-preflight -- --study research/<study>` passes. Its npm script goes through
  `src/gpu-backend/officialRunner.ts research/<study> <runner module>`; the session's `hostWorkers` (default
  `DEFAULT_HOST_WORKERS` in `hostPipeline.ts`) selects the host path, and the pool uses the session's attested pipeline.
- **Non-official GPU tools** (no acceptance needed; never official evidence): `tools/gpu-phase3/` (`replay.ts`,
  `parity.ts`, `negative.ts`, `tamper.ts`, `sanitize.ts`, `sustained.ts`, …) and Phase 2's `tools/gpu-phase2/`.
- **CPU runs:** only with `GPU_POLICY_PURPOSE=<cpu-reference|diagnostic|parity-test|benchmark|strategy-lab>`; legacy npm
  research scripts refuse to start without it and refuse `official-optimization`.
- **Every official process starts as `node --no-maglev …`** (§3a): the gate and the official runner refuse otherwise.
- **Containment:** long jobs run as transient systemd user units in one slice (MemoryHigh 44G, MemoryMax 48G, swap 0):
  `tools/gpu-phase2/launch.sh <unit> <absolute log> [--wait] -- <command…>`. The GPU server is a child of the job and
  lives in the same unit.

## 3a. The JavaScript engine: no Maglev (GPU Phase 5)

- Node 24's V8 can, with its mid-tier compiler **Maglev** enabled, silently give a freshly created object the number
  fields of the next object created by the same literal (reproduced in the unchanged canonical code on a loaded machine:
  `research/gpu-phase5/PARITY_ROOT_CAUSE.md`). It produced the one parity mismatch of GPU Phase 4. Without Maglev it did
  not occur.
- Therefore `src/gpu-backend/runtime.ts` requires **`--no-maglev`** as a Node option of every official process: the gate
  (`preflight-runtime`) and `officialRunner.ts` (`runtime-maglev`) refuse a process started without it, or with another
  Maglev option; the attestation records the engine configuration. V8 options are process-wide, so the host pipeline's
  worker threads inherit it. `NODE_OPTIONS` cannot carry the flag: put it on the `node` command line (npm scripts too).
- Parity references and acceptance evidence are produced the same way (the acceptance generator requires it of every
  evidence record).
- **Beyond the official path (GPU Phase 6, `research/gpu-phase6/`).** Every Node npm script of the repository and of
  Strategy Lab starts `node --no-maglev …` (a merge-gate test refuses a script without it). The legacy CPU runner gate
  (`legacyRunner.ts`, used by every research npm script) refuses a process without the flag (`runtime-maglev`) and
  installs the **child-process guard** (`runtime.ts installChildEngineGuard`) before importing the frozen runner: frozen
  runners fork their workers with an explicit `execArgv`, which would drop the flag; the guard adds it to every Node child
  (`fork`, and `spawn`/`spawnSync`/`execFile`/`execFileSync` of `node`) without editing frozen code. Strategy Lab's
  server (`start()`), its four runners and its test workers (Vitest `execArgv`, the Playwright web server) refuse or carry
  it; the runners get it through `NODE_FLAGS` (`server/jobs.ts`). Worker threads share their process's V8 options.
  Regression tests observe V8's own tiers (`%ActiveTierIsMaglev`) in the main thread, worker threads and forked/spawned
  children (`src/gpu-backend/tests/enforcement.test.ts`). Not covered: a frozen study's `main.ts` started by hand with
  plain `node` (bypassing its npm script and the gate) — use the npm scripts.
- Code that starts an engine child itself: `engineExecArgv` / `withEngineFlag(execArgv)` for `fork`,
  `withEngineFlagArgs(args)` for `spawn(process.execPath, args)` — never a hand-written flag list, never `NODE_OPTIONS`.
- Cost: one optimizing tier less (Sparkplug and TurboFan remain); measured in
  `research/gpu-phase5/PERFORMANCE_AUDIT.md`.

## 4. Sizing and performance (measured: research/gpu-phase3/GPU_PERFORMANCE_BEFORE_AFTER.md; Phase 2's figures in research/gpu-phase2/GPU_PHASE2_BENCHMARKS.md)

- Host path: 8 worker threads (`DEFAULT_HOST_WORKERS`) encode and decode the batches; the main thread keeps the lanes,
  the archive and the request assembly. On Assignment 3's C19 broad1 job: 583.9 s with 8 workers vs 1,128.9 s on the
  serial (Phase 2) path vs 5,900.8 s on 12 CPU workers; 12 workers gain nothing more; batch 16,384 is slower in the wall
  (fewer but longer optimizer rounds). Peak RSS ≈ 4.8 GiB (each worker has its own heap; the door's arrays are shared).

- One GPU thread evaluates one (candidate, book) sequentially over the whole door: a batch costs about as long as its
  slowest candidate (≈ 3–5 s on D24 even for ONE candidate). Throughput therefore comes only from large batches; the
  pool batches every lane's outstanding requests (default 8,192, linger 25–30 ms) and pipelines (the next batch goes to
  the device before the previous one is decoded when ≥ batchSize/4 tasks wait).
- Determinism runs at batch size 1 are slow by design (one kernel launch per candidate, seconds each); this is not a
  hang. A real stall is caught by the server's kernel watchdog (default 300 s per batch, `--watchdog-s`) and the pool's
  batch timeout (default 20 min); both fail closed.
- VRAM: about 0.55 MB per candidate at the default capacities plus the dataset; the gate refuses a planned batch that
  does not fit with 1 GiB headroom. Capacity overflows are re-evaluated on the GPU with doubled capacities (up to 4
  levels).

## 4a. Several jobs on one GPU, and batch size (measured: research/gpu-phase4/GPU_CONCURRENCY_BENCHMARKS.md, GPU_OPERATING_RECOMMENDATIONS.md)

- **Separate GPU processes time-slice the device; their kernels never run at the same time.** A second job only fills
  the idle gaps one optimizer job leaves (its lanes compute their next proposals while the device waits). Assignment
  3-shaped jobs: aggregate 1.25× at two jobs, 1.30× at three, 1.29× at four (each job 1.6×, 2.3×, 3.1× slower);
  Assignment 2-shaped (main-thread-bound) jobs: 1.55× at two, 1.72× at three; small-batch or device-saturated work ≈ 1.0×.
- **Mode S (fastest single optimization):** one job, batch 8,192, 8 host workers (4,096: 15.5 % slower; 16,384: 4.5 %
  slower on the complete Assignment 3 job). **Mode A (most total throughput):** two independent jobs at once, batch
  8,192, 8 host workers each (≈ 11 GB of VRAM in use incl. the desktop; CPU < 20 %).
- **Never split one study into parallel jobs to speed it up** (+6–7 % at two parts, slower at three or four: each part's
  batches are smaller and the kernels are latency-bound).
- **Concurrent jobs:** one parent slice with the aggregate cap, a per-job MemoryMax; since GPU Phase 6 each job's
  identity, ownership, records, state and dataset cache are isolated **automatically** (§4c); admit a job only if free
  VRAM ≥ its need (≈ 6 GiB at 8,192 on D19) + 3 GiB.
  A failing job (GPU server killed, host-worker fault, VRAM refusal, abrupt kill) stops alone; its neighbour is unaffected
  (tested). `tools/gpu-phase4/admit.ts` is a ready admission check.
- **The device's compute is mostly idle** (GPM SM activity 34–46 %, SM occupancy ≈ 1 %): merging jobs' batches into one
  launch would give 1.22× over time-slicing (measured on the pool); a shared GPU queue or CUDA MPS would need their own
  authorization and acceptance (not built).

## 4b. The dataset cache (GPU Phase 5: `research/gpu-phase5/ATOMIC_CACHE_AND_CONCURRENCY.md`)

- `exportDataset` publishes `<cacheDir>/<door>.gb2ds` **once**: an identical published file is reused untouched; a new
  one is written to a unique temporary file in the same directory, flushed, verified and published with `link(2)`
  (only if the target does not exist). A reader sees no file or the complete file, never a partial one.
- A complete dataset with other content under the same name (another data revision of `FULL`, another door given the
  same label, another dataset version) is refused with `DATASET_CACHE_CONFLICT`; a truncated, corrupt or foreign file,
  a symbolic link or a directory at the target with `DATASET_CACHE_INVALID`. Nothing is overwritten: remove the stale
  file or use a fresh cache directory.
- A writer killed mid-export leaves at most a `.…​.tmp-<pid>-…` file, removed by a later export once it is 15 minutes
  old and its writer is gone.

## 4c. Job namespaces (GPU Phase 6: `src/gpu-jobs/`, `research/gpu-phase6/JOB_ISOLATION.md`)

Every optimization job opens itself with `openJob` (`src/gpu-jobs/jobs.ts`); an official run must (the gate refuses
otherwise: `preflight-job`). Nothing has to be configured:

| What | Where (default) |
|---|---|
| identity (study, name, the job's definition and its sha256; written once) | `research/<study>/results/jobs/<job>/job.json` |
| records: `events.jsonl`, `receipts.jsonl`, `telemetry.jsonl`, the runner's results, `complete.json` | `research/<study>/results/jobs/<job>/` |
| log | `research/<study>/results/jobs/<job>/logs/` (git-ignored) |
| state: EvalLab archive + checkpoint (`archive.sqlite`, `progress.json`, `runs.jsonl`), the ownership lock `job.lock`, `owner.json` | `research/<study>/cache/jobs/<job>/` (git-ignored) |
| dataset cache (the job's own; the unchanged atomic export) | `research/<study>/cache/jobs/<job>/dataset/` |
| attestations (standard §9.3) | `research/<study>/results/gpu-attestations/<job>-<time>.json`, logged in the job's events |

- **Ownership.** One live process per job: a kernel lock (an exclusive SQLite transaction on `job.lock`), released by
  any exit including SIGKILL — no stale lock, no PID check. A second process, or a second Lab on the job in one process,
  is refused (`JOB_ACTIVE`). The EvalLab takes the same lock when it is opened without a job (non-official tools).
- **New, resume, allocate.** A new name that exists → `JOB_EXISTS` (results are never overwritten); `resume: true`
  continues the job only with the identical definition (`JOB_IDENTITY_CONFLICT` otherwise; `JOB_NOT_FOUND` if absent),
  reads its own archive back and records a `resume` event; no name → a fresh `<label>-<UTC>-<random>` is allocated.
  State without an identity is never adopted (`JOB_FOREIGN_STATE`).
- **Determinism.** Names, instance ids and directories never reach a seed or the search order (seeds derive from the
  lane keys); concurrent, killed+resumed and shared-cache jobs reproduce the isolated reference bit for bit
  (`research/gpu-phase6/` gate E6).
- **Market data** are read in place by every job (`data/<SYMBOL>/`, never copied); only the derived ≈ 34 MB GPU dataset
  is exported per job. A shared dataset cache is allowed only when declared (`datasetCache: { shared: <absolute dir> }`;
  recorded in the identity, the same on every resume) — safe because the export is write-once and atomic (§4b).
- **Overrides:** `cacheRoot` / `resultsRoot` options; `GPU_JOBS_CACHE_ROOT=<dir>` moves every job's state to
  `<dir>/<study name>/jobs/<job>/` (e.g. a faster disk).

```ts
// one official optimization (inside a runner started by src/gpu-backend/officialRunner.ts with node --no-maglev)
const job = openJob({ study: 'research/<study>', job: 'C19-broad1', identity: { door: 'D19', stage: 'broad1', budget: 'v1' },
  purpose: 'official-optimization', resume: process.argv.includes('--resume') });
const session = await openOfficialGpuSession({ study: job.study, job, door, domain, plannedBatch: 8192 });
const pool = new GpuPool({ door, session, ...poolFilesOf(job), batchSize: 8192 });
const lab = new EvalLab({ ...labOptionsOf(job), door: 'D19', doorPin, purpose: 'official-optimization', pool, backend, codeDigest });
// … search …
await lab.close(); job.complete({ … }); job.release('complete');
```

- **Two concurrent optimizations (Mode A):** start the two runners as two units in one slice, each with its own job
  name (or none: allocated). Nothing else differs; a second start of a running job's name is refused, so a mistyped
  name can never write into the other job. Non-official example (the Phase 6 campaign tool):
  `tools/gpu-phase6/launch-slice.sh u-a <log> -- env GPU_POLICY_PURPOSE=benchmark node --no-maglev … tools/gpu-phase6/job.ts --job a3:C19:broad1 --job-name A`
  and the same with `--job a2:C19:base --job-name B`.
- **Recovery:** an interrupted job (killed, crashed, stopped) has state `interrupted`; rerun its command with `--resume`
  (`resume: true`). **Status:** `node --no-maglev --experimental-transform-types src/gpu-jobs/cli.ts list --study research/<study>`
  (or `status --job <job>`). **Cleanup:** `… cli.ts remove-cache --study research/<study> --job <job> --yes` deletes the
  git-ignored state of a job that is not active (its archive: it can then only be rerun, deterministically); its records
  under `results/jobs/<job>/` are research records — commit them, or delete them by hand when the job was a scratch run.

## 5. Telemetry and records

- Receipt ledger (JSONL, one line per batch): nonce, device UUID, device execution counters, output checksum, kernel
  times, encode/decode times, CPU-scored (always 0).
- Telemetry (JSONL, every 30 s): utilization, VRAM, power, temperature, submitted / GPU-returned / failed / CPU-scored,
  evaluations per second.
- Attestation (`research/<study>/results/gpu-attestations/<run>-<time>.json`): device, driver, runtime, build flags,
  binary and dataset hashes, capability coverage, smoke, parity mini-set — one per gate opening (every resume).

## 6. Verification tools (Apollo)

| Gate | Command |
|---|---|
| parity campaign | `PARITY_OUT=research/<study>/results/parity/final systemd-run … /bin/bash research/gpu-phase2/chains/parity.sh` |
| one parity run | `node --experimental-transform-types tools/gpu-phase2/parity.ts --door D24 --options base --refs --random 2000 --label X --out <json>` |
| sanitizer | `node --experimental-transform-types tools/gpu-phase2/sanitize.ts --out <dir>` (memcheck, racecheck, initcheck, synccheck) |
| negative tests | `node --experimental-transform-types tools/gpu-phase2/negative.ts --out <json>` (needs `build/gb2-dev`, `gb2-perturbed`, `gb2-stale`) |
| fixed-seed mini-optimization | `research/gpu-phase2/chains/mini-opt.sh` (CPU arm, GPU arm, interrupted + resumed GPU arm, comparisons) |
| acceptance | `node --experimental-transform-types tools/gpu-phase2/accept.ts --study research/<study>` (writes the record only if every gate passed) |

## 7. Troubleshooting

| Symptom | Meaning / action |
|---|---|
| `preflight-acceptance: no GPU acceptance record` | official optimization is blocked by design until an acceptance study passes |
| `preflight-compat` / `changed since acceptance` | an evaluation dependency changed: port it, rebuild, rerun the Apollo verification, new acceptance |
| `preflight-capability` | the search domain reaches a feature without a CUDA port: port it (or declare the reduced domain in the protocol) |
| `preflight-parity` | the live mini-set differs from the CPU engine: a defect — stop, investigate, never loosen |
| `gpu-hang` / `kernel watchdog` | a batch exceeded its time limit; the job stopped (checkpointed). Check `nvidia-smi`, the server's stderr tail in the error, then resume (the gate runs again) |
| `GPU memory` | lower the batch size or VRAM use by other processes (vLLM, if running, holds ≈ 28 GB) |
| `receipt mismatch` | the results are not trusted; the job stopped. Rerun the sanitizer and the parity campaign before resuming |
| `host worker … exited / failed / did not answer` | a host-path worker failed: the job stopped (checkpointed), nothing of the batch was released; check memory (each worker has a 3 GiB heap limit) and the error, then resume |
| `preflight-pins` / `preflight-source` | a pinned file differs from the record, or is not committed: commit (or revert) and, if it is a real change, follow the checklist |
| `preflight-runtime` / `runtime-maglev` | the process was not started with `node --no-maglev …` (or carries another Maglev option): restart it with the flag on the command line (§3a) |
| `JOB_ACTIVE` | another live process owns the job (owner pid and host in the message): wait, stop it, or use another job name |
| `JOB_EXISTS` / `JOB_IDENTITY_CONFLICT` / `JOB_NOT_FOUND` | a new start of an existing job (resume it), a resume with another definition (a different job needs its own name), a resume of a job that never existed (§4c) |
| `JOB_FOREIGN_STATE` | the job's directories hold state without a job identity (an unmanaged earlier run): inspect and remove it, or use another name — never adopted |
| `preflight-job` | an official run without a held job of its study, or with a run id / dataset cache that is not its job's (§4c) |
| `runtime-maglev` from a legacy runner or Strategy Lab | the process was started without `node --no-maglev` (use the npm scripts; §3a) |
| `DATASET_CACHE_CONFLICT` / `DATASET_CACHE_INVALID` | the cache directory holds another dataset under this door's name, or a damaged file: remove it or use a fresh cache directory (§4b); never overwritten automatically |
| `preflight-host-path` | the host workers did not start or hold another door: an environment or code fault, never fall back |
| Debug timing | `GB_DEBUG=1` (the default from the client) makes the server log per-batch phase times to its stderr, kept in the client (`server.stderrTail`) |
