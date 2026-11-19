# gpu-phase3 — run commands (as executed)

Working directory `/home/chad/projects/margin-trading`, branch `research/gpu-phase3`. Node v24.21.0 (units use
`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`). Shorthand:
`NODE="node --experimental-transform-types --disable-warning=ExperimentalWarning"`. Times UTC. Long runs are transient
systemd user units in `gpup3.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) via
`tools/gpu-phase3/launch.sh <unit> <abs log> [--wait] -- <command>`. Unit logs (`results/logs/`, git-ignored) are copied
to `results/runlogs/` at the end.

## Stage 0 (13:55–14:05)

```bash
git switch -c research/gpu-phase3                       # from research/gpu-phase2 a1836407
$NODE src/gpu-backend/compat.ts                          # f67dcb3b… = the Phase 2 acceptance
# checkAcceptance({ binary: research/gpu-phase2/build/gb2, uuid }) → ACCEPTED
gh api repos/chaddjohnson/margin-trading/branches/main/protection   # 404 "Branch not protected"
```

## Stage 1 — the accepted Phase 2 path (14:05–15:24)

```bash
# development captures of real batches (Phase 2 binary): research/gpu-phase3/cache/captures/ (git-ignored)
GPU_POLICY_PURPOSE=benchmark $NODE tools/gpu-phase3/capture.ts --name d19-base-4096 --door D19 --options base --refs --random 4096
#   … d24-detail-risk-1024, d24-all-512, d24-periods-512, d24-blackout-trades-256, s3-all-256, full-base-1024
tools/gpu-phase3/launch.sh gpup3-baseline $PWD/research/gpu-phase3/results/logs/baseline-chain.txt -- /bin/bash research/gpu-phase3/chains/baseline.sh
# p2-a2-r1's final dump failed after its job-end (V8 string limit); recovered read-only:
GPU_POLICY_PURPOSE=benchmark $NODE --max-old-space-size=12000 tools/gpu-phase3/archive-digest.ts p2-a2-r1/gpu
$NODE tools/gpu-phase3/compare.ts sealed p2-a2-r1/gpu a2 C19 base --out research/gpu-phase3/results/optimizer/compare-p2-a2-r1-vs-sealed.json
for i in 1 2 3; do GPU_POLICY_PURPOSE=benchmark $NODE --expose-gc tools/gpu-phase3/replay.ts --backend gpu --run p2-mini-r$i --job mini --batch 8192 --linger 30; done
$NODE tools/gpu-phase3/compare.ts arms p2-mini-r1/gpu p2-mini-r2/gpu --out research/gpu-phase3/results/optimizer/compare-p2-mini-r1-vs-r2.json
```

Protocol frozen 14:21:42Z (`results/protocol-freeze.json`); commits `b4424384`, `628d450a`.

## Stage 2 — Priority A (15:24–)

```bash
research/gpu-phase3/cache/staged/apply.sh      # staged edits of existing backend files (+ prettier); commit 37f67004
GPU_POLICY_PURPOSE=parity-test $NODE tools/gpu-phase3/offline-check.ts --workers 1,2,3,8 --out research/gpu-phase3/results/dev/offline-check-a.json
tools/gpu-phase3/launch.sh gpup3-devcheck-a $PWD/research/gpu-phase3/results/logs/devcheck-a.txt -- /usr/bin/env HW=8 TAG=a /bin/bash research/gpu-phase3/chains/devcheck.sh   # mini FAILED closed (start race)
# fix cb7d129c; then
tools/gpu-phase3/launch.sh gpup3-devcheck-b $PWD/research/gpu-phase3/results/logs/devcheck-b.txt -- /usr/bin/env HW=8 TAG=b /bin/bash research/gpu-phase3/chains/devcheck.sh   # pass
tools/gpu-phase3/launch.sh gpup3-sweep $PWD/research/gpu-phase3/results/logs/sweep-s2.txt -- /usr/bin/env TAG=s2 VARIANTS="w8-b8192 w4-b8192 w12-b8192 w8-b16384" /bin/bash research/gpu-phase3/chains/sweep.sh
```
