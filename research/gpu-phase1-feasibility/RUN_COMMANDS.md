# Run commands — gpu-phase1-feasibility

All from the repository root on Apollo. `NODE` = `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`
(absolute path for systemd units); `B` = `$NODE --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288`.

```bash
# 0. governance
npm run research-preflight -- --study research/gpu-phase1-feasibility          # PASS (standard 2.2.0, diagnostic)

# 1. toolchain (user space, pinned) and build
tools/gpu-phase1/install-toolchain.sh                                            # CUDA 13.2.86 wheels + builds build/gp1
CU=/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv/lib/python3.14/site-packages/nvidia/cu13
$CU/bin/nvcc -O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true \
  -o research/gpu-phase1-feasibility/build/gp1 src/gpu-phase1/cuda/gp1.cu      # sha256 b3bcccdbc87bd1a3…

# 2. S1 CPU baseline (contained units)
tools/gpu-phase1/launch.sh gpup1-s1-profile $PWD/research/gpu-phase1-feasibility/results/logs/s1-profile.log -- \
  $B tools/gpu-phase1/profile-components.ts --doors D24,FULL,D19,W-QUIET,W-CRASH,W-BEAR,W-TREND --random 48 --reps 3 \
  --out $PWD/research/gpu-phase1-feasibility/results/s1/components.json
$B tools/gpu-phase1/bench-cpu-pool.ts --door D24 --workers 1,8,12,14,16 --centres 128 --out research/gpu-phase1-feasibility/results/s1/cpu-pool-D24.json
$B tools/gpu-phase1/bench-cpu-pool.ts --door D19 --workers 12 --centres 128 --out research/gpu-phase1-feasibility/results/s1/cpu-pool-D19.json
$B tools/gpu-phase1/bench-cpu-pool.ts --door FULL --workers 12 --centres 128 --out research/gpu-phase1-feasibility/results/s1/cpu-pool-FULL.json

# 3. S4 parity, fixtures, negative tests and S5 benchmarks: the final chains (one GPU job at a time)
tools/gpu-phase1/launch.sh gpup1-final2 $PWD/research/gpu-phase1-feasibility/results/logs/final2-chain.log -- \
  /bin/bash research/gpu-phase1-feasibility/chains/final2.sh   # parity + fixtures + negative (its sanitizer step fails: §limitations)
tools/gpu-phase1/launch.sh gpup1-final3 $PWD/research/gpu-phase1-feasibility/results/logs/final3-chain.log -- \
  /bin/bash research/gpu-phase1-feasibility/chains/final3.sh   # benchmarks
$B tools/gpu-phase1/check-capacity-8192.ts                      # explains the 4 capacity refusals at batch 8,192

# 4. tables and tests
$NODE --experimental-transform-types tools/gpu-phase1/tables.ts
npm test                                                        # 1,680 tests: 1,669 pass, 7 known pre-existing failures, 4 skipped
```

Individual gates: `tools/gpu-phase1/parity.ts --door <D19|D24|FULL|W-…> [--options base|cost10|cost20|rate14|slip25|nextopen|native]
--random N --neighbours N --batches 0,… --out …`, `parity-fixtures.ts --doors 6 --subjects 160 --out …`,
`negative.ts --out …`, `bench.ts --mode slice|hybrid --door … --n … --batches … [--set heavy] --out …`.
