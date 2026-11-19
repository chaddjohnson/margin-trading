# GPU evaluator — operations guide

How to build, verify, run and troubleshoot the CUDA evaluator on Apollo (RTX 5090). Normative rules:
[OPTIMIZATION_STANDARD.md](../research/OPTIMIZATION_STANDARD.md) §9 (from 3.0.0). Change procedure:
[PARITY_CHECKLIST.md](PARITY_CHECKLIST.md). Feature map: [FEATURE_MATRIX.md](FEATURE_MATRIX.md). The first acceptance
study and its evidence: `research/gpu-phase2/` (start with `GPU_PHASE2_HANDOFF.md`).

## 1. Components

| Component | Path | Role |
|---|---|---|
| CUDA server | `src/gpu-backend/cuda/gb_server.cu` (+ `gb_d1.cuh`, `gb_growth.cuh`, `gb_pool.cuh`, `gb_common.cuh`, `v8math.cuh`, `gb.h`) | a separate process; framed binary IPC on stdin/stdout (protocol v2); LOAD, EVAL, INFO, SMOKE, QUIT |
| Host client | `src/gpu-backend/client.ts`, `encode.ts`, `dataset.ts`, `layout.ts` | encodes tasks, decodes and verifies results (receipt, nonce, counters, checksum), rebuilds the canonical records with the UNCHANGED CPU reductions |
| Official gate | `src/gpu-backend/official.ts` `openOfficialGpuSession` | purpose, acceptance, server/build/device, reachable-domain capabilities, smoke, memory, parity mini-set, attestation |
| Pool and Lab | `src/gpu-backend/pool.ts` `GpuPool`, `lab.ts` `EvalLab` | the A3 `Pool` contract on the GPU (batching, pipelining, receipts ledger, conservation, telemetry, GPU-only capacity retries); the A3 Lab semantics with the backend in the archive binding |
| Policy | `purpose.ts`, `acceptance.ts`, `compat.ts`, `domain.ts`, `legacyRunner.ts`, `entrypoints.ts`; `src/research-standard/gpuPolicy.ts` | purposes, the acceptance record, the compatibility manifest, capability domains, the legacy CPU runner gate, the entrypoint registry, the preflight rules |
| Toolchain | `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit` (user space; `tools/gpu-phase2/install-toolkit.sh`) | nvcc 13.2, cudart, compute-sanitizer, cuda-gdb; nothing system-wide, no driver change |

## 2. Build

```bash
D=$(node --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh research/gpu-phase2/build/gb2 "$D"   # prints the binary's sha256
```

- Flags (never change them without a full parity campaign): `-O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true
  -prec-sqrt=true -Xcompiler -ffp-contract=off`.
- The compatibility digest is compiled in; the official gate refuses a binary whose digest differs from the working
  tree's (`preflight-compat`). Rebuild after ANY change in the manifest (`compat.ts --manifest` lists the files).
- The build replaces the binary atomically (a running server keeps its file).

## 3. Running

- **Official optimization:** only through `openOfficialGpuSession` (blocked until `config/gpu-backend/acceptance.json`
  is ACCEPTED and matches the tree, binary and device). The study's adoption manifest declares `evaluationBackend`
  (standard §9.11) and `npm run research-preflight -- --study research/<study>` passes.
- **Non-official GPU tools** (no acceptance needed; never official evidence): `tools/gpu-phase2/parity.ts`,
  `gpu-only.ts`, `throughput-probe.ts`, `mini-opt.ts`, `negative.ts`, `sanitize.ts`, `bench.ts`, `stress.ts`.
- **CPU runs:** only with `GPU_POLICY_PURPOSE=<cpu-reference|diagnostic|parity-test|benchmark|strategy-lab>`; legacy npm
  research scripts refuse to start without it and refuse `official-optimization`.
- **Containment:** long jobs run as transient systemd user units in one slice (MemoryHigh 44G, MemoryMax 48G, swap 0):
  `tools/gpu-phase2/launch.sh <unit> <absolute log> [--wait] -- <command…>`. The GPU server is a child of the job and
  lives in the same unit.

## 4. Sizing and performance (measured in research/gpu-phase2/GPU_PHASE2_BENCHMARKS.md)

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
| Debug timing | `GB_DEBUG=1` (the default from the client) makes the server log per-batch phase times to its stderr, kept in the client (`server.stderrTail`) |
