# GPU Phase 2 — operations

Every command below exists on branch `research/gpu-phase2` and was used in this study (run logs:
`results/runlogs/`, `results/logs/`, `RUN_COMMANDS.md`). Paths are relative to the repository root
(`/home/chad/projects/margin-trading` on Apollo). The durable, study-independent guide is
[docs/gpu/README.md](../../docs/gpu/README.md); the change procedure is
[docs/gpu/PARITY_CHECKLIST.md](../../docs/gpu/PARITY_CHECKLIST.md).

Shorthand used below: `NODE="node --experimental-transform-types --disable-warning=ExperimentalWarning"`.

## 1. Install the CUDA toolkit (user space, once)

```bash
tools/gpu-phase2/install-toolkit.sh      # → /home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit
```

- NVIDIA redistributable archives (CUDA 13.2.2: nvcc 13.2.86, cudart, compute-sanitizer 2026.1.1, CUPTI, Nsight
  Compute, cuda-gdb), unpacked into the user's home with an `INSTALL_MANIFEST.json`. No apt, driver, display or
  container change. Uninstall: delete that directory and `…/downloads-13.2.2`.
- The driver (595.91.07, CUDA 13.2) is the system's; the toolkit only needs to be ≤ the driver's CUDA version.

## 2. Build the evaluator

```bash
D=$($NODE src/gpu-backend/compat.ts --digest)               # the compatibility digest of the working tree
tools/gpu-backend/build.sh research/gpu-phase2/build/gb2 "$D"  # prints the sha256; stripped → reproducible
$NODE src/gpu-backend/compat.ts --manifest                    # the files and digests the binary is tied to
```

- The accepted binary of this study: sha256 `3fe09e6791ff9996bc4f463c43e7d8dff46600ca3bcbf0d7777be155301e13fc` (compat
  `f67dcb3b…daea`), reproduced by three independent builds (`results/final-binary.json`).
- Rebuild after any change in the manifest; the gate refuses a binary whose compiled digest differs from the tree.

## 3. Official GPU-only optimization: preflight

```bash
# static (no GPU): the adoption manifest, the standard's pin, §9 rules, the acceptance record
npm run research-preflight -- --study research/<study>

# live (the same gate an official optimization opens): purpose, acceptance, server/build/device, capability coverage of
# the whole reachable domain, smoke kernel, VRAM, parity mini-set vs the CPU engine on the door; writes the attestation
GPU_POLICY_PURPOSE=official-optimization $NODE tools/gpu-backend/official-preflight.ts \
  --study research/<study> --door D24 --domain pilot --batch 8192
```

- Exit 0: `GATE OPEN — attestation research/<study>/results/gpu-attestations/preflight-<time>.json`; exit 3:
  `REFUSED — <reason>` (no search work was done).
- Before an acceptance record exists the gate refuses (`results/runlogs/official-preflight-before-acceptance.txt`).
- An official runner calls `openOfficialGpuSession` (`src/gpu-backend/official.ts`) and evaluates only through
  `GpuPool` + `EvalLab`; there is no CPU or `auto` backend to select.

## 4. CPU runs (non-official only)

```bash
GPU_POLICY_PURPOSE=cpu-reference npm run <legacy research script> -- <its arguments>
GPU_POLICY_PURPOSE=diagnostic    npm run <legacy research script> -- <its arguments>
```

- Without a purpose the npm script exits 3 (`purpose-required`); with `official-optimization` it exits 3
  (`cpu-official-refused`). Allowed purposes: `cpu-reference`, `diagnostic`, `parity-test`, `benchmark`,
  `strategy-lab`. Strategy Lab (`npm run app`, `npm run preapp`) is not gated: it is the CPU product evaluator.

## 5. Parity and verification (Apollo GPU step)

```bash
# one parity run (CPU reference with 12 workers vs the GPU, bit for bit; records books, pool, record, envelope hashes)
$NODE --expose-gc --max-old-space-size=14000 tools/gpu-phase2/parity.ts --door D24 --options base --refs \
  --random 2000 --strata 4 --label X --detail --risk --batches 1,7,13,16,32,50,64,128 --determinism-subset 256 \
  --out research/gpu-phase2/results/parity/dev/x.json

# the whole campaign (each run a contained sub-unit; fail-fast) and its summary
PARITY_OUT=research/gpu-phase2/results/parity/final PARITY_LOG=$PWD/research/gpu-phase2/results/logs/parity-final \
  /bin/bash research/gpu-phase2/chains/parity.sh
$NODE tools/gpu-phase2/parity-summary.ts research/gpu-phase2/results/parity/final

# memory safety: memcheck (leak check), racecheck, initcheck, synccheck on the real kernels
$NODE tools/gpu-phase2/sanitize.ts --door W-CRASH --per 1 --random 64 --out-dir sanitizer-final

# negative tests (needs build/gb2-dev, gb2-perturbed (GB_EXTRA_DEFINES=-DGB_TEST_PERTURB), gb2-stale)
$NODE tools/gpu-phase2/negative.ts --out research/gpu-phase2/results/policy/negative-final.json

# fixed-seed mini-optimization: CPU arm, GPU arm, interrupted + resumed GPU arm, comparisons
RUN=g7f /bin/bash research/gpu-phase2/chains/mini-opt.sh

# replay of a sealed Assignment 3 job on the GPU (benchmark + identity) and its comparison
$NODE --expose-gc --max-old-space-size=20000 tools/gpu-phase2/mini-opt.ts --backend gpu --run a3-C19-broad1 --a3-job C19:broad1
$NODE tools/gpu-phase2/a3-replay-compare.ts a3-C19-broad1/gpu C19 broad1 --out research/gpu-phase2/results/optimizer/compare-a3-C19-broad1.json

# benchmarks, 24 h stress, acceptance
$NODE --expose-gc tools/gpu-phase2/bench.ts --out research/gpu-phase2/results/bench/bench.json
$NODE --expose-gc tools/gpu-phase2/stress.ts --hours 24.05 --out-dir research/gpu-phase2/results/stress
$NODE tools/gpu-phase2/accept.ts            # writes config/gpu-backend/acceptance.json (ACCEPTED only if every gate passed)
```

The final gates of this study ran as one chain: `research/gpu-phase2/chains/final-gates.sh` (steps 1–7; `START=<n>`
relaunches from a failed step without rerunning passed ones).

## 6. Running long jobs (containment)

```bash
tools/gpu-phase2/launch.sh <unit> /abs/path/log.txt [--wait] -- <command…>     # gpup2.slice: 44G / 48G / swap 0
systemctl --user list-units 'gpup2*'                                            # what runs
systemctl --user status <unit>; tail -f <log>                                   # progress
```

## 7. Monitoring a GPU job

| What | Where |
|---|---|
| receipts (one line per batch: nonce, UUID, device counters, checksum, phase times, CPU-scored) | `<job out>/receipts.jsonl` (official: the run's ledger file) |
| telemetry every 30 s (util, VRAM, power, temperature, submitted / returned / failed / CPU-scored, ev/s) | `<job out>/telemetry.jsonl` |
| the attestation of each gate opening (each resume) | `research/<study>/results/gpu-attestations/` |
| the server's per-batch phase times | `GB_DEBUG=1` (default from the client); shown with any failure (`server.stderrTail`) |
| the GPU | `nvidia-smi --query-gpu=utilization.gpu,memory.used,power.draw,temperature.gpu --format=csv -l 5` |

## 8. Resume and recovery

| Situation | What happens | What to do |
|---|---|---|
| graceful stop (`--stop-after`, a requested stop) | the Lab checkpoints; exit 75 | rerun the same command: the archive replays; the gate runs again (new attestation) |
| server killed / device fault / watchdog / batch timeout | the job fails closed, checkpointed; no result of the failed batch is released | inspect `nvidia-smi` and the error's server tail; rerun the same command |
| `receipt mismatch` / `conservation` / `cpu-scored` | the batch's results are withheld; the job stops | treat as a defect: rerun the sanitizer and a parity run before resuming |
| `bound to backend … refused` on resume | the archive was written by another binary/compat digest/device | resume with the original build, or start a new job (never relax the binding) |
| `preflight-compat` / `STALE` acceptance | an evaluation dependency changed | port, rebuild, run the Apollo verification (§5), regenerate the acceptance |
| `GPU memory` | the batch does not fit | lower the batch size; check other GPU processes |
| a batch-size-1 run looks idle | expected: one GPU thread walks the whole door (3–5 s per D24 candidate) | wait; the watchdog (300 s per batch) catches a real stall |

## 9. What must never be done

- Never run an official optimization on the CPU, select a CPU or `auto` backend, or mix CPU-scored evaluations into an
  official archive; never loosen a parity comparison or the archive binding.
- Never edit a file of the compatibility manifest without the parity checklist; never edit an acceptance record by
  hand.
- Never change the display, driver, BIOS or boot configuration for GPU work, and never write `state/strategy-lab/`.
