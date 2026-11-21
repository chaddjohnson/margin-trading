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

## B5–B9 resumes (amendments A1, A2)

```bash
tools/gpu-phase4/launch.sh p4chain-b5r $L/chain-b5r.txt -- /bin/bash research/gpu-phase4/chains/b5-b9-resume.sh   # after A1 (09:19)
chmod 0444 research/vg-d1-growth-joint/FROZEN_SELECTION.json                                                     # A2, sha256 verified = pin
tools/gpu-phase4/launch.sh p4chain-b8r $L/chain-b8r.txt -- /bin/bash research/gpu-phase4/chains/b8-b9-resume.sh   # B8 as r1b/r2b, then B9
$NODE tools/gpu-phase4/tables.ts                                                                                 # results/bench/SUMMARY.json, groups.csv, jobs.csv
```

## Stage C — corrective changes and the acceptance campaign (10:01–14:12)

```bash
bash research/gpu-phase4/cache/staged/apply.sh       # CC1–CC3 + registry --write + git mv of the stale Phase 3 record
npx tsc --noEmit -p tsconfig.json                    # 0 errors
npx eslint src/gpu-backend src/gpu-phase4 tools/gpu-phase4 tools/gpu-backend/official-preflight.ts   # 0
GPU_POLICY_PURPOSE=parity-test $NODE --test src/gpu-backend/tests/{policy,enforcement,hostPipeline,layout}.test.ts   # 19/19
# commit eaa65dae, then (inside gpup4.slice):
tools/gpu-phase4/launch-slice.sh p4chain-final $L/final-chain.txt -- /usr/bin/env START=1 MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase4/chains/final.sh
#   → step 3 stopped at 11:43:40Z: parity run D24-fund, 1 mismatch (A4)
GPU_POLICY_PURPOSE=parity-test $NODE tools/gpu-phase4/diag-mismatch.ts --out research/gpu-phase4/results/diagnostics/d24-fund-gb4.json
GPU_POLICY_PURPOSE=parity-test $NODE tools/gpu-phase4/diag-mismatch.ts --out research/gpu-phase4/results/diagnostics/d24-fund-gb4-smoke.json --repeat 20
GPU_POLICY_PURPOSE=parity-test $NODE tools/gpu-phase4/diag-cache.ts --out research/gpu-phase4/results/diagnostics/d24-fund-cache-pairs.json
#   (each in a launch-slice.sh unit with --wait)
tools/gpu-phase4/launch-slice.sh p4chain-final-resume $L/final-resume-chain.txt -- /usr/bin/env MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase4/chains/final-resume.sh
#   → parity resumed (D24-fund-r2 + the rest), summary, final.sh START=5 … tests
# A5: chmod 0444 of Priority 3's 9 writable pinned records (each sha256 verified = pin); results/tests copied to results/tests-run1
tools/gpu-phase4/launch-slice.sh p4chain-tests-r2 $L/tests-r2-chain.txt -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test /bin/bash research/gpu-phase4/chains/tests.sh
```

## A3 confirmation, acceptance dry run, summaries, bundle (14:13–)

```bash
tools/gpu-phase4/launch.sh p4chain-modea $L/chain-modea.txt -- /bin/bash research/gpu-phase4/chains/modea.sh   # on the accepted gb3
GPU_POLICY_PURPOSE=parity-test $NODE tools/gpu-phase4/accept.ts --dry-run > research/gpu-phase4/results/acceptance-dry-run.txt   # NOT_ACCEPTED, 1 blocker
$NODE tools/gpu-phase4/tables.ts
cp -r research/gpu-phase4/results/logs research/gpu-phase4/results/runlogs
GPU_POLICY_PURPOSE=benchmark $NODE tools/gpu-phase4/manifest.ts
tools/gpu-phase4/bundle.sh <scratchpad>/bundle      # research/gpu-phase4/bundle/gpu-phase4-concurrency-final-handoff.zip
git push -u origin research/gpu-phase4              # unsandboxed; git ls-remote origin refs/heads/research/gpu-phase4
git switch research/gpu-phase2                      # the branch active at the start (unchanged = main)
```
