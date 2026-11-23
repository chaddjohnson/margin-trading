#!/bin/bash
# gpu-phase8 (PROTOCOL.md §5): the FULL acceptance campaign for the staged-stop delivery (docs/gpu/PARITY_CHECKLIST.md §2),
# ONCE, on the committed final tree and the final binary research/gpu-phase8/build/gb8 (after tools/gpu-phase7's
# chains/final.sh). NON-OFFICIAL (purposes parity-test / benchmark): nothing here is official optimization evidence and
# NOTHING OF PRIORITY 4'S RESEARCH RUNS. Every Node process runs as `node --no-maglev …` inside gpup8.slice (MemoryHigh 44G,
# MemoryMax 48G, swap 0). Strictly sequential except the declared concurrency pairs and the two-process reliability run;
# fail-fast; START=<n> resumes from step n (each step's jobs refuse to be recreated: JOB_EXISTS). Never edit this file
# while it runs. The repository and Strategy Lab suites (E7–E10) run afterwards: research/gpu-phase8/chains/tests.sh.
#   tools/gpu-phase8/launch-slice.sh p8chain-final <abs log> -- /usr/bin/env START=1 /bin/bash research/gpu-phase8/chains/final.sh
cd /home/chad/projects/margin-trading || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TS="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning"
R=research/gpu-phase8/results
LOG=/home/chad/projects/margin-trading/$R/logs/final
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
  tools/gpu-phase8/launch-slice.sh "$unit" "$LOG/$name.txt" --wait -- "$@"
  local rc=$?
  say "end [$name] rc=$rc (want $want)"
  [ "$rc" = "$want" ] || fail "$name rc=$rc"
}
N() { "$NODE" $TS --max-old-space-size=14000 "$@"; }
JOB() { echo /usr/bin/env GPU_POLICY_PURPOSE=${P:-parity-test} "$NODE" $TS --max-old-space-size=12000 tools/gpu-phase8/job.ts "$@"; }
CMP() { local name=$1; shift; N tools/gpu-phase8/compare.ts "$@" --out "$R/compare/$name.json" > "$LOG/compare-$name.txt" 2>&1 || fail "compare $name"; say "compare [$name] $(tail -1 "$LOG/compare-$name.txt")"; }
RP() { local name=$1; shift; run "risk-parity-$name" 0 "gpup8-rp-$name" -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=14000 tools/gpu-phase8/risk-parity.ts --label "$name" --host-workers $HW --workers 12 "$@" --out "$R/risk-parity/$name.json"; }
units_active() { systemctl --user is-active "$@" 2>/dev/null | grep -c '^active$'; }

[ -z "$(git status --porcelain -- src tools config)" ] || fail "the source is not committed"

# B1 the final binary (protocol v3; reproducible)
S && { tools/gpu-phase8/build-final.sh > "$LOG/build-final.txt" 2>&1 || fail build-final; say "build-final $(tail -1 "$LOG/build-final.txt")"; }
# E3 negative suite (final binaries; the staged group included); E4 tamper suite (a sandbox clone of the committed HEAD).
# They run FIRST, while the main checkout is exactly the committed campaign tree (the tamper suite refuses an uncommitted
# checkout); every later step reads only files that stay unchanged during the campaign.
S && { N tools/gpu-phase8/negative.ts --out $R/policy/negative-final.json --host-workers 3 > "$LOG/negative.txt" 2>&1 || fail negative; say "negative $(tail -1 "$LOG/negative.txt")"; }
S && { N tools/gpu-phase8/tamper.ts --out $R/policy/tamper-final.json > "$LOG/tamper.txt" 2>&1 || fail tamper; say "tamper $(tail -1 "$LOG/tamper.txt" | cut -c1-200)"; }
# A1 the parity campaign (≥ 100,000 seeded genomes with staged ON/OFF strata, the T fixtures; zero tolerance) and its summary
S && { /usr/bin/env HW=$HW PARITY_OUT=$R/parity/final PARITY_LOG=$LOG/parity /bin/bash research/gpu-phase8/chains/parity.sh > "$LOG/parity-chain.txt" 2>&1 || fail parity-campaign; say "parity campaign complete"; }
S && { N tools/gpu-phase8/parity-summary.ts $R/parity/final > "$LOG/parity-summary.txt" 2>&1 || fail parity-summary; say "parity-summary $(tail -1 "$LOG/parity-summary.txt" | cut -c1-200)"; }
# A2 Assignment 3's 48 sealed finalists on D24 (CPU = GPU = sealed C24 figures; staged OFF)
S && run finalists 0 gpup8-finalists -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=14000 tools/gpu-phase8/parity-finalists.ts --host-workers $HW --out "$R/parity/finalists.json"
# R1–R3 the risk-delivery parity (Phase 7's threshold-edge subjects, read-only; the finalists; random genomes)
S && RP edge-D21 --door D21 --edge research/gpu-phase7/results/risk-parity/edge-subjects-D21.json --options base,cost10
S && RP edge-D24 --door D24 --edge research/gpu-phase7/results/risk-parity/edge-subjects-D24.json --options base,cost10
S && RP finalists-D24 --door D24 --finalists --options base,cost10,cost0,rate14
S && RP random-D19 --door D19 --random 1000 --options base,cost0
# A3 sealed optimizer replays: Assignment 3 C19 broad1 plain and with the risk envelope, Assignment 2 C19 base; one Stage B
# CTRL lane per cutoff replayed by Priority 4's derived lane (CTRL arm: staged OFF)
S && run a3-plain 0 gpup8-a3-plain -- $(P=benchmark JOB --job a3:C19:broad1 --job-name a3-plain --host-workers $HW --batch 8192)
S && run a3-risk 0 gpup8-a3-risk -- $(P=benchmark JOB --job a3:C19:broad1 --job-name a3-risk --risk --host-workers $HW --batch 8192)
S && run a2-plain 0 gpup8-a2-plain -- $(P=benchmark JOB --job a2:C19:base --job-name a2-plain --host-workers $HW --batch 8192)
S && run sb-C19 0 gpup8-sb-C19 -- $(P=benchmark JOB --job sb:C19:GA0.VA0:R3 --job-name sb-C19 --host-workers $HW --batch 8192)
S && run sb-C21 0 gpup8-sb-C21 -- $(P=benchmark JOB --job sb:C21:GB0.VD1:R10 --job-name sb-C21 --host-workers $HW --batch 8192)
S && run sb-C24 0 gpup8-sb-C24 -- $(P=benchmark JOB --job sb:C24:GA0.VA0:R17 --job-name sb-C24 --host-workers $HW --batch 8192)
if S; then
  CMP a3-plain-vs-sealed sealed a3-plain a3 C19 broad1
  CMP a3-risk-vs-sealed sealed a3-risk a3 C19 broad1 --strip-envelope
  CMP a2-plain-vs-sealed sealed a2-plain a2 C19 base
  CMP sb-C19-vs-sealed stageb sb-C19 C19 C19/broad/GA0.VA0/R3
  CMP sb-C21-vs-sealed stageb sb-C21 C21 C21/broad/GB0.VD1/R10
  CMP sb-C24-vs-sealed stageb sb-C24 C24 C24/broad/GA0.VA0/R17
fi
# A4 the fixed-seed mini-optimization (Assignment 3's lane, Phase 7's set): CPU and GPU, worker counts, a graceful stop and
# a SIGKILL with resume, the envelope requested, two jobs at once
S && run mini-gpu-w8 0 gpup8-mini-w8 -- $(JOB --job mini --job-name mini-gpu-w8 --host-workers 8 --batch 8192)
S && run mini-cpu 0 gpup8-mini-cpu -- $(JOB --job mini --job-name mini-cpu --backend cpu --workers 12)
S && run mini-gpu-w1 0 gpup8-mini-w1 -- $(JOB --job mini --job-name mini-gpu-w1 --host-workers 1 --batch 8192)
S && run mini-gpu-w0 0 gpup8-mini-w0 -- $(JOB --job mini --job-name mini-gpu-w0 --batch 8192)
if S; then
  run mini-stop 75 gpup8-mini-stop -- $(JOB --job mini --job-name mini-stop --host-workers 8 --batch 8192 --stop-after 8000)
  run mini-stop-resume 0 gpup8-mini-stop-r -- $(JOB --job mini --job-name mini-stop --resume --host-workers 8 --batch 8192)
fi
if S; then
  tools/gpu-phase8/launch-slice.sh gpup8-mini-kill "$LOG/mini-kill.txt" -- $(JOB --job mini --job-name mini-kill --host-workers 8 --batch 8192) || fail "kill launch"
  K=$R/jobs/mini-kill/receipts.jsonl
  for i in $(seq 1 240); do [ -f "$K" ] && [ "$(wc -l < "$K")" -ge 4 ] && break; sleep 0.5; done
  [ "$(wc -l < "$K")" -ge 4 ] || fail "kill: no progress"
  systemctl --user kill --signal=SIGKILL gpup8-mini-kill; sleep 3
  say "mini-kill: SIGKILLed after $(wc -l < "$K") batches"
  run mini-kill-resume 0 gpup8-mini-kill-r -- $(JOB --job mini --job-name mini-kill --resume --host-workers 8 --batch 8192)
fi
S && run mini-risk-gpu 0 gpup8-mini-risk-gpu -- $(JOB --job mini --job-name mini-risk-gpu --risk --host-workers 8 --batch 8192)
S && run mini-risk-cpu 0 gpup8-mini-risk-cpu -- $(JOB --job mini --job-name mini-risk-cpu --risk --backend cpu --workers 12)
if S; then
  tools/gpu-phase8/launch-slice.sh gpup8-conc-plain "$LOG/mini-conc-plain.txt" -- $(JOB --job mini --job-name mini-conc-plain --host-workers 8 --batch 8192) || fail "conc plain"
  tools/gpu-phase8/launch-slice.sh gpup8-conc-risk "$LOG/mini-conc-risk.txt" -- $(JOB --job mini --job-name mini-conc-risk --risk --host-workers 8 --batch 8192) || fail "conc risk"
  sleep 5
  while [ "$(units_active gpup8-conc-plain gpup8-conc-risk)" -gt 0 ]; do sleep 5; done
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
# A4 the STAGED fixed-seed mini-optimization: Priority 4's two arms (CTRL; EXP with the staged genes) on the mini schedule
S && run p4-gpu-w8 0 gpup8-p4-w8 -- $(JOB --job p4 --job-name p4-gpu-w8 --host-workers 8 --batch 8192)
S && run p4-cpu 0 gpup8-p4-cpu -- $(JOB --job p4 --job-name p4-cpu --backend cpu --workers 12)
S && run p4-gpu-w1 0 gpup8-p4-w1 -- $(JOB --job p4 --job-name p4-gpu-w1 --host-workers 1 --batch 8192)
if S; then
  run p4-stop 75 gpup8-p4-stop -- $(JOB --job p4 --job-name p4-stop --host-workers 8 --batch 8192 --stop-after 6000)
  run p4-stop-resume 0 gpup8-p4-stop-r -- $(JOB --job p4 --job-name p4-stop --resume --host-workers 8 --batch 8192)
fi
if S; then
  tools/gpu-phase8/launch-slice.sh gpup8-p4-kill "$LOG/p4-kill.txt" -- $(JOB --job p4 --job-name p4-kill --host-workers 8 --batch 8192) || fail "p4 kill launch"
  K=$R/jobs/p4-kill/receipts.jsonl
  for i in $(seq 1 240); do [ -f "$K" ] && [ "$(wc -l < "$K")" -ge 4 ] && break; sleep 0.5; done
  [ "$(wc -l < "$K")" -ge 4 ] || fail "p4 kill: no progress"
  systemctl --user kill --signal=SIGKILL gpup8-p4-kill; sleep 3
  say "p4-kill: SIGKILLed after $(wc -l < "$K") batches"
  run p4-kill-resume 0 gpup8-p4-kill-r -- $(JOB --job p4 --job-name p4-kill --resume --host-workers 8 --batch 8192)
fi
if S; then
  tools/gpu-phase8/launch-slice.sh gpup8-p4-conc-a "$LOG/p4-conc-a.txt" -- $(JOB --job p4 --job-name p4-conc-a --host-workers 8 --batch 8192) || fail "p4 conc a"
  tools/gpu-phase8/launch-slice.sh gpup8-p4-conc-b "$LOG/p4-conc-b.txt" -- $(JOB --job p4 --job-name p4-conc-b --host-workers 8 --batch 8192) || fail "p4 conc b"
  sleep 5
  while [ "$(units_active gpup8-p4-conc-a gpup8-p4-conc-b)" -gt 0 ]; do sleep 5; done
  for j in p4-conc-a p4-conc-b; do [ -f "$R/jobs/$j/complete.json" ] || fail "$j did not complete"; done
fi
if S; then
  CMP p4-gpu-vs-cpu arms p4-gpu-w8 p4-cpu
  CMP p4-w1-vs-w8 arms p4-gpu-w8 p4-gpu-w1
  CMP p4-stopped-resumed-vs-ref arms p4-gpu-w8 p4-stop
  CMP p4-killed-resumed-vs-ref arms p4-gpu-w8 p4-kill
  CMP p4-concurrent-vs-ref arms p4-gpu-w8 p4-conc-a
  CMP p4-concurrent-b-vs-ref arms p4-gpu-w8 p4-conc-b
fi
# Q1 qualification and ranking parity on the staged mini archives (every evaluation carries its envelope)
S && { N tools/gpu-phase8/qualify-archives.ts p4-cpu p4-gpu-w8 --out $R/qualify/p4-mini.json > "$LOG/qualify.txt" 2>&1 || fail qualify; say "qualify $(tail -1 "$LOG/qualify.txt" | cut -c1-200)"; }
# A5 compute-sanitizer on the final binary (risk mode and staged ON included)
S && run sanitizer 0 gpup8-sanitizer -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase8/sanitize.ts --door W-CRASH --per 1 --random 64 --out-dir sanitizer-final --host-workers 4
# A6 the bounded reliability run, Mode A: two concurrent processes × 32 minutes (staged strata in every round)
if S; then
  pids=()
  for i in 0 1; do
    tools/gpu-phase8/launch-slice.sh "gpup8-sustained-p$i" "$LOG/sustained-p$i.txt" --wait -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=20000 tools/gpu-phase8/sustained.ts --minutes 32 --out-dir $R/sustained/p$i --host-workers 8 --proc "$i" --ref-workers 2 &
    pids+=($!)
  done
  rc=0; for p in "${pids[@]}"; do wait "$p" || rc=1; done
  [ $rc -eq 0 ] || fail sustained
  say "sustained ok"
fi
say "chain final complete"
