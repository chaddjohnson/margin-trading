#!/bin/bash
# gpu-phase9 (PROTOCOL.md §5–§6): the FULL acceptance campaign for the research-date-boundaries integration
# (docs/gpu/PARITY_CHECKLIST.md §2; a copy of research/gpu-phase7/chains/final.sh with this study's namespace, the D1
# dataset-identity step and checkout-relative paths), ONCE, on the committed final tree and the final binary
# research/gpu-phase9/build/gb9. NON-OFFICIAL (purposes parity-test / benchmark): nothing here is official optimization
# evidence; the only optimization is the fixed-seed engineering mini schedule on the development door D19 (step A4);
# NOTHING OF THE RISK-ENVELOPE PILOT RUNS and no post-validation data is read (FULL is the verified prefix through 2026-10-30).
# Every Node process runs as `node --no-maglev …` inside gpup9.slice (MemoryHigh 44G, MemoryMax 48G, swap 0). Strictly
# sequential except the declared concurrency pair and the two-process reliability run; fail-fast; START=<n> resumes from
# step n (each step's jobs refuse to be recreated: JOB_EXISTS). Never edit this file while it runs.
#   tools/gpu-phase9/launch-slice.sh p9chain-final <abs log> -- /usr/bin/env START=1 /bin/bash research/gpu-phase9/chains/final.sh
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT" || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TS="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning"
R=research/gpu-phase9/results
LOG=$ROOT/$R/logs/final
START=${START:-1}
HW=8
mkdir -p "$LOG" "$R/compare" "$R/parity" "$R/policy" "$R/risk-parity" "$R/qualify" "$R/sustained"
say() { echo "$(date -u +%FT%TZ) $*"; }
fail() { say "FAILED: $*"; exit 1; }
k=0
S() { k=$((k+1)); if [ $k -lt "$START" ]; then say "skip $k"; return 1; fi; say "step $k"; return 0; }
run() { # run <name> <expected rc> <unit> -- <command...>   (a contained sub-unit; waits)
  local name=$1 want=$2 unit=$3; shift 4
  say "start [$name] unit $unit"
  tools/gpu-phase9/launch-slice.sh "$unit" "$LOG/$name.txt" --wait -- "$@"
  local rc=$?
  say "end [$name] rc=$rc (want $want)"
  [ "$rc" = "$want" ] || fail "$name rc=$rc"
}
N() { "$NODE" $TS --max-old-space-size=14000 "$@"; }
JOB() { echo /usr/bin/env GPU_POLICY_PURPOSE=${P:-parity-test} "$NODE" $TS --max-old-space-size=12000 tools/gpu-phase9/job.ts "$@"; }
CMP() { local name=$1; shift; N tools/gpu-phase9/compare.ts "$@" --out "$R/compare/$name.json" > "$LOG/compare-$name.txt" 2>&1 || fail "compare $name"; say "compare [$name] $(tail -1 "$LOG/compare-$name.txt")"; }
RP() { local name=$1; shift; run "risk-parity-$name" 0 "gpup9-rp-$name" -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=14000 tools/gpu-phase9/risk-parity.ts --label "$name" --host-workers $HW --workers 12 "$@" --out "$R/risk-parity/$name.json"; }
units_active() { systemctl --user is-active "$@" 2>/dev/null | grep -c '^active$'; }

[ -z "$(git status --porcelain -- src tools config)" ] || fail "the source is not committed"

# B1 the final binary (reproducible; kernels identical to the accepted gb7)
S && { tools/gpu-phase9/build-final.sh > "$LOG/build-final.txt" 2>&1 || fail build-final; say "build-final $(tail -1 "$LOG/build-final.txt")"; }
# A1 the parity campaign (54 runs through the host path; ≥ 100,000 seeded genomes; zero tolerance) and its summary
S && { /usr/bin/env HW=$HW PARITY_OUT=$R/parity/final PARITY_LOG=$LOG/parity /bin/bash research/gpu-phase9/chains/parity.sh > "$LOG/parity-chain.txt" 2>&1 || fail parity-campaign; say "parity campaign complete"; }
S && { N tools/gpu-phase9/parity-summary.ts $R/parity/final > "$LOG/parity-summary.txt" 2>&1 || fail parity-summary; say "parity-summary $(tail -1 "$LOG/parity-summary.txt" | cut -c1-200)"; }
# D1 the GPU input: every real-data door's dataset = GPU Phase 7's accepted export (from the parity records)
S && { N tools/gpu-phase9/dataset-identity.ts > "$LOG/dataset-identity.txt" 2>&1 || fail dataset-identity; say "dataset-identity $(tail -1 "$LOG/dataset-identity.txt")"; }
# A2 Assignment 3's 48 sealed finalists on D24 (CPU = GPU = sealed C24 figures)
S && run finalists 0 gpup9-finalists -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=14000 tools/gpu-phase9/parity-finalists.ts --host-workers $HW --out "$R/parity/finalists.json"
# R1–R3 the risk-delivery parity through the EvalLab: threshold edges from Assignment 3's restored C21/C24 archives on
# their own doors, the sealed finalists on D24 under four option sets, fresh random genomes on D19
S && RP edge-D21 --door D21 --edge research/gpu-phase9/results/risk-parity/edge-subjects-D21.json --options base,cost10
S && RP edge-D24 --door D24 --edge research/gpu-phase9/results/risk-parity/edge-subjects-D24.json --options base,cost10
S && RP finalists-D24 --door D24 --finalists --options base,cost10,cost0,rate14
S && RP random-D19 --door D19 --random 1000 --options base,cost0
# A3 sealed optimizer replays: Assignment 3 C19 broad1 plain, then with the risk envelope requested (the control-arm
# invariance; its timing is the pilot's throughput measurement), Assignment 2 C19 base
S && run a3-plain 0 gpup9-a3-plain -- $(P=benchmark JOB --job a3:C19:broad1 --job-name a3-plain --host-workers $HW --batch 8192)
S && run a3-risk 0 gpup9-a3-risk -- $(P=benchmark JOB --job a3:C19:broad1 --job-name a3-risk --risk --host-workers $HW --batch 8192)
S && run a2-plain 0 gpup9-a2-plain -- $(P=benchmark JOB --job a2:C19:base --job-name a2-plain --host-workers $HW --batch 8192)
if S; then
  CMP a3-plain-vs-sealed sealed a3-plain a3 C19 broad1
  CMP a3-risk-vs-sealed sealed a3-risk a3 C19 broad1 --strip-envelope
  CMP a2-plain-vs-sealed sealed a2-plain a2 C19 base
fi
# A4 the fixed-seed mini-optimization: CPU and GPU, worker counts, a graceful stop and a SIGKILL with resume; with the
# envelope requested on both backends; two jobs at once
S && run mini-gpu-w8 0 gpup9-mini-w8 -- $(JOB --job mini --job-name mini-gpu-w8 --host-workers 8 --batch 8192)
S && run mini-cpu 0 gpup9-mini-cpu -- $(JOB --job mini --job-name mini-cpu --backend cpu --workers 12)
S && run mini-gpu-w1 0 gpup9-mini-w1 -- $(JOB --job mini --job-name mini-gpu-w1 --host-workers 1 --batch 8192)
S && run mini-gpu-w0 0 gpup9-mini-w0 -- $(JOB --job mini --job-name mini-gpu-w0 --batch 8192)
if S; then
  run mini-stop 75 gpup9-mini-stop -- $(JOB --job mini --job-name mini-stop --host-workers 8 --batch 8192 --stop-after 8000)
  run mini-stop-resume 0 gpup9-mini-stop-r -- $(JOB --job mini --job-name mini-stop --resume --host-workers 8 --batch 8192)
fi
if S; then
  tools/gpu-phase9/launch-slice.sh gpup9-mini-kill "$LOG/mini-kill.txt" -- $(JOB --job mini --job-name mini-kill --host-workers 8 --batch 8192) || fail "kill launch"
  K=$R/jobs/mini-kill/receipts.jsonl
  for i in $(seq 1 240); do [ -f "$K" ] && [ "$(wc -l < "$K")" -ge 4 ] && break; sleep 0.5; done
  [ "$(wc -l < "$K")" -ge 4 ] || fail "kill: no progress"
  systemctl --user kill --signal=SIGKILL gpup9-mini-kill; sleep 3
  say "mini-kill: SIGKILLed after $(wc -l < "$K") batches"
  run mini-kill-resume 0 gpup9-mini-kill-r -- $(JOB --job mini --job-name mini-kill --resume --host-workers 8 --batch 8192)
fi
S && run mini-risk-gpu 0 gpup9-mini-risk-gpu -- $(JOB --job mini --job-name mini-risk-gpu --risk --host-workers 8 --batch 8192)
S && run mini-risk-cpu 0 gpup9-mini-risk-cpu -- $(JOB --job mini --job-name mini-risk-cpu --risk --backend cpu --workers 12)
if S; then
  tools/gpu-phase9/launch-slice.sh gpup9-conc-plain "$LOG/mini-conc-plain.txt" -- $(JOB --job mini --job-name mini-conc-plain --host-workers 8 --batch 8192) || fail "conc plain"
  tools/gpu-phase9/launch-slice.sh gpup9-conc-risk "$LOG/mini-conc-risk.txt" -- $(JOB --job mini --job-name mini-conc-risk --risk --host-workers 8 --batch 8192) || fail "conc risk"
  sleep 5
  while [ "$(units_active gpup9-conc-plain gpup9-conc-risk)" -gt 0 ]; do sleep 5; done
  for j in mini-conc-plain mini-conc-risk; do [ -f "$R/jobs/$j/complete.json" ] || fail "$j did not complete"; done
fi
if S; then
  CMP mini-gpu-vs-cpu arms mini-gpu-w8 mini-cpu
  CMP mini-w1-vs-w8 arms mini-gpu-w8 mini-gpu-w1
  CMP mini-w0-vs-w8 arms mini-gpu-w8 mini-gpu-w0
  CMP mini-stopped-resumed-vs-ref arms mini-gpu-w8 mini-stop
  CMP mini-killed-resumed-vs-ref arms mini-gpu-w8 mini-kill
  CMP mini-risk-gpu-vs-cpu arms mini-risk-gpu mini-risk-cpu
  CMP mini-risk-vs-plain arms mini-gpu-w8 mini-risk-gpu --strip-envelope
  CMP mini-concurrent-plain-vs-ref arms mini-gpu-w8 mini-conc-plain
  CMP mini-concurrent-risk-vs-ref arms mini-risk-gpu mini-conc-risk
fi
# Q1 qualification and ranking parity on the risk mini archives (both policies, every evaluation)
S && { N tools/gpu-phase9/qualify-archives.ts mini-risk-cpu mini-risk-gpu --out $R/qualify/mini-risk.json > "$LOG/qualify.txt" 2>&1 || fail qualify; say "qualify $(tail -1 "$LOG/qualify.txt" | cut -c1-200)"; }
# A5 compute-sanitizer on the final binary (risk mode included)
S && run sanitizer 0 gpup9-sanitizer -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase9/sanitize.ts --door W-CRASH --per 1 --random 64 --out-dir sanitizer-final --host-workers 4
# E3 negative suite (final binaries); E4 tamper suite (sandbox clone)
S && { N tools/gpu-phase9/negative.ts --out $R/policy/negative-final.json --host-workers 3 > "$LOG/negative.txt" 2>&1 || fail negative; say "negative $(tail -1 "$LOG/negative.txt")"; }
S && { N tools/gpu-phase9/tamper.ts --out $R/policy/tamper-final.json > "$LOG/tamper.txt" 2>&1 || fail tamper; say "tamper $(tail -1 "$LOG/tamper.txt" | cut -c1-200)"; }
# A6 the bounded reliability run, Mode A: two concurrent processes × 32 minutes (joint, detail + risk, all options, …)
if S; then
  pids=()
  for i in 0 1; do
    tools/gpu-phase9/launch-slice.sh "gpup9-sustained-p$i" "$LOG/sustained-p$i.txt" --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=20000 tools/gpu-phase9/sustained.ts --minutes 32 --out-dir $R/sustained/p$i --host-workers 8 --proc "$i" --ref-workers 2 &
    pids+=($!)
  done
  rc=0; for p in "${pids[@]}"; do wait "$p" || rc=1; done
  [ $rc -eq 0 ] || fail sustained
  say "sustained ok"
fi
# E7–E10 the repository suite, Strategy Lab (suites, portfolio parity), integrity
S && { /bin/bash research/gpu-phase9/chains/tests.sh > "$LOG/tests.txt" 2>&1 || fail tests; say "tests $(tail -1 "$LOG/tests.txt")"; }
say "chain final complete"
