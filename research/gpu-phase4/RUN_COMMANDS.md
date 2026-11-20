# gpu-phase4 — run commands (as executed)

Working directory `/home/chad/projects/margin-trading`, branch `research/gpu-phase4`. Node v24.21.0 (units use
`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`). Shorthand:
`NODE="node --experimental-transform-types --disable-warning=ExperimentalWarning"`. Times UTC.

- Benchmark jobs are transient systemd user units in **`gpup4.slice`** (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0;
  per-job MemoryMax 11G unless stated; per-server VRAM budget ⌊28,000 / k⌋ MiB for k ≥ 2), started by
  `tools/gpu-phase4/group.sh` (admission → monitor → k units behind a file barrier → group record).
- Chains are units outside the slice (`tools/gpu-phase4/launch.sh`; they only launch and check), except the acceptance
  campaign `chains/final.sh`, which runs inside the slice (`tools/gpu-phase4/launch-slice.sh`).
- Every group: `chains/lib.sh bench` = `group.sh` → `verify.ts` (or `verify-pool.ts`) → `summarize.ts` → `gate.ts`,
  fail-fast; a verified replay group's job archives (git-ignored scratch) are deleted afterwards.

## Stage 0 / S1 (05:36–06:05)

```bash
git switch -c research/gpu-phase4                                   # from research/gpu-phase2 3a52cc63
tools/gpu-backend/verify-acceptance.sh --device --expect-record-sha256 b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214   # VERIFIED
npx tsc --noEmit -p tsconfig.json                                   # hostPipeline.ts(196,15) TS2304 'Transferable' (still present)
$NODE tools/gpu-phase4/env-record.ts --out research/gpu-phase4/results/preflight/environment.json
G=smoke-m1 K=1 MODE=ss JOB=mini HW=2 STOP=3000 VRAM=3000 RSS=3000 /bin/bash tools/gpu-phase4/group.sh   # harness check
G=smoke-m2 K=2 MODE=ss JOB=mini HW=2 STOP=3000 VRAM=3000 RSS=3000 /bin/bash tools/gpu-phase4/group.sh   # harness check
npm run research-preflight -- --study research/gpu-phase4           # PASS
# protocol frozen 06:04:19Z (results/protocol-freeze.json), commit 44417328
```

## B1–B9 (from 06:05)

```bash
L=$PWD/research/gpu-phase4/results/logs
tools/gpu-phase4/launch.sh p4chain-b1 $L/chain-b1.txt -- /bin/bash research/gpu-phase4/chains/b1.sh
tools/gpu-phase4/launch.sh p4chain-b2 $L/chain-b2.txt -- /bin/bash research/gpu-phase4/chains/after.sh p4chain-b1 research/gpu-phase4/results/bench/ftw1-r1/gate.json research/gpu-phase4/chains/b2.sh
tools/gpu-phase4/launch.sh p4chain-b2r $L/chain-b2r.txt -- /bin/bash research/gpu-phase4/chains/after-chain.sh p4chain-b2 $L/chain-b2.txt b2 research/gpu-phase4/chains/b2r.sh
tools/gpu-phase4/launch.sh p4chain-b3 $L/chain-b3.txt -- /bin/bash research/gpu-phase4/chains/after-chain.sh p4chain-b2r $L/chain-b2r.txt b2r research/gpu-phase4/chains/b3-b9.sh
```

One group by hand (example; every group of the chains is this command with its parameters):

```bash
G=ss2-w8 K=2 MODE=ss JOB=a3:C19:broad1 HW=8 B=8192 STOP=300000 VRAM=6144 RSS=5888 /bin/bash tools/gpu-phase4/group.sh
$NODE --max-old-space-size=12000 tools/gpu-phase4/verify.ts --group ss2-w8
$NODE tools/gpu-phase4/summarize.ts --group ss2-w8
$NODE tools/gpu-phase4/gate.ts --group ss2-w8
```
