#!/bin/bash
# gpu-phase4 stage B9 (PROTOCOL.md §9.3): isolation, restart and failure tests under concurrency — NON-OFFICIAL test
# jobs only (small workloads: the pool on D19 with 8,192 fixed seeded tasks, the mini schedule), never another
# session's job. Each failing job has a NEIGHBOUR running the same workload that must finish identical to its reference.
source /home/chad/projects/margin-trading/research/gpu-phase4/chains/lib.sh
REPO=$PWD
L=$REPO/research/gpu-phase4/results/logs/b9
I=research/gpu-phase4/results/isolation
mkdir -p "$L" "$I"
J() { # J <unit> <status file> <tool> <args…>: one contained job unit (no wait)
  local unit=$1 st=$2 tool=$3; shift 3
  systemd-run --user --unit="$unit" --slice=gpup4.slice --collect -p MemoryHigh=10G -p MemoryMax=11G -p MemorySwapMax=0 \
    -p KillMode=mixed -p TimeoutStopSec=120 -p Restart=no -p StandardOutput=append:"$L/$unit.log" -p StandardError=append:"$L/$unit.log" \
    -E PATH="$PATH" -E HOME="$HOME" -E GPU_POLICY_PURPOSE=benchmark --working-directory="$REPO" \
    /bin/bash "$REPO/tools/gpu-phase4/job.sh" "$st" "$NODE" --expose-gc --max-old-space-size=20000 \
    --experimental-transform-types --disable-warning=ExperimentalWarning "tools/gpu-phase4/$tool.ts" "$@" 2>/dev/null >/dev/null
}
W() { for u in "$@"; do while systemctl --user is-active --quiet "$u"; do sleep 1; done; done; }
S() { cat "$1" 2>/dev/null || echo none; }
POOL=(--door D19 --mix joint --tasks 8192 --rounds 3 --batch 8192 --host-workers 4 --parity-n 8)
check() { local name=$1; shift; "$@"; local rc=$?; echo "$(ts) [$name] rc=$rc"; [ $rc -eq 0 ] || { echo "$(ts) FAILED isolation test $name"; exit 1; }; }

T tools/gpu-phase4/admit.ts --jobs 2 --vram-mib 6144 --rss-mib 7168 --out "$I/admission.json" || { echo "$(ts) FAILED admission"; exit 1; }

# the solo reference of the pool workload
echo "$(ts) i-ref"
J gpup4-i-ref "$I/i-ref.status" poolbench --run i-ref "${POOL[@]}"; W gpup4-i-ref
[ "$(S $I/i-ref.status)" = 0 ] || { echo "$(ts) FAILED i-ref"; exit 1; }

iso() { # iso <id> <expected error substring> <failing-job args…>
  local id=$1 expect=$2; shift 2
  rm -rf "research/gpu-phase4/cache/barrier/$id"
  J "gpup4-$id-a" "$I/$id-a.status" poolbench --run "$id-a" "${POOL[@]}" --barrier "research/gpu-phase4/cache/barrier/$id" --group 2 "$@"
  J "gpup4-$id-b" "$I/$id-b.status" poolbench --run "$id-b" "${POOL[@]}" --barrier "research/gpu-phase4/cache/barrier/$id" --group 2
  W "gpup4-$id-a" "gpup4-$id-b"
  check "$id" T tools/gpu-phase4/verify-iso.ts --test "$id" --failing "$id-a" --neighbour "$id-b" --reference i-ref \
    --status "$(S $I/$id-a.status),$(S $I/$id-b.status)" --expect "$expect" --out "$I/$id.json"
}
echo "$(ts) I3 GPU server killed"
iso i3 "exited" --kill-server-round 2 --kill-after-ms 1500
echo "$(ts) I4 host-worker fault"
iso i4 "host worker" --inject exit --inject-round 2
echo "$(ts) I5 VRAM refusal"
iso i5 "VRAM budget" --vram-budget-mb 256

MINI=(--backend gpu --job mini --batch 8192 --linger 30 --host-workers 4)
mkgroup() { # mkgroup <G> <runs csv> <statuses csv>: a group record for verify.ts (complete mini jobs)
  mkdir -p "research/gpu-phase4/results/bench/$1"
  T -e 'const [G,runs,st]=process.argv.slice(1); require("fs").writeFileSync(`research/gpu-phase4/results/bench/${G}/group.json`, JSON.stringify({kind:"gpu-phase4 isolation group (B9)",group:G,tool:"replay",jobs:runs.split(",").length,mode:"ss",job:"mini",extra:"",stopAfter:null,runs:runs.split(","),exitStatus:st.split(",").map(Number)},null,1)+"\n")' "$1" "$2" "$3"
}
echo "$(ts) I1 abrupt kill (SIGKILL of the unit) and resume while the neighbour runs"
J gpup4-i1-a "$I/i1-a.status" replay --run i1-a "${MINI[@]}"
J gpup4-i1-b "$I/i1-b.status" replay --run i1-b "${MINI[@]}"
for _ in $(seq 1 120); do n=$(grep -c '"nonce"' research/gpu-phase4/results/optimizer/i1-a/gpu/receipts.jsonl 2>/dev/null || echo 0); [ "$n" -ge 8 ] && break; sleep 1; done
systemctl --user kill --signal=SIGKILL gpup4-i1-a; echo "$(ts) i1-a killed after $n batches"
W gpup4-i1-a gpup4-i1-b
echo "killed=$(S $I/i1-a.status)" > "$I/i1-a.killed"
J gpup4-i1-a-resume "$I/i1-a-resume.status" replay --run i1-a --resume "${MINI[@]}"; W gpup4-i1-a-resume
mkgroup i1 i1-a,i1-b "$(S $I/i1-a-resume.status),$(S $I/i1-b.status)"
check i1 T --max-old-space-size=8000 tools/gpu-phase4/verify.ts --group i1

echo "$(ts) I2 graceful stop (stop-after) and resume under concurrency"
J gpup4-i2-a "$I/i2-a.status" replay --run i2-a "${MINI[@]}" --stop-after 6000
J gpup4-i2-b "$I/i2-b.status" replay --run i2-b "${MINI[@]}"
W gpup4-i2-a
echo "stopped=$(S $I/i2-a.status)" > "$I/i2-a.stopped"
J gpup4-i2-a-resume "$I/i2-a-resume.status" replay --run i2-a --resume "${MINI[@]}"
W gpup4-i2-a-resume gpup4-i2-b
mkgroup i2 i2-a,i2-b "$(S $I/i2-a-resume.status),$(S $I/i2-b.status)"
check i2 T --max-old-space-size=8000 tools/gpu-phase4/verify.ts --group i2
[ "$(S $I/i2-a.status)" = 75 ] || { echo "$(ts) FAILED i2: the stop did not exit 75"; exit 1; }

echo "$(ts) I6 namespace guards"
J gpup4-i6-x "$I/i6-x.status" replay --run i6-x "${MINI[@]}"
for _ in $(seq 1 60); do [ -e research/gpu-phase4/cache/replay/i6-x/gpu/.lock ] && break; sleep 0.5; done
GPU_POLICY_PURPOSE=benchmark T tools/gpu-phase4/replay.ts --run i6-x "${MINI[@]}" > "$I/i6-live-lock.txt" 2>&1; echo "exit=$?" >> "$I/i6-live-lock.txt"
W gpup4-i6-x
GPU_POLICY_PURPOSE=benchmark T tools/gpu-phase4/replay.ts --run i6-x "${MINI[@]}" > "$I/i6-reuse.txt" 2>&1; echo "exit=$?" >> "$I/i6-reuse.txt"
GPU_POLICY_PURPOSE=official-optimization T tools/gpu-phase4/replay.ts --run i6-y "${MINI[@]}" > "$I/i6-official.txt" 2>&1; echo "exit=$?" >> "$I/i6-official.txt"
T -e '
  const fs=require("fs"); const r=f=>fs.readFileSync(`research/gpu-phase4/results/isolation/${f}`,"utf8");
  const c={ liveLockRefused: /locked by live process/.test(r("i6-live-lock.txt")) && !/exit=0/.test(r("i6-live-lock.txt")),
            reuseRefused: /already holds a run/.test(r("i6-reuse.txt")) && !/exit=0/.test(r("i6-reuse.txt")),
            officialPurposeRefused: /declare a non-official purpose/.test(r("i6-official.txt")) && !/exit=0/.test(r("i6-official.txt")),
            firstRunCompleted: fs.readFileSync("research/gpu-phase4/results/isolation/i6-x.status","utf8").trim()==="0" };
  const rec={kind:"gpu-phase4 isolation test I6 (namespace guards)",t:new Date().toISOString(),checks:c,pass:Object.values(c).every(Boolean)};
  fs.writeFileSync("research/gpu-phase4/results/isolation/i6.json", JSON.stringify(rec,null,1)+"\n"); console.log(JSON.stringify(rec)); process.exit(rec.pass?0:2);'
[ $? -eq 0 ] || { echo "$(ts) FAILED i6"; exit 1; }

echo "$(ts) I7 concurrent dataset export into one shared directory"
GPU_POLICY_PURPOSE=benchmark T tools/gpu-phase4/dataset-race.ts --procs 4 --loops 25 --door D19 --out "$I/i7.json"
echo "$(ts) [i7] rc=$? (pass = no silently wrong load)"
for r in i1-a i1-b i2-a i2-b i6-x; do rm -rf "research/gpu-phase4/cache/replay/$r" "research/gpu-phase4/results/raw-large/optimizer/$r"; done
echo "$(ts) chain b9 complete"
