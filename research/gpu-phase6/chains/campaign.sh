#!/bin/bash
# gpu-phase6 job-isolation and parity campaign (PROTOCOL.md §5, gates E2, E5–E7). Fail-fast: every step tests its own
# status. Every Node process starts as `node --no-maglev …` inside gpup6.slice (MemoryHigh 44G, MemoryMax 48G, swap 0).
# NON-OFFICIAL (purposes parity-test / benchmark); never official optimization evidence.
#   tools/gpu-phase6/launch-slice.sh p6chain-campaign <abs log> -- /usr/bin/env START=1 /bin/bash research/gpu-phase6/chains/campaign.sh
# Resume: START=<step> skips the steps before it (each step's jobs refuse to be recreated: JOB_EXISTS).
cd /home/chad/projects/margin-trading || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TS="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning"
R=research/gpu-phase6/results
LOG=/home/chad/projects/margin-trading/$R/logs/campaign
START=${START:-1}
mkdir -p "$LOG" "$R/campaign" "$R/compare" "$R/parity" "$R/policy" "$R/runtime"
step=0
say() { echo "$(date -u +%FT%TZ) $*"; }
fail() { say "FAILED: $*"; exit 1; }
run() { # run <step-name> <expected rc> <unit> -- <command...>   (waits)
  local name=$1 want=$2 unit=$3; shift 4
  say "start [$name] unit $unit"
  tools/gpu-phase6/launch-slice.sh "$unit" "$LOG/$name.txt" --wait -- "$@"
  local rc=$?
  say "end [$name] rc=$rc (want $want)"
  [ "$rc" = "$want" ] || fail "$name rc=$rc"
}
JOB() { echo /usr/bin/env GPU_POLICY_PURPOSE=${P:-parity-test} "$NODE" $TS --max-old-space-size=12000 tools/gpu-phase6/job.ts "$@"; }
attempt() { # attempt <name> <job.ts args...>: a start that must be REFUSED (exit 3, JOB-REFUSED <code>), outside any unit
  local name=$1; shift
  GPU_POLICY_PURPOSE=parity-test "$NODE" $TS tools/gpu-phase6/job.ts "$@" > "$R/campaign/attempt-$name.txt" 2>&1
  echo "exit $?" >> "$R/campaign/attempt-$name.txt"
  say "attempt [$name]: $(grep -m1 -o 'JOB-REFUSED [A-Z_]*' "$R/campaign/attempt-$name.txt") $(tail -1 "$R/campaign/attempt-$name.txt")"
}
units_active() { systemctl --user is-active "$@" 2>/dev/null | grep -c '^active$'; }

# the process audit: every Node process of this campaign's units, sampled every 2 s (unit, pid, ppid, command line)
( while :; do ps -eo pid=,ppid=,uunit:60=,args= | awk '$3 ~ /^gpup6-/ && $4 ~ /node$/' | sed "s/^/$(date -u +%FT%TZ) /"; sleep 2; done ) >> "$R/runtime/process-samples.txt" &
SAMPLER=$!
trap 'kill $SAMPLER 2>/dev/null' EXIT

S() { step=$((step+1)); [ "$step" -ge "$START" ]; }

# C1 the isolated reference: the fixed-seed mini optimization on the GPU (one job, default namespace)
S && run C1-ref-mini 0 gpup6-c1 -- $(JOB --job mini --job-name c1-ref-mini --host-workers 8 --batch 8192)
# C2 the same job on the CPU (non-official CPU arm, 12 forked workers under the engine flag)
S && run C2-mini-cpu 0 gpup6-c2 -- $(JOB --job mini --job-name c2-mini-cpu --backend cpu --workers 12)
# C3 one real optimization alone: Assignment 3's C19 broad1 search job (sealed record to reproduce)
S && run C3-a3 0 gpup6-c3 -- $(P=benchmark JOB --job a3:C19:broad1 --job-name c3-a3 --host-workers 8 --batch 8192)
# C4 concurrency: two real optimizations at once (Assignment 3 C19 broad1 + Assignment 2 C19 base), each in its own
# default namespace; while they run: identity reuse refused, a job SIGKILLed and resumed, a job stopped and resumed, two
# jobs sharing an explicitly declared dataset cache
if S; then
  B=research/gpu-phase6/cache/barriers/c4-long; rm -rf "$B"
  tools/gpu-phase6/launch-slice.sh gpup6-c4-a3 "$LOG/C4-a3.txt" -- $(P=benchmark JOB --job a3:C19:broad1 --job-name c4-a3 --host-workers 8 --batch 8192 --barrier $B --group 2) || fail "C4-a3 launch"
  tools/gpu-phase6/launch-slice.sh gpup6-c4-a2 "$LOG/C4-a2.txt" -- $(P=benchmark JOB --job a2:C19:base --job-name c4-a2 --host-workers 8 --batch 8192 --barrier $B --group 2) || fail "C4-a2 launch"
  for i in $(seq 1 300); do [ "$(ls $B 2>/dev/null | grep -c ready)" -ge 2 ] && break; sleep 1; done
  [ "$(ls $B | grep -c ready)" -ge 2 ] || fail "C4 long jobs not ready"
  say "C4 long jobs ready"
  # reuse of an ACTIVE identity: as a new job, as a resume, and as a resume with another definition — all refused
  attempt reuse-new --job a3:C19:broad1 --job-name c4-a3
  attempt reuse-resume --job a3:C19:broad1 --job-name c4-a3 --resume
  attempt reuse-other-definition --job mini --job-name c4-a2 --resume
  # a job SIGKILLed mid-run (its whole unit: node + GPU server), then resumed from its own checkpoint
  tools/gpu-phase6/launch-slice.sh gpup6-c4-kill "$LOG/C4-mini-kill.txt" -- $(JOB --job mini --job-name c4-mini-kill --host-workers 8 --batch 8192) || fail "C4 kill launch"
  K=$R/jobs/c4-mini-kill/receipts.jsonl
  for i in $(seq 1 240); do [ -f "$K" ] && [ "$(wc -l < "$K")" -ge 4 ] && break; sleep 0.5; done
  [ "$(wc -l < "$K")" -ge 4 ] || fail "C4 kill: no progress"
  systemctl --user kill --signal=SIGKILL gpup6-c4-kill; sleep 2
  say "C4 kill: SIGKILLed after $(wc -l < "$K") batches"
  "$NODE" $TS src/gpu-jobs/cli.ts status --study research/gpu-phase6 --job c4-mini-kill > "$R/campaign/status-after-kill.json" 2>&1
  attempt killed-reopened-as-new --job mini --job-name c4-mini-kill
  run C4-mini-kill-resume 0 gpup6-c4-kill-r -- $(JOB --job mini --job-name c4-mini-kill --resume --host-workers 8 --batch 8192)
  # a job stopped gracefully (exit 75 after 8,000 fresh evaluations), then resumed
  run C4-mini-stop 75 gpup6-c4-stop -- $(JOB --job mini --job-name c4-mini-stop --host-workers 8 --batch 8192 --stop-after 8000)
  run C4-mini-stop-resume 0 gpup6-c4-stop-r -- $(JOB --job mini --job-name c4-mini-stop --resume --host-workers 8 --batch 8192)
  # two jobs with an explicitly shared dataset cache, exporting at the same instant (barrier)
  SH=/home/chad/projects/margin-trading/research/gpu-phase6/cache/shared-datasets; B2=research/gpu-phase6/cache/barriers/c4-shared; rm -rf "$B2"
  tools/gpu-phase6/launch-slice.sh gpup6-c4-sha "$LOG/C4-shared-a.txt" -- $(JOB --job mini --job-name c4-shared-a --shared-dataset $SH --host-workers 8 --batch 8192 --barrier $B2 --group 2) || fail "shared-a"
  tools/gpu-phase6/launch-slice.sh gpup6-c4-shb "$LOG/C4-shared-b.txt" -- $(JOB --job mini --job-name c4-shared-b --shared-dataset $SH --host-workers 8 --batch 8192 --barrier $B2 --group 2) || fail "shared-b"
  while [ "$(units_active gpup6-c4-sha gpup6-c4-shb)" -gt 0 ]; do sleep 5; done
  # the long jobs finish
  while [ "$(units_active gpup6-c4-a3 gpup6-c4-a2)" -gt 0 ]; do sleep 10; done
  for j in c4-a3 c4-a2 c4-shared-a c4-shared-b; do [ -f "$R/jobs/$j/complete.json" ] || fail "C4 $j did not complete"; done
  say "C4 complete"
fi
# C5 identity comparisons
CMP() { local name=$1; shift; "$NODE" $TS tools/gpu-phase6/compare.ts "$@" --out "$R/compare/$name.json" > "$LOG/compare-$name.txt" 2>&1 || fail "compare $name"; say "compare [$name] $(tail -1 "$LOG/compare-$name.txt")"; }
if S; then
  CMP c3-a3-vs-sealed sealed c3-a3 a3 C19 broad1
  CMP c4-a3-vs-sealed sealed c4-a3 a3 C19 broad1
  CMP c4-a2-vs-sealed sealed c4-a2 a2 C19 base
  CMP c4-a3-vs-c3-a3 arms c3-a3 c4-a3
  CMP mini-gpu-vs-cpu arms c1-ref-mini c2-mini-cpu
  CMP mini-killed-resumed-vs-ref arms c1-ref-mini c4-mini-kill
  CMP mini-stopped-resumed-vs-ref arms c1-ref-mini c4-mini-stop
  CMP mini-shared-a-vs-ref arms c1-ref-mini c4-shared-a
  CMP mini-shared-b-vs-ref arms c1-ref-mini c4-shared-b
fi
# C6 the isolation audit of every campaign job (directories, identities, events, ledgers, datasets, the process audit)
S && { "$NODE" $TS tools/gpu-phase6/campaign-verify.ts --out "$R/campaign/summary.json" > "$LOG/campaign-verify.txt" 2>&1 || fail "campaign verify"; say "campaign verify: $(tail -1 "$LOG/campaign-verify.txt")"; }
# C7 bounded parity through the host path on the accepted binary (fresh seeded genomes, zero tolerance)
DET="--batches 1,13,64 --determinism-subset 128 --worker-counts 0,3"
PAR() { local name=$1; shift; run "parity-$name" 0 "gpup6-par-$name" -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=14000 tools/gpu-phase6/parity.ts --host-workers 8 "$@" --out "$R/parity/$name.json"; }
if S; then
  PAR D24-core --door D24 --options base --refs --strata 4 --branch --random 3000 --label P6A $DET
  PAR D19-fund --door D19 --options fund --refs --random 1500 --strata 2 --label P6F --detail --risk
  PAR S3-all --fixture 3 --sessions 420 --options all --random 300 --strata 1 --label P6S --detail --risk
fi
# C8 Assignment 3's 48 sealed finalists: CPU references (--no-maglev) = GPU = the sealed C24 figures to the cent (D24)
S && run finalists 0 gpup6-finalists -- /usr/bin/env GPU_POLICY_PURPOSE=parity-test "$NODE" $TS --max-old-space-size=14000 tools/gpu-phase6/parity-finalists.ts --out "$R/parity/finalists.json"
say "chain complete"
