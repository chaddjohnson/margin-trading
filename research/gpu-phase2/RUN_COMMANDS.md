# gpu-phase2 — run commands (as executed)

Working directory: `/home/chad/projects/margin-trading`, branch `research/gpu-phase2`. Node v24.21.0
(`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node` in units). Shorthand:
`NODE="node --experimental-transform-types --disable-warning=ExperimentalWarning"`. Times are UTC. Long runs were
transient systemd user units in `gpup2.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) via
`tools/gpu-phase2/launch.sh <unit> <abs log> [--wait] -- <command>`. Unit logs (`results/logs/`, git-ignored) are copied
to `results/runlogs/` for the record.

## S0–S1 setup (2026-11-19 00:05–00:30)

```bash
tools/gpu-phase2/inventory.sh > research/gpu-phase2/results/inventory/s0-start.json
tools/gpu-phase2/install-toolkit.sh                     # user-space CUDA 13.2.2 redist toolkit (+ cuda_gdb)
# sanitizer control: an injected out-of-bounds write is caught
$TK/bin/nvcc … tools/gpu-phase2/fixtures/sanitizer-control.cu && $TK/compute-sanitizer/compute-sanitizer …   # results/sanitizer/control.txt
```

Protocol frozen 00:25 (`results/protocol-freeze.json`); commit `8dad359e`.

## Evaluator development (00:30–01:20)

```bash
D=$($NODE src/gpu-backend/compat.ts --digest); tools/gpu-backend/build.sh research/gpu-phase2/build/gb2 "$D"
$NODE tools/gpu-backend/check-v8math.ts                           # results/parity/v8math.json (10,000,000 inputs)
$NODE --test src/gpu-backend/tests/layout.test.ts
$NODE tools/gpu-phase2/probe.ts …                                   # development probes (W-CRASH, D24, all options)
$NODE tools/gpu-phase2/sanitize.ts --door W-QUIET --per 1           # dev binary: results/sanitizer/ (all tools 0 errors)
$NODE tools/gpu-phase2/parity.ts --door D24 --options base --refs --random 600 --label C --out research/gpu-phase2/results/parity/dev/calib-d24.json
$NODE tools/gpu-phase2/throughput-probe.ts --door D24 --sizes 1024,4096,8192,16384
$NODE --test src/gpu-backend/tests/policy.test.ts
npm run research-preflight -- --all
```

Commits `2f5bc24c`, `60553b27`.

## Pre-final campaign and the "hang" investigation (00:57–01:40)

```bash
systemd-run --user --unit=gpup2-parity-prefinal --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME" \
  -E PARITY_OUT=research/gpu-phase2/results/parity/prefinal -E PARITY_LOG=$PWD/research/gpu-phase2/results/logs/parity-prefinal \
  -p StandardOutput=append:$PWD/research/gpu-phase2/results/logs/parity-prefinal-chain.txt \
  -p StandardError=append:$PWD/research/gpu-phase2/results/logs/parity-prefinal-chain.txt \
  --working-directory=$PWD /bin/bash research/gpu-phase2/chains/parity.sh
# bisection runs (each passed): gpu-only.ts --set core …; parity.ts … --out results/parity/dev/repro3.json (GB_DEBUG=1)
# single-candidate timing (the explanation): gpu-only.ts --door D24 --set core --from {0,700,1400} --count 1 → 3.3–4.8 s each
systemctl --user stop gpup2-parity-prefinal      # 01:36, after D24-core (host code changed); D24-core completed: 2,325/2,325, determinism 0
```

## Dev validation (01:25–01:41)

```bash
tools/gpu-phase2/launch.sh gpup2-mini-opt $PWD/research/gpu-phase2/results/logs/mini-opt.txt -- /bin/bash research/gpu-phase2/chains/mini-opt.sh
$NODE tools/gpu-phase2/mini-opt-compare.ts g7/cpu g7/gpu --out research/gpu-phase2/results/optimizer/compare-g7-cpu-vs-gpu.json
$NODE --max-old-space-size=8000 tools/gpu-phase2/negative.ts --out research/gpu-phase2/results/policy/negative-dev.json   # 34/35 → pool fix
tools/gpu-phase2/launch.sh gpup2-mini-opt-p $PWD/research/gpu-phase2/results/logs/mini-opt-g7p.txt -- /usr/bin/env RUN=g7p /bin/bash research/gpu-phase2/chains/mini-opt-gpu.sh
npm run --silent research-preflight -- --hash        # standard 3.0.0 sha256 → registry
```

Commit `42a0694f`.

## FINAL binary (01:41)

```bash
D=$($NODE src/gpu-backend/compat.ts --digest)      # f67dcb3bcc3ba89647610e7cce548c97ea288df920e71b777fd94478d83adaea
tools/gpu-backend/build.sh research/gpu-phase2/build/gb2 "$D"                       # 3fe09e67…13fc (stripped, reproducible ×3)
tools/gpu-backend/build.sh research/gpu-phase2/build/gb2-dev "$D"
GB_EXTRA_DEFINES=-DGB_TEST_PERTURB tools/gpu-backend/build.sh research/gpu-phase2/build/gb2-perturbed "$D"
tools/gpu-backend/build.sh research/gpu-phase2/build/gb2-stale stale-digest-for-negative-test
```

Sealed `results/final-binary.json`; commit `ffb28177`.

## Final gates (from 01:43)

```bash
tools/gpu-phase2/launch.sh gpup2-a3-c19b1 $PWD/research/gpu-phase2/results/logs/a3-replay-C19-broad1.txt -- \
  $NODE_BIN --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning \
  tools/gpu-phase2/mini-opt.ts --backend gpu --run a3-C19-broad1 --a3-job C19:broad1
GPU_POLICY_PURPOSE=official-optimization $NODE tools/gpu-backend/official-preflight.ts --study research/gpu-phase2 --door D19   # refused (no acceptance)
systemd-run --user --unit=gpup2-final-gates-2 --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME" \
  -p StandardOutput=append:$PWD/research/gpu-phase2/results/logs/final-gates-chain.txt \
  -p StandardError=append:$PWD/research/gpu-phase2/results/logs/final-gates-chain.txt \
  --working-directory=$PWD /bin/bash research/gpu-phase2/chains/final-gates.sh
```

`chains/final-gates.sh` steps (each a contained sub-unit; fail-fast): 1 `a3-replay-compare.ts a3-C19-broad1/gpu C19
broad1`; 2 `a3-qualify-replay.ts --cutoff C19`; 3 `bench.ts --out results/bench/bench.json`; 4 `sanitize.ts --door
W-CRASH --per 1 --random 64 --out-dir sanitizer-final`; 5 `negative.ts --out results/policy/negative-final.json`; 6
`RUN=g7f chains/mini-opt.sh`; 7 `chains/parity.sh` (PARITY_OUT=results/parity/final) + `parity-summary.ts`; 8
`stress.ts --hours 24.05 --out-dir results/stress`.

FINAL_STEPS
