# gpu-phase5 — the exact commands (repository root `/home/chad/projects/margin-trading`, branch `research/gpu-phase5`)

`N` = `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`;
`TS` = `--experimental-transform-types --disable-warning=ExperimentalWarning`. Every tool declares a non-official purpose
(`GPU_POLICY_PURPOSE=diagnostic | parity-test | benchmark`). Long GPU jobs run as transient systemd user units
(`tools/gpu-phase5/launch.sh` for a chain, `launch-slice.sh` / `group.sh` for jobs inside `gpup5.slice`, MemoryHigh 44G /
MemoryMax 48G / no swap). Times are UTC (2026-11-20/21).

## 0. Provenance and protocol

```bash
git switch -c research/gpu-phase5 research/gpu-phase4            # 0ac3e4e2 (= origin); main = gpu-phase2 = gpu-phase3 = 3a52cc63
git ls-remote origin main research/gpu-phase2 research/gpu-phase3 research/gpu-phase4
journalctl -k --since 2026-11-18 --no-pager -o short-iso | grep -Ei 'xid|machine check|edac.*error|hardware error'
npm run research-preflight -- --study research/gpu-phase5          # PASS (standard 3.0.0, scope diagnostic)
```

## 1. Root cause (results/rootcause/)

```bash
# exploratory (before the freeze): the CPU record of tasks 32-35 under V8 tier configurations
GPU_POLICY_PURPOSE=diagnostic $N [--no-opt | --no-maglev | --no-turbofan | --always-sparkplug | --no-sparkplug --no-maglev | --no-concurrent-recompilation | --stress-maglev] $TS tools/gpu-phase5/diag-bits.ts --from 32 --to 34

# the fresh-context loop on Phase 4's D24-fund (default engine, binary gb4), stopped by SIGTERM after 36 cycles
tools/gpu-phase5/launch-slice.sh gpup5-fresh-loop-p4 $PWD/research/gpu-phase5/results/logs/fresh-loop-p4.txt --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test $N --expose-gc --max-old-space-size=14000 $TS tools/gpu-phase5/fresh-loop.ts --out research/gpu-phase5/results/rootcause/fresh-loop-p4 --cycles 400 --max-minutes 100
systemctl --user kill --kill-whom=main -s SIGTERM gpup5-fresh-loop-p4.service

# which pair of path values gives the captured wrong number exactly
GPU_POLICY_PURPOSE=diagnostic $N --max-old-space-size=8000 $TS tools/gpu-phase5/diag-envelope.ts --index 3 --wrong 101060.43759030467,101108.57625063331 --search

# cold processes running CPU worker 0's first chunk, the path kept and dissected
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/envelope-stress.ts --procs 20 --seconds 150 --out research/gpu-phase5/results/rootcause/envelope-stress-default.json
# three arms at once (7 processes each, 420 s): --v8 "" | "--no-maglev" | "--no-turbofan"  -> envelope-stress-{default2,no-maglev,no-turbofan}.json
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/envelope-stress.ts --procs 7 --seconds 420 --v8 "<flags>" --out research/gpu-phase5/results/rootcause/envelope-stress-<name>.json
# with V8's tiering trace kept for a process with a transient (scratch trace directory)
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/envelope-stress.ts --procs 20 --seconds 540 --trace <scratch dir> --out research/gpu-phase5/results/rootcause/envelope-stress-traced.json
# A/B, two arms at once (12 processes each, 900 s) -> envelope-stress-ab-{default,no-maglev}.json
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/envelope-stress.ts --procs 12 --seconds 900 --v8 "<flags>" --out research/gpu-phase5/results/rootcause/envelope-stress-ab-<name>.json

# synthetic variants (neither triggers)
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/v8-alias-repro.ts --procs 24 --seconds 45
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/alias-hunt.ts --procs 20 --seconds 60

# the record path: cold processes running worker 8's chunk (tasks 32-39), three passes; two arms at once (10 each)
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/record-stress.ts --procs 10 --seconds 1200 --from 32 --to 40 --v8 "<flags>" --out research/gpu-phase5/results/rootcause/record-stress-<default|no-maglev>.json          # first version (each pass against the last pass)
GPU_POLICY_PURPOSE=diagnostic $N $TS tools/gpu-phase5/record-stress.ts --procs 10 --seconds 720 --from 32 --to 40 --v8 "<flags>" --out research/gpu-phase5/results/rootcause/record-stress-truth-<default|no-maglev>.json     # against a --no-maglev ground truth
# the GPU host path: fresh pipelines decoding one real device response (concurrently with the first record stress)
GPU_POLICY_PURPOSE=parity-test $N --expose-gc --max-old-space-size=14000 $TS tools/gpu-phase5/host-soak.ts --cycles 2000 --max-minutes 20 --mode full --out research/gpu-phase5/results/rootcause/host-soak-default-full.json
```

## 2. Atomic dataset export (results/cache/)

```bash
GPU_POLICY_PURPOSE=diagnostic $N $TS --test src/gpu-backend/tests/dataset.test.ts
GPU_POLICY_PURPOSE=diagnostic $N --max-old-space-size=14000 $TS tools/gpu-phase5/dataset-identity.ts --out research/gpu-phase5/results/cache/dataset-identity.json
GPU_POLICY_PURPOSE=diagnostic $N --max-old-space-size=8000 $TS tools/gpu-phase5/dataset-race.ts kill --kills 40 --door D19 --out research/gpu-phase5/results/cache/kill-d19.json
GPU_POLICY_PURPOSE=diagnostic $N --no-maglev --max-old-space-size=8000 $TS tools/gpu-phase5/dataset-race.ts race --mode legacy-inplace --procs 4 --loops 25 --door D19 --out research/gpu-phase5/results/cache/race-d19-legacy-inplace.json
GPU_POLICY_PURPOSE=diagnostic $N --no-maglev --max-old-space-size=8000 $TS tools/gpu-phase5/dataset-race.ts race --mode atomic --procs 4 --loops 25 --door D19 --out research/gpu-phase5/results/cache/race-d19-atomic.json
GPU_POLICY_PURPOSE=diagnostic $N --no-maglev --max-old-space-size=8000 $TS tools/gpu-phase5/dataset-race.ts conflict --rounds 10 --out research/gpu-phase5/results/cache/conflict.json
```

## 3. Sealed-file protection (results/seals/)

```bash
$N --no-maglev $TS tools/gpu-phase5/seal-protect.ts --check --out research/gpu-phase5/results/seals/check-before.json
$N --no-maglev $TS tools/gpu-phase5/seal-protect.ts --apply --out research/gpu-phase5/results/seals/apply.json
$N --no-maglev $TS tools/gpu-phase5/seal-protect.ts --check --out research/gpu-phase5/results/seals/check-after.json   # exit 1 if a verified sealed file is writable
```

## 4. Performance audit (results/bench, results/optimizer, results/perf)

```bash
# baselines: the accepted configuration (binary gb3, Maglev enabled), then the same under --no-maglev; stopped after nm-a3-r1 (amendment A2)
tools/gpu-phase5/launch.sh p5chain-pbase $PWD/research/gpu-phase5/results/logs/chain-pbase.txt -- /bin/bash research/gpu-phase5/chains/p-baseline.sh
#   each group: ( source research/gpu-phase5/chains/lib.sh; bench <group> K=1 MODE=ftw JOB=a3:C19:broad1 HW=8 B=8192 VRAM=7000 RSS=7168 [ENGINE=] GPU_BACKEND_BINARY=$PWD/research/gpu-phase3/build/gb3 )
# the CPU-profiled prefix (300,000 fresh evaluations; never a timing), then its summary
tools/gpu-phase5/launch.sh p5chain-pprof $PWD/research/gpu-phase5/results/logs/chain-pprof.txt --wait -- /bin/bash research/gpu-phase5/chains/p-profile.sh
$N --no-maglev $TS tools/gpu-phase5/cpuprof-summary.ts research/gpu-phase5/results/raw-large/cpuprof --top 60 --out research/gpu-phase5/results/perf/cpuprof-summary.json
```

## 5. Pre-campaign checks (2026-11-20T23:38Z–2026-11-21T00:05Z)

```bash
# the parity tool end to end, and its mismatch capture (git-ignored outputs; not evidence)
GPU_POLICY_PURPOSE=parity-test $N --no-maglev --expose-gc --max-old-space-size=14000 $TS tools/gpu-phase5/parity.ts --host-workers 8 --door W-QUIET --options base --refs --random 60 --strata 1 --label SMOKE --detail --risk --batches 1,7 --determinism-subset 12 --worker-counts 0,1 --out research/gpu-phase5/results/raw-large/smoke/parity-smoke.json
GPU_POLICY_PURPOSE=parity-test $N --no-maglev --expose-gc --max-old-space-size=14000 $TS tools/gpu-phase5/parity.ts --host-workers 8 --door W-QUIET --options base --refs --random 60 --strata 1 --label SMOKE --detail --risk --test-inject R:C4 --out research/gpu-phase5/results/raw-large/smoke/parity-smoke-inject.json   # exit 2 by design
# bounded memory pattern tests (non-destructive, spare memory only) and the kernel log
LD_LIBRARY_PATH=/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit/lib research/gpu-phase5/build/vram-test 24 3 > research/gpu-phase5/results/diagnostics/vram-test.json
research/gpu-phase5/build/hostmem-test 24 2 8 > research/gpu-phase5/results/diagnostics/hostmem-test.json
journalctl -k --since "2026-11-20 21:00" --no-pager -o short-iso | grep -Ei "xid|machine check|edac.*error|hardware error|oom"
# the GPU backend's tests under the mandated runtime (30 tests), the manifest digests, typecheck, lint
GPU_POLICY_PURPOSE=diagnostic $N --no-maglev $TS --test --test-concurrency=2 src/gpu-backend/tests/*.test.ts
$N --no-maglev $TS src/gpu-backend/compat.ts
npx tsc --noEmit -p . && npx eslint src/gpu-backend tools/gpu-phase5 src/gpu-phase5
```

## 6. The final acceptance campaign (stage A; one chain, 36 steps, fail-fast)

```bash
tools/gpu-phase5/launch.sh p5chain-final /home/chad/projects/margin-trading/research/gpu-phase5/results/logs/chain-final.txt -- /usr/bin/env START=1 MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase5/chains/final.sh
# resume after a failed step k (never rerunning passed steps): … -- /usr/bin/env START=<k> MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase5/chains/final.sh
```

As run (amendments A4 and A5; the log is `research/gpu-phase5/results/logs/chain-final.txt` throughout):

```bash
# 2026-11-21T00:07:05Z  steps 1-29 (stopped in step 29 at I7 on a shell error of chains/isolation.sh)
tools/gpu-phase5/launch.sh p5chain-final /home/chad/projects/margin-trading/research/gpu-phase5/results/logs/chain-final.txt -- /usr/bin/env START=1 MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase5/chains/final.sh
# 2026-11-21T03:10:44Z  I7 from the corrected script, then steps 30-36
tools/gpu-phase5/launch.sh p5chain-final-r1 /home/chad/projects/margin-trading/research/gpu-phase5/results/logs/chain-final.txt -- /bin/bash research/gpu-phase5/chains/final-resume-30.sh
# 2026-11-21T05:48:09Z  step 36 again, whole (attempt 1's records moved to results/tests/attempt1/ first)
tools/gpu-phase5/launch.sh p5chain-final-r2 /home/chad/projects/margin-trading/research/gpu-phase5/results/logs/chain-final.txt -- /usr/bin/env START=36 MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase5/chains/final.sh
# the performance table from the job profiles
python3 research/gpu-phase5/results/perf/performance.py
```

The steps and their exact commands are the `step` lines of `research/gpu-phase5/chains/final.sh` (build-final,
offline-check, host-soak, parity-campaign = `chains/parity.sh`, parity-summary, orig-d24-fund-r1/-r2, finalists, a3-r1,
a3-r2, a3-qualify, a2-r1, the mini arms and their comparisons, sanitizer, negative, tamper, isolation =
`chains/isolation.sh`, sustained, fresh-loop, the three accepted-configuration baselines, regression, tests =
`chains/tests.sh`).

## 7. Acceptance, integration, bundle

Appended below as they run.
